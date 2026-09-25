import React, { useState, useRef } from 'react';
import {
  Maximize2,
  Crosshair,
  Users,
  MessageSquare,
  Layers,
  Sparkles,
  CheckCircle2,
  Film,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FramingMode } from '@/types/longToShort2';

interface LongToShort2ReframeCanvasProps {
  videoTitle?: string;
  videoPath?: string;
  framingMode: FramingMode;
  smoothingFactor: number;
  commentsEnabled: boolean;
  commentPosition: 'top' | 'bottom';
  targetSpeaker?: string;
}

export const LongToShort2ReframeCanvas: React.FC<LongToShort2ReframeCanvasProps> = ({
  videoTitle = '롱폼 영상 미선택',
  videoPath,
  framingMode,
  smoothingFactor,
  commentsEnabled,
  commentPosition,
  targetSpeaker = '주 화자 (AI 자동 감지)'
}) => {
  const [videoError, setVideoError] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const streamUrl = videoPath ? `/api/stream?path=${encodeURIComponent(videoPath)}` : null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">
              16:9 ➔ 9:16 동적 팬앤스캔 리프레임 프리뷰
            </span>
          </div>
          {videoPath ? (
            <Badge
              variant="outline"
              className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>실시간 동적 추적 가동 중</span>
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] font-mono text-muted-foreground border-border"
            >
              대기 중 (영상 미선택)
            </Badge>
          )}
        </div>

        {/* 인터랙티브 캔버스 뷰포트 (16:9 가로 박스) */}
        <div className="w-full aspect-video bg-neutral-950 rounded-xl relative overflow-hidden border border-border flex items-center justify-center select-none shadow-inner group">
          {/* 1. 실제 비디오 배경 스트림 (영상이 로드되었을 때) */}
          {streamUrl && !videoError ? (
            <video
              ref={videoRef}
              key={streamUrl}
              src={streamUrl}
              autoPlay
              muted={isMuted}
              loop
              playsInline
              onTimeUpdate={() => {
                if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) setDuration(videoRef.current.duration);
              }}
              onError={() => setVideoError(true)}
              className="absolute inset-0 w-full h-full object-cover opacity-75"
            />
          ) : (
            /* 가상 16:9 십자선 가이드 */
            <div className="absolute inset-0 opacity-15 flex items-center justify-center pointer-events-none">
              <div className="w-full h-[1px] bg-white" />
              <div className="h-full w-[1px] bg-white absolute" />
            </div>
          )}

          {/* 중앙 배경 안내 워터마크 (비디오 없을 때 또는 에러 시) */}
          {(!streamUrl || videoError) && (
            <div className="text-center text-white/40 text-xs space-y-1 z-0 pointer-events-none">
              <Users className="w-10 h-10 mx-auto text-primary/60 mb-1" />
              <p className="font-bold text-white/70 max-w-[280px] truncate px-2">{videoTitle}</p>
              <p className="text-[10px] font-mono">1920 x 1080 (16:9 가로 원본 레이어)</p>
            </div>
          )}

          {/* 2. 9:16 이동식 오토 리프레임 포커스 박스 */}
          <div
            className={cn(
              "absolute h-full aspect-[9/16] border-2 border-primary bg-primary/10 shadow-[0_0_30px_rgba(var(--primary),0.4)] transition-all duration-500 flex flex-col justify-between p-2.5 z-10 pointer-events-none",
              framingMode === 'face-center' && "left-1/2 -translate-x-1/2",
              framingMode === 'sandwich-split' && "left-1/2 -translate-x-1/2 bg-blue-500/10 border-blue-500",
              framingMode === 'blurred-pillarbox' && "left-1/2 -translate-x-1/2 bg-purple-500/10 border-purple-500"
            )}
          >
            {/* 세로 프레임 상단 헤더 배지 */}
            <div className="flex items-center justify-between text-[9px] font-mono font-black text-primary-foreground bg-primary/95 px-1.5 py-0.5 rounded shadow-xs">
              <span>9:16 쇼츠 화각</span>
              <Crosshair className="w-3 h-3 text-red-400 animate-pulse" />
            </div>

            {/* 상단 베스트 댓글 카드 오버레이 미리보기 */}
            {commentsEnabled && commentPosition === 'top' && (
              <div className="p-1.5 rounded-lg bg-black/85 border border-white/20 text-white text-[9px] space-y-0.5 shadow-lg backdrop-blur-xs animate-in fade-in">
                <div className="flex items-center gap-1 text-[8px] text-amber-300 font-bold">
                  <MessageSquare className="w-2.5 h-2.5" />
                  <span>유튜브알고리즘 (베스트 댓글)</span>
                </div>
                <p className="truncate text-white/90">와 진짜 이 부분 다시 봐도 대박이네 ㅋㅋㅋ</p>
              </div>
            )}

            {/* 구도별 내부 가이드 */}
            {framingMode === 'face-center' && (
              <div className="w-13 h-13 border-2 border-emerald-400 rounded-full mx-auto flex flex-col items-center justify-center bg-emerald-500/20 text-[9px] font-bold text-emerald-300 shadow-md animate-pulse">
                <span>주 화자</span>
                <span className="text-[7.5px] opacity-85 font-mono">{smoothingFactor} 스무딩</span>
              </div>
            )}

            {framingMode === 'sandwich-split' && (
              <div className="w-full space-y-2 text-center text-[8px] font-bold">
                <div className="p-1 rounded bg-blue-500/20 border border-blue-400/40 text-blue-200">
                  화자 얼굴 상단 (45%)
                </div>
                <div className="h-[1px] bg-white/40 w-full" />
                <div className="p-1 rounded bg-indigo-500/20 border border-indigo-400/40 text-indigo-200">
                  핵심 자료 화면 하단 (45%)
                </div>
              </div>
            )}

            {framingMode === 'blurred-pillarbox' && (
              <div className="w-full space-y-1 text-center text-[8px] font-bold">
                <div className="p-1 rounded bg-purple-500/20 text-purple-300">상단 블러</div>
                <div className="p-1.5 rounded bg-black/80 text-white border border-white/20">원본 16:9 비율 유지</div>
                <div className="p-1 rounded bg-purple-500/20 text-purple-300">하단 블러</div>
              </div>
            )}

            {/* 하단 베스트 댓글 카드 오버레이 미리보기 */}
            {commentsEnabled && commentPosition === 'bottom' && (
              <div className="p-1.5 rounded-lg bg-black/85 border border-white/20 text-white text-[9px] space-y-0.5 shadow-lg backdrop-blur-xs animate-in fade-in">
                <div className="flex items-center gap-1 text-[8px] text-amber-300 font-bold">
                  <MessageSquare className="w-2.5 h-2.5" />
                  <span>유튜브알고리즘 (베스트 댓글)</span>
                </div>
                <p className="truncate text-white/90">도입부에서 바로 빠져들어서 끝까지 봤다</p>
              </div>
            )}

            {/* 프레임 하단 상태 */}
            <div className="text-[8.5px] text-center font-bold text-white bg-black/80 py-0.5 rounded font-mono">
              {framingMode === 'face-center' && '화자 중심 크롭'}
              {framingMode === 'sandwich-split' && '샌드위치 2단 분할'}
              {framingMode === 'blurred-pillarbox' && '블러 배경 핏'}
            </div>
          </div>

          {/* 비디오 인터랙션 컨트롤 바 (호버 시 표시) */}
          {streamUrl && !videoError && (
            <div className="absolute bottom-2 left-2 right-2 z-20 flex items-center justify-between px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="hover:text-primary transition cursor-pointer p-0.5"
                  title={isPlaying ? "일시정지" : "재생"}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="hover:text-primary transition cursor-pointer p-0.5"
                  title={isMuted ? "음소거 해제" : "음소거"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="font-mono text-[10px] text-white/80">
                  {formatSec(currentTime)} / {formatSec(duration)}
                </span>
              </div>
              <Badge variant="outline" className="text-[9px] font-mono border-white/20 text-white/80">
                1080p 60fps
              </Badge>
            </div>
          )}
        </div>

        {/* 리프레임 스펙 요약 카드 */}
        <div className="p-3 rounded-xl bg-muted/20 border border-border text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">타겟 추적 대상:</span>
            <span className="font-bold text-primary flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {targetSpeaker}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">해상도 규격:</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              1920x1080 ➔ 1080x1920 (9:16 Full HD)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">댓글 오버레이:</span>
            <span className="font-bold text-foreground">
              {commentsEnabled ? `상단/하단 베스트 댓글 합성 (켬)` : '미적용 (끔)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
