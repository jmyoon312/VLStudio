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
echo   (이 작업은 처음 한 번만 오래 걸립니다)
echo ===================================================
echo.

call npm run pack
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] 빌드에 실패했습니다.
    echo           다음 실행 시 개발 서버 모드(느림)로 동작합니다.
    echo.
) else (
    echo.
    echo [SUCCESS] 빌드 완료! 다음 실행부터 빠른 시작 모드로 동작합니다.
    echo.
)

pause
