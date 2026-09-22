import React from 'react';
import {
  Loader2,
  CheckCircle2,
  Sparkles,
  Scissors,
  Layers,
  Activity,
  Film
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProgressState } from '@/types/longToShort';

interface LongToShortProgressTrackerProps {
  progress: ProgressState;
}

const STAGES = [
  { id: 'probing', label: '1. 영상 분석', icon: Film },
  { id: 'transcribing', label: '2. 음성 전사', icon: Activity },
  { id: 'analyzing', label: '3. 씬/에너지 감지', icon: Scissors },
  { id: 'generating', label: '4. AI 후보 구성', icon: Sparkles },
  { id: 'completed', label: '5. 완료', icon: CheckCircle2 }
];

export const LongToShortProgressTracker: React.FC<LongToShortProgressTrackerProps> = ({
  progress
}) => {
  if (progress.stage === 'idle') return null;

  const currentStageIndex = (() => {
    switch (progress.stage) {
      case 'downloading':
      case 'probing':
        return 0;
      case 'transcribing':
        return 1;
      case 'analyzing':
        return 2;
      case 'generating':
        return 3;
      case 'completed':
        return 4;
      default:
        return 0;
    }
  })();

  return (
    <div className="p-3.5 rounded-xl border border-primary/30 bg-card shadow-xs space-y-3 animate-in fade-in duration-300">
      {/* 상단 텍스트 및 퍼센트 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-xs font-bold text-foreground">
            {progress.message}
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-primary">
          {progress.percent}%
        </span>
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      {/* 5단계 인디케이터 스텝 */}
      <div className="grid grid-cols-5 gap-1 pt-1">
        {STAGES.map((s, idx) => {
          const isDone = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;
          const Icon = s.icon;

          return (
            <div
              key={s.id}
              className={cn(
                "flex flex-col items-center gap-1 p-1 rounded-lg text-center transition",
                isCurrent && "bg-primary/10 border border-primary/30 text-primary font-bold",
                isDone && "text-emerald-600 dark:text-emerald-400 font-medium",
                !isCurrent && !isDone && "text-muted-foreground/60 opacity-60"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isCurrent && "animate-pulse")} />
              <span className="text-[9px] truncate w-full">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* 세부 안내 문구 */}
      {progress.detail && (
        <p className="text-[10px] text-muted-foreground text-center font-mono pt-1 border-t border-border/40">
          {progress.detail}
        </p>
      )}
    </div>
  );
};
