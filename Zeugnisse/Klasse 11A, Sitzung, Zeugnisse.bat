chcp 1252

cd "%~dp0/"

set sessionFile="Klasse 11A, Sitzung.txt"

cmd /u /c %cd%/../data_backend/ulua/lua.cmd %cd%/../data_backend/schoolCert.lua %sessionFile% 2>%cd%/errors_main.txt
