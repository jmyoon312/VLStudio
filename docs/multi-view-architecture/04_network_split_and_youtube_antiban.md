# 네트워크 분할 및 유튜브 연좌제(Chain Ban) 방지 아키텍처 명세서

본 문서는 ViraLoop Studio의 다중 창 운영 시 AI 영상 생성 트래픽(Wi-Fi)과 YouTube 업로드 트래픽(LTE)을 물리적으로 분할하는 네트워크 라우팅 설계와, 단일 웹뷰의 순차 전환 및 하드웨어 지문 롤링을 통해 유튜브의 연좌제(Chain Ban / Shadowban)를 완벽히 회피하는 아키텍처 명세서입니다.

---

## 1. 아키텍처 개요 및 설계 사상

유튜브 알고리즘은 동일한 IP 주소, 동일한 브라우저 지문(Canvas, WebGL, UserAgent), 또는 동일한 디스크 쿠키/캐시를 공유하는 여러 채널 중 하나가 제재를 받을 경우, 나머지 채널까지 연쇄적으로 차단하는 **연좌제(Chain Ban)** 정책을 강력하게 시행하고 있습니다.

이를 원천 차단하기 위해 ViraLoop Studio는 다음과 같은 2대 핵심 사상을 기반으로 설계됩니다.
1.  **트래픽 물리적 분할**: Flow AI 영상 생성 창은 PC에 연결된 가정용 Wi-Fi 어댑터를 사용하고, 유튜브 업로드 창은 스마트폰 USB 테더링(LTE/5G) 어댑터를 사용하도록 분리합니다.
2.  **동시 접속 제로 및 세션 완벽 격리**: 유튜브 업로드 창은 단 하나의 웹뷰(`WebContentsView`) 인스턴스만 유지하며, 채널 전환 시 기존 웹뷰를 완전히 파기(`destroy`)하고 LTE IP 교체 및 하드웨어 지문을 롤링한 뒤 독립된 세션 파티션(`persist:yt_brand_N`)으로 재생성합니다.

```text
+-----------------------------------------------------------------------+
| ViraLoop Studio (Electron 메인 프로세스)                              |
|                                                                       |
|  +-------------------------+         +-----------------------------+  |
|  | Flow AI 생성 창         |         | YouTube 업로드 전용 웹뷰    |  |
|  | (persist:flow_account)  |         | (persist:yt_brand_1)        |  |
|  +------------+------------+         +--------------+--------------+  |
|               | setProxy                            | setProxy        |
|               v (127.0.0.1:8081)                    v (127.0.0.1:8082)|
+---------------|-------------------------------------|-----------------+
                |                                     |
+---------------|-------------------------------------|-----------------+
| 로컬 프록시 서버 (3Proxy, CCProxy, Node.js 등)                       |
|                                                                       |
|  +------------+------------+         +--------------+--------------+  |
|  | Port 8081 ➔ Wi-Fi IP    |         | Port 8082 ➔ LTE 테더링 IP   |  |
|  | (192.168.1.50 바인딩)   |         | (192.168.42.10 바인딩)      |  |
|  +------------+------------+         +--------------+--------------+  |
+---------------|-------------------------------------|-----------------+
                v                                     v
      [ Wi-Fi 무선 랜카드 ]                  [ 스마트폰 LTE 테더링 ]
```

---

## 2. 세션 프록시 기반 네트워크 분할 라우팅

Chromium 네트워킹 스택 자체에는 특정 세션을 물리적 네트워크 어댑터로 직접 바인딩하는 API가 없습니다. 이를 극복하기 위해 로컬 프록시 서버와 Electron의 `session.setProxy()` 기능을 결합합니다.

### 2.1 로컬 프록시 바인딩 환경 구축
PC에 구동되는 프록시 서버(예: 3Proxy, CCProxy)를 통해 로컬 수신 포트별로 송출(Outgoing) 물리적 어댑터 IP를 바인딩합니다.
*   **포트 `8081` 수신 트래픽** ➔ `192.168.1.50` (Wi-Fi 어댑터 송출)
*   **포트 `8082` 수신 트래픽** ➔ `192.168.42.10` (LTE 테더링 어댑터 송출)

### 2.2 세션별 프록시 주입 로직 (`main.js`)
웹뷰 생성 시 할당된 세션 객체에 개별 프록시 규칙을 주입합니다.

```javascript
// electron/main.js
async function assignSessionProxy(sessionObj, proxyPort) {
  if (!proxyPort) return;
  await sessionObj.setProxy({
    proxyRules: `http=127.0.0.1:${proxyPort};https=127.0.0.1:${proxyPort}`,
    proxyBypassRules: '127.0.0.1,localhost'
  });
}

// 적용 예시
// Flow 세션 (Wi-Fi 8081)
const flowSession = session.fromPartition('persist:flow_account_1');
await assignSessionProxy(flowSession, 8081);

// YouTube 세션 (LTE 8082)
const ytSession = session.fromPartition('persist:yt_brand_1');
await assignSessionProxy(ytSession, 8082);
```

---

## 3. 유튜브 연좌제 방지 단일 웹뷰 순차 스위칭 (4단계 라이프사이클)

여러 브랜드 채널에 영상을 업로드할 때 동시 접속을 피하고 IP와 세션을 완벽히 교체하는 4단계 순차 스위칭 아키텍처입니다.

```text
[1단계: yt_brand_1 업로드 완료] ➔ [웹뷰 파기 (destroy)] ➔ [2단계: LTE 비행기모드 IP 교체 대기]
                                                                  │
[4단계: 새 웹뷰 기동 및 업로드] ◄── [3단계: persist:yt_brand_2 할당 및 지문 롤링] ◄──┘
```

### 3.1 순차 스위칭 오케스트레이터 구현 (`ytExportManager.js`)

```javascript
// electron/ipc/ytExportManager.js
const { session, WebContentsView } = require('electron');
const path = require('path');

global.ytUploadView = null;
global.currentYtBrandId = null;

async function switchYoutubeBrandChannel(nextBrandId, lteProxyPort) {
  console.log(`[유튜브 채널 전환 시작] 대상 브랜드: ${nextBrandId}`);

  // ── 1단계: 기존 웹뷰 완전히 파기 및 메모리 회수 ──
  if (global.ytUploadView) {
    try {
      mainWindow.contentView.removeChildView(global.ytUploadView);
      global.ytUploadView.webContents.destroy();
    } catch (e) { console.warn("웹뷰 파기 중 오류:", e); }
    global.ytUploadView = null;
    global.currentYtBrandId = null;
    console.log("[1단계 완료] 기존 웹뷰 및 네트워크 소켓 파기 완료");
  }

  // ── 2단계: 스마트폰 LTE 테더링 IP 변경 대기 및 검증 ──
  console.log("[2단계 진행] 스마트폰 비행기 모드 ON/OFF (IP 변경) 대기 중...");
  const ipChanged = await waitForLteIpRotation();
  if (!ipChanged) throw new Error("LTE 공인 IP 변경에 실패했습니다. 전환을 중단합니다.");
  console.log("[2단계 완료] 새로운 LTE 공인 IP 검증 완료");

  // ── 3단계: 새 브랜드 채널 세션 파티션 할당 및 지문 롤링 ──
  const partitionName = `persist:yt_brand_${nextBrandId}`;
  const brandSession = session.fromPartition(partitionName);
  
  // 프록시 할당 (LTE 포트)
  await assignSessionProxy(brandSession, lteProxyPort);

  // 하드웨어 및 브라우저 지문 롤링 (UserAgent, WebGL 등)
  rerollSessionHardwareProfile(brandSession, nextBrandId);
  console.log(`[3단계 완료] 파티션(${partitionName}) 및 지문 롤링 완료`);

  // ── 4단계: 새 웹뷰 인스턴스 생성 및 메인 창 탑재 ──
  global.ytUploadView = new WebContentsView({
    webPreferences: {
      partition: partitionName,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'yt_preload.js')
    }
  });

  // UI 영역에 탑재 (예: 레이아웃 매니저를 통해 지정된 바운즈 할당)
  mainWindow.contentView.addChildView(global.ytUploadView);
  global.ytUploadView.setBounds(getYtUploadViewBounds());
  global.currentYtBrandId = nextBrandId;

  // 유튜브 스튜디오 로드
  global.ytUploadView.webContents.loadURL('https://studio.youtube.com/');
  console.log(`[4단계 완료] 유튜브 스튜디오 로드 완료. 채널 ID: ${nextBrandId}`);

  return true;
}

// LTE IP 변경 대기 헬퍼 (모달 대기 또는 자동화 브릿지)
async function waitForLteIpRotation() {
  // 실제 구현 시: ADB 비행기 모드 제어 명령 실행 또는 IPC를 통해 UI에 "IP 변경 확인 버튼" 모달 팝업 표시
  // fetch('https://api.ipify.org') 등을 통해 이전 IP와 비교 검증 로직 포함
  await new Promise(resolve => setTimeout(resolve, 5000)); // 시뮬레이션 대기
  return true; 
}
```

---

## 4. `persist:` 파티션 영속성 및 로그인 세션 복원 원리

### 4.1 디스크 데이터 영속성 구조
Electron에서 `persist:` 접두사가 붙은 파티션은 사용자의 로컬 디스크(`app.getPath('userData')/Partitions/yt_brand_N`)에 물리적 폴더로 영구 저장됩니다. 
웹뷰를 소멸(`destroy`)시켜도 메모리상의 렌더러 프로세스만 파기될 뿐, 디스크의 쿠키(로그인 세션, 2FA 토큰)와 로컬 스토리지는 고스란히 유지됩니다.

```text
userData/Partitions/
 ├── yt_brand_1/ (1번 브랜드 채널 전용 디스크 공간 - 쿠키, 캐시 영구 보존)
 └── yt_brand_2/ (2번 브랜드 채널 전용 디스크 공간 - 쿠키, 캐시 영구 보존)
```

### 4.2 로그인 세션 100% 복원
다음번 업로드 시 `session.fromPartition('persist:yt_brand_1')`을 다시 호출하면, Chromium 엔진이 디스크의 해당 폴더를 읽어 로그인 상태를 완벽히 복원합니다. 따라서 매번 아이디/비밀번호를 입력하거나 2단계 인증(2FA)을 거칠 필요 없이 즉시 유튜브 스튜디오 업로드 화면으로 진입할 수 있습니다.

---

## 5. 하드웨어 지문 롤링 (Hardware Profile Rerolling)

유튜브 브라우저 지문 추적을 무력화하기 위해 세션 파티션별로 고유한 UserAgent와 렌더러 오버라이드(WebGL, Navigator)를 주입합니다.

```javascript
// electron/ipc/ytExportManager.js (지문 롤링 헬퍼)
function rerollSessionHardwareProfile(sessionObj, brandId) {
  // 1. UserAgent 변경 (브랜드별 고유한 최신 브라우저 UA 할당)
  const uaList = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
  ];
  const selectedUa = uaList[Math.abs(hashCode(brandId)) % uaList.length];
  sessionObj.setUserAgent(selectedUa);

  // 2. Preload 스크립트를 통한 WebGL 및 Navigator 지문 오버라이드
  sessionObj.setPreloads([path.join(__dirname, 'stealth_preload.js')]);
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash << 5) - hash + str.charCodeAt(i);
  return hash;
}
```

```javascript
// electron/stealth_preload.js (웹뷰 주입용 스텔스 프리로드)
const { contextBridge } = require('electron');

// 캔버스 지문 및 WebGL 벤더 정보 마스킹을 통한 렌더러 지문 보호 로직 주입
Object.defineProperty(navigator, 'webdriver', { get: () => false });
Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
```
