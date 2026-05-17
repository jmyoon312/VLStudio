@echo off
title ViraLoop Native Setup Launcher
cd /d "%~dp0"

echo ==========================================
echo    ViraLoop Native Setup Launcher         
echo ==========================================
echo.
echo [*] Bypassing PowerShell Execution Policy...
echo.

:: Use full path or explicit extension to avoid parsing issues
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "Sovereign_Native_Setup.ps1"

echo.
echo ==========================================
echo    Setup process finished.
echo    Please check for any error messages.
echo ==========================================
pause
