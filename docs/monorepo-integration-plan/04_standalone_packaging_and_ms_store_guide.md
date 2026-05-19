# 📦 ViraLoop Studio 단독 배포 및 Microsoft Store 패키징 가이드 (Standalone & MS Store)

본 문서는 개발 완료 후 ViraLoop Studio 모노레포 전체(Electron + FastAPI + AI Worker + 로컬 DB/Redis)를 단 하나의 설치 파일(`.exe`, `.msix`, `.appx`)로 패키징하여 **Microsoft Store 공식 등록 및 일반 윈도우 PC에서 원클릭 무설치(Standalone)로 실행**하기 위한 엔터프라이즈급 배포 명세서입니다.

---

## 🏗️ 1. 단독 배포(Standalone) 패키징 아키텍처 (`extraResources`)

일반 사용자의 PC에 파이썬, Git, Redis 등이 전혀 설치되어 있지 않아도 앱 내부에서 독립적으로 전체 인프라가 가동되도록 `electron-builder`의 `extraResources` 속성을 활용합니다.

```
+-----------------------------------------------------------------------------------+
|                        [ Standalone Packaging Architecture ]                      |
|                                                                                   |
|  win-unpacked/ (또는 app.asar.unpacked/)                                          |
|   ├── ViraLoop Studio.exe             # Electron 메인 바이너리                      |
|   ├── resources/                                                                  |
|   │    ├── app.asar                   # 프론트엔드 UI 및 메인 프로세스 번들         |
|   │    └── extra/                     # [extraResources 번들링 영역 - 100% 독립 구동] |
|   │         ├── python/               # 윈도우용 포터블 파이썬 (Embeddable Python)  |
|   │         ├── redis/                # 포터블 redis-server.exe (3MB 단일 파일)   |
|   │         └── api_server.exe        # PyInstaller로 사전 컴파일된 FastAPI 백엔드|
+-----------------------------------------------------------------------------------+
```

### `electron-builder.yml` 프로덕션 패키징 설정 명세
루트 디렉토리의 `electron-builder.yml` (또는 `package.json` 내부 `"build"` 속성)에 아래 구성을 의무 탑재합니다.

```yaml
appId: "com.viraloop.studio"
productName: "ViraLoop Studio"
copyright: "Copyright © 2026 ViraLoop Media"
asar: true

# 스토어 및 단독 배포 시 빌드에 포함할 외부 포터블 바이너리 폴더 정의
extraResources:
  - from: "infra/portable_bin"
    to: "extra"
  - from: "apps/api/dist/api_server.exe" # PyInstaller 빌드 결과물
    to: "extra/api_server.exe"

win:
  target:
    - target: "nsis"      # 일반 윈도우용 단독 설치 파일 (.exe)
    - target: "appx"      # Microsoft Store 등록용 UWP 샌드박스 파일 (.appx / .msix)
  icon: "assets/icon.ico"

nsis:
  oneClick: true
  perMachine: false
  allowElevation: true
  allowToChangeInstallationDirectory: false
  shortcutName: "ViraLoop Studio"

appx:
  applicationId: "ViraLoopStudio"
  identityName: "ViraLoopMedia.ViraLoopStudio"
  publisher: "CN=ViraLoopMedia, O=ViraLoop Media, L=Seoul, C=KR"
  publisherDisplayName: "ViraLoop Media"
```

---

## 🚀 2. 파이썬 및 AI 백엔드의 단일 바이너리화 (PyInstaller 컴파일)

FastAPI 백엔드(`apps/api`)와 AI 라이브러리(Faster-Whisper, PyTorch 등)를 원시 파이썬 코드 그대로 배포하면 용량이 비대해지고 사용자가 `pip install`을 돌려야 하므로 배포가 불가능합니다.

### PyInstaller 단일 바이너리 빌드 스크립트 (`build_api.bat`)
`apps/api` 디렉토리 내부에 아래 빌드 스크립트를 구성하여 파이썬 인터프리터와 라이브러리를 하나의 실행 파일(`api_server.exe`)로 자체 내장시킵니다.

```cmd
@echo off
echo [PyInstaller] Building FastAPI Backend into standalone api_server.exe...

cd apps\api
pyinstaller --name api_server ^
            --onefile ^
            --clean ^
            --add-data "requirements.txt;." ^
            --hidden-import "passlib.handlers.bcrypt" ^
            --hidden-import "faster_whisper" ^
            main.py

echo [PyInstaller] Build complete. Output located in apps\api\dist\api_server.exe
pause
```

---

## 🗄️ 3. 로컬 데이터베이스 및 큐(Postgres/Redis)의 경량화/내장화 전환

일반 사용자의 PC에 무거운 PostgreSQL 서버나 Redis 서버 설치를 강제하는 것은 Microsoft Store 정책 및 사용자 경험(UX)에 위배됩니다.

### A. PostgreSQL ➔ SQLite 전환 (단일 파일 DB)
ViraLoop 백엔드의 ORM 설정을 데스크톱 환경에 최적화된 **SQLite**(또는 DuckDB)로 전환합니다. 별도 서버 프로세스 없이 단일 파일(`viraloop.db`) 하나로 동작하므로 배포가 100% 간소화됩니다.

```python
# apps/api/config.py
import os
import sys

# 윈도우 스토어 샌드박스 방어를 위해 DB 저장 경로를 %APPDATA%로 강제 지정
if sys.platform == "win32":
    appdata_dir = os.path.join(os.environ.get("APPDATA", ""), "ViraLoop Studio")
    os.makedirs(appdata_dir, exist_ok=True)
    DATABASE_URL = f"sqlite:///{os.path.join(appdata_dir, 'viraloop.db')}"
else:
    DATABASE_URL = "sqlite:///./viraloop.db"
```

### B. Redis ➔ 파이썬 내장 인메모리 큐 전환 (`asyncio.Queue`)
Redis 서버 프로세스 대신 파이썬 내장 비동기 큐나 파일 기반 큐(SQLite Queue)로 전환하면 외부 서버 바이너리 번들링조차 필요 없어집니다. (만약 Redis가 필수라면 3MB짜리 윈도우용 포터블 `redis-server.exe` 단일 파일을 번들링합니다.)

---

## 🛡️ 4. Microsoft Store 샌드박스(MSIX/APPX) 정책 준수 (경로 분리 프로토콜)

Microsoft Store 앱은 윈도우의 UWP 샌드박스(AppContainer) 내부에서 실행되므로, 설치 폴더(`C:\Program Files\WindowsApps\...`)는 **완벽한 읽기 전용(Read-Only)** 상태가 됩니다. 
만약 백엔드가 설치 폴더 내부에 로그나 DB 파일을 쓰려고 시도하면 권한 거부(`Permission Denied`) 에러로 즉시 크래시됩니다.

```
+-----------------------------------------------------------------------------------+
|                        [ 스토어 샌드박스 경로 분리 프로토콜 ]                     |
|                                                                                   |
|  [설치 폴더 - C:\Program Files\WindowsApps\ViraLoopStudio]                        |
|   ├── (완벽한 읽기 전용 / Read-Only 상태) ──► 파일 쓰기 시도 시 즉시 Crash!         |
|                                                                                   |
|  [사용자 데이터 폴더 - %APPDATA%\ViraLoop Studio\]                                |
|   ├── viraloop.db                     # SQLite 메인 데이터베이스                  |
|   ├── media/                          # AI 생성 이미지/비디오 임시 저장소           |
|   └── logs/                           # 백엔드 및 워커 디버그 로그                |
+-----------------------------------------------------------------------------------+
```

### 메인 프로세스 런타임 경로 주입 로직 (`main.js`)
Electron 메인 프로세스가 앱 실행 시점에 쓰기 가능한 안전한 경로(`%APPDATA%`)를 파악하여 자식 프로세스(FastAPI) 실행 시 환경 변수로 주입합니다.

```javascript
import { app } from 'electron';
import path from 'path';
import { spawn } from 'child_process';

const userDataPath = app.getPath('userData'); // C:\Users\jmyoo\AppData\Roaming\ViraLoop Studio

function startFastAPIBackend() {
  const apiExe = path.join(process.resourcesPath, 'extra', 'api_server.exe');
  
  console.log('[Orchestration] Launching FastAPI Backend with Sandbox-Safe APPDATA path...');
  
  const apiProcess = spawn(apiExe, [], {
    env: {
      ...process.env,
      // 백엔드가 읽기 전용 설치 폴더 대신 쓰기 가능한 APPDATA 경로를 바라보도록 강제 주입
      VIRALOOP_STORAGE_DIR: userDataPath,
      VIRALOOP_PORT: "8000"
    }
  });

  apiProcess.stdout.on('data', (data) => console.log(`[FastAPI] ${data}`));
  apiProcess.stderr.on('data', (data) => console.warn(`[FastAPI ERR] ${data}`));
}
```

---

## 🛡️ 5. 네트워크 제어 및 백그라운드 관리자 권한(UAC) 대응 설계

ViraLoop Studio의 스웜 오토메이션 루프는 안정적인 네트워크 이중화(Wi-Fi + LTE 테더링 병렬 구동)를 위해 라우팅 메트릭을 실시간으로 감시하고 강제 보정(`Set-NetIPInterface`, `netsh`)합니다. 해당 작업은 윈도우 보안 모델 상 **관리자 권한(Administrator)**이 필수적으로 요구됩니다.

### A. 런타임 환경별 UAC 정책 및 처리 방식

| 실행 모드 | 권한 수준 | 동작 방식 및 UAC 처리 |
| :--- | :--- | :--- |
| **개발 환경 (dev)** | 일반 사용자 권한 | - 실시간 라우팅 조작 필요 시 PowerShell `Start-Process -Verb RunAs`를 활용하여 임시 UAC 권한 상승 팝업 유도.<br>- 백그라운드 자동 루틴 내에서 반복적인 UAC 팝업 스팸을 막기 위해 **30분 자동 쿨다운 기능** 작동 및 비관리자 상태 경고 로그를 `INFO` 레벨로 완화 처리. |
| **패키징 환경 (exe/msix)** | 관리자 권한 강제 | - `electron-builder` 설정을 통해 프로그램 기동 시점에 **최초 1회만 관리자 권한 승인(UAC)**을 받도록 구성.<br>- 승인 완료 후 백엔드 및 서브프로세스가 관리자 권한을 완전히 상속받으므로, 실행 중인 동안 추가 UAC 팝업 없이 **백그라운드에서 무소음(Silent) 라우팅 제어 수행**. |

### B. `electron-builder` 최종 실행파일 권한 구성 명세 (`requireAdministrator`)

배포용 실행파일 빌드 시 사용자가 매번 번거로운 수동 최적화를 실행하거나 백그라운드 UAC 팝업 방해를 받지 않도록 `electron-builder` 설정에 아래 명세를 적용해야 합니다.

```yaml
# electron-builder.yml 또는 package.json "build" 영역
win:
  target:
    - target: "nsis"
    - target: "appx"
  # [보안/권한 설계] 실행 시점에 최초 1회 UAC 관리자 승인을 받도록 설정
  requestedExecutionLevel: "requireAdministrator"
  icon: "assets/icon.ico"
```

> [!IMPORTANT]
> **MS Store AppContainer(APPX/MSIX) 배포 시 유의사항**
> Microsoft Store의 UWP 샌드박스 정책 하에 패키징할 경우, 앱 내부의 개별 프로세스가 임의로 UAC 권한 상승을 호출하는 것이 차단됩니다. 따라서 로컬 네트워크 카드를 직접 제어해야 하는 기업용/전문가용 에디션의 경우, 일반 NSIS 설치형(`.exe`) 배포판을 관리자 권한 실행 모드로 제공하는 것이 실무적으로 가장 안전하고 권장되는 아키텍처입니다.

