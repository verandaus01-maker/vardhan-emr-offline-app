#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  NexaCare Pro — Mac Startup Script
#  Vardhan Hospital EMR System
#  Usage: bash start-mac.sh
#
#  Runs the server in this terminal window.
#  Keep this window open while the hospital is using the app.
# ─────────────────────────────────────────────────────────────────────────────

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

# Install npm dependencies if not present
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}► Installing dependencies...${NC}"
  npm install
fi

# Build the React app
echo ""
echo -e "${YELLOW}► Building app...${NC}"
npm run build

# Get local IP address (macOS)
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")

echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ Server is starting...                       ${NC}"
echo -e "${GREEN}                                                ${NC}"
echo -e "${GREEN}  App (React UI):  http://$LOCAL_IP:3000        ${NC}"
echo -e "${GREEN}  API Server:      http://$LOCAL_IP:3001        ${NC}"
echo -e "${GREEN}                                                ${NC}"
echo -e "  Doctor's Mac:   Open Chrome → ${BLUE}http://$LOCAL_IP:3000${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}  ⚠  Keep this window open while using the app.${NC}"
echo -e "  Press Ctrl+C to stop the server."
echo ""

# Run server directly in this terminal window
node server.cjs
