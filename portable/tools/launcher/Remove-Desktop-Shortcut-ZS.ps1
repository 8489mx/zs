Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$desktopDir = [Environment]::GetFolderPath('Desktop')

if ([string]::IsNullOrWhiteSpace($desktopDir)) {
  throw 'Could not resolve the current user Desktop folder.'
}

$shortcutPath = Join-Path $desktopDir 'ZS Portable.lnk'

if (Test-Path $shortcutPath) {
  Remove-Item -Path $shortcutPath -Force
  Write-Host 'ZS desktop shortcut removed successfully:'
  Write-Host $shortcutPath
} else {
  Write-Host 'ZS desktop shortcut was not found. Nothing to remove.'
}
