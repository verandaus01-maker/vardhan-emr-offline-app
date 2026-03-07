@echo off
title NexaCare Pro - Hospital Server
color 0A

echo.
echo ============================================================
echo   NexaCare Pro - Vardhan Hospital Server
echo   by NexaVoyagers Technologies Pvt. Ltd.
echo ============================================================
echo.

:: Navigate to app directory - CHANGE THIS PATH if needed
cd /d "%~dp0"

echo [1/3] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo        Node.js found.

echo [2/3] Starting Central Sync Server on port 3001...
start "NexaCare Sync Server" /min cmd /c "node server.cjs 2>&1 | tee sync-server.log"
timeout /t 2 /nobreak >nul
echo        Sync server started (check sync-server.log for details)

echo [3/3] Starting App Server on port 3000...
start "NexaCare App Server" /min cmd /c "node node_modules\serve\build\main.js dist -l 3000 -s 2>&1 | tee app-server.log"
timeout /t 2 /nobreak >nul
echo        App server started (check app-server.log for details)

echo.
echo ============================================================
echo   Servers are running!
echo.
echo   App:         http://localhost:3000
echo   Sync API:    http://localhost:3001
echo   Health:      http://localhost:3001/api/health
echo.
echo   From other devices on the network, replace 'localhost'
echo   with this computer's IP address (e.g., 192.168.1.X)
echo.
echo   To find your IP address, open a new command prompt
echo   and type:  ipconfig
echo   Look for "IPv4 Address" under your network adapter.
echo ============================================================
echo.
echo   Close this window to STOP both servers.
echo   (Each server runs in its own minimised window.)
echo.

pause
