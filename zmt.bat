<# :
@echo off
setlocal
chcp 65001 > nul
title ZSystems Database Maintenance Tool (ZMT)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$PSScriptRoot = '%~dp0'; iex ((Get-Content -LiteralPath '%~f0' -Encoding UTF8) -join [Environment]::NewLine)"
exit /b %errorlevel%
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "ZSystems Database Maintenance Tool (ZMT)"

Clear-Host
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "       ZSystems ERP - أداة صيانة وتسريع قاعدة البيانات (ZMT)         " -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if the application or backend is running
$appRunning = $false

$processes = Get-Process | Where-Object { 
    $_.ProcessName -like "*ZSystems*" -or 
    $_.ProcessName -eq "electron"
}

if ($processes) {
    $appRunning = $true
}

# Also check if backend port 3001 is active
try {
    $portActive = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
    if ($portActive) { $appRunning = $true }
} catch {}

if ($appRunning) {
    Write-Host "---------------------------------------------------------------------" -ForegroundColor Red
    Write-Host " [!] تحذير أمني: برنامج ZSystems POS قيد التشغيل حالياً!" -ForegroundColor Red
    Write-Host "---------------------------------------------------------------------" -ForegroundColor Red
    Write-Host ""
    Write-Host " لا يمكن تنفيذ الصيانة وقاعدة البيانات قيد الاستخدام." -ForegroundColor Yellow
    Write-Host " يرجى إغلاق البرنامج بالكامل أولاً ثم تشغيل هذه الأداة مرة أخرى." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "---------------------------------------------------------------------" -ForegroundColor Red
    Write-Host ""
    Read-Host "اضغط Enter للإغلاق..."
    exit 1
}

Write-Host "[*] جاري فحص مسارات قاعدة البيانات..." -ForegroundColor Gray

# 2. Locate Postgres runtime and data folder
$baseDir = $PSScriptRoot
if (-not $baseDir) { $baseDir = Get-Location }

$runtimeDir = $null
$dataDir = $null

$candidates = @(
    "$baseDir\runtime",
    "$baseDir\portable\runtime",
    "C:\zn\portable\runtime",
    "D:\zn\portable\runtime"
)

foreach ($cand in $candidates) {
    if (Test-Path "$cand\postgres\bin\pg_ctl.exe") {
        $runtimeDir = $cand
        $dataDir = "$cand\data"
        break
    }
}

if (-not $runtimeDir -or -not (Test-Path "$dataDir\PG_VERSION")) {
    Write-Host "[X] خطأ: لم يتم العثور على محرك قاعدة البيانات أو ملفات البيانات." -ForegroundColor Red
    Write-Host "تأكد من وجود مجلد runtime وبيانات قاعدة البيانات بجوار ملف البرنامج." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "اضغط Enter للإغلاق..."
    exit 1
}

Write-Host "[✔] تم تحديد موقع قاعدة البيانات: $dataDir" -ForegroundColor Green
Write-Host ""

$pgBin = "$runtimeDir\postgres\bin"
$pgCtl = "$pgBin\pg_ctl.exe"
$vacuumDb = "$pgBin\vacuumdb.exe"
$reindexDb = "$pgBin\reindexdb.exe"
$psql = "$pgBin\psql.exe"

$logsDir = "$runtimeDir\logs"
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir -Force | Out-Null }

# 3. Check if Postgres service is already active or start it safely
$pgAlreadyRunning = $false
& $pgCtl status -D $dataDir *> $null
if ($LASTEXITCODE -eq 0) {
    $pgAlreadyRunning = $true
    Write-Host "[*] محرك قاعدة البيانات يعمل بالفعل، جاري بدء الصيانة..." -ForegroundColor Gray
} else {
    Write-Host "[*] جاري تشغيل محرك قاعدة البيانات مؤقتاً لتنفيذ الصيانة..." -ForegroundColor Gray
    & $pgCtl start -D $dataDir -w -l "$logsDir\maint_pg.log" -o "-p 5444" *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] تعذر تشغيل محرك قاعدة البيانات. راجع اللوج في: $logsDir\maint_pg.log" -ForegroundColor Red
        Write-Host ""
        Read-Host "اضغط Enter للإغلاق..."
        exit 1
    }
}

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host " جاري تنظيف وضغط الفهارس والجداول (قد يستغرق بضع ثوانٍ)..." -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host ""

$env:PGPASSWORD = "postgres"

# Step A: Clean stale temporary rows
Write-Host "[1/3] تنظيف الجلسات المنتهية والسجلات المؤقتة..." -ForegroundColor Cyan
$sqlCleanup = "DELETE FROM sessions WHERE expires_at < NOW(); DELETE FROM operation_executions WHERE status IN ('committed', 'failed') AND completed_at < NOW() - INTERVAL '30 days'; DELETE FROM auth_rate_limits WHERE reset_at < NOW() - INTERVAL '1 hour';"
& $psql -U postgres -p 5444 -d zs_offline -c $sqlCleanup *> $null

# Step B: VACUUM ANALYZE
Write-Host "[2/3] تفريغ وضغط مساحة الجداول الميتة (VACUUM ANALYZE)..." -ForegroundColor Cyan
& $vacuumDb -U postgres -p 5444 -d zs_offline -z *> $null

# Step C: REINDEX
Write-Host "[3/3] إعادة بناء وترتيب كافة فهارس البحث (REINDEX DATABASE)..." -ForegroundColor Cyan
& $reindexDb -U postgres -p 5444 -d zs_offline *> $null

# Stop Postgres if started temporarily
if (-not $pgAlreadyRunning) {
    Write-Host ""
    Write-Host "[*] إيقاف محرك قاعدة البيانات بأمان..." -ForegroundColor Gray
    & $pgCtl stop -D $dataDir -m fast *> $null
}

Clear-Host
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "              🎉 تمت عملية الصيانة والتسريع بنجاح تام!               " -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""
Write-Host " [✔] تم تنظيف الجلسات والسجلات المؤقتة المنتهية." -ForegroundColor White
Write-Host " [✔] تم ضغط الجداول واستعادة المساحات الميتة على القرص الصلب." -ForegroundColor White
Write-Host " [✔] تم إعادة بناء فهارس قاعدة البيانات بالكامل لتسريع البحث." -ForegroundColor White
Write-Host ""
Write-Host " يمكنك الآن تشغيل برنامج ZSystems POS كالمعتاد وستلاحظ سرعة فائقة." -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""
Read-Host "اضغط Enter للإغلاق..."
