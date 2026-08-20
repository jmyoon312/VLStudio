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
rem  Step 2: Compare git hash to detect stale build
rem  - Build-time hash saved in: dist-electron\.build-hash
rem  - Current HEAD hash read from: git rev-parse HEAD
rem  - If different -> code has changed since last build
rem -------------------------------------------------------
set "BUILD_HASH_FILE=%ROOT_DIR%dist-electron\.build-hash"
set "CURRENT_HASH="
set "BUILT_HASH="

for /f "delims=" %%H in ('git rev-parse HEAD 2^>nul') do set "CURRENT_HASH=%%H"

if defined CURRENT_HASH (
    if exist "%BUILD_HASH_FILE%" (
        for /f "delims=" %%H in (%BUILD_HASH_FILE%) do set "BUILT_HASH=%%H"
    )

    if defined BUILT_HASH (
        if not "!CURRENT_HASH!"=="!BUILT_HASH!" (
            echo ===================================================
            echo  [!] Code change detected since last build!
            echo      Built : !BUILT_HASH:~0,7!
            echo      Current: !CURRENT_HASH:~0,7!
            echo ===================================================
            echo.
            echo  Choose an option:
            echo  [1] Run in dev mode now  (latest code, slower start)
            echo  [2] Rebuild then run     (3-10 min, fast from next time)
            echo  [3] Run current build    (old code, fast start)
            echo.
            set /p "CHOICE=Enter choice (1/2/3): "

            if "!CHOICE!"=="1" goto :dev_mode
            if "!CHOICE!"=="2" goto :rebuild_and_run
            rem 3 or anything else: run existing build
            echo.
            echo [*] Running current build...
        )
    )
)

rem -------------------------------------------------------
rem  Step 3: Launch pre-built Electron (no Vite dev server)
rem -------------------------------------------------------
:prebuilt_run
echo [*] Launching in pre-built mode (fast start)...
echo.
npx electron .
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ===================================================
    echo [ERROR] ViraLoop Studio terminated unexpectedly!
    echo ===================================================
    echo.
    pause
)
goto :eof

rem -------------------------------------------------------
rem  Rebuild then run
rem -------------------------------------------------------
:rebuild_and_run
echo.
echo [*] Rebuilding... please wait.
call npm run pack
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed. Falling back to dev mode.
    goto :dev_mode
)
echo [OK] Build complete!
goto :prebuilt_run

rem -------------------------------------------------------
rem  Dev server mode (fallback / latest code)
rem -------------------------------------------------------
:dev_mode
echo [*] Launching in dev mode (latest code, slower start)...
echo.
call npm run dev
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ===================================================
    echo [ERROR] ViraLoop Studio terminated unexpectedly!
    echo ===================================================
    echo.
    pause
)
