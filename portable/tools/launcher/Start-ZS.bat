@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Start-ZS.ps1"
endlocal
exit /b %ERRORLEVEL%
