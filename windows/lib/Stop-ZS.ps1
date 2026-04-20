Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\Common.ps1"

$root = Get-RepoRoot
$logFile = 'launcher-stop.log'

try {
  Write-LauncherLog -FileName $logFile -Message 'Stop launcher initiated.'
  Assert-DockerCli

  Push-Location $root
  try {
    if (Test-Path '.env.offline') {
      docker compose --env-file .env.offline -f docker-compose.offline.yml down
    } else {
      docker compose -f docker-compose.offline.yml down
    }
  } finally {
    Pop-Location
  }

  Write-LauncherLog -FileName $logFile -Message 'Offline stack stopped successfully.'
  Write-Host 'ZS stopped successfully.'
} catch {
  Write-LauncherLog -FileName $logFile -Message ("Stop launcher failed: " + $_.Exception.Message)
  Write-Error $_.Exception.Message
  exit 1
}
