<#
.SYNOPSIS
  Downloads and applies a pending ZS offline update.

.DESCRIPTION
  Reads the .update_pending marker file written by the backend before it exits.
  Downloads the patch ZIP from the URL in the marker, extracts it, and copies
  the new backend/dist and frontend/dist into place.
  Deletes the staging files and the marker on success.

.NOTES
  Called by Start-ZS.ps1 automatically when .update_pending is found.
  Do NOT run this script while the backend or frontend server is running.
#>

param(
  [Parameter(Mandatory = $true)][string]$PortableRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PortableRoot 'tools/launcher/lib/Common.ps1')

$paths      = Get-PathMap
$logName    = 'launcher-update.log'
$runDir     = $paths.RuntimeRunDir
$pendingFile = Join-Path $runDir '.update_pending'

function Write-UpdateLog([string]$Message) {
  Write-LauncherLog -Paths $paths -Name $logName -Message $Message
  Write-Host "[ZS-Update] $Message"
}

Write-UpdateLog 'Apply-Update.ps1 started.'

# ── Read the pending marker ───────────────────────────────────────────────
if (-not (Test-Path $pendingFile)) {
  Write-UpdateLog 'No .update_pending file found. Nothing to do.'
  exit 0
}

$pendingRaw = Get-Content -Path $pendingFile -Raw -Encoding utf8
$pending    = $pendingRaw | ConvertFrom-Json

$version  = $pending.version
$patchUrl = $pending.patchUrl

if ([string]::IsNullOrWhiteSpace($patchUrl)) {
  Write-UpdateLog "ERROR: patchUrl is empty in .update_pending. Removing marker."
  Remove-Item -Path $pendingFile -Force -ErrorAction SilentlyContinue
  exit 1
}

Write-UpdateLog "Applying update to v$version from: $patchUrl"

# ── Staging directory ─────────────────────────────────────────────────────
$stagingDir  = Join-Path $runDir 'update-staging'
$zipPath     = Join-Path $stagingDir 'patch.zip'
$extractPath = Join-Path $stagingDir 'extracted'

Ensure-Directory -Path $stagingDir
Ensure-Directory -Path $extractPath

# ── Download ──────────────────────────────────────────────────────────────
Write-UpdateLog "Downloading patch ZIP..."
try {
  Invoke-WebRequest -Uri $patchUrl -OutFile $zipPath -UseBasicParsing -TimeoutSec 300
  Write-UpdateLog "Download complete: $zipPath"
} catch {
  Write-UpdateLog "ERROR: Download failed — $($_.Exception.Message)"
  # Leave pending marker so it retries next time, but clean up partial zip
  Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
  exit 1
}

# ── Extract ───────────────────────────────────────────────────────────────
Write-UpdateLog "Extracting ZIP to: $extractPath"
try {
  # Remove any leftover extraction from a prior attempt
  if (Test-Path $extractPath) {
    Remove-Item -Path $extractPath -Recurse -Force
  }
  Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
  Write-UpdateLog "Extraction complete."
} catch {
  Write-UpdateLog "ERROR: Extraction failed — $($_.Exception.Message)"
  exit 1
}

# ── Copy backend/dist ─────────────────────────────────────────────────────
$srcBackend = Join-Path $extractPath 'backend\dist'
if (-not (Test-Path $srcBackend)) {
  # Some patch ZIPs may use forward slashes → try alternate structure
  $srcBackend = Join-Path $extractPath 'backend/dist'
}

if (Test-Path $srcBackend) {
  $destBackend = Join-Path $paths.AppBackendDir 'dist'
  Write-UpdateLog "Copying backend/dist -> $destBackend"
  robocopy $srcBackend $destBackend /E /IS /IT /NFL /NDL /NJH /NJS /NP | Out-Null
  Write-UpdateLog "backend/dist copied."
} else {
  Write-UpdateLog "WARNING: backend/dist not found in patch ZIP — skipping."
}

# ── Copy frontend/dist ────────────────────────────────────────────────────
$srcFrontend = Join-Path $extractPath 'frontend\dist'
if (-not (Test-Path $srcFrontend)) {
  $srcFrontend = Join-Path $extractPath 'frontend/dist'
}

if (Test-Path $srcFrontend) {
  $destFrontend = $paths.AppFrontendDir
  Write-UpdateLog "Copying frontend/dist -> $destFrontend"
  robocopy $srcFrontend $destFrontend /E /IS /IT /NFL /NDL /NJH /NJS /NP | Out-Null
  Write-UpdateLog "frontend/dist copied."
} else {
  Write-UpdateLog "WARNING: frontend/dist not found in patch ZIP — skipping."
}

# ── Cleanup ───────────────────────────────────────────────────────────────
Write-UpdateLog "Cleaning up staging files."
Remove-Item -Path $stagingDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path $pendingFile -Force -ErrorAction SilentlyContinue

Write-UpdateLog "Update to v$version applied successfully."
exit 0
