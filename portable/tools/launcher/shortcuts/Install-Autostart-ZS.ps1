Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/../lib/Common.ps1"

$paths = Get-PathMap
$startupDir = [Environment]::GetFolderPath('Startup')

if ([string]::IsNullOrWhiteSpace($startupDir)) {
  throw 'Could not resolve the current user Startup folder.'
}

Ensure-Directory -Path $startupDir

$autostartScript = Join-Path $paths.LauncherDir 'shortcuts/Start-ZS-Autostart.vbs'
if (-not (Test-Path $autostartScript)) {
  throw "Autostart launcher script missing: $autostartScript"
}

$wscriptExe = Join-Path $env:WINDIR 'System32\wscript.exe'
if (-not (Test-Path $wscriptExe)) {
  $wscriptExe = 'wscript.exe'
}

$shortcutPath = Join-Path $startupDir 'ZS Portable.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $wscriptExe
$shortcut.Arguments = ('//nologo "{0}"' -f $autostartScript)
$shortcut.WorkingDirectory = $paths.LauncherDir
$shortcut.Description = 'Starts ZS Portable automatically at Windows sign-in.'
$shortcut.Save()

Write-Host 'ZS autostart installed successfully:'
Write-Host $shortcutPath


