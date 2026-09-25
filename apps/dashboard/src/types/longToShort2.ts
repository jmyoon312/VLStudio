/**
 * 롱투숏 v2 (Long-To-Short 2) 이야기 압축 제작실 전용 타입 규격
 * 픽셀링 원천 번들 (컴포넌트 kj, kh, km, kf, kv, 상수 vw, jn, ji) SSOT 100% 반영
 */

export type StorySegmentRole = 'hook' | 'development' | 'climax' | 'resolution';

export interface StorySegmentRoleInfo {
  role: StorySegmentRole;
  label: string;
  badgeColor: string;
  textColor: string;
  borderColor: string;
  description: string;
}

export const STORY_SEGMENT_ROLES: Record<StorySegmentRole, StorySegmentRoleInfo> = {
  hook: {
    role: 'hook',
    label: '도입 (Hook)',
    badgeColor: 'bg-blue-500/20',
    textColor: 'text-blue-500 dark:text-blue-400',
    borderColor: 'border-blue-500/40',
    description: '시청자의 시선을 1~3초 만에 사로잡는 오프닝 핵심 발언/장면'
  },
  development: {
    role: 'development',
    label: '전개 (Context)',
    badgeColor: 'bg-indigo-500/20',
    textColor: 'text-indigo-500 dark:text-indigo-400',
    borderColor: 'border-indigo-500/40',
    description: '사건의 배경과 갈등 맥락을 빠르게 설명하는 징검다리 장면'
  },
  climax: {
    role: 'climax',
    label: '절정 (Climax)',
    badgeColor: 'bg-purple-500/20',
    textColor: 'text-purple-500 dark:text-purple-400',
    borderColor: 'border-purple-500/40',
    description: '감정/갈등/웃음/충격이 최고조에 달하는 킬러 모먼트'
  },
  resolution: {
    role: 'resolution',
    label: '마무리 (Resolution)',
    badgeColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-500 dark:text-emerald-400',
    borderColor: 'border-emerald-500/40',
    description: '결말 또는 다음 행동 유도(여운/반전)를 남기는 엔딩'
  }
};

export interface StorySegment {
  id: string;
  role: StorySegmentRole;
  roleLabel: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  transcript: string;
  keyframeUrl?: string | null;
}

export type FramingMode = 'face-center' | 'sandwich-split' | 'blurred-pillarbox';

export interface FramingModeOption {
  id: FramingMode;
  label: string;
  shortLabel: string;
  description: string;
  badge: string;
}

export const FRAMING_MODES_V2: FramingModeOption[] = [
  {
    id: 'face-center',
    label: '화자 중심 크롭 (Face-Center)',
    shortLabel: '화자 중심',
    description: 'AI 얼굴 인식을 통해 주 화자의 시선을 9:16 중앙에 안정적으로 고정',
    badge: '추천'
  },
  {
    id: 'sandwich-split',
    label: '샌드위치 2분할 (Sandwich)',
    shortLabel: '2단 분할',
    description: '상단에는 화자 얼굴, 하단에는 자료화면/리액션을 배치하는 2단 구성',
    badge: '인터뷰/썰'
  },
  {
    id: 'blurred-pillarbox',
    label: '블러 배경 핏 (Blurred Pillarbox)',
    shortLabel: '블러 핏',
    description: '가로 원본 화면 비율을 100% 온전히 유지하고 상하 여백을 블러로 은은하게 채움',
    badge: '자료 중심'
  }
];

// 픽셀링 원천 클립 길이 프리셋 (jn)
export type LengthPresetV2 = 'short' | 'medium' | 'long' | 'very-long';

export interface LengthPresetOptionV2 {
  id: LengthPresetV2;
  label: string;
  rangeLabel: string;
  defaultSec: number;
  minSec: number;
  maxSec: number;
  description: string;
}

export const LENGTH_PRESETS_V2: Record<LengthPresetV2, LengthPresetOptionV2> = {
  short: {
    id: 'short',
    label: '짧게',
    rangeLabel: '20~35초',
    defaultSec: 28,
    minSec: 20,
    maxSec: 35,
    description: '알고리즘 초단타 반응을 노리는 고속 템포 요약'
  },
  medium: {
    id: 'medium',
    label: '보통 (권장)',
    rangeLabel: '35~60초',
    defaultSec: 45,
    minSec: 35,
    maxSec: 60,
    description: '도입·절정·마무리 완결 서사와 최적 시청 지속 시간 확보'
  },
  long: {
    id: 'long',
    label: '길게',
    rangeLabel: '60~90초',
    defaultSec: 75,
    minSec: 60,
    maxSec: 90,
    description: '반전 서사와 몰입도 높은 대화 맥락을 충분히 담아내는 구성'
  },
  'very-long': {
    id: 'very-long',
    label: '많이 길게',
    rangeLabel: '90~150초',
    defaultSec: 120,
    minSec: 90,
    maxSec: 150,
    description: '1분 30초 이상의 롱폼 감성 미니 에피소드'
  }
};

// 픽셀링 원천 무음 제거 프리셋 (ji)
export type SilenceRemovalV2 = 'none' | 'light' | 'strong';

export interface SilenceRemovalOptionV2 {
  id: SilenceRemovalV2;
  label: string;
  description: string;
}

export const SILENCE_REMOVAL_PRESETS_V2: Record<SilenceRemovalV2, SilenceRemovalOptionV2> = {
  none: {
    id: 'none',
    label: '안 함',
    description: '자연스러운 침묵과 쉼표를 그대로 유지'
  },
  light: {
    id: 'light',
    label: '약하게 (기본)',
    description: '0.6초 이상의 긴 침묵 구간만 깔끔하게 제거'
  },
  strong: {
    id: 'strong',
    label: '강하게',
    description: '0.3초 이상의 모든 호흡과 지연 구간을 타이트하게 컷'
  }
};

export interface BestComment {
  id: string;
  author: string;
  authorThumb?: string;
  text: string;
  likes: number;
  publishedAt?: string;
}

// 픽셀링 원천 wc 테이블 SSOT (영상 길이에 따른 권장/최대 개수 공식)
export interface WcRangeRule {
  fromMinutes: number;
  toMinutes: number;
  recommended: number;
  max: number;
}

export const PIXELING_WC_TABLE: WcRangeRule[] = [
  { fromMinutes: 0, toMinutes: 5, recommended: 1, max: 2 },
  { fromMinutes: 5, toMinutes: 10, recommended: 2, max: 3 },
  { fromMinutes: 10, toMinutes: 20, recommended: 3, max: 5 },
  { fromMinutes: 20, toMinutes: 40, recommended: 5, max: 6 },
  { fromMinutes: 40, toMinutes: 60, recommended: 8, max: 10 },
  { fromMinutes: 60, toMinutes: Infinity, recommended: 10, max: 10 }
];

export interface CandidateGuideResult {
  recommended: number;
  max: number;
  label: string;
  badge: string;
  fromDuration: boolean;
  durationLabel: string;
}

/**
 * 픽셀링 원천 wu(durationMs) 함수 1:1 복원
 */
export function calculateCandidateGuide(durationSec: number | null | undefined): CandidateGuideResult {
  if (typeof durationSec !== 'number' || !Number.isFinite(durationSec) || durationSec <= 0) {
    return {
      recommended: 4,
      max: 10,
      label: '영상 길이에 맞춰 최적 쇼츠 개수를 자동 추천합니다.',
      badge: '권장 4개',
      fromDuration: false,
      durationLabel: ''
    };
  }

  const durationMinutes = durationSec / 60;
  const rule = PIXELING_WC_TABLE.find(r => durationMinutes >= r.fromMinutes && durationMinutes < r.toMinutes)
    ?? PIXELING_WC_TABLE[PIXELING_WC_TABLE.length - 1];

  const formatDurationLabel = (sec: number) => {
    const mins = Math.floor(sec / 60);
    if (mins < 1) return '1분 미만';
    if (mins < 60) return `약 ${mins}분`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `약 ${hours}시간 ${remMins}분` : `약 ${hours}시간`;
  };

  const durLabel = formatDurationLabel(durationSec);

  return {
    recommended: rule.recommended,
    max: rule.max,
    label: `${durLabel} 영상은 ${rule.recommended}개를 추천하며, 중복 없이 최대 ${rule.max}개까지 만들 수 있습니다.`,
    badge: `권장 ${rule.recommended}개 (최대 ${rule.max}개)`,
    fromDuration: true,
    durationLabel: durLabel
  };
}

export interface StoryCompressedCandidate {
  id: string;
  candidateIndex: number;
  title: string;
  hookSummary: string;
  totalDurationSec: number;
  totalDurationLabel: string;
  segments: StorySegment[];
  vmiScore: number;
  hookScore: number;
  storyScore: number;
  rhythmScore: number;
  reason: string;
  thumbnailUrl?: string | null;
  framingMode: FramingMode;
  smoothingFactor: number;
  targetSpeaker?: string;
  commentsOverlay?: BestComment[];
  includeCommentInCapCut: boolean; // 픽셀링 원천 toggleCandidateCommentInCapCut
  customCommentOverride?: { author: string; text: string }; // 픽셀링 원천 commentOverrides
  selected: boolean;
  capcutExported?: boolean;
  exportedClipPath?: string;
}

export interface LongToShort2Settings {
  candidateCount: number;
  lengthPreset: LengthPresetV2;
  silenceRemoval: SilenceRemovalV2;
  framingMode: FramingMode;
  smoothingFactor: number; // 0.1 ~ 1.0 (카메라 스무딩)
  headroomRatio: number; // 상단 헤드룸 %
  creativeDirectivePrompt: string;
  allowOverlap: boolean;
  analysisRange: {
    enabled: boolean;
    startSec: number;
    endSec: number;
  };
  commentSettings: {
    enabled: boolean;
    position: 'top' | 'bottom';
    includeMultiUseLanguages: boolean;
  };
  multiUseLangs: string[];
}

export const DEFAULT_L2S2_SETTINGS: LongToShort2Settings = {
  candidateCount: 4,
  lengthPreset: 'medium',
  silenceRemoval: 'light',
  framingMode: 'face-center',
  smoothingFactor: 0.8,
  headroomRatio: 15,
  creativeDirectivePrompt: '',
  allowOverlap: false,
  analysisRange: {
    enabled: false,
    startSec: 0,
    endSec: 1800
  },
  commentSettings: {
    enabled: true,
    position: 'top',
    includeMultiUseLanguages: false
  },
  multiUseLangs: ['ko']
};

export type L2S2AnalysisStage =
  | 'idle'
  | 'probing'
  | 'downloading'
  | 'transcribing'
  | 'story_segmenting'
  | 'face_tracking'
  | 'generating'
  | 'completed'
  | 'failed';

export interface L2S2ProgressState {
  stage: L2S2AnalysisStage;
  percent: number;
  message: string;
  detail?: string;
}

