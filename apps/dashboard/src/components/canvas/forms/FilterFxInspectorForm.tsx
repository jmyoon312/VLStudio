import React from 'react';
import { Palette, Sparkles, Sliders, RotateCcw, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { CAPCUT_FILTER_PRESETS } from '../constants/canvasConstants';

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
                  <div className="space-y-1 p-2 bg-muted/20 border border-border rounded-[2px]">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-foreground font-semibold flex items-center gap-1">
                        <Film className="w-3 h-3 text-amber-500" />
                        35mm 영화 필름 노이즈 (Grain)
                      </span>
                      <span className="font-mono text-amber-500 font-bold">{videoFilter.filmGrain}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={videoFilter.filmGrain}
                      onChange={(e) => setVideoFilter(prev => ({ ...prev, filmGrain: parseInt(e.target.value) }))}
                      className="w-full accent-amber-500 cursor-pointer h-1 bg-muted"
                    />
                  </div>

                  {/* 🎬 시네마틱 비네팅 */}
                  <div className="space-y-1 p-2 bg-muted/20 border border-border rounded-[2px]">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-foreground font-semibold">시네마틱 비네트 (Vignette)</span>
                      <span className="font-mono text-primary font-bold">{videoFilter.vignette}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={videoFilter.vignette}
                      onChange={(e) => setVideoFilter(prev => ({ ...prev, vignette: parseInt(e.target.value) }))}
                      className="w-full accent-primary cursor-pointer h-1 bg-muted"
                    />
                  </div>

                  {/* 밝기, 대비, 채도, 색온도 정밀 슬라이더 */}
                  <div className="space-y-2 pt-1 border-t border-border">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9.5px]">
                        <span className="text-muted-foreground">대비 (Contrast)</span>
                        <span className="font-mono font-bold text-foreground">{videoFilter.contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="150"
                        value={videoFilter.contrast}
                        onChange={(e) => setVideoFilter(prev => ({ ...prev, contrast: parseInt(e.target.value) }))}
                        className="w-full accent-primary cursor-pointer h-1 bg-muted"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9.5px]">
                        <span className="text-muted-foreground">채도 (Saturation)</span>
                        <span className="font-mono font-bold text-foreground">{videoFilter.saturation}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="180"
                        value={videoFilter.saturation}
                        onChange={(e) => setVideoFilter(prev => ({ ...prev, saturation: parseInt(e.target.value) }))}
                        className="w-full accent-primary cursor-pointer h-1 bg-muted"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9.5px]">
                        <span className="text-muted-foreground">색온도 (Warmth)</span>
                        <span className="font-mono font-bold text-foreground">{videoFilter.temperature > 0 ? `+${videoFilter.temperature}` : videoFilter.temperature}</span>
                      </div>
                      <input
                        type="range"
                        min="-40"
                        max="40"
                        value={videoFilter.temperature}
                        onChange={(e) => setVideoFilter(prev => ({ ...prev, temperature: parseInt(e.target.value) }))}
                        className="w-full accent-amber-500 cursor-pointer h-1 bg-muted"
                      />
                    </div>
                  </div>

                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-[2px] text-[9.5px] text-emerald-600 dark:text-emerald-400">
                    ✓ CapCut 프로젝트 내보내기 시 색보정 메타데이터로 100% 자동 직결 연동됩니다.
                  </div>
                </div>
              </div>
  );
};

export default FilterFxInspectorForm;
