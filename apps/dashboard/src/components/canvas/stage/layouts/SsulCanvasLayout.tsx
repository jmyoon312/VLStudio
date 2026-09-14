import React, { useMemo } from 'react';
import { ChevronLeft, Sparkles, Menu, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MemeAvatar, MemeType, MemeEmotion } from '@/components/memeAssets';
import { NleLayerObject } from '@/types/nle';
import { VideoFilterConfig } from '../../forms/FilterFxInspectorForm';
import { SsulTextMode } from '@/components/canvas/constants/canvasConstants';

const computeVideoCssFilter = (f?: VideoFilterConfig): string => {
  if (!f || f.preset === 'none') return 'none';
  const b = (f.brightness ?? 100) / 100;
  const c = (f.contrast ?? 100) / 100;
  const s = (f.saturation ?? 100) / 100;
  const temp = (f.temperature ?? f.warmth ?? 0);
  let str = `brightness(${b}) contrast(${c}) saturate(${s})`;
  if (temp > 0) {
    str += ` sepia(${(temp / 100) * 0.35})`;
  } else if (temp < 0) {
    str += ` hue-rotate(${(temp / 100) * 20}deg)`;
  }
  if (f.preset === 'film-noir') str += ' grayscale(100%)';
  else if (f.preset === 'retro-vhs') str += ' sepia(0.15) hue-rotate(-6deg)';
  else if (f.preset === 'teal-orange') str += ' hue-rotate(-8deg)';
  else if (f.preset === 'cyberpunk') str += ' hue-rotate(15deg)';
  else if (f.preset === 'vintage-grain') str += ' sepia(0.35)';
  return str;
};

const formatWrappedText = (text: string, splitLimit: number = 14, maxLines: number = 2) => {
  if (!text) return '';
  let lines: string[] = [];
  if (text.includes('\n')) {
    lines = text.split('\n');
  } else if (text.length <= splitLimit) {
    lines = [text];
  } else {
    const words = text.split(' ');
    let curLine = '';
    for (const w of words) {
      if ((curLine + ' ' + w).trim().length > splitLimit) {
        if (curLine) lines.push(curLine.trim());
        curLine = w;
      } else {
        curLine = curLine ? curLine + ' ' + w : w;
      }
    }
    if (curLine) lines.push(curLine.trim());
  }

  if (maxLines > 0 && lines.length > maxLines) {
    const preserved = lines.slice(0, maxLines - 1);
    const remaining = lines.slice(maxLines - 1).join(' ');
    lines = [...preserved, remaining];
  }
  return lines.join('\n');
};

export interface SsulCanvasLayoutProps {
  aspectRatio: '9:16' | '16:9' | '1:1';
  canvasScale: number;
  selectedLayerId?: string;
  setSelectedLayerId: (id: string) => void;
  setActiveInspectorTab: (tab: string) => void;
  setActiveFloating: (insp: string) => void;
  currentProjectDisplayName?: string;
  currentTimeMs?: number;
  isPlaying?: boolean;
  ssulConfig?: any;
  topTitleText?: string;
  currentSubtitleText?: string;
  subtitleConfig?: any;
  subtitleSplitLimit?: number;
  layers?: NleLayerObject[];
  trackVisibility?: { v1Video?: boolean; t1Title?: boolean; s1Subtitle?: boolean };
  videoFitMode?: any;
  videoBlurBg?: boolean;
  videoLayer?: any;
  videoZIndex?: number;
  videoFilter?: VideoFilterConfig;
  videoHorizontalFlip?: boolean;
  videoVerticalFlip?: boolean;
  videoZoomScale?: number;
  videoRotationDeg?: number;
  videoFocusXPct?: number;
  videoFocusYPct?: number;
  videoRef?: any;
  isSlidingDown?: boolean;
  videoBorderRadius?: number;
  videoBorderEnabled?: boolean;
  videoBorderWidth?: number;
  videoBorderColor?: string;
  videoShadowEnabled?: boolean;
  videoShadowBlur?: number;
  videoShadowColor?: string;
  videoPaddingPct?: number;
}

export const SsulCanvasLayout: React.FC<SsulCanvasLayoutProps> = ({
  aspectRatio,
  selectedLayerId,
  setSelectedLayerId,
  setActiveInspectorTab,
  setActiveFloating,
  currentProjectDisplayName,
  currentTimeMs = 0,
  isPlaying = false,
  ssulConfig,
  topTitleText = '',
  currentSubtitleText = '',
  subtitleConfig,
  subtitleSplitLimit = 14,
  layers = [],
  trackVisibility = { v1Video: true, t1Title: true, s1Subtitle: true },
  videoFitMode = 'cover',
  videoBlurBg = true,
  videoLayer,
  videoZIndex = 10,
  videoFilter = { preset: 'none', filmGrain: 0, vignette: 0, contrast: 100, saturation: 100, brightness: 100 },
  videoHorizontalFlip = false,
  videoVerticalFlip = false,
  videoZoomScale = 1.0,
  videoRotationDeg = 0,
  videoFocusXPct = 50,
  videoFocusYPct = 50,
  videoRef,
  isSlidingDown = false,
  videoBorderRadius,
  videoBorderEnabled = false,
  videoBorderWidth = 1,
  videoBorderColor = '#FFFFFF',
  videoShadowEnabled = false,
  videoShadowBlur = 20,
  videoShadowColor = 'rgba(0,0,0,0.3)',
  videoPaddingPct = 0,
}) => {
  const aspectScale = aspectRatio === '9:16' ? 1.0 : aspectRatio === '1:1' ? 0.9 : 0.75;
  const subtitleLayers = useMemo(() => layers.filter(l => l.type === 'subtitle'), [layers]);
  const activeSub = useMemo(
    () => subtitleLayers.find(l => l.visible && currentTimeMs >= l.startMs && currentTimeMs <= l.endMs),
    [subtitleLayers, currentTimeMs]
  );

  // 1. 헤더 설정
  const ssulHeader = {
    enabled: ssulConfig?.ssulHeader?.enabled ?? true,
    bgColor: ssulConfig?.ssulHeader?.bgColor || '#F7CF46',
    heightMultiplier: ssulConfig?.ssulHeader?.heightMultiplier ?? 1.0,
    text: ssulConfig?.ssulHeader?.text || '실시간 베스트',
    textColor: ssulConfig?.ssulHeader?.textColor || '#18181B',
    font: ssulConfig?.ssulHeader?.font || 'Pretendard',
    fontSizeMultiplier: ssulConfig?.ssulHeader?.fontSizeMultiplier ?? 1.0,
    bold: ssulConfig?.ssulHeader?.bold ?? true,
    italic: ssulConfig?.ssulHeader?.italic ?? false,
    logoUrl: ssulConfig?.ssulHeader?.logoUrl,
    leftIcon: ssulConfig?.ssulHeader?.leftIcon || 'arrow_back',
    rightIcon: ssulConfig?.ssulHeader?.rightIcon || 'menu',
    strokeEnabled: ssulConfig?.ssulHeader?.strokeEnabled ?? false,
    strokeWidth: ssulConfig?.ssulHeader?.strokeWidth ?? 2,
    strokeColor: ssulConfig?.ssulHeader?.strokeColor || '#000000',
    shadowEnabled: ssulConfig?.ssulHeader?.shadowEnabled ?? false,
    shadowBlur: ssulConfig?.ssulHeader?.shadowBlur ?? 4,
    shadowColor: ssulConfig?.ssulHeader?.shadowColor || 'rgba(0,0,0,0.5)',
    borderRadius: ssulConfig?.ssulHeader?.borderRadius ?? 0,
  };

  // 2. 게시글 제목 설정 (1줄 규격)
  const postTitleConfig = {
    text: ssulConfig?.postTitle?.text || topTitleText || (currentProjectDisplayName && currentProjectDisplayName !== '템플릿 미리보기' ? currentProjectDisplayName : '') || ssulConfig?.postTitle || '오늘자 레전드 썰 풀어본다',
    color: ssulConfig?.postTitle?.color || '#111827',
    font: ssulConfig?.postTitle?.font || 'Pretendard',
    fontSizeMultiplier: ssulConfig?.postTitle?.fontSizeMultiplier ?? 1.0,
    align: (ssulConfig?.postTitle?.align as 'left' | 'center' | 'right') || 'left',
    bold: ssulConfig?.postTitle?.bold ?? true,
    italic: ssulConfig?.postTitle?.italic ?? false,
    strokeEnabled: ssulConfig?.postTitle?.strokeEnabled ?? false,
    strokeColor: ssulConfig?.postTitle?.strokeColor || '#000000',
    strokeWidth: ssulConfig?.postTitle?.strokeWidth ?? 2,
    shadowEnabled: ssulConfig?.postTitle?.shadowEnabled ?? false,
    shadowColor: ssulConfig?.postTitle?.shadowColor || '#000000',
    shadowBlur: ssulConfig?.postTitle?.shadowBlur ?? 4,
    letterSpacing: ssulConfig?.postTitle?.letterSpacing ?? -0.5,
    lineHeight: ssulConfig?.postTitle?.lineHeight ?? 1.25,
    boxEnabled: ssulConfig?.postTitle?.boxEnabled ?? false,
    boxColor: ssulConfig?.postTitle?.boxColor || 'rgba(0,0,0,0.06)',
    borderRadius: ssulConfig?.postTitle?.borderRadius ?? 4,
  };

  // 3. 메타데이터 설정
  const metadataConfig = {
    showAuthor: ssulConfig?.metadata?.showAuthor ?? true,
    authorText: ssulConfig?.metadata?.authorText || ssulConfig?.author || '대기업 익명',
    showTime: ssulConfig?.metadata?.showTime ?? true,
    timeText: ssulConfig?.metadata?.timeText || ssulConfig?.timeText || '10분 전',
    showViews: ssulConfig?.metadata?.showViews ?? true,
    viewsText: ssulConfig?.metadata?.viewsText || ssulConfig?.viewsText || '조회 2.4만',
    upvotesText: ssulConfig?.metadata?.upvotesText || ssulConfig?.upvotesText || '추천 382',
    separator: (ssulConfig?.metadata?.separator as 'dot' | 'bar' | 'slash') || 'dot',
    color: ssulConfig?.metadata?.color || '#6B7280',
    font: ssulConfig?.metadata?.font || 'Pretendard',
    fontSizeMultiplier: ssulConfig?.metadata?.fontSizeMultiplier ?? 1.0,
    bold: ssulConfig?.metadata?.bold ?? false,
    strokeEnabled: ssulConfig?.metadata?.strokeEnabled ?? false,
    strokeWidth: ssulConfig?.metadata?.strokeWidth ?? 1,
    strokeColor: ssulConfig?.metadata?.strokeColor || '#000000',
    shadowEnabled: ssulConfig?.metadata?.shadowEnabled ?? false,
    shadowBlur: ssulConfig?.metadata?.shadowBlur ?? 3,
    shadowColor: ssulConfig?.metadata?.shadowColor || 'rgba(0,0,0,0.5)',
  };

  // 4. 구분선 설정
  const dividerConfig = {
    enabled: ssulConfig?.divider?.enabled ?? true,
    style: (ssulConfig?.divider?.style as 'solid' | 'dashed' | 'dotted') || 'solid',
    thickness: ssulConfig?.divider?.thickness ?? 1,
    widthPercent: ssulConfig?.divider?.widthPercent ?? 100,
    color: ssulConfig?.divider?.color || '#E5E7EB',
    opacity: ssulConfig?.divider?.opacity ?? 100,
  };

  // 5. 자막 본문 설정 (글로벌 subtitleConfig 및 썰형 전용 스타일 완전 동기화)
  const ssulSubtitleConfig = {
    font: subtitleConfig?.font || ssulConfig?.ssulSubtitle?.font || 'Pretendard',
    color: subtitleConfig?.textColor || ssulConfig?.ssulSubtitle?.color || '#18181B',
    fontSizeMultiplier: ssulConfig?.ssulSubtitle?.fontSizeMultiplier ?? 1.0,
    align: (ssulConfig?.ssulSubtitle?.align as 'left' | 'center' | 'right') || 'left',
    bold: (subtitleConfig?.isBold !== false && subtitleConfig?.bold !== false) ?? (ssulConfig?.ssulSubtitle?.bold ?? true),
    italic: (subtitleConfig?.isItalic || subtitleConfig?.italic) ?? (ssulConfig?.ssulSubtitle?.italic ?? false),
    lineHeightMultiplier: ssulConfig?.ssulSubtitle?.lineHeightMultiplier ?? 1.4,
    letterSpacingPx: ssulConfig?.ssulSubtitle?.letterSpacingPx ?? 0,
    boxEnabled: subtitleConfig?.useBox !== undefined ? subtitleConfig.useBox : (ssulConfig?.ssulSubtitle?.boxEnabled ?? false),
    boxColor: subtitleConfig?.boxColor || ssulConfig?.ssulSubtitle?.boxColor || '#F3F4F6',
    boxRadius: subtitleConfig?.boxRadius ?? subtitleConfig?.borderRadius ?? ssulConfig?.ssulSubtitle?.boxRadius ?? 4,
    strokeEnabled: (subtitleConfig?.outlineSize !== undefined ? subtitleConfig.outlineSize > 0 : ssulConfig?.ssulSubtitle?.strokeEnabled) ?? false,
    strokeColor: subtitleConfig?.outlineColor || ssulConfig?.ssulSubtitle?.strokeColor || '#000000',
    strokeWidth: subtitleConfig?.outlineSize ?? ssulConfig?.ssulSubtitle?.strokeWidth ?? 2,
    shadowEnabled: (subtitleConfig?.shadowSize !== undefined ? subtitleConfig.shadowSize > 0 : ssulConfig?.ssulSubtitle?.shadowEnabled) ?? false,
    shadowColor: subtitleConfig?.shadowColor || ssulConfig?.ssulSubtitle?.shadowColor || '#000000',
    shadowBlur: (subtitleConfig?.shadowSize ? subtitleConfig.shadowSize * 2 : ssulConfig?.ssulSubtitle?.shadowBlur) ?? 4,
  };

  // 6. 텍스트 디스플레이 3대 모드 연산 (자동 줄바꿈 formatWrappedText 적용)
  const textMode: SsulTextMode = ssulConfig?.textMode || 'accumulate';

  const displayedLines = useMemo(() => {
    const splitLimit = subtitleSplitLimit || (subtitleConfig as any)?.splitLimit || 16;
    if (textMode === 'accumulate') {
      if (isPlaying || currentTimeMs > 0) {
        const pastSubs = subtitleLayers.filter(l => l.visible && l.startMs <= currentTimeMs);
        if (pastSubs.length > 0) {
          return pastSubs.slice(-4).map(s => ({
            id: s.id,
            text: formatWrappedText(s.data, splitLimit, 2),
            isActive: activeSub?.id === s.id,
          }));
        }
      }
      if (subtitleLayers.length > 0) {
        return subtitleLayers.slice(0, 3).map((s, idx) => ({
          id: s.id,
          text: formatWrappedText(s.data, splitLimit, 2),
          isActive: idx === 0,
        }));
      }
      return [
        { id: 'l1', text: formatWrappedText('오늘 회사에서 진짜 어처구니없는 일이 있었음', splitLimit, 2), isActive: false },
        { id: 'l2', text: formatWrappedText('부장님이 갑자기 부르더니 커피 한잔하자고 함', splitLimit, 2), isActive: false },
        { id: 'l3', text: formatWrappedText('그래서 따라갔더니 탕비실에서...', splitLimit, 2), isActive: true },
      ];
    } else {
      const text = activeSub?.data || (currentSubtitleText && currentSubtitleText !== '자막을 입력하거나 타임라인에서 자막을 선택하세요' ? currentSubtitleText : (subtitleLayers[0]?.data || '커뮤니티 게시글 본문 썰 자막이 여기에 표시됩니다.'));
      return [{ id: activeSub?.id || 'single', text: formatWrappedText(text, splitLimit, 2), isActive: true }];
    }
  }, [textMode, isPlaying, currentTimeMs, subtitleLayers, activeSub, currentSubtitleText, subtitleSplitLimit, subtitleConfig]);

  // 7. 동적 카드 높이(%) 및 하단 비디오 top(%) 연산
  const cardHeightPct = useMemo(() => {
    if (textMode === 'single-fixed') return 34;
    if (textMode === 'single-stepped') return 24;

    const linesCount = displayedLines.length;
    if (linesCount <= 1) return 24;
    if (linesCount === 2) return 29;
    if (linesCount === 3) return 35;
    return 41;
  }, [textMode, displayedLines.length]);

  const videoTopPct = cardHeightPct + 1.2;
  const videoHeightPct = Math.max(32, 98 - videoTopPct);
  const isImageMedia = videoLayer?.data && (videoLayer.data.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif)$/i.test(videoLayer.data));

  return (
    <>
      {/* 📜 1. 상단 정통 모바일 커뮤니티 캡처 카드 */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 bg-white flex flex-col z-30 select-none shadow-md border-b border-zinc-200/80 transition-all duration-300",
          selectedLayerId === 'layer_ssul_card' && "ring-1 ring-emerald-500"
        )}
        style={{
          height: `${cardHeightPct}%`,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedLayerId('layer_ssul_card');
            setActiveInspectorTab('template');
          }
        }}
      >
        {/* 1-1. 상단 모바일 앱 헤더 바 */}
        {ssulHeader.enabled && (
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setActiveFloating('ssulHeader');
            }}
            onClick={() => {
              setSelectedLayerId('layer_ssul_header');
              setActiveInspectorTab('ssulHeader');
            }}
            className={cn(
              "w-full px-3.5 flex items-center justify-between shrink-0 cursor-pointer select-none transition-all border-b border-black/[0.06]",
              selectedLayerId === 'layer_ssul_header' && "ring-1 ring-inset ring-sky-500"
            )}
            style={{
              height: `${Math.round(44 * (ssulHeader.heightMultiplier || 1.0))}px`,
              backgroundColor: ssulHeader.bgColor || '#F7CF46',
              borderRadius: ssulHeader.borderRadius ? `${ssulHeader.borderRadius}px ${ssulHeader.borderRadius}px 0 0` : 0,
            }}
            title="더블클릭하여 헤더 바 속성 편집"
          >
            {/* 좌측 아이콘 / 로고 이미지 */}
            <div className="w-8 h-8 flex items-center justify-start">
              {ssulHeader.logoUrl ? (
                <img src={ssulHeader.logoUrl} alt="Logo" className="w-7 h-7 object-contain rounded-full shadow-2xs" />
              ) : (
                <>
                  {ssulHeader.leftIcon === 'arrow_back' && (
                    <ChevronLeft className="w-5 h-5 stroke-[2.5] text-zinc-900" />
                  )}
                  {ssulHeader.leftIcon === 'home' && (
                    <Sparkles className="w-4 h-4 text-amber-900" />
                  )}
                  {ssulHeader.leftIcon === 'close' && (
                    <span className="text-lg font-bold text-zinc-900 leading-none">✕</span>
                  )}
                </>
              )}
            </div>

            {/* 중앙 채널명 / 게시판명 */}
            <span
              style={{
                color: ssulHeader.textColor || '#18181B',
                fontFamily: ssulHeader.font || 'Pretendard',
                fontSize: `${Math.round(15 * (ssulHeader.fontSizeMultiplier || 1.0))}px`,
                fontWeight: ssulHeader.bold ? 800 : 600,
                fontStyle: ssulHeader.italic ? 'italic' : 'normal',
                WebkitTextStroke: ssulHeader.strokeEnabled ? `${ssulHeader.strokeWidth}px ${ssulHeader.strokeColor}` : 'none',
                textShadow: ssulHeader.shadowEnabled ? `0 2px ${ssulHeader.shadowBlur}px ${ssulHeader.shadowColor}` : 'none',
              }}
              className="flex-1 min-w-0 px-2 tracking-tight truncate text-center"
            >
              {ssulHeader.text}
            </span>

            {/* 우측 메뉴 아이콘 */}
            <div className="w-8 h-8 flex items-center justify-end">
              {ssulHeader.rightIcon === 'menu' && (
                <Menu className="w-5 h-5 stroke-[2.5] text-zinc-900" />
              )}
              {ssulHeader.rightIcon === 'share' && (
                <Share2 className="w-4 h-4 text-zinc-900" />
              )}
              {ssulHeader.rightIcon === 'bookmark' && (
                <span className="text-base text-zinc-900">★</span>
              )}
            </div>
          </div>
        )}

        {/* 1-2. 카드 본체 컨테이너 */}
        <div className="flex-1 w-full px-4 pt-2.5 pb-2 flex flex-col items-start overflow-hidden text-left">
          {/* 게시글 대제목 (1줄 규격 완벽 고정) */}
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setActiveFloating('postTitle');
            }}
            onClick={() => {
              setSelectedLayerId('layer_ssul_post_title');
              setActiveInspectorTab('title');
            }}
            className={cn(
              "w-full cursor-pointer hover:bg-black/[0.02] p-1 rounded transition-colors select-none",
              (selectedLayerId === 'layer_ssul_post_title' || selectedLayerId === 'layer_title') && "ring-1 ring-sky-500 bg-sky-50/50"
            )}
            title="더블클릭하여 게시글 제목 속성 편집"
          >
            <h2
              style={{
                color: postTitleConfig.color || '#111827',
                fontFamily: postTitleConfig.font || 'Pretendard',
                fontSize: `${Math.round(20 * (postTitleConfig.fontSizeMultiplier || 1.0) * aspectScale)}px`,
                fontWeight: postTitleConfig.bold ? 800 : 700,
                fontStyle: postTitleConfig.italic ? 'italic' : 'normal',
                letterSpacing: `${postTitleConfig.letterSpacing || -0.5}px`,
                lineHeight: postTitleConfig.lineHeight || 1.25,
                textAlign: postTitleConfig.align || 'left',
                WebkitTextStroke: postTitleConfig.strokeEnabled ? `${postTitleConfig.strokeWidth}px ${postTitleConfig.strokeColor}` : 'none',
                textShadow: postTitleConfig.shadowEnabled ? `0 2px ${postTitleConfig.shadowBlur}px ${postTitleConfig.shadowColor}` : 'none',
                backgroundColor: postTitleConfig.boxEnabled ? postTitleConfig.boxColor : 'transparent',
                borderRadius: postTitleConfig.boxEnabled ? `${postTitleConfig.borderRadius}px` : 0,
                padding: postTitleConfig.boxEnabled ? '2px 8px' : 0,
              }}
              className="tracking-tight whitespace-nowrap overflow-hidden text-ellipsis break-keep font-extrabold"
            >
              {postTitleConfig.text}
            </h2>
          </div>

          {/* 메타데이터 (커뮤니티 뱃지 · 작성자 · 시간 · 조회수 · 추천수) */}
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setActiveFloating('metadata');
            }}
            onClick={() => {
              setSelectedLayerId('layer_ssul_metadata');
              setActiveInspectorTab('metadata');
            }}
            className={cn(
              "mt-1 px-1 py-0.5 flex items-center gap-1.5 text-xs cursor-pointer hover:bg-black/[0.02] rounded transition-colors select-none shrink-0",
              selectedLayerId === 'layer_ssul_metadata' && "ring-1 ring-sky-500 bg-sky-50/50"
            )}
            style={{
              color: metadataConfig.color || '#6B7280',
              fontFamily: metadataConfig.font || 'Pretendard',
              fontSize: `${Math.round(12 * (metadataConfig.fontSizeMultiplier || 1.0))}px`,
              fontWeight: metadataConfig.bold ? 700 : 400,
              WebkitTextStroke: metadataConfig.strokeEnabled ? `${metadataConfig.strokeWidth}px ${metadataConfig.strokeColor}` : 'none',
              textShadow: metadataConfig.shadowEnabled ? `0 1px ${metadataConfig.shadowBlur}px ${metadataConfig.shadowColor}` : 'none',
            }}
            title="더블클릭하여 메타데이터 속성 편집"
          >
            {ssulConfig?.communityType && (
              <span className="bg-emerald-600 text-white font-black px-1.5 py-0.2 rounded-2xs text-[9px] uppercase tracking-wider">
                {ssulConfig.communityType === 'blind' ? 'BLIND' : ssulConfig.communityType === 'dcinside' ? 'DCINSIDE' : ssulConfig.communityType === 'fmkorea' ? 'FMKOREA' : 'NATE'}
              </span>
            )}
            {metadataConfig.showAuthor && (
              <span className="font-semibold text-zinc-700 dark:text-zinc-400">{metadataConfig.authorText}</span>
            )}
            {metadataConfig.showAuthor && (metadataConfig.showTime || (metadataConfig.showViews && metadataConfig.viewsText)) && (
              <span className="opacity-40">{metadataConfig.separator === 'slash' ? '/' : metadataConfig.separator === 'bar' ? '|' : '·'}</span>
            )}
            {metadataConfig.showTime && (
              <span>{metadataConfig.timeText}</span>
            )}
            {metadataConfig.showTime && metadataConfig.showViews && metadataConfig.viewsText && (
              <span className="opacity-40">{metadataConfig.separator === 'slash' ? '/' : metadataConfig.separator === 'bar' ? '|' : '·'}</span>
            )}
            {metadataConfig.showViews && metadataConfig.viewsText && (
              <span>{metadataConfig.viewsText}</span>
            )}
            {metadataConfig.upvotesText && (
              <>
                <span className="opacity-40">·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{metadataConfig.upvotesText}</span>
              </>
            )}
          </div>

          {/* 가로 구분선 (Divider) */}
          {dividerConfig.enabled && (
            <div
              onDoubleClick={(e) => {
                e.stopPropagation();
                setActiveFloating('divider');
              }}
              onClick={() => {
                setSelectedLayerId('layer_ssul_divider');
                setActiveInspectorTab('divider');
              }}
              className={cn(
                "w-full my-2 py-0.5 flex items-center cursor-pointer hover:opacity-80 transition-opacity shrink-0",
                selectedLayerId === 'layer_ssul_divider' && "ring-1 ring-sky-500 rounded-xs"
              )}
              title="더블클릭하여 구분선 속성 편집"
            >
              <div
                style={{
                  width: `${dividerConfig.widthPercent || 100}%`,
                  borderTopWidth: `${dividerConfig.thickness || 1}px`,
                  borderTopStyle: dividerConfig.style || 'solid',
                  borderTopColor: dividerConfig.color || '#E5E7EB',
                  opacity: (dividerConfig.opacity ?? 100) / 100,
                }}
              />
            </div>
          )}

          {/* 본문 썰 자막 영역 */}
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setActiveFloating('ssulSubtitle');
            }}
            onClick={() => {
              setSelectedLayerId('layer_ssul_subtitle');
              setActiveInspectorTab('style');
            }}
            className={cn(
              "flex-1 w-full flex flex-col justify-start cursor-pointer hover:bg-black/[0.02] p-1 rounded transition-colors select-none space-y-1.5 overflow-hidden",
              (selectedLayerId === 'layer_ssul_subtitle' || selectedLayerId === 'layer_sub') && "ring-1 ring-sky-500 bg-sky-50/50"
            )}
            title="더블클릭하여 자막 본문 속성 편집"
          >
            {displayedLines.map((line, idx) => (
              <p
                key={line.id || idx}
                style={{
                  color: line.isActive ? (ssulSubtitleConfig.color || '#18181B') : '#4B5563',
                  fontFamily: ssulSubtitleConfig.font || 'Pretendard',
                  fontSize: `${Math.round(15 * (ssulSubtitleConfig.fontSizeMultiplier || 1.0) * aspectScale)}px`,
                  fontWeight: line.isActive ? (ssulSubtitleConfig.bold ? 800 : 700) : 500,
                  fontStyle: ssulSubtitleConfig.italic ? 'italic' : 'normal',
                  lineHeight: ssulSubtitleConfig.lineHeightMultiplier || 1.4,
                  letterSpacing: `${ssulSubtitleConfig.letterSpacingPx || 0}px`,
                  textAlign: ssulSubtitleConfig.align || 'left',
                  backgroundColor: line.isActive && ssulSubtitleConfig.boxEnabled ? ssulSubtitleConfig.boxColor : 'transparent',
                  borderRadius: ssulSubtitleConfig.boxEnabled ? `${ssulSubtitleConfig.boxRadius}px` : 0,
                  padding: line.isActive && ssulSubtitleConfig.boxEnabled ? '4px 8px' : '0',
                  WebkitTextStroke: line.isActive && ssulSubtitleConfig.strokeEnabled ? `${ssulSubtitleConfig.strokeWidth}px ${ssulSubtitleConfig.strokeColor}` : 'none',
                  textShadow: line.isActive && ssulSubtitleConfig.shadowEnabled ? `0 2px ${ssulSubtitleConfig.shadowBlur}px ${ssulSubtitleConfig.shadowColor}` : 'none',
                }}
                className={cn(
                  "break-keep transition-all duration-200",
                  line.isActive ? "opacity-100 font-extrabold translate-x-0" : "opacity-70"
                )}
              >
                {line.text}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* 🎬 2. 하단 비디오/이미지 미디어 레이어 */}
      <div
        onClick={() => {
          setSelectedLayerId('layer_video');
          setActiveInspectorTab('videoCrop');
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setActiveFloating('videoCrop');
        }}
        className={cn(
          "absolute overflow-hidden flex items-center justify-center cursor-pointer bg-black",
          selectedLayerId === 'layer_video' && "ring-1 ring-sky-400"
        )}
        style={{
          top: `${videoTopPct}%`,
          height: `${videoHeightPct}%`,
          bottom: '2%',
          left: `${videoPaddingPct !== undefined && videoPaddingPct > 0 ? videoPaddingPct : 3}%`,
          right: `${videoPaddingPct !== undefined && videoPaddingPct > 0 ? videoPaddingPct : 3}%`,
          borderRadius: `${videoBorderRadius !== undefined ? videoBorderRadius : 12}px`,
          border: videoBorderEnabled ? `${videoBorderWidth || 1}px solid ${videoBorderColor || '#FFFFFF'}` : undefined,
          boxShadow: videoShadowEnabled
            ? `0 8px ${videoShadowBlur || 20}px -4px ${videoShadowColor || 'rgba(0,0,0,0.3)'}`
            : '0 8px 20px -4px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
          zIndex: videoZIndex,
          opacity: trackVisibility.v1Video ? 1 : 0,
          transition: 'top 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {videoBlurBg && videoFitMode !== 'fullscreen' && videoLayer?.data && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {isImageMedia ? (
              <img
                src={videoLayer.data}
                alt="blur-bg"
                className="w-full h-full object-cover scale-150 blur-2xl opacity-60"
              />
            ) : (
              <video
                src={videoLayer.data}
                className="w-full h-full object-cover scale-150 blur-2xl opacity-60"
                muted
              />
            )}
          </div>
        )}

        {videoLayer?.data ? (
          isImageMedia ? (
            <img
              src={videoLayer.data}
              alt="stage-img"
              className={cn(
                "relative z-10 w-full h-full",
                videoFitMode === 'cover' ? "object-cover" : "object-contain",
                isSlidingDown && "animate-viraloop-slidedown"
              )}
              style={{
                filter: computeVideoCssFilter(videoFilter),
                transform: `scaleX(${videoHorizontalFlip ? -1 : 1}) scaleY(${videoVerticalFlip ? -1 : 1}) scale(${videoZoomScale}) rotate(${videoRotationDeg}deg)`,
                objectPosition: `${videoFocusXPct}% ${videoFocusYPct}%`,
                transition: 'transform 0.15s ease-out',
              }}
            />
          ) : (
            <video
              ref={videoRef}
              src={videoLayer.data}
              className={cn(
                "relative z-10 w-full h-full",
                videoFitMode === 'cover' ? "object-cover" : "object-contain",
                isSlidingDown && "animate-viraloop-slidedown"
              )}
              style={{
                filter: computeVideoCssFilter(videoFilter),
                transform: `scaleX(${videoHorizontalFlip ? -1 : 1}) scaleY(${videoVerticalFlip ? -1 : 1}) scale(${videoZoomScale}) rotate(${videoRotationDeg}deg)`,
                objectPosition: `${videoFocusXPct}% ${videoFocusYPct}%`,
                transition: 'transform 0.15s ease-out',
              }}
              playsInline
              muted
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-400 text-xs p-4">
            <span className="font-semibold text-sm mb-1 text-zinc-300">썰형 미디어 영역</span>
            <span>대본 음성과 자막 누적에 맞춰 영상이 부드럽게 밀려 내려옵니다.</span>
          </div>
        )}
      </div>

      {/* 🐸 3. 상징 밈 / 일러스트 캐릭터 */}
      {ssulConfig?.memeType && ssulConfig.memeType !== 'none' && (
        <div className="absolute bottom-6 right-5 z-35 pointer-events-none select-none">
          <MemeAvatar
            type={ssulConfig.memeType as MemeType}
            emotion={(ssulConfig.memeEmotion as MemeEmotion) || 'panic'}
            customUrl={ssulConfig.customMemeUrl}
            aliveMotion={ssulConfig.memeAliveMotion !== false}
            size={110}
            className="drop-shadow-2xl"
          />
        </div>
      )}
    </>
  );
};

export default SsulCanvasLayout;
