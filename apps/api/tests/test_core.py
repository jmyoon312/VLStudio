import sys
import os
import asyncio

# Add apps/api to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.mcp_client import RootMCPClient
from app.state_management.video_graph import app_graph
from app.agent.brain_router import brain_router

async def test_mcp():
    print("\n--- 1. Testing Root MCP Bridge ---")
    client = RootMCPClient()
    connected = await client.connect()
    if connected:
        print("✅ SUCCESS: Connected to Root MCP Server.")
        tools = await client.list_tools()
        print(f"✅ FOUND {len(tools)} TOOLS:")
        for t in tools[:3]: # print first 3
            print(f"   - {t.get('name')}: {t.get('description')[:50]}...")
        if len(tools) > 3:
            print("   - ... (more tools available)")
        await client.disconnect()
    else:
        print("❌ FAILED to connect to Root MCP Server.")

def test_brain_router():
    print("\n--- 2. Testing Pluggable Brain Router ---")
    print(f"Current Brain: {brain_router.active_brain_id}")
    switched = brain_router.switch_brain("gpt4o")
    if switched:
        print(f"✅ SUCCESS: Switched brain to {brain_router.active_brain_id}")
    else:
        print("❌ FAILED to switch brain.")

def test_langgraph_pipeline():
    print("\n--- 3. Testing LangGraph State Machine (Type A & HITL) ---")
    initial_state = {
        "project_id": "test_project_001",
        "channel_dna": {"strategy": "curation", "name": "TestChannel"},
        "production_type": "",
        "script_content": "",
        "scenes": [],
        "hitl_status": "IDLE",
        "current_phase": "STARTED",
        "errors": []
    }
    config = {"configurable": {"thread_id": "test_project_001"}}
    
    print("▶️ Starting LangGraph Run (Expected to hit HITL)...")
    result = app_graph.invoke(initial_state, config)
    
    state_snapshot = app_graph.get_state(config)
    next_node = state_snapshot.next
    
    if next_node and next_node[0] == "hitl_gateway":
        print(f"✅ SUCCESS: Graph correctly suspended at {next_node[0]}")
        print(f"Current Phase: {result.get('current_phase')}")
    else:
        print(f"❌ Graph did not suspend at HITL. Next node: {next_node}")
        return

    print("▶️ Simulating Human Approval (Resume Run)...")
    app_graph.update_state(config, {"hitl_status": "APPROVED"})
    final_result = app_graph.invoke(None, config)
    
    if final_result.get("current_phase") == "COMPLETED":
        print("✅ SUCCESS: Graph completed final rendering phase.")
    else:
        print(f"❌ Graph did not complete successfully. Status: {final_result.get('current_phase')}")

async def main():
    test_brain_router()
    test_langgraph_pipeline()
    # Note: test_mcp() requires mcp module to be fully installed in the environment
    try:
        await test_mcp()
    except Exception as e:
        print(f"\n❌ Root MCP test encountered an error: {e}")
        print("(Ensure 'mcp' SDK is installed and Node.js is available)")

if __name__ == "__main__":
    asyncio.run(main())
