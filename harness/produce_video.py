import argparse
import json
import urllib.request
import sys
import io

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

def main():
    parser = argparse.ArgumentParser(description="ViraLoop Autonomous Video Producer")
    parser.add_argument("--reference", "-r", default="https://www.youtube.com/@noejeongu", help="Reference YouTube channel or video URL")
    parser.add_argument("--source", "-s", default="https://www.fmkorea.com/best/10346571003", help="Source article URL or keyword")
    parser.add_argument("--voice", "-v", default="supertone-local", help="TTS Engine: supertone-local or edge")
    parser.add_argument("--channel-id", "-c", type=int, default=1, help="Target channel ID")
    args = parser.parse_args()

    payload = {
        "reference_url": args.reference,
        "source_url": args.source if args.source.startswith("http") else None,
        "source_keyword": args.source if not args.source.startswith("http") else None,
        "voice_engine": args.voice,
        "channel_id": args.channel_id,
        "auto_enqueue": True
    }

    print(f"🎬 [ViraLoop Producer] Starting Autonomous Production for: {args.reference}")
    print(f"📄 [ViraLoop Producer] Source: {args.source}")
    print(f"🎙️ [ViraLoop Producer] Voice Engine: {args.voice}")

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/discovery/autonomous-clone-and-produce",
            data=data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=120) as res:
            resp = json.loads(res.read().decode("utf-8"))

        if not resp.get("ok"):
            print(f"❌ [Error] Production failed: {resp.get('error')}")
            sys.exit(1)

        print("\n" + "="*60)
        print("🎉 [제작 완료] 6단계 엔드투엔드 자율 프로덕션 성공!")
        print("="*60)
        print(f"📌 채널 DNA: {resp.get('benchmark', {}).get('title')} (WPM {resp.get('benchmark', {}).get('wpm')})")
        print(f"🏷️ 상단 헤드라인 1행: {resp.get('headline', {}).get('line1')}")
        print(f"🏷️ 상단 헤드라인 2행: {resp.get('headline', {}).get('line2')}")
        print(f"⚡ 중앙 띠바 후킹: {resp.get('headline', {}).get('hookBar')}")
        print(f"🎵 합성 오디오: {resp.get('audio_url')}")
        print(f"🚀 업로드 대기열: Item #{resp.get('work_queue_id')} (READY_FOR_PUBLISH)")
        print("\n📜 [4개 씬 대본 구성]")
        for i, s in enumerate(resp.get("scenes", []), 1):
            print(f"  [Scene {i} ({s.get('duration')}s)] {s.get('narration')}")
        print("="*60)
        print(f"👉 프리뷰 확인: http://localhost:5183/#/instant-studio")
        print("="*60 + "\n")

    except Exception as e:
        print(f"❌ [Error] Failed to connect to ViraLoop Studio API: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
