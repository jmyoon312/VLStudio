import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { FontStyleAlignControl } from '../controls/FontStyleAlignControl';
import { Switch } from '@/components/ui/switch';
import { Layers, Type, Sparkles } from 'lucide-react';

export interface GunlimboHookBandConfig {
  enabled: boolean;
  hookPhrase: string;
  hookBgColor: string;
  hookTextColor: string;
  hookFontSize: number;
  hookFont?: string;
  hookBold?: boolean;
  hookItalic?: boolean;
  hookAlign?: 'left' | 'center' | 'right';
  hookLetterSpacing?: number;
  hookLineHeight?: number;
  introDurationSec?: number;
  borderRadius?: number;
  showGuidelines?: boolean;
  strokeEnabled?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  // 호환성 별칭 필드
  bandColor?: string;
  headlineText?: string;
  headlineColor?: string;
  headlineFontSize?: number;
  headlineFont?: string;
  headlineBold?: boolean;
  headlineItalic?: boolean;
  headlineAlign?: 'left' | 'center' | 'right';
  subheadlineText?: string;
  subheadlineColor?: string;
  subheadlineFontSize?: number;
  subheadlineFont?: string;
  subheadlineBold?: boolean;
  subheadlineItalic?: boolean;
  subheadlineAlign?: 'left' | 'center' | 'right';
  showBorder?: boolean;
  borderColor?: string;
  borderWidth?: number;
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
  const currentPhrase = config.hookPhrase ?? config.subheadlineText ?? '';
  const currentBgColor = config.hookBgColor ?? config.bandColor ?? '#FFFFFF';
  const currentTextColor = config.hookTextColor ?? config.subheadlineColor ?? '#000000';
  const currentFontSize = config.hookFontSize ?? config.subheadlineFontSize ?? 19;
  const currentFont = config.hookFont ?? config.subheadlineFont ?? 'Pretendard';
  const currentBold = config.hookBold ?? config.subheadlineBold ?? true;
  const currentItalic = config.hookItalic ?? config.subheadlineItalic ?? false;
  const currentAlign = config.hookAlign ?? config.subheadlineAlign ?? 'center';
  const currentLetterSpacing = config.hookLetterSpacing ?? -0.5;
  const currentLineHeight = config.hookLineHeight ?? 1.25;

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

      {/* 2. 후킹 소제목 텍스트 */}
      <div className="space-y-1.5 pt-1">
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <Type className="w-3.5 h-3.5 text-primary" />
          <span>후킹 문구 (소제목 텍스트)</span>
        </label>
        <input
          type="text"
          value={currentPhrase}
          onChange={(e) => onChange({ hookPhrase: e.target.value, subheadlineText: e.target.value })}
          placeholder="예: 1분 만에 밝혀진 진실"
          className="w-full px-2.5 py-1.5 text-xs bg-muted/30 border border-border rounded-[4px] text-foreground font-bold focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* 3. 띠 바 배경 색상 (독립 1열 전체 너비 배치) */}
      <div className="space-y-1 pt-1">
        <ColorPicker8Preset
          label="띠 바 배경 색상"
          value={currentBgColor}
          onChange={(c) => onChange({ hookBgColor: c, bandColor: c })}
        />
      </div>

      {/* 4. 띠 바 글자 색상 (독립 1열 전체 너비 배치) */}
      <div className="space-y-1 pt-1">
        <ColorPicker8Preset
          label="글자 색상"
          value={currentTextColor}
          onChange={(c) => onChange({ hookTextColor: c, subheadlineColor: c })}
        />
      </div>

      {/* 5. 글자 크기 */}
      <div className="pt-1">
        <UnitSliderControl
          label="글자 크기"
          value={currentFontSize}
          min={14}
          max={36}
          step={1}
          unit="px"
          onChange={(v) => onChange({ hookFontSize: v, subheadlineFontSize: v })}
        />
      </div>

      {/* 6. 서체 및 스타일 / 정렬 */}
      <div className="pt-1">
        <FontStyleAlignControl
          label="훅 글꼴 및 정렬"
          font={currentFont}
          setFont={(f) => onChange({ hookFont: f, subheadlineFont: f })}
          bold={currentBold}
          setBold={(b) => onChange({ hookBold: b, subheadlineBold: b })}
          italic={currentItalic}
          setItalic={(it) => onChange({ hookItalic: it, subheadlineItalic: it })}
          align={currentAlign}
          setAlign={(a) => onChange({ hookAlign: a, subheadlineAlign: a })}
          letterSpacing={currentLetterSpacing}
          setLetterSpacing={(ls) => onChange({ hookLetterSpacing: ls })}
          lineHeight={currentLineHeight}
          setLineHeight={(lh) => onChange({ hookLineHeight: lh })}
        />
      </div>

      {/* 7. 초반 노출 시간 및 모서리 둥글기 */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <UnitSliderControl
          label="초반 노출 시간 (초)"
          value={config.introDurationSec ?? 2.5}
          min={1.0}
          max={5.0}
          step={0.1}
          unit="초"
          onChange={(v) => onChange({ introDurationSec: v })}
        />
        <UnitSliderControl
          label="띠 바 모서리 둥글기"
          value={config.borderRadius ?? 0}
          min={0}
          max={24}
          step={1}
          unit="px"
          onChange={(v) => onChange({ borderRadius: v })}
        />
      </div>

      {/* 8. 글자 외곽선 (Stroke) */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-foreground">글자 테두리 (외곽선)</span>
          <Switch
            checked={config.strokeEnabled ?? false}
            onCheckedChange={(c) => onChange({ strokeEnabled: c })}
          />
        </div>
        {config.strokeEnabled && (
          <div className="space-y-2 pl-2 border-l-2 border-primary/30">
            <UnitSliderControl
              label="테두리 두께"
              value={config.strokeWidth ?? 2}
              min={1}
              max={10}
              step={0.5}
              unit="px"
              onChange={(v) => onChange({ strokeWidth: v })}
            />
            <ColorPicker8Preset
              label="테두리 색상"
              value={config.strokeColor ?? '#000000'}
              onChange={(c) => onChange({ strokeColor: c })}
            />
          </div>
        )}
      </div>

      {/* 9. 글자 그림자 (Shadow) */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-foreground">글자 그림자 (Shadow)</span>
          <Switch
            checked={config.shadowEnabled ?? false}
            onCheckedChange={(c) => onChange({ shadowEnabled: c })}
          />
        </div>
        {config.shadowEnabled && (
          <div className="space-y-2 pl-2 border-l-2 border-primary/30">
            <UnitSliderControl
              label="그림자 흐림 (Blur)"
              value={config.shadowBlur ?? 4}
              min={0}
              max={20}
              step={1}
              unit="px"
              onChange={(v) => onChange({ shadowBlur: v })}
            />
            <ColorPicker8Preset
              label="그림자 색상"
              value={config.shadowColor ?? '#000000'}
              onChange={(c) => onChange({ shadowColor: c })}
            />
          </div>
        )}
      </div>
    </BaseFloatingInspectorCard>
  );
};

export default GunlimboHookBandFloatingInspector;
