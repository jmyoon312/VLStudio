-- ===== 발굴 작업 (Discovery Job) =====
CREATE TABLE IF NOT EXISTS discovery_jobs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    reference_channel TEXT,
    keywords TEXT,
    platforms TEXT NOT NULL,
    min_views INTEGER DEFAULT 5000000,
    max_duration INTEGER DEFAULT 55,
    excluded_keywords TEXT,
    excluded_channels TEXT,
    status TEXT DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    progress_message TEXT,
    notion_page_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    started_at TEXT,
    completed_at TEXT,
    error TEXT
);

-- ===== 후보 영상 (Candidate Videos) =====
CREATE TABLE IF NOT EXISTS candidate_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    video_id TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    caption TEXT,
    channel_name TEXT,
    channel_id TEXT,
    view_count INTEGER,
    like_count INTEGER,
    duration INTEGER,
    published_at TEXT,
    transcript TEXT,
    thumbnail_url TEXT,
    dna_match_score REAL,
    dna_categories TEXT,
    is_duplicate_of TEXT,
    classification TEXT DEFAULT 'pending',
    notes TEXT,
    notion_page_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, platform, video_id),
    FOREIGN KEY (job_id) REFERENCES discovery_jobs(id)
);

-- ===== 레퍼런스 채널 사용 영상 (블랙리스트) =====
CREATE TABLE IF NOT EXISTS reference_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    channel_name TEXT,
    platform TEXT NOT NULL,
    video_id TEXT NOT NULL,
    title TEXT,
    original_video_url TEXT,
    original_video_id TEXT,
    dna_summary TEXT,
    cached_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, video_id)
);

-- ===== 한국 재업 채널 풀 =====
CREATE TABLE IF NOT EXISTS korean_repost_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL UNIQUE,
    channel_name TEXT,
    category TEXT,
    subscriber_count INTEGER,
    last_video_at TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ===== 한국 채널의 영상 (중복도 체크용) =====
CREATE TABLE IF NOT EXISTS korean_channel_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    video_id TEXT NOT NULL UNIQUE,
    title TEXT,
    original_video_id TEXT,
    original_url TEXT,
    transcript TEXT,
    thumbnail_url TEXT,
    cached_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ===== 임베딩 캐시 (Qdrant 외 메타) =====
CREATE TABLE IF NOT EXISTS embeddings_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    text_hash TEXT,
    qdrant_point_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_type, source_id)
);

-- ===== 인덱스 =====
CREATE INDEX IF NOT EXISTS idx_candidates_job ON candidate_videos(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_platform ON candidate_videos(platform);
CREATE INDEX IF NOT EXISTS idx_candidates_views ON candidate_videos(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_score ON candidate_videos(dna_match_score DESC);
CREATE INDEX IF NOT EXISTS idx_reference_channel ON reference_videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_korean_channel ON korean_channel_videos(channel_id);
