@echo off
setlocal

echo =======================================================
echo   Z-Systems Enterprise Load & Stress Testing (k6)
echo =======================================================
echo.

set SCENARIO=%1
if "%SCENARIO%"=="" set SCENARIO=scenarios\stress-all.js

where k6 >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Running scenario %SCENARIO% using local k6 CLI...
    k6 run "%~dp0%SCENARIO%"
    exit /b %ERRORLEVEL%
)

where docker >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Local k6 not found. Running scenario %SCENARIO% via Docker container (grafana/k6)...
    docker run --rm -i -v "%~dp0..:/work" -w /work/load-tests --network=host grafana/k6 run "%SCENARIO%"
    exit /b %ERRORLEVEL%
)

echo [ERROR] Neither 'k6' nor 'docker' were found on PATH.
echo.
echo Please install k6:
echo   - Windows: choco install k6  or  winget install k6
echo   - Or use Docker: docker pull grafana/k6
echo.
echo For detailed instructions, refer to: docs\LOAD_TESTING.md
exit /b 1
