import React from 'react';
import { Play, Sparkles, Layers, CheckCircle2, Clock, Plus, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CreativeStage } from './TextCreativeHeader';

export interface StageJob {
  id: string;
  title: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'paused';
  progress: number;
  stageName?: string;
  archetype: string;
  createdAt: string;
}

interface TextCreativeStageSidebarProps {
  stage: CreativeStage;
  jobs: StageJob[];
  onOpenNextDraft: () => void;
  onSelectJob?: (jobId: string) => void;
}

export const TextCreativeStageSidebar: React.FC<TextCreativeStageSidebarProps> = ({
  stage,
  jobs,
  onOpenNextDraft,
  onSelectJob
}) => {
  const activeJobs = jobs.slice(-3);
  const slots = Array.from({ length: 3 }, (_, i) => activeJobs[i] ?? null);

  const isProducing = jobs.some(j => j.status === 'running');
  const isAllDone = jobs.length > 0 && jobs.every(j => j.status === 'done');

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-xs">
      {/* ON STAGE 상태 헤더 */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
          <Film className="w-3.5 h-3.5 text-primary" />
          <span>ON STAGE (제작 모니터링)</span>
        </div>

        <div>
          {isProducing ? (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold gap-1 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              ● LIVE
            </Badge>
          ) : isAllDone ? (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold">
              WRAP (완성)
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px]">
              IDLE (대기)
            </Badge>
          )}
        </div>
      </div>

      {/* 픽셀링 Kf 3분할 9:16 종횡비 릴 카드 */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-muted-foreground">최근 작업 릴 (9:16 프리뷰)</div>
        <div className="grid grid-cols-3 gap-2">
          {slots.map((job, idx) =>
            job ? (
              <div
                key={job.id}
                onClick={() => onSelectJob?.(job.id)}
                className={cn(
                  'relative aspect-[9/16] overflow-hidden rounded-lg border transition cursor-pointer p-1.5 flex flex-col justify-between shadow-2xs',
                  job.status === 'done'
                    ? 'border-emerald-500/50 bg-emerald-950/20'
                    : job.status === 'running'
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border bg-muted/20'
                )}
              >
                {/* 상단 상태 뱃지 */}
                <span
                  className={cn(
                    'self-start rounded px-1 py-0.5 font-mono text-[9px] font-bold tabular-nums',
                    job.status === 'done'
                      ? 'bg-emerald-500 text-white'
                      : job.status === 'running'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {job.status === 'running' ? `${job.progress}%` : job.status === 'done' ? '완료' : '대기'}
                </span>

                {/* 하단 타이틀 */}
                <div className="bg-background/80 backdrop-blur-xs rounded p-1">
                  <p className="line-clamp-2 text-[9px] font-bold text-foreground leading-tight">
                    {job.title}
                  </p>
                </div>
              </div>
            ) : (
              <div
                key={`empty-${idx}`}
                className="grid aspect-[9/16] place-items-center rounded-lg border border-dashed border-border/80 bg-muted/10 text-muted-foreground/40 text-sm font-mono font-bold"
              >
                +
              </div>
            )
          )}
        </div>
      </div>

      {/* NEXT — 다음 작업 작성 패널 (제작 중이거나 완료 시에만 노출하여 작성 중 혼란 방지) */}
      {stage !== 'writing' && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              NEXT — 다음 작업 작성
            </span>
            <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">
              NON-STOP
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            현재 작업이 렌더링되는 동안 다음 대본을 논스톱으로 이어서 작성할 수 있습니다. 작성된 작업은 대기열 뒤에 자동 배치됩니다.
          </p>
          <Button
            type="button"
            onClick={onOpenNextDraft}
            className="w-full h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ 새 대본 작성 화면 열기</span>
          </Button>
        </div>
      )}

      {/* 작업이 비어 있을 때: 픽셀링 KS 4단계 안내 가이드 */}
      {jobs.length === 0 && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
          <p className="font-bold text-xs text-foreground">제작 대기열이 비어 있습니다</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            좌측에서 대본을 입력하고 [작업 추가]를 누르면 실시간 씬 분할과 음성 합성이 시작됩니다.
          </p>
          <ol className="space-y-1.5 pt-1">
            {[
              '01 대본 작성 또는 샘플 대본 선택',
              '02 영상 소스 링크 또는 파일 첨부',
              '03 폼팩터 및 세부 연출 옵션 선택',
              '04 작업 추가 → 자체 주권 엔진 생성 시작'
            ].map((step, idx) => (
              <li key={idx} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-mono text-[10px] font-bold text-primary">0{idx + 1}</span>
                <span>{step.slice(3)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};
