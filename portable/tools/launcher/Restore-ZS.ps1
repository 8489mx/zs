Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
  [Parameter(Mandatory = $true)][string]$BackupFile
)

. "$PSScriptRoot/Common.ps1"

$paths = Get-PathMap
$logName = 'launcher-restore.log'

try {
  $envFile = Ensure-EnvFile -Paths $paths
  $envMap = Get-EnvMap -EnvFile $envFile

  Assert-PostgresRuntime -Paths $paths

  if (-not (Test-Path $BackupFile)) {
    throw "Backup file not found: $BackupFile"
  }

  $dbPort = Get-EnvValue -EnvMap $envMap -Key 'DB_PORT' -Default '5432'
  $dbUser = Get-EnvValue -EnvMap $envMap -Key 'DB_USER' -Default 'postgres'
  $dbPass = Get-EnvValue -EnvMap $envMap -Key 'DB_PASSWORD' -Default 'postgres'
  $dbName = Get-EnvValue -EnvMap $envMap -Key 'DB_NAME' -Default 'zs_offline'

  $psql = Join-Path $paths.PostgresBinDir 'psql.exe'
  $createdb = Join-Path $paths.PostgresBinDir 'createdb.exe'

  $env:PGPASSWORD = $dbPass

  # Ensure DB exists
  $exists = (& $psql -h 127.0.0.1 -p $dbPort -U $dbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$dbName';").Trim()
  if ($exists -ne '1') {
    & $createdb -h 127.0.0.1 -p $dbPort -U $dbUser $dbName
    if ($LASTEXITCODE -ne 0) {
      throw "createdb failed with exit code $LASTEXITCODE"
    }
  }

  & $psql -h 127.0.0.1 -p $dbPort -U $dbUser -d $dbName -f $BackupFile
  if ($LASTEXITCODE -ne 0) {
    throw "psql restore failed with exit code $LASTEXITCODE"
  }

  Write-LauncherLog -Paths $paths -Name $logName -Message "Restore completed from: $BackupFile"
  Write-Host "Restore completed successfully from: $BackupFile"
} catch {
  Write-LauncherLog -Paths $paths -Name $logName -Message ("Restore failed: " + $_.Exception.Message)
  Write-Error $_.Exception.Message
  exit 1
}
