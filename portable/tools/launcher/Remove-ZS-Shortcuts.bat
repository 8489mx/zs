@echo off
setlocal
set SCRIPT_DIR=%~dp0

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%Remove-Autostart-ZS.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%Remove-Desktop-Shortcut-ZS.ps1"

echo.
echo ZS shortcuts removal completed.
pause
exit /b 0
