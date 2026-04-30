@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Diagnostics-ZS.ps1"
set EXIT_CODE=%ERRORLEVEL%
echo.
if not "%EXIT_CODE%"=="0" (
  echo Diagnostics failed.
)
pause
exit /b %EXIT_CODE%
