from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List
from app.services.n8n_bridge import n8n_bridge
from app.services.ai_workflow_generator import ai_generator

router = APIRouter()

@router.get("/n8n/status")
def get_n8n_status():
    """Checks if the local n8n instance is reachable."""
    return n8n_bridge.check_connection()

@router.get("/n8n/workflows")
def list_n8n_workflows(limit: int = 20):
    """Lists recent n8n workflows."""
    return {"data": n8n_bridge.list_workflows(limit)}

@router.post("/n8n/generate")
def generate_workflow_ai(payload: Dict[str, Any] = Body(...)):
    """
    Generates an n8n workflow from natural language prompt and OPTIONALLY saves it.
    Payload: { "prompt": "...", "save": true, "provider": "groq", "model": "llama-3.3-70b" }
    """
    prompt = payload.get("prompt")
    save = payload.get("save", False)
    provider = payload.get("provider", "google") # Default to google
    model = payload.get("model", "gemini-1.5-pro") # Default to gemini-1.5-pro
    
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
        
    try:
        # 1. Generate JSON
        workflow_json = ai_generator.generate_workflow(prompt, provider, model)
        workflow_json["name"] = f"AI: {prompt[:30]}..."
        
        # 2. Save to n8n if requested
        saved_workflow = None
        if save:
            saved_workflow = n8n_bridge.create_workflow(workflow_json)
            
        return {
            "status": "success",
            "generated_json": workflow_json,
            "saved_workflow": saved_workflow
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/n8n/workflows")
def create_n8n_workflow(payload: Dict[str, Any] = Body(...)):
    """
    Directly create a workflow from valid JSON.
    Payload: { "name": "My Flow", "nodes": [], "connections": {} }
    """
    try:
        if "nodes" not in payload:
            raise HTTPException(status_code=400, detail="Invalid N8n JSON: Missing 'nodes'")
        
        result = n8n_bridge.create_workflow(payload)
        return {"status": "success", "workflow": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/n8n/workflows/{workflow_id}/execute")
def execute_n8n_workflow(workflow_id: str, payload: Dict[str, Any] = Body({})):
    """
    Triggers an n8n workflow execution via Webhook.
    1. Finds the Webhook URL from the workflow nodes.
    2. Sends the payload to trigger execution.
    """
    try:
        # 1. Get Webhook URL
        webhook_url = n8n_bridge.get_workflow_webhook_url(workflow_id)
        if not webhook_url:
            # Fallback: maybe it's not a webhook but we can activate it
            # But usually, 'execute' implies a trigger.
            # Let's try activating first just in case.
            n8n_bridge.activate_workflow(workflow_id)
            raise HTTPException(status_code=400, detail="No Webhook node found in this workflow to trigger.")

        # 2. Trigger
        result = n8n_bridge.trigger_webhook(webhook_url, payload)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        success = n8n_bridge.activate_workflow(workflow_id)
        if success:
           return {"status": "success", "message": f"Workflow {workflow_id} activated."}
        else:
           raise HTTPException(status_code=500, detail="Failed to activate workflow")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
