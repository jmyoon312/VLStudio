/**
 * timelinePlacement - 타임라인 씬 및 비디오 클립 배치 순수 헬퍼 함수
 */

import { parseTimeToSeconds } from '../../utils/parsers'

/**
 * 씬의 시작/끝 시간을 ms 단위로 정규화.
 */
export function getSceneTimeRangeMs(scene) {
  if (!scene) return null
  if (Number.isFinite(scene.startMs) && Number.isFinite(scene.endMs)) {
    return { startMs: Math.round(scene.startMs), endMs: Math.round(scene.endMs) }
  }
  const startRaw = scene.startTime ?? scene.start_time
  const endRaw = scene.endTime ?? scene.end_time
  const startSec = typeof startRaw === 'number' ? startRaw : parseTimeToSeconds(startRaw)
  const endSec = typeof endRaw === 'number' ? endRaw : parseTimeToSeconds(endRaw)
  if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) return null
  return { startMs: Math.round(startSec * 1000), endMs: Math.round(endSec * 1000) }
}

/**
 * 프리뷰 모니터에서 이 source 영상이 보이는지 확인.
 */
export function isPreviewVideoVisible(scene, source, hiddenRoles) {
  if (!scene) return false
  if (hiddenRoles && hiddenRoles.has(`video-${source}`)) return false
  return source === 'i2v' ? !scene.videoI2VDisabled : !scene.videoT2VDisabled
}

/**
 * 씬 안에서 비디오가 차지할 구간을 계산.
 */
export function computeVideoClipPlacement(scene, sceneStartMs, sceneEndMs, source) {
  if (!scene) return null
  if (!Number.isFinite(sceneStartMs) || !Number.isFinite(sceneEndMs)) return null
  const sceneDurMs = sceneEndMs - sceneStartMs
  if (sceneDurMs <= 0) return null

  const i2vPath = scene.videoI2VPath || scene.video_i2v_path || null
  const t2vPath = scene.videoT2VPath || scene.video_t2v_path || null
  const i2vDur = scene.videoI2VDuration ?? scene.video_i2v_duration ?? null
  const t2vDur = scene.videoT2VDuration ?? scene.video_t2v_duration ?? null

  let videoPath, videoDurSec
  if (source === 'i2v') { videoPath = i2vPath; videoDurSec = i2vDur }
  else if (source === 't2v') { videoPath = t2vPath; videoDurSec = t2vDur }
  else { videoPath = i2vPath || t2vPath; videoDurSec = i2vPath ? i2vDur : t2vDur } // 미지정: i2v 우선
  if (!videoPath) return null

  // duration 이 없으면 scene 전체를 채움 (fallback)
  if (!Number.isFinite(videoDurSec) || videoDurSec <= 0) {
    return { videoPath, videoIn: sceneStartMs, videoOut: sceneEndMs }
  }

  const videoDurMs = videoDurSec * 1000
  if (sceneDurMs >= videoDurMs) {
    // Case A: 씬이 더 김 → 비디오는 씬의 뒤편에 배치 (앞쪽은 이미지 표시)
    return {
      videoPath,
      videoIn: sceneEndMs - videoDurMs,
      videoOut: sceneEndMs,
    }
  }
  // Case B: 비디오가 더 김 → 씬의 시작부터 재생, 씬 끝에서 잘림
  return {
    videoPath,
    videoIn: sceneStartMs,
    videoOut: sceneEndMs,
  }
}
