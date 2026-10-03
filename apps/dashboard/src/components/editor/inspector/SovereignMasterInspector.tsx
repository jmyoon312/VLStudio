import React from "react";
import { useBlueprint } from "../core/BlueprintContext";
import { useSovereignStudio } from "../core/SovereignStudioContext";
import { cn } from "@/lib/utils";
import { TemplateInspectorForm } from "../../canvas/forms/TemplateInspectorForm";
import { InstaProfileInspectorForm } from "../../canvas/forms/InstaProfileInspectorForm";
import { TitleSourceInspectorForm } from "../../canvas/forms/TitleSourceInspectorForm";
import { JabHookInspectorForm } from "../../canvas/forms/JabHookInspectorForm";
import { CommentCardInspectorForm } from "../../canvas/forms/CommentCardInspectorForm";
import { SsulObjectInspectorForm } from "../../canvas/forms/SsulObjectInspectorForm";
import { SubtitleStyleInspectorForm } from "../../canvas/forms/SubtitleStyleInspectorForm";
import { VideoCropInspectorForm } from "../../canvas/forms/VideoCropInspectorForm";
import { FilterFxInspectorForm } from "../../canvas/forms/FilterFxInspectorForm";
import { LayerQuickSwitcher } from "./LayerQuickSwitcher";
import { TransformInspectorPanel } from "./TransformInspectorPanel";
import { TextInspectorPanel } from "./TextInspectorPanel";
import { ShapeInspectorPanel } from "./ShapeInspectorPanel";
import { CommentCardInspector } from "./CommentCardInspector";
import { CanvasGlobalInspector } from "./CanvasGlobalInspector";
import {
  Layers,
  Plus,
  Type,
  Square,
  Image as ImageIcon,
  Sparkles,
  Smile,
} from "lucide-react";
import { toast } from "sonner";

export interface SovereignMasterInspectorProps {
  className?: string;
  studioMode?: "design" | "nle";
  onStudioModeChange?: (mode: "design" | "nle") => void;
}

export const SovereignMasterInspector: React.FC<SovereignMasterInspectorProps> = ({
  className = "",
  studioMode = "design",
  onStudioModeChange,
}) => {
  const {
    blueprint,
    setBlueprint,
    selectedLayerId,
    setSelectedLayerId,
    updateLayerTransform,
    updateLayerStyle,
  } = useBlueprint();

  const {
    activeMasterGroup,
    setActiveMasterGroup,
    activeInspectorTab,
    setActiveInspectorTab,
    inspectorGroups,
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
  } = useSovereignStudio();

  const selectedLayer = blueprint.globalLayers.find((l) => l.id === selectedLayerId) || null;

  // 무한 레이어 확장 (새 텍스트, 쉐이프, 이모지, 이미지 추가)
  const handleAddNewLayer = (kind: "text" | "shape" | "emoji") => {
    const newId = `layer_custom_${Date.now()}`;
    const cx = blueprint.canvas.width / 2;
    const cy = blueprint.canvas.height / 2;

    if (kind === "text") {
      const newTextLayer = {
        id: newId,
        name: `새 텍스트 레이어`,
        kind: "text" as const,
        locked: false,
        hidden: false,
        transform: { x: cx, y: cy, width: 600, height: 100, rotation: 0, scale: 1, origin: "center" as const, zIndex: 25 },
        inMs: 0,
        outMs: null,
        opacity: 1,
        textRole: "subtitle_narrative" as const,
        content: "새로운 텍스트 입력",
        fontFamily: "Pretendard",
        fontSize: 48,
        fontColor: "#FFE500",
        stroke: { width: 3, color: "#000000" },
        shadow: { blur: 6, color: "rgba(0,0,0,0.8)", offsetX: 0, offsetY: 2 },
        letterSpacing: -0.5,
        lineHeight: 1.2,
        textAlign: "center" as const,
        borderRadius: 0,
        padding: [0, 0, 0, 0] as [number, number, number, number],
        accumulateMode: false,
      };
      setBlueprint({ ...blueprint, globalLayers: [...blueprint.globalLayers, newTextLayer] });
      setSelectedLayerId(newId);
      toast.success("새 텍스트 레이어가 추가되었습니다.");
    } else if (kind === "shape") {
      const newShapeLayer = {
        id: newId,
        name: `새 쉐이프 박스`,
        kind: "shape" as const,
        locked: false,
        hidden: false,
        transform: { x: cx, y: cy, width: 400, height: 200, rotation: 0, scale: 1, origin: "center" as const, zIndex: 10 },
        inMs: 0,
        outMs: null,
        opacity: 0.9,
        shapeRole: "urgent_banner" as const,
        fillColor: "#1E293B",
        borderColor: "#3B82F6",
        borderWidth: 2,
        borderRadius: 16,
      };
      setBlueprint({ ...blueprint, globalLayers: [...blueprint.globalLayers, newShapeLayer] });
      setSelectedLayerId(newId);
      toast.success("새 쉐이프 박스가 추가되었습니다.");
    } else if (kind === "emoji") {
      const newEmojiLayer = {
        id: newId,
        name: `이모지 스티커`,
        kind: "text" as const,
        locked: false,
        hidden: false,
        transform: { x: cx, y: cy, width: 120, height: 120, rotation: 0, scale: 1, origin: "center" as const, zIndex: 30 },
        inMs: 0,
        outMs: null,
        opacity: 1,
        textRole: "badge" as const,
        content: "🔥",
        fontFamily: "Pretendard",
        fontSize: 72,
        fontColor: "#FFFFFF",
        letterSpacing: 0,
        lineHeight: 1,
        textAlign: "center" as const,
        borderRadius: 0,
        padding: [0, 0, 0, 0] as [number, number, number, number],
        accumulateMode: false,
      };
      setBlueprint({ ...blueprint, globalLayers: [...blueprint.globalLayers, newEmojiLayer] });
      setSelectedLayerId(newId);
      toast.success("새 이모지 스티커가 추가되었습니다.");
    }
  };

  return (
    <div className={`flex flex-col h-full bg-card select-none text-foreground ${className}`}>
      {/* 1. 스튜디오 모드 토글 (디자인 모드 vs NLE 편집 모드) */}
      {onStudioModeChange && (
        <div className="flex items-center justify-between p-1 bg-muted/60 rounded-xl border border-border text-xs mb-2 shrink-0">
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
      )}

      {/* 2. 🏛️ 1층 4대 마스터 그룹 탭 (올려주신 사진 1~4와 100% 동일한 상단 탭) */}
      <div className="grid grid-flow-col auto-cols-fr gap-0.5 border-b border-border bg-muted/40 p-1 rounded-xl mb-1.5 shrink-0">
        {inspectorGroups.map((group) => {
          const isActive = activeMasterGroup === group.id;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => {
                setActiveMasterGroup(group.id as any);
                if (!group.subTabs.some((t) => t.id === activeInspectorTab)) {
                  setActiveInspectorTab(group.subTabs[0]?.id || "template");
                }
              }}
              className={cn(
                "py-1.5 px-1 rounded-lg text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5",
                isActive
                  ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
              title={group.label}
            >
              <span className="text-xs leading-none">{group.icon}</span>
              <span className="text-[10px] font-medium leading-tight truncate w-full text-center">
                {group.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. ✍️ 2층 폼팩터 맞춤 서브탭 바 (사진 속 [프로필], [대제목], [훅 밴드], [자막], [댓글], [출처] 등) */}
      {(() => {
        const curGroup = inspectorGroups.find((g) => g.id === activeMasterGroup) || inspectorGroups[0];
        if (!curGroup || curGroup.subTabs.length <= 1) return null;
        return (
          <div className="flex items-center gap-1 border-b border-border bg-muted/20 px-1.5 py-1 mb-2 overflow-x-auto custom-scrollbar shrink-0 rounded-lg">
            {curGroup.subTabs.map((sub) => {
              const isSubActive = activeInspectorTab === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setActiveInspectorTab(sub.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-[4px] text-[11px] font-medium transition cursor-pointer shrink-0",
                    isSubActive
                      ? "bg-card text-foreground font-bold border border-border shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* 4. 스크롤 가능한 본체 인스펙터 컨텐츠 영역 */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5 custom-scrollbar pb-16 text-xs">
        {/* 선택된 레이어가 있을 때: 기즈모 변형 패널 (크기, 회전, 위치) */}
        {selectedLayer && (
          <div className="p-2.5 bg-muted/30 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary flex items-center space-x-1">
                <span>✨</span>
                <span>{selectedLayer.name}</span>
              </span>
              <button
                onClick={() => setSelectedLayerId(null)}
                className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
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
          </div>
        )}

        {/* ── 1. 🏛️ 화면 구성 탭 (TemplateInspectorForm) ── */}
        {activeInspectorTab === "template" && (
          <TemplateInspectorForm
            layoutTemplateMode={blueprint.archetype}
            handleSelectTemplateMode={(mode: any) => changeArchetypeMode(mode)}
            handleOpenTemplateLibrary={() => toast.info("템플릿 보관함이 곧 열립니다.")}
            instaConfig={instaConfig}
            setInstaConfig={updateInstaConfig}
            gunlimboConfig={gunlimboConfig}
            setGunlimboConfig={updateGunlimboConfig}
            ssulConfig={ssulConfig}
            setSsulConfig={updateSsulConfig}
            topTitleText={titleConfig.titleLine1}
            setTopTitleText={(t: string) => updateTitleConfig({ titleLine1: t })}
            titleTransform={{ xPct: 50, yPct: 15.0, scale: 1.0, rotationDeg: 0, zIndex: 40 }}
            setTitleTransform={updateTitleConfig}
            profileTransform={{ xPct: 6.0, yPct: 5.5, scale: 1.0, rotationDeg: 0, zIndex: 45 }}
            setProfileTransform={() => {}}
            commentCard={commentCardConfig}
            setCommentCard={updateCommentCardConfig}
            commentTransform={{ xPct: 50, yPct: 82.0, scale: 0.95, rotationDeg: 0, zIndex: 45 }}
            setCommentTransform={() => {}}
            hasCommentCard={true}
            setHasCommentCard={() => {}}
            subTransform={{ xPct: 50, yPct: 75.0, scale: 1.0, rotationDeg: 0, zIndex: 30 }}
            setSubTransform={updateSubtitleConfig}
            subtitleConfig={subtitleConfig}
            setSubtitleConfig={updateSubtitleConfig}
            selectedLayerId={selectedLayerId}
            setSelectedLayerId={setSelectedLayerId}
            activeInspectorTab={activeInspectorTab}
            setActiveInspectorTab={setActiveInspectorTab}
          />
        )}

        {/* ── 2. 📸 인스타 프로필 탭 (InstaProfileInspectorForm) ── */}
        {activeInspectorTab === "profile" && (
          <InstaProfileInspectorForm
            instaConfig={instaConfig}
            setInstaConfig={updateInstaConfig}
          />
        )}

        {/* ── 3. 👑 대제목 탭 (TitleSourceInspectorForm) ── */}
        {activeInspectorTab === "title" && (
          <TitleSourceInspectorForm
            mode="title"
            hasTopTitle={titleConfig.hasTopTitle}
            setHasTopTitle={(v: boolean) => updateTitleConfig({ hasTopTitle: v })}
            titleLinesMode={titleConfig.titleLinesMode}
            setTitleLinesMode={(m: any) => updateTitleConfig({ titleLinesMode: m })}
            titleLine1={titleConfig.titleLine1}
            setTitleLine1={(t: string) => updateTitleConfig({ titleLine1: t })}
            titleLine2={titleConfig.titleLine2}
            setTitleLine2={(t: string) => updateTitleConfig({ titleLine2: t })}
            titleLine1Color={titleConfig.titleLine1Color}
            setTitleLine1Color={(c: string) => updateTitleConfig({ titleLine1Color: c })}
            titleLine2Color={titleConfig.titleLine2Color}
            setTitleLine2Color={(c: string) => updateTitleConfig({ titleLine2Color: c })}
            titleLine1SizePx={titleConfig.titleLine1SizePx}
            setTitleLine1SizePx={(s: number) => updateTitleConfig({ titleLine1SizePx: s })}
            titleLine2SizePx={titleConfig.titleLine2SizePx}
            setTitleLine2SizePx={(s: number) => updateTitleConfig({ titleLine2SizePx: s })}
            titleFontFamily={titleConfig.titleFontFamily}
            setTitleFontFamily={(f: string) => updateTitleConfig({ titleFontFamily: f })}
            titleStroke={titleConfig.titleStroke}
            setTitleStroke={(s: boolean) => updateTitleConfig({ titleStroke: s })}
            titleStrokeWidth={titleConfig.titleStrokeWidth}
            setTitleStrokeWidth={(w: number) => updateTitleConfig({ titleStrokeWidth: w })}
            titleStrokeColor={titleConfig.titleStrokeColor}
            setTitleStrokeColor={(c: string) => updateTitleConfig({ titleStrokeColor: c })}
            titleShadow={titleConfig.titleShadow}
            setTitleShadow={(s: boolean) => updateTitleConfig({ titleShadow: s })}
            titleShadowBlur={titleConfig.titleShadowBlur}
            setTitleShadowBlur={(b: number) => updateTitleConfig({ titleShadowBlur: b })}
            titleShadowColor={titleConfig.titleShadowColor}
            setTitleShadowColor={(c: string) => updateTitleConfig({ titleShadowColor: c })}
            layoutTemplateMode={blueprint.archetype}
          />
        )}

        {/* ── 4. 🎯 훅 밴드 / 쨉쨉이 탭 (JabHookInspectorForm) ── */}
        {activeInspectorTab === "jabHook" && (
          <JabHookInspectorForm
            hasJab={true}
            setHasJab={() => {}}
            jabText={gunlimboConfig.hookPhrase}
            setJabText={(t: any) => updateGunlimboConfig({ hookPhrase: typeof t === "function" ? t(gunlimboConfig.hookPhrase) : t })}
            jabTiltDeg={0}
            setJabTiltDeg={() => {}}
            jabFontSize={gunlimboConfig.hookFontSize}
            setJabFontSize={(s: any) => updateGunlimboConfig({ hookFontSize: typeof s === "function" ? s(gunlimboConfig.hookFontSize) : s })}
            jabTextColor={gunlimboConfig.hookTextColor}
            setJabTextColor={(c: any) => updateGunlimboConfig({ hookTextColor: typeof c === "function" ? c(gunlimboConfig.hookTextColor) : c })}
            jabBgEnabled={true}
            setJabBgEnabled={() => {}}
            jabBgColor={gunlimboConfig.hookBgColor}
            setJabBgColor={(c: any) => updateGunlimboConfig({ hookBgColor: typeof c === "function" ? c(gunlimboConfig.hookBgColor) : c })}
            jabBorderRadius={0}
            setJabBorderRadius={() => {}}
            jabStroke={false}
            setJabStroke={() => {}}
            jabStrokeWidth={1}
            setJabStrokeWidth={() => {}}
            jabStrokeColor="#000000"
            jabShadow={false}
            setJabShadow={() => {}}
            jabShadowBlur={4}
            setJabShadowBlur={() => {}}
            layoutTemplateMode={blueprint.archetype}
            gunlimboConfig={gunlimboConfig}
            setGunlimboConfig={updateGunlimboConfig}
          />
        )}

        {/* ── 5. 💬 댓글 카드 탭 (CommentCardInspectorForm) ── */}
        {activeInspectorTab === "commentCard" && (
          <CommentCardInspectorForm
            hasCommentCard={true}
            setHasCommentCard={() => {}}
            commentCard={commentCardConfig}
            setCommentCard={updateCommentCardConfig}
          />
        )}

        {/* ── 6. 📜 썰형 헤더 / 메타 / 구분선 / 제목 탭 (SsulObjectInspectorForm) ── */}
        {["ssulHeader", "metadata", "divider", "postTitle"].includes(activeInspectorTab) && (
          <SsulObjectInspectorForm
            mode={activeInspectorTab as any}
            ssulConfig={ssulConfig}
            setSsulConfig={updateSsulConfig}
          />
        )}

        {/* ── 7. 💬 본문 자막 탭 (SubtitleStyleInspectorForm) ── */}
        {activeInspectorTab === "style" && (
          <SubtitleStyleInspectorForm
            subtitleConfig={subtitleConfig}
            setSubtitleConfig={updateSubtitleConfig}
          />
        )}

        {/* ── 8. 🏷️ 하단 출처 탭 (TitleSourceInspectorForm mode="sourceCredit") ── */}
        {activeInspectorTab === "sourceCredit" && (
          <TitleSourceInspectorForm
            mode="sourceCredit"
            hasBottomSource={true}
            setHasBottomSource={() => {}}
            bottomSourceText="출처: 온라인 커뮤니티"
            setBottomSourceText={() => {}}
            bottomSourceColor="#CBD5E1"
            setBottomSourceColor={() => {}}
            bottomSourceSizePx={12}
            setBottomSourceSizePx={() => {}}
            bottomSourceFontFamily="Pretendard"
            setBottomSourceFontFamily={() => {}}
            bottomSourceBold={false}
            setBottomSourceBold={() => {}}
            bottomSourceItalic={false}
            setBottomSourceItalic={() => {}}
            bottomSourceAlign="center"
            setBottomSourceAlign={() => {}}
          />
        )}

        {/* ── 9. 🕳️ 비디오 크롭 / 홀 윈도우 탭 (VideoCropInspectorForm) ── */}
        {activeInspectorTab === "videoCrop" && (
          <VideoCropInspectorForm
            layoutTemplateMode={blueprint.archetype}
            instaConfig={instaConfig}
            setInstaConfig={updateInstaConfig}
          />
        )}

        {/* ── 10. 🎬 영상 연출 필터 탭 (FilterFxInspectorForm) ── */}
        {activeInspectorTab === "filterFx" && (
          <FilterFxInspectorForm />
        )}

        {/* ── 11. ➕ 무한 레이어 확장 도구 바 (항상 하단에 배치) ── */}
        <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-2 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center space-x-1.5">
              <Plus className="w-3.5 h-3.5 text-primary" />
              <span>새 레이어 추가 (무한 확장)</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              총 {blueprint.globalLayers.length}개 레이어
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            원하는 객체를 자유롭게 추가하여 나만의 커스텀 쇼츠 템플릿을 만듭니다.
          </p>

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              onClick={() => handleAddNewLayer("text")}
              className="py-1.5 px-2 bg-background hover:bg-muted text-foreground border border-border rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition-all cursor-pointer shadow-2xs"
            >
              <Type className="w-3.5 h-3.5 text-amber-500" />
              <span>텍스트</span>
            </button>
            <button
              onClick={() => handleAddNewLayer("shape")}
              className="py-1.5 px-2 bg-background hover:bg-muted text-foreground border border-border rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition-all cursor-pointer shadow-2xs"
            >
              <Square className="w-3.5 h-3.5 text-blue-500" />
              <span>쉐이프 박스</span>
            </button>
            <button
              onClick={() => handleAddNewLayer("emoji")}
              className="py-1.5 px-2 bg-background hover:bg-muted text-foreground border border-border rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition-all cursor-pointer shadow-2xs"
            >
              <Smile className="w-3.5 h-3.5 text-emerald-500" />
              <span>이모지</span>
            </button>
          </div>
        </div>

        {/* ── 12. 전체 레이어 퀵 스위처 ── */}
        <div className="pt-2">
          <LayerQuickSwitcher />
        </div>
      </div>
    </div>
  );
};

export default SovereignMasterInspector;
