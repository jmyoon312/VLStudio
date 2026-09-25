import {
  VideoProbeResult,
  HighlightCandidate,
  ExtractionSettings,
  AnalysisJobStatus,
} from '@/types/longToShort';

const API_BASE = '/api/long-to-short';

export const longToShortApi = {
  /**
   * 백그라운드 VMI 킬러 쇼츠 분석 시작 (타임아웃 방지)
   */
  async startAnalysis(params: {
    video_path: string;
    length_preset: string;
    target_duration_sec?: number;
    candidate_count: number;
    allow_overlap: boolean;
    silence_removal: boolean;
    silence_threshold_sec: number;
    directives?: string;
    multi_use_langs?: string[];
  }): Promise<{
    success: boolean;
    job_id: string;
    status: string;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/start-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '분석 작업 시작 실패' }));
      throw new Error(err.detail || '분석 작업 시작 실패');
    }
    return res.json();
  },

  /**
   * VMI 분석 작업 상태 폴링 조회
   */
  async getAnalysisStatus(jobId: string): Promise<AnalysisJobStatus> {
    const res = await fetch(`${API_BASE}/analysis-status/${jobId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '작업 상태 조회 실패' }));
      throw new Error(err.detail || '작업 상태 조회 실패');
    }
    return res.json();
  },
  /**
   * 07_Downloads 실제 보관함 비디오 목록 실시간 조회 (Zero Mock)
   */
  async getLibraryVideos(): Promise<Array<{
    id: string;
    title: string;
    file_path: string;
    file_size_bytes: number;
    file_size_label: string;
    category: string;
    created_at: string;
    duration_label?: string;
  }>> {
    const res = await fetch(`${API_BASE}/library-videos`);
    if (!res.ok) {
      throw new Error('보관함 비디오 목록 로드 실패');
    }
    return res.json();
  },

  /**
   * 로컬 비디오 파일 서버 업로드 및 즉시 프로빙
   */
  async uploadLocalVideo(file: File): Promise<VideoProbeResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload-file`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '비디오 파일 업로드 실패' }));
      throw new Error(err.detail || '비디오 파일 업로드 실패');
    }
    return res.json();
  },

  /**
   * 영상의 길이, 해상도, 코덱 정밀 프로빙
   */
  async probeVideo(videoPath: string): Promise<VideoProbeResult> {
    const res = await fetch(`${API_BASE}/probe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_path: videoPath })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '영상 메타데이터 분석 실패' }));
      throw new Error(err.detail || '영상 메타데이터 분석 실패');
    }
    return res.json();
  },

  /**
   * 유튜브 롱폼 영상 다운로드 (yt-dlp -> 07_Downloads)
   */
  async downloadYouTubeUrl(url: string): Promise<{
    video_path: string;
    video_title: string;
    duration_sec: number;
    file_size_bytes: number;
  }> {
    const res = await fetch(`${API_BASE}/download-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '유튜브 다운로드 실패' }));
      throw new Error(err.detail || '유튜브 다운로드 실패');
    }
    return res.json();
  },

  /**
   * VMI 3중 텐서 하이라이트 분석 및 킬러 구간 추출
   */
  async analyzeHighlights(params: {
    video_path: string;
    length_preset: string;
    target_duration_sec?: number;
    candidate_count: number;
    allow_overlap: boolean;
    silence_removal: boolean;
    silence_threshold_sec: number;
    directives?: string;
    multi_use_langs?: string[];
  }): Promise<{
    video_path: string;
    total_duration_sec: number;
    candidates: HighlightCandidate[];
    detected_cuts_count: number;
  }> {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '하이라이트 분석 실패' }));
      throw new Error(err.detail || '하이라이트 분석 실패');
    }
    return res.json();
  },

  /**
   * CapCut 초안 프로젝트(draft_content.json) 내보내기
   */
  async exportCapCut(params: {
    video_path: string;
    candidates: HighlightCandidate[];
    project_title?: string;
    multi_use_langs?: string[];
  }): Promise<{
    success: boolean;
    project_name: string;
    project_path: string;
    draft_json_path: string;
    clips_count: number;
    total_duration_sec: number;
  }> {
    const res = await fetch(`${API_BASE}/export-capcut`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'CapCut 초안 내보내기 실패' }));
      throw new Error(err.detail || 'CapCut 초안 내보내기 실패');
    }
    return res.json();
  },

  /**
   * 단일 후보 클립 무손실 MP4 잘라내기
   */
  async exportClip(params: {
    video_path: string;
    candidate: HighlightCandidate;
    output_filename?: string;
  }): Promise<{
    success: boolean;
    clip_path: string;
    file_name: string;
    duration_sec: number;
  }> {
    const res = await fetch(`${API_BASE}/export-clip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'MP4 클립 내보내기 실패' }));
      throw new Error(err.detail || 'MP4 클립 내보내기 실패');
    }
    return res.json();
  },

  /**
   * [롱투숏 v2] 이야기 요약 압축 (기승전결 3단계 세그먼트) 분석
   */
  async analyzeStoryCompression(params: {
    video_path: string;
    length_preset: string;
    candidate_count: number;
    allow_overlap: boolean;
    silence_removal: string;
    framing_mode: string;
    smoothing_factor: number;
    directives?: string;
    include_comments?: boolean;
    analysis_range?: { enabled: boolean; startSec: number; endSec: number };
    multi_use_langs?: string[];
  }): Promise<{
    success: boolean;
    video_path: string;
    total_duration_sec: number;
    candidates: any[];
    error?: string;
  }> {
    const res = await fetch(`${API_BASE}/analyze-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '이야기 압축 분석 실패' }));
      throw new Error(err.detail || '이야기 압축 분석 실패');
    }
    const data = await res.json();

    // snake_case ➔ camelCase 완벽 정규화 (Zero Discrepancy)
    const normalizedCandidates = (data.candidates || []).map((raw: any) => ({
      id: raw.id,
      candidateIndex: raw.candidateIndex ?? raw.candidate_index ?? 1,
      candidate_index: raw.candidate_index ?? raw.candidateIndex ?? 1,
      title: raw.title ?? '',
      hookSummary: raw.hookSummary ?? raw.hook_summary ?? '',
      hook_summary: raw.hook_summary ?? raw.hookSummary ?? '',
      totalDurationSec: raw.totalDurationSec ?? raw.total_duration_sec ?? 0,
      total_duration_sec: raw.total_duration_sec ?? raw.totalDurationSec ?? 0,
      totalDurationLabel: raw.totalDurationLabel ?? raw.total_duration_label ?? `${Math.round(raw.totalDurationSec ?? raw.total_duration_sec ?? 0)}초`,
      total_duration_label: raw.total_duration_label ?? raw.totalDurationLabel ?? '',
      segments: (raw.segments || []).map((s: any, sIdx: number) => ({
        id: s.id || `seg-${sIdx + 1}`,
        role: s.role || 'hook',
        roleLabel: s.roleLabel ?? s.role_label ?? '세그먼트',
        role_label: s.role_label ?? s.roleLabel ?? '세그먼트',
        startSec: Number(s.startSec ?? s.start_sec ?? 0),
        start_sec: Number(s.start_sec ?? s.startSec ?? 0),
        endSec: Number(s.endSec ?? s.end_sec ?? 0),
        end_sec: Number(s.end_sec ?? s.endSec ?? 0),
        durationSec: Number(s.durationSec ?? s.duration_sec ?? Math.max(0, (s.endSec ?? s.end_sec ?? 0) - (s.startSec ?? s.start_sec ?? 0))),
        duration_sec: Number(s.duration_sec ?? s.durationSec ?? 0),
        transcript: s.transcript ?? '',
        keyframeUrl: s.keyframeUrl ?? s.keyframe_url ?? null
      })),
      vmiScore: Number(raw.vmiScore ?? raw.vmi_score ?? 0.9),
      vmi_score: Number(raw.vmi_score ?? raw.vmiScore ?? 0.9),
      hookScore: Number(raw.hookScore ?? raw.hook_score ?? 90),
      hook_score: Number(raw.hook_score ?? raw.hookScore ?? 90),
      storyScore: Number(raw.storyScore ?? raw.story_score ?? 90),
      story_score: Number(raw.story_score ?? raw.storyScore ?? 90),
      rhythmScore: Number(raw.rhythmScore ?? raw.rhythm_score ?? 90),
      rhythm_score: Number(raw.rhythm_score ?? raw.rhythmScore ?? 90),
      reason: raw.reason ?? '',
      thumbnailUrl: raw.thumbnailUrl ?? raw.thumbnail_url ?? null,
      thumbnail_url: raw.thumbnail_url ?? raw.thumbnailUrl ?? null,
      framingMode: raw.framingMode ?? raw.framing_mode ?? 'face-center',
      framing_mode: raw.framing_mode ?? raw.framingMode ?? 'face-center',
      smoothingFactor: Number(raw.smoothingFactor ?? raw.smoothing_factor ?? 0.8),
      smoothing_factor: Number(raw.smoothing_factor ?? raw.smoothingFactor ?? 0.8),
      commentsOverlay: (raw.commentsOverlay ?? raw.comments_overlay ?? []).map((c: any) => ({
        id: c.id,
        author: c.author ?? '쇼츠매니아',
        text: c.text ?? '',
        likes: c.likes ?? 0
      })),
      includeCommentInCapCut: raw.includeCommentInCapCut ?? raw.include_comment_in_capcut ?? true,
      include_comment_in_capcut: raw.include_comment_in_capcut ?? raw.includeCommentInCapCut ?? true,
      customCommentOverride: raw.customCommentOverride ?? raw.custom_comment_override ?? null,
      custom_comment_override: raw.custom_comment_override ?? raw.customCommentOverride ?? null,
      selected: raw.selected ?? true,
      capcutExported: raw.capcutExported ?? false,
      exportedClipPath: raw.exportedClipPath ?? raw.exported_clip_path
    }));

    return {
      ...data,
      candidates: normalizedCandidates
    };
  },

  /**
   * [롱투숏 v2] 다중 세그먼트 비파괴 CapCut 9:16 프로젝트 내보내기
   */
  async exportStoryCapCut(params: {
    video_path: string;
    candidates: any[];
    project_title?: string;
    framing_mode?: string;
    comments?: any[];
    multi_use_langs?: string[];
  }): Promise<{
    success: boolean;
    project_name: string;
    project_path: string;
    draft_json_path: string;
    clips_count: number;
    total_duration_sec: number;
  }> {
    // 백엔드가 요구하는 형식에 맞추어 candidates 내 세그먼트 필드 보강
    const sanitizedCandidates = (params.candidates || []).map((cand: any) => ({
      ...cand,
      segments: (cand.segments || []).map((seg: any) => ({
        ...seg,
        start_sec: seg.start_sec ?? seg.startSec ?? 0,
        end_sec: seg.end_sec ?? seg.endSec ?? 0,
        transcript: seg.transcript ?? ''
      }))
    }));

    const res = await fetch(`${API_BASE}/export-capcut-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        candidates: sanitizedCandidates
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'CapCut v2 초안 내보내기 실패' }));
      throw new Error(err.detail || 'CapCut v2 초안 내보내기 실패');
    }
    return res.json();
  }
};

