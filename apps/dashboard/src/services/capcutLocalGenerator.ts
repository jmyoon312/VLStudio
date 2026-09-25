/**
 * CapCut Local Generator Service for Sovereign Presets
 * Single Source of Truth for converting 3-Tier Sovereign Presets & Blueprint v2
 * into CapCut PC Drafts (com.lveditor.draft) with 100% Visual Fidelity.
 */

import {
  exportCapCutFullProject,
  CapCutProjectExportOptions,
  CapCutSubtitleExportItem,
  CapCutAudioExportItem
} from './capcutFullProjectExporter';
import { SovereignPreset } from '@/components/presets/PresetLibraryModal';

export interface GenerateCapCutDraftOptions {
  preset: SovereignPreset | any;
  projectName?: string;
  videoPath?: string;
  videoDurationMs?: number;
  audioPath?: string;
  cues?: Array<{
    start_ms: number;
    end_ms: number;
    text: string;
    highlights?: Array<{ word: string; color: string }>;
  }>;
}

export function buildCapCutOptionsFromPreset(opts: GenerateCapCutDraftOptions): CapCutProjectExportOptions {
  const { preset, projectName, videoPath, videoDurationMs = 20000, audioPath, cues = [] } = opts;

  // Extract visual geometry & blueprint v2 fields
  const style = preset.style || preset;
  const vg = style.visual_geometry || preset.visual_geometry || {};
  const containerType = vg.container_type || 'letterbox_sandwich';
  const topLines = vg.top_header_lines || [];
  const floatingCapsule = vg.floating_capsule || {};
  const subTape = vg.sub_tape_label || {};
  const twoTone = vg.two_tone_caption || {};
  const topBar = vg.top_bar || {};
  const topSource = vg.top_source || '';

  // 1. Top Title Setup
  const isNoneContainer = containerType === 'none';
  const isFloatingCapsule = containerType === 'floating_capsule';

  const line1Text = topLines[0]?.text || preset.name || '쇼츠 대제목';
  const line1Color = topLines[0]?.color || '#FFE500';
  const line2Text = topLines[1]?.text || '';
  const line2Color = topLines[1]?.color || '#FFFFFF';

  const topTitle = {
    enabled: !isNoneContainer && Boolean(line1Text),
    line1: line1Text,
    line2: line2Text,
    mode: (line2Text ? 'double' : 'single') as 'single' | 'double',
    line1Color: line1Color,
    line2Color: line2Color,
    fontSize: isFloatingCapsule ? 34 : 36,
    fontFamily: 'Pretendard',
    yPct: isFloatingCapsule ? (floatingCapsule.top_y_pct || 10.0) : (topBar.height_pct ? topBar.height_pct * 0.55 : 12.0),
    hasBg: isFloatingCapsule,
    bgColor: floatingCapsule.bg_color || '#000000',
    borderRadius: floatingCapsule.border_radius_px || 24,
  };

  // 2. Sub Tape Label (Sticker)
  const subTapeLabel = {
    enabled: Boolean(subTape.enabled && subTape.text),
    text: subTape.text || '',
    emoji: subTape.emoji || '',
    bgColor: subTape.bg_color || '#FDE68A',
    textColor: subTape.text_color || '#1E293B',
    fontSize: 22,
    yPct: subTape.top_y_pct || 19.5,
    rotationDeg: subTape.tilt_deg || 0,
  };

  // 3. Subtitles with Two-tone Highlight mapping
  const subtitles: CapCutSubtitleExportItem[] = cues.map((cue, idx) => {
    const cueText = cue.text || '';
    const highlights = [...(cue.highlights || [])];

    // Auto-detect two-tone keyword highlight if configured
    if (twoTone.enabled && twoTone.highlight_text && !highlights.length) {
      if (cueText.includes(twoTone.highlight_text)) {
        highlights.push({
          word: twoTone.highlight_text,
          color: twoTone.highlight_color || '#FFE500',
        });
      }
    }

    return {
      id: `cue_${idx + 1}`,
      text: cueText,
      startMs: cue.start_ms,
      endMs: cue.end_ms,
      fontSize: 28,
      textColor: twoTone.base_color || '#FFFFFF',
      fontFamily: twoTone.font_family || 'Pretendard',
      outlineSize: twoTone.outline_px || 6,
      outlineColor: twoTone.outline_color || '#000000',
      xPct: 50,
      yPct: twoTone.safe_zone_y || (100 - (twoTone.margin_v_pct || 31.0)),
      highlights: highlights.length > 0 ? highlights : undefined,
    };
  });

  // 4. Source Credit
  const source = topSource ? {
    enabled: true,
    text: topSource,
    fontSize: 16,
    color: '#CBD5E1',
    xPct: 82,
    yPct: 4,
  } : undefined;

  // 5. Audio Tracks
  const audios: CapCutAudioExportItem[] = [];
  if (audioPath) {
    audios.push({
      id: 'audio_narration',
      name: 'TTS_Narration',
      path: audioPath,
      type: 'narration',
      startMs: 0,
      durationMs: videoDurationMs,
      volume: 1.0,
    });
  }

  return {
    projectName: projectName || preset.name || 'ViraLoop_Preset_Shorts',
    aspectRatio: '9:16',
    durationMs: videoDurationMs,
    video: {
      path: videoPath,
      durationMs: videoDurationMs,
      scale: isFloatingCapsule ? 100 : 100,
    },
    topTitle,
    subTapeLabel,
    subtitles,
    source,
    audios,
  };
}

/**
 * Generates and opens a full CapCut PC draft from a Sovereign Preset
 */
export async function generateCapCutDraftFromSovereignPreset(opts: GenerateCapCutDraftOptions) {
  const capcutOptions = buildCapCutOptionsFromPreset(opts);
  return await exportCapCutFullProject(capcutOptions);
}
