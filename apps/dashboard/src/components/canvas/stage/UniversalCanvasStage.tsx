import React, { useRef, useState } from 'react';
import { cn, getMediaUrl } from '@/lib/utils';
import { TransformGizmo } from '@/components/canvas/TransformGizmo';
import { NleLayerTransform, NleLayerObject } from '@/types/nle';
import { LayoutTemplateMode } from '@/types/templateDna';
import { SubtitleConfig } from '@/types/subtitle';
import { VideoFilterConfig } from '../forms/FilterFxInspectorForm';
import { CommentCardConfig } from '../forms/CommentCardInspectorForm';
import { VideoFitMode } from '../forms/VideoCropInspectorForm';
import { FileVideo, ThumbsUp, MessageCircle, ArrowLeft, Menu, Share2, Sparkles } from 'lucide-react';
import { MemeAvatar } from '@/components/memeAssets';
import {
  SsulHeaderFloatingInspector,
  PostTitleFloatingInspector,
  MetadataFloatingInspector,
  DividerFloatingInspector,
  SsulSubtitleFloatingInspector,
  BadgeTagFloatingInspector,
  JabHookFloatingInspector,
  GunlimboHookBandFloatingInspector,
  InstaProfileFloatingInspector,
  SourceCreditFloatingInspector,
  TopBottomBarFloatingInspector,
  CommentCardFloatingInspector,
  VideoCropFloatingInspector,
} from '../floating';

export interface UniversalCanvasStageProps {
  aspectRatio: '9:16' | '16:9' | '1:1';
  canvasScale: number;
  canvasPan: { x: number; y: number };
  layoutTemplateMode: LayoutTemplateMode;
  selectedLayerId: string | null;
  setSelectedLayerId: (id: string | null) => void;
  setActiveInspectorTab: (tab: any) => void;
  activeFloatingInspector?: string;
  setActiveFloatingInspector?: (inspector: string) => void;
  currentBrandChannelName?: string;

  // Video
  videoFitMode: VideoFitMode;
  videoBlurBg: boolean;
  videoFocusXPct: number;
  videoFocusYPct: number;
  videoZoomScale: number;
  videoRotationDeg: number;
  videoHorizontalFlip: boolean;
  videoVerticalFlip: boolean;
  videoFilter: VideoFilterConfig;
  videoCropTopPct?: number;
  videoCropBottomPct?: number;
  videoLayer?: any;
  videoZIndex?: number;
  trackVisibility?: any;
  currentTimeMs?: number;

  // Instagram
  instaConfig: any;
  setInstaConfig?: any;
  profileTransform: NleLayerTransform;
  setProfileTransform?: any;

  // Gunlimbo
  gunlimboConfig: any;
  setGunlimboConfig?: any;

  // Ssul
  ssulConfig?: any;
  setSsulConfig?: any;

  // Top / Bottom Bars
  hasTopBarBg: boolean;
  topBarHeightPct: number;
  topBarBg: string;
  topBarOpacity?: number;
  topBarRadius?: number;
  hasBottomBarBg: boolean;
  bottomBarHeightPct: number;
  bottomBarBg: string;
  bottomBarOpacity?: number;
  bottomBarRadius?: number;

  // Top Title
  hasTopTitle: boolean;
  topTitleText: string;
  titleTransform: NleLayerTransform;
  setTitleTransform?: any;
  titleLinesMode?: 'single' | 'double';
  titleLine1?: string;
  titleLine2?: string;
  titleLine1SizePx?: number;
  titleLine2SizePx?: number;
  titleLine1Color?: string;
  titleLine2Color?: string;
  titleFontFamily?: string;
  titleStroke?: boolean;
  titleStrokeWidth?: number;
  titleStrokeColor?: string;
  titleShadow?: boolean;
  titleShadowBlur?: number;
  titleShadowColor?: string;
  titleBgMode?: string;
  titleBgColor?: string;
  titleBgOpacity?: number;
  titlePaddingX?: number;
  titlePaddingY?: number;
  titleBorderRadius?: number;
  hasTitleBadge?: boolean;
  titleBadgeText?: string;
  titleBadgeBg?: string;
  titleBadgeColor?: string;

  // Jab Hook
  hasJab: boolean;
  jabTransform: NleLayerTransform;
  setJabTransform?: any;
  jabText: string;
  jabTiltDeg: number;
  jabFontSize: number;
  jabTextColor: string;
  jabStroke: boolean;
  jabStrokeWidth: number;
  jabStrokeColor: string;
  jabShadow: boolean;
  jabShadowBlur: number;
  jabBgEnabled: boolean;
  jabBgColor: string;
  jabBorderRadius: number;

  // Subtitle
  hasSubtitle?: boolean;
  subTransform: NleLayerTransform;
  setSubTransform?: any;
  currentSubtitleText?: string;
  subtitleConfig?: SubtitleConfig;
  setSubtitleYPercent?: (y: number) => void;
  subtitleStrokeEnabled?: boolean;
  subtitleStrokeWidth?: number;
  subtitleStrokeColor?: string;
  subtitleShadowEnabled?: boolean;
  subtitleShadowBlur?: number;
  subtitleShadowColor?: string;
  subtitleUseBox?: boolean;
  subtitleBoxColor?: string;
  subtitleBorderRadius?: number;
  subtitleMaxChars?: number;
  selectedHighlightColor?: string;

  // Bottom Source
  hasBottomSource: boolean;
  sourceTransform: NleLayerTransform;
  setSourceTransform?: any;
  bottomSourceText: string;
  bottomSourceColor?: string;
  bottomSourceSizePx?: number;
  bottomSourceBg?: boolean;
  bottomSourceBorderRadius?: number;
  bottomSourceStroke?: boolean;
  bottomSourceShadow?: boolean;

  // Comment Card
  hasCommentCard: boolean;
  commentCard: CommentCardConfig;
  commentTransform: NleLayerTransform;
  setCommentTransform?: any;

  // General Layers
  layers?: NleLayerObject[];
  currentProjectDisplayName?: string;
  videoRef?: any;
  bgmAudioRef?: any;
  isLooping?: boolean;
  isPlaying?: boolean;
  trackAudioMute?: any;
  trackLock?: any;
  handleTimeUpdate?: (e: any) => void;
  handleLoadedMetadata?: (e: any) => void;
  getBgmAudioSrc?: (data?: string) => string | undefined;
  setJabYPercent?: (y: number) => void;
  setJabTiltDeg?: (deg: number) => void;
  topBarZIndex?: number;
  bottomBarZIndex?: number;
  setTopTitleYPct?: (y: number) => void;
  setBottomSourceBottomPct?: (pct: number) => void;
  setVideoFocusXPct?: (x: number) => void;
  setVideoFocusYPct?: (y: number) => void;
  setVideoZoomScale?: any;
  setVideoRotationDeg?: any;
  setVideoHorizontalFlip?: any;
  showGrid?: boolean;
  safeZoneVisible?: boolean;
  safeZonePlatform?: 'youtube' | 'tiktok' | 'reels';
  deviceMockup?: 'none' | 'iphone16' | 'galaxy';
}

// ── 한글 자막 자동 줄바꿈 헬퍼 ──
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

// ── 단어별 강조색 캔버스 렌더링 헬퍼 ──
const renderHighlightedSubtitleText = (
  text: string,
  highlights?: { word: string; color: string }[],
  defaultColor: string = '#FFFFFF',
  activeHighlightColor: string = '#FFDF00'
) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const tokens = line.split(/(\s+)/);
    return (
      <span key={lineIdx} className="inline">
        {tokens.map((token, tokenIdx) => {
          if (/^\s+$/.test(token)) {
            return <span key={tokenIdx}>{token}</span>;
          }
          const clean = token.replace(/[.,!?~'"“”‘’]/g, '').trim();
          const hl = highlights?.find((h) => h.word === clean || (clean && h.word && clean.includes(h.word)));
          if (hl) {
            return (
              <span
                key={tokenIdx}
                style={{
                  color: hl.color || activeHighlightColor,
                  fontWeight: 900,
                }}
                className="font-extrabold"
              >
                {token}
              </span>
            );
          }
          return (
            <span key={tokenIdx} style={{ color: defaultColor }}>
              {token}
            </span>
          );
        })}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    );
  });
};

// ── 필터 CSS 계산 헬퍼 ──
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

export const UniversalCanvasStage: React.FC<UniversalCanvasStageProps> = (props) => {
  const {
    aspectRatio,
    canvasScale,
    canvasPan,
    layoutTemplateMode,
    selectedLayerId,
    setSelectedLayerId,
    setActiveInspectorTab,
    videoFitMode,
    videoBlurBg,
    videoFocusXPct,
    videoFocusYPct,
    videoZoomScale,
    videoRotationDeg,
    videoHorizontalFlip,
    videoVerticalFlip,
    videoFilter,
    videoCropTopPct = 0,
    videoCropBottomPct = 0,
    videoLayer,
    videoZIndex = 10,
    trackVisibility = { v1Video: true, t1Title: true, s1Subtitle: true },
    currentTimeMs = 0,
    instaConfig = {
      profileName: '유머보따리',
      profileHandle: '@humor_box',
      profileAvatarUrl: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=humor',
      isVerified: true,
      holeWidthPct: 88,
      holeHeightPct: 48,
      holeYPct: 42,
      holeRoundness: 12,
      holeBorderWidth: 1,
      holeBorderColor: '#E5E7EB',
      holeShadow: true,
      bgColor: '#FFFFFF',
      subFont: 'Pretendard',
      subColor: '#374151',
    },
    profileTransform = { xPct: 6.0, yPct: 5.5, scale: 1.0, rotationDeg: 0, zIndex: 35 },
    setProfileTransform = () => {},
    gunlimboConfig = {
      titleLine1: '충격 실화 사건',
      titleLine2: '상상도 못한 결말',
      titleFontSize: 34,
      titleLine1Color: '#FFFFFF',
      titleLine2Color: '#FFE500',
      hookPhrase: '1분 만에 밝혀진 진실',
      hookFontSize: 22,
      hookBgColor: '#FFE500',
      hookTextColor: '#000000',
      introDurationSec: 2.5,
      keepTitleThroughout: true,
      showGuidelines: false,
    },
    ssulConfig = {
      textMode: 'accumulate',
      boardName: '실시간 베스트',
      postTitle: '오늘자 레전드 썰 풀어본다',
      authorName: '익명',
      timeAgo: '방금 전',
      viewCount: '1.2만',
      upvoteCount: '842',
      fontSize: 16,
      lineHeight: 1.6,
      theme: 'clean-white',
      memeList: [],
    },
    hasTopBarBg,
    topBarHeightPct,
    topBarBg,
    topBarOpacity = 1,
    topBarRadius = 0,
    hasBottomBarBg,
    bottomBarHeightPct,
    bottomBarBg,
    bottomBarOpacity = 1,
    bottomBarRadius = 0,
    hasTopTitle,
    topTitleText,
    titleTransform = { xPct: 50, yPct: 15, scale: 1.0, rotationDeg: 0, zIndex: 20 },
    setTitleTransform = () => {},
    titleLinesMode = 'single',
    titleLine1 = '',
    titleLine2 = '',
    titleLine1SizePx = 36,
    titleLine2SizePx = 36,
    titleLine1Color = '#FFFFFF',
    titleLine2Color = '#FFE500',
    titleFontFamily = 'Pretendard',
    titleStroke = false,
    titleStrokeWidth = 2,
    titleStrokeColor = '#000000',
    titleShadow = false,
    titleShadowBlur = 8,
    titleShadowColor = '#000000',
    titleBgMode = 'none',
    titleBgColor = '#000000',
    titleBgOpacity = 0.8,
    titlePaddingX = 16,
    titlePaddingY = 8,
    titleBorderRadius = 4,
    hasTitleBadge = false,
    titleBadgeText = 'HOT',
    titleBadgeBg = '#EF4444',
    titleBadgeColor = '#FFFFFF',
    hasJab,
    jabTransform = { xPct: 50, yPct: 50, scale: 1.0, rotationDeg: 0, zIndex: 25 },
    setJabTransform = () => {},
    jabText,
    jabTiltDeg,
    jabFontSize,
    jabTextColor,
    jabStroke,
    jabStrokeWidth,
    jabStrokeColor,
    jabShadow,
    jabShadowBlur,
    jabBgEnabled,
    jabBgColor,
    jabBorderRadius,
    hasSubtitle = true,
    subTransform = { xPct: 50, yPct: 75, scale: 1.0, rotationDeg: 0, zIndex: 30 },
    setSubTransform = () => {},
    currentSubtitleText = '자막을 입력하거나 타임라인에서 자막을 선택하세요',
    subtitleConfig = {
      fontSize: 32,
      fontFamily: 'Pretendard',
      color: '#FFFFFF',
      highlightColor: '#FFE500',
      outlineColor: '#000000',
      outlineSize: 3,
      shadowColor: 'rgba(0,0,0,0.8)',
      shadowSize: 3,
      bold: true,
      italic: false,
      underline: false,
      positionY: 75,
      align: 'center',
    },
    subtitleStrokeEnabled = true,
    subtitleStrokeWidth = 3,
    subtitleStrokeColor = '#000000',
    subtitleShadowEnabled = true,
    subtitleShadowBlur = 8,
    subtitleShadowColor = 'rgba(0,0,0,0.95)',
    subtitleUseBox = false,
    subtitleBoxColor = 'rgba(0,0,0,0.6)',
    subtitleBorderRadius = 4,
    selectedHighlightColor = '#FFE500',
    hasBottomSource,
    sourceTransform = { xPct: 50, yPct: 94, scale: 1.0, rotationDeg: 0, zIndex: 20 },
    setSourceTransform = () => {},
    bottomSourceText,
    bottomSourceColor = '#FFFFFF',
    bottomSourceSizePx = 14,
    bottomSourceBg = true,
    bottomSourceBorderRadius = 4,
    bottomSourceStroke = true,
    bottomSourceShadow = true,
    hasCommentCard,
    commentCard = {
      author: '알고리즘의노예',
      handle: '@algo_slave',
      text: '이거 보고 제 인생이 바뀌었습니다 ㄷㄷ',
      likes: '1.4만',
      theme: 'yt-dark',
      blurId: false,
      anonymous: false,
    },
    commentTransform = { xPct: 50, yPct: 82, scale: 1.0, rotationDeg: 0, zIndex: 35 },
    setCommentTransform = () => {},
    layers = [],
  } = props;

  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const internalBgmRef = useRef<HTMLAudioElement>(null);
  const videoRef = (props as any).videoRef || internalVideoRef;
  const bgmAudioRef = (props as any).bgmAudioRef || internalBgmRef;
  const isLooping = (props as any).isLooping ?? true;
  const isPlaying = (props as any).isPlaying ?? false;
  const trackAudioMute = (props as any).trackAudioMute || { v1Video: false, a1Bgm: false };
  const trackLock = (props as any).trackLock || { v1Video: false };
  const handleTimeUpdate = (props as any).handleTimeUpdate;
  const handleLoadedMetadata = (props as any).handleLoadedMetadata;
  const getBgmAudioSrc = (props as any).getBgmAudioSrc || ((data?: string) => data && !data.startsWith('bgm_') ? getMediaUrl(data) : undefined);
  const currentProjectDisplayName = (props as any).currentProjectDisplayName || (topTitleText ? topTitleText.replace(/\n/g, ' ') : '영상 프로젝트');
  const setJabYPercent = (props as any).setJabYPercent || (() => {});
  const setJabTiltDeg = (props as any).setJabTiltDeg || (() => {});
  const topBarZIndex = (props as any).topBarZIndex ?? 15;
  const bottomBarZIndex = (props as any).bottomBarZIndex ?? 15;
  const setTopTitleYPct = (props as any).setTopTitleYPct || (() => {});
  const setSubtitleYPercent = (props as any).setSubtitleYPercent || (() => {});
  const setBottomSourceBottomPct = (props as any).setBottomSourceBottomPct || (() => {});
  const setVideoFocusXPct = (props as any).setVideoFocusXPct || (() => {});
  const setVideoFocusYPct = (props as any).setVideoFocusYPct || (() => {});
  const setVideoHorizontalFlip = (props as any).setVideoHorizontalFlip || (() => {});
  const setVideoRotationDeg = (props as any).setVideoRotationDeg || (() => {});
  const setVideoZoomScale = (props as any).setVideoZoomScale || (() => {});
  const showGrid = (props as any).showGrid ?? false;
  const safeZoneVisible = (props as any).safeZoneVisible ?? false;
  const safeZonePlatform: 'youtube' | 'tiktok' | 'reels' = (props as any).safeZonePlatform || 'youtube';
  const deviceMockup: 'none' | 'iphone16' | 'galaxy' = (props as any).deviceMockup || 'none';

  const selectedLayer = layers.find(l => l.id === selectedLayerId);
  const activeJab = layers.find(l => l.type === 'jab' && l.visible && currentTimeMs >= l.startMs && currentTimeMs <= l.endMs);
  const activeSub = layers.find(l => l.type === 'subtitle' && l.visible && currentTimeMs >= l.startMs && currentTimeMs <= l.endMs);
  const subtitleLayers = layers.filter(l => l.type === 'subtitle');
  const activeSplitLimit = aspectRatio === '16:9' ? 24 : ((subtitleConfig as any)?.splitLimit || 14);
  const [internalActiveFloating, setInternalActiveFloating] = useState<string>('none');
  const activeFloating = props.activeFloatingInspector !== undefined ? props.activeFloatingInspector : internalActiveFloating;
  const setActiveFloating = (insp: string) => {
    setInternalActiveFloating(insp);
    props.setActiveFloatingInspector?.(insp);
  };

  // 🛡️ 4대 폼팩터 모드 불리언 플래그 (레이어 누수 원천 차단)
  const isSsul = layoutTemplateMode === 'ssul';
  const isInsta = layoutTemplateMode === 'instagram';
  const isGunlimbo = layoutTemplateMode === 'gunlimbo';
  const isClassic = layoutTemplateMode === 'classic';
  const currentBrandChannelName = props.currentBrandChannelName || '썰방 TV';

  // 📜 썰형 5대 객체 (헤더바, 대제목, 메타데이터, 구분선, 자막본문) 설정 단일 진실 공급원
  const ssulHeader = {
    enabled: ssulConfig?.ssulHeader?.enabled ?? true,
    bgColor: ssulConfig?.ssulHeader?.bgColor || '#FFFFFF',
    heightMultiplier: ssulConfig?.ssulHeader?.heightMultiplier ?? 1.0,
    text: ssulConfig?.ssulHeader?.text || ssulConfig?.channelName || currentBrandChannelName,
    textColor: ssulConfig?.ssulHeader?.textColor || '#18181B',
    font: ssulConfig?.ssulHeader?.font || 'Pretendard',
    fontSizeMultiplier: ssulConfig?.ssulHeader?.fontSizeMultiplier ?? 1.0,
    bold: ssulConfig?.ssulHeader?.bold ?? true,
    italic: ssulConfig?.ssulHeader?.italic ?? false,
    leftIcon: ssulConfig?.ssulHeader?.leftIcon || 'arrow_back',
    rightIcon: ssulConfig?.ssulHeader?.rightIcon || 'menu',
  };

  const postTitleConfig = {
    text: ssulConfig?.postTitle?.text || topTitleText || '오늘자 역대급 레전드 실화 썰 푼다',
    color: ssulConfig?.postTitle?.color || '#111827',
    font: ssulConfig?.postTitle?.font || titleFontFamily || 'Pretendard',
    fontSizeMultiplier: ssulConfig?.postTitle?.fontSizeMultiplier ?? 1.0,
    align: (ssulConfig?.postTitle?.align as 'left' | 'center' | 'right') || 'left',
    bold: ssulConfig?.postTitle?.bold ?? true,
    italic: ssulConfig?.postTitle?.italic ?? false,
    strokeEnabled: ssulConfig?.postTitle?.strokeEnabled ?? false,
    strokeColor: ssulConfig?.postTitle?.strokeColor || '#000000',
    strokeWidth: ssulConfig?.postTitle?.strokeWidth ?? 2,
    shadowEnabled: ssulConfig?.postTitle?.shadowEnabled ?? false,
    shadowColor: ssulConfig?.postTitle?.shadowColor || 'rgba(0,0,0,0.5)',
    shadowBlur: ssulConfig?.postTitle?.shadowBlur ?? 4,
    offsetX: ssulConfig?.postTitle?.offsetX ?? 0,
    offsetY: ssulConfig?.postTitle?.offsetY ?? 0,
    letterSpacing: ssulConfig?.postTitle?.letterSpacing ?? -0.5,
    lineHeight: ssulConfig?.postTitle?.lineHeight ?? 1.3,
  };

  const metadataConfig = {
    showAuthor: ssulConfig?.metadata?.showAuthor ?? true,
    authorText: ssulConfig?.metadata?.authorText || ssulConfig?.author || '익명의 직장인',
    showTime: ssulConfig?.metadata?.showTime ?? true,
    timeText: ssulConfig?.metadata?.timeText || ssulConfig?.timeText || '방금 전',
    showViews: ssulConfig?.metadata?.showViews ?? true,
    viewsText: ssulConfig?.metadata?.viewsText || ssulConfig?.viewsText || '조회 1.2만 · 추천 420',
    separator: (ssulConfig?.metadata?.separator as 'dot' | 'bar' | 'slash') || 'dot',
    color: ssulConfig?.metadata?.color || '#6B7280',
    font: ssulConfig?.metadata?.font || 'Pretendard',
    fontSizeMultiplier: ssulConfig?.metadata?.fontSizeMultiplier ?? 1.0,
    bold: ssulConfig?.metadata?.bold ?? false,
    offsetX: ssulConfig?.metadata?.offsetX ?? 0,
    offsetY: ssulConfig?.metadata?.offsetY ?? 0,
  };

  const dividerConfig = {
    enabled: ssulConfig?.divider?.enabled ?? true,
    style: (ssulConfig?.divider?.style as 'solid' | 'dashed' | 'dotted') || 'solid',
    thickness: ssulConfig?.divider?.thickness ?? 1,
    widthPercent: ssulConfig?.divider?.widthPercent ?? 100,
    color: ssulConfig?.divider?.color || '#E5E7EB',
    opacity: ssulConfig?.divider?.opacity ?? 100,
    offsetY: ssulConfig?.divider?.offsetY ?? 0,
  };

  const ssulSubtitleConfig = {
    font: ssulConfig?.ssulSubtitle?.font || subtitleConfig?.font || 'Pretendard',
    color: ssulConfig?.ssulSubtitle?.color || '#1F2937',
    fontSizeMultiplier: ssulConfig?.ssulSubtitle?.fontSizeMultiplier ?? 1.0,
    align: (ssulConfig?.ssulSubtitle?.align as 'left' | 'center' | 'right') || 'left',
    bold: ssulConfig?.ssulSubtitle?.bold ?? true,
    italic: ssulConfig?.ssulSubtitle?.italic ?? false,
    lineHeightMultiplier: ssulConfig?.ssulSubtitle?.lineHeightMultiplier ?? 1.6,
    letterSpacingPx: ssulConfig?.ssulSubtitle?.letterSpacingPx ?? 0,
    marginTopPx: ssulConfig?.ssulSubtitle?.marginTopPx ?? 10,
    strokeEnabled: ssulConfig?.ssulSubtitle?.strokeEnabled ?? false,
    strokeColor: ssulConfig?.ssulSubtitle?.strokeColor || '#000000',
    strokeWidth: ssulConfig?.ssulSubtitle?.strokeWidth ?? 2,
    shadowEnabled: ssulConfig?.ssulSubtitle?.shadowEnabled ?? false,
    shadowColor: ssulConfig?.ssulSubtitle?.shadowColor || 'rgba(0,0,0,0.3)',
    shadowBlur: ssulConfig?.ssulSubtitle?.shadowBlur ?? 4,
    boxEnabled: ssulConfig?.ssulSubtitle?.boxEnabled ?? false,
    boxColor: ssulConfig?.ssulSubtitle?.boxColor || '#F3F4F6',
    boxRadius: ssulConfig?.ssulSubtitle?.boxRadius ?? 4,
  };

  const aspectScale = aspectRatio === '9:16' ? 1.0 : aspectRatio === '1:1' ? 0.9 : 0.75;

  return (
    <div className="canvas-viewport-root relative w-full h-full flex items-center justify-center overflow-visible">
      {/* 1. 캔버스 스테이지 (스케일 및 팬 적용) */}
      <div
        id="nle-universal-canvas"
        ref={canvasRef}
        onClick={handleCanvasDeselect}
        className={cn(
          "canvas-stage-wrapper relative shadow-2xl overflow-hidden transition-transform duration-75 flex items-center justify-center select-none rounded-2xl ring-1",
          isInsta
            ? 'bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] ring-zinc-300 dark:ring-zinc-700'
            : isSsul
            ? 'bg-[#F1F5F9] dark:bg-[#0F172A] shadow-xl ring-zinc-200 dark:ring-zinc-800'
            : 'bg-black border border-zinc-700 dark:border-zinc-800 ring-zinc-600/50',
                aspectRatio === '9:16' && "h-full max-h-[96%] aspect-[9/16]",
                aspectRatio === '16:9' && "w-full max-w-[96%] aspect-[16/9]",
                aspectRatio === '1:1' && "h-full max-h-[96%] aspect-square"
              )}
              style={{
                backgroundColor: isInsta ? instaConfig.bgColor : isSsul ? (ssulConfig?.cardBgColor === '#FFFFFF' ? '#F1F5F9' : '#0F172A') : undefined,
                transform: `scale(${canvasScale}) translate(${canvasPan.x}px, ${canvasPan.y}px)`,
              }}
            >
              {/* 🎬 LAYER 0: 비디오 레이어 (인스타 모드: 캔버스 전체 풀뷰포트 vs 일반 모드: 샌드위치/크롭) */}
              <div
                onClick={() => {
                  setSelectedLayerId('layer_video');
                  if (layoutTemplateMode !== 'instagram') setActiveInspectorTab('videoCrop');
                  else setActiveInspectorTab('template');
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setActiveFloating('videoCrop');
                }}
                className={cn(
                  "absolute overflow-hidden flex items-center justify-center transition-all cursor-pointer",
                  layoutTemplateMode === 'instagram' ? "bg-transparent" : "bg-black",
                  selectedLayerId === 'layer_video' && layoutTemplateMode !== 'instagram' && "ring-1 ring-sky-400"
                )}
                style={{
                  top: isInsta
                    ? 0
                    : isGunlimbo
                    ? (currentTimeMs <= (gunlimboConfig.introDurationSec || 2.5) * 1000 ? '34%' : '24%')
                    : isSsul
                    ? '54%'
                    : `${Math.max(aspectRatio === '9:16' && videoFitMode === 'sandwich' && hasTopBarBg ? topBarHeightPct : 0, videoCropTopPct)}%`,
                  height: isInsta
                    ? '100%'
                    : isSsul
                    ? '42%'
                    : undefined,
                  bottom: isInsta
                    ? 0
                    : isGunlimbo
                    ? '30%'
                    : isSsul
                    ? '4%'
                    : `${Math.max(aspectRatio === '9:16' && videoFitMode === 'sandwich' && hasBottomBarBg ? bottomBarHeightPct : 0, videoCropBottomPct)}%`,
                  left: isSsul ? '4%' : 0,
                  right: isSsul ? '4%' : 0,
                  borderRadius: isSsul ? '16px' : 0,
                  boxShadow: isSsul ? '0 10px 25px -5px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.08)' : 'none',
                  zIndex: videoZIndex,
                  opacity: trackVisibility.v1Video ? 1 : 0,
                }}
              >
                {/* 🌟 여백 가우시안 블러 미러 배경 (CapCut 1순위 인기 연출) */}
                {videoBlurBg && videoFitMode !== 'fullscreen' && videoLayer?.data && layoutTemplateMode !== 'instagram' && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                    <video
                      src={getMediaUrl(videoLayer.data)}
                      playsInline
                      muted
                      className="w-full h-full object-cover filter blur-[28px] brightness-[0.55] scale-[1.3] pointer-events-none select-none"
                    />
                  </div>
                )}

                <div
                  className="w-full h-full relative overflow-hidden flex items-center justify-center z-1"
                  style={{
                    transform: `translate(${(videoFocusXPct - 50) * 0.8}%, ${(videoFocusYPct - 50) * 0.8}%) scale(${
                      (videoZoomScale / 100) * (
                        layoutTemplateMode === 'gunlimbo' && currentTimeMs <= (gunlimboConfig.introDurationSec || 2.5) * 1000
                          ? 1.0 + ((currentTimeMs / ((gunlimboConfig.introDurationSec || 2.5) * 1000)) * 0.10)
                          : 1.0
                      )
                    }) scaleX(${videoHorizontalFlip ? -1 : 1}) scaleY(${videoVerticalFlip ? -1 : 1}) rotate(${videoRotationDeg}deg)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.05s ease-out',
                  }}
                >
                  {videoLayer?.data ? (
                    <video
                      ref={videoRef}
                      src={getMediaUrl(videoLayer.data)}
                      playsInline
                      loop={isLooping}
                      muted={trackAudioMute.v1Video}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      style={{ filter: computeVideoCssFilter(videoFilter) }}
                      className="w-full h-full object-cover pointer-events-none select-none transition-[filter] duration-150"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-2 p-4 text-center bg-zinc-900 select-none">
                      <FileVideo className="w-12 h-12 stroke-[1.2] text-zinc-600 animate-pulse" />
                      <span className="text-[11px] font-mono text-zinc-400">{currentProjectDisplayName}.mp4</span>
                      <span className="text-[9px] text-zinc-600">({videoFitMode.toUpperCase()} FIT · ZOOM {videoZoomScale}%)</span>
                    </div>
                  )}

                  {/* 🎞️ 시네마틱 35mm 영화 필름 노이즈 / 그레인 오버레이 (SVG 프랙탈 프로시저럴 노이즈) */}
                  {videoFilter.filmGrain > 0 && (
                    <div
                      className="absolute inset-0 pointer-events-none z-10 mix-blend-overlay"
                      style={{
                        opacity: (videoFilter.filmGrain / 100) * 0.85,
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'repeat',
                        backgroundSize: '160px 160px',
                      }}
                    />
                  )}

                  {/* 🎬 시네마틱 비네팅 오버레이 */}
                  {videoFilter.vignette > 0 && (
                    <div
                      className="absolute inset-0 pointer-events-none z-10"
                      style={{
                        background: `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,${(videoFilter.vignette / 100) * 0.88}) 100%)`,
                      }}
                    />
                  )}

                  {/* 📼 레트로 90s VHS 스캔라인 오버레이 */}
                  {videoFilter.preset === 'retro-vhs' && (
                    <div
                      className="absolute inset-0 pointer-events-none z-10 opacity-20"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 3px)',
                        backgroundSize: '100% 3px',
                      }}
                    />
                  )}
                </div>

                {/* 🎵 BGM HTML5 오디오 재생 엘리먼트 */}
                <audio
                  ref={bgmAudioRef}
                  src={getBgmAudioSrc(layers.find(l => l.type === 'audio' && (l.id === 'layer_audio_bgm' || l.name.includes('BGM')))?.data)}
                  loop={isLooping}
                  muted={trackAudioMute.a1Bgm}
                  className="hidden"
                />
              </div>

              {/* 🕳️ LAYER 0.5: [인스타형 전용] 화이트 카드 오버레이 마스크 (zIndex: 20으로 비디오 위에 확실히 전면 배치) */}
              {layoutTemplateMode === 'instagram' && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ zIndex: 20 }}
                >
                  <svg
                    className="w-full h-full absolute inset-0 pointer-events-none select-none"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 1000 1000"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <mask id="insta-hole-mask">
                        {/* 전체 캔버스를 흰색(불투명 마스크 통과)으로 채움 */}
                        <rect width="1000" height="1000" fill="white" />
                        {/* 중앙 구멍 윈도우만 검은색(마스크 차단=투명)으로 뚫어 비디오가 선명히 보이게 함 */}
                        <rect
                          x={((100 - instaConfig.holeWidthPct) / 2) * 10}
                          y={(instaConfig.holeYPct - (instaConfig.holeHeightPct / 2)) * 10}
                          width={instaConfig.holeWidthPct * 10}
                          height={instaConfig.holeHeightPct * 10}
                          rx={instaConfig.holeRoundness * 2.5}
                          ry={instaConfig.holeRoundness * 2.5}
                          fill="black"
                        />
                      </mask>
                    </defs>
                    {/* 카드 전체에 흰색(#FFFFFF)을 칠하고 중앙 구멍만 투명하게 통과시킴 */}
                    <rect
                      width="1000"
                      height="1000"
                      fill={instaConfig.bgColor || '#FFFFFF'}
                      mask="url(#insta-hole-mask)"
                    />
                  </svg>

                  {/* 중앙 구멍 윈도우 테두리, 그림자 및 인터랙션 클릭 존 */}
                  <div
                    onClick={() => {
                      setSelectedLayerId('layer_video');
                      setActiveInspectorTab('template');
                      document.getElementById('insta-sec-hole')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }}
                    className={cn(
                      "absolute cursor-pointer pointer-events-auto transition-all",
                      selectedLayerId === 'layer_video' && "ring-2 ring-sky-400 ring-offset-2"
                    )}
                    style={{
                      top: `${instaConfig.holeYPct - (instaConfig.holeHeightPct / 2)}%`,
                      height: `${instaConfig.holeHeightPct}%`,
                      left: `${(100 - instaConfig.holeWidthPct) / 2}%`,
                      right: `${(100 - instaConfig.holeWidthPct) / 2}%`,
                      borderRadius: `${instaConfig.holeRoundness}px`,
                      border: `${instaConfig.holeBorderWidth}px solid ${instaConfig.holeBorderColor}`,
                      boxShadow: instaConfig.holeShadow
                        ? '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)'
                        : undefined,
                      backgroundImage: !videoLayer?.data
                        ? 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)'
                        : undefined,
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    }}
                    title="중앙 구멍 윈도우 (클릭하여 비디오 위치/크기 조절)"
                  />
                </div>
              )}

              {/* 🎯 비디오 전용 2D 자유 변형 기즈모 (2D 자유 이동, 줌, 회전, 스냅) */}
              {selectedLayerId === 'layer_video' && !trackLock.v1Video && (
                <div
                  className="absolute pointer-events-none z-40 transition-transform duration-75"
                  style={{
                    top: layoutTemplateMode === 'instagram'
                      ? `${instaConfig.holeYPct - (instaConfig.holeHeightPct / 2)}%`
                      : layoutTemplateMode === 'gunlimbo'
                      ? (currentTimeMs <= (gunlimboConfig.introDurationSec || 2.5) * 1000 ? '34%' : '24%')
                      : `${Math.max(aspectRatio === '9:16' && videoFitMode === 'sandwich' && hasTopBarBg ? topBarHeightPct : 0, videoCropTopPct)}%`,
                    height: layoutTemplateMode === 'instagram'
                      ? `${instaConfig.holeHeightPct}%`
                      : undefined,
                    bottom: layoutTemplateMode === 'instagram'
                      ? undefined
                      : layoutTemplateMode === 'gunlimbo'
                      ? '30%'
                      : `${Math.max(aspectRatio === '9:16' && videoFitMode === 'sandwich' && hasBottomBarBg ? bottomBarHeightPct : 0, videoCropBottomPct)}%`,
                    left: layoutTemplateMode === 'instagram' ? `${(100 - instaConfig.holeWidthPct) / 2}%` : 0,
                    right: layoutTemplateMode === 'instagram' ? `${(100 - instaConfig.holeWidthPct) / 2}%` : 0,
                    borderRadius: layoutTemplateMode === 'instagram' ? `${instaConfig.holeRoundness}px` : 0,
                  }}
                >
                  {/* 슬림 1.5px 외곽선 & 2D 중앙 드래그 존 */}
                  <div
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.stopPropagation();
                      const targetEl = e.currentTarget as HTMLElement;
                      targetEl.setPointerCapture(e.pointerId);
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const initialX = videoFocusXPct;
                      const initialY = videoFocusYPct;

                      const onPointerMove = (mv: PointerEvent) => {
                        const dx = (mv.clientX - startX) / Math.max(0.1, canvasScale);
                        const dy = (mv.clientY - startY) / Math.max(0.1, canvasScale);
                        const newX = Math.max(0, Math.min(100, Math.round(initialX + (dx * 0.4))));
                        const newY = Math.max(0, Math.min(100, Math.round(initialY + (dy * 0.4))));
                        setVideoFocusXPct(newX);
                        setVideoFocusYPct(newY);
                      };

                      const onPointerUp = (upEv: PointerEvent) => {
                        try { targetEl.releasePointerCapture(upEv.pointerId); } catch (_) {}
                        window.removeEventListener('pointermove', onPointerMove);
                        window.removeEventListener('pointerup', onPointerUp);
                      };

                      window.addEventListener('pointermove', onPointerMove);
                      window.addEventListener('pointerup', onPointerUp);
                    }}
                    className="absolute inset-0 border-[1.5px] border-sky-400 pointer-events-auto cursor-move shadow-[0_0_8px_rgba(56,189,248,0.7)] bg-sky-400/5 hover:bg-sky-400/10 transition-colors"
                    title="영상을 마우스로 드래그하여 원하는 위치로 자유 이동"
                  />

                  {/* 상단 플로팅 비디오 컨트롤 뱃지 */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-sky-600/95 text-white text-[9px] font-bold px-2.5 py-1 rounded shadow-lg pointer-events-auto flex items-center gap-2 whitespace-nowrap z-50 backdrop-blur-xs">
                    <span>🎬 V1 비디오</span>
                    <span className="text-[8.5px] text-sky-200 font-mono">
                      ({videoZoomScale}% · X:{videoFocusXPct}% · Y:{videoFocusYPct}% · {videoRotationDeg}°)
                    </span>
                    <div className="flex items-center gap-1 border-l border-sky-400/40 pl-1.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setVideoRotationDeg(r => (r + 90) % 360); }}
                        className="p-0.5 hover:bg-sky-500 rounded text-[9px] cursor-pointer"
                        title="90도 회전"
                      >
                        ↻ 90°
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setVideoHorizontalFlip(f => !f); }}
                        className="p-0.5 hover:bg-sky-500 rounded text-[9px] cursor-pointer"
                        title="좌우 반전"
                      >
                        ⇄ 반전
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setVideoFocusXPct(50); setVideoFocusYPct(50); setVideoZoomScale(100); setVideoRotationDeg(0); }}
                        className="p-0.5 hover:bg-sky-500 rounded text-[9px] text-sky-200 cursor-pointer"
                        title="중앙 정렬 리셋"
                      >
                        ⟲ 리셋
                      </button>
                    </div>
                  </div>

                  {/* 4대 모서리 리사이즈 핸들 (확대/축소) */}
                  {[
                    { pos: '-top-1.5 -left-1.5', cursor: 'cursor-nwse-resize', sign: -1 },
                    { pos: '-top-1.5 -right-1.5', cursor: 'cursor-nesw-resize', sign: 1 },
                    { pos: '-bottom-1.5 -left-1.5', cursor: 'cursor-nesw-resize', sign: -1 },
                    { pos: '-bottom-1.5 -right-1.5', cursor: 'cursor-nwse-resize', sign: 1 },
                  ].map((handle, hIdx) => (
                    <div
                      key={hIdx}
                      onPointerDown={(e) => {
                        if (e.button !== 0) return;
                        e.stopPropagation();
                        const targetEl = e.currentTarget as HTMLElement;
                        targetEl.setPointerCapture(e.pointerId);
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const initialZoom = videoZoomScale;

                        const onPointerMove = (mv: PointerEvent) => {
                          const dx = (mv.clientX - startX) / Math.max(0.1, canvasScale);
                          const dy = (mv.clientY - startY) / Math.max(0.1, canvasScale);
                          const delta = (dx * handle.sign + dy * handle.sign) / 2;
                          const newZoom = Math.max(50, Math.min(300, Math.round(initialZoom + delta)));
                          setVideoZoomScale(newZoom);
                        };

                        const onPointerUp = (upEv: PointerEvent) => {
                          try { targetEl.releasePointerCapture(upEv.pointerId); } catch (_) {}
                          window.removeEventListener('pointermove', onPointerMove);
                          window.removeEventListener('pointerup', onPointerUp);
                        };

                        window.addEventListener('pointermove', onPointerMove);
                        window.addEventListener('pointerup', onPointerUp);
                      }}
                      className={`absolute ${handle.pos} w-3 h-3 bg-white border-2 border-sky-600 rounded-2xs ${handle.cursor} pointer-events-auto shadow-md hover:scale-125 transition-transform z-50`}
                      title="모서리를 드래그하여 비디오 확대/축소"
                    />
                  ))}
                </div>
              )}

              {/* 🎯 [군림보형] 픽셀링 기반 3단 화면 배치 (상단 2줄 대제목 + 중앙 100% 흰색 띠 후킹 바 + 하단 레터박스) */}
              {layoutTemplateMode === 'gunlimbo' && (
                <>
                  {/* 1. 상단 블랙 레터박스 (0% ~ 24%) & 2줄 대제목 (노랑/흰) */}
                  {(gunlimboConfig.keepTitleThroughout || currentTimeMs <= gunlimboConfig.introDurationSec * 1000) && (
                    <div
                      onClick={() => {
                        setSelectedLayerId('layer_gunlimbo_title');
                        setActiveInspectorTab('template');
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setActiveFloating('postTitle');
                      }}
                      className={cn(
                        "absolute top-0 left-0 right-0 h-[24%] bg-black select-none flex flex-col items-center justify-center px-4 transition-all cursor-pointer",
                        selectedLayerId === 'layer_gunlimbo_title' && "ring-1 ring-amber-400"
                      )}
                      style={{
                        zIndex: 25,
                        borderBottom: gunlimboConfig.showGuidelines ? '1.5px dashed rgba(161, 161, 170, 0.75)' : 'none',
                      }}
                      title="클릭하여 상단 대제목 설정 (더블클릭: 팝업)"
                    >
                      <div className="flex flex-col items-center text-center leading-tight">
                        <span
                          className="font-black tracking-tight drop-shadow-sm whitespace-pre-line"
                          style={{
                            color: gunlimboConfig.titleLine1Color || '#FFFFFF',
                            fontSize: `${gunlimboConfig.titleFontSize || 34}px`,
                            fontFamily: titleFontFamily,
                            lineHeight: 1.15,
                          }}
                        >
                          {gunlimboConfig.titleLine1}
                        </span>
                        <span
                          className="font-black tracking-tight drop-shadow-sm whitespace-pre-line mt-1"
                          style={{
                            color: gunlimboConfig.titleLine2Color || '#FFE500',
                            fontSize: `${gunlimboConfig.titleFontSize || 34}px`,
                            fontFamily: titleFontFamily,
                            lineHeight: 1.15,
                          }}
                        >
                          {gunlimboConfig.titleLine2}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 2. 24~34% 짙은 회색 밴드 위 100% 순백색 띠 바 (뇌전구 실측 0초~2.5초 노출) */}
                  {currentTimeMs <= gunlimboConfig.introDurationSec * 1000 && (
                    <div
                      onClick={() => {
                        setSelectedLayerId('layer_gunlimbo_hook');
                        setActiveInspectorTab('template');
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setActiveFloating('gunlimboHook');
                      }}
                      className={cn(
                        "absolute left-0 right-0 w-full flex items-center justify-center transition-all cursor-pointer shadow-lg",
                        selectedLayerId === 'layer_gunlimbo_hook' && "ring-2 ring-sky-400"
                      )}
                      style={{
                        top: '24%',
                        height: '10%',
                        backgroundColor: '#3F3F46',
                        zIndex: 45,
                      }}
                      title="클릭하여 소제목 훅 문구 설정"
                    >
                      <div 
                        className="w-full py-1.5 px-4 flex items-center justify-center shadow-xs"
                        style={{ backgroundColor: gunlimboConfig.hookBgColor || '#FFFFFF' }}
                      >
                        <span
                          className="font-black tracking-tight text-center leading-snug break-keep select-none"
                          style={{
                            color: gunlimboConfig.hookTextColor || '#000000',
                            fontSize: `${gunlimboConfig.hookFontSize || 22}px`,
                            fontFamily: titleFontFamily,
                          }}
                        >
                          {gunlimboConfig.hookPhrase}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 3. 하단 블랙 레터박스 (70% ~ 100%) 점선 가이드라인 */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[30%] bg-black pointer-events-none select-none"
                    style={{
                      zIndex: 25,
                      borderTop: gunlimboConfig.showGuidelines ? '1.5px dashed rgba(161, 161, 170, 0.75)' : 'none',
                    }}
                  />
                </>
              )}

              {/* 📸 [인스타형 원형 100%] 좌상단 프로필 (TransformGizmo로 자유 이동/크기 조절 지원, 좌측 앵커 정렬) */}
              {layoutTemplateMode === 'instagram' && (
                <TransformGizmo
                  transform={profileTransform}
                  onDoubleClick={() => setActiveFloating('instaProfile')}
                  selected={selectedLayerId === 'layer_insta_profile'}
                  name="인스타 프로필"
                  canvasScale={canvasScale}
                  anchor="left"
                  onSelect={() => {
                    setSelectedLayerId('layer_insta_profile');
                    setActiveInspectorTab('template');
                  }}
                  onChange={(newT) => setProfileTransform(newT)}
                >
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setActiveFloating('instaProfile');
                    }}
                    className="flex items-center gap-2.5 cursor-pointer select-none group"
                  >
                    <div className="w-11 h-11 rounded-full border-2 border-blue-600 overflow-hidden bg-white shadow-xs shrink-0 flex items-center justify-center">
                      <img
                        src={instaConfig.profileAvatarUrl || "https://api.dicebear.com/9.x/lorelei/svg?seed=user_avatar_blue"}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col text-left leading-tight">
                      <div className="flex items-center gap-1">
                        <span className="text-blue-600 font-bold text-sm tracking-tight group-hover:underline">
                          {instaConfig.profileName || '사용자명'}
                        </span>
                        {instaConfig.isVerified && (
                          <svg className="w-3.5 h-3.5 text-blue-500 fill-current shrink-0" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-neutral-500 text-xs font-normal">
                        {instaConfig.profileHandle || '@handle'}
                      </span>
                    </div>
                  </div>
                </TransformGizmo>
              )}

              {/* 📜 [썰형] 픽셀링 규격 100% 동일 복제: 화이트 커뮤니티 포스트 카드 (헤더바 + 대제목 + 메타데이터 + 구분선 + 자막본문) */}
              {layoutTemplateMode === 'ssul' && (
                <div
                  className="absolute z-[35] flex flex-col transition-all select-none"
                  style={{
                    top: '4%',
                    left: '4%',
                    right: '4%',
                    maxHeight: '48%',
                    zIndex: 35,
                    backgroundColor: ssulConfig?.cardBgColor || '#FFFFFF',
                    borderRadius: `${ssulConfig?.cardRadius ?? 14}px`,
                    boxShadow: '0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                  }}
                >
                  {/* 1. 헤더바 (Header Bar) */}
                  {ssulHeader.enabled && (
                    <div
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setActiveFloating('ssulHeader');
                      }}
                      className="px-3.5 py-2 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700/60 cursor-pointer hover:bg-black/[0.02] transition-colors"
                      style={{
                        backgroundColor: ssulHeader.bgColor || '#FFFFFF',
                        minHeight: `${Math.round(36 * (ssulHeader.heightMultiplier || 1.0))}px`,
                      }}
                      title="더블클릭하여 헤더 바 속성 편집"
                    >
                      <div className="flex items-center gap-2">
                        {ssulHeader.leftIcon === 'arrow_back' && <ArrowLeft className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />}
                        {ssulHeader.leftIcon === 'home' && <Sparkles className="w-4 h-4 text-amber-500" />}
                        <span
                          style={{
                            color: ssulHeader.textColor || '#18181B',
                            fontFamily: ssulHeader.font || 'Pretendard',
                            fontSize: `${Math.round(13 * (ssulHeader.fontSizeMultiplier || 1.0))}px`,
                            fontWeight: ssulHeader.bold ? 700 : 500,
                            fontStyle: ssulHeader.italic ? 'italic' : 'normal',
                          }}
                        >
                          {ssulHeader.text || currentBrandChannelName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ssulHeader.rightIcon === 'menu' && <Menu className="w-4 h-4 text-zinc-500" />}
                        {ssulHeader.rightIcon === 'share' && <Share2 className="w-4 h-4 text-zinc-500" />}
                      </div>
                    </div>
                  )}

                  {/* 포스트 본체 내부 패딩 영역 */}
                  <div className="p-3.5 flex flex-col flex-1 overflow-hidden">
                    {/* 2. 게시글 제목 (Post Title) */}
                    <div
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setActiveFloating('postTitle');
                      }}
                      className="cursor-pointer hover:bg-black/[0.02] rounded p-1 -m-1 transition-colors"
                      style={{
                        textAlign: postTitleConfig.align || 'left',
                        transform: `translate(${postTitleConfig.offsetX || 0}px, ${postTitleConfig.offsetY || 0}px)`,
                      }}
                      title="더블클릭하여 게시글 제목 속성 편집"
                    >
                      <h2
                        style={{
                          color: postTitleConfig.color || '#111827',
                          fontFamily: postTitleConfig.font || 'Pretendard',
                          fontSize: `${Math.round(20 * (postTitleConfig.fontSizeMultiplier || 1.0) * aspectScale)}px`,
                          fontWeight: postTitleConfig.bold ? 800 : 600,
                          fontStyle: postTitleConfig.italic ? 'italic' : 'normal',
                          letterSpacing: `${postTitleConfig.letterSpacing || -0.5}px`,
                          lineHeight: postTitleConfig.lineHeight || 1.3,
                          WebkitTextStroke: postTitleConfig.strokeEnabled ? `${postTitleConfig.strokeWidth}px ${postTitleConfig.strokeColor}` : 'none',
                          textShadow: postTitleConfig.shadowEnabled ? `0 2px ${postTitleConfig.shadowBlur}px ${postTitleConfig.shadowColor}` : 'none',
                        }}
                        className="tracking-tight whitespace-pre-line break-keep"
                      >
                        {postTitleConfig.text || topTitleText || '오늘자 레전드 썰 풀어본다'}
                      </h2>
                    </div>

                    {/* 3. 메타데이터 (Metadata) */}
                    <div
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setActiveFloating('metadata');
                      }}
                      className="flex items-center gap-1.5 mt-2 text-xs cursor-pointer hover:bg-black/[0.02] rounded px-1 -mx-1 py-0.5 transition-colors"
                      style={{
                        color: metadataConfig.color || '#6B7280',
                        fontFamily: metadataConfig.font || 'Pretendard',
                        fontSize: `${Math.round(11 * (metadataConfig.fontSizeMultiplier || 1.0))}px`,
                        fontWeight: metadataConfig.bold ? 700 : 400,
                        transform: `translate(${metadataConfig.offsetX || 0}px, ${metadataConfig.offsetY || 0}px)`,
                      }}
                      title="더블클릭하여 메타데이터 속성 편집"
                    >
                      {metadataConfig.showAuthor && (
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{metadataConfig.authorText || '익명'}</span>
                      )}
                      {metadataConfig.showAuthor && (metadataConfig.showTime || metadataConfig.showViews) && (
                        <span className="opacity-40">{metadataConfig.separator === 'slash' ? '/' : metadataConfig.separator === 'bar' ? '|' : '·'}</span>
                      )}
                      {metadataConfig.showTime && (
                        <span>{metadataConfig.timeText || '방금 전'}</span>
                      )}
                      {metadataConfig.showTime && metadataConfig.showViews && (
                        <span className="opacity-40">{metadataConfig.separator === 'slash' ? '/' : metadataConfig.separator === 'bar' ? '|' : '·'}</span>
                      )}
                      {metadataConfig.showViews && (
                        <span>{metadataConfig.viewsText || '조회 1.2만'}</span>
                      )}
                    </div>

                    {/* 4. 구분선 (Divider) */}
                    {dividerConfig.enabled && (
                      <div
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setActiveFloating('divider');
                        }}
                        className="my-2.5 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          transform: `translateY(${dividerConfig.offsetY || 0}px)`,
                        }}
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

                    {/* 5. 자막 본문 (Subtitle Body) */}
                    <div
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setActiveFloating('ssulSubtitle');
                      }}
                      className="flex-1 cursor-pointer hover:bg-black/[0.02] rounded p-1 -m-1 transition-colors overflow-hidden"
                      style={{
                        marginTop: `${ssulSubtitleConfig.marginTopPx ?? 10}px`,
                        textAlign: ssulSubtitleConfig.align || 'left',
                      }}
                      title="더블클릭하여 자막 본문 속성 편집"
                    >
                      <p
                        style={{
                          color: ssulSubtitleConfig.color || '#1F2937',
                          fontFamily: ssulSubtitleConfig.font || 'Pretendard',
                          fontSize: `${Math.round(15 * (ssulSubtitleConfig.fontSizeMultiplier || 1.0) * aspectScale)}px`,
                          fontWeight: ssulSubtitleConfig.bold ? 700 : 500,
                          fontStyle: ssulSubtitleConfig.italic ? 'italic' : 'normal',
                          lineHeight: ssulSubtitleConfig.lineHeightMultiplier || 1.6,
                          letterSpacing: `${ssulSubtitleConfig.letterSpacingPx || 0}px`,
                          backgroundColor: ssulSubtitleConfig.boxEnabled ? ssulSubtitleConfig.boxColor : 'transparent',
                          borderRadius: ssulSubtitleConfig.boxEnabled ? `${ssulSubtitleConfig.boxRadius}px` : 0,
                          padding: ssulSubtitleConfig.boxEnabled ? '6px 10px' : '0',
                          WebkitTextStroke: ssulSubtitleConfig.strokeEnabled ? `${ssulSubtitleConfig.strokeWidth}px ${ssulSubtitleConfig.strokeColor}` : 'none',
                          textShadow: ssulSubtitleConfig.shadowEnabled ? `0 2px ${ssulSubtitleConfig.shadowBlur}px ${ssulSubtitleConfig.shadowColor}` : 'none',
                        }}
                        className="whitespace-pre-line break-keep"
                      >
                        {activeSub?.data || currentSubtitleText || '여기에 썰형 자막 본문이 실시간 동기화되어 표시됩니다.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ⬛ LAYER 1: 상단 배경 바 (Top Bar Bg - 독립 제어) */}
              {!isSsul && !isInsta && hasTopBarBg && (
                <div
                  onClick={() => { setSelectedLayerId('layer_top_bar'); setActiveInspectorTab('titleSource'); }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setActiveFloating('topBottomBar');
                  }}
                  className="absolute top-0 left-0 right-0 transition-all cursor-pointer"
                  style={{
                    height: `${topBarHeightPct}%`,
                    backgroundColor: topBarBg,
                    opacity: topBarOpacity,
                    zIndex: topBarZIndex,
                  }}
                  title="클릭하여 상단 배경 바 설정 (더블클릭: 팝업)"
                />
              )}

              {/* 👑 LAYER 2: 상단 타이틀 (1줄/2줄 모드, 외곽선/그림자/배경박스/모서리 둥글기 완벽 지원) */}
              {!isSsul && hasTopTitle && trackVisibility.t1Title && (
                <TransformGizmo
                  transform={titleTransform}
                  onDoubleClick={() => setActiveFloating('postTitle')}
                  selected={selectedLayerId === 'layer_title' || selectedLayerId === 'layer_top_title'}
                  name="상단 타이틀"
                  canvasScale={canvasScale}
                  anchor={layoutTemplateMode === 'instagram' ? 'left' : 'center'}
                  onSelect={() => {
                    setSelectedLayerId('layer_title');
                    if (layoutTemplateMode !== 'instagram') setActiveInspectorTab('titleSource');
                    else setActiveInspectorTab('template');
                  }}
                  onChange={(newT) => {
                    setTitleTransform(newT);
                    setTopTitleYPct(newT.yPct);
                  }}
                >
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setActiveFloating('postTitle');
                    }}
                    className={cn(
                      "flex flex-col select-none cursor-move transition-all",
                      layoutTemplateMode === 'instagram' ? "items-start text-left" : "items-center text-center"
                    )}
                    style={{
                      fontFamily: titleFontFamily,
                      backgroundColor: layoutTemplateMode === 'instagram' ? 'transparent' : (titleBgMode !== 'none' ? titleBgColor : 'transparent'),
                      paddingLeft: layoutTemplateMode === 'instagram' ? 0 : (titleBgMode !== 'none' ? `${titlePaddingX}px` : 0),
                      paddingRight: layoutTemplateMode === 'instagram' ? 0 : (titleBgMode !== 'none' ? `${titlePaddingX}px` : 0),
                      paddingTop: layoutTemplateMode === 'instagram' ? 0 : (titleBgMode !== 'none' ? `${titlePaddingY}px` : 0),
                      paddingBottom: layoutTemplateMode === 'instagram' ? 0 : (titleBgMode !== 'none' ? `${titlePaddingY}px` : 0),
                      borderRadius: titleBgMode === 'pill' ? '9999px' : `${titleBorderRadius}px`,
                      boxShadow: layoutTemplateMode === 'instagram' ? 'none' : (titleShadow ? `0 4px ${titleShadowBlur * 2}px ${titleShadowColor}` : 'none'),
                    }}
                  >
                    {layoutTemplateMode === 'instagram' ? (
                      <div
                        className="font-black leading-tight tracking-tight text-left whitespace-pre-line text-neutral-950 dark:text-neutral-950"
                        style={{
                          fontSize: `${Math.round(27 * (titleTransform.scale || 1.0) * aspectScale)}px`,
                          lineHeight: '1.18',
                          letterSpacing: '-0.035em',
                          color: '#000000',
                          textAlign: 'left',
                          fontWeight: 900,
                        }}
                      >
                        {topTitleText || '제목을\n입력하세요'}
                      </div>
                    ) : (
                      <>
                        {/* 상단 뱃지 */}
                        {hasTitleBadge && titleBadgeText && (
                          <span
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setActiveFloating('badgeTag');
                            }}
                            className="text-white text-[8px] font-black px-1.5 py-0.2 uppercase tracking-wider mb-1 rounded-[1px] shadow-sm cursor-pointer hover:opacity-90"
                            style={{ backgroundColor: titleBadgeColor }}
                            title="더블클릭하여 뱃지 속성 편집"
                          >
                            {titleBadgeText}
                          </span>
                        )}

                        {/* 1단 타이틀 */}
                        {titleLine1 && (
                          <div
                            className="font-black leading-tight tracking-tight whitespace-nowrap"
                            style={{
                              color: titleLine1Color,
                              fontSize: `${Math.round(titleLine1SizePx * aspectScale)}px`,
                              WebkitTextStroke: titleStroke ? `${titleStrokeWidth}px ${titleStrokeColor}` : 'none',
                              paintOrder: 'stroke fill',
                              WebkitFontSmoothing: 'antialiased',
                              textShadow: titleShadow ? `0 2px ${titleShadowBlur}px ${titleShadowColor}` : 'none',
                            }}
                          >
                            {titleLine1}
                          </div>
                        )}

                        {/* 2단 타이틀 (double 모드일 때만 표시) */}
                        {titleLinesMode === 'double' && titleLine2 && (
                          <div
                            className="font-black leading-tight tracking-tight whitespace-nowrap mt-0.5"
                            style={{
                              color: titleLine2Color,
                              fontSize: `${Math.round(titleLine2SizePx * aspectScale)}px`,
                              WebkitTextStroke: titleStroke ? `${titleStrokeWidth}px ${titleStrokeColor}` : 'none',
                              paintOrder: 'stroke fill',
                              WebkitFontSmoothing: 'antialiased',
                              textShadow: titleShadow ? `0 2px ${titleShadowBlur}px ${titleShadowColor}` : 'none',
                            }}
                          >
                            {titleLine2}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </TransformGizmo>
              )}

              {/* ⚡ LAYER 3: 긴박 쨉쨉이 훅 (타임라인 시간대 동기화 & 고스트 노출 완벽 차단) */}
              {(() => {
                // 재생 중일 때는 현재 타임코드에 위치한 activeJab만 표시! 비시간대 고스트 쨉쨉이 영구 차단
                const isExplicitJabClipSelected = !isPlaying && selectedLayer?.type === 'jab' && selectedLayer.id !== 'layer_audio_bgm';
                const displayJab = activeJab || (isExplicitJabClipSelected ? selectedLayer : null);
                const isJabSelected = selectedLayerId === 'layer_jab' || selectedLayer?.type === 'jab' || (displayJab ? selectedLayerId === displayJab.id : false);
                const shouldShowJab = !isSsul && hasJab && trackVisibility.t2Jab !== false && !!displayJab;

                if (!shouldShowJab) return null;

                return (
                  <TransformGizmo
                    transform={jabTransform}
                    onDoubleClick={() => setActiveFloating('jabHook')}
                    selected={isJabSelected}
                    name="긴박 쨉쨉이 훅"
                    canvasScale={canvasScale}
                    onSelect={() => {
                      if (displayJab) setSelectedLayerId(displayJab.id);
                      else setSelectedLayerId('layer_jab');
                      setActiveInspectorTab('jabHook');
                    }}
                    onChange={(newT) => {
                      setJabTransform(newT);
                      setJabYPercent(newT.yPct);
                      setJabTiltDeg(newT.rotationDeg);
                    }}
                  >
                    <div
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setActiveFloating('jabHook');
                      }}
                      className="font-black px-3 py-1.5 flex items-center justify-center whitespace-nowrap cursor-move transition-all"
                      style={{
                        backgroundColor: jabBgEnabled ? jabBgColor : 'transparent',
                        borderRadius: `${jabBorderRadius}px`,
                        boxShadow: jabShadow ? `0 4px ${jabShadowBlur * 2}px rgba(0,0,0,0.8)` : 'none',
                        border: (jabBgEnabled && jabStroke) ? '1px solid rgba(0,0,0,0.2)' : 'none',
                      }}
                    >
                      <span
                        style={{
                          fontSize: `${Math.round(jabFontSize * aspectScale)}px`,
                          color: jabTextColor,
                          fontFamily: titleFontFamily,
                          WebkitTextStroke: jabStroke ? `${jabStrokeWidth}px ${jabStrokeColor}` : 'none',
                          paintOrder: 'stroke fill',
                          WebkitFontSmoothing: 'antialiased',
                          textShadow: jabShadow ? `0 2px ${jabShadowBlur}px rgba(0,0,0,0.9)` : 'none',
                        }}
                      >
                        {displayJab?.data || jabText}
                      </span>
                    </div>
                  </TransformGizmo>
                );
              })()}

              {/* 💬 LAYER 4: 본문 자막 (타임라인 시간대 동기화 & 인스타형 상시 노출 & 고스트 자막 방지) */}
              {(() => {
                const isSubSelected = selectedLayer?.type === 'subtitle' || selectedLayerId === 'layer_sub';
                const displaySub = activeSub || (isSubSelected ? (selectedLayer?.type === 'subtitle' ? selectedLayer : subtitleLayers[0]) : (layoutTemplateMode === 'instagram' ? subtitleLayers[0] : null));
                const subText = displaySub?.data || currentSubtitleText || (
                  layoutTemplateMode === 'instagram'
                    ? '게시글 본문 자막을 입력하세요.\n타임라인에 자막이 동기화됩니다.'
                    : '자막을 입력하거나 타임라인에서 자막을 선택하세요'
                );

                const isTrackVisible = trackVisibility ? (trackVisibility.sub !== false && (trackVisibility as any).s1Subtitle !== false) : true;
                const isConfigVisible = subtitleConfig?.visible !== false;
                const shouldShowSub = isConfigVisible &&
                  isTrackVisible &&
                  (hasSubtitle !== false) &&
                  (layoutTemplateMode === 'instagram' || !!displaySub || !!currentSubtitleText || isSubSelected);

                // 🎯 군림보형: 0초~후킹구간에는 중앙 100% 흰색 바에서 첫 문장이 표시되므로 하단 자막 중복 방지 (선택 편집 시 제외)
                if (layoutTemplateMode === 'gunlimbo' && currentTimeMs <= gunlimboConfig.introDurationSec * 1000 && !isSubSelected) {
                  return null;
                }

                if (!shouldShowSub || isSsul) return null;

                return (
                  <TransformGizmo
                    transform={subTransform}
                    selected={isSubSelected}
                    name="본문 자막"
                    onDoubleClick={() => setActiveFloating('ssulSubtitle')}
                    canvasScale={canvasScale}
                    anchor={layoutTemplateMode === 'instagram' ? 'left' : 'center'}
                    onSelect={() => {
                      if (displaySub) setSelectedLayerId(displaySub.id);
                      else setSelectedLayerId('layer_sub');
                      if (layoutTemplateMode !== 'instagram') setActiveInspectorTab('style');
                      else setActiveInspectorTab('template');
                    }}
                    onChange={(newT) => {
                      setSubTransform(newT);
                      if (setSubtitleYPercent) setSubtitleYPercent(newT.yPct);
                    }}
                  >
                    <div
                      className={cn(
                        "inline-block whitespace-pre-line transition-all cursor-move",
                        layoutTemplateMode === 'instagram'
                          ? "text-left font-medium max-w-[88%] break-words"
                          : "font-black leading-snug tracking-tight text-center px-2",
                        layoutTemplateMode !== 'instagram' && (subtitleConfig?.useBox ?? subtitleUseBox) && "px-3 py-1.5"
                      )}
                      style={{
                        backgroundColor: layoutTemplateMode === 'instagram'
                          ? 'transparent'
                          : ((subtitleConfig?.useBox ?? subtitleUseBox)
                              ? (subtitleConfig?.boxColor || subtitleBoxColor)
                              : 'transparent'),
                        borderRadius: layoutTemplateMode === 'instagram'
                          ? 0
                          : ((subtitleConfig?.useBox ?? subtitleUseBox) ? `${subtitleBorderRadius}px` : 0),
                        boxShadow: layoutTemplateMode === 'instagram'
                          ? 'none'
                          : ((((subtitleConfig?.shadowSize ?? 0) > 0) || subtitleShadowEnabled) && (subtitleConfig?.useBox ?? subtitleUseBox)
                              ? '0 4px 14px rgba(0,0,0,0.7)'
                              : 'none'),
                      }}
                    >
                      <span
                        style={{
                          fontSize: layoutTemplateMode === 'instagram'
                            ? `${Math.round(15 * (subTransform.scale || 1.0) * aspectScale)}px`
                            : `${Math.round(((subtitleConfig?.fontSize || 18)) * aspectScale)}px`,
                          color: layoutTemplateMode === 'instagram'
                            ? (instaConfig.subColor || '#374151')
                            : (subtitleConfig?.textColor || (subtitleConfig as any)?.fillColor || '#FFFFFF'),
                          fontFamily: layoutTemplateMode === 'instagram'
                            ? (instaConfig.subFont || 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
                            : (subtitleConfig?.font || (subtitleConfig as any)?.fontFamily || 'Pretendard'),
                          fontWeight: layoutTemplateMode === 'instagram' ? 500 : (subtitleConfig?.isBold !== false ? 'bold' : 'normal'),
                          fontStyle: subtitleConfig?.isItalic ? 'italic' : 'normal',
                          WebkitTextStroke: layoutTemplateMode === 'instagram'
                            ? '0 transparent'
                            : ((subtitleConfig?.outlineSize && subtitleConfig.outlineSize > 0)
                                ? `${subtitleConfig.outlineSize}px ${subtitleConfig.outlineColor || '#000000'}`
                                : subtitleStrokeEnabled
                                  ? `${subtitleStrokeWidth}px ${subtitleStrokeColor}`
                                  : '0 transparent'),
                          paintOrder: layoutTemplateMode === 'instagram' ? 'normal' : 'stroke fill',
                          WebkitFontSmoothing: 'antialiased',
                          textShadow: layoutTemplateMode === 'instagram'
                            ? 'none'
                            : ((subtitleConfig?.shadowSize && subtitleConfig.shadowSize > 0)
                                ? `0 2px ${(subtitleConfig.shadowSize * 3)}px ${subtitleConfig.shadowColor || 'rgba(0,0,0,0.95)'}`
                                : subtitleShadowEnabled
                                  ? `0 2px ${subtitleShadowBlur || 8}px ${subtitleShadowColor}`
                                  : 'none'),
                        }}
                      >
                        {layoutTemplateMode === 'instagram'
                          ? subText
                          : renderHighlightedSubtitleText(
                              formatWrappedText(subText, activeSplitLimit, subtitleConfig?.maxLines || 2),
                              displaySub?.styleProps?.highlights,
                              subtitleConfig?.textColor || (subtitleConfig as any)?.fillColor || '#FFFFFF',
                              selectedHighlightColor
                            )
                        }
                      </span>
                    </div>
                  </TransformGizmo>
                );
              })()}

              {/* 🏷️ LAYER 5: 하단 출처 표기 */}
              {hasBottomSource && (
                <TransformGizmo
                  transform={sourceTransform}
                  selected={selectedLayerId === 'layer_source'}
                  name="하단 출처 표기"
                  canvasScale={canvasScale}
                  onSelect={() => {
                    setSelectedLayerId('layer_source');
                    setActiveInspectorTab('titleSource');
                  }}
                  onChange={(newT) => {
                    setSourceTransform(newT);
                    setBottomSourceBottomPct(100 - newT.yPct);
                  }}
                >
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setActiveFloating('sourceCredit');
                    }}
                    className="select-none text-center whitespace-nowrap px-2 cursor-move"
                    style={{
                      backgroundColor: bottomSourceBg ? 'rgba(0,0,0,0.7)' : 'transparent',
                      borderRadius: `${bottomSourceBorderRadius}px`,
                    }}
                  >
                    <span
                      className="font-medium tracking-wide drop-shadow-md"
                      style={{
                        fontSize: `${bottomSourceSizePx}px`,
                        color: bottomSourceColor,
                        fontFamily: titleFontFamily,
                        WebkitTextStroke: bottomSourceStroke ? '1px #000000' : 'none',
                        paintOrder: 'stroke fill',
                        textShadow: bottomSourceShadow ? '0 1px 4px rgba(0,0,0,0.9)' : 'none',
                      }}
                    >
                      {bottomSourceText}
                    </span>
                  </div>
                </TransformGizmo>
              )}

              {/* ⬛ LAYER 6: 하단 배경 바 (Bottom Bar Bg) */}
              {!isSsul && !isInsta && hasBottomBarBg && (
                <div
                  onClick={() => { setSelectedLayerId('layer_bottom_bar'); setActiveInspectorTab('titleSource'); }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setActiveFloating('topBottomBar');
                  }}
                  className="absolute bottom-0 left-0 right-0 transition-all cursor-pointer"
                  style={{
                    height: `${bottomBarHeightPct}%`,
                    backgroundColor: bottomBarBg,
                    opacity: bottomBarOpacity,
                    borderRadius: bottomBarRadius ? `${bottomBarRadius}px` : undefined,
                    zIndex: bottomBarZIndex,
                  }}
                  title="클릭하여 하단 배경 바 설정 (더블클릭: 팝업)"
                />
              )}

              {/* 📜 [썰형] 밈 아바타 */}
              {layoutTemplateMode === 'ssul' && ssulConfig?.memeType && ssulConfig.memeType !== 'none' && (
                <div className="absolute bottom-20 left-0 right-0 z-35 flex flex-col items-center pointer-events-none select-none">
                  <MemeAvatar
                    type={ssulConfig.memeType}
                    emotion={ssulConfig.memeEmotion}
                    customUrl={ssulConfig.customMemeUrl}
                    aliveMotion={ssulConfig.memeAliveMotion && isPlaying}
                    size={130}
                    className="drop-shadow-2xl"
                  />
                </div>
              )}

              {/* 💬 LAYER 7: 하단 바이럴 댓글 카드 (TransformGizmo 연동) */}
              {(hasCommentCard || layoutTemplateMode === 'instagram') && commentCard && (
                <TransformGizmo
                  transform={commentTransform}
                  onDoubleClick={() => setActiveFloating('commentCard')}
                  selected={selectedLayerId === 'layer_comment_card'}
                  name="하단 바이럴 댓글 카드"
                  canvasScale={canvasScale}
                  anchor="center"
                  onSelect={() => {
                    setSelectedLayerId('layer_comment_card');
                    if (layoutTemplateMode !== 'instagram') setActiveInspectorTab('commentCard');
                    else setActiveInspectorTab('template');
                  }}
                  onChange={(newT) => setCommentTransform?.(newT)}
                >
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setActiveFloating('commentCard');
                    }}
                    className={cn(
                      "p-3 transition-all cursor-move select-none min-w-[200px] max-w-[88%] w-fit inline-block",
                      (commentCard.theme === 'insta' || layoutTemplateMode === 'instagram')
                        ? "bg-neutral-100/95 text-neutral-900 border border-neutral-200/90 shadow-xs rounded-2xl backdrop-blur-xs"
                        : commentCard.theme === 'yt-dark'
                        ? "bg-[#0f0f0f]/90 text-white border border-white/10 rounded-lg shadow-xl backdrop-blur-md"
                        : "bg-white/95 text-neutral-900 border border-black/10 shadow-lg rounded-lg"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-amber-500 flex items-center justify-center text-[11px] font-black text-white shrink-0 overflow-hidden">
                          {commentCard.author ? commentCard.author.charAt(0) : 'U'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-bold leading-tight truncate">{commentCard.author || 'User'}</span>
                          <span className="text-[9px] opacity-60 font-mono truncate">{commentCard.handle || '@user'}</span>
                        </div>
                      </div>
                      <span className="text-[9px] opacity-50 shrink-0">{commentCard.timeText || '방금 전'}</span>
                    </div>
                    <p className="text-[12px] font-medium leading-relaxed break-words px-0.5 mb-2 whitespace-pre-line text-left">
                      {commentCard.text || '댓글 내용'}
                    </p>
                    <div className="flex items-center justify-between text-[10px] opacity-75 pt-1 border-t border-current/10">
                      <span className="flex items-center gap-1 font-semibold text-rose-500">
                        ❤️ {commentCard.likes || '0'}
                      </span>
                      <span className="text-[9px] bg-primary/20 text-primary font-bold px-1.5 py-0.2 rounded-xs">
                        📌 베댓
                      </span>
                    </div>
                  </div>
                </TransformGizmo>
              )}

              {/* 📐 프로 3분할선 및 센터 십자선 가이드 */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none z-40">
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-cyan-400/40 border-r border-dashed border-cyan-400/30" />
                  <div className="absolute left-2/3 top-0 bottom-0 w-px bg-cyan-400/40 border-r border-dashed border-cyan-400/30" />
                  <div className="absolute top-1/3 left-0 right-0 h-px bg-cyan-400/40 border-b border-dashed border-cyan-400/30" />
                  <div className="absolute top-2/3 left-0 right-0 h-px bg-cyan-400/40 border-b border-dashed border-cyan-400/30" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 pointer-events-none flex items-center justify-center">
                    <div className="w-6 h-px bg-red-500/70" />
                    <div className="h-6 w-px bg-red-500/70 absolute" />
                  </div>
                </div>
              )}

              {/* 📱 3대 플랫폼 모바일 UI 안전영역 (Safe Zone) 오버레이 */}
              {safeZoneVisible && aspectRatio === '9:16' && (
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-amber-500/70 z-40 bg-amber-500/[0.03] flex flex-col justify-between p-2 select-none">
                  {/* 상단 헤더 영역 */}
                  <div className="bg-black/85 text-amber-300 text-[9px] font-bold px-2.5 py-0.5 rounded-[2px] border border-amber-500/40 self-center flex items-center gap-1.5 shadow-md">
                    <span>⚠️ {safeZonePlatform === 'youtube' ? 'YouTube Shorts' : safeZonePlatform === 'tiktok' ? 'TikTok' : 'Instagram Reels'} 상단 헤더 영역 (텍스트 금지)</span>
                  </div>

                  {/* 우측 플랫폼 인터랙션 아이콘 가이드 */}
                  <div className="absolute right-1.5 top-[38%] bottom-[18%] w-12 flex flex-col items-center justify-around pointer-events-none opacity-80">
                    <div className="bg-black/80 text-amber-300 text-[8px] font-mono px-1 py-0.5 rounded border border-amber-500/40 text-center w-full">
                      {safeZonePlatform === 'youtube' ? '👍 좋아요' : safeZonePlatform === 'tiktok' ? '👤 프로필' : '❤️ 좋아요'}
                    </div>
                    <div className="bg-black/80 text-amber-300 text-[8px] font-mono px-1 py-0.5 rounded border border-amber-500/40 text-center w-full">
                      {safeZonePlatform === 'youtube' ? '💬 댓글' : safeZonePlatform === 'tiktok' ? '❤️ 좋아요' : '💬 댓글'}
                    </div>
                    <div className="bg-black/80 text-amber-300 text-[8px] font-mono px-1 py-0.5 rounded border border-amber-500/40 text-center w-full">
                      {safeZonePlatform === 'youtube' ? '↗️ 공유' : safeZonePlatform === 'tiktok' ? '💬 댓글' : '↗️ 공유'}
                    </div>
                    <div className="bg-black/80 text-amber-300 text-[8px] font-mono px-1 py-0.5 rounded border border-amber-500/40 text-center w-full">
                      {safeZonePlatform === 'youtube' ? '🎵 사운드' : safeZonePlatform === 'tiktok' ? '🎵 디스크' : '⋯ 더보기'}
                    </div>
                  </div>

                  {/* 하단 플랫폼 제목/사운드 영역 */}
                  <div className="flex justify-between items-end pb-1 pr-14">
                    <div className="bg-black/85 text-amber-300 text-[8px] font-bold p-1.5 rounded-[2px] border border-amber-500/40 max-w-[200px] leading-tight shadow-md">
                      ⚠️ 하단 채널명, 제목, 캡션 및 사운드 트랙 UI (자막 침범 금지)
                    </div>
                    <span className="text-[8px] font-mono text-amber-400/80 bg-black/70 px-1 py-0.5 rounded">
                      {safeZonePlatform.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}

              {/* 📱 모바일 실기기 프레임 목업 (iPhone 16 Pro / Galaxy S25) */}
              {deviceMockup !== 'none' && aspectRatio === '9:16' && (
                <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                  {deviceMockup === 'iphone16' && (
                    <>
                      {/* 아이폰 외곽 베젤 */}
                      <div className="absolute inset-0 border-[7px] border-zinc-800/90 rounded-[38px] shadow-2xl pointer-events-none" />
                      {/* 상단 다이나믹 아일랜드 */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4.5 bg-black rounded-full shadow-md flex items-center justify-between px-2 border border-zinc-900/60">
                        <div className="w-2 h-2 rounded-full bg-zinc-900 border border-zinc-800" />
                        <div className="w-2 h-2 rounded-full bg-zinc-900 border border-zinc-800" />
                      </div>
                      {/* 하단 홈 인디케이터 바 */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/70 rounded-full shadow-xs" />
                    </>
                  )}
                  {deviceMockup === 'galaxy' && (
                    <>
                      {/* 갤럭시 슬림 메탈릭 베젤 */}
                      <div className="absolute inset-0 border-[5px] border-zinc-700/90 rounded-[28px] shadow-2xl pointer-events-none" />
                      {/* 상단 펀치홀 카메라 */}
                      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-black rounded-full shadow-xs border border-zinc-900/80" />
                      {/* 하단 제스처 바 */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/60 rounded-full shadow-xs" />
                    </>
                  )}
                </div>
              )}

              
      </div>

      {/* ── 🌟 화면 뷰포트 최상위 비왜곡 플로팅 프로퍼티 인스펙터 (스케일 왜곡 0% 보장) ── */}
      {activeFloating !== 'none' && (
        <div className="fixed inset-0 pointer-events-none z-[99999]">
          <div className="pointer-events-auto">
            {/* ── 🌟 인-캔버스 객체 지향 플로팅 프로퍼티 인스펙터 (Pixeling 규격 100% 동일 복제) ── */}
              {activeFloating === 'ssulHeader' && (
                <SsulHeaderFloatingInspector
                  isOpen={true}
                  onClose={() => setActiveFloating('none')}
                  config={ssulHeader}
                  onChange={(patch) => {
                    props.setSsulConfig?.((prev: any) => ({
                      ...prev,
                      ssulHeader: { ...ssulHeader, ...patch },
                    }));
                  }}
                  onReset={() => {
                    props.setSsulConfig?.((prev: any) => ({
                      ...prev,
                      ssulHeader: {
                        enabled: true,
                        bgColor: '#FFFFFF',
                        heightMultiplier: 1.0,
                        text: currentBrandChannelName,
                        textColor: '#18181B',
                        font: 'Pretendard',
                        fontSizeMultiplier: 1.0,
                        bold: true,
                        italic: false,
                        leftIcon: 'arrow_back',
                        rightIcon: 'menu',
                      },
                    }));
                  }}
                  defaultChannelName={currentBrandChannelName}
                />
              )}

              {activeFloating === 'postTitle' && (
                <PostTitleFloatingInspector
                  isOpen={true}
                  onClose={() => setActiveFloating('none')}
                  config={postTitleConfig}
                  onChange={(patch) => {
                    if (layoutTemplateMode === 'ssul') {
                      props.setSsulConfig?.((prev: any) => ({
                        ...prev,
                        postTitle: { ...postTitleConfig, ...patch },
                      }));
                    }
                    if (patch.text !== undefined && props.setTopTitleText) {
                      props.setTopTitleText(patch.text);
                    }
                  }}
                  onReset={() => {
                    if (layoutTemplateMode === 'ssul') {
                      props.setSsulConfig?.((prev: any) => ({
                        ...prev,
                        postTitle: {
                          text: '오늘자 역대급 레전드 실화 썰 푼다',
                          color: '#111827',
                          font: 'Pretendard',
                          fontSizeMultiplier: 1.0,
                          align: 'left',
                          bold: true,
                          italic: false,
                          strokeEnabled: false,
                          strokeColor: '#000000',
                          strokeWidth: 2,
                          shadowEnabled: false,
                          shadowColor: 'rgba(0,0,0,0.5)',
                          shadowBlur: 4,
                          offsetX: 0,
                          offsetY: 0,
                          letterSpacing: -0.5,
                          lineHeight: 1.3,
                        },
                      }));
                    }
                  }}
                />
              )}

              {activeFloating === 'metadata' && (
                <MetadataFloatingInspector
                  isOpen={true}
                  onClose={() => setActiveFloating('none')}
                  config={metadataConfig}
                  onChange={(patch) => {
                    props.setSsulConfig?.((prev: any) => ({
                      ...prev,
                      metadata: { ...metadataConfig, ...patch },
                    }));
                  }}
                  onReset={() => {
                    props.setSsulConfig?.((prev: any) => ({
                      ...prev,
                      metadata: {
                        showAuthor: true,
                        authorText: '익명',
                        showTime: true,
                        timeText: '방금 전',
                        showViews: true,
                        viewsText: '조회 1.2만 · 추천 420',
                        separator: 'dot',
                        color: '#6B7280',
                        font: 'Pretendard',
                        fontSizeMultiplier: 1.0,
                        bold: false,
                        offsetX: 0,
                        offsetY: 0,
                      },
                    }));
                  }}
                />
              )}

              {activeFloating === 'divider' && (
                <DividerFloatingInspector
                  isOpen={true}
                  onClose={() => setActiveFloating('none')}
                  config={dividerConfig}
                  onChange={(patch) => {
                    props.setSsulConfig?.((prev: any) => ({
                      ...prev,
                      divider: { ...dividerConfig, ...patch },
                    }));
                  }}
                  onReset={() => {
                    props.setSsulConfig?.((prev: any) => ({
                      ...prev,
                      divider: {
                        enabled: true,
                        style: 'solid',
                        thickness: 1,
                        widthPercent: 100,
                        color: '#E5E7EB',
                        opacity: 100,
                        offsetY: 0,
                      },
                    }));
                  }}
                />
              )}

              {activeFloating === 'ssulSubtitle' && (
                <SsulSubtitleFloatingInspector
                  isOpen={true}
                  onClose={() => setActiveFloating('none')}
                  config={ssulSubtitleConfig}
                  onChange={(patch) => {
                    props.setSsulConfig?.((prev: any) => ({
                      ...prev,
                      ssulSubtitle: { ...ssulSubtitleConfig, ...patch },
                    }));
                  }}
                  onReset={() => {
                    props.setSsulConfig?.((prev: any) => ({
                      ...prev,
                      ssulSubtitle: {
                        font: 'Pretendard',
                        color: '#1F2937',
                        fontSizeMultiplier: 1.0,
                        align: 'left',
                        bold: true,
                        italic: false,
                        lineHeightMultiplier: 1.6,
                        letterSpacingPx: 0,
                        marginTopPx: 10,
                        strokeEnabled: false,
                        strokeColor: '#000000',
                        strokeWidth: 2,
                        shadowEnabled: false,
                        shadowColor: 'rgba(0,0,0,0.3)',
                        shadowBlur: 4,
                        boxEnabled: false,
                        boxColor: '#F3F4F6',
                        boxRadius: 4,
                      },
                    }));
                  }}
                />
              )}

              {activeFloating === 'badgeTag' && (
                <BadgeTagFloatingInspector
                  isOpen={true}
                  onClose={() => setActiveFloating('none')}
                  config={{
                    enabled: props.hasTitleBadge ?? true,
                    text: props.titleBadgeText || 'HOT ISSUE',
                    bgColor: props.titleBadgeBg || '#EF4444',
                    textColor: props.titleBadgeColor || '#FFFFFF',
                    fontSize: 12,
                    borderRadius: 4,
                    paddingX: 8,
                    paddingY: 2,
                    offsetX: 0,
                    offsetY: 0,
                  }}
                  onChange={(patch) => {
                    if (patch.text !== undefined && (props as any).setTitleBadgeText) (props as any).setTitleBadgeText(patch.text);
                    if (patch.bgColor !== undefined && (props as any).setTitleBadgeBg) (props as any).setTitleBadgeBg(patch.bgColor);
                    if (patch.textColor !== undefined && (props as any).setTitleBadgeColor) (props as any).setTitleBadgeColor(patch.textColor);
                  }}
                  onReset={() => {
                    (props as any).setTitleBadgeText?.('HOT ISSUE');
                    (props as any).setTitleBadgeBg?.('#EF4444');
                  }}
                />
              )}

              {activeFloating === 'jabHook' && (
                <JabHookFloatingInspector
                  isOpen={true}
                  onClose={() => setActiveFloating('none')}
                  config={{
                    enabled: props.hasJab ?? true,
                    text: props.jabText || '마지막 반전 주의 ㄷㄷ',
                    tiltDeg: props.jabTiltDeg ?? -3,
                    fontSize: props.jabFontSize ?? 16,
                    textColor: props.jabTextColor || '#000000',
                    font: props.titleFontFamily || 'GmarketSans',
                    strokeEnabled: props.jabStroke ?? true,
                    strokeColor: props.jabStrokeColor || '#000000',
                    strokeWidth: props.jabStrokeWidth ?? 2,
                    shadowEnabled: props.jabShadow ?? true,
                    shadowColor: 'rgba(0,0,0,0.8)',
                    shadowBlur: props.jabShadowBlur ?? 8,
                    bgEnabled: props.jabBgEnabled ?? true,
                    bgColor: props.jabBgColor || '#FFE500',
                    borderRadius: props.jabBorderRadius ?? 4,
                    offsetX: 0,
                    offsetY: 0,
                  }}
                  onChange={(patch) => {
                    if (patch.text !== undefined && (props as any).setJabText) (props as any).setJabText(patch.text);
                    if (patch.tiltDeg !== undefined && (props as any).setJabTiltDeg) (props as any).setJabTiltDeg(patch.tiltDeg);
                    if (patch.fontSize !== undefined && (props as any).setJabFontSize) (props as any).setJabFontSize(patch.fontSize);
                    if (patch.textColor !== undefined && (props as any).setJabTextColor) (props as any).setJabTextColor(patch.textColor);
                    if (patch.bgColor !== undefined && (props as any).setJabBgColor) (props as any).setJabBgColor(patch.bgColor);
                  }}
                  onReset={() => {
                    (props as any).setJabTiltDeg?.(-3);
                    (props as any).setJabBgColor?.('#FFE500');
                  }}
                />
              )}

              {activeFloating === 'gunlimboHook' && (
                <GunlimboHookBandFloatingInspector
                  isOpen={true}
                  onClose={() => setActiveFloating('none')}
                  config={{
                    enabled: true,
                    bandColor: props.gunlimboConfig?.hookBgColor || '#FFFFFF',
                    bandHeightPct: 10,
                    bandYPct: 24,
                    headlineText: props.gunlimboConfig?.titleLine1 || '경찰도 경악한 범인의 정체',
                    headlineColor: props.gunlimboConfig?.titleLine1Color || '#FFFFFF',
                    headlineFontSize: props.gunlimboConfig?.titleFontSize || 34,
                    headlineFont: props.titleFontFamily || 'Pretendard',
                    subheadlineText: props.gunlimboConfig?.hookPhrase || '1분 만에 밝혀진 진실',
                    subheadlineColor: props.gunlimboConfig?.hookTextColor || '#000000',
                    subheadlineFontSize: props.gunlimboConfig?.hookFontSize || 22,
                    subheadlineFont: props.titleFontFamily || 'Pretendard',
                    showBorder: true,
                    borderColor: '#3F3F46',
                    borderWidth: 1,
                  }}
                  onChange={(patch) => {
                    props.setGunlimboConfig?.((prev: any) => ({
                      ...prev,
                      titleLine1: patch.headlineText !== undefined ? patch.headlineText : prev.titleLine1,
                      titleLine1Color: patch.headlineColor !== undefined ? patch.headlineColor : prev.titleLine1Color,
                      titleFontSize: patch.headlineFontSize !== undefined ? patch.headlineFontSize : prev.titleFontSize,
                      hookPhrase: patch.subheadlineText !== undefined ? patch.subheadlineText : prev.hookPhrase,
                      hookBgColor: patch.bandColor !== undefined ? patch.bandColor : prev.hookBgColor,
                      hookTextColor: patch.subheadlineColor !== undefined ? patch.subheadlineColor : prev.hookTextColor,
                      hookFontSize: patch.subheadlineFontSize !== undefined ? patch.subheadlineFontSize : prev.hookFontSize,
                    }));
                  }}
                  onReset={() => {
                    props.setGunlimboConfig?.((prev: any) => ({
                      ...prev,
                      titleLine1: '충격 실화 사건',
                      titleLine2: '상상도 못한 결말',
                      hookPhrase: '1분 만에 밝혀진 진실',
                      hookBgColor: '#FFFFFF',
                      hookTextColor: '#000000',
                    }));
                  }}
                />
              )}

              {activeFloating === 'instaProfile' && (
                <InstaProfileFloatingInspector
                  isOpen={true}
                  onClose={() => setActiveFloating('none')}
                  config={{
                    avatarUrl: props.instaConfig?.profileAvatarUrl || '',
                    nickname: props.instaConfig?.profileName || '사용자명',
                    handle: props.instaConfig?.profileHandle || '@handle',
                    isVerified: props.instaConfig?.isVerified ?? true,
                    timeText: '방금 전 · 원본 오디오',
                    showFollowBtn: true,
                    showSoundIcon: true,
                    textColor: '#18181B',
                    fontSizeMultiplier: 1.0,
                    offsetX: 0,
                    offsetY: 0,
                  }}
                  onChange={(patch) => {
                    props.setInstaConfig?.((prev: any) => ({
                      ...prev,
                      profileName: patch.nickname !== undefined ? patch.nickname : prev.profileName,
                      profileHandle: patch.handle !== undefined ? patch.handle : prev.profileHandle,
                      profileAvatarUrl: patch.avatarUrl !== undefined ? patch.avatarUrl : prev.profileAvatarUrl,
                      isVerified: patch.isVerified !== undefined ? patch.isVerified : prev.isVerified,
                    }));
                  }}
                  onReset={() => {
                    props.setInstaConfig?.((prev: any) => ({
                      ...prev,
                      profileName: '유머보따리',
                      profileHandle: '@humor_box',
                      isVerified: true,
                    }));
                  }}
                />
              )}

              {activeFloating === 'sourceCredit' && (
                <SourceCreditFloatingInspector
                  isOpen={true}
                  onClose={() => setActiveFloating('none')}
                  config={{
                    enabled: props.hasBottomSource ?? true,
                    text: props.bottomSourceText || '출처: 유튜브 @채널명',
                    color: props.bottomSourceColor || '#CBD5E1',
                    fontSize: props.bottomSourceSizePx || 12,
                    font: props.titleFontFamily || 'Pretendard',
                    bgEnabled: props.bottomSourceBg ?? true,
                    bgColor: 'rgba(0,0,0,0.7)',
                    borderRadius: props.bottomSourceBorderRadius ?? 4,
                    strokeEnabled: props.bottomSourceStroke ?? false,
                    strokeColor: '#000000',
                    strokeWidth: 1,
                    shadowEnabled: props.bottomSourceShadow ?? true,
                    shadowColor: 'rgba(0,0,0,0.9)',
                    shadowBlur: 4,
                    offsetX: 0,
                    offsetY: 0,
                  }}
                  onChange={(patch) => {
                    if (patch.text !== undefined && (props as any).setBottomSourceText) (props as any).setBottomSourceText(patch.text);
                    if (patch.color !== undefined && (props as any).setBottomSourceColor) (props as any).setBottomSourceColor(patch.color);
                    if (patch.fontSize !== undefined && (props as any).setBottomSourceSizePx) (props as any).setBottomSourceSizePx(patch.fontSize);
                  }}
                  onReset={() => {
                    (props as any).setBottomSourceText?.('출처: YouTube @ViraLoop 공식 채널');
                  }}
                />
              )}

              {activeFloating === 'topBottomBar' && (
                <TopBottomBarFloatingInspector
                  isOpen={true}
                  onClose={() => setActiveFloating('none')}
                  config={{
                    hasTopBarBg: props.hasTopBarBg ?? true,
                    topBarHeightPct: props.topBarHeightPct ?? 18,
                    topBarBg: props.topBarBg || '#000000',
                    topBarOpacity: (props.topBarOpacity ?? 1) * 100,
                    topBarRadius: props.topBarRadius ?? 0,
                    hasBottomBarBg: props.hasBottomBarBg ?? true,
                    bottomBarHeightPct: props.bottomBarHeightPct ?? 6,
                    bottomBarBg: props.bottomBarBg || '#000000',
                    bottomBarOpacity: (props.bottomBarOpacity ?? 1) * 100,
                    bottomBarRadius: props.bottomBarRadius ?? 0,
                  }}
                  onChange={(patch) => {
                    if (patch.hasTopBarBg !== undefined && (props as any).setHasTopBarBg) (props as any).setHasTopBarBg(patch.hasTopBarBg);
                    if (patch.topBarBg !== undefined && (props as any).setTopBarBg) (props as any).setTopBarBg(patch.topBarBg);
                    if (patch.topBarHeightPct !== undefined && (props as any).setTopBarHeightPct) (props as any).setTopBarHeightPct(patch.topBarHeightPct);
                    if (patch.hasBottomBarBg !== undefined && (props as any).setHasBottomBarBg) (props as any).setHasBottomBarBg(patch.hasBottomBarBg);
                    if (patch.bottomBarBg !== undefined && (props as any).setBottomBarBg) (props as any).setBottomBarBg(patch.bottomBarBg);
                    if (patch.bottomBarHeightPct !== undefined && (props as any).setBottomBarHeightPct) (props as any).setBottomBarHeightPct(patch.bottomBarHeightPct);
                  }}
                  onReset={() => {
                    (props as any).setTopBarBg?.('#000000');
                    (props as any).setBottomBarBg?.('#000000');
                  }}
                />
              )}

              {activeFloating === 'commentCard' && (
                <CommentCardFloatingInspector
                  isOpen={true}
                  onClose={() => setActiveFloating('none')}
                  config={props.commentCard}
                  onChange={(patch) => {
                    props.setCommentCard?.((prev: any) => ({ ...prev, ...patch }));
                  }}
                  onReset={() => {
                    props.setCommentCard?.((prev: any) => ({
                      ...prev,
                      authorName: '알고리즘의노예',
                      commentText: '이거 보고 제 인생이 바뀌었습니다 ㄷㄷ',
                      likesCount: '1.4만',
                      bgColor: '#FFFFFF',
                      textColor: '#18181B',
                    }));
                  }}
                />
              )}

              {activeFloating === 'videoCrop' && (
                <VideoCropFloatingInspector
                  isOpen={true}
                  onClose={() => setActiveFloating('none')}
                  config={{
                    fitMode: props.videoFitMode,
                    blurBg: props.videoBlurBg,
                    zoomScale: props.videoZoomScale,
                    focusXPct: props.videoFocusXPct,
                    focusYPct: props.videoFocusYPct,
                    rotationDeg: props.videoRotationDeg,
                    horizontalFlip: props.videoHorizontalFlip,
                    verticalFlip: props.videoVerticalFlip,
                  }}
                  onChange={(patch) => {
                    if (patch.fitMode !== undefined && (props as any).setVideoFitMode) (props as any).setVideoFitMode(patch.fitMode);
                    if (patch.blurBg !== undefined && (props as any).setVideoBlurBg) (props as any).setVideoBlurBg(patch.blurBg);
                    if (patch.zoomScale !== undefined && props.setVideoZoomScale) props.setVideoZoomScale(patch.zoomScale);
                    if (patch.focusXPct !== undefined && props.setVideoFocusXPct) props.setVideoFocusXPct(patch.focusXPct);
                    if (patch.focusYPct !== undefined && props.setVideoFocusYPct) props.setVideoFocusYPct(patch.focusYPct);
                    if (patch.rotationDeg !== undefined && props.setVideoRotationDeg) props.setVideoRotationDeg(patch.rotationDeg);
                    if (patch.horizontalFlip !== undefined && props.setVideoHorizontalFlip) props.setVideoHorizontalFlip(patch.horizontalFlip);
                  }}
                  onReset={() => {
                    props.setVideoZoomScale?.(100);
                    props.setVideoFocusXPct?.(50);
                    props.setVideoFocusYPct?.(50);
                    props.setVideoRotationDeg?.(0);
                  }}
                />
              )}
            
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversalCanvasStage;
