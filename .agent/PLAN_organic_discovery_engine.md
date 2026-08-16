# Organic Discovery Engine — 재설계 계획

## 1. 현재 시스템 진단

### 1.1 `/radar/targets` — 마이크로 타겟 생성
| 항목 | 현재 | 문제점 |
|------|------|--------|
| 소스 | Google Autocomplete 1회 (20개) | 단일 소스, 얕은 데이터 |
| 가공 | LLM으로 5개 클러스터링 | 강제 5개 고정, 자연스럽지 않음 |
| 출력 | `List[str]` (문자열 5개) | 에너지 레벨/메타데이터 없음 |
| 재현성 | 항상 같은 결과 | 탐색/발견의 느낌 없음 |

### 1.2 `/radar/keywords` — 급상승 키워드
| 항목 | 현재 | 문제점 |
|------|------|--------|
| 소스 | Autocomplete 10개 + Pytrends | Pytrends unreliable, 자주 실패 |
| 가공 | velocity=0이면 "Steady" | 변별력 없는 라벨링 |
| 형식 | 롱폼/쇼츠 동일 | 쇼츠는 키워드가 아닌 피드여야 함 |

### 1.3 `/radar/outliers` — 아웃라이어 영상
| 항목 | 현재 | 문제점 |
|------|------|--------|
| 소스 | yt-dlp 1회 검색 | 제한적, 검색 정확도 낮음 |
| 필터 | views>=1000 (방금 수정) | 최소 필터만 있음, 계층적 분석 없음 |
| 형식 | duration<=65로만 구분 | 쇼츠/롱폼 분석 로직 동일 |

---

## 2. 목표 아키텍처

### 2.1 핵심 원칙
1. **다중 신호 소스** — 하나의 소스에 의존하지 않음, 3개 이상 소스 크로스체크
2. **가변 출력** — 고정 개수 금지, 데이터에 따라 유기적으로 변동
3. **형식 특화** — 롱폼(키워드 중심) ≠ 쇼츠(피드 중심)
4. **살아있는 느낌** — 에너지 레벨, 시간에 따른 변화, 탐색 행동

### 2.2 전체 데이터 흐름

```
사용자 입력 (broad category)
        │
        ▼
┌─────────────────────────────────────────────┐
│ Layer 1: Signal Collection (병렬 실행)        │
│                                             │
│  [A] YouTube Autocomplete Extended          │
│  └─ 5개 seed query × 10 results = 50개     │
│                                             │
│  [B] yt-dlp Search Sampler                  │
│  └─ 3개 검색어 × 10 results = 30개 영상     │
│     (실제 카테고리/태그/제목 추출)            │
│                                             │
│  [C] LLM Niche Generator                    │
│  └─ broad category → 20개 예상 니치          │
│     (멀티 앵글: 트렌드/리뷰/꿀팁/비교/뉴스)  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ Layer 2: Signal Fusion & Clustering          │
│                                             │
│  ├─ Merge A+B+C → raw_pool (80~100개)      │
│  ├─ Meaning-preserving dedup                │
│  ├─ Semantic clustering (LLM or embedding)  │
│  ├─ 각 클러스터에 energy score 계산         │
│  └─ Output: 10~30 Micro Targets with meta   │
└──────────────────┬──────────────────────────┘
                   │
          사용자가 타겟 선택
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ Layer 3: Format-Specific Deep Dive           │
│                                             │
│  [LONG-FORM PATH]          [SHORTS PATH]    │
│  ┌──────────────┐   ┌──────────────────┐    │
│  │ Keyword       │   │ Feed Discovery   │    │
│  │ Intelligence  │   │ Engine           │    │
│  │               │   │                  │    │
│  │• Autocomplete │   │• Trending Audio  │    │
│  │• yt-dlp title │   │• Format Analysis │    │
│  │  analysis     │   │• EV Ranking      │    │
│  │• VSR ranking  │   │• Audio Tracking  │    │
│  └──────┬───────┘   └────────┬─────────┘    │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ Layer 4: Output                              │
│                                             │
│  Long-form: Keywords + Outlier Videos       │
│  Shorts: Trending Feeds + Shorts Clips      │
└─────────────────────────────────────────────┘
```

---

## 3. Layer 1: Signal Collection (상세)

### 3.1 [A] YouTube Autocomplete Extended
```
Input: "게임"
├─ seed 1: "게임" → 10 results
├─ seed 2: "게임 추천" → 10 results
├─ seed 3: "게임 리뷰" → 10 results
├─ seed 4: "게임 꿀팁" → 10 results
└─ seed 5: "게임 비교" → 10 results
Output: 50개 autocomplete phrases
```

### 3.2 [B] yt-dlp Search Sampler
```
Input: "게임"
├─ search 1: "게임" → 10 videos (extract titles, tags, categories)
├─ search 2: "게임 리뷰 2025" → 10 videos
└─ search 3: "게임 추천" → 10 videos
Output: 30 video metadata objects
```
용도: Autocomplete이 잡지 못하는 실제 업로드 트렌드 포착.
Autocomplete은 "검색어"만 알려주지만, yt-dlp는 "실제 업로드되는 콘텐츠"를 보여줌.

### 3.3 [C] LLM Niche Generator
```
Input: broad category = "게임"
Prompt: "Generate 20 specific micro-niches within '게임'.
For each niche, provide:
- name (Korean, specific)
- why it's trending now
- expected audience size (small/medium/large)

Output format: JSON array of {name, trend_reason, audience_size}"
```
용도: Autocomplete/검색이 잡지 못하는 신생 니치 발견.

---

## 4. Layer 2: Signal Fusion (상세)

### 4.1 클러스터링 알고리즘
```
Input: 80~100 raw phrases + 30 video titles
Process:
  1. Normalize (lowercase, trim, remove noise)
  2. Extract core topic from each item
  3. Group by semantic similarity (LLM or embedding)
  4. For each group:
     - Count source diversity (A/B/C coverage)
     - Calculate energy score
     - Generate human-readable label
Output: 10~30 groups
```

### 4.2 Energy Score 계산
```
Energy Score = w1 * diversity + w2 * freshness + w3 * volume

- diversity: 항목이 A/B/C 중 몇 개 소스에서 발견되었는가
- freshness: yt-dlp 결과에서 최근 업로드 비중
- volume: autocomplete 빈도 + 검색 결과 수
```

### 4.3 출력 형식 (변경)
```json
// 현재 (단순 문자열 배열):
["FPS 게임 추천", "모바일 RPG 리뷰", ...]

// 변경 (메타데이터 포함 객체 배열):
[
  {
    "id": "niche_gaming_fps_001",
    "name": "FPS 게임 추천",
    "energy": "🔥 Hot",
    "source_diversity": 3,
    "video_count_estimate": 45,
    "sample_keywords": ["배틀그라운드 꿀팁", "발로란트 하이라이트", "옵치2 전략"]
  },
  {
    "id": "niche_gaming_rpg_002",
    "name": "모바일 RPG 리뷰",
    "energy": "🌱 Emerging",
    "source_diversity": 2,
    "video_count_estimate": 12,
    "sample_keywords": ["로스트아크 모바일", ...]
  }
]
```

---

## 5. Layer 3: Format-Specific Processing

### 5.1 Long-form Path: Keyword Intelligence Engine
```
Input: 선택된 micro-target
Process:
  1. Auto-expand: target을 3가지 각도로 확장
     - "how to / 방법" angle
     - "review / 리뷰" angle
     - "vs / 비교" angle
  2. 각 angle에 대해:
     - Autocomplete 실행 (각 10개)
     - yt-dlp 검색 (각 5개 영상)
  3. 모든 결과 통합:
     - 중복 제거
     - 연관어 클러스터링
     - VSR 계산 (각 키워드로 검색한 결과의 평균 VSR)
  4. 키워드 정렬:
     - 추천순 (energy + VSR 복합 점수)
Output: 10~20개 키워드 (energy label + VSR preview 포함)
```

### 5.2 Shorts Path: Feed Discovery Engine (신규)
```
Input: 선택된 micro-target
Process:
  1. Trending Audio Detection:
     - yt-dlp: "trending shorts [target] music"
     - 상위 5개 오디오 트렌드 추출
  2. For each trending audio:
     - yt-dlp: "[audio_name] #shorts"
     - 5개 Shorts 영상 수집
  3. 각 Shorts 분석:
     - EV (Engagement Velocity) 계산
     - 포맷 분류 (split-screen/facecam/captions/gaming)
     - 오디오 매핑
  4. 결과 통합:
     - 가장 높은 EV를 가진 Shorts 순으로 정렬
     - 각 Shorts가 사용한 오디오 정보 포함
Output: Shorts 영상 + 트렌딩 오디오 + 포맷 인사이트
```

### 5.3 VSR/EV Tiered Analysis
```
Tier 1: Golden Nugget (VSR > 50 or EV > 20%)
  → 진정한 아웃라이어, 즉시 다운로드 추천
  
Tier 2: Rising Star (VSR 20~50 or EV 10~20%)
  → 주목할만한 채널, 모니터링 추천
  
Tier 3: Normal (VSR 5~20 or EV 5~10%)
  → 일반 인기 영상, 참고용
  
Tier 4: Background (VSR < 5 or EV < 5%)
  → 큰 채널의 일반 영상, 생략 가능
```

---

## 6. API 엔드포인트 설계 (변경)

### 6.1 신규/변경 엔드포인트

```python
# [변경] 마이크로 타겟 — 문자열 배열 → 객체 배열 (메타데이터 포함)
POST /api/keywords/radar/targets
Request:  { "category": "게임" }
Response: [
    {
        "id": "niche_001",
        "name": "FPS 게임 추천",
        "energy": "hot",        # hot|rising|steady|emerging
        "source_count": 3,       # 발견된 신호 소스 개수
        "sample_keywords": ["발로란트", "옵치", "배그"]
    },
    ...
]

# [변경] 롱폼 키워드 — 메타데이터 강화
POST /api/keywords/radar/keywords
Request:  { "category": "게임", "target": "FPS 게임 추천" }
Response: [
    {
        "text": "발로란트 꿀팁",
        "velocity": "Explosive",  # Explosive|Rising|Steady
        "vsr_preview": 12.5,     # 이 키워드 검색 결과의 평균 VSR
        "result_count": 8        # 검색된 영상 수
    },
    ...
]

# [신규] 쇼츠 피드 — 키워드 대신 피드 기반
POST /api/keywords/radar/feeds
Request:  { "category": "게임", "target": "FPS 게임 추천" }
Response: {
    "trending_audio": [
        { "title": "...", "velocity_score": 95, "shorts_count": 12 }
    ],
    "shorts": [
        {
            "id": "...",
            "title": "...",
            "ev_ratio": 15.2,
            "format": "split-screen",  # split-screen|facecam|captions|gaming
            "audio": "trending_audio_name",
            ...
        }
    ],
    "format_insights": {
        "dominant_format": "split-screen",
        "avg_ev": 8.5
    }
}

# [변경] 롱폼 아웃라이어 — 계층적 분석
POST /api/keywords/radar/outliers
Request:  { "category": "게임", "target": "FPS 게임 추천", "keyword": "발로란트" }
Response: {
    "golden_nuggets": [...],   # Tier 1
    "rising_stars": [...],     # Tier 2
    "normal": [...]            # Tier 3
}

# [변경] 쇼츠 아웃라이어 — 피드 기반 EV 분석
POST /api/keywords/radar/shorts-outliers
Request:  { "category": "게임", "target": "FPS 게임 추천", "keyword": "발로란트" }
Response: (feeds endpoint와 동일 구조)
```

---

## 7. 프론트엔드 변경

### 7.1 Miller Column 구조 변경 (Column 2, 3)

| 컬럼 | 현재 | 변경 |
|------|------|------|
| Col 1 | Broad Categories (고정) | Broad Categories (고정, 유지) |
| Col 2 | Micro Targets (문자열 5개) | Micro Targets (객체 10~30개, energy 표시) |
| Col 3 (Long) | Keywords (텍스트+velocity) | Keywords (텍스트+velocity+VSR preview) |
| Col 3 (Shorts) | Keywords (동일) | Feeds (오디오+포맷+EV) |
| Col 4 (Long) | Outlier Videos (flat) | Tiered Outlier Videos (Golden/Rising/Normal) |
| Col 4 (Shorts) | Shorts (flat) | Shorts + Audio Trends + Format Insights |

### 7.2 새로운 UI 요소
- Energy Badge: 🔥 Hot / 📈 Rising / 💤 Steady / 🌱 Emerging
- Source Diversity Indicator: 신호 소스 다양성 표시 (3/3 sources)
- Tier Badge: 👑 Golden Nugget / ⭐ Rising Star / 📊 Normal
- Format Badge (Shorts): split-screen / facecam / captions / gaming
- Audio Trend: 트렌딩 오디오 섹션 (피드 모드)

---

## 8. 구현 단계 (Phase Plan)

### Phase 1: Signal Collection 강화
**목표**: 다중 신호 소스 구축
**작업**:
- [ ] Backend: Autocomplete Extended (5 seed queries)
- [ ] Backend: yt-dlp Search Sampler
- [ ] Backend: LLM Niche Generator
- [ ] Test: 각 소스 독립적 동작 확인

### Phase 2: Signal Fusion & Organic Targets
**목표**: 10~30개 동적 타겟 생성
**작업**:
- [ ] Backend: Signal Fusion & Clustering
- [ ] Backend: Energy Score Calculation
- [ ] Backend: Target 출력 형식 변경 (문자열→객체)
- [ ] Frontend: Col 2 업데이트 (energy badge, diversity)

### Phase 3: Format Differentiation
**목표**: 롱폼(키워드) ≠ 쇼츠(피드) 완전 분리
**작업**:
- [ ] Backend: Feed Discovery Engine (신규)
- [ ] Backend: Keyword Intelligence 강화 (angle 확장)
- [ ] Backend: Tiered VSR/EV Analysis
- [ ] Frontend: Col 3 분기 (키워드 vs 피드)

### Phase 4: UI/UX Organic Feel
**목표**: 살아있는 느낌 구현
**작업**:
- [ ] Frontend: Tiered 결과 표시 (Golden/Rising/Normal)
- [ ] Frontend: Audio Trend 섹션
- [ ] Frontend: Format Insights 섹션
- [ ] Frontend: 애니메이션/트랜지션 개선

---

## 9. 기술적 고려사항

### 성능
- Signal Collection: 병렬 실행 (asyncio.gather 또는 ThreadPoolExecutor)
- yt-dlp 호출: 각 5~15초 소요, 병렬 처리 필수
- 예상 총 소요 시간: 15~30초 (병렬 시 10~15초)

### 캐싱
- Targets 결과: 5분 TTL 캐시 (같은 broad category 재요청 시)
- Keywords 결과: 2분 TTL 캐시
- Feeds 결과: 3분 TTL 캐시

### 에러 처리
- 각 신호 소스 독립적 (하나 실패해도 나머지로 fallback)
- 모든 신호 실패 시 → 현재의 fallback 사용
- Redis 캐시 사용 가능 시: 캐시된 이전 결과로 fallback

### LLM 비용 최적화
- Niche Generation: broad category당 1회 호출 (캐싱)
- Clustering: 1회 호출
- Keyword Analysis: target당 1회 호출

---

## 10. 개방형 질문 (결정 필요)

1. **LLM Embedding 기반 클러스터링 vs LLM text generation?**
   - Embedding: 더 정확하지만 인프라 필요
   - Text generation: 간단하지만 비쌈

2. **Shorts Feed Discovery의 깊이?**
   - 기본: yt-dlp 검색 + EV 계산
   - 고급: YouTube Shorts API 시뮬레이션 + 피드 크롤링

3. **캐싱 전략?**
   - In-memory (간단, 서버 재시작 시 소실)
   - Redis (영속적, 별도 인프라 필요)

4. **타겟의 시간에 따른 변화 추적?**
   - 같은 broad category 재방문 시 다른 타겟 제안 (탐색 느낌)
   - 또는 이전 타겟 유지 + 새로운 타겟 추가 (발전 느낌)
