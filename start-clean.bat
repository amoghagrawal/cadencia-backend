@echo off
echo Cadencia Backend Server Startup
echo ==============================

echo Checking for existing processes on port 3000...
node kill-port.js

echo Building TypeScript...
call npm run build

echo Starting server...
call npm run dev

echo Press Ctrl+C to stop the server when finished.
pause 