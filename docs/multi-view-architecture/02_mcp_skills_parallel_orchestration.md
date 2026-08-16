# MCP 및 스킬(Skills) 병렬 오케스트레이션 명세서

본 문서는 ViraLoop Studio에 구축된 기존 단일 프로젝트용 MCP 서버 및 스킬 엔진을 다중 프로젝트·다중 창(Multi-View) 환경에서 병렬로 안전하게 제어하기 위한 확장 설계 및 동시성 제어 명세서입니다.

---

## 1. 기존 MCP/스킬 시스템 분석 및 한계점

현재 ViraLoop Studio의 MCP 서버(`mcp-server/index.js`)와 스킬 시스템(`skills/`)은 단일 로컬 HTTP 포트(`3210`)를 통해 통신하며, 내부적으로 뛰어난 패키지 관리 기능(`install_skill`, 동적 변수 치환, 의존성 연쇄 설치)과 12단계 대본/영상 생성 워크플로우를 완비하고 있습니다.

그러나 **"단 하나의 활성 프로젝트(`currentProject`)"**와 **"단일 Flow 웹뷰(`getFlowView()`)"**를 전제로 설계되어 있어, 여러 개의 Claude 에이전트가 동시에 서로 다른 프로젝트의 영상 생성을 요청할 때 다음과 같은 심각한 충돌이 발생합니다.

```text
[ Claude 에이전트 A ] (프로젝트 1) ──┐
                                  ├──► [ 단일 포트 :3210 ] ──► [ 단일 큐 덮어쓰기 / Race Condition ]
[ Claude 에이전트 B ] (프로젝트 2) ──┘
```

---

## 2. 프로젝트 ID 기반 다중 큐 라우팅 아키텍처

### 2.1 MCP 도구 스키마 개편 (`projectId` 필수화)
모든 앱 제어 도구(`app_generate_scene`, `app_start_scene_batch`, `app_batch_status`, `app_wait_batch`, `export_capcut` 등)의 입력 스키마에 `projectId` 매개변수를 필수로 추가하여 요청의 대상을 명확히 분리합니다.

```javascript
// mcp-server/index.js (도구 스키마 개편 예시)
{
  name: 'app_start_scene_batch',
  description: '특정 프로젝트의 씬 일괄 생성 배치를 트리거합니다.',
  inputSchema: {
    type: 'object',
    properties: {
      port: { type: 'number', default: 3210 },
      projectId: { type: 'string', description: '대상 프로젝트 ID (예: ep01)' }, // 필수 추가
      styleId: { type: 'string' },
      force: { type: 'boolean', default: false }
    },
    required: ['projectId']
  }
}
```

### 2.2 다중 생성 대기열(`generationQueues`) 구축
대시보드 UI(`App.jsx`) 및 메인 프로세스의 단일 생성 큐(`generationQueue`)를 `Map` 객체 기반의 다중 큐 구조로 전환합니다.

```javascript
// 메인 프로세스 또는 전역 상태 관리 매니저
global.generationQueues = new Map(); // Map<ProjectId, GenerationQueue>

function getOrCreateGenerationQueue(projectId) {
  if (!global.generationQueues.has(projectId)) {
    global.generationQueues.set(projectId, {
      projectId,
      isRunning: false,
      pendingScenes: [],
      activeTask: null
    });
  }
  return global.generationQueues.get(projectId);
}
```

---

## 3. Flow 웹뷰 라우팅 및 봇 탐지 방지 (Rate Limit Defense)

여러 프로젝트의 AI 생성이 동시에 가동될 때 구글 Flow AI 서버의 봇 탐지(`429 Too Many Requests`, reCAPTCHA)를 회피하기 위한 라우팅 및 스로틀링 구조입니다.

```text
+-----------------------------------------------------------------------+
| 전역 인터락 스로틀링 매니저 (Global Interlock Throttling Manager)     |
|  - 모든 큐의 AI 생성 요청을 중앙에서 통제하여 최소 5~10초 간격 유지   |
+-----------------------------------------------------------------------+
        │ (5초 대기 후 승인)       │ (7초 대기 후 승인)
        ▼                          ▼
+-----------------------+  +-----------------------+
| [ 큐: 프로젝트 1 ]    |  | [ 큐: 프로젝트 2 ]    |
| (할당 프로필: prof_1) |  | (할당 프로필: prof_2) |
+-----------------------+  +-----------------------+
        │                          │
        ▼                          ▼
[ WebContentsView 1 ]      [ WebContentsView 2 ]
```

### 3.1 프로젝트-프로필 바인딩 (Project-to-Profile Binding)
프로젝트 설정 파일(`project.json`)에 전담 Flow 프로필 ID를 명시하고, 생성 스크립트 실행 시 해당 프로필이 탑재된 웹뷰로만 라우팅합니다.

```javascript
// targetProject/project.json
{
  "projectId": "ep01",
  "projectName": "전설의 고향 1화",
  "flowProfileId": "prof_1", // 바인딩된 프로필 ID
  "settings": { ... }
}
```

### 3.2 전역 스로틀링 및 지터링 (Global Interlock Manager)
서로 다른 계정/프로필이라 할지라도 동일 IP에서 프롬프트가 동시다발적으로 제출되는 것을 막기 위해 전역 뮤텍스 락(Global Submit Lock)을 도입합니다.

```javascript
// electron/ipc/throttleManager.js
global.lastSubmitTimestamp = 0;

async function acquireGlobalSubmitLock() {
  const minInterval = 5000; // 최소 5초 간격
  const jitter = Math.floor(Math.random() * 3000); // 0~3초 랜덤 지터 추가
  const requiredDelay = minInterval + jitter;

  const now = Date.now();
  const elapsed = now - global.lastSubmitTimestamp;

  if (elapsed < requiredDelay) {
    const waitTime = requiredDelay - elapsed;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  global.lastSubmitTimestamp = Date.now();
  return true;
}
module.exports = { acquireGlobalSubmitLock };
```

---

## 4. 파일 I/O 동시성 관리 및 상태 락 (File Concurrency & IPC Mutex)

여러 Claude 서브에이전트가 동시에 `load_csv`, `update_prompt`, `save_csv`, `get_progress` 도구를 호출할 때 발생하는 디스크 읽기/쓰기 충돌 및 파일 손상을 방지합니다.

### 4.1 원자적 파일 쓰기 (Atomic Write Pattern)
파일을 직접 덮어쓰는 대신 임시 파일(`*.tmp`)에 먼저 기록한 후 운영체제의 원자적 이름 변경(`fs.renameSync`)을 사용하여 파일 손상(Corrupted File)을 원천 차단합니다.

```javascript
// mcp-server/lib/fileUtils.js
const fs = require('fs');
const path = require('path');

function atomicWriteJsonSync(targetPath, data) {
  const tmpPath = `${targetPath}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, targetPath); // 원자적 덮어쓰기
  } catch (err) {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    throw err;
  }
}
module.exports = { atomicWriteJsonSync };
```

### 4.2 IPC 파일 뮤텍스 락 (File Mutex Lock)
동일 파일에 대한 동시 접근을 제어하는 메모리 기반 큐 락입니다.

```javascript
// mcp-server/lib/mutex.js
const locks = new Map();

async function acquireFileLock(filePath) {
  if (!locks.has(filePath)) {
    locks.set(filePath, Promise.resolve());
  }
  
  let release;
  const nextLock = new Promise(resolve => { release = resolve; });
  const currentLock = locks.get(filePath);
  
  locks.set(filePath, currentLock.then(() => nextLock));
  await currentLock;
  
  return () => { release(); };
}
module.exports = { acquireFileLock };
```

---

## 5. 시스템 리소스 과포화 방지 및 CapCut 내보내기 큐

### 5.1 통합 리소스 쿼터제 (Global Resource Quota)
백그라운드 이미지 수집 및 캔버스 합성 작업의 동시성 한계(`mapWithConcurrency`)를 개별 프로젝트 기준이 아닌 **시스템 전체 가용 메모리 기준(전체 합산 최대 5개 유지)**으로 통제합니다.

### 5.2 CapCut 내보내기 순차 큐 (Sequential Export Queue)
막대한 디스크 I/O와 CPU 연산을 동반하는 `export_capcut` (로컬 영상 합성, 미디어 파일 대량 복사, `draft_content.json` 생성) 작업은 병렬 실행을 금지하고 전역 단일 큐를 통해 한 번에 하나의 프로젝트만 순차 내보내도록 강제합니다.

```javascript
// electron/ipc/exportManager.js
const exportQueue = [];
let isExporting = false;

async function enqueueCapcutExport(projectId, exportOptions) {
  return new Promise((resolve, reject) => {
    exportQueue.push({ projectId, exportOptions, resolve, reject });
    processNextExport();
  });
}

async function processNextExport() {
  if (isExporting || exportQueue.length === 0) return;
  
  isExporting = true;
  const { projectId, exportOptions, resolve, reject } = exportQueue.shift();

  try {
    console.log(`[CapCut 내보내기 시작] 프로젝트: ${projectId}`);
    // 실제 내보내기 로직 실행 (capcutLocalGenerator.js 호출 등)
    const result = await runCapcutExportTask(projectId, exportOptions);
    resolve(result);
  } catch (err) {
    reject(err);
  } finally {
    isExporting = false;
    processNextExport(); // 다음 대기열 처리
  }
}
```
