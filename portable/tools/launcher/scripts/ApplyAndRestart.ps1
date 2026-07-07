<#
.SYNOPSIS
  Applies a pending ZS update and restarts the backend process automatically.

.DESCRIPTION
  This script is spawned as a DETACHED process by the NestJS backend just before
  it calls process.exit(0) to trigger a self-update.

  Supports two modes:
    - Portable mode  : electronExePath NOT set in pending -> restarts Node.js backend.
    - Electron mode  : electronExePath IS set in pending  -> restarts the Electron EXE.

.NOTES
  - Called automatically by the backend via child_process.spawn (detached, stdio: ignore).
  - Safe to re-run if it fails partway (the .update_pending marker persists until success).
#>

param(
  [Parameter(Mandatory = $true)][string]$PortableRoot,
  [string]$NodeExe       = '',
  [string]$BackendCwd    = '',
  [string]$BackendEntry  = 'dist/main.js',
  [string]$BackendPort   = '3001',
  [int]$WaitBeforeApplySecs = 4
)

$ErrorActionPreference = 'Stop'

# ── Log setup ─────────────────────────────────────────────────────────────────
$runtimeRunDir  = Join-Path $PortableRoot 'runtime\run'
$runtimeLogsDir = Join-Path $PortableRoot 'runtime\logs'
if (-not (Test-Path $runtimeLogsDir)) {
  New-Item -ItemType Directory -Path $runtimeLogsDir -Force | Out-Null
}
$logFile = Join-Path $runtimeLogsDir 'launcher-apply-restart.log'

function Write-Log {
  param([string]$Msg)
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Msg"
  Add-Content -Path $logFile -Value $line -Encoding UTF8
  Write-Host "[ZS-ApplyRestart] $Msg"
}

function Ensure-Dir {
  param([string]$DirPath)
  if (-not (Test-Path $DirPath)) {
    New-Item -ItemType Directory -Path $DirPath -Force | Out-Null
  }
}

# ── Wait for backend to exit ──────────────────────────────────────────────────
Write-Log "ApplyAndRestart started. Waiting ${WaitBeforeApplySecs}s for backend to exit..."
Start-Sleep -Seconds $WaitBeforeApplySecs

# ── Read the pending marker ───────────────────────────────────────────────────
$pendingFile = Join-Path $runtimeRunDir '.update_pending'
if (-not (Test-Path $pendingFile)) {
  Write-Log 'No .update_pending found. Nothing to do.'
  exit 0
}

$pending = Get-Content -Path $pendingFile -Raw -Encoding utf8 | ConvertFrom-Json

$version        = $pending.version
$patchUrl       = ''
$localPatchPath = ''

if ($pending.PSObject.Properties['patchUrl'] -and $pending.patchUrl) {
  $patchUrl = $pending.patchUrl
}
if ($pending.PSObject.Properties['localPatchPath'] -and $pending.localPatchPath) {
  $localPatchPath = $pending.localPatchPath
}

# Override params with values from the pending file
if ($pending.PSObject.Properties['nodeExe']      -and $pending.nodeExe)      { $NodeExe      = $pending.nodeExe }
if ($pending.PSObject.Properties['backendCwd']   -and $pending.backendCwd)   { $BackendCwd   = $pending.backendCwd }
if ($pending.PSObject.Properties['backendEntry'] -and $pending.backendEntry) { $BackendEntry = $pending.backendEntry }
if ($pending.PSObject.Properties['backendPort']  -and $pending.backendPort)  { $BackendPort  = $pending.backendPort }

# ── Detect Electron mode ──────────────────────────────────────────────────────
$electronExePath = ''
if ($pending.PSObject.Properties['electronExePath'] -and $pending.electronExePath) {
  $electronExePath = $pending.electronExePath
}
$isElectronMode = (-not [string]::IsNullOrWhiteSpace($electronExePath)) -and (Test-Path $electronExePath)
Write-Log "Mode: $(if ($isElectronMode) { 'Electron' } else { 'Portable' })"

# ── Build path map ────────────────────────────────────────────────────────────
if ($isElectronMode) {
  $unpackedBase = Join-Path $PortableRoot 'resources\app.asar.unpacked'
  $pathMap = @{
    RuntimeDir     = Join-Path $PortableRoot 'runtime'
    RuntimeRunDir  = $runtimeRunDir
    AppBackendDir  = Join-Path $unpackedBase 'electron\backend'
    AppFrontendDir = Join-Path $unpackedBase 'dist'
    PostgresBinDir = Join-Path $PortableRoot 'runtime\postgres\bin'
    ConfigDir      = ''
    BundledNodeExe = Join-Path $PortableRoot 'runtime\node\node.exe'
  }
} else {
  # Portable mode: source Common.ps1
  . (Join-Path $PortableRoot 'tools\launcher\lib\Common.ps1')
  $cmn = Get-PathMap
  $pathMap = @{
    RuntimeDir     = $cmn.RuntimeDir
    RuntimeRunDir  = $cmn.RuntimeRunDir
    AppBackendDir  = $cmn.AppBackendDir
    AppFrontendDir = $cmn.AppFrontendDir
    PostgresBinDir = $cmn.PostgresBinDir
    ConfigDir      = $cmn.ConfigDir
    BundledNodeExe = $cmn.BundledNodeExe
  }
}

# ── Validate patch source ─────────────────────────────────────────────────────
if ([string]::IsNullOrWhiteSpace($patchUrl) -and [string]::IsNullOrWhiteSpace($localPatchPath)) {
  Write-Log 'ERROR: Both patchUrl and localPatchPath are empty. Aborting.'
  exit 1
}

Write-Log "Applying update to v$version"

# ── Pre-Update Backup ─────────────────────────────────────────────────────────
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDir = Join-Path $pathMap.RuntimeDir "backups\pre-update-v$version-$timestamp"
Ensure-Dir -DirPath $backupDir

Write-Log "Creating pre-update backup at $backupDir..."
try {
  $backendDistSrc = Join-Path $pathMap.AppBackendDir 'dist'
  if (Test-Path $backendDistSrc) {
    $backendDistDest = Join-Path $backupDir 'backend\dist'
    robocopy $backendDistSrc $backendDistDest /E /IS /IT /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed for backend dist (exit $LASTEXITCODE)" }
  }

  $pkgSrc = Join-Path $pathMap.AppBackendDir 'package.json'
  if (Test-Path $pkgSrc) {
    Ensure-Dir -DirPath (Join-Path $backupDir 'backend')
    Copy-Item -Path $pkgSrc -Destination (Join-Path $backupDir 'backend\package.json') -Force
  }

  $frontendDistSrc = $pathMap.AppFrontendDir
  if (Test-Path $frontendDistSrc) {
    $frontendDistDest = Join-Path $backupDir 'frontend\dist'
    robocopy $frontendDistSrc $frontendDistDest /E /IS /IT /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed for frontend dist (exit $LASTEXITCODE)" }
  }

  # Database backup — portable mode only (Electron: postgres is stopped before this script runs)
  if (-not $isElectronMode) {
    $pgDump = Join-Path $pathMap.PostgresBinDir 'pg_dump.exe'
    if (Test-Path $pgDump) {
      $envFile = Join-Path $pathMap.ConfigDir '.env.offline'
      if (Test-Path $envFile) {
        $envMap  = Get-EnvMap -EnvFile $envFile
        $dbPort  = Get-EnvValue -EnvMap $envMap -Key 'DB_PORT'     -Default '5432'
        $dbUser  = Get-EnvValue -EnvMap $envMap -Key 'DB_USER'     -Default 'postgres'
        $dbName  = Get-EnvValue -EnvMap $envMap -Key 'DB_NAME'     -Default 'postgres'
        $dbPass  = Get-EnvValue -EnvMap $envMap -Key 'DB_PASSWORD' -Default 'postgres'
        $env:PGPASSWORD = $dbPass
        $dbBackupPath = Join-Path $backupDir 'database.sql'
        & $pgDump -h 127.0.0.1 -p $dbPort -U $dbUser -d $dbName -F c -f $dbBackupPath
        if ($LASTEXITCODE -ne 0) { throw "pg_dump failed (exit $LASTEXITCODE)" }
        Write-Log 'Database backup completed.'
      }
    }
  } else {
    Write-Log 'Skipping database backup in Electron mode (postgres already stopped).'
  }

  Write-Log 'Pre-update backup completed.'
} catch {
  Write-Log "ERROR: Pre-update backup failed: $($_.Exception.Message). Aborting."
  exit 1
}

# ── Staging ───────────────────────────────────────────────────────────────────
$stagingDir = Join-Path $pathMap.RuntimeRunDir 'update-staging'
$zipPath    = Join-Path $stagingDir 'patch.zip'
$extractDir = Join-Path $stagingDir 'extracted'
Ensure-Dir -DirPath $stagingDir

# ── Download / Copy ZIP ───────────────────────────────────────────────────────
if ((-not [string]::IsNullOrWhiteSpace($localPatchPath)) -and (Test-Path $localPatchPath)) {
  Write-Log "Using local patch file: $localPatchPath"
  Copy-Item -Path $localPatchPath -Destination $zipPath -Force
} else {
  Write-Log 'Downloading patch.zip...'
  try {
    Invoke-WebRequest -Uri $patchUrl -OutFile $zipPath -UseBasicParsing -TimeoutSec 300
    $sizeMB = [Math]::Round((Get-Item $zipPath).Length / 1MB, 1)
    Write-Log "Download complete ($sizeMB MB)"
  } catch {
    Write-Log "ERROR: Download failed: $($_.Exception.Message)"
    Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
    exit 1
  }
}

# ── Extract ───────────────────────────────────────────────────────────────────
Write-Log 'Extracting ZIP...'
try {
  if (Test-Path $extractDir) { Remove-Item -Path $extractDir -Recurse -Force }
  Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
  Write-Log 'Extraction complete.'
} catch {
  Write-Log "ERROR: Extraction failed: $($_.Exception.Message)"
  exit 1
}

# ── Copy backend/dist ─────────────────────────────────────────────────────────
$srcBackend = $null
$candidates = @(
  (Join-Path $extractDir 'backend\dist'),
  (Join-Path $extractDir 'backend/dist')
)
foreach ($c in $candidates) {
  if (Test-Path $c) { $srcBackend = $c; break }
}

if ($srcBackend) {
  $destBackend = Join-Path $pathMap.AppBackendDir 'dist'
  Write-Log "Copying backend/dist -> $destBackend"
  robocopy $srcBackend $destBackend /E /IS /IT /NFL /NDL /NJH /NJS /NP | Out-Null
  Write-Log 'backend/dist applied.'
} else {
  Write-Log 'WARNING: backend/dist not found in patch, skipping.'
}

# ── Copy backend/package.json ─────────────────────────────────────────────────
$srcPkg = $null
$pkgCandidates = @(
  (Join-Path $extractDir 'backend\package.json'),
  (Join-Path $extractDir 'backend/package.json')
)
foreach ($c in $pkgCandidates) {
  if (Test-Path $c) { $srcPkg = $c; break }
}

if ($srcPkg) {
  $destPkg = Join-Path $pathMap.AppBackendDir 'package.json'
  Copy-Item -Path $srcPkg -Destination $destPkg -Force
  Write-Log 'backend/package.json updated.'
}

# ── Copy frontend/dist ────────────────────────────────────────────────────────
$srcFrontend = $null
$frontendCandidates = @(
  (Join-Path $extractDir 'frontend\dist'),
  (Join-Path $extractDir 'frontend/dist')
)
foreach ($c in $frontendCandidates) {
  if (Test-Path $c) { $srcFrontend = $c; break }
}

if ($srcFrontend) {
  $destFrontend = $pathMap.AppFrontendDir
  Write-Log "Copying frontend/dist -> $destFrontend"
  robocopy $srcFrontend $destFrontend /E /IS /IT /NFL /NDL /NJH /NJS /NP | Out-Null
  Write-Log 'frontend/dist applied.'
} else {
  Write-Log 'WARNING: frontend/dist not found in patch, skipping.'
}

# ── Run database migrations (portable mode only) ──────────────────────────────
if (-not $isElectronMode) {
  Write-Log 'Running database migrations...'
  try {
    $envFile = Join-Path $pathMap.ConfigDir '.env.offline'
    if (Test-Path $envFile) {
      $envMap = Get-EnvMap -EnvFile $envFile
      Export-EnvMap -EnvMap $envMap
      $migrationCmd = Resolve-MigrationCommand -Paths $cmn -EnvMap $envMap
      if ($migrationCmd) {
        Invoke-BackendCommand -Command $migrationCmd -WorkingDirectory $BackendCwd -Label 'Migrations'
        Write-Log 'Migrations complete.'
      }
    }
  } catch {
    Write-Log "WARNING: Migrations threw: $($_.Exception.Message) - continuing restart."
  }
} else {
  Write-Log 'Skipping migrations in Electron mode (NestJS runs them on startup).'
}

# ── Write version marker ──────────────────────────────────────────────────────
$versionFile = Join-Path $pathMap.RuntimeRunDir '.app_version'
Set-Content -Path $versionFile -Value $version -Encoding ascii
Write-Log "Written .app_version = $version"

# ── Restart ───────────────────────────────────────────────────────────────────
if ($isElectronMode) {
  Write-Log "Restarting Electron app: $electronExePath"
  Start-Process -FilePath $electronExePath -WorkingDirectory (Split-Path -Parent $electronExePath)
  Write-Log 'Electron app relaunched successfully.'
} else {
  if ([string]::IsNullOrWhiteSpace($NodeExe) -or -not (Test-Path $NodeExe)) {
    $envFile = Join-Path $pathMap.ConfigDir '.env.offline'
    if (Test-Path $envFile) {
      $envMap  = Get-EnvMap -EnvFile $envFile
      $NodeExe = Resolve-NodeExe -Paths $cmn -EnvMap $envMap
    } else {
      $NodeExe = $pathMap.BundledNodeExe
    }
  }
  if ([string]::IsNullOrWhiteSpace($BackendCwd)) { $BackendCwd = $pathMap.AppBackendDir }

  Write-Log "Starting backend: $NodeExe $BackendEntry (cwd: $BackendCwd)"
  $backendProc = Start-Process `
    -FilePath $NodeExe `
    -WorkingDirectory $BackendCwd `
    -ArgumentList @($BackendEntry) `
    -WindowStyle Hidden `
    -PassThru

  Write-Log "Backend process started (PID: $($backendProc.Id))"

  $healthUrl = "http://127.0.0.1:$BackendPort/health/live"
  Write-Log "Waiting for backend health at $healthUrl ..."
  $deadline = (Get-Date).AddSeconds(120)
  $ready = $false
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri $healthUrl -Method Get -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { $ready = $true; break }
    } catch { }
    Start-Sleep -Milliseconds 800
  }
  if ($ready) {
    Write-Log 'Backend is healthy.'
  } else {
    Write-Log 'WARNING: Backend did not become healthy within 120s.'
  }
}

# ── Cleanup ───────────────────────────────────────────────────────────────────
Remove-Item -Path $stagingDir  -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path $pendingFile -Force         -ErrorAction SilentlyContinue
Write-Log "Update to v$version applied and restarted successfully."
exit 0
