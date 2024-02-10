--[[
	Program for creating school certificates; conceptualized for Freie Waldorfschule Leipzig and using a massively reduced TeX Live distribution as of April 29, 2019 as well as Universal Lua Distribution (ULua) by Stefano Peluchetti, Version 1.0.201903-103

	Copyright © 2023 Marcus Hottenroth

	This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 3 of the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

	You should have received a copy of the GNU General Public License along with this program; if not, see <http://www.gnu.org/licenses/>. 
]]

lfs = require('lfs')
lunajson = require('lunajson')



-- ————————————————————————— --
-- General helper functions. --
-- ————————————————————————— --


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


-- Escape special TeX characters and replace blank lines with paragraph delimiters.
function escapeTeXchars(s)
  local s = s:gsub("%%", "\\%%")
  s = s:gsub("&", "\\&")
  s = s:gsub("\n\n+", "\\par ")
  return s
end


-- Might not be necessary for current Windows versions. Needs to be tested.
-- Override the default print command. This is needed for a correct UTF-8 encoding in terminal windows on Windows machines.
-- To do: Make it accept multiple arguments.
--function print(s)
--  if OS == "Windows" then
--    local handle = io.popen(s .. " | "..baseDir.."/data/backend/iconv/bin/iconv.exe -f UTF-8 -t ISO-8859-1 2>&1")
--    local utf8String = handle:read("*all")
--    handle:close()
--    io.write(utf8String .. "\n")
--  else
--    io.write(s .. "\n")
--  end
--end


function pathExists(s)
  local handle = io.open(s, "r")
  if handle then
    handle:close()
    return true
  else
    return false
  end
end


function getPathType(s)
  if pathExists(s) then
    local handle = io.open(s)
    local contents, err, code = handle:read("*l")
    handle:close()
    if code and code == 21 then
      return "directory"
    else
      return "file"
    end
  else
    return nil
  end
end



-- —————————————————————————————————— --
-- Get essential OS and session data. --
---—————————————————————————————————— --

-- Backslash conversion for proper pattern capturing.
-- Only applies when using Windows OS.
baseDir = arg[0]:gsub("\\", "/"):match(".*/")
print(baseDir)


-- Gather informationen about the OS and its architecture.
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

XeTeXBinFile = baseDir.."../data/backend/TeX/bin/"..binVersion


outputDir = ""
isFirstRegularSubject = false


function sessionFileToTeX(absFilePath)
  -- Using Electron, the absolute file path base directory is a subdirectory of the symlinked program data directory.
  print("Trying to open", absFilePath)
  local handle = io.open(absFilePath)
  local SESSION = lunajson.decode(escapeTeXchars(handle:read("*all")))
  handle:close()

  -- Set the output directory name.
  -- Backslash conversion for proper pattern capturing.
  -- Only applies when using Windows OS.
  outputDir = absFilePath:gsub("\\", "/"):match(".*/")
  print("outputDir", outputDir)

  -- Check for missing essential data.
  if not SESSION[1].class then
    print("In der Sitzung wurde keine Klasse angegeben. Sitzung wird übersprungen.\nWeiter mit Enter.")
    io.read()
    goto continue
  end

  if not SESSION[1].place then
    print("In der Sitzung wurde kein Ausstellungsort des Zeugnisses angegeben. Sitzung wird übersprungen.\nWeiter mit Enter.")
    io.read()
    goto continue
  end

  for _, pupil in pairs(SESSION[1].pupils) do
    if pupil.print then
      -- String for the final marks page.
      local finalMarks = ""
    
      -- Load the certificate template into a string.
      print("Trying to open TeX template!", outputDir:gsub("/[^/]+/$", "") .. "/TeX/certTemplate.tex")
      local file_TeXTemplate = io.open(outputDir:gsub("/[^/]+/$", "") .. "/TeX/certTemplate.tex")
      local code_TeX = file_TeXTemplate:read("*all")
      file_TeXTemplate:close()    
  
      -- Set certificate data in the TeX string.
      code_TeX = code_TeX:gsub("PUPIL%-NAME", pupil.firstName.." "..pupil.lastName)
      code_TeX = code_TeX:gsub("PUPIL%-CLASS", SESSION[1].class or "")
      code_TeX = code_TeX:gsub("YEARHEADER", SESSION[1].year)
      code_TeX = code_TeX:gsub("PLACE%-LOGO", SESSION[1].place:upper())
      code_TeX = code_TeX:gsub("PLACE", SESSION[1].place)
  
      -- Set the marks overview table format.
      if SESSION[1].class:match("[0-9]+A") then
        code_TeX = code_TeX:gsub("MARKS%-FORMAT", '\\textbf{Notenpunkte} & 15\\textendash{}13 & 12\\textendash{}10 & 09\\textendash{}07 & 06\\textendash{}04 & 03\\textendash{}01 & 0')
      else
        code_TeX = code_TeX:gsub("MARKS%-FORMAT", '\\textbf{Note} & 1 & 2 & 3 & 4 & 5 & 6')
      end
  
      local date_day, date_month, date_year = SESSION[1].date:match("(%d%d)%.(%d%d)%.(%d%d%d%d)")
  
      code_TeX = code_TeX:gsub("\\newdate{certDate}{01}{01}{1980}", "\\newdate{certDate}{"..date_day.."}{"..date_month.."}{"..date_year.."}")  
      code_TeX = code_TeX:gsub("\\begin{document}.*", "\\begin{document}")
  
      isFirstRegularSubject = true
  
      for j = 1, #pupil.subjects do
        local s = pupil.subjects[j]
  
        if s.name:match("^Sonderseite: ") then
          if s.name:match("Eurythmieabschluss") then
            local string_works = ""
            if s.works then -- Check this to prevent errors when a subject for eurythmy has been created but no information has been entered.
              for w = 1, #s.works do
                if s.works[w].author and s.works[w].work then
                  string_works = string_works..s.works[w].author.." & "..s.works[w].work.." \\\\"
                end
              end
            end
            if string_works ~= "" and s.evaluation then
              code_TeX = code_TeX.."\n  \\finalEurythmy{"..string_works.."}{"..s.evaluation.."}"
            end
          end
          if s.name:match("Jahresarbeit") then
            if s.topic and s.firstReader and s.secondReader and s.evaluation then
              code_TeX = code_TeX.."\n  \\finalThesis{"..s.topic.."}{"..s.firstReader.."}{"..s.secondReader.."}{"..s.evaluation.."}"
            end
          end
          if s.name:match("Klassenspiel") then
            if s.contents and s.evaluation then
              code_TeX = code_TeX.."\n  \\finalPupilsPlay{"..s.contents.."}{"..s.evaluation.."}"
            end
          end
        else
          s.evaluation = s.evaluation and s.evaluation:gsub("^[\n ]*$", "") ~= "" and s.evaluation or nil
          s.contents = s.contents and s.contents:gsub("^[\n ]*$", "") ~= "" and s.contents or nil
          if s.name and (s.evaluation or s.contents) then
            s.evaluation = s.evaluation or ""
            s.contents = s.contents or ""
            if isFirstRegularSubject then
              code_TeX = code_TeX.."\n  \\raisebox{\\baselineskip}{\\hfil\\rule{\\textwidth}{0.4pt}\\hfil}%"
              isFirstRegularSubject = false
            end
            -- If a subject had been taught by more than one teacher, print it as a separate block, but omit the subject name heading.
            if j > 1 and pupil.subjects[j-1].name == s.name then
              code_TeX = code_TeX.."\n  \\certText{}{"..(s.contents or "").."}{"..(s.evaluation or "").."}{"..(s.teacher or "").."}"
            else
              code_TeX = code_TeX.."\n  \\certText{"..s.name.."}{"..(s.contents or "").."}{"..(s.evaluation or "").."}{"..(s.teacher or "").."}"
            end
          end
        end
  
        if s.mark and s.mark ~= "" then
          finalMarks = finalMarks..s.name.." & "..s.mark.." \\\\"
        end
      end
  
      -- Compose the final marks table entries string.
      if finalMarks ~= "" then
        code_TeX = code_TeX.."\n  \\finalMarks{"..finalMarks.."}"
      end
  
      -- Decide whether or not to print the number of absence days.
      if pupil.daysAbsent_print then
        code_TeX = code_TeX.."\n  \\finalPage{"..(pupil.finalRemarks or "\\textit{keine}").."}{"..(pupil.daysAbsent or "–").."}{"..(pupil.daysAbsent_unexplained or "–").."}\n\\end{document}"
      else
        code_TeX = code_TeX.."\n  \\finalPage{"..(pupil.finalRemarks or "\\textit{keine}").."}{\\relax}{\\relax}\n\\end{document}"
      end
  
      local file_output = ""
      file_output = io.open(outputDir.."/"..pupil.firstName.." "..pupil.lastName..".tex", "w")
      file_output:write(code_TeX)
      file_output:close()
    end
  end
  ::continue::
end


-- —————————— --
-- Main loop. --
-- —————————— --

sessionFile = arg[1]:gsub("*/", "")

print(baseDir .. "temp/" .. sessionFile)

sessionFileToTeX(sessionFile)

  
      --~ local file_output = ""
      --~ if OS == "Linux" or OS == "Darwin" then
        --~ file_output = io.open(outputDir.."/"..pupil.firstName.." "..pupil.lastName..".tex", "w")
      --~ else
        --~ file_output = io.open(outputDir.."/"..replaceUmlauts(pupil.firstName).." "..replaceUmlauts(pupil.lastName)..".tex", "w")
      --~ end
      --~ file_output:write(code_TeX)
      --~ file_output:close()
  
        
      --~ -- compile TeX file to PDF; execute command twice to get correct number of last page within PDF document
      --~ if OS == "Linux" or OS == "Darwin" then
        --~ os.execute("cd \""..outputDir.."\"; "..
          --~ " \""..XeTeXBinFile.."\" -halt-on-error \""..pupil.firstName.." "..pupil.lastName..".tex\" 1>/dev/null; "..
          --~ " \""..XeTeXBinFile.."\" -halt-on-error \""..pupil.firstName.." "..pupil.lastName..".tex\" 1>/dev/null"
        --~ )
  
        --~ -- Cleanup.
        --~ os.rename(outputDir.."/"..pupil.firstName.." "..pupil.lastName..".tex", outputDir.."/TeX/"..pupil.firstName.." "..pupil.lastName..".tex")
        --~ os.remove(outputDir.."/"..pupil.firstName.." "..pupil.lastName..".aux")
        --~ os.remove(outputDir.."/"..pupil.firstName.." "..pupil.lastName..".log")
      --~ else
        --~ os.execute("cd \""..outputDir.."\" & "..
          --~ " \""..XeTeXBinFile.."\" -halt-on-error \""..replaceUmlauts(pupil.firstName).." "..replaceUmlauts(pupil.lastName)..".tex\" 1>nul & "..
          --~ " \""..XeTeXBinFile.."\" -halt-on-error \""..replaceUmlauts(pupil.firstName).." "..replaceUmlauts(pupil.lastName)..".tex\" 1>nul "
        --~ )
  
        --~ -- Cleanup.
        --~ -- Revert umlaut changes by renaming final files;
        --~ -- delete existing file with correct name so renaming can be successful.
        --~ if pupil.firstName ~= replaceUmlauts(pupil.firstName) or pupil.lastName ~= replaceUmlauts(pupil.lastName) then
          --~ loadfile("../backend/renameUTF-8.lua")(outputDir, replaceUmlauts(pupil.firstName).." "..replaceUmlauts(pupil.lastName))
        --~ end
        
        --~ -- delete expendable files (*.tex, *.log, *.aux)
        --~ os.rename(outputDir.."/"..replaceUmlauts(pupil.firstName).." "..replaceUmlauts(pupil.lastName)..".tex", outputDir.."/TeX/"..replaceUmlauts(pupil.firstName).." "..replaceUmlauts(pupil.lastName)..".tex")			
        --~ os.remove(outputDir.."/"..replaceUmlauts(pupil.firstName).." "..replaceUmlauts(pupil.lastName)..".aux")
        --~ os.remove(outputDir.."/"..replaceUmlauts(pupil.firstName).." "..replaceUmlauts(pupil.lastName)..".log")			
      --~ end
    --~ end
  --~ end

print("\n\nGenerierung beendet.\n\nDas Fenster kann geschlossen werden.")

