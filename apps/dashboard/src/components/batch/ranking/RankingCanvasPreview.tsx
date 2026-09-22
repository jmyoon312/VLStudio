import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Award,
  Crown,
  Volume2,
  CheckCircle2,
  Tv
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  RankingItem,
  RankingOptions,
  RANKING_TEMPLATES,
  HeaderBarShape
} from '@/types/ranking';
import { playSfxWebAudio } from '@/config/sfxCatalog';

interface RankingCanvasPreviewProps {
  headline: string;
  subtitle: string;
  items: RankingItem[];
  options: RankingOptions;
  onStartFinalBatch: () => void;
  isSubmitting: boolean;
}

export const RankingCanvasPreview: React.FC<RankingCanvasPreviewProps> = ({
  headline,
  subtitle,
  items,
  options,
  onStartFinalBatch,
  isSubmitting
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [isBlackout, setIsBlackout] = useState<boolean>(false);

  // 순서 정렬 (reverse: 5위 -> 1위 카운트다운)
  const sortedItems = [...items].sort((a, b) =>
    options.order === 'reverse' ? b.rank - a.rank : a.rank - b.rank
  );

  const currentItem = sortedItems[activeItemIndex] || sortedItems[0];
  const isFirstRank = currentItem?.rank === 1;

  // 헤더바 캔버스 2D 드로잉
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 크기: 1080 x 1920 기준
    const w = canvas.width;
    const h = canvas.height;

    // 1. 배경 클리어
    ctx.clearRect(0, 0, w, h);

    // 2. 가상 비디오 배경 (그라데이션)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.5, '#1e293b');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 3. 상단 헤더바(배경 띠) 드로잉
    const barWidth = w * 0.9;
    const barHeight = Math.max(140, Math.min(280, (options.shape === 'pill' ? 160 : 180)));
    const barX = (w - barWidth) / 2;
    const barY = 120;

    ctx.save();
    ctx.fillStyle = options.headerBackgroundColor || '#111111';
    ctx.strokeStyle = options.strokeColor || '#000000';
    ctx.lineWidth = 6;

    const shape = options.shape;
    if (shape === 'pill') {
      const radius = barHeight / 2;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, radius);
      ctx.fill();
      ctx.stroke();
    } else if (shape === 'rounded') {
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, 28);
      ctx.fill();
      ctx.stroke();
    } else if (shape === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(w / 2, barY + barHeight / 2, barWidth / 2, barHeight / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // rect
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
    ctx.restore();

    // 4. 헤더 대제목 & 부제목 텍스트
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 대제목
    ctx.font = 'bold 58px "Pretendard", "Apple SD Gothic Neo", sans-serif';
    ctx.fillStyle = options.headlineColor || '#FFE45C';
    ctx.fillText(headline || '역대급 랭킹', w / 2, barY + barHeight * 0.38);

    // 부제목
    ctx.font = 'bold 36px "Pretendard", "Apple SD Gothic Neo", sans-serif';
    ctx.fillStyle = options.subtitleColor || '#FFFFFF';
    ctx.fillText(subtitle || 'TOP 5 SPECIAL', w / 2, barY + barHeight * 0.72);
    ctx.restore();

    // 5. 순위 표시 모드에 따른 렌더링
    if (options.rankDisplayMode === 'cumulative') {
      // 누적 순위 리스트 박스 드로잉 (상단 우측 미니 리스트)
      ctx.save();
      const listStartX = w - 320;
      const listStartY = barY + barHeight + 40;
      sortedItems.forEach((it, idx) => {
        const isCurrent = idx === activeItemIndex;
        const y = listStartY + idx * 64;

        ctx.fillStyle = isCurrent ? options.accentColor : 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(listStartX, y, 260, 48, 12);
        ctx.fill();

        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = isCurrent ? '#000000' : '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText(`TOP ${it.rank}  ${it.title.slice(0, 8)}`, listStartX + 16, y + 26);
      });
      ctx.restore();
    }

    // 6. 중앙 메인 순위 뱃지 (TOP N)
    if (currentItem) {
      ctx.save();
      const badgeY = h * 0.68;
      ctx.textAlign = 'center';

      // 순위 큰 타이틀
      ctx.font = '900 84px sans-serif';
      ctx.fillStyle = isFirstRank ? '#F59E0B' : options.accentColor;
      ctx.fillText(
        isFirstRank ? `👑 1위 (피날레)` : `${currentItem.rank}위`,
        w / 2,
        badgeY
      );

      // 항목 명칭 & 수치
      ctx.font = 'bold 54px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(
        `${currentItem.title} ${currentItem.statValue ? `(${currentItem.statValue})` : ''}`,
        w / 2,
        badgeY + 85
      );

      // 본문 나레이션 자막 박스 (하단)
      const subBoxWidth = w * 0.88;
      const subBoxHeight = 160;
      const subBoxX = (w - subBoxWidth) / 2;
      const subBoxY = h * 0.82;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(subBoxX, subBoxY, subBoxWidth, subBoxHeight, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '500 38px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(currentItem.description || '선정 이유 해설 자막', w / 2, subBoxY + 80);
      ctx.restore();
    }
  }, [headline, subtitle, currentItem, options, activeItemIndex, sortedItems, isFirstRank]);

  // 카운트다운 타임라인 재생 시뮬레이션
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        // 순위 전환 시 검은 화면 암전 처리
        if (options.transitionBlackoutMs > 0) {
          setIsBlackout(true);
          setTimeout(() => setIsBlackout(false), options.transitionBlackoutMs);
        }

        // 효과음 사운드 재생
        if (options.transitionSound) {
          if (options.transitionSoundStyle === 'click') {
            playSfxWebAudio('sfx_pixeling_type');
          } else if (options.transitionSoundStyle === 'whoosh') {
            playSfxWebAudio('sfx_cinematic_boom');
          } else {
            playSfxWebAudio('sfx_punch_hit');
          }
        }

        setActiveItemIndex(prev => {
          if (prev >= sortedItems.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 3500); // 3.5초마다 다음 순위로 전환
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, sortedItems.length, options.transitionSound, options.transitionSoundStyle, options.transitionBlackoutMs]);

  return (
    <div className="space-y-4 flex flex-col justify-between h-full text-xs">
      <div className="space-y-3">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
            <Tv className="w-3.5 h-3.5 text-primary" />
            9:16 모바일 쇼츠 실시간 프리뷰
          </span>
          <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 dark:text-amber-400">
            {isFirstRank ? '👑 1위 피날레' : `TOP ${currentItem?.rank || 1}`}
          </Badge>
        </div>

        {/* 9:16 캔버스 컨테이너 */}
        <div className="relative mx-auto w-[240px] h-[426px] rounded-2xl overflow-hidden shadow-2xl border-2 border-border/80 bg-black flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={1080}
            height={1920}
            className="w-full h-full object-contain pointer-events-none"
          />

          {/* 검은 화면 암전 오버레이 (transitionBlackoutMs) */}
          {isBlackout && (
            <div className="absolute inset-0 bg-black z-30 pointer-events-none animate-in fade-in duration-75" />
          )}

          {/* 1위 폭죽 피날레 이펙트 */}
          {isFirstRank && (
            <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none z-20">
              <Sparkles className="w-6 h-6 text-amber-400 animate-bounce" />
              <Crown className="w-8 h-8 text-amber-400 animate-pulse" />
              <Sparkles className="w-6 h-6 text-amber-400 animate-bounce" />
            </div>
          )}
        </div>

        {/* 하단 재생 / 탐색 컨트롤 바 */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
              className="h-8 px-2.5 text-xs font-bold gap-1 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? '일시정지' : '순위 재생'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => { setIsPlaying(false); setActiveItemIndex(0); }}
              className="h-8 w-8 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex gap-1">
            {sortedItems.map((it, idx) => (
              <button
                key={it.id || it.rank}
                type="button"
                onClick={() => { setIsPlaying(false); setActiveItemIndex(idx); }}
                className={cn(
                  "w-6 h-6 rounded-md text-[10px] font-black transition cursor-pointer flex items-center justify-center",
                  activeItemIndex === idx
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {it.rank}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 최종 일괄 발주 버튼 */}
      <div className="pt-2">
        <Button
          type="button"
          disabled={isSubmitting || items.length === 0}
          onClick={onStartFinalBatch}
          className="w-full h-12 text-xs font-black gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition cursor-pointer"
        >
          <Award className="w-4 h-4" />
          <span>
            {isSubmitting
              ? 'CapCut 초안 조립 및 렌더링 등록 중...'
              : `🏆 TOP ${items.length} 랭킹 쇼츠 최종 생성 발주`}
          </span>
        </Button>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">
          CapCut 프로젝트 자동 조립 및 로컬 렌더링(05_Exports) 직결
        </p>
      </div>
    </div>
  );
};
