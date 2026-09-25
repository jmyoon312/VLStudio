import React from 'react';
import {
  Film,
  Search,
  Download,
  GitCompare,
  Scissors,
  Share2,
  FolderOpen,
  Inbox,
  Loader2,
  CheckCircle2,
  Coins
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { VideoCreativeJob, formatDurationSeconds } from './videoCreativeTypes';
import { VideoCreativeJobCard } from './VideoCreativeJobCard';

interface VideoCreativeQueueSectionProps {
  jobs: VideoCreativeJob[];
  openJobIds: string[];
  onToggleJobOpen: (id: string) => void;
  onRetryJob: (id: string) => void;
  onExportJob: (id: string) => void;
  onRemoveJob: (id: string) => void;
  onLoadJobSettings: (job: VideoCreativeJob) => void;
  onOpenCapcutDraftFolder: (draftFolder: string) => void;
  onRevealCapcutDraft: (draftPath: string) => void;
  canBatchExport: boolean;
  onBatchExport: () => void;
  reservedCredits: number;
  settledCredits: number;
  totalUsedCredits: number;
  estimatedRemainingSeconds: number;
  exportedCount: number;
  exportingCount: number;
  resultCount: number;
  totalProgress: number;
  selectedSurfacesCount: number;
  searchLanguageCount: number;
  targetSourceSummary: string;
}

export const VideoCreativeQueueSection: React.FC<VideoCreativeQueueSectionProps> = ({
  jobs,
  openJobIds,
  onToggleJobOpen,
  onRetryJob,
  onExportJob,
  onRemoveJob,
  onLoadJobSettings,
  onOpenCapcutDraftFolder,
  onRevealCapcutDraft,
  canBatchExport,
  onBatchExport,
  reservedCredits,
  settledCredits,
  totalUsedCredits,
  estimatedRemainingSeconds,
  exportedCount,
  exportingCount,
  resultCount,
  totalProgress,
  selectedSurfacesCount,
  searchLanguageCount,
  targetSourceSummary,
}) => {
  return (
    <div className="space-y-4">
      {/* ── 1. 실행 현황 및 지표 요약 카드 ── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs shrink-0">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-foreground">실행 현황</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                예약 {reservedCredits} 크레딧 · 현재 사용 {settledCredits} 크레딧 · 남은 예상 {formatDurationSeconds(estimatedRemainingSeconds)} · 내보내기 {exportedCount}개
              </p>
            </div>
          </div>

          <Button
            type="button"
            disabled={!canBatchExport}
            onClick={onBatchExport}
            data-pixi-video-creative-batch-export="true"
            className="h-9 gap-2 text-xs font-black bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
          >
            {exportingCount > 0 ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            <span>CapCut 일괄 내보내기</span>
          </Button>
        </div>

        {/* 결과 & 사용 크레딧 메트릭 */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div data-pixi-video-creative-metric="result" className="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <span className="text-[11px] font-bold text-muted-foreground block">결과</span>
            <span className="font-mono text-base font-black text-foreground">{resultCount}</span>
          </div>
          <div data-pixi-video-creative-metric="total-used-credits" className="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <span className="text-[11px] font-bold text-muted-foreground block">총 사용 크레딧</span>
            <span className="font-mono text-base font-black text-foreground">{totalUsedCredits}</span>
          </div>
        </div>

        {/* 조건 필터 칩 */}
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-full border border-border bg-muted/30 px-2.5 py-0.5 font-medium">
            검색 채널 {selectedSurfacesCount}개
          </span>
          <span className="rounded-full border border-border bg-muted/30 px-2.5 py-0.5 font-medium">
            검색 언어 {searchLanguageCount}개
          </span>
          <span className="rounded-full border border-border bg-muted/30 px-2.5 py-0.5 font-medium">
            원본 목표 {targetSourceSummary}
          </span>
          <span className="rounded-full border border-border bg-muted/30 px-2.5 py-0.5 font-medium">
            내보내기 중 {exportingCount}개
          </span>
        </div>

        {/* 5단계 파이프라인 시각화 */}
        <div className="pt-2 border-t border-border/60">
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-muted/20 border border-border/40 font-bold text-foreground">
              <Search className="w-3.5 h-3.5 text-primary" />
              <span>1. 검색</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-muted/20 border border-border/40 font-bold text-foreground">
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span>2. 다운로드</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-muted/20 border border-border/40 font-bold text-foreground">
              <GitCompare className="w-3.5 h-3.5 text-emerald-500" />
              <span>3. 매칭</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-muted/20 border border-border/40 font-bold text-foreground">
              <Scissors className="w-3.5 h-3.5 text-amber-500" />
              <span>4. 편집</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-muted/20 border border-border/40 font-bold text-foreground">
              <Film className="w-3.5 h-3.5 text-purple-500" />
              <span>5. CapCut</span>
            </div>
          </div>
        </div>

        {/* 전체 진행률 바 */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>전체 진행률</span>
            <span className="font-mono font-bold text-foreground">{totalProgress}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </div>
      </div>

      {/* ── 2. 작업 큐 테이블 & 카드 리스트 ── */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {/* 테이블 헤더 (데스크톱) */}
        <div className="hidden sm:grid grid-cols-12 gap-3 border-b border-border bg-muted/30 px-4 py-2.5 font-bold text-muted-foreground text-xs">
          <div className="col-span-4">작업</div>
          <div className="col-span-2">상태</div>
          <div className="col-span-2">진행</div>
          <div className="col-span-2 text-center">예상 시간</div>
          <div className="col-span-2 text-right">내보내기</div>
        </div>

        {/* 작업 목록 */}
        <div className="divide-y divide-border">
          {jobs.length === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground text-sm">
              <Inbox className="w-8 h-8 opacity-40" />
              <div className="font-semibold text-foreground">대기 중인 작업이 없습니다</div>
              <p className="text-xs">
                대본을 넣고 작업을 추가하면 큐가 여기에 쌓입니다.
              </p>
            </div>
          ) : (
            jobs.map(job => (
              <VideoCreativeJobCard
                key={job.id}
                job={job}
                isOpen={openJobIds.includes(job.id)}
                onToggleOpen={() => onToggleJobOpen(job.id)}
                onRetry={() => onRetryJob(job.id)}
                onExport={() => onExportJob(job.id)}
                onRemove={() => onRemoveJob(job.id)}
                onLoadSettings={() => onLoadJobSettings(job)}
                onOpenDraftFolder={() => onOpenCapcutDraftFolder(job.capcutDraftFolder || '')}
                onRevealDraft={() => onRevealCapcutDraft(job.capcutDraftPath || '')}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
