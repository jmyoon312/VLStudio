import api, { apiLong } from '../lib/api';

/**
 * Ddalkkak Native API Client
 * - Works natively on both Web (http://localhost:5173 -> /api) and Electron (file:// -> http://127.0.0.1:8000/api)
 * - Zero iframe dependency, direct 1:1 typed API contract
 */

export interface CostSummary {
  today_usd: number;
  month_usd: number;
  total_usd: number;
}

export interface SubtitleJob {
  id: number;
  status: 'pending' | 'uploading' | 'analyzing' | 'done' | 'failed';
  video_name?: string;
  progress_message?: string;
  style?: string;
  created_at?: string;
  subtitles?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface TtsDubJob {
  id: number;
  status: 'pending' | 'analyzing' | 'synthesizing' | 'done' | 'failed';
  voice_name?: string;
  speed?: number;
  created_at?: string;
  audio_url?: string;
}

export interface ClipEditJob {
  id: number;
  status: 'pending' | 'processing' | 'done' | 'failed';
  video_name?: string;
  clips?: Array<{
    start: number;
    end: number;
    title: string;
    hook_score?: number;
  }>;
}

export interface DissectionItem {
  id: string;
  name: string;
  category?: string;
  hook_rate?: number;
  retention_score?: number;
  candidate_count?: number;
  created_at?: string;
}

export const ddalkkakApi = {
  // 1. Health & System Info
  getHealth: async () => {
    const res = await api.get('/ddalkkak/health');
    return res.data;
  },

  getCostSummary: async (): Promise<CostSummary> => {
    try {
      const res = await api.get('/ddalkkak/api/cost-summary');
      return res.data;
    } catch {
      return { today_usd: 0, month_usd: 0, total_usd: 0 };
    }
  },

  // 2. Subtitle Jobs
  getSubtitles: async (): Promise<SubtitleJob[]> => {
    const res = await api.get('/ddalkkak/api/subtitle/list');
    return Array.isArray(res.data) ? res.data : (res.data?.jobs || []);
  },

  createSubtitleJob: async (formData: FormData) => {
    const res = await apiLong.post('/ddalkkak/api/subtitle/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  // 3. TTS Dubbing Jobs
  getTtsJobs: async (): Promise<TtsDubJob[]> => {
    const res = await api.get('/ddalkkak/api/tts-dub/list');
    return Array.isArray(res.data) ? res.data : (res.data?.jobs || []);
  },

  createTtsJob: async (formData: FormData) => {
    const res = await apiLong.post('/ddalkkak/api/tts-dub/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  // 4. Clip Editing & Highlights
  getClipEditJobs: async (): Promise<ClipEditJob[]> => {
    const res = await api.get('/ddalkkak/api/clip-edit/list');
    return Array.isArray(res.data) ? res.data : (res.data?.jobs || []);
  },

  createClipEditJob: async (formData: FormData) => {
    const res = await apiLong.post('/ddalkkak/api/clip-edit/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  // 5. Dissections
  getDissections: async (): Promise<DissectionItem[]> => {
    const res = await api.get('/ddalkkak/api/dissections');
    return Array.isArray(res.data) ? res.data : (res.data?.dissections || []);
  },

  // 6. CapCut Export Data
  getCapcutData: async (type: string, id: number) => {
    const res = await api.get(`/ddalkkak/api/${type}/${id}/capcut-data`);
    return res.data;
  },

  exportCapcutFallback: async (type: string, id: number, targetPath?: string) => {
    let endpoint = `/ddalkkak/api/${type}/${id}/export-capcut`;
    if (targetPath) {
      endpoint += `?target_path=${encodeURIComponent(targetPath)}`;
    }
    const res = await api.post(endpoint);
    return res.data;
  }
};
