@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Check-Portable-Ready.ps1"
endlocal
