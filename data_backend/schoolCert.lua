--[[
	Program for creating school certificates; conceptualized for Freie Waldorfschule Leipzig and using a massively reduced TeX Live distribution as of April 29, 2019 as well as Universal Lua Distribution (ULua) by Stefano Peluchetti, Version 1.0.201903-103

	Copyright © 2019 Marcus Hottenroth

	This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 3 of the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

	You should have received a copy of the GNU General Public License along with this program; if not, see <http://www.gnu.org/licenses/>. 
]]


-- Umlaut conversion. Needed for Windows only.
function replaceUmlauts(s)
	local s = s:gsub("Ä", "_Ae_")
	s = s:gsub("ä", "_ae_")
	s = s:gsub("Ö", "_Oe_")
	s = s:gsub("ö", "_oe_")
	s = s:gsub("Ü", "_Ue_")
	s = s:gsub("ü", "_ue_")
	s = s:gsub("ß", "_ss_")
	s = s:gsub("é", "_e'_")
	return s
end


require('lfs')

-- The session file’s name without file extension.
sessionFileName = arg[1]:match("(.*)%.txt$")

-- Backslash conversion for proper pattern capturing.
-- Only applies when using Windows OS.
baseDir = arg[0]:gsub("\\", "/"):match("(.*/)[^/]+/[^/]+/[^/]+/")

-- ARG 1: Session file
-- The first argument points to the file that contains the session.
-- Open that file and evaluate the string to get the session data.
handle = io.open(baseDir.."Sitzungen/"..arg[1], "r")
s = handle:read("*all"):gsub('%[%]', '{}')
handle:close()

SESSION = {}

loadstring(s)()


-- gather informationen about OS and its architecture
if not os.getenv("HOME") then
  OS = "Windows"
  binVersion = "win32/xelatex"
else
  local handle = io.popen("uname -ms")
  OS, arch = handle:read("*all"):match("(.*) (.*)")
  handle:close()
  if OS == "Linux" then
    if arch:match("64") then
      binVersion = "x86_64-linux/xelatex"
    else
      binVersion = "i386-linux/xelatex"
    end
  else
    binVersion = "x86_64-darwin/xelatex"
  end
end

-- Set the output directory. Check if it exists later.
outputDir = baseDir.."/Zeugnisse/"..sessionFileName


if not lfs.attributes(outputDir, "mode") then
  if OS == "Windows" then
    os.execute("mkdir \""..outputDir.."\"")
  else
    os.execute("mkdir -p \""..outputDir.."\"")
  end
else
  if lfs.attributes(outputDir, "mode") == "file" then
    print("Es existiert eine Datei mit dem Namen des Zielordners. Abgebrochen.")
    io.read()
    return
  end
end

XeTeXBinFile = baseDir.."/data_backend/TeX/bin/"..binVersion


for i = 0, #SESSION do    
  local p = SESSION[i]

  p.firstName = p.firstName:gsub(" *$", "")
  p.lastName = p.lastName:gsub(" *$", "")

  if p.print == "true" then
    if OS == "Windows" then
      local handle = io.popen("echo Erstelle Zeugnis für "..p.firstName.." "..p.lastName.." ... | "..baseDir.."/data_backend/iconv/bin/iconv.exe -f UTF-8 -t ISO-8859-1 2>&1")
      local utf8String = handle:read("*all")
      handle:close()
      print(utf8String)
    else
      print("Erstelle Zeugnis für "..p.firstName.." "..p.lastName.." …")
    end

    -- String for the final marks page.
    local finalMarks = ""
  
    -- Load the certificate template into a string.
    local file_TeXTemplate = io.open(baseDir.."/data_backend/TeX/certTemplate.tex")
    local code_TeX = file_TeXTemplate:read("*all")
    file_TeXTemplate:close()

    if not SESSION.class then
      print("In der Sitzung wurde keine Klasse angegeben. Abbruch.")
      io.read()
      return
    end

    if not SESSION.place then
      print("In der Sitzung wurde kein Ausstellungsort des Zeugnisses angegeben. Abbruch.")
      io.read()
      return
    end

    -- Set certificate data in the TeX string.
    code_TeX = code_TeX:gsub("PUPIL%-NAME", p.firstName.." "..p.lastName)
    code_TeX = code_TeX:gsub("PUPIL%-CLASS", SESSION.class or "")
    code_TeX = code_TeX:gsub("YEARHEADER", SESSION.year)
    code_TeX = code_TeX:gsub("PLACE%-LOGO", SESSION.place:upper())
    code_TeX = code_TeX:gsub("PLACE", SESSION.place)

    -- Set the marks overview table format.
    if SESSION.class:match("[0-9]+A") then
      code_TeX = code_TeX:gsub("MARKS%-FORMAT", '\\textbf{Notenpunkte} & 15\\textendash{}13 & 12\\textendash{}10 & 09\\textendash{}07 & 06\\textendash{}04 & 03\\textendash{}01 & 0')
    else
      code_TeX = code_TeX:gsub("MARKS%-FORMAT", '\\textbf{Note} & 1 & 2 & 3 & 4 & 5 & 6')
    end

    local date_day, date_month, date_year = SESSION.date:match("(%d%d)%.(%d%d)%.(%d%d%d%d)")

    code_TeX = code_TeX:gsub("\\newdate{certDate}{01}{01}{1980}", "\\newdate{certDate}{"..date_day.."}{"..date_month.."}{"..date_year.."}")

    code_TeX = code_TeX:gsub("\\begin{document}.*", "\\begin{document}")

    isFirstRegularSubject = true

    for j = 0, #SESSION[i].subjects do

      local s = SESSION[i].subjects[j]

      if s.name:match("^Sonderseite: ") then
        if s.name:match("Eurythmieabschluss") then
          local string_works = ""
          if s.works then -- Check this to prevent errors when a subject for eurythmy has been created but no information has been entered.
            for w = 0, #s.works do
              if s.works[w].author and s.works[w].work then
                string_works = string_works..s.works[w].author.." & "..s.works[w].work.." \\\\"
              end
            end
          end
          if string_works ~= "" and s.evaluation then
            string_works = string_works:gsub("%%", "\\%%")
            s.evaluation = s.evaluation:gsub("%%", "\\%%"):gsub("\n\n+", "\\par ")
            code_TeX = code_TeX.."\n  \\finalEurythmy{"..string_works.."}{"..s.evaluation.."}"
          end
        end
        if s.name:match("Jahresarbeit") then
          if s.topic and s.firstReader and s.secondReader and s.evaluation then
            -- Delete trailing newlines, reduce more than one blankline to one, and finally turn single linebreaks (\n) into paragraph limits.
            s.topic = s.topic:gsub("%%", "\\%%")
            s.evaluation = s.evaluation:gsub("\n+$", ""):gsub("\n\n+", "\\par "):gsub("([^\n]) *\n *([^\n])", "%1\\par %2"):gsub("%%", "\\%%"):gsub("&", "\\&")
            code_TeX = code_TeX.."\n  \\finalThesis{"..s.topic.."}{"..s.firstReader.."}{"..s.secondReader.."}{"..s.evaluation.."}"
          end
        end
        if s.name:match("Klassenspiel") then
          if s.contents and s.evaluation then
            code_TeX = code_TeX.."\n  \\finalPupilsPlay{"..s.contents.."}{"..s.evaluation.."}"
          end
        end
      else
        if s.name and (s.evaluation or s.contents) then
          s.evaluation = (s.evaluation and s.evaluation:gsub("\n\n*", " "):gsub("%%", "\\%%"):gsub("&", "\\&")) or ""
          s.contents = (s.contents and s.contents:gsub("\n\n*", " "):gsub("%%", "\\%%"):gsub("&", "\\&")) or ""
          if isFirstRegularSubject then
            code_TeX = code_TeX.."\n  \\raisebox{\\baselineskip}{\\hfil\\rule{\\textwidth}{0.4pt}\\hfil}%"
            isFirstRegularSubject = false
          end
          if j > 0 and SESSION[i].subjects[j-1].name == s.name then
            code_TeX = code_TeX.."\n  \\certText{}{"..(s.contents or "").."}{"..(s.evaluation or "").."}{"..(s.teacher:gsub("&", "\\&") or "").."}"
          else
            code_TeX = code_TeX.."\n  \\certText{"..s.name.."}{"..(s.contents or "").."}{"..(s.evaluation or "").."}{"..(s.teacher:gsub("&", "\\&") or "").."}"
          end
        end
      end

      if s.mark and s.mark ~= "" then
        finalMarks = finalMarks..s.name.." & "..s.mark.." \\\\"
      end
    end

    if finalMarks ~= "" then
      code_TeX = code_TeX.."\n  \\finalMarks{"..finalMarks.."}"
    end

    code_TeX = code_TeX.."\n  \\finalPage{"..(p.finalRemarks or "\\textit{keine}").."}{"..(p.daysAbsent or "–").."}{"..(p.daysAbsent_unexplained or "–").."}\n\\end{document}"

    local file_output = ""
    if OS == "Linux" or OS == "Darwin" then
      file_output = io.open(outputDir.."/"..p.firstName.." "..p.lastName..".tex", "w")
    else
      file_output = io.open(outputDir.."/"..replaceUmlauts(p.firstName).." "..replaceUmlauts(p.lastName)..".tex", "w")
    end
    file_output:write(code_TeX)
    file_output:close()

       
    -- compile TeX file to PDF; execute command twice to get correct number of last page within PDF document
    if OS == "Linux" or OS == "Darwin" then
      os.execute("cd \""..outputDir.."\"; "..
        " \""..XeTeXBinFile.."\" -halt-on-error \""..p.firstName.." "..p.lastName..".tex\" ; "..
        " \""..XeTeXBinFile.."\" -halt-on-error \""..p.firstName.." "..p.lastName..".tex\" "
      )

      -- Cleanup.
      --os.remove(outputDir.."/"..p.firstName.." "..p.lastName..".tex")
      os.remove(outputDir.."/"..p.firstName.." "..p.lastName..".aux")
      os.remove(outputDir.."/"..p.firstName.." "..p.lastName..".log")
    else
      os.execute("cd \""..outputDir.."\" & "..
				" \""..XeTeXBinFile.."\" -halt-on-error \""..replaceUmlauts(p.firstName).." "..replaceUmlauts(p.lastName)..".tex\" 1>nul & "..
				" \""..XeTeXBinFile.."\" -halt-on-error \""..replaceUmlauts(p.firstName).." "..replaceUmlauts(p.lastName)..".tex\" 1>nul "
			)

      -- Cleanup.
      -- Revert umlaut changes by renaming final files;
			-- delete existing file with correct name so renaming can be successful.
			if p.firstName ~= replaceUmlauts(p.firstName) or p.lastName ~= replaceUmlauts(p.lastName) then
        loadfile("../data_backend/renameUTF-8.lua")(outputDir, replaceUmlauts(p.firstName).." "..replaceUmlauts(p.lastName))
			end
			
			-- delete expendable files (*.tex, *.log, *.aux)
			--os.remove(outputDir.."/"..replaceUmlauts(p.firstName).." "..replaceUmlauts(p.lastName)..".tex")			
			os.remove(outputDir.."/"..replaceUmlauts(p.firstName).." "..replaceUmlauts(p.lastName)..".aux")
      os.remove(outputDir.."/"..replaceUmlauts(p.firstName).." "..replaceUmlauts(p.lastName)..".log")			
    end
  end
end

print("\n\nProzess abgeschlossen.\n\nSie finden die fertigen Zeugnisse unter "..outputDir..".")
io.read()

