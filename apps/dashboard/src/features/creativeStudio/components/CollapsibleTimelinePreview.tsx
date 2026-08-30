import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, ChevronDown, ChevronUp, Eye, EyeOff, Sparkles, Volume2 } from 'lucide-react';
import { WatermarkConfig } from './WatermarkSettingsDialog';
import { TransitionConfig } from './TransitionSettingsDialog';

export interface SceneItem {
  id: string;
  scene_id: number;
  script: string;
  visual_prompt: string;
  media_url?: string;
  media_path?: string;
  audio_url?: string;
  audio_path?: string;
  video_url?: string;
  video_path?: string;
  duration?: number; // 초 단위 (기본 3초)
}

interface Props {
  scenes: SceneItem[];
  aspectRatio: '9:16' | '16:9';
  watermarkConfig: WatermarkConfig;
  transitionConfig: TransitionConfig;
  isOpen: boolean;
  onToggle: () => void;
}

export const CollapsibleTimelinePreview: React.FC<Props> = ({
  scenes,
  aspectRatio,
  watermarkConfig,
  transitionConfig,
  isOpen,
  onToggle,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [kenBurnsEnabled, setKenBurnsEnabled] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // 씬별 재생 시간 및 시작 시간 계산 (기본 3.5초 per scene)
  const sceneDurations = scenes.map((s) => s.duration || 3.5);
  const totalDuration = sceneDurations.reduce((acc, d) => acc + d, 0) || 1;

  // 현재 시간에 해당하는 씬 인덱스 찾기
  let accumulated = 0;
  let currentSceneIdx = 0;
  let currentSceneLocalTime = 0;
  for (let i = 0; i < scenes.length; i++) {
    const dur = sceneDurations[i];
    if (currentTime >= accumulated && currentTime < accumulated + dur) {
      currentSceneIdx = i;
      currentSceneLocalTime = currentTime - accumulated;
      break;
    }
    accumulated += dur;
  }
  if (currentTime >= totalDuration) {
    currentSceneIdx = Math.max(0, scenes.length - 1);
  }

  // 재생 루프
  useEffect(() => {
    let lastStamp = performance.now();
    const loop = (now: number) => {
      if (isPlaying) {
        const dt = (now - lastStamp) / 1000;
        setCurrentTime((prev) => {
          const next = prev + dt;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
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

  // 캔버스 실시간 렌더링 (이미지 + 켄번스 무빙 + 워터마크 + 자막)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // 1. 배경 클리어
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const activeScene = scenes[currentSceneIdx];
    const dur = sceneDurations[currentSceneIdx] || 3.5;
    const progress = Math.min(1, Math.max(0, currentSceneLocalTime / dur));

    // 2. 씬 이미지/비디오 렌더링
    if (activeScene?.media_url) {
      const img = new Image();
      img.src = activeScene.media_url;
      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        // 켄번스 효과 (부드러운 줌인)
        if (kenBurnsEnabled) {
          const scale = 1.0 + progress * 0.08;
          ctx.translate(width / 2, height / 2);
          ctx.scale(scale, scale);
          ctx.translate(-width / 2, -height / 2);
        }

        // 종횡비 맞춤 중앙 정렬 그리기 (Cover)
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
      // 미디어 없을 때 플레이스홀더
      ctx.fillStyle = '#334155';
      ctx.font = '14px Pretendard, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(activeScene ? `Scene #${activeScene.scene_id} 미디어 대기중` : '씬 정보 없음', width / 2, height / 2);
    }

    // 3. 자막 렌더링 (하단 중앙)
    if (activeScene?.script) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Pretendard, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      const lines = activeScene.script.length > 25 ? [activeScene.script.slice(0, 25), activeScene.script.slice(25, 50)] : [activeScene.script];
      const startY = height - 40 - (lines.length - 1) * 20;
      lines.forEach((line, idx) => {
        ctx.fillText(line, width / 2, startY + idx * 22);
      });
      ctx.restore();
    }

    // 4. 채널 워터마크 / 로고 렌더링
    if (watermarkConfig.enabled) {
      const showWatermark = watermarkConfig.durationMode === 'full' || (watermarkConfig.durationMode === 'intro' && currentTime <= 3.0);
      if (showWatermark) {
        ctx.save();
        ctx.globalAlpha = watermarkConfig.opacity / 100;

        const targetW = width * (watermarkConfig.scale / 100);
        const marginX = watermarkConfig.marginX;
        const marginY = watermarkConfig.marginY;

        // 9방향 좌표 계산
        let wx = marginX;
        let wy = marginY;

        if (watermarkConfig.position.includes('center')) wx = (width - targetW) / 2;
        else if (watermarkConfig.position.includes('right')) wx = width - targetW - marginX;

        if (watermarkConfig.position.startsWith('mid')) wy = (height - targetW) / 2;
        else if (watermarkConfig.position.startsWith('bottom')) wy = height - targetW - marginY;

        if (watermarkConfig.type === 'image' && watermarkConfig.imageUrl) {
          const logoImg = new Image();
          logoImg.src = watermarkConfig.imageUrl;
          if (logoImg.complete && logoImg.naturalWidth > 0) {
            const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
            const targetH = targetW / aspect;

            if (watermarkConfig.badgeMask === 'circle') {
              ctx.beginPath();
              ctx.arc(wx + targetW / 2, wy + targetH / 2, Math.min(targetW, targetH) / 2, 0, Math.PI * 2);
              ctx.clip();
            }
            ctx.drawImage(logoImg, wx, wy, targetW, targetH);
          }
        } else if (watermarkConfig.type === 'text' && watermarkConfig.text) {
          ctx.fillStyle = watermarkConfig.textColor || '#ffffff';
          ctx.font = `bold ${watermarkConfig.fontSize || 14}px Pretendard, sans-serif`;
          ctx.textAlign = watermarkConfig.position.includes('right') ? 'right' : watermarkConfig.position.includes('center') ? 'center' : 'left';
          if (watermarkConfig.textShadow) {
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
          }
          ctx.fillText(watermarkConfig.text, wx, wy + 20);
        }
        ctx.restore();
      }
    }
  }, [scenes, currentSceneIdx, currentSceneLocalTime, currentTime, watermarkConfig, kenBurnsEnabled]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m}:${s < 10 ? '0' : ''}${s}.${ms}`;
  };

  return (
    <div className="w-full my-3 bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl overflow-hidden transition-all duration-300">
      {/* 헤더 토글 바 */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 cursor-pointer hover:bg-slate-800/80 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-base">🎬</span>
          <span className="text-sm font-bold text-slate-100 tracking-wide">
            실시간 타임라인 & 캔버스 프리뷰 (TIMELINE & REALTIME PREVIEW)
          </span>
          <Badge variant="outline" className="text-[11px] bg-blue-950/60 border-blue-800 text-blue-300">
            총 {scenes.length}개 씬 · {formatTime(totalDuration)}
          </Badge>
          {transitionConfig.mode !== 'none' && (
            <Badge variant="outline" className="text-[10px] bg-purple-950/60 border-purple-800 text-purple-300">
              트랜지션: {transitionConfig.mode === 'random' ? '🎲 스마트 랜덤' : '🎯 고정'}
            </Badge>
          )}
          {watermarkConfig.enabled && (
            <Badge variant="outline" className="text-[10px] bg-amber-950/60 border-amber-800 text-amber-300">
              워터마크 활성
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-slate-400 hover:text-white h-7 px-2"
          >
            {isOpen ? <><ChevronUp className="w-4 h-4 mr-1" /> 접기</> : <><ChevronDown className="w-4 h-4 mr-1" /> 펼치기</>}
          </Button>
        </div>
      </div>

      {/* 펼쳐졌을 때 내용 */}
      {isOpen && (
        <div className="p-4 border-t border-slate-800 flex flex-col md:flex-row gap-5 items-stretch bg-slate-950/50">
          {/* 좌측: 캔버스 플레이어 뷰어 */}
          <div className="flex flex-col items-center justify-center bg-slate-950 rounded-xl p-3 border border-slate-800 shrink-0 shadow-inner">
            <div
              className={`relative overflow-hidden rounded-lg bg-black border border-slate-800 flex items-center justify-center ${
                aspectRatio === '9:16' ? 'w-[180px] h-[320px]' : 'w-[320px] h-[180px]'
              }`}
            >
              <canvas
                ref={canvasRef}
                width={aspectRatio === '9:16' ? 360 : 640}
                height={aspectRatio === '9:16' ? 640 : 360}
                className="w-full h-full object-contain"
              />
            </div>

            {/* 플레이어 하단 컨트롤 */}
            <div className="flex items-center gap-3 mt-3 w-full justify-between px-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsPlaying((p) => !p)}
                className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                {isPlaying ? '일시정지' : '재생'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTime(0);
                }}
                className="h-8 px-2 text-xs text-slate-400 hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>

              <span className="text-xs font-mono text-slate-300 font-medium">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>

              <label className="text-[11px] text-slate-400 flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={kenBurnsEnabled}
                  onChange={(e) => setKenBurnsEnabled(e.target.checked)}
                />
                켄번스
              </label>
            </div>
          </div>

          {/* 우측: 멀티트랙 타임라인 */}
          <div className="flex-1 flex flex-col justify-between bg-slate-900/80 rounded-xl p-3.5 border border-slate-800">
            {/* 타임라인 눈금 & 트랙 영역 */}
            <div className="space-y-3">
              {/* 시크 바 (Scrubber) */}
              <div className="relative w-full h-6 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden cursor-pointer">
                <input
                  type="range"
                  min={0}
                  max={totalDuration}
                  step={0.05}
                  value={currentTime}
                  onChange={(e) => setCurrentTime(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {/* 진행률 바 */}
                <div
                  className="h-full bg-blue-600/30 border-r-2 border-blue-400 pointer-events-none transition-all"
                  style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] text-slate-500 font-mono pointer-events-none">
                  <span>0:00.0</span>
                  <span>{formatTime(totalDuration / 2)}</span>
                  <span>{formatTime(totalDuration)}</span>
                </div>
              </div>

              {/* 트랙 1: 🎬 비디오 / 이미지 씬 블록 트랙 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-1">
                  <span>🎬 비디오 / 이미지 트랙</span>
                  <span className="text-[10px] text-blue-400">Scene #{currentSceneIdx + 1} 활성</span>
                </div>
                <div className="w-full h-12 bg-slate-950 rounded-lg border border-slate-800 p-1 flex gap-1 overflow-x-auto">
                  {scenes.map((scene, idx) => {
                    const dur = sceneDurations[idx];
                    const widthPercent = (dur / totalDuration) * 100;
                    const isActive = idx === currentSceneIdx;
                    return (
                      <div
                        key={scene.id}
                        onClick={() => {
                          let t = 0;
                          for (let k = 0; k < idx; k++) t += sceneDurations[k];
                          setCurrentTime(t);
                        }}
                        style={{ width: `${widthPercent}%` }}
                        className={`h-full rounded-md border flex items-center justify-between px-2 cursor-pointer transition relative overflow-hidden shrink-0 min-w-[60px] ${
                          isActive
                            ? 'bg-blue-900/60 border-blue-400 shadow-md'
                            : 'bg-slate-800/80 border-slate-700 hover:bg-slate-750'
                        }`}
                      >
                        {scene.media_url && (
                          <img
                            src={scene.media_url}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                          />
                        )}
                        <span className="text-[10px] font-bold text-slate-200 truncate z-10">
                          #{scene.scene_id}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 z-10">{dur}s</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 트랙 2: 🎙️ 나레이션 & 대사 오디오 트랙 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-1">
                  <span>🎙️ 나레이션 / 보이스 트랙</span>
                  <span className="text-[10px] text-emerald-400">TTS 싱크 정렬</span>
                </div>
                <div className="w-full h-8 bg-slate-950 rounded-lg border border-slate-800 p-1 flex gap-1 overflow-x-auto">
                  {scenes.map((scene, idx) => {
                    const dur = sceneDurations[idx];
                    const widthPercent = (dur / totalDuration) * 100;
                    return (
                      <div
                        key={scene.id}
                        style={{ width: `${widthPercent}%` }}
                        className="h-full bg-emerald-950/60 border border-emerald-800/60 rounded flex items-center px-1.5 min-w-[60px] shrink-0"
                      >
                        <Volume2 className="w-3 h-3 text-emerald-400 mr-1 shrink-0" />
                        <span className="text-[9px] text-emerald-200 truncate font-mono">
                          {scene.script || `대사 #${scene.scene_id}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 타임라인 하단 안내 텍스트 */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/60 mt-3">
              <span>💡 팁: [스페이스바]를 눌러 언제든 재생/일시정지할 수 있습니다.</span>
              <span className="text-slate-400">자석 스냅(Magnet Snap) 활성화됨</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CollapsibleTimelinePreview;
