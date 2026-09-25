import React from 'react';
import {
  ChevronDown,
  RotateCcw,
  ExternalLink,
  FolderOpen,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  Download,
  Film,
  Music,
  Share2,
  FileCheck,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  VideoCreativeJob,
  STAGE_LABELS,
  formatDurationSeconds,
} from './videoCreativeTypes';

interface VideoCreativeJobCardProps {
  job: VideoCreativeJob;
  isOpen: boolean;
  onToggleOpen: () => void;
  onRetry: () => void;
  onExport: () => void;
  onRemove: () => void;
  onLoadSettings: () => void;
  onOpenDraftFolder: () => void;
  onRevealDraft: () => void;
}

export const VideoCreativeJobCard: React.FC<VideoCreativeJobCardProps> = ({
  job,
  isOpen,
  onToggleOpen,
  onRetry,
  onExport,
  onRemove,
  onLoadSettings,
  onOpenDraftFolder,
  onRevealDraft,
}) => {
  const getStatusBadge = () => {
    switch (job.status) {
      case 'running':
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30 font-bold text-[11px] gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>작업 중</span>
          </Badge>
        );
      case 'success':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-[11px] gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>성공</span>
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 font-bold text-[11px] gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>실패</span>
          </Badge>
        );
      case 'paused':
        return (
          <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold text-[11px]">
            일시정지
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground border-border text-[11px]">
            대기
          </Badge>
        );
    }
  };

  const getTimeLabel = () => {
    if (job.status === 'success' || job.status === 'failed') {
      const elapsed = job.completedAtMs && job.startedAtMs ? (job.completedAtMs - job.startedAtMs) / 1000 : 0;
      return `소요 ${formatDurationSeconds(elapsed)}`;
    }
    if (job.status === 'running') {
      const remaining = Math.max(0, job.estimatedSeconds * (1 - job.progress / 100));
      return `남은 ${formatDurationSeconds(remaining)}`;
    }
    return `예상 ${formatDurationSeconds(job.estimatedSeconds)}`;
  };

  return (
    <div
      data-pixi-video-creative-job={job.id}
      data-pixi-video-creative-job-status={job.status}
      className="border-b border-border last:border-b-0 transition-colors bg-card hover:bg-muted/10"
    >
      {/* ── 요약 행 (클릭 시 아코디언 토글) ── */}
      <div className="grid grid-cols-2 gap-3 p-3.5 sm:grid-cols-12 items-center text-xs">
        {/* 제목 & 메타 배지 */}
        <div
          onClick={onToggleOpen}
          data-pixi-video-creative-job-toggle={job.id}
          className="col-span-2 sm:col-span-4 flex items-start gap-2 cursor-pointer select-none min-w-0"
        >
          <ChevronDown
            className={`w-4 h-4 mt-0.5 text-muted-foreground shrink-0 transition-transform ${
              isOpen ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <div className="min-w-0">
            <div className="font-bold text-foreground truncate text-sm">
              {job.title}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>{job.sourceCount}채널</span>
              <span>·</span>
              <span>{job.languageCount}언어</span>
              <span>·</span>
              <span>목표 {job.targetSourceCount}파일</span>
              <span>·</span>
              <span>{job.candidateUrls.length}URL</span>
              <span>·</span>
              <span>{job.downloadedSources.length}파일</span>
              {job.audioSource && (
                <>
                  <span>·</span>
                  <span>음성 {formatDurationSeconds(job.audioSource.durationMs / 1000)}</span>
                </>
              )}
              <span>·</span>
              <span className="text-primary font-bold">{STAGE_LABELS[job.stage]}</span>
              {job.error && (
                <span className="text-destructive font-bold truncate">오류 있음</span>
              )}
              {job.warning && !job.error && (
                <span className="text-amber-500 font-bold truncate">경고 있음</span>
              )}
            </div>
          </div>
        </div>

        {/* 상태 배지 */}
        <div className="col-span-1 sm:col-span-2 flex items-center">
          {getStatusBadge()}
        </div>

        {/* 진행률 바 */}
        <div className="col-span-1 sm:col-span-2 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>진행</span>
            <span className="font-mono font-bold">{job.progress}%</span>
          </div>
          <Progress value={job.progress} className="h-1.5" />
        </div>

        {/* 시간 */}
        <div className="col-span-1 sm:col-span-2 text-right sm:text-center font-mono text-[11px] text-muted-foreground">
          {getTimeLabel()}
        </div>

        {/* 액션 버튼 */}
        <div className="col-span-1 sm:col-span-2 flex items-center justify-end gap-1.5">
          {job.status === 'failed' ? (
            <Button
              type="button"
              size="sm"
              onClick={onRetry}
              data-pixi-video-creative-job-retry={job.id}
              className="h-7 px-2 text-[11px] gap-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>재시도</span>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant={job.exportStatus === 'exported' ? 'outline' : 'default'}
              disabled={job.status !== 'success' || job.exportStatus === 'exporting'}
              onClick={onExport}
              className={`h-7 px-2.5 text-[11px] gap-1 font-bold cursor-pointer ${
                job.exportStatus === 'exported'
                  ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {job.exportStatus === 'exporting' ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>내보내는 중</span>
                </>
              ) : job.exportStatus === 'exported' ? (
                <>
                  <FileCheck className="w-3 h-3" />
                  <span>다시 내보내기</span>
                </>
              ) : (
                <>
                  <Film className="w-3 h-3" />
                  <span>CapCut 내보내기</span>
                </>
              )}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={job.status === 'running' || job.exportStatus === 'exporting'}
            data-pixi-video-creative-job-remove={job.id}
            aria-label={`${job.title} 작업 제거`}
            title={`${job.title} 작업 제거`}
            className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── 아코디언 상세 뷰 (열렸을 때) ── */}
      {isOpen && (
        <div className="border-t border-border bg-muted/20 p-4 space-y-4 text-xs animate-in fade-in duration-150">
          {/* 오류 알림창 */}
          {job.error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-xs">
                  <AlertCircle className="w-4 h-4" />
                  작업을 완료하지 못했습니다
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onLoadSettings}
                    data-pixi-video-creative-job-load-settings={job.id}
                    className="h-6 text-[10px] bg-background border-border text-foreground hover:bg-muted"
                  >
                    설정 불러오기
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={onRetry}
                    className="h-6 text-[10px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    재시도
                  </Button>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed">{job.error}</p>
              <div className="text-[10px] opacity-80">
                같은 설정으로 재시도하거나 설정을 불러와 검색 조건과 후보 URL을 수정하세요.
              </div>
            </div>
          )}

          {/* 추가 안내 알림창 (Warning) */}
          {job.warning && job.warning !== job.error && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300 space-y-1">
              <div className="font-bold text-xs">추가 안내</div>
              <p className="text-[11px] leading-relaxed">{job.warning}</p>
            </div>
          )}

          {/* 대본 & 메트릭 그리드 */}
          <div className="grid gap-3 lg:grid-cols-12">
            {/* 대본 미리보기 */}
            <div className="lg:col-span-7 rounded-xl border border-border bg-card p-3 space-y-1.5 shadow-2xs">
              <div className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
                <span>대본</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onLoadSettings}
                  className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10"
                >
                  설정 불러오기
                </Button>
              </div>
              <div className="leading-relaxed text-foreground whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar font-medium">
                {job.script}
              </div>
            </div>

            {/* 메트릭 요약 */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-border bg-card p-2">
                <span className="text-muted-foreground block text-[10px]">화면 구성</span>
                <strong className="text-foreground font-bold">
                  {job.framingMode === 'fill' ? '세로 꽉 채우기' : '장면 전체 · 추천'}
                </strong>
              </div>
              <div className="rounded-lg border border-border bg-card p-2">
                <span className="text-muted-foreground block text-[10px]">자막 프리셋</span>
                <strong className="text-foreground font-bold">
                  {job.subtitlePreset === 'yellow_pop'
                    ? '강조 옐로우'
                    : job.subtitlePreset === 'neon_cyan'
                    ? '네온 사이언'
                    : job.subtitlePreset === 'gunlimbo'
                    ? '군림보 볼드'
                    : '화이트 기본'}
                </strong>
              </div>
              <div className="rounded-lg border border-border bg-card p-2">
                <span className="text-muted-foreground block text-[10px]">원본 목표</span>
                <strong className="text-foreground font-bold">{job.targetSourceCount}개 파일</strong>
              </div>
              <div className="rounded-lg border border-border bg-card p-2">
                <span className="text-muted-foreground block text-[10px]">다운로드 원본</span>
                <strong className="text-primary font-bold">{job.downloadedSources.length}개 완료</strong>
              </div>
            </div>
          </div>

          {/* AI 분석 엔티티 태그 (분석 대상) */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-2xs">
            <div className="text-[11px] font-bold text-muted-foreground">
              분석 대상 (인물 · 사물 · 키워드)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {job.analysis.entities.length > 0 ? (
                job.analysis.entities.map((ent, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-[11px] px-2 py-0.5 bg-muted/40 text-foreground border-border font-medium"
                  >
                    #{ent.label}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-[11px]">
                  대본에서 인물/키워드를 더 뽑는 중
                </span>
              )}
            </div>
          </div>

          {/* 장면 매칭 쿼리 그리드 */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-2xs">
            <div className="text-[11px] font-bold text-muted-foreground">
              문장별 장면 매칭 & 검색 쿼리
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {job.analysis.scenes.length > 0 ? (
                job.analysis.scenes.map(sc => (
                  <div
                    key={sc.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2 rounded-lg bg-muted/20 border border-border/50 text-[11px]"
                  >
                    <div className="sm:col-span-6 font-semibold text-foreground truncate">
                      {sc.line}
                    </div>
                    <div className="sm:col-span-3 text-muted-foreground truncate">
                      🎯 {sc.target}
                    </div>
                    <div className="sm:col-span-3 font-mono text-primary font-bold truncate">
                      🔍 {sc.query}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-[11px]">매칭된 씬 정보가 없습니다.</div>
              )}
            </div>
          </div>

          {/* 다운로드 원본 리스트 */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-2xs">
            <div className="text-[11px] font-bold text-muted-foreground">
              다운로드 원본
            </div>
            {job.downloadedSources.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                {job.downloadedSources.map((ds, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/50 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">{ds.title || ds.filename}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">{ds.filePath}</div>
                    </div>
                    <span className="font-mono text-[10px] text-primary shrink-0 ml-2">
                      {formatDurationSeconds(ds.durationMs / 1000)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground text-[11px]">
                아직 다운로드된 원본이 없습니다.
              </div>
            )}
          </div>

          {/* CapCut 초안 액션 */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              {job.capcutDraftPath ? (
                <span
                  data-pixi-video-creative-capcut-draft="true"
                  className="font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  CapCut 초안 프로젝트 준비 완료
                </span>
              ) : (
                <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                  CapCut 초안: 준비중
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {job.capcutDraftFolder && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenDraftFolder}
                  className="h-8 gap-1.5 text-xs border-border hover:bg-muted cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-primary" />
                  <span>초안 폴더 열기</span>
                </Button>
              )}
              {job.capcutDraftPath && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRevealDraft}
                  className="h-8 gap-1.5 text-xs border-border hover:bg-muted cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-primary" />
                  <span>초안 파일 위치 보기</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
