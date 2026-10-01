import { z } from "zod";

/**
 * [VLStandardBlueprint v4.0 정밀 데이터 명세 및 인터페이스 계약]
 * Single Source of Truth (SSOT) schema for all presets, editors, and video renderers.
 * Conforms to VL-ARCH-V4-002 specification.
 */

// ── 1. 기하학 & 변형 (Geometry & Transform) ──
export const TransformSchema = z.object({
  x: z.number().describe("기준 해상도 1080 X좌표"),
  y: z.number().describe("기준 해상도 1920 Y좌표"),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().default(0).describe("회전 각도 (-180 ~ 180)"),
  scale: z.number().default(1.0),
  origin: z.enum(["center", "top_left", "bottom_center"]).default("center"),
  zIndex: z.number().int().default(0),
});

// ── 2. 키네틱 단어별 자막 (Kinetic Karaoke Word) ──
export const KineticSubtitleWordSchema = z.object({
  word: z.string(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  highlightColor: z.string().optional().default("#FFE600"),
  scaleEffect: z.enum(["none", "pop", "bounce", "shake"]).default("pop"),
});

// ── 3. 동적 감정 이모지 슬롯 ──
export const EmotionEmojiSlotSchema = z.object({
  enabled: z.boolean().default(true),
  position: z.enum(["inline_end", "floating_top", "floating_left"]).default("inline_end"),
  gap: z.number().default(12),
  scaleRatio: z.number().default(1.2),
  animation: z.enum(["none", "pop_bounce", "shake", "fade_scale", "heart_pulse"]).default("pop_bounce"),
  fallbackEmoji: z.string().default("🔥"),
  injectedEmoji: z.string().optional(),
});

// ── 4. 시각 레이어 공통 베이스 ──
export const BaseLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  locked: z.boolean().default(false),
  hidden: z.boolean().default(false),
  transform: TransformSchema,
  inMs: z.number().int().nonnegative().default(0),
  outMs: z.number().int().nonnegative().nullable().default(null),
  opacity: z.number().min(0).max(1).default(1.0),
});

// 텍스트 레이어
export const TextLayerSchema = BaseLayerSchema.extend({
  kind: z.literal("text"),
  textRole: z.enum(["title_header", "subtitle_narrative", "hook_punch", "badge", "author_meta", "source_credit"]),
  content: z.string().default(""),
  fontFamily: z.string().default("NotoSansKR-Bold"),
  fontSize: z.number().default(52),
  fontColor: z.string().default("#FFFFFF"),
  letterSpacing: z.number().default(-1),
  lineHeight: z.number().default(1.3),
  textAlign: z.enum(["left", "center", "right"]).default("center"),
  stroke: z.object({ color: z.string(), width: z.number() }).optional(),
  shadow: z.object({ color: z.string(), blur: z.number(), offsetX: z.number(), offsetY: z.number() }).optional(),
  backgroundColor: z.string().optional(),
  borderRadius: z.number().default(0),
  padding: z.tuple([z.number(), z.number(), z.number(), z.number()]).default([0, 0, 0, 0]),
  emojiSlot: EmotionEmojiSlotSchema.optional(),
  accumulateMode: z.boolean().default(false).describe("썰형 자막 순차 누적 모드"),
});

// 미디어 레이어
export const MediaLayerSchema = BaseLayerSchema.extend({
  kind: z.literal("media"),
  mediaRole: z.enum(["main_background", "frame_cutout", "b_roll", "reaction_meme", "comment_avatar"]),
  assetId: z.string().default("sample1"),
  assetUrl: z.string().optional(),
  fit: z.enum(["cover", "contain", "fill", "sandwich"]).default("cover"),
  focus: z.tuple([z.number(), z.number()]).default([0.5, 0.5]),
  motion: z.object({
    type: z.enum(["none", "zoom_in", "zoom_out", "pan_left", "pan_right", "ken_burns"]).default("none"),
    strength: z.number().default(0.1),
    durationMs: z.number().default(3000),
  }).default({ type: "none", strength: 0.1, durationMs: 3000 }),
  clipFromMs: z.number().default(0),
});

// 도형/마스크 레이어
export const ShapeLayerSchema = BaseLayerSchema.extend({
  kind: z.literal("shape"),
  shapeRole: z.enum(["hook_band", "urgent_banner", "comment_card", "divider", "dimmed_overlay", "hole_mask"]),
  fillColor: z.string().default("#000000"),
  borderRadius: z.number().default(0),
  borderColor: z.string().optional(),
  borderWidth: z.number().default(0),
});

export const LayerObjectSchema = z.discriminatedUnion("kind", [
  TextLayerSchema,
  MediaLayerSchema,
  ShapeLayerSchema,
]);

// ── 5. 트랜지션 & SFX 자동 페어링 ──
export const TransitionWithSFXSchema = z.object({
  type: z.enum(["cut", "whip_pan", "zoom_cut", "glitch", "dip_black"]).default("cut"),
  durationMs: z.number().default(300),
  sfxAssetId: z.string().optional().describe("스우시/타격음 효과음 ID"),
});

// ── 6. 씬(Scene) 계층화 모델 ──
export const SceneDefinitionSchema = z.object({
  sceneId: z.string(),
  order: z.number().int().nonnegative(),
  role: z.enum(["0s_hook", "setup", "escalation", "climax_reversal", "ending_cta"]),
  targetDurationMs: z.number().int().positive(),
  actualDurationMs: z.number().int().positive().optional(),
  scriptText: z.string(),
  keywords: z.array(z.string()).default([]),
  visualPrompt: z.string().optional(),
  mediaAssetId: z.string().optional(),
  mediaUrl: z.string().optional(),
  motion: z.object({
    type: z.enum(["none", "zoom_in", "zoom_out", "pan_left", "pan_right", "ken_burns"]).default("zoom_in"),
    strength: z.number().default(0.12),
  }).default({ type: "zoom_in", strength: 0.12 }),
  words: z.array(KineticSubtitleWordSchema).default([]),
  transitionOut: TransitionWithSFXSchema.optional(),
});

// ── 7. 방송급 오디오 덕킹 엔벨로프 ──
export const DuckingEnvelopeSchema = z.object({
  targetDuckingDb: z.number().default(-24.0),
  attackMs: z.number().default(150).describe("목소리 시작 시 BGM 감쇄 속도"),
  holdMs: z.number().default(150).describe("발화 종료 후 BGM 감쇄 유지 시간"),
  releaseMs: z.number().default(300).describe("원래 BGM 음량으로 복귀 속도"),
});

// ── 8. 오디오 DSP 및 사운드 스펙 ──
export const AudioDSPSchema = z.object({
  voiceSignature: z.object({
    engine: z.enum(["gemini_tts", "supertone", "elevenlabs", "system"]).default("gemini_tts"),
    role: z.string().default("감동 실화 & 눈물 명작 영화 해설가"),
    voiceId: z.string().default("Kore"),
    targetWpm: z.number().default(340),
    pitchF0: z.number().default(1.0),
    volumeDb: z.number().default(-3.0),
    silenceCutThresholdSec: z.number().default(0.15),
  }).default({
    engine: "gemini_tts",
    role: "감동 실화 & 눈물 명작 영화 해설가",
    voiceId: "Kore",
    targetWpm: 340,
    pitchF0: 1.0,
    volumeDb: -3.0,
    silenceCutThresholdSec: 0.15,
  }),
  bgmSignature: z.object({
    trackPath: z.string().nullable().default(null),
    genre: z.string().default("Acoustic & Cinematic"),
    mood: z.string().default("서정적이고 몰입감 높은 무드"),
    volumeDb: z.number().default(-18.0),
  }).default({
    trackPath: null,
    genre: "Acoustic & Cinematic",
    mood: "서정적이고 몰입감 높은 무드",
    volumeDb: -18.0,
  }),
  duckingEnvelope: DuckingEnvelopeSchema.default({
    targetDuckingDb: -24.0,
    attackMs: 150,
    holdMs: 150,
    releaseMs: 300,
  }),
  sfxTimeline: z.array(z.object({
    id: z.string(),
    trackRole: z.string(),
    assetPath: z.string(),
    startMs: z.number(),
    durationMs: z.number(),
    volumeDb: z.number().default(-6.0),
  })).default([]),
});

// ── 9. OpenMontage Backlot 감사 메타데이터 ──
export const BacklotAuditMetaSchema = z.object({
  auditStatus: z.enum(["pending", "passed", "flagged", "rejected"]).default("pending"),
  hookScore: z.number().min(0).max(100).default(0),
  wpmCadence: z.number().default(0),
  silenceCutCount: z.number().default(0),
  criticNotes: z.array(z.string()).default([]),
});

// ── 10. 창의적 킬러 피처 스펙 (Creative Innovation Specs) ──
export const AutoFramingSchema = z.object({
  enabled: z.boolean().default(false),
  trackingTarget: z.enum(["face", "action", "center_mass"]).default("face"),
  smoothingFactor: z.number().default(0.8),
  safeZoneMargin: z.number().default(0.1),
});

export const DopamineJabSchema = z.object({
  timestampMs: z.number().int().nonnegative(),
  type: z.enum(["quick_zoom", "micro_glitch", "camera_shake", "meme_flash"]).default("quick_zoom"),
  durationMs: z.number().default(150),
  sfxAssetId: z.string().default("sfx_punch_01"),
});

export const AudioReactiveGlowSchema = z.object({
  enabled: z.boolean().default(true),
  peakThresholdDb: z.number().default(-12.0),
  glowColor: z.string().default("#00FFCC"),
  maxScaleBoost: z.number().default(1.2),
});

export const BeatSyncTimelineSchema = z.object({
  enabled: z.boolean().default(false),
  bpm: z.number().default(120),
  beatPointsMs: z.array(z.number()).default([]),
  snapToleranceMs: z.number().default(80),
});

// ── ★ [VLStandardBlueprint v4.0 단일 마스터 표준] ──
export const VLStandardBlueprintV4Schema = z.object({
  schemaVersion: z.literal("viraloop-blueprint/v4.0").default("viraloop-blueprint/v4.0"),
  blueprintId: z.string(),
  name: z.string().min(1).max(60),
  category: z.string().default("custom"),
  archetype: z.enum(["ssul", "gunlimbo", "instagram", "classic", "bespoke"]),
  channelRef: z.string().optional(),
  tags: z.array(z.string()).default([]),
  thumbnailUrl: z.string().optional(),

  canvas: z.object({
    width: z.number().default(1080),
    height: z.number().default(1920),
    aspectRatio: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
    fps: z.union([z.literal("30"), z.literal("60"), z.number()]).default("30"),
    backgroundColor: z.string().default("#000000"),
    safeZones: z.object({
      topGuardHeight: z.number().default(180),
      bottomGuardHeight: z.number().default(240),
      rightGuardWidth: z.number().default(120),
    }).default({
      topGuardHeight: 180,
      bottomGuardHeight: 240,
      rightGuardWidth: 120,
    }),
  }).default({
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    fps: "30",
    backgroundColor: "#000000",
    safeZones: {
      topGuardHeight: 180,
      bottomGuardHeight: 240,
      rightGuardWidth: 120,
    },
  }),

  globalLayers: z.array(LayerObjectSchema).default([]).describe("영상 전체 지속 레이어 (헤더/워터마크)"),
  scenes: z.array(SceneDefinitionSchema).default([]).describe("시간축 씬 및 컷 시퀀스"),
  audioDSP: AudioDSPSchema.default({}),
  productionBible: z.record(z.any()).default({}),
  generativeSlots: z.array(z.record(z.any())).default([]),
  samplePreview: z.record(z.any()).default({}),
  backlotAudit: BacklotAuditMetaSchema.default({
    auditStatus: "pending",
    hookScore: 0,
    wpmCadence: 0,
    silenceCutCount: 0,
    criticNotes: [],
  }),

  // 🌟 창의적 킬러 기능 슬롯 (Professional Planner & Senior Dev)
  creativeInnovations: z.object({
    autoFraming: AutoFramingSchema.default({ enabled: false, trackingTarget: "face", smoothingFactor: 0.8, safeZoneMargin: 0.1 }),
    dopamineJabs: z.array(DopamineJabSchema).default([]),
    audioReactiveGlow: AudioReactiveGlowSchema.default({ enabled: true, peakThresholdDb: -12.0, glowColor: "#00FFCC", maxScaleBoost: 1.2 }),
    beatSyncTimeline: BeatSyncTimelineSchema.default({ enabled: false, bpm: 120, beatPointsMs: [], snapToleranceMs: 80 }),
  }).default({}),
});

export type VLStandardBlueprintV4 = z.infer<typeof VLStandardBlueprintV4Schema>;
export type LayerObject = z.infer<typeof LayerObjectSchema>;
export type TextLayer = z.infer<typeof TextLayerSchema>;
export type MediaLayer = z.infer<typeof MediaLayerSchema>;
export type ShapeLayer = z.infer<typeof ShapeLayerSchema>;
export type TransformSpec = z.infer<typeof TransformSchema>;
export type SceneDefinition = z.infer<typeof SceneDefinitionSchema>;
export type KineticSubtitleWord = z.infer<typeof KineticSubtitleWordSchema>;
export type AudioDSPSpec = z.infer<typeof AudioDSPSchema>;
export type DuckingEnvelope = z.infer<typeof DuckingEnvelopeSchema>;
export type DopamineJab = z.infer<typeof DopamineJabSchema>;
export type AutoFramingSpec = z.infer<typeof AutoFramingSchema>;
export type BacklotAuditMeta = z.infer<typeof BacklotAuditMetaSchema>;
export type Archetype = VLStandardBlueprintV4["archetype"];
