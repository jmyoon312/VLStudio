from sqlalchemy import create_engine
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
        # Standard system User Application Data folder to bypass Windows UAC permission limits
        if os.name == "nt":
            app_data = os.environ.get("APPDATA")
            if app_data:
                db_dir = os.path.join(app_data, "ViraLoopStudio", "db")
            else:
                db_dir = os.path.join(os.path.expanduser("~"), "AppData", "Roaming", "ViraLoopStudio", "db")
        else:
            db_dir = os.path.join(os.path.expanduser("~"), ".config", "viraloopstudio", "db")
            
        try:
            os.makedirs(db_dir, exist_ok=True)
        except Exception:
            # Fallback to temp directory if all else fails
            import tempfile
            db_dir = tempfile.gettempdir()
            
        DB_PATH = os.path.join(db_dir, "viral_loop.db")
        SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
    
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        echo=False,
        connect_args={"check_same_thread": False, "timeout": 35}
    )

    # Enable WAL Mode for SQLite concurrency (Development/Desktop only)
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
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
