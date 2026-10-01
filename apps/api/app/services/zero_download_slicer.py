"""
Zero-Download On-The-Fly Stream Slicer Service for ViraLoop Studio.
Extracts high-resolution clips (e.g. 30-60s) from Douyin, TikTok, YouTube,
FMHY HLS streams, and direct video URLs WITHOUT downloading the full movie or video.
Integrates with 04_Profiles session cookies and hardware-accelerated FFmpeg.
"""

import os
import sys
import shutil
import asyncio
import logging
import uuid
import re
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List

logger = logging.getLogger("zero_download_slicer")

LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
MEDIA_ROOT = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media"
OPERATIONS_TEMP = MEDIA_ROOT / "02_Operations" / "Temp"
OPERATIONS_TEMP.mkdir(parents=True, exist_ok=True)
PROFILES_DIR = MEDIA_ROOT / "04_Profiles"


class ZeroDownloadSlicer:
    """
    On-The-Fly Stream Slicer:
    Directly extracts specified timecode clips from remote streams without full video download.
    """

    @staticmethod
    def _get_bin_path(binary_name: str) -> str:
        """Find executable in python venv, 09_System/bin, or system PATH."""
        is_win = sys.platform == "win32"
        exe_name = f"{binary_name}.exe" if is_win else binary_name

        # 1. Check Python parent
        cand1 = Path(sys.executable).parent / exe_name
        if cand1.exists():
            return str(cand1)

        # 2. Check 09_System/bin
        cand2 = MEDIA_ROOT / "09_System" / "bin" / exe_name
        if cand2.exists():
            return str(cand2)

        # 3. System PATH fallback
        return shutil.which(binary_name) or binary_name

    @classmethod
    def _find_platform_cookie_file(cls, url: str) -> Optional[str]:
        """Find matching exported cookies.txt in 04_Profiles for Douyin, TikTok, etc."""
        url_lower = url.lower()
        target_dir = None

        if "douyin.com" in url_lower:
            target_dir = PROFILES_DIR / "douyin"
        elif "tiktok.com" in url_lower:
            target_dir = PROFILES_DIR / "tiktok"
        elif "youtube.com" in url_lower or "youtu.be" in url_lower:
            target_dir = PROFILES_DIR / "youtube"
        elif "bilibili.com" in url_lower:
            target_dir = PROFILES_DIR / "bilibili"

        if target_dir and target_dir.exists():
            cookie_cand = target_dir / "cookies.txt"
            if cookie_cand.exists():
                return str(cookie_cand)

        # Fallback: scan all subdirs for cookies.txt
        if PROFILES_DIR.exists():
            for p in PROFILES_DIR.rglob("cookies.txt"):
                if p.is_file():
                    return str(p)

        return None

    @classmethod
    async def extract_stream_urls(cls, source_url: str) -> Dict[str, Any]:
        """
        Extract direct CDN video and audio stream URLs using yt-dlp.
        Returns: { 'video_url': str, 'audio_url': Optional[str], 'title': str, 'duration': float }
        """
        # If it's already a direct mp4 or m3u8 stream link
        if any(source_url.lower().endswith(ext) for ext in [".mp4", ".m3u8", ".ts", ".webm"]):
            return {
                "video_url": source_url,
                "audio_url": None,
                "title": Path(source_url.split("?")[0]).stem,
                "duration": 0.0,
                "is_direct": True
            }

        ytdlp = cls._get_bin_path("yt-dlp")
        cookie_file = cls._find_platform_cookie_file(source_url)

        cmd = [
            ytdlp,
            "--no-warnings",
            "--no-check-certificates",
            "-j",  # dump json metadata
            "--simulate"
        ]

        if cookie_file:
            cmd.extend(["--cookies", cookie_file])

        # Modern User-Agent spoofing to bypass Douyin / TikTok bot shields
        cmd.extend([
            "--user-agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
        ])
        cmd.append(source_url)

        logger.info(f"🔍 [StreamSlicer] Probing stream for: {source_url}")
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            err_msg = stderr.decode('utf-8', errors='ignore')
            logger.warning(f"⚠️ [StreamSlicer] yt-dlp probe failed (rc={proc.returncode}): {err_msg[:200]}")
            # Fallback: try raw stream url extraction
            g_cmd = [ytdlp, "-g", source_url]
            if cookie_file:
                g_cmd.extend(["--cookies", cookie_file])
            g_proc = await asyncio.create_subprocess_exec(
                *g_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            g_out, _ = await g_proc.communicate()
            if g_proc.returncode == 0:
                urls = g_out.decode('utf-8', errors='ignore').strip().split('\n')
                return {
                    "video_url": urls[0].strip(),
                    "audio_url": urls[1].strip() if len(urls) > 1 else None,
                    "title": "Stream Video",
                    "duration": 0.0,
                    "is_direct": False
                }
            raise RuntimeError(f"스트림 주소를 추출하지 못했습니다: {err_msg[:160]}")

        import json
        info = json.loads(stdout.decode('utf-8', errors='ignore'))
        
        # Get best stream URL
        video_url = info.get("url")
        audio_url = None

        # Check requested formats (video + audio separation)
        formats = info.get("requested_formats") or info.get("formats")
        if formats and isinstance(formats, list):
            v_cand = next((f.get("url") for f in formats if f.get("vcodec") != "none"), None)
            a_cand = next((f.get("url") for f in formats if f.get("acodec") != "none" and f.get("vcodec") == "none"), None)
            if v_cand:
                video_url = v_cand
            if a_cand:
                audio_url = a_cand

        return {
            "video_url": video_url,
            "audio_url": audio_url,
            "title": info.get("title", "Stream Video"),
            "duration": float(info.get("duration") or 0.0),
            "thumbnail": info.get("thumbnail"),
            "uploader": info.get("uploader", ""),
            "is_direct": False
        }

    @staticmethod
    def _sec_to_tc(sec: float) -> str:
        sec_int = max(0, int(sec))
        m, s = divmod(sec_int, 60)
        h, m = divmod(m, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"

    @classmethod
    async def slice_stream(
        cls,
        source_url: str,
        start_seconds: float,
        duration_seconds: float,
        output_filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract a high-resolution clip directly from stream without downloading full media.
        Uses yt-dlp HTTP range requests (--download-sections) for YouTube/Douyin/TikTok,
        and falls back to FFmpeg fast-seek for direct stream URLs.
        """
        start_seconds = max(0.0, float(start_seconds))
        duration_seconds = max(3.0, float(duration_seconds))
        end_seconds = start_seconds + duration_seconds

        ytdlp = cls._get_bin_path("yt-dlp")
        cookie_file = cls._find_platform_cookie_file(source_url)

        # Step 1: Probe metadata (non-fatal if probe fails)
        stream_info = {}
        try:
            stream_info = await cls.extract_stream_urls(source_url)
        except Exception as pe:
            logger.warning(f"⚠️ [StreamSlicer] Initial probe notice: {pe}")

        title = stream_info.get("title") or "Stream Clip"
        clean_title = re.sub(r'[^\w\s-]', '', title).strip().replace(' ', '_')[:30] or "clip"

        if not output_filename:
            file_uid = uuid.uuid4().hex[:8]
            output_filename = f"slice_{clean_title}_{int(start_seconds)}s_{file_uid}.mp4"

        output_path = OPERATIONS_TEMP / output_filename

        # Step 2: Primary Slicing via yt-dlp --download-sections (HTTP range chunks, no full download)
        start_tc = cls._sec_to_tc(start_seconds)
        end_tc = cls._sec_to_tc(end_seconds)
        section_spec = f"*{start_tc}-{end_tc}"

        logger.info(f"⚡ [StreamSlicer] Slicing stream on-the-fly: {source_url} [{section_spec}] -> {output_filename}")
        ytdlp_cmd = [
            ytdlp,
            "--no-playlist",
            "--extractor-args", "youtube:player_client=android,web",
            "--download-sections", section_spec,
            "--force-keyframes-at-cuts",
            "-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best",
            "--merge-output-format", "mp4",
            "-o", str(output_path),
            source_url
        ]
        if cookie_file and os.path.exists(cookie_file):
            ytdlp_cmd.extend(["--cookies", cookie_file])

        try:
            proc = await asyncio.create_subprocess_exec(
                *ytdlp_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=45)
            if output_path.exists() and output_path.stat().st_size > 1000:
                file_size_mb = round(output_path.stat().st_size / (1024 * 1024), 2)
                stream_http_url = f"/api/files/stream-media?path={output_path.as_posix()}"
                logger.info(f"✅ [StreamSlicer] yt-dlp range slice successful: {output_path.name} ({file_size_mb}MB)")
                return {
                    "success": True,
                    "filename": output_path.name,
                    "filepath": str(output_path),
                    "stream_url": stream_http_url,
                    "size_mb": file_size_mb,
                    "duration": duration_seconds,
                    "start_time": start_seconds,
                    "title": title,
                    "thumbnail": stream_info.get("thumbnail")
                }
            # Check for alternative extensions merged by yt-dlp
            matches = list(OPERATIONS_TEMP.glob(f"{output_path.stem}.*"))
            if matches and matches[0].stat().st_size > 1000:
                target_file = matches[0]
                file_size_mb = round(target_file.stat().st_size / (1024 * 1024), 2)
                stream_http_url = f"/api/files/stream-media?path={target_file.as_posix()}"
                logger.info(f"✅ [StreamSlicer] yt-dlp range slice found: {target_file.name} ({file_size_mb}MB)")
                return {
                    "success": True,
                    "filename": target_file.name,
                    "filepath": str(target_file),
                    "stream_url": stream_http_url,
                    "size_mb": file_size_mb,
                    "duration": duration_seconds,
                    "start_time": start_seconds,
                    "title": title,
                    "thumbnail": stream_info.get("thumbnail")
                }
        except Exception as ye:
            logger.warning(f"⚠️ [StreamSlicer] yt-dlp range slice warning: {ye}, attempting FFmpeg fast-seek fallback...")

        # Step 3: FFmpeg Fast Seek Fallback (for direct m3u8 / MP4 URLs)
        video_url = stream_info.get("video_url")
        audio_url = stream_info.get("audio_url")
        if not video_url:
            raise ValueError(f"유효한 스트림 주소를 확보하지 못했습니다: {source_url}")

        ffmpeg = cls._get_bin_path("ffmpeg")
        cmd = [
            ffmpeg,
            "-y",
            "-ss", str(start_seconds),
            "-i", video_url
        ]
        if audio_url:
            cmd.extend([
                "-ss", str(start_seconds),
                "-i", audio_url,
                "-map", "0:v:0",
                "-map", "1:a:0"
            ])
        cmd.extend([
            "-t", str(duration_seconds),
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "20",
            "-c:a", "aac",
            "-b:a", "192k",
            "-avoid_negative_ts", "make_zero",
            "-movflags", "+faststart",
            str(output_path)
        ])

        logger.info(f"✂️ [StreamSlicer] Fallback FFmpeg slice: {start_seconds}s ~ +{duration_seconds}s -> {output_filename}")
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        _, stderr = await proc.communicate()

        if proc.returncode != 0 or not output_path.exists():
            err = stderr.decode('utf-8', errors='ignore')
            logger.error(f"❌ [StreamSlicer] FFmpeg slice failed (rc={proc.returncode}): {err[:300]}")
            raise RuntimeError(f"스트림 구간 슬라이싱 실패: {err[:150]}")

        file_size_mb = round(output_path.stat().st_size / (1024 * 1024), 2)
        stream_http_url = f"/api/files/stream-media?path={output_path.as_posix()}"

        logger.info(f"✅ [StreamSlicer] FFmpeg stream slice successful: {output_path.name} ({file_size_mb}MB)")
        return {
            "success": True,
            "filename": output_path.name,
            "filepath": str(output_path),
            "stream_url": stream_http_url,
            "size_mb": file_size_mb,
            "duration": duration_seconds,
            "start_time": start_seconds,
            "title": title,
            "thumbnail": stream_info.get("thumbnail")
        }
        return {
            "success": True,
            "filename": output_path.name,
            "filepath": str(output_path),
            "stream_url": stream_http_url,
            "size_mb": file_size_mb,
            "duration": duration_seconds,
            "start_time": start_seconds,
            "title": stream_info.get("title"),
            "thumbnail": stream_info.get("thumbnail")
        }


zero_download_slicer = ZeroDownloadSlicer()
