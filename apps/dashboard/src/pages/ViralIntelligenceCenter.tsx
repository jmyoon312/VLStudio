import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import {
    Flame,
    Sparkles,
    CheckCircle2,
    RefreshCw,
    Search,
    Filter,
    ExternalLink,
    Play,
    Send,
    Eye,
    ThumbsUp,
    MessageSquare,
    Zap,
    Download,
    Cpu,
    Radio,
    Layers,
    Share2,
    ArrowUpRight,
    Tag,
    Clock,
    UserCheck,
    Image as ImageIcon
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ViralArticle {
    id: number;
    source_type: string;
    community_name: string;
    category: string;
    title: string;
    url: string;
    author: string;
    views: number;
    likes: number;
    comments_count: number;
    content_text: string;
    images: string[];
    scraped_at: string;
    analysis_summary?: string;
    suggested_title?: string;
    viral_score: number;
    target_form_factors: string[];
    structured_script?: {
        headline_line1?: string;
        headline_line2?: string;
        scenes?: Array<{
            scene_index: number;
            duration_sec: number;
            hook_jab_text: string;
            visual_prompt: string;
            narration: string;
            coupang_product_keyword?: string;
        }>;
    };
    status: 'collected' | 'analyzed' | 'claimed' | 'produced';
    claimed_by_channel_id?: string;
    claimed_at?: string;
    comments?: Array<{
        id: number;
        author: string;
        text: string;
        likes: number;
        is_best: boolean;
    }>;
}

export default function ViralIntelligenceCenter() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Filters
    const [selectedSource, setSelectedSource] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'viral_score' | 'views' | 'likes' | 'recent'>('viral_score');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [page, setPage] = useState<number>(1);

    // Free Media Search Modal State
    const [mediaModalOpen, setMediaModalOpen] = useState(false);
    const [mediaQuery, setMediaQuery] = useState('');
    const [mediaResults, setMediaResults] = useState<any[]>([]);
    const [searchingMedia, setSearchingMedia] = useState(false);

    // Selected Article for Detail Modal
    const [activeArticle, setActiveArticle] = useState<ViralArticle | null>(null);

    // 1. Fetch Sources
    const { data: sourcesData } = useQuery({
        queryKey: ['viral_sources'],
        queryFn: async () => {
            const res = await api.get('/viral/sources');
            return res.data;
        }
    });

    // 2. Fetch Stats
    const { data: statsData } = useQuery({
        queryKey: ['viral_stats'],
        queryFn: async () => {
            const res = await api.get('/viral/stats');
            return res.data;
        },
        refetchInterval: 15000,
    });

    // 3. Fetch Brand Channels for Claiming
    const { data: channelsData } = useQuery({
        queryKey: ['brand_channels'],
        queryFn: async () => {
            const res = await api.get('/brand-channels');
            return res.data?.items || res.data || [];
        }
    });

    // 4. Fetch Articles
    const { data: articlesData, isLoading: articlesLoading, refetch: refetchArticles } = useQuery({
        queryKey: ['viral_articles', selectedSource, selectedCategory, selectedStatus, sortBy, searchQuery, page],
        queryFn: async () => {
            const params = new URLSearchParams({
                sort_by: sortBy,
                page: page.toString(),
                limit: '24',
            });
            if (selectedSource !== 'all') params.append('community_name', selectedSource);
            if (selectedCategory !== 'all') params.append('category', selectedCategory);
            if (selectedStatus !== 'all') params.append('status', selectedStatus);
            if (searchQuery.trim()) params.append('search', searchQuery.trim());

            const res = await api.get(`/viral/articles?${params.toString()}`);
            return res.data;
        },
        refetchInterval: 30000,
    });

    // Scrape Now Mutation
    const scrapeMutation = useMutation({
        mutationFn: async (sourceCode?: string) => {
            const url = sourceCode ? `/viral/scrape-now?source_code=${encodeURIComponent(sourceCode)}` : '/viral/scrape-now';
            const res = await api.post(url);
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(`수집 완료! ${data.total_upserted || data.count || 0}개 기사 갱신`);
            queryClient.invalidateQueries({ queryKey: ['viral_articles'] });
            queryClient.invalidateQueries({ queryKey: ['viral_stats'] });
        },
        onError: (err: any) => {
            toast.error(`수집 실패: ${err?.message || '네트워크 오류'}`);
        }
    });

    // Scout-Alpha Analyze Mutation
    const analyzeMutation = useMutation({
        mutationFn: async (articleId: number) => {
            const res = await api.post(`/viral/articles/${articleId}/analyze`);
            return res.data;
        },
        onSuccess: (updated: ViralArticle) => {
            toast.success(`Scout-Alpha 분석 완료! 바이럴 지수: ${updated.viral_score}점`);
            queryClient.invalidateQueries({ queryKey: ['viral_articles'] });
            queryClient.invalidateQueries({ queryKey: ['viral_stats'] });
            if (activeArticle && activeArticle.id === updated.id) {
                setActiveArticle(updated);
            }
        },
        onError: (err: any) => {
            toast.error(`분석 실패: ${err?.message || 'LLM 호출 오류'}`);
        }
    });

    // Claim Mutation
    const claimMutation = useMutation({
        mutationFn: async ({ articleId, channelId }: { articleId: number; channelId: number }) => {
            const res = await api.post(`/viral/articles/${articleId}/claim?channel_id=${channelId}`);
            return res.data;
        },
        onSuccess: () => {
            toast.success('채널 수주 성공! 제작 파이프라인에 등록되었습니다.');
            queryClient.invalidateQueries({ queryKey: ['viral_articles'] });
            queryClient.invalidateQueries({ queryKey: ['viral_stats'] });
        },
        onError: (err: any) => {
            toast.error(`수주 실패: ${err?.response?.data?.detail || err?.message}`);
        }
    });

    // Unclaim Mutation
    const unclaimMutation = useMutation({
        mutationFn: async (articleId: number) => {
            const res = await api.post(`/viral/articles/${articleId}/unclaim`);
            return res.data;
        },
        onSuccess: () => {
            toast.success('수주가 취소되어 공용 풀로 반환되었습니다.');
            queryClient.invalidateQueries({ queryKey: ['viral_articles'] });
            queryClient.invalidateQueries({ queryKey: ['viral_stats'] });
        }
    });

    // Free Media Search Trigger
    const handleMediaSearch = async () => {
        if (!mediaQuery.trim()) return;
        setSearchingMedia(true);
        try {
            const res = await api.get(`/viral/media/search?query=${encodeURIComponent(mediaQuery.trim())}&limit=16`);
            setMediaResults(res.data?.results || []);
            if (!res.data?.results?.length) {
                toast.info('검색 결과가 없습니다.');
            }
        } catch (e: any) {
            toast.error(`이미지 검색 실패: ${e?.message}`);
        } finally {
            setSearchingMedia(false);
        }
    };

    // Forward to Editor Studio
    const handleSendToEditor = (article: ViralArticle, formFactor: 'gunlimbo' | 'ssul') => {
        const headline1 = article.structured_script?.headline_line1 || article.suggested_title || article.title;
        const headline2 = article.structured_script?.headline_line2 || '';

        // Navigate to dedicated studio with initial state
        const targetPath = formFactor === 'gunlimbo' ? '/shorts-editor/gunlimbo' : '/shorts-editor/ssul';
        navigate(targetPath, {
            state: {
                articleId: article.id,
                title: headline1,
                subtitle: headline2,
                script: article.structured_script,
                sourceUrl: article.url,
            }
        });
        toast.success(`[${formFactor === 'gunlimbo' ? '군림보' : '썰형'} 전용 편집기]로 대본과 타이틀이 전송되었습니다!`);
    };

    const channels = Array.isArray(channelsData) ? channelsData : [];
    const articles: ViralArticle[] = articlesData?.articles || [];
    const totalCount = articlesData?.total || 0;

    return (
        <div className="space-y-6 pb-20 md:pb-8">
            {/* 1. Header & Live Radar HUD */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-xs">
                            <Flame className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                                바이럴 인텔리전스 센터
                                <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-500 border-rose-500/20 font-bold">
                                    Scout-Alpha 레이더
                                </Badge>
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                31대 커뮤니티 및 네이버 6대 분야 실시간 수집 · AI 화제성 분석 · 채널 자율 수주 및 군림보/썰형 원클릭 직결
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMediaModalOpen(true)}
                        className="h-9 gap-1.5 text-xs font-semibold shadow-2xs"
                    >
                        <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                        무비용 실사 검색
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => scrapeMutation.mutate()}
                        disabled={scrapeMutation.isPending}
                        className="h-9 gap-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${scrapeMutation.isPending ? 'animate-spin' : ''}`} />
                        {scrapeMutation.isPending ? '전수 수집 중...' : '지금 전체 수집'}
                    </Button>
                </div>
            </div>

            {/* 2. Top Stats Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-card border-border/80 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-[11px] font-medium text-muted-foreground">총 수집 화제글</div>
                            <div className="text-xl font-black text-foreground mt-0.5">{statsData?.total_articles || totalCount || 0}</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
                            <Radio className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border/80 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-[11px] font-medium text-muted-foreground">Scout 분석 완료</div>
                            <div className="text-xl font-black text-amber-500 mt-0.5">{statsData?.analyzed_articles || 0}</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
                            <Sparkles className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border/80 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-[11px] font-medium text-muted-foreground">채널 수주 완료</div>
                            <div className="text-xl font-black text-emerald-500 mt-0.5">{statsData?.claimed_articles || 0}</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                            <UserCheck className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border/80 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-[11px] font-medium text-muted-foreground">감시 대상 채널/보드</div>
                            <div className="text-xl font-black text-purple-500 mt-0.5">37개 채널</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-500">
                            <Layers className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 3. Filter Bar */}
            <Card className="bg-card border-border/80 shadow-xs">
                <CardContent className="p-3.5 space-y-3">
                    {/* Top Controls: Search + Sort + Status */}
                    <div className="flex flex-col sm:flex-row items-center gap-2.5">
                        <div className="relative w-full sm:w-80">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="제목 / 키워드 검색..."
                                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
                            {(['all', 'collected', 'analyzed', 'claimed'] as const).map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setSelectedStatus(st)}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                                        selectedStatus === st
                                            ? 'bg-primary text-primary-foreground shadow-2xs'
                                            : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                                    }`}
                                >
                                    {st === 'all' ? '전체 상태' : st === 'collected' ? '수집됨' : st === 'analyzed' ? '분석완료' : '수주됨'}
                                </button>
                            ))}
                        </div>

                        {/* Sort Dropdown */}
                        <div className="ml-auto flex items-center gap-1.5 w-full sm:w-auto justify-end">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Filter className="w-3 h-3" /> 정렬:
                            </span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="h-8 text-xs font-semibold rounded-lg bg-card border border-border text-foreground px-2 shadow-2xs focus:outline-hidden"
                            >
                                <option value="viral_score">화제성 점수순</option>
                                <option value="views">조회수순</option>
                                <option value="likes">추천/공감순</option>
                                <option value="recent">최신 수집순</option>
                            </select>
                        </div>
                    </div>

                    {/* Community / News Source Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-xs">
                        <span className="text-muted-foreground font-semibold shrink-0 mr-1">출처:</span>
                        <button
                            onClick={() => setSelectedSource('all')}
                            className={`px-2 py-0.5 rounded-md shrink-0 font-semibold transition-colors ${
                                selectedSource === 'all'
                                    ? 'bg-rose-500 text-white shadow-2xs'
                                    : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            전체 (37개)
                        </button>
                        {/* Naver News Quick Tabs */}
                        {[
                            { code: 'naver_politics', name: '네이버 정치' },
                            { code: 'naver_economy', name: '네이버 경제' },
                            { code: 'naver_society', name: '네이버 사회' },
                            { code: 'naver_it', name: '네이버 IT' },
                        ].map((n) => (
                            <button
                                key={n.code}
                                onClick={() => setSelectedSource(n.code)}
                                className={`px-2 py-0.5 rounded-md shrink-0 font-medium transition-colors ${
                                    selectedSource === n.code
                                        ? 'bg-rose-500 text-white'
                                        : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                {n.name}
                            </button>
                        ))}
                        {/* Popular Korean Communities */}
                        {[
                            { code: 'fmkorea', name: '에펨코리아' },
                            { code: 'dcinside_best', name: '디시 실베' },
                            { code: 'natepann', name: '네이트판' },
                            { code: 'ruli', name: '루리웹' },
                            { code: 'theqoo', name: '더쿠' },
                            { code: 'bobae_best', name: '보배드림' },
                            { code: 'inven', name: '인벤' },
                            { code: 'ppomppu', name: '뽐뿌' },
                            { code: 'dogdrip', name: '개드립' },
                            { code: 'damoang_free', name: '다모앙' },
                            { code: 'arca_headline', name: '아카라이브' },
                        ].map((c) => (
                            <button
                                key={c.code}
                                onClick={() => setSelectedSource(c.code)}
                                className={`px-2 py-0.5 rounded-md shrink-0 font-medium transition-colors ${
                                    selectedSource === c.code
                                        ? 'bg-rose-500 text-white'
                                        : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* 4. Article Grid */}
            {articlesLoading ? (
                <div className="py-20 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                    바이럴 아티클 로딩 중...
                </div>
            ) : articles.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl p-8">
                    <Flame className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                    수집된 기사가 없습니다. 상단의 <strong>[지금 전체 수집]</strong> 버튼을 눌러 실시간 레이더를 가동해 보세요.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {articles.map((art) => {
                        const isClaimed = !!art.claimed_by_channel_id;
                        const hasScript = !!art.structured_script;
                        const score = Math.round(art.viral_score || 50);

                        return (
                            <Card
                                key={art.id}
                                className={`bg-card border transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                                    isClaimed ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/80'
                                }`}
                            >
                                <CardHeader className="p-4 pb-2 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0.5 bg-muted text-muted-foreground">
                                                {art.community_name}
                                            </Badge>
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-border">
                                                {art.category}
                                            </Badge>
                                            {isClaimed && (
                                                <Badge className="text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                                    채널 #{art.claimed_by_channel_id} 수주
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Viral Score Badge */}
                                        <div className={`px-2 py-0.5 rounded-full text-xs font-black flex items-center gap-1 ${
                                            score >= 80
                                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                                : score >= 60
                                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                : 'bg-muted text-muted-foreground'
                                        }`}>
                                            <Flame className="w-3 h-3" />
                                            {score}점
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 break-all hover:text-rose-500 transition-colors">
                                        <a href={art.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1">
                                            <span>{art.title}</span>
                                            <ExternalLink className="w-3 h-3 shrink-0 opacity-50 mt-0.5" />
                                        </a>
                                    </h3>

                                    {/* Scout Suggested Title if analyzed */}
                                    {art.suggested_title && (
                                        <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-semibold leading-tight">
                                            <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 block mb-0.5">
                                                🎯 Scout 추천 쇼츠 헤드라인
                                            </span>
                                            {art.suggested_title}
                                        </div>
                                    )}
                                </CardHeader>

                                <CardContent className="p-4 pt-2 space-y-3">
                                    {/* Metrics (Views / Likes / Comments) */}
                                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground border-y border-border/60 py-1.5">
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-3 h-3" /> {art.views?.toLocaleString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <ThumbsUp className="w-3 h-3" /> {art.likes?.toLocaleString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MessageSquare className="w-3 h-3" /> {art.comments_count?.toLocaleString()}
                                        </span>
                                        <span className="ml-auto flex items-center gap-1 text-[10px]">
                                            <Clock className="w-3 h-3" /> {art.scraped_at ? new Date(art.scraped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-1.5 pt-1">
                                        {/* Row 1: Analyze & Claim */}
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => analyzeMutation.mutate(art.id)}
                                                disabled={analyzeMutation.isPending}
                                                className="h-8 text-[11px] font-bold gap-1 border-border"
                                            >
                                                <Sparkles className="w-3 h-3 text-amber-500" />
                                                {art.status === 'analyzed' ? '재분석' : 'Scout 분석'}
                                            </Button>

                                            {isClaimed ? (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => unclaimMutation.mutate(art.id)}
                                                    className="h-8 text-[11px] font-bold text-rose-500"
                                                >
                                                    수주 취소
                                                </Button>
                                            ) : (
                                                <select
                                                    onChange={(e) => {
                                                        const chId = Number(e.target.value);
                                                        if (chId) claimMutation.mutate({ articleId: art.id, channelId: chId });
                                                    }}
                                                    defaultValue=""
                                                    className="h-8 text-[11px] font-bold rounded-md bg-muted/60 border border-border text-foreground px-2 focus:outline-hidden"
                                                >
                                                    <option value="" disabled>채널 수주...</option>
                                                    {channels.map((ch: any) => (
                                                        <option key={ch.id} value={ch.id}>
                                                            {ch.title || `채널 #${ch.id}`}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>

                                        {/* Row 2: Forward to Gunlimbo / Ssul Dedicated Studio */}
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <Button
                                                size="sm"
                                                onClick={() => handleSendToEditor(art, 'gunlimbo')}
                                                className="h-8 text-[11px] font-extrabold bg-amber-500 hover:bg-amber-600 text-slate-950 gap-1 shadow-2xs"
                                            >
                                                <Play className="w-3 h-3 fill-current" />
                                                군림보 스튜디오
                                            </Button>

                                            <Button
                                                size="sm"
                                                onClick={() => handleSendToEditor(art, 'ssul')}
                                                className="h-8 text-[11px] font-extrabold bg-blue-600 hover:bg-blue-700 text-white gap-1 shadow-2xs"
                                            >
                                                <Zap className="w-3 h-3 fill-current" />
                                                썰형 스튜디오
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* 5. Free Real Photo Search Modal (0-Cost DuckDuckGo + Naver) */}
            {mediaModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                                    <ImageIcon className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-bold text-foreground">무비용 실사 검색 (DuckDuckGo + Naver)</h3>
                            </div>
                            <button
                                onClick={() => setMediaModalOpen(false)}
                                className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-4 border-b border-border flex items-center gap-2">
                            <input
                                type="text"
                                value={mediaQuery}
                                onChange={(e) => setMediaQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleMediaSearch()}
                                placeholder="검색할 실사 키워드 (예: 손흥민 골 세레머니, 아이폰 케이스)..."
                                className="flex-1 h-9 px-3 text-xs rounded-lg bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground focus:outline-hidden"
                            />
                            <Button
                                size="sm"
                                onClick={handleMediaSearch}
                                disabled={searchingMedia}
                                className="h-9 px-4 text-xs font-bold bg-primary text-primary-foreground"
                            >
                                {searchingMedia ? '검색 중...' : '검색'}
                            </Button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            {searchingMedia ? (
                                <div className="py-20 text-center text-xs text-muted-foreground">
                                    고해상도 실사 이미지를 실시간 수집하는 중...
                                </div>
                            ) : mediaResults.length === 0 ? (
                                <div className="py-20 text-center text-xs text-muted-foreground">
                                    키워드를 입력하고 검색하면 워터마크 없는 0원 실사 이미지가 표시됩니다.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {mediaResults.map((item, idx) => (
                                        <div key={idx} className="group relative rounded-lg overflow-hidden border border-border bg-muted/30 flex flex-col">
                                            <img
                                                src={item.thumbnail || item.url}
                                                alt={item.title}
                                                className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-200"
                                                loading="lazy"
                                            />
                                            <div className="p-1.5 text-[10px] font-medium text-foreground truncate">
                                                {item.title}
                                            </div>
                                            <div className="p-1.5 pt-0 flex items-center justify-between text-[9px] text-muted-foreground">
                                                <span>{item.provider}</span>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6"
                                                    onClick={async () => {
                                                        try {
                                                            await api.post(`/viral/media/download?url=${encodeURIComponent(item.url)}&query_hint=${encodeURIComponent(item.title || 'media')}`);
                                                            toast.success('로컬 캐시에 이미지 다운로드 완료!');
                                                        } catch (err: any) {
                                                            toast.error('다운로드 실패: ' + err.message);
                                                        }
                                                    }}
                                                >
                                                    <Download className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
