Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-SetupStep {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$ScriptPath,
    [string[]]$Arguments = @()
  )

  if (-not (Test-Path $ScriptPath)) {
    throw "Missing setup step script: $ScriptPath"
  }

  Write-Host ''
  Write-Host "==> $Title"
  & $ScriptPath @Arguments
  Write-Host "OK: $Title"
}

try {
  $launcherDir = Split-Path -Parent $MyInvocation.MyCommand.Path

  Write-Host '=== ZS Portable First-Time Setup ==='
  Write-Host "Launcher: $launcherDir"

  Invoke-SetupStep `
    -Title 'Checking portable runtime and application artifacts' `
    -ScriptPath (Join-Path $launcherDir 'Check-Portable-Ready.ps1')

  Invoke-SetupStep `
    -Title 'Installing Windows Startup autostart shortcut' `
    -ScriptPath (Join-Path $launcherDir '../shortcuts/Install-Autostart-ZS.ps1')

  Invoke-SetupStep `
    -Title 'Installing Desktop browser shortcut' `
    -ScriptPath (Join-Path $launcherDir '../shortcuts/Install-Desktop-Shortcut-ZS.ps1')

  Invoke-SetupStep `
    -Title 'Starting ZS Portable' `
    -ScriptPath (Join-Path $launcherDir 'Start-ZS.ps1')

  Write-Host ''
  Write-Host 'ZS Portable setup completed successfully.'
  Write-Host 'You can now open ZS from the Desktop shortcut.'
} catch {
  Write-Error $_.Exception.Message
  exit 1
}

