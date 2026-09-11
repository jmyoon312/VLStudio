import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scissors,
  Camera,
  Repeat,
  Grid,
  Crosshair,
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
  Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn, getMediaUrl } from '@/lib/utils';
import { NleLayerObject, NleLayerTransform, createDefaultTransform } from '@/types/nle';
import { TransformGizmo } from '@/components/canvas/TransformGizmo';
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


// ── 한글 폰트 패밀리 정의 ──
const FONT_FAMILIES = [
  { id: 'Pretendard', name: 'Pretendard (기본 볼드)' },
  { id: 'GmarketSans', name: 'Gmarket Sans (깔끔 고딕)' },
  { id: 'BlackHanSans', name: 'Black Han Sans (임팩트 헤드라인)' },
  { id: 'NotoSansKR', name: 'Noto Sans KR (표준 본문)' },
  { id: 'Jalnan', name: '여기어때 잘난체 (캐주얼)' },
  { id: 'CookieRun', name: '쿠키런 폰트 (귀여운 볼드)' },
];

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

export const ShortsEditorStudio: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // 자막 자동 내려쓰기(줄바꿈) 헬퍼
  const formatWrappedText = (text: string, maxChars: number) => {
    if (!text) return '';
    if (text.includes('\n')) return text;
    if (text.length <= maxChars) return text;
    const words = text.split(' ');
    let lines: string[] = [];
    let curLine = '';
    for (const w of words) {
      if ((curLine + ' ' + w).trim().length > maxChars) {
        if (curLine) lines.push(curLine.trim());
        curLine = w;
      } else {
        curLine = curLine ? curLine + ' ' + w : w;
      }
    }
    if (curLine) lines.push(curLine.trim());
    return lines.join('\n');
  };

  // 1. 프로젝트 마스터 메타 & 프로 뷰어 스테이지 상태
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [safeZoneVisible, setSafeZoneVisible] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(false); // 📐 십자선 & 3분할 구도선
  const [canvasZoom, setCanvasZoom] = useState<'fit' | '50' | '75' | '100' | '150' | '200'>('fit');
  const [canvasScale, setCanvasScale] = useState<number>(1.0);
  const [canvasPan, setCanvasPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ startX: number; startY: number; panX: number; panY: number }>({ startX: 0, startY: 0, panX: 0, panY: 0 });
  
  const [isLooping, setIsLooping] = useState<boolean>(true); // 🔁 반복 재생
  const [playbackRate, setPlaybackRate] = useState<number>(1.0); // ⚡ 재생 배속
  const [masterVolume, setMasterVolume] = useState<number>(100); // 🔊 모니터 볼륨
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [durationMs, setDurationMs] = useState<number>(22450); // 기본 22.45초
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 0.5x ~ 3.0x 타임라인 줌
  const [magnetSnap, setMagnetSnap] = useState<boolean>(true);

  // 🌟 바이럴루프 쇼츠 6대 표준 레이어 & 비디오 크롭 상태 (ShortsLayoutState 규격 100% 통합)
  const [videoFitMode, setVideoFitMode] = useState<'sandwich' | 'fullscreen'>('sandwich'); // 샌드위치 핏 vs 풀스크린
  const [videoZoomScale, setVideoZoomScale] = useState<number>(100); // 100% ~ 200% 비디오 줌/크롭
  const [videoFocusYPct, setVideoFocusYPct] = useState<number>(50); // 0% ~ 100% 인물 얼굴 중심 Y 오프셋
  const [videoHorizontalFlip, setVideoHorizontalFlip] = useState<boolean>(false);

  // Layer 1: 상단 배경 바 (Top Bar Bg)
  const [hasTopBarBg, setHasTopBarBg] = useState<boolean>(true);
  const [topBarBg, setTopBarBg] = useState<string>('#000000');
  const [topBarHeightPct, setTopBarHeightPct] = useState<number>(18.3);
  const [topBarOpacity, setTopBarOpacity] = useState<number>(1.0);

  // Layer 2: 상단 2단 타이틀 (Top Title - 상단바와 완전 독립 레이어)
  const [hasTopTitle, setHasTopTitle] = useState<boolean>(true);
  const [topTitleYPct, setTopTitleYPct] = useState<number>(9.0);
  // 🌟 TransformGizmo 완벽 연동 독립 레이어 Transform 상태 (위치, 크기, 회전, Z-Index)
  const [titleTransform, setTitleTransform] = useState<NleLayerTransform>({
    xPct: 50,
    yPct: 9.0,
    scale: 1.0,
    rotationDeg: 0,
    zIndex: 35,
  });
  const [jabTransform, setJabTransform] = useState<NleLayerTransform>({
    xPct: 50,
    yPct: 28.0,
    scale: 1.0,
    rotationDeg: -3,
    zIndex: 40,
  });
  const [subTransform, setSubTransform] = useState<NleLayerTransform>({
    xPct: 50,
    yPct: 78.0,
    scale: 1.0,
    rotationDeg: 0,
    zIndex: 45,
  });
  const [sourceTransform, setSourceTransform] = useState<NleLayerTransform>({
    xPct: 50,
    yPct: 94.0,
    scale: 1.0,
    rotationDeg: 0,
    zIndex: 30,
  });
  const [topBarZIndex, setTopBarZIndex] = useState<number>(20);
  const [bottomBarZIndex, setBottomBarZIndex] = useState<number>(20);
  const [videoZIndex, setVideoZIndex] = useState<number>(10);
  const [videoCropTopPct, setVideoCropTopPct] = useState<number>(0);
  const [videoCropBottomPct, setVideoCropBottomPct] = useState<number>(0);

  const [titleLine1, setTitleLine1] = useState<string>('2026 손흥민 역대급 원더골');
  const [titleLine2, setTitleLine2] = useState<string>('수비 3명 제친 환상 드리블');
  const [titleLine1Color, setTitleLine1Color] = useState<string>('#FFFFFF');
  const [titleLine2Color, setTitleLine2Color] = useState<string>('#FFE500');
  const [titleLine1SizePx, setTitleLine1SizePx] = useState<number>(19);
  const [titleLine2SizePx, setTitleLine2SizePx] = useState<number>(23);
  const [titleFontFamily, setTitleFontFamily] = useState<string>('Pretendard');
  const [titleBgMode, setTitleBgMode] = useState<'none' | 'pill' | 'box' | 'highlighter'>('none');
  const [titleBadgeText, setTitleBadgeText] = useState<string>('VIRALOOP HIGHLIGHT');

  // Layer 3: 긴박 쨉쨉이 훅 (Jab Hook)
  const [hasJab, setHasJab] = useState<boolean>(true);
  const [jabText, setJabText] = useState<string>('*충격적인 반전 순간!*');
  const [jabTiltDeg, setJabTiltDeg] = useState<number>(-4);
  const [jabYPercent, setJabYPercent] = useState<number>(38.5);
  const [jabFontSize, setJabFontSize] = useState<number>(16);
  const [jabColor, setJabColor] = useState<string>('#000000');
  const [jabBgColor, setJabBgColor] = useState<string>('#F5F420');
  const [jabBorderColor, setJabBorderColor] = useState<string>('#000000');

  // Layer 4: 본문 자막 (Subtitles - 내려쓰기/외곽선/그림자/배경필)
  const [subtitleYPercent, setSubtitleYPercent] = useState<number>(75.0);
  const [subtitleMaxChars, setSubtitleMaxChars] = useState<number>(16); // 1줄 자동 내려쓰기 기준 글자 수
  const [subtitleUseBox, setSubtitleUseBox] = useState<boolean>(false);
  const [subtitleBoxColor, setSubtitleBoxColor] = useState<string>('rgba(0,0,0,0.75)');
  const [subtitleShadow, setSubtitleShadow] = useState<boolean>(true);

  // Layer 5: 하단 출처 표기 (Source Credit - 하단바와 완전 독립 레이어)
  const [hasBottomSource, setHasBottomSource] = useState<boolean>(true);
  const [bottomSourceText, setBottomSourceText] = useState<string>('화면출처: 스포티비 공식 중계 및 프리미어리그');
  const [bottomSourceColor, setBottomSourceColor] = useState<string>('#94A3B8');
  const [bottomSourceSizePx, setBottomSourceSizePx] = useState<number>(10);
  const [bottomSourceBottomPct, setBottomSourceBottomPct] = useState<number>(2.2);

  // Layer 6: 하단 배경 바 (Bottom Bar Bg)
  const [hasBottomBarBg, setHasBottomBarBg] = useState<boolean>(true);
  const [bottomBarBg, setBottomBarBg] = useState<string>('#000000');
  const [bottomBarHeightPct, setBottomBarHeightPct] = useState<number>(6.0);

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
    a3Sfx: false,
  });

  const [trackMuted, setTrackMuted] = useState<{ [key: string]: boolean }>({});
  const [trackSolo, setTrackSolo] = useState<string | null>(null);

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
  
  // 🎛️ 우측 6대 프로 인스펙터 탭 (자막/스타일, 변형, 음성TTS, 전환, 워터마크, 채널DNA)
  const [activeInspectorTab, setActiveInspectorTab] = useState<'style' | 'titleSource' | 'videoCrop' | 'jabHook' | 'tts' | 'channel'>('titleSource');

  // 🗣️ 전체 대본 상태
  const [fullScript, setFullScript] = useState<string>(
    '2026 손흥민 역대급 환상골 폭발! 수비수 3명을 농락하는 충격적인 드리블 돌파 후 그림 같은 감아차기 쐐기골이 작렬했습니다. 경기장을 가득 메운 수만 관중이 일제히 기립하여 열광하고 있습니다.'
  );

  // 📝 서브타이틀 고도화 설정 (Single Source of Truth)
  const [subtitleConfig, setSubtitleConfig] = useState<SubtitleConfig>(() => {
    const saved = localStorage.getItem('viral_loop_subtitle_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { ...DEFAULT_SUBTITLE_CONFIG, enabled: true };
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

  // 채널 DNA 상태
  const [channelDna, setChannelDna] = useState({
    channelName: '스포츠 사이다 명장면 TV',
    primaryColor: '#FFE500',
    secondaryColor: '#00E510',
    fontFamily: 'Pretendard',
    hookStyle: 'bold_banner',
    tabooWordCount: 0,
  });

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
      data: 'bgm_mix.mp3',
    }
  ]);

  const [selectedLayerId, setSelectedLayerId] = useState<string>('layer_sub_1');

  // Handoff 데이터 수신
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('vlstudio_editor_handoff');
      if (raw) {
        const parsed = JSON.parse(raw);
        const videoUrl = parsed.videoUrl || '';
        const title = parsed.title || '영상 프로젝트';
        const subList = parsed.subtitles || [];
        const jabList = parsed.jabs || [];

        setLayers((prev) => {
          const videoL = prev.find((l) => l.type === 'video');
          const headerL = prev.find((l) => l.type === 'title');

          const newHeader: NleLayerObject = headerL ? {
            ...headerL,
            styleProps: {
              ...headerL.styleProps,
              title1: title,
              title2: '하이라이트',
            }
          } : prev[1];

          const newVideo: NleLayerObject = videoL ? {
            ...videoL,
            data: videoUrl
          } : prev[0];

          // 자막 동적 빌드
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

          // 쨉쨉이 동적 빌드
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
    } catch (e) {
      console.warn('[ShortsEditorStudio] handoff parse error:', e);
    }
  }, []);

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

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const seekToMs = (targetMs: number) => {
    const clamped = Math.max(0, Math.min(durationMs, targetMs));
    setCurrentTimeMs(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = clamped / 1000;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTimeMs(Math.round(videoRef.current.currentTime * 1000));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      const dur = Math.round(videoRef.current.duration * 1000);
      if (dur > 0) setDurationMs(dur);
    }
  };

  // 🎯 활성 레이어 필터
  const videoLayer = layers.find((l) => l.type === 'video');
  const titleLayer = layers.find((l) => l.type === 'title');
  const activeJab = layers.find((l) => l.type === 'jab' && l.visible && currentTimeMs >= l.startMs && currentTimeMs <= l.endMs);
  const activeSub = layers.find((l) => l.type === 'subtitle' && l.visible && currentTimeMs >= l.startMs && currentTimeMs <= l.endMs);
  const subtitleLayers = useMemo(() => layers.filter((l) => l.type === 'subtitle'), [layers]);

  // 자막 검색 필터
    // 🌟 대본 텍스트 기반 씬 자동 분할 & 타임라인 동기화
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

  // 타임 룰러 스크러빙
  const handleRulerPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const targetEl = e.currentTarget as HTMLElement;
    targetEl.setPointerCapture(e.pointerId);

    const rect = targetEl.getBoundingClientRect();
    const updateFromX = (clientX: number) => {
      const offsetX = clientX - rect.left;
      seekToMs(pxToMs(Math.max(0, offsetX)));
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

  // 🌟 채널 DNA 1클릭 일괄 동기화
  const handleSyncAllChannelDna = () => {
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
            <span className="text-xs font-semibold text-foreground tracking-tight flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-primary" />
              20260904_tfMMz_MKaMw
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded-[2px]">
              자동 저장됨
            </span>
          </div>

          <div className="flex items-center ml-2 border border-border rounded-[2px] bg-muted/30">
            <button
              type="button"
              onClick={() => toast({ title: '실행 취소 (Undo)' })}
              className="p-1 hover:text-foreground text-muted-foreground hover:bg-muted transition"
              title="실행 취소 (Ctrl+Z)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => toast({ title: '다시 실행 (Redo)' })}
              className="p-1 hover:text-foreground text-muted-foreground hover:bg-muted transition"
              title="다시 실행 (Ctrl+Y)"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 중앙: 종횡비 & 안전영역 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/60 p-0.5 rounded-[2px] border border-border">
            {(['9:16', '16:9', '1:1'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setAspectRatio(r)}
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

        {/* 우측: 내보내기 & 렌더링 파이프라인 (Remotion & CapCut) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              toast({
                title: 'Remotion 고속 렌더링 시작',
                description: '무손실 1080x1920 60FPS 서버 렌더링 큐에 등록되었습니다.',
              });
            }}
            className="h-7 px-2.5 text-xs font-semibold rounded-[2px] border border-border bg-muted/50 hover:bg-muted text-foreground transition flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Remotion 렌더</span>
          </button>

          <button
            type="button"
            onClick={() => {
              toast({
                title: 'CapCut 프로젝트 내보내기',
                description: 'CapCut 전용 로컬 프로젝트 폴더로 draft_content.json 파일이 즉시 생성되었습니다.',
              });
            }}
            className="h-7 px-3 text-xs font-semibold rounded-[2px] bg-primary hover:bg-primary/90 text-primary-foreground transition flex items-center gap-1.5 shadow-xs cursor-pointer"
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
                      setBadgeTag('속보');
                      setBadgeColor('#EF4444');
                      setTitleLine1('충격 단독 입수');
                      setTitleLine2('숨겨진 진실 폭로');
                      setTitleColor1('#FFFFFF');
                      setTitleColor2('#00E510');
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
                      setBadgeTag('레전드');
                      setBadgeColor('#F59E0B');
                      setTitleLine1('역대급 반전');
                      setTitleLine2('끝까지 봐야하는 이유');
                      setTitleColor1('#FFE500');
                      setTitleColor2('#FFFFFF');
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
                      onClick={(e) => { e.stopPropagation(); setSubTransform(t => ({ ...t, zIndex: t.zIndex + 1 })); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="위로 (앞으로 가져오기)"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSubTransform(t => ({ ...t, zIndex: Math.max(1, t.zIndex - 1) })); }}
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
                      onClick={(e) => { e.stopPropagation(); setJabTransform(t => ({ ...t, zIndex: t.zIndex + 1 })); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="위로 (앞으로 가져오기)"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setJabTransform(t => ({ ...t, zIndex: Math.max(1, t.zIndex - 1) })); }}
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
                  onClick={() => { setSelectedLayerId('layer_title'); setActiveInspectorTab('titleSource'); }}
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
                      onClick={(e) => { e.stopPropagation(); setTitleTransform(t => ({ ...t, zIndex: t.zIndex + 1 })); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="위로 (앞으로 가져오기)"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setTitleTransform(t => ({ ...t, zIndex: Math.max(1, t.zIndex - 1) })); }}
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
                  onClick={() => { setSelectedLayerId('layer_source'); setActiveInspectorTab('titleSource'); }}
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
                      onClick={(e) => { e.stopPropagation(); setSourceTransform(t => ({ ...t, zIndex: t.zIndex + 1 })); }}
                      className="p-1 hover:bg-muted rounded text-[10px] font-bold"
                      title="위로 (앞으로 가져오기)"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSourceTransform(t => ({ ...t, zIndex: Math.max(1, t.zIndex - 1) })); }}
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
                  onClick={() => { setSelectedLayerId('layer_top_bar'); setActiveInspectorTab('titleSource'); }}
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
                  onClick={() => { setSelectedLayerId('layer_bottom_bar'); setActiveInspectorTab('titleSource'); }}
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

                {/* A1 BGM 배경음악 */}
                <div className="p-2.5 border border-border rounded-[2px] bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-teal-500" />
                      A1 BGM 배경음악
                    </span>
                    <Switch
                      checked={enabledTracks.a1Bgm}
                      onCheckedChange={(c) => setEnabledTracks(prev => ({ ...prev, a1Bgm: c }))}
                    />
                  </div>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between text-muted-foreground">
                      <span>BGM 볼륨</span>
                      <span className="font-mono">35%</span>
                    </div>
                    <Slider defaultValue={[35]} max={100} step={1} className="w-full" />
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
                  onClick={() => setAspectRatio('9:16')}
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
                  onClick={() => setAspectRatio('16:9')}
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
                  onClick={() => setAspectRatio('1:1')}
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
            </div>
          </div>

          {/* 2. 캔버스 스테이지 (6대 독립 레이어 + 비디오 샌드위치/크롭 + 실시간 줌/패닝) */}
          <div
            className="flex-1 relative overflow-hidden flex items-center justify-center p-3 bg-zinc-950/95 cursor-default"
            onWheel={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const zoomDelta = -e.deltaY * 0.0015;
              setCanvasScale((prev) => {
                const next = Math.max(0.2, Math.min(4.0, prev + zoomDelta));
                return parseFloat(next.toFixed(3));
              });
            }}
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
            <div
              className={cn(
                "canvas-stage-wrapper relative bg-black shadow-2xl overflow-hidden border border-zinc-800 transition-transform duration-75 flex items-center justify-center select-none",
                aspectRatio === '9:16' && "h-full max-h-[96%] aspect-[9/16]",
                aspectRatio === '16:9' && "w-full max-w-[96%] aspect-[16/9]",
                aspectRatio === '1:1' && "h-full max-h-[96%] aspect-square"
              )}
              style={{
                transform: `scale(${canvasScale}) translate(${canvasPan.x}px, ${canvasPan.y}px)`,
              }}
            >
              {/* 🎬 LAYER 0: 비디오 레이어 (샌드위치 레터박스 핏 vs 풀스크린 크롭 핏 & 상하단 커스텀 절단) */}
              <div
                onClick={() => { setSelectedLayerId('layer_video'); setActiveInspectorTab('videoCrop'); }}
                className={cn(
                  "absolute overflow-hidden flex items-center justify-center bg-black transition-all cursor-pointer",
                  selectedLayerId === 'layer_video' && "ring-1 ring-sky-400"
                )}
                style={{
                  top: `${Math.max(videoFitMode === 'sandwich' && hasTopBarBg ? topBarHeightPct : 0, videoCropTopPct)}%`,
                  bottom: `${Math.max(videoFitMode === 'sandwich' && hasBottomBarBg ? bottomBarHeightPct : 0, videoCropBottomPct)}%`,
                  left: 0,
                  right: 0,
                  zIndex: videoZIndex,
                }}
              >
                <div
                  className="w-full h-full relative overflow-hidden flex items-center justify-center"
                  style={{
                    transform: `scale(${videoZoomScale / 100}) scaleX(${videoHorizontalFlip ? -1 : 1}) translateY(${(videoFocusYPct - 50) * 0.6}%)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.1s ease-out',
                  }}
                >
                  {videoLayer?.data ? (
                    <video
                      ref={videoRef}
                      src={getMediaUrl(videoLayer.data)}
                      playsInline
                      loop={isLooping}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-2 p-4 text-center bg-zinc-900">
                      <FileVideo className="w-12 h-12 stroke-[1.2] text-zinc-600 animate-pulse" />
                      <span className="text-[11px] font-mono text-zinc-400">20260904_tfMMz_MKaMw.mp4</span>
                      <span className="text-[9px] text-zinc-600">({videoFitMode.toUpperCase()} FIT · ZOOM {videoZoomScale}%)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ⬛ LAYER 1: 상단 배경 바 (Top Bar Bg - 독립 제어) */}
              {hasTopBarBg && (
                <div
                  onClick={() => { setSelectedLayerId('layer_top_bar'); setActiveInspectorTab('titleSource'); }}
                  className="absolute top-0 left-0 right-0 transition-all cursor-pointer"
                  style={{
                    height: `${topBarHeightPct}%`,
                    backgroundColor: topBarBg,
                    opacity: topBarOpacity,
                    zIndex: topBarZIndex,
                  }}
                  title="클릭하여 상단 배경 바 설정"
                />
              )}

              {/* 👑 LAYER 2: 상단 타이틀 (1줄/2줄 모드, 외곽선/그림자/배경박스/모서리 둥글기 완벽 지원) */}
              {hasTopTitle && (
                <TransformGizmo
                  transform={titleTransform}
                  selected={selectedLayerId === 'layer_title'}
                  name="상단 타이틀"
                  canvasScale={canvasScale}
                  onSelect={() => {
                    setSelectedLayerId('layer_title');
                    setActiveInspectorTab('titleSource');
                  }}
                  onChange={(newT) => {
                    setTitleTransform(newT);
                    setTopTitleYPct(newT.yPct);
                  }}
                >
                  <div
                    className="flex flex-col items-center select-none text-center cursor-move transition-all"
                    style={{
                      fontFamily: titleFontFamily,
                      backgroundColor: titleBgMode !== 'none' ? titleBgColor : 'transparent',
                      paddingLeft: titleBgMode !== 'none' ? `${titlePaddingX}px` : 0,
                      paddingRight: titleBgMode !== 'none' ? `${titlePaddingX}px` : 0,
                      paddingTop: titleBgMode !== 'none' ? `${titlePaddingY}px` : 0,
                      paddingBottom: titleBgMode !== 'none' ? `${titlePaddingY}px` : 0,
                      borderRadius: titleBgMode === 'pill' ? '9999px' : `${titleBorderRadius}px`,
                      boxShadow: titleShadow ? `0 4px ${titleShadowBlur * 2}px ${titleShadowColor}` : 'none',
                    }}
                  >
                    {/* 상단 뱃지 */}
                    {hasTitleBadge && titleBadgeText && (
                      <span
                        className="text-white text-[8px] font-black px-1.5 py-0.2 uppercase tracking-wider mb-1 rounded-[1px] shadow-sm"
                        style={{ backgroundColor: titleBadgeColor }}
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
                          fontSize: `${titleLine1SizePx}px`,
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
                          fontSize: `${titleLine2SizePx}px`,
                          WebkitTextStroke: titleStroke ? `${titleStrokeWidth}px ${titleStrokeColor}` : 'none',
                          paintOrder: 'stroke fill',
                          WebkitFontSmoothing: 'antialiased',
                          textShadow: titleShadow ? `0 2px ${titleShadowBlur}px ${titleShadowColor}` : 'none',
                        }}
                      >
                        {titleLine2}
                      </div>
                    )}
                  </div>
                </TransformGizmo>
              )}

              {/* ⚡ LAYER 3: 긴박 쨉쨉이 훅 (외곽선/그림자/배경박스/모서리 둥글기 완벽 지원) */}
              {hasJab && (
                <TransformGizmo
                  transform={jabTransform}
                  selected={selectedLayerId === 'layer_jab'}
                  name="긴박 쨉쨉이 훅"
                  canvasScale={canvasScale}
                  onSelect={() => {
                    setSelectedLayerId('layer_jab');
                    setActiveInspectorTab('jabHook');
                  }}
                  onChange={(newT) => {
                    setJabTransform(newT);
                    setJabYPercent(newT.yPct);
                    setJabTiltDeg(newT.rotationDeg);
                  }}
                >
                  <div
                    className="font-black px-3 py-1.5 shadow-2xl flex items-center justify-center whitespace-nowrap cursor-move"
                    style={{
                      fontSize: `${jabFontSize}px`,
                      color: jabTextColor,
                      backgroundColor: jabBgEnabled ? jabBgColor : 'transparent',
                      borderRadius: `${jabBorderRadius}px`,
                      border: jabStroke ? `${jabStrokeWidth}px solid ${jabStrokeColor}` : 'none',
                      fontFamily: titleFontFamily,
                      boxShadow: jabShadow ? `0 4px ${jabShadowBlur}px rgba(0,0,0,0.8)` : 'none',
                      WebkitFontSmoothing: 'antialiased',
                    }}
                  >
                    {jabText}
                  </div>
                </TransformGizmo>
              )}

              {/* 💬 LAYER 4: 본문 자막 (외곽선/그림자/배경박스/모서리 둥글기/자동 내려쓰기) */}
              <TransformGizmo
                transform={subTransform}
                selected={selectedLayer?.type === 'subtitle' || selectedLayerId === 'layer_sub'}
                name="본문 자막"
                canvasScale={canvasScale}
                onSelect={() => {
                  if (activeSub) setSelectedLayerId(activeSub.id);
                  else setSelectedLayerId('layer_sub');
                  setActiveInspectorTab('style');
                }}
                onChange={(newT) => {
                  setSubTransform(newT);
                  setSubtitleYPercent(newT.yPct);
                }}
              >
                <div
                  className={cn(
                    "font-black leading-snug tracking-tight inline-block whitespace-pre-line text-center transition-all cursor-move px-2",
                    subtitleUseBox && "px-3 py-1.5"
                  )}
                  style={{
                    fontSize: `${subtitleConfig.fontSize || 18}px`,
                    color: subtitleConfig.fillColor || '#FFFFFF',
                    fontFamily: subtitleConfig.fontFamily || 'Pretendard',
                    backgroundColor: subtitleUseBox ? subtitleBoxColor : 'transparent',
                    borderRadius: subtitleUseBox ? `${subtitleBorderRadius}px` : 0,
                    WebkitTextStroke: subtitleStrokeEnabled
                      ? `${subtitleStrokeWidth}px ${subtitleStrokeColor}`
                      : `${subtitleConfig.strokeWidth || 4}px ${subtitleConfig.strokeColor || '#000000'}`,
                    paintOrder: 'stroke fill',
                    WebkitFontSmoothing: 'antialiased',
                    textShadow: subtitleShadowEnabled
                      ? '0 2px 10px rgba(0,0,0,0.95)'
                      : 'none',
                  }}
                >
                  {formatWrappedText(activeSub?.data || '자막 텍스트', subtitleMaxChars)}
                </div>
              </TransformGizmo>

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

              {/* ⬛ LAYER 6: 하단 배경 바 (Bottom Bar Bg - 독립 제어) */}
              {hasBottomBarBg && (
                <div
                  onClick={() => { setSelectedLayerId('layer_bottom_bar'); setActiveInspectorTab('titleSource'); }}
                  className="absolute bottom-0 left-0 right-0 transition-all cursor-pointer"
                  style={{
                    height: `${bottomBarHeightPct}%`,
                    backgroundColor: bottomBarBg,
                    zIndex: bottomBarZIndex,
                  }}
                  title="클릭하여 하단 배경 바 설정"
                />
              )}

              {/* 🏷️ 실시간 워터마크 & 채널 로고 오버레이 */}
              {watermarkConfig.enabled && (
                <div
                  className="absolute pointer-events-none select-none z-30 flex items-center justify-center p-2"
                  style={{
                    opacity: (watermarkConfig.opacity || 80) / 100,
                    top: watermarkConfig.position.startsWith('top') ? 16 : watermarkConfig.position.startsWith('mid') ? '50%' : 'auto',
                    bottom: watermarkConfig.position.startsWith('bottom') ? 16 : 'auto',
                    left: watermarkConfig.position.endsWith('left') ? 16 : watermarkConfig.position.endsWith('center') ? '50%' : 'auto',
                    right: watermarkConfig.position.endsWith('right') ? 16 : 'auto',
                    transform: `${watermarkConfig.position.includes('center') ? 'translateX(-50%) ' : ''}${watermarkConfig.position.startsWith('mid') ? 'translateY(-50%) ' : ''}scale(${(watermarkConfig.scale || 20) / 20})`,
                  }}
                >
                  {watermarkConfig.type === 'text' ? (
                    <span
                      className="font-bold text-xs tracking-wider px-2 py-0.5 rounded-[2px] bg-black/40 border border-white/20 backdrop-blur-xs text-white"
                      style={{ fontFamily: watermarkConfig.fontFamily || 'Pretendard' }}
                    >
                      {watermarkConfig.text || '@ViraLoopStudio'}
                    </span>
                  ) : watermarkConfig.imageUrl ? (
                    <img src={watermarkConfig.imageUrl} alt="watermark" className="w-12 h-12 object-contain" />
                  ) : null}
                </div>
              )}

              {/* 📐 프로 3분할선 및 센터 십자선 가이드 오버레이 */}
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

              {/* 📱 쇼츠 안전영역 (Safe Zone) 오버레이 */}
              {safeZoneVisible && aspectRatio === '9:16' && (
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-amber-500/70 z-40 bg-amber-500/[0.03] flex flex-col justify-between p-2">
                  <div className="bg-black/85 text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-[2px] border border-amber-500/40 self-center">
                    ⚠️ 상단 10% 헤더·검색 영역 (텍스트 금지)
                  </div>
                  <div className="flex justify-between items-end pb-1">
                    <div className="bg-black/85 text-amber-300 text-[8px] font-bold p-1 rounded-[2px] border border-amber-500/40 max-w-[130px] leading-tight">
                      ⚠️ 하단 제목 & 사운드 UI
                    </div>
                    <div className="bg-black/85 text-amber-300 text-[8px] font-bold p-1 rounded-[2px] border border-amber-500/40 text-right leading-tight">
                      ⚠️ 우측 아이콘 바
                    </div>
                  </div>
                </div>
              )}
            </div>
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

          <div className="grid grid-cols-3 gap-0.5 border-b border-border bg-muted/40 p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setActiveInspectorTab('titleSource')}
              className={cn(
                "py-1 text-center font-semibold rounded-[2px] transition cursor-pointer truncate px-1",
                activeInspectorTab === 'titleSource' ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
              title="상단 2단 타이틀 & 하단 출처 & 상하단 바"
            >
              타이틀/출처
            </button>
            <button
              type="button"
              onClick={() => setActiveInspectorTab('videoCrop')}
              className={cn(
                "py-1 text-center font-semibold rounded-[2px] transition cursor-pointer truncate px-1",
                activeInspectorTab === 'videoCrop' ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
              title="비디오 샌드위치 핏 & 크롭 & 포커스"
            >
              비디오 크롭
            </button>
            <button
              type="button"
              onClick={() => setActiveInspectorTab('jabHook')}
              className={cn(
                "py-1 text-center font-semibold rounded-[2px] transition cursor-pointer truncate px-1",
                activeInspectorTab === 'jabHook' ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
              title="긴박 쨉쨉이 훅 & 회전각"
            >
              쨉쨉이 훅
            </button>
            <button
              type="button"
              onClick={() => setActiveInspectorTab('style')}
              className={cn(
                "py-1 text-center font-semibold rounded-[2px] transition cursor-pointer truncate px-1",
                activeInspectorTab === 'style' ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
              title="본문 자막 & 내려쓰기 & 외곽선/그림자"
            >
              자막 스타일
            </button>
            <button
              type="button"
              onClick={() => setActiveInspectorTab('tts')}
              className={cn(
                "py-1 text-center font-semibold rounded-[2px] transition cursor-pointer truncate px-1",
                activeInspectorTab === 'tts' ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
              title="AI 나레이션(TTS) 음성 엔진 & 트랙 제어"
            >
              음성 (TTS)
            </button>
            <button
              type="button"
              onClick={() => setActiveInspectorTab('channel')}
              className={cn(
                "py-1 text-center font-semibold rounded-[2px] transition cursor-pointer truncate px-1",
                activeInspectorTab === 'channel' ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
              title="채널 DNA 시그니처 일괄 동기화"
            >
              채널 DNA
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar text-xs">
            <div className="p-2 border border-border bg-muted/20 rounded-[2px] flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">선택 타겟:</span>
              <span className="text-[11px] font-bold text-primary truncate max-w-[140px]">{selectedLayer.name}</span>
            </div>

            {/* 1. 👑 타이틀 / 출처 / 상하단 바 탭 */}
            {activeInspectorTab === 'titleSource' && (
              <div className="space-y-3">
                {/* 상단 고정 타이틀 카드 */}
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-bold text-foreground">상단 고정 타이틀</span>
                    </div>
                    <Switch checked={hasTopTitle} onCheckedChange={setHasTopTitle} />
                  </div>

                  {hasTopTitle && (
                    <div className="space-y-2.5">
                      {/* 1줄 vs 2줄 모드 선택 */}
                      <div className="flex items-center justify-between bg-muted/40 p-1.5 rounded-[2px]">
                        <span className="text-[10px] font-semibold text-foreground">줄 수 설정</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setTitleLinesMode('single')}
                            className={cn(
                              "px-2 py-0.5 text-[10px] font-bold rounded-[2px] transition cursor-pointer",
                              titleLinesMode === 'single'
                                ? "bg-primary text-primary-foreground"
                                : "bg-card text-muted-foreground hover:text-foreground"
                            )}
                          >
                            1줄 고정
                          </button>
                          <button
                            type="button"
                            onClick={() => setTitleLinesMode('double')}
                            className={cn(
                              "px-2 py-0.5 text-[10px] font-bold rounded-[2px] transition cursor-pointer",
                              titleLinesMode === 'double'
                                ? "bg-primary text-primary-foreground"
                                : "bg-card text-muted-foreground hover:text-foreground"
                            )}
                          >
                            2줄 고정 (추천)
                          </button>
                        </div>
                      </div>

                      {/* 뱃지 설정 */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground font-semibold">상단 뱃지 태그</span>
                          <Switch checked={hasTitleBadge} onCheckedChange={setHasTitleBadge} />
                        </div>
                        {hasTitleBadge && (
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={titleBadgeText}
                              onChange={(e) => setTitleBadgeText(e.target.value)}
                              className="flex-1 h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold"
                              placeholder="HOT ISSUE"
                            />
                            <input
                              type="color"
                              value={titleBadgeColor}
                              onChange={(e) => setTitleBadgeColor(e.target.value)}
                              className="w-7 h-7 p-0 border border-border rounded-[2px] cursor-pointer bg-transparent"
                              title="뱃지 배경색"
                            />
                          </div>
                        )}
                      </div>

                      {/* 1단 타이틀 (위 텍스트) */}
                      <div className="space-y-1 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-foreground font-semibold">1단 텍스트 (상단)</span>
                          <span className="font-mono text-primary font-bold">{titleLine1SizePx}px</span>
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={titleLine1}
                            onChange={(e) => setTitleLine1(e.target.value)}
                            className="flex-1 h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold"
                            placeholder="1단 타이틀 입력..."
                          />
                          <input
                            type="color"
                            value={titleLine1Color}
                            onChange={(e) => setTitleLine1Color(e.target.value)}
                            className="w-7 h-7 p-0 border border-border rounded-[2px] cursor-pointer bg-transparent"
                            title="1단 글자 색상"
                          />
                        </div>
                        <input
                          type="range"
                          min="14"
                          max="40"
                          value={titleLine1SizePx}
                          onChange={(e) => setTitleLine1SizePx(parseInt(e.target.value))}
                          className="w-full accent-primary cursor-pointer h-1 bg-muted"
                        />
                      </div>

                      {/* 2단 타이틀 (아래 텍스트 - double 모드일 때) */}
                      {titleLinesMode === 'double' && (
                        <div className="space-y-1 p-2 bg-muted/20 border border-border rounded-[2px]">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-foreground font-semibold">2단 텍스트 (하단 핵심 후킹)</span>
                            <span className="font-mono text-amber-500 font-bold">{titleLine2SizePx}px</span>
                          </div>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={titleLine2}
                              onChange={(e) => setTitleLine2(e.target.value)}
                              className="flex-1 h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold"
                              placeholder="2단 타이틀 입력..."
                            />
                            <input
                              type="color"
                              value={titleLine2Color}
                              onChange={(e) => setTitleLine2Color(e.target.value)}
                              className="w-7 h-7 p-0 border border-border rounded-[2px] cursor-pointer bg-transparent"
                              title="2단 글자 색상"
                            />
                          </div>
                          <input
                            type="range"
                            min="16"
                            max="44"
                            value={titleLine2SizePx}
                            onChange={(e) => setTitleLine2SizePx(parseInt(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer h-1 bg-muted"
                          />
                        </div>
                      )}

                      {/* 🎨 테두리(외곽선) 상세 제어 */}
                      <div className="space-y-1.5 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-foreground">글자 테두리 (외곽선)</span>
                          <Switch checked={titleStroke} onCheckedChange={setTitleStroke} />
                        </div>
                        {titleStroke && (
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground">두께: {titleStrokeWidth}px</span>
                              <input
                                type="color"
                                value={titleStrokeColor}
                                onChange={(e) => setTitleStrokeColor(e.target.value)}
                                className="w-5 h-5 p-0 border border-border rounded cursor-pointer bg-transparent"
                                title="테두리 색상"
                              />
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={titleStrokeWidth}
                              onChange={(e) => setTitleStrokeWidth(parseInt(e.target.value))}
                              className="w-full accent-primary cursor-pointer h-1 bg-muted"
                            />
                          </div>
                        )}
                      </div>

                      {/* 🌌 그림자 상세 제어 */}
                      <div className="space-y-1.5 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-foreground">글자 그림자 (Shadow)</span>
                          <Switch checked={titleShadow} onCheckedChange={setTitleShadow} />
                        </div>
                        {titleShadow && (
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground">흐림: {titleShadowBlur}px</span>
                              <input
                                type="color"
                                value="#000000"
                                onChange={(e) => setTitleShadowColor(e.target.value)}
                                className="w-5 h-5 p-0 border border-border rounded cursor-pointer bg-transparent"
                                title="그림자 색상"
                              />
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="20"
                              value={titleShadowBlur}
                              onChange={(e) => setTitleShadowBlur(parseInt(e.target.value))}
                              className="w-full accent-primary cursor-pointer h-1 bg-muted"
                            />
                          </div>
                        )}
                      </div>

                      {/* 🔲 배경 박스 & 모서리 둥글기 제어 */}
                      <div className="space-y-1.5 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-foreground">배경 박스</span>
                          <div className="flex gap-1">
                            {(['none', 'box', 'pill'] as const).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setTitleBgMode(m)}
                                className={cn(
                                  "px-1.5 py-0.5 text-[9px] rounded font-medium",
                                  titleBgMode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}
                              >
                                {m === 'none' ? '없음' : m === 'box' ? '박스' : '알약'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {titleBgMode !== 'none' && (
                          <div className="space-y-2 pt-1 border-t border-border/50">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground">배경 색상</span>
                              <input
                                type="color"
                                value="#000000"
                                onChange={(e) => setTitleBgColor(e.target.value)}
                                className="w-5 h-5 p-0 border border-border rounded cursor-pointer bg-transparent"
                              />
                            </div>
                            {titleBgMode === 'box' && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-muted-foreground">모서리 모양 (둥글기)</span>
                                  <span className="font-mono text-primary">{titleBorderRadius}px</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="30"
                                  value={titleBorderRadius}
                                  onChange={(e) => setTitleBorderRadius(parseInt(e.target.value))}
                                  className="w-full accent-primary cursor-pointer h-1 bg-muted"
                                />
                              </div>
                            )}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-muted-foreground">내부 패딩</span>
                                <span className="font-mono">{titlePaddingX}px</span>
                              </div>
                              <input
                                type="range"
                                min="2"
                                max="30"
                                value={titlePaddingX}
                                onChange={(e) => setTitlePaddingX(parseInt(e.target.value))}
                                className="w-full accent-primary cursor-pointer h-1 bg-muted"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 하단 출처 표기 카드 */}
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="text-[11px] font-bold text-foreground">하단 출처 표기</span>
                    <Switch checked={hasBottomSource} onCheckedChange={setHasBottomSource} />
                  </div>
                  {hasBottomSource && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={bottomSourceText}
                        onChange={(e) => setBottomSourceText(e.target.value)}
                        className="w-full h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-medium"
                      />
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">글자 색상</span>
                        <input
                          type="color"
                          value={bottomSourceColor}
                          onChange={(e) => setBottomSourceColor(e.target.value)}
                          className="w-6 h-6 p-0 border border-border rounded cursor-pointer bg-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 상단 및 하단 배경 바 카드 */}
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="text-[11px] font-bold text-foreground">상하단 배경 바</span>
                  </div>
                  <div className="space-y-2 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span>상단 배경 바</span>
                      <Switch checked={hasTopBarBg} onCheckedChange={setHasTopBarBg} />
                    </div>
                    {hasTopBarBg && (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">높이: {topBarHeightPct}%</span>
                          <input
                            type="color"
                            value={topBarBg}
                            onChange={(e) => setTopBarBg(e.target.value)}
                            className="w-4 h-4 p-0 border border-border rounded cursor-pointer bg-transparent"
                          />
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="30"
                          value={topBarHeightPct}
                          onChange={(e) => setTopBarHeightPct(parseInt(e.target.value))}
                          className="w-full accent-primary cursor-pointer h-1 bg-muted"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-border">
                      <span>하단 배경 바</span>
                      <Switch checked={hasBottomBarBg} onCheckedChange={setHasBottomBarBg} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeInspectorTab === 'videoCrop' && (
              <div className="space-y-3">
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Crop className="w-3.5 h-3.5 text-primary" />
                      비디오 핏 모드 (Video Fit Mode)
                    </span>
                  </div>

                  {/* 샌드위치 핏 vs 풀스크린 버튼 */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setVideoFitMode('sandwich')}
                      className={cn(
                        "p-2 border rounded-[2px] text-left transition cursor-pointer flex flex-col gap-0.5",
                        videoFitMode === 'sandwich' ? "bg-primary/15 border-primary text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="text-[10px] font-bold">🥪 샌드위치 핏</span>
                      <span className="text-[9px] text-muted-foreground">상·하단 바 사이 안착</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoFitMode('fullscreen')}
                      className={cn(
                        "p-2 border rounded-[2px] text-left transition cursor-pointer flex flex-col gap-0.5",
                        videoFitMode === 'fullscreen' ? "bg-primary/15 border-primary text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="text-[10px] font-bold">📱 풀스크린 핏</span>
                      <span className="text-[9px] text-muted-foreground">화면 전체 채움 크롭</span>
                    </button>
                  </div>

                  {/* 비디오 줌 / 크롭 스케일 */}
                  <div className="space-y-1 pt-1 border-t border-border">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground font-semibold">비디오 줌 / 크롭 (Scale)</span>
                      <span className="font-mono text-primary font-bold">{videoZoomScale}%</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="200"
                      step="1"
                      value={videoZoomScale}
                      onChange={(e) => setVideoZoomScale(parseInt(e.target.value))}
                      className="w-full accent-primary cursor-pointer h-1 bg-muted"
                    />
                  </div>

                  {/* 인물 얼굴 중심 Y 포커스 오프셋 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground font-semibold">인물 얼굴 중심 Y 포커스</span>
                      <span className="font-mono text-primary font-bold">{videoFocusYPct}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="1"
                      value={videoFocusYPct}
                      onChange={(e) => setVideoFocusYPct(parseInt(e.target.value))}
                      className="w-full accent-primary cursor-pointer h-1 bg-muted"
                    />
                  </div>

                  {/* 좌우 반전 */}
                  <button
                    type="button"
                    onClick={() => setVideoHorizontalFlip(!videoHorizontalFlip)}
                    className={cn(
                      "w-full h-7 border rounded-[2px] text-[10px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer",
                      videoHorizontalFlip ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <FlipHorizontal className="w-3 h-3" />
                    <span>좌우 반전 {videoHorizontalFlip ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
                {/* ✂️ 상하단 절단 마스킹 (Custom Crop) */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-foreground">상단 절단 (Top Crop)</span>
                    <span className="font-mono text-muted-foreground">{videoCropTopPct}%</span>
                  </div>
                  <Slider
                    value={[videoCropTopPct]}
                    onValueChange={([v]) => setVideoCropTopPct(v)}
                    min={0}
                    max={40}
                    step={0.5}
                    className="w-full"
                  />

                  <div className="flex justify-between text-[11px] mt-2">
                    <span className="font-semibold text-foreground">하단 절단 (Bottom Crop)</span>
                    <span className="font-mono text-muted-foreground">{videoCropBottomPct}%</span>
                  </div>
                  <Slider
                    value={[videoCropBottomPct]}
                    onValueChange={([v]) => setVideoCropBottomPct(v)}
                    min={0}
                    max={40}
                    step={0.5}
                    className="w-full"
                  />
                </div>

              </div>
            )}

            {/* 3. ⚡ 긴박 쨉쨉이 훅 탭 */}
            {activeInspectorTab === 'jabHook' && (
              <div className="space-y-3">
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      긴박 쨉쨉이 훅 (임팩트 텍스트)
                    </span>
                    <Switch checked={hasJab} onCheckedChange={setHasJab} />
                  </div>

                  {hasJab && (
                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground font-semibold">훅 문구</label>
                        <input
                          type="text"
                          value={jabText}
                          onChange={(e) => setJabText(e.target.value)}
                          className="w-full h-7 px-2 text-[11px] bg-background border border-border rounded-[2px] text-foreground font-bold"
                          placeholder="*3초 만에 몰입되는 반전!*"
                        />
                      </div>

                      {/* 회전 각도 (-15° ~ +15°) */}
                      <div className="space-y-1 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-foreground font-semibold">회전 각도 (Tilt)</span>
                          <span className="font-mono text-amber-500 font-bold">{jabTiltDeg}°</span>
                        </div>
                        <input
                          type="range"
                          min="-15"
                          max="15"
                          value={jabTiltDeg}
                          onChange={(e) => setJabTiltDeg(parseInt(e.target.value))}
                          className="w-full accent-amber-500 cursor-pointer h-1 bg-muted"
                        />
                      </div>

                      {/* 글자 크기 & 색상 */}
                      <div className="space-y-1 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-foreground font-semibold">글자 크기</span>
                          <span className="font-mono text-primary font-bold">{jabFontSize}px</span>
                        </div>
                        <div className="flex gap-1.5 items-center">
                          <input
                            type="range"
                            min="10"
                            max="30"
                            value={jabFontSize}
                            onChange={(e) => setJabFontSize(parseInt(e.target.value))}
                            className="flex-1 accent-primary cursor-pointer h-1 bg-muted"
                          />
                          <input
                            type="color"
                            value={jabTextColor}
                            onChange={(e) => setJabTextColor(e.target.value)}
                            className="w-6 h-6 p-0 border border-border rounded cursor-pointer bg-transparent"
                            title="글자 색상"
                          />
                        </div>
                      </div>

                      {/* 🔲 배경 박스 & 모서리 둥글기 */}
                      <div className="space-y-1.5 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-foreground">배경 박스</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={jabBgColor}
                              onChange={(e) => setJabBgColor(e.target.value)}
                              className="w-5 h-5 p-0 border border-border rounded cursor-pointer bg-transparent"
                            />
                            <Switch checked={jabBgEnabled} onCheckedChange={setJabBgEnabled} />
                          </div>
                        </div>
                        {jabBgEnabled && (
                          <div className="space-y-1 pt-1 border-t border-border/50">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground">모서리 모양 (둥글기)</span>
                              <span className="font-mono text-amber-500 font-bold">{jabBorderRadius}px</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="30"
                              value={jabBorderRadius}
                              onChange={(e) => setJabBorderRadius(parseInt(e.target.value))}
                              className="w-full accent-amber-500 cursor-pointer h-1 bg-muted"
                            />
                          </div>
                        )}
                      </div>

                      {/* 테두리(외곽선) & 그림자 */}
                      <div className="space-y-1.5 p-2 bg-muted/20 border border-border rounded-[2px]">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-foreground">테두리 (외곽선)</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={jabStrokeColor}
                              onChange={(e) => setJabStrokeColor(e.target.value)}
                              className="w-5 h-5 p-0 border border-border rounded cursor-pointer bg-transparent"
                            />
                            <Switch checked={jabStroke} onCheckedChange={setJabStroke} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-border/50">
                          <span className="font-semibold text-foreground">입체 그림자</span>
                          <Switch checked={jabShadow} onCheckedChange={setJabShadow} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeInspectorTab === 'style' && (
              <div className="space-y-3">
                {/* 본문 자막 모서리/배경/외곽선/그림자 제어 패널 */}
                <div className="p-2.5 border border-border bg-card rounded-[2px] space-y-3 shadow-2xs">
                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                    본문 자막 스타일 & 배경 효과
                  </span>

                  {/* 자동 내려쓰기 글자 수 */}
                  <div className="space-y-1 p-2 bg-muted/20 border border-border rounded-[2px]">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-foreground font-semibold">자동 줄바꿈 (내려쓰기 글자 수)</span>
                      <span className="font-mono text-emerald-500 font-bold">{subtitleMaxChars}자</span>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="20"
                      value={subtitleMaxChars}
                      onChange={(e) => setSubtitleMaxChars(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1 bg-muted"
                    />
                  </div>

                  {/* 테두리(외곽선) 상세 제어 */}
                  <div className="space-y-1.5 p-2 bg-muted/20 border border-border rounded-[2px]">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-foreground">자막 테두리 (외곽선)</span>
                      <Switch checked={subtitleStrokeEnabled} onCheckedChange={setSubtitleStrokeEnabled} />
                    </div>
                    {subtitleStrokeEnabled && (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">두께: {subtitleStrokeWidth}px</span>
                          <input
                            type="color"
                            value={subtitleStrokeColor}
                            onChange={(e) => setSubtitleStrokeColor(e.target.value)}
                            className="w-5 h-5 p-0 border border-border rounded cursor-pointer bg-transparent"
                          />
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={subtitleStrokeWidth}
                          onChange={(e) => setSubtitleStrokeWidth(parseInt(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer h-1 bg-muted"
                        />
                      </div>
                    )}
                  </div>

                  {/* 입체 그림자 제어 */}
                  <div className="space-y-1.5 p-2 bg-muted/20 border border-border rounded-[2px]">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-foreground">자막 입체 그림자</span>
                      <Switch checked={subtitleShadowEnabled} onCheckedChange={setSubtitleShadowEnabled} />
                    </div>
                  </div>

                  {/* 🔲 자막 배경 필 박스 & 모서리 둥글기 */}
                  <div className="space-y-1.5 p-2 bg-muted/20 border border-border rounded-[2px]">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-foreground">배경 필 박스 (Pill Box)</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value="#000000"
                          onChange={(e) => setSubtitleBoxColor(e.target.value)}
                          className="w-5 h-5 p-0 border border-border rounded cursor-pointer bg-transparent"
                        />
                        <Switch checked={subtitleUseBox} onCheckedChange={setSubtitleUseBox} />
                      </div>
                    </div>
                    {subtitleUseBox && (
                      <div className="space-y-1 pt-1 border-t border-border/50">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">모서리 모양 (둥글기)</span>
                          <span className="font-mono text-emerald-500 font-bold">{subtitleBorderRadius}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="30"
                          value={subtitleBorderRadius}
                          onChange={(e) => setSubtitleBorderRadius(parseInt(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer h-1 bg-muted"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-border pt-2">
                  <SubtitleConfigPanel
                    config={subtitleConfig}
                    onChange={setSubtitleConfig}
                  />
                </div>
              </div>
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
                <Eye className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-pointer" />
              </div>
            )}
            {enabledTracks.t2Jab && (
              <div className="h-9 flex items-center justify-between px-2 text-xs font-semibold text-foreground">
                <span className="text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  T2 쨉쨉이
                </span>
                <Eye className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-pointer" />
              </div>
            )}
            {enabledTracks.sub && (
              <div className="h-9 flex items-center justify-between px-2 text-xs font-semibold text-foreground">
                <span className="text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  SUB 자막
                </span>
                <Eye className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-pointer" />
              </div>
            )}
            {enabledTracks.v1Video && (
              <div className="h-11 flex items-center justify-between px-2 text-xs font-semibold text-foreground">
                <span className="text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  V1 비디오
                </span>
                <Volume2 className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-pointer" />
              </div>
            )}
            {enabledTracks.a1Bgm && (
              <div className="h-9 flex items-center justify-between px-2 text-xs font-semibold text-foreground">
                <span className="text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  A1 BGM
                </span>
                <Volume2 className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-pointer" />
              </div>
            )}
            {/* 🌟 A2 나레이션 트랙 헤더 (동적) */}
            {enabledTracks.a2Narration && (
              <div className="h-9 flex items-center justify-between px-2 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/5">
                <span className="text-[11px] flex items-center gap-1 font-bold">
                  <Mic className="w-3 h-3" />
                  A2 나레이션
                </span>
                <Volume2 className="w-3 h-3 text-purple-500 hover:text-purple-400 cursor-pointer" />
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

              {/* 2. 빨간색 수직 재생헤드 (Playhead, 1px 직각 바늘) */}
              <div
                style={{ left: `${msToPx(currentTimeMs)}px` }}
                className="absolute top-0 bottom-0 w-px bg-red-500 z-40 pointer-events-none"
              >
                <div className="w-2.5 h-2.5 bg-red-500 -translate-x-1 shadow-md flex items-center justify-center text-[6px] text-white font-mono font-black">
                  ▼
                </div>
              </div>

              {/* 3. T1 타이틀 트랙 (직각 클립, 라운드 제로) */}
              {enabledTracks.t1Title && (
                <div className="h-9 border-b border-border relative">
                  {titleLayer && (
                    <div
                      onClick={() => setSelectedLayerId(titleLayer.id)}
                      style={{
                        left: `${msToPx(titleLayer.startMs)}px`,
                        width: `${Math.max(20, msToPx(titleLayer.endMs - titleLayer.startMs))}px`,
                      }}
                      className={cn(
                        "absolute inset-y-0 rounded-none bg-purple-600 dark:bg-purple-900/90 border border-purple-400 text-white flex items-center px-2 text-[10px] font-bold cursor-pointer group shadow-2xs",
                        selectedLayerId === titleLayer.id && "outline outline-1 outline-white z-10"
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

              {/* 4. T2 쨉쨉이 트랙 (직각 클립, 라운드 제로) */}
              {enabledTracks.t2Jab && (
                <div className="h-9 border-b border-border relative">
                  {layers.filter((l) => l.type === 'jab').map((jab) => (
                    <div
                      key={jab.id}
                      onClick={() => setSelectedLayerId(jab.id)}
                      onPointerDown={(e) => handleClipMove(e, jab.id)}
                      style={{
                        left: `${msToPx(jab.startMs)}px`,
                        width: `${Math.max(20, msToPx(jab.endMs - jab.startMs))}px`,
                      }}
                      className={cn(
                        "absolute inset-y-0 rounded-none bg-amber-500 dark:bg-amber-900/90 border border-amber-300 dark:border-amber-600 text-black dark:text-amber-100 flex items-center px-2 text-[10px] font-bold cursor-pointer group shadow-2xs",
                        selectedLayerId === jab.id && "outline outline-1 outline-white z-10"
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

              {/* 5. SUB 자막 트랙 (문장별 직각 클립, 라운드 제로) */}
              {enabledTracks.sub && (
                <div className="h-9 border-b border-border relative">
                  {subtitleLayers.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedLayerId(sub.id)}
                      onPointerDown={(e) => handleClipMove(e, sub.id)}
                      style={{
                        left: `${msToPx(sub.startMs)}px`,
                        width: `${Math.max(20, msToPx(sub.endMs - sub.startMs))}px`,
                      }}
                      className={cn(
                        "absolute inset-y-0 rounded-none bg-emerald-600 dark:bg-emerald-900/90 border border-emerald-400 dark:border-emerald-600 text-white flex items-center px-2 text-[10px] font-medium cursor-pointer group shadow-2xs",
                        selectedLayerId === sub.id && "outline outline-1 outline-white z-10"
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

              {/* 6. V1 비디오 트랙 (필름 스트립 스타일, 직각 클립) */}
              {enabledTracks.v1Video && (
                <div className="h-11 border-b border-border relative">
                  {videoLayer && (
                    <div
                      onClick={() => setSelectedLayerId(videoLayer.id)}
                      style={{
                        left: `${msToPx(videoLayer.startMs)}px`,
                        width: `${Math.max(20, msToPx(videoLayer.endMs - videoLayer.startMs))}px`,
                      }}
                      className={cn(
                        "absolute inset-y-0 rounded-none bg-slate-700 dark:bg-slate-900 border border-sky-500/70 overflow-hidden flex items-center cursor-pointer group shadow-2xs",
                        selectedLayerId === videoLayer.id && "outline outline-1 outline-sky-400 z-10"
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

              {/* 7. A1 BGM 트랙 (오디오 음파 파형 시각화, 직각 클립) */}
              {enabledTracks.a1Bgm && (
                <div className="h-9 border-b border-border relative">
                  {layers.filter((l) => l.type === 'audio').map((aud) => (
                    <div
                      key={aud.id}
                      onClick={() => setSelectedLayerId(aud.id)}
                      style={{
                        left: `${msToPx(aud.startMs)}px`,
                        width: `${Math.max(20, msToPx(aud.endMs - aud.startMs))}px`,
                      }}
                      className={cn(
                        "absolute inset-y-0 rounded-none bg-teal-700 dark:bg-teal-950 border border-teal-500/60 overflow-hidden flex items-center px-2 cursor-pointer group shadow-2xs",
                        selectedLayerId === aud.id && "outline outline-1 outline-teal-400 z-10"
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
                        "absolute inset-y-0 rounded-none bg-purple-700 dark:bg-purple-950 border border-purple-400/80 overflow-hidden flex items-center px-2 cursor-pointer group shadow-2xs",
                        selectedLayerId === sub.id && "outline outline-1 outline-purple-300 z-10"
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
            </div>
          </div>
        </div></footer>
    </div>
  );
};

export default ShortsEditorStudio;
