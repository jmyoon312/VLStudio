import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { BarGeometryControlGroup } from '../forms/shared';
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
      <BarGeometryControlGroup
        label="상단 배경 바"
        enabled={config.hasTopBarBg}
        setEnabled={(c) => onChange({ hasTopBarBg: c })}
        bgColor={config.topBarBg}
        setBgColor={(c) => onChange({ topBarBg: c })}
        heightPct={config.topBarHeightPct}
        setHeightPct={(v) => onChange({ topBarHeightPct: v })}
        opacity={config.topBarOpacity}
        setOpacity={(v) => onChange({ topBarOpacity: v })}
        radius={config.topBarRadius}
        setRadius={(v) => onChange({ topBarRadius: v })}
      />

      {/* ── 2. 하단 바 (Bottom Bar) ── */}
      <BarGeometryControlGroup
        label="하단 배경 바"
        enabled={config.hasBottomBarBg}
        setEnabled={(c) => onChange({ hasBottomBarBg: c })}
        bgColor={config.bottomBarBg}
        setBgColor={(c) => onChange({ bottomBarBg: c })}
        heightPct={config.bottomBarHeightPct}
        setHeightPct={(v) => onChange({ bottomBarHeightPct: v })}
        opacity={config.bottomBarOpacity}
        setOpacity={(v) => onChange({ bottomBarOpacity: v })}
        radius={config.bottomBarRadius}
        setRadius={(v) => onChange({ bottomBarRadius: v })}
      />
    </BaseFloatingInspectorCard>
  );
};

export default TopBottomBarFloatingInspector;
