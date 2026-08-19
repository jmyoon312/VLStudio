@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

title ViraLoop Studio - 런처
echo ===================================================
echo   ViraLoop Studio를 실행합니다...
echo ===================================================
echo.

set "ROOT_DIR=%~dp0"
set "PATH=%ROOT_DIR%runtime\adb;%ROOT_DIR%runtime\ffmpeg;%ROOT_DIR%runtime\ytdlp;%PATH%"

:: 1. Electron + FastAPI 통합 실행 (개발/포터블 런처)
npm run dev
