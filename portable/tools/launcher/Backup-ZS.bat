@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Backup-ZS.ps1"
endlocal
