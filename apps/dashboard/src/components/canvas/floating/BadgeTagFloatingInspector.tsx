import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { Switch } from '@/components/ui/switch';
import { Tag } from 'lucide-react';

export interface BadgeTagConfig {
  enabled: boolean;
  text: string;
  bgColor: string;
  textColor: string;
  fontSize: number;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
  offsetX: number;
  offsetY: number;
}

export interface BadgeTagFloatingInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: BadgeTagConfig;
  onChange: (patch: Partial<BadgeTagConfig>) => void;
  onReset: () => void;
  defaultPosition?: { x: number; y: number };
}

export const BadgeTagFloatingInspector: React.FC<BadgeTagFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  defaultPosition,
}) => {
  return (
    <BaseFloatingInspectorCard
      title="상단 강조 뱃지 태그"
      icon={<Tag className="w-4 h-4 text-rose-500" />}
      isOpen={isOpen}
      onClose={onClose}
      onReset={onReset}
      defaultPosition={defaultPosition}
    >
      {/* 1. 활성화 토글 */}
      <div className="flex items-center justify-between py-1 border-b border-border/50">
        <span className="text-[11.5px] font-semibold text-foreground">뱃지 표시</span>
        <Switch
          checked={config.enabled}
          onCheckedChange={(c) => onChange({ enabled: c })}
        />
      </div>

      {/* 2. 뱃지 문구 */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground">뱃지 문구</label>
        <input
          type="text"
          value={config.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="예: [단독], [충격], [실화], [속보]"
          className="w-full px-2.5 py-1.5 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* 3. 배경 색상 */}
      <ColorPicker8Preset
        label="배경 색상"
        value={config.bgColor}
        onChange={(c) => onChange({ bgColor: c })}
      />

      {/* 4. 글자 색상 */}
      <ColorPicker8Preset
        label="글자 색상"
        value={config.textColor}
        onChange={(c) => onChange({ textColor: c })}
      />

      {/* 5. 글자 크기 */}
      <UnitSliderControl
        label="글자 크기"
        value={config.fontSize}
        min={10}
        max={28}
        step={1}
        unit="px"
        onChange={(v) => onChange({ fontSize: v })}
      />

      {/* 6. 모서리 둥글기 */}
      <UnitSliderControl
        label="모서리 둥글기 (Radius)"
        value={config.borderRadius}
        min={0}
        max={24}
        step={1}
        unit="px"
        onChange={(v) => onChange({ borderRadius: v })}
      />

      {/* 7. 안쪽 여백 */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <UnitSliderControl
          label="좌우 여백"
          value={config.paddingX}
          min={2}
          max={20}
          step={1}
          unit="px"
          onChange={(v) => onChange({ paddingX: v })}
        />
        <UnitSliderControl
          label="상하 여백"
          value={config.paddingY}
          min={1}
          max={12}
          step={1}
          unit="px"
          onChange={(v) => onChange({ paddingY: v })}
        />
      </div>

      {/* 8. 위치 오프셋 */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <span className="text-[11px] font-semibold text-muted-foreground">위치 미세 조정 (X, Y)</span>
        <div className="grid grid-cols-2 gap-2">
          <UnitSliderControl
            label="X 오프셋"
            value={config.offsetX}
            min={-100}
            max={100}
            step={1}
            unit="px"
            onChange={(v) => onChange({ offsetX: v })}
          />
          <UnitSliderControl
            label="Y 오프셋"
            value={config.offsetY}
            min={-100}
            max={100}
            step={1}
            unit="px"
            onChange={(v) => onChange({ offsetY: v })}
          />
        </div>
      </div>
    </BaseFloatingInspectorCard>
  );
};

export default BadgeTagFloatingInspector;
