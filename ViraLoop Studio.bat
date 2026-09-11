@echo off
setlocal enabledelayedexpansion
title ViraLoop Studio (Development Mode)

echo ===================================================
echo   ViraLoop Studio - Development Mode
echo   (Electron + Real-time HMR Dev Server)
echo ===================================================
echo.

set "ROOT_DIR=%~dp0"
set "PATH=%ROOT_DIR%runtime\adb;%ROOT_DIR%runtime\ffmpeg;%ROOT_DIR%runtime\ytdlp;%PATH%"

echo [*] Starting Python Backend on 0.0.0.0:8000...
start "ViraLoop FastAPI Backend" /min cmd /c "cd /d "%ROOT_DIR%apps\api" && "%ROOT_DIR%venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo [*] Launching ViraLoop Studio (Electron + Vite Dev at port 5183)...
echo [*] Local Access:  http://localhost:5183
echo [*] Remote Tunnel: https://viraloop.gogloo.gleeze.com
echo.

call npm run dev
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ===================================================
    echo [ERROR] ViraLoop Studio terminated unexpectedly!
    echo ===================================================
    pause
)
