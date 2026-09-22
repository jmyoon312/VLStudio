import React from 'react';
import {
  Sparkles,
  Type,
  Palette,
  Check,
  Flame,
  Zap,
  Smile,
  Film,
  Search,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { SubtitleConfig, KOREAN_FONTS } from '@/types/subtitle';
import { TONE_PRESETS, EXTRA_CAPTION_PRESETS } from '../tabs/OneTakeBatchTab';

interface OneTakeTypographySectionProps {
  selectedTone: string;
  onToneChange: (tone: string) => void;
  selectedExtraCaption: string;
  onExtraCaptionChange: (caption: string) => void;
  subtitleConfig: SubtitleConfig;
  onSubtitleConfigChange: (config: SubtitleConfig) => void;
  speakerSeparationEnabled: boolean;
  onSpeakerSeparationToggle: (enabled: boolean) => void;
}

export const OneTakeTypographySection: React.FC<OneTakeTypographySectionProps> = ({
  selectedTone,
  onToneChange,
  selectedExtraCaption,
  onExtraCaptionChange,
  subtitleConfig,
  onSubtitleConfigChange,
  speakerSeparationEnabled,
  onSpeakerSeparationToggle
}) => {
  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">문체 스타일 & 자막 타이포그래피 설정</span>
        </div>
        <Badge variant="outline" className="text-[10px] text-primary border-primary/40 font-normal">
          자막 생성기 100% 융합
        </Badge>
      </div>

      {/* 1. 5대 문체 톤앤매너 */}
      <div>
        <Label className="text-xs font-bold text-foreground mb-2 block">
          1. 문체 톤앤매너 (Writer Persona)
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {TONE_PRESETS.map(preset => {
            const isSelected = selectedTone === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => onToneChange(preset.id)}
                className={cn(
                  "p-2.5 rounded-xl border transition-all cursor-pointer select-none text-left flex flex-col justify-between",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-xs"
                    : "border-border/80 bg-background/50 hover:bg-muted/30 hover:border-border"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-base">{preset.emoji}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </div>
                  <span className="text-xs font-bold text-foreground block">{preset.name}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                  {preset.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. 5대 쨉쨉이 훅 (Jab Captions) */}
      <div>
        <Label className="text-xs font-bold text-foreground mb-2 block">
          2. 쨉쨉이 훅 캡션 (Jab Hook Overlay)
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {EXTRA_CAPTION_PRESETS.map(preset => {
            const isSelected = selectedExtraCaption === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => onExtraCaptionChange(preset.id)}
                className={cn(
                  "p-2 rounded-xl border transition-all cursor-pointer select-none text-left",
                  isSelected
                    ? "border-amber-500 bg-amber-500/10 shadow-xs"
                    : "border-border/80 bg-background/50 hover:bg-muted/30 hover:border-border"
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1">
                    <span>{preset.emoji}</span>
                    <span>{preset.name}</span>
                  </span>
                  {isSelected && <Check className="w-3 h-3 text-amber-500 shrink-0" />}
                </div>
                <span className="text-[10px] text-muted-foreground block mt-0.5 truncate">
                  {preset.sample}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 자막 상세 타이포그래피 제어 */}
      <div className="p-3 bg-muted/20 border border-border/70 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-primary" />
            <span>자막 비주얼 스타일 (폰트 · 색상 · 외곽선)</span>
          </span>

          <div className="flex items-center gap-2">
            <Switch
              id="speaker-sep"
              checked={speakerSeparationEnabled}
              onCheckedChange={onSpeakerSeparationToggle}
              className="scale-90"
            />
            <Label htmlFor="speaker-sep" className="text-xs text-muted-foreground cursor-pointer">
              대화형 화자 분리 (화자 A/B 색상 차별화)
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* 폰트 선택 */}
          <div>
            <span className="text-muted-foreground block mb-1">상업용 무료 폰트</span>
            <select
              value={subtitleConfig.font || 'NanumGothic'}
              onChange={e => onSubtitleConfigChange({ ...subtitleConfig, font: e.target.value })}
              className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs"
            >
              {KOREAN_FONTS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* 자막 크기 */}
          <div>
            <div className="flex justify-between text-muted-foreground mb-1">
              <span>자막 크기</span>
              <span className="font-bold text-foreground">{subtitleConfig.fontSize || 20}pt</span>
            </div>
            <Slider
              value={[subtitleConfig.fontSize || 20]}
              min={14}
              max={38}
              step={1}
              onValueChange={([val]) => onSubtitleConfigChange({ ...subtitleConfig, fontSize: val })}
              className="mt-2"
            />
          </div>

          {/* 글자색 / 외곽선색 */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <span className="text-muted-foreground block mb-1">글자색</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={subtitleConfig.textColor || '#FFFFFF'}
                  onChange={e => onSubtitleConfigChange({ ...subtitleConfig, textColor: e.target.value })}
                  className="w-7 h-7 rounded border border-border cursor-pointer p-0.5 bg-background"
                />
                <span className="text-[11px] font-mono text-muted-foreground">{subtitleConfig.textColor || '#FFFFFF'}</span>
              </div>
            </div>
            <div className="flex-1">
              <span className="text-muted-foreground block mb-1">외곽선색</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={subtitleConfig.outlineColor || '#000000'}
                  onChange={e => onSubtitleConfigChange({ ...subtitleConfig, outlineColor: e.target.value })}
                  className="w-7 h-7 rounded border border-border cursor-pointer p-0.5 bg-background"
                />
                <span className="text-[11px] font-mono text-muted-foreground">{subtitleConfig.outlineColor || '#000000'}</span>
              </div>
            </div>
          </div>

          {/* 배경 박스 토글 & 외곽선 두께 */}
          <div>
            <div className="flex justify-between text-muted-foreground mb-1">
              <span>외곽선 두께</span>
              <span className="font-bold text-foreground">{subtitleConfig.outlineSize || 4}px</span>
            </div>
            <Slider
              value={[subtitleConfig.outlineSize || 4]}
              min={0}
              max={12}
              step={1}
              onValueChange={([val]) => onSubtitleConfigChange({ ...subtitleConfig, outlineSize: val })}
              className="mt-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OneTakeTypographySection;
