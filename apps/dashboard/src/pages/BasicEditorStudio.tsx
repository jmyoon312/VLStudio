import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Palette, Sliders, Type, Layers, Video, Play, Pause, Save, RotateCcw, 
  Undo2, Redo2, Eye, Shield, Smartphone, Sparkles, Check, Plus, Trash2, 
  Film, MessageSquare, Swords, Clapperboard, ChevronRight, ChevronLeft,
  Copy, ExternalLink, Move, ZoomIn, ZoomOut, Maximize2, RefreshCw,
  FolderOpen, HelpCircle, AlignLeft, AlignCenter, AlignRight, Bold, Italic
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { MemeAvatar, MemeEmotion, MEME_EMOTION_PRESETS } from '@/components/memeAssets';
import { toast } from 'sonner';
import api from '@/lib/api';

// ── 폼팩터 타입 정의 ──
export type FormFactorArchetype = 'ssul' | 'gunlimbo' | 'instagram' | 'classic';

// ── 샘플 배경 비디오 ──
const SAMPLE_VIDEOS = [
  { id: 'subway', name: '🎮 서브웨이 러너 (집중형)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', poster: 'linear-gradient(135deg, #1e293b, #0f172a)' },
  { id: 'parkour', name: '🏃 마인크래프트 파쿠르', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4', poster: 'linear-gradient(135deg, #065f46, #022c22)' },
  { id: 'urban', name: '🌆 시네마틱 도심 야경', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', poster: 'linear-gradient(135deg, #312e81, #1e1b4b)' },
  { id: 'dark_gradient', name: '🌌 딥 다크 그라데이션', url: '', poster: 'radial-gradient(circle at 50% 40%, #1e293b 0%, #090d16 100%)' },
];

// ── 검증된 한국어 폰트 목록 ──
const KOREAN_FONTS = [
  { id: 'Pretendard', name: '프리텐다드 (가장 깔끔함)', family: "'Pretendard', sans-serif" },
  { id: 'Wanted Sans', name: '원티드 산스 (모던 볼드)', family: "'Wanted Sans', sans-serif" },
  { id: 'Black Han Sans', name: '블랙한산스 (강력한 임팩트)', family: "'Black Han Sans', sans-serif" },
  { id: 'Gmarket Sans', name: 'G마켓 산스 (균형잡힌 가독성)', family: "'Gmarket Sans', sans-serif" },
  { id: 'Jua', name: '주아체 (친근한 예능/썰)', family: "'Jua', sans-serif" },
  { id: 'Do Hyeon', name: '도현체 (묵직한 타이틀)', family: "'Do Hyeon', sans-serif" },
];

// ── 4대 폼팩터 기본 프리셋 규격 ──
interface EditorPresetState {
  archetype: FormFactorArchetype;
  name: string;
  category: string;
  description: string;
  // 1. 헤더/타이틀 바
  header: {
    enabled: boolean;
    containerType: 'floating_capsule' | 'letterbox_sandwich' | 'full_width_band' | 'social_post_bar';
    titleLine1: string;
    titleLine2: string;
    fontFamily: string;
    fontSize: number;
    line1Color: string;
    line2Color: string;
    bgColor: string;
    bgOpacity: number;
    borderRadius: number;
    yPct: number;
    heightPct: number;
    paddingH: number;
  };
  // 2. 비디오 뷰포트
  video: {
    fitMode: 'sandwich' | 'square' | 'fullscreen';
    yPct: number;
    heightPct: number;
    borderRadius: number;
    borderEnabled: boolean;
    borderWidth: number;
    borderColor: string;
    blurBg: boolean;
    blurStrength: number;
  };
  // 3. 메인 자막
  subtitle: {
    text: string;
    highlightKeyword: string;
    fontFamily: string;
    fontSize: number;
    textColor: string;
    highlightColor: string;
    outlineEnabled: boolean;
    outlineColor: string;
    outlinePx: number;
    shadowEnabled: boolean;
    shadowColor: string;
    shadowBlur: number;
    boxEnabled: boolean;
    boxColor: string;
    boxRadius: number;
    yPct: number;
    motionPreset: 'word_pop' | 'fade_in' | 'static';
  };
  // 4. 폼팩터 전용 특수 카드
  card: {
    enabled: boolean;
    // 썰형 전용
    pepeEmotion: MemeEmotion;
    pepeSize: number;
    pepeXPct: number;
    pepeYPct: number;
    communityName: string;
    timeAgo: string;
    // 군림보 전용
    hookBandText: string;
    hookBandBg: string;
    sourceCredit: string;
    // 인스타 전용
    instaName: string;
    instaHandle: string;
    verified: boolean;
    commentText: string;
    commentLikes: string;
    commentYPct: number;
  };
}

// 기본 4대 프리셋 템플릿
const DEFAULT_PRESETS: Record<FormFactorArchetype, EditorPresetState> = {
  ssul: {
    archetype: 'ssul',
    name: '사이다 썰형 스탠다드',
    category: 'ssul',
    description: '상단 커뮤니티 질문 바 + 감정 페페 밈 + 가독성 극대화 노란 자막',
    header: {
      enabled: true,
      containerType: 'social_post_bar',
      titleLine1: '네이트판 레전드 사연',
      titleLine2: '결혼식날 파혼 선언한 썰 (후기)',
      fontFamily: 'Wanted Sans',
      fontSize: 34,
      line1Color: '#94A3B8',
      line2Color: '#FFFFFF',
      bgColor: '#0F172A',
      bgOpacity: 95,
      borderRadius: 16,
      yPct: 6,
      heightPct: 14,
      paddingH: 18,
    },
    video: {
      fitMode: 'sandwich',
      yPct: 22,
      heightPct: 44,
      borderRadius: 16,
      borderEnabled: true,
      borderWidth: 2,
      borderColor: '#334155',
      blurBg: true,
      blurStrength: 12,
    },
    subtitle: {
      text: '결국 시어머니 표정 굳어버리고 현장 뒤집어짐 ㅋㅋㅋ',
      highlightKeyword: '현장 뒤집어짐',
      fontFamily: 'Black Han Sans',
      fontSize: 48,
      textColor: '#FFFFFF',
      highlightColor: '#FACC15',
      outlineEnabled: true,
      outlineColor: '#000000',
      outlinePx: 6,
      shadowEnabled: true,
      shadowColor: 'rgba(0,0,0,0.85)',
      shadowBlur: 8,
      boxEnabled: false,
      boxColor: 'rgba(0,0,0,0.7)',
      boxRadius: 8,
      yPct: 76,
      motionPreset: 'word_pop',
    },
    card: {
      enabled: true,
      pepeEmotion: 'angry',
      pepeSize: 110,
      pepeXPct: 78,
      pepeYPct: 15,
      communityName: '네이트판 · 베스트 썰',
      timeAgo: '10분 전',
      hookBandText: '',
      hookBandBg: '',
      sourceCredit: '',
      instaName: '',
      instaHandle: '',
      verified: false,
      commentText: '',
      commentLikes: '',
      commentYPct: 0,
    }
  },
  gunlimbo: {
    archetype: 'gunlimbo',
    name: '군림보 0초 임팩트 훅',
    category: 'ranking',
    description: '상단 0초 충격 훅 밴드 + 1:1 박스 비디오 + 네온 자막 연출',
    header: {
      enabled: true,
      containerType: 'full_width_band',
      titleLine1: '0초 만에 시선 집중',
      titleLine2: '역대 최악의 미스터리 실화 TOP 3',
      fontFamily: 'Black Han Sans',
      fontSize: 38,
      line1Color: '#FACC15',
      line2Color: '#FFFFFF',
      bgColor: '#DC2626',
      bgOpacity: 100,
      borderRadius: 0,
      yPct: 5,
      heightPct: 12,
      paddingH: 16,
    },
    video: {
      fitMode: 'square',
      yPct: 20,
      heightPct: 48,
      borderRadius: 20,
      borderEnabled: true,
      borderWidth: 3,
      borderColor: '#EF4444',
      blurBg: true,
      blurStrength: 16,
    },
    subtitle: {
      text: '그 누구도 이 방에서 살아 나오지 못했습니다',
      highlightKeyword: '살아 나오지 못했습니다',
      fontFamily: 'Wanted Sans',
      fontSize: 50,
      textColor: '#FFFFFF',
      highlightColor: '#EF4444',
      outlineEnabled: true,
      outlineColor: '#000000',
      outlinePx: 7,
      shadowEnabled: true,
      shadowColor: '#EF4444',
      shadowBlur: 10,
      boxEnabled: false,
      boxColor: 'rgba(0,0,0,0.8)',
      boxRadius: 10,
      yPct: 78,
      motionPreset: 'word_pop',
    },
    card: {
      enabled: true,
      pepeEmotion: 'shocked',
      pepeSize: 90,
      pepeXPct: 0,
      pepeYPct: 0,
      communityName: '',
      timeAgo: '',
      hookBandText: '⚡ 충격 실화 주의',
      hookBandBg: 'from-red-600 to-amber-500',
      sourceCredit: '출처: 사건 브리핑 공식 채널',
      instaName: '',
      instaHandle: '',
      verified: false,
      commentText: '',
      commentLikes: '',
      commentYPct: 0,
    }
  },
  instagram: {
    archetype: 'instagram',
    name: '인스타그램 릴스 베댓 카드',
    category: 'entertainment',
    description: '프로필 아바타 + 인증 배지 + 베댓 말풍선 글래스모피즘',
    header: {
      enabled: true,
      containerType: 'floating_capsule',
      titleLine1: 'SNS 실시간 화제',
      titleLine2: '댓글 2만 개 돌파한 역대급 반응',
      fontFamily: 'Pretendard',
      fontSize: 32,
      line1Color: '#38BDF8',
      line2Color: '#FFFFFF',
      bgColor: '#18181B',
      bgOpacity: 90,
      borderRadius: 28,
      yPct: 7,
      heightPct: 10,
      paddingH: 22,
    },
    video: {
      fitMode: 'sandwich',
      yPct: 20,
      heightPct: 45,
      borderRadius: 24,
      borderEnabled: true,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      blurBg: true,
      blurStrength: 14,
    },
    subtitle: {
      text: '진짜 저러면 감당 안 되지 ㅋㅋㅋ 공감 100%',
      highlightKeyword: '공감 100%',
      fontFamily: 'Pretendard',
      fontSize: 46,
      textColor: '#FFFFFF',
      highlightColor: '#38BDF8',
      outlineEnabled: true,
      outlineColor: '#000000',
      outlinePx: 5,
      shadowEnabled: true,
      shadowColor: 'rgba(0,0,0,0.6)',
      shadowBlur: 6,
      boxEnabled: true,
      boxColor: 'rgba(24, 24, 27, 0.85)',
      boxRadius: 16,
      yPct: 72,
      motionPreset: 'fade_in',
    },
    card: {
      enabled: true,
      pepeEmotion: 'smug',
      pepeSize: 80,
      pepeXPct: 0,
      pepeYPct: 0,
      communityName: '',
      timeAgo: '',
      hookBandText: '',
      hookBandBg: '',
      sourceCredit: '',
      instaName: '트렌드 매거진',
      instaHandle: '@trend_mag_kr',
      verified: true,
      commentText: '베댓: "저건 솔직히 판사가 봐도 인정할 듯 ㅋㅋ"',
      commentLikes: '3.8만',
      commentYPct: 83,
    }
  },
  classic: {
    archetype: 'classic',
    name: '클래식 시네마틱 샌드위치',
    category: 'knowledge',
    description: '영화/다큐용 상하 레터박스 + 클린 화이트 볼드 자막',
    header: {
      enabled: true,
      containerType: 'letterbox_sandwich',
      titleLine1: '영화 속 비하인드 스토리',
      titleLine2: '감독도 예상치 못했던 애드리브',
      fontFamily: 'Gmarket Sans',
      fontSize: 34,
      line1Color: '#E2E8F0',
      line2Color: '#FCD34D',
      bgColor: '#000000',
      bgOpacity: 100,
      borderRadius: 0,
      yPct: 4,
      heightPct: 15,
      paddingH: 20,
    },
    video: {
      fitMode: 'sandwich',
      yPct: 21,
      heightPct: 48,
      borderRadius: 0,
      borderEnabled: false,
      borderWidth: 0,
      borderColor: 'transparent',
      blurBg: false,
      blurStrength: 0,
    },
    subtitle: {
      text: '이 한마디로 인해 영화의 모든 엔딩이 바뀌었습니다',
      highlightKeyword: '모든 엔딩이 바뀌었습니다',
      fontFamily: 'Gmarket Sans',
      fontSize: 44,
      textColor: '#FFFFFF',
      highlightColor: '#FCD34D',
      outlineEnabled: true,
      outlineColor: '#000000',
      outlinePx: 6,
      shadowEnabled: true,
      shadowColor: 'rgba(0,0,0,0.9)',
      shadowBlur: 8,
      boxEnabled: false,
      boxColor: 'rgba(0,0,0,0.6)',
      boxRadius: 0,
      yPct: 80,
      motionPreset: 'word_pop',
    },
    card: {
      enabled: false,
      pepeEmotion: 'thinking',
      pepeSize: 80,
      pepeXPct: 0,
      pepeYPct: 0,
      communityName: '',
      timeAgo: '',
      hookBandText: '',
      hookBandBg: '',
      sourceCredit: '영화 《다크 나이트》 명장면',
      instaName: '',
      instaHandle: '',
      verified: false,
      commentText: '',
      commentLikes: '',
      commentYPct: 0,
    }
  }
};

export const BasicEditorStudio: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get('mode') as FormFactorArchetype) || 'ssul';

  // ── 핵심 에디터 상태 ──
  const [state, setState] = useState<EditorPresetState>(DEFAULT_PRESETS[initialMode] || DEFAULT_PRESETS.ssul);
  const [selectedLayer, setSelectedLayer] = useState<'header' | 'video' | 'subtitle' | 'card' | null>('subtitle');
  const [activeInspectorTab, setActiveInspectorTab] = useState<'style' | 'canvas'>('style');
  const [activeAssetTab, setActiveAssetTab] = useState<'presets' | 'text' | 'cards' | 'samples'>('presets');

  // 뷰포트 & 프리뷰 제어
  const [zoomLevel, setZoomLevel] = useState<number>(75);
  const [showSafeZone, setShowSafeZone] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [sampleVideoIdx, setSampleVideoIdx] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // 저장 모달 상태
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [savePresetName, setSavePresetName] = useState<string>('');
  const [saveCategory, setSaveCategory] = useState<string>('user');
  const [saveDescription, setSaveDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 실행 취소 / 다시 실행 (Undo / Redo)
  const [history, setHistory] = useState<EditorPresetState[]>([DEFAULT_PRESETS[initialMode] || DEFAULT_PRESETS.ssul]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);

  // 드래그 조작 상태
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragLayer, setDragLayer] = useState<'header' | 'subtitle' | 'card' | null>(null);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragStartVal, setDragStartVal] = useState<number>(0);

  // 폼팩터 모드 전환 핸들러
  const handleSwitchArchetype = (arch: FormFactorArchetype) => {
    const base = DEFAULT_PRESETS[arch];
    setState(base);
    setSelectedLayer('subtitle');
    pushHistory(base);
    toast.info(`[${base.name}] 템플릿 레이아웃이 적용되었습니다.`);
  };

  // 히스토리 추가
  const pushHistory = (newState: EditorPresetState) => {
    const newHist = history.slice(0, historyIdx + 1);
    newHist.push(newState);
    if (newHist.length > 30) newHist.shift();
    setHistory(newHist);
    setHistoryIdx(newHist.length - 1);
  };

  // Undo
  const handleUndo = () => {
    if (historyIdx > 0) {
      const prev = history[historyIdx - 1];
      setState(prev);
      setHistoryIdx(historyIdx - 1);
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const next = history[historyIdx + 1];
      setState(next);
      setHistoryIdx(historyIdx + 1);
    }
  };

  // 상태 갱신 헬퍼
  const updateState = (updater: (prev: EditorPresetState) => EditorPresetState) => {
    setState(prev => {
      const next = updater(prev);
      pushHistory(next);
      return next;
    });
  };

  // 캔버스 내 레이어 마우스 드래그 이동 (Y좌표)
  const handleMouseDownOnLayer = (layer: 'header' | 'subtitle' | 'card', e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLayer(layer);
    setIsDragging(true);
    setDragLayer(layer);
    setDragStartY(e.clientY);
    if (layer === 'header') setDragStartVal(state.header.yPct);
    if (layer === 'subtitle') setDragStartVal(state.subtitle.yPct);
    if (layer === 'card') setDragStartVal(state.archetype === 'ssul' ? state.card.pepeYPct : state.card.commentYPct);
  };

  const handleMouseMoveCanvas = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragLayer || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const deltaY = e.clientY - dragStartY;
    const deltaPct = (deltaY / canvasRect.height) * 100;
    const newY = Math.max(2, Math.min(92, Math.round((dragStartVal + deltaPct) * 10) / 10));

    setState(prev => {
      if (dragLayer === 'header') return { ...prev, header: { ...prev.header, yPct: newY } };
      if (dragLayer === 'subtitle') return { ...prev, subtitle: { ...prev.subtitle, yPct: newY } };
      if (dragLayer === 'card') {
        if (prev.archetype === 'ssul') return { ...prev, card: { ...prev.card, pepeYPct: newY } };
        return { ...prev, card: { ...prev.card, commentYPct: newY } };
      }
      return prev;
    });
  }, [isDragging, dragLayer, dragStartY, dragStartVal]);

  const handleMouseUpCanvas = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragLayer(null);
      pushHistory(state);
    }
  }, [isDragging, state]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMoveCanvas);
      window.addEventListener('mouseup', handleMouseUpCanvas);
      return () => {
        window.removeEventListener('mousemove', handleMouseMoveCanvas);
        window.removeEventListener('mouseup', handleMouseUpCanvas);
      };
    }
  }, [isDragging, handleMouseMoveCanvas, handleMouseUpCanvas]);

  // 비디오 재생/일시정지 토글
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  // 프리셋 백엔드 저장
  const handleSavePreset = async () => {
    if (!savePresetName.trim()) {
      toast.error('프리셋 이름을 입력해 주세요.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: savePresetName.trim(),
        archetype: state.archetype,
        category: saveCategory,
        description: saveDescription || state.description,
        aspect_ratio: '9:16',
        style: {
          visual_geometry: {
            top_bar: {
              enabled: state.header.enabled,
              container_type: state.header.containerType,
              height_pct: state.header.heightPct,
              top_y_pct: state.header.yPct,
              bg_color: state.header.bgColor,
              bg_opacity: state.header.bgOpacity / 100,
            },
            top_header_lines: [
              { line: 1, text: state.header.titleLine1, color: state.header.line1Color, font_family: state.header.fontFamily },
              { line: 2, text: state.header.titleLine2, color: state.header.line2Color, font_family: state.header.fontFamily, font_size: state.header.fontSize }
            ],
            caption: {
              font_family: state.subtitle.fontFamily,
              size_px: state.subtitle.fontSize,
              color: state.subtitle.textColor,
              highlight_color: state.subtitle.highlightColor,
              outline_px: state.subtitle.outlineEnabled ? state.subtitle.outlinePx : 0,
              outline_color: state.subtitle.outlineColor,
              margin_v_pct: Math.round(100 - state.subtitle.yPct),
              motion_preset: state.subtitle.motionPreset,
            },
            video_viewport: {
              fit_mode: state.video.fitMode,
              top_y_pct: state.video.yPct,
              height_pct: state.video.heightPct,
              border_radius: state.video.borderRadius,
              border_width: state.video.borderEnabled ? state.video.borderWidth : 0,
              border_color: state.video.borderColor,
              blur_bg: state.video.blurBg,
              blur_strength: state.video.blurStrength,
            },
            special_card: state.card,
          },
          recipe: saveDescription || `${state.name} 커스텀 프리셋`,
        }
      };

      const res = await api.post('/sovereign-presets/basic-editor/save', payload);
      if (res.data?.success) {
        toast.success(`'${savePresetName}' 프리셋이 성공적으로 저장되었습니다!`, {
          description: '루피 AI 디렉터 및 자동 제작 파이프라인에 즉시 등록되었습니다.',
          action: {
            label: 'AI 디렉터에서 열기',
            onClick: () => navigate('/director')
          }
        });
        setSaveModalOpen(false);
      }
    } catch (e: any) {
      console.error('Failed to save preset:', e);
      toast.error(e.response?.data?.detail || '프리셋 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-background text-foreground overflow-hidden select-none">
      
      {/* ── 1. 상단 액션 바 (Top Control Bar) ── */}
      <header className="h-14 border-b border-border bg-card/60 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)} 
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
            돌아가기
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-foreground flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-primary" />
              기본 에디터
            </span>
            <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
              프리셋 공방
            </Badge>
          </div>
        </div>

        {/* 중앙 4대 폼팩터 원클릭 스위처 */}
        <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border">
          <button
            onClick={() => handleSwitchArchetype('ssul')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              state.archetype === 'ssul' 
                ? 'bg-card text-foreground shadow-xs border border-border/80' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
            💬 썰형
          </button>
          <button
            onClick={() => handleSwitchArchetype('gunlimbo')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              state.archetype === 'gunlimbo' 
                ? 'bg-card text-foreground shadow-xs border border-border/80' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-red-500" />
            ⚔️ 군림보
          </button>
          <button
            onClick={() => handleSwitchArchetype('instagram')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              state.archetype === 'instagram' 
                ? 'bg-card text-foreground shadow-xs border border-border/80' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-sky-500" />
            📱 인스타
          </button>
          <button
            onClick={() => handleSwitchArchetype('classic')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              state.archetype === 'classic' 
                ? 'bg-card text-foreground shadow-xs border border-border/80' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5 text-amber-500" />
            🎬 클래식
          </button>
        </div>

        {/* 우측 도구 & 저장 */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center border border-border rounded-md bg-muted/40">
            <button
              onClick={handleUndo}
              disabled={historyIdx <= 0}
              className="p-1.5 hover:bg-card disabled:opacity-30 rounded-l transition text-muted-foreground"
              title="실행 취소 (Undo)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3 bg-border" />
            <button
              onClick={handleRedo}
              disabled={historyIdx >= history.length - 1}
              className="p-1.5 hover:bg-card disabled:opacity-30 rounded-r transition text-muted-foreground"
              title="다시 실행 (Redo)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 안전 영역 토글 */}
          <Button
            variant={showSafeZone ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowSafeZone(!showSafeZone)}
            className="h-8 gap-1 text-xs border-border"
            title="유튜브/인스타 UI 안전지대 표시"
          >
            <Shield className={`w-3.5 h-3.5 ${showSafeZone ? 'text-primary' : 'text-muted-foreground'}`} />
            세이프존
          </Button>

          {/* 줌 배율 */}
          <div className="flex items-center gap-1 border border-border rounded-md px-1.5 py-1 bg-muted/30 text-xs">
            <button 
              onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
              className="p-0.5 hover:bg-card rounded text-muted-foreground"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="w-9 text-center font-mono text-muted-foreground">{zoomLevel}%</span>
            <button 
              onClick={() => setZoomLevel(Math.min(100, zoomLevel + 10))}
              className="p-0.5 hover:bg-card rounded text-muted-foreground"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* 프리셋 저장 버튼 */}
          <Button 
            onClick={() => {
              setSavePresetName(`${state.name} 커스텀`);
              setSaveModalOpen(true);
            }} 
            size="sm" 
            className="h-8 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            내 프리셋으로 저장
          </Button>
        </div>
      </header>

      {/* ── 2. 메인 3단 워크스페이스 레이아웃 ── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ── 2-A. 좌측 사이드바 (에셋 & 템플릿 라이브러리) ── */}
        <aside className="w-64 border-r border-border bg-card/40 flex flex-col shrink-0">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">에셋 라이브러리</span>
            <Badge variant="outline" className="text-[10px] bg-muted/60">{state.archetype.toUpperCase()}</Badge>
          </div>

          <div className="flex border-b border-border bg-muted/20">
            <button
              onClick={() => setActiveAssetTab('presets')}
              className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1 border-b-2 transition ${
                activeAssetTab === 'presets' ? 'border-primary text-primary bg-card/80' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              프리셋
            </button>
            <button
              onClick={() => setActiveAssetTab('text')}
              className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1 border-b-2 transition ${
                activeAssetTab === 'text' ? 'border-primary text-primary bg-card/80' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              텍스트
            </button>
            <button
              onClick={() => setActiveAssetTab('cards')}
              className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1 border-b-2 transition ${
                activeAssetTab === 'cards' ? 'border-primary text-primary bg-card/80' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              카드/밈
            </button>
            <button
              onClick={() => setActiveAssetTab('samples')}
              className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1 border-b-2 transition ${
                activeAssetTab === 'samples' ? 'border-primary text-primary bg-card/80' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              샘플
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* 탭 1: 추천 프리셋 */}
            {activeAssetTab === 'presets' && (
              <div className="space-y-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground">인기 템플릿 레이아웃</span>
                {Object.entries(DEFAULT_PRESETS).map(([key, p]) => (
                  <div
                    key={key}
                    onClick={() => handleSwitchArchetype(key as FormFactorArchetype)}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      state.archetype === key 
                        ? 'border-primary/80 bg-primary/5 dark:bg-primary/10 shadow-xs' 
                        : 'border-border bg-card/60 hover:border-border/80 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground">{p.name}</span>
                      {state.archetype === key && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{p.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 탭 2: 텍스트 추가 */}
            {activeAssetTab === 'text' && (
              <div className="space-y-3">
                <span className="text-[11px] font-semibold text-muted-foreground">텍스트 블록</span>
                <div 
                  onClick={() => setSelectedLayer('header')}
                  className="p-3 rounded-lg border border-border bg-card/60 hover:bg-muted/40 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground">📌 훅 헤드라인 타이틀</span>
                    <Badge variant="outline" className="text-[9px]">상단 바</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">시선을 단 1초 만에 사로잡는 질문/폭로 헤더</p>
                </div>

                <div 
                  onClick={() => setSelectedLayer('subtitle')}
                  className="p-3 rounded-lg border border-border bg-card/60 hover:bg-muted/40 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground">💬 메인 숏폼 자막</span>
                    <Badge variant="outline" className="text-[9px]">바운스 모션</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">단어별 팝업 바운스 & 외곽선 하이라이트</p>
                </div>
              </div>
            )}

            {/* 탭 3: 카드 및 밈 스티커 */}
            {activeAssetTab === 'cards' && (
              <div className="space-y-3">
                <span className="text-[11px] font-semibold text-muted-foreground">폼팩터 전용 특수 카드</span>
                
                {/* 페페 밈 감정 세트 */}
                <div className="p-3 rounded-lg border border-border bg-card/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">🐸 페페 밈 아바타</span>
                    <Switch 
                      checked={state.card.enabled} 
                      onCheckedChange={(c) => updateState(s => ({ ...s, card: { ...s.card, enabled: c } }))} 
                    />
                  </div>
                  {state.card.enabled && (
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {MEME_EMOTION_PRESETS.slice(0, 6).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            updateState(s => ({ ...s, card: { ...s.card, pepeEmotion: m.id } }));
                            setSelectedLayer('card');
                          }}
                          className={`p-1.5 rounded border text-[11px] flex items-center gap-1 transition ${
                            state.card.pepeEmotion === m.id 
                              ? 'border-primary bg-primary/10 text-primary font-bold' 
                              : 'border-border/60 hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          <span>{m.emoji}</span>
                          <span className="truncate">{m.label.split('/')[0]}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 인스타 프로필 카드 */}
                <div 
                  onClick={() => setSelectedLayer('card')}
                  className="p-3 rounded-lg border border-border bg-card/60 hover:bg-muted/40 cursor-pointer transition"
                >
                  <span className="text-xs font-bold text-foreground block mb-1">📱 인스타 프로필 & 베댓 카드</span>
                  <p className="text-[11px] text-muted-foreground">공식 인증 뱃지 + 작성자 핸들 + 공감 베댓</p>
                </div>
              </div>
            )}

            {/* 탭 4: 샘플 배경 비디오 */}
            {activeAssetTab === 'samples' && (
              <div className="space-y-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground">루프 프리뷰 비디오</span>
                {SAMPLE_VIDEOS.map((v, idx) => (
                  <div
                    key={v.id}
                    onClick={() => {
                      setSampleVideoIdx(idx);
                      toast.info(`'${v.name}' 배경 루프가 적용되었습니다.`);
                    }}
                    className={`p-2.5 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                      sampleVideoIdx === idx 
                        ? 'border-primary bg-primary/5 text-foreground' 
                        : 'border-border bg-card/60 hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <span className="text-xs font-semibold">{v.name}</span>
                    {sampleVideoIdx === idx && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── 2-B. 중앙 9:16 스마트 캔버스 (Interactive Canvas Stage) ── */}
        <main className="flex-1 bg-muted/40 flex flex-col items-center justify-center relative overflow-hidden p-6">
          
          {/* 드래그 좌표 안내 툴팁 */}
          {isDragging && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse">
              <Move className="w-3 h-3" />
              Y 위치: {dragLayer === 'header' ? state.header.yPct : dragLayer === 'subtitle' ? state.subtitle.yPct : state.card.pepeYPct}%
            </div>
          )}

          {/* 9:16 스마트 캔버스 뷰포트 */}
          <div 
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
            className="transition-transform duration-150 ease-out shrink-0"
          >
            <div 
              ref={canvasRef}
              onClick={() => setSelectedLayer(null)}
              className="relative w-[360px] h-[640px] rounded-2xl bg-black overflow-hidden shadow-2xl border-4 border-border/80 select-none"
            >
              {/* 비디오 뷰포트 영역 */}
              <div 
                onClick={(e) => { e.stopPropagation(); setSelectedLayer('video'); }}
                style={{
                  top: `${state.video.yPct}%`,
                  height: `${state.video.heightPct}%`,
                  borderRadius: `${state.video.borderRadius}px`,
                  border: state.video.borderEnabled ? `${state.video.borderWidth}px solid ${state.video.borderColor}` : 'none',
                }}
                className={`absolute inset-x-2 overflow-hidden transition-all cursor-pointer ${
                  selectedLayer === 'video' ? 'ring-2 ring-primary ring-offset-2 ring-offset-black' : ''
                }`}
              >
                {/* 배경 블러 가우시안 */}
                {state.video.blurBg && (
                  <div 
                    style={{ 
                      backgroundImage: SAMPLE_VIDEOS[sampleVideoIdx].poster,
                      filter: `blur(${state.video.blurStrength}px)` 
                    }}
                    className="absolute inset-0 scale-125 opacity-70"
                  />
                )}

                {/* 실제 비디오 루프 태그 */}
                {SAMPLE_VIDEOS[sampleVideoIdx].url ? (
                  <video
                    ref={videoRef}
                    src={SAMPLE_VIDEOS[sampleVideoIdx].url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover relative z-10"
                  />
                ) : (
                  <div 
                    style={{ background: SAMPLE_VIDEOS[sampleVideoIdx].poster }}
                    className="w-full h-full flex items-center justify-center text-xs text-white/50 font-mono relative z-10"
                  >
                    [9:16 비디오 소스 대기 중]
                  </div>
                )}
              </div>

              {/* 1. 상단 훅 타이틀 / 질문 바 레이어 */}
              {state.header.enabled && (
                <div
                  onMouseDown={(e) => handleMouseDownOnLayer('header', e)}
                  style={{
                    top: `${state.header.yPct}%`,
                    backgroundColor: state.header.bgColor,
                    opacity: state.header.bgOpacity / 100,
                    borderRadius: `${state.header.borderRadius}px`,
                    padding: `8px ${state.header.paddingH}px`,
                  }}
                  className={`absolute inset-x-3 cursor-move transition-shadow z-20 ${
                    selectedLayer === 'header' ? 'ring-2 ring-primary shadow-lg' : 'hover:ring-1 hover:ring-white/50'
                  }`}
                >
                  <div 
                    style={{ fontFamily: state.header.fontFamily }}
                    className="text-center"
                  >
                    {state.header.titleLine1 && (
                      <p style={{ color: state.header.line1Color }} className="text-[11px] font-semibold leading-tight">
                        {state.header.titleLine1}
                      </p>
                    )}
                    <h2 
                      style={{ 
                        color: state.header.line2Color,
                        fontSize: `${Math.round(state.header.fontSize * 0.45)}px`
                      }} 
                      className="font-extrabold leading-tight tracking-tight mt-0.5"
                    >
                      {state.header.titleLine2}
                    </h2>
                  </div>
                  {selectedLayer === 'header' && (
                    <div className="absolute -top-5 left-2 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded">
                      상단 훅 바 (드래그하여 이동)
                    </div>
                  )}
                </div>
              )}

              {/* 2. 폼팩터 전용 특수 카드 (썰형 페페 밈 / 인스타 베댓 / 군림보 훅) */}
              {state.card.enabled && state.archetype === 'ssul' && (
                <div
                  onMouseDown={(e) => handleMouseDownOnLayer('card', e)}
                  style={{
                    top: `${state.card.pepeYPct}%`,
                    left: `${state.card.pepeXPct}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute cursor-move z-20 ${
                    selectedLayer === 'card' ? 'ring-2 ring-emerald-500 rounded-full' : ''
                  }`}
                >
                  <MemeAvatar 
                    type="pepe" 
                    emotion={state.card.pepeEmotion} 
                    size={Math.round(state.card.pepeSize * 0.75)} 
                  />
                  {selectedLayer === 'card' && (
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[9px] font-bold px-1 rounded whitespace-nowrap">
                      페페 밈
                    </div>
                  )}
                </div>
              )}

              {state.card.enabled && state.archetype === 'instagram' && (
                <div
                  onMouseDown={(e) => handleMouseDownOnLayer('card', e)}
                  style={{ top: `${state.card.commentYPct}%` }}
                  className={`absolute inset-x-4 bg-zinc-900/85 backdrop-blur-md border border-white/20 rounded-xl p-2.5 cursor-move z-20 ${
                    selectedLayer === 'card' ? 'ring-2 ring-sky-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-[10px] text-white font-bold">
                      📸
                    </div>
                    <span className="text-[11px] font-bold text-white">{state.card.instaName}</span>
                    <span className="text-[10px] text-zinc-400">{state.card.instaHandle}</span>
                    {state.card.verified && <span className="text-sky-400 text-xs">✓</span>}
                  </div>
                  <p className="text-[11px] text-zinc-100 font-medium">{state.card.commentText}</p>
                </div>
              )}

              {/* 3. 메인 자막 레이어 (바운스 모션 시뮬레이션) */}
              <div
                onMouseDown={(e) => handleMouseDownOnLayer('subtitle', e)}
                style={{
                  top: `${state.subtitle.yPct}%`,
                  transform: 'translateY(-50%)',
                }}
                className={`absolute inset-x-3 cursor-move z-20 text-center ${
                  selectedLayer === 'subtitle' ? 'ring-2 ring-primary ring-offset-1 rounded-lg' : 'hover:ring-1 hover:ring-white/40'
                }`}
              >
                <div
                  style={{
                    backgroundColor: state.subtitle.boxEnabled ? state.subtitle.boxColor : 'transparent',
                    borderRadius: `${state.subtitle.boxRadius}px`,
                    padding: state.subtitle.boxEnabled ? '6px 12px' : '0px',
                    display: 'inline-block',
                    maxWidth: '95%',
                  }}
                >
                  <p
                    style={{
                      fontFamily: state.subtitle.fontFamily,
                      fontSize: `${Math.round(state.subtitle.fontSize * 0.42)}px`,
                      color: state.subtitle.textColor,
                      WebkitTextStroke: state.subtitle.outlineEnabled 
                        ? `${Math.round(state.subtitle.outlinePx * 0.75)}px ${state.subtitle.outlineColor}` 
                        : 'none',
                      textShadow: state.subtitle.shadowEnabled 
                        ? `0px 2px ${state.subtitle.shadowBlur}px ${state.subtitle.shadowColor}` 
                        : 'none',
                    }}
                    className="font-extrabold leading-tight tracking-tight break-keep"
                  >
                    {state.subtitle.text.split(state.subtitle.highlightKeyword).map((part, i, arr) => (
                      <React.Fragment key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <span style={{ color: state.subtitle.highlightColor }}>
                            {state.subtitle.highlightKeyword}
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </p>
                </div>
                {selectedLayer === 'subtitle' && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded shadow">
                    메인 자막 (상하 드래그로 조절)
                  </div>
                )}
              </div>

              {/* 세이프존 점선 가이드 오버레이 */}
              {showSafeZone && (
                <div className="absolute inset-0 pointer-events-none z-30 border border-red-500/30">
                  {/* 상단 시스템 바 영역 */}
                  <div className="h-10 border-b border-dashed border-red-500/40 flex items-center justify-center">
                    <span className="text-[9px] text-red-400 font-mono">TOP SAFE ZONE (상단 안전지대)</span>
                  </div>
                  {/* 우측 숏폼 반응 버튼 (좋아요/댓글 가이드) */}
                  <div className="absolute right-2 bottom-20 w-10 flex flex-col gap-3 items-center opacity-40">
                    <div className="w-7 h-7 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-[10px] text-white">❤️</div>
                    <div className="w-7 h-7 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-[10px] text-white">💬</div>
                    <div className="w-7 h-7 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-[10px] text-white">↗️</div>
                  </div>
                  {/* 하단 사운드/캡션 세이프존 */}
                  <div className="absolute inset-x-0 bottom-0 h-16 border-t border-dashed border-red-500/40 flex items-center justify-center">
                    <span className="text-[9px] text-red-400 font-mono">BOTTOM SAFE ZONE (하단 사운드 바)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 캔버스 하단 재생 컨트롤 */}
          <div className="mt-4 flex items-center gap-3 bg-card/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-border shadow-xs">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-full hover:bg-muted text-foreground transition"
            >
              {isPlaying ? <Pause className="w-4 h-4 text-primary" /> : <Play className="w-4 h-4 text-primary" />}
            </button>
            <span className="text-xs font-mono text-muted-foreground">00:02.15 / 00:15.00</span>
            <div className="h-3 w-px bg-border mx-1" />
            <span className="text-xs font-semibold text-muted-foreground">
              선택: {selectedLayer === 'header' ? '상단 훅 바' : selectedLayer === 'subtitle' ? '메인 자막' : selectedLayer === 'video' ? '비디오 슬롯' : selectedLayer === 'card' ? '특수 카드' : '없음'}
            </span>
          </div>
        </main>

        {/* ── 2-C. 우측 맥락인식형 속성 인스펙터 (Right Smart Inspector) ── */}
        <aside className="w-80 border-l border-border bg-card/40 flex flex-col shrink-0">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground">
                {selectedLayer === 'subtitle' ? '자막 타이포그래피' : 
                 selectedLayer === 'header' ? '상단 훅 타이틀' : 
                 selectedLayer === 'video' ? '비디오 슬롯' : 
                 selectedLayer === 'card' ? '특수 카드' : '캔버스 전역 설정'}
              </span>
            </div>
            {selectedLayer && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedLayer(null)}
                className="h-6 px-1.5 text-[10px] text-muted-foreground"
              >
                전역 설정 보기
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            
            {/* ── A. 메인 자막 선택 시 인스펙터 ── */}
            {selectedLayer === 'subtitle' && (
              <div className="space-y-4">
                {/* 자막 문구 미리보기 입력 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">자막 미리보기 문구</label>
                  <Input 
                    value={state.subtitle.text} 
                    onChange={(e) => updateState(s => ({ ...s, subtitle: { ...s.subtitle, text: e.target.value } }))}
                    className="text-xs bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">강조 키워드 (하이라이트)</label>
                  <Input 
                    value={state.subtitle.highlightKeyword} 
                    onChange={(e) => updateState(s => ({ ...s, subtitle: { ...s.subtitle, highlightKeyword: e.target.value } }))}
                    className="text-xs bg-background"
                  />
                </div>

                {/* 폰트 서체 선택 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">폰트 서체</label>
                  <select
                    value={state.subtitle.fontFamily}
                    onChange={(e) => updateState(s => ({ ...s, subtitle: { ...s.subtitle, fontFamily: e.target.value } }))}
                    className="w-full text-xs bg-background border border-border rounded-md px-2.5 py-1.5 font-medium"
                  >
                    {KOREAN_FONTS.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* 글자 크기 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">글자 크기</span>
                    <span className="font-mono font-bold text-foreground">{state.subtitle.fontSize}px</span>
                  </div>
                  <Slider 
                    value={[state.subtitle.fontSize]} 
                    min={32} 
                    max={84} 
                    step={2}
                    onValueChange={([val]) => updateState(s => ({ ...s, subtitle: { ...s.subtitle, fontSize: val } }))} 
                  />
                </div>

                {/* 색상 및 하이라이트 */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">기본 텍스트 색상</label>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="color" 
                        value={state.subtitle.textColor} 
                        onChange={(e) => updateState(s => ({ ...s, subtitle: { ...s.subtitle, textColor: e.target.value } }))}
                        className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                      />
                      <span className="text-xs font-mono">{state.subtitle.textColor}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">강조 형광펜 색상</label>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="color" 
                        value={state.subtitle.highlightColor} 
                        onChange={(e) => updateState(s => ({ ...s, subtitle: { ...s.subtitle, highlightColor: e.target.value } }))}
                        className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                      />
                      <span className="text-xs font-mono">{state.subtitle.highlightColor}</span>
                    </div>
                  </div>
                </div>

                {/* 외곽선 (Stroke) */}
                <div className="p-3 rounded-lg border border-border bg-card/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">텍스트 외곽선 (Stroke)</span>
                    <Switch 
                      checked={state.subtitle.outlineEnabled} 
                      onCheckedChange={(c) => updateState(s => ({ ...s, subtitle: { ...s.subtitle, outlineEnabled: c } }))} 
                    />
                  </div>
                  {state.subtitle.outlineEnabled && (
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">두께</span>
                        <span className="font-mono font-bold text-foreground">{state.subtitle.outlinePx}px</span>
                      </div>
                      <Slider 
                        value={[state.subtitle.outlinePx]} 
                        min={1} 
                        max={10} 
                        step={1}
                        onValueChange={([val]) => updateState(s => ({ ...s, subtitle: { ...s.subtitle, outlinePx: val } }))} 
                      />
                    </div>
                  )}
                </div>

                {/* 세로 위치 Y% */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">세로 위치 (Y)</span>
                    <span className="font-mono font-bold text-foreground">{state.subtitle.yPct}%</span>
                  </div>
                  <Slider 
                    value={[state.subtitle.yPct]} 
                    min={55} 
                    max={88} 
                    step={1}
                    onValueChange={([val]) => updateState(s => ({ ...s, subtitle: { ...s.subtitle, yPct: val } }))} 
                  />
                </div>
              </div>
            )}

            {/* ── B. 상단 훅 타이틀 선택 시 인스펙터 ── */}
            {selectedLayer === 'header' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">1행 부제목 (상황/조건)</label>
                  <Input 
                    value={state.header.titleLine1} 
                    onChange={(e) => updateState(s => ({ ...s, header: { ...s.header, titleLine1: e.target.value } }))}
                    className="text-xs bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">2행 메인 훅 타이틀 (강조)</label>
                  <Input 
                    value={state.header.titleLine2} 
                    onChange={(e) => updateState(s => ({ ...s, header: { ...s.header, titleLine2: e.target.value } }))}
                    className="text-xs bg-background"
                  />
                </div>

                {/* 폰트 서체 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">타이틀 서체</label>
                  <select
                    value={state.header.fontFamily}
                    onChange={(e) => updateState(s => ({ ...s, header: { ...s.header, fontFamily: e.target.value } }))}
                    className="w-full text-xs bg-background border border-border rounded-md px-2.5 py-1.5 font-medium"
                  >
                    {KOREAN_FONTS.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* 박스 모서리 둥글기 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">모서리 둥글기 (Radius)</span>
                    <span className="font-mono font-bold text-foreground">{state.header.borderRadius}px</span>
                  </div>
                  <Slider 
                    value={[state.header.borderRadius]} 
                    min={0} 
                    max={32} 
                    step={2}
                    onValueChange={([val]) => updateState(s => ({ ...s, header: { ...s.header, borderRadius: val } }))} 
                  />
                </div>

                {/* 세로 위치 Y% */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">세로 위치 (Y)</span>
                    <span className="font-mono font-bold text-foreground">{state.header.yPct}%</span>
                  </div>
                  <Slider 
                    value={[state.header.yPct]} 
                    min={2} 
                    max={25} 
                    step={1}
                    onValueChange={([val]) => updateState(s => ({ ...s, header: { ...s.header, yPct: val } }))} 
                  />
                </div>
              </div>
            )}

            {/* ── C. 비디오 슬롯 선택 시 인스펙터 ── */}
            {selectedLayer === 'video' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">비디오 배치 레이아웃</label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <button
                      onClick={() => updateState(s => ({ ...s, video: { ...s.video, fitMode: 'sandwich', yPct: 22, heightPct: 45 } }))}
                      className={`py-2 rounded border font-semibold ${state.video.fitMode === 'sandwich' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}
                    >
                      50% 분할
                    </button>
                    <button
                      onClick={() => updateState(s => ({ ...s, video: { ...s.video, fitMode: 'square', yPct: 20, heightPct: 48 } }))}
                      className={`py-2 rounded border font-semibold ${state.video.fitMode === 'square' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}
                    >
                      1:1 정사각
                    </button>
                    <button
                      onClick={() => updateState(s => ({ ...s, video: { ...s.video, fitMode: 'fullscreen', yPct: 0, heightPct: 100 } }))}
                      className={`py-2 rounded border font-semibold ${state.video.fitMode === 'fullscreen' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}
                    >
                      풀스크린
                    </button>
                  </div>
                </div>

                {/* 비디오 모서리 라운딩 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">비디오 모서리 라운딩</span>
                    <span className="font-mono font-bold text-foreground">{state.video.borderRadius}px</span>
                  </div>
                  <Slider 
                    value={[state.video.borderRadius]} 
                    min={0} 
                    max={36} 
                    step={2}
                    onValueChange={([val]) => updateState(s => ({ ...s, video: { ...s.video, borderRadius: val } }))} 
                  />
                </div>

                {/* 배경 블러 가우시안 */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/60">
                  <div>
                    <span className="text-xs font-bold text-foreground block">배경 블러 (Gaussian Blur)</span>
                    <span className="text-[11px] text-muted-foreground">영상 뒤 여백을 흐림 처리</span>
                  </div>
                  <Switch 
                    checked={state.video.blurBg} 
                    onCheckedChange={(c) => updateState(s => ({ ...s, video: { ...s.video, blurBg: c } }))} 
                  />
                </div>
              </div>
            )}

            {/* ── D. 폼팩터 전용 특수 카드 선택 시 인스펙터 ── */}
            {selectedLayer === 'card' && (
              <div className="space-y-4">
                {state.archetype === 'ssul' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">페페 감정 표정 선택</span>
                      <Badge variant="outline">{state.card.pepeEmotion}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {MEME_EMOTION_PRESETS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => updateState(s => ({ ...s, card: { ...s.card, pepeEmotion: m.id } }))}
                          className={`p-2 rounded border text-xs flex items-center gap-1.5 transition ${
                            state.card.pepeEmotion === m.id ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border'
                          }`}
                        >
                          <span>{m.emoji}</span>
                          <span className="truncate">{m.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-muted-foreground">페페 크기</span>
                        <span className="font-mono font-bold text-foreground">{state.card.pepeSize}px</span>
                      </div>
                      <Slider 
                        value={[state.card.pepeSize]} 
                        min={60} 
                        max={160} 
                        step={5}
                        onValueChange={([val]) => updateState(s => ({ ...s, card: { ...s.card, pepeSize: val } }))} 
                      />
                    </div>
                  </div>
                )}

                {state.archetype === 'instagram' && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">채널 이름</label>
                      <Input 
                        value={state.card.instaName} 
                        onChange={(e) => updateState(s => ({ ...s, card: { ...s.card, instaName: e.target.value } }))}
                        className="text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">채널 핸들 (@닉네임)</label>
                      <Input 
                        value={state.card.instaHandle} 
                        onChange={(e) => updateState(s => ({ ...s, card: { ...s.card, instaHandle: e.target.value } }))}
                        className="text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">베댓 말풍선 내용</label>
                      <Input 
                        value={state.card.commentText} 
                        onChange={(e) => updateState(s => ({ ...s, card: { ...s.card, commentText: e.target.value } }))}
                        className="text-xs bg-background"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── E. 아무것도 선택 안 됨 ➔ 캔버스 전역 설정 ── */}
            {selectedLayer === null && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg border border-border bg-card/60 space-y-1">
                  <span className="text-xs font-bold text-foreground block">캔버스 선택 안내</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    중앙 캔버스의 [자막], [상단 바], [비디오]를 마우스로 클릭하시면 상세 스타일을 편집하실 수 있습니다.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-foreground">현재 활성 폼팩터</span>
                  <div className="p-2.5 rounded-lg border border-border bg-muted/30">
                    <span className="text-xs font-bold text-primary block">{state.name}</span>
                    <span className="text-[11px] text-muted-foreground">{state.description}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── 3. 프리셋 저장 모달 (Save Preset Modal) ── */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Save className="w-4 h-4 text-primary" />
              내 커스텀 프리셋으로 저장
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              기본 에디터에서 조정한 모든 위치, 폰트, 자막 스타일이 영구 프리셋으로 저장됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">프리셋 이름 *</label>
              <Input 
                value={savePresetName} 
                onChange={(e) => setSavePresetName(e.target.value)}
                placeholder="예: 나만의_사이다썰_공식_v1"
                className="text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">보관함 카테고리</label>
              <select
                value={saveCategory}
                onChange={(e) => setSaveCategory(e.target.value)}
                className="w-full text-xs bg-background border border-border rounded-md px-2.5 py-2"
              >
                <option value="user">내 커스텀 보관함</option>
                <option value="ssul">커뮤니티 / 썰형</option>
                <option value="ranking">랭킹 / 팩트 체크</option>
                <option value="entertainment">연예 / 이슈</option>
                <option value="knowledge">지식 / 교양</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">프리셋 설명 (선택)</label>
              <Input 
                value={saveDescription} 
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="어떤 영상에 어울리는 프리셋인지 메모해 보세요"
                className="text-xs bg-background"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSaveModalOpen(false)}>취소</Button>
            <Button size="sm" onClick={handleSavePreset} disabled={isSaving} className="gap-1.5 bg-primary text-primary-foreground">
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              저장 및 시스템 등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BasicEditorStudio;
