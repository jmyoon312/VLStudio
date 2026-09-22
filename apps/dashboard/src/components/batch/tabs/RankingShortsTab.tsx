import React, { useState } from 'react';
import {
  Award,
  Crown,
  Sparkles,
  Flame,
  Volume2,
  Clock,
  Layers,
  CheckCircle2,
  SlidersHorizontal,
  Zap,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface RankingItem {
  rank: number;
  title: string;
  statValue: string;
  description: string;
}

interface RankingShortsTabProps {
  onAddBatchJobs: (jobs: any[]) => void;
}

export const RankingShortsTab: React.FC<RankingShortsTabProps> = ({ onAddBatchJobs }) => {
  const { toast } = useToast();

  const [rankingTopic, setRankingTopic] = useState<string>('한국인이 가장 사랑하는 배달 야식 TOP 5');
  const [bandStyle, setBandStyle] = useState<'neon-gold' | 'cyber-blue' | 'flame-red' | 'dark-minimal'>('neon-gold');
  const [countdownSfxEnabled, setCountdownSfxEnabled] = useState<boolean>(true);
  const [finaleSpecialEffect, setFinaleSpecialEffect] = useState<boolean>(true); // 1위 공개 시 폭죽 및 황금 트로피

  // TOP 5 아이템 (5위부터 1위 역순 카운트다운)
  const [rankingItems, setRankingItems] = useState<RankingItem[]>([
    { rank: 5, title: '보쌈 & 족발', statValue: '선호도 11.2%', description: '쫀득한 식감과 푸짐한 쌈의 조화' },
    { rank: 4, title: '피자 & 파스타', statValue: '선호도 14.8%', description: '치즈가 듬뿍 들어간 불패의 야식' },
    { rank: 3, title: '매운 떡볶이 & 튀김', statValue: '선호도 19.5%', description: '스트레스 한 방에 날리는 칼칼한 매운맛' },
    { rank: 2, title: '삼겹살 구이 배달', statValue: '선호도 24.1%', description: '구워져서 바로 오는 최고의 소주 안주' },
    { rank: 1, title: '후라이드 & 양념 치킨', statValue: '선호도 30.4%', description: '부동의 1위! 치맥의 절대 강자' },
  ]);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const updateItem = (index: number, field: keyof RankingItem, val: string) => {
    setRankingItems(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: val } : item));
  };

  const handleStartRankingBatch = async () => {
    setIsGenerating(true);
    try {
      const newJob = {
        id: `ranking-${Date.now()}`,
        title: `[랭킹쇼츠] ${rankingTopic}`,
        sourceType: 'script',
        archetype: 'gunlimbo',
        tabId: 'ranking-shorts',
        createdAt: new Date().toLocaleTimeString(),
        status: 'ready',
        scriptLinesCount: rankingItems.length,
        metadata: {
          rankingTopic,
          bandStyle,
          countdownSfxEnabled,
          finaleSpecialEffect,
          items: rankingItems,
          scenes: rankingItems.map(item => ({
            order: 6 - item.rank, // 5위부터 시작
            narration: `${item.rank}위는 바로 ${item.title}! ${item.description} (${item.statValue})`,
            hookJabText: `*TOP ${item.rank}*`,
            rank: item.rank
          }))
        }
      };

      onAddBatchJobs([newJob]);
      toast({
        title: '🏆 랭킹형 쇼츠 생성 완료',
        description: `'${rankingTopic}' 5단계 카운트다운 프로젝트가 대기열에 등록되었습니다.`
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
        {/* 좌측 (4칸): 랭킹 테마 & 밴드 디자인 */}
        <div className="lg:col-span-4 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-primary" />
              랭킹 카운트다운 & 밴드 연출
            </span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono">
              TOP 5 SEQUENCER
            </Badge>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">랭킹 주제 제목</label>
            <input
              type="text"
              value={rankingTopic}
              onChange={e => setRankingTopic(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-border bg-background font-bold"
            />
          </div>

          {/* 4대 랭킹 밴드 디자인 테마 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-[11px] font-bold text-foreground block">상단 순위 밴드 스타일</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'neon-gold', label: '👑 네온 골드', desc: '황금빛 럭셔리 테마' },
                { id: 'cyber-blue', label: '⚡ 사이버 블루', desc: '테크 & 미래지향 네온' },
                { id: 'flame-red', label: '🔥 불꽃 레드', desc: '강렬한 긴장감과 집중' },
                { id: 'dark-minimal', label: '🖤 다크 미니멀', desc: '세련된 무채색' },
              ].map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBandStyle(b.id as any)}
                  className={cn(
                    "p-2 rounded-lg border text-left text-xs transition cursor-pointer font-semibold",
                    bandStyle === b.id
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  <div>{b.label}</div>
                  <div className="text-[9.5px] text-muted-foreground font-normal">{b.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 오디오 카운트다운 & 1위 피날레 */}
          <div className="space-y-2.5 pt-2 border-t border-border text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">5-4-3-2-1 긴장감 비프 SFX</span>
              <input
                type="checkbox"
                checked={countdownSfxEnabled}
                onChange={e => setCountdownSfxEnabled(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">1위 공개 시 황금 폭죽 피날레</span>
              <input
                type="checkbox"
                checked={finaleSpecialEffect}
                onChange={e => setFinaleSpecialEffect(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 중앙 및 우측 (8칸): 5위~1위 순위별 정보 입력기 */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-foreground">5위 ➔ 1위 역순 카운트다운 리스트 편집</span>
              </div>
              <span className="text-xs text-muted-foreground">
                총 <strong className="text-primary">{rankingItems.length}</strong>개 순위 항목
              </span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {rankingItems.map((item, idx) => {
                const isFirst = item.rank === 1;
                return (
                  <div
                    key={item.rank}
                    className={cn(
                      "p-3 rounded-xl border transition space-y-2",
                      isFirst
                        ? "bg-amber-500/10 border-amber-500/50 shadow-2xs"
                        : "bg-muted/20 border-border"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black",
                          isFirst ? "bg-amber-500 text-black" : "bg-primary text-primary-foreground"
                        )}>
                          {item.rank}
                        </span>
                        <span className="text-xs font-black text-foreground">
                          {item.rank}위 {isFirst && '🏆 (하이라이트 피날레)'}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={item.statValue}
                        placeholder="통계 / 수치 (예: 30.4%)"
                        onChange={e => updateItem(idx, 'statValue', e.target.value)}
                        className="text-xs p-1 px-2 rounded border border-border bg-background font-mono text-primary font-bold text-right"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.title}
                        placeholder="순위 항목 명칭"
                        onChange={e => updateItem(idx, 'title', e.target.value)}
                        className="text-xs p-2 rounded border border-border bg-background font-bold text-foreground"
                      />
                      <input
                        type="text"
                        value={item.description}
                        placeholder="선정 이유 및 짧은 해설"
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                        className="text-xs p-2 rounded border border-border bg-background text-muted-foreground"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              type="button"
              disabled={isGenerating}
              onClick={handleStartRankingBatch}
              className="w-full h-11 text-xs font-black gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>TOP 5 랭킹 카운트다운 쇼츠 생성 (대기열 등록)</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
