@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

title ViraLoop Studio - 1초 스마트 동기화
echo ===================================================
echo   ViraLoop Studio - 최신 소스 코드 동기화 중...
echo ===================================================
echo.

git pull origin main
if %ERRORLEVEL% NEQ 0 (
    echo [경고] Git pull 실패. 충돌 사항이 있는지 확인해주세요.
) else (
    echo.
    echo [성공] 최신 버전으로 업데이트되었습니다!
)

echo.
pause
