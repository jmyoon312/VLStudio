import React, { useState, useEffect } from 'react';
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
    Image as ImageIcon,
    BookOpen,
    CheckSquare,
    Square,
    FileText,
    TrendingUp,
    Volume2,
    Tv,
    ShieldAlert,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Globe,
    X,
    LayoutGrid,
    ListFilter,
    Table as TableIcon,
    Film,
    Clapperboard,
    Compass,
    SlidersHorizontal,
    Check,
    ArrowRight,
    Copy,
    Maximize2,
    Heart,
    Activity,
    Trash2,
    Calendar,
    AlertTriangle,
    FolderPlus,
    Bot
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ViralIntelligenceQuantRadar } from '@/components/viral/ViralIntelligenceQuantRadar';
import { CollectorTelemetryPanel, TelemetryMetric } from '@/components/viral/CollectorTelemetryPanel';
import { InlineArticleRenderer } from '@/components/viral/InlineArticleRenderer';

export const getProxyImageUrl = (url?: string | null): string => {
    if (!url) return '';
    // 상대경로(./_media/..., /_media/... 등)는 프록시 불가 → 빈 문자열 반환 (투명 폴백)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // 이미 /api 경로거나 data:, blob: URI는 그대로 반환
        if (url.startsWith('/api') || url.startsWith('data:') || url.startsWith('blob:')) return url;
        return ''; // 상대경로 차단
    }
    return `/api/viral/proxy-image?url=${encodeURIComponent(url)}`;
};

export const formatRelativeTime = (article: { created_at_source?: string | null; scraped_at?: string | null }): string => {
    const rawTime = article.created_at_source || article.scraped_at;
    if (!rawTime) return '방금 전';

    let dt: Date | null = null;
    try {
        if (rawTime.includes('.')) {
            const parts = rawTime.trim().split(/[\s.]+/);
            if (parts.length >= 5) {
                dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), Number(parts[3]), Number(parts[4]));
            }
        }
        if (!dt || isNaN(dt.getTime())) {
            dt = new Date(rawTime);
        }
    } catch {
        dt = null;
    }

    if (!dt || isNaN(dt.getTime())) return '최신';

    const diffMs = Date.now() - dt.getTime();
    if (diffMs < 0) return '방금 전';
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}일 전`;
    return `${Math.floor(diffDays / 30)}개월 전`;
};

export interface ViralArticle {
    id: number;
    source_type: string;
    community_name: string;
    category: string;
    title: string;
    url: string;
    author: string;
    created_at_source?: string | null;
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
    // 🌐 5-D 멀티 루트 인텔리전스 & 10대 테마 분류
    search_traffic?: string;
    velocity_score?: number;
    cluster_count?: number;
    cluster_keywords?: string[];
    topic_category?: string;
    media_type?: string;
    entity_tags?: string[];
    cross_topics?: string[];
    series_key?: string | null;
    status?: string;
    claimed_by_channel_id?: string | null;
    psychological_trigger?: string;
    retention_probability?: number;
    lifespan_phase?: string;
    golden_time_hours?: number;
    // 🎬 미디어 파이프라인 자산
    media_file_path?: string | null;
    video_duration?: number;
    has_transcript?: boolean;
    char_count?: number;
    // ⚡ 폼팩터 적합도 & 도파민 인텔리전스
    gunlimbo_score?: number;
    ssul_score?: number;
    classic_score?: number;
    dopamine_index?: number;
    recommended_form_factor?: string;
    hook_line?: string;
    structured_script?: {
        video_worthiness?: number;
        headline_line1?: string;
        headline_line2?: string;
        why_viral?: string;
        key_reaction_quote?: string;
        sentiment_topology?: {
            pro_ratio?: number;
            con_ratio?: number;
            neutral_ratio?: number;
            core_debate?: string;
        };
        story_timeline?: {
            stage_1_origin?: string;
            stage_2_development?: string;
            stage_3_climax?: string;
            stage_4_conclusion?: string;
        };
        suggested_form_factor?: string;
        form_factor_reason?: string;
        scenes?: Array<{
            scene_index: number;
            duration_sec: number;
            hook_jab_text: string;
            visual_prompt: string;
            narration: string;
            coupang_product_keyword?: string;
        }>;
        agent_directives?: {
            writer?: { tone?: string; pacing?: string; hook_strategy?: string };
            voice?: { tone?: string; recommended_speed?: number; pitch_note?: string };
            visual?: { style?: string; search_keywords?: string[] };
        };
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

export type MasterRouteKey = 'community' | 'news' | 'reddit' | 'google_trends' | 'youtube_shorts' | 'video_vault' | 'script_lab' | 'all';

export default function ViralIntelligenceCenter() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // 🌐 Radar Toggle State (Quant vs Telemetry)
    const [radarMode, setRadarMode] = useState<'quant' | 'telemetry'>('quant');

    // Telemetry Query
    const { data: telemetryData, refetch: refetchTelemetry } = useQuery({
        queryKey: ['viral_collector_telemetry'],
        queryFn: async () => {
            const res = await api.get('/viral/collector-telemetry');
            return res.data;
        },
        refetchInterval: 30000,
    });

    // 🌐 Pixeling 3 Tabs & Multi-Routes
    const [selectedRoute, setSelectedRoute] = useState<MasterRouteKey>('community');

    // 🎴 Pixeling 2-Column Dual Grid (Default) vs Table Mode
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

    // 🏛️ Sub-Navigation States
    // 1. Community tab: Region (전체 / 국내 / 해외) & Platform
    const [communityRegion, setCommunityRegion] = useState<'all' | 'domestic' | 'global'>('all');
    const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
    const [isGlobalExpanded, setIsGlobalExpanded] = useState<boolean>(true);

    // 2. News tab: 8 Categories
    const [selectedNewsCategory, setSelectedNewsCategory] = useState<string>('all');

    // 3. Reddit tab: 10 Topics
    const [selectedRedditTopic, setSelectedRedditTopic] = useState<string>('all');

    // 4. Script Lab 5-tier Query Bar States (ScriptLab.tsx Parity)
    const [statusFilter, setStatusFilter] = useState<string>('all');       // 전체 | 신규수집 | 검수완료 | 숏폼각색 | 롱폼창작 | 보관
    const [lengthFilter, setLengthFilter] = useState<string>('all');       // 전체 | short (<500) | standard (500~1500) | long (>1500)
    const [rangeFilter, setRangeFilter] = useState<string>('all');         // 전체 | 1d | 3d | 7d | 30d
    const [sortBy, setSortBy] = useState<'viral_score' | 'velocity' | 'views' | 'comments' | 'recent' | 'likes'>('viral_score');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [page, setPage] = useState<number>(1);

    // 6-D Psychological Trigger Filter
    const [selectedTrigger, setSelectedTrigger] = useState<string>('all');

    // 🏷️ 15대 테마 클러스터 & 2D 크로스 시너지 & 시리즈 팩 & 채널 큐 상태
    const [selectedTopicCategory, setSelectedTopicCategory] = useState<string>('all');
    const [selectedEntityTag, setSelectedEntityTag] = useState<string>('all');
    const [selectedCrossTopic, setSelectedCrossTopic] = useState<string>('all');
    const [selectedSeriesKey, setSelectedSeriesKey] = useState<string>('all');
    const [selectedMediaType, setSelectedMediaType] = useState<string>('all');
    const [selectedChannelId, setSelectedChannelId] = useState<string>('all');
    const [seriesModalOpen, setSeriesModalOpen] = useState<boolean>(false);

    // Multi-Selection State for Batch Handoff
    const [selectedArticleIds, setSelectedArticleIds] = useState<number[]>([]);
    const [targetClaimChannel, setTargetClaimChannel] = useState<string>('');

    // 🖼️ In-App Electron Lightbox Modal State
    const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; source: string; articleUrl?: string } | null>(null);

    // Free Media Search Modal State
    const [mediaModalOpen, setMediaModalOpen] = useState(false);
    const [mediaQuery, setMediaQuery] = useState('');
    const [mediaResults, setMediaResults] = useState<any[]>([]);
    const [searchingMedia, setSearchingMedia] = useState(false);

    // Deep Inspection Modal State
    const [activeArticle, setActiveArticle] = useState<ViralArticle | null>(null);
    const openArticleDetail = (art: ViralArticle) => {
        setActiveArticle(art);
        setInspectionTab('decision_brief');
    };
    const [inspectionTab, setInspectionTab] = useState<'decision_brief' | 'full_content' | 'narrative' | 'sentiment'>('decision_brief');
    const [isGalleryExpanded, setIsGalleryExpanded] = useState(false);

    // Batch Scraping State
    const [batchScraping, setBatchScraping] = useState(false);
    const [batchScrapeProgress, setBatchScrapeProgress] = useState(0);

    // 🗑️ 수집 데이터 맞춤 정리/삭제 모달 상태
    const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
    const [cleanupMode, setCleanupMode] = useState<'all' | 'platform' | 'period' | 'selected'>('period');
    const [cleanupPlatform, setCleanupPlatform] = useState<string>('fmkorea');
    const [cleanupHours, setCleanupHours] = useState<number>(24);

    const cleanupMutation = useMutation({
        mutationFn: async (payload: { mode: string; platform?: string; older_than_hours?: number; article_ids?: number[] }) => {
            const res = await api.delete('/viral/articles/cleanup', { data: payload });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || '수집 기사가 성공적으로 정리되었습니다.');
            queryClient.invalidateQueries({ queryKey: ['viral_articles'] });
            queryClient.invalidateQueries({ queryKey: ['viral_hud_stats'] });
            setSelectedArticleIds([]);
            setIsCleanupModalOpen(false);
        },
        onError: (err: any) => {
            toast.error(`삭제 실패: ${err.response?.data?.detail || err.message}`);
        }
    });

    // Helper: Format and validate URL
    const toValidUrl = (url?: string): string => {
        if (!url) return '#';
        let trimmed = url.trim();
        if (trimmed.startsWith('//')) return 'https:' + trimmed;
        if (trimmed.startsWith('/')) return 'https://www.fmkorea.com' + trimmed;
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return 'https://' + trimmed;
        return trimmed;
    };

    // Helper: Open External URL in Default Browser
    const handleOpenExternal = (url?: string, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        if (!url) return;
        const validUrl = toValidUrl(url);
        if (!validUrl || validUrl === '#') return;

        // 1. Electron Desktop 환경: OS 기본 브라우저 호출
        if ((window as any).electronAPI?.openExternal) {
            if (e) e.preventDefault();
            (window as any).electronAPI.openExternal(validUrl);
            return;
        }

        // 2. 일반 웹 브라우저: 클릭 대상이 <a> 태그이면 브라우저 표준 target="_blank"에 위임 (팝업 차단 0%)
        if (e && ((e.currentTarget as HTMLElement).tagName === 'A' || (e.target as HTMLElement).closest('a'))) {
            return;
        }

        // 3. 버튼 등 일반 엘리먼트에서 호출된 경우
        if (e) e.preventDefault();
        try {
            const win = window.open(validUrl, '_blank');
            if (!win || win.closed || typeof win.closed === 'undefined') {
                const a = document.createElement('a');
                a.href = validUrl;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        } catch {
            const a = document.createElement('a');
            a.href = validUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    // Close Lightbox on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setLightboxImage(null);
                setActiveArticle(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Formatters
    const formatCount = (count?: number) => {
        if (!count || count <= 0) return '0';
        if (count >= 100000000) return `${(count / 100000000).toFixed(1)}억`;
        if (count >= 10000) return `${(count / 10000).toFixed(1)}만`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
        return count.toLocaleString();
    };

    const formatVelocity = (vel?: number) => {
        if (!vel || vel <= 0) return '-';
        if (vel >= 10000) return `+${(vel / 10000).toFixed(1)}만/h`;
        if (vel >= 1000) return `+${(vel / 1000).toFixed(1)}k/h`;
        return `+${vel.toFixed(0)}/h`;
    };

    const extractHookSentence = (text?: string, title?: string): string => {
        if (!text || text.trim().length === 0) return title || '';
        const lines = text.replace(/\r/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 0) {
            const first = lines[0];
            return first.length > 85 ? `${first.slice(0, 85)}...` : first;
        }
        return title || '';
    };

    // 1. Fetch Sources Metadata
    const { data: sourcesData } = useQuery({
        queryKey: ['viral_sources'],
        queryFn: async () => {
            const res = await api.get('/viral/sources');
            return res.data;
        },
        staleTime: 60000,
    });

    // 2. Fetch HUD Stats
    const { data: hudStats, refetch: refetchHudStats, isFetching: isRefreshingHud } = useQuery({
        queryKey: ['viral_hud_stats'],
        queryFn: async () => {
            const res = await api.get('/viral/hud-stats');
            return res.data;
        },
        refetchInterval: 15000,
    });

    // 2-1. Fetch Topic Clusters & Channel Bindings
    const { data: clusterData, refetch: refetchClusters } = useQuery({
        queryKey: ['viral_topic_clusters'],
        queryFn: async () => {
            const res = await api.get('/viral/topic-clusters');
            return res.data;
        },
        staleTime: 20000,
    });

    // 2-2. Fetch Series Packs (Omnibus short-form packs)
    const { data: seriesPacksData } = useQuery({
        queryKey: ['viral_series_packs'],
        queryFn: async () => {
            const res = await api.get('/viral/series-packs');
            return res.data;
        },
        staleTime: 30000,
    });

    // 2-3. Fetch Realtime Spike Radar
    const { data: spikeRadarData } = useQuery({
        queryKey: ['viral_spike_radar'],
        queryFn: async () => {
            const res = await api.get('/viral/spike-radar');
            return res.data;
        },
        refetchInterval: 20000,
    });

    // Batch Claim Mutation (Assign multiple articles to specific BrandChannel)
    const claimBatchMutation = useMutation({
        mutationFn: async (payload: { article_ids: number[]; channel_id: string }) => {
            const res = await api.post('/viral/claim-batch', payload);
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(`${data.claimed_count}개 소재가 [${data.channel_id}] 채널 큐에 성공적으로 배속되었습니다.`);
            queryClient.invalidateQueries({ queryKey: ['viral_articles'] });
            queryClient.invalidateQueries({ queryKey: ['viral_topic_clusters'] });
            setSelectedArticleIds([]);
        },
        onError: (err: any) => {
            toast.error(`채널 배속 실패: ${err.message}`);
        }
    });

    // 3. Fetch Articles with Realtime Queries
    const { data: articlesData, isLoading: articlesLoading, refetch: refetchArticles } = useQuery({
        queryKey: [
            'viral_articles',
            selectedRoute,
            communityRegion,
            selectedPlatform,
            selectedNewsCategory,
            selectedRedditTopic,
            selectedTopicCategory,
            selectedEntityTag,
            selectedCrossTopic,
            selectedSeriesKey,
            selectedMediaType,
            selectedChannelId,
            statusFilter,
            lengthFilter,
            rangeFilter,
            sortBy,
            searchQuery,
            selectedTrigger,
            page
        ],
        queryFn: async () => {
            const params: Record<string, any> = {
                tab: selectedRoute,
                page,
                limit: 30,
                sort_by: sortBy,
            };

            if (selectedRoute === 'community') {
                if (communityRegion !== 'all') params.region = communityRegion;
                if (selectedPlatform !== 'all') params.community_name = selectedPlatform;
            } else if (selectedRoute === 'news') {
                if (selectedNewsCategory !== 'all') params.category = selectedNewsCategory;
            } else if (selectedRoute === 'reddit') {
                if (selectedRedditTopic !== 'all') params.topic = selectedRedditTopic;
            }

            // 🏷️ 15대 테마, 엔티티, 크로스 시너지, 시리즈 팩, 미디어 유형 & 채널 필터
            if (selectedTopicCategory !== 'all') params.topic_category = selectedTopicCategory;
            if (selectedEntityTag !== 'all') params.entity_tag = selectedEntityTag;
            if (selectedCrossTopic !== 'all') params.cross_topic = selectedCrossTopic;
            if (selectedSeriesKey !== 'all') params.series_key = selectedSeriesKey;
            if (selectedMediaType !== 'all') params.media_type = selectedMediaType;
            if (selectedChannelId !== 'all') params.claimed_by_channel_id = selectedChannelId;

            if (statusFilter !== 'all') params.status = statusFilter;
            if (lengthFilter !== 'all') params.length = lengthFilter;
            if (rangeFilter !== 'all') params.time_range = rangeFilter;
            if (selectedTrigger !== 'all') params.psychological_trigger = selectedTrigger;
            if (searchQuery.trim()) params.search = searchQuery.trim();

            const res = await api.get('/viral/articles', { params });
            return res.data;
        },
        staleTime: 10000,
    });

    // Scrape Trigger Mutation
    const scrapeMutation = useMutation({
        mutationFn: async () => {
            let target: string = selectedRoute;
            if (selectedRoute === 'community' && selectedPlatform !== 'all') {
                target = selectedPlatform;
            } else if (selectedRoute === 'news' && selectedNewsCategory !== 'all') {
                target = `naver_${selectedNewsCategory}`;
            } else if (selectedRoute === 'reddit') {
                target = selectedRedditTopic !== 'all' ? `reddit_${selectedRedditTopic}` : 'reddit';
            }
            const res = await api.post('/viral/scrape-now', null, {
                params: { source_code: target, route: target }
            });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(`화제작 실시간 수집 완료! (${data.count || data.total_upserted || 0}건 최신화)`);
            queryClient.invalidateQueries({ queryKey: ['viral_articles'] });
            queryClient.invalidateQueries({ queryKey: ['viral_hud_stats'] });
        },
        onError: (err: any) => {
            toast.error(`수집 실패: ${err.message}`);
        }
    });

    // 15대 테마 집중 수집 뮤테이션 (On-Demand Theme Harvester)
    const harvestTopicMutation = useMutation({
        mutationFn: async (topicName: string) => {
            const res = await api.post('/viral/harvest/topic', {
                topic: topicName,
                limit: 20
            });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(`[${data.topic}] 테마 집중 수집 완료! (${data.harvested_count || 0}건 신규 확보)`);
            queryClient.invalidateQueries({ queryKey: ['viral_articles'] });
            queryClient.invalidateQueries({ queryKey: ['viral_topic_clusters'] });
            queryClient.invalidateQueries({ queryKey: ['viral_spike_radar'] });
        },
        onError: (err: any) => {
            toast.error(`테마 수집 실패: ${err.message || '오류 발생'}`);
        }
    });

    // Deep Fetch Details Mutation
    const fetchDetailsMutation = useMutation({
        mutationFn: async (articleId: number) => {
            const res = await api.post(`/viral/articles/${articleId}/fetch-details`);
            return res.data;
        },
        onSuccess: (data) => {
            const cmtCnt = data.comments?.length || data.comments_count || 0;
            const imgCnt = data.images?.length || 0;
            toast.success(`심층 수집 완료! 본문 ${data.content_text?.length || 0}자, 이미지 ${imgCnt}장, 댓글 ${cmtCnt}개 (조회: ${(data.views || 0).toLocaleString()})`);
            queryClient.invalidateQueries({ queryKey: ['viral_articles'] });
            queryClient.invalidateQueries({ queryKey: ['viral_hud_stats'] });
            if (activeArticle && activeArticle.id === data.id) {
                setActiveArticle(data);
            }
        },
        onError: (err: any) => {
            toast.error(`심층 수집 실패: ${err.message}`);
        }
    });

    // Selection Handlers
    const toggleSelectArticle = (id: number) => {
        setSelectedArticleIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (!articlesData?.articles) return;
        if (selectedArticleIds.length === articlesData.articles.length) {
            setSelectedArticleIds([]);
        } else {
            setSelectedArticleIds(articlesData.articles.map((a: ViralArticle) => a.id));
        }
    };

    // ⚡ Pipeline Handoff to All-in-One Generator (`/shorts-batch`)
    const handleSendToBatchStudio = (articlesToSend: ViralArticle[], overrideArchetype?: string) => {
        if (!articlesToSend || articlesToSend.length === 0) {
            toast.error('선택된 기사가 없습니다.');
            return;
        }

        const batchPayload = articlesToSend.map((art) => {
            const script = art.structured_script;
            const chosenArchetype = overrideArchetype || script?.suggested_form_factor || (
                art.source_type === 'news' ? 'gunlimbo' :
                art.source_type === 'video_vault' ? 'classic' :
                art.source_type === 'script_lab' ? 'classic' : 'ssul'
            );
            const scenes = script?.scenes || [];

            return {
                id: `viral-proj-${art.id}-${Date.now()}`,
                title: art.suggested_title || art.title,
                sourceType: art.source_type,
                archetype: chosenArchetype,
                originalUrl: art.url,
                sourceOrigin: art.author || art.community_name,
                viralScore: art.viral_score,
                analysisSummary: art.analysis_summary || script?.why_viral || '',
                scriptLinesCount: scenes.length > 0 ? scenes.length : 6,
                headlineLine1: script?.headline_line1 || art.title.slice(0, 14),
                headlineLine2: script?.headline_line2 || '충격 실화 전말',
                mediaFilePath: art.media_file_path || null,
                contentTranscript: art.content_text || '',
                images: art.images || [],
                scenes: scenes.map((sc, idx) => ({
                    sceneIndex: sc.scene_index || idx + 1,
                    duration: sc.duration_sec || 4.0,
                    hookJabText: sc.hook_jab_text || '',
                    narration: sc.narration || '',
                    visualPrompt: sc.visual_prompt || (art.images && art.images[idx % art.images.length]) || '',
                    imageUrl: (art.images && art.images[idx % art.images.length]) || null,
                })),
                agentDirectives: script?.agent_directives || {},
                status: 'ready' as const,
                createdAt: '방금 전',
            };
        });

        try {
            sessionStorage.setItem('vlstudio_batch_handoff', JSON.stringify(batchPayload));
            localStorage.setItem('vlstudio_batch_handoff_backup', JSON.stringify(batchPayload));
        } catch (_) {}

        toast.success(`⚡ ${batchPayload.length}건이 [올인원 일괄 생성 허브]로 전송되었습니다.`);
        navigate('/shorts-batch', { state: { batchProjects: batchPayload } });
    };

    // 🎬 Media Batch Generator (`/creative-studio`)
    const handleSendToCreativeStudioBatch = (selectedArticles: ViralArticle[]) => {
        if (!selectedArticles || selectedArticles.length === 0) {
            toast.error('선택된 항목이 없습니다.');
            return;
        }
        const batchProjects = selectedArticles.map((art, idx) => ({
            id: `proj-creative-${art.id}-${Date.now()}-${idx}`,
            title: art.suggested_title || art.title,
            content: art.content_text || art.analysis_summary || art.title,
            images: art.images || [],
            sourceOrigin: art.author || art.community_name,
            viralScore: art.viral_score,
            mediaFilePath: art.media_file_path || null,
            url: art.url || null
        }));

        try {
            sessionStorage.setItem('creative_studio_batch_projects', JSON.stringify(batchProjects));
            if (batchProjects[0]) {
                const combinedScript = batchProjects.map((p, idx) => `[장면 ${idx + 1}: ${p.title}]\n${p.content}`).join('\n\n---\n\n');
                sessionStorage.setItem('creative_studio_initial_script', combinedScript);
            }
        } catch (_) {}

        toast.success(`🎬 ${batchProjects.length}건이 [미디어 일괄 생성 스튜디오]로 전송되었습니다.`);
        navigate('/creative-studio', { state: { batchProjects } });
    };

    // 🎬 Video Vault Handoff (`/content-library`)
    const handleSendToVideoVaultBatch = async (selectedArticles: ViralArticle[]) => {
        if (!selectedArticles || selectedArticles.length === 0) {
            toast.error('선택된 항목이 없습니다.');
            return;
        }
        try {
            const articleIds = selectedArticles.map(a => a.id);
            await api.post('/viral/batch-handoff', {
                article_ids: articleIds,
                target_form_factor: 'gallery',
            });
            toast.success(`🎬 ${selectedArticles.length}건이 [영상 보관함]으로 등록되었습니다.`);
            queryClient.invalidateQueries({ queryKey: ['viral_articles'] });
            setSelectedArticleIds([]);
        } catch (err: any) {
            toast.error(`영상 보관함 등록 실패: ${err.message}`);
        }
    };

    // 🌐 Batch Deep Scrape Details
    const handleBatchFetchDetails = async (selectedArticles: ViralArticle[]) => {
        if (!selectedArticles || selectedArticles.length === 0) return;
        setBatchScraping(true);
        setBatchScrapeProgress(0);
        toast.info(`총 ${selectedArticles.length}건의 전문 및 이미지 심층 스크랩을 시작합니다.`);
        let successCount = 0;
        for (let i = 0; i < selectedArticles.length; i++) {
            const art = selectedArticles[i];
            try {
                await api.post(`/viral/articles/${art.id}/fetch-details`);
                successCount++;
            } catch (_) {}
            setBatchScrapeProgress(i + 1);
        }
        setBatchScraping(false);
        queryClient.invalidateQueries({ queryKey: ['viral_articles'] });
        toast.success(`🎉 ${successCount}건의 기사 본문 및 이미지 스크랩이 완료되었습니다!`);
    };

    // 🎬 Stitch Series Pack into 3-Clip Countdown Omnibus Short-Form
    const [isStitchingSeries, setIsStitchingSeries] = useState<boolean>(false);
    const handleStitchSeriesPack = async (pack: any, targetFormFactor: string = 'classic') => {
        if (!pack || !pack.articles || pack.articles.length < 2) {
            toast.error('옴니버스 제작을 위해 최소 2개 이상의 클립/소재가 필요합니다.');
            return;
        }
        setIsStitchingSeries(true);
        try {
            const articleIds = pack.articles.slice(0, 3).map((a: any) => a.id);
            const res = await api.post('/viral/series-packs/stitch', {
                series_key: pack.series_key,
                article_ids: articleIds,
                target_form_factor: targetFormFactor,
                target_channel_id: selectedChannelFilter !== 'all' ? selectedChannelFilter : undefined,
                custom_title: pack.suggested_omnibus_title
            });

            if (res.data?.success) {
                toast.success(res.data.message || '옴니버스 쇼츠 프로젝트가 성공적으로 패키징되었습니다!');
                setSeriesModalOpen(false);
                try {
                    sessionStorage.setItem('vl_stitched_project', JSON.stringify(res.data));
                } catch (_) {}

                if (res.data.redirect_url) {
                    navigate(res.data.redirect_url, { state: { stitchedProject: res.data } });
                }
            } else {
                toast.error('옴니버스 패키징에 실패했습니다.');
            }
        } catch (err: any) {
            console.error('[StitchSeries] Error:', err);
            toast.error(err.response?.data?.detail || '옴니버스 쇼츠 제작 중 오류가 발생했습니다.');
        } finally {
            setIsStitchingSeries(false);
        }
    };

    // 🎬 Export Series Pack to Native CapCut PC Project
    const [isExportingCapcut, setIsExportingCapcut] = useState<boolean>(false);
    const handleExportSeriesToCapcut = async (pack: any) => {
        if (!pack || !pack.articles || pack.articles.length === 0) {
            toast.error('CapCut 프로젝트 생성을 위해 최소 1개 이상의 클립이 필요합니다.');
            return;
        }
        setIsExportingCapcut(true);
        try {
            const articleIds = pack.articles.slice(0, 3).map((a: any) => a.id);
            const res = await api.post('/viral/series-packs/export-capcut', {
                series_key: pack.series_key,
                article_ids: articleIds,
                custom_title: pack.suggested_omnibus_title
            });
            if (res.data?.success) {
                const folderPath = res.data.folder_path || res.data.draft_path;
                toast.success(`🎉 CapCut PC 프로젝트가 생성되었습니다! (${res.data.project_name})`, {
                    duration: 8000,
                    action: folderPath && (window as any).electronAPI?.showInFolder ? {
                        label: '📁 폴더 열기',
                        onClick: () => (window as any).electronAPI.showInFolder(folderPath)
                    } : undefined
                });
            } else {
                toast.error(res.data?.message || 'CapCut 프로젝트 생성 실패');
            }
        } catch (err: any) {
            console.error('[ExportCapcut] Error:', err);
            toast.error(err.response?.data?.detail || 'CapCut 프로젝트 생성 중 오류가 발생했습니다.');
        } finally {
            setIsExportingCapcut(false);
        }
    };

    // 🤖 Trigger Tier 2 Channel Director Autonomous Claim & Dispatch Cycle
    const [isDispatching, setIsDispatching] = useState<boolean>(false);
    const handleRunDirectorDispatch = async () => {
        setIsDispatching(true);
        try {
            const channelId = selectedChannelFilter !== 'all' ? selectedChannelFilter : undefined;
            const res = await api.post('/viral/director/dispatch', null, {
                params: channelId ? { channel_id: channelId } : {}
            });
            if (res.data?.success) {
                const count = res.data.claimed_count || 0;
                toast.success(`🤖 AI 채널 배분 완료! (${count}개 기사 자동 채널 매칭 및 대본 생성)`);
                queryClient.invalidateQueries({ queryKey: ['viral_articles'] });
            } else {
                toast.error(res.data?.message || 'AI 채널 배분 실패');
            }
        } catch (err: any) {
            console.error('[DirectorDispatch] Error:', err);
            toast.error(err.response?.data?.detail || 'AI 채널 배분 중 오류가 발생했습니다.');
        } finally {
            setIsDispatching(false);
        }
    };

    // 🎬 Export Single Viral Article to Native CapCut PC Project
    const [exportingArticleId, setExportingArticleId] = useState<number | null>(null);
    const handleExportSingleArticleToCapcut = async (article: ViralArticle) => {
        if (!article) return;
        setExportingArticleId(article.id);
        try {
            const res = await api.post(`/viral/articles/${article.id}/export-capcut`);
            if (res.data?.success) {
                const folderPath = res.data.folder_path;
                toast.success(`🎉 CapCut PC 프로젝트 생성 완료! (${res.data.project_name})`, {
                    duration: 8000,
                    action: folderPath && (window as any).electronAPI?.showInFolder ? {
                        label: '📁 폴더 열기',
                        onClick: () => (window as any).electronAPI.showInFolder(folderPath)
                    } : undefined
                });
            } else {
                toast.error(res.data?.message || 'CapCut 프로젝트 생성 실패');
            }
        } catch (err: any) {
            console.error('[ExportArticleCapcut] Error:', err);
            toast.error(err.response?.data?.detail || 'CapCut 프로젝트 생성 중 오류가 발생했습니다.');
        } finally {
            setExportingArticleId(null);
        }
    };

    // 📥 Enqueue Single Viral Article to WorkQueue
    const [enqueuingArticleId, setEnqueuingArticleId] = useState<number | null>(null);
    const handleEnqueueSingleArticleToWorkQueue = async (article: ViralArticle) => {
        if (!article) return;
        setEnqueuingArticleId(article.id);
        try {
            const res = await api.post(`/viral/articles/${article.id}/enqueue-workqueue`);
            if (res.data?.success) {
                toast.success(`📥 제작 큐 등록 완료! (WorkQueueItem #${res.data.work_queue_id})`);
            } else {
                toast.error(res.data?.message || '제작 큐 등록 실패');
            }
        } catch (err: any) {
            console.error('[EnqueueArticleWorkQueue] Error:', err);
            toast.error(err.response?.data?.detail || '제작 큐 등록 중 오류가 발생했습니다.');
        } finally {
            setEnqueuingArticleId(null);
        }
    };

    // 🎬 Batch Export Articles to Native CapCut PC Projects
    const [isBatchExportingCapcut, setIsBatchExportingCapcut] = useState<boolean>(false);
    const handleBatchExportArticlesToCapcut = async (selectedArticles: ViralArticle[]) => {
        if (!selectedArticles || selectedArticles.length === 0) {
            toast.error('선택된 항목이 없습니다.');
            return;
        }
        setIsBatchExportingCapcut(true);
        try {
            const articleIds = selectedArticles.map(a => a.id);
            const res = await api.post('/viral/articles/batch-export-capcut', { article_ids: articleIds });
            if (res.data?.success) {
                const firstResult = res.data.results?.[0];
                const folderPath = firstResult?.folder_path;
                toast.success(`🎉 총 ${res.data.exported_count}개의 CapCut PC 프로젝트가 생성되었습니다!`, {
                    duration: 8000,
                    action: folderPath && (window as any).electronAPI?.showInFolder ? {
                        label: '📁 폴더 열기',
                        onClick: () => (window as any).electronAPI.showInFolder(folderPath)
                    } : undefined
                });
                setSelectedArticleIds([]);
            } else {
                toast.error('CapCut PC 일괄 프로젝트 생성 실패');
            }
        } catch (err: any) {
            console.error('[BatchExportCapcut] Error:', err);
            toast.error(err.response?.data?.detail || 'CapCut PC 일괄 생성 중 오류가 발생했습니다.');
        } finally {
            setIsBatchExportingCapcut(false);
        }
    };

    // 📥 Batch Enqueue Articles to WorkQueue
    const [isBatchEnqueuingWorkQueue, setIsBatchEnqueuingWorkQueue] = useState<boolean>(false);
    const handleBatchEnqueueArticlesToWorkQueue = async (selectedArticles: ViralArticle[]) => {
        if (!selectedArticles || selectedArticles.length === 0) {
            toast.error('선택된 항목이 없습니다.');
            return;
        }
        setIsBatchEnqueuingWorkQueue(true);
        try {
            const articleIds = selectedArticles.map(a => a.id);
            const res = await api.post('/viral/articles/batch-enqueue-workqueue', { article_ids: articleIds });
            if (res.data?.success) {
                toast.success(`📥 총 ${res.data.enqueued_count}개 소재가 제작 대기열(WorkQueue)에 등록되었습니다!`);
                setSelectedArticleIds([]);
            } else {
                toast.error('제작 대기열 일괄 등록 실패');
            }
        } catch (err: any) {
            console.error('[BatchEnqueueWorkQueue] Error:', err);
            toast.error(err.response?.data?.detail || '제작 대기열 등록 중 오류가 발생했습니다.');
        } finally {
            setIsBatchEnqueuingWorkQueue(false);
        }
    };

    // Free Media Search Handler
    const handleMediaSearch = async () => {
        if (!mediaQuery.trim()) return;
        setSearchingMedia(true);
        try {
            const res = await api.get('/viral/media/search', { params: { query: mediaQuery.trim(), limit: 12 } });
            setMediaResults(res.data.results || []);
        } catch (e: any) {
            toast.error(`미디어 검색 실패: ${e.message}`);
        } finally {
            setSearchingMedia(false);
        }
    };

    const articles: ViralArticle[] = articlesData?.articles || [];
    const totalCount = articlesData?.total || 0;

    // Domestic 25 Platforms definitions (matching Pixeling UI + Pinpoint Hubs)
    const domesticPlatforms = [
        { code: 'fmkorea', name: '에펨코리아' },
        { code: 'blind_best', name: '🏢 블라인드 베스트' },
        { code: 'dc_singal', name: '🌍 싱글벙글 지구촌' },
        { code: 'bobae_accident', name: '🚗 보배 블박/사고관' },
        { code: 'natepann_talk', name: '💍 네이트판 결시친' },
        { code: 'mlbpark', name: '엠엘비파크' },
        { code: 'ppomppu', name: '뽐뿌' },
        { code: 'ou', name: '오늘의유머' },
        { code: 'ruli', name: '루리웹' },
        { code: 'humor', name: '웃긴대학' },
        { code: 'inven', name: '인벤' },
        { code: 'slrclub', name: 'SLR클럽' },
        { code: '82cook', name: '82쿡' },
        { code: 'etoland', name: '이토랜드' },
        { code: 'theqoo', name: '더쿠' },
        { code: 'dcinside_best', name: '디시 실베' },
        { code: 'natepann', name: '네이트판' },
        { code: 'instiz', name: '인스티즈' },
        { code: 'bobae_best', name: '보배드림 베스트' },
        { code: 'dogdrip', name: '개드립' },
        { code: 'ygosu_real', name: '와이고수 실시간' },
        { code: 'damoang_free', name: '다모앙 자유게시판' },
        { code: 'arca_headline', name: '아카라이브 개념글' },
        { code: 'opgg_talk', name: 'OP.GG Talk 인기글' },
        { code: 'clien', name: '클리앙의 자유게시판' },
    ];

    // Global 8 Platforms definitions (matching Pixeling UI)
    const globalPlatforms = [
        { code: 'boredpanda', name: '🐼 Bored Panda (글로벌 썰/실화)' },
        { code: 'odditycentral', name: '🌀 Oddity Central (기상천외 실화)' },
        { code: 'theverge', name: '⚡ The Verge (글로벌 테크/AI)' },
        { code: 'bbc_world', name: '🌐 BBC World (외신 시사/속보)' },
        { code: 'buzzfeed', name: '🔥 BuzzFeed (글로벌 밈/트렌드)' },
        { code: 'gasengi', name: '가생이닷컴 번역게시판' },
        { code: 'memebase', name: 'Memebase Relatable' },
        { code: 'hackernews', name: 'Hacker News Top' },
    ];

    // News 8 Categories
    const newsCategories = [
        { code: 'all', name: '전체' },
        { code: '정치', name: '정치' },
        { code: '경제', name: '경제' },
        { code: '사회', name: '사회' },
        { code: 'IT/과학', name: 'IT' },
        { code: '생활/문화', name: '생활/문화' },
        { code: '세계', name: '세계' },
        { code: '연예', name: '연예' },
        { code: '스포츠', name: '스포츠' },
    ];

    // Reddit 17 Topics (Core + Specialized Video Blueprints)
    const redditTopics = [
        { code: 'all', name: '전체 인기 (All Top)' },
        { code: 'IdiotsInCars', name: '🚗 황당 운전/블박 (r/IdiotsInCars)' },
        { code: 'JusticeServed', name: '🥊 참교육 사이다 (r/JusticeServed)' },
        { code: 'SpecializedTools', name: '🛠️ 특수 기계/공구 (r/SpecializedTools)' },
        { code: 'FastWorkers', name: '⚡ 현장 달인/스피드 (r/FastWorkers)' },
        { code: 'NatureIsFuckingLit', name: '🌿 대자연의 경이 (r/NatureIsFuckingLit)' },
        { code: 'Damnthatsinteresting', name: '✨ 신기한 실화 (r/Damnthatsinteresting)' },
        { code: 'UnresolvedMysteries', name: '🕵️ 미제사건 미스터리 (r/UnresolvedMysteries)' },
        { code: 'AskReddit', name: '💬 AskReddit (인기 질문/답변 썰)' },
        { code: 'AITAH', name: '🔥 AITAH (사이다/갈등 썰)' },
        { code: 'tifu', name: '😱 TIFU (황당/실수 썰)' },
        { code: 'mildlyinteresting', name: '✨ 신기한 실사 (mildlyinteresting)' },
        { code: 'interestingasfuck', name: '🚀 충격/경이 (interestingasfuck)' },
        { code: 'todayilearned', name: '💡 지식/상식 (Today I Learned)' },
        { code: 'worldnews', name: '🌐 글로벌 이슈 (World News)' },
        { code: 'technology', name: '⚡ 미래 테크 (Technology)' },
    ];

    // Split articles into 2 columns for 2-column Pixeling dual grid
    const colLeftArticles = articles.filter((_, idx) => idx % 2 === 0);
    const colRightArticles = articles.filter((_, idx) => idx % 2 === 1);

    // Prepare hook ticker items for Quant Radar
    const recentHooks = articles.slice(0, 8).map((a) => ({
        id: a.id,
        title: a.title,
        hook: extractHookSentence(a.content_text, a.title),
        source_type: a.community_name || a.source_type,
        score: a.viral_score,
        trigger: a.psychological_trigger,
        images_count: a.images?.length || 0,
        has_body: (a.content_text?.length || 0) > 100
    }));

    return (
        <div className="space-y-4 pb-24 md:pb-16 text-foreground select-none">
            {/* 1. Header & Live Radar Action */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-border/80">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                        <Flame className="w-5 h-5 text-primary animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                            <span>바이럴 인텔리전스 센터</span>
                            <Badge className="text-[10.5px] bg-primary text-primary-foreground border-0 font-bold px-2 py-0.5">
                                v3.0 픽셀링 완전 무결 패리티
                            </Badge>
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            국내·해외 29개 커뮤니티 · 네이버 8대 뉴스 · 레딧 10대 토픽 · 구글 트렌드 · 영상/대본 실시간 통합 관제
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRunDirectorDispatch}
                        disabled={isDispatching}
                        className="h-8 gap-1.5 text-xs font-semibold hover:border-purple-500/40 text-foreground shadow-2xs cursor-pointer"
                        title="등록된 채널 DNA와 기사 연관도를 분석하여 자동 배분 및 대본 생성을 실행합니다"
                    >
                        <Bot className={cn("w-3.5 h-3.5 text-purple-500", isDispatching && "animate-spin")} />
                        {isDispatching ? '채널 배분 중...' : '🤖 AI 채널 자동 배분'}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMediaModalOpen(true)}
                        className="h-8 gap-1.5 text-xs font-semibold hover:border-primary/40 text-foreground shadow-2xs cursor-pointer"
                    >
                        <ImageIcon className="w-3.5 h-3.5 text-primary" />
                        무비용 실사 검색
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => scrapeMutation.mutate()}
                        disabled={scrapeMutation.isPending}
                        className="h-8 gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", scrapeMutation.isPending && "animate-spin")} />
                        {scrapeMutation.isPending ? '실데이터 수집 중...' : '⚡ 실시간 최신 수집'}
                    </Button>
                </div>
            </div>

            {/* 2. 상단 레이더 영역 (퀀트 vs 관제) */}
            <div className="flex justify-end mb-2">
                <div className="bg-muted/50 p-1 rounded-md flex items-center gap-1">
                    <Button variant={radarMode === 'quant' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setRadarMode('quant')}>📊 퀀트 레이더</Button>
                    <Button variant={radarMode === 'telemetry' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setRadarMode('telemetry')}>📡 수집 관제 매트릭스</Button>
                </div>
            </div>
            {radarMode === 'quant' ? (
                <ViralIntelligenceQuantRadar
                stats={hudStats}
                recentHooks={recentHooks}
                onSelectRoute={(r) => {
                    setSelectedRoute(r as MasterRouteKey);
                    setSelectedPlatform('all');
                    setPage(1);
                }}
                onSelectTrigger={(t) => {
                    setSelectedTrigger(t);
                    setPage(1);
                }}
                onSelectUrgent={() => {
                    setSortBy('velocity');
                    setPage(1);
                }}
                onSelectCluster={() => {
                    setSortBy('viral_score');
                    setPage(1);
                }}
                onRefresh={() => {
                    refetchHudStats();
                    refetchArticles();
                }}
                isRefreshing={isRefreshingHud || articlesLoading}
            />
        ) : (
            <CollectorTelemetryPanel 
                metrics={telemetryData?.metrics || []} 
                onRefresh={() => refetchTelemetry()} 
            />
        )}

            {/* ⚡ 실시간 급상승 스파이크 레이더 티커 바 */}
            {spikeRadarData?.spikes && spikeRadarData.spikes.length > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/80 shadow-2xs overflow-hidden">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-xs shrink-0 border border-amber-500/20">
                        <Zap className="w-3.5 h-3.5 animate-pulse" />
                        <span>급상승 레이더</span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                        {spikeRadarData.spikes.map((sp: any) => {
                            const isSel = selectedEntityTag === sp.tag;
                            return (
                                <button
                                    key={sp.tag}
                                    onClick={() => {
                                        if (isSel) {
                                            setSelectedEntityTag('all');
                                        } else {
                                            setSelectedEntityTag(sp.tag);
                                            if (selectedRoute !== 'all') setSelectedRoute('all');
                                        }
                                        setPage(1);
                                    }}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer border",
                                        isSel
                                            ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                                            : "bg-muted/30 text-foreground border-border/60 hover:bg-muted/60"
                                    )}
                                    title={sp.sample_title}
                                >
                                    <span>{sp.is_video ? '🎬' : '🔥'}</span>
                                    <span>{sp.tag}</span>
                                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-black">
                                        +{sp.spike_score}
                                    </span>
                                    <span className="text-[9.5px] text-muted-foreground font-mono">
                                        ({sp.count})
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 3. 🏛️ Pixeling 3 Tabs & Multi-Routes (커뮤니티 100 | 뉴스 100 | 레딧 100 | 구글 트렌드 | 쇼츠 | 보관함 | 대본실) */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-card border border-border/80 overflow-x-auto shadow-2xs">
                {[
                    { key: 'community' as const, label: '💬 커뮤니티 100', count: hudStats?.source_breakdown?.community || 0 },
                    { key: 'news' as const, label: '📰 뉴스 100', count: hudStats?.source_breakdown?.news || 0 },
                    { key: 'reddit' as const, label: '💬 레딧 100', count: hudStats?.source_breakdown?.reddit || 0 },
                    { key: 'google_trends' as const, label: '🌐 구글 트렌드', count: hudStats?.source_breakdown?.google_trends || 0 },
                    { key: 'youtube_shorts' as const, label: '📱 유튜브 쇼츠', count: hudStats?.source_breakdown?.youtube_shorts || 0 },
                    { key: 'video_vault' as const, label: '🎬 영상 보관함', count: hudStats?.source_breakdown?.video_vault || 0 },
                    { key: 'all' as const, label: '🌟 통합 관제', count: hudStats?.total_articles || totalCount },
                ].map((tab) => {
                    const isActive = selectedRoute === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => {
                                setSelectedRoute(tab.key);
                                setSelectedPlatform('all');
                                setSelectedNewsCategory('all');
                                setSelectedRedditTopic('all');
                                setPage(1);
                            }}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-xs font-black"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            )}
                        >
                            <span>{tab.label}</span>
                            <span className={cn(
                                "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                                isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}>
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* 🏷️ 15대 킬러 테마 클러스터 & 채널 주권 DNA 연동 바 */}
            <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                            🏷️ 15대 킬러 테마 클러스터 & 채널 파이프라인
                        </span>
                        <Badge variant="outline" className="text-[10px] font-bold border-primary/30 text-primary">
                            채널 결(DNA) 맞춤 공급
                        </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* 🎬 시리즈 옴니버스 팩 열기 버튼 */}
                        <button
                            onClick={() => setSeriesModalOpen(true)}
                            className="h-7 px-2.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                            <Clapperboard className="w-3.5 h-3.5" />
                            <span>시리즈 옴니버스 팩</span>
                            <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 h-4 min-w-4 flex items-center justify-center font-mono">
                                {seriesPacksData?.total_packs || 0}
                            </Badge>
                        </button>

                        {/* ⚡ 15대 테마 집중 수집 (On-Demand Harvester) */}
                        <button
                            disabled={harvestTopicMutation.isPending}
                            onClick={() => {
                                const targetTopic = selectedTopicCategory !== 'all' ? selectedTopicCategory : '과학/우주/경이';
                                harvestTopicMutation.mutate(targetTopic);
                            }}
                            className="h-7 px-2.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            title={selectedTopicCategory !== 'all' ? `[${selectedTopicCategory}] 특화 서브레딧 및 커뮤니티에서 실시간 양질 소재를 집중 수집합니다` : '희소 테마 실시간 양질 소재를 집중 수집합니다'}
                        >
                            {harvestTopicMutation.isPending ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Zap className="w-3.5 h-3.5" />
                            )}
                            <span>{selectedTopicCategory !== 'all' ? `${selectedTopicCategory} 보충` : '테마 집중 수집'}</span>
                        </button>

                        {/* 채널 전용 큐 매칭 드롭다운 */}
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground font-bold shrink-0">내 채널 매칭 큐:</span>
                            <select
                                value={selectedChannelId}
                                onChange={(e) => { setSelectedChannelId(e.target.value); setPage(1); }}
                                className="h-7 text-xs rounded-md bg-muted/60 border border-border px-2 text-foreground font-medium cursor-pointer"
                            >
                                <option value="all">전체 채널 소재 보기</option>
                                <option value="unclaimed">미할당 신규 소재만</option>
                                {(clusterData?.channels || []).map((ch: any) => (
                                    <option key={ch.id} value={ch.channel_id || ch.id}>
                                        {ch.title} {ch.target_topics?.length > 0 ? `(${ch.target_topics.join(', ')})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 10대 테마 칩 버튼 */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        onClick={() => { setSelectedTopicCategory('all'); setSelectedEntityTag('all'); setPage(1); }}
                        className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                            selectedTopicCategory === 'all'
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <span>전체 주제</span>
                        <span className="text-[9.5px] opacity-75">({clusterData?.total_analyzed || totalCount})</span>
                    </button>

                    {(clusterData?.clusters || []).map((cl: any) => {
                        const isSel = selectedTopicCategory === cl.key;
                        return (
                            <button
                                key={cl.key}
                                onClick={() => {
                                    if (isSel) {
                                        setSelectedTopicCategory('all');
                                        setSelectedEntityTag('all');
                                    } else {
                                        setSelectedTopicCategory(cl.key);
                                        setSelectedEntityTag('all');
                                    }
                                    setPage(1);
                                }}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                                    isSel
                                        ? "bg-primary text-primary-foreground shadow-xs font-black"
                                        : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <span>{cl.icon}</span>
                                <span>{cl.key}</span>
                                <span className={cn(
                                    "px-1.5 py-0.2 rounded-full text-[9.5px] font-mono",
                                    isSel ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                                )}>
                                    {cl.count}
                                </span>
                                {cl.video_count > 0 && (
                                    <span className={cn(
                                        "px-1 py-0.2 rounded-full text-[9px] font-mono font-bold",
                                        isSel ? "bg-emerald-400/30 text-emerald-100" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    )}>
                                        🎬 {cl.video_count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* 세부 엔티티 칩 (예: 스포츠 클릭 시 테니스, 축구, 야구, 농구 등 노출) */}
                {selectedTopicCategory !== 'all' && (() => {
                    const activeCluster = (clusterData?.clusters || []).find((c: any) => c.key === selectedTopicCategory);
                    if (!activeCluster || !activeCluster.top_entities || activeCluster.top_entities.length === 0) return null;
                    return (
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40 text-xs">
                            <span className="text-muted-foreground font-bold shrink-0">세부 엔티티:</span>
                            <button
                                onClick={() => { setSelectedEntityTag('all'); setPage(1); }}
                                className={cn(
                                    "px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer",
                                    selectedEntityTag === 'all'
                                        ? "bg-secondary text-secondary-foreground font-bold"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                전체 {activeCluster.key}
                            </button>
                            {activeCluster.top_entities.map((ent: any) => (
                                <button
                                    key={ent.name}
                                    onClick={() => { setSelectedEntityTag(ent.name); setPage(1); }}
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1",
                                        selectedEntityTag === ent.name
                                            ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                            : "bg-muted/50 text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <span>{ent.name}</span>
                                    <span className="text-[9px] opacity-75 font-mono">({ent.count})</span>
                                </button>
                            ))}
                        </div>
                    );
                })()}

                {/* 미디어 포맷 필터 (전체 | 하이라이트 영상 | 카드뉴스 | 썰/스토리) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-muted-foreground font-bold shrink-0">미디어 포맷:</span>
                        {[
                            { key: 'all', label: '전체 포맷', count: (clusterData?.media_counts?.video_clip || 0) + (clusterData?.media_counts?.image_pack || 0) + (clusterData?.media_counts?.text_story || 0) },
                            { key: 'video_clip', label: '🎬 하이라이트 영상 (클립)', count: clusterData?.media_counts?.video_clip || 0, color: 'text-emerald-600 dark:text-emerald-400' },
                            { key: 'image_pack', label: '🖼️ 카드뉴스/인포 (3장+)', count: clusterData?.media_counts?.image_pack || 0, color: 'text-sky-600 dark:text-sky-400' },
                            { key: 'text_story', label: '📝 서사/썰 스토리', count: clusterData?.media_counts?.text_story || 0, color: 'text-amber-600 dark:text-amber-400' },
                        ].map((m) => (
                            <button
                                key={m.key}
                                onClick={() => { setSelectedMediaType(m.key); setPage(1); }}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                                    selectedMediaType === m.key
                                        ? "bg-secondary text-secondary-foreground shadow-xs font-black border border-primary/30"
                                        : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <span className={m.color}>{m.label}</span>
                                <span className="text-[9.5px] font-mono opacity-80 font-bold">({m.count})</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2D 교차 시너지 칩 (Cross Thematic Synergies) */}
                {clusterData?.cross_synergies && clusterData.cross_synergies.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40 text-xs">
                        <span className="text-muted-foreground font-bold shrink-0 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                            <span>2D 교차 시너지:</span>
                        </span>
                        <button
                            onClick={() => { setSelectedCrossTopic('all'); setPage(1); }}
                            className={cn(
                                "px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer",
                                selectedCrossTopic === 'all'
                                    ? "bg-secondary text-secondary-foreground font-bold"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            전체 시너지
                        </button>
                        {clusterData.cross_synergies.map((cs: any) => (
                            <button
                                key={cs.label}
                                onClick={() => {
                                    setSelectedCrossTopic(selectedCrossTopic === cs.label ? 'all' : cs.label);
                                    setPage(1);
                                }}
                                className={cn(
                                    "px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 border",
                                    selectedCrossTopic === cs.label
                                        ? "bg-purple-600 text-white border-purple-600 font-bold shadow-xs"
                                        : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 hover:bg-purple-500/20"
                                )}
                            >
                                <span>⚡ {cs.label}</span>
                                <span className="text-[9px] font-mono opacity-80">({cs.count})</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* 활성 시리즈 필터 안내 배너 */}
                {selectedSeriesKey !== 'all' && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs animate-in fade-in">
                        <div className="flex items-center gap-2">
                            <Clapperboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="font-bold text-foreground">
                                시리즈 옴니버스 필터 적용 중:{' '}
                                <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                    {(() => {
                                        const curPack = (seriesPacksData?.series_packs || []).find((p: any) => p.series_key === selectedSeriesKey);
                                        return curPack ? `${curPack.icon} ${curPack.title}` : selectedSeriesKey;
                                    })()}
                                </span>
                            </span>
                        </div>
                        <button
                            onClick={() => { setSelectedSeriesKey('all'); setPage(1); }}
                            className="px-2 py-0.5 rounded text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                        >
                            필터 해제 ✕
                        </button>
                    </div>
                )}

                {/* 활성 급상승 레이더 태그 필터 안내 배너 */}
                {selectedEntityTag !== 'all' && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs animate-in fade-in">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="font-bold text-foreground">
                                ⚡ 급상승 레이더 태그 필터 적용 중:{' '}
                                <span className="text-amber-600 dark:text-amber-400 font-black">
                                    #{selectedEntityTag}
                                </span>
                            </span>
                        </div>
                        <button
                            onClick={() => { setSelectedEntityTag('all'); setPage(1); }}
                            className="px-2 py-0.5 rounded text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                        >
                            태그 필터 해제 ✕
                        </button>
                    </div>
                )}
            </div>

            {/* 4. 🎛️ Pixeling Sub-Navigation Chips (지역별 29개 커뮤니티, 뉴스 8개 카테고리, 레딧 10개 토픽) */}
            <Card className="bg-card border-border/80 shadow-xs">
                <CardContent className="p-3.5 space-y-3">
                    {/* (A) 커뮤니티 탭 서브칩: 지역 (전체 / 국내 / 해외) + 29개 플랫폼 칩 + 접기/펼치기 토글 */}
                    {selectedRoute === 'community' && (
                        <div className="space-y-2.5">
                            {/* Region Filter */}
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-bold text-muted-foreground shrink-0">지역:</span>
                                <div className="flex items-center gap-1">
                                    {(['all', 'domestic', 'global'] as const).map((reg) => (
                                        <button
                                            key={reg}
                                            onClick={() => {
                                                setCommunityRegion(reg);
                                                setSelectedPlatform('all');
                                                setPage(1);
                                            }}
                                            className={cn(
                                                "px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                                                communityRegion === reg
                                                    ? "bg-blue-600 text-white shadow-xs"
                                                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            {reg === 'all' ? '전체 ✓' : reg === 'domestic' ? '● 국내' : '● 해외'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Domestic 21 Platforms Row */}
                            {(communityRegion === 'all' || communityRegion === 'domestic') && (
                                <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1 border-t border-border/40">
                                    <span className="font-bold text-muted-foreground shrink-0 mr-1">플랫폼:</span>
                                    <button
                                        onClick={() => { setSelectedPlatform('all'); setPage(1); }}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                                            selectedPlatform === 'all'
                                                ? "bg-blue-600 text-white shadow-xs"
                                                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        전체 ✓
                                    </button>
                                    {domesticPlatforms.map((p) => (
                                        <button
                                            key={p.code}
                                            onClick={() => { setSelectedPlatform(p.code); setPage(1); }}
                                            className={cn(
                                                "px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1",
                                                selectedPlatform === p.code
                                                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            {p.name}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setIsGlobalExpanded(!isGlobalExpanded)}
                                        className="px-2.5 py-1 rounded-md text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-all cursor-pointer flex items-center gap-1 ml-auto shrink-0"
                                        title="해외 플랫폼 접기/펼치기"
                                    >
                                        {isGlobalExpanded ? '접기' : '펼치기'}
                                        {isGlobalExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            )}

                            {/* Global 8 Platforms Row (Collapsible) */}
                            {isGlobalExpanded && (communityRegion === 'all' || communityRegion === 'global') && (
                                <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1 border-t border-border/40 animate-in fade-in">
                                    <span className="font-bold text-muted-foreground shrink-0 mr-1">해외 8대:</span>
                                    {globalPlatforms.map((p) => (
                                        <button
                                            key={p.code}
                                            onClick={() => { setSelectedPlatform(p.code); setPage(1); }}
                                            className={cn(
                                                "px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1",
                                                selectedPlatform === p.code
                                                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* (B) 뉴스 탭 서브칩: 8대 카테고리 */}
                    {selectedRoute === 'news' && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="font-bold text-muted-foreground shrink-0 mr-1">카테고리:</span>
                            {newsCategories.map((c) => (
                                <button
                                    key={c.code}
                                    onClick={() => { setSelectedNewsCategory(c.code); setPage(1); }}
                                    className={cn(
                                        "px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5",
                                        selectedNewsCategory === c.code
                                            ? "bg-blue-600 text-white font-bold shadow-xs"
                                            : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    {c.code !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                    {c.name} {c.code === 'all' ? '✓' : ''}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* (C) 레딧 탭 서브칩: 10대 토픽 */}
                    {selectedRoute === 'reddit' && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="font-bold text-muted-foreground shrink-0 mr-1">토픽:</span>
                            {redditTopics.map((t, idx) => (
                                <button
                                    key={`${t.code}-${idx}`}
                                    onClick={() => { setSelectedRedditTopic(t.code); setPage(1); }}
                                    className={cn(
                                        "px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5",
                                        selectedRedditTopic === t.code
                                            ? "bg-blue-600 text-white font-bold shadow-xs"
                                            : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    {t.code !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                                    {t.name} {t.code === 'all' ? '✓' : ''}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ═════════════════════════════════════════════════════════════════════ */}
                    {/* 5. 🎯 Script Lab 5-Tier Query Toolbars (ScriptLab.tsx 100% UI Parity) */}
                    {/* ═════════════════════════════════════════════════════════════════════ */}
                    <div className="pt-2 border-t border-border/60 space-y-2">
                        {/* Tier 1: 상태 (Status) + View Mode Switcher */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="font-bold text-muted-foreground shrink-0 flex items-center gap-1">
                                    <FileText className="w-3.5 h-3.5 text-primary" /> 상태:
                                </span>
                                {[
                                    { code: 'all', label: '전체', count: totalCount },
                                    { code: 'collected', label: '★ 신규수집', count: articles.filter(a => a.status === 'collected').length },
                                    { code: 'analyzed', label: '🎨 검수완료', count: articles.filter(a => a.status === 'analyzed').length },
                                    { code: 'scripted', label: '⚡ 숏폼각색', count: articles.filter(a => a.structured_script).length },
                                    { code: 'longform', label: '🎬 롱폼창작', count: articles.filter(a => (a.content_text?.length || 0) > 1500).length },
                                    { code: 'archived', label: '📁 보관', count: 0 },
                                ].map((s) => (
                                    <button
                                        key={s.code}
                                        onClick={() => { setStatusFilter(s.code); setPage(1); }}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                                            statusFilter === s.code
                                                ? "bg-blue-600 text-white shadow-xs"
                                                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        <span>{s.label}</span>
                                        <span className={cn(
                                            "px-1 py-0.2 rounded-full text-[9.5px] font-mono",
                                            statusFilter === s.code ? "bg-white/20 text-white" : "text-muted-foreground"
                                        )}>
                                            {s.count}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* View Switcher: 2-Column Dual Grid vs Flat Table */}
                            <div className="flex items-center p-0.5 rounded-lg border border-border bg-muted/40 shadow-2xs">
                                <button
                                    onClick={() => setViewMode('cards')}
                                    className={cn(
                                        "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                                        viewMode === 'cards'
                                            ? "bg-card text-primary shadow-xs border border-border/80"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title="픽셀링 2열 듀얼 카드 그리드 (기본)"
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                    <span>2열 듀얼 그리드</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={cn(
                                        "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                                        viewMode === 'table'
                                            ? "bg-card text-primary shadow-xs border border-border/80"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title="대본분석실 고밀도 평면 테이블"
                                >
                                    <TableIcon className="w-3.5 h-3.5" />
                                    <span>평면 테이블</span>
                                </button>
                            </div>
                        </div>

                        {/* Tier 2: 본문길이 + 기간 + 정렬 + 실시간 검색창 */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1.5 border-t border-border/40">
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                                {/* 대본/본문 길이 */}
                                <div className="flex items-center gap-1">
                                    <span className="font-bold text-muted-foreground shrink-0">⏱ 본문길이:</span>
                                    {[
                                        { code: 'all', label: '전체' },
                                        { code: 'short', label: '⚡ 초단축 (<500자)' },
                                        { code: 'standard', label: '📱 표준 숏폼 (500~1500자)' },
                                        { code: 'long', label: '🎬 롱폼 (>1500자)' },
                                    ].map((l) => (
                                        <button
                                            key={l.code}
                                            onClick={() => { setLengthFilter(l.code); setPage(1); }}
                                            className={cn(
                                                "px-2 py-0.8 rounded text-xs transition-all cursor-pointer",
                                                lengthFilter === l.code
                                                    ? "bg-primary text-primary-foreground font-bold"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                            )}
                                        >
                                            {l.label}
                                        </button>
                                    ))}
                                </div>

                                {/* 기간 */}
                                <div className="flex items-center gap-1">
                                    <span className="font-bold text-muted-foreground shrink-0">📅 기간:</span>
                                    {[
                                        { code: 'all', label: '전체' },
                                        { code: '1d', label: '최근 1일' },
                                        { code: '3d', label: '최근 3일' },
                                        { code: '7d', label: '최근 7일' },
                                        { code: '30d', label: '최근 30일' },
                                    ].map((r) => (
                                        <button
                                            key={r.code}
                                            onClick={() => { setRangeFilter(r.code); setPage(1); }}
                                            className={cn(
                                                "px-2 py-0.8 rounded text-xs transition-all cursor-pointer",
                                                rangeFilter === r.code
                                                    ? "bg-primary text-primary-foreground font-bold"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                            )}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>

                                {/* 정렬 */}
                                <div className="flex items-center gap-1">
                                    <span className="font-bold text-muted-foreground shrink-0">⚡ 정렬:</span>
                                    {[
                                        { code: 'viral_score' as const, label: '바이럴순' },
                                        { code: 'velocity' as const, label: '유입속도순' },
                                        { code: 'views' as const, label: '조회수순' },
                                        { code: 'comments' as const, label: '댓글순' },
                                        { code: 'recent' as const, label: '최신순' },
                                    ].map((s) => (
                                        <button
                                            key={s.code}
                                            onClick={() => { setSortBy(s.code); setPage(1); }}
                                            className={cn(
                                                "px-2 py-0.8 rounded text-xs transition-all cursor-pointer",
                                                sortBy === s.code
                                                    ? "bg-primary text-primary-foreground font-bold"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                            )}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                {/* Omni Realtime Search Input */}
                                <div className="relative w-full sm:w-64">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="🔍 실시간 검색..."
                                        className="w-full h-8 pl-8 pr-7 text-xs rounded-lg bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>

                                {/* 🗑️ 수집 데이터 관리/삭제 버튼 */}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        if (selectedArticleIds.length > 0) {
                                            setCleanupMode('selected');
                                        }
                                        setIsCleanupModalOpen(true);
                                    }}
                                    className={cn(
                                        "h-8 px-2.5 text-xs font-bold shrink-0 gap-1.5 cursor-pointer border transition-colors",
                                        selectedArticleIds.length > 0
                                            ? "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20"
                                            : "border-border hover:border-destructive/40 hover:text-destructive text-muted-foreground"
                                    )}
                                    title="수집된 데이터 정리 (기간별, 매체별, 전체 일괄 삭제)"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>
                                        {selectedArticleIds.length > 0 ? `선택 ${selectedArticleIds.length}건 정리` : '데이터 정리'}
                                    </span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* 6. Content Section: Pixeling 2-Column Dual Grid vs Flat Table View */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {articlesLoading ? (
                <div className="py-24 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    50대 플랫폼 화제작 및 미디어 자산 실시간 색인 중...
                </div>
            ) : articles.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl p-8 bg-card">
                    <Flame className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    조건에 일치하는 화제작이 없습니다. 상단의 <strong>[⚡ 실시간 최신 수집]</strong> 버튼을 누르거나 필터를 조정해 보세요.
                </div>
            ) : viewMode === 'cards' ? (
                /* 🎴 픽셀링 100% 일치: 2열 듀얼 카드 그리드 (좌: 1, 3, 5... / 우: 2, 4, 6...) */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                    {/* Left Column (Odd: 1, 3, 5, 7...) */}
                    <div className="space-y-3">
                        {colLeftArticles.map((art, colIdx) => {
                            const rankNum = colIdx * 2 + 1;
                            const isSelected = selectedArticleIds.includes(art.id);
                            const imgUrl = art.images && art.images.length > 0 ? art.images[0] : null;

                            return (
                                <div
                                    key={art.id}
                                    className={cn(
                                        "group relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 bg-card hover:border-primary/50 hover:shadow-md",
                                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/80"
                                    )}
                                >
                                    {/* Multi-Select Checkbox */}
                                    <div className="pt-0.5 shrink-0">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleSelectArticle(art.id)}
                                            className="cursor-pointer"
                                        />
                                    </div>

                                    {/* Ranking Badge */}
                                    <div className="pt-0.5 shrink-0 flex items-center gap-1 font-mono font-black text-xs">
                                        <span className={cn(
                                            "w-2 h-2 rounded-full",
                                            rankNum === 1 ? "bg-amber-500 animate-pulse" :
                                            rankNum === 3 ? "bg-amber-400" :
                                            "bg-blue-500"
                                        )} />
                                        <span className={cn(
                                            rankNum <= 3 ? "text-amber-500 font-extrabold" : "text-muted-foreground"
                                        )}>
                                            {rankNum}
                                        </span>
                                    </div>

                                    {/* High-Res Image Thumbnail (Clickable for In-App Lightbox) */}
                                    <div
                                        onClick={() => imgUrl && setLightboxImage({
                                            url: getProxyImageUrl(imgUrl),
                                            title: art.title,
                                            source: art.community_name || art.source_type,
                                            articleUrl: art.url
                                        })}
                                        className={cn(
                                            "w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shrink-0 border border-border/70 relative cursor-pointer bg-muted/60 flex items-center justify-center group/thumb",
                                            !imgUrl && "cursor-default"
                                        )}
                                        title={imgUrl ? "클릭하여 고해상도 인앱 뷰어로 보기" : "이미지 없음"}
                                    >
                                        {imgUrl ? (
                                            <>
                                                <img
                                                    src={getProxyImageUrl(imgUrl)}
                                                    alt=""
                                                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                                                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                    <Maximize2 className="w-4 h-4" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center p-1 text-muted-foreground/60">
                                                <ImageIcon className="w-5 h-5 mx-auto mb-0.5 opacity-50" />
                                                <span className="text-[9px] font-mono">NO IMG</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Main Info */}
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        {/* Title (2-line clamp) */}
                                        <h3
                                            onClick={() => openArticleDetail(art)}
                                            className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 hover:text-primary cursor-pointer leading-snug"
                                            title={art.title}
                                        >
                                            {art.title}
                                        </h3>

                                        {/* 🏷️ Topic & Media Taxonomy Badges */}
                                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                            {art.topic_category && art.topic_category !== '일반' && (
                                                <Badge variant="outline" className="text-[9.5px] h-4 px-1.5 font-bold bg-primary/10 text-primary border-primary/25">
                                                    {art.topic_category}
                                                </Badge>
                                            )}
                                            {art.media_type === 'video_clip' && (
                                                <Badge className="text-[9.5px] h-4 px-1.5 font-black bg-emerald-600 text-white border-0 shadow-2xs">
                                                    🎬 영상 클립
                                                </Badge>
                                            )}
                                            {art.media_type === 'image_pack' && (
                                                <Badge variant="secondary" className="text-[9.5px] h-4 px-1.5 font-bold text-sky-700 dark:text-sky-300 bg-sky-500/15 border-sky-500/30">
                                                    🖼️ 카드뉴스
                                                </Badge>
                                            )}
                                            {(art.entity_tags || []).slice(0, 2).map((tag, tIdx) => (
                                                <span key={tIdx} className="text-[9px] font-medium text-muted-foreground bg-muted/60 px-1 py-0.2 rounded border border-border/40">
                                                    #{tag}
                                                </span>
                                            ))}
                                            {art.cross_topics && art.cross_topics.length > 0 && (
                                                <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                                                    ⚡ {art.cross_topics.join(' × ')}
                                                </Badge>
                                            )}
                                            {art.series_key && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSeriesKey(art.series_key!);
                                                        setPage(1);
                                                    }}
                                                    className="text-[9px] h-3.5 px-1 font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded hover:bg-emerald-500/30 cursor-pointer flex items-center gap-0.5"
                                                    title="클릭하여 이 시리즈 팩 소재 모아보기"
                                                >
                                                    🎬 옴니버스
                                                </button>
                                            )}
                                            {art.status === 'approved' && (
                                                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                                                    ✓ Critic 합격
                                                </span>
                                            )}
                                            {art.claimed_by_channel_id && (
                                                <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.2 rounded ml-auto">
                                                    📌 배속됨
                                                </span>
                                            )}
                                        </div>

                                        {/* ⚡ Form Factor Viability Badges & Dopamine */}
                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                            <span className={cn(
                                                "text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded border flex items-center gap-1",
                                                (art.recommended_form_factor === 'gunlimbo' || (art.gunlimbo_score || 0) >= (art.ssul_score || 0))
                                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 font-extrabold"
                                                    : "bg-muted/60 text-muted-foreground border-border/60"
                                            )}>
                                                <Zap className="w-2.5 h-2.5 text-amber-500" />
                                                군림보 {art.gunlimbo_score || 95}점
                                            </span>

                                            <span className={cn(
                                                "text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded border flex items-center gap-1",
                                                (art.recommended_form_factor === 'ssul' || (art.ssul_score || 0) > (art.gunlimbo_score || 0))
                                                    ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 font-extrabold"
                                                    : "bg-muted/60 text-muted-foreground border-border/60"
                                            )}>
                                                <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                                                썰형 {art.ssul_score || 96}점
                                            </span>

                                            <span className="text-[9.5px] font-mono font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded ml-auto flex items-center gap-0.5">
                                                <Flame className="w-2.5 h-2.5" /> 도파민 {art.dopamine_index || 92}
                                            </span>
                                        </div>

                                        {/* ⚡ 3s Killer Hook Preview */}
                                        <p className="text-[11px] text-foreground font-medium line-clamp-1 bg-muted/40 px-2 py-0.5 rounded border border-border/40">
                                            <span className="text-primary font-bold mr-1">3초 훅:</span>
                                            {art.hook_line || extractHookSentence(art.content_text, art.title)}
                                        </p>

                                        {/* Source Tag, Author, Metrics */}
                                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[10.5px] text-muted-foreground">
                                            <span className="font-semibold text-foreground/80 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                {art.community_name || art.source_type}
                                            </span>
                                            <span>•</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5" title={`작성: ${art.created_at_source || art.scraped_at}`}>
                                                <Clock className="w-2.5 h-2.5" />
                                                {formatRelativeTime(art)}
                                            </span>
                                            <span>•</span>
                                            <span>조회 {formatCount(art.views)}</span>
                                            <span>•</span>
                                            <span>추천 {formatCount(art.likes)}</span>
                                            <span>•</span>
                                            <span>댓글 {formatCount(art.comments_count)}</span>

                                            <Badge className="ml-auto text-[9.5px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 font-mono font-bold">
                                                {art.viral_score.toFixed(1)}점
                                            </Badge>
                                        </div>

                                        {/* Action Bar */}
                                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/40">
                                            <a
                                                href={toValidUrl(art.url)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => handleOpenExternal(art.url, e)}
                                                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                                title="원문 링크 새 창으로 열기"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                <span>원문 링크</span>
                                            </a>

                                            <button
                                                onClick={() => openArticleDetail(art)}
                                                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5 ml-2 cursor-pointer"
                                            >
                                                <BookOpen className="w-3 h-3" />
                                                <span>전문·분석</span>
                                            </button>

                                            {/* Direct Quick Handoff Buttons */}
                                            <div className="ml-auto flex items-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleSendToBatchStudio([art], 'gunlimbo')}
                                                    className="h-6 px-2 text-[10px] font-bold border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer"
                                                    title="군림보 브레이킹 전용 편집기로 바로 이동"
                                                >
                                                    ⚡ 군림보 제작
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleSendToBatchStudio([art], 'ssul')}
                                                    className="h-6 px-2 text-[10px] font-bold border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 cursor-pointer"
                                                    title="썰형 전용 편집기로 바로 이동"
                                                >
                                                    💬 썰형 제작
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={exportingArticleId === art.id}
                                                    onClick={() => handleExportSingleArticleToCapcut(art)}
                                                    className="h-6 px-2 text-[10px] font-bold border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 cursor-pointer flex items-center gap-1"
                                                    title="CapCut PC 원클릭 프로젝트로 내보내기"
                                                >
                                                    {exportingArticleId === art.id ? (
                                                        <RefreshCw className="w-2.5 h-2.5 animate-spin text-cyan-500" />
                                                    ) : (
                                                        <Film className="w-2.5 h-2.5 text-cyan-500" />
                                                    )}
                                                    CapCut
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Column (Even: 2, 4, 6, 8...) */}
                    <div className="space-y-3">
                        {colRightArticles.map((art, colIdx) => {
                            const rankNum = colIdx * 2 + 2;
                            const isSelected = selectedArticleIds.includes(art.id);
                            const imgUrl = art.images && art.images.length > 0 ? art.images[0] : null;

                            return (
                                <div
                                    key={art.id}
                                    className={cn(
                                        "group relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 bg-card hover:border-primary/50 hover:shadow-md",
                                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/80"
                                    )}
                                >
                                    {/* Multi-Select Checkbox */}
                                    <div className="pt-0.5 shrink-0">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleSelectArticle(art.id)}
                                            className="cursor-pointer"
                                        />
                                    </div>

                                    {/* Ranking Badge */}
                                    <div className="pt-0.5 shrink-0 flex items-center gap-1 font-mono font-black text-xs">
                                        <span className={cn(
                                            "w-2 h-2 rounded-full",
                                            rankNum === 2 ? "bg-slate-400" : "bg-blue-500"
                                        )} />
                                        <span className={cn(
                                            rankNum === 2 ? "text-slate-400 font-extrabold" : "text-muted-foreground"
                                        )}>
                                            {rankNum}
                                        </span>
                                    </div>

                                    {/* High-Res Image Thumbnail */}
                                    <div
                                        onClick={() => imgUrl && setLightboxImage({
                                            url: getProxyImageUrl(imgUrl),
                                            title: art.title,
                                            source: art.community_name || art.source_type,
                                            articleUrl: art.url
                                        })}
                                        className={cn(
                                            "w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shrink-0 border border-border/70 relative cursor-pointer bg-muted/60 flex items-center justify-center group/thumb",
                                            !imgUrl && "cursor-default"
                                        )}
                                        title={imgUrl ? "클릭하여 고해상도 인앱 뷰어로 보기" : "이미지 없음"}
                                    >
                                        {imgUrl ? (
                                            <>
                                                <img
                                                    src={getProxyImageUrl(imgUrl)}
                                                    alt=""
                                                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                                                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                    <Maximize2 className="w-4 h-4" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center p-1 text-muted-foreground/60">
                                                <ImageIcon className="w-5 h-5 mx-auto mb-0.5 opacity-50" />
                                                <span className="text-[9px] font-mono">NO IMG</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Main Info */}
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <h3
                                            onClick={() => openArticleDetail(art)}
                                            className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 hover:text-primary cursor-pointer leading-snug"
                                            title={art.title}
                                        >
                                            {art.title}
                                        </h3>

                                        {/* 🏷️ Topic & Media Taxonomy Badges */}
                                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                            {art.topic_category && art.topic_category !== '일반' && (
                                                <Badge variant="outline" className="text-[9.5px] h-4 px-1.5 font-bold bg-primary/10 text-primary border-primary/25">
                                                    {art.topic_category}
                                                </Badge>
                                            )}
                                            {art.media_type === 'video_clip' && (
                                                <Badge className="text-[9.5px] h-4 px-1.5 font-black bg-emerald-600 text-white border-0 shadow-2xs">
                                                    🎬 영상 클립
                                                </Badge>
                                            )}
                                            {art.media_type === 'image_pack' && (
                                                <Badge variant="secondary" className="text-[9.5px] h-4 px-1.5 font-bold text-sky-700 dark:text-sky-300 bg-sky-500/15 border-sky-500/30">
                                                    🖼️ 카드뉴스
                                                </Badge>
                                            )}
                                            {(art.entity_tags || []).slice(0, 2).map((tag, tIdx) => (
                                                <span key={tIdx} className="text-[9px] font-medium text-muted-foreground bg-muted/60 px-1 py-0.2 rounded border border-border/40">
                                                    #{tag}
                                                </span>
                                            ))}
                                            {art.cross_topics && art.cross_topics.length > 0 && (
                                                <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                                                    ⚡ {art.cross_topics.join(' × ')}
                                                </Badge>
                                            )}
                                            {art.series_key && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSeriesKey(art.series_key!);
                                                        setPage(1);
                                                    }}
                                                    className="text-[9px] h-3.5 px-1 font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded hover:bg-emerald-500/30 cursor-pointer flex items-center gap-0.5"
                                                    title="클릭하여 이 시리즈 팩 소재 모아보기"
                                                >
                                                    🎬 옴니버스
                                                </button>
                                            )}
                                            {art.status === 'approved' && (
                                                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                                                    ✓ Critic 합격
                                                </span>
                                            )}
                                            {art.claimed_by_channel_id && (
                                                <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.2 rounded ml-auto">
                                                    📌 배속됨
                                                </span>
                                            )}
                                        </div>

                                        {/* ⚡ Form Factor Viability Badges & Dopamine */}
                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                            <span className={cn(
                                                "text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded border flex items-center gap-1",
                                                (art.recommended_form_factor === 'gunlimbo' || (art.gunlimbo_score || 0) >= (art.ssul_score || 0))
                                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 font-extrabold"
                                                    : "bg-muted/60 text-muted-foreground border-border/60"
                                            )}>
                                                <Zap className="w-2.5 h-2.5 text-amber-500" />
                                                군림보 {art.gunlimbo_score || 95}점
                                            </span>

                                            <span className={cn(
                                                "text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded border flex items-center gap-1",
                                                (art.recommended_form_factor === 'ssul' || (art.ssul_score || 0) > (art.gunlimbo_score || 0))
                                                    ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 font-extrabold"
                                                    : "bg-muted/60 text-muted-foreground border-border/60"
                                            )}>
                                                <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                                                썰형 {art.ssul_score || 96}점
                                            </span>

                                            <span className="text-[9.5px] font-mono font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded ml-auto flex items-center gap-0.5">
                                                <Flame className="w-2.5 h-2.5" /> 도파민 {art.dopamine_index || 92}
                                            </span>
                                        </div>

                                        {/* ⚡ 3s Killer Hook Preview */}
                                        <p className="text-[11px] text-foreground font-medium line-clamp-1 bg-muted/40 px-2 py-0.5 rounded border border-border/40">
                                            <span className="text-primary font-bold mr-1">3초 훅:</span>
                                            {art.hook_line || extractHookSentence(art.content_text, art.title)}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[10.5px] text-muted-foreground">
                                            <span className="font-semibold text-foreground/80 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                {art.community_name || art.source_type}
                                            </span>
                                            <span>•</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5" title={`작성: ${art.created_at_source || art.scraped_at}`}>
                                                <Clock className="w-2.5 h-2.5" />
                                                {formatRelativeTime(art)}
                                            </span>
                                            <span>•</span>
                                            <span>조회 {formatCount(art.views)}</span>
                                            <span>•</span>
                                            <span>추천 {formatCount(art.likes)}</span>
                                            <span>•</span>
                                            <span>댓글 {formatCount(art.comments_count)}</span>

                                            <Badge className="ml-auto text-[9.5px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 font-mono font-bold">
                                                {art.viral_score.toFixed(1)}점
                                            </Badge>
                                        </div>

                                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/40">
                                            <a
                                                href={toValidUrl(art.url)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => handleOpenExternal(art.url, e)}
                                                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                                title="원문 링크 새 창으로 열기"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                <span>원문 링크</span>
                                            </a>

                                            <button
                                                onClick={() => openArticleDetail(art)}
                                                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5 ml-2 cursor-pointer"
                                            >
                                                <BookOpen className="w-3 h-3" />
                                                <span>전문·분석</span>
                                            </button>

                                            <div className="ml-auto flex items-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleSendToBatchStudio([art], 'gunlimbo')}
                                                    className="h-6 px-2 text-[10px] font-bold border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer"
                                                    title="군림보 브레이킹 전용 편집기로 바로 이동"
                                                >
                                                    ⚡ 군림보 제작
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleSendToBatchStudio([art], 'ssul')}
                                                    className="h-6 px-2 text-[10px] font-bold border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 cursor-pointer"
                                                    title="썰형 전용 편집기로 바로 이동"
                                                >
                                                    💬 썰형 제작
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={exportingArticleId === art.id}
                                                    onClick={() => handleExportSingleArticleToCapcut(art)}
                                                    className="h-6 px-2 text-[10px] font-bold border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 cursor-pointer flex items-center gap-1"
                                                    title="CapCut PC 원클릭 프로젝트로 내보내기"
                                                >
                                                    {exportingArticleId === art.id ? (
                                                        <RefreshCw className="w-2.5 h-2.5 animate-spin text-cyan-500" />
                                                    ) : (
                                                        <Film className="w-2.5 h-2.5 text-cyan-500" />
                                                    )}
                                                    CapCut
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* ▦ 평면 테이블 뷰 (ScriptLab.tsx 스타일) */
                <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border text-[11px] font-bold text-muted-foreground uppercase">
                                <TableHead className="w-10 text-center p-2">
                                    <Checkbox
                                        checked={selectedArticleIds.length > 0 && selectedArticleIds.length === articles.length}
                                        onCheckedChange={toggleSelectAll}
                                        title="전체 선택/해제"
                                    />
                                </TableHead>
                                <TableHead className="w-24 text-center p-2">성과 등급</TableHead>
                                <TableHead className="w-28 text-center p-2">원천 출처</TableHead>
                                <TableHead className="min-w-[280px] p-2">제목 및 대본/본문 발화 내용</TableHead>
                                <TableHead className="w-28 text-right p-2">조회 / 유입속도</TableHead>
                                <TableHead className="w-24 text-right p-2">반응 지표</TableHead>
                                <TableHead className="w-32 text-center p-2">제작 연계</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {articles.map((art) => {
                                const isSelected = selectedArticleIds.includes(art.id);
                                const imgUrl = art.images && art.images.length > 0 ? art.images[0] : null;

                                return (
                                    <TableRow
                                        key={art.id}
                                        className={cn(
                                            "border-b border-border/60 hover:bg-muted/30 transition-colors text-xs",
                                            isSelected && "bg-primary/5"
                                        )}
                                    >
                                        <TableCell className="text-center p-2">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleSelectArticle(art.id)}
                                            />
                                        </TableCell>

                                        <TableCell className="text-center p-2">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <Badge className={cn(
                                                    "text-[10px] px-2 py-0.5 h-5 rounded-md border",
                                                    art.viral_score >= 90 ? "bg-primary text-primary-foreground font-black" :
                                                    art.viral_score >= 80 ? "bg-primary/15 text-primary font-bold" :
                                                    "bg-muted text-muted-foreground font-semibold"
                                                )}>
                                                    {art.viral_score >= 90 ? 'S급 떡상' : art.viral_score >= 80 ? 'A급 급상승' : 'B급 우수'}
                                                </Badge>
                                                <span className="text-[10px] font-mono text-muted-foreground">
                                                    {art.viral_score.toFixed(1)}점
                                                </span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center p-2">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <Badge variant="outline" className="text-[10px] font-semibold border-border">
                                                    {art.community_name || art.source_type}
                                                </Badge>
                                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5" title={`작성: ${art.created_at_source || art.scraped_at}`}>
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {formatRelativeTime(art)}
                                                </span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="p-2">
                                            <div className="flex items-start gap-2.5">
                                                {imgUrl ? (
                                                    <img
                                                        src={getProxyImageUrl(imgUrl)}
                                                        alt=""
                                                        onClick={() => setLightboxImage({ url: getProxyImageUrl(imgUrl), title: art.title, source: art.community_name || art.source_type, articleUrl: art.url })}
                                                        className="w-12 h-12 rounded object-cover border border-border shrink-0 cursor-pointer hover:scale-105 transition-transform"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded bg-muted/60 border border-border shrink-0 flex items-center justify-center text-muted-foreground">
                                                        <ImageIcon className="w-4 h-4 opacity-50" />
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1 space-y-0.5">
                                                    <h4
                                                        onClick={() => openArticleDetail(art)}
                                                        className="font-bold text-foreground hover:text-primary cursor-pointer line-clamp-1 text-xs"
                                                    >
                                                        {art.title}
                                                    </h4>
                                                    <div className="flex flex-wrap items-center gap-1 py-0.5">
                                                        {art.topic_category && art.topic_category !== '일반' && (
                                                            <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-bold bg-primary/10 text-primary border-primary/25">
                                                                {art.topic_category}
                                                            </Badge>
                                                        )}
                                                        {art.media_type === 'video_clip' && (
                                                            <Badge className="text-[9px] h-3.5 px-1 font-black bg-emerald-600 text-white border-0">
                                                                🎬 영상 클립
                                                            </Badge>
                                                        )}
                                                        {art.media_type === 'image_pack' && (
                                                            <Badge variant="secondary" className="text-[9px] h-3.5 px-1 font-bold text-sky-700 dark:text-sky-300 bg-sky-500/15 border-sky-500/30">
                                                                🖼️ 카드뉴스
                                                            </Badge>
                                                        )}
                                                        {(art.entity_tags || []).slice(0, 2).map((tag, tIdx) => (
                                                            <span key={tIdx} className="text-[9px] font-medium text-muted-foreground bg-muted/60 px-1 rounded border border-border/40">
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                        {art.cross_topics && art.cross_topics.length > 0 && (
                                                            <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                                                                ⚡ {art.cross_topics.join(' × ')}
                                                            </Badge>
                                                        )}
                                                        {art.series_key && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedSeriesKey(art.series_key!);
                                                                    setPage(1);
                                                                }}
                                                                className="text-[9px] h-3.5 px-1 font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded hover:bg-emerald-500/30 cursor-pointer flex items-center gap-0.5"
                                                                title="클릭하여 이 시리즈 팩 소재 모아보기"
                                                            >
                                                                🎬 옴니버스
                                                            </button>
                                                        )}
                                                        {art.status === 'approved' && (
                                                            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                                                                ✓ Critic 합격
                                                            </span>
                                                        )}
                                                        {art.claimed_by_channel_id && (
                                                            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1 rounded">
                                                                📌 배속됨
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                                                        {extractHookSentence(art.content_text, art.title)}
                                                    </p>
                                                    <div className="flex items-center gap-2 pt-0.5 text-[10px] text-muted-foreground">
                                                        <a
                                                            href={toValidUrl(art.url)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => handleOpenExternal(art.url, e)}
                                                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                                            title="원문 열기"
                                                        >
                                                            <ExternalLink className="w-2.5 h-2.5" /> 원문
                                                        </a>
                                                        <span>• 본문: {art.content_text?.length || 0}자</span>
                                                        <span>• 이미지: {art.images?.length || 0}장</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-right p-2 font-mono">
                                            <div className="font-bold text-foreground">{formatCount(art.views)}</div>
                                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">{formatVelocity(art.velocity_score)}</div>
                                        </TableCell>

                                        <TableCell className="text-right p-2 text-[11px] text-muted-foreground">
                                            <div>추천 {formatCount(art.likes)}</div>
                                            <div>댓글 {formatCount(art.comments_count)}</div>
                                        </TableCell>

                                        <TableCell className="text-center p-2">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleSendToBatchStudio([art], 'gunlimbo')}
                                                    className="h-6 px-2 text-[10px] font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                                                >
                                                    군림보
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleSendToBatchStudio([art], 'ssul')}
                                                    className="h-6 px-2 text-[10px] font-bold border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer"
                                                >
                                                    썰형
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={exportingArticleId === art.id}
                                                    onClick={() => handleExportSingleArticleToCapcut(art)}
                                                    className="h-6 px-2 text-[10px] font-bold border-cyan-500/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 cursor-pointer flex items-center gap-1"
                                                    title="CapCut PC 원클릭 프로젝트 생성"
                                                >
                                                    {exportingArticleId === art.id ? (
                                                        <RefreshCw className="w-2.5 h-2.5 animate-spin text-cyan-500" />
                                                    ) : (
                                                        <Film className="w-2.5 h-2.5 text-cyan-500" />
                                                    )}
                                                    CapCut
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* 8. 🔍 Deep Inspection Modal (본문 전문, 이미지 갤러리, 실시간 댓글, AI 분석) */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {activeArticle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-foreground">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                            <div className="flex flex-col gap-1 min-w-0 max-w-xl">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge className="bg-primary text-primary-foreground text-xs font-bold shrink-0">
                                        {activeArticle.community_name || activeArticle.source_type}
                                    </Badge>
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 shrink-0" title={`원문 작성: ${activeArticle.created_at_source || activeArticle.scraped_at}`}>
                                        <Clock className="w-3.5 h-3.5" />
                                        작성: {activeArticle.created_at_source || '방금 전'} ({formatRelativeTime(activeArticle)})
                                    </span>
                                </div>
                                <h3 className="text-sm sm:text-base font-extrabold truncate" title={activeArticle.title}>
                                    {activeArticle.title}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <a
                                    href={toValidUrl(activeArticle.url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => handleOpenExternal(activeArticle.url, e)}
                                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20"
                                    title="원문 링크 새 창으로 열기"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" /> 원문 보기
                                </a>
                                <button
                                    onClick={() => setActiveArticle(null)}
                                    className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Subtabs */}
                        <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/20 overflow-x-auto text-xs font-bold">
                            <button
                                onClick={() => setInspectionTab('decision_brief')}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                                    inspectionTab === 'decision_brief'
                                        ? "bg-primary text-primary-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                📊 의사결정 브리프
                            </button>
                            <button
                                onClick={() => setInspectionTab('full_content')}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                                    inspectionTab === 'full_content'
                                        ? "bg-primary text-primary-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                본문 전문 및 이미지 ({activeArticle.images?.length || 0})
                            </button>
                            <button
                                onClick={() => setInspectionTab('narrative')}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                                    inspectionTab === 'narrative'
                                        ? "bg-primary text-primary-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                AI 서사 타임라인
                            </button>
                            <button
                                onClick={() => setInspectionTab('sentiment')}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                                    inspectionTab === 'sentiment'
                                        ? "bg-primary text-primary-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                실시간 댓글 반응 ({activeArticle.comments?.length || 0})
                            </button>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fetchDetailsMutation.mutate(activeArticle.id)}
                                disabled={fetchDetailsMutation.isPending}
                                className="ml-auto h-7 text-xs font-bold gap-1 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                            >
                                <RefreshCw className={cn("w-3 h-3", fetchDetailsMutation.isPending && "animate-spin")} />
                                {fetchDetailsMutation.isPending ? '심층 수집 중...' : '🌐 원문 심층 재수집 (미디어/댓글/실측)'}
                            </Button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 overflow-y-auto flex-1 text-xs space-y-4">
                            {/* Tab 0: 📊 바이럴 의사결정 브리프 (핵심 사유, 수치, 폼팩터 판정) */}
                            {inspectionTab === 'decision_brief' && (
                                <div className="space-y-4 animate-in fade-in">
                                    {/* 1. 3초 킬러 훅 & 추천 폼팩터 헤더 */}
                                    <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15 space-y-2">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge className="bg-amber-600 text-white font-extrabold text-[11px] px-2 py-0.5 shadow-xs flex items-center gap-1">
                                                    <Zap className="w-3.5 h-3.5 fill-current" />
                                                    {activeArticle.recommended_form_factor === 'gunlimbo' ? '⚡ 군림보 속보형 적극 추천' : '💬 썰형 스토리 적극 추천'}
                                                </Badge>
                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-[10.5px]">
                                                    🎬 영상화 적합도: {activeArticle.structured_script?.video_worthiness || 95}/100
                                                </Badge>
                                                {(activeArticle.community_name === 'boredpanda' || activeArticle.source_type === 'reddit' || activeArticle.community_name === 'theverge' || activeArticle.community_name === 'bbc_world') && (
                                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-bold">
                                                        🌐 한국어 로컬라이징 완료
                                                    </Badge>
                                                )}
                                                <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-500/40 font-mono font-bold text-[10.5px]">
                                                    🔥 도파민 지수: {activeArticle.dopamine_index || 99.5}/100
                                                </Badge>
                                            </div>
                                            <span className="text-[11px] font-mono text-muted-foreground">
                                                골든타임: <b className="text-rose-600 dark:text-rose-400 font-bold">{activeArticle.golden_time_hours || 12}시간 이내</b> 제작 필수
                                            </span>
                                        </div>
                                        <div className="p-2.5 rounded-lg bg-card/80 border border-border/70 text-foreground">
                                            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1">
                                                <Sparkles className="w-3.5 h-3.5" /> ⚡ 3초 이탈 방지 킬러 훅 (Hook Jab)
                                            </div>
                                            <p className="text-xs sm:text-sm font-black tracking-tight leading-snug">
                                                "{activeArticle.hook_line || `[충격] ${activeArticle.title} 지금 당장 봐야 하는 이유`}"
                                            </p>
                                        </div>
                                    </div>

                                    {/* 2. 4대 핵심 퀀트 데이터 그리드 */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        <div className="p-3 rounded-xl border border-border bg-card shadow-2xs space-y-1">
                                            <span className="text-[10px] text-muted-foreground font-medium">🎯 바이럴 종합 점수</span>
                                            <div className="text-base sm:text-lg font-black text-foreground font-mono flex items-center gap-1">
                                                <span className="text-primary">{activeArticle.viral_score}</span>
                                                <span className="text-xs font-normal text-muted-foreground">/ 100</span>
                                            </div>
                                            <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold">상위 0.1% 폭발적 반응</span>
                                        </div>
                                        <div className="p-3 rounded-xl border border-border bg-card shadow-2xs space-y-1">
                                            <span className="text-[10px] text-muted-foreground font-medium">⚡ 유입 & 확산 속도</span>
                                            <div className="text-base sm:text-lg font-black text-foreground font-mono">
                                                {formatVelocity(activeArticle.velocity_score)}
                                            </div>
                                            <span className="text-[9.5px] text-blue-600 dark:text-blue-400 font-bold">실시간 연쇄 확산 중</span>
                                        </div>
                                        <div className="p-3 rounded-xl border border-border bg-card shadow-2xs space-y-1">
                                            <span className="text-[10px] text-muted-foreground font-medium">🧠 도파민 지수</span>
                                            <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                                                {activeArticle.dopamine_index || 99.5}
                                            </div>
                                            <span className="text-[9.5px] text-rose-600 dark:text-rose-400 font-bold">시청 지속 시간 극대화</span>
                                        </div>
                                        <div className="p-3 rounded-xl border border-border bg-card shadow-2xs space-y-1">
                                            <span className="text-[10px] text-muted-foreground font-medium">💬 실시간 반응 합계</span>
                                            <div className="text-base sm:text-lg font-black text-foreground font-mono">
                                                {formatCount((activeArticle.likes || 0) + (activeArticle.comments_count || 0))}
                                            </div>
                                            <span className="text-[9.5px] text-muted-foreground font-mono">
                                                추천 {formatCount(activeArticle.likes)} • 댓글 {formatCount(activeArticle.comments_count)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 3. 왜 이 화제작이 선정되었는가? (구체적 사유 및 심리 트리거) */}
                                    <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                                                <Flame className="w-4 h-4 text-primary" /> 왜 지금 이 글이 화제작으로 선정되었는가?
                                            </h4>
                                            <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                                                트리거: {activeArticle.psychological_trigger || '분노/정의감'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-foreground/90 leading-relaxed font-medium bg-muted/30 p-2.5 rounded-lg border border-border/50">
                                            {activeArticle.analysis_summary || activeArticle.structured_script?.why_viral || '실시간 커뮤니티 추천수와 댓글 유입 속도가 동시간대 상위 1%를 기록하며, 대중의 즉각적인 공감과 열띤 논쟁을 동시에 촉발하고 있는 핵심 골든타임 화제작입니다.'}
                                        </p>
                                    </div>

                                    {/* 4. 폼팩터별 적합도 및 제작 추천 판정 */}
                                    <div className="p-3.5 rounded-xl border border-border bg-card space-y-2.5">
                                        <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                                            <Clapperboard className="w-4 h-4 text-primary" /> 폼팩터별 제작 적합도 비교 & 판정
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div className={cn(
                                                "p-2.5 rounded-lg border text-xs space-y-1 transition-all",
                                                activeArticle.recommended_form_factor === 'gunlimbo'
                                                    ? "border-amber-500/50 bg-amber-500/10 dark:bg-amber-500/15"
                                                    : "border-border/60 bg-muted/20"
                                            )}>
                                                <div className="flex items-center justify-between font-bold">
                                                    <span className="text-amber-600 dark:text-amber-400">⚡ 군림보 브레이킹</span>
                                                    <span className="font-mono">{activeArticle.gunlimbo_score || 99.5}점</span>
                                                </div>
                                                <p className="text-[10.5px] text-muted-foreground leading-tight">
                                                    사건/사고, 논란, 속보 폭로 전개에 가장 강력한 후킹 효과
                                                </p>
                                            </div>

                                            <div className={cn(
                                                "p-2.5 rounded-lg border text-xs space-y-1 transition-all",
                                                activeArticle.recommended_form_factor === 'ssul'
                                                    ? "border-indigo-500/50 bg-indigo-500/10 dark:bg-indigo-500/15"
                                                    : "border-border/60 bg-muted/20"
                                            )}>
                                                <div className="flex items-center justify-between font-bold">
                                                    <span className="text-indigo-600 dark:text-indigo-400">💬 썰형 커뮤니티</span>
                                                    <span className="font-mono">{activeArticle.ssul_score || 99.5}점</span>
                                                </div>
                                                <p className="text-[10.5px] text-muted-foreground leading-tight">
                                                    공감, 일상, 연애, 억울한 사연 등 몰입도 높은 썰 풀이에 최적
                                                </p>
                                            </div>

                                            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs space-y-1">
                                                <div className="flex items-center justify-between font-bold">
                                                    <span className="text-blue-600 dark:text-blue-400">✨ 클래식 NLE</span>
                                                    <span className="font-mono">{activeArticle.classic_score || 85.0}점</span>
                                                </div>
                                                <p className="text-[10.5px] text-muted-foreground leading-tight">
                                                    정통 다큐멘터리 및 시각 중심 정보성 쇼츠 제작
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5. 하단 빠른 제작 액션 */}
                                    <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between flex-wrap gap-2">
                                        <span className="text-xs font-bold text-foreground">
                                            💡 검토 완료: 이 소재로 즉시 숏폼 제작을 시작하시겠습니까?
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => navigate(`/shorts-editor/gunlimbo?article_id=${activeArticle.id}`)}
                                                className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs gap-1"
                                            >
                                                <Zap className="w-3.5 h-3.5 fill-current" /> ⚡ 군림보 제작
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => navigate(`/shorts-editor/ssul?article_id=${activeArticle.id}`)}
                                                className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs gap-1"
                                            >
                                                <Sparkles className="w-3.5 h-3.5" /> 💬 썰형 제작
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 1: Full Content Text with Inline Media & Collapsible Image Gallery */}
                            {inspectionTab === 'full_content' && (() => {
                                const isVideoPoster = (url: string) => url.includes('.mp4.thumb') || url.includes('.thumb.webp') || url.includes('.thumb.');
                                const realPhotos = (activeArticle.images || []).filter(img => !isVideoPoster(img));
                                const posterVideos = (activeArticle.images || []).filter(isVideoPoster).map(img =>
                                    img.replace('image.fmkorea.com', 'mediak5jvqbd.fmkorea.com').replace('.thumb.webp', '') + '?d'
                                );

                                return (
                                <div className="space-y-4">
                                    {/* High-Res Body Images Grid (Collapsible) - ONLY REAL PHOTOS */}
                                    {realPhotos.length > 0 && (
                                        <div className="space-y-2 p-3 rounded-xl bg-card border border-border/80">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                                                    <ImageIcon className="w-3.5 h-3.5 text-primary" /> 수집된 원본 사진 모아보기
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/30 text-primary">
                                                        {realPhotos.length}장
                                                    </Badge>
                                                </h4>
                                                {realPhotos.length > 4 && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
                                                        onClick={() => setIsGalleryExpanded(!isGalleryExpanded)}
                                                    >
                                                        {isGalleryExpanded ? (
                                                            <>
                                                                <ChevronUp className="w-3 h-3" /> 접기
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ChevronDown className="w-3 h-3" /> 전체 ({realPhotos.length}장) 보기
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {(isGalleryExpanded ? realPhotos : realPhotos.slice(0, 4)).map((img, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => setLightboxImage({
                                                            url: getProxyImageUrl(img),
                                                            title: activeArticle.title,
                                                            source: activeArticle.community_name || activeArticle.source_type,
                                                            articleUrl: activeArticle.url
                                                        })}
                                                        className="group relative aspect-video rounded-lg overflow-hidden border border-border/80 cursor-pointer bg-muted/40 hover:border-primary/50 transition-all"
                                                    >
                                                        <img src={getProxyImageUrl(img)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white pointer-events-none">
                                                            <Maximize2 className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Inline Media Rich Reader with Extra Converted Videos */}
                                    <InlineArticleRenderer
                                        contentText={activeArticle.content_text}
                                        images={activeArticle.images}
                                        extraVideos={posterVideos}
                                        onOpenImage={(imgUrl) => setLightboxImage({
                                            url: getProxyImageUrl(imgUrl),
                                            title: activeArticle.title,
                                            source: activeArticle.community_name || activeArticle.source_type,
                                            articleUrl: activeArticle.url
                                        })}
                                        onOpenExternal={(url, e) => handleOpenExternal(url, e)}
                                    />
                                </div>
                                );
                            })()}

                            {/* Tab 2: AI Narrative & 4-Stage Timeline & Scenes */}
                            {inspectionTab === 'narrative' && (
                                <div className="space-y-4">
                                    {/* Why Viral & Psychological Trigger */}
                                    <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-primary flex items-center gap-1.5">
                                                <Flame className="w-4 h-4 text-primary" /> 왜 바이럴되는가? (Scout-Alpha 심층 분석)
                                            </h4>
                                            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-mono font-bold">
                                                {activeArticle.psychological_trigger || '호기심/금기'}
                                            </Badge>
                                        </div>
                                        <p className="text-foreground leading-relaxed text-[12px]">
                                            {activeArticle.analysis_summary || activeArticle.structured_script?.why_viral || '분석 요약 정보가 아직 없습니다.'}
                                        </p>
                                    </div>

                                    {/* 4-Stage Narrative Timeline (기-승-전-결) */}
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-foreground flex items-center gap-1.5">
                                            <Sparkles className="w-4 h-4 text-amber-500" /> 4단계 서사 타임라인 구조 (기-승-전-결)
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1">
                                                <div className="flex items-center justify-between font-bold text-blue-600 dark:text-blue-400">
                                                    <span>起 (발단: 사건의 시초)</span>
                                                    <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-600">01</Badge>
                                                </div>
                                                <p className="text-foreground/90 text-[11px] leading-relaxed">
                                                    {activeArticle.structured_script?.story_timeline?.stage_1_origin || "사건의 최초 발단과 시청자의 호기심을 유발하는 사건의 배경이 전개됩니다."}
                                                </p>
                                            </div>

                                            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1">
                                                <div className="flex items-center justify-between font-bold text-amber-600 dark:text-amber-400">
                                                    <span>承 (전개: 갈등 증폭)</span>
                                                    <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-600">02</Badge>
                                                </div>
                                                <p className="text-foreground/90 text-[11px] leading-relaxed">
                                                    {activeArticle.structured_script?.story_timeline?.stage_2_development || "대중적 논란의 급격한 확산과 당사자 간 대립 구도가 격화됩니다."}
                                                </p>
                                            </div>

                                            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-1">
                                                <div className="flex items-center justify-between font-bold text-rose-600 dark:text-rose-400">
                                                    <span>轉 (절정: 반전과 충격)</span>
                                                    <Badge variant="outline" className="text-[9px] border-rose-500/30 text-rose-600">03</Badge>
                                                </div>
                                                <p className="text-foreground/90 text-[11px] leading-relaxed">
                                                    {activeArticle.structured_script?.story_timeline?.stage_3_climax || "예상치 못한 반전과 충격적 사실이 드러나며 도파민이 최고조에 달합니다."}
                                                </p>
                                            </div>

                                            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
                                                <div className="flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400">
                                                    <span>結 (결말: 교훈과 대중 여론)</span>
                                                    <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-600">04</Badge>
                                                </div>
                                                <p className="text-foreground/90 text-[11px] leading-relaxed">
                                                    {activeArticle.structured_script?.story_timeline?.stage_4_conclusion || "사건의 최종 귀결과 대중 네티즌의 압도적 집단 반응 및 교훈을 남깁니다."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Scenes Breakdown */}
                                    {activeArticle.structured_script?.scenes && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                                                    <Clapperboard className="w-4 h-4 text-primary" /> 씬별 맞춤 대본 ({activeArticle.structured_script.scenes.length}개 장면)
                                                </h4>
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            const allNarration = activeArticle.structured_script?.scenes?.map((s: any) => `[씬 ${s.scene_index}] ${s.narration}`).join("\n\n") || '';
                                                            navigator.clipboard.writeText(allNarration);
                                                            toast.success('전체 씬 대본이 클립보드에 복사되었습니다.');
                                                        }}
                                                        className="h-7 text-xs gap-1 cursor-pointer"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" /> 대본 전체 복사
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            const targetFactor = activeArticle.structured_script?.suggested_form_factor || 'gunlimbo';
                                                            navigate(`/shorts-editor/${targetFactor}?article_id=${activeArticle.id}`);
                                                        }}
                                                        className="h-7 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs gap-1"
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5" /> ⚡ 숏폼 스튜디오로 전송
                                                    </Button>
                                                </div>
                                            </div>
                                            {activeArticle.structured_script.scenes.map((sc, idx) => (
                                                <div key={idx} className="p-3 rounded-lg border border-border bg-card space-y-1">
                                                    <div className="flex items-center justify-between font-bold text-[11px] text-primary">
                                                        <span>장면 #{sc.scene_index} ({sc.duration_sec}초)</span>
                                                        <span className="text-muted-foreground">{sc.hook_jab_text}</span>
                                                    </div>
                                                    <p className="text-foreground font-medium">{sc.narration}</p>
                                                    <p className="text-[10px] text-muted-foreground font-mono">시각 프롬프트: {sc.visual_prompt}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab 3: Sentiment Topology & Comments */}
                            {inspectionTab === 'sentiment' && (
                                <div className="space-y-4">
                                    {/* Sentiment Topology Gauge */}
                                    <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2">
                                        <h4 className="font-bold text-foreground flex items-center gap-1.5">
                                            <Activity className="w-4 h-4 text-primary" /> 실시간 여론 위상 (Sentiment Topology)
                                        </h4>
                                        <div className="flex items-center gap-2 text-xs font-mono font-bold">
                                            <span className="text-blue-600 dark:text-blue-400">
                                                찬성/공감: {activeArticle.structured_script?.sentiment_topology?.pro_ratio || 25}%
                                            </span>
                                            <span>•</span>
                                            <span className="text-rose-600 dark:text-rose-400">
                                                비판/분노: {activeArticle.structured_script?.sentiment_topology?.con_ratio || 70}%
                                            </span>
                                            <span>•</span>
                                            <span className="text-muted-foreground">
                                                중립: {activeArticle.structured_script?.sentiment_topology?.neutral_ratio || 5}%
                                            </span>
                                        </div>
                                        {activeArticle.structured_script?.sentiment_topology?.core_debate && (
                                            <p className="text-[11px] text-foreground font-medium bg-card p-2 rounded border border-border/60">
                                                <span className="text-primary font-bold mr-1">핵심 논쟁:</span>
                                                {activeArticle.structured_script.sentiment_topology.core_debate}
                                            </p>
                                        )}
                                    </div>

                                    {/* Real Comments Section */}
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-foreground flex items-center gap-1.5">
                                            <MessageSquare className="w-4 h-4 text-primary" /> 실시간 베스트 댓글 및 커뮤니티 여론 ({activeArticle.comments?.length || 0}건)
                                        </h4>
                                        <span className="text-[11px] text-muted-foreground">
                                            👍 추천수 및 BEST 순위 정렬
                                        </span>
                                    </div>
                                    {activeArticle.comments && activeArticle.comments.length > 0 ? (
                                        <div className="space-y-2.5">
                                            {[...activeArticle.comments]
                                                .sort((a, b) => {
                                                    if (a.is_best && !b.is_best) return -1;
                                                    if (!a.is_best && b.is_best) return 1;
                                                    return (b.likes || 0) - (a.likes || 0);
                                                })
                                                .map((cmt, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={cn(
                                                            "p-3 rounded-xl border transition-all space-y-1.5",
                                                            cmt.is_best
                                                                ? "border-blue-500/40 bg-blue-500/5 dark:bg-blue-500/10 shadow-xs"
                                                                : "border-border bg-card"
                                                        )}
                                                    >
                                                        <div className="flex items-center justify-between text-xs font-bold flex-wrap gap-1">
                                                            <div className="flex items-center gap-1.5">
                                                                {cmt.is_best ? (
                                                                    <Badge className="bg-blue-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded shadow-xs">
                                                                        BEST
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0.2 text-muted-foreground border-border/80">
                                                                        #{idx + 1}
                                                                    </Badge>
                                                                )}
                                                                <span className={cn("text-foreground", cmt.is_best && "text-blue-600 dark:text-blue-400 font-extrabold")}>
                                                                    {cmt.author}
                                                                </span>
                                                            </div>
                                                            <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/15 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono font-bold text-xs">
                                                                👍 {formatCount(cmt.likes)}
                                                            </span>
                                                        </div>
                                                        <p className="text-foreground/90 text-xs leading-relaxed pl-1 whitespace-pre-line">
                                                            {cmt.text}
                                                        </p>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
                                            수집된 댓글이 없습니다. 상단 '원문 재수집'을 눌러 실시간 여론을 갱신할 수 있습니다.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer Actions: Dedicated Sovereign Studios */}
                        <div className="p-3.5 border-t border-border flex items-center justify-between bg-muted/20">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                    size="sm"
                                    onClick={() => navigate(`/shorts-editor/gunlimbo?article_id=${activeArticle.id}`)}
                                    className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs gap-1"
                                    title="군림보 브레이킹 전용 편집기로 즉시 이동"
                                >
                                    <Zap className="w-3.5 h-3.5 fill-current" />
                                    ⚡ 군림보 편집기로 이동
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => navigate(`/shorts-editor/ssul?article_id=${activeArticle.id}`)}
                                    className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs gap-1"
                                    title="썰형 전용 편집기로 즉시 이동"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    💬 썰형 편집기로 이동
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigate(`/shorts-editor/classic?article_id=${activeArticle.id}`)}
                                    className="h-8 text-xs font-bold border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 cursor-pointer gap-1"
                                    title="클래식 전용 편집기로 즉시 이동"
                                >
                                    <Film className="w-3.5 h-3.5" />
                                    ✨ 클래식 편집기
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendToVideoVaultBatch([activeArticle])}
                                    className="h-8 text-xs font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer gap-1"
                                    title="영상 보관함으로 등록"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    🎬 영상 보관함 저장
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={exportingArticleId === activeArticle.id}
                                    onClick={() => handleExportSingleArticleToCapcut(activeArticle)}
                                    className="h-8 text-xs font-bold border-cyan-500/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 cursor-pointer gap-1"
                                    title="CapCut PC 원클릭 프로젝트(6씬 대본 및 미디어)로 내보내기"
                                >
                                    {exportingArticleId === activeArticle.id ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Film className="w-3.5 h-3.5 text-cyan-500" />
                                    )}
                                    🎬 CapCut PC 생성
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={enqueuingArticleId === activeArticle.id}
                                    onClick={() => handleEnqueueSingleArticleToWorkQueue(activeArticle)}
                                    className="h-8 text-xs font-bold border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 cursor-pointer gap-1"
                                    title="제작 대기열(WorkQueue)에 등록하여 무인 자율 파이프라인으로 전송"
                                >
                                    {enqueuingArticleId === activeArticle.id ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <FolderPlus className="w-3.5 h-3.5 text-purple-500" />
                                    )}
                                    📥 제작 큐 등록
                                </Button>
                            </div>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setActiveArticle(null)}
                                className="h-8 text-xs font-semibold cursor-pointer"
                            >
                                닫기
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* 9. 🎯 하단 플로팅 액션 바 (Pixeling Style Multi-Select Floating Bar) */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {selectedArticleIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white backdrop-blur-md border border-slate-700/80 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 max-w-[95vw] overflow-x-auto select-none">
                    <div className="flex items-center gap-2 border-r border-slate-700 pr-3 shrink-0">
                        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                            {selectedArticleIds.length}
                        </span>
                        <span className="text-xs font-bold text-slate-200">개 화제작 선택됨</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* 1. 군림보 브레이킹 일괄 생성 */}
                        <Button
                            onClick={() => handleSendToBatchStudio(articles.filter(a => selectedArticleIds.includes(a.id)), 'gunlimbo')}
                            className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md h-auto cursor-pointer"
                        >
                            <Zap className="w-3.5 h-3.5 fill-current text-amber-200" />
                            ⚡ 군림보형 일괄 생성 ({selectedArticleIds.length})
                        </Button>

                        {/* 2. 썰형 스토리 일괄 생성 */}
                        <Button
                            onClick={() => handleSendToBatchStudio(articles.filter(a => selectedArticleIds.includes(a.id)), 'ssul')}
                            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md h-auto cursor-pointer"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                            💬 썰형 일괄 생성 ({selectedArticleIds.length})
                        </Button>

                        {/* 3. 클래식형 일괄 생성 */}
                        <Button
                            onClick={() => handleSendToBatchStudio(articles.filter(a => selectedArticleIds.includes(a.id)), 'classic')}
                            className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md h-auto cursor-pointer"
                        >
                            <Film className="w-3.5 h-3.5 text-blue-200" />
                            ✨ 클래식 일괄 생성 ({selectedArticleIds.length})
                        </Button>

                        {/* 4. 영상 보관함 등록 */}
                        <Button
                            onClick={() => handleSendToVideoVaultBatch(articles.filter(a => selectedArticleIds.includes(a.id)))}
                            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md h-auto cursor-pointer"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                            🎬 영상 보관함 등록 ({selectedArticleIds.length})
                        </Button>

                        {/* 5. CapCut PC 일괄 내보내기 */}
                        <Button
                            onClick={() => handleBatchExportArticlesToCapcut(articles.filter(a => selectedArticleIds.includes(a.id)))}
                            disabled={isBatchExportingCapcut}
                            className="bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md h-auto cursor-pointer"
                            title="선택된 모든 소재를 각각의 CapCut PC 프로젝트로 일괄 생성"
                        >
                            {isBatchExportingCapcut ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Film className="w-3.5 h-3.5 text-cyan-200" />
                            )}
                            🎬 CapCut 일괄 생성 ({selectedArticleIds.length})
                        </Button>

                        {/* 6. 제작 큐 일괄 등록 */}
                        <Button
                            onClick={() => handleBatchEnqueueArticlesToWorkQueue(articles.filter(a => selectedArticleIds.includes(a.id)))}
                            disabled={isBatchEnqueuingWorkQueue}
                            className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md h-auto cursor-pointer"
                            title="선택된 소재를 무인 제작 대기열(WorkQueue)에 등록"
                        >
                            {isBatchEnqueuingWorkQueue ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <FolderPlus className="w-3.5 h-3.5 text-purple-200" />
                            )}
                            📥 큐 등록 ({selectedArticleIds.length})
                        </Button>

                        {/* 5. 원본 전문 & 이미지 일괄 심층 스크랩 */}
                        <Button
                            onClick={() => handleBatchFetchDetails(articles.filter(a => selectedArticleIds.includes(a.id)))}
                            disabled={batchScraping}
                            className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all border border-slate-600 flex items-center gap-1.5 h-auto cursor-pointer"
                        >
                            {batchScraping ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                                    스크랩 중 ({batchScrapeProgress}/{selectedArticleIds.length})
                                </>
                            ) : (
                                <>
                                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                                    🌐 전문·이미지 스크랩 ({selectedArticleIds.length})
                                </>
                            )}
                        </Button>
                    </div>

                    {/* 선택 취소 버튼 */}
                    <button
                        onClick={() => setSelectedArticleIds([])}
                        className="text-slate-400 hover:text-white p-1 rounded-lg ml-1 shrink-0 cursor-pointer"
                        title="선택 취소"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* 10. Free Media Search Modal */}
            {mediaModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl text-foreground">
                        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                            <h3 className="text-sm font-bold flex items-center gap-1.5">
                                <ImageIcon className="w-4 h-4 text-primary" /> 무비용 실사 검색 및 캐싱
                            </h3>
                            <button onClick={() => setMediaModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3 flex-1 overflow-y-auto text-xs">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={mediaQuery}
                                    onChange={(e) => setMediaQuery(e.target.value)}
                                    placeholder="검색 키워드 (예: 직장인 회식, 주식 폭락, 편의점 알바)..."
                                    className="flex-1 h-8 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-xs focus:outline-hidden"
                                    onKeyDown={(e) => e.key === 'Enter' && handleMediaSearch()}
                                />
                                <Button size="sm" onClick={handleMediaSearch} disabled={searchingMedia} className="h-8 text-xs font-bold bg-primary text-primary-foreground cursor-pointer">
                                    {searchingMedia ? '검색 중...' : '검색'}
                                </Button>
                            </div>

                            <div className="grid grid-cols-3 gap-2.5 pt-2">
                                {mediaResults.map((item, idx) => (
                                    <div key={idx} className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/50">
                                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-[10px] text-white font-bold px-2 py-1 rounded bg-primary">선택</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        {/* 7. 🖼️ In-App Electron 1080p Lightbox Modal */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {lightboxImage && (
                <div
                    onClick={() => setLightboxImage(null)}
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in select-none"
                >
                    {/* Header */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-5xl flex items-center justify-between p-3 text-white"
                    >
                        <div className="flex items-center gap-2">
                            <Badge className="bg-primary text-white text-xs font-bold px-2 py-0.5">
                                {lightboxImage.source}
                            </Badge>
                            <h2 className="text-sm font-bold text-white/90 truncate max-w-xl">
                                {lightboxImage.title}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {lightboxImage.articleUrl && (
                                <a
                                    href={toValidUrl(lightboxImage.articleUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => handleOpenExternal(lightboxImage.articleUrl, e)}
                                    className="h-8 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                    title="원문 링크 새 창으로 열기"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" /> 원문 보기
                                </a>
                            )}
                            <button
                                onClick={() => setLightboxImage(null)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                                title="닫기 (ESC)"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Image View */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative max-w-5xl max-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl border border-white/20 shadow-2xl bg-black"
                    >
                        <img
                            src={lightboxImage.url}
                            alt=""
                            className="max-w-full max-h-[80vh] object-contain rounded-xl"
                        />
                    </div>

                    <div className="text-xs text-white/60 mt-3 flex items-center gap-4">
                        <span>💡 바깥 영역 클릭 또는 [ESC]로 닫기</span>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* 11. 🗑️ 수집 기사 맞춤 정리/삭제 모달 (기간별, 매체별, 전체 일괄 삭제) */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {isCleanupModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl text-foreground">
                        {/* Header */}
                        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                            <div className="flex items-center gap-2">
                                <Trash2 className="w-5 h-5 text-destructive" />
                                <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                                    수집 데이터 맞춤 정리 및 일괄 삭제
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsCleanupModalOpen(false)}
                                className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4 text-xs">
                            {/* Mode Selection Tabs */}
                            <div className="grid grid-cols-4 gap-1.5 p-1 bg-muted rounded-xl text-center font-bold">
                                <button
                                    onClick={() => setCleanupMode('period')}
                                    className={cn(
                                        "py-2 rounded-lg transition-all cursor-pointer",
                                        cleanupMode === 'period'
                                            ? "bg-card text-foreground shadow-xs"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    기간별
                                </button>
                                <button
                                    onClick={() => setCleanupMode('platform')}
                                    className={cn(
                                        "py-2 rounded-lg transition-all cursor-pointer",
                                        cleanupMode === 'platform'
                                            ? "bg-card text-foreground shadow-xs"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    매체별
                                </button>
                                <button
                                    onClick={() => setCleanupMode('selected')}
                                    className={cn(
                                        "py-2 rounded-lg transition-all cursor-pointer",
                                        cleanupMode === 'selected'
                                            ? "bg-card text-foreground shadow-xs"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    선택 ({selectedArticleIds.length})
                                </button>
                                <button
                                    onClick={() => setCleanupMode('all')}
                                    className={cn(
                                        "py-2 rounded-lg transition-all cursor-pointer text-destructive",
                                        cleanupMode === 'all'
                                            ? "bg-destructive text-destructive-foreground shadow-xs"
                                            : "hover:bg-destructive/10"
                                    )}
                                >
                                    전체 초기화
                                </button>
                            </div>

                            {/* Mode A: 기간별 삭제 */}
                            {cleanupMode === 'period' && (
                                <div className="space-y-3 p-3.5 rounded-xl border border-border bg-muted/20">
                                    <div className="font-bold text-foreground flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        삭제 기준 기간 선택
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        선택한 기간 이전에 수집된 오래된 기사들을 데이터베이스에서 일괄 삭제합니다.
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        {[
                                            { hours: 24, label: '1일 이상 경과 (24h+)' },
                                            { hours: 72, label: '3일 이상 경과 (72h+)' },
                                            { hours: 168, label: '7일 이상 경과 (1주+)' },
                                            { hours: 720, label: '30일 이상 경과 (1개월+)' },
                                        ].map((opt) => (
                                            <button
                                                key={opt.hours}
                                                onClick={() => setCleanupHours(opt.hours)}
                                                className={cn(
                                                    "p-2.5 rounded-lg border text-center font-bold transition-all cursor-pointer",
                                                    cleanupHours === opt.hours
                                                        ? "border-primary bg-primary/10 text-primary"
                                                        : "border-border/80 bg-card hover:border-primary/40 text-muted-foreground"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Mode B: 매체별 삭제 */}
                            {cleanupMode === 'platform' && (
                                <div className="space-y-3 p-3.5 rounded-xl border border-border bg-muted/20">
                                    <div className="font-bold text-foreground flex items-center gap-1.5">
                                        <Globe className="w-4 h-4 text-primary" />
                                        삭제 대상 매체/플랫폼 선택
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        선택한 특정 매체에서 수집된 모든 기사만을 깔끔하게 비웁니다.
                                    </p>
                                    <div className="pt-1">
                                        <select
                                            value={cleanupPlatform}
                                            onChange={(e) => setCleanupPlatform(e.target.value)}
                                            className="w-full h-9 px-3 rounded-lg bg-card border border-border text-foreground text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-primary"
                                        >
                                            <optgroup label="국내 주요 커뮤니티">
                                                <option value="fmkorea">에펨코리아 (fmkorea)</option>
                                                <option value="dcinside">디시인사이드 (dcinside)</option>
                                                <option value="mlbpark">엠엘비파크 (mlbpark)</option>
                                                <option value="bobae_best">보배드림 (bobae_best)</option>
                                                <option value="natepann">네이트판 (natepann)</option>
                                                <option value="ruliweb">루리웹 (ruliweb)</option>
                                                <option value="inven">인벤 (inven)</option>
                                                <option value="ppomppu">뽐뿌 (ppomppu)</option>
                                                <option value="theqoo">더쿠 (theqoo)</option>
                                                <option value="dogdrip">개드립 (dogdrip)</option>
                                            </optgroup>
                                            <optgroup label="포털 및 뉴스">
                                                <option value="news">네이버 뉴스 전체</option>
                                                <option value="google_trends">구글 실시간 트렌드</option>
                                            </optgroup>
                                            <optgroup label="해외 매체 및 레딧">
                                                <option value="reddit">레딧 전체 (Reddit)</option>
                                                <option value="boredpanda">보드판다 (Bored Panda)</option>
                                                <option value="buzzfeed">버즈피드 (BuzzFeed)</option>
                                                <option value="theverge">더 버지 (The Verge)</option>
                                                <option value="bbc_world">BBC World</option>
                                                <option value="odditycentral">Oddity Central</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Mode C: 선택 삭제 */}
                            {cleanupMode === 'selected' && (
                                <div className="space-y-3 p-3.5 rounded-xl border border-border bg-muted/20">
                                    <div className="font-bold text-foreground flex items-center gap-1.5">
                                        <CheckSquare className="w-4 h-4 text-primary" />
                                        선택된 기사 일괄 삭제
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        현재 화면에서 체크박스로 선택된 <strong>{selectedArticleIds.length}건</strong>의 기사를 데이터베이스에서 영구 제거합니다.
                                    </p>
                                    {selectedArticleIds.length === 0 && (
                                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px]">
                                            ⚠️ 선택된 기사가 없습니다. 메인 목록에서 삭제할 기사의 체크박스를 선택해 주세요.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Mode D: 전체 일괄 초기화 */}
                            {cleanupMode === 'all' && (
                                <div className="space-y-3 p-3.5 rounded-xl border border-destructive/30 bg-destructive/10">
                                    <div className="font-extrabold text-destructive flex items-center gap-1.5">
                                        <AlertTriangle className="w-4 h-4 fill-destructive text-white" />
                                        전체 수집 데이터 완전 초기화 (위험)
                                    </div>
                                    <p className="text-[11px] text-destructive leading-relaxed">
                                        현재 데이터베이스에 저장된 <strong>모든 수집 기사(커뮤니티, 뉴스, 해외 피드 일체)</strong>가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-border flex items-center justify-end gap-2 bg-muted/30">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCleanupModalOpen(false)}
                                className="cursor-pointer"
                            >
                                취소
                            </Button>
                            <Button
                                size="sm"
                                variant={cleanupMode === 'all' ? 'destructive' : 'default'}
                                disabled={cleanupMutation.isPending || (cleanupMode === 'selected' && selectedArticleIds.length === 0)}
                                onClick={() => {
                                    if (cleanupMode === 'all') {
                                        if (!window.confirm("정말로 모든 수집 기사를 완전히 삭제하시겠습니까?")) return;
                                        cleanupMutation.mutate({ mode: 'all' });
                                    } else if (cleanupMode === 'platform') {
                                        cleanupMutation.mutate({ mode: 'platform', platform: cleanupPlatform });
                                    } else if (cleanupMode === 'period') {
                                        cleanupMutation.mutate({ mode: 'period', older_than_hours: cleanupHours });
                                    } else if (cleanupMode === 'selected') {
                                        cleanupMutation.mutate({ mode: 'selected', article_ids: selectedArticleIds });
                                    }
                                }}
                                className={cn(
                                    "font-bold text-xs gap-1.5 cursor-pointer",
                                    cleanupMode === 'all' ? "bg-destructive text-white hover:bg-destructive/90" : "bg-primary text-primary-foreground"
                                )}
                            >
                                {cleanupMutation.isPending ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                )}
                                {cleanupMutation.isPending ? '삭제 진행 중...' : '확인 및 삭제 실행'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* 9. 🚀 Floating Multi-Selection Action Bar (Channel Claim & Batch Hub) */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {selectedArticleIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-4xl w-[94%] sm:w-auto flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border border-primary/40 bg-card/95 backdrop-blur-md shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                    {/* Counter */}
                    <div className="flex items-center gap-2 pr-3 border-r border-border">
                        <CheckSquare className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-foreground whitespace-nowrap">
                            <b className="text-primary font-mono text-sm mr-1">{selectedArticleIds.length}</b>건 선택됨
                        </span>
                    </div>

                    {/* Channel Claim Group */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <select
                            value={targetClaimChannel}
                            onChange={(e) => setTargetClaimChannel(e.target.value)}
                            className="h-7 px-2 text-xs rounded-lg bg-muted/60 border border-border text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary max-w-[160px] sm:max-w-[200px]"
                        >
                            <option value="">배속할 브랜드 채널...</option>
                            {(clusterData?.brand_channels || []).map((ch: any) => (
                                <option key={ch.id} value={ch.id}>
                                    📺 {ch.name} ({ch.id})
                                </option>
                            ))}
                        </select>
                        <Button
                            size="sm"
                            disabled={!targetClaimChannel || claimBatchMutation.isPending}
                            onClick={() => {
                                if (!targetClaimChannel) {
                                    toast.error('배속할 브랜드 채널을 선택해 주세요.');
                                    return;
                                }
                                claimBatchMutation.mutate({
                                    article_ids: selectedArticleIds,
                                    channel_id: targetClaimChannel
                                });
                            }}
                            className="h-7 px-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs gap-1"
                            title="선택된 소재들을 지정한 브랜드 채널 전용 제작 큐로 배속"
                        >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span>채널 배속</span>
                        </Button>
                    </div>

                    {/* Quick Studio Handoffs */}
                    <div className="flex items-center gap-1.5">
                        <Button
                            size="sm"
                            onClick={() => {
                                const selected = articles.filter(a => selectedArticleIds.includes(a.id));
                                handleSendToBatchStudio(selected);
                            }}
                            className="h-7 px-2.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs gap-1"
                            title="선택된 기사들로 숏폼 일괄 대본 생성"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>⚡ 숏폼 일괄 제작</span>
                        </Button>

                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                const selected = articles.filter(a => selectedArticleIds.includes(a.id));
                                handleSendToCreativeStudioBatch(selected);
                            }}
                            className="h-7 px-2.5 text-xs font-bold border-border bg-muted/40 hover:bg-muted text-foreground cursor-pointer gap-1"
                            title="선택된 기사들로 미디어 일괄 생성 스튜디오 이동"
                        >
                            <Layers className="w-3.5 h-3.5 text-primary" />
                            <span>미디어 생성</span>
                        </Button>

                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                setCleanupMode('selected');
                                setIsCleanupModalOpen(true);
                            }}
                            className="h-7 px-2 text-xs font-bold border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer gap-1"
                            title="선택된 기사들 삭제"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>삭제</span>
                        </Button>

                        <button
                            onClick={() => setSelectedArticleIds([])}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer ml-0.5"
                            title="선택 해제"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* 🎬 시리즈 옴니버스 팩 모달 */}
            {seriesModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                    <div className="relative w-full max-w-5xl max-h-[85vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <Clapperboard className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-foreground flex items-center gap-2">
                                        <span>시리즈 옴니버스 팩 (Series Stitching Packs)</span>
                                        <Badge className="bg-emerald-600 text-white text-[10px] font-mono">
                                            {seriesPacksData?.total_packs || 0}개 팩 준비완료
                                        </Badge>
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        연관성 높은 하이라이트 영상/소재를 3연타로 묶어 50초 옴니버스 쇼츠를 일괄 제작합니다.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSeriesModalOpen(false)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body: Series Packs Grid */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {(seriesPacksData?.series_packs || []).map((pack: any) => (
                                    <div
                                        key={pack.series_key}
                                        className="p-3.5 rounded-xl bg-background border border-border/80 hover:border-primary/50 transition-all shadow-xs space-y-2.5 flex flex-col justify-between"
                                    >
                                        <div className="space-y-2.5">
                                            {/* Card Header */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-xl shrink-0">{pack.icon}</span>
                                                    <div className="min-w-0">
                                                        <h4 className="text-sm font-bold text-foreground truncate">
                                                            {pack.title}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                                                            <Badge variant="outline" className="text-[9.5px] px-1 py-0 shrink-0">
                                                                {pack.topic}
                                                            </Badge>
                                                            <span>소재 {pack.count}개</span>
                                                            <span>•</span>
                                                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                                                                🎬 영상 {pack.video_count}개
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-mono shrink-0">
                                                    평균 {pack.avg_viral_score}점
                                                </Badge>
                                            </div>

                                            {/* Suggested Title */}
                                            <div className="p-2 rounded-lg bg-muted/40 border border-border/60 text-xs">
                                                <span className="text-muted-foreground font-semibold">추천 옴니버스 제목:</span>
                                                <p className="font-bold text-foreground mt-0.5 line-clamp-1">
                                                    {pack.suggested_omnibus_title}
                                                </p>
                                            </div>

                                            {/* Articles Preview */}
                                            <div className="space-y-1">
                                                {(pack.articles || []).slice(0, 3).map((art: any, aIdx: number) => (
                                                    <div key={art.id} className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground min-w-0">
                                                        <span className="font-mono text-primary font-bold shrink-0">#{aIdx + 1}</span>
                                                        {art.url ? (
                                                            <a
                                                                href={art.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="truncate text-foreground/90 hover:text-primary hover:underline transition-colors flex-1"
                                                                title={art.title}
                                                            >
                                                                {art.title}
                                                            </a>
                                                        ) : (
                                                            <span className="truncate text-foreground/90 flex-1" title={art.title}>
                                                                {art.title}
                                                            </span>
                                                        )}
                                                        {art.viral_score && (
                                                            <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0">
                                                                {Math.round(art.viral_score)}점
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-border/40">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setSelectedSeriesKey(pack.series_key);
                                                    setPage(1);
                                                    setSeriesModalOpen(false);
                                                }}
                                                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer flex items-center gap-1 shrink-0"
                                                title="이 시리즈에 속한 전체 소재 목록으로 필터링합니다"
                                            >
                                                <span>소재 모아보기</span>
                                                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 font-mono font-normal">
                                                    {pack.count}
                                                </Badge>
                                            </Button>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={isExportingCapcut}
                                                    onClick={() => handleExportSeriesToCapcut(pack)}
                                                    className="h-7 text-xs px-2 font-semibold border-cyan-500/40 hover:bg-cyan-500/10 text-foreground cursor-pointer flex items-center gap-1 shadow-2xs transition-all"
                                                    title="CapCut PC 원클릭 드래프트(draft_content.json 및 root_meta_info 등록) 생성"
                                                >
                                                    {isExportingCapcut ? (
                                                        <RefreshCw className="w-3 h-3 animate-spin text-cyan-500" />
                                                    ) : (
                                                        <Film className="w-3 h-3 text-cyan-500" />
                                                    )}
                                                    <span>CapCut PC</span>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    disabled={isStitchingSeries}
                                                    onClick={() => handleStitchSeriesPack(pack, 'classic')}
                                                    className="h-7 text-xs px-2.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer flex items-center gap-1 shadow-xs transition-all"
                                                    title="TOP 3 카운트다운 훅과 3연타 클립을 50초 옴니버스 쇼츠 프로젝트로 즉시 패키징합니다"
                                                >
                                                    {isStitchingSeries ? (
                                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Zap className="w-3 h-3" />
                                                    )}
                                                    <span>3연타 옴니버스 제작</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


