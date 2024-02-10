#	Script for invoking schoolCert_UTF-8.lua, Unix version
#
#	Copyright © 2024 Marcus Hottenroth
#
#	This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 3 of the License, or (at your option) any later version.
#
#	This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
#
#	You should have received a copy of the GNU General Public License along with this program; if not, see <http://www.gnu.org/licenses/>. 

#!/usr/bin/env bash

cd "$(dirname "$0")"
OS=$(uname -o)
if [[ "${OS}" == "GNU/Linux" ]]; then
  echo "Linux detected. OS string: ${OS}."
  "$(pwd)/application/data/backend/electron/linux-x64/electron" "$(pwd)/application/"
else
  echo "Mac detected. OS string: ${OS}."
  "$(pwd)/application/data/backend/electron/darwin-x64/Electron.app" "$(pwd)/application/"
fi
