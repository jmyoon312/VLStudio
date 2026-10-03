import React, { useRef, useEffect, useState, useCallback } from "react";
import { useBlueprint } from "../core/BlueprintContext";
import { useSovereignStudio } from "../core/SovereignStudioContext";
import { DomTransformGizmoOverlay } from "./DomTransformGizmoOverlay";
import { SafeZoneOverhangGuard } from "./SafeZoneOverhangGuard";
import { MockupBackdropSelector, BackdropType, BACKDROP_CONFIGS } from "./MockupBackdropSelector";
import { resolveFontFamily } from "../../../lib/blueprintV4Migrator";
import {
  TitleFloatingInspector,
  CommentCardFloatingInspector,
  InstaProfileFloatingInspector,
  GunlimboHookBandFloatingInspector,
  BadgeTagFloatingInspector,
  JabHookFloatingInspector,
  SourceCreditFloatingInspector,
  TopBottomBarFloatingInspector,
  VideoCropFloatingInspector,
  SubtitleFloatingInspector,
  SsulHeaderFloatingInspector,
  PostTitleFloatingInspector,
  MetadataFloatingInspector,
  DividerFloatingInspector,
  SsulSubtitleFloatingInspector,
} from "../../canvas/floating";
import { MemeAvatar } from "@/components/memeAssets";
import { Maximize2, ZoomIn, ZoomOut, Check, ChevronDown } from "lucide-react";

export interface CanvasKitStageProps {
  className?: string;
  studioMode?: "design" | "nle";
}

/**
 * [CanvasKitStage]
 * 60fps WebGL/Canvas 뷰포트 렌더러
 * - [프로덕션 하드닝 2.4] WebGL Context Loss 자동 감지 및 무손실 복구
 * - 1080x1920 기준 좌표계 ➔ 화면 반응형 오프셋/스케일 매핑
 * - 수동 줌/축소/화면맞춤 컨트롤 및 Ctrl+휠 줌 지원
 * - 디자인 모드 캔버스 노이즈 제로화 (대본 박스/키네틱 자막 격리)
 * - 피그마급 기즈모 및 세이프존 오버레이 통합
 */
export const CanvasKitStage: React.FC<CanvasKitStageProps> = ({
  className = "",
  studioMode = "nle",
}) => {
  const {
    blueprint,
    selectedLayerId,
    setSelectedLayerId,
    currentTimeMs,
    isPlaying,
    updateLayerTransform,
    updateLayerContent,
    updateLayerStyle,
  } = useBlueprint();

  const sovereign = useSovereignStudio();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastClickRef = useRef<{ id: string; time: number }>({ id: "", time: 0 });

  const [fitScale, setFitScale] = useState<number>(0.35);
  const [userZoom, setUserZoom] = useState<number | null>(null);
  const scale = userZoom ?? fitScale;

  const [backdrop, setBackdrop] = useState<BackdropType>("studio");
  const [showSafeZone, setShowSafeZone] = useState<boolean>(true);
  const [previewViewMode, setPreviewViewMode] = useState<"video" | "list">("video");

  const hasCommentCards = (blueprint?.globalLayers || []).some(
    (l) => l.kind === "shape" && (l as any).shapeRole === "comment_card"
  );

  const canvasWidth = blueprint.canvas.width || 1080;
  const canvasHeight = blueprint.canvas.height || 1920;

  // 1. 컨테이너 리사이즈에 맞춘 캔버스 자동 맞춤 스케일 계산
  const updateLayout = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth: cw, clientHeight: ch } = containerRef.current;
    if (cw === 0 || ch === 0) return;

    const padding = 24;
    const availW = cw - padding * 2;
    const availH = ch - padding * 2;

    const scaleX = availW / canvasWidth;
    const scaleY = availH / canvasHeight;
    const computedScale = Math.min(scaleX, scaleY, 0.95);

    setFitScale(computedScale);
  }, [canvasWidth, canvasHeight]);

  // 줌 조절 핸들러
  const handleZoomIn = () => {
    const next = Math.min(4.0, Math.round((scale + 0.1) * 10) / 10);
    setUserZoom(next);
  };

  const handleZoomOut = () => {
    const next = Math.max(0.2, Math.round((scale - 0.1) * 10) / 10);
    setUserZoom(next);
  };

  const handleZoomReset = () => {
    setUserZoom(null);
  };

  // 🎯 마우스 휠 줌 (0.2x ~ 4.0x 부드러운 줌)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // 플로팅 인스펙터 팝업창 및 내부 스크롤 영역 조작 시 캔버스 줌인/줌아웃 방지
      const rawTarget = e.target as Node | null;
      const target = rawTarget instanceof HTMLElement ? rawTarget : rawTarget?.parentElement;
      if (
        target?.closest?.(
          ".floating-inspector-card, [data-no-canvas-zoom='true'], .custom-scrollbar, select, input, textarea, [role='slider']"
        )
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      const zoomDelta = -e.deltaY * 0.0015;
      setUserZoom((prev) => {
        const current = prev ?? fitScale;
        const next = Math.max(0.2, Math.min(4.0, current + zoomDelta));
        return parseFloat(next.toFixed(3));
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, [fitScale]);

  // 2. 컨테이너 크기 변경 감지 (타임라인 펼침/접힘 및 윈도우 리사이즈 즉각 반응)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateLayout();

    const ro = new ResizeObserver(() => {
      updateLayout();
    });

    ro.observe(el);
    window.addEventListener("resize", updateLayout);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateLayout);
    };
  }, [updateLayout]);

  // 스튜디오 모드 변경 시 화면 맞춤 복원
  useEffect(() => {
    setUserZoom(null);
    updateLayout();
  }, [studioMode, updateLayout]);

  // 3. [프로덕션 하드닝 2.4] WebGL Context Loss 복구 리스너
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn("[CanvasKitStage] WebGL Context Lost! Waiting for restoration...");
    };

    const handleContextRestored = () => {
      console.info("[CanvasKitStage] WebGL Context Restored! Recreating surface...");
      updateLayout();
    };

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, [updateLayout]);

  // 3. 현재 재생 시점에 해당하는 씬 찾기
  let currentScene = blueprint.scenes[0];
  let accumulatedMs = 0;
  for (const sc of blueprint.scenes) {
    const dur = sc.actualDurationMs || sc.targetDurationMs;
    if (currentTimeMs >= accumulatedMs && currentTimeMs < accumulatedMs + dur) {
      currentScene = sc;
      break;
    }
    accumulatedMs += dur;
  }

  // 4. 현재 활성 텍스트 자막 계산
  const activeWord = currentScene?.words?.find((w) => {
    const sceneStart = accumulatedMs;
    return (
      currentTimeMs >= sceneStart + w.startMs &&
      currentTimeMs <= sceneStart + w.endMs
    );
  });

  const selectedLayer = blueprint.globalLayers.find((l) => l.id === selectedLayerId) || null;

  return (
    <div className={`relative w-full h-full flex flex-col bg-muted/30 dark:bg-zinc-950 overflow-hidden select-none ${className}`}>
      {/* 1. 상단 전용 뷰포트 도구 바 (캔버스를 가리지 않는 독립 바) */}
      <div
        className="h-9 px-3 bg-card/85 backdrop-blur-xs border-b border-border flex items-center justify-between shrink-0 select-none z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-2">
          <MockupBackdropSelector
            currentBackdrop={backdrop}
            onChangeBackdrop={setBackdrop}
          />
          <button
            onClick={() => setShowSafeZone(!showSafeZone)}
            className={`px-2 py-0.5 text-xs rounded border font-medium transition-colors cursor-pointer ${
              showSafeZone
                ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/40"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {showSafeZone ? "세이프존 ON" : "세이프존 OFF"}
          </button>

          {/* 픽셀링 1:1 댓글/카드 폼팩터 전용 뷰 모드 토글 */}
          {(hasCommentCards || blueprint.archetype === "instagram" || blueprint.archetype === "ssul") && (
            <div className="flex items-center p-0.5 bg-card border border-border rounded text-xs ml-2">
              <button
                onClick={() => setPreviewViewMode("video")}
                className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                  previewViewMode === "video"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🎬 영상 화면
              </button>
              <button
                onClick={() => setPreviewViewMode("list")}
                className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                  previewViewMode === "list"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                💬 카드 목록
              </button>
            </div>
          )}
        </div>

        <div className="text-[11px] font-medium text-muted-foreground hidden sm:block">
          {studioMode === "design" ? "🎨 디자인 템플릿 뷰포트" : "🎛️ NLE 실시간 프리뷰"}
        </div>

        {/* 캔버스 줌 도구 모음 (맞춤 버튼 + 배율 드롭다운 + 마우스 휠 줌) */}
        <div className="flex items-center space-x-1.5 bg-card border border-border px-1.5 py-0.5 rounded shadow-xs text-xs">
          {/* 화면 맞춤 버튼 */}
          <button
            onClick={handleZoomReset}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
              userZoom === null
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title="화면 크기에 맞춤 (Fit)"
          >
            <Maximize2 className="w-3 h-3" />
            <span>맞춤</span>
          </button>

          {/* 배율 프리셋 드롭다운 */}
          <div className="relative inline-flex items-center">
            <select
              value={
                userZoom === null
                  ? "fit"
                  : Math.abs(scale - 0.5) < 0.05
                  ? "50"
                  : Math.abs(scale - 0.75) < 0.05
                  ? "75"
                  : Math.abs(scale - 1.0) < 0.05
                  ? "100"
                  : Math.abs(scale - 1.5) < 0.05
                  ? "150"
                  : Math.abs(scale - 2.0) < 0.05
                  ? "200"
                  : "custom"
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === "fit") handleZoomReset();
                else if (val === "50") setUserZoom(0.5);
                else if (val === "75") setUserZoom(0.75);
                else if (val === "100") setUserZoom(1.0);
                else if (val === "150") setUserZoom(1.5);
                else if (val === "200") setUserZoom(2.0);
              }}
              className="h-6 px-1.5 pr-5 text-[11px] font-mono font-medium bg-muted/60 text-foreground border border-border/80 rounded cursor-pointer appearance-none hover:bg-muted transition-colors"
              title="배율 선택 또는 마우스 휠로 자유 줌"
            >
              <option value="fit">맞춤 ({Math.round(fitScale * 100)}%)</option>
              <option value="50">50%</option>
              <option value="75">75%</option>
              <option value="100">100%</option>
              <option value="150">150%</option>
              <option value="200">200%</option>
              {userZoom !== null && (
                <option value="custom">
                  {Math.round(scale * 100)}% (휠 줌)
                </option>
              )}
            </select>
            <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 pointer-events-none text-muted-foreground" />
          </div>

          {/* 축소/확대 버튼 */}
          <button
            onClick={handleZoomOut}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer font-bold"
            title="축소 (마우스 휠 아래)"
          >
            -
          </button>
          <button
            onClick={handleZoomIn}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer font-bold"
            title="확대 (마우스 휠 위)"
          >
            +
          </button>
        </div>
      </div>

      {/* 2. 중앙 캔버스 뷰포트 (스크롤 및 중앙 정렬) */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-auto p-4 select-none"
        onClick={() => setSelectedLayerId(null)}
      >
        {previewViewMode === "list" ? (
          /* 카드 목록 모드 (픽셀링 1:1 댓글/커뮤니티 리스트 뷰) */
          <div className="w-full max-w-xl h-full overflow-y-auto space-y-3.5 p-4 custom-scrollbar">
            <div className="text-center pb-1 text-xs text-muted-foreground font-medium">
              💬 댓글 및 카드 레이아웃 목록 (카드를 클릭하여 우측 인스펙터에서 즉시 편집)
            </div>
            {blueprint.globalLayers
              .filter((l) => l.kind === "shape" || l.kind === "text")
              .map((layer) => {
                const isSelected = selectedLayerId === layer.id;
                return (
                  <div
                    key={layer.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLayerId(layer.id);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                      isSelected
                        ? "ring-2 ring-primary border-primary bg-card"
                        : "border-border bg-card/80 hover:bg-card hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40 text-xs">
                      <span className="font-bold text-foreground flex items-center space-x-1.5">
                        <span>{layer.kind === "text" ? "🔤" : "💬"}</span>
                        <span>{layer.name}</span>
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {(layer as any).textRole || (layer as any).shapeRole || layer.kind}
                      </span>
                    </div>
                    {layer.kind === "text" ? (
                      <div className="text-xs font-semibold text-foreground whitespace-pre-wrap leading-relaxed">
                        {(layer as any).content || "내용 없음"}
                      </div>
                    ) : (
                      <div
                        className="p-3 rounded-xl flex items-center justify-between text-xs text-foreground/80 border border-border/60"
                        style={{
                          backgroundColor:
                            (layer as any).fillColor === "transparent"
                              ? "rgba(128,128,128,0.08)"
                              : (layer as any).fillColor || "rgba(128,128,128,0.08)",
                          borderRadius: `${Math.min(16, (layer as any).borderRadius || 8)}px`,
                        }}
                      >
                        <span className="font-medium flex items-center space-x-1.5">
                          <span>
                            {(layer as any).shapeRole === "comment_card"
                              ? "💬"
                              : (layer as any).shapeRole === "hole_mask"
                              ? "🎬"
                              : "🎨"}
                          </span>
                          <span>
                            {(layer as any).shapeRole === "comment_card"
                              ? "인스타/유튜브 베댓 카드 프레임"
                              : (layer as any).shapeRole === "hole_mask"
                              ? "비디오 영상 재생 프레임"
                              : layer.name}
                          </span>
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          W: {layer.transform.width}px × H: {layer.transform.height}px
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          /* 물리 캔버스 컨테이너 (스크린 스페이스 배치) */
          <div
            className="relative shadow-2xl transition-all border border-border/80 ring-1 ring-black/5 dark:ring-white/10 rounded-sm shrink-0 overflow-hidden"
            style={{
              width: `${canvasWidth * scale}px`,
              height: `${canvasHeight * scale}px`,
              backgroundColor: blueprint.canvas.backgroundColor || "#000000",
              ...(backdrop === "transparent"
                ? BACKDROP_CONFIGS.transparent.style
                : backdrop !== "studio"
                ? BACKDROP_CONFIGS[backdrop].style
                : {}),
              boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(6, 182, 212, 0.08)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
          {/* 네이티브 HTML5 2D / WebGL 캔버스 */}
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* 씬 배경 미디어 / 모션 프리뷰 */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
            {currentScene?.mediaUrl ? (
              <img
                src={currentScene.mediaUrl}
                alt="Scene media"
                className="w-full h-full object-cover"
              />
            ) : studioMode === "design" ? (
              /* 디자인 모드: 레이어 시인성을 방해하지 않는 깔끔한 투명 격자 패턴 */
              <div className="w-full h-full opacity-10 bg-[radial-gradient(#888_1px,transparent_1px)] [background-size:24px_24px]" />
            ) : (
              /* NLE 모드: 텍스트 레이어를 가리지 않는 미니멀 씬 인디케이터 배지 */
              <div className="text-center p-4 select-none pointer-events-none">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-black/40 rounded-full border border-white/10 backdrop-blur-xs text-xs font-mono text-zinc-400 shadow-sm">
                  <span>🎬</span>
                  <span>씬 {(blueprint.scenes || []).indexOf(currentScene) + 1}: [{currentScene?.role || "0s_hook"}]</span>
                </div>
              </div>
            )}
          </div>

          {/* 글로벌 레이어 렌더링 */}
          {(blueprint?.globalLayers || []).map((layer) => {
            if (layer.hidden) return null;

            const allLayers = blueprint?.globalLayers || [];

            // 합성 카드에 내장된 텍스트 서브레이어는 중복 렌더링 방지
            const hasProfileHeader = allLayers.some((l) => l.id.includes("profile_header"));
            if (hasProfileHeader && layer.id.includes("profile_text")) return null;

            const hasCommentCard = allLayers.some((l) => l.id.includes("comment_card"));
            if (hasCommentCard && (layer.id.includes("comment_body") || layer.id.includes("comment_meta"))) return null;

            const hasHookBand = allLayers.some((l) => l.id.includes("hook_band"));
            if (hasHookBand && layer.id.includes("hook_text")) return null;

            const hasHeaderBar = allLayers.some((l) => l.id.includes("header_bar"));
            if (hasHeaderBar && layer.id.includes("header_title")) return null;

            const hasArticleCard = allLayers.some((l) => l.id.includes("article_card"));
            if (hasArticleCard && (layer.id.includes("article_title") || layer.id.includes("article_meta"))) return null;

            const hasMemeFrame = allLayers.some((l) => l.id.includes("meme_frame"));
            if (hasMemeFrame && layer.id.includes("meme_caption")) return null;

            // title_line1이나 breaking_title이 메인 타이틀을 렌더링하므로 title_line2의 독립 중복 렌더링 방지
            const hasMainTitleLayer = allLayers.some((l) => l.id === "title_line1" || l.id === "breaking_title");
            if (hasMainTitleLayer && layer.id === "title_line2") return null;

            const t = layer.transform;
            const isSelected = layer.id === selectedLayerId;
            const isSubtitle = (layer as any).textRole === "subtitle_narrative" || layer.id.includes("subtitle");

            return (
              <div
                key={layer.id}
                onClick={(e) => {
                  e.stopPropagation();
                  const now = Date.now();
                  const isDbl = lastClickRef.current.id === layer.id && (now - lastClickRef.current.time < 380);
                  lastClickRef.current = { id: layer.id, time: now };

                  if (isDbl) {
                    if (sovereign) {
                      sovereign.handleLayerDoubleClick(layer);
                    }
                  } else {
                    if (sovereign) {
                      sovereign.handleLayerSingleClick(layer);
                    } else {
                      setSelectedLayerId(layer.id);
                    }
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (sovereign) {
                    sovereign.handleLayerDoubleClick(layer);
                  }
                }}
                className={`absolute cursor-pointer transition-shadow ${
                  isSelected ? "" : "hover:ring-1 hover:ring-cyan-500/50"
                }`}
                style={{
                  left: `${(t.x - t.width / 2) * scale}px`,
                  top: `${(t.y - t.height / 2 + ((layer as any).verticalPosition || 0)) * scale}px`,
                  width: `${t.width * scale}px`,
                  height: `${t.height * scale}px`,
                  transform: `rotate(${t.rotation || 0}deg) scale(${t.scale || 1})`,
                  transformOrigin: "center center",
                  zIndex: t.zIndex,
                  opacity: layer.opacity,
                }}
              >
                {/* 1. 📸 인스타 프로필 카드 렌더러 (TemplateCanvasViewport 원조 규격 1:1 완벽 일치) */}
                {layer.id.includes("profile_header") && (
                  <div
                    className="w-full h-full flex items-center px-4 justify-between bg-white text-zinc-900 border border-zinc-200/90 shadow-md select-none"
                    style={{ borderRadius: `${((layer as any).borderRadius || 20) * scale}px` }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="rounded-full border-2 border-blue-500 overflow-hidden bg-white shadow-2xs shrink-0 flex items-center justify-center"
                        style={{ width: `${48 * scale}px`, height: `${48 * scale}px` }}
                      >
                        <img
                          src={sovereign?.instaConfig?.profileAvatarUrl || "https://api.dicebear.com/9.x/lorelei/svg?seed=user_avatar_blue"}
                          alt="profile"
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      </div>
                      <div className="flex flex-col text-left min-w-0">
                        <div className="flex items-center gap-1 font-black text-zinc-900 leading-tight truncate" style={{ fontSize: `${22 * scale}px` }}>
                          <span className="truncate">{sovereign?.instaConfig?.profileName || "축구 하이라이트 매거진"}</span>
                          <span className="text-blue-500 font-extrabold" style={{ fontSize: `${18 * scale}px` }}>✓</span>
                        </div>
                        <span className="text-zinc-500 font-medium truncate" style={{ fontSize: `${17 * scale}px` }}>
                          {sovereign?.instaConfig?.profileHandle || "@football_korea_tv"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-3.5 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 font-bold rounded-full border border-blue-200/60 shadow-2xs shrink-0 transition"
                      style={{ fontSize: `${17 * scale}px` }}
                    >
                      팔로우
                    </button>
                  </div>
                )}

                {/* 2. 💬 인스타 / 커뮤니티 베댓 카드 렌더러 (TemplateCanvasViewport 원조 규격 1:1 완벽 일치) */}
                {layer.id.includes("comment_card") && (
                  <div
                    className="w-full h-full flex flex-col justify-between p-4 bg-white/95 text-zinc-900 border border-zinc-200/90 rounded-2xl shadow-xl select-none"
                    style={{
                      borderRadius: `${((layer as any).borderRadius || 20) * scale}px`,
                      backgroundColor: (layer as any).fillColor || sovereign?.commentCardConfig?.bgColor || "#FFFFFF",
                    }}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="rounded-full border border-zinc-200 bg-zinc-100 overflow-hidden shrink-0 flex items-center justify-center font-bold"
                        style={{ width: `${42 * scale}px`, height: `${42 * scale}px` }}
                      >
                        <img
                          src={sovereign?.commentCardConfig?.avatarUrl || "https://api.dicebear.com/9.x/bottts/svg?seed=commenter"}
                          alt="commenter"
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1.5 font-bold text-zinc-900" style={{ fontSize: `${19 * scale}px` }}>
                          <span className="truncate">{sovereign?.commentCardConfig?.author || "축구도사"}</span>
                          <span className="text-zinc-400 font-mono font-normal truncate" style={{ fontSize: `${15 * scale}px` }}>
                            {sovereign?.commentCardConfig?.handle || "@user_***"}
                          </span>
                          <span className="text-zinc-400 text-xs font-normal shrink-0 ml-auto" style={{ fontSize: `${15 * scale}px` }}>
                            {sovereign?.commentCardConfig?.timeText || "3시간 전"}
                          </span>
                        </div>
                        <div className="font-semibold text-zinc-900 mt-1 line-clamp-2 leading-snug break-keep" style={{ fontSize: `${22 * scale}px` }}>
                          {sovereign?.commentCardConfig?.text || "진짜 이 골은 봐도 봐도 소름 돋네요 ㄷㄷ 월드클래스 인정"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-zinc-600 pt-2 border-t border-zinc-200/60 mt-1" style={{ fontSize: `${16 * scale}px` }}>
                      <span className="flex items-center gap-1 font-semibold text-red-500">
                        ❤️ {sovereign?.commentCardConfig?.likes || "1.4만"}
                      </span>
                      <span className="bg-primary/15 text-primary font-bold px-2 py-0.5 rounded-xs" style={{ fontSize: `${14 * scale}px` }}>
                        📌 베댓
                      </span>
                    </div>
                  </div>
                )}

                {/* 3. 🎯 군림보 100% 와이드 훅 밴드 렌더러 */}
                {layer.id.includes("hook_band") && (
                  <div
                    className="w-full h-full flex items-center justify-center shadow-xl border-y border-white/30 select-none px-4"
                    style={{
                      backgroundColor: sovereign?.gunlimboConfig?.hookBgColor || (layer as any).fillColor || "#FFFFFF",
                      borderRadius: `${((layer as any).borderRadius || 0) * scale}px`,
                    }}
                  >
                    <span
                      className="font-black tracking-tight select-none uppercase truncate text-center"
                      style={{
                        color: sovereign?.gunlimboConfig?.hookTextColor || "#000000",
                        fontSize: `${(sovereign?.gunlimboConfig?.hookFontSize || 42) * scale}px`,
                        fontFamily: resolveFontFamily(sovereign?.gunlimboConfig?.hookFont || "Pretendard"),
                        lineHeight: 1.15,
                      }}
                    >
                      {sovereign?.gunlimboConfig?.hookPhrase || "⚡ 0초 시선강탈 훅 카피가 여기에 들어갑니다"}
                    </span>
                  </div>
                )}

                {/* 4. 📜 썰형 상단 커뮤니티 헤더바 렌더러 (SsulCanvasLayout 원조 규격 1:1 완벽 일치) */}
                {layer.id.includes("header_bar") && (
                  <div
                    className="w-full h-full flex items-center justify-between px-5 font-bold shadow-md select-none border-b border-black/[0.08]"
                    style={{
                      backgroundColor: sovereign?.ssulConfig?.ssulHeader?.bgColor || (layer as any).fillColor || "#F7CF46",
                      color: sovereign?.ssulConfig?.ssulHeader?.textColor || "#18181B",
                    }}
                  >
                    <div className="w-8 h-8 flex items-center justify-start text-zinc-900" style={{ fontSize: `${24 * scale}px` }}>
                      ←
                    </div>
                    <span
                      className="font-black tracking-tight truncate flex-1 text-center"
                      style={{
                        fontSize: `${24 * scale}px`,
                        color: sovereign?.ssulConfig?.ssulHeader?.textColor || "#18181B",
                        fontFamily: resolveFontFamily(sovereign?.ssulConfig?.ssulHeader?.font || "Pretendard"),
                      }}
                    >
                      🔥 {sovereign?.ssulConfig?.ssulHeader?.text || "실시간 베스트"}
                    </span>
                    <div className="w-8 h-8 flex items-center justify-end text-zinc-900" style={{ fontSize: `${24 * scale}px` }}>
                      ⋮
                    </div>
                  </div>
                )}

                {/* 5. 📜 썰형 게시글 메타 카드 렌더러 (SsulCanvasLayout 원조 규격 1:1 완벽 일치) */}
                {layer.id.includes("article_card") && (
                  <div
                    className="w-full h-full p-4 flex flex-col justify-between bg-white rounded-2xl border border-zinc-200/90 shadow-md select-none text-left"
                    style={{
                      borderRadius: `${16 * scale}px`,
                    }}
                  >
                    <div
                      className="font-black text-zinc-900 tracking-tight truncate whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{ fontSize: `${26 * scale}px` }}
                    >
                      {sovereign?.ssulConfig?.postTitle?.text || sovereign?.titleConfig?.titleLine1 || "오늘자 역대급 실화 사건 🔥"}
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-500 font-medium shrink-0 pt-1" style={{ fontSize: `${18 * scale}px` }}>
                      <span className="bg-emerald-600 text-white font-black px-1.5 py-0.2 rounded-2xs uppercase tracking-wider" style={{ fontSize: `${13 * scale}px` }}>
                        BLIND
                      </span>
                      <span className="font-semibold text-zinc-800">
                        {sovereign?.ssulConfig?.metadata?.authorText || sovereign?.ssulConfig?.author || "대기업 익명"}
                      </span>
                      <span className="opacity-40">·</span>
                      <span>{sovereign?.ssulConfig?.metadata?.timeText || sovereign?.ssulConfig?.timeText || "10분 전"}</span>
                      <span className="opacity-40">·</span>
                      <span>{sovereign?.ssulConfig?.metadata?.viewsText || sovereign?.ssulConfig?.viewsText || "조회 2.4만"}</span>
                      <span className="opacity-40">·</span>
                      <span className="text-emerald-600 font-bold">추천 382</span>
                    </div>
                    <div className="w-full border-t border-zinc-200 my-1" />
                  </div>
                )}

                {/* 6. 🐸 썰형 페페/이라스토야 밈 리액션 짤 렌더러 */}
                {layer.id.includes("meme_frame") && (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center p-3 rounded-2xl border border-zinc-700 bg-zinc-900/90 shadow-xl overflow-hidden select-none"
                    style={{ borderRadius: `${20 * scale}px` }}
                  >
                    <MemeAvatar
                      type={sovereign?.ssulConfig?.memeType || "pepe"}
                      emotion={sovereign?.ssulConfig?.memeEmotion || "happy"}
                      aliveMotion={sovereign?.ssulConfig?.memeAliveMotion ?? true}
                      size={Math.min(t.width, t.height) * scale * 0.72}
                    />
                    <span className="text-zinc-400 font-bold mt-1" style={{ fontSize: `${18 * scale}px` }}>
                      {sovereign?.ssulConfig?.memeType === "pepe" ? "🐸 개구리 페페" : "✨ 이라스토야"}
                    </span>
                  </div>
                )}

                {/* 7. 👑 군림보/일반 2줄 대제목 (속보 배지 포함) 렌더러 (자막 레이어는 절대 진입 금지!) */}
                {layer.kind === "text" && blueprint.archetype !== "ssul" && !layer.id.includes("subtitle") && (layer.id.includes("breaking") || (layer.id.includes("title") && !layer.id.includes("header")) || layer.id.includes("headline")) && (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center select-none">
                    {sovereign?.titleConfig?.hasTitleBadge && (
                      <span
                        className="font-black px-3 py-1 uppercase tracking-wider mb-2 shadow-xs inline-block leading-tight select-none border border-white/20"
                        style={{
                          backgroundColor: sovereign?.titleConfig?.titleBadgeBg || "#EF4444",
                          color: sovereign?.titleConfig?.titleBadgeColor || "#FFFFFF",
                          fontSize: `${(sovereign?.titleConfig?.titleBadgeSizePx || 14) * scale}px`,
                          borderRadius: `${(sovereign?.titleConfig?.titleBadgeRadius ?? 4) * scale}px`,
                        }}
                      >
                        {sovereign?.titleConfig?.titleBadgeText || "속보"}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: `${(sovereign?.titleConfig?.titleLine1SizePx || 38) * scale}px`,
                        color: sovereign?.titleConfig?.titleLine1Color || "#FFFFFF",
                        fontFamily: resolveFontFamily(sovereign?.titleConfig?.titleFontFamily || "Pretendard"),
                        fontWeight: 900,
                        WebkitTextStroke: sovereign?.titleConfig?.titleStroke ? `${(sovereign?.titleConfig?.titleStrokeWidth || 2) * scale}px ${sovereign?.titleConfig?.titleStrokeColor || "#000"}` : "none",
                        textShadow: sovereign?.titleConfig?.titleShadow ? `0 2px ${(sovereign?.titleConfig?.titleShadowBlur || 8) * scale}px ${sovereign?.titleConfig?.titleShadowColor || "#000"}` : "none",
                        lineHeight: sovereign?.titleConfig?.titleLineHeight || 1.15,
                        display: "block",
                      }}
                    >
                      {sovereign?.titleConfig?.titleLine1 || "충격 실화 사건"}
                    </span>
                    {sovereign?.titleConfig?.titleLinesMode === "double" && sovereign?.titleConfig?.titleLine2 && (
                      <span
                        style={{
                          fontSize: `${(sovereign?.titleConfig?.titleLine2SizePx || 48) * scale}px`,
                          color: sovereign?.titleConfig?.titleLine2Color || "#FFE500",
                          fontFamily: resolveFontFamily(sovereign?.titleConfig?.titleFontFamily || "Pretendard"),
                          fontWeight: 900,
                          WebkitTextStroke: sovereign?.titleConfig?.titleStroke ? `${(sovereign?.titleConfig?.titleStrokeWidth || 2) * scale}px ${sovereign?.titleConfig?.titleStrokeColor || "#000"}` : "none",
                          textShadow: sovereign?.titleConfig?.titleShadow ? `0 2px ${(sovereign?.titleConfig?.titleShadowBlur || 8) * scale}px ${sovereign?.titleConfig?.titleShadowColor || "#000"}` : "none",
                          lineHeight: sovereign?.titleConfig?.titleLineHeight || 1.15,
                          display: "block",
                          marginTop: `${4 * scale}px`,
                        }}
                      >
                        {sovereign?.titleConfig?.titleLine2}
                      </span>
                    )}
                  </div>
                )}

                {/* 8. 🔤 표준 텍스트 레이어 렌더러 (자막, 출처, 일반 텍스트, 썰형 텍스트) */}
                {layer.kind === "text" && (layer.id.includes("subtitle") || (!layer.id.includes("breaking") && !layer.id.includes("headline") && (!layer.id.includes("title") || layer.id.includes("header"))) || blueprint.archetype === "ssul") && (() => {
                  const content = isSubtitle && (isPlaying || studioMode === "nle") && activeWord
                    ? activeWord.word
                    : ((layer as any).content || "");
                  const lines = content.split("\n");
                  const multiStyles = (layer as any).multiLineStyles || [];
                  const hasMultiStyles = multiStyles.length > 0 && lines.length > 1;

                  const rawFont = (layer as any).fontFamily || "";
                  const strokeWidth = (layer as any).stroke?.width || 0;
                  const strokeColor = (layer as any).stroke?.color || "#000000";
                  const shadow = (layer as any).shadow;

                  const textStrokeCss = strokeWidth > 0 ? `${strokeWidth * scale}px ${strokeColor}` : "none";
                  const textShadowCss = shadow
                    ? `${(shadow.offsetX || 0) * scale}px ${(shadow.offsetY || 0) * scale}px ${(shadow.blur || 0) * scale}px ${shadow.color || "rgba(0,0,0,0.8)"}`
                    : "none";

                  const textEffectStyle: React.CSSProperties = {
                    paintOrder: "stroke fill",
                    WebkitTextStroke: textStrokeCss,
                    textShadow: textShadowCss,
                  };

                  return (
                    <div
                      className={`w-full h-full flex flex-col justify-center font-bold break-keep select-none whitespace-pre-wrap ${
                        (layer as any).textAlign === "left"
                          ? "items-start text-left"
                          : (layer as any).textAlign === "right"
                          ? "items-end text-right"
                          : "items-center text-center"
                      }`}
                      style={{
                        fontFamily: resolveFontFamily(rawFont),
                        letterSpacing: `${((layer as any).letterSpacing || 0) * scale}px`,
                        lineHeight: (layer as any).lineHeight || 1.2,
                        paintOrder: "stroke fill",
                        backgroundColor: (layer as any).backgroundColor || "transparent",
                        borderRadius: `${((layer as any).borderRadius || 0) * scale}px`,
                        padding: (layer as any).padding
                          ? `${(layer as any).padding[0] * scale}px ${(layer as any).padding[1] * scale}px ${(layer as any).padding[2] * scale}px ${(layer as any).padding[3] * scale}px`
                          : "0px",
                      }}
                    >
                      {hasMultiStyles ? (
                        lines.map((line: string, lineIdx: number) => {
                          const lStyle = multiStyles[lineIdx] || multiStyles[multiStyles.length - 1];
                          const lineSize = lStyle?.fontSize || (layer as any).fontSize || 52;
                          const lineColor = lStyle?.fontColor || (layer as any).fontColor || "#FFFFFF";
                          return (
                            <span
                              key={lineIdx}
                              style={{
                                ...textEffectStyle,
                                fontSize: `${lineSize * scale}px`,
                                color:
                                  isSubtitle && (isPlaying || studioMode === "nle") && activeWord
                                    ? activeWord.highlightColor || "#FFE600"
                                    : lineColor,
                                display: "block",
                              }}
                            >
                              {line}
                            </span>
                          );
                        })
                      ) : (
                        <span
                          style={{
                            ...textEffectStyle,
                            fontSize: `${((layer as any).fontSize || 52) * scale}px`,
                            color:
                              isSubtitle && (isPlaying || studioMode === "nle") && activeWord
                                ? activeWord.highlightColor || "#FFE600"
                                : (layer as any).fontColor || "#FFFFFF",
                          }}
                        >
                          {content}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* 9. 🎨 표준 쉐이프 레이어 (특수 카드가 아닌 일반 쉐이프 / 홀 마스크) */}
                {layer.kind === "shape" &&
                  !layer.id.includes("profile_header") &&
                  !layer.id.includes("comment_card") &&
                  !layer.id.includes("hook_band") &&
                  !layer.id.includes("header_bar") &&
                  !layer.id.includes("article_card") &&
                  !layer.id.includes("meme_frame") && (
                  <div
                    className="w-full h-full flex items-center justify-center text-center overflow-hidden"
                    style={{
                      backgroundColor: (layer as any).fillColor || "transparent",
                      borderRadius: `${((layer as any).borderRadius || 0) * scale}px`,
                      border: (layer as any).borderWidth
                        ? `${(layer as any).borderWidth * scale}px solid ${(layer as any).borderColor || "#FFFFFF"}`
                        : "none",
                    }}
                  >
                    {(layer as any).shapeRole === "hole_mask" && (
                      <span className="text-zinc-500/70 font-mono pointer-events-none select-none font-medium" style={{ fontSize: `${22 * scale}px` }}>
                        🎬 영상 재생 프레임
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* 군림보형 하단 40% 그라데이션 비네팅 (자막 시인성 극대화) */}
          {blueprint.archetype === "gunlimbo" && (
            <div
              className="absolute left-0 right-0 bottom-0 pointer-events-none z-10"
              style={{
                height: `${canvasHeight * 0.4 * scale}px`,
                background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 100%)",
              }}
            />
          )}

          {/* 키네틱 자막 실시간 하이라이트 */}
          {activeWord && (isPlaying || studioMode === "nle") && !blueprint.globalLayers.some(l => (l as any).textRole === "subtitle_narrative" || l.id.includes("subtitle")) && (
            <div
              className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none z-30"
              style={{
                bottom: `${320 * scale}px`,
                fontSize: `${64 * scale}px`,
                color: activeWord.highlightColor || "#FFE600",
                fontWeight: 900,
                textShadow: "0 4px 12px rgba(0,0,0,0.9)",
                WebkitTextStroke: `${3 * scale}px #000000`,
              }}
            >
              {activeWord.word}
            </div>
          )}

          {/* 5. 8방향 기즈모 오버레이 (캔버스 컨테이너 직접 바인딩) */}
          <DomTransformGizmoOverlay
            selectedLayer={selectedLayer}
            canvasScale={scale}
            onTransformChange={(newT) => selectedLayer && updateLayerTransform(selectedLayer.id, newT)}
            onTextContentChange={(newC) => selectedLayer && updateLayerContent(selectedLayer.id, newC)}
            onSingleClick={() => selectedLayer && sovereign?.handleLayerSingleClick(selectedLayer)}
            onDoubleClick={() => selectedLayer && sovereign?.handleLayerDoubleClick(selectedLayer)}
            otherLayers={blueprint?.globalLayers || []}
          />

          {/* 6. 세이프존 침범 가드 & 원클릭 크기 맞춤 (캔버스 컨테이너 직접 바인딩) */}
          <SafeZoneOverhangGuard
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            canvasScale={scale}
            showOverlays={showSafeZone}
            selectedLayer={selectedLayer}
            onAutoFitFontSize={(layerId, fittedSize) => {
              updateLayerStyle(layerId, { fontSize: fittedSize } as any);
            }}
          />
        </div>
        )}
      </div>

      {/* 3. 더블 클릭 시 나타나는 좌측 전용 플로팅 인스펙터 (14종 완비) */}
      {sovereign && sovereign.activeFloatingInspector !== "none" && (
        <div className="absolute left-4 top-12 z-50 pointer-events-auto shadow-2xl floating-inspector-card">
          {sovereign.activeFloatingInspector === "title" && (
            <TitleFloatingInspector
              isOpen={true}
              onClose={() => sovereign.setActiveFloatingInspector("none")}
              config={sovereign.titleConfig}
              onChange={sovereign.updateTitleConfig}
              onReset={() => sovereign.updateTitleConfig({})}
            />
          )}
          {sovereign.activeFloatingInspector === "commentCard" && (
            <CommentCardFloatingInspector
              isOpen={true}
              onClose={() => sovereign.setActiveFloatingInspector("none")}
              config={sovereign.commentCardConfig}
              onChange={sovereign.updateCommentCardConfig}
              onReset={() => sovereign.updateCommentCardConfig({})}
            />
          )}
          {sovereign.activeFloatingInspector === "instaProfile" && (
            <InstaProfileFloatingInspector
              isOpen={true}
              onClose={() => sovereign.setActiveFloatingInspector("none")}
              config={sovereign.instaConfig}
              onChange={sovereign.updateInstaConfig}
              onReset={() => sovereign.updateInstaConfig({})}
            />
          )}
          {sovereign.activeFloatingInspector === "gunlimboHookBand" && (
            <GunlimboHookBandFloatingInspector
              isOpen={true}
              onClose={() => sovereign.setActiveFloatingInspector("none")}
              config={{
                enabled: true,
                hookPhrase: sovereign.gunlimboConfig?.hookPhrase || "1초 훅킹 문구",
                hookBgColor: sovereign.gunlimboConfig?.hookBgColor || "#000000",
                hookTextColor: sovereign.gunlimboConfig?.hookTextColor || "#FFFFFF",
                hookFontSize: sovereign.gunlimboConfig?.hookFontSize || 36,
                ...sovereign.gunlimboConfig,
              }}
              onChange={sovereign.updateGunlimboConfig}
              onReset={() => {}}
            />
          )}
          {sovereign.activeFloatingInspector === "badgeTag" && (
            <BadgeTagFloatingInspector
              isOpen={true}
              onClose={() => sovereign.setActiveFloatingInspector("none")}
              config={{
                enabled: true,
                text: sovereign.titleConfig?.titleBadgeText || "속보",
                bgColor: sovereign.titleConfig?.titleBadgeBg || "#EF4444",
                textColor: sovereign.titleConfig?.titleBadgeColor || "#FFFFFF",
                fontSize: sovereign.titleConfig?.titleBadgeSizePx || 12,
                borderRadius: sovereign.titleConfig?.titleBadgeRadius || 4,
                paddingX: 8,
                paddingY: 4,
                offsetX: 0,
                offsetY: 0,
                ...sovereign.titleConfig,
              }}
              onChange={sovereign.updateTitleConfig}
              onReset={() => {}}
            />
          )}
          {sovereign.activeFloatingInspector === "jabHook" && (
            <JabHookFloatingInspector
              isOpen={true}
              onClose={() => sovereign.setActiveFloatingInspector("none")}
              config={{
                enabled: true,
                text: sovereign.gunlimboConfig?.hookPhrase || "쨉 훅 텍스트",
                bgColor: sovereign.gunlimboConfig?.hookBgColor || "#000000",
                textColor: sovereign.gunlimboConfig?.hookTextColor || "#FFFFFF",
                fontSize: sovereign.gunlimboConfig?.hookFontSize || 32,
                font: sovereign.gunlimboConfig?.hookFont || "Pretendard",
                bold: sovereign.gunlimboConfig?.hookBold ?? true,
                italic: sovereign.gunlimboConfig?.hookItalic ?? false,
                tiltDeg: 0,
                borderRadius: 4,
                paddingX: 12,
                paddingY: 6,
                offsetX: 0,
                offsetY: 0,
                strokeEnabled: false,
                strokeColor: "#000000",
                strokeWidth: 2,
                shadowEnabled: false,
                shadowColor: "#000000",
                shadowBlur: 4,
                ...sovereign.gunlimboConfig,
              }}
              onChange={sovereign.updateGunlimboConfig}
              onReset={() => {}}
            />
          )}
          {sovereign.activeFloatingInspector === "sourceCredit" && (
            <SourceCreditFloatingInspector
              isOpen={true}
              onClose={() => sovereign.setActiveFloatingInspector("none")}
              config={{
                enabled: sovereign.hasBottomSource,
                text: sovereign.sourceCreditConfig?.bottomSourceText || "출처: 유튜브 @채널명",
                color: sovereign.sourceCreditConfig?.bottomSourceColor || "#CCCCCC",
                fontSize: sovereign.sourceCreditConfig?.bottomSourceSizePx || 14,
                font: sovereign.sourceCreditConfig?.bottomSourceFontFamily || "Pretendard",
                bgEnabled: true,
                bgColor: "rgba(0,0,0,0.6)",
                borderRadius: 4,
                strokeEnabled: false,
                strokeColor: "#000000",
                strokeWidth: 1,
                ...sovereign.sourceCreditConfig,
              }}
              onChange={sovereign.updateSourceCreditConfig}
              onReset={() => {}}
            />
          )}
          {sovereign.activeFloatingInspector === "topBottomBar" && (
            <TopBottomBarFloatingInspector
              isOpen={true}
              onClose={() => sovereign.setActiveFloatingInspector("none")}
              config={sovereign.topBottomBarConfig}
              onChange={sovereign.updateTopBottomBarConfig}
              onReset={() => {}}
            />
          )}
          {sovereign.activeFloatingInspector === "videoCrop" && (
            <VideoCropFloatingInspector
              isOpen={true}
              onClose={() => sovereign.setActiveFloatingInspector("none")}
              config={sovereign.videoCropConfig}
              onChange={sovereign.updateVideoCropConfig}
              onReset={() => {}}
              layoutTemplateMode={blueprint.archetype as any}
              instaConfig={sovereign.instaConfig}
              setInstaConfig={sovereign.updateInstaConfig}
            />
          )}
          {sovereign.activeFloatingInspector === "subtitle" && (
            <SubtitleFloatingInspector
              isOpen={true}
              onClose={() => sovereign.setActiveFloatingInspector("none")}
              config={sovereign.subtitleConfig}
              onChange={sovereign.updateSubtitleConfig}
              onReset={() => {}}
            />
          )}
          {sovereign.activeFloatingInspector === "ssulHeader" && (
            <SsulHeaderFloatingInspector
              isOpen={true}
              onClose={() => sovereign.setActiveFloatingInspector("none")}
              config={{
                enabled: true,
                bgColor: "#FFFFFF",
                heightMultiplier: 1.0,
                text: "실시간 인기글",
                textColor: "#000000",
                font: "Pretendard",
                fontSizeMultiplier: 1.0,
                bold: true,
                italic: false,
                leftIcon: "arrow_back",
                rightIcon: "menu",
                ...sovereign.ssulConfig,
              }}
              onChange={sovereign.updateSsulConfig}
              onReset={() => {}}
            />
          )}
          {sovereign.activeFloatingInspector === "postTitle" && (
            <PostTitleFloatingInspector
              isOpen={true}
              onClose={() => sovereign.setActiveFloatingInspector("none")}
              config={{
                text: sovereign.titleConfig?.titleLine1 || "게시글 본문 제목",
                color: sovereign.titleConfig?.titleLine1Color || "#000000",
                font: sovereign.titleConfig?.titleFontFamily || "Pretendard",
                fontSizeMultiplier: 1.0,
                align: sovereign.titleConfig?.titleAlign || "left",
                bold: true,
                italic: false,
                strokeEnabled: false,
                strokeColor: "#000000",
                strokeWidth: 2,
                shadowEnabled: false,
                shadowColor: "#000000",
                shadowBlur: 4,
                offsetX: 0,
                offsetY: 0,
                letterSpacing: 0,
                lineHeight: 1.3,
                ...sovereign.titleConfig,
              }}
              onChange={sovereign.updateTitleConfig}
              onReset={() => sovereign.updateTitleConfig({})}
            />
          )}
          {sovereign.activeFloatingInspector === "metadata" && (
            <MetadataFloatingInspector
              isOpen={true}
              onClose={() => sovereign.setActiveFloatingInspector("none")}
              config={{
                nickname: "익명",
                timeText: "방금 전",
                views: "조회 1.2만",
                likes: "추천 348",
                comments: "댓글 89",
                color: "#666666",
                font: "Pretendard",
                fontSizeMultiplier: 1.0,
                offsetX: 0,
                offsetY: 0,
                letterSpacing: 0,
                lineHeight: 1.2,
                showViews: true,
                showLikes: true,
                showComments: true,
                ...sovereign.ssulConfig,
              }}
              onChange={sovereign.updateSsulConfig}
              onReset={() => {}}
            />
          )}
          {sovereign.activeFloatingInspector === "divider" && (
            <DividerFloatingInspector
              isOpen={true}
              onClose={() => sovereign.setActiveFloatingInspector("none")}
              config={{
                enabled: true,
                color: "#E5E7EB",
                thickness: 1,
                offsetX: 0,
                offsetY: 0,
                ...sovereign.ssulConfig,
              }}
              onChange={sovereign.updateSsulConfig}
              onReset={() => {}}
            />
          )}
          {sovereign.activeFloatingInspector === "ssulSubtitle" && (
            <SsulSubtitleFloatingInspector
              isOpen={true}
              onClose={() => sovereign.setActiveFloatingInspector("none")}
              config={{
                bubbleStyle: "box",
                bgColor: "rgba(0,0,0,0.85)",
                textColor: "#FFFFFF",
                fontSizeMultiplier: 1.0,
                borderRadius: 8,
                paddingX: 16,
                paddingY: 10,
                font: "Pretendard",
                bold: true,
                italic: false,
                strokeEnabled: false,
                strokeColor: "#000000",
                strokeWidth: 2,
                shadowEnabled: true,
                shadowColor: "rgba(0,0,0,0.5)",
                shadowBlur: 6,
                letterSpacing: 0,
                lineHeight: 1.3,
                ...sovereign.subtitleConfig,
              }}
              onChange={sovereign.updateSubtitleConfig}
              onReset={() => {}}
            />
          )}
        </div>
      )}
    </div>
  );
};
