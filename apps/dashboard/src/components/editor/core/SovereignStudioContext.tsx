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

  // 폼팩터 전용 간편 업데이트 함수들
  titleConfig: any;
  updateTitleConfig: (patch: any) => void;
  instaConfig: any;
  updateInstaConfig: (patch: any) => void;
  commentCardConfig: any;
  updateCommentCardConfig: (patch: any) => void;
  gunlimboConfig: any;
  updateGunlimboConfig: (patch: any) => void;
  ssulConfig: any;
  updateSsulConfig: (patch: any) => void;
  subtitleConfig: any;
  updateSubtitleConfig: (patch: any) => void;
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

  // 레이어 검색 헬퍼
  const findLayerById = (id: string): LayerObject | undefined => {
    return blueprint.globalLayers.find((l) => l.id === id);
  };

  const updateLayerById = (id: string, patch: Partial<LayerObject>) => {
    setBlueprint({
      ...blueprint,
      globalLayers: blueprint.globalLayers.map((l) =>
        l.id === id ? ({ ...l, ...patch } as LayerObject) : l
      ),
    });
  };

  // 폼팩터 전환
  const changeArchetypeMode = (mode: Archetype) => {
    const newBp = createDefaultBlueprintV4(mode, `${mode.toUpperCase()} 쇼츠 프로젝트`);
    setBlueprint(newBp);
    setActiveInspectorTab("template");
    setActiveMasterGroup("layout");
    toast.success(`'${mode}' 폼팩터로 전환되었습니다.`);
  };

  // 단일 클릭: 우측 인스펙터 해당 탭으로 자동 포커스
  const handleLayerSingleClick = (layer: LayerObject) => {
    setSelectedLayerId(layer.id);
    const id = layer.id;

    if (id.includes("profile")) {
      setActiveMasterGroup("text");
      setActiveInspectorTab("profile");
    } else if (id.includes("comment")) {
      setActiveMasterGroup("text");
      setActiveInspectorTab("commentCard");
    } else if (id.includes("title") || id.includes("headline")) {
      setActiveMasterGroup("text");
      setActiveInspectorTab(currentArchetype === "ssul" ? "postTitle" : "title");
    } else if (id.includes("hook")) {
      setActiveMasterGroup("text");
      setActiveInspectorTab("jabHook");
    } else if (id.includes("subtitle")) {
      setActiveMasterGroup("text");
      setActiveInspectorTab("style");
    } else if (id.includes("header")) {
      setActiveMasterGroup("text");
      setActiveInspectorTab("ssulHeader");
    } else if (id.includes("meta")) {
      setActiveMasterGroup("text");
      setActiveInspectorTab("metadata");
    } else if (id.includes("source")) {
      setActiveMasterGroup("text");
      setActiveInspectorTab("sourceCredit");
    } else if (id.includes("video") || id.includes("hole")) {
      setActiveMasterGroup("text");
      setActiveInspectorTab("videoCrop");
    }
  };

  // 더블 클릭: 좌측 플로팅 인스펙터 즉시 팝업
  const handleLayerDoubleClick = (layer: LayerObject) => {
    setSelectedLayerId(layer.id);
    const id = layer.id;

    if (id.includes("title") || id.includes("headline")) {
      setActiveFloatingInspector(currentArchetype === "ssul" ? "postTitle" : "title");
    } else if (id.includes("comment")) {
      setActiveFloatingInspector("commentCard");
    } else if (id.includes("profile")) {
      setActiveFloatingInspector("instaProfile");
    } else if (id.includes("hook")) {
      setActiveFloatingInspector(currentArchetype === "gunlimbo" ? "gunlimboHookBand" : "jabHook");
    } else if (id.includes("subtitle")) {
      setActiveFloatingInspector(currentArchetype === "ssul" ? "ssulSubtitle" : "subtitle");
    } else if (id.includes("header")) {
      setActiveFloatingInspector("ssulHeader");
    } else if (id.includes("meta")) {
      setActiveFloatingInspector("metadata");
    } else if (id.includes("source")) {
      setActiveFloatingInspector("sourceCredit");
    } else if (id.includes("bar")) {
      setActiveFloatingInspector("topBottomBar");
    } else if (id.includes("video") || id.includes("hole")) {
      setActiveFloatingInspector("videoCrop");
    } else {
      setActiveFloatingInspector("title");
    }
  };

  // -------------------------------------------------------------
  // 폼팩터별 동적 속성 브릿지 (SSOT: blueprint.globalLayers)
  // -------------------------------------------------------------
  const titleLayer = blueprint.globalLayers.find(
    (l) => l.kind === "text" && (l.id.includes("title") || l.id.includes("headline"))
  ) as TextLayer | undefined;

  const titleConfig = useMemo(() => {
    const multi = titleLayer?.multiLineStyles || [];
    const lines = (titleLayer?.content || "").split("\n");
    return {
      hasTopTitle: !titleLayer?.hidden,
      titleLinesMode: lines.length > 1 ? "double" : "single",
      titleLine1: lines[0] || "",
      titleLine2: lines[1] || "",
      titleLine1Color: multi[0]?.fontColor || titleLayer?.fontColor || "#FFFFFF",
      titleLine2Color: multi[1]?.fontColor || "#FFE500",
      titleLine1SizePx: multi[0]?.fontSize || titleLayer?.fontSize || 38,
      titleLine2SizePx: multi[1]?.fontSize || titleLayer?.fontSize || 48,
      titleFontFamily: titleLayer?.fontFamily || "Pretendard",
      titleStroke: !!titleLayer?.stroke && (titleLayer.stroke.width > 0),
      titleStrokeWidth: titleLayer?.stroke?.width || 2,
      titleStrokeColor: titleLayer?.stroke?.color || "#000000",
      titleShadow: !!titleLayer?.shadow,
      titleShadowBlur: titleLayer?.shadow?.blur || 8,
      titleShadowColor: titleLayer?.shadow?.color || "rgba(0,0,0,0.9)",
      titleLetterSpacing: titleLayer?.letterSpacing || 0,
      titleLineHeight: titleLayer?.lineHeight || 1.2,
      titleAlign: titleLayer?.textAlign || "center",
      hasTitleBadge: true,
      titleBadgeText: "속보",
      titleBadgeBg: "#EF4444",
      titleBadgeColor: "#FFFFFF",
      titleBadgeSizePx: 11,
      titleBadgeRadius: 4,
    };
  }, [titleLayer]);

  const updateTitleConfig = (patch: any) => {
    if (!titleLayer) return;
    const currentLines = (titleLayer.content || "").split("\n");
    let line1 = patch.titleLine1 !== undefined ? patch.titleLine1 : currentLines[0] || "";
    let line2 = patch.titleLine2 !== undefined ? patch.titleLine2 : currentLines[1] || "";
    const isDouble = patch.titleLinesMode === "double" || (patch.titleLinesMode === undefined && line2.length > 0);
    const newContent = isDouble && line2 ? `${line1}\n${line2}` : line1;

    const newMulti = [
      {
        fontSize: patch.titleLine1SizePx || titleLayer.multiLineStyles?.[0]?.fontSize || 38,
        fontColor: patch.titleLine1Color || titleLayer.multiLineStyles?.[0]?.fontColor || "#FFFFFF",
      },
      {
        fontSize: patch.titleLine2SizePx || titleLayer.multiLineStyles?.[1]?.fontSize || 48,
        fontColor: patch.titleLine2Color || titleLayer.multiLineStyles?.[1]?.fontColor || "#FFE500",
      },
    ];

    updateLayerById(titleLayer.id, {
      content: newContent,
      fontFamily: patch.titleFontFamily || titleLayer.fontFamily,
      textAlign: patch.titleAlign || titleLayer.textAlign,
      letterSpacing: patch.titleLetterSpacing !== undefined ? patch.titleLetterSpacing : titleLayer.letterSpacing,
      lineHeight: patch.titleLineHeight !== undefined ? patch.titleLineHeight : titleLayer.lineHeight,
      multiLineStyles: newMulti,
      stroke: patch.titleStroke !== undefined
        ? patch.titleStroke
          ? { width: patch.titleStrokeWidth || 2, color: patch.titleStrokeColor || "#000000" }
          : undefined
        : titleLayer.stroke,
      shadow: patch.titleShadow !== undefined
        ? patch.titleShadow
          ? { blur: patch.titleShadowBlur || 8, color: patch.titleShadowColor || "rgba(0,0,0,0.9)", offsetX: 0, offsetY: 2 }
          : undefined
        : titleLayer.shadow,
    });
  };

  // 인스타 설정 브릿지
  const profileHeader = blueprint.globalLayers.find((l) => l.id.includes("profile")) as ShapeLayer | undefined;
  const profileText = blueprint.globalLayers.find((l) => l.kind === "text" && l.id.includes("profile")) as TextLayer | undefined;

  const instaConfig = useMemo(() => {
    return {
      profileName: "유머보따리",
      profileHandle: profileText?.content ? profileText.content.split(" ")[1] || "@viral_shorts" : "@viral_shorts",
      profileAvatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=humor",
      isVerified: true,
      titleText: titleLayer?.content || "",
      holeRatio: "1:1",
      holeWidthPct: 88,
      holeHeightPct: 46,
      holeYPct: 45,
      holeRoundness: 24,
      bgColor: "#FFFFFF",
    };
  }, [profileText, titleLayer]);

  const updateInstaConfig = (updater: any) => {
    const next = typeof updater === "function" ? updater(instaConfig) : updater;
    if (profileText && next.profileHandle) {
      updateLayerById(profileText.id, {
        content: `📸 ${next.profileHandle}  ✓  •  추천 베스트 댓글`,
      });
    }
  };

  // 댓글 카드 브릿지
  const commentCardLayer = blueprint.globalLayers.find((l) => l.id.includes("comment_card")) as ShapeLayer | undefined;
  const commentBodyLayer = blueprint.globalLayers.find((l) => l.id.includes("comment_body")) as TextLayer | undefined;
  const commentMetaLayer = blueprint.globalLayers.find((l) => l.id.includes("comment_meta")) as TextLayer | undefined;

  const commentCardConfig = useMemo(() => {
    return {
      author: "스마트쇼츠_크리에이터",
      handle: "@viral_shorts_pro",
      text: commentBodyLayer?.content || "이거 보고 제 인생이 바뀌었습니다 ㄷㄷ",
      likes: "1.4만",
      timeText: "방금 전",
      bgColor: commentCardLayer?.fillColor || "#FFFFFF",
      textColor: commentBodyLayer?.fontColor || "#18181B",
      borderRadius: commentCardLayer?.borderRadius || 16,
      borderEnabled: true,
      borderColor: commentCardLayer?.borderColor || "#E2E8F0",
      borderWidth: commentCardLayer?.borderWidth || 1,
    };
  }, [commentCardLayer, commentBodyLayer, commentMetaLayer]);

  const updateCommentCardConfig = (updater: any) => {
    const patch = typeof updater === "function" ? updater(commentCardConfig) : updater;
    if (commentBodyLayer && patch.text !== undefined) {
      updateLayerById(commentBodyLayer.id, { content: patch.text });
    }
    if (commentMetaLayer && patch.likes !== undefined) {
      updateLayerById(commentMetaLayer.id, { content: `❤️ ${patch.likes}  •  답글 1,420개  •  공유` });
    }
    if (commentCardLayer) {
      updateLayerById(commentCardLayer.id, {
        fillColor: patch.bgColor || commentCardLayer.fillColor,
        borderRadius: patch.borderRadius || commentCardLayer.borderRadius,
        borderColor: patch.borderColor || commentCardLayer.borderColor,
      });
    }
  };

  // 군림보 브릿지
  const hookBandLayer = blueprint.globalLayers.find((l) => l.id.includes("hook_band")) as ShapeLayer | undefined;
  const hookTextLayer = blueprint.globalLayers.find((l) => l.id.includes("hook_text")) as TextLayer | undefined;

  const gunlimboConfig = useMemo(() => {
    const lines = (titleLayer?.content || "").split("\n");
    return {
      titleLine1: lines[0] || "제목을",
      titleLine2: lines[1] || "입력해주세요",
      titleLine1Color: titleLayer?.multiLineStyles?.[0]?.fontColor || "#FFFFFF",
      titleLine2Color: titleLayer?.multiLineStyles?.[1]?.fontColor || "#FFE500",
      titleFontSize: titleLayer?.fontSize || 38,
      keepTitleThroughout: true,
      hookPhrase: hookTextLayer?.content || "후킹문구를 입력하세요",
      hookBgColor: hookBandLayer?.fillColor || "#FFFFFF",
      hookTextColor: hookTextLayer?.fontColor || "#000000",
      hookFontSize: hookTextLayer?.fontSize || 44,
      introDurationSec: 2.5,
      showGuidelines: true,
    };
  }, [titleLayer, hookBandLayer, hookTextLayer]);

  const updateGunlimboConfig = (updater: any) => {
    const patch = typeof updater === "function" ? updater(gunlimboConfig) : updater;
    if (hookTextLayer && patch.hookPhrase !== undefined) {
      updateLayerById(hookTextLayer.id, {
        content: patch.hookPhrase,
        fontColor: patch.hookTextColor || hookTextLayer.fontColor,
        fontSize: patch.hookFontSize || hookTextLayer.fontSize,
      });
    }
    if (hookBandLayer && patch.hookBgColor !== undefined) {
      updateLayerById(hookBandLayer.id, { fillColor: patch.hookBgColor });
    }
  };

  // 썰형 브릿지
  const ssulMetaLayer = blueprint.globalLayers.find((l) => l.id.includes("meta")) as TextLayer | undefined;
  const subtitleLayer = blueprint.globalLayers.find((l) => l.id.includes("subtitle")) as TextLayer | undefined;

  const ssulConfig = useMemo(() => {
    return {
      author: "익명",
      timeText: "방금 전",
      viewsText: "조회 4.2만",
      textMode: subtitleLayer?.accumulateMode ? "accumulate" : "single-stepped",
      memeType: "pepe",
      memeEmotion: "happy",
      memeAliveMotion: true,
    };
  }, [ssulMetaLayer, subtitleLayer]);

  const updateSsulConfig = (updater: any) => {
    const patch = typeof updater === "function" ? updater(ssulConfig) : updater;
    if (subtitleLayer && patch.textMode !== undefined) {
      updateLayerById(subtitleLayer.id, {
        accumulateMode: patch.textMode === "accumulate",
      });
    }
  };

  // 자막 설정 브릿지
  const subtitleConfig = useMemo(() => {
    return {
      textColor: subtitleLayer?.fontColor || "#FFFFFF",
      fontSize: subtitleLayer?.fontSize || 42,
      fontFamily: subtitleLayer?.fontFamily || "NotoSansKR-Bold",
      strokeColor: subtitleLayer?.stroke?.color || "#000000",
      strokeWidth: subtitleLayer?.stroke?.width || 4,
    };
  }, [subtitleLayer]);

  const updateSubtitleConfig = (updater: any) => {
    const patch = typeof updater === "function" ? updater(subtitleConfig) : updater;
    if (subtitleLayer) {
      updateLayerById(subtitleLayer.id, {
        fontColor: patch.textColor || subtitleLayer.fontColor,
        fontSize: patch.fontSize || subtitleLayer.fontSize,
        fontFamily: patch.fontFamily || subtitleLayer.fontFamily,
      });
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
        instaConfig,
        updateInstaConfig,
        commentCardConfig,
        updateCommentCardConfig,
        gunlimboConfig,
        updateGunlimboConfig,
        ssulConfig,
        updateSsulConfig,
        subtitleConfig,
        updateSubtitleConfig,
      }}
    >
      {children}
    </SovereignStudioContext.Provider>
  );
};

export const useSovereignStudio = (): SovereignStudioContextValue | null => {
  return useContext(SovereignStudioContext);
};
