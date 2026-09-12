import React, { useState, useRef, useEffect } from 'react';
import {
  Music,
  Play,
  Pause,
  Plus,
  Trash2,
  Volume2,
  Check,
  X,
  Upload,
  Sparkles,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BgmMood } from '@/pages/ShortsEditorStudio';

export interface BgmTrackItem {
  id: string;
  title: string;
  mood: BgmMood;
  durationSec: number;
  url?: string;
  isBuiltin?: boolean;
  bpm?: number;
}

const BUILTIN_BGM_TRACKS: BgmTrackItem[] = [
  // 도파민 / 텐션업
  { id: 'bgm_energetic_1', title: 'Cyber Dopamine Rush', mood: 'energetic', durationSec: 32, bpm: 128, isBuiltin: true },
  { id: 'bgm_energetic_2', title: 'Future Bass Pop Beat', mood: 'energetic', durationSec: 28, bpm: 135, isBuiltin: true },
  { id: 'bgm_energetic_3', title: 'Hyper Neon Synth', mood: 'energetic', durationSec: 35, bpm: 140, isBuiltin: true },
  // 감성 / 힐링 / 잔잔
  { id: 'bgm_emotional_1', title: 'Midnight Lo-Fi Rain', mood: 'emotional', durationSec: 45, bpm: 82, isBuiltin: true },
  { id: 'bgm_emotional_2', title: 'Warm Sunset Piano Memory', mood: 'emotional', durationSec: 40, bpm: 76, isBuiltin: true },
  { id: 'bgm_emotional_3', title: 'Acoustic Coffee Break', mood: 'emotional', durationSec: 38, bpm: 85, isBuiltin: true },
  // 긴장감 / 미스터리 / 사건사고
  { id: 'bgm_suspense_1', title: 'Dark Crime Investigation', mood: 'suspense', durationSec: 30, bpm: 110, isBuiltin: true },
  { id: 'bgm_suspense_2', title: '808 Phonk Drift Drive', mood: 'suspense', durationSec: 25, bpm: 145, isBuiltin: true },
  { id: 'bgm_suspense_3', title: 'Deep Shadow Mystery', mood: 'suspense', durationSec: 36, bpm: 95, isBuiltin: true },
  // 코믹 / 밈 / 썰
  { id: 'bgm_funny_1', title: 'Quirky Cartoon Whistle', mood: 'funny', durationSec: 22, bpm: 120, isBuiltin: true },
  { id: 'bgm_funny_2', title: 'Pepe Funny Story Time', mood: 'funny', durationSec: 26, bpm: 115, isBuiltin: true },
  { id: 'bgm_funny_3', title: 'Pizzicato Comedy Walk', mood: 'funny', durationSec: 24, bpm: 105, isBuiltin: true },
  // 웅장 / 시네마틱 / 동기부여
  { id: 'bgm_cinematic_1', title: 'Epic Orchestral Legend', mood: 'cinematic', durationSec: 42, bpm: 90, isBuiltin: true },
  { id: 'bgm_cinematic_2', title: 'Heroic Cinematic Build-up', mood: 'cinematic', durationSec: 38, bpm: 100, isBuiltin: true },
  { id: 'bgm_cinematic_3', title: 'Victory Mountain Peak', mood: 'cinematic', durationSec: 35, bpm: 92, isBuiltin: true },
];

const MOOD_TABS: { id: 'all' | BgmMood; label: string; emoji: string }[] = [
  { id: 'all', label: '전체 보기', emoji: '🌐' },
  { id: 'energetic', label: '도파민/비트', emoji: '⚡' },
  { id: 'emotional', label: '감성/힐링', emoji: '🎹' },
  { id: 'suspense', label: '긴장감/스릴', emoji: '🔥' },
  { id: 'funny', label: '코믹/밈', emoji: '🤣' },
  { id: 'cinematic', label: '웅장/시네마', emoji: '🎬' },
];

interface BgmLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBgmId?: string;
  onSelectBgm: (track: BgmTrackItem) => void;
}

export const BgmLibraryModal: React.FC<BgmLibraryModalProps> = ({
  open,
  onOpenChange,
  selectedBgmId,
  onSelectBgm,
}) => {
  const [tracks, setTracks] = useState<BgmTrackItem[]>(() => {
    const saved = localStorage.getItem('vl_custom_bgm_tracks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return [...BUILTIN_BGM_TRACKS, ...parsed];
      } catch (e) {}
    }
    return BUILTIN_BGM_TRACKS;
  });

  const [activeMood, setActiveMood] = useState<'all' | BgmMood>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  // 신규 등록 폼 상태
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMood, setNewMood] = useState<BgmMood>('energetic');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (!open) return null;

  const filteredTracks = tracks.filter((t) => {
    const matchesMood = activeMood === 'all' || t.mood === activeMood;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMood && matchesSearch;
  });

  const handleTogglePlay = (track: BgmTrackItem) => {
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

    // 재생 가능한 URL이 있으면 재생, 없으면 시뮬레이션
    if (track.url) {
      const audio = new Audio(track.url);
      audio.onended = () => setPlayingTrackId(null);
      audio.play().catch(() => {});
      audioRef.current = audio;
    }
    setPlayingTrackId(track.id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const newTrack: BgmTrackItem = {
      id: `custom_${Date.now()}`,
      title: newTitle.trim() || file.name.replace(/\.[^/.]+$/, ''),
      mood: newMood,
      durationSec: 30,
      url: objectUrl,
      isBuiltin: false,
    };

    const updated = [...tracks, newTrack];
    setTracks(updated);
    const customOnly = updated.filter((t) => !t.isBuiltin);
    localStorage.setItem('vl_custom_bgm_tracks', JSON.stringify(customOnly));

    setIsAddingNew(false);
    setNewTitle('');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = tracks.filter((t) => t.id !== id);
    setTracks(updated);
    const customOnly = updated.filter((t) => !t.isBuiltin);
    localStorage.setItem('vl_custom_bgm_tracks', JSON.stringify(customOnly));
    if (playingTrackId === id) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingTrackId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in-0 duration-200">
      <div className="bg-card text-card-foreground border border-border/80 w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* 모달 헤더 */}
        <div className="p-4 border-b border-border/80 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary/15 text-primary flex items-center justify-center font-bold">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">5대 무드 쇼츠 BGM 라이브러리</h2>
              <p className="text-xs text-muted-foreground">대본 분위기에 최적화된 인기 쇼츠 BGM 전곡 관리 및 원클릭 적용</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-7 h-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 무드 탭 및 검색 바 */}
        <div className="p-3 border-b border-border/60 bg-background/50 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 flex-1">
              {MOOD_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMood(tab.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                    activeMood === tab.id
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{tab.emoji}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant={isAddingNew ? 'secondary' : 'outline'}
              className="text-xs h-7 gap-1 shrink-0"
              onClick={() => setIsAddingNew(!isAddingNew)}
            >
              <Plus className="w-3.5 h-3.5" />
              BGM 등록
            </Button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="음원 이름 검색..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/30 border border-border/80 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* 신규 BGM 등록 패널 */}
        {isAddingNew && (
          <div className="p-3 border-b border-primary/20 bg-primary/5 space-y-2.5">
            <span className="text-xs font-bold text-primary flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              새로운 쇼츠 BGM 등록
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="음원 제목 입력 (예: 도파민 비트 01)"
                className="px-2.5 py-1.5 text-xs bg-background border border-border rounded-md"
              />
              <select
                value={newMood}
                onChange={(e) => setNewMood(e.target.value as BgmMood)}
                className="px-2 py-1.5 text-xs bg-background border border-border rounded-md cursor-pointer"
              >
                <option value="energetic">⚡ 도파민 / 텐션업</option>
                <option value="emotional">🎹 감성 / 힐링</option>
                <option value="suspense">🔥 긴장감 / 스릴러</option>
                <option value="funny">🤣 코믹 / 밈 / 썰</option>
                <option value="cinematic">🎬 웅장 / 시네마틱</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 gap-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                오디오 파일 선택 (.mp3, .wav)
              </Button>
              <span className="text-[11px] text-muted-foreground">선택 즉시 브라우저 로컬 저장소에 안전 보관됩니다.</span>
            </div>
          </div>
        )}

        {/* 음원 목록 리스트 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {filteredTracks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs">
              해당 무드의 BGM이 없습니다. BGM을 추가해보세요.
            </div>
          ) : (
            filteredTracks.map((track) => {
              const isSelected = selectedBgmId === track.id;
              const isPlaying = playingTrackId === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => onSelectBgm(track)}
                  className={`p-2.5 rounded-lg border transition flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-xs'
                      : 'bg-card hover:bg-muted/50 border-border/70'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePlay(track);
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition shrink-0 ${
                        isPlaying
                          ? 'bg-primary text-primary-foreground shadow-sm animate-pulse'
                          : 'bg-muted hover:bg-primary/20 text-foreground'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs truncate leading-tight">{track.title}</span>
                        {isSelected && (
                          <span className="bg-primary text-primary-foreground text-[9px] font-black px-1.5 py-0.2 rounded-2xs flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" />
                            적용 중
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span className="capitalize text-primary/80 font-medium">
                          {track.mood === 'energetic' && '⚡ 도파민'}
                          {track.mood === 'emotional' && '🎹 감성'}
                          {track.mood === 'suspense' && '🔥 긴장감'}
                          {track.mood === 'funny' && '🤣 코믹'}
                          {track.mood === 'cinematic' && '🎬 웅장'}
                        </span>
                        <span>•</span>
                        <span>{track.durationSec}초</span>
                        {track.bpm && (
                          <>
                            <span>•</span>
                            <span>{track.bpm} BPM</span>
                          </>
                        )}
                        {track.isBuiltin && (
                          <>
                            <span>•</span>
                            <span className="text-[9px] bg-muted px-1 rounded-2xs">내장</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant={isSelected ? 'default' : 'outline'}
                      className="h-7 text-xs px-2.5 font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBgm(track);
                        onOpenChange(false);
                      }}
                    >
                      {isSelected ? '선택됨' : '프로젝트 적용'}
                    </Button>
                    {!track.isBuiltin && (
                      <button
                        onClick={(e) => handleDelete(track.id, e)}
                        className="w-7 h-7 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="p-3 border-t border-border/80 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>총 {tracks.length}곡 라이브러리 보유</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
};
