# 다중 창(Multi-View) 그리드 및 세션 격리 아키텍처 명세서

본 문서는 ViraLoop Studio의 단일 Flow AI 웹뷰(`WebContentsView`) 구조를 해체하고, 여러 개의 독립된 웹뷰 인스턴스를 동적으로 생성 및 배치하여 다중 계정 병렬 처리를 지원하는 아키텍처 명세서입니다.

---

## 1. 아키텍처 개요 및 설계 사상

기존 ViraLoop Studio는 `electron/main.js` 내에 단 하나의 `flowView` 전역 변수만을 유지하며 단일 세션으로 구동되었습니다. 
이를 극복하기 위해 메인 프로세스에 **다중 뷰 레지스트리(Multi-View Registry)**를 도입하고, 각 뷰가 고유한 세션 파티션(`persist:flow_profile_N`)과 UI 그리드 바운즈(Bounds)를 갖도록 설계합니다.

```text
+-----------------------------------------------------------------------+
| 메인 프로세스 (electron/main.js)                                      |
|                                                                       |
|   [ 뷰 레지스트리: flowViews = new Map() ]                            |
|     ├── 'prof_1' ➔ WebContentsView (persist:flow_profile_1)           |
|     ├── 'prof_2' ➔ WebContentsView (persist:flow_profile_2)           |
|     └── 'prof_3' ➔ WebContentsView (persist:flow_profile_3)           |
+-----------------------------------------------------------------------+
        │                   │                   │
        ▼                   ▼                   ▼
+-------------------+-------------------+-------------------------------+
| 메인 윈도우 UI (1x2 그리드 레이아웃 분할 예시)                        |
|                                                                       |
| +-----------------------------------+ +-----------------------------+ |
| | [ 웹뷰 1: prof_1 ]                | | [ 웹뷰 2: prof_2 ]          | |
| | (계정 A - 이미지/영상 AI 생성 중) | | (계정 B - 유튜브 레퍼런스)  | |
| +-----------------------------------+ +-----------------------------+ |
+-----------------------------------------------------------------------+
```

---

## 2. 코어 레지스트리 및 세션 파티션 관리 (`main.js`)

### 2.1 다중 뷰 레지스트리 구조
메인 프로세스 최상단에 단일 변수 대신 `Map` 객체를 선언하여 프로필 ID를 키(Key)로 하는 웹뷰 인스턴스를 관리합니다.

```javascript
// electron/main.js
global.flowViews = new Map(); // Map<ProfileId, WebContentsView>
global.activeFlowProfileId = null; // 현재 UI에서 포커스된 프로필 ID
```

### 2.2 동적 뷰 생성 및 파티션 격리 (`recreateFlowViewWithProfile`)
기존 `recreateFlowViewWithProfile` 함수를 다중 인스턴스 지원 구조로 확장합니다. 호출 시 프로필 ID에 해당하는 파티션 문자열(`persist:flow_profile_<id>`)을 주입하여 쿠키, 캐시, 인덱스DB를 물리적으로 완벽히 격리합니다.

```javascript
// electron/main.js
global.createOrGetFlowView = function(profileId) {
  if (!profileId) throw new Error("프로필 ID가 필요합니다.");

  // 1. 이미 존재하는 뷰가 있다면 반환
  if (global.flowViews.has(profileId)) {
    return global.flowViews.get(profileId);
  }

  // 2. 새 WebContentsView 생성 (독립 파티션 할당)
  const partitionName = `persist:flow_profile_${profileId}`;
  const newView = new WebContentsView({
    webPreferences: {
      partition: partitionName,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 3. 리소스 최적화: 백그라운드 AI 생성 창의 오디오 간섭 차단
  newView.webContents.setAudioMuted(true);

  // 4. 레지스트리 등록 및 메인 윈도우 탑재
  global.flowViews.set(profileId, newView);
  mainWindow.contentView.addChildView(newView);

  // 5. Flow AI 웹페이지 로드
  newView.webContents.loadURL('https://flow.google.com/'); // 실제 대상 URL

  return newView;
};
```

---

## 3. 2단계 계층적 레이아웃 매니저 (`layout.js`)

다중 웹뷰를 메인 윈도우에 겹치지 않게 배치하기 위해 기존 IPC 레이아웃 매니저(`electron/ipc/layout.js`)를 **거시적(Macro) 분할과 미시적(Micro) 그리드 분할의 2단계 계층 구조**로 개편합니다.

```text
+-----------------------------------------------------------------------+
| 전체 메인 윈도우 영역 (예: 1920 x 1080)                               |
+-----------------------------------------------------------------------+
        │
        ▼ [1단계: 거시적 컨테이너 분할 - 설정 모달 레이아웃 기준]
+-----------------------------------+-----------------------------------+
| 좌측: 대시보드 UI 영역 (800x1080) | 우측: Flow 컨테이너 영역 (1120x1080)|
+-----------------------------------+-----------------------------------+
                                            │
                                            ▼ [2단계: 미시적 그리드 분할]
                                    +-----------------+-----------------+
                                    | 뷰 1 (560x540)  | 뷰 2 (560x540)  |
                                    +-----------------+-----------------+
                                    | 뷰 3 (560x540)  | 뷰 4 (560x540)  |
                                    +-----------------+-----------------+
```

### 3.1 그리드 바운즈 계산 알고리즘
컨테이너 영역(`containerRect`)과 활성화된 뷰의 개수(`N`)에 따라 1x1, 1x2, 2x2 그리드 좌표를 동적으로 계산하여 각 웹뷰의 `setBounds()`를 호출합니다.

```javascript
// electron/ipc/layout.js
function updateMultiViewBounds(containerRect) {
  const views = Array.from(global.flowViews.values());
  const count = views.length;
  if (count === 0) return;

  const { x, y, width, height } = containerRect;

  if (count === 1) {
    // 1x1 단일 뷰 꽉 채움
    views[0].setBounds({ x, y, width, height });
  } else if (count === 2) {
    // 1x2 좌우 분할
    const halfWidth = Math.floor(width / 2);
    views[0].setBounds({ x, y, width: halfWidth, height });
    views[1].setBounds({ x: x + halfWidth, y, width: width - halfWidth, height });
  } else if (count <= 4) {
    // 2x2 4분할 그리드
    const halfWidth = Math.floor(width / 2);
    const halfHeight = Math.floor(height / 2);
    
    views[0].setBounds({ x, y, width: halfWidth, height: halfHeight });
    if (count > 1) views[1].setBounds({ x: x + halfWidth, y, width: width - halfWidth, height: halfHeight });
    if (count > 2) views[2].setBounds({ x, y: y + halfHeight, width: halfWidth, height: height - halfHeight });
    if (count > 3) views[3].setBounds({ x: x + halfWidth, y: y + halfHeight, width: width - halfWidth, height: height - halfHeight });
  }
}
```

---

## 4. 타겟 인식 IPC 라우팅 구조 (`shared.js`, `flow-api.js`)

기존 코드베이스의 자동화 스크립트 주입은 `getFlowView()` 단일 함수에 의존했습니다. 이를 해체하고 모든 IPC 핸들러가 `targetProfileId`를 명시적으로 전달받도록 개편합니다.

### 4.1 레지스트리 조회 헬퍼
```javascript
// electron/ipc/shared.js
function getFlowViewById(profileId) {
  if (!profileId) {
    // 타겟 미지정 시 현재 활성화된 프로필 또는 첫 번째 뷰 반환 (하위 호환성)
    const fallbackId = global.activeFlowProfileId || Array.from(global.flowViews.keys())[0];
    if (!fallbackId) throw new Error("실행 중인 Flow 뷰가 없습니다.");
    return global.flowViews.get(fallbackId);
  }

  const view = global.flowViews.get(profileId);
  if (!view) throw new Error(`프로필 ID '${profileId}'에 해당하는 뷰를 찾을 수 없습니다.`);
  return view;
}
module.exports = { getFlowViewById };
```

### 4.2 타겟 기반 DOM 스크립트 실행 및 이벤트 주입
```javascript
// electron/ipc/flow-api.js
const { getFlowViewById } = require('./shared.js');

ipcMain.handle('flow-execute-js', async (event, { profileId, script }) => {
  const targetView = getFlowViewById(profileId);
  return await targetView.webContents.executeJavaScript(script);
});

ipcMain.handle('flow-send-input', async (event, { profileId, inputEvent }) => {
  const targetView = getFlowViewById(profileId);
  targetView.webContents.sendInputEvent(inputEvent);
  return true;
});
```

---

## 5. 리소스 관리 및 파티션 소멸 메커니즘

다중 Chromium 웹뷰 구동은 막대한 메모리(RAM)와 CPU 리소스를 소모합니다. 따라서 사용하지 않는 웹뷰를 안전하게 소멸(`destroy`)시키고 메모리를 즉시 회수하는 라이프사이클 관리가 필수적입니다.

### 5.1 웹뷰 안전 소멸 및 레지스트리 정리
특정 창을 닫거나 프로필을 전환할 때 호출되는 정리(Cleanup) 로직입니다.

```javascript
// electron/main.js
global.destroyFlowView = function(profileId) {
  if (!global.flowViews.has(profileId)) return false;

  const view = global.flowViews.get(profileId);
  
  // 1. 메인 윈도우 뷰 트리에서 제거 (UI 분리)
  try {
    mainWindow.contentView.removeChildView(view);
  } catch (e) { console.warn("removeChildView 실패:", e); }

  // 2. WebContents 메모리 및 소켓 완전히 파기
  try {
    view.webContents.destroy();
  } catch (e) { console.warn("webContents.destroy 실패:", e); }

  // 3. 레지스트리에서 삭제
  global.flowViews.delete(profileId);

  // 4. 활성 프로필 포커스 조정
  if (global.activeFlowProfileId === profileId) {
    global.activeFlowProfileId = Array.from(global.flowViews.keys())[0] || null;
  }

  // 5. 남은 뷰들에 대해 레이아웃 재계산 트리거
  if (global.lastContainerRect) {
    updateMultiViewBounds(global.lastContainerRect);
  }

  return true;
};
```
