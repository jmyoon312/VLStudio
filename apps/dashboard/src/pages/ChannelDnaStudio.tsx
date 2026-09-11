import React, { useState, useEffect, useRef } from 'react';
import { 
  Dna, Sparkles, Wand2, Eye, Save, RefreshCw, 
  CheckCircle2, ArrowRight, Play, Sliders, Layout, 
  Type, Palette, Volume2, Film, Shield, Globe, 
  ChevronDown, ChevronUp, Copy, Plus, Compass,
  Flame, TrendingUp, Layers, Video, Award, Clock,
  Check, Info, Monitor, Smartphone, SlidersHorizontal,
  Split, EyeOff, MoveVertical, Move, ArrowLeftRight,
  Maximize2, Layers3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import ShortsTemplateStudio, { ShortsLayoutState, defaultLayoutState } from './ShortsTemplateStudio';

// 8대 유튜브/쇼츠 대표 상용 무료 폰트 에셋
const AVAILABLE_FONTS = [
  { id: 'Pretendard', name: 'Pretendard (프리텐다드 - 모던/깔끔)', family: "'Pretendard', sans-serif" },
  { id: 'Black Han Sans', name: 'Black Han Sans (검은고딕 - 강력한 훅)', family: "'Black Han Sans', sans-serif" },
  { id: 'Do Hyeon', name: 'Do Hyeon (배민 도현체 - 레트로 임팩트)', family: "'Do Hyeon', sans-serif" },
  { id: 'Jua', name: 'Jua (배민 주아체 - 부드러운 강조)', family: "'Jua', sans-serif" },
  { id: 'Wanted Sans', name: 'Wanted Sans (원티드 산스 - 테크/스타일리시)', family: "'Wanted Sans', sans-serif" },
  { id: 'Noto Sans KR', name: 'Noto Sans KR (본고딕 - 표준)', family: "'Noto Sans KR', sans-serif" },
];

export const ChannelDnaStudio: React.FC = () => {
  const { toast } = useToast();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'analysis' | 'suggestions' | 'layout' | 'deploy'>('analysis');

  // Analysis Inputs & State
  const [channelUrl, setChannelUrl] = useState('https://www.youtube.com/@FashionDetectiveNyan');
  const [sampleCount, setSampleCount] = useState(12);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState<any>(null);

  // Lego Block Layout Editor State (Default: Fashion Detective Nyan Spec)
  const [layout, setLayout] = useState<ShortsLayoutState>(defaultLayoutState);

  // 비교 뷰 모드 ('preview': 내 디자인 | 'original': 벤치마크 원본 | 'split': A/B 스플릿 | 'onion': 50% 어니언 스킨)
  const [compareMode, setCompareMode] = useState<'preview' | 'original' | 'split' | 'onion'>('preview');
  const [splitPos, setSplitPos] = useState(50); // Split % (0~100)
  const [onionOpacity, setOnionOpacity] = useState(50); // Onion skin %

  // 활성 레이어 선택 ('header' | 'subtitle' | 'jab' | 'bottom' | null)
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  // 마우스 드래그 상태
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'header' | 'bottom' | 'subtitle' | 'jab' | null>(null);

  const [showSafeZone, setShowSafeZone] = useState(true);
  const [brandChannelName, setBrandChannelName] = useState('아이돌 썰 탐정단');

  // Parse target channel or video asset from URL query parameter (Viral Scouter & Gallery bridge)
  useEffect(() => {
    try {
      const hashParts = window.location.hash.split('?');
      if (hashParts.length > 1) {
        const params = new URLSearchParams(hashParts[1]);
        const targetUrl = params.get('channel_url') || params.get('url');
        const targetName = params.get('channel_name') || params.get('name');
        const videoId = params.get('video_id');
        const videoTitle = params.get('video_title');

        if (targetUrl) {
          setChannelUrl(targetUrl);
          setActiveTab('analysis');
          toast({
            title: `🎯 ${targetName || '벤치마크 채널'} 타겟 로드 완료`,
            description: '12편 정밀 분석실에서 [12편 성공 공식 정밀 분석 시작] 버튼을 누르면 AI가 DNA를 즉시 해체합니다.',
          });
        } else if (videoId) {
          setActiveTab('layout');
          if (videoTitle) {
            const words = videoTitle.trim().split(' ');
            const mid = Math.ceil(words.length / 2);
            setLayout(prev => ({
              ...prev,
              titleLine1: words.slice(0, mid).join(' ') || '수집 영상 기반',
              titleLine2: words.slice(mid).join(' ') || '원클릭 쇼츠 제작',
              bottomCreditText: `출처: ${targetName || '수집 원본 영상'}`
            }));
          }
          toast({
            title: `🎬 원본 영상 자산 로드 완료 (#${videoId})`,
            description: '쇼츠 화면 디자인 스튜디오에서 실시간 9:16 프리뷰 확인 후 즉시 완제품을 렌더링하세요.',
          });
        }
      }
    } catch (e) {
      console.error('Failed to parse URL query in ChannelDnaStudio', e);
    }
  }, []);

  // Load latest benchmark if exists
  useEffect(() => {
    loadLatestBenchmark();
  }, []);

  const loadLatestBenchmark = async () => {
    try {
      const res = await api.get('/channel-dna/benchmarks');
      if (res.data?.items?.length > 0) {
        const latestId = res.data.items[0].id;
        const detailRes = await api.get(`/channel-dna/benchmarks/${latestId}`);
        if (detailRes.data?.data) {
          setBenchmarkData(detailRes.data.data);
          if (detailRes.data.data.custom_layout_preset) {
            applyDnaToLayout(detailRes.data.data);
          }
        }
      }
    } catch (e) {
      console.log('No previous benchmarks or api pending:', e);
    }
  };

  const applyDnaToLayout = (data: any) => {
    const v = data.visual_dna || {};
    setLayout(prev => ({
      ...prev,
      canvasType: v.canvas_type || prev.canvasType,
      videoFitMode: v.video_fit_mode || prev.videoFitMode || 'sandwich',
      videoZoomScale: v.video_zoom_scale || prev.videoZoomScale || 100,
      videoFocusYPct: v.video_focus_y_pct || prev.videoFocusYPct || 50,
      hasTopBarBg: v.has_top_bar_bg ?? v.has_top_header ?? true,
      topBarBg: v.top_bar_bg || v.header_bg || '#000000',
      topBarHeightPct: v.top_bar_height_pct || v.header_height_pct || 18.3,
      hasTopTitle: v.has_top_title ?? true,
      topTitleYPct: v.top_title_y_pct || 5.2,
      titleLine1: v.header_lines?.[0]?.text_example || prev.titleLine1,
      titleLine2: v.header_lines?.[1]?.text_example || prev.titleLine2,
      titleLine1Color: v.header_lines?.[0]?.color || '#FFFFFF',
      titleLine2Color: v.header_lines?.[1]?.color || '#F5F420',
      titleLine1SizePx: v.header_lines?.[0]?.size_px || 26,
      titleLine2SizePx: v.header_lines?.[1]?.size_px || 30,
      titleBgMode: v.title_bg_mode || 'none',
      hasSubtitle: v.has_subtitle ?? true,
      subtitleYPercent: v.subtitle?.y_percent || 68.5,
      subtitleColor: v.subtitle?.color || '#FFFFFF',
      subtitleFontSize: v.subtitle?.size_px || 22,
      subtitleMotionPreset: v.subtitle?.motion_preset || 'word_pop',
      hasJab: v.has_jab_hook ?? true,
      jabText: v.jab_hook?.text_example || prev.jabText,
      jabColor: v.jab_hook?.color || '#F5F420',
      jabTiltDeg: v.jab_hook?.tilt_deg || -4,
      jabYPercent: v.jab_hook?.y_percent || 41.4,
      jabFontSize: v.jab_hook?.size_px || 20,
      hasBottomSource: v.has_bottom_source ?? true,
      bottomSourceText: v.bottom_source?.text || prev.bottomSourceText,
      bottomSourceSizePx: v.bottom_source?.size_px || 12,
      hasBottomBarBg: v.has_bottom_bar_bg ?? v.has_bottom_bar ?? true,
      bottomBarBg: v.bottom_bar_bg || '#000000',
      bottomBarHeightPct: v.bottom_bar_height_pct || 6.0
    }));
  };

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await api.post('/channel-dna/analyze', {
        channel_url: channelUrl,
        sample_count: sampleCount
      });
      if (res.data?.data) {
        setBenchmarkData(res.data.data);
        applyDnaToLayout(res.data.data);
        toast({
          title: '🎉 채널 DNA 12편 정밀 분석 완료!',
          description: `${res.data.data.channel_title}의 성공 공식과 원천 소스가 완벽히 추출되었습니다.`
        });
      }
    } catch (e: any) {
      toast({
        title: '분석 실패',
        description: e.message || '채널 분석 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplySuggestion = (suggestion: any) => {
    const over = suggestion.layout_override || {};
    setLayout(prev => ({
      ...prev,
      topHeaderBg: over.header_bg || prev.topHeaderBg,
      titleLine2Color: over.header_line2_color || prev.titleLine2Color,
      jabColor: over.jab_color || prev.jabColor,
      jabTiltDeg: over.jab_tilt !== undefined ? over.jab_tilt : prev.jabTiltDeg,
      subtitleYPercent: over.subtitle_y || prev.subtitleYPercent,
      canvasType: over.canvas_type || prev.canvasType,
      hasTopHeader: over.has_top_header !== undefined ? over.has_top_header : prev.hasTopHeader
    }));
    setActiveTab('layout');
    toast({
      title: '아이디어 적용 완료',
      description: `'${suggestion.title}' 템플릿이 에디터에 적용되었습니다. 실시간 프리뷰로 확인하세요.`
    });
  };

  const handleFeedbackSources = async () => {
    if (!benchmarkData?.id) return;
    try {
      const res = await api.post(`/channel-dna/benchmarks/${benchmarkData.id}/feedback-sources`, {
        target_category_name: '아이돌 비하인드 원자재'
      });
      toast({
        title: '🚀 원천 채널 정기 수집 등록 완료!',
        description: res.data.message || '발굴된 채널들이 자동 수집 목록에 등록되었습니다.'
      });
    } catch (e: any) {
      toast({
        title: '등록 실패',
        description: e.message,
        variant: 'destructive'
      });
    }
  };

  const handleCreateBrandChannel = async () => {
    if (!benchmarkData?.id) return;
    try {
      const res = await api.post(`/channel-dna/benchmarks/${benchmarkData.id}/create-brand-channel`, {
        channel_name: brandChannelName,
        selected_layout: layout
      });
      toast({
        title: '👑 브랜드 채널 생성 성공!',
        description: `'${brandChannelName}' 채널이 AI 사령탑에 성공적으로 배속되었습니다.`
      });
    } catch (e: any) {
      toast({
        title: '생성 실패',
        description: e.message,
        variant: 'destructive'
      });
    }
  };

  // 캔버스 마우스 드래그 높이/위치 조절 핸들러
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const percentY = Math.max(0, Math.min(100, (relativeY / rect.height) * 100));

      if (isDragging === 'header') {
        // 상단 헤더 높이 조절 (10% ~ 30%)
        const clamped = Math.round(Math.max(10, Math.min(30, percentY)) * 10) / 10;
        setLayout(prev => ({ ...prev, topHeaderHeightPct: clamped }));
      } else if (isDragging === 'bottom') {
        // 하단 출처 바 높이 조절 (3% ~ 15%)
        const bottomHeight = Math.round(Math.max(3, Math.min(15, 100 - percentY)) * 10) / 10;
        setLayout(prev => ({ ...prev, bottomCreditHeightPct: bottomHeight }));
      } else if (isDragging === 'subtitle') {
        // 자막 Y 위치 조절 (50% ~ 85%)
        const clamped = Math.round(Math.max(50, Math.min(85, percentY)) * 10) / 10;
        setLayout(prev => ({ ...prev, subtitleYPercent: clamped }));
      } else if (isDragging === 'jab') {
        // 쨉쨉이 Y 위치 조절 (20% ~ 60%)
        const clamped = Math.round(Math.max(20, Math.min(60, percentY)) * 10) / 10;
        setLayout(prev => ({ ...prev, jabYPercent: clamped }));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
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

  // 12편 샘플 목록 (Top 6 vs Recent 6)
  const topSamples = benchmarkData?.sample_videos?.slice(0, 6) || [
    { title: "아이돌 최강 대식가 멤버들의 역대급 먹방 실체", views: "1,940만회", outlier: "8.4x", cuts: "16컷", date: "2026.08.12" },
    { title: "무대 위에서 여동생 철벽 방어하는 친오빠 아이돌", views: "1,620만회", outlier: "7.1x", cuts: "15컷", date: "2026.07.28" },
    { title: "카메라 꺼진 줄 모르고 본색 드러난 멤버들 순간포착", views: "1,550만회", outlier: "6.8x", cuts: "14컷", date: "2026.08.05" },
    { title: "팬사인회에서 팬 심장 멎게 만든 레전드 조련", views: "1,410만회", outlier: "5.9x", cuts: "15컷", date: "2026.06.19" },
    { title: "콘서트 도중 음향 사고 터지자 생라이브로 찢은 순간", views: "1,330만회", outlier: "5.4x", cuts: "13컷", date: "2026.07.11" },
    { title: "예능에서 승부욕 폭발해 제작진 당황시킨 장면", views: "1,200만회", outlier: "4.9x", cuts: "15컷", date: "2026.05.30" }
  ];

  const recentSamples = benchmarkData?.sample_videos?.slice(6, 12) || [
    { title: "최근 공항 출국길에서 포착된 특이한 소지품 정체", views: "410만회", outlier: "3.8x", cuts: "15컷", date: "2일 전" },
    { title: "음악방송 1위 앵콜 무대에서 울컥한 막내 달래기", views: "380만회", outlier: "3.5x", cuts: "14컷", date: "4일 전" },
    { title: "자체 컨텐츠에서 게임하다가 찐친 모드 나온 멤버들", views: "320만회", outlier: "3.1x", cuts: "16컷", date: "6일 전" },
    { title: "챌린지 영상 찍다가 NG 터져서 빵 터진 비하인드", views: "290만회", outlier: "2.8x", cuts: "14컷", date: "1주 전" },
    { title: "해외 투어 브이로그에서 발견된 귀여운 습관", views: "270만회", outlier: "2.6x", cuts: "15컷", date: "1주 전" },
    { title: "대기실 인터뷰 도중 뒤에서 장난치는 멤버들", views: "250만회", outlier: "2.4x", cuts: "13컷", date: "2주 전" }
  ];

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 pb-32">
      {/* 1. 최상단 헤더 배너 (Full Width & Balanced Alignment) */}
      <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card/70 backdrop-blur-md border border-border/80 p-5 sm:p-6 rounded-3xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Dna className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              🌟 채널 DNA 분석 연구소
            </h1>
            <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              12편 골든 스펙 멀티모달 (Top 6 + Recent 6)
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground pt-0.5">
            성공한 벤치마크 채널을 정밀 해체하여 고유 성공 공식을 도출하고, AI 차별화 제안과 레고블록 캔버스로 나만의 쇼츠 채널을 구축합니다.
          </p>
        </div>

        {benchmarkData && (
          <div className="flex items-center gap-2.5 bg-muted/60 px-4 py-2.5 rounded-2xl border border-border/80 shrink-0 shadow-2xs">
            <span className="text-xs text-muted-foreground font-medium">분석 타겟:</span>
            <span className="text-xs sm:text-sm font-black text-foreground">{benchmarkData.channel_title}</span>
            <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] ml-1 font-bold border-emerald-500/30">
              ✓ DNA 추출 완료
            </Badge>
          </div>
        )}
      </div>

      {/* 2. 4대 핵심 파이프라인 탭 바 (Full Width 25% Grid) */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full bg-muted/50 border border-border/80 p-1.5 rounded-2xl h-auto gap-2 shadow-2xs">
          <TabsTrigger 
            value="analysis" 
            className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-xs sm:text-sm py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border border-transparent data-[state=active]:border-border/60"
          >
            <Compass className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>1. 12편 정밀 분석실</span>
          </TabsTrigger>
          <TabsTrigger 
            value="suggestions" 
            className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-xs sm:text-sm py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border border-transparent data-[state=active]:border-border/60"
          >
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>2. AI 성장 제안실</span>
          </TabsTrigger>
          <TabsTrigger 
            value="layout" 
            className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-xs sm:text-sm py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border border-transparent data-[state=active]:border-border/60"
          >
            <Layout className="w-4 h-4 text-sky-500 shrink-0" />
            <span>3. 쇼츠 화면 디자인 스튜디오</span>
          </TabsTrigger>
          <TabsTrigger 
            value="deploy" 
            className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-xs sm:text-sm py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border border-transparent data-[state=active]:border-border/60"
          >
            <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>4. 내 채널 등록 & 사령탑 배속</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: 12편 정밀 분석실 ─── */}
        <TabsContent value="analysis" className="w-full min-h-[600px] space-y-6 pt-2">
          {/* A. 벤치마크 채널 입력 카드 (Full Width) */}
          <Card className="w-full bg-card border border-border/80 text-card-foreground rounded-3xl shadow-xs overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2 text-foreground">
                    <Compass className="w-5 h-5 text-indigo-500" />
                    분석 대상 벤치마크 채널 입력
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-xs pt-1">
                    유튜브 채널 URL 또는 핸들(@xxx)을 입력하면, 최고 인기 6편(알고리즘 폭발) + 최근 6편(최신 진화 템플릿) 총 12편을 전수 해체합니다.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-xs hidden sm:inline-flex">
                  Sample: 12 Videos (6 + 6)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <Input 
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  placeholder="https://www.youtube.com/@FashionDetectiveNyan"
                  className="bg-background border-border text-foreground text-sm flex-1 h-12 rounded-2xl px-4 shadow-2xs font-mono"
                />
                <Button 
                  onClick={handleStartAnalysis}
                  disabled={isAnalyzing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm px-8 h-12 rounded-2xl shadow-sm cursor-pointer shrink-0 transition-all"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      12편 멀티모달 분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 text-yellow-300" />
                      12편 성공 공식 정밀 분석 시작
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* B. 4분면 핵심 DNA 도출 지표 (4-Column Full Width Grid) */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. 시각 DNA */}
            <Card className="bg-card border border-border/80 text-card-foreground rounded-3xl shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <Film className="w-4 h-4" /> 1. 시각 레이아웃 DNA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-3 text-xs">
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">캔버스 위상:</span>
                  <Badge variant="secondary" className="bg-muted text-foreground text-[11px] font-bold">솔리드 상하단 바 (16% / 6%)</Badge>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">상단 헤더:</span>
                  <span className="font-bold text-foreground">화이트(52pt) + 옐로우(58pt)</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">자막 세이프존:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Y 68.5% (UI 회피 완벽)</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">쨉쨉이 연출:</span>
                  <span className="font-bold text-foreground">평균 8.5초 / -3° 틸트 펄스</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-muted-foreground">컷 전환 템포:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">2.66초당 1컷 (총 14.7컷)</span>
                </div>
              </CardContent>
            </Card>

            {/* 2. 스크립트 DNA */}
            <Card className="bg-card border border-border/80 text-card-foreground rounded-3xl shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-xs sm:text-sm font-black text-sky-600 dark:text-sky-400 flex items-center gap-2">
                  <Type className="w-4 h-4" /> 2. 스크립트 & 훅 DNA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-3 text-xs">
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">오프닝 훅:</span>
                  <span className="font-bold text-foreground">질문/파격 단정 (0~2초 즉시 투척)</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">종결어미:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">~다고 한다 (70%)</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">발화 속도:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">초당 7.6글자 (분당 453자)</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">스토리 전개:</span>
                  <span className="font-bold text-foreground">훅 ➡️ 1차원음 ➡️ 에스컬레이션</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-muted-foreground">제목 공식:</span>
                  <span className="font-bold text-foreground">[수식어] + '키워드' + 본문</span>
                </div>
              </CardContent>
            </Card>

            {/* 3. 오디오 DNA */}
            <Card className="bg-card border border-border/80 text-card-foreground rounded-3xl shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Volume2 className="w-4 h-4" /> 3. 보이스 & 사운드 DNA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-3 text-xs">
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">보이스 톤:</span>
                  <span className="font-bold text-foreground">여성 중고음 리포터 (209.8Hz)</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">호흡 간격:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">무음 0.03초 (점프컷 삭제)</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">현장음 보존:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">중요 발화 구간 100% 보존</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">음압(LUFS):</span>
                  <span className="font-bold text-foreground">-13.2 LUFS (하드 컴프레서)</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-muted-foreground">BGM 스타일:</span>
                  <span className="font-bold text-foreground">경쾌 피치카토 (-20 dB)</span>
                </div>
              </CardContent>
            </Card>

            {/* 4. 원본 소스 발굴기 */}
            <Card className="bg-card border border-border/80 text-card-foreground rounded-3xl shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <Globe className="w-4 h-4" /> 4. 원본 소스 역추적
                </CardTitle>
                <Button 
                  onClick={handleFeedbackSources}
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] h-7 px-2.5 rounded-xl font-bold cursor-pointer shadow-xs shrink-0"
                >
                  🔄 정기수집 등록
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 pt-3 text-xs">
                <div className="text-[11px] text-muted-foreground mb-1">
                  식별된 원천 영상 공급처 (4곳):
                </div>
                <div className="space-y-1.5">
                  {[
                    { name: 'KBS Kpop 공식', cat: '아이돌 예능', pri: '최상' },
                    { name: 'Mnet M2 비하인드', cat: '밀착 직캠', pri: '상' },
                    { name: '딩고 뮤직 공식', cat: '라이브', pri: '중상' },
                    { name: '문명특급 공식', cat: '토크 인터뷰', pri: '중' }
                  ].map((ch, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-muted/40 p-2 rounded-xl border border-border/50">
                      <div>
                        <span className="font-bold text-foreground">{ch.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-1.5">({ch.cat})</span>
                      </div>
                      <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[9.5px] font-bold">
                        {ch.pri}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* C. 12편 전수 해체 쇼케이스 (Top 6 vs Recent 6) (Full Width 2-Column Grid) */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* 1) 최고 인기 Top 6 (절대 불변의 성공 분모) */}
            <Card className="w-full bg-card border border-border/80 text-card-foreground rounded-3xl shadow-xs overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-black text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <Flame className="w-4 h-4" /> 🔥 알고리즘 폭발 Top 6 (불변의 성공 분모)
                  </CardTitle>
                  <span className="text-[11px] font-mono text-muted-foreground">조회수 1,200만 ~ 1,940만</span>
                </div>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border/60">
                {topSamples.map((v, i) => (
                  <div key={i} className="p-3.5 sm:p-4 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">{v.title}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono mt-0.5">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{v.views}</span>
                          <span>·</span>
                          <span>평균 {v.cuts}</span>
                          <span>·</span>
                          <span>{v.date}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono text-xs font-black shrink-0">
                      {v.outlier} 🔥
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 2) 최근 영상 Recent 6 (최신 알고리즘 진화 템플릿) */}
            <Card className="w-full bg-card border border-border/80 text-card-foreground rounded-3xl shadow-xs overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> ⚡ 최신 업로드 Recent 6 (최근 진화 템플릿)
                  </CardTitle>
                  <span className="text-[11px] font-mono text-muted-foreground">최신 1~2주 업로드</span>
                </div>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border/60">
                {recentSamples.map((v, i) => (
                  <div key={i} className="p-3.5 sm:p-4 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-black flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">{v.title}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono mt-0.5">
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">{v.views}</span>
                          <span>·</span>
                          <span>평균 {v.cuts}</span>
                          <span>·</span>
                          <span>{v.date}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-black shrink-0">
                      {v.outlier}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 2: AI 성장 아이디어 제안실 ─── */}
        <TabsContent value="suggestions" className="w-full min-h-[600px] space-y-6 pt-2">
          {/* 가이드 배너 (Full Width) */}
          <div className="w-full bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 p-5 rounded-3xl text-xs sm:text-sm text-indigo-950 dark:text-indigo-200 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <strong className="font-bold text-foreground">성공 공식을 그대로 복제하면 경쟁 채널을 이길 수 없습니다.</strong>
                <p className="text-xs text-muted-foreground pt-0.5">
                  12편 분석 데이터를 바탕으로 AI가 제안하는 3가지 차별화 전략 중 원하는 안을 선택하여 디자인 스튜디오로 적용하세요.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 text-xs font-semibold shrink-0 hidden md:inline-flex">
              3 Distinct Strategies
            </Badge>
          </div>

          {/* 3대 차별화 전략 카드 (Full Width 3-Column Grid) */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {[
              {
                id: 'sug-a',
                badge: '전략 안 A · 도파민 부스터',
                title: '초스피드 핑퐁 & 네온 자극형',
                desc: '발화 속도를 15% 가속(8.8자/초)하고, 쨉쨉이 출현 주기를 5.2초로 단축하여 도파민 이탈율을 0%로 만드는 공격적 포맷입니다.',
                headerBg: '#09090b',
                headerLine2Color: '#38bdf8',
                jabColor: '#38bdf8',
                jabTilt: -4,
                subtitleY: 67.5,
                stats: { speed: '8.8자/초', jabCycle: '5.2초', hookY: '67.5%' }
              },
              {
                id: 'sug-b',
                badge: '전략 안 B · 고감도 시네마',
                title: '필름 노이즈 & 원본 현장음 200%',
                desc: '35mm 필름 그레인 효과와 원본 현장음 하이라이트를 전면에 배치하여, 영화 비하인드를 보는 듯한 높은 몰입감과 프리미엄 신뢰도를 구축합니다.',
                headerBg: '#18181b',
                headerLine2Color: '#fbbf24',
                jabColor: '#fbbf24',
                jabTilt: 2,
                subtitleY: 69.0,
                stats: { speed: '7.2자/초', jabCycle: '9.0초', hookY: '69.0%' }
              },
              {
                id: 'sug-c',
                badge: '전략 안 C · 극적 서사',
                title: '2단 반전 에스컬레이션 서사형',
                desc: '훅에서 던진 미끼를 중반에 뒤엎고 30초 지점에서 역대급 최종 보스 반전을 터뜨려 댓글 폭발 및 공유를 유도하는 바이럴 특화 포맷입니다.',
                headerBg: '#020617',
                headerLine2Color: '#a855f7',
                jabColor: '#a855f7',
                jabTilt: -2,
                subtitleY: 68.0,
                stats: { speed: '7.6자/초', jabCycle: '7.5초', hookY: '68.0%' }
              }
            ].map((sug) => (
              <Card key={sug.id} className="bg-card border border-border/80 text-card-foreground rounded-3xl shadow-xs flex flex-col justify-between hover:border-primary/50 transition-all p-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-indigo-500/20">
                      {sug.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-base sm:text-lg font-black text-foreground">{sug.title}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-2.5">
                    {sug.desc}
                  </CardDescription>

                  {/* 세부 수치 요약 */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">발화 속도:</span>
                      <span className="font-bold text-foreground">{sug.stats.speed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">쨉쨉이 주기:</span>
                      <span className="font-bold text-foreground">{sug.stats.jabCycle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">자막 세이프존:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{sug.stats.hookY}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <Button 
                    onClick={() => handleApplySuggestion({
                      title: sug.title,
                      layout_override: {
                        header_bg: sug.headerBg,
                        header_line2_color: sug.headerLine2Color,
                        jab_color: sug.jabColor,
                        jab_tilt: sug.jabTilt,
                        subtitle_y: sug.subtitleY,
                        has_top_header: true
                      }
                    })}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold py-3 rounded-2xl shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>이 안으로 디자인 스튜디오 적용</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── TAB 3: 쇼츠 템플릿 디자인 스튜디오 (6-Layer & 자막 모션 & 인물 줌) ─── */}
        <TabsContent value="layout" className="w-full min-h-[600px] space-y-6 pt-2">
          <ShortsTemplateStudio
            initialLayout={layout}
            onLayoutChange={(newLayout) => setLayout(newLayout)}
          />

          <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl bg-card border border-border/80 shadow-xs gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">
                화면 레이아웃과 자막 모션 설정이 완료되셨다면 다음 단계로 이동하여 내 브랜드 채널에 확정 배속하세요.
              </span>
            </div>
            <Button
              onClick={() => setActiveTab('deploy')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>💾 이 디자인으로 DNA 확정 & 배속</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </TabsContent>

        {/* ─── TAB 4: 내 브랜드 채널 등록 & AI 사령탑 배속 (6:6 Full Width Grid) ─── */}
        <TabsContent value="deploy" className="w-full min-h-[600px] space-y-6 pt-2">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 좌측 6단: 브랜드 채널 설정 */}
            <Card className="lg:col-span-6 w-full bg-card border border-border/80 text-card-foreground rounded-3xl shadow-xs p-6 space-y-5">
              <CardHeader className="p-0">
                <CardTitle className="text-base sm:text-lg font-black text-foreground flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-indigo-500" />
                  새로운 브랜드 채널 등록
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground pt-1">
                  확정된 DNA 레이아웃을 바탕으로 내 전용 채널을 생성하고, AI 사령탑의 전담 중간 관리자(디렉터)를 1:1로 배속합니다.
                </CardDescription>
              </CardHeader>

              <div className="space-y-4 pt-2">
                <div>
                  <Label className="text-xs sm:text-sm text-foreground font-bold">내 브랜드 채널명</Label>
                  <Input 
                    value={brandChannelName}
                    onChange={(e) => setBrandChannelName(e.target.value)}
                    placeholder="예: 아이돌 썰 탐정단"
                    className="bg-background border-border text-foreground text-sm mt-1.5 rounded-2xl h-11 px-4 font-bold"
                  />
                </div>

                <div>
                  <Label className="text-xs sm:text-sm text-foreground font-bold">채널 카테고리 도메인</Label>
                  <Input 
                    value="K-POP / 아이돌 연예 엔터"
                    disabled
                    className="bg-muted/40 border-border text-muted-foreground text-sm mt-1.5 rounded-2xl h-11 px-4 font-medium"
                  />
                </div>

                <Button 
                  onClick={handleCreateBrandChannel}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm py-4 rounded-2xl shadow-sm cursor-pointer transition-all mt-4"
                >
                  👑 브랜드 채널 생성 및 무인 양산 가동
                </Button>
              </div>
            </Card>

            {/* 우측 6단: AI 사령탑 배속 관제 현황 */}
            <Card className="lg:col-span-6 w-full bg-card border border-border/80 text-card-foreground rounded-3xl shadow-xs p-6 space-y-5">
              <CardHeader className="p-0">
                <CardTitle className="text-base sm:text-lg font-black text-foreground flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-emerald-500" />
                  AI 사령탑 자율 워커 배속 현황
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground pt-1">
                  채널 개설 즉시 3계층 주권 팩토리 거버넌스 하에서 독립 상태 머신이 가동됩니다.
                </CardDescription>
              </CardHeader>

              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">확정 캔버스 레이아웃:</span>
                    <span className="text-foreground font-bold">{layout.hasTopHeader ? '상단 2줄 헤더' : '풀스크린'} + 자막 Y {layout.subtitleYPercent}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">원천 소스 자동 피드백:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">정기 자동 수집 타겟 4곳 활성화</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">현장음 보존 믹싱 엔진:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">Faster-Whisper -45dB 소프트 뮤트 연동</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">생산 파이프라인:</span>
                    <span className="text-purple-600 dark:text-purple-400 font-bold">OneClickShortsPipeline ➡️ WorkQueue</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Tier 2 채널 디렉터 즉시 배정 준비 완료
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    생성 버튼을 누르면 이 채널 고유의 DNA 샌드박스가 분리 생성되며, 일일 목표 2편의 쇼츠가 무인 자율 생산됩니다.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChannelDnaStudio;
