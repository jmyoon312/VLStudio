from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os

from app.config import settings

# Database Routing Logic
# Prioritize settings.DATABASE_URL which handles OS-specific defaults
DATABASE_URL = settings.DATABASE_URL

# LangGraph Checkpoint Configuration
# For state persistence across server restarts
LANGGRAPH_CHECKPOINT_URL = os.getenv("LANGGRAPH_CHECKPOINT_URL", DATABASE_URL)  # Use same DB by default

# Check if LangGraph is available
LANGGRAPH_AVAILABLE = False
try:
    import langgraph
    LANGGRAPH_AVAILABLE = True
except ImportError:
    pass

if DATABASE_URL and DATABASE_URL.startswith("postgresql"):
    # High-Scale Production Engine (Optimized for PgBouncer Transaction Mode)
    # Using NullPool as PgBouncer handles connection pooling externally
    # Disabling prepared statements (prepare_threshold=None) for transaction mode compatibility
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,
        pool_pre_ping=True,
        pool_recycle=1800,
        connect_args={"prepare_threshold": None},
        echo=False
    )

    # [Phase 4-2] Auto-initialize pgvector extension
    from sqlalchemy import event, text
    @event.listens_for(engine, "connect")
    def connect(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("CREATE EXTENSION IF NOT EXISTS vector")
        cursor.close()
else:
    # Development/Local SQLite Engine
    from app.config import settings
    
    # Respect DATABASE_URL if it is an explicit SQLite URL, otherwise compute a safe user-data path
    if DATABASE_URL and DATABASE_URL.startswith("sqlite"):
        SQLALCHEMY_DATABASE_URL = DATABASE_URL
    else:
        # Check if we are running from source code vs packaged electron app
        if os.path.exists(os.path.join(settings.MEDIA_ROOT, "apps", "api")):
            # Running from source, use local DB in project folder to avoid conflict with installed app
            db_dir = os.path.join(settings.MEDIA_ROOT, "data")
        else:
            # Standard system User Application Data folder to bypass Windows UAC permission limits
            if os.name == "nt":
                local_app_data = os.environ.get("LOCALAPPDATA")
                if local_app_data:
                    db_dir = os.path.join(local_app_data, "ViraLoop Studio")
                else:
                    app_data = os.environ.get("APPDATA")
                    if app_data:
                        db_dir = os.path.join(app_data, "ViraLoop Studio").replace("Roaming", "Local")
                    else:
                        db_dir = os.path.join(os.path.expanduser("~"), "AppData", "Local", "ViraLoop Studio")
            else:
                db_dir = os.path.join(os.path.expanduser("~"), ".config", "viraloopstudio")
            db_dir = db_dir
        try:
            os.makedirs(db_dir, exist_ok=True)
        except Exception:
            import tempfile
            db_dir = os.path.join(tempfile.gettempdir(), "ViraLoop Studio")
            os.makedirs(db_dir, exist_ok=True)
        DB_PATH = os.path.join(db_dir, "vl_database_dev.db" if os.path.exists(os.path.join(settings.MEDIA_ROOT, "apps", "api")) else "vl_database.db").replace("\\", "/")
        SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
    
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        echo=False,
        connect_args={"check_same_thread": False, "timeout": 35}
    )




    # Enable WAL Mode and high-performance memory caching for SQLite
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA busy_timeout=30000")
            cursor.execute("PRAGMA cache_size=-64000")
            cursor.execute("PRAGMA temp_store=MEMORY")
            try:
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_radar_cand_status_type_outlier ON radar_candidates(status, video_type, outlier_ratio DESC);")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_radar_cand_channel_type ON radar_candidates(channel_title, video_type);")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_radar_cand_category_type ON radar_candidates(category_id, video_type);")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_radar_cand_published ON radar_candidates(published_at DESC);")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_radar_cand_created ON radar_candidates(created_at DESC);")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_channels_category ON channels(category_id);")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_videos_channel_id ON videos(channel_id);")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_videos_upload_date ON videos(upload_date DESC);")
                # [Optimization] WorkQueue high-throughput query indexes
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_wq_status_sched ON work_queue_items(status, scheduled_upload_time);")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_wq_status_approval ON work_queue_items(status, approval_status);")
                cursor.execute("CREATE INDEX IF NOT EXISTS ix_wq_channel_status ON work_queue_items(channel_id, status);")
                # Auto-migrate render_engine column for work_queue_items
                try:
                    cursor.execute("ALTER TABLE work_queue_items ADD COLUMN render_engine VARCHAR DEFAULT 'REMOTION';")
                except Exception:
                    pass
            except Exception:
                pass
            cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# LangGraph Checkpoint Functions
def get_checkpoint_saver():
    """
    Get LangGraph checkpoint saver for state persistence
    
    Usage:
        workflow = workflow.compile(checkpointer=get_checkpoint_saver())
    
    Returns:
        PostgresSaver if LangGraph is installed and PostgreSQL is available
        None otherwise (will use in-memory state)
    """
    if not LANGGRAPH_AVAILABLE:
        logger.warning("LangGraph not installed. State persistence disabled.")
        return None
    
    if not LANGGRAPH_CHECKPOINT_URL or not LANGGRAPH_CHECKPOINT_URL.startswith("postgresql"):
        logger.warning("PostgreSQL not available for checkpoint. Using in-memory state.")
        return None
    
    try:
        from langgraph.checkpoint.postgres import PostgresSaver
        import psycopg2
        
        # Create connection for checkpoint
        conn = psycopg2.connect(
            LANGGRAPH_CHECKPOINT_URL.replace("postgresql+psycopg2", "postgresql")
        )
        
        saver = PostgresSaver(conn)
        
        # Create tables if needed
        # Note: PostgresSaver handles this automatically on first use
        
        logger.info("LangGraph checkpoint saver initialized with PostgreSQL")
        return saver
        
    except Exception as e:
        logger.error(f"Failed to initialize checkpoint saver: {e}")
        return None


def create_checkpoint_table():
    """
    Manually create checkpoint table if needed
    
    LangGraph creates this automatically on first run,
    but this can be called for explicit setup.
    """
    if not LANGGRAPH_AVAILABLE or not LANGGRAPH_CHECKPOINT_URL:
        return False
    
    try:
        from langgraph.checkpoint.postgres import PostgresSaver
        import psycopg2
        
        conn = psycopg2.connect(
            LANGGRAPH_CHECKPOINT_URL.replace("postgresql+psycopg2", "postgresql")
        )
        
        # Create tables manually
        # This is normally handled by LangGraph
        # Just verify connection for now
        
        conn.close()
        logger.info("Checkpoint table verified")
        return True
        
    except Exception as e:
        logger.error(f"Failed to create checkpoint table: {e}")
        return False


def migrate_source_external_id():
    """work_queue_items에 source_external_id 컬럼 및 신규 거버넌스 컬럼 추가"""
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        
        with engine.begin() as conn:
            # 1. work_queue_items.source_external_id
            columns = [c["name"] for c in inspector.get_columns("work_queue_items")]
            if "source_external_id" not in columns:
                conn.execute(text("ALTER TABLE work_queue_items ADD COLUMN source_external_id VARCHAR"))
                print("[Migration] Added source_external_id column to work_queue_items")

            # 2. profiles.name
            profile_cols = [c["name"] for c in inspector.get_columns("profiles")]
            if "name" not in profile_cols:
                conn.execute(text("ALTER TABLE profiles ADD COLUMN name VARCHAR"))
                print("[Migration] Added name column to profiles")

            # 3. videos.transcript
            video_cols = [c["name"] for c in inspector.get_columns("videos")]
            if "transcript" not in video_cols:
                conn.execute(text("ALTER TABLE videos ADD COLUMN transcript TEXT"))
                print("[Migration] Added transcript column to videos")

            # 4. videos.review_status
            if "review_status" not in video_cols:
                conn.execute(text("ALTER TABLE videos ADD COLUMN review_status VARCHAR DEFAULT 'COLLECTED'"))
                print("[Migration] Added review_status column to videos")

            # 5. brand_channels cultivation & warmup columns
            try:
                bc_cols = [c["name"] for c in inspector.get_columns("brand_channels")]
                bc_additions = [
                    ("warmup_last_error", "TEXT"),
                    ("warmup_started_at", "DATETIME"),
                    ("warmup_completed_at", "DATETIME"),
                    ("warmup_total_duration", "INTEGER DEFAULT 0"),
                    ("warmup_error_count", "INTEGER DEFAULT 0"),
                    ("status", "VARCHAR(20) DEFAULT 'ACTIVE'"),
                    ("auth_status", "VARCHAR(20) DEFAULT 'PENDING'"),
                    ("quarantine_reason", "TEXT"),
                    ("quarantine_until", "DATETIME"),
                    ("dedicated_profile_path", "VARCHAR(500)"),
                    ("last_used_ip", "VARCHAR(50)"),
                    ("last_accessed_at", "DATETIME"),
                    ("cultivation_strategy", "VARCHAR(50)"),
                    ("cultivation_day", "INTEGER DEFAULT 0"),
                    ("cultivation_active", "BOOLEAN DEFAULT 0"),
                    ("warmup_config", "TEXT"),
                ]
                for col_name, col_def in bc_additions:
                    if col_name not in bc_cols:
                        conn.execute(text(f"ALTER TABLE brand_channels ADD COLUMN {col_name} {col_def}"))
                        print(f"[Migration] Added {col_name} column to brand_channels")
            except Exception as bc_err:
                print(f"[Migration] brand_channels migration skipped: {bc_err}")

            # 6. youtube_channels.auto_approve_default
            try:
                yt_cols = [c["name"] for c in inspector.get_columns("youtube_channels")]
                if "auto_approve_default" not in yt_cols:
                    conn.execute(text("ALTER TABLE youtube_channels ADD COLUMN auto_approve_default BOOLEAN DEFAULT 0"))
                    print("[Migration] Added auto_approve_default column to youtube_channels")
            except Exception as yt_err:
                print(f"[Migration] youtube_channels auto_approve_default skipped: {yt_err}")

            # 7. settings work_queue columns & Hermes Core v0.21.3 columns
            try:
                settings_cols = [c["name"] for c in inspector.get_columns("settings")]
                if "work_queue_headless_mode" not in settings_cols:
                    conn.execute(text("ALTER TABLE settings ADD COLUMN work_queue_headless_mode BOOLEAN DEFAULT 1"))
                    print("[Migration] Added work_queue_headless_mode column to settings")
                if "work_queue_governance_mode" not in settings_cols:
                    conn.execute(text("ALTER TABLE settings ADD COLUMN work_queue_governance_mode VARCHAR(20) DEFAULT 'SMART'"))
                    print("[Migration] Added work_queue_governance_mode column to settings")
                
                # Hermes Core v0.21.3 Upgrades
                hermes_new_cols = [
                    ("hermes_cron_continuity_enabled", "BOOLEAN DEFAULT 1"),
                    ("hermes_monitor_mode_enabled", "BOOLEAN DEFAULT 1"),
                    ("hermes_subagent_steering_enabled", "BOOLEAN DEFAULT 1"),
                    ("hermes_structured_schema_enforced", "BOOLEAN DEFAULT 1"),
                    ("hermes_instruction_protection_enabled", "BOOLEAN DEFAULT 1"),
                    ("hermes_har_api_mode", "VARCHAR(20) DEFAULT 'auto'"),
                    ("hermes_fts_wal_pool_size", "INTEGER DEFAULT 5")
                ]
                for col_name, col_def in hermes_new_cols:
                    if col_name not in settings_cols:
                        conn.execute(text(f"ALTER TABLE settings ADD COLUMN {col_name} {col_def}"))
                        print(f"[Migration] Added {col_name} column to settings")
            except Exception as st_err:
                print(f"[Migration] settings work_queue / hermes migration skipped: {st_err}")

        return True
    except Exception as e:
        print(f"[Migration] migration skipped: {e}")
        return False
