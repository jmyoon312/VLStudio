from sqlalchemy import inspect, text
from .database import engine, Base
from . import models  # Import models to populate Base.metadata
import logging

logger = logging.getLogger("migration")

def repair_schema():
    """
    Automatically detects and adds missing columns from models.py to the database.
    This ensures that newly added fields in SQLAlchemy models are automatically created in the database.
    Supports both SQLite and PostgreSQL.
    """
    inspector = inspect(engine)
    added_count = 0
    
    # All tables defined in SQLAlchemy Base
    for table_name, table in Base.metadata.tables.items():
        if not inspector.has_table(table_name):
            continue
            
        try:
            existing_columns = [c["name"] for c in inspector.get_columns(table_name)]
        except Exception as e:
            logger.debug(f"[DB] Could not inspect columns for {table_name}: {e}")
            continue
        
        for column in table.columns:
            if column.name not in existing_columns:
                logger.info(f"[DB Schema] Adding missing column: {table_name}.{column.name}")
                
                try:
                    col_type = str(column.type.compile(engine.dialect))
                except:
                    col_type = "TEXT"
                    
                default_clause = ""
                if column.default is not None and hasattr(column.default, 'arg'):
                    val = column.default.arg
                    if isinstance(val, (str, bytes)):
                        default_clause = f" DEFAULT '{val}'"
                    elif isinstance(val, bool):
                        default_clause = f" DEFAULT {'TRUE' if val else 'FALSE'}"
                    elif isinstance(val, (int, float)):
                        default_clause = f" DEFAULT {val}"
                
                try:
                    with engine.begin() as conn:
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column.name} {col_type}{default_clause}"))
                    added_count += 1
                except Exception as e:
                    logger.warning(f"[DB Schema] Failed to add {column.name} to {table_name}: {e}")

    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.debug(f"[DB] Base.metadata.create_all: {e}")
        
    if added_count > 0:
        logger.info(f"[DB Schema] Automatically synchronized {added_count} new column(s).")

if __name__ == "__main__":
    repair_schema()
