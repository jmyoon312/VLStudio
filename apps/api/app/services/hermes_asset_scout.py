"""
Hermes Asset Scout Service for ViraLoop Studio.
Provides YouTube real-time search, automated video download, web research,
and image asset retrieval for the Hermes Conversational Director and Sovereign Preset workflows.
"""

import os
import sys
import json
import logging
import asyncio
import shutil
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger("hermes_asset_scout")

# Storage directory compliant with ViraLoop 9-Tier Storage Hierarchy (07_Downloads, 02_Operations)
LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
DOWNLOADS_DIR = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "07_Downloads"
DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

TEMP_DIR = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "02_Operations" / "Temp"
TEMP_DIR.mkdir(parents=True, exist_ok=True)


class HermesAssetScout:
    """
    Scouts external assets (YouTube videos, web knowledge, images)
    for autonomous video production with Sovereign Presets.
    """

    @staticmethod
    def _get_ytdlp_path() -> str:
        """Find yt-dlp executable in current venv or system PATH."""
        cand = Path(sys.executable).parent / ("yt-dlp.exe" if sys.platform == "win32" else "yt-dlp")
        if cand.exists():
            return str(cand)
        return shutil.which("yt-dlp") or "yt-dlp"

    @classmethod
    async def search_youtube(cls, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        Search YouTube in real-time and return structured video candidates.
        """
        ytdlp = cls._get_ytdlp_path()
        search_target = f"ytsearch{max_results}:{query}"
        cmd = [
            ytdlp,
            "--dump-json",
            "--default-search", f"ytsearch{max_results}",
            search_target,
            "--skip-download",
            "--no-playlist"
        ]

        logger.info(f"🔍 [HermesScout] Searching YouTube for: '{query}'")
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=35)
            
            results = []
            for line in stdout.decode("utf-8", errors="ignore").splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    results.append({
                        "id": data.get("id"),
                        "title": data.get("title"),
                        "url": data.get("webpage_url") or f"https://www.youtube.com/watch?v={data.get('id')}",
                        "duration": data.get("duration", 0),
                        "duration_string": data.get("duration_string", "0:00"),
                        "channel": data.get("uploader", "Unknown"),
                        "thumbnail": data.get("thumbnail"),
                        "view_count": data.get("view_count", 0),
                    })
                except Exception as parse_err:
                    logger.debug(f"JSON line parse skipped: {parse_err}")

            return results
        except Exception as e:
            logger.error(f"YouTube search failed for query '{query}': {e}")
            return []

    @classmethod
    async def download_youtube_video(cls, url: str, output_name: Optional[str] = None) -> Optional[str]:
        """
        Download a YouTube video directly to 07_Downloads in MP4 format.
        Returns the absolute local file path.
        """
        ytdlp = cls._get_ytdlp_path()
        
        # Prepare safe file template in 07_Downloads
        if output_name:
            safe_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', output_name)
            out_tmpl = str(DOWNLOADS_DIR / f"{safe_name}.%(ext)s")
        else:
            out_tmpl = str(DOWNLOADS_DIR / "%(id)s.%(ext)s")

        # Highest quality format selection (4K/1440p/1080p best video + best audio merged to MP4)
        cmd = [
            ytdlp,
            "-f", "bestvideo+bestaudio/best",
            "--merge-output-format", "mp4",
            "-o", out_tmpl,
            url,
            "--no-playlist"
        ]

        logger.info(f"📥 [HermesScout] Downloading YouTube video from: {url}")
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=300)
            
            # Find the downloaded file
            # Query the filename directly using yt-dlp --print filename
            fproc = await asyncio.create_subprocess_exec(
                ytdlp, "--print", "filename", "-o", out_tmpl, url,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            fout, _ = await asyncio.wait_for(fproc.communicate(), timeout=20)
            expected_path = fout.decode("utf-8", errors="ignore").strip().splitlines()[-1] if fout else None

            if expected_path and os.path.exists(expected_path):
                logger.info(f"✅ [HermesScout] Downloaded successfully: {expected_path}")
                return str(Path(expected_path).resolve())

            # Fallback scan for recent mp4 in DOWNLOADS_DIR
            mp4_files = sorted(DOWNLOADS_DIR.glob("*.mp4"), key=os.path.getmtime, reverse=True)
            if mp4_files:
                return str(mp4_files[0].resolve())

            return None
        except Exception as e:
            logger.error(f"Download failed for URL '{url}': {e}")
            return None

    @classmethod
    def extract_urls(cls, text: str) -> List[str]:
        """Extract YouTube or HTTP URLs from user prompt."""
        url_pattern = r'https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)'
        return re.findall(url_pattern, text)


hermes_asset_scout = HermesAssetScout()
