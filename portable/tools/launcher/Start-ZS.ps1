Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/Common.ps1"

$paths = Get-PathMap
$logName = 'launcher-start.log'

function Get-ErrorDetails([System.Management.Automation.ErrorRecord]$ErrorRecord) {
  if ($null -eq $ErrorRecord) {
    return 'Unknown launcher error.'
  }

  $details = @()
  if ($ErrorRecord.Exception -and $ErrorRecord.Exception.Message) {
    $details += $ErrorRecord.Exception.Message
  } elseif ($ErrorRecord.ToString()) {
    $details += $ErrorRecord.ToString()
  }

  if ($ErrorRecord.ScriptStackTrace) {
    $details += "ScriptStackTrace: $($ErrorRecord.ScriptStackTrace)"
  }

  return ($details -join [Environment]::NewLine)
}

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

  if (-not $envMap.ContainsKey('ENABLE_BOOTSTRAP_ADMIN') -or -not $envMap['ENABLE_BOOTSTRAP_ADMIN']) {
    $envMap['ENABLE_BOOTSTRAP_ADMIN'] = 'true'
  }

  if (-not $envMap.ContainsKey('DEFAULT_ADMIN_USERNAME') -or -not $envMap['DEFAULT_ADMIN_USERNAME']) {
    $envMap['DEFAULT_ADMIN_USERNAME'] = 'admin'
  }

  if (-not $envMap.ContainsKey('DEFAULT_ADMIN_PASSWORD') -or -not $envMap['DEFAULT_ADMIN_PASSWORD']) {
    $envMap['DEFAULT_ADMIN_PASSWORD'] = 'ZsPortable@2026!'
  }

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
  $isFreshRuntimeData = -not (Test-Path $pgVersionFile)

  if ($isFreshRuntimeData) {
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
  $createdDatabase = $false
  $existsRaw = & $psql -h 127.0.0.1 -p $dbPort -U $dbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$dbName';"
  $existsText = ''

  if ($existsRaw -is [System.Array]) {
    $existsText = ($existsRaw -join '')
  } elseif ($null -ne $existsRaw) {
    $existsText = [string]$existsRaw
  }

  $exists = if ([string]::IsNullOrWhiteSpace($existsText)) { '0' } else { $existsText }

  if ($exists -ne '1') {
    Write-LauncherLog -Paths $paths -Name $logName -Message "Creating database '$dbName'."
    & $createdb -h 127.0.0.1 -p $dbPort -U $dbUser $dbName
    if ($LASTEXITCODE -ne 0) {
      throw "createdb failed with exit code $LASTEXITCODE"
    }

    $createdDatabase = $true
  }

  $bootstrapMarker = Join-Path $paths.RuntimeRunDir '.bootstrap_done'
  if ($isFreshRuntimeData -or $createdDatabase) {
    Remove-Item -Path $bootstrapMarker -Force -ErrorAction SilentlyContinue
  }
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

  $backendReady = Wait-HttpReady -Url "http://127.0.0.1:$backendPort/health/live" -TimeoutSeconds 30
  if (-not $backendReady) {
    if (-not (Test-ProcessAlive -ProcessId $backendProc.Id)) {
      throw 'Backend process exited immediately after launch.'
    }

    throw 'Backend process did not become ready within timeout.'
  }

  $frontendReady = Wait-HttpReady -Url "http://127.0.0.1:$frontendPort/health/ready" -TimeoutSeconds 30
  if (-not $frontendReady) {
    if (-not (Test-ProcessAlive -ProcessId $frontendProc.Id)) {
      throw 'Frontend process exited immediately after launch.'
    }

    throw 'Frontend process did not become ready within timeout.'
  }

  $appUrl = "http://127.0.0.1:$frontendPort"
  Start-Process $appUrl | Out-Null

  Write-LauncherLog -Paths $paths -Name $logName -Message "ZS portable started. URL: $appUrl"
  Write-Host "ZS portable started successfully at $appUrl"
} catch {
  $errorDetails = Get-ErrorDetails -ErrorRecord $_
  Write-LauncherLog -Paths $paths -Name $logName -Message ("Start failed: " + $errorDetails)
  Write-Error $errorDetails
  exit 1
}
