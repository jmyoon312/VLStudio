import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Wand2, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PresetItem } from './types';

interface PresetGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPresetCreated: (newPreset: PresetItem) => void;
}

export const PresetGeneratorModal: React.FC<PresetGeneratorModalProps> = ({
  open,
  onOpenChange,
  onPresetCreated,
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [benchmarkChannel, setBenchmarkChannel] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('프롬프트나 지침서를 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/universal-cutter/generate-preset', {
        prompt: prompt.trim(),
        benchmark_channel: benchmarkChannel.trim() || undefined,
      });

      if (res.data?.success && res.data?.preset) {
        toast.success(`새 프리셋 [${res.data.preset.name}]이(가) 생성되었습니다!`);
        onPresetCreated(res.data.preset);
        onOpenChange(false);
        setPrompt('');
        setBenchmarkChannel('');
      } else {
        toast.error('프리셋 생성에 실패했습니다.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || '프리셋 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySample = (sampleText: string) => {
    setPrompt(sampleText);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card text-card-foreground border-border shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Wand2 className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              AI 커스텀 각색 프리셋 생성기
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            벤치마크하고 싶은 유튜버의 작업 지시서나 독창적인 기획 프롬프트를 입력하면,
            환경설정 표준 분석 모델이 분석하여 <b>새로운 원클릭 프리셋으로 자동 등록</b>합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              벤치마크 채널 / 참고 링크 (선택)
            </Label>
            <Input
              value={benchmarkChannel}
              onChange={(e) => setBenchmarkChannel(e.target.value)}
              placeholder="예: 넷플릭스 코리아, 지무비, 고몽 등"
              className="h-9 text-xs bg-background border-border rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                기획 프롬프트 / 연출 지침서 전문 *
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleApplySample(
                      '넷플릭스 범죄 스릴러 스타일로, 성우는 무겁고 차분하게 사건을 브리핑하듯 진행해줘. 15초마다 새로운 증거와 반전이 나오며, 충격적인 의문형으로 시청자를 끝까지 붙잡아야 해.'
                    )
                  }
                  className="h-6 text-[10px] px-2 text-primary hover:bg-primary/10 rounded-lg flex items-center gap-1"
                >
                  <Lightbulb className="w-3 h-3" />
                  샘플 1 (스릴러 다큐)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleApplySample(
                      '중독성 강한 틱톡 썰툰 스타일. 어이없는 실화 사연을 극도로 과장된 감탄사와 유머러스한 비유로 나레이션하고, 대사는 친구와 카톡하듯 찰진 반말로 구성해줘.'
                    )
                  }
                  className="h-6 text-[10px] px-2 text-primary hover:bg-primary/10 rounded-lg flex items-center gap-1"
                >
                  <Lightbulb className="w-3 h-3" />
                  샘플 2 (사연 썰툰)
                </Button>
              </div>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="자유롭게 연출 스타일, 어조, 타임코드 컷팅 주기, 자막 감성 등을 적어주세요..."
              rows={6}
              className="text-xs bg-background border-border rounded-xl resize-none font-sans leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border">
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
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI가 프리셋 구조화 분석 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>✨ 새 프리셋 자동 생성 및 등록</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
