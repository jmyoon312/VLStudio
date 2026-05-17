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

:: 2. Start Redis
echo [INFO] Starting Redis...
start /min "ViraLoop_Redis" "%BIN_DIR%\redis\redis-server.exe"

:: 3. Start Postgres
echo [INFO] Starting Postgres...
"%PG_BIN%\pg_ctl.exe" start -D "%PG_DATA%" -l "%PG_DATA%\logfile" -o "-c fsync=off -c full_page_writes=off"

timeout /t 3 > nul
echo [DONE] Infrastructure ready.
