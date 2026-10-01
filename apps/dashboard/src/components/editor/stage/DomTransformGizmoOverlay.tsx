import React, { useState, useRef, useEffect } from "react";
import { LayerObject, TransformSpec } from "../../../types/blueprintV4";

export interface DomTransformGizmoOverlayProps {
  selectedLayer: LayerObject | null;
  canvasScale: number; // 뷰포트 확대 축소 비율 (화면 픽셀 / 1080)
  onTransformChange: (newTransform: TransformSpec) => void;
  onTextContentChange?: (newContent: string) => void;
  otherLayers?: LayerObject[];
  disabled?: boolean;
}

type HandleDirection = "move" | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rotate";

interface SnapGuide {
  type: "x" | "y";
  pos: number;
  label?: string;
}

/**
 * [DomTransformGizmoOverlay]
 * 캔버스 내부 단일 진실 공급원(SSOT) 기즈모
 * - 이중 박스 완전 제거: 캔버스 컨테이너 내부 1:1 절대 좌표 바인딩
 * - 8방향 리사이즈 핸들, 360도 회전 노브, 자석 스냅 가이드라인,
 * - 더블클릭 인라인 텍스트 편집 및 키보드 넛지 엔진
 */
export const DomTransformGizmoOverlay: React.FC<DomTransformGizmoOverlayProps> = ({
  selectedLayer,
  canvasScale,
  onTransformChange,
  onTextContentChange,
  otherLayers = [],
  disabled = false,
}) => {
  const [activeHandle, setActiveHandle] = useState<HandleDirection | null>(null);
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineText, setInlineText] = useState("");
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

  const gizmoRef = useRef<HTMLDivElement>(null);
  const startDragRef = useRef<{
    clientX: number;
    clientY: number;
    initialTransform: TransformSpec;
  } | null>(null);

  useEffect(() => {
    if (selectedLayer && selectedLayer.kind === "text") {
      setInlineText((selectedLayer as any).content || "");
    }
  }, [selectedLayer]);

  // 키보드 넛지 (방향키 1px, Shift 10px)
  useEffect(() => {
    if (!selectedLayer || disabled || isInlineEditing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const current = { ...selectedLayer.transform };

        if (e.key === "ArrowLeft") current.x -= step;
        if (e.key === "ArrowRight") current.x += step;
        if (e.key === "ArrowUp") current.y -= step;
        if (e.key === "ArrowDown") current.y += step;

        onTransformChange(current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLayer, disabled, isInlineEditing, onTransformChange]);

  if (!selectedLayer || disabled) return null;

  const t = selectedLayer.transform;

  // 1080x1920 캔버스 좌표계 ➔ 캔버스 컨테이너 내 픽셀 좌표
  const posX = (t.x - t.width / 2) * canvasScale;
  const posY = (t.y - t.height / 2) * canvasScale;
  const posW = t.width * canvasScale;
  const posH = t.height * canvasScale;

  // 마그넷 스냅 감지 (중심선 540, 960 및 형제 레이어)
  const computeSnap = (nextX: number, nextY: number, w: number, h: number) => {
    const snapThreshold = 8;
    const guides: SnapGuide[] = [];
    let snappedX = nextX;
    let snappedY = nextY;

    // 캔버스 중앙 X=540
    if (Math.abs(nextX - 540) < snapThreshold) {
      snappedX = 540;
      guides.push({ type: "x", pos: 540, label: "중앙 X: 540" });
    }
    // 캔버스 중앙 Y=960
    if (Math.abs(nextY - 960) < snapThreshold) {
      snappedY = 960;
      guides.push({ type: "y", pos: 960, label: "중앙 Y: 960" });
    }

    // 형제 레이어 중심 스냅
    for (const other of otherLayers) {
      if (other.id === selectedLayer.id) continue;
      const ot = other.transform;
      if (Math.abs(nextX - ot.x) < snapThreshold) {
        snappedX = ot.x;
        guides.push({ type: "x", pos: ot.x, label: `${other.name} 정렬` });
      }
      if (Math.abs(nextY - ot.y) < snapThreshold) {
        snappedY = ot.y;
        guides.push({ type: "y", pos: ot.y, label: `${other.name} 정렬` });
      }
    }

    return { x: snappedX, y: snappedY, guides };
  };

  const startDrag = (e: React.MouseEvent, handle: HandleDirection) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveHandle(handle);
    startDragRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialTransform: { ...t },
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!startDragRef.current) return;
      const { clientX: startX, clientY: startY, initialTransform } = startDragRef.current;
      const dx = (moveEvent.clientX - startX) / canvasScale;
      const dy = (moveEvent.clientY - startY) / canvasScale;

      const nextTransform = { ...initialTransform };

      if (handle === "rotate") {
        if (gizmoRef.current) {
          const rect = gizmoRef.current.getBoundingClientRect();
          const centerScreenX = rect.left + rect.width / 2;
          const centerScreenY = rect.top + rect.height / 2;
          const rad = Math.atan2(moveEvent.clientY - centerScreenY, moveEvent.clientX - centerScreenX);
          let deg = Math.round((rad * 180) / Math.PI) - 90;
          if (moveEvent.shiftKey) {
            deg = Math.round(deg / 15) * 15; // Shift 시 15도 단위 스냅
          }
          nextTransform.rotation = deg;
          setSnapGuides([]);
        }
      } else if (handle === "move") {
        // 본체 이동 (드래그)
        const rawX = initialTransform.x + dx;
        const rawY = initialTransform.y + dy;
        const { x: sx, y: sy, guides } = computeSnap(rawX, rawY, initialTransform.width, initialTransform.height);
        nextTransform.x = Math.round(sx);
        nextTransform.y = Math.round(sy);
        setSnapGuides(guides);
      } else {
        // 8방향 리사이즈
        const initW = initialTransform.width;
        const initH = initialTransform.height;
        let newLeft = initialTransform.x - initW / 2;
        let newRight = initialTransform.x + initW / 2;
        let newTop = initialTransform.y - initH / 2;
        let newBottom = initialTransform.y + initH / 2;

        if (handle.includes("e")) {
          newRight = Math.max(newLeft + 20, newRight + dx);
        }
        if (handle.includes("w")) {
          newLeft = Math.min(newRight - 20, newLeft + dx);
        }
        if (handle.includes("s")) {
          newBottom = Math.max(newTop + 20, newBottom + dy);
        }
        if (handle.includes("n")) {
          newTop = Math.min(newBottom - 20, newTop + dy);
        }

        let finalW = newRight - newLeft;
        let finalH = newBottom - newTop;

        if (moveEvent.shiftKey && ["nw", "ne", "sw", "se"].includes(handle)) {
          const aspect = initW / initH;
          finalH = finalW / aspect;
          if (handle.includes("n")) {
            newTop = newBottom - finalH;
          } else {
            newBottom = newTop + finalH;
          }
        }

        nextTransform.width = Math.round(finalW);
        nextTransform.height = Math.round(finalH);
        nextTransform.x = Math.round((newLeft + newRight) / 2);
        nextTransform.y = Math.round((newTop + newBottom) / 2);
        setSnapGuides([]);
      }

      onTransformChange(nextTransform);
    };

    const handleMouseUp = () => {
      setActiveHandle(null);
      startDragRef.current = null;
      setSnapGuides([]);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleDoubleClick = () => {
    if (selectedLayer.kind === "text") {
      setIsInlineEditing(true);
    }
  };

  const handleInlineBlur = () => {
    setIsInlineEditing(false);
    if (onTextContentChange) {
      onTextContentChange(inlineText);
    }
  };

  return (
    <>
      {/* 1. 스마트 자석 스냅 가이드라인 (Canvas Container Space) */}
      {snapGuides.map((guide, idx) => {
        if (guide.type === "x") {
          const gx = guide.pos * canvasScale;
          return (
            <div
              key={idx}
              className="absolute top-0 bottom-0 pointer-events-none z-50 border-l border-dashed border-cyan-400"
              style={{ left: `${gx}px` }}
            >
              {guide.label && (
                <span className="absolute top-2 left-1 bg-cyan-900/90 text-cyan-200 text-[10px] px-1 py-0.5 rounded shadow">
                  {guide.label}
                </span>
              )}
            </div>
          );
        } else {
          const gy = guide.pos * canvasScale;
          return (
            <div
              key={idx}
              className="absolute left-0 right-0 pointer-events-none z-50 border-t border-dashed border-cyan-400"
              style={{ top: `${gy}px` }}
            >
              {guide.label && (
                <span className="absolute left-2 top-1 bg-cyan-900/90 text-cyan-200 text-[10px] px-1 py-0.5 rounded shadow">
                  {guide.label}
                </span>
              )}
            </div>
          );
        }
      })}

      {/* 2. 주 기즈모 컨테이너 */}
      <div
        ref={gizmoRef}
        className="absolute pointer-events-auto select-none"
        style={{
          left: `${posX}px`,
          top: `${posY}px`,
          width: `${posW}px`,
          height: `${posH}px`,
          transform: `rotate(${t.rotation || 0}deg) scale(${t.scale || 1})`,
          transformOrigin: "center center",
          zIndex: 40,
        }}
        onDoubleClick={handleDoubleClick}
      >
        {/* 단일 외곽 바운딩 테두리 (본체 이동 핸들) */}
        <div
          className="absolute inset-0 border-2 border-cyan-400 shadow-xs cursor-move"
          onMouseDown={(e) => startDrag(e, "move")}
        />

        {/* 상단 돌출 회전 노브 */}
        <div
          className="absolute left-1/2 -top-6 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing group z-50"
          onMouseDown={(e) => startDrag(e, "rotate")}
          title="회전 (Shift: 15도 스냅)"
        >
          <div className="w-0.5 h-3 bg-cyan-400" />
          <div className="w-3.5 h-3.5 bg-card border-2 border-cyan-400 rounded-full group-hover:scale-125 transition-transform shadow-md" />
        </div>

        {/* 8방향 리사이즈 핸들 */}
        {/* 모서리: NW, NE, SE, SW */}
        <div
          className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-cyan-500 rounded-xs cursor-nwse-resize shadow z-50"
          onMouseDown={(e) => startDrag(e, "nw")}
        />
        <div
          className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-cyan-500 rounded-xs cursor-nesw-resize shadow z-50"
          onMouseDown={(e) => startDrag(e, "ne")}
        />
        <div
          className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-cyan-500 rounded-xs cursor-nwse-resize shadow z-50"
          onMouseDown={(e) => startDrag(e, "se")}
        />
        <div
          className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-cyan-500 rounded-xs cursor-nesw-resize shadow z-50"
          onMouseDown={(e) => startDrag(e, "sw")}
        />

        {/* 모서리 중앙: N, E, S, W */}
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-3.5 h-2 bg-white border border-cyan-500 rounded-xs cursor-ns-resize shadow z-50"
          onMouseDown={(e) => startDrag(e, "n")}
        />
        <div
          className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-3.5 bg-white border border-cyan-500 rounded-xs cursor-ew-resize shadow z-50"
          onMouseDown={(e) => startDrag(e, "e")}
        />
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-2 bg-white border border-cyan-500 rounded-xs cursor-ns-resize shadow z-50"
          onMouseDown={(e) => startDrag(e, "s")}
        />
        <div
          className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-3.5 bg-white border border-cyan-500 rounded-xs cursor-ew-resize shadow z-50"
          onMouseDown={(e) => startDrag(e, "w")}
        />

        {/* 3. 더블클릭 인라인 텍스트 편집 오버레이 */}
        {isInlineEditing && selectedLayer.kind === "text" && (
          <textarea
            value={inlineText}
            onChange={(e) => setInlineText(e.target.value)}
            onBlur={handleInlineBlur}
            autoFocus
            className="absolute inset-0 w-full h-full bg-black/80 text-white p-1 text-center font-bold outline-none resize-none border border-cyan-400 rounded z-50 whitespace-pre-wrap"
            style={{
              fontSize: `${((selectedLayer as any).fontSize || 52) * canvasScale}px`,
              lineHeight: (selectedLayer as any).lineHeight || 1.2,
            }}
          />
        )}
      </div>
    </>
  );
};
