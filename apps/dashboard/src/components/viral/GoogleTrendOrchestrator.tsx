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
    X,
    Maximize2
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

    // ── Queries ──
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
                                    {/* Primary 1-Click AI Prism Expansion */}
                                    <Button
                                        onClick={() => handleOpenPrism(item)}
                                        className="w-full h-8 text-xs font-extrabold bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 text-primary-foreground shadow-xs gap-1.5 cursor-pointer"
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
        </div>
    );
};
