Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/Common.ps1"

$paths = Get-PathMap
$reportLines = New-Object System.Collections.Generic.List[string]

function Add-ReportLine([string]$Line = '') {
  $reportLines.Add($Line) | Out-Null
  Write-Host $Line
}

function Add-Section([string]$Title) {
  Add-ReportLine ''
  Add-ReportLine ("=== {0} ===" -f $Title)
}

function Test-FileExists([string]$Label, [string]$Path) {
  $exists = Test-Path $Path
  $status = if ($exists) { 'OK' } else { 'MISSING' }
  Add-ReportLine ("[{0}] {1}: {2}" -f $status, $Label, $Path)
  return $exists
}

function Test-RequiredFiles([string]$Label, [string]$BaseDir, [string[]]$Files) {
  Add-ReportLine ("{0}: {1}" -f $Label, $BaseDir)
  $allOk = $true

  foreach ($file in $Files) {
    $fullPath = Join-Path $BaseDir $file
    if (-not (Test-FileExists -Label ("- " + $file) -Path $fullPath)) {
      $allOk = $false
    }
  }

  return $allOk
}

function Test-TcpPort([string]$HostName, [int]$Port, [int]$TimeoutMs = 800) {
  $client = $null
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect($HostName, $Port, $null, $null)
    $connected = $async.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
    if (-not $connected) {
      return $false
    }

    $client.EndConnect($async)
    return $true
  } catch {
    return $false
  } finally {
    if ($client) {
      $client.Close()
    }
  }
}

function Test-HttpEndpoint([string]$Label, [string]$Url) {
  try {
    $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec 3
    Add-ReportLine ("[OK] {0}: {1} -> HTTP {2}" -f $Label, $Url, $response.StatusCode)
    return $true
  } catch {
    Add-ReportLine ("[FAIL] {0}: {1} -> {2}" -f $Label, $Url, $_.Exception.Message)
    return $false
  }
}

function Show-ShortcutDetails([string]$Label, [string]$ShortcutPath) {
  if (-not (Test-Path $ShortcutPath)) {
    Add-ReportLine ("[MISSING] {0}: {1}" -f $Label, $ShortcutPath)
    return
  }

  Add-ReportLine ("[OK] {0}: {1}" -f $Label, $ShortcutPath)

  try {
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($ShortcutPath)
    Add-ReportLine ("  TargetPath: {0}" -f $shortcut.TargetPath)
    Add-ReportLine ("  Arguments: {0}" -f $shortcut.Arguments)
    Add-ReportLine ("  WorkingDirectory: {0}" -f $shortcut.WorkingDirectory)
    Add-ReportLine ("  IconLocation: {0}" -f $shortcut.IconLocation)
  } catch {
    Add-ReportLine ("  Could not read shortcut details: {0}" -f $_.Exception.Message)
  }
}

function Show-FileTail([string]$Label, [string]$FilePath, [int]$Lines = 50) {
  Add-Section ("Log tail: " + $Label)

  if (Test-Path $FilePath) {
    Add-ReportLine ("File: {0}" -f $FilePath)
    $tail = Get-Content -Path $FilePath -Tail $Lines
    if ($tail) {
      foreach ($line in $tail) {
        Add-ReportLine $line
      }
    } else {
      Add-ReportLine '(file is empty)'
    }
  } else {
    Add-ReportLine ("[MISSING] {0}" -f $FilePath)
  }
}

try {
  Ensure-Directory -Path $paths.RuntimeLogsDir

  $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $reportFile = Join-Path $paths.RuntimeLogsDir ("diagnostics-report-{0}.txt" -f $timestamp)

  Add-ReportLine '=== ZS Portable Diagnostics ==='
  Add-ReportLine ("GeneratedAt: {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
  Add-ReportLine ("Root: {0}" -f $paths.Root)
  Add-ReportLine ("Launcher: {0}" -f $paths.LauncherDir)
  Add-ReportLine ("Logs: {0}" -f $paths.RuntimeLogsDir)

  $envFile = Ensure-EnvFile -Paths $paths
  $envMap = Get-EnvMap -EnvFile $envFile

  $dbPort = [int](Get-EnvValue -EnvMap $envMap -Key 'DB_PORT' -Default '5432')
  $dbUser = Get-EnvValue -EnvMap $envMap -Key 'DB_USER' -Default 'postgres'
  $backendPort = [int](Get-EnvValue -EnvMap $envMap -Key 'BACKEND_PORT' -Default '3001')
  $frontendPort = [int](Get-EnvValue -EnvMap $envMap -Key 'FRONTEND_PORT' -Default '8080')

  Add-Section 'Environment'
  Add-ReportLine ("Env file: {0}" -f $envFile)
  Add-ReportLine ("APP_MODE: {0}" -f (Get-EnvValue -EnvMap $envMap -Key 'APP_MODE' -Default '(missing)'))
  Add-ReportLine ("DB_PORT: {0}" -f $dbPort)
  Add-ReportLine ("BACKEND_PORT: {0}" -f $backendPort)
  Add-ReportLine ("FRONTEND_PORT: {0}" -f $frontendPort)

  Add-Section 'Runtime files'
  [void](Test-RequiredFiles -Label 'Node runtime' -BaseDir $paths.NodeRuntimeDir -Files @(
    'node.exe',
    'npm.cmd',
    'node_modules/npm/bin/npm-cli.js'
  ))

  [void](Test-RequiredFiles -Label 'PostgreSQL runtime' -BaseDir $paths.PostgresBinDir -Files @(
    'postgres.exe',
    'pg_ctl.exe',
    'pg_isready.exe',
    'initdb.exe',
    'createdb.exe',
    'psql.exe',
    'pg_dump.exe'
  ))

  Add-Section 'Application artifacts'
  [void](Test-FileExists -Label 'Backend entry' -Path $paths.BackendEntryFile)
  [void](Test-FileExists -Label 'Backend package.json' -Path (Join-Path $paths.AppBackendDir 'package.json'))
  [void](Test-FileExists -Label 'Frontend index.html' -Path $paths.FrontendEntry)
  [void](Test-FileExists -Label 'Frontend assets directory' -Path (Join-Path $paths.AppFrontendDir 'assets'))

  Add-Section 'Tracked processes'
  foreach ($name in @('backend', 'frontend')) {
    $trackedProcessId = Read-PidFile -Paths $paths -Name $name
    if ($null -eq $trackedProcessId) {
      Add-ReportLine ("[MISSING] PID {0}: pid file not found" -f $name)
      continue
    }

    $alive = Test-ProcessAlive -ProcessId $trackedProcessId
    $status = if ($alive) { 'OK' } else { 'STALE' }
    Add-ReportLine ("[{0}] PID {1}: {2} alive={3}" -f $status, $name, $trackedProcessId, $alive)
  }

  Add-Section 'Ports and health endpoints'
  foreach ($port in @($frontendPort, $backendPort, $dbPort)) {
    $open = Test-TcpPort -HostName '127.0.0.1' -Port $port
    $status = if ($open) { 'OPEN' } else { 'CLOSED' }
    Add-ReportLine ("[{0}] TCP 127.0.0.1:{1}" -f $status, $port)
  }

  [void](Test-HttpEndpoint -Label 'Frontend readiness' -Url ("http://127.0.0.1:{0}/health/ready" -f $frontendPort))
  [void](Test-HttpEndpoint -Label 'Backend liveness' -Url ("http://127.0.0.1:{0}/health/live" -f $backendPort))

  $pgIsReady = Join-Path $paths.PostgresBinDir 'pg_isready.exe'
  if (Test-Path $pgIsReady) {
    & $pgIsReady -h 127.0.0.1 -p $dbPort -U $dbUser -d postgres | ForEach-Object { Add-ReportLine $_ }
    Add-ReportLine ("pg_isready exit code: {0}" -f $LASTEXITCODE)
  } else {
    Add-ReportLine ("[MISSING] pg_isready: {0}" -f $pgIsReady)
  }

  Add-Section 'Shortcuts'
  $startupDir = [Environment]::GetFolderPath('Startup')
  $desktopDir = [Environment]::GetFolderPath('Desktop')
  Show-ShortcutDetails -Label 'Startup shortcut' -ShortcutPath (Join-Path $startupDir 'ZS Portable.lnk')
  Show-ShortcutDetails -Label 'Desktop shortcut' -ShortcutPath (Join-Path $desktopDir 'ZS Portable.lnk')

  Show-FileTail -Label 'launcher-start.log' -FilePath (Join-Path $paths.RuntimeLogsDir 'launcher-start.log') -Lines 50
  Show-FileTail -Label 'backend.log' -FilePath (Join-Path $paths.RuntimeLogsDir 'backend.log') -Lines 50
  Show-FileTail -Label 'frontend.log' -FilePath (Join-Path $paths.RuntimeLogsDir 'frontend.log') -Lines 50
  Show-FileTail -Label 'postgresql.log' -FilePath (Join-Path $paths.RuntimeLogsDir 'postgresql.log') -Lines 50

  [System.IO.File]::WriteAllLines($reportFile, $reportLines, [System.Text.UTF8Encoding]::new($false))

  Add-ReportLine ''
  Add-ReportLine ("Diagnostics report saved to: {0}" -f $reportFile)
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
