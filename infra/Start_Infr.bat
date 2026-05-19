@echo off
setlocal
echo [ViraLoop] Hyper-Speed Infrastructure Boot...

set "BIN_DIR=C:\ViraLoopMedia\bin"
set "PG_DATA=%BIN_DIR%\postgres\data"
set "PG_BIN=%BIN_DIR%\postgres\bin"

:: 1. Force Clean Stale PID
if exist "%PG_DATA%\postmaster.pid" (
    echo [INFO] Cleaning stale database lock...
    del /f /q "%PG_DATA%\postmaster.pid"
)

:: 2. Start Redis (Bypassed: Using Lightweight In-Memory Queue)
echo [INFO] Redis startup bypassed (Using Lightweight In-Memory Queue).

:: 3. Start Postgres (Bypassed: Using Lightweight SQLite Database)
echo [INFO] Postgres startup bypassed (Using Lightweight SQLite Database).

timeout /t 3 > nul
echo [DONE] Infrastructure ready.
