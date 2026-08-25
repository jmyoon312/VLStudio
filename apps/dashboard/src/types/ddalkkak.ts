export interface GlobalLanguage {
  code: string;
  flag: string;
  name: string;
  tier: 'tier1' | 'global';
  cpmDescription?: string;
}

export const GLOBAL_LANGUAGES: GlobalLanguage[] = [
  // 5대 High CPM 핵심 언어
  { code: 'ko', flag: '🇰🇷', name: '한국어', tier: 'tier1', cpmDescription: '기본 원본' },
  { code: 'en', flag: '🇺🇸', name: '미국 영어 (US Gen-Z)', tier: 'tier1', cpmDescription: '최고 CPM 티어1' },
  { code: 'ja', flag: '🇯🇵', name: '일본어 (츳코미/리액션)', tier: 'tier1', cpmDescription: '초고단가 CPM' },
  { code: 'zh-tw', flag: '🇹🇼', name: '대만 번체 (바이럴 유행어)', tier: 'tier1', cpmDescription: '중화권 고수익 시장' },
  { code: 'es', flag: '🇪🇸', name: '스페인어 (라틴/유럽)', tier: 'tier1', cpmDescription: '초대형 트래픽' },
  
  // 15대 글로벌 확장 언어
  { code: 'zh-cn', flag: '🇨🇳', name: '중국어 간체', tier: 'global' },
  { code: 'vi', flag: '🇻🇳', name: '베트남어', tier: 'global' },
  { code: 'th', flag: '🇹🇭', name: '태국어', tier: 'global' },
  { code: 'id', flag: '🇮🇩', name: '인도네시아어', tier: 'global' },
  { code: 'tl', flag: '🇵🇭', name: '필리핀어 (타갈로그)', tier: 'global' },
  { code: 'de', flag: '🇩🇪', name: '독일어', tier: 'global' },
  { code: 'fr', flag: '🇫🇷', name: '프랑스어', tier: 'global' },
  { code: 'pt-br', flag: '🇧🇷', name: '포르투갈어 (브라질)', tier: 'global' },
  { code: 'it', flag: '🇮🇹', name: '이탈리아어', tier: 'global' },
  { code: 'ru', flag: '🇷🇺', name: '러시아어', tier: 'global' },
  { code: 'ar', flag: '🇸🇦', name: '아랍어', tier: 'global' },
  { code: 'hi', flag: '🇮🇳', name: '힌디어', tier: 'global' },
  { code: 'tr', flag: '🇹🇷', name: '튀르키예어', tier: 'global' },
  { code: 'nl', flag: '🇳🇱', name: '네덜란드어', tier: 'global' },
  { code: 'pl', flag: '🇵🇱', name: '폴란드어', tier: 'global' },
];

export interface TTSPreset {
  id: string;
  name: string;
  description: string;
  config: {
    engine: string;
    voice_id: string;
    speed: number;
    pitch: number;
    use_silence_removal: boolean;
    silence_threshold: number;
    min_silence_len: number;
    keep_silence_len: number;
    emotion?: string;
  };
}

export const DDALKKAK_TTS_PRESETS: TTSPreset[] = [
  {
    id: 'preset_piljae',
    name: '⭐ [기본] 필재 - 쇼츠 사이다/실화',
    description: '쇼츠에 가장 최적화된 빠른 호흡의 사이다 내레이션 (Typecast 1.4x)',
    config: {
      engine: 'typecast',
      voice_id: 'tc_68257f68bc6e3c161ab5078d',
      speed: 1.4,
      pitch: 0,
      use_silence_removal: true,
      silence_threshold: -40,
      min_silence_len: 300,
      keep_silence_len: 50,
    }
  },
  {
    id: 'preset_jiyoon',
    name: '🎙️ 지윤 - 감성 내레이션',
    description: '드라마 및 감성적인 스토리텔링에 어울리는 차분한 톤',
    config: {
      engine: 'typecast',
      voice_id: 'tc_68257f68bc6e3c161ab5078e',
      speed: 1.2,
      pitch: 0,
      use_silence_removal: true,
      silence_threshold: -40,
      min_silence_len: 300,
      keep_silence_len: 50,
    }
  },
  {
    id: 'preset_supertone',
    name: '⚡ Supertone 사이다',
    description: '자연스러운 고음질 사이다 로컬 TTS',
    config: {
      engine: 'supertone-local',
      voice_id: '',
      speed: 1.35,
      pitch: 0,
      use_silence_removal: true,
      silence_threshold: -40,
      min_silence_len: 300,
      keep_silence_len: 50,
    }
  },
  {
    id: 'preset_elevenlabs_us',
    name: '🇺🇸 ElevenLabs US Shorts',
    description: '미국 Gen-Z 타겟 최고급 영미권 자연 음성',
    config: {
      engine: 'elevenlabs',
      voice_id: 'Adam',
      speed: 1.25,
      pitch: 0,
      use_silence_removal: true,
      silence_threshold: -40,
      min_silence_len: 300,
      keep_silence_len: 50,
    }
  },
  {
    id: 'preset_openai_alloy',
    name: '🤖 OpenAI Alloy/Echo',
    description: '명확하고 정확한 지식/정보 전달용 음성',
    config: {
      engine: 'openai',
      voice_id: 'alloy',
      speed: 1.2,
      pitch: 0,
      use_silence_removal: true,
      silence_threshold: -40,
      min_silence_len: 300,
      keep_silence_len: 50,
    }
  }
];

export interface SubtitleStyleOption {
  id: string;
  title: string;
  description: string;
  badge: string;
}

export const SUBTITLE_STYLES: SubtitleStyleOption[] = [
  { id: 'shorts', title: '🎬 쇼츠 (MZ 위트 + 쨉쨉이)', description: '후크 + 2~3초 쨉쨉이 + 효과음 믹스 자동 생성', badge: '추천' },
  { id: 'humor', title: '🤣 유머 (드립 + 밈 집중)', description: '드립형 쨉쨉이 + 밈 효과음 자동 배치', badge: '바이럴' },
  { id: 'mystery', title: '😱 미스터리 & 실화 다큐', description: '긴장감 넘치는 서스펜스 다큐멘터리 자막', badge: '몰입도 최고' },
  { id: 'knowledge', title: '💡 지식 & 정보 사이다', description: '빠른 템포 핵심 요약 + 포인트 강조 자막', badge: '정보성' },
  { id: 'drama', title: '🥺 감동 & 드라마 여운', description: '감성적 내레이션 + 잔잔한 여운 전달', badge: '감성' },
  { id: 'custom', title: '✍️ 커스텀 프롬프트 직접 입력', description: '나만의 특별한 톤앤매너 프롬프트 작성', badge: '자유 설정' },
];

export interface PreparationQueueItem {
  id: string;
  file: File;
  targetLang: string;
  style: string;
  customPrompt?: string;
  status: 'ready' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  jobId?: number;
}
