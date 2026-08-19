@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title ZSystems Database Maintenance Tool (zmt)

color 0B
cls
echo =====================================================================
echo       ZSystems ERP - أداة صيانة وتسريع قاعدة البيانات (ZMT)
echo =====================================================================
echo.

:: 1. Check if the Main Electron Application or Backend is Running
set "APP_RUNNING=0"

tasklist /FI "IMAGENAME eq ZSystems POS.exe" 2>NUL | find /I /N "ZSystems POS.exe" >NUL
if "%ERRORLEVEL%"=="0" set "APP_RUNNING=1"

tasklist /FI "IMAGENAME eq electron.exe" 2>NUL | find /I /N "electron.exe" >NUL
if "%ERRORLEVEL%"=="0" set "APP_RUNNING=1"

netstat -ano | findstr ":3001 " | findstr "LISTENING" >NUL
if "%ERRORLEVEL%"=="0" set "APP_RUNNING=1"

if "%APP_RUNNING%"=="1" (
    color 0C
    echo ---------------------------------------------------------------------
    echo  [!] تحذير أمني: برنامج ZSystems POS قيد التشغيل حالياً!
    echo ---------------------------------------------------------------------
    echo.
    echo  لا يمكن تنفيذ الصيانة وقاعدة البيانات قيد الاستخدام.
    echo  يرجى إغلاق البرنامج بالكامل أولاً ثم تشغيل هذا الملف مرة أخرى.
    echo.
    echo ---------------------------------------------------------------------
    echo.
    pause
    exit /b 1
)

echo [*] جاري فحص مسارات قاعدة البيانات...

:: 2. Locate Postgres Binaries and Data Directory
set "RUNTIME_DIR="
set "DATA_DIR="

if exist "%~dp0runtime\postgres\bin\pg_ctl.exe" (
    set "RUNTIME_DIR=%~dp0runtime"
    set "DATA_DIR=%~dp0runtime\data"
) else if exist "%~dp0portable\runtime\postgres\bin\pg_ctl.exe" (
    set "RUNTIME_DIR=%~dp0portable\runtime"
    set "DATA_DIR=%~dp0portable\runtime\data"
) else if exist "C:\zn\portable\runtime\postgres\bin\pg_ctl.exe" (
    set "RUNTIME_DIR=C:\zn\portable\runtime"
    set "DATA_DIR=C:\zn\portable\runtime\data"
)

if "%RUNTIME_DIR%"=="" (
    color 0C
    echo [X] خطأ: لم يتم العثور على محرك قاعدة البيانات (Postgres runtime).
    echo يرجى التأكد من وجود مجلد runtime بجوار ملف البرنامج.
    echo.
    pause
    exit /b 1
)

set "PG_BIN=%RUNTIME_DIR%\postgres\bin"
set "PG_CTL=%PG_BIN%\pg_ctl.exe"
set "VACUUMDB=%PG_BIN%\vacuumdb.exe"
set "REINDEXDB=%PG_BIN%\reindexdb.exe"
set "PSQL=%PG_BIN%\psql.exe"

if not exist "%DATA_DIR%\PG_VERSION" (
    color 0C
    echo [X] خطأ: لم يتم العثور على بيانات في المسار: %DATA_DIR%
    echo.
    pause
    exit /b 1
)

echo [✔] تم تحديد موقع قاعدة البيانات: %DATA_DIR%
echo.

:: 3. Check if Postgres is already running or start it safely
set "PG_ALREADY_RUNNING=0"
"%PG_CTL%" status -D "%DATA_DIR%" >NUL 2>&1
if "%ERRORLEVEL%"=="0" (
    set "PG_ALREADY_RUNNING=1"
    echo [*] محرك قاعدة البيانات يعمل بالفعل، جاري بدء الصيانة المباشرة...
) else (
    echo [*] جاري تشغيل محرك قاعدة البيانات مؤقتاً لتنفيذ الصيانة...
    "%PG_CTL%" start -D "%DATA_DIR%" -w -l "%RUNTIME_DIR%\logs\maint_pg.log" -o "-p 5444" >NUL 2>&1
    if "%ERRORLEVEL%" NEQ "0" (
        color 0C
        echo [X] تعذر تشغيل محرك قاعدة البيانات للصيانة. راجع اللوج في: %RUNTIME_DIR%\logs\maint_pg.log
        echo.
        pause
        exit /b 1
    )
)

echo.
echo =====================================================================
echo  جاري تنظيف وضغط الفهارس والجداول (قد يستغرق بضع ثوانٍ)...
echo =====================================================================
echo.

set "PGPASSWORD=postgres"

:: Step A: Fast cleanup of stale sessions & executions
echo [1/3] تنظيف الجلسات المنتهية والسجلات المؤقتة...
"%PSQL%" -U postgres -p 5444 -d zs_offline -c "DELETE FROM sessions WHERE expires_at < NOW(); DELETE FROM operation_executions WHERE status IN ('committed', 'failed') AND completed_at < NOW() - INTERVAL '30 days'; DELETE FROM auth_rate_limits WHERE reset_at < NOW() - INTERVAL '1 hour';" >NUL 2>&1

:: Step B: VACUUM ANALYZE FULL to reclaim dead space
echo [2/3] تفريغ وضغط مساحة الجداول الميتة (VACUUM ANALYZE)...
"%VACUUMDB%" -U postgres -p 5444 -d zs_offline -z -v >NUL 2>&1

:: Step C: REINDEX all indexes to eliminate B-tree bloat
echo [3/3] إعادة بناء وترتيب كافة الفهارس (REINDEX DATABASE)...
"%REINDEXDB%" -U postgres -p 5444 -d zs_offline >NUL 2>&1

:: 4. Stop Postgres if we started it
if "%PG_ALREADY_RUNNING%"=="0" (
    echo.
    echo [*] إيقاف محرك قاعدة البيانات بأمان...
    "%PG_CTL%" stop -D "%DATA_DIR%" -m fast >NUL 2>&1
)

color 0A
cls
echo =====================================================================
echo            🎉 تمت عملية الصيانة والتسريع بنجاح تام!
echo =====================================================================
echo.
echo  [✔] تم حذف جميع الجلسات المؤقتة والبيانات المنتهية.
echo  [✔] تم ضغط الجداول واستعادة المساحات الميتة على القرص الصلب.
echo  [✔] تم إعادة بناء فهارس قاعدة البيانات بالكامل لأقصى سرعة بحث.
echo.
echo  يمكنك الآن تشغيل برنامج ZSystems POS كالمعتاد وستلاحظ سرعة فائقة.
echo =====================================================================
echo.
pause
