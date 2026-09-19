import socket
import subprocess
import os
import sys
import logging
import threading
import time

logger = logging.getLogger("dsh_daemon")

_dsh_process = None

def is_port_open(host: str = "127.0.0.1", port: int = 3080) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1.0)
            return s.connect_ex((host, port)) == 0
    except Exception:
        return False

def _run_dsh():
    global _dsh_process
    if is_port_open("127.0.0.1", 3080):
        logger.info("[DSH] DeepSeek Harness is already active on port 3080.")
        return

    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    start_bat = os.path.join(root_dir, "harness", "start-dsh.bat")

    env = os.environ.copy()
    env["YOUTUBE2_API_KEY"] = "sk-95b157f52819c50b-62f661-a5667588"

    creation_flags = 0
    if sys.platform == "win32":
        creation_flags = subprocess.CREATE_NO_WINDOW

    logger.info(f"[DSH] Spawning DeepSeek Harness from: {start_bat}")
    try:
        _dsh_process = subprocess.Popen(
            [start_bat],
            cwd=root_dir,
            env=env,
            creationflags=creation_flags,
            shell=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        logger.info(f"[DSH] DeepSeek Harness daemon started with PID {_dsh_process.pid}")
    except Exception as e:
        logger.error(f"[DSH] Failed to launch DeepSeek Harness: {e}")

def start_dsh_daemon():
    t = threading.Thread(target=_run_dsh, daemon=True)
    t.start()
