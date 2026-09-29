import { z } from "zod";

/**
 * [ViraLoop Studio Sovereign Visual Blueprint v3]
 * Single Source of Truth (SSOT) schema for all presets, editors, and video renderers.
 */

// 1. 기하학 및 변형 (Transform)
export const TransformSchema = z.object({
  x: z.number().describe("캔버스 X 좌표 (기준 해상도 1080)"),
  y: z.number().describe("캔버스 Y 좌표 (기준 해상도 1920)"),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().default(0),
  scale: z.number().default(1),
  origin: z.enum(["center", "top_left", "bottom_center"]).default("center"),
  zIndex: z.number().int().default(0),
});

// 2. 동적 감정 이모지 슬롯 (Semantic Emotion Slot)
export const EmotionEmojiSlotSchema = z.object({
  enabled: z.boolean().default(true),
  position: z.enum(["inline_end", "floating_top", "floating_left"]).default("inline_end"),
  gap: z.number().default(12),
  scaleRatio: z.number().default(1.2),
  animation: z.enum(["none", "pop_bounce", "shake", "fade_scale"]).default("pop_bounce"),
  fallbackEmoji: z.string().default("🔥"),
  injectedEmoji: z.string().optional().describe("AI 대본 의미 분석으로 동적 주입된 이모지"),
  allowedTaxonomy: z.array(z.string()).default(["shock", "rage", "laughter", "crying", "suspense"]),
});

// 3. 레이어 공통 베이스
export const BaseLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  locked: z.boolean().default(false),
  hidden: z.boolean().default(false),
  transform: TransformSchema,
  inMs: z.number().int().nonnegative().default(0),
  outMs: z.number().int().nonnegative().nullable().default(null),
  opacity: z.number().min(0).max(1).default(1),
});

// 4. 텍스트 레이어 (타이틀, 누적자막, 훅 문구, 배너, 메타)
export const TextLayerSchema = BaseLayerSchema.extend({
  kind: z.literal("text"),
  textRole: z.enum(["title_header", "subtitle_narrative", "hook_punch", "badge", "author_meta"]),
  content: z.string().default(""),
  fontFamily: z.string().default("NotoSansKR-Bold"),
  fontSize: z.number().default(54),
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
  accumulateMode: z.boolean().default(false).describe("썰형 자막 누적 모드"),
});

// 5. 미디어 레이어 (메인 영상, B-roll, 0초 줌 미디어, 10종 페페 감정 밈)
export const MediaLayerSchema = BaseLayerSchema.extend({
  kind: z.literal("media"),
  mediaRole: z.enum(["main_background", "frame_cutout", "b_roll", "reaction_meme"]),
  assetId: z.string().default("sample1"),
  fit: z.enum(["cover", "contain", "fill"]).default("cover"),
  focus: z.tuple([z.number(), z.number()]).default([0.5, 0.5]),
  motion: z.object({
    type: z.enum(["none", "zoom_in", "zoom_out", "pan_left", "ken_burns"]).default("none"),
    strength: z.number().default(0.1),
    durationMs: z.number().default(3000),
  }).default({ type: "none", strength: 0.1, durationMs: 3000 }),
  clipFromMs: z.number().default(0),
});

// 6. 도형/오버레이 레이어 (훅 밴드, 속보 배너, 댓글 카드, 그라디언트, 디바이더)
export const ShapeLayerSchema = BaseLayerSchema.extend({
  kind: z.literal("shape"),
  shapeRole: z.enum(["hook_band", "urgent_banner", "comment_card", "divider", "dimmed_overlay"]),
  fillColor: z.string().default("#000000"),
  borderRadius: z.number().default(0),
  gradient: z.object({
    direction: z.enum(["vertical", "horizontal"]),
    stops: z.array(z.object({ at: z.number(), color: z.string() })),
  }).optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().default(0),
});

export const LayerObjectSchema = z.discriminatedUnion("kind", [
  TextLayerSchema,
  MediaLayerSchema,
  ShapeLayerSchema,
]);

// 7. 고밀도 연출 DNA 및 오디오 DSP 규격 (ViraLoop 초격차 영역)
export const ProductionDNASchema = z.object({
  audio: z.object({
    ttsVolumeDb: z.number().default(-3.0),
    bgmVolumeDb: z.number().default(-22.0),
    bgmDuckingDb: z.number().default(-26.0),
    duckingFadeMs: z.number().default(350),
    voiceCadenceWpm: z.number().default(310),
    voicePitchF0: z.number().default(1.0),
  }),
  pacing: z.object({
    jabHookDurationMs: z.number().default(800),
    minCutDurationMs: z.number().default(1500),
    maxCutDurationMs: z.number().default(3500),
  }),
  safeZones: z.object({
    rightGuardWidth: z.number().default(120).describe("쇼츠 우측 아이콘 세이프존"),
    bottomGuardHeight: z.number().default(240).describe("쇼츠 하단 제목/사운드 세이프존"),
    topGuardHeight: z.number().default(180).describe("상단 상태바 세이프존"),
  }),
});

// 8. 최종 완성형 청사진 스키마
export const VLStandardBlueprintSchema = z.object({
  schemaVersion: z.literal("viraloop-blueprint/v3"),
  blueprintId: z.string(),
  name: z.string().min(1).max(60),
  archetype: z.enum(["ssul", "gunlimbo", "instagram", "classic", "bespoke"]),
  canvas: z.object({
    width: z.number().default(1080),
    height: z.number().default(1920),
    fps: z.enum(["30", "60"]).default("30"),
    backgroundColor: z.string().default("#000000"),
  }),
  layers: z.array(LayerObjectSchema),
  productionDNA: ProductionDNASchema,
  samplePreview: z.object({
    channelName: z.string().default("채널 이름"),
    title: z.string().default("영상 제목 샘플"),
    lines: z.array(z.object({ text: z.string(), emotion: z.string().default("neutral") })),
    mediaAssets: z.record(z.string()).default({}),
  }),
});

export type VLStandardBlueprint = z.infer<typeof VLStandardBlueprintSchema>;
export type VLLayerObject = z.infer<typeof LayerObjectSchema>;
export type VLTextLayer = z.infer<typeof TextLayerSchema>;
export type VLMediaLayer = z.infer<typeof MediaLayerSchema>;
export type VLShapeLayer = z.infer<typeof ShapeLayerSchema>;
export type VLEmotionEmojiSlot = z.infer<typeof EmotionEmojiSlotSchema>;
export type VLProductionDNA = z.infer<typeof ProductionDNASchema>;
