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
  jabBgEnabled: boolean;
  setJabBgEnabled: (val: boolean | ((prev: boolean) => boolean)) => void;
  jabBgColor: string;
  setJabBgColor: (val: string | ((prev: string) => string)) => void;
  jabBorderRadius: number;
  setJabBorderRadius: (val: number | ((prev: number) => number)) => void;
  handleAutoTrackSmartPlacement?: () => void;
}

export const JabHookInspectorForm: React.FC<JabHookInspectorFormProps> = ({
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
  jabBgEnabled,
  setJabBgEnabled,
  jabBgColor,
  setJabBgColor,
  jabBorderRadius,
  setJabBorderRadius,
  handleAutoTrackSmartPlacement,
}) => {
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
                          value={jabTiltDeg}
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
                          value={jabFontSize}
                          min={12}
                          max={48}
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
                              value={jabStrokeWidth}
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
                              value={jabShadowBlur}
                              min={0}
                              max={20}
                              step={1}
                              unit="px"
                              onChange={setJabShadowBlur}
                            />
                            <ColorPicker8Preset
                              label="그림자 색상"
                              value={jabShadowBlur ? '#000000' : '#000000'}
                              onChange={() => {}}
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
                              value={jabBorderRadius}
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
