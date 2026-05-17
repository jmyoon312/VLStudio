# Sovereign Native Setup Script (ViraLoop)
# Run this from C:\ViraLoopMedia\source

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   ViraLoop Native Windows Setup          " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

try {
    # 1. Check Requirements
    Write-Host "[1/5] Checking Requirements..." -ForegroundColor Yellow
    if (!(Get-Command python -ErrorAction SilentlyContinue)) {
        throw "Python is not installed. Please install Python 3.12+ from python.org"
    }
    if (!(Get-Command node -ErrorAction SilentlyContinue)) {
        throw "Node.js is not installed. Please install Node.js 20+ from nodejs.org"
    }

    # 2. Setup Python Virtual Environment
    Write-Host "[2/5] Setting up Python Virtual Environment..." -ForegroundColor Yellow
    if (!(Test-Path "venv")) {
        python -m venv venv
        Write-Host "Venv created successfully." -ForegroundColor Green
    }

    # Activate and Install Requirements
    Write-Host "Installing Python packages (this may take a few minutes)..." -ForegroundColor Yellow
    & ".\venv\Scripts\python.exe" -m pip install --upgrade pip
    & ".\venv\Scripts\pip.exe" install -r apps/api/requirements.txt

    # 3. Setup Node.js Packages (Dashboard & Remotion)
    Write-Host "[3/5] Setting up Node.js packages..." -ForegroundColor Yellow
    if (Test-Path "apps/dashboard") {
        cd apps/dashboard
        npm install
        cd ../..
    }

    # 4. Setup Playwright & Browsers
    Write-Host "[4/5] Initializing Stealth Browsers..." -ForegroundColor Yellow
    & ".\venv\Scripts\python.exe" -m playwright install chromium

    # 5. Finalize Paths
    Write-Host "[5/5] Finalizing Environment..." -ForegroundColor Yellow
    if (!(Test-Path "..\temp")) { New-Item -ItemType Directory -Path "..\temp" -Force }

    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "   Setup Complete! Use Start.bat to run   " -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
}
catch {
    Write-Host "`nERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Location: $($_.InvocationInfo.ScriptName) Line: $($_.InvocationInfo.ScriptLineNumber)" -ForegroundColor Gray
}
finally {
    Write-Host "`nPress any key to close..."
    $x = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
