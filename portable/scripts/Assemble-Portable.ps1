param(
  [string]$SourceRoot = '..\..',
  [string]$OutputDir = 'release\portable-bundle'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Ensure-Dir {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Copy-IfExists {
  param(
    [string]$Source,
    [string]$Dest
  )

  if (Test-Path $Source) {
    Ensure-Dir -Path (Split-Path -Parent $Dest)
    Copy-Item -Path $Source -Destination $Dest -Recurse -Force
    Write-Host "Copied: $Source -> $Dest"
  } else {
    Write-Host "Missing (skipped): $Source"
  }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$portableRoot = (Resolve-Path (Join-Path $scriptDir '..')).Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir $SourceRoot)).Path
$outRoot = Join-Path $repoRoot $OutputDir

$portableFull = [System.IO.Path]::GetFullPath($portableRoot)
$outFull = [System.IO.Path]::GetFullPath($outRoot)
if ($outFull.StartsWith($portableFull, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "OutputDir must be outside portable/. Current output: $outFull"
}

try {
  Ensure-Dir -Path $outRoot

  # Copy portable framework (without runtime data).
  Copy-IfExists -Source $portableRoot -Dest $outRoot

  # Overlay backend/frontend build artifacts from repository if available.
  $backendDist = Join-Path $repoRoot 'backend/dist'
  $backendPkg = Join-Path $repoRoot 'backend/package.json'
  $backendModules = Join-Path $repoRoot 'backend/node_modules'
  $frontendDist = Join-Path $repoRoot 'frontend/dist'

  $outBackendDir = Join-Path $outRoot 'app/backend'
  $outFrontendDir = Join-Path $outRoot 'app/frontend'

  Ensure-Dir -Path $outBackendDir
  Ensure-Dir -Path $outFrontendDir

  Copy-IfExists -Source $backendDist -Dest (Join-Path $outBackendDir 'dist')
  Copy-IfExists -Source $backendPkg -Dest (Join-Path $outBackendDir 'package.json')
  Copy-IfExists -Source $backendModules -Dest (Join-Path $outBackendDir 'node_modules')
  Copy-IfExists -Source $frontendDist -Dest $outFrontendDir

  Write-Host "Portable release assembled at: $outRoot"
  Write-Host 'Next: inject PostgreSQL runtime binaries into runtime/postgres/bin before delivery.'
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
