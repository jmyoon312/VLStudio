@echo off
setlocal enabledelayedexpansion
title ViraLoop Studio - One-Click Installer & Setup
echo ===================================================
echo   ViraLoop Studio - Initializing Environment...
echo ===================================================
echo.

:: 1. Node.js dependencies install
echo [*] Installing Node.js packages...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [!] npm install warning - proceeding with existing packages.
)

:: 2. Python Virtual Environment Check & Setup
echo [*] Checking Python Virtual Environment...
if not exist "venv\Scripts\python.exe" (
    echo [*] Creating virtual environment (venv)...
    python -m venv venv
)

:: 3. Python Requirements Install
echo [*] Installing Python requirements...
call venv\Scripts\pip.exe install -r apps\api\requirements.txt
call venv\Scripts\pip.exe install pydantic-settings "fastapi[standard]" requests

:: 4. Desktop Shortcut Creation (VBScript)
echo [*] Creating Desktop Shortcut...
set "TARGET_BAT=%~dp0ViraLoop Studio.bat"
set "ICON_PATH=%~dp0assets\icon.ico"
set "VBS_SCRIPT=%TEMP%\create_vlstudio_shortcut.vbs"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\ViraLoop Studio.lnk" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo oLink.TargetPath = "%TARGET_BAT%" >> "%VBS_SCRIPT%"
echo oLink.WorkingDirectory = "%~dp0" >> "%VBS_SCRIPT%"
if exist "%ICON_PATH%" (
    echo oLink.IconLocation = "%ICON_PATH%" >> "%VBS_SCRIPT%"
)
echo oLink.Description = "ViraLoop Studio - Sovereign AI Video Production Hub" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"

cscript //nologo "%VBS_SCRIPT%"
del "%VBS_SCRIPT%" 2>nul

echo.
echo ===================================================
echo   [SUCCESS] Setup Completed!
echo   A shortcut 'ViraLoop Studio' has been created on your Desktop.
echo ===================================================
echo.
pause
