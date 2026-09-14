import React from 'react';
import { Type, Sparkles, Sliders, Palette, Layers, Eye, Check, MessageSquare, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import SubtitleConfigPanel from '@/components/shared/SubtitleConfigPanel';
import { cn } from '@/lib/utils';
import { SUBTITLE_STYLES } from '@/types/ddalkkak';
import { SubtitleConfig } from '@/types/subtitle';
import { NleLayerObject } from '@/types/nle';
import { useToast } from '@/components/ui/use-toast';
import { SHORTS_SUBTITLE_DESIGN_PRESETS, rgbaToHex } from '../constants/canvasConstants';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { FontStyleAlignControl } from '../controls/FontStyleAlignControl';

export interface SubtitleStyleInspectorFormProps {
  subtitleConfig: SubtitleConfig;
  setSubtitleConfig: React.Dispatch<React.SetStateAction<SubtitleConfig>>;
  subtitleStrokeEnabled: boolean;
  setSubtitleStrokeEnabled: (val: boolean | ((prev: boolean) => boolean)) => void;
  subtitleStrokeWidth: number;
  setSubtitleStrokeWidth: (val: number | ((prev: number) => number)) => void;
  subtitleStrokeColor: string;
  setSubtitleStrokeColor: (val: string | ((prev: string) => string)) => void;
  subtitleShadowEnabled: boolean;
  setSubtitleShadowEnabled: (val: boolean | ((prev: boolean) => boolean)) => void;
  subtitleShadowBlur: number;
  setSubtitleShadowBlur: (val: number | ((prev: number) => number)) => void;
  subtitleShadowColor: string;
  setSubtitleShadowColor: (val: string | ((prev: string) => string)) => void;
  subtitleUseBox: boolean;
  setSubtitleUseBox: (val: boolean | ((prev: boolean) => boolean)) => void;
  subtitleBoxColor: string;
  setSubtitleBoxColor: (val: string | ((prev: string) => string)) => void;
  subtitleBorderRadius: number;
  setSubtitleBorderRadius: (val: number | ((prev: number) => number)) => void;
  subtitleMaxChars: number;
  setSubtitleMaxChars: (val: number | ((prev: number) => number)) => void;
  selectedHighlightColor: string;
  setSelectedHighlightColor: (val: string | ((prev: string) => string)) => void;
  selectedSubtitlePresetId: string;
  setSelectedSubtitlePresetId: (val: string | ((prev: string) => string)) => void;
  layers?: NleLayerObject[];
  setLayers?: React.Dispatch<React.SetStateAction<NleLayerObject[]>>;
  pushHistorySnapshot?: () => void;
  activeSub?: any;
}

export const SubtitleStyleInspectorForm: React.FC<SubtitleStyleInspectorFormProps> = ({
  subtitleConfig,
  setSubtitleConfig,
  subtitleStrokeEnabled,
  setSubtitleStrokeEnabled,
  subtitleStrokeWidth,
  setSubtitleStrokeWidth,
  subtitleStrokeColor,
  setSubtitleStrokeColor,
  subtitleShadowEnabled,
  setSubtitleShadowEnabled,
  subtitleShadowBlur,
  setSubtitleShadowBlur,
  subtitleShadowColor,
  setSubtitleShadowColor,
  subtitleUseBox,
  setSubtitleUseBox,
  subtitleBoxColor,
  setSubtitleBoxColor,
  subtitleBorderRadius,
  setSubtitleBorderRadius,
  subtitleMaxChars,
  setSubtitleMaxChars,
  selectedHighlightColor,
  setSelectedHighlightColor,
  selectedSubtitlePresetId,
  setSelectedSubtitlePresetId,
  layers,
  setLayers = () => {},
  ...props
}) => {
  const { toast } = useToast();
  const pushHistorySnapshot = (props as any).pushHistorySnapshot || (() => {});
  const activeSub = (props as any).activeSub || (layers ? layers.find(l => l.type === 'subtitle') : null);
  return (
<div className="space-y-3">
                {/* 🌟 1. 8대 쇼츠 자막 스타일 퀵 프리셋 (뚜렷한 디자인 차별화 & 시각적 미니 프리뷰) */}
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      8대 쇼츠 자막 스타일 프리셋
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/30 font-bold">
                      1클릭 즉시 적용
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SHORTS_SUBTITLE_DESIGN_PRESETS.map((preset) => {
                      const isSelected = selectedSubtitlePresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            pushHistorySnapshot();
                            setSelectedSubtitlePresetId(preset.id);
                            // 1. subtitleConfig 업데이트
                            setSubtitleConfig(prev => ({
                              ...prev,
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
                            }));
                            // 2. 상단 슬라이더 state 동기화
                            setSubtitleStrokeEnabled(preset.outlineSize > 0);
                            setSubtitleStrokeWidth(preset.outlineSize || 4);
                            setSubtitleStrokeColor(preset.outlineColor);
                            setSubtitleUseBox(preset.useBox);
                            setSubtitleBoxColor(preset.boxColor);
                            setSubtitleShadowEnabled(preset.shadowSize > 0);
                            setSubtitleShadowColor(preset.shadowColor);
                            toast({ title: '자막 스타일 적용 완료', description: `'${preset.name}' 스타일이 적용되었습니다.` });
                          }}
                          className={cn(
                            "relative p-2 text-left rounded-[3px] border transition-all cursor-pointer flex flex-col justify-between h-20 overflow-hidden select-none",
                            isSelected
                              ? "bg-primary/15 border-primary ring-2 ring-primary/80 shadow-md scale-[1.02]"
                              : "bg-muted/25 border-border/80 hover:border-primary/50 hover:bg-muted/60"
                          )}
                        >
                          {/* 상단: 이름 & 뱃지 */}
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[11px] font-bold text-foreground truncate">{preset.name}</span>
                            <span className={cn("text-[8px] px-1 py-0.2 rounded font-black", preset.badgeColor)}>
                              {isSelected ? '✓ 적용' : preset.badge}
                            </span>
                          </div>

                          {/* 중앙: 실제 자막 미니 프리뷰 (영상 배경 모의 시뮬레이션) */}
                          <div className="w-full bg-zinc-950 rounded px-1.5 py-1 text-center flex items-center justify-center overflow-hidden border border-zinc-800">
                            <span
                              style={{
                                fontFamily: preset.fontFamily,
                                color: preset.textColor,
                                WebkitTextStroke: preset.outlineSize > 0 ? `1.2px ${preset.outlineColor}` : 'none',
                                textShadow: preset.shadowSize > 0 ? `0 1px 3px ${preset.shadowColor}` : 'none',
                                backgroundColor: preset.useBox ? preset.boxColor : 'transparent',
                                padding: preset.useBox ? '0.5px 3px' : '0',
                                borderRadius: '2px',
                              }}
                              className="text-[9.5px] font-black tracking-tight truncate leading-tight inline-block max-w-full"
                            >
                              {preset.sampleText}
                            </span>
                          </div>

                          {/* 하단 설명 */}
                          <span className="text-[8.5px] text-muted-foreground truncate font-medium">{preset.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 🎨 2. 단어별 강조색 (Word Highlights) 지정 도구 */}
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-500" />
                      단어별 강조색 (Word Highlights)
                    </span>
                    {activeSub?.styleProps?.highlights && activeSub.styleProps.highlights.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          pushHistorySnapshot();
                          setLayers(prev => prev.map(l => l.id === activeSub.id ? { ...l, styleProps: { ...l.styleProps, highlights: [] } } : l));
                          toast({ title: '강조 초기화', description: '선택 자막의 모든 단어 강조가 해제되었습니다.' });
                        }}
                        className="text-[9.5px] text-rose-500 hover:text-rose-400 cursor-pointer underline font-bold"
                      >
                        강조 전체 해제
                      </button>
                    )}
                  </div>

                  {/* 강조 색상 선택 팔레트 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground font-semibold">적용할 강조 색상</span>
                      <span className="font-mono font-bold text-foreground">{selectedHighlightColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[
                        { color: '#FFDF00', name: '골드 옐로우' },
                        { color: '#FF2E93', name: '핫 핑크' },
                        { color: '#00F0FF', name: '네온 시안' },
                        { color: '#10B981', name: '에메랄드' },
                        { color: '#FF8A00', name: '오렌지' },
                      ].map((pal) => (
                        <button
                          key={pal.color}
                          type="button"
                          onClick={() => setSelectedHighlightColor(pal.color)}
                          style={{ backgroundColor: pal.color }}
                          className={cn(
                            "w-6 h-6 rounded-full border-2 transition cursor-pointer shadow-xs",
                            selectedHighlightColor === pal.color
                              ? "border-white scale-115 ring-2 ring-primary ring-offset-1"
                              : "border-black/30 opacity-80 hover:opacity-100"
                          )}
                          title={pal.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 단어 칩 목록 (클릭 시 하이라이트 토글) */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      강조할 단어를 클릭하세요 (토글):
                    </span>
                    {activeSub ? (
                      <div className="p-2 bg-muted/30 border border-border rounded-[2px] flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                        {activeSub.data.split(/\s+/).filter(Boolean).map((word: string, wIdx: number) => {
                          const cleanW = word.replace(/[.,!?~'"“”‘’]/g, '').trim();
                          const currentHl = activeSub.styleProps?.highlights?.find((h: any) => h.word === cleanW);
                          return (
                            <button
                              key={wIdx}
                              type="button"
                              onClick={() => {
                                pushHistorySnapshot();
                                const currentHls: { word: string; color: string }[] = activeSub.styleProps?.highlights || [];
                                const exists = currentHls.some((h: any) => h.word === cleanW);
                                const newHls = exists
                                  ? currentHls.filter((h: any) => h.word !== cleanW)
                                  : [...currentHls, { word: cleanW, color: selectedHighlightColor }];

                                setLayers(prev => prev.map(l => l.id === activeSub.id ? {
                                  ...l,
                                  styleProps: { ...l.styleProps, highlights: newHls }
                                } : l));
                              }}
                              style={currentHl ? { backgroundColor: currentHl.color || selectedHighlightColor, color: '#000000' } : {}}
                              className={cn(
                                "px-2 py-0.5 text-[11px] rounded-[2px] border font-bold transition cursor-pointer select-none",
                                currentHl
                                  ? "border-transparent shadow-xs font-black ring-1 ring-black/20"
                                  : "bg-card border-border hover:border-primary/60 text-foreground"
                              )}
                              title={`단어 '${cleanW}' 강조색 토글`}
                            >
                              {word}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-muted-foreground text-[10px] bg-muted/20 border border-dashed border-border rounded-[2px]">
                        타임라인에서 자막 클립을 선택하면 단어 칩이 표시됩니다.
                      </div>
                    )}
                  </div>
                </div>

                {/* ⚙️ 3. 본문 자막 모서리/배경/외곽선/그림자 제어 패널 (완전 복원) */}
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-3 shadow-2xs">
                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                    본문 자막 스타일 & 배경 효과
                  </span>

                  {/* 자막 글꼴 및 서체 스타일 / 정렬 */}
                  <FontStyleAlignControl
                    label="자막 글꼴 (Font)"
                    font={subtitleConfig.font || subtitleConfig.fontFamily || 'Pretendard'}
                    setFont={(f) => setSubtitleConfig(prev => ({ ...prev, font: f, fontFamily: f }))}
                    bold={subtitleConfig.isBold !== false && (subtitleConfig as any).bold !== false}
                    setBold={(b) => setSubtitleConfig(prev => ({ ...prev, isBold: b, bold: b }))}
                    italic={!!(subtitleConfig.isItalic || (subtitleConfig as any).italic)}
                    setItalic={(i) => setSubtitleConfig(prev => ({ ...prev, isItalic: i, italic: i }))}
                    align={subtitleConfig.textAlign || (subtitleConfig as any).align || 'center'}
                    setAlign={(a) => setSubtitleConfig(prev => ({ ...prev, textAlign: a, align: a }))}
                    letterSpacing={subtitleConfig.letterSpacing ?? 0}
                    setLetterSpacing={(ls) => setSubtitleConfig(prev => ({ ...prev, letterSpacing: ls }))}
                    lineHeight={subtitleConfig.lineHeight ?? 1.35}
                    setLineHeight={(lh) => setSubtitleConfig(prev => ({ ...prev, lineHeight: lh }))}
                  />

                  {/* 자막 글자 색상 & 크기 */}
                  <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
                    <ColorPicker8Preset
                      label="자막 글자 색상"
                      value={rgbaToHex(subtitleConfig.textColor || '#FFFFFF', '#FFFFFF')}
                      onChange={(val) => {
                        setSubtitleConfig(prev => ({ ...prev, textColor: val, fillColor: val }));
                      }}
                    />
                    <UnitSliderControl
                      label="자막 글자 크기"
                      value={subtitleConfig.fontSize || 18}
                      min={12}
                      max={48}
                      step={1}
                      unit="px"
                      onChange={(val) => {
                        setSubtitleConfig(prev => ({ ...prev, fontSize: val }));
                      }}
                    />
                  </div>

                  {/* 자동 내려쓰기 글자 수 */}
                  <div className="p-2 bg-muted/20 border border-border rounded-[2px]">
                    <UnitSliderControl
                      label="자동 줄바꿈 (내려쓰기 글자 수)"
                      value={subtitleConfig.splitLimit || subtitleMaxChars}
                      min={6}
                      max={24}
                      step={1}
                      unit="자"
                      onChange={(val) => {
                        setSubtitleMaxChars(val);
                        setSubtitleConfig(prev => ({ ...prev, splitLimit: val }));
                      }}
                    />
                  </div>

                  {/* 외곽선(스트로크) 제어 */}
                  <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-foreground">자막 테두리 (외곽선)</span>
                      <Switch
                        checked={((subtitleConfig.outlineSize ?? 0) > 0) || subtitleStrokeEnabled}
                        onCheckedChange={(chk) => {
                          setSubtitleStrokeEnabled(chk);
                          setSubtitleConfig(prev => ({ ...prev, outlineSize: chk ? (subtitleStrokeWidth || 4) : 0 }));
                        }}
                      />
                    </div>
                    {(((subtitleConfig.outlineSize ?? 0) > 0) || subtitleStrokeEnabled) && (
                      <div className="space-y-2 pt-1.5 border-t border-border/50">
                        <UnitSliderControl
                          label="테두리 두께"
                          value={subtitleConfig.outlineSize ?? subtitleStrokeWidth}
                          min={1}
                          max={12}
                          step={1}
                          unit="px"
                          onChange={(val) => {
                            setSubtitleStrokeWidth(val);
                            setSubtitleConfig(prev => ({ ...prev, outlineSize: val, strokeWidth: val }));
                          }}
                        />
                        <ColorPicker8Preset
                          label="테두리 색상"
                          value={rgbaToHex(subtitleConfig.outlineColor || subtitleStrokeColor, '#000000')}
                          onChange={(val) => {
                            setSubtitleStrokeColor(val);
                            setSubtitleConfig(prev => ({ ...prev, outlineColor: val, strokeColor: val }));
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* 입체 그림자 제어 */}
                  <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-foreground">자막 입체 그림자</span>
                      <Switch
                        checked={((subtitleConfig.shadowSize ?? 0) > 0) || subtitleShadowEnabled}
                        onCheckedChange={(chk) => {
                          setSubtitleShadowEnabled(chk);
                          setSubtitleConfig(prev => ({ ...prev, shadowSize: chk ? 3 : 0 }));
                        }}
                      />
                    </div>
                    {(((subtitleConfig.shadowSize ?? 0) > 0) || subtitleShadowEnabled) && (
                      <div className="space-y-2 pt-1.5 border-t border-border/50">
                        <UnitSliderControl
                          label="그림자 크기"
                          value={subtitleConfig.shadowSize ?? 3}
                          min={1}
                          max={12}
                          step={1}
                          unit="px"
                          onChange={(val) => {
                            setSubtitleShadowBlur(val * 2);
                            setSubtitleConfig(prev => ({ ...prev, shadowSize: val }));
                          }}
                        />
                        <ColorPicker8Preset
                          label="그림자 색상"
                          value={rgbaToHex(subtitleConfig.shadowColor || subtitleShadowColor, '#000000')}
                          onChange={(val) => {
                            setSubtitleShadowColor(val);
                            setSubtitleConfig(prev => ({ ...prev, shadowColor: val }));
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* 🔲 자막 배경 필 박스 & 모서리 둥글기 */}
                  <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-foreground">배경 필 박스 (Pill Box)</span>
                      <Switch
                        checked={subtitleConfig.useBox ?? subtitleUseBox}
                        onCheckedChange={(chk) => {
                          setSubtitleUseBox(chk);
                          setSubtitleConfig(prev => ({ ...prev, useBox: chk }));
                        }}
                      />
                    </div>
                    {(subtitleConfig.useBox ?? subtitleUseBox) && (
                      <div className="space-y-2 pt-1.5 border-t border-border/50">
                        <ColorPicker8Preset
                          label="배경 박스 색상"
                          value={rgbaToHex(subtitleConfig.boxColor || subtitleBoxColor, '#000000')}
                          onChange={(val) => {
                            setSubtitleBoxColor(val);
                            setSubtitleConfig(prev => ({ ...prev, boxColor: val }));
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
                            setSubtitleBorderRadius(val);
                            setSubtitleConfig(prev => ({ ...prev, boxRadius: val, borderRadius: val }));
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. 자막 정밀 파라미터 패널 (하단 상세 설정) */}
                <div className="border-t border-border pt-1">
                  <SubtitleConfigPanel
                    config={subtitleConfig}
                    onChange={(newCfg) => {
                      setSubtitleConfig(newCfg);
                      if (newCfg.splitLimit) setSubtitleMaxChars(newCfg.splitLimit);
                                          }}
                  />
                </div>
              </div>
  );
};

export default SubtitleStyleInspectorForm;
