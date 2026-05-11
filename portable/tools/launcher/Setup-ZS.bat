@echo off
setlocal
set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%Setup-ZS.ps1"
set EXIT_CODE=%ERRORLEVEL%
if not "%EXIT_CODE%"=="0" (
  echo.
  echo ZS first-time setup failed. Run Diagnostics-ZS.bat and send the report to support.
)
pause
exit /b %EXIT_CODE%
