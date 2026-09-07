export interface ClipData {
  clip_id: number;
  source_start: number; // 초 단위 (예: 12.5)
  source_end: number;   // 초 단위 (예: 18.0)
  duration: number;     // 초 단위 (예: 5.5)
  narration: string;    // 리뷰어/해설자 나레이션 자막 및 TTS 대본
  speaker_a_dialogue?: string; // 등장인물 A 대사 (남주 등)
  speaker_b_dialogue?: string; // 등장인물 B 대사 (여주/악역 등)
  jab_sticker?: string; // 쨉쨉이 드립 스티커 말풍선 (예: "(동공지진)", "(Bruh...)")
  sfx_recommend?: string; // 추천 효과음 (예: "ding", "boom", "slap", "whoosh")
  tts_audio_url?: string; // 생성된 TTS 오디오 미리듣기 URL
}

export interface EpisodeData {
  id: number;
  title: string;
  top_hook: string; // 상단 굵은 훅 타이틀 배너 (예: "3초 만에 10억 날림")
  total_duration_sec: number;
  clips: ClipData[];
}

export interface PresetItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  tone: string;
  pacing: string;
  hookStyle: string;
  dripStyle: string;
  promptInstruction: string;
}

export interface BatchQueueItem {
  id: string;
  video_id?: number;
  video_title: string;
  video_path: string;
  video_url?: string;
  size?: number;
  status: 'pending' | 'analyzing' | 'voicing' | 'packaging' | 'done' | 'error';
  progress: number; // 0 ~ 100
  preset_id: string;
  target_lang: string;
  target_duration_type: 'shorts' | 'longform';
  episode_count: number;
  target_minutes: number;
  enable_speaker_diarization: boolean;
  episodes?: EpisodeData[];
  error_message?: string;
  created_at: string;
}

export interface PronunciationDiff {
  id: number;
  original_word: string;
  replaced_word: string;
  reason?: string;
}

export const DEFAULT_PRESETS: PresetItem[] = [
  {
    id: 'gutavari',
    name: '구타바리 명사형+드립',
    icon: 'Flame',
    description: '쇼츠 알고리즘 폭발용 극단적 텐션, 명사형 종결 및 2~5자 쨉쨉이 드립',
    tone: '명사형 종결, 짧고 강력한 단문, 극단적 몰입감',
    pacing: '1.5~2.5초 빠른 컷 전환',
    hookStyle: '반전/충격 의문형 또는 극단적 수치 ("단 3초 만에 털린 사연")',
    dripStyle: '(동공지진), (극대노), (얼음), (멘붕)',
    promptInstruction: '구타바리 스타일: 문장은 반드시 명사형이나 짧은 감탄문으로 끝내고, 3초마다 쨉쨉이 드립 스티커를 삽입하라.'
  },
  {
    id: 'k_cider',
    name: '5070 사이다 더빙 (K-사이다)',
    icon: 'Zap',
    description: '중국 AI 숏드라마 및 일일드라마용 권선징악 폭풍 사이다 더빙',
    tone: '속 시원한 사이다 구어체, 찰진 팩트 폭격 어조',
    pacing: '2~3.5초 대화 핑퐁 컷팅',
    hookStyle: '시어머니/재벌 참교육 명료한 훅 ("재벌가 쫓겨난 며느리의 반격")',
    dripStyle: '(어이탈출), (양심가출), (참교육), (속시원)',
    promptInstruction: 'K-사이다 스타일: 억울한 상황을 단 10초 만에 역전시키고, 인물 대사와 해설을 통해 극강의 카타르시스를 부여하라.'
  },
  {
    id: 'b_trilogy',
    name: 'B급 3부작 패키지',
    icon: 'Sparkles',
    description: '3부작 시리즈 쇼츠 연계 구조 (1부 후킹 ➔ 2부 위기 ➔ 3부 결말)',
    tone: '유머러스하고 리드미컬한 B급 감성 코미디',
    pacing: '2~3초 리듬감 있는 컷팅',
    hookStyle: '궁금증 유발 클리프행어 ("다음 편 안 보면 후회함")',
    dripStyle: '(킹받네), (실화냐), (대환장), (팝콘각)',
    promptInstruction: 'B급 3부작: 1편은 호기심 폭발, 2편은 꼬여버린 전개, 3편은 충격적 결말로 구성하여 구독을 유도하라.'
  },
  {
    id: 'longform_docu',
    name: '5060 롱폼 탐사 다큐',
    icon: 'Film',
    description: '10분~20분 호흡의 깊이 있는 영화/역사/사건 심층 리뷰',
    tone: '신뢰감 있고 차분한 정통 시사·다큐멘터리 어조',
    pacing: '4~6초 안정적 컷팅 및 서사 전개',
    hookStyle: '미스터리/비하인드 스토리 훅 ("우리가 몰랐던 그날의 진실")',
    dripStyle: '(핵심증거), (충격반전), (미스터리)',
    promptInstruction: '정통 다큐멘터리: 도입부의 강력한 미스터리 제시 후, 시간 순서대로 사건의 전말을 냉철하게 파헤쳐라.'
  }
];
