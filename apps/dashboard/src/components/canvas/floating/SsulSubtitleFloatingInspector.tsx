import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { TypographyControlGroup } from '../forms/shared';
import { Switch } from '@/components/ui/switch';
import { MessageSquareText } from 'lucide-react';

export interface SsulSubtitleConfig {
  text?: string;
  font: string;
  color: string;
  fontSizeMultiplier: number;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  lineHeightMultiplier: number;
  letterSpacingPx: number;
  marginTopPx: number;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  boxEnabled: boolean;
  boxColor: string;
  boxRadius: number;
}

export interface SsulSubtitleFloatingInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: SsulSubtitleConfig;
  onChange: (patch: Partial<SsulSubtitleConfig>) => void;
  onReset: () => void;
  defaultPosition?: { x: number; y: number };
}

export const SsulSubtitleFloatingInspector: React.FC<SsulSubtitleFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  defaultPosition,
}) => {
  return (
    <BaseFloatingInspectorCard
      title="자막 본문"
      icon={<MessageSquareText className="w-4 h-4 text-violet-500" />}
      isOpen={isOpen}
      onClose={onClose}
      onReset={onReset}
      defaultPosition={defaultPosition}
    >
      {/* 0. 자막 문구 직접 편집 */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground">자막 문구 (타임라인 자막 우선 동기화)</label>
        <textarea
          rows={2}
          value={config.text || ''}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="자막을 입력하세요"
          className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
        />
      </div>

      {/* 1. 타이포그래피 설정 (글꼴, 색상, 크기, 정렬, 스타일, 획, 그림자 등) */}
      <TypographyControlGroup
        font={config.font || 'Pretendard'}
        setFont={(font) => onChange({ font })}
        color={config.color}
        setColor={(color) => onChange({ color })}
        fontSizeMultiplier={config.fontSizeMultiplier}
        setFontSizeMultiplier={(fontSizeMultiplier) => onChange({ fontSizeMultiplier })}
        align={config.align}
        setAlign={(align) => onChange({ align })}
        bold={config.bold}
        setBold={(bold) => onChange({ bold })}
        italic={config.italic}
        setItalic={(italic) => onChange({ italic })}
        lineHeight={config.lineHeightMultiplier}
        setLineHeight={(lineHeightMultiplier) => onChange({ lineHeightMultiplier })}
        letterSpacing={config.letterSpacingPx}
        setLetterSpacing={(letterSpacingPx) => onChange({ letterSpacingPx })}
        strokeEnabled={config.strokeEnabled}
        setStrokeEnabled={(strokeEnabled) => onChange({ strokeEnabled })}
        strokeColor={config.strokeColor}
        setStrokeColor={(strokeColor) => onChange({ strokeColor })}
        strokeWidth={config.strokeWidth}
        setStrokeWidth={(strokeWidth) => onChange({ strokeWidth })}
        shadowEnabled={config.shadowEnabled}
        setShadowEnabled={(shadowEnabled) => onChange({ shadowEnabled })}
        shadowColor={config.shadowColor}
        setShadowColor={(shadowColor) => onChange({ shadowColor })}
        shadowBlur={config.shadowBlur}
        setShadowBlur={(shadowBlur) => onChange({ shadowBlur })}
      />

      {/* 구분선과의 상단 여백 */}
      <div className="pt-2 border-t border-border/40">
        <UnitSliderControl
          label="상단 여백 (Margin Top)"
          value={config.marginTopPx}
          min={0}
          max={40}
          step={1}
          unit="px"
          onChange={(marginTopPx) => onChange({ marginTopPx })}
        />
      </div>

      {/* 9. 배경 박스(Background Box) 설정 */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-foreground">배경 박스 (Box)</span>
          <Switch
            checked={config.boxEnabled}
            onCheckedChange={(c) => onChange({ boxEnabled: c })}
          />
        </div>
        {config.boxEnabled && (
          <div className="space-y-2 pl-2 border-l-2 border-primary/30">
            <ColorPicker8Preset
              label="박스 색상"
              value={config.boxColor}
              onChange={(c) => onChange({ boxColor: c })}
            />
            <UnitSliderControl
              label="모서리 둥글기"
              value={config.boxRadius}
              min={0}
              max={20}
              step={1}
              unit="px"
              onChange={(v) => onChange({ boxRadius: v })}
            />
          </div>
        )}
      </div>
    </BaseFloatingInspectorCard>
  );
};

export default SsulSubtitleFloatingInspector;
