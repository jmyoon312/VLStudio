import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  Scissors,
  Trash2,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface TimelineSubtitle {
  id: string | number;
  text: string;
  startMs: number;
  endMs: number;
}

export interface TimelineJab {
  id: string | number;
  text: string;
  startMs: number;
  endMs: number;
  tiltDeg?: number;
  placement?: string;
  color?: string;
}

export interface TimelineSfx {
  id: string | number;
  name: string;
  startMs: number;
  volume?: number;
}

interface ShortsMultiTrackTimelineProps {
  durationMs: number;
  currentTimeMs: number;
  isPlaying: boolean;
  onSeek: (ms: number) => void;
  videoTitle?: string;

  // Track Items
  subtitles: TimelineSubtitle[];
  jabs: TimelineJab[];
  sfxList: TimelineSfx[];

  // Selected Item
  selectedType: 'video' | 'subtitle' | 'jab' | 'sfx' | null;
  selectedId: string | number | null;
  onSelectItem: (type: 'video' | 'subtitle' | 'jab' | 'sfx' | null, id: string | number | null) => void;

  // Modifications
  onUpdateSubtitle?: (id: string | number, patch: Partial<TimelineSubtitle>) => void;
  onDeleteSubtitle?: (id: string | number) => void;
  onSplitSubtitle?: (id: string | number, splitTimeMs: number) => void;
  onUpdateJab?: (id: string | number, patch: Partial<TimelineJab>) => void;
  onDeleteJab?: (id: string | number) => void;
  onAddJabAtCurrentTime?: () => void;
  onMapAutoSfx?: () => void;
  onRemoveSilence?: () => void;

  // BGM Ducking state
  bgmDuckingActive?: boolean;
}

export const ShortsMultiTrackTimeline: React.FC<ShortsMultiTrackTimelineProps> = ({
  durationMs,
  currentTimeMs,
  isPlaying,
  onSeek,
  videoTitle = '메인 비디오',
  subtitles,
  jabs,
  sfxList,
  selectedType,
  selectedId,
  onSelectItem,
  onUpdateSubtitle,
  onDeleteSubtitle,
  onSplitSubtitle,
  onUpdateJab,
  onDeleteJab,
  onAddJabAtCurrentTime,
  onMapAutoSfx,
  onRemoveSilence,
  bgmDuckingActive = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackContainerRef = useRef<HTMLDivElement>(null);

  // Zoom scale: pixels per second (Default: 45px/s, Range: 18px/s to 120px/s)
  const [pxPerSec, setPxPerSec] = useState<number>(45);

  // Track locks and mutes
  const [lockedTracks, setLockedTracks] = useState<Record<string, boolean>>({});
  const [mutedTracks, setMutedTracks] = useState<Record<string, boolean>>({});

  // Dragging Playhead
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);

  const totalDurationSec = Math.max(durationMs / 1000, 1.0);
  const totalTimelineWidthPx = Math.max(totalDurationSec * pxPerSec, 600);

  // Format time (00:00.0)
  const formatTime = (ms: number) => {
    const s = Math.max(0, ms / 1000);
    const mins = Math.floor(s / 60);
    const secs = (s % 60).toFixed(1);
    return `${String(mins).padStart(2, '0')}:${parseFloat(secs) < 10 ? '0' : ''}${secs}`;
  };

  // Toggle track lock/mute
  const toggleLock = (track: string) => {
    setLockedTracks(prev => ({ ...prev, [track]: !prev[track] }));
  };
  const toggleMute = (track: string) => {
    setMutedTracks(prev => ({ ...prev, [track]: !prev[track] }));
  };

  // Playhead position
  const playheadPosPx = (currentTimeMs / 1000) * pxPerSec;

  // Handle Scrubbing Click & Drag
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackContainerRef.current) return;
    const rect = trackContainerRef.current.getBoundingClientRect();
    const scrollLeft = trackContainerRef.current.scrollLeft;
    const clickX = e.clientX - rect.left + scrollLeft;
    const targetTimeMs = Math.max(0, Math.min(durationMs, (clickX / pxPerSec) * 1000));
    onSeek(targetTimeMs);
    setIsScrubbing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScrubbing || !trackContainerRef.current) return;
      const rect = trackContainerRef.current.getBoundingClientRect();
      const scrollLeft = trackContainerRef.current.scrollLeft;
      const clickX = e.clientX - rect.left + scrollLeft;
      const targetTimeMs = Math.max(0, Math.min(durationMs, (clickX / pxPerSec) * 1000));
      onSeek(targetTimeMs);
    };

    const handleMouseUp = () => {
      if (isScrubbing) setIsScrubbing(false);
    };

    if (isScrubbing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, durationMs, pxPerSec, onSeek]);

  // Keep playhead in view during playback
  useEffect(() => {
    if (isPlaying && trackContainerRef.current) {
      const container = trackContainerRef.current;
      const currentScroll = container.scrollLeft;
      const containerWidth = container.clientWidth;
      if (playheadPosPx > currentScroll + containerWidth - 80) {
        container.scrollLeft = playheadPosPx - 100;
      } else if (playheadPosPx < currentScroll) {
        container.scrollLeft = Math.max(0, playheadPosPx - 40);
      }
    }
  }, [currentTimeMs, isPlaying, playheadPosPx]);

  // Generate Time Ruler Markers
  const timeRulerTicks = useMemo(() => {
    const ticks: { sec: number; isMajor: boolean; label: string }[] = [];
    const stepSec = pxPerSec > 80 ? 1 : pxPerSec > 40 ? 2 : 5;
    const maxSec = Math.ceil(totalDurationSec);

    for (let s = 0; s <= maxSec; s += 1) {
      const isMajor = s % stepSec === 0;
      ticks.push({
        sec: s,
        isMajor,
        label: isMajor ? formatTime(s * 1000) : ''
      });
    }
    return ticks;
  }, [totalDurationSec, pxPerSec]);

  // Split current selected subtitle
  const handleSplitSelected = () => {
    if (selectedType === 'subtitle' && selectedId && onSplitSubtitle) {
      onSplitSubtitle(selectedId, currentTimeMs);
    }
  };

  // Delete current selected item
  const handleDeleteSelected = () => {
    if (selectedType === 'subtitle' && selectedId && onDeleteSubtitle) {
      onDeleteSubtitle(selectedId);
      onSelectItem(null, null);
    } else if (selectedType === 'jab' && selectedId && onDeleteJab) {
      onDeleteJab(selectedId);
      onSelectItem(null, null);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden select-none"
    >
      {/* 1. 타임라인 상단 전문 NLE 액션 툴바 */}
      <div className="flex flex-wrap items-center justify-between p-2.5 px-3.5 bg-muted/40 border-b border-border/60 gap-2">
        {/* 좌측: 편집 툴셋 (Split, Delete, 쨉쨉이 추가, SFX 매핑, 무음 컷팅) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleSplitSelected}
            disabled={selectedType !== 'subtitle'}
            className="h-7 px-2.5 text-xs font-bold gap-1 border-border bg-background hover:bg-muted"
            title="현재 위치에서 분할 (S)"
          >
            <Scissors className="w-3.5 h-3.5 text-indigo-500" />
            <span>분할 (Split)</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDeleteSelected}
            disabled={!selectedId}
            className="h-7 px-2.5 text-xs font-bold gap-1 border-border bg-background hover:bg-muted text-destructive hover:text-destructive"
            title="선택된 클립 삭제 (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>삭제</span>
          </Button>

          <div className="h-4 w-px bg-border/80 mx-1" />

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAddJabAtCurrentTime}
            className="h-7 px-2.5 text-xs font-bold gap-1 border-border bg-background hover:bg-muted text-yellow-600 dark:text-yellow-400"
            title="현재 재생 위치에 쨉쨉이 추가"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>+ 쨉쨉이 추가</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onMapAutoSfx}
            className="h-7 px-2.5 text-xs font-bold gap-1 border-border bg-background hover:bg-muted text-emerald-600 dark:text-emerald-400"
            title="AI 음향 피크 타점에 36종 효과음 1클릭 일괄 매핑"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>💥 SFX 타점 매핑</span>
          </Button>

          {onRemoveSilence && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRemoveSilence}
              className="h-7 px-2.5 text-xs font-bold gap-1 border-border bg-background hover:bg-muted text-muted-foreground"
              title="0.3초 이상 무음 구간 자동 컷팅"
            >
              <span>✂️ 무음 컷팅</span>
            </Button>
          )}
        </div>

        {/* 우측: 타임코드 및 줌 슬라이더 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold bg-background px-2.5 py-1 rounded-lg border border-border/80">
            <span className="text-primary">{formatTime(currentTimeMs)}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{formatTime(durationMs)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPxPerSec(p => Math.max(18, p - 8))}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
              title="축소"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <div className="w-20">
              <Slider
                value={[pxPerSec]}
                min={18}
                max={120}
                step={2}
                onValueChange={([val]) => setPxPerSec(val)}
                className="cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={() => setPxPerSec(p => Math.min(120, p + 8))}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
              title="확대"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (trackContainerRef.current) {
                  const fit = (trackContainerRef.current.clientWidth - 40) / totalDurationSec;
                  setPxPerSec(Math.max(18, Math.min(120, fit)));
                }
              }}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              title="화면에 맞추기"
            >
              Fit
            </button>
          </div>
        </div>
      </div>

      {/* 2. 멀티트랙 뷰: 좌측 트랙 헤더 (고정) + 우측 스크롤 타임라인 */}
      <div className="flex min-h-[220px] max-h-[300px] relative overflow-hidden bg-background">
        {/* A. 좌측 트랙 헤더 라벨 컬럼 (고정 120px) */}
        <div className="w-[120px] shrink-0 border-r border-border bg-card/70 z-20 flex flex-col text-xs font-semibold select-none">
          {/* 눈금자 헤더 자리 */}
          <div className="h-7 border-b border-border bg-muted/60 flex items-center px-2.5 text-[10.5px] font-mono text-muted-foreground">
            트랙 / 레이어
          </div>

          {/* V1 비디오 */}
          <div className="h-10 border-b border-border/60 px-2 flex items-center justify-between hover:bg-muted/30">
            <span className="font-bold text-foreground text-[11px] truncate">V1 비디오</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <button
                type="button"
                onClick={() => toggleLock('v1')}
                className="hover:text-foreground p-0.5 cursor-pointer"
              >
                {lockedTracks['v1'] ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3 opacity-40" />}
              </button>
            </div>
          </div>

          {/* T1 본문 자막 */}
          <div className="h-10 border-b border-border/60 px-2 flex items-center justify-between hover:bg-muted/30">
            <span className="font-bold text-foreground text-[11px] truncate">T1 본문자막</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <button
                type="button"
                onClick={() => toggleLock('t1')}
                className="hover:text-foreground p-0.5 cursor-pointer"
              >
                {lockedTracks['t1'] ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3 opacity-40" />}
              </button>
            </div>
          </div>

          {/* T2 쨉쨉이 훅 */}
          <div className="h-10 border-b border-border/60 px-2 flex items-center justify-between hover:bg-muted/30">
            <span className="font-bold text-foreground text-[11px] truncate text-yellow-600 dark:text-yellow-400">T2 쨉쨉이</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <button
                type="button"
                onClick={() => toggleLock('t2')}
                className="hover:text-foreground p-0.5 cursor-pointer"
              >
                {lockedTracks['t2'] ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3 opacity-40" />}
              </button>
            </div>
          </div>

          {/* A1 음성/BGM */}
          <div className="h-10 border-b border-border/60 px-2 flex items-center justify-between hover:bg-muted/30">
            <span className="font-bold text-foreground text-[11px] truncate">A1 오디오</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <button
                type="button"
                onClick={() => toggleMute('a1')}
                className="hover:text-foreground p-0.5 cursor-pointer"
              >
                {mutedTracks['a1'] ? <VolumeX className="w-3 h-3 text-rose-500" /> : <Volume2 className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* SFX 효과음 */}
          <div className="h-9 px-2 flex items-center justify-between hover:bg-muted/30">
            <span className="font-bold text-foreground text-[11px] truncate text-emerald-600 dark:text-emerald-400">SFX 타점</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-500">
              {sfxList.length}
            </Badge>
          </div>
        </div>

        {/* B. 우측 스크롤 가능한 멀티트랙 스테이지 */}
        <div
          ref={trackContainerRef}
          onMouseDown={handleTimelineMouseDown}
          className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar bg-background/50 cursor-crosshair"
        >
          {/* 타임라인 전체 컨테이너 폭 */}
          <div
            style={{ width: `${totalTimelineWidthPx}px` }}
            className="h-full relative flex flex-col"
          >
            {/* 1. Time Ruler (시간 눈금자) */}
            <div className="h-7 border-b border-border bg-muted/30 relative flex items-center pointer-events-none">
              {timeRulerTicks.map(tick => {
                const tickPosPx = tick.sec * pxPerSec;
                return (
                  <div
                    key={tick.sec}
                    style={{ left: `${tickPosPx}px` }}
                    className="absolute top-0 bottom-0 flex flex-col justify-end"
                  >
                    <div
                      className={cn(
                        "w-px bg-border",
                        tick.isMajor ? "h-3.5 bg-foreground/40" : "h-1.5 bg-border/60"
                      )}
                    />
                    {tick.isMajor && tick.label && (
                      <span className="absolute bottom-1 left-1.5 font-mono text-[9px] text-muted-foreground font-semibold">
                        {tick.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 2. Track 1: V1 메인 비디오 */}
            <div className="h-10 border-b border-border/40 relative flex items-center px-1">
              <div
                style={{
                  left: 0,
                  width: `${Math.min(totalTimelineWidthPx, (durationMs / 1000) * pxPerSec)}px`
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectItem('video', 'main_video');
                }}
                className={cn(
                  "h-7 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-600 dark:text-blue-400 flex items-center px-2.5 text-[10.5px] font-mono font-bold truncate transition-all cursor-pointer shadow-2xs",
                  selectedType === 'video' && "ring-2 ring-blue-500 bg-blue-500/25"
                )}
              >
                🎬 {videoTitle}
              </div>
            </div>

            {/* 3. Track 2: T1 본문 자막 세그먼트 블록들 */}
            <div className="h-10 border-b border-border/40 relative flex items-center">
              {subtitles.map(sub => {
                const leftPx = (sub.startMs / 1000) * pxPerSec;
                const widthPx = Math.max(18, ((sub.endMs - sub.startMs) / 1000) * pxPerSec);
                const isSelected = selectedType === 'subtitle' && selectedId === sub.id;

                return (
                  <div
                    key={sub.id}
                    style={{
                      left: `${leftPx}px`,
                      width: `${widthPx}px`
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectItem('subtitle', sub.id);
                    }}
                    className={cn(
                      "absolute h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 flex items-center px-2 text-[10.5px] font-bold truncate transition-all cursor-pointer shadow-2xs hover:bg-emerald-500/25",
                      isSelected && "ring-2 ring-emerald-500 bg-emerald-500/30 font-black"
                    )}
                    title={`${sub.text} (${formatTime(sub.startMs)} ~ ${formatTime(sub.endMs)})`}
                  >
                    <span className="truncate">{sub.text}</span>
                  </div>
                );
              })}
            </div>

            {/* 4. Track 3: T2 쨉쨉이 훅 (Jab Hook) 뱃지 블록들 */}
            <div className="h-10 border-b border-border/40 relative flex items-center">
              {jabs.map(jab => {
                const leftPx = (jab.startMs / 1000) * pxPerSec;
                const widthPx = Math.max(24, ((jab.endMs - jab.startMs) / 1000) * pxPerSec);
                const isSelected = selectedType === 'jab' && selectedId === jab.id;

                return (
                  <div
                    key={jab.id}
                    style={{
                      left: `${leftPx}px`,
                      width: `${widthPx}px`
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectItem('jab', jab.id);
                    }}
                    className={cn(
                      "absolute h-7 rounded-lg bg-yellow-500/20 border-2 border-yellow-400 text-yellow-700 dark:text-yellow-300 flex items-center px-2 text-[10px] font-black truncate transition-all cursor-pointer shadow-xs hover:bg-yellow-500/30",
                      isSelected && "ring-2 ring-yellow-400 bg-yellow-500/40 scale-[1.02]"
                    )}
                    title={`쨉쨉이: ${jab.text} (틸트: ${jab.tiltDeg || -4}°)`}
                  >
                    <span className="truncate">{jab.text}</span>
                  </div>
                );
              })}
            </div>

            {/* 5. Track 4: A1 음성 + BGM 파형 및 덕킹 시각화 */}
            <div className="h-10 border-b border-border/40 relative flex items-center px-1">
              <div
                style={{
                  left: 0,
                  width: `${Math.min(totalTimelineWidthPx, (durationMs / 1000) * pxPerSec)}px`
                }}
                className="h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-between px-2.5 text-[10px] font-mono text-purple-600 dark:text-purple-300 pointer-events-none"
              >
                <span>🎙️ Whisper 음성 + 🎵 BGM</span>
                {bgmDuckingActive && (
                  <Badge variant="outline" className="text-[9px] border-purple-500/40 text-purple-500 bg-purple-500/10">
                    Ducking -18dB
                  </Badge>
                )}
              </div>
            </div>

            {/* 6. Track 5: SFX 타점 핀 마커들 */}
            <div className="h-9 relative flex items-center">
              {sfxList.map(sfx => {
                const leftPx = (sfx.startMs / 1000) * pxPerSec;
                return (
                  <div
                    key={sfx.id}
                    style={{ left: `${leftPx}px` }}
                    className="absolute flex items-center gap-0.5 bg-emerald-500/20 border border-emerald-500/60 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 rounded-full text-[9px] font-bold shadow-2xs pointer-events-none"
                  >
                    <span>💥</span>
                    <span className="truncate max-w-[60px]">{sfx.name}</span>
                  </div>
                );
              })}
            </div>

            {/* 7. Scrubbable Playhead (재생헤드 바늘) */}
            <div
              style={{
                left: `${playheadPosPx}px`,
                transition: isScrubbing ? 'none' : 'left 0.05s linear'
              }}
              className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center"
            >
              {/* 바늘 머리 */}
              <div className="w-3.5 h-3.5 bg-rose-500 rotate-45 -mt-1.5 rounded-xs shadow-md border border-white" />
              {/* 수직선 */}
              <div className="w-[1.5px] flex-1 bg-rose-500 shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortsMultiTrackTimeline;
