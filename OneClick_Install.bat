@echo off
title ViraLoop Studio - One Click Web Installer
echo ===================================================
echo   ViraLoop Studio - Auto Installer Starting...
echo ===================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; irm https://raw.githubusercontent.com/jmyoon312/VLStudio/main/install.ps1 | iex"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Setup encountered an issue. Please run this batch file as Administrator.
    pause
)
