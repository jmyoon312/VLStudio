-- v5: 발굴 결과 1시간 cache (결정성 보장 + quota 절약)
-- 같은 키워드 재호출 시 cache hit → quota 안 씀 + 결과 결정적

CREATE TABLE IF NOT EXISTS search_cache (
    cache_key TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    query TEXT NOT NULL,
    results TEXT NOT NULL,        -- JSON array of normalized candidate dicts
    n_results INTEGER NOT NULL,
    cached_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_search_cache_expires ON search_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_search_cache_source ON search_cache(source);
