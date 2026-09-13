import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { BarGeometryControlGroup } from '../forms/shared';
import { UnitSliderControl } from '../controls/UnitSliderControl';
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
      <BarGeometryControlGroup
        label="구분선 표시"
        enabled={config.enabled}
        setEnabled={(enabled) => onChange({ enabled })}
        bgColor={config.color}
        setBgColor={(color) => onChange({ color })}
        thickness={config.thickness}
        setThickness={(thickness) => onChange({ thickness })}
        borderStyle={config.style}
        setBorderStyle={(style) => onChange({ style })}
        widthPercent={config.widthPercent}
        setWidthPercent={(widthPercent) => onChange({ widthPercent })}
        opacity={config.opacity}
        setOpacity={(opacity) => onChange({ opacity })}
      />

      {/* 세로 위치 오프셋 */}
      {config.enabled && (
        <div className="pt-2 border-t border-border/50">
          <UnitSliderControl
            label="세로 위치 (Y 오프셋)"
            value={config.offsetY}
            min={-50}
            max={50}
            step={1}
            unit="px"
            onChange={(offsetY) => onChange({ offsetY })}
          />
        </div>
      )}
    </BaseFloatingInspectorCard>
  );
};

export default DividerFloatingInspector;
