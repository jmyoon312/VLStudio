@echo off
setlocal
title ViraLoop Studio
echo ===================================================
echo   ViraLoop Studio Launcher Starting...
echo ===================================================
echo.

set "ROOT_DIR=%~dp0"
set "PATH=%ROOT_DIR%runtime\adb;%ROOT_DIR%runtime\ffmpeg;%ROOT_DIR%runtime\ytdlp;%PATH%"

call npm run dev
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ===================================================
    echo [ERROR] ViraLoop Studio terminated unexpectedly!
    echo ===================================================
    echo.
    pause
)
