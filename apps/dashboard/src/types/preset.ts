import { TTSConfig } from './tts';
import { SubtitleConfig, DEFAULT_SUBTITLE_CONFIG } from './subtitle';

export type TargetArchetype = 'classic' | 'instagram' | 'gunlimbo' | 'ssul';

export interface MasterPreset {
  id: string;
  name: string;
  channelId?: string;
  description: string;
  icon?: string;
  category: 'issue' | 'mystery' | 'ssul' | 'action' | 'knowledge' | 'custom';
  // 1. 문체 톤앤매너 & 쨉쨉이 훅
  tone: string;
  extraCaption: string;
  // 2. 자막 타이포그래피
  subtitleConfig: SubtitleConfig;
  speakerSeparation: boolean;
  // 3. TTS 음성 설정
  ttsConfig: TTSConfig;
  // 4. 오디오 거버넌스 (BGM & SFX)
  bgmEnabled: boolean;
  bgmAutoSmart: boolean; // AI 스마트 자동 매칭
  bgmTrack: string | null;
  bgmVolume: number;
  autoDucking: boolean;
  sfxEnabled: boolean; // AI 자동 효과음 삽입 토글
  sfxUserFirst: boolean; // 내 보유 효과음 최우선 매칭
  sfxPreset: string;
  // 5. 폼팩터 구조 & 템플릿 디자인
  archetype: TargetArchetype;
  templateId: string;
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_MASTER_PRESETS: MasterPreset[] = [
  {
    id: 'preset-classic-standard',
    name: '골든 클래식 스탠다드',
    description: '정통 샌드위치 레터박스 + 쨉쨉이 훅 + 표준 내레이션',
    icon: '📺',
    category: 'issue',
    tone: 'fact-review',
    extraCaption: 'reaction',
    subtitleConfig: {
      ...DEFAULT_SUBTITLE_CONFIG,
      font: 'Pretendard',
      fontSize: 22,
      primaryColor: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 4,
    },
    speakerSeparation: false,
    ttsConfig: {
      engine: 'supertone-local',
      voice_id: 'F1',
      language: 'ko',
      speed: 1.05,
      pitch: 0,
      emotion: 'normal',
      silence_removal: true,
    },
    bgmEnabled: true,
    bgmAutoSmart: true,
    bgmTrack: null,
    bgmVolume: 0.22,
    autoDucking: true,
    sfxEnabled: true,
    sfxUserFirst: true,
    sfxPreset: 'sfx_slap_crisp',
    archetype: 'classic',
    templateId: 'classic-standard',
  },
  {
    id: 'preset-breaking-news',
    name: '이슈·속보 킬러',
    description: '스낵형 속사포 문체 + 군림보 0초 훅밴드 + 긴박 BGM',
    icon: '⚡',
    category: 'issue',
    tone: 'snack',
    extraCaption: 'question',
    subtitleConfig: {
      ...DEFAULT_SUBTITLE_CONFIG,
      font: 'NanumGothic',
      fontSize: 22,
      primaryColor: '#FFFF00',
      strokeColor: '#000000',
      strokeWidth: 4,
    },
    speakerSeparation: true,
    ttsConfig: {
      engine: 'supertone-local',
      voice_id: 'F1',
      language: 'ko',
      speed: 1.08,
      pitch: 0,
      emotion: 'normal',
      silence_removal: true,
    },
    bgmEnabled: true,
    bgmAutoSmart: true,
    bgmTrack: null,
    bgmVolume: 0.22,
    autoDucking: true,
    sfxEnabled: true,
    sfxUserFirst: true,
    sfxPreset: 'sfx_slap_crisp',
    archetype: 'gunlimbo',
    templateId: 'gunlimbo-hook-red',
  },
  {
    id: 'preset-ssul-cynical',
    name: '에타·디시 현실 썰형',
    description: '냉소 썰형 문체 + 상단 헤더바 + 밈 리액션 SFX',
    icon: '💬',
    category: 'ssul',
    tone: 'cynical-ssul',
    extraCaption: 'meme-quote',
    subtitleConfig: {
      ...DEFAULT_SUBTITLE_CONFIG,
      font: 'GmarketSans',
      fontSize: 20,
      primaryColor: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 3,
    },
    speakerSeparation: true,
    ttsConfig: {
      engine: 'supertone-local',
      voice_id: 'F2',
      language: 'ko',
      speed: 1.05,
      pitch: 0,
      emotion: 'normal',
      silence_removal: true,
    },
    bgmEnabled: true,
    bgmAutoSmart: true,
    bgmTrack: null,
    bgmVolume: 0.20,
    autoDucking: true,
    sfxEnabled: true,
    sfxUserFirst: true,
    sfxPreset: 'sfx_vine_boom',
    archetype: 'ssul',
    templateId: 'ssul-dark-modern',
  },
  {
    id: 'preset-mystery-deep',
    name: '야담·미스터리 서사',
    description: '명화관 서사 + 클래식 시네마 레터박스 + 서브우퍼 쿵',
    icon: '📜',
    category: 'mystery',
    tone: 'cinema-docu',
    extraCaption: 'reaction',
    subtitleConfig: {
      ...DEFAULT_SUBTITLE_CONFIG,
      font: 'ChosunIlbo',
      fontSize: 21,
      primaryColor: '#FFD700',
      strokeColor: '#1A1A1A',
      strokeWidth: 3,
    },
    speakerSeparation: false,
    ttsConfig: {
      engine: 'supertone-local',
      voice_id: 'M1',
      language: 'ko',
      speed: 0.98,
      pitch: -1,
      emotion: 'normal',
      silence_removal: true,
    },
    bgmEnabled: true,
    bgmAutoSmart: true,
    bgmTrack: null,
    bgmVolume: 0.26,
    autoDucking: true,
    sfxEnabled: true,
    sfxUserFirst: true,
    sfxPreset: 'sfx_sub_thud',
    archetype: 'classic',
    templateId: 'classic-dark-cinema',
  },
  {
    id: 'preset-action-highlight',
    name: '군림보 액션 하이라이트',
    description: '첫 3초 후킹 극대화 + 베이스 드롭 + 폭발 자막',
    icon: '🔥',
    category: 'action',
    tone: 'hyper-hook',
    extraCaption: 'star-accent',
    subtitleConfig: {
      ...DEFAULT_SUBTITLE_CONFIG,
      font: 'Pretendard',
      fontSize: 23,
      primaryColor: '#00FFFF',
      strokeColor: '#000000',
      strokeWidth: 4,
    },
    speakerSeparation: true,
    ttsConfig: {
      engine: 'supertone-local',
      voice_id: 'F5',
      language: 'ko',
      speed: 1.10,
      pitch: 1,
      emotion: 'normal',
      silence_removal: true,
    },
    bgmEnabled: true,
    bgmAutoSmart: true,
    bgmTrack: null,
    bgmVolume: 0.25,
    autoDucking: true,
    sfxEnabled: true,
    sfxUserFirst: true,
    sfxPreset: 'sfx_heavy_bass_drop',
    archetype: 'gunlimbo',
    templateId: 'gunlimbo-electric-cyan',
  },
  {
    id: 'preset-insta-clean',
    name: '인스타 감성 지식형',
    description: '팩트 해설 + 깔끔한 프로필/베댓 + 종이 넘김 SFX',
    icon: '📱',
    category: 'knowledge',
    tone: 'fact-review',
    extraCaption: 'summary',
    subtitleConfig: {
      ...DEFAULT_SUBTITLE_CONFIG,
      font: 'Pretendard',
      fontSize: 20,
      primaryColor: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 2,
    },
    speakerSeparation: true,
    ttsConfig: {
      engine: 'supertone-local',
      voice_id: 'F1',
      language: 'ko',
      speed: 1.02,
      pitch: 0,
      emotion: 'normal',
      silence_removal: true,
    },
    bgmEnabled: true,
    bgmAutoSmart: true,
    bgmTrack: null,
    bgmVolume: 0.18,
    autoDucking: true,
    sfxEnabled: true,
    sfxUserFirst: true,
    sfxPreset: 'sfx_paper_flip',
    archetype: 'instagram',
    templateId: 'insta-minimal-clean',
  },
];

const PRESETS_STORAGE_KEY = 'vlstudio_master_presets_v2';

export function loadMasterPresets(): MasterPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return DEFAULT_MASTER_PRESETS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_MASTER_PRESETS;
    
    // Combine defaults with user custom presets (custom presets first or marked)
    const customOnly = parsed.filter((p: MasterPreset) => p.isCustom);
    return [...customOnly, ...DEFAULT_MASTER_PRESETS];
  } catch (e) {
    console.error('Failed to load master presets:', e);
    return DEFAULT_MASTER_PRESETS;
  }
}

export function saveMasterPreset(preset: MasterPreset): MasterPreset[] {
  try {
    const current = loadMasterPresets();
    const existingIndex = current.findIndex(p => p.id === preset.id);
    let updated: MasterPreset[];
    const toSave = {
      ...preset,
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = toSave;
    } else {
      updated = [toSave, ...current];
    }

    const customOnly = updated.filter(p => p.isCustom);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(customOnly));
    return updated;
  } catch (e) {
    console.error('Failed to save master preset:', e);
    return DEFAULT_MASTER_PRESETS;
  }
}

export function deleteMasterPreset(presetId: string): MasterPreset[] {
  try {
    const current = loadMasterPresets();
    const updated = current.filter(p => p.id !== presetId);
    const customOnly = updated.filter(p => p.isCustom);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(customOnly));
    return updated;
  } catch (e) {
    console.error('Failed to delete master preset:', e);
    return DEFAULT_MASTER_PRESETS;
  }
}
