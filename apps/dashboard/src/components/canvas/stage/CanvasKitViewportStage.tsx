import React, { useRef, useEffect, useState, useCallback } from 'react';
import CanvasKitInit, { CanvasKit, Surface } from 'canvaskit-wasm';
import { VLStandardBlueprint, VLLayerObject } from '@/types/blueprint';
import { compileBlueprintToDisplayOps, DisplayOp } from '@/lib/blueprintToDisplayOps';
import { cn } from '@/lib/utils';
import { Sparkles, Cpu, Layers, Move, Shield } from 'lucide-react';

export interface CanvasKitViewportStageProps {
  blueprint: VLStandardBlueprint;
  currentTimeMs?: number;
  scale?: number;
  selectedLayerId?: string | null;
  onSelectLayer?: (id: string | null) => void;
  onUpdateLayerTransform?: (layerId: string, patch: { x?: number; y?: number; width?: number; height?: number }) => void;
  showSafeZone?: boolean;
  showGrid?: boolean;
}

export const CanvasKitViewportStage: React.FC<CanvasKitViewportStageProps> = ({
  blueprint,
  currentTimeMs = 0,
  scale = 1.0,
  selectedLayerId = null,
  onSelectLayer,
  onUpdateLayerTransform,
  showSafeZone = false,
  showGrid = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ck, setCk] = useState<CanvasKit | null>(null);
  const [surface, setSurface] = useState<Surface | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [fps, setFps] = useState(60);
  const [renderMs, setRenderMs] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  // 드래그 기즈모 상태
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initLayerX: number; initLayerY: number } | null>(null);

  // 1. CanvasKit WebAssembly 초기화
  useEffect(() => {
    let active = true;
    CanvasKitInit({
      locateFile: () => '/canvaskit.wasm',
    })
      .then((CanvasKitInstance) => {
        if (!active) return;
        setCk(CanvasKitInstance);
      })
      .catch((err) => {
        console.error('CanvasKit WASM 초기화 실패:', err);
      });

    return () => {
      active = false;
    };
  }, []);

  // 2. Skia Surface 생성 (WebGL 우선, 실패 시 소프트웨어 래스터라이저 폴백)
  useEffect(() => {
    if (!ck || !canvasRef.current) return;

    let skSurface: Surface | null = null;
    try {
      skSurface = ck.MakeWebGLCanvasSurface(canvasRef.current);
    } catch (_) {
      skSurface = null;
    }

    if (!skSurface) {
      try {
        skSurface = ck.MakeSWCanvasSurface(canvasRef.current);
      } catch (err) {
        console.error('MakeSWCanvasSurface 실패:', err);
      }
    }

    if (skSurface) {
      setSurface(skSurface);
      setIsReady(true);
    }

    return () => {
      if (skSurface) {
        skSurface.delete();
      }
    };
  }, [ck]);

  // 3. Skia Canvas 프레임 렌더링 루프
  const renderFrame = useCallback(() => {
    if (!ck || !surface || !canvasRef.current) return;

    const t0 = performance.now();
    const canvas = surface.getCanvas();
    const width = blueprint.canvas.width || 1080;
    const height = blueprint.canvas.height || 1920;

    // A. 캔버스 배경 클리어
    const bgPaint = new ck.Paint();
    bgPaint.setColor(ck.parseColorString(blueprint.canvas.backgroundColor || '#000000'));
    canvas.drawRect(ck.XYWHRect(0, 0, width, height), bgPaint);
    bgPaint.delete();

    // B. 격자선(Grid) 렌더링 (옵션)
    if (showGrid) {
      const gridPaint = new ck.Paint();
      gridPaint.setColor(ck.parseColorString('rgba(255, 255, 255, 0.08)'));
      gridPaint.setStrokeWidth(1);
      gridPaint.setStyle(ck.PaintStyle.Stroke);
      for (let x = 120; x < width; x += 120) {
        canvas.drawLine(x, 0, x, height, gridPaint);
      }
      for (let y = 120; y < height; y += 120) {
        canvas.drawLine(0, y, width, y, gridPaint);
      }
      gridPaint.delete();
    }

    // C. 선언형 DisplayOps 컴파일 및 순차 실행
    const ops: DisplayOp[] = compileBlueprintToDisplayOps(blueprint, currentTimeMs);

    for (const op of ops) {
      if (op.op === 'rect') {
        const paint = new ck.Paint();
        paint.setColor(ck.parseColorString(op.color));
        paint.setAntiAlias(true);
        if (op.radius && op.radius > 0) {
          const rrect = ck.RRectXY(ck.XYWHRect(op.rect.x, op.rect.y, op.rect.w, op.rect.h), op.radius, op.radius);
          canvas.drawRRect(rrect, paint);
        } else {
          canvas.drawRect(ck.XYWHRect(op.rect.x, op.rect.y, op.rect.w, op.rect.h), paint);
        }
        paint.delete();
      } else if (op.op === 'gradient') {
        const paint = new ck.Paint();
        paint.setAntiAlias(true);
        const stops = op.stops.map((s) => s.at);
        const colors = op.stops.map((s) => ck.parseColorString(s.color));
        const pts = op.direction === 'vertical'
          ? [0, op.rect.y, 0, op.rect.y + op.rect.h]
          : [op.rect.x, 0, op.rect.x + op.rect.w, 0];
        
        const shader = ck.Shader.MakeLinearGradient(
          [pts[0], pts[1]],
          [pts[2], pts[3]],
          colors,
          stops,
          ck.TileMode.Clamp
        );
        if (shader) {
          paint.setShader(shader);
          canvas.drawRect(ck.XYWHRect(op.rect.x, op.rect.y, op.rect.w, op.rect.h), paint);
          shader.delete();
        }
        paint.delete();
      } else if (op.op === 'image') {
        // [미디어 레이어 렌더링]: 배경 영상, B-roll, 페페 밈 래스터라이징
        const rect = op.rect;
        const mediaPaint = new ck.Paint();
        mediaPaint.setAntiAlias(true);

        // 비디오 미디어 플레이스홀더 그라디언트 렌더링
        const mediaShader = ck.Shader.MakeLinearGradient(
          [rect.x, rect.y],
          [rect.x + rect.w, rect.y + rect.h],
          [ck.parseColorString('#1e1b4b'), ck.parseColorString('#0f172a'), ck.parseColorString('#18181b')],
          [0, 0.5, 1],
          ck.TileMode.Clamp
        );
        if (mediaShader) {
          mediaPaint.setShader(mediaShader);
          canvas.drawRect(ck.XYWHRect(rect.x, rect.y, rect.w, rect.h), mediaPaint);
          mediaShader.delete();
        }

        // 미디어 영역 테두리
        const borderPaint = new ck.Paint();
        borderPaint.setStyle(ck.PaintStyle.Stroke);
        borderPaint.setStrokeWidth(2);
        borderPaint.setColor(ck.parseColorString('rgba(99, 102, 241, 0.4)'));
        canvas.drawRect(ck.XYWHRect(rect.x, rect.y, rect.w, rect.h), borderPaint);
        borderPaint.delete();

        // 미디어 라벨 텍스트
        const font = new ck.Font(null, 32);
        const textPaint = new ck.Paint();
        textPaint.setColor(ck.parseColorString('rgba(255, 255, 255, 0.7)'));
        const label = `🎬 [미디어: ${op.assetId}] (${op.fit})`;
        canvas.drawText(label, rect.x + 24, rect.y + 54, textPaint, font);
        textPaint.delete();
        font.delete();
        mediaPaint.delete();
      } else if (op.op === 'text') {
        // [텍스트 레이어]: 한글 자막, 타이틀 및 동적 감정 이모지 슬롯 결합 렌더링
        const font = new ck.Font(null, op.fontSize);
        const paint = new ck.Paint();
        paint.setAntiAlias(true);
        paint.setColor(ck.parseColorString(op.color));

        // 줄바꿈 처리 및 렌더링
        const lines = (op.text || '').split('\n');
        const lineSpacing = op.fontSize * (op.lineHeight || 1.3);

        lines.forEach((lineText, idx) => {
          let renderText = lineText;
          // 마지막 줄에 감정 이모지 결합
          if (idx === lines.length - 1 && op.emoji && op.emoji.char) {
            if (op.emoji.position === 'inline_end') {
              renderText = `${lineText} ${op.emoji.char}`;
            }
          }

          const lineY = op.rect.y + op.fontSize + (idx * lineSpacing);

          // 외곽선 스트로크
          if (op.stroke && op.stroke.width > 0) {
            const strokePaint = new ck.Paint();
            strokePaint.setStyle(ck.PaintStyle.Stroke);
            strokePaint.setStrokeWidth(op.stroke.width * 2);
            strokePaint.setAntiAlias(true);
            strokePaint.setColor(ck.parseColorString(op.stroke.color));
            canvas.drawText(renderText, op.rect.x, lineY, strokePaint, font);
            strokePaint.delete();
          }

          // 본문 텍스트 채우기
          canvas.drawText(renderText, op.rect.x, lineY, paint, font);
        });

        // floating_top 감정 이모지 렌더링
        if (op.emoji && op.emoji.char && op.emoji.position === 'floating_top') {
          const emojiFont = new ck.Font(null, op.fontSize * (op.emoji.scale || 1.2));
          const emojiPaint = new ck.Paint();
          emojiPaint.setColor(ck.parseColorString('#FFFFFF'));
          canvas.drawText(op.emoji.char, op.rect.x, op.rect.y - 16, emojiPaint, emojiFont);
          emojiPaint.delete();
          emojiFont.delete();
        }

        paint.delete();
        font.delete();
      }
    }

    // D. 플랫폼 세이프존 가이드 오버레이
    if (showSafeZone) {
      const rightSafePaint = new ck.Paint();
      rightSafePaint.setColor(ck.parseColorString('rgba(239, 68, 68, 0.15)')); // 우측 120px 가드
      canvas.drawRect(ck.XYWHRect(width - 120, 0, 120, height), rightSafePaint);
      rightSafePaint.delete();

      const bottomSafePaint = new ck.Paint();
      bottomSafePaint.setColor(ck.parseColorString('rgba(239, 68, 68, 0.15)')); // 하단 240px 가드
      canvas.drawRect(ck.XYWHRect(0, height - 240, width, 240), bottomSafePaint);
      bottomSafePaint.delete();

      // 세이프존 텍스트 라벨
      const guardFont = new ck.Font(null, 24);
      const guardTextPaint = new ck.Paint();
      guardTextPaint.setColor(ck.parseColorString('rgba(239, 68, 68, 0.8)'));
      canvas.drawText('쇼츠 아이콘 세이프존 (120px)', width - 110, 80, guardTextPaint, guardFont);
      canvas.drawText('쇼츠 제목 / 사운드 세이프존 (240px)', 40, height - 40, guardTextPaint, guardFont);
      guardTextPaint.delete();
      guardFont.delete();
    }

    // E. 선택된 레이어 기즈모 박스 (Skia 캔버스 내 강조 표시)
    if (selectedLayerId) {
      const targetLayer = blueprint.layers.find((l) => l.id === selectedLayerId);
      if (targetLayer) {
        const t = targetLayer.transform;
        const lx = t.origin === 'center' ? t.x - t.width / 2 : t.x;
        const ly = t.origin === 'center' ? t.y - t.height / 2 : t.y;

        const gizmoPaint = new ck.Paint();
        gizmoPaint.setStyle(ck.PaintStyle.Stroke);
        gizmoPaint.setStrokeWidth(4);
        gizmoPaint.setColor(ck.parseColorString('#10B981')); // 에메랄드 강조
        gizmoPaint.setAntiAlias(true);
        canvas.drawRect(ck.XYWHRect(lx, ly, t.width, t.height), gizmoPaint);
        gizmoPaint.delete();

        // 4개 모서리 핸들 점
        const handlePaint = new ck.Paint();
        handlePaint.setColor(ck.parseColorString('#10B981'));
        const handleSize = 16;
        const corners = [
          [lx, ly],
          [lx + t.width, ly],
          [lx, ly + t.height],
          [lx + t.width, ly + t.height],
        ];
        corners.forEach(([cx, cy]) => {
          canvas.drawRect(
            ck.XYWHRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize),
            handlePaint
          );
        });
        handlePaint.delete();
      }
    }

    // F. 서피스 플러시 (화면 즉시 반영)
    surface.flush();

    const t1 = performance.now();
    setRenderMs(Math.round((t1 - t0) * 10) / 10);

    // FPS 계산
    frameCountRef.current += 1;
    if (t1 - lastTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastTimeRef.current = t1;
    }
  }, [ck, surface, blueprint, currentTimeMs, showSafeZone, showGrid, selectedLayerId]);

  useEffect(() => {
    renderFrame();
  }, [renderFrame]);

  // 마우스 포인터 인터랙션 (레이어 선택 및 드래그 이동)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 1080;
    const clickY = ((e.clientY - rect.top) / rect.height) * 1920;

    // 히트 테스팅: 클릭된 좌표에 위치한 레이어 역순 탐색 (상위 zIndex 우선)
    const sortedLayers = [...blueprint.layers].sort((a, b) => b.transform.zIndex - a.transform.zIndex);
    let hitLayer: VLLayerObject | null = null;

    for (const layer of sortedLayers) {
      if (layer.hidden) continue;
      const t = layer.transform;
      const lx = t.origin === 'center' ? t.x - t.width / 2 : t.x;
      const ly = t.origin === 'center' ? t.y - t.height / 2 : t.y;

      if (clickX >= lx && clickX <= lx + t.width && clickY >= ly && clickY <= ly + t.height) {
        hitLayer = layer;
        break;
      }
    }

    if (hitLayer) {
      onSelectLayer?.(hitLayer.id);
      setIsDragging(true);
      dragStartRef.current = {
        startX: clickX,
        startY: clickY,
        initLayerX: hitLayer.transform.x,
        initLayerY: hitLayer.transform.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else {
      onSelectLayer?.(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStartRef.current || !selectedLayerId || !onUpdateLayerTransform || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 1080;
    const currentY = ((e.clientY - rect.top) / rect.height) * 1920;

    const dx = currentX - dragStartRef.current.startX;
    const dy = currentY - dragStartRef.current.startY;

    const newX = Math.round(dragStartRef.current.initLayerX + dx);
    const newY = Math.round(dragStartRef.current.initLayerY + dy);

    onUpdateLayerTransform(selectedLayerId, { x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-2 select-none">
      {/* 🚀 CanvasKit 상태 배지 */}
      <div className="absolute top-4 left-4 z-40 flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-500/40 shadow-lg text-[11px] font-mono text-emerald-400">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span className="font-bold">Google Skia CanvasKit WASM</span>
        <span className="text-zinc-500">|</span>
        <span>{isReady ? 'GPU 가속 활성' : 'WASM 로딩 중...'}</span>
        <span className="text-zinc-500">|</span>
        <span className="text-amber-400 font-bold">{renderMs}ms</span>
        <span className="text-zinc-500">|</span>
        <span className="text-primary font-bold">{fps} FPS</span>
      </div>

      {/* 9:16 Skia 캔버스 서피스 */}
      <div
        className="relative shadow-2xl rounded-2xl overflow-hidden border border-zinc-800 bg-black flex items-center justify-center"
        style={{
          width: 1080 * scale,
          height: 1920 * scale,
        }}
      >
        <canvas
          ref={canvasRef}
          width={1080}
          height={1920}
          className={cn("w-full h-full block", isDragging ? "cursor-grabbing" : "cursor-crosshair")}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
    </div>
  );
};

export default CanvasKitViewportStage;
