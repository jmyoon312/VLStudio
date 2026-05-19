from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import crud, database, models, schemas
from ..utils import file_manager
import uuid
import copy
from typing import List, Optional
import pydantic
from datetime import datetime

router = APIRouter(tags=["templates"])

class TemplateResponse(pydantic.BaseModel):
    id: int
    category: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    graph_json: Optional[dict] = None
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[TemplateResponse])
def get_templates(db: Session = Depends(database.get_db)):
    """
    List all available templates.
    """
    return db.query(models.WorkflowTemplate).order_by(models.WorkflowTemplate.id.desc()).all()

@router.post("/{template_id}/create-workflow", response_model=schemas.WorkflowResponse)
def create_workflow_from_template(template_id: int, db: Session = Depends(database.get_db)):
    """
    Create a new Workflow from a Template.
    CRITICAL: Performs Smart ID Remapping to ensure unique Node IDs.
    """
    template = db.query(models.WorkflowTemplate).filter(models.WorkflowTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    # 1. Deep Copy the Graph
    graph = copy.deepcopy(template.graph_json)
    
    # 2. Smart ID Remapping
    id_map = {} # Old ID -> New ID
    
    # 2a. Remap Nodes
    nodes = graph.get('nodes', [])
    for node in nodes:
        old_id = node['id']
        new_id = str(uuid.uuid4())
        id_map[old_id] = new_id
        node['id'] = new_id
        
        # Reset selection state
        node['selected'] = False
        if 'position' in node:
            # Maybe jitter position slightly? No need.
            pass
            
    # 2b. Remap Edges
    edges = graph.get('edges', [])
    new_edges = []
    for edge in edges:
        source = edge.get('source')
        target = edge.get('target')
        
        # Only keep edge if both source/target exist in our new map (safety)
        if source in id_map and target in id_map:
            edge['source'] = id_map[source]
            edge['target'] = id_map[target]
            edge['id'] = f"e-{id_map[source]}-{id_map[target]}" # Standard ReactFlow edge ID format
            edge['selected'] = False
            new_edges.append(edge)
            
    graph['edges'] = new_edges
    
    # 3. Create Workflow in DB
    new_workflow = models.Workflow(
        title=f"{template.title} (Copy)",
        description=template.description,
        graph_data=graph,
        is_active=False
    )
    db.add(new_workflow)
    db.commit()
    db.refresh(new_workflow)
    
    return new_workflow
