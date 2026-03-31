@echo off
title NexaCare Pro - Hospital Server
color 0A

echo.
echo ============================================================
echo   NexaCare Pro - Vardhan Hospital Server
echo   by NexaVoyagers Technologies Pvt. Ltd.
echo ============================================================
echo.

cd /d "%~dp0"

echo [0/4] Stopping any existing NexaCare processes...
taskkill /f /fi "WINDOWTITLE eq NexaCare*" >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo        Done.

echo [1/4] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo        Node.js found.

echo [2/4] Getting latest updates from internet...
git pull >nul 2>&1
if errorlevel 1 (
    echo        (No internet or git not set up - using existing code)
) else (
    echo        Code updated.
)

echo [3/4] Starting Central Sync Server on port 3001...
start "NexaCare Sync Server :3001" cmd /c ":loop & node server.cjs & goto loop"
timeout /t 3 /nobreak >nul
echo        Sync server started.

echo [4/4] Starting App Server on port 3000...
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
echo   Also try:                   http://192.168.1.131:3000
echo   Admin login:  admin / Vardhan@Hospital12*
echo ============================================================
echo.

pause
