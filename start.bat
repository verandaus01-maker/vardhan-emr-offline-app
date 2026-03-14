@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

REM ─── Check / request Administrator privileges ──────────────────────────────
REM Port 80 requires admin. If not admin, re-launch this script elevated.
net session >nul 2>&1
if NOT errorlevel 1 goto :admin_ok

echo Requesting Administrator privileges (needed for port 80)...
powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
exit /b

:admin_ok

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║       NexaCare Pro — Vardhan Hospital        ║
echo  ║            EMR Server Startup                ║
echo  ╚══════════════════════════════════════════════╝
echo.

REM ─── Check Node.js ────────────────────────────────────────────────────────
node -v >nul 2>&1
if errorlevel 1 (
  echo  ERROR: Node.js not found.
  echo  Install from: https://nodejs.org
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  Node.js %NODE_VER% found.

REM ─── Check Git ────────────────────────────────────────────────────────────
git --version >nul 2>&1
if errorlevel 1 (
  echo  WARNING: Git not found. Auto-updates from Hyderabad will not work.
  echo  Install Git from: https://git-scm.com
) else (
  echo  Git found.
)

REM ─── Open Windows Firewall for ports 80, 3000, 3001 ──────────────────────
echo  Opening firewall ports...
netsh advfirewall firewall delete rule name="NexaCare Port 80"  >nul 2>&1
netsh advfirewall firewall delete rule name="NexaCare Port 3000" >nul 2>&1
netsh advfirewall firewall delete rule name="NexaCare Port 3001" >nul 2>&1
netsh advfirewall firewall add rule name="NexaCare Port 80"   protocol=TCP dir=in localport=80   action=allow >nul 2>&1
netsh advfirewall firewall add rule name="NexaCare Port 3000" protocol=TCP dir=in localport=3000 action=allow >nul 2>&1
netsh advfirewall firewall add rule name="NexaCare Port 3001" protocol=TCP dir=in localport=3001 action=allow >nul 2>&1
echo  Firewall ports 80, 3000, 3001 opened.

REM ─── Install dependencies if missing ─────────────────────────────────────
if not exist "node_modules\" (
  echo.
  echo  Installing dependencies (first time only)...
  npm install
  if errorlevel 1 (
    echo  ERROR: npm install failed.
    pause
    exit /b 1
  )
)

REM ─── Initial build if dist/ is missing ───────────────────────────────────
if not exist "dist\" (
  echo.
  echo  Building app for the first time...
  npm run build
  if errorlevel 1 (
    echo  ERROR: Build failed. See above for details.
    pause
    exit /b 1
  )
)

REM ══════════════════════════════════════════════════════════════════════════
REM  AUTO-RESTART LOOP
REM  - Pulls latest code from GitHub (updates pushed from Hyderabad)
REM  - Rebuilds only if new code was pulled
REM  - Restarts server if it exits (crashes or update command)
REM  Keep this window open while the hospital is using the app.
REM  Press Ctrl+C to stop completely.
REM ══════════════════════════════════════════════════════════════════════════
:restart_loop

echo.
echo  ─────────────────────────────────────────────────
echo  Checking for updates from Hyderabad...
echo  ─────────────────────────────────────────────────

git pull origin claude/verify-local-deployment-09Im8 > "%TEMP%\emr_pull.txt" 2>&1
findstr /i "Updating Fast-forward" "%TEMP%\emr_pull.txt" >nul 2>&1
if NOT errorlevel 1 (
  echo  New update found! Rebuilding app...
  npm run build
  if errorlevel 1 (
    echo  ERROR: Rebuild failed. Running old version.
  ) else (
    echo  Rebuild complete.
  )
) else (
  echo  Already up to date.
)
del "%TEMP%\emr_pull.txt" >nul 2>&1

echo.
echo  ════════════════════════════════════════════════════
echo.
echo    HOSPITAL STAFF — Open Chrome and go to:
echo.
echo        http://1.22.20.11
echo.
echo    Works on hospital WiFi AND mobile data (4G/5G)
echo.
echo    (Old links still work: http://1.22.20.11:3000 )
echo.
echo  ════════════════════════════════════════════════════
echo.
echo   Keep this window open. Press Ctrl+C to stop.
echo.

node server.cjs

echo.
echo  Server stopped. Restarting in 5 seconds...
echo  (Close this window or press Ctrl+C to stop.)
timeout /t 5 /nobreak >nul 2>&1
goto :restart_loop
