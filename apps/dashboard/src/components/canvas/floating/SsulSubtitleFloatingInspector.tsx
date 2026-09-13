import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { Switch } from '@/components/ui/switch';
import { FONT_FAMILIES } from '../constants/canvasConstants';
import { MessageSquareText, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';

export interface SsulSubtitleConfig {
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
      {/* 1. 글꼴 선택 */}
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
      </div>

      {/* 2. 글자 색상 */}
      <ColorPicker8Preset
        label="글자 색상"
        value={config.color}
        onChange={(c) => onChange({ color: c })}
      />

      {/* 3. 글자 크기 배율 */}
      <UnitSliderControl
        label="글자 크기"
        value={config.fontSizeMultiplier}
        min={0.6}
        max={2.4}
        step={0.05}
        unit="x"
        onChange={(v) => onChange({ fontSizeMultiplier: v })}
      />

      {/* 4. 정렬 & 볼드 / 이탤릭 토글 */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground">정렬 및 스타일</label>
        <div className="flex items-center justify-between gap-1 bg-muted/20 p-1 rounded-[4px] border border-border/50">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onChange({ align: 'left' })}
              className={`p-1.5 rounded transition ${
                config.align === 'left' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="왼쪽 정렬"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChange({ align: 'center' })}
              className={`p-1.5 rounded transition ${
                config.align === 'center' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="가운데 정렬"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChange({ align: 'right' })}
              className={`p-1.5 rounded transition ${
                config.align === 'right' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="오른쪽 정렬"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChange({ bold: !config.bold })}
              className={`px-2 py-1 text-[11px] font-bold rounded flex items-center gap-1 transition ${
                config.bold ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bold className="w-3 h-3" />
              <span>굵게</span>
            </button>
            <button
              type="button"
              onClick={() => onChange({ italic: !config.italic })}
              className={`px-2 py-1 text-[11px] italic rounded flex items-center gap-1 transition ${
                config.italic ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Italic className="w-3 h-3" />
              <span>기울임</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. 줄간격 및 자간 */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
        <UnitSliderControl
          label="줄간격"
          value={config.lineHeightMultiplier}
          min={1.0}
          max={2.5}
          step={0.05}
          unit="x"
          onChange={(v) => onChange({ lineHeightMultiplier: v })}
        />
        <UnitSliderControl
          label="자간"
          value={config.letterSpacingPx}
          min={-2}
          max={6}
          step={0.5}
          unit="px"
          onChange={(v) => onChange({ letterSpacingPx: v })}
        />
      </div>

      {/* 6. 구분선과의 상단 여백 */}
      <div className="pt-1">
        <UnitSliderControl
          label="상단 여백 (Margin Top)"
          value={config.marginTopPx}
          min={0}
          max={40}
          step={1}
          unit="px"
          onChange={(v) => onChange({ marginTopPx: v })}
        />
      </div>

      {/* 7. 외곽선(Stroke) 설정 */}
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

      {/* 8. 그림자(Shadow) 설정 */}
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
              max={20}
              step={1}
              unit="px"
              onChange={(v) => onChange({ shadowBlur: v })}
            />
          </div>
        )}
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
