@echo off
title NexaCare Pro - Hospital Server
color 0A

echo.
echo ============================================================
echo   NexaCare Pro - Vardhan Hospital Server
echo   by NexaVoyagers Technologies Pvt. Ltd.
echo ============================================================
echo.
echo   NOTE: If running for the first time or IP 1.22.20.11
echo         is not yet configured, run SETUP-AND-START.bat
echo         as Administrator instead.
echo.

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
start "NexaCare Sync Server :3001" cmd /k "node server.cjs"
timeout /t 2 /nobreak >nul
echo        Sync server started.

echo [3/3] Starting App Server on port 3000...
if exist "node_modules\.bin\serve.cmd" (
    start "NexaCare App Server :3000" cmd /k "node_modules\.bin\serve dist -l 3000 -s"
) else (
    start "NexaCare App Server :3000" cmd /k "npx serve dist -l 3000 -s"
)
timeout /t 2 /nobreak >nul
echo        App server started.

echo.
echo ============================================================
echo   Servers are running!
echo.
echo   All hospital devices open:  http://1.22.20.11:3000
echo   Admin login:  admin / Vardhan@Hospital12*
echo.
echo   (If 1.22.20.11 not working, run SETUP-AND-START.bat
echo    as Administrator to configure the IP first)
echo ============================================================
echo.

pause
