import React, { useState } from 'react';
import {
  Crown,
  Sparkles,
  RefreshCw,
  ShieldAlert,
  ArrowLeft,
  ChevronDown,
  Trash2,
  Clock,
  CheckCircle2,
  Layers,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RankingItem, SceneCandidate, BlurRegion } from '@/types/ranking';
import { RankingBlurMaskModal } from './RankingBlurMaskModal';
import { cn } from '@/lib/utils';

interface RankingPlanReviewSectionProps {
  headline: string;
  subtitle: string;
  onChangeHeadline: (headline: string) => void;
  onChangeSubtitle: (subtitle: string) => void;
  items: RankingItem[];
  onChangeItems: (items: RankingItem[] | ((prev: RankingItem[]) => RankingItem[])) => void;
  onBackToSource: () => void;
}

export const RankingPlanReviewSection: React.FC<RankingPlanReviewSectionProps> = ({
  headline,
  subtitle,
  onChangeHeadline,
  onChangeSubtitle,
  items,
  onChangeItems,
  onBackToSource
}) => {
  const [activeBlurModalItem, setActiveBlurModalItem] = useState<RankingItem | null>(null);
  const [openCandidateDropdownRank, setOpenCandidateDropdownRank] = useState<number | null>(null);

  const updateItem = (index: number, field: keyof RankingItem, val: any) => {
    onChangeItems(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: val } : item));
  };

  // 다른 장면 후보로 스왑(교체) 핸들러
  const handleSwapCandidate = (itemIndex: number, candidate: SceneCandidate) => {
    onChangeItems(prev => {
      const target = prev[itemIndex];
      if (!target) return prev;

      // 현재 클립을 후보군에 넣고 선택된 후보로 클립의 타임코드/점수 업데이트
      const oldCandidate: SceneCandidate = {
        id: `old-${Date.now()}`,
        startMs: target.startMs,
        durationMs: target.durationMs,
        rankingScore: 88,
        title: `${target.rank}위 이전 장면`,
        safety: 'safe'
      };

      const newCandidates = [
        oldCandidate,
        ...target.candidates.filter(c => c.id !== candidate.id)
      ];

      const updatedItem: RankingItem = {
        ...target,
        startMs: candidate.startMs,
        durationMs: candidate.durationMs,
        candidates: newCandidates
      };

      const newArr = [...prev];
      newArr[itemIndex] = updatedItem;
      return newArr;
    });

    setOpenCandidateDropdownRank(null);
  };

  // 블러 마스크 저장 핸들러
  const handleSaveBlur = (regions: BlurRegion[]) => {
    if (!activeBlurModalItem) return;
    onChangeItems(prev => prev.map(it => it.id === activeBlurModalItem.id ? { ...it, blurRegions: regions } : it));
    setActiveBlurModalItem(null);
  };

  return (
    <div className="space-y-4">
      {/* 상단 컨트롤 바 */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBackToSource}
            className="h-8 px-2 text-xs font-bold gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            소스 선택으로
          </Button>
          <span className="text-xs font-bold text-foreground">
            AI 분석 순위 계획 검토 및 수정
          </span>
          <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            총 {items.length}개 순위 확정
          </Badge>
        </div>
      </div>

      {/* 대제목 & 부제목 편집 바 */}
      <div className="p-3 bg-muted/20 border border-border rounded-xl grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="text-[11px] font-bold text-muted-foreground block mb-1">상단 대제목 (Headline)</label>
          <input
            type="text"
            value={headline}
            onChange={e => onChangeHeadline(e.target.value)}
            placeholder="예: 한국인이 사랑하는 야식"
            className="w-full text-xs p-2 rounded-lg border border-border bg-background font-bold text-foreground"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-muted-foreground block mb-1">부제목 / 훅 (Subtitle)</label>
          <input
            type="text"
            value={subtitle}
            onChange={e => onChangeSubtitle(e.target.value)}
            placeholder="예: 배달 음식 선호도 TOP 5"
            className="w-full text-xs p-2 rounded-lg border border-border bg-background font-semibold text-foreground"
          />
        </div>
      </div>

      {/* 순위별 카드 리스트 */}
      <div className="space-y-3 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
        {items.map((item, idx) => {
          const isFirst = item.rank === 1;
          const isCandidateOpen = openCandidateDropdownRank === item.rank;
          const startSec = (item.startMs / 1000).toFixed(1);
          const durSec = (item.durationMs / 1000).toFixed(1);

          return (
            <div
              key={item.id || item.rank}
              className={cn(
                "p-3.5 rounded-xl border transition space-y-2.5",
                isFirst
                  ? "bg-amber-500/10 border-amber-500/40 shadow-2xs"
                  : "bg-card border-border shadow-xs"
              )}
            >
              {/* 순위 카드 상단 헤더 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black",
                      isFirst
                        ? "bg-amber-500 text-black shadow-xs"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    {item.rank}
                  </span>
                  <span className="text-xs font-black text-foreground">
                    {item.rank}위 {isFirst && '🏆 (피날레 1위)'}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {startSec}s ~ {(Number(startSec) + Number(durSec)).toFixed(1)}s ({durSec}초)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* 가림(블러) 마스크 버튼 */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveBlurModalItem(item)}
                    className={cn(
                      "h-7 px-2 text-[10.5px] font-bold gap-1 cursor-pointer",
                      item.blurRegions?.length > 0
                        ? "border-primary text-primary bg-primary/10"
                        : "text-muted-foreground"
                    )}
                  >
                    <ShieldAlert className="w-3 h-3" />
                    가림 {item.blurRegions?.length > 0 && `(${item.blurRegions.length})`}
                  </Button>

                  {/* 다른 장면으로 바꾸기 드롭다운 토글 */}
                  {item.candidates && item.candidates.length > 0 && (
                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setOpenCandidateDropdownRank(isCandidateOpen ? null : item.rank)}
                        className="h-7 px-2 text-[10.5px] font-bold gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 text-primary" />
                        장면 교체 ({item.candidates.length})
                        <ChevronDown className="w-2.5 h-2.5" />
                      </Button>

                      {isCandidateOpen && (
                        <div className="absolute right-0 top-8 z-30 w-72 p-2 bg-popover border border-border rounded-xl shadow-xl space-y-1.5 animate-in fade-in-50">
                          <div className="text-[10px] font-bold text-muted-foreground border-b border-border pb-1 px-1">
                            AI가 함께 발견한 다른 후보 장면들
                          </div>
                          {item.candidates.map(cand => (
                            <button
                              key={cand.id}
                              type="button"
                              onClick={() => handleSwapCandidate(idx, cand)}
                              className="w-full p-2 text-left rounded-lg border border-border hover:bg-muted/40 transition flex items-center justify-between text-xs cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-foreground truncate">{cand.title}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {(cand.startMs / 1000).toFixed(1)}s ({(cand.durationMs / 1000).toFixed(1)}초) · {cand.rankingScore}점
                                </div>
                              </div>
                              <span className="text-[10px] text-primary font-bold shrink-0 ml-2">선택</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 순위명 & 수치 입력 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs">
                <div className="md:col-span-8">
                  <input
                    type="text"
                    value={item.title}
                    placeholder="순위 항목 명칭"
                    onChange={e => updateItem(idx, 'title', e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-border bg-background font-bold text-foreground"
                  />
                </div>
                <div className="md:col-span-4">
                  <input
                    type="text"
                    value={item.statValue}
                    placeholder="통계/수치 (예: 30.4%)"
                    onChange={e => updateItem(idx, 'statValue', e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-border bg-background font-mono text-primary font-bold text-right"
                  />
                </div>
              </div>

              {/* 선정 이유 및 짧은 나레이션 해설 */}
              <div>
                <input
                  type="text"
                  value={item.description}
                  placeholder="선정 이유 및 짧은 해설 나레이션"
                  onChange={e => updateItem(idx, 'description', e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-border bg-background text-muted-foreground font-medium"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 블러 마스크 모달 */}
      {activeBlurModalItem && (
        <RankingBlurMaskModal
          isOpen={!!activeBlurModalItem}
          onClose={() => setActiveBlurModalItem(null)}
          rank={activeBlurModalItem.rank}
          itemTitle={activeBlurModalItem.title}
          thumbnailUrl={activeBlurModalItem.thumbnailUrl}
          blurRegions={activeBlurModalItem.blurRegions || []}
          onSaveBlurRegions={handleSaveBlur}
        />
      )}
    </div>
  );
};
