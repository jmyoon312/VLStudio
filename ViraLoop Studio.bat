@echo off
setlocal enabledelayedexpansion
title ViraLoop Studio

echo ===================================================
echo   ViraLoop Studio - Sovereign AI Video Production
echo ===================================================
echo.

set "ROOT_DIR=%~dp0"
set "PATH=%ROOT_DIR%runtime\adb;%ROOT_DIR%runtime\ffmpeg;%ROOT_DIR%runtime\ytdlp;%PATH%"

echo [*] Launching ViraLoop Studio (Electron + Web Dashboard at port 5183)...
echo [*] Local Access: http://localhost:5183
echo.

call npm run dev
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ===================================================
    echo [ERROR] ViraLoop Studio terminated unexpectedly!
    echo ===================================================
    pause
)
