@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Assemble-Portable.ps1" %*
endlocal
