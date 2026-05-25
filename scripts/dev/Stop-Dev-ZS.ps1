$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

function Normalize-PathText([string] $value) {
  if ([string]::IsNullOrWhiteSpace($value)) {
    return ''
  }

  return $value.Replace('/', '\').ToLowerInvariant()
}

function Get-ProcessDetails([int] $ProcessId) {
  return Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
}

function Test-RepoOwnedProcess($ProcessDetails, [string] $RepoRootNormalized) {
  if ($null -eq $ProcessDetails) {
    return $false
  }

  $executablePath = Normalize-PathText([string] $ProcessDetails.ExecutablePath)
  $commandLine = Normalize-PathText([string] $ProcessDetails.CommandLine)
  return $executablePath.Contains($RepoRootNormalized) -or $commandLine.Contains($RepoRootNormalized)
}

function Test-DevPostgresProcess($ProcessDetails, [string] $DataDirNormalized, [string] $RuntimeDirNormalized) {
  if ($null -eq $ProcessDetails) {
    return $false
  }

  $commandLine = Normalize-PathText([string] $ProcessDetails.CommandLine)
  return $commandLine.Contains($DataDirNormalized) -or $commandLine.Contains($RuntimeDirNormalized)
}

function Stop-ProcessGracefully([int] $ProcessId, [string] $Reason, [string] $RepoRootNormalized) {
  $processDetails = Get-ProcessDetails -ProcessId $ProcessId
  if ($null -eq $processDetails) {
    return $false
  }

  if (-not (Test-RepoOwnedProcess -ProcessDetails $processDetails -RepoRootNormalized $RepoRootNormalized)) {
    Write-Warning "Skipped PID $ProcessId ($($processDetails.Name)) because it does not belong to this repository."
    return $false
  }

  Write-Host "Stopping PID $ProcessId ($($processDetails.Name)) - $Reason"
  Stop-Process -Id $ProcessId -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1

  if (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) {
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  }

  return -not [bool](Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}

function Get-ListenerByPort([int] $Port, [string] $RepoRootNormalized, [string] $DataDirNormalized, [string] $RuntimeDirNormalized) {
  $connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
  if (-not $connections) {
    return $null
  }

  foreach ($connection in $connections) {
    $processDetails = Get-ProcessDetails -ProcessId $connection.OwningProcess
    return [PSCustomObject]@{
      Port = $Port
      ProcessId = $connection.OwningProcess
      ProcessName = [string] $processDetails.Name
      CommandLine = [string] $processDetails.CommandLine
      OwnedByRepo = Test-RepoOwnedProcess -ProcessDetails $processDetails -RepoRootNormalized $RepoRootNormalized
      IsDevPostgres = Test-DevPostgresProcess -ProcessDetails $processDetails -DataDirNormalized $DataDirNormalized -RuntimeDirNormalized $RuntimeDirNormalized
    }
  }

  return $null
}

function Resolve-PostgresBinDir([string] $RepoRoot) {
  $requiredExeNames = @('postgres.exe', 'pg_ctl.exe', 'initdb.exe', 'pg_isready.exe', 'createdb.exe', 'psql.exe')
  $candidateDirs = @()

  if (-not [string]::IsNullOrWhiteSpace($env:POSTGRES_BIN)) {
    $candidateDirs += $env:POSTGRES_BIN
  }

  $candidateDirs += @(
    'C:\Program Files\PostgreSQL\18\bin',
    'C:\Program Files\PostgreSQL\17\bin',
    'C:\Program Files\PostgreSQL\16\bin',
    'C:\Program Files\PostgreSQL\15\bin',
    (Join-Path $RepoRoot 'portable\runtime\postgres\bin')
  )

  $postgresCmd = Get-Command postgres.exe -ErrorAction SilentlyContinue
  if ($postgresCmd -and $postgresCmd.Source) {
    $candidateDirs += (Split-Path -Parent $postgresCmd.Source)
  }

  foreach ($candidateDir in $candidateDirs) {
    if ([string]::IsNullOrWhiteSpace($candidateDir)) {
      continue
    }

    $resolvedDir = Resolve-Path -LiteralPath $candidateDir -ErrorAction SilentlyContinue
    if (-not $resolvedDir) {
      continue
    }

    $binDir = $resolvedDir.Path
    $allFound = $true
    foreach ($exeName in $requiredExeNames) {
      if (-not (Test-Path (Join-Path $binDir $exeName))) {
        $allFound = $false
        break
      }
    }

    if ($allFound) {
      return $binDir
    }
  }

  return ''
}

$repoRoot = Resolve-RepoRoot
$repoRootNormalized = Normalize-PathText $repoRoot
$stateDir = Join-Path $PSScriptRoot '.state'
$runtimeDir = Join-Path $PSScriptRoot '.runtime'
$runtimeDirNormalized = Normalize-PathText $runtimeDir
$postgresDataDir = Join-Path $runtimeDir 'postgres-data'
$postgresDataDirNormalized = Normalize-PathText $postgresDataDir
$postgresPort = 5433

$pidFiles = @(
  (Join-Path $stateDir 'backend.pid')
  (Join-Path $stateDir 'frontend.pid')
)

foreach ($pidFile in $pidFiles) {
  if (-not (Test-Path $pidFile)) {
    continue
  }

  $rawProcessId = [string](Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  $rawProcessId = $rawProcessId.Trim()
  if ($rawProcessId -match '^\d+$') {
    [void](Stop-ProcessGracefully -ProcessId ([int] $rawProcessId) -Reason "tracked PID file $([IO.Path]::GetFileName($pidFile))" -RepoRootNormalized $repoRootNormalized)
  }
}

if (Test-Path (Join-Path $postgresDataDir 'PG_VERSION')) {
  $postgresBinDir = Resolve-PostgresBinDir -RepoRoot $repoRoot
  if ($postgresBinDir) {
    $pgCtlExe = Join-Path $postgresBinDir 'pg_ctl.exe'
    & $pgCtlExe -D $postgresDataDir status 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-Host 'Stopping development PostgreSQL instance ...'
      & $pgCtlExe -D $postgresDataDir stop -m fast
      Start-Sleep -Seconds 1
    }
  }
}

$ports = @(3101, 5173, 5433)
foreach ($port in $ports) {
  $owner = Get-ListenerByPort `
    -Port $port `
    -RepoRootNormalized $repoRootNormalized `
    -DataDirNormalized $postgresDataDirNormalized `
    -RuntimeDirNormalized $runtimeDirNormalized

  if ($null -eq $owner) {
    continue
  }

  if ($port -eq $postgresPort) {
    if ($owner.IsDevPostgres) {
      [void](Stop-ProcessGracefully -ProcessId $owner.ProcessId -Reason 'development postgres fallback stop' -RepoRootNormalized $repoRootNormalized)
    } else {
      Write-Warning "Port 5433 is used by PID $($owner.ProcessId) ($($owner.ProcessName)) outside this dev runtime. It was not stopped."
    }
    continue
  }

  if ($owner.OwnedByRepo) {
    [void](Stop-ProcessGracefully -ProcessId $owner.ProcessId -Reason "listening on dev port $port" -RepoRootNormalized $repoRootNormalized)
  } else {
    Write-Warning "Port $port is used by PID $($owner.ProcessId) ($($owner.ProcessName)) outside this repository. It was not stopped."
  }
}

foreach ($pidFile in $pidFiles) {
  if (Test-Path $pidFile) {
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
  }
}

Write-Host 'Development mode stop completed for this repository.'

