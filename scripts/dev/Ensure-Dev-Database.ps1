$ErrorActionPreference = 'Stop'

param(
  [string] $DatabaseName = 'zs_dev',
  [string] $AdminDatabase = 'postgres',
  [string] $Host = '127.0.0.1',
  [int] $Port = 5433,
  [string] $Username = 'postgres',
  [string] $Password = 'postgres'
)

function Resolve-PsqlPath {
  $candidatePaths = @()

  if (-not [string]::IsNullOrWhiteSpace($env:POSTGRES_BIN)) {
    $candidatePaths += (Join-Path $env:POSTGRES_BIN 'psql.exe')
  }

  $candidatePaths += @(
    'C:\Program Files\PostgreSQL\18\bin\psql.exe',
    'C:\Program Files\PostgreSQL\17\bin\psql.exe',
    'C:\Program Files\PostgreSQL\16\bin\psql.exe',
    'C:\Program Files\PostgreSQL\15\bin\psql.exe'
  )

  $pathCommand = Get-Command psql.exe -ErrorAction SilentlyContinue
  if ($pathCommand -and $pathCommand.Source) {
    $candidatePaths += $pathCommand.Source
  }

  foreach ($candidatePath in $candidatePaths) {
    $resolved = Resolve-Path -LiteralPath $candidatePath -ErrorAction SilentlyContinue
    if ($resolved) {
      return $resolved.Path
    }
  }

  throw 'psql.exe was not found. Set POSTGRES_BIN to your PostgreSQL bin directory.'
}

$psqlExe = Resolve-PsqlPath
$env:PGPASSWORD = $Password

$checkSql = "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName';"
$exists = (& $psqlExe -h $Host -p $Port -U $Username -d $AdminDatabase -tAc $checkSql 2>$null).Trim()

if ($exists -eq '1') {
  Write-Host "Database '$DatabaseName' already exists."
  exit 0
}

Write-Host "Creating database '$DatabaseName' on $Host`:$Port ..."
& $psqlExe -h $Host -p $Port -U $Username -d $AdminDatabase -c "CREATE DATABASE $DatabaseName;"
exit $LASTEXITCODE

