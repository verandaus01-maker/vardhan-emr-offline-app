@echo off
REM ──────────────────────────────────────────────────────────────────────────
REM  NexaCare Pro — Windows Startup Script
REM  Vardhan Hospital EMR System
REM  Usage: Double-click start.bat  OR  run it in Command Prompt
REM
REM  Keep this window open while using the app.
REM  Press Ctrl+C to stop the server.
REM ──────────────────────────────────────────────────────────────────────────

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║       NexaCare Pro — Vardhan Hospital        ║
echo  ║          EMR Server Startup (Windows)        ║
echo  ╚══════════════════════════════════════════════╝
echo.

REM Check Node.js
node -v >nul 2>&1
if errorlevel 1 (
  echo  ERROR: Node.js not found.
  echo  Install from: https://nodejs.org
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  Node.js %NODE_VER% found

REM Install dependencies if needed
if not exist "node_modules\" (
  echo  Installing dependencies...
  npm install
)

REM Build the React app
echo.
echo  Building app...
npm run build
if errorlevel 1 (
  echo  ERROR: Build failed. See above for details.
  pause
  exit /b 1
)

echo.
echo  ================================================
echo   Server starting...
echo.
echo   Open Chrome and go to:
echo   http://localhost:3000
echo.
echo   Other devices on hospital Wi-Fi:
echo   Find this PC's IP (run: ipconfig) then open
echo   http://YOUR_IP:3000  in Chrome
echo  ================================================
echo.
echo   Keep this window open while using the app.
echo   Press Ctrl+C to stop.
echo.

REM Run server in this window
node server.cjs
pause
