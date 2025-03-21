@echo off
echo Cadencia Backend Server Restart Utility
echo =====================================

echo Checking for existing processes on port 3000...
node kill-port.js

echo Waiting for processes to terminate completely...
timeout /t 2 /nobreak >nul

echo Building TypeScript code...
call npm run build

echo Clearing any existing errors...
if exist ".\tmp" rmdir /s /q ".\tmp"
if exist ".\logs\error.log" del /q ".\logs\error.log"

echo Starting server...
start "Cadencia Server" cmd /c "npm run dev"

echo Waiting for server to initialize...
timeout /t 5 /nobreak >nul

echo Starting test client in a new window...
start "Cadencia Client" cmd /c "npm run client"

echo.
echo The server and client have been started in separate windows.
echo Press any key to exit this window (server and client will continue running)...
pause >nul 