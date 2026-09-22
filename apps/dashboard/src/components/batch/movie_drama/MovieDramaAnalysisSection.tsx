import React, { useState } from 'react';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Sparkles,
  Clapperboard,
  Mic,
  Cpu,
  Scissors,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export interface MovieDramaJob {
  id: string;
  status: 'processing' | 'completed' | 'failed' | 'canceled';
  stage: string;
  progress: number;
  activityMessage: string;
  source: {
    originalName: string;
    media?: {
      duration?: number;
      width?: number;
      height?: number;
    };
  };
  settings: {
    targetShortsCount: number;
    deliveryMode: string;
    layoutPreset: string;
  };
  error?: { message: string; code?: string } | null;
}

interface MovieDramaAnalysisSectionProps {
  job: MovieDramaJob;
  onCancelJob: (jobId: string) => void;
  onRetry: () => void;
}

export const MovieDramaAnalysisSection: React.FC<MovieDramaAnalysisSectionProps> = ({
  job,
  onCancelJob,
  onRetry
}) => {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // 픽셀링 5대 단계 매핑 (Fn)
  const stages = [
    { id: 'probing_source', label: '1. 원본과 오디오 확인', desc: '해상도 및 음향 트랙 정밀 프로빙', icon: Clapperboard, minProg: 10 },
    { id: 'analyzing_media', label: '2. 대사와 등장인물 파악', desc: '0.4초 씬 컷 감지 및 Whisper 음성 전사', icon: Mic, minProg: 30 },
    { id: 'building_story_graph', label: '3. 사건 흐름과 반전 연결', desc: '프레임 시트 분석 및 LLM 스토리 그래프 도출', icon: Cpu, minProg: 50 },
    { id: 'planning_candidates', label: '4. 겹치는 후보 정리', desc: '중복 씬 컷 필터링 및 최적 후보 선별', icon: Scissors, minProg: 70 },
    { id: 'generating_tts', label: '5. 제목·자막·음성 구성', desc: 'AI 내레이션 합성 및 자막 타임라인 매핑', icon: FileText, minProg: 85 },
  ];

  const currentStageIndex = stages.findIndex(s => job.stage === s.id);
  const activeIndex = currentStageIndex >= 0 ? currentStageIndex : 0;

  return (
    <div className="space-y-4 max-w-4xl mx-auto py-2">
      {/* 헤더 및 진행률 요약 */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary">02 · 작품 분석 파이프라인</span>
              <Badge variant="outline" className="text-[10px] font-mono bg-primary/10 text-primary border-primary/20">
                {job.progress}% COMPLETED
              </Badge>
            </div>
            <h3 className="mt-1 text-lg font-bold text-foreground">
              {job.source?.originalName || '영화·드라마 쇼츠 분석'}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              로컬 Faster-Whisper, FFmpeg 씬 감지 및 AI 스토리텔링 엔진이 긴박한 서사를 분석 중입니다.
            </p>
          </div>

          {job.status === 'processing' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelModalOpen(true)}
              className="h-9 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold"
            >
              분석 중단
            </Button>
          )}
        </div>

        {/* 전체 프로그레스 바 */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5 text-foreground">
              {job.status === 'processing' && <Loader2 className="size-3.5 animate-spin text-primary" />}
              {job.activityMessage}
            </span>
            <span className="font-mono text-primary font-bold">{job.progress}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500 rounded-full",
                job.status === 'failed' ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${Math.max(5, Math.min(100, job.progress))}%` }}
            />
          </div>
        </div>
      </section>

      {/* 5대 분석 단계 리스트 (Fn) */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
        <h4 className="text-xs font-bold text-foreground px-1">실시간 5단계 분석 프로세스</h4>
        <div className="grid gap-2.5">
          {stages.map((st, idx) => {
            const Icon = st.icon;
            const isCompleted = job.progress >= st.minProg + 15 || idx < activeIndex;
            const isCurrent = idx === activeIndex && job.status === 'processing';
            const isPending = idx > activeIndex && !isCompleted;

            return (
              <div
                key={st.id}
                className={cn(
                  "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all duration-200",
                  isCurrent && "border-primary/40 bg-primary/[0.05] shadow-2xs ring-1 ring-primary/20",
                  isCompleted && "border-border/80 bg-background/80",
                  isPending && "border-border/40 bg-muted/20 opacity-60"
                )}
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl",
                    isCurrent && "bg-primary text-primary-foreground shadow-md shadow-primary/20 animate-pulse",
                    isCompleted && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                    isPending && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-bold", isCurrent ? "text-primary" : "text-foreground")}>
                      {st.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-primary animate-pulse">
                        처리 중...
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        완료됨
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {st.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 실패 상태인 경우 오류 안내 및 재시도 버튼 */}
      {job.status === 'failed' && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/[0.08] p-4 text-xs space-y-3">
          <div className="flex items-center gap-2 text-destructive font-bold">
            <AlertCircle className="size-4" />
            <span>분석 작업이 중단되었습니다</span>
          </div>
          <p className="text-muted-foreground">{job.error?.message || '원인을 알 수 없는 오류가 발생했습니다.'}</p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onRetry}
            className="h-8 rounded-lg font-bold text-xs"
          >
            다시 시도
          </Button>
        </div>
      )}

      {/* R7 취소 다이얼로그 모달 */}
      <AlertDialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">분석 작업을 취소할까요?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              실행 중인 영화·드라마 분석 파이프라인과의 연결을 중단합니다. 이미 처리된 임시 프레임 작업은 보존되며, 이후 같은 영상으로 즉시 재시도할 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 rounded-xl text-xs font-bold">계속 진행</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onCancelJob(job.id);
                setCancelModalOpen(false);
              }}
              className="h-9 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold"
            >
              작업 취소
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
