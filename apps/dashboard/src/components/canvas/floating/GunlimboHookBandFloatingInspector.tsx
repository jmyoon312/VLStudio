import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { FontStyleAlignControl } from '../controls/FontStyleAlignControl';
import { Switch } from '@/components/ui/switch';
import { FONT_FAMILIES } from '../constants/canvasConstants';
import { Layers, Type } from 'lucide-react';

export interface GunlimboHookBandConfig {
  enabled: boolean;
  bandColor: string;
  bandHeightPct: number;
  bandYPct: number;
  headlineText: string;
  headlineColor: string;
  headlineFontSize: number;
  headlineFont: string;
  headlineBold?: boolean;
  headlineItalic?: boolean;
  headlineAlign?: 'left' | 'center' | 'right';
  subheadlineText: string;
  subheadlineColor: string;
  subheadlineFontSize: number;
  subheadlineFont: string;
  subheadlineBold?: boolean;
  subheadlineItalic?: boolean;
  subheadlineAlign?: 'left' | 'center' | 'right';
  showBorder: boolean;
  borderColor: string;
  borderWidth: number;
}

export interface GunlimboHookBandFloatingInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: GunlimboHookBandConfig;
  onChange: (patch: Partial<GunlimboHookBandConfig>) => void;
  onReset: () => void;
  defaultPosition?: { x: number; y: number };
}

export const GunlimboHookBandFloatingInspector: React.FC<GunlimboHookBandFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  defaultPosition,
}) => {
  return (
    <BaseFloatingInspectorCard
      title="군림보형 소재목 중간 띠 바"
      icon={<Layers className="w-4 h-4 text-emerald-500" />}
      isOpen={isOpen}
      onClose={onClose}
      onReset={onReset}
      defaultPosition={defaultPosition}
    >
      {/* 1. 활성화 스위치 */}
      <div className="flex items-center justify-between py-1 border-b border-border/50">
        <span className="text-[11.5px] font-semibold text-foreground">중간 띠 바 표시</span>
        <Switch
          checked={config.enabled}
          onCheckedChange={(c) => onChange({ enabled: c })}
        />
      </div>

      {/* 2. 띠 바 배경 색상 */}
      <ColorPicker8Preset
        label="띠 바 배경 색상"
        value={config.bandColor}
        onChange={(c) => onChange({ bandColor: c })}
      />

      {/* 3. 띠 바 높이 및 Y 위치 비율 */}
      <div className="grid grid-cols-2 gap-2">
        <UnitSliderControl
          label="띠 높이 비율"
          value={config.bandHeightPct}
          min={4}
          max={20}
          step={0.5}
          unit="%"
          onChange={(v) => onChange({ bandHeightPct: v })}
        />
        <UnitSliderControl
          label="세로 위치 (Y)"
          value={config.bandYPct}
          min={15}
          max={45}
          step={0.5}
          unit="%"
          onChange={(v) => onChange({ bandYPct: v })}
        />
      </div>

      {/* 4. 메인 헤드라인 텍스트 */}
      <div className="space-y-1.5 pt-2 border-t border-border/50">
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <Type className="w-3.5 h-3.5" />
          <span>메인 헤드라인 문구</span>
        </label>
        <input
          type="text"
          value={config.headlineText}
          onChange={(e) => onChange({ headlineText: e.target.value })}
          placeholder="예: 경찰도 경악한 범인의 정체"
          className="w-full px-2.5 py-1.5 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
        <div className="grid grid-cols-2 gap-2">
          <UnitSliderControl
            label="헤드라인 크기"
            value={config.headlineFontSize}
            min={14}
            max={48}
            step={1}
            unit="px"
            onChange={(v) => onChange({ headlineFontSize: v })}
          />
          <ColorPicker8Preset
            label="글자 색상"
            value={config.headlineColor}
            onChange={(c) => onChange({ headlineColor: c })}
          />
        </div>
        <FontStyleAlignControl
          label="헤드라인 글꼴"
          font={config.headlineFont || 'Pretendard'}
          setFont={(f) => onChange({ headlineFont: f })}
          bold={config.headlineBold ?? true}
          setBold={(b) => onChange({ headlineBold: b })}
          italic={config.headlineItalic ?? false}
          setItalic={(it) => onChange({ headlineItalic: it })}
          align={config.headlineAlign || 'center'}
          setAlign={(a) => onChange({ headlineAlign: a })}
        />
      </div>

      {/* 5. 서브 헤드라인 텍스트 */}
      <div className="space-y-1.5 pt-2 border-t border-border/50">
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <Type className="w-3.5 h-3.5" />
          <span>서브 헤드라인 (소제목)</span>
        </label>
        <input
          type="text"
          value={config.subheadlineText}
          onChange={(e) => onChange({ subheadlineText: e.target.value })}
          placeholder="예: CCTV에 남겨진 마지막 단서"
          className="w-full px-2.5 py-1.5 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
        <div className="grid grid-cols-2 gap-2">
          <UnitSliderControl
            label="서브 크기"
            value={config.subheadlineFontSize}
            min={10}
            max={32}
            step={1}
            unit="px"
            onChange={(v) => onChange({ subheadlineFontSize: v })}
          />
          <ColorPicker8Preset
            label="글자 색상"
            value={config.subheadlineColor}
            onChange={(c) => onChange({ subheadlineColor: c })}
          />
        </div>
        <FontStyleAlignControl
          label="서브 헤드라인 글꼴"
          font={config.subheadlineFont || 'Pretendard'}
          setFont={(f) => onChange({ subheadlineFont: f })}
          bold={config.subheadlineBold ?? true}
          setBold={(b) => onChange({ subheadlineBold: b })}
          italic={config.subheadlineItalic ?? false}
          setItalic={(it) => onChange({ subheadlineItalic: it })}
          align={config.subheadlineAlign || 'center'}
          setAlign={(a) => onChange({ subheadlineAlign: a })}
        />
      </div>

      {/* 6. 상하단 경계선 */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-foreground">상하단 경계선 (Border)</span>
          <Switch
            checked={config.showBorder}
            onCheckedChange={(c) => onChange({ showBorder: c })}
          />
        </div>
        {config.showBorder && (
          <div className="space-y-2 pl-2 border-l-2 border-primary/30">
            <ColorPicker8Preset
              label="경계선 색상"
              value={config.borderColor}
              onChange={(c) => onChange({ borderColor: c })}
            />
            <UnitSliderControl
              label="경계선 두께"
              value={config.borderWidth}
              min={1}
              max={6}
              step={0.5}
              unit="px"
              onChange={(v) => onChange({ borderWidth: v })}
            />
          </div>
        )}
      </div>
    </BaseFloatingInspectorCard>
  );
};

export default GunlimboHookBandFloatingInspector;
