import React from 'react';
import { ColorPicker8Preset } from '@/components/canvas/controls/ColorPicker8Preset';
import { UnitSliderControl } from '@/components/canvas/controls/UnitSliderControl';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export interface BarGeometryControlGroupProps {
  label: string;
  enabled: boolean;
  setEnabled?: (val: boolean) => void;
  heightPct?: number;
  setHeightPct?: (val: number) => void;
  heightPx?: number;
  setHeightPx?: (val: number) => void;
  heightMultiplier?: number;
  setHeightMultiplier?: (val: number) => void;
  bgColor: string;
  setBgColor: (val: string) => void;
  opacity?: number;
  setOpacity?: (val: number) => void;
  radius?: number;
  setRadius?: (val: number) => void;
  thickness?: number;
  setThickness?: (val: number) => void;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  setBorderStyle?: (val: 'solid' | 'dashed' | 'dotted') => void;
  widthPercent?: number;
  setWidthPercent?: (val: number) => void;
  className?: string;
}

export const BarGeometryControlGroup: React.FC<BarGeometryControlGroupProps> = ({
  label,
  enabled,
  setEnabled,
  heightPct,
  setHeightPct,
  heightPx,
  setHeightPx,
  heightMultiplier,
  setHeightMultiplier,
  bgColor,
  setBgColor,
  opacity,
  setOpacity,
  radius,
  setRadius,
  thickness,
  setThickness,
  borderStyle,
  setBorderStyle,
  widthPercent,
  setWidthPercent,
  className,
}) => {
  return (
    <div className={cn("space-y-2 p-2.5 bg-muted/20 rounded-[4px] border border-border/60", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-semibold text-foreground">{label}</span>
        {setEnabled && (
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        )}
      </div>

      {enabled && (
        <div className="space-y-2 pt-1 border-t border-border/40">
          <ColorPicker8Preset
            label="배경 색상"
            value={bgColor}
            onChange={setBgColor}
          />

          {setHeightPct && heightPct !== undefined && (
            <UnitSliderControl
              label="높이 비율"
              value={heightPct}
              min={3}
              max={40}
              step={1}
              unit="%"
              onChange={setHeightPct}
            />
          )}

          {setHeightPx && heightPx !== undefined && (
            <UnitSliderControl
              label="높이 (픽셀)"
              value={heightPx}
              min={24}
              max={160}
              step={2}
              unit="px"
              onChange={setHeightPx}
            />
          )}

          {setHeightMultiplier && heightMultiplier !== undefined && (
            <UnitSliderControl
              label="높이 배율"
              value={heightMultiplier}
              min={0.6}
              max={2.0}
              step={0.05}
              unit="x"
              onChange={setHeightMultiplier}
            />
          )}

          {setWidthPercent && widthPercent !== undefined && (
            <UnitSliderControl
              label="너비 (가로폭)"
              value={widthPercent}
              min={20}
              max={100}
              step={1}
              unit="%"
              onChange={setWidthPercent}
            />
          )}

          {setThickness && thickness !== undefined && (
            <UnitSliderControl
              label="두께"
              value={thickness}
              min={1}
              max={12}
              step={1}
              unit="px"
              onChange={setThickness}
            />
          )}

          {setBorderStyle && borderStyle !== undefined && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">선 스타일</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'solid' as const, label: '실선' },
                  { id: 'dashed' as const, label: '파선' },
                  { id: 'dotted' as const, label: '점선' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setBorderStyle(s.id)}
                    className={cn(
                      "py-1 text-xs rounded border transition cursor-pointer font-medium",
                      borderStyle === s.id
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                        : "bg-muted/30 text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {setOpacity && opacity !== undefined && (
            <UnitSliderControl
              label="불투명도"
              value={opacity}
              min={10}
              max={100}
              step={5}
              unit="%"
              onChange={setOpacity}
            />
          )}

          {setRadius && radius !== undefined && (
            <UnitSliderControl
              label="모서리 둥글기"
              value={radius}
              min={0}
              max={32}
              step={2}
              unit="px"
              onChange={setRadius}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default BarGeometryControlGroup;
