# 💻 ViraLoop Studio - Electron Desktop Container (electron)

이 디렉토리는 ViraLoop Studio의 **데스크톱 애플리케이션 메인 셸(Electron Shell Container)**을 담당하는 워크스페이스입니다.  
Vite가 빌드한 React UI를 독립 윈도우에 띄우고, 백그라운드로 FastAPI Python 서버를 자동 Spawn하여 하나의 독립 실행형 데스크톱 프로그램으로 통합 가동합니다.

---

## 🏗️ 1. 데스크톱 오케스트레이션 아키텍처 (Desktop Orchestration)

```
+-------------------------------------------------------------+
|                     ViraLoop Studio (App)                   |
|                                                             |
|   +-------------------+              +------------------+   |
|   |   Electron Main   | <--- IPC --->|  React Dashboard |   |
|   |  (main.js, Node)  |              | (Renderer, HTML) |   |
|   +-------------------+              +------------------+   |
|             |                                 |             |
|          Spawns                            Requests         |
|             v                                 v             |
|   +-------------------+                       |             |
|   |  FastAPI Backend  | <---------------------+             |
|   |   (api_server)    |                                     |
|   +-------------------+                                     |
+-------------------------------------------------------------+
```

*   **생명주기 통합 관리**: Electron 앱이 켜질 때 백엔드 서비스(`/apps/api`)를 자동 Spawn하며, 앱이 닫힐 때 좀비 프로세스가 컴퓨터에 남지 않도록 `before-quit` 이벤트 핸들러가 `python.exe` 및 관련 인프라 프로세스를 확실히 강제 종료(Taskkill)시킵니다.
*   **다중 창 (Multi-View) 레이아웃**: Google Flow의 크롬 제어 엔진을 단독 창 형태로 분할 렌더링(Split View)하여, 대시보드 화면 옆에 안정적으로 가두고 50:50 비율 조작 및 양방향 제어를 가능케 합니다.

---

## 📂 2. 폴더 구성 및 주요 파일 (Structure)

*   **`main.js`**: Electron의 엔트리포인트이자 핵심 생명주기 관리자입니다. 창 크기 제어, 로컬 SQLite DB 경로 주입, 백엔드 기동 인자 파싱을 총괄합니다.
*   **`preload.js`**: 렌더러 프로세스(프론트엔드)가 안전하게 Node.js 함수 및 Electron API(레이아웃 상태 저장, 스텔스 프록시 제어 등)에 접근할 수 있도록 보안 IPC 브릿지를 제공합니다.
*   **`package.json`**: 데스크톱 패키징에 필요한 독립적인 의존성(`electron`, `electron-builder` 등)과 빌드 환경 스크립트를 관리합니다.

---

## ⚡ 데스크톱 패키징 및 실행 명령어 (Scripts)

로컬에서 테스트 빌드 및 배포 바이너리 생성이 가능합니다.

```bash
# 1. 데스크톱 앱 로컬 개발 모드 실행
# (백엔드 파이썬 가상환경 및 대시보드 빌드가 선행되어 있어야 합니다)
npm start

# 2. Windows 설치형 독립 실행 파일 (.exe) 빌드
# electron-builder가 작동하여 최종 설치 번들을 dist-electron/ 폴더에 생성합니다.
npm run build:win
```

---

## 💡 개발 시 주의사항 (Developer Guidelines)
1.  **경로 해석 보안 (Path Security)**:
    *   사용자의 다중 운영체제 환경 및 샌드박스를 고려하여 절대 경로를 하드코딩해서는 안 되며, 반드시 `app.getPath('userData')` 또는 동적으로 감지된 `VIRALOOP_MEDIA_ROOT` 환경 변수를 사용해 유연하게 해석해야 합니다.
2.  **프로세스 리크 차단 (Prevent Resource Leaks)**:
    *   IPC 통신 채널 추가 시 반드시 Preload 스크립트에 화이트리스트 형태로 엄격히 바인딩하여 렌더러의 원격 임의 코드 실행(RCE) 취약점을 원천 방어해야 합니다.

---
*Developed by ViraLoop Media Corp. - Enterprise Monorepo Architecture Standards*
