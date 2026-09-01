@echo off
setlocal enabledelayedexpansion
title ViraLoop Studio - High Performance Web Server

echo ===================================================
echo   ViraLoop Studio - High Performance Web Server
echo   (Optimized Production Build for Tunnel/Web)
echo ===================================================
echo.

set "ROOT_DIR=%~dp0"
set "PATH=%ROOT_DIR%runtime\adb;%ROOT_DIR%runtime\ffmpeg;%ROOT_DIR%runtime\ytdlp;%PATH%"

echo [*] Step 1/3: Checking & Building Dashboard Assets...
call npm run build:dashboard
if %ERRORLEVEL% NEQ 0 (
    echo [!] Build failed, continuing with existing dist...
)

echo.
echo [*] Step 2/3: Starting Python Backend (FastAPI on 0.0.0.0:8000)...
start "ViraLoop FastAPI Backend" /min cmd /c "cd /d "%ROOT_DIR%apps\api" && "%ROOT_DIR%venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo.
echo [*] Step 3/3: Launching Production Dashboard Server (Port 5183)...
echo [*] Local URL:   http://localhost:5183
echo [*] Tunnel URL:  https://viraloop.gogloo.gleeze.com
echo.
echo ===================================================
echo Server is running! Keep this window open.
echo Press Ctrl+C to stop.
echo ===================================================
echo.

call npm run preview:dashboard
pause
