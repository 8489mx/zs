Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$startupDir = [Environment]::GetFolderPath('Startup')

if ([string]::IsNullOrWhiteSpace($startupDir)) {
  throw 'Could not resolve the current user Startup folder.'
}

$shortcutPath = Join-Path $startupDir 'ZS Portable.lnk'

if (Test-Path $shortcutPath) {
  Remove-Item -Path $shortcutPath -Force
  Write-Host 'ZS autostart removed successfully:'
  Write-Host $shortcutPath
} else {
  Write-Host 'ZS autostart shortcut was not found. Nothing to remove.'
}

