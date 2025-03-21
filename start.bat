@echo off
echo Starting Cadencia Backend Server and Test Client

:: Ensure .env file exists
if not exist .env (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo Please open .env file and update the GROQ_API_KEY with your actual API key.
    pause
)

:: Install dependencies if needed
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)

:: Build the TypeScript code
echo Building TypeScript...
call npm run build

:: Start the server in a new terminal window
echo Starting server...
start cmd /k "cd %~dp0 && npm run dev"

:: Wait for the server to start
echo Waiting for server to start...
timeout /t 8 /nobreak > nul

:: Start the client in this terminal window
echo Starting test client...
call npm run client

:: End
echo End of script
echo When finished testing, close all terminal windows to shut down the server. 