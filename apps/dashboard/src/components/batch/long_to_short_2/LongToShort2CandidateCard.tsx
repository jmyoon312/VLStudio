import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  Download,
  Share2,
  CheckCircle2,
  Layers,
  Clock,
  MessageSquare,
  Maximize2,
  Film,
  Flame,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { StoryCompressedCandidate, STORY_SEGMENT_ROLES } from '@/types/longToShort2';

interface LongToShort2CandidateCardProps {
  candidate: StoryCompressedCandidate;
  onToggleSelect: (id: string) => void;
  onPreview: (candidate: StoryCompressedCandidate) => void;
  onExportCapCut: (candidate: StoryCompressedCandidate) => void;
  onExportClip: (candidate: StoryCompressedCandidate) => void;
  onToggleCommentInCapCut?: (id: string) => void;
  onUpdateCommentOverride?: (id: string, override: { author: string; text: string }) => void;
  isExporting?: boolean;
}

export const LongToShort2CandidateCard: React.FC<LongToShort2CandidateCardProps> = ({
  candidate,
  onToggleSelect,
  onPreview,
  onExportCapCut,
  onExportClip,
  onToggleCommentInCapCut,
  onUpdateCommentOverride,
  isExporting
}) => {
  const [activeSegIndex, setActiveSegIndex] = useState<number>(0);
  const [isEditingComment, setIsEditingComment] = useState<boolean>(false);

  const defaultComment = candidate.commentsOverlay?.[0] || { author: '쇼츠매니아', text: '와 이 부분 진짜 대박이네 ㅋㅋㅋ' };
  const currentComment = candidate.customCommentOverride || {
    author: defaultComment.author,
    text: defaultComment.text
  };

  const [editAuthor, setEditAuthor] = useState<string>(currentComment.author);
  const [editText, setEditText] = useState<string>(currentComment.text);

  const handleSaveComment = () => {
    onUpdateCommentOverride?.(candidate.id, {
      author: editAuthor.trim() || '베스트댓글',
      text: editText.trim() || '공감 가는 레전드 장면'
    });
    setIsEditingComment(false);
  };

  return (
    <div className={cn(
      "rounded-xl border transition shadow-xs flex flex-col justify-between overflow-hidden bg-card",
      candidate.selected ? "border-primary/60 shadow-primary/5" : "border-border hover:border-border/80"
    )}>
      <div className="p-4 space-y-3">
        {/* 상단 헤더: 번호, 제목, VMI 점수, 선택 체크박스 */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
              #{candidate.candidateIndex}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-foreground truncate" title={candidate.title}>
                {candidate.title}
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                {candidate.hookSummary}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
              <Flame className="w-3 h-3 mr-0.5 fill-amber-500 text-amber-500" />
              VMI {Math.round(candidate.vmiScore * 100)}점
            </Badge>
            <input
              type="checkbox"
              checked={candidate.selected}
              onChange={() => onToggleSelect(candidate.id)}
              className="w-4 h-4 rounded accent-primary cursor-pointer"
            />
          </div>
        </div>

        {/* 썸네일 & 3단 세그먼트 시각화 */}
        <div className="space-y-2">
          {/* 3단 세그먼트 인터랙티브 타임라인 바 (도입 ➔ 절정 ➔ 마무리) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="font-bold text-muted-foreground flex items-center gap-1">
                <Layers className="w-3 h-3 text-primary" />
                이야기 압축 3단계 세그먼트:
              </span>
              <span className="font-mono font-bold text-foreground">
                총 {candidate.totalDurationLabel}
              </span>
            </div>

            {/* 타임라인 분할 바 */}
            <div className="w-full h-4 bg-muted rounded-full overflow-hidden flex p-0.5 gap-0.5 border border-border/60">
              {candidate.segments.map((seg, idx) => {
                const segRatio = (seg.durationSec / Math.max(candidate.totalDurationSec, 1)) * 100;
                const isActive = activeSegIndex === idx;

                return (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => setActiveSegIndex(idx)}
                    title={`${seg.roleLabel} (${seg.durationSec}초): ${seg.transcript}`}
                    style={{ width: `${segRatio}%` }}
                    className={cn(
                      "h-full rounded-full transition-all cursor-pointer relative group",
                      seg.role === 'hook' && "bg-blue-500 hover:bg-blue-600",
                      seg.role === 'climax' && "bg-purple-500 hover:bg-purple-600",
                      seg.role === 'resolution' && "bg-emerald-500 hover:bg-emerald-600",
                      isActive && "ring-2 ring-white shadow-xs"
                    )}
                  />
                );
              })}
            </div>

            {/* 활성화된 세그먼트 상세 카드 */}
            {candidate.segments[activeSegIndex] && (
              <div className="p-2 rounded-lg bg-muted/30 border border-border text-[11px] space-y-1 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={cn(
                    "text-[9px] px-1.5 py-0 h-4 border-none font-bold",
                    STORY_SEGMENT_ROLES[candidate.segments[activeSegIndex].role]?.badgeColor,
                    STORY_SEGMENT_ROLES[candidate.segments[activeSegIndex].role]?.textColor
                  )}>
                    {candidate.segments[activeSegIndex].roleLabel}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {candidate.segments[activeSegIndex].durationSec}초 ({candidate.segments[activeSegIndex].startSec}s ~ {candidate.segments[activeSegIndex].endSec}s)
                  </span>
                </div>
                <p className="text-foreground text-[10.5px] line-clamp-2 leading-relaxed">
                  "{candidate.segments[activeSegIndex].transcript || '음성 전사 대사 없음'}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 베스트 댓글 오버레이 카드 & 인라인 편집 (픽셀링 commentOverrides & toggleCandidateCommentInCapCut) */}
        <div className="p-2.5 rounded-lg border border-border/80 bg-muted/15 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10.5px] font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={candidate.includeCommentInCapCut}
                onChange={() => onToggleCommentInCapCut?.(candidate.id)}
                className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
              />
              <span className="flex items-center gap-1 text-primary">
                <MessageSquare className="w-3 h-3" />
                CapCut 댓글 오버레이 포함
              </span>
            </label>

            {!isEditingComment && candidate.includeCommentInCapCut && (
              <button
                type="button"
                onClick={() => {
                  setEditAuthor(currentComment.author);
                  setEditText(currentComment.text);
                  setIsEditingComment(true);
                }}
                className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 cursor-pointer"
              >
                <Edit3 className="w-2.5 h-2.5" />
                <span>댓글 문구 수정</span>
              </button>
            )}
          </div>

          {candidate.includeCommentInCapCut && (
            isEditingComment ? (
              <div className="space-y-1.5 pt-1 border-t border-border/60">
                <div className="flex gap-1.5">
                  <Input
                    type="text"
                    value={editAuthor}
                    onChange={e => setEditAuthor(e.target.value)}
                    placeholder="작성자 닉네임"
                    className="h-7 text-[10.5px] w-24 shrink-0"
                  />
                  <Input
                    type="text"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    placeholder="댓글 내용"
                    className="h-7 text-[10.5px] flex-1"
                  />
                </div>
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingComment(false)}
                    className="h-6 px-2 text-[10px]"
                  >
                    <X className="w-3 h-3 mr-0.5" />
                    취소
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveComment}
                    className="h-6 px-2 text-[10px] bg-primary text-primary-foreground"
                  >
                    <Check className="w-3 h-3 mr-0.5" />
                    반영
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground flex items-center justify-between gap-1 pl-5">
                <span className="truncate">
                  💬 <strong className="text-foreground">{currentComment.author}:</strong> "{currentComment.text}"
                </span>
                {candidate.customCommentOverride && (
                  <Badge variant="outline" className="text-[8.5px] px-1 py-0 h-3.5 border-primary/30 text-primary">
                    수정됨
                  </Badge>
                )}
              </div>
            )
          )}
        </div>

        {/* 세부 점수 뱃지 (훅, 서사, 리듬) */}
        <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-center">
          <div className="p-1 rounded bg-muted/40 border border-border/60">
            <span className="text-muted-foreground">훅:</span> <strong className="text-blue-500">{candidate.hookScore}점</strong>
          </div>
          <div className="p-1 rounded bg-muted/40 border border-border/60">
            <span className="text-muted-foreground">서사:</span> <strong className="text-purple-500">{candidate.storyScore}점</strong>
          </div>
          <div className="p-1 rounded bg-muted/40 border border-border/60">
            <span className="text-muted-foreground">리듬:</span> <strong className="text-emerald-500">{candidate.rhythmScore}점</strong>
          </div>
        </div>
      </div>

      {/* 카드 하단 액션 바 */}
      <div className="p-3 border-t border-border bg-muted/10 flex items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onPreview(candidate)}
          className="h-8 text-[11px] font-bold gap-1 cursor-pointer"
        >
          <Play className="w-3 h-3 text-primary" />
          <span>미리보기</span>
        </Button>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isExporting}
            onClick={() => onExportClip(candidate)}
            className="h-8 text-[11px] font-bold gap-1 cursor-pointer"
            title="고화질 단일 MP4 클립으로 내보내기"
          >
            <Download className="w-3 h-3" />
            <span>MP4</span>
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isExporting}
            onClick={() => onExportCapCut(candidate)}
            className="h-8 text-[11px] font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs"
          >
            <Share2 className="w-3 h-3" />
            <span>CapCut 초안</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
