@echo off
title NexaCare Pro - Full Setup & Start
color 0A
setlocal

echo.
echo ============================================================
echo   NexaCare Pro - Vardhan Hospital
echo   One-Click Setup and Server Start
echo ============================================================
echo.

:: ── Must run as Administrator ────────────────────────────────────────────────
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo   ERROR: This script must be run as Administrator.
    echo.
    echo   RIGHT-CLICK this file and choose "Run as administrator"
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"

:: ── Step 1: Check Node.js ─────────────────────────────────────────────────
echo [STEP 1/4]  Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Node.js not found. Install from https://nodejs.org then re-run.
    pause
    exit /b 1
)
for /f %%v in ('node --version') do echo   Node.js %%v found.

:: ── Step 2: Assign static IP 1.22.20.11 to the Ethernet adapter ────────────
echo.
echo [STEP 2/4]  Configuring static IP 1.22.20.11 on the network adapter...
echo.

:: Check if 1.22.20.11 is already assigned
ipconfig | findstr /C:"1.22.20.11" >nul 2>&1
if %errorLevel% EQU 0 (
    echo   IP 1.22.20.11 is already configured. Skipping.
) else (
    echo   Adding IP address 1.22.20.11 to Ethernet adapter...
    netsh interface ipv4 add address "Ethernet" 1.22.20.11 255.255.255.0 >nul 2>&1
    if errorlevel 1 (
        echo   First attempt failed, trying with adapter name "Local Area Connection"...
        netsh interface ipv4 add address "Local Area Connection" 1.22.20.11 255.255.255.0 >nul 2>&1
    )
    :: Verify it was added
    timeout /t 1 /nobreak >nul
    ipconfig | findstr /C:"1.22.20.11" >nul 2>&1
    if %errorLevel% EQU 0 (
        echo   SUCCESS: 1.22.20.11 is now active on this PC.
    ) else (
        echo.
        echo   Could not add IP automatically. Trying PowerShell method...
        powershell -Command "Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | Select-Object -First 1 | ForEach-Object { New-NetIPAddress -InterfaceIndex $_.ifIndex -IPAddress '1.22.20.11' -PrefixLength 24 -ErrorAction SilentlyContinue }" >nul 2>&1
        timeout /t 1 /nobreak >nul
        ipconfig | findstr /C:"1.22.20.11" >nul 2>&1
        if %errorLevel% EQU 0 (
            echo   SUCCESS: 1.22.20.11 is now active on this PC.
        ) else (
            echo.
            echo   *** MANUAL STEP NEEDED - takes 2 minutes ***
            echo.
            echo   Open: Control Panel ^> Network Connections
            echo   Right-click Ethernet ^> Properties ^> Internet Protocol Version 4 (TCP/IPv4)
            echo   Click Properties ^> Advanced ^> IP Addresses ^> Add
            echo   IP: 1.22.20.11    Subnet: 255.255.255.0    Click Add ^> OK ^> OK
            echo.
            echo   Then press any key to continue...
            pause
        )
    )
)

:: ── Step 3: Open firewall ports ──────────────────────────────────────────────
echo.
echo [STEP 3/4]  Opening Windows Firewall for ports 3000 and 3001...

netsh advfirewall firewall show rule name="NexaCare App Port 3000" >nul 2>&1
if errorlevel 1 (
    netsh advfirewall firewall add rule name="NexaCare App Port 3000" dir=in action=allow protocol=tcp localport=3000 >nul 2>&1
    echo   Firewall: port 3000 opened.
) else (
    echo   Firewall: port 3000 already open.
)

netsh advfirewall firewall show rule name="NexaCare Sync Port 3001" >nul 2>&1
if errorlevel 1 (
    netsh advfirewall firewall add rule name="NexaCare Sync Port 3001" dir=in action=allow protocol=tcp localport=3001 >nul 2>&1
    echo   Firewall: port 3001 opened.
) else (
    echo   Firewall: port 3001 already open.
)

:: ── Step 4: Start servers ────────────────────────────────────────────────────
echo.
echo [STEP 4/4]  Starting NexaCare servers...

:: Kill any existing instances
taskkill /f /fi "WINDOWTITLE eq NexaCare Sync*" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq NexaCare App*" >nul 2>&1
timeout /t 1 /nobreak >nul

:: Start sync server (port 3001)
start "NexaCare Sync Server :3001" cmd /k "cd /d %~dp0 && echo NexaCare Sync Server - DO NOT CLOSE && echo. && node server.cjs"
timeout /t 3 /nobreak >nul

:: Start app server (port 3000) - try serve package, fallback to npx
if exist "node_modules\.bin\serve.cmd" (
    start "NexaCare App Server :3000" cmd /k "cd /d %~dp0 && echo NexaCare App Server - DO NOT CLOSE && echo. && node_modules\.bin\serve dist -l 3000 -s"
) else (
    start "NexaCare App Server :3000" cmd /k "cd /d %~dp0 && echo NexaCare App Server - DO NOT CLOSE && echo. && npx serve dist -l 3000 -s"
)
timeout /t 3 /nobreak >nul

:: ── Done ─────────────────────────────────────────────────────────────────────
echo.
echo ============================================================
echo   ALL DONE - NexaCare Pro is running
echo ============================================================
echo.
echo   DEVICE ACCESS URLS:
echo.
echo   [THIS PC / Hospital PC]
echo     http://localhost:3000
echo     http://1.22.20.11:3000
echo.
echo   [PHONES / LAPTOPS on HOSPITAL WiFi]
echo     http://192.168.1.131:3000
echo.
echo   [REMOTE ACCESS from outside hospital]
echo     http://1.22.20.11:3000
echo.
echo   Admin login:
echo     Username : admin
echo     Password : Vardhan@Hospital12*
echo.
echo   Two server windows are now open (minimised).
echo   KEEP THEM OPEN - closing them stops the app.
echo.
echo ============================================================
echo   FIRST TIME SETUP - DATA MIGRATION (do once)
echo ============================================================
echo.
echo   If your old data was in localhost:3000, do this ONCE:
echo.
echo   STEP A: Open http://localhost:3000 in browser on this PC
echo           Login ^> Settings ^> scroll to "Central Server Sync"
echo           Click "Push All Data to Server"
echo           Wait for it to finish (may take a few minutes)
echo.
echo   STEP B: On any other device, open http://192.168.1.131:3000
echo           Login ^> Settings ^> Click "Pull All Data from Server"
echo           OR just log in — it auto-pulls on first login
echo.
echo ============================================================
echo.

:: Quick connectivity test
echo   Testing server health...
timeout /t 2 /nobreak >nul
curl -s http://1.22.20.11:3001/api/health >nul 2>&1
if %errorLevel% EQU 0 (
    echo   Sync server at 1.22.20.11:3001 - RESPONDING OK
) else (
    echo   Sync server starting up... (wait 5 seconds and try http://1.22.20.11:3001/api/health in browser)
)

echo.
pause
