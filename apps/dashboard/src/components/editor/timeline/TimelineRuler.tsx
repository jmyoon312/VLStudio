import React, { useRef } from "react";

export interface TimelineRulerProps {
  totalDurationMs: number;
  currentTimeMs: number;
  zoomLevel: number; // px per second
  onSeek: (ms: number) => void;
  className?: string;
}

export const formatTimecode = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const frames = Math.floor((ms % 1000) / 33.33); // 30fps 기준

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const ff = String(frames).padStart(2, "0");
  return `${mm}:${ss}:${ff}`;
};

/**
 * [TimelineRuler]
 * 밀리초 정밀 눈금자 및 드래그 재생 헤드
 */
export const TimelineRuler: React.FC<TimelineRulerProps> = ({
  totalDurationMs,
  currentTimeMs,
  zoomLevel,
  onSeek,
  className = "",
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);

  const totalWidthPx = (totalDurationMs / 1000) * zoomLevel;
  const playheadLeftPx = (currentTimeMs / 1000) * zoomLevel;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();

    const seekByX = (clientX: number) => {
      const offsetX = clientX - rect.left;
      const targetSec = offsetX / zoomLevel;
      const targetMs = Math.max(0, Math.min(totalDurationMs, targetSec * 1000));
      onSeek(Math.round(targetMs));
    };

    seekByX(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      seekByX(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // 1초 단위 눈금 생성
  const secondCount = Math.ceil(totalDurationMs / 1000);
  const marks = [];
  for (let s = 0; s <= secondCount; s++) {
    const isMajor = s % 5 === 0;
    marks.push(
      <div
        key={s}
        className="absolute top-0 flex flex-col items-center pointer-events-none select-none"
        style={{ left: `${s * zoomLevel}px` }}
      >
        <div
          className={`w-px ${isMajor ? "h-3.5 bg-foreground/60" : "h-2 bg-border"}`}
        />
        {isMajor && (
          <span className="text-[9px] font-mono text-muted-foreground mt-0.5">
            {formatTimecode(s * 1000).substring(3)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={rulerRef}
      onMouseDown={handleMouseDown}
      className={`relative h-7 bg-muted/30 border-b border-border select-none cursor-pointer overflow-hidden ${className}`}
      style={{ width: `${Math.max(800, totalWidthPx)}px` }}
    >
      {/* 초 단위 눈금 */}
      {marks}

      {/* 플레이헤드 인디케이터 (상단 다이아몬드) */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none z-30 flex flex-col items-center"
        style={{ left: `${playheadLeftPx}px`, transform: "translateX(-50%)" }}
      >
        <div className="w-3 h-3 bg-cyan-400 rotate-45 -translate-y-1.5 shadow-md" />
        <div className="w-0.5 h-full bg-cyan-400" />
      </div>
    </div>
  );
};
