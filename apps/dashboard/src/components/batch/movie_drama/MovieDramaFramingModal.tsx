import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sliders, Eye, RefreshCw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FramingCut {
  cutId: string;
  focusX: number; // 0.0 ~ 1.0 (0.5 = center)
  focusY: number;
  tracking?: { mode: string };
}

interface MovieDramaFramingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateTitle: string;
  sourceCuts: Array<{ id: string; durationMs: number; reason?: string }>;
  currentFraming: FramingCut[];
  onSaveFraming: (newFraming: FramingCut[]) => Promise<void>;
  isSaving: boolean;
}

export const MovieDramaFramingModal: React.FC<MovieDramaFramingModalProps> = ({
  open,
  onOpenChange,
  candidateTitle,
  sourceCuts,
  currentFraming,
  onSaveFraming,
  isSaving
}) => {
  const [framingData, setFramingData] = useState<FramingCut[]>(() => {
    return sourceCuts.map(cut => {
      const existing = currentFraming.find(f => f.cutId === cut.id);
      return {
        cutId: cut.id,
        focusX: existing ? existing.focusX : 0.5,
        focusY: existing ? existing.focusY : 0.5,
        tracking: { mode: 'manual_fixed' }
      };
    });
  });

  const [selectedCutIndex, setSelectedCutIndex] = useState<number>(0);

  const activeCut = sourceCuts[selectedCutIndex] || sourceCuts[0];
  const activeFraming = framingData[selectedCutIndex] || { cutId: activeCut?.id, focusX: 0.5, focusY: 0.5 };

  const handleFocusXChange = (val: number) => {
    setFramingData(prev =>
      prev.map((item, idx) => (idx === selectedCutIndex ? { ...item, focusX: val } : item))
    );
  };

  const handleResetToCenter = () => {
    handleFocusXChange(0.5);
  };

  const handleSave = async () => {
    await onSaveFraming(framingData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl p-6">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Sliders className="size-4 text-primary" />
                <span>9:16 인물 중심 화면 프레이밍 조정</span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {candidateTitle}
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] bg-muted/40 font-mono">
              MANUAL RE-FRAME
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 컷 선택 가로 탭 바 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
            {sourceCuts.map((cut, idx) => (
              <button
                key={cut.id}
                type="button"
                onClick={() => setSelectedCutIndex(idx)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer",
                  selectedCutIndex === idx
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                장면 {idx + 1} ({Math.round(cut.durationMs / 1000)}초)
              </button>
            ))}
          </div>

          {/* 9:16 뷰포트 인터랙티브 프리뷰 박스 */}
          <div className="relative mx-auto aspect-[9/16] w-full max-w-[200px] overflow-hidden rounded-2xl bg-muted/80 dark:bg-neutral-950 border border-border shadow-xl flex items-center justify-center">
            {/* 가상의 16:9 와이드 영상 배경 */}
            <div
              className="absolute inset-y-0 w-[300%] bg-gradient-to-r from-muted via-accent to-muted transition-transform duration-150 flex items-center justify-center text-foreground/50 text-[10px]"
              style={{
                transform: `translateX(${-(activeFraming.focusX * 100 - 50)}%)`
              }}
            >
              <div className="flex flex-col items-center gap-1">
                <Eye className="size-6 text-primary animate-pulse" />
                <span className="font-bold text-foreground text-xs">장면 {selectedCutIndex + 1} 화면</span>
                <span className="text-[9px] text-muted-foreground">인물 중심 X: {Math.round(activeFraming.focusX * 100)}%</span>
              </div>
            </div>

            {/* 9:16 세이프 가이드 박스 */}
            <div className="pointer-events-none absolute inset-2 rounded-xl border border-primary/40 border-dashed" />
            <div className="pointer-events-none absolute bottom-3 px-2 py-0.5 rounded bg-background/85 backdrop-blur-xs text-[10px] text-foreground border border-border/60 shadow-xs">
              9:16 화면 영역
            </div>
          </div>

          {/* 슬라이더 제어 컨트롤 */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">가로 중심 위치 (Focus X)</span>
              <span className="font-mono text-primary font-bold">{Math.round(activeFraming.focusX * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={activeFraming.focusX}
              onChange={e => handleFocusXChange(parseFloat(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>좌측 집중 (0.1)</span>
              <button
                type="button"
                onClick={handleResetToCenter}
                className="hover:underline text-primary cursor-pointer font-medium flex items-center gap-1"
              >
                <RefreshCw className="size-2.5" />
                정중앙(50%) 리셋
              </button>
              <span>우측 집중 (0.9)</span>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-xl text-xs font-bold"
          >
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={handleSave}
            className="h-9 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
          >
            <Check className="size-3.5" />
            <span>{isSaving ? '저장 중...' : '화면 조정 저장'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
