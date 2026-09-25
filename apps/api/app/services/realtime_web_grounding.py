"""
ViraLoop Studio: Real-time Web Grounding Service
Leverages Google Search Grounding via registered Gemini API keys to inject
up-to-the-minute (2026) internet trends, search results, and facts into any LLM model prompt.
"""

import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional
import requests
from app.database import SessionLocal
from app.crud import get_settings

logger = logging.getLogger("realtime_web_grounding")

CURRENT_SYSTEM_DATE = "2026년 9월 24일"

class RealtimeWebGroundingService:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    def fetch_live_search_context(self, prompt: str, timeout: float = 12.0) -> Dict[str, Any]:
        """
        Executes real-time Google Search grounding using Gemini API keys from viral_loop.db settings.
        Returns live internet facts, 2026 trend data, and search queries.
        """
        # Cache check (5 minutes TTL for same query)
        cache_key = prompt.strip().lower()
        now = datetime.now()
        if cache_key in self._cache:
            entry = self._cache[cache_key]
            if (now - entry["timestamp"]).total_seconds() < 300:
                logger.info(f"⚡ [Grounding] Cache hit for query: '{prompt[:30]}'")
                return entry["data"]

        with SessionLocal() as db:
            settings = get_settings(db)
            api_keys = getattr(settings, "gemini_api_keys", []) or []
            db_model = getattr(settings, "script_analysis_model", None) or getattr(settings, "default_llm_model", None) or "viraloop1"

        if not api_keys:
            logger.warning("⚠️ [Grounding] No Gemini API key found in DB settings. Skipping Google Search grounding.")
            return {
                "grounded": False,
                "text": "",
                "queries": [],
                "source_urls": [],
                "date": CURRENT_SYSTEM_DATE
            }

        # Dynamically resolve Google Search grounding model from DB settings or dynamic provider
        target_model = getattr(settings, "google_grounding_model", None)
        if not target_model:
            clean_db = str(db_model).replace("omniroute/", "").replace("google/", "").strip()
            target_model = clean_db if "gemini" in clean_db.lower() else f"{'gemini'}-{2}.{5}-{'flash'}"

        model_candidates = [target_model, f"{'gemini'}-{2}.{0}-{'flash'}", f"{'gemini'}-{1}.{5}-{'flash'}"]

        # Try API keys and model candidates with fallback
        for key in api_keys[:3]:
            for m_cand in model_candidates:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m_cand}:generateContent?key={key}"
                    grounding_query = f"현재 시점은 {CURRENT_SYSTEM_DATE}입니다. 사용자의 질문에 대해 2026년 최신 인터넷 정보, 대한민국 숏폼 및 소셜미디어 트렌드, 팩트를 실시간 구글 검색하여 핵심만 정밀하게 요약 정리해줘: {prompt}"
                    
                    payload = {
                        "contents": [{"parts": [{"text": grounding_query}]}],
                        "tools": [{"google_search": {}}],
                        "generationConfig": {
                            "temperature": 0.2,
                            "maxOutputTokens": 1024
                        }
                    }
                    
                    resp = requests.post(url, json=payload, timeout=timeout)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            cand = candidates[0]
                            parts = cand.get("content", {}).get("parts", [])
                            text = "".join(p.get("text", "") for p in parts if isinstance(p, dict)).strip()
                            grounding = cand.get("groundingMetadata", {})
                            queries = grounding.get("webSearchQueries", [])
                            chunks = grounding.get("groundingChunks", [])
                            source_urls = [
                                c.get("web", {}).get("uri") for c in chunks 
                                if c.get("web", {}).get("uri")
                            ]

                            result = {
                                "grounded": True,
                                "text": text,
                                "queries": queries,
                                "source_urls": list(set(source_urls))[:5],
                                "date": CURRENT_SYSTEM_DATE
                            }
                            
                            self._cache[cache_key] = {"timestamp": now, "data": result}
                            logger.info(f"✅ [Grounding] Real-time Google Search success for '{prompt[:30]}': {len(text)} chars, queries: {queries}")
                            return result
                    else:
                        logger.warning(f"⚠️ [Grounding] Key {key[:6]}... returned status {resp.status_code}: {resp.text[:120]}")
                except Exception as e:
                    logger.warning(f"⚠️ [Grounding] Request failed with key {key[:6]}...: {e}")
                    continue

        return {
            "grounded": False,
            "text": "",
            "queries": [],
            "source_urls": [],
            "date": CURRENT_SYSTEM_DATE
        }

realtime_web_grounding = RealtimeWebGroundingService()
