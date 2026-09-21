"""
python_env.py
VLStudio 프로젝트 공식 가상환경(venv) Python 인터프리터 경로 단일 진실 공급원 (SSOT)
"""
import os
import sys
import logging

logger = logging.getLogger("PythonEnv")

def get_venv_python() -> str:
    """
    Returns the absolute path to the project virtualenv python.exe.
    Prioritizes C:\\ViraLoopMedia\\VLStudio\\venv\\Scripts\\python.exe where
    cloakbrowser and all required dependencies are installed.
    """
    # 1. Check known absolute path on Windows first
    fixed_path = r"C:\ViraLoopMedia\VLStudio\venv\Scripts\python.exe"
    if os.path.exists(fixed_path):
        return fixed_path

    # 2. Relative resolution from this file (apps/api/app/utils/python_env.py -> 4 levels up to VLStudio root)
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
    venv_win = os.path.join(root_dir, "venv", "Scripts", "python.exe")
    if os.path.exists(venv_win):
        return venv_win

    venv_unix = os.path.join(root_dir, "venv", "bin", "python")
    if os.path.exists(venv_unix):
        return venv_unix

    # 3. Virtual env from sys.executable
    candidate = os.path.join(os.path.dirname(sys.executable), "python.exe")
    if os.path.exists(candidate) and "venv" in candidate.lower():
        return candidate

    return sys.executable
