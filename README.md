# ViraLoop Studio (VLStudio Desktop)

<kbd>🇺🇸 English</kbd> <kbd>[🇰🇷 한국어](README.ko.md)</kbd>

> **"From Viral Trend Sourcing and AI Mass Generation to Multi-Channel Distribution and 24/7 Virtual Live Streaming."**  
> The premier **All-in-One Enterprise Content Automation OS** built for AI short-form creators, media networks, and automated video empires.

[![Release](https://img.shields.io/github/v/release/jmyoon312/VLStudio)](https://github.com/jmyoon312/VLStudio/releases)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL%20v3-blue)](LICENSE)
[![Platform: Windows 11](https://img.shields.io/badge/platform-Windows%2011-0078d4)](https://microsoft.com/windows)
[![AI Engines](https://img.shields.io/badge/AI-Google%20Flow%20%7C%20Veo%203.1%20%7C%20Claude%20%7C%20Gemini-orange)](#)

---

## ⚡ v0.9.33 Baseline: Ultra-Lightweight OTA Smart Hot-Patcher

Starting from `v0.9.33`, the **Next-Generation OTA (Over-The-Air) Hot-Patcher Engine** is officially integrated.

```
[📦 Initial Setup (Once)] ───► ViraLoop.Studio-0.9.33-win-x64-Setup.exe (Single Installer)
                                │
[🔄 Future Updates]       ───► Auto-syncs ~2MB light patch (update-bundle.zip) in 1s on app launch!
                                │
[🛡️ Data Persistence]     ───► Google Flow sessions, channels, and DB are 100% safely preserved!
```

* **Zero Massive Reinstalls**: No need to download 700MB+ installers for minor bug fixes or UI improvements. The app **auto-patches itself in 1~2 seconds** on launch.
* **Complete Data Safety**: Google Flow sessions (`Partitions`), channel metadata (`viral_loop.db`), and media assets (`07_Downloads`) reside permanently in `AppData\Local\ViraLoop Studio`, completely isolated from binary updates.

---

## 🚀 30-Second Zero-Config Automated Installation

No prior setup required. Even on a freshly installed Windows machine without Git, Node.js, Python, or FFmpeg, you can deploy ViraLoop Studio immediately.

### Option 1. Official Windows Installer (Recommended ⭐)
1. Download **`ViraLoop.Studio-0.9.33-win-x64-Setup.exe`** from the [Latest GitHub Release](https://github.com/jmyoon312/VLStudio/releases/latest).
2. Run the installer and launch via the desktop **"ViraLoop Studio"** shortcut.

### Option 2. One-Line PowerShell Command (Fastest ⚡)
**Right-click Start Button → Open [Terminal] or [PowerShell]**, paste the following command, and press Enter:
```powershell
irm https://raw.githubusercontent.com/jmyoon312/VLStudio/main/install.ps1 | iex
```

---

## 🎨 7 Core Studios & Feature Modules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ViraLoop Studio Core Architecture                     │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ 🎬 Creative Studio                   │ ⚡ Ddalkkak Studio (Shorts Auto)     │
│  • Reverse-engineered Google Flow/Veo│  • Trend Sourcing & Native Rewrite   │
│  • Batch Generation & CapCut Direct  │  • Multi-Character TTS & Assembly    │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ 🎙️ Subtitle & Dubbing Studio         │ 📋 WorkQueue & Pixeling              │
│  • 5-Layer STT & Silence Remover     │  • OCR Meta Match & Batch Scheduling │
│  • Voice Style Transfer & Dubbing    │  • Multi-Channel Upload Automation   │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ 🤖 Hermes AI CoPilot                 │ 📱 Mobile LTE Incubator              │
│  • DB Settings Single Source of Truth│  • USB Tethered Carrier Clean IPs    │
│  • Strategic Script & Trend Analysis │  • Automated Airplane Mode Rotation  │
├──────────────────────────────────────┴──────────────────────────────────────┤
│ 📺 Virtual Live Studio (24/7 Unattended Multi-Channel Live Streaming)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1. 🎬 Creative Studio (AI Media Batch Generation)
* **Google Flow & Veo 3.1 Native Integration**: Orchestrate Google Flow sessions directly within the desktop app to generate batch high-fidelity AI videos and images.
* **Instant CapCut Direct Export**: Assembles clips, audio, and subtitles directly into local CapCut folders in 0.1s without archive extraction bottlenecks.

### 2. ⚡ Ddalkkak Studio (Automated Shorts Production)
* **Short-Form Sourcing & Dissection**: Ingests viral shorts from YouTube/Douyin, extracts scripts, and analyzes viral hooks.
* **Native Rewriting & Multi-Character TTS**: Polishes scripts into native natural phrasing and synthesizes character-mapped multi-voice audio tracks.

### 3. 🎙️ Subtitle & Dubbing Studio
* **5-Layer Audio STT**: Precision microsecond-level timecode generation and audio sync.
* **Silence Remover**: Automatically detects and trims dead silence intervals for fast-paced short-form dynamics.

### 4. 📋 WorkQueue & Pixeling (Queue & OCR Match)
* **Pixeling OCR Auto-Match**: Automatically pairs recommended metadata texts with video clips using OCR visual matching.
* **Unattended Multi-Platform Scheduling**: Dispatches automated scheduled uploads across YouTube, TikTok, and Instagram.

### 5. 🤖 Hermes AI & Strategic CoPilot
* **Single Source of Truth (SSOT)**: Dynamically connects to user-configured internal LLM models in DB Settings for prompt expansion and scriptwriting.

### 6. 📱 Mobile LTE Clean IP Incubator
* **Carrier Clean IP Tethering**: Direct genuine 4G/5G mobile carrier Clean IPs via USB tethered Android smartphones.
* **Automated Airplane Mode Rotation**: Automatically rotates IPs on account actions to completely eliminate platform correlation bans.

### 7. 📺 Virtual Live Studio (24/7 Unattended Live)
* **Continuous Multi-Stream Broadcasting**: Stream local media libraries 24/7 across YouTube, TikTok, and Twitch simultaneously.

---

## 📱 Remote Workstation & Mobile Workflow

Control and orchestrate high-performance rendering on your main PC directly from mobile smartphones or external laptop browsers.

* **Local Web Dashboard**: `http://localhost:5183`
* **LAN Access**: `http://192.168.x.x:5183` (Direct high-speed media upload & remote control from smartphones)
* **Public Tunnel / Custom Domain**: Full support for reverse proxies (e.g. `https://viraloop.yourdomain.com`).

---

## 🛠️ Execution Modes

| Batch Launcher | Mode | Purpose |
| :--- | :--- | :--- |
| **`ViraLoop Studio (Production).bat`** | 🚀 **High-Performance Production** | Zero 504 timeouts, 0.1s ultra-fast rendering over external tunnels |
| **`ViraLoop Studio.bat`** | 🛠️ **Development Mode (HMR)** | Real-time source code editing and desktop debugging |
| **`ViraLoop Web Server.bat`** | 🌐 **Lightweight Web Server** | Runs backend API & web dashboard without opening an Electron window |

---

## 📜 License

ViraLoop Studio is licensed under the [AGPL-3.0 License](LICENSE).
