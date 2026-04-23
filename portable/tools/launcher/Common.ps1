Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-PortableRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

function Get-PathMap {
  $root = Get-PortableRoot
  $nodeRuntimeDir = Join-Path $root 'runtime/node'
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
    NodeRuntimeDir   = $nodeRuntimeDir
    BundledNodeExe   = Join-Path $nodeRuntimeDir 'node.exe'
    BundledNpmExe    = Join-Path $nodeRuntimeDir 'npm.cmd'
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

function Resolve-PortableExecutablePath {
  param(
    [Parameter(Mandatory = $true)][hashtable]$Paths,
    [string]$Value,
    [Parameter(Mandatory = $true)][string]$BundledPath,
    [string[]]$LegacyCommandNames = @()
  )

  $candidate = if ([string]::IsNullOrWhiteSpace($Value)) { $BundledPath } else { $Value.Trim() }
  $looksLikeRelativePath = $candidate.Contains('\') -or $candidate.Contains('/')

  foreach ($legacyName in $LegacyCommandNames) {
    if ($candidate.Equals($legacyName, [System.StringComparison]::OrdinalIgnoreCase)) {
      if (Test-Path $BundledPath) {
        return $BundledPath
      }

      return $candidate
    }
  }

  if ([System.IO.Path]::IsPathRooted($candidate)) {
    return $candidate
  }

  if ($looksLikeRelativePath) {
    return (Join-Path $Paths.Root $candidate)
  }

  $portableCandidate = Join-Path $Paths.Root $candidate
  if (Test-Path $portableCandidate) {
    return $portableCandidate
  }

  return $candidate
}

function Resolve-NodeExe([hashtable]$Paths, [hashtable]$EnvMap) {
  $value = Get-EnvValue -EnvMap $EnvMap -Key 'NODE_EXE' -Default 'runtime\node\node.exe'
  return Resolve-PortableExecutablePath -Paths $Paths -Value $value -BundledPath $Paths.BundledNodeExe -LegacyCommandNames @('node', 'node.exe')
}

function Resolve-NpmExe([hashtable]$Paths, [hashtable]$EnvMap) {
  $value = Get-EnvValue -EnvMap $EnvMap -Key 'NPM_EXE' -Default 'runtime\node\npm.cmd'
  return Resolve-PortableExecutablePath -Paths $Paths -Value $value -BundledPath $Paths.BundledNpmExe -LegacyCommandNames @('npm', 'npm.cmd')
}

function Quote-ForCmd([string]$Value) {
  return ('"{0}"' -f $Value)
}

function Resolve-BootstrapCommand([hashtable]$Paths, [hashtable]$EnvMap) {
  $raw = Get-EnvValue -EnvMap $EnvMap -Key 'BACKEND_BOOTSTRAP_CMD' -Default '{NPM_EXE} run migration:run'
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return ''
  }

  $nodeExe = Resolve-NodeExe -Paths $Paths -EnvMap $EnvMap
  $npmExe = Resolve-NpmExe -Paths $Paths -EnvMap $EnvMap

  $resolved = $raw.Replace('{NODE_EXE}', (Quote-ForCmd $nodeExe)).Replace('{NPM_EXE}', (Quote-ForCmd $npmExe))
  $trimmed = $resolved.Trim()

  $npmMatch = [System.Text.RegularExpressions.Regex]::Match($trimmed, '^(?i)npm(?:\.cmd)?(?:\s+(.*))?$')
  if ($npmMatch.Success) {
    $tail = $npmMatch.Groups[1].Value
    if ([string]::IsNullOrWhiteSpace($tail)) {
      return (Quote-ForCmd $npmExe)
    }

    return ((Quote-ForCmd $npmExe) + ' ' + $tail)
  }

  $nodeMatch = [System.Text.RegularExpressions.Regex]::Match($trimmed, '^(?i)node(?:\.exe)?(?:\s+(.*))?$')
  if ($nodeMatch.Success) {
    $tail = $nodeMatch.Groups[1].Value
    if ([string]::IsNullOrWhiteSpace($tail)) {
      return (Quote-ForCmd $nodeExe)
    }

    return ((Quote-ForCmd $nodeExe) + ' ' + $tail)
  }

  return $resolved
}

function Assert-BundledNodeRuntime([hashtable]$Paths) {
  $required = @(
    $Paths.BundledNodeExe,
    $Paths.BundledNpmExe,
    (Join-Path $Paths.NodeRuntimeDir 'node_modules/npm/bin/npm-cli.js')
  )

  foreach ($item in $required) {
    if (-not (Test-Path $item)) {
      throw "Bundled Node.js runtime file missing: $item"
    }
  }
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


function Wait-HttpReady([string]$Url, [int]$TimeoutSeconds = 30) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return $true
      }
    } catch {
      Start-Sleep -Milliseconds 700
      continue
    }

    Start-Sleep -Milliseconds 700
  }

  return $false
}

function Write-PidFile([hashtable]$Paths, [string]$Name, [int]$ProcessId) {
  Ensure-Directory -Path $Paths.RuntimeRunDir
  $pidFile = Join-Path $Paths.RuntimeRunDir ("{0}.pid" -f $Name)
  Set-Content -Path $pidFile -Value $ProcessId -Encoding ascii
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

function Test-ProcessAlive([int]$ProcessId) {
  try {
    $p = Get-Process -Id $ProcessId -ErrorAction Stop
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

  Write-PidFile -Paths $Paths -Name $Name -ProcessId $process.Id
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
