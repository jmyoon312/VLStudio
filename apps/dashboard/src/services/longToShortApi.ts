import {
  VideoProbeResult,
  HighlightCandidate,
  ExtractionSettings,
} from '@/types/longToShort';

const API_BASE = '/api/long-to-short';

export const longToShortApi = {
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
  }
};
