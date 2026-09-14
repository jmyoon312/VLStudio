import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { TypographyControlGroup } from '../forms/shared';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { Type } from 'lucide-react';

export interface PostTitleConfig {
  text: string;
  color: string;
  font: string;
  fontSizeMultiplier: number;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  offsetX: number;
  offsetY: number;
  letterSpacing: number;
  lineHeight: number;
}

export interface PostTitleFloatingInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: PostTitleConfig;
  onChange: (patch: Partial<PostTitleConfig>) => void;
  onReset: () => void;
  defaultPosition?: { x: number; y: number };
}

export const PostTitleFloatingInspector: React.FC<PostTitleFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  defaultPosition,
}) => {
  return (
    <BaseFloatingInspectorCard
      title="게시글 제목"
      icon={<Type className="w-4 h-4 text-sky-500" />}
      isOpen={isOpen}
      onClose={onClose}
      onReset={onReset}
      defaultPosition={defaultPosition}
    >
      {/* 1. 제목 내용 (1줄 단정 규격) */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
          <span>제목 텍스트</span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">1줄 권장</span>
        </label>
        <input
          type="text"
          value={config.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="게시글 제목을 입력하세요..."
          className="w-full h-8 px-2.5 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground"
        />
      </div>

      {/* 2. 타이포그래피 설정 (글꼴, 색상, 크기, 정렬, 스타일, 획, 그림자 등) */}
      <TypographyControlGroup
        font={config.font}
        setFont={(font) => onChange({ font })}
        color={config.color}
        setColor={(color) => onChange({ color })}
        fontSizeMultiplier={config.fontSizeMultiplier}
        setFontSizeMultiplier={(fontSizeMultiplier) => onChange({ fontSizeMultiplier })}
        bold={config.bold}
        setBold={(bold) => onChange({ bold })}
        italic={config.italic}
        setItalic={(italic) => onChange({ italic })}
        align={config.align}
        setAlign={(align) => onChange({ align })}
        lineHeight={config.lineHeight}
        setLineHeight={(lineHeight) => onChange({ lineHeight })}
        letterSpacing={config.letterSpacing}
        setLetterSpacing={(letterSpacing) => onChange({ letterSpacing })}
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

      {/* 9. 위치 미세 조정 */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground">위치 미세 조정 (X, Y)</span>
        </div>
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

export default PostTitleFloatingInspector;
