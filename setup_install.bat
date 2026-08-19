@echo off
setlocal
title ViraLoop Studio - Setup
echo ===================================================
echo   ViraLoop Studio - Environment Setup
echo ===================================================
echo.

:: 1. Check Python
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Python is not found.
    echo [*] Installing Python 3.11 via winget...
    winget install --id Python.Python.3.11 -e --source winget --accept-package-agreements --accept-source-agreements
    set "PATH=C:\Program Files\Python311;C:\Program Files\Python311\Scripts;%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"
) else (
    echo [OK] Python is installed.
)

:: 2. Check Node.js
call npm --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Node.js is not found.
    echo [*] Installing Node.js LTS via winget...
    winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
    set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
) else (
    echo [OK] Node.js is installed.
)

:: 3. npm install
echo.
echo [*] Installing Node.js packages...
call npm install

:: 4. Python venv
echo.
echo [*] Checking Python Virtual Environment...
if not exist "venv\Scripts\python.exe" (
    echo [*] Creating virtual environment...
    python -m venv venv
)

:: 5. pip install
echo.
echo [*] Installing Python requirements...
call venv\Scripts\pip.exe install -r apps\api\requirements.txt
call venv\Scripts\pip.exe install pydantic-settings "fastapi[standard]" requests

:: 6. Windows Firewall
echo.
echo [*] Adding Firewall rules for ports 5183 and 8000...
netsh advfirewall firewall add rule name="VLStudio Vite 5183" dir=in action=allow protocol=TCP localport=5183 >nul 2>&1
netsh advfirewall firewall add rule name="VLStudio FastAPI 8000" dir=in action=allow protocol=TCP localport=8000 >nul 2>&1

:: 7. Create Desktop Shortcut
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

echo.
echo ===================================================
echo   [SUCCESS] Setup Completed!
echo ===================================================
echo.
pause
