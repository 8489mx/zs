@echo off
setlocal
set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%lib\Stop-ZS.ps1"
set EXIT_CODE=%ERRORLEVEL%
if not "%EXIT_CODE%"=="0" (
  echo Failed to stop ZS. Check logs under %%ProgramData%%\ZS\logs
)
exit /b %EXIT_CODE%
