-- v3: 시각 매칭 (visual matching) 추가 테이블/컬럼
-- candidate_videos 컬럼 추가는 database.py의 _ensure_visual_match_columns()에서 처리
-- (ALTER TABLE은 idempotent하지 않아서 Python 측에서 컬럼 존재 체크 후 추가)

-- 한국 풀에 인덱싱된 영상 (Qdrant와 1:1 매칭, 메타 조회용)
CREATE TABLE IF NOT EXISTS korean_pool_indexed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dissection_id TEXT,
    channel_id TEXT NOT NULL,
    channel_handle TEXT,
    channel_name TEXT,
    video_id TEXT NOT NULL,
    video_url TEXT,
    title TEXT,
    frames_count INTEGER DEFAULT 0,
    indexed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(channel_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_kpi_dissection ON korean_pool_indexed(dissection_id);
CREATE INDEX IF NOT EXISTS idx_kpi_channel ON korean_pool_indexed(channel_id);
CREATE INDEX IF NOT EXISTS idx_kpi_video ON korean_pool_indexed(video_id);

-- 한국 채널 결 분류 결과 (어떤 dissection에서 어떤 채널이 reference인지)
CREATE TABLE IF NOT EXISTS korean_pool_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dissection_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    channel_name TEXT,
    is_reference INTEGER DEFAULT 0,
    matching_count INTEGER,
    total_sampled INTEGER,
    matching_ratio REAL,
    classified_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dissection_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_kpc_dissection ON korean_pool_channels(dissection_id);
CREATE INDEX IF NOT EXISTS idx_kpc_reference ON korean_pool_channels(is_reference);
