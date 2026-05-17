# OpenClaude 연동 및 무료/로컬 AI 모델 최적화 가이드

본 문서는 공식 Claude Code CLI 대신 무료 오픈소스 에이전트 CLI인 **OpenClaude**를 활용하여 ViraLoop Studio의 MCP 서버 및 스킬 시스템을 제어하기 위한 연동 명세서 및 로컬 AI 모델 최적화 가이드입니다.

---

## 1. OpenClaude 아키텍처 및 연동 정합성

OpenClaude는 공식 Claude Code CLI의 핵심 워크플로우(프롬프트, 도구, 에이전트, MCP, 슬래시 명령 `/provider`, `/model`)를 1:1로 대체하도록 설계된 터미널 기반 코딩 에이전트입니다.

```text
+-----------------------------------------------------------------------+
| OpenClaude CLI (Terminal)                                             |
|  ├── 표준 MCP 프로토콜 (Stdio Transport)                              |
|  └── 자체 스킬 로더 (~/.claude/skills/ SKILL.md 직접 실행)            |
+-----------------------------------------------------------------------+
        │ (stdio 스트림)
        ▼
+-----------------------------------------------------------------------+
| ViraLoop Studio MCP 서버 (mcp-server/index.js)                        |
|  └── 로컬 HTTP 브릿지 (http://127.0.0.1:3210 API 제어)                 |
+-----------------------------------------------------------------------+
```

### 1.1 MCP 서버 연동 설정 (`~/.openclaude.json`)
OpenClaude는 `@modelcontextprotocol/sdk` 기반의 Stdio 전송을 완벽히 지원합니다. 사용자 홈 디렉토리의 설정 파일에 ViraLoop Studio MCP 서버 경로를 등록하여 도구를 즉시 활성화할 수 있습니다.

```json
{
  "mcpServers": {
    "autoflowcut": {
      "command": "node",
      "args": ["c:/ViraLoopMedia/VLStudio/mcp-server/index.js"]
    }
  }
}
```

### 1.2 스킬(Skills) 시스템 호환성
OpenClaude는 `~/.claude/skills/` 디렉토리에 설치된 `SKILL.md` 워크플로우 문서를 자체적으로 읽고 템플릿 변수를 치환하여 실행하는 구조를 갖추고 있습니다. 
따라서 ViraLoop Studio의 `install_skill` 도구로 설치한 `yadam`(야담)이나 `dark-history` 12단계 워크플로우를 아무런 수정 없이 즉시 호출할 수 있습니다.

---

## 2. 무료 및 로컬 AI 모델 연동 시의 기술적 제약사항

OpenClaude를 통해 무료 API(Gemini Flash, DeepSeek 등)나 로컬 소형 모델(`Ollama qwen2.5-coder:7b`, `Llama 3` 등)을 연결할 경우, 모델의 자체 추론 역량 한계로 인해 다음과 같은 기술적 제약과 예기치 못한 에러가 발생할 수 있습니다.

```text
[ 로컬 소형 모델 (Ollama 7B) ] ──► [ 도구 인자 JSON 문법 오류 / 필수 필드 누락 ] ──► [ MCP 서버 에러 반환 ]
```

### 2.1 도구 호출(Tool Calling) 스키마 생성 오류 및 방어
*   **원인**: 소형 모델은 복잡한 다단계 도구 루프(Multi-step Tool Loops)에서 인자(`arguments`)의 JSON 스키마를 잘못 생성하거나 필수 인자(`scene_number`, `fields`, `projectId` 등)를 누락하는 경향이 있습니다.
*   **방어 전략 (MCP 서버 레벨 검증 강화)**: `mcp-server/index.js`의 도구 핸들러에서 인자 유효성을 철저히 검증하고, 실패 시 모델이 스스로 수정할 수 있도록 구체적인 예제와 함께 명확한 에러 메시지를 반환해야 합니다.

```javascript
// mcp-server/index.js (방어적 도구 핸들러 작성 예시)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'update_prompt') {
    if (!args.scene_number || typeof args.scene_number !== 'number') {
      return {
        content: [{ type: 'text', text: "오류: scene_number(숫자) 매개변수가 누락되었거나 잘못되었습니다. 예: {\"scene_number\": 1, \"prompt\": \"...\"}" }],
        isError: true
      };
    }
    // 정상 처리 로직...
  }
});
```

### 2.2 출력 토큰 상한(Output Caps) 및 컨텍스트 망각 현상
*   **원인**: ViraLoop Studio의 20챕터 대본 작성(`yadam` 스킬)이나 수십 개의 씬 CSV(`list_scenes`) 데이터를 주고받을 때 수만 토큰의 방대한 컨텍스트가 요구됩니다. 무료 API나 로컬 모델은 한 번에 출력할 수 있는 최대 토큰 수가 제한되어 있거나 컨텍스트 윈도우가 작습니다.
*   **극복 전략**: 
    1.  **청크 분할 조회**: `list_scenes` 호출 시 전체 씬을 한 번에 조회하지 않고 `from: 1, to: 5` 형태로 나누어 조회하도록 스킬 프롬프트(`SKILL.md`) 지침을 수정합니다.
    2.  **중간 요약 및 체크포인트 강제**: 12단계 워크플로우 각 단계가 끝날 때마다 핵심 정보를 `STATE.md`나 요약 파일에 기록하고, 다음 단계 시작 시 해당 파일만 읽도록 하여 컨텍스트 메모리 부담을 최소화합니다.

### 2.3 에이전트 라우팅(`agentRouting`) 사용 시 컨텍스트 단절 위험
*   **원인**: OpenClaude는 작업 성격에 따라 서로 다른 모델로 작업을 분배하는 라우팅 기능(예: 대본 작성은 `GPT-4o`, 단순 탐색은 `DeepSeek`)을 지원합니다.
*   **위험성**: 여러 모델이 번갈아 호출되면서 ViraLoop Studio의 `W_progress.json` 진행 상태나 직전 씬의 수정 히스토리가 서로 다른 모델 간에 완벽히 인수인계(Hand-over)되지 않아 워크플로우 단계가 꼬이는 동기화 문제가 발생할 수 있습니다.
*   **해결책**: 에이전트 라우팅을 사용할 때는 모든 에이전트가 작업 시작 전 반드시 `get_progress` 도구를 호출하여 현재 파이프라인의 정확한 상태를 동기화하도록 프롬프트 룰을 강제해야 합니다.

---

## 3. 안정적인 프로덕션 운영을 위한 프로바이더 및 모델 권장 가이드

OpenClaude를 통해 ViraLoop Studio의 다단계 자동화 파이프라인을 가장 안정적으로 운영하기 위한 모델 및 프로바이더 구성 가이드입니다.

### 3.1 권장 프로바이더 및 모델 티어표

| 티어 (구분) | 권장 모델 | 주요 특징 및 적합도 |
| :--- | :--- | :--- |
| **Tier 1 (최상위 클라우드)** | `Claude 3.7 Sonnet`<br>`GPT-4o` | * 함수 호출(Tool Calling) 정확도 99.9%<br>* 12단계 복합 워크플로우 및 대규모 CSV 조작 완벽 수행 |
| **Tier 2 (고성능 오픈/무료 API)** | `DeepSeek-V3 / R1`<br>`Gemini 1.5 Pro` | * 우수한 코딩 및 도구 호출 추론 역량<br>* 컨텍스트 윈도우가 넓어 대본 분석 및 레퍼런스 유지에 유리 |
| **Tier 3 (로컬 AI 서버 - Ollama)** | `Qwen 2.5 Coder (32B)`<br>`Llama 3.3 (70B)` | * 로컬 환경에서 도구 호출이 가능한 최소한의 파라미터 모델<br>* 7B 이하 모델은 스키마 에러 발생 확률이 높아 비권장 |

### 3.2 로컬 Ollama 구동 시 최적화 실행 스크립트
로컬 Ollama 서버를 OpenClaude와 연동할 때 컨텍스트 윈도우와 도구 호출 성능을 극대화하기 위한 환경 변수 설정입니다.

```powershell
# Windows PowerShell 실행 스크립트 예시 (run_openclaude_local.ps1)
$env:CLAUDE_CODE_USE_OPENAI = "1"
$env:OPENAI_BASE_URL = "http://localhost:11434/v1"
$env:OPENAI_MODEL = "qwen2.5-coder:32b"
# Ollama 서버 측 컨텍스트 윈도우 확장 (Ollama 설정 기준 OLLAMA_NUM_PARALLEL 및 OLLAMA_FLASH_ATTENTION 활성화 권장)

openclaude
```
