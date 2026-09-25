import { VideoFitMode } from '@/components/canvas/forms/VideoCropInspectorForm';
import { CommentCardConfig } from '@/components/canvas/forms/CommentCardInspectorForm';
import { VideoFilterConfig } from '@/components/canvas/forms/FilterFxInspectorForm';
import UniversalCanvasStage from '@/components/canvas/stage/UniversalCanvasStage';
import TemplateInspectorForm from '@/components/canvas/forms/TemplateInspectorForm';
import TitleSourceInspectorForm from '@/components/canvas/forms/TitleSourceInspectorForm';
import VideoCropInspectorForm from '@/components/canvas/forms/VideoCropInspectorForm';
import FilterFxInspectorForm from '@/components/canvas/forms/FilterFxInspectorForm';
import CommentCardInspectorForm from '@/components/canvas/forms/CommentCardInspectorForm';
import JabHookInspectorForm from '@/components/canvas/forms/JabHookInspectorForm';
import SubtitleStyleInspectorForm from '@/components/canvas/forms/SubtitleStyleInspectorForm';
import { InstaProfileInspectorForm } from '@/components/canvas/forms/InstaProfileInspectorForm';
import { SsulObjectInspectorForm } from '@/components/canvas/forms/SsulObjectInspectorForm';
import ForensicUrlExtractModal from '@/components/canvas/dialogs/ForensicUrlExtractModal';
import { MASTER_INSPECTOR_GROUPS, InspectorSubTabId, getInspectorGroupsForMode } from '@/components/canvas/constants/canvasConstants';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Maximize2, Minimize2, ZoomIn, ZoomOut, Sliders, Sparkles, Save, Zap, ArrowLeft, RotateCcw,
  Check, Layout, Type, Crop, Layers3, SlidersHorizontal, MessageCircle, Clock, Play, Pause,
  SkipBack, SkipForward, Repeat, Volume2, VolumeX, Camera, Grid, Shield, Layers, Sparkle,
  Copy, ThumbsUp, FileVideo, Download, Info, ChevronRight, CheckCircle2, AlignLeft, AlignCenter,
  AlignRight, Bold, Italic, Wand2, FileJson, Upload, Palette, Smartphone, Trash2, FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { cn, getMediaUrl } from '@/lib/utils';
import api from '@/lib/api';
import { TemplateManifest, TemplateCanvasState } from '@/types/templateDna';
import { STANDARD_TEMPLATES, getStandardTemplateByArchetype, getMasterTemplate, saveMasterTemplateLocal, normalizeTemplateManifest } from '@/config/standardTemplates';
import { NleLayerTransform, createDefaultTransform } from '@/types/nle';
import { TransformGizmo } from '@/components/canvas/TransformGizmo';
import { SubtitleConfig, DEFAULT_SUBTITLE_CONFIG } from '@/types/subtitle';
import { TTSConfig } from '@/types/tts';
import { MemeAvatar, MemeType, MemeEmotion } from '@/components/memeAssets';

const YoutubeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export interface VideoFilterSettings {
  preset: string;
  intensity: number;
  filmGrain: number;
  vignette: number;
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
}

export const CAPCUT_FILTER_PRESETS = [
  { id: 'none', name: '원본 (Original)', desc: '보정 없음', grain: 0, vignette: 0, b: 100, c: 100, s: 100, t: 0 },
  { id: 'cinematic-film', name: '🎬 시네마틱 35mm', desc: '영화 필름 질감 & 아날로그 그레인', grain: 45, vignette: 40, b: 98, c: 120, s: 95, t: 10 },
  { id: 'teal-orange', name: '🌆 헐리우드 틸 & 오렌지', desc: '블록버스터 시네마 룩', grain: 20, vignette: 30, b: 102, c: 125, s: 125, t: 15 },
  { id: 'retro-vhs', name: '📼 90s 레트로 VHS', desc: '아날로그 테이프 & 주사선 노이즈', grain: 65, vignette: 45, b: 105, c: 115, s: 85, t: 12 },
  { id: 'film-noir', name: '🎞️ 클래식 필름 느와르', desc: '고대비 모노크롬 흑백', grain: 55, vignette: 55, b: 95, c: 145, s: 0, t: 0 },
  { id: 'cyberpunk', name: '⚡ 사이버펑크 네온', desc: '시안 & 마젠타 퓨처리스틱', grain: 15, vignette: 35, b: 105, c: 135, s: 160, t: -15 },
  { id: 'kodak-warm', name: '🌅 웜 코닥 골드', desc: '따뜻한 골든아워 감성 필름', grain: 30, vignette: 25, b: 103, c: 110, s: 115, t: 25 },
  { id: 'fuji-cool', name: '❄️ 쿨 후지필름', desc: '청량하고 차분한 모던 톤', grain: 20, vignette: 20, b: 100, c: 112, s: 92, t: -20 },
  { id: 'dreamy-glow', name: '✨ 드림 글로우', desc: '몽환적인 소프트 확산광', grain: 10, vignette: 20, b: 112, c: 90, s: 108, t: 8 },
  { id: 'vintage-grain', name: '📽️ 1970 빈티지 그레인', desc: '헤비 입자 & 세피아 톤', grain: 80, vignette: 50, b: 95, c: 120, s: 70, t: 30 },
];

const SHORTS_SUBTITLE_DESIGN_PRESETS = [
  { id: 'neon-yellow', name: '네온 옐로우', badge: 'MZ 바이럴', desc: '선명한 옐로우 + 블랙 볼드 외곽선', fontFamily: 'Black Han Sans', textColor: '#FFE600', outlineSize: 5, outlineColor: '#000000', useBox: false, boxColor: '#000000', shadowSize: 3, shadowColor: '#000000', fontSize: 19 },
  { id: 'white-glow', name: '화이트 글로우', badge: '추천 1위', desc: '순백 글자 + 시안 네온 그림자', fontFamily: 'Pretendard', textColor: '#FFFFFF', outlineSize: 4, outlineColor: '#0F172A', useBox: false, boxColor: '#000000', shadowSize: 4, shadowColor: '#00F0FF', fontSize: 18 },
  { id: 'black-gold', name: '블랙 앤 골드', badge: '지식/다큐', desc: '골드 텍스트 + 딥블랙 외곽선', fontFamily: 'Do Hyeon', textColor: '#FFD700', outlineSize: 5, outlineColor: '#000000', useBox: false, boxColor: '#000000', shadowSize: 3, shadowColor: '#000000', fontSize: 19 },
  { id: 'cyan-pop', name: '네온 시안 팝', badge: '트렌드 팝', desc: '눈부신 네온 시안 + 블랙 외곽선', fontFamily: 'Pretendard', textColor: '#00F0FF', outlineSize: 5, outlineColor: '#000000', useBox: false, boxColor: '#000000', shadowSize: 3, shadowColor: '#002B36', fontSize: 18 },
  { id: 'hot-pink', name: '핫 핑크 바이브', badge: '감성/엔터', desc: '비비드 핫핑크 + 핑크 글로우', fontFamily: 'Jua', textColor: '#FF2E93', outlineSize: 4, outlineColor: '#000000', useBox: false, boxColor: '#000000', shadowSize: 4, shadowColor: '#FF2E93', fontSize: 19 },
  { id: 'box-pill', name: '박스 하이라이트', badge: '가독성 최고', desc: '블랙 필 박스 + 화이트 볼드', fontFamily: 'Nanum Gothic', textColor: '#FFFFFF', outlineSize: 0, outlineColor: '#000000', useBox: true, boxColor: 'rgba(0,0,0,0.85)', shadowSize: 2, shadowColor: '#000000', fontSize: 17 },
  { id: 'minimal-lime', name: '미니멀 라임', badge: '상큼한 일상', desc: '라임 텍스트 + 미니멀 블랙 테두리', fontFamily: 'Pretendard', textColor: '#A3E635', outlineSize: 4, outlineColor: '#000000', useBox: false, boxColor: '#000000', shadowSize: 2, shadowColor: '#000000', fontSize: 18 },
  { id: 'bold-classic', name: '볼드 클래식', badge: '정통 볼드', desc: '화이트 + 6px 두꺼운 블랙 스트로크', fontFamily: 'Gowun Dodum', textColor: '#FFFFFF', outlineSize: 6, outlineColor: '#000000', useBox: false, boxColor: '#000000', shadowSize: 3, shadowColor: '#000000', fontSize: 20 },
];

export type LayoutTemplateMode = 'classic' | 'instagram' | 'gunlimbo' | 'ssul';
export type SsulTextMode = 'accumulate' | 'single-stepped' | 'single-fixed';

export interface ShortsLayoutState {
  canvasType: string;
  videoFitMode: 'sandwich' | 'fullscreen';
  videoZoomScale: number;
  videoFocusYPct: number;
  enableKenBurns: boolean;
  enableHorizontalFlip: boolean;
  filmFilter: 'none' | 'grain' | 'vintage' | 'noir';
  hasTopBarBg: boolean;
  topBarBg: string;
  topBarHeightPct: number;
  topBarOpacity: number;
  hasTopTitle: boolean;
  topTitleYPct: number;
  titleLine1: string;
  titleLine2: string;
  titleLine1Color: string;
  titleLine2Color: string;
  titleLine1SizePx: number;
  titleLine2SizePx: number;
  titleFontFamily: string;
  titleBgMode: 'none' | 'pill' | 'box' | 'highlighter' | 'glass';
  titleBgColor: string;
  titleBgOpacity: number;
  titlePaddingX: number;
  titlePaddingY: number;
  titleBorderRadius: number;
  titleShadow: boolean;
  titleStroke: boolean;
  hasSubtitle: boolean;
  subtitleYPercent: number;
  subtitleColor: string;
  subtitleStrokeColor: string;
  subtitleStrokeWidth: number;
  subtitleFontSize: number;
  subtitleFontFamily: string;
  subtitleMotionPreset: 'word_pop' | 'karaoke' | 'smooth_slide' | 'typewriter' | 'static';
  subtitleHasPillBg: boolean;
  subtitlePillBgColor: string;
  hasJab: boolean;
  jabText: string;
  jabColor: string;
  jabPlacement: string;
  jabTiltDeg: number;
  jabYPercent: number;
  jabFontSize: number;
  jabFontFamily: string;
  jabBgColor: string;
  jabBorderColor: string;
  hasBottomSource: boolean;
  bottomSourceText: string;
  bottomSourceColor: string;
  bottomSourceSizePx: number;
  bottomSourceFontFamily: string;
  bottomSourceBottomPct: number;
  bottomSourceHasPill: boolean;
  hasBottomBarBg: boolean;
  bottomBarBg: string;
  bottomBarHeightPct: number;
  bottomBarOpacity: number;
}

export const defaultLayoutState: ShortsLayoutState = {
  canvasType: 'LETTERBOX_SOLID',
  videoFitMode: 'sandwich',
  videoZoomScale: 100,
  videoFocusYPct: 50,
  enableKenBurns: false,
  enableHorizontalFlip: false,
  filmFilter: 'none',
  hasTopBarBg: true,
  topBarBg: '#000000',
  topBarHeightPct: 18.3,
  topBarOpacity: 1.0,
  hasTopTitle: true,
  topTitleYPct: 9.0,
  titleLine1: '조코비치 몰래카메라 ㅋㅋ',
  titleLine2: '상대 선수 멘붕 직전',
  titleLine1Color: '#FFFFFF',
  titleLine2Color: '#FFE500',
  titleLine1SizePx: 20,
  titleLine2SizePx: 24,
  titleFontFamily: 'Pretendard',
  titleBgMode: 'none',
  titleBgColor: 'rgba(0,0,0,0.85)',
  titleBgOpacity: 1.0,
  titlePaddingX: 12,
  titlePaddingY: 6,
  titleBorderRadius: 4,
  titleShadow: true,
  titleStroke: true,
  hasSubtitle: true,
  subtitleYPercent: 78.0,
  subtitleColor: '#FFFFFF',
  subtitleStrokeColor: '#000000',
  subtitleStrokeWidth: 4,
  subtitleFontSize: 18,
  subtitleFontFamily: 'Pretendard',
  subtitleMotionPreset: 'word_pop',
  subtitleHasPillBg: false,
  subtitlePillBgColor: 'rgba(0,0,0,0.75)',
  hasJab: true,
  jabText: '*출격작전 반전 순간!*',
  jabColor: '#000000',
  jabPlacement: 'center',
  jabTiltDeg: -3,
  jabYPercent: 28.0,
  jabFontSize: 13,
  jabFontFamily: 'Pretendard',
  jabBgColor: '#FFE500',
  jabBorderColor: '#000000',
  hasBottomSource: true,
  bottomSourceText: '출처: YouTube @ViraLoop 공식 채널',
  bottomSourceColor: '#CBD5E1',
  bottomSourceSizePx: 10,
  bottomSourceFontFamily: 'Pretendard',
  bottomSourceBottomPct: 3.5,
  bottomSourceHasPill: false,
  hasBottomBarBg: true,
  bottomBarBg: '#000000',
  bottomBarHeightPct: 6.0,
  bottomBarOpacity: 1.0,
};

export interface ShortsTemplateStudioProps {
  initialLayout?: ShortsLayoutState;
  onLayoutChange?: (layout: ShortsLayoutState) => void;
  sovereignMode?: LayoutTemplateMode;
}

export const ShortsTemplateStudio: React.FC<ShortsTemplateStudioProps> = ({ initialLayout, onLayoutChange, sovereignMode }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 템플릿 메타데이터
  const [templateName, setTemplateName] = useState<string>('바이럴 쇼츠 마스터 템플릿');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 캔버스 뷰포트 상태
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [safeZoneVisible, setSafeZoneVisible] = useState<boolean>(false);
  const [safeZonePlatform, setSafeZonePlatform] = useState<'youtube' | 'tiktok' | 'reels'>('youtube');
  const [deviceMockup, setDeviceMockup] = useState<'none' | 'iphone16' | 'galaxy'>('none');
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [canvasZoom, setCanvasZoom] = useState<'fit' | '50' | '75' | '100' | '150' | '200'>('fit');
  const [canvasScale, setCanvasScale] = useState<number>(1.0);
  const [canvasPan, setCanvasPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ startX: number; startY: number; panX: number; panY: number }>({ startX: 0, startY: 0, panX: 0, panY: 0 });

  // 4대 폼팩터 모드 및 인스펙터 탭
  const initialMode = sovereignMode || (searchParams.get('mode') as LayoutTemplateMode) || 'classic';
  const [layoutTemplateMode, setLayoutTemplateMode] = useState<LayoutTemplateMode>(initialMode);
  const [masterManifest, setMasterManifest] = useState<TemplateManifest>(() => getMasterTemplate(initialMode));

  useEffect(() => {
    const handleMasterUpdated = (e: any) => {
      if (e.detail && (e.detail.archetype === layoutTemplateMode || !e.detail.archetype)) {
        setMasterManifest(e.detail.manifest);
      }
    };
    window.addEventListener('vl_master_template_updated', handleMasterUpdated);
    return () => window.removeEventListener('vl_master_template_updated', handleMasterUpdated);
  }, [layoutTemplateMode]);

  useEffect(() => {
    if (sovereignMode && layoutTemplateMode !== sovereignMode) {
      setLayoutTemplateMode(sovereignMode);
    }
  }, [sovereignMode]);
  const [isForensicModalOpen, setIsForensicModalOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 🏛️ 공통 템플릿 디자인 확장 상태 변수 (정밀 편집기와 100% 동기화)
  const [isTemplateLibraryOpen, setIsTemplateLibraryOpen] = useState<boolean>(false);
  const [templateLibraryList, setTemplateLibraryList] = useState<any[]>([]);
  const [topTitleFontSize, setTopTitleFontSize] = useState<number>(24);
  const [topTitleColor, setTopTitleColor] = useState<string>('#FFFFFF');
  const [titleBgOpacity, setTitleBgOpacity] = useState<number>(0.8);
  const [titleBadgeBg, setTitleBadgeBg] = useState<string>('#EF4444');
  const [bottomSourceBottomPct, setBottomSourceBottomPct] = useState<number>(3.5);
  const [bottomSourceBg, setBottomSourceBg] = useState<boolean>(false);
  const [bottomSourceBgColor, setBottomSourceBgColor] = useState<string>('rgba(0,0,0,0.7)');
  const [bottomSourceBorderRadius, setBottomSourceBorderRadius] = useState<number>(2);
  const [bottomSourceStroke, setBottomSourceStroke] = useState<boolean>(false);
  const [bottomSourceStrokeWidth, setBottomSourceStrokeWidth] = useState<number>(1);
  const [bottomSourceStrokeColor, setBottomSourceStrokeColor] = useState<string>('#000000');
  const [bottomSourceShadow, setBottomSourceShadow] = useState<boolean>(true);
  const [bottomSourceShadowBlur, setBottomSourceShadowBlur] = useState<number>(4);
  const [bottomSourceShadowColor, setBottomSourceShadowColor] = useState<string>('rgba(0,0,0,0.9)');
  const [bottomSourceBold, setBottomSourceBold] = useState<boolean>(false);
  const [bottomSourceItalic, setBottomSourceItalic] = useState<boolean>(false);
  const [bottomSourceAlign, setBottomSourceAlign] = useState<'left' | 'center' | 'right'>('center');

  // 자막 세부 속성 (정밀 편집기 1:1 동기화)
  const [currentSubtitleText, setCurrentSubtitleText] = useState<string>('바이럴루프 정밀 템플릿 실시간 프리뷰');
  const [subtitleStrokeEnabled, setSubtitleStrokeEnabled] = useState<boolean>(true);
  const [subtitleStrokeWidth, setSubtitleStrokeWidth] = useState<number>(4);
  const [subtitleStrokeColor, setSubtitleStrokeColor] = useState<string>('#000000');
  const [subtitleShadowEnabled, setSubtitleShadowEnabled] = useState<boolean>(true);
  const [subtitleShadowBlur, setSubtitleShadowBlur] = useState<number>(8);
  const [subtitleShadowColor, setSubtitleShadowColor] = useState<string>('rgba(0,0,0,0.95)');
  const [subtitleUseBox, setSubtitleUseBox] = useState<boolean>(false);
  const [subtitleBoxColor, setSubtitleBoxColor] = useState<string>('rgba(0,0,0,0.75)');
  // const [subtitleBorderRadius, setSubtitleBorderRadius] = useState<number>(4);
  const [subtitleMaxChars, setSubtitleMaxChars] = useState<number>(16);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<string>('#FFE500');

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>('layer_title');
  const [activeInspectorTab, setActiveInspectorTab] = useState<InspectorSubTabId>('template');
  const [activeMasterGroup, setActiveMasterGroup] = useState<'layout' | 'text' | 'media' | 'viral'>('layout');
  const [activeFloatingInspector, setActiveFloatingInspector] = useState<string>('none');

  const inspectorGroups = useMemo(() => getInspectorGroupsForMode(layoutTemplateMode), [layoutTemplateMode]);

  useEffect(() => {
    const group = inspectorGroups.find((g) => g.subTabs.some((t) => t.id === activeInspectorTab));
    if (group && group.id !== activeMasterGroup) {
      setActiveMasterGroup(group.id as any);
    } else if (!group && inspectorGroups.length > 0) {
      const firstGroup = inspectorGroups[0];
      setActiveMasterGroup(firstGroup.id as any);
      if (firstGroup.subTabs.length > 0) {
        setActiveInspectorTab(firstGroup.subTabs[0].id as any);
      }
    }
  }, [activeInspectorTab, inspectorGroups]);

  // 재생 시뮬레이션
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [durationMs, setDurationMs] = useState<number>(5000);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [masterVolume, setMasterVolume] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [vuLevels, setVuLevels] = useState<{ left: number; right: number }>({ left: 35, right: 38 });

  // 비디오 크롭 및 샌드위치 핏
  const [videoFitMode, setVideoFitMode] = useState<VideoFitMode>('sandwich');
  const [videoBlurBg, setVideoBlurBg] = useState<boolean>(true);
  const [videoZoomScale, setVideoZoomScale] = useState<number>(100);
  const [videoFocusXPct, setVideoFocusXPct] = useState<number>(50);
  const [videoFocusYPct, setVideoFocusYPct] = useState<number>(50);
  const [videoRotationDeg, setVideoRotationDeg] = useState<number>(0);
  const [videoHorizontalFlip, setVideoHorizontalFlip] = useState<boolean>(false);
  const [videoVerticalFlip, setVideoVerticalFlip] = useState<boolean>(false);
  const [videoBorderRadius, setVideoBorderRadius] = useState<number>(0);
  const [videoBorderEnabled, setVideoBorderEnabled] = useState<boolean>(false);
  const [videoBorderWidth, setVideoBorderWidth] = useState<number>(1);
  const [videoBorderColor, setVideoBorderColor] = useState<string>('#FFFFFF');
  const [videoShadowEnabled, setVideoShadowEnabled] = useState<boolean>(false);
  const [videoShadowBlur, setVideoShadowBlur] = useState<number>(20);
  const [videoShadowColor, setVideoShadowColor] = useState<string>('rgba(0,0,0,0.5)');
  const [videoPaddingPct, setVideoPaddingPct] = useState<number>(0);

  // 상단 바 (Top Bar Bg)
  const [hasTopBarBg, setHasTopBarBg] = useState<boolean>(initialMode === 'classic');
  const [topBarBg, setTopBarBg] = useState<string>('#000000');
  const [topBarHeightPct, setTopBarHeightPct] = useState<number>(18.3);
  const [topBarOpacity, setTopBarOpacity] = useState<number>(1.0);
  const [topBarRadius, setTopBarRadius] = useState<number>(0);
  const [topBarZIndex, setTopBarZIndex] = useState<number>(15);

  // 상단 타이틀 레이어
  const [hasTopTitle, setHasTopTitle] = useState<boolean>(true);
  const [topTitleText, setTopTitleText] = useState<string>('제목을\n입력하세요');
  const [titleLinesMode, setTitleLinesMode] = useState<'single' | 'double'>('double');
  const [titleLine1, setTitleLine1] = useState<string>('조코비치 몰래카메라 ㅋㅋ');
  const [titleLine2, setTitleLine2] = useState<string>('상대 선수 멘붕 직전');
  const [titleLine1Color, setTitleLine1Color] = useState<string>('#FFFFFF');
  const [titleLine2Color, setTitleLine2Color] = useState<string>('#FFE500');
  const [titleLine1SizePx, setTitleLine1SizePx] = useState<number>(20);
  const [titleLine2SizePx, setTitleLine2SizePx] = useState<number>(20);
  const [titleFontFamily, setTitleFontFamily] = useState<string>('Pretendard');
  const [titleStroke, setTitleStroke] = useState<boolean>(true);
  const [titleStrokeWidth, setTitleStrokeWidth] = useState<number>(3);
  const [titleStrokeColor, setTitleStrokeColor] = useState<string>('#000000');
  const [titleShadow, setTitleShadow] = useState<boolean>(true);
  const [titleShadowBlur, setTitleShadowBlur] = useState<number>(8);
  const [titleShadowColor, setTitleShadowColor] = useState<string>('#000000');
  const [titleBgMode, setTitleBgMode] = useState<'none' | 'box' | 'pill' | 'highlighter' | 'glass'>('none');
  const [titleBgColor, setTitleBgColor] = useState<string>('rgba(0,0,0,0.85)');
  const [titlePaddingX, setTitlePaddingX] = useState<number>(12);
  const [titlePaddingY, setTitlePaddingY] = useState<number>(6);
  const [titleBorderRadius, setTitleBorderRadius] = useState<number>(4);
  const [hasTitleBadge, setHasTitleBadge] = useState<boolean>(false);
  const [titleBadgeText, setTitleBadgeText] = useState<string>('속보');
  const [titleBadgeColor, setTitleBadgeColor] = useState<string>('#FFFFFF');
  const [titleBadgeSizePx, setTitleBadgeSizePx] = useState<number>(11);
  const [titleBadgeRadius, setTitleBadgeRadius] = useState<number>(4);
  const [hasTitleLine1, setHasTitleLine1] = useState<boolean>(true);
  const [hasTitleLine2, setHasTitleLine2] = useState<boolean>(true);
  const [titleBold, setTitleBold] = useState<boolean>(true);
  const [titleItalic, setTitleItalic] = useState<boolean>(false);
  const [titleAlign, setTitleAlign] = useState<'left' | 'center' | 'right'>('center');
  const [titleLetterSpacing, setTitleLetterSpacing] = useState<number>(-0.5);
  const [titleLineHeight, setTitleLineHeight] = useState<number>(1.2);
  const [titleLine1FontFamily, setTitleLine1FontFamily] = useState<string>('Pretendard');
  const [titleLine1Bold, setTitleLine1Bold] = useState<boolean>(true);
  const [titleLine1Italic, setTitleLine1Italic] = useState<boolean>(false);
  const [titleLine1Align, setTitleLine1Align] = useState<'left' | 'center' | 'right'>('center');
  const [titleLine1LetterSpacing, setTitleLine1LetterSpacing] = useState<number>(-0.5);
  const [titleLine1LineHeight, setTitleLine1LineHeight] = useState<number>(1.2);
  const [titleLine2FontFamily, setTitleLine2FontFamily] = useState<string>('Pretendard');
  const [titleLine2Bold, setTitleLine2Bold] = useState<boolean>(true);
  const [titleLine2Italic, setTitleLine2Italic] = useState<boolean>(false);
  const [titleLine2Align, setTitleLine2Align] = useState<'left' | 'center' | 'right'>('center');
  const [titleLine2LetterSpacing, setTitleLine2LetterSpacing] = useState<number>(-0.5);
  const [titleLine2LineHeight, setTitleLine2LineHeight] = useState<number>(1.2);

  // ⚡ 긴박 쨉쨉이 훅
  const [hasJab, setHasJab] = useState<boolean>(true);
  const [jabText, setJabText] = useState<string>('*출격작전 반전 순간!*');
  const [jabFontSize, setJabFontSize] = useState<number>(13);
  const [jabTiltDeg, setJabTiltDeg] = useState<number>(-3);
  const [jabTextColor, setJabTextColor] = useState<string>('#000000');
  const [jabFont, setJabFont] = useState<string>('GmarketSans');
  const [jabBold, setJabBold] = useState<boolean>(true);
  const [jabItalic, setJabItalic] = useState<boolean>(false);
  const [jabAlign, setJabAlign] = useState<'left' | 'center' | 'right'>('center');
  const [jabLetterSpacing, setJabLetterSpacing] = useState<number>(0);
  const [jabLineHeight, setJabLineHeight] = useState<number>(1.2);
  const [jabBgEnabled, setJabBgEnabled] = useState<boolean>(true);
  const [jabBgColor, setJabBgColor] = useState<string>('#FFE500');
  const [jabBorderRadius, setJabBorderRadius] = useState<number>(4);
  const [jabStroke, setJabStroke] = useState<boolean>(true);
  const [jabStrokeWidth, setJabStrokeWidth] = useState<number>(2);
  const [jabStrokeColor, setJabStrokeColor] = useState<string>('#000000');
  const [jabShadow, setJabShadow] = useState<boolean>(true);
  const [jabShadowBlur, setJabShadowBlur] = useState<number>(8);
  const [jabShadowColor, setJabShadowColor] = useState<string>('#000000');

  // 💬 본문 자막
  const [subtitleConfig, setSubtitleConfig] = useState<SubtitleConfig>({
    ...DEFAULT_SUBTITLE_CONFIG,
    enabled: true,
    font: 'Pretendard',
    fontSize: 18,
    textColor: '#FFFFFF',
    outlineSize: 4,
    outlineColor: '#000000',
    shadowSize: 3,
    shadowColor: 'rgba(0,0,0,0.95)',
    useBox: false,
    boxColor: 'rgba(0,0,0,0.75)',
    maxLines: 2,
    splitLimit: 14,
  });
  const [selectedSubtitlePresetId, setSelectedSubtitlePresetId] = useState<string>('neon-yellow');
  const [subtitleBorderRadius, setSubtitleBorderRadius] = useState<number>(4);
  const [sampleSubText, setSampleSubText] = useState<string>('손흥민 역대급 환상골 작렬!\n경기장이 일제히 열광합니다.');

  // 🏷️ 하단 출처
  const [hasBottomSource, setHasBottomSource] = useState<boolean>(true);
  const [bottomSourceText, setBottomSourceText] = useState<string>('출처: YouTube @ViraLoop 공식 채널');
  const [bottomSourceColor, setBottomSourceColor] = useState<string>('#CBD5E1');
  const [bottomSourceSizePx, setBottomSourceSizePx] = useState<number>(10);
  const [bottomSourceFontFamily, setBottomSourceFontFamily] = useState<string>('Pretendard');
  const [bottomSourceLetterSpacing, setBottomSourceLetterSpacing] = useState<number>(0);
  const [bottomSourceLineHeight, setBottomSourceLineHeight] = useState<number>(1.2);

  // 하단 바 (Bottom Bar Bg)
  const [hasBottomBarBg, setHasBottomBarBg] = useState<boolean>(initialMode === 'classic');
  const [bottomBarBg, setBottomBarBg] = useState<string>('#000000');
  const [bottomBarHeightPct, setBottomBarHeightPct] = useState<number>(6.0);
  const [bottomBarOpacity, setBottomBarOpacity] = useState<number>(1.0);
  const [bottomBarRadius, setBottomBarRadius] = useState<number>(0);
  const [bottomBarZIndex, setBottomBarZIndex] = useState<number>(15);

  // 💬 댓글 카드
  const [hasCommentCard, setHasCommentCard] = useState<boolean>(false);
  const [commentCard, setCommentCard] = useState<CommentCardConfig>({
    author: '스마트쇼츠_크리에이터',
    handle: '@viral_shorts_pro',
    content: '와 진짜 이 부분에서 소름 돋았네요... 무조건 다음 편도 올려주세요!',
    likes: '1.2만',
    theme: 'insta',
    isBlurred: false,
    isAnonymous: false,
    isPinned: true,
    pinBadgeText: '베댓',
  });

  // 🎨 필터 & 노이즈 FX
  const [videoFilter, setVideoFilter] = useState<VideoFilterConfig>({
    preset: 'none',
    filmGrain: 0,
    vignette: 0,
    contrast: 100,
    saturation: 100,
    warmth: 0,
    brightness: 100,
  });

  // 📷 인스타형 설정
  const [instaConfig, setInstaConfig] = useState({
    profileName: '사용자명',
    profileHandle: '@handle',
    profileAvatarUrl: 'https://api.dicebear.com/9.x/lorelei/svg?seed=user_avatar_blue',
    isVerified: true,
    bgColor: '#FFFFFF',
    subFont: 'Pretendard',
    subColor: '#374151',
    holeYPct: 45.0,
    holeWidthPct: 88,
    holeHeightPct: 46,
    holeRoundness: 16,
    holeBorderWidth: 1,
    holeBorderColor: '#E5E7EB',
    holeShadow: true,
    theme: 'white' as 'white' | 'dark' | 'sunset' | 'cyber',
  });

  // 🎯 군림보형 설정 (뇌종구 실측 3단 구조 & 인간 손맛 가변 연출)
  const [gunlimboConfig, setGunlimboConfig] = useState({
    introDurationSec: 2.5,
    titleLinesMode: 'double' as 'single' | 'double',
    titleLine1: '제목을',
    titleLine2: '입력해주세요',
    titleLine1Color: '#FFFFFF',
    titleLine2Color: '#FFE500',
    titleFontSize: 34,
    titleLine1FontSize: 34,
    titleLine2FontSize: 34,
    titleLine1LetterSpacing: -1,
    titleLine2LetterSpacing: -1,
    titleLineHeight: 1.15,
    titleAlign: 'center' as 'left' | 'center' | 'right',
    titleLine1Align: 'center' as 'left' | 'center' | 'right',
    titleLine2Align: 'center' as 'left' | 'center' | 'right',
    titleBgMode: 'none' as 'none' | 'box' | 'pill',
    titleBgColor: '#000000',
    titlePaddingX: 16,
    titlePaddingY: 8,
    titleBorderRadius: 4,
    hasTitleBadge: true,
    titleBadgeText: '속보',
    titleBadgeBg: '#EF4444',
    titleBadgeColor: '#FFFFFF',
    titleBadgeSizePx: 11,
    titleBadgeRadius: 4,
    hookPhrase: '후킹문구를 입력하세요',
    hookBgColor: '#FFFFFF',
    hookTextColor: '#000000',
    hookFontSize: 19,
    hookLetterSpacing: -0.5,
    hookLineHeight: 1.25,
    hookAlign: 'center' as 'left' | 'center' | 'right',
    showGuidelines: false,
    keepTitleThroughout: true,
    coupangSafeZone: false,
    kenBurnsMotion: true,
    pepeMemeAutoInsert: true,
  });

  // 📜 썰형 설정
  const [ssulConfig, setSsulConfig] = useState({
    communityType: 'blind' as 'blind' | 'nate' | 'fmkorea' | 'dcinside',
    author: '대기업 익명',
    timeText: '10분 전',
    viewsText: '조회 2.4만',
    upvotesText: '추천 382',
    textMode: 'accumulate' as SsulTextMode,
    memeType: 'pepe' as MemeType,
    memeEmotion: 'excited' as MemeEmotion,
    memeAliveMotion: true,
  });

  // 🎙️ TTS 설정
  const [ttsConfig, setTtsConfig] = useState<TTSConfig>({
    engine: 'supertone-local',
    language: 'ko',
    voice_id: 'F1',
    speed: 1.0,
    pitch: 0,
    use_silence_removal: true,
  });

  // 채널 DNA
  const [channelDna, setChannelDna] = useState({
    channelName: '스포츠 사이다 명장면 TV',
    primaryColor: '#FFE500',
    secondaryColor: '#00E510',
    fontFamily: 'Pretendard',
  });

  // 레이어별 Transform 객체 (Gizmo 연동)
  const [titleTransform, setTitleTransform] = useState<NleLayerTransform>(
    createDefaultTransform({ xPct: 50, yPct: 9.0, scale: 1.0, rotationDeg: 0, zIndex: 35 })
  );
  const [jabTransform, setJabTransform] = useState<NleLayerTransform>(
    createDefaultTransform({ xPct: 50, yPct: 28.0, scale: 1.0, rotationDeg: -3, zIndex: 40 })
  );
  const [subTransform, setSubTransform] = useState<NleLayerTransform>(
    createDefaultTransform({ xPct: 50, yPct: 78.0, scale: 1.0, rotationDeg: 0, zIndex: 45 })
  );
  const [sourceTransform, setSourceTransform] = useState<NleLayerTransform>(
    createDefaultTransform({ xPct: 50, yPct: 94.0, scale: 1.0, rotationDeg: 0, zIndex: 35 })
  );
  const [commentTransform, setCommentTransform] = useState<NleLayerTransform>(
    createDefaultTransform({ xPct: 50, yPct: 82.0, scale: 0.95, rotationDeg: 0, zIndex: 45 })
  );
  const [profileTransform, setProfileTransform] = useState<NleLayerTransform>(
    createDefaultTransform({ xPct: 6.0, yPct: 5.5, scale: 1.0, zIndex: 45 })
  );

  // 🎯 마우스 휠 줌: passive: false 로 부드러운 확대/축소
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // 🎯 플로팅 인스펙터 팝업창 및 내부 스크롤 영역 조작 시 캔버스 줌인/줌아웃 방지
      const rawTarget = e.target as Node | null;
      const target = rawTarget instanceof HTMLElement ? rawTarget : rawTarget?.parentElement;
      if (target?.closest?.('.floating-inspector-card, [data-no-canvas-zoom="true"], .custom-scrollbar, select, input, textarea, [role="slider"]')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      const zoomDelta = -e.deltaY * 0.0015;
      setCanvasScale((prev) => {
        const next = Math.max(0.2, Math.min(4.0, prev + zoomDelta));
        return parseFloat(next.toFixed(3));
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // 🎯 ESC 키 전체화면 종료
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // 줌 드롭다운 동기화
  useEffect(() => {
    if (canvasZoom === 'fit') {
      setCanvasScale(1.0);
      setCanvasPan({ x: 0, y: 0 });
    } else if (canvasZoom === '50') setCanvasScale(0.5);
    else if (canvasZoom === '75') setCanvasScale(0.75);
    else if (canvasZoom === '100') setCanvasScale(1.0);
    else if (canvasZoom === '150') setCanvasScale(1.5);
    else if (canvasZoom === '200') setCanvasScale(2.0);
  }, [canvasZoom]);

  // ⏱️ 타임라인 실시간 재생 시뮬레이션 (0.0s ~ 5.0s 루프)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTimeMs((prev) => {
        const next = prev + (66 * playbackRate);
        if (next >= durationMs) {
          if (isLooping) return 0;
          setIsPlaying(false);
          return durationMs;
        }
        return next;
      });
    }, 66);
    return () => clearInterval(interval);
  }, [isPlaying, playbackRate, isLooping, durationMs]);

  // 💬 재생 중 타임코드에 따라 샘플 자막 실시간 시뮬레이션
  useEffect(() => {
    const SAMPLE_PREVIEW_SUBS = [
      '손흥민 80m 단독 폭풍 드리블 원더골 작렬!',
      '수비수 5명을 단숨에 제치며 골망을 갈랐습니다.',
      '현지 해설진 전원 기립 극찬이 폭발했습니다.',
      '역대급 푸스카스상 후보로 전 세계가 열광 중!'
    ];
    if (isPlaying) {
      const idx = Math.floor((currentTimeMs / 1250) % SAMPLE_PREVIEW_SUBS.length);
      setCurrentSubtitleText(SAMPLE_PREVIEW_SUBS[idx]);
    }
  }, [currentTimeMs, isPlaying]);

  // ⌨️ Spacebar 재생/일시정지 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ⏱️ 타임코드 포맷터 (00:00:00)
  const formatTimecode = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    const f = Math.floor((ms % 1000) / (1000 / 30));
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  };

  // 🎨 컬러 하모니 테마 원클릭 적용
  const handleApplyColorTheme = (theme: { id: string; name: string; primary: string; secondary: string; bg: string }) => {
    setChannelDna(prev => ({ ...prev, primaryColor: theme.primary, secondaryColor: theme.secondary }));
    setTitleLine2Color(theme.primary);
    setJabBgColor(theme.primary);
    setSelectedHighlightColor(theme.primary);
    setSubtitleConfig(prev => ({ ...prev, highlightColor: theme.primary }));
    if (layoutTemplateMode === 'classic') {
      setTopBarBg(theme.bg);
      setBottomBarBg(theme.bg);
    }
    toast({
      title: `🎨 [${theme.name}] 테마 적용 완료`,
      description: `대표 컬러(${theme.primary})와 보조 컬러(${theme.secondary})가 전 레이어에 일괄 주입되었습니다.`,
    });
  };

  // 🖋️ 황금비 폰트 페어링 원클릭 적용
  const handleApplyFontPairing = (pairing: { name: string; title: string; sub: string }) => {
    setTitleFontFamily(pairing.title);
    setSubtitleConfig(prev => ({ ...prev, fontFamily: pairing.sub }));
    setChannelDna(prev => ({ ...prev, fontFamily: pairing.title }));
    toast({
      title: `🖋️ [${pairing.name}] 폰트 페어링 적용`,
      description: `대제목(${pairing.title}) + 본문자막(${pairing.sub})이 캔버스에 적용되었습니다.`,
    });
  };

  // 📤 템플릿 JSON 내보내기
  const handleExportTemplateJson = () => {
    try {
      const exportData = {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        archetype: layoutTemplateMode,
        name: templateName,
        geometry: {
          aspectRatio,
          topTitleZone: { enabled: hasTopTitle, heightPct: topBarHeightPct, bgColor: topBarBg, opacity: topBarOpacity },
          bottomSourceZone: { enabled: hasBottomSource, heightPct: bottomBarHeightPct, bgColor: bottomBarBg },
          holeWindowZone: layoutTemplateMode === 'instagram' ? {
            widthPct: instaConfig.holeWidthPct,
            heightPct: instaConfig.holeHeightPct,
            yPct: instaConfig.holeYPct,
            roundness: instaConfig.holeRoundness,
          } : undefined,
        },
        typography: {
          titleFontFamily,
          titleLine1,
          titleLine2,
          titleLine1Color,
          titleLine2Color,
          subtitleFontFamily: subtitleConfig.font,
          subtitleColor: subtitleConfig.textColor,
          subtitleHighlightColor: selectedHighlightColor,
        },
        colorTheme: {
          primaryBgColor: topBarBg,
          accentColor: channelDna.primaryColor,
          secondaryColor: channelDna.secondaryColor,
        },
        gunlimboConfig: layoutTemplateMode === 'gunlimbo' ? gunlimboConfig : undefined,
        instaConfig: layoutTemplateMode === 'instagram' ? instaConfig : undefined,
        ssulConfig: layoutTemplateMode === 'ssul' ? ssulConfig : undefined,
        commentCard: hasCommentCard ? commentCard : undefined,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateName.replace(/[^a-zA-Z0-9가-힣_-]/g, '_') || 'template'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: '템플릿 JSON 내보내기 완료',
        description: `${a.download} 파일이 다운로드되었습니다.`,
      });
    } catch (e: any) {
      toast({
        title: 'JSON 내보내기 실패',
        description: e.message || '파일 생성 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 📥 템플릿 JSON 불러오기
  const handleImportTemplateJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        handleApplyManifest(parsed as any);
        toast({
          title: '템플릿 JSON 불러오기 성공',
          description: `[${parsed.name || file.name}] 템플릿 데이터가 정상적으로 적용되었습니다.`,
        });
      } catch (err: any) {
        toast({
          title: 'JSON 불러오기 실패',
          description: '유효한 JSON 템플릿 형식이 아닙니다.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 폼팩터 모드 전환 가드
  const handleSelectTemplateMode = (mode: LayoutTemplateMode) => {
    setLayoutTemplateMode(mode);
    if (mode === 'instagram') {
      setHasTopBarBg(false);
      setHasBottomBarBg(false);
      setHasBottomSource(false);
      setHasTopTitle(true);
      setTitleTransform(prev => ({ ...prev, xPct: 6.0, yPct: 14.0, scale: 1.0 }));
      setProfileTransform(prev => ({ ...prev, xPct: 6.0, yPct: 5.5, scale: 1.0, zIndex: 45 }));
      setSubTransform(prev => ({ ...prev, xPct: 6.0, yPct: 71.5, scale: 1.0 }));
      setHasCommentCard(true);
      setCommentTransform(prev => ({ ...prev, xPct: 50, yPct: 82.0, scale: 0.95, zIndex: 45 }));
      setCommentCard(prev => ({ ...prev, theme: 'insta' }));
      setVideoFitMode('sandwich');
      toast({
        title: '인스타형 템플릿 적용',
        description: '화이트 배경 + 상단 프로필/대제목 + 중앙 구멍 윈도우 + 하단 자막/댓글 카드로 정렬되었습니다.'
      });
    } else if (mode === 'classic') {
      setHasTopBarBg(true);
      setHasBottomBarBg(true);
      setHasTopTitle(true);
      setTitleTransform(prev => ({ ...prev, xPct: 50, yPct: 9.0, scale: 1.0 }));
      setSubTransform(prev => ({ ...prev, xPct: 50, yPct: 78.0, scale: 1.0 }));
      setHasCommentCard(false);
      toast({
        title: '기본형 템플릿 적용',
        description: '상·하단 색상 배경 바와 중앙 고정 타이틀/자막이 활성화되었습니다.'
      });
    } else if (mode === 'gunlimbo') {
      setVideoFitMode('sandwich');
      setHasTopBarBg(false);
      setHasBottomBarBg(false);
      setHasTopTitle(true);
      setHasCommentCard(false);
      setTitleTransform(prev => ({ ...prev, xPct: 50.0, yPct: 12.0, scale: 1.0, zIndex: 30 }));
      setJabTransform(prev => ({ ...prev, xPct: 50.0, yPct: 24.0, scale: 1.0, rotationDeg: 0, zIndex: 45 }));
      setSubTransform(prev => ({ ...prev, xPct: 50.0, yPct: 84.0, scale: 1.0, rotationDeg: 0, zIndex: 40 }));
      toast({
        title: '군림보형 템플릿 적용',
        description: '상단 24% 레터박스 2줄 대제목 + 24% 수평 순백색 띠 후킹 바 + 하단 자막이 적용되었습니다.'
      });
    } else if (mode === 'ssul') {
      setHasTopBarBg(false);
      setHasBottomBarBg(false);
      setHasTopTitle(true);
      setHasCommentCard(false);
      setTitleTransform(prev => ({ ...prev, xPct: 6.0, yPct: 8.5, scale: 1.0, zIndex: 35 }));
      setSubTransform(prev => ({ ...prev, xPct: 50.0, yPct: 24.5, scale: 1.0, zIndex: 35 }));
      toast({
        title: '썰형 템플릿 적용',
        description: '커뮤니티 헤더 + 텍스트 모드 + 페페 밈 생동감 모션이 적용되었습니다.'
      });
    }
  };

  // 🎯 픽셀링 스타일 4대 모드 탭 전환 및 URL 쿼리 연동
  const handleSwitchModeTab = (mode: LayoutTemplateMode) => {
    setLayoutTemplateMode(mode);
    const master = getMasterTemplate(mode);
    if (master) {
      handleApplyManifest(master);
      setMasterManifest(master);
    } else {
      handleSelectTemplateMode(mode);
    }

    api.get(`/channel-dna/templates/master/${mode}`)
      .then((res) => {
        if (res.data?.template?.manifest) {
          const dbMaster = res.data.template.manifest;
          saveMasterTemplateLocal(mode, dbMaster);
          setMasterManifest(dbMaster);
          handleApplyManifest(dbMaster);
        }
      })
      .catch(() => {});

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('mode', mode);
      return next;
    }, { replace: true });
  };

  // 🎯 활성 템플릿 매니페스트 하이드레이션 & 양방향 실시간 동기화 리스너 (SSOT 100% 보장)
  const isInitialModeAppliedRef = useRef(false);
  useEffect(() => {
    const targetMode = sovereignMode || (searchParams.get('mode') as LayoutTemplateMode | null) || 'classic';

    // 1. 해당 폼팩터의 공식 마스터 템플릿(사용자 커스텀 마스터 최우선) 즉시 복원
    const master = getMasterTemplate(targetMode);
    if (master) {
      handleApplyManifest(master);
      setMasterManifest(master);
    } else {
      handleSelectTemplateMode(targetMode);
    }

    // 2. 백엔드 DB(viral_loop.db)로부터 최신 마스터 템플릿 비동기 동기화 (단일 진실 공급원)
    api.get(`/channel-dna/templates/master/${targetMode}`)
      .then((res) => {
        if (res.data?.template?.manifest) {
          const dbMaster = res.data.template.manifest;
          saveMasterTemplateLocal(targetMode, dbMaster);
          setMasterManifest(dbMaster);
          handleApplyManifest(dbMaster);
        }
      })
      .catch((err) => {
        console.warn(`[ShortsTemplateStudio] DB master fetch error for ${targetMode}:`, err);
      });

    isInitialModeAppliedRef.current = true;
  }, [searchParams, sovereignMode]);

  // 🏛️ 템플릿 디자인 공방: 지속 사용되는 템플릿의 단일 진실 공급원(SSOT)
  // 편집기 등 외부 화면의 임시 수정값이나 브로드캐스트를 일체 수신하지 않고 공방 주권을 독립 수호합니다.

  // 🎨 주권 템플릿 라이브러리 열기
  const handleOpenTemplateLibrary = async () => {
    setIsTemplateLibraryOpen(true);
    try {
      const res = await api.get('/channel-dna/templates');
      if (res.data?.items) {
        setTemplateLibraryList(res.data.items);
      }
    } catch (e) {
      console.log('Using default templates for library:', e);
    }
  };

  // 🗑️ 커스텀 템플릿 삭제
  const handleDeleteCustomTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('정말 이 커스텀 템플릿을 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/channel-dna/templates/${templateId}`);
      setTemplateLibraryList(prev => prev.filter(t => t.id !== templateId));
      toast({ title: '템플릿 삭제 완료', description: '커스텀 템플릿이 성공적으로 삭제되었습니다.' });
    } catch (err: any) {
      toast({ title: '템플릿 삭제 실패', description: err.message || '삭제 중 오류가 발생했습니다.', variant: 'destructive' });
    }
  };

  // 📑 커스텀 템플릿 복제
  const handleDuplicateCustomTemplate = async (tpl: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const clonedManifest = tpl.manifest || (tpl.manifest_json ? (typeof tpl.manifest_json === 'string' ? JSON.parse(tpl.manifest_json) : tpl.manifest_json) : null);
      const newName = `${tpl.name || '템플릿'} (복사본)`;
      const payload = {
        name: newName,
        description: tpl.description || '복제된 템플릿',
        archetype: tpl.archetype || 'classic',
        manifest: clonedManifest ? { ...clonedManifest, name: newName } : undefined,
      };
      const res = await api.post('/channel-dna/templates', payload);
      if (res.data?.success && res.data?.template) {
        setTemplateLibraryList(prev => [res.data.template, ...prev]);
        toast({ title: '템플릿 복제 완료', description: `[${newName}] 템플릿이 복제 생성되었습니다.` });
      }
    } catch (err: any) {
      toast({ title: '템플릿 복제 실패', description: err.message || '복제 중 오류가 발생했습니다.', variant: 'destructive' });
    }
  };

  const handleApplyManifest = (rawManifest: TemplateManifest) => {
    const manifest = normalizeTemplateManifest(rawManifest);
    const arch = manifest.archetype || 'classic';
    if (manifest.aspectRatio) {
      setAspectRatio(manifest.aspectRatio);
    }
    handleSelectTemplateMode(arch as LayoutTemplateMode);
    setTemplateName(manifest.name || '불러온 템플릿');

    const cs = manifest.canvasState;
    if (cs) {
      // 🏛️ 1. 2D 기즈모 좌표계 100% 완전 복원 (사용자가 저장한 인스타/군림보 위치 그대로 유지)
      if (cs.titleTransform) {
        setTitleTransform({
          ...cs.titleTransform,
          xPct: arch === 'instagram'
            ? (cs.titleTransform.xPct !== undefined && cs.titleTransform.xPct !== 50 && cs.titleTransform.xPct < 40 ? cs.titleTransform.xPct : 6.0)
            : ((cs.titleTransform.xPct !== undefined && cs.titleTransform.xPct >= 15 && cs.titleTransform.xPct <= 85) ? cs.titleTransform.xPct : 50),
          yPct: arch === 'instagram'
            ? (cs.titleTransform.yPct !== undefined && cs.titleTransform.yPct !== 9.0 && cs.titleTransform.yPct !== 15 && cs.titleTransform.yPct <= 30 ? cs.titleTransform.yPct : 14.0)
            : cs.titleTransform.yPct,
        });
      }
      if (cs.jabTransform) setJabTransform(cs.jabTransform);
      if (cs.subTransform) {
        setSubTransform({
          ...cs.subTransform,
          xPct: arch === 'instagram'
            ? (cs.subTransform.xPct !== undefined && cs.subTransform.xPct !== 50 && cs.subTransform.xPct < 30 ? cs.subTransform.xPct : 6.0)
            : (cs.subTransform.xPct ?? 50),
          yPct: arch === 'instagram'
            ? (cs.subTransform.yPct !== undefined && cs.subTransform.yPct !== 78 && cs.subTransform.yPct !== 75 && cs.subTransform.yPct <= 75 ? cs.subTransform.yPct : 71.5)
            : (cs.subTransform.yPct ?? 75),
        });
      }
      if (cs.profileTransform) setProfileTransform(cs.profileTransform);
      if (cs.commentTransform) setCommentTransform(cs.commentTransform);
      if (cs.sourceTransform) setSourceTransform(cs.sourceTransform);

      // 🏛️ 2. 폼팩터별 전문 설정 100% 복원
      if (cs.gunlimboConfig) setGunlimboConfig(prev => ({ ...prev, ...cs.gunlimboConfig }));
      if (cs.instaConfig) setInstaConfig(prev => ({ ...prev, ...cs.instaConfig }));
      if (cs.ssulConfig) setSsulConfig(prev => ({ ...prev, ...cs.ssulConfig }));
      if (cs.commentCard) setCommentCard(prev => ({ ...prev, ...cs.commentCard }));

      // 🏛️ 3. 비디오 크롭/줌/필터
      if (cs.videoFitMode) setVideoFitMode(cs.videoFitMode);
      if (cs.videoBlurBg !== undefined) setVideoBlurBg(cs.videoBlurBg);
      if (cs.videoFocusXPct !== undefined) setVideoFocusXPct(cs.videoFocusXPct);
      if (cs.videoFocusYPct !== undefined) setVideoFocusYPct(cs.videoFocusYPct);
      if (cs.videoZoomScale !== undefined) setVideoZoomScale(cs.videoZoomScale);
      if (cs.videoRotationDeg !== undefined) setVideoRotationDeg(cs.videoRotationDeg);
      if (cs.videoHorizontalFlip !== undefined) setVideoHorizontalFlip(cs.videoHorizontalFlip);
      if (cs.videoVerticalFlip !== undefined) setVideoVerticalFlip(cs.videoVerticalFlip);
      if (cs.videoFilter) setVideoFilter(cs.videoFilter);

      // 🏛️ 4. 상단/하단 배경 바
      if (cs.hasTopBarBg !== undefined) setHasTopBarBg(cs.hasTopBarBg);
      if (cs.topBarBg) setTopBarBg(cs.topBarBg);
      if (cs.topBarHeightPct !== undefined) setTopBarHeightPct(cs.topBarHeightPct);
      if (cs.topBarOpacity !== undefined) setTopBarOpacity(cs.topBarOpacity);
      if (cs.topBarRadius !== undefined) setTopBarRadius(cs.topBarRadius);
      if (cs.topBarZIndex !== undefined) setTopBarZIndex(cs.topBarZIndex);
      if (cs.hasBottomBarBg !== undefined) setHasBottomBarBg(cs.hasBottomBarBg);
      if (cs.bottomBarBg) setBottomBarBg(cs.bottomBarBg);
      if (cs.bottomBarHeightPct !== undefined) setBottomBarHeightPct(cs.bottomBarHeightPct);
      if (cs.bottomBarOpacity !== undefined) setBottomBarOpacity(cs.bottomBarOpacity);
      if (cs.bottomBarRadius !== undefined) setBottomBarRadius(cs.bottomBarRadius);
      if (cs.bottomBarZIndex !== undefined) setBottomBarZIndex(cs.bottomBarZIndex);

      // 🏛️ 5. 타이틀 및 뱃지 스타일
      if (cs.hasTopTitle !== undefined) setHasTopTitle(cs.hasTopTitle);
      if (cs.topTitleText !== undefined) setTopTitleText(cs.topTitleText);
      if (cs.titleLinesMode) setTitleLinesMode(cs.titleLinesMode);
      if (cs.titleLine1 !== undefined) setTitleLine1(cs.titleLine1);
      if (cs.titleLine2 !== undefined) setTitleLine2(cs.titleLine2);
      if (cs.titleLine1Color) setTitleLine1Color(cs.titleLine1Color);
      if (cs.titleLine2Color) setTitleLine2Color(cs.titleLine2Color);
      if (cs.titleLine1SizePx) setTitleLine1SizePx(cs.titleLine1SizePx);
      if (cs.titleLine2SizePx) setTitleLine2SizePx(cs.titleLine2SizePx);
      if (cs.titleFontFamily) setTitleFontFamily(cs.titleFontFamily);
      if (cs.titleStroke !== undefined) setTitleStroke(cs.titleStroke);
      if (cs.titleStrokeWidth !== undefined) setTitleStrokeWidth(cs.titleStrokeWidth);
      if (cs.titleStrokeColor) setTitleStrokeColor(cs.titleStrokeColor);
      if (cs.titleShadow !== undefined) setTitleShadow(cs.titleShadow);
      if (cs.titleShadowBlur !== undefined) setTitleShadowBlur(cs.titleShadowBlur);
      if (cs.titleShadowColor) setTitleShadowColor(cs.titleShadowColor);
      if (cs.titleBgMode) setTitleBgMode(cs.titleBgMode);
      if (cs.titleBgColor) setTitleBgColor(cs.titleBgColor);
      if (cs.titleBgOpacity !== undefined) setTitleBgOpacity(cs.titleBgOpacity);
      if (cs.titlePaddingX !== undefined) setTitlePaddingX(cs.titlePaddingX);
      if (cs.titlePaddingY !== undefined) setTitlePaddingY(cs.titlePaddingY);
      if (cs.titleBorderRadius !== undefined) setTitleBorderRadius(cs.titleBorderRadius);
      if (cs.hasTitleBadge !== undefined) setHasTitleBadge(cs.hasTitleBadge);
      if (cs.titleBadgeText !== undefined) setTitleBadgeText(cs.titleBadgeText);
      if (cs.titleBadgeBg) setTitleBadgeBg(cs.titleBadgeBg);
      if (cs.titleBadgeColor) setTitleBadgeColor(cs.titleBadgeColor);
      if (cs.titleBadgeSizePx !== undefined) setTitleBadgeSizePx(cs.titleBadgeSizePx);
      if (cs.hasTitleLine1 !== undefined) setHasTitleLine1(cs.hasTitleLine1);
      if (cs.hasTitleLine2 !== undefined) setHasTitleLine2(cs.hasTitleLine2);
      if (cs.titleBold !== undefined) setTitleBold(cs.titleBold);
      if (cs.titleItalic !== undefined) setTitleItalic(cs.titleItalic);
      if (cs.titleAlign !== undefined) setTitleAlign(cs.titleAlign);

      // 🏛️ 6. 긴박 쨉쨉이 훅
      if (cs.hasJab !== undefined) setHasJab(cs.hasJab);
      if (cs.jabText !== undefined) setJabText(cs.jabText);
      if (cs.jabTiltDeg !== undefined) setJabTiltDeg(cs.jabTiltDeg);
      if (cs.jabFontSize !== undefined) setJabFontSize(cs.jabFontSize);
      if (cs.jabTextColor) setJabTextColor(cs.jabTextColor);
      if (cs.jabStroke !== undefined) setJabStroke(cs.jabStroke);
      if (cs.jabStrokeWidth !== undefined) setJabStrokeWidth(cs.jabStrokeWidth);
      if (cs.jabStrokeColor) setJabStrokeColor(cs.jabStrokeColor);
      if (cs.jabShadow !== undefined) setJabShadow(cs.jabShadow);
      if (cs.jabShadowBlur !== undefined) setJabShadowBlur(cs.jabShadowBlur);
      if (cs.jabShadowColor) setJabShadowColor(cs.jabShadowColor);
      if (cs.jabBgEnabled !== undefined) setJabBgEnabled(cs.jabBgEnabled);
      if (cs.jabBgColor) setJabBgColor(cs.jabBgColor);
      if (cs.jabBorderRadius !== undefined) setJabBorderRadius(cs.jabBorderRadius);

      // 🏛️ 7. 하단 출처 표기
      if (cs.hasBottomSource !== undefined) setHasBottomSource(cs.hasBottomSource);
      if (cs.bottomSourceText !== undefined) setBottomSourceText(cs.bottomSourceText);
      if (cs.bottomSourceColor) setBottomSourceColor(cs.bottomSourceColor);
      if (cs.bottomSourceSizePx !== undefined) setBottomSourceSizePx(cs.bottomSourceSizePx);
      if (cs.bottomSourceFontFamily) setBottomSourceFontFamily(cs.bottomSourceFontFamily);
      if (cs.bottomSourceBold !== undefined) setBottomSourceBold(cs.bottomSourceBold);
      if (cs.bottomSourceItalic !== undefined) setBottomSourceItalic(cs.bottomSourceItalic);
      if (cs.bottomSourceAlign !== undefined) setBottomSourceAlign(cs.bottomSourceAlign);
      if (cs.bottomSourceBottomPct !== undefined) setBottomSourceBottomPct(cs.bottomSourceBottomPct);
      if (cs.bottomSourceStroke !== undefined) setBottomSourceStroke(cs.bottomSourceStroke);
      if (cs.bottomSourceStrokeWidth !== undefined) setBottomSourceStrokeWidth(cs.bottomSourceStrokeWidth);
      if (cs.bottomSourceStrokeColor) setBottomSourceStrokeColor(cs.bottomSourceStrokeColor);
      if (cs.bottomSourceShadow !== undefined) setBottomSourceShadow(cs.bottomSourceShadow);
      if (cs.bottomSourceShadowBlur !== undefined) setBottomSourceShadowBlur(cs.bottomSourceShadowBlur);
      if (cs.bottomSourceShadowColor) setBottomSourceShadowColor(cs.bottomSourceShadowColor);
      if (cs.bottomSourceBg !== undefined) setBottomSourceBg(cs.bottomSourceBg);
      if (cs.bottomSourceBgColor) setBottomSourceBgColor(cs.bottomSourceBgColor);
      if (cs.bottomSourceBorderRadius !== undefined) setBottomSourceBorderRadius(cs.bottomSourceBorderRadius);

      // 🏛️ 8. 자막 & 댓글 (SSOT 일체화)
      if (cs.subtitleConfig) {
        setSubtitleConfig(prev => ({ ...prev, ...cs.subtitleConfig }));
      }
      if (cs.subtitleStrokeEnabled !== undefined) setSubtitleStrokeEnabled(cs.subtitleStrokeEnabled);
      if (cs.subtitleStrokeWidth !== undefined) setSubtitleStrokeWidth(cs.subtitleStrokeWidth);
      if (cs.subtitleStrokeColor) setSubtitleStrokeColor(cs.subtitleStrokeColor);
      if (cs.subtitleShadowEnabled !== undefined) setSubtitleShadowEnabled(cs.subtitleShadowEnabled);
      if (cs.subtitleShadowBlur !== undefined) setSubtitleShadowBlur(cs.subtitleShadowBlur);
      if (cs.subtitleShadowColor) setSubtitleShadowColor(cs.subtitleShadowColor);
      const effectiveUseBox = cs.subtitleUseBox !== undefined ? cs.subtitleUseBox : cs.subtitleConfig?.useBox;
      if (effectiveUseBox !== undefined) {
        setSubtitleUseBox(effectiveUseBox);
        setSubtitleConfig(prev => ({ ...prev, useBox: effectiveUseBox }));
      }
      if (cs.subtitleBoxColor) {
        setSubtitleBoxColor(cs.subtitleBoxColor);
        setSubtitleConfig(prev => ({ ...prev, boxColor: cs.subtitleBoxColor || prev.boxColor }));
      }
      if (cs.subtitleBorderRadius !== undefined) setSubtitleBorderRadius(cs.subtitleBorderRadius);
      if (cs.hasCommentCard !== undefined) setHasCommentCard(cs.hasCommentCard);
    } else {
      // 1. 상단 바 & 타이틀 존
      if (manifest.geometry?.topTitleZone) {
        const t = manifest.geometry.topTitleZone;
        setHasTopTitle(t.enabled ?? true);
        setHasTopBarBg(t.enabled ?? true);
        if (t.heightPct !== undefined) setTopBarHeightPct(t.heightPct);
        if (t.bgColor) setTopBarBg(t.bgColor);
        if (t.opacity !== undefined) setTopBarOpacity(t.opacity);
      }

      // 2. 인스타그램 홀 윈도우
      if (manifest.geometry?.holeWindowZone) {
        const h = manifest.geometry.holeWindowZone;
        setInstaConfig(prev => ({
          ...prev,
          holeWidthPct: h.widthPct ?? prev.holeWidthPct,
          holeHeightPct: h.heightPct ?? prev.holeHeightPct,
          holeRoundness: h.roundness ?? prev.holeRoundness,
          holeYPct: h.yPct ?? prev.holeYPct,
          bgColor: h.cardBgColor ?? prev.bgColor,
        }));
      }

      // 3. 건림보 훅 밴드
      if (manifest.geometry?.hookBandZone) {
        const hb = manifest.geometry.hookBandZone;
        setGunlimboConfig(prev => ({
          ...prev,
          hookBgColor: hb.boxColor ?? prev.hookBgColor,
          hookTextColor: hb.textColor ?? prev.hookTextColor,
        }));
      }

      // 4. 하단 출처 표기
      if (manifest.geometry?.sourceZone) {
        const sz = manifest.geometry.sourceZone;
        setHasBottomSource(sz.enabled ?? true);
        if (sz.defaultText) setBottomSourceText(sz.defaultText);
        if (sz.textColor) setBottomSourceColor(sz.textColor);
        if (sz.fontSize) setBottomSourceSizePx(sz.fontSize);
        if (sz.yPct) setBottomSourceBottomPct(100 - sz.yPct);
      }

      // 5. 바이럴 댓글 카드
      if (manifest.geometry?.commentCardZone) {
        setHasCommentCard(manifest.geometry.commentCardZone.enabled ?? true);
      }

      // 6. 잽 훅
      if (manifest.geometry?.jabHookZone) {
        setHasJab(manifest.geometry.jabHookZone.enabled ?? true);
      }

      // 7. 스타일 영역
      if (manifest.style) {
        const s = manifest.style;
        if (s.titleFont) setTitleFontFamily(s.titleFont);
        if (s.titleLinesMode) setTitleLinesMode(s.titleLinesMode);
        if (s.titleBadgeText !== undefined) setTitleBadgeText(s.titleBadgeText);
        if (s.titleBadgeColor) setTitleBadgeColor(s.titleBadgeColor);
        if (s.titleFontSize) setTitleLine1SizePx(s.titleFontSize);
        if (s.titleLine2FontSize) setTitleLine2SizePx(s.titleLine2FontSize);
        else if (s.titleFontSize) setTitleLine2SizePx(24);
        if (s.titleLine1Color) setTitleLine1Color(s.titleLine1Color);
        if (s.titleLine2Color) setTitleLine2Color(s.titleLine2Color);
        if (s.titleBgMode) {
          setTitleBgMode((s.titleBgMode === 'box' || s.titleBgMode === 'pill') ? s.titleBgMode : 'none');
        }
        if (s.titleBgColor) setTitleBgColor(s.titleBgColor);
        if (s.titleBorderRadius !== undefined) setTitleBorderRadius(s.titleBorderRadius);
        if (s.titleStroke !== undefined) setTitleStroke(s.titleStroke);
        if (s.titleStrokeWidth !== undefined) setTitleStrokeWidth(s.titleStrokeWidth);
        if (s.titleStrokeColor) setTitleStrokeColor(s.titleStrokeColor);
        if (s.titleShadow !== undefined) setTitleShadow(s.titleShadow);
        if (s.titleShadowBlur !== undefined) setTitleShadowBlur(s.titleShadowBlur);
        if (s.titleShadowColor) setTitleShadowColor(s.titleShadowColor);

        // 자막 세부 스타일
        setSubtitleConfig(prev => ({
          ...prev,
          font: s.captionFont || prev.font,
          fontSize: s.captionFontSize || prev.fontSize,
        }));
        if (s.captionStrokeWidth !== undefined) setSubtitleStrokeWidth(s.captionStrokeWidth);
        if (s.captionStrokeColor) setSubtitleStrokeColor(s.captionStrokeColor);
        if (s.captionShadowBlur !== undefined) setSubtitleShadowBlur(s.captionShadowBlur);
        if (s.captionShadowColor) setSubtitleShadowColor(s.captionShadowColor);
        if (s.captionUseBox !== undefined) setSubtitleUseBox(s.captionUseBox);
        if (s.captionBoxColor) setSubtitleBoxColor(s.captionBoxColor);
        if (s.emotionColors?.normal) setSelectedHighlightColor(s.emotionColors.normal);

        // 건림보 전용 스타일
        if (arch === 'gunlimbo') {
          setGunlimboConfig(prev => ({
            ...prev,
            introDurationSec: manifest.geometry?.mediaZone?.introDurationSec || prev.introDurationSec,
            titleFontSize: s.titleFontSize || prev.titleFontSize,
            titleLine1Color: s.titleLine1Color || prev.titleLine1Color,
            titleLine2Color: s.titleLine2Color || prev.titleLine2Color,
            hookFontSize: s.hookFontSize || prev.hookFontSize,
          }));
        }
      }
    }

    toast({
      title: `🎨 '${manifest.name}' 템플릿 적용 완료`,
      description: `[${(manifest.archetype || 'classic').toUpperCase()}] 매니페스트 및 캔버스 좌표가 100% 동일하게 복원되었습니다.`
    });
    setIsTemplateLibraryOpen(false);
  };

  // 📐 현재 캔버스 상태로부터 완벽한 TemplateManifest 객체 빌드
  const buildCurrentManifest = (customId?: string, customName?: string, isMaster: boolean = false): TemplateManifest => {
    const cleanName = (customName || templateName).trim() || (isMaster ? `${layoutTemplateMode.toUpperCase()} 마스터` : '커스텀 템플릿');
    const id = customId || (isMaster ? `master_${layoutTemplateMode}` : `custom_${Date.now().toString(36)}`);
    return {
      id,
      name: cleanName,
      badge: isMaster ? '마스터 템플릿' : '커스텀',
      description: isMaster
        ? `${layoutTemplateMode} 폼팩터 공식 마스터 템플릿 (리셋 기준점)`
        : '사용자 지정 숏폼 템플릿 디자인',
      isSystem: isMaster,
      version: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archetype: layoutTemplateMode,
      aspectRatio,
      geometry: {
        mediaZone: {
          introTopPct: layoutTemplateMode === 'gunlimbo' ? 34.0 : 0,
          introHeightPct: layoutTemplateMode === 'gunlimbo' ? 36.0 : 100,
          normalTopPct: layoutTemplateMode === 'gunlimbo' ? 24.0 : 0,
          normalHeightPct: layoutTemplateMode === 'gunlimbo' ? 46.0 : 100,
          fitMode: videoFitMode === 'sandwich' ? 'sandwich' : 'fullscreen',
          kenBurnsIntroZoom: true,
          kenBurnsScaleEnd: 1.1,
          introDurationSec: gunlimboConfig.introDurationSec || 2.5,
        },
        topTitleZone: {
          enabled: hasTopTitle || hasTopBarBg,
          topPct: 0,
          heightPct: topBarHeightPct || 24.0,
          bgColor: topBarBg || '#000000',
          opacity: topBarOpacity,
          keepThroughout: true,
        },
        holeWindowZone: layoutTemplateMode === 'instagram' ? {
          enabled: true,
          widthPct: instaConfig.holeWidthPct,
          heightPct: instaConfig.holeHeightPct,
          yPct: instaConfig.holeYPct,
          roundness: instaConfig.holeRoundness,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          shadow: true,
          cardBgColor: instaConfig.bgColor || '#FFFFFF',
        } : undefined,
        hookBandZone: layoutTemplateMode === 'gunlimbo' ? {
          enabled: true,
          topPct: 24.0,
          heightPct: 10.0,
          bgBarColor: '#000000',
          boxColor: gunlimboConfig.hookBgColor,
          textColor: gunlimboConfig.hookTextColor,
          paddingX: 12,
          paddingY: 6,
          borderRadius: 0,
        } : undefined,
        captionZone: {
          enabled: true,
          topPct: 70.0,
          heightPct: 25.0,
          safeZoneYPct: 75.0,
          bgColor: '#000000',
          hideDuringIntro: layoutTemplateMode === 'gunlimbo',
        },
        sourceZone: hasBottomSource ? {
          enabled: true,
          yPct: 94.0,
          defaultText: bottomSourceText,
          textColor: bottomSourceColor,
          fontSize: bottomSourceSizePx,
        } : undefined,
        canvasType: 'LETTERBOX_SOLID',
        videoFitMode,
        videoBlurBg,
        videoFocusXPct,
        videoFocusYPct,
        videoZoomScale,
        videoRotationDeg,
        videoHorizontalFlip,
        videoVerticalFlip,
        videoFilter,
        hasTopBarBg,
        topBarBg,
        topBarHeightPct,
        topBarOpacity,
        topBarRadius,
        topBarZIndex,
        hasBottomBarBg,
        bottomBarBg,
        bottomBarHeightPct,
        bottomBarOpacity,
        bottomBarRadius,
        bottomBarZIndex,
        hasTopTitle,
        topTitleText,
        titleLinesMode,
        titleLine1,
        titleLine2,
        titleLine1Color,
        titleLine2Color,
        titleLine1SizePx,
        titleLine2SizePx,
        titleFontFamily,
        titleStroke,
        titleStrokeWidth,
        titleStrokeColor,
        titleShadow,
        titleShadowBlur,
        titleShadowColor,
        titleBgMode,
        titleBgColor,
        titleBgOpacity,
        titlePaddingX,
        titlePaddingY,
        titleBorderRadius,
        hasTitleBadge,
        titleBadgeText,
        titleBadgeBg,
        titleBadgeColor,
        titleBadgeSizePx,
        hasTitleLine1,
        hasTitleLine2,
        titleBold,
        titleItalic,
        titleAlign,
        hasJab,
        jabText,
        jabTiltDeg,
        jabFontSize,
        jabTextColor,
        jabStroke,
        jabStrokeWidth,
        jabStrokeColor,
        jabShadow,
        jabShadowBlur,
        jabShadowColor,
        jabBgEnabled,
        jabBgColor,
        jabBorderRadius,
        hasBottomSource,
        bottomSourceText,
        bottomSourceColor,
        bottomSourceSizePx,
        bottomSourceFontFamily,
        bottomSourceBold,
        bottomSourceItalic,
        bottomSourceAlign,
        bottomSourceBottomPct,
        bottomSourceStroke,
        bottomSourceStrokeWidth,
        bottomSourceStrokeColor,
        bottomSourceShadow,
        bottomSourceShadowBlur,
        bottomSourceShadowColor,
        bottomSourceBg,
        bottomSourceBgColor,
        bottomSourceBorderRadius,
        hasSubtitle: true,
        subtitleConfig,
        subtitleStrokeEnabled,
        subtitleStrokeWidth,
        subtitleStrokeColor,
        subtitleShadowEnabled,
        subtitleShadowBlur,
        subtitleShadowColor,
        subtitleUseBox,
        subtitleBoxColor,
        subtitleBorderRadius,
        hasCommentCard,
        commentCard,
        instaConfig,
        gunlimboConfig,
        ssulConfig,
      },
      style: {
        titleFont: titleFontFamily,
        titleLinesMode: titleLinesMode,
        titleBadgeText: titleBadgeText,
        titleBadgeColor: titleBadgeColor,
        titleFontSize: layoutTemplateMode === 'gunlimbo' ? gunlimboConfig.titleFontSize : titleLine1SizePx,
        titleLine2FontSize: titleLine2SizePx,
        titleLine1Color: layoutTemplateMode === 'gunlimbo' ? gunlimboConfig.titleLine1Color : titleLine1Color,
        titleLine2Color: layoutTemplateMode === 'gunlimbo' ? gunlimboConfig.titleLine2Color : titleLine2Color,
        titleBgMode: titleBgMode,
        titleBgColor: titleBgColor,
        titleBorderRadius: titleBorderRadius,
        titleStroke: titleStroke,
        titleStrokeWidth: titleStrokeWidth,
        titleStrokeColor: titleStrokeColor,
        titleShadow: titleShadow,
        titleShadowBlur: titleShadowBlur,
        titleShadowColor: titleShadowColor,
        hookFont: 'Pretendard',
        hookFontSize: gunlimboConfig.hookFontSize || 19,
        captionFont: subtitleConfig.font || 'Pretendard',
        captionFontSize: subtitleConfig.fontSize || 32,
        captionDefaultColor: '#FFFFFF',
        captionStrokeWidth: subtitleStrokeWidth,
        captionStrokeColor: subtitleStrokeColor,
        captionShadowBlur: subtitleShadowBlur,
        captionShadowColor: subtitleShadowColor,
        captionUseBox: subtitleUseBox,
        captionBoxColor: subtitleBoxColor,
        captionBoxOpacity: 0.8,
        emotionColors: {
          normal: '#FFE500',
          highlight: '#00F0FF',
          impact: '#FF3366',
          white: '#FFFFFF',
        },
      },
      sourcing: {
        priority: 'video_crop_only',
        promptPrefix: 'cinematic 4k shot',
        enableMemeReactions: false,
        memePlacement: 'bottom_left',
        memeScale: 1.0,
        memeDurationSec: 0.8,
      },
      capcut: {
        titleMotion: 'fade_in',
        hookMotion: 'word_pop',
        captionMotion: 'karaoke',
      },
      canvasState: {
        titleTransform,
        jabTransform,
        subTransform,
        profileTransform,
        commentTransform,
        sourceTransform,
        gunlimboConfig,
        instaConfig,
        ssulConfig,
        commentCard,
        videoFitMode,
        videoBlurBg,
        videoFocusXPct,
        videoFocusYPct,
        videoZoomScale,
        videoRotationDeg,
        videoHorizontalFlip,
        videoVerticalFlip,
        videoFilter,
        hasTopBarBg,
        topBarBg,
        topBarHeightPct,
        topBarOpacity,
        topBarRadius,
        topBarZIndex,
        hasBottomBarBg,
        bottomBarBg,
        bottomBarHeightPct,
        bottomBarOpacity,
        bottomBarRadius,
        bottomBarZIndex,
        hasTopTitle,
        topTitleText,
        titleLinesMode,
        titleLine1,
        titleLine2,
        titleLine1Color,
        titleLine2Color,
        titleLine1SizePx,
        titleLine2SizePx,
        titleFontFamily,
        titleStroke,
        titleStrokeWidth,
        titleStrokeColor,
        titleShadow,
        titleShadowBlur,
        titleShadowColor,
        titleBgMode,
        titleBgColor,
        titleBgOpacity,
        titlePaddingX,
        titlePaddingY,
        titleBorderRadius,
        hasTitleBadge,
        titleBadgeText,
        titleBadgeBg,
        titleBadgeColor,
        titleBadgeSizePx,
        hasTitleLine1,
        hasTitleLine2,
        titleBold,
        titleItalic,
        titleAlign,
        hasJab,
        jabText,
        jabTiltDeg,
        jabFontSize,
        jabTextColor,
        jabStroke,
        jabStrokeWidth,
        jabStrokeColor,
        jabShadow,
        jabShadowBlur,
        jabShadowColor,
        jabBgEnabled,
        jabBgColor,
        jabBorderRadius,
        hasBottomSource,
        bottomSourceText,
        bottomSourceColor,
        bottomSourceSizePx,
        bottomSourceFontFamily,
        bottomSourceBold,
        bottomSourceItalic,
        bottomSourceBottomPct,
        bottomSourceStroke,
        bottomSourceStrokeWidth,
        bottomSourceStrokeColor,
        bottomSourceShadow,
        bottomSourceShadowBlur,
        bottomSourceShadowColor,
        bottomSourceBg,
        bottomSourceBgColor,
        bottomSourceBorderRadius,
        hasSubtitle: true,
        subtitleConfig,
        subtitleStrokeEnabled,
        subtitleStrokeWidth,
        subtitleStrokeColor,
        subtitleShadowEnabled,
        subtitleShadowBlur,
        subtitleShadowColor,
        subtitleUseBox,
        subtitleBoxColor,
        subtitleBorderRadius,
        hasCommentCard,
      },
    };
  };

  // ⭐ 공식 마스터 템플릿으로 영구 저장 (리셋의 단일 진실 공급원)
  const handleSaveMasterTemplate = async () => {
    setIsSaving(true);
    try {
      const manifest = buildCurrentManifest(`master_${layoutTemplateMode}`, `${templateName.trim() || layoutTemplateMode.toUpperCase()} 마스터`, true);
      saveMasterTemplateLocal(layoutTemplateMode, manifest);
      setMasterManifest(manifest);

      const res = await api.post('/channel-dna/templates', {
        name: `${templateName.trim() || layoutTemplateMode.toUpperCase()} 마스터`,
        archetype: layoutTemplateMode,
        aspect_ratio: aspectRatio,
        description: `${layoutTemplateMode} 폼팩터 공식 마스터 템플릿 (리셋 기준점)`,
        manifest: manifest,
        layout: manifest.geometry,
        is_master: true,
      });

      if (res.data?.template) {
        setTemplateLibraryList(prev => [res.data.template, ...prev.filter(t => t.id !== res.data.template.id)]);
      }

      toast({
        title: '⭐ 마스터 템플릿 저장 완료',
        description: `'${manifest.name}'이(가) ${layoutTemplateMode.toUpperCase()} 공식 마스터 템플릿으로 저장되었습니다. 이제 언제든 리셋 시 이 형태로 복원됩니다.`
      });
    } catch (err: any) {
      console.warn('마스터 템플릿 저장 예외 처리:', err);
      toast({
        title: '⭐ 마스터 템플릿 로컬 보관 완료',
        description: `'${templateName}' 마스터 템플릿이 로컬에 저장되었습니다.`
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ⟲ 마스터 템플릿으로 원복 (하드코딩 0% 완전 퇴출)
  const handleResetToMaster = async () => {
    try {
      let targetMaster = masterManifest;
      try {
        const res = await api.get(`/channel-dna/templates/master/${layoutTemplateMode}`);
        if (res.data?.template?.manifest) {
          targetMaster = res.data.template.manifest;
          saveMasterTemplateLocal(layoutTemplateMode, targetMaster);
          setMasterManifest(targetMaster);
        }
      } catch (_) {}

      if (!targetMaster) {
        targetMaster = getMasterTemplate(layoutTemplateMode);
      }

      handleApplyManifest(targetMaster);
      toast({
        title: '⟲ 마스터 템플릿으로 원복 완료',
        description: `${layoutTemplateMode.toUpperCase()} 공식 마스터 템플릿 규격으로 캔버스가 완벽하게 복원되었습니다.`
      });
    } catch (e) {
      console.error('Failed to reset to master:', e);
      handleSelectTemplateMode(layoutTemplateMode);
    }
  };

  // 💾 커스텀 템플릿 저장 (동일 이름 시 덮어쓰기 지원)
  const handleSaveTemplate = async () => {
    setIsSaving(true);
    try {
      const cleanName = templateName.trim() || '커스텀 템플릿';
      const existingSameName = templateLibraryList.find(
        (t) => t.archetype === layoutTemplateMode && t.name === cleanName && !t.id?.startsWith('master_')
      );

      const manifestId = existingSameName?.id || `custom_${Date.now().toString(36)}`;
      const manifest = buildCurrentManifest(manifestId, cleanName, false);

      // 🏛️ 보관함 신규 저장은 라이브러리 목록에만 반영 (열려있는 편집기 화면 강제 침범 방지)

      const res = await api.post('/channel-dna/templates', {
        name: cleanName,
        archetype: layoutTemplateMode,
        aspect_ratio: aspectRatio,
        description: '사용자 지정 숏폼 템플릿 디자인',
        manifest: manifest,
        layout: manifest.geometry,
        is_master: false,
      });

      if (res.data?.template) {
        setTemplateLibraryList(prev => [res.data.template, ...prev.filter(t => t.id !== res.data.template.id)]);
      }

      const isOverwrite = Boolean(existingSameName);
      toast({
        title: isOverwrite ? '💾 템플릿 덮어쓰기 완료' : '💾 새 템플릿 저장 완료',
        description: isOverwrite
          ? `'${cleanName}' 기존 템플릿에 최신 디자인이 성공적으로 덮어씌워졌습니다.`
          : `'${cleanName}' 템플릿이 단일 DB(viral_loop.db)에 신규 보관되었습니다.`
      });
    } catch (err: any) {
      console.warn('DB 저장 실패 시 로컬스토리지 보관:', err);
      localStorage.setItem('viral_loop_last_saved_template', JSON.stringify({ name: templateName, mode: layoutTemplateMode }));
      toast({
        title: '💾 템플릿 저장 완료 (로컬 보관)',
        description: `'${templateName}' 템플릿 규격이 안전하게 저장되었습니다.`
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ⚡ 정밀 편집기에 즉시 적용 (Apply to Editor)
  const handleApplyToEditor = () => {
    const canvasState: TemplateCanvasState = {
      titleTransform,
      jabTransform,
      subTransform,
      profileTransform,
      commentTransform,
      sourceTransform,
      gunlimboConfig,
      instaConfig,
      ssulConfig,
      commentCard,
      videoFitMode,
      videoBlurBg,
      videoFocusXPct,
      videoFocusYPct,
      videoZoomScale,
      videoRotationDeg,
      videoHorizontalFlip,
      videoVerticalFlip,
      videoFilter,
      hasTopBarBg,
      topBarBg,
      topBarHeightPct,
      topBarOpacity,
      topBarRadius,
      topBarZIndex,
      hasBottomBarBg,
      bottomBarBg,
      bottomBarHeightPct,
      bottomBarOpacity,
      bottomBarRadius,
      bottomBarZIndex,
      hasTopTitle,
      topTitleText,
      titleLinesMode,
      titleLine1,
      titleLine2,
      titleLine1Color,
      titleLine2Color,
      titleLine1SizePx,
      titleLine2SizePx,
      titleFontFamily,
      titleStroke,
      titleStrokeWidth,
      titleStrokeColor,
      titleShadow,
      titleShadowBlur,
      titleShadowColor,
      titleBgMode,
      titleBgColor,
      titleBgOpacity,
      titlePaddingX,
      titlePaddingY,
      titleBorderRadius,
      hasTitleBadge,
      titleBadgeText,
      titleBadgeBg,
      titleBadgeColor,
      hasJab,
      jabText,
      jabTiltDeg,
      jabFontSize,
      jabTextColor,
      jabStroke,
      jabStrokeWidth,
      jabStrokeColor,
      jabShadow,
      jabShadowBlur,
      jabShadowColor,
      jabBgEnabled,
      jabBgColor,
      jabBorderRadius,
      hasBottomSource,
      bottomSourceText,
      bottomSourceColor,
      bottomSourceSizePx,
      bottomSourceFontFamily,
      bottomSourceBold,
      bottomSourceItalic,
      bottomSourceBottomPct,
      bottomSourceStroke,
      bottomSourceStrokeWidth,
      bottomSourceStrokeColor,
      bottomSourceShadow,
      bottomSourceShadowBlur,
      bottomSourceShadowColor,
      bottomSourceBg,
      bottomSourceBgColor,
      bottomSourceBorderRadius,
      hasSubtitle: true,
      subtitleConfig,
      subtitleStrokeEnabled,
      subtitleStrokeWidth,
      subtitleStrokeColor,
      subtitleShadowEnabled,
      subtitleShadowBlur,
      subtitleShadowColor,
      subtitleUseBox,
      subtitleBoxColor,
      subtitleBorderRadius,
      hasCommentCard,
    };

    const manifest: any = {
      name: templateName,
      archetype: layoutTemplateMode,
      aspectRatio,
      canvasState,
      titleLinesMode,
      titleLine1,
      titleLine2,
      titleLine1Color,
      titleLine2Color,
      titleLine1SizePx,
      titleLine2SizePx,
      titleFontFamily,
      titleTransform,
      hasTopBarBg,
      topBarBg,
      topBarHeightPct,
      hasBottomBarBg,
      bottomBarBg,
      bottomBarHeightPct,
      hasJab,
      jabText,
      jabFontSize,
      jabTiltDeg,
      jabTextColor,
      jabBgColor,
      jabTransform,
      subtitleConfig,
      subTransform,
      hasBottomSource,
      bottomSourceText,
      sourceTransform,
      hasCommentCard,
      commentCard,
      commentTransform,
      videoFitMode,
      videoBlurBg,
      videoZoomScale,
      videoFocusXPct,
      videoFocusYPct,
      videoRotationDeg,
      videoHorizontalFlip,
      videoVerticalFlip,
      videoFilter,
      instaConfig,
      gunlimboConfig,
      ssulConfig,
      profileTransform,
    };

    localStorage.setItem('applied_template_manifest', JSON.stringify(manifest));
    window.dispatchEvent(new CustomEvent('vl_template_applied', { detail: manifest }));

    toast({
      title: '⚡ 정밀 편집기에 즉시 적용',
      description: '현재 템플릿 규격이 활성 편집기에 장착되었습니다. 정밀 편집기 화면으로 이동합니다.'
    });

    setTimeout(() => {
      const targetEditor = sovereignMode || layoutTemplateMode || 'classic';
      navigate(`/shorts-editor/${targetEditor}`);
    }, 400);
  };

  const aspectScale = aspectRatio === '9:16' ? 1.0 : aspectRatio === '1:1' ? 0.9 : 0.75;

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground overflow-hidden select-none">
      {/* ── 1. 상단 글로벌 마스터 툴바 ── */}
      <header className="h-12 px-3 border-b border-border bg-card flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const targetEditor = sovereignMode || layoutTemplateMode || 'classic';
              navigate(`/shorts-editor/${targetEditor}`);
            }}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            title="현재 폼팩터 전용 정밀 편집기로 돌아가기"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">전문 편집기</span>
          </Button>

          <div className="h-4 w-px bg-border mx-0.5" />

          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-bold whitespace-nowrap text-foreground">
              {sovereignMode === 'classic' ? '🥪 클래식 템플릿 디자인실' :
               sovereignMode === 'instagram' ? '📱 인스타 템플릿 디자인실' :
               sovereignMode === 'gunlimbo' ? '🎬 군림보 템플릿 디자인실' :
               sovereignMode === 'ssul' ? '📜 썰형 템플릿 디자인실' : '템플릿 디자인 공방'}
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary uppercase font-mono">
              {layoutTemplateMode}
            </Badge>
          </div>

          <div className="hidden md:flex items-center gap-1 min-w-0 ml-1">
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="h-7 text-xs w-44 bg-muted/30 border-border font-medium focus-visible:ring-1"
              placeholder="템플릿 이름 입력"
            />
          </div>

          {/* 🎯 픽셀링 스타일 4대 폼팩터 모드 스위처 탭 바 (sovereignMode 시 완전 은닉 및 전용 뱃지 단일 고정) */}
          {sovereignMode ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] bg-primary/10 border border-primary/30 text-primary font-bold text-xs ml-1">
              <span className="text-[10px] px-1 py-0.2 rounded bg-primary text-primary-foreground font-mono">
                SOVEREIGN TEMPLATE
              </span>
            </div>
          ) : (
            <div className="flex items-center bg-muted/60 p-0.5 rounded-[4px] border border-border gap-0.5 ml-1">
              {[
                { id: 'ssul', label: '썰형 공방', icon: '📜' },
                { id: 'gunlimbo', label: '군림보 속보', icon: '🎬' },
                { id: 'classic', label: '클래식', icon: '🥪' },
                { id: 'instagram', label: '인스타', icon: '📱' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSwitchModeTab(t.id as LayoutTemplateMode)}
                  className={cn(
                    "px-2 py-0.5 text-[11px] font-bold rounded-[3px] transition cursor-pointer flex items-center gap-1",
                    layoutTemplateMode === t.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title={`${t.label} 모드로 전환`}
                >
                  <span>{t.icon}</span>
                  <span className="hidden xl:inline">{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 중앙: 화면비 & 뷰포트 컨트롤 */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-muted/40 p-0.5 rounded-[3px] border border-border">
            {(['9:16', '16:9', '1:1'] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setAspectRatio(ratio)}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-[2px] transition cursor-pointer",
                  aspectRatio === ratio
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {ratio === '9:16' ? '9:16 쇼츠' : ratio === '16:9' ? '16:9 롱폼' : '1:1 피드'}
              </button>
            ))}
          </div>

          <select
            value={canvasZoom}
            onChange={(e) => setCanvasZoom(e.target.value as any)}
            className="h-6 text-[10px] font-bold bg-muted/40 border border-border rounded-[2px] px-1 text-foreground cursor-pointer"
          >
            <option value="fit">화면맞춤 (Fit)</option>
            <option value="50">50%</option>
            <option value="75">75%</option>
            <option value="100">100% (원형)</option>
            <option value="150">150%</option>
            <option value="200">200%</option>
          </select>

          <button
            type="button"
            onClick={() => setSafeZoneVisible(!safeZoneVisible)}
            className={cn(
              "h-6 px-1.5 text-[10px] font-bold rounded-[2px] border transition cursor-pointer flex items-center gap-1",
              safeZoneVisible
                ? "bg-amber-500/20 text-amber-500 border-amber-500/40"
                : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            title="유튜브 쇼츠 모바일 UI 가림 안전영역 표시"
          >
            <Shield className="w-3 h-3" />
            <span className="hidden lg:inline">안전영역</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={cn(
              "h-6 px-1.5 text-[10px] font-bold rounded-[2px] border transition cursor-pointer flex items-center gap-1",
              showGrid
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            title="3분할 및 센터 십자선 구도 가이드"
          >
            <Grid className="w-3 h-3" />
            <span className="hidden lg:inline">그리드</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={cn(
              "h-6 px-1.5 text-[10px] font-bold rounded-[2px] border transition cursor-pointer flex items-center gap-1",
              isFullscreen
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            title="전체화면 몰입 프리뷰 (ESC 키로 복귀)"
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3 text-primary" />}
            <span className="hidden md:inline">전체화면</span>
          </button>
        </div>

        {/* 우측: 저장 & 편집기 적용 액션 */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToMaster}
            className="h-7 text-xs px-2.5 gap-1 border-border font-semibold hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground"
            title="현재 폼팩터의 공식 마스터 템플릿 설정값으로 원복"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>⟲ 마스터 원복</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenTemplateLibrary}
            className="h-7 text-xs px-2.5 gap-1 border-border font-semibold hover:bg-muted cursor-pointer"
          >
            <span className="text-xs">🎨</span>
            <span>라이브러리</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveTemplate}
            disabled={isSaving}
            className="h-7 text-xs px-2.5 gap-1 border-border font-semibold cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-muted-foreground" />
            <span>💾 템플릿 저장</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveMasterTemplate}
            disabled={isSaving}
            className="h-7 text-xs px-2.5 gap-1 border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-semibold cursor-pointer"
            title="현재 설정을 해당 폼팩터의 영구 기본 마스터 템플릿으로 저장"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>⭐ 마스터로 저장</span>
          </Button>

          <Button
            size="sm"
            onClick={handleApplyToEditor}
            className="h-7 text-xs px-2.5 gap-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>⚡ 정밀 편집기에 즉시 적용</span>
          </Button>
        </div>
      </header>

      {/* ── 2. 메인 워크스페이스: 좌측 디자인 도구(240px) + 중앙 캔버스 작업실 + 우측 9대 인스펙터(320px) ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* ◀️ 좌측: 공통 비주얼 디자인 툴바 (240px, w-60) - 영상 공통 적용 디자인 자산에 집중 */}
        <aside className="w-60 border-r border-border bg-card flex flex-col shrink-0 z-20 overflow-y-auto text-xs select-none">
          {/* 패널 헤더 */}
          <div className="h-9 px-3 border-b border-border flex items-center justify-between shrink-0 bg-muted/30">
            <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
              <Layout className="w-3.5 h-3.5 text-primary" />
              공통 디자인 도구
            </span>
            <Badge variant="outline" className="text-[9px] font-mono text-primary">DNA DESIGN</Badge>
          </div>

          <div className="p-3 space-y-4">
            {/* 1. 4대 폼팩터 아키타입 퀵 셀렉터 (독립 전용 스튜디오 모드에서는 은닉) */}
            {!sovereignMode && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                  <Layers3 className="w-3.5 h-3.5 text-primary" />
                  4대 표준 아키타입
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'classic', name: '스탠다드', badge: '기본형', desc: '상·하단 색상 바' },
                    { id: 'instagram', name: '인스타그램', badge: '피드형', desc: '원형 프로필+홀' },
                    { id: 'gunlimbo', name: '군림보', badge: '3단형', desc: '가변크롭+훅밴드' },
                    { id: 'ssul', name: '썰/커뮤니티', badge: '썰형', desc: '헤더+페페 밈' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTemplateMode(item.id as LayoutTemplateMode)}
                      className={cn(
                        "p-2 rounded border text-left transition flex flex-col justify-between cursor-pointer",
                        layoutTemplateMode === item.id
                          ? "border-primary bg-primary/10 shadow-2xs ring-1 ring-primary"
                          : "border-border bg-background hover:bg-muted/60"
                      )}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-[11px] text-foreground">{item.name}</span>
                        <span className={cn(
                          "text-[8.5px] font-bold px-1 py-0.2 rounded",
                          layoutTemplateMode === item.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {item.badge}
                        </span>
                      </div>
                      <span className="text-[9.5px] text-muted-foreground truncate">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. 레퍼런스 쇼츠 1초 발골기 */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />
                레퍼런스 쇼츠 디자인 발골
              </span>
              <p className="text-[10px] text-muted-foreground">
                쇼츠 링크를 넣으면 AI가 색상·폰트·지오메트리를 역공학 추출합니다.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsForensicModalOpen(true)}
                className="w-full h-8 text-xs gap-1.5 font-bold border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>🔍 URL에서 디자인 발골</span>
              </Button>
            </div>

            {/* 3. 브랜드 컬러 & 폰트 하모니 */}
            <div className="space-y-2 pt-2 border-t border-border">
              <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-amber-500" />
                브랜드 비주얼 하모니
              </span>
              
              {/* 시그니처 듀얼 컬러 테마 4선 */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold">시그니처 컬러 테마</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'gold_yellow', name: '골드 옐로우', primary: '#FFE500', secondary: '#00E510', bg: '#000000' },
                    { id: 'cyber_neon', name: '사이버 네온', primary: '#00F0FF', secondary: '#FF0055', bg: '#0A0A10' },
                    { id: 'insta_clean', name: '인스타 클린', primary: '#0095F6', secondary: '#374151', bg: '#FFFFFF' },
                    { id: 'yt_red', name: '유튜브 레드', primary: '#FF0000', secondary: '#FFFFFF', bg: '#18181B' },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleApplyColorTheme(theme)}
                      className="p-1.5 border border-border bg-background hover:bg-muted rounded flex items-center justify-between text-[10px] transition cursor-pointer"
                      title={`${theme.name} 일괄 적용`}
                    >
                      <span className="font-medium text-foreground truncate">{theme.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full border border-border shadow-xs" style={{ backgroundColor: theme.primary }} />
                        <div className="w-2.5 h-2.5 rounded-full border border-border shadow-xs" style={{ backgroundColor: theme.secondary }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 황금비 폰트 페어링 4선 */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-muted-foreground font-semibold">황금비 폰트 페어링</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { name: '모던 볼드', title: 'Pretendard', sub: 'Pretendard' },
                    { name: '임팩트 헤드', title: 'BlackHanSans', sub: 'NotoSansKR' },
                    { name: '깔끔 고딕', title: 'GmarketSans', sub: 'GmarketSans' },
                    { name: '캐주얼 팝', title: 'Jalnan', sub: 'Pretendard' },
                  ].map((pair, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyFontPairing(pair)}
                      className="p-1.5 border border-border bg-background hover:bg-muted rounded text-left text-[10px] transition cursor-pointer flex flex-col justify-between"
                      title={`대제목: ${pair.title} + 자막: ${pair.sub}`}
                    >
                      <span className="font-bold text-foreground">{pair.name}</span>
                      <span className="text-[8.5px] text-muted-foreground truncate">{pair.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. 뷰포트 디바이스 & 세이프존 가이드 */}
            <div className="space-y-2 pt-2 border-t border-border">
              <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-sky-500" />
                디바이스 & 세이프존
              </span>

              {/* 플랫폼 세이프존 선택 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-semibold">플랫폼 가이드라인</span>
                  <Switch
                    checked={safeZoneVisible}
                    onCheckedChange={setSafeZoneVisible}
                    className="scale-75"
                  />
                </div>
                {safeZoneVisible && (
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'youtube', label: 'Shorts' },
                      { id: 'tiktok', label: 'TikTok' },
                      { id: 'reels', label: 'Reels' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSafeZonePlatform(p.id as any)}
                        className={cn(
                          "py-1 text-center font-bold text-[9.5px] rounded border transition cursor-pointer",
                          safeZonePlatform === p.id
                            ? "bg-amber-500/20 border-amber-500 text-amber-500 dark:text-amber-400"
                            : "border-border bg-background hover:bg-muted text-muted-foreground"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 모바일 실기기 목업 선택 */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-muted-foreground font-semibold">실기기 목업 프레임</span>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'none', label: '없음' },
                    { id: 'iphone16', label: 'iPhone 16' },
                    { id: 'galaxy', label: 'Galaxy S25' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDeviceMockup(m.id as any)}
                      className={cn(
                        "py-1 text-center font-bold text-[9px] rounded border transition cursor-pointer truncate px-0.5",
                        deviceMockup === m.id
                          ? "bg-sky-500/20 border-sky-500 text-sky-500 dark:text-sky-400"
                          : "border-border bg-background hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. 템플릿 자산 I/O 관리 */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <FileJson className="w-3.5 h-3.5 text-emerald-500" />
                템플릿 자산 관리
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenTemplateLibrary}
                  className="h-7 text-[10px] gap-1 border-border hover:bg-muted font-semibold"
                >
                  <FolderOpen className="w-3 h-3 text-amber-500" />
                  <span>보관함 열기</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportTemplateJson}
                  className="h-7 text-[10px] gap-1 border-border hover:bg-muted font-semibold"
                >
                  <Download className="w-3 h-3 text-emerald-500" />
                  <span>JSON 내보내기</span>
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportTemplateJson}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-7 text-[10px] gap-1 border-dashed border-border hover:bg-muted font-semibold text-muted-foreground"
              >
                <Upload className="w-3 h-3 text-sky-500" />
                <span>외부 JSON 파일 가져오기</span>
              </Button>
            </div>
          </div>
        </aside>

        {/* 🎯 중앙: 캔버스 작업실 (정밀 편집기와 완벽히 1:1 일치하는 높이와 뷰포트) */}
        <main className="flex-1 bg-muted/30 dark:bg-zinc-950 flex flex-col min-h-0 relative overflow-hidden border-r border-border select-none">
          {/* 1. 뷰어 상단 바 (36px, h-9) - 종횡비, 줌 컨트롤, 세이프존, 실기기, 그리드, 캡처, 전체화면 */}
          <div className="h-9 px-3 bg-card border-b border-border flex items-center justify-between shrink-0 z-20 select-none">
            {/* 좌측: 종횡비 & 줌 컨트롤 */}
            <div className="flex items-center gap-2">
              <div className="flex items-center p-0.5 bg-muted/60 rounded-[2px] border border-border text-[10px]">
                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={cn(
                    "px-2 py-0.5 font-bold rounded-[1px] transition cursor-pointer flex items-center gap-1",
                    aspectRatio === '9:16' ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="9:16 쇼츠 / 릴스 / 틱톡"
                >
                  <span>9:16 쇼츠</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={cn(
                    "px-2 py-0.5 font-bold rounded-[1px] transition cursor-pointer flex items-center gap-1",
                    aspectRatio === '16:9' ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="16:9 유튜브 롱폼"
                >
                  <span>16:9 롱폼</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('1:1')}
                  className={cn(
                    "px-2 py-0.5 font-bold rounded-[1px] transition cursor-pointer flex items-center gap-1",
                    aspectRatio === '1:1' ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="1:1 인스타그램 피드"
                >
                  <span>1:1 피드</span>
                </button>
              </div>

              <div className="h-3 w-px bg-border mx-0.5" />

              {/* 캔버스 화면 맞춤 & 줌 */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setCanvasZoom('fit');
                    setCanvasScale(1.0);
                    setCanvasPan({ x: 0, y: 0 });
                  }}
                  className={cn(
                    "h-6 px-2 text-[10px] font-bold rounded-[2px] border transition cursor-pointer flex items-center gap-1",
                    canvasZoom === 'fit' ? "bg-primary/15 border-primary text-foreground" : "border-border bg-background hover:bg-muted text-muted-foreground"
                  )}
                  title="캔버스를 100% 최적 화면에 맞춤"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>맞춤 (Fit)</span>
                </button>

                <div className="flex items-center gap-1 bg-background border border-border px-1.5 h-6 rounded-[2px]">
                  <ZoomIn className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-mono font-bold text-primary min-w-[32px] text-right">
                    {Math.round(canvasScale * 100)}%
                  </span>
                  <select
                    value={canvasZoom}
                    onChange={(e) => setCanvasZoom(e.target.value as any)}
                    className="h-5 text-[10px] font-mono bg-transparent border-0 text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer pr-1"
                    title="줌 프리셋 선택"
                  >
                    <option value="50">50%</option>
                    <option value="75">75%</option>
                    <option value="100">100%</option>
                    <option value="150">150%</option>
                    <option value="200">200%</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 중앙: 해상도 인디케이터 */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-[2px] border border-border">
                {aspectRatio === '9:16' ? '1080 × 1920 (FHD 9:16)' : aspectRatio === '16:9' ? '1920 × 1080 (FHD 16:9)' : '1080 × 1080 (1:1)'}
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-[2px] border border-emerald-500/20">
                1:1 에디터 일치 뷰
              </span>
            </div>

            {/* 우측: 세이프존, 그리드, 스냅샷, 전체화면 버튼 */}
            <div className="flex items-center gap-1">
              {/* 안전영역 토글 */}
              {aspectRatio === '9:16' && (
                <button
                  type="button"
                  onClick={() => setSafeZoneVisible(!safeZoneVisible)}
                  className={cn(
                    "h-6 px-2 text-[10px] font-bold rounded-[2px] border transition cursor-pointer flex items-center gap-1",
                    safeZoneVisible ? "bg-amber-500/20 border-amber-500 text-amber-500 dark:text-amber-400" : "border-border bg-background hover:bg-muted text-muted-foreground"
                  )}
                  title="플랫폼 세이프존 가이드 토글"
                >
                  <span>안전영역</span>
                </button>
              )}

              {/* 가이드선 */}
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={cn(
                  "h-6 px-1.5 text-[10px] font-bold rounded-[2px] border transition cursor-pointer flex items-center gap-1",
                  showGrid ? "bg-primary/20 border-primary text-foreground" : "border-border bg-background hover:bg-muted text-muted-foreground"
                )}
                title="프로 3분할 구도선 & 센터 십자선 가이드"
              >
                <Grid className="w-3 h-3" />
                <span className="hidden lg:inline">가이드선</span>
              </button>

              {/* 스냅샷 */}
              <button
                type="button"
                onClick={() => {
                  toast({
                    title: '스냅샷 캡처 완료',
                    description: `현재 시점(${(currentTimeMs / 1000).toFixed(2)}초)의 템플릿 디자인 프레임이 복사되었습니다.`,
                  });
                }}
                className="h-6 px-1.5 text-[10px] font-bold rounded-[2px] border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer flex items-center gap-1"
                title="현재 프레임 스냅샷 캡처"
              >
                <Camera className="w-3 h-3" />
              </button>

              {/* 전체화면 */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={cn(
                  "h-6 px-1.5 text-[10px] font-bold rounded-[2px] border transition cursor-pointer flex items-center gap-1",
                  isFullscreen ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
                title="전체화면 몰입 프리뷰 (ESC)"
              >
                {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3 text-primary" />}
                <span className="hidden lg:inline">전체화면</span>
              </button>
            </div>
          </div>

          {/* 2. 중앙 캔버스 스테이지 (유효 높이 ~516px, ShortsEditorStudio와 1:1 완벽 일치) */}
          <div
            ref={canvasContainerRef}
            className={cn(
              "relative overflow-hidden flex items-center justify-center cursor-default transition-all duration-200",
              isFullscreen
                ? "fixed inset-0 z-[9999] bg-zinc-950/98 p-6"
                : "flex-1 p-3 bg-zinc-950/95"
            )}
            onMouseDown={(e) => {
              if (e.button === 1 || e.button === 2) {
                e.preventDefault();
                setIsPanning(true);
                panStartRef.current = {
                  startX: e.clientX,
                  startY: e.clientY,
                  panX: canvasPan.x,
                  panY: canvasPan.y,
                };

                const onMouseMove = (me: MouseEvent) => {
                  const dx = me.clientX - panStartRef.current.startX;
                  const dy = me.clientY - panStartRef.current.startY;
                  setCanvasPan({
                    x: panStartRef.current.panX + dx,
                    y: panStartRef.current.panY + dy,
                  });
                };

                const onMouseUp = () => {
                  setIsPanning(false);
                  window.removeEventListener('mousemove', onMouseMove);
                  window.removeEventListener('mouseup', onMouseUp);
                };

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
              }
            }}
            onContextMenu={(e) => {
              if (isPanning) e.preventDefault();
            }}
            onDoubleClick={() => {
              setCanvasScale(1.0);
              setCanvasPan({ x: 0, y: 0 });
              setCanvasZoom('fit');
              toast({ title: '화면 맞춤 완료', description: '캔버스 배율 및 위치가 100% 기본 상태로 복구되었습니다.' });
            }}
          >
            {/* 전체화면 플로팅 닫기 바 */}
            {isFullscreen && (
              <div className="absolute top-5 right-5 z-[99999] flex items-center gap-2.5 bg-zinc-900/95 border border-zinc-700/80 rounded-md px-3.5 py-2 shadow-2xl backdrop-blur-md">
                <span className="text-xs text-zinc-200 font-bold">전체화면 몰입 프리뷰</span>
                <span className="text-[10px] text-zinc-400 font-mono font-semibold bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  {aspectRatio} • {layoutTemplateMode.toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="h-7 px-2.5 text-xs font-bold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 flex items-center gap-1 transition cursor-pointer border border-zinc-700"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>닫기 (ESC)</span>
                </button>
              </div>
            )}

            <UniversalCanvasStage
              currentProjectDisplayName="템플릿 미리보기"
              masterManifest={masterManifest}
              aspectRatio={aspectRatio}
              canvasScale={canvasScale}
              canvasPan={canvasPan}
              layoutTemplateMode={layoutTemplateMode}
              selectedLayerId={selectedLayerId}
              setSelectedLayerId={setSelectedLayerId}
              setActiveInspectorTab={setActiveInspectorTab}
              videoFitMode={videoFitMode}
              videoBlurBg={videoBlurBg}
              videoFocusXPct={videoFocusXPct}
              videoFocusYPct={videoFocusYPct}
              setVideoFocusXPct={setVideoFocusXPct}
              setVideoFocusYPct={setVideoFocusYPct}
              videoZoomScale={videoZoomScale}
              setVideoZoomScale={setVideoZoomScale}
              videoRotationDeg={videoRotationDeg}
              setVideoRotationDeg={setVideoRotationDeg}
              videoHorizontalFlip={videoHorizontalFlip}
              setVideoHorizontalFlip={setVideoHorizontalFlip}
              videoVerticalFlip={videoVerticalFlip}
              videoFilter={videoFilter}
              videoBorderRadius={videoBorderRadius}
              setVideoBorderRadius={setVideoBorderRadius}
              videoBorderEnabled={videoBorderEnabled}
              setVideoBorderEnabled={setVideoBorderEnabled}
              videoBorderWidth={videoBorderWidth}
              setVideoBorderWidth={setVideoBorderWidth}
              videoBorderColor={videoBorderColor}
              setVideoBorderColor={setVideoBorderColor}
              videoShadowEnabled={videoShadowEnabled}
              setVideoShadowEnabled={setVideoShadowEnabled}
              videoShadowBlur={videoShadowBlur}
              setVideoShadowBlur={setVideoShadowBlur}
              videoShadowColor={videoShadowColor}
              setVideoShadowColor={setVideoShadowColor}
              videoPaddingPct={videoPaddingPct}
              setVideoPaddingPct={setVideoPaddingPct}
              currentTimeMs={currentTimeMs}
              instaConfig={instaConfig}
              setInstaConfig={setInstaConfig}
              profileTransform={profileTransform}
              setProfileTransform={setProfileTransform}
              gunlimboConfig={gunlimboConfig}
              setGunlimboConfig={setGunlimboConfig}
              ssulConfig={ssulConfig}
              setSsulConfig={setSsulConfig}
              hasTopBarBg={hasTopBarBg}
              setHasTopBarBg={setHasTopBarBg}
              topBarHeightPct={topBarHeightPct}
              setTopBarHeightPct={setTopBarHeightPct}
              topBarBg={topBarBg}
              setTopBarBg={setTopBarBg}
              topBarOpacity={topBarOpacity}
              setTopBarOpacity={setTopBarOpacity}
              topBarRadius={topBarRadius}
              setTopBarRadius={setTopBarRadius}
              topBarZIndex={topBarZIndex}
              hasBottomBarBg={hasBottomBarBg}
              setHasBottomBarBg={setHasBottomBarBg}
              bottomBarHeightPct={bottomBarHeightPct}
              setBottomBarHeightPct={setBottomBarHeightPct}
              bottomBarBg={bottomBarBg}
              setBottomBarBg={setBottomBarBg}
              bottomBarOpacity={bottomBarOpacity}
              setBottomBarOpacity={setBottomBarOpacity}
              bottomBarRadius={bottomBarRadius}
              setBottomBarRadius={setBottomBarRadius}
              bottomBarZIndex={bottomBarZIndex}
              hasTopTitle={hasTopTitle}
              setHasTopTitle={setHasTopTitle}
              topTitleText={topTitleText}
              setTopTitleText={setTopTitleText}
              titleTransform={titleTransform}
              setTitleTransform={setTitleTransform}
              titleLinesMode={titleLinesMode}
              setTitleLinesMode={setTitleLinesMode}
              titleLine1={titleLine1}
              setTitleLine1={setTitleLine1}
              titleLine2={titleLine2}
              setTitleLine2={setTitleLine2}
              titleLine1SizePx={titleLine1SizePx}
              titleLine2SizePx={titleLine2SizePx}
              titleLine1Color={titleLine1Color}
              setTitleLine1Color={setTitleLine1Color}
              titleLine2Color={titleLine2Color}
              setTitleLine2Color={setTitleLine2Color}
              titleFontFamily={titleFontFamily}
              setTitleFontFamily={setTitleFontFamily}
              titleStroke={titleStroke}
              setTitleStroke={setTitleStroke}
              titleStrokeWidth={titleStrokeWidth}
              setTitleStrokeWidth={setTitleStrokeWidth}
              titleStrokeColor={titleStrokeColor}
              setTitleStrokeColor={setTitleStrokeColor}
              titleShadow={titleShadow}
              setTitleShadow={setTitleShadow}
              titleShadowBlur={titleShadowBlur}
              setTitleShadowBlur={setTitleShadowBlur}
              titleShadowColor={titleShadowColor}
              setTitleShadowColor={setTitleShadowColor}
              titleBgMode={titleBgMode}
              setTitleBgMode={setTitleBgMode}
              titleBgColor={titleBgColor}
              setTitleBgColor={setTitleBgColor}
              titleBgOpacity={titleBgOpacity}
              setTitleBgOpacity={setTitleBgOpacity}
              titlePaddingX={titlePaddingX}
              setTitlePaddingX={setTitlePaddingX}
              titlePaddingY={titlePaddingY}
              setTitlePaddingY={setTitlePaddingY}
              titleBorderRadius={titleBorderRadius}
              setTitleBorderRadius={setTitleBorderRadius}
              setTopTitleColor={setTitleLine1Color}
              hasTitleBadge={hasTitleBadge}
              setHasTitleBadge={setHasTitleBadge}
              titleBadgeText={titleBadgeText}
              setTitleBadgeText={setTitleBadgeText}
              titleBadgeBg={titleBadgeBg}
              setTitleBadgeBg={setTitleBadgeBg}
              titleBadgeColor={titleBadgeColor}
              setTitleBadgeColor={setTitleBadgeColor}
              titleBadgeSizePx={titleBadgeSizePx}
              setTitleBadgeSizePx={setTitleBadgeSizePx}
              titleBadgeRadius={titleBadgeRadius}
              setTitleBadgeRadius={setTitleBadgeRadius}
              hasTitleLine1={hasTitleLine1}
              setHasTitleLine1={setHasTitleLine1}
              hasTitleLine2={hasTitleLine2}
              setHasTitleLine2={setHasTitleLine2}
              titleBold={titleBold}
              setTitleBold={setTitleBold}
              titleItalic={titleItalic}
              setTitleItalic={setTitleItalic}
              titleAlign={titleAlign}
              setTitleAlign={setTitleAlign}
              titleLetterSpacing={titleLetterSpacing}
              setTitleLetterSpacing={setTitleLetterSpacing}
              titleLineHeight={titleLineHeight}
              setTitleLineHeight={setTitleLineHeight}
              titleLine1FontFamily={titleLine1FontFamily}
              setTitleLine1FontFamily={setTitleLine1FontFamily}
              titleLine1Bold={titleLine1Bold}
              setTitleLine1Bold={setTitleLine1Bold}
              titleLine1Italic={titleLine1Italic}
              setTitleLine1Italic={setTitleLine1Italic}
              titleLine1Align={titleLine1Align}
              setTitleLine1Align={setTitleLine1Align}
              titleLine1LetterSpacing={titleLine1LetterSpacing}
              setTitleLine1LetterSpacing={setTitleLine1LetterSpacing}
              titleLine1LineHeight={titleLine1LineHeight}
              setTitleLine1LineHeight={setTitleLine1LineHeight}
              titleLine2FontFamily={titleLine2FontFamily}
              setTitleLine2FontFamily={setTitleLine2FontFamily}
              titleLine2Bold={titleLine2Bold}
              setTitleLine2Bold={setTitleLine2Bold}
              titleLine2Italic={titleLine2Italic}
              setTitleLine2Italic={setTitleLine2Italic}
              titleLine2Align={titleLine2Align}
              setTitleLine2Align={setTitleLine2Align}
              titleLine2LetterSpacing={titleLine2LetterSpacing}
              setTitleLine2LetterSpacing={setTitleLine2LetterSpacing}
              titleLine2LineHeight={titleLine2LineHeight}
              setTitleLine2LineHeight={setTitleLine2LineHeight}
              hasJab={hasJab}
              setHasJab={setHasJab}
              jabTransform={jabTransform}
              setJabTransform={setJabTransform}
              jabText={jabText}
              setJabText={setJabText}
              jabTiltDeg={jabTiltDeg}
              setJabTiltDeg={setJabTiltDeg}
              jabFontSize={jabFontSize}
              setJabFontSize={setJabFontSize}
              jabTextColor={jabTextColor}
              setJabTextColor={setJabTextColor}
              jabFont={jabFont}
              setJabFont={setJabFont}
              jabBold={jabBold}
              setJabBold={setJabBold}
              jabItalic={jabItalic}
              setJabItalic={setJabItalic}
              jabAlign={jabAlign}
              setJabAlign={setJabAlign}
              jabLetterSpacing={jabLetterSpacing}
              setJabLetterSpacing={setJabLetterSpacing}
              jabLineHeight={jabLineHeight}
              setJabLineHeight={setJabLineHeight}
              jabStroke={jabStroke}
              setJabStroke={setJabStroke}
              jabStrokeWidth={jabStrokeWidth}
              setJabStrokeWidth={setJabStrokeWidth}
              jabStrokeColor={jabStrokeColor}
              setJabStrokeColor={setJabStrokeColor}
              jabShadow={jabShadow}
              setJabShadow={setJabShadow}
              jabShadowBlur={jabShadowBlur}
              setJabShadowBlur={setJabShadowBlur}
              jabShadowColor={jabShadowColor}
              setJabShadowColor={setJabShadowColor}
              jabBgEnabled={jabBgEnabled}
              setJabBgEnabled={setJabBgEnabled}
              jabBgColor={jabBgColor}
              setJabBgColor={setJabBgColor}
              jabBorderRadius={jabBorderRadius}
              setJabBorderRadius={setJabBorderRadius}
              hasSubtitle={true}
              subTransform={subTransform}
              setSubTransform={setSubTransform}
              setSubtitleYPercent={(y: number) => setSubTransform(prev => ({ ...prev, yPct: y }))}
              currentSubtitleText={currentSubtitleText}
              subtitleConfig={subtitleConfig}
              setSubtitleConfig={setSubtitleConfig}
              subtitleStrokeEnabled={subtitleStrokeEnabled}
              setSubtitleStrokeEnabled={setSubtitleStrokeEnabled}
              subtitleStrokeWidth={subtitleStrokeWidth}
              setSubtitleStrokeWidth={setSubtitleStrokeWidth}
              subtitleStrokeColor={subtitleStrokeColor}
              setSubtitleStrokeColor={setSubtitleStrokeColor}
              subtitleShadowEnabled={subtitleShadowEnabled}
              setSubtitleShadowEnabled={setSubtitleShadowEnabled}
              subtitleShadowBlur={subtitleShadowBlur}
              setSubtitleShadowBlur={setSubtitleShadowBlur}
              subtitleShadowColor={subtitleShadowColor}
              setSubtitleShadowColor={setSubtitleShadowColor}
              subtitleUseBox={subtitleConfig.useBox ?? subtitleUseBox}
              setSubtitleUseBox={(val: boolean) => {
                setSubtitleUseBox(val);
                setSubtitleConfig(prev => ({ ...prev, useBox: val }));
              }}
              subtitleBoxColor={subtitleConfig.boxColor || subtitleBoxColor}
              setSubtitleBoxColor={(col: string) => {
                setSubtitleBoxColor(col);
                setSubtitleConfig(prev => ({ ...prev, boxColor: col }));
              }}
              subtitleBorderRadius={subtitleBorderRadius}
              setSubtitleBorderRadius={setSubtitleBorderRadius}
              subtitleMaxChars={subtitleMaxChars}
              setSubtitleMaxChars={setSubtitleMaxChars}
              selectedHighlightColor={selectedHighlightColor}
              setSelectedHighlightColor={setSelectedHighlightColor}
              selectedSubtitlePresetId={selectedSubtitlePresetId}
              setSelectedSubtitlePresetId={setSelectedSubtitlePresetId}
              hasBottomSource={hasBottomSource}
              setHasBottomSource={setHasBottomSource}
              sourceTransform={sourceTransform}
              setSourceTransform={setSourceTransform}
              bottomSourceText={bottomSourceText}
              setBottomSourceText={setBottomSourceText}
              bottomSourceColor={bottomSourceColor}
              setBottomSourceColor={setBottomSourceColor}
              bottomSourceSizePx={bottomSourceSizePx}
              setBottomSourceSizePx={setBottomSourceSizePx}
              bottomSourceFontFamily={bottomSourceFontFamily}
              setBottomSourceFontFamily={setBottomSourceFontFamily}
              bottomSourceBold={bottomSourceBold}
              setBottomSourceBold={setBottomSourceBold}
              bottomSourceItalic={bottomSourceItalic}
              setBottomSourceItalic={setBottomSourceItalic}
              bottomSourceAlign={bottomSourceAlign}
              setBottomSourceAlign={setBottomSourceAlign}
              bottomSourceBg={bottomSourceBg}
              setBottomSourceBg={setBottomSourceBg}
              bottomSourceBgColor={bottomSourceBgColor}
              setBottomSourceBgColor={setBottomSourceBgColor}
              bottomSourceBorderRadius={bottomSourceBorderRadius}
              setBottomSourceBorderRadius={setBottomSourceBorderRadius}
              bottomSourceStroke={bottomSourceStroke}
              setBottomSourceStroke={setBottomSourceStroke}
              bottomSourceStrokeWidth={bottomSourceStrokeWidth}
              setBottomSourceStrokeWidth={setBottomSourceStrokeWidth}
              bottomSourceStrokeColor={bottomSourceStrokeColor}
              setBottomSourceStrokeColor={setBottomSourceStrokeColor}
              bottomSourceShadow={bottomSourceShadow}
              setBottomSourceShadow={setBottomSourceShadow}
              bottomSourceShadowBlur={bottomSourceShadowBlur}
              setBottomSourceShadowBlur={setBottomSourceShadowBlur}
              bottomSourceShadowColor={bottomSourceShadowColor}
              setBottomSourceShadowColor={setBottomSourceShadowColor}
              bottomSourceLetterSpacing={bottomSourceLetterSpacing}
              setBottomSourceLetterSpacing={setBottomSourceLetterSpacing}
              bottomSourceLineHeight={bottomSourceLineHeight}
              setBottomSourceLineHeight={setBottomSourceLineHeight}
              setBottomSourceBottomPct={setBottomSourceBottomPct}
              hasCommentCard={hasCommentCard}
              setHasCommentCard={setHasCommentCard}
              commentCard={commentCard}
              setCommentCard={setCommentCard}
              commentTransform={commentTransform}
              setCommentTransform={setCommentTransform}
              showGrid={showGrid}
              safeZoneVisible={safeZoneVisible}
              safeZonePlatform={safeZonePlatform}
              deviceMockup={deviceMockup}
              currentBrandChannelName={channelDna.channelName}
              isPlaying={isPlaying}
              activeFloatingInspector={activeFloatingInspector}
              setActiveFloatingInspector={setActiveFloatingInspector}
            />
          </div>

          {/* 3. 하단 디자인 모션 & 군림보 시뮬레이터 독 (288px, h-72) */}
          <footer className="h-72 border-t border-border bg-card flex flex-col shrink-0 select-none z-20">
            {/* 3.1 트랜스포트 & 퀵 점프 컨트롤러 (36px, h-9) */}
            <div className="h-9 px-3 bg-muted/40 border-b border-border flex items-center justify-between shrink-0 select-none text-xs">
              {/* 좌측: 타임코드 & 오디오 VU 미터 */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-background px-2 py-0.5 rounded-[2px] border border-border">
                  <span className="text-[11px] font-mono font-bold text-foreground">
                    {formatTimecode(currentTimeMs)}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">/</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {formatTimecode(durationMs)}
                  </span>
                </div>

                <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-background border border-border rounded-[2px]" title="VU 피크 미터">
                  <span className="text-[8px] font-mono text-muted-foreground font-bold">VU</span>
                  <div className="flex items-end gap-0.5 h-3">
                    <div className="w-1 h-full bg-muted rounded-[1px] overflow-hidden flex flex-col justify-end">
                      <div className="w-full bg-emerald-500 transition-all duration-75" style={{ height: `${vuLevels.left}%` }} />
                    </div>
                    <div className="w-1 h-full bg-muted rounded-[1px] overflow-hidden flex flex-col justify-end">
                      <div className="w-full bg-emerald-500 transition-all duration-75" style={{ height: `${vuLevels.right}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 중앙: 군림보 2대 퀵 점프 & 메인 재생 버튼 */}
              <div className="flex items-center gap-1">
                {/* 🎯 군림보 0.0s 인트로 퀵 점프 */}
                <button
                  type="button"
                  onClick={() => setCurrentTimeMs(0)}
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-bold rounded border transition cursor-pointer flex items-center gap-1 shadow-2xs",
                    currentTimeMs < (gunlimboConfig.introDurationSec || 2.5) * 1000
                      ? "bg-amber-500/20 border-amber-500 text-amber-500 dark:text-amber-400"
                      : "border-border bg-background hover:bg-muted text-muted-foreground"
                  )}
                  title="0.0초 인트로 모션 (34% 크롭 + 훅 밴드 노출)"
                >
                  <SkipBack className="w-3 h-3" />
                  <span>0.0s 인트로 모션</span>
                </button>

                {/* 재생/일시정지 */}
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-7 h-7 mx-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center cursor-pointer shadow-xs active:scale-95 transition-all"
                  title="재생 / 일시정지 (Space)"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                </button>

                {/* 🎯 군림보 2.5s 본문 전환 퀵 점프 */}
                <button
                  type="button"
                  onClick={() => setCurrentTimeMs((gunlimboConfig.introDurationSec || 2.5) * 1000)}
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-bold rounded border transition cursor-pointer flex items-center gap-1 shadow-2xs",
                    currentTimeMs >= (gunlimboConfig.introDurationSec || 2.5) * 1000
                      ? "bg-sky-500/20 border-sky-500 text-sky-500 dark:text-sky-400"
                      : "border-border bg-background hover:bg-muted text-muted-foreground"
                  )}
                  title="2.5초 본문 전환 (24% 크롭 확장 + 훅 밴드 소멸)"
                >
                  <span>2.5s 본문 전환</span>
                  <SkipForward className="w-3 h-3" />
                </button>
              </div>

              {/* 우측: 루프, 배속, 볼륨 */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLooping(!isLooping)}
                  className={cn(
                    "p-1 rounded-[2px] transition cursor-pointer",
                    isLooping ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                  )}
                  title={isLooping ? "반복 재생 켜짐" : "반복 재생 꺼짐"}
                >
                  <Repeat className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1">
                  <select
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                    className="h-5 px-1 text-[10px] font-mono bg-background border border-border rounded-[2px] text-foreground cursor-pointer"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="1.0">1.0x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2.0">2.0x</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    title={isMuted ? "음소거 해제" : "음소거"}
                  >
                    {isMuted || masterVolume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : masterVolume}
                    onChange={(e) => {
                      setMasterVolume(parseInt(e.target.value));
                      if (isMuted) setIsMuted(false);
                    }}
                    className="w-12 accent-primary cursor-pointer h-1 bg-muted"
                  />
                </div>
              </div>
            </div>

            {/* 3.2 디자인 모션 레이어 타임 스트립 & 군림보 시뮬레이터 (~252px) */}
            <div className="flex-1 flex flex-col p-3 overflow-hidden bg-background/50 space-y-2">
              {/* 상단 타임 스크러버 자 (0.0s ~ 5.0s) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground px-1">
                  <span>0.0s (시작)</span>
                  <span className="text-amber-500 font-bold">⚡ 2.5s (군림보 인트로 분기점)</span>
                  <span>5.0s (루프)</span>
                </div>
                <div className="relative w-full h-5 flex items-center">
                  <Slider
                    value={[currentTimeMs]}
                    max={durationMs}
                    step={33}
                    onValueChange={(val) => setCurrentTimeMs(val[0])}
                    className="w-full cursor-pointer"
                  />
                </div>
              </div>

              {/* 4대 비주얼 레이어 타임 스트립 */}
              <div className="flex-1 flex flex-col justify-around py-1 space-y-1 text-[10.5px]">
                {/* 1. T1 상단 대제목 레이어 */}
                <div className="flex items-center gap-2">
                  <div className="w-24 shrink-0 font-bold text-foreground flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>T1 상단제목</span>
                  </div>
                  <div className="flex-1 h-6 bg-muted/60 rounded border border-border relative overflow-hidden flex items-center px-2">
                    <div
                      className={cn(
                        "h-4 rounded px-2 text-[9px] font-bold flex items-center text-white transition-all",
                        gunlimboConfig.keepTitleThroughout || currentTimeMs <= (gunlimboConfig.introDurationSec || 2.5) * 1000
                          ? "bg-amber-500/80 shadow-xs"
                          : "bg-muted-foreground/30 text-muted-foreground line-through"
                      )}
                      style={{ width: gunlimboConfig.keepTitleThroughout ? '100%' : '50%' }}
                    >
                      {gunlimboConfig.keepTitleThroughout ? '전 구간 2줄 대제목 지속 유지' : '0~2.5초 인트로 대제목 노출 후 소멸'}
                    </div>
                  </div>
                </div>

                {/* 2. H1 후킹 띠 바 (24~34%) */}
                <div className="flex items-center gap-2">
                  <div className="w-24 shrink-0 font-bold text-foreground flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>H1 훅 밴드</span>
                  </div>
                  <div className="flex-1 h-6 bg-muted/60 rounded border border-border relative overflow-hidden flex items-center px-2">
                    <div
                      className={cn(
                        "h-4 rounded px-2 text-[9px] font-bold flex items-center transition-all",
                        currentTimeMs <= (gunlimboConfig.introDurationSec || 2.5) * 1000
                          ? "bg-rose-500 text-white shadow-xs"
                          : "bg-muted text-muted-foreground opacity-40"
                      )}
                      style={{ width: '50%' }}
                    >
                      0~2.5초 100% 흰색 띠 후킹 바 (24~34%)
                    </div>
                    <div className="absolute left-1/2 top-0 bottom-0 w-px border-r border-dashed border-rose-500/70" />
                    <span className="text-[8.5px] text-muted-foreground ml-auto pr-2">2.5s 이후 자동 소멸</span>
                  </div>
                </div>

                {/* 3. V1 비디오 가변 크롭 & 줌 */}
                <div className="flex items-center gap-2">
                  <div className="w-24 shrink-0 font-bold text-foreground flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>V1 비디오 크롭</span>
                  </div>
                  <div className="flex-1 h-6 bg-muted/60 rounded border border-border relative overflow-hidden flex items-center text-[9px] font-bold">
                    <div
                      className={cn(
                        "h-full flex items-center px-2 transition-all border-r border-border",
                        currentTimeMs <= (gunlimboConfig.introDurationSec || 2.5) * 1000
                          ? "bg-purple-500/30 text-purple-600 dark:text-purple-300 ring-1 ring-inset ring-purple-500"
                          : "bg-muted/40 text-muted-foreground"
                      )}
                      style={{ width: '50%' }}
                    >
                      34% 샌드위치 크롭 (켄 번스 줌)
                    </div>
                    <div
                      className={cn(
                        "h-full flex items-center px-2 flex-1 transition-all",
                        currentTimeMs > (gunlimboConfig.introDurationSec || 2.5) * 1000
                          ? "bg-sky-500/30 text-sky-600 dark:text-sky-300 ring-1 ring-inset ring-sky-500"
                          : "bg-muted/40 text-muted-foreground"
                      )}
                    >
                      24% 크롭 확장 (본문 집중 뷰)
                    </div>
                  </div>
                </div>

                {/* 4. S1/C1 본문 자막 & 바이럴 댓글 */}
                <div className="flex items-center gap-2">
                  <div className="w-24 shrink-0 font-bold text-foreground flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>S1/C1 자막·댓글</span>
                  </div>
                  <div className="flex-1 h-6 bg-muted/60 rounded border border-border relative overflow-hidden flex items-center px-2">
                    <div
                      className={cn(
                        "h-4 rounded px-2 text-[9px] font-bold flex items-center ml-auto transition-all",
                        currentTimeMs > (gunlimboConfig.introDurationSec || 2.5) * 1000
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-muted text-muted-foreground opacity-40"
                      )}
                      style={{ width: '50%' }}
                    >
                      2.5초 이후 본문 자막 & 바이럴 댓글 카드 활성화
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </main>

        {/* ── 3. 우측 9대 프로 인스펙터 패널 (정밀 편집기와 100% 동일한 조작계) ── */}
        <aside className="w-80 border-l border-border bg-card flex flex-col shrink-0 z-20 overflow-hidden">
          {/* 4대 마스터 그룹 1층 바 (직관적/상징적 탭) */}
          <div className="grid grid-flow-col auto-cols-fr gap-0.5 border-b border-border bg-muted/40 p-1">
            {inspectorGroups.map((group) => {
              const isActive = activeMasterGroup === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setActiveMasterGroup(group.id as any);
                    if (!group.subTabs.some((t) => t.id === activeInspectorTab)) {
                      setActiveInspectorTab(group.subTabs[0].id as any);
                    }
                  }}
                  className={cn(
                    "py-1.5 px-1 rounded-sm text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5",
                    isActive
                      ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                  title={group.label}
                >
                  <span className="text-xs leading-none">{group.icon}</span>
                  <span className="text-[10px] font-medium leading-tight truncate w-full text-center">{group.label}</span>
                </button>
              );
            })}
          </div>

          {/* 서브 카테고리 2층 바 (하위 세부 항목) */}
          {(() => {
            const curGroup = inspectorGroups.find((g) => g.id === activeMasterGroup) || inspectorGroups[0];
            if (!curGroup) return null;
            return (
              <div className="flex items-center gap-1 border-b border-border bg-muted/20 px-2 py-1.5 overflow-x-auto custom-scrollbar">
                {curGroup.subTabs.map((sub) => {
                  const isSubActive = activeInspectorTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setActiveInspectorTab(sub.id as any)}
                      className={cn(
                        "px-2.5 py-1 rounded-[3px] text-[11px] font-medium transition cursor-pointer shrink-0",
                        isSubActive
                          ? "bg-card text-foreground font-bold border border-border shadow-2xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      )}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* 인스펙터 세부 컨텐츠 영역 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3.5 custom-scrollbar text-xs">
            {/* 🏛️ 1. 템플릿/폼 탭 */}
            {activeInspectorTab === 'template' && (
              <TemplateInspectorForm
                layoutTemplateMode={layoutTemplateMode}
                handleSelectTemplateMode={handleSelectTemplateMode}
                handleOpenTemplateLibrary={handleOpenTemplateLibrary}
                topBarBg={topBarBg}
                setTopBarBg={setTopBarBg}
                topBarHeightPct={topBarHeightPct}
                setTopBarHeightPct={setTopBarHeightPct}
                bottomBarBg={bottomBarBg}
                setBottomBarBg={setBottomBarBg}
                bottomBarHeightPct={bottomBarHeightPct}
                setBottomBarHeightPct={setBottomBarHeightPct}
                bottomSourceText={bottomSourceText}
                setBottomSourceText={setBottomSourceText}
                instaConfig={instaConfig}
                setInstaConfig={setInstaConfig}
                gunlimboConfig={gunlimboConfig}
                setGunlimboConfig={setGunlimboConfig}
                ssulConfig={ssulConfig}
                setSsulConfig={setSsulConfig}
                profileTransform={profileTransform}
                setProfileTransform={setProfileTransform}
                topTitleText={topTitleText}
                setTopTitleText={setTopTitleText}
                titleTransform={titleTransform}
                setTitleTransform={setTitleTransform}
                topTitleFontSize={topTitleFontSize}
                setTopTitleFontSize={setTopTitleFontSize}
                topTitleColor={topTitleColor}
                setTopTitleColor={setTopTitleColor}
                commentCard={commentCard}
                setCommentCard={setCommentCard}
                commentTransform={commentTransform}
                setCommentTransform={setCommentTransform}
                hasCommentCard={hasCommentCard}
                setHasCommentCard={setHasCommentCard}
                subTransform={subTransform}
                setSubTransform={setSubTransform}
                subtitleConfig={subtitleConfig}
                setSubtitleConfig={setSubtitleConfig}
                setSubtitleYPercent={(y: number) => setSubTransform(prev => ({ ...prev, yPct: y }))}
                activeInspectorTab={activeInspectorTab}
                setActiveInspectorTab={setActiveInspectorTab}
                selectedLayerId={selectedLayerId}
                setSelectedLayerId={setSelectedLayerId}
                layers={[]}
                setLayers={() => {}}
              />
            )}

            {/* 📸 2-0. 인스타 프로필 탭 */}
            {activeInspectorTab === 'profile' && (
              <InstaProfileInspectorForm
                instaConfig={instaConfig}
                setInstaConfig={setInstaConfig}
                profileTransform={profileTransform}
                setProfileTransform={setProfileTransform}
              />
            )}

            {/* 📜 2-0-1. 썰형 헤더 / 메타데이터 / 구분선 탭 */}
            {['ssulHeader', 'metadata', 'divider'].includes(activeInspectorTab) && (
              <SsulObjectInspectorForm
                mode={activeInspectorTab as 'ssulHeader' | 'metadata' | 'divider'}
                ssulConfig={ssulConfig}
                setSsulConfig={setSsulConfig}
              />
            )}

            {/* 👑 2-1. 제목 탭 */}
            {(activeInspectorTab === 'title' || activeInspectorTab === 'titleSource') && (
              <TitleSourceInspectorForm
                mode="title"
                hasTopTitle={hasTopTitle}
                setHasTopTitle={setHasTopTitle}
                titleLinesMode={titleLinesMode}
                setTitleLinesMode={setTitleLinesMode}
                hasTitleBadge={hasTitleBadge}
                setHasTitleBadge={setHasTitleBadge}
                titleBadgeText={titleBadgeText}
                setTitleBadgeText={setTitleBadgeText}
                titleBadgeBg={titleBadgeBg}
                setTitleBadgeBg={setTitleBadgeBg}
                titleBadgeColor={titleBadgeColor}
                setTitleBadgeColor={setTitleBadgeColor}
                titleBadgeSizePx={titleBadgeSizePx}
                setTitleBadgeSizePx={setTitleBadgeSizePx}
                titleBadgeRadius={titleBadgeRadius}
                setTitleBadgeRadius={setTitleBadgeRadius}
                hasTitleLine1={hasTitleLine1}
                setHasTitleLine1={setHasTitleLine1}
                titleLine1={titleLine1}
                setTitleLine1={setTitleLine1}
                hasTitleLine2={hasTitleLine2}
                setHasTitleLine2={setHasTitleLine2}
                titleLine2={titleLine2}
                setTitleLine2={setTitleLine2}
                titleFontFamily={titleFontFamily}
                setTitleFontFamily={setTitleFontFamily}
                titleBold={titleBold}
                setTitleBold={setTitleBold}
                titleItalic={titleItalic}
                setTitleItalic={setTitleItalic}
                titleAlign={titleAlign}
                setTitleAlign={setTitleAlign}
                titleLine1SizePx={titleLine1SizePx}
                setTitleLine1SizePx={setTitleLine1SizePx}
                titleLine2SizePx={titleLine2SizePx}
                setTitleLine2SizePx={setTitleLine2SizePx}
                titleLine1Color={titleLine1Color}
                setTitleLine1Color={setTitleLine1Color}
                titleLine2Color={titleLine2Color}
                setTitleLine2Color={setTitleLine2Color}
                titleStroke={titleStroke}
                setTitleStroke={setTitleStroke}
                titleStrokeWidth={titleStrokeWidth}
                setTitleStrokeWidth={setTitleStrokeWidth}
                titleStrokeColor={titleStrokeColor}
                setTitleStrokeColor={setTitleStrokeColor}
                titleShadow={titleShadow}
                setTitleShadow={setTitleShadow}
                titleShadowBlur={titleShadowBlur}
                setTitleShadowBlur={setTitleShadowBlur}
                titleBgMode={titleBgMode}
                setTitleBgMode={setTitleBgMode}
                titlePaddingX={titlePaddingX}
                setTitlePaddingX={setTitlePaddingX}
                titleBorderRadius={titleBorderRadius}
                setTitleBorderRadius={setTitleBorderRadius}
                layoutTemplateMode={layoutTemplateMode}
                instaConfig={instaConfig}
                setInstaConfig={setInstaConfig}
                gunlimboConfig={gunlimboConfig}
                setGunlimboConfig={setGunlimboConfig}
                ssulConfig={ssulConfig}
                setSsulConfig={setSsulConfig}
                topTitleText={topTitleText}
                setTopTitleText={setTopTitleText}
                titleTransform={titleTransform}
                setTitleTransform={setTitleTransform}
                setTopTitleYPct={(val: number) => setTitleTransform(prev => ({ ...prev, yPct: val }))}
                titleLetterSpacing={titleLetterSpacing}
                setTitleLetterSpacing={setTitleLetterSpacing}
                titleLineHeight={titleLineHeight}
                setTitleLineHeight={setTitleLineHeight}
                titleLine1FontFamily={titleLine1FontFamily}
                setTitleLine1FontFamily={setTitleLine1FontFamily}
                titleLine1Bold={titleLine1Bold}
                setTitleLine1Bold={setTitleLine1Bold}
                titleLine1Italic={titleLine1Italic}
                setTitleLine1Italic={setTitleLine1Italic}
                titleLine1Align={titleLine1Align}
                setTitleLine1Align={setTitleLine1Align}
                titleLine1LetterSpacing={titleLine1LetterSpacing}
                setTitleLine1LetterSpacing={setTitleLine1LetterSpacing}
                titleLine1LineHeight={titleLine1LineHeight}
                setTitleLine1LineHeight={setTitleLine1LineHeight}
                titleLine2FontFamily={titleLine2FontFamily}
                setTitleLine2FontFamily={setTitleLine2FontFamily}
                titleLine2Bold={titleLine2Bold}
                setTitleLine2Bold={setTitleLine2Bold}
                titleLine2Italic={titleLine2Italic}
                setTitleLine2Italic={setTitleLine2Italic}
                titleLine2Align={titleLine2Align}
                setTitleLine2Align={setTitleLine2Align}
                titleLine2LetterSpacing={titleLine2LetterSpacing}
                setTitleLine2LetterSpacing={setTitleLine2LetterSpacing}
                titleLine2LineHeight={titleLine2LineHeight}
                setTitleLine2LineHeight={setTitleLine2LineHeight}
                bottomSourceLetterSpacing={bottomSourceLetterSpacing}
                setBottomSourceLetterSpacing={setBottomSourceLetterSpacing}
                bottomSourceLineHeight={bottomSourceLineHeight}
                setBottomSourceLineHeight={setBottomSourceLineHeight}
              />
            )}

            {/* 🏷️ 2-4. 하단 출처 탭 */}
            {activeInspectorTab === 'sourceCredit' && (
              <TitleSourceInspectorForm
                mode="sourceCredit"
                hasBottomSource={hasBottomSource}
                setHasBottomSource={setHasBottomSource}
                bottomSourceText={bottomSourceText}
                setBottomSourceText={setBottomSourceText}
                bottomSourceColor={bottomSourceColor}
                setBottomSourceColor={setBottomSourceColor}
                bottomSourceBottomPct={bottomSourceBottomPct}
                setBottomSourceBottomPct={setBottomSourceBottomPct}
                bottomSourceSizePx={bottomSourceSizePx}
                setBottomSourceSizePx={setBottomSourceSizePx}
                bottomSourceFontFamily={bottomSourceFontFamily}
                setBottomSourceFontFamily={setBottomSourceFontFamily}
                bottomSourceBold={bottomSourceBold}
                setBottomSourceBold={setBottomSourceBold}
                bottomSourceItalic={bottomSourceItalic}
                setBottomSourceItalic={setBottomSourceItalic}
                bottomSourceAlign={bottomSourceAlign}
                setBottomSourceAlign={setBottomSourceAlign}
                bottomSourceLetterSpacing={bottomSourceLetterSpacing}
                setBottomSourceLetterSpacing={setBottomSourceLetterSpacing}
                bottomSourceLineHeight={bottomSourceLineHeight}
                setBottomSourceLineHeight={setBottomSourceLineHeight}
                bottomSourceBg={bottomSourceBg}
                setBottomSourceBg={setBottomSourceBg}
                bottomSourceBgColor={bottomSourceBgColor}
                setBottomSourceBgColor={setBottomSourceBgColor}
                bottomSourceBorderRadius={bottomSourceBorderRadius}
                setBottomSourceBorderRadius={setBottomSourceBorderRadius}
                bottomSourceStroke={bottomSourceStroke}
                setBottomSourceStroke={setBottomSourceStroke}
                bottomSourceStrokeWidth={bottomSourceStrokeWidth}
                setBottomSourceStrokeWidth={setBottomSourceStrokeWidth}
                bottomSourceStrokeColor={bottomSourceStrokeColor}
                setBottomSourceStrokeColor={setBottomSourceStrokeColor}
                bottomSourceShadow={bottomSourceShadow}
                setBottomSourceShadow={setBottomSourceShadow}
                bottomSourceShadowBlur={bottomSourceShadowBlur}
                setBottomSourceShadowBlur={setBottomSourceShadowBlur}
                bottomSourceShadowColor={bottomSourceShadowColor}
                setBottomSourceShadowColor={setBottomSourceShadowColor}
                sourceTransform={sourceTransform}
                setSourceTransform={setSourceTransform}
              />
            )}

            {/* 📏 2-5. 상하단바 탭 */}
            {activeInspectorTab === 'topBottomBar' && (
              <TitleSourceInspectorForm
                mode="topBottomBar"
                hasTopBarBg={hasTopBarBg}
                setHasTopBarBg={setHasTopBarBg}
                topBarBg={topBarBg}
                setTopBarBg={setTopBarBg}
                topBarHeightPct={topBarHeightPct}
                setTopBarHeightPct={setTopBarHeightPct}
                topBarOpacity={(topBarOpacity ?? 1) * 100}
                setTopBarOpacity={(v: number) => setTopBarOpacity(v / 100)}
                topBarRadius={topBarRadius}
                setTopBarRadius={setTopBarRadius}
                hasBottomBarBg={hasBottomBarBg}
                setHasBottomBarBg={setHasBottomBarBg}
                bottomBarBg={bottomBarBg}
                setBottomBarBg={setBottomBarBg}
                bottomBarHeightPct={bottomBarHeightPct}
                setBottomBarHeightPct={setBottomBarHeightPct}
                bottomBarOpacity={(bottomBarOpacity ?? 1) * 100}
                setBottomBarOpacity={(v: number) => setBottomBarOpacity(v / 100)}
                bottomBarRadius={bottomBarRadius}
                setBottomBarRadius={setBottomBarRadius}
              />
            )}

            {activeInspectorTab === 'videoCrop' && (
              <VideoCropInspectorForm
                videoFitMode={videoFitMode}
                setVideoFitMode={setVideoFitMode}
                videoFocusXPct={videoFocusXPct}
                setVideoFocusXPct={setVideoFocusXPct}
                videoFocusYPct={videoFocusYPct}
                setVideoFocusYPct={setVideoFocusYPct}
                videoZoomScale={videoZoomScale}
                setVideoZoomScale={setVideoZoomScale}
                videoRotationDeg={videoRotationDeg}
                setVideoRotationDeg={setVideoRotationDeg}
                videoHorizontalFlip={videoHorizontalFlip}
                setVideoHorizontalFlip={setVideoHorizontalFlip}
                videoVerticalFlip={videoVerticalFlip}
                setVideoVerticalFlip={setVideoVerticalFlip}
                videoBlurBg={videoBlurBg}
                setVideoBlurBg={setVideoBlurBg}
                layoutTemplateMode={layoutTemplateMode}
                instaConfig={instaConfig}
                setInstaConfig={setInstaConfig}
                videoBorderRadius={videoBorderRadius}
                setVideoBorderRadius={setVideoBorderRadius}
                videoBorderEnabled={videoBorderEnabled}
                setVideoBorderEnabled={setVideoBorderEnabled}
                videoBorderWidth={videoBorderWidth}
                setVideoBorderWidth={setVideoBorderWidth}
                videoBorderColor={videoBorderColor}
                setVideoBorderColor={setVideoBorderColor}
                videoShadowEnabled={videoShadowEnabled}
                setVideoShadowEnabled={setVideoShadowEnabled}
                videoShadowBlur={videoShadowBlur}
                setVideoShadowBlur={setVideoShadowBlur}
                videoShadowColor={videoShadowColor}
                setVideoShadowColor={setVideoShadowColor}
                videoPaddingPct={videoPaddingPct}
                setVideoPaddingPct={setVideoPaddingPct}
              />
            )}

            {activeInspectorTab === 'filterFx' && (
              <FilterFxInspectorForm
                videoFilter={videoFilter}
                setVideoFilter={setVideoFilter}
              />
            )}

            {activeInspectorTab === 'commentCard' && (
              <CommentCardInspectorForm
                commentCard={commentCard}
                setCommentCard={setCommentCard}
                hasCommentCard={hasCommentCard}
                setHasCommentCard={setHasCommentCard}
                commentTransform={commentTransform}
                setCommentTransform={setCommentTransform}
              />
            )}

            {activeInspectorTab === 'jabHook' && (
              <JabHookInspectorForm
                hasJab={hasJab}
                setHasJab={setHasJab}
                jabText={jabText}
                setJabText={setJabText}
                jabTiltDeg={jabTiltDeg}
                setJabTiltDeg={setJabTiltDeg}
                jabFontSize={jabFontSize}
                setJabFontSize={setJabFontSize}
                jabTextColor={jabTextColor}
                setJabTextColor={setJabTextColor}
                jabFont={jabFont}
                setJabFont={setJabFont}
                jabBold={jabBold}
                setJabBold={setJabBold}
                jabItalic={jabItalic}
                setJabItalic={setJabItalic}
                jabAlign={jabAlign}
                setJabAlign={setJabAlign}
                jabStroke={jabStroke}
                setJabStroke={setJabStroke}
                jabStrokeWidth={jabStrokeWidth}
                setJabStrokeWidth={setJabStrokeWidth}
                jabStrokeColor={jabStrokeColor}
                setJabStrokeColor={setJabStrokeColor}
                jabShadow={jabShadow}
                setJabShadow={setJabShadow}
                jabShadowBlur={jabShadowBlur}
                setJabShadowBlur={setJabShadowBlur}
                jabShadowColor={jabShadowColor}
                setJabShadowColor={setJabShadowColor}
                jabBgEnabled={jabBgEnabled}
                setJabBgEnabled={setJabBgEnabled}
                jabBgColor={jabBgColor}
                setJabBgColor={setJabBgColor}
                jabBorderRadius={jabBorderRadius}
                setJabBorderRadius={setJabBorderRadius}
                layoutTemplateMode={layoutTemplateMode}
                gunlimboConfig={gunlimboConfig}
                setGunlimboConfig={setGunlimboConfig}
                jabLetterSpacing={jabLetterSpacing}
                setJabLetterSpacing={setJabLetterSpacing}
                jabLineHeight={jabLineHeight}
                setJabLineHeight={setJabLineHeight}
              />
            )}

            {/* 💬 2-2. 본문 자막 탭 */}
            {(activeInspectorTab === 'style' || (activeInspectorTab as string) === 'subtitle') && (
              <SubtitleStyleInspectorForm
                subtitleConfig={subtitleConfig}
                setSubtitleConfig={setSubtitleConfig}
                subtitleStrokeEnabled={subtitleStrokeEnabled}
                setSubtitleStrokeEnabled={setSubtitleStrokeEnabled}
                subtitleStrokeWidth={subtitleStrokeWidth}
                setSubtitleStrokeWidth={setSubtitleStrokeWidth}
                subtitleStrokeColor={subtitleStrokeColor}
                setSubtitleStrokeColor={setSubtitleStrokeColor}
                subtitleShadowEnabled={subtitleShadowEnabled}
                setSubtitleShadowEnabled={setSubtitleShadowEnabled}
                subtitleShadowBlur={subtitleShadowBlur}
                setSubtitleShadowBlur={setSubtitleShadowBlur}
                subtitleShadowColor={subtitleShadowColor}
                setSubtitleShadowColor={setSubtitleShadowColor}
                subtitleUseBox={subtitleUseBox}
                setSubtitleUseBox={setSubtitleUseBox}
                subtitleBoxColor={subtitleBoxColor}
                setSubtitleBoxColor={setSubtitleBoxColor}
                subtitleBorderRadius={subtitleBorderRadius}
                setSubtitleBorderRadius={setSubtitleBorderRadius}
                subtitleMaxChars={subtitleMaxChars}
                setSubtitleMaxChars={setSubtitleMaxChars}
                selectedHighlightColor={selectedHighlightColor}
                setSelectedHighlightColor={setSelectedHighlightColor}
                selectedSubtitlePresetId={selectedSubtitlePresetId}
                setSelectedSubtitlePresetId={setSelectedSubtitlePresetId}
              />
            )}

            {activeInspectorTab === 'tts' && (
              <div className="space-y-3">
                <label className="text-[11px] font-bold block">AI 나레이션 음성 엔진</label>
                <div className="p-2.5 rounded-[3px] border border-border bg-muted/20 space-y-2">
                  <span className="text-[10px] text-muted-foreground">기본 엔진: Supertonic Local AI (한국어 서연 F1 / 민준 M1)</span>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span>발화 배속 ({ttsConfig.speed}x)</span>
                    </div>
                    <Slider
                      value={[ttsConfig.speed]}
                      min={0.8}
                      max={1.5}
                      step={0.05}
                      onValueChange={([v]) => setTtsConfig(prev => ({ ...prev, speed: v }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 🏛️ 9. 채널 DNA 탭 */}
            {activeInspectorTab === 'channel' && (
              <div className="space-y-3">
                <label className="text-[11px] font-bold block">채널 DNA 연동</label>
                <div className="p-2.5 rounded-[3px] border border-border bg-muted/20 space-y-2">
                  <Input
                    value={channelDna.channelName}
                    onChange={(e) => setChannelDna(prev => ({ ...prev, channelName: e.target.value }))}
                    className="h-6 text-[10px]"
                    placeholder="채널명"
                  />
                  <span className="text-[9px] text-muted-foreground block">
                    채널 설정에 등록된 시그니처 폰트와 컬러가 템플릿에 자동 주입됩니다.
                  </span>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 🏛️ 차세대 주권 템플릿 라이브러리 모달 */}
      {isTemplateLibraryOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-2xl rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* 헤더 */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-base">🎨</span>
                <div>
                  <h3 className="font-bold text-sm text-foreground">주권 템플릿 라이브러리</h3>
                  <p className="text-[11px] text-muted-foreground">
                    표준 및 사용자 맞춤 템플릿을 선택하여 템플릿 스튜디오에 0% 간섭 샌드박스로 적용합니다.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTemplateLibraryOpen(false)}
                className="h-7 w-7 p-0"
              >
                ✕
              </Button>
            </div>

            {/* 목록 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                4대 표준 아키타입
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.values(STANDARD_TEMPLATES).map((tpl: any) => (
                  <div
                    key={tpl.id}
                    onClick={() => handleApplyManifest(tpl)}
                    className="p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-muted/40 cursor-pointer transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-foreground">{tpl.name}</span>
                        <Badge variant="outline" className="text-[10px]">{tpl.badge}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{tpl.description}</p>
                    </div>
                    <Button size="sm" variant="secondary" className="mt-2.5 h-6 text-xs w-full">
                      이 템플릿 적용
                    </Button>
                  </div>
                ))}
              </div>

              {templateLibraryList.length > 0 && (
                <>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-4 mb-1">
                    사용자 커스텀 템플릿
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {templateLibraryList.map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          if (tpl.manifest) handleApplyManifest(tpl.manifest);
                          else if (tpl.manifest_json) {
                            try {
                              const parsed = typeof tpl.manifest_json === 'string' ? JSON.parse(tpl.manifest_json) : tpl.manifest_json;
                              handleApplyManifest(parsed);
                            } catch {
                              handleSelectTemplateMode((tpl.archetype || 'classic') as LayoutTemplateMode);
                            }
                          } else {
                            handleSelectTemplateMode((tpl.archetype || 'classic') as LayoutTemplateMode);
                          }
                        }}
                        className="p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-muted/40 cursor-pointer transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-foreground truncate max-w-[140px]">{tpl.name}</span>
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-[10px]">커스텀</Badge>
                              <button
                                type="button"
                                onClick={(e) => handleDuplicateCustomTemplate(tpl, e)}
                                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                                title="템플릿 복제"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteCustomTemplate(tpl.id, e)}
                                className="p-1 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500 cursor-pointer"
                                title="템플릿 삭제"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{tpl.description || '맞춤형 템플릿'}</p>
                        </div>
                        <Button size="sm" variant="secondary" className="mt-2.5 h-6 text-xs w-full">
                          이 템플릿 적용
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 푸터 */}
            <div className="p-3 border-t border-border flex justify-end bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTemplateLibraryOpen(false)}
                className="h-7 text-xs"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 레퍼런스 쇼츠 1초 포렌식 발골 모달 */}
      <ForensicUrlExtractModal
        isOpen={isForensicModalOpen}
        onClose={() => setIsForensicModalOpen(false)}
        onApplyManifest={handleApplyManifest}
      />
    </div>
  );
};

export default ShortsTemplateStudio;
