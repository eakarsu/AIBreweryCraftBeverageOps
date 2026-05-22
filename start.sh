#!/bin/bash

# ============================================================
# BrewOps AI - Brewery Operations Management System
# Start Script - Seeds database and launches application
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
AMBER='\033[0;33m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Project root directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo -e "${AMBER}${BOLD}"
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║                                                  ║"
echo "  ║     🍺  BrewOps AI  🍺                          ║"
echo "  ║     AI-Powered Brewery Operations                ║"
echo "  ║                                                  ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# ---- Step 1: Clean up used ports ----
echo -e "${CYAN}[1/6] Cleaning up ports 4200 and 4201...${NC}"

cleanup_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo -e "  ${YELLOW}Killing processes on port $port: $pids${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    else
        echo -e "  ${GREEN}Port $port is available${NC}"
    fi
}

cleanup_port 4200
cleanup_port 4201

# ---- Step 2: Load environment variables ----
echo -e "${CYAN}[2/6] Loading environment variables...${NC}"

if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
    echo -e "  ${GREEN}.env file loaded${NC}"
else
    echo -e "  ${RED}ERROR: .env file not found at $PROJECT_DIR/.env${NC}"
    echo -e "  ${YELLOW}Please create a .env file with the required configuration${NC}"
    exit 1
fi

# ---- Step 3: Check PostgreSQL ----
echo -e "${CYAN}[3/6] Checking PostgreSQL...${NC}"

if ! command -v psql &> /dev/null; then
    echo -e "  ${RED}ERROR: PostgreSQL is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -q 2>/dev/null; then
    echo -e "  ${YELLOW}PostgreSQL is not running. Attempting to start...${NC}"
    if command -v brew &> /dev/null; then
        brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
        sleep 2
    fi
    if ! pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -q 2>/dev/null; then
        echo -e "  ${RED}ERROR: Could not start PostgreSQL. Please start it manually.${NC}"
        exit 1
    fi
fi
echo -e "  ${GREEN}PostgreSQL is running${NC}"

# Create database if it doesn't exist
if ! psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-erolakarsu} -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME:-brewery_ops}"; then
    echo -e "  ${YELLOW}Creating database '${DB_NAME:-brewery_ops}'...${NC}"
    createdb -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-erolakarsu} "${DB_NAME:-brewery_ops}" 2>/dev/null || true
    echo -e "  ${GREEN}Database created${NC}"
else
    echo -e "  ${GREEN}Database '${DB_NAME:-brewery_ops}' exists${NC}"
fi

# ---- Step 4: Install dependencies ----
echo -e "${CYAN}[4/6] Installing dependencies...${NC}"

echo -e "  ${BLUE}Installing backend dependencies...${NC}"
cd "$BACKEND_DIR"
npm install --silent 2>&1 | tail -1

echo -e "  ${BLUE}Installing frontend dependencies...${NC}"
cd "$FRONTEND_DIR"
npm install --silent 2>&1 | tail -1

echo -e "  ${GREEN}Dependencies installed${NC}"

# ---- Step 5: Seed database ----
echo -e "${CYAN}[5/6] Seeding database with sample data...${NC}"

cd "$BACKEND_DIR"
node seed.js
echo -e "  ${GREEN}Database seeded successfully${NC}"

# ---- Step 6: Start application with hot reload ----
echo -e "${CYAN}[6/6] Starting application with hot reload...${NC}"

# Start backend with file watching (using node --watch)
cd "$BACKEND_DIR"
echo -e "  ${BLUE}Starting backend on port 4201 (with auto-reload)...${NC}"
NODE_ENV=development node --watch server.js &
BACKEND_PID=$!

# Give backend a moment to start
sleep 2

# Start frontend with Vite (has built-in HMR)
cd "$FRONTEND_DIR"
echo -e "  ${BLUE}Starting frontend on port 4200 (with HMR)...${NC}"
npx vite --host &
FRONTEND_PID=$!

# Trap to clean up on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down BrewOps AI...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    # Clean up any remaining processes on our ports
    cleanup_port 4200
    cleanup_port 4201
    echo -e "${GREEN}Goodbye! 🍻${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo ""
echo -e "${GREEN}${BOLD}  ✅ BrewOps AI is running!${NC}"
echo ""
echo -e "  ${CYAN}Frontend:${NC}  http://localhost:4200"
echo -e "  ${CYAN}Backend:${NC}   http://localhost:4201"
echo ""
echo -e "  ${AMBER}Login:${NC}     admin@brewery.com / brewery123"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for both processes
wait
