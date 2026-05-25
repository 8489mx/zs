@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Stop-Dev-ZS.ps1"
endlocal
exit /b %ERRORLEVEL%

