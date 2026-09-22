import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Music,
  Volume2,
  RefreshCw,
  Play,
  Pause,
  Sliders,
  Sparkles,
  Check,
  Headphones,
  Disc3,
  Flame,
  Zap,
  CheckCircle2
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface OneTakeAudioSectionProps {
  selectedBgmTrack: string | null;
  onBgmTrackSelect: (trackId: string | null) => void;
  bgmVolume: number;
  onBgmVolumeChange: (vol: number) => void;
  autoDuckingEnabled: boolean;
  onAutoDuckingToggle: (enabled: boolean) => void;
  selectedSfxPreset: string;
  onSfxPresetChange: (presetId: string) => void;
}

export const OneTakeAudioSection: React.FC<OneTakeAudioSectionProps> = ({
  selectedBgmTrack,
  onBgmTrackSelect,
  bgmVolume,
  onBgmVolumeChange,
  autoDuckingEnabled,
  onAutoDuckingToggle,
  selectedSfxPreset,
  onSfxPresetChange
}) => {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch categorized BGM & SFX from /api/bgm/list
  const { data: bgmData, isLoading } = useQuery({
    queryKey: ['bgm-catalog'],
    queryFn: async () => {
      const res = await api.get('/bgm/list');
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  // Sync Trending BGM Mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/bgm/sync-trending');
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || '최신 트렌드 BGM 동기화가 완료되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['bgm-catalog'] });
    },
    onError: (err: any) => {
      toast.error('BGM 동기화 실패: ' + (err?.message || '알 수 없는 오류'));
    }
  });

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePreview = (track: any) => {
    if (playingTrackId === track.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingTrackId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const streamUrl = track.stream_url?.startsWith('http')
      ? track.stream_url
      : `${window.location.origin}${track.stream_url || `/api/bgm/stream?filename=${encodeURIComponent(track.filename)}`}`;

    const audio = new Audio(streamUrl);
    audio.volume = bgmVolume;
    audio.onended = () => setPlayingTrackId(null);
    audio.onerror = () => {
      toast.error('음원 스트리밍을 불러올 수 없습니다.');
      setPlayingTrackId(null);
    };
    audio.play().then(() => {
      audioRef.current = audio;
      setPlayingTrackId(track.id);
    }).catch(err => {
      console.warn('Audio play error:', err);
      setPlayingTrackId(null);
    });
  };

  const categories = bgmData?.categories || [
    { id: "lofi", name: "로파이 칠 (Chill Lofi)", emoji: "☕" },
    { id: "suspense", name: "시네마틱 텐션 (Suspense Drone)", emoji: "🎬" },
    { id: "upbeat", name: "업비트 신스 (Upbeat Electronic)", emoji: "⚡" },
    { id: "piano", name: "감성 피아노 (Emotional Piano)", emoji: "🎹" },
    { id: "meme", name: "바이럴 밈 비트 (Viral Meme Beat)", emoji: "🐸" },
  ];

  const allTracks = bgmData?.bgm_tracks || [];
  const filteredTracks = activeCategory === 'all'
    ? allTracks
    : allTracks.filter((t: any) => t.category === activeCategory);

  const sfxPresets = bgmData?.sfx_presets || [];

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-4">
      {/* 상단: BGM 설정 헤더 & 최신 트렌드 동기화 버튼 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">배경음(BGM) & 효과음(SFX) 시퀀서</span>
          <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">
            총 {allTracks.length}곡 라이브러리
          </Badge>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={syncMutation.isPending}
          onClick={() => syncMutation.mutate()}
          className="h-7 text-xs gap-1.5 border-primary/40 hover:bg-primary/10 text-primary cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={cn("w-3 h-3", syncMutation.isPending && "animate-spin")} />
          <span>최신 트렌드 BGM 동기화</span>
        </Button>
      </div>

      {/* 1. 카테고리 필터 탭 */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/30 rounded-xl border border-border/60 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={cn(
            "px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
            activeCategory === 'all'
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-background/60"
          )}
        >
          전체 ({allTracks.length})
        </button>

        {categories.map((cat: any) => {
          const count = allTracks.filter((t: any) => t.category === cat.id).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
              )}
            >
              <span>{cat.emoji}</span>
              <span>{cat.name.split(' ')[0]}</span>
              <span className="text-[10px] opacity-75 font-normal">({count})</span>
            </button>
          );
        })}
      </div>

      {/* 2. BGM 트랙 리스트 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1">
        {/* 음소거 / BGM 없음 옵션 */}
        <div
          onClick={() => onBgmTrackSelect(null)}
          className={cn(
            "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none",
            selectedBgmTrack === null
              ? "border-primary bg-primary/10 shadow-xs"
              : "border-border/80 bg-background/50 hover:bg-muted/30"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Headphones className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="truncate">
              <span className="text-xs font-bold text-foreground block truncate">배경음 없음 (내레이션 전용)</span>
              <span className="text-[10px] text-muted-foreground">BGM 없이 깔끔한 목소리 전달</span>
            </div>
          </div>
          {selectedBgmTrack === null && <Check className="w-4 h-4 text-primary shrink-0" />}
        </div>

        {filteredTracks.map((track: any) => {
          const isSelected = selectedBgmTrack === track.filename;
          const isPlaying = playingTrackId === track.id;

          return (
            <div
              key={track.id}
              onClick={() => onBgmTrackSelect(track.filename)}
              className={cn(
                "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none group",
                isSelected
                  ? "border-primary bg-primary/10 shadow-xs"
                  : "border-border/80 bg-background/50 hover:bg-muted/30 hover:border-border"
              )}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePreview(track);
                  }}
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-transform cursor-pointer",
                    isPlaying
                      ? "bg-primary text-primary-foreground border-primary scale-105"
                      : "bg-muted text-foreground border-border hover:bg-primary/20"
                  )}
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                </button>

                <div className="truncate min-w-0">
                  <span className="text-xs font-bold text-foreground block truncate group-hover:text-primary transition-colors">
                    {track.title}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="truncate">{track.genre}</span>
                    <span>·</span>
                    <span className="capitalize">{track.intensity}</span>
                  </div>
                </div>
              </div>

              {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* 3. 스마트 오디오 믹싱 제어 바 (볼륨 & 오토덕킹 -12dB) */}
      <div className="p-3 bg-muted/20 border border-border/70 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* 볼륨 슬라이더 */}
        <div className="flex items-center gap-3 w-full sm:w-1/2">
          <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">BGM 배경 볼륨</span>
              <span className="font-bold text-foreground">{Math.round(bgmVolume * 100)}%</span>
            </div>
            <Slider
              value={[bgmVolume * 100]}
              min={0}
              max={100}
              step={5}
              onValueChange={([v]) => onBgmVolumeChange(v / 100)}
            />
          </div>
        </div>

        {/* 오토덕킹 토글 */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
          <div className="flex flex-col text-right">
            <span className="text-xs font-bold text-foreground flex items-center gap-1 justify-end">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              <span>스마트 오토 덕킹 (Auto-Ducking)</span>
            </span>
            <span className="text-[10px] text-muted-foreground">내레이션 발화 시 BGM -12dB 자동 감소</span>
          </div>
          <Switch
            checked={autoDuckingEnabled}
            onCheckedChange={onAutoDuckingToggle}
            className="scale-90"
          />
        </div>
      </div>

      {/* 4. 36종 바이럴 SFX 시퀀서 프리셋 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>36종 바이럴 SFX 시퀀서 (핵심 타이밍 자동 싱크)</span>
          </Label>
          <span className="text-[10px] text-muted-foreground">첫 3초 붐 + 쨉쨉이 타격음 자동 결합</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {sfxPresets.slice(0, 8).map((sfx: any) => {
            const isSelected = selectedSfxPreset === sfx.id;
            return (
              <div
                key={sfx.id}
                onClick={() => onSfxPresetChange(sfx.id)}
                className={cn(
                  "p-2 rounded-xl border transition-all cursor-pointer select-none text-left flex items-center justify-between",
                  isSelected
                    ? "border-amber-500 bg-amber-500/10 shadow-xs"
                    : "border-border/80 bg-background/50 hover:bg-muted/30"
                )}
              >
                <div className="truncate min-w-0 mr-1">
                  <span className="text-xs font-bold text-foreground block truncate">{sfx.name}</span>
                  <span className="text-[10px] text-muted-foreground truncate block">{sfx.desc}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OneTakeAudioSection;
