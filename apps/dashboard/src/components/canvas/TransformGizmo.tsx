import React, { useRef, useState } from 'react';
import { NleLayerTransform } from '@/types/nle';
import { RotateCw, FlipHorizontal } from 'lucide-react';

interface TransformGizmoProps {
  transform: NleLayerTransform;
  selected: boolean;
  locked?: boolean;
  name: string;
  canvasScale?: number;
  onSelect: () => void;
  onChange: (newTransform: NleLayerTransform) => void;
  children: React.ReactNode;
}

/**
 * 🌟 TransformGizmo: 슬림 1.5px 정밀 외곽선 & 8-핸들 NLE 조작 기즈모
 * - 4개 외곽선 라인: 캔버스 밖에서도 얇고 선명한 외곽선 테두리를 마우스로 잡고 이동 가능
 * - 4개 모서리 핸들 (tl, tr, bl, br): 대각선 비례 확대/축소 (Scale)
 * - 4개 변 핸들 (tc, bc, lc, rc): 수직/수평 크기 리사이징
 * - 상단 360° 회전 핀 & HUD 명칭 뱃지
 */
export const TransformGizmo: React.FC<TransformGizmoProps> = ({
  transform,
  selected,
  locked = false,
  name,
  canvasScale = 1.0,
  onSelect,
  onChange,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // 1. 위치 이동 핸들러 (바디 또는 외곽선 라인 드래그)
  const handleTranslatePointerDown = (e: React.PointerEvent) => {
    if (locked) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect();
    setActiveAction('translate');

    const targetEl = e.currentTarget as HTMLElement;
    targetEl.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialXPct = transform.xPct;
    const initialYPct = transform.yPct;

    const parent = containerRef.current?.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();

    const onPointerMove = (mv: PointerEvent) => {
      const dxPx = (mv.clientX - startX) / Math.max(0.1, canvasScale);
      const dyPx = (mv.clientY - startY) / Math.max(0.1, canvasScale);

      const nativeWidth = parentRect.width / Math.max(0.1, canvasScale);
      const nativeHeight = parentRect.height / Math.max(0.1, canvasScale);

      const dxPct = (dxPx / nativeWidth) * 100;
      const dyPct = (dyPx / nativeHeight) * 100;

      onChange({
        ...transform,
        xPct: Math.round((initialXPct + dxPct) * 10) / 10,
        yPct: Math.round((initialYPct + dyPct) * 10) / 10,
      });
    };

    const onPointerUp = (upEv: PointerEvent) => {
      setActiveAction(null);
      try {
        targetEl.releasePointerCapture(upEv.pointerId);
      } catch (_) {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // 2. 모서리 4개 핸들 드래그 (비례 Scale 확대/축소)
  const handleCornerScaleDown = (e: React.PointerEvent, corner: 'tl' | 'tr' | 'bl' | 'br') => {
    if (locked) return;
    e.stopPropagation();
    setActiveAction(`scale-${corner}`);
    const targetEl = e.currentTarget as HTMLElement;
    targetEl.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialScale = transform.scale;

    const onPointerMove = (mv: PointerEvent) => {
      const dx = (mv.clientX - startX) / Math.max(0.1, canvasScale);
      const dy = (mv.clientY - startY) / Math.max(0.1, canvasScale);
      const signX = (corner === 'tr' || corner === 'br') ? 1 : -1;
      const signY = (corner === 'bl' || corner === 'br') ? 1 : -1;
      const delta = (dx * signX + dy * signY) / 180;
      const newScale = Math.max(0.1, Math.min(8.0, Math.round((initialScale + delta) * 100) / 100));

      onChange({
        ...transform,
        scale: newScale,
      });
    };

    const onPointerUp = (upEv: PointerEvent) => {
      setActiveAction(null);
      try {
        targetEl.releasePointerCapture(upEv.pointerId);
      } catch (_) {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // 3. 변 중심 4개 핸들 드래그 (상하/좌우 축 리사이징)
  const handleEdgeScaleDown = (e: React.PointerEvent, edge: 'tc' | 'bc' | 'lc' | 'rc') => {
    if (locked) return;
    e.stopPropagation();
    setActiveAction(`scale-${edge}`);
    const targetEl = e.currentTarget as HTMLElement;
    targetEl.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialScale = transform.scale;

    const onPointerMove = (mv: PointerEvent) => {
      const dx = (mv.clientX - startX) / Math.max(0.1, canvasScale);
      const dy = (mv.clientY - startY) / Math.max(0.1, canvasScale);

      let delta = 0;
      if (edge === 'tc') delta = -dy / 150;
      else if (edge === 'bc') delta = dy / 150;
      else if (edge === 'lc') delta = -dx / 150;
      else if (edge === 'rc') delta = dx / 150;

      const newScale = Math.max(0.1, Math.min(8.0, Math.round((initialScale + delta) * 100) / 100));
      onChange({
        ...transform,
        scale: newScale,
      });
    };

    const onPointerUp = (upEv: PointerEvent) => {
      setActiveAction(null);
      try {
        targetEl.releasePointerCapture(upEv.pointerId);
      } catch (_) {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // 4. 상단 회전 핀 드래그 (360도 Rotation)
  const handleRotatePointerDown = (e: React.PointerEvent) => {
    if (locked) return;
    e.stopPropagation();
    setActiveAction('rotate');
    const targetEl = e.currentTarget as HTMLElement;
    targetEl.setPointerCapture(e.pointerId);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const onPointerMove = (mv: PointerEvent) => {
      const radians = Math.atan2(mv.clientY - centerY, mv.clientX - centerX);
      let degrees = Math.round(radians * (180 / Math.PI)) + 90;
      if (degrees > 180) degrees -= 360;
      if (degrees < -180) degrees += 360;

      if (Math.abs(degrees) < 3) degrees = 0;
      else if (Math.abs(degrees - 90) < 3) degrees = 90;
      else if (Math.abs(degrees + 90) < 3) degrees = -90;

      onChange({
        ...transform,
        rotationDeg: degrees,
      });
    };

    const onPointerUp = (upEv: PointerEvent) => {
      setActiveAction(null);
      try {
        targetEl.releasePointerCapture(upEv.pointerId);
      } catch (_) {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handleTranslatePointerDown}
      className={`absolute select-none group w-max max-w-none shrink-0 ${selected ? 'z-50' : ''} ${locked ? 'cursor-not-allowed' : 'cursor-move'}`}
      style={{
        left: `${transform.xPct}%`,
        top: `${transform.yPct}%`,
        transform: `translate(-50%, -50%) scale(${transform.scale}) scaleX(${transform.isFlippedH ? -1 : 1}) rotate(${transform.rotationDeg}deg)`,
        transformOrigin: 'center center',
        opacity: transform.opacity ?? 1,
        zIndex: selected ? 50 : (transform.zIndex ?? 30),
      }}
    >
      {/* 1. 실제 객체 콘텐츠 (자식 요소) */}
      <div className="relative pointer-events-auto">
        {children}
      </div>

      {/* 2. 🌟 슬림 1.5px 정밀 외곽선 선택라인 & 8-핸들 바운딩 박스 */}
      {selected && (
        <div className="absolute -inset-0.5 pointer-events-none z-50">
          {/* 🔲 슬림 1.5px 외곽선 (보이는 영역 밖에서도 테두리 선을 잡아 이동 가능) */}
          <div className="absolute inset-0 border-[1.5px] border-sky-400 dark:border-sky-400 pointer-events-none" />

          {/* 4대 외곽선 클릭 히트 에어리어 (선택 테두리를 마우스로 잡아 드래그 이동) */}
          {!locked && (
            <>
              {/* 상단 외곽선 클릭존 */}
              <div
                onPointerDown={handleTranslatePointerDown}
                className="absolute -top-1.5 left-0 right-0 h-3 cursor-move pointer-events-auto"
                title="외곽선을 드래그하여 위치 이동"
              />
              {/* 하단 외곽선 클릭존 */}
              <div
                onPointerDown={handleTranslatePointerDown}
                className="absolute -bottom-1.5 left-0 right-0 h-3 cursor-move pointer-events-auto"
                title="외곽선을 드래그하여 위치 이동"
              />
              {/* 좌측 외곽선 클릭존 */}
              <div
                onPointerDown={handleTranslatePointerDown}
                className="absolute top-0 bottom-0 -left-1.5 w-3 cursor-move pointer-events-auto"
                title="외곽선을 드래그하여 위치 이동"
              />
              {/* 우측 외곽선 클릭존 */}
              <div
                onPointerDown={handleTranslatePointerDown}
                className="absolute top-0 bottom-0 -right-1.5 w-3 cursor-move pointer-events-auto"
                title="외곽선을 드래그하여 위치 이동"
              />
            </>
          )}

          {/* 상단 레이어 명칭 뱃지 & HUD */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-sky-600 text-white text-[9.5px] font-bold px-2 py-0.5 rounded shadow-md pointer-events-auto flex items-center gap-1 whitespace-nowrap z-50">
            <span>{name}</span>
            <span className="text-[8.5px] text-sky-200 font-mono">
              ({transform.scale}x · {transform.rotationDeg}°)
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ ...transform, isFlippedH: !transform.isFlippedH });
              }}
              className="p-0.5 hover:bg-sky-700 rounded cursor-pointer transition"
              title="좌우반전 (Flip H)"
            >
              <FlipHorizontal className="w-2.5 h-2.5 text-white" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ ...transform, rotationDeg: 0 });
              }}
              className="p-0.5 hover:bg-sky-700 rounded cursor-pointer transition"
              title="회전 각도 초기화 (0°)"
            >
              <RotateCw className="w-2.5 h-2.5 text-white" />
            </button>
          </div>

          {/* 🌟 4대 모서리 핸들 (슬림 10px 화이트 박스) */}
          {!locked && (
            <>
              {/* Top-Left */}
              <div
                onPointerDown={(e) => handleCornerScaleDown(e, 'tl')}
                className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-white border border-sky-600 rounded-2xs cursor-nwse-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-50"
                title="대각선 확대/축소"
              />
              {/* Top-Right */}
              <div
                onPointerDown={(e) => handleCornerScaleDown(e, 'tr')}
                className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-white border border-sky-600 rounded-2xs cursor-nesw-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-50"
                title="대각선 확대/축소"
              />
              {/* Bottom-Left */}
              <div
                onPointerDown={(e) => handleCornerScaleDown(e, 'bl')}
                className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-white border border-sky-600 rounded-2xs cursor-nesw-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-50"
                title="대각선 확대/축소"
              />
              {/* Bottom-Right */}
              <div
                onPointerDown={(e) => handleCornerScaleDown(e, 'br')}
                className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-white border border-sky-600 rounded-2xs cursor-nwse-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-50"
                title="대각선 확대/축소"
              />

              {/* 🌟 4대 변 중심 핸들 (상, 하, 좌, 우) */}
              <div
                onPointerDown={(e) => handleEdgeScaleDown(e, 'tc')}
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-white border border-sky-600 rounded-2xs cursor-ns-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-50"
                title="상하 크기 조절"
              />
              <div
                onPointerDown={(e) => handleEdgeScaleDown(e, 'bc')}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-white border border-sky-600 rounded-2xs cursor-ns-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-50"
                title="상하 크기 조절"
              />
              <div
                onPointerDown={(e) => handleEdgeScaleDown(e, 'lc')}
                className="absolute top-1/2 -translate-y-1/2 -left-1 w-1.5 h-3 bg-white border border-sky-600 rounded-2xs cursor-ew-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-50"
                title="좌우 크기 조절"
              />
              <div
                onPointerDown={(e) => handleEdgeScaleDown(e, 'rc')}
                className="absolute top-1/2 -translate-y-1/2 -right-1 w-1.5 h-3 bg-white border border-sky-600 rounded-2xs cursor-ew-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform z-50"
                title="좌우 크기 조절"
              />

              {/* 🌟 상단 회전 핀 */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto z-50">
                <div
                  onPointerDown={handleRotatePointerDown}
                  className="w-3 h-3 bg-amber-400 hover:bg-amber-300 border border-zinc-900 rounded-full cursor-grab active:cursor-grabbing shadow-sm hover:scale-125 transition-transform flex items-center justify-center"
                  title="회전 각도 조절"
                />
                <div className="w-[1.5px] h-2.5 bg-sky-400" />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
