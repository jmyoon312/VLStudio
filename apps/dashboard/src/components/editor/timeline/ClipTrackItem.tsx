import React, { useState, useRef } from "react";

export interface ClipTrackItemProps {
  id: string;
  title: string;
  startMs: number;
  durationMs: number;
  zoomLevel: number;
  isSelected?: boolean;
  color?: string; // 'blue' | 'purple' | 'amber' | 'emerald' | 'cyan'
  onSelect?: () => void;
  onTrimChange?: (newStartMs: number, newDurationMs: number) => void;
  children?: React.ReactNode;
  className?: string;
}

/**
 * [ClipTrackItem]
 * 무파괴 양단 트림 핸들(Non-Destructive Trimming) 및 클립 렌더러
 */
export const ClipTrackItem: React.FC<ClipTrackItemProps> = ({
  id,
  title,
  startMs,
  durationMs,
  zoomLevel,
  isSelected = false,
  color = "cyan",
  onSelect,
  onTrimChange,
  children,
  className = "",
}) => {
  const [isTrimming, setIsTrimming] = useState<"left" | "right" | null>(null);
  const startDragRef = useRef<{ clientX: number; startMs: number; durationMs: number } | null>(null);

  const leftPx = (startMs / 1000) * zoomLevel;
  const widthPx = Math.max(20, (durationMs / 1000) * zoomLevel);

  const colorStyles: Record<string, { bg: string; border: string; text: string }> = {
    cyan: { bg: "bg-cyan-500/15 dark:bg-cyan-950/60", border: "border-cyan-500/70", text: "text-cyan-600 dark:text-cyan-300" },
    purple: { bg: "bg-purple-500/15 dark:bg-purple-950/60", border: "border-purple-500/70", text: "text-purple-600 dark:text-purple-300" },
    amber: { bg: "bg-amber-500/15 dark:bg-amber-950/60", border: "border-amber-500/70", text: "text-amber-600 dark:text-amber-300" },
    emerald: { bg: "bg-emerald-500/15 dark:bg-emerald-950/60", border: "border-emerald-500/70", text: "text-emerald-600 dark:text-emerald-300" },
    blue: { bg: "bg-blue-500/15 dark:bg-blue-950/60", border: "border-blue-500/70", text: "text-blue-600 dark:text-blue-300" },
  };

  const currentStyle = colorStyles[color] || colorStyles.cyan;

  const handleTrimStart = (e: React.MouseEvent, edge: "left" | "right") => {
    e.stopPropagation();
    setIsTrimming(edge);
    startDragRef.current = {
      clientX: e.clientX,
      startMs,
      durationMs,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!startDragRef.current || !onTrimChange) return;
      const dx = moveEvent.clientX - startDragRef.current.clientX;
      const deltaMs = (dx / zoomLevel) * 1000;

      if (edge === "left") {
        const nextStart = Math.max(0, startDragRef.current.startMs + deltaMs);
        const nextDur = Math.max(200, startDragRef.current.durationMs - deltaMs);
        onTrimChange(Math.round(nextStart), Math.round(nextDur));
      } else {
        const nextDur = Math.max(200, startDragRef.current.durationMs + deltaMs);
        onTrimChange(startDragRef.current.startMs, Math.round(nextDur));
      }
    };

    const handleMouseUp = () => {
      setIsTrimming(null);
      startDragRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      className={`absolute top-1 bottom-1 rounded-md border flex flex-col justify-between overflow-hidden cursor-pointer select-none transition-shadow ${
        currentStyle.bg
      } ${currentStyle.border} ${
        isSelected ? "ring-2 ring-primary shadow-md" : "hover:border-primary/60"
      } ${className}`}
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
      }}
    >
      {/* 클립 헤더 및 라벨 */}
      <div className="flex items-center justify-between px-2 py-0.5 text-[11px] font-semibold truncate pointer-events-none">
        <span className={`${currentStyle.text} truncate`}>{title}</span>
        <span className="text-[10px] text-muted-foreground font-mono ml-1">
          {(durationMs / 1000).toFixed(1)}s
        </span>
      </div>

      {/* 내부 파형 / 콘텐츠 영역 */}
      <div className="flex-1 relative overflow-hidden pointer-events-none">{children}</div>

      {/* 좌측 트림 핸들 (inMs) */}
      <div
        onMouseDown={(e) => handleTrimStart(e, "left")}
        className="absolute top-0 bottom-0 left-0 w-2 hover:w-3 bg-primary/30 hover:bg-primary cursor-col-resize transition-all z-20 flex items-center justify-center"
        title="좌측 트림 (시작점 조절)"
      >
        <div className="w-0.5 h-3 bg-white/80 rounded" />
      </div>

      {/* 우측 트림 핸들 (outMs) */}
      <div
        onMouseDown={(e) => handleTrimStart(e, "right")}
        className="absolute top-0 bottom-0 right-0 w-2 hover:w-3 bg-primary/30 hover:bg-primary cursor-col-resize transition-all z-20 flex items-center justify-center"
        title="우측 트림 (종료점 조절)"
      >
        <div className="w-0.5 h-3 bg-white/80 rounded" />
      </div>

      {/* 트림 중 툴팁 */}
      {isTrimming && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-card text-foreground text-[10px] font-mono px-1.5 py-0.5 rounded border border-primary shadow-md z-30 pointer-events-none whitespace-nowrap">
          길이: {(durationMs / 1000).toFixed(2)}s
        </div>
      )}
    </div>
  );
};
