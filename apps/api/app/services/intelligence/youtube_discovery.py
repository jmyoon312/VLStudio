import logging
import yt_dlp
from typing import List, Dict, Any, Optional
from app.utils.ytdlp_utils import get_standard_ytdlp_opts, build_safe_ytsearch_query, sanitize_search_query

logger = logging.getLogger(__name__)

def search_youtube_channels(query: str, max_results: int = 20) -> List[Dict[str, Any]]:
    """
    Search YouTube for channels matching the query using yt-dlp.
    Returns a list of candidate dicts with channel info extracted from search results.
    """
    try:
        # [FEATURE] Apply region filtering to restrict non-target countries
        # Specifically targeting KR, JP, and EN regions, excluding Southeast Asia.
        ydl_opts = get_standard_ytdlp_opts({
            'extract_flat': 'in_playlist',
            'playlistend': min(10, max_results),
            'socket_timeout': 20,
            'skip_download': True,
            'geo_bypass': True,
            'geo_bypass_country': 'KR',
            'sleep_interval': 0.5,
            'max_sleep_interval': 1.5,
        })
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            clean_q = sanitize_search_query(query)
            biased_query = f"{clean_q} (한국어 OR 日本語 OR english)"
            safe_q = build_safe_ytsearch_query(biased_query, min(10, max_results), "")
            info = ydl.extract_info(safe_q, download=False)
            entries = info.get('entries') or [] if info else []
    except Exception as e:
        logger.warning(f"[YouTubeDiscovery] yt-dlp search failed for '{query}': {e}")
        return []

    candidates = []
    seen_urls = set()
    for entry in entries:
        if not entry:
            continue
        channel_url = entry.get('channel_url') or entry.get('uploader_url') or ''
        if not channel_url or channel_url in seen_urls:
            continue
        seen_urls.add(channel_url)

        name = entry.get('uploader') or entry.get('channel') or entry.get('creator', '')
        if not name:
            name = entry.get('title', '').replace(' - YouTube', '').strip()
            if not name:
                continue

        candidates.append({
            "url": channel_url,
            "name": name,
            "subscriber_count": entry.get('channel_follower_count') or 0,
            "view_count": entry.get('view_count') or 0,
            "video_count": entry.get('playlist_count') or 0,
            "thumbnail": entry.get('channel_thumbnail_url') or entry.get('thumbnail', ''),
            "snippet": entry.get('description', '') or entry.get('title', '')[:200],
            "source": "youtube_discovery"
        })

    logger.info(f"[YouTubeDiscovery] Found {len(candidates)} channels for '{query}'")
    return candidates


def search_youtube_videos(query: str, max_results: int = 20, shorts_only: bool = False) -> List[Dict[str, Any]]:
    """
    Search YouTube for videos matching the query using yt-dlp.
    """
    try:
        extra = {
            'extract_flat': 'in_playlist',
            'playlistend': min(10, max_results),
            'socket_timeout': 20,
            'skip_download': True,
            'geo_bypass': True,
            'geo_bypass_country': 'KR',
            'sleep_interval': 0.5,
            'max_sleep_interval': 1.5,
        }
        if shorts_only:
            extra['match_filter'] = yt_dlp.match_filter_func("duration <= 65")
        ydl_opts = get_standard_ytdlp_opts(extra)
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            clean_q = sanitize_search_query(query)
            biased_query = f"{clean_q} (한국어 OR 日本語 OR english)"
            safe_q = build_safe_ytsearch_query(biased_query, min(10, max_results), "")
            info = ydl.extract_info(safe_q, download=False)
            return info.get('entries') or [] if info else []
    except Exception as e:
        logger.warning(f"[YouTubeDiscovery] yt-dlp video search failed for '{query}': {e}")
        return []
