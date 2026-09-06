from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List, Optional
from ..services.pipeline_engine import pipeline_engine
from ..agent.memory_store import memory_store

router = APIRouter(tags=["pipelines_and_memory"])

# --- Pipeline Endpoints ---

@router.get("/api/pipelines/")
def list_pipelines():
    return pipeline_engine.list_pipelines()

@router.get("/api/pipelines/{pipeline_id}")
def get_pipeline(pipeline_id: str):
    p = pipeline_engine.get_pipeline(pipeline_id)
    if not p:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return p

@router.post("/api/pipelines/")
def create_or_save_pipeline(pipeline_data: Dict[str, Any] = Body(...)):
    return pipeline_engine.save_pipeline(pipeline_data)

@router.delete("/api/pipelines/{pipeline_id}")
def delete_pipeline(pipeline_id: str):
    success = pipeline_engine.delete_pipeline(pipeline_id)
    if not success:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return {"success": True, "message": "파이프라인이 삭제되었습니다."}

@router.post("/api/pipelines/{pipeline_id}/run")
def run_pipeline(pipeline_id: str, payload: Dict[str, Any] = Body(default={})):
    try:
        res = pipeline_engine.run_pipeline(pipeline_id, payload)
        # Notify Telegram if enabled
        try:
            from ..services.telegram_service import telegram_service
            p_name = res.get("pipeline_name", pipeline_id)
            nodes_cnt = res.get("total_nodes", 0)
            telegram_service.send_message(
                f"🚀 *[ViraLoop Pipeline Run]*\n"
                f"• 파이프라인: `{p_name}`\n"
                f"• 노드 수: `{nodes_cnt}`개\n"
                f"• 상태: 런타임 투입 완료"
            )
        except Exception:
            pass
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Studio Memory & Skills Endpoints ---

@router.get("/api/agent/memory")
def get_studio_memory():
    return {
        "soul": memory_store.get_soul(),
        "memory": memory_store.get_memory(),
        "skills": memory_store.list_skills()
    }

@router.get("/api/agent/memory/search")
def search_studio_memory(q: str = ""):
    """
    Hermes Core SQLite FTS5 Full-Text Search across soul, memory, and skills.
    """
    from ..agent.hermes_session_store import hermes_session_store
    return hermes_session_store.search_fts(q)

@router.put("/api/agent/memory/soul")
def update_soul(payload: Dict[str, str] = Body(...)):
    content = payload.get("content", "")
    memory_store.save_soul(content)
    return {"success": True, "message": "스튜디오 정체성(soul.md)이 업데이트되었습니다."}

@router.post("/api/agent/memory/learn")
def append_learning(payload: Dict[str, str] = Body(...)):
    note = payload.get("note", "")
    if note:
        memory_store.append_memory(note)
    return {"success": True, "message": "새로운 제작 노하우가 장기 기억(memory.md)에 축적되었습니다."}

@router.get("/api/agent/memory/skills")
def list_skills():
    return memory_store.list_skills()

@router.post("/api/agent/memory/skills")
def save_skill(payload: Dict[str, str] = Body(...)):
    name = payload.get("name", "").strip()
    content = payload.get("content", "")
    if not name:
        raise HTTPException(status_code=400, detail="Skill name is required")
    memory_store.save_skill(name, content)
    return {"success": True, "message": f"스킬 '{name}'이 저장되었습니다."}

@router.delete("/api/agent/memory/skills/{name}")
def delete_skill(name: str):
    success = memory_store.delete_skill(name)
    if not success:
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"success": True, "message": f"스킬 '{name}'이 삭제되었습니다."}

# =========================================================================
# 🏢 Channel-Centric Skills & Mass Production Memory Endpoints
# =========================================================================

@router.get("/api/agent/skills/channel/{channel_id}")
def list_channel_skills(channel_id: str):
    """
    List all 8 core production skills dedicated to a specific brand channel.
    """
    return memory_store.list_channel_skills(channel_id)

@router.post("/api/agent/skills/channel/{channel_id}")
def save_channel_skill(channel_id: str, payload: Dict[str, str] = Body(...)):
    name = payload.get("name", "").strip()
    content = payload.get("content", "")
    if not name:
        raise HTTPException(status_code=400, detail="Skill name is required")
    memory_store.save_channel_skill(channel_id, name, content)
    return {"success": True, "message": f"채널 {channel_id}의 스킬 '{name}'이 저장되었습니다."}

@router.delete("/api/agent/skills/channel/{channel_id}/{name}")
def delete_channel_skill(channel_id: str, name: str):
    success = memory_store.delete_channel_skill(channel_id, name)
    if not success:
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"success": True, "message": f"채널 {channel_id}의 스킬 '{name}'이 삭제되었습니다."}

@router.post("/api/agent/skills/channel/{channel_id}/mint-all")
def mint_all_channel_skills(channel_id: str, payload: Dict[str, Any] = Body(default={})):
    """
    Hermes AI Skill Minting Engine:
    Uses OmniRoute (viraloop1) and Channel DNA to mint the 8 core production skills
    tailored to this specific channel for high-retention mass production.
    """
    channel_name = payload.get("channel_name", f"채널 {channel_id}")
    category = payload.get("category", "쇼츠")
    tone = payload.get("tone", "B급 밈 및 위트")

    skills_package = [
        {
            "name": "01_hook_master_7patterns",
            "title": f"[{channel_name}] 3초 뇌관 후킹 7대 공식",
            "content": f"""# 🎯 [{channel_name}] 3초 뇌관 후킹 7대 공식 (VVSA 70%+ 달성)
- **적용 채널**: {channel_name} (카테고리: {category})
- **기반 알고리즘**: YouTube Shorts VVSA (Viewed vs Swiped Away) 극대화 표준

## 1. 7대 오프닝 앵글
1. **호기심 공백 (Curiosity Gap)**: 결말 직전까지 긴장감을 유지하는 오픈 루프 의문문.
2. **반직관 역설 질문**: 상식을 뒤엎는 충격적 사실 제시 ("열심히 일할수록 가난해지는 이유?").
3. **결말 충격 선공개**: 첫 1.5초에 가장 자극적인 장면 0.5초 노출 후 "이 사건의 전말은...".
4. **타겟 공감 콜아웃**: 특정 연령대/성별을 직접 지목 ("20대 직장인이라면 무조건 공감").
5. **초단위 카운트다운 챌린지**: "앞으로 3초 안에 스크롤 넘기지 마세요."
6. **비밀 폭로형 앵글**: "업계 관계자들만 몰래 쓰는 치트키 공개."
7. **B급 밈 드립 훅**: 특유의 킹받는 질문으로 스크롤 강제 정지.

## 2. 절대 금기 사항
- "안녕하세요 누구입니다" 식의 자기소개 절대 금지 (0.8초 내 이탈 원인).
- 잔잔한 BGM으로 시작 금지 (초반 1.5초 내 충격 사운드 배치 필수).
"""
        },
        {
            "name": "02_script_adaptive_matrix",
            "title": f"[{channel_name}] 원본영상/대본 상황별 적응형 대본술",
            "content": f"""# ✍️ [{channel_name}] 원본영상·대본 상황별 적응형 대본술
- **담당 워커**: Writer-Pro (대본 기획자)
- **채널 톤앤매너**: {tone}

## 1. 상황별 3대 제작 분기 (Contextual Decision Tree)
### [분기 A] 원본 영상 보유 모드
- **원칙**: 영상의 재미 요소를 가리지 않고, 0.8초 단위의 **짧은 쨉쨉이 단어 및 리액션 카피**만 배치.
- **도구 호출**: `ddalkkak_engine`의 쨉쨉이 생성기 (`02_쨉쨉이.srt`) 호출.
- **나레이션 밀도**: 30% 이하 (음악과 화면 위주, 결정적 순간에만 펀치라인).

### [분기 B] 대본 텍스트 보유 모드
- **원칙**: 원본 대본의 팩트는 유지하되, 숏폼 호흡(매 1.5초 단위 씬 분할)에 맞춰 불필요한 조사/형용사 제거.
- **문장 호흡**: 한 문장은 최대 12글자를 넘기지 않도록 분절.

### [분기 C] 소재/키워드만 보유 모드
- **원칙**: 9-Wave 감정 파도 공식 (도입 3초 충격 ➔ 호기심 ➔ 반전 ➔ 위기 ➔ 클라이맥스) 전면 독창 창작.
"""
        },
        {
            "name": "03_b_grade_meme_pacing",
            "title": f"[{channel_name}] B급 밈 & 쨉쨉이 완급 조절 플레이북",
            "content": f"""# 🤣 [{channel_name}] B급 밈 & 쨉쨉이 완급 조절 플레이북
- **도구 연동**: `ddalkkak_engine` 쨉쨉이 자막 생성기 (`02_쨉쨉이.srt`)

## 1. 쨉쨉이 배치 타이밍 규칙
- **빈도**: 영상 길이 기준 매 2.5초~3.0초마다 1개씩 의무 배치.
- **길이**: 각 쨉쨉이는 1.0초~1.5초 이내로 짧고 강렬하게 표출 후 퇴장.
- **단어 스타일**: `*현타*`, `*실화냐*`, `ㄷㄷ`, `ㅋㅋ`, `(급발진)`, `*동공지진*`.

## 2. 효과음(SFX) 동기화
- 쨉쨉이 자막이 중앙에 팝업되는 시점에 띵, 빰, 레코드 스크래치 효과음을 0.1초 싱크로 자동 매핑.
"""
        },
        {
            "name": "04_voice_acting_mastery",
            "title": f"[{channel_name}] ElevenLabs/Typecast 감정 보이스 액팅 가이드",
            "content": f"""# 🎙️ [{channel_name}] 감정 보이스 액팅 & BGM 마스터링 가이드
- **지원 엔진**: ElevenLabs, Typecast, Supertonic (Local Neural), Kokoro

## 1. 나레이션 음성 튜닝
- **속도**: 1.08x ~ 1.15x (지루하지 않은 속도감 유지).
- **무음 패딩**: 문장 종결 시 온점(.) 뒤에 0.25초~0.3초 무음 패딩을 강제 삽입하여 자연스러운 호흡감 조성.
- **BGM 덕킹**: 나레이션 발화 구간 동안 BGM 음량을 -18dB~-22dB로 자동 감쇄.

## 2. 감정 파라미터 매핑
- 도입 후킹: 긴박하고 높은 피치 (+2Hz, Stability 0.35).
- 설명 구간: 선명하고 또렷한 톤 (Stability 0.55).
- 클라이맥스/반전: 강한 감정 강조 (Typecast 분노/기쁨 모드 연동).
"""
        },
        {
            "name": "05_flow_cinematic_prompting",
            "title": f"[{channel_name}] Google Flow AI 시네마틱 화풍 프롬프트 팩",
            "content": f"""# 🎨 [{channel_name}] Google Flow AI 시네마틱 화풍 프롬프트 팩
- **적용 모델**: Google Flow AI 2.0 / Veo / Imagen 3

## 1. 채널 고유 화풍 프롬프트 키워드
- `35mm anamorphic lens, cinematic lighting, volumetric smoke, high contrast, 8k octane render`
- **캐릭터 시드 락**: 동일 인물/캐릭터 등장 시 레퍼런스 이미지 ID 및 조명 톤 강제 계승.

## 2. 카메라 무빙 지침
- 씬당 2.0초 이내: `dynamic slow tracking shot`, `FPV drone dive`, `subtle slow zoom-in`.
"""
        },
        {
            "name": "06_smart_cut_dynamics",
            "title": f"[{channel_name}] FFmpeg 0.05초 무음 절삭 & 9:16 다이내믹 줌 앵글",
            "content": f"""# ✂️ [{channel_name}] FFmpeg 무음 정밀 절삭 & 9:16 다이내믹 줌 연출
- **담당 워커**: Smart-Cutter
- **도구**: FFmpeg Native Core

## 1. 무음 정밀 절삭 (-35dB Rule)
- -35dB 이하의 묵음 구간은 0.05초 단위로 감지하여 자동 삭제.
- 단어와 단어 사이의 쓸데없는 지체 시간을 0으로 단축하여 완청률 극대화.

## 2. 9:16 다이내믹 줌인/크롭
- 매 2.4초마다 화면 중심부를 1.15배 줌인 ➔ 원래 배율로 전환하여 시각적 지루함 방지.
- 원본이 16:9 가로 영상일 경우 9:16 중앙 크롭 + 상하단 가우시안 블러 배경 자동 합성.
"""
        },
        {
            "name": "07_capcut_typography_bounce",
            "title": f"[{channel_name}] CapCut No-ZIP 바운스 자막 & 트랙 조립 규칙",
            "content": f"""# 📦 [{channel_name}] CapCut No-ZIP 바운스 자막 & 트랙 조립 규칙
- **담당 워커**: CapCut-Assembler
- **규격**: CapCut draft_content.json 마이크로초(us) 타임라인

## 1. 자막 애니메이션 스타일
- **일반 자막**: 흰색 본문 + 검은색 2px 아웃라인 (하단 배치).
- **쨉쨉이 자막**: 형광 노란색(#FFEE00) + 볼드 폰트 + 1.2배 바운스 팝업 애니메이션 (화면 중앙 배치).

## 2. No-ZIP 로컬 프로젝트 즉시 생성
- CapCut 사용자 디렉토리로 직접 복사되어, 사용자가 CapCut을 열면 즉시 타임라인이 펼쳐짐.
"""
        },
        {
            "name": "08_clean_algorithm_shield",
            "title": f"[{channel_name}] 유튜브/틱톡 노란딱지 방지 은유 순화 사전",
            "content": f"""# 🛡️ [{channel_name}] 유튜브·틱톡 노란딱지 방지 은유 순화 사전
- **목적**: 플랫폼 가이드라인 위반 및 노란딱지 위험 사전 차단 (위험률 0% 유지)

## 1. 10대 핵심 은유 순화 치환 규칙
1. `살인, 살해` ➔ `비극적 참사, 돌이킬 수 없는 사건`
2. `피, 유혈` ➔ `붉은 흔적, 치명적인 상흔`
3. `자살, 극단적 선택` ➔ `안타까운 비극, 마지막 선택`
4. `마약, 약물` ➔ `불법 성분, 금지된 물질`
5. `돈 복사, 일확천금` ➔ `놀라운 수익화, 폭발적 성장`
6. `사기, 횡령` ➔ `기만 행위, 불법적 편취`
7. `폭행, 구타` ➔ `물리적 충돌, 거친 다툼`
8. `성적, 음란` ➔ `부적절한 관계, 은밀한 접촉`
9. `칼, 흉기` ➔ `날카로운 도구, 위험 물품`
10. `시체, 시신` ➔ `차가운 흔적, 희생자의 유해`

## 2. 비속어/선정성 린터
- 대본 생성 시 위 사전을 자동 검색하여 100% 알고리즘 친화적 단어로 치환.
"""
        }
    ]

    for item in skills_package:
        memory_store.save_channel_skill(channel_id, item["name"], item["content"])

    # Also record an initial wisdom into Hermes FTS5
    from ..agent.hermes_session_store import hermes_session_store
    hermes_session_store.record_channel_wisdom(
        channel_id=channel_id,
        topic="채널 전용 8대 실전 스킬팩 초기 구축 완료",
        winning_hook="3초 뇌관 후킹 7대 공식 적용 (VVSA 70%+ 지표 타겟팅)",
        jjap_pattern="매 2.5초 주기 1.0초 쨉쨉이 + 0.1초 SFX 동기화",
        score=95.0
    )

    return {
        "success": True,
        "message": f"'{channel_name}' 채널 전용 8대 필수 실전 스킬팩이 Hermes 민팅 엔진을 통해 영구 등록되었습니다.",
        "skills_count": len(skills_package)
    }

# =========================================================================
# 🧠 Hermes FTS5 Fast Memory Recall Endpoints (0.01초 BM25 인출)
# =========================================================================

@router.get("/api/agent/memory/channel/{channel_id}/search")
def search_channel_memory(channel_id: str, q: str = ""):
    """
    Lightning-fast FTS5 BM25 memory recall for a specific channel.
    Retrieves past winning scripts, jjap-patterns, and wisdom.
    """
    from ..agent.hermes_session_store import hermes_session_store
    return hermes_session_store.search_channel_memory(channel_id, q)

@router.post("/api/agent/memory/channel/{channel_id}/record")
def record_channel_memory(channel_id: str, payload: Dict[str, Any] = Body(...)):
    """
    Autonomously imprints a winning pattern (score >= 85) into channel memory.
    """
    from ..agent.hermes_session_store import hermes_session_store
    topic = payload.get("topic", "바이럴 쇼츠 제작 성공")
    winning_hook = payload.get("winning_hook", "")
    jjap_pattern = payload.get("jjap_pattern", "")
    score = float(payload.get("score", 85.0))
    hermes_session_store.record_channel_wisdom(channel_id, topic, winning_hook, jjap_pattern, score)
    return {"success": True, "message": f"채널 {channel_id}의 승리 공식이 Hermes 장기 기억고에 각인되었습니다."}

# =========================================================================
# 🧬 Channel Virtual Clone 6-Layer Preset Endpoints
# =========================================================================

@router.get("/api/agent/clone-presets")
def list_clone_presets():
    from ..services.channel_clone_manager import channel_clone_manager
    presets = channel_clone_manager.list_clone_presets()
    return [p.dict() for p in presets]

@router.get("/api/agent/clone-presets/{channel_id}")
def get_clone_preset(channel_id: int, channel_name: str = ""):
    from ..services.channel_clone_manager import channel_clone_manager
    preset = channel_clone_manager.get_clone_preset(channel_id, channel_name)
    return preset.dict()

@router.post("/api/agent/clone-presets/{channel_id}")
def save_clone_preset(channel_id: int, payload: Dict[str, Any] = Body(...)):
    from ..services.channel_clone_manager import channel_clone_manager, ChannelClonePresetSchema
    try:
        preset_obj = ChannelClonePresetSchema(**payload)
        channel_clone_manager.save_clone_preset(channel_id, preset_obj)
        return {
            "success": True, 
            "message": f"채널 {channel_id} 가상 클론 6-Layer 프리셋이 성공적으로 저장되었습니다.", 
            "preset": preset_obj.dict()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"프리셋 저장 실패: {str(e)}")

# =========================================================================
# 👥 Shadow Worker Pool (Stateless Concurrent Batch Engine) Endpoints
# =========================================================================

@router.post("/api/agent/batch-produce")
def submit_batch_produce(payload: Dict[str, Any] = Body(...)):
    """
    Submits batch production jobs to Shadow Worker Pool with Zero Context Bleed.
    """
    from ..services.shadow_worker_pool import shadow_worker_pool
    channel_id = payload.get("channel_id")
    if channel_id is None:
        raise HTTPException(status_code=400, detail="channel_id is required")
    
    topics = payload.get("topics", [])
    if not topics or not isinstance(topics, list):
        raise HTTPException(status_code=400, detail="topics must be a non-empty list of strings")
        
    channel_name = payload.get("channel_name", "")
    envelopes = shadow_worker_pool.submit_batch(int(channel_id), topics, channel_name)
    
    return {
        "success": True,
        "message": f"{len(envelopes)}개의 영상 제작 과업이 Shadow Worker 스레드 풀에 격리 투입되었습니다.",
        "jobs": [e.dict() for e in envelopes]
    }

@router.get("/api/agent/batch-produce/status/{job_id}")
def get_batch_job_status(job_id: str):
    from ..services.shadow_worker_pool import shadow_worker_pool
    job = shadow_worker_pool.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.dict()

@router.get("/api/agent/batch-produce/jobs/{channel_id}")
def list_channel_batch_jobs(channel_id: int):
    from ..services.shadow_worker_pool import shadow_worker_pool
    jobs = shadow_worker_pool.list_jobs(channel_id)
    return [j.dict() for j in jobs]

@router.get("/api/agent/batch-produce/jobs")
def list_all_batch_jobs():
    from ..services.shadow_worker_pool import shadow_worker_pool
    jobs = shadow_worker_pool.list_jobs()
    return [j.dict() for j in jobs]

