"""
[ViraLoop Sovereign Media Engine] Remotion Headless Direct Renderer Service
Bridges Python backend with Node.js Remotion CLI for 100% autonomous MP4 rendering.
"""

import os
import sys
import json
import logging
import asyncio
import subprocess
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger("remotion_renderer")

class RemotionRenderer:
    def __init__(self, workspace_root: Optional[str] = None):
        if workspace_root:
            self.root_dir = Path(workspace_root)
        else:
            # Detect project root (c:/ViraLoopMedia/VLStudio)
            current = Path(__file__).resolve()
            # Climb up until we find apps/remotion-engine or reach drive root
            root_candidate = current.parents[4] if len(current.parents) >= 5 else current.parent
            for p in current.parents:
                if (p / "apps" / "remotion-engine").exists():
                    root_candidate = p
                    break
            self.root_dir = root_candidate
            
        self.remotion_dir = self.root_dir / "apps" / "remotion-engine"
        self.cli_path = self.remotion_dir / "render_cli.js"
        
        # Default export directory (%LOCALAPPDATA%/ViraLoop Studio/media/05_Exports)
        local_app = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
        if local_app:
            self.export_dir = Path(local_app) / "ViraLoop Studio" / "media" / "05_Exports"
        else:
            self.export_dir = Path.home() / ".viraloop_studio" / "media" / "05_Exports"
        self.export_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_node_binary(self) -> str:
        import shutil
        candidates = [
            shutil.which("node"),
            "C:\\Program Files\\nodejs\\node.exe",
            os.path.expandvars(r"%ProgramFiles%\nodejs\node.exe"),
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\node\node.exe"),
        ]
        for c in candidates:
            if c and os.path.exists(c):
                return c
        return "node"

    @staticmethod
    def _execute_cli_sync(cmd: List[str], cwd: str):
        res = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace"
        )
        return res.returncode, res.stdout, res.stderr

    async def render_short(
        self,
        project_id: str,
        video_source: Optional[str] = None,
        image_source: Optional[str] = None,
        scenes: Optional[List[Dict[str, Any]]] = None,
        audio_source: Optional[str] = None,
        final_mixed_audio: Optional[str] = None,
        bgm_source: Optional[str] = None,
        title_hook: str = "0.8초 쨉쨉이 충격 반전!",
        subtitles: Optional[List[Dict[str, Any]]] = None,
        jab_overlay: Optional[Dict[str, Any]] = None,
        has_top_header: bool = True,
        title_line1: Optional[str] = None,
        title_line2: Optional[str] = None,
        title_badge_text: Optional[str] = None,
        has_bottom_credit: bool = True,
        bottom_credit_text: Optional[str] = None,
        style_preset: str = "shorts",
        canvas_type: str = "LETTERBOX_SOLID",
        accent_color: str = "#FFE600",
        duration_seconds: float = 15.0,
        fps: int = 30,
    ) -> Dict[str, Any]:
        """
        Renders a 9:16 short video directly to MP4 using headless Remotion.
        Supports multi-scene sequential clips, HeyGen HyperFrames mixed audio, jab hooks, and 6 viral subtitle presets.
        """
        output_mp4 = self.export_dir / f"{project_id}.mp4"
        props_file = self.export_dir / f"{project_id}_props.json"

        # Format input props matching ViraShortProps interface
        props_data = {
            "titleHook": title_hook,
            "accentColor": accent_color,
            "subtitles": subtitles or [],
            "stylePreset": style_preset,
            "canvasType": canvas_type,
            "hasTopHeader": has_top_header,
            "hasBottomCredit": has_bottom_credit,
        }

        if title_line1:
            props_data["titleLine1"] = title_line1
        if title_line2:
            props_data["titleLine2"] = title_line2
        if title_badge_text:
            props_data["titleBadgeText"] = title_badge_text
        if bottom_credit_text:
            props_data["bottomCreditText"] = bottom_credit_text

        if jab_overlay:
            props_data["jabOverlay"] = jab_overlay
        elif title_hook:
            props_data["jabOverlay"] = {
                "text": title_hook,
                "startMs": 1500,
                "endMs": 6000,
                "placement": "top-third",
                "tiltDeg": -3,
            }

        # Handle scenes vs single source
        if scenes and len(scenes) > 0:
            formatted_scenes = []
            for sc in scenes:
                sc_copy = dict(sc)
                if sc_copy.get("src") and os.path.exists(sc_copy["src"]):
                    sc_copy["src"] = Path(sc_copy["src"]).as_posix()
                formatted_scenes.append(sc_copy)
            props_data["scenes"] = formatted_scenes
        else:
            if video_source and os.path.exists(video_source):
                props_data["videoSource"] = Path(video_source).as_posix()
            elif image_source and os.path.exists(image_source):
                props_data["imageSource"] = Path(image_source).as_posix()

        if final_mixed_audio and os.path.exists(final_mixed_audio):
            props_data["finalMixedAudio"] = Path(final_mixed_audio).as_posix()
        else:
            if audio_source and os.path.exists(audio_source):
                props_data["audioSource"] = Path(audio_source).as_posix()
            if bgm_source and os.path.exists(bgm_source):
                props_data["bgmSource"] = Path(bgm_source).as_posix()

        # Write props JSON
        with open(props_file, "w", encoding="utf-8") as f:
            json.dump(props_data, f, ensure_ascii=False, indent=2)

        duration_in_frames = int(duration_seconds * fps)

        cmd = [
            self._resolve_node_binary(),
            str(self.cli_path),
            "--props", str(props_file),
            "--output", str(output_mp4),
            "--durationInFrames", str(duration_in_frames),
        ]

        logger.info(f"🚀 [RemotionRenderer] Launching render CLI for project '{project_id}'...")
        logger.info(f"   Command: {' '.join(cmd)}")

        try:
            loop = asyncio.get_running_loop()
            returncode, stdout_text, stderr_text = await loop.run_in_executor(
                None, self._execute_cli_sync, cmd, str(self.remotion_dir)
            )

            if returncode != 0:
                logger.error(f"❌ [RemotionRenderer] Process failed (code {returncode}):\n{stderr_text}\n{stdout_text}")
                return {
                    "success": False,
                    "error": f"Render process failed with exit code {returncode}",
                    "details": stderr_text or stdout_text
                }

            # Verify file exists on disk and is non-empty
            if not output_mp4.exists() or output_mp4.stat().st_size == 0:
                logger.error(f"❌ [RemotionRenderer] Rendered file does not exist or is empty: {output_mp4}")
                return {
                    "success": False,
                    "error": "Rendered MP4 file missing or 0 bytes",
                    "details": stdout_text
                }

            file_size_mb = output_mp4.stat().st_size / (1024 * 1024)
            logger.info(f"✅ [RemotionRenderer] Successfully rendered MP4: {output_mp4} ({file_size_mb:.2f} MB)")

            return {
                "success": True,
                "video_path": str(output_mp4),
                "file_size_bytes": output_mp4.stat().st_size,
                "duration_seconds": duration_seconds,
                "props_path": str(props_file),
            }

        except Exception as e:
            logger.exception(f"❌ [RemotionRenderer] Exception during rendering: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def render_song_short(
        self,
        project_id: str,
        lyrics: List[Dict[str, Any]],
        video_source: Optional[str] = None,
        audio_source: Optional[str] = None,
        album_cover: Optional[str] = None,
        song_title: str = "Untitled Song",
        artist_name: str = "Unknown Artist",
        visual_theme: str = "vinyl",
        enable_original: bool = True,
        enable_pronunciation: bool = True,
        enable_meaning: bool = True,
        sync_offset_ms: int = 0,
        duration_seconds: float = 30.0,
        original_color: Optional[str] = None,
        pronunciation_color: Optional[str] = None,
        meaning_color: Optional[str] = None,
        text_position: Optional[str] = "bottom",
        fps: int = 30,
    ) -> Dict[str, Any]:
        """
        Renders a 9:16 3-Track Karaoke music short video directly to MP4 using headless Remotion.
        """
        output_mp4 = self.export_dir / f"{project_id}.mp4"
        props_file = self.export_dir / f"{project_id}_props.json"

        props_data = {
            "songTitle": song_title,
            "artistName": artist_name,
            "visualTheme": visual_theme,
            "enableOriginal": enable_original,
            "enablePronunciation": enable_pronunciation,
            "enableMeaning": enable_meaning,
            "syncOffsetMs": sync_offset_ms,
            "lyrics": lyrics or [],
            "originalColor": original_color or "#FFFFFF",
            "pronunciationColor": pronunciation_color or "#34D399",
            "meaningColor": meaningColor if (meaningColor := meaning_color) else "#FBBF24",
            "textPosition": text_position or "bottom",
        }

        if video_source and os.path.exists(video_source):
            props_data["videoSource"] = Path(video_source).as_posix()

        if audio_source and os.path.exists(audio_source):
            props_data["audioSource"] = Path(audio_source).as_posix()

        if album_cover and os.path.exists(album_cover):
            props_data["albumCover"] = Path(album_cover).as_posix()

        with open(props_file, "w", encoding="utf-8") as f:
            json.dump(props_data, f, ensure_ascii=False, indent=2)

        duration_in_frames = int(duration_seconds * fps)

        cmd = [
            self._resolve_node_binary(),
            str(self.cli_path),
            "--composition", "SongKaraokeComposition",
            "--props", str(props_file),
            "--output", str(output_mp4),
            "--durationInFrames", str(duration_in_frames),
        ]

        logger.info(f"🎵 [RemotionRenderer] Launching SongKaraokeComposition for project '{project_id}'...")
        logger.info(f"   Command: {' '.join(cmd)}")

        try:
            loop = asyncio.get_running_loop()
            returncode, stdout_text, stderr_text = await loop.run_in_executor(
                None, self._execute_cli_sync, cmd, str(self.remotion_dir)
            )

            if returncode != 0:
                logger.error(f"❌ [RemotionRenderer] Song render failed (code {returncode}):\n{stderr_text}\n{stdout_text}")
                return {
                    "success": False,
                    "error": f"Render process failed with exit code {returncode}",
                    "details": stderr_text or stdout_text
                }

            if not output_mp4.exists() or output_mp4.stat().st_size == 0:
                logger.error(f"❌ [RemotionRenderer] Rendered MP4 file missing or empty: {output_mp4}")
                return {
                    "success": False,
                    "error": "Rendered MP4 file missing or 0 bytes",
                    "details": stdout_text
                }

            file_size_mb = output_mp4.stat().st_size / (1024 * 1024)
            logger.info(f"✅ [RemotionRenderer] Song MP4 rendered: {output_mp4} ({file_size_mb:.2f} MB)")

            return {
                "success": True,
                "video_path": str(output_mp4),
                "file_size_bytes": output_mp4.stat().st_size,
                "duration_seconds": duration_seconds,
                "props_path": str(props_file),
            }

        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            logger.exception(f"❌ [RemotionRenderer] Exception during song rendering: {e}")
            return {
                "success": False,
                "error": f"{type(e).__name__}: {str(e)}\n{tb}"
            }

    async def render_blueprint_v4(
        self,
        project_id: str,
        blueprint_v4: Dict[str, Any],
        output_mp4_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Render a video directly from VLStandardBlueprint v4.0 schema.
        Maps globalLayers (top_bar_bg, bottom_bar_bg, title_line1, title_line2, bottom_source, subtitle_main)
        and scenes sequentially into Remotion ViraShortComposition.
        """
        gl = blueprint_v4.get("globalLayers", []) or blueprint_v4.get("layers", [])
        tb_layer = next((l for l in gl if l.get("id") in ("top_bar_bg", "layer_top_bar", "top_bar")), None)
        bb_layer = next((l for l in gl if l.get("id") in ("bottom_bar_bg", "layer_bottom_bar", "bottom_bar")), None)
        t1_layer = next((l for l in gl if l.get("id") in ("title_line1", "layer_title_line1", "title_l1", "layer_ssul_title")), None)
        t2_layer = next((l for l in gl if l.get("id") in ("title_line2", "layer_title_line2", "title_l2")), None)
        src_layer = next((l for l in gl if l.get("id") in ("bottom_source", "layer_source_credit", "source_credit")), None)
        sub_layer = next((l for l in gl if l.get("id") in ("subtitle_main", "layer_subtitles", "subtitle_cue")), None)

        preset_id = blueprint_v4.get("presetId", "")
        style = blueprint_v4.get("style", {})
        script_data = blueprint_v4.get("script_data") or blueprint_v4.get("script") or {}
        scenes_data = blueprint_v4.get("scenes", [])
        remotion_scenes = []
        subtitles = []
        raw_cues = blueprint_v4.get("cues") or blueprint_v4.get("subtitles") or []
        if raw_cues:
            for cu in raw_cues:
                st_ms = cu.get("startMs", cu.get("start_ms", 0))
                et_ms = cu.get("endMs", cu.get("end_ms", 3000))
                subtitles.append({
                    "start": st_ms / 1000.0,
                    "end": et_ms / 1000.0,
                    "startMs": round(st_ms),
                    "endMs": round(et_ms),
                    "text": cu.get("text", ""),
                    "speaker": cu.get("speaker"),
                    "animation": cu.get("animation"),
                    "color": cu.get("color")
                })

        for idx, sc in enumerate(scenes_data):
            st = float(sc.get("start", idx * 4.0))
            et = float(sc.get("end", (idx + 1) * 4.0))
            dur = max(0.5, et - st)
            media = sc.get("mediaUrl") or sc.get("source_path") or sc.get("videoUrl")
            remotion_scenes.append({
                "id": sc.get("id", f"scene_{idx}"),
                "videoSource": media if media and os.path.exists(media) else None,
                "imageSource": media if media and not (media.endswith(".mp4") or media.endswith(".webm")) else None,
                "durationSeconds": dur,
                "narrationText": sc.get("narration") or sc.get("text", "")
            })
            if not raw_cues and (sc.get("narration") or sc.get("text")):
                subtitles.append({
                    "start": st,
                    "end": et,
                    "startMs": round(st * 1000),
                    "endMs": round(et * 1000),
                    "text": sc.get("narration") or sc.get("text")
                })

        total_dur = max(sum(s.get("durationSeconds", 4.0) for s in remotion_scenes), 5.0)

        # 🎯 [Universal Sovereign Shorts Composition Dispatch]
        # Any blueprint_v4 can be rendered parametrically using measured coordinates & typography!
        if gl or "일분일초" in preset_id or blueprint_v4.get("archetype") in ("classic", "classic_ilbunilcho", "insta", "gunlimbo", "ssul"):
            output_mp4 = Path(output_mp4_path) if output_mp4_path else self.export_dir / f"{project_id}.mp4"
            props_file = self.export_dir / f"{project_id}_props.json"
            
            first_media = None
            for s in remotion_scenes:
                m = s.get("videoSource") or s.get("imageSource")
                if m and os.path.exists(m):
                    first_media = m
                    break
            
            # 1. Top Bar Geometry
            top_h = tb_layer.get("transform", {}).get("height", 515) if tb_layer else 0
            has_tb = tb_layer is not None and not tb_layer.get("hidden", False)
            tb_bg = tb_layer.get("fillColor", "#000000") if tb_layer else "#000000"

            # 2. Bottom Bar Geometry
            bot_h = bb_layer.get("transform", {}).get("height", 468) if bb_layer else 0
            has_bb = bb_layer is not None and not bb_layer.get("hidden", False)
            bb_bg = bb_layer.get("fillColor", "#000000") if bb_layer else "#000000"

            # 3. Title Line 1
            t1_content = t1_layer.get("content", "하루 1분 투자로") if t1_layer else ""
            t1_y = t1_layer.get("transform", {}).get("y", 276) if t1_layer else 276
            t1_color = t1_layer.get("fontColor", "#FFE500") if t1_layer else "#FFE500"
            t1_size = t1_layer.get("fontSize", 84) if t1_layer else 84
            t1_stroke = t1_layer.get("stroke", {}).get("width", 5.5) if t1_layer else 5.5
            t1_font = t1_layer.get("fontFamily", "YeogiOttaeJalnan") if t1_layer else "YeogiOttaeJalnan"

            # 4. Title Line 2
            t2_content = t2_layer.get("content", "인생을 바꾸는 기적의 습관") if t2_layer else ""
            t2_y = t2_layer.get("transform", {}).get("y", 415) if t2_layer else 415
            t2_color = t2_layer.get("fontColor", "#FF2222") if t2_layer else "#FF2222"
            t2_size = t2_layer.get("fontSize", 76) if t2_layer else 76
            t2_stroke = t2_layer.get("stroke", {}).get("width", 5.5) if t2_layer else 5.5

            # 5. Subtitles (실측치 반영: SCoreDream, 68px, 7.5px stroke, 549px bottom)
            sub_fs = sub_layer.get("fontSize", 68) if sub_layer else 68
            sub_font = sub_layer.get("fontFamily", "SCoreDream") if sub_layer else "SCoreDream"
            sub_color = sub_layer.get("fontColor", "#FFFFFF") if sub_layer else "#FFFFFF"
            sub_stroke = sub_layer.get("stroke", {}).get("width", 7.5) if sub_layer else 7.5
            sub_y = sub_layer.get("transform", {}).get("y", 1297) if sub_layer else 1297
            sub_bottom = max(100, 1920 - (sub_y + 74)) if sub_y else 549

            # 5.5. Jab Punch Overlay (쨉쨉이)
            jab_layer = next((l for l in gl if l.get("id") in ("layer_jab_hook", "jab_overlay")), None)
            jab_overlay_cfg = None
            if jab_layer and not jab_layer.get("hidden", False):
                jab_overlay_cfg = {
                    "text": jab_layer.get("content", "*소리 주의*"),
                    "startMs": jab_layer.get("inMs", 1500),
                    "endMs": jab_layer.get("outMs", 4000),
                    "color": jab_layer.get("fontColor", "#FFE500"),
                    "bgColor": jab_layer.get("boxColor", "rgba(0, 0, 0, 0.92)"),
                    "tiltDeg": jab_layer.get("tiltDeg", -2.5),
                    "fontSize": jab_layer.get("fontSize", 52),
                    "placement": "top-third"
                }

            # 0. 4대 폼팩터 아키타입 감지 및 전용 설정 파싱
            raw_archetype = (blueprint_v4.get("archetype") or "").lower()
            if "gunlimbo" in raw_archetype or "군림보" in preset_id:
                archetype = "gunlimbo"
            elif "insta" in raw_archetype or "인스타" in preset_id:
                archetype = "insta"
            elif "ssul" in raw_archetype or "썰" in preset_id:
                archetype = "ssul"
            else:
                archetype = "classic"

            # 6. Video Slot Geometry
            v_layer = next((l for l in gl if l.get("id") in ("video_slot", "layer_video_slot")), None)
            if archetype == "insta":
                v_top = v_layer.get("transform", {}).get("y", 340) if v_layer else 340
                v_height = v_layer.get("transform", {}).get("height", 1000) if v_layer else 1000
            elif archetype == "ssul":
                v_top = v_layer.get("transform", {}).get("y", 840) if v_layer else 840
                v_height = v_layer.get("transform", {}).get("height", 1000) if v_layer else 1000
            elif archetype == "gunlimbo":
                v_top = v_layer.get("transform", {}).get("y", 460) if v_layer else 460
                v_height = v_layer.get("transform", {}).get("height", 1920 - 460) if v_layer else (1920 - 460)
            else:
                v_top = v_layer.get("transform", {}).get("y", top_h) if v_layer else top_h
                v_height = v_layer.get("transform", {}).get("height", 1920 - top_h - bot_h) if v_layer else (1920 - top_h - bot_h)

            # (1) 군림보형 설정
            gunlimbo_cfg = blueprint_v4.get("gunlimboConfig") or {}
            if archetype == "gunlimbo":
                hook_layer = next((l for l in gl if l.get("shapeRole") == "hook_band" or "hook_band" in l.get("id", "")), None)
                hook_text_layer = next((l for l in gl if l.get("textRole") == "hook_punch" or "hook_text" in l.get("id", "")), None)
                gunlimbo_cfg = {
                    "enabled": True,
                    "text": hook_text_layer.get("content", "끝까지 보면 소름 돋습니다") if hook_text_layer else gunlimbo_cfg.get("text", "끝까지 보면 소름 돋습니다"),
                    "yPct": gunlimbo_cfg.get("yPct", 28),
                    "heightPx": gunlimbo_cfg.get("heightPx", 160),
                    "bgColor": hook_layer.get("fillColor", "#FFFFFF") if hook_layer else gunlimbo_cfg.get("bgColor", "#FFFFFF"),
                    "textColor": hook_text_layer.get("fontColor", "#000000") if hook_text_layer else gunlimbo_cfg.get("textColor", "#000000"),
                    "fontSize": hook_text_layer.get("fontSize", 56) if hook_text_layer else gunlimbo_cfg.get("fontSize", 56),
                    "durationSec": gunlimbo_cfg.get("durationSec", 2.5),
                }

            # (2) 인스타형 설정
            insta_cfg = blueprint_v4.get("instaConfig") or {}
            if archetype == "insta":
                profile_text_layer = next((l for l in gl if "profile" in l.get("id", "")), None)
                comment_text_layer = next((l for l in gl if "comment" in l.get("id", "") or "card" in l.get("id", "")), None)
                insta_cfg = {
                    "profile": {
                        "enabled": True,
                        "name": profile_text_layer.get("content", "viraloop_official") if profile_text_layer else insta_cfg.get("profile", {}).get("name", "viraloop_official"),
                        "handle": insta_cfg.get("profile", {}).get("handle", "@viraloop_official"),
                        "isVerified": insta_cfg.get("profile", {}).get("isVerified", True),
                        "topPx": 140,
                    },
                    "commentCard": {
                        "enabled": True,
                        "author": insta_cfg.get("commentCard", {}).get("author", "best_commenter"),
                        "content": comment_text_layer.get("content", "진짜 이건 볼 때마다 감탄만 나온다 ㅋㅋ") if comment_text_layer else None,
                        "likesText": insta_cfg.get("commentCard", {}).get("likesText", "4.8만"),
                        "commentsCountText": "1,240",
                        "timeText": insta_cfg.get("commentCard", {}).get("timeText", "30분 전"),
                        "topPx": 1364,
                    },
                }

            # (3) 썰형 설정
            ssul_cfg = blueprint_v4.get("ssulConfig") or {}
            if archetype == "ssul":
                ssul_header_layer = next((l for l in gl if "header_bg" in l.get("id", "") or "header" in l.get("id", "")), None)
                ssul_header_text_layer = next((l for l in gl if "header_text" in l.get("id", "")), None)
                ssul_post_title_layer = next((l for l in gl if "title" in l.get("id", "") and "header" not in l.get("id", "")), None)
                ssul_cfg = {
                    "header": {
                        "enabled": True,
                        "bgColor": ssul_header_layer.get("fillColor", "#F7CF46") if ssul_header_layer else "#F7CF46",
                        "title": ssul_header_text_layer.get("content", "실시간 베스트") if ssul_header_text_layer else "실시간 베스트",
                        "textColor": "#18181B",
                        "heightPx": 110,
                    },
                    "postMeta": {
                        "enabled": True,
                        "postTitle": ssul_post_title_layer.get("content", t1_content) if ssul_post_title_layer else (t1_content or "오늘자 레전드 썰 풀어본다"),
                        "author": ssul_cfg.get("postMeta", {}).get("author", "대기업 익명"),
                        "timeText": ssul_cfg.get("postMeta", {}).get("timeText", "10분 전"),
                        "viewsText": ssul_cfg.get("postMeta", {}).get("viewsText", "조회 2.4만"),
                        "upvotesText": ssul_cfg.get("postMeta", {}).get("upvotesText", "추천 382"),
                        "topPx": 125,
                    },
                    "cumulative": {
                        "enabled": True,
                        "maxLines": 4,
                        "fontSize": 44,
                        "boxBgColor": "rgba(10, 15, 29, 0.88)",
                        "highlightColor": "#FFE500",
                        "bottomPx": 240,
                    },
                }

            # 7. Source credit
            src_text = src_layer.get("content", "출처: 일분일초 공식") if src_layer else ""

            def _wrap_font(f_name: str) -> str:
                if not f_name:
                    return "'YeogiOttaeJalnan', sans-serif"
                if "," in f_name or "'" in f_name or '"' in f_name:
                    return f_name
                return f"'{f_name}', sans-serif"

            props_data = {
                "archetype": archetype,
                "gunlimboConfig": gunlimbo_cfg,
                "instaConfig": insta_cfg,
                "ssulConfig": ssul_cfg,
                "videoSource": first_media,
                "hasTopBar": True if archetype in ("classic", "gunlimbo") else False,
                "topBarHeight": 460 if archetype == "gunlimbo" else top_h,
                "topBarBgColor": "#000000" if archetype == "gunlimbo" else tb_bg,
                "titleLine1": t1_content if archetype != "ssul" else "",
                "titleLine1Y": t1_y,
                "titleLine1Color": t1_color,
                "titleLine1Size": t1_size,
                "titleLine1Stroke": t1_stroke,
                "titleLine2": t2_content if archetype != "ssul" else "",
                "titleLine2Y": t2_y,
                "titleLine2Color": t2_color,
                "titleLine2Size": t2_size,
                "titleLine2Stroke": t2_stroke,
                "titleFontFamily": _wrap_font(t1_font),
                "videoTop": v_top,
                "videoHeight": v_height,
                "subtitles": subtitles,
                "subtitleBottom": sub_bottom,
                "subtitleFontSize": sub_fs,
                "subtitleFontFamily": _wrap_font(sub_font),
                "subtitleBaseColor": sub_color,
                "subtitleHighlightColor": "#FFE500",
                "subtitleStrokeWidth": sub_stroke,
                "speakerPalette": blueprint_v4.get("speakerPalette"),
                "jabOverlay": jab_overlay_cfg,
                "captionTheme": blueprint_v4.get("captionTheme") or (style.get("caption_theme") if isinstance(style, dict) else None),
                "wordLevelCaptions": script_data.get("wordLevelCaptions"),
                "hasBottomBar": has_bb if archetype == "classic" else False,
                "bottomBarHeight": bot_h,
                "bottomBarBgColor": bb_bg,
                "sourceCreditText": src_text if archetype == "classic" else "",
            }

            with open(props_file, "w", encoding="utf-8") as f:
                json.dump(props_data, f, ensure_ascii=False, indent=2)

            duration_in_frames = int(total_dur * 30)
            cmd = [
                self._resolve_node_binary(),
                str(self.cli_path),
                "--composition", "UniversalSovereignShortsComposition",
                "--props", str(props_file),
                "--output", str(output_mp4),
                "--durationInFrames", str(duration_in_frames),
            ]

            logger.info(f"🚀 [RemotionRenderer] Launching UniversalSovereignShortsComposition CLI for {preset_id}...")
            loop = asyncio.get_running_loop()
            returncode, stdout_text, stderr_text = await loop.run_in_executor(
                None, self._execute_cli_sync, cmd, str(self.remotion_dir)
            )

            if returncode != 0:
                logger.error(f"❌ [RemotionRenderer] Failed: {stderr_text}\n{stdout_text}")
                return {"success": False, "error": stderr_text or stdout_text}

            return {
                "success": True,
                "video_path": str(output_mp4),
                "file_size_bytes": output_mp4.stat().st_size,
                "duration_seconds": total_dur,
                "props_path": str(props_file)
            }

        return await self.render_short(
            project_id=project_id,
            scenes=remotion_scenes if remotion_scenes else None,
            title_hook=t1_layer.get("content", "") if t1_layer else "ViraLoop Sovereign Short",
            subtitles=subtitles,
            has_top_header=tb_layer is not None and not tb_layer.get("hidden", False),
            title_line1=t1_layer.get("content") if t1_layer else None,
            title_line2=t2_layer.get("content") if t2_layer else None,
            has_bottom_credit=bb_layer is not None and not bb_layer.get("hidden", False),
            bottom_credit_text=src_layer.get("content") if src_layer else None,
            canvas_type="LETTERBOX_SOLID" if tb_layer else "FULLSCREEN",
            duration_seconds=total_dur
        )

    async def render_sovereign_short(
        self,
        project_id: str,
        blueprint_v4: Dict[str, Any],
        video_source: Optional[str] = None,
        script_data: Optional[Dict[str, Any]] = None,
        duration_seconds: float = 5.0,
        output_mp4_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Convenience wrapper around render_blueprint_v4 for sovereign 4 form factors.
        """
        bp = dict(blueprint_v4)
        if video_source:
            bp["scenes"] = [{"mediaUrl": video_source, "durationSeconds": duration_seconds}]
        if script_data and "cues" in script_data:
            bp["cues"] = script_data["cues"]
        return await self.render_blueprint_v4(project_id, bp, output_mp4_path=output_mp4_path)


remotion_renderer = RemotionRenderer()

