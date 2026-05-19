import os
import sys
import json
import requests
from typing import Dict, Any

BRIDGE_URL = os.getenv("BRIDGE_URL", "http://127.0.0.1:8000/api/bridge")
API_KEY = os.getenv("MUAPI_API_KEY", "")

def call_bridge(action: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calls the ViraLoop Backend Bridge API.
    """
    url = f"{BRIDGE_URL}/{action}"
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=120)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"status": "error", "message": str(e)}

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"status": "error", "message": "Usage: viraloop_bridge.py <action> <payload_json>"}))
        sys.exit(1)

    action = sys.argv[1]
    try:
        payload = json.loads(sys.argv[2])
    except json.JSONDecodeError:
        print(json.dumps({"status": "error", "message": "Invalid JSON payload"}))
        sys.exit(1)

    result = call_bridge(action, payload)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
