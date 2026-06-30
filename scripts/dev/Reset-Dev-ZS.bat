@echo off
setlocal

echo =======================================================
echo          Resetting Development Environment
echo =======================================================

echo.
echo [1/3] Stopping Development Servers...
call "%~dp0Stop-Dev-ZS.bat"

echo.
echo [2/3] Deleting PostgreSQL Data...
if exist "%~dp0.runtime\postgres-data" (
    rmdir /s /q "%~dp0.runtime\postgres-data"
    echo Data deleted successfully.
) else (
    echo No existing data found.
)

echo.
echo [3/3] Starting Development Servers...
call "%~dp0Start-Dev-ZS.bat"

endlocal
