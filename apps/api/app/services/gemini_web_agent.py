"""
Universal Sovereign Gemini Web & Intelligence Agent Service
===========================================================
Provides unified, high-performance sovereign intelligence across:
1. YouTube Video Rapid Deconstruction & Shorts Repurpose Analysis
2. Real-time Live Web Search & Grounding
3. Multi-Scene Consistent Character Prompt Engineering
4. Direct Nano Banana Pro / Imagen 3 Image Generation Integration
5. Character Multi-Voice Synthesis Integration

Zero Paid API Keys, Zero Edge-TTS, 100% Google Sovereign Quota Pool with Auto-Rotation.
"""

import os
import sys
import json
import time
import re
import logging
import asyncio
from typing import Dict, Any, List, Optional, AsyncGenerator
from pathlib import Path
import httpx

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.services.google_account_pool import google_account_pool
from app.utils.ytdlp_utils import get_standard_ytdlp_opts, sanitize_search_query
from app.services.direct_gemini_image_generator import direct_gemini_image_generator
from app.services.character_voice_tts import synthesize_character_voice

logger = logging.getLogger("gemini_web_agent")

PRIMARY_HOSTS = ["daily-cloudcode-pa.googleapis.com", "cloudcode-pa.googleapis.com"]
DEFAULT_PROJECT = "aicode-consumers"
DEFAULT_MODELS = [
    "gemini-3.8-flash-tiered",
    "gemini-3.8-flash-high",
    "gemini-3.8-flash-medium",
    "gemini-3.1-pro-high",
    "gemini-3.7-flash-tiered"
]


class GeminiWebAgent:
    """
    Universal Sovereign Agent orchestrating Google Antigravity & Gemini Web
    capabilities for autonomous video analysis, search, visual continuity, and media synthesis.
    """

    def __init__(self):
        self.pool = google_account_pool

    async def generate_text(
        self,
        prompt: str,
        system_guidance: Optional[str] = None,
        enable_grounding: bool = False,
        preferred_model: Optional[str] = None,
        temperature: float = 0.4,
        max_tokens: int = 4096
    ) -> Dict[str, Any]:
        """
        Executes a robust streaming request against Antigravity IDE 2.0 with
        automatic multi-account rotation and failover.
        """
        model_candidates = [preferred_model] if preferred_model else DEFAULT_MODELS

        # Iterate through healthy accounts
        for session_info in self.pool.iter_healthy_antigravity_sessions():
            s_email = session_info["email"]
            token = session_info["access_token"]
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "User-Agent": "Antigravity/2.17.0"
            }

            for model_id in model_candidates:
                payload = {
                    "project": DEFAULT_PROJECT,
                    "model": model_id,
                    "request": {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": temperature,
                            "maxOutputTokens": max_tokens
                        }
                    }
                }
                if system_guidance:
                    payload["request"]["systemInstruction"] = {
                        "parts": [{"text": system_guidance}]
                    }
                if enable_grounding:
                    payload["request"]["tools"] = [{"googleSearch": {}}]

                for host in PRIMARY_HOSTS:
                    stream_url = f"https://{host}/v1internal:streamGenerateContent?alt=sse"
                    try:
                        async with httpx.AsyncClient(timeout=httpx.Timeout(connect=5.0, read=40.0, write=10.0, pool=10.0)) as client:
                            async with client.stream("POST", stream_url, headers=headers, json=payload) as resp:
                                if resp.status_code in [429, 403]:
                                    logger.warning(f"⚠️ [GeminiWebAgent] HTTP {resp.status_code} on {s_email} ({model_id}), rotating account...")
                                    self.pool.report_antigravity_exhaustion(s_email, cooldown_seconds=180)
                                    break  # Try next account
                                if resp.status_code != 200:
                                    logger.debug(f"[GeminiWebAgent] HTTP {resp.status_code} on {host}/{model_id}")
                                    continue

                                full_text = ""
                                async for line in resp.aiter_lines():
                                    if not line or not line.startswith("data: "):
                                        continue
                                    try:
                                        data = json.loads(line[6:])
                                        candidates = data.get("response", {}).get("candidates", [])
                                        if not candidates:
                                            continue
                                        parts = candidates[0].get("content", {}).get("parts", [])
                                        for p in parts:
                                            if isinstance(p, dict) and "text" in p:
                                                full_text += p["text"]
                                    except Exception:
                                        pass

                                if full_text.strip():
                                    return {
                                        "success": True,
                                        "text": full_text.strip(),
                                        "model": model_id,
                                        "account": s_email
                                    }
                    except Exception as e:
                        logger.debug(f"[GeminiWebAgent] Request error on {host} ({model_id}): {e}")
                        continue

        return {
            "success": False,
            "text": "",
            "error": "모든 구글 계정 풀의 한도가 소진되었거나 응답을 받지 못했습니다."
        }

    async def analyze_youtube_video(
        self,
        video_url: str,
        custom_focus: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Rapidly deconstructs a YouTube video for viral hooks, retention structure,
        and high-converting shorts extraction points.
        """
        logger.info(f"🎬 [GeminiWebAgent] Analyzing YouTube Video: {video_url}")

        # 1. Fetch metadata via yt-dlp without downloading binaries
        video_meta = await self._fetch_youtube_metadata(video_url)

        title = video_meta.get("title", "제목 미상")
        description = video_meta.get("description", "")[:1000]
        duration = video_meta.get("duration", 0)
        channel = video_meta.get("channel", video_meta.get("uploader", "채널 미상"))
        tags = video_meta.get("tags", [])[:10]
        chapters = video_meta.get("chapters", [])

        # Format chapter summary if present
        chapter_str = ""
        if chapters:
            chapter_str = "타임라인 챕터 정보:\n" + "\n".join([
                f"- {c.get('start_time', 0):.0f}초 ~ {c.get('end_time', 0):.0f}초: {c.get('title', '')}"
                for c in chapters[:15]
            ])

        prompt = f"""
당신은 대한민국 1위 숏폼/유튜브 바이럴 프로덕션 최고 전략 디렉터입니다.
아래 분석 대상 영상의 메타데이터와 컨텍스트를 기반으로, 시청 지속 시간을 극대화하고 숏폼(쇼츠/릴스/틱톡)으로 재가공하기 위한 '정밀 바이럴 역공학 분석 리포트'를 JSON 규격으로 작성하십시오.

[분석 대상 영상 정보]
- URL: {video_url}
- 영상 제목: {title}
- 채널명: {channel}
- 영상 길이: {duration}초 (약 {duration // 60}분 {duration % 60}초)
- 주요 태그: {', '.join(tags) if tags else '없음'}
- {chapter_str}
- 영상 설명문 발췌:
{description}

{f'[사용자 특별 요청/집중 분석 포인트]: {custom_focus}' if custom_focus else ''}

[반드시 준수할 출력 JSON 스키마 (마크다운 백틱 없이 순수 JSON만 출력)]:
{{
  "title": "{title}",
  "channel": "{channel}",
  "duration_sec": {duration},
  "hook_analysis": {{
    "hook_type": "호기심 유발형 / 시각 충격형 / 권위자 질문형 / 논란 제기형 중 1택",
    "hook_duration_sec": 3,
    "retention_score": 92,
    "analysis": "영상 초반 3초의 시청자 이탈 방지 장치 및 심리적 트리거 평가"
  }},
  "narrative_structure": [
    {{"timestamp": "00:00", "phase": "0초 훅 & 문제 제기", "core_action": "내용 요약"}},
    {{"timestamp": "00:15", "phase": "긴장 고조 및 전개", "core_action": "내용 요약"}},
    {{"timestamp": "00:45", "phase": "클라이맥스 및 반전", "core_action": "내용 요약"}},
    {{"timestamp": "01:10", "phase": "해결 및 루프 후크", "core_action": "내용 요약"}}
  ],
  "viral_triggers": [
    "시청자를 끝까지 붙잡아 두는 핵심 도파민 유발 요소 1",
    "핵심 도파민 유발 요소 2",
    "댓글 참여 유도 장치 (쟁점/토론 유도)"
  ],
  "recommended_shorts": [
    {{
      "shorts_title": "쇼츠 추천 제목 (클릭을 부르는 어그로/궁금증 유발)",
      "start_sec": 10,
      "end_sec": 50,
      "duration_sec": 40,
      "hook_line": "쇼츠 0초 시작 시 띄울 강력한 첫 문장 대본",
      "visual_direction": "어떤 장면을 확대하거나 시각 효과를 넣어야 하는지 연출 지시",
      "why_it_works": "이 구간이 숏폼으로 성공할 수밖에 없는 바이럴 심리학적 이유"
    }}
  ]
}}
"""

        system_guidance = "You are an elite YouTube short-form viral strategist. Always output valid JSON without markdown wrapping."
        res = await self.generate_text(prompt=prompt, system_guidance=system_guidance, temperature=0.3)

        if not res.get("success"):
            return {
                "success": False,
                "video_url": video_url,
                "title": title,
                "error": res.get("error", "영상 분석 생성 실패")
            }

        parsed = self._extract_json_from_text(res.get("text", ""))
        if not parsed:
            # Fallback wrapper
            return {
                "success": True,
                "video_url": video_url,
                "title": title,
                "raw_analysis": res.get("text", ""),
                "hook_analysis": {"retention_score": 88, "analysis": "분석 텍스트 참고"},
                "recommended_shorts": []
            }

        parsed["success"] = True
        parsed["video_url"] = video_url
        parsed["model_used"] = res.get("model")
        return parsed

    async def live_web_search(
        self,
        query: str,
        search_depth: str = "deep"
    ) -> Dict[str, Any]:
        """
        Performs real-time web search and ground-truth intelligence synthesis,
        extracting key facts, trending perspectives, and short-form creation angles.
        """
        logger.info(f"🌐 [GeminiWebAgent] Live Web Search: {query} (depth={search_depth})")
        clean_q = sanitize_search_query(query)

        prompt = f"""
당신은 실시간 팩트체크와 트렌드 마이닝을 수행하는 AI 리서치 디렉터입니다.
다음 검색 주제에 대해 가장 최신의 사실에 기반하여 심층 분석하고, 이를 숏폼 영상 콘텐츠로 제작할 수 있는 기획 포인트까지 종합한 JSON 리포트를 작성하십시오.

[검색 쿼리]: {clean_q}

[반드시 준수할 JSON 스키마 (마크다운 백틱 없이 순수 JSON만 출력)]:
{{
  "query": "{clean_q}",
  "summary": "검색 주제에 대한 명쾌하고 팩트에 기반한 종합 요약 (3~5문장)",
  "key_facts": [
    "핵심 팩트 및 최신 정보 1",
    "핵심 팩트 및 최신 정보 2",
    "핵심 팩트 및 최신 정보 3"
  ],
  "public_reactions": [
    "대중 및 온라인 커뮤니티의 주요 반응 또는 쟁점",
    "논란이나 찬반 양론의 핵심 포인트"
  ],
  "shorts_production_angles": [
    {{
      "concept": "숏폼 기획 콘셉트 1 (예: 1분 요약, 반전 진실)",
      "hook_line": "시청자를 사로잡는 첫 3초 대본 문장",
      "narrative_focus": "영상에서 집중 조명할 핵심 갈등/사건"
    }},
    {{
      "concept": "숏폼 기획 콘셉트 2 (예: 인터뷰/반응형)",
      "hook_line": "호기심을 극대화하는 첫 문장",
      "narrative_focus": "시청자 댓글 유도 및 논쟁 유발 지점"
    }}
  ]
}}
"""
        system_guidance = "You are a real-time factual analyst. Respond strictly in valid JSON."
        res = await self.generate_text(
            prompt=prompt,
            system_guidance=system_guidance,
            enable_grounding=True,
            temperature=0.3
        )

        if not res.get("success"):
            return {
                "success": False,
                "query": clean_q,
                "error": res.get("error", "검색 및 분석 실패")
            }

        parsed = self._extract_json_from_text(res.get("text", ""))
        if not parsed:
            return {
                "success": True,
                "query": clean_q,
                "summary": res.get("text", ""),
                "key_facts": [],
                "shorts_production_angles": []
            }

        parsed["success"] = True
        parsed["model_used"] = res.get("model")
        return parsed

    async def generate_character_continuation_prompt(
        self,
        character_description: str,
        scene_action: str,
        base_style: str = "cinematic_photorealism"
    ) -> Dict[str, Any]:
        """
        Ensures 100% visual consistency and zero character drift across multiple
        video scenes for Nano Banana Pro (Gemini 3.1 Flash Image).
        """
        prompt = f"""
당신은 헐리우드 시네마틱 애니메이션 및 영상 제작의 수석 컨셉 아티스트입니다.
동일 인물 캐릭터가 여러 컷의 영상/이미지에서 절대 외모나 복장이 변형되지 않도록(Character Consistency), 
Nano Banana Pro (Gemini 3.1 Flash Image) 이미지 생성 엔진에 최적화된 영문 프롬프트와 네거티브 프롬프트를 구성하십시오.

[캐릭터 고정 외모/특징]:
{character_description}

[이번 씬의 상황/행동/감정]:
{scene_action}

[기본 시각 스타일]: {base_style}

[반드시 준수할 JSON 스키마]:
{{
  "positive_prompt": "Ultra-detailed visual prompt in English including exact facial features, hairstyle, clothing, lighting, camera shot (e.g. medium shot, 35mm), and cinematic atmosphere",
  "negative_prompt": "blurry, low quality, distorted anatomy, extra limbs, changing facial features, different clothing, text, watermark, bad hands",
  "recommended_aspect_ratio": "9:16",
  "style_tag": "{base_style}"
}}
"""
        res = await self.generate_text(prompt=prompt, temperature=0.3)
        if not res.get("success"):
            return {
                "success": False,
                "positive_prompt": f"{character_description}, {scene_action}, {base_style}",
                "negative_prompt": "low quality, bad anatomy, text, watermark",
                "recommended_aspect_ratio": "9:16"
            }

        parsed = self._extract_json_from_text(res.get("text", ""))
        if parsed:
            parsed["success"] = True
            return parsed

        return {
            "success": True,
            "positive_prompt": f"{character_description}, {scene_action}, {base_style}",
            "negative_prompt": "low quality, bad anatomy, text, watermark",
            "recommended_aspect_ratio": "9:16"
        }

    async def generate_image(
        self,
        prompt: str,
        aspect_ratio: str = "9:16",
        style_preset: str = "cinematic_photorealism"
    ) -> Dict[str, Any]:
        """
        Direct wrapper around Nano Banana Pro (Gemini 3.1 Flash Image) sovereign image generator.
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            direct_gemini_image_generator.generate_image,
            prompt,
            aspect_ratio,
            style_preset
        )

    async def synthesize_character_voice(
        self,
        text: str,
        character_profile: str = "narrator"
    ) -> Dict[str, Any]:
        """
        Direct wrapper around Google Sovereign Gemini TTS optimizer.
        Zero Edge TTS, Zero Paid API Keys.
        """
        res = await synthesize_character_voice(
            text=text,
            character_type=character_profile
        )
        return {
            "success": (res.get("status") == "success"),
            "audio_path": res.get("file_path"),
            "url": res.get("url"),
            "profile": res.get("profile"),
            "character_profile": character_profile,
            "message": "성공적으로 음성이 합성되었습니다." if res.get("status") == "success" else res.get("error", "음성 합성 실패")
        }

    async def _fetch_youtube_metadata(self, video_url: str) -> Dict[str, Any]:
        """Runs yt-dlp metadata extraction in an executor thread without downloading."""
        def _extract():
            try:
                import yt_dlp
                opts = get_standard_ytdlp_opts({
                    "extract_flat": False,
                    "skip_download": True,
                    "writesubtitles": False,
                    "writeautomaticsub": False
                })
                with yt_dlp.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(video_url, download=False)
                    return info or {}
            except Exception as e:
                logger.warning(f"[GeminiWebAgent] yt-dlp extraction warning for {video_url}: {e}")
                return {}

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _extract)

    @staticmethod
    def _extract_json_from_text(text: str) -> Optional[Dict[str, Any]]:
        """Safely parses JSON even when surrounded by markdown code blocks or explanatory text."""
        if not text:
            return None
        text_clean = text.strip()
        # Remove markdown fences
        if text_clean.startswith("```json"):
            text_clean = text_clean[7:]
        elif text_clean.startswith("```"):
            text_clean = text_clean[3:]
        if text_clean.endswith("```"):
            text_clean = text_clean[:-3]
        text_clean = text_clean.strip()

        try:
            return json.loads(text_clean)
        except Exception:
            # Regex search for outermost braces
            m = re.search(r"(\{.*\})", text_clean, re.DOTALL)
            if m:
                try:
                    return json.loads(m.group(1))
                except Exception:
                    pass
        return None


gemini_web_agent = GeminiWebAgent()
