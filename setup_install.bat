@echo off
setlocal enabledelayedexpansion
title ViraLoop Studio - One-Click Full Environment Auto-Installer
echo ===================================================
echo   ViraLoop Studio - Environment Setup
echo ===================================================
echo.

:: 1. Check & Auto-Install Python (3.11)
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Python is not installed or not in PATH.
    echo [*] Attempting to install Python via winget (Windows Package Manager)...
    winget install --id Python.Python.3.11 -e --source winget --accept-package-agreements --accept-source-agreements
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Winget failed to install Python automatically.
        echo Please manually download and install Python 3.11 (check 'Add python.exe to PATH'):
        echo https://www.python.org/downloads/release/python-3119/
        echo.
        pause
        exit /b 1
    )
    echo [*] Python installed! Refreshing PATH environment...
    set "PATH=C:\Program Files\Python311;C:\Program Files\Python311\Scripts;%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"
) else (
    echo [OK] Python is already installed.
)

:: 2. Check & Auto-Install Node.js (LTS)
call npm --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Node.js / npm is not installed or not in PATH.
    echo [*] Attempting to install Node.js via winget...
    winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Winget failed to install Node.js automatically.
        echo Please manually download and install Node.js LTS:
        echo https://nodejs.org/
        echo.
        pause
        exit /b 1
    )
    echo [*] Node.js installed! Refreshing PATH environment...
    set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
) else (
    echo [OK] Node.js / npm is already installed.
)

:: 3. Node.js dependencies install
echo.
echo [*] Installing Node.js packages (npm install)...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [!] npm install returned warning/error - proceeding.
)

:: 4. Python Virtual Environment Check & Setup
echo.
echo [*] Checking Python Virtual Environment...
if not exist "venv\Scripts\python.exe" (
    echo [*] Creating virtual environment (venv)...
    python -m venv venv
)

:: 5. Python Requirements Install
echo.
echo [*] Installing Python requirements...
call venv\Scripts\pip.exe install -r apps\api\requirements.txt
call venv\Scripts\pip.exe install pydantic-settings "fastapi[standard]" requests

:: 6. Windows Firewall Port Allow (5183, 8000)
echo.
echo [*] Configuring Windows Firewall for LAN Access (5183, 8000)...
netsh advfirewall firewall add rule name="VLStudio Vite 5183" dir=in action=allow protocol=TCP localport=5183 >nul 2>&1
netsh advfirewall firewall add rule name="VLStudio FastAPI 8000" dir=in action=allow protocol=TCP localport=8000 >nul 2>&1

:: 7. Desktop Shortcut Creation (VBScript)
echo.
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
echo   [SUCCESS] Full Setup Completed!
echo   A shortcut 'ViraLoop Studio' has been created on your Desktop.
echo ===================================================
echo.
pause
