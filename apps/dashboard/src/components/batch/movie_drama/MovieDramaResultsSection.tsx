import React, { useState } from 'react';
import {
  Download,
  Film,
  Sparkles,
  Layers,
  FolderOpen,
  CheckCircle2,
  Loader2,
  FileCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MovieDramaCandidateCard,
  CandidateData
} from './MovieDramaCandidateCard';
import { MovieDramaExportPanel } from './MovieDramaExportPanel';
import { cn } from '@/lib/utils';

interface MovieDramaResultsSectionProps {
  candidates: CandidateData[];
  onRenderMp4: (candidateId: string) => Promise<void>;
  renderingCandidateId: string | null;
  onRenderAllMp4: () => Promise<void>;
  isBatchRendering: boolean;
  onOpenFramingModal: (candidate: CandidateData) => void;
  onExportCapcut: (candidateId: string) => Promise<void>;
  onExportAllCapcut: () => Promise<void>;
  exportingCandidateId: string | null;
  isBatchExportingCapcut: boolean;
  onCreatePortablePack: (candidateId: string) => Promise<void>;
  packingCandidateId: string | null;
  onInstallPortablePack: () => void;
  isInstallingPack: boolean;
  localDrafts: Array<{ candidateId: string; draftPath: string; title: string }>;
  completedMp4Map: Record<string, string>;
  onRevealFolder: (path: string) => void;
}

export const MovieDramaResultsSection: React.FC<MovieDramaResultsSectionProps> = ({
  candidates,
  onRenderMp4,
  renderingCandidateId,
  onRenderAllMp4,
  isBatchRendering,
  onOpenFramingModal,
  onExportCapcut,
  onExportAllCapcut,
  exportingCandidateId,
  isBatchExportingCapcut,
  onCreatePortablePack,
  packingCandidateId,
  onInstallPortablePack,
  isInstallingPack,
  localDrafts,
  completedMp4Map,
  onRevealFolder
}) => {
  const [activeTab, setActiveTab] = useState<string>(() => {
    return candidates[0]?.id || 'export';
  });

  const completedCount = Object.keys(completedMp4Map).length;
  const totalCount = candidates.length;

  const isExportTab = activeTab === 'export';
  const activeCandidate = candidates.find(c => c.id === activeTab) || candidates[0];

  return (
    <div className="space-y-4">
      {/* 헤더 및 일괄 저장 바 */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary">03 · 결과 확인 & 출력</span>
              <Badge variant="outline" className="text-[10px] font-mono bg-muted/40">
                STORY DECK
              </Badge>
            </div>
            <h3 className="mt-1 text-lg font-bold text-foreground">
              이야기 {totalCount}편을 검수하고 바로 렌더링하세요
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              각 화별 9:16 비디오를 확인하고 MP4 즉시 렌더링 또는 CapCut 초안으로 내보낼 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono bg-muted/40 px-3 py-1.5 rounded-full border border-border">
              MP4 {completedCount} / {totalCount}개 완성
            </span>
            <Button
              type="button"
              disabled={isBatchRendering || totalCount === 0}
              onClick={onRenderAllMp4}
              className="h-10 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-sm cursor-pointer"
            >
              {isBatchRendering ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>전체 MP4 렌더링 중...</span>
                </>
              ) : (
                <>
                  <Download className="size-3.5" />
                  <span>MP4 {totalCount}편 일괄 렌더링</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* 가로 탭 바 (후보 순위 탭 + CapCut 내보내기 탭) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {candidates.map(cand => {
          const isSel = activeTab === cand.id;
          const isDone = Boolean(completedMp4Map[cand.id] || cand.savedMp4Path);
          return (
            <button
              key={cand.id}
              type="button"
              onClick={() => setActiveTab(cand.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0",
                isSel
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card border-border hover:bg-muted/40 text-foreground"
              )}
            >
              <span
                className={cn(
                  "size-5 rounded-full flex items-center justify-center text-[10px] font-mono",
                  isSel ? "bg-primary-foreground/20 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {cand.rank}
              </span>
              <span className="truncate max-w-[120px]">{cand.title}</span>
              {isDone && <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />}
            </button>
          );
        })}

        {/* CapCut & 이동 패키지 탭 */}
        <button
          type="button"
          onClick={() => setActiveTab('export')}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ml-auto",
            isExportTab
              ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 border-neutral-950 dark:border-white shadow-xs"
              : "bg-card border-border hover:bg-muted/40 text-foreground"
          )}
        >
          <Layers className="size-3.5" />
          <span>CapCut 초안 & 이동 패키지</span>
        </button>
      </div>

      {/* 탭 콘텐츠 영역 */}
      <div>
        {isExportTab ? (
          <MovieDramaExportPanel
            onExportAllCapcut={onExportAllCapcut}
            isExportingCapcut={isBatchExportingCapcut}
            onInstallPortablePack={onInstallPortablePack}
            isInstallingPack={isInstallingPack}
            localDrafts={localDrafts}
            onRevealFolder={onRevealFolder}
          />
        ) : activeCandidate ? (
          <MovieDramaCandidateCard
            key={activeCandidate.id}
            candidate={activeCandidate}
            isRenderingMp4={renderingCandidateId === activeCandidate.id}
            onRenderMp4={onRenderMp4}
            onOpenFramingModal={onOpenFramingModal}
            onExportCapcut={onExportCapcut}
            isExportingCapcut={exportingCandidateId === activeCandidate.id}
            onCreatePortablePack={onCreatePortablePack}
            isPacking={packingCandidateId === activeCandidate.id}
            onRevealFolder={onRevealFolder}
            completedMp4Path={completedMp4Map[activeCandidate.id]}
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-xs text-muted-foreground">
            표시할 이야기 후보가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};
