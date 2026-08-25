import React from 'react';
import { Film, Send, Copy, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingBatchActionBarProps {
  selectedCount: number;
  onExportCapcut: () => void;
  onSendToPixeling: () => void;
  onCopyMeta: () => void;
  onDeleteSelected: () => void;
  isExporting?: boolean;
}

export const FloatingBatchActionBar: React.FC<FloatingBatchActionBarProps> = ({
  selectedCount,
  onExportCapcut,
  onSendToPixeling,
  onCopyMeta,
  onDeleteSelected,
  isExporting = false
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-20 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 backdrop-blur-xl bg-card/95 border border-primary/30 shadow-2xl rounded-2xl p-2 sm:px-4 sm:py-2.5 flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* 선택 개수 뱃지 */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] sm:text-xs font-bold text-foreground whitespace-nowrap">
          <span className="text-primary font-extrabold">{selectedCount}</span>개
        </span>
      </div>

      {/* 액션 버튼 그룹 */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-1 justify-end sm:justify-start">
        <Button
          type="button"
          size="sm"
          onClick={onExportCapcut}
          disabled={isExporting}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[11px] sm:text-xs shadow-xs rounded-xl h-8 px-2 sm:px-3 whitespace-nowrap"
        >
          <Film className="w-3 h-3 mr-1 shrink-0" />
          <span>CapCut 내보내기</span>
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={onSendToPixeling}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] sm:text-xs shadow-xs rounded-xl h-8 px-2 sm:px-3 whitespace-nowrap"
        >
          <Send className="w-3 h-3 mr-1 shrink-0" />
          <span className="hidden sm:inline">픽셀링 화면으로 전송</span>
          <span className="sm:hidden">픽셀링 전송</span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCopyMeta}
          className="border-border text-foreground font-semibold text-[11px] sm:text-xs rounded-xl h-8 px-2 sm:px-2.5 hidden sm:flex whitespace-nowrap"
        >
          <Copy className="w-3 h-3 mr-1 shrink-0" />
          <span>메타 복사</span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={onDeleteSelected}
          className="font-bold text-[11px] sm:text-xs rounded-xl h-8 px-2 sm:px-2.5 whitespace-nowrap"
          title="선택 항목 일괄 삭제"
        >
          <Trash2 className="w-3 h-3 sm:mr-1 shrink-0" />
          <span className="hidden sm:inline">삭제</span>
        </Button>
      </div>
    </div>
  );
};
