import React from 'react';
import {
  Play,
  Film,
  Sparkles,
  Sliders,
  FolderOpen,
  Package,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Layers,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface CandidateCut {
  id: string;
  sourceStartMs: number;
  sourceEndMs: number;
  durationMs: number;
  subjectAnchorX: number;
  subjectAnchorY: number;
  shotScale?: string;
  reason?: string;
}

export interface CandidateDialogue {
  id: string;
  speakerId: string;
  text: string;
  startMs: number;
  endMs: number;
}

export interface CandidateData {
  id: string;
  jobId: string;
  rank: number;
  title: string;
  status: string;
  durationMs: number;
  sourceCuts: CandidateCut[];
  dialogue: CandidateDialogue[];
  narrationPlan: Array<{ order: number; text: string; startMs: number; endMs: number }>;
  editorialComments: string[];
  qualityBreakdown: {
    totalScore: number;
    judge?: { reason?: string };
    framing?: Array<{ cutId: string; focusX: number; focusY: number }>;
  };
  frameSheetUrl?: string;
  savedMp4Path?: string;
}

interface MovieDramaCandidateCardProps {
  candidate: CandidateData;
  isRenderingMp4: boolean;
  onRenderMp4: (candidateId: string) => Promise<void>;
  onOpenFramingModal: (candidate: CandidateData) => void;
  onExportCapcut: (candidateId: string) => Promise<void>;
  isExportingCapcut: boolean;
  onCreatePortablePack: (candidateId: string) => Promise<void>;
  isPacking: boolean;
  onRevealFolder: (path: string) => void;
  completedMp4Path?: string | null;
  capcutDraftPath?: string | null;
  portablePackPath?: string | null;
}

export const MovieDramaCandidateCard: React.FC<MovieDramaCandidateCardProps> = ({
  candidate,
  isRenderingMp4,
  onRenderMp4,
  onOpenFramingModal,
  onExportCapcut,
  isExportingCapcut,
  onCreatePortablePack,
  isPacking,
  onRevealFolder,
  completedMp4Path,
  capcutDraftPath,
  portablePackPath
}) => {
  const isCompleted = Boolean(completedMp4Path || candidate.savedMp4Path);
  const activeMp4 = completedMp4Path || candidate.savedMp4Path;

  const durationSec = Math.round((candidate.durationMs || 45000) / 1000);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="grid grid-cols-1 xl:grid-cols-12 items-stretch divide-y xl:divide-y-0 xl:divide-x divide-border">
        {/* 좌측 (3칸): 9:16 비디오 또는 썸네일 프리뷰 */}
        <div className="xl:col-span-3 p-4 bg-muted/20 flex flex-col items-center justify-center">
          <div className="relative aspect-[9/16] w-full max-w-[150px] overflow-hidden rounded-xl bg-neutral-950 border border-neutral-800 shadow-md flex items-center justify-center">
            {isCompleted && activeMp4 ? (
              <video
                src={`/api/system/media/view?path=${encodeURIComponent(activeMp4)}`}
                controls
                className="h-full w-full object-cover"
              />
            ) : candidate.frameSheetUrl ? (
              <img
                src={candidate.frameSheetUrl}
                alt={candidate.title}
                className="h-full w-full object-cover opacity-80"
                onError={e => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-white/50 text-xs">
                <Film className="size-8 text-primary" />
                <span className="font-bold text-[10px]">9:16 미리보기</span>
              </div>
            )}
            <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-white">
              STORY {String(candidate.rank).padStart(2, '0')}
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground mt-2">
            {isCompleted ? '완성 MP4 재생 가능' : '9:16 세로 숏폼'}
          </span>
        </div>

        {/* 중앙 (6칸): 이야기 서사 내용 및 AI 선정 근거 */}
        <div className="xl:col-span-6 p-5 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-primary">
                이야기 후보 {String(candidate.rank).padStart(2, '0')}
              </span>
              <h4 className="text-base font-bold text-foreground mt-0.5 leading-snug">
                {candidate.title}
              </h4>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-mono font-bold",
                isCompleted
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-primary/10 text-primary border-primary/20"
              )}
            >
              {isCompleted ? 'MP4 생성 완료' : '추출 완료'}
            </Badge>
          </div>

          {/* 메타 태그 */}
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
              {durationSec}초
            </span>
            <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
              장면 {candidate.sourceCuts?.length || 3}개
            </span>
            <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
              대사 {candidate.dialogue?.length || 2}개
            </span>
            <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
              AI 해설 {candidate.narrationPlan?.length || 3}개
            </span>
          </div>

          {/* 태그 목록 */}
          {candidate.editorialComments?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {candidate.editorialComments.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* AI가 이 후보를 고른 이유 (상세 아코디언) */}
          <details className="group rounded-xl border border-border bg-muted/20 p-3 text-xs">
            <summary className="cursor-pointer font-bold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                <span>AI 분석 선정 근거 및 대본 보기</span>
              </span>
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-2.5 pt-2 border-t border-border/60 space-y-1.5 text-muted-foreground text-[11px] leading-relaxed">
              <p>
                <strong className="text-foreground">영상 근거:</strong>{' '}
                {candidate.sourceCuts?.map(c => c.reason).filter(Boolean).join(' ➔ ') || '핵심 씬 컷 추출'}
              </p>
              <p>
                <strong className="text-foreground">원작 대사:</strong>{' '}
                {candidate.dialogue?.map(d => `"${d.text}"`).join(' / ') || '원작 핵심 대사 결합'}
              </p>
              <p>
                <strong className="text-foreground">AI 내레이션:</strong>{' '}
                {candidate.narrationPlan?.map(n => n.text).join(' ') || '사건 발단과 긴박감 해설'}
              </p>
              {candidate.qualityBreakdown?.totalScore && (
                <p>
                  <strong className="text-foreground">자체 바이럴 점수:</strong>{' '}
                  <span className="font-mono text-primary font-bold">{candidate.qualityBreakdown.totalScore}점</span>
                </p>
              )}
            </div>
          </details>

          {/* 화면 조정 버튼 */}
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenFramingModal(candidate)}
              className="h-8 rounded-lg text-xs font-bold gap-1.5 border-border bg-background hover:bg-muted"
            >
              <Sliders className="size-3.5 text-primary" />
              <span>9:16 인물 화면 중심 조정</span>
            </Button>
          </div>
        </div>

        {/* 우측 (3칸): 3대 출력 액션 패널 */}
        <div className="xl:col-span-3 p-4 bg-muted/15 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-foreground block">
              3대 주권 출력 파이프라인
            </span>

            {/* 1. 완성 MP4 만들기 */}
            <Button
              type="button"
              disabled={isRenderingMp4}
              onClick={() => onRenderMp4(candidate.id)}
              className={cn(
                "w-full h-10 rounded-xl font-bold text-xs gap-1.5 shadow-xs cursor-pointer",
                isCompleted
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isRenderingMp4 ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>MP4 렌더링 중...</span>
                </>
              ) : isCompleted ? (
                <>
                  <CheckCircle2 className="size-3.5" />
                  <span>MP4 다시 렌더링</span>
                </>
              ) : (
                <>
                  <Play className="size-3.5" />
                  <span>완성 MP4 만들기 (0원)</span>
                </>
              )}
            </Button>

            {/* MP4 폴더 열기 */}
            {isCompleted && activeMp4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onRevealFolder(activeMp4)}
                className="w-full h-8 rounded-lg font-bold text-xs gap-1.5 border-border bg-background hover:bg-muted"
              >
                <FolderOpen className="size-3.5 text-primary" />
                <span>저장 폴더(05_Exports) 열기</span>
              </Button>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/60">
            {/* 2. CapCut 초안 내보내기 */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isExportingCapcut}
              onClick={() => onExportCapcut(candidate.id)}
              className="w-full h-8 rounded-lg font-bold text-xs gap-1.5 border border-border bg-background hover:bg-muted"
            >
              <Layers className="size-3 text-primary" />
              <span>{isExportingCapcut ? '초안 생성 중...' : 'CapCut 초안 생성'}</span>
            </Button>

            {/* 3. 이동 패키지 만들기 */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isPacking}
              onClick={() => onCreatePortablePack(candidate.id)}
              className="w-full h-8 rounded-lg font-bold text-xs gap-1.5 border border-border bg-background hover:bg-muted"
            >
              <Package className="size-3 text-primary" />
              <span>{isPacking ? '패키징 중...' : '이동 패키지(ZIP) 생성'}</span>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};
