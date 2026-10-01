from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import os
import subprocess
import logging
import re
import time
import requests
from .. import crud, schemas, database
from app.global_swarm_master import global_master

logger = logging.getLogger(__name__)

router = APIRouter(tags=["hermes"])

_hermes_release_cache = {}

def fetch_latest_release_info(repo: str = "NousResearch/hermes-agent", fallback: str = "Hermes Agent v0.21.5 (v2026.9.24)", force_refresh: bool = False) -> dict:
    """Fetches latest release info from GitHub Releases API with in-memory caching."""
    global _hermes_release_cache
    now = time.time()
    cache_key = repo

    if not force_refresh and cache_key in _hermes_release_cache:
        entry = _hermes_release_cache[cache_key]
        if now - entry.get("timestamp", 0) < 600:  # 10 minutes cache
            return entry.get("data", {"name": fallback, "tag": fallback})

    headers = {
        "User-Agent": "ViraLoop-Studio",
        "Accept": "application/vnd.github.v3+json"
    }
    github_token = os.environ.get("GITHUB_TOKEN")
    if github_token:
        headers["Authorization"] = f"token {github_token}"

    try:
        url = f"https://api.github.com/repos/{repo}/releases/latest"
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            latest_name = data.get("name") or data.get("tag_name") or fallback
            tag_name = data.get("tag_name") or latest_name
            res = {
                "name": latest_name,
                "tag": tag_name,
                "published_at": data.get("published_at"),
                "html_url": data.get("html_url", f"https://github.com/{repo}"),
                "body": data.get("body", "")
            }
            _hermes_release_cache[cache_key] = {"data": res, "timestamp": now}
            return res
        else:
            logger.warning(f"[Hermes] GitHub API returned status {resp.status_code} for {repo}")
    except Exception as e:
        logger.warning(f"[Hermes] Failed to fetch latest release for {repo}: {e}")

    fallback_data = {"name": fallback, "tag": fallback, "html_url": f"https://github.com/{repo}"}
    _hermes_release_cache[cache_key] = {"data": fallback_data, "timestamp": now}
    return fallback_data



def _read_local_version(project_root: str, path: str) -> str:
    """Reads .version file from hermes_core. Returns fixed fallback if absent."""
    def _is_clean(v: str) -> bool:
        return bool(re.match(r'^v\d', v)) or ('.' in v and any(c.isdigit() for c in v))

    version_file = os.path.join(project_root, path, ".version")
    if os.path.exists(version_file):
        try:
            with open(version_file, "r") as f:
                v = f.read().strip()
                if _is_clean(v):
                    return v
        except Exception:
            pass
    return "Hermes Agent v0.21.3 (v2026.9.14)"


@router.get("/status")
def get_hermes_status(db: Session = Depends(database.get_db)):
    """
    Returns the current status and identity of the Hermes Intelligence Core.
    """
    settings = crud.get_settings(db)
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    agent_path = "apps/api/app/agent/hermes_core"
    local_version = _read_local_version(project_root, agent_path)

    return {
        "identity": "Sovereign Strategic Coordinator",
        "provider": settings.hermes_agent_provider,
        "model": settings.hermes_agent_model,
        "status": "ONLINE",
        "wisdom_depth": settings.hermes_wisdom_depth,
        "auto_reflection": settings.hermes_auto_reflection,
        "hermes_cron_continuity_enabled": getattr(settings, "hermes_cron_continuity_enabled", True),
        "hermes_monitor_mode_enabled": getattr(settings, "hermes_monitor_mode_enabled", True),
        "hermes_subagent_steering_enabled": getattr(settings, "hermes_subagent_steering_enabled", True),
        "hermes_structured_schema_enforced": getattr(settings, "hermes_structured_schema_enforced", True),
        "hermes_instruction_protection_enabled": getattr(settings, "hermes_instruction_protection_enabled", True),
        "hermes_har_api_mode": getattr(settings, "hermes_har_api_mode", "auto"),
        "hermes_fts_wal_pool_size": getattr(settings, "hermes_fts_wal_pool_size", 5),
        "version": {
            "local": local_version,
            "github_url": "https://github.com/NousResearch/hermes-agent",
            "homepage_url": "https://nousresearch.com"
        }
    }


@router.put("/settings", response_model=schemas.Settings)
def update_hermes_settings(hermes_settings: schemas.HermesSettings, db: Session = Depends(database.get_db)):
    """
    Updates Hermes-specific cognitive parameters.
    """
    current_settings = crud.get_settings(db)

    update_data = {
        "hermes_agent_provider": hermes_settings.agent_provider,
        "hermes_agent_model": hermes_settings.agent_model,
        "hermes_wisdom_depth": hermes_settings.hermes_wisdom_depth,
        "hermes_reflection_verbosity": hermes_settings.reflection_verbosity,
        "hermes_auto_reflection": hermes_settings.auto_reflection,
        "hermes_auto_update_enabled": hermes_settings.auto_update_enabled,
        "hermes_cron_continuity_enabled": hermes_settings.hermes_cron_continuity_enabled,
        "hermes_monitor_mode_enabled": hermes_settings.hermes_monitor_mode_enabled,
        "hermes_subagent_steering_enabled": hermes_settings.hermes_subagent_steering_enabled,
        "hermes_structured_schema_enforced": hermes_settings.hermes_structured_schema_enforced,
        "hermes_instruction_protection_enabled": hermes_settings.hermes_instruction_protection_enabled,
        "hermes_har_api_mode": hermes_settings.hermes_har_api_mode or "auto",
        "hermes_fts_wal_pool_size": hermes_settings.hermes_fts_wal_pool_size or 5,
    }

    for key, value in update_data.items():
        setattr(current_settings, key, value)

    db.commit()
    db.refresh(current_settings)

    try:
        from app.agent.brain_router import brain_router
        brain_router.clear_cache()
    except Exception as e:
        logger.warning(f"Could not clear brain router cache in update_hermes_settings: {e}")

    return current_settings


@router.post("/update", response_model=schemas.HermesUpdateResponse)
def update_hermes_agent(db: Session = Depends(database.get_db)):
    """
    Safe Update: Updates only the hermes_core directory from GitHub.
    """
    try:
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        target_dir = "apps/api/app/agent/hermes_core"
        github_url = "https://github.com/NousResearch/hermes-agent.git"

        subprocess.run(["git", "config", "--global", "--add", "safe.directory", "*"])
        logger.info(f"📡 [Hermes Update] Fetching from {github_url}...")
        subprocess.run(["git", "fetch", github_url, "master"], cwd=project_root)
        result = subprocess.run(["git", "checkout", "FETCH_HEAD", "--", target_dir], cwd=project_root, capture_output=True, text=True)

        if result.returncode != 0:
            return schemas.HermesUpdateResponse(
                status="error",
                message=f"Git checkout failed: {result.stderr}",
                version_info=None
            )

        local_version = _read_local_version(project_root, target_dir)

        return schemas.HermesUpdateResponse(
            status="success",
            message="루피(헤르메스) 지능 코어가 깃허브 최신본으로 개별 업데이트되었습니다. (ViraLoop 본체 유지)",
            version_info=local_version
        )
    except Exception as e:
        logger.error(f"[FAIL] [Hermes] Update system error: {str(e)}")
        return schemas.HermesUpdateResponse(
            status="error",
            message=str(e),
            version_info=None
        )


@router.post("/self-heal-fts")
def self_heal_hermes_fts():
    """
    [Hermes v0.21.3 Self-Healing] Rebuilds the FTS5 virtual table safely.
    """
    try:
        from app.agent.hermes_session_store import hermes_session_store
        hermes_session_store.self_heal_fts()
        return {"status": "success", "message": "Hermes FTS5 검색 색인이 성공적으로 재구축 및 자가 복구되었습니다."}
    except Exception as e:
        logger.error(f"[FAIL] [Hermes] FTS self-healing failed: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/director/stream")
async def stream_director_execution(request: dict):
    """
    Hermes Conversational Director SSE streaming endpoint.
    Orchestrates turn-based script generation, preset synthesis, and video rendering.
    """
    from fastapi.responses import StreamingResponse
    import json

    prompt = request.get("prompt", "")
    preset = request.get("preset")
    reference_media_path = request.get("reference_media_path")
    aspect_ratio = request.get("aspect_ratio", "1080x1920")
    media_paths = request.get("media_paths", [])
    previous_deliverable = request.get("previous_deliverable")
    model = request.get("model")
    provider = request.get("provider")
    reasoning_effort = request.get("reasoning_effort")
    history = request.get("history", [])
    target_channel = request.get("target_channel")
    thread_id = request.get("thread_id")
    attached_images = request.get("attached_images", [])

    import importlib
    import app.agent.hermes_core.conversational_director as cd_mod
    try:
        importlib.reload(cd_mod)
    except Exception as re_err:
        logger.debug(f"[Hermes] Hot-reload notice: {re_err}")
    director = cd_mod.ConversationalDirector()

    async def event_generator():
        try:
            if media_paths and len(media_paths) > 1:
                stream = director.execute_batch_director_stream(
                    prompt=prompt,
                    media_paths=media_paths,
                    preset_id=preset.get("id") if preset else None,
                    aspect_ratio=aspect_ratio,
                    previous_deliverable=previous_deliverable,
                    model=model,
                    provider=provider,
                    reasoning_effort=reasoning_effort,
                    history=history
                )
            else:
                stream = director.execute_single_video_stream(
                    prompt=prompt,
                    preset=preset,
                    aspect_ratio=aspect_ratio,
                    reference_media_path=reference_media_path or (media_paths[0] if media_paths else None),
                    attached_images=attached_images,
                    item_index=0,
                    total_items=1,
                    previous_deliverable=previous_deliverable,
                    model=model,
                    provider=provider,
                    reasoning_effort=reasoning_effort,
                    history=history,
                    target_channel=target_channel,
                    thread_id=thread_id
                )
            async for event in stream:
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"[Hermes Director] Stream error: {e}", exc_info=True)
            err_event = {
                "type": "step",
                "step_id": "error",
                "title": "디렉터 연출 오류",
                "status": "failed",
                "detail": str(e)
            }
            yield f"data: {json.dumps(err_event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/skills/catalog")
def get_hermes_skills_catalog():
    """Returns available auto-loaded form factor skills and synthesized channel skills."""
    from app.services.channel_dna_skill_fabric import channel_dna_skill_fabric
    from app.agent.hermes_core.skills_auto_loader import FORM_FACTOR_SKILLS
    return {
        "success": True,
        "form_factors": list(FORM_FACTOR_SKILLS.keys()),
        "synthesized_channel_skills": channel_dna_skill_fabric.list_synthesized_skills()
    }


@router.get("/tools/mesh")
def get_hermes_tool_mesh():
    """Returns all registered native and hot-plugged tools."""
    from app.agent.hermes_core.tools.hermes_tool_registry import HERMES_OPENAI_TOOLS, TOOL_DOMAINS
    from app.agent.hermes_core.tools.hermes_hotplug_mesh import hermes_hotplug_mesh
    return {
        "success": True,
        "total_tools": len(HERMES_OPENAI_TOOLS),
        "domains": TOOL_DOMAINS,
        "tools": [t.get("function", {}).get("name") for t in HERMES_OPENAI_TOOLS],
        "hotplugged": hermes_hotplug_mesh.list_hotplugged_tools()
    }


@router.get("/cooldowns")
def get_model_cooldowns():
    """Returns list of active provider/model cooldowns."""
    from app.services.model_cooldown_manager import model_cooldown_manager
    return {
        "success": True,
        "active_cooldowns": model_cooldown_manager.get_cooldown_status()
    }



