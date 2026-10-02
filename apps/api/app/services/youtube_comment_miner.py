"""
[YouTube Comment Miner]
Extracts top-rated community comments and clusters them into 3 Plus-Alpha insights:
1. Debunk & Fact-Check (반론 및 팩트체크)
2. Lore & Aftermath (비하인드 및 후일담)
3. Crowd Curiosity (시청자 집단 의문점)

Strictly bound to 09_System yt-dlp binary SSOT.
Zero CP949 encoding error law enforced.
"""

import os
import sys
import json
import logging
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# Strict Windows UTF-8 enforcement
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

logger = logging.getLogger("youtube_comment_miner")

LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
DEFAULT_YTDLP_PATHS = [
    Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "09_System" / "bin" / "yt-dlp" / "yt-dlp.exe",
    Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "09_System" / "bin" / "yt-dlp.exe",
    Path("yt-dlp"),
]


class CommentInsight(BaseModel):
    author: str = ""
    text: str
    like_count: int = 0
    is_pinned: bool = False
    category: str = "curiosity"  # "debunk" | "lore" | "curiosity" | "humor"
    script_hook_potential: str = ""
    confidence_score: float = 0.85


class CommentMiningResult(BaseModel):
    success: bool
    video_url: str
    total_comments_scanned: int = 0
    top_comments: List[Dict[str, Any]] = Field(default_factory=list)
    insights: List[CommentInsight] = Field(default_factory=list)
    headline_hook: Optional[str] = None
    aftermath_lore: Optional[str] = None
    error: Optional[str] = None


class YouTubeCommentMiner:
    """
    Sub-second YouTube Top-Comment Miner powered by local yt-dlp.
    """

    def __init__(self, ytdlp_path: Optional[str] = None):
        if ytdlp_path and Path(ytdlp_path).exists():
            self.ytdlp_path = Path(ytdlp_path)
        else:
            self.ytdlp_path = self._resolve_ytdlp_path()

    def _resolve_ytdlp_path(self) -> Path:
        for p in DEFAULT_YTDLP_PATHS:
            if p.exists():
                return p
        return Path("yt-dlp")

    async def mine_comments(
        self,
        video_url: str,
        max_comments: int = 30
    ) -> CommentMiningResult:
        """
        Executes yt-dlp comment dump and extracts top liked comments.
        """
        if not video_url:
            return CommentMiningResult(success=False, video_url="", error="Video URL is empty")

        logger.info(f"[CommentMiner] Mining top comments for {video_url} using {self.ytdlp_path}")

        cmd = [
            str(self.ytdlp_path),
            "--skip-download",
            "--write-comments",
            "--extractor-args", f"youtube:max_comments={max_comments},all,all",
            "--dump-single-json",
            video_url,
        ]

        try:
            env = os.environ.copy()
            env["PYTHONIOENCODING"] = "utf-8"

            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env
            )

            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30.0)
            except asyncio.TimeoutError:
                proc.kill()
                logger.warning(f"[CommentMiner] Timed out mining comments for {video_url}")
                return CommentMiningResult(
                    success=False,
                    video_url=video_url,
                    error="Comment extraction timed out (30s limit)"
                )

            if proc.returncode != 0:
                err_msg = stderr.decode("utf-8", errors="ignore")[:300]
                logger.warning(f"[CommentMiner] yt-dlp exited with {proc.returncode}: {err_msg}")
                # Fallback empty result
                return CommentMiningResult(
                    success=False,
                    video_url=video_url,
                    error=f"yt-dlp error: {err_msg}"
                )

            stdout_str = stdout.decode("utf-8", errors="ignore").strip()
            if not stdout_str:
                return CommentMiningResult(success=False, video_url=video_url, error="Empty response from yt-dlp")

            data = json.loads(stdout_str)
            raw_comments = data.get("comments", [])

            # Filter and sort by like_count descending
            parsed_comments = []
            for c in raw_comments:
                parsed_comments.append({
                    "author": c.get("author", "익명"),
                    "text": c.get("text", "").strip(),
                    "like_count": int(c.get("like_count") or 0),
                    "is_pinned": bool(c.get("is_pinned") or False),
                    "timestamp": c.get("timestamp")
                })

            parsed_comments.sort(key=lambda x: (x["is_pinned"], x["like_count"]), reverse=True)
            top_picked = parsed_comments[:max_comments]

            # Synthesize 3-category insights
            insights = self._categorize_insights(top_picked)
            headline_hook = None
            aftermath_lore = None

            for ins in insights:
                if ins.category in ["debunk", "curiosity"] and not headline_hook:
                    headline_hook = ins.script_hook_potential
                elif ins.category == "lore" and not aftermath_lore:
                    aftermath_lore = ins.script_hook_potential

            return CommentMiningResult(
                success=True,
                video_url=video_url,
                total_comments_scanned=len(raw_comments),
                top_comments=top_picked,
                insights=insights,
                headline_hook=headline_hook,
                aftermath_lore=aftermath_lore
            )

        except Exception as e:
            logger.error(f"[CommentMiner] Failed to process comments: {e}", exc_info=True)
            return CommentMiningResult(
                success=False,
                video_url=video_url,
                error=str(e)
            )

    def _categorize_insights(self, comments: List[Dict[str, Any]]) -> List[CommentInsight]:
        """
        Rule-based NLP heuristic to cluster comments into 3 plus-alpha insights.
        """
        insights: List[CommentInsight] = []

        debunk_keywords = ["사실", "주작", "원래", "법적", "처벌", "진짜", "반전", "가짜", "조작", "실제로는", "판결"]
        lore_keywords = ["근황", "후일담", "이후", "결국", "3년", "1년", "나중에", "체포", "폐업", "사망", "구속", "결과"]
        curiosity_keywords = ["왜", "이유", "도대체", "어떻게", "궁금", "경찰", "소름", "의문", "충격"]

        for c in comments:
            text = c["text"]
            likes = c["like_count"]
            if len(text) < 5:
                continue

            category = "curiosity"
            potential_hook = ""

            if any(k in text for k in debunk_keywords):
                category = "debunk"
                potential_hook = f"하지만 시청자 {self._format_count(likes)}명이 지적한 소름 돋는 진짜 반전: {text[:45]}..."
            elif any(k in text for k in lore_keywords):
                category = "lore"
                potential_hook = f"사건 이후 밝혀진 충격적인 결말: {text[:45]}..."
            elif any(k in text for k in curiosity_keywords) or likes > 1000:
                category = "curiosity"
                potential_hook = f"댓글 {self._format_count(likes)}개가 한목소리로 의문을 제기한 결정적 장면: {text[:40]}..."
            else:
                category = "humor"
                potential_hook = text[:40]

            insights.append(CommentInsight(
                author=c["author"],
                text=text,
                like_count=likes,
                is_pinned=c["is_pinned"],
                category=category,
                script_hook_potential=potential_hook,
                confidence_score=0.9 if likes > 1000 or c["is_pinned"] else 0.75
            ))

        return insights

    @staticmethod
    def _format_count(count: int) -> str:
        if count >= 10000:
            return f"{count // 10000}만"
        elif count >= 1000:
            return f"{count // 1000}천"
    async def mine_comments_for_plus_alpha(
        self,
        video_url: str,
        max_comments: int = 30
    ) -> List[Dict[str, Any]]:
        """Convenience method returning list of insight dicts for deliberative director."""
        res = await self.mine_comments(video_url, max_comments)
        if not res or not res.success:
            return []
        return [i.dict() if hasattr(i, 'dict') else dict(i) for i in res.insights]


# Global singleton
youtube_comment_miner = YouTubeCommentMiner()
