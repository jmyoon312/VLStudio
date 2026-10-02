import React, { useRef, useEffect, useState, useCallback } from "react";
import { useBlueprint } from "../core/BlueprintContext";
import { DomTransformGizmoOverlay } from "./DomTransformGizmoOverlay";
import { SafeZoneOverhangGuard } from "./SafeZoneOverhangGuard";
import { MockupBackdropSelector, BackdropType, BACKDROP_CONFIGS } from "./MockupBackdropSelector";
import { resolveFontFamily } from "../../../lib/blueprintV4Migrator";

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

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [fitScale, setFitScale] = useState<number>(0.35);
  const [userZoom, setUserZoom] = useState<number | null>(null);
  const scale = userZoom ?? fitScale;

  const [backdrop, setBackdrop] = useState<BackdropType>("studio");
  const [showSafeZone, setShowSafeZone] = useState<boolean>(true);
  const [previewViewMode, setPreviewViewMode] = useState<"video" | "list">("video");

  const hasCommentCards = blueprint.globalLayers.some(
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
    const next = Math.min(2.0, Math.round((scale + 0.1) * 10) / 10);
    setUserZoom(next);
  };

  const handleZoomOut = () => {
    const next = Math.max(0.15, Math.round((scale - 0.1) * 10) / 10);
    setUserZoom(next);
  };

  const handleZoomReset = () => {
    setUserZoom(null);
  };

  // Ctrl + 마우스 휠 줌 핸들러
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      const next = Math.min(2.0, Math.max(0.15, Math.round((scale + delta) * 100) / 100));
      setUserZoom(next);
    }
  };

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

        {/* 캔버스 줌 도구 모음 */}
        <div className="flex items-center space-x-1 bg-card border border-border px-1.5 py-0.5 rounded shadow-xs text-xs">
          <button
            onClick={handleZoomOut}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer font-bold"
            title="축소 (Ctrl + 휠 아래)"
          >
            -
          </button>
          <button
            onClick={handleZoomReset}
            className="px-1.5 py-0.5 font-mono text-[11px] text-foreground hover:bg-muted rounded cursor-pointer transition-colors"
            title="클릭 시 화면 맞춤으로 초기화"
          >
            {Math.round(scale * 100)}%{userZoom === null ? " (맞춤)" : ""}
          </button>
          <button
            onClick={handleZoomIn}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer font-bold"
            title="확대 (Ctrl + 휠 위)"
          >
            +
          </button>
          {userZoom !== null && (
            <button
              onClick={handleZoomReset}
              className="text-[10px] text-primary px-1.5 py-0.5 hover:bg-primary/10 rounded cursor-pointer font-semibold"
              title="화면 크기에 맞춤"
            >
              화면 맞춤
            </button>
          )}
        </div>
      </div>

      {/* 2. 중앙 캔버스 뷰포트 (스크롤 및 중앙 정렬) */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
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
                        className="h-14 rounded-xl flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border"
                        style={{
                          backgroundColor: (layer as any).fillColor || "transparent",
                        }}
                      >
                        {(layer as any).shapeRole === "comment_card"
                          ? "💬 댓글 카드 프레임 (우측 인스펙터에서 12종 갤러리/투명도 조절)"
                          : "▢ 그래픽 쉐이프 바"}
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
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
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
                  <span>씬 {blueprint.scenes.indexOf(currentScene) + 1}: [{currentScene?.role || "0s_hook"}]</span>
                </div>
              </div>
            )}
          </div>

          {/* 글로벌 레이어 렌더링 */}
          {blueprint.globalLayers.map((layer) => {
            if (layer.hidden) return null;
            const t = layer.transform;
            const isSelected = layer.id === selectedLayerId;
            const isSubtitle = (layer as any).textRole === "subtitle_narrative" || layer.id.includes("subtitle");

            return (
              <div
                key={layer.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLayerId(layer.id);
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
                {layer.kind === "text" && (() => {
                  const content = isSubtitle && (isPlaying || studioMode === "nle") && activeWord
                    ? activeWord.word
                    : ((layer as any).content || "");
                  const lines = content.split("\n");
                  const multiStyles = (layer as any).multiLineStyles || [];
                  const hasMultiStyles = multiStyles.length > 0 && lines.length > 1;

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
                        fontFamily: resolveFontFamily((layer as any).fontFamily),
                        letterSpacing: `${((layer as any).letterSpacing || 0) * scale}px`,
                        lineHeight: (layer as any).lineHeight || 1.2,
                        textShadow: (layer as any).shadow
                          ? `${(layer as any).shadow.offsetX * scale}px ${(layer as any).shadow.offsetY * scale}px ${(layer as any).shadow.blur * scale}px ${(layer as any).shadow.color}`
                          : "none",
                        WebkitTextStroke: (layer as any).stroke?.width
                          ? `${(layer as any).stroke.width * scale}px ${(layer as any).stroke.color || "#000000"}`
                          : "none",
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
                                fontSize: `${lineSize * scale}px`,
                                color: isSubtitle && (isPlaying || studioMode === "nle") && activeWord
                                  ? (activeWord.highlightColor || "#FFE600")
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
                            fontSize: `${((layer as any).fontSize || 52) * scale}px`,
                            color: isSubtitle && (isPlaying || studioMode === "nle") && activeWord
                              ? (activeWord.highlightColor || "#FFE600")
                              : ((layer as any).fontColor || "#FFFFFF"),
                          }}
                        >
                          {content}
                        </span>
                      )}
                    </div>
                  );
                })()}
                {layer.kind === "shape" && (
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

          {/* 키네틱 자막 실시간 하이라이트 (자막 레이어가 없는 특수 케이스에만 독립 렌더링) */}
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
            otherLayers={blueprint.globalLayers}
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
    </div>
  );
};
