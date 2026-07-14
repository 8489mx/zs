$ErrorActionPreference = 'Stop'

try {
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

function Save-PidFile([string] $Path, [int] $ProcessId) {
  Set-Content -LiteralPath $Path -Value $ProcessId -Encoding ascii
}

function Get-ListenerByPort([int] $Port, [string] $RepoRootNormalized, [string] $DataDirNormalized, [string] $RuntimeDirNormalized) {
  $connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
  if (-not $connections) {
    return $null
  }

  foreach ($connection in $connections) {
    $processDetails = Get-ProcessDetails -ProcessId $connection.OwningProcess
    $ownedByRepo = Test-RepoOwnedProcess -ProcessDetails $processDetails -RepoRootNormalized $RepoRootNormalized
    $isDevPostgres = Test-DevPostgresProcess -ProcessDetails $processDetails -DataDirNormalized $DataDirNormalized -RuntimeDirNormalized $RuntimeDirNormalized
    return [PSCustomObject]@{
      Port = $Port
      ProcessId = $connection.OwningProcess
      ProcessName = [string] $processDetails.Name
      CommandLine = [string] $processDetails.CommandLine
      OwnedByRepo = $ownedByRepo
      IsDevPostgres = $isDevPostgres
    }
  }

  return $null
}

function Ensure-DevEnvFile([string] $TargetFile, [string] $TemplateFile, [string] $AutoMarker) {
  if (Test-Path $TargetFile) {
    return $false
  }

  if (-not (Test-Path $TemplateFile)) {
    throw "Missing development env template: $TemplateFile"
  }

  $templateContent = Get-Content -Raw -LiteralPath $TemplateFile
  $newContent = "# $AutoMarker`r`n$templateContent"
  Set-Content -LiteralPath $TargetFile -Value $newContent -Encoding ascii
  Write-Host "Created: $TargetFile"
  return $true
}

function Get-EnvValue([string] $FilePath, [string] $Name) {
  if (-not (Test-Path $FilePath)) {
    return ''
  }

  $pattern = "^\s*$([regex]::Escape($Name))\s*=\s*(.*)$"
  foreach ($line in Get-Content -LiteralPath $FilePath) {
    if ($line -match $pattern) {
      $rawValue = $Matches[1].Trim()
      if (($rawValue.StartsWith('"') -and $rawValue.EndsWith('"')) -or ($rawValue.StartsWith("'") -and $rawValue.EndsWith("'"))) {
        $rawValue = $rawValue.Substring(1, $rawValue.Length - 2)
      }
      return $rawValue.Trim()
    }
  }

  return ''
}

function Set-EnvValue([string] $FilePath, [string] $Name, [string] $Value) {
  $pattern = "^\s*$([regex]::Escape($Name))\s*="
  $updated = $false
  $lines = @()

  foreach ($line in Get-Content -LiteralPath $FilePath) {
    if ($line -match $pattern) {
      $lines += "$Name=$Value"
      $updated = $true
    } else {
      $lines += $line
    }
  }

  if (-not $updated) {
    $lines += "$Name=$Value"
  }

  Set-Content -LiteralPath $FilePath -Value $lines -Encoding ascii
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

  $message = @(
    'PostgreSQL binaries were not found for development mode.',
    'Set POSTGRES_BIN to a folder that contains:',
    'postgres.exe, pg_ctl.exe, initdb.exe, pg_isready.exe, createdb.exe, psql.exe',
    'Example:',
    '  set POSTGRES_BIN=C:\Program Files\PostgreSQL\18\bin'
  ) -join [Environment]::NewLine
  throw $message
}

function Wait-ForPostgresReady([string] $PgIsReadyExe, [int] $Port, [string] $Username, [int] $MaxAttempts) {
  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    & $PgIsReadyExe -h '127.0.0.1' -p $Port -U $Username | Out-Null
    if ($LASTEXITCODE -eq 0) {
      return
    }

    Start-Sleep -Seconds 1
  }

  throw "PostgreSQL did not become ready on 127.0.0.1:$Port"
}

function Ensure-DevDatabase([string] $PsqlExe, [string] $CreatedbExe, [int] $Port, [string] $Username, [string] $DatabaseName) {
  $existsSql = "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName';"

  $existsOutput = @(& $PsqlExe -h '127.0.0.1' -p $Port -U $Username -d postgres -tAc $existsSql 2>$null)
  $existsExitCode = $LASTEXITCODE
  $existsText = (($existsOutput | Where-Object { $null -ne $_ }) -join "`n").Trim()

  if ($existsExitCode -eq 0 -and $existsText -eq '1') {
    Write-Host "Development database '$DatabaseName' already exists."
    return
  }

  if ($existsExitCode -ne 0) {
    Write-Warning "Could not confirm whether development database '$DatabaseName' exists. Attempting safe create."
  }

  Write-Host "Creating development database '$DatabaseName' if missing ..."
  $createOutput = @(& $CreatedbExe -h '127.0.0.1' -p $Port -U $Username $DatabaseName 2>&1)
  $createExitCode = $LASTEXITCODE
  $createText = (($createOutput | Where-Object { $null -ne $_ }) -join "`n").Trim()

  if ($createExitCode -ne 0) {
    if ($createText -match 'already exists') {
      Write-Host "Development database '$DatabaseName' already exists."
      return
    }

    throw "Failed to create development database '$DatabaseName'. $createText"
  }
}

$repoRoot = Resolve-RepoRoot
$repoRootNormalized = Normalize-PathText $repoRoot
$stateDir = Join-Path $PSScriptRoot '.state'
$runtimeDir = Join-Path $PSScriptRoot '.runtime'
$runtimeRunDir = Join-Path $runtimeDir 'run'
$runtimeLogsDir = Join-Path $runtimeDir 'logs'
$postgresDataDir = Join-Path $runtimeDir 'postgres-data'
$postgresLogFile = Join-Path $runtimeLogsDir 'postgres-dev.log'
$pwFile = Join-Path $runtimeRunDir 'postgres-password.txt'
$backendPidFile = Join-Path $stateDir 'backend.pid'
$frontendPidFile = Join-Path $stateDir 'frontend.pid'
$backendRunner = Join-Path $PSScriptRoot 'Run-Backend-Dev.ps1'
$frontendRunner = Join-Path $PSScriptRoot 'Run-Frontend-Dev.ps1'
$backendEnvFile = Join-Path $repoRoot 'backend\.env.development'
$backendEnvTemplate = Join-Path $repoRoot 'backend\.env.development.example'
$frontendEnvFile = Join-Path $repoRoot 'frontend\.env.development'
$frontendEnvTemplate = Join-Path $repoRoot 'frontend\.env.development.example'
$backendEnvAutoMarker = 'AUTO_CREATED_BY_DEV_START=1'
$frontendEnvAutoMarker = 'AUTO_CREATED_BY_DEV_START=1'
$backendPort = 3101
$frontendPort = 5173
$postgresPort = 5433
$postgresUser = 'postgres'
$postgresPassword = 'postgres'
$devDatabaseName = 'zs_dev'
$runtimeDirNormalized = Normalize-PathText $runtimeDir
$postgresDataDirNormalized = Normalize-PathText $postgresDataDir

New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
New-Item -ItemType Directory -Path $runtimeRunDir -Force | Out-Null
New-Item -ItemType Directory -Path $runtimeLogsDir -Force | Out-Null
New-Item -ItemType Directory -Path $postgresDataDir -Force | Out-Null

[void](Ensure-DevEnvFile -TargetFile $backendEnvFile -TemplateFile $backendEnvTemplate -AutoMarker $backendEnvAutoMarker)
[void](Ensure-DevEnvFile -TargetFile $frontendEnvFile -TemplateFile $frontendEnvTemplate -AutoMarker $frontendEnvAutoMarker)

$backendEnvPort = Get-EnvValue -FilePath $backendEnvFile -Name 'DATABASE_PORT'
$backendEnvHost = Get-EnvValue -FilePath $backendEnvFile -Name 'DATABASE_HOST'
$backendEnvIsAuto = Select-String -LiteralPath $backendEnvFile -Pattern $backendEnvAutoMarker -SimpleMatch -Quiet

if ($backendEnvPort -eq '5432') {
  Set-EnvValue -FilePath $backendEnvFile -Name 'DATABASE_PORT' -Value '5433'
  if ($backendEnvHost -eq 'localhost') {
    Set-EnvValue -FilePath $backendEnvFile -Name 'DATABASE_HOST' -Value '127.0.0.1'
  }
  Write-Warning "Auto-fixed backend/.env.development to DATABASE_PORT=5433 and DATABASE_HOST=127.0.0.1 for isolated dev postgres."
}

$postgresBinDir = Resolve-PostgresBinDir -RepoRoot $repoRoot
$pgCtlExe = Join-Path $postgresBinDir 'pg_ctl.exe'
$initDbExe = Join-Path $postgresBinDir 'initdb.exe'
$pgIsReadyExe = Join-Path $postgresBinDir 'pg_isready.exe'
$createdbExe = Join-Path $postgresBinDir 'createdb.exe'
$psqlExe = Join-Path $postgresBinDir 'psql.exe'

Write-Host "Using PostgreSQL binaries from: $postgresBinDir"

$postgresPortOwner = Get-ListenerByPort `
  -Port $postgresPort `
  -RepoRootNormalized $repoRootNormalized `
  -DataDirNormalized $postgresDataDirNormalized `
  -RuntimeDirNormalized $runtimeDirNormalized

if ($postgresPortOwner -and -not $postgresPortOwner.IsDevPostgres) {
  throw "Port $postgresPort is already in use by PID $($postgresPortOwner.ProcessId) ($($postgresPortOwner.ProcessName)). It is not this dev postgres instance."
}

$backendListener = Get-ListenerByPort `
  -Port $backendPort `
  -RepoRootNormalized $repoRootNormalized `
  -DataDirNormalized $postgresDataDirNormalized `
  -RuntimeDirNormalized $runtimeDirNormalized
if ($backendListener -and -not $backendListener.OwnedByRepo) {
  throw "Port $backendPort is already in use by PID $($backendListener.ProcessId) outside this repository."
}

$frontendListener = Get-ListenerByPort `
  -Port $frontendPort `
  -RepoRootNormalized $repoRootNormalized `
  -DataDirNormalized $postgresDataDirNormalized `
  -RuntimeDirNormalized $runtimeDirNormalized
if ($frontendListener -and -not $frontendListener.OwnedByRepo) {
  throw "Port $frontendPort is already in use by PID $($frontendListener.ProcessId) outside this repository."
}

if (-not (Test-Path (Join-Path $postgresDataDir 'PG_VERSION'))) {
  Write-Host 'Initializing development PostgreSQL data directory ...'
  Set-Content -LiteralPath $pwFile -Value $postgresPassword -Encoding ascii
  try {
    & $initDbExe -D $postgresDataDir -U $postgresUser -A scram-sha-256 --pwfile=$pwFile -E UTF8
    if ($LASTEXITCODE -ne 0) {
      throw 'initdb failed.'
    }
  } finally {
    Remove-Item -LiteralPath $pwFile -Force -ErrorAction SilentlyContinue
  }
}

$pgCtlStatus = & $pgCtlExe -D $postgresDataDir status 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Development PostgreSQL is already running on port $postgresPort."
} else {
  Write-Host "Starting development PostgreSQL on 127.0.0.1:$postgresPort ..."
  & $pgCtlExe -D $postgresDataDir -l $postgresLogFile -o "-h 127.0.0.1 -p $postgresPort" start
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to start development PostgreSQL. See log: $postgresLogFile"
  }
}

$env:PGPASSWORD = $postgresPassword
Wait-ForPostgresReady -PgIsReadyExe $pgIsReadyExe -Port $postgresPort -Username $postgresUser -MaxAttempts 30
Ensure-DevDatabase -PsqlExe $psqlExe -CreatedbExe $createdbExe -Port $postgresPort -Username $postgresUser -DatabaseName $devDatabaseName

if (-not $backendListener) {
  $backendProcess = Start-Process -FilePath 'powershell.exe' `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $backendRunner) `
    -WorkingDirectory $repoRoot `
    -PassThru
  Save-PidFile -Path $backendPidFile -ProcessId $backendProcess.Id
  Write-Host "Backend dev process started (PID $($backendProcess.Id)) on http://localhost:$backendPort"
} else {
  Save-PidFile -Path $backendPidFile -ProcessId $backendListener.ProcessId
  Write-Host "Backend already running for this repo (PID $($backendListener.ProcessId)) on http://localhost:$backendPort"
}

if (-not $frontendListener) {
  $frontendProcess = Start-Process -FilePath 'powershell.exe' `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $frontendRunner) `
    -WorkingDirectory $repoRoot `
    -PassThru
  Save-PidFile -Path $frontendPidFile -ProcessId $frontendProcess.Id
  Write-Host "Frontend dev process started (PID $($frontendProcess.Id)) on http://localhost:$frontendPort"
} else {
  Save-PidFile -Path $frontendPidFile -ProcessId $frontendListener.ProcessId
  Write-Host "Frontend already running for this repo (PID $($frontendListener.ProcessId)) on http://localhost:$frontendPort"
}

Write-Host ''
Write-Host 'Development mode is running:'
Write-Host '  Frontend: http://localhost:5173'
Write-Host '  Backend : http://localhost:3101'
Write-Host '  PostgreSQL: 127.0.0.1:5433 (data: scripts/dev/.runtime/postgres-data)'
Write-Host ''
Write-Host 'Use scripts\dev\Stop-Dev-ZS.bat to stop only this repo dev workflow.'

} catch {
  Write-Host ""
  Write-Host "An error occurred during startup!" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Press Enter to exit..."
  Read-Host | Out-Null
  exit 1
}
