@echo off
title ViraLoop Studio - Setup
cd /d "%~dp0"

echo [*] Launching ViraLoop Studio Setup Engine...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Setup encountered an issue.
    pause
)
