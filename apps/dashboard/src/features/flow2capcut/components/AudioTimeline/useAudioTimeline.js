import { useMemo } from 'react'
import { parseTimeToSeconds } from '../../utils/parsers'
import { resolveVideoSrc } from '../../utils/videoSrc'
import { resolveImageSrc } from '../../utils/formatters'
import { getSceneTimeRangeMs, isPreviewVideoVisible, computeVideoClipPlacement } from './timelinePlacement'

export { getSceneTimeRangeMs, isPreviewVideoVisible, computeVideoClipPlacement }

const COLORS = {
  image: '#7E57C2',
  video: '#26C281',
  subtitle: '#FFD54F',
  narration: '#4FC3F7',
  voice: '#BA68C8',
  sfx: '#FFB74D',
}

// HSL hue shift (sub-track 색상 변형용)
function shiftHue(hex, deg) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0
  const l = (max + min) / 2
  const s = max === min ? 0 : (max - min) / (l < 0.5 ? max + min : 2 - max - min)
  if (max !== min) {
    const d = max - min
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  const newH = ((h * 360 + deg) % 360 + 360) % 360 / 360
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r2 = hue2rgb(p, q, newH + 1/3)
  const g2 = hue2rgb(p, q, newH)
  const b2 = hue2rgb(p, q, newH - 1/3)
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`
}

/**
 * 재생 대상 오디오 클립 수집 — audioPath 있는 클립만, startMs 오름차순.
 * disabledTrackIds 에 든 트랙(Mute)은 통째로 제외. 비주얼 트랙을 넣어도 audioPath 가
 * 없어 무해(harmless) — 호출자가 disabledTracks 전체를 그대로 넘겨도 됨.
 */
export function collectPlayableClips(tracks, disabledTrackIds = new Set()) {
  if (!tracks) return []
  return tracks
    .filter(t => !disabledTrackIds.has(t.id))
    .flatMap(t => t.clips || [])
    .filter(c => c.audioPath)
    .sort((a, b) => a.startMs - b.startMs)
}

export function useAudioTimeline(audioPackage, scenes, srtEntries) {
  return useMemo(() => {
    // audioPackage가 없어도 placeholder 트랙은 생성 (드롭 타겟 제공).
    // scenes/srtEntries만 있어도 image/subtitle 트랙은 표시.
    const pkg = audioPackage || {}
    const folderPath = pkg.folderPath || ''
    const toRelPath = (p) => (p && folderPath) ? p.replace(folderPath + '/', '') : p

    // 총 길이 — narration 우선, 없으면 모든 클립 max end
    let totalDurationMs = pkg.media?.video?.durationMs || 0

    // ── Image 트랙 ──
    // scenes의 필드는 imagePath/startTime (camelCase) 또는 image_path/start_time (snake_case)
    // 양쪽 모두 지원
    const imageClips = (scenes || [])
      .map(s => {
        const imgPath = s.imagePath || s.image_path || s.filePath
        // 생성 중인 씬은 이미지가 아직 없어도 placeholder 클립을 만들어 shimmer 를 보여준다.
        // status 만 신뢰 — useAutomation 이 시작 시 atomic 하게 'generating' 설정, 완료 시 'done'/'error'.
        // (generatingStartedAt && !generatingEndedAt 보조 판정은 이미지 완료 경로(imageFinalize)가
        //  generatingEndedAt 을 안 채워 완료 후에도 영구 true → shimmer 가 안 꺼지는 회귀를 만들었다.)
        const isGenerating = s.status === 'generating'
        if (!imgPath && !isGenerating) return null
        const range = getSceneTimeRangeMs(s)
        if (!range) return null
        return {
          id: `img-${s.id}`,
          startMs: range.startMs,
          endMs: range.endMs,
          // 재생성 중(generating)엔 기존 이미지를 화면에서 숨김 → 빈칸+shimmer(새로 만드는 느낌).
          // scene.imagePath 데이터는 그대로 두므로 에러/취소 시 다음 렌더에서 기존 이미지 복귀.
          imagePath: isGenerating ? null : (imgPath || null),
          // 캐시버스터 적용 src — Clip.jsx 가 raw file:// 대신 사용 (재생성 stale 회피)
          imgSrc: (imgPath && !isGenerating) ? resolveImageSrc({ imagePath: imgPath, generatedAt: s.generatedAt, image: s.image }) : null,
          generating: isGenerating,
          placeholder: isGenerating || !imgPath,  // 생성중 또는 이미지 없음 → 빈 박스 + shimmer
          // 생성 경과시간 표시(클록)용 — Results 와 동일 필드.
          generatingStartedAt: s.generatingStartedAt ?? null,
          generatingEndedAt: s.generatingEndedAt ?? null,
          sceneRef: s,
          color: COLORS.image,
        }
      })
      .filter(Boolean)

    // ── Video 트랙 (I2V / T2V 분리) ──
    // 한 씬이 i2v·t2v 둘 다 가질 수 있어, 예전엔 i2v 우선 1개만 보여 t2v 가 가려졌다.
    // 트랙을 source 별로 분리해 둘 다 노출(모니터 재생 우선순위는 PreviewPanel + View 토글).
    // 생성 중(t2v: videoT2VStatus / i2v: videoI2VStatus === 'generating')엔 기존 비디오를 화면에서
    // 숨기고 placeholder+shimmer (이미지 트랙과 동일). 데이터는 유지 → 에러/취소 시 복귀.
    const buildVideoClips = (source) => (scenes || [])
      .map(s => {
        const range = getSceneTimeRangeMs(s)
        if (!range) return null
        const isGenerating = source === 'i2v'
          ? s.videoI2VStatus === 'generating'
          : s.videoT2VStatus === 'generating'
        const isDisabled = source === 'i2v' ? !!s.videoI2VDisabled : !!s.videoT2VDisabled
        // 재생성 중(t2v) → 기존 비디오를 화면에서 숨기고 빈칸+shimmer (새로 만드는 느낌, 이미지 트랙과 동일).
        // scene.videoT2VPath 등 데이터는 건드리지 않으므로(아래 placement 경로를 안 탐) 에러/취소 시
        // 다음 렌더(status≠generating)에서 기존 비디오가 그대로 복귀한다.
        if (isGenerating) {
          return {
            id: `vid-${source}-${s.id}`, startMs: range.startMs, endMs: range.endMs,
            videoPath: null, videoSrc: null, generating: true, placeholder: true,
            // 생성 경과시간 표시(클록)용 — t2v/i2v 각자 타임스탬프(i2v 미보유 시 null → 00:00).
            generatingStartedAt: (source === 'i2v' ? s.videoI2VGeneratingStartedAt : s.videoT2VGeneratingStartedAt) ?? null,
            generatingEndedAt: (source === 'i2v' ? s.videoI2VGeneratingEndedAt : s.videoT2VGeneratingEndedAt) ?? null,
            sceneRef: s, color: COLORS.video, role: `video-${source}`,
            disabled: isDisabled,
          }
        }
        const placement = computeVideoClipPlacement(s, range.startMs, range.endMs, source)
        if (!placement) return null
        const videoVersion = source === 'i2v'
          ? (s.videoI2VGeneratedAt ?? s.generatedAt)
          : (s.videoT2VGeneratedAt ?? s.generatedAt)
        const videoSrc = resolveVideoSrc(null, placement.videoPath, { version: videoVersion })
        if (!videoSrc) return null
        return {
          id: `vid-${source}-${s.id}`,
          startMs: placement.videoIn,
          endMs: placement.videoOut,
          videoPath: placement.videoPath,
          // 단일 정규화 지점 — useVideoPosters / AudioTimeline poster 주입 / PreviewPanel <video src> 공유.
          videoSrc,
          generating: isGenerating,
          sceneRef: s,
          color: COLORS.video,
          role: `video-${source}`,
          disabled: isDisabled,
        }
      })
      .filter(Boolean)

    const videoI2VClips = buildVideoClips('i2v')
    const videoT2VClips = buildVideoClips('t2v')

    // ── 자막 트랙 ──
    const subtitleClips = (srtEntries || []).map((e, i) => {
      let startMs = 0
      if (typeof e.startMs === 'number') startMs = e.startMs
      else if (typeof e.start === 'number') startMs = e.start * 1000
      else if (typeof e.startTime === 'number') startMs = e.startTime * 1000
      else if (typeof e.startTime === 'string') startMs = parseTimeToSeconds(e.startTime) * 1000
      
      let endMs = startMs + 3000
      if (typeof e.endMs === 'number') endMs = e.endMs
      else if (typeof e.end === 'number') endMs = e.end * 1000
      else if (typeof e.endTime === 'number') endMs = e.endTime * 1000
      else if (typeof e.endTime === 'string') endMs = parseTimeToSeconds(e.endTime) * 1000
      
      return {
        id: `sub-${i}`,
        startMs: Math.round(startMs),
        endMs: Math.round(endMs),
        label: e.text || e.label || `자막 #${i + 1}`,
        color: COLORS.subtitle,
      }
    })

    // ── Narration 트랙 (실제 오디오 파일이나 narration clips가 있을 때만 클립 생성) ──
    const narrationClips = (pkg.tracks?.narration?.clips?.length > 0)
      ? pkg.tracks.narration.clips.map(c => ({
          ...c,
          color: COLORS.narration
        }))
      : (pkg.media?.video?.path ? [{
          id: 'narration',
          startMs: 0,
          endMs: pkg.media.video.durationMs || 0,
          audioPath: pkg.media.video.path,
          filename: pkg.media.video.filename,
          color: COLORS.narration,
        }] : [])

    // ── Voice 트랙 (그룹 + 캐릭터별 sub-track) ──
    const voiceSubTracks = (pkg.voices || []).map((v, vi) => {
      const color = shiftHue(COLORS.voice, vi * 30)
      const clips = (v.files || [])
        .filter(f => f.timecodeMs != null)
        .map(f => ({
          id: `voice-${v.character}-${f.filename}`,
          startMs: f.timecodeMs,
          endMs: f.timecodeMs + (f.durationMs || 3000),
          audioPath: f.path,
          relPath: toRelPath(f.path),
          filename: f.filename,
          character: v.character,
          color,
          type: 'voice',
          draggable: true,
        }))
      return { id: `voice-${v.character}`, name: v.character, color, clips }
    }).filter(t => t.clips.length > 0)

    // 통합 Voice 클립 (접힘 모드용)
    const voiceClipsAll = voiceSubTracks.flatMap(t => t.clips)

    // ── SFX 트랙 (그룹 + 카테고리별 sub-track) ──
    // sfxPromptMap: { [filenameStem]: { cueNo, partName, anchor, placement, offsetSec, prompt, durationSec } }
    // 디스크 파일명 `<stem>_<MMSS>.mp3` → 마지막 `_<NNNN>` 또는 `_<NNNNNN>` 분리하여 stem 추출 후 매핑
    const sfxPromptMap = pkg.sfxPromptMap || null
    const lookupSfxMeta = (filename) => {
      if (!sfxPromptMap || !filename) return null
      const nameNoExt = filename.replace(/\.[^.]+$/, '')
      // 마지막 `_` 이후가 4자리 또는 6자리 숫자면 timecode → 제거
      const m = nameNoExt.match(/^(.+)_(\d{4}|\d{6})$/)
      const stem = m ? m[1] : nameNoExt
      return sfxPromptMap[stem] || null
    }

    const sfxSubTracks = (pkg.sfx || []).map((s, si) => {
      const color = shiftHue(COLORS.sfx, si * 20)
      const clips = (s.files || [])
        .filter(f => f.timecodeMs != null)
        .map(f => ({
          id: `sfx-${s.category}-${f.filename}`,
          startMs: f.timecodeMs,
          endMs: f.timecodeMs + (f.durationMs || 3000),
          audioPath: f.path,
          relPath: toRelPath(f.path),
          filename: f.filename,
          category: s.category,
          color,
          type: 'sfx',
          draggable: true,
          sfxMeta: lookupSfxMeta(f.filename),
        }))
      return { id: `sfx-${s.category}`, name: s.category, color, clips }
    }).filter(t => t.clips.length > 0)

    const sfxClipsAll = sfxSubTracks.flatMap(t => t.clips)

    // 총 길이 보강 — narration 없거나 부족할 경우
    const allClips = [...imageClips, ...videoI2VClips, ...videoT2VClips, ...subtitleClips, ...narrationClips, ...voiceClipsAll, ...sfxClipsAll]
    const maxEnd = allClips.reduce((m, c) => Math.max(m, c.endMs || 0), 0)
    if (maxEnd > totalDurationMs) totalDurationMs = maxEnd
    if (!totalDurationMs) totalDurationMs = 60000 // 빈 패키지 fallback (1분)

    // 트랙 구성 — Narration/SFX는 placeholder로 항상 표시 (드롭 타겟).
    // Video/Image/Subtitle/Voice는 데이터 있을 때만 (드롭 받지 않음).
    //
    // 트랙 순서 (위→아래) = 비주얼 z-order (위 트랙이 위 레이어). PreviewPanel 렌더 순서
    // (이미지 배경 → 비디오 오버레이 → 자막 최상단)와 일치시킨다:
    //   자막 > Video(I2V) > Video(T2V) > Image > Narration > Voice > SFX
    // 자막은 비디오/이미지 위에 얹히므로 맨 위. 모니터는 맨 위 "보이는" 비디오 트랙을
    // 재생(i2v 우선, View 끄면 t2v). 일반 NLE(Premiere/CapCut/DaVinci) 컨벤션과 동일.
    const tracks = []
    // 1. 자막 트랙 (상시 고정)
    tracks.push({
      id: 'subtitle',
      name: '자막',
      color: COLORS.subtitle,
      variant: 'text',
      clips: subtitleClips,
      role: 'subtitle',
    })

    // 2. 비디오(영상) 트랙 (상시 고정)
    tracks.push({
      id: 'video-i2v',
      name: '영상',
      color: COLORS.video,
      variant: 'block',
      clips: videoI2VClips,
      role: 'video-i2v',
    })

    if (videoT2VClips.length > 0) {
      tracks.push({ id: 'video-t2v', name: 'Video (T2V)', color: COLORS.video, variant: 'block', clips: videoT2VClips, role: 'video-t2v' })
    }

    // 3. 이미지 트랙 (상시 고정)
    tracks.push({
      id: 'image',
      name: '이미지',
      color: COLORS.image,
      variant: 'block',
      clips: imageClips,
      role: 'image',
    })

    // 4. 나레이션 트랙 (상시 고정)
    tracks.push({
      id: 'narration',
      name: '나레이션',
      color: COLORS.narration,
      variant: 'audio',
      clips: narrationClips,
      role: 'narration',
      acceptsDrop: 'audio',
    })

    if (voiceSubTracks.length > 0) {
      tracks.push({
        id: 'voice',
        name: 'Voice',
        color: COLORS.voice,
        variant: 'audio',
        expandable: true,
        clips: voiceClipsAll,
        subTracks: voiceSubTracks,
        role: 'voice',
      })
    }

    // 5. 효과음 트랙 (상시 고정)
    tracks.push({
      id: 'sfx',
      name: '효과음',
      color: COLORS.sfx,
      variant: 'audio',
      expandable: true,
      clips: sfxClipsAll,
      subTracks: sfxSubTracks,
      role: 'sfx',
      acceptsDrop: 'audio',
    })

    return { totalDurationMs, tracks }
  }, [audioPackage, scenes, srtEntries])
}
