# AI 리서치 인텔리전스 — 개선 분석 (구현 보류)

> 상태: **분석 완료 / 구현 보류** (작성일 2026-06-09)
> 코드 정밀 분석 + 오픈소스 deep-research 프레임워크(SOTA) 조사 종합.

## 1. 현재 시스템 구조

핵심 파이프라인: `apps/api/app/scheduler.py:643-969` 의 3단 자동화

```
discover_niches (60분)      트렌드 → 니치 클러스터 (LLM clustering)
generate_research_topics (30분)  니치당 평면적 질문 5개 (LLM)
execute_research_brief (60분)    검색 1회(top-8) + LLM 요약 1회
```

관련 파일:
- 백엔드 API: `apps/api/app/routers/research.py` (8 엔드포인트)
- DB 모델: `apps/api/app/models.py:1279-1332` (ResearchNiche / ResearchTopic / ResearchReport)
- 프론트 UI: `apps/dashboard/src/pages/ResearchIntelligence.tsx` (5탭)
- 스크립트 주입: `apps/api/app/script_engine.py:100-126` (use_web_search 시 즉석 재검색)
- 전략: `apps/api/app/services/intelligence/strategic_center.py` (Shadow Boxing / Blue Ocean — UI 미연결)
- NotebookLM: `apps/api/app/services/intelligence/notebook_scout.py` (placeholder 상태)
- 자율 스카우트: `apps/api/app/services/intelligence/autonomous_scout.py` (browser-use 기반)

## 2. 진단된 약점

| # | 문제 | 위치 |
|---|------|------|
| A | 단일 패스 리서치 (검색1+요약1, 반복심화·후속질문·갭분석 없음) | `scheduler.py:879-942`, `research.py:36-107` |
| B | 출처 검증 0 (title/url만 저장, URL유효성·사실확인 없음) | `scheduler.py:892-896` |
| C | 평면적 주제 생성 (단일 시점 프롬프트) | `scheduler.py:780-828` |
| D | NotebookLM Scout 껍데기 (`_generate_placeholder_summary` 더미 반환) | `notebook_scout.py:48-49,83-88` |
| E | 순차 처리 — 시간당 1개 주제만 (`.first()`) | `scheduler.py:858-862` |
| F | 재랭킹/중복제거/최신성 점수 없음 | 전역 |
| G | 전략 자산(Shadow Boxing/Blue Ocean) UI 미연결 | `strategic_center.py` |
| H | 리포트가 막다른 길 (localStorage 전달뿐, 재사용 자산 아님) | `ResearchIntelligence.tsx:189-193` |

## 3. SOTA 패턴 (저비용→고비용)

| 패턴 | 출처 repo | 비용 | 효과 |
|------|-----------|------|------|
| ① 성찰→갭분석→후속검색 루프 | langchain-ai/local-deep-researcher (IterDRAG) | 라운드당 LLM 1회 | 단일패스→반복심화. 최대 품질 점프 |
| ② 구조화 learnings 추출 (엔티티/숫자/날짜 필수 JSON) | dzhng/deep-research | 0 (요약 대체) | 중복제거·인용매핑·후속질문 자동화 |
| ③ 다관점 질문 생성 (creator/수익화/오디언스/경쟁사/SEO) | stanford-oval/storm | 0 (질문생성 대체) | 커버리지↑ |
| ④ 계획→병렬실행 fan-out | assafelovic/gpt-researcher | N동시검색 | 처리량·컨텍스트 격리 |
| ⑤ breadth×depth 감쇠 재귀 (breadth/2, depth-1) | dzhng/deep-research | 트리 경계 | 초반 넓게/후반 깊게 |
| ⑥ 인용 그라운딩+검증 (URL접근성+관련성+사실확인) | langchain-ai/open_deep_research (compress_research) | HTTP+선택1회 | 신뢰성 |
| ⑦ supervisor + think_tool + 격리 컨텍스트 | langchain-ai/open_deep_research | 멀티에이전트 루프 | PhD-bench급 (고비용) |

참고: Perplexica(임베딩 재랭킹), Khoj(스케줄 자동 리서치).

## 4. 단계별 개선안 (제안)

### Phase 1 — Deep Research Loop (저비용·최대효과) ⭐
`execute_research_brief` 단일패스 → 반복심화 루프 교체:
```
질문 → 검색 → 구조화 learnings 추출(②) → 성찰:갭식별(①)
     → 후속질문 1개 → 재검색 → learnings 누적 (max_loops=3) → 최종합성(인용포함)
```
- `ResearchReport`에 `learnings_json`, `research_depth` 컬럼 추가
- TDD: 루프 종료조건 / learnings 파싱 / 갭 추출 mock 테스트

### Phase 2 — 다관점 + 병렬 + 검증
- ③ `generate_research_topics` 다관점 페르소나 질문으로 교체
- ④ `execute_research_brief` `.first()` → top-N 병렬 (`asyncio.gather` + 동시성 cap)
- ⑥ 인용 검증 (URL접근성 + 관련성 점수), `sources_json`에 `credibility`/`verified`
- F 검색결과 재랭킹·중복제거

### Phase 3 — 전략 통합 + 실제 NotebookLM
- G `StrategicCenter` → Research UI 6번째 "전략" 탭 연결
- D NotebookLM Scout 실제 구현 또는 제거 결정
- H learnings를 `script_engine.py` web_research_text에 직접 주입 (즉석 재검색 중복 제거)

## 5. 참고 repo URL
- https://github.com/assafelovic/gpt-researcher
- https://github.com/langchain-ai/open_deep_research
- https://github.com/stanford-oval/storm
- https://github.com/langchain-ai/local-deep-researcher
- https://github.com/dzhng/deep-research
- https://github.com/ItzCrazyKns/Perplexica
- https://github.com/khoj-ai/khoj
