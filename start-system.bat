@echo off
REM Start AI Audit System (Windows)
REM This script starts both frontend and backend in separate windows

echo.
echo AI-Powered Document Audit System - Startup Script
echo Starting Frontend and Backend...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed or not in PATH
    echo Please install Node.js v16+ from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found:
node --version
echo.

REM Start Backend
echo Starting Backend (Port 4000)...
echo.
start "AI Audit - Backend" cmd /k "cd backend && npm start"

REM Wait for backend to start
timeout /t 3 /nobreak

REM Start Frontend
echo Starting Frontend (Port 3000)...
echo.
start "AI Audit - Frontend" cmd /k "cd frontend && npm start"

echo.
echo System Started!
echo.
echo Frontend:  http://localhost:3000
echo Backend:   http://localhost:4000
echo API Docs:  http://localhost:4000/api/status
echo.
pause
