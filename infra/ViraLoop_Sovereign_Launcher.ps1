# ==========================================================
# ViraLoop Sovereign UNIFIED Launcher (Ultimate-Batch Edition)
# ==========================================================

$BIN_DIR = "C:\ViraLoopMedia\bin"
$SOURCE_DIR = "C:\ViraLoopMedia\source"
$PG_DATA = "$BIN_DIR\postgres\data"
$PG_BIN = "$BIN_DIR\postgres\bin"
$CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$EDGE_PATH = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$CLEANUP_LOG = "$SOURCE_DIR\cleanup_trace.log"

# [ENV] Global variables (Injected for good measure - Cleared to fall back to SQLite & in-memory queue)
$env:DATABASE_URL = ""
$env:REDIS_URL = ""
$env:PYTHONPATH = "."

# [SAFE-EXIT] Cleanup function
function Global-Cleanup {
    $now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$now] Global-Cleanup Triggered" | Out-File -FilePath $CLEANUP_LOG -Append
    
    Write-Host "`n[ViraLoop] Cleanup Triggered. Shitting down services..." -ForegroundColor Yellow
    
    # 1. Graceful stop with wait
    Start-Process -FilePath "$PG_BIN\pg_ctl.exe" -ArgumentList "stop -D `"$PG_DATA`" -m fast" -Wait -WindowStyle Hidden -ErrorAction SilentlyContinue
    
    # 2. Precise Kill ViraLoop App Window
    Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe' OR Name = 'msedge.exe'" | 
        Where-Object { $_.CommandLine -like '*--app=http://localhost:5173*' } | 
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

    # 3. Kill Core Processes
    taskkill /f /im python.exe /t 2>$null
    taskkill /f /im node.exe /t 2>$null
    taskkill /f /im redis-server.exe /t 2>$null
    taskkill /f /im postgres.exe /t 2>$null
    Write-Host "[DONE] System Cleared." -ForegroundColor Green
}

# Register Exit Handler
[System.AppDomain]::CurrentDomain.add_ProcessExit({
    Global-Cleanup
})

# --- STARTUP SEQUENCE ---
Write-Host "[ViraLoop] Sovereign Native Engine Starting..." -ForegroundColor Cyan

# 1. Clean Stale State
if (Test-Path "$PG_DATA\postmaster.pid") { Remove-Item "$PG_DATA\postmaster.pid" -Force -ErrorAction SilentlyContinue }

# 2. Start Infra (Bypassed: Using Lightweight SQLite and In-Memory Queue)
Write-Host "[Infra] Bypassing PostgreSQL/Redis startup (Using SQLite & In-Memory Queue)..." -ForegroundColor Gray

# 3. Ensure Database Exists (SQLite handles creation automatically)
# Bypassed psql role/database setup

# 4. Start Core Services (via Dedicated Batch Files for 100% Reliability)
Write-Host "[ViraLoop] Launching API and Worker (Stable-Link)..." -ForegroundColor Cyan

# Launch API via Batch
Start-Process cmd -ArgumentList "/k `"$SOURCE_DIR\apps\api\start_api_native.bat`"" -WindowStyle Minimized

Start-Sleep -Seconds 3

# Launch Worker via Batch
Start-Process cmd -ArgumentList "/k `"$SOURCE_DIR\apps\api\start_worker_native.bat`"" -WindowStyle Minimized

Start-Sleep -Seconds 3

# Dashboard Launch
$dashCmd = "title ViraLoop_Dashboard && cd /d $SOURCE_DIR\apps\dashboard && npm run dev"
Start-Process cmd -ArgumentList "/c $dashCmd" -WindowStyle Minimized

# 5. Finalize UI
Write-Host "[ViraLoop] Preparing App Interface..." -ForegroundColor Green
Start-Sleep -Seconds 5

if (Test-Path $CHROME_PATH) {
    Start-Process $CHROME_PATH -ArgumentList "--app=http://localhost:5173"
} elseif (Test-Path $EDGE_PATH) {
    Start-Process $EDGE_PATH -ArgumentList "--app=http://localhost:5173"
} else {
    Start-Process "http://localhost:5173"
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "   ViraLoop NATIVE is ACTIVE (Ultimate)      " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Close this window to stop ALL ViraLoop services."

while($true) { Start-Sleep -Seconds 1 }
