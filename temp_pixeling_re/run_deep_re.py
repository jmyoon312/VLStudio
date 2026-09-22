import re, json, os

def analyze_bundle(filepath, out_path, name):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        code = f.read()

    report = []
    report.append(f"==================================================")
    report.append(f"  REVERSE ENGINEERING REPORT: {name}")
    report.append(f"  File: {filepath} ({len(code):,} chars / {len(code)/1024/1024:.2f} MB)")
    report.append(f"==================================================\n")

    # 1. Look for React Component definitions and Hooks
    components = set(re.findall(r'function\s+([A-Z][a-zA-Z0-9]{2,30})\s*\(', code))
    report.append(f"### 1. Detected React Components ({len(components)}):\n")
    for c in sorted(components)[:50]:
        report.append(f"  - {c}")

    # 2. Look for State names / Props / Action Types
    actions = set(re.findall(r'type:\s*[\'\"]([A-Z_0-9]{3,40})[\'\"]', code))
    report.append(f"\n### 2. Detected Redux / Reducer Action Types ({len(actions)}):\n")
    for a in sorted(actions):
        report.append(f"  - {a}")

    # 3. Look for API routes / Endpoints
    api_routes = set(re.findall(r'[\'\"`](/(?:api|trpc|v[0-9]|ve|batch|one-take)[a-zA-Z0-9_\-\/]+)[\'\"`]', code))
    report.append(f"\n### 3. Detected API Routes / Endpoints ({len(api_routes)}):\n")
    for ep in sorted(api_routes):
        report.append(f"  - {ep}")

    # 4. Korean UI Labels and Strings
    ko_strings = set(re.findall(r'[\'\"]([가-힣\s\(\)\[\]\/\:\.\,\!\?\-\+\%\#]{2,50})[\'\"]', code))
    report.append(f"\n### 4. Korean UI Labels & Features ({len(ko_strings)} strings):\n")
    
    # Categorize strings
    categories = {
        '타임라인/트랙/클립': ['트랙', '클립', '타임라인', '플레이헤드', '시간', '초', '프레임', '분할', '삭제', '자르기', '트림', '간격', '밀착', '스냅'],
        '캔버스/비디오/플레이어': ['캔버스', '화면', '비디오', '재생', '일시정지', '해상도', '비율', '배속', '회전', '크롭', '줌'],
        '자막/텍스트': ['자막', '텍스트', '글꼴', '폰트', '색상', '외곽선', '그림자', '배경', '정렬', '줄간격', '자간', '싱크', 'STT'],
        '오디오/효과음/음악': ['오디오', '음악', '효과음', 'BGM', '볼륨', '음소거', '페이드', '보컬', 'MR'],
        '일괄생성/탭/워크스페이스': ['일괄', '생성', '원테이크', '롱폼', '쇼츠', '노래', '썰', '대본', '작업', '대기열', '배포', '다운로드'],
        '내보내기/렌더링': ['내보내기', '렌더링', '인코딩', 'CapCut', '캡컷', 'MP4', '저장', '완료', '실패']
    }

    for cat, keywords in categories.items():
        matches = [s.strip() for s in ko_strings if any(k in s for k in keywords)]
        report.append(f"\n#### [{cat}] ({len(matches)} items):")
        for m in sorted(set(matches))[:40]:
            report.append(f"  - {m}")

    with open(out_path, 'w', encoding='utf-8') as out:
        out.write('\n'.join(report))
    print(f"Report written to {out_path}")

analyze_bundle('temp_pixeling_re/page-5ca01b04f75cb3f3.js', 'temp_pixeling_re/ve_analysis_report.txt', 'PIXELING VIDEO EDITOR (/ve)')
analyze_bundle('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'temp_pixeling_re/batch_analysis_report.txt', 'PIXELING ONE-TAKE BATCH (/pixi-one-take-batch)')
