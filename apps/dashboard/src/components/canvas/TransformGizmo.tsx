import React, { useRef, useState } from 'react';
import { NleLayerTransform } from '@/types/nle';
import { RotateCw, FlipHorizontal, Lock, Unlock, Eye, EyeOff } from 'lucide-react';

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
 * 🌟 TransformGizmo: 픽셀링 규격 8-핸들 바운딩 박스 변형 조작 기즈모
 * - 4개 모서리 핸들: 대각선 비례 확대/축소 (Scale)
 * - 4개 변 핸들: 상하/좌우 폭 리사이징 (Width/Height)
 * - 중앙 바디 드래그: 캔버스 내 X, Y 자유 위치 이동 (Pointer Capture 지원)
 * - 상단 회전 핀: 마우스 드래그 360° 자유 각도 회전 (Rotation)
 * - 상단 퀵 툴바: 좌우반전 토글, 회전 리셋(0°), 잠금 토글
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

  // 1. 바디 드래그 (X, Y 위치 이동 - 캔버스 줌 배율 완벽 역산)
  const handleBodyPointerDown = (e: React.PointerEvent) => {
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

      // 실제 캔버스 네이티브 픽셀 크기 기준 퍼센트 계산
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

  // 2. 모서리 핸들 드래그 (Scale 확대/축소)
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
      const dx = mv.clientX - startX;
      const dy = mv.clientY - startY;
      const sign = (corner === 'br' || corner === 'tr') ? 1 : -1;
      const delta = (dx * sign + dy * sign) / 200;
      const newScale = Math.max(0.2, Math.min(4.0, Math.round((initialScale + delta) * 100) / 100));

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

  // 3. 상단 회전 핀 드래그 (360도 Rotation)
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
      let degrees = Math.round(radians * (180 / Math.PI)) + 90; // 상단 핀 기준 보정
      if (degrees > 180) degrees -= 360;
      if (degrees < -180) degrees += 360;

      // 0°, 90°, -90°, 180° 근접 시 5도 자석 스냅
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
      onPointerDown={handleBodyPointerDown}
      className={`absolute select-none group w-max max-w-none shrink-0 ${selected ? 'z-50' : 'z-20'} ${locked ? 'cursor-not-allowed' : 'cursor-move'}`}
      style={{
        left: `${transform.xPct}%`,
        top: `${transform.yPct}%`,
        transform: `translate(-50%, -50%) scale(${transform.scale}) scaleX(${transform.isFlippedH ? -1 : 1}) rotate(${transform.rotationDeg}deg)`,
        transformOrigin: 'center center',
        opacity: transform.opacity ?? 1,
      }}
    >
      {/* 1. 실제 객체 콘텐츠 (자식 요소) */}
      <div className="relative pointer-events-auto">
        {children}
      </div>

      {/* 2. 픽셀링 스타일 선택 바운딩 박스 & 8대 핸들 (선택 시 활성화) */}
      {selected && (
        <div className="absolute -inset-1 border-2 border-indigo-500 rounded-sm pointer-events-none shadow-[0_0_12px_rgba(99,102,241,0.5)]">
          {/* 상단 레이어 명칭 뱃지 */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-md pointer-events-auto flex items-center gap-1.5 whitespace-nowrap">
            <span>{name}</span>
            <span className="text-[9px] text-indigo-200 font-mono">
              ({transform.scale}x | {transform.rotationDeg}°)
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ ...transform, isFlippedH: !transform.isFlippedH });
              }}
              className="p-0.5 hover:bg-indigo-700 rounded cursor-pointer"
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
              className="p-0.5 hover:bg-indigo-700 rounded cursor-pointer"
              title="회전 각도 초기화 (0°)"
            >
              <RotateCw className="w-2.5 h-2.5 text-white" />
            </button>
          </div>

          {/* 🌟 4대 모서리 리사이즈 핸들 */}
          {!locked && (
            <>
              {/* Top-Left */}
              <div
                onPointerDown={(e) => handleCornerScaleDown(e, 'tl')}
                className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-xs cursor-nwse-resize pointer-events-auto shadow hover:scale-125 transition-transform"
                title="확대/축소"
              />
              {/* Top-Right */}
              <div
                onPointerDown={(e) => handleCornerScaleDown(e, 'tr')}
                className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-xs cursor-nesw-resize pointer-events-auto shadow hover:scale-125 transition-transform"
                title="확대/축소"
              />
              {/* Bottom-Left */}
              <div
                onPointerDown={(e) => handleCornerScaleDown(e, 'bl')}
                className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-xs cursor-nesw-resize pointer-events-auto shadow hover:scale-125 transition-transform"
                title="확대/축소"
              />
              {/* Bottom-Right */}
              <div
                onPointerDown={(e) => handleCornerScaleDown(e, 'br')}
                className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-xs cursor-nwse-resize pointer-events-auto shadow hover:scale-125 transition-transform"
                title="확대/축소"
              />

              {/* 🌟 상단 360° 회전 핀 (Rotation Stem & Knob) */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
                <div
                  onPointerDown={handleRotatePointerDown}
                  className="w-3.5 h-3.5 bg-amber-400 hover:bg-amber-300 border-2 border-black rounded-full cursor-grab active:cursor-grabbing shadow-md hover:scale-125 transition-transform flex items-center justify-center"
                  title="마우스로 돌려 각도 조절 (-180° ~ +180°)"
                />
                <div className="w-0.5 h-2.5 bg-indigo-500" />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
