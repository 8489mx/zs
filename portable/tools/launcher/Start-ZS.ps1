Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/Common.ps1"

$paths = Get-PathMap
$logName = 'launcher-start.log'

try {
  Ensure-Directory -Path $paths.RuntimeRunDir
  Ensure-Directory -Path $paths.RuntimeDataDir
  Ensure-Directory -Path $paths.RuntimeLogsDir

  $envFile = Ensure-EnvFile -Paths $paths
  $envMap = Get-EnvMap -EnvFile $envFile

  $appMode = Get-EnvValue -EnvMap $envMap -Key 'APP_MODE' -Default 'offline'
  if ($appMode -ne 'offline') {
    throw "APP_MODE must be offline. Found: $appMode"
  }

  Assert-PostgresRuntime -Paths $paths
  Assert-BackendArtifacts -Paths $paths -EnvMap $envMap
  Assert-FrontendArtifacts -Paths $paths

  Export-EnvMap -EnvMap $envMap

  $dbUser = Get-EnvValue -EnvMap $envMap -Key 'DB_USER' -Default 'postgres'
  $dbPass = Get-EnvValue -EnvMap $envMap -Key 'DB_PASSWORD' -Default 'postgres'
  $dbName = Get-EnvValue -EnvMap $envMap -Key 'DB_NAME' -Default 'zs_offline'
  $dbPort = Get-EnvValue -EnvMap $envMap -Key 'DB_PORT' -Default '5432'

  $backendPort = Get-EnvValue -EnvMap $envMap -Key 'BACKEND_PORT' -Default '3001'
  $frontendPort = Get-EnvValue -EnvMap $envMap -Key 'FRONTEND_PORT' -Default '8080'

  $nodeExe = Get-EnvValue -EnvMap $envMap -Key 'NODE_EXE' -Default 'node'
  $npmExe = Get-EnvValue -EnvMap $envMap -Key 'NPM_EXE' -Default 'npm'
  $backendEntry = Get-EnvValue -EnvMap $envMap -Key 'BACKEND_ENTRY' -Default 'dist/main.js'
  $bootstrapCommand = Get-EnvValue -EnvMap $envMap -Key 'BACKEND_BOOTSTRAP_CMD' -Default "$npmExe run migration:run"

  $pgCtl = Join-Path $paths.PostgresBinDir 'pg_ctl.exe'
  $initDb = Join-Path $paths.PostgresBinDir 'initdb.exe'
  $createdb = Join-Path $paths.PostgresBinDir 'createdb.exe'
  $psql = Join-Path $paths.PostgresBinDir 'psql.exe'

  $pgVersionFile = Join-Path $paths.RuntimeDataDir 'PG_VERSION'
  if (-not (Test-Path $pgVersionFile)) {
    Write-LauncherLog -Paths $paths -Name $logName -Message 'Initializing PostgreSQL data directory (first run).'

    $passwordFile = Join-Path $paths.RuntimeRunDir 'postgres.pw'
    Set-Content -Path $passwordFile -Value $dbPass -Encoding ascii

    try {
      & $initDb -D $paths.RuntimeDataDir -U $dbUser -A scram-sha-256 --pwfile=$passwordFile
      if ($LASTEXITCODE -ne 0) {
        throw "initdb failed with exit code $LASTEXITCODE"
      }
    } finally {
      Remove-Item -Path $passwordFile -Force -ErrorAction SilentlyContinue
    }
  }

  Write-LauncherLog -Paths $paths -Name $logName -Message 'Starting PostgreSQL runtime.'
  & $pgCtl -D $paths.RuntimeDataDir -l (Join-Path $paths.RuntimeLogsDir 'postgresql.log') -o "-p $dbPort -h 127.0.0.1" start
  if ($LASTEXITCODE -ne 0) {
    throw "pg_ctl start failed with exit code $LASTEXITCODE"
  }

  Wait-PostgresReady -Paths $paths -EnvMap $envMap -TimeoutSeconds 45

  $env:PGPASSWORD = $dbPass
  $psqlOutput = & $psql -h 127.0.0.1 -p $dbPort -U $dbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$dbName';" 2>&1
  $psqlExitCode = $LASTEXITCODE
  $exists = if ($null -ne $psqlOutput) {
    (($psqlOutput | ForEach-Object { [string]$_ }) -join '').Trim()
  } else {
    ''
  }

  if ($psqlExitCode -ne 0) {
    $psqlMessage = if ($null -ne $psqlOutput) {
      (($psqlOutput | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim()
    } else {
      ''
    }

    if ([string]::IsNullOrWhiteSpace($psqlMessage)) {
      $psqlMessage = 'No output from psql.'
    }

    throw "psql database existence check failed with exit code $psqlExitCode. $psqlMessage"
  }

  if ($exists -ne '1') {
    Write-LauncherLog -Paths $paths -Name $logName -Message "Creating database '$dbName'."
    & $createdb -h 127.0.0.1 -p $dbPort -U $dbUser $dbName
    if ($LASTEXITCODE -ne 0) {
      throw "createdb failed with exit code $LASTEXITCODE"
    }
  }

  $bootstrapMarker = Join-Path $paths.RuntimeRunDir '.bootstrap_done'
  if (-not (Test-Path $bootstrapMarker)) {
    Write-LauncherLog -Paths $paths -Name $logName -Message "Running first-run bootstrap command: $bootstrapCommand"
    Invoke-BootstrapCommand -Command $bootstrapCommand -WorkingDirectory $paths.AppBackendDir
    Set-Content -Path $bootstrapMarker -Value (Get-Date -Format o) -Encoding ascii
  }

  Write-LauncherLog -Paths $paths -Name $logName -Message 'Starting backend process.'
  $backendProc = Start-ProcessHiddenTracked `
    -FilePath $nodeExe `
    -WorkingDirectory $paths.AppBackendDir `
    -Arguments @($backendEntry) `
    -Paths $paths `
    -Name 'backend'

  if ($null -eq $backendProc) {
    throw 'Backend process could not be started.'
  }

  $frontendServerScript = Join-Path $paths.LauncherDir 'serve-frontend.mjs'
  if (-not (Test-Path $frontendServerScript)) {
    throw "Frontend server script missing: $frontendServerScript"
  }

  Write-LauncherLog -Paths $paths -Name $logName -Message 'Starting frontend static server process.'
  $frontendProc = Start-ProcessHiddenTracked `
    -FilePath $nodeExe `
    -WorkingDirectory $paths.LauncherDir `
    -Arguments @($frontendServerScript, '--root', $paths.AppFrontendDir, '--port', $frontendPort, '--backend-port', $backendPort) `
    -Paths $paths `
    -Name 'frontend'

  if ($null -eq $frontendProc) {
    throw 'Frontend process could not be started.'
  }

  Start-Sleep -Seconds 2

  if (-not (Test-ProcessAlive -Pid $backendProc.Id)) {
    throw 'Backend process exited immediately after launch.'
  }

  if (-not (Test-ProcessAlive -Pid $frontendProc.Id)) {
    throw 'Frontend process exited immediately after launch.'
  }

  $appUrl = "http://127.0.0.1:$frontendPort"
  Start-Process $appUrl | Out-Null

  Write-LauncherLog -Paths $paths -Name $logName -Message "ZS portable started. URL: $appUrl"
  Write-Host "ZS portable started successfully at $appUrl"
} catch {
  $msg = 'Start-ZS failed with unknown error.'

  if ($null -ne $_) {
    if ($null -ne $_.Exception -and -not [string]::IsNullOrWhiteSpace([string]$_.Exception.Message)) {
      $msg = [string]$_.Exception.Message
    } elseif (-not [string]::IsNullOrWhiteSpace([string]$_)) {
      $msg = [string]$_
    }
  }

  Write-LauncherLog -Paths $paths -Name $logName -Message ("Start failed: " + $msg)
  Write-Error -Message $msg
  exit 1
}
