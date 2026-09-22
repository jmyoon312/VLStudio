import React, { useState } from 'react';
import {
  Layers,
  Upload,
  Sparkles,
  SlidersHorizontal,
  Clock,
  Film,
  CheckCircle2,
  Zap,
  FolderOpen,
  Share2,
  Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface LongformMultiTabProps {
  onAddBatchJobs: (jobs: any[]) => void;
}

export const LongformMultiTab: React.FC<LongformMultiTabProps> = ({ onAddBatchJobs }) => {
  const { toast } = useToast();

  const [longformTitle, setLongformTitle] = useState<string>('AI 대전환 시대의 생존 전략 특강 (1시간 15분)');
  const [videoSourceUrl, setVideoSourceUrl] = useState<string>('https://www.youtube.com/watch?v=longform-lecture');
  const [videoFileName, setVideoFileName] = useState<string>('');

  // 멀티 생성 옵션
  const [targetShortsCount, setTargetShortsCount] = useState<number>(5); // 3, 5, 10
  const [segmentationMode, setSegmentationMode] = useState<'topic' | 'speaker' | 'retention'>('topic');
  const [autoArchetypeDistribution, setAutoArchetypeDistribution] = useState<boolean>(true); // 4대 폼팩터 자동 분배

  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFileName(file.name);
      setLongformTitle(file.name.replace(/\.[^/.]+$/, ""));
      toast({ title: '대용량 롱폼 로드 완료', description: `'${file.name}' 영상이 등록되었습니다.` });
    }
  };

  const handleStartMultiBatch = async () => {
    setIsGenerating(true);
    try {
      const archetypes: ('classic' | 'instagram' | 'gunlimbo' | 'ssul')[] = ['classic', 'ssul', 'gunlimbo', 'instagram'];
      const newJobs = Array.from({ length: targetShortsCount }, (_, i) => {
        const arch = autoArchetypeDistribution ? archetypes[i % archetypes.length] : 'classic';
        const num = i + 1;
        return {
          id: `longform-multi-${Date.now()}-${num}`,
          title: `[롱폼멀티 #${num}] ${longformTitle.slice(0, 20)}... - 챕터 ${num}`,
          sourceType: 'video',
          archetype: arch,
          tabId: 'longform-multi',
          createdAt: new Date().toLocaleTimeString(),
          status: 'ready',
          scriptLinesCount: 4,
          metadata: {
            longformTitle,
            chapterIndex: num,
            segmentationMode,
            scenes: [
              { order: 1, narration: `${longformTitle}의 핵심 챕터 #${num} 하이라이트 요약입니다.`, hookJabText: `*챕터 #${num}*` },
              { order: 2, narration: `강연자의 핵심 통찰과 데이터 분석이 집중된 구간입니다.`, hookJabText: `*핵심 요약*` },
              { order: 3, narration: `전체 풀버전 영상은 채널에서 확인하세요.`, hookJabText: `*풀버전 링크*` }
            ]
          }
        };
      });

      onAddBatchJobs(newJobs);
      toast({
        title: '🚀 롱폼 멀티 생성 완료',
        description: `총 ${targetShortsCount}개의 독립 쇼츠 프로젝트가 하단 대기열에 일괄 등록되었습니다.`
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
        {/* 좌측 (4칸): 대용량 영상 및 분할 전략 */}
        <div className="lg:col-span-4 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              롱폼 멀티 챕터링 엔진
            </span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono">
              MULTI-PACKAGE
            </Badge>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">대용량 롱폼 영상 (강의/팟캐스트)</label>
            <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border bg-muted/20 hover:bg-muted/40 cursor-pointer text-xs text-foreground transition">
              <Upload className="w-4 h-4 text-primary" />
              <span className="truncate">{videoFileName || '대용량 영상 등록'}</span>
              <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
            </label>
            <input
              type="text"
              value={videoSourceUrl}
              onChange={e => setVideoSourceUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full text-xs p-2 rounded-lg border border-border bg-background mt-2"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">강의 / 롱폼 제목</label>
            <input
              type="text"
              value={longformTitle}
              onChange={e => setLongformTitle(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-border bg-background font-bold"
            />
          </div>

          {/* 3대 챕터링 분할 알고리즘 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-[11px] font-bold text-foreground block">AI 분할 챕터링 알고리즘</label>
            <div className="space-y-1.5">
              {[
                { id: 'topic', label: '주제별 AI 클러스터링', desc: '의미론적 주제 전환 감지' },
                { id: 'speaker', label: '화자 발화 전환 분할', desc: '질문과 답변 턴 기준 분리' },
                { id: 'retention', label: '시청 지속률 피크 구간', desc: '가장 몰입도 높은 에너지 구간' },
              ].map(sm => (
                <button
                  key={sm.id}
                  type="button"
                  onClick={() => setSegmentationMode(sm.id as any)}
                  className={cn(
                    "w-full text-left p-2 rounded-lg border text-xs transition cursor-pointer",
                    segmentationMode === sm.id
                      ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  <div>{sm.label}</div>
                  <div className="text-[10px] text-muted-foreground font-normal mt-0.5">{sm.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 중앙 및 우측 (8칸): 패키징 개수 & 폼팩터 분배 */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">1개 영상 ➔ N개 쇼츠 프로젝트 동시 패키징</span>
              </div>
              <Badge variant="outline" className="text-[10px] text-primary font-mono font-bold">
                BATCH CONVERT
              </Badge>
            </div>

            {/* 목표 쇼츠 수 */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-foreground block">목표 쇼츠 패키징 수량</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { count: 3, label: '3개 숏폼 패키지', desc: '초스피드 압축 요약' },
                  { count: 5, label: '5개 숏폼 패키지 (강추)', desc: '주요 챕터 완벽 커버' },
                  { count: 10, label: '10개 대량 패키지', desc: '풀 에피소드 전수 분할' },
                ].map(p => (
                  <button
                    key={p.count}
                    type="button"
                    onClick={() => setTargetShortsCount(p.count)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition cursor-pointer space-y-1",
                      targetShortsCount === p.count
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                        : "border-border hover:bg-muted/40 text-foreground"
                    )}
                  >
                    <div className="text-xs">{p.label}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4대 폼팩터 자동 균등 분배 */}
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">4대 폼팩터(클래식/썰형/군림보/인스타) 자동 순환 분배</span>
                <input
                  type="checkbox"
                  checked={autoArchetypeDistribution}
                  onChange={e => setAutoArchetypeDistribution(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                활성화 시 생성되는 숏폼마다 썰형, 클래식, 군림보, 인스타 스타일이 골고루 자동 배정되어 다양한 채널 알고리즘에 테스트할 수 있습니다.
              </p>
            </div>

            {/* 생성 미리보기 리스트 */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground block">생성될 프로젝트 대기열 슬롯 ({targetShortsCount}개)</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                {Array.from({ length: targetShortsCount }).map((_, i) => (
                  <div key={i} className="p-2.5 rounded-lg border border-border bg-background text-xs flex items-center justify-between">
                    <span className="font-bold truncate text-foreground">
                      챕터 #{i + 1}: {longformTitle.slice(0, 15)}...
                    </span>
                    <Badge variant="outline" className="text-[9.5px] font-mono shrink-0">
                      쇼츠 #{i + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              type="button"
              disabled={isGenerating}
              onClick={handleStartMultiBatch}
              className="w-full h-11 text-xs font-black gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>롱폼 1개 ➔ {targetShortsCount}개 쇼츠 동시 일괄 생성 (대기열 등록)</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
