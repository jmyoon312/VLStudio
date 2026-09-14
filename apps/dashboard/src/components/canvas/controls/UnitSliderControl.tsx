import React from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export interface UnitSliderControlProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
  className?: string;
  disabled?: boolean;
}

export const UnitSliderControl: React.FC<UnitSliderControlProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange,
  className,
  disabled = false,
}) => {
  const safeVal = typeof value === 'number' && !isNaN(value) ? value : (min ?? 0);
  // 소수점 표시 포맷팅
  const formattedValue = step < 1 ? safeVal.toFixed(1) : safeVal.toString();

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-[11px] font-medium text-foreground">
        <span>{label}</span>
        <span className="font-mono text-[10px] text-muted-foreground font-semibold">
          {formattedValue} {unit}
        </span>
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        <Slider
          value={[safeVal]}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onValueChange={(vals) => onChange(vals[0] ?? safeVal)}
          className="flex-1 cursor-pointer"
        />
      </div>
    </div>
  );
};

export default UnitSliderControl;
