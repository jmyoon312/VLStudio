"""
Telegram Infinite Cloud Vault Service for ViraLoop Studio.
Stores, retrieves, and on-the-fly streams massive video assets (up to 2GB per file, infinite storage, 0$ egress)
using Telegram MTProto Bot API. Completely isolated from Google accounts to eliminate association risk.
"""

import os
import sys
import json
import sqlite3
import asyncio
import logging
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import urllib.request
import urllib.parse

logger = logging.getLogger("telegram_cloud_vault")

LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
MEDIA_ROOT = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media"

def _resolve_db_path() -> Path:
    p1 = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "viral_loop.db"
    if p1.exists():
        return p1
    p2 = MEDIA_ROOT / "06_Database" / "viral_loop.db"
    return p2

DB_PATH = _resolve_db_path()


class TelegramCloudVault:
    """
    Manages infinite cloud video storage via Telegram Bot API with zero egress fees.
    """

    def __init__(self):
        self._ensure_table_exists()

    def _get_db_connection(self) -> sqlite3.Connection:
        active_db = _resolve_db_path()
        active_db.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(active_db))
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_table_exists(self):
        """Ensure telegram_vault_files table exists in the unified single viral_loop.db."""
        try:
            with self._get_db_connection() as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS telegram_vault_files (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        file_id TEXT UNIQUE NOT NULL,
                        file_name TEXT NOT NULL,
                        file_size_mb REAL NOT NULL,
                        duration_sec REAL DEFAULT 0,
                        mime_type TEXT DEFAULT 'video/mp4',
                        thumbnail_url TEXT,
                        category TEXT DEFAULT 'movie',
                        created_at TEXT NOT NULL
                    )
                """)
                conn.commit()
        except Exception as e:
            logger.warning(f"⚠️ [TelegramVault] Schema initialization note: {e}")

    def get_credentials(self) -> Tuple[Optional[str], Optional[str]]:
        """Retrieve Telegram bot token and dedicated vault channel ID from DB Settings."""
        try:
            with self._get_db_connection() as conn:
                row = conn.execute(
                    "SELECT telegram_vault_bot_token, telegram_vault_chat_id, telegram_bot_token, telegram_chat_id FROM settings LIMIT 1"
                ).fetchone()
                if row:
                    token = row["telegram_vault_bot_token"] or row["telegram_bot_token"]
                    chat_id = row["telegram_vault_chat_id"] or row["telegram_chat_id"]
                    if token and chat_id:
                        return token, chat_id
        except Exception as e:
            logger.debug(f"[TelegramVault] get_credentials note: {e}")

        # Environment variable fallback
        token = os.environ.get("TELEGRAM_VAULT_BOT_TOKEN") or os.environ.get("TELEGRAM_BOT_TOKEN")
        chat_id = os.environ.get("TELEGRAM_VAULT_CHAT_ID") or os.environ.get("TELEGRAM_CHAT_ID")
        return token, chat_id

    async def list_vault_files(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all video assets registered in the cloud vault."""
        self._ensure_table_exists()
        try:
            with self._get_db_connection() as conn:
                if category:
                    rows = conn.execute(
                        "SELECT * FROM telegram_vault_files WHERE category = ? ORDER BY id DESC",
                        (category,)
                    ).fetchall()
                else:
                    rows = conn.execute("SELECT * FROM telegram_vault_files ORDER BY id DESC").fetchall()
                
                results = []
                for r in rows:
                    results.append({
                        "id": r["id"],
                        "file_id": r["file_id"],
                        "file_name": r["file_name"],
                        "file_size_mb": r["file_size_mb"],
                        "duration_sec": r["duration_sec"],
                        "mime_type": r["mime_type"],
                        "thumbnail_url": r["thumbnail_url"],
                        "category": r["category"],
                        "created_at": r["created_at"],
                        "stream_url": f"/api/cloud-vault/stream/{r['file_id']}"
                    })
                return results
        except Exception as e:
            logger.error(f"❌ [TelegramVault] List error: {e}")
            return []

    async def register_vault_file(
        self,
        file_id: str,
        file_name: str,
        file_size_mb: float,
        duration_sec: float = 0.0,
        category: str = "movie"
    ) -> Dict[str, Any]:
        """Record an uploaded video asset into the vault table."""
        self._ensure_table_exists()
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with self._get_db_connection() as conn:
            conn.execute("""
                INSERT INTO telegram_vault_files (
                    file_id, file_name, file_size_mb, duration_sec, category, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(file_id) DO UPDATE SET
                    file_name = excluded.file_name,
                    file_size_mb = excluded.file_size_mb,
                    duration_sec = excluded.duration_sec
            """, (file_id, file_name, file_size_mb, duration_sec, category, now_str))
            conn.commit()

        logger.info(f"💾 [TelegramVault] Registered video into vault: {file_name} ({file_size_mb}MB)")
        return {
            "success": True,
            "file_id": file_id,
            "file_name": file_name,
            "file_size_mb": file_size_mb,
            "stream_url": f"/api/cloud-vault/stream/{file_id}"
        }

    async def get_direct_download_url(self, file_id: str) -> Optional[str]:
        """Resolve Telegram file_id to direct CDN streaming URL via getFile API."""
        bot_token, _ = self.get_credentials()
        if not bot_token:
            logger.warning("⚠️ [TelegramVault] Bot token is missing in settings")
            return None

        api_url = f"https://api.telegram.org/bot{bot_token}/getFile?file_id={file_id}"
        
        loop = asyncio.get_event_loop()
        def _fetch():
            req = urllib.request.Request(api_url, headers={"User-Agent": "ViraLoopStudio/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                if data.get("ok"):
                    file_path = data["result"]["file_path"]
                    return f"https://api.telegram.org/file/bot{bot_token}/{file_path}"
                return None

        try:
            return await loop.run_in_executor(None, _fetch)
        except Exception as e:
            logger.error(f"❌ [TelegramVault] Failed to get file stream URL: {e}")
            return None

    async def slice_vault_file(
        self,
        file_id: str,
        start_seconds: float,
        duration_seconds: float
    ) -> Dict[str, Any]:
        """
        On-The-Fly slice a clip directly from Telegram video vault without downloading the full movie!
        """
        direct_url = await self.get_direct_download_url(file_id)
        if not direct_url:
            raise RuntimeError(f"클라우드 볼트에서 파일 스트림을 열지 못했습니다: {file_id}")

        from app.services.zero_download_slicer import zero_download_slicer
        return await zero_download_slicer.slice_stream(
            source_url=direct_url,
            start_seconds=start_seconds,
            duration_seconds=duration_seconds,
            output_filename=f"vault_slice_{file_id[:8]}_{int(start_seconds)}s.mp4"
        )


telegram_cloud_vault = TelegramCloudVault()
