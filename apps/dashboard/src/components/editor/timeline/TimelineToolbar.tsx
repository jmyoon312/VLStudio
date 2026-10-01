import React from "react";
import { useBlueprint } from "../core/BlueprintContext";
import { formatTimecode } from "./TimelineRuler";

export interface TimelineToolbarProps {
  totalDurationMs: number;
  className?: string;
  onToggleCollapse?: () => void;
}

/**
 * [TimelineToolbar]
 * 타임라인 상단 도구 모음:
 * 분할(C), 삭제(Del), 자석 스냅 토글, 리플 모드 토글, 타임라인 줌 슬라이더, 접기 버튼
 */
export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
  totalDurationMs,
  className = "",
  onToggleCollapse,
}) => {
  const {
    isPlaying,
    setIsPlaying,
    currentTimeMs,
    isRippleMode,
    setIsRippleMode,
    isMagnetSnap,
    setIsMagnetSnap,
    zoomLevel,
    setZoomLevel,
    splitSceneAtTime,
    deleteSelected,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useBlueprint();

  return (
    <div
      className={`h-10 bg-card border-b border-border px-3 flex items-center justify-between select-none ${className}`}
    >
      {/* 좌측: 주요 편집 도구 (분할, 삭제, 실행취소) */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title={isPlaying ? "일시정지 (Space)" : "재생 (Space)"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <div className="w-px h-4 bg-border mx-1" />

        <button
          onClick={() => splitSceneAtTime(currentTimeMs)}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-muted/60 hover:bg-muted text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
          title="재생 헤드 위치에서 분할 (단축키: C 또는 S)"
        >
          <span>✂</span>
          <span>분할 (C)</span>
        </button>

        <button
          onClick={deleteSelected}
          className="flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-muted text-xs text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
          title="선택 클립 삭제 (단축키: Del)"
        >
          <span>🗑</span>
          <span>삭제</span>
        </button>

        <div className="w-px h-4 bg-border mx-1" />

        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title="실행 취소 (Ctrl + Z)"
        >
          ↩
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title="다시 실행 (Ctrl + Y)"
        >
          ↪
        </button>
      </div>

      {/* 중앙: 타임코드 표시 */}
      <div className="flex items-center space-x-1 font-mono text-xs bg-muted/40 px-2.5 py-1 rounded border border-border shadow-2xs">
        <span className="text-primary font-bold">{formatTimecode(currentTimeMs)}</span>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-muted-foreground">{formatTimecode(totalDurationMs)}</span>
      </div>

      {/* 우측: 모드 토글 및 줌 제어 */}
      <div className="flex items-center space-x-2">
        {/* 리플 모드 토글 */}
        <button
          onClick={() => setIsRippleMode(!isRippleMode)}
          className={`px-2 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
            isRippleMode
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40"
              : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
          }`}
          title="리플 모드: 클립 삭제 시 빈 공간을 자동으로 당겨 채웁니다"
        >
          {isRippleMode ? "리플 모드 ON" : "리플 모드 OFF"}
        </button>

        {/* 자석 스냅 토글 */}
        <button
          onClick={() => setIsMagnetSnap(!isMagnetSnap)}
          className={`px-2 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
            isMagnetSnap
              ? "bg-primary/15 text-primary border-primary/40"
              : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
          }`}
          title="자석 스냅: 클립 경계선에 재생 헤드와 클립이 착 달라붙습니다"
        >
          🧲 스냅
        </button>

        <div className="w-px h-4 bg-border mx-1" />

        {/* 타임라인 줌 슬라이더 */}
        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
          <span>🔍</span>
          <input
            type="range"
            min={20}
            max={200}
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            className="w-20 accent-primary cursor-pointer"
            title={`줌 레벨: ${zoomLevel}px/초`}
          />
        </div>

        {onToggleCollapse && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer flex items-center space-x-1"
              title="타임라인 접기 (캔버스 작업 공간 최대화)"
            >
              <span>▼</span>
              <span>접기</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
