# 🔧 06. 백엔드 통합 및 최적화 분석 명세서 (Backend Integration & Optimization Analysis)

본 문서는 ViraLoop Studio의 통합 작업 및 다중 창(Multi-View) 작업 완료 후, API 백엔드(FastAPI)가 기획 문서와 실제 코드 구현 간에 어떻게 상충되고 있는지 분석하고, 이를 최적화된 로직으로 개선하기 위한 종합 검토 결과입니다.

---

## 1. 계획(문서) vs 실제 구현(코드) 비교 분석

### 📄 기획 문서의 백엔드 처리 계획 (`04_standalone_packaging_and_ms_store_guide.md`)
1. **단일 파일 컴파일**: 파이썬 FastAPI 백엔드를 `PyInstaller`를 이용해 `api_server.exe`로 컴파일하여 내장.
2. **인프라 경량화**: 무거운 외부 의존성(PostgreSQL, Redis)을 SQLite 및 파이썬 인메모리 큐로 완벽히 대체하여 독립 실행 보장.
3. **Electron 오케스트레이션**: `main.js`가 앱 실행 시점에 `api_server.exe`를 `spawn`하고, 윈도우 샌드박스 정책을 우회하기 위해 `%APPDATA%` 경로를 환경 변수로 주입.

### 💻 실제 코드 구현 상태 (`main.js` 및 `.bat` 파일들)
현재 백엔드가 실행되지 않고 React에서 "연결 끊김" 에러가 발생한 원인은 **문서화된 계획과 실제 코드 간의 심각한 불일치(단절)** 때문입니다.

1. **`main.js`의 인프라 실행 로직 결함**: 
   - `main.js`는 현재 `infra/Start_Infr.bat` 파일만 호출하고 있습니다.
   - 그러나 `Start_Infr.bat` 파일을 열어보면 Redis와 Postgres를 우회한다는 `echo` 메시지만 있을 뿐, 정작 **Python API 서버를 가동하는 명령어 자체가 누락**되어 있습니다.
2. **파편화된 기존 실행 스크립트 (`start_api_native.bat`)**:
   - `apps/api/` 디렉토리에 백엔드 구동용 배치 파일이 여전히 남아있으나, 내부에 `C:\ViraLoopMedia\source\venv\Scripts\python.exe` 같은 **절대 경로(Hardcoded paths)**가 하드코딩되어 있습니다. 
   - 모노레포 구조(`VLStudio`)로 이관된 현재 환경에서는 해당 경로를 찾지 못해 실행이 불가능합니다.
3. **좀비 프로세스 위험**:
   - `.bat` 파일을 통해 백엔드를 실행하면, Electron이 종료될 때 해당 `.bat`에 의해 파생된 Python 프로세스(`uvicorn`)가 제대로 종료되지 않고 좀비 프로세스로 남아 포트(`8000`)를 계속 점유하는 고질적인 문제가 있습니다.

---

## 2. 내외부 통신 로직 및 상충 요소 분석

### 🔄 통신 아키텍처
*   **프론트엔드 (React) ➔ 백엔드 (FastAPI)**: Vite 프록시(`vite.config.ts`)를 통해 `/api` 및 `/api/swarm/ws`로 통신합니다. 백엔드가 죽어 있으면 프록시가 `index.html`을 반환하여 JSON 파싱 에러(Unexpected token <)를 유발합니다. (현재 방어 코드 적용 완료)
*   **메인 프로세스 (Electron) ➔ 백엔드**: 앱 종료, 상태 동기화 등을 위해 로컬 루프백(`127.0.0.1:8000`)으로 통신합니다.
*   **백엔드 ➔ 외부 (Flow/CapCut)**: AI 엔진 및 캡컷 연동은 온전히 내부 망 혹은 인증된 외부 라우트로 통신하게 됩니다.

### ⚠️ 상충(Conflict) 및 중복 요소
1. **의존성 충돌**: 기획에서는 SQLite/In-memory를 쓴다고 했으나, `apps/api/requirements.txt` 및 일부 코드에는 여전히 Celery나 Redis 관련 잔재가 남아있을 가능성이 큽니다.
2. **실행 컨텍스트 중복**: `Start_Infr.bat`, `start_api_native.bat`, `start_worker_native.bat` 등 실행 스크립트가 파편화되어 있어 단일 오케스트레이션(Single Orchestration) 원칙에 위배됩니다.

---

## 3. 🚀 최적화 및 개선 적용 방안 (Action Plan)

현재의 불완전한 배치(`bat`) 파일 의존 방식을 전면 폐기하고, **Electron의 메인 프로세스(`main.js`)가 백엔드의 생명주기(Lifecycle)를 100% 직접 통제**하는 최적화된 로직으로 개선합니다.

### 개선 아키텍처: Node.js 직접 제어 (Direct Spawn)
`.bat` 파일을 거치지 않고, `main.js`에서 환경(`dev` vs `prod`)을 판단하여 FastAPI를 직접 실행합니다.

#### A. 개발 모드 (`dev`)
```javascript
// main.js 내부 개선 로직 (예시)
const pythonExecutable = path.join(__dirname, '../../venv/Scripts/python.exe'); // 가상환경 상대 경로
const backendProcess = spawn(pythonExecutable, ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000'], {
    cwd: path.join(__dirname, '../../apps/api'),
    env: { ...process.env, DATABASE_URL: 'sqlite:///./viraloop.db' } // 강제 SQLite 주입
});
```

#### B. 프로덕션 패키징 모드 (`prod` - Standalone)
```javascript
// main.js 내부 프로덕션 로직
const apiServerExe = path.join(process.resourcesPath, 'extra', 'api_server.exe');
const backendProcess = spawn(apiServerExe, [], {
    env: { ...process.env, VIRALOOP_STORAGE_DIR: app.getPath('userData') }
});
```

### 기대 효과 및 결론
1. **좀비 프로세스 완벽 차단**: Electron 메인 윈도우가 닫힐 때 `backendProcess.kill()`을 직접 호출할 수 있어 포트 충돌이 원천 해결됩니다.
2. **의존성 분리**: 하드코딩된 절대 경로를 모두 `__dirname` 기반 상대 경로로 교체하여 어떤 PC에서든 즉시 구동됩니다.
3. **로그 통합**: 백엔드의 `stdout`/`stderr` 출력을 Electron의 메인 콘솔로 파이프라이닝하여 디버깅 효율이 극대화됩니다.

> **결론**: 기존 파편화된 배치 스크립트 방식은 MS Store 패키징이나 단독 배포 환경에 적합하지 않으므로 폐기합니다. 기획 문서(`04_standalone_packaging_and_ms_store_guide.md`)에 명시된 방향성이 아키텍처적으로 가장 우수하므로, 해당 문서를 기반으로 하되 **메인 프로세스 직접 제어 방식(Direct Spawn)**을 결합하여 코드를 리팩토링하는 것으로 결정합니다.

---

## 4. ⚠️ [절대 규정] Global Split View (다중 창 Flow 뷰) 영구 유지 정책

### 핵심 개념 — AI가 반드시 매 세션마다 읽을 것

**Flow 분할 뷰는 "편집기 연동 자동화" 페이지 전용 기능이 절대 아닙니다.**

Flow WebContentsView는 ViraLoop Studio의 **백그라운드 자동화 코어**입니다. 각 WebContentsView 창에는 서로 다른 외부 사이트(Google Flow, 기타 플랫폼)가 할당되어 있으며, 사용자가 대시보드 내 어떤 페이지를 보고 있든 **그 창들은 백그라운드에서 자동화 태스크를 계속 수행**합니다. 따라서:

- 사용자가 홈, 트렌드 분석, 채널 관리, 설정 등 어떤 라우트로 이동해도 → **Flow 창은 사라지지 않습니다**
- 레이아웃 모드는 `split-left`, `split-right`, `split-top`, `split-bottom` 중 하나로 **로그인 세션 내내 고정**됩니다
- `layoutMode = 'none'`으로 강제 전환하는 코드는 **절대 작성하지 않습니다** (로그인 화면 제외)

---

### 컴포넌트별 역할 분리 (이것을 혼동하면 반드시 버그가 발생함)

#### 1. Electron 메인 프로세스 — `electron/ipc/layout.js`
- `updateBounds()`: WebContentsView의 **네이티브 픽셀 좌표**를 설정
- Flow 뷰는 **항상 `x=0`에서 시작**하고 `splitRatio * window_width` 너비를 차지
- **사이드바(pl-72/w-72)는 React 앱 내부 요소이며, 이 함수에서 절대로 고려하지 않는다**
- `sidebarOffset`을 Flow 뷰 x 좌표에 더하는 것은 **명백한 버그**임

```
[BrowserWindow - 전체 픽셀 공간]
┌────────────────────────────────────────┐
│ Flow WebContentsView (x=0, 네이티브)    │  React BrowserWindow 콘텐츠
│ width = windowWidth * splitRatio       │  ├── Shell.jsx placeholder
│                                        │  └── Layout.tsx (사이드바+메인)
└────────────────────────────────────────┘
```

#### 2. React — `Shell.jsx`
- **전체 라우트에 항상 적용되는 전역 래퍼**
- Flow 뷰가 차지하는 공간만큼 **빈 placeholder div** (`width: splitRatio * 100%`)를 만들어 React 콘텐츠를 오른쪽으로 밀어냄
- `position: absolute`로 앱 콘텐츠를 배치하면 사이드바(absolute, inset-y-0, left-0)와 좌표 기준이 충돌함 → **반드시 flex 레이아웃 사용**
- `setLayout` IPC 호출 시 `sidebarWidth`를 전달하지 않음 (layout.js가 사이드바를 모름)

#### 3. React — `Layout.tsx`
- Shell의 React 콘텐츠 패널(flex: 1 영역) **내부**에서 동작
- 사이드바는 `absolute inset-y-0 left-0 w-72`, 메인은 `pl-72`
- Layout의 루트 div는 반드시 `relative + h-screen`이어야 사이드바 absolute의 기준점이 됨

---

### 절대 금지 사항 (이 중 하나라도 위반하면 즉시 롤백할 것)

| 금지 코드 패턴 | 이유 |
|---|---|
| `setLayout({ mode: 'none' })` (라우팅 변경 시) | Flow 자동화 태스크 중단 |
| `if (location.pathname !== '/flow2capcut') hide()` | 다중 창 코어를 페이지 전용으로 오해 |
| `layout.js`에서 `x: sidebarOffset`으로 Flow 시작 | 사이드바는 React 내부, Flow는 네이티브 x=0 |
| `Shell.jsx`에서 `position: absolute`로 앱 배치 | 사이드바와 좌표계 충돌 → 흰 화면 |
| `useEffect([isAuthenticated])` → `setLayout none` | 페이지 이동/리렌더링마다 레이아웃 파괴 |

---

### 올바른 레이아웃 흐름

```
앱 시작 → Shell.jsx 마운트 (전역, 모든 라우트)
  → localStorage에서 layoutMode 복원 (기본: split-left)
  → setLayout IPC → layout.js → Flow WebContentsView bounds 설정 (x=0)
  → Shell flex: [placeholder splitRatio%] [React앱 나머지%]
  → 사용자 라우팅 → Shell 유지, Flow 유지, Layout만 children 변경
  → 드래그 리사이저 → updateSplit IPC → layout.js bounds 재계산
```

**이 아키텍처는 자동화 태스크의 중단 없는 수행을 보장하기 위한 가장 핵심적인 전제 조건입니다.**
