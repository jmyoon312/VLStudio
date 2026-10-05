"""
AI Director Client User Workflow End-to-End Parallel Test
- 100% mirrors a real user sitting in front of AI Director chat UI
- Does NOT pre-cook or manually insert data
- Passes user messages directly into ConversationalDirector streaming engine:
    Turn 0: User creates project folder via dialogue
    Turn 1: User enters target channel URL -> AI Director returns Intermediate Physical Check
    Turn 2: User confirms color clustering & preset creation -> AI Director synthesizes Blueprint v4
    Turn 3: User requests sample render test -> AI Director generates 5s preview video deliverable
- Concurrently runs across 3 independent threads:
    1. PopPick (@PopPickkk)
    2. Oh Haewon (@오오해원)
    3. Chaeryeong & Ryujin (@잔잔채령류진)
"""

import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import asyncio
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "apps" / "api"))

from app.agent.hermes_core.conversational_director import ConversationalDirector
from app.database import SessionLocal
from app import models

TARGET_CHANNELS = [
    {
        "id": "poppick",
        "name": "팝픽",
        "folder_name": "스토리텔링 & 썰 숏폼 프로젝트",
        "url": "https://www.youtube.com/@PopPickkk"
    },
    {
        "id": "haewon",
        "name": "오오해원",
        "folder_name": "예능 & K-POP 팬클립 프로젝트",
        "url": "https://www.youtube.com/@오오해원"
    },
    {
        "id": "ryujin",
        "name": "잔잔채령류진",
        "folder_name": "아이돌 무대 하이라이트 프로젝트",
        "url": "https://www.youtube.com/@잔잔채령류진"
    }
]


async def run_single_user_session(director: ConversationalDirector, ch: dict):
    ch_id = ch["id"]
    thread_id = f"thread_user_{ch_id}"
    print(f"\n▶ [User Session: {ch['name']}] Started on thread: {thread_id}")

    # Ensure thread exists in DB first (just as frontend does when opening a new chat)
    db = SessionLocal()
    try:
        th = db.query(models.DirectorThread).filter_by(id=thread_id).first()
        if not th:
            th = models.DirectorThread(
                id=thread_id,
                title=f"[실시간 대화] {ch['name']} 분석",
                created_at=models.datetime.now(),
                updated_at=models.datetime.now()
            )
            db.add(th)
            db.commit()
    finally:
        db.close()

    turn_results = []

    # =========================================================================
    # 💬 TURN 0: User creates project folder via dialogue
    # =========================================================================
    p0 = f"새 프로젝트 폴더 '{ch['folder_name']}' 만들어줘. 여기에 작업들을 묶어둘 거야."
    print(f"[{ch['name']}] User Input (Turn 0): \"{p0}\"")
    
    t0_steps = []
    t0_project = None
    t0_chips = []
    t0_content = []

    async for ev in director.execute_single_video_stream(prompt=p0, thread_id=thread_id):
        t = ev.get("type")
        if t == "step":
            t0_steps.append(ev)
            print(f"  [AI Director Step] {ev.get('title')} ({ev.get('status')})")
        elif t == "content_chunk":
            t0_content.append(ev.get("delta", ""))
        elif t == "chat_response":
            t0_project = ev.get("created_project")
            t0_chips = ev.get("action_chips", [])
    
    turn_results.append({
        "turn": 0,
        "input": p0,
        "steps_count": len(t0_steps),
        "project": t0_project,
        "chips": t0_chips
    })
    print(f"[{ch['name']}] Turn 0 Response: Project created: {t0_project}")

    # =========================================================================
    # 💬 TURN 1: User enters channel URL for forensic analysis
    # =========================================================================
    p1 = f"{ch['url']} 채널 분석해서 숏폼 프리셋 만들어줘. 자막 위치랑 글자 테두리(스트로크) 두께까지 영상 실측해서 완벽하게 맞춰줘."
    print(f"\n[{ch['name']}] User Input (Turn 1): \"{p1}\"")

    t1_steps = []
    t1_chips = []
    t1_content = []

    async for ev in director.execute_single_video_stream(prompt=p1, thread_id=thread_id):
        t = ev.get("type")
        if t == "step":
            t1_steps.append(ev)
            print(f"  [AI Director Step] {ev.get('title')} ({ev.get('status')})")
        elif t == "content_chunk":
            t1_content.append(ev.get("delta", ""))
        elif t == "chat_response":
            t1_chips = ev.get("action_chips", [])

    turn_results.append({
        "turn": 1,
        "input": p1,
        "steps_count": len(t1_steps),
        "chips": t1_chips
    })
    print(f"[{ch['name']}] Turn 1 Response: Intermediate physical check posted.")

    # =========================================================================
    # 💬 TURN 2: User confirms color clustering & preset creation
    # =========================================================================
    p2 = "화자 색상 군집화 계속 진행하고 최종 블루프린트 v4 프리셋으로 등록해줘."
    print(f"\n[{ch['name']}] User Input (Turn 2): \"{p2}\"")

    t2_steps = []
    t2_preset = None
    t2_chips = []
    t2_content = []

    async for ev in director.execute_single_video_stream(prompt=p2, thread_id=thread_id):
        t = ev.get("type")
        if t == "step":
            t2_steps.append(ev)
            print(f"  [AI Director Step] {ev.get('title')} ({ev.get('status')})")
        elif t == "content_chunk":
            t2_content.append(ev.get("delta", ""))
        elif t == "created_preset":
            t2_preset = ev.get("created_preset")
        elif t == "chat_response":
            if not t2_preset:
                t2_preset = ev.get("created_preset")
            t2_chips = ev.get("action_chips", [])

    turn_results.append({
        "turn": 2,
        "input": p2,
        "steps_count": len(t2_steps),
        "preset": t2_preset,
        "chips": t2_chips
    })
    print(f"[{ch['name']}] Turn 2 Response: Preset synthesized: {t2_preset.get('id') if t2_preset else 'NONE'}")

    # =========================================================================
    # 💬 TURN 3: User requests 5s sample preview render
    # =========================================================================
    p3 = "추출된 프리셋으로 5초 샘플 영상 렌더링 테스트해줘."
    print(f"\n[{ch['name']}] User Input (Turn 3): \"{p3}\"")

    t3_steps = []
    t3_deliverable = None
    t3_chips = []
    t3_content = []

    async for ev in director.execute_single_video_stream(prompt=p3, thread_id=thread_id, preset=t2_preset):
        t = ev.get("type")
        if t == "step":
            t3_steps.append(ev)
            print(f"  [AI Director Step] {ev.get('title')} ({ev.get('status')})")
        elif t == "deliverable":
            t3_deliverable = ev.get("deliverable")
        elif t == "chat_response":
            if not t3_deliverable:
                t3_deliverable = ev.get("deliverable")
            t3_chips = ev.get("action_chips", [])

    turn_results.append({
        "turn": 3,
        "input": p3,
        "steps_count": len(t3_steps),
        "deliverable": t3_deliverable,
        "chips": t3_chips
    })
    print(f"[{ch['name']}] Turn 3 Response: 5s sample render delivered: {t3_deliverable.get('video_path') if t3_deliverable else 'NONE'}")

    return {
        "channel": ch,
        "thread_id": thread_id,
        "turns": turn_results
    }


async def main():
    print("=" * 80)
    print("🚀 [User Simulation] Starting Client-Side AI Director Multi-Turn Parallel Execution")
    print("=" * 80)

    start_time = time.time()
    director = ConversationalDirector()

    # Run all 3 user chat sessions in parallel
    tasks = [run_single_user_session(director, ch) for ch in TARGET_CHANNELS]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    elapsed = round(time.time() - start_time, 2)
    print("\n" + "=" * 80)
    print(f"🔍 [Verification Audit] Validating Conversational Results (Elapsed: {elapsed}s)")
    print("=" * 80)

    all_passed = True
    for res in results:
        if isinstance(res, Exception):
            print(f"❌ Session failed with exception: {res}")
            all_passed = False
            continue

        ch = res["channel"]
        th_id = res["thread_id"]
        turns = res["turns"]

        # Check Turn 0 (Project)
        t0 = turns[0]
        has_proj = t0.get("project") is not None and t0["project"].get("name") == ch["folder_name"]

        # Check Turn 1 (Intermediate Check)
        t1 = turns[1]
        has_intermediate = len(t1.get("chips", [])) > 0

        # Check Turn 2 (Preset)
        t2 = turns[2]
        has_preset = t2.get("preset") is not None

        # Check Turn 3 (Deliverable Video)
        t3 = turns[3]
        has_video = t3.get("deliverable") is not None and Path(t3["deliverable"].get("video_path", "")).exists()

        passed = has_proj and has_intermediate and has_preset and has_video
        if not passed:
            all_passed = False

        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} [{ch['name']}] (Thread: {th_id})")
        print(f"   - Turn 0 (Folder Creation): {t0['project'].get('name') if t0.get('project') else 'FAIL'}")
        print(f"   - Turn 1 (Intermediate Check): {len(t1.get('chips', []))} action chips")
        print(f"   - Turn 2 (Blueprint v4 & Preset): {t2['preset'].get('id') if t2.get('preset') else 'FAIL'}")
        print(f"   - Turn 3 (Sample Video Render): {Path(t3['deliverable']['video_path']).name if has_video else 'FAIL'}")
        print("-" * 80)

    if all_passed and len(results) == 3:
        print("🎉 [ALL PASSED] 100% Client-Driven Conversational Preset Creation Verified!")
    else:
        print("⚠️ Some sessions had failures. Check logs above.")


if __name__ == "__main__":
    asyncio.run(main())
