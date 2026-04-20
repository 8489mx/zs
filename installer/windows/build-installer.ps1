Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$issFile = Join-Path $PSScriptRoot 'zs-offline.iss'
$packageJsonFile = Join-Path $repoRoot 'package.json'

if (-not (Test-Path $issFile)) {
  throw "Inno script not found: $issFile"
}

if (-not (Test-Path $packageJsonFile)) {
  throw "package.json not found: $packageJsonFile"
}

$packageJson = Get-Content -Raw -Path $packageJsonFile | ConvertFrom-Json
$appVersion = [string]$packageJson.version
if (-not $appVersion) {
  throw "Failed to read app version from package.json"
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
  & $iscc "/DMyAppVersion=$appVersion" $issFile
} finally {
  Pop-Location
}

Write-Host "Installer build complete for version $appVersion. Check ./release for output."
