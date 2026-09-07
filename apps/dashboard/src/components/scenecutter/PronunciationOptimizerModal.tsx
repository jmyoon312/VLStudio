import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, Sparkles, Loader2, Volume2, Check, RotateCcw, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PronunciationDiff } from './types';

interface PronunciationOptimizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rawScript: string;
  targetLang: string;
  onApplyOptimized: (optimizedScript: string, appliedDiffs?: PronunciationDiff[]) => void;
}

export const PronunciationOptimizerModal: React.FC<PronunciationOptimizerModalProps> = ({
  open,
  onOpenChange,
  rawScript,
  targetLang,
  onApplyOptimized,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [optimizedText, setOptimizedText] = useState<string>('');
  const [diffs, setDiffs] = useState<PronunciationDiff[]>([]);
  const [activeDiffs, setActiveDiffs] = useState<Set<number>>(new Set());

  // 모달 열릴 때 자동 분석 요청
  useEffect(() => {
    if (open && rawScript.trim()) {
      handleAnalyze();
    }
  }, [open, rawScript]);

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const res = await api.post('/universal-cutter/optimize-pronunciation', {
        text: rawScript,
        language: targetLang || 'ko',
      });

      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        setOptimizedText(data.optimized || '');
        const diffList = data.diffs || [];
        setDiffs(diffList);
        setActiveDiffs(new Set(diffList.map((d: PronunciationDiff) => d.id)));
      } else {
        toast.error('발음 최적화 분석에 실패했습니다.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || '발음 최적화 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDiff = (id: number) => {
    setActiveDiffs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 활성화된 diff만 적용된 최종 텍스트 계산
  const computedOptimizedText = React.useMemo(() => {
    if (!optimizedText || diffs.length === 0) return rawScript;
    let result = rawScript;
    // 역순으로 치환하여 인덱스 유지
    for (const diff of diffs) {
      if (activeDiffs.has(diff.id)) {
        result = result.replace(diff.original_word, diff.replaced_word);
      }
    }
    return result;
  }, [rawScript, optimizedText, diffs, activeDiffs]);

  const handleApply = () => {
    const appliedDiffs = diffs.filter(d => activeDiffs.has(d.id));
    onApplyOptimized(computedOptimizedText, appliedDiffs);
    toast.success('TTS 자연스러운 발음 최적화가 대본에 적용되었습니다!');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-card text-card-foreground border-border shadow-2xl p-6 rounded-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="space-y-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Mic className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                TTS 자연스러운 발음 최적화기 (Side-by-Side Diff)
              </DialogTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={isLoading}
              className="h-8 text-xs rounded-xl"
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
              재분석
            </Button>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            숫자(123명 ➔ 백스물세 명), 기간(3일 ➔ 사흘), 통화($500 ➔ 오백 달러), 약어/단위 등을
            인공지능 TTS 엔진이 가장 자연스럽게 읽을 수 있는 구어체 표음 텍스트로 변환합니다.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center space-y-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs font-semibold">표준 분석 모델이 문맥과 숫자의 자연스러운 발음을 교정 중입니다...</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 space-y-4 py-2 overflow-hidden flex flex-col">
            {/* 좌우 2분할 뷰어 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
              {/* 좌측: 원본 대본 */}
              <div className="flex flex-col border border-border rounded-xl bg-muted/20 overflow-hidden">
                <div className="px-3.5 py-2 border-b border-border bg-muted/40 flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    📄 원본 대본 (수정 전)
                  </span>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {diffs.length}개 교정 지점 감지
                  </Badge>
                </div>
                <ScrollArea className="flex-1 p-3.5 text-xs leading-relaxed text-foreground font-sans">
                  <div className="whitespace-pre-wrap">{rawScript || '대본 내용이 없습니다.'}</div>
                </ScrollArea>
              </div>

              {/* 우측: TTS 발음 최적화 대본 */}
              <div className="flex flex-col border border-primary/30 rounded-xl bg-primary/5 overflow-hidden shadow-inner">
                <div className="px-3.5 py-2 border-b border-primary/20 bg-primary/10 flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    ✨ TTS 최적화 발음 대본 (구어체 교정본)
                  </span>
                  <Badge className="bg-primary text-primary-foreground text-[10px] h-5">
                    {activeDiffs.size}개 적용 중
                  </Badge>
                </div>
                <ScrollArea className="flex-1 p-3.5 text-xs leading-relaxed text-foreground font-sans">
                  <div className="whitespace-pre-wrap font-medium">{computedOptimizedText}</div>
                </ScrollArea>
              </div>
            </div>

            {/* 하단: 감지된 단어 교체 목록 칩 (Diff Chips) */}
            <div className="shrink-0 border border-border rounded-xl p-3 bg-card space-y-2">
              <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                🔍 감지된 단어 교체 리스트 (클릭하여 끄고 켤 수 있습니다):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {diffs.map((diff) => {
                  const isActive = activeDiffs.has(diff.id);
                  return (
                    <button
                      key={diff.id}
                      onClick={() => toggleDiff(diff.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                        isActive
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'bg-muted/40 border-border text-muted-foreground line-through opacity-50'
                      }`}
                      title={diff.reason || '클릭하여 적용/해제'}
                    >
                      <span className="line-through text-[11px]">{diff.original_word}</span>
                      <ArrowRight className="w-3 h-3 shrink-0" />
                      <span className="font-bold">{diff.replaced_word}</span>
                      {isActive && <Check className="w-3 h-3 text-emerald-500 ml-0.5" />}
                    </button>
                  );
                })}
                {diffs.length === 0 && (
                  <span className="text-xs text-muted-foreground py-1">
                    어색하게 읽힐 수 있는 특수문자나 숫자가 발견되지 않았습니다. 현재 대본 그대로 자연스럽습니다.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border shrink-0">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
            <span>선택된 교정 단어가 전체 대본 및 분할된 모든 씬의 나레이션에 일괄 반영됩니다.</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={isLoading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <Check className="w-3.5 h-3.5" />
              <span>✨ 최적화 발음 적용하기</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
