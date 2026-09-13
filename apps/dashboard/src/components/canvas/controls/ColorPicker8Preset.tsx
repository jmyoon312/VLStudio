import React, { useRef } from 'react';
import { cn } from '@/lib/utils';

export interface ColorPicker8PresetProps {
  label?: string;
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

// 픽셀링 표준 8대 핵심 컬러 프리셋
export const PRESET_8_COLORS = [
  { hex: '#FFFFFF', name: '화이트', border: true },
  { hex: '#111827', name: '블랙' },
  { hex: '#EF4444', name: '레드' },
  { hex: '#F5D05F', name: '옐로우' },
  { hex: '#10B981', name: '그린' },
  { hex: '#3B82F6', name: '블루' },
  { hex: '#8B5CF6', name: '퍼플' },
  { hex: '#F97316', name: '오렌지' },
];

export const ColorPicker8Preset: React.FC<ColorPicker8PresetProps> = ({
  label,
  value = '#000000',
  onChange,
  className,
}) => {
  const nativeColorInputRef = useRef<HTMLInputElement>(null);

  // HEX 정규화 (대문자 또는 소문자)
  const normalizedValue = value ? (value.startsWith('#') ? value : `#${value}`) : '#FFFFFF';

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex items-center justify-between text-[11px] font-medium text-foreground">
          <span>{label}</span>
          <span className="font-mono text-[10px] text-muted-foreground uppercase">{normalizedValue}</span>
        </div>
      )}

      {/* 상단: 선택 색상 칩 + HEX 인풋 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => nativeColorInputRef.current?.click()}
          className="w-8 h-8 rounded-md border border-border shadow-xs shrink-0 cursor-pointer relative overflow-hidden transition hover:scale-105 active:scale-95"
          style={{ backgroundColor: normalizedValue }}
          title="클릭하여 커스텀 색상 선택"
        >
          <input
            ref={nativeColorInputRef}
            type="color"
            value={normalizedValue.slice(0, 7)}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </button>

        <div className="flex-1 relative">
          <input
            type="text"
            value={normalizedValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="w-full h-8 px-2.5 text-xs font-mono bg-background border border-border rounded-md text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary uppercase shadow-2xs"
          />
        </div>
      </div>

      {/* 하단: 8대 원터치 프리셋 컬러 써클 */}
      <div className="flex items-center justify-between pt-0.5 px-0.5">
        {PRESET_8_COLORS.map((c) => {
          const isSelected = normalizedValue.toLowerCase() === c.hex.toLowerCase();
          return (
            <button
              key={c.hex}
              type="button"
              onClick={() => onChange(c.hex)}
              className={cn(
                "w-5 h-5 rounded-full transition-all cursor-pointer shadow-2xs relative flex items-center justify-center",
                c.border ? "border border-border/80" : "border border-black/10 dark:border-white/10",
                isSelected
                  ? "ring-2 ring-primary ring-offset-1 scale-110 shadow-xs"
                  : "hover:scale-115 opacity-90 hover:opacity-100"
              )}
              style={{ backgroundColor: c.hex }}
              title={c.name}
            >
              {isSelected && (
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  c.hex === '#FFFFFF' || c.hex === '#F5D05F' ? "bg-black" : "bg-white"
                )} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ColorPicker8Preset;
