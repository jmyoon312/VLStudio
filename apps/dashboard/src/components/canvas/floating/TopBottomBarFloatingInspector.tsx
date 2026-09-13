import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { Switch } from '@/components/ui/switch';
import { Columns } from 'lucide-react';

export interface TopBottomBarConfig {
  hasTopBarBg: boolean;
  topBarHeightPct: number;
  topBarBg: string;
  topBarOpacity: number;
  topBarRadius: number;
  hasBottomBarBg: boolean;
  bottomBarHeightPct: number;
  bottomBarBg: string;
  bottomBarOpacity: number;
  bottomBarRadius: number;
}

export interface TopBottomBarFloatingInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: TopBottomBarConfig;
  onChange: (patch: Partial<TopBottomBarConfig>) => void;
  onReset: () => void;
  defaultPosition?: { x: number; y: number };
}

export const TopBottomBarFloatingInspector: React.FC<TopBottomBarFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  defaultPosition,
}) => {
  return (
    <BaseFloatingInspectorCard
      title="상·하단 배경 바"
      icon={<Columns className="w-4 h-4 text-indigo-500" />}
      isOpen={isOpen}
      onClose={onClose}
      onReset={onReset}
      defaultPosition={defaultPosition}
    >
      {/* ── 1. 상단 바 (Top Bar) ── */}
      <div className="space-y-2 p-2 bg-muted/20 rounded-[4px] border border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-foreground">상단 배경 바</span>
          <Switch
            checked={config.hasTopBarBg}
            onCheckedChange={(c) => onChange({ hasTopBarBg: c })}
          />
        </div>
        {config.hasTopBarBg && (
          <div className="space-y-2 pt-1 border-t border-border/40">
            <ColorPicker8Preset
              label="상단 바 배경색"
              value={config.topBarBg}
              onChange={(c) => onChange({ topBarBg: c })}
            />
            <div className="grid grid-cols-2 gap-2">
              <UnitSliderControl
                label="높이 비율"
                value={config.topBarHeightPct}
                min={5}
                max={35}
                step={1}
                unit="%"
                onChange={(v) => onChange({ topBarHeightPct: v })}
              />
              <UnitSliderControl
                label="불투명도"
                value={config.topBarOpacity}
                min={10}
                max={100}
                step={5}
                unit="%"
                onChange={(v) => onChange({ topBarOpacity: v })}
              />
            </div>
            <UnitSliderControl
              label="하단 모서리 둥글기"
              value={config.topBarRadius}
              min={0}
              max={32}
              step={2}
              unit="px"
              onChange={(v) => onChange({ topBarRadius: v })}
            />
          </div>
        )}
      </div>

      {/* ── 2. 하단 바 (Bottom Bar) ── */}
      <div className="space-y-2 p-2 bg-muted/20 rounded-[4px] border border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-foreground">하단 배경 바</span>
          <Switch
            checked={config.hasBottomBarBg}
            onCheckedChange={(c) => onChange({ hasBottomBarBg: c })}
          />
        </div>
        {config.hasBottomBarBg && (
          <div className="space-y-2 pt-1 border-t border-border/40">
            <ColorPicker8Preset
              label="하단 바 배경색"
              value={config.bottomBarBg}
              onChange={(c) => onChange({ bottomBarBg: c })}
            />
            <div className="grid grid-cols-2 gap-2">
              <UnitSliderControl
                label="높이 비율"
                value={config.bottomBarHeightPct}
                min={5}
                max={35}
                step={1}
                unit="%"
                onChange={(v) => onChange({ bottomBarHeightPct: v })}
              />
              <UnitSliderControl
                label="불투명도"
                value={config.bottomBarOpacity}
                min={10}
                max={100}
                step={5}
                unit="%"
                onChange={(v) => onChange({ bottomBarOpacity: v })}
              />
            </div>
            <UnitSliderControl
              label="상단 모서리 둥글기"
              value={config.bottomBarRadius}
              min={0}
              max={32}
              step={2}
              unit="px"
              onChange={(v) => onChange({ bottomBarRadius: v })}
            />
          </div>
        )}
      </div>
    </BaseFloatingInspectorCard>
  );
};

export default TopBottomBarFloatingInspector;
