import os
import json
import uuid
import time
import shutil
import sqlite3
import subprocess
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

def to_capcut_coord(x_pct: float = 50.0, y_pct: float = 50.0):
    tx = round((x_pct - 50.0) / 50.0, 4)
    ty = round((50.0 - y_pct) / 50.0, 4)
    return tx, ty

def hex_to_rgb01(hex_str: Optional[str], default_rgb=(1.0, 1.0, 1.0)):
    if not hex_str or not isinstance(hex_str, str) or not hex_str.startswith('#') or len(hex_str) < 7:
        return default_rgb
    try:
        r = round(int(hex_str[1:3], 16) / 255.0, 3)
        g = round(int(hex_str[3:5], 16) / 255.0, 3)
        b = round(int(hex_str[5:7], 16) / 255.0, 3)
        return [r, g, b]
    except Exception:
        return default_rgb

def get_db_template(template_id: str = 'master_classic') -> Dict[str, Any]:
    local_app_data = os.environ.get('LOCALAPPDATA', '')
    db_path = os.path.join(local_app_data, 'ViraLoop Studio', 'viral_loop.db')
    if not os.path.exists(db_path):
        return {}
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute('SELECT layout FROM shorts_templates WHERE id = ?', (template_id,))
        row = cur.fetchone()
        if row and row[0]:
            conn.close()
            return json.loads(row[0])
        cur.execute("SELECT layout FROM shorts_templates WHERE archetype = 'classic' ORDER BY is_system DESC LIMIT 1")
        row = cur.fetchone()
        conn.close()
        if row and row[0]:
            return json.loads(row[0])
    except Exception as e:
        logger.warning(f'[CapCut Assembler] DB Template load error: {e}')
    return {}

def assemble_capcut_project(
    props_path: Optional[str] = None,
    raw_props: Optional[Dict[str, Any]] = None,
    template_id: str = 'master_classic',
    project_name: Optional[str] = None,
    open_after: bool = False
) -> Dict[str, Any]:
    local_app_data = os.environ.get('LOCALAPPDATA', '')
    base_path = os.path.join(local_app_data, 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft')
    os.makedirs(base_path, exist_ok=True)

    props = raw_props or {}
    if not props and props_path and os.path.exists(props_path):
        with open(props_path, 'r', encoding='utf-8') as f:
            props = json.load(f)
    elif not props:
        exports_dir = os.path.join(local_app_data, 'ViraLoop Studio', 'media', '05_Exports')
        if os.path.exists(exports_dir):
            import glob
            pfiles = glob.glob(os.path.join(exports_dir, '*_props.json'))
            if pfiles:
                pfiles.sort(key=os.path.getmtime, reverse=True)
                props_path = pfiles[0]
                with open(props_path, 'r', encoding='utf-8') as f:
                    props = json.load(f)

    tpl = get_db_template(template_id)

    numbers = []
    for entry in os.listdir(base_path):
        if entry.isdigit() and os.path.isdir(os.path.join(base_path, entry)):
            numbers.append(int(entry))
    recycle_path = os.path.join(base_path, '.recycle_bin')
    if os.path.exists(recycle_path):
        for entry in os.listdir(recycle_path):
            if entry.isdigit() and os.path.isdir(os.path.join(recycle_path, entry)):
                numbers.append(int(entry))

    next_num = (max(numbers) + 1) if numbers else 101
    folder_name = f'{next_num:04d}'
    draft_folder = os.path.join(base_path, folder_name)
    os.makedirs(draft_folder, exist_ok=True)

    # Standard CapCut subfolders
    resources_dir = os.path.join(draft_folder, 'Resources')
    os.makedirs(resources_dir, exist_ok=True)
    subfolders = [
        'adjust_mask', 'common_attachment', 'matting', 'qr_upload',
        'Resources/audioAlg', 'Resources/digitalHuman', 'Resources/videoAlg',
        'smart_crop', 'subdraft', 'Thumbnail'
    ]
    for sub in subfolders:
        os.makedirs(os.path.join(draft_folder, sub), exist_ok=True)

    norm_base = base_path.replace('\\', '/')
    norm_fold = draft_folder.replace('\\', '/')

    subtitles = props.get('subtitles', [])
    total_duration_ms = 18500
    if subtitles:
        max_end = max(s.get('endMs', 0) for s in subtitles)
        if max_end > 0:
            total_duration_ms = max_end
    total_duration_us = int(total_duration_ms * 1000)

    audio_source = props.get('audioSource', '')
    video_source = props.get('rawVideoSource') or props.get('cleanVideoSource') or props.get('videoSource', '')
    
    # 번인된 _short.mp4가 비디오 소스로 들어올 경우, 텍스트가 2중 중복되는 유령 오버레이를 원천 방지
    if video_source and video_source.endswith('_short.mp4'):
        clean_candidate = video_source.replace('_short.mp4', '_clean.mp4')
        if os.path.exists(clean_candidate):
            video_source = clean_candidate
        else:
            logger.info('[CapCut Assembler] video_source has burned text (_short.mp4). Will generate clean background canvas.')
            video_source = ''

    import urllib.parse
    if audio_source and 'path=' in audio_source:
        parsed = urllib.parse.urlparse(audio_source)
        qs = urllib.parse.parse_qs(parsed.query)
        if 'path' in qs and qs['path']:
            audio_source = urllib.parse.unquote(qs['path'][0])

    dest_audio_name = 'audio_narration.mp3'
    dest_video_name = 'video_background.mp4'
    dest_audio_path = os.path.join(resources_dir, dest_audio_name)
    dest_video_path = os.path.join(resources_dir, dest_video_name)

    has_audio = False
    if audio_source and os.path.exists(audio_source):
        shutil.copy2(audio_source, dest_audio_path)
        has_audio = True

    has_video = False
    if video_source and os.path.exists(video_source):
        shutil.copy2(video_source, dest_video_path)
        has_video = True
    else:
        # Check if sample video exists in official media directories
        official_sample_candidates = [
            os.path.join(local_app_data, 'ViraLoop Studio', 'media', '02_Operations', 'subtitles', 'job_43', 'a08b6ad4de.mp4'),
            os.path.join(local_app_data, 'ViraLoop Studio', 'media', '07_Downloads', 'a08b6ad4de.mp4'),
            os.path.join(os.path.dirname(__file__), '..', 'legacy_ddalkkak', 'data', 'subtitles', 'job_43', 'a08b6ad4de.mp4'),
        ]
        found_sample = next((p for p in official_sample_candidates if os.path.exists(p)), None)
        if found_sample:
            shutil.copy2(found_sample, dest_video_path)
            has_video = True
            logger.info(f'[CapCut Assembler] Injected sample video: {found_sample}')
        else:
            # 클린 1080x1920 세로 샌드위치 캔버스 자동 생성 (텍스트 2중 번인 0% 격리)
            dur_sec = max(3.0, total_duration_ms / 1000.0)
            try:
                subprocess.run([
                    'ffmpeg', '-y', '-f', 'lavfi',
                    '-i', f'color=c=0x0a0a0f:s=1080x1920:d={dur_sec}:r=30',
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                    dest_video_path
                ], capture_output=True, check=True)
                has_video = True
            except Exception as ve:
                logger.warning(f'[CapCut Assembler] Clean canvas generation fallback: {ve}')

    if has_video and os.path.exists(dest_video_path):
        try:
            cover_dest = os.path.join(draft_folder, 'draft_cover.jpg')
            subprocess.run(['ffmpeg', '-y', '-ss', '00:00:01', '-i', dest_video_path, '-vframes', '1', cover_dest],
                           capture_output=True, check=False)
        except Exception as ce:
            logger.warning(f'[CapCut Assembler] draft_cover extraction failed: {ce}')

    draft_id = str(uuid.uuid4()).upper()

    materials = {
        'videos': [], 'audios': [], 'texts': [], 'speeds': [],
        'canvases': [], 'transitions': [], 'sound_channel_mappings': [], 'beats': []
    }
    tracks = []

    # 샌드위치 핏 계산: 상단 바와 하단 바 사이 정중앙에 V1 비디오 배치
    has_top_bar = tpl.get('hasTopBarBg', True)
    top_bar_h_pct = float(tpl.get('topBarHeightPct', 18.3))
    has_bot_bar = tpl.get('hasBottomBarBg', True)
    bot_bar_h_pct = float(tpl.get('bottomBarHeightPct', 11.0))
    sandwich_h_pct = 100.0 - (top_bar_h_pct if has_top_bar else 0.0) - (bot_bar_h_pct if has_bot_bar else 0.0)
    center_y_pct = (top_bar_h_pct if has_top_bar else 0.0) + (sandwich_h_pct / 2.0)
    v_tx, v_ty = to_capcut_coord(50.0, center_y_pct)

    if has_video:
        v_mat_id = str(uuid.uuid4()).upper()
        v_seg_id = str(uuid.uuid4()).upper()
        v_trk_id = str(uuid.uuid4()).upper()
        v_speed_id = str(uuid.uuid4()).upper()
        v_canvas_id = str(uuid.uuid4()).upper()

        materials['speeds'].append({'id': v_speed_id, 'mode': 0, 'speed': 1.0, 'type': 'speed'})
        materials['canvases'].append({'id': v_canvas_id, 'type': 'canvas_color', 'color': ''})
        materials['videos'].append({
            'id': v_mat_id,
            'type': 'video',
            'path': f'{norm_fold}/Resources/{dest_video_name}',
            'file_Path': f'{norm_fold}/Resources/{dest_video_name}',
            'name': dest_video_name,
            'material_name': dest_video_name,
            'duration': total_duration_us,
            'video_duration': total_duration_us,
            'width': 1080,
            'height': 1920,
            'has_audio': True,
            'metetype': 'photo_to_video',
            'roughcut_time_range': {'duration': total_duration_us, 'start': 0}
        })
        tracks.append({
            'id': v_trk_id, 'type': 'video', 'attribute': 0, 'flag': 0, 'name': 'V1 Background Video',
            'segments': [{
                'id': v_seg_id, 'type': 'video', 'material_id': v_mat_id,
                'target_timerange': {'duration': total_duration_us, 'start': 0},
                'source_timerange': {'duration': total_duration_us, 'start': 0},
                'speed': 1.0, 'volume': 1.0,
                'extra_material_refs': [v_speed_id, v_canvas_id],
                'render_index': 0,
                'clip': {'alpha': 1.0, 'flip': {'horizontal': False, 'vertical': False}, 'rotation': 0.0, 'scale': {'x': 1.0, 'y': 1.0}, 'transform': {'x': v_tx, 'y': v_ty}}
            }]
        })

        # ⬛ 상단 검은색 바 오버레이 트랙 (render_index: 1000)
        from PIL import Image
        if has_top_bar and top_bar_h_pct > 0:
            top_h_px = max(10, int(round(1920 * (top_bar_h_pct / 100.0))))
            top_bar_img_path = os.path.join(resources_dir, 'top_black_bar.png')
            Image.new('RGB', (1080, top_h_px), (0, 0, 0)).save(top_bar_img_path)

            top_b_mat_id = str(uuid.uuid4()).upper()
            top_b_seg_id = str(uuid.uuid4()).upper()
            top_b_trk_id = str(uuid.uuid4()).upper()

            materials['videos'].append({
                'id': top_b_mat_id, 'type': 'video',
                'path': f'{norm_fold}/Resources/top_black_bar.png',
                'file_Path': f'{norm_fold}/Resources/top_black_bar.png',
                'name': 'top_black_bar.png', 'material_name': 'top_black_bar.png',
                'duration': total_duration_us, 'video_duration': total_duration_us,
                'width': 1080, 'height': top_h_px, 'has_audio': False, 'metetype': 'photo_to_video',
                'roughcut_time_range': {'duration': total_duration_us, 'start': 0}
            })
            tx_tb, ty_tb = to_capcut_coord(50.0, top_bar_h_pct / 2.0)
            tracks.append({
                'id': top_b_trk_id, 'type': 'video', 'attribute': 0, 'flag': 0, 'name': f'V2 Top Black Bar ({top_bar_h_pct}%)',
                'segments': [{
                    'id': top_b_seg_id, 'type': 'video', 'material_id': top_b_mat_id,
                    'target_timerange': {'duration': total_duration_us, 'start': 0},
                    'source_timerange': {'duration': total_duration_us, 'start': 0},
                    'speed': 1.0, 'volume': 0.0,
                    'render_index': 1000,
                    'clip': {'alpha': 1.0, 'flip': {'horizontal': False, 'vertical': False}, 'rotation': 0.0, 'scale': {'x': 1.0, 'y': 1.0}, 'transform': {'x': tx_tb, 'y': ty_tb}}
                }]
            })

        # ⬛ 하단 검은색 바 오버레이 트랙 (render_index: 1001)
        if has_bot_bar and bot_bar_h_pct > 0:
            bot_h_px = max(10, int(round(1920 * (bot_bar_h_pct / 100.0))))
            bot_bar_img_path = os.path.join(resources_dir, 'bottom_black_bar.png')
            Image.new('RGB', (1080, bot_h_px), (0, 0, 0)).save(bot_bar_img_path)

            bot_b_mat_id = str(uuid.uuid4()).upper()
            bot_b_seg_id = str(uuid.uuid4()).upper()
            bot_b_trk_id = str(uuid.uuid4()).upper()

            materials['videos'].append({
                'id': bot_b_mat_id, 'type': 'video',
                'path': f'{norm_fold}/Resources/bottom_black_bar.png',
                'file_Path': f'{norm_fold}/Resources/bottom_black_bar.png',
                'name': 'bottom_black_bar.png', 'material_name': 'bottom_black_bar.png',
                'duration': total_duration_us, 'video_duration': total_duration_us,
                'width': 1080, 'height': bot_h_px, 'has_audio': False, 'metetype': 'photo_to_video',
                'roughcut_time_range': {'duration': total_duration_us, 'start': 0}
            })
            tx_bb, ty_bb = to_capcut_coord(50.0, 100.0 - (bot_bar_h_pct / 2.0))
            tracks.append({
                'id': bot_b_trk_id, 'type': 'video', 'attribute': 0, 'flag': 0, 'name': f'V3 Bottom Black Bar ({bot_bar_h_pct}%)',
                'segments': [{
                    'id': bot_b_seg_id, 'type': 'video', 'material_id': bot_b_mat_id,
                    'target_timerange': {'duration': total_duration_us, 'start': 0},
                    'source_timerange': {'duration': total_duration_us, 'start': 0},
                    'speed': 1.0, 'volume': 0.0,
                    'render_index': 1001,
                    'clip': {'alpha': 1.0, 'flip': {'horizontal': False, 'vertical': False}, 'rotation': 0.0, 'scale': {'x': 1.0, 'y': 1.0}, 'transform': {'x': tx_bb, 'y': ty_bb}}
                }]
            })

    if has_audio:
        a_mat_id = str(uuid.uuid4()).upper()
        a_seg_id = str(uuid.uuid4()).upper()
        a_trk_id = str(uuid.uuid4()).upper()

        materials['audios'].append({
            'id': a_mat_id, 'type': 'extract_music',
            'path': f'{norm_fold}/Resources/{dest_audio_name}',
            'file_Path': f'{norm_fold}/Resources/{dest_audio_name}',
            'name': dest_audio_name, 'material_name': dest_audio_name, 'duration': total_duration_us
        })
        tracks.append({
            'id': a_trk_id, 'type': 'audio', 'attribute': 0, 'flag': 0, 'name': 'A1 TTS Narration',
            'segments': [{
                'id': a_seg_id, 'type': 'audio', 'material_id': a_mat_id,
                'target_timerange': {'duration': total_duration_us, 'start': 0},
                'source_timerange': {'duration': total_duration_us, 'start': 0},
                'volume': 1.0
            }]
        })

    # 🔴 템플릿 상단 [속보] 배지
    has_title_badge = tpl.get('hasTitleBadge', True)
    badge_text = tpl.get('titleBadgeText', '속보')
    badge_bg = tpl.get('titleBadgeBg', '#EF4444')
    badge_color = tpl.get('titleBadgeColor', '#FFFFFF')
    # CapCut 표준 스케일: 4.8pt
    badge_size = 4.8

    if has_title_badge and badge_text:
        b_mat_id = str(uuid.uuid4()).upper()
        b_seg_id = str(uuid.uuid4()).upper()
        b_trk_id = str(uuid.uuid4()).upper()

        badge_content = json.dumps({
            'text': badge_text,
            'styles': [{
                'fill': {'content': {'render_type': 'solid', 'solid': {'color': hex_to_rgb01(badge_color)}}},
                'size': badge_size, 'bold': True, 'useLetterColor': True, 'range': [0, len(badge_text)]
            }]
        }, ensure_ascii=False)

        materials['texts'].append({
            'id': b_mat_id, 'type': 'text', 'name': 'Top Badge', 'content': badge_content,
            'font_name': 'Pretendard', 'font_title': 'Pretendard', 'font_size': badge_size, 'alignment': 1,
            'background_style': 1, 'background_color': badge_bg, 'background_alpha': 1.0,
            'background_round_radius': 0.3, 'background_width': 0.25, 'background_height': 0.2,
            'background_fill': badge_bg, 'background_vertical_offset': 0.0, 'background_horizontal_offset': 0.0,
            'border_color': '#000000', 'border_width': 0.0, 'border_mode': 1, 'border_alpha': 0.0,
            'text_color': '#FFFFFF', 'text_alpha': 1.0
        })
        tx, ty = to_capcut_coord(50.0, 7.0)
        tracks.append({
            'id': b_trk_id, 'type': 'text', 'name': 'T0 Breaking Badge',
            'segments': [{
                'id': b_seg_id, 'type': 'text', 'material_id': b_mat_id,
                'target_timerange': {'duration': total_duration_us, 'start': 0},
                'render_index': 5500,
                'clip': {'scale': {'x': 1.0, 'y': 1.0}, 'transform': {'x': tx, 'y': ty}, 'rotation': 0.0},
                'extra_material_refs': [b_mat_id]
            }]
        })

    # 🌟 템플릿 상단 2단 헤드라인
    title_line1 = props.get('titleLine1') or tpl.get('titleLine1') or '조코비치 몰래카메라 ㅋㅋ'
    title_line2 = props.get('titleLine2') or tpl.get('titleLine2') or '상대 선수 멘붕 직전'
    line1_color = tpl.get('titleLine1Color') or '#FFFFFF'
    line2_color = tpl.get('titleLine2Color') or '#FFE500'
    # CapCut 표준 스케일: 1줄 7.8pt, 2줄 9.0pt
    line1_size = 7.8
    line2_size = 9.0

    if title_line1:
        t1_mat_id = str(uuid.uuid4()).upper()
        t1_seg_id = str(uuid.uuid4()).upper()
        t1_trk_id = str(uuid.uuid4()).upper()
        t1_content = json.dumps({
            'text': title_line1,
            'styles': [{'fill': {'content': {'render_type': 'solid', 'solid': {'color': hex_to_rgb01(line1_color)}}}, 'size': line1_size, 'bold': True, 'useLetterColor': True, 'range': [0, len(title_line1)]}]
        }, ensure_ascii=False)
        materials['texts'].append({
            'id': t1_mat_id, 'type': 'subtitle', 'name': 'Title Line 1', 'content': t1_content,
            'font_name': 'Pretendard', 'font_size': line1_size, 'alignment': 1,
            'border_color': '#000000', 'border_width': 0.15, 'border_mode': 1, 'border_alpha': 1.0,
            'shadow_color': 'rgba(0,0,0,0.9)', 'shadow_alpha': 0.8, 'shadow_distance': 4.0
        })
        tx1, ty1 = to_capcut_coord(50.0, 11.5)
        tracks.append({
            'id': t1_trk_id, 'type': 'text', 'name': 'T1 Title Line 1 (White)',
            'segments': [{
                'id': t1_seg_id, 'type': 'text', 'material_id': t1_mat_id,
                'target_timerange': {'duration': total_duration_us, 'start': 0},
                'render_index': 5001,
                'clip': {'scale': {'x': 1.0, 'y': 1.0}, 'transform': {'x': tx1, 'y': ty1}, 'rotation': 0.0},
                'extra_material_refs': [t1_mat_id]
            }]
        })

    if title_line2:
        t2_mat_id = str(uuid.uuid4()).upper()
        t2_seg_id = str(uuid.uuid4()).upper()
        t2_trk_id = str(uuid.uuid4()).upper()
        t2_content = json.dumps({
            'text': title_line2,
            'styles': [{'fill': {'content': {'render_type': 'solid', 'solid': {'color': hex_to_rgb01(line2_color)}}}, 'size': line2_size, 'bold': True, 'useLetterColor': True, 'range': [0, len(title_line2)]}]
        }, ensure_ascii=False)
        materials['texts'].append({
            'id': t2_mat_id, 'type': 'subtitle', 'name': 'Title Line 2', 'content': t2_content,
            'font_name': 'Pretendard', 'font_size': line2_size, 'alignment': 1,
            'border_color': '#000000', 'border_width': 0.15, 'border_mode': 1, 'border_alpha': 1.0,
            'shadow_color': 'rgba(0,0,0,0.9)', 'shadow_alpha': 0.8, 'shadow_distance': 4.0
        })
        tx2, ty2 = to_capcut_coord(50.0, 15.8)
        tracks.append({
            'id': t2_trk_id, 'type': 'text', 'name': f'T2 Title Line 2 ({line2_color})',
            'segments': [{
                'id': t2_seg_id, 'type': 'text', 'material_id': t2_mat_id,
                'target_timerange': {'duration': total_duration_us, 'start': 0},
                'render_index': 5002,
                'clip': {'scale': {'x': 1.0, 'y': 1.0}, 'transform': {'x': tx2, 'y': ty2}, 'rotation': 0.0},
                'extra_material_refs': [t2_mat_id]
            }]
        })

    # ⚡ 템플릿 쨉쨉이 훅
    has_jab = tpl.get('hasJab', True)
    jab_text = props.get('jabHookText') or tpl.get('jabText') or '*출격작전 반전 순간!*'
    jab_color = tpl.get('jabTextColor', '#FFE500')
    jab_tilt = float(tpl.get('jabTiltDeg', -3.0))
    # CapCut 표준 스케일: 6.5pt
    jab_size = 6.5

    if has_jab and jab_text:
        j_mat_id = str(uuid.uuid4()).upper()
        j_seg_id = str(uuid.uuid4()).upper()
        j_trk_id = str(uuid.uuid4()).upper()
        j_content = json.dumps({
            'text': jab_text,
            'styles': [{'fill': {'content': {'render_type': 'solid', 'solid': {'color': hex_to_rgb01(jab_color)}}}, 'size': jab_size, 'bold': True, 'useLetterColor': True, 'range': [0, len(jab_text)]}]
        }, ensure_ascii=False)
        materials['texts'].append({
            'id': j_mat_id, 'type': 'text', 'name': 'Jab Hook', 'content': j_content,
            'font_name': 'GmarketSans', 'font_title': 'GmarketSans', 'font_size': jab_size, 'alignment': 1,
            'background_style': 1, 'background_color': '#000000', 'background_alpha': 0.88,
            'background_round_radius': 0.25, 'background_width': 0.25, 'background_height': 0.2,
            'background_fill': '#000000', 'background_vertical_offset': 0.0, 'background_horizontal_offset': 0.0,
            'border_color': '#FFFFFF', 'border_width': 0.12, 'border_mode': 1, 'border_alpha': 1.0,
            'shadow_color': 'rgba(0,0,0,0.8)', 'shadow_alpha': 0.75, 'shadow_distance': 3.0
        })
        j_start_us = int(2500 * 1000)
        j_dur_us = int(4500 * 1000)
        jx, jy = to_capcut_coord(50.0, 30.0)
        tracks.append({
            'id': j_trk_id, 'type': 'text', 'name': f'T3 Jab Hook ({jab_tilt}° Tilt)',
            'segments': [{
                'id': j_seg_id, 'type': 'text', 'material_id': j_mat_id,
                'target_timerange': {'duration': j_dur_us, 'start': j_start_us},
                'render_index': 4500,
                'clip': {'scale': {'x': 1.0, 'y': 1.0}, 'transform': {'x': jx, 'y': jy}, 'rotation': jab_tilt},
                'extra_material_refs': [j_mat_id]
            }]
        })

    # 💬 템플릿 타임코드 싱크 자막
    sub_cfg = tpl.get('subtitleConfig', {})
    sub_color = sub_cfg.get('textColor', '#FFFFFF')
    # CapCut 표준 스케일: 6.0pt
    sub_size = 6.0
    sub_font = sub_cfg.get('font', 'Pretendard')
    sub_y_pct = float(tpl.get('captionZone', {}).get('safeZoneYPct', 75.0))

    if subtitles:
        sub_trk_id = str(uuid.uuid4()).upper()
        sub_segments = []
        for idx, sub_item in enumerate(subtitles):
            txt = sub_item.get('text', '').strip()
            if not txt: continue
            s_start_ms = sub_item.get('startMs', 0)
            s_end_ms = sub_item.get('endMs', s_start_ms + 2000)
            seg_start_us = int(s_start_ms * 1000)
            seg_dur_us = max(int((s_end_ms - s_start_ms) * 1000), 500000)
            sm_id = str(uuid.uuid4()).upper()
            ss_id = str(uuid.uuid4()).upper()
            s_content = json.dumps({
                'text': txt,
                'styles': [{'fill': {'content': {'render_type': 'solid', 'solid': {'color': hex_to_rgb01(sub_color)}}}, 'size': sub_size, 'bold': True, 'useLetterColor': True, 'range': [0, len(txt)]}]
            }, ensure_ascii=False)
            materials['texts'].append({
                'id': sm_id, 'type': 'subtitle', 'name': f'Subtitle #{idx + 1}', 'content': s_content,
                'font_name': sub_font, 'font_size': sub_size, 'alignment': 1,
                'border_color': '#000000', 'border_width': 0.16, 'border_mode': 1, 'border_alpha': 1.0,
                'shadow_color': 'rgba(0,0,0,0.95)', 'shadow_alpha': 0.9, 'shadow_distance': 3.5
            })
            sx, sy = to_capcut_coord(50.0, sub_y_pct)
            sub_segments.append({
                'id': ss_id, 'type': 'text', 'material_id': sm_id,
                'target_timerange': {'duration': seg_dur_us, 'start': seg_start_us},
                'render_index': 3000 + idx,
                'clip': {'scale': {'x': 1.0, 'y': 1.0}, 'transform': {'x': sx, 'y': sy}, 'rotation': 0.0},
                'extra_material_refs': [sm_id]
            })
        if sub_segments:
            tracks.append({
                'id': sub_trk_id, 'type': 'text', 'name': f'SUB Subtitles ({sub_y_pct}% Safe-Zone)',
                'flag': 2, 'segments': sub_segments
            })

    # 🏷️ 템플릿 출처 표기
    has_source = tpl.get('hasBottomSource', True)
    src_cfg = tpl.get('sourceZone', {})
    source_text = src_cfg.get('defaultText') or tpl.get('bottomSourceText') or '출처: 공식 유튜브 영상'
    src_color = src_cfg.get('textColor') or tpl.get('bottomSourceColor', '#94A3B8')
    # CapCut 표준 스케일: 4.0pt
    src_size = 4.0
    src_y_pct = float(src_cfg.get('yPct', 94.0))

    if has_source and source_text:
        src_mat_id = str(uuid.uuid4()).upper()
        src_seg_id = str(uuid.uuid4()).upper()
        src_trk_id = str(uuid.uuid4()).upper()
        src_content = json.dumps({
            'text': source_text,
            'styles': [{'fill': {'content': {'render_type': 'solid', 'solid': {'color': hex_to_rgb01(src_color)}}}, 'size': src_size, 'bold': False, 'useLetterColor': True, 'range': [0, len(source_text)]}]
        }, ensure_ascii=False)
        materials['texts'].append({
            'id': src_mat_id, 'type': 'subtitle', 'name': 'Source Credit', 'content': src_content,
            'font_name': 'Pretendard', 'font_size': src_size, 'alignment': 1,
            'border_color': '#000000', 'border_width': 0.08, 'border_mode': 1
        })
        src_x, src_y = to_capcut_coord(50.0, src_y_pct)
        tracks.append({
            'id': src_trk_id, 'type': 'text', 'name': 'T4 Source Credit',
            'segments': [{
                'id': src_seg_id, 'type': 'text', 'material_id': src_mat_id,
                'target_timerange': {'duration': total_duration_us, 'start': 0},
                'render_index': 1500,
                'clip': {'scale': {'x': 1.0, 'y': 1.0}, 'transform': {'x': src_x, 'y': src_y}, 'rotation': 0.0},
                'extra_material_refs': [src_mat_id]
            }]
        })

    # 1. draft_content.json
    draft_content = {
        'canvas_config': {'height': 1920, 'ratio': '9:16', 'width': 1080},
        'config': {'maintrack_adsorb': True, 'zoom_info_params': {'zoom_ratio': 1.0}},
        'id': draft_id, 'version': 360000, 'new_version': '187.0.0', 'duration': total_duration_us,
        'fps': 30.0, 'color_space': 0,
        'platform': {'app_id': 359289, 'app_source': 'cc', 'app_version': '9.5.0', 'os': 'windows'},
        'last_modified_platform': {'app_id': 359289, 'app_source': 'cc', 'app_version': '9.5.0', 'os': 'windows'},
        'materials': materials, 'tracks': tracks
    }
    with open(os.path.join(draft_folder, 'draft_content.json'), 'w', encoding='utf-8') as f:
        json.dump(draft_content, f, ensure_ascii=False, indent=2)

    # 2. draft_meta_info.json (CapCut 9.5 정식 스키마 준수)
    tm_now = int(time.time() * 1000000)

    video_materials = []
    for vm in materials['videos']:
        video_materials.append({
            'ai_group_type': '', 'create_time': 0, 'duration': vm.get('duration', total_duration_us),
            'enter_from': 0, 'extra_info': vm.get('name', ''),
            'file_Path': f'./Resources/{vm.get("name", "")}',
            'height': vm.get('height', 1920), 'id': vm['id'], 'import_time': int(time.time()),
            'import_time_ms': -1, 'item_source': 1, 'md5': '', 'metetype': vm.get('metetype', 'photo_to_video'),
            'roughcut_time_range': {'duration': vm.get('duration', total_duration_us), 'start': 0},
            'sub_time_range': {'duration': -1, 'start': -1}, 'type': 0, 'width': vm.get('width', 1080)
        })

    audio_materials = [{
        'ai_group_type': '', 'create_time': 0, 'duration': total_duration_us,
        'enter_from': 0, 'extra_info': dest_audio_name,
        'file_Path': f'./Resources/{dest_audio_name}',
        'height': 0, 'id': a_mat_id, 'import_time': int(time.time()),
        'import_time_ms': -1, 'item_source': 1, 'md5': '', 'metetype': '',
        'roughcut_time_range': {'duration': total_duration_us, 'start': 0},
        'sub_time_range': {'duration': -1, 'start': -1}, 'type': 1, 'width': 0
    }] if has_audio else []

    draft_meta = {
        'cloud_draft_cover': False, 'cloud_draft_sync': False, 'draft_cloud_last_action_download': False,
        'draft_cloud_purchase_info': '', 'draft_cloud_template_id': '', 'draft_cloud_tutorial_info': '',
        'draft_cloud_videocut_purchase_info': '',
        'draft_cover': 'draft_cover.jpg',  # 상대경로!
        'draft_fold_path': norm_fold,
        'draft_id': draft_id,
        'draft_is_ai_shorts': False, 'draft_is_cloud_temp_draft': False, 'draft_is_infinite_canvas_draft': False,
        'draft_is_invisible': False, 'draft_is_pippit_draft': False, 'draft_is_web_article_video': False,
        'draft_materials': [
            {'type': 0, 'value': video_materials},
            {'type': 1, 'value': audio_materials},
            {'type': 2, 'value': []},
            {'type': 3, 'value': []}, {'type': 6, 'value': []}, {'type': 7, 'value': []}, {'type': 8, 'value': []}
        ],
        'draft_materials_copied_info': [], 'draft_name': folder_name,
        'draft_need_rename_folder': False, 'draft_new_version': '', 'draft_removable_storage_device': '',
        'draft_root_path': norm_base, 'draft_segment_extra_info': [], 'draft_timeline_materials_size_': 100000,
        'draft_type': '', 'draft_web_article_video_enter_from': '', 'streaming_edit_draft_ready': True,
        'tm_draft_cloud_completed': '', 'tm_draft_cloud_entry_id': -1, 'tm_draft_cloud_modified': 0,
        'tm_draft_cloud_parent_entry_id': -1, 'tm_draft_cloud_space_id': -1, 'tm_draft_cloud_user_id': -1,
        'tm_draft_create': tm_now, 'tm_draft_modified': tm_now, 'tm_draft_removed': 0, 'tm_duration': total_duration_us
    }
    with open(os.path.join(draft_folder, 'draft_meta_info.json'), 'w', encoding='utf-8') as f:
        json.dump(draft_meta, f, ensure_ascii=False, indent=2)

    # 3~11. 필수 보조 스키마 9종
    with open(os.path.join(draft_folder, 'draft_settings'), 'w', encoding='utf-8') as f:
        f.write('[PC]\nplatform=windows\nfps=30\ncolor_space=0\nresolution=1080P\n')
    with open(os.path.join(draft_folder, 'draft_content.json.bak'), 'w', encoding='utf-8') as f:
        json.dump(draft_content, f, ensure_ascii=False, indent=2)
    with open(os.path.join(draft_folder, 'template-2.tmp'), 'w', encoding='utf-8') as f:
        json.dump(draft_content, f, ensure_ascii=False, indent=2)
    with open(os.path.join(draft_folder, 'draft_biz_config.json'), 'w', encoding='utf-8') as f:
        f.write('')
    with open(os.path.join(draft_folder, 'draft_agency_config.json'), 'w', encoding='utf-8') as f:
        json.dump({'is_auto_agency_enabled': False, 'marterials': None}, f, ensure_ascii=False)
    with open(os.path.join(draft_folder, 'timeline_layout.json'), 'w', encoding='utf-8') as f:
        json.dump({'timeline_tree': [{'id': t['id'], 'type': t['type']} for t in tracks], 'layoutOrientation': 1}, f, ensure_ascii=False, indent=2)
    with open(os.path.join(draft_folder, 'draft_virtual_store.json'), 'w', encoding='utf-8') as f:
        json.dump({'draft_materials': [], 'draft_virtual_store': [{'type': 0, 'value': []}, {'type': 1, 'value': []}, {'type': 2, 'value': []}]}, f, ensure_ascii=False)
    with open(os.path.join(draft_folder, 'performance_opt_info.json'), 'w', encoding='utf-8') as f:
        json.dump({'manual_cancle_precombine_segs': None, 'need_auto_precombine_segs': None}, f, ensure_ascii=False)
    with open(os.path.join(draft_folder, 'attachment_pc_common.json'), 'w', encoding='utf-8') as f:
        json.dump({
            'ai_packaging_infos': [], 'ai_packaging_report_info': {'caption_id_list': [], 'commercial_material': '', 'material_source': '', 'method': '', 'page_from': '', 'style': '', 'task_id': '', 'text_style': '', 'tos_id': '', 'video_category': ''},
            'broll': {'ai_packaging_infos': [], 'ai_packaging_report_info': {'caption_id_list': [], 'commercial_material': '', 'material_source': '', 'method': '', 'page_from': '', 'style': '', 'task_id': '', 'text_style': '', 'tos_id': '', 'video_category': ''}},
            'commercial_music_category_ids': [], 'pc_feature_flag': 0, 'recognize_tasks': [],
            'reference_lines_config': {'horizontal_lines': [], 'is_lock': False, 'is_visible': False, 'vertical_lines': []},
            'safe_area_type': 0, 'template_item_infos': [], 'unlock_template_ids': []
        }, f, ensure_ascii=False)

    # 12. root_meta_info.json 원자적 등록
    root_meta_path = os.path.join(base_path, 'root_meta_info.json')
    try:
        if os.path.exists(root_meta_path):
            with open(root_meta_path, 'r', encoding='utf-8') as f:
                root_meta = json.load(f)
        else:
            root_meta = {'all_draft_store': [], 'draft_ids': 0, 'root_path': norm_base}

        all_store = root_meta.get('all_draft_store', [])
        root_entry = {
            'cloud_draft_cover': False, 'cloud_draft_sync': False, 'draft_cloud_last_action_download': False,
            'draft_cloud_purchase_info': '', 'draft_cloud_template_id': '', 'draft_cloud_tutorial_info': '',
            'draft_cloud_videocut_purchase_info': '',
            'draft_cover': f'{norm_fold}\\draft_cover.jpg',
            'draft_fold_path': norm_fold,
            'draft_id': draft_id,
            'draft_is_ai_shorts': False, 'draft_is_cloud_temp_draft': False, 'draft_is_infinite_canvas_draft': False,
            'draft_is_invisible': False, 'draft_is_pippit_draft': False, 'draft_is_web_article_video': False,
            'draft_json_file': f'{norm_fold}\\draft_content.json',
            'draft_name': folder_name, 'draft_new_version': '',
            'draft_root_path': norm_base, 'draft_timeline_materials_size': 100000,
            'draft_type': '', 'draft_web_article_video_enter_from': '', 'pippit_avatar_url': '',
            'pippit_extra_info': '', 'pippit_id': '', 'pippit_user_name': '', 'streaming_edit_draft_ready': True,
            'tm_draft_cloud_completed': '', 'tm_draft_cloud_entry_id': -1, 'tm_draft_cloud_modified': 0,
            'tm_draft_cloud_parent_entry_id': -1, 'tm_draft_cloud_space_id': -1, 'tm_draft_cloud_user_id': -1,
            'tm_draft_create': tm_now, 'tm_draft_modified': tm_now, 'tm_draft_removed': 0, 'tm_duration': total_duration_us
        }
        all_store = [x for x in all_store if x.get('draft_name') != folder_name and x.get('draft_id') != draft_id]
        all_store.insert(0, root_entry)
        root_meta['all_draft_store'] = all_store
        root_meta['draft_ids'] = len(all_store)

        temp_meta_path = root_meta_path + '.tmp'
        with open(temp_meta_path, 'w', encoding='utf-8') as f:
            json.dump(root_meta, f, separators=(',', ':'), ensure_ascii=False)
        os.replace(temp_meta_path, root_meta_path)
        logger.info(f'[CapCut Assembler] root_meta_info.json updated with project {folder_name}')
    except Exception as me:
        logger.error(f'[CapCut Assembler] root_meta_info.json update error: {me}')

    opened = False
    if open_after:
        try:
            # Terminate running CapCut so it reloads root_meta_info.json fresh without stale in-memory cache
            subprocess.run(['taskkill', '/F', '/IM', 'CapCut.exe'], capture_output=True, check=False)
            time.sleep(0.8)

            candidates = [
                os.path.join(local_app_data, 'CapCut', 'Apps', 'CapCut.exe'),
                'C:\\Program Files\\CapCut\\CapCut.exe'
            ]
            import glob
            cand_globs = glob.glob(os.path.join(local_app_data, 'CapCut', 'Apps', '*', 'CapCut.exe'))
            if cand_globs:
                candidates = cand_globs + candidates
            for app_exe in candidates:
                if os.path.exists(app_exe):
                    subprocess.Popen([app_exe], shell=True)
                    opened = True
                    break
        except Exception as oe:
            logger.warning(f'[CapCut Assembler] Auto-open failed: {oe}')

    return {
        'success': True,
        'folder_number': folder_name,
        'project_name': project_name or f'클래식쇼츠_{folder_name}',
        'draft_folder': draft_folder,
        'draft_id': draft_id,
        'duration_sec': total_duration_ms / 1000.0,
        'track_summary': {
            'has_video_track': has_video,
            'has_audio_track': has_audio,
            'has_top_title': bool(title_line1 or title_line2),
            'has_breaking_badge': bool(has_title_badge and badge_text),
            'has_jab_hook': bool(has_jab and jab_text),
            'subtitles_count': len(subtitles),
            'has_source_credit': bool(has_source and source_text),
            'total_tracks': len(tracks)
        },
        'template_applied': {
            'template_id': template_id,
            'has_breaking_badge': has_title_badge,
            'badge_text': badge_text,
            'title_line1': title_line1,
            'title_line2': title_line2,
            'has_jab_hook': has_jab,
            'jab_text': jab_text,
            'jab_tilt_deg': jab_tilt,
            'has_subtitles': len(subtitles) > 0,
            'subtitles_count': len(subtitles),
            'has_source': has_source,
            'source_text': source_text
        },
        'opened': opened
    }
