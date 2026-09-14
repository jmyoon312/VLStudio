import React from 'react';
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';
import { FONT_FAMILIES } from '../constants/canvasConstants';
import { cn } from '@/lib/utils';

export interface FontOption {
  id: string;
  name: string;
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
  className?: string;
  compact?: boolean;
}

const DEFAULT_FONT_OPTIONS: FontOption[] = [
  ...FONT_FAMILIES,
  { id: 'NanumGothic', name: '나눔고딕 (Nanum Gothic)' },
  { id: 'NanumMyeongjo', name: '나눔명조 (Nanum Myeongjo)' },
  { id: 'Do Hyeon', name: '도현 (Do Hyeon)' },
  { id: 'Jua', name: '주아 (Jua)' },
];

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
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-foreground">{label}</span>
          <select
            value={font || 'Pretendard'}
            onChange={(e) => setFont(e.target.value)}
            className="h-6 px-1.5 text-[10.5px] bg-background border border-border rounded text-foreground font-medium cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary max-w-[170px]"
          >
            {fontOptions.map((f) => (
              <option key={f.id} value={f.id} className="bg-popover text-popover-foreground">
                {f.name}
              </option>
            ))}
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
    </div>
  );
};

export default FontStyleAlignControl;
