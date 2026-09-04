import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { 
    RadarCandidate, Category, ChannelWithReels, 
    getChannelsWithReels, discoverLookalikeChannels, convertChannelToTarget 
} from '../lib/api';
import { 
    Radio, Zap, Sparkles, Check, X, ExternalLink, RefreshCw, 
    TrendingUp, Award, AlertCircle, ShieldAlert, ChevronRight,
    Loader2, Play, Eye, Flame, Filter, Folder, Compass, CheckCircle2,
    SlidersHorizontal, Layers, Clock, Users, Gem, ThumbsUp, Rocket,
    LayoutGrid, Table, Search, CheckSquare, Square, ArrowUpDown, FilterX,
    Tv, ChevronDown, ChevronUp, Globe, DollarSign, Bookmark, Film,
    Share2, PlusCircle, ArrowRight, UserCheck, Bot, LineChart, Settings2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { CategoryDNAModal } from '../components/shared/CategoryDNAModal';
import { TrendRadarDetailModal } from '../components/trend/TrendRadarDetailModal';
import { ChannelLaunchpadModal } from '../components/trend/ChannelLaunchpadModal';
import { ChannelAnatomyModal } from '../components/trend/ChannelAnatomyModal';

// 픽셀링(PixelLab) 전문가 엄선 인기 카테고리 20대 시드 (Seed Categories)
const PIXELING_SEED_TAGS = [
    { id: 'all', label: '모두보기', count: 323, isSpecial: true },
    { id: 'latest', label: '최신등록', count: 59, isSpecial: true },
    { id: 'gems', label: '💎 숨은옥석', count: 24, isSpecial: true },
    { id: 'kr_celeb', label: '한국인물티셋', count: 20 },
    { id: 'psychology', label: '심리학', count: 9 },
    { id: 'onetake', label: '원테이크크루', count: 28 },
    { id: 'ranking', label: '랭킹형(TOP3)', count: 18 },
    { id: 'senior_health', label: '시니어(건강)', count: 15 },
    { id: 'ai_2d', label: 'AI(2D애니)', count: 14 },
    { id: 'ai_3d', label: 'AI(3D렌더)', count: 9 },
    { id: 'military', label: '군정보/국방', count: 16 },
    { id: 'movie', label: '영화/드라마', count: 50 },
    { id: 'insta', label: '인스타릴스형', count: 22 },
    { id: 'economy', label: '경제학', count: 12 },
    { id: 'parenting', label: '육아', count: 8 },
    { id: 'history', label: '역사', count: 11 },
    { id: 'comedy', label: '스탠딩코미디', count: 8 },
    { id: 'success', label: '해외성공스토리', count: 11 },
];

const COUNTRY_PRESETS = [
    { code: 'ALL', name: '전체 국가', flag: '🌐' },
    { code: 'KR', name: '한국', flag: '🇰🇷' },
    { code: 'US', name: '미국', flag: '🇺🇸' },
    { code: 'JP', name: '일본', flag: '🇯🇵' },
    { code: 'TW', name: '대만', flag: '🇹🇼' },
    { code: 'VN', name: '베트남', flag: '🇻🇳' },
];

const TrendRadarPage: React.FC = () => {
    const queryClient = useQueryClient();
    
    // ── 4단계 파이프라인 퍼널 상태 (Pipeline Stepper) ─────────────
    // Step 1: 'signals' (바이럴 시그널 발굴)
    // Step 2: 'reels' (벤치마크 채널 릴 해체)
    // Step 3: 'incubator' (카테고리 클러스터 & DNA)
    // Step 4: 'launchpad' (신설 채널 론치패드)
    const [pipelineStep, setPipelineStep] = useState<'signals' | 'reels' | 'incubator' | 'launchpad'>('reels');

    // ── 포맷 토글: 쇼츠 (9:16) vs 롱폼 (16:9) ──────────────────────
    const [aspectFormat, setAspectFormat] = useState<'shorts' | 'long'>('shorts');

    // ── 필터 및 뷰 모드 ──────────────────────────────────────────
    const [viewMode, setViewMode] = useState<'reel' | 'grid' | 'table'>('reel');
    const [selectedTag, setSelectedTag] = useState<string>('all');
    const [isTagBarExpanded, setIsTagBarExpanded] = useState<boolean>(false);
    const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isScanning, setIsScanning] = useState(false);
    const [spideringChannelId, setSpideringChannelId] = useState<number | null>(null);

    // ── 모달 상태 ───────────────────────────────────────────────
    const [selectedCandidateForDetail, setSelectedCandidateForDetail] = useState<RadarCandidate | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    
    const [selectedChannelForAnatomy, setSelectedChannelForAnatomy] = useState<{ id: number; name: string } | null>(null);
    const [isAnatomyModalOpen, setIsAnatomyModalOpen] = useState(false);

    const [isLaunchpadModalOpen, setIsLaunchpadModalOpen] = useState(false);
    const [launchpadCategory, setLaunchpadCategory] = useState<Category | null>(null);

    const [isDNAModalOpen, setIsDNAModalOpen] = useState(false);
    const [dnaCategory, setDnaCategory] = useState<Category | null>(null);

    // 1. 카테고리 목록 (DB 실제 20개 카테고리)
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => (await api.get<Category[]>('/categories/')).data || []
    });

    // 2. 바이럴 후보군 (Step 1용 - 타겟 채널 중복 배제됨)
    const { data: rawCandidates = [], isLoading: isLoadingCandidates } = useQuery({
        queryKey: ['radar-candidates', aspectFormat],
        queryFn: async () => {
            const params: any = { video_type: aspectFormat };
            const res = await api.get<RadarCandidate[]>('/trend-radar/candidates', { params });
            return res.data || [];
        }
    });

    // 3. 채널 릴 데이터 (Step 2용 - 타겟 채널 중복 배제된 순수 옥석 후보 채널 풀)
    const { data: channelsWithReels = [], isLoading: isLoadingReels } = useQuery({
        queryKey: ['channels-with-reels', aspectFormat],
        queryFn: () => getChannelsWithReels(undefined, aspectFormat)
    });

    // 4. 통계 데이터
    const { data: stats } = useQuery({
        queryKey: ['radar-stats'],
        queryFn: async () => (await api.get('/trend-radar/stats')).data
    });

    // ── 스카우터 자율 스캔 가동 ────────────────────────────────────
    const scanMutation = useMutation({
        mutationFn: async () => {
            setIsScanning(true);
            return (await api.post('/trend-radar/scan', {
                video_type: aspectFormat,
                limit: 10
            })).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['radar-candidates'] });
            queryClient.invalidateQueries({ queryKey: ['channels-with-reels'] });
            queryClient.invalidateQueries({ queryKey: ['radar-stats'] });
            setIsScanning(false);
        },
        onError: (err: any) => {
            setIsScanning(false);
            alert('스카우터 탐색 오류: ' + (err.response?.data?.detail || err.message));
        }
    });

    // ── 인간 검토 게이트: 타겟 채널 승인 & 정기 수집 전환 ──────────────
    const convertTargetMutation = useMutation({
        mutationFn: async (channelId: number) => {
            return await convertChannelToTarget(channelId);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['channels-with-reels'] });
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            queryClient.invalidateQueries({ queryKey: ['radar-candidates'] });
            alert(data.message || '정식 타겟 채널로 승인되었습니다! 주기적 자동 수집이 가동됩니다.');
        },
        onError: (err: any) => {
            alert('타겟 채널 전환 실패: ' + (err.response?.data?.detail || err.message));
        }
    });

    // ── AI 유사 채널 10개 자동 확장 탐색 (Spidering) ────────────────
    const spiderMutation = useMutation({
        mutationFn: async (channelId: number) => {
            setSpideringChannelId(channelId);
            return await discoverLookalikeChannels(channelId);
        },
        onSuccess: (data) => {
            setSpideringChannelId(null);
            queryClient.invalidateQueries({ queryKey: ['channels-with-reels'] });
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            alert(`[AI 유사 채널 확장 완료]\n'${data.seed_channel}' 기준 유사 옥석 채널 ${data.discovered_count}개를 발굴하여 카테고리에 편입했습니다!`);
        },
        onError: (err: any) => {
            setSpideringChannelId(null);
            alert('유사 채널 확장 오류: ' + (err.response?.data?.detail || err.message));
        }
    });

    // 필터링된 영상 목록
    const filteredCandidates = useMemo(() => {
        return rawCandidates.filter(c => {
            if (aspectFormat === 'shorts' && c.video_type !== 'shorts') return false;
            if (aspectFormat === 'long' && c.video_type !== 'long') return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = c.title.toLowerCase().includes(q);
                const matchChannel = c.channel_title.toLowerCase().includes(q);
                if (!matchTitle && !matchChannel) return false;
            }
            return true;
        });
    }, [rawCandidates, aspectFormat, searchQuery]);

    // 스타 옥석 영상 (상단 루피 픽)
    const starCandidate = useMemo(() => {
        if (rawCandidates.length === 0) return null;
        return [...rawCandidates].sort((a, b) => b.outlier_ratio - a.outlier_ratio)[0];
    }, [rawCandidates]);

    const activeCatObj = categories[0] || null;

    return (
        <div className="w-full min-h-screen bg-background text-foreground flex flex-col p-4 sm:p-6 space-y-5 pb-32">
            {/* 1. 최상단 헤더 & 루피 AI 실시간 옥석 큐레이션 배너 */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-card/60 backdrop-blur-md border border-border/80 p-4 sm:p-5 rounded-3xl shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                            <Compass className="w-5 h-5 animate-pulse" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                            <span>바이럴 스카우터</span>
                            <span className="text-xs font-mono font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                                FSD Intelligence 2.0
                            </span>
                        </h1>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        AI 실시간 발굴 ─▶ 픽셀링 릴 해체 ─▶ AI 유사채널 확장 ─▶ 인간 검토 승인(정기수집) ─▶ 신설 채널 론치패드
                    </p>
                </div>

                {/* 루피의 오늘자 옥석 픽 위젯 */}
                {starCandidate && (
                    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-indigo-500/30 p-2.5 sm:p-3 rounded-2xl max-w-xl">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                            <Flame className="w-5 h-5 fill-amber-300 text-amber-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-[10.5px]">
                                <span className="font-bold text-indigo-400 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 fill-current" />
                                    루피의 오늘자 옥석 픽
                                </span>
                                <span className="font-mono font-black text-amber-400 bg-black/60 px-1.5 py-0.2 rounded text-[10px]">
                                    {starCandidate.outlier_ratio}x 폭발
                                </span>
                            </div>
                            <h4 className="text-xs font-bold truncate text-foreground mt-0.5">
                                {starCandidate.title}
                            </h4>
                            <p className="text-[10px] text-muted-foreground truncate">
                                {starCandidate.channel_title} · 조회수 {starCandidate.view_count.toLocaleString()}회
                            </p>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => {
                                setSelectedCandidateForDetail(starCandidate);
                                setIsDetailModalOpen(true);
                            }}
                            className="h-8 px-3 text-[11px] font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs shrink-0 cursor-pointer"
                        >
                            <Play className="w-3 h-3 fill-white mr-1" />
                            즉시 분석
                        </Button>
                    </div>
                )}
            </div>

            {/* 2. 🔥 4단계 비즈니스 파이프라인 스테퍼 바 (4-Step Pipeline Stepper Funnel) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-muted/30 border border-border/80 p-2 rounded-2xl">
                {/* Step 1: 시그널 발굴 */}
                <button
                    onClick={() => { setPipelineStep('signals'); setViewMode('grid'); }}
                    className={cn(
                        "p-3 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer",
                        pipelineStep === 'signals' 
                            ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-500/30" 
                            : "hover:bg-muted/50 text-muted-foreground"
                    )}
                >
                    <div>
                        <span className="text-[10px] font-mono font-bold block opacity-80">STEP 1</span>
                        <h4 className="text-xs font-black">📡 바이럴 시그널 발굴</h4>
                    </div>
                    <span className={cn(
                        "text-[10.5px] font-mono px-2 py-0.5 rounded-full font-bold",
                        pipelineStep === 'signals' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    )}>
                        {rawCandidates.length}건
                    </span>
                </button>

                {/* Step 2: 벤치마크 채널 릴 (픽셀링 모드) */}
                <button
                    onClick={() => { setPipelineStep('reels'); setViewMode('reel'); }}
                    className={cn(
                        "p-3 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer",
                        pipelineStep === 'reels' 
                            ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-500/30" 
                            : "hover:bg-muted/50 text-muted-foreground"
                    )}
                >
                    <div>
                        <span className="text-[10px] font-mono font-bold block opacity-80">STEP 2</span>
                        <h4 className="text-xs font-black">🏢 벤치마크 채널 릴</h4>
                    </div>
                    <span className={cn(
                        "text-[10.5px] font-mono px-2 py-0.5 rounded-full font-bold",
                        pipelineStep === 'reels' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    )}>
                        {channelsWithReels.length}채널
                    </span>
                </button>

                {/* Step 3: 카테고리 인큐베이터 */}
                <button
                    onClick={() => setPipelineStep('incubator')}
                    className={cn(
                        "p-3 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer",
                        pipelineStep === 'incubator' 
                            ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-500/30" 
                            : "hover:bg-muted/50 text-muted-foreground"
                    )}
                >
                    <div>
                        <span className="text-[10px] font-mono font-bold block opacity-80">STEP 3</span>
                        <h4 className="text-xs font-black">📂 픽셀링 시드 카테고리</h4>
                    </div>
                    <span className={cn(
                        "text-[10.5px] font-mono px-2 py-0.5 rounded-full font-bold",
                        pipelineStep === 'incubator' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    )}>
                        {categories.length || PIXELING_SEED_TAGS.length}분야
                    </span>
                </button>

                {/* Step 4: 신규 채널 론치패드 */}
                <button
                    onClick={() => { setPipelineStep('launchpad'); setLaunchpadCategory(activeCatObj); }}
                    className={cn(
                        "p-3 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer",
                        pipelineStep === 'launchpad'
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md ring-2 ring-indigo-500/30"
                            : "bg-gradient-to-r from-indigo-600/10 to-purple-600/10 hover:from-indigo-600/20 hover:to-purple-600/20 border border-indigo-500/30 text-indigo-400"
                    )}
                >
                    <div>
                        <span className={cn("text-[10px] font-mono font-bold block", pipelineStep === 'launchpad' ? "text-white/80" : "text-indigo-300")}>STEP 4</span>
                        <h4 className="text-xs font-black flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            신설 채널 론치패드
                        </h4>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            {/* 3. 픽셀링 전문가 엄선 마이크로 카테고리 시드 태그 바 */}
            <div className="bg-card/40 border border-border/80 p-3 sm:p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-black text-muted-foreground">
                        <Folder className="w-3.5 h-3.5 text-blue-500" />
                        <span>픽셀링 엄선 20대 카테고리 시드 (Seed Categories)</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* 검색창 */}
                        <div className="relative w-44 sm:w-60">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="채널/키워드/3초 훅 검색..."
                                className="w-full pl-8 pr-3 py-1 text-xs bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        {/* 신설 채널 개설 모달 트리거 */}
                        <Button
                            size="sm"
                            onClick={() => { setLaunchpadCategory(activeCatObj); setIsLaunchpadModalOpen(true); }}
                            className="h-7 text-[11px] font-black bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xs rounded-xl cursor-pointer"
                        >
                            <Sparkles className="w-3 h-3 mr-1" />
                            신설 채널 론칭 패키지
                        </Button>

                        <button 
                            onClick={() => setIsTagBarExpanded(!isTagBarExpanded)}
                            className="p-1 rounded-lg hover:bg-muted text-muted-foreground text-xs flex items-center gap-0.5 cursor-pointer"
                        >
                            {isTagBarExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* 칩 리스트 */}
                <div className={cn(
                    "flex flex-wrap items-center gap-1.5 transition-all overflow-hidden",
                    !isTagBarExpanded && "max-h-[38px]"
                )}>
                    {PIXELING_SEED_TAGS.map(tag => {
                        const isSelected = selectedTag === tag.id;
                        return (
                            <button
                                key={tag.id}
                                onClick={() => setSelectedTag(tag.id)}
                                className={cn(
                                    "px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                                    isSelected 
                                        ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30" 
                                        : tag.isSpecial
                                            ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                                            : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70"
                                )}
                            >
                                <span>{tag.label}</span>
                                <span className={cn(
                                    "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
                                    isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                                )}>
                                    {tag.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 4. 컨트롤 바: 쇼츠(9:16) / 롱폼(16:9) 듀얼 토글 및 뷰 모드 */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-card/40 border border-border/70 p-3 rounded-2xl">
                {/* 좌측: 포맷 듀얼 토글 스위치 (PixelLab Shorts vs Longform) */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
                        <button
                            onClick={() => setAspectFormat('shorts')}
                            className={cn(
                                "px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer",
                                aspectFormat === 'shorts' 
                                    ? "bg-rose-600 text-white shadow-xs" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            title="쇼츠 9:16 세로 썸네일 스트립 (초반 훅 중심)"
                        >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>⚡ 쇼츠 (9:16)</span>
                        </button>

                        <button
                            onClick={() => setAspectFormat('long')}
                            className={cn(
                                "px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer",
                                aspectFormat === 'long' 
                                    ? "bg-blue-600 text-white shadow-xs" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            title="롱폼 16:9 와이드 썸네일 스트립 (심리학/지식다큐 중심)"
                        >
                            <Film className="w-3.5 h-3.5" />
                            <span>🎬 롱폼 (16:9)</span>
                        </button>
                    </div>

                    {/* 뷰 모드 토글 (채널 릴 / 그리드 / 테이블) */}
                    <div className="flex items-center bg-muted/40 p-0.5 rounded-xl border border-border text-xs font-bold">
                        <button
                            onClick={() => { setViewMode('reel'); setPipelineStep('reels'); }}
                            className={cn("px-2.5 py-1 rounded-lg cursor-pointer", viewMode === 'reel' && "bg-card text-foreground shadow-xs")}
                        >
                            채널 릴 (픽셀링)
                        </button>
                        <button
                            onClick={() => { setViewMode('grid'); setPipelineStep('signals'); }}
                            className={cn("px-2.5 py-1 rounded-lg cursor-pointer", viewMode === 'grid' && "bg-card text-foreground shadow-xs")}
                        >
                            영상 그리드
                        </button>
                        <button
                            onClick={() => { setViewMode('table'); setPipelineStep('signals'); }}
                            className={cn("px-2.5 py-1 rounded-lg cursor-pointer", viewMode === 'table' && "bg-card text-foreground shadow-xs")}
                        >
                            터미널 표
                        </button>
                    </div>
                </div>

                {/* 우측: 국가 필터 & 스카우터 가동 */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-muted/40 border border-border px-2.5 py-1 rounded-xl text-xs font-bold">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                        <select 
                            value={selectedCountry}
                            onChange={(e) => setSelectedCountry(e.target.value)}
                            className="bg-transparent border-0 text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                        >
                            {COUNTRY_PRESETS.map(c => (
                                <option key={c.code} value={c.code} className="bg-card text-foreground">
                                    {c.flag} {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Button
                        size="sm"
                        onClick={() => scanMutation.mutate()}
                        disabled={isScanning}
                        className="h-8 px-3 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer"
                    >
                        {isScanning ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        ) : (
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        스카우터 가동
                    </Button>
                </div>
            </div>

            {/* 5. 메인 뷰 렌더링 (Step 1, Step 2, Step 3, Step 4) */}
            {isLoadingCandidates || isLoadingReels ? (
                <div className="py-28 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-xs text-muted-foreground font-mono">
                        알고리즘 옥석 채널 및 {aspectFormat === 'long' ? '롱폼 (16:9)' : '쇼츠 (9:16)'} 스트립 데이터를 동기화 중입니다...
                    </p>
                </div>
            ) : pipelineStep === 'incubator' ? (
                /* ── [STEP 3 전용 메인 뷰] 📂 픽셀링 20대 카테고리 인큐베이터 & DNA 설정 ── */
                <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border">
                        <div>
                            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                                <Folder className="w-4 h-4 text-blue-500" />
                                픽셀링 시드 카테고리 클러스터 ({categories.length}개 분야)
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                엄선된 카테고리 DNA 헌장 및 신설 채널 론치패드를 실시간 관리합니다.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {categories.map(cat => (
                            <div 
                                key={cat.id} 
                                className="p-4 rounded-2xl bg-card border border-border/80 hover:border-indigo-500/50 shadow-xs flex flex-col justify-between space-y-3 transition-all"
                            >
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-black text-foreground flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            {cat.name}
                                        </h4>
                                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                            ID #{cat.id}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {cat.persona_target || '해당 분야 핵심 관심 구독자'}
                                    </p>
                                    <div className="text-[11px] font-medium text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg">
                                        톤앤매너: {cat.content_tone || '신뢰성 있고 몰입도 높은 연출'}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => { setDnaCategory(cat); setIsDNAModalOpen(true); }}
                                        className="flex-1 h-7 text-xs font-bold rounded-xl cursor-pointer"
                                    >
                                        <Settings2 className="w-3 h-3 mr-1" />
                                        DNA 헌장
                                    </Button>

                                    <Button
                                        size="sm"
                                        onClick={() => { setLaunchpadCategory(cat); setIsLaunchpadModalOpen(true); }}
                                        className="flex-1 h-7 text-xs font-black bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                                    >
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        신설 채널 개설
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : pipelineStep === 'launchpad' ? (
                /* ── [STEP 4 전용 메인 뷰] 🚀 신설 채널 론치패드 ── */
                <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-900/10 via-card to-purple-900/10 border border-indigo-500/30 text-center space-y-4 animate-in fade-in duration-200">
                    <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-7 h-7" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                        <h2 className="text-lg font-black text-foreground">
                            신설 채널 론치패드 (Launchpad Pack)
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            발굴된 벤치마크 카테고리 데이터를 바탕으로 9router AI가 5대 브랜드 기획안(채널명 3종, 아바타/배너 프롬프트, 3편 훅 플랜)을 자동 패키징합니다.
                        </p>
                    </div>
                    <div>
                        <Button
                            onClick={() => { setLaunchpadCategory(activeCatObj); setIsLaunchpadModalOpen(true); }}
                            className="h-9 px-5 text-xs font-black bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 text-white rounded-2xl shadow-md cursor-pointer"
                        >
                            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                            {activeCatObj?.name || '카테고리'} 론치패드 팩 열기
                        </Button>
                    </div>
                </div>
            ) : viewMode === 'reel' ? (
                /* ── [STEP 2] 픽셀링식 수평 채널 릴 스트립 뷰 (타겟 채널 중복 배제 + 채널 성장 분석 모달 연동) ── */
                <div className="space-y-4 animate-in fade-in duration-200">
                    {channelsWithReels.length === 0 ? (
                        <div className="py-20 text-center text-xs text-muted-foreground">
                            표시할 신규 옥석 채널이 없습니다. 상단 '스카우터 가동'을 눌러 새로운 채널을 탐색하세요.
                        </div>
                    ) : (
                        channelsWithReels.map(ch => (
                            <div 
                                key={ch.channel_id}
                                className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm flex flex-col lg:flex-row items-stretch gap-4 hover:border-indigo-500/40 transition-all"
                            >
                                {/* 좌측: 채널 카드 (6분할 지표 & 인간 검토 승인 & 채널 성장 분석 버튼) */}
                                <div className="w-full lg:w-80 shrink-0 flex flex-col justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/80 space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-md text-[10px] font-black",
                                                ch.grade === 'S' ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" :
                                                ch.grade === 'A' ? "bg-blue-500/20 text-blue-500 border border-blue-500/30" :
                                                "bg-muted text-muted-foreground"
                                            )}>
                                                등급: {ch.grade}
                                            </span>
                                            <span className="text-[10px] font-mono text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                                신규 발굴 옥석
                                            </span>
                                        </div>

                                        {/* 채널 아바타 & 타이틀 (클릭 시 성장 분석 모달 팝업!) */}
                                        <div 
                                            onClick={() => {
                                                setSelectedChannelForAnatomy({ id: ch.channel_id, name: ch.name });
                                                setIsAnatomyModalOpen(true);
                                            }}
                                            className="flex items-center gap-2.5 mt-2.5 p-1.5 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer group"
                                            title="클릭하여 채널 성장 분석 및 4대 해체 리포트 열기"
                                        >
                                            <div className="w-11 h-11 rounded-full bg-muted border border-border overflow-hidden shrink-0 group-hover:ring-2 group-hover:ring-blue-500 transition-all">
                                                <img 
                                                    src={ch.thumbnail_path || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
                                                    alt={ch.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";
                                                    }}
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1">
                                                    <h3 className="text-sm font-black text-foreground truncate group-hover:text-blue-500 transition-colors">
                                                        {ch.name}
                                                    </h3>
                                                    <LineChart className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                                </div>
                                                <p className="text-[11px] font-mono text-muted-foreground truncate">{ch.handle}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 6분할 데이터 그리드 (PixelLab Identity) */}
                                    <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-card/60 border border-border/60 text-center">
                                        <div>
                                            <p className="text-[9.5px] text-muted-foreground">구독자</p>
                                            <p className="text-xs font-black font-mono text-foreground mt-0.5">{ch.metrics.subscribers}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9.5px] text-muted-foreground">일일 조회</p>
                                            <p className="text-xs font-black font-mono text-blue-500 mt-0.5">{ch.metrics.daily_views}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9.5px] text-muted-foreground">하루 수익</p>
                                            <p className="text-xs font-black font-mono text-emerald-500 mt-0.5">{ch.metrics.daily_revenue}</p>
                                        </div>
                                        <div className="pt-1.5 border-t border-border/40">
                                            <p className="text-[9.5px] text-muted-foreground">총 누적뷰</p>
                                            <p className="text-xs font-black font-mono text-foreground mt-0.5">{ch.metrics.total_views}</p>
                                        </div>
                                        <div className="pt-1.5 border-t border-border/40">
                                            <p className="text-[9.5px] text-muted-foreground">영상수</p>
                                            <p className="text-xs font-black font-mono text-foreground mt-0.5">{ch.metrics.video_count}편</p>
                                        </div>
                                        <div className="pt-1.5 border-t border-border/40">
                                            <p className="text-[9.5px] text-muted-foreground">7일 추이</p>
                                            <p className="text-[11px] font-black text-amber-500 mt-0.5">{ch.metrics.trend_status || '상승세'}</p>
                                        </div>
                                    </div>

                                    {/* 채널 핵심 액션 버튼 바 */}
                                    <div className="space-y-1.5">
                                        {/* 1. 픽셀링식 성장 분석 모달 버튼 */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedChannelForAnatomy({ id: ch.channel_id, name: ch.name });
                                                setIsAnatomyModalOpen(true);
                                            }}
                                            className="w-full h-7 text-[11px] font-bold border-border/80 hover:bg-muted text-foreground rounded-xl cursor-pointer flex items-center justify-center gap-1"
                                        >
                                            <LineChart className="w-3 h-3 text-blue-500" />
                                            📈 성장 그래프 & AI 해체
                                        </Button>

                                        {/* 2. 인간 검토 게이트 승인 버튼 */}
                                        <Button
                                            size="sm"
                                            onClick={() => convertTargetMutation.mutate(ch.channel_id)}
                                            disabled={convertTargetMutation.isPending}
                                            className="w-full h-8 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                            ✓ 타겟 채널 승인 & 정기수집 전환
                                        </Button>

                                        {/* 3. AI 유사 채널 5개 확장 탐색 */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => spiderMutation.mutate(ch.channel_id)}
                                            disabled={spideringChannelId === ch.channel_id}
                                            className="w-full h-7 text-[11px] font-bold border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 rounded-xl cursor-pointer"
                                        >
                                            {spideringChannelId === ch.channel_id ? (
                                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                            ) : (
                                                <Bot className="w-3 h-3 mr-1 text-indigo-400" />
                                            )}
                                            🔍 AI 유사 채널 5개 확장 탐색
                                        </Button>
                                    </div>
                                </div>

                                {/* 우측: 영상 릴 스트립 (쇼츠 9:16은 6개 / 롱폼 16:9는 3~4개 가로 배열) */}
                                <div className={cn(
                                    "flex-1 grid gap-2.5 overflow-x-auto",
                                    aspectFormat === 'long' 
                                        ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" 
                                        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-6"
                                )}>
                                    {ch.reels.slice(0, aspectFormat === 'long' ? 3 : 6).map((reel, rIdx) => (
                                        <div 
                                            key={rIdx}
                                            onClick={() => {
                                                const matched = rawCandidates.find(c => c.video_id === reel.video_id);
                                                if (matched) {
                                                    setSelectedCandidateForDetail(matched);
                                                } else {
                                                    setSelectedCandidateForDetail({
                                                        id: reel.id,
                                                        video_id: reel.video_id,
                                                        url: `https://www.youtube.com/${aspectFormat === 'shorts' ? 'shorts/' : 'watch?v='}${reel.video_id}`,
                                                        title: reel.title,
                                                        channel_title: ch.name,
                                                        thumbnail_url: reel.thumbnail_url,
                                                        video_type: aspectFormat,
                                                        view_count: reel.view_count,
                                                        like_count: 5000,
                                                        comment_count: 240,
                                                        velocity_score: 1200,
                                                        outlier_ratio: reel.outlier_ratio,
                                                        engagement_rate: 0.05,
                                                        published_at: reel.published_at,
                                                        match_score: 92,
                                                        match_reason: '채널 대표 급상승 영상',
                                                        status: 'pending',
                                                        hook_analysis: reel.hook_analysis || '초반 핵심 의문 제시',
                                                        viral_triggers: '시청 지속률 극대화 컷 편집',
                                                        adaptation_angle: '바이럴루프 각색 추천',
                                                        created_at: new Date().toISOString()
                                                    } as any);
                                                }
                                                setIsDetailModalOpen(true);
                                            }}
                                            className={cn(
                                                "group relative rounded-2xl overflow-hidden bg-black border border-border/80 hover:border-indigo-500 transition-all cursor-pointer shadow-sm flex flex-col justify-between p-2.5",
                                                aspectFormat === 'long' ? "aspect-video" : "aspect-[9/16]"
                                            )}
                                        >
                                            <img 
                                                src={reel.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80"}
                                                alt={reel.title}
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform opacity-80"
                                                onError={(e) => {
                                                    e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80";
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60" />

                                            {/* 상단 뱃지 */}
                                            <div className="relative z-10 flex items-center justify-between">
                                                <span className="w-5 h-5 rounded-full bg-black/80 text-white font-mono text-[10px] font-black flex items-center justify-center border border-white/20">
                                                    {rIdx + 1}
                                                </span>
                                                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-black bg-amber-500 text-black">
                                                    {reel.outlier_ratio}x 🔥
                                                </span>
                                            </div>

                                            {/* 하단 텍스트 및 메트릭 */}
                                            <div className="relative z-10 space-y-1">
                                                <h4 className="text-[11px] font-bold text-white line-clamp-2 leading-tight">
                                                    {reel.title}
                                                </h4>
                                                <div className="flex items-center justify-between text-[10px] font-mono text-white/70 pt-0.5 border-t border-white/10">
                                                    <span>{reel.view_count.toLocaleString()}회</span>
                                                    <span>{reel.duration_text || (aspectFormat === 'long' ? '12:45' : '0:58')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                /* ── [STEP 1] 6열 고밀도 영상 그리드 ── */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {filteredCandidates.map(candidate => (
                        <div
                            key={candidate.id}
                            onClick={() => {
                                setSelectedCandidateForDetail(candidate);
                                setIsDetailModalOpen(true);
                            }}
                            className={cn(
                                "group relative rounded-2xl overflow-hidden bg-black border border-border/80 hover:border-indigo-500 transition-all cursor-pointer shadow-md flex flex-col justify-between p-2.5",
                                aspectFormat === 'long' ? "aspect-video" : "aspect-[9/16]"
                            )}
                        >
                            <img 
                                src={candidate.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80"}
                                alt={candidate.title}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform opacity-80"
                                onError={(e) => {
                                    e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80";
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60" />

                            <div className="relative z-10 flex items-center justify-between">
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase text-white",
                                    candidate.video_type === 'shorts' ? "bg-rose-600" : "bg-blue-600"
                                )}>
                                    {candidate.video_type === 'shorts' ? 'SHORTS' : 'LONG'}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black bg-black/80 text-amber-400 border border-amber-500/30">
                                    {candidate.outlier_ratio}x 🔥
                                </span>
                            </div>

                            <div className="relative z-10 space-y-1">
                                <p className="text-[10px] text-white/80 font-bold truncate">{candidate.channel_title}</p>
                                <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight">
                                    {candidate.title}
                                </h4>
                                <div className="flex items-center justify-between text-[10px] font-mono text-white/70 pt-1 border-t border-white/10">
                                    <span>{candidate.view_count.toLocaleString()}회</span>
                                    <span>{candidate.duration_text || (aspectFormat === 'long' ? '11:20' : '0:45')}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* ── [STEP 1 테이블 모드] ── */
                <div className="rounded-2xl border border-border overflow-x-auto bg-card">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-black border-b border-border uppercase text-[10.5px]">
                            <tr>
                                <th className="p-3">영상 제목 & 채널</th>
                                <th className="p-3 text-center">유형</th>
                                <th className="p-3 text-right">조회수</th>
                                <th className="p-3 text-right">폭발력</th>
                                <th className="p-3 text-right">시간당 증가</th>
                                <th className="p-3 text-center">초반 3초 훅</th>
                                <th className="p-3 text-center">액션</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredCandidates.map(candidate => (
                                <tr 
                                    key={candidate.id}
                                    onClick={() => {
                                        setSelectedCandidateForDetail(candidate);
                                        setIsDetailModalOpen(true);
                                    }}
                                    className="hover:bg-muted/30 cursor-pointer"
                                >
                                    <td className="p-3 font-bold text-foreground">
                                        <p className="line-clamp-1">{candidate.title}</p>
                                        <span className="text-[10.5px] text-muted-foreground font-normal">{candidate.channel_title}</span>
                                    </td>
                                    <td className="p-3 text-center font-mono">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-bold",
                                            candidate.video_type === 'shorts' ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-500"
                                        )}>
                                            {candidate.video_type}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold">
                                        {candidate.view_count.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-right font-mono font-black text-amber-500">
                                        {candidate.outlier_ratio}x
                                    </td>
                                    <td className="p-3 text-right font-mono text-muted-foreground">
                                        +{Math.round(candidate.velocity_score).toLocaleString()}/h
                                    </td>
                                    <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                                        {candidate.hook_analysis || '초반 핵심 의문 제시'}
                                    </td>
                                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setPipelineStep('reels');
                                                setViewMode('reel');
                                            }}
                                            className="h-7 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                                        >
                                            채널릴 보기
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 6. 모달 컴포넌트들 */}
            {/* 영상 상세 분석 모달 */}
            <TrendRadarDetailModal
                candidate={selectedCandidateForDetail}
                open={isDetailModalOpen}
                onOpenChange={setIsDetailModalOpen}
                category={activeCatObj}
                onApprove={(id) => {
                    queryClient.invalidateQueries({ queryKey: ['channels-with-reels'] });
                    queryClient.invalidateQueries({ queryKey: ['radar-candidates'] });
                    alert('타겟 채널로 정식 승인되었습니다.');
                }}
                onReject={(id, reason) => {
                    queryClient.invalidateQueries({ queryKey: ['radar-candidates'] });
                }}
            />

            {/* 픽셀링식 채널 성장 분석 모달 (듀얼 차트 + AI 4대 해체 분석) */}
            <ChannelAnatomyModal
                channelId={selectedChannelForAnatomy?.id || null}
                channelName={selectedChannelForAnatomy?.name}
                isOpen={isAnatomyModalOpen}
                onClose={() => setIsAnatomyModalOpen(false)}
                onConverted={(name) => {
                    queryClient.invalidateQueries({ queryKey: ['channels-with-reels'] });
                    queryClient.invalidateQueries({ queryKey: ['channels'] });
                }}
                onSelectVideo={(vId, title) => {
                    const matched = rawCandidates.find(c => c.video_id === vId);
                    if (matched) {
                        setSelectedCandidateForDetail(matched);
                        setIsDetailModalOpen(true);
                    }
                }}
            />

            {/* 신설 채널 론치패드 모달 */}
            <ChannelLaunchpadModal
                category={launchpadCategory}
                open={isLaunchpadModalOpen}
                onOpenChange={setIsLaunchpadModalOpen}
                onBrandCreated={(id, title) => {
                    alert(`신설 브랜드 채널 '${title}'이 성공적으로 개설되었습니다!`);
                    queryClient.invalidateQueries({ queryKey: ['brand-channels'] });
                }}
            />

            {/* 카테고리 DNA 헌장 모달 */}
            {dnaCategory && (
                <CategoryDNAModal
                    category={dnaCategory}
                    open={isDNAModalOpen}
                    onOpenChange={setIsDNAModalOpen}
                />
            )}
        </div>
    );
};

export default TrendRadarPage;
