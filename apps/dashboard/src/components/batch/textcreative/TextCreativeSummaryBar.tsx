import React from 'react';
import { Plus, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductionTarget } from './TextCreativeDirectingStep';

interface TextCreativeSummaryBarProps {
  canAddJob: boolean;
  estimatedSeconds: number;
  linkCount: number;
  fileCount: number;
  scriptLineCount: number;
  productionTarget: ProductionTarget;
  isAdding: boolean;
  onAddJob: () => void;
  queueCount: number;

  // [Phase 2 NEW] 실시간 세부 칩 반영
  focusPersonCount: number;
  toneLabel: string;
  includeComments: boolean;
  commentLabel: string;
  voiceLabel?: string;
}

export const TextCreativeSummaryBar: React.FC<TextCreativeSummaryBarProps> = ({
  canAddJob,
  estimatedSeconds,
  linkCount,
  fileCount,
  scriptLineCount,
  productionTarget,
  isAdding,
  onAddJob,
  queueCount,
  focusPersonCount,
  toneLabel,
  includeComments,
  commentLabel,
  voiceLabel
}) => {
  const targetLabels: Record<ProductionTarget, string> = {
    ssul: '썰형',
    classic: '클래식',
    gunlimbo: '군림보',
    instagram: '인스타'
  };

  return (
    <div className="sticky bottom-0 z-20 rounded-xl border border-border bg-card/95 backdrop-blur-md p-3.5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* 좌측: 실시간 예상치 및 요소 요약 칩 (픽셀링 Yl 로직 100% 실체화) */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            예상 영상 길이: <b className="text-primary">{estimatedSeconds}초</b>
          </span>

          <span className="text-border">|</span>

          {/* 구성 요소 칩들 */}
          {scriptLineCount > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              <Badge variant="outline" className="text-[10px] bg-muted/60 text-foreground border-border font-medium">
                대본 {scriptLineCount}줄
              </Badge>
              {linkCount > 0 && (
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-medium">
                  링크 {linkCount}개
                </Badge>
              )}
              {fileCount > 0 && (
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-medium">
                  파일 {fileCount}개
                </Badge>
              )}
              {focusPersonCount > 0 && (
                <Badge variant="outline" className="text-[10px] bg-primary/15 text-primary border-primary/40 font-bold">
                  주인공 {focusPersonCount}명
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] bg-muted/60 text-foreground border-border">
                {toneLabel}
              </Badge>
              {includeComments && (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold">
                  {commentLabel}
                </Badge>
              )}
              {voiceLabel && (
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-bold">
                  {voiceLabel}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] bg-muted/60 text-muted-foreground border-border">
                {targetLabels[productionTarget]} 템플릿
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              대본을 입력하면 작업 추가가 활성화됩니다
            </span>
          )}
        </div>

        {/* 우측: 작업 추가 메인 버튼 */}
        <div className="flex items-center gap-3">
          {queueCount > 0 && (
            <span className="hidden sm:inline-block font-mono text-xs text-muted-foreground">
              대기열 <b className="text-foreground">{queueCount}건</b>
            </span>
          )}

          <Button
            type="button"
            disabled={!canAddJob || isAdding}
            onClick={onAddJob}
            className="h-10 px-5 text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? '작업 등록 중...' : '작업 추가 (대기열 등록)'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
