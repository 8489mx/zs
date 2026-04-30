Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/Common.ps1"

$paths = Get-PathMap
$desktopDir = [Environment]::GetFolderPath('Desktop')

if ([string]::IsNullOrWhiteSpace($desktopDir)) {
  throw 'Could not resolve the current user Desktop folder.'
}

Ensure-Directory -Path $desktopDir

$envFile = Ensure-EnvFile -Paths $paths
$envMap = Get-EnvMap -EnvFile $envFile
$frontendPort = Get-EnvValue -EnvMap $envMap -Key 'FRONTEND_PORT' -Default '8080'
$appUrl = "http://127.0.0.1:$frontendPort"

$shortcutPath = Join-Path $desktopDir 'ZS Portable.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $appUrl
$shortcut.WorkingDirectory = $desktopDir
$shortcut.Description = 'Open ZS Portable in the browser.'

$iconCandidates = @(
  (Get-EnvValue -EnvMap $envMap -Key 'APP_ICON' -Default ''),
  (Join-Path $paths.Root 'assets\zs.ico'),
  (Join-Path $paths.Root 'assets\app.ico'),
  (Join-Path $paths.LauncherDir 'zs.ico'),
  (Join-Path $paths.LauncherDir 'app.ico'),
  (Join-Path $paths.AppFrontendDir 'favicon.ico')
) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

foreach ($candidate in $iconCandidates) {
  $resolved = $candidate
  if (-not [System.IO.Path]::IsPathRooted($resolved)) {
    $resolved = Join-Path $paths.Root $resolved
  }

  if (Test-Path $resolved) {
    $shortcut.IconLocation = $resolved
    break
  }
}

$shortcut.Save()

Write-Host 'ZS desktop shortcut installed successfully:'
Write-Host $shortcutPath
Write-Host "Shortcut URL: $appUrl"
if ($shortcut.IconLocation) {
  Write-Host "Icon: $($shortcut.IconLocation)"
} else {
  Write-Host 'Icon: default browser icon. Add portable\assets\zs.ico or set APP_ICON in portable\config\.env.offline to use a custom icon.'
}
