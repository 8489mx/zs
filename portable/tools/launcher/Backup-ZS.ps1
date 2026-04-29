Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/Common.ps1"

$paths = Get-PathMap
$logName = 'launcher-backup.log'

try {
  $envFile = Ensure-EnvFile -Paths $paths
  $envMap = Get-EnvMap -EnvFile $envFile

  Assert-PostgresRuntime -Paths $paths

  $dbPort = Get-EnvValue -EnvMap $envMap -Key 'DB_PORT' -Default '5432'
  $dbUser = Get-EnvValue -EnvMap $envMap -Key 'DB_USER' -Default 'postgres'
  $dbPass = Get-EnvValue -EnvMap $envMap -Key 'DB_PASSWORD' -Default 'postgres'
  $dbName = Get-EnvValue -EnvMap $envMap -Key 'DB_NAME' -Default 'zs_offline'

  $pgDump = Join-Path $paths.PostgresBinDir 'pg_dump.exe'
  if (-not (Test-Path $pgDump)) {
    throw "PostgreSQL runtime binary missing: $pgDump"
  }

  $backupDir = Join-Path $paths.Root 'backups'
  Ensure-Directory -Path $backupDir

  $fileName = 'zs-backup-{0}.sql' -f (Get-Date -Format 'yyyyMMdd-HHmmss')
  $backupFile = Join-Path $backupDir $fileName

  $env:PGPASSWORD = $dbPass
  & $pgDump -h 127.0.0.1 -p $dbPort -U $dbUser -d $dbName -f $backupFile
  if ($LASTEXITCODE -ne 0) {
    throw "pg_dump failed with exit code $LASTEXITCODE"
  }

  Write-LauncherLog -Paths $paths -Name $logName -Message "Backup created: $backupFile"
  Write-Host "Backup created successfully: $backupFile"
} catch {
  Write-LauncherLog -Paths $paths -Name $logName -Message ("Backup failed: " + $_.Exception.Message)
  Write-Error $_.Exception.Message
  exit 1
}
