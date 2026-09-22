import React, { useState } from 'react';
import {
  Sparkles,
  Upload,
  Layers,
  SlidersHorizontal,
  Film,
  Zap,
  CheckCircle2,
  Clock,
  Palette,
  Camera,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface StockMotionTabProps {
  onAddBatchJobs: (jobs: any[]) => void;
}

export const StockMotionTab: React.FC<StockMotionTabProps> = ({ onAddBatchJobs }) => {
  const { toast } = useToast();

  const [referenceUrl, setReferenceUrl] = useState<string>('https://www.youtube.com/shorts/JSBjWeSTfx4');
  const [motionTitle, setMotionTitle] = useState<string>('레퍼런스 스톡 타이포 모션');
  
  // 픽셀링 원천 프리셋 1:1 매칭
  const [stylePreset, setStylePreset] = useState<'bw-sketch' | 'pop-art' | 'comic-book' | 'vintage-film'>('bw-sketch');
  const [frameCount, setFrameCount] = useState<number>(8); // 4, 8, 12, 16
  const [frameDurationSec, setFrameDurationSec] = useState<number>(1.6); // 1.0s ~ 3.0s
  const [enableTypoMotion, setEnableTypoMotion] = useState<boolean>(true);
  const [enableSoundFx, setEnableSoundFx] = useState<boolean>(true);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleStartStockMotionBatch = async () => {
    setIsGenerating(true);
    try {
      const newJob = {
        id: `stock-motion-${Date.now()}`,
        title: `[스톡모션] ${motionTitle}`,
        sourceType: 'video',
        archetype: 'gunlimbo',
        tabId: 'stock-motion',
        createdAt: new Date().toLocaleTimeString(),
        status: 'ready',
        scriptLinesCount: frameCount,
        metadata: {
          referenceUrl,
          stylePreset,
          frameCount,
          frameDurationSec,
          enableTypoMotion,
          enableSoundFx,
          scenes: Array.from({ length: frameCount }, (_, i) => ({
            order: i + 1,
            narration: `${stylePreset} 필터 프레임 #${i + 1} 스톡모션 씬`,
            hookJabText: `*FRAME #${i + 1}*`,
            durationSec: frameDurationSec
          }))
        }
      };

      onAddBatchJobs([newJob]);
      toast({
        title: '✨ 스톡모션 쇼츠 생성 완료',
        description: `'${motionTitle}' (${stylePreset}, ${frameCount}프레임) 프로젝트가 대기열에 등록되었습니다.`
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: '생성 실패', description: e.message || '오류가 발생했습니다.' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 좌측 (4칸): 레퍼런스 및 스타일 프리셋 */}
        <div className="lg:col-span-4 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              스톡모션 & 타이포 그래픽
            </span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono">
              STOCK-MOTION JH
            </Badge>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">레퍼런스 쇼츠 URL</label>
            <input
              type="text"
              value={referenceUrl}
              onChange={e => setReferenceUrl(e.target.value)}
              placeholder="https://www.youtube.com/shorts/..."
              className="w-full text-xs p-2 rounded-lg border border-border bg-background"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">프로젝트 명칭</label>
            <input
              type="text"
              value={motionTitle}
              onChange={e => setMotionTitle(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-border bg-background font-bold"
            />
          </div>

          {/* 4대 비주얼 필터 프리셋 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-[11px] font-bold text-foreground block">아트 스타일 필터</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'bw-sketch', label: '✏️ 흑백 스케치', desc: '러프한 핸드 드로잉' },
                { id: 'pop-art', label: '🎨 팝아트 컬러', desc: '강렬한 대비 분할' },
                { id: 'comic-book', label: '💬 만화책 코믹', desc: '빈티지 도트 인쇄' },
                { id: 'vintage-film', label: '🎞️ 빈티지 필름', desc: '노스탤지어 그레인' },
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStylePreset(st.id as any)}
                  className={cn(
                    "p-2 rounded-lg border text-left text-xs transition cursor-pointer font-semibold",
                    stylePreset === st.id
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  <div>{st.label}</div>
                  <div className="text-[9.5px] text-muted-foreground font-normal">{st.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 프레임 수 및 지속 시간 */}
          <div className="space-y-2.5 pt-2 border-t border-border text-xs">
            <div className="flex justify-between">
              <span className="font-bold text-foreground">추출 프레임 수:</span>
              <span className="font-mono text-primary font-bold">{frameCount} 프레임</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[4, 8, 12, 16].map(cnt => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setFrameCount(cnt)}
                  className={cn(
                    "p-1.5 rounded border text-center text-xs font-mono font-bold transition",
                    frameCount === cnt ? "bg-primary/15 border-primary text-primary" : "border-border hover:bg-muted"
                  )}
                >
                  {cnt}
                </button>
              ))}
            </div>

            <div className="flex justify-between pt-1">
              <span className="font-bold text-foreground">프레임 지속 시간:</span>
              <span className="font-mono text-primary font-bold">{frameDurationSec}초</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="3.0"
              step="0.2"
              value={frameDurationSec}
              onChange={e => setFrameDurationSec(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        </div>

        {/* 중앙 및 우측 (8칸): 프레임 프리뷰 및 모션 옵션 */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">스톡 프레임 시퀀스 및 타이포 연출</span>
              </div>
              <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                TOTAL {(frameCount * frameDurationSec).toFixed(1)}s
              </Badge>
            </div>

            {/* 시뮬레이션 프레임 카드 그리드 */}
            <div className="grid grid-cols-4 gap-2.5">
              {Array.from({ length: frameCount }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg border border-border bg-muted/20 flex flex-col items-center justify-center p-2 text-center relative overflow-hidden"
                >
                  <span className="text-[10px] font-mono font-bold text-muted-foreground absolute top-1.5 left-2">
                    #{i + 1}
                  </span>
                  <Camera className="w-6 h-6 text-primary/60 mb-1" />
                  <span className="text-[10px] font-bold text-foreground truncate w-full">
                    {stylePreset}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {frameDurationSec}s
                  </span>
                </div>
              ))}
            </div>

            {/* 타이포 효과 스위치 */}
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">타이포그래피 스탬프 팝 모션 결합</span>
                <input
                  type="checkbox"
                  checked={enableTypoMotion}
                  onChange={e => setEnableTypoMotion(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">프레임 전환 시 페이퍼 셔터 SFX 사운드</span>
                <input
                  type="checkbox"
                  checked={enableSoundFx}
                  onChange={e => setEnableSoundFx(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              type="button"
              disabled={isGenerating}
              onClick={handleStartStockMotionBatch}
              className="w-full h-11 text-xs font-black gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>스톡모션 타이포 쇼츠 일괄 생성 (대기열 등록)</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
