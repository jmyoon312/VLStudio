import os

b64_path = r"C:\Users\jmyoo\.gemini\antigravity\brain\0a6bdcde-973e-4b89-a87c-d589efb514a6\audio_b64.txt"
with open(b64_path, "r", encoding="utf-8") as f:
    b64_audio = f.read().strip()

html_content = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ViraLoop Studio - 뇌전구 템플릿 + 페페 밈 실사 쇼츠 플레이어</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', 'Noto Sans KR', sans-serif; }
  body {
    background: #090d16;
    color: #f8fafc;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
  }
  .preview-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    max-width: 440px;
    width: 100%;
  }
  /* 9:16 Shorts Phone Frame */
  .phone-frame {
    width: 360px;
    height: 640px;
    background: #000000;
    border-radius: 32px;
    overflow: hidden;
    position: relative;
    border: 4px solid #1e293b;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 24px rgba(255, 229, 0, 0.15);
    display: flex;
    flex-direction: column;
  }
  /* Top 24% Header (Gunlimbo Sovereign Template) */
  .top-header {
    background: #000000;
    height: 154px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px 14px 10px 14px;
    text-align: center;
    z-index: 30;
    border-bottom: 2px solid #111827;
  }
  .top-line-1 {
    font-size: 24px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.5px;
    line-height: 1.15;
    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
  }
  .top-line-2 {
    font-size: 30px;
    font-weight: 900;
    color: #ffe500;
    letter-spacing: -0.8px;
    line-height: 1.2;
    margin-top: 4px;
    text-shadow: 0 2px 8px rgba(0,0,0,0.9);
  }
  .hook-band {
    background: #ffffff;
    color: #000000;
    font-size: 14px;
    font-weight: 900;
    padding: 3px 14px;
    border-radius: 4px;
    display: inline-block;
    margin-top: 8px;
    letter-spacing: -0.3px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5);
  }
  /* Center 1:1 Canvas (Sandwich Fit Mode + Ken Burns Zoom) */
  .center-canvas {
    flex: 1;
    width: 100%;
    position: relative;
    overflow: hidden;
    background: #050811;
  }
  .scene-view {
    position: absolute;
    inset: 0;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.4s ease-in-out;
  }
  .scene-view.active {
    opacity: 1;
    pointer-events: auto;
  }
  /* Ken Burns Background Photo */
  .scene-bg-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    animation: kenBurns 7s ease-out infinite alternate;
    filter: brightness(0.85) contrast(1.1);
  }
  @keyframes kenBurns {
    0% { transform: scale(1.0); }
    100% { transform: scale(1.15); }
  }
  /* Pepe Meme Reaction Sticker */
  .pepe-sticker {
    position: absolute;
    bottom: 80px;
    right: 16px;
    width: 120px;
    height: 120px;
    z-index: 25;
    filter: drop-shadow(0 8px 16px rgba(0,0,0,0.8));
    animation: pepePop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }
  @keyframes pepePop {
    0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
    70% { transform: scale(1.15) rotate(5deg); opacity: 1; }
    100% { transform: scale(1.0) rotate(0deg); opacity: 1; }
  }
  /* Scene Badge */
  .scene-tag {
    position: absolute;
    top: 12px;
    left: 12px;
    background: rgba(0, 0, 0, 0.75);
    border: 1px solid rgba(255, 229, 0, 0.8);
    color: #ffe500;
    font-size: 11px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 6px;
    z-index: 26;
    backdrop-filter: blur(4px);
  }
  /* Subtitle Layer (Gunlimbo 72% Y PopIn) */
  .subtitles-layer {
    position: absolute;
    bottom: 24px;
    left: 12px;
    right: 12px;
    text-align: center;
    z-index: 35;
    pointer-events: none;
  }
  .subtitle-bubble {
    font-size: 21px;
    font-weight: 900;
    color: #ffe500;
    letter-spacing: -0.4px;
    line-height: 1.3;
    -webkit-text-stroke: 1.8px #000000;
    text-shadow: 0 4px 12px rgba(0,0,0,0.95);
    background: rgba(0, 0, 0, 0.6);
    padding: 6px 14px;
    border-radius: 8px;
    display: inline-block;
    max-width: 95%;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 20px rgba(0,0,0,0.6);
  }
  /* Bottom Controller Panel */
  .controls-card {
    width: 360px;
    background: #131d31;
    border: 1px solid #27354f;
    border-radius: 20px;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
  }
  .control-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .play-btn {
    background: #ffe500;
    color: #000000;
    border: none;
    border-radius: 50%;
    width: 48px;
    height: 48px;
    font-size: 22px;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.1s ease, background 0.2s;
    box-shadow: 0 4px 12px rgba(255, 229, 0, 0.4);
  }
  .play-btn:hover { background: #facc15; transform: scale(1.06); }
  .play-btn:active { transform: scale(0.94); }
  .progress-bar {
    flex: 1;
    height: 8px;
    background: #1e293b;
    border-radius: 9999px;
    overflow: hidden;
    cursor: pointer;
    position: relative;
  }
  .progress-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #eab308, #ffe500);
    transition: width 0.1s linear;
  }
  .time-text {
    font-size: 13px;
    font-weight: 700;
    color: #94a3b8;
    min-width: 80px;
    text-align: right;
  }
</style>
</head>
<body>

<div class="preview-wrapper">
  <div style="text-align: center; margin-bottom: 4px;">
    <h2 style="font-size: 19px; color: #f8fafc; font-weight: 800;">🎯 뇌전구 템플릿 + 페페 밈 실사 쇼츠</h2>
    <p style="font-size: 13px; color: #94a3b8;">4대 폼팩터 마스터 템플릿 + 감정 매칭 페페 에셋 100% 결합</p>
  </div>

  <!-- Shorts Mobile Frame -->
  <div class="phone-frame">
    <!-- Sovereign Top Header (뇌전구 24% 공식 레이아웃) -->
    <div class="top-header">
      <div class="top-line-1">남들 다 퇴사할 때</div>
      <div class="top-line-2">나만 승진한 썰ㅋㅋ</div>
      <div><span class="hook-band">퇴사러시 속 초고속 승진 비결</span></div>
    </div>

    <!-- Center 1:1 Visual Canvas (실사 사진 + 페페 밈 스티커) -->
    <div class="center-canvas">
      <!-- 씬 1: 동기 전멸 / 텅 빈 오피스 + 우는 페페 -->
      <div class="scene-view active" id="scene-1">
        <span class="scene-tag">SCENE 1 • 동기 전멸</span>
        <img class="scene-bg-img" src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=720&auto=format&fit=crop&q=80" alt="텅 빈 사무실">
        <img class="pepe-sticker" src="/assets/memes/pepe/pepe_cry.svg" alt="절망하는 페페">
      </div>

      <!-- 씬 2: 연봉 40% 인상 / 보상 폭발 + 거만한 돈 페페 -->
      <div class="scene-view" id="scene-2">
        <span class="scene-tag">SCENE 2 • 연봉 40% 폭발</span>
        <img class="scene-bg-img" src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=720&auto=format&fit=crop&q=80" alt="연봉 계산기 계약서">
        <img class="pepe-sticker" src="/assets/memes/pepe/pepe_smug.svg" alt="거만한 페페">
      </div>

      <!-- 씬 3: 네티즌 7명 독박 폭소 댓글 + 충격 페페 -->
      <div class="scene-view" id="scene-3">
        <span class="scene-tag">SCENE 3 • 네티즌 폭소 반응</span>
        <img class="scene-bg-img" src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=720&auto=format&fit=crop&q=80" alt="스마트폰 댓글 반응">
        <img class="pepe-sticker" src="/assets/memes/pepe/pepe_shock.svg" alt="충격 페페">
      </div>

      <!-- 씬 4: 버티기 vs 탈출 선택 질문 + 고민하는 페페 -->
      <div class="scene-view" id="scene-4">
        <span class="scene-tag">SCENE 4 • 시청자 선택 질문</span>
        <img class="scene-bg-img" src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=720&auto=format&fit=crop&q=80" alt="교차로 사무실">
        <img class="pepe-sticker" src="/assets/memes/pepe/pepe_thinking.svg" alt="고민하는 페페">
      </div>

      <!-- Gunlimbo 72% Y-Position Dynamic Subtitle -->
      <div class="subtitles-layer">
        <div class="subtitle-bubble" id="sub-text">▶ 재생 버튼을 누르면 시작됩니다</div>
      </div>
    </div>
  </div>

  <!-- Audio Playback Controller -->
  <div class="controls-card">
    <div class="control-row">
      <button class="play-btn" id="play-btn" onclick="togglePlay()">▶</button>
      <div class="progress-bar" id="prog-bar" onclick="seek(event)">
        <div class="progress-fill" id="prog-fill"></div>
      </div>
      <div class="time-text" id="time-text">0:00 / 0:18</div>
    </div>
  </div>
</div>

<audio id="audio-elem" src="data:audio/mp3;base64,""" + b64_audio + """" preload="auto"></audio>

<script>
  const audio = document.getElementById('audio-elem');
  const playBtn = document.getElementById('play-btn');
  const progFill = document.getElementById('prog-fill');
  const timeText = document.getElementById('time-text');
  const subText = document.getElementById('sub-text');

  const scenes = [
    { id: 'scene-1', start: 0.0, end: 3.5, text: '입사 동기 7명 전원 퇴사했는데 저만 3년 만에 과장 달았습니다' },
    { id: 'scene-2', start: 3.5, end: 9.0, text: '부서 퇴사율 87%, 사람이 없으니 업무가 다 몰렸고 회사가 연봉 40% 인상에 특진까지 걸어버린 겁니다' },
    { id: 'scene-3', start: 9.0, end: 14.0, text: '근데 네티즌 반응이 미쳤습니다 "그거 승진 아니고 너 혼자 남아서 자동 진급된 거잖아" 댓글 난리났습니다' },
    { id: 'scene-4', start: 14.0, end: 18.5, text: '남들 퇴사할 때 버틴 게 기회가 된 건데, 여러분이라면 버티시겠습니까 같이 퇴사하시겠습니까?' }
  ];

  function togglePlay() {
    if (audio.paused) {
      audio.play();
      playBtn.textContent = '❚❚';
    } else {
      audio.pause();
      playBtn.textContent = '▶';
    }
  }

  audio.addEventListener('timeupdate', () => {
    const cur = audio.currentTime;
    const dur = audio.duration || 18.5;
    const pct = (cur / dur) * 100;
    progFill.style.width = pct + '%';
    timeText.textContent = formatTime(cur) + ' / ' + formatTime(dur);

    // Synchronize active scene
    let currentScene = scenes.find(s => cur >= s.start && cur < s.end) || scenes[scenes.length - 1];
    scenes.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) el.classList.toggle('active', s.id === currentScene.id);
    });

    if (currentScene) {
      subText.textContent = currentScene.text;
    }
  });

  audio.addEventListener('ended', () => {
    playBtn.textContent = '▶';
    progFill.style.width = '0%';
  });

  function seek(e) {
    const bar = document.getElementById('prog-bar');
    const rect = bar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    audio.currentTime = pct * (audio.duration || 18.5);
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
</script>
</body>
</html>
"""

# Save to artifacts directory and dashboard public folder
target_path_1 = r"C:\Users\jmyoo\.gemini\antigravity\brain\0a6bdcde-973e-4b89-a87c-d589efb514a6\player_preview.html"
target_path_2 = r"c:\ViraLoopMedia\VLStudio\apps\dashboard\public\preview.html"

with open(target_path_1, "w", encoding="utf-8") as f:
    f.write(html_content)

with open(target_path_2, "w", encoding="utf-8") as f:
    f.write(html_content)

print("Saved upgraded preview with Pepe meme & real photos successfully!")
