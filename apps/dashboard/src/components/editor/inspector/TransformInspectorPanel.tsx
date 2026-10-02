import React from "react";
import { ScrubInput } from "./ScrubInput";
import { TransformSpec } from "../../../types/blueprintV4";

export interface TransformInspectorPanelProps {
  transform: TransformSpec;
  onChange: (newT: TransformSpec) => void;
  canvasWidth?: number; // 1080
  canvasHeight?: number; // 1920
  className?: string;
}

/**
 * [TransformInspectorPanel]
 * 위치/크기/회전 정밀 제어 스크럽 인풋 및 6방향 원클릭 정렬 패널
 */
export const TransformInspectorPanel: React.FC<TransformInspectorPanelProps> = ({
  transform,
  onChange,
  canvasWidth = 1080,
  canvasHeight = 1920,
  className = "",
}) => {
  const align = (type: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    const t = { ...transform };
    switch (type) {
      case "left":
        t.x = Math.round(t.width / 2);
        break;
      case "center":
        t.x = Math.round(canvasWidth / 2);
        break;
      case "right":
        t.x = Math.round(canvasWidth - t.width / 2);
        break;
      case "top":
        t.y = Math.round(t.height / 2);
        break;
      case "middle":
        t.y = Math.round(canvasHeight / 2);
        break;
      case "bottom":
        t.y = Math.round(canvasHeight - t.height / 2);
        break;
    }
    onChange(t);
  };

  return (
    <div className={`space-y-3 p-3 bg-card rounded-xl border border-border ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
        <span>변형 (Transform)</span>
        <span className="text-[10px] text-muted-foreground font-mono">1080 × 1920</span>
      </div>

      {/* 6방향 정렬 버튼 */}
      <div className="grid grid-cols-6 gap-1 bg-muted/50 p-1 rounded-lg border border-border">
        <button
          onClick={() => align("left")}
          className="p-1 text-xs text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors cursor-pointer"
          title="좌측 정렬"
        >
          ⇤
        </button>
        <button
          onClick={() => align("center")}
          className="p-1 text-xs text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors cursor-pointer"
          title="가로 중앙 정렬"
        >
          ⇥⇤
        </button>
        <button
          onClick={() => align("right")}
          className="p-1 text-xs text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors cursor-pointer"
          title="우측 정렬"
        >
          ⇥
        </button>
        <button
          onClick={() => align("top")}
          className="p-1 text-xs text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors cursor-pointer"
          title="상단 정렬"
        >
          ⤒
        </button>
        <button
          onClick={() => align("middle")}
          className="p-1 text-xs text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors cursor-pointer"
          title="세로 중앙 정렬"
        >
          ↕
        </button>
        <button
          onClick={() => align("bottom")}
          className="p-1 text-xs text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors cursor-pointer"
          title="하단 정렬"
        >
          ⤓
        </button>
      </div>

      {/* X, Y 좌표 스크럽 인풋 (1080x1920 캔버스 정밀 바운드) */}
      <div className="grid grid-cols-2 gap-2">
        <ScrubInput
          label="X"
          value={transform.x}
          onChange={(val) => onChange({ ...transform, x: val })}
          min={-200}
          max={1280}
          step={1}
          unit="px"
          defaultValue={540}
        />
        <ScrubInput
          label="Y"
          value={transform.y}
          onChange={(val) => onChange({ ...transform, y: val })}
          min={-200}
          max={2120}
          step={1}
          unit="px"
          defaultValue={960}
        />
      </div>

      {/* 폭, 높이 스크럽 인풋 */}
      <div className="grid grid-cols-2 gap-2">
        <ScrubInput
          label="폭"
          value={transform.width}
          onChange={(val) => onChange({ ...transform, width: val })}
          min={10}
          max={2500}
          step={1}
          unit="px"
          defaultValue={1080}
        />
        <ScrubInput
          label="높이"
          value={transform.height}
          onChange={(val) => onChange({ ...transform, height: val })}
          min={10}
          max={2500}
          step={1}
          unit="px"
          defaultValue={240}
        />
      </div>

      {/* 회전 각도 스크럽 인풋 */}
      <div className="grid grid-cols-2 gap-2">
        <ScrubInput
          label="회전"
          value={transform.rotation}
          onChange={(val) => onChange({ ...transform, rotation: val })}
          min={-180}
          max={180}
          unit="°"
        />
        <ScrubInput
          label="스케일"
          value={transform.scale}
          onChange={(val) => onChange({ ...transform, scale: val })}
          min={0.1}
          max={5}
          step={0.05}
          sensitivity={0.01}
        />
      </div>
    </div>
  );
};
