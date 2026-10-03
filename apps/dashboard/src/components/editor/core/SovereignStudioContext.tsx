import React, { createContext, useContext, useState, useMemo, useEffect } from "react";
import { useBlueprint } from "./BlueprintContext";
import { LayerObject, Archetype, TextLayer, ShapeLayer } from "../../../types/blueprintV4";
import { getInspectorGroupsForMode, INSTA_PROFILE_PRESETS, getRandomSatiricalMetadata } from "../../canvas/constants/canvasConstants";
import { createDefaultBlueprintV4 } from "../../../lib/blueprintV4Migrator";
import { toast } from "sonner";

export interface SovereignStudioContextValue {
  // 1층 마스터 탭 & 2층 서브 탭
  activeMasterGroup: "layout" | "text" | "media" | "viral";
  setActiveMasterGroup: (grp: "layout" | "text" | "media" | "viral") => void;
  activeInspectorTab: string;
  setActiveInspectorTab: (tab: string) => void;
  inspectorGroups: Array<{
    id: "layout" | "text" | "media" | "viral";
    label: string;
    icon: string;
    subTabs: Array<{ id: string; label: string }>;
  }>;

  // 좌측 플로팅 인스펙터 상태
  activeFloatingInspector: string;
  setActiveFloatingInspector: (name: string) => void;

  // 뷰포트 줌 & 패닝 상태 (휠 줌 0.2x ~ 4.0x)
  canvasZoom: "fit" | "50" | "75" | "100" | "150" | "200";
  setCanvasZoom: (zoom: "fit" | "50" | "75" | "100" | "150" | "200") => void;
  canvasScale: number;
  setCanvasScale: React.Dispatch<React.SetStateAction<number>>;
  canvasPan: { x: number; y: number };
  setCanvasPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;

  // 인터랙션 핸들러 (단일 클릭 ➔ 우측 포커스, 더블 클릭 ➔ 좌측 팝업)
  handleLayerSingleClick: (layer: LayerObject) => void;
  handleLayerDoubleClick: (layer: LayerObject) => void;

  // 레이어 헬퍼 및 폼팩터 설정 바인딩
  findLayerById: (id: string) => LayerObject | undefined;
  updateLayerById: (id: string, patch: Partial<LayerObject>) => void;
  changeArchetypeMode: (mode: Archetype) => void;

  // 폼팩터 전용 반응형 설정 및 실시간 세터
  titleConfig: any;
  updateTitleConfig: (patch: any) => void;
  titleTransform: { xPct: number; yPct: number; scale: number; rotationDeg: number; zIndex: number };
  setTitleTransform: (patch: any) => void;

  instaConfig: any;
  updateInstaConfig: (patch: any) => void;
  profileTransform: { xPct: number; yPct: number; scale: number; rotationDeg: number; zIndex: number };
  setProfileTransform: (patch: any) => void;

  hasCommentCard: boolean;
  setHasCommentCard: (val: boolean) => void;
  commentCardConfig: any;
  updateCommentCardConfig: (patch: any) => void;
  commentTransform: { xPct: number; yPct: number; scale: number; rotationDeg: number; zIndex: number };
  setCommentTransform: (patch: any) => void;

  hasJab: boolean;
  setHasJab: (val: boolean) => void;
  gunlimboConfig: any;
  updateGunlimboConfig: (patch: any) => void;

  ssulConfig: any;
  updateSsulConfig: (patch: any) => void;

  subtitleConfig: any;
  updateSubtitleConfig: (patch: any) => void;
  subTransform: { xPct: number; yPct: number; scale: number; rotationDeg: number; zIndex: number };
  setSubTransform: (patch: any) => void;

  topBottomBarConfig: any;
  updateTopBottomBarConfig: (patch: any) => void;

  hasBottomSource: boolean;
  setHasBottomSource: (val: boolean) => void;
  sourceCreditConfig: any;
  updateSourceCreditConfig: (patch: any) => void;

  videoCropConfig: any;
  updateVideoCropConfig: (patch: any) => void;

  videoFilterConfig: any;
  updateVideoFilterConfig: (patch: any) => void;
}

const SovereignStudioContext = createContext<SovereignStudioContextValue | null>(null);

export const SovereignStudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { blueprint, setBlueprint, selectedLayerId, setSelectedLayerId } = useBlueprint();
  const currentArchetype: Archetype = blueprint.archetype || "classic";

  // 1층 마스터 탭 & 2층 서브 탭
  const [activeMasterGroup, setActiveMasterGroup] = useState<"layout" | "text" | "media" | "viral">("layout");
  const [activeInspectorTab, setActiveInspectorTab] = useState<string>("template");
  const [activeFloatingInspector, setActiveFloatingInspector] = useState<string>("none");

  // 뷰포트 줌 & 패닝
  const [canvasZoom, setCanvasZoom] = useState<"fit" | "50" | "75" | "100" | "150" | "200">("fit");
  const [canvasScale, setCanvasScale] = useState<number>(1.0);
  const [canvasPan, setCanvasPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 폼팩터별 인스펙터 그룹 계산
  const inspectorGroups = useMemo(() => {
    return getInspectorGroupsForMode(currentArchetype) as any;
  }, [currentArchetype]);

  // 줌 드롭다운 동기화
  useEffect(() => {
    if (canvasZoom === "fit") {
      setCanvasScale(1.0);
      setCanvasPan({ x: 0, y: 0 });
    } else if (canvasZoom === "50") setCanvasScale(0.5);
    else if (canvasZoom === "75") setCanvasScale(0.75);
    else if (canvasZoom === "100") setCanvasScale(1.0);
    else if (canvasZoom === "150") setCanvasScale(1.5);
    else if (canvasZoom === "200") setCanvasScale(2.0);
  }, [canvasZoom]);

  // 레이어 검색 및 업데이트 헬퍼 (전역 Null Safety 보장)
  const layers = useMemo(() => blueprint?.globalLayers || [], [blueprint?.globalLayers]);

  const findLayerById = (id: string): LayerObject | undefined => {
    return layers.find((l) => l.id === id);
  };

  const updateLayerById = (id: string, patch: Partial<LayerObject>) => {
    setBlueprint((prev) => ({
      ...prev,
      globalLayers: (prev?.globalLayers || []).map((l) =>
        l.id === id ? ({ ...l, ...patch } as LayerObject) : l
      ),
    }));
  };

  // 폼팩터 전환
  const changeArchetypeMode = (mode: Archetype) => {
    const newBp = createDefaultBlueprintV4(mode, `${mode.toUpperCase()} 쇼츠 프로젝트`);
    setBlueprint(newBp);
    setActiveInspectorTab("template");
    setActiveMasterGroup("layout");
    toast.success(`'${mode}' 폼팩터로 전환되었습니다.`);
  };

  // -------------------------------------------------------------
  // 1. 대제목 (titleConfig) 반응형 상태 및 동기화 (아키타입별 정밀 타겟팅)
  // -------------------------------------------------------------
  const titleLayer = useMemo(() => {
    if (currentArchetype === "ssul") {
      return (layers.find((l) => l.id === "article_title") ||
              layers.find((l) => l.kind === "text" && !l.id.includes("subtitle") && l.id.includes("article")) ||
              layers.find((l) => l.kind === "text" && !l.id.includes("subtitle") && l.id.includes("title") && !l.id.includes("header"))) as TextLayer | undefined;
    }
    if (currentArchetype === "gunlimbo") {
      return (layers.find((l) => l.id === "breaking_title") ||
              layers.find((l) => l.kind === "text" && !l.id.includes("subtitle") && (l.id.includes("breaking") || l.id.includes("headline")))) as TextLayer | undefined;
    }
    return (layers.find((l) => l.id === "headline_text") ||
            layers.find((l) => l.kind === "text" && !l.id.includes("subtitle") && (l.id.includes("title") || l.id.includes("headline")))) as TextLayer | undefined;
  }, [layers, currentArchetype]);

  const [titleTransform, setTitleTransformState] = useState({
    xPct: 50,
    yPct: 15.0,
    scale: 1.0,
    rotationDeg: 0,
    zIndex: 40,
  });

  const setTitleTransform = (patch: any) => {
    setTitleTransformState((prev) => ({ ...prev, ...patch }));
    if (titleLayer) {
      const nx = patch.xPct !== undefined ? (patch.xPct / 100) * blueprint.canvas.width : titleLayer.transform.x;
      const ny = patch.yPct !== undefined ? (patch.yPct / 100) * blueprint.canvas.height : titleLayer.transform.y;
      updateLayerById(titleLayer.id, {
        transform: {
          ...titleLayer.transform,
          x: nx,
          y: ny,
          scale: patch.scale ?? titleLayer.transform.scale,
          rotation: patch.rotationDeg ?? titleLayer.transform.rotation,
        },
      });
    }
  };

  const [rawTitleConfig, setRawTitleConfig] = useState<any>({
    hasTopTitle: true,
    titleLinesMode: "double",
    titleLine1: "충격 실화 사건",
    titleLine2: "상상도 못한 반전 결말",
    titleLine1Color: "#FFFFFF",
    titleLine2Color: "#FFE500",
    titleLine1SizePx: 38,
    titleLine2SizePx: 48,
    titleFontFamily: "Pretendard",
    titleStroke: true,
    titleStrokeWidth: 2,
    titleStrokeColor: "#000000",
    titleShadow: true,
    titleShadowBlur: 8,
    titleShadowColor: "rgba(0,0,0,0.9)",
    titleLetterSpacing: -1,
    titleLineHeight: 1.2,
    titleAlign: "center",
    hasTitleBadge: true,
    titleBadgeText: "속보",
    titleBadgeBg: "#EF4444",
    titleBadgeColor: "#FFFFFF",
    titleBadgeSizePx: 12,
    titleBadgeRadius: 4,
  });

  const titleConfig = useMemo(() => {
    if (!titleLayer) return rawTitleConfig;
    const multi = titleLayer.multiLineStyles || [];
    const lines = (titleLayer.content || "").split("\n");
    return {
      ...rawTitleConfig,
      hasTopTitle: !titleLayer.hidden,
      titleLinesMode: lines.length > 1 ? "double" : "single",
      titleLine1: lines[0] || rawTitleConfig.titleLine1 || "",
      titleLine2: lines[1] || rawTitleConfig.titleLine2 || "",
      titleLine1Color: multi[0]?.fontColor || titleLayer.fontColor || rawTitleConfig.titleLine1Color,
      titleLine2Color: multi[1]?.fontColor || rawTitleConfig.titleLine2Color,
      titleLine1SizePx: multi[0]?.fontSize || titleLayer.fontSize || rawTitleConfig.titleLine1SizePx,
      titleLine2SizePx: multi[1]?.fontSize || rawTitleConfig.titleLine2SizePx,
      titleFontFamily: titleLayer.fontFamily || rawTitleConfig.titleFontFamily,
      titleStroke: !!titleLayer.stroke && (titleLayer.stroke.width > 0),
      titleStrokeWidth: titleLayer.stroke?.width || rawTitleConfig.titleStrokeWidth,
      titleStrokeColor: titleLayer.stroke?.color || rawTitleConfig.titleStrokeColor,
      titleShadow: !!titleLayer.shadow,
      titleShadowBlur: titleLayer.shadow?.blur || rawTitleConfig.titleShadowBlur,
      titleShadowColor: titleLayer.shadow?.color || rawTitleConfig.titleShadowColor,
      titleLetterSpacing: titleLayer.letterSpacing !== undefined ? titleLayer.letterSpacing : rawTitleConfig.titleLetterSpacing,
      titleLineHeight: titleLayer.lineHeight || rawTitleConfig.titleLineHeight,
      titleAlign: titleLayer.textAlign || rawTitleConfig.titleAlign,
    };
  }, [titleLayer, rawTitleConfig]);

  const updateTitleConfig = (patchOrUpdater: any) => {
    setRawTitleConfig((prev: any) => {
      const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(prev) : patchOrUpdater;
      return { ...prev, ...patch };
    });

    if (titleLayer) {
      const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(rawTitleConfig) : patchOrUpdater;
      const next = { ...rawTitleConfig, ...patch };
      const curLines = (titleLayer.content || "").split("\n");
      const l1 = next.titleLine1 !== undefined ? next.titleLine1 : curLines[0] || "";
      const l2 = next.titleLine2 !== undefined ? next.titleLine2 : curLines[1] || "";
      const isDouble = next.titleLinesMode === "double" || (next.titleLinesMode === undefined && l2.length > 0);
      const newContent = isDouble && l2 ? `${l1}\n${l2}` : l1;

      const newMulti = [
        {
          fontSize: next.titleLine1SizePx || 38,
          fontColor: next.titleLine1Color || "#FFFFFF",
        },
        {
          fontSize: next.titleLine2SizePx || 48,
          fontColor: next.titleLine2Color || "#FFE500",
        },
      ];

      updateLayerById(titleLayer.id, {
        hidden: next.hasTopTitle !== undefined ? !next.hasTopTitle : titleLayer.hidden,
        content: newContent,
        fontFamily: next.titleFontFamily || titleLayer.fontFamily,
        textAlign: next.titleAlign || titleLayer.textAlign,
        letterSpacing: next.titleLetterSpacing !== undefined ? next.titleLetterSpacing : titleLayer.letterSpacing,
        lineHeight: next.titleLineHeight !== undefined ? next.titleLineHeight : titleLayer.lineHeight,
        multiLineStyles: newMulti,
        stroke: next.titleStroke !== undefined
          ? next.titleStroke
            ? { width: next.titleStrokeWidth || 2, color: next.titleStrokeColor || "#000000" }
            : undefined
          : titleLayer.stroke,
        shadow: next.titleShadow !== undefined
          ? next.titleShadow
            ? { blur: next.titleShadowBlur || 8, color: next.titleShadowColor || "rgba(0,0,0,0.9)", offsetX: 0, offsetY: 2 }
            : undefined
          : titleLayer.shadow,
      });
    }
  };

  // -------------------------------------------------------------
  // 2. 인스타 프로필 (instaConfig) 반응형 상태 및 동기화
  // -------------------------------------------------------------
  const profileHeader = layers.find((l) => l.id.includes("profile")) as ShapeLayer | undefined;
  const profileText = layers.find((l) => l.kind === "text" && l.id.includes("profile")) as TextLayer | undefined;
  const holeMaskLayer = layers.find((l) => l.id.includes("hole") || l.id.includes("guide")) as ShapeLayer | undefined;

  const [profileTransform, setProfileTransformState] = useState({
    xPct: 6.0,
    yPct: 5.5,
    scale: 1.0,
    rotationDeg: 0,
    zIndex: 45,
  });

  const setProfileTransform = (patch: any) => {
    setProfileTransformState((prev) => ({ ...prev, ...patch }));
    if (profileHeader) {
      updateLayerById(profileHeader.id, {
        transform: {
          ...profileHeader.transform,
          scale: patch.scale ?? profileHeader.transform.scale,
          rotation: patch.rotationDeg ?? profileHeader.transform.rotation,
        },
      });
    }
  };

  const [rawInstaConfig, setRawInstaConfig] = useState<any>({
    profileName: "유머보따리",
    profileHandle: "@viral_shorts",
    profileAvatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=humor",
    isVerified: true,
    titleText: "인스타 감성 숏폼",
    holeRatio: "1:1",
    holeWidthPct: 88,
    holeHeightPct: 46,
    holeYPct: 45,
    holeRoundness: 24,
    holeBorderWidth: 1,
    holeBorderColor: "#E2E8F0",
    holeShadow: true,
    bgColor: "#FFFFFF",
    subFont: "Pretendard",
    subColor: "#18181B",
  });

  const instaConfig = useMemo(() => {
    return {
      ...rawInstaConfig,
      profileHandle: profileText?.content ? profileText.content.split(" ")[1] || rawInstaConfig.profileHandle : rawInstaConfig.profileHandle,
      titleText: titleLayer?.content || rawInstaConfig.titleText,
      bgColor: profileHeader?.fillColor || rawInstaConfig.bgColor,
    };
  }, [profileText, profileHeader, titleLayer, rawInstaConfig]);

  const updateInstaConfig = (patchOrUpdater: any) => {
    setRawInstaConfig((prev: any) => {
      const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(prev) : patchOrUpdater;
      return { ...prev, ...patch };
    });

    const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(rawInstaConfig) : patchOrUpdater;
    const next = { ...rawInstaConfig, ...patch };

    if (profileText && next.profileHandle) {
      updateLayerById(profileText.id, {
        content: `📸 ${next.profileHandle}  ✓  •  추천 베스트 댓글`,
      });
    }
    if (profileHeader && next.bgColor) {
      updateLayerById(profileHeader.id, { fillColor: next.bgColor });
    }
    if (holeMaskLayer && next.holeRoundness !== undefined) {
      updateLayerById(holeMaskLayer.id, { borderRadius: next.holeRoundness });
    }
  };

  // -------------------------------------------------------------
  // 3. 댓글 카드 (commentCardConfig) 반응형 상태 및 동기화
  // -------------------------------------------------------------
  const commentCardLayer = layers.find((l) => l.id.includes("comment_card")) as ShapeLayer | undefined;
  const commentBodyLayer = layers.find((l) => l.id.includes("comment_body")) as TextLayer | undefined;
  const commentMetaLayer = layers.find((l) => l.id.includes("comment_meta")) as TextLayer | undefined;

  const [hasCommentCard, setHasCommentCardState] = useState(true);

  const setHasCommentCard = (val: boolean) => {
    setHasCommentCardState(val);
    [commentCardLayer, commentBodyLayer, commentMetaLayer].forEach((layer) => {
      if (layer) updateLayerById(layer.id, { hidden: !val });
    });
  };

  const [commentTransform, setCommentTransformState] = useState({
    xPct: 50,
    yPct: 82.0,
    scale: 0.95,
    rotationDeg: 0,
    zIndex: 45,
  });

  const setCommentTransform = (patch: any) => {
    setCommentTransformState((prev) => ({ ...prev, ...patch }));
    if (commentCardLayer) {
      updateLayerById(commentCardLayer.id, {
        transform: {
          ...commentCardLayer.transform,
          scale: patch.scale ?? commentCardLayer.transform.scale,
          rotation: patch.rotationDeg ?? commentCardLayer.transform.rotation,
        },
      });
    }
  };

  const [rawCommentCardConfig, setRawCommentCardConfig] = useState<any>({
    author: "스마트쇼츠_크리에이터",
    handle: "@viral_shorts_pro",
    text: "이거 보고 제 인생이 바뀌었습니다 ㄷㄷ",
    likes: "1.4만",
    timeText: "방금 전",
    theme: "insta",
    bgColor: "#FFFFFF",
    textColor: "#18181B",
    borderRadius: 16,
    borderEnabled: true,
    borderColor: "#E2E8F0",
    borderWidth: 1,
    avatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=creator",
    align: "left",
    shadowEnabled: true,
    shadowBlur: 12,
    shadowColor: "rgba(0,0,0,0.1)",
  });

  const commentCardConfig = useMemo(() => {
    return {
      ...rawCommentCardConfig,
      text: commentBodyLayer?.content || rawCommentCardConfig.text,
      bgColor: commentCardLayer?.fillColor || rawCommentCardConfig.bgColor,
      textColor: commentBodyLayer?.fontColor || rawCommentCardConfig.textColor,
      borderRadius: commentCardLayer?.borderRadius || rawCommentCardConfig.borderRadius,
      borderColor: commentCardLayer?.borderColor || rawCommentCardConfig.borderColor,
      borderWidth: commentCardLayer?.borderWidth || rawCommentCardConfig.borderWidth,
    };
  }, [commentCardLayer, commentBodyLayer, rawCommentCardConfig]);

  const updateCommentCardConfig = (patchOrUpdater: any) => {
    setRawCommentCardConfig((prev: any) => {
      const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(prev) : patchOrUpdater;
      return { ...prev, ...patch };
    });

    const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(rawCommentCardConfig) : patchOrUpdater;
    const next = { ...rawCommentCardConfig, ...patch };

    if (commentBodyLayer && next.text !== undefined) {
      updateLayerById(commentBodyLayer.id, {
        content: next.text,
        fontColor: next.textColor || commentBodyLayer.fontColor,
      });
    }
    if (commentMetaLayer && next.likes !== undefined) {
      updateLayerById(commentMetaLayer.id, {
        content: `❤️ ${next.likes}  •  답글 1,420개  •  공유`,
      });
    }
    if (commentCardLayer) {
      updateLayerById(commentCardLayer.id, {
        fillColor: next.bgColor || commentCardLayer.fillColor,
        borderRadius: next.borderRadius || commentCardLayer.borderRadius,
        borderColor: next.borderColor || commentCardLayer.borderColor,
        borderWidth: next.borderWidth || commentCardLayer.borderWidth,
      });
    }
  };

  // -------------------------------------------------------------
  // 4. 군림보 훅 밴드 (gunlimboConfig) 반응형 상태 및 동기화
  // -------------------------------------------------------------
  const hookBandLayer = layers.find((l) => l.id.includes("hook_band")) as ShapeLayer | undefined;
  const hookTextLayer = layers.find((l) => l.id.includes("hook_text")) as TextLayer | undefined;

  const [hasJab, setHasJabState] = useState(true);

  const setHasJab = (val: boolean) => {
    setHasJabState(val);
    [hookBandLayer, hookTextLayer].forEach((layer) => {
      if (layer) updateLayerById(layer.id, { hidden: !val });
    });
  };

  const [rawGunlimboConfig, setRawGunlimboConfig] = useState<any>({
    titleLine1: "충격 실화 사건",
    titleLine2: "상상도 못한 반전 결말",
    titleLine1Color: "#FFFFFF",
    titleLine2Color: "#FFE500",
    titleFontSize: 38,
    keepTitleThroughout: true,
    hookPhrase: "⚡ 0초 시선강탈 훅 카피가 여기에 들어갑니다",
    hookBgColor: "#FFFFFF",
    hookTextColor: "#000000",
    hookFontSize: 44,
    hookFont: "Pretendard",
    hookBold: true,
    hookItalic: false,
    hookAlign: "center",
    hookLetterSpacing: -1,
    hookLineHeight: 1.25,
    strokeEnabled: false,
    strokeWidth: 2,
    strokeColor: "#000000",
    shadowEnabled: false,
    shadowBlur: 4,
    shadowColor: "#000000",
    introDurationSec: 2.5,
    showGuidelines: true,
  });

  const gunlimboConfig = useMemo(() => {
    const lines = (titleLayer?.content || "").split("\n");
    return {
      ...rawGunlimboConfig,
      titleLine1: lines[0] || rawGunlimboConfig.titleLine1,
      titleLine2: lines[1] || rawGunlimboConfig.titleLine2,
      titleLine1Color: titleLayer?.multiLineStyles?.[0]?.fontColor || rawGunlimboConfig.titleLine1Color,
      titleLine2Color: titleLayer?.multiLineStyles?.[1]?.fontColor || rawGunlimboConfig.titleLine2Color,
      titleFontSize: titleLayer?.fontSize || rawGunlimboConfig.titleFontSize,
      hookPhrase: hookTextLayer?.content || rawGunlimboConfig.hookPhrase,
      hookBgColor: hookBandLayer?.fillColor || rawGunlimboConfig.hookBgColor,
      hookTextColor: hookTextLayer?.fontColor || rawGunlimboConfig.hookTextColor,
      hookFontSize: hookTextLayer?.fontSize || rawGunlimboConfig.hookFontSize,
    };
  }, [titleLayer, hookBandLayer, hookTextLayer, rawGunlimboConfig]);

  const updateGunlimboConfig = (patchOrUpdater: any) => {
    setRawGunlimboConfig((prev: any) => {
      const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(prev) : patchOrUpdater;
      return { ...prev, ...patch };
    });

    const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(rawGunlimboConfig) : patchOrUpdater;
    const next = { ...rawGunlimboConfig, ...patch };

    if (hookTextLayer && next.hookPhrase !== undefined) {
      updateLayerById(hookTextLayer.id, {
        content: next.hookPhrase,
        fontColor: next.hookTextColor || hookTextLayer.fontColor,
        fontSize: next.hookFontSize || hookTextLayer.fontSize,
        fontFamily: next.hookFont || hookTextLayer.fontFamily,
      });
    }
    if (hookBandLayer && next.hookBgColor !== undefined) {
      updateLayerById(hookBandLayer.id, { fillColor: next.hookBgColor });
    }
  };

  // -------------------------------------------------------------
  // 5. 썰형 객체 (ssulConfig: 헤더, 메타, 구분선, 페페 밈)
  // -------------------------------------------------------------
  const ssulHeaderBar = layers.find((l) => l.id.includes("header_bar")) as ShapeLayer | undefined;
  const ssulHeaderTitle = layers.find((l) => l.id.includes("header_title")) as TextLayer | undefined;
  const ssulMetaLayer = layers.find((l) => l.id.includes("meta")) as TextLayer | undefined;
  const ssulMemeFrame = layers.find((l) => l.id.includes("meme")) as ShapeLayer | undefined;

  const [rawSsulConfig, setRawSsulConfig] = useState<any>({
    ssulHeader: {
      enabled: true,
      bgColor: "#F7CF46",
      heightMultiplier: 1.0,
      text: "실시간 베스트",
      textColor: "#18181B",
      font: "Pretendard",
      fontSizeMultiplier: 1.0,
      bold: true,
      italic: false,
      leftIcon: "arrow_back",
      rightIcon: "menu",
      borderRadius: 0,
      letterSpacing: 0,
      lineHeight: 1.2,
    },
    postTitle: {
      text: "오늘자 역대급 실화 사건 🔥",
      color: "#18181B",
      font: "Pretendard",
      fontSizeMultiplier: 1.1,
      align: "left",
      bold: true,
      italic: false,
      letterSpacing: -0.5,
      lineHeight: 1.3,
    },
    metadata: {
      showAuthor: true,
      authorText: "익명",
      showTime: true,
      timeText: "방금 전",
      showViews: true,
      viewsText: "조회 4.2만",
      separator: "dot",
      color: "#6B7280",
      font: "Pretendard",
      fontSizeMultiplier: 1.0,
      bold: false,
    },
    divider: {
      enabled: true,
      style: "solid",
      thickness: 1,
      widthPercent: 100,
      color: "#E5E7EB",
      opacity: 100,
    },
    author: "익명",
    timeText: "방금 전",
    viewsText: "조회 4.2만",
    textMode: "accumulate",
    memeType: "pepe",
    memeEmotion: "happy",
    memeAliveMotion: true,
  });

  const ssulConfig = useMemo(() => {
    return {
      ...rawSsulConfig,
      author: rawSsulConfig.metadata?.authorText || rawSsulConfig.author,
      timeText: rawSsulConfig.metadata?.timeText || rawSsulConfig.timeText,
      viewsText: rawSsulConfig.metadata?.viewsText || rawSsulConfig.viewsText,
      ssulHeader: {
        ...rawSsulConfig.ssulHeader,
        text: ssulHeaderTitle?.content ? ssulHeaderTitle.content.replace(/[←⋮]/g, "").trim() : rawSsulConfig.ssulHeader.text,
        bgColor: ssulHeaderBar?.fillColor || rawSsulConfig.ssulHeader.bgColor,
      },
    };
  }, [ssulHeaderBar, ssulHeaderTitle, rawSsulConfig]);

  const updateSsulConfig = (patchOrUpdater: any) => {
    setRawSsulConfig((prev: any) => {
      const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(prev) : patchOrUpdater;
      return { ...prev, ...patch };
    });

    const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(rawSsulConfig) : patchOrUpdater;
    const next = { ...rawSsulConfig, ...patch };

    if (ssulHeaderTitle && next.ssulHeader?.text) {
      updateLayerById(ssulHeaderTitle.id, {
        content: `←   🔥 ${next.ssulHeader.text}   ⋮`,
      });
    }
    if (ssulHeaderBar && next.ssulHeader?.bgColor) {
      updateLayerById(ssulHeaderBar.id, { fillColor: next.ssulHeader.bgColor });
    }
    if (ssulMetaLayer && next.metadata) {
      updateLayerById(ssulMetaLayer.id, {
        content: `${next.metadata.authorText || "익명"}  •  ${next.metadata.timeText || "방금 전"}  •  ${next.metadata.viewsText || "조회 3.8만"}`,
      });
    }
  };

  // -------------------------------------------------------------
  // 6. 자막 (subtitleConfig) 반응형 상태 및 동기화
  // -------------------------------------------------------------
  const subtitleLayer = layers.find((l) => l.id.includes("subtitle")) as TextLayer | undefined;

  const [subTransform, setSubTransformState] = useState({
    xPct: 50,
    yPct: 75.0,
    scale: 1.0,
    rotationDeg: 0,
    zIndex: 30,
  });

  const setSubTransform = (patch: any) => {
    setSubTransformState((prev) => ({ ...prev, ...patch }));
    if (subtitleLayer) {
      updateLayerById(subtitleLayer.id, {
        transform: {
          ...subtitleLayer.transform,
          scale: patch.scale ?? subtitleLayer.transform.scale,
          rotation: patch.rotationDeg ?? subtitleLayer.transform.rotation,
        },
      });
    }
  };

  const [rawSubtitleConfig, setRawSubtitleConfig] = useState<any>({
    textColor: "#FFFFFF",
    fontSize: 42,
    fontFamily: "NotoSansKR-Bold",
    strokeColor: "#000000",
    strokeWidth: 4,
    shadowColor: "rgba(0,0,0,0.8)",
    shadowBlur: 8,
    accumulateMode: true,
  });

  const subtitleConfig = useMemo(() => {
    return {
      ...rawSubtitleConfig,
      textColor: subtitleLayer?.fontColor || rawSubtitleConfig.textColor,
      fontSize: subtitleLayer?.fontSize || rawSubtitleConfig.fontSize,
      fontFamily: subtitleLayer?.fontFamily || rawSubtitleConfig.fontFamily,
      strokeColor: subtitleLayer?.stroke?.color || rawSubtitleConfig.strokeColor,
      strokeWidth: subtitleLayer?.stroke?.width || rawSubtitleConfig.strokeWidth,
      shadowColor: subtitleLayer?.shadow?.color || rawSubtitleConfig.shadowColor,
      shadowBlur: subtitleLayer?.shadow?.blur || rawSubtitleConfig.shadowBlur,
      accumulateMode: subtitleLayer?.accumulateMode ?? rawSubtitleConfig.accumulateMode,
    };
  }, [subtitleLayer, rawSubtitleConfig]);

  const updateSubtitleConfig = (patchOrUpdater: any) => {
    setRawSubtitleConfig((prev: any) => {
      const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(prev) : patchOrUpdater;
      return { ...prev, ...patch };
    });

    if (subtitleLayer) {
      const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(rawSubtitleConfig) : patchOrUpdater;
      const next = { ...rawSubtitleConfig, ...patch };

      updateLayerById(subtitleLayer.id, {
        fontColor: next.textColor || subtitleLayer.fontColor,
        fontSize: next.fontSize || subtitleLayer.fontSize,
        fontFamily: next.fontFamily || subtitleLayer.fontFamily,
        accumulateMode: next.accumulateMode ?? subtitleLayer.accumulateMode,
        stroke: next.strokeWidth
          ? { width: next.strokeWidth, color: next.strokeColor || "#000000" }
          : subtitleLayer.stroke,
        shadow: next.shadowBlur
          ? { blur: next.shadowBlur, color: next.shadowColor || "rgba(0,0,0,0.8)", offsetX: 0, offsetY: 2 }
          : subtitleLayer.shadow,
      });
    }
  };

  // -------------------------------------------------------------
  // 7. 상하단바 (topBottomBarConfig)
  // -------------------------------------------------------------
  const topBarLayer = layers.find((l) => l.id.includes("top_letterbox") || l.id.includes("top_bar")) as ShapeLayer | undefined;
  const bottomBarLayer = layers.find((l) => l.id.includes("bottom_letterbox") || l.id.includes("bottom_bar")) as ShapeLayer | undefined;

  const [topBottomBarConfig, setTopBottomBarConfig] = useState({
    hasTopBarBg: true,
    topBarHeightPct: 18,
    topBarBg: "#000000",
    topBarOpacity: 1,
    topBarRadius: 0,
    hasBottomBarBg: true,
    bottomBarHeightPct: 15,
    bottomBarBg: "#000000",
    bottomBarOpacity: 1,
    bottomBarRadius: 0,
  });

  const updateTopBottomBarConfig = (patchOrUpdater: any) => {
    setTopBottomBarConfig((prev) => {
      const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(prev) : patchOrUpdater;
      const next = { ...prev, ...patch };
      if (topBarLayer && next.topBarBg) {
        updateLayerById(topBarLayer.id, { fillColor: next.topBarBg });
      }
      if (bottomBarLayer && next.bottomBarBg) {
        updateLayerById(bottomBarLayer.id, { fillColor: next.bottomBarBg });
      }
      return next;
    });
  };

  // -------------------------------------------------------------
  // 8. 하단 출처 (sourceCreditConfig)
  // -------------------------------------------------------------
  const sourceLayer = layers.find((l) => l.id.includes("source_credit")) as TextLayer | undefined;
  const [hasBottomSource, setHasBottomSourceState] = useState(true);

  const setHasBottomSource = (val: boolean) => {
    setHasBottomSourceState(val);
    if (sourceLayer) updateLayerById(sourceLayer.id, { hidden: !val });
  };

  const [sourceCreditConfig, setSourceCreditConfig] = useState({
    hasBottomSource: true,
    bottomSourceText: "출처: 온라인 커뮤니티",
    bottomSourceColor: "#94A3B8",
    bottomSourceSizePx: 12,
    bottomSourceFontFamily: "Pretendard",
    bottomSourceBold: false,
    bottomSourceItalic: false,
    bottomSourceAlign: "center" as const,
    bottomSourceBottomPct: 3.5,
    bottomSourceStroke: false,
    bottomSourceShadow: true,
  });

  const updateSourceCreditConfig = (patchOrUpdater: any) => {
    setSourceCreditConfig((prev) => {
      const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(prev) : patchOrUpdater;
      const next = { ...prev, ...patch };
      if (sourceLayer && next.bottomSourceText) {
        updateLayerById(sourceLayer.id, {
          content: next.bottomSourceText,
          fontColor: next.bottomSourceColor || sourceLayer.fontColor,
        });
      }
      return next;
    });
  };

  // -------------------------------------------------------------
  // 9. 비디오 크롭 및 영상 연출 필터
  // -------------------------------------------------------------
  const [videoCropConfig, setVideoCropConfig] = useState({
    fitMode: "sandwich",
    blurBg: false,
    focusXPct: 50,
    focusYPct: 50,
    zoomScale: 100,
    rotationDeg: 0,
    horizontalFlip: false,
    verticalFlip: false,
    videoCropTopPct: 0,
    videoCropBottomPct: 0,
    videoBorderRadius: 0,
    videoBorderEnabled: false,
    videoBorderWidth: 1,
    videoBorderColor: "#FFFFFF",
    videoShadowEnabled: false,
    videoShadowBlur: 20,
    videoShadowColor: "rgba(0,0,0,0.5)",
    videoPaddingPct: 0,
  });

  const updateVideoCropConfig = (patchOrUpdater: any) => {
    setVideoCropConfig((prev) => ({
      ...prev,
      ...(typeof patchOrUpdater === "function" ? patchOrUpdater(prev) : patchOrUpdater),
    }));
  };

  const [videoFilterConfig, setVideoFilterConfig] = useState({
    preset: "none",
    brightness: 100,
    contrast: 100,
    saturation: 100,
    warmth: 0,
    temperature: 0,
    filmGrain: 0,
    vignette: 0,
  });

  const updateVideoFilterConfig = (patchOrUpdater: any) => {
    setVideoFilterConfig((prev) => ({
      ...prev,
      ...(typeof patchOrUpdater === "function" ? patchOrUpdater(prev) : patchOrUpdater),
    }));
  };

  // -------------------------------------------------------------
  // 10. 단일 클릭: 우측 인스펙터 해당 탭 및 마스터 그룹으로 자동 동기화 포커스
  // -------------------------------------------------------------
  const handleLayerSingleClick = (layer: LayerObject) => {
    setSelectedLayerId(layer.id);
    const id = layer.id.toLowerCase();
    let targetTab = "title";

    if (id.includes("profile")) {
      targetTab = "profile";
    } else if (id.includes("comment")) {
      targetTab = "commentCard";
    } else if (id.includes("header")) {
      targetTab = "ssulHeader";
    } else if (id.includes("meta")) {
      targetTab = "metadata";
    } else if (id.includes("divider")) {
      targetTab = "divider";
    } else if (id.includes("hook")) {
      targetTab = "jabHook";
    } else if (id.includes("subtitle")) {
      targetTab = "style";
    } else if (id.includes("source")) {
      targetTab = "sourceCredit";
    } else if (id.includes("bar") || id.includes("letterbox")) {
      targetTab = "topBottomBar";
    } else if (id.includes("video") || id.includes("hole") || id.includes("guide")) {
      targetTab = "videoCrop";
    } else if (id.includes("meme")) {
      targetTab = currentArchetype === "ssul" ? "metadata" : "template";
    } else if (id.includes("title") || id.includes("headline") || id.includes("breaking") || id.includes("article")) {
      targetTab = currentArchetype === "ssul" ? "postTitle" : "title";
    } else {
      targetTab = "title";
    }

    setActiveInspectorTab(targetTab);

    // 해당 서브탭이 속한 마스터 그룹을 inspectorGroups에서 자동 역추적하여 활성화
    const matchedGroup = inspectorGroups.find((g: any) =>
      g.subTabs.some((t: any) => t.id === targetTab || (t.id === "title" && targetTab === "postTitle"))
    );
    if (matchedGroup) {
      setActiveMasterGroup(matchedGroup.id as any);
    } else {
      setActiveMasterGroup("text");
    }
  };

  // -------------------------------------------------------------
  // 11. 더블 클릭: 좌측 플로팅 인스펙터 즉시 팝업
  // -------------------------------------------------------------
  const handleLayerDoubleClick = (layer: LayerObject) => {
    setSelectedLayerId(layer.id);
    const id = layer.id.toLowerCase();

    if (id.includes("profile")) {
      setActiveFloatingInspector("instaProfile");
    } else if (id.includes("comment")) {
      setActiveFloatingInspector("commentCard");
    } else if (id.includes("header")) {
      setActiveFloatingInspector("ssulHeader");
    } else if (id.includes("meta")) {
      setActiveFloatingInspector("metadata");
    } else if (id.includes("divider")) {
      setActiveFloatingInspector("divider");
    } else if (id.includes("hook")) {
      setActiveFloatingInspector(currentArchetype === "gunlimbo" ? "gunlimboHookBand" : "jabHook");
    } else if (id.includes("subtitle")) {
      setActiveFloatingInspector(currentArchetype === "ssul" ? "ssulSubtitle" : "subtitle");
    } else if (id.includes("source")) {
      setActiveFloatingInspector("sourceCredit");
    } else if (id.includes("bar") || id.includes("letterbox")) {
      setActiveFloatingInspector("topBottomBar");
    } else if (id.includes("video") || id.includes("hole") || id.includes("guide")) {
      setActiveFloatingInspector("videoCrop");
    } else if (id.includes("title") || id.includes("headline") || id.includes("breaking") || id.includes("article")) {
      setActiveFloatingInspector(currentArchetype === "ssul" ? "postTitle" : "title");
    } else {
      setActiveFloatingInspector("title");
    }
  };

  return (
    <SovereignStudioContext.Provider
      value={{
        activeMasterGroup,
        setActiveMasterGroup,
        activeInspectorTab,
        setActiveInspectorTab,
        inspectorGroups,
        activeFloatingInspector,
        setActiveFloatingInspector,
        canvasZoom,
        setCanvasZoom,
        canvasScale,
        setCanvasScale,
        canvasPan,
        setCanvasPan,
        handleLayerSingleClick,
        handleLayerDoubleClick,
        findLayerById,
        updateLayerById,
        changeArchetypeMode,
        titleConfig,
        updateTitleConfig,
        titleTransform,
        setTitleTransform,
        instaConfig,
        updateInstaConfig,
        profileTransform,
        setProfileTransform,
        hasCommentCard,
        setHasCommentCard,
        commentCardConfig,
        updateCommentCardConfig,
        commentTransform,
        setCommentTransform,
        hasJab,
        setHasJab,
        gunlimboConfig,
        updateGunlimboConfig,
        ssulConfig,
        updateSsulConfig,
        subtitleConfig,
        updateSubtitleConfig,
        subTransform,
        setSubTransform,
        topBottomBarConfig,
        updateTopBottomBarConfig,
        hasBottomSource,
        setHasBottomSource,
        sourceCreditConfig,
        updateSourceCreditConfig,
        videoCropConfig,
        updateVideoCropConfig,
        videoFilterConfig,
        updateVideoFilterConfig,
      }}
    >
      {children}
    </SovereignStudioContext.Provider>
  );
};

export const useSovereignStudio = (): SovereignStudioContextValue | null => {
  return useContext(SovereignStudioContext);
};
