-- schema_v7: 자막 자동 생성 (auto-subtitle) 테이블
-- 외부 영상 업로드 → Gemini 5중 검증 → srt 3개 + 제목 후보 자동 생성

CREATE TABLE IF NOT EXISTS subtitle_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_filename TEXT,
    video_path TEXT,
    duration_sec REAL,
    original_urls TEXT,                          -- JSON list (선택, 댓글 분석용)
    status TEXT DEFAULT 'pending',               -- pending / uploading / analyzing / generating / completed / needs_review / failed
    progress INTEGER DEFAULT 0,
    progress_message TEXT,
    subtitle_paths TEXT,                          -- JSON {situation, jjap_jjap_i, dialogue} → srt 파일 경로들
    title_candidates TEXT,                        -- JSON list (제목 후보 8개)
    gemini_results TEXT,                          -- JSON {primary, simple, pro, frame, comments} 5중 분석 결과
    cross_validation TEXT,                        -- JSON {consistent: bool, conflicts: [...], confidence: 0~1}
    needs_review INTEGER DEFAULT 0,               -- 1이면 사람 검수 필요
    review_note TEXT,                             -- 대표님이 입력한 정정 메모
    user_id INTEGER,                              -- 누가 만든 거 (users 테이블 fk)
    cost_usd REAL DEFAULT 0,
    error TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_subtitle_jobs_status ON subtitle_jobs(status);
CREATE INDEX IF NOT EXISTS idx_subtitle_jobs_user ON subtitle_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_subtitle_jobs_created ON subtitle_jobs(created_at DESC);
