# Antigravity Data Saver Setup Script
param(
    [string]$TargetFolder = "."
)

$ResolvedPath = (Resolve-Path $TargetFolder).Path
Write-Host "Target Folder: $ResolvedPath" -ForegroundColor Cyan

$IgnoreContent = @'
# ==============================================================================
# Global Ignore Rules for Language Servers & AI Tooling (Low-Data Mode)
# ==============================================================================
portable/**
portable/
safe_backup_data/**
safe_backup_data/
scripts/dev/.runtime/**
scripts/dev/.state/**
backend/runtime/**

node_modules/**
**/node_modules/**
**/dist/**
**/build/**
**/.vite/**
**/dev-dist/**
**/.vitest-cache/**

frontend/android/**
frontend/portable_data/**
frontend/electron/backend/portable_data/**

backend/uploads/**
backend/storage/**
storage/**

release/**
releases/**
*.exe
*.dll
*.apk
*.aab
*.zip
*.tar.gz
*.tgz
*.iso
*.msi

*.db
*.db-wal
*.db-shm
*.sqlite
*.sql

*.log
logs/**
backend-log/**
errors/**
**/test-results/**
**/coverage/**
**/*.tsbuildinfo
.git/**
'@

$GeminiIgnorePath = Join-Path $ResolvedPath ".geminiignore"
$CursorIgnorePath = Join-Path $ResolvedPath ".cursorignore"
$IgnorePath       = Join-Path $ResolvedPath ".ignore"

[System.IO.File]::WriteAllText($GeminiIgnorePath, $IgnoreContent, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($CursorIgnorePath, $IgnoreContent, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($IgnorePath,       $IgnoreContent, [System.Text.Encoding]::UTF8)

Write-Host "[+] Created: .geminiignore, .cursorignore, .ignore" -ForegroundColor Green

$VscodeDir = Join-Path $ResolvedPath ".vscode"
if (!(Test-Path $VscodeDir)) {
    New-Item -ItemType Directory -Path $VscodeDir -Force | Out-Null
}

$VscodeSettings = @'
{
  "git.autofetch": false,
  "extensions.autoUpdate": false,
  "extensions.autoCheckUpdates": false,
  "update.mode": "manual",
  "telemetry.telemetryLevel": "off",
  "npm.fetchOnlinePackageInfo": false,
  "typescript.tsserver.experimental.enableProjectDiagnostics": false,
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/.git/subtree-cache/**": true,
    "**/node_modules/**": true,
    "**/portable/**": true,
    "**/safe_backup_data/**": true,
    "**/scripts/dev/.runtime/**": true,
    "**/scripts/dev/.state/**": true,
    "**/backend/runtime/**": true,
    "**/backend/uploads/**": true,
    "**/backend/storage/**": true,
    "**/frontend/android/**": true,
    "**/frontend/portable_data/**": true,
    "**/dist/**": true,
    "**/build/**": true,
    "**/.vite/**": true,
    "**/*.log": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/bower_components": true,
    "**/*.code-search": true,
    "**/portable/**": true,
    "**/safe_backup_data/**": true,
    "**/scripts/dev/.runtime/**": true,
    "**/scripts/dev/.state/**": true,
    "**/backend/runtime/**": true,
    "**/backend/uploads/**": true,
    "**/backend/storage/**": true,
    "**/frontend/android/**": true,
    "**/frontend/portable_data/**": true,
    "**/dist/**": true,
    "**/build/**": true,
    "**/.vite/**": true,
    "**/release/**": true,
    "**/releases/**": true,
    "**/*.log": true
  }
}
'@

$SettingsFile = Join-Path $VscodeDir "settings.json"
[System.IO.File]::WriteAllText($SettingsFile, $VscodeSettings, [System.Text.Encoding]::UTF8)
Write-Host "[+] Created: .vscode/settings.json" -ForegroundColor Green

$UpdaterPath = "$env:LOCALAPPDATA\antigravity-updater\installer.exe"
if (Test-Path $UpdaterPath) {
    Remove-Item -Path $UpdaterPath -Force -ErrorAction SilentlyContinue
    Write-Host "[+] Removed background installer cache (165MB)" -ForegroundColor Green
}

Write-Host "Success! Low-data mode configured." -ForegroundColor Green
