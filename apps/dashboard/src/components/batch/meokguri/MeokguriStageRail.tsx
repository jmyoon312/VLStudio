import React from 'react';
import { MeokguriStage } from './types';
import { cn } from '@/lib/utils';
import { Layers, Sliders, CheckCircle2, ChevronRight } from 'lucide-react';

interface MeokguriStageRailProps {
  currentStage: MeokguriStage;
  onSelectStage: (stage: MeokguriStage) => void;
  canProceedToSettings?: boolean;
  canProceedToResult?: boolean;
}

const STAGES: { id: MeokguriStage; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: 'source', label: '1. 소재', hint: '원본과 레퍼런스 넣기', icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'settings', label: '2. 설정', hint: '자막·길이·음성 정하기', icon: <Sliders className="w-3.5 h-3.5" /> },
  { id: 'result', label: '3. 결과', hint: '완성본 확인하고 내보내기', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];

export const MeokguriStageRail: React.FC<MeokguriStageRailProps> = ({
  currentStage,
  onSelectStage
}) => {
  return (
    <nav
      aria-label="먹구리형 제작 단계"
      className="relative grid grid-cols-3 gap-2 rounded-2xl bg-muted/40 p-1.5 border border-border/80 shadow-xs"
      data-pixi-meokguri-stage-rail={currentStage}
    >
      {STAGES.map((s, idx) => {
        const isActive = s.id === currentStage;

        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelectStage(s.id)}
            aria-current={isActive ? 'step' : undefined}
            className={cn(
              "flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer",
              isActive
                ? "bg-background text-foreground shadow-sm border border-border font-bold ring-1 ring-primary/20"
                : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn(
                "p-1.5 rounded-lg flex items-center justify-center shrink-0 transition",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {s.icon}
              </span>
              <div className="min-w-0 truncate">
                <div className="text-xs leading-none truncate font-bold">{s.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate hidden sm:block">
                  {s.hint}
                </div>
              </div>
            </div>
            {idx < STAGES.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 hidden md:block" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
