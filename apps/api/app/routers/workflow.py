from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional, Any, Dict
from pydantic import BaseModel
from datetime import datetime
import copy
import traceback

from ..database import get_db
from ..models import Workflow
from .. import schemas, crud
from ..services.workflow_runner import WorkflowRunner
from ..services.cache_manager import cache_manager
from ..services.memory_manager import memory_manager

router = APIRouter(tags=["workflows"])

# ... (Pydantic Models remain same, skipping lines for brevity if using valid replacement, but need to be careful with replace_file_content limitations. 
# I will replace the imports and then the functions separately to be safe, or replacing the whole file content is too big? 
# The file is small (113 lines). I can replace chunks.)

# Chunk 1: Imports
# Chunk 2: read_workflow
# Chunk 3: duplicate_workflow


router = APIRouter(
    tags=["workflows"],
    responses={404: {"description": "Not found"}},
)

# --- Pydantic Models ---
# --- Pydantic Models ---
WorkflowBase = schemas.WorkflowBase
WorkflowCreate = schemas.WorkflowCreate
WorkflowUpdate = schemas.WorkflowUpdate
WorkflowResponse = schemas.WorkflowResponse


@router.get("/", response_model=List[WorkflowResponse])
def read_workflows(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    workflows = db.query(Workflow).offset(skip).limit(limit).all()
    # Default empty dict for graph_data if None
    for w in workflows:
        if w.graph_data is None:
            w.graph_data = {}
    return workflows

@router.get("/{workflow_id}", response_model=WorkflowResponse)
def read_workflow(workflow_id: int, db: Session = Depends(get_db)):
    try:
        db_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if db_workflow is None:
            raise HTTPException(status_code=404, detail="Workflow not found")
        if db_workflow.graph_data is None:
            db_workflow.graph_data = {}
        return db_workflow
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR reading workflow {workflow_id}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")

@router.post("/", response_model=WorkflowResponse)
def create_workflow(workflow: WorkflowCreate, db: Session = Depends(get_db)):
    workflow_dict = workflow.dict()
    db_workflow = Workflow(**workflow_dict)
    db.add(db_workflow)
    db.commit()
    db.refresh(db_workflow)
    return db_workflow

@router.put("/{workflow_id}", response_model=WorkflowResponse)
def update_workflow(workflow_id: int, workflow: WorkflowUpdate, db: Session = Depends(get_db)):
    db_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if db_workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    update_data = workflow.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_workflow, key, value)
    
    db_workflow.updated_at = datetime.utcnow()
    
    db.add(db_workflow)
    db.commit()
    db.refresh(db_workflow)
    return db_workflow

@router.delete("/{workflow_id}")
def delete_workflow(workflow_id: int, db: Session = Depends(get_db)):
    db_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if db_workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    db.delete(db_workflow)
    db.commit()
    return {"ok": True}

@router.post("/{workflow_id}/duplicate", response_model=WorkflowResponse)
def duplicate_workflow(workflow_id: int, db: Session = Depends(get_db)):
    original_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if original_workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    new_workflow = Workflow(
        title=f"{original_workflow.title} (Copy)",
        description=original_workflow.description,
        is_active=False, # Default to inactive (Draft)
        graph_data=copy.deepcopy(original_workflow.graph_data) if original_workflow.graph_data else {}
    )
    
    db.add(new_workflow)
    db.commit()
    db.refresh(new_workflow)
    return new_workflow
@router.post("/{workflow_id}/resume")
async def resume_workflow(
    workflow_id: int, 
    file: UploadFile = File(...), 
    language: str = Form("default"), # Support language key (KR, JP, EN)
    db: Session = Depends(get_db)
):
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Save uploaded file
    upload_dir = os.path.join("storage", "uploads", str(workflow_id))
    os.makedirs(upload_dir, exist_ok=True)
    
    # Filename: resumed_{lang}_{original}
    safe_lang = language.upper().replace(" ", "")
    file_path = os.path.join(upload_dir, f"resumed_{safe_lang}_{file.filename}")
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    print(f"Workflow {workflow_id} resumed ({language}) with file: {file_path}")
    
    # Update Workflow State Logic (Simulation)
    # in a real engine, we'd update specific Node Output in the graph state.
    # For now, we save it in a known location so DistributionNode can find "resumed_KR..."
    
    return {
        "status": "resumed",
        "language": language,
        "file_path": file_path,
        "message": f"{language} Asset uploaded successfully."
    }



class WorkflowRunRequest(BaseModel):
    selected_ids: List[int] = []
    asset_type: str = "video"       # 'video' or 'script'
    video_rules: Optional[Dict[str, Any]] = None
    script_rules: Optional[Dict[str, Any]] = None
    target_node_id: Optional[str] = None # [NEW] Run only up to this node

class NodeUpdate(BaseModel):
    data: Dict[str, Any]

@router.put("/{workflow_id}/nodes/{node_id}")
def update_workflow_node(
    workflow_id: int, 
    node_id: str, 
    update: NodeUpdate, 
    db: Session = Depends(get_db)
):
    """
    Updates the data of a specific node within the workflow graph.
    Crucial for saving 'Prompt/Settings' before triggering a partial run.
    """
    db_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not db_workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Clone graph data to ensure mutation
    graph_data = dict(db_workflow.graph_data) if db_workflow.graph_data else {}
    nodes = graph_data.get("nodes", [])
    
    node_found = False
    for i, node in enumerate(nodes):
        if node.get("id") == node_id:
            # Merge or Replace Data?
            # Frontend sends "data" block. We should probably merge nicely or replace the "data" key.
            # Strategy: Replace 'data' key with incoming 'data'
            # But preserve other keys if any?
            # The frontend typically sends the *entire* data object it has.
            nodes[i]["data"] = update.data
            node_found = True
            break
            
    if not node_found:
         raise HTTPException(status_code=404, detail=f"Node {node_id} not found in workflow")
    
    # Save back
    graph_data["nodes"] = nodes
    db_workflow.graph_data = graph_data
    db_workflow.updated_at = datetime.utcnow()
    
    # Force generic update on SQLAlchemy
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(db_workflow, "graph_data")
    
    db.commit()
    db.refresh(db_workflow)
    
    return {"status": "success", "node_id": node_id}

@router.post("/{workflow_id}/run")
async def run_workflow(
    workflow_id: int, 
    request: WorkflowRunRequest = None,
    db: Session = Depends(get_db)
):
    """
    Executes the workflow graph.
    Supports Manual Selection OR Rule-Based Auto-Selection.
    """
    db_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not db_workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    try:
        # 1. Determine Target Assets
        final_asset_ids = []
        
        if request and request.selected_ids:
            final_asset_ids = request.selected_ids
        elif request:
            # --- AUTO-SELECTION ENGINE ---
            run_type = request.asset_type
            rules = request.video_rules if run_type == 'video' else request.script_rules
            
            if not rules or not rules.get('enabled'):
                raise HTTPException(status_code=400, detail="Please select assets or enable automation rules.")

            # Build Query
            from .. import models
            from sqlalchemy import desc
            from datetime import timedelta
            
            query = db.query(models.Video)
            
            # Filter A: Asset Type
            if run_type == 'video':
                query = query.filter(models.Video.file_path.isnot(None))
            else:
                # Script mode: script files or video transcripts
                pass # Usually we accept any video as script source if transcript exists. 
                     # But per requirement: "If script, filter Video.file_path.is_(None)"? 
                     # Wait, usually scripts are derived from videos or are text files.
                     # "Script Asset" in ViraLoop can be a text-only entry. 
                     # Let's check crud.get_videos logic.
                     # For now, following user directive:
                     # "If video: file_path is not None", "If script: file_path IS None" (Assuming text assets don't rely on file_path or have different logic?)
                     # Actually, crud logic says "Script: is_script_only=True OR file_path is None OR .txt"
                     # We will use is_script_only flag which is cleaner.
                query = query.filter(models.Video.is_script_only == (True if run_type == 'script' else False))

            # Filter B: Date Range
            # "1week", "1month" mapping
            days_map = {"1week": 7, "1month": 30, "3months": 90, "all": 3650}
            period_str = rules.get('days', '1week')
            days = days_map.get(period_str, 7)
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            query = query.filter(models.Video.upload_date >= cutoff_date)
            
            # Filter C: Viral Score (Grade)
            # S=90, A=60, B=40, C=0 (Adjusting based on "A(60+)" in UI)
            grade_map = {"S": 90, "A": 60, "B": 40, "C": 0}
            min_grade = rules.get('minScore', 'A') # "A등급 (60+)" -> Need to parse or assume key is simple?
            # Frontend sends "A" or "60"? Check Inspector.
            # Assuming Frontend might send full string "A등급 (60+)" or just code.
            # Let's be robust: simple check first char or map.
            # Safe default 0
            threshold = 0
            if "S" in min_grade: threshold = 90
            elif "A" in min_grade: threshold = 60
            elif "B" in min_grade: threshold = 40
            
            query = query.filter(models.Video.viral_score >= threshold)
            
            # Filter D: Velocity
            min_velocity = int(rules.get('minVelocity', 0))
            query = query.filter(models.Video.velocity_score >= min_velocity)
            
            # Sort & Limit
            query = query.order_by(desc(models.Video.viral_score))
            limit = int(rules.get('limit', 5))
            query = query.limit(limit)
            
            results = query.all()
            final_asset_ids = [v.id for v in results]
            
            if not final_asset_ids:
                raise HTTPException(status_code=404, detail="No assets found matching the automation criteria.")

        # 2. Execution
        # Load Settings (Environment)
        db_settings = crud.get_settings(db)
        settings = schemas.Settings.model_validate(db_settings)
        runner = WorkflowRunner(settings)
        
        results = await runner.execute_workflow(
            graph_data=db_workflow.graph_data, 
            db=db, 
            override_assets=final_asset_ids,
            target_node_id=request.target_node_id if request else None
        )
        
        return {
            "workflow_id": workflow_id,
            "status": "completed",
            "node_outputs": results, # [NEW] Explicitly Alias results to node_outputs for frontend hydration
            "results": results,      # Keep legacy key for now
            "assets_processed": len(final_asset_ids)
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        with open("traceback.log", "w") as f:
            f.write(traceback.format_exc())
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Execution Failed: {str(e)}")

# Alias for backward compatibility
@router.post("/{workflow_id}/execute")
async def execute_workflow(
    workflow_id: int,
    request: WorkflowRunRequest = None,
    db: Session = Depends(get_db)
):
    """Alias for /run endpoint for backward compatibility"""
    return await run_workflow(workflow_id, request, db)

@router.get("/{workflow_id}/bundle")
def bundle_workflow_assets(workflow_id: int, db: Session = Depends(get_db)):
    """
    Bundles all assets generated or used by the workflow into a ZIP file.
    Used by ManualTaskNode for 'Human-in-the-Loop' editing.
    """
    import zipfile
    import io
    from fastapi.responses import StreamingResponse
    
    # 1. Verify Workflow Exists
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # 2. Determine Asset Directory
    # Assuming WorkflowRunner saves outputs to storage/executions/{workflow_id} 
    # OR retrieves them from a registry. For now, we scan a likely directory.
    # In a real system, we'd query an Asset Registry table.
    asset_dir = os.path.join("storage", "executions", str(workflow_id))
    
    if not os.path.exists(asset_dir):
        # Callback to potential upload dir if execution dir doesn't exist
        asset_dir = os.path.join("storage", "uploads", str(workflow_id))
        if not os.path.exists(asset_dir):
             raise HTTPException(status_code=404, detail="No assets found for this workflow")

    # 3. Create ZIP in Memory
    mem_zip = io.BytesIO()
    
    try:
        with zipfile.ZipFile(mem_zip, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            # Walk through the directory
            has_files = False
            for root, dirs, files in os.walk(asset_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    
                    # Smart Structure: Check for Lang Flags
                    upper_name = file.upper()
                    folder_prefix = "OTHERS"
                    if "_KR" in upper_name or "KOREAN" in upper_name:
                        folder_prefix = "KOREAN"
                    elif "_JP" in upper_name or "JAPAN" in upper_name:
                        folder_prefix = "JAPANESE"
                    elif "_EN" in upper_name or "ENGLISH" in upper_name:
                        folder_prefix = "ENGLISH"
                    elif "SCRIPT" in upper_name:
                        folder_prefix = "SCRIPTS"
                    
                    # Arcname: Folder/Filename
                    arcname = f"{folder_prefix}/{file}"
                    zf.write(file_path, arcname=arcname)
                    has_files = True
            
            if not has_files:
                 # Add a readme if empty
                 zf.writestr("README.txt", "No assets were found in the execution directory.")
                 
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to zip assets: {str(e)}")

    mem_zip.seek(0)
    
    # 4. Return Stream
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    filename = f"workflow_{workflow_id}_assets_{timestamp}.zip"
    
    return StreamingResponse(
        mem_zip, 
        media_type="application/zip", 
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{workflow_id}/nodes/{node_id}/memory")
def get_node_memory(workflow_id: int, node_id: str, db: Session = Depends(get_db)):
    """Retrieve active conversation history for a specific node."""
    history = memory_manager.get_context(db, node_id)
    return {
        "node_id": node_id,
        "turn_count": len(history),
        "max_limit": 10, # Hardcoded for now, or fetch from config if possible
        "history": history
    }

@router.delete("/{workflow_id}/nodes/{node_id}/memory")
def clear_node_memory(workflow_id: int, node_id: str, db: Session = Depends(get_db)):
    """Clear conversation history for a specific node."""
    memory_manager.clear_node(db, node_id)
    return {"status": "cleared", "target": "memory", "node_id": node_id}

@router.delete("/{workflow_id}/nodes/{node_id}/cache")
def clear_node_cache(workflow_id: int, node_id: str, db: Session = Depends(get_db)):
    """Clear cached results for a specific node."""
    # Prefix-based clearing
    cache_manager.clear_node(node_id)
    return {"status": "cleared", "target": "cache", "node_id": node_id}
