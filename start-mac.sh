#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  NexaCare Pro — Mac Startup Script
#  Vardhan Hospital EMR System
#  Usage: bash start-mac.sh
#
#  Uses PM2 to keep the server running in the background.
#  Server survives Terminal close and auto-restarts on crash.
# ─────────────────────────────────────────────────────────────────────────────

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       NexaCare Pro — Vardhan Hospital        ║${NC}"
echo -e "${BLUE}║          EMR Server Startup (Mac)            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found.${NC}"
  echo "  Install from: https://nodejs.org"
  exit 1
fi

NODE_VER=$(node -v)
echo -e "${GREEN}✓ Node.js $NODE_VER${NC}"

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}► Installing PM2 (process manager)...${NC}"
  npm install -g pm2
fi
echo -e "${GREEN}✓ PM2 $(pm2 -v) ready${NC}"

# Check npm dependencies
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}► Installing dependencies...${NC}"
  npm install
fi

# Build the app
echo ""
echo -e "${YELLOW}► Building production app...${NC}"
npm run build

# Create logs directory
mkdir -p logs

# Stop existing PM2 process if running, then restart fresh
echo ""
echo -e "${YELLOW}► Starting server with PM2...${NC}"
pm2 delete nexacare 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

# Get local IP address (works on macOS)
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")

echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ Server running in background (PM2)          ${NC}"
echo -e "${GREEN}                                                ${NC}"
echo -e "${GREEN}  App (React UI):  http://$LOCAL_IP:3000        ${NC}"
echo -e "${GREEN}  API Server:      http://$LOCAL_IP:3001        ${NC}"
echo -e "${GREEN}                                                ${NC}"
echo -e "  Doctor's Mac:   Open Chrome → ${BLUE}http://$LOCAL_IP:3000${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Server keeps running even after you close this Terminal."
echo ""
echo -e "  Useful commands:"
echo -e "    ${YELLOW}pm2 status${NC}           — check if server is running"
echo -e "    ${YELLOW}pm2 logs nexacare${NC}    — view live server logs"
echo -e "    ${YELLOW}pm2 restart nexacare${NC} — restart after a code update"
echo -e "    ${YELLOW}pm2 stop nexacare${NC}    — stop the server"
echo ""
echo -e "  To auto-start on Mac reboot (run once):"
echo -e "    ${YELLOW}pm2 startup${NC}  ← run the command it prints"
echo ""
