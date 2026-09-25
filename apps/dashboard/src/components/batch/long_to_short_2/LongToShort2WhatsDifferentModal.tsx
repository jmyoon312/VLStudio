import React from 'react';
import {
  Sparkles,
  Scissors,
  Layers,
  Smile,
  CheckCircle2,
  X,
  ArrowRight,
  Zap,
  Film
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LongToShort2WhatsDifferentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LongToShort2WhatsDifferentModal: React.FC<LongToShort2WhatsDifferentModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 모달 헤더 */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary text-primary-foreground text-xs font-bold border-none px-2.5 py-0.5">
                V2 SPECIAL
              </Badge>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-primary" />
                롱투숏2, 뭐가 다른가요?
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              기존 롱투숏은 구간을 잘라냈다면, 롱투숏2는 이야기를 요약합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 (비교 인포그래픽) */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* 1. 핵심 대조 카드: 기존 v1 vs 신규 v2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-muted-foreground" />
                  기존 롱투숏 (v1)
                </span>
                <Badge variant="secondary" className="text-[10px]">단순 슬라이싱</Badge>
              </div>
              <div className="text-xs font-semibold text-foreground">
                반응 좋은 구간을 통째로 잘라내기
              </div>
              <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                오디오 피크와 데시벨 에너지를 기준으로 30~58초 구간을 그대로 도려내어 앞뒤 맥락이 다소 뚝 끊길 수 있습니다.
              </p>
            </div>

            <div className="p-4 rounded-xl border-2 border-primary/40 bg-primary/5 space-y-3 relative overflow-hidden shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-primary" />
                  롱투숏2 (v2)
                </span>
                <Badge className="text-[10px] bg-primary text-primary-foreground">이야기 압축</Badge>
              </div>
              <div className="text-xs font-bold text-foreground">
                이야기를 이해하고 압축·요약하기
              </div>
              <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                서사의 흐름을 파악하여 도입·절정·마무리 핵심 컷만 선별하여 이어붙이므로 완결된 감동과 반전을 전달합니다.
              </p>
            </div>
          </div>

          {/* 2. 3대 차별점 상세 설명 (픽셀링 원천 kv 1:1) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              롱투숏2의 3대 핵심 혁신
            </h3>

            {/* 혁신 1: 자르기가 아니라 압축 */}
            <div className="p-3.5 rounded-xl border border-border bg-card hover:border-border/80 transition space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span className="font-bold text-xs text-foreground">자르기가 아니라 압축 (3단계 서사 연결)</span>
              </div>
              <p className="text-xs text-muted-foreground pl-7 leading-relaxed">
                한 이야기에서 <strong className="text-foreground">도입(Hook) ➔ 절정(Climax) ➔ 마무리(Resolution)</strong>의 핵심 장면만 추려 이어붙입니다.
              </p>
              <div className="pl-7 flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-1 rounded bg-muted text-muted-foreground">1분 30초 이야기</span>
                <ArrowRight className="w-3.5 h-3.5 text-primary" />
                <span className="px-2 py-1 rounded bg-primary/20 text-primary font-bold">맥락이 살아 있는 35초 쇼츠</span>
              </div>
            </div>

            {/* 혁신 2: 말 없는 하이라이트도 감지 */}
            <div className="p-3.5 rounded-xl border border-border bg-card hover:border-border/80 transition space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span className="font-bold text-xs text-foreground">말 없는 하이라이트도 포착</span>
              </div>
              <p className="text-xs text-muted-foreground pl-7 leading-relaxed">
                대사가 전혀 없어도 <strong className="text-foreground">표정, 행동, 몸짓, 반전 상황, 리액션</strong>만으로 재미있는 시각적 장면이면 AI 비전 렌즈가 놓치지 않고 선별합니다.
              </p>
            </div>

            {/* 혁신 3: 앞뒤가 잘리지 않는 완성형 에피소드 */}
            <div className="p-3.5 rounded-xl border border-border bg-card hover:border-border/80 transition space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span className="font-bold text-xs text-foreground">앞뒤가 잘리지 않는 완성형 에피소드</span>
              </div>
              <p className="text-xs text-muted-foreground pl-7 leading-relaxed">
                전체 맥락을 정밀 분석해 중간에 말이 끊기거나 문장이 잘려 나가는 어색함 없이 독립된 1편의 미니 작품으로 완성합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="px-5 h-9 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            확인했습니다
          </Button>
        </div>
      </div>
    </div>
  );
};
