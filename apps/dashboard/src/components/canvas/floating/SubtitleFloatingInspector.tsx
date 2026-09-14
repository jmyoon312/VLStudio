import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Sparkles } from 'lucide-react';
import { SHORTS_SUBTITLE_DESIGN_PRESETS, FONT_FAMILIES } from '../constants/canvasConstants';
import { SubtitleConfig } from '@/types/subtitle';
import { cn } from '@/lib/utils';

export interface SubtitleFloatingInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: SubtitleConfig;
  onChange: (patch: Partial<SubtitleConfig>) => void;
  onReset: () => void;
  defaultPosition?: { x: number; y: number };

  subtitleStrokeEnabled?: boolean;
  setSubtitleStrokeEnabled?: (val: boolean) => void;
  subtitleStrokeWidth?: number;
  setSubtitleStrokeWidth?: (val: number) => void;
  subtitleStrokeColor?: string;
  setSubtitleStrokeColor?: (val: string) => void;

  subtitleShadowEnabled?: boolean;
  setSubtitleShadowEnabled?: (val: boolean) => void;
  subtitleShadowBlur?: number;
  setSubtitleShadowBlur?: (val: number) => void;
  subtitleShadowColor?: string;
  setSubtitleShadowColor?: (val: string) => void;

  subtitleUseBox?: boolean;
  setSubtitleUseBox?: (val: boolean) => void;
  subtitleBoxColor?: string;
  setSubtitleBoxColor?: (val: string) => void;
  subtitleBorderRadius?: number;
  setSubtitleBorderRadius?: (val: number) => void;

  subtitleMaxChars?: number;
  setSubtitleMaxChars?: (val: number) => void;
  selectedSubtitlePresetId?: string;
  setSelectedSubtitlePresetId?: (id: string) => void;
}

export const SubtitleFloatingInspector: React.FC<SubtitleFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  defaultPosition,
  subtitleStrokeEnabled = false,
  setSubtitleStrokeEnabled,
  subtitleStrokeWidth = 4,
  setSubtitleStrokeWidth,
  subtitleStrokeColor = '#000000',
  setSubtitleStrokeColor,
  subtitleShadowEnabled = false,
  setSubtitleShadowEnabled,
  subtitleShadowBlur = 8,
  setSubtitleShadowBlur,
  subtitleShadowColor = '#000000',
  setSubtitleShadowColor,
  subtitleUseBox = false,
  setSubtitleUseBox,
  subtitleBoxColor = '#000000',
  setSubtitleBoxColor,
  subtitleBorderRadius = 4,
  setSubtitleBorderRadius,
  subtitleMaxChars = 14,
  setSubtitleMaxChars,
  selectedSubtitlePresetId,
  setSelectedSubtitlePresetId,
}) => {
  const isStrokeActive = ((config.outlineSize ?? 0) > 0) || subtitleStrokeEnabled;
  const isShadowActive = ((config.shadowSize ?? 0) > 0) || subtitleShadowEnabled;
  const isBoxActive = (config.useBox ?? subtitleUseBox);

  return (
    <BaseFloatingInspectorCard
      title="본문 자막 스타일 & 효과"
      icon={<MessageSquare className="w-4 h-4 text-emerald-500" />}
      isOpen={isOpen}
      onClose={onClose}
      onReset={onReset}
      defaultPosition={defaultPosition}
    >
      {/* 🌟 1. 8대 쇼츠 자막 스타일 퀵 프리셋 */}
      <div className="space-y-1.5 pb-2 border-b border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            인기 자막 스타일 프리셋
          </span>
          <Badge variant="outline" className="text-[8.5px] px-1 py-0 h-4 bg-primary/10 text-primary border-primary/30 font-bold">
            1클릭 즉시 적용
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-0.5">
          {SHORTS_SUBTITLE_DESIGN_PRESETS.map((preset) => {
            const isSelected = selectedSubtitlePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setSelectedSubtitlePresetId?.(preset.id);
                  onChange({
                    fontFamily: preset.fontFamily,
                    font: preset.fontFamily,
                    textColor: preset.textColor,
                    fillColor: preset.textColor,
                    outlineSize: preset.outlineSize,
                    outlineColor: preset.outlineColor,
                    strokeWidth: preset.outlineSize,
                    strokeColor: preset.outlineColor,
                    useBox: preset.useBox,
                    boxColor: preset.boxColor,
                    shadowSize: preset.shadowSize,
                    shadowColor: preset.shadowColor,
                    fontSize: preset.fontSize,
                  });
                  setSubtitleStrokeEnabled?.(preset.outlineSize > 0);
                  setSubtitleStrokeWidth?.(preset.outlineSize || 4);
                  setSubtitleStrokeColor?.(preset.outlineColor);
                  setSubtitleUseBox?.(preset.useBox);
                  setSubtitleBoxColor?.(preset.boxColor);
                  setSubtitleShadowEnabled?.(preset.shadowSize > 0);
                  setSubtitleShadowColor?.(preset.shadowColor);
                }}
                className={cn(
                  "p-1.5 text-left rounded-[3px] border transition-all cursor-pointer flex flex-col justify-between h-14 overflow-hidden select-none",
                  isSelected
                    ? "bg-primary/15 border-primary ring-1 ring-primary/80 shadow-xs"
                    : "bg-muted/25 border-border/80 hover:border-primary/50 hover:bg-muted/60"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-bold text-foreground truncate">{preset.name}</span>
                  {isSelected && (
                    <span className="text-[7.5px] bg-primary text-primary-foreground px-1 py-0.2 rounded font-black">
                      ✓ 적용
                    </span>
                  )}
                </div>
                <div className="w-full bg-zinc-950 rounded px-1 py-0.5 text-center flex items-center justify-center overflow-hidden border border-zinc-800">
                  <span
                    style={{
                      fontFamily: preset.fontFamily,
                      color: preset.textColor,
                      WebkitTextStroke: preset.outlineSize > 0 ? `1px ${preset.outlineColor}` : 'none',
                      textShadow: preset.shadowSize > 0 ? `0 1px 2px ${preset.shadowColor}` : 'none',
                      backgroundColor: preset.useBox ? preset.boxColor : 'transparent',
                      padding: preset.useBox ? '0.5px 2px' : '0',
                      borderRadius: '2px',
                    }}
                    className="text-[8.5px] font-black tracking-tight truncate leading-tight inline-block max-w-full"
                  >
                    {preset.sampleText}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 글꼴 선택 */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground">자막 글꼴 (Font)</label>
        <select
          value={config.fontFamily || config.font || 'Pretendard'}
          onChange={(e) => {
            const val = e.target.value;
            onChange({ fontFamily: val, font: val });
          }}
          className="w-full px-2 py-1 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {/* 3. 글자 색상 & 크기 */}
      <div className="space-y-2 p-2 bg-muted/20 border border-border/80 rounded-[4px]">
        <ColorPicker8Preset
          label="자막 글자 색상"
          value={config.textColor || config.fillColor || config.color || '#FFFFFF'}
          onChange={(val) => {
            onChange({ textColor: val, fillColor: val, color: val });
          }}
        />
        <UnitSliderControl
          label="자막 글자 크기"
          value={config.fontSize || 18}
          min={12}
          max={48}
          step={1}
          unit="px"
          onChange={(val) => {
            onChange({ fontSize: val });
          }}
        />
      </div>

      {/* 4. 자동 내려쓰기 줄바꿈 글자 수 */}
      <UnitSliderControl
        label="자동 줄바꿈 (글자 수)"
        value={config.splitLimit || subtitleMaxChars}
        min={6}
        max={24}
        step={1}
        unit="자"
        onChange={(val) => {
          onChange({ splitLimit: val });
          setSubtitleMaxChars?.(val);
        }}
      />

      {/* 5. 테두리 (외곽선) */}
      <div className="space-y-2 p-2 bg-muted/20 border border-border/80 rounded-[4px]">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-foreground">자막 테두리 (외곽선)</span>
          <Switch
            checked={isStrokeActive}
            onCheckedChange={(chk) => {
              setSubtitleStrokeEnabled?.(chk);
              onChange({ outlineSize: chk ? (subtitleStrokeWidth || 4) : 0 });
            }}
          />
        </div>
        {isStrokeActive && (
          <div className="space-y-2 pt-1.5 border-t border-border/50">
            <UnitSliderControl
              label="테두리 두께"
              value={config.outlineSize ?? subtitleStrokeWidth}
              min={1}
              max={12}
              step={1}
              unit="px"
              onChange={(val) => {
                setSubtitleStrokeWidth?.(val);
                onChange({ outlineSize: val, strokeWidth: val });
              }}
            />
            <ColorPicker8Preset
              label="테두리 색상"
              value={config.outlineColor || subtitleStrokeColor || '#000000'}
              onChange={(val) => {
                setSubtitleStrokeColor?.(val);
                onChange({ outlineColor: val, strokeColor: val });
              }}
            />
          </div>
        )}
      </div>

      {/* 6. 입체 그림자 */}
      <div className="space-y-2 p-2 bg-muted/20 border border-border/80 rounded-[4px]">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-foreground">자막 입체 그림자</span>
          <Switch
            checked={isShadowActive}
            onCheckedChange={(chk) => {
              setSubtitleShadowEnabled?.(chk);
              onChange({ shadowSize: chk ? 3 : 0 });
            }}
          />
        </div>
        {isShadowActive && (
          <div className="space-y-2 pt-1.5 border-t border-border/50">
            <UnitSliderControl
              label="그림자 크기"
              value={config.shadowSize ?? 3}
              min={1}
              max={12}
              step={1}
              unit="px"
              onChange={(val) => {
                setSubtitleShadowBlur?.(val * 2);
                onChange({ shadowSize: val });
              }}
            />
            <ColorPicker8Preset
              label="그림자 색상"
              value={config.shadowColor || subtitleShadowColor || '#000000'}
              onChange={(val) => {
                setSubtitleShadowColor?.(val);
                onChange({ shadowColor: val });
              }}
            />
          </div>
        )}
      </div>

      {/* 7. 배경 필 박스 & 모서리 둥글기 */}
      <div className="space-y-2 p-2 bg-muted/20 border border-border/80 rounded-[4px]">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-foreground">배경 필 박스 (Pill Box)</span>
          <Switch
            checked={isBoxActive}
            onCheckedChange={(chk) => {
              setSubtitleUseBox?.(chk);
              onChange({ useBox: chk });
            }}
          />
        </div>
        {isBoxActive && (
          <div className="space-y-2 pt-1.5 border-t border-border/50">
            <ColorPicker8Preset
              label="배경 박스 색상"
              value={config.boxColor || subtitleBoxColor || '#000000'}
              onChange={(val) => {
                setSubtitleBoxColor?.(val);
                onChange({ boxColor: val });
              }}
            />
            <UnitSliderControl
              label="모서리 모양 (둥글기)"
              value={subtitleBorderRadius}
              min={0}
              max={30}
              step={1}
              unit="px"
              onChange={(val) => {
                setSubtitleBorderRadius?.(val);
              }}
            />
          </div>
        )}
      </div>
    </BaseFloatingInspectorCard>
  );
};

export default SubtitleFloatingInspector;
