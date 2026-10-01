import React from "react";
import { LayerObject, TextLayer } from "../../../types/blueprintV4";

export interface SafeZoneOverhangGuardProps {
  canvasWidth: number; // 1080
  canvasHeight: number; // 1920
  canvasScale: number;
  canvasOffset?: { x: number; y: number };
  showOverlays?: boolean;
  selectedLayer?: LayerObject | null;
  onAutoFitFontSize?: (layerId: string, fittedSize: number) => void;
}

/**
 * [SafeZoneOverhangGuard]
 * 9:16 유튜브 쇼츠 / 틱톡 UI 침범 방지 세이프존 가드
 * - 상단 채널 타이틀 영역 (Y < 180)
 * - 하단 설명 및 음원 바 영역 (Y > 1680)
 * - 우측 좋아요/댓글/공유 버튼 영역 (X > 940)
 * - 텍스트 레이어가 경계를 벗어날 시 실시간 주황색 경고등 및 [글자 크기 자동 맞춤] 1클릭 지원
 */
export const SafeZoneOverhangGuard: React.FC<SafeZoneOverhangGuardProps> = ({
  canvasWidth = 1080,
  canvasHeight = 1920,
  canvasScale,
  canvasOffset,
  showOverlays = true,
  selectedLayer,
  onAutoFitFontSize,
}) => {
  if (!showOverlays) return null;

  // 세이프존 물리 좌표
  const topGuardH = 180;
  const bottomGuardH = 240;
  const rightGuardW = 140;

  // 침범 여부 검사
  let isOverhanging = false;
  let recommendedSize: number | null = null;

  if (selectedLayer && selectedLayer.kind === "text") {
    const textLayer = selectedLayer as TextLayer;
    const t = textLayer.transform;
    const left = t.x - t.width / 2;
    const right = t.x + t.width / 2;
    const top = t.y - t.height / 2;
    const bottom = t.y + t.height / 2;

    const maxSafeRight = canvasWidth - rightGuardW;
    const maxSafeBottom = canvasHeight - bottomGuardH;
    const minSafeTop = topGuardH;

    if (right > maxSafeRight || bottom > maxSafeBottom || top < minSafeTop || left < 40) {
      isOverhanging = true;

      // 추천 폰트 크기 계산 (비율 축소)
      const overflowX = Math.max(0, right - maxSafeRight) + Math.max(0, 40 - left);
      if (overflowX > 0 && t.width > 0) {
        const availableW = maxSafeRight - 40;
        const scaleFactor = availableW / (t.width + overflowX);
        recommendedSize = Math.max(24, Math.floor((textLayer.fontSize || 52) * scaleFactor));
      }
    }
  }

  // 화면 픽셀 좌표 (canvasOffset이 주어지면 외부 스테이지 기준, 없으면 캔버스 내부 inset-0)
  const isDirectMounted = !canvasOffset;
  const screenLeft = canvasOffset?.x ?? 0;
  const screenTop = canvasOffset?.y ?? 0;
  const screenW = canvasWidth * canvasScale;
  const screenH = canvasHeight * canvasScale;

  return (
    <div
      className={`absolute pointer-events-none z-30 overflow-hidden ${
        isDirectMounted ? "inset-0" : ""
      }`}
      style={
        isDirectMounted
          ? undefined
          : {
              left: `${screenLeft}px`,
              top: `${screenTop}px`,
              width: `${screenW}px`,
              height: `${screenH}px`,
            }
      }
    >
      {/* 1. 상단 가드 (Y < 180) */}
      <div
        className="absolute top-0 left-0 right-0 border-b border-dashed border-red-500/40 bg-red-500/5 flex items-start justify-center pt-2"
        style={{ height: `${topGuardH * canvasScale}px` }}
      >
        <span className="text-[10px] text-red-400 font-mono tracking-wider opacity-60">
          [상단 UI 안전영역 - 180px]
        </span>
      </div>

      {/* 2. 하단 가드 (Y > 1680) */}
      <div
        className="absolute bottom-0 left-0 right-0 border-t border-dashed border-red-500/40 bg-red-500/5 flex items-end justify-center pb-2"
        style={{ height: `${bottomGuardH * canvasScale}px` }}
      >
        <span className="text-[10px] text-red-400 font-mono tracking-wider opacity-60">
          [하단 설명 & 태그 안전영역 - 240px]
        </span>
      </div>

      {/* 3. 우측 인터랙션 버튼 가드 (X > 940) */}
      <div
        className="absolute top-0 bottom-0 right-0 border-l border-dashed border-red-500/40 bg-red-500/5 flex flex-col items-center justify-center space-y-4 pr-1"
        style={{ width: `${rightGuardW * canvasScale}px` }}
      >
        <div className="w-6 h-6 rounded-full border border-red-400/30 flex items-center justify-center text-[9px] text-red-300">
          ♥
        </div>
        <div className="w-6 h-6 rounded-full border border-red-400/30 flex items-center justify-center text-[9px] text-red-300">
          💬
        </div>
        <div className="w-6 h-6 rounded-full border border-red-400/30 flex items-center justify-center text-[9px] text-red-300">
          ↗
        </div>
        <span className="text-[9px] text-red-400/70 font-mono -rotate-90 mt-4 whitespace-nowrap">
          우측 버튼 세이프존
        </span>
      </div>

      {/* 4. 실시간 침범 경고 및 원클릭 자동 맞춤 뱃지 */}
      {isOverhanging && selectedLayer && (
        <div className="absolute top-3 left-3 pointer-events-auto bg-amber-950/95 border border-amber-500/90 text-amber-200 px-3 py-1.5 rounded-lg shadow-xl flex items-center space-x-2 backdrop-blur-md animate-pulse">
          <span className="text-xs font-semibold">⚠️ 쇼츠 UI 안전영역 침범!</span>
          {recommendedSize && onAutoFitFontSize && (
            <button
              onClick={() => onAutoFitFontSize(selectedLayer.id, recommendedSize!)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] px-2 py-0.5 rounded shadow transition-colors cursor-pointer"
            >
              글자 크기 자동 맞춤 ({recommendedSize}px)
            </button>
          )}
        </div>
      )}
    </div>
  );
};
