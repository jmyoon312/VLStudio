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

## 🎨 8 Core Studios & Feature Modules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ViraLoop Studio Core Architecture                     │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ 📡 Viral Scouter 2.0 (FSD Radar)     │ 🎬 Creative Studio                   │
│  • 4-Step Funnel: Signal ─▶ Reels    │  • Reverse-engineered Google Flow/Veo│
│    ─▶ Incubator ─▶ Launchpad         │  • Batch Generation & CapCut Direct  │
│  • Channel Growth Anatomy & Dual Chart│  • Dynamic Style Prompt Presets     │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ ⚡ Ddalkkak Studio (Shorts Auto)     │ 🎙️ Subtitle & Dubbing Studio         │
│  • Trend Sourcing & Native Rewrite   │  • 5-Layer STT & Silence Remover     │
│  • Multi-Character TTS & Assembly    │  • Voice Style Transfer & Dubbing    │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ 📋 WorkQueue & Pixeling              │ 🤖 Hermes AI CoPilot                 │
│  • OCR Meta Match & Batch Scheduling │  • DB Settings Single Source of Truth│
│  • Multi-Channel Upload Automation   │  • Strategic Script & Trend Analysis │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ 📱 Mobile LTE Incubator              │ 📺 Virtual Live Studio (24/7 Live)   │
│  • USB Tethered Carrier Clean IPs    │  • Unattended Multi-Stream Broadcast │
│  • Automated Airplane Mode Rotation  │  • Simultaneous Multi-Platform Restream│
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### 1. 📡 Viral Scouter 2.0 (Autonomous Scouting & Channel Growth Anatomy)
* **4-Step Pipeline Funnel**:
  1. **STEP 1 (Viral Signals Scouting)**: Live YouTube trend sourcing via `yt-dlp` extracting actual outlier multipliers, velocity scores, and hook analyses.
  2. **STEP 2 (Benchmark Channel Reels & Anatomy)**: Pixeling-style horizontal channel strip. Clicking any channel opens the **Channel Growth Anatomy Modal** featuring interactive dual charts (**Cumulative Views Line** & **Daily Velocity Bar**), momentum metrics (`현재 속도: 1.4만 / 가속 · 137%`), and **ViraLoop 4-Layer Actionable AI Channel Deconstruction** (Hook psychology, Outlier drivers, 10x Remake blueprint, Google Flow AI prompts) powered by the 9router LLM.
  3. **STEP 3 (Seed Category Incubator)**: 20 Pixeling-curated seed categories (`한국인물티셋`, `심리학`, `원테이크크루`, `시니어(건강)` 등) backed by Category DNA Charters.
  4. **STEP 4 (Brand Channel Launchpad)**: Generates 5 ready-to-launch brand channel packages (3 curated brand names, avatar/banner prompts, 3 kickoff video hooks) and automatically registers them into `BrandChannel`.
* **Strict Target Channel Deduplication**: Channels already registered for scheduled auto-downloads (`auto_download == True`) are strictly filtered out from discovery reels so creators focus purely on new undiscovered gems.
* **Human Review Promotion Gate**: 1-click `[✓ 타겟 채널 승인 & 정기수집 전환]` seamlessly moves newly scouted benchmark channels into Target Channels for scheduled unattended ingestion.

### 2. 🎬 Creative Studio (AI Media Batch Generation)
* **Google Flow & Veo 3.1 Native Integration**: Orchestrate Google Flow sessions directly within the desktop app to generate batch high-fidelity AI videos and images.
* **Instant CapCut Direct Export**: Assembles clips, audio, and subtitles directly into local CapCut folders in 0.1s without archive extraction bottlenecks.

### 3. ⚡ Ddalkkak Studio (Automated Shorts Production)
* **Short-Form Sourcing & Dissection**: Ingests viral shorts from YouTube/Douyin, extracts scripts, and analyzes viral hooks.
* **Native Rewriting & Multi-Character TTS**: Polishes scripts into native natural phrasing and synthesizes character-mapped multi-voice audio tracks.

### 4. 🎙️ Subtitle & Dubbing Studio
* **5-Layer Audio STT**: Precision microsecond-level timecode generation and audio sync.
* **Silence Remover**: Automatically detects and trims dead silence intervals for fast-paced short-form dynamics.

### 5. 📋 WorkQueue & Pixeling (Queue & OCR Match)
* **Pixeling OCR Auto-Match**: Automatically pairs recommended metadata texts with video clips using OCR visual matching.
* **Unattended Multi-Platform Scheduling**: Dispatches automated scheduled uploads across YouTube, TikTok, and Instagram.

### 6. 🤖 Hermes AI & Strategic CoPilot
* **Single Source of Truth (SSOT)**: Dynamically connects to user-configured internal LLM models in DB Settings for prompt expansion and scriptwriting.

### 7. 📱 Mobile LTE Clean IP Incubator
* **Carrier Clean IP Tethering**: Direct genuine 4G/5G mobile carrier Clean IPs via USB tethered Android smartphones.
* **Automated Airplane Mode Rotation**: Automatically rotates IPs on account actions to completely eliminate platform correlation bans.

### 8. 📺 Virtual Live Studio (24/7 Unattended Live)
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
