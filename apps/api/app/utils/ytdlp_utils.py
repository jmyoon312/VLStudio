"""
ViraLoop Studio: yt-dlp Standard Options Provider (Single Source of Truth)
Bypasses YouTube 403 Forbidden using Android/Web dual client spoofing and anti-bot hardening.
"""
import shutil
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("ytdlp_utils")

import re

class StandardYtdlpFilteredLogger:
    """yt-dlp 기본 에러가 stderr로 방출되어 [FastAPI ERR]로 찍히는 것을 원천 차단"""
    def debug(self, msg):
        pass
    def info(self, msg):
        pass
    def warning(self, msg):
        suppress_list = [
            "HTTP Error 403",
            "Forbidden",
            "Unable to download API page",
            "No working app info",
            "HTTP Error 429",
            "Too Many Requests",
            "page 2",
            "page 1",
            "Private video",
            "Sign in to confirm",
            "Video unavailable",
            "This video is unavailable",
            "Unable to download webpage",
            "content is not available",
            "Unable to extract secondary user ID",
            "tiktok:user",
            "giving up after"
        ]
        if any(ign in str(msg) for ign in suppress_list):
            return
        logger.debug(f"[yt-dlp Warning] {msg}")

    def error(self, msg):
        suppress_list = [
            "HTTP Error 403",
            "Forbidden",
            "Unable to download API page",
            "No working app info",
            "HTTP Error 429",
            "Too Many Requests",
            "page 2",
            "page 1",
            "Private video",
            "Sign in to confirm",
            "Video unavailable",
            "This video is unavailable",
            "Unable to download webpage",
            "content is not available",
            "Unable to extract secondary user ID",
            "tiktok:user",
            "giving up after"
        ]
        if any(ign in str(msg) for ign in suppress_list):
            return
        logger.debug(f"[yt-dlp Standard] {msg}")

def sanitize_search_query(q: str) -> str:
    """
    특수문자((), [], @ 등)로 인한 YouTube 검색 토크나이저 오류 및 WAF 차단을 방지하기 위해 쿼리 정제
    """
    if not q:
        return ""
    # 괄호, 특수기호 제거하고 공백 정리
    cleaned = re.sub(r'[^\w\s#]', ' ', q)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def build_safe_ytsearch_query(term: str, count: int = 10, suffix: str = "shorts") -> str:
    """
    YouTube Search API의 continuation page 2 HTTP 403 Forbidden 오류를 원천 차단하는 안전 검색 쿼리 빌더.
    단일 쿼리당 최대 10개로 캡핑하여 1페이지만 조회하도록 보장합니다.
    (영문 'kr' 단독 단어가 힌디어/인도 검색어(KR$NA, kya kr 등)로 검색되는 오염을 원천 차단)
    """
    clean_term = sanitize_search_query(term)
    clean_term = re.sub(r'\bkr\b', '한국', clean_term, flags=re.IGNORECASE).strip()
    safe_count = max(1, min(10, count))
    query_str = f"{clean_term} {suffix}".strip() if suffix else clean_term
    return f"ytsearch{safe_count}:{query_str}"

def get_standard_ytdlp_opts(extra_opts: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    YouTube 403 Forbidden 방어 및 고성능 크롤링을 위한 yt-dlp 표준 옵션 단일 공급원.
    Android/Web 듀얼 클라이언트 스푸핑 및 최신 데스크톱 브라우저 User-Agent를 강제 적용합니다.
    """
    node_path = shutil.which('node')
    opts: Dict[str, Any] = {
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'ignoreerrors': True,
        'logger': StandardYtdlpFilteredLogger(),
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://www.google.com/'
        },
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'web'],
                'lang': ['ko']
            }
        }
    }
    if node_path:
        opts['exec_cmd'] = {'node': node_path}

    if extra_opts:
        for k, v in extra_opts.items():
            if k == 'extractor_args' and isinstance(v, dict):
                for ek, ev in v.items():
                    if ek not in opts['extractor_args']:
                        opts['extractor_args'][ek] = {}
                    if isinstance(ev, dict):
                        opts['extractor_args'][ek].update(ev)
                    else:
                        opts['extractor_args'][ek] = ev
            elif k == 'http_headers' and isinstance(v, dict):
                opts['http_headers'].update(v)
            else:
                opts[k] = v

    if 'compat_opts' in opts and isinstance(opts['compat_opts'], list):
        opts['compat_opts'] = [c for c in opts['compat_opts'] if c != 'no-javascript-extractor']
        if not opts['compat_opts']:
            opts.pop('compat_opts', None)

    return opts
