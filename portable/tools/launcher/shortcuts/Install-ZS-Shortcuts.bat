@echo off
setlocal
set SCRIPT_DIR=%~dp0

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%Install-Autostart-ZS.ps1"
if not "%ERRORLEVEL%"=="0" (
  echo Failed to install ZS autostart.
  pause
  exit /b %ERRORLEVEL%
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%Install-Desktop-Shortcut-ZS.ps1"
if not "%ERRORLEVEL%"=="0" (
  echo Failed to install ZS desktop shortcut.
  pause
  exit /b %ERRORLEVEL%
)

echo.
echo ZS shortcuts installed successfully.
pause
exit /b 0
