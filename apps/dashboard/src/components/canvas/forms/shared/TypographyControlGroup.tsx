import React from 'react';
import { ColorPicker8Preset } from '@/components/canvas/controls/ColorPicker8Preset';
import { UnitSliderControl } from '@/components/canvas/controls/UnitSliderControl';
import { Switch } from '@/components/ui/switch';
import { FONT_FAMILIES } from '@/components/canvas/constants/canvasConstants';
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TypographyControlGroupProps {
  font?: string;
  setFont?: (font: string) => void;
  color?: string;
  setColor?: (color: string) => void;
  fontSize?: number;
  setFontSize?: (size: number) => void;
  fontSizeMultiplier?: number;
  setFontSizeMultiplier?: (mult: number) => void;
  bold?: boolean;
  setBold?: (bold: boolean) => void;
  italic?: boolean;
  setItalic?: (italic: boolean) => void;
  align?: 'left' | 'center' | 'right';
  setAlign?: (align: 'left' | 'center' | 'right') => void;
  strokeEnabled?: boolean;
  setStrokeEnabled?: (enabled: boolean) => void;
  strokeWidth?: number;
  setStrokeWidth?: (width: number) => void;
  strokeColor?: string;
  setStrokeColor?: (color: string) => void;
  shadowEnabled?: boolean;
  setShadowEnabled?: (enabled: boolean) => void;
  shadowBlur?: number;
  setShadowBlur?: (blur: number) => void;
  shadowColor?: string;
  setShadowColor?: (color: string) => void;
  letterSpacing?: number;
  setLetterSpacing?: (val: number) => void;
  lineHeight?: number;
  setLineHeight?: (val: number) => void;
  className?: string;
}

export const TypographyControlGroup: React.FC<TypographyControlGroupProps> = ({
  font,
  setFont,
  color,
  setColor,
  fontSize,
  setFontSize,
  fontSizeMultiplier,
  setFontSizeMultiplier,
  bold,
  setBold,
  italic,
  setItalic,
  align,
  setAlign,
  strokeEnabled,
  setStrokeEnabled,
  strokeWidth,
  setStrokeWidth,
  strokeColor,
  setStrokeColor,
  shadowEnabled,
  setShadowEnabled,
  shadowBlur,
  setShadowBlur,
  shadowColor,
  setShadowColor,
  letterSpacing,
  setLetterSpacing,
  lineHeight,
  setLineHeight,
  className,
}) => {
  return (
    <div className={cn("space-y-2.5", className)}>
      {/* 1. 글꼴 선택 */}
      {setFont && (
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground">글꼴 (Font)</label>
          <select
            value={font || 'Pretendard'}
            onChange={(e) => setFont(e.target.value)}
            className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer text-foreground"
          >
            {(() => {
              const groups: { category: string; options: typeof FONT_FAMILIES }[] = [];
              FONT_FAMILIES.forEach((f) => {
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

      {/* 2. 글자 색상 */}
      {setColor && color !== undefined && (
        <ColorPicker8Preset
          label="글자 색상"
          value={color}
          onChange={setColor}
        />
      )}

      {/* 3. 글자 크기 (px or Multiplier) */}
      {setFontSize && fontSize !== undefined && (
        <UnitSliderControl
          label="글자 크기"
          value={fontSize}
          min={12}
          max={72}
          step={1}
          unit="px"
          onChange={setFontSize}
        />
      )}
      {setFontSizeMultiplier && fontSizeMultiplier !== undefined && (
        <UnitSliderControl
          label="글자 크기 배율"
          value={fontSizeMultiplier}
          min={0.5}
          max={2.5}
          step={0.05}
          unit="x"
          onChange={setFontSizeMultiplier}
        />
      )}

      {/* 4. 스타일(볼드, 이탤릭) 및 텍스트 정렬 */}
      {((setBold && bold !== undefined) || (setItalic && italic !== undefined) || (setAlign && align !== undefined)) && (
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground">스타일 및 정렬</label>
          <div className="flex items-center gap-1.5 bg-muted/20 p-1 rounded-[4px] border border-border/50">
            {setBold && (
              <button
                type="button"
                onClick={() => setBold(!bold)}
                className={cn(
                  "p-1.5 rounded transition cursor-pointer flex-1 flex items-center justify-center",
                  bold
                    ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                title="굵게 (Bold)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
            )}

            {setItalic && (
              <button
                type="button"
                onClick={() => setItalic(!italic)}
                className={cn(
                  "p-1.5 rounded transition cursor-pointer flex-1 flex items-center justify-center",
                  italic
                    ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                title="기울임 (Italic)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
            )}

            {setAlign && (
              <div className="flex items-center gap-0.5 border-l border-border/60 pl-1.5 flex-2">
                {[
                  { id: 'left' as const, icon: <AlignLeft className="w-3.5 h-3.5" />, label: '좌측' },
                  { id: 'center' as const, icon: <AlignCenter className="w-3.5 h-3.5" />, label: '중앙' },
                  { id: 'right' as const, icon: <AlignRight className="w-3.5 h-3.5" />, label: '우측' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAlign(item.id)}
                    className={cn(
                      "p-1.5 rounded transition cursor-pointer flex-1 flex items-center justify-center",
                      align === item.id
                        ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    title={item.label}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. 자간 및 행간 */}
      {(setLetterSpacing || setLineHeight) && (
        <div className="grid grid-cols-2 gap-2">
          {setLetterSpacing && letterSpacing !== undefined && (
            <UnitSliderControl
              label="자간"
              value={letterSpacing}
              min={-3}
              max={6}
              step={0.5}
              unit="px"
              onChange={setLetterSpacing}
            />
          )}
          {setLineHeight && lineHeight !== undefined && (
            <UnitSliderControl
              label="줄 간격"
              value={lineHeight}
              min={1.0}
              max={2.5}
              step={0.1}
              unit="x"
              onChange={setLineHeight}
            />
          )}
        </div>
      )}

      {/* 6. 글자 테두리 (외곽선) */}
      {setStrokeEnabled && strokeEnabled !== undefined && (
        <div className="space-y-1.5 p-2 bg-muted/20 border border-border/60 rounded-[4px]">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground">글자 테두리 (외곽선)</span>
            <Switch checked={strokeEnabled} onCheckedChange={setStrokeEnabled} />
          </div>
          {strokeEnabled && (
            <div className="space-y-2 pt-1 border-t border-border/40">
              {setStrokeColor && strokeColor !== undefined && (
                <ColorPicker8Preset
                  label="테두리 색상"
                  value={strokeColor}
                  onChange={setStrokeColor}
                />
              )}
              {setStrokeWidth && strokeWidth !== undefined && (
                <UnitSliderControl
                  label="두께"
                  value={strokeWidth}
                  min={1}
                  max={10}
                  step={1}
                  unit="px"
                  onChange={setStrokeWidth}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* 7. 글자 그림자 (Shadow) */}
      {setShadowEnabled && shadowEnabled !== undefined && (
        <div className="space-y-1.5 p-2 bg-muted/20 border border-border/60 rounded-[4px]">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground">글자 그림자 (Shadow)</span>
            <Switch checked={shadowEnabled} onCheckedChange={setShadowEnabled} />
          </div>
          {shadowEnabled && (
            <div className="space-y-2 pt-1 border-t border-border/40">
              {setShadowColor && shadowColor !== undefined && (
                <ColorPicker8Preset
                  label="그림자 색상"
                  value={shadowColor}
                  onChange={setShadowColor}
                />
              )}
              {setShadowBlur && shadowBlur !== undefined && (
                <UnitSliderControl
                  label="흐림 정도"
                  value={shadowBlur}
                  min={0}
                  max={24}
                  step={1}
                  unit="px"
                  onChange={setShadowBlur}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TypographyControlGroup;
