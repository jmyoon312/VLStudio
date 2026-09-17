import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    Globe,
    Video,
    Sparkles,
    Flame,
    Zap,
    TrendingUp,
    Clock,
    Search,
    RefreshCw,
    SlidersHorizontal,
    Layers,
    BookOpen,
    Film,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    ShieldAlert,
    ExternalLink,
    Filter,
    Plus,
    BarChart3,
    BrainCircuit,
    Compass,
    Eye,
    MessageSquare,
    Heart,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    X,
    Maximize2,
    Bot,
    Send,
    FileText,
    Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Types ──
export type LensMode = 'all' | 'web' | 'youtube' | 'golden';

export interface TrendItem {
    id: string;
    keyword: string;
    lens: 'web' | 'youtube';
    traffic: string;
    traffic_val: number;
    headline: string;
    snippet: string;
    source: string;
    url: string;
    image?: string;
    published_at: string;
    category: string;
    is_sports_noise: boolean;
    nvs_score: number;
    nvs_tier: string;
    primary_trigger: string;
    triggers: string[];
    golden_time_urgency: string;
    retention_prob: number;
    is_golden_cross?: boolean;
    golden_cross_reason?: string;
}

export interface DualLensResponse {
    total_count: number;
    golden_cross_count: number;
    web_count: number;
    youtube_count: number;
    items: TrendItem[];
}

export interface PrismAngle {
    channel_name: string;
    category: string;
    recommended_studio: 'ssul' | 'gunlimbo' | 'insta' | 'classic';
    studio_name: string;
    target_emotion: string;
    hook_title: string;
    hook_intro_script: string;
    narrative_summary: string;
    estimated_cpm_tier: string;
}

export interface PrismResponse {
    keyword: string;
    prism_angles: PrismAngle[];
}

export interface CrossIndexArticle {
    id: number;
    title: string;
    community_name: string;
    source_type: string;
    viral_score: number;
    views: number;
    likes: number;
    comments_count: number;
    url: string;
    images_count: number;
    snippet: string;
}

export interface CrossIndexResponse {
    keyword: string;
    matched_count: number;
    articles: CrossIndexArticle[];
}

export interface ChannelAllocation {
    channel_name: string;
    recommended_studio: 'ssul' | 'gunlimbo' | 'insta' | 'classic';
    keyword: string;
    action_directive: string;
}

export interface ExecutiveBriefingResponse {
    success: boolean;
    model_used: string;
    generated_at: string;
    briefing: {
        macro_sentiment: string;
        golden_time_pick: {
            keyword: string;
            reason: string;
            hook_formula: string;
        };
        channel_allocations: ChannelAllocation[];
    };
}

export interface PipelineDispatchResponse {
    success: boolean;
    pipeline_res: {
        project_id: string;
        current_phase: string;
        critic_score: number;
        critic_feedback: string;
        script_content: string;
        draft_project_path?: string;
        video_path?: string;
        hitl_status: string;
        article_id?: number;
    };
    channel_title: string;
    critic_score: number;
    critic_feedback: string;
    current_phase: string;
    script_content: string;
    draft_project_path?: string;
    message: string;
}

const CATEGORY_MAP: Record<string, { label: string; icon: string }> = {
    all: { label: '전체 카테고리', icon: '🌐' },
    drama_movie: { label: '드라마/영화/연예', icon: '🎭' },
    romance_dating: { label: '연애/결혼/관계', icon: '❤️' },
    politics_society: { label: '정치/사회/사건', icon: '⚖️' },
    economy_business: { label: '경제/자영업/소비', icon: '💰' },
    mystery_history: { label: '미스터리/역사/괴담', icon: '📜' },
    tech_science: { label: 'IT/과학/AI', icon: '🚀' },
    sports: { label: '스포츠 이슈', icon: '🏃' },
    lifestyle: { label: '라이프/기타', icon: '🌿' },
};

const YoutubeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <path d="m10 15 5-3-5-3v6Z" fill="currentColor" />
    </svg>
);

export const GoogleTrendOrchestrator: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // ── Local States ──
    const [lensMode, setLensMode] = useState<LensMode>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [filterSportsNoise, setFilterSportsNoise] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [minNvsScore, setMinNvsScore] = useState<number>(0);

    // Modals
    const [activePrismTrend, setActivePrismTrend] = useState<TrendItem | null>(null);
    const [activeCrossIndexKeyword, setActiveCrossIndexKeyword] = useState<string | null>(null);

    // Executive AI Briefing state
    const [isBriefingExpanded, setIsBriefingExpanded] = useState<boolean>(true);
    const [isManualBriefingRefreshing, setIsManualBriefingRefreshing] = useState<boolean>(false);

    // LangGraph Pipeline Dispatch state & modal
    const [dispatchingKeyword, setDispatchingKeyword] = useState<string | null>(null);
    const [activePipelineResult, setActivePipelineResult] = useState<PipelineDispatchResponse | null>(null);

    // ── Queries ──
    // 1. Dual-Lens Trends Query
    const {
        data: trendData,
        isLoading,
        isFetching,
        refetch,
    } = useQuery<DualLensResponse>({
        queryKey: ['googleTrendsDualLens', lensMode, selectedCategory],
        queryFn: async () => {
            const res = await axios.get('/api/viral/trends/dual-lens', {
                params: {
                    mode: lensMode,
                    category: selectedCategory,
                    geo: 'KR',
                },
            });
            return res.data;
        },
        staleTime: 1000 * 60 * 3, // 3 mins cache
    });

    // 2. Executive AI Briefing Query
    const {
        data: aiBriefingData,
        isLoading: isBriefingLoading,
        refetch: refetchBriefing,
    } = useQuery<ExecutiveBriefingResponse>({
        queryKey: ['trendAiBriefing'],
        queryFn: async () => {
            const res = await axios.get('/api/viral/trends/ai-briefing');
            return res.data;
        },
        staleTime: 1000 * 60 * 10, // 10 mins cache
    });

    // Refresh Executive Briefing manually (forces LLM execution and token generation)
    const handleRefreshBriefing = async () => {
        setIsManualBriefingRefreshing(true);
        try {
            toast.info('🧠 루피 AI 사령탑이 실시간 트렌드 및 대중 심리를 심층 분석 중입니다 (LLM 가동)...');
            const res = await axios.get('/api/viral/trends/ai-briefing', { params: { refresh: true } });
            queryClient.setQueryData(['trendAiBriefing'], res.data);
            toast.success(`AI 사령탑 브리핑 갱신 완료 (모델: ${res.data?.model_used || 'viraloop1'})`);
        } catch (err: any) {
            toast.error(`브리핑 갱신 실패: ${err.message}`);
        } finally {
            setIsManualBriefingRefreshing(false);
        }
    };

    // 3. LangGraph Auto-Dispatch Mutation
    const autoDispatchMutation = useMutation<
        PipelineDispatchResponse,
        Error,
        {
            trend_keyword: string;
            headline?: string;
            target_studio?: string;
            target_emotion?: string;
            channel_id?: string;
            channel_title?: string;
            modality?: string;
            render_engine?: string;
            auto_approve_hitl?: boolean;
        }
    >({
        mutationFn: async (payload) => {
            setDispatchingKeyword(payload.trend_keyword);
            const res = await axios.post('/api/viral/trends/auto-dispatch-pipeline', payload);
            return res.data;
        },
        onSuccess: (data) => {
            setDispatchingKeyword(null);
            setActivePipelineResult(data);
            toast.success(`🚀 LangGraph 자율 파이프라인 제작 완료! (Critic 점수: ${data.critic_score}점)`);
            queryClient.invalidateQueries({ queryKey: ['viralArticles'] });
            queryClient.invalidateQueries({ queryKey: ['hudStats'] });
        },
        onError: (err) => {
            setDispatchingKeyword(null);
            toast.error(`파이프라인 발주 실패: ${err.message}`);
        },
    });

    // Cross-Index Query
    const {
        data: crossIndexData,
        isLoading: isCrossIndexLoading,
    } = useQuery<CrossIndexResponse>({
        queryKey: ['trendCrossIndex', activeCrossIndexKeyword],
        queryFn: async () => {
            if (!activeCrossIndexKeyword) return { keyword: '', matched_count: 0, articles: [] };
            const res = await axios.get('/api/viral/trends/cross-index', {
                params: {
                    keyword: activeCrossIndexKeyword,
                    limit: 12,
                },
            });
            return res.data;
        },
        enabled: !!activeCrossIndexKeyword,
    });

    // AI Prism Expansion Mutation
    const prismMutation = useMutation<PrismResponse, Error, { keyword: string; headline: string }>({
        mutationFn: async ({ keyword, headline }) => {
            const res = await axios.post('/api/viral/trends/prism-expand', {
                keyword,
                headline,
            });
            return res.data;
        },
        onSuccess: () => {
            toast.success('AI 트렌드 프리즘 4채널 분광이 완료되었습니다.');
        },
        onError: (err) => {
            toast.error(`프리즘 분광 실패: ${err.message}`);
        },
    });

    // Stage as Article Mutation
    const stageMutation = useMutation<
        { success: boolean; article_id: number; already_exists: boolean },
        Error,
        {
            keyword: string;
            headline?: string;
            target_studio: string;
            target_emotion?: string;
            hook_title?: string;
            hook_intro_script?: string;
            narrative_summary?: string;
            category?: string;
            channel_name?: string;
            andRedirect?: boolean;
        }
    >({
        mutationFn: async (payload) => {
            const res = await axios.post('/api/viral/trends/stage', payload);
            return { ...res.data, andRedirect: payload.andRedirect, target_studio: payload.target_studio };
        },
        onSuccess: (data: any) => {
            toast.success(
                data.already_exists
                    ? '이미 벙커에 등록된 트렌드입니다.'
                    : '벙커(소재 보관소)에 성공적으로 스테이징되었습니다.'
            );
            queryClient.invalidateQueries({ queryKey: ['viralArticles'] });
            queryClient.invalidateQueries({ queryKey: ['hudStats'] });

            if (data.andRedirect && data.article_id && data.target_studio) {
                navigate(`/shorts-editor/${data.target_studio}?article_id=${data.article_id}`);
            }
        },
        onError: (err) => {
            toast.error(`스테이징 실패: ${err.message}`);
        },
    });

    // Harvest News Mutation
    const harvestNewsMutation = useMutation<
        { success: boolean; keyword: string; harvested_count: number; titles: string[] },
        Error,
        { keyword: string; category?: string }
    >({
        mutationFn: async ({ keyword, category }) => {
            const res = await axios.post('/api/viral/trends/harvest-news', {
                keyword,
                category,
                limit: 5,
            });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(`'${data.keyword}' 관련 기사 ${data.harvested_count}건을 수집하여 DB에 적재했습니다.`);
            queryClient.invalidateQueries({ queryKey: ['viralArticles'] });
            queryClient.invalidateQueries({ queryKey: ['hudStats'] });
            queryClient.invalidateQueries({ queryKey: ['crossIndex', data.keyword] });
        },
        onError: (err) => {
            toast.error(`뉴스 수집 실패: ${err.message}`);
        },
    });

    // Open Prism Modal & Trigger Expansion
    const handleOpenPrism = (trend: TrendItem) => {
        setActivePrismTrend(trend);
        prismMutation.mutate({
            keyword: trend.keyword,
            headline: trend.headline || trend.snippet,
        });
    };

    // Filter items
    const filteredItems = useMemo(() => {
        if (!trendData?.items) return [];
        return trendData.items.filter((item) => {
            if (filterSportsNoise && item.is_sports_noise) return false;
            if (minNvsScore > 0 && item.nvs_score < minNvsScore) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchK = (item.keyword || '').toLowerCase().includes(q);
                const matchH = (item.headline || '').toLowerCase().includes(q);
                const matchT = (item.triggers || []).some((t) => (t || '').toLowerCase().includes(q));
                if (!matchK && !matchH && !matchT) return false;
            }
            return true;
        });
    }, [trendData?.items, filterSportsNoise, minNvsScore, searchQuery]);

    return (
        <div className="space-y-4">
            {/* ═════════════════════════════════════════════════════════════════════════ */}
            {/* 0. TIER 1 HERMES BRAIN: EXECUTIVE AI TREND BRIEFING                       */}
            {/* ═════════════════════════════════════════════════════════════════════════ */}
            <div className="rounded-2xl bg-card border border-primary/30 shadow-xs overflow-hidden transition-all">
                {/* Briefing Header */}
                <div className="p-4 bg-gradient-to-r from-primary/10 via-card to-amber-500/10 border-b border-border/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                            <Bot className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-black text-foreground tracking-tight flex items-center gap-1.5">
                                    루피 AI 사령탑 실시간 트렌드 전략 브리핑
                                </h2>
                                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-mono px-2 py-0.5">
                                    Tier 1 Brain
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                <span>지능 엔진: <strong className="text-foreground font-mono">{aiBriefingData?.model_used || 'DB Settings 실시간 연동'}</strong></span>
                                {aiBriefingData?.generated_at && (
                                    <>
                                        <span>•</span>
                                        <span>분석 시각: <strong className="text-foreground font-mono">{aiBriefingData.generated_at}</strong></span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefreshBriefing}
                            disabled={isManualBriefingRefreshing || isBriefingLoading}
                            className="h-8 gap-1.5 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 cursor-pointer shadow-2xs"
                        >
                            <BrainCircuit className={cn('w-3.5 h-3.5', isManualBriefingRefreshing && 'animate-spin')} />
                            <span>{isManualBriefingRefreshing ? '심층 분석 중...' : 'AI 사령탑 실시간 심층 분석'}</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsBriefingExpanded(!isBriefingExpanded)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            {isBriefingExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                {/* Briefing Content */}
                {isBriefingExpanded && (
                    <div className="p-4 space-y-4">
                        {isBriefingLoading ? (
                            <div className="py-8 text-center space-y-2">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
                                <p className="text-xs text-muted-foreground">루피 사령탑이 150+ 트렌드 및 대중 심리 지형도를 연산 중입니다...</p>
                            </div>
                        ) : aiBriefingData?.briefing ? (
                            <div className="space-y-3.5">
                                {/* Top Row: Macro Sentiment & Golden Pick */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                                    {/* 1. Macro Sentiment Card */}
                                    <div className="lg:col-span-6 p-3.5 rounded-xl bg-muted/40 border border-border/80 flex flex-col justify-between space-y-2">
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                                <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                                                    <TrendingUp className="w-4 h-4 text-primary" />
                                                    대중 심리 지형도 (Macro Sentiment)
                                                </span>
                                                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5">
                                                    대한민국 집단 심리
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-foreground/90 font-medium leading-relaxed">
                                                {aiBriefingData.briefing.macro_sentiment}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 2. Prime Golden Pick Card */}
                                    {aiBriefingData.briefing.golden_time_pick && (
                                        <div className="lg:col-span-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col justify-between space-y-2">
                                            <div>
                                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                                    <span className="text-xs font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                                        <Sparkles className="w-4 h-4 text-amber-500" />
                                                        골든타임 추천 1위 선점 키워드
                                                    </span>
                                                    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[10px] font-mono">
                                                        18시간 골든타임
                                                    </Badge>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <h3 className="text-base font-black text-foreground">
                                                        {aiBriefingData.briefing.golden_time_pick.keyword}
                                                    </h3>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    💡 {aiBriefingData.briefing.golden_time_pick.reason}
                                                </p>
                                                <div className="mt-2 p-2 rounded-lg bg-card/80 border border-amber-500/20 text-[11px] text-foreground font-semibold flex items-center gap-1.5">
                                                    <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                    <span>공식: {aiBriefingData.briefing.golden_time_pick.hook_formula}</span>
                                                </div>
                                            </div>

                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    autoDispatchMutation.mutate({
                                                        trend_keyword: aiBriefingData.briefing.golden_time_pick.keyword,
                                                        headline: aiBriefingData.briefing.golden_time_pick.reason,
                                                        target_studio: 'gunlimbo',
                                                    })
                                                }
                                                disabled={autoDispatchMutation.isPending && dispatchingKeyword === aiBriefingData.briefing.golden_time_pick.keyword}
                                                className="w-full h-7 text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer mt-1 gap-1.5"
                                            >
                                                {autoDispatchMutation.isPending && dispatchingKeyword === aiBriefingData.briefing.golden_time_pick.keyword ? (
                                                    <>
                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                        <span>LangGraph 워커 파이프라인 가동 중...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap className="w-3.5 h-3.5" />
                                                        <span>이 키워드로 자율 파이프라인 즉시 가동</span>
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Row: 4-Channel Directives Matrix */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                                            <Layers className="w-3.5 h-3.5 text-primary" />
                                            4대 채널 중간 관리자(Channel Directors) 맞춤 전략 오더
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                            채널별 독립 주권 DNA에 맞춰 실시간으로 배분된 전략 지침입니다.
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                                        {(aiBriefingData.briefing.channel_allocations || []).map((alloc, idx) => {
                                            const studioBadges: Record<string, { label: string; color: string }> = {
                                                ssul: { label: '썰형 스튜디오', color: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
                                                gunlimbo: { label: '군림보 고발', color: 'border-red-500/40 text-red-600 dark:text-red-400 bg-red-500/10' },
                                                insta: { label: '인스타 카드', color: 'border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10' },
                                                classic: { label: '클래식 정석', color: 'border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10' },
                                            };
                                            const badgeInfo = studioBadges[alloc.recommended_studio] || { label: alloc.recommended_studio, color: 'bg-muted' };

                                            return (
                                                <div
                                                    key={idx}
                                                    className="p-3 rounded-xl bg-card border border-border/80 flex flex-col justify-between space-y-2 hover:border-primary/40 transition-all shadow-2xs"
                                                >
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between gap-1.5">
                                                            <span className="text-xs font-black text-foreground truncate">
                                                                {alloc.channel_name}
                                                            </span>
                                                            <Badge className={cn('text-[9px] px-1.5 py-0 border', badgeInfo.color)}>
                                                                {badgeInfo.label}
                                                            </Badge>
                                                        </div>

                                                        <div className="text-xs font-extrabold text-primary flex items-center gap-1">
                                                            <span>🎯</span>
                                                            <span className="truncate">{alloc.keyword}</span>
                                                        </div>

                                                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                                            {alloc.action_directive}
                                                        </p>
                                                    </div>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            autoDispatchMutation.mutate({
                                                                trend_keyword: alloc.keyword,
                                                                headline: alloc.action_directive,
                                                                target_studio: alloc.recommended_studio,
                                                                channel_title: alloc.channel_name,
                                                            })
                                                        }
                                                        disabled={autoDispatchMutation.isPending && dispatchingKeyword === alloc.keyword}
                                                        className="h-7 w-full text-[11px] font-bold border-border/80 hover:bg-primary hover:text-primary-foreground cursor-pointer transition-all gap-1"
                                                    >
                                                        {autoDispatchMutation.isPending && dispatchingKeyword === alloc.keyword ? (
                                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <Zap className="w-3 h-3" />
                                                        )}
                                                        <span>자율 발주</span>
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            {/* ═════════════════════════════════════════════════════════════════════════ */}
            {/* 1. TOP DUAL-LENS CONTROL CONSOLE                                         */}
            {/* ═════════════════════════════════════════════════════════════════════════ */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-2xs">
                            <Compass className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-black text-foreground tracking-tight">
                                    구글 트렌드 선제적 예측 관제탑 & AI 트렌드 프리즘
                                </h2>
                                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-mono px-2 py-0.5">
                                    Dual-Lens v2.5
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                구글 웹 팩트와 유튜브 영상 시청 수요를 교차 분석하여 골든 크로스 키워드를 4대 스튜디오 숏폼으로 즉시 분광합니다.
                            </p>
                        </div>
                    </div>

                    {/* Live Stats Indicators */}
                    <div className="flex items-center gap-2">
                        <div className="px-3 py-1.5 rounded-xl bg-muted/60 border border-border/80 text-xs font-mono flex items-center gap-2">
                            <span className="text-muted-foreground">감지된 트렌드:</span>
                            <span className="font-bold text-foreground">{trendData?.total_count || 0}개</span>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span className="font-bold">골든 크로스: {trendData?.golden_cross_count || 0}개</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isLoading || isFetching}
                            className="h-8 gap-1.5 cursor-pointer text-xs font-semibold border-border/80 hover:bg-muted"
                        >
                            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
                            <span>새로고침</span>
                        </Button>
                    </div>
                </div>

                {/* 2-Tier Mode Selector: Dual-Lens & Noise Filter */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
                    {/* Dual-Lens Mode Buttons */}
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/70">
                        <button
                            onClick={() => setLensMode('all')}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                                lensMode === 'all'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            <span>전체 통합 ({trendData?.total_count || 0})</span>
                        </button>

                        <button
                            onClick={() => setLensMode('golden')}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                                lensMode === 'golden'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                            )}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>💎 골든 교차점 ({trendData?.golden_cross_count || 0})</span>
                        </button>

                        <button
                            onClick={() => setLensMode('web')}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                                lensMode === 'web'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Globe className="w-3.5 h-3.5" />
                            <span>🌐 구글 웹 검색 ({trendData?.web_count || 0})</span>
                        </button>

                        <button
                            onClick={() => setLensMode('youtube')}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                                lensMode === 'youtube'
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <YoutubeIcon className="w-3.5 h-3.5" />
                            <span>📱 유튜브 영상 검색 ({trendData?.youtube_count || 0})</span>
                        </button>
                    </div>

                    {/* Right Options: Sports Noise Filter & Search */}
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => setFilterSportsNoise(!filterSportsNoise)}
                            className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer',
                                filterSportsNoise
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : 'bg-muted text-muted-foreground border-border/80'
                            )}
                            title="단순 프로야구/축구 정규 경기 스코어('A 대 B')를 필터링하여 영양가 있는 서사만 남깁니다."
                        >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>경기 스코어 노이즈 차단: {filterSportsNoise ? 'ON' : 'OFF'}</span>
                        </button>

                        <div className="relative w-48 sm:w-60">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="트렌드 키워드/심리 검색..."
                                className="h-8 pl-8 text-xs bg-muted/40 border-border/80 focus-visible:ring-1"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Category Boundary Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
                    {Object.entries(CATEGORY_MAP).map(([key, info]) => {
                        const isSelected = selectedCategory === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setSelectedCategory(key)}
                                className={cn(
                                    'px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border',
                                    isSelected
                                        ? 'bg-primary/15 text-primary border-primary/40 font-bold'
                                        : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/70 hover:text-foreground'
                                )}
                            >
                                <span>{info.icon}</span>
                                <span>{info.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════════════ */}
            {/* 2. TREND CARDS GRID                                                       */}
            {/* ═════════════════════════════════════════════════════════════════════════ */}
            {isLoading ? (
                <div className="p-12 text-center rounded-2xl bg-card border border-border/80">
                    <RefreshCw className="w-7 h-7 animate-spin mx-auto text-primary mb-3" />
                    <p className="text-sm font-bold text-foreground">구글 실시간 트렌드 레이더 가동 중...</p>
                    <p className="text-xs text-muted-foreground mt-1">웹 검색과 유튜브 영상 트렌드를 정밀 대조하고 있습니다.</p>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-card border border-border/80 text-muted-foreground">
                    <Compass className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold">조건에 일치하는 트렌드가 없습니다.</p>
                    <p className="text-xs mt-1">카테고리 필터나 검색어를 변경해 보세요.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {filteredItems.map((item) => {
                        const isGolden = item.is_golden_cross;
                        const isWeb = item.lens === 'web';

                        return (
                            <div
                                key={item.id}
                                className={cn(
                                    'flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 bg-card hover:shadow-md relative overflow-hidden group',
                                    isGolden
                                        ? 'border-amber-500/40 hover:border-amber-500 ring-1 ring-amber-500/20'
                                        : 'border-border/80 hover:border-primary/50'
                                )}
                            >
                                {isGolden && (
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent pointer-events-none" />
                                )}

                                <div className="space-y-3">
                                    {/* Top Badges Bar */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {isGolden ? (
                                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-extrabold flex items-center gap-1">
                                                    <Sparkles className="w-3 h-3" />
                                                    골든 크로스
                                                </Badge>
                                            ) : isWeb ? (
                                                <Badge variant="outline" className="text-[10px] font-semibold border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                    <Globe className="w-3 h-3" />
                                                    웹 검색
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] font-semibold border-red-500/30 text-red-600 dark:text-red-400 flex items-center gap-1">
                                                    <YoutubeIcon className="w-3 h-3" />
                                                    유튜브
                                                </Badge>
                                            )}

                                            <Badge variant="secondary" className="text-[10px] font-mono">
                                                🔥 {item.traffic}
                                            </Badge>

                                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">
                                                {CATEGORY_MAP[item.category]?.label || item.category}
                                            </Badge>
                                        </div>

                                        {/* Golden Time Urgency Light */}
                                        <span
                                            className={cn(
                                                'text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1',
                                                (item.golden_time_urgency || item.golden_desc || '').includes('초동')
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                            )}
                                        >
                                            <Clock className="w-2.5 h-2.5" />
                                            {item.golden_time_urgency || item.golden_desc || '실시간 모멘텀'}
                                        </span>
                                    </div>

                                    {/* Keyword Title */}
                                    <div>
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="text-base font-black text-foreground group-hover:text-primary transition-colors leading-snug">
                                                {item.keyword}
                                            </h3>
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-muted-foreground hover:text-foreground shrink-0 p-1"
                                                title="원천 검색창 열기"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                        {item.headline && (
                                            <p className="text-xs text-foreground/80 font-medium mt-1 line-clamp-2 leading-relaxed">
                                                {item.headline}
                                            </p>
                                        )}
                                    </div>

                                    {/* NVS Score & Psychological Triggers */}
                                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground font-semibold flex items-center gap-1">
                                                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                                                서사 전환성 (NVS):
                                            </span>
                                            <span className="font-mono font-black text-foreground">
                                                {(item.nvs_score ?? 80).toFixed(1)}점
                                                <span className="ml-1 text-[10px] text-primary font-bold">({item.nvs_tier || 'A급'})</span>
                                            </span>
                                        </div>
                                        <Progress value={item.nvs_score ?? 80} className="h-1.5 bg-muted" />

                                        <div className="flex items-center gap-1 flex-wrap pt-1">
                                            <span className="text-[10px] text-muted-foreground">심리 자극:</span>
                                            {(item.triggers || []).map((t, idx) => (
                                                <Badge
                                                    key={idx}
                                                    variant="outline"
                                                    className="text-[9px] px-1.5 py-0 rounded border-primary/20 text-primary bg-primary/5"
                                                >
                                                    {t}
                                                </Badge>
                                            ))}
                                            <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                                                시청유지 {item.retention_prob ?? 85}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Action Buttons */}
                                <div className="pt-3.5 mt-3.5 border-t border-border/60 space-y-2">
                                    {/* 1. Auto-Dispatch Pipeline Button (LangGraph StateGraph) */}
                                    <Button
                                        onClick={() =>
                                            autoDispatchMutation.mutate({
                                                trend_keyword: item.keyword,
                                                headline: item.headline || item.snippet,
                                                target_studio: isGolden ? 'gunlimbo' : 'ssul',
                                                target_emotion: item.primary_trigger || '호기심',
                                            })
                                        }
                                        disabled={autoDispatchMutation.isPending && dispatchingKeyword === item.keyword}
                                        className="w-full h-8 text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs gap-1.5 cursor-pointer"
                                        title="Scout -> Writer -> Critic-85 -> CapCut 조립 -> WorkQueue 등록까지 자율 실행"
                                    >
                                        {autoDispatchMutation.isPending && dispatchingKeyword === item.keyword ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                <span>LangGraph 제작 진행 중...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-3.5 h-3.5" />
                                                <span>🚀 자율 팩토리 파이프라인 발주</span>
                                                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                                            </>
                                        )}
                                    </Button>

                                    {/* 2. Primary 1-Click AI Prism Expansion */}
                                    <Button
                                        variant="outline"
                                        onClick={() => handleOpenPrism(item)}
                                        className="w-full h-7 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 gap-1.5 cursor-pointer"
                                    >
                                        <BrainCircuit className="w-3.5 h-3.5" />
                                        <span>AI 트렌드 프리즘 (4채널 분광)</span>
                                        <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                                    </Button>

                                    {/* Secondary Action Row: Local DB & Direct Stage & News Harvest */}
                                    <div className="grid grid-cols-3 gap-1.5">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setActiveCrossIndexKeyword(item.keyword)}
                                            className="h-7 text-[11px] font-semibold px-1.5 border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                            title="로컬 5,000+ 커뮤니티 기사 DB에서 교차 일치하는 썰 검색"
                                        >
                                            <BookOpen className="w-3 h-3 mr-1" />
                                            <span>썰 교차색인</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={stageMutation.isPending}
                                            onClick={() =>
                                                stageMutation.mutate({
                                                    keyword: item.keyword,
                                                    headline: item.headline,
                                                    target_studio: 'gunlimbo',
                                                    category: item.category,
                                                    narrative_summary: item.snippet,
                                                })
                                            }
                                            className="h-7 text-[11px] font-semibold px-1.5 border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                            title="이 트렌드를 즉시 벙커 기사로 등록"
                                        >
                                            <Zap className="w-3 h-3 mr-1 text-amber-500" />
                                            <span>벙커 스테이징</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={harvestNewsMutation.isPending}
                                            onClick={() =>
                                                harvestNewsMutation.mutate({
                                                    keyword: item.keyword,
                                                    category: item.category,
                                                })
                                            }
                                            className="h-7 text-[11px] font-semibold px-1.5 border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                            title="이 키워드 관련 최신 뉴스를 자동 수집하여 적재"
                                        >
                                            <RefreshCw className="w-3 h-3 mr-1 text-blue-500" />
                                            <span>원천 수집</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════════ */}
            {/* 3. AI TREND PRISM MODAL / DRAWER                                          */}
            {/* ═════════════════════════════════════════════════════════════════════════ */}
            <Dialog open={!!activePrismTrend} onOpenChange={(open) => !open && setActivePrismTrend(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto p-6 rounded-2xl bg-card border border-border/80 shadow-xl">
                    <DialogHeader className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                <BrainCircuit className="w-4 h-4" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-black text-foreground">
                                    AI 트렌드 프리즘: '{activePrismTrend?.keyword}' 4채널 동시 분광
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    단 1개의 트렌드 이슈를 우리 스튜디오의 4대 엄선 카테고리 채널에 최적화된 3초 훅 및 전용 스튜디오로 분광 도출했습니다.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {prismMutation.isPending ? (
                        <div className="py-16 text-center space-y-3">
                            <BrainCircuit className="w-8 h-8 animate-spin mx-auto text-primary" />
                            <p className="text-sm font-bold text-foreground">
                                DB Settings 지정 AI 엔진이 4대 채널별 숏폼 훅을 도출하고 있습니다...
                            </p>
                            <p className="text-xs text-muted-foreground">
                                심리학, 역사/야담, 군림보 고발, 자영업/소비 관점으로 서사를 재구성하는 중입니다.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 pt-2">
                            {/* Prism Angles 4-Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {(prismMutation.data?.prism_angles || []).map((angle, idx) => {
                                    const studioColors: Record<string, string> = {
                                        ssul: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5',
                                        gunlimbo: 'border-red-500/40 text-red-600 dark:text-red-400 bg-red-500/5',
                                        insta: 'border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/5',
                                        classic: 'border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/5',
                                    };

                                    return (
                                        <div
                                            key={idx}
                                            className="p-4 rounded-xl bg-muted/30 border border-border/80 flex flex-col justify-between space-y-3 hover:border-primary/50 transition-all shadow-2xs"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge variant="outline" className="text-[10px] font-bold border-border/80">
                                                            {angle.category}
                                                        </Badge>
                                                        <span className="text-xs font-black text-foreground">
                                                            {angle.channel_name}
                                                        </span>
                                                    </div>

                                                    <Badge
                                                        className={cn(
                                                            'text-[10px] font-bold px-2 py-0.5 rounded-md border',
                                                            studioColors[angle.recommended_studio] || 'bg-muted text-muted-foreground'
                                                        )}
                                                    >
                                                        {angle.studio_name}
                                                    </Badge>
                                                </div>

                                                {/* 3-Second Hook Title */}
                                                <div>
                                                    <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                                                        🎯 3초 뇌 반응 훅 타이틀:
                                                    </span>
                                                    <h4 className="text-sm font-extrabold text-foreground mt-0.5 leading-snug">
                                                        "{angle.hook_title}"
                                                    </h4>
                                                </div>

                                                {/* Intro Script (0~15s) */}
                                                <div className="p-2.5 rounded-lg bg-card border border-border/60 text-xs text-foreground/90 space-y-1">
                                                    <span className="text-[10px] font-bold text-muted-foreground">
                                                        🎙️ 인트로 발화 대본 (0~15초):
                                                    </span>
                                                    <p className="line-clamp-3 leading-relaxed font-medium">
                                                        {angle.hook_intro_script}
                                                    </p>
                                                </div>

                                                {/* Narrative Summary */}
                                                <p className="text-[11px] text-muted-foreground line-clamp-2">
                                                    💡 {angle.narrative_summary}
                                                </p>
                                            </div>

                                            {/* Action Button: Stage & Open Studio */}
                                            <div className="pt-2 border-t border-border/60">
                                                <Button
                                                    onClick={() => {
                                                        stageMutation.mutate({
                                                            keyword: activePrismTrend?.keyword || '',
                                                            headline: activePrismTrend?.headline || '',
                                                            target_studio: angle.recommended_studio,
                                                            target_emotion: angle.target_emotion,
                                                            hook_title: angle.hook_title,
                                                            hook_intro_script: angle.hook_intro_script,
                                                            narrative_summary: angle.narrative_summary,
                                                            category: angle.category,
                                                            channel_name: angle.channel_name,
                                                            andRedirect: true,
                                                        });
                                                    }}
                                                    disabled={stageMutation.isPending}
                                                    className="w-full h-8 text-xs font-bold gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                                                >
                                                    <Film className="w-3.5 h-3.5" />
                                                    <span>{angle.studio_name}에서 즉시 제작</span>
                                                    <ArrowRight className="w-3 h-3 ml-auto" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/60">
                                <span className="text-xs text-muted-foreground">
                                    각 채널을 클릭하면 벙커에 기사로 자동 등록된 후 해당 폼팩터 편집기로 즉시 이동합니다.
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setActivePrismTrend(null)}
                                    className="h-8 text-xs font-semibold"
                                >
                                    닫기
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ═════════════════════════════════════════════════════════════════════════ */}
            {/* 4. LOCAL 5,000+ DB CROSS-INDEX MODAL                                      */}
            {/* ═════════════════════════════════════════════════════════════════════════ */}
            <Dialog open={!!activeCrossIndexKeyword} onOpenChange={(open) => !open && setActiveCrossIndexKeyword(null)}>
                <DialogContent className="w-[94vw] sm:max-w-4xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-xl">
                    <DialogHeader className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                <BookOpen className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <DialogTitle className="text-lg font-black text-foreground truncate">
                                    로컬 커뮤니티 DB 교차 역색인: '{activeCrossIndexKeyword}'
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    우리 시스템에 이미 수집된 5,000+건의 실시간 썰/기사 중 연관성이 가장 높은 자료를 역추적했습니다.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {isCrossIndexLoading ? (
                        <div className="py-12 text-center">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                            <p className="text-xs text-muted-foreground">로컬 데이터베이스 역색인 매칭 중...</p>
                        </div>
                    ) : (crossIndexData?.articles || []).length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground space-y-3">
                            <BookOpen className="w-8 h-8 mx-auto opacity-40" />
                            <p className="text-sm font-semibold">로컬 DB에 일치하는 커뮤니티 썰이 없습니다.</p>
                            <p className="text-xs max-w-md mx-auto">
                                아래 <strong>[원천 기사 수집]</strong> 버튼을 누르면 구글 뉴스를 통해 실시간 기사를 즉시 수집하여 DB에 적재할 수 있습니다.
                            </p>
                            {activeCrossIndexKeyword && (
                                <Button
                                    size="sm"
                                    onClick={() =>
                                        harvestNewsMutation.mutate({
                                            keyword: activeCrossIndexKeyword,
                                        })
                                    }
                                    disabled={harvestNewsMutation.isPending}
                                    className="text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${harvestNewsMutation.isPending ? 'animate-spin' : ''}`} />
                                    <span>'{activeCrossIndexKeyword}' 원천 기사 수집</span>
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2.5 pt-2">
                            <div className="flex items-center justify-between px-1 pb-1">
                                <span className="text-xs text-muted-foreground">
                                    총 <strong className="text-foreground">{crossIndexData?.articles?.length || 0}건</strong>의 연관 자료가 매칭되었습니다.
                                </span>
                                {activeCrossIndexKeyword && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            harvestNewsMutation.mutate({
                                                keyword: activeCrossIndexKeyword,
                                            })
                                        }
                                        disabled={harvestNewsMutation.isPending}
                                        className="h-7 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${harvestNewsMutation.isPending ? 'animate-spin' : ''}`} />
                                        <span>추가 원천 뉴스 수집</span>
                                    </Button>
                                )}
                            </div>
                            {(crossIndexData?.articles || []).map((art) => (
                                <div
                                    key={art.id}
                                    className="p-3.5 rounded-xl bg-muted/30 border border-border/70 hover:border-primary/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                >
                                    <div className="space-y-1 min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] font-semibold border-border/80">
                                                {art.community_name || art.source_type}
                                            </Badge>
                                            <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px] font-mono">
                                                {art.viral_score.toFixed(1)}점
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Eye className="w-2.5 h-2.5" />
                                                {art.views.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <MessageSquare className="w-2.5 h-2.5" />
                                                {art.comments_count}
                                            </span>
                                        </div>

                                        <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                                            {art.title}
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                            {art.snippet}
                                        </p>
                                    </div>

                                    {/* Edit Button - Responsive & Never Clipped */}
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setActiveCrossIndexKeyword(null);
                                            navigate(`/shorts-editor/ssul?article_id=${art.id}`);
                                        }}
                                        className="h-8.5 px-3.5 text-xs font-bold shrink-0 w-full sm:w-auto min-w-[105px] whitespace-nowrap gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                                    >
                                        <Film className="w-3.5 h-3.5" />
                                        <span>편집기 열기</span>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ═════════════════════════════════════════════════════════════════════════ */}
            {/* 5. LANGGRAPH AUTONOMOUS PIPELINE RESULT MODAL                             */}
            {/* ═════════════════════════════════════════════════════════════════════════ */}
            <Dialog open={!!activePipelineResult} onOpenChange={(open) => !open && setActivePipelineResult(null)}>
                <DialogContent className="w-[94vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-xl">
                    <DialogHeader className="space-y-2">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <DialogTitle className="text-lg font-black text-foreground truncate">
                                    LangGraph 자율 팩토리 영상 제작 완료!
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Scout 노드부터 Critic-85 게이트키퍼 통과 및 CapCut 조립까지 전자동 수행되었습니다.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {activePipelineResult && (
                        <div className="space-y-4 pt-2">
                            {/* 6-Stage Phase Stepper Visual */}
                            <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-2">
                                <span className="text-[11px] font-extrabold text-muted-foreground">
                                    ⚡ 자율 상태 머신 (StateGraph) 통과 경로:
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                        ✓ 1. Scout
                                    </Badge>
                                    <span className="text-muted-foreground">➔</span>
                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                        ✓ 2. Writer-Pro
                                    </Badge>
                                    <span className="text-muted-foreground">➔</span>
                                    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold">
                                        ✓ 3. Critic ({activePipelineResult.critic_score}점)
                                    </Badge>
                                    <span className="text-muted-foreground">➔</span>
                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                        ✓ 4. HITL 승인
                                    </Badge>
                                    <span className="text-muted-foreground">➔</span>
                                    <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                                        ✓ 5. CapCut 드래프트
                                    </Badge>
                                    <span className="text-muted-foreground">➔</span>
                                    <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-bold">
                                        ✓ 6. WorkQueue 등록
                                    </Badge>
                                </div>
                            </div>

                            {/* Critic Feedback Banner */}
                            <div className="p-3 rounded-xl bg-card border border-border/80 flex items-start gap-2.5">
                                <span className="text-base">🧐</span>
                                <div className="space-y-0.5 min-w-0 flex-1">
                                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                                        <span>Critic-85 게이트키퍼 감사 결과:</span>
                                        <span className="font-mono text-primary">{activePipelineResult.critic_score}점 / 100점 (합격)</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {activePipelineResult.critic_feedback || '우수한 후킹 강도와 시청 유지 확률로 심사를 통과했습니다.'}
                                    </p>
                                </div>
                            </div>

                            {/* Generated Script Preview */}
                            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/70 space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-primary" />
                                        생성된 숏폼 완성 대본 (9-Wave & 0.8s jab):
                                    </span>
                                </div>
                                <pre className="text-xs font-sans text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto p-2.5 rounded-lg bg-card border border-border/50">
                                    {activePipelineResult.script_content || activePipelineResult.pipeline_res?.script_content}
                                </pre>
                            </div>

                            {/* Draft Path Notice */}
                            {activePipelineResult.draft_project_path && (
                                <div className="p-2.5 rounded-lg bg-muted/50 border border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                                    <span>📦 조립 완료 드래프트 파일:</span>
                                    <span className="font-mono text-foreground font-semibold truncate max-w-xs">
                                        {activePipelineResult.draft_project_path}
                                    </span>
                                </div>
                            )}

                            {/* Dialog Footer Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/60">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate('/channels')}
                                    className="text-xs font-semibold gap-1.5 cursor-pointer"
                                >
                                    <Layers className="w-3.5 h-3.5" />
                                    <span>대기열(WorkQueue) 확인</span>
                                </Button>

                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            const artId = activePipelineResult.pipeline_res?.article_id;
                                            setActivePipelineResult(null);
                                            if (artId) {
                                                navigate(`/shorts-editor/gunlimbo?article_id=${artId}`);
                                            } else {
                                                navigate('/shorts-editor/gunlimbo');
                                            }
                                        }}
                                        className="text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 cursor-pointer"
                                    >
                                        <Film className="w-3.5 h-3.5" />
                                        <span>전용 편집기에서 확인</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setActivePipelineResult(null)}
                                        className="text-xs font-semibold cursor-pointer"
                                    >
                                        닫기
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
