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
  Video,
  Copy,
  Check,
  Sliders,
  Film
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn, getMediaUrl } from '@/lib/utils';
import { HighlightCandidate } from '@/types/longToShort';

interface LongToShortCandidateCardProps {
  candidate: HighlightCandidate;
  index: number;
  onToggleSelect: (id: string) => void;
  onPreview: (candidate: HighlightCandidate) => void;
  onExportClip: (candidate: HighlightCandidate) => void;
  onExportCapCut: (candidate: HighlightCandidate) => void;
  onUpdateCandidate?: (updated: HighlightCandidate) => void;
  disabled?: boolean;
}

export const LongToShortCandidateCard: React.FC<LongToShortCandidateCardProps> = ({
  candidate,
  index,
  onToggleSelect,
  onPreview,
  onExportClip,
  onExportCapCut,
  onUpdateCandidate,
  disabled
}) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isTrimming, setIsTrimming] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  // 트리밍 미세 조정
  const adjustTrim = (type: 'start' | 'end', delta: number) => {
    if (!onUpdateCandidate) return;

    let newStart = candidate.start_sec;
    let newEnd = candidate.end_sec;

    if (type === 'start') {
      newStart = Math.max(0, Math.round((newStart + delta) * 10) / 10);
      if (newEnd - newStart < 5.0) {
        newStart = newEnd - 5.0;
      }
    } else {
      newEnd = Math.max(newStart + 5.0, Math.round((newEnd + delta) * 10) / 10);
    }

    const newDur = Math.round((newEnd - newStart) * 10) / 10;
    onUpdateCandidate({
      ...candidate,
      start_sec: newStart,
      end_sec: newEnd,
      duration_sec: newDur
    });
  };

  // 유튜브 SEO 메타데이터 복사
  const handleCopyMeta = () => {
    const tags = '#쇼츠 #하이라이트 #바이럴 #shorts #viral';
    const textToCopy = `${candidate.hook_summary}\n\n${candidate.transcript || ''}\n\n${tags}`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    toast({
      title: '📋 유튜브 SEO 메타 복사 완료',
      description: '제목, 내용 요약, 해시태그가 클립보드에 복사되었습니다.'
    });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const resolvedThumbUrl = candidate.thumbnail_url ? getMediaUrl(candidate.thumbnail_url) : null;

  return (
    <div
      className={cn(
        "p-3.5 rounded-xl border transition space-y-2.5",
        candidate.selected
          ? "bg-primary/5 border-primary/50 shadow-2xs"
          : "bg-card border-border hover:bg-muted/30"
      )}
    >
      {/* 상단: 썸네일 + 헤더 정보 */}
      <div className="flex items-start gap-3">
        {/* 선택 체크박스 */}
        <input
          type="checkbox"
          checked={candidate.selected}
          onChange={() => onToggleSelect(candidate.id)}
          disabled={disabled}
          className="w-4 h-4 rounded accent-primary cursor-pointer mt-1 shrink-0"
        />

        {/* 썸네일 미리보기 영역 */}
        <div
          onClick={() => onPreview(candidate)}
          className="relative w-28 h-18 sm:w-32 sm:h-20 rounded-lg overflow-hidden bg-muted/60 border border-border shrink-0 cursor-pointer group select-none"
        >
          {resolvedThumbUrl && !imgError ? (
            <img
              src={resolvedThumbUrl}
              alt={candidate.hook_summary}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/60 gap-1 bg-muted/40">
              <Film className="w-5 h-5 text-primary/60" />
              <span className="text-[9px] font-mono">구간 {index + 1}</span>
            </div>
          )}

          {/* 호버 시 재생 아이콘 오버레이 */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <div className="w-7 h-7 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-md">
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </div>
          </div>

          {/* 길이 뱃지 */}
          <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/75 text-[9px] font-mono text-white font-bold">
            {candidate.duration_sec}s
          </div>
        </div>

        {/* 메타데이터 본문 헤더 */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <Badge
                variant="outline"
                className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-primary/15 text-primary border-primary/30 shrink-0"
              >
                클립 #{index + 1}
              </Badge>
              <span className="text-xs font-bold text-foreground truncate block" title={candidate.hook_summary}>
                {candidate.hook_summary}
              </span>
            </div>

            {/* VMI 종합 점수 뱃지 */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[10px] shrink-0">
              <Sparkles className="w-3 h-3" />
              <span>VMI {Math.round(candidate.vmi_score * 100)}점</span>
            </div>
          </div>

          {/* 타임코드 */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-primary" />
              구간: <strong className="text-foreground">{formatTime(candidate.start_sec)} ~ {formatTime(candidate.end_sec)}</strong>
            </span>
            <span>·</span>
            <span>길이: <strong className="text-primary">{candidate.duration_sec}초</strong></span>
          </div>

          {/* 4대 세부 지표 & 사유 태그 */}
          <div className="flex items-center justify-between text-[10px] pt-1 flex-wrap gap-1 text-muted-foreground font-mono">
            <div className="flex items-center gap-1.5">
              <span>훅 <strong className="text-foreground">{candidate.hook_score}</strong></span>
              <span>·</span>
              <span>서사 <strong className="text-foreground">{candidate.story_score}</strong></span>
              <span>·</span>
              <span>리듬 <strong className="text-foreground">{candidate.rhythm_score}</strong></span>
              <span>·</span>
              <span>자막 <strong className="text-foreground">{candidate.caption_score}</strong></span>
            </div>
            <span className="text-[9px] text-primary/90 font-medium bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20">
              {candidate.reason}
            </span>
          </div>
        </div>
      </div>

      {/* 미세 트리밍 컨트롤 영역 (펼침/접힘) */}
      {isTrimming && (
        <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold text-foreground text-[11px]">
            <span className="flex items-center gap-1 text-primary">
              <Sliders className="w-3 h-3" />
              구간 인/아웃 미세 트리밍
            </span>
            <span className="font-mono text-muted-foreground">현재 클립 길이: {candidate.duration_sec}초</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            {/* 시작점 조정 */}
            <div className="p-1.5 rounded-md bg-card border border-border space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>시작 시점</span>
                <strong className="text-foreground font-bold">{formatTime(candidate.start_sec)}</strong>
              </div>
              <div className="flex gap-1 justify-center">
                <Button size="sm" variant="outline" onClick={() => adjustTrim('start', -1.0)} className="h-6 px-1.5 text-[9px]">-1초</Button>
                <Button size="sm" variant="outline" onClick={() => adjustTrim('start', -0.5)} className="h-6 px-1.5 text-[9px]">-0.5초</Button>
                <Button size="sm" variant="outline" onClick={() => adjustTrim('start', +0.5)} className="h-6 px-1.5 text-[9px]">+0.5초</Button>
                <Button size="sm" variant="outline" onClick={() => adjustTrim('start', +1.0)} className="h-6 px-1.5 text-[9px]">+1초</Button>
              </div>
            </div>

            {/* 종료점 조정 */}
            <div className="p-1.5 rounded-md bg-card border border-border space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>종료 시점</span>
                <strong className="text-foreground font-bold">{formatTime(candidate.end_sec)}</strong>
              </div>
              <div className="flex gap-1 justify-center">
                <Button size="sm" variant="outline" onClick={() => adjustTrim('end', -1.0)} className="h-6 px-1.5 text-[9px]">-1초</Button>
                <Button size="sm" variant="outline" onClick={() => adjustTrim('end', -0.5)} className="h-6 px-1.5 text-[9px]">-0.5초</Button>
                <Button size="sm" variant="outline" onClick={() => adjustTrim('end', +0.5)} className="h-6 px-1.5 text-[9px]">+0.5초</Button>
                <Button size="sm" variant="outline" onClick={() => adjustTrim('end', +1.0)} className="h-6 px-1.5 text-[9px]">+1초</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 전사 대사/상황 해설 펼치기 */}
      {candidate.transcript && (
        <div className="space-y-1">
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
      <div className="flex items-center justify-between pt-2 border-t border-border/50 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPreview(candidate)}
            className="h-7 px-2.5 text-[10px] font-bold gap-1 cursor-pointer border-border hover:bg-muted"
          >
            <Play className="w-3 h-3 text-primary fill-primary" />
            <span>구간 재생</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsTrimming(!isTrimming)}
            className={cn(
              "h-7 px-2 text-[10px] font-bold gap-1 cursor-pointer",
              isTrimming ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sliders className="w-3 h-3" />
            <span>트리밍</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyMeta}
            className="h-7 px-2 text-[10px] font-bold gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>SEO 복사</span>
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onExportClip(candidate)}
            className="h-7 px-2 text-[10px] font-bold gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Video className="w-3 h-3" />
            <span>MP4 컷</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onExportCapCut(candidate)}
            className="h-7 px-2.5 text-[10px] font-bold gap-1 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer shadow-2xs"
          >
            <Scissors className="w-3 h-3" />
            <span>CapCut 초안</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
