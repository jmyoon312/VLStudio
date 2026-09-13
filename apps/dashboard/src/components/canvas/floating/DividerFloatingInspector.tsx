import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { Switch } from '@/components/ui/switch';
import { Minus } from 'lucide-react';

export interface DividerConfig {
  enabled: boolean;
  style: 'solid' | 'dashed' | 'dotted';
  thickness: number;
  widthPercent: number;
  color: string;
  opacity: number;
  offsetY: number;
}

export interface DividerFloatingInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: DividerConfig;
  onChange: (patch: Partial<DividerConfig>) => void;
  onReset: () => void;
  defaultPosition?: { x: number; y: number };
}

export const DividerFloatingInspector: React.FC<DividerFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  defaultPosition,
}) => {
  return (
    <BaseFloatingInspectorCard
      title="구분선"
      icon={<Minus className="w-4 h-4 text-slate-400" />}
      isOpen={isOpen}
      onClose={onClose}
      onReset={onReset}
      defaultPosition={defaultPosition}
    >
      {/* 1. 표시 여부 토글 */}
      <div className="flex items-center justify-between py-1 border-b border-border/50">
        <span className="text-[11.5px] font-semibold text-foreground">구분선 표시</span>
        <Switch
          checked={config.enabled}
          onCheckedChange={(c) => onChange({ enabled: c })}
        />
      </div>

      {/* 2. 선 스타일 (실선, 파선, 점선) */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground">선 스타일</label>
        <div className="grid grid-cols-3 gap-1">
          {[
            { id: 'solid', label: '실선 (Solid)' },
            { id: 'dashed', label: '파선 (Dashed)' },
            { id: 'dotted', label: '점선 (Dotted)' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange({ style: s.id as any })}
              className={`py-1 text-xs rounded border transition ${
                config.style === s.id
                  ? 'bg-primary text-primary-foreground border-primary font-bold'
                  : 'bg-muted/20 text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. 선 색상 */}
      <ColorPicker8Preset
        label="선 색상"
        value={config.color}
        onChange={(c) => onChange({ color: c })}
      />

      {/* 4. 선 두께 */}
      <UnitSliderControl
        label="선 두께"
        value={config.thickness}
        min={1}
        max={10}
        step={1}
        unit="px"
        onChange={(v) => onChange({ thickness: v })}
      />

      {/* 5. 선 길이 (가로폭 비율) */}
      <UnitSliderControl
        label="선 길이 (너비)"
        value={config.widthPercent}
        min={20}
        max={100}
        step={5}
        unit="%"
        onChange={(v) => onChange({ widthPercent: v })}
      />

      {/* 6. 투명도 */}
      <UnitSliderControl
        label="투명도"
        value={config.opacity}
        min={10}
        max={100}
        step={5}
        unit="%"
        onChange={(v) => onChange({ opacity: v })}
      />

      {/* 7. 세로 위치 오프셋 */}
      <div className="pt-2 border-t border-border/50">
        <UnitSliderControl
          label="세로 위치 (Y 오프셋)"
          value={config.offsetY}
          min={-50}
          max={50}
          step={1}
          unit="px"
          onChange={(v) => onChange({ offsetY: v })}
        />
      </div>
    </BaseFloatingInspectorCard>
  );
};

export default DividerFloatingInspector;
