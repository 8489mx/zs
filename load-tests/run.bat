@echo off
setlocal enabledelayedexpansion

rem  Z-Systems load testing runner (Windows). See run.sh for the full notes.
rem
rem    run.bat                                  default profile (stress-all)
rem    set PROFILE=heavy   ^& run.bat           heavy load
rem    set PROFILE=extreme ^& run.bat           push to the knee (thresholds off)
rem    set PROFILE=soak    ^& run.bat           long soak, memory drift
rem    run.bat scenarios\pos-catalog-sync.js    one scenario
rem
rem  Sizes are calibrated for the production box (2 cores / 12 GB / 4 GB swap) with the
rem  backend in a single PM2 fork process. Keep run.sh and run.bat in step.

set SCENARIO=%1
if "%SCENARIO%"=="" set SCENARIO=scenarios\stress-all.js
if "%PROFILE%"=="" set PROFILE=default

if /i "%PROFILE%"=="default" ( set DEF_PEAK=50&  set DEF_RAMP=15& set DEF_HOLD=30
) else if /i "%PROFILE%"=="heavy" ( set DEF_PEAK=150& set DEF_RAMP=30& set DEF_HOLD=90
) else if /i "%PROFILE%"=="extreme" ( set DEF_PEAK=300& set DEF_RAMP=45& set DEF_HOLD=120
) else if /i "%PROFILE%"=="soak" ( set DEF_PEAK=40&  set DEF_RAMP=30& set DEF_HOLD=600
) else (
    echo [ERROR] Unknown PROFILE: %PROFILE%  ^(default^|heavy^|extreme^|soak^)
    exit /b 1
)

if "%PEAK_VUS%"=="" set PEAK_VUS=%DEF_PEAK%
if "%RAMP_SECONDS%"=="" set RAMP_SECONDS=%DEF_RAMP%
if "%HOLD_SECONDS%"=="" set HOLD_SECONDS=%DEF_HOLD%

set K6_EXTRA=
if /i "%PROFILE%"=="extreme" set K6_EXTRA=--no-thresholds

set K6_ENV=
for %%V in (TARGET_URL STOREFRONT_SLUG AUTH_USERNAME AUTH_PASSWORD TENANT_ID PEAK_VUS RAMP_SECONDS HOLD_SECONDS SPOOF_CLIENT_IPS) do (
    if defined %%V (
        for /f "delims=" %%A in ('echo %%%%V%%') do set K6_ENV=!K6_ENV! -e %%V=!%%V!
    )
)

echo =======================================================
echo   Z-Systems Enterprise Load ^& Stress Testing (k6)
echo -------------------------------------------------------
echo   Scenario : %SCENARIO%
echo   Profile  : %PROFILE%  (peak %PEAK_VUS% VUs, ramp %RAMP_SECONDS%s, hold %HOLD_SECONDS%s)
echo   Target   : %TARGET_URL%
echo =======================================================

where k6 >nul 2>nul
if %ERRORLEVEL% equ 0 (
    k6 run %K6_EXTRA% %K6_ENV% "%~dp0%SCENARIO%"
    exit /b %ERRORLEVEL%
)

where docker >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] k6 not installed - running via the grafana/k6 container...
    docker run --rm -i --network=host -v "%~dp0..:/work" -w /work/load-tests grafana/k6 run %K6_EXTRA% %K6_ENV% "%SCENARIO%"
    exit /b %ERRORLEVEL%
)

echo [ERROR] Neither 'k6' nor 'docker' were found on PATH.
echo   - Windows: choco install k6  or  winget install k6
echo   - Or use Docker: docker pull grafana/k6
echo For details see docs\LOAD_TESTING.md
exit /b 1
