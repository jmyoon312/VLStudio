# ⚡ ViraLoop Studio IPC 브릿지 및 상태 동기화 명세서 (IPC Bridge & State Sync)

본 문서는 Electron 메인 프로세스, FastAPI 백엔드, React 렌더러 간의 원활한 비동기 통신을 보장하고, 대용량 미디어 처리 시 브라우저 멈춤(Freezing) 현상을 원천 차단하기 위한 **3자 브릿지 및 상태 동기화 프로토콜**입니다.

---

## 🌉 1. 3자 브릿지 통신 아키텍처 (Tripartite Bridge Protocol)

ViraLoop Studio 모노레포는 REST API(FastAPI)와 IPC 브릿지(Electron)가 대시보드 UI 안에서 조화롭게 공존하는 하이브리드 통신 아키텍처를 가집니다.

```
+-------------------------------------------------------------------------------+
|                      [ Tripartite Bridge Architecture ]                       |
|                                                                               |
|   +--------------------------+                 +--------------------------+   |
|   |   Electron Main Process  |                 |     FastAPI Backend      |   |
|   |  (main.js / profileMgr)  |                 |  (main.py / AI Workers)  |   |
|   +--------------------------+                 +--------------------------+   |
|         ▲              ▲                             ▲              ▲         |
|         │ IPC Events   │ local-resource://           │ REST / HTTP  │ WebSocket|
|         ▼              ▼                             ▼              ▼         |
|   +-----------------------------------------------------------------------+   |
|   |                        React Dashboard Renderer                       |   |
|   |                  (Zustand Stores / Flow2CapCut Features)              |   |
|   +-----------------------------------------------------------------------+   |
+-------------------------------------------------------------------------------+
```

### 통신 방식별 역할 분담표
*   **Electron IPC (`window.electronAPI`)**: Flow AI 웹뷰 DOM 조작 요청, 캡컷 프로젝트 파일 시스템 직접 기록, SAIF-2026 프로필 생성 및 하드웨어 지문 제어, 운영체제 네이티브 메뉴 및 다이얼로그 호출.
*   **REST API (`http://localhost:8000`)**: ViraLoop 채널 메타데이터 조회, AI 대본 생성 요청, Faster-Whisper 자막 추출 요청, 로컬 DB(Postgres/SQLite) 쿼리.
*   **WebSocket (`ws://localhost:8000/ws`)**: Celery / 로컬 파이썬 워커의 AI 작업 진행률(Progress) 실시간 스트리밍 및 대시보드 알림.

---

## 🚀 2. 대용량 미디어 파일 IPC 병목 해소 프로토콜 (Media Bottleneck Defense)

기존 웹 기반 아키텍처나 단순 IPC 구조에서 가장 흔히 발생하는 **"수백 MB짜리 비디오/이미지 Base64 전송 시 렌더러 프리징 현상"**을 완벽하게 방어하기 위해 아래 2가지 원칙을 강제합니다.

### A. Base64 IPC 전송 전면 금지 및 파일 시스템 기반 서빙
AI 생성 완료된 이미지나 I2V/T2V 비디오 파일은 절대 Base64 문자열로 변환하여 IPC 브릿지로 렌더러에 넘기지 않습니다. 메인 프로세스나 FastAPI 워커는 파일을 디스크(`userData/media` 또는 임시 폴더)에 즉시 기록하고, 렌더러에는 **[절대 파일 경로(Absolute Path)]**만을 전달합니다.

### B. 로컬 리소스 프로토콜(`local-resource://`) 및 FastAPI 정적 서빙 활용
렌더러(React)는 전달받은 파일 경로를 브라우저의 네이티브 캐싱 엔진이 인식할 수 있는 URL로 변환하여 렌더링합니다.

```javascript
// [로컬 리소스 URL 변환 헬퍼 함수 - src/utils/formatters.js 연동]
export function getOptimizedMediaUrl(filePath) {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  if (filePath.startsWith('data:')) return filePath;

  // 1순위: FastAPI 백엔드가 서빙하는 정적 미디어 URL로 변환 (추천)
  // return `http://localhost:8000/media/${encodeURIComponent(path.basename(filePath))}`;

  // 2순위: Electron 메인 프로세스의 커스텀 프로토콜 활용 (기존 탑재 로직)
  // 윈도우 드라이브 문자(C:) 보존 및 브라우저 보안 격리 우회
  const cleanPath = filePath.replace(/\\/g, '/');
  return `local-resource://${encodeURIComponent(cleanPath)}`;
}
```

---

## 🔄 3. Zustand 스토어와 Electron IPC 상태 동기화 프로토콜

ViraLoop의 상태 관리 엔진인 Zustand와 Electron 메인 프로세스의 비동기 이벤트 간의 타이밍 불일치(Race Condition)를 방지하기 위한 동기화 패턴입니다.

### A. 메인 프로세스 이벤트 리스너의 단일화 (Zustand Action 바인딩)
`useEffect` 내부에서 개별 컴포넌트가 IPC 이벤트를 구독하면 중복 렌더링 및 메모리 누수가 발생합니다. 반드시 Zustand 스토어 내부에서 전역적으로 단 한 번만 IPC 채널을 구독(`window.electronAPI.on...`)하고 상태를 갱신합니다.

```javascript
// apps/dashboard/src/stores/useFlowStore.ts
import { create } from 'zustand';

interface FlowState {
  isFlowActive: boolean;
  activeProfileId: string | null;
  generationProgress: number;
  initIpcListeners: () => void;
  startFlowGeneration: (prompt: string) => Promise<void>;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  isFlowActive: false,
  activeProfileId: null,
  generationProgress: 0,

  // 전역 단일 IPC 이벤트 구독기 (앱 실행 시 단 1회 호출)
  initIpcListeners: () => {
    if (window.electronAPI?.onFlowProgress) {
      window.electronAPI.onFlowProgress((data) => {
        set({ generationProgress: data.percent });
      });
    }
  },

  startFlowGeneration: async (prompt) => {
    set({ isFlowActive: true, generationProgress: 0 });
    try {
      // IPC 브릿지를 통해 메인 프로세스에 비동기 작업 요청
      await window.electronAPI.triggerFlowGeneration({ prompt });
    } catch (error) {
      console.error('[IPC Bridge] Flow generation failed:', error);
    }
  }
}));
```

### B. 뷰포트 마스킹 프로토콜 (Z-index 충돌 방지)
React 대시보드에서 드롭다운, 모달, 토스트 팝업이 열릴 때 네이티브 `WebContentsView`에 가려지는 현상을 방지하기 위해 Zustand 스토어가 모달 상태를 감지하여 메인 프로세스에 마스킹 이벤트를 발송합니다.

```javascript
// 모달이 열릴 때 WebContentsView를 일시 숨기는 브릿지 액션
export const useUIStore = create((set) => ({
  isModalOpen: false,
  openModal: () => {
    set({ isModalOpen: true });
    // 메인 프로세스에 WebContentsView 너비를 0으로 축소하도록 요청 (숨김 처리)
    window.electronAPI?.maskWebContentsView({ mask: true });
  },
  closeModal: () => {
    set({ isModalOpen: false });
    // WebContentsView 원래 크기로 복구
    window.electronAPI?.maskWebContentsView({ mask: false });
  }
}));
```
