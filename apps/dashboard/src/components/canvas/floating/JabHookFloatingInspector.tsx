import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { FontStyleAlignControl } from '../controls/FontStyleAlignControl';
import { Switch } from '@/components/ui/switch';
import { FONT_FAMILIES } from '../constants/canvasConstants';
import { Zap, RotateCw } from 'lucide-react';

export interface JabHookConfig {
  enabled: boolean;
  text: string;
  tiltDeg: number;
  fontSize: number;
  textColor: string;
  font: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  bgEnabled: boolean;
  bgColor: string;
  borderRadius: number;
  offsetX: number;
  offsetY: number;
}

export interface JabHookFloatingInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: JabHookConfig;
  onChange: (patch: Partial<JabHookConfig>) => void;
  onReset: () => void;
  defaultPosition?: { x: number; y: number };
}

export const JabHookFloatingInspector: React.FC<JabHookFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  defaultPosition,
}) => {
  return (
    <BaseFloatingInspectorCard
      title="3초 쨉쨉이 훅"
      icon={<Zap className="w-4 h-4 text-amber-500" />}
      isOpen={isOpen}
      onClose={onClose}
      onReset={onReset}
      defaultPosition={defaultPosition}
    >
      {/* 1. 활성화 스위치 */}
      <div className="flex items-center justify-between py-1 border-b border-border/50">
        <span className="text-[11.5px] font-semibold text-foreground">쨉쨉이 훅 표시</span>
        <Switch
          checked={config.enabled}
          onCheckedChange={(c) => onChange({ enabled: c })}
        />
      </div>

      {/* 2. 쨉쨉이 문구 */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground">쨉쨉이 텍스트</label>
        <input
          type="text"
          value={config.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="예: 마지막 반전 주의 ㄷㄷ"
          className="w-full px-2.5 py-1.5 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* 3. 기울기 (Tilt Angle) */}
      <UnitSliderControl
        label="기울기 각도 (Tilt)"
        value={config.tiltDeg}
        min={-30}
        max={30}
        step={1}
        unit="deg"
        onChange={(v) => onChange({ tiltDeg: v })}
      />

      {/* 4. 글꼴 및 서체 스타일 / 정렬 */}
      <FontStyleAlignControl
        label="훅 글꼴 (Font)"
        font={config.font || 'GmarketSans'}
        setFont={(font) => onChange({ font })}
        bold={config.bold}
        setBold={(bold) => onChange({ bold })}
        italic={config.italic}
        setItalic={(italic) => onChange({ italic })}
        align={config.align || 'center'}
        setAlign={(align) => onChange({ align })}
      />

      {/* 5. 글자 색상 & 크기 */}
      <ColorPicker8Preset
        label="글자 색상"
        value={config.textColor}
        onChange={(c) => onChange({ textColor: c })}
      />
      <UnitSliderControl
        label="글자 크기"
        value={config.fontSize}
        min={16}
        max={64}
        step={1}
        unit="px"
        onChange={(v) => onChange({ fontSize: v })}
      />

      {/* 6. 외곽선 */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-foreground">외곽선 (Stroke)</span>
          <Switch
            checked={config.strokeEnabled}
            onCheckedChange={(c) => onChange({ strokeEnabled: c })}
          />
        </div>
        {config.strokeEnabled && (
          <div className="space-y-2 pl-2 border-l-2 border-primary/30">
            <ColorPicker8Preset
              label="외곽선 색상"
              value={config.strokeColor}
              onChange={(c) => onChange({ strokeColor: c })}
            />
            <UnitSliderControl
              label="외곽선 두께"
              value={config.strokeWidth}
              min={1}
              max={10}
              step={0.5}
              unit="px"
              onChange={(v) => onChange({ strokeWidth: v })}
            />
          </div>
        )}
      </div>

      {/* 7. 그림자 */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-foreground">그림자 (Shadow)</span>
          <Switch
            checked={config.shadowEnabled}
            onCheckedChange={(c) => onChange({ shadowEnabled: c })}
          />
        </div>
        {config.shadowEnabled && (
          <div className="space-y-2 pl-2 border-l-2 border-primary/30">
            <ColorPicker8Preset
              label="그림자 색상"
              value={config.shadowColor}
              onChange={(c) => onChange({ shadowColor: c })}
            />
            <UnitSliderControl
              label="그림자 번짐"
              value={config.shadowBlur}
              min={1}
              max={24}
              step={1}
              unit="px"
              onChange={(v) => onChange({ shadowBlur: v })}
            />
          </div>
        )}
      </div>

      {/* 8. 배경 상자 */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-foreground">배경 상자 (Box)</span>
          <Switch
            checked={config.bgEnabled}
            onCheckedChange={(c) => onChange({ bgEnabled: c })}
          />
        </div>
        {config.bgEnabled && (
          <div className="space-y-2 pl-2 border-l-2 border-primary/30">
            <ColorPicker8Preset
              label="배경 색상"
              value={config.bgColor}
              onChange={(c) => onChange({ bgColor: c })}
            />
            <UnitSliderControl
              label="모서리 둥글기"
              value={config.borderRadius}
              min={0}
              max={24}
              step={1}
              unit="px"
              onChange={(v) => onChange({ borderRadius: v })}
            />
          </div>
        )}
      </div>

      {/* 9. 위치 미세 조정 */}
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

export default JabHookFloatingInspector;
