--[[
	Program for creating school certificates; conceptualized for Freie Waldorfschule Leipzig and using a massively reduced TeX Live distribution as of April 29, 2019 as well as Universal Lua Distribution (ULua) by Stefano Peluchetti, Version 1.0.201903-103

	Copyright © 2019 Marcus Hottenroth

	This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 3 of the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

	You should have received a copy of the GNU General Public License along with this program; if not, see <http://www.gnu.org/licenses/>. 
]]

-- This ISO-8859-1 encoded script is only needed for Windows OS as this OS does not support
-- printing UTF-8 characters in its console.
arg = {...}
print(arg[1])
print("Töricht, draußen.")
