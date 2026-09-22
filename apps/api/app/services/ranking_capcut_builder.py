"""
ViraLoop Studio - 랭킹형 쇼츠 (Ranking Shorts) CapCut 초안 프로젝트 빌더
픽셀링 원천 규격 및 NLE 32대 커맨드 매트릭스 1:1 반영
8계층 분리 레이어 스택 (마이크로초 정밀 타임코드 연산)
"""

import os
import json
import uuid
import time
import math
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

def to_capcut_coord(x_pct: float = 50.0, y_pct: float = 50.0):
    """0~100% 좌표를 CapCut의 -1.0 ~ 1.0 정규화 좌표계로 변환"""
    tx = round((x_pct - 50.0) / 50.0, 4)
    ty = round((50.0 - y_pct) / 50.0, 4)
    return tx, ty

def hex_to_rgb01(hex_str: Optional[str], default_rgb=(1.0, 1.0, 1.0)):
    """16진수 색상 코드를 0.0 ~ 1.0 RGB 배열로 변환"""
    if not hex_str or not isinstance(hex_str, str) or not hex_str.startswith('#') or len(hex_str) < 7:
        return default_rgb
    try:
        r = round(int(hex_str[1:3], 16) / 255.0, 3)
        g = round(int(hex_str[3:5], 16) / 255.0, 3)
        b = round(int(hex_str[5:7], 16) / 255.0, 3)
        return [r, g, b]
    except Exception:
        return default_rgb

def build_ranking_capcut_draft(
    payload: Dict[str, Any],
    project_title: Optional[str] = None
) -> Dict[str, Any]:
    """
    랭킹형 쇼츠용 CapCut 초안 draft_content.json 파일 생성
    """
    local_app_data = os.environ.get('LOCALAPPDATA', '')
    base_capcut_dir = os.path.join(local_app_data, 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft')
    os.makedirs(base_capcut_dir, exist_ok=True)

    title_safe = (project_title or payload.get('headline') or 'Ranking_Shorts').strip().replace(' ', '_')
    timestamp_str = time.strftime('%Y%m%d_%H%M%S')
    project_folder_name = f"VL_Ranking_{timestamp_str}_{title_safe[:24]}"
    project_dir = os.path.join(base_capcut_dir, project_folder_name)
    os.makedirs(project_dir, exist_ok=True)

    draft_id = str(uuid.uuid4())
    materials: Dict[str, List[Any]] = {
        "videos": [],
        "audios": [],
        "texts": [],
        "canvases": [],
        "transitions": [],
        "effects": [],
        "speeds": []
    }
    tracks: List[Dict[str, Any]] = []

    # 트랙 정의
    # 0: Background Video Track (Blur)
    # 1: Main Video Track (Foreground)
    # 2: Sound Effect (SFX) Track
    # 3: Background Music (BGM) Track
    # 4: Header Ribbon Box Track
    # 5: Header Headline / Subtitle Track
    # 6: Rank Badge Track
    # 7: Subtitle / Caption Track

    track_bg_video = {"id": str(uuid.uuid4()), "type": "video", "segments": [], "attribute": 0, "flag": 0}
    track_main_video = {"id": str(uuid.uuid4()), "type": "video", "segments": [], "attribute": 0, "flag": 0}
    track_sfx = {"id": str(uuid.uuid4()), "type": "audio", "segments": [], "attribute": 0, "flag": 0}
    track_bgm = {"id": str(uuid.uuid4()), "type": "audio", "segments": [], "attribute": 0, "flag": 0}
    track_header_box = {"id": str(uuid.uuid4()), "type": "text", "segments": [], "attribute": 0, "flag": 0}
    track_header_title = {"id": str(uuid.uuid4()), "type": "text", "segments": [], "attribute": 0, "flag": 0}
    track_rank_badge = {"id": str(uuid.uuid4()), "type": "text", "segments": [], "attribute": 0, "flag": 0}
    track_caption = {"id": str(uuid.uuid4()), "type": "text", "segments": [], "attribute": 0, "flag": 0}

    items = payload.get('items', [])
    options = payload.get('options', {})
    headline = payload.get('headline') or payload.get('rankingTopic') or "역대급 랭킹 TOP 5"
    subtitle = payload.get('subtitle') or "ViraLoop Ranking Special"
    order = options.get('order', 'reverse')

    # 순서 정렬 (reverse: 5위 -> 1위 카운트다운 피날레)
    sorted_items = sorted(items, key=lambda x: x.get('rank', 1), reverse=(order == 'reverse'))

    current_timeline_us = 0
    blackout_us = int(options.get('transitionBlackoutMs', 150)) * 1000  # 마이크로초
    sfx_offset_us = int(options.get('transitionSoundOffsetMs', 160)) * 1000

    source_video_path = payload.get('sourceVideoPath') or ''

    for idx, item in enumerate(sorted_items):
        rank = item.get('rank', idx + 1)
        item_title = item.get('title', f"{rank}위")
        item_desc = item.get('description', '')
        item_stat = item.get('statValue', '')
        hook_jab = item.get('hookJabText') or f"TOP {rank}"

        clip_duration_us = int(item.get('durationMs', 4500)) * 1000
        start_offset_us = int(item.get('startMs', 0)) * 1000
        clip_source_path = item.get('sourceUrl') or source_video_path

        # 1. 비디오 세그먼트 생성
        if clip_source_path and os.path.exists(clip_source_path):
            video_mat_id = str(uuid.uuid4())
            materials["videos"].append({
                "id": video_mat_id,
                "path": clip_source_path,
                "type": "video",
                "duration": clip_duration_us + start_offset_us
            })

            # 메인 비디오 세그먼트
            seg_main_id = str(uuid.uuid4())
            track_main_video["segments"].append({
                "id": seg_main_id,
                "material_id": video_mat_id,
                "target_timerange": {"start": current_timeline_us, "duration": clip_duration_us},
                "source_timerange": {"start": start_offset_us, "duration": clip_duration_us},
                "clip": {
                    "scale": {"x": 1.0, "y": 1.0},
                    "transform": {"x": 0.0, "y": 0.0}
                }
            })

            # 배경 비디오 세그먼트 (스케일 업 + 블러용)
            seg_bg_id = str(uuid.uuid4())
            track_bg_video["segments"].append({
                "id": seg_bg_id,
                "material_id": video_mat_id,
                "target_timerange": {"start": current_timeline_us, "duration": clip_duration_us},
                "source_timerange": {"start": start_offset_us, "duration": clip_duration_us},
                "clip": {
                    "scale": {"x": 1.6, "y": 1.6},
                    "transform": {"x": 0.0, "y": 0.0}
                }
            })

        # 2. 순위 전환 효과음 (SFX)
        if options.get('transitionSound', True):
            sfx_mat_id = str(uuid.uuid4())
            sfx_name = options.get('transitionSoundStyle', 'impact')
            sfx_start_us = max(0, current_timeline_us + sfx_offset_us)
            sfx_duration_us = 1200000  # 1.2s

            materials["audios"].append({
                "id": sfx_mat_id,
                "name": f"sfx_{sfx_name}",
                "type": "sfx",
                "duration": sfx_duration_us
            })
            track_sfx["segments"].append({
                "id": str(uuid.uuid4()),
                "material_id": sfx_mat_id,
                "target_timerange": {"start": sfx_start_us, "duration": sfx_duration_us},
                "source_timerange": {"start": 0, "duration": sfx_duration_us}
            })

        # 3. 상단 헤더 타이틀 텍스트
        title_mat_id = str(uuid.uuid4())
        materials["texts"].append({
            "id": title_mat_id,
            "content": f"{headline}\n{subtitle}",
            "font_size": 24,
            "text_color": hex_to_rgb01(options.get('headlineColor', '#FFE45C')),
            "align_type": 1,
            "style": {"bold": True}
        })
        tx, ty = to_capcut_coord(50.0, 10.0) # 상단 10% 위치
        track_header_title["segments"].append({
            "id": str(uuid.uuid4()),
            "material_id": title_mat_id,
            "target_timerange": {"start": current_timeline_us, "duration": clip_duration_us},
            "clip": {"transform": {"x": tx, "y": ty}}
        })

        # 4. 순위 뱃지 텍스트 (예: TOP 5 또는 5위)
        badge_mat_id = str(uuid.uuid4())
        badge_text = f"🏆 TOP {rank}" if rank == 1 else f"TOP {rank}"
        materials["texts"].append({
            "id": badge_mat_id,
            "content": badge_text,
            "font_size": 32,
            "text_color": hex_to_rgb01(options.get('accentColor', '#FF3D71')),
            "align_type": 1,
            "style": {"bold": True}
        })
        bx, by = to_capcut_coord(50.0, 22.0) # 상단 22% 위치
        track_rank_badge["segments"].append({
            "id": str(uuid.uuid4()),
            "material_id": badge_mat_id,
            "target_timerange": {"start": current_timeline_us, "duration": clip_duration_us},
            "clip": {"transform": {"x": bx, "y": by}}
        })

        # 5. 본문 설명 자막 텍스트
        caption_mat_id = str(uuid.uuid4())
        caption_full = f"{item_title} ({item_stat})\n{item_desc}"
        materials["texts"].append({
            "id": caption_mat_id,
            "content": caption_full,
            "font_size": 22,
            "text_color": [1.0, 1.0, 1.0],
            "align_type": 1,
            "style": {"bold": True}
        })
        cx, cy = to_capcut_coord(50.0, 82.0) # 하단 82% 위치
        track_caption["segments"].append({
            "id": str(uuid.uuid4()),
            "material_id": caption_mat_id,
            "target_timerange": {"start": current_timeline_us, "duration": clip_duration_us},
            "clip": {"transform": {"x": cx, "y": cy}}
        })

        # 다음 클립 타임라인 위치 (검은 화면 암전 시간 가산)
        current_timeline_us += clip_duration_us + blackout_us

    # 트랙 조립
    tracks.extend([
        track_bg_video,
        track_main_video,
        track_sfx,
        track_bgm,
        track_header_box,
        track_header_title,
        track_rank_badge,
        track_caption
    ])

    draft_content = {
        "id": draft_id,
        "name": project_folder_name,
        "fps": 30.0,
        "duration": current_timeline_us,
        "canvas_config": {"width": 1080, "height": 1920, "ratio": "9:16"},
        "materials": materials,
        "tracks": tracks
    }

    draft_path = os.path.join(project_dir, 'draft_content.json')
    with open(draft_path, 'w', encoding='utf-8') as f:
        json.dump(draft_content, f, ensure_ascii=False, indent=2)

    logger.info(f"✅ [Ranking CapCut Builder] Draft created at {draft_path} (Duration: {current_timeline_us / 1000000:.2f}s)")

    return {
        "success": True,
        "projectDir": project_dir,
        "draftPath": draft_path,
        "durationSec": current_timeline_us / 1000000,
        "itemCount": len(sorted_items)
    }
