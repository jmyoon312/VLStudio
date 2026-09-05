import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional

logger = logging.getLogger("pipeline_engine")

class PipelineEngine:
    """
    Modular LEGO-Block Pipeline Engine for ViraLoop Studio.
    Supports 6 standard production presets plus unlimited user-defined pipelines.
    """
    def __init__(self, base_dir: Optional[str] = None):
        if not base_dir:
            project_root = Path(__file__).resolve().parent.parent.parent.parent
            self.pipelines_dir = project_root / "data" / "pipelines"
        else:
            self.pipelines_dir = Path(base_dir)

        self._ensure_initialized()

    def _ensure_initialized(self):
        try:
            self.pipelines_dir.mkdir(parents=True, exist_ok=True)
            standard_presets = [
                {
                    "id": "one_take_hook",
                    "name": "원테이크 퀵후킹형",
                    "category": "shorts_fast",
                    "description": "해외 바이럴 영상을 상하단 블러 및 3초 후킹 자막으로 최소 가공하여 고속 대량 양산",
                    "nodes": [
                        {"id": "source_ingest", "type": "url_download", "title": "영상 소스 수집"},
                        {"id": "canvas_resize", "type": "blur_canvas_916", "title": "9:16 상하단 블러 레이아웃"},
                        {"id": "hook_subtitle", "type": "hook_overlay", "title": "3초 후킹 자막 및 배속 최적화"},
                        {"id": "capcut_pack", "type": "capcut_assemble", "title": "CapCut 프로젝트 조립"},
                        {"id": "queue_dispatch", "type": "work_queue_enqueue", "title": "WorkQueue 배포 대기열 탑재"}
                    ]
                },
                {
                    "id": "music_beat_sync",
                    "name": "음악 비트싱크형",
                    "category": "shorts_aesthetic",
                    "description": "무음 구간을 자동 컷팅하고 트렌드 BGM 비트에 맞춰 씬 전환을 동기화하는 감성형 쇼츠",
                    "nodes": [
                        {"id": "source_ingest", "type": "url_download", "title": "영상 소스 수집"},
                        {"id": "silence_cut", "type": "silence_remover", "title": "무음 구간 초정밀 자동 컷팅"},
                        {"id": "bgm_sync", "type": "bgm_beat_sync", "title": "트렌드 음원 비트 매핑"},
                        {"id": "capcut_pack", "type": "capcut_assemble", "title": "CapCut 프로젝트 조립"},
                        {"id": "queue_dispatch", "type": "work_queue_enqueue", "title": "WorkQueue 배포 대기열 탑재"}
                    ]
                },
                {
                    "id": "script_commentary",
                    "name": "대본 해설/리캡형",
                    "category": "shorts_story",
                    "description": "원본 음성을 Whisper로 추출하여 AI가 팩트 각색 후 MultiTTS 나레이션과 자막을 싱크하는 스토리 쇼츠",
                    "nodes": [
                        {"id": "source_ingest", "type": "url_download", "title": "영상 소스 수집"},
                        {"id": "whisper_extract", "type": "whisper_stt", "title": "Whisper 음성 대본 전사"},
                        {"id": "script_rewrite", "type": "llm_script_rewrite", "title": "AI 바이럴 대본 각색 (OmniRoute)"},
                        {"id": "tts_generate", "type": "multitts_voice", "title": "MultiTTS 다국어 보이스 합성"},
                        {"id": "sub_sync", "type": "timeline_subtitle_sync", "title": "자막 타임코드 싱크"},
                        {"id": "capcut_pack", "type": "capcut_assemble", "title": "CapCut 프로젝트 조립"},
                        {"id": "queue_dispatch", "type": "work_queue_enqueue", "title": "WorkQueue 배포 대기열 탑재"}
                    ]
                },
                {
                    "id": "movie_drama_highlight",
                    "name": "영화/드라마 롱폼 컷팅형",
                    "category": "long_to_short",
                    "description": "스마트 씬 분할(SceneCutter)을 통해 롱폼에서 30~60초 명장면을 자동 추출하여 해설을 입히는 리뷰 쇼츠",
                    "nodes": [
                        {"id": "source_ingest", "type": "local_or_url", "title": "롱폼 원본 수집"},
                        {"id": "scene_detect", "type": "scene_cutter", "title": "스마트 씬 분할 및 하이라이트 감지"},
                        {"id": "hook_script", "type": "llm_review_script", "title": "결말포함 리뷰 대본 생성"},
                        {"id": "tts_generate", "type": "multitts_voice", "title": "해설자 MultiTTS 합성"},
                        {"id": "capcut_pack", "type": "capcut_assemble", "title": "CapCut 프로젝트 조립"},
                        {"id": "queue_dispatch", "type": "work_queue_enqueue", "title": "WorkQueue 배포 대기열 탑재"}
                    ]
                },
                {
                    "id": "full_generative_ai",
                    "name": "AI 완전 창작 생성형",
                    "category": "pure_creation",
                    "description": "주제 입력만으로 대본 기획부터 Google Flow AI 비주얼 렌더 및 캡컷 조립까지 무인 완결",
                    "nodes": [
                        {"id": "prompt_craft", "type": "topic_to_story", "title": "주제 분석 및 9-Wave 대본 기획"},
                        {"id": "critic_check", "type": "viral_critic_gate", "title": "바이럴 비평가 85점 품질 검수"},
                        {"id": "tts_generate", "type": "multitts_voice", "title": "MultiTTS 나레이션 생성"},
                        {"id": "flow_render", "type": "flow_ai_batch", "title": "Google Flow AI 씬별 이미지/비디오 렌더"},
                        {"id": "capcut_pack", "type": "capcut_assemble", "title": "CapCut 프로젝트 조립"},
                        {"id": "queue_dispatch", "type": "work_queue_enqueue", "title": "WorkQueue 배포 대기열 탑재"}
                    ]
                },
                {
                    "id": "hybrid_longform",
                    "name": "하이브리드 멀티소스 롱폼",
                    "category": "longform",
                    "description": "수집 컷팅 영상과 Flow AI 클립, 스톡 자료를 한 타임라인에 다중 트랙으로 교차 조립하는 5~15분 롱폼",
                    "nodes": [
                        {"id": "long_outline", "type": "longform_chapter_plan", "title": "챕터별 롱폼 대본 기획"},
                        {"id": "multi_source", "type": "hybrid_asset_collector", "title": "수집 영상 컷 + Flow AI 씬 동시 취합"},
                        {"id": "tts_long", "type": "multitts_voice", "title": "장편 음성 합성"},
                        {"id": "capcut_pack", "type": "capcut_assemble_multitrack", "title": "CapCut 멀티트랙 타임라인 조립"},
                        {"id": "queue_dispatch", "type": "work_queue_enqueue", "title": "WorkQueue 배포 대기열 탑재"}
                    ]
                }
            ]

            for preset in standard_presets:
                preset_path = self.pipelines_dir / f"{preset['id']}.json"
                if not preset_path.exists():
                    preset_path.write_text(json.dumps(preset, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as e:
            logger.error(f"[PipelineEngine] Init error: {e}")

    def list_pipelines(self) -> List[Dict[str, Any]]:
        pipelines = []
        if self.pipelines_dir.exists():
            for f in self.pipelines_dir.glob("*.json"):
                try:
                    data = json.loads(f.read_text(encoding="utf-8"))
                    pipelines.append(data)
                except Exception:
                    continue
        return pipelines

    def get_pipeline(self, pipeline_id: str) -> Optional[Dict[str, Any]]:
        p = self.pipelines_dir / f"{pipeline_id}.json"
        if p.exists():
            try:
                return json.loads(p.read_text(encoding="utf-8"))
            except Exception:
                return None
        return None

    def save_pipeline(self, pipeline_data: Dict[str, Any]) -> Dict[str, Any]:
        p_id = pipeline_data.get("id") or f"custom_{int(os.path.getmtime(self.pipelines_dir))}"
        pipeline_data["id"] = p_id
        p = self.pipelines_dir / f"{p_id}.json"
        p.write_text(json.dumps(pipeline_data, ensure_ascii=False, indent=2), encoding="utf-8")
        return pipeline_data

    def delete_pipeline(self, pipeline_id: str) -> bool:
        p = self.pipelines_dir / f"{pipeline_id}.json"
        if p.exists():
            p.unlink()
            return True
        return False

    def run_pipeline(self, pipeline_id: str, input_params: Dict[str, Any]) -> Dict[str, Any]:
        pipeline = self.get_pipeline(pipeline_id)
        if not pipeline:
            raise ValueError(f"Pipeline '{pipeline_id}' not found.")

        nodes = pipeline.get("nodes", [])
        logger.info(f"🚀 [PipelineEngine] Executing pipeline: {pipeline.get('name')} with {len(nodes)} nodes")
        
        # Returns simulated telemetry execution run
        return {
            "status": "started",
            "pipeline_id": pipeline_id,
            "pipeline_name": pipeline.get("name"),
            "total_nodes": len(nodes),
            "input_params": input_params,
            "message": f"'{pipeline.get('name')}' 파이프라인이 백그라운드 런타임에 성공적으로 투입되었습니다."
        }

pipeline_engine = PipelineEngine()
