@echo off
setlocal enabledelayedexpansion
title ViraLoop Studio (Production Mode)

echo ===================================================
echo   ViraLoop Studio - High Performance Production
echo   (FastAPI Backend + Optimized Web Dashboard)
echo ===================================================
echo.

set "ROOT_DIR=%~dp0"
set "PATH=%ROOT_DIR%runtime\adb;%ROOT_DIR%runtime\ffmpeg;%ROOT_DIR%runtime\ytdlp;%PATH%"

echo [*] Starting Python Backend on 0.0.0.0:8000...
start "ViraLoop FastAPI Backend" /min cmd /c "cd /d "%ROOT_DIR%apps\api" && "%ROOT_DIR%venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

timeout /t 2 /nobreak >nul

echo [*] Starting High-Performance Dashboard Server (Port 5183)...
echo [*] Local Access:  http://localhost:5183
echo [*] Remote Tunnel: https://viraloop.gogloo.gleeze.com
echo.

call npm run preview:dashboard
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ===================================================
    echo [ERROR] Dashboard server stopped unexpectedly!
    echo ===================================================
    pause
)
