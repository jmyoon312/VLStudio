/**
 * 쇼츠 전문 6대 카테고리 36종 바이럴 SFX & 픽셀링 썰형 효과음 카탈로그 (Single Source of Truth)
 */

export interface SfxItem {
  id: string;
  category: 'impact' | 'whoosh' | 'tension' | 'humor' | 'discovery' | 'tech' | 'pixeling';
  categoryName: string;
  name: string;
  durationMs: number;
  description: string;
  recommendedTiming: string;
  soundType: 'boom' | 'bass' | 'whoosh' | 'beep' | 'pop' | 'bell' | 'typewriter' | 'click' | 'record_scratch';
}

export const SFX_CATALOG: SfxItem[] = [
  // 1. 💥 임팩트 & 후킹 (Impact/Hook)
  {
    id: 'sfx_cinematic_boom',
    category: 'impact',
    categoryName: '💥 임팩트 & 후킹',
    name: '시네마틱 붐 (Boom)',
    durationMs: 1200,
    description: '첫 3초 시선 강탈 묵직한 저음 타격',
    recommendedTiming: '첫 3초 후크',
    soundType: 'boom',
  },
  {
    id: 'sfx_bass_drop',
    category: 'impact',
    categoryName: '💥 임팩트 & 후킹',
    name: '헤비 베이스 드롭 (Bass Drop)',
    durationMs: 1500,
    description: '클라이맥스 사건 폭로 시 압도감 형성',
    recommendedTiming: '반전/절정',
    soundType: 'bass',
  },
  {
    id: 'sfx_sub_thud',
    category: 'impact',
    categoryName: '💥 임팩트 & 후킹',
    name: '서브 쿵 (Sub Thud)',
    durationMs: 800,
    description: '짧고 굵게 명치를 때리는 타격음',
    recommendedTiming: '쨉쨉이 팝업',
    soundType: 'bass',
  },
  {
    id: 'sfx_punch_hit',
    category: 'impact',
    categoryName: '💥 임팩트 & 후킹',
    name: '찰진 펀치 히트',
    durationMs: 400,
    description: '쨉쨉이 훅 문구가 팍 튀어나올 때',
    recommendedTiming: '쨉쨉이 등장',
    soundType: 'pop',
  },
  {
    id: 'sfx_lightning',
    category: 'impact',
    categoryName: '💥 임팩트 & 후킹',
    name: '날벼락 번개 (Lightning)',
    durationMs: 1100,
    description: '충격적 사건, 날벼락 같은 진실',
    recommendedTiming: '충격 사실',
    soundType: 'boom',
  },
  {
    id: 'sfx_orchestra_hit',
    category: 'impact',
    categoryName: '💥 임팩트 & 후킹',
    name: '오케스트라 히트 (Hit)',
    durationMs: 900,
    description: '비밀이나 범인이 밝혀지는 순간',
    recommendedTiming: '반전 진실',
    soundType: 'boom',
  },

  // 2. 💨 속도감 & 전환 (Whoosh/Whip)
  {
    id: 'sfx_air_whoosh',
    category: 'whoosh',
    categoryName: '💨 속도감 & 전환',
    name: '에어 쉭 (Air Whoosh)',
    durationMs: 350,
    description: '자막/클립이 순식간에 전환될 때',
    recommendedTiming: '화면 전환',
    soundType: 'whoosh',
  },
  {
    id: 'sfx_whip_swish',
    category: 'whoosh',
    categoryName: '💨 속도감 & 전환',
    name: '채찍 휙 (Whip)',
    durationMs: 300,
    description: '화면이 옆으로 팍 넘어갈 때',
    recommendedTiming: '빠른 컷 전환',
    soundType: 'whoosh',
  },
  {
    id: 'sfx_vacuum_suck',
    category: 'whoosh',
    categoryName: '💨 속도감 & 전환',
    name: '진공 흡입 (Suck)',
    durationMs: 600,
    description: '화면이 빨려들어가며 다음 씬으로',
    recommendedTiming: '씬 전환',
    soundType: 'whoosh',
  },

  // 3. ❓ 긴장감 & 호기심 (Tension)
  {
    id: 'sfx_heartbeat',
    category: 'tension',
    categoryName: '❓ 긴장감 & 호기심',
    name: '심장 박동 (Heartbeat)',
    durationMs: 1000,
    description: '두근두근 긴박한 카운트다운',
    recommendedTiming: '위기 직전',
    soundType: 'bass',
  },
  {
    id: 'sfx_clock_tick',
    category: 'tension',
    categoryName: '❓ 긴장감 & 호기심',
    name: '시계 째깍 (Clock Tick)',
    durationMs: 800,
    description: '시간 제한, 서스펜스 유도',
    recommendedTiming: '초읽기',
    soundType: 'click',
  },
  {
    id: 'sfx_rising_riser',
    category: 'tension',
    categoryName: '❓ 긴장감 & 호기심',
    name: '텐션 라이저 (Riser)',
    durationMs: 1800,
    description: '점점 고조되며 폭발 직전까지',
    recommendedTiming: '클라이맥스 빌드업',
    soundType: 'whoosh',
  },

  // 4. 😂 유머 & 밈 펀치 (Humor/Meme)
  {
    id: 'sfx_record_scratch',
    category: 'humor',
    categoryName: '😂 유머 & 밈 펀치',
    name: '레코드 스크래치 (Scratch)',
    durationMs: 700,
    description: '음악이 뚝 끊기며 분위기 반전',
    recommendedTiming: '어이없는 순간',
    soundType: 'record_scratch',
  },
  {
    id: 'sfx_censor_beep',
    category: 'humor',
    categoryName: '😂 유머 & 밈 펀치',
    name: '삐- 검열음 (Censor Beep)',
    durationMs: 500,
    description: '욕설/비속어 묵음 처리 유머 효과',
    recommendedTiming: '자체 검열',
    soundType: 'beep',
  },
  {
    id: 'sfx_boing_spring',
    category: 'humor',
    categoryName: '😂 유머 & 밈 펀치',
    name: '용수철 띠용 (Boing)',
    durationMs: 450,
    description: '황당한 실수, 굴욕적인 순간',
    recommendedTiming: '굴욕 샷',
    soundType: 'pop',
  },
  {
    id: 'sfx_cartoon_slip',
    category: 'humor',
    categoryName: '😂 유머 & 밈 펀치',
    name: '바나나 꽈당 (Slip)',
    durationMs: 600,
    description: '미끄러지거나 자빠질 때',
    recommendedTiming: '몸개그/낙하',
    soundType: 'pop',
  },

  // 5. 💡 발견 & 정보 (Discovery/Knowledge)
  {
    id: 'sfx_bulb_ding',
    category: 'discovery',
    categoryName: '💡 발견 & 정보',
    name: '전구 띵 (Idea Ding)',
    durationMs: 600,
    description: '번뜩이는 아이디어, 정답 공개',
    recommendedTiming: '해결책 제시',
    soundType: 'bell',
  },
  {
    id: 'sfx_coin_ching',
    category: 'discovery',
    categoryName: '💡 발견 & 정보',
    name: '동전 짤랑 (Coin Ching)',
    durationMs: 500,
    description: '수익/보상/보너스 포인트 획득',
    recommendedTiming: '수익 공개',
    soundType: 'bell',
  },
  {
    id: 'sfx_level_up',
    category: 'discovery',
    categoryName: '💡 발견 & 정보',
    name: '레벨업 차임 (Chime)',
    durationMs: 900,
    description: '놀라운 성장이나 대기록 달성',
    recommendedTiming: '기록 경신',
    soundType: 'bell',
  },

  // 6. ⚙️ 디지털 & 테크 (Tech/Digital)
  {
    id: 'sfx_typewriter',
    category: 'tech',
    categoryName: '⚙️ 디지털 & 테크',
    name: '타자기 타닥 (Typewriter)',
    durationMs: 800,
    description: '글자가 타이핑되며 써질 때',
    recommendedTiming: '자막 타이핑',
    soundType: 'typewriter',
  },
  {
    id: 'sfx_camera_shutter',
    category: 'tech',
    categoryName: '⚙️ 디지털 & 테크',
    name: '카메라 셔터 찰칵 (Shutter)',
    durationMs: 400,
    description: '증거 사진 포착, 결정적 장면',
    recommendedTiming: '스틸 컷',
    soundType: 'pop',
  },
  {
    id: 'sfx_phone_notification',
    category: 'tech',
    categoryName: '⚙️ 디지털 & 테크',
    name: '스마트폰 톡 알림 (Ping)',
    durationMs: 350,
    description: '메시지 도착, 긴급 속보',
    recommendedTiming: '속보 전달',
    soundType: 'bell',
  },

  // 7. 🎬 픽셀링(app.pixeling.io/jj) 썰형 대표 효과음 세트
  {
    id: 'sfx_pixeling_type',
    category: 'pixeling',
    categoryName: '🎬 픽셀링 썰형 세트',
    name: '썰형 레트로 타자기 (Pixeling)',
    durationMs: 700,
    description: '픽셀링 썰형 채널 전용 감성 타건음',
    recommendedTiming: '썰 텍스트 시작',
    soundType: 'typewriter',
  },
  {
    id: 'sfx_pixeling_dingdong',
    category: 'pixeling',
    categoryName: '🎬 픽셀링 썰형 세트',
    name: '딩동댕 정답벨 (DingDong)',
    durationMs: 800,
    description: '썰 풀다가 통쾌한 사이다 결말',
    recommendedTiming: '사이다 결말',
    soundType: 'bell',
  },
  {
    id: 'sfx_pixeling_thud',
    category: 'pixeling',
    categoryName: '🎬 픽셀링 썰형 세트',
    name: '썰형 쿵 (Heavy Thud)',
    durationMs: 650,
    description: '상대방 멘붕 오는 썰 순간',
    recommendedTiming: '멘붕 충격',
    soundType: 'bass',
  },
  {
    id: 'sfx_pixeling_bbam',
    category: 'pixeling',
    categoryName: '🎬 픽셀링 썰형 세트',
    name: '빠밤 (Dramatic Brass)',
    durationMs: 950,
    description: '사건의 전말이 시작될 때',
    recommendedTiming: '본론 진입',
    soundType: 'boom',
  },
];

/**
 * Web Audio API를 활용한 무지연 고품질 SFX 신서사이저 플레이어
 */
export function playSynthesizedSfx(soundType: SfxItem['soundType']) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (soundType === 'boom' || soundType === 'bass') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (soundType === 'whoosh') {
      const bufferSize = Math.floor(ctx.sampleRate * 0.35);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(2500, now + 0.15);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.35);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.7, now + 0.15);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } else if (soundType === 'bell') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1760, now + 0.05);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (soundType === 'beep') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, now);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.setValueAtTime(0.4, now + 0.3);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (soundType === 'typewriter' || soundType === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.06);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (e) {
    console.warn('Web Audio SFX failed:', e);
  }
}
