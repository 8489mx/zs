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

function Copy-DirectoryContents {
  param(
    [string]$SourceDir,
    [string]$DestDir
  )

  if (-not (Test-Path $SourceDir)) {
    Write-Host "Missing (skipped): $SourceDir"
    return
  }

  Ensure-Dir -Path $DestDir
  Get-ChildItem -LiteralPath $SourceDir -Force | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination (Join-Path $DestDir $_.Name) -Recurse -Force
  }

  Write-Host "Copied contents: $SourceDir -> $DestDir"
}

function Remove-IfExists {
  param([string]$Path)

  if (Test-Path $Path) {
    Remove-Item -Path $Path -Recurse -Force
    Write-Host "Removed stale path: $Path"
  }
}

function Resolve-NodeRuntimeSource {
  param(
    [string]$PortableRoot
  )

  $override = $env:PORTABLE_NODE_RUNTIME_DIR
  if ($override) {
    $overrideFull = [System.IO.Path]::GetFullPath($override)
    if (-not (Test-Path (Join-Path $overrideFull 'node.exe'))) {
      throw "PORTABLE_NODE_RUNTIME_DIR does not contain node.exe: $overrideFull"
    }
    if (-not (Test-Path (Join-Path $overrideFull 'npm.cmd'))) {
      throw "PORTABLE_NODE_RUNTIME_DIR does not contain npm.cmd: $overrideFull"
    }
    return $overrideFull
  }

  $staged = Join-Path $PortableRoot 'runtime/node'
  if ((Test-Path (Join-Path $staged 'node.exe')) -and (Test-Path (Join-Path $staged 'npm.cmd'))) {
    return $staged
  }

  $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $nodeCommand) {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  }

  if ($nodeCommand) {
    $nodeInstallDir = Split-Path -Parent $nodeCommand.Source
    if ((Test-Path (Join-Path $nodeInstallDir 'node.exe')) -and (Test-Path (Join-Path $nodeInstallDir 'npm.cmd'))) {
      return $nodeInstallDir
    }
  }

  throw 'Node runtime source not found. Set PORTABLE_NODE_RUNTIME_DIR or install Node.js on the build machine.'
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

  # Copy portable framework contents only.
  Copy-DirectoryContents -SourceDir $portableRoot -DestDir $outRoot

  # Remove generated/local-only content from previous local runs.
  Remove-IfExists -Path (Join-Path $outRoot 'app')
  Remove-IfExists -Path (Join-Path $outRoot 'runtime/data')
  Remove-IfExists -Path (Join-Path $outRoot 'runtime/logs')
  Remove-IfExists -Path (Join-Path $outRoot 'runtime/run')
  Remove-IfExists -Path (Join-Path $outRoot 'config/.env.offline')

  $bootstrapMarker = Join-Path $outRoot 'runtime/run/.bootstrap_done'
  if (Test-Path $bootstrapMarker) {
    Remove-Item -Path $bootstrapMarker -Force -ErrorAction SilentlyContinue
    Write-Host "Removed stale bootstrap marker: $bootstrapMarker"
  }

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
  Copy-DirectoryContents -SourceDir $frontendDist -DestDir $outFrontendDir

  # Bundle Node.js runtime for clean target machines without system Node/npm.
  $nodeRuntimeSource = Resolve-NodeRuntimeSource -PortableRoot $portableRoot
  $outNodeRuntimeDir = Join-Path $outRoot 'runtime/node'
  Remove-IfExists -Path $outNodeRuntimeDir
  Copy-IfExists -Source $nodeRuntimeSource -Dest $outNodeRuntimeDir
  Write-Host "Bundled Node.js runtime from: $nodeRuntimeSource"

  Ensure-Dir -Path (Join-Path $outRoot 'runtime/data')
  Ensure-Dir -Path (Join-Path $outRoot 'runtime/logs')
  Ensure-Dir -Path (Join-Path $outRoot 'runtime/run')

  Write-Host "Portable release assembled at: $outRoot"
  Write-Host 'Ready for clean-VM validation with no system Node.js/npm.'
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
