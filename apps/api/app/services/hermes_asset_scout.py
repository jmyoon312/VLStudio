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
            "--extractor-args", "youtube:player_client=android,web",
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
    async def stream_slice_online(
        cls, 
        url: str, 
        start_time: str, 
        end_time: str, 
        output_name: Optional[str] = None
    ) -> Optional[str]:
        """
        [DIRECT ONLINE STREAM RANGE SLICING]
        Downloads ONLY the required section (e.g. 10~15 seconds) from a remote video
        using HTTP range requests without downloading the entire large file.
        Saves to 02_Operations/Temp and returns local path.
        """
        ytdlp = cls._get_ytdlp_path()
        if output_name:
            safe_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', output_name)
            out_path = TEMP_DIR / f"{safe_name}.mp4"
        else:
            safe_id = re.sub(r'[^a-zA-Z0-9_\-]', '_', url.split('/')[-1])
            out_path = TEMP_DIR / f"slice_{safe_id}_{int(asyncio.get_event_loop().time())}.mp4"

        # Format section string for yt-dlp (e.g., "*00:01:10-00:01:25")
        start_clean = str(start_time).strip().lstrip('*')
        end_clean = str(end_time).strip().lstrip('*')
        section_spec = f"*{start_clean}-{end_clean}"

        cmd = [
            ytdlp,
            "--extractor-args", "youtube:player_client=android,web",
            "--download-sections", section_spec,
            "--force-keyframes-at-cuts",
            "-f", "bestvideo+bestaudio/best",
            "--merge-output-format", "mp4",
            "-o", str(out_path),
            url,
            "--no-playlist"
        ]

        logger.info(f"⚡ [HermesScout] Streaming slice directly from online: {url} [{section_spec}]")
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)
            
            if out_path.exists() and out_path.stat().st_size > 1000:
                logger.info(f"✅ [HermesScout] Online slice captured in seconds: {out_path} ({out_path.stat().st_size / 1024:.1f} KB)")
                return str(out_path.resolve())
            
            # Check for possible alternative extensions (e.g. .mkv/.webm merged)
            matches = list(TEMP_DIR.glob(f"{out_path.stem}.*"))
            if matches and matches[0].stat().st_size > 1000:
                return str(matches[0].resolve())

            logger.warning(f"Slice download did not generate expected file: {stderr.decode('utf-8', errors='ignore')[:200]}")
            return None
        except Exception as e:
            logger.error(f"Failed to stream slice from '{url}': {e}")
            return None

    @classmethod
    async def reverse_source_shorts(cls, shorts_url: str) -> Optional[Dict[str, Any]]:
        """
        [SHORTS REVERSE SOURCING ENGINE]
        Inspects a short-form video (YouTube Shorts/TikTok) and traces back to
        the original long-form, high-resolution source video.
        """
        ytdlp = cls._get_ytdlp_path()
        cmd = [ytdlp, "--dump-json", "--skip-download", shorts_url, "--no-playlist"]

        logger.info(f"🔎 [HermesScout] Reverse sourcing original video for Shorts: {shorts_url}")
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=20)
            data = json.loads(stdout.decode("utf-8", errors="ignore"))

            title = data.get("title", "")
            description = data.get("description", "")
            uploader = data.get("uploader", "")

            # 1. Search description for source URLs
            found_urls = cls.extract_urls(description)
            for u in found_urls:
                if "youtube.com/watch" in u or "youtu.be/" in u:
                    logger.info(f"🎯 [HermesScout] Found direct original URL in description: {u}")
                    return {"url": u, "source_type": "description_credit", "original_title": title}

            # 2. Extract clean search keywords from title (removing hashtags and emoji)
            clean_title = re.sub(r'#[a-zA-Z0-9_\-]+', '', title)
            clean_title = re.sub(r'[^\w\s]', ' ', clean_title).strip()
            
            search_query = f"{clean_title} full video"
            candidates = await cls.search_youtube(search_query, max_results=3)
            if candidates:
                # Pick the longest video candidate (typically long-form original)
                longest = max(candidates, key=lambda c: c.get("duration", 0))
                logger.info(f"🎯 [HermesScout] Found long-form candidate: '{longest.get('title')}' ({longest.get('duration_string')})")
                return {
                    "url": longest.get("url"),
                    "title": longest.get("title"),
                    "duration": longest.get("duration"),
                    "duration_string": longest.get("duration_string"),
                    "thumbnail": longest.get("thumbnail"),
                    "source_type": "youtube_search_scout"
                }

            return None
        except Exception as e:
            logger.error(f"Reverse sourcing failed for '{shorts_url}': {e}")
            return None

    @classmethod
    def extract_urls(cls, text: str) -> List[str]:
        """Extract YouTube or HTTP URLs from user prompt."""
        url_pattern = r'https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)'
        return re.findall(url_pattern, text)


hermes_asset_scout = HermesAssetScout()
