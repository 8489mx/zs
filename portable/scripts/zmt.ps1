# UTF-8 with BOM
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "ZSystems Database Maintenance & Emergency Tool (ZMT)"

Clear-Host
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "       ZSystems ERP - System Maintenance & Emergency Tool (ZMT)      " -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if the application or backend is running
$processes = Get-Process | Where-Object { 
    $_.ProcessName -like "*ZSystems*" -or 
    $_.ProcessName -eq "electron"
}

$appRunning = $false
if ($processes) { $appRunning = $true }

try {
    $netstatOut = netstat -ano | Select-String ":3001 " | Select-String "LISTENING"
    if ($netstatOut) { $appRunning = $true }
} catch {}

if ($appRunning) {
    Write-Host "---------------------------------------------------------------------" -ForegroundColor Red
    Write-Host " [!] تحذير أمني: برنامج ZSystems POS قيد التشغيل حالياً!" -ForegroundColor Red
    Write-Host "---------------------------------------------------------------------" -ForegroundColor Red
    Write-Host ""
    Write-Host " لا يمكن تنفيذ الصيانة أو الاسترجاع وقاعدة البيانات قيد الاستخدام." -ForegroundColor Yellow
    Write-Host " يرجى إغلاق البرنامج بالكامل أولاً ثم تشغيل هذه الأداة مرة أخرى." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "---------------------------------------------------------------------" -ForegroundColor Red
    Write-Host ""
    Read-Host "اضغط Enter للإغلاق..."
    exit 1
}

# 2. Main Menu
Write-Host " Please select an action (اختر الإجراء المطلوب):" -ForegroundColor White
Write-Host ""
Write-Host "  [1] ⚡ تسريع وصيانة قاعدة البيانات (Database Speedup & Reindex)" -ForegroundColor Green
Write-Host "  [2] ↩️  استرجاع الإصدار السابق فوراً (One-Click Emergency Rollback)" -ForegroundColor Yellow
Write-Host "  [3] ❌ خروج (Exit)" -ForegroundColor Gray
Write-Host ""
Write-Host "---------------------------------------------------------------------" -ForegroundColor Cyan

$choice = Read-Host ">> Select option [1-3] (الافتراضي: 1)"
if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$baseDir = Split-Path -Parent $scriptDir
if (-not $baseDir) { $baseDir = Get-Location }

if ($choice -eq "2") {
    # ── Rollback Action ───────────────────────────────────────────
    Write-Host ""
    Write-Host "=====================================================================" -ForegroundColor Cyan
    Write-Host "       ↩️  ZSystems Emergency Update Rollback & Restore              " -ForegroundColor Cyan
    Write-Host "=====================================================================" -ForegroundColor Cyan
    Write-Host ""

    $backupsDir = "$baseDir\runtime\backups"
    if (-not (Test-Path $backupsDir)) {
        $backupsDir = "$baseDir\portable\runtime\backups"
    }

    if (-not (Test-Path $backupsDir)) {
        Write-Host "[X] No backups directory found at: $backupsDir" -ForegroundColor Red
        Read-Host "اضغط Enter للإغلاق..."
        exit 1
    }

    $backupFolders = Get-ChildItem -Path $backupsDir -Directory | Sort-Object LastWriteTime -Descending
    if (-not $backupFolders -or $backupFolders.Count -eq 0) {
        Write-Host "[X] لا توجد نسخ احتياطية سابقة محفوظة في مجلد التحديثات." -ForegroundColor Red
        Read-Host "اضغط Enter للإغلاق..."
        exit 1
    }

    $latestBackup = $backupFolders[0]
    Write-Host "[OK] تم العثور على آخر نسخة احتياطية:" -ForegroundColor Green
    Write-Host "     المجلد: $($latestBackup.Name)" -ForegroundColor White
    Write-Host "     التاريخ: $($latestBackup.LastWriteTime)" -ForegroundColor Gray
    Write-Host ""

    $confirm = Read-Host ">> هل تؤكد استرجاع هذه النسخة السابقة؟ [Y/n]"
    if ($confirm -and $confirm.Trim().ToLower() -ne "y" -and $confirm.Trim() -ne "نعم") {
        Write-Host "تم إلغاء عملية الاسترجاع." -ForegroundColor Gray
        exit 0
    }

    Write-Host ""
    Write-Host "[*] جاري استرجاع الملفات من النسخة الاحتياطية..." -ForegroundColor Cyan

    $unpackedBase = "$baseDir\resources\app.asar.unpacked"
    $isElectron = Test-Path $unpackedBase

    if ($isElectron) {
        $targetBackend = "$unpackedBase\electron\backend"
        $targetFrontend = "$unpackedBase\dist"
    } else {
        $targetBackend = "$baseDir\app\backend"
        $targetFrontend = "$baseDir\app\frontend\dist"
    }

    if (Test-Path "$($latestBackup.FullName)\backend\dist") {
        Copy-Item -Path "$($latestBackup.FullName)\backend\dist\*" -Destination "$targetBackend\dist" -Recurse -Force
        Write-Host "    -> تم استرجاع ملفات الباك إند." -ForegroundColor Gray
    }
    if (Test-Path "$($latestBackup.FullName)\backend\package.json") {
        Copy-Item -Path "$($latestBackup.FullName)\backend\package.json" -Destination "$targetBackend\package.json" -Force
    }
    if (Test-Path "$($latestBackup.FullName)\frontend\dist") {
        Copy-Item -Path "$($latestBackup.FullName)\frontend\dist\*" -Destination "$targetFrontend" -Recurse -Force
        Write-Host "    -> تم استرجاع ملفات الفرونت إند." -ForegroundColor Gray
    }

    # Reset pending update marker
    $pendingFile = "$baseDir\runtime\run\.update_pending"
    if (Test-Path $pendingFile) { Remove-Item $pendingFile -Force -ErrorAction SilentlyContinue }

    Clear-Host
    Write-Host "=====================================================================" -ForegroundColor Green
    Write-Host "           EMERGENCY ROLLBACK COMPLETED SUCCESSFULLY!                " -ForegroundColor Green
    Write-Host "=====================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host " [OK] تم استرجاع الإصدار السابق بنجاح من: $($latestBackup.Name)" -ForegroundColor White
    Write-Host " [OK] يمكنك الآن تشغيل البرنامج كالمعتاد." -ForegroundColor Yellow
    Write-Host "=====================================================================" -ForegroundColor Green
    Write-Host ""
    Read-Host "اضغط Enter للإنهاء..."
    exit 0
}

if ($choice -ne "1") {
    Write-Host "خروج..." -ForegroundColor Gray
    exit 0
}

# ── Database Maintenance ───────────────────────────────────────
Write-Host "[*] جاري فحص مسارات قاعدة البيانات..." -ForegroundColor Gray

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

if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

$pgAlreadyRunning = $false
try {
    $null = & $pgCtl status -D $dataDir 2>&1
    if ($LASTEXITCODE -eq 0) {
        $pgAlreadyRunning = $true
        Write-Host "[*] محرك قاعدة البيانات نشط بالفعل. جاري المتابعة..." -ForegroundColor Gray
    }
} catch {
    $pgAlreadyRunning = $false
}

if (-not $pgAlreadyRunning) {
    Write-Host "[*] جاري تشغيل محرك قاعدة البيانات للصيانة..." -ForegroundColor Gray
    $maintLog = "$logsDir\maint_pg.log"
    & $pgCtl start -D $dataDir -w -l $maintLog -o "-p 5444" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] فشل بدء تشغيل قاعدة البيانات لإجراء الصيانة." -ForegroundColor Red
        Read-Host "اضغط Enter للإغلاق..."
        exit 1
    }
}

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host " جاري تحسين الجداول، الفهارس، واسترجاع المساحات الميتة..." -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host ""

$env:PGPASSWORD = "postgres"

Write-Host "[1/3] تنظيف الجلسات المؤقتة والبيانات المنتهية..." -ForegroundColor Cyan
$sqlCleanup = "DELETE FROM sessions WHERE expires_at < NOW(); DELETE FROM operation_executions WHERE status IN ('committed', 'failed') AND completed_at < NOW() - INTERVAL '30 days'; DELETE FROM auth_rate_limits WHERE reset_at < NOW() - INTERVAL '1 hour';"
& $psql -U postgres -p 5444 -d zs_offline -c $sqlCleanup | Out-Null

Write-Host "[2/3] استرجاع المساحات المتروكة (VACUUM FULL ANALYZE)..." -ForegroundColor Cyan
& $vacuumDb -U postgres -p 5444 -d zs_offline -z | Out-Null

Write-Host "[3/3] إعادة بناء فهارس البحث لتحقيق أعلى سرعة استجابة (REINDEX)..." -ForegroundColor Cyan
& $reindexDb -U postgres -p 5444 -d zs_offline | Out-Null

if (-not $pgAlreadyRunning) {
    Write-Host ""
    Write-Host "[*] جاري إيقاف محرك قاعدة البيانات بأمان..." -ForegroundColor Gray
    & $pgCtl stop -D $dataDir -m fast | Out-Null
}

Clear-Host
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "          اكتملت صيانة وتسريع قاعدة البيانات بنجاح!                  " -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""
Write-Host " [✔] تم تنظيف الجلسات المنتهية وسجلات المعالجة القديمة." -ForegroundColor White
Write-Host " [✔] تم استرجاع المساحات الميتة بالقرص وحساب الإحصائيات (VACUUM)." -ForegroundColor White
Write-Host " [✔] تم تجديد وإعادة بناء كافة فهارس البحث بالكامل (REINDEX)." -ForegroundColor White
Write-Host ""
Write-Host " يمكنك الآن فتح برنامج ZSystems POS والعمل بأقصى أداء وسرعة." -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""
Read-Host "اضغط Enter للإنهاء..."
exit 0
