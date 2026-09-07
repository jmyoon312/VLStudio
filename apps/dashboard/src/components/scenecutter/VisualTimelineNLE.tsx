import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  ZoomIn,
  ZoomOut,
  Scissors,
  Layers,
  Volume2,
  Sparkles,
  Type,
  Film
} from 'lucide-react';
import { ClipData } from './types';

interface VisualTimelineNLEProps {
  clips: ClipData[];
  activeClipId: number;
  onSelectClip: (clipId: number) => void;
  currentTime: number;
  totalDuration: number;
  onSeek: (time: number) => void;
  onUpdateClipTime: (clipId: number, start: number, end: number) => void;
  topHookTitle?: string;
}

export const VisualTimelineNLE: React.FC<VisualTimelineNLEProps> = ({
  clips,
  activeClipId,
  onSelectClip,
  currentTime,
  totalDuration,
  onSeek,
  onUpdateClipTime,
  topHookTitle,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 1.0 ~ 3.0

  // Calculate safe duration
  const safeTotalDuration = Math.max(
    totalDuration || 60,
    clips.reduce((acc, c) => acc + (c.duration || 3), 0)
  );

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = clickRatio * safeTotalDuration;
    onSeek(targetTime);
  };

  // Playhead percentage position
  const playheadPercent = (currentTime / safeTotalDuration) * 100;

  // Track Definitions (CapCut 11-Track Standard Hierarchy)
  const tracks = [
    { id: 'track_1_hook', name: 'T1: 제목 훅', icon: Type, color: 'bg-amber-500/20 border-amber-500/40 text-amber-300' },
    { id: 'track_2_jab', name: 'T2: 쨉쨉이 드립', icon: Sparkles, color: 'bg-rose-500/20 border-rose-500/40 text-rose-300' },
    { id: 'track_3_narr_sub', name: 'T3: 나레이션 자막', icon: Type, color: 'bg-white/20 border-white/40 text-white' },
    { id: 'track_4_spk_a_sub', name: 'T4: 인물 대사 1', icon: Type, color: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' },
    { id: 'track_5_spk_b_sub', name: 'T5: 인물 대사 2', icon: Type, color: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' },
    { id: 'track_6_video', name: 'T6: 비디오 컷', icon: Film, color: 'bg-primary/25 border-primary/50 text-primary-foreground' },
    { id: 'track_7_narr_tts', name: 'T7: 나레이션 TTS', icon: Volume2, color: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' },
    { id: 'track_8_spk_a_tts', name: 'T8: 인물 더빙 1', icon: Volume2, color: 'bg-teal-500/20 border-teal-500/40 text-teal-300' },
    { id: 'track_9_spk_b_tts', name: 'T9: 인물 더빙 2', icon: Volume2, color: 'bg-orange-500/20 border-orange-500/40 text-orange-300' },
    { id: 'track_10_audio', name: 'T10: 원본 오디오', icon: Volume2, color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' },
    { id: 'track_11_sfx', name: 'T11: SFX 효과음', icon: Sparkles, color: 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300' },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-card text-card-foreground border-t border-border overflow-hidden select-none">
      {/* 타임라인 헤더 컨트롤 바 */}
      <div className="h-8 px-3 bg-muted/40 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span>CAPCUT 11단 멀티 트랙 NLE 타임라인</span>
          <span className="text-[10px] text-muted-foreground/80 font-mono">
            (총 {safeTotalDuration.toFixed(1)}초 / {clips.length}개 컷)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 w-32">
            <ZoomOut className="w-3 h-3 text-muted-foreground" />
            <Slider
              value={[zoomLevel]}
              min={1.0}
              max={3.0}
              step={0.2}
              onValueChange={(val) => setZoomLevel(val[0])}
              className="w-20"
            />
            <ZoomIn className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* 타임라인 본문 (좌측 트랙 헤더 + 우측 트랙 슬롯들) */}
      <div className="flex-1 min-h-0 flex overflow-y-auto no-scrollbar relative">
        {/* 좌측: 트랙 레이어 이름 목록 */}
        <div className="w-32 sm:w-36 bg-muted/30 border-r border-border flex flex-col shrink-0 z-10">
          {tracks.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.id}
                className="h-7 px-2 border-b border-border/50 flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground truncate"
                title={t.name}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="truncate">{t.name}</span>
              </div>
            );
          })}
        </div>

        {/* 우측: 시간 눈금 및 클립 세그먼트 타임라인 트랙 */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          className="flex-1 min-h-0 relative bg-background/50 cursor-pointer overflow-x-auto"
          style={{ width: `${zoomLevel * 100}%` }}
        >
          {/* 붉은색 수직 플레이헤드 (Playhead) */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none shadow-md"
            style={{ left: `${Math.min(100, Math.max(0, playheadPercent))}%` }}
          >
            <div className="w-3 h-3 bg-rose-500 transform -translate-x-1/2 rotate-45 -top-1.5 absolute rounded-xs" />
          </div>

          {/* 11개 트랙 레인 렌더링 */}
          <div className="flex flex-col w-full">
            {tracks.map((t) => {
              return (
                <div
                  key={t.id}
                  className="h-7 border-b border-border/40 relative flex items-center overflow-hidden bg-muted/5 hover:bg-muted/10 transition-colors"
                >
                  {/* 각 트랙별 클립 세그먼트 배치 */}
                  {renderTrackSegments(t.id, t.color)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // 트랙별 세그먼트 렌더러
  function renderTrackSegments(trackId: string, trackColor: string) {
    let accumulatedTime = 0;

    return clips.map((clip) => {
      const clipDur = clip.duration || 3.0;
      const leftPercent = (accumulatedTime / safeTotalDuration) * 100;
      const widthPercent = (clipDur / safeTotalDuration) * 100;
      accumulatedTime += clipDur;

      const isActive = clip.clip_id === activeClipId;

      // 트랙별 내용 필터링
      let label = '';
      if (trackId === 'track_1_hook') label = topHookTitle || '상단 훅';
      else if (trackId === 'track_2_jab') label = clip.jab_sticker || '';
      else if (trackId === 'track_3_narr_sub') label = clip.narration || '';
      else if (trackId === 'track_4_spk_a_sub') label = clip.speaker_a_dialogue || '';
      else if (trackId === 'track_5_spk_b_sub') label = clip.speaker_b_dialogue || '';
      else if (trackId === 'track_6_video') label = `Cut #${clip.clip_id} (${clipDur.toFixed(1)}s)`;
      else if (trackId === 'track_7_narr_tts') label = clip.narration ? 'TTS 음성' : '';
      else if (trackId === 'track_8_spk_a_tts') label = clip.speaker_a_dialogue ? '남주 더빙' : '';
      else if (trackId === 'track_9_spk_b_tts') label = clip.speaker_b_dialogue ? '여주 더빙' : '';
      else if (trackId === 'track_10_audio') label = '원음';
      else if (trackId === 'track_11_sfx') label = clip.sfx_recommend || '';

      if (!label && trackId !== 'track_6_video') return null;

      return (
        <div
          key={`${trackId}_${clip.clip_id}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectClip(clip.clip_id);
            onSeek(clip.source_start);
          }}
          className={`absolute h-5 rounded-md px-1.5 text-[9.5px] font-bold truncate flex items-center border transition-all cursor-pointer ${trackColor} ${
            isActive
              ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-[1.01] z-20 shadow-sm'
              : 'hover:brightness-110 opacity-90'
          }`}
          style={{
            left: `${leftPercent}%`,
            width: `${Math.max(1.5, widthPercent)}%`,
          }}
          title={`클립 ${clip.clip_id}: ${label}`}
        >
          <span className="truncate">{label}</span>
        </div>
      );
    });
  }
};
