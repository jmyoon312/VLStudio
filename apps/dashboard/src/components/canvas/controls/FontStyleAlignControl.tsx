import React from 'react';
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';
import { FONT_FAMILIES } from '../constants/canvasConstants';
import { UnitSliderControl } from './UnitSliderControl';
import { cn } from '@/lib/utils';

export interface FontOption {
  id: string;
  name: string;
  category?: string;
}

export interface FontStyleAlignControlProps {
  label?: string;
  font?: string;
  setFont?: (font: string) => void;
  fontOptions?: FontOption[];
  bold?: boolean;
  setBold?: (bold: boolean) => void;
  italic?: boolean;
  setItalic?: (italic: boolean) => void;
  align?: 'left' | 'center' | 'right';
  setAlign?: (align: 'left' | 'center' | 'right') => void;
  // 📐 자간 및 줄간격 확장
  letterSpacing?: number;
  setLetterSpacing?: (val: number) => void;
  letterSpacingMin?: number;
  letterSpacingMax?: number;
  letterSpacingStep?: number;
  lineHeight?: number;
  setLineHeight?: (val: number) => void;
  lineHeightMin?: number;
  lineHeightMax?: number;
  lineHeightStep?: number;
  className?: string;
  compact?: boolean;
}

const DEFAULT_FONT_OPTIONS: FontOption[] = FONT_FAMILIES;

export const FontStyleAlignControl: React.FC<FontStyleAlignControlProps> = ({
  label = '글꼴 (Font)',
  font,
  setFont,
  fontOptions = DEFAULT_FONT_OPTIONS,
  bold,
  setBold,
  italic,
  setItalic,
  align,
  setAlign,
  letterSpacing,
  setLetterSpacing,
  letterSpacingMin,
  letterSpacingMax,
  letterSpacingStep,
  lineHeight,
  setLineHeight,
  lineHeightMin,
  lineHeightMax,
  lineHeightStep,
  className,
  compact = false,
}) => {
  const hasStyleOrAlign =
    (setBold && bold !== undefined) ||
    (setItalic && italic !== undefined) ||
    (setAlign && align !== undefined);

  return (
    <div className={cn("space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]", className)}>
      {/* 1. 상단: 글꼴 (Font) 라벨 & 셀렉트 */}
      {setFont && (
        <div className="space-y-1">
          {label && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-foreground truncate">{label}</span>
            </div>
          )}
          <select
            value={font || 'Pretendard'}
            onChange={(e) => setFont(e.target.value)}
            className="w-full h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-medium cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            {(() => {
              const hasCategories = fontOptions.some((f) => f.category);
              if (!hasCategories) {
                return fontOptions.map((f) => (
                  <option key={f.id} value={f.id} className="bg-popover text-popover-foreground">
                    {f.name}
                  </option>
                ));
              }
              const groups: { category: string; options: FontOption[] }[] = [];
              fontOptions.forEach((f) => {
                const cat = f.category || '기타';
                let g = groups.find((x) => x.category === cat);
                if (!g) {
                  g = { category: cat, options: [] };
                  groups.push(g);
                }
                g.options.push(f);
              });
              return groups.map((g) => (
                <optgroup key={g.category} label={g.category} className="bg-popover text-popover-foreground font-bold">
                  {g.options.map((f) => (
                    <option key={f.id} value={f.id} className="bg-popover text-popover-foreground font-normal">
                      {f.name}
                    </option>
                  ))}
                </optgroup>
              ));
            })()}
          </select>
        </div>
      )}

      {/* 2. 하단: 스타일 및 정렬 (Bold, Italic, Left/Center/Right) */}
      {hasStyleOrAlign && (
        <div className={cn("flex items-center justify-between", setFont && "pt-1.5 border-t border-border/50")}>
          <span className="text-[10.5px] text-muted-foreground font-medium">스타일 및 정렬</span>
          <div className="flex items-center gap-1">
            {setBold && (
              <button
                type="button"
                onClick={() => setBold(!bold)}
                className={cn(
                  "w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition cursor-pointer",
                  bold
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-card text-muted-foreground hover:text-foreground border border-border"
                )}
                title="굵게 (Bold)"
              >
                <Bold className="w-3 h-3" />
              </button>
            )}

            {setItalic && (
              <button
                type="button"
                onClick={() => setItalic(!italic)}
                className={cn(
                  "w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition cursor-pointer",
                  italic
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-card text-muted-foreground hover:text-foreground border border-border"
                )}
                title="기울임 (Italic)"
              >
                <Italic className="w-3 h-3" />
              </button>
            )}

            {setAlign && (
              <>
                {(setBold || setItalic) && <div className="w-[1px] h-4 bg-border mx-0.5" />}
                {(['left', 'center', 'right'] as const).map((itemAlign) => (
                  <button
                    key={itemAlign}
                    type="button"
                    onClick={() => setAlign(itemAlign)}
                    className={cn(
                      "w-6 h-6 rounded flex items-center justify-center text-xs transition cursor-pointer",
                      align === itemAlign
                        ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                        : "bg-card text-muted-foreground hover:text-foreground border border-border"
                    )}
                    title={itemAlign === 'left' ? '좌측 정렬' : itemAlign === 'center' ? '가운데 정렬' : '우측 정렬'}
                  >
                    {itemAlign === 'left' && <AlignLeft className="w-3 h-3" />}
                    {itemAlign === 'center' && <AlignCenter className="w-3 h-3" />}
                    {itemAlign === 'right' && <AlignRight className="w-3 h-3" />}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* 3. 하단: 자간 & 줄간격 슬라이더 (setLetterSpacing or setLineHeight가 제공될 때) */}
      {(setLetterSpacing || setLineHeight) && (
        <div className={cn("pt-2 grid gap-2", setFont || hasStyleOrAlign ? "border-t border-border/50" : "", (setLetterSpacing && setLineHeight) ? "grid-cols-2" : "grid-cols-1")}>
          {setLetterSpacing && (
            <UnitSliderControl
              label="자간"
              value={letterSpacing ?? 0}
              min={letterSpacingMin ?? -5}
              max={letterSpacingMax ?? 10}
              step={letterSpacingStep ?? 0.5}
              unit="px"
              onChange={setLetterSpacing}
            />
          )}
          {setLineHeight && (
            <UnitSliderControl
              label="줄간격"
              value={lineHeight ?? 1.2}
              min={lineHeightMin ?? 0.8}
              max={lineHeightMax ?? 2.5}
              step={lineHeightStep ?? 0.05}
              unit="x"
              onChange={setLineHeight}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default FontStyleAlignControl;
