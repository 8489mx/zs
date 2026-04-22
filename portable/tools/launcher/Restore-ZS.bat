@echo off
setlocal
if "%~1"=="" (
  echo Usage: Restore-ZS.bat ^<backup-file.sql^>
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Restore-ZS.ps1" -BackupFile "%~1"
endlocal
