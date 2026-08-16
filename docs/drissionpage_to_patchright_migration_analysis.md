# DrissionPage ➡️ Patchright 마이그레이션 코드 분석 리포트

사용자님의 요청에 따라 ViraLoop Studio 백엔드(`apps/api/app/`)에 존재하는 `channel_creator.py` 및 `browser_profiles.py` 등 기존 DrissionPage 기반 자동화 코드를 분석하고, 이를 **Patchright**로 마이그레이션할 때 발생하는 코드 레벨의 변경 소요를 도출했습니다.

---

## 1. DrissionPage 코드 베이스 현황 분석

현재 작성된 파이썬 코드(`channel_creator.py` 등)는 DrissionPage의 가장 큰 특징인 **'동기적(Synchronous)'** 구조와 독자적인 요소 탐색 문법(`@@`, `ele`)을 강하게 띄고 있습니다.

- **브라우저 기동**: `ChromiumPage` 객체를 통해 로컬에 설치된 일반 크롬을 띄움. (`browser_profiles.py`에서는 `subprocess.Popen`으로 직접 띄우기도 함)
- **요소 탐색**: `page.ele('@@text:채널 만들기')`, `page.eles('xpath://...')`
- **입력 제어**: 커스텀 `stealth.safe_click()`, `stealth.human_type()` 모듈 사용.
- **제어 흐름**: `time.sleep()` 기반의 동기식(Sync) 대기. (`async/await` 없음)

---

## 2. Patchright 적용 시 코드 변경 소요 (2가지 경로)

Patchright를 어떻게 도입하느냐에 따라 마이그레이션의 규모와 방향이 완전히 달라집니다.

### 경로 A: 파이썬 백엔드 유지 (`patchright-python` 도입)
FastAPI 구조를 유지하면서 파이썬용 Patchright로 라이브러리만 교체하는 경우입니다. **사실상 코드를 새로 짜야 하는 수준의 대공사**가 발생합니다.

| 변경 항목 | DrissionPage (기존) | Patchright Python (변경 후) | 마이그레이션 난이도 |
| :--- | :--- | :--- | :--- |
| **비동기 전환 (핵심)** | 동기 (`def create_channel`) | 비동기 (`async def create_channel`) | 🚨 **매우 높음**. FastAPI 라우터부터 서비스 단까지 모든 함수를 `async/await`로 뜯어고쳐야 함. |
| **브라우저/컨텍스트 기동** | `ChromiumPage(ChromiumOptions())` | `p.chromium.launch_persistent_context(user_data_dir, ...)` | 높음. 프로필 폴더 마운트 방식이 완전히 다름. |
| **요소 탐색 문법 (Locator)** | `page.ele('@@text:채널 만들기')` | `await page.get_by_text("채널 만들기").click()` | 보통. DrissionPage 특유의 `@@` 문법을 Playwright의 강력한 Locator로 1:1 번역해야 함. |
| **입력 및 타이밍** | `page.get(url)`, `time.sleep(3)` | `await page.goto(url)`, `await page.wait_for_timeout(3000)` | 높음. `wait_for_load_state` 등 이벤트 기반 대기로 최적화 필요. |
| **스텔스 모듈 (`DrissionStealth`)**| 직접 구현한 마우스/키보드 딜레이 | Patchright 내장 스텔스 및 `page.mouse.move()` 활용 | 높음. 스텔스 클래스 전면 재작성 필요. |

### 경로 B: 마스터 플랜 적용 (Electron Node.js로 완전 이관) 🏆
앞선 분석에서 결론 내렸듯, 파이썬 백엔드에서 브라우저를 조종하는 것을 포기하고 **Electron의 메인 프로세스(Node.js)로 자동화 로직을 이관**하는 경로입니다.

1. **파이썬 코드 삭제**: `channel_creator.py`, `browser_uploader.py` 등의 파이썬 파일을 **전부 삭제(Deprecate)**합니다.
2. **Node.js(TypeScript)로 재작성**: Electron의 `main` 폴더 하위에 `patchright_worker.ts`를 생성하고, Playwright Node.js 문법으로 자동화 코드를 새로 작성합니다.
   ```typescript
   // Node.js Patchright 예시 (channel_creator.ts)
   import { chromium } from 'patchright';
   
   export async function createBrandChannel(userDataDir, brandName) {
       const browser = await chromium.launchPersistentContext(userDataDir, { headless: false });
       const page = await browser.newPage();
       await page.goto('https://www.youtube.com/channel_switcher');
       
       // Playwright의 강력한 Locator
       await page.getByText('채널 만들기').click(); 
       await page.locator('#channel-name').fill(brandName);
       // ...
   }
   ```
3. **역할 분담 (Decoupling)**:
   - **FastAPI (Python)**: DB 관리, AI 영상/이미지 생성(Flow AI), 상태 큐(Queue) 관리 등 무거운 백엔드 연산만 담당합니다.
   - **Electron (Node.js)**: FastAPI로부터 "채널 생성해!"라는 IPC/WebSocket 명령을 받으면, `Patchright`를 즉시 기동하여 구글에 접속하고 결과를 반환합니다.

---

## 3. 요약 및 제언

현재 DrissionPage 코드는 동기식(Sync)으로 단단하게 짜여 있습니다. 이를 파이썬에서 억지로 Patchright(Async)로 변환하는 것(`경로 A`)은 코드의 구조적 충돌을 야기하며, 결국 파이썬 런타임의 한계(무거운 프로세스, 핑거프린트 관리의 어려움)를 벗어나지 못합니다.

따라서 **기존 파이썬 자동화 코드(`channel_creator.py` 등)의 수명을 다한 것으로 판정하고 과감히 폐기**한 뒤, **Electron(Node.js) 환경에서 Patchright 스크립트를 새롭게 작성(`경로 B`)하는 것**이 개발 공수와 향후 유지보수 측면에서 10배 이상 효율적입니다.
