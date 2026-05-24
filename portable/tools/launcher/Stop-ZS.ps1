Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/Common.ps1"

$paths = Get-PathMap
$logName = 'launcher-stop.log'

function Normalize-PathText([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  return $Value.ToLowerInvariant().Replace('/', '\')
}

function Get-ProcessCimById([int]$ProcessId) {
  try {
    return Get-CimInstance Win32_Process -Filter ("ProcessId = {0}" -f $ProcessId) -ErrorAction Stop
  } catch {
    return $null
  }
}

function Get-ProcessInfoById([int]$ProcessId) {
  $cim = Get-ProcessCimById -ProcessId $ProcessId
  if ($null -eq $cim) { return $null }

  return [pscustomobject]@{
    ProcessId      = [int]$cim.ProcessId
    Name           = [string]$cim.Name
    ExecutablePath = [string]$cim.ExecutablePath
    CommandLine    = [string]$cim.CommandLine
  }
}

function Test-PortableOwnedProcess {
  param(
    [Parameter(Mandatory = $true)]$ProcessInfo,
    [Parameter(Mandatory = $true)][string]$PortableRoot,
    [Parameter(Mandatory = $true)][string[]]$RootMarkers
  )

  $exe = Normalize-PathText $ProcessInfo.ExecutablePath
  $cmd = Normalize-PathText $ProcessInfo.CommandLine
  $root = Normalize-PathText $PortableRoot

  if ($exe.Contains($root) -or $cmd.Contains($root)) { return $true }
  foreach ($marker in $RootMarkers) {
    $m = Normalize-PathText $marker
    if (-not [string]::IsNullOrWhiteSpace($m) -and ($exe.Contains($m) -or $cmd.Contains($m))) {
      return $true
    }
  }
  return $false
}

function Test-PortableOwnedNodeProcess {
  param(
    [Parameter(Mandatory = $true)]$ProcessInfo,
    [Parameter(Mandatory = $true)][string]$PortableRoot
  )

  $name = [string]$ProcessInfo.Name
  if (-not $name.Equals('node.exe', [System.StringComparison]::OrdinalIgnoreCase)) { return $false }

  $cmd = Normalize-PathText $ProcessInfo.CommandLine
  $exe = Normalize-PathText $ProcessInfo.ExecutablePath
  $root = Normalize-PathText $PortableRoot
  if (-not ($cmd.Contains($root) -or $exe.Contains($root))) { return $false }

  $required = @(
    (Join-Path $PortableRoot 'app\backend'),
    (Join-Path $PortableRoot 'app\frontend'),
    (Join-Path $PortableRoot 'tools\launcher'),
    (Join-Path $PortableRoot 'runtime\node')
  ) | ForEach-Object { Normalize-PathText $_ }

  foreach ($marker in $required) {
    if ($cmd.Contains($marker) -or $exe.Contains($marker)) { return $true }
  }
  return $false
}

function Test-PortableOwnedPostgresProcess {
  param(
    [Parameter(Mandatory = $true)]$ProcessInfo,
    [Parameter(Mandatory = $true)][string]$PortableRoot,
    [Parameter(Mandatory = $true)][string]$RuntimeDataDir
  )

  $name = [string]$ProcessInfo.Name
  if (-not $name.Equals('postgres.exe', [System.StringComparison]::OrdinalIgnoreCase)) { return $false }

  $cmd = Normalize-PathText $ProcessInfo.CommandLine
  $exe = Normalize-PathText $ProcessInfo.ExecutablePath
  $root = Normalize-PathText $PortableRoot
  $dataDir = Normalize-PathText $RuntimeDataDir

  if ($cmd.Contains($dataDir)) { return $true }
  if ($cmd.Contains($root)) { return $true }
  if ($exe.Contains($root) -and $cmd.Contains('runtime\postgres')) { return $true }
  return $false
}

function Stop-OwnedProcess {
  param(
    [Parameter(Mandatory = $true)][int]$ProcessId,
    [Parameter(Mandatory = $true)][string]$Reason,
    [Parameter(Mandatory = $true)][hashtable]$Paths,
    [Parameter(Mandatory = $true)][string]$LogName
  )

  $procInfo = Get-ProcessInfoById -ProcessId $ProcessId
  if ($null -eq $procInfo) {
    Write-LauncherLog -Paths $Paths -Name $LogName -Message "Skip PID $ProcessId ($Reason): already stopped."
    return $true
  }

  Write-LauncherLog -Paths $Paths -Name $LogName -Message ("Stopping PID {0} Name={1} Reason={2}" -f $procInfo.ProcessId, $procInfo.Name, $Reason)

  $stopped = $false
  try {
    Stop-Process -Id $ProcessId -ErrorAction Stop
    Start-Sleep -Milliseconds 1500
    $stopped = -not (Test-ProcessAlive -ProcessId $ProcessId)
  } catch {
    $stopped = $false
  }

  if (-not $stopped) {
    try {
      Stop-Process -Id $ProcessId -Force -ErrorAction Stop
      Start-Sleep -Milliseconds 800
      $stopped = -not (Test-ProcessAlive -ProcessId $ProcessId)
    } catch {
      $stopped = -not (Test-ProcessAlive -ProcessId $ProcessId)
    }
  }

  if ($stopped) {
    Write-LauncherLog -Paths $Paths -Name $LogName -Message ("Stopped PID {0} Name={1}." -f $ProcessId, $procInfo.Name)
    return $true
  }

  Write-LauncherLog -Paths $Paths -Name $LogName -Message ("WARNING: Failed to stop PID {0} Name={1}." -f $ProcessId, $procInfo.Name)
  return $false
}

function Get-PortOwners([int[]]$Ports) {
  $owners = @()
  try {
    $connections = Get-NetTCPConnection -State Listen, Established, SynSent, SynReceived, FinWait1, FinWait2, CloseWait -ErrorAction Stop |
      Where-Object { $_.LocalPort -in $Ports }
  } catch {
    $connections = @()
  }

  foreach ($conn in $connections) {
    $pid = [int]$conn.OwningProcess
    if ($pid -le 0) { continue }
    $owners += [pscustomobject]@{
      Port = [int]$conn.LocalPort
      ProcessId = $pid
    }
  }

  $owners | Sort-Object Port, ProcessId -Unique
}

try {
  Ensure-Directory -Path $paths.RuntimeLogsDir
  $envFile = Ensure-EnvFile -Paths $paths
  $envMap = Get-EnvMap -EnvFile $envFile
  $dbPort = [int](Get-EnvValue -EnvMap $envMap -Key 'DB_PORT' -Default '5432')
  $backendPort = [int](Get-EnvValue -EnvMap $envMap -Key 'BACKEND_PORT' -Default '3001')
  $frontendPort = [int](Get-EnvValue -EnvMap $envMap -Key 'FRONTEND_PORT' -Default '8080')
  $portsToCheck = @($backendPort, $frontendPort, $dbPort, 8489) | Sort-Object -Unique
  $portableRoot = $paths.Root
  $rootMarkers = @(
    $paths.Root,
    (Join-Path $paths.Root 'runtime\node'),
    (Join-Path $paths.Root 'runtime\postgres'),
    (Join-Path $paths.Root 'runtime\data'),
    (Join-Path $paths.Root 'app\backend'),
    (Join-Path $paths.Root 'app\frontend'),
    (Join-Path $paths.Root 'tools\launcher')
  )

  Write-LauncherLog -Paths $paths -Name $logName -Message '==== Stop-ZS started ===='
  Write-LauncherLog -Paths $paths -Name $logName -Message ("Portable root: {0}" -f $portableRoot)
  Write-LauncherLog -Paths $paths -Name $logName -Message ("Configured ports: {0}" -f ($portsToCheck -join ', '))

  $stoppedAnyOwned = $false
  $hasOwnedResidual = $false
  $hasUnrelatedPortUsage = $false

  foreach ($name in @('frontend', 'backend')) {
    $trackedProcessId = Read-PidFile -Paths $paths -Name $name
    if ($null -eq $trackedProcessId) { continue }
    if (Stop-OwnedProcess -ProcessId $trackedProcessId -Reason ("pid-file:{0}" -f $name) -Paths $paths -LogName $logName) {
      $stoppedAnyOwned = $true
    }
    Remove-PidFile -Paths $paths -Name $name
  }

  $pgCtl = Join-Path $paths.PostgresBinDir 'pg_ctl.exe'
  if (Test-Path $pgCtl) {
    Write-LauncherLog -Paths $paths -Name $logName -Message ("Running pg_ctl stop on {0} with DB_PORT={1}" -f $paths.RuntimeDataDir, $dbPort)
    & $pgCtl -D $paths.RuntimeDataDir -o "-p $dbPort -h 127.0.0.1" stop *>> (Join-Path $paths.RuntimeLogsDir $logName)
    if ($LASTEXITCODE -eq 0) {
      Write-LauncherLog -Paths $paths -Name $logName -Message 'pg_ctl stop succeeded.'
    } else {
      Write-LauncherLog -Paths $paths -Name $logName -Message ("pg_ctl stop exit code: {0}" -f $LASTEXITCODE)
    }
  } else {
    Write-LauncherLog -Paths $paths -Name $logName -Message 'pg_ctl.exe not found; skipping PostgreSQL stop.'
  }

  $portOwners = Get-PortOwners -Ports $portsToCheck
  foreach ($owner in $portOwners) {
    $procInfo = Get-ProcessInfoById -ProcessId $owner.ProcessId
    if ($null -eq $procInfo) { continue }

    $isOwned = Test-PortableOwnedProcess -ProcessInfo $procInfo -PortableRoot $portableRoot -RootMarkers $rootMarkers
    $isNodeOwned = Test-PortableOwnedNodeProcess -ProcessInfo $procInfo -PortableRoot $portableRoot
    $isPgOwned = Test-PortableOwnedPostgresProcess -ProcessInfo $procInfo -PortableRoot $portableRoot -RuntimeDataDir $paths.RuntimeDataDir

    $shouldStop = $false
    if ($procInfo.Name.Equals('node.exe', [System.StringComparison]::OrdinalIgnoreCase)) {
      $shouldStop = $isNodeOwned
    } elseif ($procInfo.Name.Equals('postgres.exe', [System.StringComparison]::OrdinalIgnoreCase)) {
      $shouldStop = $isPgOwned
    } else {
      $shouldStop = $isOwned
    }

    if ($shouldStop) {
      if (Stop-OwnedProcess -ProcessId $procInfo.ProcessId -Reason ("port:{0}" -f $owner.Port) -Paths $paths -LogName $logName) {
        $stoppedAnyOwned = $true
      } else {
        $hasOwnedResidual = $true
      }
    } else {
      $hasUnrelatedPortUsage = $true
      Write-LauncherLog -Paths $paths -Name $logName -Message ("Ignored PID {0} Name={1} on port {2}: not owned by current portable root." -f $procInfo.ProcessId, $procInfo.Name, $owner.Port)
    }
  }

  $ownedByPath = @()
  try {
    $allProcs = Get-CimInstance Win32_Process -ErrorAction Stop
  } catch {
    $allProcs = @()
  }

  foreach ($proc in $allProcs) {
    $info = [pscustomobject]@{
      ProcessId      = [int]$proc.ProcessId
      Name           = [string]$proc.Name
      ExecutablePath = [string]$proc.ExecutablePath
      CommandLine    = [string]$proc.CommandLine
    }

    if ($info.ProcessId -eq $PID) { continue }
    if (Test-PortableOwnedProcess -ProcessInfo $info -PortableRoot $portableRoot -RootMarkers $rootMarkers) {
      $ownedByPath += $info
    }
  }

  foreach ($proc in ($ownedByPath | Sort-Object ProcessId -Unique)) {
    if (Stop-OwnedProcess -ProcessId $proc.ProcessId -Reason 'path-based-cleanup' -Paths $paths -LogName $logName) {
      $stoppedAnyOwned = $true
    } else {
      $hasOwnedResidual = $true
    }
  }

  Start-Sleep -Seconds 3

  $postCheck = Get-PortOwners -Ports $portsToCheck
  foreach ($owner in $postCheck) {
    $procInfo = Get-ProcessInfoById -ProcessId $owner.ProcessId
    if ($null -eq $procInfo) { continue }

    $isOwned = Test-PortableOwnedProcess -ProcessInfo $procInfo -PortableRoot $portableRoot -RootMarkers $rootMarkers
    $isNodeOwned = Test-PortableOwnedNodeProcess -ProcessInfo $procInfo -PortableRoot $portableRoot
    $isPgOwned = Test-PortableOwnedPostgresProcess -ProcessInfo $procInfo -PortableRoot $portableRoot -RuntimeDataDir $paths.RuntimeDataDir

    $shouldStop = $false
    if ($procInfo.Name.Equals('node.exe', [System.StringComparison]::OrdinalIgnoreCase)) {
      $shouldStop = $isNodeOwned
    } elseif ($procInfo.Name.Equals('postgres.exe', [System.StringComparison]::OrdinalIgnoreCase)) {
      $shouldStop = $isPgOwned
    } else {
      $shouldStop = $isOwned
    }

    if ($shouldStop) {
      if (Stop-OwnedProcess -ProcessId $procInfo.ProcessId -Reason ("post-check-port:{0}" -f $owner.Port) -Paths $paths -LogName $logName) {
        $stoppedAnyOwned = $true
      } else {
        $hasOwnedResidual = $true
      }
    } else {
      $hasUnrelatedPortUsage = $true
      Write-LauncherLog -Paths $paths -Name $logName -Message ("Post-check ignored PID {0} Name={1} on port {2}: not owned by current portable root." -f $procInfo.ProcessId, $procInfo.Name, $owner.Port)
    }
  }

  if (Test-Path $paths.RuntimeRunDir) {
    Get-ChildItem -Path $paths.RuntimeRunDir -Filter '*.pid' -File -ErrorAction SilentlyContinue | ForEach-Object {
      try {
        Remove-Item -Path $_.FullName -Force -ErrorAction Stop
        Write-LauncherLog -Paths $paths -Name $logName -Message ("Removed pid file: {0}" -f $_.FullName)
      } catch {
        Write-LauncherLog -Paths $paths -Name $logName -Message ("WARNING: Failed to remove pid file: {0}" -f $_.FullName)
      }
    }
  }

  $residualOwned = @()
  try {
    $allAfter = Get-CimInstance Win32_Process -ErrorAction Stop
  } catch {
    $allAfter = @()
  }
  foreach ($proc in $allAfter) {
    $info = [pscustomobject]@{
      ProcessId      = [int]$proc.ProcessId
      Name           = [string]$proc.Name
      ExecutablePath = [string]$proc.ExecutablePath
      CommandLine    = [string]$proc.CommandLine
    }
    if ($info.ProcessId -eq $PID) { continue }
    if (Test-PortableOwnedProcess -ProcessInfo $info -PortableRoot $portableRoot -RootMarkers $rootMarkers) {
      $residualOwned += $info
    }
  }

  if (($residualOwned | Measure-Object).Count -gt 0) {
    $hasOwnedResidual = $true
    foreach ($r in ($residualOwned | Sort-Object ProcessId -Unique)) {
      Write-LauncherLog -Paths $paths -Name $logName -Message ("WARNING: Residual owned process PID={0} Name={1}" -f $r.ProcessId, $r.Name)
    }
  }

  Write-LauncherLog -Paths $paths -Name $logName -Message ("Stop summary: stoppedAnyOwned={0}, hasOwnedResidual={1}, hasUnrelatedPortUsage={2}" -f $stoppedAnyOwned, $hasOwnedResidual, $hasUnrelatedPortUsage)
  Write-LauncherLog -Paths $paths -Name $logName -Message '==== Stop-ZS finished ===='

  if ($hasOwnedResidual) {
    Write-Host 'ZS portable stop completed with warnings. Some ZS process may still be running. See launcher-stop.log.'
  } elseif ($hasUnrelatedPortUsage) {
    Write-Host 'ZS portable stopped, but some unrelated process is still using one of the configured ports. See launcher-stop.log.'
  } else {
    Write-Host 'ZS portable stopped completely. The folder is safe to move or delete.'
  }
} catch {
  Write-LauncherLog -Paths $paths -Name $logName -Message ("Stop failed: " + $_.Exception.Message)
  Write-Error $_.Exception.Message
  exit 1
}
