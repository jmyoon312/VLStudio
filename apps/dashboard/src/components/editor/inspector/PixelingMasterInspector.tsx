import React, { useState } from "react";
import { useBlueprint } from "../core/BlueprintContext";
import { LayerObject, Archetype, TextLayer, ShapeLayer } from "../../../types/blueprintV4";
import { createDefaultBlueprintV4 } from "../../../lib/blueprintV4Migrator";
import { LayerQuickSwitcher } from "./LayerQuickSwitcher";
import { TransformInspectorPanel } from "./TransformInspectorPanel";
import { TextInspectorPanel } from "./TextInspectorPanel";
import { ShapeInspectorPanel } from "./ShapeInspectorPanel";
import { CommentCardInspector } from "./CommentCardInspector";
import { ScrubInput } from "./ScrubInput";
import { ColorPalettePicker } from "./ColorPalettePicker";
import { CanvasGlobalInspector } from "./CanvasGlobalInspector";
import {
  Type,
  Palette,
  FileText,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Sparkles,
  RotateCcw,
  Check,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

export interface PixelingMasterInspectorProps {
  className?: string;
  studioMode: "design" | "nle";
  onStudioModeChange: (mode: "design" | "nle") => void;
}

// 4대 템플릿별 12종 완성형 비주얼 갤러리 프리셋 정의
interface GalleryPresetItem {
  id: string;
  name: string;
  badge?: string;
  previewBg: string;
  textColor: string;
  accentColor: string;
  borderColor?: string;
  apply: (bp: any) => any;
}

const TEMPLATE_GALLERY_PRESETS: Record<string, GalleryPresetItem[]> = {
  ssul: [
    {
      id: "naver_green",
      name: "네이버(초록)",
      badge: "인기",
      previewBg: "#03C75A",
      textColor: "#FFFFFF",
      accentColor: "#03C75A",
      apply: (bp) => ({
        ...bp,
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.id === "header_bar"
            ? { ...l, fillColor: "#03C75A", borderColor: "#029E47" }
            : l.id === "header_title"
            ? { ...l, fontColor: "#FFFFFF" }
            : l
        ),
      }),
    },
    {
      id: "kakao_yellow",
      name: "카카오(노랑)",
      badge: "시그니처",
      previewBg: "#FEE500",
      textColor: "#191919",
      accentColor: "#FEE500",
      apply: (bp) => ({
        ...bp,
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.id === "header_bar"
            ? { ...l, fillColor: "#FEE500", borderColor: "#E5CE00" }
            : l.id === "header_title"
            ? { ...l, fontColor: "#191919" }
            : l
        ),
      }),
    },
    {
      id: "twitter_sky",
      name: "트위터(하늘)",
      previewBg: "#1D9BF0",
      textColor: "#FFFFFF",
      accentColor: "#1D9BF0",
      apply: (bp) => ({
        ...bp,
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.id === "header_bar"
            ? { ...l, fillColor: "#1D9BF0", borderColor: "#1A8CD8" }
            : l.id === "header_title"
            ? { ...l, fontColor: "#FFFFFF" }
            : l
        ),
      }),
    },
    {
      id: "facebook_blue",
      name: "페이스북(파랑)",
      previewBg: "#1877F2",
      textColor: "#FFFFFF",
      accentColor: "#1877F2",
      apply: (bp) => ({
        ...bp,
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.id === "header_bar"
            ? { ...l, fillColor: "#1877F2", borderColor: "#166FE5" }
            : l.id === "header_title"
            ? { ...l, fontColor: "#FFFFFF" }
            : l
        ),
      }),
    },
    {
      id: "instagram_pink",
      name: "인스타(분홍)",
      previewBg: "linear-gradient(45deg, #F58529, #DD2A7B, #8134AF)",
      textColor: "#FFFFFF",
      accentColor: "#DD2A7B",
      apply: (bp) => ({
        ...bp,
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.id === "header_bar"
            ? { ...l, fillColor: "#DD2A7B", borderColor: "#C13584" }
            : l.id === "header_title"
            ? { ...l, fontColor: "#FFFFFF" }
            : l
        ),
      }),
    },
    {
      id: "dark_minimal",
      name: "어둡게(다크)",
      previewBg: "#18181B",
      textColor: "#F4F4F5",
      accentColor: "#3F3F46",
      apply: (bp) => ({
        ...bp,
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.id === "header_bar"
            ? { ...l, fillColor: "#18181B", borderColor: "#27272A" }
            : l.id === "header_title"
            ? { ...l, fontColor: "#F4F4F5" }
            : l
        ),
      }),
    },
    {
      id: "clean_white",
      name: "밝게(클린)",
      previewBg: "#FFFFFF",
      textColor: "#09090B",
      accentColor: "#E4E4E7",
      apply: (bp) => ({
        ...bp,
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.id === "header_bar"
            ? { ...l, fillColor: "#FFFFFF", borderColor: "#E4E4E7" }
            : l.id === "header_title"
            ? { ...l, fontColor: "#09090B" }
            : l
        ),
      }),
    },
    {
      id: "breaking_red",
      name: "빨강(긴급)",
      previewBg: "#EF4444",
      textColor: "#FFFFFF",
      accentColor: "#DC2626",
      apply: (bp) => ({
        ...bp,
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.id === "header_bar"
            ? { ...l, fillColor: "#EF4444", borderColor: "#DC2626" }
            : l.id === "header_title"
            ? { ...l, fontColor: "#FFFFFF" }
            : l
        ),
      }),
    },
  ],
  gunlimbo: [
    {
      id: "black_yellow",
      name: "블랙 & 옐로우",
      badge: "원조",
      previewBg: "#000000",
      textColor: "#FFE600",
      accentColor: "#FFE600",
      apply: (bp) => ({
        ...bp,
        canvas: { ...bp.canvas, backgroundColor: "#000000" },
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.id === "hook_band"
            ? { ...l, fillColor: "#FFE600" }
            : l.id === "hook_text"
            ? { ...l, fontColor: "#000000" }
            : l.id === "subtitle_punch"
            ? { ...l, fontColor: "#FFFFFF", outlineColor: "#000000", outlineWidth: 8 }
            : l
        ),
      }),
    },
    {
      id: "slate_cyan",
      name: "슬레이트 & 시안",
      previewBg: "#0F172A",
      textColor: "#06B6D4",
      accentColor: "#06B6D4",
      apply: (bp) => ({
        ...bp,
        canvas: { ...bp.canvas, backgroundColor: "#0F172A" },
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.id === "hook_band"
            ? { ...l, fillColor: "#06B6D4" }
            : l.id === "hook_text"
            ? { ...l, fontColor: "#0F172A" }
            : l.id === "subtitle_punch"
            ? { ...l, fontColor: "#FFFFFF", outlineColor: "#0F172A", outlineWidth: 8 }
            : l
        ),
      }),
    },
    {
      id: "crimson_fire",
      name: "크림슨 & 파이어",
      badge: "도파민",
      previewBg: "#450A0A",
      textColor: "#EF4444",
      accentColor: "#F97316",
      apply: (bp) => ({
        ...bp,
        canvas: { ...bp.canvas, backgroundColor: "#450A0A" },
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.id === "hook_band"
            ? { ...l, fillColor: "#EF4444" }
            : l.id === "hook_text"
            ? { ...l, fontColor: "#FFFFFF" }
            : l.id === "subtitle_punch"
            ? { ...l, fontColor: "#FFE600", outlineColor: "#450A0A", outlineWidth: 8 }
            : l
        ),
      }),
    },
    {
      id: "indigo_neon",
      name: "인디고 & 네온",
      previewBg: "#1E1B4B",
      textColor: "#A855F7",
      accentColor: "#A855F7",
      apply: (bp) => ({
        ...bp,
        canvas: { ...bp.canvas, backgroundColor: "#1E1B4B" },
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.id === "hook_band"
            ? { ...l, fillColor: "#A855F7" }
            : l.id === "hook_text"
            ? { ...l, fontColor: "#FFFFFF" }
            : l.id === "subtitle_punch"
            ? { ...l, fontColor: "#38BDF8", outlineColor: "#1E1B4B", outlineWidth: 8 }
            : l
        ),
      }),
    },
  ],
  comments: [
    {
      id: "card_white",
      name: "화이트 모던",
      badge: "추천",
      previewBg: "#FFFFFF",
      textColor: "#09090B",
      accentColor: "#2563EB",
      apply: (bp) => ({
        ...bp,
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.kind === "shape" && (l as ShapeLayer).shapeRole === "comment_card"
            ? { ...l, fillColor: "#FFFFFF", borderColor: "#E4E4E7", borderWidth: 1 }
            : l
        ),
      }),
    },
    {
      id: "card_dark",
      name: "다크 엘레강스",
      previewBg: "#18181B",
      textColor: "#F4F4F5",
      accentColor: "#38BDF8",
      apply: (bp) => ({
        ...bp,
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.kind === "shape" && (l as ShapeLayer).shapeRole === "comment_card"
            ? { ...l, fillColor: "#18181B", borderColor: "#27272A", borderWidth: 1 }
            : l
        ),
      }),
    },
    {
      id: "card_glass",
      name: "글래스모피즘",
      previewBg: "rgba(255, 255, 255, 0.2)",
      textColor: "#FFFFFF",
      accentColor: "#60A5FA",
      apply: (bp) => ({
        ...bp,
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.kind === "shape" && (l as ShapeLayer).shapeRole === "comment_card"
            ? { ...l, fillColor: "rgba(255, 255, 255, 0.15)", borderColor: "rgba(255, 255, 255, 0.3)", borderWidth: 1 }
            : l
        ),
      }),
    },
    {
      id: "card_neon",
      name: "네온 사이버",
      previewBg: "#09090B",
      textColor: "#22C55E",
      accentColor: "#22C55E",
      apply: (bp) => ({
        ...bp,
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.kind === "shape" && (l as ShapeLayer).shapeRole === "comment_card"
            ? { ...l, fillColor: "#09090B", borderColor: "#22C55E", borderWidth: 2 }
            : l
        ),
      }),
    },
  ],
  classic: [
    {
      id: "classic_standard",
      name: "스탠다드 골드",
      badge: "표준",
      previewBg: "#000000",
      textColor: "#FBBF24",
      accentColor: "#FBBF24",
      apply: (bp) => ({
        ...bp,
        canvas: { ...bp.canvas, backgroundColor: "#000000" },
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.id === "headline_text"
            ? { ...l, fontColor: "#FBBF24", fontSize: 58 }
            : l.id === "subtitle_text"
            ? { ...l, fontColor: "#FFFFFF", fontSize: 44 }
            : l
        ),
      }),
    },
    {
      id: "classic_white_clean",
      name: "화이트 클린",
      previewBg: "#09090B",
      textColor: "#FFFFFF",
      accentColor: "#E4E4E7",
      apply: (bp) => ({
        ...bp,
        canvas: { ...bp.canvas, backgroundColor: "#09090B" },
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.id === "headline_text"
            ? { ...l, fontColor: "#FFFFFF", fontSize: 56 }
            : l.id === "subtitle_text"
            ? { ...l, fontColor: "#E4E4E7", fontSize: 44 }
            : l
        ),
      }),
    },
    {
      id: "classic_cyan_punch",
      name: "시안 펀치",
      previewBg: "#000000",
      textColor: "#38BDF8",
      accentColor: "#38BDF8",
      apply: (bp) => ({
        ...bp,
        canvas: { ...bp.canvas, backgroundColor: "#000000" },
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.id === "headline_text"
            ? { ...l, fontColor: "#38BDF8", fontSize: 58 }
            : l.id === "subtitle_text"
            ? { ...l, fontColor: "#FFFFFF", fontSize: 44 }
            : l
        ),
      }),
    },
    {
      id: "classic_red_alert",
      name: "레드 얼럿",
      previewBg: "#000000",
      textColor: "#EF4444",
      accentColor: "#EF4444",
      apply: (bp) => ({
        ...bp,
        canvas: { ...bp.canvas, backgroundColor: "#000000" },
        globalLayers: bp.globalLayers.map((l: LayerObject) =>
          l.id === "headline_text"
            ? { ...l, fontColor: "#EF4444", fontSize: 58 }
            : l.id === "subtitle_text"
            ? { ...l, fontColor: "#FFFFFF", fontSize: 44 }
            : l
        ),
      }),
    },
  ],
};

const AVAILABLE_FONTS = [
  { id: "NotoSansKR-Bold", label: "Noto Sans KR (안정형 고딕)", weight: "Bold" },
  { id: "NotoSansKR-Medium", label: "Noto Sans KR (미디엄)", weight: "Medium" },
  { id: "NotoSansKR-Black", label: "Noto Sans KR (블랙)", weight: "Black" },
  { id: "GmarketSansBold", label: "Gmarket Sans (볼드)", weight: "Bold" },
  { id: "GmarketSansMedium", label: "Gmarket Sans (미디엄)", weight: "Medium" },
  { id: "Pretendard-Bold", label: "Pretendard (볼드)", weight: "Bold" },
  { id: "Pretendard-Black", label: "Pretendard (블랙)", weight: "Black" },
  { id: "BlackHanSans-Regular", label: "Black Han Sans (검은고딕)", weight: "Regular" },
  { id: "DoHyeon-Regular", label: "Do Hyeon (도현체)", weight: "Regular" },
  { id: "Jalnan", label: "여기어때 잘난체", weight: "Bold" },
  { id: "WantedSans-Bold", label: "Wanted Sans (원티드 산스)", weight: "Bold" },
  { id: "Roboto-Bold", label: "Roboto (영문 볼드)", weight: "Bold" },
];

export const PixelingMasterInspector: React.FC<PixelingMasterInspectorProps> = ({
  className = "",
  studioMode,
  onStudioModeChange,
}) => {
  const {
    blueprint,
    setBlueprint,
    selectedLayerId,
    setSelectedLayerId,
    updateLayerTransform,
    updateLayerStyle,
    deleteLayer,
  } = useBlueprint();

  // 상시 3대 마스터 탭 ('style' | 'fonts' | 'sample')
  const [activeTab, setActiveTab] = useState<"style" | "fonts" | "sample">("style");
  const [selectedGalleryPreset, setSelectedGalleryPreset] = useState<string | null>(null);

  // 폰트 관리 상태
  const [titleFont, setTitleFont] = useState<string>("GmarketSansBold");
  const [bodyFont, setBodyFont] = useState<string>("NotoSansKR-Bold");
  const [punchFont, setPunchFont] = useState<string>("BlackHanSans-Regular");
  const [userFonts, setUserFonts] = useState<Array<{ id: string; label: string; file: string }>>([
    { id: "user_f1", label: "프리미엄_나눔명조_B.ttf", file: "fonts/NanumMyeongjoBold.ttf" },
  ]);

  const selectedLayer = blueprint.globalLayers.find((l) => l.id === selectedLayerId) || null;
  const currentPresets =
    TEMPLATE_GALLERY_PRESETS[blueprint.archetype] ||
    TEMPLATE_GALLERY_PRESETS.classic ||
    TEMPLATE_GALLERY_PRESETS.ssul;

  // 갤러리 프리셋 적용
  const handleApplyGalleryPreset = (preset: GalleryPresetItem) => {
    setSelectedGalleryPreset(preset.id);
    const updated = preset.apply(blueprint);
    setBlueprint(updated);
    toast.success(`'${preset.name}' 스타일이 적용되었습니다.`);
  };

  // 폰트 역할별 일괄 적용
  const handleApplyRoleFont = (role: "title" | "body" | "punch", fontId: string) => {
    if (role === "title") setTitleFont(fontId);
    if (role === "body") setBodyFont(fontId);
    if (role === "punch") setPunchFont(fontId);

    setBlueprint({
      ...blueprint,
      globalLayers: bpUpdateRoleFont(blueprint.globalLayers, role, fontId),
    });
    toast.success(`글꼴이 변경되었습니다.`);
  };

  function bpUpdateRoleFont(layers: LayerObject[], role: "title" | "body" | "punch", fontId: string) {
    return layers.map((l) => {
      if (l.kind !== "text") return l;
      const tl = l as TextLayer;
      if (role === "title" && (tl.textRole === "title_header" || tl.id.includes("title") || tl.id.includes("headline"))) {
        return { ...tl, fontFamily: fontId };
      }
      if (role === "body" && (tl.textRole === "subtitle_narrative" || tl.id.includes("subtitle") || tl.accumulateMode)) {
        return { ...tl, fontFamily: fontId };
      }
      if (role === "punch" && (tl.textRole === "hook_punch" || tl.id.includes("hook"))) {
        return { ...tl, fontFamily: fontId };
      }
      return tl;
    });
  }

  // 사용자 폰트 업로드
  const handleAddUserFont = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ttf,.otf,.woff2";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        if (userFonts.length >= 8) {
          toast.error("글꼴은 최대 8개까지 등록할 수 있습니다.");
          return;
        }
        const newFont = {
          id: `user_f${Date.now()}`,
          label: file.name,
          file: `fonts/${file.name}`,
        };
        setUserFonts([...userFonts, newFont]);
        toast.success(`'${file.name}' 글꼴이 등록되었습니다.`);
      }
    };
    input.click();
  };

  // 배경 그림 업로드 / 변경
  const handleUploadBgImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        // Add or update background image layer
        const existingBg = blueprint.globalLayers.find((l) => l.name === "배경 그림");
        if (existingBg) {
          setBlueprint({
            ...blueprint,
            globalLayers: blueprint.globalLayers.map((l) =>
              l.id === existingBg.id ? { ...l, imageAsset: url, hidden: false } : l
            ),
          });
        } else {
          const newBgLayer = {
            id: `bg_img_${Date.now()}`,
            name: "배경 그림",
            kind: "shape",
            locked: true,
            hidden: false,
            transform: {
              x: blueprint.canvas.width / 2,
              y: blueprint.canvas.height / 2,
              width: blueprint.canvas.width,
              height: blueprint.canvas.height,
              rotation: 0,
              scale: 1,
              origin: "center",
              zIndex: 1,
            },
            inMs: 0,
            outMs: null,
            opacity: 1,
            shapeRole: "custom",
            imageAsset: url,
            fillColor: "#000000",
          };
          setBlueprint({
            ...blueprint,
            globalLayers: [newBgLayer, ...blueprint.globalLayers],
          });
        }
        toast.success("배경 그림이 설정되었습니다.");
      }
    };
    input.click();
  };

  const handleClearBgImage = () => {
    setBlueprint({
      ...blueprint,
      globalLayers: blueprint.globalLayers.filter((l) => l.name !== "배경 그림"),
    });
    toast.success("배경 그림이 제거되었습니다.");
  };

  const hasBgImage = blueprint.globalLayers.some((l) => l.name === "배경 그림");

  // 샘플 글 실시간 변경 핸들러
  const handleSampleTextChange = (layerId: string, newText: string) => {
    setBlueprint({
      ...blueprint,
      globalLayers: blueprint.globalLayers.map((l) =>
        l.id === layerId ? { ...l, content: newText } : l
      ),
    });
  };

  // 기본 샘플 글로 복원
  const handleResetSampleText = () => {
    const defaultBp = createDefaultBlueprintV4(blueprint.archetype, blueprint.name);
    setBlueprint({
      ...blueprint,
      globalLayers: blueprint.globalLayers.map((l) => {
        const matching = defaultBp.globalLayers.find((dl) => dl.id === l.id);
        return matching && (matching as any).content
          ? { ...l, content: (matching as any).content }
          : l;
      }),
    });
    toast.success("기본 샘플 글로 되돌렸습니다.");
  };

  return (
    <div className={`flex flex-col h-full bg-card select-none text-foreground ${className}`}>
      {/* 1. 스튜디오 모드 토글 (디자인 모드 vs 타임라인 모드) */}
      <div className="flex items-center justify-between p-1 bg-muted/60 rounded-xl border border-border text-xs mb-2.5 shrink-0">
        <button
          onClick={() => onStudioModeChange("design")}
          className={`flex-1 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
            studioMode === "design"
              ? "bg-background text-primary shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🎨 디자인 모드
        </button>
        <button
          onClick={() => onStudioModeChange("nle")}
          className={`flex-1 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
            studioMode === "nle"
              ? "bg-background text-primary shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🎛️ NLE 편집 모드
        </button>
      </div>

      {/* 2. ★ 픽셀링 최상단 3대 마스터 탭: [스타일] | [글꼴] | [샘플 글] */}
      <div className="flex items-center justify-between p-1 bg-background/80 rounded-xl border border-border text-xs mb-3 shrink-0">
        <button
          onClick={() => setActiveTab("style")}
          className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
            activeTab === "style"
              ? "bg-primary text-primary-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>스타일</span>
        </button>
        <button
          onClick={() => setActiveTab("fonts")}
          className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
            activeTab === "fonts"
              ? "bg-primary text-primary-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>글꼴</span>
        </button>
        <button
          onClick={() => setActiveTab("sample")}
          className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
            activeTab === "sample"
              ? "bg-primary text-primary-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>샘플 글</span>
        </button>
      </div>

      {/* 3. 스크롤 가능한 본체 영역 */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-0.5 custom-scrollbar pb-16">
        {/* ============================================================ */}
        {/* [TAB 1] 스타일 탭 */}
        {/* ============================================================ */}
        {activeTab === "style" && (
          <div className="space-y-4">
            {/* 상시 레이어 퀵 스위처 */}
            <LayerQuickSwitcher />

            {/* 선택된 레이어가 있을 때: 고른 요소 도구 (Transform & Specific Inspector) */}
            {selectedLayer ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-primary flex items-center space-x-1">
                    <span>✨</span>
                    <span>고른 요소 도구</span>
                  </span>
                  <button
                    onClick={() => setSelectedLayerId(null)}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    ✕ 선택 해제
                  </button>
                </div>

                <TransformInspectorPanel
                  transform={selectedLayer.transform}
                  onChange={(newT) => updateLayerTransform(selectedLayer.id, newT)}
                  canvasWidth={blueprint.canvas.width}
                  canvasHeight={blueprint.canvas.height}
                />

                {selectedLayer.kind === "text" && (
                  <TextInspectorPanel
                    layer={selectedLayer as any}
                    onChange={(patch) => updateLayerStyle(selectedLayer.id, patch as any)}
                  />
                )}

                {selectedLayer.kind === "shape" &&
                  ((selectedLayer as any).shapeRole === "comment_card" ? (
                    <CommentCardInspector
                      layer={selectedLayer as any}
                      onChange={(patch) => updateLayerStyle(selectedLayer.id, patch as any)}
                    />
                  ) : (
                    <ShapeInspectorPanel
                      layer={selectedLayer as any}
                      onChange={(patch) => updateLayerStyle(selectedLayer.id, patch as any)}
                    />
                  ))}
              </div>
            ) : null}

            {/* 기본 템플릿 12종 완성형 갤러리 프리셋 (픽셀링 1:1 대응) */}
            <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center space-x-1.5">
                  <span>🎨</span>
                  <span>기본 템플릿 스타일 갤러리</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {currentPresets.length}종 완성형
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                클릭 즉시 추천 색상, 폰트 조화, 배경 스타일이 일괄 적용됩니다.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {currentPresets.map((preset) => {
                  const isSelected = selectedGalleryPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyGalleryPreset(preset)}
                      className={`relative p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                        isSelected
                          ? "ring-2 ring-primary border-primary shadow-sm"
                          : "border-border/80 hover:border-border hover:shadow-xs"
                      }`}
                      style={{
                        background: preset.previewBg.startsWith("linear")
                          ? preset.previewBg
                          : `${preset.previewBg}15`,
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-border/40 shrink-0"
                          style={{
                            background: preset.previewBg,
                          }}
                        />
                        {preset.badge && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                            {preset.badge}
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary ml-auto" />}
                      </div>

                      <div className="mt-auto">
                        <div className="text-[11px] font-bold text-foreground truncate">
                          {preset.name}
                        </div>
                        <div
                          className="text-[10px] font-medium opacity-80 truncate"
                          style={{ color: preset.textColor }}
                        >
                          Aa 미리보기
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 배경 그림 (내가 더한 요소의 ‘배경 그림’ — 템플릿 뒤에서 화면을 채워요) */}
            <div className="p-3 bg-card rounded-xl border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center space-x-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                  <span>배경 그림</span>
                </span>
                {hasBgImage && (
                  <span className="text-[10px] text-emerald-500 font-semibold flex items-center space-x-0.5">
                    <span>●</span>
                    <span>적용 중</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                내가 더한 요소의 ‘배경 그림’ — 템플릿 뒤에서 화면을 채워요.
              </p>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={handleUploadBgImage}
                  className="flex-1 py-1.5 px-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{hasBgImage ? "배경 그림 변경" : "배경 그림 선택"}</span>
                </button>
                {hasBgImage && (
                  <button
                    onClick={handleClearBgImage}
                    className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-500/10 border border-border transition-colors cursor-pointer"
                    title="배경 그림 지우기"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 캔버스 글로벌 설정 (배경색, 5대 폼팩터 전환, 레이어 추가) */}
            {!selectedLayer && <CanvasGlobalInspector />}
          </div>
        )}

        {/* ============================================================ */}
        {/* [TAB 2] 글꼴 탭 */}
        {/* ============================================================ */}
        {activeTab === "fonts" && (
          <div className="space-y-4">
            <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
              <span className="text-xs font-bold text-foreground flex items-center space-x-1.5">
                <Type className="w-3.5 h-3.5 text-primary" />
                <span>글꼴 역할 매핑</span>
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                프리셋의 각 레이어에 바인딩할 핵심 3대 대표 글꼴을 지정합니다.
              </p>
            </div>

            {/* 대제목 글꼴 */}
            <div className="p-3 bg-card rounded-xl border border-border space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>대제목 글꼴</span>
                <span className="text-[10px] text-primary font-mono">Title Role</span>
              </label>
              <select
                value={titleFont}
                onChange={(e) => handleApplyRoleFont("title", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {AVAILABLE_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 본문/자막 글꼴 */}
            <div className="p-3 bg-card rounded-xl border border-border space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>본문 / 자막 글꼴</span>
                <span className="text-[10px] text-primary font-mono">Subtitle Role</span>
              </label>
              <select
                value={bodyFont}
                onChange={(e) => handleApplyRoleFont("body", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {AVAILABLE_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 강조 / 훅 펀치 글꼴 */}
            <div className="p-3 bg-card rounded-xl border border-border space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>강조 / 훅 카피 글꼴</span>
                <span className="text-[10px] text-primary font-mono">Hook Punch Role</span>
              </label>
              <select
                value={punchFont}
                onChange={(e) => handleApplyRoleFont("punch", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {AVAILABLE_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 등록된 글꼴 보관함 & 사용자 글꼴 추가 */}
            <div className="p-3 bg-card rounded-xl border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  등록된 사용자 글꼴 ({userFonts.length}/8)
                </span>
                <button
                  onClick={handleAddUserFont}
                  className="px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>글꼴 더하기</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {userFonts.map((uf) => (
                  <div
                    key={uf.id}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-muted/40 rounded-lg border border-border text-xs"
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className="text-[10px] text-muted-foreground">TTF</span>
                      <span className="truncate font-medium">{uf.label}</span>
                    </div>
                    <button
                      onClick={() => setUserFonts(userFonts.filter((f) => f.id !== uf.id))}
                      className="text-muted-foreground hover:text-red-500 p-1 cursor-pointer"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                글꼴은 8개까지 담을 수 있어요. 이미 담긴 글꼴을 빼거나 다른 것을 기본으로 두세요.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* [TAB 3] 샘플 글 탭 */}
        {/* ============================================================ */}
        {activeTab === "sample" && (
          <div className="space-y-4">
            <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span>미리보기 샘플 글</span>
                </span>
                <button
                  onClick={handleResetSampleText}
                  className="text-[11px] text-primary hover:underline flex items-center space-x-0.5 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>샘플 글로 복원</span>
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                미리보기에만 쓰는 글이에요. 실제 영상의 글은 AI 가 채워요.
              </p>
            </div>

            {/* 현재 템플릿의 모든 텍스트 레이어에 대한 인풋 필드 */}
            <div className="space-y-3">
              {blueprint.globalLayers
                .filter((l) => l.kind === "text")
                .map((layer) => {
                  const tl = layer as TextLayer;
                  return (
                    <div
                      key={tl.id}
                      className="p-3 bg-card rounded-xl border border-border space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                        <span className="flex items-center space-x-1.5">
                          <span>🔤</span>
                          <span>{tl.name}</span>
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {tl.textRole || "text"}
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={tl.content || ""}
                        onChange={(e) => handleSampleTextChange(tl.id, e.target.value)}
                        placeholder="샘플 텍스트를 입력하세요..."
                        className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-none"
                      />
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PixelingMasterInspector;
