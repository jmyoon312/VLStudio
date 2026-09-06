import sqlite3
import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger("hermes_session_store")

class HermesSessionStore:
    """
    Hermes Core SQLite FTS5 + WAL High-Performance Search & Context Store.
    Isolated in data/studio_brain/hermes_state.db to prevent lock contention with main DB.
    """
    def __init__(self, base_dir: Optional[str] = None):
        if not base_dir:
            project_root = Path(__file__).resolve().parent.parent.parent.parent
            self.db_dir = project_root / "data" / "studio_brain"
        else:
            self.db_dir = Path(base_dir)

        self.db_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.db_dir / "hermes_state.db"
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=20.0)
        conn.row_factory = sqlite3.Row
        # Enable WAL mode for high concurrency
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        return conn

    def _init_db(self):
        try:
            with self._get_connection() as conn:
                # Check if channel_id column exists; if not, recreate FTS table
                needs_recreate = False
                try:
                    conn.execute("SELECT channel_id FROM hermes_fts LIMIT 1;")
                except Exception:
                    needs_recreate = True

                if needs_recreate:
                    conn.execute("DROP TABLE IF EXISTS hermes_fts;")
                    conn.execute("""
                        CREATE VIRTUAL TABLE hermes_fts USING fts5(
                            doc_id UNINDEXED,
                            channel_id,
                            category,
                            title,
                            content,
                            tags,
                            created_at UNINDEXED,
                            tokenize = 'unicode61'
                        );
                    """)
                    logger.info("Hermes FTS5 Virtual Table recreated with channel_id.")
                else:
                    conn.execute("""
                        CREATE VIRTUAL TABLE IF NOT EXISTS hermes_fts USING fts5(
                            doc_id UNINDEXED,
                            channel_id,
                            category,
                            title,
                            content,
                            tags,
                            created_at UNINDEXED,
                            tokenize = 'unicode61'
                        );
                    """)

                # Standard Metadata Table for structured tracking
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS hermes_subagent_tasks (
                        task_id TEXT PRIMARY KEY,
                        channel_id TEXT,
                        worker_role TEXT,
                        status TEXT,
                        input_payload TEXT,
                        result_payload TEXT,
                        created_at TEXT,
                        completed_at TEXT
                    );
                """)
                conn.commit()
                logger.info("Hermes FTS5 + WAL Session Engine initialized successfully with Channel Awareness.")
        except Exception as e:
            logger.error(f"Hermes FTS5 Init Error: {e}")

    def index_item(self, doc_id: str, category: str, title: str, content: str, tags: str = "", channel_id: str = "global"):
        try:
            with self._get_connection() as conn:
                conn.execute("DELETE FROM hermes_fts WHERE doc_id = ?", (doc_id,))
                conn.execute("""
                    INSERT INTO hermes_fts (doc_id, channel_id, category, title, content, tags, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (doc_id, str(channel_id), category, title, content, tags, datetime.now().isoformat()))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to index item into Hermes FTS: {e}")

    def search_fts(self, query: str, limit: int = 25) -> List[Dict[str, Any]]:
        """
        Execute full-text search with snippet and BM25 ranking.
        """
        results = []
        clean_q = query.strip().replace("'", "").replace('"', "")
        if not clean_q:
            return results

        try:
            with self._get_connection() as conn:
                cur = conn.execute("""
                    SELECT doc_id, category, title, content, tags, created_at,
                           snippet(hermes_fts, 3, '<mark>', '</mark>', '...', 20) as snippet_text,
                           bm25(hermes_fts) as rank
                    FROM hermes_fts
                    WHERE hermes_fts MATCH ?
                    ORDER BY rank
                    LIMIT ?
                """, (f'"{clean_q}"*', limit))
                
                for row in cur.fetchall():
                    results.append({
                        "doc_id": row["doc_id"],
                        "category": row["category"],
                        "title": row["title"],
                        "content": row["content"],
                        "tags": row["tags"],
                        "snippet": row["snippet_text"] or row["content"][:150],
                        "created_at": row["created_at"],
                        "score": round(float(row["rank"]), 2)
                    })
        except Exception as e:
            logger.warning(f"Hermes FTS5 search error: {e}")
            try:
                with self._get_connection() as conn:
                    cur = conn.execute("""
                        SELECT doc_id, category, title, content, tags, created_at
                        FROM hermes_fts
                        WHERE content LIKE ? OR title LIKE ?
                        LIMIT ?
                    """, (f"%{clean_q}%", f"%{clean_q}%", limit))
                    for row in cur.fetchall():
                        results.append({
                            "doc_id": row["doc_id"],
                            "category": row["category"],
                            "title": row["title"],
                            "content": row["content"],
                            "tags": row["tags"],
                            "snippet": row["content"][:150],
                            "created_at": row["created_at"],
                            "score": 1.0
                        })
            except Exception:
                pass

        return results

    def search_channel_memory(self, channel_id: str, query: str = "", limit: int = 15) -> List[Dict[str, Any]]:
        """
        Recall past winning scripts, jjap-patterns, and lessons for a specific channel in 0.01 seconds.
        """
        results = []
        clean_q = query.strip().replace("'", "").replace('"', "")
        ch_str = str(channel_id)

        try:
            with self._get_connection() as conn:
                if clean_q:
                    cur = conn.execute("""
                        SELECT doc_id, channel_id, category, title, content, tags, created_at,
                               snippet(hermes_fts, 4, '<mark>', '</mark>', '...', 20) as snippet_text,
                               bm25(hermes_fts) as rank
                        FROM hermes_fts
                        WHERE channel_id = ? AND hermes_fts MATCH ?
                        ORDER BY rank
                        LIMIT ?
                    """, (ch_str, f'"{clean_q}"*', limit))
                else:
                    cur = conn.execute("""
                        SELECT doc_id, channel_id, category, title, content, tags, created_at,
                               content as snippet_text, 1.0 as rank
                        FROM hermes_fts
                        WHERE channel_id = ?
                        ORDER BY rowid DESC
                        LIMIT ?
                    """, (ch_str, limit))

                for row in cur.fetchall():
                    results.append({
                        "doc_id": row["doc_id"],
                        "channel_id": row["channel_id"],
                        "category": row["category"],
                        "title": row["title"],
                        "content": row["content"],
                        "tags": row["tags"],
                        "snippet": row["snippet_text"] or row["content"][:150],
                        "created_at": row["created_at"],
                        "score": round(float(row["rank"]), 2)
                    })
        except Exception as e:
            logger.warning(f"search_channel_memory error: {e}")
        return results

    def record_channel_wisdom(self, channel_id: str, topic: str, winning_hook: str, jjap_pattern: str, score: float):
        """
        Autonomously imprints winning patterns (score >= 85) into channel memory.
        """
        doc_id = f"ch_{channel_id}_wisdom_{int(datetime.now().timestamp())}"
        title = f"[{score:.1f}점 떡상 공식] {topic}"
        content = (
            f"### 주제: {topic} (검수 통과 점수: {score:.1f}점)\n\n"
            f"- **적중 후킹(Hook)**: {winning_hook}\n"
            f"- **쨉쨉이 연출 패턴**: {jjap_pattern}\n"
            f"- **기록 시각**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        )
        tags = f"떡상공식,후킹,쨉쨉이,채널_{channel_id}"
        self.index_item(doc_id, "Winning Pattern (떡상 공식)", title, content, tags, channel_id=str(channel_id))
        logger.info(f"✨ [Hermes Wisdom] Imprinted winning pattern for Channel {channel_id}: {topic} ({score:.1f}pts)")

    def sync_memory_store(self, soul_content: str, memory_content: str, skills: List[Dict[str, str]]):
        """
        Populate or refresh the FTS5 index from Soul, Memory, and Skills.
        """
        if soul_content:
            self.index_item("soul_identity", "Soul (디렉팅 헌법)", "스튜디오 디렉팅 철학 및 제작 원칙", soul_content, "헌법,규칙,아이덴티티")
        
        if memory_content:
            lines = [line.strip() for line in memory_content.split("\n") if line.strip().startswith("-")]
            for idx, line in enumerate(lines):
                item_text = line.lstrip("-").strip()
                self.index_item(f"memory_{idx}", "Memory (학습 노하우)", f"제작 피드백 & 떡상 공식 #{idx+1}", item_text, "노하우,피드백,공식")

        for skill in skills:
            s_name = skill.get("name", "skill")
            s_content = skill.get("content", "")
            self.index_item(f"skill_{s_name}", "Skill Playbook (스킬)", f"{s_name} 플레이북", s_content, "스킬,프롬프트,플레이북")

hermes_session_store = HermesSessionStore()
