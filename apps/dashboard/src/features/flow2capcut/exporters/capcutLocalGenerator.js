/**
 * capcutLocalGenerator - CapCut 프로젝트 폴더 구조 및 JSON 생성 (V6 Platinum Pro Max 버전)
 */

import { resolveImageSrc } from '../utils/formatters.js';
import { buildStoryAudioPackage, buildStorySrtEntries } from '../utils/storyAudioPackage.js';
import { srtTrackToEntries } from '../utils/srtTrack.js';

function generateId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().toUpperCase();
    }
  } catch (e) {}
  return 'XXXXXXXX-XXXX-4XXX-YXXX-XXXXXXXXXXXX'.replace(/[XY]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'X' ? r : (r & 0x3 | 0x8);
    return v.toString(16).toUpperCase();
  });
}

const toMicros = (seconds) => Math.round(seconds * 1000000);

/**
 * 캡컷 타임라인 프리징을 100% 영구 소멸시키기 위한 초정밀 겹침 방지(Safe Sequential Overlap Prevention) 헬퍼
 * 동일한 트랙 안의 기존 세그먼트들과 절대 겹치지 않도록 시작 시간(target_start)을 정밀 계산하여 순차 조율합니다.
 */
function addSegmentWithoutOverlap(track, segment, renderIndexStart = 20000) {
  let targetStart = segment.target_timerange.start;
  const duration = segment.target_timerange.duration;

  // 겹치지 않는 완전 안전 구간을 찾을 때까지 무한 반복하며 뒤로 밉니다.
  let hasOverlap = true;
  while (hasOverlap) {
    hasOverlap = false;
    for (const existing of track.segments) {
      const eStart = existing.target_timerange.start;
      const eEnd = eStart + existing.target_timerange.duration;
      const targetEnd = targetStart + duration;

      // 시간 구간이 미세하게라도 겹치는지 체크
      if (Math.max(eStart, targetStart) < Math.min(eEnd, targetEnd)) {
        // 겹침 발견! 기존 클립이 끝나는 안전한 시점으로 시작 지점을 뒤로 밀어냅니다.
        targetStart = eEnd;
        hasOverlap = true;
        break; // 루프를 빠져나와 처음부터 다시 겹침 체크 수행
      }
    }
  }

  // 안전이 확보된 새 시간대로 세그먼트를 갱신하여 푸시합니다.
  segment.target_timerange.start = targetStart;
  segment.render_index = renderIndexStart + track.segments.length;
  track.segments.push(segment);
}

export async function generateCapcutProject(project, options = {}) {
  const projectId = generateId();
  const targetPath = options.targetPath || '';
  const isPortrait = project.format === 'portrait' || project.format === 'short' || project.aspectRatio === '9:16';
  const canvasRatio = isPortrait ? '9:16' : '16:9';
  const canvasWidth = isPortrait ? 1080 : 1920;
  const canvasHeight = isPortrait ? 1920 : 1080;

  const scenes = project.scenes || [];
  
  let audioPackage = options.audioPackage;
  if (!audioPackage || ((!audioPackage.voices || audioPackage.voices.length === 0) && (!audioPackage.sfx || audioPackage.sfx.length === 0))) {
    const derived = buildStoryAudioPackage(scenes);
    if (derived && ((derived.voices && derived.voices.length > 0) || (derived.sfx && derived.sfx.length > 0))) {
      console.log('[CapCut Local Generator] Auto-derived audioPackage from story scenes:', derived);
      audioPackage = derived;
    }
  }

  const videoTrack = { id: generateId(), type: 'video', flag: 0, segments: [] };
  const overlayTrack = { id: generateId(), type: 'video', flag: 0, segments: [] };
  const watermarkTrack = { id: generateId(), type: 'video', flag: 0, name: 'Channel Watermark', segments: [] };
  const watermarkTextTrack = { id: generateId(), type: 'text', flag: 0, name: 'Text Watermark', segments: [] };
  const topTitleTrack = { id: generateId(), type: 'text', flag: 0, name: 'Top Title', segments: [] };
  const situationTrack = { id: generateId(), type: 'text', flag: 0, name: 'Situation Subtitles', segments: [] };
  const jjapjjapTrack = { id: generateId(), type: 'text', flag: 0, name: 'Reaction Subtitles', segments: [] };
  const textTrack = { id: generateId(), type: 'text', flag: 2, name: 'Main Subtitles', segments: [] };
  const globalVideoKeyframes = [];
  
  // 1순위: 나레이터 전용 동적 멀티트랙 배열
  const narratorTracks = [];
  const getOrCreateNarratorTrack = (index) => {
    if (!narratorTracks[index]) {
      narratorTracks[index] = {
        id: generateId(),
        type: 'audio',
        flag: 0,
        attribute: 0,
        name: index === 0 ? 'Voice - NARRATOR' : `Voice - NARRATOR (${index + 1})`,
        segments: []
      };
    }
    return narratorTracks[index];
  };

  // 2순위: 일반 캐릭터 대사용 동적 멀티트랙 배열
  const characterTracks = [];
  const getOrCreateCharTrack = (index) => {
    if (!characterTracks[index]) {
      characterTracks[index] = {
        id: generateId(),
        type: 'audio',
        flag: 0,
        attribute: 0,
        name: index === 0 ? 'Voice - CHARACTERS' : `Voice - CHARACTERS (${index + 1})`,
        segments: []
      };
    }
    return characterTracks[index];
  };

  // 3순위: 효과음용 동적 멀티트랙 배열
  const sfxTracksList = [];
  const getOrCreateSfxTrack = (index) => {
    if (!sfxTracksList[index]) {
      sfxTracksList[index] = {
        id: generateId(),
        type: 'audio',
        flag: 0,
        attribute: 0,
        name: index === 0 ? 'SFX - GENERAL' : `SFX - GENERAL (${index + 1})`,
        segments: []
      };
    }
    return sfxTracksList[index];
  };

  // 두 오디오 세그먼트의 타임라인상 시간 겹침(Overlap) 여부 판정기
  function checkOverlap(seg1, seg2) {
    const s1 = seg1.target_timerange.start;
    const e1 = s1 + seg1.target_timerange.duration;
    const s2 = seg2.target_timerange.start;
    const e2 = s2 + seg2.target_timerange.duration;
    return Math.max(s1, s2) < Math.min(e1, e2);
  }

  const materials = {
    flowers: [],
    videos: [],
    tail_leaders: [],
    audios: [],
    images: [],
    texts: [],
    effects: [],
    stickers: [],
    canvases: [],
    transitions: [],
    audio_effects: [],
    audio_fades: [],
    beats: [],
    material_animations: [],
    placeholders: [],
    placeholder_infos: [],
    speeds: [],
    common_mask: [],
    chromas: [],
    text_templates: [],
    realtime_denoises: [],
    audio_pannings: [],
    audio_pitch_shifts: [],
    video_trackings: [],
    hsl: [],
    drafts: [],
    color_curves: [],
    hsl_curves: [],
    primary_color_wheels: [],
    log_color_wheels: [],
    video_effects: [],
    audio_balances: [],
    handwrites: [],
    manual_deformations: [],
    manual_beautys: [],
    plugin_effects: [],
    sound_channel_mappings: [],
    green_screens: [],
    shapes: [],
    material_colors: [],
    digital_humans: [],
    digital_human_model_dressing: [],
    smart_crops: [],
    ai_translates: [],
    audio_track_indexes: [],
    loudnesses: [],
    vocal_beautifys: [],
    vocal_separations: [],
    smart_relights: [],
    time_marks: [],
    multi_language_refs: [],
    video_shadows: [],
    video_strokes: [],
    video_radius: []
  };

  let cumulativeTime = 0;
  const mediaFilesToCopy = [];

  // Sort scenes by ID numeric value just like generateSRT to ensure order consistency
  const sortedScenes = [...scenes].sort((a, b) => {
    const aNum = parseInt(String(a.id || '').replace('scene_', '')) || 0;
    const bNum = parseInt(String(b.id || '').replace('scene_', '')) || 0;
    return aNum - bNum;
  });

  for (let index = 0; index < sortedScenes.length; index++) {
    const scene = sortedScenes[index];
    const duration = scene.image_duration || scene.duration || 3;
    let imageSource = scene.media_path || scene.image_path || scene.imagePath || scene.image || scene.image_fallback; 
    
    if (imageSource) {
      const materialId = generateId();
      const segmentId = generateId();

      const isBase64 = imageSource.startsWith('data:');
      let ext = 'jpg';
      if (isBase64) {
        const match = imageSource.match(/^data:image\/(\w+);base64,/);
        ext = match ? (match[1] === 'jpeg' ? 'jpg' : match[1]) : 'jpg';
      } else {
        ext = imageSource.match(/\.(png|jpg|jpeg|webp|gif)$/i)?.[1] || 'jpg';
      }
      
      const targetName = `Resources/media_scene_${index + 1}.${ext}`;
      const absoluteTargetFilePath = `${targetPath}/${targetName}`.replace(/\\/g, '/');

      mediaFilesToCopy.push({
        source: imageSource,
        isBase64: isBase64,
        targetName: targetName
      });

      let imgWidth = canvasWidth;
      let imgHeight = canvasHeight;
      
      if (scene.upscaled_size) {
        imgWidth = scene.upscaled_size.width || canvasWidth;
        imgHeight = scene.upscaled_size.height || canvasHeight;
      } else if (scene.image_size) {
        imgWidth = scene.image_size.width || canvasWidth;
        imgHeight = scene.image_size.height || canvasHeight;
      } else if (scene.width && scene.height) {
        imgWidth = scene.width;
        imgHeight = scene.height;
      } else if (imageSource) {
        try {
          const resolvedSrc = resolveImageSrc({ imagePath: scene.media_path || scene.image_path || scene.imagePath, image: scene.image || scene.image_fallback }) || imageSource;
          const loadedSize = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => resolve(null);
            img.src = resolvedSrc;
          });
          if (loadedSize && loadedSize.width && loadedSize.height) {
            imgWidth = loadedSize.width;
            imgHeight = loadedSize.height;
            console.log(`[CapCut Local Generator] Extracted image size for scene ${index + 1}: ${imgWidth}x${imgHeight}`);
          }
        } catch (e) {
          console.warn(`[CapCut Local Generator] Failed to load image size for scene ${index + 1}, using canvas fallback.`);
        }
      }

      // materials.videos (Golden Template Applied)
      materials.videos.push({
        id: materialId,
        path: absoluteTargetFilePath,
        type: "photo", // Images should be "photo"
        duration: toMicros(duration),
        width: imgWidth,
        height: imgHeight,
        import_time: Math.floor(Date.now() / 1000),
        source_platform: 0,
        category_name: "local",
        category_id: "local",
        check_flag: 63487, // Magic number
        material_name: `media_scene_${index + 1}.${ext}`
      });

      const scaleMode = options.scaleMode || 'fill';
      let baseScale = 1.0; // default Fit

      const fitScaleX = canvasWidth / imgWidth;
      const fitScaleY = canvasHeight / imgHeight;
      const minFitScale = Math.min(fitScaleX, fitScaleY);
      const maxFitScale = Math.max(fitScaleX, fitScaleY);

      if (scaleMode === 'fill') {
        baseScale = maxFitScale / minFitScale;
      } else if (scaleMode === 'fit') {
        baseScale = 1.0;
      } else if (scaleMode === 'none') {
        baseScale = 1.0 / minFitScale;
      }

      const kenBurnsEnabled = options.kenBurns ?? true;
      const kenBurnsMode = options.kenBurnsMode || 'random';
      const kenBurnsCycle = options.kenBurnsCycle || 5;
      const kenBurnsScaleMin = parseFloat(options.kenBurnsScaleMin) || 1.0;
      const kenBurnsScaleMax = parseFloat(options.kenBurnsScaleMax) || 1.3;

      let startScaleVal = baseScale;
      let endScaleVal = baseScale;
      let startXVal = 0.0;
      let endXVal = 0.0;
      let startYVal = 0.0;
      let endYVal = 0.0;

      if (kenBurnsEnabled) {
        // [테두리 까만색 원천 소멸 및 줌아웃 사전 확대(Pre-scale) 알고리즘]
        // 1. Ken Burns가 활성화된 경우, 캔버스 전체를 꽉 채우는 비율(Fill 기준: maxFitScale / minFitScale)을 최소 baseScale로 강제하여 종횡비 차이로 인한 레터박스/필러박스를 원천 제거합니다.
        const fillBaseScale = Math.max(baseScale, maxFitScale / minFitScale);

        // 2. 사용자가 지적한 "너무 좌에서 우로 움직이다보니까 빈공백이 생기고 테두리에 까만색이 만들어져" 문제를 방어하기 위해 패닝 최대 범위를 3%(-0.03 ~ 0.03)로 제한하고, 패닝 버퍼(1.06배)를 확보합니다.
        const maxPan = 0.03; 
        const panBuffer = 1.0 + (2.0 * maxPan);
        let safeBaseScale = fillBaseScale * panBuffer;

        // 3. 사용자가 지적한 "줌 아웃이 되면 테두리가 검게 보이는데 줌 아웃인 경우에는 이걸 고려해서 미리 좀 더 확대해야하지 않을까?" 문제를 완벽 해결합니다!
        // kenBurnsScaleMin이 1.0 미만(예: 0.8)으로 설정되어 줌아웃 시 이미지가 캔버스보다 작아지는 현상을 완벽 방어하기 위해,
        // 최소 스케일 비율(effectiveMinScale)의 역수(1.0 / effectiveMinScale)를 safeBaseScale에 사전 곱셈(Pre-scale)하여 미리 확대해 둡니다.
        const effectiveMinScale = Math.min(kenBurnsScaleMin, kenBurnsScaleMax);
        if (effectiveMinScale < 1.0) {
          const zoomOutBuffer = 1.0 / effectiveMinScale;
          safeBaseScale = safeBaseScale * zoomOutBuffer;
          console.log(`[CapCut Local Generator] Applied Zoom-Out Pre-scale buffer: ${zoomOutBuffer.toFixed(2)}x (safeBaseScale: ${safeBaseScale.toFixed(2)})`);
        }

        if (kenBurnsMode === 'pattern') {
          const patternIdx = index % 6;
          if (patternIdx === 0) { // Zoom In (정중앙 줌인)
            startScaleVal = safeBaseScale * kenBurnsScaleMin;
            endScaleVal = safeBaseScale * kenBurnsScaleMax;
          } else if (patternIdx === 1) { // Zoom Out (정중앙 줌아웃)
            startScaleVal = safeBaseScale * kenBurnsScaleMax;
            endScaleVal = safeBaseScale * kenBurnsScaleMin;
          } else if (patternIdx === 2) { // Pan Right + Zoom In
            startScaleVal = safeBaseScale * kenBurnsScaleMin;
            endScaleVal = safeBaseScale * kenBurnsScaleMax;
            startXVal = -maxPan;
            endXVal = maxPan;
          } else if (patternIdx === 3) { // Pan Left + Zoom In
            startScaleVal = safeBaseScale * kenBurnsScaleMin;
            endScaleVal = safeBaseScale * kenBurnsScaleMax;
            startXVal = maxPan;
            endXVal = -maxPan;
          } else if (patternIdx === 4) { // Pan Up + Zoom In
            startScaleVal = safeBaseScale * kenBurnsScaleMin;
            endScaleVal = safeBaseScale * kenBurnsScaleMax;
            startYVal = -maxPan;
            endYVal = maxPan;
          } else if (patternIdx === 5) { // Pan Down + Zoom In
            startScaleVal = safeBaseScale * kenBurnsScaleMin;
            endScaleVal = safeBaseScale * kenBurnsScaleMax;
            startYVal = maxPan;
            endYVal = -maxPan;
          }
        } else { // random
          const minS = safeBaseScale * kenBurnsScaleMin;
          const maxS = safeBaseScale * kenBurnsScaleMax;
          if (Math.random() < 0.5) { // Zoom In
            startScaleVal = minS;
            endScaleVal = minS + (maxS - minS) * (0.5 + Math.random() * 0.5);
          } else { // Zoom Out
            startScaleVal = minS + (maxS - minS) * (0.5 + Math.random() * 0.5);
            endScaleVal = minS;
          }
          startXVal = (Math.random() - 0.5) * (maxPan * 1.5);
          endXVal = (Math.random() - 0.5) * (maxPan * 1.5);
          startYVal = (Math.random() - 0.5) * (maxPan * 1.5);
          endYVal = (Math.random() - 0.5) * (maxPan * 1.5);
        }
      }

      const scaleKfList = [];
      const xKfList = [];
      const yKfList = [];

      if (kenBurnsEnabled) {
        const totalMicros = toMicros(duration);
        const cycleMicros = toMicros(kenBurnsCycle);
        let currentMicros = 0;
        let cycleIdx = 0;

        while (currentMicros < totalMicros) {
          const isEven = cycleIdx % 2 === 0;
          const sVal = isEven ? startScaleVal : endScaleVal;
          const xVal = isEven ? startXVal : endXVal;
          const yVal = isEven ? startYVal : endYVal;

          scaleKfList.push({
            id: generateId(),
            time_offset: currentMicros,
            values: [sVal],
            curveType: "Line"
          });
          xKfList.push({
            id: generateId(),
            time_offset: currentMicros,
            values: [xVal],
            curveType: "Line"
          });
          yKfList.push({
            id: generateId(),
            time_offset: currentMicros,
            values: [yVal],
            curveType: "Line"
          });

          currentMicros += cycleMicros;
          cycleIdx++;
        }

        if (scaleKfList.length > 0 && scaleKfList[scaleKfList.length - 1].time_offset < totalMicros) {
          const isEven = cycleIdx % 2 === 0;
          const sVal = isEven ? startScaleVal : endScaleVal;
          const xVal = isEven ? startXVal : endXVal;
          const yVal = isEven ? startYVal : endYVal;

          scaleKfList.push({
            id: generateId(),
            time_offset: totalMicros,
            values: [sVal],
            curveType: "Line"
          });
          xKfList.push({
            id: generateId(),
            time_offset: totalMicros,
            values: [xVal],
            curveType: "Line"
          });
          yKfList.push({
            id: generateId(),
            time_offset: totalMicros,
            values: [yVal],
            curveType: "Line"
          });
        }
      }

      const commonKeyframes = [];
      const keyframeRefs = [];

      if (kenBurnsEnabled && scaleKfList.length > 1) {
        const kfScaleId = generateId();
        const kfScaleXId = generateId();
        const kfScaleYId = generateId();
        const kfXId = generateId();
        const kfYId = generateId();

        // 캡컷 데스크톱 버전별 호환성을 완벽 보장하기 위해 KFTypeScaleUniform뿐만 아니라 KFTypeScaleX, KFTypeScaleY까지 전부 주입합니다!
        const kfScaleObj = {
          id: kfScaleId,
          keyframe_list: scaleKfList,
          property_type: "KFTypeScaleUniform"
        };
        const kfScaleXObj = {
          id: kfScaleXId,
          keyframe_list: scaleKfList,
          property_type: "KFTypeScaleX"
        };
        const kfScaleYObj = {
          id: kfScaleYId,
          keyframe_list: scaleKfList,
          property_type: "KFTypeScaleY"
        };
        const kfXObj = {
          id: kfXId,
          keyframe_list: xKfList,
          property_type: "KFTypePositionX"
        };
        const kfYObj = {
          id: kfYId,
          keyframe_list: yKfList,
          property_type: "KFTypePositionY"
        };

        commonKeyframes.push(kfScaleObj, kfScaleXObj, kfScaleYObj, kfXObj, kfYObj);
        keyframeRefs.push(kfScaleId, kfScaleXId, kfScaleYId, kfXId, kfYId);

        globalVideoKeyframes.push(kfScaleObj, kfScaleXObj, kfScaleYObj, kfXObj, kfYObj);
      }

      videoTrack.segments.push({
        id: segmentId,
        material_id: materialId,
        source_timerange: { start: 0, duration: toMicros(duration) },
        target_timerange: { start: toMicros(cumulativeTime), duration: toMicros(duration) },
        render_index: 10000 + index,
        clip: {
          scale: { x: startScaleVal, y: startScaleVal },
          transform: { x: startXVal, y: startYVal }
        },
        uniform_scale: {
          on: true,
          value: startScaleVal
        },
        keyframe_refs: keyframeRefs,
        common_keyframes: commonKeyframes,
        extra_material_refs: [materialId]
      });
    } else {
      // 이미지가 없는 씬: 영상이 있으면 메인 비디오 트랙에 직접 배치, 없으면 빈 투명 갭 배치
      const videoPath = scene.video_path || scene.videoPath;
      const videoDurationSec = scene.video_duration || duration || 0;

      if (videoPath && videoDurationSec > 0) {
        const videoMaterialId = generateId();
        const videoSegmentId = generateId();

        const isBase64Video = videoPath.startsWith('data:');
        const isUrl = videoPath.startsWith('http://') || videoPath.startsWith('https://');
        let vExt = 'mp4';
        if (isBase64Video) {
          const match = videoPath.match(/^data:video\/(\w+);base64,/);
          vExt = match ? match[1] : 'mp4';
        } else if (!isUrl) {
          vExt = videoPath.match(/\.(mp4|webm|mov|avi)$/i)?.[1] || 'mp4';
        }

        const vTargetName = `Resources/media_scene_${index + 1}_video.${vExt}`;
        const vAbsoluteTargetFilePath = `${targetPath}/${vTargetName}`.replace(/\\/g, '/');

        mediaFilesToCopy.push({
          source: videoPath,
          isBase64: isBase64Video,
          isUrl: isUrl,
          targetName: vTargetName
        });

        materials.videos.push({
          id: videoMaterialId,
          path: vAbsoluteTargetFilePath,
          type: "video",
          duration: toMicros(videoDurationSec),
          width: canvasWidth,
          height: canvasHeight,
          import_time: Math.floor(Date.now() / 1000),
          source_platform: 0,
          category_name: "local",
          category_id: "local",
          check_flag: 63487,
          material_name: `media_scene_${index + 1}_video.${vExt}`
        });

        const clipDurationSec = Math.max(videoDurationSec, duration);

        videoTrack.segments.push({
          id: videoSegmentId,
          material_id: videoMaterialId,
          source_timerange: { start: 0, duration: toMicros(clipDurationSec) },
          target_timerange: { start: toMicros(cumulativeTime), duration: toMicros(clipDurationSec) },
          render_index: 10000 + index,
          clip: {
            scale: { x: 1.0, y: 1.0 },
            transform: { x: 0, y: 0 }
          },
          extra_material_refs: [videoMaterialId]
        });
      } else {
        const segmentId = generateId();
        videoTrack.segments.push({
          id: segmentId,
          material_id: "",
          source_timerange: null,
          target_timerange: { start: toMicros(cumulativeTime), duration: toMicros(duration) },
          render_index: 10000 + index,
          clip: {
            scale: { x: 1.0, y: 1.0 },
            transform: { x: 0, y: 0 }
          },
          extra_material_refs: []
        });
      }
    }

    // [영상 오버레이 처리] (이미지가 있고 생성된 비디오도 함께 있는 경우)
    const videoPath = scene.video_path || scene.videoPath;
    const videoDurationSec = scene.video_duration || duration || 0;
    if (imageSource && videoPath && videoDurationSec > 0) {
      const videoMaterialId = generateId();
      const videoSegmentId = generateId();

      const isBase64Video = videoPath.startsWith('data:');
      const isUrl = videoPath.startsWith('http://') || videoPath.startsWith('https://');
      let vExt = 'mp4';
      if (isBase64Video) {
        const match = videoPath.match(/^data:video\/(\w+);base64,/);
        vExt = match ? match[1] : 'mp4';
      } else if (!isUrl) {
        vExt = videoPath.match(/\.(mp4|webm|mov|avi)$/i)?.[1] || 'mp4';
      }

      const vTargetName = `Resources/media_scene_${index + 1}_video.${vExt}`;
      const vAbsoluteTargetFilePath = `${targetPath}/${vTargetName}`.replace(/\\/g, '/');

      mediaFilesToCopy.push({
        source: videoPath,
        isBase64: isBase64Video,
        isUrl: isUrl,
        targetName: vTargetName
      });

      materials.videos.push({
        id: videoMaterialId,
        path: vAbsoluteTargetFilePath,
        type: "video",
        duration: toMicros(videoDurationSec),
        width: canvasWidth,
        height: canvasHeight,
        import_time: Math.floor(Date.now() / 1000),
        source_platform: 0,
        category_name: "local",
        category_id: "local",
        check_flag: 63487,
        material_name: `media_scene_${index + 1}_video.${vExt}`
      });

      const clipDurationSec = Math.min(videoDurationSec, duration);
      const videoStartMs = videoDurationSec < duration
        ? (cumulativeTime * 1000) + ((duration - videoDurationSec) * 1000)
        : (cumulativeTime * 1000);

      overlayTrack.segments.push({
        id: videoSegmentId,
        material_id: videoMaterialId,
        source_timerange: { start: 0, duration: toMicros(clipDurationSec) },
        target_timerange: { start: videoStartMs * 1000, duration: toMicros(clipDurationSec) },
        render_index: 11000 + index,
        clip: {
          scale: { x: 1.0, y: 1.0 },
          transform: { x: 0, y: 0 }
        },
        extra_material_refs: [videoMaterialId]
      });
    }

    cumulativeTime += duration;
  }

  // ── 씬 전환 트랜지션 (Transitions) 주입 ──
  const transitionConfig = options.transitionConfig;
  if (transitionConfig && transitionConfig.mode !== 'none' && videoTrack.segments.length > 1) {
    const PRESETS_MAP = {
      dissolve: { name: "디졸브", effectId: "transition_dissolve", resourceId: "res_tr_dissolve" },
      flash_white: { name: "플래시 화이트", effectId: "transition_flash_white", resourceId: "res_tr_flash" },
      zoom_in: { name: "줌인", effectId: "transition_zoom_in", resourceId: "res_tr_zoom" },
      whip_pan: { name: "휩팬", effectId: "transition_whip_pan", resourceId: "res_tr_whip" },
      glitch: { name: "글리치", effectId: "transition_glitch", resourceId: "res_tr_glitch" },
      slide_left: { name: "슬라이드", effectId: "transition_slide_left", resourceId: "res_tr_slide" },
    };

    const trDurationSec = transitionConfig.durationSec || 0.5;

    for (let i = 0; i < videoTrack.segments.length - 1; i++) {
      let selectedType = transitionConfig.mode === 'fixed' ? transitionConfig.fixedType : null;
      if (transitionConfig.mode === 'random' && transitionConfig.randomPool && transitionConfig.randomPool.length > 0) {
        const pool = transitionConfig.randomPool;
        selectedType = pool[i % pool.length];
      }
      if (!selectedType) selectedType = 'dissolve';

      const preset = PRESETS_MAP[selectedType] || PRESETS_MAP.dissolve;
      const trId = generateId();

      materials.transitions.push({
        id: trId,
        type: "transition",
        name: preset.name,
        duration: toMicros(trDurationSec),
        resource_id: preset.resourceId,
        effect_id: preset.effectId,
        is_overlap: true,
        category_name: "transition",
        category_id: "transition"
      });

      const seg = videoTrack.segments[i];
      if (seg) {
        if (!seg.extra_material_refs) seg.extra_material_refs = [];
        seg.extra_material_refs.push(trId);
      }
    }
  }

  // ── 채널 브랜딩 워터마크 / 로고 오버레이 (Watermark) 주입 ──
  const watermarkConfig = options.watermarkConfig;
  if (watermarkConfig && watermarkConfig.enabled && cumulativeTime > 0) {
    const totalDurationMicros = toMicros(cumulativeTime);
    const durationMicros = watermarkConfig.durationMode === 'intro' ? Math.min(totalDurationMicros, toMicros(3.0)) : totalDurationMicros;

    // 9방향 좌표 변환 (-0.8 ~ 0.8)
    let posX = 0.7;
    let posY = 0.75;
    if (watermarkConfig.position) {
      if (watermarkConfig.position.includes('left')) posX = -0.7;
      else if (watermarkConfig.position.includes('center')) posX = 0.0;
      else if (watermarkConfig.position.includes('right')) posX = 0.7;

      if (watermarkConfig.position.startsWith('top')) posY = 0.75;
      else if (watermarkConfig.position.startsWith('mid')) posY = 0.0;
      else if (watermarkConfig.position.startsWith('bottom')) posY = -0.75;
    }

    const scaleVal = (watermarkConfig.scale || 15) / 100 * (isPortrait ? 1.0 : 0.8);
    const alphaVal = (watermarkConfig.opacity || 80) / 100;

    if (watermarkConfig.type === 'image' && watermarkConfig.imageUrl) {
      const stickerMaterialId = generateId();
      const stickerSegmentId = generateId();
      const isBase64 = watermarkConfig.imageUrl.startsWith('data:');
      const ext = isBase64 ? (watermarkConfig.imageUrl.match(/^data:image\/(\w+);base64,/)?.[1] || 'png') : 'png';
      const stickerTargetName = `Resources/watermark_logo.${ext}`;
      const stickerAbsPath = `${targetPath}/${stickerTargetName}`.replace(/\\/g, '/');

      mediaFilesToCopy.push({
        source: watermarkConfig.imageUrl,
        isBase64: isBase64,
        targetName: stickerTargetName
      });

      materials.stickers.push({
        id: stickerMaterialId,
        path: stickerAbsPath,
        type: "sticker",
        category_name: "custom",
        category_id: "custom",
        import_time: Math.floor(Date.now() / 1000),
        material_name: `watermark_logo.${ext}`
      });

      watermarkTrack.segments.push({
        id: stickerSegmentId,
        material_id: stickerMaterialId,
        source_timerange: { start: 0, duration: durationMicros },
        target_timerange: { start: 0, duration: durationMicros },
        render_index: 30000,
        clip: {
          scale: { x: scaleVal, y: scaleVal },
          transform: { x: posX, y: posY },
          alpha: alphaVal
        },
        extra_material_refs: [stickerMaterialId]
      });
    } else if (watermarkConfig.type === 'text' && watermarkConfig.text) {
      const textMaterialId = generateId();
      const textSegmentId = generateId();

      materials.texts.push({
        id: textMaterialId,
        type: "text",
        content: JSON.stringify({
          styles: [{
            fill: { alpha: alphaVal, content: { render_type: "solid", solid: { color: [1, 1, 1] } } },
            size: (watermarkConfig.fontSize || 16) * 1.5,
            bold: true,
            shadow: watermarkConfig.textShadow ? { alpha: 0.8, color: [0, 0, 0], distance: 5 } : null
          }],
          text: watermarkConfig.text
        }),
        font_path: "",
        font_category_id: "default",
        font_category_name: "default",
        font_id: "",
        font_name: watermarkConfig.fontFamily || "System",
        font_title: watermarkConfig.fontFamily || "System",
        use_effect_default_color: false
      });

      watermarkTextTrack.segments.push({
        id: textSegmentId,
        material_id: textMaterialId,
        source_timerange: { start: 0, duration: durationMicros },
        target_timerange: { start: 0, duration: durationMicros },
        render_index: 30000,
        clip: {
          scale: { x: 1.0, y: 1.0 },
          transform: { x: posX, y: posY }
        },
        extra_material_refs: [textMaterialId]
      });
    }
  }

  // ── 자막 트랙 생성 (고정밀 srtEntries / srtTrack / Story 세그먼트 / Ddalkkak 기반 음성 완벽 싱크) ──
  const subtitleOption = options.subtitleOption || 'ko';
  if (subtitleOption !== 'none') {
    let resolvedSrtEntries = options.srtEntries || project.srtEntries;
    if (!resolvedSrtEntries || resolvedSrtEntries.length === 0) {
      if (project._ddalkkak?.subtitles?.length > 0) {
        resolvedSrtEntries = project._ddalkkak.subtitles.map(s => {
          const startMs = s.startMs ?? s.start_ms ?? (s.startTime != null ? s.startTime * 1000 : (s.start != null ? s.start * 1000 : 0));
          const endMs = s.endMs ?? s.end_ms ?? (s.endTime != null ? s.endTime * 1000 : (s.end != null ? s.end * 1000 : 0));
          const durMs = s.durationMs ?? s.duration_ms ?? (s.duration != null ? s.duration * 1000 : (endMs - startMs));
          return {
            text: s.text || s.content || '',
            startMs: startMs || 0,
            endMs: endMs || (startMs + durMs),
            durationMs: durMs || 3000,
            track: s.track || 'main'
          };
        });
      } else if (options.srtTrack && options.srtTrack.length > 0) {
        resolvedSrtEntries = srtTrackToEntries(options.srtTrack);
      } else if (project.srtTrack && project.srtTrack.length > 0) {
        resolvedSrtEntries = srtTrackToEntries(project.srtTrack);
      } else {
        const storyEntries = buildStorySrtEntries(scenes);
        if (storyEntries && storyEntries.length > 0) {
          resolvedSrtEntries = storyEntries;
        }
      }
    }

    const baseFontSize = parseFloat(options.subtitleFontSize) || 6.0;
    const fontSize = isPortrait ? baseFontSize * 0.9 : baseFontSize;

    let fontPath = "";
    let fontName = "SystemFont";
    const isWin = typeof process !== 'undefined' ? process.platform === 'win32' : /Win/.test(navigator.userAgent);
    const subCfg = options.subtitleConfig || project.subtitleConfig || {};
    const hexToRgb01 = (hex, defaultRgb = [1.0, 1.0, 1.0]) => {
      if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || hex.length < 7) return defaultRgb;
      const r = parseInt(hex.slice(1, 3), 16) / 255.0 || 0;
      const g = parseInt(hex.slice(3, 5), 16) / 255.0 || 0;
      const b = parseInt(hex.slice(5, 7), 16) / 255.0 || 0;
      return [Number(r.toFixed(3)), Number(g.toFixed(3)), Number(b.toFixed(3))];
    };

    if (subCfg.font) {
      fontName = subCfg.font;
    } else if (isWin) {
      fontPath = "C:/Windows/Fonts/malgun.ttf";
      fontName = "맑은 고딕";
    } else {
      fontPath = "/System/Library/Fonts/AppleSDGothicNeo.ttc";
      fontName = "Apple SD 산돌고딕 Neo";
    }

    const customTextColorRgb = hexToRgb01(subCfg.textColor, [1.0, 1.0, 1.0]);

    const pushSubtitle = (cleanText, startMicros, durationMicros, renderIdx, trackType = 'main') => {
      const textMaterialId = generateId();
      const textSegmentId = generateId();

      let targetTrack = textTrack;
      // marginV를 CapCut 정규화 좌표로 변환 (0-100 → -0.2 ~ +0.2)
      const marginVOffset = subCfg.marginV ? ((subCfg.marginV - 50) / 250) : 0;
      let posY = isPortrait ? -0.65 : -0.75;
      if (subCfg.position === 'top') {
        posY = isPortrait ? 0.75 : 0.65;
      } else if (subCfg.position === 'center' || subCfg.position === 'middle') {
        posY = 0.0;
      }
      posY += marginVOffset;

      let textColor = customTextColorRgb;
      // fontSize를 CapCut 좌표계로 변환 (사용자 설정값을 직접 사용하되, 범위 제한)
      let subFontSize = subCfg.fontSize ? Math.max(4.0, Math.min(12.0, subCfg.fontSize * 0.15)) : fontSize;

      if (trackType === 'situation') {
        targetTrack = situationTrack;
        posY = isPortrait ? -0.15 : -0.25; // 상황설명은 중앙 상단
        textColor = [1.0, 1.0, 1.0]; // 깨끗한 백색
        subFontSize = isPortrait ? fontSize * 0.92 : fontSize;
      } else if (trackType === 'jjapjjap') {
        targetTrack = jjapjjapTrack;
        posY = isPortrait ? -0.65 : -0.75; // 쨉쨉이는 하단 강조
        textColor = customTextColorRgb;
        subFontSize = isPortrait ? fontSize * 1.05 : fontSize;
      }

      // isBold/isItalic 매핑
      const isBold = subCfg.isBold !== undefined ? subCfg.isBold : true;
      const isItalic = subCfg.isItalic || false;

      // textAlign 매핑 (left: 0, center: 1, right: 2)
      let alignment = 1; // 기본값: 중앙
      if (subCfg.textAlign === 'left') alignment = 0;
      else if (subCfg.textAlign === 'right') alignment = 2;

      // outline 매핑
      const outlineSize = subCfg.outlineSize !== undefined ? subCfg.outlineSize : 2;
      const outlineColor = subCfg.outlineColor || '#000000';
      const borderWidth = outlineSize > 0 ? Math.max(0.05, Math.min(0.5, outlineSize * 0.05)) : 0;
      const borderMode = outlineSize > 0 ? 1 : 0; // 0: none, 1: stroke

      // shadow 매핑
      const shadowSize = subCfg.shadowSize !== undefined ? subCfg.shadowSize : 2;
      const shadowColor = subCfg.shadowColor || '#000000';
      const hasShadow = shadowSize > 0;
      const shadowDistance = hasShadow ? Math.max(1, Math.min(10, shadowSize * 1.5)) : 0;

      // box 매핑
      const useBox = subCfg.useBox || false;
      const boxColor = subCfg.boxColor || '#000000';
      const boxOpacity = subCfg.boxOpacity !== undefined ? subCfg.boxOpacity / 100 : 0.5;
      const backgroundStyle = useBox ? 1 : 0;

      materials.texts.push({
        recognize_task_id: "",
        id: textMaterialId,
        name: trackType === 'situation' ? 'Situation' : (trackType === 'jjapjjap' ? 'Reaction' : 'Subtitle'),
        recognize_text: "",
        recognize_model: "",
        punc_model: "",
        type: "subtitle",
        content: JSON.stringify({
          text: cleanText,
          styles: [
            {
              fill: {
                content: {
                  render_type: "solid",
                  solid: {
                    color: textColor
                  }
                }
              },
              size: subFontSize,
              bold: isBold,
              italic: isItalic,
              useLetterColor: true,
              range: [0, cleanText.length]
            }
          ]
        }),
        base_content: "",
        global_alpha: 1.0,
        combo_info: { text_templates: [] },
        caption_template_info: {
          resource_id: "", third_resource_id: "", resource_name: "", category_id: "", category_name: "",
          effect_id: "", request_id: "", path: "", is_new: false, source_platform: 0
        },
        layer_weight: 1,
        letter_spacing: 0.03,
        text_curve: null,
        text_loop_on_path: false,
        offset_on_path: 0,
        enable_path_typesetting: false,
        text_exceeds_path_process_type: 0,
        text_typesetting_paths: null,
        text_typesetting_paths_file: "",
        text_typesetting_path_index: 0,
        line_spacing: 0.05,
        has_shadow: hasShadow,
        shadow_color: shadowColor,
        shadow_alpha: hasShadow ? 0.9 : 0,
        shadow_smoothing: hasShadow ? 0.45 : 0,
        shadow_distance: shadowDistance,
        shadow_point: { x: 0.6363961030678928, y: -0.6363961030678928 },
        shadow_angle: -45,
        shadow_thickness_projection_enable: false,
        shadow_thickness_projection_angle: 0,
        shadow_thickness_projection_distance: 0,
        border_alpha: outlineSize > 0 ? 1.0 : 0,
        border_color: outlineColor,
        border_width: borderWidth,
        border_mode: borderMode,
        style_name: "",
        text_color: `rgb(${Math.round(textColor[0] * 255)}, ${Math.round(textColor[1] * 255)}, ${Math.round(textColor[2] * 255)})`,
        text_alpha: 1.0,
        font_name: fontName,
        font_title: fontName,
        font_size: subFontSize,
        font_path: fontPath,
        font_id: "",
        font_resource_id: "",
        initial_scale: 1.0,
        font_url: "",
        typesetting: 0,
        alignment: alignment,
        line_feed: 1,
        use_effect_default_color: true,
        is_rich_text: false,
        shape_clip_x: false,
        shape_clip_y: false,
        text_size: 30,
        font_category_name: "",
        font_source_platform: 1,
        font_third_resource_id: "",
        font_category_id: "",
        add_type: 0,
        operation_type: 0,
        recognize_type: 0,
        fonts: [],
        background_color: boxColor,
        background_alpha: boxOpacity,
        background_style: backgroundStyle,
        background_round_radius: 0.1,
        background_width: 0.14,
        background_height: 0.14,
        background_vertical_offset: 0,
        background_horizontal_offset: 0,
        background_fill: boxColor,
        single_char_bg_enable: false,
        single_char_bg_color: "",
        single_char_bg_alpha: 1.0,
        single_char_bg_round_radius: 0.3,
        single_char_bg_width: 0,
        single_char_bg_height: 0,
        single_char_bg_vertical_offset: 0,
        single_char_bg_horizontal_offset: 0,
        font_team_id: "",
        tts_auto_update: false,
        text_preset_resource_id: "",
        group_id: `import_${Math.floor(Date.now() / 1000)}`,
        preset_id: "",
        preset_name: "",
        preset_category: "",
        preset_category_id: "",
        preset_index: 0,
        preset_has_set_alignment: false,
        force_apply_line_max_width: false,
        language: "",
        relevance_segment: [],
        original_size: [],
        fixed_width: -1,
        fixed_height: -1,
        line_max_width: 0.82,
        oneline_cutoff: false,
        cutoff_postfix: "",
        subtitle_template_original_fontsize: 0,
        subtitle_keywords: null,
        inner_padding: -1,
        multi_language_current: "none",
        source_from: "",
        is_lyric_effect: false,
        lyric_group_id: "",
        lyrics_template: {
          resource_id: "", resource_name: "", panel: "", effect_id: "", path: "", category_id: "", category_name: "", request_id: ""
        },
        is_batch_replace: false,
        is_words_linear: false,
        ssml_content: "",
        subtitle_keywords_config: null,
        sub_template_id: -1,
        translate_original_text: ""
      });

      targetTrack.segments.push({
        id: textSegmentId,
        source_timerange: null,
        target_timerange: {
          start: startMicros,
          duration: durationMicros
        },
        render_timerange: { start: 0, duration: 0 },
        desc: "",
        state: 0,
        speed: 1,
        is_loop: false,
        is_tone_modify: false,
        reverse: false,
        intensifies_audio: false,
        cartoon: false,
        volume: 1.0,
        last_nonzero_volume: 1.0,
        clip: {
          scale: { x: 1.0, y: 1.0 },
          rotation: 0.0,
          transform: {
            x: 0.0,
            y: posY
          },
          flip: { vertical: false, horizontal: false },
          alpha: 1.0
        },
        uniform_scale: {
          on: true,
          value: 1.0
        },
        material_id: textMaterialId,
        extra_material_refs: [],
        render_index: (trackType === 'situation' ? 13000 : 14000) + renderIdx,
        keyframe_refs: [],
        enable_lut: false,
        enable_adjust: false,
        enable_hsl: false,
        visible: true,
        group_id: "",
        enable_color_curves: true,
        enable_hsl_curves: true,
        track_render_index: 1,
        hdr_settings: null,
        enable_color_wheels: true,
        track_attribute: 0,
        is_placeholder: false,
        template_id: "",
        enable_smart_color_adjust: false,
        template_scene: "default",
        common_keyframes: [],
        caption_info: null,
        responsive_layout: {
          enable: false,
          target_follow: "",
          size_layout: 0,
          horizontal_pos_layout: 0,
          vertical_pos_layout: 0
        },
        enable_color_match_adjust: false,
        enable_color_correct_adjust: false,
        enable_adjust_mask: false,
        raw_segment_id: "",
        lyric_keyframes: null,
        enable_video_mask: true,
        digital_human_template_group_id: "",
        color_correct_alg_result: "",
        source: "segmentsourcenormal",
        enable_mask_stroke: false,
        enable_mask_shadow: false,
        enable_color_adjust_pro: false
      });
    };

    if (resolvedSrtEntries && resolvedSrtEntries.length > 0) {
      console.log(`[CapCut Local Generator] Generating ${resolvedSrtEntries.length} synchronized subtitles from high-precision srtEntries...`);
      for (let sIdx = 0; sIdx < resolvedSrtEntries.length; sIdx++) {
        const entry = resolvedSrtEntries[sIdx];
        const cleanText = (entry.text || '').trim();
        if (!cleanText) continue;

        const startMs = (entry.startMs != null ? entry.startMs : (entry.startTime * 1000)) || 0;
        const endMs = (entry.endMs != null ? entry.endMs : ((entry.endTime * 1000) || (startMs + (entry.durationMs || 3000)))) || 0;
        const durMs = Math.max(200, endMs - startMs);

        pushSubtitle(cleanText, startMs * 1000, durMs * 1000, sIdx, entry.track || 'main');
      }
    } else {
      // 레거시 씬 기반 자막 폴백
      let sCumulativeTime = 0;
      for (let index = 0; index < sortedScenes.length; index++) {
        const scene = sortedScenes[index];
        const sceneDur = scene.image_duration || scene.duration || 3;
        const subtitleText = subtitleOption === 'ko' ? (scene.subtitle_ko || scene.subtitle) : (scene.subtitle_en || scene.subtitle);
        if (subtitleText && subtitleText.trim()) {
          pushSubtitle(subtitleText.trim(), toMicros(sCumulativeTime), toMicros(sceneDur), index);
        }
        sCumulativeTime += sceneDur;
      }
    }
  }

  // Ddalkkak 오디오 패키지 자동 변환
  if ((!audioPackage || !audioPackage.voices?.length) && project._ddalkkak?.audio_path) {
    audioPackage = {
      voices: [{
        character: 'narrator',
        files: [{
          path: project._ddalkkak.audio_path,
          filename: project._ddalkkak.audio_path.split(/[/\\]/).pop() || 'ddalkkak_audio.mp3',
          timecodeMs: 0,
          durationMs: (project._ddalkkak.duration_sec || 0) * 1000 || 5000
        }]
      }]
    };
  }

  // ── 오디오 패키지 (성우 대사, 풀 나레이션, SFX) 타임라인 조립 및 트랙 빌드 ──
  if (audioPackage) {
    console.log('[CapCut Local Generator] Processing audio package for CapCut timelines with Safe Sequential Alignment...');

    // 1. 풀 나레이션 오디오 트랙은 대본 개별 음성과의 중복 및 겹침 혼선을 방지하기 위해 생성하지 않고 개별 성우/나레이터 파일로 단일화합니다.

    // 2. 인물별 성우 대사 (Voices) - 나레이션 통합 및 대사 겹침 발생 시에만 트랙 동적 분화
    let voiceIndex = 0;
    for (const character of (audioPackage.voices || [])) {
      const charName = character.character.toLowerCase();
      
      // 폴더명이나 캐릭터 이름에 'narrator' 혹은 'sophie'가 나레이션일 수도 있으나 기본 'narrator'를 나레이션으로 지정
      const isNarrator = charName.includes('narrator');

      for (const file of character.files) {
        const materialId = generateId();
        const segmentId = generateId();
        const filename = file.filename || `voice_${character.character}.mp3`;
        const ext = filename.split('.').pop() || 'mp3';
        const targetName = `Resources/voice_${character.character}_${materialId}.${ext}`;
        const absoluteTargetFilePath = `${targetPath}/${targetName}`.replace(/\\/g, '/');

        mediaFilesToCopy.push({
          source: file.path,
          isBase64: false,
          targetName: targetName
        });

        // mp3 parser로 읽어온 정확한 재생 시간(durationMs)을 100% 신뢰하여 반영
        const durationMs = file.durationMs || 3000;
        const timecodeMs = file.timecodeMs || 0;

        materials.audios.push({
          id: materialId,
          path: absoluteTargetFilePath,
          type: "extract_music",
          name: filename,
          duration: durationMs * 1000,
          import_time: Math.floor(Date.now() / 1000),
          source_platform: 0,
          category_name: "local",
          category_id: "local",
          material_name: filename,
          app_id: 0,
          is_text_edit_overdub: false,
          is_ugc: false,
          is_ai_clone_tone: false,
          is_ai_clone_tone_post: false,
          music_source: "",
          music_id: "",
          tone_type: "",
          wave_points: [],
          video_id: ""
        });

        const segment = {
          id: segmentId,
          material_id: materialId,
          source_timerange: { start: 0, duration: durationMs * 1000 },
          target_timerange: { start: timecodeMs * 1000, duration: durationMs * 1000 },
          speed: 1.0,
          clip_type: 0,
          is_loop: false,
          is_tone_modify: false,
          render_index: 22000 + voiceIndex,
          volume: 1.0,
          last_nonzero_volume: 1.0,
          extra_material_refs: [materialId]
        };

        if (isNarrator) {
          // 나레이션도 시작 타임코드(timecodeMs)를 절대 억지로 변경하여 밀어내지 않고 원래 값에 자석 고정!
          // 대사 겹침이 감지될 때만 NARRATOR 트랙을 동적으로 늘려 얹어주는 완벽한 안전 충돌 분할
          let assigned = false;
          let trackIdx = 0;
          
          while (!assigned) {
            const currentTrack = getOrCreateNarratorTrack(trackIdx);
            let overlapFound = false;
            for (const existing of currentTrack.segments) {
              if (checkOverlap(existing, segment)) {
                overlapFound = true;
                break;
              }
            }

            if (!overlapFound) {
              segment.render_index = 22000 + voiceIndex;
              currentTrack.segments.push(segment);
              assigned = true;
            } else {
              trackIdx++;
            }
          }
        } else {
          // 일반 성우 캐릭터들은 겹치지 않는 경우 첫 번째 Voice - CHARACTERS 트랙에 모두 병합!
          // 대사들이 재생 상에서 겹칠 때만 두 번째, 세 번째 트랙을 새로 동적 개설하여 안전하게 분할 매핑!
          let assigned = false;
          let trackIdx = 0;
          
          while (!assigned) {
            const currentTrack = getOrCreateCharTrack(trackIdx);
            let overlapFound = false;
            for (const existing of currentTrack.segments) {
              if (checkOverlap(existing, segment)) {
                overlapFound = true;
                break;
              }
            }

            if (!overlapFound) {
              segment.render_index = 22000 + voiceIndex;
              currentTrack.segments.push(segment);
              assigned = true;
            } else {
              trackIdx++; // 겹치면 다음 트랙으로 이동
            }
          }
        }
        voiceIndex++;
      }
    }
    console.log('[CapCut Local Generator] Mapped character voices count:', voiceIndex);

    // 3. 효과음 (SFX) - 평소에는 1개 트랙에 완전 병합, 재생 시점 겹칠 때만 트랙 동적 분화
    let sfxIndex = 0;
    for (const sfxCat of (audioPackage.sfx || [])) {
      for (const file of sfxCat.files) {
        if (file.timecodeMs == null) continue; // 타임코드가 지정되지 않은 이펙트는 배제

        const materialId = generateId();
        const segmentId = generateId();
        const filename = file.filename || `sfx_${sfxCat.category}.mp3`;
        const ext = filename.split('.').pop() || 'mp3';
        const targetName = `Resources/sfx_${sfxCat.category}_${materialId}.${ext}`;
        const absoluteTargetFilePath = `${targetPath}/${targetName}`.replace(/\\/g, '/');

        mediaFilesToCopy.push({
          source: file.path,
          isBase64: false,
          targetName: targetName
        });

        // mp3 parser로 읽어온 정확한 재생 시간(durationMs)을 100% 신뢰하여 반영
        const durationMs = file.durationMs || 3000;
        const timecodeMs = file.timecodeMs;

        materials.audios.push({
          id: materialId,
          path: absoluteTargetFilePath,
          type: "extract_music",
          name: filename,
          duration: durationMs * 1000,
          import_time: Math.floor(Date.now() / 1000),
          source_platform: 0,
          category_name: "local",
          category_id: "local",
          material_name: filename,
          app_id: 0,
          is_text_edit_overdub: false,
          is_ugc: false,
          is_ai_clone_tone: false,
          is_ai_clone_tone_post: false,
          music_source: "",
          music_id: "",
          tone_type: "",
          wave_points: [],
          video_id: ""
        });

        const segment = {
          id: segmentId,
          material_id: materialId,
          source_timerange: { start: 0, duration: durationMs * 1000 },
          target_timerange: { start: timecodeMs * 1000, duration: durationMs * 1000 },
          speed: 1.0,
          clip_type: 0,
          is_loop: false,
          is_tone_modify: false,
          render_index: 25000 + sfxIndex,
          volume: 1.0,
          last_nonzero_volume: 1.0,
          extra_material_refs: [materialId]
        };

        // SFX 겹침 방지 동적 트랙 분산 배치
        let assigned = false;
        let trackIdx = 0;
        
        while (!assigned) {
          const currentTrack = getOrCreateSfxTrack(trackIdx);
          let overlapFound = false;
          for (const existing of currentTrack.segments) {
            if (checkOverlap(existing, segment)) {
              overlapFound = true;
              break;
            }
          }

          if (!overlapFound) {
            segment.render_index = 25000 + sfxIndex;
            currentTrack.segments.push(segment);
            assigned = true;
          } else {
            trackIdx++;
          }
        }
        sfxIndex++;
      }
    }
    console.log('[CapCut Local Generator] Mapped SFX count:', sfxIndex);
  }

  // 전체 프로젝트 재생 시간 (비디오 누적 시간과 모든 오디오 트랙의 끝점 중 최대값으로 안전 산출)
  let totalProjectDurationMicros = toMicros(cumulativeTime);
  const allAudioTracks = [...narratorTracks, ...characterTracks, ...sfxTracksList];
  for (const track of allAudioTracks) {
    for (const seg of (track?.segments || [])) {
      if (seg.target_timerange) {
        const segEnd = seg.target_timerange.start + seg.target_timerange.duration;
        if (segEnd > totalProjectDurationMicros) {
          totalProjectDurationMicros = segEnd;
        }
      }
    }
  }

  // ── 상단 고정 타이틀 트랙 생성 (플레이시간 전체 길이로 상단 배치) ──
  const rawTopTitle = project._ddalkkak?.title || options.topTitle || project.topTitle || null;
  if (rawTopTitle && typeof rawTopTitle === 'string' && rawTopTitle.trim()) {
    const cleanTopTitle = rawTopTitle.trim();
    const titleMaterialId = generateId();
    const titleSegmentId = generateId();
    const titleFontSize = isPortrait ? 7.5 : 6.0;

    let fontPath = "";
    let fontName = "SystemFont";
    const isWin = typeof process !== 'undefined' ? process.platform === 'win32' : /Win/.test(navigator.userAgent);
    if (isWin) {
      fontPath = "C:/Windows/Fonts/malgun.ttf";
      fontName = "맑은 고딕";
    } else {
      fontPath = "/System/Library/Fonts/AppleSDGothicNeo.ttc";
      fontName = "Apple SD 산돌고딕 Neo";
    }

    materials.texts.push({
      recognize_task_id: "",
      id: titleMaterialId,
      name: "TopTitle",
      recognize_text: "",
      recognize_model: "",
      punc_model: "",
      type: "text",
      content: JSON.stringify({
        text: cleanTopTitle,
        styles: [
          {
            fill: {
              content: {
                render_type: "solid",
                solid: {
                  color: [1.0, 1.0, 1.0] // 백색 타이틀 (#ffffff)
                }
              }
            },
            size: titleFontSize,
            bold: true,
            useLetterColor: true,
            range: [0, cleanTopTitle.length]
          }
        ]
      }),
      base_content: "",
      global_alpha: 1.0,
      combo_info: { text_templates: [] },
      caption_template_info: {
        resource_id: "", third_resource_id: "", resource_name: "", category_id: "", category_name: "",
        effect_id: "", request_id: "", path: "", is_new: false, source_platform: 0
      },
      layer_weight: 1,
      letter_spacing: 0.04,
      text_curve: null,
      text_loop_on_path: false,
      offset_on_path: 0,
      enable_path_typesetting: false,
      text_exceeds_path_process_type: 0,
      text_typesetting_paths: null,
      text_typesetting_paths_file: "",
      text_typesetting_path_index: 0,
      line_spacing: 0.08,
      has_shadow: true,
      shadow_color: "#000000",
      shadow_alpha: 0.8999999761581421,
      shadow_smoothing: 0.45000001788139343,
      shadow_distance: 5,
      shadow_point: { x: 0.6363961030678928, y: -0.6363961030678928 },
      shadow_angle: -45,
      shadow_thickness_projection_enable: false,
      shadow_thickness_projection_angle: 0,
      shadow_thickness_projection_distance: 0,
      border_alpha: 1.0,
      border_color: "#000000",
      border_width: 0.08,
      border_mode: 0,
      style_name: "",
      text_color: "#ffffff",
      text_alpha: 1.0,
      font_name: fontName,
      font_title: fontName,
      font_size: titleFontSize,
      font_path: fontPath,
      font_id: "",
      font_resource_id: "",
      initial_scale: 1.0,
      font_url: "",
      typesetting: 0,
      alignment: 1,
      line_feed: 1,
      use_effect_default_color: true,
      is_rich_text: false,
      shape_clip_x: false,
      shape_clip_y: false,
      text_size: 36,
      font_category_name: "",
      font_source_platform: 1,
      font_third_resource_id: "",
      font_category_id: "",
      add_type: 0,
      operation_type: 0,
      recognize_type: 0,
      fonts: [],
      background_color: "#111827",
      background_alpha: 0.75, // 고급스러운 반투명 블랙 라운드 배경바
      background_style: 1,
      background_round_radius: 0.2,
      background_width: 0.25,
      background_height: 0.2,
      background_vertical_offset: 0,
      background_horizontal_offset: 0,
      background_fill: "",
      single_char_bg_enable: false,
      single_char_bg_color: "",
      single_char_bg_alpha: 1.0,
      single_char_bg_round_radius: 0.3,
      single_char_bg_width: 0,
      single_char_bg_height: 0,
      single_char_bg_vertical_offset: 0,
      single_char_bg_horizontal_offset: 0,
      font_team_id: "",
      tts_auto_update: false,
      text_preset_resource_id: "",
      group_id: `import_${Math.floor(Date.now() / 1000)}`,
      preset_id: "",
      preset_name: "",
      preset_category: "",
      preset_category_id: "",
      preset_index: 0,
      preset_has_set_alignment: false,
      force_apply_line_max_width: false,
      language: "",
      relevance_segment: [],
      original_size: [],
      fixed_width: -1,
      fixed_height: -1,
      line_max_width: 0.88,
      oneline_cutoff: false,
      cutoff_postfix: "",
      subtitle_template_original_fontsize: 0,
      subtitle_keywords: null,
      inner_padding: -1,
      multi_language_current: "none",
      source_from: "",
      is_lyric_effect: false,
      lyric_group_id: "",
      lyrics_template: {
        resource_id: "", resource_name: "", panel: "", effect_id: "", path: "", category_id: "", category_name: "", request_id: ""
      },
      is_batch_replace: false,
      is_words_linear: false,
      ssml_content: "",
      subtitle_keywords_config: null,
      sub_template_id: -1,
      translate_original_text: ""
    });

    topTitleTrack.segments.push({
      id: titleSegmentId,
      source_timerange: null,
      target_timerange: {
        start: 0,
        duration: totalProjectDurationMicros
      },
      render_timerange: { start: 0, duration: 0 },
      desc: "",
      state: 0,
      speed: 1,
      is_loop: false,
      is_tone_modify: false,
      reverse: false,
      intensifies_audio: false,
      cartoon: false,
      volume: 1.0,
      last_nonzero_volume: 1.0,
      clip: {
        scale: { x: 1.0, y: 1.0 },
        rotation: 0.0,
        transform: {
          x: 0.0,
          y: isPortrait ? 0.72 : 0.78 // 화면 최상단 고정 배치 (+0.72 ~ +0.78)
        },
        flip: { vertical: false, horizontal: false },
        alpha: 1.0
      },
      uniform_scale: { on: true, value: 1.0 },
      material_id: titleMaterialId,
      extra_material_refs: [],
      render_index: 15000,
      keyframe_refs: [],
      enable_lut: false,
      enable_adjust: false,
      enable_hsl: false,
      visible: true,
      group_id: "",
      enable_color_curves: true,
      enable_hsl_curves: true,
      track_render_index: 2,
      hdr_settings: null,
      enable_color_wheels: true,
      track_attribute: 0,
      is_placeholder: false,
      template_id: "",
      enable_smart_color_adjust: false,
      template_scene: "default",
      common_keyframes: [],
      caption_info: null,
      responsive_layout: { enable: false, target_follow: "", size_layout: 0, horizontal_pos_layout: 0, vertical_pos_layout: 0 },
      enable_color_match_adjust: false,
      enable_color_correct_adjust: false,
      enable_adjust_mask: false,
      raw_segment_id: "",
      lyric_keyframes: null,
      enable_video_mask: true,
      digital_human_template_group_id: "",
      color_correct_alg_result: "",
      source: "segmentsourcenormal",
      enable_mask_stroke: false,
      enable_mask_shadow: false,
      enable_color_adjust_pro: false
    });
  }

  const draftContent = {
    id: projectId,
    version: 360000,
    new_version: "167.0.0",
    name: "",
    duration: totalProjectDurationMicros,
    create_time: 0,
    update_time: 0,
    fps: 30.0,
    is_drop_frame_timecode: false,
    color_space: -1,
    config: {
      video_mute: false,
      record_audio_last_index: 1,
      extract_audio_last_index: 1,
      original_sound_last_index: 1,
      subtitle_recognition_id: "",
      subtitle_taskinfo: [],
      lyrics_recognition_id: "",
      lyrics_taskinfo: [],
      subtitle_sync: true,
      lyrics_sync: true,
      voice_change_sync: false,
      sticker_max_index: 1,
      adjust_max_index: 1,
      material_save_mode: 0,
      export_range: null,
      maintrack_adsorb: true,
      combination_max_index: 1,
      attachment_info: [],
      zoom_info_params: null,
      system_font_list: [],
      multi_language_mode: "none",
      multi_language_main: "none",
      multi_language_current: "none",
      multi_language_list: [],
      subtitle_keywords_config: null,
      use_float_render: false
    },
    canvas_config: {
      ratio: canvasRatio === '9:16' ? '9:16' : (canvasRatio === '16:9' ? '16:9' : 'original'),
      width: canvasWidth,
      height: canvasHeight,
      background: null
    },
    tracks: [
      // CapCut 트랙 순서: 인덱스가 작을수록 하단 (z-order: 낮음)
      // 비디오 → 오버레이 → 워터마크 → 텍스트(자막=최상단)
      videoTrack.segments.length > 0 ? videoTrack : null,
      overlayTrack.segments.length > 0 ? overlayTrack : null,
      watermarkTrack.segments.length > 0 ? watermarkTrack : null,
      watermarkTextTrack.segments.length > 0 ? watermarkTextTrack : null,
      topTitleTrack.segments.length > 0 ? topTitleTrack : null,
      situationTrack.segments.length > 0 ? situationTrack : null,
      jjapjjapTrack.segments.length > 0 ? jjapjjapTrack : null,
      textTrack.segments.length > 0 ? textTrack : null,
      // 1순위 오디오: 나레이션 전용 트랙들 (겹치지 않으면 1개만 노출)
      ...narratorTracks.filter(t => t.segments.length > 0),
      // 2순위 오디오: 일반 캐릭터들의 동적 분할 트랙들
      ...characterTracks.filter(t => t.segments.length > 0),
      // 3순위 오디오: 효과음들의 동적 분할 트랙들
      ...sfxTracksList.filter(t => t.segments.length > 0)
    ].filter(Boolean),
    group_container: null,
    materials: materials,
    keyframes: {
      videos: globalVideoKeyframes,
      audios: [],
      texts: [],
      stickers: [],
      filters: [],
      adjusts: [],
      handwrites: [],
      effects: []
    },
    keyframe_graph_list: [],
    platform: {
      os: "windows",
      os_version: "10.0.26200",
      app_id: 359289,
      app_version: "8.5.0",
      app_source: "cc",
      device_id: "1ff0978a9f844b91c7edbe6fa21a1b43",
      hard_disk_id: "",
      mac_address: "172ce154d044e20c675046a2a34d03a6,7707ff6986fb6a5748578eac985b13f5"
    },
    last_modified_platform: {
      os: "windows",
      os_version: "10.0.26200",
      app_id: 359289,
      app_version: "8.5.0",
      app_source: "cc",
      device_id: "1ff0978a9f844b91c7edbe6fa21a1b43",
      hard_disk_id: "",
      mac_address: "172ce154d044e20c675046a2a34d03a6"
    },
    mutable_config: null,
    cover: null,
    retouch_cover: null,
    extra_info: null,
    relationships: [],
    render_index_track_mode_on: true,
    free_render_index_mode_on: false,
    static_cover_image_path: "",
    source: "default",
    time_marks: null,
    path: "",
    lyrics_effects: [],
    uneven_animation_template_info: {
      composition: "",
      content: "",
      order: "",
      sub_template_info_list: []
    },
    draft_type: "video",
    smart_ads_info: {
      page_from: "",
      routine: "",
      draft_url: ""
    },
    function_assistant_info: {
      smart_rec_applied: false,
      fixed_rec_applied: false,
      auto_adjust: false,
      auto_adjust_segid_list: [],
      color_correction: false,
      color_correction_segid_list: [],
      enhance_quality: false,
      smooth_slow_motion: false,
      deflicker_segid_list: [],
      video_noise_segid_list: [],
      enhance_quality_segid_list: [],
      smart_segid_list: [],
      retouch: false,
      retouch_segid_list: [],
      enhande_voice: false,
      enhance_voice_segid_list: [],
      audio_noise_segid_list: [],
      auto_caption: false,
      auto_caption_segid_list: [],
      auto_caption_template_id: "",
      caption_opt: false,
      caption_opt_segid_list: [],
      eye_correction: false,
      eye_correction_segid_list: [],
      normalize_loudness: false,
      normalize_loudness_segid_list: [],
      normalize_loudness_audio_denoise_segid_list: [],
      auto_adjust_fixed: false,
      auto_adjust_fixed_value: 50.0,
      color_correction_fixed: false,
      color_correction_fixed_value: 50.0,
      normalize_loudness_fixed: false,
      enhande_voice_fixed: false,
      retouch_fixed: false,
      enhance_quality_fixed: false,
      smooth_slow_motion_fixed: false,
      fps: {
        num: 0,
        den: 1
      }
    }
  };

  // Derive precise paths
  const posixPath = targetPath.replace(/\\/g, '/');
  const pathParts = posixPath.split('/');
  const draftFoldPath = posixPath;
  const draftRootPath = pathParts.slice(0, -1).join('/');

  // Precise INI formatted settings file
  const draftSettingsINI = `[General]
draft_create_time=${Math.floor(Date.now() / 1000)}
draft_last_edit_time=${Math.floor(Date.now() / 1000)}
real_edit_seconds=0
real_edit_keys=0
cloud_last_modify_platform=windows
`;

  // Meticulous draft_meta_info.json configuration matching exact properties of standard working project
  const draftMetaInfo = {
    cloud_draft_cover: false,
    cloud_draft_sync: false,
    cloud_package_completed_time: "",
    draft_cloud_capcut_purchase_info: "",
    draft_cloud_last_action_download: false,
    draft_cloud_package_type: "",
    draft_cloud_purchase_info: "",
    draft_cloud_template_id: "",
    draft_cloud_tutorial_info: "",
    draft_cloud_videocut_purchase_info: "",
    draft_cover: "draft_cover.jpg",
    draft_deeplink_url: "",
    draft_enterprise_info: {
      draft_enterprise_extra: "",
      draft_enterprise_id: "",
      draft_enterprise_name: "",
      enterprise_material: []
    },
    draft_fold_path: draftFoldPath,
    draft_id: projectId,
    draft_is_ae_produce: false,
    draft_is_ai_packaging_used: false,
    draft_is_ai_shorts: false,
    draft_is_ai_translate: false,
    draft_is_article_video_draft: false,
    draft_is_cloud_temp_draft: false,
    draft_is_from_deeplink: "false",
    draft_is_invisible: false,
    draft_is_web_article_video: false,
    draft_materials: [
      {
        type: 0,
        value: materials.videos.map((v, idx) => ({
          ai_group_type: "",
          create_time: 0,
          duration: v.duration,
          enter_from: 0,
          extra_info: v.material_name,
          file_Path: v.path,
          height: v.height,
          id: v.id,
          import_time: v.import_time,
          import_time_ms: -1,
          item_source: 1,
          md5: "",
          metetype: "photo",
          roughcut_time_range: {
            duration: v.duration,
            start: 0
          },
          sub_time_range: {
            duration: -1,
            start: -1
          },
          type: 0,
          width: v.width
        }))
      },
      {
        type: 1,
        value: materials.audios.map((a) => ({
          ai_group_type: "",
          create_time: 0,
          duration: a.duration,
          enter_from: 0,
          extra_info: a.material_name,
          file_Path: a.path,
          height: 0,
          id: a.id,
          import_time: a.import_time,
          import_time_ms: -1,
          item_source: 1,
          md5: "",
          metetype: "extract_music",
          roughcut_time_range: {
            duration: a.duration,
            start: 0
          },
          sub_time_range: {
            duration: -1,
            start: -1
          },
          type: 1,
          width: 0
        }))
      },
      {
        type: 2,
        value: materials.texts.map((t) => ({
          ai_group_type: "",
          create_time: 0,
          duration: 0,
          enter_from: 0,
          extra_info: "",
          file_Path: "",
          height: 0,
          id: t.id,
          import_time: Math.floor(Date.now() / 1000),
          import_time_ms: -1,
          item_source: 0,
          md5: "",
          metetype: "text",
          roughcut_time_range: {
            duration: -1,
            start: -1
          },
          sub_time_range: {
            duration: -1,
            start: -1
          },
          type: 2,
          width: 0
        }))
      },
      { type: 3, value: [] },
      { type: 6, value: [] },
      { type: 7, value: [] },
      { type: 8, value: [] }
    ], 
    draft_materials_copied_info: [],
    draft_name: options.projectName || 'ViraLoop_Project',
    draft_need_rename_folder: false,
    draft_new_version: "",
    draft_removable_storage_device: "",
    draft_root_path: draftRootPath,
    draft_segment_extra_info: [],
    draft_timeline_materials_size_: 100000, // Non-zero mock size
    draft_type: "",
    draft_web_article_video_enter_from: "",
    tm_draft_cloud_completed: "",
    tm_draft_cloud_entry_id: -1,
    tm_draft_cloud_modified: 0,
    tm_draft_cloud_parent_entry_id: -1,
    tm_draft_cloud_space_id: -1,
    tm_draft_cloud_user_id: -1,
    tm_draft_create: Date.now() * 1000,
    tm_draft_modified: Date.now() * 1000,
    tm_draft_removed: 0,
    tm_duration: totalProjectDurationMicros
  };

  const timelineLayout = {
    dockItems: [
      {
        dockIndex: 0,
        ratio: 1,
        timelineIds: [projectId],
        timelineNames: ["타임라인 01"]
      }
    ],
    layoutOrientation: 1
  };

  return {
    draftContent,
    draftMetaInfo,
    timelineLayout,
    mediaFiles: mediaFilesToCopy,
    extraFiles: {
      'draft_settings': draftSettingsINI,
      'draft_biz_config.json': "", // 0-byte completely empty file
      'draft_agency_config.json': {
        "is_auto_agency_enabled": false,
        "is_auto_agency_popup": false,
        "is_single_agency_mode": false,
        "marterials": null,
        "use_converter": false,
        "video_resolution": 720
      },
      'draft_content.json.bak': draftContent,
      'draft_virtual_store.json': {
        "draft_materials": [],
        "draft_virtual_store": [
          { "type": 0, "value": [] },
          { "type": 1, "value": [] },
          { "type": 2, "value": [] }
        ]
      },
      'attachment_pc_common.json': {
        "ai_packaging_infos": [],
        "ai_packaging_report_info": {
          "caption_id_list": [],
          "commercial_material": "",
          "material_source": "",
          "method": "",
          "page_from": "",
          "style": "",
          "task_id": "",
          "text_style": "",
          "tos_id": "",
          "video_category": ""
        },
        "broll": {
          "ai_packaging_infos": [],
          "ai_packaging_report_info": {
            "caption_id_list": [],
            "commercial_material": "",
            "material_source": "",
            "method": "",
            "page_from": "",
            "style": "",
            "task_id": "",
            "text_style": "",
            "tos_id": "",
            "video_category": ""
          }
        },
        "commercial_music_category_ids": [],
        "pc_feature_flag": 0,
        "recognize_tasks": [],
        "reference_lines_config": {
          "horizontal_lines": [],
          "is_lock": false,
          "is_visible": false,
          "vertical_lines": []
        },
        "safe_area_type": 0,
        "template_item_infos": [],
        "unlock_template_ids": []
      },
      'performance_opt_info.json': {
        "manual_cancle_precombine_segs": null,
        "need_auto_precombine_segs": null
      },
      'attachment_editing.json': { "attachment_info": [] },
      'template-2.tmp': draftContent
    }
  };
}
