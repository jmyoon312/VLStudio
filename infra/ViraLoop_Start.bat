@echo off
title ViraLoop_Main_Launcher
echo ==========================================================
echo    ViraLoop Sovereign Native - INITIALIZING...
echo ==========================================================

:: 1. Check/Request Administrator Privileges
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo [INFO] Requesting administrative privileges for system services...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin_start.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin_start.vbs"
    "%temp%\getadmin_start.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin_start.vbs" ( del "%temp%\getadmin_start.vbs" )
    pushd "%CD%"
    CD /D "C:\ViraLoopMedia\source"

:: 2. Launch the Unified PowerShell Engine
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\ViraLoopMedia\source\ViraLoop_Sovereign_Launcher.ps1"

pause
