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
rem  1단계: Pre-built 파일이 있는지 확인
rem -------------------------------------------------------
if not exist "%ROOT_DIR%dist-electron\main.js" goto :dev_mode

rem -------------------------------------------------------
rem  2단계: git hash 비교 (코드 변경 감지)
rem  - 빌드 시점 hash: dist-electron\.build-hash 에 저장됨
rem  - 현재 HEAD hash: git rev-parse HEAD 로 읽음
rem  - 두 값이 다르면 → 코드가 바뀐 것 (git pull 등)
rem -------------------------------------------------------
set "BUILD_HASH_FILE=%ROOT_DIR%dist-electron\.build-hash"
set "CURRENT_HASH="
set "BUILT_HASH="

rem 현재 git HEAD hash 읽기 (git 없으면 건너뜀)
for /f "delims=" %%H in ('git rev-parse HEAD 2^>nul') do set "CURRENT_HASH=%%H"

if defined CURRENT_HASH (
    if exist "%BUILD_HASH_FILE%" (
        for /f "delims=" %%H in (%BUILD_HASH_FILE%) do set "BUILT_HASH=%%H"
    )

    if defined BUILT_HASH (
        if not "!CURRENT_HASH!"=="!BUILT_HASH!" (
            echo ===================================================
            echo  [!] 코드 변경 감지됨!
            echo      빌드: !BUILT_HASH:~0,7!
            echo      현재: !CURRENT_HASH:~0,7!
            echo ===================================================
            echo.
            echo  선택하세요:
            echo  [1] 지금 바로 확인 (dev 모드, 느리지만 최신 코드)
            echo  [2] 재빌드 후 실행 (3~10분 소요, 이후 빠른 시작)
            echo  [3] 현재 빌드로 그냥 실행 (이전 코드)
            echo.
            set /p "CHOICE=선택 (1/2/3): "

            if "!CHOICE!"=="1" goto :dev_mode
            if "!CHOICE!"=="2" goto :rebuild_and_run
            rem 3 또는 기타: 현재 빌드로 그냥 실행
            echo.
            echo [*] 현재 빌드로 실행합니다...
        )
    )
)

rem -------------------------------------------------------
rem  3단계: Pre-built 실행 (VITE_DEV_SERVER_URL 없이)
rem -------------------------------------------------------
:prebuilt_run
echo [*] Pre-built 모드로 실행합니다 (빠른 시작)...
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
rem  재빌드 후 실행
rem -------------------------------------------------------
:rebuild_and_run
echo.
echo [*] 재빌드 중입니다... (잠시 기다려주세요)
call npm run pack
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] 빌드 실패. dev 모드로 전환합니다.
    goto :dev_mode
)
echo [OK] 빌드 완료!
goto :prebuilt_run

rem -------------------------------------------------------
rem  개발 서버 모드 (fallback)
rem -------------------------------------------------------
:dev_mode
echo [*] 개발 서버 모드로 실행합니다 (최신 코드, 느린 시작)...
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
