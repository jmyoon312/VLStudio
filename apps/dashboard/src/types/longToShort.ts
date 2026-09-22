export type LengthPreset = 'short' | 'medium' | 'long' | 'story';

export interface LengthPresetOption {
  id: LengthPreset;
  label: string;
  badge: string;
  rangeSec: string;
  defaultSec: number;
  minSec: number;
  maxSec: number;
  description: string;
}

export const LENGTH_PRESETS: LengthPresetOption[] = [
  {
    id: 'short',
    label: '짧게',
    badge: '20~35초',
    rangeSec: '20~35초',
    defaultSec: 28,
    minSec: 20,
    maxSec: 35,
    description: '쇼츠 피드 알고리즘에 즉각 반응하는 초단타 킬러 훅 중심'
  },
  {
    id: 'medium',
    label: '표준',
    badge: '35~60초 (권장)',
    rangeSec: '35~60초',
    defaultSec: 45,
    minSec: 35,
    maxSec: 60,
    description: '완전한 이야기 기승전결과 높은 시청 지속 시간을 동시에 확보'
  },
  {
    id: 'long',
    label: '길게',
    badge: '60~90초',
    rangeSec: '60~90초',
    defaultSec: 75,
    minSec: 60,
    maxSec: 90,
    description: '심도 있는 인터뷰, 사건 전개, 반전 서사를 온전히 담아냄'
  },
  {
    id: 'story',
    label: '1분 30초 이야기',
    badge: '90~150초',
    rangeSec: '90~150초',
    defaultSec: 120,
    minSec: 90,
    maxSec: 150,
    description: '시네마틱 미니 다큐, 영화 리뷰 등 롱폼 감성의 서사형 쇼츠'
  }
];

export interface HighlightCandidate {
  id: string;
  clip_index: number;
  start_sec: number;
  end_sec: number;
  duration_sec: number;
  hook_summary: string;
  transcript: string;
  thumbnail_url?: string | null;
  vmi_score: number;
  hook_score: number;
  story_score: number;
  rhythm_score: number;
  caption_score: number;
  reason: string;
  selected: boolean;
}

export interface VideoProbeResult {
  success: boolean;
  video_path: string;
  file_name: string;
  file_size_bytes: number;
  duration_sec: number;
  duration_label: string;
  width: number;
  height: number;
  resolution_label: string;
  video_codec: string;
  audio_codec: string;
  is_h264: boolean;
  is_compatible: boolean;
  recommended_candidates: number;
  max_candidates: number;
  warning?: string | null;
}

export interface ExtractionSettings {
  length_preset: LengthPreset;
  target_duration_sec?: number;
  candidate_count: number;
  allow_overlap: boolean;
  silence_removal: boolean;
  silence_threshold_sec: number;
  directives: string;
  multi_use_langs: string[];
}

export type AnalysisStage = 
  | 'idle'
  | 'downloading'
  | 'probing'
  | 'transcribing'
  | 'analyzing'
  | 'generating'
  | 'completed'
  | 'failed';

export interface ProgressState {
  stage: AnalysisStage;
  percent: number;
  message: string;
  detail?: string;
}
