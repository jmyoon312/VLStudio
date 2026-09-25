/**
 * ViraLoop Studio - 먹구리형 쇼츠 (Meokguri Shorts) 데이터 인터페이스
 * 픽셀링 원천 번들 (24259 lines 1620000~2030000) 1:1 규격 SSOT
 */

export type MeokguriStage = 'source' | 'settings' | 'result';
export type MeokguriTonePresetId = 'cider' | 'warm' | 'hype';
export type MeokguriZoomPopIntensity = 'mild' | 'punch' | 'bounce';
export type MeokguriStickerType = 'pepe' | 'emoji' | 'text-badge';

export interface SourcePairDraft {
  id: string;
  cleanOriginalPath: string;
  cleanOriginalPathName: string;
  cleanOriginalUrl: string;
  editedReferencePath: string;
  editedReferencePathName: string;
  editedReferenceUrl: string;
  durationMs?: number;
  fileSize?: number;
  resolution?: string;
  fps?: number;
  detectedGainDb?: number;
  isAnalyzed?: boolean;
}

export interface LibraryVideoItem {
  id: string;
  title: string;
  filePath: string;
  fileName: string;
  fileSizeFormatted?: string;
  durationFormatted?: string;
  resolution?: string;
  sourceType: 'download' | 'queue' | 'local';
}

export interface MeokguriScene {
  order: number;
  narration: string;
  hookJabText: string;
  durationSec: number;
  startMs?: number;
  endMs?: number;
}

export interface MeokguriScript {
  hookTitle: string;
  hookOpening: string;
  hookJabText: string;
  scenes: MeokguriScene[];
  hookDrafts?: string[];
  selectedHookIndex?: number;
}

export interface MeokguriJob {
  id: string;
  batchId?: string;
  title: string;
  status: 'idle' | 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  createdAt: string;
  resultVideoPath?: string;
  cleanVideoPath?: string;
  refVideoPath?: string;
  tonePreset: MeokguriTonePresetId;
  gainBoostDb: number;
  zoomPopIntensity: MeokguriZoomPopIntensity;
  audioLimiter: boolean;
  activeSfx: string[];
  script?: MeokguriScript;
  qualityScore?: number;
}

export interface MeokguriTonePreset {
  id: MeokguriTonePresetId;
  label: string;
  bestFor: string;
  exampleHook: string;
  summary: string;
  settings: {
    captionLength: 'short' | 'medium' | 'long';
    hookVoiceTone: 'curious' | 'calm' | 'surprised';
    targetDurationReference: 'shorter' | 'standard' | 'longer';
    toneStyle: MeokguriTonePresetId;
    typecastSpeed: number;
  };
}

export const MEOKGURI_TONE_PRESETS: MeokguriTonePreset[] = [
  {
    id: 'cider',
    label: '궁금증 질문',
    bestFor: '모든 소재 · 사건 · 반전 · 실험',
    exampleHook: '이 냉장고, 버리려던 거였다는데. 안을 열어 본 순간 생각이 바뀌었죠.',
    summary: '해설자가 사건을 전해 주듯 "…했다는데."로 매달아 궁금하게 만듭니다. 결말은 말하지 않습니다.',
    settings: {
      captionLength: 'medium',
      hookVoiceTone: 'curious',
      targetDurationReference: 'shorter',
      toneStyle: 'cider',
      typecastSpeed: 1.06
    }
  },
  {
    id: 'warm',
    label: '다정한 이야기',
    bestFor: '일상 · 육아 · 감동 · 꿀팁',
    exampleHook: '아이가 요거트를 안 먹어서 한 가지를 살짝 바꿨어요.',
    summary: '본인이 친구에게 말하듯 차분하고 부드럽게 이야기합니다.',
    settings: {
      captionLength: 'medium',
      hookVoiceTone: 'calm',
      targetDurationReference: 'shorter',
      toneStyle: 'warm',
      typecastSpeed: 0.96
    }
  },
  {
    id: 'hype',
    label: '호들갑 리액션',
    bestFor: '먹방 · 실험 · 놀라운 장면',
    exampleHook: '이걸 진짜 통째로 굽는다고요?',
    summary: '보는 사람에게 말 걸듯 놀라며, 짧고 빠르게 갑니다.',
    settings: {
      captionLength: 'short',
      hookVoiceTone: 'surprised',
      targetDurationReference: 'shorter',
      toneStyle: 'hype',
      typecastSpeed: 1.03
    }
  }
];

export interface ViraLoopVoiceOption {
  id: string;
  name: string;
  engine: 'supertone' | 'typecast' | 'kokoro' | 'elevenlabs';
  category: 'recommended' | 'male' | 'female' | 'meme' | 'dialect' | 'global';
  gender: 'male' | 'female';
  tag: string;
  desc: string;
  recommendedSpeed: number;
  recommendedPitch?: number;
}

export const VIRALOOP_MEOKGURI_VOICES: ViraLoopVoiceOption[] = [
  // 1. 추천 / 숏폼 특화
  {
    id: 'F1',
    name: '서연 (아나운서 표준)',
    engine: 'supertone',
    category: 'recommended',
    gender: 'female',
    tag: '🎙️ 표준 1위',
    desc: '또렷하고 신뢰감 높은 대한민국 표준 여성 나레이션',
    recommendedSpeed: 1.05
  },
  {
    id: 'M1',
    name: '민준 (쇼츠 속보·풍자)',
    engine: 'supertone',
    category: 'recommended',
    gender: 'male',
    tag: '⚡ 뇌전구 1.25x',
    desc: '빠른 템포와 위트 있는 어조의 쇼츠 최적화 남성 음성',
    recommendedSpeed: 1.25
  },
  {
    id: 'M2',
    name: '도현 (진중한 내러티브)',
    engine: 'supertone',
    category: 'recommended',
    gender: 'male',
    tag: '🎭 썰형 권장',
    desc: '몰입감 높고 무게감 있는 서사 전달용 중저음 보이스',
    recommendedSpeed: 1.0
  },

  // 2. 남성 보이스
  {
    id: 'M3',
    name: '준서 (코믹·캐주얼)',
    engine: 'supertone',
    category: 'male',
    gender: 'male',
    tag: '💬 유머 먹방',
    desc: '유쾌하고 친근한 친구 말투, 먹방 및 일상 리액션',
    recommendedSpeed: 1.1
  },
  {
    id: 'M4',
    name: '영호 (중후함 뉴스)',
    engine: 'supertone',
    category: 'male',
    gender: 'male',
    tag: '📰 속보형',
    desc: '깊은 울림과 호소력 있는 중년 남성 내레이션',
    recommendedSpeed: 1.15
  },

  // 3. 여성 보이스
  {
    id: 'F2',
    name: '지우 (밝은 브이로그)',
    engine: 'supertone',
    category: 'female',
    gender: 'female',
    tag: '✨ 감성 일상',
    desc: '밝고 산뜻한 분위기의 트렌디 20대 여성 보이스',
    recommendedSpeed: 1.05
  },
  {
    id: 'F3',
    name: '수진 (차분·정보)',
    engine: 'supertone',
    category: 'female',
    gender: 'female',
    tag: '🌸 꿀팁 지식',
    desc: '차분하고 정돈된 정보 전달용 여성 음성',
    recommendedSpeed: 1.0
  },
  {
    id: 'F4',
    name: '은영 (다정한 일상)',
    engine: 'supertone',
    category: 'female',
    gender: 'female',
    tag: '🌿 편안한 톤',
    desc: '부드럽고 다정한 이야기 톤앤매너 권장',
    recommendedSpeed: 0.98
  },

  // 4. 유머 / 밈 / 사투리
  {
    id: 'system_piljae_shorts',
    name: '필재 (쇼츠 사이다)',
    engine: 'typecast',
    category: 'meme',
    gender: 'male',
    tag: '⭐ 타입캐스트',
    desc: '극적인 긴장감과 사이다 카타르시스 전달 1위',
    recommendedSpeed: 1.4
  },
  {
    id: 'system_jihoon_meme',
    name: '지훈 (초고속 밈)',
    engine: 'typecast',
    category: 'meme',
    gender: 'male',
    tag: '🤣 MZ 밈 속사포',
    desc: '초당 6음절 이상 쏟아내는 극단적 몰입감',
    recommendedSpeed: 1.35
  },

  // 5. 글로벌 다국어
  {
    id: 'am_adam',
    name: 'Adam (글로벌 영어)',
    engine: 'kokoro',
    category: 'global',
    gender: 'male',
    tag: '🇺🇸 High CPM',
    desc: '미국/글로벌 타겟 쇼츠를 위한 세련된 영어 나레이션',
    recommendedSpeed: 1.25
  },
  {
    id: 'jf_alpha',
    name: 'Yuki (일본어 츳코미)',
    engine: 'kokoro',
    category: 'global',
    gender: 'female',
    tag: '🇯🇵 일본 먹방',
    desc: '일본 현지 감성의 리액션 및 먹방 숏폼 전용 음성',
    recommendedSpeed: 1.2
  }
];

export interface MeokguriSettings {
  // style
  captionStyle: 'bold-yellow' | 'classic-white' | 'orange-contrast';
  captionFont: 'jua' | 'pretendard' | 'gmarket';
  captionPosition: 'bottom' | 'middle';
  
  // edit
  targetDurationSec: number;
  gainBoostDb: number;
  zoomPopIntensity: MeokguriZoomPopIntensity;
  audioLimiter: boolean;
  parallelism: number; // 1~8
  qualityThresholdScore: number; // 50~100
  
  // voice
  voiceEnabled: boolean;
  voiceName: string;
  voiceSpeed: number; // 0.8 ~ 1.5
  voicePitch: number; // -5 ~ +5
  voiceHookOnly: boolean; // 도입부만 TTS, 이후는 원본 오디오 유지
  
  // output
  autoRender: boolean; // 한 번에 완성 vs 분석까지만
  outputFormat: 'mp4-capcut' | 'mp4-only';
  exportDirectory: string;
}
