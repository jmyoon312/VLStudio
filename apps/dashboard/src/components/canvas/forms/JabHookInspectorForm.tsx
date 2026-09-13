import React from 'react';
import { Type, Sparkles, Sliders, RotateCcw, Zap, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

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

                      {/* 회전 각도 (-15° ~ +15°) */}
                      <div className="space-y-1 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-foreground font-semibold">회전 각도 (Tilt)</span>
                          <span className="font-mono text-amber-500 font-bold">{jabTiltDeg}°</span>
                        </div>
                        <input
                          type="range"
                          min="-15"
                          max="15"
                          value={jabTiltDeg}
                          onChange={(e) => setJabTiltDeg(parseInt(e.target.value))}
                          className="w-full accent-amber-500 cursor-pointer h-1 bg-muted"
                        />
                      </div>

                      {/* 글자 크기 & 글자 색상 */}
                      <div className="space-y-1 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-foreground font-semibold">글자 크기 & 색상</span>
                          <span className="font-mono text-primary font-bold">{jabFontSize}px</span>
                        </div>
                        <div className="flex gap-1.5 items-center">
                          <input
                            type="range"
                            min="10"
                            max="36"
                            value={jabFontSize}
                            onChange={(e) => setJabFontSize(parseInt(e.target.value))}
                            className="flex-1 accent-primary cursor-pointer h-1 bg-muted"
                          />
                          <input
                            type="color"
                            value={jabTextColor}
                            onChange={(e) => setJabTextColor(e.target.value)}
                            className="w-7 h-7 p-0 border border-border rounded cursor-pointer bg-transparent"
                            title="글자 색상"
                          />
                        </div>
                      </div>

                      {/* 🎨 글자 테두리(외곽선) */}
                      <div className="space-y-1.5 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-foreground">글자 테두리 (외곽선)</span>
                          <Switch checked={jabStroke} onCheckedChange={setJabStroke} />
                        </div>
                        {jabStroke && (
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground">두께: {jabStrokeWidth}px</span>
                              <input
                                type="color"
                                value={jabStrokeColor}
                                onChange={(e) => setJabStrokeColor(e.target.value)}
                                className="w-5 h-5 p-0 border border-border rounded cursor-pointer bg-transparent"
                                title="테두리 색상"
                              />
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="8"
                              value={jabStrokeWidth}
                              onChange={(e) => setJabStrokeWidth(parseInt(e.target.value))}
                              className="w-full accent-primary cursor-pointer h-1 bg-muted"
                            />
                          </div>
                        )}
                      </div>

                      {/* 🌌 입체 그림자 */}
                      <div className="space-y-1.5 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-foreground">글자 입체 그림자</span>
                          <Switch checked={jabShadow} onCheckedChange={setJabShadow} />
                        </div>
                        {jabShadow && (
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground">흐림: {jabShadowBlur}px</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="16"
                              value={jabShadowBlur}
                              onChange={(e) => setJabShadowBlur(parseInt(e.target.value))}
                              className="w-full accent-amber-500 cursor-pointer h-1 bg-muted"
                            />
                          </div>
                        )}
                      </div>

                      {/* 🔲 배경 박스 & 모서리 둥글기 */}
                      <div className="space-y-1.5 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-foreground">배경 박스</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={jabBgColor}
                              onChange={(e) => setJabBgColor(e.target.value)}
                              className="w-5 h-5 p-0 border border-border rounded cursor-pointer bg-transparent"
                              title="배경색"
                            />
                            <Switch checked={jabBgEnabled} onCheckedChange={setJabBgEnabled} />
                          </div>
                        </div>
                        {jabBgEnabled && (
                          <div className="space-y-1 pt-1 border-t border-border/50">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground">모서리 모양 (둥글기)</span>
                              <span className="font-mono text-amber-500 font-bold">{jabBorderRadius}px</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="30"
                              value={jabBorderRadius}
                              onChange={(e) => setJabBorderRadius(parseInt(e.target.value))}
                              className="w-full accent-amber-500 cursor-pointer h-1 bg-muted"
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
