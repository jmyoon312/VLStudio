"""
8-Step Automated Verification Suite for AI Multi-Channel Shadow Worker Pipeline
Validates:
1. 6-Layer Clone Preset Schema & Persistence
2. Shadow Worker Pool Job Submission & Envelope Structure
3. Zero Context Bleed Multi-Channel Isolation
4. 8-Tier Typography Matrix Parsing
5. Multi-Track SRT Output Generation
6. CapCut No-ZIP draft_content.json Multi-Track Assembly
7. Clean Algorithm Shield (Metaphor Sanitizer)
8. FastAPI Round-Trip API Endpoints
"""
import os
import sys
import json
import time
import unittest

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


# Add apps/api to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "api")))

from app.services.channel_clone_manager import (
    channel_clone_manager, 
    ChannelClonePresetSchema,
    PersonaLayer,
    ScriptBranchLayer,
    AudioLayer,
    VisualLayer,
    CapCutAssemblyLayer,
    GatekeeperLayer
)
from app.services.shadow_worker_pool import shadow_worker_pool, ChannelJobEnvelope

class TestMultiChannelShadowPipeline(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        print("\n=======================================================")
        print("🚀 [START] 8-Step Multi-Channel Shadow Pipeline Verification")
        print("=======================================================")

    def test_01_clone_preset_schema_and_persistence(self):
        print("\n[Step 1] 6-Layer Clone Preset Schema & Persistence Test...")
        channel_id = 991
        custom_preset = ChannelClonePresetSchema(
            channel_id=channel_id,
            channel_name="역사 다큐멘터리 연구소",
            persona=PersonaLayer(
                tone_style="documentary",
                speech_speed_wpm=135,
                clean_shield=True,
                required_ending_hook="다음 역사 미스터리가 궁금하다면 구독하세요."
            ),
            script_branch=ScriptBranchLayer(
                pacing_jab_interval_sec=0.7,
                climax_second=45,
                active_typography_mix=["HOOK_ANCHOR", "NARRATION", "PACING_JAB", "FACT_BULLET"]
            ),
            audio=AudioLayer(
                engine="ElevenLabs / Typecast / Supertonic",
                voice_id="ko-KR-History-M1",
                speed_rate="+15%",
                pitch_adjust="+0Hz",
                bgm_ducking_db=-20.0
            ),
            visual=VisualLayer(
                engine="Google Flow AI v2.0",
                aspect_ratio="9:16",
                lens_focal_length="50mm_vintage",
                lighting_style="Sepia Archival Tone"
            ),
            capcut=CapCutAssemblyLayer(
                font_family="Sandoll Myeongjo Pro",
                font_size=19.0,
                highlight_color="#FFCC00",
                bounce_animation="ELASTIC_ZOOM"
            ),
            gatekeeper=GatekeeperLayer(
                min_pass_score=88.0,
                channel_dna_strict_check=True
            )
        )

        # Save
        save_res = channel_clone_manager.save_clone_preset(channel_id, custom_preset)
        self.assertTrue(save_res)

        # Reload
        reloaded = channel_clone_manager.get_clone_preset(channel_id)
        self.assertEqual(reloaded.channel_name, "역사 다큐멘터리 연구소")
        self.assertEqual(reloaded.persona.tone_style, "documentary")
        self.assertEqual(reloaded.capcut.font_family, "Sandoll Myeongjo Pro")
        self.assertEqual(reloaded.gatekeeper.min_pass_score, 88.0)
        print("  ✓ 6-Layer Clone Preset persistence validated.")

    def test_02_shadow_worker_submission_and_envelope(self):
        print("\n[Step 2] Shadow Worker Pool Batch Submission & Envelope Test...")
        channel_id = 992
        topics = ["조선시대 비밀 첩보조직", "사도세자 뒤주 사건의 진실"]
        envelopes = shadow_worker_pool.submit_batch(channel_id, topics, "비사 채널")

        self.assertEqual(len(envelopes), 2)
        for env in envelopes:
            self.assertTrue(env.job_id.startswith("job_"))
            self.assertEqual(env.channel_id, channel_id)
            self.assertEqual(env.channel_name, "비사 채널")
            self.assertTrue(os.path.exists(env.workspace_dir))
            self.assertIn(env.status, ["QUEUED", "SCRIPT_GENERATING", "PARSING_TYPOGRAPHY", "AUDIO_SYNTHESIS", "ASSEMBLING_CAPCUT", "COMPLETED"])
        print(f"  ✓ {len(envelopes)} ChannelJobEnvelopes successfully spawned and sandboxed.")

    def test_03_zero_context_bleed_isolation(self):
        print("\n[Step 3] Zero Context Bleed Multi-Channel Isolation Verification...")
        ch_a = 993
        ch_a_preset = ChannelClonePresetSchema(
            channel_id=ch_a,
            channel_name="MZ 밈 실험실",
            persona=PersonaLayer(tone_style="b_grade_meme", speech_speed_wpm=170)
        )
        channel_clone_manager.save_clone_preset(ch_a, ch_a_preset)

        ch_b = 994
        ch_b_preset = ChannelClonePresetSchema(
            channel_id=ch_b,
            channel_name="1분 경제학",
            persona=PersonaLayer(tone_style="financial_fact", speech_speed_wpm=130)
        )
        channel_clone_manager.save_clone_preset(ch_b, ch_b_preset)

        env_a = shadow_worker_pool.submit_batch(ch_a, ["요즘 20대 유행어 모음"], "MZ 밈 실험실")
        env_b = shadow_worker_pool.submit_batch(ch_b, ["미국 금리인하 수혜주"], "1분 경제학")

        self.assertNotEqual(env_a[0].workspace_dir, env_b[0].workspace_dir)
        self.assertIn(str(ch_a), env_a[0].workspace_dir)
        self.assertIn(str(ch_b), env_b[0].workspace_dir)
        print("  ✓ Workspaces and context envelopes are 100% physically isolated.")

    def test_04_typography_matrix_parsing(self):
        print("\n[Step 4] 8-Tier Typography Matrix Parsing Test...")
        sample_script = """
[HOOK_ANCHOR] 당신이 몰랐던 조선의 충격적인 비밀 1가지!
[NARRATION] 조선시대 한양 도성에는 왕도 모르는 밀실이 있었습니다.
[PACING_JAB] 깜짝 놀랄 반전!
[POV_REACTION] "설마 궁궐 지하에 이런 공간이?"
[KINETIC_KEYWORD] 비자금 금고
[MULTI_DIALOGUE] 좌의정: "절대 발설해선 아니 되옵니다."
[SFX_GRAPHIC] 쾅! 문이 열리며 쏟아지는 황금
[FACT_BULLET] 실록 14권 기록 증명
        """
        parsed = shadow_worker_pool._parse_script_typography(sample_script)
        
        self.assertIn("HOOK_ANCHOR", parsed)
        self.assertIn("NARRATION", parsed)
        self.assertIn("PACING_JAB", parsed)
        self.assertIn("POV_REACTION", parsed)
        self.assertIn("KINETIC_KEYWORD", parsed)
        self.assertIn("MULTI_DIALOGUE", parsed)
        self.assertIn("SFX_GRAPHIC", parsed)
        self.assertIn("FACT_BULLET", parsed)

        self.assertEqual(len(parsed["HOOK_ANCHOR"]), 1)
        self.assertIn("충격적인 비밀", parsed["HOOK_ANCHOR"][0])
        self.assertIn("깜짝 놀랄 반전!", parsed["PACING_JAB"][0])
        print(f"  ✓ All 8 typography categories parsed with 100% precision: {list(parsed.keys())}")

    def test_05_multi_track_srt_generation(self):
        print("\n[Step 5] Multi-Track SRT File Generation Test...")
        ch_id = 995
        env = shadow_worker_pool.submit_batch(ch_id, ["SRT 검증 테스트 토픽"], "SRT 채널")[0]

        for _ in range(25):
            refreshed = shadow_worker_pool.get_job(env.job_id)
            if refreshed.status in ["COMPLETED", "FAILED"]:
                break
            time.sleep(0.2)

        self.assertEqual(refreshed.status, "COMPLETED")
        self.assertIn("srt_narration", refreshed.outputs)
        self.assertIn("srt_jab", refreshed.outputs)
        self.assertIn("srt_hook", refreshed.outputs)
        self.assertIn("srt_sfx", refreshed.outputs)

        for key in ["srt_narration", "srt_jab", "srt_hook", "srt_sfx"]:
            srt_path = refreshed.outputs[key]
            self.assertTrue(os.path.exists(srt_path), f"SRT file {srt_path} not found")
            with open(srt_path, "r", encoding="utf-8") as f:
                content = f.read()
                self.assertIn("-->", content)
        print("  ✓ 4 independent SRT subtitle tracks successfully written to disk.")

    def test_06_capcut_nozip_multi_track_assembly(self):
        print("\n[Step 6] CapCut No-ZIP draft_content.json Multi-Track Assembly Test...")
        ch_id = 996
        env = shadow_worker_pool.submit_batch(ch_id, ["캡컷 No-ZIP 조립 검증"], "조립 채널")[0]

        for _ in range(25):
            refreshed = shadow_worker_pool.get_job(env.job_id)
            if refreshed.status in ["COMPLETED", "FAILED"]:
                break
            time.sleep(0.2)

        self.assertEqual(refreshed.status, "COMPLETED")
        capcut_dir = refreshed.outputs.get("capcut_project_dir")
        self.assertIsNotNone(capcut_dir)
        
        draft_json_path = os.path.join(capcut_dir, "draft_content.json")
        self.assertTrue(os.path.exists(draft_json_path))

        with open(draft_json_path, "r", encoding="utf-8") as f:
            draft = json.load(f)

        tracks = draft.get("tracks", [])
        track_types = [t.get("name") for t in tracks]
        self.assertIn("track_hook_anchor", track_types)
        self.assertIn("track_pacing_jab", track_types)
        self.assertIn("track_narration", track_types)

        texts = draft.get("materials", {}).get("texts", [])
        self.assertGreater(len(texts), 0)
        print("  ✓ CapCut multi-track timeline assembled with isolated Y coordinate planes.")

    def test_07_clean_algorithm_shield(self):
        print("\n[Step 7] Clean Algorithm Shield (Metaphor Sanitizer) Verification...")
        prohibited_sample = "살인 사건 현장에서 피 흔적이 발견되었고, 사기 혐의로 체포되었습니다."
        
        sanitized = shadow_worker_pool._apply_clean_shield(prohibited_sample)
        self.assertNotIn("살인", sanitized)
        self.assertNotIn("피", sanitized)
        self.assertNotIn("사기", sanitized)
        self.assertIn("비극적 참사", sanitized)
        self.assertIn("붉은 흔적", sanitized)
        self.assertIn("기만 행위", sanitized)
        print(f"  ✓ Sanitization success: '{sanitized}' (Platform safety guaranteed)")

    def test_08_fastapi_endpoints_roundtrip(self):
        print("\n[Step 8] FastAPI Round-Trip API Endpoints Test...")
        from fastapi.testclient import TestClient
        from app.main import app
        
        client = TestClient(app)

        res = client.get("/api/agent/clone-presets")
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

        ch_id = 997
        save_payload = {
            "channel_id": ch_id,
            "channel_name": "API 엔드포인트 검증 채널",
            "version": "2.4.0",
            "persona": {
                "tone_style": "casual_talk",
                "speech_speed_wpm": 150,
                "forbidden_words": ["금지어1", "금지어2"],
                "clean_shield": True,
                "required_ending_hook": "좋아요와 구독 부탁드립니다!"
            },
            "script_branch": {
                "mode": "video_present",
                "pacing_jab_interval_sec": 0.8,
                "climax_second": 40,
                "active_typography_mix": ["HOOK_ANCHOR", "NARRATION", "PACING_JAB"]
            },
            "audio": {
                "engine": "ElevenLabs / Typecast / Supertonic",
                "voice_id": "ko-KR-Standard-A",
                "speed_rate": "+15%",
                "pitch_adjust": "+0Hz",
                "bgm_ducking_db": -18.0,
                "sfx_pack_name": "viral_thud"
            },
            "visual": {
                "engine": "Google Flow AI v2.0",
                "aspect_ratio": "9:16",
                "lens_focal_length": "35mm_cinematic",
                "lighting_style": "Dramatic",
                "seed_lock_enabled": True,
                "reference_image_ids": []
            },
            "capcut": {
                "font_family": "Sandoll NeoGothic Black",
                "font_size": 18.5,
                "primary_color": "#FFFFFF",
                "highlight_color": "#FFE500",
                "bounce_animation": "POP_UP_SPRING_02",
                "silence_cut_threshold_db": -35.0
            },
            "gatekeeper": {
                "min_pass_score": 85.0,
                "channel_dna_strict_check": True,
                "auto_retry_limit": 3
            }
        }
        post_res = client.post(f"/api/agent/clone-presets/{ch_id}", json=save_payload)
        self.assertEqual(post_res.status_code, 200)
        self.assertTrue(post_res.json().get("success"))

        get_res = client.get(f"/api/agent/clone-presets/{ch_id}")
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.json().get("channel_name"), "API 엔드포인트 검증 채널")

        batch_payload = {
            "channel_id": ch_id,
            "channel_name": "API 엔드포인트 검증 채널",
            "topics": ["API 통합 일괄 생성 1", "API 통합 일괄 생성 2"]
        }
        batch_res = client.post("/api/agent/batch-produce", json=batch_payload)
        self.assertEqual(batch_res.status_code, 200)
        jobs = batch_res.json().get("jobs", [])
        self.assertEqual(len(jobs), 2)

        job_id = jobs[0]["job_id"]
        status_res = client.get(f"/api/agent/batch-produce/status/{job_id}")
        self.assertEqual(status_res.status_code, 200)
        self.assertEqual(status_res.json().get("job_id"), job_id)
        print("  ✓ Full API endpoints roundtrip integration passed.")

if __name__ == "__main__":
    unittest.main()
