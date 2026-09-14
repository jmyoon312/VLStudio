import React from 'react';
import { Crop, Sparkles, Sliders, RotateCcw, FlipHorizontal, FlipVertical, Crosshair, RefreshCw, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';

export type VideoFitMode = 'sandwich' | 'fullscreen' | 'fit-center' | 'fit-top' | 'center' | 'top_heavy' | 'bottom_heavy' | 'custom';

export interface VideoCropInspectorFormProps {
  videoFitMode: VideoFitMode;
  setVideoFitMode: (mode: VideoFitMode | ((prev: VideoFitMode) => VideoFitMode)) => void;
  videoFocusXPct: number;
  setVideoFocusXPct: (val: number | ((prev: number) => number)) => void;
  videoFocusYPct: number;
  setVideoFocusYPct: (val: number | ((prev: number) => number)) => void;
  videoZoomScale: number;
  setVideoZoomScale: (val: number | ((prev: number) => number)) => void;
  videoRotationDeg: number;
  setVideoRotationDeg: (val: number | ((prev: number) => number)) => void;
  videoHorizontalFlip: boolean;
  setVideoHorizontalFlip: (val: boolean | ((prev: boolean) => boolean)) => void;
  videoVerticalFlip: boolean;
  setVideoVerticalFlip: (val: boolean | ((prev: boolean) => boolean)) => void;
  videoBlurBg: boolean;
  setVideoBlurBg: (val: boolean | ((prev: boolean) => boolean)) => void;
  videoBorderRadius?: number;
  setVideoBorderRadius?: (val: number | ((prev: number) => number)) => void;
  videoBorderEnabled?: boolean;
  setVideoBorderEnabled?: (val: boolean | ((prev: boolean) => boolean)) => void;
  videoBorderWidth?: number;
  setVideoBorderWidth?: (val: number | ((prev: number) => number)) => void;
  videoBorderColor?: string;
  setVideoBorderColor?: (val: string | ((prev: string) => string)) => void;
  videoShadowEnabled?: boolean;
  setVideoShadowEnabled?: (val: boolean | ((prev: boolean) => boolean)) => void;
  videoShadowBlur?: number;
  setVideoShadowBlur?: (val: number | ((prev: number) => number)) => void;
  videoShadowColor?: string;
  setVideoShadowColor?: (val: string | ((prev: string) => string)) => void;
  videoPaddingPct?: number;
  setVideoPaddingPct?: (val: number | ((prev: number) => number)) => void;
  layoutTemplateMode?: string;
  instaConfig?: any;
  setInstaConfig?: any;
}

export const VideoCropInspectorForm: React.FC<VideoCropInspectorFormProps> = ({
  videoFitMode,
  setVideoFitMode,
  videoFocusXPct,
  setVideoFocusXPct,
  videoFocusYPct,
  setVideoFocusYPct,
  videoZoomScale,
  setVideoZoomScale,
  videoRotationDeg,
  setVideoRotationDeg,
  videoHorizontalFlip,
  setVideoHorizontalFlip,
  videoVerticalFlip,
  setVideoVerticalFlip,
  videoBlurBg,
  setVideoBlurBg,
  videoBorderRadius = 0,
  setVideoBorderRadius,
  videoBorderEnabled = false,
  setVideoBorderEnabled,
  videoBorderWidth = 1,
  setVideoBorderWidth,
  videoBorderColor = '#FFFFFF',
  setVideoBorderColor,
  videoShadowEnabled = false,
  setVideoShadowEnabled,
  videoShadowBlur = 10,
  setVideoShadowBlur,
  videoShadowColor = 'rgba(0,0,0,0.6)',
  setVideoShadowColor,
  videoPaddingPct = 0,
  setVideoPaddingPct,
  layoutTemplateMode = 'classic',
  instaConfig,
  setInstaConfig,
}) => {
  const { toast } = useToast();

  const currentBorderRadius = layoutTemplateMode === 'instagram' && instaConfig?.holeRoundness !== undefined
    ? instaConfig.holeRoundness
    : (layoutTemplateMode === 'ssul' && videoBorderRadius === 0 ? 12 : videoBorderRadius);

  const currentBorderEnabled = layoutTemplateMode === 'instagram'
    ? (instaConfig?.holeBorderWidth ?? 0) > 0
    : videoBorderEnabled;

  const currentBorderWidth = layoutTemplateMode === 'instagram'
    ? (instaConfig?.holeBorderWidth || 1)
    : videoBorderWidth;

  const currentBorderColor = layoutTemplateMode === 'instagram'
    ? (instaConfig?.holeBorderColor || '#E5E7EB')
    : videoBorderColor;

  const currentShadowEnabled = layoutTemplateMode === 'instagram'
    ? !!instaConfig?.holeShadow
    : videoShadowEnabled;

  const currentShadowBlur = videoShadowBlur;
  const currentShadowColor = videoShadowColor;
  return (
<div className="space-y-3">
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Crop className="w-3.5 h-3.5 text-primary" />
                      비디오 핏 모드 & 2D 자유 변형
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoFocusXPct(50);
                        setVideoFocusYPct(50);
                        setVideoZoomScale(100);
                        setVideoRotationDeg(0);
                        setVideoHorizontalFlip(false);
                        setVideoVerticalFlip(false);
                        toast({ title: '🔄 비디오 변형 초기화', description: '화면 정중앙 100% 비율로 리셋되었습니다.' });
                      }}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>전체 리셋</span>
                    </button>
                  </div>

                  {/* 5대 비디오 핏 모드 */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setVideoFitMode('sandwich')}
                      className={cn(
                        "p-2 border rounded-[2px] text-left transition cursor-pointer flex flex-col gap-0.5",
                        videoFitMode === 'sandwich' ? "bg-primary/15 border-primary text-foreground font-bold shadow-2xs" : "border-border bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="text-[10px]">🥪 샌드위치 핏</span>
                      <span className="text-[8.5px] text-muted-foreground">상·하단 바 사이 안착</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoFitMode('fullscreen')}
                      className={cn(
                        "p-2 border rounded-[2px] text-left transition cursor-pointer flex flex-col gap-0.5",
                        videoFitMode === 'fullscreen' ? "bg-primary/15 border-primary text-foreground font-bold shadow-2xs" : "border-border bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="text-[10px]">📱 풀스크린 핏</span>
                      <span className="text-[8.5px] text-muted-foreground">화면 전체 채움 크롭</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoFitMode('fit-center')}
                      className={cn(
                        "p-2 border rounded-[2px] text-left transition cursor-pointer flex flex-col gap-0.5",
                        videoFitMode === 'fit-center' ? "bg-primary/15 border-primary text-foreground font-bold shadow-2xs" : "border-border bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="text-[10px]">🎯 중앙 맞춤 핏</span>
                      <span className="text-[8.5px] text-muted-foreground">16:9 원본 100% 보존</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoFitMode('fit-top')}
                      className={cn(
                        "p-2 border rounded-[2px] text-left transition cursor-pointer flex flex-col gap-0.5",
                        videoFitMode === 'fit-top' ? "bg-primary/15 border-primary text-foreground font-bold shadow-2xs" : "border-border bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="text-[10px]">🔝 상단 집중 핏</span>
                      <span className="text-[8.5px] text-muted-foreground">하단 넓은 자막 공간</span>
                    </button>
                  </div>

                  {/* 🌟 가우시안 블러 미러 배경 스위치 */}
                  <div className="flex items-center justify-between p-2 bg-muted/30 border border-border rounded-[2px]">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-foreground block">여백 가우시안 블러 미러 배경</span>
                      <span className="text-[8.5px] text-muted-foreground">16:9 영상 주변에 흐린 미러 배경을 채웁니다</span>
                    </div>
                    <Switch checked={videoBlurBg} onCheckedChange={setVideoBlurBg} />
                  </div>

                  {/* 🎮 9-방향 원클릭 스냅 정렬 매트릭스 */}
                  <div className="space-y-1 pt-1 border-t border-border">
                    <span className="text-[10px] font-semibold text-muted-foreground">원클릭 스냅 정렬 (9-Way)</span>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-muted/20 border border-border rounded-[2px]">
                      {[
                        { label: '↖ 좌상단', x: 20, y: 20 },
                        { label: '↑ 상단', x: 50, y: 20 },
                        { label: '↗ 우상단', x: 80, y: 20 },
                        { label: '← 좌중앙', x: 20, y: 50 },
                        { label: '🎯 중앙', x: 50, y: 50 },
                        { label: '→ 우중앙', x: 80, y: 50 },
                        { label: '↙ 좌하단', x: 20, y: 80 },
                        { label: '↓ 하단', x: 50, y: 80 },
                        { label: '↘ 우하단', x: 80, y: 80 },
                      ].map((snap, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => { setVideoFocusXPct(snap.x); setVideoFocusYPct(snap.y); }}
                          className={cn(
                            "py-1 text-[9px] font-semibold rounded-[2px] border transition cursor-pointer",
                            videoFocusXPct === snap.x && videoFocusYPct === snap.y
                              ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                              : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {snap.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 가로 X & 세로 Y 정밀 오프셋 슬라이더 */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
                    <UnitSliderControl
                      label="가로 위치 (X)"
                      value={videoFocusXPct}
                      min={0}
                      max={100}
                      step={1}
                      unit="%"
                      onChange={setVideoFocusXPct}
                    />
                    <UnitSliderControl
                      label="세로 위치 (Y)"
                      value={videoFocusYPct}
                      min={0}
                      max={100}
                      step={1}
                      unit="%"
                      onChange={setVideoFocusYPct}
                    />
                  </div>

                  {/* 비디오 줌 / 크롭 스케일 */}
                  <div className="pt-1 border-t border-border">
                    <UnitSliderControl
                      label="비디오 줌 / 크롭 (Scale)"
                      value={videoZoomScale}
                      min={50}
                      max={300}
                      step={1}
                      unit="%"
                      onChange={setVideoZoomScale}
                    />
                  </div>

                  {/* 회전 & 반전 제어 */}
                  <div className="pt-1 border-t border-border">
                    <UnitSliderControl
                      label="회전 각도 (Rotation)"
                      value={videoRotationDeg}
                      min={-180}
                      max={180}
                      step={1}
                      unit="°"
                      onChange={setVideoRotationDeg}
                    />
                    <div className="grid grid-cols-4 gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => setVideoRotationDeg(r => (r - 90) % 360)}
                        className="py-1 text-[9px] font-semibold border border-border bg-background hover:bg-muted rounded-[2px] cursor-pointer"
                      >
                        ↺ -90°
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoRotationDeg(r => (r + 90) % 360)}
                        className="py-1 text-[9px] font-semibold border border-border bg-background hover:bg-muted rounded-[2px] cursor-pointer"
                      >
                        ↻ +90°
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoHorizontalFlip(f => !f)}
                        className={cn(
                          "py-1 text-[9px] font-semibold border rounded-[2px] cursor-pointer transition",
                          videoHorizontalFlip ? "bg-primary text-primary-foreground border-primary font-bold" : "border-border bg-background hover:bg-muted"
                        )}
                      >
                        ⇄ 좌우
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoVerticalFlip(f => !f)}
                        className={cn(
                          "py-1 text-[9px] font-semibold border rounded-[2px] cursor-pointer transition",
                          videoVerticalFlip ? "bg-primary text-primary-foreground border-primary font-bold" : "border-border bg-background hover:bg-muted"
                        )}
                      >
                        ⇅ 상하
                      </button>
                    </div>
                  </div>
                </div>

                {/* 🖼️ 비디오 외곽 프레임 디자인 (라운드 & 테두리 & 그림자 & 여백) */}
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Square className="w-3.5 h-3.5 text-sky-500" />
                      비디오 외곽 디자인 (라운드 & 테두리 & 그림자)
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 font-bold">
                      외곽 스타일
                    </Badge>
                  </div>

                  {/* 1. 모서리 둥글기 (Border Radius) */}
                  <div className="p-2 bg-muted/20 border border-border rounded-[2px]">
                    <UnitSliderControl
                      label="모서리 모양 (둥글기)"
                      value={currentBorderRadius}
                      min={0}
                      max={48}
                      step={1}
                      unit="px"
                      onChange={(val) => {
                        setVideoBorderRadius?.(val);
                        if (layoutTemplateMode === 'instagram' && setInstaConfig) {
                          setInstaConfig((prev: any) => ({ ...prev, holeRoundness: val }));
                        }
                      }}
                    />
                  </div>

                  {/* 2. 외곽선 테두리 (Border / Stroke) */}
                  <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-foreground">외곽 테두리 (선)</span>
                      <Switch
                        checked={currentBorderEnabled}
                        onCheckedChange={(chk) => {
                          setVideoBorderEnabled?.(chk);
                          if (layoutTemplateMode === 'instagram' && setInstaConfig) {
                            setInstaConfig((prev: any) => ({ ...prev, holeBorderWidth: chk ? (prev?.holeBorderWidth || 1) : 0 }));
                          }
                        }}
                      />
                    </div>
                    {currentBorderEnabled && (
                      <div className="space-y-2 pt-1.5 border-t border-border/50">
                        <UnitSliderControl
                          label="테두리 두께"
                          value={currentBorderWidth}
                          min={1}
                          max={12}
                          step={1}
                          unit="px"
                          onChange={(val) => {
                            setVideoBorderWidth?.(val);
                            if (layoutTemplateMode === 'instagram' && setInstaConfig) {
                              setInstaConfig((prev: any) => ({ ...prev, holeBorderWidth: val }));
                            }
                          }}
                        />
                        <ColorPicker8Preset
                          label="테두리 색상"
                          value={currentBorderColor}
                          onChange={(val) => {
                            setVideoBorderColor?.(val);
                            if (layoutTemplateMode === 'instagram' && setInstaConfig) {
                              setInstaConfig((prev: any) => ({ ...prev, holeBorderColor: val }));
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* 3. 외곽 입체 그림자 (Box Shadow) */}
                  <div className="space-y-2 p-2 bg-muted/20 border border-border rounded-[2px]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-foreground">외곽 입체 그림자</span>
                      <Switch
                        checked={currentShadowEnabled}
                        onCheckedChange={(chk) => {
                          setVideoShadowEnabled?.(chk);
                          if (layoutTemplateMode === 'instagram' && setInstaConfig) {
                            setInstaConfig((prev: any) => ({ ...prev, holeShadow: chk }));
                          }
                        }}
                      />
                    </div>
                    {currentShadowEnabled && (
                      <div className="space-y-2 pt-1.5 border-t border-border/50">
                        <UnitSliderControl
                          label="그림자 크기 (Blur)"
                          value={currentShadowBlur}
                          min={1}
                          max={30}
                          step={1}
                          unit="px"
                          onChange={(val) => {
                            setVideoShadowBlur?.(val);
                          }}
                        />
                        <ColorPicker8Preset
                          label="그림자 색상"
                          value={currentShadowColor}
                          onChange={(val) => {
                            setVideoShadowColor?.(val);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* 4. 외곽 여백 (Margin / Inset) */}
                  <div className="p-2 bg-muted/20 border border-border rounded-[2px]">
                    <UnitSliderControl
                      label="외곽 프레임 여백"
                      value={videoPaddingPct ?? 0}
                      min={0}
                      max={15}
                      step={0.5}
                      unit="%"
                      onChange={(val) => setVideoPaddingPct?.(val)}
                    />
                  </div>
                </div>
              </div>
  );
};

export default VideoCropInspectorForm;
