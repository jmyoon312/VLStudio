
import os
import subprocess
import logging
import random
from app.config import settings

logger = logging.getLogger(__name__)

class MutationEngine:
    """
    Algorithm Mutation Engine: Evades Content ID and pHash fingerprinting
    using Adversarial Noise and Sub-perceptual Distortions.
    """

    def __init__(self):
        self.ffmpeg = settings.FFMPEG_PATH

    def apply_mutation(self, input_path: str, output_path: str, channel_id: str = "default_channel", intensity: float = 0.5):
        """
        [SAIF Phase 4] 고도화된 바이너리 변조 및 정체성 동기화
        - channel_id 기반의 고정 시드 사용
        - 메타데이터 완전 파괴 및 헤더 랜덤화
        """
        import hashlib
        seed_int = int(hashlib.md5(str(channel_id).encode()).hexdigest(), 16) % 1000000
        random.seed(seed_int)
        
        logger.info(f"🧬 [SAIF-P4] Applying DNA-locked mutation to: {input_path} (Seed: {seed_int})")
        
        # 1. 시각적 변조 (채널 고유의 노이즈 패턴)
        noise_str = 1 + (5 * intensity)
        gamma = 1.0 + (random.uniform(-0.01, 0.01) * intensity)
        
        visual_filters = [
            f"noise=alls={noise_str}:allf=t", # DNA-locked temporal noise
            f"eq=gamma={gamma}:saturation={1.0 + (0.02 * intensity)}",
            "format=yuv420p"
        ]
        
        # 2. 오디오 변조
        audio_rate = 44100 + random.randint(-50, 50)
        sonic_filters = [
            f"asetrate={audio_rate},aresample=44100",
            "highpass=f=30,lowpass=f=17000"
        ]

        vf = ",".join(visual_filters)
        af = ",".join(sonic_filters)

        # 3. 메타데이터 위장 (Metadata Spoofing) - 단순 삭제를 넘어 촬영 장비 프로파일 주입
        spoof_profiles = [
            {"make": "Apple", "model": "iPhone 15 Pro", "software": "iOS 17.5.1", "handler": "Core Media Video"},
            {"make": "Samsung", "model": "SM-S928N (Galaxy S24 Ultra)", "software": "Android 14 (OneUI 6.1)", "handler": "Samsung Camera Video Handler"},
            {"make": "Sony", "model": "ILCE-7M4 (A7 IV)", "software": "Sony Cam Firmware Ver 3.00", "handler": "Sony Video Handler"},
            {"make": "Google", "model": "Pixel 8 Pro", "software": "Android 14 (AP1A)", "handler": "Google Camera Video Handler"}
        ]
        # Seed-based deterministic profile selection
        profile = spoof_profiles[seed_int % len(spoof_profiles)]
        
        # 가상의 생성 시간 생성 (현재 시점에서 과거 1~12시간 전 랜덤)
        import datetime
        mock_hours_ago = 1 + (seed_int % 11)
        mock_time = (datetime.datetime.utcnow() - datetime.timedelta(hours=mock_hours_ago))
        creation_time_str = mock_time.strftime("%Y-%m-%dT%H:%M:%SZ")

        cmd = [
            self.ffmpeg, "-y",
            "-i", input_path,
            "-vf", vf,
            "-af", af,
            "-map_metadata", "-1",                     # 모든 기존 메타데이터 완전 소거 (선제 조치)
            "-metadata", f"make={profile['make']}",     # 제조사 위장
            "-metadata", f"model={profile['model']}",   # 카메라 모델명 위장
            "-metadata", f"software={profile['software']}", # 소프트웨어 버전 위장
            "-metadata", f"handler_name={profile['handler']}", # 미디어 렌더러 이름 위장
            "-metadata", f"creation_time={creation_time_str}", # 생성 시간 조작
            "-fflags", "+bitexact",
            "-flags:v", "+bitexact",
            "-flags:a", "+bitexact",
            "-c:v", "libx264", "-crf", "20", "-preset", "faster",
            "-c:a", "aac", "-b:a", "128k",
            output_path
        ]

        try:
            logger.info(f"🚀 [SAIF-P4] Execution: {' '.join(cmd)}")
            subprocess.run(cmd, check=True, capture_output=True)
            logger.info(f"✨ [SAIF-P4] Mutation success: {output_path}")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ [SAIF-P4] Mutation failed: {e.stderr.decode()}")
            return False

    def warp_script(self, original_script: str, channel_id: str) -> str:
        """
        [SAIF Phase 4] 시맨틱 다각화 (Semantic Mutation) 실체화
        - 동일 주제라도 채널별로 어휘와 문장 구조를 20-30% 다르게 변경
        - 클러스터링 감지 원천 차단
        """
        logger.info(f"📝 [SAIF-P4] Semantic warping for channel {channel_id}...")
        
        try:
            # [SAIF-PRO] Intelligence Core 연동 시도
            from app.llm_manager import get_llm_client
            llm = get_llm_client()
            
            prompt = f"""
            [원본 스크립트]:
            {original_script}

            [작업]: 위 스크립트를 채널 '{channel_id}'의 고유한 어조로 재작성하십시오.
            - 의미와 핵심 키워드는 유지하되, 문장 구조와 단어의 30%를 동의어로 교체하십시오.
            - 유튜브의 중복 콘텐츠 필터링을 회피하는 것이 목적입니다.
            - 결과물은 오직 변조된 스크립트 텍스트만 출력하십시오.
            """
            
            warped = llm.generate(prompt)
            if warped and len(warped) > 10:
                logger.info(f"✨ [SAIF-P4] Script warped successfully (Length: {len(warped)})")
                return warped
                
        except Exception as e:
            logger.warning(f"⚠️ [SAIF-P4] LLM Warping failed, using fallback synonym logic: {e}")
            
        # Fallback: 간단한 단어 치환 및 구조 변경 시뮬레이션
        # 실제 운영 환경에선 반드시 LLM을 통해 정교하게 변조되어야 함
        return original_script.replace("추천합니다", "강추드려요").replace("방법은", "팁은")

mutation_engine = MutationEngine()
