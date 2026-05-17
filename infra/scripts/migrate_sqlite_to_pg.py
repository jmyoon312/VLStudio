import os
import sqlite3
import json
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import sys

# Add apps/api to path to import models
sys.path.append(os.path.join(os.getcwd(), 'apps', 'api'))

from app.models import (
    Base, Profile, TinCanAccount, CaptainAccount, BrandChannel,
    Channel, Video, WorkQueueItem, Settings, Category, ScriptStyle,
    ConfigPreset, WorkflowTemplate, Workflow
)

# Configuration
SQLITE_DB_PATH = './apps/api/legacy/viral_loop_back.db'
POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://viraloop:viraloop@localhost:5432/viraloop")

def migrate():
    print(f"🚀 Starting Migration: {SQLITE_DB_PATH} -> PostgreSQL")
    
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"❌ Error: SQLite file not found at {SQLITE_DB_PATH}")
        return

    # 1. Connect to both databases
    sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    
    pg_engine = create_engine(POSTGRES_URL)
    Session = sessionmaker(bind=pg_engine)
    session = Session()

    # 2. Ensure tables exist in PG
    # Base.metadata.create_all(pg_engine) # Already managed by app startup usually

    def migrate_table(model_class, sqlite_table_name):
        print(f"📦 Migrating {sqlite_table_name}...")
        cursor = sqlite_conn.cursor()
        try:
            cursor.execute(f"SELECT * FROM {sqlite_table_name}")
            rows = cursor.fetchall()
            
            count = 0
            for row in rows:
                data = dict(row)
                
                # Dynamic mapping / cleaning
                cleaned_data = {}
                for column in model_class.__table__.columns:
                    col_name = column.name
                    if col_name in data:
                        val = data[col_name]
                        
                        # Handle JSON fields
                        if isinstance(column.type, (Base.metadata.naming_convention.get('JSON', type(None)),)):
                             if val and isinstance(val, str):
                                 try:
                                     val = json.loads(val)
                                 except:
                                     pass
                        
                        # Handle DateTime
                        if str(column.type) == 'DATETIME' and val:
                            if isinstance(val, str):
                                try:
                                    val = datetime.fromisoformat(val)
                                except:
                                    pass
                        
                        cleaned_data[col_name] = val
                
                # Deduplication check (mostly by ID or Email)
                id_val = cleaned_data.get('id') or cleaned_data.get('channel_id') or cleaned_data.get('email')
                if id_val:
                    # Generic check for existence
                    pk_attr = model_class.__table__.primary_key.columns.values()[0].name
                    exists = session.query(model_class).filter(getattr(model_class, pk_attr) == cleaned_data[pk_attr]).first()
                    if exists:
                        continue

                obj = model_class(**cleaned_data)
                session.add(obj)
                count += 1
                
                if count % 50 == 0:
                    session.commit()
            
            session.commit()
            print(f"✅ Migrated {count} records from {sqlite_table_name}")
        except Exception as e:
            print(f"⚠️ Warning: Could not migrate {sqlite_table_name}: {e}")
            session.rollback()

    # Define Migration Sequence (Dependencies first)
    tables_to_migrate = [
        (Settings, "settings"),
        (Category, "categories"),
        (Channel, "channels"),
        (Video, "videos"),
        (Profile, "profiles"),
        (TinCanAccount, "tin_can_accounts"),
        (CaptainAccount, "captain_accounts"),
        (BrandChannel, "brand_channels"),
        (WorkQueueItem, "work_queue_items"),
        (ScriptStyle, "script_styles"),
        (ConfigPreset, "config_presets"),
        (WorkflowTemplate, "workflow_templates"),
        (Workflow, "workflows"),
    ]

    for model, table in tables_to_migrate:
        migrate_table(model, table)

    print("🏁 Migration Completed Successfully!")
    sqlite_conn.close()
    session.close()

if __name__ == "__main__":
    migrate()
