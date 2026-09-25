import React from 'react';
import { Sparkles, Clock, RefreshCw, Layers, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type CreativeStage = 'writing' | 'producing' | 'done';

interface TextCreativeHeaderProps {
  stage: CreativeStage;
  estimatedSeconds: number;
  sourceCount: number;
  hasResettableState: boolean;
  onResetAll: () => void;
  onStageChange?: (stage: CreativeStage) => void;
}

export const TextCreativeHeader: React.FC<TextCreativeHeaderProps> = ({
  stage,
  estimatedSeconds,
  sourceCount,
  hasResettableState,
  onResetAll,
  onStageChange
}) => {
  const stages: { key: CreativeStage; label: string; number: string }[] = [
    { key: 'writing', label: '대본 작성', number: '01' },
    { key: 'producing', label: '제작 진행', number: '02' },
    { key: 'done', label: '완성 릴', number: '03' }
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border/60 bg-muted/20">
        {/* 좌측: 스테이지 인디케이터 (픽셀링 Kb 완벽 복원) */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-border/80 bg-background/80 p-0.5 shadow-2xs">
            {stages.map(s => {
              const isActive = stage === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => onStageChange?.(s.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <span className="font-mono text-[10px] opacity-70">{s.number}</span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>

          {stage === 'producing' && (
            <Badge variant="outline" className="animate-pulse bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-bold gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              LIVE PRODUCING
            </Badge>
          )}
        </div>

        {/* 우측: 예상 시간, 감지된 소스 수, 전체 초기화 */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary" />
              예상 <b className="text-foreground">{estimatedSeconds}초</b>
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
              소스 <b className="text-foreground">{sourceCount}개</b> 감지
            </span>
          </div>

          {hasResettableState && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetAll}
              className="h-7 text-xs px-2.5 gap-1 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>전체 초기화</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
