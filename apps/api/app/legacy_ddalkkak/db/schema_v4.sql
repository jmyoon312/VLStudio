-- v4: 사용자 인증 + 프리랜서 시스템
-- (admin = 형님, freelancer = 프리랜서)

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'freelancer',  -- 'admin' or 'freelancer'
    full_name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 프리랜서에게 어떤 발굴 작업(=카테고리)을 배정했는지
CREATE TABLE IF NOT EXISTS job_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER,           -- admin user id
    UNIQUE(job_id, user_id),
    FOREIGN KEY (job_id) REFERENCES discovery_jobs(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_job_assignments_job ON job_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_user ON job_assignments(user_id);
