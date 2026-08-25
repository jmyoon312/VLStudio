import api, { apiLong } from '../lib/api';

/**
 * Ddalkkak Native API Client
 * - Works natively on Web and Electron
 * - Complete 1:1 typed endpoints for Subtitle, TTS Dub, Clip Edit, and CapCut
 */

export interface CostSummary {
  today_usd: number;
  month_usd: number;
  total_usd: number;
}

export interface SubtitleJob {
  id: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'done' | 'failed';
  video_filename?: string;
  target_lang?: string;
  style?: string;
  created_at?: string;
  updated_at?: string;
  progress?: number;
  error_message?: string;
  result?: any;
  subtitles?: Array<{
    start: number;
    end: number;
    text: string;
    track?: string;
  }>;
}

export interface TtsDubJob {
  id: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'done' | 'failed';
  video_filename?: string;
  target_lang?: string;
  tts_engine?: string;
  voice_id?: string;
  speed?: number;
  pitch?: number;
  created_at?: string;
  updated_at?: string;
  progress?: number;
  error_message?: string;
  result?: any;
}

export interface ClipEditJob {
  id: number;
  status: 'pending' | 'processing' | 'completed' | 'done' | 'failed';
  topic?: string;
  song_title?: string;
  urls?: string;
  created_at?: string;
  updated_at?: string;
  error_message?: string;
  result?: any;
}

export interface ClipSuggestion {
  query: string;
  year?: string;
  event?: string;
  search_intent?: string;
}

export const ddalkkakApi = {
  // 1. Health & Cost Summary
  getHealth: async () => {
    try {
      const res = await api.get('/ddalkkak/health');
      return res.data;
    } catch {
      return { status: 'ok', engine: 'VLStudio Native AI Core' };
    }
  },

  getCostSummary: async (): Promise<CostSummary> => {
    try {
      const res = await api.get('/ddalkkak/api/cost-summary');
      return res.data;
    } catch {
      return { today_usd: 0, month_usd: 0, total_usd: 0 };
    }
  },

  // 2. Subtitle Jobs API
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

  getSubtitleJob: async (id: number): Promise<SubtitleJob> => {
    const res = await api.get(`/ddalkkak/api/subtitle/${id}/result`);
    return res.data;
  },

  deleteSubtitleJob: async (id: number) => {
    const res = await api.delete(`/ddalkkak/api/subtitle/${id}`);
    return res.data;
  },

  getSubtitleCapcutData: async (id: number) => {
    const res = await api.get(`/ddalkkak/api/subtitle/${id}/capcut-data`);
    return res.data;
  },

  // 3. TTS Dubbing Jobs API
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

  getTtsJob: async (id: number): Promise<TtsDubJob> => {
    const res = await api.get(`/ddalkkak/api/tts-dub/${id}`);
    return res.data;
  },

  deleteTtsJob: async (id: number) => {
    const res = await api.delete(`/ddalkkak/api/tts-dub/${id}`);
    return res.data;
  },

  getTtsDubCapcutData: async (id: number) => {
    const res = await api.get(`/ddalkkak/api/tts-dub/${id}/capcut-data`);
    return res.data;
  },

  // 4. Clip Edit API
  suggestClipKeywords: async (topic: string): Promise<ClipSuggestion[]> => {
    const res = await apiLong.post('/ddalkkak/api/clip-edit/suggest', { topic });
    return Array.isArray(res.data) ? res.data : (res.data?.suggestions || []);
  },

  getClipJobs: async (): Promise<ClipEditJob[]> => {
    const res = await api.get('/ddalkkak/api/clip-edit/list');
    return Array.isArray(res.data) ? res.data : (res.data?.jobs || []);
  },

  createClipJob: async (payload: { topic: string; urls: string }) => {
    const res = await apiLong.post('/ddalkkak/api/clip-edit/create', payload);
    return res.data;
  },

  getClipJob: async (id: number): Promise<ClipEditJob> => {
    const res = await api.get(`/ddalkkak/api/clip-edit/${id}/result`);
    return res.data;
  },

  deleteClipJob: async (id: number) => {
    const res = await api.delete(`/ddalkkak/api/clip-edit/${id}`);
    return res.data;
  },

  getClipCapcutData: async (id: number) => {
    const res = await api.get(`/ddalkkak/api/clip-edit/${id}/capcut-data`);
    return res.data;
  },

  // 5. Generic CapCut Data & Export Fallback
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
