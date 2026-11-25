@echo off
title Revisar mods incompatibles
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0PerfMods.ps1" -Revisar %*
echo.
pause
