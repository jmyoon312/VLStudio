import React from 'react';
import { Type, Sparkles, Sliders, RotateCcw, Zap, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { FONT_FAMILIES } from '../constants/canvasConstants';

export interface JabHookInspectorFormProps {
  hasJab: boolean;
  setHasJab: (val: boolean | ((prev: boolean) => boolean)) => void;
  jabText: string;
  setJabText: (val: string | ((prev: string) => string)) => void;
  jabTiltDeg: number;
  setJabTiltDeg: (val: number | ((prev: number) => number)) => void;
  jabFontSize: number;
  setJabFontSize: (val: number | ((prev: number) => number)) => void;
  jabTextColor: string;
  setJabTextColor: (val: string | ((prev: string) => string)) => void;
  jabStroke: boolean;
  setJabStroke: (val: boolean | ((prev: boolean) => boolean)) => void;
  jabStrokeWidth: number;
  setJabStrokeWidth: (val: number | ((prev: number) => number)) => void;
  jabStrokeColor: string;
  setJabStrokeColor: (val: string | ((prev: string) => string)) => void;
  jabShadow: boolean;
  setJabShadow: (val: boolean | ((prev: boolean) => boolean)) => void;
  jabShadowBlur: number;
  setJabShadowBlur: (val: number | ((prev: number) => number)) => void;
  jabShadowColor?: string;
  setJabShadowColor?: (val: string | ((prev: string) => string)) => void;
  jabBgEnabled: boolean;
  setJabBgEnabled: (val: boolean | ((prev: boolean) => boolean)) => void;
  jabBgColor: string;
  setJabBgColor: (val: string | ((prev: string) => string)) => void;
  jabBorderRadius: number;
  setJabBorderRadius: (val: number | ((prev: number) => number)) => void;
  handleAutoTrackSmartPlacement?: () => void;
  layoutTemplateMode?: string;
  gunlimboConfig?: any;
  setGunlimboConfig?: any;
}

export const JabHookInspectorForm: React.FC<JabHookInspectorFormProps> = (props) => {
  const {
    hasJab,
    setHasJab,
    jabText,
    setJabText,
    jabTiltDeg,
    setJabTiltDeg,
    jabFontSize,
    setJabFontSize,
    jabTextColor,
    setJabTextColor,
    jabStroke,
    setJabStroke,
    jabStrokeWidth,
    setJabStrokeWidth,
    jabStrokeColor,
    setJabStrokeColor,
    jabShadow,
    setJabShadow,
    jabShadowBlur,
    setJabShadowBlur,
    jabShadowColor = '#000000',
    setJabShadowColor = () => {},
    jabBgEnabled,
    setJabBgEnabled,
    jabBgColor,
    setJabBgColor,
    jabBorderRadius,
    setJabBorderRadius,
    handleAutoTrackSmartPlacement,
    layoutTemplateMode = 'classic',
    gunlimboConfig,
    setGunlimboConfig,
  } = props;

  // 🎯 군림보형 독립 훅 밴드 인스펙터
  if (layoutTemplateMode === 'gunlimbo') {
    const gConfig = gunlimboConfig || {};
    const setGConfig = setGunlimboConfig || (() => {});
    return (
      <div className="space-y-3">
        <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border pb-1.5">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              ⚡ 군림보 훅 밴드 (중앙 와이드 바)
            </span>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground">후킹 문구 (소제목 텍스트)</label>
              <input
                type="text"
                value={gConfig.hookPhrase || ''}
                onChange={(e) => setGConfig((prev: any) => ({ ...prev, hookPhrase: e.target.value }))}
                className="w-full h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold"
                placeholder="예: 1분 만에 밝혀진 진실"
              />
            </div>
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <ColorPicker8Preset
                label="밴드 배경 색상"
                value={gConfig.hookBgColor || '#FFFFFF'}
                onChange={(val) => setGConfig((prev: any) => ({ ...prev, hookBgColor: val }))}
              />
              <ColorPicker8Preset
                label="밴드 글자 색상"
                value={gConfig.hookTextColor || '#000000'}
                onChange={(val) => setGConfig((prev: any) => ({ ...prev, hookTextColor: val }))}
              />
            </div>
            <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
              <UnitSliderControl
                label="글자 크기"
                value={gConfig.hookFontSize || 19}
                min={14}
                max={32}
                step={1}
                unit="px"
                onChange={(val) => setGConfig((prev: any) => ({ ...prev, hookFontSize: val }))}
              />
              <UnitSliderControl
                label="초반 노출 시간 (초)"
                value={gConfig.introDurationSec || 2.5}
                min={1.0}
                max={5.0}
                step={0.1}
                unit="초"
                onChange={(val) => setGConfig((prev: any) => ({ ...prev, introDurationSec: val }))}
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-semibold text-muted-foreground">가이드라인 표시</span>
                <Switch
                  checked={gConfig.showGuidelines ?? false}
                  onCheckedChange={(val) => setGConfig((prev: any) => ({ ...prev, showGuidelines: val }))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
<div className="space-y-3">
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      긴박 쨉쨉이 훅 (임팩트 텍스트)
                    </span>
                    <Switch checked={hasJab} onCheckedChange={setHasJab} />
                  </div>

                  {hasJab && (
                    <div className="space-y-2.5">
                      {/* 🎯 AI 피사체 스마트 트래킹 & 가변 회피 버튼 */}
                      <div className="p-2 bg-primary/10 border border-primary/30 rounded-[2px] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                            <Crosshair className="w-3.5 h-3.5" />
                            AI 피사체 가변 배치
                          </span>
                          <button
                            type="button"
                            onClick={handleAutoTrackSmartPlacement}
                            className="h-5 px-2 text-[9px] font-bold bg-primary text-primary-foreground rounded hover:bg-primary/90 transition cursor-pointer"
                          >
                            스마트 재배치 ⚡
                          </button>
                        </div>
                        <p className="text-[9px] text-muted-foreground leading-tight">
                          영상 피사체(인물/사물)의 시선을 가리지 않는 최적 가변 위치로 자동 배치합니다.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground font-semibold">훅 문구</label>
                        <input
                          type="text"
                          value={jabText}
                          onChange={(e) => setJabText(e.target.value)}
                          className="w-full h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold"
                          placeholder="*3초 만에 몰입되는 반전!*"
                        />
                      </div>

                      {/* 회전 각도 (-30° ~ +30°) */}
                      <div className="p-2 bg-muted/20 border border-border rounded-[2px]">
                        <UnitSliderControl
                          label="기울기 각도 (Tilt)"
                          value={jabTiltDeg ?? 0}
                          min={-30}
                          max={30}
                          step={1}
                          unit="deg"
                          onChange={setJabTiltDeg}
                        />
                      </div>

                      {/* 글자 색상 & 크기 */}
                      <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <ColorPicker8Preset
                          label="글자 색상"
                          value={jabTextColor}
                          onChange={setJabTextColor}
                        />
                        <UnitSliderControl
                          label="글자 크기"
                          value={jabFontSize ?? 13}
                          min={10}
                          max={64}
                          step={1}
                          unit="px"
                          onChange={setJabFontSize}
                        />
                      </div>

                      {/* 🎨 글자 테두리(외곽선) */}
                      <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-foreground">글자 테두리 (외곽선)</span>
                          <Switch checked={jabStroke} onCheckedChange={setJabStroke} />
                        </div>
                        {jabStroke && (
                          <div className="space-y-2 pt-1.5 border-t border-border/50">
                            <UnitSliderControl
                              label="테두리 두께"
                              value={jabStrokeWidth ?? 4}
                              min={1}
                              max={12}
                              step={1}
                              unit="px"
                              onChange={setJabStrokeWidth}
                            />
                            <ColorPicker8Preset
                              label="테두리 색상"
                              value={jabStrokeColor}
                              onChange={setJabStrokeColor}
                            />
                          </div>
                        )}
                      </div>

                      {/* 🌌 입체 그림자 */}
                      <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-foreground">글자 그림자 (Shadow)</span>
                          <Switch checked={jabShadow} onCheckedChange={setJabShadow} />
                        </div>
                        {jabShadow && (
                          <div className="space-y-2 pt-1.5 border-t border-border/50">
                            <UnitSliderControl
                              label="그림자 흐림 (Blur)"
                              value={jabShadowBlur ?? 4}
                              min={0}
                              max={20}
                              step={1}
                              unit="px"
                              onChange={setJabShadowBlur}
                            />
                            <ColorPicker8Preset
                              label="그림자 색상"
                              value={jabShadowColor || '#000000'}
                              onChange={setJabShadowColor}
                            />
                          </div>
                        )}
                      </div>

                      {/* 🔲 배경 박스 & 모서리 둥글기 */}
                      <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-foreground">배경 박스</span>
                          <Switch checked={jabBgEnabled} onCheckedChange={setJabBgEnabled} />
                        </div>
                        {jabBgEnabled && (
                          <div className="space-y-2 pt-1.5 border-t border-border/50">
                            <ColorPicker8Preset
                              label="배경 색상"
                              value={jabBgColor}
                              onChange={setJabBgColor}
                            />
                            <UnitSliderControl
                              label="모서리 모양 (둥글기)"
                              value={jabBorderRadius ?? 4}
                              min={0}
                              max={30}
                              step={1}
                              unit="px"
                              onChange={setJabBorderRadius}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
  );
};

export default JabHookInspectorForm;
