@echo off
setlocal enabledelayedexpansion
title ViraLoop Studio - Universal Auto Installer
echo ===================================================
echo   ViraLoop Studio - Universal Environment Setup
echo ===================================================
echo.

set "TEMP_DIR=%TEMP%\vlstudio_installer"
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

:: 1. Check Node.js
if not exist "C:\Program Files\nodejs\node.exe" (
    echo [*] Node.js is not found. Downloading official Node.js installer...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi', '%TEMP_DIR%\nodejs.msi')"
    echo [*] Installing Node.js (Please wait 10-20 seconds)...
    start /wait msiexec /i "%TEMP_DIR%\nodejs.msi" /quiet /norestart
    echo [*] Node.js installed.
) else (
    echo [OK] Node.js is already installed.
)
set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"

:: 2. Check Python 3.11
if not exist "C:\Program Files\Python311\python.exe" (
    if not exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
        echo [*] Python 3.11 is not found. Downloading official Python installer...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe', '%TEMP_DIR%\python_installer.exe')"
        echo [*] Installing Python 3.11 (Please wait 15-30 seconds)...
        start /wait "%TEMP_DIR%\python_installer.exe" /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
        echo [*] Python 3.11 installed.
    )
) else (
    echo [OK] Python 3.11 is already installed.
)
set "PATH=C:\Program Files\Python311;C:\Program Files\Python311\Scripts;%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"

:: 3. Determine python and npm executable paths
set "NPM_CMD=npm"
if exist "C:\Program Files\nodejs\npm.cmd" set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"

set "PY_CMD=python"
if exist "C:\Program Files\Python311\python.exe" set "PY_CMD=C:\Program Files\Python311\python.exe"
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"

:: 4. Verify Runtimes
echo.
echo [*] Verifying Runtimes:
call "!NPM_CMD!" -v
"!PY_CMD!" --version

:: 5. npm install (Mandatory)
echo.
echo [*] Installing Node.js packages (npm install)...
call "!NPM_CMD!" install --force

:: 6. Python Virtual Environment
echo.
echo [*] Setting up Python Virtual Environment (venv)...
if not exist "venv\Scripts\python.exe" (
    "!PY_CMD!" -m venv venv
)

:: 7. Python Requirements Install
echo.
echo [*] Installing Python requirements...
call venv\Scripts\pip.exe install -r apps\api\requirements.txt
call venv\Scripts\pip.exe install pydantic-settings "fastapi[standard]" requests

:: 8. Windows Firewall
echo.
echo [*] Configuring Windows Firewall...
netsh advfirewall firewall add rule name="VLStudio Vite 5183" dir=in action=allow protocol=TCP localport=5183 >nul 2>&1
netsh advfirewall firewall add rule name="VLStudio FastAPI 8000" dir=in action=allow protocol=TCP localport=8000 >nul 2>&1

:: 9. Desktop Shortcut Creation
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
echo oLink.Description = "ViraLoop Studio" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"

cscript //nologo "%VBS_SCRIPT%"
del "%VBS_SCRIPT%" 2>nul
del /q "%TEMP_DIR%\*.*" 2>nul

echo.
echo ===================================================
echo   [SUCCESS] Universal Setup Completed!
echo   ViraLoop Studio is ready to use.
echo ===================================================
echo.
pause
