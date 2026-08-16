-- ============================================================================
-- schema_v9.sql — 일본어 멀티유즈 (2026-05-17)
-- 한국어 자막 박힌 영상 → 일본어 생활어 번역 (제목/상황/쨉쨉이)
-- ============================================================================

CREATE TABLE IF NOT EXISTS japanese_multiuse_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_filename TEXT,
    video_path TEXT,
    duration_sec REAL,
    status TEXT DEFAULT 'pending',               -- pending / uploading / analyzing / generating / completed / failed
    progress INTEGER DEFAULT 0,
    progress_message TEXT,

    -- 결과
    japanese_title TEXT,                          -- 일본어 제목
    title_candidates_jp TEXT,                     -- JSON list 일본어 제목 후보 (5~8개)
    korean_subtitles_extracted TEXT,              -- JSON — 영상에서 추출한 한국어 자막 (참고용)
    japanese_situation_srt_path TEXT,             -- 상황 자막 srt 경로 (일본어)
    japanese_jjap_jjap_i_srt_path TEXT,           -- 쨉쨉이 srt 경로 (일본어)
    japanese_dialogue_srt_path TEXT,              -- 대사 srt 경로 (일본어, 있으면)

    gemini_result TEXT,                           -- Gemini 응답 JSON 전체
    user_id INTEGER,
    cost_usd REAL DEFAULT 0,
    error TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_jmu_status ON japanese_multiuse_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jmu_user ON japanese_multiuse_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jmu_created ON japanese_multiuse_jobs(created_at DESC);
