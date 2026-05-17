@echo off
title ViraLoop_Global_Slayer
echo ==========================================================
echo    ViraLoop Sovereign Native - GLOBAL SLAYER
echo ==========================================================

:: 1. Check/Request Administrator Privileges
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo [INFO] Requesting administrative privileges...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    CD /D "C:\ViraLoopMedia\source"

echo [1/3] Shuting down Database gracefully...
set PG_BIN=C:\ViraLoopMedia\bin\postgres\bin
set PG_DATA=C:\ViraLoopMedia\bin\postgres\data
"%PG_BIN%\pg_ctl.exe" stop -D "%PG_DATA%" -m fast -w >nul 2>&1

echo [2/3] Executing Total Process Wipe...
:: Kill Core Services
taskkill /f /im python.exe /t >nul 2>&1
taskkill /f /im node.exe /t >nul 2>&1
taskkill /f /im redis-server.exe /t >nul 2>&1
taskkill /f /im postgres.exe /t >nul 2>&1

:: Kill ViraLoop Independent UI Window (Chrome/Edge App Mode)
:: We use PowerShell to target only the ViraLoop app instance
powershell -Command "Get-CimInstance Win32_Process -Filter \"Name = 'chrome.exe' OR Name = 'msedge.exe'\" | Where-Object { $_.CommandLine -like '*--app=http://localhost:5173*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

:: Kill Launcher
taskkill /f /im powershell.exe /t >nul 2>&1

echo [3/3] Finalizing Cleanup...
if exist "%PG_DATA%\postmaster.pid" del /f /q "%PG_DATA%\postmaster.pid" >nul 2>&1

echo.
echo ==========================================================
echo    [SUCCESS] ALL ViraLoop processes (including UI) slain.
echo ==========================================================
echo.
timeout /t 2
exit
