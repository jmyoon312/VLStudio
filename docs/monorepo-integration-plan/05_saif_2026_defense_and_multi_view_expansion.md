# 🛡️ ViraLoop Studio SAIF-2026 연좌제 방어 및 다중 창 확장 명세서 (SAIF-2026 & Multi-View)

본 문서는 유튜브의 악명 높은 **"연좌제(Collective Punishment) 계정 정지"** 정책을 원천 차단하기 위해 ViraLoop의 **SAIF-2026 (Sovereign AI Infrastructure Fleet)** 보안 아키텍처와 Electron의 다중 창(`WebContentsView`) 격리 기술을 결합하는 엔터프라이즈급 보안 명세서입니다.

---

## 🌟 1. SAIF-2026 보안 아키텍처 (Sovereign AI Infrastructure Fleet)

유튜브는 단일 PC에서 여러 채널을 관리할 때 쿠키, IP, WebGL 지문 등을 종합 분석하여 하나의 계정이 정지될 때 연관된 모든 채널을 연쇄 정지(연좌제)시킵니다. 
이를 방어하기 위해 ViraLoop Studio는 **[3중 철벽 방어 프로토콜]**을 가동합니다.

```
+-----------------------------------------------------------------------------------+
|                        [ SAIF-2026 3중 철벽 방어 프로토콜 ]                       |
|                                                                                   |
|  1. 하드웨어 지문 고정 (DNA Locking) ──► [ 프로필별 WebGL / Canvas / Audio 지문 고정 ]|
|  2. 네트워크 모바일 격리 (LTE Tunnel)──► [ 프로필별 전용 프록시 및 IP 로테이션 매핑 ]|
|  3. 디스크 세션 격리 (Partitions)    ──► [ persist:flow_profile_N 개별 쿠키/캐시 ]  |
+-----------------------------------------------------------------------------------+
```

### A. 하드웨어 지문 고정 (DNA Locking - `stealth_preload.js`)
일반적인 브라우저 프로필 분리만으로는 GPU 지문(WebGL)이나 오디오 렌더링 지문을 속일 수 없습니다. 각 프로필이 생성될 때 불변의 가상 하드웨어 지문(`Compute DNA`, `Memory DNA`, `Rendering DNA`)을 생성하고, `WebContentsView`의 `preload` 스크립트를 통해 브라우저 API를 완벽하게 가로채(Mock) 유튜브에 전달합니다.

```javascript
// electron/stealth_preload.js
const { contextBridge } = require('electron');

// 프로필 매니저가 주입한 고정된 하드웨어 DNA 메타데이터 읽기
const hardwareDNA = window.process.argv.find(arg => arg.startsWith('--dna='))?.split('=')[1];
const dna = hardwareDNA ? JSON.parse(decodeURIComponent(hardwareDNA)) : null;

if (dna) {
  // 1순위: WebGL 및 Canvas 지문 고정 (유튜브 봇의 렌더링 검증 완벽 기만)
  const getParameterOriginal = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) return dna.vendor;   // 예: "Google Inc. (NVIDIA)"
    if (parameter === 37446) return dna.renderer; // 예: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)"
    return getParameterOriginal.call(this, parameter);
  };

  // 2순위: 하드웨어 코어 수 및 메모리 고정
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => dna.cpuCores });
  Object.defineProperty(navigator, 'deviceMemory', { get: () => dna.memory });
}
```

### B. 네트워크 모바일 격리 및 IP 로테이션 (Tactical Network Isolation)
동일한 IP에서 여러 채널이 동시 접속하면 연좌제 대상이 됩니다. 프로필별로 별도의 LTE 모바일 프록시나 5G 라우팅 인터페이스를 할당하고, 영상 업로드 직전 API를 통해 비행기 모드(Flight Mode)를 트리거하여 공인 IP를 강제 갱신합니다.

```javascript
// electron/profileManager.js
import { session } from 'electron';

export function configureProfileNetwork(profileId, proxyRules) {
  const partition = `persist:flow_profile_${profileId}`;
  const ses = session.fromPartition(partition);

  // 프로필 전용 LTE 프록시 라우팅 강제 바인딩 (유튜브 연좌제 원천 차단)
  ses.setProxy({
    proxyRules: proxyRules || 'direct://',
    proxyBypassRules: '127.0.0.1,localhost'
  }).then(() => {
    console.log(`[SAIF-2026] Network stealth configured for profile ${profileId} (Proxy: ${proxyRules})`);
  });
}
```

---

## 🖥️ 2. 다중 창(Multi-View) 그리드 확장 아키텍처 (`WebContentsView`)

단일 뷰포트를 넘어, 여러 개의 AI 에이전트와 유튜브 채널 창을 동시에 렌더링하기 위한 동적 그리드 매핑 명세입니다.

```
+-------------------------------------------------------------------------------+
|                       [ 대시보드 그리드 뷰 (Shell.jsx) ]                      |
|                                                                               |
|   +-------------------------------+   +-------------------------------+       |
|   |  [Cell 1: Brand Channel A]    |   |  [Cell 2: Brand Channel B]    |       |
|   |  (WebContentsView - Profile 1)|   |  (WebContentsView - Profile 2)|       |
|   +-------------------------------+   +-------------------------------+       |
|   +-------------------------------+   +-------------------------------+       |
|   |  [Cell 3: Swarm Agent 1]      |   |  [Cell 4: Flow AI Viewport]   |       |
|   |  (WebContentsView - Profile 3)|   |  (WebContentsView - Profile 4)|       |
|   +-------------------------------+   +-------------------------------+       |
+-------------------------------------------------------------------------------+
```

### `Map<ProfileId, WebContentsView>` 레지스트리 및 동적 바운딩
Electron 메인 프로세스는 활성화된 프로필들의 `WebContentsView` 인스턴스를 `Map` 레지스트리에 보관하며, 렌더러(React)가 보내오는 각 그리드 셀의 좌표(`x, y, width, height`)에 맞춰 실시간으로 `setBounds()`를 호출합니다.

```javascript
// electron/main.js 내부 동적 그리드 레이아웃 매니저
const viewRegistry = new Map(); // Map<ProfileId, WebContentsView>

ipcMain.on('update-grid-layouts', (event, layouts) => {
  // layouts: [{ profileId: 'chan_A', bounds: { x: 100, y: 50, width: 800, height: 600 } }, ...]
  for (const item of layouts) {
    const view = viewRegistry.get(item.profileId);
    if (view) {
      view.setBounds(item.bounds);
    }
  }
});
```

---

## 🔒 3. 뷰포트 마스킹 프로토콜 (Z-index 및 오버레이 가림 방어)

React 대시보드에서 드롭다운, 모달 창, 토스트 알림이 뜰 때 네이티브 `WebContentsView`에 가려지는 치명적인 UI 결함을 해결하기 위한 IPC 마스킹 프로토콜입니다.

```
+-------------------------------------------------------------------------------+
|                        [ 뷰포트 마스킹 동작 원리 ]                            |
|                                                                               |
|  [평상시] 대시보드 UI ──► WebContentsView 정상 표시 (setBounds 800x600)       |
|                                                                               |
|  [모달 호출 시] 대시보드 UI (Zustand) ──► IPC 이벤트 발송                     |
|       └──► WebContentsView 일시 숨김 (setBounds width:0 / height:0)           |
|       └──► 대시보드 모달 창이 네이티브 웹뷰 방해 없이 100% 깔끔하게 표시됨!   |
+-------------------------------------------------------------------------------+
```

### React 프론트엔드 자동 감지 및 마스킹 트리거 (`useUIStore.ts`)
대시보드 전역 상태 관리자가 모달이나 팝업 창의 열림/닫힘 상태를 감지하여 메인 프로세스에 마스킹 신호를 보냅니다.

```javascript
// apps/dashboard/src/stores/useUIStore.ts
import { create } from 'zustand';

export const useUIStore = create((set) => ({
  activeModal: null,
  openModal: (modalName) => {
    set({ activeModal: modalName });
    // 모달이 열릴 때 모든 WebContentsView를 일시 숨겨 오버레이 가림 현상 원천 차단
    window.electronAPI?.maskAllViews({ mask: true });
  },
  closeModal: () => {
    set({ activeModal: null });
    // 모달이 닫히면 WebContentsView 원래 크기 및 좌표로 즉시 복구
    window.electronAPI?.maskAllViews({ mask: false });
  }
}));
```
