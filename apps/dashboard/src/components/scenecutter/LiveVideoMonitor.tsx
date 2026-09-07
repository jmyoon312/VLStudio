import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Columns2,
  Smartphone,
  Monitor,
  Volume2,
  VolumeX,
  Sparkles
} from 'lucide-react';
import { ClipData } from './types';

interface LiveVideoMonitorProps {
  videoUrl?: string;
  activeClip?: ClipData;
  topHookTitle?: string;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  targetLang?: string;
}

export const LiveVideoMonitor: React.FC<LiveVideoMonitorProps> = ({
  videoUrl,
  activeClip,
  topHookTitle,
  currentTime,
  onTimeUpdate,
  isPlaying,
  onTogglePlay,
  onSeek,
  targetLang = 'ko',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [isDualSplit, setIsDualSplit] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Sync external currentTime with video element
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.3) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Sync isPlaying state
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    onTimeUpdate(cur);

    // If active clip exists, loop within clip bounds
    if (activeClip && activeClip.source_end > activeClip.source_start) {
      if (cur >= activeClip.source_end) {
        videoRef.current.currentTime = activeClip.source_start;
      }
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m}:${s < 10 ? '0' : ''}${s}.${ms}`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950/95 dark:bg-black/95 rounded-2xl border border-border/80 overflow-hidden shadow-xl relative select-none">
      {/* 1. 상단 모니터 툴바 */}
      <div className="h-9 px-3 bg-slate-900/90 dark:bg-slate-900/60 border-b border-border/60 flex items-center justify-between text-xs shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] h-5 border-primary/40 text-primary font-bold">
            LIVE MONITOR
          </Badge>
          <span className="text-[11px] font-mono text-muted-foreground font-semibold">
            {formatTime(currentTime)}
          </span>
          {activeClip && (
            <span className="text-[10px] text-muted-foreground/80 hidden sm:inline">
              (클립 {activeClip.clip_id}: {formatTime(activeClip.source_start)} ~ {formatTime(activeClip.source_end)})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* 듀얼 원본 비교 토글 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDualSplit(!isDualSplit)}
            className={`h-7 px-2 text-[11px] font-bold rounded-lg flex items-center gap-1 ${
              isDualSplit ? 'bg-primary text-primary-foreground' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="좌측 16:9 원본 소스 vs 우측 9:16 쇼츠 완성본 나란히 비교"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">원본 비교 뷰</span>
          </Button>

          {/* 화면비 전환 토글 */}
          <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10">
            <button
              onClick={() => setAspectRatio('9:16')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                aspectRatio === '9:16' ? 'bg-primary text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              9:16
            </button>
            <button
              onClick={() => setAspectRatio('16:9')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                aspectRatio === '16:9' ? 'bg-primary text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3 h-3" />
              16:9
            </button>
          </div>

          {/* 음소거 토글 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* 2. 중앙 비디오 뷰포트 (오버레이 자막 포함) */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-2 relative overflow-hidden bg-slate-950">
        {isDualSplit ? (
          /* 듀얼 스플릿 뷰 (좌: 16:9 원본 / 우: 9:16 쇼츠 + 자막) */
          <div className="w-full h-full grid grid-cols-2 gap-2">
            {/* 좌: 원본 16:9 모니터 */}
            <div className="h-full flex flex-col items-center justify-center border border-white/10 rounded-xl bg-black/50 relative overflow-hidden">
              <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold">
                🎬 16:9 원본 소스
              </span>
              {videoUrl ? (
                <video
                  src={videoUrl}
                  className="max-h-full max-w-full object-contain pointer-events-none"
                  currentTime={currentTime}
                />
              ) : (
                <span className="text-xs text-slate-500">영상을 불러와 주세요</span>
              )}
            </div>

            {/* 우: 9:16 쇼츠 완성본 + 3단 자막 */}
            <div className="h-full flex items-center justify-center border border-primary/30 rounded-xl bg-black/70 relative overflow-hidden">
              <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-primary text-white text-[10px] font-bold">
                📱 9:16 완성본 프리뷰
              </span>
              <div className="relative aspect-[9/16] h-full max-h-full flex items-center justify-center bg-black overflow-hidden shadow-2xl rounded-lg">
                {videoUrl && (
                  <video
                    src={videoUrl}
                    className="w-full h-full object-cover pointer-events-none"
                    currentTime={currentTime}
                  />
                )}
                {/* 3단 자막 오버레이 렌더러 */}
                {renderSubtitlesOverlay()}
              </div>
            </div>
          </div>
        ) : (
          /* 단일 마스터 뷰 (9:16 or 16:9) */
          <div
            className={`relative flex items-center justify-center bg-black overflow-hidden shadow-2xl rounded-xl border border-white/10 transition-all ${
              aspectRatio === '9:16' ? 'aspect-[9/16] h-full max-h-full' : 'aspect-[16/9] w-full max-w-full'
            }`}
          >
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                onTimeUpdate={handleVideoTimeUpdate}
                muted={isMuted}
                playsInline
                className={`w-full h-full pointer-events-none ${aspectRatio === '9:16' ? 'object-cover' : 'object-contain'}`}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-600 gap-2 p-4 text-center">
                <Sparkles className="w-8 h-8 opacity-40 animate-pulse text-primary" />
                <p className="text-xs font-semibold text-slate-400">
                  좌측에서 영상을 인제스트하거나 대기열에서 영상을 로드해 주세요.
                </p>
              </div>
            )}

            {/* 3단 자막 오버레이 렌더러 */}
            {renderSubtitlesOverlay()}
          </div>
        )}
      </div>

      {/* 3. 하단 미니 트랜스포트 재생 컨트롤 바 */}
      <div className="h-10 px-4 bg-slate-900/95 dark:bg-slate-900/80 border-t border-border/60 flex items-center justify-between text-xs shrink-0 z-20">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSeek(Math.max(0, currentTime - 1.0))}
            className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
            title="1초 뒤로 (←)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </Button>

          <Button
            size="icon"
            onClick={onTogglePlay}
            className="h-8 w-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md font-bold"
            title="재생 / 일시정지 (Space)"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSeek(currentTime + 1.0)}
            className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
            title="1초 앞으로 (→)"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <span>타임코드: <b className="text-slate-100">{formatTime(currentTime)}</b></span>
        </div>
      </div>
    </div>
  );

  // 3단 자막 오버레이 렌더러 함수
  function renderSubtitlesOverlay() {
    return (
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
        {/* 1. 상단: 훅 타이틀 배너 */}
        <div className="flex justify-center pt-2">
          {topHookTitle ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-amber-400/40 text-amber-300 font-extrabold text-xs sm:text-sm tracking-tight shadow-xl text-center max-w-[90%] animate-in fade-in zoom-in-95">
              {topHookTitle}
            </div>
          ) : (
            <div className="px-3 py-1 rounded-lg bg-black/40 text-white/50 text-[10px] italic">
              [상단 훅 배너 위치]
            </div>
          )}
        </div>

        {/* 2. 중앙: 만화풍 쨉쨉이 드립 스티커 말풍선 */}
        <div className="flex items-center justify-center py-4">
          {activeClip?.jab_sticker && (
            <div className="px-3 py-1.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-black text-sm sm:text-base tracking-wide shadow-2xl border-2 border-white transform -rotate-3 scale-105 animate-bounce">
              {activeClip.jab_sticker}
            </div>
          )}
        </div>

        {/* 3. 하단: 본문 자막 (나레이션 & 인물 대사 1/2 화자 분리) */}
        <div className="flex flex-col items-center gap-1.5 pb-3">
          {/* 인물 대사 (화자 분리된 경우) */}
          {activeClip?.speaker_a_dialogue && (
            <div className="px-3 py-1 rounded-xl bg-cyan-950/90 border border-cyan-400/50 text-cyan-200 font-bold text-xs sm:text-sm text-center shadow-lg max-w-[92%]">
              <span className="text-[10px] text-cyan-400 font-extrabold mr-1">[남주]</span>
              {activeClip.speaker_a_dialogue}
            </div>
          )}
          {activeClip?.speaker_b_dialogue && (
            <div className="px-3 py-1 rounded-xl bg-amber-950/90 border border-amber-400/50 text-amber-200 font-bold text-xs sm:text-sm text-center shadow-lg max-w-[92%]">
              <span className="text-[10px] text-amber-400 font-extrabold mr-1">[여주]</span>
              {activeClip.speaker_b_dialogue}
            </div>
          )}

          {/* 리뷰어/해설자 나레이션 자막 */}
          {activeClip?.narration && (
            <div className="px-3.5 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/20 text-white font-extrabold text-xs sm:text-sm text-center shadow-2xl max-w-[95%] leading-snug">
              {activeClip.narration}
            </div>
          )}
        </div>
      </div>
    );
  }
};
