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
  sourceVideo?: any;
  onStartFinalBatch: () => void;
  isSubmitting: boolean;
}

export const RankingCanvasPreview: React.FC<RankingCanvasPreviewProps> = ({
  headline,
  subtitle,
  items,
  options,
  sourceVideo,
  onStartFinalBatch,
  isSubmitting
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [isBlackout, setIsBlackout] = useState<boolean>(false);
  const [imageReloadTrigger, setImageReloadTrigger] = useState<number>(0);

  // 순서 정렬 (reverse: 5위 -> 1위 카운트다운)
  const sortedItems = [...items].sort((a, b) =>
    options.order === 'reverse' ? b.rank - a.rank : a.rank - b.rank
  );

  const currentItem = sortedItems[activeItemIndex] || sortedItems[0];
  const isFirstRank = currentItem?.rank === 1;

  // 방송급 고품질 9:16 모바일 쇼츠 캔버스 2D 드로잉
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

    // 2. 폰트 패밀리 결정
    const fontName = options.fontFamily === 'do-hyeon'
      ? '"Do Hyeon", "배달의민족 도현", sans-serif'
      : options.fontFamily === 'black-han-sans'
      ? '"Black Han Sans", "검은고딕", sans-serif'
      : options.fontFamily === 'noto-sans-kr'
      ? '"Noto Sans KR", sans-serif'
      : '"Pretendard", "Apple SD Gothic Neo", sans-serif';

    // 3. 비디오 썸네일 탐색 (currentItem 우선, 없으면 선택된 원본 영상 썸네일 폴백)
    const rawThumb = currentItem?.thumbnailUrl || sourceVideo?.thumbnailUrl || sourceVideo?.metadata?.thumbnailUrl || '';
    const thumbUrl = rawThumb;

    // 3.1 앰비언트 가우시안 블러 배경 + 중앙 16:9 섀도우 비디오 카드 드로잉
    if (thumbUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = thumbUrl;

      if (img.complete && img.naturalWidth > 0) {
        // [A. 앰비언트 가우시안 블러 백그라운드]
        ctx.save();
        ctx.filter = 'blur(35px) brightness(0.4)';
        // 캔버스 외곽 여유있게 오버사이즈 드로잉
        ctx.drawImage(img, -60, -60, w + 120, h + 120);
        ctx.restore();

        // 어두운 비네팅 그라디언트 오버레이 (상하단 가독성 보장)
        const vignette = ctx.createLinearGradient(0, 0, 0, h);
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
        vignette.addColorStop(0.3, 'rgba(0, 0, 0, 0.2)');
        vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);

        // [B. 중앙 16:9 플로팅 섀도우 비디오 카드]
        const cardW = w * 0.92;
        const cardH = cardW * (9 / 16); // 517.5px (16:9 비율)
        const cardX = (w - cardW) / 2;
        const cardY = 330;

        ctx.save();
        // 3D 드롭 섀도우
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 45;
        ctx.shadowOffsetY = 15;

        // 둥근 모서리 클리핑
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 28);
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.restore(); // shadow reset

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 28);
        ctx.clip();
        ctx.drawImage(img, cardX, cardY, cardW, cardH);
        ctx.restore();

        // 비디오 카드 프리미엄 테두리 스트로크
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 28);
        ctx.strokeStyle = options.accentColor || 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
      } else {
        img.onload = () => {
          setImageReloadTrigger(prev => prev + 1);
        };
        // 로딩 중일 때 세련된 앰비언트 메시 그라디언트
        const bgGrad = ctx.createLinearGradient(0, 0, w, h);
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(0.5, '#1e1b4b');
        bgGrad.addColorStop(1, '#020617');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);
      }
    } else {
      // 이미지가 없을 때 프리미엄 네이비/퍼플 그라디언트
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#1e1b4b');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // 4. 상단 헤더바(3D 입체 리본) 드로잉
    const barWidth = w * 0.92;
    const barHeight = 175;
    const barX = (w - barWidth) / 2;
    const barY = 110;

    ctx.save();
    // 3D 섀도우
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;

    // 헤더 리본 배경 채우기
    ctx.fillStyle = options.headerBackgroundColor || '#111827';
    ctx.strokeStyle = options.strokeColor || options.accentColor || '#FFE45C';
    ctx.lineWidth = 6;

    const shape = options.shape;
    if (shape === 'pill') {
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, barHeight / 2);
      ctx.fill();
      ctx.stroke();
    } else if (shape === 'rounded') {
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, 32);
      ctx.fill();
      ctx.stroke();
    } else if (shape === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(w / 2, barY + barHeight / 2, barWidth / 2, barHeight / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, 16);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // 4.1 상단 미니 핀 뱃지 ("👑 TOP RANKING SPECIAL")
    ctx.save();
    const pinW = 320;
    const pinH = 40;
    const pinX = (w - pinW) / 2;
    const pinY = barY - 20;

    ctx.fillStyle = options.accentColor || '#FFE45C';
    ctx.beginPath();
    ctx.roundRect(pinX, pinY, pinW, pinH, 20);
    ctx.fill();

    ctx.font = `900 22px ${fontName}`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ RANKING SHORTS ★', w / 2, pinY + pinH / 2);
    ctx.restore();

    // 5. 헤더 대제목 & 부제목 텍스트
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 대제목 (외곽선 + 드롭 섀도우)
    ctx.font = `900 62px ${fontName}`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.strokeText(headline || '역대급 랭킹', w / 2, barY + barHeight * 0.42);

    ctx.fillStyle = options.headlineColor || '#FFE45C';
    ctx.fillText(headline || '역대급 랭킹', w / 2, barY + barHeight * 0.42);

    // 부제목
    ctx.font = `bold 34px ${fontName}`;
    ctx.fillStyle = options.subtitleColor || '#FFFFFF';
    ctx.fillText(subtitle || 'TOP 5 SPECIAL', w / 2, barY + barHeight * 0.76);
    ctx.restore();

    // 6. 누적형 순위 리스트 (rankDisplayMode === 'cumulative')
    if (options.rankDisplayMode === 'cumulative') {
      ctx.save();
      const listStartX = w - 340;
      const listStartY = 350;
      sortedItems.forEach((it, idx) => {
        const isCurrent = idx === activeItemIndex;
        const y = listStartY + idx * 68;

        ctx.fillStyle = isCurrent ? (options.accentColor || '#FFE45C') : 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();
        ctx.roundRect(listStartX, y, 280, 52, 14);
        ctx.fill();
        ctx.strokeStyle = isCurrent ? '#FFFFFF' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = `900 24px ${fontName}`;
        ctx.fillStyle = isCurrent ? '#000000' : '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText(
          options.rankLabelStyle === 'title-only'
            ? `${it.title.slice(0, 10)}`
            : `TOP ${it.rank}  ${it.title.slice(0, 8)}`,
          listStartX + 18,
          y + 28
        );
      });
      ctx.restore();
    }

    // 7. 중앙 메인 순위 뱃지 및 9대 템플릿별 방송급 비주얼 렌더링
    if (currentItem) {
      ctx.save();
      const badgeY = 930; // 16:9 비디오 카드(330+517=847) 바로 아래
      ctx.textAlign = 'center';

      // ─── [1위 피날레 황금 왕관 특화 연출] ───
      if (isFirstRank) {
        // 황금빛 래디얼 글로우
        const glowGrad = ctx.createRadialGradient(w / 2, badgeY - 20, 20, w / 2, badgeY - 20, 320);
        glowGrad.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
        glowGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.1)');
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(w / 2, badgeY - 20, 320, 0, Math.PI * 2);
        ctx.fill();

        // 3D 황금 왕관 이펙트
        ctx.font = `900 110px ${fontName}`;
        ctx.fillText('👑', w / 2, badgeY - 55);

        ctx.font = `900 78px ${fontName}`;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 10;
        ctx.strokeText('대망의 1위', w / 2, badgeY + 45);

        ctx.fillStyle = '#F59E0B';
        ctx.fillText('대망의 1위', w / 2, badgeY + 45);
      }
      // ─── [템플릿 1: 티어 프로그레스 (tier-progress-ranking)] ───
      else if (options.templateId === 'tier-progress-ranking') {
        const tierLetter = currentItem.rank === 1 ? 'S' : currentItem.rank === 2 ? 'A' : currentItem.rank === 3 ? 'B' : currentItem.rank === 4 ? 'C' : 'D';
        const tierColor = currentItem.rank === 1 ? '#F59E0B' : currentItem.rank === 2 ? '#A855F7' : currentItem.rank === 3 ? '#3B82F6' : '#10B981';

        // 티어 원형 엠블럼 (듀얼 링)
        ctx.fillStyle = tierColor;
        ctx.beginPath();
        ctx.arc(w / 2, badgeY - 40, 68, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.font = `900 76px ${fontName}`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(tierLetter, w / 2, badgeY - 40);

        // 티어 프로그레스 게이지 바
        const gaugeW = 440;
        const gaugeH = 28;
        const gaugeX = (w - gaugeW) / 2;
        const gaugeY = badgeY + 45;
        const fillRatio = Math.max(0.2, (6 - currentItem.rank) / 5);

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(gaugeX, gaugeY, gaugeW, gaugeH, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = tierColor;
        ctx.beginPath();
        ctx.roundRect(gaugeX, gaugeY, gaugeW * fillRatio, gaugeH, 14);
        ctx.fill();

        ctx.font = `900 28px ${fontName}`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(`TIER ${tierLetter} · ${Math.round(fillRatio * 100)}%`, w / 2, gaugeY + 62);
      }
      // ─── [템플릿 2: 게이지 미터 (gauge-ranking)] ───
      else if (options.templateId === 'gauge-ranking') {
        const gaugePercent = currentItem.rank === 1 ? 98 : currentItem.rank === 2 ? 85 : currentItem.rank === 3 ? 72 : currentItem.rank === 4 ? 54 : 36;
        const gaugeW = 580;
        const gaugeH = 40;
        const gaugeX = (w - gaugeW) / 2;
        const gaugeY = badgeY - 10;

        ctx.font = `900 68px ${fontName}`;
        ctx.fillStyle = isFirstRank ? '#EF4444' : (options.accentColor || '#FFE45C');
        ctx.fillText(`⚡ TOP ${currentItem.rank}`, w / 2, badgeY - 55);

        // 게이지 배경
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.beginPath();
        ctx.roundRect(gaugeX, gaugeY, gaugeW, gaugeH, 20);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.stroke();

        // 채워진 게이지 (터보 그라디언트)
        const gGrad = ctx.createLinearGradient(gaugeX, 0, gaugeX + gaugeW, 0);
        gGrad.addColorStop(0, '#10B981');
        gGrad.addColorStop(0.5, '#F59E0B');
        gGrad.addColorStop(1, '#EF4444');
        ctx.fillStyle = gGrad;
        ctx.beginPath();
        ctx.roundRect(gaugeX + 4, gaugeY + 4, (gaugeW - 8) * (gaugePercent / 100), gaugeH - 8, 16);
        ctx.fill();

        ctx.font = `900 36px ${fontName}`;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`POWER INDEX: ${gaugePercent}%`, w / 2, gaugeY + 75);
      }
      // ─── [템플릿 3: 등급 메달 (grade-badge-ranking)] ───
      else if (options.templateId === 'grade-badge-ranking') {
        const medalEmoji = currentItem.rank === 1 ? '🥇' : currentItem.rank === 2 ? '🥈' : currentItem.rank === 3 ? '🥉' : '🏅';
        const medalTitle = currentItem.rank === 1 ? 'GOLD MEDAL' : currentItem.rank === 2 ? 'SILVER MEDAL' : currentItem.rank === 3 ? 'BRONZE MEDAL' : `TOP ${currentItem.rank}`;

        ctx.font = `900 100px ${fontName}`;
        ctx.fillText(medalEmoji, w / 2, badgeY - 45);

        ctx.font = `900 42px ${fontName}`;
        ctx.fillStyle = isFirstRank ? '#F59E0B' : '#E2E8F0';
        ctx.fillText(medalTitle, w / 2, badgeY + 30);
      }
      // ─── [템플릿 4: 레벨업 네온 (level-up-ranking)] ───
      else if (options.templateId === 'level-up-ranking') {
        const levelW = 480;
        const levelH = 96;
        const levelX = (w - levelW) / 2;
        const levelY = badgeY - 60;

        ctx.fillStyle = 'rgba(0, 240, 255, 0.18)';
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 6;
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.roundRect(levelX, levelY, levelW, levelH, 18);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        ctx.font = `900 54px ${fontName}`;
        ctx.fillStyle = '#00F0FF';
        ctx.fillText(isFirstRank ? '★ MAX LEVEL 99 ★' : `▲ LEVEL UP: RANK ${currentItem.rank}`, w / 2, levelY + 62);
      }
      // ─── [기본 / 페일섭 / 레전드 템플릿] ───
      else {
        ctx.font = `900 88px ${fontName}`;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 10;
        ctx.strokeText(`${currentItem.rank}위`, w / 2, badgeY);

        ctx.fillStyle = options.accentColor || '#FFE45C';
        ctx.fillText(`${currentItem.rank}위`, w / 2, badgeY);
      }

      // 공통 아이템 타이틀 및 수치 강조
      ctx.font = `900 58px ${fontName}`;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 8;
      ctx.strokeText(
        `${currentItem.title} ${currentItem.statValue ? `(${currentItem.statValue})` : ''}`,
        w / 2,
        badgeY + 125
      );

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(
        `${currentItem.title} ${currentItem.statValue ? `(${currentItem.statValue})` : ''}`,
        w / 2,
        badgeY + 125
      );

      // [8. 하단 글래스모피즘 나레이션 자막 박스]
      const subBoxWidth = w * 0.92;
      const subBoxHeight = 170;
      const subBoxX = (w - subBoxWidth) / 2;
      const subBoxY = h - 260; // 모바일 숏폼 세이프존

      ctx.save();
      // 글래스모피즘 아크릴 반투명 배경
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.beginPath();
      ctx.roundRect(subBoxX, subBoxY, subBoxWidth, subBoxHeight, 24);
      ctx.fill();

      // 샤프 외곽선
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 좌측 버티컬 테마 악센트 바
      ctx.fillStyle = options.accentColor || '#FFE45C';
      ctx.beginPath();
      ctx.roundRect(subBoxX + 12, subBoxY + 16, 10, subBoxHeight - 32, 5);
      ctx.fill();

      // 자막 본문 텍스트
      ctx.font = `bold 42px ${fontName}`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(currentItem.description || '선정 이유 해설 자막', w / 2, subBoxY + subBoxHeight / 2);
      ctx.restore();

      ctx.restore();
    }
  }, [headline, subtitle, currentItem, options, activeItemIndex, sortedItems, isFirstRank, sourceVideo, imageReloadTrigger]);

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

  // 재생 토글 핸들러 (즉시 사운드 트리거)
  const handleTogglePlay = () => {
    if (!isPlaying) {
      // 재생 시작 시 첫 클릭에서 효과음 즉각 발동
      if (options.transitionSound) {
        if (options.transitionSoundStyle === 'click') {
          playSfxWebAudio('sfx_pixeling_type');
        } else if (options.transitionSoundStyle === 'whoosh') {
          playSfxWebAudio('sfx_cinematic_boom');
        } else {
          playSfxWebAudio('sfx_punch_hit');
        }
      }
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

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

          {/* 재생 중 하단 실시간 씬 프로그레스 바 */}
          {isPlaying && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 z-20">
              <div
                className="h-full bg-primary transition-all duration-100 ease-linear"
                style={{
                  width: `${((activeItemIndex + 1) / sortedItems.length) * 100}%`
                }}
              />
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
              onClick={handleTogglePlay}
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
                onClick={() => {
                  setIsPlaying(false);
                  setActiveItemIndex(idx);
                  if (options.transitionSound) {
                    if (options.transitionSoundStyle === 'click') {
                      playSfxWebAudio('sfx_pixeling_type');
                    } else if (options.transitionSoundStyle === 'whoosh') {
                      playSfxWebAudio('sfx_cinematic_boom');
                    } else {
                      playSfxWebAudio('sfx_punch_hit');
                    }
                  }
                }}
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
