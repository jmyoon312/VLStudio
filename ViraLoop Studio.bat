@echo off
setlocal enabledelayedexpansion
title ViraLoop Studio
echo ===================================================
echo   ViraLoop Studio Launcher Starting...
echo ===================================================
echo.

set "ROOT_DIR=%~dp0"
set "PATH=%ROOT_DIR%runtime\adb;%ROOT_DIR%runtime\ffmpeg;%ROOT_DIR%runtime\ytdlp;%PATH%"

rem -------------------------------------------------------
rem  Step 1: Check if pre-built files exist
rem -------------------------------------------------------
if not exist "%ROOT_DIR%dist-electron\main.js" goto :dev_mode

rem -------------------------------------------------------
rem  Step 2: Compare git hash - auto-detect stale build
rem  If code changed since last build -> dev mode (immediate)
rem  If code unchanged               -> pre-built mode (fast)
rem -------------------------------------------------------
set "BUILD_HASH_FILE=%ROOT_DIR%dist-electron\.build-hash"
set "CURRENT_HASH="
set "BUILT_HASH="

for /f "delims=" %%H in ('git rev-parse HEAD 2^>nul') do set "CURRENT_HASH=%%H"

rem If git is not available, just run pre-built
if not defined CURRENT_HASH goto :prebuilt_run

rem If .build-hash doesn't exist -> pack was never run -> dev mode
if not exist "%BUILD_HASH_FILE%" (
    echo [*] No build hash found. Run Update.bat first to enable fast startup.
    echo     Launching in dev mode...
    echo.
    goto :dev_mode
)

for /f "delims=" %%H in (%BUILD_HASH_FILE%) do set "BUILT_HASH=%%H"

rem If hash file is empty -> dev mode
if not defined BUILT_HASH goto :dev_mode

rem Hashes match -> pre-built is up to date
if "!CURRENT_HASH!"=="!BUILT_HASH!" goto :prebuilt_run

rem -------------------------------------------------------
rem  Code changed since last build -> auto switch to dev mode
rem -------------------------------------------------------
echo [*] Code change detected - switching to dev mode automatically.
echo     Built  : !BUILT_HASH:~0,7!
echo     Current: !CURRENT_HASH:~0,7!
echo     (Run Update.bat to rebuild for fast startup)
echo.
goto :dev_mode

rem -------------------------------------------------------
rem  Pre-built mode (no Vite dev server, fast startup)
rem -------------------------------------------------------
:prebuilt_run
echo [*] Launching in pre-built mode (fast start)...
echo.
npx electron .
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ===================================================
    echo [ERROR] ViraLoop Studio terminated unexpectedly^^!
    echo ===================================================
    echo.
    pause
)
goto :eof

rem -------------------------------------------------------
rem  Dev mode (latest code, slower start)
rem -------------------------------------------------------
:dev_mode
echo [*] Launching in dev mode (latest code)...
echo.
call npm run dev
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ===================================================
    echo [ERROR] ViraLoop Studio terminated unexpectedly^^!
    echo ===================================================
    echo.
    pause
)
