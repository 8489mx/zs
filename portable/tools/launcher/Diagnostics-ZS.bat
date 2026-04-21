@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Diagnostics-ZS.ps1"
endlocal
