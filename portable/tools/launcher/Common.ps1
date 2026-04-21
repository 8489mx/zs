Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-PortableRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

function Get-PathMap {
  $root = Get-PortableRoot
  return [ordered]@{
    Root             = $root
    ConfigDir        = Join-Path $root 'config'
    EnvTemplateFile  = Join-Path $root 'config/.env.offline.template'
    EnvFile          = Join-Path $root 'config/.env.offline'
    RuntimeDir       = Join-Path $root 'runtime'
    RuntimeRunDir    = Join-Path $root 'runtime/run'
    RuntimeDataDir   = Join-Path $root 'runtime/data'
    RuntimeLogsDir   = Join-Path $root 'runtime/logs'
    PostgresBinDir   = Join-Path $root 'runtime/postgres/bin'
    AppBackendDir    = Join-Path $root 'app/backend'
    AppFrontendDir   = Join-Path $root 'app/frontend'
    LauncherDir      = Join-Path $root 'tools/launcher'
    BackendEntryFile = Join-Path $root 'app/backend/dist/main.js'
    FrontendEntry    = Join-Path $root 'app/frontend/index.html'
  }
}

function Ensure-Directory([string]$Path) {
  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Ensure-EnvFile([hashtable]$Paths) {
  if (-not (Test-Path $Paths.EnvFile)) {
    if (-not (Test-Path $Paths.EnvTemplateFile)) {
      throw "Missing env template file: $($Paths.EnvTemplateFile)"
    }

    Ensure-Directory -Path $Paths.ConfigDir
    Copy-Item -Path $Paths.EnvTemplateFile -Destination $Paths.EnvFile -Force
  }

  return $Paths.EnvFile
}

function Get-EnvMap([string]$EnvFile) {
  $map = @{}

  foreach ($line in [System.IO.File]::ReadAllLines($EnvFile)) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) {
      continue
    }

    $parts = $trimmed -split '=', 2
    if ($parts.Count -ne 2) {
      continue
    }

    $key = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"')
    $map[$key] = $value
  }

  return $map
}

function Get-EnvValue([hashtable]$EnvMap, [string]$Key, [string]$Default = '') {
  if ($EnvMap.ContainsKey($Key) -and $EnvMap[$Key]) {
    return $EnvMap[$Key]
  }

  return $Default
}

function Export-EnvMap([hashtable]$EnvMap) {
  foreach ($item in $EnvMap.GetEnumerator()) {
    Set-Item -Path ("Env:{0}" -f $item.Key) -Value $item.Value
  }
}

function Write-LauncherLog([hashtable]$Paths, [string]$Name, [string]$Message) {
  Ensure-Directory -Path $Paths.RuntimeLogsDir
  $logFile = Join-Path $Paths.RuntimeLogsDir $Name
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -Path $logFile -Value $line
}

function Assert-PostgresRuntime([hashtable]$Paths) {
  $required = @('postgres.exe', 'pg_ctl.exe', 'pg_isready.exe', 'createdb.exe', 'psql.exe', 'initdb.exe')
  foreach ($exe in $required) {
    $full = Join-Path $Paths.PostgresBinDir $exe
    if (-not (Test-Path $full)) {
      throw "PostgreSQL runtime binary missing: $full"
    }
  }
}

function Assert-BackendArtifacts([hashtable]$Paths, [hashtable]$EnvMap) {
  $backendEntry = Get-EnvValue -EnvMap $EnvMap -Key 'BACKEND_ENTRY' -Default 'dist/main.js'
  $backendEntryPath = Join-Path $Paths.AppBackendDir $backendEntry
  if (-not (Test-Path $backendEntryPath)) {
    throw "Backend entry not found: $backendEntryPath"
  }
}

function Assert-FrontendArtifacts([hashtable]$Paths) {
  if (-not (Test-Path $Paths.FrontendEntry)) {
    throw "Frontend entry not found: $($Paths.FrontendEntry)"
  }
}

function Wait-PostgresReady([hashtable]$Paths, [hashtable]$EnvMap, [int]$TimeoutSeconds = 45) {
  $pgIsReady = Join-Path $Paths.PostgresBinDir 'pg_isready.exe'
  $dbPort = Get-EnvValue -EnvMap $EnvMap -Key 'DB_PORT' -Default '5432'
  $dbUser = Get-EnvValue -EnvMap $EnvMap -Key 'DB_USER' -Default 'postgres'

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $null = & $pgIsReady -h 127.0.0.1 -p $dbPort -U $dbUser -d postgres
    if ($LASTEXITCODE -eq 0) {
      return
    }

    Start-Sleep -Milliseconds 700
  }

  throw 'PostgreSQL did not become ready within timeout.'
}

function Write-PidFile([hashtable]$Paths, [string]$Name, [int]$Pid) {
  Ensure-Directory -Path $Paths.RuntimeRunDir
  $pidFile = Join-Path $Paths.RuntimeRunDir ("{0}.pid" -f $Name)
  Set-Content -Path $pidFile -Value $Pid -Encoding ascii
}

function Read-PidFile([hashtable]$Paths, [string]$Name) {
  $pidFile = Join-Path $Paths.RuntimeRunDir ("{0}.pid" -f $Name)
  if (-not (Test-Path $pidFile)) {
    return $null
  }

  $raw = (Get-Content -Path $pidFile -Raw).Trim()
  if (-not $raw) {
    return $null
  }

  return [int]$raw
}

function Remove-PidFile([hashtable]$Paths, [string]$Name) {
  $pidFile = Join-Path $Paths.RuntimeRunDir ("{0}.pid" -f $Name)
  if (Test-Path $pidFile) {
    Remove-Item -Path $pidFile -Force
  }
}

function Test-ProcessAlive([int]$Pid) {
  try {
    $p = Get-Process -Id $Pid -ErrorAction Stop
    return $null -ne $p
  } catch {
    return $false
  }
}

function Start-ProcessHiddenTracked {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [string[]]$Arguments = @(),
    [Parameter(Mandatory = $true)][hashtable]$Paths,
    [Parameter(Mandatory = $true)][string]$Name
  )

  $process = Start-Process -FilePath $FilePath `
    -WorkingDirectory $WorkingDirectory `
    -ArgumentList $Arguments `
    -WindowStyle Hidden `
    -PassThru

  Write-PidFile -Paths $Paths -Name $Name -Pid $process.Id
  return $process
}

function Invoke-BootstrapCommand([string]$Command, [string]$WorkingDirectory) {
  if (-not $Command) {
    return
  }

  Push-Location $WorkingDirectory
  try {
    & cmd.exe /c $Command
    if ($LASTEXITCODE -ne 0) {
      throw "Bootstrap command failed ($LASTEXITCODE): $Command"
    }
  } finally {
    Pop-Location
  }
}
