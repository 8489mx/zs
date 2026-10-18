@echo off
setlocal
chcp 65001 > nul
title ZSystems System Maintenance & Emergency Tool (ZMT)

:: 1. Check if Node.js is available in PATH
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    node "%~dp0scripts\zmt.cjs"
    if %ERRORLEVEL% neq 0 pause
    exit /b %ERRORLEVEL%
)

:: 2. Check if Node is inside portable or runtime
if exist "%~dp0runtime\node\node.exe" (
    "%~dp0runtime\node\node.exe" "%~dp0scripts\zmt.cjs"
    if %ERRORLEVEL% neq 0 pause
    exit /b %ERRORLEVEL%
)

:: 3. Fallback to PowerShell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\zmt.ps1"
if %ERRORLEVEL% neq 0 pause
exit /b %ERRORLEVEL%
