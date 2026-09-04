from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["MCP"])
@router.get("/", response_class=HTMLResponse)
async def mcp_info():
    """
    MCP 서버 상태 정보 페이지.
    fastmcp v3는 독립 프로세스(포트 4100)로 운영됩니다.
    """
    return """
    <html>
        <head><title>ViraLoop MCP</title></head>
        <body style="font-family: monospace; background: #0a0a0a; color: #00ff88; padding: 2rem;">
            <h1>📡 ViraLoop Sovereign MCP Server</h1>
            <p>Status: <b style="color:#ff6b00">Standalone Process (Port 4100)</b></p>
            <p>Protocol: Model Context Protocol v2026.1 (fastmcp v3)</p>
            <p>Transport: <code>streamable-http</code> + SSE</p>
            <hr style="border-color: #333"/>
            <h3>Active Tools (Unified Sovereign Tools + AutoFlowCut Engine):</h3>
            <ul>
                <li><b>SCOUT (Trend Radar):</b> scout_trending_videos, list_incubator_candidates, approve_incubator_candidate, reject_incubator_candidate</li>
                <li><b>DNA & VAULT:</b> get_category_dna, list_vault_videos</li>
                <li><b>RENDER (AutoFlowCut Core):</b> app_generate_scene, app_generate_reference, app_start_scene_batch, load_csv, list_scenes, update_scene</li>
                <li><b>TIMELINE & EDITOR:</b> trigger_capcut_automation, validate_scene_consistency</li>
            </ul>
            <h3>How to Start MCP Server:</h3>
            <pre style="background:#111; padding: 1rem; border-radius: 8px;">
cd /app/backend
venv/bin/python -m app.services.mcp.run_mcp_server
            </pre>
            <p>MCP Endpoint: <a href="http://localhost:4100/mcp" style="color:#00aaff">http://localhost:4100/mcp</a></p>
        </body>
    </html>
    """
