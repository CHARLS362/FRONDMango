@echo off
:: Script para iniciar el servidor de desarrollo con Node.js 22
set "NODE22=%~dp0node22_bin\node-v22.22.3-win-x64"
set "PATH=%NODE22%;%PATH%"
node node_modules\@angular\cli\bin\ng.js serve --open
