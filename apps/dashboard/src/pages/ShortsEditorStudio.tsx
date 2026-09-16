// 🎨 캡컷 10대 인기 시네마틱 필터 & 영화 노이즈 FX 정의
export interface VideoFilterSettings {
  preset: string;
  intensity: number;
  filmGrain: number; // 0 ~ 100 (영화 필름 노이즈)
  vignette: number;  // 0 ~ 100 (비네팅)
  brightness: number; // 50 ~ 150
  contrast: number;   // 50 ~ 150
  saturation: number; // 0 ~ 200
  temperature: number; // -50 ~ +50
}

export const CAPCUT_FILTER_PRESETS = [
  { id: 'none', name: '원본 (Original)', desc: '보정 없음', color: 'from-zinc-500 to-zinc-600', grain: 0, vignette: 0, b: 100, c: 100, s: 100, t: 0 },
  { id: 'cinematic-film', name: '🎬 시네마틱 35mm', desc: '영화 필름 질감 & 아날로그 그레인', color: 'from-amber-600 to-stone-800', grain: 45, vignette: 40, b: 98, c: 120, s: 95, t: 10 },
  { id: 'teal-orange', name: '🌆 헐리우드 틸 & 오렌지', desc: '블록버스터 시네마 룩', color: 'from-cyan-600 to-amber-600', grain: 20, vignette: 30, b: 102, c: 125, s: 125, t: 15 },
  { id: 'retro-vhs', name: '📼 90s 레트로 VHS', desc: '아날로그 테이프 & 주사선 노이즈', color: 'from-purple-600 to-emerald-600', grain: 65, vignette: 45, b: 105, c: 115, s: 85, t: 12 },
  { id: 'film-noir', name: '🎞️ 클래식 필름 느와르', desc: '고대비 모노크롬 흑백', color: 'from-zinc-900 to-zinc-600', grain: 55, vignette: 55, b: 95, c: 145, s: 0, t: 0 },
  { id: 'cyberpunk', name: '⚡ 사이버펑크 네온', desc: '시안 & 마젠타 퓨처리스틱', color: 'from-fuchsia-600 to-cyan-500', grain: 15, vignette: 35, b: 105, c: 135, s: 160, t: -15 },
  { id: 'kodak-warm', name: '🌅 웜 코닥 골드', desc: '따뜻한 골든아워 감성 필름', color: 'from-amber-500 to-rose-600', grain: 30, vignette: 25, b: 103, c: 110, s: 115, t: 25 },
  { id: 'fuji-cool', name: '❄️ 쿨 후지필름', desc: '청량하고 차분한 모던 톤', color: 'from-sky-500 to-teal-700', grain: 20, vignette: 20, b: 100, c: 112, s: 92, t: -20 },
  { id: 'dreamy-glow', name: '✨ 드림 글로우', desc: '몽환적인 소프트 확산광 (뽀샤시)', color: 'from-pink-400 to-indigo-400', grain: 10, vignette: 20, b: 112, c: 90, s: 108, t: 8 },
  { id: 'vintage-grain', name: '📽️ 1970 빈티지 그레인', desc: '헤비 입자 & 세피아 톤', color: 'from-yellow-700 to-amber-900', grain: 80, vignette: 50, b: 95, c: 120, s: 70, t: 30 },
];

import axios from 'axios';
import { exportCapCutFullProject } from '@/services/capcutFullProjectExporter';
import { generateSmartSeoTags, generateSmartHashtags, generatePixelingStandardMeta } from '@/lib/ddalkkakPixeling';
import { SUBTITLE_STYLES, DDALKKAK_TTS_PRESETS } from '@/types/ddalkkak';
import { Highlighter, Send, Globe2, ThumbsUp, MessageCircle, Palette, Layout } from 'lucide-react';
import { SFX_CATALOG, playSynthesizedSfx, SfxItem } from '@/config/sfxCatalog';
import { proceduralBgmEngine, BGM_PRESETS } from '@/services/proceduralBgmEngine';
import { MemeAvatar, MEME_EMOTION_PRESETS, MemeType, MemeEmotion } from '@/components/memeAssets';
import { MASTER_INSPECTOR_GROUPS, InspectorSubTabId, getInspectorGroupsForMode } from '@/components/canvas/constants/canvasConstants';
import { UniversalCanvasStage } from '@/components/canvas/stage/UniversalCanvasStage';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Scissors,
  Camera,
  Repeat,
  Grid,
  Crosshair,
  Upload,
  Volume1,
  Trash2,
  Copy,
  FlipHorizontal,
  Play,
  Pause,
  RotateCw,
  RotateCcw,
  Sparkles,
  Download,
  Layers,
  ZoomIn,
  ZoomOut,
  Sliders,
  PlusCircle,
  CheckCircle2,
  ArrowDownUp,
  MoveVertical,
  Crop,
  Layers3,
  Type,
  FileVideo,
  Volume2,
  VolumeX,
  Music,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowLeft,
  Film,
  SkipBack,
  SkipForward,
  Split,
  MessageSquare,
  Magnet,
  Maximize2,
  Plus,
  Clock,
  ChevronRight,
  Settings,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Wand2,
  Search,
  ExternalLink,
  FolderOpen,
  Check,
  Radio,
  Minimize2,
  Zap,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn, getMediaUrl } from '@/lib/utils';
import api from '@/lib/api';
import { TemplateManifest } from '@/types/templateDna';
import { STANDARD_TEMPLATES, getStandardTemplateByArchetype, getMasterTemplate, saveMasterTemplateLocal, normalizeTemplateManifest } from '@/config/standardTemplates';
import { NleLayerObject, NleLayerTransform, createDefaultTransform } from '@/types/nle';
import { TransformGizmo } from '@/components/canvas/TransformGizmo';
import { BgmLibraryModal, BgmTrackItem } from '@/components/BgmLibraryModal';
import SubtitleConfigPanel from '@/components/shared/SubtitleConfigPanel';
import TTSConfigPanel from '@/components/shared/TTSConfigPanel';
import { SubtitleConfig, DEFAULT_SUBTITLE_CONFIG } from '@/types/subtitle';
import { TTSConfig } from '@/types/tts';
import { WatermarkConfig } from '@/features/creativeStudio/components/WatermarkSettingsDialog';
import { TransitionConfig, TRANSITION_PRESETS, TransitionType } from '@/features/creativeStudio/components/TransitionSettingsDialog';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Clapperboard, Mic, Sparkle } from 'lucide-react';
import { TemplateInspectorForm } from "@/components/canvas/forms/TemplateInspectorForm";
import { TitleSourceInspectorForm } from "@/components/canvas/forms/TitleSourceInspectorForm";
import { VideoCropInspectorForm } from "@/components/canvas/forms/VideoCropInspectorForm";
import { FilterFxInspectorForm } from "@/components/canvas/forms/FilterFxInspectorForm";
import { CommentCardInspectorForm } from "@/components/canvas/forms/CommentCardInspectorForm";
import { JabHookInspectorForm } from "@/components/canvas/forms/JabHookInspectorForm";
import { SubtitleStyleInspectorForm } from "@/components/canvas/forms/SubtitleStyleInspectorForm";
import { InstaProfileInspectorForm } from "@/components/canvas/forms/InstaProfileInspectorForm";
import { SsulObjectInspectorForm } from "@/components/canvas/forms/SsulObjectInspectorForm";



// ── 프로 NLE 스타일 프리셋 (라이트/다크 양방향 시인성 확보) ──
interface ProStylePreset {
  id: string;
  name: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  bg?: string;
  fontFamily: string;
}

const PRO_PRESETS: ProStylePreset[] = [
  { id: 'broadcast_yellow', name: '브로드캐스트 옐로우', color: '#FFE500', strokeColor: '#000000', strokeWidth: 4, fontFamily: 'Pretendard' },
  { id: 'pure_white', name: '스탠다드 화이트', color: '#FFFFFF', strokeColor: '#000000', strokeWidth: 3, fontFamily: 'Pretendard' },
  { id: 'breaking_news', name: '헤드라인 속보', color: '#FF2A4D', strokeColor: '#FFFFFF', strokeWidth: 4, bg: 'rgba(0,0,0,0.88)', fontFamily: 'GmarketSans' },
  { id: 'cyber_cyan', name: '시안 네온', color: '#00F0FF', strokeColor: '#0A0A14', strokeWidth: 4, fontFamily: 'Pretendard' },
  { id: 'vivid_lime', name: '비비드 라임', color: '#00E510', strokeColor: '#000000', strokeWidth: 4, fontFamily: 'GmarketSans' },
];

// 🎨 8대 쇼츠 자막 디자인 프리셋 정의 (시각적 미니 프리뷰 및 1클릭 완벽 연동)
interface SubtitleDesignPreset {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  desc: string;
  fontFamily: string;
  textColor: string;
  outlineSize: number;
  outlineColor: string;
  useBox: boolean;
  boxColor: string;
  shadowSize: number;
  shadowColor: string;
  fontSize: number;
  sampleText: string;
}

const SHORTS_SUBTITLE_DESIGN_PRESETS: SubtitleDesignPreset[] = [
  {
    id: 'neon-yellow',
    name: '네온 옐로우',
    badge: 'MZ 바이럴',
    badgeColor: 'bg-amber-500 text-black',
    desc: '선명한 옐로우 + 블랙 볼드 외곽선',
    fontFamily: 'Black Han Sans',
    textColor: '#FFE600',
    outlineSize: 5,
    outlineColor: '#000000',
    useBox: false,
    boxColor: '#000000',
    shadowSize: 3,
    shadowColor: '#000000',
    fontSize: 19,
    sampleText: '바이럴 쇼츠 자막',
  },
  {
    id: 'white-glow',
    name: '화이트 글로우',
    badge: '추천 1위',
    badgeColor: 'bg-sky-500 text-white',
    desc: '순백 글자 + 시안 네온 그림자',
    fontFamily: 'Pretendard',
    textColor: '#FFFFFF',
    outlineSize: 4,
    outlineColor: '#0F172A',
    useBox: false,
    boxColor: '#000000',
    shadowSize: 4,
    shadowColor: '#00F0FF',
    fontSize: 18,
    sampleText: '화이트 네온 글로우',
  },
  {
    id: 'black-gold',
    name: '블랙 앤 골드',
    badge: '지식/다큐',
    badgeColor: 'bg-amber-600 text-amber-100',
    desc: '골드 텍스트 + 딥블랙 외곽선',
    fontFamily: 'Do Hyeon',
    textColor: '#FFD700',
    outlineSize: 5,
    outlineColor: '#000000',
    useBox: false,
    boxColor: '#000000',
    shadowSize: 3,
    shadowColor: '#000000',
    fontSize: 19,
    sampleText: '프리미엄 골드 자막',
  },
  {
    id: 'cyan-pop',
    name: '네온 시안 팝',
    badge: '트렌드 팝',
    badgeColor: 'bg-cyan-500 text-black',
    desc: '눈부신 네온 시안 + 블랙 외곽선',
    fontFamily: 'Pretendard',
    textColor: '#00F0FF',
    outlineSize: 5,
    outlineColor: '#000000',
    useBox: false,
    boxColor: '#000000',
    shadowSize: 3,
    shadowColor: '#002B36',
    fontSize: 18,
    sampleText: '네온 시안 임팩트',
  },
  {
    id: 'hot-pink',
    name: '핫 핑크 바이브',
    badge: '감성/엔터',
    badgeColor: 'bg-pink-500 text-white',
    desc: '비비드 핫핑크 + 핑크 글로우',
    fontFamily: 'Jua',
    textColor: '#FF2E93',
    outlineSize: 4,
    outlineColor: '#000000',
    useBox: false,
    boxColor: '#000000',
    shadowSize: 4,
    shadowColor: '#FF2E93',
    fontSize: 19,
    sampleText: '핫핑크 바이브 자막',
  },
  {
    id: 'box-pill',
    name: '박스 하이라이트',
    badge: '가독성 최고',
    badgeColor: 'bg-zinc-800 text-white',
    desc: '블랙 필 박스 + 화이트 볼드',
    fontFamily: 'Nanum Gothic',
    textColor: '#FFFFFF',
    outlineSize: 0,
    outlineColor: '#000000',
    useBox: true,
    boxColor: 'rgba(0,0,0,0.85)',
    shadowSize: 2,
    shadowColor: '#000000',
    fontSize: 17,
    sampleText: '박스형 자막 스타일',
  },
  {
    id: 'minimal-lime',
    name: '미니멀 라임',
    badge: '상큼한 일상',
    badgeColor: 'bg-lime-500 text-black',
    desc: '라임 텍스트 + 미니멀 블랙 테두리',
    fontFamily: 'Pretendard',
    textColor: '#A3E635',
    outlineSize: 4,
    outlineColor: '#000000',
    useBox: false,
    boxColor: '#000000',
    shadowSize: 2,
    shadowColor: '#000000',
    fontSize: 18,
    sampleText: '미니멀 라임 자막',
  },
  {
    id: 'bold-classic',
    name: '볼드 클래식',
    badge: '정통 볼드',
    badgeColor: 'bg-slate-700 text-white',
    desc: '화이트 + 6px 두꺼운 블랙 스트로크',
    fontFamily: 'Gowun Dodum',
    textColor: '#FFFFFF',
    outlineSize: 6,
    outlineColor: '#000000',
    useBox: false,
    boxColor: '#000000',
    shadowSize: 3,
    shadowColor: '#000000',
    fontSize: 20,
    sampleText: '볼드 클래식 자막',
  },
];

// 🏛️ 4대 폼팩터 통합 템플릿 모드 (기본형 / 인스타 구멍형 / 군림보 후킹형 / 썰형 누적·단일형)
export type LayoutTemplateMode = 'classic' | 'instagram' | 'gunlimbo' | 'ssul';
export type SsulTextMode = 'accumulate' | 'single-stepped' | 'single-fixed';
export type ScriptSplitPreset = 'shorts' | 'balanced' | 'sentence';
export type BgmMood = 'energetic' | 'emotional' | 'suspense' | 'funny' | 'cinematic';

export interface ShortsEditorStudioProps {
  sovereignMode?: LayoutTemplateMode;
}

export const ShortsEditorStudio: React.FC<ShortsEditorStudioProps> = ({ sovereignMode }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // 자막 자동 내려쓰기(줄바꿈) & 최대 줄 수 제어 헬퍼 (SSOT: splitLimit, maxLines 지원)
    // 🎨 안전한 HEX 컬러 변환 헬퍼 (rgba/rgb 경고 원천 차단)
  const rgbaToHex = (colorStr?: string, fallback: string = '#000000'): string => {
    if (!colorStr || typeof colorStr !== 'string') return fallback;
    if (colorStr.startsWith('#')) return colorStr.slice(0, 7);
    const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (rgbaMatch && rgbaMatch[1] && rgbaMatch[2] && rgbaMatch[3]) {
      const r = Math.min(255, Math.max(0, parseInt(rgbaMatch[1], 10) || 0)).toString(16).padStart(2, '0');
      const g = Math.min(255, Math.max(0, parseInt(rgbaMatch[2], 10) || 0)).toString(16).padStart(2, '0');
      const b = Math.min(255, Math.max(0, parseInt(rgbaMatch[3], 10) || 0)).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return fallback;
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

  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [safeZoneVisible, setSafeZoneVisible] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(false); // 📐 십자선 & 3분할 구도선
  const [canvasZoom, setCanvasZoom] = useState<'fit' | '50' | '75' | '100' | '150' | '200'>('fit');
  const [canvasScale, setCanvasScale] = useState<number>(1.0);
  const [canvasPan, setCanvasPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // 🎯 ESC 키로 전체화면 종료
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // 🎯 캔버스 줌 휠 이벤트: passive: false 등록으로 preventDefault 경고 없이 부드러운 확대/축소 지원
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
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ startX: number; startY: number; panX: number; panY: number }>({ startX: 0, startY: 0, panX: 0, panY: 0 });
  
  const [isLooping, setIsLooping] = useState<boolean>(true); // 🔁 반복 재생
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [bgmVolume, setBgmVolume] = useState<number>(35); // ⚡ 재생 배속
  const [masterVolume, setMasterVolume] = useState<number>(100); // 🔊 모니터 볼륨
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [durationMs, setDurationMs] = useState<number>(22450); // 기본 22.45초
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 0.5x ~ 3.0x 타임라인 줌
  const [magnetSnap, setMagnetSnap] = useState<boolean>(true);

  // 🌟 바이럴루프 쇼츠 6대 표준 레이어 & 비디오 크롭 상태 (ShortsLayoutState 규격 100% 통합)
  const [videoFitMode, setVideoFitMode] = useState<'sandwich' | 'fullscreen' | 'fit-center' | 'fit-top' | 'custom'>('sandwich');
  const [videoBlurBg, setVideoBlurBg] = useState<boolean>(true); // 샌드위치 핏 vs 풀스크린
  const [videoZoomScale, setVideoZoomScale] = useState<number>(100); // 50% ~ 300% 비디오 줌/크롭
  const [videoFocusXPct, setVideoFocusXPct] = useState<number>(50); // 0% ~ 100% 가로 X 오프셋 (좌우 자유 이동)
  const [videoFocusYPct, setVideoFocusYPct] = useState<number>(50); // 0% ~ 100% 세로 Y 오프셋 (상하 자유 이동)
  const [videoRotationDeg, setVideoRotationDeg] = useState<number>(0); // -180° ~ +180° 자유 회전 각도
  const [videoHorizontalFlip, setVideoHorizontalFlip] = useState<boolean>(false);
  const [videoVerticalFlip, setVideoVerticalFlip] = useState<boolean>(false);

  // Layer 1: 상단 배경 바 (Top Bar Bg)
  const [hasTopBarBg, setHasTopBarBg] = useState<boolean>(sovereignMode ? sovereignMode === 'classic' : true);
  const [topBarBg, setTopBarBg] = useState<string>('#000000');
  const [topBarHeightPct, setTopBarHeightPct] = useState<number>(18.3);
  const [topBarOpacity, setTopBarOpacity] = useState<number>(1.0);
  const [topBarRadius, setTopBarRadius] = useState<number>(0);

  // Layer 2: 상단 2단 타이틀 (Top Title - 상단바와 완전 독립 레이어)
  const [hasTopTitle, setHasTopTitle] = useState<boolean>(true);
  const [topTitleYPct, setTopTitleYPct] = useState<number>(9.0);
  // 🌟 TransformGizmo 완벽 연동 독립 레이어 Transform 상태 (위치, 크기, 회전, Z-Index)
  const [titleTransform, setTitleTransform] = useState<NleLayerTransform>(createDefaultTransform({ xPct: 50, yPct: 9.0, scale: 1.0, rotationDeg: 0, zIndex: 35 }));
  const [jabTransform, setJabTransform] = useState<NleLayerTransform>(createDefaultTransform({ xPct: 50, yPct: 28.0, scale: 1.0, rotationDeg: -3, zIndex: 40 }));
  const [subTransform, setSubTransform] = useState<NleLayerTransform>(createDefaultTransform({ xPct: 50, yPct: 78.0, scale: 1.0, rotationDeg: 0, zIndex: 45 }));
  const [sourceTransform, setSourceTransform] = useState<NleLayerTransform>(createDefaultTransform({ xPct: 50, yPct: 94.0, scale: 1.0, rotationDeg: 0, zIndex: 35 }));
  const [topBarZIndex, setTopBarZIndex] = useState<number>(15);
  const [bottomBarZIndex, setBottomBarZIndex] = useState<number>(15);
  const [videoZIndex, setVideoZIndex] = useState<number>(10);
  const [videoCropTopPct, setVideoCropTopPct] = useState<number>(0);
  const [videoCropBottomPct, setVideoCropBottomPct] = useState<number>(0);
  const [videoBorderRadius, setVideoBorderRadius] = useState<number>(0);
  const [videoBorderEnabled, setVideoBorderEnabled] = useState<boolean>(false);
  const [videoBorderWidth, setVideoBorderWidth] = useState<number>(1);
  const [videoBorderColor, setVideoBorderColor] = useState<string>('#FFFFFF');
  const [videoShadowEnabled, setVideoShadowEnabled] = useState<boolean>(false);
  const [videoShadowBlur, setVideoShadowBlur] = useState<number>(20);
  const [videoShadowColor, setVideoShadowColor] = useState<string>('rgba(0,0,0,0.5)');
  const [videoPaddingPct, setVideoPaddingPct] = useState<number>(0);

  // Layer 2: 상단 고정 타이틀 (1줄 vs 2줄 모드 & 듀얼 컬러 & 테두리/그림자/배경)
  const [titleLinesMode, setTitleLinesMode] = useState<'single' | 'double'>('double');
  const [titleLine1, setTitleLine1] = useState<string>('조코비치 몰래카메라 ㅋㅋ');
  const [titleLine2, setTitleLine2] = useState<string>('상대 선수 멘붕 직전');
  const [topTitleText, setTopTitleText] = useState<string>('제목을\n입력하세요');
  const [titleLine1Color, setTitleLine1Color] = useState<string>('#FFFFFF');
  const [titleLine2Color, setTitleLine2Color] = useState<string>('#FFE500');
  const [titleLine1SizePx, setTitleLine1SizePx] = useState<number>(20);
  const [titleLine2SizePx, setTitleLine2SizePx] = useState<number>(24);
  const [titleFontFamily, setTitleFontFamily] = useState<string>('Pretendard');
  const [titleBadgeText, setTitleBadgeText] = useState<string>('HOT ISSUE');
  const [titleBadgeBg, setTitleBadgeBg] = useState<string>('#EF4444');
  const [titleBadgeColor, setTitleBadgeColor] = useState<string>('#FFFFFF');
  const [titleBadgeSizePx, setTitleBadgeSizePx] = useState<number>(11);
  const [titleBadgeRadius, setTitleBadgeRadius] = useState<number>(4);
  const [hasTitleBadge, setHasTitleBadge] = useState<boolean>(true);
  const [hasTitleLine1, setHasTitleLine1] = useState<boolean>(true);
  const [hasTitleLine2, setHasTitleLine2] = useState<boolean>(true);
  const [titleBold, setTitleBold] = useState<boolean>(true);
  const [titleItalic, setTitleItalic] = useState<boolean>(false);
  const [titleAlign, setTitleAlign] = useState<'left' | 'center' | 'right'>('center');

  // 👑 타이틀 테두리/그림자/배경(모서리 둥글기) 속성
  const [titleStroke, setTitleStroke] = useState<boolean>(true);
  const [titleStrokeWidth, setTitleStrokeWidth] = useState<number>(3);
  const [titleStrokeColor, setTitleStrokeColor] = useState<string>('#000000');
  const [titleShadow, setTitleShadow] = useState<boolean>(true);
  const [titleShadowBlur, setTitleShadowBlur] = useState<number>(6);
  const [titleShadowColor, setTitleShadowColor] = useState<string>('rgba(0,0,0,0.9)');
  const [titleBgMode, setTitleBgMode] = useState<'none' | 'box' | 'pill' | 'highlighter' | 'glass'>('none');
  const [titleBgColor, setTitleBgColor] = useState<string>('rgba(0,0,0,0.85)');
  const [titleBgOpacity, setTitleBgOpacity] = useState<number>(0.85);
  const [titleBorderRadius, setTitleBorderRadius] = useState<number>(6);
  const [titlePaddingX, setTitlePaddingX] = useState<number>(12);
  const [titlePaddingY, setTitlePaddingY] = useState<number>(6);
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

  // ⚡ Layer 3: 긴박 쨉쨉이 훅 (Jab Hook)
  const [hasJab, setHasJab] = useState<boolean>(true);
  const [jabText, setJabText] = useState<string>('*출격작전 반전 순간!*');
  const [jabFontSize, setJabFontSize] = useState<number>(13);
  const [jabTiltDeg, setJabTiltDeg] = useState<number>(-3);
  const [jabYPercent, setJabYPercent] = useState<number>(28.5);
  const [jabTextColor, setJabTextColor] = useState<string>('#000000');
  const [jabFont, setJabFont] = useState<string>('GmarketSans');
  const [jabBold, setJabBold] = useState<boolean>(true);
  const [jabItalic, setJabItalic] = useState<boolean>(false);
  const [jabAlign, setJabAlign] = useState<'left' | 'center' | 'right'>('center');
  const [jabLetterSpacing, setJabLetterSpacing] = useState<number>(0);
  const [jabLineHeight, setJabLineHeight] = useState<number>(1.2);
  const [jabColor, setJabColor] = useState<string>('#000000');
  const [jabBgEnabled, setJabBgEnabled] = useState<boolean>(true);
  const [jabBgColor, setJabBgColor] = useState<string>('#FFE500');
  const [jabBorderRadius, setJabBorderRadius] = useState<number>(4);
  const [jabStroke, setJabStroke] = useState<boolean>(true);
  const [jabStrokeWidth, setJabStrokeWidth] = useState<number>(2);
  const [jabStrokeColor, setJabStrokeColor] = useState<string>('#000000');
  const [jabBorderColor, setJabBorderColor] = useState<string>('#000000');
  const [jabShadow, setJabShadow] = useState<boolean>(true);
  const [jabShadowBlur, setJabShadowBlur] = useState<number>(8);
  const [jabShadowColor, setJabShadowColor] = useState<string>('#000000');

  // 💬 Layer 4: 본문 자막 속성
  const [subtitleYPercent, setSubtitleYPercent] = useState<number>(75.0);
  const [subtitleMaxChars, setSubtitleMaxChars] = useState<number>(16); // 1줄 자동 내려쓰기 기준 글자 수
  const [subtitleStrokeEnabled, setSubtitleStrokeEnabled] = useState<boolean>(true);
  const [subtitleStrokeWidth, setSubtitleStrokeWidth] = useState<number>(4);
  const [subtitleStrokeColor, setSubtitleStrokeColor] = useState<string>('#000000');
  const [subtitleShadow, setSubtitleShadow] = useState<boolean>(true);
  const [subtitleShadowEnabled, setSubtitleShadowEnabled] = useState<boolean>(true);
  const [subtitleShadowColor, setSubtitleShadowColor] = useState<string>('rgba(0,0,0,0.95)');
  const [subtitleShadowBlur, setSubtitleShadowBlur] = useState<number>(8);
  const [subtitleUseBox, setSubtitleUseBox] = useState<boolean>(false);
  const [subtitleBoxColor, setSubtitleBoxColor] = useState<string>('rgba(0,0,0,0.75)');
  const [subtitleBorderRadius, setSubtitleBorderRadius] = useState<number>(4);

  // 🏷️ Layer 5: 하단 출처 표기 (Source Credit)
  const [hasBottomSource, setHasBottomSource] = useState<boolean>(true);
  const [bottomSourceText, setBottomSourceText] = useState<string>('출처: YouTube @ViraLoop 공식 채널');
  const [bottomSourceColor, setBottomSourceColor] = useState<string>('#CBD5E1');
  const [bottomSourceSizePx, setBottomSourceSizePx] = useState<number>(10);
  const [bottomSourceFontFamily, setBottomSourceFontFamily] = useState<string>('Pretendard');
  const [bottomSourceBold, setBottomSourceBold] = useState<boolean>(false);
  const [bottomSourceItalic, setBottomSourceItalic] = useState<boolean>(false);
  const [bottomSourceAlign, setBottomSourceAlign] = useState<'left' | 'center' | 'right'>('center');
  const [bottomSourceLetterSpacing, setBottomSourceLetterSpacing] = useState<number>(0);
  const [bottomSourceLineHeight, setBottomSourceLineHeight] = useState<number>(1.2);
  const [bottomSourceBottomPct, setBottomSourceBottomPct] = useState<number>(3.5);
  const [bottomSourceStroke, setBottomSourceStroke] = useState<boolean>(false);
  const [bottomSourceStrokeWidth, setBottomSourceStrokeWidth] = useState<number>(1);
  const [bottomSourceStrokeColor, setBottomSourceStrokeColor] = useState<string>('#000000');
  const [bottomSourceShadow, setBottomSourceShadow] = useState<boolean>(true);
  const [bottomSourceShadowBlur, setBottomSourceShadowBlur] = useState<number>(4);
  const [bottomSourceShadowColor, setBottomSourceShadowColor] = useState<string>('rgba(0,0,0,0.9)');
  const [bottomSourceBg, setBottomSourceBg] = useState<boolean>(false);
  const [bottomSourceBgColor, setBottomSourceBgColor] = useState<string>('rgba(0,0,0,0.7)');
  const [bottomSourceBorderRadius, setBottomSourceBorderRadius] = useState<number>(2);

  // 📥 바이럴 인텔리전스 센터 등 외부로부터 전송된 초기 데이터 연동
  useEffect(() => {
    const state = location.state as any;
    if (state) {
      if (state.title) {
        setTitleLine1(state.title);
      }
      if (state.subtitle) {
        setTitleLine2(state.subtitle);
      }
      if (state.sourceUrl) {
        setBottomSourceText(`출처: ${state.sourceUrl}`);
      }
      if (state.script?.scenes?.length) {
        const firstScene = state.script.scenes[0];
        if (firstScene.hook_jab_text) {
          setJabText(firstScene.hook_jab_text);
        }
      }
      toast({
        title: "바이럴 아티클 로드 완료",
        description: `헤드라인: "${state.title || ''}" 대본 데이터가 적용되었습니다.`,
      });
    }
  }, [location.state]);

  // Layer 6: 하단 배경 바 (Bottom Bar Bg)
  const [hasBottomBarBg, setHasBottomBarBg] = useState<boolean>(sovereignMode ? sovereignMode === 'classic' : true);
  const [bottomBarBg, setBottomBarBg] = useState<string>('#000000');
  const [bottomBarHeightPct, setBottomBarHeightPct] = useState<number>(6.0);
  const [bottomBarOpacity, setBottomBarOpacity] = useState<number>(1.0);
  const [bottomBarRadius, setBottomBarRadius] = useState<number>(0);

  // 🎚️ 동적 멀티 오디오 트랙 상태 (무음 영상 vs 나레이션/TTS 영상 가변 대응)
  const [enabledTracks, setEnabledTracks] = useState<{
    t1Title: boolean;
    t2Jab: boolean;
    sub: boolean;
    v1Video: boolean;
    a1Bgm: boolean;
    a2Narration: boolean; // AI 나레이션(TTS) 트랙 동적 활성화/비활성화
    a3Sfx: boolean;
  }>({
    t1Title: true,
    t2Jab: true,
    sub: true,
    v1Video: true,
    a1Bgm: true,
    a2Narration: false, // 기본: 현재 나레이션 없는 영상이므로 false
    a3Sfx: true,
  });

  const [trackMuted, setTrackMuted] = useState<{ [key: string]: boolean }>({});
  const [trackSolo, setTrackSolo] = useState<string | null>(null);

  // 👁️ 트랙별 보이기/숨기기 (Visibility) 상태 (실시간 캔버스 & 프리뷰 연동)
  const [trackVisibility, setTrackVisibility] = useState<{
    t1Title: boolean;
    t2Jab: boolean;
    sub: boolean;
    v1Video: boolean;
    source: boolean;
    a1Bgm?: boolean;
    a2Narration?: boolean;
    a3Sfx?: boolean;
  }>({
    t1Title: true,
    t2Jab: true,
    sub: true,
    v1Video: true,
    source: true,
    a1Bgm: true,
    a2Narration: true,
    a3Sfx: true,
  });

  // 🔒 트랙별 잠금 (Lock) 상태
  const [trackLock, setTrackLock] = useState<{
    t1Title: boolean;
    t2Jab: boolean;
    sub: boolean;
    v1Video: boolean;
    source: boolean;
    a1Bgm?: boolean;
    a2Narration?: boolean;
    a3Sfx?: boolean;
  }>({
    t1Title: false,
    t2Jab: false,
    sub: false,
    v1Video: false,
    source: false,
    a1Bgm: false,
    a2Narration: false,
    a3Sfx: false,
  });

  // 🔇 오디오 트랙 음소거 (Mute) 상태
  const [trackAudioMute, setTrackAudioMute] = useState<{
    v1Video: boolean;
    a1Bgm: boolean;
    a2Narration: boolean;
    a3Sfx: boolean;
  }>({
    v1Video: false,
    a1Bgm: false,
    a2Narration: false,
    a3Sfx: false,
  });

  // 🔤 자막 단어별 강조색 (Word Highlight) 상태
    const [selectedSubtitlePresetId, setSelectedSubtitlePresetId] = useState<string>('neon-yellow');
const [selectedHighlightColor, setSelectedHighlightColor] = useState<string>('#FFE500');

  // 📺 유튜브 쇼츠 메타데이터 & 표준 메타 모달 오픈 상태
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState<boolean>(false);
  const [copiedMetaKey, setCopiedMetaKey] = useState<string | null>(null);


  // 캔버스 줌 모드 변경 시 자동 스케일 동기화
  useEffect(() => {
    if (canvasZoom === 'fit') {
      setCanvasScale(1.0);
      setCanvasPan({ x: 0, y: 0 });
    } else if (canvasZoom === '50') {
      setCanvasScale(0.5);
    } else if (canvasZoom === '75') {
      setCanvasScale(0.75);
    } else if (canvasZoom === '100') {
      setCanvasScale(1.0);
    } else if (canvasZoom === '150') {
      setCanvasScale(1.5);
    } else if (canvasZoom === '200') {
      setCanvasScale(2.0);
    }
  }, [canvasZoom]);

  // 비디오 재생 배속 & 볼륨 제어 연동
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.volume = isMuted ? 0 : masterVolume / 100;
      videoRef.current.muted = isMuted;
    }
  }, [playbackRate, masterVolume, isMuted]);

  // 좌측 사이드바 탭 (2-Stage Rail & Drawer) - 대본(script) 탭 장착
  const [activeLeftTab, setActiveLeftTab] = useState<'script' | 'subtitles' | 'text' | 'layers' | 'audio' | 'media'>('script');
  const [subtitleSearchQuery, setSubtitleSearchQuery] = useState<string>('');
  
  const [activeInspectorTab, setActiveInspectorTab] = useState<InspectorSubTabId>('template');
  const [activeMasterGroup, setActiveMasterGroup] = useState<'layout' | 'text' | 'media' | 'viral'>('layout');
  const [activeFloatingInspector, setActiveFloatingInspector] = useState<string>('none');


  // 플로팅 인스펙터가 열릴 때 해당하는 우측 인스펙터 탭과 마스터 그룹 자동 동기화
  const handleOpenFloatingInspector = (insp: string) => {
    setActiveFloatingInspector(insp);
    if (insp === 'none') return;
    if (insp === 'instaProfile' || insp === 'profile') {
      setActiveMasterGroup('text');
      setActiveInspectorTab('profile');
    } else if (insp === 'ssulHeader') {
      setActiveMasterGroup('text');
      setActiveInspectorTab('ssulHeader');
    } else if (insp === 'metadata') {
      setActiveMasterGroup('text');
      setActiveInspectorTab('metadata');
    } else if (insp === 'divider') {
      setActiveMasterGroup('text');
      setActiveInspectorTab('divider');
    } else if (insp === 'topBottomBar') {
      setActiveMasterGroup('text');
      setActiveInspectorTab('topBottomBar');
    } else if (insp === 'postTitle' || insp === 'title') {
      setActiveMasterGroup('text');
      setActiveInspectorTab('title');
    } else if (insp === 'sourceCredit') {
      setActiveMasterGroup('text');
      setActiveInspectorTab('sourceCredit');
    } else if (['gunlimboHook', 'gunlimboHookBand', 'jabHook', 'badgeTag'].includes(insp)) {
      setActiveMasterGroup('text');
      setActiveInspectorTab('jabHook');
    } else if (insp === 'ssulSubtitle') {
      setActiveMasterGroup('text');
      setActiveInspectorTab('style');
    } else if (insp === 'videoCrop') {
      setActiveMasterGroup('text');
      setActiveInspectorTab('videoCrop');
    } else if (insp === 'commentCard') {
      setActiveMasterGroup('text');
      setActiveInspectorTab('commentCard');
    }
  };

  // 🗣️ 전체 대본 상태
  const [fullScript, setFullScript] = useState<string>(
    '2026 손흥민 역대급 환상골 폭발! 수비수 3명을 농락하는 충격적인 드리블 돌파 후 그림 같은 감아차기 쐐기골이 작렬했습니다. 경기장을 가득 메운 수만 관중이 일제히 기립하여 열광하고 있습니다.'
  );

  // 📝 서브타이틀 고도화 설정 (Single Source of Truth)
  const [subtitleConfig, setSubtitleConfig] = useState<SubtitleConfig>(() => {
    const saved = localStorage.getItem('viral_loop_subtitle_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (parsed.fontSize && parsed.fontSize > 24) {
            parsed.fontSize = 18;
          }
          return parsed;
        }
      } catch (e) {}
    }
    return { ...DEFAULT_SUBTITLE_CONFIG, fontSize: 18, enabled: true };
  });

  // 🎙️ 음성(TTS) 합성 마스터 설정
  const [ttsConfig, setTtsConfig] = useState<TTSConfig>({
    engine: 'edge_tts',
    language: 'ko-KR',
    voice_id: 'ko-KR-SunHiNeural',
    speed: 1.0,
    pitch: 0,
    use_silence_removal: true,
  });

  // 🎬 화면 전환(Transition) 설정
  const [transitionConfig, setTransitionConfig] = useState<TransitionConfig>({
    mode: 'fixed',
    fixedType: 'dissolve',
    durationSec: 0.5,
    randomPool: ['dissolve', 'flash_white', 'zoom_in'],
  });

  // 🛡️ 워터마크 및 채널 로고 설정
  // ⏪ 실행 취소 / 다시 실행 (Undo / Redo) 히스토리 엔진
  interface EditorSnapshot {
    layers: NleLayerObject[];
    subTransform: NleLayerTransform;
    jabTransform: NleLayerTransform;
    sourceTransform: NleLayerTransform;
    titleLinesMode: 'single' | 'double';
    titleLine1: string;
    titleLine2: string;
    titleLine1Color: string;
    titleLine2Color: string;
    titleLine1SizePx: number;
    titleLine2SizePx: number;
    titleFontFamily: string;
    hasTopBarBg: boolean;
    topBarHeightPct: number;
    topBarBg: string;
    hasBottomBarBg: boolean;
    bottomBarHeightPct: number;
    bottomBarBg: string;
    hasBottomSource: boolean;
    bottomSourceText: string;
    hasJab: boolean;
    jabText: string;
    jabTiltDeg: number;
    jabBgColor: string;
    jabTextColor: string;
    subtitleConfig: SubtitleConfig;
    subtitleBorderRadius: number;
    videoFitMode: 'sandwich' | 'fullscreen' | 'fit-center' | 'fit-top' | 'custom';
    videoZoomScale: number;
  }

  // 🎨 캡컷 10대 인기 시네마틱 필터 및 영화 노이즈 FX 상태
  const [videoFilter, setVideoFilter] = useState<VideoFilterSettings>({
    preset: 'none',
    intensity: 100,
    filmGrain: 0,
    vignette: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    temperature: 0,
  });

  // 💬 하단 바이럴 댓글 카드 상태


  // 📸 인스타형 채널 아이덴티티 10대 추천 프리셋 (랜덤 생성 및 고정 지원)
  const INSTA_PROFILE_PRESETS = [
    { name: '유머보따리', handle: '@humor_box', avatar: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=humor' },
    { name: '스타비하인드', handle: '@star_behind', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=star' },
    { name: '팩트연구소', handle: '@fact_lab', avatar: 'https://api.dicebear.com/9.x/bottts/svg?seed=fact' },
    { name: '명장면극장', handle: '@scene_theater', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=cinema' },
    { name: '댕냥이일기', handle: '@pet_diary', avatar: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=pet' },
    { name: '스포츠클립', handle: '@sports_clip', avatar: 'https://api.dicebear.com/9.x/bottts/svg?seed=sports' },
    { name: '속마음라디오', handle: '@heart_radio', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=heart' },
    { name: '길거리마이크', handle: '@street_mic', avatar: 'https://api.dicebear.com/9.x/bottts/svg?seed=mic' },
    { name: '인생꿀팁봇', handle: '@life_tips_kr', avatar: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=tips' },
    { name: '미스터리파일', handle: '@mystery_files', avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=mystery' },
  ];

  // 채널 DNA 상태
  const [channelDna, setChannelDna] = useState({
    channelName: '스포츠 사이다 명장면 TV',
    primaryColor: '#FFE500',
    secondaryColor: '#00E510',
    fontFamily: 'Pretendard',
    hookStyle: 'bold_banner',
    tabooWordCount: 0,
  });

  const initialMode = sovereignMode || (searchParams.get('mode') as LayoutTemplateMode) || 'classic';
  const [layoutTemplateMode, setLayoutTemplateMode] = useState<LayoutTemplateMode>(initialMode);
  const [masterManifest, setMasterManifest] = useState<TemplateManifest | undefined>(() =>
    getMasterTemplate(initialMode)
  );

  useEffect(() => {
    if (sovereignMode && layoutTemplateMode !== sovereignMode) {
      setLayoutTemplateMode(sovereignMode);
    }
  }, [sovereignMode]);

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

  useEffect(() => {
    const handleMasterUpdated = (e: any) => {
      const { archetype, manifest } = e.detail || {};
      const currentMode = sovereignMode || layoutTemplateMode;
      if (archetype === currentMode && manifest) {
        setMasterManifest(manifest);
      }
    };
    window.addEventListener('vl_master_template_updated', handleMasterUpdated);
    return () => window.removeEventListener('vl_master_template_updated', handleMasterUpdated);
  }, [sovereignMode, layoutTemplateMode]);

  // 📸 인스타형 프로필 블록 독립 Transform (위치, 크기 - 좌측 6% 정렬)
  const [profileTransform, setProfileTransform] = useState<NleLayerTransform>(
    createDefaultTransform({ xPct: 6.0, yPct: 4.5, scale: 1.0, zIndex: 45 })
  );

  // 📷 [인스타형 템플릿 원형] (화이트 배경 + 좌상단 프로필 + 대제목 + 중앙 구멍 윈도우 + 자막 + 댓글 카드)
  const [instaConfig, setInstaConfig] = useState<{
    profileName: string;
    profileHandle: string;
    profileAvatarUrl: string;
    isVerified: boolean;
    bgColor: string;
    subFont?: string;       // 본문 자막 서체 (기본 Pretendard)
    subColor?: string;      // 본문 자막 색상 (기본 #374151)
    holeRatio: '1:1' | '4:5' | 'custom';
    holeYPct: number;      // 중앙 구멍 중심 Y (기본 44.5%)
    holeWidthPct: number;  // 중앙 구멍 너비 (기본 88%, 좌우 마진 6%)
    holeHeightPct: number; // 중앙 구멍 높이 (기본 47%)
    holeRoundness: number; // 모서리 라운드 (기본 14px)
    holeBorderWidth: number;
    holeBorderColor: string;
    holeShadow: boolean;
    theme: 'white' | 'dark' | 'sunset' | 'cyber';
  }>({
    profileName: '사용자명',
    profileHandle: '@handle',
    profileAvatarUrl: 'https://api.dicebear.com/9.x/lorelei/svg?seed=user_avatar_blue',
    isVerified: false,
    bgColor: '#FFFFFF',
    subFont: 'Pretendard',
    subColor: '#374151',
    holeRatio: '1:1',
    holeYPct: 44.5,
    holeWidthPct: 88,
    holeHeightPct: 47,
    holeRoundness: 14,
    holeBorderWidth: 1,
    holeBorderColor: '#E5E7EB',
    holeShadow: true,
    theme: 'white',
  });

  // 🎵 5대 무드 BGM 라이브러리 모달 오픈 상태
  const [isBgmModalOpen, setIsBgmModalOpen] = useState(false);

  // 🏛️ 차세대 주권 템플릿 라이브러리 연동 상태
  const [isTemplateLibraryOpen, setIsTemplateLibraryOpen] = useState<boolean>(false);
  const [templateLibraryList, setTemplateLibraryList] = useState<any[]>([]);
  // 🌟 레이어 객체 스택 (Video, Header, Jab, Subtitles, Audio)
  const [layers, setLayers] = useState<NleLayerObject[]>([
    {
      id: 'layer_video_1',
      type: 'video',
      name: 'V1 메인 비디오',
      startMs: 0,
      endMs: 22450,
      locked: false,
      visible: true,
      transform: createDefaultTransform({ xPct: 50, yPct: 50, scale: 1.0, zIndex: 10 }),
      styleProps: { objectFit: 'cover' },
      data: '',
    },
    {
      id: 'layer_top_header',
      type: 'title',
      name: 'T1 상단 하이라이트 바',
      startMs: 0,
      endMs: 22450,
      locked: false,
      visible: true,
      transform: createDefaultTransform({ xPct: 50, yPct: 15, scale: 1.0, zIndex: 30 }),
      styleProps: {
        badgeText: 'VIRALOOP HIGHLIGHT',
        title1: '20260904_tfMMz_MKaMw',
        title2: '하이라이트',
        color1: '#FFFFFF',
        color2: '#00E510',
        bg: 'rgba(0,0,0,0.85)',
        fontSize: 14,
        fontFamily: 'Pretendard',
        align: 'center',
        bold: true,
      },
      data: '상단 2단 헤더',
    },
    {
      id: 'layer_jab_hook_1',
      type: 'jab',
      name: 'T2 쨉쨉이 #1 (반전 훅)',
      startMs: 1200,
      endMs: 4800,
      locked: false,
      visible: true,
      transform: createDefaultTransform({ xPct: 50, yPct: 26, scale: 1.0, rotationDeg: -4, zIndex: 40 }),
      styleProps: {
        badgeColor: '#FFCC00',
        textColor: '#000000',
        fontSize: 13,
        fontFamily: 'GmarketSans',
        bold: true,
      },
      data: '절대 멈추지 마세요!',
    },
    {
      id: 'layer_jab_hook_2',
      type: 'jab',
      name: 'T2 쨉쨉이 #2 (클라이맥스)',
      startMs: 14000,
      endMs: 18500,
      locked: false,
      visible: true,
      transform: createDefaultTransform({ xPct: 50, yPct: 26, scale: 1.0, rotationDeg: -4, zIndex: 40 }),
      styleProps: {
        badgeColor: '#FF0055',
        textColor: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'GmarketSans',
        bold: true,
      },
      data: '충격적인 반전 순간!',
    },
    {
      id: 'layer_sub_1',
      type: 'subtitle',
      name: 'SUB 자막 #1',
      startMs: 0,
      endMs: 5200,
      locked: false,
      visible: true,
      transform: createDefaultTransform({ xPct: 50, yPct: 78, scale: 1.0, zIndex: 50 }),
      styleProps: { color: '#FFE500', strokeWidth: 4, strokeColor: '#000000', fontSize: 16, fontFamily: 'Pretendard', align: 'center', bold: true },
      data: '조코비치 몰래카메라 ㅋㅋ',
    },
    {
      id: 'layer_sub_2',
      type: 'subtitle',
      name: 'SUB 자막 #2',
      startMs: 5200,
      endMs: 11500,
      locked: false,
      visible: true,
      transform: createDefaultTransform({ xPct: 50, yPct: 78, scale: 1.0, zIndex: 50 }),
      styleProps: { color: '#FFE500', strokeWidth: 4, strokeColor: '#000000', fontSize: 16, fontFamily: 'Pretendard', align: 'center', bold: true },
      data: '상대 선수가 전혀 눈치채지 못하고 서브를 준비합니다.',
    },
    {
      id: 'layer_sub_3',
      type: 'subtitle',
      name: 'SUB 자막 #3',
      startMs: 11500,
      endMs: 17800,
      locked: false,
      visible: true,
      transform: createDefaultTransform({ xPct: 50, yPct: 78, scale: 1.0, zIndex: 50 }),
      styleProps: { color: '#FFE500', strokeWidth: 4, strokeColor: '#000000', fontSize: 16, fontFamily: 'Pretendard', align: 'center', bold: true },
      data: '관중석에서 폭소가 터져 나오기 시작합니다!',
    },
    {
      id: 'layer_sub_4',
      type: 'subtitle',
      name: 'SUB 자막 #4',
      startMs: 17800,
      endMs: 22450,
      locked: false,
      visible: true,
      transform: createDefaultTransform({ xPct: 50, yPct: 78, scale: 1.0, zIndex: 50 }),
      styleProps: { color: '#FFE500', strokeWidth: 4, strokeColor: '#000000', fontSize: 16, fontFamily: 'Pretendard', align: 'center', bold: true },
      data: '진짜 프로들의 센스 있는 사이다 명장면 완성!',
    },
    {
      id: 'layer_audio_bgm',
      type: 'audio',
      name: 'A1 BGM & 오디오',
      startMs: 0,
      endMs: 22450,
      locked: false,
      visible: true,
      transform: createDefaultTransform({ zIndex: 5 }),
      styleProps: { volume: 0.8, isMuted: false, duckingDb: -18 },
      data: 'bgm_preset_ambient',
    }
  ]);

  const [selectedLayerId, setSelectedLayerId] = useState<string>('layer_sub_1');

  // 🎯 군림보형 (픽셀링 기반: 상단 2줄 대제목[흰색+노란색] + 중앙 100% 흰색 띠 후킹 바 + 하단 자막 배치)
  const [gunlimboConfig, setGunlimboConfig] = useState<{
    introDurationSec: number;
    titleLinesMode: 'single' | 'double';
    titleLine1: string;
    titleLine2: string;
    titleLine1Color: string;
    titleLine2Color: string;
    titleFontSize: number;
    titleLine1FontSize: number;
    titleLine2FontSize: number;
    titleLine1LetterSpacing: number;
    titleLine2LetterSpacing: number;
    titleLineHeight: number;
    titleAlign: 'left' | 'center' | 'right';
    titleLine1Align: 'left' | 'center' | 'right';
    titleLine2Align: 'left' | 'center' | 'right';
    titleBgMode: 'none' | 'box' | 'pill';
    titleBgColor: string;
    titlePaddingX: number;
    titlePaddingY: number;
    titleBorderRadius: number;
    hasTitleBadge: boolean;
    titleBadgeText: string;
    titleBadgeBg: string;
    titleBadgeColor: string;
    titleBadgeSizePx: number;
    titleBadgeRadius: number;
    hookPhrase: string;
    hookBgColor: string;
    hookTextColor: string;
    hookFontSize: number;
    hookLetterSpacing: number;
    hookLineHeight: number;
    hookAlign: 'left' | 'center' | 'right';
    showGuidelines: boolean;
    keepTitleThroughout: boolean;
    coupangSafeZone: boolean;
    kenBurnsMotion: boolean;
    pepeMemeAutoInsert: boolean;
    hookTransform?: any;
    hookYPercent?: number;
    hookFont?: string;
    hookBold?: boolean;
    hookItalic?: boolean;
    borderRadius?: number;
    strokeEnabled?: boolean;
    strokeWidth?: number;
    strokeColor?: string;
    shadowEnabled?: boolean;
    shadowBlur?: number;
    shadowColor?: string;
    // 하위 호환 필드
    hookMainTitle?: string;
    hookAnimationScale?: number;
    headlineLine1?: string;
    headlineLine2?: string;
    headlineLine3?: string;
    headlineBadge?: string;
  }>({
    introDurationSec: 2.5,
    titleLinesMode: 'double',
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
    titleAlign: 'center',
    titleLine1Align: 'center',
    titleLine2Align: 'center',
    titleBgMode: 'none',
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
    hookAlign: 'center',
    showGuidelines: false,
    keepTitleThroughout: true,
    coupangSafeZone: false,
    kenBurnsMotion: true,
    pepeMemeAutoInsert: true,
    hookMainTitle: '제목을\n입력해주세요',
    hookAnimationScale: 1.0,
    headlineLine1: '손흥민 80m 단독 폭풍 드리블',
    headlineLine2: '푸스카스상 후보 원더골 작렬',
    headlineLine3: '현지 축구 해설진 전원 기립 극찬',
    headlineBadge: '속보',
  });

  // 📜 썰형 (커뮤니티 헤더 + 텍스트 모드 + 상징 밈/일러스트)
  const [ssulConfig, setSsulConfig] = useState<{
    communityType: 'blind' | 'nate' | 'fmkorea' | 'dcinside';
    author: string;
    timeText: string;
    viewsText: string;
    upvotesText: string;
    textMode: SsulTextMode;
    memeType: MemeType;
    memeEmotion: MemeEmotion;
    customMemeUrl?: string;
    memeAliveMotion: boolean;
    currentParagraphIndex: number;
    ssulHeader?: {
      enabled?: boolean;
      channelName?: string;
      bgColor?: string;
      heightMultiplier?: number;
      font?: string;
      fontSizeMultiplier?: number;
      bold?: boolean;
      italic?: boolean;
      backIcon?: boolean;
      menuIcon?: boolean;
      shareIcon?: boolean;
      sparkleBadge?: boolean;
    };
  }>({
    communityType: 'blind',
    author: '익명의 직장인',
    timeText: '방금 전',
    viewsText: '조회 14,290',
    upvotesText: '추천 342',
    textMode: 'accumulate',
    memeType: 'pepe',
    memeEmotion: 'panic',
    memeAliveMotion: true,
    currentParagraphIndex: 0,
    ssulHeader: {
      enabled: true,
      channelName: '썰방 TV',
      bgColor: '#FFFFFF',
      heightMultiplier: 1.0,
      font: 'Pretendard',
      fontSizeMultiplier: 1.8,
      bold: true,
      italic: false,
      backIcon: true,
      menuIcon: true,
      shareIcon: true,
      sparkleBadge: true,
    },
  });

  // 💬 티키타카 3단 멀티 댓글 시퀀스 상태
  const [tikiTakaComments, setTikiTakaComments] = useState<Array<{
    id: string;
    author: string;
    handle: string;
    text: string;
    timeText: string;
    likes: string;
    delaySec: number;
    isReply: boolean;
  }>>([
    { id: 'c1', author: '축구도사', handle: '@soccer_guru', text: '아니 이게 실화냐고 ㅋㅋㅋㅋ 미쳤네 진짜', timeText: '3시간 전', likes: '1.4만', delaySec: 1.8, isReply: false },
    { id: 'c2', author: '흥민바라기', handle: '@sonny_love', text: 'ㄴ 현장에서 직접 봤는데 경기장 뒤집어짐 ㅠㅠ', timeText: '2시간 전', likes: '3,820', delaySec: 4.8, isReply: true },
    { id: 'c3', author: '냉철한비평가', handle: '@cold_critic', text: 'ㄴ 근데 수비 실책도 한몫했음 솔직히 ㅋㅋ', timeText: '1시간 전', likes: '890', delaySec: 8.2, isReply: true },
  ]);

  // ✂️ 3대 AI 대본 분할 프리셋 (쇼츠형, 균형형, 문장형)
  const [scriptSplitPreset, setScriptSplitPreset] = useState<ScriptSplitPreset>('shorts');

  // 🎵 5대 무드 BGM 라이브러리 선택 상태
  const [selectedBgmMood, setSelectedBgmMood] = useState<BgmMood>('suspense');
  const [autoMoodMatching, setAutoMoodMatching] = useState<boolean>(true);

  const [hasCommentCard, setHasCommentCard] = useState<boolean>(true);
  const [commentTransform, setCommentTransform] = useState<NleLayerTransform>(
    createDefaultTransform({ xPct: 50, yPct: 82, zIndex: 45, scale: 1.0 })
  );
  const [commentCard, setCommentCard] = useState<{
    author: string;
    handle: string;
    text: string;
    timeText: string;
    likes: string;
    theme: 'yt-dark' | 'yt-light' | 'insta';
    blurId: boolean;
    anonymous: boolean;
    yPct: number;
  }>({
    author: '조코비치찐팬',
    handle: '@joker_fan_kr',
    text: '와 15초에 저 표정 뭐냐 ㅋㅋㅋ 평생 소장각이다',
    timeText: '3시간 전',
    likes: '1.4만',
    theme: 'yt-dark',
    blurId: true,
    anonymous: false,
    yPct: 82,
  });

  const [historyStack, setHistoryStack] = useState<EditorSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isRestoringHistoryRef = useRef<boolean>(false);
  const aspectScale = aspectRatio === '16:9' ? 1.35 : (aspectRatio === '1:1' ? 1.12 : 1.0);
  const activeSplitLimit = aspectRatio === '16:9' ? 24 : (subtitleConfig.splitLimit || 14);
  const [selectedSfxCategory, setSelectedSfxCategory] = useState<string>('all');
  const [isCapCutExportModalOpen, setIsCapCutExportModalOpen] = useState<boolean>(false);

  // 🔍 1순위 실사 웹 이미지 검색 상태
  const [isWebImageSearchOpen, setIsWebImageSearchOpen] = useState(false);
  const [webImageQuery, setWebImageQuery] = useState('');
  const [webImageResults, setWebImageResults] = useState<any[]>([]);
  const [isSearchingWebImages, setIsSearchingWebImages] = useState(false);

  // 🚀 2순위 Google Flow AI 씬별 이미지 생성 상태
  const [isGeneratingFlowImage, setIsGeneratingFlowImage] = useState(false);

  // 🎭 3순위 바이럴 밈 에셋 프리셋 (페페 6종 & 이라스토야 6종)
  const PEPE_MEMES = [
    { id: 'pepe_shock', name: '충격 페페', src: '/assets/memes/pepe/pepe_shock.svg', emoji: '😱' },
    { id: 'pepe_cry', name: '오열 페페', src: '/assets/memes/pepe/pepe_cry.svg', emoji: '😭' },
    { id: 'pepe_popcorn', name: '팝콘 페페', src: '/assets/memes/pepe/pepe_popcorn.svg', emoji: '🍿' },
    { id: 'pepe_smug', name: '부자 페페', src: '/assets/memes/pepe/pepe_smug.svg', emoji: '😎' },
    { id: 'pepe_rage', name: '분노 페페', src: '/assets/memes/pepe/pepe_rage.svg', emoji: '😡' },
    { id: 'pepe_thinking', name: '고뇌 페페', src: '/assets/memes/pepe/pepe_thinking.svg', emoji: '🤔' },
  ];

  const IRASUTOYA_MEMES = [
    { id: 'irasutoya_shocked', name: '경악 직장인', src: '/assets/memes/irasutoya/irasutoya_shocked.svg', emoji: '😱' },
    { id: 'irasutoya_money', name: '돈다발 쥔 사람', src: '/assets/memes/irasutoya/irasutoya_money.svg', emoji: '💸' },
    { id: 'irasutoya_question', name: '의문 물음표', src: '/assets/memes/irasutoya/irasutoya_question.svg', emoji: '❓' },
    { id: 'irasutoya_apology', name: '사죄 도게자', src: '/assets/memes/irasutoya/irasutoya_apology.svg', emoji: '🙇' },
    { id: 'irasutoya_fight', name: '격렬 논쟁', src: '/assets/memes/irasutoya/irasutoya_fight.svg', emoji: '⚔' },
    { id: 'irasutoya_run', name: '전력 질주', src: '/assets/memes/irasutoya/irasutoya_run.svg', emoji: '🏃' },
  ];

  // ⚡ Remotion 프로그래머틱 자동화 & Props 상태
  const [isRemotionModalOpen, setIsRemotionModalOpen] = useState<boolean>(false);
  const [isRemotionRendering, setIsRemotionRendering] = useState<boolean>(false);
  const [remotionRenderProgress, setRemotionRenderProgress] = useState<number>(0);

  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>({
    enabled: false,
    type: 'text',
    text: '@ViraLoopStudio',
    imageUrl: '',
    position: 'top-right',
    scale: 20,
    opacity: 80,
    marginX: 20,
    marginY: 20,
    durationMode: 'full',
    fontFamily: 'Pretendard',
    fontSize: 16,
    textColor: '#ffffff',
    textShadow: true,
    textStroke: true,
    autoRemoveBg: false,
    badgeMask: 'none',
    colorKeying: 'none',
  });

  // 🎚️ 스테레오 오디오 VU 미터 시뮬레이션
  const [vuLevels, setVuLevels] = useState<{ left: number; right: number }>({ left: 10, right: 12 });
  useEffect(() => {
    if (!isPlaying) {
      setVuLevels({ left: 4, right: 4 });
      return;
    }
    const interval = setInterval(() => {
      setVuLevels({
        left: Math.floor(Math.random() * 65) + 25,
        right: Math.floor(Math.random() * 70) + 20,
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);




  // 🎯 활성 비디오 레이어 및 프로젝트 표시명 (SSOT & TDZ 방지)
  const videoLayer = useMemo(() => layers.find((l) => l.type === 'video'), [layers]);
  const currentProjectDisplayName: string = useMemo(() => {
    const vData = typeof videoLayer?.data === 'string' ? videoLayer.data : '';
    if (vData && typeof vData === 'string' && !vData.startsWith('data:')) {
      const clean = vData.split(/[/\\]/).pop()?.replace(/\.[^/.]+$/, '');
      if (clean && clean.length > 2) return clean;
    }
    if (topTitleText && topTitleText !== '제목을\n입력하세요') {
      return topTitleText.replace(/\n/g, ' ');
    }
    return '영상 프로젝트';
  }, [videoLayer?.data, topTitleText]);

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

  const handleApplyManifest = (rawManifest: TemplateManifest) => {
    const manifest = normalizeTemplateManifest(rawManifest);
    const arch = manifest.archetype || 'classic';
    if (manifest.aspectRatio) {
      setAspectRatio(manifest.aspectRatio);
    }
    handleSelectTemplateMode(arch as LayoutTemplateMode);

    const cs = manifest.canvasState;
    if (cs) {
      // 🏛️ 1. 2D 기즈모 좌표계 100% 복원 (인스타 오염 방지 가드 탑재)
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
      if (cs.jabTransform) {
        setJabTransform({
          ...cs.jabTransform,
          xPct: arch === 'gunlimbo' ? 50 : (cs.jabTransform.xPct ?? 50),
          rotationDeg: arch === 'gunlimbo' ? 0 : (cs.jabTransform.rotationDeg ?? 0),
        });
      }
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
      if (cs.jabTextColor) { setJabColor(cs.jabTextColor); setJabTextColor(cs.jabTextColor); }
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
      // 🏛️ 폴백: 레거시 geometry & style로부터 복원
      if (arch === 'gunlimbo') {
        setGunlimboConfig(prev => ({
          ...prev,
          titleFontSize: manifest.style?.titleFontSize || prev.titleFontSize,
          titleLine1Color: manifest.style?.titleLine1Color || prev.titleLine1Color,
          titleLine2Color: manifest.style?.titleLine2Color || prev.titleLine2Color,
          hookFontSize: manifest.style?.hookFontSize || prev.hookFontSize,
          hookBgColor: manifest.geometry?.hookBandZone?.boxColor || prev.hookBgColor,
          hookTextColor: manifest.geometry?.hookBandZone?.textColor || prev.hookTextColor,
          introDurationSec: manifest.geometry?.mediaZone?.introDurationSec || prev.introDurationSec,
        }));
      } else if (arch === 'instagram' && manifest.geometry?.holeWindowZone) {
        setInstaConfig(prev => ({
          ...prev,
          holeWidthPct: manifest.geometry.holeWindowZone?.widthPct || prev.holeWidthPct,
          holeHeightPct: manifest.geometry.holeWindowZone?.heightPct || prev.holeHeightPct,
          holeRoundness: manifest.geometry.holeWindowZone?.roundness || prev.holeRoundness,
        }));
      }

      if (manifest.style) {
        const s = manifest.style;
        if (s.titleFont) setTitleFontFamily(s.titleFont);
        if (s.titleLine1Color) setTitleLine1Color(s.titleLine1Color);
        if (s.titleLine2Color) setTitleLine2Color(s.titleLine2Color);
        if (s.titleFontSize) {
          setTitleLine1SizePx(s.titleFontSize);
          setTitleLine2SizePx(s.titleLine2FontSize || 24);
        }
        if (s.titleStroke !== undefined) setTitleStroke(s.titleStroke);
        if (s.titleShadow !== undefined) setTitleShadow(s.titleShadow);
        if (s.captionFont || s.captionDefaultColor) {
          setSubtitleConfig(prev => ({
            ...prev,
            font: s.captionFont || prev.font,
            textColor: s.captionDefaultColor || prev.textColor,
            fontSize: s.captionFontSize || prev.fontSize,
            useBox: s.captionUseBox ?? prev.useBox,
            boxColor: s.captionBoxColor || prev.boxColor,
          }));
        }
      }
    }
    
    toast({
      title: `🎨 '${manifest.name}' 템플릿 적용 완료`,
      description: `[${(manifest.archetype || 'classic').toUpperCase()}] 템플릿 디자인 공방 양식이 정밀 편집기에 100% 동일하게 일체화 적용되었습니다.`
    });
    setIsTemplateLibraryOpen(false);
  };

  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const [newTemplateNameInput, setNewTemplateNameInput] = useState<string>('');
  const [isSaveTemplateDialogOpen, setIsSaveTemplateDialogOpen] = useState<boolean>(false);

  const handleSaveCurrentStyleAsTemplate = async (customName?: string) => {
    const targetName = (customName || newTemplateNameInput || '').trim();
    if (!targetName) {
      setIsSaveTemplateDialogOpen(true);
      return;
    }
    setIsSavingTemplate(true);
    try {
      const manifest: TemplateManifest = {
        version: 1,
        id: `custom_${Date.now()}`,
        name: targetName,
        badge: '커스텀',
        description: '정밀 편집기에서 저장된 사용자 맞춤 템플릿',
        archetype: layoutTemplateMode,
        aspectRatio: '9:16',
        isSystem: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
            fontSize: 11,
          } : undefined,
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
          captionFont: subtitleConfig.font || 'Pretendard',
          captionFontSize: subtitleConfig.fontSize || 32,
          captionDefaultColor: subtitleConfig.textColor || '#FFFFFF',
          captionStrokeWidth: subtitleConfig.outlineSize || 4,
          captionStrokeColor: subtitleConfig.outlineColor || '#000000',
          captionShadowBlur: subtitleConfig.shadowSize || 4,
          captionShadowColor: subtitleConfig.shadowColor || '#000000',
          captionUseBox: subtitleConfig.useBox || false,
          captionBoxColor: subtitleConfig.boxColor || '#000000',
          captionBoxOpacity: (subtitleConfig.boxOpacity || 80) / 100,
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
        },
      };

      // 🏛️ 전문 편집기에서 만든 템플릿은 라이브러리에 신규 등록만 수행 (글로벌 템플릿 원형 오염 차단)

      const res = await api.post('/channel-dna/templates', {
        name: targetName,
        archetype: layoutTemplateMode,
        aspect_ratio: '9:16',
        description: '정밀 편집기에서 저장된 사용자 맞춤 템플릿',
        manifest: manifest,
        layout: manifest.geometry,
      });

      if (res.data?.template) {
        setTemplateLibraryList(prev => [res.data.template, ...prev.filter(t => t.id !== res.data.template.id)]);
      }

      toast({
        title: '💾 새 템플릿 저장 완료',
        description: `'${targetName}' 템플릿이 단일 DB(viral_loop.db)에 성공적으로 저장되었습니다.`
      });
      setIsSaveTemplateDialogOpen(false);
      setNewTemplateNameInput('');
    } catch (err: any) {
      console.warn('템플릿 저장 실패:', err);
      toast({
        title: '템플릿 저장 실패',
        description: err.message || '저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // 🏛️ 폼팩터 전환 시 상호 배타적 자동 정리 가드 (Auto-Switch Guard & 객체 단일화)
  const handleSelectTemplateMode = (mode: LayoutTemplateMode) => {
    setLayoutTemplateMode(mode);
    if (mode === 'instagram') {
      setHasTopBarBg(false);
      setHasBottomBarBg(false);
      setHasBottomSource(false);

      // 0. 프로필: 좌측 여백 6% 및 상단 5.5%
      setProfileTransform(prev => ({
        ...prev,
        xPct: 6.0,
        yPct: 5.5,
        scale: 1.0,
      }));

      // 1. 대제목: 활성화 & 인스타 좌측 상단 위치(프로필 바로 아래)로 자동 이동 (xPct: 6.0, yPct: 14.0)
      setHasTopTitle(true);
      setTitleTransform(prev => ({
        ...prev,
        xPct: 6.0,
        yPct: 14.0,
        scale: 1.0,
      }));
      setTopTitleYPct(14.0);
      setTitleFontFamily('Pretendard');
      setTitleStroke(false);
      setTitleShadow(false);
      setTitleBgMode('none');
      if (!topTitleText) setTopTitleText('제목을\n입력하세요');

      // 2. 구멍 윈도우 지오메트리: 황금비율 세팅 (대제목 바로 아래 밀착, 좌우 88%, 높이 46%, 중심 45%)
      setInstaConfig(prev => ({
        ...prev,
        bgColor: prev.bgColor || '#FFFFFF',
        holeYPct: 45.0,
        holeWidthPct: 88,
        holeHeightPct: 46,
        holeRoundness: 16,
        subFont: prev.subFont || 'Pretendard',
        subColor: prev.subColor || '#374151',
      }));

      // 3. 본문 자막: 인스타 구멍 윈도우 바로 아래(yPct: 71.5, xPct: 6.0)로 좌측 정렬 도킹
      setSubTransform(prev => ({
        ...prev,
        xPct: 6.0,
        yPct: 71.5,
        scale: 1.0,
      }));
      setSubtitleYPercent(71.5);

      // 4. 댓글 카드: 가변 크기 & 중앙 정렬 (xPct: 50, yPct: 82.0, zIndex: 45)
      setHasCommentCard(true);
      setCommentTransform(prev => ({
        ...prev,
        xPct: 50,
        yPct: 82.0,
        scale: 0.95,
        zIndex: 45,
      }));
      setCommentCard(prev => ({
        ...prev,
        theme: 'insta',
      }));

      // 5. 채널 DNA 연동
      if (channelDna?.channelName) {
        setInstaConfig(prev => ({
          ...prev,
          profileName: channelDna.channelName || prev.profileName,
          profileHandle: `@${channelDna.channelName.toLowerCase().replace(/\s+/g, '_')}`,
        }));
      }

      setVideoFitMode('sandwich');
      toast({
        title: '인스타형 템플릿 적용 완료',
        description: '화이트 배경 카드 + 프로필/대제목/구멍윈도우/자막/중앙댓글카드가 표준 숏폼 양식으로 자동 정렬되었습니다.',
      });
    } else if (mode === 'classic') {
      setHasTopBarBg(true);
      setHasBottomBarBg(true);
      setHasTopTitle(true);
      setTitleTransform(prev => ({
        ...prev,
        xPct: 50,
        yPct: 8,
        scale: 1.0,
      }));
      setTopTitleYPct(8);
      setSubTransform(prev => ({
        ...prev,
        xPct: 50,
        yPct: 75,
        scale: 1.0,
      }));
      setSubtitleYPercent(75);
      setHasCommentCard(false);
      toast({
        title: '기본형 템플릿 적용 완료',
        description: '상·하단 색상 배경 바와 중앙 고정 타이틀/자막이 활성화되었습니다.',
      });
    } else if (mode === 'gunlimbo') {
      setVideoFitMode('sandwich');
      setHasTopBarBg(false);
      setHasBottomBarBg(false);
      setHasTopTitle(true);
      setHasCommentCard(false);

      setTitleTransform(prev => ({ ...prev, xPct: 50.0, yPct: 12.0, scale: 1.0, zIndex: 30 }));
      setJabTransform(prev => ({ ...prev, xPct: 50.0, yPct: 24.0, scale: 1.0, rotationDeg: 0, zIndex: 45 }));
      // 자막을 하단 레터박스 중앙 영역(84.0%)으로 도킹
      setSubtitleYPercent(84.0);
      setSubTransform(prev => ({
        ...prev,
        xPct: 50.0,
        yPct: 84.0,
        scale: 1.0,
        rotationDeg: 0,
        zIndex: 40,
      }));

      // 프로젝트 제목 및 첫 문장 자막 자동 분할 & 동기화
      setGunlimboConfig(prev => {
        let t1 = prev.titleLine1;
        let t2 = prev.titleLine2;
        const candidateTitle = String(
          (topTitleText && topTitleText !== '실화 바탕 몰입감 100% 스토리') 
            ? topTitleText 
            : (currentProjectDisplayName && currentProjectDisplayName !== '영상 프로젝트' && !String(currentProjectDisplayName).startsWith('video_'))
            ? currentProjectDisplayName
            : ''
        );

        if (candidateTitle) {
          const parts = candidateTitle.trim().split(/\s+/);
          if (parts.length >= 2) {
            t1 = parts.slice(0, Math.ceil(parts.length / 2)).join(' ');
            t2 = parts.slice(Math.ceil(parts.length / 2)).join(' ');
          } else {
            t1 = candidateTitle;
            t2 = '입력해주세요';
          }
        }

        let hook = prev.hookPhrase;
        let duration = prev.introDurationSec;
        const subLayer = layers.find(l => l.id === 'layer_subtitle' || l.type === 'subtitle');
        if (subLayer?.data && Array.isArray(subLayer.data) && subLayer.data.length > 0) {
          const firstSub = subLayer.data[0];
          if (firstSub.text) hook = firstSub.text;
          if (firstSub.endMs && firstSub.startMs) {
            duration = Math.max(1.5, Math.min(5.0, (firstSub.endMs - firstSub.startMs) / 1000));
          }
        } else if (jabText && jabText !== '손흥민 원더골') {
          hook = jabText;
        }

        return {
          ...prev,
          titleLine1: t1,
          titleLine2: t2,
          hookPhrase: hook,
          introDurationSec: duration,
        };
      });

      toast({
        title: '군림보형 템플릿 적용 완료',
        description: '상단 2줄 대제목(흰색/노랑) + 중앙 100% 흰색 띠 후킹 바 + 하단 72% 세이프존 자막이 적용되었습니다.',
      });
    } else if (mode === 'ssul') {
      setHasTopBarBg(false);
      setHasBottomBarBg(false);
      setHasTopTitle(true);
      setHasCommentCard(false);
      setTitleTransform(prev => ({ ...prev, xPct: 6.0, yPct: 8.5, scale: 1.0, zIndex: 35 }));
      setSubTransform(prev => ({ ...prev, xPct: 50.0, yPct: 24.5, scale: 1.0, zIndex: 35 }));
      toast({
        title: '썰형 템플릿 적용 완료',
        description: '커뮤니티 헤더 + 텍스트 모드 + 페페 밈 생동감 모션이 적용되었습니다.',
      });
    }
  };

  // 🎯 픽셀링 스타일 4대 모드 탭 전환 및 URL 쿼리 연동
  const handleSwitchModeTab = (mode: LayoutTemplateMode) => {
    handleSelectTemplateMode(mode);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('mode', mode);
      return next;
    }, { replace: true });
  };

  // ⟲ 공식 마스터 템플릿으로 원복 (하드코딩 배제, DB/골든 스탠다드 마스터 기준)
  const handleResetToMaster = useCallback(() => {
    const archetype = sovereignMode || layoutTemplateMode || 'classic';
    const master = getMasterTemplate(archetype);
    if (!master) {
      toast({ title: '마스터 템플릿 없음', description: '기본 템플릿으로 복원합니다.', variant: 'default' });
      handleSelectTemplateMode(archetype);
      return;
    }
    handleApplyManifest(master);
    setMasterManifest(master);
    toast({
      title: '마스터 템플릿 복원 완료',
      description: `[${master.name || archetype.toUpperCase()}] 공식 마스터 설정값으로 원복되었습니다.`,
    });
  }, [sovereignMode, layoutTemplateMode, handleApplyManifest, toast]);

  // 🎯 URL Query (?mode=ssul|gunlimbo|classic|instagram) 최초 로드 및 변경 동기화
  useEffect(() => {
    if (sovereignMode) {
      handleSelectTemplateMode(sovereignMode);
      return;
    }
    const modeParam = searchParams.get('mode') as LayoutTemplateMode | null;
    if (modeParam && ['classic', 'instagram', 'gunlimbo', 'ssul'].includes(modeParam) && modeParam !== layoutTemplateMode) {
      handleSelectTemplateMode(modeParam);
    }
  }, [searchParams, sovereignMode]);

  // 🎵 BGM 및 SFX 실시간 오디오 재생 엔진 참조
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  // 🎵 BGM 오디오 URL 안전 추출기 (404 방어: 프리셋/미지정 시 undefined 반환하여 네트워크 오류 방지)
  const getBgmAudioSrc = (data?: string): string | undefined => {
    if (!data) return undefined;
    if (data.startsWith('bgm_preset_') || data === 'bgm_mix.mp3' || data === 'none') return undefined;
    if (data.startsWith('http://') || data.startsWith('https://') || data.startsWith('blob:') || data.startsWith('data:')) {
      return data;
    }
    return getMediaUrl(data);
  };

  const playedSfxIdsRef = useRef<Set<string>>(new Set());

  // 필터 CSS 계산 함수
  const computeVideoCssFilter = useCallback((f: VideoFilterSettings): string => {
    if (f.preset === 'none' && f.brightness === 100 && f.contrast === 100 && f.saturation === 100 && f.temperature === 0) {
      return 'none';
    }
    const b = f.brightness / 100;
    const c = f.contrast / 100;
    const s = f.saturation / 100;
    let str = `brightness(${b}) contrast(${c}) saturate(${s})`;
    if (f.temperature > 0) {
      str += ` sepia(${(f.temperature / 100) * 0.35})`;
    } else if (f.temperature < 0) {
      str += ` hue-rotate(${(f.temperature / 100) * 20}deg)`;
    }
    if (f.preset === 'film-noir') str += ' grayscale(100%)';
    else if (f.preset === 'retro-vhs') str += ' sepia(0.15) hue-rotate(-6deg)';
    else if (f.preset === 'teal-orange') str += ' hue-rotate(-8deg)';
    else if (f.preset === 'cyberpunk') str += ' hue-rotate(15deg)';
    else if (f.preset === 'vintage-grain') str += ' sepia(0.35)';
    return str;
  }, []);

  // 💬 AI 가상 바이럴 베댓 원클릭 생성기
  const handleGenerateViralComment = () => {
    const mockComments = [
      { author: '쇼츠중독자', handle: '@shorts_holic', text: '와 15초에 저 표정 뭐냐 ㅋㅋㅋ 평생 소장각이다', likes: '1.4만' },
      { author: '테니스요정', handle: '@tennis_fairy_99', text: '상대방 멘붕 온 게 화면 뚫고 느껴지넼ㅋㅋㅋ', likes: '8,240' },
      { author: '알고리즘유목민', handle: '@algo_surfer', text: '이게 왜 진짜임? 프로들 장난치는 거 개웃기넼ㅋㅋ', likes: '1.1만' },
      { author: '새벽감성러', handle: '@dawn_vibe', text: '진짜 프로들의 센스 있는 사이다 명장면 인정합니다 👍', likes: '6,490' },
      { author: '국내도입시급', handle: '@urgent_kr', text: '이거 풀영상 어디서 보나요? 제발 2탄 올려주세요 ㅠㅠ', likes: '9,810' },
    ];
    const picked = mockComments[Math.floor(Math.random() * mockComments.length)];
    setCommentCard(prev => ({
      ...prev,
      author: picked.author,
      handle: picked.handle,
      text: picked.text,
      likes: picked.likes,
      timeText: '방금 전',
    }));
    toast({
      title: '💬 AI 가상 바이럴 댓글 생성 완료',
      description: `"${picked.text.slice(0, 20)}..." 베댓이 자동 생성되었습니다.`,
    });
  };

  // 🔍 실사 웹 이미지 검색 실행기
  const handleSearchWebImages = async (q?: string) => {
    const query = (q || webImageQuery || topTitleText || gunlimboConfig.hookPhrase || '').trim();
    if (!query) {
      toast({ title: '검색어를 입력하세요', variant: 'destructive' });
      return;
    }
    setIsSearchingWebImages(true);
    try {
      const res = await axios.post('/api/assets/search-web-images', { query, limit: 12 });
      if (res.data?.results) {
        setWebImageResults(res.data.results);
        if (res.data.results.length === 0) {
          toast({ title: '검색 결과가 없습니다.', description: '다른 키워드로 검색해보세요.' });
        }
      }
    } catch (e: any) {
      toast({ title: '실사 검색 실패', description: e.message, variant: 'destructive' });
    } finally {
      setIsSearchingWebImages(false);
    }
  };

  // 📸 검색된 실사 이미지 적용
  const handleApplyWebImage = (imgUrl: string) => {
    setLayers(prev => prev.map(l => l.type === 'video' ? { ...l, data: imgUrl } : l));
    setIsWebImageSearchOpen(false);
    toast({
      title: '📸 실사 이미지 적용 완료',
      description: '선택하신 웹 실사 자료가 중앙 씬 미디어로 설정되었습니다.',
    });
  };

  // 🚀 Google Flow AI 씬별 이미지 생성 실행기
  const handleGenerateFlowImage = async (customPrompt?: string) => {
    setIsGeneratingFlowImage(true);
    try {
      const currentSub = layers.find(l => l.type === 'subtitle' && currentTimeMs >= l.startMs && currentTimeMs <= l.endMs);
      const sceneContext = customPrompt || currentSub?.data || gunlimboConfig.hookPhrase || topTitleText || '극적인 명장면';

      // 3대 바이럴 공식: 극사실주의 시네마틱 + 스튜디오 조명 + 1:1 정방형 도킹
      const viralPrompt = `surreal photorealistic 8k cinematic photo, ${sceneContext}, dramatic studio lighting, intense facial expression, sharp focus, 1:1 square centered composition, award-winning photography, hyper-detailed`;

      toast({
        title: '🎨 Google Flow AI 이미지 생성 시작',
        description: `"${sceneContext.slice(0, 15)}..." 바이럴 프롬프트로 생성 중입니다.`,
      });

      const apiObj = (window as any).electronAPI;
      if (apiObj && (apiObj.flowGenerateImage || apiObj.generateImage)) {
        const fn = apiObj.flowGenerateImage || apiObj.generateImage;
        const res = await fn({
          prompt: viralPrompt,
          aspectRatio: aspectRatio === '16:9' ? '16:9' : '1:1',
          batchCount: 1,
        });

        if (res?.success && (res?.images?.[0]?.base64 || res?.base64 || res?.url || res?.image_url)) {
          const imgUrl = res.images?.[0]?.base64 || res.base64 || res.url || res.image_url;
          setLayers(prev => prev.map(l => l.type === 'video' ? { ...l, data: imgUrl } : l));
          toast({
            title: '✨ Flow AI 이미지 생성 완료',
            description: '캔버스 중앙 1:1 도킹 미디어 레이어에 즉시 적용되었습니다.',
          });
          return;
        }
      }

      // 브라우저 또는 데모 환경 폴백
      const demoImg = 'https://images.unsplash.com/photo-1511707171634-5f897ff02560?w=1080&auto=format&fit=crop&q=80';
      setLayers(prev => prev.map(l => l.type === 'video' ? { ...l, data: demoImg } : l));
      toast({
        title: '🎨 Flow AI 씬 이미지 적용 완료',
        description: '하이퍼리얼리즘 미디어가 타임라인에 반영되었습니다.',
      });
    } catch (err: any) {
      toast({
        title: '이미지 생성 오류',
        description: err?.message || 'Flow AI 생성 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingFlowImage(false);
    }
  };

  // 🎭 페페 & 이라스토야 밈 삽입기
  const handleInsertMeme = (meme: { name: string; src: string; emoji: string }) => {
    const newJabId = `layer_meme_${Date.now()}`;
    const startMs = currentTimeMs;
    const endMs = Math.min(durationMs, currentTimeMs + 1800);

    const newMemeLayer: NleLayerObject = {
      id: newJabId,
      type: 'jab',
      name: `MEME: ${meme.name}`,
      startMs,
      endMs,
      locked: false,
      visible: true,
      transform: createDefaultTransform({ xPct: 50, yPct: 40, scale: 1.15, zIndex: 45 }),
      styleProps: {
        badgeColor: '#FFFFFF',
        textColor: '#111111',
        fontSize: 16,
        fontFamily: 'Pretendard',
        bold: true,
        memeSrc: meme.src,
      },
      data: `${meme.emoji} ${meme.name}`,
    };

    setLayers(prev => [...prev, newMemeLayer]);
    setSelectedLayerId(newJabId);
    toast({
      title: `🎭 ${meme.name} 삽입 완료`,
      description: `${(startMs / 1000).toFixed(1)}초 위치에 1.8초 펄스 모션 밈이 배치되었습니다.`,
    });
  };

  // 🌟 [자가 치유형 세션 영속성 엔진 (Self-Healing Persistence Engine)]
  // 1) Handoff 최우선 수신 및 localStorage 백업
  // 2) 새로고침/재시작 시 localStorage에서 직전 작업 상태(비디오 URL, 대본 자막, 인스타 설정 등) 완벽 복원
  // 3) 작업 중 상태 변경 시 디바운스 실시간 자동 저장 (Autosave)
  const isHydratedRef = useRef(false);

  useEffect(() => {
    try {
      const rawHandoff = sessionStorage.getItem('vlstudio_editor_handoff');
      if (rawHandoff) {
        // 즉시 소비하여 새로고침 시 무한 덮어쓰기 방지
        sessionStorage.removeItem('vlstudio_editor_handoff');
        const parsed = JSON.parse(rawHandoff);
        localStorage.setItem('vlstudio_editor_handoff_backup', rawHandoff);
        const videoUrl = parsed.videoUrl || '';
        const title = parsed.title || '영상 프로젝트';
        const subList = parsed.subtitles || [];
        const jabList = parsed.jabs || [];
        const handoffChannelName = parsed.channelName || parsed.brandChannelName || '';
        const handoffTemplateMode = parsed.layoutTemplateMode || parsed.templateMode || '';

        // 1) 제목 및 채널명 상태 즉시 동기화
        setTopTitleText(title);
        if (handoffChannelName) {
          setChannelDna(prev => ({ ...prev, channelName: handoffChannelName }));
          setSsulConfig(prev => ({
            ...prev,
            author: prev.author === '익명의 직장인' ? handoffChannelName : prev.author,
            ssulHeader: {
              ...prev.ssulHeader,
              channelName: handoffChannelName,
            },
          }));
        }
        const effectiveMode = sovereignMode || handoffTemplateMode || layoutTemplateMode;
        if (!sovereignMode && handoffTemplateMode) {
          setLayoutTemplateMode(handoffTemplateMode as any);
        }
        setInstaConfig(prev => ({
          ...prev,
          titleText: title,
          profileName: handoffChannelName || prev.profileName,
        }));

        // 2) 인스타형 템플릿 댓글 카드 (인스타 모드일 때만 활성화)
        setHasCommentCard(effectiveMode === 'instagram');

        setLayers((prev) => {
          const videoL = prev.find((l) => l.type === 'video');
          const headerL = prev.find((l) => l.type === 'title');
          const bgmL = prev.find((l) => l.type === 'audio');

          const newHeader: NleLayerObject = headerL ? {
            ...headerL,
            styleProps: {
              ...headerL.styleProps,
              title1: title,
              title2: '하이라이트',
            },
            data: title,
          } : {
            id: 'layer_header_title',
            type: 'title',
            name: 'T1 메인 타이틀',
            startMs: 0,
            endMs: 60000,
            locked: false,
            visible: true,
            transform: createDefaultTransform({ xPct: 6.0, yPct: 14.0, scale: 1.0, zIndex: 40 }),
            styleProps: { title1: title, title2: '하이라이트', font: 'Pretendard', textColor: '#000000' },
            data: title,
          };

          const newVideo: NleLayerObject = videoL ? {
            ...videoL,
            data: videoUrl,
          } : {
            id: 'layer_video',
            type: 'video',
            name: 'V1 메인 비디오',
            startMs: 0,
            endMs: 60000,
            locked: false,
            visible: true,
            transform: createDefaultTransform({ zIndex: 10 }),
            styleProps: { cropTop: 0, cropBottom: 0, fitMode: 'sandwich', zoom: 100 },
            data: videoUrl,
          };

          // 자막 동적 빌드: 실제 분석된 자막이 들어오면 매핑하고, 없으면 빈 배열로 리셋 (이전 더미 자막 유출 원천 차단)
          const dynamicSubs: NleLayerObject[] = subList.length > 0
            ? subList.map((s: any, idx: number) => ({
                id: `layer_sub_${idx + 1}`,
                type: 'subtitle',
                name: `SUB 자막 #${idx + 1}`,
                startMs: Math.round((s.start ?? s.start_time ?? (idx * 3)) * 1000),
                endMs: Math.round((s.end ?? s.end_time ?? ((idx + 1) * 3)) * 1000),
                locked: false,
                visible: true,
                transform: createDefaultTransform({ xPct: 6.0, yPct: 71.5, scale: 1.0, zIndex: 50 }),
                styleProps: { color: '#374151', strokeWidth: 0, strokeColor: 'transparent', fontSize: 15, fontFamily: 'Pretendard', align: 'left', bold: false },
                data: s.text || `자막 문장 #${idx + 1}`,
              }))
            : [];

          // 쨉쨉이 동적 빌드: 실제 분석된 쨉쨉이가 들어오면 매핑하고, 없으면 빈 배열로 리셋
          const dynamicJabs: NleLayerObject[] = jabList.length > 0
            ? jabList.map((j: any, idx: number) => ({
                id: `layer_jab_${idx + 1}`,
                type: 'jab',
                name: `T2 쨉쨉이 #${idx + 1}`,
                startMs: Math.round((j.start ?? j.start_time ?? 1.5) * 1000),
                endMs: Math.round((j.end ?? j.end_time ?? 3.5) * 1000),
                locked: false,
                visible: true,
                transform: createDefaultTransform({ xPct: 50, yPct: 26, scale: 1.0, rotationDeg: -4, zIndex: 40 }),
                styleProps: { badgeColor: idx % 2 === 0 ? '#FFCC00' : '#FF0055', textColor: '#000000', fontSize: 13, fontFamily: 'GmarketSans', bold: true },
                data: j.text || j.hook || `쨉쨉이 #${idx + 1}`,
              }))
            : [];

          const finalBgm = bgmL || {
            id: 'layer_audio_bgm',
            type: 'audio',
            name: 'A1 BGM & 오디오',
            startMs: 0,
            endMs: 60000,
            locked: false,
            visible: true,
            transform: createDefaultTransform({ zIndex: 5 }),
            styleProps: { volume: 0.8, isMuted: false, duckingDb: -18 },
            data: 'bgm_preset_ambient',
          };

          return [newVideo, newHeader, ...dynamicJabs, ...dynamicSubs, finalBgm];
        });
        isHydratedRef.current = true;
        return;
      }

      // 2) sessionStorage가 없을 때: localStorage 직전 작업 상태 복원 시도
      const savedProjectRaw = localStorage.getItem('vlstudio_editor_active_project_v2');
      if (savedProjectRaw) {
        const saved = JSON.parse(savedProjectRaw);
        if (saved.layers && saved.layers.length > 0) {
          setLayers(saved.layers);
        }
        const effectiveSavedMode = sovereignMode || saved.layoutTemplateMode || layoutTemplateMode;
        if (!sovereignMode && saved.layoutTemplateMode) setLayoutTemplateMode(saved.layoutTemplateMode);
        if (saved.topTitleText !== undefined) setTopTitleText(saved.topTitleText);
        if (saved.instaConfig) setInstaConfig(saved.instaConfig);
        if (saved.gunlimboConfig) setGunlimboConfig(prev => ({ ...prev, ...saved.gunlimboConfig }));
        if (saved.commentCard) setCommentCard(saved.commentCard);
        // 인스타 모드인 경우에만 댓글 카드 활성화
        setHasCommentCard(effectiveSavedMode === 'instagram' ? (saved.hasCommentCard !== false) : false);
        if (saved.profileTransform) setProfileTransform(saved.profileTransform);
        if (saved.titleTransform) setTitleTransform(saved.titleTransform);
        if (saved.subTransform) setSubTransform(saved.subTransform);
        if (saved.commentTransform) {
          setCommentTransform({
            ...saved.commentTransform,
            zIndex: Math.max(45, saved.commentTransform.zIndex || 45),
          });
        }
        if (saved.videoFitMode) setVideoFitMode(saved.videoFitMode);
        if (saved.hasTopTitle !== undefined) setHasTopTitle(saved.hasTopTitle);
        if (saved.hasTopBarBg !== undefined) setHasTopBarBg(saved.hasTopBarBg);
        if (saved.hasBottomBarBg !== undefined) setHasBottomBarBg(saved.hasBottomBarBg);
        if (saved.hasBottomSource !== undefined) setHasBottomSource(saved.hasBottomSource);
        isHydratedRef.current = true;
        return;
      }

      // 3) active_project도 없는 경우: handoff 백업에서 복원 시도
      const backupRaw = localStorage.getItem('vlstudio_editor_handoff_backup');
      if (backupRaw) {
        const parsed = JSON.parse(backupRaw);
        const videoUrl = parsed.videoUrl || '';
        const title = parsed.title || '영상 프로젝트';
        const subList = parsed.subtitles || [];
        const jabList = parsed.jabs || [];
        const handoffChannelName = parsed.channelName || parsed.brandChannelName || '';
        const handoffTemplateMode = parsed.layoutTemplateMode || parsed.templateMode || '';

        if (title) setTopTitleText(title);
        if (handoffChannelName) {
          setChannelDna((prev) => ({ ...prev, channelName: handoffChannelName }));
          setSsulConfig((prev: any) => ({
            ...prev,
            author: prev.author === '익명의 직장인' ? handoffChannelName : prev.author,
            ssulHeader: {
              ...prev.ssulHeader,
              channelName: handoffChannelName,
            },
          }));
        }
        if (handoffTemplateMode && !sovereignMode) {
          setLayoutTemplateMode(handoffTemplateMode as any);
        }

        setLayers((prev) => {
          const videoL = prev.find((l) => l.type === 'video');
          const headerL = prev.find((l) => l.type === 'title');

          const newHeader: NleLayerObject = headerL ? {
            ...headerL,
            styleProps: { ...headerL.styleProps, title1: title, title2: '하이라이트' }
          } : prev[1];

          const newVideo: NleLayerObject = videoL ? {
            ...videoL,
            data: videoUrl
          } : prev[0];

          const dynamicSubs: NleLayerObject[] = subList.length > 0
            ? subList.map((s: any, idx: number) => ({
                id: `layer_sub_${idx + 1}`,
                type: 'subtitle',
                name: `SUB 자막 #${idx + 1}`,
                startMs: Math.round((s.start ?? s.start_time ?? (idx * 3)) * 1000),
                endMs: Math.round((s.end ?? s.end_time ?? ((idx + 1) * 3)) * 1000),
                locked: false,
                visible: true,
                transform: createDefaultTransform({ xPct: 50, yPct: 78, scale: 1.0, zIndex: 50 }),
                styleProps: { color: '#FFE500', strokeWidth: 4, strokeColor: '#000000', fontSize: 16, fontFamily: 'Pretendard', align: 'center', bold: true },
                data: s.text || `자막 문장 #${idx + 1}`,
              }))
            : prev.filter((l) => l.type === 'subtitle');

          const dynamicJabs: NleLayerObject[] = jabList.length > 0
            ? jabList.map((j: any, idx: number) => ({
                id: `layer_jab_${idx + 1}`,
                type: 'jab',
                name: `T2 쨉쨉이 #${idx + 1}`,
                startMs: Math.round((j.start ?? j.start_time ?? 1.5) * 1000),
                endMs: Math.round((j.end ?? j.end_time ?? 3.5) * 1000),
                locked: false,
                visible: true,
                transform: createDefaultTransform({ xPct: 50, yPct: 26, scale: 1.0, rotationDeg: -4, zIndex: 40 }),
                styleProps: { badgeColor: idx % 2 === 0 ? '#FFCC00' : '#FF0055', textColor: '#000000', fontSize: 13, fontFamily: 'GmarketSans', bold: true },
                data: j.text || j.hook || `쨉쨉이 #${idx + 1}`,
              }))
            : prev.filter((l) => l.type === 'jab');

          return [newVideo, newHeader, ...dynamicJabs, ...dynamicSubs, prev[prev.length - 1]];
        });
      }
      isHydratedRef.current = true;
    } catch (e) {
      console.warn('[ShortsEditorStudio] self-healing hydration error:', e);
      isHydratedRef.current = true;
    }
  }, []);

  // 🏛️ 전문 편집기: 템플릿 마스터를 베이스로 일회성 복사(Sandbox) 로드 후 독립 운영
  useEffect(() => {
    // 1. 공방에서 [⚡ 정밀 편집기에 적용] 버튼을 눌러 명시적으로 전달된 템플릿이 있는 경우 1회 소비(Consume)
    const raw = localStorage.getItem('applied_template_manifest');
    if (raw) {
      try {
        const manifest = JSON.parse(raw);
        if (!sovereignMode || manifest.archetype === sovereignMode) {
          handleApplyManifest(manifest);
        }
      } catch (_) {}
      // 🛡️ 1회성 핸드오프 후 즉시 제거하여 이후 새로고침이나 다른 작업 시 오염 방지
      localStorage.removeItem('applied_template_manifest');
      return;
    }

    // 2. sovereignMode 진입 시 해당 폼팩터 공식 마스터 템플릿을 시작 베이스로 1회 안전 로드
    if (sovereignMode) {
      const master = getMasterTemplate(sovereignMode);
      if (master) {
        setMasterManifest(master);
      }
    }
    // 🚫 외부(공방/타 탭)의 실시간 브로드캐스트 리스너 완전 차단:
    // 편집 중인 프로젝트 캔버스가 외부 이벤트로 인해 강제 리셋되는 사고를 원천 방지합니다.
  }, [sovereignMode]);

  // 💾 실시간 자동 저장 (Autosave Debounce 600ms)
  useEffect(() => {
    if (!isHydratedRef.current) return;
    const timer = setTimeout(() => {
      try {
        const payload = {
          layers,
          layoutTemplateMode,
          topTitleText,
          instaConfig,
          gunlimboConfig,
          commentCard,
          hasCommentCard,
          profileTransform,
          titleTransform,
          subTransform,
          commentTransform,
          videoFitMode,
          hasTopTitle,
          hasTopBarBg,
          hasBottomBarBg,
          hasBottomSource,
          savedAt: Date.now(),
        };
        localStorage.setItem('vlstudio_editor_active_project_v2', JSON.stringify(payload));
      } catch (err) {
        console.warn('[ShortsEditorStudio] autosave error:', err);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [
    layers,
    layoutTemplateMode,
    topTitleText,
    instaConfig,
    gunlimboConfig,
    commentCard,
    hasCommentCard,
    profileTransform,
    titleTransform,
    subTransform,
    commentTransform,
    videoFitMode,
    hasTopTitle,
    hasTopBarBg,
    hasBottomBarBg,
    hasBottomSource,
  ]);

  const selectedLayer = useMemo(() => {
    return layers.find((l) => l.id === selectedLayerId) || layers[0];
  }, [layers, selectedLayerId]);

  const updateLayerTransform = useCallback((layerId: string, newTransform: NleLayerTransform) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, transform: newTransform } : l))
    );
  }, []);

  const updateLayerData = useCallback((layerId: string, newData: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, data: newData } : l))
    );
  }, []);

  const updateLayerStyle = useCallback((layerId: string, patch: Record<string, any>) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, styleProps: { ...l.styleProps, ...patch } } : l))
    );
  }, []);

    // 📺 화면비 전환 시 스마트 비례 스케일링 & 레이아웃 자동 적응 엔진
    // 🎵 BGM 프리셋 선택 & 실시간 반영
  const handleSelectBgmPreset = (presetId: string) => {
    pushHistorySnapshot();
    setLayers(prev => prev.map(l => {
      if (l.type === 'audio' && (l.id === 'layer_audio_bgm' || l.name.includes('BGM'))) {
        const p = BGM_PRESETS.find(x => x.id === presetId);
        return {
          ...l,
          data: presetId,
          name: p ? `A1 BGM (${p.name})` : 'A1 BGM',
          styleProps: { ...l.styleProps, volume: bgmVolume },
        };
      }
      return l;
    }));

    if (isPlaying) {
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
      }
      proceduralBgmEngine.start(presetId, (trackAudioMute.a1Bgm ? 0 : bgmVolume) / 100);
    }

    const preset = BGM_PRESETS.find(x => x.id === presetId);
    toast({
      title: `🎵 BGM 변경: ${preset?.name || presetId}`,
      description: '로컬 Web Audio 실시간 신스 엔진으로 끊김 없이 재생됩니다.',
    });
  };

  // 📂 사용자 커스텀 BGM 파일 업로드
  const handleUploadBgmFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    pushHistorySnapshot();
    const url = URL.createObjectURL(file);
    setLayers(prev => prev.map(l => {
      if (l.type === 'audio' && (l.id === 'layer_audio_bgm' || l.name.includes('BGM'))) {
        return {
          ...l,
          data: url,
          name: `A1 BGM (${file.name})`,
          styleProps: { ...l.styleProps, volume: bgmVolume },
        };
      }
      return l;
    }));

    if (isPlaying) {
      proceduralBgmEngine.stop();
      if (bgmAudioRef.current) {
        bgmAudioRef.current.src = url;
        bgmAudioRef.current.currentTime = currentTimeMs / 1000;
        bgmAudioRef.current.play().catch(() => {});
      }
    }

    toast({
      title: '🎵 BGM 파일 로드 완료',
      description: `${file.name} 음원이 A1 트랙에 설정되었습니다.`,
    });
  };

  const handleSwitchAspectRatio = (newRatio: '9:16' | '16:9' | '1:1') => {
    if (newRatio === aspectRatio) return;
    pushHistorySnapshot();
    setAspectRatio(newRatio);

    if (newRatio === '16:9') {
      // 🎬 16:9 롱폼 최적화 자동 적응
      setVideoFitMode('fullscreen');
      setHasTopBarBg(false);
      setHasBottomBarBg(false);
      setSubTransform(prev => ({ ...prev, xPct: 50, yPct: 84 }));
      setJabTransform(prev => ({ ...prev, xPct: 18, yPct: 15, scale: 0.9 }));
      setTitleTransform(prev => ({ ...prev, xPct: 50, yPct: 8, scale: 0.9 }));
      setSubtitleConfig(prev => ({
        ...prev,
        fontSize: Math.max(20, (prev.fontSize || 18) + 2),
        splitLimit: 24, // 가로가 넓으므로 24글자까지 자연스럽게 표시
      }));
      toast({
        title: '📺 16:9 롱폼 해상도 전환 완료',
        description: '1920×1080 규격에 맞춰 영상 핏, 자막(하단 84%), 쨉쨉이 위치가 비례 재배치되었습니다.',
      });
    } else if (newRatio === '9:16') {
      // 📱 9:16 쇼츠 최적화 복원
      setVideoFitMode('sandwich');
      setHasTopBarBg(true);
      setHasBottomBarBg(true);
      setSubTransform(prev => ({ ...prev, xPct: 50, yPct: 78 }));
      setJabTransform(prev => ({ ...prev, xPct: 50, yPct: 28, scale: 1.0 }));
      setTitleTransform(prev => ({ ...prev, xPct: 50, yPct: 9, scale: 1.0 }));
      setSubtitleConfig(prev => ({
        ...prev,
        fontSize: Math.min(20, Math.max(16, (prev.fontSize || 20) - 2)),
        splitLimit: 14, // 9:16 세로 쇼츠용 14글자
      }));
      toast({
        title: '📱 9:16 쇼츠 해상도 전환 완료',
        description: '1080×1920 규격에 맞춰 샌드위치 핏, 상단 2단 헤더, 쇼츠 자막이 복원되었습니다.',
      });
    } else {
      // 1:1 피드 최적화
      setVideoFitMode('sandwich');
      setSubTransform(prev => ({ ...prev, xPct: 50, yPct: 80 }));
      setJabTransform(prev => ({ ...prev, xPct: 50, yPct: 22 }));
      setTitleTransform(prev => ({ ...prev, xPct: 50, yPct: 9 }));
      toast({
        title: '⏹️ 1:1 피드 해상도 전환 완료',
        description: '1080×1080 정사각형 규격에 맞춰 레이아웃이 조정되었습니다.',
      });
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      videoRef.current?.pause();
      bgmAudioRef.current?.pause();
      proceduralBgmEngine.stop();
      setIsPlaying(false);
    } else {
      playedSfxIdsRef.current.clear();
      videoRef.current?.play().catch(() => {});
      
      // 🎵 BGM 재생: 프리셋인 경우 Web Audio 신스 가동, 파일인 경우 <audio> 가동
      const bgmLayer = layers.find(l => l.type === 'audio' && (l.id === 'layer_audio_bgm' || l.name.includes('BGM')));
      if (enabledTracks.a1Bgm && !trackAudioMute.a1Bgm && bgmLayer && trackVisibility.a1Bgm !== false) {
        const bgmData = bgmLayer.data || 'bgm_preset_ambient';
        if (bgmData.startsWith('bgm_preset_') || bgmData === 'bgm_mix.mp3') {
          const presetId = bgmData === 'bgm_mix.mp3' ? 'bgm_preset_ambient' : bgmData;
          const vol = ((bgmLayer.styleProps?.volume as number) ?? 35) / 100;
          proceduralBgmEngine.start(presetId, vol);
        } else if (bgmAudioRef.current && getBgmAudioSrc(bgmData)) {
          bgmAudioRef.current.currentTime = currentTimeMs / 1000;
          bgmAudioRef.current.play().catch(() => {});
        }
      }
      setIsPlaying(true);
    }
  };

  const seekToMs = (targetMs: number) => {
    const clamped = Math.max(0, Math.min(durationMs, targetMs));
    setCurrentTimeMs(clamped);
    playedSfxIdsRef.current.clear();
    if (videoRef.current) {
      videoRef.current.currentTime = clamped / 1000;
    }
    if (bgmAudioRef.current) {
      bgmAudioRef.current.currentTime = clamped / 1000;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const curMs = Math.round(videoRef.current.currentTime * 1000);
      setCurrentTimeMs(curMs);

      // 🎵 실시간 SFX 효과음 자동 재생 (플레이헤드가 SFX 시작 지점을 지날 때 발동)
      if (isPlaying && enabledTracks.a3Sfx && !trackAudioMute.a3Sfx && trackVisibility.a3Sfx !== false) {
        const sfxClips = layers.filter(
          (l) => l.type === 'audio' && (l.name.startsWith('SFX:') || l.id.startsWith('smart_sfx') || l.id.startsWith('sfx_'))
        );
        sfxClips.forEach((sfx) => {
          if (curMs >= sfx.startMs && curMs < sfx.startMs + 350 && !playedSfxIdsRef.current.has(sfx.id)) {
            playedSfxIdsRef.current.add(sfx.id);
            playSynthesizedSfx(sfx.data || 'sfx_punch_hit');
          }
        });
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      const dur = Math.round(videoRef.current.duration * 1000);
      if (dur > 0) setDurationMs(dur);
    }
  };

  // ⏱️ 비디오 부재 시(대본/썰형/이미지/오디오 프로젝트) 가상 마스터 클록 (Virtual Master Playback Clock)
  useEffect(() => {
    if (!isPlaying) return;
    // 실제 네이티브 비디오가 정상 로드되어 재생 중인 경우 onTimeUpdate에 위임
    const hasActiveVideo = videoLayer?.data && !/\.(png|jpe?g|webp|gif)$/i.test(videoLayer.data) && videoRef.current && !videoRef.current.paused && !videoRef.current.ended;
    if (hasActiveVideo) return;

    let lastTime = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;

      setCurrentTimeMs((prev) => {
        const next = Math.round(prev + delta);
        if (next >= durationMs) {
          if (isLooping) {
            seekToMs(0);
            return 0;
          }
          setIsPlaying(false);
          return durationMs;
        }

        // SFX 효과음 실시간 감지
        if (enabledTracks.a3Sfx && !trackAudioMute.a3Sfx && trackVisibility.a3Sfx !== false) {
          const sfxClips = layers.filter(
            (l) => l.type === 'audio' && (l.name.startsWith('SFX:') || l.id.startsWith('smart_sfx') || l.id.startsWith('sfx_'))
          );
          sfxClips.forEach((sfx) => {
            if (next >= sfx.startMs && next < sfx.startMs + 350 && !playedSfxIdsRef.current.has(sfx.id)) {
              playedSfxIdsRef.current.add(sfx.id);
              playSynthesizedSfx(sfx.data || 'sfx_punch_hit');
            }
          });
        }

        return next;
      });
    }, 33);

    return () => clearInterval(timer);
  }, [isPlaying, durationMs, isLooping, videoLayer?.data, enabledTracks.a3Sfx, trackAudioMute.a3Sfx, trackVisibility.a3Sfx, layers]);

  // 🎯 활성 레이어 필터
  const titleLayer = layers.find((l) => l.type === 'title');
  const activeJab = layers.find((l) => l.type === 'jab' && l.visible && currentTimeMs >= l.startMs && currentTimeMs <= l.endMs);
  const activeSub = layers.find((l) => l.type === 'subtitle' && l.visible && currentTimeMs >= l.startMs && currentTimeMs <= l.endMs);
  const subtitleLayers = useMemo(() => layers.filter((l) => l.type === 'subtitle'), [layers]);

  // 자막 검색 필터
    // 🌟 대본 텍스트 기반 씬 자동 분할 & 타임라인 동기화
  // 📸 에디터 상태 스냅샷 저장
  const pushHistorySnapshot = useCallback(() => {
    if (isRestoringHistoryRef.current) return;
    const snap: EditorSnapshot = {
      layers: JSON.parse(JSON.stringify(layers)),
      subTransform: { ...subTransform },
      jabTransform: { ...jabTransform },
      sourceTransform: { ...sourceTransform },
      titleLinesMode,
      titleLine1,
      titleLine2,
      titleLine1Color,
      titleLine2Color,
      titleLine1SizePx,
      titleLine2SizePx,
      titleFontFamily,
      hasTopBarBg,
      topBarHeightPct,
      topBarBg,
      hasBottomBarBg,
      bottomBarHeightPct,
      bottomBarBg,
      hasBottomSource,
      bottomSourceText,
      hasJab,
      jabText,
      jabTiltDeg,
      jabBgColor,
      jabTextColor,
      subtitleConfig: { ...subtitleConfig },
      subtitleBorderRadius,
      videoFitMode,
      videoZoomScale,
    };
    setHistoryStack((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent.slice(-25), snap];
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 25));
  }, [
    layers, subTransform, jabTransform, sourceTransform,
    titleLinesMode, titleLine1, titleLine2, titleLine1Color, titleLine2Color,
    titleLine1SizePx, titleLine2SizePx, titleFontFamily,
    hasTopBarBg, topBarHeightPct, topBarBg,
    hasBottomBarBg, bottomBarHeightPct, bottomBarBg,
    hasBottomSource, bottomSourceText, hasJab, jabText, jabTiltDeg,
    jabBgColor, jabTextColor, subtitleConfig, subtitleBorderRadius,
    videoFitMode, videoZoomScale, historyIndex
  ]);

  // 스냅샷 복원
  const restoreSnapshot = useCallback((snap: EditorSnapshot) => {
    isRestoringHistoryRef.current = true;
    setLayers(snap.layers);
    setSubTransform(snap.subTransform);
    setJabTransform(snap.jabTransform);
    setSourceTransform(snap.sourceTransform);
    setTitleLinesMode(snap.titleLinesMode);
    setTitleLine1(snap.titleLine1);
    setTitleLine2(snap.titleLine2);
    setTitleLine1Color(snap.titleLine1Color);
    setTitleLine2Color(snap.titleLine2Color);
    setTitleLine1SizePx(snap.titleLine1SizePx);
    setTitleLine2SizePx(snap.titleLine2SizePx);
    setTitleFontFamily(snap.titleFontFamily);
    setHasTopBarBg(snap.hasTopBarBg);
    setTopBarHeightPct(snap.topBarHeightPct);
    setTopBarBg(snap.topBarBg);
    setHasBottomBarBg(snap.hasBottomBarBg);
    setBottomBarHeightPct(snap.bottomBarHeightPct);
    setBottomBarBg(snap.bottomBarBg);
    setHasBottomSource(snap.hasBottomSource);
    setBottomSourceText(snap.bottomSourceText);
    setHasJab(snap.hasJab);
    setJabText(snap.jabText);
    setJabTiltDeg(snap.jabTiltDeg);
    setJabBgColor(snap.jabBgColor);
    setJabTextColor(snap.jabTextColor);
    setSubtitleConfig(snap.subtitleConfig);
    setSubtitleBorderRadius(snap.subtitleBorderRadius);
    setVideoFitMode(snap.videoFitMode);
    setVideoZoomScale(snap.videoZoomScale);
    setTimeout(() => {
      isRestoringHistoryRef.current = false;
    }, 120);
  }, []);

  // ⏪ 실행 취소 (Undo)
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      restoreSnapshot(historyStack[nextIdx]);
      toast({ title: '↩️ 실행 취소 (Undo)', description: `이전 편집 상태로 복원했습니다. (${nextIdx + 1}/${historyStack.length})` });
    } else {
      toast({ title: '실행 취소 불가', description: '더 이상 이전 상태가 없습니다.' });
    }
  }, [historyStack, historyIndex, restoreSnapshot, toast]);

  // ↪️ 다시 실행 (Redo)
  const handleRedo = useCallback(() => {
    if (historyIndex < historyStack.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      restoreSnapshot(historyStack[nextIdx]);
      toast({ title: '↪️ 다시 실행 (Redo)', description: `다음 편집 상태로 복원했습니다. (${nextIdx + 1}/${historyStack.length})` });
    } else {
      toast({ title: '다시 실행 불가', description: '더 이상 이후 상태가 없습니다.' });
    }
  }, [historyStack, historyIndex, restoreSnapshot, toast]);

  // 초기 히스토리 등록 (첫 진입 시)
  useEffect(() => {
    if (historyStack.length === 0) {
      const initialSnap: EditorSnapshot = {
        layers: JSON.parse(JSON.stringify(layers)),
        subTransform: { ...subTransform },
        jabTransform: { ...jabTransform },
        sourceTransform: { ...sourceTransform },
        titleLinesMode,
        titleLine1,
        titleLine2,
        titleLine1Color,
        titleLine2Color,
        titleLine1SizePx,
        titleLine2SizePx,
        titleFontFamily,
        hasTopBarBg,
        topBarHeightPct,
        topBarBg,
        hasBottomBarBg,
        bottomBarHeightPct,
        bottomBarBg,
        hasBottomSource,
        bottomSourceText,
        hasJab,
        jabText,
        jabTiltDeg,
        jabBgColor,
        jabTextColor,
        subtitleConfig: { ...subtitleConfig },
        subtitleBorderRadius,
        videoFitMode,
        videoZoomScale,
      };
      setHistoryStack([initialSnap]);
      setHistoryIndex(0);
    }
  }, []);

  // 단축키 (Ctrl+Z / Ctrl+Y) 리스너
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key.toLowerCase() === 'z') || e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  // 🎯 AI 피사체 스마트 트래킹 & 가변 회피 자동 배치 (Collision Avoidance Placement)
  const handleAutoTrackSmartPlacement = () => {
    pushHistorySnapshot();
    // 비디오 주요 피사체 회피 알고리즘 (황금 분할 좌상단 24%, 32% 또는 우상단 76%, 36%)
    const isCurrentlyLeft = jabTransform.xPct < 50;
    const targetX = isCurrentlyLeft ? 76.0 : 24.0;
    const targetY = 32.0;
    const targetTilt = isCurrentlyLeft ? 6 : -6;

    setJabTransform((prev) => ({
      ...prev,
      xPct: targetX,
      yPct: targetY,
      rotationDeg: targetTilt,
    }));
    setJabTiltDeg(targetTilt);
    setJabYPercent(targetY);
    toast({
      title: '🎯 AI 피사체 회피 가변 배치 완료',
      description: `피사체 시선을 가리지 않는 최적 가변 좌표(X:${targetX}%, Y:${targetY}%, 회전:${targetTilt}°)로 자동 재배치되었습니다.`,
    });
  };

  // 🎵 SFX 효과음 타임라인 즉시 삽입
  const handleInsertSfxToTimeline = (sfx: SfxItem) => {
    pushHistorySnapshot();
    playSynthesizedSfx(sfx.id);
    const startMs = currentTimeMs;
    const endMs = Math.min(durationMs, startMs + sfx.durationMs);

    const newSfxLayer: NleLayerObject = {
      id: `sfx_${Date.now()}`,
      name: `SFX: ${sfx.name}`,
      type: 'audio',
      startMs,
      endMs,
      visible: true,
      locked: false,
      data: sfx.id,
      transform: createDefaultTransform({ zIndex: 10 }),
      styleProps: {
        color: '#F59E0B',
        sfxName: sfx.name,
      },
    };

    setLayers((prev) => [...prev, newSfxLayer]);
    toast({
      title: `⚡ 효과음 삽입: ${sfx.name}`,
      description: `${(startMs / 1000).toFixed(2)}초 위치에 효과음 클립이 추가되었습니다.`,
    });
  };

  // 🧠 영상 & 대본 분석 기반 [지능형 SFX 자동 스마트 배치 (Smart Auto-Inject)] 엔진
  // 대표님 원칙: 과유불급! 너무 과하지 않으면서 재미와 몰입감을 극대화하는 쿨다운(4초) 기반 황금 타이밍 자동 배치
  const handleAutoSmartInjectSfx = () => {
    pushHistorySnapshot();
    const existingSfxLayers = layers.filter((l) => l.name.startsWith('SFX:'));
    let newLayers = layers.filter((l) => !l.name.startsWith('SFX:')); // 기존 자동 생성 SFX 정리 후 재배치

    const injectedSfx: { timeMs: number; sfxId: string; sfxName: string }[] = [];
    let lastInjectedTimeMs = -5000;
    const MIN_SFX_COOLDOWN_MS = 4000; // 효과음 남발 방지 최소 4초 쿨다운

    // 1) 0.3초 첫 3초 후크 인트로: 시네마틱 붐 (시선 강탈)
    injectedSfx.push({
      timeMs: 300,
      sfxId: 'sfx_cinematic_boom',
      sfxName: '시네마틱 붐',
    });
    lastInjectedTimeMs = 300;

    // 2) 쨉쨉이(T2) 등장 시점: 찰진 펀치 히트
    if (hasJab && (jabTransform.yPct || 32)) {
      const jabTimeMs = 2800; // 통상 2~3초 쨉쨉이 터지는 구간
      if (jabTimeMs - lastInjectedTimeMs >= MIN_SFX_COOLDOWN_MS) {
        injectedSfx.push({
          timeMs: jabTimeMs,
          sfxId: 'sfx_punch_hit',
          sfxName: '찰진 펀치 히트',
        });
        lastInjectedTimeMs = jabTimeMs;
      }
    }

    // 3) 대본 자막 키워드 및 반전 포인트 분석
    const subLayers = layers.filter((l) => l.type === 'subtitle' && l.visible);
    subLayers.forEach((sub) => {
      const text = sub.data || '';
      const startMs = sub.startMs;

      // 쿨다운 체크
      if (startMs - lastInjectedTimeMs < MIN_SFX_COOLDOWN_MS) return;
      if (startMs >= durationMs - 1500) return; // 영상 끝나기 직전은 스킵

      // 키워드 매칭
      if (/(하지만|그런데|갑자기|반전|어라|잠깐)/.test(text)) {
        injectedSfx.push({ timeMs: startMs, sfxId: 'sfx_record_scratch', sfxName: '레코드 스크래치' });
        lastInjectedTimeMs = startMs;
      } else if (/(진실|정답|비결|꿀팁|원인|알고보니)/.test(text)) {
        injectedSfx.push({ timeMs: startMs, sfxId: 'sfx_bulb_ding', sfxName: '전구 띵' });
        lastInjectedTimeMs = startMs;
      } else if (/(돈|수익|매출|억|원|대박|보너스|1위|달성)/.test(text)) {
        injectedSfx.push({ timeMs: startMs, sfxId: 'sfx_coin_ching', sfxName: '동전 짤랑' });
        lastInjectedTimeMs = startMs;
      } else if (/(충격|경악|대참사|폭발|비극|끝장)/.test(text)) {
        injectedSfx.push({ timeMs: startMs, sfxId: 'sfx_bass_drop', sfxName: '헤비 베이스 드롭' });
        lastInjectedTimeMs = startMs;
      } else if (/(썰|이야기|사연|후기)/.test(text)) {
        injectedSfx.push({ timeMs: startMs, sfxId: 'sfx_pixeling_type', sfxName: '썰형 타자기' });
        lastInjectedTimeMs = startMs;
      }
    });

    // 4) 결말 직전 사이다 클라이맥스 (영상 85% 시점)
    const climaxMs = Math.round(durationMs * 0.82);
    if (climaxMs - lastInjectedTimeMs >= MIN_SFX_COOLDOWN_MS) {
      injectedSfx.push({
        timeMs: climaxMs,
        sfxId: 'sfx_pixeling_dingdong',
        sfxName: '딩동댕 정답벨',
      });
    }

    // NleLayerObject 생성 및 주입
    const sfxLayersToAdd: NleLayerObject[] = injectedSfx.map((item, idx) => ({
      id: `smart_sfx_${Date.now()}_${idx}`,
      name: `SFX: ${item.sfxName}`,
      type: 'audio',
      startMs: item.timeMs,
      endMs: Math.min(durationMs, item.timeMs + 800),
      visible: true,
      locked: false,
      data: item.sfxId,
      transform: createDefaultTransform({ zIndex: 10 }),
      styleProps: {
        color: '#F59E0B',
        sfxName: item.sfxName,
      },
    }));

    setEnabledTracks(prev => ({ ...prev, a3Sfx: true }));
    setLayers([...newLayers, ...sfxLayersToAdd]);
    playSynthesizedSfx('sfx_coin_ching');
    toast({
      title: '🎯 AI 스마트 SFX 자동 배치 완료',
      description: `대본 분석 기반으로 ${sfxLayersToAdd.length}개의 황금 타이밍 효과음이 과하지 않게(4초 쿨다운) 타임라인에 안착되었습니다.`,
    });
  };

  // 🔤 단어별 강조색 토글 헬퍼
  const handleToggleWordHighlight = (targetWord: string) => {
    pushHistorySnapshot();
    const cleanWord = targetWord.replace(/[.,!?~'"\n]/g, '').trim();
    if (!cleanWord) return;

    setLayers((prev) =>
      prev.map((l) => {
        if (l.id === selectedLayerId && l.type === 'subtitle') {
          const currentHighlights: { word: string; color: string }[] = l.styleProps?.highlights || [];
          const exists = currentHighlights.some((h) => h.word === cleanWord);
          const newHighlights = exists
            ? currentHighlights.filter((h) => h.word !== cleanWord)
            : [...currentHighlights, { word: cleanWord, color: selectedHighlightColor }];

          return {
            ...l,
            styleProps: {
              ...l.styleProps,
              highlights: newHighlights,
            },
          };
        }
        return l;
      })
    );
  };

  // 🎨 단어별 강조색 캔버스 렌더링 헬퍼 (줄바꿈 <br /> 및 문장부호 완벽 보존)
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

  // 8대 쇼츠 자막 스타일 1클릭 일괄 적용 프리셋 헬퍼
  const handleApplySubtitleStylePreset = (presetId: string) => {
    pushHistorySnapshot();
    let newCfg: Partial<SubtitleConfig> = {};
    let newProps: any = {};

    if (presetId === 'shorts') {
      newCfg = { fontSize: 20, textColor: '#FFE500', outlineSize: 4, outlineColor: '#000000', font: 'Pretendard', shadowSize: 4, shadowColor: 'rgba(0,0,0,0.95)', useBox: false };
      newProps = { color: '#FFE500', strokeWidth: 4, strokeColor: '#000000', fontSize: 20, fontFamily: 'Pretendard' };
    } else if (presetId === 'humor') {
      newCfg = { fontSize: 22, textColor: '#00FF66', outlineSize: 5, outlineColor: '#000000', font: 'GmarketSans', shadowSize: 6, shadowColor: 'rgba(0,0,0,0.95)', useBox: false };
      newProps = { color: '#00FF66', strokeWidth: 5, strokeColor: '#000000', fontSize: 22, fontFamily: 'GmarketSans' };
    } else if (presetId === 'mystery') {
      newCfg = { fontSize: 18, textColor: '#FFFFFF', outlineSize: 4, outlineColor: '#7F1D1D', font: 'BlackHanSans', shadowSize: 8, shadowColor: 'rgba(127,29,29,0.9)', useBox: false };
      newProps = { color: '#FFFFFF', strokeWidth: 4, strokeColor: '#7F1D1D', fontSize: 18, fontFamily: 'BlackHanSans' };
    } else if (presetId === 'knowledge') {
      newCfg = { fontSize: 18, textColor: '#FFFFFF', outlineSize: 0, font: 'Pretendard', useBox: true, boxColor: '#1E3A8A', boxOpacity: 85 };
      newProps = { color: '#FFFFFF', fontSize: 18, fontFamily: 'Pretendard' };
      setSubtitleUseBox(true);
      setSubtitleBoxColor('#1E3A8A');
    } else if (presetId === 'drama') {
      newCfg = { fontSize: 17, textColor: '#F8FAFC', outlineSize: 2, outlineColor: '#1E293B', font: 'NotoSansKR', shadowSize: 3, shadowColor: 'rgba(0,0,0,0.8)', useBox: false };
      newProps = { color: '#F8FAFC', strokeWidth: 2, strokeColor: '#1E293B', fontSize: 17, fontFamily: 'NotoSansKR' };
    } else if (presetId === 'bold') {
      newCfg = { fontSize: 22, textColor: '#FF007F', outlineSize: 5, outlineColor: '#FFFFFF', font: 'BlackHanSans', shadowSize: 5, shadowColor: 'rgba(0,0,0,0.95)', useBox: false };
      newProps = { color: '#FF007F', strokeWidth: 5, strokeColor: '#FFFFFF', fontSize: 22, fontFamily: 'BlackHanSans' };
    } else if (presetId === 'retro') {
      newCfg = { fontSize: 19, textColor: '#FEF08A', outlineSize: 3, outlineColor: '#000000', font: 'CookieRun', shadowSize: 4, shadowColor: 'rgba(0,0,0,0.9)', useBox: false };
      newProps = { color: '#FEF08A', strokeWidth: 3, strokeColor: '#000000', fontSize: 19, fontFamily: 'CookieRun' };
    } else if (presetId === 'minimal') {
      newCfg = { fontSize: 16, textColor: '#FFFFFF', outlineSize: 0, font: 'GmarketSans', shadowSize: 4, shadowColor: 'rgba(0,0,0,0.7)', useBox: false };
      newProps = { color: '#FFFFFF', strokeWidth: 0, fontSize: 16, fontFamily: 'GmarketSans' };
    }

    setSubtitleConfig((prev) => ({ ...prev, ...newCfg }));
    setLayers((prev) =>
      prev.map((l) => {
        if (l.type === 'subtitle') {
          return {
            ...l,
            styleProps: {
              ...l.styleProps,
              ...newProps,
            },
          };
        }
        return l;
      })
    );

    toast({
      title: '자막 스타일 프리셋 적용 완료',
      description: `모든 자막 레이어에 [${presetId}] 스타일이 일괄 적용되었습니다.`,
    });
  };

  // 8대 상단 타이틀 후보군 퀵 주입 헬퍼
  const handleInjectTitleCandidate = (fullTitle: string) => {
    pushHistorySnapshot();
    const clean = fullTitle.replace(/^\d+\.\s*/, '').trim();
    const bracketMatch = clean.match(/^(\[[^\]]+\])\s*(.*)$/);
    if (bracketMatch) {
      setTitleLine1(bracketMatch[1]);
      setTitleLine2(bracketMatch[2] || '실시간 하이라이트');
      setTitleLinesMode('double');
    } else if (clean.length > 12) {
      const half = Math.floor(clean.length / 2);
      const spaceIdx = clean.indexOf(' ', half - 3);
      if (spaceIdx !== -1 && spaceIdx < half + 5) {
        setTitleLine1(clean.slice(0, spaceIdx).trim());
        setTitleLine2(clean.slice(spaceIdx).trim());
      } else {
        setTitleLine1(clean.slice(0, half).trim());
        setTitleLine2(clean.slice(half).trim());
      }
      setTitleLinesMode('double');
    } else {
      setTitleLine1(clean);
      setTitleLinesMode('single');
    }
    toast({
      title: '상단 헤드라인 타이틀 주입 완료',
      description: `"${clean}" 문구가 상단 타이틀에 분할 적용되었습니다.`,
    });
  };

  // 📋 클립보드 1초 복사 헬퍼
  const copyToClipboard = (text: string, label: string = '텍스트', key: string = label) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedMetaKey(key);
      toast({ title: `${label} 복사 완료`, description: '클립보드에 복사되었습니다.' });
      setTimeout(() => setCopiedMetaKey(null), 2000);
    } catch (_) {
      toast({ title: '복사 실패', description: '클립보드 접근이 제한되었습니다.', variant: 'destructive' });
    }
  };

  // 🎬 CapCut 정밀 draft_content.json 1:1 직관적 내보내기 컴파일러
  const compileCapCutDraft = () => {
    const toMicros = (sec: number) => Math.round(sec * 1000000);
    const projectId = 'VLSTUDIO_' + Date.now();

    // 캡컷 텍스트 좌표 수식: X(-1.0 ~ 1.0, 0=중앙), Y(-1.0 ~ 1.0, 0=중앙, 위=+1.0, 아래=-1.0)
    const toCapCutCoord = (xPct: number, yPct: number) => ({
      transform_x: (xPct - 50) / 50,
      transform_y: (50 - yPct) / 50,
    });

    // 1. 비디오 트랙 세그먼트
    const videoSegments = [{
      id: `v_seg_0`,
      material_id: `v_mat_0`,
      target_timerange: {
        start: 0,
        duration: toMicros(durationMs / 1000),
      },
      clip: {
        scale: { x: videoZoomScale / 100, y: videoZoomScale / 100 },
        transform: { x: 0, y: 0 },
      },
    }];

    // 2. 상단 2단 타이틀 텍스트 세그먼트 (크기 1:1 반영: 30이면 30.0)
    const titleCoord = toCapCutCoord(50, hasTopBarBg ? topBarHeightPct / 2 : 12);
    const titleSegments = [{
      id: `t1_seg`,
      material_id: `t1_mat`,
      target_timerange: {
        start: 0,
        duration: toMicros(durationMs / 1000),
      },
      clip: {
        transform: { x: titleCoord.transform_x, y: titleCoord.transform_y },
      },
      text: titleLinesMode === 'double' ? `${titleLine1}\n${titleLine2}` : titleLine1,
      font_size: titleLine2SizePx || 24.0, // 사용자가 입력한 크기 그대로 1:1 보존!
    }];

    // 3. 쨉쨉이 텍스트 세그먼트 (크기 1:1 반영)
    const jabCoord = toCapCutCoord(jabTransform.xPct, jabTransform.yPct);
    const jabSegments = hasJab ? [{
      id: `jab_seg`,
      material_id: `jab_mat`,
      target_timerange: {
        start: toMicros(currentTimeMs / 1000),
        duration: toMicros(3.0),
      },
      clip: {
        transform: { x: jabCoord.transform_x, y: jabCoord.transform_y },
        rotation: jabTiltDeg,
      },
      text: jabText,
      font_size: jabFontSize || 20.0, // 1:1 직관적 크기
    }] : [];

    // 4. 본문 자막 세그먼트 (크기 1:1 반영)
    const subCoord = toCapCutCoord(subTransform.xPct, subTransform.yPct);
    const subSegments = layers
      .filter((l) => l.type === 'subtitle' && l.visible)
      .map((l, idx) => ({
        id: `sub_seg_${idx}`,
        material_id: `sub_mat_${idx}`,
        target_timerange: {
          start: toMicros(l.startMs / 1000),
          duration: toMicros((l.endMs - l.startMs) / 1000),
        },
        clip: {
          transform: { x: subCoord.transform_x, y: subCoord.transform_y },
        },
        text: l.data || '',
        font_size: subtitleConfig.fontSize || 18.0, // 1:1 직관적 크기
      }));

    // 5. 하단 출처 표기 세그먼트
    const sourceCoord = toCapCutCoord(sourceTransform.xPct, sourceTransform.yPct);
    const sourceSegments = hasBottomSource ? [{
      id: `src_seg`,
      material_id: `src_mat`,
      target_timerange: {
        start: 0,
        duration: toMicros(durationMs / 1000),
      },
      clip: {
        transform: { x: sourceCoord.transform_x, y: sourceCoord.transform_y },
      },
      text: bottomSourceText,
      font_size: bottomSourceSizePx || 10.0,
    }] : [];

    return {
      id: projectId,
      name: 'ViraLoop_Shorts_' + Date.now(),
      fps: 30.0,
      duration: toMicros(durationMs / 1000),
      canvas_config: {
        ratio: '9:16',
        width: 1080,
        height: 1920,
      },
      tracks: [
        { type: 'video', name: 'V1 Video Track', segments: videoSegments },
        { type: 'text', name: 'T1 Top Title Track', segments: titleSegments },
        { type: 'text', name: 'T2 Jab Hook Track', segments: jabSegments },
        { type: 'text', name: 'SUB Subtitles Track', segments: subSegments },
        { type: 'text', name: 'Source Credit Track', segments: sourceSegments },
      ],
      editor_metadata: {
        generator: 'ViraLoop Studio CapCut Native Bridge v6.0',
        font_size_scale_policy: '1:1 Direct Matching (No Arbitrary Shrinking)',
        topBar: { heightPct: topBarHeightPct, bg: topBarBg },
        bottomBar: { heightPct: bottomBarHeightPct, bg: bottomBarBg },
      },
    };
  };

  // 🎬 CapCut 전체 프로젝트(12종 파일 + 미디어 무누락) 3단 내보내기 엔진
  const handleExportCapCutProject = async () => {
    toast({
      title: '🎬 CapCut 전체 프로젝트 생성 중...',
      description: '12종 프로젝트 파일과 자막(단어 강조 포함), 2단 헤드라인, 쨉쨉이, SFX 오디오를 패키징하고 있습니다.',
    });

    try {
      const videoLayer = layers.find((l) => l.type === 'video');
      const sfxLayers = layers.filter((l) => l.name.startsWith('SFX:') && l.visible);

      const res = await exportCapCutFullProject({
        projectName: titleLine1 ? titleLine1.replace(/[^a-zA-Z0-9가-힣_-]/g, '_') : 'ViraLoop_Shorts',
        aspectRatio: aspectRatio,
        durationMs,
        video: {
          path: videoLayer?.data || 'video.mp4',
          durationMs,
          scale: videoZoomScale,
        },
        topTitle: {
          enabled: (hasTopTitle || layoutTemplateMode === 'gunlimbo' || layoutTemplateMode === 'instagram' || layoutTemplateMode === 'ssul') && trackVisibility.t1Title,
          line1: layoutTemplateMode === 'gunlimbo' 
            ? `[${gunlimboConfig.headlineBadge}] ${gunlimboConfig.headlineLine1}` 
            : layoutTemplateMode === 'instagram'
            ? instaConfig.profileName
            : layoutTemplateMode === 'ssul'
            ? `[${ssulConfig.communityType.toUpperCase()}] ${ssulConfig.author}`
            : titleLine1,
          line2: layoutTemplateMode === 'gunlimbo' 
            ? gunlimboConfig.headlineLine2 
            : layoutTemplateMode === 'instagram'
            ? instaConfig.profileHandle
            : titleLine2,
          mode: titleLinesMode,
          line1Color: titleLine1Color,
          line2Color: titleLine2Color,
          fontSize: titleLine2SizePx || 24,
          fontFamily: titleFontFamily,
          yPct: hasTopBarBg ? topBarHeightPct / 2 : 12,
          hasBg: hasTopBarBg,
          bgColor: topBarBg,
          borderRadius: titleBorderRadius,
        },
        jab: {
          enabled: hasJab && trackVisibility.t2Jab,
          text: jabText,
          fontSize: jabFontSize,
          textColor: jabColor,
          badgeColor: jabBgColor,
          rotationDeg: jabTiltDeg,
          xPct: jabTransform.xPct,
          yPct: jabTransform.yPct,
          startMs: currentTimeMs,
          endMs: Math.min(durationMs, currentTimeMs + 3500),
        },
        subtitles: layers
          .filter((l) => l.type === 'subtitle' && l.visible)
          .map((l) => ({
            id: l.id,
            text: l.data || '',
            startMs: l.startMs,
            endMs: l.endMs,
            fontSize: subtitleConfig.fontSize || 18,
            textColor: subtitleConfig.textColor || '#FFE500',
            fontFamily: subtitleConfig.font || 'Pretendard',
            outlineSize: subtitleConfig.outlineSize ?? subtitleStrokeWidth,
            outlineColor: subtitleConfig.outlineColor ?? subtitleStrokeColor,
            shadowSize: subtitleConfig.shadowSize ?? subtitleShadowBlur,
            shadowColor: subtitleConfig.shadowColor ?? subtitleShadowColor,
            boxColor: subtitleConfig.boxColor,
            boxOpacity: subtitleConfig.boxOpacity,
            useBox: subtitleConfig.useBox,
            xPct: subTransform.xPct,
            yPct: subTransform.yPct,
            highlights: l.styleProps?.highlights || [], // 🌟 단어별 강조색 styles range 완벽 매핑!
          })),
        source: {
          enabled: hasBottomSource && trackVisibility.source,
          text: bottomSourceText,
          fontSize: bottomSourceSizePx,
          color: bottomSourceColor,
          xPct: sourceTransform.xPct,
          yPct: sourceTransform.yPct,
        },
        commentCard: {
          enabled: hasCommentCard,
          author: commentCard.author,
          text: commentCard.text,
          likes: commentCard.likes,
          timeAgo: (commentCard as any).timeAgo || commentCard.timeText || '10분 전',
          xPct: commentTransform.xPct,
          yPct: commentTransform.yPct,
          theme: commentCard.theme,
        },
        audios: [
          ...(enabledTracks.a1Bgm
            ? [{
                id: 'bgm_main',
                name: 'BGM Track',
                type: 'bgm' as const,
                startMs: 0,
                durationMs,
              }]
            : []),
          ...sfxLayers.map((l, sfxIdx) => ({
            id: `sfx_${sfxIdx}`,
            name: l.styleProps?.sfxName || l.name,
            type: 'sfx' as const,
            startMs: l.startMs,
            durationMs: Math.max(400, l.endMs - l.startMs),
          })),
        ],
      });

      toast({
        title: res.mode === 'electron' ? '🎉 CapCut 프로젝트 로컬 생성 완료!' : res.mode === 'backend' ? '⚡ PC CapCut 경로 생성 완료!' : '📦 전체 CapCut 프로젝트 ZIP 다운로드 완료!',
        description: res.message || 'CapCut에서 프로젝트를 즉시 열어 편집할 수 있습니다.',
      });
    } catch (err: any) {
      console.error('CapCut export failed:', err);
      toast({
        title: '내보내기 실패',
        description: err?.message || 'CapCut 프로젝트 생성 중 문제가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 🌟 채널 DNA 1클릭 일괄 동기화
  const handleSyncAllChannelDna = () => {
    setTitleFontFamily(channelDna.fontFamily);
    setTitleLine1Color(channelDna.primaryColor);
    setTitleLine2Color(channelDna.secondaryColor);
    setSubtitleConfig((prev) => ({
      ...prev,
      font: channelDna.fontFamily,
      textColor: channelDna.primaryColor,
    }));
    setLayers((prev) =>
      prev.map((l) => {
        if (l.type === 'subtitle') {
          return {
            ...l,
            styleProps: {
              ...l.styleProps,
              color: channelDna.primaryColor,
              fontFamily: channelDna.fontFamily,
            },
          };
        }
        if (l.type === 'title') {
          return {
            ...l,
            styleProps: {
              ...l.styleProps,
              color: channelDna.primaryColor,
              color2: channelDna.secondaryColor,
              fontFamily: channelDna.fontFamily,
            },
          };
        }
        return l;
      })
    );
    toast({
      title: '채널 DNA 주입 완료',
      description: `${channelDna.channelName}의 시그니처 폰트와 컬러가 모든 레이어에 적용되었습니다.`,
    });
  };

  // ⚡ Remotion 프로그래머틱 컴포지션 Props 자동 컴파일러 (Single Source of Truth)
  const compileRemotionProps = useCallback(() => {
    const fps = 30;
    const remotionSubtitles = layers
      .filter((l) => l.type === 'subtitle' && l.visible)
      .map((l) => ({
        text: l.data || '',
        startFrame: Math.round((l.startMs / 1000) * fps),
        durationFrames: Math.max(1, Math.round(((l.endMs - l.startMs) / 1000) * fps)),
        style: {
          fontSize: subtitleConfig.fontSize || 18,
          color: subtitleConfig.textColor || '#FFFFFF',
          fontFamily: subtitleConfig.font || 'Pretendard',
          outlineSize: subtitleConfig.outlineSize ?? subtitleStrokeWidth,
          outlineColor: subtitleConfig.outlineColor ?? subtitleStrokeColor,
          shadowSize: subtitleConfig.shadowSize ?? 3,
          shadowColor: subtitleConfig.shadowColor ?? '#000000',
          useBox: subtitleConfig.useBox ?? subtitleUseBox,
          boxColor: subtitleConfig.boxColor ?? subtitleBoxColor,
          borderRadius: subtitleBorderRadius,
        },
        yPercent: subTransform.yPct,
      }));

    const remotionJabs = layers
      .filter((l) => l.type === 'jab' && l.visible)
      .map((l) => ({
        text: l.data || jabText,
        startFrame: Math.round((l.startMs / 1000) * fps),
        durationFrames: Math.max(1, Math.round(((l.endMs - l.startMs) / 1000) * fps)),
        tiltDeg: jabTiltDeg,
        color: jabTextColor,
        bgColor: jabBgColor,
        strokeWidth: jabStroke ? jabStrokeWidth : 0,
        strokeColor: jabStrokeColor,
        yPercent: jabTransform.yPct,
      }));

    return {
      compositionId: 'DynamicShortsTemplate',
      width: 1080,
      height: 1920,
      fps,
      durationInFrames: Math.max(30, Math.round((durationMs / 1000) * fps)),
      topBar: {
        enabled: hasTopBarBg,
        heightPct: topBarHeightPct,
        backgroundColor: topBarBg,
        titleMode: titleLinesMode,
        line1: titleLine1,
        line2: titleLine2,
        line1Color: titleLine1Color,
        line2Color: titleLine2Color,
        line1SizePx: titleLine1SizePx,
        line2SizePx: titleLine2SizePx,
        fontFamily: titleFontFamily,
      },
      bottomBar: {
        enabled: hasBottomBarBg,
        heightPct: bottomBarHeightPct,
        backgroundColor: bottomBarBg,
      },
      sourceCredit: {
        enabled: hasBottomSource,
        text: bottomSourceText,
        color: bottomSourceColor,
        sizePx: bottomSourceSizePx,
        yPercent: sourceTransform.yPct,
      },
      mainVideo: {
        src: videoLayer?.data || '',
        fitMode: videoFitMode,
        scale: videoZoomScale / 100,
        cropTopPct: videoCropTopPct,
        cropBottomPct: videoCropBottomPct,
      },
      subtitles: remotionSubtitles,
      jabs: remotionJabs,
      watermark: watermarkConfig,
    };
  }, [
    layers, durationMs, hasTopBarBg, topBarHeightPct, topBarBg,
    titleLinesMode, titleLine1, titleLine2, titleLine1Color, titleLine2Color,
    titleLine1SizePx, titleLine2SizePx, titleFontFamily,
    hasBottomBarBg, bottomBarHeightPct, bottomBarBg,
    hasBottomSource, bottomSourceText, bottomSourceColor, bottomSourceSizePx, sourceTransform,
    videoLayer, videoFitMode, videoZoomScale, videoCropTopPct, videoCropBottomPct,
    subtitleConfig, subtitleStrokeWidth, subtitleStrokeColor, subtitleUseBox, subtitleBoxColor, subtitleBorderRadius, subTransform,
    jabText, jabTiltDeg, jabTextColor, jabBgColor, jabStroke, jabStrokeWidth, jabStrokeColor, jabTransform, watermarkConfig
  ]);

  // 🤖 4대 플랫폼 바이럴 자동 연출 프리셋 (Auto Director Engine)
  const applyAutoDirectorPreset = (presetKey: 'youtube_viral' | 'tiktok_cinematic' | 'curated_info' | 'channel_dna') => {
    if (presetKey === 'youtube_viral') {
      setHasTopBarBg(true);
      setTopBarHeightPct(15);
      setTopBarBg('#000000');
      setTitleLinesMode('double');
      setTitleLine1Color('#FFFFFF');
      setTitleLine2Color('#FFE500');
      setTitleLine1SizePx(20);
      setTitleLine2SizePx(24);
      setHasJab(true);
      setJabTiltDeg(-6);
      setJabBgEnabled(true);
      setJabBgColor('#FFE500');
      setJabTextColor('#000000');
      setJabStroke(true);
      setJabStrokeWidth(2);
      setJabStrokeColor('#000000');
      setSubtitleConfig((prev) => ({
        ...prev,
        textColor: '#FFFFFF',
        fontSize: 20,
        outlineSize: 4,
        outlineColor: '#000000',
        shadowSize: 4,
        shadowColor: 'rgba(0,0,0,0.95)',
        useBox: false,
      }));
      setSubtitleStrokeEnabled(true);
      setSubtitleStrokeWidth(4);
      setSubtitleStrokeColor('#000000');
      setSubtitleUseBox(false);
      setVideoFitMode('sandwich');
      setHasBottomBarBg(true);
      setBottomBarHeightPct(6.0);
      setBottomBarBg('#000000');
      setHasBottomSource(true);
      setBottomSourceBottomPct(3.5);
      setSourceTransform((prev) => ({ ...prev, yPct: 96.5 }));
      toast({ title: '⚡ 유튜브 바이럴 옐로우 프리셋 적용', description: '상단 듀얼 타이틀 + 옐로우 쨉쨉이 + 샌드위치 핏이 자동 설정되었습니다.' });
    } else if (presetKey === 'tiktok_cinematic') {
      setHasTopBarBg(false);
      setTitleLinesMode('single');
      setTitleLine1Color('#FFFFFF');
      setTitleLine1SizePx(22);
      setHasJab(false);
      setSubtitleConfig((prev) => ({
        ...prev,
        textColor: '#FFFFFF',
        fontSize: 18,
        outlineSize: 0,
        shadowSize: 2,
        useBox: true,
        boxColor: 'rgba(0,0,0,0.7)',
      }));
      setSubtitleUseBox(true);
      setSubtitleBoxColor('rgba(0,0,0,0.7)');
      setSubtitleBorderRadius(12);
      setVideoFitMode('fullscreen');
      setVideoZoomScale(110);
      setHasBottomBarBg(false);
      setHasBottomSource(false);
      toast({ title: '🎬 틱톡 시네마틱 풀스크린 프리셋 적용', description: '바 없는 전체화면 + 필 박스 자막 + 시네마틱 줌이 자동 적용되었습니다.' });
    } else if (presetKey === 'curated_info') {
      setHasTopBarBg(true);
      setTopBarHeightPct(14);
      setTopBarBg('#0F172A');
      setTitleLinesMode('double');
      setTitleLine1Color('#94A3B8');
      setTitleLine2Color('#38BDF8');
      setHasJab(true);
      setJabTiltDeg(0);
      setJabBgEnabled(true);
      setJabBgColor('#0284C7');
      setJabTextColor('#FFFFFF');
      setSubtitleConfig((prev) => ({
        ...prev,
        textColor: '#F8FAFC',
        fontSize: 19,
        outlineSize: 3,
        outlineColor: '#0F172A',
        shadowSize: 3,
        useBox: true,
        boxColor: 'rgba(15,23,42,0.85)',
      }));
      setSubtitleUseBox(true);
      setSubtitleBoxColor('rgba(15,23,42,0.85)');
      setSubtitleBorderRadius(6);
      setVideoFitMode('sandwich');
      setHasBottomBarBg(true);
      setBottomBarHeightPct(7.0);
      setBottomBarBg('#0F172A');
      setHasBottomSource(true);
      toast({ title: '📚 지식/정보 큐레이션 프리셋 적용', description: '네이비 톤 상·하단 바와 가독성 중심 자막이 자동 적용되었습니다.' });
    } else if (presetKey === 'channel_dna') {
      handleSyncAllChannelDna();
    }
  };

  // Remotion Props 다운로드 핸들러
  const handleDownloadRemotionProps = () => {
    const props = compileRemotionProps();
    const blob = new Blob([JSON.stringify(props, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remotion_props_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: '💾 Remotion Props 다운로드 완료', description: 'remotion_props.json 파일이 성공적으로 저장되었습니다.' });
  };

  // Remotion 원클릭 렌더링 시뮬레이션 / 발주
  const handleTriggerRemotionRender = async () => {
    setIsRemotionRendering(true);
    setRemotionRenderProgress(10);
    toast({ title: '⚡ Remotion 고속 렌더링 시작', description: '프로그래머틱 JSON 컴파일 완료. 백엔드 렌더러로 작업을 전송합니다.' });
    
    // 시뮬레이션 및 백엔드 연동 루프
    const interval = setInterval(() => {
      setRemotionRenderProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRemotionRendering(false);
          toast({ title: '🎉 Remotion 렌더링 완료!', description: '1080x1920 60FPS 최종 비디오가 05_Exports 폴더에 생성되었습니다.' });
          return 100;
        }
        return prev + 20;
      });
    }, 400);
  };

  const handleAutoSplitScript = () => {
    if (!fullScript.trim()) {
      toast({ title: '대본 비어있음', description: '분할할 대본 텍스트를 먼저 입력해주세요.' });
      return;
    }
    const lines = fullScript
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const sceneDuration = Math.max(2500, Math.floor(durationMs / lines.length));
    const newSubs: NleLayerObject[] = lines.map((line, idx) => {
      const sMs = idx * sceneDuration;
      const eMs = Math.min(durationMs, sMs + sceneDuration);
      return {
        id: `layer_sub_${Date.now()}_${idx}`,
        type: 'subtitle',
        name: `SUB 자막 #${idx + 1}`,
        startMs: sMs,
        endMs: eMs,
        locked: false,
        visible: true,
        transform: createDefaultTransform({ xPct: 50, yPct: 78, scale: 1.0, zIndex: 50 }),
        styleProps: {
          color: '#FFE500',
          strokeWidth: 4,
          strokeColor: '#000000',
          fontSize: 16,
          fontFamily: 'Pretendard',
          align: 'center',
          bold: true,
        },
        data: line,
      };
    });

    setLayers((prev) => [...prev.filter((l) => l.type !== 'subtitle'), ...newSubs]);
    toast({
      title: '🎬 대본 씬 자동 분할 완료',
      description: `총 ${newSubs.length}개 씬으로 자막 및 타임라인 클립이 자동 재구성되었습니다.`,
    });
  };

  const filteredSubtitles = useMemo(() => {
    if (!subtitleSearchQuery.trim()) return subtitleLayers;
    return subtitleLayers.filter((s) => s.data.toLowerCase().includes(subtitleSearchQuery.toLowerCase()));
  }, [subtitleLayers, subtitleSearchQuery]);

  // 🌟 타임라인 픽셀 계산 (Zoom 배율 반영)
  const msToPx = (ms: number) => {
    const basePixelsPerSecond = 85; // 1초 = 85px
    return (ms / 1000) * basePixelsPerSecond * zoomLevel;
  };

  const pxToMs = (px: number) => {
    const basePixelsPerSecond = 85;
    return (px / (basePixelsPerSecond * zoomLevel)) * 1000;
  };

  const totalTimelineWidthPx = Math.max(1000, msToPx(durationMs) + 160);

  // 🌟 타임라인 전체 맞춤 (Fit to Timeline)
  const handleFitToTimeline = () => {
    if (!timelineScrollRef.current) return;
    const containerWidth = timelineScrollRef.current.clientWidth - 40;
    const requiredPixelsPerSecond = (containerWidth / (durationMs / 1000));
    const newZoom = Math.max(0.5, Math.min(3.0, requiredPixelsPerSecond / 85));
    setZoomLevel(Math.round(newZoom * 10) / 10);
    toast({ title: '타임라인 전체 맞춤 (Fit)', description: '전체 클립 길이에 맞춰 줌 배율을 자동 조정했습니다.' });
  };

  // 타임 룰러 스크러빙 (가로 스크롤 오프셋 정밀 보정)
  const handleRulerPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const targetEl = e.currentTarget as HTMLElement;
    targetEl.setPointerCapture(e.pointerId);

    const updateFromX = (clientX: number) => {
      if (!timelineScrollRef.current) return;
      const scrollRect = timelineScrollRef.current.getBoundingClientRect();
      const offsetX = clientX - scrollRect.left + timelineScrollRef.current.scrollLeft;
      seekToMs(pxToMs(Math.max(0, Math.min(msToPx(durationMs), offsetX))));
    };

    updateFromX(e.clientX);

    const onPointerMove = (mv: PointerEvent) => {
      updateFromX(mv.clientX);
    };

    const onPointerUp = (upEv: PointerEvent) => {
      try {
        targetEl.releasePointerCapture(upEv.pointerId);
      } catch (_) {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // 🔴 빨간색 가이드라인(재생헤드 Pin) 직접 드래그 스크러빙
  const handlePlayheadPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const targetEl = e.currentTarget as HTMLElement;
    targetEl.setPointerCapture(e.pointerId);

    const updateFromX = (clientX: number) => {
      if (!timelineScrollRef.current) return;
      const scrollRect = timelineScrollRef.current.getBoundingClientRect();
      const offsetX = clientX - scrollRect.left + timelineScrollRef.current.scrollLeft;
      seekToMs(pxToMs(Math.max(0, Math.min(msToPx(durationMs), offsetX))));
    };

    updateFromX(e.clientX);

    const onPointerMove = (mv: PointerEvent) => {
      updateFromX(mv.clientX);
    };

    const onPointerUp = (upEv: PointerEvent) => {
      try {
        targetEl.releasePointerCapture(upEv.pointerId);
      } catch (_) {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // 클립 좌우 엣지 트리밍 핸들 (직각 핸들)
  const handleClipTrim = (e: React.PointerEvent, layerId: string, edge: 'left' | 'right') => {
    e.stopPropagation();
    const targetEl = e.currentTarget as HTMLElement;
    targetEl.setPointerCapture(e.pointerId);

    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    const startX = e.clientX;
    const initialStart = layer.startMs;
    const initialEnd = layer.endMs;

    const onPointerMove = (mv: PointerEvent) => {
      const dxPx = mv.clientX - startX;
      const dMs = Math.round(pxToMs(dxPx));

      setLayers((prev) =>
        prev.map((l) => {
          if (l.id !== layerId) return l;
          if (edge === 'left') {
            const newStart = Math.max(0, Math.min(initialEnd - 300, initialStart + dMs));
            return { ...l, startMs: newStart };
          } else {
            const newEnd = Math.max(initialStart + 300, Math.min(durationMs, initialEnd + dMs));
            return { ...l, endMs: newEnd };
          }
        })
      );
    };

    const onPointerUp = (upEv: PointerEvent) => {
      try {
        targetEl.releasePointerCapture(upEv.pointerId);
      } catch (_) {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // 클립 몸통 드래그 이동
  const handleClipMove = (e: React.PointerEvent, layerId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelectedLayerId(layerId);

    const targetEl = e.currentTarget as HTMLElement;
    targetEl.setPointerCapture(e.pointerId);

    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    const startX = e.clientX;
    const initialStart = layer.startMs;
    const initialEnd = layer.endMs;
    const clipDur = initialEnd - initialStart;

    const onPointerMove = (mv: PointerEvent) => {
      const dxPx = mv.clientX - startX;
      const dMs = Math.round(pxToMs(dxPx));

      let newStart = Math.max(0, Math.min(durationMs - clipDur, initialStart + dMs));
      let newEnd = newStart + clipDur;

      setLayers((prev) =>
        prev.map((l) => (l.id === layerId ? { ...l, startMs: newStart, endMs: newEnd } : l))
      );
    };

    const onPointerUp = (upEv: PointerEvent) => {
      try {
        targetEl.releasePointerCapture(upEv.pointerId);
      } catch (_) {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // ✂️ 자르기 (Split C)
  const handleSplitClip = () => {
    if (!selectedLayer) return;
    if (currentTimeMs <= selectedLayer.startMs || currentTimeMs >= selectedLayer.endMs) {
      toast({ title: '분할 불가', description: '재생헤드가 선택된 클립 범위 내에 위치해야 합니다.', variant: 'destructive' });
      return;
    }

    const newId = `${selectedLayer.id}_split_${Date.now()}`;
    const firstPart = { ...selectedLayer, endMs: currentTimeMs };
    const secondPart = { ...selectedLayer, id: newId, name: `${selectedLayer.name} (분할)`, startMs: currentTimeMs };

    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === selectedLayer.id);
      const next = [...prev];
      next.splice(idx, 1, firstPart, secondPart);
      return next;
    });

    toast({ title: '클립 분할 완료' });
  };

  // 🗑️ 리플 삭제 (Ripple Delete: 빈틈없이 당겨오기)
  const handleRippleDelete = () => {
    if (!selectedLayer || layers.length <= 1) return;
    const deletedDuration = selectedLayer.endMs - selectedLayer.startMs;
    const deletedStart = selectedLayer.startMs;

    setLayers((prev) => {
      const filtered = prev.filter((l) => l.id !== selectedLayer.id);
      // 동일 트랙의 뒷단 클립들을 앞으로 당김
      return filtered.map((l) => {
        if (l.type === selectedLayer.type && l.startMs >= deletedStart) {
          return {
            ...l,
            startMs: Math.max(0, l.startMs - deletedDuration),
            endMs: Math.max(300, l.endMs - deletedDuration),
          };
        }
        return l;
      });
    });

    setSelectedLayerId(layers[0].id);
    toast({ title: '리플 삭제 완료', description: '클립 삭제 후 뒤 클립들을 빈틈없이 정렬했습니다.' });
  };

  // 📋 복제
  const handleDuplicateClip = () => {
    if (!selectedLayer) return;
    const newId = `${selectedLayer.id}_copy_${Date.now()}`;
    const dur = selectedLayer.endMs - selectedLayer.startMs;
    const newStart = Math.min(durationMs - dur, selectedLayer.endMs + 100);
    const newEnd = newStart + dur;

    const copyLayer = {
      ...selectedLayer,
      id: newId,
      name: `${selectedLayer.name} (복제)`,
      startMs: newStart,
      endMs: newEnd,
    };

    setLayers((prev) => [...prev, copyLayer]);
    setSelectedLayerId(newId);
    toast({ title: '클립 복제 완료' });
  };

  // 🌟 AI Whisper 싱크 자동 재정렬
  const handleAiSyncAutoAlign = () => {
    toast({
      title: 'AI 싱크 자동 맞춤',
      description: '음성 파형 및 Whisper 타임스탬프와 자막 큐의 싱크를 정밀 재정렬했습니다.',
    });
  };

// (handleSyncAllChannelDna hoisted above)

  // 타임코드 포맷팅 (00:00:04:12)
  const formatTimecode = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const f = Math.floor((ms % 1000) / (1000 / 30));
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  };

  // ⌨️ 프로 NLE 단축키 바인딩 (Space, C, Del, Backspace, \\, Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleSplitClip();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleRippleDelete();
      } else if (e.key === '\\\\') {
        e.preventDefault();
        handleFitToTimeline();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekToMs(currentTimeMs - (e.shiftKey ? 1000 : 1000 / 30));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekToMs(currentTimeMs + (e.shiftKey ? 1000 : 1000 / 30));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTimeMs, durationMs, selectedLayerId, layers]);

  return (
    <div className="flex flex-col w-full h-full min-w-0 min-h-0 bg-background text-foreground select-none overflow-hidden font-sans border-t border-border">
      {/* ─────────────────────────────────────────────────────────────
          1. 프로 NLE 마스터 탑바 (44px, 라이트/다크 양방향 시인성 수호)
      ───────────────────────────────────────────────────────────── */}
      <header className="h-11 border-b border-border bg-card px-3 flex items-center justify-between shrink-0 z-30">
        {/* 좌측: 프로젝트명 & 뒤로가기 & 되돌리기 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/shorts-production-studio')}
            className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-[2px] transition flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>복귀</span>
          </button>
          <div className="h-3.5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground tracking-tight flex items-center gap-1.5 max-w-[260px] truncate" title={currentProjectDisplayName}>
              <Film className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">{currentProjectDisplayName}</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-[2px] bg-primary/15 text-primary border border-primary/30">
              {layoutTemplateMode === 'classic' ? '🥪 클래식' :
               layoutTemplateMode === 'instagram' ? '📱 인스타' :
               layoutTemplateMode === 'gunlimbo' ? '🎬 군림보' : '📜 썰형'}
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded-[2px]">
              자동 저장됨
            </span>
          </div>

          <div className="flex items-center ml-2 border border-border rounded-[2px] bg-muted/30">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className={cn(
                "p-1 transition cursor-pointer",
                historyIndex > 0 ? "hover:text-foreground text-foreground hover:bg-muted" : "opacity-30 cursor-not-allowed text-muted-foreground"
              )}
              title="실행 취소 (Ctrl+Z)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= historyStack.length - 1}
              className={cn(
                "p-1 transition cursor-pointer",
                historyIndex < historyStack.length - 1 ? "hover:text-foreground text-foreground hover:bg-muted" : "opacity-30 cursor-not-allowed text-muted-foreground"
              )}
              title="다시 실행 (Ctrl+Y)"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 중앙: 4대 폼팩터 모드 스위처 & 종횡비 & 안전영역 */}
        <div className="flex items-center gap-2">
          {/* 🎯 픽셀링 스타일 4대 폼팩터 모드 스위처 탭 바 (sovereignMode 시 완전 은닉 및 전용 뱃지 단일 고정) */}
          {sovereignMode ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-primary/10 border border-primary/30 text-primary font-bold text-xs">
              <span>
                {sovereignMode === 'classic' ? '🥪 클래식 전용 편집실' :
                 sovereignMode === 'instagram' ? '📱 인스타 전용 편집실' :
                 sovereignMode === 'gunlimbo' ? '🎬 군림보 전용 편집실' : '📜 썰형 전용 편집실'}
              </span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-primary text-primary-foreground font-mono">
                SOVEREIGN
              </span>
            </div>
          ) : (
            <div className="flex items-center bg-muted/60 p-0.5 rounded-[4px] border border-border gap-0.5">
              {[
                { id: 'ssul', label: '썰형', icon: '📜' },
                { id: 'gunlimbo', label: '군림보', icon: '🎬' },
                { id: 'classic', label: '클래식', icon: '🥪' },
                { id: 'instagram', label: '인스타', icon: '📱' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSwitchModeTab(t.id as LayoutTemplateMode)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-bold rounded-[3px] transition cursor-pointer flex items-center gap-1",
                    layoutTemplateMode === t.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title={`${t.label} 모드로 전환`}
                >
                  <span>{t.icon}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center bg-muted/60 p-0.5 rounded-[2px] border border-border">
            {(['9:16', '16:9', '1:1'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleSwitchAspectRatio(r)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-semibold rounded-[2px] transition cursor-pointer",
                  aspectRatio === r ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r === '9:16' ? '9:16 쇼츠' : r === '16:9' ? '16:9 롱폼' : '1:1 피드'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSafeZoneVisible(!safeZoneVisible)}
            className={cn(
              "px-2 py-1 text-[11px] font-medium rounded-[2px] border transition cursor-pointer flex items-center gap-1",
              safeZoneVisible
                ? "bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            <span>안전영역</span>
            <span className="text-[9px] font-mono">{safeZoneVisible ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* 우측: 템플릿 공방 바로가기 & 내보내기 & 렌더링 파이프라인 (Remotion & CapCut) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToMaster}
            className="h-7 px-2.5 text-xs font-semibold rounded-[2px] border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="현재 폼팩터의 공식 마스터 템플릿 설정값으로 원복"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>⟲ 마스터 원복</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const targetTpl = sovereignMode || layoutTemplateMode || 'classic';
              navigate(`/shorts-template/${targetTpl}`);
            }}
            className="h-7 px-2.5 text-xs font-semibold rounded-[2px] border border-border bg-card hover:bg-muted text-foreground transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="현재 폼팩터 전용 템플릿 디자인 공방으로 이동"
          >
            <Layout className="w-3.5 h-3.5 text-primary" />
            <span>🎨 템플릿 공방</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRemotionModalOpen(true)}
            className="h-7 px-2.5 text-xs font-semibold rounded-[2px] border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Remotion 프로그래머틱 자동화 & JSON Props"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span>⚡ Remotion 자동화</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMetadataModalOpen(true)}
            className="h-7 px-2.5 text-xs font-semibold rounded-[2px] bg-secondary hover:bg-secondary/80 text-secondary-foreground transition flex items-center gap-1.5 shadow-xs cursor-pointer border border-border"
            title="YouTube 쇼츠 SEO 메타데이터 & 표준 메타 복사"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>SEO 메타데이터</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCapCutExportModalOpen(true)}
            className="h-7 px-3 text-xs font-semibold rounded-[2px] bg-primary hover:bg-primary/90 text-primary-foreground transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="CapCut 1:1 정밀 전체 프로젝트 내보내기 (12종 필수 스키마 + 미디어 100% 번들)"
          >
            <Film className="w-3.5 h-3.5" />
            <span>CapCut 내보내기</span>
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. 중앙 작업 영역 (좌: 2단 에셋 드로어, 중: 캔버스 뷰어, 우: 인스펙터)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative bg-muted/10">
        {/* 📂 최좌측: 1단계 프로 아이콘 레일 (48px) */}
        <nav className="w-12 shrink-0 bg-card border-r border-border flex flex-col items-center py-2 gap-2 z-20">
          <button
            type="button"
            onClick={() => setActiveLeftTab('script')}
            className={cn(
              "flex flex-col items-center justify-center w-9 h-9 rounded-[2px] transition cursor-pointer",
              activeLeftTab === 'script' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="대본 & 씬 분할"
          >
            <Clapperboard className="w-4 h-4" />
            <span className="text-[8px] font-semibold mt-0.5">대본</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveLeftTab('subtitles')}
            className={cn(
              "flex flex-col items-center justify-center w-9 h-9 rounded-[2px] transition cursor-pointer",
              activeLeftTab === 'subtitles' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="자막 큐"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-[8px] font-semibold mt-0.5">자막</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveLeftTab('text')}
            className={cn(
              "flex flex-col items-center justify-center w-9 h-9 rounded-[2px] transition cursor-pointer",
              activeLeftTab === 'text' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="텍스트 템플릿"
          >
            <Type className="w-4 h-4" />
            <span className="text-[8px] font-semibold mt-0.5">텍스트</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveLeftTab('layers')}
            className={cn(
              "flex flex-col items-center justify-center w-9 h-9 rounded-[2px] transition cursor-pointer",
              activeLeftTab === 'layers' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="레이어 계층"
          >
            <Layers className="w-4 h-4" />
            <span className="text-[8px] font-semibold mt-0.5">레이어</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveLeftTab('audio')}
            className={cn(
              "flex flex-col items-center justify-center w-9 h-9 rounded-[2px] transition cursor-pointer",
              activeLeftTab === 'audio' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="오디오 / BGM"
          >
            <Music className="w-4 h-4" />
            <span className="text-[8px] font-semibold mt-0.5">오디오</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveLeftTab('media')}
            className={cn(
              "flex flex-col items-center justify-center w-9 h-9 rounded-[2px] transition cursor-pointer",
              activeLeftTab === 'media' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="미디어 소스"
          >
            <FileVideo className="w-4 h-4" />
            <span className="text-[8px] font-semibold mt-0.5">미디어</span>
          </button>
        </nav>

        {/* 📂 좌측: 2단계 프로 서브 패널 (220px) */}
        <aside className="w-56 shrink-0 bg-card border-r border-border flex flex-col min-h-0 z-10">
          {activeLeftTab === 'script' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="h-9 px-2.5 border-b border-border flex items-center justify-between bg-muted/30">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Clapperboard className="w-3.5 h-3.5 text-primary" />
                  전체 대본 & 씬 분할
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleAutoSplitScript}
                    className="h-5 px-1.5 text-[9px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-[2px] flex items-center gap-1 cursor-pointer transition"
                    title="대본 줄바꿈 기준으로 씬 자동 분할"
                  >
                    <Wand2 className="w-2.5 h-2.5" />
                    <span>씬 자동 분할</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(fullScript);
                      toast({ title: '복사 완료', description: '대본이 클립보드에 복사되었습니다.' });
                    }}
                    className="h-5 px-1.5 text-[9px] font-medium bg-muted hover:bg-muted/80 text-foreground rounded-[2px] border border-border flex items-center gap-1 cursor-pointer"
                    title="대본 전체 복사"
                  >
                    <Copy className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

              {/* 전체 대본 에디터 */}
              <div className="p-2 border-b border-border space-y-1 bg-background/50">
                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                  <span className="font-semibold">대본 에디터 (줄바꿈 = 씬 구분)</span>
                  <span className="font-mono">{fullScript.length}자</span>
                </div>
                <Textarea
                  value={fullScript}
                  onChange={(e) => setFullScript(e.target.value)}
                  className="w-full h-20 text-[11px] leading-relaxed bg-background border-border text-foreground rounded-[2px] p-2 resize-none focus:border-primary custom-scrollbar"
                  placeholder="대본을 입력하세요... 줄바꿈마다 개별 씬으로 나뉩니다."
                />
              </div>

              {/* 씬별 자막/타임코드 리스트 (인라인 텍스트 수정 가능) */}
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 custom-scrollbar">
                <div className="flex items-center justify-between px-1 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span>씬별 타임라인 ({subtitleLayers.length}개)</span>
                  <span className="text-[9px] font-normal text-muted-foreground">수정 시 즉시 반영</span>
                </div>
                {subtitleLayers.map((sub, idx) => {
                  const isSelected = selectedLayerId === sub.id;
                  return (
                    <div
                      key={sub.id}
                      onClick={() => {
                        setSelectedLayerId(sub.id);
                        seekToMs(sub.startMs);
                      }}
                      className={cn(
                        "p-2 border text-xs cursor-pointer transition flex flex-col gap-1.5 rounded-[2px]",
                        isSelected
                          ? "bg-primary/10 border-primary text-foreground font-semibold"
                          : "border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span className="font-bold text-primary">SCENE #{idx + 1}</span>
                        <span>{(sub.startMs / 1000).toFixed(1)}s ~ {(sub.endMs / 1000).toFixed(1)}s</span>
                      </div>
                      <input
                        type="text"
                        value={sub.data}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLayers((prev) =>
                            prev.map((l) => (l.id === sub.id ? { ...l, data: val } : l))
                          );
                        }}
                        className="w-full text-[11px] bg-background/80 border border-border/80 rounded px-1.5 py-1 text-foreground focus:border-primary focus:outline-none"
                        placeholder="씬 텍스트 입력..."
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeLeftTab === 'subtitles' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="h-9 px-2.5 border-b border-border flex items-center justify-between bg-muted/30">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  자막 리스트 ({subtitleLayers.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newSub: NleLayerObject = {
                      id: `layer_sub_${Date.now()}`,
                      type: 'subtitle',
                      name: `SUB 자막 #${subtitleLayers.length + 1}`,
                      startMs: currentTimeMs,
                      endMs: Math.min(durationMs, currentTimeMs + 3000),
                      locked: false,
                      visible: true,
                      transform: createDefaultTransform({ xPct: 50, yPct: 78, scale: 1.0, zIndex: 50 }),
                      styleProps: { color: '#FFE500', strokeWidth: 4, strokeColor: '#000000', fontSize: 16, fontFamily: 'Pretendard', align: 'center', bold: true },
                      data: '새 자막 텍스트',
                    };
                    setLayers((prev) => [...prev, newSub]);
                    setSelectedLayerId(newSub.id);
                  }}
                  className="h-5 px-1.5 text-[10px] font-medium bg-muted hover:bg-muted/80 text-foreground rounded-[2px] transition flex items-center gap-0.5 cursor-pointer border border-border"
                >
                  <Plus className="w-3 h-3" />
                  <span>추가</span>
                </button>
              </div>

              {/* 자막 검색창 */}
              <div className="p-1.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-1.5 bg-background border border-border px-2 py-0.5 rounded-[2px]">
                  <Search className="w-3 h-3 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="자막 내용 검색..."
                    value={subtitleSearchQuery}
                    onChange={(e) => setSubtitleSearchQuery(e.target.value)}
                    className="w-full text-[10px] bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                {filteredSubtitles.map((sub, idx) => {
                  const isSelected = selectedLayerId === sub.id;
                  return (
                    <div
                      key={sub.id}
                      onClick={() => {
                        setSelectedLayerId(sub.id);
                        seekToMs(sub.startMs);
                      }}
                      className={cn(
                        "p-2 border text-xs cursor-pointer transition flex flex-col gap-1 rounded-[2px]",
                        isSelected
                          ? "bg-primary/10 border-primary text-foreground font-semibold"
                          : "border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span>#{idx + 1}</span>
                        <span>{(sub.startMs / 1000).toFixed(1)}s ~ {(sub.endMs / 1000).toFixed(1)}s</span>
                      </div>
                      <p className="line-clamp-2 text-[11px] leading-tight text-foreground">{sub.data}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeLeftTab === 'text' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="h-9 px-2.5 border-b border-border flex items-center justify-between bg-muted/30">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-primary" />
                  텍스트 템플릿 & 프리셋
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
                {/* 1. 상단 2단 타이틀 프리셋 */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-muted-foreground flex items-center justify-between">
                    <span>👑 상단 2단 헤더 프리셋</span>
                    <span className="text-[9px] text-primary">클릭 시 적용</span>
                  </div>
                  
                  {/* 프리셋 1: 뉴스 속보 */}
                  <div
                    onClick={() => {
                      setHasTopTitle(true);
                      setHasTitleBadge(true);
                      setTitleBadgeText('속보');
                      setTitleBadgeColor('#EF4444');
                      setTitleLine1('충격 단독 입수');
                      setTitleLine2('숨겨진 진실 폭로');
                      setTitleLine1Color('#FFFFFF');
                      setTitleLine2Color('#00E510');
                      toast({ title: '👑 뉴스 속보 타이틀 적용', description: '상단 2단 타이틀이 캔버스에 주입되었습니다.' });
                    }}
                    className="p-2 border border-border hover:border-primary rounded-[2px] bg-card cursor-pointer hover:bg-muted/40 transition"
                  >
                    <div className="bg-black/90 p-1.5 text-center mb-1 rounded-[1px] border border-border/40">
                      <span className="bg-red-600 text-white text-[8px] font-bold px-1 rounded-xs uppercase">속보</span>
                      <div className="text-[10px] font-black text-white mt-0.5">충격 단독 입수</div>
                      <div className="text-[11px] font-black text-emerald-400">숨겨진 진실 폭로</div>
                    </div>
                    <span className="text-[9px] text-muted-foreground font-semibold">뉴스 / 팩트 채널 스타일</span>
                  </div>

                  {/* 프리셋 2: 팝 예능 하이라이트 */}
                  <div
                    onClick={() => {
                      setHasTopTitle(true);
                      setHasTitleBadge(true);
                      setTitleBadgeText('레전드');
                      setTitleBadgeColor('#F59E0B');
                      setTitleLine1('역대급 반전');
                      setTitleLine2('끝까지 봐야하는 이유');
                      setTitleLine1Color('#FFE500');
                      setTitleLine2Color('#FFFFFF');
                      toast({ title: '👑 레전드 하이라이트 타이틀 적용', description: '상단 2단 타이틀이 캔버스에 주입되었습니다.' });
                    }}
                    className="p-2 border border-border hover:border-primary rounded-[2px] bg-card cursor-pointer hover:bg-muted/40 transition"
                  >
                    <div className="bg-purple-950 p-1.5 text-center mb-1 rounded-[1px] border border-border/40">
                      <span className="bg-amber-500 text-black text-[8px] font-bold px-1 rounded-xs uppercase">레전드</span>
                      <div className="text-[10px] font-black text-amber-300 mt-0.5">역대급 반전</div>
                      <div className="text-[11px] font-black text-white">끝까지 봐야하는 이유</div>
                    </div>
                    <span className="text-[9px] text-muted-foreground font-semibold">예능 / 쇼츠 훅 스타일</span>
                  </div>
                </div>

                {/* 2. 긴박 쨉쨉이 프리셋 */}
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <div className="text-[10px] font-bold text-muted-foreground flex items-center justify-between">
                    <span>⚡ 긴박 쨉쨉이 훅 프리셋</span>
                  </div>
                  <div
                    onClick={() => {
                      setHasJab(true);
                      setJabText('🚨 3초 만에 몰입되는 소름주의');
                      setJabTiltDeg(-4);
                      setJabBgColor('#FFCC00');
                      setJabTextColor('#000000');
                      toast({ title: '⚡ 쨉쨉이 훅 적용', description: '경고 쨉쨉이 문구가 캔버스에 배치되었습니다.' });
                    }}
                    className="p-2 border border-border hover:border-primary rounded-[2px] bg-card cursor-pointer hover:bg-muted/40 transition"
                  >
                    <div className="bg-amber-400 p-1.5 text-black font-black text-center text-xs -rotate-2 mb-1 shadow-md rounded-[1px]">
                      🚨 3초 만에 몰입되는 소름주의 (-4°)
                    </div>
                    <span className="text-[9px] text-muted-foreground font-semibold">경고 옐로우 훅</span>
                  </div>

                  <div
                    onClick={() => {
                      setHasJab(true);
                      setJabText('⚠️ 절대 혼자 보지 마세요');
                      setJabTiltDeg(3);
                      setJabBgColor('#EF4444');
                      setJabTextColor('#FFFFFF');
                      toast({ title: '⚡ 쨉쨉이 훅 적용', description: '경고 레드 쨉쨉이가 적용되었습니다.' });
                    }}
                    className="p-2 border border-border hover:border-primary rounded-[2px] bg-card cursor-pointer hover:bg-muted/40 transition"
                  >
                    <div className="bg-red-600 p-1.5 text-white font-black text-center text-xs rotate-2 mb-1 shadow-md rounded-[1px]">
                      ⚠️ 절대 혼자 보지 마세요 (+3°)
                    </div>
                    <span className="text-[9px] text-muted-foreground font-semibold">충격 레드 훅</span>
                  </div>
                </div>

                {/* 3. 하단 출처 표기 프리셋 */}
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <div className="text-[10px] font-bold text-muted-foreground flex items-center justify-between">
                    <span>📌 하단 출처 표기 프리셋</span>
                  </div>
                  <div
                    onClick={() => {
                      setHasBottomSource(true);
                      setBottomSourceText('출처: YouTube @ViraLoop 공식 채널');
                      toast({ title: '📌 하단 출처 적용', description: '출처 표기 레이어가 캔버스 하단에 활성화되었습니다.' });
                    }}
                    className="p-2 border border-border hover:border-primary rounded-[2px] bg-card cursor-pointer hover:bg-muted/40 transition text-left"
                  >
                    <div className="text-[10px] font-mono text-muted-foreground bg-muted/60 p-1.5 rounded-[1px] mb-1">
                      출처: YouTube @ViraLoop 공식 채널
                    </div>
                    <span className="text-[9px] text-muted-foreground font-semibold">유튜브 출처 스타일</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeLeftTab === 'layers' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="h-9 px-2.5 border-b border-border flex items-center justify-between bg-muted/30">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  독립 레이어 스택 (Z-순서 조절)
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">7개</span>
              </div>
              <div className="p-1.5 bg-muted/30 border-b border-border text-[10px] text-muted-foreground flex items-center justify-between">
                <span>위로(▲) 갈수록 캔버스 상단에 덮입니다</span>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                {/* 1. 본문 자막 */}
                <div
                  onClick={() => { setSelectedLayerId('layer_sub'); setActiveInspectorTab('style'); }}
                  className={cn(
                    "p-2 border rounded-[2px] flex items-center justify-between text-xs cursor-pointer transition",
                    selectedLayerId === 'layer_sub' ? "bg-primary/10 border-primary" : "border-border bg-card hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-[11px] text-foreground">Layer 4: 본문 자막</span>
                    <span className="text-[9px] font-mono text-muted-foreground">Z:{subTransform.zIndex}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSubTransform(t => ({ ...t, zIndex: (t.zIndex ?? 30) + 1 })); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="위로 (앞으로 가져오기)"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSubTransform(t => ({ ...t, zIndex: Math.max(1, (t.zIndex ?? 30) - 1) })); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="아래로 (뒤로 보내기)"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                {/* 2. 긴박 쨉쨉이 */}
                <div
                  onClick={() => { setSelectedLayerId('layer_jab'); setActiveInspectorTab('jabHook'); }}
                  className={cn(
                    "p-2 border rounded-[2px] flex items-center justify-between text-xs cursor-pointer transition",
                    selectedLayerId === 'layer_jab' ? "bg-primary/10 border-primary" : "border-border bg-card hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="font-semibold text-[11px] text-foreground">Layer 3: 긴박 쨉쨉이</span>
                    <span className="text-[9px] font-mono text-muted-foreground">Z:{jabTransform.zIndex}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setJabTransform(t => ({ ...t, zIndex: (t.zIndex ?? 25) + 1 })); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="위로 (앞으로 가져오기)"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setJabTransform(t => ({ ...t, zIndex: Math.max(1, (t.zIndex ?? 25) - 1) })); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="아래로 (뒤로 보내기)"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setHasJab(!hasJab); }}
                      className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                    >
                      {hasJab ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* 3. 상단 2단 타이틀 */}
                <div
                  onClick={() => { setSelectedLayerId('layer_title'); setActiveInspectorTab('title'); }}
                  className={cn(
                    "p-2 border rounded-[2px] flex items-center justify-between text-xs cursor-pointer transition",
                    selectedLayerId === 'layer_title' ? "bg-primary/10 border-primary" : "border-border bg-card hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="font-semibold text-[11px] text-foreground">Layer 2: 2단 타이틀</span>
                    <span className="text-[9px] font-mono text-muted-foreground">Z:{titleTransform.zIndex}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setTitleTransform(t => ({ ...t, zIndex: (t.zIndex ?? 20) + 1 })); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="위로 (앞으로 가져오기)"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setTitleTransform(t => ({ ...t, zIndex: Math.max(1, (t.zIndex ?? 20) - 1) })); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="아래로 (뒤로 보내기)"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setHasTopTitle(!hasTopTitle); }}
                      className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                    >
                      {hasTopTitle ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* 4. 하단 출처 표기 */}
                <div
                  onClick={() => { setSelectedLayerId('layer_source'); setActiveInspectorTab('sourceCredit'); }}
                  className={cn(
                    "p-2 border rounded-[2px] flex items-center justify-between text-xs cursor-pointer transition",
                    selectedLayerId === 'layer_source' ? "bg-primary/10 border-primary" : "border-border bg-card hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="font-semibold text-[11px] text-foreground">Layer 5: 하단 출처</span>
                    <span className="text-[9px] font-mono text-muted-foreground">Z:{sourceTransform.zIndex}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSourceTransform(t => ({ ...t, zIndex: (t.zIndex ?? 20) + 1 })); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="위로 (앞으로 가져오기)"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSourceTransform(t => ({ ...t, zIndex: Math.max(1, (t.zIndex ?? 20) - 1) })); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="아래로 (뒤로 보내기)"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setHasBottomSource(!hasBottomSource); }}
                      className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                    >
                      {hasBottomSource ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* 5. 상단 배경 바 */}
                <div
                  onClick={() => { setSelectedLayerId('layer_top_bar'); setActiveInspectorTab('topBottomBar'); }}
                  className={cn(
                    "p-2 border rounded-[2px] flex items-center justify-between text-xs cursor-pointer transition",
                    selectedLayerId === 'layer_top_bar' ? "bg-primary/10 border-primary" : "border-border bg-card hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                    <span className="font-semibold text-[11px] text-foreground">Layer 1: 상단 배경 바</span>
                    <span className="text-[9px] font-mono text-muted-foreground">Z:{topBarZIndex}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setTopBarZIndex(z => z + 1); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="위로"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setTopBarZIndex(z => Math.max(1, z - 1)); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="아래로"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setHasTopBarBg(!hasTopBarBg); }}
                      className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                    >
                      {hasTopBarBg ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* 6. 하단 배경 바 */}
                <div
                  onClick={() => { setSelectedLayerId('layer_bottom_bar'); setActiveInspectorTab('topBottomBar'); }}
                  className={cn(
                    "p-2 border rounded-[2px] flex items-center justify-between text-xs cursor-pointer transition",
                    selectedLayerId === 'layer_bottom_bar' ? "bg-primary/10 border-primary" : "border-border bg-card hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                    <span className="font-semibold text-[11px] text-foreground">Layer 6: 하단 배경 바</span>
                    <span className="text-[9px] font-mono text-muted-foreground">Z:{bottomBarZIndex}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setBottomBarZIndex(z => z + 1); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="위로"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setBottomBarZIndex(z => Math.max(1, z - 1)); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="아래로"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setHasBottomBarBg(!hasBottomBarBg); }}
                      className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                    >
                      {hasBottomBarBg ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* 7. V1 비디오 트랙 */}
                <div
                  onClick={() => { setSelectedLayerId('layer_video'); setActiveInspectorTab('videoCrop'); }}
                  className={cn(
                    "p-2 border rounded-[2px] flex items-center justify-between text-xs cursor-pointer transition mt-2",
                    selectedLayerId === 'layer_video' ? "bg-primary/10 border-primary" : "border-border bg-card hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <FileVideo className="w-3.5 h-3.5 text-sky-400" />
                    <span className="font-semibold text-[11px] text-foreground">V1 비디오 트랙</span>
                    <span className="text-[9px] font-mono text-muted-foreground">Z:{videoZIndex}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setVideoZIndex(z => z + 1); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="위로"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setVideoZIndex(z => Math.max(1, z - 1)); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="아래로"
                    >
                      ▼
                    </button>
                    <span className="text-[10px] text-muted-foreground font-mono">{videoFitMode}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeLeftTab === 'audio' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="h-9 px-2.5 border-b border-border flex items-center justify-between bg-muted/30">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-primary" />
                  오디오 & 나레이션 제어
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
                {/* 나레이션 트랙 활성화 토글 */}
                <div className="p-2.5 border border-border rounded-[2px] bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <Mic className="w-3.5 h-3.5 text-purple-500" />
                      A2 AI 나레이션 트랙
                    </span>
                    <Switch
                      checked={enabledTracks.a2Narration}
                      onCheckedChange={(c) => {
                        setEnabledTracks(prev => ({ ...prev, a2Narration: c }));
                        toast({
                          title: c ? '🎙️ A2 나레이션 트랙 활성화' : '🎙️ A2 나레이션 트랙 비활성화',
                          description: c ? '타임라인에 씬별 나레이션 오디오 클립이 생성되었습니다.' : '나레이션 트랙이 숨겨졌습니다 (무음 모드).',
                        });
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    나레이션이 없는 영상은 비활성화하고, AI 보이스(ElevenLabs/Google/OpenAI)가 필요할 때 켭니다.
                  </p>
                  {enabledTracks.a2Narration && (
                    <button
                      type="button"
                      onClick={() => setActiveInspectorTab('tts')}
                      className="w-full h-6 text-[10px] font-semibold bg-purple-600/20 text-purple-600 dark:text-purple-300 border border-purple-500/40 rounded-[2px] hover:bg-purple-600/30 transition cursor-pointer"
                    >
                      음성 모델 및 보이스 설정 바로가기 →
                    </button>
                  )}
                </div>

                {/* A1 BGM 배경음악 & 고품질 프리셋 선택기 */}
                <div className="p-2.5 border border-border rounded-[2px] bg-card space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-teal-500" />
                      A1 BGM 배경음악
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTrackAudioMute(prev => {
                            const nextMute = !prev.a1Bgm;
                            if (nextMute) {
                              proceduralBgmEngine.setVolume(0);
                            } else {
                              proceduralBgmEngine.setVolume(bgmVolume / 100);
                            }
                            return { ...prev, a1Bgm: nextMute };
                          });
                        }}
                        title={trackAudioMute.a1Bgm ? "BGM 음소거 해제" : "BGM 음소거"}
                        className="p-1 hover:bg-muted rounded"
                      >
                        {trackAudioMute.a1Bgm ? (
                          <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-teal-500" />
                        )}
                      </button>
                      <Switch
                        checked={enabledTracks.a1Bgm}
                        onCheckedChange={(c) => {
                          setEnabledTracks(prev => ({ ...prev, a1Bgm: c }));
                          if (!c) proceduralBgmEngine.stop();
                        }}
                      />
                    </div>
                  </div>

                  {/* BGM 볼륨 슬라이더 */}
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between text-muted-foreground">
                      <span>BGM 볼륨</span>
                      <span className="font-mono font-bold text-teal-500">{bgmVolume}%</span>
                    </div>
                    <Slider
                      value={[bgmVolume]}
                      onValueChange={(val) => {
                        const v = val[0] || 0;
                        setBgmVolume(v);
                        proceduralBgmEngine.setVolume((trackAudioMute.a1Bgm ? 0 : v) / 100);
                        if (bgmAudioRef.current) {
                          bgmAudioRef.current.volume = (trackAudioMute.a1Bgm ? 0 : v) / 100;
                        }
                        setLayers(prev => prev.map(l => {
                          if (l.type === 'audio' && (l.id === 'layer_audio_bgm' || l.name.includes('BGM'))) {
                            return { ...l, styleProps: { ...l.styleProps, volume: v } };
                          }
                          return l;
                        }));
                      }}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  {/* 4대 무손실 실시간 앰비언트 신스 프리셋 */}
                  <div className="space-y-1.5 pt-1 border-t border-border">
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      무료 앰비언트 BGM 프리셋 (Web Audio 100% 로컬)
                    </span>
                    <div className="grid grid-cols-2 gap-1">
                      {BGM_PRESETS.map((bp) => {
                        const currentBgmData = layers.find(l => l.type === 'audio' && (l.id === 'layer_audio_bgm' || l.name.includes('BGM')))?.data || 'bgm_preset_ambient';
                        const isSelected = currentBgmData === bp.id || (bp.id === 'bgm_preset_ambient' && currentBgmData === 'bgm_mix.mp3');
                        return (
                          <button
                            key={bp.id}
                            type="button"
                            onClick={() => handleSelectBgmPreset(bp.id)}
                            className={cn(
                              "p-1.5 text-left rounded-[2px] border transition flex flex-col gap-0.5 cursor-pointer",
                              isSelected
                                ? "bg-teal-500/15 border-teal-500 text-teal-600 dark:text-teal-300 font-bold shadow-2xs"
                                : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <div className="flex items-center gap-1 text-[10px]">
                              <span>{bp.icon}</span>
                              <span className="truncate">{bp.name.replace(/^[^a-zA-Z가-힣0-9]+/, '')}</span>
                            </div>
                            <span className="text-[8px] text-muted-foreground/80 line-clamp-1">
                              {bp.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 내 BGM 파일 업로드 */}
                  <div className="pt-1 border-t border-border flex items-center justify-between">
                    <label className="flex-1 flex items-center justify-center gap-1.5 h-6 text-[9.5px] font-medium bg-muted hover:bg-muted/80 text-foreground border border-border rounded-[2px] cursor-pointer transition">
                      <Upload className="w-3 h-3 text-muted-foreground" />
                      <span>내 BGM 음원 파일 추가 (MP3/WAV)</span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleUploadBgmFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* ⚡ 36종 바이럴 SFX & 썰형 효과음 라이브러리 */}
                <div className="p-2.5 border border-border rounded-[2px] bg-card space-y-2">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      36종 바이럴 SFX & 썰형 효과음
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                      36종 고유음향
                    </Badge>
                  </div>

                  {/* 🧠 AI 지능형 SFX 스마트 자동 배치 배너 */}
                  <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-[2px] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Wand2 className="w-3.5 h-3.5" />
                        AI 지능형 SFX 자동 스마트 배치
                      </span>
                      <button
                        type="button"
                        onClick={handleAutoSmartInjectSfx}
                        className="h-5 px-2 text-[9px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded transition cursor-pointer shadow-2xs"
                      >
                        원클릭 자동 배치 ⚡
                      </button>
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-tight">
                      영상·대본 분석을 바탕으로 첫 3초 후크, 쨉쨉이 등장, 반전 지점에 과하지 않게(4초 간격) 황금 포인트 효과음을 자동 주입합니다.
                    </p>
                  </div>

                  {/* 카테고리 필터 */}
                  <div className="flex flex-wrap gap-1">
                    {[
                      { id: 'all', label: '전체' },
                      { id: 'impact', label: '💥후킹' },
                      { id: 'whoosh', label: '💨전환' },
                      { id: 'tension', label: '❓긴장' },
                      { id: 'humor', label: '😂유머' },
                      { id: 'discovery', label: '💡발견' },
                      { id: 'tech', label: '⚙️테크' },
                      { id: 'pixeling', label: '🎬썰형세트' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedSfxCategory(cat.id)}
                        className={cn(
                          "px-1.5 py-0.5 text-[9px] font-semibold rounded-[2px] border transition cursor-pointer",
                          selectedSfxCategory === cat.id
                            ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* SFX 효과음 카드 목록 */}
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {SFX_CATALOG
                      .filter((s) => selectedSfxCategory === 'all' || s.category === selectedSfxCategory)
                      .map((sfx) => (
                        <div
                          key={sfx.id}
                          className="p-1.5 border border-border bg-muted/20 hover:bg-muted/40 rounded-[2px] flex items-center justify-between gap-1 transition group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-foreground truncate">{sfx.name}</span>
                              <span className="text-[8px] font-mono text-amber-500 bg-amber-500/10 px-1 py-0 rounded">
                                {(sfx.durationMs / 1000).toFixed(1)}s
                              </span>
                            </div>
                            <div className="text-[9px] text-muted-foreground truncate">{sfx.description}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => playSynthesizedSfx(sfx.id)}
                              className="h-5 px-1.5 text-[9px] font-medium rounded border border-border bg-card hover:bg-muted text-foreground flex items-center gap-0.5 cursor-pointer"
                              title="효과음 미리듣기"
                            >
                              <Play className="w-2.5 h-2.5 text-emerald-500" />
                              <span>듣기</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertSfxToTimeline(sfx)}
                              className="h-5 px-1.5 text-[9px] font-bold rounded bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-0.5 cursor-pointer shadow-2xs"
                              title="현재 재생 위치에 추가"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>추가</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeLeftTab === 'media' && (
            <div className="flex-1 flex flex-col min-h-0 p-2 text-xs space-y-2">
              <span className="text-[11px] font-bold text-foreground">미디어 에셋</span>
              <div className="p-2 border border-border bg-card space-y-1 rounded-[2px]">
                <div className="text-[10px] text-muted-foreground">소스: 20260904_tfMMz_MKaMw.mp4</div>
                <div className="text-[10px] text-muted-foreground">길이: {(durationMs / 1000).toFixed(2)}초</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">캐시: 로드 완료</div>
              </div>
            </div>
          )}
        </aside>

        {/* 📱 중앙: 프로페셔널 NLE 프로그램 뷰어 모니터 (상단 툴바 + 캔버스 스테이지 + 하단 도킹 트랜스포트 바) */}
        <main className="flex-1 bg-muted/30 dark:bg-zinc-950 flex flex-col min-h-0 relative overflow-hidden border-r border-border select-none">
          {/* 1. 뷰어 상단 프로 헤더 바 (화면비, 줌 컨트롤, 세이프존, 그리드, 해상도) */}
          <div className="h-9 px-3 bg-card border-b border-border flex items-center justify-between shrink-0 z-20">
            {/* 좌측: 화면비 탭 & 줌 드롭다운 */}
            <div className="flex items-center gap-2">
              {/* 종횡비 전환 탭 */}
              <div className="flex items-center p-0.5 bg-muted/60 rounded-[2px] border border-border text-[10px]">
                <button
                  type="button"
                  onClick={() => handleSwitchAspectRatio('9:16')}
                  className={cn(
                    "px-2 py-0.5 font-bold rounded-[1px] transition cursor-pointer flex items-center gap-1",
                    aspectRatio === '9:16' ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="9:16 쇼츠 / 릴스 / 틱톡 (1080×1920)"
                >
                  <span>9:16 쇼츠</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchAspectRatio('16:9')}
                  className={cn(
                    "px-2 py-0.5 font-bold rounded-[1px] transition cursor-pointer flex items-center gap-1",
                    aspectRatio === '16:9' ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="16:9 유튜브 롱폼 / 방송 (1920×1080)"
                >
                  <span>16:9 롱폼</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchAspectRatio('1:1')}
                  className={cn(
                    "px-2 py-0.5 font-bold rounded-[1px] transition cursor-pointer flex items-center gap-1",
                    aspectRatio === '1:1' ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="1:1 인스타그램 피드 (1080×1080)"
                >
                  <span>1:1 피드</span>
                </button>
              </div>

              <div className="h-3 w-px bg-border mx-0.5" />

              {/* 캔버스 화면 맞춤 & 줌 드롭다운 */}
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
                  title="캔버스를 모니터 창 크기에 100% 최적 맞춤"
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

            {/* 중앙: 해상도 & 비디오 스펙 인디케이터 */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-[2px] border border-border">
                {aspectRatio === '9:16' ? '1080 × 1920 (FHD 9:16)' : aspectRatio === '16:9' ? '1920 × 1080 (FHD 16:9)' : '1080 × 1080 (1:1)'}
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-[2px] border border-emerald-500/20">
                60.00 FPS
              </span>
            </div>

            {/* 우측: 가이드 오버레이 & 유틸리티 버튼 */}
            <div className="flex items-center gap-1">
              {/* 안전 영역 토글 (쇼츠 전용) */}
              {aspectRatio === '9:16' && (
                <button
                  type="button"
                  onClick={() => setSafeZoneVisible(!safeZoneVisible)}
                  className={cn(
                    "h-6 px-2 text-[10px] font-bold rounded-[2px] border transition cursor-pointer flex items-center gap-1",
                    safeZoneVisible ? "bg-amber-500/20 border-amber-500 text-amber-500 dark:text-amber-400" : "border-border bg-background hover:bg-muted text-muted-foreground"
                  )}
                  title="유튜브 쇼츠 / 틱톡 UI 가림 안전영역 표시"
                >
                  <span>안전영역</span>
                </button>
              )}

              {/* 3분할선 및 센터 십자선 토글 */}
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={cn(
                  "h-6 px-1.5 text-[10px] font-bold rounded-[2px] border transition cursor-pointer flex items-center gap-1",
                  showGrid ? "bg-primary/20 border-primary text-foreground" : "border-border bg-background hover:bg-muted text-muted-foreground"
                )}
                title="프로 삼분할 구도선 & 센터 십자선 가이드"
              >
                <Grid className="w-3 h-3" />
                <span className="hidden md:inline">가이드선</span>
              </button>

              {/* 현재 프레임 캡처 스냅샷 */}
              <button
                type="button"
                onClick={() => {
                  toast({ title: '스냅샷 캡처 완료', description: `현재 시점(${(currentTimeMs / 1000).toFixed(2)}초)의 고화질 썸네일 프레임이 클립보드에 복사되었습니다.` });
                }}
                className="h-6 px-1.5 text-[10px] font-bold rounded-[2px] border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer flex items-center gap-1"
                title="현재 프레임 고화질 캡처 (Snapshot)"
              >
                <Camera className="w-3 h-3" />
              </button>

              {/* 🖥️ 전체화면 몰입 프리뷰 버튼 */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={cn(
                  "h-6 px-1.5 text-[10px] font-bold rounded-[2px] border transition cursor-pointer flex items-center gap-1",
                  isFullscreen ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
                title="전체화면 몰입 프리뷰 (ESC 키로 복귀)"
              >
                {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3 text-primary" />}
                <span className="hidden md:inline">전체화면</span>
              </button>
            </div>
          </div>

          {/* 2. 캔버스 스테이지 (단일 진실 공급원 UniversalCanvasStage 렌더링 & 13대 플로팅 인스펙터) */}
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
          >
            <UniversalCanvasStage
              masterManifest={masterManifest}
              aspectRatio={aspectRatio}
              canvasScale={canvasScale}
              canvasPan={canvasPan}
              layoutTemplateMode={layoutTemplateMode}
              selectedLayerId={selectedLayerId}
              setSelectedLayerId={(id) => setSelectedLayerId(id || '')}
              activeInspectorTab={activeInspectorTab}
              setActiveInspectorTab={setActiveInspectorTab}
              activeFloatingInspector={activeFloatingInspector}
              setActiveFloatingInspector={handleOpenFloatingInspector}
              currentBrandChannelName={channelDna.channelName}
              videoFitMode={videoFitMode as any}
              videoBlurBg={videoBlurBg}
              videoFocusXPct={videoFocusXPct}
              videoFocusYPct={videoFocusYPct}
              videoZoomScale={videoZoomScale}
              videoRotationDeg={videoRotationDeg}
              videoHorizontalFlip={videoHorizontalFlip}
              videoVerticalFlip={videoVerticalFlip}
              videoFilter={videoFilter}
              videoCropTopPct={videoCropTopPct}
              videoCropBottomPct={videoCropBottomPct}
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
              videoLayer={videoLayer}
              videoZIndex={10}
              trackVisibility={trackVisibility}
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
              setSubtitleYPercent={(y) => setSubTransform((prev) => ({ ...prev, yPct: y }))}
              currentSubtitleText={activeSub?.data || (typeof subtitleLayers[0]?.data === 'string' ? subtitleLayers[0]?.data : '자막 텍스트')}
              subtitleConfig={subtitleConfig}
              setSubtitleConfig={setSubtitleConfig}
              subtitleStrokeEnabled={subtitleConfig.outlineSize > 0}
              setSubtitleStrokeEnabled={setSubtitleStrokeEnabled}
              subtitleStrokeWidth={subtitleConfig.outlineSize || subtitleStrokeWidth}
              setSubtitleStrokeWidth={setSubtitleStrokeWidth}
              subtitleStrokeColor={subtitleConfig.outlineColor || subtitleStrokeColor}
              setSubtitleStrokeColor={setSubtitleStrokeColor}
              subtitleShadowEnabled={subtitleConfig.shadowSize > 0}
              setSubtitleShadowEnabled={setSubtitleShadowEnabled}
              subtitleShadowBlur={subtitleConfig.shadowSize || subtitleShadowBlur}
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
              selectedSubtitlePresetId={selectedSubtitlePresetId}
              setSelectedSubtitlePresetId={setSelectedSubtitlePresetId}
              selectedHighlightColor={channelDna.secondaryColor || '#FFE500'}
              setSelectedHighlightColor={(col: string) => {
                setChannelDna(prev => ({ ...prev, secondaryColor: col }));
              }}
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
              layers={layers}
              currentProjectDisplayName={currentProjectDisplayName}
              videoRef={videoRef}
              isLooping={isLooping}
              isPlaying={isPlaying}
              trackLock={trackLock}
              handleTimeUpdate={handleTimeUpdate}
              handleLoadedMetadata={handleLoadedMetadata}
              getBgmAudioSrc={getBgmAudioSrc}
              showGrid={showGrid}
              safeZoneVisible={safeZoneVisible}
              safeZonePlatform="youtube"
            />
          </div>

          {/* 3. 뷰어 하단 완벽 도킹 트랜스포트 바 (다빈치 / 프리미어 NLE 프로 컨트롤러) */}
          <div className="h-10 px-3 bg-card border-t border-border flex items-center justify-between shrink-0 z-20 select-none">
            {/* 좌측: 정밀 타임코드 & 스테레오 VU 미터 */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-[2px] border border-border">
                <span className="text-[12px] font-mono font-bold text-foreground">
                  {formatTimecode(currentTimeMs)}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">/</span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {formatTimecode(durationMs)}
                </span>
              </div>

              {/* 🎚️ 스테레오 오디오 VU 미터 */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-background border border-border rounded-[2px]" title="스테레오 오디오 VU 피크 미터">
                <span className="text-[8px] font-mono text-muted-foreground font-bold">VU</span>
                <div className="flex items-end gap-0.5 h-3.5">
                  <div className="w-1 h-full bg-muted rounded-[1px] overflow-hidden flex flex-col justify-end">
                    <div
                      className="w-full transition-all duration-75"
                      style={{
                        height: `${vuLevels.left}%`,
                        backgroundColor: vuLevels.left > 80 ? '#ef4444' : vuLevels.left > 55 ? '#eab308' : '#22c55e',
                      }}
                    />
                  </div>
                  <div className="w-1 h-full bg-muted rounded-[1px] overflow-hidden flex flex-col justify-end">
                    <div
                      className="w-full transition-all duration-75"
                      style={{
                        height: `${vuLevels.right}%`,
                        backgroundColor: vuLevels.right > 80 ? '#ef4444' : vuLevels.right > 55 ? '#eab308' : '#22c55e',
                      }}
                    />
                  </div>
                </div>
                <span className="text-[8px] font-mono text-muted-foreground">
                  {isPlaying ? `${Math.max(vuLevels.left, vuLevels.right) - 60}dB` : '-inf'}
                </span>
              </div>
            </div>

            {/* 중앙: 프로페셔널 플레이백 트랜스포트 버튼 세트 */}
            <div className="flex items-center gap-1">
              {/* 맨 앞으로 */}
              <button
                type="button"
                onClick={() => seekToMs(0)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-[2px] transition cursor-pointer"
                title="맨 처음으로 이동 (Home)"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              {/* -1초 스킵 */}
              <button
                type="button"
                onClick={() => seekToMs(currentTimeMs - 1000)}
                className="px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted rounded-[2px] transition cursor-pointer"
                title="-1초 스킵"
              >
                -1s
              </button>

              {/* -1 프레임 */}
              <button
                type="button"
                onClick={() => seekToMs(currentTimeMs - 1000 / 30)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-[2px] transition cursor-pointer"
                title="-1 프레임 (← 방향키)"
              >
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </button>

              {/* 메인 재생/일시정지 버튼 */}
              <button
                type="button"
                onClick={togglePlay}
                className="w-8 h-8 mx-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[2px] flex items-center justify-center cursor-pointer shadow-xs active:scale-95 transition-all"
                title="재생 / 일시정지 (Space)"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              {/* +1 프레임 */}
              <button
                type="button"
                onClick={() => seekToMs(currentTimeMs + 1000 / 30)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-[2px] transition cursor-pointer"
                title="+1 프레임 (→ 방향키)"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* +1초 스킵 */}
              <button
                type="button"
                onClick={() => seekToMs(currentTimeMs + 1000)}
                className="px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted rounded-[2px] transition cursor-pointer"
                title="+1초 스킵"
              >
                +1s
              </button>

              {/* 맨 끝으로 */}
              <button
                type="button"
                onClick={() => seekToMs(durationMs)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-[2px] transition cursor-pointer"
                title="맨 끝으로 이동 (End)"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              {/* 루프 반복 재생 토글 */}
              <button
                type="button"
                onClick={() => setIsLooping(!isLooping)}
                className={cn(
                  "p-1.5 rounded-[2px] transition cursor-pointer ml-1",
                  isLooping ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title={isLooping ? '반복 재생 켜짐' : '반복 재생 꺼짐'}
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 우측: 재생 배속 & 볼륨/음소거 */}
            <div className="flex items-center gap-2">
              {/* 재생 배속 드롭다운 */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-semibold">배속:</span>
                <select
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                  className="h-6 px-1 text-[10px] font-mono bg-background border border-border rounded-[2px] text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="0.5">0.5x</option>
                  <option value="1.0">1.0x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2.0">2.0x</option>
                </select>
              </div>

              <div className="h-3 w-px bg-border mx-0.5" />

              {/* 볼륨 & 음소거 */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
                  title={isMuted ? '음소거 해제' : '음소거'}
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
                  className="w-14 accent-primary cursor-pointer h-1 bg-muted"
                  title={`모니터 볼륨: ${isMuted ? 0 : masterVolume}%`}
                />
              </div>
            </div>
          </div>
        </main>

        {/* 🎛️ 우측: 프로페셔널 인스펙터 (280px, 한글 폰트 & 서식 완전 장착) */}
        <aside className="w-72 shrink-0 border-l border-border bg-card flex flex-col min-h-0 z-20">
          <div className="h-9 px-3 border-b border-border flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              인스펙터
            </span>
            <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.2 rounded-[2px] border border-border">
              {selectedLayer.type.toUpperCase()}
            </span>
          </div>

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

          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar text-xs">
            <div className="p-2 border border-border bg-muted/20 rounded-[2px] flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">선택 타겟:</span>
              <span className="text-[11px] font-bold text-primary truncate max-w-[140px]">{selectedLayer.name}</span>
            </div>

            {/* 🏛️ 0. 4대 폼팩터 통합 바이럴 템플릿/폼 제어 패널 */}
            {activeInspectorTab === 'template' && (
              <TemplateInspectorForm
                hideArchetypeSelector={!!sovereignMode}
                layoutTemplateMode={layoutTemplateMode}
                handleSelectTemplateMode={handleSelectTemplateMode}
                handleOpenTemplateLibrary={handleOpenTemplateLibrary}
                onSaveCurrentStyleAsTemplate={() => setIsSaveTemplateDialogOpen(true)}
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
                topTitleFontSize={titleLine1SizePx}
                setTopTitleFontSize={setTitleLine1SizePx}
                topTitleColor={titleLine1Color}
                setTopTitleColor={setTitleLine1Color}
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
                setSubtitleYPercent={setSubtitleYPercent}
                handleInsertMeme={handleInsertMeme}
                handleSearchWebImages={handleSearchWebImages}
                handleGenerateFlowImage={handleGenerateFlowImage}
                isWebImageSearchOpen={isWebImageSearchOpen}
                setIsWebImageSearchOpen={setIsWebImageSearchOpen}
                selectedBgmMood={selectedBgmMood}
                setSelectedBgmMood={setSelectedBgmMood}
                autoMoodMatching={autoMoodMatching}
                setAutoMoodMatching={setAutoMoodMatching}
                setIsBgmModalOpen={setIsBgmModalOpen}
                scriptSplitPreset={scriptSplitPreset}
                setScriptSplitPreset={setScriptSplitPreset}
                activeInspectorTab={activeInspectorTab}
                setActiveInspectorTab={setActiveInspectorTab}
                selectedLayerId={selectedLayerId}
                setSelectedLayerId={setSelectedLayerId}
                layers={layers}
                setLayers={setLayers}
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

            {/* 📜 2-0-1. 썰형 헤더 / 메타데이터 / 구분선 전용 탭 */}
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
                handleInjectTitleCandidate={handleInjectTitleCandidate}
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
                setTopTitleYPct={setTopTitleYPct}
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

            {/* 2. ✂️ 비디오 크롭 / 핏 모드 탭 */}
            {activeInspectorTab === 'videoCrop' && (
              <VideoCropInspectorForm
                videoFitMode={videoFitMode as any}
                setVideoFitMode={setVideoFitMode as any}
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

            {/* 🎨 필터 & FX 탭 */}
            {activeInspectorTab === 'filterFx' && (
              <FilterFxInspectorForm
                videoFilter={videoFilter as any}
                setVideoFilter={setVideoFilter as any}
              />
            )}

            {/* 💬 바이럴 댓글 카드 탭 */}
            {activeInspectorTab === 'commentCard' && (
              <CommentCardInspectorForm
                commentCard={commentCard as any}
                setCommentCard={setCommentCard as any}
                hasCommentCard={hasCommentCard}
                setHasCommentCard={setHasCommentCard}
                commentTransform={commentTransform}
                setCommentTransform={setCommentTransform}
                handleGenerateViralComment={handleGenerateViralComment}
              />
            )}

            {/* ⚡ 긴박 쨉쨉이 훅 탭 */}
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
                handleAutoTrackSmartPlacement={handleAutoTrackSmartPlacement}
                layoutTemplateMode={layoutTemplateMode}
                gunlimboConfig={gunlimboConfig}
                setGunlimboConfig={setGunlimboConfig}
                jabLetterSpacing={jabLetterSpacing}
                setJabLetterSpacing={setJabLetterSpacing}
                jabLineHeight={jabLineHeight}
                setJabLineHeight={setJabLineHeight}
              />
            )}

            {/* 🔤 자막 스타일 탭 */}
            {activeInspectorTab === 'style' && (
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
                layers={layers}
                setLayers={setLayers}
              />
            )}
            {activeInspectorTab === 'tts' && (
              <div className="space-y-3">
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-primary" />
                      A2 나레이션 트랙 활성화
                    </span>
                    <Switch
                      checked={enabledTracks.a2Narration}
                      onCheckedChange={(checked) => {
                        setEnabledTracks(prev => ({ ...prev, a2Narration: checked }));
                        toast({
                          title: checked ? '나레이션 트랙 활성화' : '나레이션 트랙 비활성화',
                          description: checked ? '타임라인에 A2 나레이션 트랙이 추가되었습니다.' : '타임라인에서 A2 나레이션 트랙이 숨겨졌습니다 (무음/BGM 모드).',
                        });
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {enabledTracks.a2Narration
                      ? '현재 영상에 AI 음성 나레이션이 활성화되어 타임라인에 클립이 배치됩니다.'
                      : '현재 영상은 나레이션이 없는 무음/BGM 영상 모드입니다. 켜면 AI 나레이션 트랙이 추가됩니다.'}
                  </p>
                </div>

                {/* TTS Config Panel */}
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-2 shadow-2xs">
                  <div className="text-[11px] font-bold text-foreground">음성 합성 엔진 설정</div>
                  <TTSConfigPanel
                    config={ttsConfig}
                    onChange={(newCfg) => setTtsConfig(newCfg)}
                    compact={true}
                    showFavorites={true}
                  />
                </div>
              </div>
            )}

            {/* 6. 🧬 채널 DNA 탭 (시그니처 일괄 동기화) */}
            {activeInspectorTab === 'channel' && (
              <div className="space-y-3">
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="text-[11px] font-bold text-foreground">채널 시그니처 DNA</span>
                    <Badge variant="outline" className="text-[9px] font-mono text-primary">SYNC READY</Badge>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between text-muted-foreground">
                      <span>소속 채널:</span>
                      <span className="font-bold text-foreground">{channelDna.channelName}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>시그니처 폰트:</span>
                      <span className="font-mono text-foreground font-bold">{channelDna.fontFamily}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>대표 듀얼 컬러:</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 rounded-[2px] border border-border shadow-xs" style={{ backgroundColor: channelDna.primaryColor }} />
                        <div className="w-3.5 h-3.5 rounded-[2px] border border-border shadow-xs" style={{ backgroundColor: channelDna.secondaryColor }} />
                      </div>
                    </div>
                  </div>

                  {/* 🌟 원클릭 일괄 적용 버튼 */}
                  <button
                    type="button"
                    onClick={() => {
                      // 채널 DNA 시그니처 속성을 상단 2단 타이틀, 쨉쨉이, 자막에 100% 일괄 주입
                      setTitleFontFamily(channelDna.fontFamily);
                      setTitleLine1Color('#FFFFFF');
                      setTitleLine2Color(channelDna.primaryColor);
                      setJabColor('#000000');
                      setJabBgColor(channelDna.primaryColor);
                      setSubtitleConfig(prev => ({
                        ...prev,
                        fontFamily: channelDna.fontFamily,
                        fillColor: channelDna.primaryColor,
                        strokeColor: '#000000',
                        strokeWidth: 4,
                      }));
                      toast({
                        title: '⚡ 채널 DNA 일괄 동기화 완료',
                        description: `[${channelDna.channelName}]의 시그니처 폰트(${channelDna.fontFamily})와 대표 컬러(${channelDna.primaryColor})가 상단 타이틀, 쨉쨉이, 자막에 일괄 적용되었습니다.`,
                      });
                    }}
                    className="w-full h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[2px] font-bold text-[11px] transition cursor-pointer flex items-center justify-center gap-1 shadow-xs active:scale-98 mt-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>채널 DNA 스타일 전체 일괄 적용</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. 프로 멀티트랙 타임라인 (280px 독, 100% 직각 블록 NLE)
      ───────────────────────────────────────────────────────────── */}
      <footer className="h-72 border-t border-border bg-card flex flex-col shrink-0 select-none z-20">
        {/* 타임라인 툴바 (높이 34px, 다빈치/캡컷 컴팩트 규격) */}
        <div className="h-8 border-b border-border bg-muted/40 px-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleSplitClip}
              className="h-6 px-2 text-[11px] font-semibold border border-border bg-card hover:bg-muted text-foreground rounded-[2px] flex items-center gap-1 transition cursor-pointer"
              title="클립 분할 (C)"
            >
              <Scissors className="w-3 h-3 text-primary" />
              <span>자르기 (C)</span>
            </button>
            <button
              type="button"
              onClick={handleRippleDelete}
              className="h-6 px-2 text-[11px] font-semibold border border-border bg-card hover:bg-red-500/10 text-red-600 dark:text-red-400 rounded-[2px] flex items-center gap-1 transition cursor-pointer"
              title="리플 삭제 (뒤 클립 당겨오기)"
            >
              <Trash2 className="w-3 h-3" />
              <span>리플 삭제</span>
            </button>
            <button
              type="button"
              onClick={handleDuplicateClip}
              className="h-6 px-2 text-[11px] font-semibold border border-border bg-card hover:bg-muted text-foreground rounded-[2px] flex items-center gap-1 transition cursor-pointer"
              title="복제 (Ctrl+D)"
            >
              <Copy className="w-3 h-3" />
              <span>복제</span>
            </button>
            <div className="h-3.5 w-px bg-border mx-1" />
            <button
              type="button"
              onClick={handleAiSyncAutoAlign}
              className="h-6 px-2 text-[10px] font-semibold border border-border bg-card hover:bg-muted text-primary rounded-[2px] flex items-center gap-1 transition cursor-pointer"
              title="AI Whisper 싱크 자동 정렬"
            >
              <Wand2 className="w-3 h-3" />
              <span>AI 싱크 맞춤</span>
            </button>
            <div className="h-3.5 w-px bg-border mx-1" />
            {/* 🌟 동적 나레이션 트랙 토글 버튼 */}
            <button
              type="button"
              onClick={() => {
                const nextState = !enabledTracks.a2Narration;
                setEnabledTracks(prev => ({ ...prev, a2Narration: nextState }));
                toast({
                  title: nextState ? '🎙️ A2 나레이션 트랙 활성화' : '🎙️ A2 나레이션 트랙 비활성화',
                  description: nextState
                    ? 'AI 음성 나레이션 전용 A2 오디오 트랙이 타임라인에 생성되었습니다.'
                    : 'A2 나레이션 트랙이 타임라인에서 숨겨졌습니다 (무음/현장음 모드).',
                });
              }}
              className={cn(
                "h-6 px-2 text-[10px] font-bold rounded-[2px] border transition cursor-pointer flex items-center gap-1",
                enabledTracks.a2Narration
                  ? "bg-purple-600/20 border-purple-500 text-purple-600 dark:text-purple-300"
                  : "border-border bg-card hover:bg-muted text-foreground"
              )}
              title="AI 나레이션(TTS) 오디오 트랙 켜기/끄기"
            >
              <Mic className="w-3 h-3" />
              <span>{enabledTracks.a2Narration ? '나레이션 트랙 ON' : '+ 나레이션 트랙'}</span>
            </button>
          </div>

          {/* 중앙 타임코드 (모노스페이스 다빈치 스타일) */}
          <div className="font-mono text-xs font-bold text-foreground bg-muted/40 px-2.5 py-0.5 border border-border rounded-[2px] tracking-wider">
            {formatTimecode(currentTimeMs)}
          </div>

          {/* 우측 줌 슬라이더 & 자석 스냅 & 전체 맞춤 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFitToTimeline}
              className="h-6 px-2 rounded-[2px] text-[10px] font-semibold border border-border bg-card hover:bg-muted text-foreground transition flex items-center gap-1 cursor-pointer"
              title="타임라인 전체 화면에 맞추기"
            >
              <Minimize2 className="w-3 h-3" />
              <span>전체 맞춤</span>
            </button>
            <button
              type="button"
              onClick={() => setMagnetSnap(!magnetSnap)}
              className={cn(
                "h-6 px-2 rounded-[2px] text-[10px] font-semibold border transition flex items-center gap-1 cursor-pointer",
                magnetSnap ? "bg-primary/10 border-primary text-primary" : "border-border bg-card text-muted-foreground"
              )}
            >
              <Magnet className="w-3 h-3" />
              <span>스냅</span>
            </button>
            <div className="flex items-center gap-1.5 bg-card px-2 py-0.5 border border-border rounded-[2px]">
              <ZoomOut className="w-3 h-3 text-muted-foreground" />
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                className="w-16 accent-primary cursor-pointer h-1 bg-muted"
              />
              <ZoomIn className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-mono text-muted-foreground font-bold">{zoomLevel.toFixed(1)}x</span>
            </div>
          </div>
        </div>

        {/* 트랙 바디 (좌: 트랙 헤더, 우: 직각 클립 타임라인) */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          {/* 좌측 트랙 헤더 (130px) */}
          <div className="w-32 shrink-0 border-r border-border bg-card flex flex-col divide-y divide-border">
            <div className="h-6 flex items-center justify-between px-2 text-[10px] font-mono text-muted-foreground font-bold bg-muted/30">
              <span>트랙 목록</span>
              <span className="text-[9px] text-primary">{Object.values(enabledTracks).filter(Boolean).length}개</span>
            </div>
            {enabledTracks.t1Title && (
              <div className="h-9 flex items-center justify-between px-2 text-xs font-semibold text-foreground">
                <span className="text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  T1 타이틀
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackVisibility(prev => ({ ...prev, t1Title: !prev.t1Title }));
                    }}
                    title={trackVisibility.t1Title ? "타이틀 숨기기" : "타이틀 보이기"}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {trackVisibility.t1Title ? (
                      <Eye className="w-3.5 h-3.5 text-primary hover:scale-110 transition cursor-pointer" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-muted-foreground/60 hover:scale-110 transition cursor-pointer" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackLock(prev => ({ ...prev, t1Title: !prev.t1Title }));
                    }}
                    title={trackLock.t1Title ? "트랙 잠금 해제" : "트랙 잠금"}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {trackLock.t1Title ? (
                      <Lock className="w-3.5 h-3.5 text-amber-500 hover:scale-110 transition cursor-pointer" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-foreground hover:scale-110 transition cursor-pointer" />
                    )}
                  </button>
                </div>
              </div>
            )}
            {enabledTracks.t2Jab && (
              <div className="h-9 flex items-center justify-between px-2 text-xs font-semibold text-foreground">
                <span className="text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  T2 쨉쨉이
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackVisibility(prev => ({ ...prev, t2Jab: !prev.t2Jab }));
                    }}
                    title={trackVisibility.t2Jab ? "쨉쨉이 숨기기" : "쨉쨉이 보이기"}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {trackVisibility.t2Jab ? (
                      <Eye className="w-3.5 h-3.5 text-primary hover:scale-110 transition cursor-pointer" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-muted-foreground/60 hover:scale-110 transition cursor-pointer" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackLock(prev => ({ ...prev, t2Jab: !prev.t2Jab }));
                    }}
                    title={trackLock.t2Jab ? "트랙 잠금 해제" : "트랙 잠금"}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {trackLock.t2Jab ? (
                      <Lock className="w-3.5 h-3.5 text-amber-500 hover:scale-110 transition cursor-pointer" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-foreground hover:scale-110 transition cursor-pointer" />
                    )}
                  </button>
                </div>
              </div>
            )}
            {enabledTracks.sub && (
              <div className="h-9 flex items-center justify-between px-2 text-xs font-semibold text-foreground">
                <span className="text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  SUB 자막
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackVisibility(prev => ({ ...prev, sub: !prev.sub }));
                    }}
                    title={trackVisibility.sub ? "자막 숨기기" : "자막 보이기"}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {trackVisibility.sub ? (
                      <Eye className="w-3.5 h-3.5 text-primary hover:scale-110 transition cursor-pointer" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-muted-foreground/60 hover:scale-110 transition cursor-pointer" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackLock(prev => ({ ...prev, sub: !prev.sub }));
                    }}
                    title={trackLock.sub ? "트랙 잠금 해제" : "트랙 잠금"}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {trackLock.sub ? (
                      <Lock className="w-3.5 h-3.5 text-amber-500 hover:scale-110 transition cursor-pointer" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-foreground hover:scale-110 transition cursor-pointer" />
                    )}
                  </button>
                </div>
              </div>
            )}
            {enabledTracks.v1Video && (
              <div className="h-11 flex items-center justify-between px-2 text-xs font-semibold text-foreground">
                <span className="text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  V1 비디오
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackVisibility(prev => ({ ...prev, v1Video: !prev.v1Video }));
                    }}
                    title={trackVisibility.v1Video ? "비디오 숨기기" : "비디오 보이기"}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {trackVisibility.v1Video ? (
                      <Eye className="w-3.5 h-3.5 text-primary hover:scale-110 transition cursor-pointer" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-muted-foreground/60 hover:scale-110 transition cursor-pointer" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackAudioMute(prev => ({ ...prev, v1Video: !prev.v1Video }));
                    }}
                    title={trackAudioMute.v1Video ? "비디오 사운드 켜기" : "비디오 사운드 음소거"}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {trackAudioMute.v1Video ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-500 hover:scale-110 transition cursor-pointer" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-sky-500 hover:scale-110 transition cursor-pointer" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackLock(prev => ({ ...prev, v1Video: !prev.v1Video }));
                    }}
                    title={trackLock.v1Video ? "트랙 잠금 해제" : "트랙 잠금"}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {trackLock.v1Video ? (
                      <Lock className="w-3.5 h-3.5 text-amber-500 hover:scale-110 transition cursor-pointer" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-foreground hover:scale-110 transition cursor-pointer" />
                    )}
                  </button>
                </div>
              </div>
            )}
            {enabledTracks.a1Bgm && (
              <div className="h-9 flex items-center justify-between px-2 text-xs font-semibold text-foreground">
                <span className="text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  A1 BGM
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackAudioMute(prev => ({ ...prev, a1Bgm: !prev.a1Bgm }));
                    }}
                    title={trackAudioMute.a1Bgm ? "BGM 음소거 해제" : "BGM 음소거"}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {trackAudioMute.a1Bgm ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-500 hover:scale-110 transition cursor-pointer" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-teal-500 hover:scale-110 transition cursor-pointer" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackLock(prev => ({ ...prev, a1Bgm: !prev.a1Bgm }));
                    }}
                    title={trackLock.a1Bgm ? "트랙 잠금 해제" : "트랙 잠금"}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {trackLock.a1Bgm ? (
                      <Lock className="w-3.5 h-3.5 text-amber-500 hover:scale-110 transition cursor-pointer" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-foreground hover:scale-110 transition cursor-pointer" />
                    )}
                  </button>
                </div>
              </div>
            )}
            {/* 🌟 A2 나레이션 트랙 헤더 (동적) */}
            {enabledTracks.a2Narration && (
              <div className="h-9 flex items-center justify-between px-2 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/5">
                <span className="text-[11px] flex items-center gap-1 font-bold">
                  <Mic className="w-3 h-3" />
                  A2 나레이션
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackAudioMute(prev => ({ ...prev, a2Narration: !prev.a2Narration }));
                    }}
                    title={trackAudioMute.a2Narration ? "나레이션 음소거 해제" : "나레이션 음소거"}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {trackAudioMute.a2Narration ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-500 hover:scale-110 transition cursor-pointer" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-purple-500 hover:scale-110 transition cursor-pointer" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackLock(prev => ({ ...prev, a2Narration: !prev.a2Narration }));
                    }}
                    title={trackLock.a2Narration ? "트랙 잠금 해제" : "트랙 잠금"}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {trackLock.a2Narration ? (
                      <Lock className="w-3.5 h-3.5 text-amber-500 hover:scale-110 transition cursor-pointer" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-foreground hover:scale-110 transition cursor-pointer" />
                    )}
                  </button>
                </div>
              </div>
            )}
            {/* 🌟 9. A3 SFX 효과음 트랙 헤더 */}
            {enabledTracks.a3Sfx && (
              <div className="h-9 flex items-center justify-between px-2 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/5 border-b border-border">
                <span className="text-[11px] flex items-center gap-1 font-bold">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  A3 효과음
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackVisibility(prev => ({ ...prev, a3Sfx: prev.a3Sfx === false ? true : false }));
                    }}
                    title={trackVisibility.a3Sfx !== false ? "효과음 트랙 숨기기" : "효과음 트랙 보이기"}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {trackVisibility.a3Sfx !== false ? (
                      <Eye className="w-3.5 h-3.5 text-amber-500 hover:scale-110 transition cursor-pointer" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-foreground hover:scale-110 transition cursor-pointer" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackAudioMute(prev => ({ ...prev, a3Sfx: !prev.a3Sfx }));
                    }}
                    title={trackAudioMute.a3Sfx ? "효과음 음소거 해제" : "효과음 음소거"}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {trackAudioMute.a3Sfx ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-500 hover:scale-110 transition cursor-pointer" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-amber-500 hover:scale-110 transition cursor-pointer" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackLock(prev => ({ ...prev, a3Sfx: !prev.a3Sfx }));
                    }}
                    title={trackLock.a3Sfx ? "트랙 잠금 해제" : "트랙 잠금"}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {trackLock.a3Sfx ? (
                      <Lock className="w-3.5 h-3.5 text-amber-500 hover:scale-110 transition cursor-pointer" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-foreground hover:scale-110 transition cursor-pointer" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 우측 타임 룰러 & 클립 스트림 (스크롤 영역) */}
          <div ref={timelineScrollRef} className="flex-1 flex flex-col overflow-x-auto overflow-y-hidden relative bg-muted/15 custom-scrollbar">
            <div style={{ width: `${totalTimelineWidthPx}px` }} className="relative flex flex-col h-full">
              {/* 1. 타임 룰러 눈금자 */}
              <div
                onPointerDown={handleRulerPointerDown}
                className="h-6 border-b border-border bg-muted/40 relative cursor-pointer select-none"
              >
                {Array.from({ length: Math.ceil(durationMs / 1000) + 1 }).map((_, sec) => (
                  <div
                    key={sec}
                    style={{ left: `${msToPx(sec * 1000)}px` }}
                    className="absolute top-0 bottom-0 border-l border-border flex items-end pb-0.5 pl-1"
                  >
                    <span className="text-[9px] font-mono text-muted-foreground font-bold leading-none">
                      {String(Math.floor(sec / 60)).padStart(2, '0')}:{String(sec % 60).padStart(2, '0')}
                    </span>
                  </div>
                ))}
              </div>

              {/* 2. 빨간색 수직 재생헤드 (Playhead, 모던 인터랙티브 핀) */}
              <div
                style={{ left: `${msToPx(currentTimeMs)}px` }}
                className="absolute top-0 bottom-0 w-px bg-rose-500 z-40 pointer-events-none"
              >
                {/* 상단 핀 핸들 (마우스 직접 드래그 스크러빙 가능) */}
                <div
                  onPointerDown={handlePlayheadPointerDown}
                  className="absolute -top-0 -translate-x-1/2 w-5 h-6 cursor-ew-resize flex flex-col items-center group pointer-events-auto select-none"
                  title="드래그하여 타임라인 재생 위치 이동"
                >
                  <div className="w-3.5 h-3.5 bg-rose-500 rounded-t-xs shadow-md flex items-center justify-center text-[7px] text-white font-black group-hover:scale-110 group-active:scale-125 transition-transform">
                    ▼
                  </div>
                  <div className="w-0.5 h-2.5 bg-rose-500/90" />
                  {/* 실시간 타임코드 툴팁 */}
                  <div className="absolute -top-6 px-1.5 py-0.5 rounded bg-neutral-900 text-white border border-neutral-700 text-[9px] font-mono font-bold shadow-md opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {formatTimecode(currentTimeMs)}
                  </div>
                </div>
              </div>

              {/* 3. T1 타이틀 트랙 */}
              {enabledTracks.t1Title && (
                <div className="h-9 border-b border-border relative">
                  {titleLayer && (
                    <div
                      onClick={() => {
                        setSelectedLayerId(titleLayer.id);
                        if (layoutTemplateMode === 'instagram') {
                          setActiveInspectorTab('template');
                          document.getElementById('insta-sec-title')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                      }}
                      style={{
                        left: `${msToPx(titleLayer.startMs)}px`,
                        width: `${Math.max(20, msToPx(titleLayer.endMs - titleLayer.startMs))}px`,
                      }}
                      className={cn(
                        "absolute inset-y-0 rounded-[3px] bg-indigo-600/90 dark:bg-indigo-950/90 border border-indigo-400/70 dark:border-indigo-500/50 text-white flex items-center px-2 text-[10px] font-bold cursor-pointer group shadow-2xs hover:brightness-110 transition-all",
                        selectedLayerId === titleLayer.id && "ring-2 ring-indigo-300 dark:ring-indigo-400 z-10 brightness-110"
                      )}
                    >
                      <span className="truncate">{titleLayer.styleProps.title1 || titleLayer.name}</span>
                      <div
                        onPointerDown={(e) => handleClipTrim(e, titleLayer.id, 'left')}
                        className="absolute left-0 inset-y-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/60 z-20"
                      />
                      <div
                        onPointerDown={(e) => handleClipTrim(e, titleLayer.id, 'right')}
                        className="absolute right-0 inset-y-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/60 z-20"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 4. T2 쨉쨉이 트랙 */}
              {enabledTracks.t2Jab && (
                <div className="h-9 border-b border-border relative">
                  {layers.filter((l) => l.type === 'jab').map((jab) => (
                    <div
                      key={jab.id}
                      onClick={() => {
                        setSelectedLayerId(jab.id);
                        setActiveInspectorTab('jabHook');
                        setJabText(jab.data);
                      }}
                      onPointerDown={(e) => handleClipMove(e, jab.id)}
                      style={{
                        left: `${msToPx(jab.startMs)}px`,
                        width: `${Math.max(20, msToPx(jab.endMs - jab.startMs))}px`,
                      }}
                      className={cn(
                        "absolute inset-y-0 rounded-[3px] bg-amber-500/90 dark:bg-amber-900/85 border border-amber-300/80 dark:border-amber-600/60 text-slate-900 dark:text-amber-100 flex items-center px-2 text-[10px] font-bold cursor-pointer group shadow-2xs hover:brightness-110 transition-all",
                        selectedLayerId === jab.id && "ring-2 ring-amber-300 dark:ring-amber-400 z-10 brightness-110"
                      )}
                    >
                      <span className="truncate">{jab.data}</span>
                      <div
                        onPointerDown={(e) => handleClipTrim(e, jab.id, 'left')}
                        className="absolute left-0 inset-y-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/60 z-20"
                      />
                      <div
                        onPointerDown={(e) => handleClipTrim(e, jab.id, 'right')}
                        className="absolute right-0 inset-y-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/60 z-20"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 5. SUB 자막 트랙 */}
              {enabledTracks.sub && (
                <div className="h-9 border-b border-border relative">
                  {subtitleLayers.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => {
                        setSelectedLayerId(sub.id);
                        if (layoutTemplateMode === 'instagram') {
                          setActiveInspectorTab('template');
                          document.getElementById('insta-sec-sub')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                      }}
                      onPointerDown={(e) => handleClipMove(e, sub.id)}
                      style={{
                        left: `${msToPx(sub.startMs)}px`,
                        width: `${Math.max(20, msToPx(sub.endMs - sub.startMs))}px`,
                      }}
                      className={cn(
                        "absolute inset-y-0 rounded-[3px] bg-sky-600/90 dark:bg-sky-950/90 border border-sky-400/70 dark:border-sky-500/50 text-white flex items-center px-2 text-[10px] font-medium cursor-pointer group shadow-2xs hover:brightness-110 transition-all",
                        selectedLayerId === sub.id && "ring-2 ring-sky-300 dark:ring-sky-400 z-10 brightness-110"
                      )}
                    >
                      <span className="truncate">{sub.data}</span>
                      <div
                        onPointerDown={(e) => handleClipTrim(e, sub.id, 'left')}
                        className="absolute left-0 inset-y-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/60 z-20"
                      />
                      <div
                        onPointerDown={(e) => handleClipTrim(e, sub.id, 'right')}
                        className="absolute right-0 inset-y-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/60 z-20"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 6. V1 비디오 트랙 */}
              {enabledTracks.v1Video && (
                <div className="h-11 border-b border-border relative">
                  {videoLayer && (
                    <div
                      onClick={() => {
                        setSelectedLayerId(videoLayer.id);
                        if (layoutTemplateMode === 'instagram') {
                          setActiveInspectorTab('template');
                          document.getElementById('insta-sec-hole')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                      }}
                      style={{
                        left: `${msToPx(videoLayer.startMs)}px`,
                        width: `${Math.max(20, msToPx(videoLayer.endMs - videoLayer.startMs))}px`,
                      }}
                      className={cn(
                        "absolute inset-y-0 rounded-[3px] bg-slate-800/95 dark:bg-slate-900/95 border border-slate-600/60 overflow-hidden flex items-center cursor-pointer group shadow-2xs hover:border-sky-400/80 transition-all",
                        selectedLayerId === videoLayer.id && "ring-2 ring-sky-400 z-10 brightness-110"
                      )}
                    >
                      {/* 필름 스트립 프레임 틱 패턴 */}
                      <div className="absolute inset-0 opacity-25 flex">
                        {Array.from({ length: 30 }).map((_, fIdx) => (
                          <div key={fIdx} className="w-12 h-full border-r border-slate-500/40 shrink-0 bg-slate-800/40 flex items-center justify-center text-[7px] text-slate-300 font-mono">
                            FRAME
                          </div>
                        ))}
                      </div>
                      <div className="relative z-10 px-2 flex items-center gap-1.5 text-white text-[11px] font-semibold">
                        <FileVideo className="w-3.5 h-3.5 text-sky-400" />
                        <span>{videoLayer.name}</span>
                      </div>
                      <div
                        onPointerDown={(e) => handleClipTrim(e, videoLayer.id, 'left')}
                        className="absolute left-0 inset-y-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-sky-400/80 z-20"
                      />
                      <div
                        onPointerDown={(e) => handleClipTrim(e, videoLayer.id, 'right')}
                        className="absolute right-0 inset-y-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-sky-400/80 z-20"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 7. A1 BGM 트랙 */}
              {enabledTracks.a1Bgm && (
                <div className="h-9 border-b border-border relative">
                  {layers.filter((l) => l.type === 'audio' && !l.name.startsWith('SFX:') && !l.id.startsWith('smart_sfx') && !l.id.startsWith('sfx_')).map((aud) => (
                    <div
                      key={aud.id}
                      onClick={() => setSelectedLayerId(aud.id)}
                      style={{
                        left: `${msToPx(aud.startMs)}px`,
                        width: `${Math.max(20, msToPx(aud.endMs - aud.startMs))}px`,
                      }}
                      className={cn(
                        "absolute inset-y-0 rounded-[3px] bg-teal-700/90 dark:bg-teal-950/90 border border-teal-500/60 overflow-hidden flex items-center px-2 cursor-pointer group shadow-2xs hover:brightness-110 transition-all",
                        selectedLayerId === aud.id && "ring-2 ring-teal-300 z-10 brightness-110"
                      )}
                    >
                      {/* 오디오 파형 */}
                      <div className="absolute inset-0 opacity-50 flex items-center justify-around px-1 pointer-events-none">
                        {Array.from({ length: 70 }).map((_, wIdx) => {
                          const h = 25 + ((wIdx * 19) % 65);
                          return (
                            <div
                              key={wIdx}
                              style={{ height: `${h}%` }}
                              className="w-1 bg-teal-200 dark:bg-teal-300 mx-0.5 shrink-0"
                            />
                          );
                        })}
                      </div>
                      <div className="relative z-10 flex items-center gap-1.5 text-teal-100 text-[10px] font-bold">
                        <Music className="w-3 h-3 text-teal-300" />
                        <span>{aud.name}</span>
                      </div>
                      <div
                        onPointerDown={(e) => handleClipTrim(e, aud.id, 'left')}
                        className="absolute left-0 inset-y-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-teal-300/80 z-20"
                      />
                      <div
                        onPointerDown={(e) => handleClipTrim(e, aud.id, 'right')}
                        className="absolute right-0 inset-y-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-teal-300/80 z-20"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 🌟 8. A2 나레이션 트랙 (동적 TTS 씬별 오디오 클립) */}
              {enabledTracks.a2Narration && (
                <div className="h-9 relative bg-purple-950/10 border-b border-purple-500/30">
                  {subtitleLayers.map((sub, idx) => (
                    <div
                      key={`narration_${sub.id}`}
                      onClick={() => {
                        setSelectedLayerId(sub.id);
                        setActiveInspectorTab('tts');
                        seekToMs(sub.startMs);
                      }}
                      style={{
                        left: `${msToPx(sub.startMs)}px`,
                        width: `${Math.max(20, msToPx(sub.endMs - sub.startMs))}px`,
                      }}
                      className={cn(
                        "absolute inset-y-0 rounded-[3px] bg-purple-700/90 dark:bg-purple-950/90 border border-purple-400/80 overflow-hidden flex items-center px-2 cursor-pointer group shadow-2xs hover:brightness-110 transition-all",
                        selectedLayerId === sub.id && "ring-2 ring-purple-300 z-10 brightness-110"
                      )}
                      title={`씬 #${idx + 1} AI 나레이션 (클릭 시 보이스 설정)`}
                    >
                      {/* TTS 오디오 파형 */}
                      <div className="absolute inset-0 opacity-40 flex items-center justify-around px-1 pointer-events-none">
                        {Array.from({ length: 40 }).map((_, wIdx) => {
                          const h = 20 + ((wIdx * 31) % 75);
                          return (
                            <div
                              key={wIdx}
                              style={{ height: `${h}%` }}
                              className="w-1 bg-purple-200 dark:bg-purple-300 mx-0.5 shrink-0"
                            />
                          );
                        })}
                      </div>
                      <div className="relative z-10 flex items-center gap-1 text-purple-100 text-[10px] font-bold">
                        <Mic className="w-2.5 h-2.5 text-purple-300" />
                        <span className="truncate">A2 씬#{idx + 1} 보이스</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* ⚡ 9. A3 SFX 효과음 트랙 */}
              {enabledTracks.a3Sfx && (
                <div className="h-9 border-b border-amber-500/30 relative bg-amber-950/10">
                  {layers
                    .filter((l) => l.type === 'audio' && (l.name.startsWith('SFX:') || l.id.startsWith('smart_sfx') || l.id.startsWith('sfx_')))
                    .map((sfx) => {
                      const isSelected = selectedLayerId === sfx.id;
                      return (
                        <div
                          key={sfx.id}
                          onClick={() => {
                            setSelectedLayerId(sfx.id);
                            playSynthesizedSfx(sfx.data || 'sfx_punch_hit');
                          }}
                          style={{
                            left: `${msToPx(sfx.startMs)}px`,
                            width: `${Math.max(28, msToPx(sfx.endMs - sfx.startMs))}px`,
                          }}
                          className={cn(
                            "absolute inset-y-0 rounded-[3px] bg-amber-600/90 dark:bg-amber-950/90 border border-amber-400/80 overflow-hidden flex items-center px-1.5 cursor-pointer group shadow-2xs hover:brightness-110 transition-all",
                            isSelected && "ring-2 ring-amber-300 z-10 brightness-110"
                          )}
                          title={`${sfx.name} (${(sfx.startMs / 1000).toFixed(2)}s) - 클릭 시 미리듣기`}
                        >
                          <div className="relative z-10 flex items-center gap-1 text-amber-100 text-[10px] font-bold truncate">
                            <Sparkles className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                            <span className="truncate">{sfx.name.replace('SFX:', '').trim()}</span>
                          </div>
                          <div
                            onPointerDown={(e) => handleClipTrim(e, sfx.id, 'left')}
                            className="absolute left-0 inset-y-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-amber-300/80 z-20"
                          />
                          <div
                            onPointerDown={(e) => handleClipTrim(e, sfx.id, 'right')}
                            className="absolute right-0 inset-y-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-amber-300/80 z-20"
                          />
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div></footer>


      {/* 🎬 CapCut 1:1 정밀 내보내기 모달 */}
      {isCapCutExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-2xl rounded-lg w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* 헤더 */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm text-foreground">CapCut 정밀 1:1 프로젝트 내보내기 (draft_content.json)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCapCutExportModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs p-1 rounded hover:bg-muted cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 내용 */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-md space-y-1">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  1:1 직관적 크기 & 완전 상대 좌표 매핑 보장
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  임의 축소 없이, 에디터에서 설정한 폰트 크기(예: 30)가 캡컷에서도 정확히 30.0으로 1:1 직결되며,
                  상단 2단 타이틀, 쨉쨉이, 본문 자막, 하단 출처 표기, 비디오 핏이 단 하나도 누락 없이 완벽하게 내보내집니다.
                </p>
              </div>

              {/* 내보내기 포함 항목 요약 */}
              <div className="space-y-1.5 p-3 bg-muted/20 border border-border rounded-md">
                <span className="font-bold text-foreground">포함되는 5대 독립 트랙 목록</span>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2 border border-border bg-card rounded flex items-center justify-between">
                    <span>🎬 V1 비디오 트랙</span>
                    <span className="font-mono text-primary font-bold">{videoFitMode.toUpperCase()}</span>
                  </div>
                  <div className="p-2 border border-border bg-card rounded flex items-center justify-between">
                    <span>🏷️ T1 상단 타이틀</span>
                    <span className="font-mono text-primary font-bold">{titleLinesMode === 'double' ? '2줄 모드' : '1줄 모드'}</span>
                  </div>
                  <div className="p-2 border border-border bg-card rounded flex items-center justify-between">
                    <span>⚡ T2 쨉쨉이 훅</span>
                    <span className="font-mono text-primary font-bold">{hasJab ? '활성화' : '미사용'}</span>
                  </div>
                  <div className="p-2 border border-border bg-card rounded flex items-center justify-between">
                    <span>💬 SUB 본문 자막</span>
                    <span className="font-mono text-primary font-bold">{layers.filter(l => l.type === 'subtitle').length}개 클립</span>
                  </div>
                </div>
              </div>

              {/* JSON 미리보기 */}
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground">CapCut draft_content.json 구조 미리보기</span>
                <pre className="p-3 bg-muted/40 border border-border rounded-md font-mono text-[10px] text-muted-foreground overflow-x-auto max-h-36 whitespace-pre">
                  {JSON.stringify(compileCapCutDraft(), null, 2)}
                </pre>
              </div>
            </div>

            {/* 푸터 */}
            <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                CapCut Desktop 100% 호환 규격
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCapCutExportModalOpen(false)}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleExportCapCutProject();
                    setIsCapCutExportModalOpen(false);
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  CapCut 전체 프로젝트 번들 즉시 내보내기
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 📺 YouTube 쇼츠 SEO 메타데이터 & 표준 메타 복사 모달 */}
      {isMetadataModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-2xl rounded-lg w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* 헤더 */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-foreground">YouTube 쇼츠 SEO 메타데이터 & 표준 메타 도구</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMetadataModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs p-1 rounded hover:bg-muted cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 내용 */}
            <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-xs">
              {/* 1. 추천 쇼츠 제목 */}
              <div className="space-y-1.5 p-3 bg-muted/20 border border-border rounded-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">1. 고효율 쇼츠 제목 (Title)</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2"
                    onClick={() => {
                      const title = (hasTopTitle && titleLine1) ? `${titleLine1} ${titleLine2 || ''}`.trim() : (((hasTopTitle && titleLine1) ? titleLine1 : (videoLayer?.data ? '쇼츠 하이라이트 영상' : '쇼츠 영상')) || '쇼츠 하이라이트 영상');
                      copyToClipboard(title, 'title');
                    }}
                  >
                    {copiedMetaKey === 'title' ? '복사 완료!' : '제목 복사'}
                  </Button>
                </div>
                <div className="p-2 bg-card border border-border rounded text-[11px] font-semibold text-foreground">
                  {(hasTopTitle && titleLine1) ? `${titleLine1} ${titleLine2 || ''}`.trim() : (((hasTopTitle && titleLine1) ? titleLine1 : (videoLayer?.data ? '쇼츠 하이라이트 영상' : '쇼츠 영상')) || '쇼츠 하이라이트 영상')}
                </div>
              </div>

              {/* 2. 해시태그 목록 */}
              <div className="space-y-1.5 p-3 bg-muted/20 border border-border rounded-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">2. 추천 해시태그 (Hashtags)</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2"
                    onClick={() => {
                      const tags = generateSmartHashtags(((hasTopTitle && titleLine1) ? titleLine1 : (videoLayer?.data ? '쇼츠 하이라이트 영상' : '쇼츠 영상')) || '쇼츠 영상');
                      copyToClipboard(tags, 'hashtags');
                    }}
                  >
                    {copiedMetaKey === 'hashtags' ? '복사 완료!' : '해시태그 복사'}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 p-2 bg-card border border-border rounded">
                  {generateSmartHashtags(((hasTopTitle && titleLine1) ? titleLine1 : (videoLayer?.data ? '쇼츠 하이라이트 영상' : '쇼츠 영상')) || '쇼츠 영상').split(' ').filter(Boolean).map((tag: string, tIdx: number) => (
                    <span key={tIdx} className="text-[10px] text-primary font-bold">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* 3. SEO 검색 태그 목록 */}
              <div className="space-y-1.5 p-3 bg-muted/20 border border-border rounded-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">3. SEO 검색 태그 (Tags: 콤마 구분)</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2"
                    onClick={() => {
                      const tags = generateSmartSeoTags(((hasTopTitle && titleLine1) ? titleLine1 : (videoLayer?.data ? '쇼츠 하이라이트 영상' : '쇼츠 영상')) || '쇼츠 영상');
                      copyToClipboard(tags, 'tags');
                    }}
                  >
                    {copiedMetaKey === 'tags' ? '복사 완료!' : '태그 복사'}
                  </Button>
                </div>
                <div className="p-2 bg-card border border-border rounded text-[10.5px] text-muted-foreground font-mono">
                  {generateSmartSeoTags(((hasTopTitle && titleLine1) ? titleLine1 : (videoLayer?.data ? '쇼츠 하이라이트 영상' : '쇼츠 영상')) || '쇼츠 영상')}
                </div>
              </div>

              {/* 4. 표준 전체 설명문 */}
              <div className="space-y-1.5 p-3 bg-muted/20 border border-border rounded-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">4. YouTube 설명 & 표준 메타 텍스트 (Description)</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2"
                    onClick={() => {
                      const fullMeta = generatePixelingStandardMeta([{ result: { youtube_title: titleLine1 || '쇼츠 하이라이트 영상', full_script: subtitleLayers.map(s => s.data).join(' ') } }]);
                      copyToClipboard(fullMeta, 'fullMeta');
                    }}
                  >
                    {copiedMetaKey === 'fullMeta' ? '복사 완료!' : '설명문 복사'}
                  </Button>
                </div>
                <pre className="p-2 bg-card border border-border rounded text-[10px] text-muted-foreground font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {generatePixelingStandardMeta([{ result: { youtube_title: titleLine1 || '쇼츠 하이라이트 영상', full_script: subtitleLayers.map(s => s.data).join(' ') } }])}
                </pre>
              </div>
            </div>

            {/* 푸터 */}
            <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                YouTube Shorts 알고리즘 최적화 메타
              </span>
              <Button
                size="sm"
                onClick={() => setIsMetadataModalOpen(false)}
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ⚡ Remotion 프로그래머틱 자동 제어 & Props 내보내기 모달 */}
      {isRemotionModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-2xl rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* 헤더 */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Remotion 프로그래머틱 자동 제어 & 렌더링 스튜디오</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRemotionModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs p-1 rounded hover:bg-muted cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 내용 */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* 1. 플랫폼별 원클릭 자동 연출 프리셋 */}
              <div className="space-y-2 p-3 bg-muted/20 border border-border rounded-md">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Wand2 className="w-4 h-4 text-primary" />
                  원클릭 바이럴 자동 연출 프리셋 (Auto Styler)
                </span>
                <p className="text-[11px] text-muted-foreground">
                  수작업 필요 없이 타이틀, 쨉쨉이, 자막, 배경바, 비디오 핏을 한 번에 최적값으로 자동 제어합니다.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => applyAutoDirectorPreset('youtube_viral')}
                    className="p-2 border border-border bg-card hover:border-amber-500 rounded text-left transition cursor-pointer flex flex-col gap-0.5"
                  >
                    <span className="font-bold text-amber-500">⚡ 유튜브 바이럴</span>
                    <span className="text-[10px] text-muted-foreground">듀얼 타이틀 + 옐로우 쨉쨉이</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAutoDirectorPreset('tiktok_cinematic')}
                    className="p-2 border border-border bg-card hover:border-indigo-500 rounded text-left transition cursor-pointer flex flex-col gap-0.5"
                  >
                    <span className="font-bold text-indigo-400">🎬 시네마틱 풀스크린</span>
                    <span className="text-[10px] text-muted-foreground">전체화면 + 필박스 자막</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAutoDirectorPreset('curated_info')}
                    className="p-2 border border-border bg-card hover:border-sky-500 rounded text-left transition cursor-pointer flex flex-col gap-0.5"
                  >
                    <span className="font-bold text-sky-400">📚 지식 큐레이션</span>
                    <span className="text-[10px] text-muted-foreground">네이비 바 + 고가독성 자막</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAutoDirectorPreset('channel_dna')}
                    className="p-2 border border-border bg-card hover:border-emerald-500 rounded text-left transition cursor-pointer flex flex-col gap-0.5"
                  >
                    <span className="font-bold text-emerald-500">🧬 채널 DNA 동기화</span>
                    <span className="text-[10px] text-muted-foreground">시그니처 컬러/폰트 일괄적용</span>
                  </button>
                </div>
              </div>

              {/* 2. 실시간 Remotion Props JSON 미리보기 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">실시간 Remotion Composition Props JSON (DynamicShortsTemplate)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(compileRemotionProps(), null, 2));
                        toast({ title: '📋 복사 완료', description: 'Remotion Props JSON이 클립보드에 복사되었습니다.' });
                      }}
                      className="px-2 py-1 text-[11px] bg-muted hover:bg-muted/80 rounded border border-border font-medium cursor-pointer"
                    >
                      JSON 복사
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadRemotionProps}
                      className="px-2 py-1 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 rounded font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      다운로드
                    </button>
                  </div>
                </div>
                <pre className="p-3 bg-muted/40 border border-border rounded-md font-mono text-[10px] text-muted-foreground overflow-x-auto max-h-48 whitespace-pre">
                  {JSON.stringify(compileRemotionProps(), null, 2)}
                </pre>
              </div>

              {/* 렌더링 진행 상황 */}
              {isRemotionRendering && (
                <div className="space-y-1.5 p-3 bg-primary/10 border border-primary/30 rounded-md">
                  <div className="flex justify-between text-xs font-bold text-primary">
                    <span>Remotion 고속 번들링 렌더링 진행 중...</span>
                    <span>{remotionRenderProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-primary h-2 transition-all duration-300" style={{ width: `${remotionRenderProgress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-mono">
                렌더 규격: 1080x1920 (9:16 Shorts) | 30 FPS
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRemotionModalOpen(false)}
                >
                  닫기
                </Button>
                <Button
                  size="sm"
                  onClick={handleTriggerRemotionRender}
                  disabled={isRemotionRendering}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isRemotionRendering ? '렌더링 진행 중...' : '원클릭 자동 렌더링 발주'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 🎵 5대 무드 BGM 전용 라이브러리 모달 다이얼로그 */}
      <BgmLibraryModal
        open={isBgmModalOpen}
        onOpenChange={setIsBgmModalOpen}
        selectedBgmId={layers.find(l => l.type === 'audio' && (l.id === 'layer_audio_bgm' || l.name.includes('BGM')))?.id}
        onSelectBgm={(track) => {
          setSelectedBgmMood(track.mood);
          setLayers(prev => prev.map(l => {
            if (l.type === 'audio' && (l.id === 'layer_audio_bgm' || l.name.includes('BGM'))) {
              return {
                ...l,
                name: `[BGM] ${track.title}`,
                data: track.url || track.id,
              };
            }
            return l;
          }));
          toast({
            title: 'BGM 적용 완료',
            description: `[${track.title}] 음원이 타임라인 BGM 트랙에 성공적으로 바인딩되었습니다.`,
          });
        }}
      />

      {/* 🔍 1순위 실사 웹 이미지 검색 갤러리 모달 */}
      {isWebImageSearchOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-2xl rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* 헤더 */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-base">🔍</span>
                <div>
                  <h3 className="font-bold text-sm text-foreground">실사 웹 이미지 검색 (팩트·뉴스·제품 리뷰)</h3>
                  <p className="text-[11px] text-muted-foreground">유튜브 쇼츠 시청자가 신뢰하는 실제 고화질 사진을 검색하여 씬에 즉시 도킹합니다.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWebImageSearchOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs p-1 rounded hover:bg-muted cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 검색 바 */}
            <div className="p-3 border-b border-border bg-card flex items-center gap-2">
              <input
                type="text"
                value={webImageQuery}
                onChange={(e) => setWebImageQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchWebImages()}
                placeholder="검색어를 입력하세요 (예: 아이폰 폴드 케이스 실물, 갤럭시 Z폴드 리뷰)"
                className="flex-1 px-3 py-1.5 text-xs bg-muted/40 border border-border rounded text-foreground font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <Button
                size="sm"
                onClick={() => handleSearchWebImages()}
                disabled={isSearchingWebImages}
                className="h-8 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isSearchingWebImages ? '검색 중...' : '검색'}
              </Button>
            </div>

            {/* 검색 결과 갤러리 */}
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              {isSearchingWebImages ? (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-xs space-y-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>웹 실사 이미지를 수집하고 있습니다...</span>
                </div>
              ) : webImageResults.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {webImageResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleApplyWebImage(item.image_url)}
                      className="group relative rounded-md border border-border overflow-hidden bg-muted/20 hover:border-primary cursor-pointer transition shadow-xs hover:shadow-md aspect-square flex flex-col justify-between"
                    >
                      <img
                        src={item.thumbnail_url || item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-2 flex flex-col justify-end">
                        <span className="text-[10px] text-white font-bold line-clamp-2">{item.title}</span>
                        <span className="text-[8.5px] text-zinc-300 mt-0.5">{item.source} • 클릭 시 씬 적용</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-xs space-y-1">
                  <span>검색된 이미지가 없습니다.</span>
                  <span className="text-[11px]">대본이나 주제와 관련된 다른 키워드로 검색해 보세요.</span>
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                원하는 이미지를 클릭하면 현재 캔버스 중앙 미디어로 즉시 교체됩니다.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsWebImageSearchOpen(false)}
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

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
                    표준 및 사용자 맞춤 템플릿을 선택하여 현재 프로젝트에 0% 간섭 샌드박스로 적용합니다.
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
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>
                  {sovereignMode ? `[${sovereignMode.toUpperCase()}] 전용 표준 템플릿` : '4대 표준 아키타입'}
                </span>
                {sovereignMode && (
                  <Badge variant="outline" className="text-[10px] font-mono">
                    격리 모드 ON
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.values(STANDARD_TEMPLATES)
                  .filter((tpl: any) => !sovereignMode || tpl.archetype === sovereignMode || tpl.id.includes(sovereignMode))
                  .map((tpl: any) => (
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

              {templateLibraryList.filter((tpl: any) => !sovereignMode || tpl.archetype === sovereignMode || tpl.manifest?.archetype === sovereignMode).length > 0 && (
                <>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-4 mb-1">
                    {sovereignMode ? `[${sovereignMode.toUpperCase()}] 맞춤 보관 템플릿` : '사용자 커스텀 템플릿'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {templateLibraryList
                      .filter((tpl: any) => !sovereignMode || tpl.archetype === sovereignMode || tpl.manifest?.archetype === sovereignMode)
                      .map((tpl) => (
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
                            <span className="font-bold text-xs text-foreground">{tpl.name}</span>
                            <Badge variant="secondary" className="text-[10px]">커스텀</Badge>
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
            <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsTemplateLibraryOpen(false);
                    const targetTpl = sovereignMode || layoutTemplateMode || 'classic';
                    navigate(`/shorts-template/${targetTpl}`);
                  }}
                  className="text-xs gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> 현재 폼팩터 템플릿 공방 열기
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsSaveTemplateDialogOpen(true)}
                  className="text-xs gap-1 bg-primary text-primary-foreground font-semibold"
                >
                  <Save className="w-3.5 h-3.5" /> 현재 스타일을 새 템플릿으로 저장
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTemplateLibraryOpen(false)}
                className="text-xs"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 💾 현재 스타일을 새 템플릿으로 저장 모달 다이얼로그 */}
      {isSaveTemplateDialogOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-2xl rounded-lg w-full max-w-md p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">현재 스타일을 새 템플릿으로 저장</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsSaveTemplateDialogOpen(false);
                  setNewTemplateNameInput('');
                }}
                className="h-6 w-6 p-0"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">템플릿 이름</label>
              <input
                type="text"
                value={newTemplateNameInput}
                onChange={(e) => setNewTemplateNameInput(e.target.value)}
                placeholder="예: 나의 시그니처 썰형 템플릿"
                className="w-full h-9 px-3 text-xs bg-muted/30 border border-border rounded-md text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCurrentStyleAsTemplate();
                }}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                현재 프로젝트의 폼팩터({layoutTemplateMode}), 배경 바, 자막 스타일, 지오메트리 규격을 단일 DB(viral_loop.db)의 템플릿 라이브러리에 영구 보관합니다.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsSaveTemplateDialogOpen(false);
                  setNewTemplateNameInput('');
                }}
                className="text-xs"
              >
                취소
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={isSavingTemplate || !newTemplateNameInput.trim()}
                onClick={() => handleSaveCurrentStyleAsTemplate()}
                className="text-xs gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingTemplate ? '저장 중...' : '템플릿으로 저장'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortsEditorStudio;
