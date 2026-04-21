Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/Common.ps1"

$paths = Get-PathMap

function Show-FileTail([string]$FilePath, [int]$Lines = 20) {
  if (Test-Path $FilePath) {
    Write-Host "--- tail: $FilePath ---"
    Get-Content -Path $FilePath -Tail $Lines
  } else {
    Write-Host "--- missing: $FilePath ---"
  }
}

try {
  $envFile = Ensure-EnvFile -Paths $paths
  $envMap = Get-EnvMap -EnvFile $envFile

  Write-Host '=== ZS Portable Diagnostics ==='
  Write-Host ("Root: {0}" -f $paths.Root)
  Write-Host ("Env: {0}" -f $envFile)
  Write-Host ("Postgres bin: {0}" -f $paths.PostgresBinDir)
  Write-Host ("Backend: {0}" -f $paths.AppBackendDir)
  Write-Host ("Frontend: {0}" -f $paths.AppFrontendDir)

  foreach ($name in @('backend', 'frontend')) {
    $trackedProcessId = Read-PidFile -Paths $paths -Name $name
    if ($null -eq $trackedProcessId) {
      Write-Host ("PID {0}: not found" -f $name)
      continue
    }

    $alive = Test-ProcessAlive -ProcessId $trackedProcessId
    Write-Host ("PID {0}: {1} (alive={2})" -f $name, $trackedProcessId, $alive)
  }

  $dbPort = Get-EnvValue -EnvMap $envMap -Key 'DB_PORT' -Default '5432'
  $dbUser = Get-EnvValue -EnvMap $envMap -Key 'DB_USER' -Default 'postgres'
  $pgIsReady = Join-Path $paths.PostgresBinDir 'pg_isready.exe'
  if (Test-Path $pgIsReady) {
    & $pgIsReady -h 127.0.0.1 -p $dbPort -U $dbUser -d postgres
    Write-Host ("pg_isready exit code: {0}" -f $LASTEXITCODE)
  } else {
    Write-Host ("pg_isready missing: {0}" -f $pgIsReady)
  }

  Show-FileTail -FilePath (Join-Path $paths.RuntimeLogsDir 'launcher-start.log')
  Show-FileTail -FilePath (Join-Path $paths.RuntimeLogsDir 'launcher-stop.log')
  Show-FileTail -FilePath (Join-Path $paths.RuntimeLogsDir 'launcher-backup.log')
  Show-FileTail -FilePath (Join-Path $paths.RuntimeLogsDir 'launcher-restore.log')
  Show-FileTail -FilePath (Join-Path $paths.RuntimeLogsDir 'postgresql.log')
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
