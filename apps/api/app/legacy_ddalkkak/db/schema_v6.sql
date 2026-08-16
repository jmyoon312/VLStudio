-- v6: AI 변형 제작 — 카테고리별 마스코트 + remix 결과 추적
-- 1 dissection = 1 mascot (카테고리 단위로 일관 캐릭터)

CREATE TABLE IF NOT EXISTS mascots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dissection_id TEXT NOT NULL UNIQUE,
    name TEXT,
    concept TEXT,                          -- 형님이 입력한 컨셉 키워드 ("양봉 저승사자 코믹")
    style_prompt TEXT NOT NULL,            -- Flux base prompt (모든 동작 image에 prepend)
    reference_image_path TEXT,             -- 선택된 시안 (로컬 경로)
    reference_image_url TEXT,              -- 공개 URL (/static/mascots/...)
    seed INTEGER NOT NULL,                  -- Flux seed (캐릭터 일관성 — 같은 seed = 같은 얼굴)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT,
    FOREIGN KEY (dissection_id) REFERENCES dissection_analyses(id)
);

CREATE INDEX IF NOT EXISTS idx_mascots_dissection ON mascots(dissection_id);

-- AI 변형본 결과 추적
CREATE TABLE IF NOT EXISTS remixes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    mascot_id INTEGER,                     -- 사용한 마스코트
    status TEXT DEFAULT 'pending',         -- pending|analyzing|generating|composing|completed|failed
    progress INTEGER DEFAULT 0,
    progress_message TEXT,
    spec TEXT,                              -- LLM 분석 결과 JSON (clip_count, 각 clip pose+timestamp)
    output_path TEXT,                       -- 최종 mp4 로컬 경로
    output_url TEXT,                        -- 공개 URL
    cost_usd REAL DEFAULT 0,                -- 누적 비용
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    error TEXT,
    FOREIGN KEY (candidate_id) REFERENCES candidate_videos(id),
    FOREIGN KEY (mascot_id) REFERENCES mascots(id)
);

CREATE INDEX IF NOT EXISTS idx_remixes_candidate ON remixes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_remixes_status ON remixes(status);
