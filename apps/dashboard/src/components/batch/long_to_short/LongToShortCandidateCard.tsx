import React, { useState } from 'react';
import {
  Clock,
  Play,
  Scissors,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  Share2,
  Video
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HighlightCandidate } from '@/types/longToShort';

interface LongToShortCandidateCardProps {
  candidate: HighlightCandidate;
  index: number;
  onToggleSelect: (id: string) => void;
  onPreview: (candidate: HighlightCandidate) => void;
  onExportClip: (candidate: HighlightCandidate) => void;
  onExportCapCut: (candidate: HighlightCandidate) => void;
  disabled?: boolean;
}

export const LongToShortCandidateCard: React.FC<LongToShortCandidateCardProps> = ({
  candidate,
  index,
  onToggleSelect,
  onPreview,
  onExportClip,
  onExportCapCut,
  disabled
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={cn(
        "p-3.5 rounded-xl border transition space-y-2.5",
        candidate.selected
          ? "bg-primary/5 border-primary shadow-2xs"
          : "bg-card border-border hover:bg-muted/30"
      )}
    >
      {/* 상단 헤더: 체크박스 + 클립 번호 + 타이틀 + 타임코드 */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <input
            type="checkbox"
            checked={candidate.selected}
            onChange={() => onToggleSelect(candidate.id)}
            disabled={disabled}
            className="w-4 h-4 rounded accent-primary cursor-pointer mt-1 shrink-0"
          />

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant="outline"
                className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-primary/15 text-primary border-primary/30 shrink-0"
              >
                클립 #{index + 1}
              </Badge>
              <span className="text-xs font-bold text-foreground truncate block">
                {candidate.hook_summary}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-primary" />
              구간: <strong className="text-foreground">{formatTime(candidate.start_sec)} ~ {formatTime(candidate.end_sec)}</strong> ({candidate.duration_sec}초)
            </span>
          </div>
        </div>

        {/* VMI 종합 점수 뱃지 */}
        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[11px]">
            <Sparkles className="w-3 h-3" />
            <span>VMI {Math.round(candidate.vmi_score * 100)}점</span>
          </div>
        </div>
      </div>

      {/* 중앙: 4대 프로 점수 바 및 감지 사유 */}
      <div className="flex items-center justify-between text-[10px] pl-6 border-t border-border/40 pt-2 flex-wrap gap-2">
        {/* 4대 프로 세부 점수 */}
        <div className="flex items-center gap-2 text-muted-foreground font-mono">
          <span>훅 <strong className="text-foreground">{candidate.hook_score}</strong></span>
          <span>·</span>
          <span>서사 <strong className="text-foreground">{candidate.story_score}</strong></span>
          <span>·</span>
          <span>리듬 <strong className="text-foreground">{candidate.rhythm_score}</strong></span>
          <span>·</span>
          <span>자막 <strong className="text-foreground">{candidate.caption_score}</strong></span>
        </div>

        {/* 감지 사유 태그 */}
        <span className="text-[10px] text-primary/80 font-medium bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
          {candidate.reason}
        </span>
      </div>

      {/* 전사 대사/상황 해설 펼치기/접기 */}
      {candidate.transcript && (
        <div className="pl-6 space-y-1">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition cursor-pointer font-bold"
          >
            <FileText className="w-3 h-3 text-primary" />
            <span>전사 대본 {isExpanded ? '접기' : '미리보기'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {isExpanded && (
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-[11px] text-foreground font-sans leading-relaxed whitespace-pre-wrap">
              {candidate.transcript}
            </div>
          )}
        </div>
      )}

      {/* 하단 액션 버튼 바 */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40 pl-6">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPreview(candidate)}
          className="h-7 text-[10px] font-bold gap-1 cursor-pointer border-border hover:bg-muted"
        >
          <Play className="w-3 h-3 text-primary fill-primary" />
          <span>구간 재생</span>
        </Button>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onExportClip(candidate)}
            className="h-7 px-2 text-[10px] font-bold gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Video className="w-3 h-3" />
            <span>MP4 클립</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onExportCapCut(candidate)}
            className="h-7 px-2 text-[10px] font-bold gap-1 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
          >
            <Scissors className="w-3 h-3" />
            <span>CapCut 초안</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
