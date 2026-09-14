// ── Single Source of Truth for Canvas Presets, Memes, Fonts, and Helpers ──

export type LayoutTemplateMode = 'classic' | 'instagram' | 'gunlimbo' | 'ssul';
export type SsulTextMode = 'accumulate' | 'single-stepped' | 'single-fixed';
export type ScriptSplitPreset = 'shorts' | 'balanced' | 'sentence';
export type BgmMood = 'energetic' | 'emotional' | 'suspense' | 'funny' | 'cinematic';

// 🎨 안전한 HEX 컬러 변환 헬퍼 (HTML5 input[type=color] 표준 #rrggbb 보장 및 rgba 경고 원천 차단)
export const rgbaToHex = (colorStr?: string, fallback: string = '#000000'): string => {
  if (!colorStr || typeof colorStr !== 'string') return fallback;
  const trimmed = colorStr.trim();
  if (/^#[0-9a-fA-F]{6}$/i.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/i.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^#[0-9a-fA-F]{8}$/i.test(trimmed)) {
    return trimmed.slice(0, 7);
  }
  const rgbaMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbaMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbaMatch[1], 10))).toString(16).padStart(2, '0');
    const g = Math.min(255, Math.max(0, parseInt(rgbaMatch[2], 10))).toString(16).padStart(2, '0');
    const b = Math.min(255, Math.max(0, parseInt(rgbaMatch[3], 10))).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  if (trimmed.startsWith('#')) {
    const clean = trimmed.replace(/[^0-9a-fA-F]/g, '');
    if (clean.length >= 6) return `#${clean.slice(0, 6)}`;
  }
  return fallback;
};

// 📸 인스타형 채널 아이덴티티 10대 추천 프리셋 (랜덤 생성 및 고정 지원)
export const INSTA_PROFILE_PRESETS = [
  { name: '유머보따리', handle: '@humor_box', avatar: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=humor' },
  { name: '스타비하인드', handle: '@star_behind', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=star' },
  { name: '팩트연구소', handle: '@fact_lab', avatar: 'https://api.dicebear.com/9.x/bottts/svg?seed=fact' },
  { name: '명장면극장', handle: '@scene_theater', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=cinema' },
  { name: '댕냥이일기', handle: '@pet_diary', avatar: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=pet' },
  { name: '스포츠클립', handle: '@sports_clip', avatar: 'https://api.dicebear.com/9.x/bottts/svg?seed=sports' },
  { name: '속마음라디오', handle: '@heart_radio', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=heart' },
  { name: '길거리마이크', handle: '@street_mic', avatar: 'https://api.dicebear.com/9.x/bottts/svg?seed=mic' },
  { name: '인생꿀팁봇', handle: '@life_tips_kr', avatar: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=tips' },
  { name: '미스터리파일', handle: '@mystery_files', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=mystery' },
];

// 🎨 캡컷 인기 시네마틱 필터 프리셋
export const CAPCUT_FILTER_PRESETS = [
  { id: 'none', name: '원본 (Original)', desc: '보정 없음', color: 'from-zinc-500 to-zinc-600', grain: 0, vignette: 0, b: 100, c: 100, s: 100, t: 0 },
  { id: 'cinematic-film', name: '🎬 시네마틱 35mm', desc: '영화 필름 질감 & 아날로그 그레인', color: 'from-amber-600 to-red-600', grain: 45, vignette: 40, b: 98, c: 120, s: 95, t: 10 },
  { id: 'teal-orange', name: '🌆 헐리우드 틸 & 오렌지', desc: '블록버스터 시네마 룩', color: 'from-teal-500 to-orange-500', grain: 20, vignette: 30, b: 102, c: 125, s: 125, t: 15 },
  { id: 'retro-vhs', name: '📼 90s 레트로 VHS', desc: '아날로그 테이프 & 주사선 노이즈', color: 'from-purple-600 to-pink-500', grain: 65, vignette: 45, b: 105, c: 115, s: 85, t: 12 },
  { id: 'film-noir', name: '🎞️ 클래식 필름 느와르', desc: '고대비 모노크롬 흑백', color: 'from-zinc-800 to-zinc-950', grain: 55, vignette: 55, b: 95, c: 145, s: 0, t: 0 },
  { id: 'cyberpunk', name: '⚡ 사이버펑크 네온', desc: '시안 & 마젠타 퓨처리스틱', color: 'from-cyan-500 to-fuchsia-600', grain: 15, vignette: 35, b: 105, c: 135, s: 160, t: -15 },
  { id: 'kodak-warm', name: '🌅 웜 코닥 골드', desc: '따뜻한 골든아워 감성 필름', color: 'from-amber-500 to-yellow-600', grain: 30, vignette: 25, b: 103, c: 110, s: 115, t: 25 },
  { id: 'fuji-cool', name: '❄️ 쿨 후지필름', desc: '청량하고 차분한 모던 톤', color: 'from-sky-500 to-emerald-500', grain: 20, vignette: 20, b: 100, c: 112, s: 92, t: -20 },
  { id: 'dreamy-glow', name: '✨ 드림 글로우', desc: '몽환적인 소프트 확산광', color: 'from-pink-400 to-rose-400', grain: 10, vignette: 20, b: 112, c: 90, s: 108, t: 8 },
  { id: 'vintage-grain', name: '📽️ 1970 빈티지 그레인', desc: '헤비 입자 & 세피아 톤', color: 'from-amber-700 to-stone-800', grain: 80, vignette: 50, b: 95, c: 120, s: 70, t: 30 },
];

// 🔤 폰트 패밀리 목록 (CSS 매칭 단일 진실 공급원 - 쇼츠/롱폼/시니어 최적화 32종 라인업)
export interface CanvasFontFamily {
  id: string;
  name: string;
  category: string;
}

export const FONT_FAMILIES: CanvasFontFamily[] = [
  // ⚡ 1. 쇼츠 & 어그로 & 임팩트 헤드라인
  { id: 'SBAggro', name: '샌드박스 어그로체 (쇼츠 1위)', category: '⚡ 쇼츠 & 어그로' },
  { id: 'Black Han Sans', name: '검은고딕 (임팩트 썸네일)', category: '⚡ 쇼츠 & 어그로' },
  { id: 'Bagel Fat One', name: '베이글 팻 원 (통통 볼드)', category: '⚡ 쇼츠 & 어그로' },
  { id: 'Jalnan', name: '여기어때 잘난체 (숏폼 대표)', category: '⚡ 쇼츠 & 어그로' },
  { id: 'GmarketSans', name: '지마켓 산스 (국민 볼드)', category: '⚡ 쇼츠 & 어그로' },
  { id: 'Do Hyeon', name: '배민 도현체 (강렬한 헤드라인)', category: '⚡ 쇼츠 & 어그로' },
  { id: 'Cafe24Ssurround', name: '카페24 써라운드 (원형 볼드)', category: '⚡ 쇼츠 & 어그로' },
  { id: 'PyeongChangPeace', name: '평창평화체 (스피디 액션)', category: '⚡ 쇼츠 & 어그로' },
  { id: 'TmoneyRoundWind', name: '티머니 둥근바람 (둥근 볼드)', category: '⚡ 쇼츠 & 어그로' },
  { id: 'KOTRA_BOLD', name: '코트라 볼드 (단단한 신뢰)', category: '⚡ 쇼츠 & 어그로' },

  // 👴 2. 시니어 롱폼 & 역사 / 지식 / 다큐 명조
  { id: 'KoPubWorld Batang', name: '코펍월드 바탕 Pro (시니어 1위)', category: '👴 시니어 롱폼 & 다큐' },
  { id: 'KoPubWorld Dotum', name: '코펍월드 돋움 Pro (눈 편한 자막)', category: '👴 시니어 롱폼 & 다큐' },
  { id: 'Chosunilbo_myungjo', name: '조선일보명조 (품격 다큐)', category: '👴 시니어 롱폼 & 다큐' },
  { id: 'ChosunKg', name: '조선굵은고딕 (특종 헤드라인)', category: '👴 시니어 롱폼 & 다큐' },
  { id: 'MaruBuri', name: '마루 부리 (감동 실화/인생)', category: '👴 시니어 롱폼 & 다큐' },
  { id: 'Noto Serif KR', name: '구글 본명조 (정통 역사/사극)', category: '👴 시니어 롱폼 & 다큐' },
  { id: 'Gowun Batang', name: '고운바탕 (온화한 감성 명조)', category: '👴 시니어 롱폼 & 다큐' },
  { id: 'Gowun Dodum', name: '고운돋움 (편안한 둥근 돋움)', category: '👴 시니어 롱폼 & 다큐' },
  { id: 'GyeonggiBatang', name: '경기천년바탕 (우아한 문화/역사)', category: '👴 시니어 롱폼 & 다큐' },
  { id: 'Song Myung', name: '송명체 (정통 고서/사극 붓결)', category: '👴 시니어 롱폼 & 다큐' },
  { id: 'Nanum Myeongjo', name: '나눔명조 (단아한 클래식)', category: '👴 시니어 롱폼 & 다큐' },

  // 💬 3. 썰형 & 예능 & 감성 손글씨
  { id: 'CookieRun', name: '쿠키런 폰트 (예능/게임 볼드)', category: '💬 썰형 & 예능' },
  { id: 'Jua', name: '배민 주아체 (친근한 썰형)', category: '💬 썰형 & 예능' },
  { id: 'ONE-Mobile-POP', name: '원스토어 모바일POP (톡톡 예능)', category: '💬 썰형 & 예능' },
  { id: 'Dongle', name: '동글체 (귀여운 브이로그)', category: '💬 썰형 & 예능' },
  { id: 'Sunflower', name: '선플라워 (따뜻한 감성)', category: '💬 썰형 & 예능' },
  { id: 'Nanum Brush Script', name: '나눔손글씨 붓 (힘 있는 명언)', category: '💬 썰형 & 예능' },
  { id: 'Nanum Pen Script', name: '나눔손글씨 펜 (감성 일기)', category: '💬 썰형 & 예능' },

  // 📱 4. 표준 본문 & 모던 고딕
  { id: 'Pretendard', name: 'Pretendard (디지털 표준)', category: '📱 표준 & 모던 고딕' },
  { id: 'Noto Sans KR', name: '구글 본고딕 (다큐 표준 자막)', category: '📱 표준 & 모던 고딕' },
  { id: 'SCoreDream', name: '에스코어 드림 (가독성 고딕)', category: '📱 표준 & 모던 고딕' },
  { id: 'Nanum Gothic', name: '나눔고딕 (정통 표준 고딕)', category: '📱 표준 & 모던 고딕' },
];

/**
 * 🔤 CSS 인라인 스타일용 폰트 패밀리 안전 해석기
 * 공백이나 alias(BlackHanSans, NotoSansKR 등)가 들어와도 실제 CSS @font-face / Google Fonts 이름으로 100% 매핑
 */
export const resolveFontFamily = (font?: string): string => {
  if (!font) return "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
  const f = font.trim();
  switch (f) {
    case 'Pretendard':
      return "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
    case 'GmarketSans':
    case 'Gmarket Sans':
    case 'GmarketSansBold':
      return "'GmarketSans', 'Gmarket Sans', sans-serif";
    case 'BlackHanSans':
    case 'Black Han Sans':
      return "'Black Han Sans', sans-serif";
    case 'NotoSansKR':
    case 'Noto Sans KR':
      return "'Noto Sans KR', sans-serif";
    case 'Jalnan':
      return "'Jalnan', sans-serif";
    case 'CookieRun':
      return "'CookieRun', sans-serif";
    case 'Do Hyeon':
    case 'DoHyeon':
      return "'Do Hyeon', sans-serif";
    case 'Jua':
      return "'Jua', sans-serif";
    case 'NanumGothic':
    case 'Nanum Gothic':
      return "'Nanum Gothic', sans-serif";
    case 'NanumMyeongjo':
    case 'Nanum Myeongjo':
      return "'Nanum Myeongjo', serif";
    case 'Gowun Dodum':
    case 'GowunDodum':
      return "'Gowun Dodum', sans-serif";
    case 'Gowun Batang':
    case 'GowunBatang':
      return "'Gowun Batang', serif";
    // ⚡ 1. 쇼츠 & 어그로 & 임팩트
    case 'SBAggro':
    case 'SBAggroB':
    case 'SBAggroM':
    case 'SBAggroL':
    case 'SandBox Aggro':
      return "'SBAggro', sans-serif";
    case 'Bagel Fat One':
    case 'BagelFatOne':
      return "'Bagel Fat One', cursive, sans-serif";
    case 'Cafe24Ssurround':
    case 'Cafe24 Ssurround':
      return "'Cafe24Ssurround', sans-serif";
    case 'PyeongChangPeace':
    case 'PyeongChang Peace':
      return "'PyeongChangPeace', sans-serif";
    case 'TmoneyRoundWind':
    case 'Tmoney RoundWind':
      return "'TmoneyRoundWind', sans-serif";
    case 'KOTRA_BOLD':
    case 'KOTRA BOLD':
    case 'KOTRA Bold':
      return "'KOTRA_BOLD', sans-serif";
    // 👴 2. 시니어 롱폼 & 다큐 명조
    case 'KoPubWorld Batang':
    case 'KoPubWorldBatang':
    case 'KoPub World Batang':
      return "'KoPubWorld Batang', 'KoPubWorldBatang', serif";
    case 'KoPubWorld Dotum':
    case 'KoPubWorldDotum':
    case 'KoPub World Dotum':
      return "'KoPubWorld Dotum', 'KoPubWorldDotum', sans-serif";
    case 'Chosunilbo_myungjo':
    case 'Chosun Ilbo Myungjo':
    case 'ChosunNm':
      return "'Chosunilbo_myungjo', 'ChosunNm', serif";
    case 'ChosunKg':
    case 'Chosun Kg':
      return "'ChosunKg', sans-serif";
    case 'MaruBuri':
    case 'Maru Buri':
      return "'MaruBuri', serif";
    case 'Noto Serif KR':
    case 'NotoSerifKR':
      return "'Noto Serif KR', serif";
    case 'GyeonggiBatang':
    case 'Gyeonggi Millennium Batang':
      return "'GyeonggiBatang', serif";
    case 'Song Myung':
    case 'SongMyung':
      return "'Song Myung', serif";
    // 💬 3. 썰형 & 예능 & 감성 손글씨
    case 'ONE-Mobile-POP':
    case 'ONE Mobile POP':
    case 'OneMobilePOP':
      return "'ONE-Mobile-POP', sans-serif";
    case 'Dongle':
      return "'Dongle', sans-serif";
    case 'Sunflower':
      return "'Sunflower', sans-serif";
    case 'Nanum Brush Script':
    case 'NanumBrushScript':
      return "'Nanum Brush Script', cursive";
    case 'Nanum Pen Script':
    case 'NanumPenScript':
      return "'Nanum Pen Script', cursive";
    case 'SCoreDream':
    case 'S-Core Dream':
    case 'S-CoreDream':
      return "'SCoreDream', sans-serif";
    default:
      return `'${f}', 'Pretendard', sans-serif`;
  }
};

// 💬 쇼츠 자막 디자인 프리셋
export const SHORTS_SUBTITLE_DESIGN_PRESETS = [
  { id: 'neon-yellow', name: '네온 옐로우', badge: 'MZ 바이럴', desc: '선명한 옐로우 + 블랙 볼드 외곽선', fontFamily: 'Black Han Sans', textColor: '#FFE600', outlineSize: 5, outlineColor: '#000000', useBox: false, boxColor: '#000000', shadowSize: 3, shadowColor: '#000000', fontSize: 19 },
  { id: 'white-glow', name: '화이트 글로우', badge: '추천 1위', desc: '순백 글자 + 시안 네온 그림자', fontFamily: 'Pretendard', textColor: '#FFFFFF', outlineSize: 4, outlineColor: '#0F172A', useBox: false, boxColor: '#000000', shadowSize: 4, shadowColor: '#00F0FF', fontSize: 18 },
  { id: 'black-gold', name: '블랙 앤 골드', badge: '지식/다큐', desc: '골드 텍스트 + 딥블랙 외곽선', fontFamily: 'Do Hyeon', textColor: '#FFD700', outlineSize: 5, outlineColor: '#000000', useBox: false, boxColor: '#000000', shadowSize: 3, shadowColor: '#000000', fontSize: 19 },
  { id: 'cyan-pop', name: '네온 시안 팝', badge: '트렌드 팝', desc: '눈부신 네온 시안 + 블랙 외곽선', fontFamily: 'Pretendard', textColor: '#00F0FF', outlineSize: 5, outlineColor: '#000000', useBox: false, boxColor: '#000000', shadowSize: 3, shadowColor: '#002B36', fontSize: 18 },
  { id: 'hot-pink', name: '핫 핑크 바이브', badge: '감성/엔터', desc: '비비드 핫핑크 + 핑크 글로우', fontFamily: 'Jua', textColor: '#FF2E93', outlineSize: 4, outlineColor: '#000000', useBox: false, boxColor: '#000000', shadowSize: 4, shadowColor: '#FF2E93', fontSize: 19 },
  { id: 'box-pill', name: '박스 하이라이트', badge: '가독성 최고', desc: '블랙 필 박스 + 화이트 볼드', fontFamily: 'Nanum Gothic', textColor: '#FFFFFF', outlineSize: 0, outlineColor: '#000000', useBox: true, boxColor: 'rgba(0,0,0,0.85)', shadowSize: 2, shadowColor: '#000000', fontSize: 17 },
  { id: 'minimal-lime', name: '미니멀 라임', badge: '상큼한 일상', desc: '라임 텍스트 + 미니멀 블랙 테두리', fontFamily: 'Pretendard', textColor: '#A3E635', outlineSize: 4, outlineColor: '#000000', useBox: false, boxColor: '#000000', shadowSize: 2, shadowColor: '#000000', fontSize: 18 },
  { id: 'bold-classic', name: '볼드 클래식', badge: '정통 볼드', desc: '화이트 + 6px 두꺼운 블랙 스트로크', fontFamily: 'Gowun Dodum', textColor: '#FFFFFF', outlineSize: 6, outlineColor: '#000000', useBox: false, boxColor: '#000000', shadowSize: 3, shadowColor: '#000000', fontSize: 20 },
];

// 🎭 3순위 바이럴 밈 에셋 프리셋 (페페 6종 & 이라스토야 6종)
export const PEPE_MEMES = [
  { id: 'pepe_shock', name: '충격 페페', src: '/assets/memes/pepe/pepe_shock.svg', emoji: '😱' },
  { id: 'pepe_cry', name: '오열 페페', src: '/assets/memes/pepe/pepe_cry.svg', emoji: '😭' },
  { id: 'pepe_popcorn', name: '팝콘 페페', src: '/assets/memes/pepe/pepe_popcorn.svg', emoji: '🍿' },
  { id: 'pepe_smug', name: '부자 페페', src: '/assets/memes/pepe/pepe_smug.svg', emoji: '😎' },
  { id: 'pepe_rage', name: '분노 페페', src: '/assets/memes/pepe/pepe_rage.svg', emoji: '😡' },
  { id: 'pepe_thinking', name: '고뇌 페페', src: '/assets/memes/pepe/pepe_thinking.svg', emoji: '🤔' },
];

export const IRASUTOYA_MEMES = [
  { id: 'irasutoya_shocked', name: '경악 직장인', src: '/assets/memes/irasutoya/irasutoya_shocked.svg', emoji: '😱' },
  { id: 'irasutoya_money', name: '돈다발 쥔 사람', src: '/assets/memes/irasutoya/irasutoya_money.svg', emoji: '💸' },
  { id: 'irasutoya_question', name: '의문 물음표', src: '/assets/memes/irasutoya/irasutoya_question.svg', emoji: '❓' },
  { id: 'irasutoya_apology', name: '사죄 도게자', src: '/assets/memes/irasutoya/irasutoya_apology.svg', emoji: '🙇' },
  { id: 'irasutoya_fight', name: '격렬 논쟁', src: '/assets/memes/irasutoya/irasutoya_fight.svg', emoji: '⚔' },
  { id: 'irasutoya_run', name: '전력 질주', src: '/assets/memes/irasutoya/irasutoya_run.svg', emoji: '🏃' },
];

// 🎛️ 4대 마스터 인스펙터 그룹 및 서브탭 체계 (단일 진실 공급원)
export const MASTER_INSPECTOR_GROUPS = [
  {
    id: 'layout' as const,
    label: '화면 구성',
    icon: '🏛️',
    subTabs: [
      { id: 'template', label: '화면 구성' },
    ],
  },
  {
    id: 'text' as const,
    label: '글자 · 자막',
    icon: '✍️',
    subTabs: [
      { id: 'title', label: '대제목' },
      { id: 'jabHook', label: '쨉쨉이' },
      { id: 'style', label: '자막' },
      { id: 'commentCard', label: '댓글' },
      { id: 'sourceCredit', label: '출처' },
      { id: 'topBottomBar', label: '상하단바' },
      { id: 'videoCrop', label: '비디오' },
    ],
  },
  {
    id: 'media' as const,
    label: '영상 · 연출',
    icon: '🎬',
    subTabs: [
      { id: 'filterFx', label: '필터' },
    ],
  },
  {
    id: 'viral' as const,
    label: '바이럴 · 소리',
    icon: '⚡',
    subTabs: [
      { id: 'tts', label: '음성 (TTS)' },
      { id: 'channel', label: '채널 정보' },
    ],
  },
] as const;

export type MasterInspectorGroupId = typeof MASTER_INSPECTOR_GROUPS[number]['id'];
export type InspectorSubTabId =
  | typeof MASTER_INSPECTOR_GROUPS[number]['subTabs'][number]['id']
  | 'titleSource'
  | 'subtitle'
  | 'profile'
  | 'ssulHeader'
  | 'metadata'
  | 'divider'
  | 'videoCrop';

/**
 * 🎛️ 4대 폼팩터 독립 주권 인스펙터 그룹 및 서브탭 선택기 (Zero Cross-Format Noise)
 * - 캔버스에서 보이는 모든 객체(비디오 포함)의 설정은 '글자 · 자막' 탭 아래에 단일화 배치
 */
export function getInspectorGroupsForMode(mode: string = 'classic') {
  switch (mode) {
    case 'instagram':
      return [
        {
          id: 'layout' as const,
          label: '화면 구성',
          icon: '🏛️',
          subTabs: [
            { id: 'template' as const, label: '화면 구성' },
          ],
        },
        {
          id: 'text' as const,
          label: '글자 · 자막',
          icon: '✍️',
          subTabs: [
            { id: 'profile' as const, label: '프로필' },
            { id: 'title' as const, label: '대제목' },
            { id: 'jabHook' as const, label: '쨉쨉이' },
            { id: 'style' as const, label: '자막' },
            { id: 'commentCard' as const, label: '댓글' },
            { id: 'sourceCredit' as const, label: '출처' },
            { id: 'topBottomBar' as const, label: '상하단바' },
            { id: 'videoCrop' as const, label: '비디오' },
          ],
        },
        {
          id: 'media' as const,
          label: '영상 · 연출',
          icon: '🎬',
          subTabs: [
            { id: 'filterFx' as const, label: '필터' },
          ],
        },
        {
          id: 'viral' as const,
          label: '바이럴 · 소리',
          icon: '⚡',
          subTabs: [
            { id: 'tts' as const, label: '음성 (TTS)' },
            { id: 'channel' as const, label: '채널 정보' },
          ],
        },
      ];
    case 'gunlimbo':
      return [
        {
          id: 'layout' as const,
          label: '화면 구성',
          icon: '🏛️',
          subTabs: [
            { id: 'template' as const, label: '화면 구성' },
          ],
        },
        {
          id: 'text' as const,
          label: '글자 · 자막',
          icon: '✍️',
          subTabs: [
            { id: 'title' as const, label: '대제목' },
            { id: 'jabHook' as const, label: '훅 밴드' },
            { id: 'style' as const, label: '자막' },
            { id: 'commentCard' as const, label: '댓글' },
            { id: 'sourceCredit' as const, label: '출처' },
            { id: 'topBottomBar' as const, label: '상하단바' },
            { id: 'videoCrop' as const, label: '비디오' },
          ],
        },
        {
          id: 'media' as const,
          label: '영상 · 연출',
          icon: '🎬',
          subTabs: [
            { id: 'filterFx' as const, label: '필터' },
          ],
        },
        {
          id: 'viral' as const,
          label: '바이럴 · 소리',
          icon: '⚡',
          subTabs: [
            { id: 'tts' as const, label: '음성 (TTS)' },
            { id: 'channel' as const, label: '채널 정보' },
          ],
        },
      ];
    case 'ssul':
      return [
        {
          id: 'layout' as const,
          label: '화면 구성',
          icon: '🏛️',
          subTabs: [
            { id: 'template' as const, label: '화면 구성' },
          ],
        },
        {
          id: 'text' as const,
          label: '글자 · 자막',
          icon: '✍️',
          subTabs: [
            { id: 'ssulHeader' as const, label: '헤더' },
            { id: 'title' as const, label: '제목' },
            { id: 'metadata' as const, label: '메타' },
            { id: 'divider' as const, label: '구분선' },
            { id: 'style' as const, label: '자막' },
            { id: 'commentCard' as const, label: '댓글' },
            { id: 'sourceCredit' as const, label: '출처' },
            { id: 'videoCrop' as const, label: '비디오' },
          ],
        },
        {
          id: 'media' as const,
          label: '영상 · 연출',
          icon: '🎬',
          subTabs: [
            { id: 'filterFx' as const, label: '필터' },
          ],
        },
        {
          id: 'viral' as const,
          label: '바이럴 · 소리',
          icon: '⚡',
          subTabs: [
            { id: 'tts' as const, label: '음성 (TTS)' },
            { id: 'channel' as const, label: '채널 정보' },
          ],
        },
      ];
    case 'classic':
    default:
      return MASTER_INSPECTOR_GROUPS;
  }
}

// 🎭 커뮤니티 썰형 전용 위트/풍자 메타데이터 프리셋 (12대 인기 밈)
export interface SatiricalMetadataItem {
  id: string;
  author: string;
  timeText: string;
  viewsText: string;
  badge?: string;
}

export const SATIRICAL_METADATA_PRESETS: SatiricalMetadataItem[] = [
  { id: 'lupin', author: '월급루팡 김대리', timeText: '방금 전', viewsText: '조회 14,290 · 추천 999+', badge: '직장인' },
  { id: 'soul_dev', author: '영혼 탈곡된 개발자', timeText: '새벽 2시 14분', viewsText: '조회 42,100 · 댓글 842', badge: 'IT' },
  { id: 'resignation', author: '내일 퇴사할 사람', timeText: '퇴근 5분 전', viewsText: '조회 88,400 · 추천 1,520', badge: '화제' },
  { id: 'ant_stock', author: '주식 물린 개미', timeText: '장 마감 직후', viewsText: '조회 31,200 · 눈물 404', badge: '재테크' },
  { id: 'algo_slave', author: '알고리즘의 노예', timeText: '1분 전', viewsText: '조회 10.4만 · 스크랩 2,300', badge: '급상승' },
  { id: 'pantry_raider', author: '탕비실 털이범', timeText: '점심시간 직전', viewsText: '조회 19,800 · 추천 550', badge: '일상' },
  { id: 'night_shift', author: '프로야근러 박과장', timeText: '막차 끊기기 10분 전', viewsText: '조회 53,200 · 분노 777', badge: '직장인' },
  { id: 'lotto_999', author: '로또 1등 기원 999일차', timeText: '추첨 30분 전', viewsText: '조회 27,600 · 추천 888', badge: '희망' },
  { id: 'party_escape', author: '회식 탈출 넘버원', timeText: '1차 끝나고 도망', viewsText: '조회 64,000 · 좋아요 1.2만', badge: '생존' },
  { id: 'intern_coffee', author: '커피 수혈 중인 인턴', timeText: '출근 3분 전', viewsText: '조회 18,300 · 댓글 312', badge: '뉴비' },
  { id: 'fast_clockout', author: '칼퇴 요정 핑구', timeText: '17:59:59', viewsText: '조회 35,900 · 추천 1,111', badge: '스피드' },
  { id: 'anonymous_pro', author: '익명의 직장인', timeText: '방금 전', viewsText: '조회 14,290', badge: '블라인드' },
];

export function getRandomSatiricalMetadata(): SatiricalMetadataItem {
  const idx = Math.floor(Math.random() * SATIRICAL_METADATA_PRESETS.length);
  return SATIRICAL_METADATA_PRESETS[idx];
}


