import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LongToShort2OverlapModalProps {
  isOpen: boolean;
  requestedCount: number;
  maxUniqueCount: number;
  durationLabel: string;
  onConfirm: (allowOverlap: boolean) => void;
  onClose: () => void;
}

export const LongToShort2OverlapModal: React.FC<LongToShort2OverlapModalProps> = ({
  isOpen,
  requestedCount,
  maxUniqueCount,
  durationLabel,
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">구간 중복 허용 여부 확인</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {durationLabel} 원본 영상 분석 안내
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-foreground leading-relaxed space-y-2">
          <p>
            현재 영상 길이({durationLabel})로는 중복 없이 최대 <strong className="text-amber-600 dark:text-amber-400">{maxUniqueCount}개</strong>까지 완결 서사를 만들 수 있습니다.
          </p>
          <p className="text-muted-foreground text-[11px]">
            요청하신 <strong className="text-foreground">{requestedCount}개</strong>를 모두 채우려면 일부 좋은 장면이나 맥락이 서로 겹칠 수 있습니다. 겹치더라도 목표 개수를 채우시겠습니까?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onConfirm(false);
              onClose();
            }}
            className="h-10 text-xs font-bold border-border hover:bg-muted cursor-pointer"
          >
            겹치지 않는 것만 ({maxUniqueCount}개)
          </Button>

          <Button
            type="button"
            onClick={() => {
              onConfirm(true);
              onClose();
            }}
            className="h-10 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
          >
            네, 겹쳐도 최대한 채우기 ({requestedCount}개)
          </Button>
        </div>
      </div>
    </div>
  );
};
