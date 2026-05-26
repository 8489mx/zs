@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Stop-ZS.ps1"
endlocal
exit /b %ERRORLEVEL%
