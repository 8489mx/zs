# Launch Sunmi V2 Pro ECR Simulator
$ErrorActionPreference = 'Continue'

$ADB = "C:\platform-tools\adb.exe"
$DEVICE = "V23719CR00975"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Z-Systems ECR Virtual POS Terminal     " -ForegroundColor Yellow
Write-Host "   Emulating PAX & Geidea Protocols       " -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Reverse port for Sunmi USB access and setup LAN forwarders
if (Test-Path $ADB) {
    Write-Host "[1/3] Configuring ADB port reverse and LAN listeners on Sunmi V2 Pro..." -ForegroundColor Gray
    & $ADB -s $DEVICE reverse tcp:3344 tcp:3344
    & $ADB -s $DEVICE shell input keyevent KEYCODE_WAKEUP
    
    # Forward ports on Sunmi (192.168.1.3) to PC (192.168.1.98)
    & $ADB -s $DEVICE shell "pkill -f 'nc -L' 2>/dev/null; nohup toybox nc -L -p 10009 toybox nc 192.168.1.98 10009 >/dev/null 2>&1 & nohup toybox nc -L -p 8080 toybox nc 192.168.1.98 8080 >/dev/null 2>&1 &"
    
    # Launch Kiwi Browser on Sunmi screen
    Write-Host "[2/3] Launching Terminal UI on Sunmi V2 Pro screen..." -ForegroundColor Green
    & $ADB -s $DEVICE shell am start -n com.kiwibrowser.browser/com.google.android.apps.chrome.Main -d "http://localhost:3344"
} else {
    Write-Host "[!] ADB binary not found, skipping Sunmi auto-launch" -ForegroundColor Yellow
}

# 2. Start Node.js Simulator Server
Write-Host "[3/3] Starting ECR Simulator Server..." -ForegroundColor Green
Write-Host " - PAX TCP Port    : 10009" -ForegroundColor White
Write-Host " - Geidea HTTP Port: 8080" -ForegroundColor White
Write-Host " - Sunmi Web UI    : http://localhost:3344 (or http://192.168.1.98:3344)" -ForegroundColor White
Write-Host "Press Ctrl+C to stop.`n" -ForegroundColor DarkGray

node "$PSScriptRoot\simulator-server.js"
