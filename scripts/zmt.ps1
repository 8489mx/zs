# UTF-8 with BOM
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "ZSystems Database Maintenance Tool (ZMT)"

Clear-Host
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "       ZSystems ERP - ط£ط¯ط§ط© طµظٹط§ظ†ط© ظˆطھط³ط±ظٹط¹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ (ZMT)         " -ForegroundColor Cyan
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

# Check port 3001 using netstat (safe on all Windows versions without admin rights)
try {
    $netstatOut = netstat -ano | Select-String ":3001 " | Select-String "LISTENING"
    if ($netstatOut) { $appRunning = $true }
} catch {}

if ($appRunning) {
    Write-Host "---------------------------------------------------------------------" -ForegroundColor Red
    Write-Host " [!] طھط­ط°ظٹط± ط£ظ…ظ†ظٹ: ط¨ط±ظ†ط§ظ…ط¬ ZSystems POS ظ‚ظٹط¯ ط§ظ„طھط´ط؛ظٹظ„ ط­ط§ظ„ظٹط§ظ‹!" -ForegroundColor Red
    Write-Host "---------------------------------------------------------------------" -ForegroundColor Red
    Write-Host ""
    Write-Host " ظ„ط§ ظٹظ…ظƒظ† طھظ†ظپظٹط° ط§ظ„طµظٹط§ظ†ط© ظˆظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ظ‚ظٹط¯ ط§ظ„ط§ط³طھط®ط¯ط§ظ…." -ForegroundColor Yellow
    Write-Host " ظٹط±ط¬ظ‰ ط¥ط؛ظ„ط§ظ‚ ط§ظ„ط¨ط±ظ†ط§ظ…ط¬ ط¨ط§ظ„ظƒط§ظ…ظ„ ط£ظˆظ„ط§ظ‹ ط«ظ… طھط´ط؛ظٹظ„ ظ‡ط°ظ‡ ط§ظ„ط£ط¯ط§ط© ظ…ط±ط© ط£ط®ط±ظ‰." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "---------------------------------------------------------------------" -ForegroundColor Red
    Write-Host ""
    Read-Host "ط§ط¶ط؛ط· Enter ظ„ظ„ط¥ط؛ظ„ط§ظ‚..."
    exit 1
}

Write-Host "[*] ط¬ط§ط±ظٹ ظپط­طµ ظ…ط³ط§ط±ط§طھ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ..." -ForegroundColor Gray

# 2. Locate Postgres runtime and data folder
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$baseDir = Split-Path -Parent $scriptDir
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
    Write-Host "[X] ط®ط·ط£: ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ظ…ط­ط±ظƒ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ط£ظˆ ظ…ظ„ظپط§طھ ط§ظ„ط¨ظٹط§ظ†ط§طھ." -ForegroundColor Red
    Write-Host "طھط£ظƒط¯ ظ…ظ† ظˆط¬ظˆط¯ ظ…ط¬ظ„ط¯ runtime ظˆط¨ظٹط§ظ†ط§طھ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ط¨ط¬ظˆط§ط± ظ…ظ„ظپ ط§ظ„ط¨ط±ظ†ط§ظ…ط¬." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "ط§ط¶ط؛ط· Enter ظ„ظ„ط¥ط؛ظ„ط§ظ‚..."
    exit 1
}

Write-Host "[âœ”] طھظ… طھط­ط¯ظٹط¯ ظ…ظˆظ‚ط¹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ: $dataDir" -ForegroundColor Green
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
    Write-Host "[*] ظ…ط­ط±ظƒ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ظٹط¹ظ…ظ„ ط¨ط§ظ„ظپط¹ظ„طŒ ط¬ط§ط±ظٹ ط¨ط¯ط، ط§ظ„طµظٹط§ظ†ط©..." -ForegroundColor Gray
} else {
    Write-Host "[*] ط¬ط§ط±ظٹ طھط´ط؛ظٹظ„ ظ…ط­ط±ظƒ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ظ…ط¤ظ‚طھط§ظ‹ ظ„طھظ†ظپظٹط° ط§ظ„طµظٹط§ظ†ط©..." -ForegroundColor Gray
    & $pgCtl start -D $dataDir -w -l "$logsDir\maint_pg.log" -o "-p 5444" *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] طھط¹ط°ط± طھط´ط؛ظٹظ„ ظ…ط­ط±ظƒ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ. ط±ط§ط¬ط¹ ط§ظ„ظ„ظˆط¬ ظپظٹ: $logsDir\maint_pg.log" -ForegroundColor Red
        Write-Host ""
        Read-Host "ط§ط¶ط؛ط· Enter ظ„ظ„ط¥ط؛ظ„ط§ظ‚..."
        exit 1
    }
}

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host " ط¬ط§ط±ظٹ طھظ†ط¸ظٹظپ ظˆط¶ط؛ط· ط§ظ„ظپظ‡ط§ط±ط³ ظˆط§ظ„ط¬ط¯ط§ظˆظ„ (ظ‚ط¯ ظٹط³طھط؛ط±ظ‚ ط¨ط¶ط¹ ط«ظˆط§ظ†ظچ)..." -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host ""

$env:PGPASSWORD = "postgres"

# Step A: Clean stale temporary rows
Write-Host "[1/3] طھظ†ط¸ظٹظپ ط§ظ„ط¬ظ„ط³ط§طھ ط§ظ„ظ…ظ†طھظ‡ظٹط© ظˆط§ظ„ط³ط¬ظ„ط§طھ ط§ظ„ظ…ط¤ظ‚طھط©..." -ForegroundColor Cyan
$sqlCleanup = "DELETE FROM sessions WHERE expires_at < NOW(); DELETE FROM operation_executions WHERE status IN ('committed', 'failed') AND completed_at < NOW() - INTERVAL '30 days'; DELETE FROM auth_rate_limits WHERE reset_at < NOW() - INTERVAL '1 hour';"
& $psql -U postgres -p 5444 -d zs_offline -c $sqlCleanup *> $null

# Step B: VACUUM ANALYZE
Write-Host "[2/3] طھظپط±ظٹط؛ ظˆط¶ط؛ط· ظ…ط³ط§ط­ط© ط§ظ„ط¬ط¯ط§ظˆظ„ ط§ظ„ظ…ظٹطھط© (VACUUM ANALYZE)..." -ForegroundColor Cyan
& $vacuumDb -U postgres -p 5444 -d zs_offline -z *> $null

# Step C: REINDEX
Write-Host "[3/3] ط¥ط¹ط§ط¯ط© ط¨ظ†ط§ط، ظˆطھط±طھظٹط¨ ظƒط§ظپط© ظپظ‡ط§ط±ط³ ط§ظ„ط¨ط­ط« (REINDEX DATABASE)..." -ForegroundColor Cyan
& $reindexDb -U postgres -p 5444 -d zs_offline *> $null

# Stop Postgres if started temporarily
if (-not $pgAlreadyRunning) {
    Write-Host ""
    Write-Host "[*] ط¥ظٹظ‚ط§ظپ ظ…ط­ط±ظƒ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ط¨ط£ظ…ط§ظ†..." -ForegroundColor Gray
    & $pgCtl stop -D $dataDir -m fast *> $null
}

Clear-Host
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "              ًںژ‰ طھظ…طھ ط¹ظ…ظ„ظٹط© ط§ظ„طµظٹط§ظ†ط© ظˆط§ظ„طھط³ط±ظٹط¹ ط¨ظ†ط¬ط§ط­ طھط§ظ…!               " -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""
Write-Host " [âœ”] طھظ… طھظ†ط¸ظٹظپ ط§ظ„ط¬ظ„ط³ط§طھ ظˆط§ظ„ط³ط¬ظ„ط§طھ ط§ظ„ظ…ط¤ظ‚طھط© ط§ظ„ظ…ظ†طھظ‡ظٹط©." -ForegroundColor White
Write-Host " [âœ”] طھظ… ط¶ط؛ط· ط§ظ„ط¬ط¯ط§ظˆظ„ ظˆط§ط³طھط¹ط§ط¯ط© ط§ظ„ظ…ط³ط§ط­ط§طھ ط§ظ„ظ…ظٹطھط© ط¹ظ„ظ‰ ط§ظ„ظ‚ط±طµ ط§ظ„طµظ„ط¨." -ForegroundColor White
Write-Host " [âœ”] طھظ… ط¥ط¹ط§ط¯ط© ط¨ظ†ط§ط، ظپظ‡ط§ط±ط³ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ط¨ط§ظ„ظƒط§ظ…ظ„ ظ„طھط³ط±ظٹط¹ ط§ظ„ط¨ط­ط«." -ForegroundColor White
Write-Host ""
Write-Host " ظٹظ…ظƒظ†ظƒ ط§ظ„ط¢ظ† طھط´ط؛ظٹظ„ ط¨ط±ظ†ط§ظ…ط¬ ZSystems POS ظƒط§ظ„ظ…ط¹طھط§ط¯ ظˆط³طھظ„ط§ط­ط¸ ط³ط±ط¹ط© ظپط§ط¦ظ‚ط©." -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""
Read-Host "ط§ط¶ط؛ط· Enter ظ„ظ„ط¥ط؛ظ„ط§ظ‚..."
