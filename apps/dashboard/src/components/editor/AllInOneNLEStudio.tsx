import React, { useState, useEffect } from "react";
import { EditorStateManager } from "./core/EditorStateManager";
import { HotkeyProvider } from "./core/HotkeyProvider";
import { StudioErrorBoundary } from "./core/StudioErrorBoundary";
import { useBlueprint } from "./core/BlueprintContext";
import { EditorHeaderTransport } from "./header/EditorHeaderTransport";
import { CanvasKitStage } from "./stage/CanvasKitStage";
import { MultiTrackTimeline } from "./timeline/MultiTrackTimeline";
import { TransformInspectorPanel } from "./inspector/TransformInspectorPanel";
import { TextInspectorPanel } from "./inspector/TextInspectorPanel";
import { ShapeInspectorPanel } from "./inspector/ShapeInspectorPanel";
import { CommentCardInspector } from "./inspector/CommentCardInspector";
import { LayerQuickSwitcher } from "./inspector/LayerQuickSwitcher";
import { PixelingMasterInspector } from "./inspector/PixelingMasterInspector";
import { AudioDuckingInspector } from "./inspector/AudioDuckingInspector";
import { formatTimecode } from "./timeline/TimelineRuler";
import { VLStandardBlueprintV4, LayerObject } from "../../types/blueprintV4";

export interface AllInOneNLEStudioProps {
  initialBlueprint?: VLStandardBlueprintV4;
  onSave?: (bp: VLStandardBlueprintV4) => Promise<void>;
  onBack?: () => void;
  defaultStudioMode?: "design" | "nle"; // 1단계 디자인 공방 vs 2단계 전문 편집기
}

/**
 * [EditorInnerLayout]
 * 3단 격리 에러 바운더리 및 반응형 뷰포트/인스펙터/타임라인 분할 레이아웃
 */
const EditorInnerLayout: React.FC<{
  onBack?: () => void;
  defaultStudioMode?: "design" | "nle";
}> = ({ onBack, defaultStudioMode = "nle" }) => {
  const {
    blueprint,
    selectedLayerId,
    updateLayerTransform,
    updateLayerStyle,
    setBlueprint,
    currentTimeMs,
    setCurrentTimeMs,
    isPlaying,
    setIsPlaying,
  } = useBlueprint();

  const [studioMode, setStudioMode] = useState<"design" | "nle">(defaultStudioMode);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState<boolean>(defaultStudioMode === "design");
  const [timelineHeight, setTimelineHeight] = useState<number>(360);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState<boolean>(false);
  const [nleInspectorTab, setNleInspectorTab] = useState<"audio" | "layers">("layers");
  const [isSixSecLoop, setIsSixSecLoop] = useState<boolean>(false);

  // 6초 무한 루프 모드 (0.0초 ~ 6.0초 자동 리셋)
  useEffect(() => {
    if (!isSixSecLoop || !isPlaying) return;
    if (currentTimeMs >= 6000) {
      setCurrentTimeMs(0);
    }
  }, [isSixSecLoop, isPlaying, currentTimeMs, setCurrentTimeMs]);

  // 타임라인 높이 마우스 드래그 조절 (220px ~ 650px)
  const handleTimelineResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingTimeline(true);
    const startY = e.clientY;
    const startHeight = timelineHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.max(220, Math.min(650, startHeight + deltaY));
      setTimelineHeight(newHeight);
    };

    const onMouseUp = () => {
      setIsDraggingTimeline(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const totalDurationMs = blueprint.scenes.reduce(
    (acc, sc) => acc + (sc.actualDurationMs || sc.targetDurationMs),
    0
  );

  const selectedLayer = blueprint.globalLayers.find((l) => l.id === selectedLayerId) || null;

  return (
    <div className="flex flex-col w-full h-full flex-1 min-h-0 bg-background text-foreground overflow-hidden font-sans">
      {/* 1. 상단 마스터 헤더 트랜스포트 바 */}
      <StudioErrorBoundary sectionName="Header">
        <EditorHeaderTransport onBack={onBack} />
      </StudioErrorBoundary>

      {/* 2. 중앙 메인 작업 영역 (뷰포트 스테이지 + 인스펙터 패널) */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* 중앙 뷰포트 스테이지 */}
        <div className="flex-1 h-full relative overflow-hidden bg-muted/30 flex flex-col">
          <StudioErrorBoundary sectionName="Stage">
            <CanvasKitStage className="flex-1" studioMode={studioMode} />
          </StudioErrorBoundary>
        </div>

        {/* 우측 인스펙터 패널 (픽셀링 1:1 완벽 대응 마스터 인스펙터) */}
        <div className="w-84 h-full bg-card border-l border-border p-3 shrink-0 select-none">
          <StudioErrorBoundary sectionName="Inspector">
            {studioMode === "design" ? (
              <PixelingMasterInspector
                studioMode={studioMode}
                onStudioModeChange={(m) => {
                  setStudioMode(m);
                  if (m === "nle") {
                    setIsTimelineCollapsed(false);
                    setTimelineHeight(360);
                  } else {
                    setIsTimelineCollapsed(true);
                  }
                }}
              />
            ) : (
              /* NLE 편집 모드 */
              <div className="flex flex-col h-full space-y-3">
                <div className="flex items-center justify-between p-1 bg-muted/60 rounded-xl border border-border text-xs mb-1 shrink-0">
                  <button
                    onClick={() => {
                      setStudioMode("design");
                      setIsTimelineCollapsed(true);
                    }}
                    className="flex-1 py-1 rounded-lg font-semibold transition-all cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    🎨 디자인 모드
                  </button>
                  <button
                    onClick={() => {
                      setStudioMode("nle");
                      setIsTimelineCollapsed(false);
                      setTimelineHeight(360);
                    }}
                    className="flex-1 py-1 rounded-lg font-semibold transition-all cursor-pointer bg-background text-primary shadow-xs font-bold"
                  >
                    🎛️ NLE 편집 모드
                  </button>
                </div>

                <div className="flex items-center p-0.5 bg-muted/60 rounded-lg border border-border text-xs shrink-0">
                  <button
                    onClick={() => setNleInspectorTab("layers")}
                    className={`flex-1 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      nleInspectorTab === "layers"
                        ? "bg-background text-primary shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    📋 레이어 속성
                  </button>
                  <button
                    onClick={() => setNleInspectorTab("audio")}
                    className={`flex-1 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      nleInspectorTab === "audio"
                        ? "bg-background text-primary shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🎚️ 오디오 & 덕킹
                  </button>
                </div>

                {nleInspectorTab === "layers" ? (
                  <PixelingMasterInspector
                    studioMode={studioMode}
                    onStudioModeChange={setStudioMode}
                  />
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pb-12">
                    <AudioDuckingInspector
                      audioDSP={blueprint.audioDSP}
                      onChange={(patch) =>
                        setBlueprint({
                          ...blueprint,
                          audioDSP: { ...blueprint.audioDSP, ...patch },
                        })
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </StudioErrorBoundary>
        </div>
      </div>

      {/* 타임라인 높이 조절 드래그 핸들 (펼쳐져 있을 때) */}
      {!isTimelineCollapsed && (
        <div
          onMouseDown={handleTimelineResizeStart}
          className={`h-2 w-full cursor-row-resize bg-border/40 hover:bg-primary/50 transition-colors flex items-center justify-center group select-none z-30 ${
            isDraggingTimeline ? "bg-primary" : ""
          }`}
          title="드래그하여 타임라인 높이 조절 (220px ~ 650px)"
        >
          <div className="w-12 h-1 rounded-full bg-muted-foreground/30 group-hover:bg-primary-foreground/80 transition-colors" />
        </div>
      )}

      {/* 3. 하단 멀티트랙 타임라인 (접기/펼치기 지원) */}
      <div
        className={`shrink-0 flex flex-col border-t border-border bg-card ${
          isDraggingTimeline ? "" : "transition-all duration-200"
        }`}
        style={{ height: isTimelineCollapsed ? "40px" : `${timelineHeight}px` }}
      >
        <StudioErrorBoundary sectionName="Timeline">
          {isTimelineCollapsed ? (
            <div className="h-10 px-4 flex items-center justify-between bg-card text-xs select-none">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsTimelineCollapsed(false)}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-semibold border border-primary/30 transition-colors cursor-pointer"
                  title="타임라인 펼치기"
                >
                  <span>▲</span>
                  <span>타임라인 펼치기</span>
                </button>
                <div className="w-px h-4 bg-border" />
                <button
                  type="button"
                  onClick={() => {
                    const next = !isSixSecLoop;
                    setIsSixSecLoop(next);
                    if (next) {
                      if (currentTimeMs >= 6000) setCurrentTimeMs(0);
                      setIsPlaying(true);
                    }
                  }}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                    isSixSecLoop
                      ? "bg-amber-500/20 text-amber-500 border-amber-500/40 shadow-xs"
                      : "bg-muted/60 text-muted-foreground border-border hover:text-foreground"
                  }`}
                  title="0초~6초 무한 루프 미리보기 토글"
                >
                  <span>🔁</span>
                  <span>6초 루프 {isSixSecLoop ? "ON" : "OFF"}</span>
                </button>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <span className="text-[11px] bg-muted px-2 py-0.5 rounded border border-border">
                  {studioMode === "design" ? "🎨 캔버스 최대화 (디자인 템플릿 모드)" : "🎛️ NLE 모드"}
                </span>
              </div>
            </div>
          ) : (
            <MultiTrackTimeline
              className="flex-1"
              onToggleCollapse={() => setIsTimelineCollapsed(true)}
            />
          )}
        </StudioErrorBoundary>
      </div>
    </div>
  );
};

/**
 * [AllInOneNLEStudio]
 * 8,288줄 모놀리스 ShortsEditorStudio.tsx를 완벽히 대체하는 올인원 스튜디오 진입점
 */
export const AllInOneNLEStudio: React.FC<AllInOneNLEStudioProps> = ({
  initialBlueprint,
  onSave,
  onBack,
  defaultStudioMode = "nle",
}) => {
  return (
    <StudioErrorBoundary sectionName="StudioGlobal">
      <EditorStateManager initialBlueprint={initialBlueprint} onSave={onSave}>
        <HotkeyProvider>
          <EditorInnerLayout onBack={onBack} defaultStudioMode={defaultStudioMode} />
        </HotkeyProvider>
      </EditorStateManager>
    </StudioErrorBoundary>
  );
};

export default AllInOneNLEStudio;
