export type FramingMode = 'scene-preserve' | 'fit' | 'fill';

export type SubtitlePreset = 'default' | 'yellow_pop' | 'neon_cyan' | 'gunlimbo';

export interface SubtitlePresetOption {
  value: SubtitlePreset;
  label: string;
  desc: string;
  badgeColor: string;
}

export const SUBTITLE_PRESETS: SubtitlePresetOption[] = [
  { value: 'default', label: '화이트 기본', desc: '흰색 본문 + 블랙 외곽선', badgeColor: 'bg-muted text-foreground' },
  { value: 'yellow_pop', label: '강조 옐로우', desc: '골드 옐로우 + 볼드 외곽선', badgeColor: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' },
  { value: 'neon_cyan', label: '네온 사이언', desc: '일렉트릭 사이언 + 딥 네이비 외곽선', badgeColor: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' },
  { value: 'gunlimbo', label: '군림보 볼드', desc: '군림보 옐로우 + 초고대비 외곽선', badgeColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-400' },
];

export type JobStatus = 'queued' | 'running' | 'success' | 'failed' | 'paused';

export type StageName = 'search' | 'download' | 'matching' | 'edit' | 'capcut';

export type ExportStatus = 'none' | 'exporting' | 'exported';

export type AudioMode = 'tts' | 'mp3';

export interface LocalVideoFile {
  id: string;
  filename: string;
  filePath: string;
  webUrl?: string;
  sizeMb: number;
  durationSec?: number;
  mtime?: number;
}

export interface EntityTag {
  type: string;
  label: string;
}

export interface SceneMatch {
  id: number;
  line: string;
  target: string;
  query: string;
  search_query_en?: string;
  shot_type?: string;
  mood?: string;
  visual_description?: string;
}

export interface DownloadedSource {
  filename: string;
  filePath: string;
  sourceUrl: string;
  title: string;
  durationMs: number;
}

export interface TimedSegment {
  id: number;
  text: string;
  startMs: number;
  endMs: number;
  durationMs: number;
}

export interface AudioSourceData {
  filename: string;
  path?: string;
  durationMs: number;
  transcript: string;
  timedSegments: TimedSegment[];
}

export interface AudioSourceDraft {
  status: 'idle' | 'loading' | 'ready' | 'error';
  fileName?: string;
  error?: string;
  source?: AudioSourceData;
}

export interface VideoCreativeJob {
  id: string;
  title: string;
  script: string;
  sourceCount: number;
  languageCount: number;
  targetSourceCount: number;
  candidateUrls: string[];
  localVideoFiles?: LocalVideoFile[];
  audioMode?: AudioMode;
  searchSurfaceValues: string[];
  searchSurfaceLabels: string[];
  searchLanguageValues: string[];
  searchLanguageLabels: string[];
  framingMode: FramingMode;
  subtitlePreset?: SubtitlePreset;
  audioSource?: AudioSourceData;
  status: JobStatus;
  stage: StageName;
  progress: number;
  creditsUsed: number;
  estimatedSeconds: number;
  startedAtMs?: number;
  completedAtMs?: number;
  updatedAtMs?: number;
  exportStatus: ExportStatus;
  capcutDraftPath?: string;
  capcutDraftFolder?: string;
  error?: string;
  warning?: string;
  analysis: {
    entities: EntityTag[];
    scenes: SceneMatch[];
  };
  downloadedSources: DownloadedSource[];
}

export interface SurfaceOption {
  value: string;
  label: string;
}

export interface LanguageOption {
  value: string;
  label: string;
}

export const DEFAULT_SCRIPT = "일부 중국 공장은 케이블 타이에 지폐를 함께 묶어 넣습니다. 역대급 캐시백 이벤트일까요? 사실 이것은 짝퉁 전선과 싸우기 위한 조치입니다.";

export const SURFACES: SurfaceOption[] = [
  { value: 'youtube', label: 'YouTube Shorts' },
  { value: 'instagram', label: 'Instagram Reels' },
  { value: 'tiktok', label: 'TikTok' },
];

export const DEFAULT_LANGUAGES: LanguageOption[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: '영어' },
  { value: 'zh', label: '중국어' },
  { value: 'ja', label: '일본어' },
];

export const STAGE_LABELS: Record<StageName, string> = {
  search: '검색',
  download: '다운로드',
  matching: '매칭',
  edit: '편집',
  capcut: 'CapCut',
};

export const MAX_JOB_COUNT = 10;
export const MAX_TARGET_SOURCES = 10;
export const DEFAULT_TARGET_SOURCES = 4;
export const MAX_CONCURRENCY = 2; // Tier 1 GlobalArbiter GPU Semaphore

export function formatDurationSeconds(sec: number): string {
  const rounded = Math.round(sec);
  if (rounded < 60) return `${rounded}초`;
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}
