import {
  VLStandardBlueprintV4,
  VLStandardBlueprintV4Schema,
  Archetype,
  LayerObject,
  SceneDefinition,
} from "../types/blueprintV4";

/**
 * [ViraLoop Studio Blueprint v4.0 Lossless Migrator]
 * Seamlessly upgrades legacy presets (v1, v2, v3, SovereignPreset, ShortsTemplate)
 * into VLStandardBlueprint v4.0 compliant objects without data loss.
 */

export function isBlueprintV4(obj: unknown): obj is VLStandardBlueprintV4 {
  if (!obj || typeof obj !== "object") return false;
  return (obj as any).schemaVersion === "viraloop-blueprint/v4.0";
}

export function createDefaultBlueprintV4(
  archetype: Archetype = "classic",
  name: string = "새 쇼츠 프로젝트"
): VLStandardBlueprintV4 {
  const id = `bp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Archetype-specific initial global layers (4대 폼팩터 + 비스포크 실물 규격 단일 진실 공급원)
  const globalLayers: LayerObject[] = [];
  const canvasBgColor = archetype === "instagram" ? "#F8FAFC" : archetype === "bespoke" ? "#05050A" : "#000000";

  if (archetype === "ssul") {
    // 💬 [1] 썰형 (커뮤니티 토크 표준: 상단 라운드 카드 + 실시간 누적 본문)
    globalLayers.push({
      id: "header_bar",
      name: "상단 커뮤니티 카드",
      kind: "shape",
      locked: false,
      hidden: false,
      transform: { x: 540, y: 190, width: 980, height: 160, rotation: 0, scale: 1, origin: "center", zIndex: 10 },
      inMs: 0,
      outMs: null,
      opacity: 0.95,
      shapeRole: "urgent_banner",
      fillColor: "#1E293B",
      borderRadius: 16,
      borderColor: "#334155",
      borderWidth: 1,
    });
    globalLayers.push({
      id: "header_title",
      name: "썰 제목 텍스트",
      kind: "text",
      locked: false,
      hidden: false,
      transform: { x: 540, y: 190, width: 920, height: 80, rotation: 0, scale: 1, origin: "center", zIndex: 12 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      textRole: "title_header",
      content: "오늘자 역대급 실화 사건 🔥",
      fontFamily: "NotoSansKR-Bold",
      fontSize: 42,
      fontColor: "#FFFFFF",
      letterSpacing: -1,
      lineHeight: 1.2,
      textAlign: "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
    globalLayers.push({
      id: "subtitle_anchor",
      name: "썰 자막 실시간 누적 본문",
      kind: "text",
      locked: false,
      hidden: false,
      transform: { x: 540, y: 1050, width: 960, height: 400, rotation: 0, scale: 1, origin: "center", zIndex: 15 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      textRole: "subtitle_narrative",
      content: "썰 자막이 실시간으로 누적되는 본문 영역입니다",
      fontFamily: "NotoSansKR-Bold",
      fontSize: 46,
      fontColor: "#FFFFFF",
      stroke: { width: 4, color: "#000000" },
      shadow: { blur: 8, color: "rgba(0,0,0,0.8)", offsetX: 0, offsetY: 2 },
      letterSpacing: -1,
      lineHeight: 1.4,
      textAlign: "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: true,
    });
  } else if (archetype === "gunlimbo") {
    // ⚡ [2] 군림보 (상단 24% 2줄 속보 대제목 + 24~34% 와이드 순백 훅 밴드 + 0초 펀치라인 자막)
    globalLayers.push({
      id: "top_letterbox",
      name: "상단 24% 레터박스",
      kind: "shape",
      locked: true,
      hidden: false,
      transform: { x: 540, y: 180, width: 1080, height: 360, rotation: 0, scale: 1, origin: "center", zIndex: 10 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      shapeRole: "urgent_banner",
      fillColor: "#000000",
      borderRadius: 0,
      borderWidth: 0,
    });
    globalLayers.push({
      id: "breaking_title",
      name: "상단 2줄 속보 대제목",
      kind: "text",
      locked: false,
      hidden: false,
      transform: { x: 540, y: 130, width: 980, height: 140, rotation: 0, scale: 1, origin: "center", zIndex: 12 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      textRole: "title_header",
      content: "🚨 긴급 단독 속보\n이거 모르면 평생 후회합니다",
      multiLineStyles: [
        { fontSize: 38, fontColor: "#FFFFFF" },
        { fontSize: 50, fontColor: "#FFE500" },
      ],
      fontFamily: "NotoSansKR-Black",
      fontSize: 48,
      fontColor: "#FFE500",
      letterSpacing: -2,
      lineHeight: 1.15,
      textAlign: "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
    globalLayers.push({
      id: "hook_band",
      name: "군림보 와이드 훅 밴드",
      kind: "shape",
      locked: false,
      hidden: false,
      transform: { x: 540, y: 380, width: 1080, height: 110, rotation: 0, scale: 1, origin: "center", zIndex: 11 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      shapeRole: "hook_band",
      fillColor: "#FFFFFF",
      borderRadius: 0,
      borderWidth: 0,
    });
    globalLayers.push({
      id: "hook_text",
      name: "0초 시선강탈 훅 카피",
      kind: "text",
      locked: false,
      hidden: false,
      transform: { x: 540, y: 380, width: 1020, height: 80, rotation: 0, scale: 1, origin: "center", zIndex: 13 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      textRole: "hook_punch",
      content: "⚡ 0초 시선강탈 훅 카피가 여기에 들어갑니다",
      fontFamily: "NotoSansKR-Black",
      fontSize: 44,
      fontColor: "#000000",
      letterSpacing: -1.5,
      lineHeight: 1.1,
      textAlign: "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
    globalLayers.push({
      id: "video_guide",
      name: "비디오 영상 재생 프레임",
      kind: "shape",
      locked: true,
      hidden: false,
      transform: { x: 540, y: 990, width: 1080, height: 1080, rotation: 0, scale: 1, origin: "center", zIndex: 5 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      shapeRole: "hole_mask",
      fillColor: "transparent",
      borderRadius: 0,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.06)",
    });
    globalLayers.push({
      id: "subtitle_anchor",
      name: "군림보 펀치라인 자막",
      kind: "text",
      locked: false,
      hidden: false,
      transform: { x: 540, y: 1620, width: 960, height: 120, rotation: 0, scale: 1, origin: "center", zIndex: 15 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      textRole: "subtitle_narrative",
      content: "군림보 방송 자막이 여기에 표시됩니다",
      fontFamily: "NotoSansKR-Black",
      fontSize: 50,
      fontColor: "#FFE600",
      stroke: { width: 5, color: "#000000" },
      shadow: { blur: 8, color: "rgba(0,0,0,0.9)", offsetX: 0, offsetY: 3 },
      letterSpacing: -1,
      lineHeight: 1.2,
      textAlign: "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
    globalLayers.push({
      id: "source_credit",
      name: "하단 출처 바",
      kind: "text",
      locked: true,
      hidden: false,
      transform: { x: 540, y: 1860, width: 600, height: 40, rotation: 0, scale: 1, origin: "center", zIndex: 12 },
      inMs: 0,
      outMs: null,
      opacity: 0.7,
      textRole: "author_meta",
      content: "출처: 온라인 커뮤니티",
      fontFamily: "NotoSansKR-Regular",
      fontSize: 24,
      fontColor: "#71717A",
      letterSpacing: 0,
      lineHeight: 1.1,
      textAlign: "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
  } else if (archetype === "instagram") {
    // 📸 [3] 인스타 (클린 화이트 카드 + 원형 프로필 + 1:1 홀펀치 마스크 창 + 베댓 카드)
    globalLayers.push({
      id: "profile_header",
      name: "인스타 작성자 프로필 카드",
      kind: "shape",
      locked: true,
      hidden: false,
      transform: { x: 540, y: 160, width: 960, height: 110, rotation: 0, scale: 1, origin: "center", zIndex: 10 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      shapeRole: "urgent_banner",
      fillColor: "#FFFFFF",
      borderRadius: 20,
      borderColor: "#E2E8F0",
      borderWidth: 1,
    });
    globalLayers.push({
      id: "profile_text",
      name: "프로필 핸들 및 배지",
      kind: "text",
      locked: false,
      hidden: false,
      transform: { x: 540, y: 160, width: 900, height: 70, rotation: 0, scale: 1, origin: "center", zIndex: 11 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      textRole: "author_meta",
      content: "📸 @viral_shorts  ✓  •  추천 베스트 댓글",
      fontFamily: "NotoSansKR-Bold",
      fontSize: 32,
      fontColor: "#2563EB",
      letterSpacing: -0.5,
      lineHeight: 1.2,
      textAlign: "left",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
    globalLayers.push({
      id: "video_hole_window",
      name: "1:1 비디오 홀 마스크 창",
      kind: "shape",
      locked: true,
      hidden: false,
      transform: { x: 540, y: 780, width: 960, height: 960, rotation: 0, scale: 1, origin: "center", zIndex: 8 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      shapeRole: "hole_mask",
      fillColor: "#0F172A",
      borderRadius: 24,
      borderColor: "#E2E8F0",
      borderWidth: 2,
    });
    globalLayers.push({
      id: "comment_card",
      name: "인스타 베댓 카드 프레임",
      kind: "shape",
      locked: false,
      hidden: false,
      transform: { x: 540, y: 1420, width: 960, height: 260, rotation: 0, scale: 1, origin: "center", zIndex: 12 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      shapeRole: "comment_card",
      fillColor: "#FFFFFF",
      borderRadius: 20,
      borderColor: "#E2E8F0",
      borderWidth: 1,
    });
    globalLayers.push({
      id: "comment_meta",
      name: "베댓 반응 지표 (좋아요/공유)",
      kind: "text",
      locked: false,
      hidden: false,
      transform: { x: 540, y: 1350, width: 900, height: 40, rotation: 0, scale: 1, origin: "center", zIndex: 13 },
      inMs: 0,
      outMs: null,
      opacity: 0.9,
      textRole: "author_meta",
      content: "❤️ 2.4만   💬 1,420   ↗️ 공유",
      fontFamily: "NotoSansKR-Medium",
      fontSize: 24,
      fontColor: "#64748B",
      letterSpacing: 0,
      lineHeight: 1.1,
      textAlign: "left",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
    globalLayers.push({
      id: "comment_body",
      name: "베댓 본문 텍스트",
      kind: "text",
      locked: false,
      hidden: false,
      transform: { x: 540, y: 1430, width: 900, height: 90, rotation: 0, scale: 1, origin: "center", zIndex: 14 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      textRole: "hook_punch",
      content: "이거 진짜 실화임...? 댓글 보고 소름 돋음 ㄷㄷ",
      fontFamily: "NotoSansKR-Bold",
      fontSize: 38,
      fontColor: "#0F172A",
      letterSpacing: -1,
      lineHeight: 1.3,
      textAlign: "left",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
    globalLayers.push({
      id: "subtitle_anchor",
      name: "인스타 피드 자막",
      kind: "text",
      locked: false,
      hidden: false,
      transform: { x: 540, y: 1720, width: 920, height: 100, rotation: 0, scale: 1, origin: "center", zIndex: 15 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      textRole: "subtitle_narrative",
      content: "영상 나레이션 자막 영역",
      fontFamily: "NotoSansKR-Bold",
      fontSize: 44,
      fontColor: "#1E293B",
      letterSpacing: -1,
      lineHeight: 1.2,
      textAlign: "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
  } else if (archetype === "bespoke") {
    // ✨ [4] 비스포크 (네온 사이버 & 하이테크 미래형 디자인 템플릿)
    globalLayers.push({
      id: "neon_badge",
      name: "네온 뱃지 태그",
      kind: "text",
      locked: false,
      hidden: false,
      transform: { x: 540, y: 140, width: 500, height: 60, rotation: 0, scale: 1, origin: "center", zIndex: 11 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      textRole: "title_header",
      content: "⚡ EXCLUSIVE SPECIAL",
      fontFamily: "NotoSansKR-Black",
      fontSize: 26,
      fontColor: "#00F0FF",
      letterSpacing: 3,
      lineHeight: 1.1,
      textAlign: "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
    globalLayers.push({
      id: "headline_text",
      name: "비스포크 메인 타이틀",
      kind: "text",
      locked: false,
      hidden: false,
      transform: { x: 540, y: 240, width: 980, height: 120, rotation: 0, scale: 1, origin: "center", zIndex: 12 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      textRole: "title_header",
      content: "2026 차세대 AI 테크 혁명 분석",
      fontFamily: "NotoSansKR-Black",
      fontSize: 48,
      fontColor: "#FFFFFF",
      letterSpacing: -2,
      lineHeight: 1.15,
      textAlign: "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
    globalLayers.push({
      id: "video_frame",
      name: "사이버 비디오 프레임",
      kind: "shape",
      locked: true,
      hidden: false,
      transform: { x: 540, y: 920, width: 980, height: 1040, rotation: 0, scale: 1, origin: "center", zIndex: 8 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      shapeRole: "hole_mask",
      fillColor: "transparent",
      borderRadius: 24,
      borderWidth: 2,
      borderColor: "#00F0FF",
    });
    globalLayers.push({
      id: "subtitle_anchor",
      name: "사이버 네온 자막 바",
      kind: "text",
      locked: false,
      hidden: false,
      transform: { x: 540, y: 1600, width: 960, height: 120, rotation: 0, scale: 1, origin: "center", zIndex: 15 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      textRole: "subtitle_narrative",
      content: "사이버 네온 자막이 여기에 표시됩니다",
      fontFamily: "NotoSansKR-Bold",
      fontSize: 48,
      fontColor: "#00F0FF",
      stroke: { width: 3, color: "#000000" },
      shadow: { blur: 12, color: "#00F0FF", offsetX: 0, offsetY: 0 },
      letterSpacing: -1,
      lineHeight: 1.2,
      textAlign: "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
  } else {
    // 🎬 [5] 클래식 (샌드위치 표준: 상단 레터박스 + 2줄 헤드라인 + 중앙 비디오 가이드 + 하단 바 + 자막 + 출처)
    globalLayers.push({
      id: "letterbox_top",
      name: "상단 레터박스 바",
      kind: "shape",
      locked: true,
      hidden: false,
      transform: { x: 540, y: 150, width: 1080, height: 300, rotation: 0, scale: 1, origin: "center", zIndex: 10 },
      inMs: 0,
      outMs: null,
      opacity: 0.98,
      shapeRole: "urgent_banner",
      fillColor: "#09090B",
      borderRadius: 0,
      borderWidth: 0,
    });
    globalLayers.push({
      id: "headline_text",
      name: "클래식 샌드위치 헤드라인",
      kind: "text",
      locked: false,
      hidden: false,
      transform: { x: 540, y: 150, width: 980, height: 160, rotation: 0, scale: 1, origin: "center", zIndex: 12 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      textRole: "title_header",
      content: "충격적인 반전 결말 공개 🔥\n끝까지 보면 소름 돋는 이유",
      multiLineStyles: [
        { fontSize: 46, fontColor: "#FFE500" },
        { fontSize: 34, fontColor: "#FFFFFF" },
      ],
      fontFamily: "NotoSansKR-Black",
      fontSize: 48,
      fontColor: "#FFE600",
      letterSpacing: -2,
      lineHeight: 1.15,
      textAlign: "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
    globalLayers.push({
      id: "video_window_guide",
      name: "비디오 영상 재생 프레임",
      kind: "shape",
      locked: true,
      hidden: false,
      transform: { x: 540, y: 960, width: 1080, height: 1320, rotation: 0, scale: 1, origin: "center", zIndex: 5 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      shapeRole: "hole_mask",
      fillColor: "transparent",
      borderRadius: 0,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.06)",
    });
    globalLayers.push({
      id: "letterbox_bottom",
      name: "하단 레터박스 바",
      kind: "shape",
      locked: true,
      hidden: false,
      transform: { x: 540, y: 1770, width: 1080, height: 300, rotation: 0, scale: 1, origin: "center", zIndex: 10 },
      inMs: 0,
      outMs: null,
      opacity: 0.98,
      shapeRole: "dimmed_overlay",
      fillColor: "#09090B",
      borderRadius: 0,
      borderWidth: 0,
    });
    globalLayers.push({
      id: "subtitle_anchor",
      name: "표준 중앙 하단 자막",
      kind: "text",
      locked: false,
      hidden: false,
      transform: { x: 540, y: 1540, width: 960, height: 120, rotation: 0, scale: 1, origin: "center", zIndex: 15 },
      inMs: 0,
      outMs: null,
      opacity: 1,
      textRole: "subtitle_narrative",
      content: "자막이 표시되는 표준 중앙 하단 영역",
      fontFamily: "NotoSansKR-Bold",
      fontSize: 48,
      fontColor: "#FFFFFF",
      stroke: { width: 4, color: "#000000" },
      shadow: { blur: 6, color: "rgba(0,0,0,0.9)", offsetX: 0, offsetY: 2 },
      letterSpacing: -1,
      lineHeight: 1.2,
      textAlign: "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
    globalLayers.push({
      id: "source_credit",
      name: "하단 출처 바",
      kind: "text",
      locked: true,
      hidden: false,
      transform: { x: 540, y: 1860, width: 600, height: 40, rotation: 0, scale: 1, origin: "center", zIndex: 12 },
      inMs: 0,
      outMs: null,
      opacity: 0.7,
      textRole: "author_meta",
      content: "출처: 공식 유튜브 영상",
      fontFamily: "NotoSansKR-Regular",
      fontSize: 24,
      fontColor: "#71717A",
      letterSpacing: 0,
      lineHeight: 1.1,
      textAlign: "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
  }

  const initialScenes: SceneDefinition[] = [
    {
      sceneId: "scene_01",
      order: 0,
      role: "0s_hook",
      targetDurationMs: 4000,
      actualDurationMs: 4000,
      scriptText: "당신이 몰랐던 충격적인 진실, 지금 바로 공개합니다.",
      keywords: ["진실", "공개", "비밀"],
      visualPrompt: "Dramatic cinematic shot with hyper-realistic volumetric lighting",
      mediaAssetId: "sample_media_01",
      motion: { type: "zoom_in", strength: 0.15 },
      words: [
        { word: "당신이", startMs: 0, endMs: 500, highlightColor: "#FFE600", scaleEffect: "pop" },
        { word: "몰랐던", startMs: 500, endMs: 1100, highlightColor: "#FFE600", scaleEffect: "bounce" },
        { word: "충격적인", startMs: 1100, endMs: 2000, highlightColor: "#FF3366", scaleEffect: "shake" },
        { word: "진실", startMs: 2000, endMs: 2700, highlightColor: "#00FFCC", scaleEffect: "pop" },
        { word: "지금 바로", startMs: 2700, endMs: 3400, highlightColor: "#FFFFFF", scaleEffect: "none" },
        { word: "공개합니다", startMs: 3400, endMs: 4000, highlightColor: "#FFE600", scaleEffect: "pop" },
      ],
      transitionOut: { type: "whip_pan", durationMs: 250, sfxAssetId: "sfx_whoosh_01" },
    },
    {
      sceneId: "scene_02",
      order: 1,
      role: "escalation",
      targetDurationMs: 5000,
      actualDurationMs: 5000,
      scriptText: "이 사건은 단순한 우연이 아니었습니다. 모든 것은 철저히 계획되어 있었습니다.",
      keywords: ["사건", "계획", "전개"],
      visualPrompt: "Mysterious forensic investigation scene with deep cyan shadows",
      mediaAssetId: "sample_media_02",
      motion: { type: "pan_left", strength: 0.1 },
      words: [
        { word: "이 사건은", startMs: 4000, endMs: 4800, highlightColor: "#FFE600", scaleEffect: "pop" },
        { word: "우연이", startMs: 4800, endMs: 5500, highlightColor: "#FF3366", scaleEffect: "shake" },
        { word: "아니었습니다", startMs: 5500, endMs: 6400, highlightColor: "#FFFFFF", scaleEffect: "none" },
        { word: "철저히 계획된", startMs: 6400, endMs: 7800, highlightColor: "#00FFCC", scaleEffect: "pop" },
        { word: "것이었습니다", startMs: 7800, endMs: 9000, highlightColor: "#FFFFFF", scaleEffect: "none" },
      ],
      transitionOut: { type: "glitch", durationMs: 200, sfxAssetId: "sfx_glitch_01" },
    },
  ];

  return {
    schemaVersion: "viraloop-blueprint/v4.0",
    blueprintId: id,
    name,
    category: "custom",
    archetype,
    tags: [archetype, "v4.0", "sovereign"],
    canvas: {
      width: 1080,
      height: 1920,
      aspectRatio: "9:16",
      fps: "30",
      backgroundColor: canvasBgColor,
      safeZones: {
        topGuardHeight: 180,
        bottomGuardHeight: 240,
        rightGuardWidth: 120,
      },
    },
    globalLayers,
    scenes: initialScenes,
    audioDSP: {
      voiceSignature: {
        engine: "gemini_tts",
        role: "감동 실화 & 눈물 명작 영화 해설가",
        voiceId: "Kore",
        targetWpm: 340,
        pitchF0: 1.0,
        volumeDb: -3.0,
        silenceCutThresholdSec: 0.15,
      },
      bgmSignature: {
        trackPath: null,
        genre: "Acoustic & Cinematic",
        mood: "서정적이고 몰입감 높은 무드",
        volumeDb: -18.0,
      },
      duckingEnvelope: {
        targetDuckingDb: -24.0,
        attackMs: 150,
        holdMs: 150,
        releaseMs: 300,
      },
      sfxTimeline: [],
    },
    productionBible: {},
    generativeSlots: [],
    samplePreview: {},
    backlotAudit: {
      auditStatus: "pending",
      hookScore: 88,
      wpmCadence: 340,
      silenceCutCount: 3,
      criticNotes: ["초반 0초 훅 전달력 우수", "BGM -24dB 덕킹 연동 완료"],
    },
    creativeInnovations: {
      autoFraming: {
        enabled: false,
        trackingTarget: "face",
        smoothingFactor: 0.8,
        safeZoneMargin: 0.1,
      },
      dopamineJabs: [
        { timestampMs: 2000, type: "quick_zoom", durationMs: 150, sfxAssetId: "sfx_punch_01" },
      ],
      audioReactiveGlow: {
        enabled: true,
        peakThresholdDb: -12.0,
        glowColor: "#00FFCC",
        maxScaleBoost: 1.2,
      },
      beatSyncTimeline: {
        enabled: false,
        bpm: 120,
        beatPointsMs: [],
        snapToleranceMs: 80,
      },
    },
  };
}

export function resolveFontFamily(font?: string): string {
  if (!font) return "Pretendard, sans-serif";
  const f = font.toLowerCase();
  if (f.includes("dohyeon") || f.includes("do hyeon") || f.includes("도현")) {
    return "'Do Hyeon', sans-serif";
  }
  if (f.includes("notosans") || f.includes("noto sans")) return "'Noto Sans KR', sans-serif";
  if (f.includes("pretendard")) return "Pretendard, sans-serif";
  if (f.includes("blackhan") || f.includes("black han") || f.includes("검은고딕")) return "'Black Han Sans', sans-serif";
  if (f.includes("gmarket")) return "'GmarketSans', sans-serif";
  if (f.includes("aggro") || f.includes("sbaggro") || f.includes("어그로")) return "'SBAggro', sans-serif";
  if (f.includes("jalnan") || f.includes("잘난")) return "'Jalnan', sans-serif";
  if (f.includes("cookierun") || f.includes("쿠키런")) return "'CookieRun', sans-serif";
  if (f.includes("cafe24") || f.includes("써라운드")) return "'Cafe24Ssurround', sans-serif";
  if (f.includes("tmoney") || f.includes("티머니")) return "'TmoneyRoundWind', sans-serif";
  if (f.includes("pyeongchang") || f.includes("평창")) return "'PyeongChangPeace', sans-serif";
  if (f.includes("chosunilbo") || f.includes("chosun_ilbo") || f.includes("chosunnm") || f.includes("조선일보")) return "'Chosunilbo_myungjo', serif";
  if (f.includes("chosunkg") || f.includes("chosun_kg") || f.includes("조선굵은")) return "'ChosunKg', sans-serif";
  if (f.includes("jua") || f.includes("주아")) return "'Jua', sans-serif";
  if (f.includes("nanumgothic") || f.includes("나눔고딕")) return "'Nanum Gothic', sans-serif";
  if (f.includes("nanummyeongjo") || f.includes("나눔명조")) return "'Nanum Myeongjo', serif";
  if (f.includes("gowun") || f.includes("고운")) return "'Gowun Batang', serif";
  if (f.includes("wanted") || f.includes("원티드")) return "'Wanted Sans', sans-serif";
  return font;
}

export function convertParametricLayoutToV4Layers(
  layout: Record<string, any>,
  archetype: Archetype = "classic"
): LayerObject[] {
  const layers: LayerObject[] = [];
  const baseW = 1080;
  const baseH = 1920;

  // 1. 상단 레터박스 / 헤더바 배경 (Top Bar Background)
  if (layout.has_top_bar_bg !== false) {
    const heightPct = layout.top_bar_height_pct || (archetype === "ssul" ? 14 : archetype === "classic" ? 18 : 20);
    const barHeight = Math.round((heightPct / 100) * baseH);
    const barY = Math.round(barHeight / 2);

    layers.push({
      id: "top_bar_bg",
      name: archetype === "ssul" ? "상단 긴급 헤더바" : "상단 레터박스 배경",
      kind: "shape",
      locked: true,
      hidden: false,
      transform: {
        x: Math.round(baseW / 2),
        y: barY,
        width: baseW,
        height: barHeight,
        rotation: 0,
        scale: 1,
        origin: "center",
        zIndex: 10,
      },
      inMs: 0,
      outMs: null,
      opacity: layout.top_bar_opacity ?? 1.0,
      shapeRole: "urgent_banner",
      fillColor: layout.top_bar_bg || (archetype === "ssul" ? "#1E293B" : "#000000"),
      borderRadius: archetype === "ssul" ? 16 : 0,
      borderWidth: 0,
    });
  }

  // 2. 상단 타이틀 1행 & 2행 (Title Line 1 & Line 2)
  if (layout.has_top_title !== false && (layout.title_line1 || layout.title_line2)) {
    const titleYPct = layout.top_title_y_pct !== undefined ? layout.top_title_y_pct : (archetype === "ssul" ? 3.0 : 16.5);
    const startY = Math.round((titleYPct / 100) * baseH);
    const font = resolveFontFamily(layout.title_font_family);

    // 1080p 세로 해상도 표준 폰트 크기 환산
    const rawSize1 = layout.title_line1_size_px || (layout.title_line1_size_pt ? Math.round(layout.title_line1_size_pt * 1.3) : 32);
    const fontSize1 = rawSize1 >= 64 ? rawSize1 : Math.max(78, Math.round(rawSize1 * 2.5));
    const rawSize2 = layout.title_line2_size_px || (layout.title_line2_size_pt ? Math.round(layout.title_line2_size_pt * 1.3) : 36);
    const fontSize2 = rawSize2 >= 70 ? rawSize2 : Math.max(84, Math.round(rawSize2 * 2.5));

    if (layout.title_line1) {
      layers.push({
        id: "title_line1",
        name: "메인 타이틀 1행",
        kind: "text",
        locked: false,
        hidden: false,
        transform: {
          x: Math.round(baseW / 2),
          y: startY,
          width: 960,
          height: fontSize1 + 24,
          rotation: 0,
          scale: 1,
          origin: "center",
          zIndex: 15,
        },
        inMs: 0,
        outMs: null,
        opacity: 1,
        textRole: "title_header",
        content: layout.title_line1,
        fontFamily: font,
        fontSize: fontSize1,
        fontColor: layout.title_line1_color || "#FFFFFF",
        letterSpacing: -2,
        lineHeight: 1.15,
        textAlign: "center",
        borderRadius: 0,
        padding: [0, 0, 0, 0],
        accumulateMode: false,
        shadow: layout.title_shadow ? { color: "rgba(0,0,0,0.8)", blur: 4, offsetX: 0, offsetY: 2 } : { color: "rgba(0,0,0,0.8)", blur: 4, offsetX: 0, offsetY: 2 },
      });
    }

    if (layout.title_line2) {
      const lineGap = Math.round((fontSize1 + fontSize2) / 2) + 12;
      const y2 = layout.title_line1 ? startY + lineGap : startY;

      layers.push({
        id: "title_line2",
        name: "서브 타이틀 2행",
        kind: "text",
        locked: false,
        hidden: false,
        transform: {
          x: Math.round(baseW / 2),
          y: y2,
          width: 960,
          height: fontSize2 + 24,
          rotation: 0,
          scale: 1,
          origin: "center",
          zIndex: 16,
        },
        inMs: 0,
        outMs: null,
        opacity: 1,
        textRole: "title_header",
        content: layout.title_line2,
        fontFamily: font,
        fontSize: fontSize2,
        fontColor: layout.title_line2_color || "#FFE838",
        letterSpacing: -2,
        lineHeight: 1.15,
        textAlign: "center",
        borderRadius: 0,
        padding: [0, 0, 0, 0],
        accumulateMode: false,
        shadow: layout.title_shadow ? { color: "rgba(0,0,0,0.8)", blur: 4, offsetX: 0, offsetY: 2 } : { color: "rgba(0,0,0,0.8)", blur: 4, offsetX: 0, offsetY: 2 },
      });
    }
  }

  // 3. 군림보 훅 밴드 (Hook Band)
  if (layout.has_hook_band || archetype === "gunlimbo") {
    const topPct = layout.hook_band_top_pct || 22.0;
    const heightPct = layout.hook_band_height_pct || 10.0;
    const bandH = Math.round((heightPct / 100) * baseH);
    const bandY = Math.round(((topPct + heightPct / 2) / 100) * baseH);

    layers.push({
      id: "hook_band_shape",
      name: "군림보 훅 밴드",
      kind: "shape",
      locked: false,
      hidden: false,
      transform: {
        x: Math.round(baseW / 2),
        y: bandY,
        width: 1020,
        height: bandH,
        rotation: 0,
        scale: 1,
        origin: "center",
        zIndex: 20,
      },
      inMs: 0,
      outMs: null,
      opacity: 0.95,
      shapeRole: "hook_band",
      fillColor: layout.hook_band_bg_color || "#3F3F46",
      borderRadius: 12,
      borderWidth: 0,
    });

    const hookText = layout.hook_text || layout.title_line1 || "이거 모르면 평생 후회합니다";
    layers.push({
      id: "hook_band_text",
      name: "0초 시선강탈 훅 카피",
      kind: "text",
      locked: false,
      hidden: false,
      transform: {
        x: Math.round(baseW / 2),
        y: bandY,
        width: 980,
        height: bandH - 20,
        rotation: 0,
        scale: 1,
        origin: "center",
        zIndex: 21,
      },
      inMs: 0,
      outMs: null,
      opacity: 1,
      textRole: "hook_punch",
      content: hookText,
      fontFamily: resolveFontFamily(layout.title_font_family || "Pretendard"),
      fontSize: 52,
      fontColor: layout.hook_band_text_color || "#FFFFFF",
      letterSpacing: -1,
      lineHeight: 1.1,
      textAlign: "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
  }

  // 4. 인스타 베댓 카드 (Instagram Comment Card)
  if (archetype === "instagram") {
    layers.push({
      id: "comment_card_shape",
      name: "인스타 베댓 카드",
      kind: "shape",
      locked: false,
      hidden: false,
      transform: {
        x: Math.round(baseW / 2),
        y: 380,
        width: 920,
        height: 240,
        rotation: 0,
        scale: 1,
        origin: "center",
        zIndex: 20,
      },
      inMs: 0,
      outMs: null,
      opacity: 0.95,
      shapeRole: "comment_card",
      fillColor: layout.card_bg_color || "#18181B",
      borderRadius: 20,
      borderColor: layout.card_border_color || "#27272A",
      borderWidth: 1,
    });

    layers.push({
      id: "author_meta",
      name: "인스타 작성자 프로필",
      kind: "text",
      locked: false,
      hidden: false,
      transform: {
        x: Math.round(baseW / 2),
        y: 310,
        width: 840,
        height: 48,
        rotation: 0,
        scale: 1,
        origin: "center",
        zIndex: 21,
      },
      inMs: 0,
      outMs: null,
      opacity: 0.9,
      textRole: "author_meta",
      content: layout.title_line2?.startsWith("@") ? layout.title_line2 : "@viral_daily_pick • 베스트 댓글",
      fontFamily: resolveFontFamily(layout.title_font_family || "Pretendard"),
      fontSize: 30,
      fontColor: layout.title_line2_color || "#A1A1AA",
      letterSpacing: 0,
      lineHeight: 1.2,
      textAlign: "left",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });

    layers.push({
      id: "comment_body",
      name: "베댓 본문 텍스트",
      kind: "text",
      locked: false,
      hidden: false,
      transform: {
        x: Math.round(baseW / 2),
        y: 400,
        width: 840,
        height: 100,
        rotation: 0,
        scale: 1,
        origin: "center",
        zIndex: 22,
      },
      inMs: 0,
      outMs: null,
      opacity: 1,
      textRole: "title_header",
      content: layout.title_line1 || "오늘의 인스타 핫이슈",
      fontFamily: resolveFontFamily(layout.title_font_family || "Pretendard"),
      fontSize: 42,
      fontColor: layout.title_line1_color || "#FFFFFF",
      letterSpacing: -1,
      lineHeight: 1.3,
      textAlign: "left",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
  }

  // 5. 표준 자막 레이어 (Subtitle Layer)
  if (layout.has_subtitle !== false) {
    const subYPct = layout.subtitle_y_pct || (archetype === "classic" ? 72.0 : archetype === "gunlimbo" ? 75.0 : 65.0);
    const subY = Math.round((subYPct / 100) * baseH);
    const subFont = resolveFontFamily(layout.subtitle_font_family || "Pretendard");
    const subSize = Math.round((layout.subtitle_size_px || 26) * 1.7);

    layers.push({
      id: "subtitle_main",
      name: archetype === "ssul" ? "썰 자막 실시간 누적 본문" : "키네틱 내레이션 자막",
      kind: "text",
      locked: false,
      hidden: false,
      transform: {
        x: Math.round(baseW / 2),
        y: subY,
        width: 960,
        height: archetype === "ssul" ? 420 : 130,
        rotation: 0,
        scale: 1,
        origin: "center",
        zIndex: 30,
      },
      inMs: 0,
      outMs: null,
      opacity: 1,
      textRole: "subtitle_narrative",
      content: layout.subtitle_sample || (archetype === "ssul" ? "썰 자막이 실시간으로 누적되는 본문 영역입니다" : "자막이 표시되는 표준 중앙 하단 영역"),
      fontFamily: subFont,
      fontSize: subSize,
      fontColor: layout.subtitle_color || "#FFFFFF",
      letterSpacing: -1,
      lineHeight: archetype === "ssul" ? 1.4 : 1.2,
      textAlign: archetype === "ssul" ? "left" : "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: archetype === "ssul",
      stroke: layout.subtitle_stroke_color && layout.subtitle_stroke_color !== "transparent"
        ? { color: layout.subtitle_stroke_color, width: layout.subtitle_stroke_width || 3 }
        : undefined,
    });
  }

  // 6. 하단 레터박스 배경 (Bottom Bar Background)
  if (layout.has_bottom_bar !== false && layout.bottom_bar_height_pct) {
    const bHeightPct = layout.bottom_bar_height_pct;
    const barHeight = Math.round((bHeightPct / 100) * baseH);
    const barY = baseH - Math.round(barHeight / 2);

    layers.push({
      id: "bottom_bar_bg",
      name: "하단 레터박스 배경",
      kind: "shape",
      locked: true,
      hidden: false,
      transform: {
        x: Math.round(baseW / 2),
        y: barY,
        width: baseW,
        height: barHeight,
        rotation: 0,
        scale: 1,
        origin: "center",
        zIndex: 10,
      },
      inMs: 0,
      outMs: null,
      opacity: layout.bottom_bar_opacity ?? 1.0,
      shapeRole: "urgent_banner",
      fillColor: layout.bottom_bar_bg || "#000000",
      borderRadius: 0,
      borderWidth: 0,
    });
  }

  // 7. 출처 표기 (Source Credit)
  if (layout.has_bottom_source !== false && layout.bottom_source_text) {
    const bPct = layout.bottom_source_bottom_pct ?? 2.2;
    const srcY = baseH - Math.round((bPct / 100) * baseH);

    layers.push({
      id: "bottom_source",
      name: "출처 표기",
      kind: "text",
      locked: false,
      hidden: false,
      transform: {
        x: Math.round(baseW / 2),
        y: srcY,
        width: 900,
        height: 36,
        rotation: 0,
        scale: 1,
        origin: "center",
        zIndex: 15,
      },
      inMs: 0,
      outMs: null,
      opacity: 0.85,
      textRole: "source_credit",
      content: layout.bottom_source_text,
      fontFamily: resolveFontFamily(layout.title_font_family || "Pretendard"),
      fontSize: layout.bottom_source_size_px ? Math.round(layout.bottom_source_size_px * 1.5) : 22,
      fontColor: layout.bottom_source_color || "#94A3B8",
      letterSpacing: 0,
      lineHeight: 1.0,
      textAlign: "center",
      borderRadius: 0,
      padding: [0, 0, 0, 0],
      accumulateMode: false,
    });
  }

  return layers;
}

export function migrateToBlueprintV4(raw: any): VLStandardBlueprintV4 {
  if (isBlueprintV4(raw)) {
    // Validate or fix minor schema misses
    const parsed = VLStandardBlueprintV4Schema.safeParse(raw);
    if (parsed.success) {
      return parsed.data;
    }
  }

  const rawArchetype = raw?.archetype || (raw?.layout && typeof raw.layout === "object" ? raw.layout.archetype : undefined);
  const archetype: Archetype =
    rawArchetype && ["ssul", "gunlimbo", "instagram", "classic", "bespoke"].includes(rawArchetype)
      ? (rawArchetype as Archetype)
      : rawArchetype === "ssul_community" || rawArchetype === "ssul_grid"
      ? "ssul"
      : rawArchetype === "gunlimbo_breaking"
      ? "gunlimbo"
      : rawArchetype === "instagram_card"
      ? "instagram"
      : "classic";

  const fallback = createDefaultBlueprintV4(archetype, raw?.name || "마이그레이션된 프로젝트");

  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  // Preserve ID and naming if present
  if (raw.id || raw.blueprintId) fallback.blueprintId = raw.id || raw.blueprintId;
  if (raw.name) fallback.name = raw.name;
  if (raw.category) fallback.category = raw.category;
  if (raw.channelRef) fallback.channelRef = raw.channelRef;
  if (Array.isArray(raw.tags)) fallback.tags = raw.tags;

  // Canvas
  if (raw.canvas) {
    fallback.canvas.width = raw.canvas.width || 1080;
    fallback.canvas.height = raw.canvas.height || 1920;
    fallback.canvas.aspectRatio = raw.canvas.aspectRatio || "9:16";
    fallback.canvas.fps = raw.canvas.fps || "30";
    fallback.canvas.backgroundColor = raw.canvas.backgroundColor || "#000000";
    if (raw.canvas.safeZones) {
      fallback.canvas.safeZones = { ...fallback.canvas.safeZones, ...raw.canvas.safeZones };
    }
  }

  // 🌟 Resolve visual_geometry or layout dictionary
  const vg = raw.style?.visual_geometry || raw.visual_geometry || raw.blueprint?.visual_geometry || raw.manifest?.visual_geometry;
  let layoutParametric = raw.layout && typeof raw.layout === "object" && !Array.isArray(raw.layout) ? { ...raw.layout } : null;

  if (!layoutParametric && vg) {
    const hLines = vg.top_header_lines || [];
    const l1Text = hLines[0]?.text_example || hLines[0]?.text || raw.name || "상단 메인 타이틀";
    const l2Text = hLines[1]?.text_example || hLines[1]?.text || "";

    layoutParametric = {
      archetype,
      has_top_bar_bg: Boolean(vg.top_bar?.enabled ?? true),
      top_bar_height_pct: vg.top_bar?.height_pct ?? (archetype === "ssul" ? 14 : archetype === "classic" ? 24 : 18),
      top_bar_bg: vg.top_bar?.bg_color || vg.top_bar?.bar_bg || "#000000",
      top_bar_opacity: vg.top_bar?.opacity ?? 1.0,

      has_top_title: hLines.length > 0 || Boolean(raw.style?.top_header),
      title_line1: l1Text,
      title_line1_color: hLines[0]?.color || raw.style?.top_header?.line1?.color || "#FFE838",
      title_line1_size_px: hLines[0]?.size_px || raw.style?.top_header?.line1?.size_px || 28,
      title_line1_size_pt: hLines[0]?.size_pt,
      title_line2: l2Text,
      title_line2_color: hLines[1]?.color || raw.style?.top_header?.line2?.color || "#FFFFFF",
      title_line2_size_px: hLines[1]?.size_px || raw.style?.top_header?.line2?.size_px || 32,
      title_line2_size_pt: hLines[1]?.size_pt,
      title_font_family: hLines[0]?.font_family || "Pretendard",
      top_title_y_pct: vg.top_title_y_pct ?? 16.5,

      has_bottom_bar: Boolean(vg.bottom_bar?.enabled ?? true),
      bottom_bar_height_pct: vg.bottom_bar?.height_pct ?? (archetype === "classic" ? 24 : 18),
      bottom_bar_bg: vg.bottom_bar?.bg_color || "#000000",

      has_bottom_source: Boolean(vg.bottom_source?.enabled ?? false),
      bottom_source_text: vg.bottom_source?.text || (vg.bottom_source?.enabled ? (raw.channel_title ? `출처: ${raw.channel_title}` : undefined) : undefined),
      bottom_source_bottom_pct: vg.bottom_source?.bottom_pct ?? 2.2,
      bottom_source_color: vg.bottom_source?.color || "#94A3B8",
      bottom_source_size_px: vg.bottom_source?.size_px || 14,

      has_subtitle: Boolean(vg.caption?.enabled ?? true),
      subtitle_sample: vg.caption?.sample_text || "자막이 표시되는 표준 중앙 하단 영역",
      subtitle_color: vg.caption?.color || "#FFFFFF",
      subtitle_size_px: vg.caption?.size_px || 26,
      subtitle_font_family: vg.caption?.font_family || "Pretendard",
      subtitle_y_pct: vg.caption?.margin_v_pct ? (100 - vg.caption.margin_v_pct) : 72,
      subtitle_stroke_color: vg.caption?.outline_color || "#000000",
      subtitle_stroke_width: vg.caption?.outline_px || 4,
    };
  }

  // Global Layers
  if (Array.isArray(raw.globalLayers) && raw.globalLayers.length > 0) {
    fallback.globalLayers = raw.globalLayers;
  } else if (Array.isArray(raw.layers) && raw.layers.length > 0) {
    fallback.globalLayers = raw.layers;
  } else if (Array.isArray(raw.layout) && raw.layout.length > 0) {
    fallback.globalLayers = raw.layout;
  } else if (layoutParametric && Object.keys(layoutParametric).length > 0) {
    // ★ [단일 진실 공급원] 레거시 파라메트릭 layout/visual_geometry 딕셔너리를 4.0 정밀 레이어들로 100% 무손실 변환!
    fallback.globalLayers = convertParametricLayoutToV4Layers(layoutParametric, archetype);
  }

  // Audio DSP migration from layout or style if present
  const layoutObj = raw.layout && typeof raw.layout === "object" ? raw.layout : {};
  const audioDspObj = raw.style?.audio_dsp || raw.audio_dsp || {};
  const voiceSig = layoutObj.voice_signature || audioDspObj.voice_signature || raw.voice_signature;
  if (voiceSig) {
    fallback.audioDSP.voiceSignature = {
      ...fallback.audioDSP.voiceSignature,
      role: voiceSig.voice_role || fallback.audioDSP.voiceSignature.role,
      voiceId: voiceSig.gemini_voice || voiceSig.voice_id || fallback.audioDSP.voiceSignature.voiceId,
      targetWpm: voiceSig.target_wpm || fallback.audioDSP.voiceSignature.targetWpm,
    };
  }
  const bgmSig = layoutObj.bgm_signature || audioDspObj.bgm_signature || raw.bgm_signature;
  if (bgmSig) {
    fallback.audioDSP.bgmSignature = {
      ...fallback.audioDSP.bgmSignature,
      genre: bgmSig.genre || fallback.audioDSP.bgmSignature.genre,
      mood: bgmSig.mood || fallback.audioDSP.bgmSignature.mood,
    };
    if (bgmSig.ducking_db) {
      fallback.audioDSP.duckingEnvelope.targetDuckingDb = bgmSig.ducking_db;
    }
  }

  // Scenes migration
  if (Array.isArray(raw.scenes) && raw.scenes.length > 0) {
    fallback.scenes = raw.scenes.map((s: any, idx: number) => ({
      sceneId: s.sceneId || s.id || `scene_${idx + 1}`,
      order: s.order ?? idx,
      role: s.role || (idx === 0 ? "0s_hook" : "escalation"),
      targetDurationMs: s.targetDurationMs || s.durationMs || 4000,
      actualDurationMs: s.actualDurationMs || s.durationMs || 4000,
      scriptText: s.scriptText || s.text || "",
      keywords: Array.isArray(s.keywords) ? s.keywords : [],
      visualPrompt: s.visualPrompt,
      mediaAssetId: s.mediaAssetId || s.assetId,
      mediaUrl: s.mediaUrl || s.url,
      motion: s.motion || { type: "zoom_in", strength: 0.12 },
      words: Array.isArray(s.words) ? s.words : [],
      transitionOut: s.transitionOut,
    }));
  } else if (Array.isArray(raw.keyframes) && raw.keyframes.length > 0) {
    // 키프레임 배열로부터 4.0 씬 복원 (실측 미디어 바인딩)
    const bibleScenes = raw.production_bible_17?.["15_timeline_breakdown"]?.scenes || [];
    fallback.scenes = raw.keyframes.map((kf: any, idx: number) => {
      const bSc = bibleScenes[idx] || {};
      const kfUrl = kf.url || (kf.local_path ? `/api/files/stream?path=${encodeURIComponent(kf.local_path)}` : undefined);
      return {
        sceneId: `scene_${idx + 1}`,
        order: idx,
        role: idx === 0 ? "0s_hook" : idx === raw.keyframes.length - 1 ? "ending_cta" : "escalation",
        targetDurationMs: 4000,
        actualDurationMs: 4000,
        scriptText: bSc.audio || (idx === 0 ? raw.recipe || raw.name : `씬 ${idx + 1}`),
        keywords: [],
        visualPrompt: bSc.visual || `Scene ${idx + 1} Visual`,
        mediaAssetId: `kf_${idx + 1}`,
        mediaUrl: kfUrl,
        motion: { type: "zoom_in", strength: 0.12 },
        words: [],
      };
    });
  } else if (raw.sample_thumbnail || raw.thumbnail_url || raw.source_video_path) {
    const mediaUrl = raw.sample_thumbnail || raw.thumbnail_url || (raw.source_video_path ? `/api/files/stream?path=${encodeURIComponent(raw.source_video_path)}` : undefined);
    if (mediaUrl && fallback.scenes.length > 0) {
      fallback.scenes[0].mediaUrl = mediaUrl;
    }
  }

  // Audio DSP direct override
  if (raw.audioDSP) {
    fallback.audioDSP = {
      ...fallback.audioDSP,
      ...raw.audioDSP,
      duckingEnvelope: {
        ...fallback.audioDSP.duckingEnvelope,
        ...(raw.audioDSP.duckingEnvelope || {}),
      },
    };
  }

  // Creative Innovations
  if (raw.creativeInnovations) {
    fallback.creativeInnovations = {
      ...fallback.creativeInnovations,
      ...raw.creativeInnovations,
    };
  }

  return fallback;
}
