Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

function Get-LogDir {
  $base = Join-Path $env:ProgramData 'ZS\logs'
  if (-not (Test-Path $base)) {
    New-Item -ItemType Directory -Path $base -Force | Out-Null
  }
  return $base
}

function Write-LauncherLog {
  param(
    [Parameter(Mandatory = $true)][string]$FileName,
    [Parameter(Mandatory = $true)][string]$Message
  )

  $logFile = Join-Path (Get-LogDir) $FileName
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -Path $logFile -Value $line
}

function Ensure-OfflineEnvFile {
  param([Parameter(Mandatory = $true)][string]$RootDir)

  $envFile = Join-Path $RootDir '.env.offline'
  $exampleFile = Join-Path $RootDir '.env.offline.example'

  if (-not (Test-Path $envFile)) {
    if (-not (Test-Path $exampleFile)) {
      throw ".env.offline and .env.offline.example are missing."
    }
    Copy-Item -Path $exampleFile -Destination $envFile
  }

  return $envFile
}

function Assert-OfflineMode {
  param([Parameter(Mandatory = $true)][string]$EnvFile)

  $modeLine = Select-String -Path $EnvFile -Pattern '^APP_MODE=' -SimpleMatch:$false | Select-Object -First 1
  if (-not $modeLine) {
    throw "APP_MODE is missing in $EnvFile. Expected APP_MODE=offline."
  }

  $value = (($modeLine.Line -split '=', 2)[1]).Trim()
  if ($value -ne 'offline') {
    throw "APP_MODE must be offline in $EnvFile. Found: $value"
  }
}

function Assert-DockerCli {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker CLI is not installed or not in PATH."
  }
}

function Start-DockerDesktopIfNeeded {
  try {
    docker info | Out-Null
    return
  } catch {
    # continue to start docker desktop
  }

  $paths = @(
    "$Env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
    "$Env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
  )

  $dockerDesktop = $paths | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($dockerDesktop) {
    Start-Process -FilePath $dockerDesktop | Out-Null
  }
}

function Wait-DockerReady {
  param([int]$TimeoutSeconds = 120)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      docker info | Out-Null
      return
    } catch {
      Start-Sleep -Seconds 3
    }
  }

  throw "Docker engine did not become ready within $TimeoutSeconds seconds."
}
