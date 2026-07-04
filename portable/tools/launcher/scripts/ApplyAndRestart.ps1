<#
.SYNOPSIS
  Applies a pending ZS update and restarts the backend process automatically.

.DESCRIPTION
  This script is spawned as a DETACHED process by the NestJS backend just before
  it calls process.exit(0) to trigger a self-update.

  Flow:
    1. Wait for the backend process to fully exit (configurable delay)
    2. Read .update_pending from runtime/run/
    3. Download patch.zip from the URL in the marker
    4. Extract the zip
    5. Copy backend/dist and frontend/dist into the app directories
    6. Run database migrations (same as the main launcher does on startup)
    7. Write .app_version so the version check endpoint returns the new version
    8. Start the backend Node.js process again (tracked via PID file)
    9. Wait for the backend health endpoint to confirm it is ready
   10. Clean up staging files and the .update_pending marker

.NOTES
  - Called automatically by the backend via child_process.spawn (detached, stdio: ignore).
  - Also callable manually for troubleshooting.
  - Safe to re-run if it fails partway — the .update_pending marker persists until success.
#>

param(
  [Parameter(Mandatory = $true)][string]$PortableRoot,
  [string]$NodeExe       = '',
  [string]$BackendCwd    = '',
  [string]$BackendEntry  = 'dist/main.js',
  [string]$BackendPort   = '3001',
  [int]$WaitBeforeApplySecs = 4
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Source the shared library (same dir as other launcher scripts)
. (Join-Path $PortableRoot 'tools/launcher/lib/Common.ps1')

$paths   = Get-PathMap
$logName = 'launcher-apply-restart.log'

function Write-Log([string]$Msg) {
  Write-LauncherLog -Paths $paths -Name $logName -Message $Msg
  Write-Host "[ZS-ApplyRestart] $Msg"
}

function Wait-Backend([string]$Url, [int]$TimeoutSecs = 120) {
  $deadline = (Get-Date).AddSeconds($TimeoutSecs)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $true }
    } catch { }
    Start-Sleep -Milliseconds 800
  }
  return $false
}

# ────────────────────────────────────────────────────────────────────────────
Write-Log "ApplyAndRestart started. Waiting ${WaitBeforeApplySecs}s for backend to exit..."
Start-Sleep -Seconds $WaitBeforeApplySecs

# ── Read the pending marker ──────────────────────────────────────────────────
$pendingFile = Join-Path $paths.RuntimeRunDir '.update_pending'
if (-not (Test-Path $pendingFile)) {
  Write-Log 'No .update_pending found. Nothing to do.'
  exit 0
}

$pending = Get-Content -Path $pendingFile -Raw -Encoding utf8 | ConvertFrom-Json

$version     = $pending.version
$patchUrl    = $pending.patchUrl

# Override params with values from the pending file if they were embedded there
if ($pending.PSObject.Properties['nodeExe']     -and $pending.nodeExe)    { $NodeExe      = $pending.nodeExe }
if ($pending.PSObject.Properties['backendCwd']  -and $pending.backendCwd) { $BackendCwd   = $pending.backendCwd }
if ($pending.PSObject.Properties['backendEntry']-and $pending.backendEntry){ $BackendEntry = $pending.backendEntry }
if ($pending.PSObject.Properties['backendPort'] -and $pending.backendPort) { $BackendPort  = $pending.backendPort }

# Resolve node exe from env if not provided
if ([string]::IsNullOrWhiteSpace($NodeExe) -or -not (Test-Path $NodeExe)) {
  $envFile = Join-Path $paths.ConfigDir '.env.offline'
  if (Test-Path $envFile) {
    $envMap  = Get-EnvMap -EnvFile $envFile
    $NodeExe = Resolve-NodeExe -Paths $paths -EnvMap $envMap
  } else {
    $NodeExe = $paths.BundledNodeExe
  }
}

if ([string]::IsNullOrWhiteSpace($BackendCwd))  { $BackendCwd  = $paths.AppBackendDir }
if ([string]::IsNullOrWhiteSpace($patchUrl)) {
  Write-Log 'ERROR: patchUrl is empty. Aborting.'
  exit 1
}

Write-Log "Applying update to v$version  |  URL: $patchUrl"
Write-Log "Node: $NodeExe | CWD: $BackendCwd | Entry: $BackendEntry | Port: $BackendPort"

# ── Staging ──────────────────────────────────────────────────────────────────
$stagingDir  = Join-Path $paths.RuntimeRunDir 'update-staging'
$zipPath     = Join-Path $stagingDir 'patch.zip'
$extractDir  = Join-Path $stagingDir 'extracted'
Ensure-Directory -Path $stagingDir

# ── Download ─────────────────────────────────────────────────────────────────
Write-Log 'Downloading patch.zip...'
try {
  Invoke-WebRequest -Uri $patchUrl -OutFile $zipPath -UseBasicParsing -TimeoutSec 300
  Write-Log "Download complete ($([Math]::Round((Get-Item $zipPath).Length / 1MB, 1)) MB)"
} catch {
  Write-Log "ERROR: Download failed — $($_.Exception.Message)"
  Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
  exit 1
}

# ── Extract ──────────────────────────────────────────────────────────────────
Write-Log 'Extracting ZIP...'
try {
  if (Test-Path $extractDir) { Remove-Item -Path $extractDir -Recurse -Force }
  Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
  Write-Log 'Extraction complete.'
} catch {
  Write-Log "ERROR: Extraction failed — $($_.Exception.Message)"
  exit 1
}

# ── Copy backend/dist ────────────────────────────────────────────────────────
$srcBackend = @(
  (Join-Path $extractDir 'backend\dist'),
  (Join-Path $extractDir 'backend/dist')
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($srcBackend) {
  $destBackend = Join-Path $paths.AppBackendDir 'dist'
  Write-Log "Copying backend/dist -> $destBackend"
  robocopy $srcBackend $destBackend /E /IS /IT /NFL /NDL /NJH /NJS /NP | Out-Null
  Write-Log 'backend/dist applied.'
} else {
  Write-Log 'WARNING: backend/dist not found in patch — skipping.'
}

# ── Copy backend/package.json (carries the new version number) ───────────────
$srcPkg = @(
  (Join-Path $extractDir 'backend\package.json'),
  (Join-Path $extractDir 'backend/package.json')
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($srcPkg) {
  $destPkg = Join-Path $paths.AppBackendDir 'package.json'
  Copy-Item -Path $srcPkg -Destination $destPkg -Force
  Write-Log 'backend/package.json updated.'
}

# ── Copy frontend/dist ───────────────────────────────────────────────────────
$srcFrontend = @(
  (Join-Path $extractDir 'frontend\dist'),
  (Join-Path $extractDir 'frontend/dist')
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($srcFrontend) {
  $destFrontend = $paths.AppFrontendDir
  Write-Log "Copying frontend/dist -> $destFrontend"
  robocopy $srcFrontend $destFrontend /E /IS /IT /NFL /NDL /NJH /NJS /NP | Out-Null
  Write-Log 'frontend/dist applied.'
} else {
  Write-Log 'WARNING: frontend/dist not found in patch — skipping.'
}

# ── Run database migrations ──────────────────────────────────────────────────
Write-Log 'Running database migrations...'
try {
  $envFile = Join-Path $paths.ConfigDir '.env.offline'
  if (Test-Path $envFile) {
    $envMap = Get-EnvMap -EnvFile $envFile
    Export-EnvMap -EnvMap $envMap
    $migrationCmd = Resolve-MigrationCommand -Paths $paths -EnvMap $envMap
    if ($migrationCmd) {
      Invoke-BackendCommand -Command $migrationCmd -WorkingDirectory $BackendCwd -Label 'Migrations'
      Write-Log 'Migrations complete.'
    }
  }
} catch {
  Write-Log "WARNING: Migrations threw — $($_.Exception.Message) — continuing restart."
}

# ── Write version marker ─────────────────────────────────────────────────────
$versionFile = Join-Path $paths.RuntimeRunDir '.app_version'
Set-Content -Path $versionFile -Value $version -Encoding ascii
Write-Log "Written .app_version = $version"

# ── Restart backend ──────────────────────────────────────────────────────────
Write-Log "Starting backend: $NodeExe $BackendEntry (cwd: $BackendCwd)"
$backendProc = Start-Process `
  -FilePath $NodeExe `
  -WorkingDirectory $BackendCwd `
  -ArgumentList @($BackendEntry) `
  -WindowStyle Hidden `
  -PassThru

Write-PidFile -Paths $paths -Name 'backend' -ProcessId $backendProc.Id
Write-Log "Backend process started (PID: $($backendProc.Id))"

# ── Wait for backend to be healthy ───────────────────────────────────────────
$healthUrl = "http://127.0.0.1:$BackendPort/health/live"
Write-Log "Waiting for backend health at $healthUrl ..."
$ready = Wait-Backend -Url $healthUrl -TimeoutSecs 120
if ($ready) {
  Write-Log 'Backend is healthy — update complete!'
} else {
  Write-Log 'WARNING: Backend did not become healthy within 120s. Check logs.'
}

# ── Cleanup ──────────────────────────────────────────────────────────────────
Remove-Item -Path $stagingDir  -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path $pendingFile -Force         -ErrorAction SilentlyContinue
Write-Log "Update to v$version applied and backend restarted successfully."
exit 0
