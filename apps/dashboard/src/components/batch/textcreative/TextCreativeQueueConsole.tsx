import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Download,
  Film,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Zap,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { StageJob } from './TextCreativeStageSidebar';

export interface SceneDetail {
  sceneId: number;
  script: string;
  visualPrompt: string;
  durationSec: number;
}

export interface EnhancedStageJob extends StageJob {
  scenes?: SceneDetail[];
  toneLabel?: string;
  focusPersons?: string[];
  commentsCount?: number;
}

interface TextCreativeQueueConsoleProps {
  jobs: EnhancedStageJob[];
  onPauseJob: (id: string) => void;
  onResumeJob: (id: string) => void;
  onRemoveJob: (id: string) => void;
  onRerunJob: (id: string) => void;
  onExportCapCut: (id: string) => void;
  onExportBatchCapCut?: () => void;
  isExportingBatch?: boolean;
  onRenderRemotion: (id: string) => void;
  onPreviewVideo?: (id: string) => void;
}

export const TextCreativeQueueConsole: React.FC<TextCreativeQueueConsoleProps> = ({
  jobs,
  onPauseJob,
  onResumeJob,
  onRemoveJob,
  onRerunJob,
  onExportCapCut,
  onExportBatchCapCut,
  isExportingBatch,
  onRenderRemotion,
  onPreviewVideo
}) => {
  const [filter, setFilter] = useState<'all' | 'running' | 'done' | 'queued'>('all');
  const [expandedJobIds, setExpandedJobIds] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedJobIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredJobs = jobs.filter(j => {
    if (filter === 'all') return true;
    return j.status === filter;
  });

  const doneJobs = jobs.filter(j => j.status === 'done');

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
      {/* 큐 상단 타이틀 및 필터 칩 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-foreground">
            QUEUE ({jobs.length})
          </span>
          <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
            <span>진행 <b className="text-primary">{jobs.filter(j => j.status === 'running').length}</b></span>
            <span>·</span>
            <span>완료 <b className="text-emerald-500">{doneJobs.length}</b></span>
          </div>
        </div>

        {/* 큐 상단 일괄 내보내기 & 필터 칩 */}
        <div className="flex items-center gap-2">
          {doneJobs.length > 0 && onExportBatchCapCut && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isExportingBatch}
              onClick={onExportBatchCapCut}
              className="h-6 text-[10px] font-bold px-2 gap-1 border-primary/30 text-primary hover:bg-primary/10 shadow-2xs"
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>{isExportingBatch ? '일괄 내보내는 중...' : `CapCut 일괄 내보내기 (${doneJobs.length})`}</span>
            </Button>
          )}

          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: '전체' },
              { id: 'running', label: '진행 중' },
              { id: 'done', label: '완료' },
              { id: 'queued', label: '대기' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id as any)}
                className={cn(
                  'px-2 py-0.5 text-[10px] font-semibold rounded transition cursor-pointer',
                  filter === f.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 작업 목록 */}
      <div className="space-y-2 max-h-[30rem] overflow-y-auto pr-1">
        {filteredJobs.length === 0 ? (
          <div className="rounded-lg border border-border border-dashed p-6 text-center text-xs text-muted-foreground">
            해당 상태의 작업이 없습니다.
          </div>
        ) : (
          filteredJobs.map(job => {
            const isExpanded = expandedJobIds.includes(job.id);
            return (
              <div
                key={job.id}
                className="rounded-lg border border-border bg-muted/20 p-3 space-y-2 hover:border-primary/40 transition"
              >
                {/* 상단: 타이틀, 폼팩터, 상태 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20 font-bold uppercase">
                        {job.archetype}
                      </Badge>
                      <h4 className="text-xs font-bold text-foreground truncate">
                        {job.title}
                      </h4>
                      {job.toneLabel && (
                        <Badge variant="outline" className="text-[9px] bg-muted/60 text-muted-foreground border-border">
                          {job.toneLabel}
                        </Badge>
                      )}
                      {job.focusPersons && job.focusPersons.length > 0 && (
                        <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">
                          인물 {job.focusPersons.length}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {job.stageName || '작업 대기 중'} · {job.createdAt}
                    </div>
                  </div>

                  {/* 상태 뱃지 및 상세 펼치기 버튼 */}
                  <div className="flex items-center gap-1.5">
                    {job.status === 'running' ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold animate-pulse">
                        {job.progress}% 진행 중
                      </Badge>
                    ) : job.status === 'done' ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                        완료 ✓
                      </Badge>
                    ) : job.status === 'failed' ? (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] font-bold">
                        실패
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px]">
                        대기 중
                      </Badge>
                    )}

                    {job.scenes && job.scenes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(job.id)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* 진행률 바 (진행 중일 때) */}
                {job.status === 'running' && (
                  <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                )}

                {/* [Phase 3 NEW] 씬 세그먼트 상세 인스펙터 (아코디언 펼침 뷰) */}
                {isExpanded && job.scenes && (
                  <div className="pt-2 border-t border-border/40 space-y-1.5">
                    <div className="text-[10px] font-bold text-muted-foreground flex items-center justify-between">
                      <span>분할된 씬 시퀀스 ({job.scenes.length}개 씬)</span>
                      <span className="font-mono">
                        총 {job.scenes.reduce((acc, s) => acc + s.durationSec, 0).toFixed(1)}초
                      </span>
                    </div>

                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {job.scenes.map(sc => (
                        <div key={sc.sceneId} className="p-1.5 rounded bg-background/60 border border-border text-[11px] space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary font-mono text-[10px]">씬 #{sc.sceneId}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{sc.durationSec}초</span>
                          </div>
                          <p className="text-foreground font-medium text-[11px] truncate">{sc.script}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate flex items-center gap-1">
                            <ImageIcon className="w-2.5 h-2.5" />
                            {sc.visualPrompt}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 하단 액션 버튼들 */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
                  <div className="flex items-center gap-1">
                    {job.status === 'running' ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onPauseJob(job.id)}
                        className="h-7 text-[10px] px-2 gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Pause className="w-3 h-3" />
                        <span>일시정지</span>
                      </Button>
                    ) : job.status === 'paused' ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onResumeJob(job.id)}
                        className="h-7 text-[10px] px-2 gap-1 text-primary hover:text-primary"
                      >
                        <Play className="w-3 h-3" />
                        <span>재개</span>
                      </Button>
                    ) : null}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRerunJob(job.id)}
                      className="h-7 text-[10px] px-2 gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>재실행</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveJob(job.id)}
                      className="h-7 text-[10px] px-2 gap-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>삭제</span>
                    </Button>
                  </div>

                  {/* 결과물 출력 및 CapCut 내보내기 */}
                  {job.status === 'done' && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onExportCapCut(job.id)}
                        className="h-7 text-[10px] px-2.5 font-bold gap-1 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Download className="w-3 h-3" />
                        <span>CapCut 초안 내보내기</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onPreviewVideo?.(job.id)}
                        className="h-7 text-[10px] px-2.5 font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Film className="w-3 h-3" />
                        <span>영상 프리뷰</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
