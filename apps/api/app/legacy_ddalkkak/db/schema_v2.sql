-- ===== v2 추가 테이블 =====

-- 채널 해체 분석 결과
CREATE TABLE IF NOT EXISTS dissection_analyses (
    id TEXT PRIMARY KEY,
    name TEXT,
    reference_channels TEXT,         -- JSON array of channel URLs/IDs
    status TEXT DEFAULT 'pending',   -- pending|analyzing|ready|searching|completed|failed
    progress INTEGER DEFAULT 0,
    progress_message TEXT,
    dissection_result TEXT,          -- JSON of 13-item analysis (per channel + common)
    keywords_result TEXT,            -- JSON of multi-language keywords
    related_job_id TEXT,             -- linked discovery_jobs.id (after start-search)
    notion_database_id TEXT,
    min_views INTEGER DEFAULT 5000000,
    max_duration INTEGER DEFAULT 55,
    excluded_keywords TEXT,
    excluded_channels TEXT,
    platforms TEXT,
    cost_usd REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    error TEXT
);

CREATE INDEX IF NOT EXISTS idx_dissection_status ON dissection_analyses(status);
CREATE INDEX IF NOT EXISTS idx_dissection_created ON dissection_analyses(created_at DESC);
