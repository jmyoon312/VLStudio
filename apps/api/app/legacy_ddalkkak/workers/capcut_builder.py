import json
import os
import uuid
import time
import shutil

class CapCutBuilder:
    """
    미디어 일괄생성의 안정적인 구조(draft_content.json 단일 파일 생성)와
    딸깍의 트랙/자막 기능을 결합한 재사용 가능한 CapCut 프로젝트 빌더 컴포넌트입니다.
    """
    def __init__(self, project_name="New Project", draft_id=None):
        self.project_id = draft_id if draft_id else str(uuid.uuid4()).upper()
        self.project_name = project_name
        self.fps = 30.0
        self.duration = 0 # Microseconds
        
        # 표준 스키마 초기 구조 (모든 material keys 포함)
        self.data = {
            "canvas_config": {"height": 1920, "width": 1080, "ratio": "9:16"},
            "config": {
                "maintrack_adsorb": True,
                "zoom_info_params": {"zoom_ratio": 1.0}
            },
            "id": self.project_id,
            "materials": {
                "videos": [],
                "audios": [],
                "texts": [],
                "speeds": [],
                "canvases": []
            },
            "tracks": [],
            "version": 360000
        }
        
        # 트랙 초기화 (기본 비디오 트랙 1, 오디오 트랙 1, 텍스트 트랙 1)
        self.video_track = self._create_track("video")
        self.audio_track = self._create_track("audio")
        self.text_track = self._create_track("text")
        self.data["tracks"] = [self.video_track, self.text_track, self.audio_track]

    def _create_track(self, track_type):
        return {
            "id": str(uuid.uuid4()).upper(),
            "type": track_type,
            "segments": []
        }

    def _get_track(self, track_type, track_name=None):
        if not hasattr(self, "_named_tracks"):
            self._named_tracks = {}
            self._named_tracks[("video", None)] = self.video_track
            self._named_tracks[("audio", None)] = self.audio_track
            self._named_tracks[("text", None)] = self.text_track
            self._named_tracks[("text", "text")] = self.text_track
            
        key = (track_type, track_name)
        if key not in self._named_tracks:
            new_track = self._create_track(track_type)
            self.data["tracks"].append(new_track)
            self._named_tracks[key] = new_track
            
        return self._named_tracks[key]

    def _to_ms(self, seconds):
        """초를 마이크로초(Microseconds)로 변환"""
        return int(seconds * 1000000)

    def add_video_segment(self, file_path, duration_sec, start_time_sec=None):
        """비디오/이미지 세그먼트 추가"""
        mat_id = str(uuid.uuid4()).upper()
        name = os.path.basename(file_path)
        duration_ms = self._to_ms(duration_sec)
        
        # 1. Materials 추가
        self.data["materials"]["videos"].append({
            "id": mat_id,
            "path": file_path.replace("\\", "/"),
            "name": name,
            "duration": duration_ms,
            "type": "video" if file_path.endswith(('.mp4', '.mov')) else "photo"
        })
        
        # 2. Track Segment 추가
        start_ms = self._to_ms(start_time_sec) if start_time_sec is not None else self.duration
        segment = {
            "id": str(uuid.uuid4()).upper(),
            "material_id": mat_id,
            "render_index": 0,
            "source_timerange": {"duration": duration_ms, "start": 0},
            "target_timerange": {"duration": duration_ms, "start": start_ms},
            "type": "video"
        }
        self.video_track["segments"].append(segment)
        
        # 전체 길이 업데이트
        if start_time_sec is None:
            self.duration += duration_ms
        else:
            self.duration = max(self.duration, start_ms + duration_ms)
            
        return mat_id

    def add_audio_segment(self, file_path, duration_sec, start_time_sec=0):
        """오디오(TTS/BGM) 세그먼트 추가"""
        mat_id = str(uuid.uuid4()).upper()
        duration_ms = self._to_ms(duration_sec)
        start_ms = self._to_ms(start_time_sec)
        
        self.data["materials"]["audios"].append({
            "id": mat_id,
            "path": file_path.replace("\\", "/"),
            "name": os.path.basename(file_path),
            "duration": duration_ms,
            "type": "extract_music"
        })
        
        segment = {
            "id": str(uuid.uuid4()).upper(),
            "material_id": mat_id,
            "source_timerange": {"duration": duration_ms, "start": 0},
            "target_timerange": {"duration": duration_ms, "start": start_ms},
            "type": "audio"
        }
        self.audio_track["segments"].append(segment)
        return mat_id

    def add_text_segment(self, content, start_time_sec, duration_sec, transform_y=0.0, track_name="text", render_index=1000):
        """자막/텍스트 세그먼트 추가"""
        mat_id = str(uuid.uuid4()).upper()

        text_content = {
            "text": content,
            "styles": [{"range": [0, len(content)], "size": 15}]
        }

        self.data["materials"]["texts"].append({
            "id": mat_id,
            "content": json.dumps(text_content, ensure_ascii=False),
            "type": "text"
        })

        start_ms = self._to_ms(start_time_sec)
        duration_ms = self._to_ms(duration_sec)

        segment = {
            "id": str(uuid.uuid4()).upper(),
            "material_id": mat_id,
            "target_timerange": {"duration": duration_ms, "start": start_ms},
            "type": "text",
            "render_index": render_index
        }
        
        track = self._get_track("text", track_name)
        track["segments"].append(segment)
        return mat_id

    def parse_and_add_srt(self, srt_path, transform_y=0.3, track_name="dub_subtitle", render_index=1000):
        if not os.path.exists(srt_path):
            return
        
        with open(srt_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        blocks = content.split('\n\n')
        for block in blocks:
            lines = block.strip().split('\n')
            if len(lines) >= 3:
                times = lines[1].split(' --> ')
                if len(times) == 2:
                    def ts2sec(ts):
                        h, m, s = ts.split(':')
                        s, ms = s.split(',')
                        return int(h)*3600 + int(m)*60 + int(s) + int(ms)/1000.0
                    
                    try:
                        start_sec = ts2sec(times[0])
                        end_sec = ts2sec(times[1])
                        text = "\n".join(lines[2:])
                        self.add_text_segment(text, start_sec, end_sec - start_sec, transform_y=transform_y, track_name=track_name, render_index=render_index)
                    except Exception as e:
                        print('SRT Parse error:', e)

    def generate_local_project(self, target_folder, source_media_paths):
        """
        안정성을 위해 Timelines 폴더 구조를 강제로 만들지 않고, 
        draft_content.json 파일만 생성한 뒤 레지스트리에 등록합니다.
        캡컷이 자체적으로 폴더 구조를 마이그레이션합니다.
        """
        os.makedirs(target_folder, exist_ok=True)
        resources_folder = os.path.join(target_folder, "Resources")
        os.makedirs(resources_folder, exist_ok=True)

        media_map = {}
        for src_path in source_media_paths:
            if not src_path or not os.path.exists(src_path): continue
            filename = os.path.basename(src_path)
            dst_path = os.path.join(target_folder, filename)
            shutil.copy2(src_path, dst_path)
            media_map[src_path] = dst_path.replace("\\", "/")
            media_map[src_path.replace("\\", "/")] = dst_path.replace("\\", "/")

        for video in self.data["materials"]["videos"]:
            old_path = video.get("path", "")
            if old_path in media_map: video["path"] = media_map[old_path]

        for audio in self.data["materials"]["audios"]:
            old_path = audio.get("path", "")
            if old_path in media_map: audio["path"] = media_map[old_path]

        self.data["duration"] = self.duration

        # ─────────────────────────────────────────────
        # 1. draft_content.json (핵심 프로젝트 데이터)
        # ─────────────────────────────────────────────
        json_path = os.path.join(target_folder, "draft_content.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=4, ensure_ascii=False)

        # ─────────────────────────────────────────────
        # 2. draft_meta_info.json (프로젝트 메타정보)
        # ─────────────────────────────────────────────
        import time
        now_us = int(time.time() * 1000000)
        target_folder_forward = target_folder.replace("\\", "/")
        root_path_forward = os.path.dirname(target_folder).replace("\\", "/")

        # materials 목록 구성 (draft_materials에 영상 정보 포함)
        video_materials = []
        for v in self.data.get("materials", {}).get("videos", []):
            video_materials.append({
                "ai_group_type": "",
                "create_time": 0,
                "duration": v.get("duration", self.duration),
                "enter_from": 0,
                "extra_info": v.get("material_name", ""),
                "file_Path": v.get("path", ""),
                "height": v.get("height", 1920),
                "id": v.get("id", ""),
                "import_time": v.get("import_time", int(time.time())),
                "import_time_ms": -1,
                "item_source": 1,
                "md5": "",
                "metetype": "photo",
                "roughcut_time_range": {"duration": v.get("duration", self.duration), "start": 0},
                "sub_time_range": {"duration": -1, "start": -1},
                "type": 0,
                "width": v.get("width", 1080)
            })

        meta_info = {
            "cloud_draft_cover": False,
            "cloud_draft_sync": False,
            "cloud_package_completed_time": "",
            "draft_cloud_capcut_purchase_info": "",
            "draft_cloud_last_action_download": False,
            "draft_cloud_package_type": "",
            "draft_cloud_purchase_info": "",
            "draft_cloud_template_id": "",
            "draft_cloud_tutorial_info": "",
            "draft_cloud_videocut_purchase_info": "",
            "draft_cover": "draft_cover.jpg",
            "draft_deeplink_url": "",
            "draft_enterprise_info": {
                "draft_enterprise_extra": "",
                "draft_enterprise_id": "",
                "draft_enterprise_name": "",
                "enterprise_material": []
            },
            "draft_fold_path": target_folder_forward,
            "draft_id": self.project_id,
            "draft_is_ae_produce": False,
            "draft_is_ai_packaging_used": False,
            "draft_is_ai_shorts": False,
            "draft_is_ai_translate": False,
            "draft_is_article_video_draft": False,
            "draft_is_cloud_temp_draft": False,
            "draft_is_from_deeplink": "false",
            "draft_is_invisible": False,
            "draft_is_web_article_video": False,
            "draft_materials": [
                {"type": 0, "value": video_materials},
                {"type": 1, "value": []},
                {"type": 2, "value": []},
                {"type": 3, "value": []},
                {"type": 6, "value": []},
                {"type": 7, "value": []},
                {"type": 8, "value": []}
            ],
            "draft_materials_copied_info": [],
            "draft_name": self.project_name,
            "draft_need_rename_folder": False,
            "draft_new_version": "",
            "draft_removable_storage_device": "",
            "draft_root_path": root_path_forward,
            "draft_segment_extra_info": [],
            "draft_timeline_materials_size_": 100000,
            "draft_type": "",
            "draft_web_article_video_enter_from": "",
            "tm_draft_cloud_completed": "",
            "tm_draft_cloud_entry_id": -1,
            "tm_draft_cloud_modified": 0,
            "tm_draft_cloud_parent_entry_id": -1,
            "tm_draft_cloud_space_id": -1,
            "tm_draft_cloud_user_id": -1,
            "tm_draft_create": now_us,
            "tm_draft_modified": now_us,
            "tm_draft_removed": 0,
            "tm_duration": self.duration
        }
        meta_path = os.path.join(target_folder, "draft_meta_info.json")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta_info, f, indent=4, ensure_ascii=False)

        # ─────────────────────────────────────────────
        # 3. draft_settings (INI 형식, 확장자 없음)
        # ─────────────────────────────────────────────
        draft_settings_ini = (
            "[PC]\n"
            "platform=windows\n"
            f"fps={int(self.fps)}\n"
            "color_space=0\n"
            "resolution=1080P\n"
        )
        with open(os.path.join(target_folder, "draft_settings"), "w", encoding="utf-8") as f:
            f.write(draft_settings_ini)

        # ─────────────────────────────────────────────
        # 4. draft_biz_config.json (빈 파일)
        # ─────────────────────────────────────────────
        with open(os.path.join(target_folder, "draft_biz_config.json"), "w", encoding="utf-8") as f:
            f.write("")

        # ─────────────────────────────────────────────
        # 5. draft_agency_config.json
        # ─────────────────────────────────────────────
        agency_config = {
            "is_auto_agency_enabled": False,
            "is_auto_agency_popup": False,
            "is_single_agency_mode": False,
            "marterials": None,
            "use_converter": False,
            "video_resolution": 720
        }
        with open(os.path.join(target_folder, "draft_agency_config.json"), "w", encoding="utf-8") as f:
            json.dump(agency_config, f, ensure_ascii=False)

        # ─────────────────────────────────────────────
        # 6. draft_content.json.bak (백업본)
        # ─────────────────────────────────────────────
        with open(os.path.join(target_folder, "draft_content.json.bak"), "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=4, ensure_ascii=False)

        # ─────────────────────────────────────────────
        # 7. draft_virtual_store.json
        # ─────────────────────────────────────────────
        virtual_store = {
            "draft_materials": [],
            "draft_virtual_store": [
                {"type": 0, "value": []},
                {"type": 1, "value": []},
                {"type": 2, "value": []}
            ]
        }
        with open(os.path.join(target_folder, "draft_virtual_store.json"), "w", encoding="utf-8") as f:
            json.dump(virtual_store, f, ensure_ascii=False)

        # ─────────────────────────────────────────────
        # 8. attachment_pc_common.json
        # ─────────────────────────────────────────────
        attachment_common = {
            "ai_packaging_infos": [],
            "ai_packaging_report_info": {
                "caption_id_list": [], "commercial_material": "", "material_source": "",
                "method": "", "page_from": "", "style": "", "task_id": "",
                "text_style": "", "tos_id": "", "video_category": ""
            },
            "broll": {
                "ai_packaging_infos": [],
                "ai_packaging_report_info": {
                    "caption_id_list": [], "commercial_material": "", "material_source": "",
                    "method": "", "page_from": "", "style": "", "task_id": "",
                    "text_style": "", "tos_id": "", "video_category": ""
                }
            },
            "commercial_music_category_ids": [],
            "pc_feature_flag": 0,
            "recognize_tasks": [],
            "reference_lines_config": {
                "horizontal_lines": [], "is_lock": False,
                "is_visible": False, "vertical_lines": []
            },
            "safe_area_type": 0,
            "template_item_infos": [],
            "unlock_template_ids": []
        }
        with open(os.path.join(target_folder, "attachment_pc_common.json"), "w", encoding="utf-8") as f:
            json.dump(attachment_common, f, ensure_ascii=False)

        # ─────────────────────────────────────────────
        # 9. performance_opt_info.json
        # ─────────────────────────────────────────────
        perf_opt = {"manual_cancle_precombine_segs": None, "need_auto_precombine_segs": None}
        with open(os.path.join(target_folder, "performance_opt_info.json"), "w", encoding="utf-8") as f:
            json.dump(perf_opt, f, ensure_ascii=False)

        # ─────────────────────────────────────────────
        # 10. attachment_editing.json
        # ─────────────────────────────────────────────
        with open(os.path.join(target_folder, "attachment_editing.json"), "w", encoding="utf-8") as f:
            json.dump({"attachment_info": []}, f, ensure_ascii=False)

        # ─────────────────────────────────────────────
        # 11. template-2.tmp (draft_content 복사본)
        # ─────────────────────────────────────────────
        with open(os.path.join(target_folder, "template-2.tmp"), "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=4, ensure_ascii=False)

        # ─────────────────────────────────────────────
        # 12. root_meta_info.json 레지스트리 등록
        # ─────────────────────────────────────────────
        try:
            from workers.capcut_registry_manager import CapCutRegistryManager
            registry = CapCutRegistryManager()
            folder_name = os.path.basename(target_folder)
            registry.register_project(
                project_name=self.project_name,
                folder_name=folder_name,
                draft_id=self.project_id,
                duration_ms=self.duration,
                exact_folder_path=target_folder
            )
        except Exception as e:
            print("Registry update failed:", e)

