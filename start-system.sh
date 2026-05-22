#!/bin/bash
# Start AI Audit System (Linux/Mac)
# This script starts both frontend and backend in the background

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  AI-Powered Document Audit System - Startup Script        ║"
echo "║  Starting Frontend and Backend...                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "✗ Node.js is not installed or not in PATH"
    echo "Please install Node.js v16+ from https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js found: $(node --version)"
echo ""

# Check if PostgreSQL is running (optional but recommended)
if command -v psql &> /dev/null; then
    echo "✓ PostgreSQL client found"
else
    echo "⚠ PostgreSQL client not found - make sure PostgreSQL server is running"
fi
echo ""

# Start Backend
echo "Starting Backend (Port 4000)..."
cd "backend" || exit
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 3

# Return to root
cd ..

# Start Frontend
echo "Starting Frontend (Port 3000)..."
cd "frontend" || exit
npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  System Started!                                           ║"
echo "║                                                            ║"
echo "║  Frontend:  http://localhost:3000                         ║"
echo "║  Backend:   http://localhost:4000                         ║"
echo "║  API Docs:  http://localhost:4000/api/status              ║"
echo "║                                                            ║"
echo "║  Demo Login:                                              ║"
echo "║  Email: admin@example.com                                 ║"
echo "║  Pass:  password123                                       ║"
echo "║                                                            ║"
echo "║  Logs:                                                    ║"
echo "║  tail -f backend.log                                      ║"
echo "║  tail -f frontend.log                                     ║"
echo "║                                                            ║"
echo "║  To stop servers:                                         ║"
echo "║  kill $BACKEND_PID                                        ║"
echo "║  kill $FRONTEND_PID                                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Keep script running
wait
