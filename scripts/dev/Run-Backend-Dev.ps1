$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

function Import-EnvFile([string] $filePath) {
  if (-not (Test-Path $filePath)) {
    throw "Missing env file: $filePath"
  }

  foreach ($rawLine in Get-Content -LiteralPath $filePath) {
    $line = $rawLine.Trim()
    if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) {
      continue
    }

    $separatorIndex = $line.IndexOf('=')
    if ($separatorIndex -lt 1) {
      continue
    }

    $name = $line.Substring(0, $separatorIndex).Trim()
    $value = $line.Substring($separatorIndex + 1)
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}

$repoRoot = Resolve-RepoRoot
$envFile = Join-Path $repoRoot 'backend\.env.development'

Set-Location $repoRoot
Import-EnvFile -filePath $envFile

if (-not $env:NODE_ENV) {
  $env:NODE_ENV = 'development'
}

Write-Host 'Starting backend dev server (watch mode) on http://localhost:3101 ...'
& npm.cmd --prefix backend run start:dev
exit $LASTEXITCODE

