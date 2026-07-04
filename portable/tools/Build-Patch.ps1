<#
.SYNOPSIS
  Builds a ZS offline patch ZIP ready to upload to the admin panel.

.DESCRIPTION
  Automates the full patch creation process:
    1. Reads the current version from backend/package.json (no manual input needed)
    2. Builds the backend (npm run build)
    3. Builds the frontend portable bundle (npm run build:portable)
    4. Packages everything into patch-{version}.zip with the correct structure:
         patch-{version}.zip
         ├── backend/
         │   ├── dist/           ← compiled backend
         │   └── package.json    ← version carrier
         └── frontend/
             └── dist/           ← compiled frontend (portable mode)
    5. Saves the zip to releases/ in the project root

.USAGE
  From the repository root:
    powershell -ExecutionPolicy Bypass -File portable\tools\Build-Patch.ps1

  Or with a custom version:
    powershell -ExecutionPolicy Bypass -File portable\tools\Build-Patch.ps1 -Version 1.5.0

.NOTES
  After running, upload the zip to your server and create/promote a release
  in Settings → إصدارات التحديث.
#>

param(
  [string]$Version   = '',       # auto-read from backend/package.json if empty
  [string]$OutputDir = ''        # defaults to <repo-root>/releases/
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Resolve repo root (two levels up from portable/tools/) ──────────────────
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = (Resolve-Path (Join-Path $scriptDir '../..')).Path

$backendDir  = Join-Path $repoRoot 'backend'
$frontendDir = Join-Path $repoRoot 'frontend'

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $OutputDir = Join-Path $repoRoot 'releases'
}

# ── Read version from backend/package.json ───────────────────────────────────
if ([string]::IsNullOrWhiteSpace($Version)) {
  $pkgPath = Join-Path $backendDir 'package.json'
  if (-not (Test-Path $pkgPath)) {
    throw "backend/package.json not found at: $pkgPath"
  }
  $pkg     = Get-Content $pkgPath -Raw | ConvertFrom-Json
  $Version = $pkg.version
}

if ([string]::IsNullOrWhiteSpace($Version)) {
  throw 'Could not determine version. Set it in backend/package.json or pass -Version.'
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ZS Patch Builder  —  v$Version" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── Staging directory ────────────────────────────────────────────────────────
$stagingDir = Join-Path $env:TEMP "zs-patch-staging-$Version"
if (Test-Path $stagingDir) { Remove-Item $stagingDir -Recurse -Force }
New-Item -ItemType Directory -Path $stagingDir | Out-Null

$stagingBackend  = Join-Path $stagingDir 'backend'
$stagingFrontend = Join-Path $stagingDir 'frontend'
New-Item -ItemType Directory -Path $stagingBackend  | Out-Null
New-Item -ItemType Directory -Path $stagingFrontend | Out-Null

# ── Step 1: Build backend ────────────────────────────────────────────────────
Write-Host "[1/4] Building backend..." -ForegroundColor Yellow
Push-Location $backendDir
try {
  & npm run build
  if ($LASTEXITCODE -ne 0) { throw "Backend build failed (exit $LASTEXITCODE)" }
} finally { Pop-Location }
Write-Host "      Backend built OK." -ForegroundColor Green

# ── Step 2: Build frontend (portable mode) ───────────────────────────────────
Write-Host "[2/4] Building frontend (portable mode)..." -ForegroundColor Yellow
Push-Location $frontendDir
try {
  $buildScript = if ($(npm run | Out-String) -match 'build:portable') { 'build:portable' } else { 'build' }
  & npm run $buildScript
  if ($LASTEXITCODE -ne 0) { throw "Frontend build failed (exit $LASTEXITCODE)" }
} finally { Pop-Location }
Write-Host "      Frontend built OK." -ForegroundColor Green

# ── Step 3: Stage files ──────────────────────────────────────────────────────
Write-Host "[3/4] Staging patch files..." -ForegroundColor Yellow

# backend/dist
$backendDistSrc = Join-Path $backendDir 'dist'
$backendDistDst = Join-Path $stagingBackend 'dist'
robocopy $backendDistSrc $backendDistDst /E /NFL /NDL /NJH /NJS /NP | Out-Null

# backend/package.json (version carrier)
Copy-Item (Join-Path $backendDir 'package.json') (Join-Path $stagingBackend 'package.json') -Force

# frontend/dist
$frontendDistSrc = Join-Path $frontendDir 'dist'
$frontendDistDst = Join-Path $stagingFrontend 'dist'
robocopy $frontendDistSrc $frontendDistDst /E /NFL /NDL /NJH /NJS /NP | Out-Null

Write-Host "      Files staged." -ForegroundColor Green

# ── Step 4: Create ZIP ───────────────────────────────────────────────────────
Write-Host "[4/4] Creating patch ZIP..." -ForegroundColor Yellow

if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$zipName = "patch-$Version.zip"
$zipPath = Join-Path $OutputDir $zipName

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Compress-Archive -Path (Join-Path $stagingDir '*') -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item $stagingDir -Recurse -Force

$sizeMB = [Math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "      ZIP created ($sizeMB MB)." -ForegroundColor Green

# ── Summary ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅  Patch ready!" -ForegroundColor Green
Write-Host ""
Write-Host "  File   : $zipPath" -ForegroundColor White
Write-Host "  Version: $Version" -ForegroundColor White
Write-Host "  Size   : ${sizeMB} MB" -ForegroundColor White
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Yellow
Write-Host "    1. Upload this file to your server (or S3/CDN)" -ForegroundColor White
Write-Host "    2. Open Settings → إصدارات التحديث" -ForegroundColor White
Write-Host "    3. Create a new release with version $Version and the file URL" -ForegroundColor White
Write-Host "    4. Press ✓ 'اعتماد كنسخة مستقرة' to notify clients" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
