# ==============================================================================
# ViraLoop Studio - Universal Zero-Touch Bootstrapper (Install & Setup)
# Run via: irm https://raw.githubusercontent.com/jmyoon312/VLStudio/main/install.ps1 | iex
# ==============================================================================

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   ViraLoop Studio - Universal Web Installer" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Default Installation Directory
$installDir = "C:\ViraLoopStudio\VLStudio"
$parentDir = Split-Path $installDir

if (-not (Test-Path $parentDir)) {
    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
}

$tempDir = Join-Path $env:TEMP "vlstudio_web_installer"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
}

# 1. Check Git
$hasGit = $false
try {
    $gitVer = & git --version 2>$null
    if ($gitVer) { $hasGit = $true }
} catch {}

if ($hasGit) {
    Write-Host "[*] Git detected. Syncing ViraLoop Studio repository..." -ForegroundColor Cyan
    if (-not (Test-Path $installDir)) {
        & git clone https://github.com/jmyoon312/VLStudio.git $installDir
    } else {
        Set-Location $installDir
        & git pull origin main
    }
} else {
    Write-Host "[*] Git not found. Downloading latest source zip from GitHub..." -ForegroundColor Yellow
    $zipPath = Join-Path $tempDir "vlstudio_main.zip"
    $zipExtractPath = Join-Path $tempDir "vlstudio_extract"
    
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    (New-Object System.Net.WebClient).DownloadFile("https://github.com/jmyoon312/VLStudio/archive/refs/heads/main.zip", $zipPath)
    
    Write-Host "[*] Extracting source files to $installDir..." -ForegroundColor Cyan
    if (Test-Path $zipExtractPath) { Remove-Item $zipExtractPath -Recurse -Force | Out-Null }
    Expand-Archive -Path $zipPath -DestinationPath $zipExtractPath -Force
    
    $innerFolder = Join-Path $zipExtractPath "VLStudio-main"
    if (Test-Path $installDir) {
        # Copy over existing
        Copy-Item -Path "$innerFolder\*" -Destination $installDir -Recurse -Force
    } else {
        Move-Item -Path $innerFolder -Destination $installDir -Force
    }
}

Set-Location $installDir

Write-Host ""
Write-Host "[*] Source code ready at: $installDir" -ForegroundColor Green
Write-Host "[*] Launching complete environment configuration engine..." -ForegroundColor Cyan
Write-Host ""

# Execute setup.ps1 inside the repository
& "$installDir\setup.ps1"
