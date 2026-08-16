-- ============================================================================
-- schema_v8.sql — 자막 자동 학습 시스템 (2026-05-17)
-- 11채널 × 27영상 = 297영상 학습 → 표현 풀 + 패턴 + 상황 카테고리 추출
-- 매너리즘 방지 — 자연 다양성 + 빈도 모니터링
-- ============================================================================

-- 1) 학습 대상 영상 queue (NexLev에서 받은 297영상)
CREATE TABLE IF NOT EXISTS subtitle_learning_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    video_id TEXT NOT NULL UNIQUE,
    video_url TEXT NOT NULL,
    title TEXT,
    view_count INTEGER,
    rank_in_channel INTEGER,             -- 채널 내 인기 순위 (1~27)
    status TEXT DEFAULT 'pending',        -- pending / comments_done / analyzed / failed
    comments_json TEXT,                   -- NexLev 인기 댓글 top 20 (JSON)
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_slq_status ON subtitle_learning_queue(status);
CREATE INDEX IF NOT EXISTS idx_slq_channel ON subtitle_learning_queue(channel_id);

-- 2) 상황 카테고리 (동적 추가)
CREATE TABLE IF NOT EXISTS subtitle_situations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_key TEXT NOT NULL UNIQUE,    -- "gta_stunt", "baseball_reflex", "animal_reaction" 등
    category_name TEXT NOT NULL,           -- "GTA 멋진 스턴트", "야구 반사신경", "동물 의외 반응"
    description TEXT,                       -- 상황 설명
    example_video_ids TEXT,                -- JSON list 학습 영상 ID
    usage_count INTEGER DEFAULT 0,         -- 자막 생성 시 매칭된 횟수
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_matched_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sit_key ON subtitle_situations(category_key);

-- 3) 학습 raw 사례 (영상별 자막 + 톤 분석)
CREATE TABLE IF NOT EXISTS subtitle_learnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    situation_category TEXT,                -- subtitle_situations.category_key 참고

    -- 영상 분석 결과
    video_summary TEXT,                     -- Gemini가 본 전체 흐름
    key_moments_json TEXT,                  -- 주요 순간 timestamp + 설명

    -- 자막 패턴 추출
    hook_subtitle TEXT,                     -- 첫 후크 자막 (~데체)
    situation_subtitles_json TEXT,          -- 상황 자막 list
    jjap_jjap_i_json TEXT,                  -- 쨉쨉이 list
    dialogue_json TEXT,                     -- 대사 list
    ending_marker TEXT,                     -- 마무리 표현 (ㄷㄷ / ... / 무 / 등)

    -- 톤 분석
    mz_words_json TEXT,                     -- 사용된 MZ 신조어 list
    meme_format TEXT,                       -- 사용된 밈 형식 (대화/반전/캐릭터별명 등)
    character_nicknames_json TEXT,          -- 영상 안 캐릭터 별명

    -- 댓글 인사이트
    top_comments_json TEXT,                 -- 인기 댓글 top 5 + 시청자 해석

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(video_id)
);

CREATE INDEX IF NOT EXISTS idx_sl_situation ON subtitle_learnings(situation_category);
CREATE INDEX IF NOT EXISTS idx_sl_channel ON subtitle_learnings(channel_id);

-- 4) 압축 패턴 (매주 자동 추출)
CREATE TABLE IF NOT EXISTS subtitle_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_type TEXT NOT NULL,            -- "hook", "ending", "jjap_jjap_i", "character_nickname"
    situation_category TEXT,                -- subtitle_situations.category_key (NULL = 범용)
    pattern_description TEXT,
    example_subtitles_json TEXT,            -- 사례 list
    rarity_score REAL DEFAULT 0.5,         -- 0~1, 1=흔함 0=신박
    use_count INTEGER DEFAULT 0,           -- 자막 생성 시 사용 횟수
    last_used_at TIMESTAMP,
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sp_type_cat ON subtitle_patterns(pattern_type, situation_category);

-- 5) 표현 풀 (의미별, 자동 확장)
CREATE TABLE IF NOT EXISTS subtitle_expression_pool (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meaning_key TEXT NOT NULL,             -- "defeat", "victory", "attempt", "provocation", "shock" 등
    meaning_name TEXT NOT NULL,             -- "패배", "승리", "시도", "도발", "충격"
    expression TEXT NOT NULL,               -- "광탈", "X됨", "골로 감" 등
    tone TEXT,                              -- "위트", "충격", "코미디", "허무" 등
    use_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    source_video_ids_json TEXT,             -- 학습 출처 영상 ID list
    UNIQUE(meaning_key, expression)
);

CREATE INDEX IF NOT EXISTS idx_sep_meaning ON subtitle_expression_pool(meaning_key);

-- 6) 자주 쓴 표현 빈도 (매너리즘 모니터링)
CREATE TABLE IF NOT EXISTS subtitle_phrase_frequency (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phrase TEXT NOT NULL UNIQUE,            -- "ㄷㄷ", "광탈", "시전" 등
    category TEXT,                          -- "ending", "expression", "mz_word"
    use_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    consecutive_uses INTEGER DEFAULT 0,     -- 연속 사용 횟수 (매너리즘 신호)
    last_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spf_phrase ON subtitle_phrase_frequency(phrase);

-- 7) 학습 진행 추적
CREATE TABLE IF NOT EXISTS learning_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,        -- 학습 세션 ID
    total_videos INTEGER,
    completed INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    current_video_id TEXT,
    status TEXT DEFAULT 'running',          -- running / completed / failed / cancelled
    cost_usd REAL DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    summary TEXT                            -- 끝 보고 (패턴 수 / 표현 수 / 매너리즘 신호)
);

-- ============================================================================
-- 초기 의미 풀 시드 (매너리즘 방지 룰에서 정의된 풀)
-- ============================================================================

INSERT OR IGNORE INTO subtitle_expression_pool (meaning_key, meaning_name, expression, tone) VALUES
-- 패배
('defeat', '패배', '광탈', '위트'),
('defeat', '패배', 'X됨', '위트'),
('defeat', '패배', '골로 감', '허무'),
('defeat', '패배', '리타이어', '평범'),
('defeat', '패배', 'GG', '위트'),
('defeat', '패배', '퇴장', '평범'),
('defeat', '패배', '폭사', '충격'),
-- 승리
('victory', '승리', '참교육', '위트'),
('victory', '승리', '응징', '위트'),
('victory', '승리', '갓', '강조'),
('victory', '승리', '1승', '코미디'),
('victory', '승리', '박살', '강조'),
-- 시도
('attempt', '시도', '시전', '위트'),
('attempt', '시도', '도전', '평범'),
('attempt', '시도', '출격', '위트'),
-- 도발
('provocation', '도발', '너냐?', '대화'),
('provocation', '도발', '이게 뭐냐', '대화'),
('provocation', '도발', '어그로', '위트'),
('provocation', '도발', '시비 ON', '위트'),
-- 정체·반전
('reveal', '정체·반전', '사실은', '반전'),
('reveal', '정체·반전', '알고보니', '반전'),
('reveal', '정체·반전', '진짜로', '반전'),
('reveal', '정체·반전', 'X였음', '반전'),
-- 충격
('shock', '충격', 'ㄷㄷ', '충격'),
('shock', '충격', '미친', '충격'),
('shock', '충격', '헐', '충격'),
('shock', '충격', '와우', '충격'),
('shock', '충격', 'ㄹㅇ', '강조'),
-- 마무리 (ending)
('ending_shock', '마무리(충격)', 'ㄷㄷ', '충격'),
('ending_shock', '마무리(충격)', 'ㅎㄷㄷ', '충격'),
('ending_shock', '마무리(충격)', '헐', '충격'),
('ending_shock', '마무리(충격)', '미친', '충격'),
('ending_nihil', '마무리(허무)', '..', '허무'),
('ending_nihil', '마무리(허무)', '...', '허무'),
('ending_nihil', '마무리(허무)', '하', '허무'),
('ending_nihil', '마무리(허무)', '어쩔', '허무'),
('ending_comedy', '마무리(코미디)', 'ㅋ', '코미디'),
('ending_comedy', '마무리(코미디)', 'ㅋㅋ', '코미디'),
('ending_comedy', '마무리(코미디)', 'ㅋㅋㅋ', '코미디'),
('ending_surprise', '마무리(의외)', '??', '의외'),
('ending_surprise', '마무리(의외)', '???', '의외'),
('ending_wit', '마무리(위트)', 'X됨', '위트'),
('ending_wit', '마무리(위트)', '참교육', '위트'),
('ending_wit', '마무리(위트)', '광탈', '위트'),
('ending_wit', '마무리(위트)', 'GG', '위트'),
('ending_noun', '마무리(명사)', 'X의 결말', '강조'),
('ending_noun', '마무리(명사)', 'X의 최후', '강조'),
('ending_noun', '마무리(명사)', 'X 1승', '코미디'),
('ending_plain', '마무리(평범)', '라고 한다', '평범'),
('ending_plain', '마무리(평범)', '했다는 후문', '평범'),
('ending_none', '마무리(무)', '', '자연');
