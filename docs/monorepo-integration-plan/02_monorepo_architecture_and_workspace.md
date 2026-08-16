# 📦 ViraLoop Studio 모노레포 아키텍처 및 워크스페이스 명세서 (Monorepo Architecture & Workspace)

본 문서는 ViraLoop의 방대한 백엔드 인프라(FastAPI, Postgres, Redis, Python 워커)와 VLStudio의 Electron 메인 프로세스 및 React 대시보드를 하나의 저장소에서 충돌 없이 관리하기 위한 **엔터프라이즈급 모노레포 설계 명세서**입니다.

---

## 🏗️ 1. 모노레포 디렉토리 구조 (Directory Layout)

기존 단일 패키지 구조를 폐기하고, 루트 `package.json`의 `pnpm workspaces` (또는 `npm workspaces`) 기반으로 각 애플리케이션과 인프라를 철저히 격리(Isolation)합니다.

```
VLStudio/ (Root Monorepo)
 ├── package.json                   # Root 패키지 (pnpm/npm workspaces 정의 및 공통 빌드 스크립트)
 ├── pnpm-workspace.yaml            # pnpm 워크스페이스 매핑 파일
 ├── pnpm-lock.yaml                 # 전역 의존성 잠금 파일
 ├── electron/                      # [기존 유지] Electron 메인 프로세스 (main.js, SAIF 격리 제어, IPC 브릿지)
 ├── mcp-server/                    # [기존 유지] Claude Code / OpenClaude용 MCP 서버
 ├── skills/                        # [기존 유지] AI 에이전트 스킬 정의서
 ├── infra/                         # [ViraLoop 이관] 로컬 DB, Redis, 오케스트레이션 배치 스크립트
 │    ├── Start_Infr.bat            # 로컬 인프라 전체 구동 스크립트
 │    ├── ViraLoop_Stop.bat         # 로컬 인프라 전체 강제 종료 스크립트
 │    ├── Setup.bat                 # 로컬 파이썬 가상환경 및 의존성 자동 구성 스크립트
 │    └── portable_bin/             # (선택) 윈도우용 포터블 Redis 및 백엔드 바이너리 보관소
 ├── docs/                          # 시스템 아키텍처 및 통합 계획 문서
 └── apps/                          # [통합 애플리케이션 워크스페이스 그룹]
      ├── api/                      # [ViraLoop 이관] FastAPI 백엔드, Faster-Whisper, PyTorch, Celery 워커
      │    ├── requirements.txt     # 파이썬 라이브러리 의존성 명세
      │    └── main.py              # FastAPI 서버 엔트리포인트
      ├── dashboard/                # [ViraLoop + VLStudio 통합] Vite + React 대시보드 메인 UI
      │    ├── package.json         # 대시보드 전용 프론트엔드 의존성 (React 18/19, Vite, Remotion, Tailwind)
      │    ├── vite.config.ts       # Vite 빌드 및 프록시 설정
      │    └── src/
      │         ├── pages/          # ViraLoop 기존 39개 메뉴 (BrandChannelManager, SwarmHub 등 100% 보존)
      │         ├── features/       # [VLStudio 기능 흡수] flow2capcut/ (Flow AI 생성 및 캡컷 내보내기 모듈)
      │         ├── stores/         # Zustand 기반 전역 상태 관리 스토어
      │         └── theme/          # Sovereign 디자인 시스템 테마 및 스타일 토큰
      ├── swarm/                    # [ViraLoop 이관] OpenClaude / Swarm 기반 무인 AI 자동화 에이전트
      └── web/                      # [ViraLoop 이관] 보조 웹 프론트엔드 및 랜딩
```

---

## 🔒 2. 패키지 매니저 및 의존성 호이스팅 격리 규칙 (Workspace Isolation)

모노레포 통합 시 가장 흔히 발생하는 **의존성 호이스팅(Hoisting) 충돌**을 방지하기 위해 아래 규칙을 엄격히 적용합니다.

### A. Root `package.json` 워크스페이스 정의
루트 `package.json`은 공통 개발/빌드 오케스트레이션 스크립트만 포함하며, 실제 패키지 의존성은 갖지 않습니다.
```json
{
  "name": "viraloop-studio-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "electron",
    "mcp-server"
  ],
  "scripts": {
    "dev": "pnpm --filter viraloop-dashboard dev",
    "build:win": "pnpm --filter electron-app build:win",
    "start:infra": "cd infra && Start_Infr.bat",
    "stop:infra": "cd infra && ViraLoop_Stop.bat"
  }
}
```

### B. Electron 메인 프로세스 vs 프론트엔드 의존성 철저 분리
*   `electron/package.json`: 네이티브 모듈(`sqlite3`, `fs-extra`)과 `electron`, `electron-builder`만을 포함합니다. 프론트엔드 라이브러리가 이곳으로 호이스팅되어 빌드 시 용량이 비대해지거나 네이티브 바인딩이 깨지는 것을 원천 차단합니다.
*   `apps/dashboard/package.json`: React, Vite, TailwindCSS, Remotion 등 UI 렌더링에 필요한 라이브러리만을 독립적으로 관리합니다.

---

## ⚡ 3. 포트 할당표 및 충돌 방지책 (Port Management & Collision Defense)

하나의 PC에서 여러 로컬 서버 프로세스가 가동되므로, 명확한 포트 할당표를 준수하고 충돌 방지 프로토콜을 가동합니다.

| 서비스 명칭 | 기본 포트 | 프로세스 타입 | 역할 및 설명 | 충돌 방지 및 예외 처리 방안 |
| :--- | :--- | :--- | :--- | :--- |
| **FastAPI 백엔드** | `8000` | `python.exe` | ViraLoop 메인 API 및 AI 워커 통신 | 포트 점유 시 `8001`~`8005` 자동 스캔 및 대시보드 프록시 자동 갱신 |
| **Vite 대시보드 UI** | `5173` | `node.exe` | React 대시보드 로컬 개발 서버 (Dev 모드 전용) | 프로덕션 빌드 시 Electron이 `file://` 또는 `local-resource://`로 직접 서빙 |
| **PostgreSQL DB** | `5432` | `postgres.exe` | 로컬 메인 데이터베이스 (ViraLoop 기존 명세) | 향후 SQLite 전환 시 포트 점유 소멸 (`userData/viraloop.db` 파일 대체) |
| **Redis Cache/Queue** | `6379` | `redis-server` | Celery / 워커 비동기 작업 큐 및 캐시 | 향후 파이썬 내장 인메모리 큐 전환 시 포트 점유 소멸 |
| **Electron 로컬 서버** | `3210` | `electron.exe` | 메인 프로세스 내부 IPC 보조 웹서버 | `EADDRINUSE` 발생 시 동적 포트 할당 및 렌더러에 포트 번호 IPC 전달 |
| **Flow AI CDP 통신** | `9222` | `chrome.exe` | Flow AI 웹뷰 원격 디버깅 및 DOM 조작 | 다중 창 확장 시 프로필별로 `9223`, `9224` 순차 할당 프로토콜 가동 |

### 철벽 방어형 클린업 로직 (Zombie Process Killer)
Electron 앱이 종료될 때 자식 프로세스가 남아 다음 실행 시 포트 충돌을 일으키지 않도록 `electron/main.js`에 아래 클린업 코드를 의무 탑재합니다.

```javascript
import { app } from 'electron';
import { exec } from 'child_process';
import path from 'path';

// 앱 종료 직전 자식 프로세스 완벽 청소 프로토콜 가동
app.on('before-quit', () => {
  console.log('[Orchestration] App closing — executing 철벽 방어형 클린업 프로토콜...');
  
  // 1순위: ViraLoop 공식 종료 배치 스크립트 실행
  const stopScript = path.join(__dirname, '..', 'infra', 'ViraLoop_Stop.bat');
  exec(`"${stopScript}"`, (err, stdout, stderr) => {
    if (err) console.warn('[Orchestration] ViraLoop_Stop.bat warning:', err.message);
    
    // 2순위: 윈도우 작업 관리자 레벨 강제 종료 (좀비 프로세스 원천 소멸)
    exec('taskkill /F /T /IM python.exe /IM redis-server.exe /IM celerys.exe', () => {
      console.log('[Orchestration] All local infrastructure processes cleaned successfully.');
    });
  });
});
```
