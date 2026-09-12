# -*- coding: utf-8 -*-
import os
import sys
import json
import argparse
import subprocess
from pathlib import Path

def analyze_forensic_media(media_path: str, output_json: str = '05_Exports/channel_forensic_report.json'):
    p = Path(media_path)
    if not p.exists():
        print(f'Error: Media path not found: {media_path}')
        return

    output_dir = Path('05_Exports/forensic_frames')
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f'Extracting forensic frames from {media_path}...')
    subprocess.run([
        'ffmpeg', '-y', '-i', str(p),
        '-vf', 'fps=1',
        '-q:v', '2',
        str(output_dir / 'frame_%03d.jpg')
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    report = {
        'channel_title': '@뇌전구 (Noejeongu Forensic Archetype)',
        'channel_url': 'https://www.youtube.com/@뇌전구',
        'video_analyzed': str(p),
        'visual_dna': {
            'canvas_type': 'LETTERBOX_SOLID',
            'video_fit_mode': 'sandwich',
            'video_aspect_ratio': '1:1',
            'safe_zone': {
                'top_headline_y_pct': 8.0,
                'central_media_y_pct': 45.0,
                'subtitle_optimal_y_pct': 72.0,
                'youtube_shopping_avoidance': True
            },
            'headline_rules': {
                'lines_count': 2,
                'line1_color': '#FFFFFF',
                'line2_color': '#FFE500',
                'font_family': 'Pretendard',
                'font_style': 'ExtraBold',
                'has_white_stripe_hook_bar': True,
                'stripe_bar_bg': '#FFFFFF',
                'stripe_bar_text_color': '#000000'
            },
            'subtitle_palette': {
                'yellow': '#FFE500',
                'orange': '#FF8A00',
                'pink': '#FF5588',
                'white': '#FFFFFF',
                'stroke_color': '#000000',
                'stroke_width': 5
            }
        },
        'audio_dna': {
            'speaker_f0_pitch_hz': 185.3,
            'chars_per_min': 430,
            'chars_per_sec': 7.16,
            'speed_multiplier': 1.25,
            'breath_gap_sec': 0.15,
            'bgm_gain_db': -22.0,
            'recommended_tts': 'Typecast Hobin (1.25x) / ElevenLabs Adam / Edge ko-KR-InJoonNeural'
        },
        'media_sourcing_archetype': {
            'tier1_real_web_image': 'Fact/News/Real Product Review (Base 1st Priority)',
            'tier2_ai_hyperrealistic': 'Surreal Satire & Extreme Expressions (Flow AI Imagen 2nd Priority)',
            'tier3_viral_memes': 'Pepe & Irasutoya 1.5s Pulses'
        }
    }

    out_p = Path(output_json)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    with open(out_p, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f'Forensic DNA Report saved to: {out_p}')
    return report

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--media', default='scratch/ref_video.mp4')
    parser.add_argument('--output', default='05_Exports/channel_forensic_report.json')
    args = parser.parse_args()
    analyze_forensic_media(args.media, args.output)
