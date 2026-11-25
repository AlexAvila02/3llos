@echo off
title Quitar mods de rendimiento
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0PerfMods.ps1" -Quitar %*
echo.
pause
