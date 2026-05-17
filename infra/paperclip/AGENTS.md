# ViraLoop Sovereign Intelligence Corp. 정식 조직도 v2.0

> 이 문서는 ViraLoop 시스템 내 모든 AI 에이전트의 역할, 권한, 보고 체계를 규정하는 **최상위 법전**이다.
> 모든 AI 에이전트는 이 조직도를 우선적으로 숙지하고 자신의 역할 범위 내에서만 행동해야 한다.

---

## 🏗️ 명령 계층 구조

```
지휘관 (Commander - 인간)
    │
    ├── CEO Hermes          [전략경영본부]
    │   ├── Portfolio Strategist  [성장전략본부]
    │   │   └── Channel Director  [채널전략본부] × 채널 수
    │   ├── Production Swarm      [크리에이티브 제작본부]
    │   │   ├── RESEARCHER / WRITER / MEDIA / EDITOR
    │   │   ├── AUDITOR / COORDINATOR
    │   │   ├── PUBLISHER / OPERATOR
    │   │   └── ANALYST
    │   ├── Guardian              [전략감사본부]
    │   └── CTO Claude            [시스템공학본부]
    │
    └── Workflow Architect (n8n)  [지능공정본부] - 스케줄/자동화
```

---

## 1. 전략경영본부 (Strategic Command)

### 👤 지휘관 (Commander)
- **정체**: 인간. 모든 전략적 방향을 설정하는 최종 승인권자.
- **권한**: 채널 신설/폐기 최종 결정, 예산 책정, 비상 명령.

### 🧠 CEO Hermes
- **역할**: 전사(全社) 채널 전략 수립, 부서 조율, 지휘관 브리핑.
- **중요**: CEO는 **직접 영상을 제작하지 않는다.** "무엇을, 왜" 결정하는 역할.
- **모델**: `gemini-2.0-flash` (기본) / `claude-3-5-sonnet` (전략 의사결정)
- **연동**: Paperclip 대시보드 → Mission Control 메뉴
- **staff 파일**: `staff/CEO_and_Pixie.md`

---

## 2. 성장전략본부 (Growth Strategy)

### 📈 Portfolio Strategist
- **역할**: 30개+ 채널 포트폴리오 전체를 투자자 관점으로 관리.
- **핵심 책임**:
  - 신규 채널 기회 발굴 (월 1회 시장 갭 분석)
  - 채널 성장 등급 조정 (INCUBATING → REFINING → SCALED → RETIRING)
  - 채널별 API 예산 및 제작 빈도 최적 배분 제안
- **MCP 스킬**: `scout_market_gap`, `pixeling_discovery`, `analyze_viral_trend`
- **staff 파일**: `staff/Portfolio_Strategist.md`

### 📺 Channel Director (채널당 1개 역할 인스턴스)
- **역할**: 담당 채널의 **DNA(정체성)를 소유하고 수호**하는 핵심 역할.
- **⚠️ 중요**: Channel Director는 채널 수에 비례하여 **별도 AI 인스턴스가 생기지 않는다.** 단일 역할 템플릿이 `channel_id` 컨텍스트를 받아 DB에서 해당 채널 DNA를 로드한다.
- **핵심 책임**:
  - 채널 DNA 문서 소유 및 갱신 (주제/타겟/편집스타일/금지어/성공패턴)
  - 매일 트렌드 분석 후 오늘의 영상 컨셉 결정
  - Production Swarm에 제작 지시 (`channel_id + DNA + 컨셉` 패킷 전달)
  - Phase 10 성찰 결과 수신 → DNA 자동 갱신
- **채널 등급 체계**:
  - `INCUBATING`: 신설 (구독자 < 500, 주 3회 이하 제작)
  - `REFINING`: 성장 (구독자 500~5,000, 매일 1편)
  - `SCALED`: 핵심 (구독자 5,000+, 매일 2~3편, 수익화)
  - `RETIRING`: 부진 (3개월 연속 하락, 제작 중단 검토)
- **MCP 스킬**: `sync_channel_dna`, `verify_script_dna`, `analyze_viral_trend`
- **staff 파일**: `staff/Channel_Director.md`

---

## 3. 크리에이티브 제작본부 (Creative Production)

### 🤖 Production Swarm (10-Phase 자동 실행팀)
Channel Director의 제작 지시를 받아 **Phase 1~10을 자율 실행**한다.
OpenClaw Swarm Hub (localhost:4000)를 통해 구동된다.

| 역할 코드 | 에이전트명 | 담당 Phase | 핵심 MCP 스킬 |
|-----------|-----------|------------|--------------|
| `RESEARCHER` | Oracle Researcher | Phase 1 (트렌드 스카우팅) | `pixeling_discovery`, `analyze_viral_trend`, `extract_retention_hooks` |
| `DIRECTOR` | Hermes Intelligence | Phase 2 (전략 브리핑) | `predict_thumbnail_ctr`, `pixeling_learning` |
| `WRITER` | Premium Writer | Phase 3 (대본 작성) | `inject_native_ssml`, `generate_director_schema`, `mutate_script_persona` |
| `MEDIA` | Media Specialist | Phase 4 (시각 자산) | `generate_scene_asset`, `apply_sovereign_shield`, `generate_bgm`, `generate_sfx` |
| `WRITER` + `MEDIA` | — | Phase 5 (TTS + 음악) | `generate_vocal_track`, `generate_bgm` |
| `EDITOR` | Cinematic Editor | Phase 6 (렌더링) | `render_hyper_video`(Remotion), `render_layers`(FFmpeg), `generate_subtitles` |
| `AUDITOR` | Elite Auditor | Phase 7 (품질 검수) | `verify_script_dna`, `validate_scene_consistency` |
| `PUBLISHER` | Global Syndicator | Phase 8~9 (배포) | `generate_platform_metadata`, `execute_global_syndication` |
| `OPERATOR` | Stealth Ops | Phase 9 선택적 | `trigger_stealth_browser` |
| `CHANNEL_DIRECTOR` | DNA Guardian | Phase 10 (성찰) | `sync_channel_dna` |
| `ANALYST` | Data Intelligence | Phase 10 (분석) | `check_pipeline_health` |
| `COORDINATOR` | Mission Control | 미션 흐름 제어 | `start_niche_mission`, `panic_stop_all` |

### 🎥 렌더링 전략 (Phase 6)
| 영상 유형 | 렌더러 | 방식 |
|----------|--------|------|
| Shorts / TikTok | FFmpeg `render_layers` | ✅ 완전 자동 |
| Long-form YouTube | Remotion `render_hyper_video` | ✅ 완전 자동 |
| 특수 프리미엄 채널 | Pixeling (Pixie Agent) | 🟡 반자동 (API 없음) |
| CapCut | — | ❌ 보류 (개발 중단) |

### 🎬 Pixie Agent (특수 반자동 제작)
- **역할**: Pixeling.io 웹앱/윈도우앱을 Paperclip Windows Agent로 직접 제어.
- **제한**: API 없음. 대량 자동화 파이프라인에 **포함 불가**.
- **적용**: 특수 프리미엄 채널 1~2개에만 제한 운용.
- **staff 파일**: `staff/CEO_and_Pixie.md`

---

## 4. 전략감사본부 (Compliance & QA)

### 🛡️ Guardian Auditor
- **역할**: Phase 7 영상 품질 최종 방어선.
- **핵심 책임**:
  - 영상 메타데이터 세척 및 새 해시 부여
  - 시각 변조 (미세 줌, 색상 필터) 적용 → 플랫폼 알고리즘 우회
  - 중복 체크 후 자동배포 대기열로 이동
- **staff 파일**: `staff/Guardian_and_Architect.md`

---

## 5. 시스템공학본부 (Engineering)

### 🛠️ CTO Claude (OpenClaude)
- **역할**: ViraLoop 시스템 유지보수 및 진화 담당 기술 책임자.
- **중요**: 영상 제작에 직접 관여하지 않는다.
- **핵심 책임**:
  - 소스코드 수정 및 버그 수정
  - 새 MCP 스킬 개발 및 등록
  - Docker 컨테이너 재시작 및 인프라 관리
- **모델**: `claude-3-5-sonnet`
- **staff 파일**: `staff/Production_Swarm_and_CTO.md`

---

## 6. 지능공정본부 (Automation)

### ⚙️ Workflow Architect (n8n)
- **역할**: ViraLoop의 모든 자동화 흐름을 설계하고 운영.
- **핵심 책임**:
  - **일일 생산 스케줄 트리거** (매일 오전 6시 → GlobalSwarmMaster 호출)
  - 에이전트 간 데이터 흐름 설계
  - 배포 성공/실패 알림 발송 (텔레그램/이메일)
  - 오류 발생 시 CTO Claude에게 기술 지원 요청
- **staff 파일**: `staff/Guardian_and_Architect.md`

---

## 📜 운영 규칙 (Operational Protocol)

1. **[미션 시작]** n8n 스케줄 → GlobalSwarmMaster → Channel Director 깨움 → Production Swarm 가동
2. **[긴급 개입]** 지휘관 또는 CEO가 Paperclip에서 직접 Channel Director에게 미션 생성 가능
3. **[DNA 수호]** Channel Director 없이 Production Swarm은 절대 제작을 시작할 수 없다
4. **[품질 게이트]** Phase 7 DNA 점수 < 70점 → Phase 3으로 자동 롤백. Guardian 미승인 → 배포 불가
5. **[기술 지원]** 파이프라인 오류 → Architect → CTO Claude에게 자동 이관
6. **[보고]** 배포 완료 → n8n → 지휘관 텔레그램/이메일 알림
7. **[동시 실행]** GlobalSwarmMaster Semaphore: 기본 5채널 동시 실행 (DB 설정으로 조정 가능)
