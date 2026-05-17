@echo off
setlocal
title ViraLoop Native - OneClick Setup

echo ======================================================
echo    ViraLoop Sovereign Intelligence - Windows Setup
echo ======================================================
echo.

:: 1. Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.12 or higher from python.org
    pause
    exit /b 1
)

:: 2. Create Virtual Environment
if not exist "venv" (
    echo [Setup] Creating Virtual Environment...
    python -m venv venv
) else (
    echo [Setup] Virtual Environment already exists.
)

:: 3. Install Python Dependencies
echo [Setup] Installing/Updating Python Packages...
call venv\Scripts\activate
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install python dependencies.
    pause
    exit /b 1
)

:: 4. Setup .env file
if not exist ".env" (
    echo [Setup] Creating .env from example...
    copy .env.example .env
    echo [IMPORTANT] Please edit .env and add your API keys!
)

:: 5. Dashboard Setup (Node.js)
echo [Setup] Checking for Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Node.js is not installed. Dashboard setup skipped.
    echo Please install Node.js (LTS) to run the UI.
) else (
    echo [Setup] Installing Dashboard Dependencies...
    cd apps\dashboard
    call npm install
    cd ..\..
)

echo.
echo ======================================================
echo    Setup Complete! 
echo    1. Edit the .env file in the source folder.
echo    2. Use ViraLoop_Start.bat to launch the system.
echo ======================================================
pause
