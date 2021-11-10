#!/usr/bin/env bash

cd "$(dirname "$0")"

sessionFile="Klasse 11A, Sitzung.txt"

xterm -e "$(pwd)/../data_backend/ulua/lua" "$(pwd)/../data_backend/schoolCert.lua" "$sessionFile" 2>./errors_main.txt