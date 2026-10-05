"""
Director Scout & Trend Intelligence Service Component.
Handles official YouTube charts retrieval, candidate video sourcing, and table data restoration.
"""

import sys
import logging
from typing import Dict, Any, List, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

logger = logging.getLogger("director_scout_service")

class DirectorScoutService:
    """Modular controller for YouTube trending intelligence and chart table restoration."""

    @staticmethod
    def is_planning_query(prompt: str) -> bool:
        clean_p = prompt.strip().lower()
        return any(k in clean_p for k in [
            "추천", "아이돌", "순위", "트래픽", "조회수", "유튜브에서", 
            "많이 나올", "10", "top", "인기", "트렌드", "차트"
        ])

    @staticmethod
    def gather_trend_context() -> tuple[List[Dict[str, Any]], List[Dict[str, Any]], str]:
        """Fetches YouTube KR Official Weekly Charts and verified shorts candidate cards."""
        chart_items = []
        shorts_candidates = []
        context_str = ""

        try:
            from app.services.youtube_charts_service import YouTubeChartsService
            trend_data = YouTubeChartsService.fetch_deep_trend_lake()
            if trend_data and "weekly_top_artists" in trend_data:
                chart_items = trend_data["weekly_top_artists"]
            if trend_data and "actual_shorts_candidates" in trend_data:
                shorts_candidates = trend_data["actual_shorts_candidates"]
            if trend_data and "raw_text_summary" in trend_data:
                context_str = trend_data["raw_text_summary"]
        except Exception as e:
            logger.warning(f"⚠️ [DirectorScoutService] Error gathering trend lake: {e}")

        return chart_items, shorts_candidates, context_str

    @staticmethod
    def restore_chart_table_if_needed(
        content: str,
        chart_items: List[Dict[str, Any]],
        shorts_candidates: List[Dict[str, Any]]
    ) -> str:
        """Ensures that the output contains the complete and authentic YouTube KR chart table."""
        if not content or not chart_items:
            return content

        # Check if table headers exist
        if "|" in content and "순위" in content and "트래픽" in content:
            # Check how many rank entries exist
            rank_rows = [line for line in content.split("\n") if line.strip().startswith("|") and any(f"| {i} " in line or f"|{i}|" in line for i in range(1, 11))]
            if len(rank_rows) >= 7:
                return content  # Already comprehensive

        # Build authentic markdown table from verified chart items
        shorts_map = {}
        for c in shorts_candidates:
            if isinstance(c, dict) and c.get("title") and c.get("video_url"):
                shorts_map[c["title"]] = c

        table_lines = [
            "\n\n### 📊 YouTube KR 공식 주간 차트 실측 Top 10\n",
            "| 순위 | 대상/아티스트 | 트래픽 핵심 동인 | 관련 쇼츠 영상 레퍼런스 (조회수, URL) | 3초 후킹 및 쇼츠 연출 제언 |",
            "| :--- | :--- | :--- | :--- | :--- |"
        ]

        for item in chart_items[:10]:
            r = item.get("rank", "-")
            name = item.get("artist", "")
            views = item.get("views_str", "")
            driver = item.get("key_driver", "글로벌 스트리밍 및 챌린지 급상승")
            hook = item.get("hook_suggestion", "3초 내 시그니처 안무 드롭 연출")

            cand = shorts_map.get(name) or next((c for c in shorts_candidates if name.lower() in c.get("title", "").lower() or name.lower() in c.get("channel_name", "").lower()), None)
            if cand:
                s_title = cand.get("title", f"{name} Shorts")
                s_url = cand.get("video_url", "https://youtube.com/shorts/")
                s_views = cand.get("view_count_str", views)
                ref_str = f"[{s_title} ({s_views})]({s_url})"
            else:
                ref_str = f"공식 활동 트래픽 ({views})"

            table_lines.append(f"| {r} | **{name}** | {driver} | {ref_str} | {hook} |")

        return content + "\n" + "\n".join(table_lines) + "\n"
