import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { FONT_FAMILIES } from '../constants/canvasConstants';
import { ShieldAlert, Quote, Bold, Italic } from 'lucide-react';

export interface SourceCreditConfig {
  enabled: boolean;
  text: string;
  color: string;
  fontSize: number;
  font: string;
  bold?: boolean;
  italic?: boolean;
  bgEnabled: boolean;
  bgColor: string;
  borderRadius: number;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  offsetX: number;
  offsetY: number;
}

export interface SourceCreditFloatingInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: SourceCreditConfig;
  onChange: (patch: Partial<SourceCreditConfig>) => void;
  onReset: () => void;
  defaultPosition?: { x: number; y: number };
}

export const SourceCreditFloatingInspector: React.FC<SourceCreditFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  defaultPosition,
}) => {
  return (
    <BaseFloatingInspectorCard
      title="하단 출처 표기 바"
      icon={<Quote className="w-4 h-4 text-emerald-500" />}
      isOpen={isOpen}
      onClose={onClose}
      onReset={onReset}
      defaultPosition={defaultPosition}
    >
      {/* 1. 활성화 토글 */}
      <div className="flex items-center justify-between py-1 border-b border-border/50">
        <span className="text-[11.5px] font-semibold text-foreground">출처 표기 표시</span>
        <Switch
          checked={config.enabled}
          onCheckedChange={(c) => onChange({ enabled: c })}
        />
      </div>

      {/* 2. 출처 문구 */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground">출처 텍스트</label>
        <input
          type="text"
          value={config.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="예: 출처: 유튜브 @채널명 / Pixabay"
          className="w-full px-2.5 py-1.5 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* 3. 글꼴 선택 */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground">글꼴 (Font)</label>
        <select
          value={config.font || 'Pretendard'}
          onChange={(e) => onChange({ font: e.target.value })}
          className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 pt-1">
          <Button
            type="button"
            variant={config.bold ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-xs gap-1 cursor-pointer"
            onClick={() => onChange({ bold: !config.bold })}
          >
            <Bold className="w-3 h-3" />
            <span className="text-[10px] font-bold">굵게</span>
          </Button>
          <Button
            type="button"
            variant={config.italic ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-xs gap-1 cursor-pointer"
            onClick={() => onChange({ italic: !config.italic })}
          >
            <Italic className="w-3 h-3" />
            <span className="text-[10px] font-bold">기울임</span>
          </Button>
        </div>
      </div>

      {/* 4. 글자 색상 & 크기 */}
      <ColorPicker8Preset
        label="글자 색상"
        value={config.color}
        onChange={(c) => onChange({ color: c })}
      />
      <UnitSliderControl
        label="글자 크기"
        value={config.fontSize}
        min={10}
        max={30}
        step={1}
        unit="px"
        onChange={(v) => onChange({ fontSize: v })}
      />

      {/* 5. 배경 박스 */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-foreground">배경 박스 (Box)</span>
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
              max={20}
              step={1}
              unit="px"
              onChange={(v) => onChange({ borderRadius: v })}
            />
          </div>
        )}
      </div>

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
              max={8}
              step={0.5}
              unit="px"
              onChange={(v) => onChange({ strokeWidth: v })}
            />
          </div>
        )}
      </div>

      {/* 7. 위치 오프셋 */}
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

export default SourceCreditFloatingInspector;
