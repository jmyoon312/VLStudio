/**
 * CapCut Desktop JSON Exporter
 *
 * Cloud Functions를 통해 JSON 생성
 * 로컬에서는 SRT 생성 및 미디어 패키징만 담당
 */

// Cloud Functions 버전 import
import { exportCapcutPackageCloud } from './capcutCloud';

/**
 * CapCut 프로젝트 ZIP 생성
 *
 * @param {Object} project - 프로젝트 데이터
 * @param {Object} options - 옵션
 * @returns {Promise<Blob>} ZIP Blob
 */
export async function exportCapcut(project, options = {}) {
  console.log('[CapCut] Using Cloud Functions for JSON generation');
  return exportCapcutPackageCloud(project, options);
}

import { buildStorySrtEntries } from '../utils/storyAudioPackage';
import { srtTrackToEntries } from '../utils/srtTrack';

/**
 * SRT 자막 파일 생성
 * @param {Object} project - 프로젝트 데이터
 * @param {string} lang - 'ko' | 'en'
 * @param {Object} options - 옵션 (srtTrack, srtEntries, audioPackage 등)
 * @returns {string} SRT 포맷 문자열
 */
export function generateSRT(project, lang = 'ko', options = {}) {
  const scenes = project.scenes || [];
  
  // 1. 고정밀 자막 엔트리 추출 우선순위 (Story 세그먼트 / srtEntries / srtTrack / Ddalkkak)
  let entries = options.srtEntries || project.srtEntries;
  if (!entries || entries.length === 0) {
    if (project._ddalkkak?.subtitles?.length > 0) {
      entries = project._ddalkkak.subtitles.map(s => {
        const startMs = s.startMs ?? s.start_ms ?? (s.startTime != null ? s.startTime * 1000 : (s.start != null ? s.start * 1000 : 0));
        const endMs = s.endMs ?? s.end_ms ?? (s.endTime != null ? s.endTime * 1000 : (s.end != null ? s.end * 1000 : 0));
        const durMs = s.durationMs ?? s.duration_ms ?? (s.duration != null ? s.duration * 1000 : (endMs - startMs));
        return {
          text: s.text || s.content || '',
          startMs: startMs || 0,
          endMs: endMs || (startMs + durMs),
          durationMs: durMs || 3000
        };
      });
    } else if (options.srtTrack && options.srtTrack.length > 0) {
      entries = srtTrackToEntries(options.srtTrack);
    } else if (project.srtTrack && project.srtTrack.length > 0) {
      entries = srtTrackToEntries(project.srtTrack);
    } else {
      const storyEntries = buildStorySrtEntries(scenes);
      if (storyEntries && storyEntries.length > 0) {
        entries = storyEntries;
      }
    }
  }

  // 고정밀 자막 엔트리가 있는 경우: 음성 및 세그먼트와 1:1 완벽 일치하는 SRT 생성
  if (entries && entries.length > 0) {
    let srtContent = '';
    let index = 1;
    for (const entry of entries) {
      const text = entry.text || '';
      if (!text.trim()) continue;
      const startMs = (entry.startMs != null ? entry.startMs : (entry.startTime * 1000)) || 0;
      const endMs = (entry.endMs != null ? entry.endMs : ((entry.endTime * 1000) || (startMs + (entry.durationMs || 3000)))) || 0;
      if (endMs <= startMs) continue;

      const startTime = formatSRTTime(startMs);
      const endTime = formatSRTTime(endMs);

      srtContent += `${index}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${text.trim()}\n\n`;
      index++;
    }
    if (srtContent.trim()) {
      return srtContent.trim();
    }
  }

  // 2. 레거시 씬 기반 자막 폴백
  const videos = project.videos || [];
  const videoMap = {};
  videos.forEach(video => {
    if (video.video_path && video.from_scene) {
      videoMap[video.from_scene] = video;
    }
  });

  let srtContent = '';
  let index = 1;
  let currentTimeMs = 0;

  // 씬 정렬
  const sortedScenes = [...scenes].sort((a, b) => {
    const aNum = parseInt(String(a.id).replace('scene_', ''));
    const bNum = parseInt(String(b.id).replace('scene_', ''));
    return aNum - bNum;
  });

  for (const scene of sortedScenes) {
    const subtitle = lang === 'ko' ? scene.subtitle_ko : scene.subtitle_en;

    // 자막이 없으면 스킵
    if (!subtitle || !subtitle.trim()) {
      const video = videoMap[scene.id];
      const durationMs = video
        ? (video.duration || 5) * 1000
        : (scene.image_duration || scene.duration || 3) * 1000;
      currentTimeMs += durationMs;
      continue;
    }

    const video = videoMap[scene.id];
    const durationMs = video
      ? (video.duration || 5) * 1000
      : (scene.image_duration || scene.duration || 3) * 1000;

    const startTime = formatSRTTime(currentTimeMs);
    const endTime = formatSRTTime(currentTimeMs + durationMs);

    srtContent += `${index}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${subtitle.trim()}\n\n`;

    index++;
    currentTimeMs += durationMs;
  }

  return srtContent.trim();
}

/**
 * SRT 시간 포맷 변환 (ms -> 00:00:00,000)
 */
function formatSRTTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

/**
 * 자막 파일 다운로드 (Electron: 네이티브 저장 다이얼로그)
 */
export async function downloadSRT(project, lang = 'ko') {
  const srtContent = generateSRT(project, lang);
  const filename = `${project.name || 'project'}_subtitle_${lang}.srt`;

  if (window.electronAPI?.saveSrtFile) {
    await window.electronAPI.saveSrtFile({ filename, content: srtContent });
  } else {
    // Fallback: browser download
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return filename;
}

export default {
  exportCapcut,
  generateSRT,
  downloadSRT
};
