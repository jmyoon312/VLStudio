import React, { useRef, useState, useEffect } from 'react';
import { cn, getMediaUrl } from '@/lib/utils';
import { TransformGizmo } from '@/components/canvas/TransformGizmo';
import { NleLayerTransform, NleLayerObject } from '@/types/nle';
import { LayoutTemplateMode, TemplateManifest } from '@/types/templateDna';
import { SubtitleConfig } from '@/types/subtitle';
import { VideoFilterConfig } from '../forms/FilterFxInspectorForm';
import { CommentCardConfig } from '../forms/CommentCardInspectorForm';
import { VideoFitMode } from '../forms/VideoCropInspectorForm';
import { FileVideo, ThumbsUp, MessageCircle, ArrowLeft, ChevronLeft, Menu, Share2, Sparkles } from 'lucide-react';
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
  TitleFloatingInspector,
  SubtitleFloatingInspector,
} from '../floating';
import { resolveFontFamily } from '../constants/canvasConstants';
import { SsulCanvasLayout } from './layouts/SsulCanvasLayout';

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
  canvasRef?: React.RefObject<HTMLDivElement>;
  activeInspectorTab?: any;

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
  videoBorderRadius?: number;
  setVideoBorderRadius?: (val: number) => void;
  videoBorderEnabled?: boolean;
  setVideoBorderEnabled?: (val: boolean) => void;
  videoBorderWidth?: number;
  setVideoBorderWidth?: (val: number) => void;
  videoBorderColor?: string;
  setVideoBorderColor?: (val: string) => void;
  videoShadowEnabled?: boolean;
  setVideoShadowEnabled?: (val: boolean) => void;
  videoShadowBlur?: number;
  setVideoShadowBlur?: (val: number) => void;
  videoShadowColor?: string;
  setVideoShadowColor?: (val: string) => void;
  videoPaddingPct?: number;
  setVideoPaddingPct?: (val: number) => void;

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
  setHasTopBarBg?: (val: boolean) => void;
  topBarHeightPct: number;
  setTopBarHeightPct?: (val: number) => void;
  topBarBg: string;
  setTopBarBg?: (val: string) => void;
  topBarOpacity?: number;
  setTopBarOpacity?: (val: number) => void;
  topBarRadius?: number;
  setTopBarRadius?: (val: number) => void;
  hasBottomBarBg: boolean;
  setHasBottomBarBg?: (val: boolean) => void;
  bottomBarHeightPct: number;
  setBottomBarHeightPct?: (val: number) => void;
  bottomBarBg: string;
  setBottomBarBg?: (val: string) => void;
  bottomBarOpacity?: number;
  setBottomBarOpacity?: (val: number) => void;
  bottomBarRadius?: number;
  setBottomBarRadius?: (val: number) => void;

  // Top Title
  hasTopTitle: boolean;
  setHasTopTitle?: (val: boolean) => void;
  topTitleText: string;
  setTopTitleText?: (text: string) => void;
  titleTransform: NleLayerTransform;
  setTitleTransform?: any;
  titleLinesMode?: 'single' | 'double';
  setTitleLinesMode?: (mode: 'single' | 'double') => void;
  titleLine1?: string;
  setTitleLine1?: (val: string) => void;
  titleLine2?: string;
  setTitleLine2?: (val: string) => void;
  titleLine1SizePx?: number;
  titleLine2SizePx?: number;
  titleLine1Color?: string;
  setTitleLine1Color?: (val: string) => void;
  titleLine2Color?: string;
  setTitleLine2Color?: (val: string) => void;
  titleFontFamily?: string;
  setTitleFontFamily?: (val: string) => void;
  titleStroke?: boolean;
  setTitleStroke?: (val: boolean) => void;
  titleStrokeWidth?: number;
  setTitleStrokeWidth?: (val: number) => void;
  titleStrokeColor?: string;
  setTitleStrokeColor?: (val: string) => void;
  titleShadow?: boolean;
  setTitleShadow?: (val: boolean) => void;
  titleShadowBlur?: number;
  setTitleShadowBlur?: (val: number) => void;
  titleShadowColor?: string;
  setTitleShadowColor?: (val: string) => void;
  titleBgMode?: string;
  setTitleBgMode?: (val: string) => void;
  titleBgColor?: string;
  setTitleBgColor?: (val: string) => void;
  titleBgOpacity?: number;
  setTitleBgOpacity?: (val: number) => void;
  titlePaddingX?: number;
  setTitlePaddingX?: (val: number) => void;
  titlePaddingY?: number;
  setTitlePaddingY?: (val: number) => void;
  titleBorderRadius?: number;
  setTitleBorderRadius?: (val: number) => void;
  setTopTitleColor?: (val: string) => void;
  setTitleBold?: (val: boolean) => void;
  setTitleItalic?: (val: boolean) => void;
  setTitleAlign?: (val: 'left' | 'center' | 'right') => void;
  hasTitleBadge?: boolean;
  setHasTitleBadge?: (val: boolean) => void;
  titleBadgeText?: string;
  setTitleBadgeText?: (val: string) => void;
  titleBadgeBg?: string;
  setTitleBadgeBg?: (val: string) => void;
  titleBadgeColor?: string;
  setTitleBadgeColor?: (val: string) => void;
  titleBadgeSizePx?: number;
  setTitleBadgeSizePx?: (val: number) => void;
  hasTitleLine1?: boolean;
  setHasTitleLine1?: (val: boolean) => void;
  hasTitleLine2?: boolean;
  setHasTitleLine2?: (val: boolean) => void;
  titleLetterSpacing?: number;
  setTitleLetterSpacing?: (val: number) => void;
  titleLineHeight?: number;
  setTitleLineHeight?: (val: number) => void;
  titleLine1FontFamily?: string;
  setTitleLine1FontFamily?: (val: string) => void;
  titleLine1Bold?: boolean;
  setTitleLine1Bold?: (val: boolean) => void;
  titleLine1Italic?: boolean;
  setTitleLine1Italic?: (val: boolean) => void;
  titleLine1Align?: 'left' | 'center' | 'right';
  setTitleLine1Align?: (val: 'left' | 'center' | 'right') => void;
  titleLine1LetterSpacing?: number;
  setTitleLine1LetterSpacing?: (val: number) => void;
  titleLine1LineHeight?: number;
  setTitleLine1LineHeight?: (val: number) => void;
  titleLine2FontFamily?: string;
  setTitleLine2FontFamily?: (val: string) => void;
  titleLine2Bold?: boolean;
  setTitleLine2Bold?: (val: boolean) => void;
  titleLine2Italic?: boolean;
  setTitleLine2Italic?: (val: boolean) => void;
  titleLine2Align?: 'left' | 'center' | 'right';
  setTitleLine2Align?: (val: 'left' | 'center' | 'right') => void;
  titleLine2LetterSpacing?: number;
  setTitleLine2LetterSpacing?: (val: number) => void;
  titleLine2LineHeight?: number;
  setTitleLine2LineHeight?: (val: number) => void;

  // Jab Hook
  hasJab: boolean;
  setHasJab?: (val: boolean) => void;
  jabTransform: NleLayerTransform;
  setJabTransform?: any;
  jabText: string;
  setJabText?: (val: string) => void;
  jabTiltDeg: number;
  setJabTiltDeg?: (val: number) => void;
  jabFontSize: number;
  setJabFontSize?: (val: number) => void;
  jabTextColor: string;
  setJabTextColor?: (val: string) => void;
  jabFont?: string;
  setJabFont?: (val: string) => void;
  jabBold?: boolean;
  setJabBold?: (val: boolean) => void;
  jabItalic?: boolean;
  setJabItalic?: (val: boolean) => void;
  jabAlign?: 'left' | 'center' | 'right';
  setJabAlign?: (val: 'left' | 'center' | 'right') => void;
  jabStroke: boolean;
  setJabStroke?: (val: boolean) => void;
  jabStrokeWidth: number;
  setJabStrokeWidth?: (val: number) => void;
  jabStrokeColor: string;
  setJabStrokeColor?: (val: string) => void;
  jabShadow: boolean;
  setJabShadow?: (val: boolean) => void;
  jabShadowBlur: number;
  setJabShadowBlur?: (val: number) => void;
  jabShadowColor?: string;
  setJabShadowColor?: (val: string) => void;
  jabBgEnabled: boolean;
  setJabBgEnabled?: (val: boolean) => void;
  jabBgColor: string;
  setJabBgColor?: (val: string) => void;
  jabBorderRadius: number;
  setJabBorderRadius?: (val: number) => void;
  jabLetterSpacing?: number;
  setJabLetterSpacing?: (val: number) => void;
  jabLineHeight?: number;
  setJabLineHeight?: (val: number) => void;

  // Subtitle
  hasSubtitle?: boolean;
  subTransform: NleLayerTransform;
  setSubTransform?: any;
  currentSubtitleText?: string;
  subtitleConfig?: SubtitleConfig;
  setSubtitleConfig?: React.Dispatch<React.SetStateAction<SubtitleConfig>> | ((updater: any) => void);
  setSubtitleYPercent?: (y: number) => void;
  subtitleStrokeEnabled?: boolean;
  setSubtitleStrokeEnabled?: (val: boolean) => void;
  subtitleStrokeWidth?: number;
  setSubtitleStrokeWidth?: (val: number) => void;
  subtitleStrokeColor?: string;
  setSubtitleStrokeColor?: (val: string) => void;
  subtitleShadowEnabled?: boolean;
  setSubtitleShadowEnabled?: (val: boolean) => void;
  subtitleShadowBlur?: number;
  setSubtitleShadowBlur?: (val: number) => void;
  subtitleShadowColor?: string;
  setSubtitleShadowColor?: (val: string) => void;
  subtitleUseBox?: boolean;
  setSubtitleUseBox?: (val: boolean) => void;
  subtitleBoxColor?: string;
  setSubtitleBoxColor?: (val: string) => void;
  subtitleBorderRadius?: number;
  setSubtitleBorderRadius?: (val: number) => void;
  subtitleMaxChars?: number;
  setSubtitleMaxChars?: (val: number) => void;
  selectedHighlightColor?: string;
  setSelectedHighlightColor?: (val: string) => void;
  selectedSubtitlePresetId?: string;
  setSelectedSubtitlePresetId?: (id: string) => void;

  // Bottom Source
  hasBottomSource: boolean;
  setHasBottomSource?: (val: boolean) => void;
  sourceTransform: NleLayerTransform;
  setSourceTransform?: any;
  bottomSourceText: string;
  setBottomSourceText?: (val: string) => void;
  bottomSourceColor?: string;
  setBottomSourceColor?: (val: string) => void;
  bottomSourceSizePx?: number;
  setBottomSourceSizePx?: (val: number) => void;
  bottomSourceFontFamily?: string;
  setBottomSourceFontFamily?: (val: string) => void;
  bottomSourceBold?: boolean;
  setBottomSourceBold?: (val: boolean) => void;
  bottomSourceItalic?: boolean;
  setBottomSourceItalic?: (val: boolean) => void;
  bottomSourceBg?: boolean;
  setBottomSourceBg?: (val: boolean) => void;
  bottomSourceBgColor?: string;
  setBottomSourceBgColor?: (val: string) => void;
  bottomSourceBorderRadius?: number;
  setBottomSourceBorderRadius?: (val: number) => void;
  bottomSourceStroke?: boolean;
  setBottomSourceStroke?: (val: boolean) => void;
  bottomSourceStrokeWidth?: number;
  setBottomSourceStrokeWidth?: (val: number) => void;
  bottomSourceStrokeColor?: string;
  setBottomSourceStrokeColor?: (val: string) => void;
  bottomSourceShadow?: boolean;
  setBottomSourceShadow?: (val: boolean) => void;
  bottomSourceShadowBlur?: number;
  setBottomSourceShadowBlur?: (val: number) => void;
  bottomSourceShadowColor?: string;
  setBottomSourceShadowColor?: (val: string) => void;
  bottomSourceAlign?: 'left' | 'center' | 'right';
  setBottomSourceAlign?: (val: 'left' | 'center' | 'right') => void;
  setBottomSourceBottomPct?: (val: number) => void;
  bottomSourceLetterSpacing?: number;
  setBottomSourceLetterSpacing?: (val: number) => void;
  bottomSourceLineHeight?: number;
  setBottomSourceLineHeight?: (val: number) => void;

  // Comment Card
  hasCommentCard: boolean;
  setHasCommentCard?: (val: boolean) => void;
  setCommentCard?: any;
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
  topBarZIndex?: number;
  bottomBarZIndex?: number;
  setTopTitleYPct?: (y: number) => void;
  setVideoFocusXPct?: (x: number) => void;
  setVideoFocusYPct?: (y: number) => void;
  setVideoZoomScale?: any;
  setVideoRotationDeg?: any;
  setVideoHorizontalFlip?: any;
  showGrid?: boolean;
  safeZoneVisible?: boolean;
  safeZonePlatform?: 'youtube' | 'tiktok' | 'reels';
  deviceMockup?: 'none' | 'iphone16' | 'galaxy';
  masterManifest?: TemplateManifest;
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
    videoBorderRadius = 0,
    videoBorderEnabled = false,
    videoBorderWidth = 1,
    videoBorderColor = '#FFFFFF',
    videoShadowEnabled = false,
    videoShadowBlur = 20,
    videoShadowColor = 'rgba(0,0,0,0.5)',
    videoPaddingPct = 0,
    videoLayer,
    videoZIndex = 10,
    trackVisibility = { v1Video: true, t1Title: true, s1Subtitle: true },
    currentTimeMs = 0,
    instaConfig = {
      profileName: '유머보따리',
      profileHandle: '@humor_box',
      profileAvatarUrl: 'https://api.dicebear.com/9.x/lorelei/svg?seed=user_avatar_blue',
      isVerified: true,
      holeWidthPct: 88,
      holeHeightPct: 47,
      holeYPct: 44.5,
      holeRoundness: 14,
      holeBorderWidth: 1,
      holeBorderColor: '#E5E7EB',
      holeShadow: true,
      bgColor: '#FFFFFF',
      subFont: 'Pretendard',
      subColor: '#374151',
    },
    profileTransform = { xPct: 6.0, yPct: 4.5, scale: 1.0, rotationDeg: 0, zIndex: 35 },
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
    setTitleLinesMode = () => {},
    titleLine1 = '',
    titleLine2 = '',
    titleLine1SizePx = 20,
    titleLine2SizePx = 24,
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
    titleBadgeSizePx = 11,
    hasTitleLine1 = true,
    hasTitleLine2 = true,
    titleBold = true,
    titleItalic = false,
    titleAlign = 'center',
    hasJab,
    jabTransform = { xPct: 50, yPct: 50, scale: 1.0, rotationDeg: 0, zIndex: 25 },
    setJabTransform = () => {},
    jabText,
    jabTiltDeg,
    jabFontSize = 13,
    jabTextColor,
    jabFont = 'GmarketSans',
    setJabFont,
    jabBold = true,
    setJabBold,
    jabItalic = false,
    setJabItalic,
    jabAlign = 'center',
    setJabAlign,
    jabStroke,
    jabStrokeWidth,
    jabStrokeColor,
    jabShadow,
    jabShadowBlur,
    jabShadowColor = '#000000',
    jabBgEnabled,
    jabBgColor,
    jabBorderRadius,
    hasSubtitle = true,
    subTransform = { xPct: 50, yPct: 75, scale: 1.0, rotationDeg: 0, zIndex: 30 },
    setSubTransform = () => {},
    currentSubtitleText = '자막을 입력하거나 타임라인에서 자막을 선택하세요',
    subtitleConfig = {
      fontSize: 18,
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
    bottomSourceSizePx = 10,
    bottomSourceFontFamily = 'Pretendard',
    bottomSourceBold = false,
    bottomSourceItalic = false,
    bottomSourceAlign = 'center',
    setBottomSourceAlign,
    bottomSourceBg = false,
    bottomSourceBgColor = 'rgba(0,0,0,0.7)',
    bottomSourceBorderRadius = 4,
    bottomSourceStroke = false,
    bottomSourceStrokeWidth = 1,
    bottomSourceStrokeColor = '#000000',
    bottomSourceShadow = true,
    bottomSourceShadowBlur = 4,
    bottomSourceShadowColor = 'rgba(0,0,0,0.9)',
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
    titleLetterSpacing = -0.5,
    setTitleLetterSpacing,
    titleLineHeight = 1.2,
    setTitleLineHeight,
    titleLine1FontFamily,
    setTitleLine1FontFamily,
    titleLine1Bold,
    setTitleLine1Bold,
    titleLine1Italic,
    setTitleLine1Italic,
    titleLine1Align,
    setTitleLine1Align,
    titleLine1LetterSpacing,
    setTitleLine1LetterSpacing,
    titleLine1LineHeight,
    setTitleLine1LineHeight,
    titleLine2FontFamily,
    setTitleLine2FontFamily,
    titleLine2Bold,
    setTitleLine2Bold,
    titleLine2Italic,
    setTitleLine2Italic,
    titleLine2Align,
    setTitleLine2Align,
    titleLine2LetterSpacing,
    setTitleLine2LetterSpacing,
    titleLine2LineHeight,
    setTitleLine2LineHeight,
    jabLetterSpacing = 0,
    setJabLetterSpacing,
    jabLineHeight = 1.2,
    setJabLineHeight,
    bottomSourceLetterSpacing = 0,
    setBottomSourceLetterSpacing,
    bottomSourceLineHeight = 1.2,
    setBottomSourceLineHeight,
  } = props;

  const internalCanvasRef = useRef<HTMLDivElement>(null);
  const canvasRef = props.canvasRef || internalCanvasRef;
  const setTopTitleText = props.setTopTitleText || (() => {});
  const setCommentCard = props.setCommentCard || (() => {});

  const handleCanvasDeselect = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedLayerId(null);
      setActiveFloating('none');
    }
  };

  const subCfg: any = subtitleConfig;

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
  const activeSplitLimit = aspectRatio === '16:9' ? 24 : (props.subtitleMaxChars || (subtitleConfig as any)?.splitLimit || 14);
  const [internalActiveFloating, setInternalActiveFloating] = useState<string>('none');
  const activeFloating = props.activeFloatingInspector !== undefined ? props.activeFloatingInspector : internalActiveFloating;
  const setActiveFloating = (insp: string) => {
    setInternalActiveFloating(insp);
    props.setActiveFloatingInspector?.(insp);
  };

  // 📜 썰형 개별 객체 트랜스폼 상태 (Left Icon, Center Channel Name, Right Icon, Metadata, Divider)
  const [ssulLeftIconTransform, setSsulLeftIconTransform] = useState<NleLayerTransform>(
    ssulConfig?.leftIconTransform || { xPct: 7.0, yPct: 2.2, scale: 1.0, rotationDeg: 0, zIndex: 40 }
  );
  const [ssulHeaderTitleTransform, setSsulHeaderTitleTransform] = useState<NleLayerTransform>(
    ssulConfig?.headerTitleTransform || { xPct: 50.0, yPct: 2.2, scale: 1.0, rotationDeg: 0, zIndex: 40 }
  );
  const [ssulRightIconTransform, setSsulRightIconTransform] = useState<NleLayerTransform>(
    ssulConfig?.rightIconTransform || { xPct: 93.0, yPct: 2.2, scale: 1.0, rotationDeg: 0, zIndex: 40 }
  );
  const [ssulMetadataTransform, setSsulMetadataTransform] = useState<NleLayerTransform>(
    ssulConfig?.metadataTransform || { xPct: 5.0, yPct: 12.0, scale: 1.0, rotationDeg: 0, zIndex: 35 }
  );
  const [ssulDividerTransform, setSsulDividerTransform] = useState<NleLayerTransform>(
    ssulConfig?.dividerTransform || { xPct: 50.0, yPct: 15.0, scale: 1.0, rotationDeg: 0, zIndex: 35 }
  );

  // 🖼️ 썰형/군림보형 자막 싱크 기반 이미지 하향 슬라이드 다운 애니메이션 상태
  const [isSlidingDown, setIsSlidingDown] = useState(false);
  const prevSubKeyRef = useRef<string>('');
  const currentSubKey = activeSub?.id || activeSub?.data || currentSubtitleText || '';

  useEffect(() => {
    if ((layoutTemplateMode === 'ssul' || layoutTemplateMode === 'gunlimbo') && currentSubKey && currentSubKey !== prevSubKeyRef.current) {
      prevSubKeyRef.current = currentSubKey;
      setIsSlidingDown(true);
      const timer = setTimeout(() => {
        setIsSlidingDown(false);
      }, 420);
      return () => clearTimeout(timer);
    }
  }, [currentSubKey, layoutTemplateMode]);

  const isImageMedia = !!videoLayer?.data && (
    videoLayer.type === 'image' ||
    /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(videoLayer.data)
  );

  // 🛡️ 4대 폼팩터 모드 불리언 플래그 (레이어 누수 원천 차단)
  const isSsul = layoutTemplateMode === 'ssul';
  const isInsta = layoutTemplateMode === 'instagram';
  const isGunlimbo = layoutTemplateMode === 'gunlimbo';
  const isClassic = layoutTemplateMode === 'classic';
  const currentBrandChannelName = props.currentBrandChannelName || '썰방 TV';

  // 📜 썰형 5대 객체 (헤더바, 대제목, 메타데이터, 구분선, 자막본문) 설정 단일 진실 공급원
  const ssulHeader = {
    enabled: ssulConfig?.ssulHeader?.enabled ?? true,
    bgColor: ssulConfig?.ssulHeader?.bgColor || '#F7CF46',
    heightMultiplier: ssulConfig?.ssulHeader?.heightMultiplier ?? 1.0,
    text: ssulConfig?.ssulHeader?.text || currentBrandChannelName || '채널명',
    textColor: ssulConfig?.ssulHeader?.textColor || '#18181B',
    font: ssulConfig?.ssulHeader?.font || 'Pretendard',
    fontSizeMultiplier: ssulConfig?.ssulHeader?.fontSizeMultiplier ?? 1.0,
    bold: ssulConfig?.ssulHeader?.bold ?? true,
    italic: ssulConfig?.ssulHeader?.italic ?? false,
    leftIcon: ssulConfig?.ssulHeader?.leftIcon || 'arrow_back',
    rightIcon: ssulConfig?.ssulHeader?.rightIcon || 'menu',
  };

  const postTitleConfig = {
    text: ssulConfig?.postTitle?.text || topTitleText || (currentProjectDisplayName && currentProjectDisplayName !== '템플릿 미리보기' ? currentProjectDisplayName : '') || '제목을 입력하세요',
    color: ssulConfig?.postTitle?.color || '#111827',
    font: ssulConfig?.postTitle?.font || titleFontFamily || 'Pretendard',
    fontSizeMultiplier: ssulConfig?.postTitle?.fontSizeMultiplier ?? 1.1,
    align: (ssulConfig?.postTitle?.align as 'left' | 'center' | 'right') || 'left',
    bold: ssulConfig?.postTitle?.bold ?? true,
    italic: ssulConfig?.postTitle?.italic ?? false,
    strokeEnabled: ssulConfig?.postTitle?.strokeEnabled ?? false,
    strokeColor: ssulConfig?.postTitle?.strokeColor || '#000000',
    strokeWidth: ssulConfig?.postTitle?.strokeWidth ?? 2,
    shadowEnabled: ssulConfig?.postTitle?.shadowEnabled ?? false,
    shadowColor: ssulConfig?.postTitle?.shadowColor || '#000000',
    shadowBlur: ssulConfig?.postTitle?.shadowBlur ?? 4,
    offsetX: ssulConfig?.postTitle?.offsetX ?? 0,
    offsetY: ssulConfig?.postTitle?.offsetY ?? 0,
    letterSpacing: ssulConfig?.postTitle?.letterSpacing ?? -0.5,
    lineHeight: ssulConfig?.postTitle?.lineHeight ?? 1.3,
  };

  const metadataConfig = {
    showAuthor: ssulConfig?.metadata?.showAuthor ?? true,
    authorText: ssulConfig?.metadata?.authorText || ssulConfig?.author || '작성자',
    showTime: ssulConfig?.metadata?.showTime ?? true,
    timeText: ssulConfig?.metadata?.timeText || ssulConfig?.timeText || '시간',
    showViews: ssulConfig?.metadata?.showViews ?? (!!ssulConfig?.viewsText),
    viewsText: ssulConfig?.metadata?.viewsText || ssulConfig?.viewsText || '',
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
    text: ssulConfig?.ssulSubtitle?.text || '',
    font: ssulConfig?.ssulSubtitle?.font || subCfg?.font || subCfg?.fontFamily || 'Pretendard',
    color: ssulConfig?.ssulSubtitle?.color || '#18181B',
    fontSizeMultiplier: ssulConfig?.ssulSubtitle?.fontSizeMultiplier ?? 1.0,
    align: (ssulConfig?.ssulSubtitle?.align as 'left' | 'center' | 'right') || 'center',
    bold: ssulConfig?.ssulSubtitle?.bold ?? true,
    italic: ssulConfig?.ssulSubtitle?.italic ?? false,
    lineHeightMultiplier: ssulConfig?.ssulSubtitle?.lineHeightMultiplier ?? 1.5,
    letterSpacingPx: ssulConfig?.ssulSubtitle?.letterSpacingPx ?? 0,
    marginTopPx: ssulConfig?.ssulSubtitle?.marginTopPx ?? 16,
    strokeEnabled: ssulConfig?.ssulSubtitle?.strokeEnabled ?? false,
    strokeColor: ssulConfig?.ssulSubtitle?.strokeColor || '#000000',
    strokeWidth: ssulConfig?.ssulSubtitle?.strokeWidth ?? 2,
    shadowEnabled: ssulConfig?.ssulSubtitle?.shadowEnabled ?? false,
    shadowColor: ssulConfig?.ssulSubtitle?.shadowColor || '#000000',
    shadowBlur: ssulConfig?.ssulSubtitle?.shadowBlur ?? 4,
    boxEnabled: ssulConfig?.ssulSubtitle?.boxEnabled ?? false,
    boxColor: ssulConfig?.ssulSubtitle?.boxColor || '#F3F4F6',
    boxRadius: ssulConfig?.ssulSubtitle?.boxRadius ?? 4,
  };

  const aspectScale = aspectRatio === '9:16' ? 1.0 : aspectRatio === '1:1' ? 0.9 : 0.75;

  return (
    <div className="canvas-viewport-root relative w-full h-full flex items-center justify-center overflow-visible">
      {/* 🎬 썰형/군림보형 자막 싱크 기반 부드러운 이미지 하향 스크롤/슬라이드 다운 애니메이션 */}
      <style>{`
        @keyframes viraloopSlideDown {
          0% {
            transform: translateY(-22px);
            opacity: 0.85;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-viraloop-slidedown {
          animation: viraloopSlideDown 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
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
            ? 'bg-white shadow-xl ring-zinc-200 dark:ring-zinc-800'
            : 'bg-black border border-zinc-700 dark:border-zinc-800 ring-zinc-600/50',
          aspectRatio === '9:16' && "h-full max-h-[96%] aspect-[9/16]",
          aspectRatio === '16:9' && "w-full max-w-[96%] aspect-[16/9]",
          aspectRatio === '1:1' && "h-full max-h-[96%] aspect-square"
        )}
        style={{
          backgroundColor: isInsta ? instaConfig.bgColor : isSsul ? '#FFFFFF' : undefined,
          transform: `scale(${canvasScale}) translate(${canvasPan.x}px, ${canvasPan.y}px)`,
        }}
      >
        {/* 📜 [썰형 전용 독립 렌더러] SsulCanvasLayout (문단 누적, 카드 유동 확장, 비디오 슬라이드다운, 밈 캐릭터 완벽 격리) */}
        {layoutTemplateMode === 'ssul' && (
          <SsulCanvasLayout
            aspectRatio={aspectRatio}
            canvasScale={canvasScale}
            selectedLayerId={selectedLayerId || undefined}
            setSelectedLayerId={(id) => setSelectedLayerId(id)}
            setActiveInspectorTab={setActiveInspectorTab}
            setActiveFloating={setActiveFloating}
            currentProjectDisplayName={currentProjectDisplayName}
            currentTimeMs={currentTimeMs}
            isPlaying={isPlaying}
            ssulConfig={ssulConfig}
            topTitleText={topTitleText}
            currentSubtitleText={currentSubtitleText}
            subtitleConfig={subtitleConfig}
            subtitleSplitLimit={activeSplitLimit}
            layers={layers}
            trackVisibility={trackVisibility}
            videoFitMode={videoFitMode}
            videoBlurBg={videoBlurBg}
            videoLayer={videoLayer}
            videoZIndex={videoZIndex}
            videoFilter={videoFilter}
            videoHorizontalFlip={videoHorizontalFlip}
            videoVerticalFlip={videoVerticalFlip}
            videoZoomScale={videoZoomScale}
            videoRotationDeg={videoRotationDeg}
            videoFocusXPct={videoFocusXPct}
            videoFocusYPct={videoFocusYPct}
            videoRef={videoRef}
            isSlidingDown={isSlidingDown}
            videoBorderRadius={videoBorderRadius}
            videoBorderEnabled={videoBorderEnabled}
            videoBorderWidth={videoBorderWidth}
            videoBorderColor={videoBorderColor}
            videoShadowEnabled={videoShadowEnabled}
            videoShadowBlur={videoShadowBlur}
            videoShadowColor={videoShadowColor}
            videoPaddingPct={videoPaddingPct}
          />
        )}

        {/* 🎬 LAYER 0: 비디오 레이어 (일반 모드 / 군림보 / 인스타) */}
        {layoutTemplateMode !== 'ssul' && (
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
              "absolute overflow-hidden flex items-center justify-center transition-all cursor-pointer",
              layoutTemplateMode === 'instagram' ? "bg-transparent" : "bg-black",
              selectedLayerId === 'layer_video' && layoutTemplateMode !== 'instagram' && "ring-1 ring-sky-400"
            )}
          style={{
            top: isInsta
              ? 0
              : isGunlimbo
              ? '24%'
              : isSsul
              ? '46%'
              : `${Math.max(aspectRatio === '9:16' && videoFitMode === 'sandwich' && hasTopBarBg ? topBarHeightPct : 0, videoCropTopPct)}%`,
            height: isInsta
              ? '100%'
              : isSsul
              ? '52%'
              : undefined,
            bottom: isInsta
              ? 0
              : isGunlimbo
              ? '28%'
              : isSsul
              ? '2%'
              : `${Math.max(aspectRatio === '9:16' && videoFitMode === 'sandwich' && hasBottomBarBg ? bottomBarHeightPct : 0, videoCropBottomPct)}%`,
            left: isSsul ? '3%' : `${videoPaddingPct || 0}%`,
            right: isSsul ? '3%' : `${videoPaddingPct || 0}%`,
            borderRadius: isSsul ? '12px' : `${videoBorderRadius || 0}px`,
            border: videoBorderEnabled && !isInsta ? `${videoBorderWidth || 1}px solid ${videoBorderColor || '#FFFFFF'}` : undefined,
            boxShadow: videoShadowEnabled && !isInsta
              ? `0 8px ${videoShadowBlur || 20}px -4px ${videoShadowColor || 'rgba(0,0,0,0.5)'}`
              : isSsul ? '0 8px 20px -4px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)' : 'none',
            zIndex: videoZIndex,
            opacity: trackVisibility.v1Video ? 1 : 0,
          }}
        >
          {/* 🌟 여백 가우시안 블러 미러 배경 (CapCut 1순위 인기 연출) */}
                {videoBlurBg && videoFitMode !== 'fullscreen' && videoLayer?.data && layoutTemplateMode !== 'instagram' && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                    {isImageMedia ? (
                      <img
                        src={getMediaUrl(videoLayer.data)}
                        alt="블러 배경"
                        className="w-full h-full object-cover filter blur-[28px] brightness-[0.55] scale-[1.3] pointer-events-none select-none"
                      />
                    ) : (
                      <video
                        src={getMediaUrl(videoLayer.data)}
                        playsInline
                        muted
                        className="w-full h-full object-cover filter blur-[28px] brightness-[0.55] scale-[1.3] pointer-events-none select-none"
                      />
                    )}
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
                    isImageMedia ? (
                      <img
                        src={getMediaUrl(videoLayer.data)}
                        alt="미디어 콘텐츠"
                        style={{ filter: computeVideoCssFilter(videoFilter) }}
                        className={cn(
                          "w-full h-full object-cover pointer-events-none select-none transition-[filter] duration-150",
                          isSlidingDown && "animate-viraloop-slidedown"
                        )}
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        src={getMediaUrl(videoLayer.data)}
                        playsInline
                        loop={isLooping}
                        muted={trackAudioMute.v1Video}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        style={{ filter: computeVideoCssFilter(videoFilter) }}
                        className={cn(
                          "w-full h-full object-cover pointer-events-none select-none transition-[filter] duration-150",
                          isSlidingDown && "animate-viraloop-slidedown"
                        )}
                      />
                    )
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
            )}

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
                      setActiveInspectorTab('videoCrop');
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setActiveFloating('videoCrop');
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
                        ? 'linear-gradient(45deg, rgba(0, 0, 0, 0.035) 25%, transparent 25%), linear-gradient(-45deg, rgba(0, 0, 0, 0.035) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0, 0, 0, 0.035) 75%), linear-gradient(-45deg, transparent 75%, rgba(0, 0, 0, 0.035) 75%)'
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
                      ? '24%'
                      : layoutTemplateMode === 'ssul'
                      ? '46%'
                      : `${Math.max(aspectRatio === '9:16' && videoFitMode === 'sandwich' && hasTopBarBg ? topBarHeightPct : 0, videoCropTopPct)}%`,
                    height: layoutTemplateMode === 'instagram'
                      ? `${instaConfig.holeHeightPct}%`
                      : layoutTemplateMode === 'ssul'
                      ? '52%'
                      : undefined,
                    bottom: layoutTemplateMode === 'instagram'
                      ? undefined
                      : layoutTemplateMode === 'gunlimbo'
                      ? '28%'
                      : layoutTemplateMode === 'ssul'
                      ? '2%'
                      : `${Math.max(aspectRatio === '9:16' && videoFitMode === 'sandwich' && hasBottomBarBg ? bottomBarHeightPct : 0, videoCropBottomPct)}%`,
                    left: layoutTemplateMode === 'instagram' ? `${(100 - instaConfig.holeWidthPct) / 2}%` : layoutTemplateMode === 'ssul' ? '3%' : 0,
                    right: layoutTemplateMode === 'instagram' ? `${(100 - instaConfig.holeWidthPct) / 2}%` : layoutTemplateMode === 'ssul' ? '3%' : 0,
                    borderRadius: layoutTemplateMode === 'instagram' ? `${instaConfig.holeRoundness}px` : layoutTemplateMode === 'ssul' ? '12px' : 0,
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
                        onClick={(e) => { e.stopPropagation(); setVideoRotationDeg((r: number) => (r + 90) % 360); }}
                        className="p-0.5 hover:bg-sky-500 rounded text-[9px] cursor-pointer"
                        title="90도 회전"
                      >
                        ↻ 90°
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setVideoHorizontalFlip((f: boolean) => !f); }}
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
                  {/* 1. 상단 블랙 레터박스 (0% ~ 24%) 배경 */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[24%] bg-black select-none pointer-events-none"
                    style={{
                      zIndex: 20,
                      borderBottom: gunlimboConfig.showGuidelines ? '1px dashed rgba(161, 161, 170, 0.4)' : 'none',
                    }}
                  />

                  {/* 1-1. 상단 2줄 대제목 (TransformGizmo 지원) */}
                  {(gunlimboConfig.keepTitleThroughout || currentTimeMs <= (gunlimboConfig.introDurationSec || 2.5) * 1000) && (
                    <TransformGizmo
                      transform={{
                        ...titleTransform,
                        xPct: (titleTransform.xPct !== undefined && titleTransform.xPct >= 20 && titleTransform.xPct <= 80) ? titleTransform.xPct : 50,
                      }}
                      onDoubleClick={() => setActiveFloating('title')}
                      selected={selectedLayerId === 'layer_gunlimbo_title' || selectedLayerId === 'layer_title'}
                      name="군림보 상단 대제목"
                      canvasScale={canvasScale}
                      anchor="center"
                      onSelect={() => {
                        setSelectedLayerId('layer_gunlimbo_title');
                        setActiveInspectorTab('title');
                      }}
                      onChange={(newT) => {
                        setTitleTransform(newT);
                        setTopTitleYPct(newT.yPct);
                      }}
                    >
                      <div
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setActiveFloating('title');
                        }}
                        className="flex flex-col items-center text-center leading-tight cursor-pointer px-4 select-none"
                        style={{
                          backgroundColor: (titleBgMode !== 'none') ? titleBgColor : 'transparent',
                          borderRadius: `${titleBorderRadius}px`,
                          padding: (titleBgMode !== 'none') ? `${titlePaddingY}px ${titlePaddingX}px` : undefined,
                        }}
                        title="더블클릭하여 상단 대제목 설정"
                      >
                        {/* 🏷️ 군림보 상단 뱃지 태그 */}
                        {(gunlimboConfig?.hasTitleBadge ?? hasTitleBadge) && (
                          <span
                            className="inline-block px-2.5 py-0.5 rounded-full font-black text-center shadow-xs select-none uppercase tracking-wider mb-1"
                            style={{
                              backgroundColor: gunlimboConfig?.titleBadgeBg || titleBadgeBg || '#EF4444',
                              color: gunlimboConfig?.titleBadgeColor || titleBadgeColor || '#FFFFFF',
                              fontSize: `${gunlimboConfig?.titleBadgeSizePx || titleBadgeSizePx || 11}px`,
                              letterSpacing: '0.05em',
                            }}
                          >
                            {gunlimboConfig?.titleBadgeText || titleBadgeText || 'HOT'}
                          </span>
                        )}

                        {/* 1단 대제목 */}
                        <span
                          className="font-black drop-shadow-sm whitespace-pre-line text-center"
                          style={{
                            color: gunlimboConfig.titleLine1Color || '#FFFFFF',
                            fontSize: `${gunlimboConfig.titleLine1FontSize || gunlimboConfig.titleFontSize || titleLine1SizePx || 34}px`,
                            fontFamily: resolveFontFamily(gunlimboConfig.titleLine1Font || gunlimboConfig.titleFont || titleLine1FontFamily || titleFontFamily),
                            fontWeight: (gunlimboConfig.titleLine1Bold ?? gunlimboConfig.titleBold ?? titleLine1Bold ?? titleBold) !== false ? 900 : 400,
                            fontStyle: (gunlimboConfig.titleLine1Italic ?? gunlimboConfig.titleItalic ?? titleLine1Italic ?? titleItalic) ? 'italic' : 'normal',
                            textAlign: gunlimboConfig.titleLine1Align || titleLine1Align || titleAlign || 'center',
                            letterSpacing: `${gunlimboConfig.titleLine1LetterSpacing !== undefined ? gunlimboConfig.titleLine1LetterSpacing : (titleLine1LetterSpacing ?? -0.5)}px`,
                            lineHeight: gunlimboConfig.titleLineHeight ?? titleLineHeight ?? 1.15,
                            WebkitTextStroke: titleStroke ? `${titleStrokeWidth}px ${titleStrokeColor}` : '2px rgba(0,0,0,0.6)',
                            paintOrder: 'stroke fill',
                            textShadow: titleShadow ? `0 2px ${titleShadowBlur}px ${titleShadowColor}` : 'none',
                          }}
                        >
                          {gunlimboConfig.titleLine1 || '제목을'}
                        </span>

                        {/* 2단 대제목 (double 모드일 때만 표시!) */}
                        {(gunlimboConfig?.titleLinesMode ?? titleLinesMode ?? 'double') === 'double' && (gunlimboConfig?.hasTitleLine2 ?? hasTitleLine2 ?? true) && (
                          <span
                            className="font-black drop-shadow-sm whitespace-pre-line text-center"
                            style={{
                              color: gunlimboConfig.titleLine2Color || '#FFE500',
                              fontSize: `${gunlimboConfig.titleLine2FontSize || gunlimboConfig.titleFontSize || titleLine2SizePx || 34}px`,
                              fontFamily: resolveFontFamily(gunlimboConfig.titleLine2Font || gunlimboConfig.titleFont || titleLine2FontFamily || titleFontFamily),
                              fontWeight: (gunlimboConfig.titleLine2Bold ?? gunlimboConfig.titleBold ?? titleLine2Bold ?? titleBold) !== false ? 900 : 400,
                              fontStyle: (gunlimboConfig.titleLine2Italic ?? gunlimboConfig.titleItalic ?? titleLine2Italic ?? titleItalic) ? 'italic' : 'normal',
                              textAlign: gunlimboConfig.titleLine2Align || titleLine2Align || titleAlign || 'center',
                              letterSpacing: `${gunlimboConfig.titleLine2LetterSpacing !== undefined ? gunlimboConfig.titleLine2LetterSpacing : (titleLine2LetterSpacing ?? -0.5)}px`,
                              lineHeight: gunlimboConfig.titleLineHeight ?? titleLineHeight ?? 1.15,
                              marginTop: `${Math.round(((gunlimboConfig.titleLineHeight ?? titleLineHeight ?? 1.15) - 1.0) * 16 + 4)}px`,
                              WebkitTextStroke: titleStroke ? `${titleStrokeWidth}px ${titleStrokeColor}` : '2px rgba(0,0,0,0.6)',
                              paintOrder: 'stroke fill',
                              textShadow: titleShadow ? `0 2px ${titleShadowBlur}px ${titleShadowColor}` : 'none',
                            }}
                          >
                            {gunlimboConfig.titleLine2 || '입력하세요'}
                          </span>
                        )}
                      </div>
                    </TransformGizmo>
                  )}

                  {/* 2. 24~34% 수평 0도 와이드 순백색 띠 바 (TransformGizmo 지원 - 쨉쨉이와 완전 분리) */}
                  {(currentTimeMs <= (gunlimboConfig.introDurationSec || 2.5) * 1000 || !isPlaying) && (
                    <TransformGizmo
                      transform={{
                        xPct: 50, // 🎯 군림보는 항상 가로폭 100% 수평 중앙 정렬
                        yPct: gunlimboConfig.hookTransform?.yPct ?? gunlimboConfig.hookYPercent ?? 28,
                        scale: gunlimboConfig.hookTransform?.scale ?? 1.0,
                        rotationDeg: 0, // 🎯 군림보형은 삐딱한 기울기(-3도) 없이 수평 0도 와이드 밴드로 고정
                        zIndex: 26,
                      }}
                      onDoubleClick={() => setActiveFloating('gunlimboHook')}
                      selected={selectedLayerId === 'layer_gunlimbo_hook'}
                      name="군림보 훅 밴드"
                      canvasScale={canvasScale}
                      anchor="center"
                      onSelect={() => {
                        setSelectedLayerId('layer_gunlimbo_hook');
                        setActiveInspectorTab('jabHook');
                      }}
                      onChange={(newT) => {
                        const updated = { ...newT, xPct: 50, rotationDeg: 0 };
                        props.setGunlimboConfig?.((prev: any) => ({
                          ...prev,
                          hookTransform: updated,
                          hookYPercent: newT.yPct,
                        }));
                      }}
                    >
                      <div
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setActiveFloating('gunlimboHook');
                        }}
                        className={cn(
                          "w-full min-w-[300px] max-w-[380px] py-2 px-6 flex items-center shadow-xl cursor-pointer transition-all rounded-xs border-y border-white/20",
                          gunlimboConfig.hookAlign === 'left' ? "justify-start" : gunlimboConfig.hookAlign === 'right' ? "justify-end" : "justify-center"
                        )}
                        style={{ backgroundColor: gunlimboConfig.hookBgColor || '#FFFFFF' }}
                        title="더블클릭하여 소제목 훅 문구 설정"
                      >
                        <span
                          className="tracking-tight leading-snug break-keep select-none uppercase w-full"
                          style={{
                            color: gunlimboConfig.hookTextColor || '#000000',
                            fontSize: `${gunlimboConfig.hookFontSize || 22}px`,
                            fontFamily: resolveFontFamily(gunlimboConfig.hookFont || titleFontFamily),
                            fontWeight: gunlimboConfig.hookBold === false ? 400 : 900,
                            fontStyle: gunlimboConfig.hookItalic ? 'italic' : 'normal',
                            textAlign: gunlimboConfig.hookAlign || 'center',
                            letterSpacing: `${gunlimboConfig.hookLetterSpacing ?? jabLetterSpacing ?? -0.5}px`,
                            lineHeight: gunlimboConfig.hookLineHeight ?? jabLineHeight ?? 1.25,
                          }}
                        >
                          {gunlimboConfig.hookPhrase || jabText || '*출격작전 반전 순간!*'}
                        </span>
                      </div>
                    </TransformGizmo>
                  )}

                  {/* 3. 하단 블랙 레터박스 (72% ~ 100%) 배경 */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[28%] bg-black pointer-events-none select-none"
                    style={{
                      zIndex: 25,
                      borderTop: gunlimboConfig.showGuidelines ? '1px dashed rgba(161, 161, 170, 0.4)' : 'none',
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
                    setActiveInspectorTab('profile');
                  }}
                  onChange={(newT) => {
                    setProfileTransform(newT);
                    props.setInstaConfig?.((prev: any) => ({ ...prev, profileTransform: newT }));
                  }}
                >
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setActiveFloating('instaProfile');
                    }}
                    className="flex items-center gap-2.5 cursor-pointer transition-colors select-none group"
                    style={{
                      backgroundColor: instaConfig.profileBoxEnabled ? (instaConfig.profileBoxColor || 'rgba(255,255,255,0.85)') : 'transparent',
                      borderRadius: `${instaConfig.profileBorderRadius ?? 20}px`,
                      boxShadow: instaConfig.profileBoxEnabled ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      padding: instaConfig.profileBoxEnabled ? '4px 10px' : '2px 4px',
                    }}
                    title="더블클릭하여 프로필 설정"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-200 ring-2 ring-blue-500/20 shadow-xs shrink-0 flex items-center justify-center">
                      <img
                        src={instaConfig.profileAvatarUrl || instaConfig.profileAvatar || "https://api.dicebear.com/9.x/lorelei/svg?seed=user_avatar_blue"}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col text-left leading-tight">
                      <div className="flex items-center gap-1">
                        <span
                          className="tracking-tight"
                          style={{
                            color: instaConfig.profileNameColor || '#2563EB',
                            fontSize: `${instaConfig.profileNameSize || 14}px`,
                            fontFamily: resolveFontFamily(instaConfig.profileFont || 'Pretendard'),
                            fontWeight: instaConfig.profileBold !== false ? 700 : 400,
                            fontStyle: instaConfig.profileItalic ? 'italic' : 'normal',
                            WebkitTextStroke: instaConfig.profileStrokeEnabled ? `${instaConfig.profileStrokeWidth || 2}px ${instaConfig.profileStrokeColor || '#000000'}` : 'none',
                            textShadow: instaConfig.profileShadowEnabled ? `0 2px ${instaConfig.profileShadowBlur || 4}px ${instaConfig.profileShadowColor || 'rgba(0,0,0,0.6)'}` : 'none',
                            letterSpacing: `${instaConfig.profileLetterSpacing ?? 0}px`,
                            lineHeight: instaConfig.profileLineHeight ?? 1.2,
                          }}
                        >
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



              {/* ⬛ LAYER 1: 상단 배경 바 (Classic 전용 레터박스) */}
              {isClassic && hasTopBarBg && (
                <div
                  onClick={() => { setSelectedLayerId('layer_top_bar'); setActiveInspectorTab('topBottomBar'); }}
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
              {!isSsul && !isGunlimbo && hasTopTitle && trackVisibility.t1Title && (
                <TransformGizmo
                  transform={{
                    ...titleTransform,
                    xPct: layoutTemplateMode === 'instagram'
                      ? (titleTransform.xPct !== undefined && titleTransform.xPct !== 50 && titleTransform.xPct < 40 ? titleTransform.xPct : 6.0)
                      : ((titleTransform.xPct !== undefined && titleTransform.xPct >= 15 && titleTransform.xPct <= 85) ? titleTransform.xPct : 50),
                    yPct: layoutTemplateMode === 'instagram'
                      ? (titleTransform.yPct !== undefined && titleTransform.yPct !== 9.0 && titleTransform.yPct !== 14.0 && titleTransform.yPct !== 15 && titleTransform.yPct <= 30 ? titleTransform.yPct : 12.0)
                      : titleTransform.yPct,
                  }}
                  onDoubleClick={() => {
                    if (layoutTemplateMode === 'ssul') setActiveFloating('postTitle');
                    else setActiveFloating('title');
                  }}
                  selected={selectedLayerId === 'layer_title' || selectedLayerId === 'layer_top_title'}
                  name="상단 타이틀"
                  canvasScale={canvasScale}
                  anchor={layoutTemplateMode === 'instagram' ? 'left' : 'center'}
                  onSelect={() => {
                    setSelectedLayerId('layer_title');
                    setActiveInspectorTab('title');
                  }}
                  onChange={(newT) => {
                    setTitleTransform(newT);
                    setTopTitleYPct(newT.yPct);
                  }}
                >
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (layoutTemplateMode === 'ssul') setActiveFloating('postTitle');
                      else setActiveFloating('title');
                    }}
                    className={cn(
                      "flex flex-col select-none cursor-move transition-all",
                      (titleAlign === 'left' || (!titleAlign && layoutTemplateMode === 'instagram'))
                        ? "items-start text-left"
                        : (titleAlign === 'right')
                        ? "items-end text-right"
                        : "items-center text-center"
                    )}
                    style={{
                      fontFamily: resolveFontFamily(titleFontFamily),
                      backgroundColor: titleBgMode !== 'none' ? titleBgColor : 'transparent',
                      paddingLeft: titleBgMode !== 'none' ? `${titlePaddingX}px` : 0,
                      paddingRight: titleBgMode !== 'none' ? `${titlePaddingX}px` : 0,
                      paddingTop: titleBgMode !== 'none' ? `${titlePaddingY}px` : 0,
                      paddingBottom: titleBgMode !== 'none' ? `${titlePaddingY}px` : 0,
                      borderRadius: titleBgMode === 'pill' ? '9999px' : `${titleBorderRadius}px`,
                      boxShadow: titleShadow ? `0 4px ${titleShadowBlur * 2}px ${titleShadowColor}` : 'none',
                    }}
                  >
                    {layoutTemplateMode === 'instagram' ? (
                      <div
                        className="leading-tight tracking-tight whitespace-pre-line w-full"
                        style={{
                          fontSize: `${Math.round((titleLine1SizePx || 22) * (titleTransform.scale || 1.0) * aspectScale)}px`,
                          lineHeight: titleLineHeight !== undefined ? titleLineHeight : (instaConfig?.titleLineHeight ?? 1.18),
                          letterSpacing: `${titleLetterSpacing !== undefined ? titleLetterSpacing : (instaConfig?.titleLetterSpacing ?? -0.5)}px`,
                          color: titleLine1Color || '#000000',
                          textAlign: titleAlign || instaConfig?.titleAlign || 'left',
                          fontWeight: titleBold !== false ? 900 : 400,
                          fontStyle: titleItalic ? 'italic' : 'normal',
                          fontFamily: resolveFontFamily(titleFontFamily || instaConfig?.titleFont || 'Pretendard'),
                          WebkitTextStroke: titleStroke ? `${titleStrokeWidth || 3}px ${titleStrokeColor || '#000000'}` : 'none',
                          paintOrder: 'stroke fill',
                          textShadow: titleShadow ? `0 2px ${titleShadowBlur || 4}px ${titleShadowColor || 'rgba(0,0,0,0.5)'}` : 'none',
                        }}
                      >
                        {topTitleText || titleLine1 || '제목을\n입력하세요'}
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
                            className="font-black px-1.5 py-0.5 uppercase tracking-wider mb-1 rounded-[2px] shadow-sm cursor-pointer hover:opacity-90 inline-block leading-tight"
                            style={{
                              backgroundColor: titleBadgeBg || '#EF4444',
                              color: titleBadgeColor || '#FFFFFF',
                              fontSize: `${Math.round((titleBadgeSizePx || 11) * aspectScale)}px`,
                            }}
                            title="더블클릭하여 뱃지 속성 편집"
                          >
                            {titleBadgeText}
                          </span>
                        )}

                        {/* 1단 타이틀 */}
                        {hasTitleLine1 && titleLine1 && (
                          <div
                            className={cn(
                              "leading-tight tracking-tight whitespace-nowrap w-full",
                              (titleLine1Italic ?? titleItalic) && "italic"
                            )}
                            style={{
                              color: titleLine1Color,
                              fontFamily: resolveFontFamily(titleLine1FontFamily || titleFontFamily),
                              fontWeight: (titleLine1Bold ?? titleBold) !== false ? 900 : 400,
                              fontSize: `${Math.round((titleLine1SizePx || 20) * aspectScale)}px`,
                              lineHeight: titleLineHeight !== undefined ? titleLineHeight : 1.2,
                              letterSpacing: `${titleLine1LetterSpacing !== undefined ? titleLine1LetterSpacing : -0.5}px`,
                              WebkitTextStroke: titleStroke ? `${titleStrokeWidth}px ${titleStrokeColor}` : 'none',
                              paintOrder: 'stroke fill',
                              WebkitFontSmoothing: 'antialiased',
                              textShadow: titleShadow ? `0 2px ${titleShadowBlur}px ${titleShadowColor}` : 'none',
                              textAlign: titleLine1Align || titleAlign || 'center',
                            }}
                          >
                            {titleLine1}
                          </div>
                        )}

                        {/* 2단 타이틀 (double 모드일 때만 표시) */}
                        {titleLinesMode === 'double' && hasTitleLine2 && titleLine2 && (
                          <div
                            className={cn(
                              "leading-tight tracking-tight whitespace-nowrap w-full",
                              (titleLine2Italic ?? titleItalic) && "italic"
                            )}
                            style={{
                              color: titleLine2Color,
                              fontFamily: resolveFontFamily(titleLine2FontFamily || titleFontFamily),
                              fontWeight: (titleLine2Bold ?? titleBold) !== false ? 900 : 400,
                              fontSize: `${Math.round((titleLine2SizePx || 24) * aspectScale)}px`,
                              lineHeight: titleLineHeight !== undefined ? titleLineHeight : 1.2,
                              letterSpacing: `${titleLine2LetterSpacing !== undefined ? titleLine2LetterSpacing : -0.5}px`,
                              marginTop: `${Math.round(((titleLineHeight !== undefined ? titleLineHeight : 1.2) - 1.0) * 10 + 2)}px`,
                              WebkitTextStroke: titleStroke ? `${titleStrokeWidth}px ${titleStrokeColor}` : 'none',
                              paintOrder: 'stroke fill',
                              WebkitFontSmoothing: 'antialiased',
                              textShadow: titleShadow ? `0 2px ${titleShadowBlur}px ${titleShadowColor}` : 'none',
                              textAlign: titleLine2Align || titleAlign || 'center',
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

              {/* ⚡ LAYER 3: 긴박 쨉쨉이 훅 (타임라인 시간대 동기화 & 인스타 템플릿 포함 지원) */}
              {(() => {
                // 재생 중일 때는 현재 타임코드에 위치한 activeJab만 표시! 정지 중(편집/프리뷰)에는 hasJab이면 상시 노출
                const isExplicitJabClipSelected = !isPlaying && selectedLayer?.type === 'jab' && selectedLayer.id !== 'layer_audio_bgm';
                const displayJab = activeJab || (isExplicitJabClipSelected ? selectedLayer : null);
                const isJabSelected = selectedLayerId === 'layer_jab' || selectedLayer?.type === 'jab' || (displayJab ? selectedLayerId === displayJab.id : false);
                const shouldShowJab = !isSsul && hasJab && trackVisibility.t2Jab !== false && (isPlaying ? !!activeJab : true);

                if (!shouldShowJab) return null;

                return (
                  <TransformGizmo
                    transform={jabTransform}
                    onDoubleClick={() => setActiveFloating('jabHook')}
                    selected={isJabSelected}
                    name="긴박 쨉쨉이 훅"
                    canvasScale={canvasScale}
                    anchor={layoutTemplateMode === 'instagram' ? (jabTransform.xPct < 30 ? 'left' : 'center') : 'center'}
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
                      className={cn(
                        "px-3 py-1.5 flex items-center whitespace-nowrap cursor-move transition-all",
                        props.jabAlign === 'left' ? "justify-start" : props.jabAlign === 'right' ? "justify-end" : "justify-center"
                      )}
                      style={{
                        backgroundColor: jabBgEnabled ? jabBgColor : 'transparent',
                        borderRadius: `${jabBorderRadius}px`,
                        boxShadow: jabShadow ? `0 4px ${jabShadowBlur * 2}px ${jabShadowColor || '#000000'}` : 'none',
                        border: (jabBgEnabled && jabStroke) ? '1px solid rgba(0,0,0,0.2)' : 'none',
                      }}
                    >
                      <span
                        style={{
                          fontSize: `${Math.round((jabFontSize || 13) * aspectScale)}px`,
                          color: jabTextColor,
                          fontFamily: resolveFontFamily(jabFont || titleFontFamily),
                          fontWeight: jabBold === false ? 400 : 900,
                          fontStyle: jabItalic ? 'italic' : 'normal',
                          textAlign: jabAlign || 'center',
                          letterSpacing: `${jabLetterSpacing ?? 0}px`,
                          lineHeight: jabLineHeight ?? 1.2,
                          WebkitTextStroke: jabStroke ? `${jabStrokeWidth}px ${jabStrokeColor}` : 'none',
                          paintOrder: 'stroke fill',
                          WebkitFontSmoothing: 'antialiased',
                          textShadow: jabShadow ? `0 2px ${jabShadowBlur}px ${jabShadowColor || '#000000'}` : 'none',
                        }}
                      >
                        {displayJab?.data || jabText}
                      </span>
                    </div>
                  </TransformGizmo>
                );
              })()}

              {/* 💬 LAYER 4: 본문 자막 (타임라인 시간대 동기화 & 인스타형 상시 노출 & 줄바꿈·스타일 완전 연동) */}
              {(() => {
                const isSubSelected = selectedLayer?.type === 'subtitle' || selectedLayerId === 'layer_sub';
                const displaySub = activeSub || (isSubSelected ? (selectedLayer?.type === 'subtitle' ? selectedLayer : subtitleLayers[0]) : (layoutTemplateMode === 'instagram' || layoutTemplateMode === 'gunlimbo' ? subtitleLayers[0] : null));
                const subText = displaySub?.data || currentSubtitleText || (
                  layoutTemplateMode === 'instagram'
                    ? '게시글 본문 자막을 입력하세요.\n타임라인에 자막이 동기화됩니다.'
                    : layoutTemplateMode === 'gunlimbo'
                    ? '군림보 방송 자막이 여기에 표시됩니다'
                    : '자막을 입력하거나 타임라인에서 자막을 선택하세요'
                );

                const isTrackVisible = trackVisibility ? (trackVisibility.sub !== false && (trackVisibility as any).s1Subtitle !== false) : true;
                const isConfigVisible = subCfg?.visible !== false;
                const shouldShowSub = isConfigVisible &&
                  isTrackVisible &&
                  (hasSubtitle !== false) &&
                  (layoutTemplateMode === 'instagram' || layoutTemplateMode === 'gunlimbo' || !!displaySub || !!currentSubtitleText || isSubSelected);

                // 🎯 군림보형: 재생(isPlaying) 중인 0초~후킹구간에는 중앙 100% 흰색 바에서 첫 문장이 표시되므로 하단 자막 일시 숨김 (편집/미리보기 시에는 상시 노출하여 암흑 공백 방지)
                if (layoutTemplateMode === 'gunlimbo' && isPlaying && currentTimeMs <= gunlimboConfig.introDurationSec * 1000 && !isSubSelected) {
                  return null;
                }

                if (!shouldShowSub || isSsul) return null;

                const isStrokeOn = subCfg?.outlineSize !== undefined ? (subCfg.outlineSize > 0) : subtitleStrokeEnabled;
                const isShadowOn = subCfg?.shadowSize !== undefined ? (subCfg.shadowSize > 0) : subtitleShadowEnabled;
                const isBoxOn = subCfg?.useBox !== undefined ? subCfg.useBox : subtitleUseBox;

                return (
                  <TransformGizmo
                    transform={{
                      ...subTransform,
                      xPct: layoutTemplateMode === 'instagram'
                        ? (subTransform.xPct !== undefined && subTransform.xPct !== 50 && subTransform.xPct < 30 ? subTransform.xPct : 6.0)
                        : (subTransform.xPct ?? 50),
                      yPct: layoutTemplateMode === 'instagram'
                        ? (subTransform.yPct !== undefined && subTransform.yPct !== 78 && subTransform.yPct !== 75 && subTransform.yPct <= 75 ? subTransform.yPct : 71.5)
                        : (subTransform.yPct ?? 75),
                      widthPct: layoutTemplateMode === 'instagram'
                        ? (subTransform.widthPct ?? 88)
                        : subTransform.widthPct,
                    }}
                    selected={isSubSelected}
                    name="본문 자막"
                    onDoubleClick={() => setActiveFloating(layoutTemplateMode === 'ssul' ? 'ssulSubtitle' : 'subtitle')}
                    canvasScale={canvasScale}
                    anchor={layoutTemplateMode === 'instagram' ? 'left' : 'center'}
                    onSelect={() => {
                      if (displaySub) setSelectedLayerId(displaySub.id);
                      else setSelectedLayerId('layer_sub');
                      setActiveInspectorTab('style');
                    }}
                    onChange={(newT) => {
                      setSubTransform(newT);
                      if (setSubtitleYPercent) setSubtitleYPercent(newT.yPct);
                    }}
                  >
                    <div
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setActiveFloating(layoutTemplateMode === 'ssul' ? 'ssulSubtitle' : 'subtitle');
                      }}
                      className={cn(
                        "whitespace-pre-line transition-all cursor-move",
                        layoutTemplateMode === 'instagram'
                          ? "w-full break-keep [overflow-wrap:anywhere]"
                          : "min-w-[260px] max-w-full inline-block leading-snug tracking-tight px-2",
                        isBoxOn && "px-3 py-1.5"
                      )}
                      style={{
                        textAlign: subCfg?.textAlign || (subCfg as any)?.align || (layoutTemplateMode === 'instagram' ? 'left' : 'center'),
                        backgroundColor: isBoxOn
                          ? (subCfg?.boxColor || subtitleBoxColor || 'rgba(0,0,0,0.6)')
                          : 'transparent',
                        borderRadius: isBoxOn
                          ? `${subCfg?.boxRadius ?? subCfg?.borderRadius ?? props.subtitleBorderRadius ?? subtitleBorderRadius}px`
                          : 0,
                        boxShadow: isShadowOn && isBoxOn
                          ? '0 4px 14px rgba(0,0,0,0.7)'
                          : 'none',
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          textAlign: subCfg?.textAlign || (subCfg as any)?.align || (layoutTemplateMode === 'instagram' ? 'left' : 'center'),
                          fontSize: layoutTemplateMode === 'instagram'
                            ? `${Math.round(((subCfg?.fontSize || instaConfig.subSize || 15)) * (subTransform.scale || 1.0) * aspectScale)}px`
                            : layoutTemplateMode === 'gunlimbo'
                            ? `${Math.round(((subCfg?.fontSize || 20)) * aspectScale)}px`
                            : `${Math.round(((subCfg?.fontSize || 18)) * aspectScale)}px`,
                          color: layoutTemplateMode === 'instagram'
                            ? (subCfg?.textColor || subCfg?.fillColor || instaConfig.subColor || '#374151')
                            : layoutTemplateMode === 'gunlimbo'
                            ? (subCfg?.textColor || subCfg?.fillColor || subCfg?.color || '#FFE500')
                            : (subCfg?.textColor || subCfg?.fillColor || subCfg?.color || '#FFFFFF'),
                          fontFamily: resolveFontFamily(subCfg?.font || subCfg?.fontFamily || instaConfig?.subFont || 'Pretendard'),
                          fontWeight: (subCfg?.isBold === false || (subCfg as any)?.bold === false) ? 400 : (layoutTemplateMode === 'instagram' ? 700 : 'bold'),
                          fontStyle: (subCfg?.isItalic || (subCfg as any)?.italic) ? 'italic' : 'normal',
                          letterSpacing: `${subCfg?.letterSpacing ?? 0}px`,
                          lineHeight: subCfg?.lineHeight ?? 1.35,
                          WebkitTextStroke: isStrokeOn
                            ? `${subCfg?.outlineSize || subtitleStrokeWidth || 3}px ${subCfg?.outlineColor || subtitleStrokeColor || '#000000'}`
                            : '0 transparent',
                          paintOrder: 'stroke fill',
                          WebkitFontSmoothing: 'antialiased',
                          textShadow: isShadowOn
                            ? `0 2px ${subCfg?.shadowSize ? subCfg.shadowSize * 3 : (subtitleShadowBlur || 8)}px ${subCfg?.shadowColor || subtitleShadowColor || 'rgba(0,0,0,0.95)'}`
                            : 'none',
                        }}
                      >
                        {renderHighlightedSubtitleText(
                          formatWrappedText(subText, activeSplitLimit, subCfg?.maxLines || 2),
                          displaySub?.styleProps?.highlights,
                          layoutTemplateMode === 'instagram'
                            ? (subCfg?.textColor || subCfg?.fillColor || instaConfig.subColor || '#374151')
                            : layoutTemplateMode === 'gunlimbo'
                            ? (subCfg?.textColor || subCfg?.fillColor || subCfg?.color || '#FFE500')
                            : (subCfg?.textColor || subCfg?.fillColor || subCfg?.color || '#FFFFFF'),
                          selectedHighlightColor
                        )}
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
                    setActiveInspectorTab('sourceCredit');
                  }}
                  onChange={(newT) => {
                    setSourceTransform(newT);
                    if (setBottomSourceBottomPct) setBottomSourceBottomPct(100 - newT.yPct);
                  }}
                >
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setActiveFloating('sourceCredit');
                    }}
                    className={cn(
                      "select-none whitespace-nowrap px-2 cursor-move",
                      props.bottomSourceAlign === 'left' ? "text-left" : props.bottomSourceAlign === 'right' ? "text-right" : "text-center"
                    )}
                    style={{
                      backgroundColor: bottomSourceBg ? (bottomSourceBgColor || 'rgba(0,0,0,0.7)') : 'transparent',
                      borderRadius: `${bottomSourceBorderRadius}px`,
                    }}
                  >
                    <span
                      className="tracking-wide drop-shadow-md inline-block w-full"
                      style={{
                        fontSize: `${(bottomSourceSizePx || 10)}px`,
                        color: bottomSourceColor,
                        fontFamily: resolveFontFamily(bottomSourceFontFamily || 'Pretendard'),
                        fontWeight: bottomSourceBold ? 800 : 400,
                        fontStyle: bottomSourceItalic ? 'italic' : 'normal',
                        textAlign: props.bottomSourceAlign || 'center',
                        letterSpacing: `${bottomSourceLetterSpacing ?? 0}px`,
                        lineHeight: bottomSourceLineHeight ?? 1.2,
                        WebkitTextStroke: bottomSourceStroke ? `${bottomSourceStrokeWidth || 1}px ${bottomSourceStrokeColor || '#000000'}` : 'none',
                        paintOrder: 'stroke fill',
                        textShadow: bottomSourceShadow ? `0 1px ${bottomSourceShadowBlur !== undefined ? bottomSourceShadowBlur : 4}px ${bottomSourceShadowColor || 'rgba(0,0,0,0.9)'}` : 'none',
                      }}
                    >
                      {bottomSourceText}
                    </span>
                  </div>
                </TransformGizmo>
              )}

              {/* ⬛ LAYER 6: 하단 배경 바 (Classic 전용 레터박스) */}
              {isClassic && hasBottomBarBg && (
                <div
                  onClick={() => { setSelectedLayerId('layer_bottom_bar'); setActiveInspectorTab('topBottomBar'); }}
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


              {/* 💬 LAYER 7: 하단 바이럴 댓글 카드 (TransformGizmo 연동) */}
              {hasCommentCard && commentCard && (() => {
                const isBlurred = commentCard.blurId || commentCard.isBlurred;
                const isAnon = commentCard.anonymous || commentCard.isAnonymous;
                const displayAuthor = isAnon ? '익명_유저' : (commentCard.author || 'User');
                const displayHandle = isAnon ? '@user_***' : (commentCard.handle || '@user');

                return (
                  <TransformGizmo
                    transform={commentTransform}
                    onDoubleClick={() => setActiveFloating('commentCard')}
                    selected={selectedLayerId === 'layer_comment_card'}
                    name="하단 바이럴 댓글 카드"
                    canvasScale={canvasScale}
                    anchor="center"
                    onSelect={() => {
                      setSelectedLayerId('layer_comment_card');
                      setActiveInspectorTab('commentCard');
                    }}
                    onChange={(newT) => setCommentTransform?.(newT)}
                  >
                    <div
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setActiveFloating('commentCard');
                      }}
                      className="p-3 transition-all cursor-move select-none min-w-[200px] max-w-[88%] w-fit inline-block"
                      style={{
                        backgroundColor: commentCard.bgColor || ((commentCard.theme === 'insta' || layoutTemplateMode === 'instagram') ? 'rgba(245, 245, 245, 0.95)' : commentCard.theme === 'yt-dark' ? 'rgba(15, 15, 15, 0.9)' : 'rgba(255, 255, 255, 0.95)'),
                        color: commentCard.textColor || ((commentCard.theme === 'insta' || layoutTemplateMode === 'instagram') ? '#171717' : commentCard.theme === 'yt-dark' ? '#ffffff' : '#171717'),
                        borderRadius: `${commentCard.borderRadius !== undefined ? commentCard.borderRadius : ((commentCard.theme === 'insta' || layoutTemplateMode === 'instagram') ? 16 : 8)}px`,
                        border: commentCard.borderEnabled
                          ? `${commentCard.borderWidth || 1}px solid ${commentCard.borderColor || '#E5E7EB'}`
                          : ((commentCard.theme === 'insta' || layoutTemplateMode === 'instagram') ? '1px solid rgba(229, 231, 235, 0.9)' : commentCard.theme === 'yt-dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)'),
                        boxShadow: commentCard.cardShadowEnabled
                          ? `0 10px ${commentCard.cardShadowBlur || 20}px ${commentCard.cardShadowColor || 'rgba(0,0,0,0.25)'}`
                          : ((commentCard.theme === 'insta' || layoutTemplateMode === 'instagram') ? '0 4px 12px rgba(0,0,0,0.06)' : commentCard.theme === 'yt-dark' ? '0 10px 25px rgba(0,0,0,0.5)' : '0 10px 20px rgba(0,0,0,0.1)'),
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn(
                            "w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-amber-500 flex items-center justify-center text-[11px] font-black text-white shrink-0 overflow-hidden",
                            isBlurred && "blur-[2px]"
                          )}>
                            {displayAuthor.charAt(0)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={cn("text-[11px] font-bold leading-tight truncate", isBlurred && "blur-[3px]")}>
                              {displayAuthor}
                            </span>
                            <span className={cn("text-[9px] opacity-60 font-mono truncate", isBlurred && "blur-[3px]")}>
                              {displayHandle}
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] opacity-50 shrink-0">{commentCard.timeText || commentCard.timeAgo || '방금 전'}</span>
                      </div>
                      <p
                        className="text-[12px] leading-relaxed break-keep px-0.5 mb-2 whitespace-pre-line"
                        style={{
                          color: commentCard.textColor || undefined,
                          fontFamily: resolveFontFamily(commentCard.font || 'Pretendard'),
                          fontWeight: commentCard.bold ? 800 : (commentCard.bold === false ? 400 : 500),
                          fontStyle: commentCard.italic ? 'italic' : 'normal',
                          textAlign: commentCard.align || 'left',
                          letterSpacing: `${commentCard.letterSpacing ?? 0}px`,
                          lineHeight: commentCard.lineHeight ?? 1.4,
                          WebkitTextStroke: commentCard.textStrokeEnabled ? `${commentCard.textStrokeWidth || 1}px ${commentCard.textStrokeColor || '#000000'}` : 'none',
                          textShadow: commentCard.textShadowEnabled ? `0 2px ${commentCard.textShadowBlur || 4}px ${commentCard.textShadowColor || 'rgba(0,0,0,0.5)'}` : 'none',
                        }}
                      >
                        {commentCard.text || commentCard.content || '댓글 내용'}
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
                );
              })()}

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
      {activeFloating !== 'none' && (() => {
        const masterGeo = props.masterManifest?.geometry as any;
        const masterSty = props.masterManifest?.style as any;
        const masterSsulCfg = masterGeo?.ssulConfig || masterGeo?.layout?.ssulConfig;
        const masterGunlimboCfg = masterGeo?.gunlimboConfig || masterGeo?.layout?.gunlimboConfig;
        const masterInstaCfg = masterGeo?.instaConfig || masterGeo?.layout?.instaConfig;

        return (
        <div className="fixed inset-0 pointer-events-none z-[99999] overflow-visible">
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
                    const targetH = masterSsulCfg?.ssulHeader || {
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
                    };
                    props.setSsulConfig?.((prev: any) => ({
                      ...prev,
                      ssulHeader: { ...targetH },
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
                    if (patch.text !== undefined) {
                      props.setTopTitleText?.(patch.text);
                      props.setTitleLine1?.(patch.text);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1: patch.text }));
                    }
                    if (patch.font !== undefined) {
                      props.setTitleFontFamily?.(patch.font);
                    }
                    if (patch.color !== undefined) {
                      props.setTitleLine1Color?.(patch.color);
                      props.setTopTitleColor?.(patch.color);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1Color: patch.color }));
                    }
                    if (patch.fontSizeMultiplier !== undefined) {
                      if (props.setTitleLine1SizePx) {
                        props.setTitleLine1SizePx(Math.round(28 * patch.fontSizeMultiplier));
                      }
                    }
                    if (patch.strokeEnabled !== undefined) props.setTitleStroke?.(patch.strokeEnabled);
                    if (patch.strokeColor !== undefined) props.setTitleStrokeColor?.(patch.strokeColor);
                    if (patch.strokeWidth !== undefined) props.setTitleStrokeWidth?.(patch.strokeWidth);
                    if (patch.shadowEnabled !== undefined) props.setTitleShadow?.(patch.shadowEnabled);
                    if (patch.shadowColor !== undefined) props.setTitleShadowColor?.(patch.shadowColor);
                    if (patch.shadowBlur !== undefined) props.setTitleShadowBlur?.(patch.shadowBlur);
                    if (patch.bold !== undefined) props.setTitleBold?.(patch.bold);
                    if (patch.italic !== undefined) props.setTitleItalic?.(patch.italic);
                    if (patch.align !== undefined) props.setTitleAlign?.(patch.align);
                  }}
                  onReset={() => {
                    if (layoutTemplateMode === 'ssul') {
                      const targetPT = masterSsulCfg?.postTitle || {
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
                        shadowColor: '#000000',
                        shadowBlur: 4,
                        offsetX: 0,
                        offsetY: 0,
                        letterSpacing: -0.5,
                        lineHeight: 1.3,
                      };
                      props.setSsulConfig?.((prev: any) => ({
                        ...prev,
                        postTitle: { ...targetPT },
                      }));
                    } else {
                      if (masterSty?.titleFont) props.setTitleFontFamily?.(masterSty.titleFont);
                      if (masterSty?.titleLine1Color) props.setTitleLine1Color?.(masterSty.titleLine1Color);
                      if (masterSty?.titleLine2Color) props.setTitleLine2Color?.(masterSty.titleLine2Color);
                      if (masterGeo?.titleLine1) {
                        props.setTitleLine1?.(masterGeo.titleLine1);
                        props.setTopTitleText?.(masterGeo.titleLine1);
                      }
                      if (masterGeo?.titleLine2) props.setTitleLine2?.(masterGeo.titleLine2);
                    }
                  }}
                />
              )}

              {activeFloating === 'title' && (
                <TitleFloatingInspector
                  isOpen={true}
                  onClose={() => setActiveFloating('none')}
                  config={{
                    hasTopTitle,
                    titleLinesMode: gunlimboConfig?.titleLinesMode || titleLinesMode,
                    hasTitleBadge: gunlimboConfig?.hasTitleBadge ?? hasTitleBadge,
                    titleBadgeText: gunlimboConfig?.titleBadgeText || titleBadgeText,
                    titleBadgeBg: gunlimboConfig?.titleBadgeBg || titleBadgeBg,
                    titleBadgeColor: gunlimboConfig?.titleBadgeColor || titleBadgeColor,
                    titleBadgeSizePx: gunlimboConfig?.titleBadgeSizePx || titleBadgeSizePx,
                    hasTitleLine1,
                    titleLine1: gunlimboConfig?.titleLine1 || titleLine1,
                    titleLine1SizePx: gunlimboConfig?.titleLine1FontSize || gunlimboConfig?.titleFontSize || titleLine1SizePx,
                    titleLine1Color: gunlimboConfig?.titleLine1Color || titleLine1Color,
                    hasTitleLine2: gunlimboConfig?.hasTitleLine2 ?? hasTitleLine2,
                    titleLine2: gunlimboConfig?.titleLine2 || titleLine2,
                    titleLine2SizePx: gunlimboConfig?.titleLine2FontSize || gunlimboConfig?.titleFontSize || titleLine2SizePx,
                    titleLine2Color: gunlimboConfig?.titleLine2Color || titleLine2Color,
                    titleFontFamily: gunlimboConfig?.titleFont || titleFontFamily,
                    titleBold: gunlimboConfig?.titleBold ?? (props.titleBold ?? true),
                    titleItalic: gunlimboConfig?.titleItalic ?? (props.titleItalic ?? false),
                    titleAlign: gunlimboConfig?.titleAlign || (props.titleAlign ?? 'center'),
                    titleLine1FontFamily: gunlimboConfig?.titleLine1Font || titleLine1FontFamily || titleFontFamily,
                    titleLine1Bold: gunlimboConfig?.titleLine1Bold ?? titleLine1Bold ?? (props.titleBold ?? true),
                    titleLine1Italic: gunlimboConfig?.titleLine1Italic ?? titleLine1Italic ?? (props.titleItalic ?? false),
                    titleLine1LetterSpacing: gunlimboConfig?.titleLine1LetterSpacing !== undefined ? gunlimboConfig.titleLine1LetterSpacing : (titleLine1LetterSpacing ?? -0.5),
                    titleLine1LineHeight: gunlimboConfig?.titleLineHeight ?? titleLineHeight ?? 1.2,
                    titleLine2FontFamily: gunlimboConfig?.titleLine2Font || titleLine2FontFamily || titleFontFamily,
                    titleLine2Bold: gunlimboConfig?.titleLine2Bold ?? titleLine2Bold ?? (props.titleBold ?? true),
                    titleLine2Italic: gunlimboConfig?.titleLine2Italic ?? titleLine2Italic ?? (props.titleItalic ?? false),
                    titleLine2Align: gunlimboConfig?.titleLine2Align || titleLine2Align || (props.titleAlign ?? 'center'),
                    titleLine2LetterSpacing: gunlimboConfig?.titleLine2LetterSpacing !== undefined ? gunlimboConfig.titleLine2LetterSpacing : (titleLine2LetterSpacing ?? -0.5),
                    titleLine2LineHeight: gunlimboConfig?.titleLineHeight ?? titleLineHeight ?? 1.2,
                    titleLetterSpacing: gunlimboConfig?.titleLetterSpacing ?? titleLetterSpacing ?? -0.5,
                    titleLineHeight: gunlimboConfig?.titleLineHeight ?? titleLineHeight ?? 1.2,
                    titleStroke,
                    titleStrokeWidth,
                    titleStrokeColor,
                    titleShadow,
                    titleShadowBlur,
                    titleShadowColor,
                    titleBgMode: (titleBgMode as any) || 'none',
                    titleBgColor,
                    titlePaddingX,
                    titleBorderRadius,
                  }}
                  onChange={(patch) => {
                    if (patch.hasTopTitle !== undefined && props.setHasTopTitle) props.setHasTopTitle(patch.hasTopTitle);
                    if (patch.titleLinesMode !== undefined) {
                      props.setTitleLinesMode?.(patch.titleLinesMode);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLinesMode: patch.titleLinesMode }));
                    }
                    if (patch.hasTitleBadge !== undefined) {
                      props.setHasTitleBadge?.(patch.hasTitleBadge);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, hasTitleBadge: patch.hasTitleBadge }));
                    }
                    if (patch.titleBadgeText !== undefined) {
                      props.setTitleBadgeText?.(patch.titleBadgeText);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleBadgeText: patch.titleBadgeText }));
                    }
                    if (patch.titleBadgeBg !== undefined) {
                      props.setTitleBadgeBg?.(patch.titleBadgeBg);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleBadgeBg: patch.titleBadgeBg }));
                    }
                    if (patch.titleBadgeColor !== undefined) {
                      props.setTitleBadgeColor?.(patch.titleBadgeColor);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleBadgeColor: patch.titleBadgeColor }));
                    }
                    if (patch.titleBadgeSizePx !== undefined) {
                      props.setTitleBadgeSizePx?.(patch.titleBadgeSizePx);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleBadgeSizePx: patch.titleBadgeSizePx }));
                    }
                    if (patch.hasTitleLine1 !== undefined && props.setHasTitleLine1) props.setHasTitleLine1(patch.hasTitleLine1);
                    if (patch.titleLine1 !== undefined) {
                      props.setTitleLine1?.(patch.titleLine1);
                      props.setTopTitleText?.(patch.titleLine1);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1: patch.titleLine1 }));
                    }
                    if (patch.titleLine1SizePx !== undefined && props.setTitleLine1SizePx) {
                      props.setTitleLine1SizePx(patch.titleLine1SizePx);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1FontSize: patch.titleLine1SizePx, titleFontSize: patch.titleLine1SizePx }));
                    }
                    if (patch.titleLine1Color !== undefined) {
                      props.setTitleLine1Color?.(patch.titleLine1Color);
                      props.setTopTitleColor?.(patch.titleLine1Color);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1Color: patch.titleLine1Color }));
                    }
                    if (patch.hasTitleLine2 !== undefined) {
                      props.setHasTitleLine2?.(patch.hasTitleLine2);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, hasTitleLine2: patch.hasTitleLine2 }));
                    }
                    if (patch.titleLine2 !== undefined && props.setTitleLine2) {
                      props.setTitleLine2(patch.titleLine2);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine2: patch.titleLine2 }));
                    }
                    if (patch.titleLine2SizePx !== undefined && props.setTitleLine2SizePx) {
                      props.setTitleLine2SizePx(patch.titleLine2SizePx);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine2FontSize: patch.titleLine2SizePx }));
                    }
                    if (patch.titleLine2Color !== undefined && props.setTitleLine2Color) {
                      props.setTitleLine2Color(patch.titleLine2Color);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine2Color: patch.titleLine2Color }));
                    }
                    if (patch.titleFontFamily !== undefined && props.setTitleFontFamily) {
                      props.setTitleFontFamily(patch.titleFontFamily);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleFont: patch.titleFontFamily }));
                    }
                    if (patch.titleBold !== undefined && props.setTitleBold) {
                      props.setTitleBold(patch.titleBold);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleBold: patch.titleBold }));
                    }
                    if (patch.titleItalic !== undefined && props.setTitleItalic) {
                      props.setTitleItalic(patch.titleItalic);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleItalic: patch.titleItalic }));
                    }
                    if (patch.titleAlign !== undefined && props.setTitleAlign) {
                      props.setTitleAlign(patch.titleAlign);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleAlign: patch.titleAlign }));
                    }
                    if (patch.titleLine1FontFamily !== undefined) {
                      props.setTitleLine1FontFamily?.(patch.titleLine1FontFamily);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1Font: patch.titleLine1FontFamily }));
                    }
                    if (patch.titleLine1Bold !== undefined) {
                      props.setTitleLine1Bold?.(patch.titleLine1Bold);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1Bold: patch.titleLine1Bold }));
                    }
                    if (patch.titleLine1Italic !== undefined) {
                      props.setTitleLine1Italic?.(patch.titleLine1Italic);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1Italic: patch.titleLine1Italic }));
                    }
                    if (patch.titleLine1Align !== undefined) {
                      props.setTitleLine1Align?.(patch.titleLine1Align);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1Align: patch.titleLine1Align }));
                    }
                    if (patch.titleLine1LetterSpacing !== undefined) {
                      props.setTitleLine1LetterSpacing?.(patch.titleLine1LetterSpacing);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1LetterSpacing: patch.titleLine1LetterSpacing }));
                    }
                    if (patch.titleLine1LineHeight !== undefined) {
                      props.setTitleLine1LineHeight?.(patch.titleLine1LineHeight);
                      props.setTitleLineHeight?.(patch.titleLine1LineHeight);
                      props.setTitleLine2LineHeight?.(patch.titleLine1LineHeight);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine1LineHeight: patch.titleLine1LineHeight, titleLineHeight: patch.titleLine1LineHeight, titleLine2LineHeight: patch.titleLine1LineHeight }));
                    }
                    if (patch.titleLine2FontFamily !== undefined) {
                      props.setTitleLine2FontFamily?.(patch.titleLine2FontFamily);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine2Font: patch.titleLine2FontFamily }));
                    }
                    if (patch.titleLine2Bold !== undefined) {
                      props.setTitleLine2Bold?.(patch.titleLine2Bold);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine2Bold: patch.titleLine2Bold }));
                    }
                    if (patch.titleLine2Italic !== undefined) {
                      props.setTitleLine2Italic?.(patch.titleLine2Italic);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine2Italic: patch.titleLine2Italic }));
                    }
                    if (patch.titleLine2Align !== undefined) {
                      props.setTitleLine2Align?.(patch.titleLine2Align);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine2Align: patch.titleLine2Align }));
                    }
                    if (patch.titleLine2LetterSpacing !== undefined) {
                      props.setTitleLine2LetterSpacing?.(patch.titleLine2LetterSpacing);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine2LetterSpacing: patch.titleLine2LetterSpacing }));
                    }
                    if (patch.titleLine2LineHeight !== undefined) {
                      props.setTitleLine2LineHeight?.(patch.titleLine2LineHeight);
                      props.setTitleLineHeight?.(patch.titleLine2LineHeight);
                      props.setTitleLine1LineHeight?.(patch.titleLine2LineHeight);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLine2LineHeight: patch.titleLine2LineHeight, titleLineHeight: patch.titleLine2LineHeight, titleLine1LineHeight: patch.titleLine2LineHeight }));
                    }
                    if (patch.titleLetterSpacing !== undefined) {
                      props.setTitleLetterSpacing?.(patch.titleLetterSpacing);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLetterSpacing: patch.titleLetterSpacing }));
                    }
                    if (patch.titleLineHeight !== undefined) {
                      props.setTitleLineHeight?.(patch.titleLineHeight);
                      props.setTitleLine1LineHeight?.(patch.titleLineHeight);
                      props.setTitleLine2LineHeight?.(patch.titleLineHeight);
                      props.setGunlimboConfig?.((prev: any) => ({ ...prev, titleLineHeight: patch.titleLineHeight, titleLine1LineHeight: patch.titleLineHeight, titleLine2LineHeight: patch.titleLineHeight }));
                    }
                    if (patch.titleStroke !== undefined && props.setTitleStroke) props.setTitleStroke(patch.titleStroke);
                    if (patch.titleStrokeWidth !== undefined && props.setTitleStrokeWidth) props.setTitleStrokeWidth(patch.titleStrokeWidth);
                    if (patch.titleStrokeColor !== undefined && props.setTitleStrokeColor) props.setTitleStrokeColor(patch.titleStrokeColor);
                    if (patch.titleShadow !== undefined && props.setTitleShadow) props.setTitleShadow(patch.titleShadow);
                    if (patch.titleShadowBlur !== undefined && props.setTitleShadowBlur) props.setTitleShadowBlur(patch.titleShadowBlur);
                    if (patch.titleShadowColor !== undefined && props.setTitleShadowColor) props.setTitleShadowColor(patch.titleShadowColor);
                    if (patch.titleBgMode !== undefined && props.setTitleBgMode) props.setTitleBgMode(patch.titleBgMode);
                    if (patch.titleBgColor !== undefined && props.setTitleBgColor) props.setTitleBgColor(patch.titleBgColor);
                    if (patch.titlePaddingX !== undefined && props.setTitlePaddingX) props.setTitlePaddingX(patch.titlePaddingX);
                    if (patch.titleBorderRadius !== undefined && props.setTitleBorderRadius) props.setTitleBorderRadius(patch.titleBorderRadius);
                  }}
                  onReset={() => {
                    if (masterGeo?.titleLine1) {
                      props.setTitleLine1?.(masterGeo.titleLine1);
                      props.setTopTitleText?.(masterGeo.titleLine1);
                    }
                    if (masterGeo?.titleLine2) props.setTitleLine2?.(masterGeo.titleLine2);
                    if (masterSty?.titleFont) props.setTitleFontFamily?.(masterSty.titleFont);
                    if (masterSty?.titleLine1Color) props.setTitleLine1Color?.(masterSty.titleLine1Color);
                    if (masterSty?.titleLine2Color) props.setTitleLine2Color?.(masterSty.titleLine2Color);
                    if (masterSty?.titleFontSize) props.setTitleLine1SizePx?.(masterSty.titleFontSize);
                    if (masterSty?.titleLine2FontSize) props.setTitleLine2SizePx?.(masterSty.titleLine2FontSize);
                    if (masterSty?.titleStroke !== undefined) props.setTitleStroke?.(masterSty.titleStroke);
                    if (masterSty?.titleStrokeWidth !== undefined) props.setTitleStrokeWidth?.(masterSty.titleStrokeWidth);
                    if (masterSty?.titleStrokeColor) props.setTitleStrokeColor?.(masterSty.titleStrokeColor);
                    if (masterSty?.titleShadow !== undefined) props.setTitleShadow?.(masterSty.titleShadow);
                    if (masterSty?.titleShadowBlur !== undefined) props.setTitleShadowBlur?.(masterSty.titleShadowBlur);
                    if (masterSty?.titleShadowColor) props.setTitleShadowColor?.(masterSty.titleShadowColor);
                    if (masterSty?.titleBgMode) props.setTitleBgMode?.(masterSty.titleBgMode);
                    if (masterSty?.titleBgColor) props.setTitleBgColor?.(masterSty.titleBgColor);
                    if (masterSty?.titleBorderRadius !== undefined) props.setTitleBorderRadius?.(masterSty.titleBorderRadius);
                    if (masterSty?.titleBadgeText) props.setTitleBadgeText?.(masterSty.titleBadgeText);
                    if (masterSty?.titleBadgeColor) props.setTitleBadgeColor?.(masterSty.titleBadgeColor);
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
                    const targetMeta = masterSsulCfg?.metadata || {
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
                    };
                    props.setSsulConfig?.((prev: any) => ({
                      ...prev,
                      metadata: { ...targetMeta },
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
                    const targetDiv = masterSsulCfg?.divider || {
                      enabled: true,
                      style: 'solid',
                      thickness: 1,
                      widthPercent: 100,
                      color: '#E5E7EB',
                      opacity: 100,
                      offsetY: 0,
                    };
                    props.setSsulConfig?.((prev: any) => ({
                      ...prev,
                      divider: { ...targetDiv },
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
                    const targetSub = masterSsulCfg?.ssulSubtitle || {
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
                      shadowColor: '#000000',
                      shadowBlur: 4,
                      boxEnabled: false,
                      boxColor: '#F3F4F6',
                      boxRadius: 4,
                    };
                    props.setSsulConfig?.((prev: any) => ({
                      ...prev,
                      ssulSubtitle: { ...targetSub },
                    }));
                  }}
                />
              )}

              {activeFloating === 'subtitle' && (
                <SubtitleFloatingInspector
                  isOpen={true}
                  onClose={() => setActiveFloating('none')}
                  config={subCfg || props.subtitleConfig || {}}
                  onChange={(patch) => {
                    props.setSubtitleConfig?.((prev: any) => ({ ...(prev || {}), ...patch }));
                    if (layoutTemplateMode === 'instagram') {
                      if (patch.textColor || (patch as any).fillColor || (patch as any).color) {
                        props.setInstaConfig?.((prev: any) => ({
                          ...prev,
                          subColor: patch.textColor || (patch as any).fillColor || (patch as any).color,
                        }));
                      }
                      if (patch.fontFamily || (patch as any).font) {
                        props.setInstaConfig?.((prev: any) => ({
                          ...prev,
                          subFont: patch.fontFamily || (patch as any).font,
                        }));
                      }
                    }
                  }}
                  onReset={() => {
                    const defaultSub = masterSty?.subtitle || {
                      fontFamily: 'Pretendard',
                      textColor: '#FFFFFF',
                      fontSize: 20,
                      outlineSize: 4,
                      outlineColor: '#000000',
                      shadowSize: 3,
                      shadowColor: '#000000',
                      useBox: false,
                      boxColor: '#000000',
                      splitLimit: 14,
                    };
                    props.setSubtitleConfig?.((prev: any) => ({ ...(prev || {}), ...defaultSub }));
                    props.setSubtitleStrokeEnabled?.(defaultSub.outlineSize > 0);
                    props.setSubtitleStrokeWidth?.(defaultSub.outlineSize || 4);
                    props.setSubtitleStrokeColor?.(defaultSub.outlineColor || '#000000');
                    props.setSubtitleShadowEnabled?.(defaultSub.shadowSize > 0);
                    props.setSubtitleShadowBlur?.(defaultSub.shadowSize || 6);
                    props.setSubtitleShadowColor?.(defaultSub.shadowColor || '#000000');
                    props.setSubtitleUseBox?.(defaultSub.useBox || false);
                    props.setSubtitleBoxColor?.(defaultSub.boxColor || '#000000');
                    props.setSubtitleBorderRadius?.(4);
                    props.setSubtitleMaxChars?.(defaultSub.splitLimit || 14);
                  }}
                  subtitleStrokeEnabled={props.subtitleStrokeEnabled}
                  setSubtitleStrokeEnabled={props.setSubtitleStrokeEnabled}
                  subtitleStrokeWidth={props.subtitleStrokeWidth}
                  setSubtitleStrokeWidth={props.setSubtitleStrokeWidth}
                  subtitleStrokeColor={props.subtitleStrokeColor}
                  setSubtitleStrokeColor={props.setSubtitleStrokeColor}
                  subtitleShadowEnabled={props.subtitleShadowEnabled}
                  setSubtitleShadowEnabled={props.setSubtitleShadowEnabled}
                  subtitleShadowBlur={props.subtitleShadowBlur}
                  setSubtitleShadowBlur={props.setSubtitleShadowBlur}
                  subtitleShadowColor={props.subtitleShadowColor}
                  setSubtitleShadowColor={props.setSubtitleShadowColor}
                  subtitleUseBox={props.subtitleUseBox}
                  setSubtitleUseBox={props.setSubtitleUseBox}
                  subtitleBoxColor={props.subtitleBoxColor}
                  setSubtitleBoxColor={props.setSubtitleBoxColor}
                  subtitleBorderRadius={props.subtitleBorderRadius}
                  setSubtitleBorderRadius={props.setSubtitleBorderRadius}
                  subtitleMaxChars={props.subtitleMaxChars}
                  setSubtitleMaxChars={props.setSubtitleMaxChars}
                  selectedSubtitlePresetId={props.selectedSubtitlePresetId}
                  setSelectedSubtitlePresetId={props.setSelectedSubtitlePresetId}
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
                    fontSize: props.titleBadgeSizePx || 11,
                    borderRadius: 4,
                    paddingX: 8,
                    paddingY: 2,
                    offsetX: 0,
                    offsetY: 0,
                  }}
                  onChange={(patch) => {
                    if (patch.enabled !== undefined && props.setHasTitleBadge) props.setHasTitleBadge(patch.enabled);
                    if (patch.text !== undefined && props.setTitleBadgeText) props.setTitleBadgeText(patch.text);
                    if (patch.bgColor !== undefined && props.setTitleBadgeBg) props.setTitleBadgeBg(patch.bgColor);
                    if (patch.textColor !== undefined && props.setTitleBadgeColor) props.setTitleBadgeColor(patch.textColor);
                    if (patch.fontSize !== undefined && props.setTitleBadgeSizePx) props.setTitleBadgeSizePx(patch.fontSize);
                  }}
                  onReset={() => {
                    props.setTitleBadgeText?.(masterGeo?.badgeTag?.text || 'HOT ISSUE');
                    props.setTitleBadgeBg?.(masterGeo?.badgeTag?.bgColor || '#EF4444');
                    props.setTitleBadgeColor?.(masterGeo?.badgeTag?.textColor || '#FFFFFF');
                    props.setTitleBadgeSizePx?.(11);
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
                    fontSize: props.jabFontSize ?? 13,
                    textColor: props.jabTextColor || '#000000',
                    font: jabFont || props.titleFontFamily || 'GmarketSans',
                    bold: jabBold ?? true,
                    italic: jabItalic ?? false,
                    align: jabAlign || 'center',
                    strokeEnabled: props.jabStroke ?? true,
                    strokeColor: props.jabStrokeColor || '#000000',
                    strokeWidth: props.jabStrokeWidth ?? 2,
                    shadowEnabled: props.jabShadow ?? true,
                    shadowColor: props.jabShadowColor || '#000000',
                    shadowBlur: props.jabShadowBlur ?? 8,
                    bgEnabled: props.jabBgEnabled ?? true,
                    bgColor: props.jabBgColor || '#FFE500',
                    borderRadius: props.jabBorderRadius ?? 4,
                    offsetX: 0,
                    offsetY: 0,
                  }}
                  onChange={(patch) => {
                    if (patch.enabled !== undefined && props.setHasJab) props.setHasJab(patch.enabled);
                    if (patch.text !== undefined && props.setJabText) props.setJabText(patch.text);
                    if (patch.tiltDeg !== undefined && props.setJabTiltDeg) props.setJabTiltDeg(patch.tiltDeg);
                    if (patch.fontSize !== undefined && props.setJabFontSize) props.setJabFontSize(patch.fontSize);
                    if (patch.textColor !== undefined && props.setJabTextColor) props.setJabTextColor(patch.textColor);
                    if (patch.font !== undefined && setJabFont) setJabFont(patch.font);
                    if (patch.bold !== undefined && setJabBold) setJabBold(patch.bold);
                    if (patch.italic !== undefined && setJabItalic) setJabItalic(patch.italic);
                    if (patch.align !== undefined && setJabAlign) setJabAlign(patch.align);
                    if (patch.bgColor !== undefined && props.setJabBgColor) props.setJabBgColor(patch.bgColor);
                    if (patch.strokeEnabled !== undefined && props.setJabStroke) props.setJabStroke(patch.strokeEnabled);
                    if (patch.strokeWidth !== undefined && props.setJabStrokeWidth) props.setJabStrokeWidth(patch.strokeWidth);
                    if (patch.strokeColor !== undefined && props.setJabStrokeColor) props.setJabStrokeColor(patch.strokeColor);
                    if (patch.shadowEnabled !== undefined && props.setJabShadow) props.setJabShadow(patch.shadowEnabled);
                    if (patch.shadowBlur !== undefined && props.setJabShadowBlur) props.setJabShadowBlur(patch.shadowBlur);
                    if (patch.shadowColor !== undefined && props.setJabShadowColor) props.setJabShadowColor(patch.shadowColor);
                    if (patch.bgEnabled !== undefined && props.setJabBgEnabled) props.setJabBgEnabled(patch.bgEnabled);
                    if (patch.borderRadius !== undefined && props.setJabBorderRadius) props.setJabBorderRadius(patch.borderRadius);
                  }}
                  onReset={() => {
                    const jh = masterGeo?.jabHook;
                    props.setJabText?.(jh?.text || masterGeo?.jabText || '마지막 반전 주의 ㄷㄷ');
                    props.setJabTiltDeg?.(jh?.tiltDeg ?? masterGeo?.jabTiltDeg ?? -3);
                    props.setJabBgColor?.(jh?.bgColor || masterGeo?.jabBgColor || '#FFE500');
                    props.setJabTextColor?.(jh?.textColor || masterGeo?.jabTextColor || '#000000');
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
                    headlineFont: props.gunlimboConfig?.titleFontFamily || props.titleFontFamily || 'Pretendard',
                    headlineBold: props.gunlimboConfig?.titleBold ?? true,
                    headlineItalic: props.gunlimboConfig?.titleItalic ?? false,
                    headlineAlign: props.gunlimboConfig?.titleAlign || 'center',
                    subheadlineText: props.gunlimboConfig?.hookPhrase || '1분 만에 밝혀진 진실',
                    subheadlineColor: props.gunlimboConfig?.hookTextColor || '#000000',
                    subheadlineFontSize: props.gunlimboConfig?.hookFontSize || 22,
                    subheadlineFont: props.gunlimboConfig?.hookFont || props.titleFontFamily || 'Pretendard',
                    subheadlineBold: props.gunlimboConfig?.hookBold ?? true,
                    subheadlineItalic: props.gunlimboConfig?.hookItalic ?? false,
                    subheadlineAlign: props.gunlimboConfig?.hookAlign || 'center',
                    headlineLetterSpacing: props.gunlimboConfig?.titleLetterSpacing ?? props.titleLetterSpacing ?? -0.5,
                    headlineLineHeight: props.gunlimboConfig?.titleLineHeight ?? props.titleLineHeight ?? 1.25,
                    subheadlineLetterSpacing: props.gunlimboConfig?.hookLetterSpacing ?? props.jabLetterSpacing ?? -0.5,
                    subheadlineLineHeight: props.gunlimboConfig?.hookLineHeight ?? props.jabLineHeight ?? 1.25,
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
                      titleFontFamily: patch.headlineFont !== undefined ? patch.headlineFont : prev.titleFontFamily,
                      titleBold: patch.headlineBold !== undefined ? patch.headlineBold : prev.titleBold,
                      titleItalic: patch.headlineItalic !== undefined ? patch.headlineItalic : prev.titleItalic,
                      titleAlign: patch.headlineAlign !== undefined ? patch.headlineAlign : prev.titleAlign,
                      titleLetterSpacing: patch.headlineLetterSpacing !== undefined ? patch.headlineLetterSpacing : prev.titleLetterSpacing,
                      titleLineHeight: patch.headlineLineHeight !== undefined ? patch.headlineLineHeight : prev.titleLineHeight,
                      hookPhrase: patch.subheadlineText !== undefined ? patch.subheadlineText : prev.hookPhrase,
                      hookBgColor: patch.bandColor !== undefined ? patch.bandColor : prev.hookBgColor,
                      hookTextColor: patch.subheadlineColor !== undefined ? patch.subheadlineColor : prev.hookTextColor,
                      hookFontSize: patch.subheadlineFontSize !== undefined ? patch.subheadlineFontSize : prev.hookFontSize,
                      hookFont: patch.subheadlineFont !== undefined ? patch.subheadlineFont : prev.hookFont,
                      hookBold: patch.subheadlineBold !== undefined ? patch.subheadlineBold : prev.hookBold,
                      hookItalic: patch.subheadlineItalic !== undefined ? patch.subheadlineItalic : prev.hookItalic,
                      hookAlign: patch.subheadlineAlign !== undefined ? patch.subheadlineAlign : prev.hookAlign,
                      hookLetterSpacing: patch.subheadlineLetterSpacing !== undefined ? patch.subheadlineLetterSpacing : prev.hookLetterSpacing,
                      hookLineHeight: patch.subheadlineLineHeight !== undefined ? patch.subheadlineLineHeight : prev.hookLineHeight,
                    }));
                  }}
                  onReset={() => {
                    const defaultHook = masterGunlimboCfg || {
                      titleLine1: masterGeo?.titleLine1 || '충격 실화 사건',
                      titleLine2: masterGeo?.titleLine2 || '상상도 못한 결말',
                      hookPhrase: '1분 만에 밝혀진 진실',
                      hookBgColor: '#FFFFFF',
                      hookTextColor: '#000000',
                    };
                    props.setGunlimboConfig?.((prev: any) => ({
                      ...prev,
                      ...defaultHook,
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
                    profileFont: props.instaConfig?.profileFont || 'Pretendard',
                    profileBold: props.instaConfig?.profileBold !== false,
                    profileItalic: props.instaConfig?.profileItalic ?? false,
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
                      profileFont: patch.profileFont !== undefined ? patch.profileFont : prev.profileFont,
                      profileBold: patch.profileBold !== undefined ? patch.profileBold : prev.profileBold,
                      profileItalic: patch.profileItalic !== undefined ? patch.profileItalic : prev.profileItalic,
                    }));
                  }}
                  onReset={() => {
                    const defaultProf = masterInstaCfg || {
                      profileName: '유머보따리',
                      profileHandle: '@humor_box',
                      isVerified: true,
                      profileFont: 'Pretendard',
                      profileBold: true,
                      profileItalic: false,
                    };
                    props.setInstaConfig?.((prev: any) => ({
                      ...prev,
                      ...defaultProf,
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
                    fontSize: props.bottomSourceSizePx || 10,
                    font: props.bottomSourceFontFamily || 'Pretendard',
                    bold: props.bottomSourceBold ?? false,
                    italic: props.bottomSourceItalic ?? false,
                    align: props.bottomSourceAlign || 'center',
                    bgEnabled: props.bottomSourceBg ?? false,
                    bgColor: props.bottomSourceBgColor || 'rgba(0,0,0,0.7)',
                    borderRadius: props.bottomSourceBorderRadius ?? 4,
                    strokeEnabled: props.bottomSourceStroke ?? false,
                    strokeColor: props.bottomSourceStrokeColor || '#000000',
                    strokeWidth: props.bottomSourceStrokeWidth ?? 1,
                    shadowEnabled: props.bottomSourceShadow ?? true,
                    shadowColor: props.bottomSourceShadowColor || 'rgba(0,0,0,0.9)',
                    shadowBlur: props.bottomSourceShadowBlur ?? 4,
                    offsetX: 0,
                    offsetY: 0,
                  }}
                  onChange={(patch) => {
                    if (patch.enabled !== undefined && props.setHasBottomSource) props.setHasBottomSource(patch.enabled);
                    if (patch.text !== undefined && props.setBottomSourceText) props.setBottomSourceText(patch.text);
                    if (patch.color !== undefined && props.setBottomSourceColor) props.setBottomSourceColor(patch.color);
                    if (patch.fontSize !== undefined && props.setBottomSourceSizePx) props.setBottomSourceSizePx(patch.fontSize);
                    if (patch.font !== undefined && props.setBottomSourceFontFamily) props.setBottomSourceFontFamily(patch.font);
                    if (patch.bold !== undefined && props.setBottomSourceBold) props.setBottomSourceBold(patch.bold);
                    if (patch.italic !== undefined && props.setBottomSourceItalic) props.setBottomSourceItalic(patch.italic);
                    if (patch.align !== undefined && props.setBottomSourceAlign) props.setBottomSourceAlign(patch.align);
                    if (patch.strokeEnabled !== undefined && props.setBottomSourceStroke) props.setBottomSourceStroke(patch.strokeEnabled);
                    if (patch.strokeWidth !== undefined && props.setBottomSourceStrokeWidth) props.setBottomSourceStrokeWidth(patch.strokeWidth);
                    if (patch.strokeColor !== undefined && props.setBottomSourceStrokeColor) props.setBottomSourceStrokeColor(patch.strokeColor);
                    if (patch.shadowEnabled !== undefined && props.setBottomSourceShadow) props.setBottomSourceShadow(patch.shadowEnabled);
                    if (patch.shadowBlur !== undefined && props.setBottomSourceShadowBlur) props.setBottomSourceShadowBlur(patch.shadowBlur);
                    if (patch.shadowColor !== undefined && props.setBottomSourceShadowColor) props.setBottomSourceShadowColor(patch.shadowColor);
                    if (patch.bgEnabled !== undefined && props.setBottomSourceBg) props.setBottomSourceBg(patch.bgEnabled);
                    if (patch.bgColor !== undefined && props.setBottomSourceBgColor) props.setBottomSourceBgColor(patch.bgColor);
                    if (patch.borderRadius !== undefined && props.setBottomSourceBorderRadius) props.setBottomSourceBorderRadius(patch.borderRadius);
                  }}
                  onReset={() => {
                    props.setBottomSourceText?.(masterGeo?.sourceZone?.defaultText || masterGeo?.bottomSourceText || '출처: YouTube @ViraLoop 공식 채널');
                    props.setBottomSourceColor?.(masterGeo?.sourceZone?.textColor || masterGeo?.bottomSourceColor || '#CBD5E1');
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
                    if (patch.hasTopBarBg !== undefined && props.setHasTopBarBg) props.setHasTopBarBg(patch.hasTopBarBg);
                    if (patch.topBarBg !== undefined && props.setTopBarBg) props.setTopBarBg(patch.topBarBg);
                    if (patch.topBarHeightPct !== undefined && props.setTopBarHeightPct) props.setTopBarHeightPct(patch.topBarHeightPct);
                    if (patch.topBarOpacity !== undefined && props.setTopBarOpacity) props.setTopBarOpacity(patch.topBarOpacity / 100);
                    if (patch.topBarRadius !== undefined && props.setTopBarRadius) props.setTopBarRadius(patch.topBarRadius);
                    if (patch.hasBottomBarBg !== undefined && props.setHasBottomBarBg) props.setHasBottomBarBg(patch.hasBottomBarBg);
                    if (patch.bottomBarBg !== undefined && props.setBottomBarBg) props.setBottomBarBg(patch.bottomBarBg);
                    if (patch.bottomBarHeightPct !== undefined && props.setBottomBarHeightPct) props.setBottomBarHeightPct(patch.bottomBarHeightPct);
                    if (patch.bottomBarOpacity !== undefined && props.setBottomBarOpacity) props.setBottomBarOpacity(patch.bottomBarOpacity / 100);
                    if (patch.bottomBarRadius !== undefined && props.setBottomBarRadius) props.setBottomBarRadius(patch.bottomBarRadius);
                  }}
                  onReset={() => {
                    const topH = masterGeo?.topTitleZone?.heightPct ?? masterGeo?.topBarHeightPct ?? 18.3;
                    const topB = masterGeo?.topTitleZone?.bgColor || masterGeo?.topBarBg || '#000000';
                    const botH = masterGeo?.bottomBarHeightPct ?? 6.0;
                    const botB = masterGeo?.bottomBarBg || '#000000';
                    props.setTopBarBg?.(topB);
                    props.setTopBarHeightPct?.(topH);
                    props.setTopBarOpacity?.(1.0);
                    props.setTopBarRadius?.(0);
                    props.setBottomBarBg?.(botB);
                    props.setBottomBarHeightPct?.(botH);
                    props.setBottomBarOpacity?.(1.0);
                    props.setBottomBarRadius?.(0);
                  }}
                />
              )}

              {activeFloating === 'commentCard' && (
                <CommentCardFloatingInspector
                  isOpen={true}
                  onClose={() => setActiveFloating('none')}
                  hasCommentCard={props.hasCommentCard ?? true}
                  setHasCommentCard={props.setHasCommentCard}
                  config={props.commentCard}
                  onChange={(patch) => {
                    props.setCommentCard?.((prev: any) => ({ ...prev, ...patch }));
                  }}
                  onReset={() => {
                    const defaultC = {
                      author: '알고리즘의노예',
                      handle: '@algo_slave',
                      text: '이거 보고 제 인생이 바뀌었습니다 ㄷㄷ',
                      likes: '1.4만',
                      theme: 'insta',
                      bgColor: '#FFFFFF',
                      textColor: '#18181B',
                      borderRadius: 16,
                      borderEnabled: true,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      cardShadowEnabled: true,
                      cardShadowBlur: 12,
                      cardShadowColor: 'rgba(0,0,0,0.06)',
                    };
                    props.setCommentCard?.((prev: any) => ({
                      ...prev,
                      ...defaultC,
                    }));
                  }}
                />
              )}

              {activeFloating === 'videoCrop' && (
                <VideoCropFloatingInspector
                  isOpen={true}
                  onClose={() => setActiveFloating('none')}
                  layoutTemplateMode={layoutTemplateMode}
                  instaConfig={instaConfig}
                  setInstaConfig={props.setInstaConfig}
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
                  onChange={(patch: any) => {
                    if (patch.fitMode !== undefined && (props as any).setVideoFitMode) (props as any).setVideoFitMode(patch.fitMode);
                    if (patch.blurBg !== undefined && (props as any).setVideoBlurBg) (props as any).setVideoBlurBg(patch.blurBg);
                    if (patch.zoomScale !== undefined && props.setVideoZoomScale) props.setVideoZoomScale(patch.zoomScale);
                    if (patch.focusXPct !== undefined && props.setVideoFocusXPct) props.setVideoFocusXPct(patch.focusXPct);
                    if (patch.focusYPct !== undefined && props.setVideoFocusYPct) props.setVideoFocusYPct(patch.focusYPct);
                    if (patch.rotationDeg !== undefined && props.setVideoRotationDeg) props.setVideoRotationDeg(patch.rotationDeg);
                    if (patch.horizontalFlip !== undefined && props.setVideoHorizontalFlip) props.setVideoHorizontalFlip(patch.horizontalFlip);
                  }}
                  onReset={() => {
                    const zoom = masterGeo?.mediaZone?.kenBurnsScaleEnd ? Math.round(masterGeo.mediaZone.kenBurnsScaleEnd * 100) : (masterGeo?.videoZoomScale ?? 100);
                    const focusY = masterGeo?.videoFocusYPct ?? 50;
                    props.setVideoZoomScale?.(zoom);
                    props.setVideoFocusXPct?.(50);
                    props.setVideoFocusYPct?.(focusY);
                    props.setVideoRotationDeg?.(0);
                  }}
                />
              )}
        </div>
        );
      })()}
    </div>
  );
};

export default UniversalCanvasStage;
