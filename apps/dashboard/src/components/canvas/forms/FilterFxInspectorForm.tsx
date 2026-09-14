import React from 'react';
import { Palette, Sparkles, Sliders, RotateCcw, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { CAPCUT_FILTER_PRESETS } from '../constants/canvasConstants';
import UnitSliderControl from '../controls/UnitSliderControl';

export interface VideoFilterConfig {
  preset: string;
  filmGrain: number;
  vignette: number;
  contrast: number;
  saturation: number;
  temperature?: number;
  warmth?: number;
  brightness?: number;
  intensity?: number;
}

export interface FilterFxInspectorFormProps {
  videoFilter: VideoFilterConfig;
  setVideoFilter: React.Dispatch<React.SetStateAction<VideoFilterConfig>>;
}

export const FilterFxInspectorForm: React.FC<FilterFxInspectorFormProps> = ({
  videoFilter,
  setVideoFilter,
}) => {
  const { toast } = useToast();
  return (
<div className="space-y-3">
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      캡컷 인기 시네마틱 필터 & 영화 노이즈
                    </span>
                    <button
                      type="button"
                      onClick={() => setVideoFilter({
                        preset: 'none',
                        intensity: 100,
                        filmGrain: 0,
                        vignette: 0,
                        brightness: 100,
                        contrast: 100,
                        saturation: 100,
                        temperature: 0,
                      })}
                      className="text-[9px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-border"
                    >
                      초기화
                    </button>
                  </div>

                  {/* 10대 필터 프리셋 2열 그리드 */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {CAPCUT_FILTER_PRESETS.map((fp) => (
                      <div
                        key={fp.id}
                        onClick={() => {
                          setVideoFilter(prev => ({
                            ...prev,
                            preset: fp.id,
                            filmGrain: fp.grain,
                            vignette: fp.vignette,
                            brightness: fp.b,
                            contrast: fp.c,
                            saturation: fp.s,
                            temperature: fp.t,
                          }));
                          toast({ title: `🎨 ${fp.name} 적용`, description: fp.desc });
                        }}
                        className={cn(
                          "p-2 border rounded-[2px] cursor-pointer transition flex flex-col gap-1 text-left relative overflow-hidden",
                          videoFilter.preset === fp.id
                            ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary"
                            : "border-border bg-background hover:bg-muted/40"
                        )}
                      >
                        <div className={cn("w-full h-4 rounded-xs bg-gradient-to-r opacity-90 mb-0.5", fp.color)} />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-foreground truncate">{fp.name}</span>
                          {videoFilter.preset === fp.id && (
                            <span className="text-[8px] bg-primary text-primary-foreground px-1 rounded-xs font-bold shrink-0">✓</span>
                          )}
                        </div>
                        <span className="text-[8.5px] text-muted-foreground leading-tight line-clamp-1">{fp.desc}</span>
                      </div>
                    ))}
                  </div>

                  {/* 🎞️ 영화 필름 노이즈 / 그레인 슬라이더 */}
                  <div className="p-2 bg-muted/20 border border-border rounded-[2px]">
                    <UnitSliderControl
                      label="35mm 영화 필름 노이즈 (Grain)"
                      value={videoFilter.filmGrain}
                      unit="%"
                      min={0}
                      max={100}
                      step={1}
                      onChange={(val) => setVideoFilter(prev => ({ ...prev, filmGrain: val }))}
                    />
                  </div>

                  {/* 🎬 시네마틱 비네팅 */}
                  <div className="p-2 bg-muted/20 border border-border rounded-[2px]">
                    <UnitSliderControl
                      label="시네마틱 비네트 (Vignette)"
                      value={videoFilter.vignette}
                      unit="%"
                      min={0}
                      max={100}
                      step={1}
                      onChange={(val) => setVideoFilter(prev => ({ ...prev, vignette: val }))}
                    />
                  </div>

                  {/* 밝기, 대비, 채도, 색온도 정밀 슬라이더 */}
                  <div className="space-y-3 pt-2 border-t border-border">
                    <UnitSliderControl
                      label="대비 (Contrast)"
                      value={videoFilter.contrast}
                      unit="%"
                      min={60}
                      max={150}
                      step={1}
                      onChange={(val) => setVideoFilter(prev => ({ ...prev, contrast: val }))}
                    />
                    <UnitSliderControl
                      label="채도 (Saturation)"
                      value={videoFilter.saturation}
                      unit="%"
                      min={0}
                      max={180}
                      step={1}
                      onChange={(val) => setVideoFilter(prev => ({ ...prev, saturation: val }))}
                    />
                    <UnitSliderControl
                      label="색온도 (Warmth)"
                      value={videoFilter.temperature ?? 0}
                      unit=""
                      min={-40}
                      max={40}
                      step={1}
                      onChange={(val) => setVideoFilter(prev => ({ ...prev, temperature: val }))}
                    />
                  </div>

                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-[2px] text-[9.5px] text-emerald-600 dark:text-emerald-400">
                    ✓ CapCut 프로젝트 내보내기 시 색보정 메타데이터로 100% 자동 직결 연동됩니다.
                  </div>
                </div>
              </div>
  );
};

export default FilterFxInspectorForm;
