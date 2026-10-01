"""
[Harness Closed-Loop Self-Evolution Engine]
Analyzes user steering directives and YouTube audience retention signals
to automatically update Channel DNA blacklists, Critic rubrics, and Preset defaults.
"""
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.database import SessionLocal
from app import models

logger = logging.getLogger("harness_evolution")

class HarnessEvolutionEngine:
    @classmethod
    def evolve_from_user_steering(cls, channel_id: int, steering_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        대표님이 대화로 지시한 수정 내역(Delta)을 분석하여 프리셋 기본값 자동 업데이트
        예: '자막 위로 올려줘', '말속도 빠르게 해줘', '노란색 대신 빨간색 강조'
        """
        results = {"applied_rules": [], "updated_fields": {}}
        with SessionLocal() as db:
            channel = db.query(models.BrandChannel).filter(models.BrandChannel.id == channel_id).first()
            if not channel:
                return results

            sig = channel.style_signature or {}
            updated = False

            for item in steering_history:
                msg = item.get("directive", "").strip()
                if not msg:
                    continue

                # 1. 자막 높이 (MarginV) 상향 조정 학습
                if "자막" in msg and any(kw in msg for kw in ["올려", "위로", "가려"]):
                    current_mv = sig.get("typography", {}).get("margin_v", 350)
                    new_mv = min(500, current_mv + 40)
                    sig.setdefault("typography", {})["margin_v"] = new_mv
                    results["applied_rules"].append(f"자막 위치 상향 (MarginV: {current_mv} -> {new_mv}px)")
                    results["updated_fields"]["margin_v"] = new_mv
                    updated = True

                # 2. 말속도 (WPM) 상향 조정 학습
                if any(kw in msg for kw in ["말속도", "호흡", "속도"]) and any(kw in msg for kw in ["빨리", "빠르게", "높여"]):
                    current_wpm = sig.get("persona", {}).get("speech_speed_wpm", 180)
                    new_wpm = min(220, current_wpm + 10)
                    sig.setdefault("persona", {})["speech_speed_wpm"] = new_wpm
                    results["applied_rules"].append(f"말속도 가속 (WPM: {current_wpm} -> {new_wpm})")
                    results["updated_fields"]["speech_speed_wpm"] = new_wpm
                    updated = True

                # 3. 쨉쨉이 간격 압축 학습
                if any(kw in msg for kw in ["쨉쨉이", "템포", "컷"]) and any(kw in msg for kw in ["빠르게", "줄여", "타이트"]):
                    current_interval = sig.get("script_branch", {}).get("pacing_jab_interval_sec", 0.8)
                    new_interval = max(0.5, round(current_interval - 0.1, 2))
                    sig.setdefault("script_branch", {})["pacing_jab_interval_sec"] = new_interval
                    results["applied_rules"].append(f"쨉쨉이 간격 압축 ({current_interval}s -> {new_interval}s)")
                    results["updated_fields"]["pacing_jab_interval_sec"] = new_interval
                    updated = True

                # 4. 금기어 자동 추가 학습
                if "금지" in msg or "쓰지마" in msg or "빼라" in msg:
                    for token in msg.split():
                        if token.endswith("은") or token.endswith("는") or token.endswith("을") or token.endswith("를"):
                            clean_token = token[:-1]
                            forbidden_list = sig.get("persona", {}).get("forbidden_words", [])
                            if clean_token not in forbidden_list and len(clean_token) >= 2:
                                forbidden_list.append(clean_token)
                                sig.setdefault("persona", {})["forbidden_words"] = forbidden_list
                                results["applied_rules"].append(f"금기어 추가 ('{clean_token}')")
                                results["updated_fields"]["forbidden_words"] = forbidden_list
                                updated = True

            if updated:
                channel.style_signature = sig
                db.commit()
                logger.info(f"🧬 [Harness Evolve] Channel #{channel_id} updated with {len(results['applied_rules'])} evolutionary rules")

        return results

    @classmethod
    def register_vault_asset(
        cls,
        channel_id: Optional[int],
        local_path: str,
        keywords: List[str],
        duration_sec: float = 0.0,
        ai_description: str = "",
        resolution: str = "1080p",
        visual_score: int = 92
    ) -> str:
        """승인된 B컷 영상을 에셋 볼트($0 재활용 라이브러리)에 등록"""
        import uuid
        asset_uid = f"vault_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}"
        with SessionLocal() as db:
            item = models.AssetVaultItem(
                asset_id=asset_uid,
                channel_id=channel_id,
                local_path=local_path,
                duration_sec=duration_sec,
                resolution=resolution,
                visual_score=visual_score,
                keywords=keywords,
                ai_description=ai_description,
                performance_rating="HIGH_RETENTION",
                created_at=datetime.now()
            )
            db.add(item)
            db.commit()
            logger.info(f"🏛️ [Asset Vault] Registered new reusable asset: '{asset_uid}' ({local_path})")
            return asset_uid
