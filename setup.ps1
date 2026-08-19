$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  ViraLoop Studio - Universal Auto Installer" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$tempDir = Join-Path $env:TEMP "vlstudio_installer"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
}

# 1. Node.js Check & Install
$nodePath = "C:\Program Files\nodejs\node.exe"
if (-not (Test-Path $nodePath)) {
    Write-Host "[*] Node.js is not found. Downloading official Node.js installer..." -ForegroundColor Yellow
    $nodeMsi = Join-Path $tempDir "nodejs.msi"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    (New-Object System.Net.WebClient).DownloadFile("https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi", $nodeMsi)
    
    Write-Host "[*] Installing Node.js LTS (Please wait 10-20 seconds)..." -ForegroundColor Yellow
    $process = Start-Process "msiexec.exe" -ArgumentList "/i `"$nodeMsi`" /quiet /norestart" -Wait -PassThru
    Write-Host "[OK] Node.js installed." -ForegroundColor Green
} else {
    Write-Host "[OK] Node.js is already installed." -ForegroundColor Green
}

# 2. Python 3.11 Check & Install
$pythonPath = "C:\Program Files\Python311\python.exe"
$localPythonPath = Join-Path $env:LOCALAPPDATA "Programs\Python\Python311\python.exe"

if ((-not (Test-Path $pythonPath)) -and (-not (Test-Path $localPythonPath))) {
    Write-Host "[*] Python 3.11 is not found. Downloading official Python installer..." -ForegroundColor Yellow
    $pyExe = Join-Path $tempDir "python_installer.exe"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    (New-Object System.Net.WebClient).DownloadFile("https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe", $pyExe)
    
    Write-Host "[*] Installing Python 3.11 (Please wait 15-30 seconds)..." -ForegroundColor Yellow
    $process = Start-Process $pyExe -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1 Include_test=0" -Wait -PassThru
    Write-Host "[OK] Python 3.11 installed." -ForegroundColor Green
} else {
    Write-Host "[OK] Python is already installed." -ForegroundColor Green
}

# Update PATH for current session
$env:PATH = "C:\Program Files\nodejs;C:\Program Files\Python311;C:\Program Files\Python311\Scripts;$($env:LOCALAPPDATA)\Programs\Python\Python311;$($env:LOCALAPPDATA)\Programs\Python\Python311\Scripts;$($env:APPDATA)\npm;" + $env:PATH

$npmCmd = "npm"
if (Test-Path "C:\Program Files\nodejs\npm.cmd") { $npmCmd = "C:\Program Files\nodejs\npm.cmd" }

$pyCmd = "python"
if (Test-Path $pythonPath) { $pyCmd = $pythonPath }
elseif (Test-Path $localPythonPath) { $pyCmd = $localPythonPath }

Write-Host ""
Write-Host "[*] Node version: " -NoNewline; & $nodePath -v
Write-Host "[*] Python version: " -NoNewline; & $pyCmd --version

# 3. npm install
Write-Host ""
Write-Host "[*] Installing Node.js packages (npm install)..." -ForegroundColor Cyan
& $npmCmd install --force

# 4. Python venv
Write-Host ""
Write-Host "[*] Setting up Python Virtual Environment (venv)..." -ForegroundColor Cyan
if (-not (Test-Path "venv\Scripts\python.exe")) {
    & $pyCmd -m venv venv
}

# 5. pip install
Write-Host ""
Write-Host "[*] Installing Python backend requirements..." -ForegroundColor Cyan
& ".\venv\Scripts\pip.exe" install -r apps\api\requirements.txt
& ".\venv\Scripts\pip.exe" install pydantic-settings "fastapi[standard]" requests static-ffmpeg

# Ensure FFmpeg binaries are extracted locally in python venv
Write-Host "[*] Initializing FFmpeg binaries..." -ForegroundColor Cyan
& ".\venv\Scripts\python.exe" -c "import static_ffmpeg; static_ffmpeg.add_paths()" 2>$null

# 6. Check & Download Platform Tools (ADB)
$adbExe = Join-Path $PSScriptRoot "runtime\adb\adb.exe"
if (-not (Test-Path $adbExe)) {
    Write-Host "[*] ADB (Android Platform Tools) is missing. Downloading official Google platform-tools..." -ForegroundColor Cyan
    $adbZip = Join-Path $tempDir "platform-tools.zip"
    $adbDir = Join-Path $PSScriptRoot "runtime\adb"
    if (-not (Test-Path $adbDir)) { New-Item -ItemType Directory -Path $adbDir -Force | Out-Null }
    
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    (New-Object System.Net.WebClient).DownloadFile("https://dl.google.com/android/repository/platform-tools-latest-windows.zip", $adbZip)
    
    Write-Host "[*] Extracting ADB platform-tools..." -ForegroundColor Cyan
    Expand-Archive -Path $adbZip -DestinationPath $tempDir -Force
    $extractedPlatformTools = Join-Path $tempDir "platform-tools"
    if (Test-Path $extractedPlatformTools) {
        Copy-Item -Path "$extractedPlatformTools\*" -Destination $adbDir -Recurse -Force
    }
    Write-Host "[OK] ADB installed to runtime\adb" -ForegroundColor Green
} else {
    Write-Host "[OK] ADB is already installed." -ForegroundColor Green
}

# 7. Check & Download yt-dlp
$ytdlpExe = Join-Path $PSScriptRoot "runtime\ytdlp\yt-dlp.exe"
if (-not (Test-Path $ytdlpExe)) {
    Write-Host "[*] Downloading official yt-dlp.exe..." -ForegroundColor Cyan
    $ytdlpDir = Join-Path $PSScriptRoot "runtime\ytdlp"
    if (-not (Test-Path $ytdlpDir)) { New-Item -ItemType Directory -Path $ytdlpDir -Force | Out-Null }
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    (New-Object System.Net.WebClient).DownloadFile("https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe", $ytdlpExe)
    Write-Host "[OK] yt-dlp installed to runtime\ytdlp" -ForegroundColor Green
} else {
    Write-Host "[OK] yt-dlp is already installed." -ForegroundColor Green
}

# 6. Windows Firewall rules
Write-Host ""
Write-Host "[*] Configuring Windows Firewall (5183, 8000)..." -ForegroundColor Cyan
netsh advfirewall firewall add rule name="VLStudio Vite 5183" dir=in action=allow protocol=TCP localport=5183 | Out-Null
netsh advfirewall firewall add rule name="VLStudio FastAPI 8000" dir=in action=allow protocol=TCP localport=8000 | Out-Null

# 7. Desktop Shortcut Creation
Write-Host ""
Write-Host "[*] Creating Desktop Shortcut..." -ForegroundColor Cyan
$wshell = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath("Desktop")
$shortcut = $wshell.CreateShortcut("$desktop\ViraLoop Studio.lnk")
$shortcut.TargetPath = "$PSScriptRoot\ViraLoop Studio.bat"
$shortcut.WorkingDirectory = "$PSScriptRoot"
if (Test-Path "$PSScriptRoot\assets\icon.ico") {
    $shortcut.IconLocation = "$PSScriptRoot\assets\icon.ico"
}
$shortcut.Description = "ViraLoop Studio"
$shortcut.Save()

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "   [SUCCESS] Universal Setup Completed!" -ForegroundColor Green
Write-Host "   ViraLoop Studio is ready to use." -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit..."
