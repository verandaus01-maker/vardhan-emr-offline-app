# NexaCare Pro - Vardhan Hospital EMR
# PowerShell startup script
# Run as: powershell -ExecutionPolicy Bypass -File start.ps1

Set-Location -Path $PSScriptRoot

# --- Require Admin (needed for port 80 and firewall) ---
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Requesting administrator privileges (needed for port 80)..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "    NexaCare Pro - Vardhan Hospital EMR" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

# --- Check Node.js ---
try {
    $nodeVer = & node -v 2>&1
    Write-Host "  Node.js $nodeVer found." -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# --- Check Git ---
$gitFound = $false
try {
    & git --version 2>&1 | Out-Null
    $gitFound = $true
    Write-Host "  Git found." -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Git not found - auto-updates will not work." -ForegroundColor Yellow
}

# --- Open Windows Firewall for ports 80, 3000, 3001 ---
Write-Host "  Opening firewall ports..."
foreach ($port in @(80, 3000, 3001)) {
    netsh advfirewall firewall delete rule name="NexaCare-$port" 2>&1 | Out-Null
    netsh advfirewall firewall add rule name="NexaCare-$port" protocol=TCP dir=in localport=$port action=allow 2>&1 | Out-Null
}
Write-Host "  Firewall ports 80, 3000, 3001 opened." -ForegroundColor Green

# --- Install node_modules if missing ---
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing packages (first time only)..." -ForegroundColor Yellow
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: npm install failed." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# --- Initial build if dist missing ---
if (-not (Test-Path "dist")) {
    Write-Host "  Building app for first time..." -ForegroundColor Yellow
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Build failed." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# --- Get local LAN IP for display ---
$lanIp = try {
    (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
        Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
        Select-Object -First 1).IPAddress
} catch { "this-PC" }

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "   HOSPITAL STAFF - Open Chrome and go to:" -ForegroundColor White
Write-Host ""
Write-Host "     http://$lanIp" -ForegroundColor Yellow
Write-Host "     http://$lanIp`:3000  (if above fails)" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Works on ALL devices on hospital WiFi" -ForegroundColor Green
Write-Host "   Keep this window open. Ctrl+C to stop." -ForegroundColor White
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

# --- Restart loop: pull updates and run server ---
while ($true) {
    if ($gitFound) {
        Write-Host "  Checking for updates..." -ForegroundColor Gray
        $pullOutput = & git pull origin claude/verify-local-deployment-09Im8 2>&1
        if ($pullOutput -match "Updating|Fast-forward") {
            Write-Host "  New update found! Rebuilding..." -ForegroundColor Yellow
            & npm run build
        }
    }

    Write-Host "  Starting server..." -ForegroundColor Green
    & node server.cjs

    Write-Host ""
    Write-Host "  Server stopped. Restarting in 5 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}
