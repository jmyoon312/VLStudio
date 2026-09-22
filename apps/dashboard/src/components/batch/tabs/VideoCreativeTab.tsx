import React, { useState } from 'react';
import {
  Video,
  Upload,
  Sparkles,
  Music,
  Sliders,
  FolderOpen,
  Layers,
  CheckCircle2,
  Clock,
  Zap,
  Film,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface MediaClip {
  id: string;
  name: string;
  durationSec: number;
  tags: string[];
  selected: boolean;
}

interface VideoCreativeTabProps {
  onAddBatchJobs: (jobs: any[]) => void;
}

export const VideoCreativeTab: React.FC<VideoCreativeTabProps> = ({ onAddBatchJobs }) => {
  const { toast } = useToast();

  const [projectTitle, setProjectTitle] = useState<string>('도심 속 힐링 여행 모음집');
  const [selectedMood, setSelectedMood] = useState<string>('lofi');
  const [cutCadenceSec, setCutCadenceSec] = useState<number>(3.0); // 1.5s, 3.0s, 5.0s
  const [autoBgmDucking, setAutoBgmDucking] = useState<boolean>(true);
  const [selectedBgmTrack, setSelectedBgmTrack] = useState<string>('Chill Sunset Beats (Lo-Fi)');

  // 영상 클립 라이브러리 (기본 샘플 및 로컬 클립)
  const [clipLibrary, setClipLibrary] = useState<MediaClip[]>([
    { id: 'clip-1', name: 'city_night_traffic_4k.mp4', durationSec: 12, tags: ['야경', '도심', '스피드'], selected: true },
    { id: 'clip-2', name: 'coffee_brewing_macro.mp4', durationSec: 8, tags: ['카페', '감성', '따뜻함'], selected: true },
    { id: 'clip-3', name: 'sunset_han_river.mp4', durationSec: 15, tags: ['노을', '한강', '여유'], selected: true },
    { id: 'clip-4', name: 'subway_passage_people.mp4', durationSec: 10, tags: ['일상', '지하철', '퇴근'], selected: false },
    { id: 'clip-5', name: 'rainy_window_droplets.mp4', durationSec: 14, tags: ['비', '빗소리', '차분함'], selected: true },
  ]);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const toggleClip = (id: string) => {
    setClipLibrary(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const selectedClips = clipLibrary.filter(c => c.selected);
  const totalDuration = selectedClips.reduce((acc, cur) => acc + cur.durationSec, 0);

  const handleStartAssembler = async () => {
    if (selectedClips.length === 0) {
      toast({ variant: 'destructive', title: '클립을 선택하세요', description: '최소 1개 이상의 영상 클립을 선택해 주세요.' });
      return;
    }

    setIsGenerating(true);
    try {
      const newJob = {
        id: `vid-creative-${Date.now()}`,
        title: `[영상창작] ${projectTitle}`,
        sourceType: 'video',
        archetype: 'classic',
        tabId: 'video-creative',
        createdAt: new Date().toLocaleTimeString(),
        status: 'ready',
        scriptLinesCount: selectedClips.length,
        metadata: {
          selectedMood,
          cutCadenceSec,
          selectedBgmTrack,
          autoBgmDucking,
          clipCount: selectedClips.length,
          totalDuration,
          scenes: selectedClips.map((c, idx) => ({
            order: idx + 1,
            narration: `${c.name} 기반 ${selectedMood} 영상 씬입니다.`,
            hookJabText: `*${c.tags.join(' / ')}*`,
            durationSec: cutCadenceSec
          }))
        }
      };

      onAddBatchJobs([newJob]);
      toast({
        title: '🎬 영상 창작형 쇼츠 조립 완료',
        description: `'${projectTitle}' (${selectedClips.length}개 클립) 프로젝트가 대기열에 등록되었습니다.`
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: '조립 실패', description: e.message || '오류가 발생했습니다.' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 좌측 (4칸): 무드 태그 & 비트 싱크 설정 */}
        <div className="lg:col-span-4 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-primary" />
              영상 무드 & 비트 싱크 엔진
            </span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono">
              BEAT ASSEMBLE
            </Badge>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">프로젝트 제목</label>
            <input
              type="text"
              value={projectTitle}
              onChange={e => setProjectTitle(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-border bg-background font-bold"
            />
          </div>

          {/* 5대 분위기(무드) 태그 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-[11px] font-bold text-foreground block">영상 분위기 (무드)</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'energetic', label: '⚡ 에너제틱 / 힙' },
                { id: 'lofi', label: '☕ 감성 / 로파이' },
                { id: 'epic', label: '🎬 웅장 / 시네마' },
                { id: 'mystery', label: '🔍 미스터리 / 긴장' },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMood(m.id)}
                  className={cn(
                    "p-2 rounded-lg border text-left text-xs transition cursor-pointer font-semibold",
                    selectedMood === m.id
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 컷 전환 비트 호흡 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-[11px] font-bold text-foreground block">컷 전환 호흡 (비트 싱크)</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { sec: 1.5, label: '빠른 템포 (1.5s)' },
                { sec: 3.0, label: '자연스러움 (3.0s)' },
                { sec: 5.0, label: '여유로운 (5.0s)' },
              ].map(c => (
                <button
                  key={c.sec}
                  type="button"
                  onClick={() => setCutCadenceSec(c.sec)}
                  className={cn(
                    "p-2 rounded-lg border text-center text-[11px] transition cursor-pointer font-bold",
                    cutCadenceSec === c.sec
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* BGM 및 덕킹 */}
          <div className="space-y-2 pt-2 border-t border-border text-xs">
            <label className="text-[11px] font-bold text-muted-foreground block">배경 음악 (BGM)</label>
            <select
              value={selectedBgmTrack}
              onChange={e => setSelectedBgmTrack(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-border bg-background"
            >
              <option value="Chill Sunset Beats (Lo-Fi)">Chill Sunset Beats (Lo-Fi)</option>
              <option value="Epic Cinematic Strings">Epic Cinematic Strings</option>
              <option value="Upbeat Urban Hip-Hop">Upbeat Urban Hip-Hop</option>
              <option value="Deep Mystery Ambient">Deep Mystery Ambient</option>
            </select>
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-foreground">자동 오디오 덕킹(Ducking)</span>
              <input
                type="checkbox"
                checked={autoBgmDucking}
                onChange={e => setAutoBgmDucking(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 중앙 및 우측 (8칸): 클립 라이브러리 선택 & 자동 조립 */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">영상 클립 라이브러리 매칭</span>
              </div>
              <span className="text-xs text-muted-foreground">
                선택됨: <strong className="text-primary">{selectedClips.length}</strong>개 클립 ({totalDuration}초 원본)
              </span>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {clipLibrary.map((clip, idx) => (
                <div
                  key={clip.id}
                  onClick={() => toggleClip(clip.id)}
                  className={cn(
                    "p-3 rounded-xl border transition cursor-pointer flex items-center justify-between",
                    clip.selected
                      ? "bg-primary/10 border-primary shadow-2xs"
                      : "bg-muted/20 border-border hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={clip.selected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded accent-primary cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center gap-2">
                        <span>#{idx + 1}</span>
                        <span>{clip.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {clip.tags.map((t, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] px-1 py-0 bg-muted/40 text-muted-foreground">
                            #{t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-muted-foreground">
                    <div>{clip.durationSec}초</div>
                    <div className="text-[10px] text-primary font-bold">비트 싱크 대상</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              type="button"
              disabled={isGenerating || selectedClips.length === 0}
              onClick={handleStartAssembler}
              className="w-full h-11 text-xs font-black gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>영상 창작형 클립 자동 조립 (대기열 등록)</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
