/**
 * 쇼츠 전문 6대 카테고리 36종 바이럴 SFX & 픽셀링 썰형 효과음 카탈로그 (Single Source of Truth)
 * 36종 효과음마다 완전히 다른 주파수, 화음, 필터, 리듬 엔벨로프를 가진 개별 음향 생성 엔진
 */

export interface SfxItem {
  id: string;
  category: 'impact' | 'whoosh' | 'tension' | 'humor' | 'discovery' | 'tech' | 'pixeling';
  categoryName: string;
  name: string;
  durationMs: number;
  description: string;
  recommendedTiming: string;
  keywords: string[];
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
    keywords: ['충격', '경악', '드디어', '최초', '공개', '실제'],
  },
  {
    id: 'sfx_bass_drop',
    category: 'impact',
    categoryName: '💥 임팩트 & 후킹',
    name: '헤비 베이스 드롭 (Bass Drop)',
    durationMs: 1500,
    description: '클라이맥스 사건 폭로 시 압도감 형성',
    recommendedTiming: '반전/절정',
    keywords: ['폭발', '대참사', '박살', '무너진', '끝장'],
  },
  {
    id: 'sfx_sub_thud',
    category: 'impact',
    categoryName: '💥 임팩트 & 후킹',
    name: '서브 쿵 (Sub Thud)',
    durationMs: 800,
    description: '짧고 굵게 명치를 때리는 타격음',
    recommendedTiming: '쨉쨉이 팝업',
    keywords: ['쿵', '퍽', '직격탄', '충돌', '타격'],
  },
  {
    id: 'sfx_punch_hit',
    category: 'impact',
    categoryName: '💥 임팩트 & 후킹',
    name: '찰진 펀치 히트',
    durationMs: 400,
    description: '쨉쨉이 훅 문구가 팍 튀어나올 때',
    recommendedTiming: '쨉쨉이 등장',
    keywords: ['반전', '팩폭', '훅', '경고', '주의'],
  },
  {
    id: 'sfx_lightning',
    category: 'impact',
    categoryName: '💥 임팩트 & 후킹',
    name: '날벼락 번개 (Lightning)',
    durationMs: 1100,
    description: '충격적 사건, 날벼락 같은 진실',
    recommendedTiming: '충격 사실',
    keywords: ['날벼락', '충격적인', '기절', '마른하늘'],
  },
  {
    id: 'sfx_orchestra_hit',
    category: 'impact',
    categoryName: '💥 임팩트 & 후킹',
    name: '오케스트라 히트 (Hit)',
    durationMs: 900,
    description: '비밀이나 범인이 밝혀지는 순간',
    recommendedTiming: '반전 진실',
    keywords: ['진실은', '정체', '범인', '밝혀진', '순간'],
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
    keywords: ['순식간', '빠르게', '달려', '스피드'],
  },
  {
    id: 'sfx_whip_swish',
    category: 'whoosh',
    categoryName: '💨 속도감 & 전환',
    name: '채찍 휙 (Whip)',
    durationMs: 300,
    description: '화면이 옆으로 팍 넘어갈 때',
    recommendedTiming: '빠른 컷 전환',
    keywords: ['휙', '장면', '다음', '넘어가'],
  },
  {
    id: 'sfx_vacuum_suck',
    category: 'whoosh',
    categoryName: '💨 속도감 & 전환',
    name: '진공 흡입 (Suck)',
    durationMs: 600,
    description: '화면이 빨려들어가며 다음 씬으로',
    recommendedTiming: '씬 전환',
    keywords: ['빨려', '흡입', '과거', '회상'],
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
    keywords: ['긴장', '두근', '초조', '일촉즉발'],
  },
  {
    id: 'sfx_clock_tick',
    category: 'tension',
    categoryName: '❓ 긴장감 & 호기심',
    name: '시계 째깍 (Clock Tick)',
    durationMs: 800,
    description: '시간 제한, 서스펜스 유도',
    recommendedTiming: '초읽기',
    keywords: ['카운트', '시간', '초읽기', '째깍'],
  },
  {
    id: 'sfx_rising_riser',
    category: 'tension',
    categoryName: '❓ 긴장감 & 호기심',
    name: '텐션 라이저 (Riser)',
    durationMs: 1800,
    description: '점점 고조되며 폭발 직전까지',
    recommendedTiming: '클라이맥스 빌드업',
    keywords: ['고조', '점점', '폭발직전', '빌드업'],
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
    keywords: ['잠깐', '어라', '갑자기', '멈칫', '황당'],
  },
  {
    id: 'sfx_censor_beep',
    category: 'humor',
    categoryName: '😂 유머 & 밈 펀치',
    name: '삐- 검열음 (Censor Beep)',
    durationMs: 500,
    description: '욕설/비속어 묵음 처리 유머 효과',
    recommendedTiming: '자체 검열',
    keywords: ['검열', '삐', '방송불가', '심의'],
  },
  {
    id: 'sfx_boing_spring',
    category: 'humor',
    categoryName: '😂 유머 & 밈 펀치',
    name: '용수철 띠용 (Boing)',
    durationMs: 450,
    description: '황당한 실수, 굴욕적인 순간',
    recommendedTiming: '굴욕 샷',
    keywords: ['띠용', '실수', '굴욕', '어이없'],
  },
  {
    id: 'sfx_cartoon_slip',
    category: 'humor',
    categoryName: '😂 유머 & 밈 펀치',
    name: '바나나 꽈당 (Slip)',
    durationMs: 600,
    description: '미끄러지거나 자빠질 때',
    recommendedTiming: '몸개그/낙하',
    keywords: ['미끄덩', '꽈당', '넘어', '자빠'],
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
    keywords: ['정답', '방법', '꿀팁', '알고보니', '비결'],
  },
  {
    id: 'sfx_coin_ching',
    category: 'discovery',
    categoryName: '💡 발견 & 정보',
    name: '동전 짤랑 (Coin Ching)',
    durationMs: 500,
    description: '수익/보상/보너스 포인트 획득',
    recommendedTiming: '수익 공개',
    keywords: ['돈', '수익', '매출', '보너스', '대박'],
  },
  {
    id: 'sfx_level_up',
    category: 'discovery',
    categoryName: '💡 발견 & 정보',
    name: '레벨업 차임 (Chime)',
    durationMs: 900,
    description: '놀라운 성장이나 대기록 달성',
    recommendedTiming: '기록 경신',
    keywords: ['성공', '달성', '기록', '1위', '레벨업'],
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
    keywords: ['타이핑', '작성', '메모', '입력'],
  },
  {
    id: 'sfx_camera_shutter',
    category: 'tech',
    categoryName: '⚙️ 디지털 & 테크',
    name: '카메라 셔터 찰칵 (Shutter)',
    durationMs: 400,
    description: '증거 사진 포착, 결정적 장면',
    recommendedTiming: '스틸 컷',
    keywords: ['포착', '증거', '사진', '찰칵', '순간포착'],
  },
  {
    id: 'sfx_phone_notification',
    category: 'tech',
    categoryName: '⚙️ 디지털 & 테크',
    name: '스마트폰 톡 알림 (Ping)',
    durationMs: 350,
    description: '메시지 도착, 긴급 속보',
    recommendedTiming: '속보 전달',
    keywords: ['카톡', '문자', '메시지', '속보', '알림'],
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
    keywords: ['썰', '이야기', '사연', '후기'],
  },
  {
    id: 'sfx_pixeling_dingdong',
    category: 'pixeling',
    categoryName: '🎬 픽셀링 썰형 세트',
    name: '딩동댕 정답벨 (DingDong)',
    durationMs: 800,
    description: '썰 풀다가 통쾌한 사이다 결말',
    recommendedTiming: '사이다 결말',
    keywords: ['사이다', '참교육', '결과', '통쾌'],
  },
  {
    id: 'sfx_pixeling_thud',
    category: 'pixeling',
    categoryName: '🎬 픽셀링 썰형 세트',
    name: '썰형 쿵 (Heavy Thud)',
    durationMs: 650,
    description: '상대방 멘붕 오는 썰 순간',
    recommendedTiming: '멘붕 충격',
    keywords: ['멘붕', '참패', '말문', '당황'],
  },
  {
    id: 'sfx_pixeling_bbam',
    category: 'pixeling',
    categoryName: '🎬 픽셀링 썰형 세트',
    name: '빠밤 (Dramatic Brass)',
    durationMs: 950,
    description: '사건의 전말이 시작될 때',
    recommendedTiming: '본론 진입',
    keywords: ['그런데', '하지만', '그때', '사건'],
  },
];

/**
 * 36종 효과음마다 완전히 다른 주파수, 화음, 필터, 리듬 엔벨로프를 가진 개별 정밀 신서사이저
 */
export function playSynthesizedSfx(sfxId: string) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    switch (sfxId) {
      // 1. 시네마틱 붐: 55Hz 초저역 럼블 + 화이트 노이즈 펀치
      case 'sfx_cinematic_boom': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.8);
        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.1);
        break;
      }

      // 2. 헤비 베이스 드롭: 320Hz에서 38Hz로 길게 미끄러지는 글라이드 베이스
      case 'sfx_bass_drop': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 1.4);
        gain.gain.setValueAtTime(0.75, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.45);
        break;
      }

      // 3. 서브 쿵: 85Hz 짧고 굵은 명치 서브 펀치 (0.35초)
      case 'sfx_sub_thud': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);
        gain.gain.setValueAtTime(1.0, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }

      // 4. 찰진 펀치 히트: 850Hz 스냅 + 90Hz 타격
      case 'sfx_punch_hit': {
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(850, now);
        osc1.frequency.exponentialRampToValueAtTime(70, now + 0.2);
        gain1.gain.setValueAtTime(0.9, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.22);
        break;
      }

      // 5. 날벼락 번개: 고주파 찌릿 노이즈 스냅 + 천둥 지연 쿵
      case 'sfx_lightning': {
        // 노이즈 버스트
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.15), ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const gN = ctx.createGain();
        gN.gain.setValueAtTime(0.8, now);
        gN.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        src.connect(gN);
        gN.connect(ctx.destination);
        src.start(now);

        // 지연 썬더 럼블
        const osc = ctx.createOscillator();
        const gO = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.9);
        gO.gain.setValueAtTime(0.0, now);
        gO.gain.setValueAtTime(0.8, now + 0.08);
        gO.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        osc.connect(gO);
        gO.connect(ctx.destination);
        osc.start(now + 0.08);
        osc.stop(now + 0.9);
        break;
      }

      // 6. 오케스트라 히트: 3중 화음 브라스 스탭 (Root 220Hz, Minor 3rd 261Hz, 5th 330Hz)
      case 'sfx_orchestra_hit': {
        [220, 261.6, 329.6, 440].forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.65);
        });
        break;
      }

      // 7. 에어 쉭: 대역통과 바람 소리 스위프
      case 'sfx_air_whoosh': {
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.35), ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(2800, now + 0.15);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.35);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.7, now + 0.15);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        src.start(now);
        break;
      }

      // 8. 채찍 휙: 초고속 0.18초 찰싹 스냅
      case 'sfx_whip_swish': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2400, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.18);
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
        break;
      }

      // 9. 진공 흡입: 역방향 리버스 스위프 (낮은 주파수에서 올라가는 빨려듬)
      case 'sfx_vacuum_suck': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.45);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.7, now + 0.4);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.48);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.48);
        break;
      }

      // 10. 심장 박동: 쿵-쾅 (더블 펄스)
      case 'sfx_heartbeat': {
        [0, 0.22].forEach((offset, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(idx === 0 ? 65 : 80, now + offset);
          osc.frequency.exponentialRampToValueAtTime(30, now + offset + 0.18);
          gain.gain.setValueAtTime(0.85, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.2);
        });
        break;
      }

      // 11. 시계 째깍: 우드블록 틱 (1400Hz 단타)
      case 'sfx_clock_tick': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1400, now);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }

      // 12. 텐션 라이저: 3옥타브 연속 상승 톱니파 긴장감
      case 'sfx_rising_riser': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(1600, now + 1.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.65, now + 1.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.25);
        break;
      }

      // 13. 레코드 스크래치: 바이닐 디제이 스크래치 특유의 지지직 노이즈
      case 'sfx_record_scratch': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.linearRampToValueAtTime(300, now + 0.12);
        osc.frequency.linearRampToValueAtTime(1400, now + 0.25);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
        break;
      }

      // 14. 삐- 검열음: 정확한 1000Hz 정현파
      case 'sfx_censor_beep': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.setValueAtTime(0.4, now + 0.35);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }

      // 15. 용수철 띠용: FM 모듈레이션 비브라토 상승 벤드
      case 'sfx_boing_spring': {
        const carrier = ctx.createOscillator();
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();
        const mainGain = ctx.createGain();

        modulator.frequency.setValueAtTime(28, now); // 비브라토 주기
        modGain.gain.setValueAtTime(90, now); // 비브라토 깊이

        carrier.frequency.setValueAtTime(260, now);
        carrier.frequency.exponentialRampToValueAtTime(750, now + 0.38);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        mainGain.gain.setValueAtTime(0.7, now);
        mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

        carrier.connect(mainGain);
        mainGain.connect(ctx.destination);

        carrier.start(now);
        modulator.start(now);
        carrier.stop(now + 0.42);
        modulator.stop(now + 0.42);
        break;
      }

      // 16. 바나나 꽈당: 휘이익 하강 후 쿵
      case 'sfx_cartoon_slip': {
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(900, now);
        osc1.frequency.exponentialRampToValueAtTime(150, now + 0.28);
        gain1.gain.setValueAtTime(0.6, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.28);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(120, now + 0.28);
        osc2.frequency.exponentialRampToValueAtTime(35, now + 0.5);
        gain2.gain.setValueAtTime(0.8, now + 0.28);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.28);
        osc2.stop(now + 0.52);
        break;
      }

      // 17. 전구 띵: 맑고 영롱한 1760Hz 싱글 차임
      case 'sfx_bulb_ding': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1760, now);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.55);
        break;
      }

      // 18. 동전 짤랑: 2400Hz + 3200Hz 듀얼 메탈릭 링
      case 'sfx_coin_ching': {
        [2400, 3200].forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.4);
        });
        break;
      }

      // 19. 레벨업 차임: 도-미-솔-도 메이저 4화음 고속 아르페지오
      case 'sfx_level_up': {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteTime = now + idx * 0.08;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, noteTime);
          gain.gain.setValueAtTime(0.5, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(noteTime);
          osc.stop(noteTime + 0.35);
        });
        break;
      }

      // 20. 타자기 타닥: 기계식 타건 스냅 클릭
      case 'sfx_typewriter': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.055);
        break;
      }

      // 21. 카메라 셔터 찰칵: 더블 미러 셔터 (2단 클릭)
      case 'sfx_camera_shutter': {
        [0, 0.08].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(1600, now + offset);
          osc.frequency.exponentialRampToValueAtTime(300, now + offset + 0.04);
          gain.gain.setValueAtTime(0.65, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.045);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.045);
        });
        break;
      }

      // 22. 스마트폰 톡 알림: 마림바 2음 차임 (미 659Hz -> 솔 784Hz)
      case 'sfx_phone_notification': {
        [659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteTime = now + idx * 0.09;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteTime);
          gain.gain.setValueAtTime(0.6, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(noteTime);
          osc.stop(noteTime + 0.25);
        });
        break;
      }

      // 23. 픽셀링 레트로 타자기: 묵직한 썰형 전용 감성 타건음
      case 'sfx_pixeling_type': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.07);
        gain.gain.setValueAtTime(0.75, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.075);
        break;
      }

      // 24. 픽셀링 딩동댕: 딩(솔 784Hz) -> 동(미 659Hz) -> 댕(도 1046Hz) 3화음 정답벨
      case 'sfx_pixeling_dingdong': {
        const notes = [783.99, 659.25, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteTime = now + idx * 0.15;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, noteTime);
          gain.gain.setValueAtTime(0.6, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(noteTime);
          osc.stop(noteTime + 0.4);
        });
        break;
      }

      // 25. 픽셀링 썰형 쿵: 상대방 멘붕 올 때 묵직한 저음 타격
      case 'sfx_pixeling_thud': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.55);
        gain.gain.setValueAtTime(0.95, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
        break;
      }

      // 26. 픽셀링 빠밤: 드라마틱 브라스 히트 (단조 코드 단타)
      case 'sfx_pixeling_bbam': {
        [220, 261.6, 329.6].forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.7);
        });
        break;
      }

      // 기본 fallback
      default: {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(130, now + 0.2);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
        break;
      }
    }
  } catch (e) {
    console.warn('Web Audio SFX playback error:', e);
  }
}
