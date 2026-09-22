from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import os
import subprocess
import logging
import re
from .. import crud, schemas, database
from app.global_swarm_master import global_master

logger = logging.getLogger(__name__)

router = APIRouter(tags=["hermes"])


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

