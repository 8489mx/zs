Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/Common.ps1"

$paths = Get-PathMap
$logName = 'launcher-stop.log'

try {
  $envFile = Ensure-EnvFile -Paths $paths
  $envMap = Get-EnvMap -EnvFile $envFile
  $dbPort = Get-EnvValue -EnvMap $envMap -Key 'DB_PORT' -Default '5432'

  foreach ($name in @('frontend', 'backend')) {
    $trackedProcessId = Read-PidFile -Paths $paths -Name $name
    if ($null -ne $trackedProcessId) {
      try {
        Stop-Process -Id $trackedProcessId -Force -ErrorAction Stop
        Write-LauncherLog -Paths $paths -Name $logName -Message "Stopped $name process (PID $trackedProcessId)."
      } catch {
        Write-LauncherLog -Paths $paths -Name $logName -Message "$name process already stopped or inaccessible (PID $trackedProcessId)."
      }

      Remove-PidFile -Paths $paths -Name $name
    }
  }

  $pgCtl = Join-Path $paths.PostgresBinDir 'pg_ctl.exe'
  if (Test-Path $pgCtl) {
    & $pgCtl -D $paths.RuntimeDataDir -o "-p $dbPort -h 127.0.0.1" stop
    if ($LASTEXITCODE -eq 0) {
      Write-LauncherLog -Paths $paths -Name $logName -Message 'PostgreSQL stopped successfully.'
    } else {
      Write-LauncherLog -Paths $paths -Name $logName -Message "PostgreSQL stop returned exit code $LASTEXITCODE."
    }
  } else {
    Write-LauncherLog -Paths $paths -Name $logName -Message 'pg_ctl.exe not found; skipping PostgreSQL stop.'
  }

  Write-Host 'ZS portable stopped.'
} catch {
  Write-LauncherLog -Paths $paths -Name $logName -Message ("Stop failed: " + $_.Exception.Message)
  Write-Error $_.Exception.Message
  exit 1
}
