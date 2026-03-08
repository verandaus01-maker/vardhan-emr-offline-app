#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  NexaCare Pro — Mac Startup Script
#  Vardhan Hospital EMR System
#  Usage: bash start-mac.sh
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

# Check npm dependencies
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}► Installing dependencies...${NC}"
  npm install
fi

# Build the app
echo ""
echo -e "${YELLOW}► Building production app...${NC}"
npm run build

echo ""
echo -e "${YELLOW}► Starting servers...${NC}"

# Get local IP address (works on macOS)
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")

echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  App (React UI):  http://$LOCAL_IP:3000${NC}"
echo -e "${GREEN}  API Server:      http://$LOCAL_IP:3001${NC}"
echo ""
echo -e "  Doctor's Mac:   Open Chrome → http://$LOCAL_IP:3000${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Press ${RED}Ctrl+C${NC} to stop the servers"
echo ""

# Start the server (runs both ports)
node server.cjs
