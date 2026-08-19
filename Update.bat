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
) else (
    echo.
    echo [SUCCESS] Successfully updated to the latest version!
)

echo.
pause
