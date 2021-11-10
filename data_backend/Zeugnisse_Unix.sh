#	Script for invoking schoolCert_UTF-8.lua, Unix version
#
#	Copyright © 2019 Marcus Hottenroth
#
#	This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 3 of the License, or (at your option) any later version.
#
#	This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
#
#	You should have received a copy of the GNU General Public License along with this program; if not, see <http://www.gnu.org/licenses/>. 

#!/usr/bin/env bash

cd "$(dirname "$0")"

sessionFile=""

xterm -e "$(pwd)/ulua/lua" "$(pwd)/schoolCert.lua" "$sessionFile" 2>./errors_main.txt
