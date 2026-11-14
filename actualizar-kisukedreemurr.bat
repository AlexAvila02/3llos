@echo off
chcp 65001 >nul
setlocal

set "ORIGEN=C:\Users\USUARIO\Desktop\Kisukedreemurr"
set "DESTINO=%~dp0pages\juegos\kisukedreemurr"

echo Sincronizando Kisukedreemurr desde %ORIGEN%...
if not exist "%ORIGEN%\index.html" (
  echo [ERROR] No se encontro %ORIGEN%\index.html
  pause
  exit /b 1
)

if not exist "%DESTINO%" mkdir "%DESTINO%"
copy /Y "%ORIGEN%\index.html" "%DESTINO%\index.html" >nul
robocopy "%ORIGEN%\css" "%DESTINO%\css" /MIR /NFL /NDL /NJH /NJS >nul
robocopy "%ORIGEN%\js" "%DESTINO%\js" /MIR /NFL /NDL /NJH /NJS >nul
robocopy "%ORIGEN%\sounds" "%DESTINO%\sounds" /MIR /NFL /NDL /NJH /NJS >nul

cd /d "%~dp0"
git add pages/juegos/kisukedreemurr
git diff --cached --quiet pages/juegos/kisukedreemurr
if %errorlevel%==0 (
  echo No hay cambios nuevos en Kisukedreemurr.
) else (
  git commit -m "chore: actualizar kisukedreemurr"
  git push
  echo Actualizado y subido a GitHub/Netlify!
)
