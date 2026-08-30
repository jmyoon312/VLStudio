import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, Pause, RotateCcw, ChevronDown, ChevronUp, 
  Scissors, Undo2, Redo2, ZoomIn, ZoomOut,
  Volume2, Type, Video, Sparkles, Film
} from 'lucide-react';
import { WatermarkConfig } from './WatermarkSettingsDialog';
import { TransitionConfig } from './TransitionSettingsDialog';

export interface SceneItem {
  id: string;
  scene_id: number;
  script: string;
  visual_prompt: string;
  video_prompt?: string;
  media_url?: string;
  media_path?: string;
  audio_url?: string;
  audio_path?: string;
  video_url?: string;
  video_path?: string;
  duration?: number; // 초 단위
  visualStatus?: 'idle' | 'generating' | 'completed' | 'failed';
  audioStatus?: 'idle' | 'generating' | 'completed' | 'failed';
  progress?: number;
}

interface Props {
  scenes: SceneItem[];
  aspectRatio: '9:16' | '16:9';
  watermarkConfig?: WatermarkConfig;
  transitionConfig?: TransitionConfig;
  isOpen: boolean;
  onToggle: () => void;
  onSelectScene?: (index: number) => void;
  onSplitScene?: (index: number, timeOffset: number) => void;
  onBatchFlowImages?: () => void;
  onBatchFlowVideos?: () => void;
  onExportCapcut?: () => void;
  isFlowBatchGenerating?: boolean;
  onGenerateSceneFlow?: (scene: SceneItem) => void;
}

export const CollapsibleTimelinePreview: React.FC<Props> = ({
  scenes,
  aspectRatio,
  watermarkConfig,
  transitionConfig,
  isOpen,
  onToggle,
  onSelectScene,
  onSplitScene,
  onBatchFlowImages,
  onBatchFlowVideos,
  onExportCapcut,
  isFlowBatchGenerating,
  onGenerateSceneFlow
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1.0); // 0.5x ~ 3.0x
  const [kenBurnsEnabled, setKenBurnsEnabled] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineTracksRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // 씬이 없거나 로딩 중일 때도 NLE 레이아웃이 100% 정상 작동하도록 안정된 씬 목록 구성
  const effectiveScenes: SceneItem[] = useMemo(() => {
    if (scenes && scenes.length > 0) {
      return scenes.map((s, i) => ({
        ...s,
        scene_id: s.scene_id || i + 1,
        duration: Number(s.duration) > 0 ? Number(s.duration) : 3.5,
        script: s.script || '',
      }));
    }
    return [{
      id: 'placeholder-1',
      scene_id: 1,
      script: '대본을 입력하고 [씬 분할]을 누르면 미디어/자막/오디오 트랙이 자동 배치됩니다',
      visual_prompt: 'Cinematic scene placeholder',
      duration: 5.0,
      visualStatus: 'idle'
    }];
  }, [scenes]);

  // 씬별 재생 시간 및 총 길이 계산
  const sceneDurations = useMemo(() => effectiveScenes.map((s) => s.duration || 3.5), [effectiveScenes]);
  const totalDuration = useMemo(() => {
    const sum = sceneDurations.reduce((acc, d) => acc + d, 0);
    return sum > 0 ? sum : 5.0;
  }, [sceneDurations]);

  // 각 씬의 누적 시작 시간 배열
  const sceneStartTimes = useMemo(() => {
    const starts: number[] = [];
    let acc = 0;
    for (let i = 0; i < effectiveScenes.length; i++) {
      starts.push(acc);
      acc += sceneDurations[i];
    }
    return starts;
  }, [effectiveScenes, sceneDurations]);

  // 현재 시간에 해당하는 씬 인덱스 찾기
  let currentSceneIdx = 0;
  let currentSceneLocalTime = 0;
  for (let i = 0; i < effectiveScenes.length; i++) {
    const start = sceneStartTimes[i];
    const dur = sceneDurations[i];
    if (currentTime >= start && currentTime < start + dur) {
      currentSceneIdx = i;
      currentSceneLocalTime = currentTime - start;
      break;
    }
  }
  if (currentTime >= totalDuration) {
    currentSceneIdx = Math.max(0, effectiveScenes.length - 1);
  }

  // 재생 루프 (60fps 정밀 타임코드 스케줄러)
  useEffect(() => {
    let lastStamp = performance.now();
    const loop = (now: number) => {
      if (isPlaying) {
        const dt = (now - lastStamp) / 1000;
        setCurrentTime((prev) => {
          const next = prev + dt;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0; // 끝에 도달하면 처음으로 복귀
          }
          return next;
        });
      }
      lastStamp = now;
      animFrameRef.current = requestAnimationFrame(loop);
    };

    if (isPlaying) {
      lastStamp = performance.now();
      animFrameRef.current = requestAnimationFrame(loop);
    } else if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, totalDuration]);

  // 스페이스바 재생/정지 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 캔버스 실시간 렌더링 (대형 모니터 뷰)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // 1. 배경 클리어
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, width, height);

    const activeScene = effectiveScenes[currentSceneIdx];
    const dur = sceneDurations[currentSceneIdx] || 3.5;
    const progress = Math.min(1, Math.max(0, currentSceneLocalTime / dur));

    // 2. 씬 이미지/비디오 렌더링
    if (activeScene?.media_url) {
      const img = new Image();
      img.src = activeScene.media_url;
      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        if (kenBurnsEnabled) {
          const scale = 1.0 + progress * 0.06;
          ctx.translate(width / 2, height / 2);
          ctx.scale(scale, scale);
          ctx.translate(-width / 2, -height / 2);
        }

        const imgRatio = img.naturalWidth / img.naturalHeight;
        const canvasRatio = width / height;
        let dw = width;
        let dh = height;
        let dx = 0;
        let dy = 0;

        if (imgRatio > canvasRatio) {
          dh = height;
          dw = height * imgRatio;
          dx = (width - dw) / 2;
        } else {
          dw = width;
          dh = width / imgRatio;
          dy = (height - dh) / 2;
        }

        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 15px Pretendard, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Scene #${activeScene?.scene_id || currentSceneIdx + 1} 미디어 대기 중`, width / 2, height / 2);
    }

    // 3. 자막 오버레이 렌더링
    if (activeScene?.script) {
      ctx.save();
      ctx.font = 'bold 17px Pretendard, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      
      const subY = height - 40;
      ctx.fillText(activeScene.script, width / 2, subY, width - 40);
      ctx.restore();
    }

    // 4. 워터마크 렌더링 (안전 방어 코드 적용)
    if (watermarkConfig?.enabled) {
      ctx.save();
      ctx.globalAlpha = (watermarkConfig.opacity || 80) / 100;
      const targetW = (width * (watermarkConfig.scale || 15)) / 100;
      const marginX = watermarkConfig.marginX || 20;
      const marginY = watermarkConfig.marginY || 20;
      const pos = watermarkConfig.position || 'top-right';

      let wx = marginX;
      let wy = marginY;
      if (pos.includes('center')) wx = (width - targetW) / 2;
      else if (pos.includes('right')) wx = width - targetW - marginX;

      if (pos.startsWith('mid')) wy = (height - targetW) / 2;
      else if (pos.startsWith('bottom')) wy = height - targetW - marginY;

      if (watermarkConfig.type === 'image' && watermarkConfig.imageUrl) {
        const logoImg = new Image();
        logoImg.src = watermarkConfig.imageUrl;
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
          const targetH = targetW / aspect;
          ctx.drawImage(logoImg, wx, wy, targetW, targetH);
        }
      } else if (watermarkConfig.type === 'text' && watermarkConfig.text) {
        ctx.fillStyle = watermarkConfig.textColor || '#ffffff';
        ctx.font = `bold ${watermarkConfig.fontSize || 14}px Pretendard, sans-serif`;
        ctx.textAlign = pos.includes('right') ? 'right' : pos.includes('center') ? 'center' : 'left';
        if (watermarkConfig.textShadow) {
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 4;
        }
        ctx.fillText(watermarkConfig.text, wx, wy + 20);
      }
      ctx.restore();
    }
  }, [effectiveScenes, currentSceneIdx, currentSceneLocalTime, currentTime, watermarkConfig, kenBurnsEnabled]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m}:${s < 10 ? '0' : ''}${s}.${ms}`;
  };

  const rulerTicks = useMemo(() => {
    const ticksCount = Math.ceil(totalDuration) + 1;
    return Array.from({ length: ticksCount }, (_, i) => i);
  }, [totalDuration]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineTracksRef.current) return;
    const rect = timelineTracksRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = clickRatio * totalDuration;
    setCurrentTime(newTime);
  };

  const pxPerSecond = 90 * zoomLevel;
  const timelineContentWidth = Math.max(900, totalDuration * pxPerSecond);

  return (
    <div className="w-full my-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-primary/20 shadow-lg overflow-hidden transition-all duration-200 select-none">
      
      {/* 1. 상단 어디를 눌러도 접히고 펼쳐지는 인터랙티브 카드 헤더 (Script Workspace 동일) */}
      <div 
        onClick={onToggle}
        className="flex items-center justify-between px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border-b border-border transition-colors text-foreground"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-foreground tracking-tight">
                실시간 멀티트랙 타임라인 & 캔버스 프리뷰 (TIMELINE & REALTIME PREVIEW)
              </h3>
              <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/30 px-2 py-0.5 rounded-full">
                Google Flow NLE
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              총 {scenes.length}개 씬 · 총 재생 시간: {formatTime(totalDuration)} · 헤더 클릭 시 접기/펼치기
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {isOpen ? <><ChevronUp className="w-4 h-4 text-primary" /> 접기</> : <><ChevronDown className="w-4 h-4 text-primary" /> 펼치기</>}
          </Button>
        </div>
      </div>

      {/* 2. 타임라인 본문 (펼쳐졌을 때 렌더링) */}
      {isOpen && (
        <div className="flex flex-col bg-white dark:bg-slate-950">
          
          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between px-5 py-2.5 bg-muted/20 border-b border-border gap-2 text-foreground">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-background rounded-lg p-0.5 border border-border shadow-2xs">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="h-7 px-3 text-xs font-bold text-primary hover:bg-primary/10"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 mr-1.5 fill-primary" /> : <Play className="w-3.5 h-3.5 mr-1.5 fill-primary" />}
                  {isPlaying ? '일시정지' : '재생'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setIsPlaying(false); setCurrentTime(0); }}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="처음으로 되감기"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Timecode Indicator */}
              <div className="px-3 py-1 bg-background border border-border rounded-lg text-xs font-mono font-bold text-foreground tracking-tight shadow-2xs">
                <span className="text-primary">{formatTime(currentTime)}</span>
                <span className="text-muted-foreground mx-1.5">/</span>
                <span>{formatTime(totalDuration)}</span>
              </div>

              {/* Split Tool */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border/60 bg-background"
                title="현재 위치에서 씬 분할"
                onClick={() => onSplitScene?.(currentSceneIdx, currentSceneLocalTime)}
              >
                <Scissors className="w-3.5 h-3.5 text-primary" />
                <span>분할</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom Slider */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 bg-background border border-border rounded-lg shadow-2xs">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}
                >
                  <ZoomOut className="w-3 h-3" />
                </Button>
                <span className="text-[11px] font-mono font-semibold w-8 text-center text-muted-foreground">
                  {zoomLevel.toFixed(1)}x
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => setZoomLevel(z => Math.min(3.0, z + 0.25))}
                >
                  <ZoomIn className="w-3 h-3" />
                </Button>
              </div>

              <div className="w-px h-4 bg-border mx-1 hidden sm:block" />

              {/* Flow AI Batch Actions */}
              {onBatchFlowImages && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isFlowBatchGenerating || scenes.length === 0}
                  onClick={onBatchFlowImages}
                  className="h-7 px-2.5 text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 shadow-2xs"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  <span>Flow 이미지 일괄 생성</span>
                </Button>
              )}

              {onBatchFlowVideos && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isFlowBatchGenerating || scenes.length === 0}
                  onClick={onBatchFlowVideos}
                  className="h-7 px-2.5 text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30 shadow-2xs"
                >
                  <Video className="w-3 h-3 mr-1" />
                  <span>Flow 비디오 일괄 생성</span>
                </Button>
              )}

              {onExportCapcut && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onExportCapcut}
                  className="h-7 px-3 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
                >
                  <span>CapCut 내보내기</span>
                </Button>
              )}
            </div>
          </div>

          {/* 대형 캔버스 모니터 & 멀티트랙 NLE 바디 */}
          <div className="p-5 flex flex-col lg:flex-row gap-5 items-stretch">
            
            {/* 좌측: 대형 프리뷰 캔버스 모니터 (확대 규격 적용) */}
            <div className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-2xl p-4 border border-border shrink-0 shadow-inner">
              <div
                className={`relative overflow-hidden rounded-xl bg-black border border-border flex items-center justify-center shadow-md ${
                  aspectRatio === '9:16' ? 'w-[220px] h-[390px]' : 'w-[420px] h-[236px]'
                }`}
              >
                <canvas
                  ref={canvasRef}
                  width={aspectRatio === '9:16' ? 450 : 800}
                  height={aspectRatio === '9:16' ? 800 : 450}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex items-center justify-between w-full mt-3 px-1 text-xs text-muted-foreground">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={kenBurnsEnabled}
                    onChange={(e) => setKenBurnsEnabled(e.target.checked)}
                    className="rounded border-border text-primary accent-primary"
                  />
                  <span>켄번스 모션</span>
                </label>
                <span className="font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border border-border">
                  Scene #{effectiveScenes[currentSceneIdx]?.scene_id || currentSceneIdx + 1}
                </span>
              </div>
            </div>

            {/* 우측: Flow AI 멀티트랙 타임라인 */}
            <div className="flex-1 flex flex-col min-w-0 bg-background rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="flex flex-1 overflow-x-auto custom-scrollbar relative">
                
                {/* 좌측 고정 트랙 라벨 */}
                <div className="w-[125px] shrink-0 bg-muted/40 border-r border-border z-20 flex flex-col select-none">
                  <div className="h-8 border-b border-border flex items-center px-3 bg-muted/70">
                    <span className="text-[10px] font-bold text-muted-foreground">트랙 (TRACKS)</span>
                  </div>

                  {/* V1 미디어 트랙 */}
                  <div className="h-14 border-b border-border px-3 flex items-center justify-between bg-card">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">V1</span>
                      <span className="text-xs font-bold text-foreground">미디어</span>
                    </div>
                    <Video className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>

                  {/* Aa 자막 트랙 */}
                  <div className="h-11 border-b border-border px-3 flex items-center justify-between bg-card">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">Aa</span>
                      <span className="text-xs font-bold text-foreground">자막</span>
                    </div>
                    <Type className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>

                  {/* A1 보이스 트랙 */}
                  <div className="h-11 border-b border-border px-3 flex items-center justify-between bg-card">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">A1</span>
                      <span className="text-xs font-bold text-foreground">보이스</span>
                    </div>
                    <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>

                {/* 우측 룰러 및 트랙 클립 레인 */}
                <div 
                  ref={timelineTracksRef}
                  onClick={handleTimelineClick}
                  style={{ width: `${timelineContentWidth}px` }}
                  className="relative flex-1 flex flex-col bg-background cursor-pointer"
                >
                  {/* 타임코드 눈금자 */}
                  <div className="h-8 border-b border-border bg-muted/20 flex relative">
                    {rulerTicks.map((sec) => (
                      <div
                        key={sec}
                        style={{ left: `${(sec / totalDuration) * 100}%` }}
                        className="absolute top-0 bottom-0 border-l border-border/80 flex items-start pl-1 pt-1 pointer-events-none"
                      >
                        <span className="text-[9px] font-mono font-semibold text-muted-foreground">
                          {formatTime(sec)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 1. V1 미디어 클립 레인 */}
                  <div className="h-14 border-b border-border/60 p-1 flex gap-1 bg-muted/5 relative">
                    {effectiveScenes.map((scene, idx) => {
                      const dur = sceneDurations[idx];
                      const widthPercent = (dur / totalDuration) * 100;
                      const isActive = idx === currentSceneIdx;

                      return (
                        <div
                          key={scene.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentTime(sceneStartTimes[idx]);
                            onSelectScene?.(idx);
                          }}
                          style={{ width: `${widthPercent}%` }}
                          className={`h-full rounded-lg border flex items-center justify-between px-2.5 cursor-pointer transition-all relative overflow-hidden shrink-0 ${
                            isActive
                              ? 'bg-blue-600 text-white border-blue-500 shadow-md font-bold ring-2 ring-blue-400/50'
                              : 'bg-card border-border hover:border-primary text-foreground'
                          }`}
                        >
                          {scene.media_url && (
                            <img
                              src={scene.media_url}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
                            />
                          )}
                          <span className="text-xs truncate z-10 font-bold">
                            #{scene.scene_id} {scene.script ? scene.script.slice(0, 14) + '...' : ''}
                          </span>
                          <span className={`text-[10px] font-mono z-10 ${isActive ? 'text-blue-100' : 'text-muted-foreground'}`}>
                            {dur}s
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 2. Aa 자막 클립 레인 */}
                  <div className="h-11 border-b border-border/60 p-1 flex gap-1 bg-muted/5 relative">
                    {effectiveScenes.map((scene, idx) => {
                      const dur = sceneDurations[idx];
                      const widthPercent = (dur / totalDuration) * 100;
                      return (
                        <div
                          key={scene.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentTime(sceneStartTimes[idx]);
                          }}
                          style={{ width: `${widthPercent}%` }}
                          className="h-full bg-amber-500/15 border border-amber-400/50 rounded-md flex items-center px-2 shrink-0 overflow-hidden text-amber-950 dark:text-amber-200"
                        >
                          <span className="text-[11px] font-medium truncate font-mono">
                            {scene.script || `자막 #${scene.scene_id}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 3. A1 보이스 오디오 레인 */}
                  <div className="h-11 border-b border-border/60 p-1 flex gap-1 bg-muted/5 relative">
                    {effectiveScenes.map((scene, idx) => {
                      const dur = sceneDurations[idx];
                      const widthPercent = (dur / totalDuration) * 100;
                      return (
                        <div
                          key={scene.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentTime(sceneStartTimes[idx]);
                          }}
                          style={{ width: `${widthPercent}%` }}
                          className="h-full bg-emerald-500/15 border border-emerald-400/50 rounded-md flex items-center px-2 shrink-0 overflow-hidden text-emerald-950 dark:text-emerald-200"
                        >
                          <Volume2 className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-[11px] font-medium truncate font-mono">
                            {scene.script ? `TTS: ${scene.script.slice(0, 14)}...` : '오디오 대기'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 🔴 Pixeling Red Playhead Needle & Line */}
                  <div
                    style={{ left: `${(currentTime / totalDuration) * 100}%` }}
                    className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center -ml-[1px]"
                  >
                    <div className="w-3.5 h-3.5 bg-red-500 rounded-b-sm shadow-md" />
                    <div className="w-[2px] flex-1 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                  </div>
                </div>
              </div>

              {/* 타임라인 하단 상태 바 */}
              <div className="px-4 py-2 bg-muted/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>[스페이스바] 재생/정지 · 타임라인 클릭 시 해당 위치로 즉시 이동</span>
                </span>
                <span className="font-mono text-primary font-bold">
                  Playhead: {formatTime(currentTime)} ({Math.round((currentTime / totalDuration) * 100)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollapsibleTimelinePreview;
