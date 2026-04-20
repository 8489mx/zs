Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\Common.ps1"

$root = Get-RepoRoot
$logFile = 'launcher-start.log'

try {
  Write-LauncherLog -FileName $logFile -Message 'Start launcher initiated.'
  $envFile = Ensure-OfflineEnvFile -RootDir $root
  Assert-OfflineMode -EnvFile $envFile
  Assert-DockerCli
  Start-DockerDesktopIfNeeded
  Wait-DockerReady -TimeoutSeconds 120
  $appUrl = Get-OfflineAppUrl -EnvFile $envFile

  Write-LauncherLog -FileName $logFile -Message 'Running docker compose up for offline stack.'
  Push-Location $root
  try {
    docker compose --env-file .env.offline -f docker-compose.offline.yml up -d
  } finally {
    Pop-Location
  }

  $healthUrl = "$appUrl/health/ready"
  $ready = $false
  for ($i = 0; $i -lt 40; $i++) {
    try {
      $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        $ready = $true
        break
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  if (-not $ready) {
    throw "Service health check failed at $healthUrl"
  }

  Start-Process $appUrl
  Write-LauncherLog -FileName $logFile -Message 'Offline stack started successfully and browser opened.'
  Write-Host "ZS started successfully at $appUrl"
} catch {
  Write-LauncherLog -FileName $logFile -Message ("Start launcher failed: " + $_.Exception.Message)
  Write-Error $_.Exception.Message
  exit 1
}
