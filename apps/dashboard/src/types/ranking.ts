/**
 * ViraLoop Studio - 랭킹형 쇼츠 (Ranking Shorts) 단일 진실 공급원 (SSOT) 타입 정의
 * 픽셀링 원천 Zod 스키마 및 NLE 컴포넌트(JC/JN) 전수 역공학 1:1 반영
 */

export type RankingCreationMode = 'single-video' | 'multi-source';

export type RankingTemplateId =
  | 'failsup-ranking'
  | 'legend-ranking'
  | 'clean-ranking'
  | 'world-ranking'
  | 'level-up-ranking'
  | 'count-up-ranking'
  | 'tier-progress-ranking'
  | 'grade-badge-ranking'
  | 'gauge-ranking';

export type TransitionSoundStyle = 'impact' | 'click' | 'whoosh';

export type RankEntranceStyle = 'slide-up' | 'bounce' | 'pop' | 'fade';

export type CaptionEntranceStyle = 'pop' | 'slide-up' | 'fade';

export type HeaderBarShape = 'pill' | 'rounded' | 'rect' | 'ellipse';

export type RankDisplayMode = 'cumulative' | 'current' | 'complete' | 'numbered';

export type RankOrder = 'reverse' | 'input';

export interface BlurRegion {
  id: string;
  x: number; // 0 ~ 100 (%)
  y: number; // 0 ~ 100 (%)
  width: number; // 0 ~ 100 (%)
  height: number; // 0 ~ 100 (%)
  strength: number; // 10 ~ 100
}

export interface SceneCandidate {
  id: string;
  startMs: number;
  durationMs: number;
  rankingScore: number; // 0 ~ 100
  title: string;
  label?: string;
  safety?: 'safe' | 'review' | 'unsafe';
  thumbnailUrl?: string;
}

export interface RankingItem {
  id: string;
  rank: number; // 1 ~ 10
  title: string; // 순위 항목 명칭
  statValue: string; // 통계치 / 수치 (예: '선호도 30.4%', '시속 490km/h')
  description: string; // 선정 이유 및 나레이션 본문
  hookJabText?: string; // 쨉쨉이 자막 (예: '*TOP 1*')
  startMs: number; // 원본 비디오 시작 시간 (ms)
  durationMs: number; // 재생 길이 (ms)
  sourceIndex: number;
  sourceUrl?: string;
  sourceName?: string;
  thumbnailUrl?: string;
  candidates: SceneCandidate[]; // AI가 찾은 다른 장면 후보들
  blurRegions: BlurRegion[]; // 순위 장면 내 가림(블러) 마스크 영역들 (최대 4개)
}

export interface RankingTemplateConfig {
  id: RankingTemplateId;
  name: string;
  category: string;
  description: string;
  palette: {
    headerBackground: string;
    headline: string;
    subtitle: string;
    accent: string;
    stroke: string;
    badgeBg: string;
    badgeText: string;
  };
  shape: HeaderBarShape;
  headerHeight: number; // 260 ~ 680
  headerPaddingX: number; // 20 ~ 180
  headlineFontSize: number; // 64 ~ 190
  subtitleFontSize: number; // 64 ~ 190
  rankFontSize: number; // 36 ~ 110
  rankTitleFontSize: number; // 22 ~ 70
  rankLineHeight: number; // 54 ~ 160
  rankDisplayMode: RankDisplayMode;
  rankEntrance: RankEntranceStyle;
  captionEntrance: CaptionEntranceStyle;
  rankRevealDelayMs: number; // 0 ~ 2000
  captionRevealDelayMs: number; // 0 ~ 2000
  defaultSoundStyle: TransitionSoundStyle;
  defaultSoundVolume: number; // 0 ~ 100
  defaultSoundOffsetMs: number; // 0 ~ 2000
  defaultBlackoutMs: number; // 0 ~ 600
}

export interface RankingOptions {
  templateId: RankingTemplateId;
  shape: HeaderBarShape;
  headerBackgroundColor: string;
  headlineColor: string;
  subtitleColor: string;
  accentColor: string;
  strokeColor: string;
  rankDisplayMode: RankDisplayMode;
  order: RankOrder;
  clipDurationPreset: 'auto' | 'short' | 'medium' | 'full';
  videoFit: 'cover' | 'contain';
  fontFamily: 'do-hyeon' | 'black-han-sans' | 'noto-sans-kr' | 'pretendard';
  rankLabelStyle: 'numbered' | 'title-only';
  transitionSound: boolean;
  transitionSoundStyle: TransitionSoundStyle;
  transitionSoundVolume: number; // 0 ~ 100
  transitionSoundOffsetMs: number; // 0 ~ 2000 ms
  transitionBlackoutMs: number; // 0 ~ 600 ms (0: 끔)
  bgmEnabled: boolean;
  bgmTrackId?: string;
  bgmVolume: number; // 0 ~ 100
  ducking: number; // 0 ~ 100
  enableJaejaebiText: boolean;
  enableSituationText: boolean;
  voiceId: string;
}

export interface RankingJobPayload {
  id: string;
  creationMode: RankingCreationMode;
  rankingTopic: string;
  rankingCriteria: string;
  headline: string;
  subtitle: string;
  items: RankingItem[];
  options: RankingOptions;
  sourceVideoPath?: string;
  sourceDurations?: number[];
}

export interface RankingJobRecord {
  id: string;
  title: string;
  creationMode: RankingCreationMode;
  status: 'queued' | 'analyzing' | 'ready' | 'rendering' | 'completed' | 'failed';
  progressPercent: number;
  stageMessage: string;
  createdAt: string;
  completedAt?: string;
  outputVideoPath?: string;
  capcutDraftPath?: string;
  payload: RankingJobPayload;
  errorMessage?: string;
}

// 9대 공식 랭킹 템플릿 메타데이터 정의
export const RANKING_TEMPLATES: Record<RankingTemplateId, RankingTemplateConfig> = {
  'failsup-ranking': {
    id: 'failsup-ranking',
    name: '페일섭 랭킹 (FailsUp)',
    category: '엔터/유머',
    description: '아찔한 순간, 레전드 실수, 웃긴 장면 특화 네온 옐로우 & 블랙',
    palette: {
      headerBackground: '#111111',
      headline: '#FFE45C',
      subtitle: '#FFFFFF',
      accent: '#FF3D71',
      stroke: '#05070B',
      badgeBg: '#FFE45C',
      badgeText: '#111111',
    },
    shape: 'pill',
    headerHeight: 380,
    headerPaddingX: 40,
    headlineFontSize: 110,
    subtitleFontSize: 70,
    rankFontSize: 68,
    rankTitleFontSize: 42,
    rankLineHeight: 90,
    rankDisplayMode: 'current',
    rankEntrance: 'bounce',
    captionEntrance: 'pop',
    rankRevealDelayMs: 160,
    captionRevealDelayMs: 380,
    defaultSoundStyle: 'impact',
    defaultSoundVolume: 85,
    defaultSoundOffsetMs: 160,
    defaultBlackoutMs: 200,
  },
  'legend-ranking': {
    id: 'legend-ranking',
    name: '레전드 랭킹 (Legend)',
    category: '스포츠/명장면',
    description: '역대급 슈퍼플레이, 감동의 순간을 담은 골든 럭셔리 스타일',
    palette: {
      headerBackground: '#0F172A',
      headline: '#F59E0B',
      subtitle: '#F8FAFC',
      accent: '#38BDF8',
      stroke: '#020617',
      badgeBg: '#F59E0B',
      badgeText: '#000000',
    },
    shape: 'rounded',
    headerHeight: 400,
    headerPaddingX: 45,
    headlineFontSize: 115,
    subtitleFontSize: 72,
    rankFontSize: 72,
    rankTitleFontSize: 44,
    rankLineHeight: 95,
    rankDisplayMode: 'cumulative',
    rankEntrance: 'slide-up',
    captionEntrance: 'slide-up',
    rankRevealDelayMs: 180,
    captionRevealDelayMs: 360,
    defaultSoundStyle: 'whoosh',
    defaultSoundVolume: 90,
    defaultSoundOffsetMs: 180,
    defaultBlackoutMs: 150,
  },
  'clean-ranking': {
    id: 'clean-ranking',
    name: '클린 미니멀 (Clean Minimal)',
    category: '정보/지식',
    description: '군더더기 없는 세련된 모던 흑백 & 모노톤',
    palette: {
      headerBackground: '#FFFFFF',
      headline: '#0F172A',
      subtitle: '#64748B',
      accent: '#2563EB',
      stroke: '#E2E8F0',
      badgeBg: '#0F172A',
      badgeText: '#FFFFFF',
    },
    shape: 'rounded',
    headerHeight: 340,
    headerPaddingX: 35,
    headlineFontSize: 100,
    subtitleFontSize: 64,
    rankFontSize: 64,
    rankTitleFontSize: 38,
    rankLineHeight: 82,
    rankDisplayMode: 'cumulative',
    rankEntrance: 'fade',
    captionEntrance: 'fade',
    rankRevealDelayMs: 120,
    captionRevealDelayMs: 250,
    defaultSoundStyle: 'click',
    defaultSoundVolume: 75,
    defaultSoundOffsetMs: 120,
    defaultBlackoutMs: 0,
  },
  'world-ranking': {
    id: 'world-ranking',
    name: '월드 글로벌 (World Stat)',
    category: '상식/세계',
    description: '국가별 통계, 세계 랭킹, 지리, 역사에 최적화된 오션 블루',
    palette: {
      headerBackground: '#032D60',
      headline: '#60A5FA',
      subtitle: '#E0F2FE',
      accent: '#34D399',
      stroke: '#021835',
      badgeBg: '#60A5FA',
      badgeText: '#032D60',
    },
    shape: 'pill',
    headerHeight: 390,
    headerPaddingX: 40,
    headlineFontSize: 108,
    subtitleFontSize: 68,
    rankFontSize: 70,
    rankTitleFontSize: 40,
    rankLineHeight: 88,
    rankDisplayMode: 'cumulative',
    rankEntrance: 'slide-up',
    captionEntrance: 'pop',
    rankRevealDelayMs: 150,
    captionRevealDelayMs: 320,
    defaultSoundStyle: 'impact',
    defaultSoundVolume: 80,
    defaultSoundOffsetMs: 150,
    defaultBlackoutMs: 100,
  },
  'level-up-ranking': {
    id: 'level-up-ranking',
    name: '레벨업 게임 (Level Up)',
    category: '게임/만화',
    description: '게임 스펙, 능력치, 파워 인플레이션을 자극하는 네온 사이버펑크',
    palette: {
      headerBackground: '#180B2E',
      headline: '#A855F7',
      subtitle: '#E9D5FF',
      accent: '#22D3EE',
      stroke: '#090312',
      badgeBg: '#A855F7',
      badgeText: '#FFFFFF',
    },
    shape: 'rect',
    headerHeight: 420,
    headerPaddingX: 50,
    headlineFontSize: 120,
    subtitleFontSize: 75,
    rankFontSize: 75,
    rankTitleFontSize: 46,
    rankLineHeight: 100,
    rankDisplayMode: 'current',
    rankEntrance: 'bounce',
    captionEntrance: 'pop',
    rankRevealDelayMs: 200,
    captionRevealDelayMs: 400,
    defaultSoundStyle: 'impact',
    defaultSoundVolume: 90,
    defaultSoundOffsetMs: 200,
    defaultBlackoutMs: 250,
  },
  'count-up-ranking': {
    id: 'count-up-ranking',
    name: '카운트업 머니 (Count Up)',
    category: '경제/수치',
    description: '자산 가치, 연봉, 판매량, 조회수 순위를 부각하는 에메랄드 그린',
    palette: {
      headerBackground: '#062C1E',
      headline: '#34D399',
      subtitle: '#D1FAE5',
      accent: '#FBBF24',
      stroke: '#02150E',
      badgeBg: '#34D399',
      badgeText: '#062C1E',
    },
    shape: 'pill',
    headerHeight: 370,
    headerPaddingX: 40,
    headlineFontSize: 105,
    subtitleFontSize: 66,
    rankFontSize: 66,
    rankTitleFontSize: 40,
    rankLineHeight: 86,
    rankDisplayMode: 'cumulative',
    rankEntrance: 'slide-up',
    captionEntrance: 'slide-up',
    rankRevealDelayMs: 140,
    captionRevealDelayMs: 300,
    defaultSoundStyle: 'click',
    defaultSoundVolume: 80,
    defaultSoundOffsetMs: 140,
    defaultBlackoutMs: 0,
  },
  'tier-progress-ranking': {
    id: 'tier-progress-ranking',
    name: '티어 리스트 (Tier Progress)',
    category: '티어/계급',
    description: '브론즈에서 챌린저까지 단계적 진화 과정을 보여주는 볼드 템플릿',
    palette: {
      headerBackground: '#261208',
      headline: '#FB923C',
      subtitle: '#FFEDD5',
      accent: '#F43F5E',
      stroke: '#140602',
      badgeBg: '#FB923C',
      badgeText: '#261208',
    },
    shape: 'rounded',
    headerHeight: 395,
    headerPaddingX: 42,
    headlineFontSize: 112,
    subtitleFontSize: 70,
    rankFontSize: 72,
    rankTitleFontSize: 42,
    rankLineHeight: 92,
    rankDisplayMode: 'cumulative',
    rankEntrance: 'slide-up',
    captionEntrance: 'pop',
    rankRevealDelayMs: 170,
    captionRevealDelayMs: 350,
    defaultSoundStyle: 'whoosh',
    defaultSoundVolume: 85,
    defaultSoundOffsetMs: 170,
    defaultBlackoutMs: 150,
  },
  'grade-badge-ranking': {
    id: 'grade-badge-ranking',
    name: '등급 뱃지 (Grade Badge)',
    category: '리뷰/평점',
    description: 'S-A-B-C 등급 뱃지와 별점을 강조하는 비비드 인디고 스타일',
    palette: {
      headerBackground: '#1E1B4B',
      headline: '#818CF8',
      subtitle: '#E0E7FF',
      accent: '#F472B6',
      stroke: '#0B0925',
      badgeBg: '#818CF8',
      badgeText: '#1E1B4B',
    },
    shape: 'ellipse',
    headerHeight: 380,
    headerPaddingX: 40,
    headlineFontSize: 108,
    subtitleFontSize: 68,
    rankFontSize: 68,
    rankTitleFontSize: 40,
    rankLineHeight: 88,
    rankDisplayMode: 'current',
    rankEntrance: 'pop',
    captionEntrance: 'pop',
    rankRevealDelayMs: 150,
    captionRevealDelayMs: 320,
    defaultSoundStyle: 'impact',
    defaultSoundVolume: 80,
    defaultSoundOffsetMs: 150,
    defaultBlackoutMs: 100,
  },
  'gauge-ranking': {
    id: 'gauge-ranking',
    name: '게이지 바 (Gauge Bar)',
    category: '비교/지표',
    description: '0%~100% 퍼센티지 게이지가 차오르는 긴박감 넘치는 크림슨 레드',
    palette: {
      headerBackground: '#2B0609',
      headline: '#F87171',
      subtitle: '#FEE2E2',
      accent: '#FBBF24',
      stroke: '#170103',
      badgeBg: '#F87171',
      badgeText: '#2B0609',
    },
    shape: 'rounded',
    headerHeight: 410,
    headerPaddingX: 45,
    headlineFontSize: 114,
    subtitleFontSize: 72,
    rankFontSize: 70,
    rankTitleFontSize: 44,
    rankLineHeight: 94,
    rankDisplayMode: 'cumulative',
    rankEntrance: 'slide-up',
    captionEntrance: 'slide-up',
    rankRevealDelayMs: 180,
    captionRevealDelayMs: 380,
    defaultSoundStyle: 'whoosh',
    defaultSoundVolume: 85,
    defaultSoundOffsetMs: 180,
    defaultBlackoutMs: 200,
  },
};

export const RANKING_SOUND_STYLES: Array<{
  id: TransitionSoundStyle;
  label: string;
  desc: string;
  defaultOffsetMs: number;
}> = [
  { id: 'impact', label: '💥 임팩트 펀치 (Impact)', desc: '강렬하게 내려찍는 타격음, 집중도 극대화', defaultOffsetMs: 160 },
  { id: 'whoosh', label: '💨 휘익 전환 (Whoosh)', desc: '빠르고 매끄러운 씬 트랜지션 사운드', defaultOffsetMs: 180 },
  { id: 'click', label: '⏱️ 카운트 틱 (Click)', desc: '긴장감 있는 시계 바늘 카운트다운 비프음', defaultOffsetMs: 120 },
];
