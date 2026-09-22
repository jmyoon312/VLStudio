import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LongToShortOverlapModalProps {
  isOpen: boolean;
  maxCandidates: number;
  requestedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const LongToShortOverlapModal: React.FC<LongToShortOverlapModalProps> = ({
  isOpen,
  maxCandidates,
  requestedCount,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="text-sm font-bold text-foreground">
              구간 중복 허용 안내
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            현재 등록된 영상의 길이로는 이야기의 완결성을 해치지 않고 중복 없이 뽑을 수 있는 킬러 쇼츠가 최대 <strong className="text-foreground">{maxCandidates}개</strong>입니다.
          </p>
          <p>
            요청하신 <strong className="text-primary">{requestedCount}개</strong>를 모두 생성하려면 일부 장면이 다른 쇼츠와 겹쳐서 추출될 수 있습니다.
          </p>
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-foreground font-medium text-[11px]">
            💡 <strong>중복 허용 시:</strong> 도입부나 핵심 결말 장면을 서로 다른 시점/호흡으로 변주하여 최대한 다양한 각도로 분할합니다.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="text-xs cursor-pointer border-border"
          >
            취소 ({maxCandidates}개로 유지)
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            className="text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            네, 겹쳐도 최대한 채우기
          </Button>
        </div>
      </div>
    </div>
  );
};
