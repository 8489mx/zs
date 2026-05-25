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

function Stop-ProcessGracefully([int] $processId, [string] $reason, [string] $repoRootNormalized) {
  $processDetails = Get-ProcessDetails -processId $processId
  if ($null -eq $processDetails) {
    return $false
  }

  if (-not (Test-RepoOwnedProcess -processDetails $processDetails -repoRootNormalized $repoRootNormalized)) {
    Write-Warning "Skipped PID $processId ($($processDetails.Name)) because it does not belong to this repository."
    return $false
  }

  Write-Host "Stopping PID $processId ($($processDetails.Name)) - $reason"
  Stop-Process -Id $processId -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1

  if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  }

  return -not [bool](Get-Process -Id $processId -ErrorAction SilentlyContinue)
}

function Get-PortOwner([int] $port, [string] $repoRootNormalized) {
  $connections = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
  if (-not $connections) {
    return $null
  }

  foreach ($connection in $connections) {
    $details = Get-ProcessDetails -processId $connection.OwningProcess
    return [PSCustomObject]@{
      Port = $port
      ProcessId = $connection.OwningProcess
      ProcessName = [string] $details.Name
      CommandLine = [string] $details.CommandLine
      OwnedByRepo = Test-RepoOwnedProcess -processDetails $details -repoRootNormalized $repoRootNormalized
    }
  }

  return $null
}

$repoRoot = Resolve-RepoRoot
$repoRootNormalized = Normalize-PathText $repoRoot
$stateDir = Join-Path $PSScriptRoot '.state'
$pidFiles = @(
  Join-Path $stateDir 'backend.pid'
  Join-Path $stateDir 'frontend.pid'
)

foreach ($pidFile in $pidFiles) {
  if (-not (Test-Path $pidFile)) {
    continue
  }

  $rawPid = (Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
  if ($rawPid -match '^\d+$') {
    [void](Stop-ProcessGracefully -processId ([int] $rawPid) -reason "tracked PID file $([IO.Path]::GetFileName($pidFile))" -repoRootNormalized $repoRootNormalized)
  }
}

$ports = @(3101, 5173)
foreach ($port in $ports) {
  $owner = Get-PortOwner -port $port -repoRootNormalized $repoRootNormalized
  if ($null -eq $owner) {
    continue
  }

  if ($owner.OwnedByRepo) {
    [void](Stop-ProcessGracefully -processId $owner.ProcessId -reason "listening on dev port $port" -repoRootNormalized $repoRootNormalized)
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

