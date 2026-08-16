# AI 리서치 인텔리전스 → Production Research Brain (구현 스펙)

> 상태: **구현 완료** (2026-06-07) — 백엔드 81 + 프론트 16 테스트 통과. 피드백 루프(Phase 3)는 후속 작업으로 남김.
> 목표: AI 리서치 인텔리전스 메뉴를 "자동 영상 공장의 두뇌"로 재설계.
> 리서치가 그 자체로 끝나지 않고, **쇼츠/롱폼 대본 생성을 직접 구동하는 구조화 산출물**을 만든다.
> 인간 검토·개입은 품질 게이트 미달분에만 발생하도록 최소화한다.

## 0. 설계 원칙 / 저작권 경계

- **합법 경계**: 본 시스템은 "영상이 아니라 포맷(hook/story arc)을 복제"한다.
  - **레퍼런스 영상**: 채널정보 + 영상 링크 + 메타데이터 + (자동)트랜스크립트/썸네일만 분석용으로 저장. 원본 미디어 재배포 안 함.
  - **제작용 에셋**: Pexels / Pixabay / Internet Archive / Wikimedia / CC 라이선스 등 **합법 소스에서만** 다운로드하고, 라이선스·출처(attribution)를 자산마다 기록.
  - Content ID 우회(좌우반전/속도/확대) 같은 기법은 구현하지 않음 — 실효성 없고 정책 위반.
- **테스트(TDD 필수, CLAUDE.md)**: 모든 서비스는 `llm_client`/`search_fn`를 주입받아 mock 단위테스트. 통합 테스트로 파이프라인 검증.
  - 백엔드: `python -m pytest` (pytest 9.x). 테스트 위치 `apps/api/tests/<mirror>`.
  - 프론트: vitest. `tests/components/...`.

## 1. 아키텍처 개요

```
[Content Radar]            [Research Brain — 3 Stage]                 [Production]
 트렌드/니치/소재  ──▶  A. Deep Research Loop  ──▶ B. Brief Compiler ──▶ C. Quality Gate ──▶ 대본/영상
 (기존 discover_niches,        검색→claims 추출         claims→hook_bank        LLM-Judge        (mission_runner,
  scout, trend)               성찰→갭→후속검색         narrative_beats         하드게이트+루브릭     script_engine)
                              교차검증/모순탐지        broll_cues
                                       │                                          │
                                       └──────────  Source Asset Manager  ────────┘
                                          레퍼런스(링크/메타/트랜스크립트) + 합법 제작에셋(라이선스 추적)
              ▲                                                                    │
              └────────────────  Feedback Loop (성과→리서치 우선순위/hook 학습)  ──┘
```

## 2. 핵심 산출물: `ProductionResearchBrief` 스키마

`apps/api/app/services/intelligence/research_brain/schema.py` (pydantic v2).

```
ProductionResearchBrief
  topic: str
  niche: str
  angle: str                     # 단일 관점 고정 ("왜 X인가")
  promise: str                   # 시청자가 얻을 것
  timeliness: Timeliness         # type(timely|evergreen), trend_velocity(0-1), expiry?
  atomic_claims: list[AtomicClaim]
  hook_bank: list[Hook]
  narrative_beats: NarrativeBeats  # shorts: list[ShortBeat], longform: list[Chapter]
  broll_cues: list[BrollCue]
  contradictions: list[Contradiction]
  format_card: FormatCard          # hook_type, story_arc[]
  production_readiness: float      # 0-10 (Quality Gate가 채움)
  gate: QualityGateResult | None

AtomicClaim: claim, exact_stat?, source_url, source_title, credibility(0-1), verified(bool), emotion_trigger
Hook: type(curiosity_gap|bold_claim|question|micro_story|visual_shock), text, strength(0-10), claim_ref?
ShortBeat: role(hook|point|payoff|loop), text, seconds(int), claim_ref?
Chapter: index, title, beat, rehook?, seconds(int), broll_query?
BrollCue: beat_ref, query(영문 검색어), source(pexels|pixabay|archive|wikimedia), asset_id?
Contradiction: claim_a, claim_b, note
FormatCard: hook_type, story_arc[], source_replacement_query
```

검증 규칙(스키마 레벨): hook.type/beat.role enum, claim.credibility∈[0,1], 최소 1개 hook·1개 short beat,
verified claim ≥ 임계값(기본 2)일 때만 `is_production_ready()` true.

## 3. Stage A — Deep Research Loop (`deep_research.py`)

`DeepResearchLoop(llm_client, search_fn, max_loops=3)`:
1. `seed_query` 검색 → 결과에서 `atomic_claims` 추출 (LLM: 엔티티/숫자/날짜 필수 JSON + followups[])
2. 성찰: 누적 claims로 "가장 큰 지식 갭 → 자체완결 후속 쿼리 1개" 생성
3. 후속 검색 → claims 누적 (중복 제거: claim 텍스트 정규화 Set)
4. `max_loops` 또는 "갭 없음" 종료
5. 출처 교차검증: 동일 주장 2+ 출처 → credibility↑, 충돌 → contradictions
- 반환: `list[AtomicClaim]`, `list[Contradiction]`
- 비용: 라운드당 LLM 2회(추출+성찰) + 검색 1회. max_loops=3 → ~7 LLM call.

## 4. Stage B — Brief Compiler (`brief_compiler.py`)

`BriefCompiler(llm_client)`:
- `compile(topic, niche, claims, contradictions) -> ProductionResearchBrief`
  - angle/promise 도출 (LLM 1회)
  - hook_bank: 5분류 각 1~2개 (LLM 1회, claim 근거 매핑)
  - narrative_beats.shorts: hook→point×3~5(8-12s)→payoff→loop (LLM 1회)
  - narrative_beats.longform: claims를 챕터로 재배치, 60-90s마다 rehook (LLM 1회)
  - broll_cues: 각 beat→영문 시각 검색어 (LLM 1회 또는 규칙)
  - format_card: hook_type + story_arc 추출
- 비용: ~5 LLM call. 실패 시 부분 브리프 + degraded 플래그.

## 5. Stage C — Quality Gate (`quality_gate.py`)

`QualityGate(llm_client)` — DAG 방식(fail-fast):
1. **하드 게이트(결정적, LLM 무관)**: 스키마 유효 / verified claim ≥ N / hook ≥1 / short beats ≥3 / 각 claim source_url 형식 유효
2. **루브릭(LLM-Judge 1회, 1-10)**: hook_strength, content_clarity, faithfulness(claims가 출처에 근거하는가)
3. `production_readiness = 0.4*hook + 0.3*faithfulness + 0.3*clarity`
4. 결과: pass(≥8.5) → "제작확정" / review(6.5-8.5) → 인간검토 / reject(<6.5) → 재시도
- grader 파싱 실패 시 절대 pass로 처리하지 않음(=review).

## 6. Source Asset Manager (`source_assets.py`)

- `ReferenceVideo` 모델: url, platform, channel_name, channel_url, title, view_count, like_count,
  duration, thumbnail_url, transcript(text), lang, format_card_json, collected_at.
  - 수집: 기존 `YouTubeScoutV2`(yt-dlp `--dump-json`) + 자막(`--write-auto-sub`) 활용. 메타/링크/트랜스크립트만.
- `SourceAsset` 모델: provider(pexels|pixabay|archive|wikimedia), source_url, local_path?,
  license, attribution, query, brief_id?, downloaded_at.
  - 커넥터: Pexels/Pixabay API(키는 Settings), 다운로드 + 라이선스 기록. 키 없으면 비활성/링크만.
- UI에서 채널정보·영상링크 확인 + 합법 에셋 검색/다운로드.

## 7. DB 변경

- `ResearchReport`: `brief_json` (JSON) 컬럼 추가 — ProductionResearchBrief 직렬화 저장.
  `research_depth`(Int), `production_readiness`(Float), `gate_status`(String) 추가.
- 신규 테이블: `reference_videos`, `source_assets`.
- 자동 마이그레이션: `migrate_db.repair_schema()`가 처리(새 컬럼/테이블).

## 8. API (research.py 확장, prefix `/api`)

- `GET /research/briefs` / `GET /research/briefs/{id}` — 구조화 브리프 조회
- `POST /research/brief/deep` — 토픽 즉시 딥리서치 실행(동기/백그라운드)
- `GET /research/reference-videos`, `POST /research/reference-videos` (링크 등록→메타/트랜스크립트 수집)
- `GET /research/source-assets`, `POST /research/source-assets/search` (합법 소스 검색), `POST .../download`
- `POST /research/briefs/{id}/to-script?format=shorts|longform` — 대본 생성기로 핸드오프

## 9. 스케줄러 연결

- `execute_research_brief` 교체: 단일패스 → `ResearchBrain.run(topic)` (A→B→C). 결과 brief_json 저장.
  pass면 자동 제작 큐 등록 옵션, review/reject면 상태 표기.
- 기존 잡 id `research_executor` 유지.

## 10. UI (ResearchIntelligence.tsx)

- "연구 피드" 탭 → **브리프 카드**: angle/promise, atomic_claims(출처·검증배지), hook_bank(분류칩+강도바),
  narrative_beats(쇼츠 타임라인 / 롱폼 챕터 토글), broll_cues, production_readiness 게이지, gate 배지.
  - 액션: [쇼츠 대본] [롱폼 대본] [에셋 검색] [복사].
- 신규 "소스 매니저" 탭: 레퍼런스 영상(채널/링크/조회수/트랜스크립트), 합법 에셋 검색·다운로드·라이선스.
- 품질: shadcn 카드/탭/배지/게이지, 로딩·빈상태·에러 처리, 한국어 라벨, 반응형.

## 11. 구현 순서 (TDD)

1. schema.py + 단위테스트 (검증/직렬화)         ← 순수 로직, 의존성 0
2. deep_research.py + 테스트 (search/LLM mock)
3. brief_compiler.py + 테스트
4. quality_gate.py + 테스트
5. orchestrator(ResearchBrain) + 통합테스트
6. DB 모델 + repair 확인
7. source_assets.py + 테스트
8. API 엔드포인트 + 테스트
9. scheduler 연결
10. UI + vitest

## 12. 참고 (조사 출처)
- 딥리서치 패턴: local-deep-researcher(IterDRAG), dzhng/deep-research(구조화 learnings), STORM(다관점), GPT-Researcher(plan-execute), open_deep_research(supervisor+think_tool)
- 후킹/리텐션: OpusClip hook formulas, Terra Market 7 formulas, Virvid 3-sec hooks (curiosity gap/open loop/5분류)
- 롱폼/B-roll: SUMERA(footage plan), River(timed re-hooks), AIR Media-Tech(retention editing)
- 품질게이트: OpusClip LLM-as-Judge(Hook/Content/Visual 루브릭), DeepEval DAG(fail-fast gate), FActScore(claim decomposition)
- 합법 소스: Pexels/Pixabay/Internet Archive/Wikimedia API
