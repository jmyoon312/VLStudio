import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutTemplate, Sparkles, Wand2, Eye, Save, RefreshCw, 
  CheckCircle2, ArrowRight, Play, Pause, Sliders, Layout, 
  Type, Palette, Volume2, Film, Shield, Globe, 
  ChevronDown, ChevronUp, Copy, Plus, Trash2,
  Flame, TrendingUp, Layers, Video, Award, Clock,
  Check, Info, Monitor, Smartphone, SlidersHorizontal,
  Split, EyeOff, MoveVertical, Move, ArrowLeftRight,
  Maximize2, Zap, ZoomIn, Focus, Sparkle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';

// 8대 유튜브/쇼츠 대표 상용 무료 웹폰트 에셋
const AVAILABLE_FONTS = [
  { id: 'Pretendard', name: 'Pretendard (프리텐다드 - 모던/깔끔)', family: "'Pretendard', sans-serif" },
  { id: 'Black Han Sans', name: 'Black Han Sans (검은고딕 - 강력한 훅)', family: "'Black Han Sans', sans-serif" },
  { id: 'Do Hyeon', name: 'Do Hyeon (배민 도현체 - 레트로 임팩트)', family: "'Do Hyeon', sans-serif" },
  { id: 'Jua', name: 'Jua (배민 주아체 - 부드러운 강조)', family: "'Jua', sans-serif" },
  { id: 'Wanted Sans', name: 'Wanted Sans (원티드 산스 - 테크/스타일리시)', family: "'Wanted Sans', sans-serif" },
  { id: 'Noto Sans KR', name: 'Noto Sans KR (본고딕 - 표준)', family: "'Noto Sans KR', sans-serif" },
];

export interface ShortsLayoutState {
  // Video Canvas & Fit
  canvasType: string;
  videoFitMode: 'sandwich' | 'fullscreen'; // 샌드위치 핏 vs 풀스크린 오버레이
  videoZoomScale: number;                  // 100% ~ 200% 연예인 얼굴 줌
  videoFocusYPct: number;                  // 20% ~ 80% 인물 얼굴 중심 Y축 오프셋
  enableKenBurns: boolean;
  enableHorizontalFlip: boolean;
  filmFilter: 'none' | 'grain' | 'vintage' | 'noir';

  // [Layer 1: 상단 배경 바]
  hasTopBarBg: boolean;
  topBarBg: string;
  topBarHeightPct: number;
  topBarOpacity: number;

  // [Layer 2: 상단 타이틀 텍스트 (상단 바와 완전 독립)]
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

  // [Layer 3: 본문 자막]
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

  // [Layer 4: 긴박 쨉쨉이 (Jab Hook)]
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

  // [Layer 5: 하단 출처 표기 (하단 바와 완전 독립)]
  hasBottomSource: boolean;
  bottomSourceText: string;
  bottomSourceColor: string;
  bottomSourceSizePx: number;
  bottomSourceFontFamily: string;
  bottomSourceBottomPct: number;
  bottomSourceHasPill: boolean;

  // [Layer 6: 하단 배경 바]
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
  topTitleYPct: 5.2,
  titleLine1: '여돌들 중 누가',
  titleLine2: '진짜 대식가일까?',
  titleLine1Color: '#FFFFFF',
  titleLine2Color: '#F5F420',
  titleLine1SizePx: 26,
  titleLine2SizePx: 30,
  titleFontFamily: 'Pretendard',
  titleBgMode: 'none',
  titleBgColor: '#E11D48',
  titleBgOpacity: 0.95,
  titlePaddingX: 16,
  titlePaddingY: 6,
  titleBorderRadius: 8,
  titleShadow: true,
  titleStroke: true,

  hasSubtitle: true,
  subtitleYPercent: 68.5,
  subtitleColor: '#FFFFFF',
  subtitleStrokeColor: '#000000',
  subtitleStrokeWidth: 4,
  subtitleFontSize: 22,
  subtitleFontFamily: 'Pretendard',
  subtitleMotionPreset: 'word_pop',
  subtitleHasPillBg: false,
  subtitlePillBgColor: 'rgba(0,0,0,0.6)',

  hasJab: true,
  jabText: '*여동생을 향해 전력 질주*',
  jabColor: '#F5F420',
  jabPlacement: 'center',
  jabTiltDeg: -4,
  jabYPercent: 41.4,
  jabFontSize: 20,
  jabFontFamily: 'Pretendard',
  jabBgColor: '#000000',
  jabBorderColor: '#F5F420',

  hasBottomSource: true,
  bottomSourceText: '출처: 원본 비하인드 공식 영상',
  bottomSourceColor: '#94A3B8',
  bottomSourceSizePx: 12,
  bottomSourceFontFamily: 'Pretendard',
  bottomSourceBottomPct: 2.2,
  bottomSourceHasPill: false,

  hasBottomBarBg: true,
  bottomBarBg: '#000000',
  bottomBarHeightPct: 6.0,
  bottomBarOpacity: 1.0
};

export const ShortsTemplateStudio: React.FC<{
  initialLayout?: Partial<ShortsLayoutState>;
  onLayoutChange?: (layout: ShortsLayoutState) => void;
  showBackButton?: boolean;
}> = ({ initialLayout, onLayoutChange }) => {
  const { toast } = useToast();

  // Layout State
  const [layout, setLayout] = useState<ShortsLayoutState>({
    ...defaultLayoutState,
    ...initialLayout
  });

  // Template List & Management
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('preset_standard_letterbox');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Brand Channels for Binding
  const [brandChannels, setBrandChannels] = useState<any[]>([]);
  const [selectedBrandChannelId, setSelectedBrandChannelId] = useState<number | null>(null);
  const [isBindingChannel, setIsBindingChannel] = useState(false);

  // Active Layer Selection ('topBarBg' | 'topTitle' | 'subtitle' | 'jab' | 'bottomSource' | 'bottomBarBg' | 'video')
  const [activeLayer, setActiveLayer] = useState<string>('topTitle');

  // Comparison View Mode ('preview' | 'original' | 'split' | 'onion')
  const [compareMode, setCompareMode] = useState<'preview' | 'original' | 'split' | 'onion'>('preview');
  const [splitPos, setSplitPos] = useState(50);
  const [onionOpacity, setOnionOpacity] = useState(50);

  // Dynamic Subtitle Animation Simulator State (60fps)
  const [isPlayingMotion, setIsPlayingMotion] = useState(true);
  const [motionFrame, setMotionFrame] = useState(0);

  // Dragging State for Canvas Resizers
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'headerBar' | 'bottomBar' | 'topTitle' | 'subtitle' | 'jab' | 'bottomSource' | null>(null);

  // 벤치마크 실측 기준치 (Live Diff 대조용)
  const benchmarkSpec = {
    topBarHeightPct: 18.3,
    titleLine1SizePx: 26,
    titleLine2SizePx: 30,
    subtitleYPercent: 68.5,
    subtitleFontSize: 22,
    jabTiltDeg: -4,
    jabYPercent: 41.4,
    bottomBarHeightPct: 6.0
  };

  useEffect(() => {
    loadTemplates();
    loadBrandChannels();
  }, []);

  useEffect(() => {
    if (onLayoutChange) {
      onLayoutChange(layout);
    }
  }, [layout]);

  // Motion playback timer
  useEffect(() => {
    let interval: any = null;
    if (isPlayingMotion) {
      interval = setInterval(() => {
        setMotionFrame(prev => (prev + 1) % 60);
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlayingMotion]);

  const loadTemplates = async () => {
    try {
      const res = await api.get('/channel-dna/templates');
      if (res.data?.items) {
        setTemplates(res.data.items);
      }
    } catch (e) {
      console.log('Using default templates:', e);
    }
  };

  const loadBrandChannels = async () => {
    try {
      const res = await api.get('/channel-dna/brand-channels');
      if (res.data?.items && res.data.items.length > 0) {
        setBrandChannels(res.data.items);
        setSelectedBrandChannelId(res.data.items[0].id);
      }
    } catch (e) {
      console.log('Failed to load brand channels:', e);
    }
  };

  const handleSelectTemplate = (tpl: any) => {
    setSelectedTemplateId(tpl.id);
    if (tpl.layout) {
      setLayout(prev => ({
        ...prev,
        ...tpl.layout
      }));
      toast({
        title: `🎨 '${tpl.name}' 템플릿 적용`,
        description: '캔버스에 독립 레이어 및 폰트/위치 규격이 로드되었습니다.'
      });
    }
  };

  const handleSaveNewTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast({ title: '템플릿 이름을 입력해주세요.', variant: 'destructive' });
      return;
    }
    setIsSavingTemplate(true);
    try {
      await api.post('/channel-dna/templates', {
        name: newTemplateName.trim(),
        layout: layout
      });
      toast({
        title: '🎉 템플릿 저장 완료',
        description: `'${newTemplateName}' 템플릿이 라이브러리에 영구 보관되었습니다.`
      });
      setNewTemplateName('');
      loadTemplates();
    } catch (e: any) {
      toast({ title: '저장 실패', description: e.message, variant: 'destructive' });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('이 커스텀 템플릿을 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/channel-dna/templates/${templateId}`);
      toast({ title: '템플릿 삭제 완료' });
      loadTemplates();
    } catch (e: any) {
      toast({ title: '삭제 실패', description: e.message, variant: 'destructive' });
    }
  };

  const handleApplyToBrandChannel = async () => {
    if (!selectedBrandChannelId) {
      toast({ title: '바인딩할 브랜드 채널을 선택해주세요.', variant: 'destructive' });
      return;
    }
    setIsBindingChannel(true);
    try {
      await api.post('/channel-dna/templates/apply-to-channel', {
        channel_id: selectedBrandChannelId,
        layout: layout
      });
      const chName = brandChannels.find(c => c.id === selectedBrandChannelId)?.title || '선택한 채널';
      toast({
        title: '🚀 브랜드 채널 기본 템플릿 지정 완료!',
        description: `'${chName}' 채널의 무인 쇼츠 제작 규격(Blueprint)으로 영구 적용되었습니다.`
      });
    } catch (e: any) {
      toast({ title: '채널 적용 실패', description: e.message, variant: 'destructive' });
    } finally {
      setIsBindingChannel(false);
    }
  };

  // Mouse Drag Handler on Canvas
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const pct = Math.max(0, Math.min(100, (relativeY / rect.height) * 100));

      if (isDragging === 'headerBar') {
        const clamped = Math.max(8, Math.min(35, parseFloat(pct.toFixed(1))));
        setLayout(prev => ({ ...prev, topBarHeightPct: clamped }));
      } else if (isDragging === 'bottomBar') {
        const bottomPct = Math.max(2, Math.min(20, parseFloat((100 - pct).toFixed(1))));
        setLayout(prev => ({ ...prev, bottomBarHeightPct: bottomPct }));
      } else if (isDragging === 'topTitle') {
        const clamped = Math.max(1, Math.min(30, parseFloat(pct.toFixed(1))));
        setLayout(prev => ({ ...prev, topTitleYPct: clamped }));
      } else if (isDragging === 'subtitle') {
        const clamped = Math.max(50, Math.min(90, parseFloat(pct.toFixed(1))));
        setLayout(prev => ({ ...prev, subtitleYPercent: clamped }));
      } else if (isDragging === 'jab') {
        const clamped = Math.max(15, Math.min(65, parseFloat(pct.toFixed(1))));
        setLayout(prev => ({ ...prev, jabYPercent: clamped }));
      } else if (isDragging === 'bottomSource') {
        const bottomPct = Math.max(1, Math.min(15, parseFloat((100 - pct).toFixed(1))));
        setLayout(prev => ({ ...prev, bottomSourceBottomPct: bottomPct }));
      }
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Motion Subtitle Render Simulation
  const renderSimulatedSubtitle = () => {
    const words = ["오늘도", "여동생", "곁을", "철벽", "방어하는데"];
    const activeWordIdx = Math.floor((motionFrame / 60) * words.length);

    if (layout.subtitleMotionPreset === 'word_pop') {
      return (
        <div className="flex flex-wrap items-center justify-center gap-1.5 px-3">
          {words.map((w, idx) => {
            const isPop = idx === activeWordIdx;
            return (
              <span
                key={idx}
                style={{
                  color: isPop ? '#F5F420' : layout.subtitleColor,
                  transform: isPop ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  display: 'inline-block'
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      );
    } else if (layout.subtitleMotionPreset === 'karaoke') {
      return (
        <div className="flex flex-wrap items-center justify-center gap-1 px-3">
          {words.map((w, idx) => {
            const isLit = idx <= activeWordIdx;
            return (
              <span
                key={idx}
                style={{
                  color: isLit ? '#F5F420' : 'rgba(255,255,255,0.45)',
                  textShadow: isLit ? '0 0 12px rgba(245, 244, 32, 0.8)' : 'none',
                  transition: 'all 0.1s ease-out'
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      );
    } else if (layout.subtitleMotionPreset === 'smooth_slide') {
      return (
        <div 
          className="transition-transform duration-300 ease-out"
          style={{ transform: `translateY(${((motionFrame % 20) / 20) * -2}px)` }}
        >
          {words.join(" ")}
        </div>
      );
    } else if (layout.subtitleMotionPreset === 'typewriter') {
      const fullText = words.join(" ");
      const charsToShow = Math.max(1, Math.floor((motionFrame / 60) * fullText.length));
      return (
        <div>
          {fullText.slice(0, charsToShow)}
          <span className="animate-pulse">|</span>
        </div>
      );
    }
    return <div>{words.join(" ")}</div>;
  };

  return (
    <div className="w-full space-y-6">
      {/* 🌟 Top Header: Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <LayoutTemplate className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">쇼츠 템플릿 디자인 스튜디오</h1>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/30 text-xs px-2.5 py-0.5 font-semibold">
                  6-Layer Sovereign Studio
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                상하단 바·타이틀·자막·쨉쨉이·출처를 6개 독립 레이어로 조합하고, 자막 모션과 인물 줌 뷰포트를 정밀 조율합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Brand Channel Binding Bar */}
        <div className="flex items-center gap-2.5 bg-card/80 backdrop-blur-md p-2 rounded-xl border border-border/70 shadow-xs">
          <div className="text-xs text-muted-foreground font-medium pl-1 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-primary" /> 채널 바인딩:
          </div>
          <select
            value={selectedBrandChannelId || ''}
            onChange={e => setSelectedBrandChannelId(Number(e.target.value))}
            className="h-8 text-xs rounded-lg bg-background border border-border px-2.5 py-1 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            {brandChannels.length === 0 ? (
              <option value="">등록된 브랜드 채널 없음</option>
            ) : (
              brandChannels.map(ch => (
                <option key={ch.id} value={ch.id}>
                  👑 {ch.title}
                </option>
              ))
            )}
          </select>
          <Button
            size="sm"
            onClick={handleApplyToBrandChannel}
            disabled={isBindingChannel || !selectedBrandChannelId}
            className="h-8 text-xs font-semibold px-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-all"
          >
            {isBindingChannel ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
            이 채널에 템플릿 적용
          </Button>
        </div>
      </div>

      {/* 📚 템플릿 프리셋 선택기 & 신규 저장 바 */}
      <Card className="bg-card/70 backdrop-blur-md border-border/70 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Presets Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1">템플릿 프리셋:</span>
              {templates.map(tpl => {
                const isSelected = selectedTemplateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`group relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-background hover:bg-accent text-muted-foreground hover:text-foreground border-border/80'
                    }`}
                  >
                    <span>{tpl.name}</span>
                    {tpl.badge && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-sm ${isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {tpl.badge}
                      </span>
                    )}
                    {!tpl.is_system && (
                      <span 
                        onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity ml-1"
                        title="템플릿 삭제"
                      >
                        ×
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Save Current as New Template */}
            <div className="flex items-center gap-2">
              <Input
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
                placeholder="새 템플릿 이름 입력..."
                className="h-8 text-xs w-48 bg-background border-border"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveNewTemplate}
                disabled={isSavingTemplate || !newTemplateName.trim()}
                className="h-8 text-xs border-border/80 hover:bg-accent"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> 새 템플릿 저장
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🚀 Main Workspace: 2-Column Grid (Left: 6-Layer Inspector | Right: 9:16 Canvas & Comparison) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 6-Layer Independent Stack Inspector (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Layer Selector Tabs */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 bg-muted/60 p-1.5 rounded-xl border border-border/60">
            {[
              { id: 'topTitle', label: '타이틀 텍스트', icon: Type, enabled: layout.hasTopTitle },
              { id: 'topBarBg', label: '상단 배경 바', icon: Layout, enabled: layout.hasTopBarBg },
              { id: 'subtitle', label: '본문 자막', icon: Sparkles, enabled: layout.hasSubtitle },
              { id: 'jab', label: '긴박 쨉쨉이', icon: Zap, enabled: layout.hasJab },
              { id: 'bottomSource', label: '하단 출처', icon: Globe, enabled: layout.hasBottomSource },
              { id: 'video', label: '비디오/줌', icon: Video, enabled: true },
            ].map(tab => {
              const isSelected = activeLayer === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveLayer(tab.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-card text-foreground border-primary/50 shadow-xs ring-1 ring-primary/20'
                      : 'text-muted-foreground hover:text-foreground border-transparent hover:bg-background/60'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <tab.icon className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`w-1.5 h-1.5 rounded-full ${tab.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                  </div>
                  <span className="text-[11px] truncate w-full text-center">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 🧩 Tab 1: 상단 타이틀 텍스트 (Top Title - 상단 바와 완전 독립) */}
          {activeLayer === 'topTitle' && (
            <Card className="border-border/70 shadow-xs bg-card/80 backdrop-blur-md">
              <CardHeader className="p-4 pb-3 border-b border-border/50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    <Type className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">상단 타이틀 텍스트 (독립 레이어)</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">상단 바 없이도 영상 위에 직접 렌더링되며, 형광펜/알약 배경을 입힐 수 있습니다.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px] font-mono bg-background">
                    Y: {layout.topTitleYPct}%
                  </Badge>
                  <Switch
                    checked={layout.hasTopTitle}
                    onCheckedChange={v => setLayout(p => ({ ...p, hasTopTitle: v }))}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* 1줄 / 2줄 텍스트 입력 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">1줄 텍스트 (상황/조건문)</Label>
                    <Input
                      value={layout.titleLine1}
                      onChange={e => setLayout(p => ({ ...p, titleLine1: e.target.value }))}
                      className="h-8 text-xs bg-background"
                      placeholder="여돌들 중 누가"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">2줄 텍스트 (핵심 후킹 명사)</Label>
                    <Input
                      value={layout.titleLine2}
                      onChange={e => setLayout(p => ({ ...p, titleLine2: e.target.value }))}
                      className="h-8 text-xs bg-background font-bold"
                      placeholder="진짜 대식가일까?"
                    />
                  </div>
                </div>

                {/* 폰트 & 폰트 사이즈 (1줄 & 2줄 개별 조절) */}
                <div className="space-y-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">타이틀 폰트 패밀리</Label>
                      <select
                        value={layout.titleFontFamily}
                        onChange={e => setLayout(p => ({ ...p, titleFontFamily: e.target.value }))}
                        className="h-8 text-xs rounded-lg bg-background border border-border px-2 w-full text-foreground"
                      >
                        {AVAILABLE_FONTS.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-muted-foreground">1줄 크기: {layout.titleLine1SizePx}px</Label>
                        <span className="text-[10px] text-muted-foreground font-mono">기준 {benchmarkSpec.titleLine1SizePx}px</span>
                      </div>
                      <Slider
                        value={[layout.titleLine1SizePx]}
                        min={16}
                        max={48}
                        step={1}
                        onValueChange={([v]) => setLayout(p => ({ ...p, titleLine1SizePx: v }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-muted-foreground">2줄 크기: {layout.titleLine2SizePx}px</Label>
                        <span className="text-[10px] text-amber-500 font-mono">기준 {benchmarkSpec.titleLine2SizePx}px</span>
                      </div>
                      <Slider
                        value={[layout.titleLine2SizePx]}
                        min={18}
                        max={56}
                        step={1}
                        onValueChange={([v]) => setLayout(p => ({ ...p, titleLine2SizePx: v }))}
                      />
                    </div>
                  </div>

                  {/* 색상 지정 */}
                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">1줄 색상:</Label>
                      <input
                        type="color"
                        value={layout.titleLine1Color}
                        onChange={e => setLayout(p => ({ ...p, titleLine1Color: e.target.value }))}
                        className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">2줄 강조색:</Label>
                      <input
                        type="color"
                        value={layout.titleLine2Color}
                        onChange={e => setLayout(p => ({ ...p, titleLine2Color: e.target.value }))}
                        className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                      />
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <Label className="text-xs text-muted-foreground">글자 외곽선 & 그림자:</Label>
                      <Switch
                        checked={layout.titleShadow}
                        onCheckedChange={v => setLayout(p => ({ ...p, titleShadow: v }))}
                      />
                    </div>
                  </div>
                </div>

                {/* 🌟 텍스트 자체 배경 박스/형광펜 커스텀 (상단 바 부재 시 극강의 시인성) */}
                <div className="space-y-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <Sparkle className="w-3.5 h-3.5" /> 글자 자체 배경 효과 (형광펜 / 알약 / 박스)
                    </Label>
                    <span className="text-[11px] text-muted-foreground">상단 바 없이 영상 위에 직배치 시 강력 추천</span>
                  </div>

                  {/* Mode Selector */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { id: 'none', label: '없음 (투명)' },
                      { id: 'pill', label: '알약형 (Pill)' },
                      { id: 'box', label: '각진 박스' },
                      { id: 'highlighter', label: '형광펜 마커' },
                      { id: 'glass', label: '아크릴 글래스' }
                    ].map(m => (
                      <button
                        key={m.id}
                        onClick={() => setLayout(p => ({ ...p, titleBgMode: m.id as any }))}
                        className={`py-1.5 text-xs rounded-lg border font-medium transition-all ${
                          layout.titleBgMode === m.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-background hover:bg-accent text-muted-foreground border-border/80'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {layout.titleBgMode !== 'none' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">배경 색상:</Label>
                        <input
                          type="color"
                          value={layout.titleBgColor}
                          onChange={e => setLayout(p => ({ ...p, titleBgColor: e.target.value }))}
                          className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">패딩(두께): {layout.titlePaddingX}px</Label>
                        <Slider
                          value={[layout.titlePaddingX]}
                          min={6}
                          max={32}
                          step={2}
                          onValueChange={([v]) => setLayout(p => ({ ...p, titlePaddingX: v }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">모서리 곡률: {layout.titleBorderRadius}px</Label>
                        <Slider
                          value={[layout.titleBorderRadius]}
                          min={0}
                          max={30}
                          step={2}
                          onValueChange={([v]) => setLayout(p => ({ ...p, titleBorderRadius: v }))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Y축 위치 슬라이더 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">타이틀 Y축 수직 위치: {layout.topTitleYPct}%</Label>
                    <span className="text-xs text-primary font-medium">캔버스에서 마우스로 직접 드래그 가능</span>
                  </div>
                  <Slider
                    value={[layout.topTitleYPct]}
                    min={1}
                    max={30}
                    step={0.5}
                    onValueChange={([v]) => setLayout(p => ({ ...p, topTitleYPct: v }))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 🧩 Tab 2: 상단 배경 바 (Top Bar Bg) */}
          {activeLayer === 'topBarBg' && (
            <Card className="border-border/70 shadow-xs bg-card/80 backdrop-blur-md">
              <CardHeader className="p-4 pb-3 border-b border-border/50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    <Layout className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">상단 배경 바 (레터박스)</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">쇼츠 상단에 안정적인 레터박스 영역을 생성합니다.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px] font-mono bg-background">
                    높이: {layout.topBarHeightPct}%
                  </Badge>
                  <Switch
                    checked={layout.hasTopBarBg}
                    onCheckedChange={v => setLayout(p => ({ ...p, hasTopBarBg: v }))}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs font-semibold text-muted-foreground">상단 바 배경색:</Label>
                    <input
                      type="color"
                      value={layout.topBarBg}
                      onChange={e => setLayout(p => ({ ...p, topBarBg: e.target.value }))}
                      className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                    />
                    <span className="text-xs font-mono">{layout.topBarBg}</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">투명도: {Math.round(layout.topBarOpacity * 100)}%</Label>
                    <Slider
                      value={[layout.topBarOpacity * 100]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={([v]) => setLayout(p => ({ ...p, topBarOpacity: v / 100 }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">상단 바 높이: {layout.topBarHeightPct}%</Label>
                    <span className="text-[10px] text-muted-foreground font-mono">벤치마크 기준 {benchmarkSpec.topBarHeightPct}%</span>
                  </div>
                  <Slider
                    value={[layout.topBarHeightPct]}
                    min={8}
                    max={35}
                    step={0.5}
                    onValueChange={([v]) => setLayout(p => ({ ...p, topBarHeightPct: v }))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    💡 캔버스에서 상단 바의 하단 경계선을 마우스로 직접 잡고 위아래로 늘리거나 줄일 수 있습니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 🧩 Tab 3: 본문 자막 & 동적 모션 엔진 (Subtitles) */}
          {activeLayer === 'subtitle' && (
            <Card className="border-border/70 shadow-xs bg-card/80 backdrop-blur-md">
              <CardHeader className="p-4 pb-3 border-b border-border/50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">본문 자막 & 쇼츠 동적 모션 엔진</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">단어별 팝업 바운스, 가라오케 하이라이트 등 쇼츠 최적화 애니메이션을 제공합니다.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px] font-mono bg-background">
                    Y: {layout.subtitleYPercent}%
                  </Badge>
                  <Switch
                    checked={layout.hasSubtitle}
                    onCheckedChange={v => setLayout(p => ({ ...p, hasSubtitle: v }))}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* 🌟 5대 동적 자막 모션 선택기 */}
                <div className="space-y-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5" /> 쇼츠 인기 자막 애니메이션 프리셋
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsPlayingMotion(!isPlayingMotion)}
                      className="h-6 text-[11px] px-2 text-amber-600 hover:bg-amber-500/10"
                    >
                      {isPlayingMotion ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                      {isPlayingMotion ? '모션 일시정지' : '모션 재생'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {[
                      { id: 'word_pop', label: '단어 팝업 바운스', desc: 'MrBeast 시그니처' },
                      { id: 'karaoke', label: '가라오케 하이라이트', desc: '단어별 불켜짐' },
                      { id: 'smooth_slide', label: '스무스 슬라이드', desc: '부드러운 지식형' },
                      { id: 'typewriter', label: '타자기 효과', desc: '야담/미스터리' },
                      { id: 'static', label: '클래식 고정', desc: '깔끔한 스탠다드' }
                    ].map(m => (
                      <button
                        key={m.id}
                        onClick={() => setLayout(p => ({ ...p, subtitleMotionPreset: m.id as any }))}
                        className={`p-2 text-left rounded-lg border transition-all ${
                          layout.subtitleMotionPreset === m.id
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                            : 'bg-background hover:bg-accent text-muted-foreground border-border/80'
                        }`}
                      >
                        <div className="font-bold text-xs truncate">{m.label}</div>
                        <div className="text-[10px] opacity-80 truncate">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 폰트, 크기, 외곽선 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">자막 폰트 패밀리</Label>
                    <select
                      value={layout.subtitleFontFamily}
                      onChange={e => setLayout(p => ({ ...p, subtitleFontFamily: e.target.value }))}
                      className="h-8 text-xs rounded-lg bg-background border border-border px-2 w-full text-foreground"
                    >
                      {AVAILABLE_FONTS.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-muted-foreground">자막 크기: {layout.subtitleFontSize}px</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">기준 {benchmarkSpec.subtitleFontSize}px</span>
                    </div>
                    <Slider
                      value={[layout.subtitleFontSize]}
                      min={16}
                      max={40}
                      step={1}
                      onValueChange={([v]) => setLayout(p => ({ ...p, subtitleFontSize: v }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">외곽선 두께: {layout.subtitleStrokeWidth}px</Label>
                    <Slider
                      value={[layout.subtitleStrokeWidth]}
                      min={0}
                      max={8}
                      step={1}
                      onValueChange={([v]) => setLayout(p => ({ ...p, subtitleStrokeWidth: v }))}
                    />
                  </div>
                </div>

                {/* 색상 및 위치 */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">글자색:</Label>
                    <input
                      type="color"
                      value={layout.subtitleColor}
                      onChange={e => setLayout(p => ({ ...p, subtitleColor: e.target.value }))}
                      className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">외곽선 스트로크:</Label>
                    <input
                      type="color"
                      value={layout.subtitleStrokeColor}
                      onChange={e => setLayout(p => ({ ...p, subtitleStrokeColor: e.target.value }))}
                      className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <Label className="text-xs text-muted-foreground">반투명 배경 박스:</Label>
                    <Switch
                      checked={layout.subtitleHasPillBg}
                      onCheckedChange={v => setLayout(p => ({ ...p, subtitleHasPillBg: v }))}
                    />
                  </div>
                </div>

                {/* Y축 위치 슬라이더 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">자막 Y축 수직 위치: {layout.subtitleYPercent}%</Label>
                    <span className="text-xs text-emerald-500 font-medium">유튜브 쇼츠 UI 최적 세이프존 (65%~75%)</span>
                  </div>
                  <Slider
                    value={[layout.subtitleYPercent]}
                    min={50}
                    max={90}
                    step={0.5}
                    onValueChange={([v]) => setLayout(p => ({ ...p, subtitleYPercent: v }))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 🧩 Tab 4: 긴박 쨉쨉이 (Jab Hook) */}
          {activeLayer === 'jab' && (
            <Card className="border-border/70 shadow-xs bg-card/80 backdrop-blur-md">
              <CardHeader className="p-4 pb-3 border-b border-border/50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">긴박 쨉쨉이 (Jab Hook - 찰나의 후킹 배지)</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">인물의 리액션이나 반전 순간에 화면에 팍 꽂히는 틸트 배지입니다.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px] font-mono bg-background">
                    틸트: {layout.jabTiltDeg}° · Y: {layout.jabYPercent}%
                  </Badge>
                  <Switch
                    checked={layout.hasJab}
                    onCheckedChange={v => setLayout(p => ({ ...p, hasJab: v }))}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">쨉쨉이 문구 예시</Label>
                    <Input
                      value={layout.jabText}
                      onChange={e => setLayout(p => ({ ...p, jabText: e.target.value }))}
                      className="h-8 text-xs bg-background"
                      placeholder="*여동생을 향해 전력 질주*"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">쨉쨉이 폰트 패밀리</Label>
                    <select
                      value={layout.jabFontFamily}
                      onChange={e => setLayout(p => ({ ...p, jabFontFamily: e.target.value }))}
                      className="h-8 text-xs rounded-lg bg-background border border-border px-2 w-full text-foreground"
                    >
                      {AVAILABLE_FONTS.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-muted-foreground">다이내믹 틸트 회전각: {layout.jabTiltDeg}°</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">기준 {benchmarkSpec.jabTiltDeg}°</span>
                    </div>
                    <Slider
                      value={[layout.jabTiltDeg]}
                      min={-12}
                      max={12}
                      step={1}
                      onValueChange={([v]) => setLayout(p => ({ ...p, jabTiltDeg: v }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">쨉쨉이 크기: {layout.jabFontSize}px</Label>
                    <Slider
                      value={[layout.jabFontSize]}
                      min={14}
                      max={36}
                      step={1}
                      onValueChange={([v]) => setLayout(p => ({ ...p, jabFontSize: v }))}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">글자/테두리 색:</Label>
                    <input
                      type="color"
                      value={layout.jabColor}
                      onChange={e => setLayout(p => ({ ...p, jabColor: e.target.value, jabBorderColor: e.target.value }))}
                      className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">배경 박스색:</Label>
                    <input
                      type="color"
                      value={layout.jabBgColor}
                      onChange={e => setLayout(p => ({ ...p, jabBgColor: e.target.value }))}
                      className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">쨉쨉이 Y축 수직 위치: {layout.jabYPercent}%</Label>
                  <Slider
                    value={[layout.jabYPercent]}
                    min={15}
                    max={65}
                    step={0.5}
                    onValueChange={([v]) => setLayout(p => ({ ...p, jabYPercent: v }))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 🧩 Tab 5: 하단 출처 표기 & 하단 바 (Bottom Source & Bottom Bar) */}
          {activeLayer === 'bottomSource' && (
            <div className="space-y-4">
              {/* 하단 출처 텍스트 */}
              <Card className="border-border/70 shadow-xs bg-card/80 backdrop-blur-md">
                <CardHeader className="p-4 pb-3 border-b border-border/50 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">하단 출처 표기 (독립 레이어)</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">하단 바 유무와 관계없이 영상 하단에 자막처럼 안전하게 출처를 명시합니다.</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={layout.hasBottomSource}
                    onCheckedChange={v => setLayout(p => ({ ...p, hasBottomSource: v }))}
                  />
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">출처 텍스트 문구</Label>
                    <Input
                      value={layout.bottomSourceText}
                      onChange={e => setLayout(p => ({ ...p, bottomSourceText: e.target.value }))}
                      className="h-8 text-xs bg-background"
                      placeholder="출처: 원본 비하인드 공식 영상"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">폰트 크기: {layout.bottomSourceSizePx}px</Label>
                      <Slider
                        value={[layout.bottomSourceSizePx]}
                        min={10}
                        max={20}
                        step={1}
                        onValueChange={([v]) => setLayout(p => ({ ...p, bottomSourceSizePx: v }))}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-xs text-muted-foreground">글자색:</Label>
                      <input
                        type="color"
                        value={layout.bottomSourceColor}
                        onChange={e => setLayout(p => ({ ...p, bottomSourceColor: e.target.value }))}
                        className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                      />
                      <span className="text-xs font-mono">{layout.bottomSourceColor}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 하단 배경 바 */}
              <Card className="border-border/70 shadow-xs bg-card/80 backdrop-blur-md">
                <CardHeader className="p-4 pb-3 border-b border-border/50 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <Layout className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">하단 배경 바 (레터박스)</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">쇼츠 하단에 레터박스를 배치하여 안정감을 줍니다.</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[11px] font-mono bg-background">
                      높이: {layout.bottomBarHeightPct}%
                    </Badge>
                    <Switch
                      checked={layout.hasBottomBarBg}
                      onCheckedChange={v => setLayout(p => ({ ...p, hasBottomBarBg: v }))}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="flex items-center gap-3">
                      <Label className="text-xs font-semibold text-muted-foreground">하단 바 배경색:</Label>
                      <input
                        type="color"
                        value={layout.bottomBarBg}
                        onChange={e => setLayout(p => ({ ...p, bottomBarBg: e.target.value }))}
                        className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-muted-foreground">하단 바 높이: {layout.bottomBarHeightPct}%</Label>
                        <span className="text-[10px] text-muted-foreground font-mono">기준 {benchmarkSpec.bottomBarHeightPct}%</span>
                      </div>
                      <Slider
                        value={[layout.bottomBarHeightPct]}
                        min={2}
                        max={16}
                        step={0.5}
                        onValueChange={([v]) => setLayout(p => ({ ...p, bottomBarHeightPct: v }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 🧩 Tab 6: 비디오 캔버스 핏 & 연예인 얼굴 줌 마스크 */}
          {activeLayer === 'video' && (
            <Card className="border-border/70 shadow-xs bg-card/80 backdrop-blur-md">
              <CardHeader className="p-4 pb-3 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">비디오 핏 & 인물 확대 줌 마스크</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">상하단 바 사이 빈틈없이 정확하게 핏되거나, 인물 얼굴을 적절히 클로즈업합니다.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* 샌드위치 핏 vs 풀스크린 오버레이 토글 */}
                <div className="space-y-2 p-3 rounded-xl bg-muted/40 border border-border/50">
                  <Label className="text-xs font-bold text-foreground">비디오 배치 방식 (Placement Mode)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setLayout(p => ({ ...p, videoFitMode: 'sandwich' }))}
                      className={`p-3 rounded-lg text-left border transition-all ${
                        layout.videoFitMode === 'sandwich'
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-background hover:bg-accent text-muted-foreground border-border/80'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <span>🥪 샌드위치 핏 (추천)</span>
                      </div>
                      <p className="text-[11px] opacity-80 mt-1">
                        상·하단 바 사이의 남은 공간에 1픽셀 오차 없이 완벽 핏 (가림 0%)
                      </p>
                    </button>

                    <button
                      onClick={() => setLayout(p => ({ ...p, videoFitMode: 'fullscreen' }))}
                      className={`p-3 rounded-lg text-left border transition-all ${
                        layout.videoFitMode === 'fullscreen'
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-background hover:bg-accent text-muted-foreground border-border/80'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <span>📱 풀스크린 오버레이</span>
                      </div>
                      <p className="text-[11px] opacity-80 mt-1">
                        9:16 전체 화면을 영상으로 꽉 채우고 그 위에 바/자막 오버레이
                      </p>
                    </button>
                  </div>
                </div>

                {/* 👤 연예인 얼굴 확대 줌 & Y축 포커스 정렬 */}
                <div className="space-y-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <ZoomIn className="w-3.5 h-3.5" /> 연예인 얼굴 줌 & 마스크 뷰포트
                    </Label>
                    <span className="text-[11px] text-muted-foreground">상·하단 바를 뚫고 나가지 않고 안전하게 확대</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-muted-foreground">인물 확대 배율: {layout.videoZoomScale}%</Label>
                        <span className="text-[10px] text-muted-foreground font-mono">100% ~ 200%</span>
                      </div>
                      <Slider
                        value={[layout.videoZoomScale]}
                        min={100}
                        max={180}
                        step={2}
                        onValueChange={([v]) => setLayout(p => ({ ...p, videoZoomScale: v }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-muted-foreground">얼굴 중심 Y축 정렬: {layout.videoFocusYPct}%</Label>
                        <span className="text-[10px] text-muted-foreground font-mono">상/하단 오프셋</span>
                      </div>
                      <Slider
                        value={[layout.videoFocusYPct]}
                        min={20}
                        max={80}
                        step={2}
                        onValueChange={([v]) => setLayout(p => ({ ...p, videoFocusYPct: v }))}
                      />
                    </div>
                  </div>
                </div>

                {/* 시네마틱 필터 및 효과 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    { id: 'none', label: '필터 없음' },
                    { id: 'grain', label: '필름 그레인' },
                    { id: 'vintage', label: '빈티지 웜톤' },
                    { id: 'noir', label: '시네마틱 누아르' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setLayout(p => ({ ...p, filmFilter: f.id as any }))}
                      className={`py-1.5 text-xs rounded-lg border font-medium transition-all ${
                        layout.filmFilter === f.id
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-background hover:bg-accent text-muted-foreground border-border/80'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <Label className="text-xs text-muted-foreground">좌우 반전(미러링):</Label>
                  <Switch
                    checked={layout.enableHorizontalFlip}
                    onCheckedChange={v => setLayout(p => ({ ...p, enableHorizontalFlip: v }))}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: 9:16 Canvas & Comparison Studio (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center space-y-4">
          {/* Comparison Mode Toolbar */}
          <div className="flex items-center justify-between gap-1 bg-card/80 backdrop-blur-md p-1.5 rounded-xl border border-border/70 shadow-xs w-full max-w-[360px] select-none">
            {[
              { id: 'preview', label: '내 디자인', icon: Eye },
              { id: 'original', label: '원본 화면', icon: Video },
              { id: 'split', label: 'A/B 분할', icon: Split },
              { id: 'onion', label: '겹쳐보기', icon: Layers }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setCompareMode(m.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  compareMode === m.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <m.icon className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Live Diff HUD Bar (Fixed height, no wrapping to prevent layout shift) */}
          <div className="h-7 px-3.5 flex items-center justify-center gap-2.5 bg-muted/70 backdrop-blur-md rounded-full border border-border/80 text-[11px] font-mono text-muted-foreground whitespace-nowrap shadow-2xs select-none">
            <span className="flex items-center gap-1">
              <span className="text-foreground font-semibold">헤더:</span>
              <span>{layout.topBarHeightPct}%</span>
              <span className={`text-[10px] font-medium ${layout.topBarHeightPct === benchmarkSpec.topBarHeightPct ? 'text-emerald-500' : 'text-amber-500'}`}>
                ({layout.topBarHeightPct === benchmarkSpec.topBarHeightPct ? '일치' : `${(layout.topBarHeightPct - benchmarkSpec.topBarHeightPct) > 0 ? '+' : ''}${(layout.topBarHeightPct - benchmarkSpec.topBarHeightPct).toFixed(1)}%`})
              </span>
            </span>
            <span className="text-border/80 font-normal">|</span>
            <span className="flex items-center gap-1">
              <span className="text-foreground font-semibold">타이틀:</span>
              <span>{layout.titleLine2SizePx}px</span>
              <span className={`text-[10px] font-medium ${layout.titleLine2SizePx === benchmarkSpec.titleLine2SizePx ? 'text-emerald-500' : 'text-amber-500'}`}>
                ({layout.titleLine2SizePx === benchmarkSpec.titleLine2SizePx ? '일치' : `${(layout.titleLine2SizePx - benchmarkSpec.titleLine2SizePx) > 0 ? '+' : ''}${layout.titleLine2SizePx - benchmarkSpec.titleLine2SizePx}px`})
              </span>
            </span>
            <span className="text-border/80 font-normal">|</span>
            <span className="flex items-center gap-1">
              <span className="text-foreground font-semibold">자막 Y:</span>
              <span>{layout.subtitleYPercent}%</span>
            </span>
          </div>

          {/* 📱 9:16 Smartphone Mockup Canvas */}
          <div className="relative p-2.5 rounded-[44px] bg-slate-950 border-[6px] border-slate-800 shadow-2xl shadow-indigo-500/10">
            {/* Dynamic Island Speaker Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full z-50 flex items-center justify-end px-2">
              <div className="w-2 h-2 rounded-full bg-slate-800" />
            </div>

            {/* Screen Viewport (w: 300px, h: 533px -> 9:16) */}
            <div
              ref={canvasRef}
              className="relative w-[300px] h-[533px] rounded-[34px] overflow-hidden bg-black select-none"
            >
              {/* 🎬 Video Layer (Sandwich Fit vs Fullscreen) */}
              {(() => {
                const topOffset = layout.videoFitMode === 'sandwich' && layout.hasTopBarBg ? layout.topBarHeightPct : 0;
                const bottomOffset = layout.videoFitMode === 'sandwich' && layout.hasBottomBarBg ? layout.bottomBarHeightPct : 0;
                const mediaHeight = 100 - topOffset - bottomOffset;

                return (
                  <div
                    style={{
                      position: 'absolute',
                      top: `${topOffset}%`,
                      height: `${mediaHeight}%`,
                      left: 0,
                      right: 0,
                      overflow: 'hidden',
                      transition: isDragging ? 'none' : 'all 0.2s ease-out'
                    }}
                  >
                    {/* Inner scaled image/video for Face Zoom */}
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundImage: 'radial-gradient(ellipse at center, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 1) 100%)',
                        backgroundPosition: `center ${layout.videoFocusYPct}%`,
                        backgroundSize: 'cover',
                        transform: `scale(${layout.videoZoomScale / 100}) ${layout.enableHorizontalFlip ? 'scaleX(-1)' : ''}`,
                        transformOrigin: `center ${layout.videoFocusYPct}%`,
                        filter: layout.filmFilter === 'grain' ? 'contrast(1.15)' : layout.filmFilter === 'vintage' ? 'sepia(0.2) contrast(1.1)' : 'none',
                        transition: 'transform 0.15s ease-out'
                      }}
                      className="flex items-center justify-center text-slate-500 text-xs"
                    >
                      <div className="text-center p-4">
                        <Video className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                        <span className="text-[11px] font-medium text-slate-400">
                          {layout.videoFitMode === 'sandwich' ? '[샌드위치 핏 뷰포트]' : '[풀스크린 뷰포트]'}
                        </span>
                        <div className="text-[10px] text-slate-600 mt-0.5">얼굴 줌: {layout.videoZoomScale}%</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* [Layer 1: 상단 배경 바] */}
              {layout.hasTopBarBg && (
                <div
                  onClick={() => setActiveLayer('topBarBg')}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${layout.topBarHeightPct}%`,
                    backgroundColor: layout.topBarBg,
                    opacity: layout.topBarOpacity,
                    zIndex: 20
                  }}
                  className={`cursor-pointer transition-all ${activeLayer === 'topBarBg' ? 'ring-2 ring-primary ring-inset' : ''}`}
                >
                  {/* Resizer Handle */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setIsDragging('headerBar');
                    }}
                    className="absolute bottom-0 left-0 right-0 h-3 cursor-row-resize flex items-center justify-center group z-30"
                    title="마우스로 상단 바 높이 조절"
                  >
                    <div className="w-12 h-1 bg-primary/70 rounded-full group-hover:bg-primary transition-colors" />
                  </div>
                </div>
              )}

              {/* [Layer 2: 상단 타이틀 텍스트 (상단 바와 독립)] */}
              {layout.hasTopTitle && (
                <div
                  onClick={() => setActiveLayer('topTitle')}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDragging('topTitle');
                  }}
                  style={{
                    position: 'absolute',
                    top: `${layout.topTitleYPct}%`,
                    left: 0,
                    right: 0,
                    zIndex: 35,
                    cursor: 'grab'
                  }}
                  className={`flex flex-col items-center justify-center text-center px-3 select-none ${
                    activeLayer === 'topTitle' ? 'ring-2 ring-indigo-500 rounded-xl p-1 bg-indigo-500/10' : ''
                  }`}
                >
                  {/* 텍스트 자체 배경 효과 (형광펜 / 알약 / 박스) */}
                  <div
                    style={{
                      backgroundColor: layout.titleBgMode !== 'none' ? layout.titleBgColor : 'transparent',
                      opacity: layout.titleBgMode !== 'none' ? layout.titleBgOpacity : 1,
                      paddingLeft: layout.titleBgMode !== 'none' ? `${layout.titlePaddingX}px` : 0,
                      paddingRight: layout.titleBgMode !== 'none' ? `${layout.titlePaddingX}px` : 0,
                      paddingTop: layout.titleBgMode !== 'none' ? `${layout.titlePaddingY}px` : 0,
                      paddingBottom: layout.titleBgMode !== 'none' ? `${layout.titlePaddingY}px` : 0,
                      borderRadius: layout.titleBgMode === 'pill' ? '9999px' : `${layout.titleBorderRadius}px`,
                      boxShadow: layout.titleShadow ? '0 4px 16px rgba(0,0,0,0.7)' : 'none'
                    }}
                    className="inline-flex flex-col items-center"
                  >
                    {layout.titleLine1 && layout.titleLine1.trim() !== '' && (
                      <div
                        style={{
                          fontFamily: layout.titleFontFamily,
                          fontSize: `${layout.titleLine1SizePx * 0.58}px`,
                          color: layout.titleLine1Color,
                          fontWeight: 800,
                          lineHeight: 1.15,
                          textShadow: layout.titleShadow ? '0 2px 6px rgba(0,0,0,0.9)' : 'none'
                        }}
                      >
                        {layout.titleLine1}
                      </div>
                    )}
                    <div
                      style={{
                        fontFamily: layout.titleFontFamily,
                        fontSize: `${layout.titleLine2SizePx * 0.58}px`,
                        color: layout.titleLine2Color,
                        fontWeight: 900,
                        lineHeight: 1.15,
                        textShadow: layout.titleShadow ? '0 2px 8px rgba(0,0,0,0.9)' : 'none'
                      }}
                    >
                      {layout.titleLine2}
                    </div>
                  </div>
                </div>
              )}

              {/* [Layer 4: 긴박 쨉쨉이 (Jab Hook)] */}
              {layout.hasJab && (
                <div
                  onClick={() => setActiveLayer('jab')}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDragging('jab');
                  }}
                  style={{
                    position: 'absolute',
                    top: `${layout.jabYPercent}%`,
                    left: 0,
                    right: 0,
                    zIndex: 40,
                    cursor: 'grab',
                    transform: `rotate(${layout.jabTiltDeg}deg)`
                  }}
                  className={`flex items-center justify-center select-none ${
                    activeLayer === 'jab' ? 'ring-2 ring-yellow-500 rounded-lg p-0.5' : ''
                  }`}
                >
                  <div
                    style={{
                      backgroundColor: layout.jabBgColor,
                      border: `2px solid ${layout.jabBorderColor}`,
                      borderRadius: 8,
                      padding: '4px 12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.9)'
                    }}
                  >
                    <span
                      style={{
                        fontFamily: layout.jabFontFamily,
                        fontSize: `${layout.jabFontSize * 0.6}px`,
                        color: layout.jabColor,
                        fontWeight: 900,
                        letterSpacing: '-0.5px'
                      }}
                    >
                      {layout.jabText}
                    </span>
                  </div>
                </div>
              )}

              {/* [Layer 3: 본문 자막 (동적 모션)] */}
              {layout.hasSubtitle && (
                <div
                  onClick={() => setActiveLayer('subtitle')}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDragging('subtitle');
                  }}
                  style={{
                    position: 'absolute',
                    top: `${layout.subtitleYPercent}%`,
                    left: 0,
                    right: 0,
                    zIndex: 45,
                    cursor: 'grab'
                  }}
                  className={`flex flex-col items-center justify-center select-none ${
                    activeLayer === 'subtitle' ? 'ring-2 ring-amber-500 rounded-xl p-1 bg-amber-500/10' : ''
                  }`}
                >
                  <div
                    style={{
                      fontFamily: layout.subtitleFontFamily,
                      fontSize: `${layout.subtitleFontSize * 0.62}px`,
                      color: layout.subtitleColor,
                      fontWeight: 800,
                      backgroundColor: layout.subtitleHasPillBg ? layout.subtitlePillBgColor : 'transparent',
                      padding: layout.subtitleHasPillBg ? '4px 12px' : 0,
                      borderRadius: 12,
                      textShadow: `0 2px 6px ${layout.subtitleStrokeColor}`
                    }}
                  >
                    {renderSimulatedSubtitle()}
                  </div>
                </div>
              )}

              {/* [Layer 5: 하단 출처 표기 (하단 바와 독립)] */}
              {layout.hasBottomSource && (
                <div
                  onClick={() => setActiveLayer('bottomSource')}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDragging('bottomSource');
                  }}
                  style={{
                    position: 'absolute',
                    bottom: `${layout.bottomSourceBottomPct}%`,
                    left: 0,
                    right: 0,
                    zIndex: 48,
                    cursor: 'grab'
                  }}
                  className={`flex items-center justify-center text-center px-2 select-none ${
                    activeLayer === 'bottomSource' ? 'ring-2 ring-emerald-500 rounded-md py-0.5' : ''
                  }`}
                >
                  <span
                    style={{
                      fontFamily: layout.bottomSourceFontFamily,
                      fontSize: `${layout.bottomSourceSizePx * 0.7}px`,
                      color: layout.bottomSourceColor,
                      textShadow: '0 1px 4px rgba(0,0,0,0.9)'
                    }}
                  >
                    {layout.bottomSourceText}
                  </span>
                </div>
              )}

              {/* [Layer 6: 하단 배경 바] */}
              {layout.hasBottomBarBg && (
                <div
                  onClick={() => setActiveLayer('bottomBarBg')}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${layout.bottomBarHeightPct}%`,
                    backgroundColor: layout.bottomBarBg,
                    opacity: layout.bottomBarOpacity,
                    zIndex: 20
                  }}
                  className={`cursor-pointer transition-all ${activeLayer === 'bottomBarBg' ? 'ring-2 ring-primary ring-inset' : ''}`}
                >
                  {/* Resizer Handle */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setIsDragging('bottomBar');
                    }}
                    className="absolute top-0 left-0 right-0 h-3 cursor-row-resize flex items-center justify-center group z-30"
                    title="마우스로 하단 바 높이 조절"
                  >
                    <div className="w-12 h-1 bg-primary/70 rounded-full group-hover:bg-primary transition-colors" />
                  </div>
                </div>
              )}

              {/* A/B Split Comparison Overlay */}
              {compareMode === 'split' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 50,
                    clipPath: `polygon(0 0, ${splitPos}% 0, ${splitPos}% 100%, 0 100%)`,
                    pointerEvents: 'none'
                  }}
                  className="bg-slate-900 flex flex-col justify-between p-3"
                >
                  <div className="text-[10px] font-bold text-amber-400 bg-black/80 px-2 py-0.5 rounded w-fit">
                    ◀ 벤치마크 원본 화면 (실측치)
                  </div>
                  <div className="text-[10px] text-slate-400 bg-black/80 px-2 py-0.5 rounded w-fit">
                    헤더 18.3% · 옐로우 30px · 쨉쨉이 -4°
                  </div>
                </div>
              )}

              {/* Onion Skin 50% Overlay */}
              {compareMode === 'onion' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 50,
                    opacity: onionOpacity / 100,
                    pointerEvents: 'none',
                    backgroundColor: 'rgba(245, 244, 32, 0.08)'
                  }}
                  className="border-2 border-dashed border-amber-400 flex items-center justify-center"
                >
                  <span className="text-xs font-bold text-amber-400 bg-black/80 px-2 py-1 rounded">
                    투시 오버레이 ({onionOpacity}%)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Split Slider Bar (if in split mode) */}
          {compareMode === 'split' && (
            <div className="w-full max-w-[300px] space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground font-mono">
                <span>원본 {splitPos}%</span>
                <span>내 디자인 {100 - splitPos}%</span>
              </div>
              <Slider
                value={[splitPos]}
                min={0}
                max={100}
                step={1}
                onValueChange={([v]) => setSplitPos(v)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShortsTemplateStudio;
