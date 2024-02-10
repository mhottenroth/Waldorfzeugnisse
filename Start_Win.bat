@echo off 
goto licenseEnd
	Script for invoking schoolCert_ANSI.lua, Windows version

	Copyright © 2019 Marcus Hottenroth

	This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 3 of the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

	You should have received a copy of the GNU General Public License along with this program; if not, see <http://www.gnu.org/licenses/>. 
:licenseEnd
chcp 1252

cd "%~dp0/"

cmd /k %cd%\application\data\backend\electron\win32-x64\electron.exe %cd%\application
