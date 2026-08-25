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
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 backdrop-blur-md bg-card/95 border border-primary/40 shadow-2xl rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-[95vw]">
      <div className="flex items-center gap-2 pr-2 border-r border-border">
        <CheckCircle2 className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-foreground">
          선택 <span className="text-primary font-extrabold">{selectedCount}</span>개
        </span>
      </div>

      <Button
        type="button"
        size="sm"
        onClick={onExportCapcut}
        disabled={isExporting}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 rounded-xl h-9"
      >
        <Film className="w-3.5 h-3.5" />
        <span>일괄 CapCut 내보내기</span>
      </Button>

      <Button
        type="button"
        size="sm"
        onClick={onSendToPixeling}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 rounded-xl h-9"
      >
        <Send className="w-3.5 h-3.5" />
        <span>📤 픽셀링 메타 화면으로 전송</span>
      </Button>

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onCopyMeta}
        className="border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-xs rounded-xl h-9"
      >
        <Copy className="w-3.5 h-3.5 mr-1" />
        <span>메타 텍스트 복사</span>
      </Button>

      <Button
        type="button"
        size="sm"
        variant="destructive"
        onClick={onDeleteSelected}
        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl h-9"
      >
        <Trash2 className="w-3.5 h-3.5 mr-1" />
        <span>일괄 삭제</span>
      </Button>
    </div>
  );
};
