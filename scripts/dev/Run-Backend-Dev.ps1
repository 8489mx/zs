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

# Force the development database target in this process. This prevents any inherited
# DB_* variables or machine-level values from accidentally pointing the backend at
# the system/portable database.
$env:DATABASE_HOST = '127.0.0.1'
$env:DATABASE_PORT = '5433'
$env:DATABASE_NAME = 'zs_dev'
$env:DATABASE_USER = 'postgres'
$env:DATABASE_PASSWORD = 'postgres'
$env:DATABASE_SSL = 'false'
$env:DATABASE_SSL_REJECT_UNAUTHORIZED = 'false'

# Keep legacy aliases aligned because backend config can read DB_* / PGPORT too.
$env:DB_HOST = $env:DATABASE_HOST
$env:DB_PORT = $env:DATABASE_PORT
$env:PGPORT = $env:DATABASE_PORT
$env:DB_NAME = $env:DATABASE_NAME
$env:DB_USER = $env:DATABASE_USER
$env:DB_PASSWORD = $env:DATABASE_PASSWORD

Write-Host "Backend dev database target: $($env:DATABASE_HOST):$($env:DATABASE_PORT)/$($env:DATABASE_NAME)"


if (-not $env:NODE_ENV) {
  $env:NODE_ENV = 'development'
}



Write-Host 'Starting backend dev server (watch mode) on http://localhost:3101 ...'
& npm.cmd --prefix backend run start:dev

Write-Host ""
Write-Host "Backend dev server process exited with code $LASTEXITCODE."
Write-Host "Press any key to close..."
$host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown') | Out-Null
exit $LASTEXITCODE

