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

function Get-ProcessDetails([int] $processId) {
  return Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
}

function Test-RepoOwnedProcess($processDetails, [string] $repoRootNormalized) {
  if ($null -eq $processDetails) {
    return $false
  }

  $executablePath = Normalize-PathText([string] $processDetails.ExecutablePath)
  $commandLine = Normalize-PathText([string] $processDetails.CommandLine)

  return $executablePath.Contains($repoRootNormalized) -or $commandLine.Contains($repoRootNormalized)
}

function Ensure-DevEnvFile([string] $targetFile, [string] $templateFile) {
  if (Test-Path $targetFile) {
    return
  }

  if (-not (Test-Path $templateFile)) {
    throw "Missing development env template: $templateFile"
  }

  Copy-Item -LiteralPath $templateFile -Destination $targetFile -Force
  Write-Host "Created: $targetFile"
}

function Get-ListenerByPort([int] $port, [string] $repoRootNormalized) {
  $connections = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
  if (-not $connections) {
    return $null
  }

  foreach ($connection in $connections) {
    $processDetails = Get-ProcessDetails -processId $connection.OwningProcess
    $ownedByRepo = Test-RepoOwnedProcess -processDetails $processDetails -repoRootNormalized $repoRootNormalized
    return [PSCustomObject]@{
      Port = $port
      ProcessId = $connection.OwningProcess
      ProcessName = [string] $processDetails.Name
      OwnedByRepo = $ownedByRepo
      CommandLine = [string] $processDetails.CommandLine
    }
  }

  return $null
}

function Save-PidFile([string] $path, [int] $pid) {
  Set-Content -LiteralPath $path -Value $pid -Encoding ascii
}

$repoRoot = Resolve-RepoRoot
$repoRootNormalized = Normalize-PathText $repoRoot
$stateDir = Join-Path $PSScriptRoot '.state'
$backendPidFile = Join-Path $stateDir 'backend.pid'
$frontendPidFile = Join-Path $stateDir 'frontend.pid'
$backendRunner = Join-Path $PSScriptRoot 'Run-Backend-Dev.ps1'
$frontendRunner = Join-Path $PSScriptRoot 'Run-Frontend-Dev.ps1'
$backendEnvFile = Join-Path $repoRoot 'backend\.env.development'
$backendEnvTemplate = Join-Path $repoRoot 'backend\.env.development.example'
$frontendEnvFile = Join-Path $repoRoot 'frontend\.env.development'
$frontendEnvTemplate = Join-Path $repoRoot 'frontend\.env.development.example'
$backendPort = 3101
$frontendPort = 5173

New-Item -ItemType Directory -Path $stateDir -Force | Out-Null

Ensure-DevEnvFile -targetFile $backendEnvFile -templateFile $backendEnvTemplate
Ensure-DevEnvFile -targetFile $frontendEnvFile -templateFile $frontendEnvTemplate

$backendListener = Get-ListenerByPort -port $backendPort -repoRootNormalized $repoRootNormalized
if ($backendListener -and -not $backendListener.OwnedByRepo) {
  throw "Port $backendPort is already in use by another process (PID $($backendListener.ProcessId)). Stop it first or change APP_PORT."
}

$frontendListener = Get-ListenerByPort -port $frontendPort -repoRootNormalized $repoRootNormalized
if ($frontendListener -and -not $frontendListener.OwnedByRepo) {
  throw "Port $frontendPort is already in use by another process (PID $($frontendListener.ProcessId)). Stop it first or change Vite port."
}

if (-not $backendListener) {
  $backendProcess = Start-Process -FilePath 'powershell.exe' `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $backendRunner) `
    -WorkingDirectory $repoRoot `
    -PassThru
  Save-PidFile -path $backendPidFile -pid $backendProcess.Id
  Write-Host "Backend dev process started (PID $($backendProcess.Id)) on http://localhost:$backendPort"
} else {
  Save-PidFile -path $backendPidFile -pid $backendListener.ProcessId
  Write-Host "Backend already running for this repo (PID $($backendListener.ProcessId)) on http://localhost:$backendPort"
}

if (-not $frontendListener) {
  $frontendProcess = Start-Process -FilePath 'powershell.exe' `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $frontendRunner) `
    -WorkingDirectory $repoRoot `
    -PassThru
  Save-PidFile -path $frontendPidFile -pid $frontendProcess.Id
  Write-Host "Frontend dev process started (PID $($frontendProcess.Id)) on http://localhost:$frontendPort"
} else {
  Save-PidFile -path $frontendPidFile -pid $frontendListener.ProcessId
  Write-Host "Frontend already running for this repo (PID $($frontendListener.ProcessId)) on http://localhost:$frontendPort"
}

Write-Host ''
Write-Host 'Development mode is running:'
Write-Host '  Frontend: http://localhost:5173'
Write-Host '  Backend : http://localhost:3101'
Write-Host ''
Write-Host 'Use scripts\dev\Stop-Dev-ZS.bat to stop only this repo dev workflow.'

