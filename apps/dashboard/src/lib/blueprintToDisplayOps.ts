import { VLStandardBlueprint, VLLayerObject, VLTextLayer, VLMediaLayer, VLShapeLayer } from '@/types/blueprint';

/**
 * 선언형 디스플레이 오퍼레이션 규격 (DisplayOps)
 * CanvasKit(Skia WASM) 및 Canvas 뷰포트에서 직접 래스터라이징 가능한 순수 JSON 구조
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type DisplayOp =
  | { op: 'rect'; rect: Rect; color: string; radius?: number }
  | { op: 'gradient'; rect: Rect; direction: 'vertical' | 'horizontal'; stops: { at: number; color: string }[]; opacity?: number }
  | { op: 'image'; assetId: string; rect: Rect; fit: 'cover' | 'contain' | 'fill'; focus: [number, number]; motion?: any }
  | { op: 'text'; text: string; runs?: { text: string; font?: string; color?: string }[]; rect: Rect; font: string; fontSize: number; color: string; stroke?: { color: string; width: number }; shadow?: { color: string; blur: number; offsetX: number; offsetY: number }; textAlign: 'left' | 'center' | 'right'; lineHeight: number; letterSpacing: number; emoji?: { char: string; position: 'inline_end' | 'floating_top'; scale: number; animation: string } }
  | { op: 'group'; cacheId?: string; clip?: Rect; opacity?: number; children: DisplayOp[] };

/**
 * VLStandardBlueprint를 특정 재생 시점(currentTimeMs)의 DisplayOps 배열로 컴파일
 */
export function compileBlueprintToDisplayOps(blueprint: VLStandardBlueprint, currentTimeMs: number = 0): DisplayOp[] {
  const ops: DisplayOp[] = [];

  // 1. 캔버스 배경 채우기
  ops.push({
    op: 'rect',
    rect: { x: 0, y: 0, w: blueprint.canvas.width, h: blueprint.canvas.height },
    color: blueprint.canvas.backgroundColor,
  });

  // 2. 레이어를 zIndex 순서대로 정렬하여 렌더링
  const sortedLayers = [...blueprint.layers].sort((a, b) => a.transform.zIndex - b.transform.zIndex);

  for (const layer of sortedLayers) {
    if (layer.hidden) continue;

    // 타임코드 가드: 레이어의 유효 시간(In/Out) 체크
    if (currentTimeMs < layer.inMs) continue;
    if (layer.outMs !== null && currentTimeMs > layer.outMs) continue;

    const t = layer.transform;
    const layerRect: Rect = {
      x: t.origin === 'center' ? t.x - t.width / 2 : t.x,
      y: t.origin === 'center' ? t.y - t.height / 2 : t.y,
      w: t.width,
      h: t.height,
    };

    switch (layer.kind) {
      case 'shape': {
        const shape = layer as VLShapeLayer;
        if (shape.gradient) {
          ops.push({
            op: 'gradient',
            rect: layerRect,
            direction: shape.gradient.direction,
            stops: shape.gradient.stops,
            opacity: layer.opacity,
          });
        } else {
          ops.push({
            op: 'rect',
            rect: layerRect,
            color: shape.fillColor,
            radius: shape.borderRadius,
          });
        }
        break;
      }
      case 'media': {
        const media = layer as VLMediaLayer;
        ops.push({
          op: 'image',
          assetId: media.assetId,
          rect: layerRect,
          fit: media.fit,
          focus: media.focus,
          motion: media.motion,
        });
        break;
      }
      case 'text': {
        const textLayer = layer as VLTextLayer;
        // 동적 감정 이모지 결합 검사
        let emojiConfig: any = undefined;
        if (textLayer.emojiSlot && textLayer.emojiSlot.enabled) {
          const emojiChar = textLayer.emojiSlot.injectedEmoji || textLayer.emojiSlot.fallbackEmoji;
          emojiConfig = {
            char: emojiChar,
            position: textLayer.emojiSlot.position,
            scale: textLayer.emojiSlot.scaleRatio,
            animation: textLayer.emojiSlot.animation,
          };
        }

        // 배경색이 지정된 자막 박스 처리
        if (textLayer.backgroundColor) {
          ops.push({
            op: 'rect',
            rect: layerRect,
            color: textLayer.backgroundColor,
            radius: textLayer.borderRadius,
          });
        }

        ops.push({
          op: 'text',
          text: textLayer.content,
          rect: layerRect,
          font: textLayer.fontFamily,
          fontSize: textLayer.fontSize,
          color: textLayer.fontColor,
          stroke: textLayer.stroke,
          shadow: textLayer.shadow,
          textAlign: textLayer.textAlign,
          lineHeight: textLayer.lineHeight,
          letterSpacing: textLayer.letterSpacing,
          emoji: emojiConfig,
        });
        break;
      }
    }
  }

  return ops;
}
