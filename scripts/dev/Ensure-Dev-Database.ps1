$ErrorActionPreference = 'Stop'

param(
  [string] $DatabaseName = 'zs_dev',
  [string] $AdminDatabase = 'postgres',
  [string] $Host = 'localhost',
  [int] $Port = 5432,
  [string] $Username = 'postgres'
)

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw 'psql is not installed or not available in PATH.'
}

$checkSql = "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName';"
$exists = (& psql -h $Host -p $Port -U $Username -d $AdminDatabase -tAc $checkSql 2>$null).Trim()

if ($exists -eq '1') {
  Write-Host "Database '$DatabaseName' already exists."
  exit 0
}

Write-Host "Creating database '$DatabaseName' ..."
& psql -h $Host -p $Port -U $Username -d $AdminDatabase -c "CREATE DATABASE $DatabaseName;"
exit $LASTEXITCODE

