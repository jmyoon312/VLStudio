@echo off
setlocal
title ViraLoop Studio - Update
echo ===================================================
echo   Syncing latest ViraLoop Studio from GitHub...
echo ===================================================
echo.

git pull origin main
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git pull failed. Please check for local conflicts.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Successfully updated to the latest version!
echo.
echo ===================================================
echo   Re-building for fast startup (npm run pack)...
echo   This only takes long the first time.
echo ===================================================
echo.

call npm run pack
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Build failed.
    echo           Next launch will use dev mode (slower).
    echo           Run Update.bat again to retry the build.
    echo.
) else (
    echo.
    echo [SUCCESS] Build complete! Fast startup mode is now active.
    echo.
)

pause
