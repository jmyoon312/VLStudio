import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Volume2,
  Trash2,
  Scissors,
  Sparkles,
  Play,
  Check,
  Plus,
  ArrowRight,
  Clock,
  Mic,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { ClipData } from './types';

interface ClipPolishCardListProps {
  clips: ClipData[];
  activeClipId: number;
  onSelectClip: (clipId: number) => void;
  onUpdateClip: (clipId: number, updated: Partial<ClipData>) => void;
  onDeleteClip: (clipId: number) => void;
  onAddClipAfter: (clipId: number) => void;
  onPreviewTTS: (text: string) => void;
  targetLang?: string;
}

const COMMON_JABS = [
  '(동공지진)',
  '(어이탈출)',
  '(극대노)',
  '(킹받네)',
  '(얼음)',
  '(멘붕)',
  '(양심가출)',
  '(실화냐)',
  '(참교육)',
];

export const ClipPolishCardList: React.FC<ClipPolishCardListProps> = ({
  clips,
  activeClipId,
  onSelectClip,
  onUpdateClip,
  onDeleteClip,
  onAddClipAfter,
  onPreviewTTS,
  targetLang = 'ko',
}) => {
  const [editingField, setEditingField] = useState<{ clipId: number; field: string } | null>(null);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m}:${s < 10 ? '0' : ''}${s}.${ms}`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-card text-card-foreground border-l border-border select-none">
      {/* 1. 상단 카드 헤더 */}
      <div className="h-10 px-3.5 bg-muted/30 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">인터랙티브 클립 퇴고 카드</span>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bold">
            {clips.length}개 컷
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground hidden sm:inline">
          클릭하여 대사/나레이션 직접 수정
        </span>
      </div>

      {/* 2. 클립 카드 스크롤 덱 */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3 pb-8">
          {clips.map((clip, idx) => {
            const isActive = clip.clip_id === activeClipId;

            return (
              <div
                key={clip.clip_id}
                onClick={() => onSelectClip(clip.clip_id)}
                className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs ${
                  isActive
                    ? 'bg-primary/5 border-primary ring-2 ring-primary/30 shadow-md scale-[1.005]'
                    : 'bg-background hover:bg-muted/30 border-border'
                }`}
              >
                {/* 카드 헤더: 컷 번호, 타임코드, 길이, 툴 버튼 */}
                <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-mono font-bold text-foreground">
                      {formatTime(clip.source_start)} ~ {formatTime(clip.source_end)}
                    </span>
                    <Badge variant="secondary" className="text-[10px] h-4.5 px-1 font-semibold">
                      {clip.duration.toFixed(1)}초
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* TTS 음성 즉시 미리듣기 */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        const textToRead = clip.narration || clip.speaker_a_dialogue || '';
                        if (textToRead) {
                          onPreviewTTS(textToRead);
                        } else {
                          toast.info('미리 들을 대본이 없습니다.');
                        }
                      }}
                      className="h-7 w-7 text-primary hover:bg-primary/10 rounded-lg"
                      title="나레이션/대사 TTS 목소리 미리듣기"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </Button>

                    {/* 클립 삭제 */}
                    {clips.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`컷 #${idx + 1}을 삭제하시겠습니까?`)) {
                            onDeleteClip(clip.clip_id);
                          }
                        }}
                        className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                        title="컷 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* 카드 본문: 나레이션 대사 (인라인 편집) */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-muted-foreground uppercase flex items-center gap-1">
                      <Mic className="w-3 h-3 text-primary" />
                      📢 나레이션 (해설자 자막 & TTS)
                    </span>
                    <Textarea
                      value={clip.narration || ''}
                      onChange={(e) => onUpdateClip(clip.clip_id, { narration: e.target.value })}
                      placeholder="해설자의 나레이션 대사를 입력하세요..."
                      rows={2}
                      className="text-xs bg-muted/20 border-border rounded-xl resize-none font-sans leading-relaxed focus:bg-background"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* 화자 대사 (A / B) - 선택적 표시 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    <div className="space-y-1">
                      <span className="text-[9.5px] font-bold text-cyan-500 flex items-center gap-1">
                        💬 인물 대사 1 (남주)
                      </span>
                      <Input
                        value={clip.speaker_a_dialogue || ''}
                        onChange={(e) => onUpdateClip(clip.clip_id, { speaker_a_dialogue: e.target.value })}
                        placeholder="화자 A 대사..."
                        className="h-7 text-xs bg-cyan-950/10 border-cyan-500/20 text-foreground rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9.5px] font-bold text-amber-500 flex items-center gap-1">
                        💬 인물 대사 2 (여주/악역)
                      </span>
                      <Input
                        value={clip.speaker_b_dialogue || ''}
                        onChange={(e) => onUpdateClip(clip.clip_id, { speaker_b_dialogue: e.target.value })}
                        placeholder="화자 B 대사..."
                        className="h-7 text-xs bg-amber-950/10 border-amber-500/20 text-foreground rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* 쨉쨉이 드립 스티커 & 추천 SFX 효과음 */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-border/40">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-rose-500 flex items-center gap-0.5">
                        <Sparkles className="w-3 h-3" />
                        쨉쨉이:
                      </span>
                      <Input
                        value={clip.jab_sticker || ''}
                        onChange={(e) => onUpdateClip(clip.clip_id, { jab_sticker: e.target.value })}
                        placeholder="(드립 문구)"
                        className="h-6 w-24 text-[11px] font-bold bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-md px-1.5"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* 추천 효과음 뱃지 */}
                    {clip.sfx_recommend && (
                      <Badge variant="outline" className="text-[9px] h-5 border-fuchsia-500/40 text-fuchsia-500 font-bold">
                        SFX: {clip.sfx_recommend}
                      </Badge>
                    )}
                  </div>

                  {/* 빠른 쨉쨉이 칩 선택 바 */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {COMMON_JABS.slice(0, 5).map((jab) => (
                      <button
                        key={jab}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateClip(clip.clip_id, { jab_sticker: jab });
                        }}
                        className={`text-[9.5px] px-1.5 py-0.5 rounded-md font-bold transition-colors ${
                          clip.jab_sticker === jab
                            ? 'bg-rose-500 text-white'
                            : 'bg-muted hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500'
                        }`}
                      >
                        {jab}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
