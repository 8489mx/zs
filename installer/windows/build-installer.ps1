Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$issFile = Join-Path $PSScriptRoot 'zs-offline.iss'

if (-not (Test-Path $issFile)) {
  throw "Inno script not found: $issFile"
}

$candidates = @(
  "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
  "${env:ProgramFiles}\Inno Setup 6\ISCC.exe"
)

$iscc = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) {
  throw "ISCC.exe not found. Install Inno Setup 6 first."
}

Push-Location $repoRoot
try {
  & $iscc $issFile
} finally {
  Pop-Location
}

Write-Host "Installer build complete. Check ./release for output."
