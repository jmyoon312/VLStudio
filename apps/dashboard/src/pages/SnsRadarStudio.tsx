import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
    Search, Flame, Smartphone, Download, Play, CheckCircle2, 
    Loader2, ExternalLink, RefreshCw, Hash, User, Sparkles, 
    FolderDown, CheckSquare, Square, Film, ArrowRight, Eye, 
    ThumbsUp, MessageSquare, Clock, Filter, AlertCircle, Share2,
    Radio, Zap, TrendingUp, BarChart3, Layers, Globe, Activity,
    Pause, SlidersHorizontal, Laugh, Music, Lightbulb, Utensils,
    Cpu, BookOpen, Table, LayoutGrid, ShieldCheck, Check
} from 'lucide-react';
import { toast } from 'sonner';

import { 
    searchSnsTrend, 
    findOriginalByReference, 
    downloadSnsToGallery, 
    getSnsPopularPresets, 
    getSnsTelemetry,
    startSnsPatrol,
    stopSnsPatrol,
    triggerSnsPatrolNow,
    configSnsPatrol,
    batchHarvestSns,
    SnsTrendVideoItem,
    OriginalFinderResult,
    SnsTelemetry
} from '../lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const COUNTRY_OPTIONS = [
    { code: 'KR', name: '대한민국', flag: '🇰🇷' },
    { code: 'US', name: '미국/글로벌', flag: '🇺🇸' },
    { code: 'ALL', name: '글로벌 통합', flag: '🌐' },
    { code: 'JP', name: '일본', flag: '🇯🇵' },
    { code: 'TW', name: '대만/중화권', flag: '🇹🇼' },
    { code: 'VN', name: '베트남/동남아', flag: '🇻🇳' },
];

const CATEGORY_TABS = [
    { id: 'trending', label: '실시간 급상승', icon: Flame },
    { id: 'meme', label: '밈 / 코미디', icon: Laugh },
    { id: 'challenge', label: '챌린지 / 댄스', icon: Music },
    { id: 'tips', label: '꿀팁 / 라이프', icon: Lightbulb },
    { id: 'drama', label: '쇼츠드라마 / 스토리', icon: Film },
    { id: 'mukbang', label: '먹방 / 푸드', icon: Utensils },
    { id: 'tech', label: 'AI / 테크', icon: Cpu },
    { id: 'knowledge', label: '지식 / 정보', icon: BookOpen },
];

const FALLBACK_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='320' viewBox='0 0 180 320' fill='%23111827'%3E%3Crect width='180' height='320' fill='%23111827'/%3E%3Cpath d='M75 145v30l25-15-25-15z' fill='%236b7280'/%3E%3Ctext x='50%25' y='65%25' text-anchor='middle' fill='%236b7280' font-size='12' font-family='sans-serif'%3E미리보기 없음%3C/text%3E%3C/svg%3E";

export default function SnsRadarStudio() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // 1. Platform & Country & Category States
    const [platform, setPlatform] = useState<'TIKTOK' | 'INSTAGRAM' | 'ALL'>('TIKTOK');
    const [country, setCountry] = useState<string>('KR');
    const [category, setCategory] = useState<string>('trending');
    const [searchMode, setSearchMode] = useState<'CATEGORY' | 'HASHTAG' | 'CREATOR' | 'ORIGINAL_FINDER'>('CATEGORY');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'popular' | 'latest'>('popular');

    // 2. Precision Filters
    const [minViews, setMinViews] = useState<number>(0);
    const [durationFilter, setDurationFilter] = useState<'all' | 'under15' | '15to60' | 'over60'>('all');
    const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d' | '30d'>('all');
    const [minOutlier, setMinOutlier] = useState<number>(0);
    const [maxPerCreator, setMaxPerCreator] = useState<number>(1);

    // 3. View Mode State (Grid vs Table)
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // 4. Batch Harvesting State
    const [harvestLimit, setHarvestLimit] = useState<number>(100);
    const [isHarvesting, setIsHarvesting] = useState<boolean>(false);
    const [harvestProgress, setHarvestProgress] = useState<number>(0);
    const [patrolHarvestedItems, setPatrolHarvestedItems] = useState<SnsTrendVideoItem[] | null>(null);

    // 5. Original Finder States (Pixeling RE)
    const [referenceUrl, setReferenceUrl] = useState('');
    const [referenceDesc, setReferenceDesc] = useState('');
    const [originalFinderResult, setOriginalFinderResult] = useState<OriginalFinderResult | null>(null);

    // 6. Selection & Preview States
    const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
    const [previewVideo, setPreviewVideo] = useState<SnsTrendVideoItem | null>(null);

    // 7. Telemetry & Control Radar Query (10s auto-refresh)
    const { data: telemetry, refetch: refetchTelemetry } = useQuery<SnsTelemetry>({
        queryKey: ['sns-telemetry'],
        queryFn: getSnsTelemetry,
        refetchInterval: 10000,
        staleTime: 5000
    });

    // 8. Load Popular Presets
    const { data: popularPresets } = useQuery({
        queryKey: ['sns-popular-presets'],
        queryFn: getSnsPopularPresets,
        staleTime: 1000 * 60 * 30
    });

    // 9. Main Search Query & Mutation
    const searchMutation = useMutation({
        mutationFn: searchSnsTrend,
        onSuccess: (data) => {
            setSelectedVideoIds(new Set());
            if (data.items.length === 0) {
                toast.info('검색된 영상이 없습니다. 카테고리나 검색어를 변경해 보세요.');
            } else {
                toast.success(`${data.items.length}개의 최신 바이럴 영상을 수집했습니다.`);
            }
        },
        onError: (err: any) => {
            toast.error(`수집 실패: ${err?.response?.data?.detail || err.message}`);
        }
    });

    // 10. Mass Batch Harvesting Mutation
    const batchHarvestMutation = useMutation({
        mutationFn: batchHarvestSns,
        onMutate: () => {
            setIsHarvesting(true);
            setHarvestProgress(20);
        },
        onSuccess: (data) => {
            setHarvestProgress(100);
            setPatrolHarvestedItems(null);
            toast.success(`${data.harvested_count}편의 바이럴 영상을 대량 일괄 수집 완료했습니다!`);
            // Put harvested items directly into search results
            searchMutation.reset();
            refetchTelemetry();
            setTimeout(() => {
                setIsHarvesting(false);
                setHarvestProgress(0);
            }, 600);
        },
        onError: (err: any) => {
            setIsHarvesting(false);
            setHarvestProgress(0);
            toast.error(`대량 수집 실패: ${err?.response?.data?.detail || err.message}`);
        }
    });

    // 11. Original Finder Mutation
    const originalFinderMutation = useMutation({
        mutationFn: findOriginalByReference,
        onSuccess: (data) => {
            setOriginalFinderResult(data);
            if (!data.success) {
                toast.warning(data.message || '원작자를 찾지 못했습니다.');
            } else {
                toast.success(`원작자 계정 및 원본 후보 ${data.candidates?.length || 0}개를 발굴했습니다.`);
            }
        },
        onError: (err: any) => {
            toast.error(`원본 탐색 실패: ${err?.response?.data?.detail || err.message}`);
        }
    });

    // 12. Batch Download Mutation
    const downloadMutation = useMutation({
        mutationFn: (urls: string[]) => downloadSnsToGallery(urls),
        onSuccess: (data) => {
            toast.success(
                `${data.success_count}/${data.total}개 영상이 07_Downloads 및 영상 보관함에 입고되었습니다!`,
                {
                    action: {
                        label: '보관함 이동',
                        onClick: () => navigate('/gallery')
                    }
                }
            );
            setSelectedVideoIds(new Set());
            refetchTelemetry();
        },
        onError: (err: any) => {
            toast.error(`다운로드 실패: ${err?.response?.data?.detail || err.message}`);
        }
    });

    // 13. Patrol Worker Controls Mutation
    const togglePatrolMutation = useMutation({
        mutationFn: async () => {
            if (telemetry?.is_running) {
                return await stopSnsPatrol();
            } else {
                return await startSnsPatrol();
            }
        },
        onSuccess: (data) => {
            toast.success(data.message);
            refetchTelemetry();
        },
        onError: (err: any) => {
            toast.error(`순찰 제어 실패: ${err?.message}`);
        }
    });

    const triggerPatrolNowMutation = useMutation({
        mutationFn: () => triggerSnsPatrolNow({ country, category, limit: 36 }),
        onSuccess: (data) => {
            toast.success(`즉시 순찰 발진 완료: ${data.harvested_count || 0}개 수집됨`);
            refetchTelemetry();
            batchHarvestMutation.reset();
            if (data.items && data.items.length > 0) {
                setPatrolHarvestedItems(data.items);
            } else {
                setPatrolHarvestedItems(null);
                searchMutation.mutate({
                    platform,
                    country,
                    category,
                    search_type: 'TRENDING',
                    sort_order: sortOrder,
                    limit: 36,
                    force_refresh: false,
                    max_per_creator: maxPerCreator
                });
            }
        },
        onError: (err: any) => {
            toast.error(`순찰 발진 실패: ${err?.message}`);
        }
    });

    const toggleAutoDownloadMutation = useMutation({
        mutationFn: (enabled: boolean) => configSnsPatrol({ auto_download: enabled }),
        onSuccess: (data) => {
            toast.success(`5x+ 메가히트 자동 입고가 ${data.auto_download ? '활성화' : '비활성화'}되었습니다.`);
            refetchTelemetry();
        },
        onError: (err: any) => {
            toast.error(`설정 변경 실패: ${err?.message}`);
        }
    });

    // Initial search and category/country triggers (Database-First: 0.05s instant load)
    useEffect(() => {
        batchHarvestMutation.reset();
        setPatrolHarvestedItems(null);
        if (searchMode !== 'ORIGINAL_FINDER') {
            searchMutation.mutate({
                platform,
                country,
                category,
                query: searchQuery.trim(),
                search_type: searchMode === 'CATEGORY' ? 'TRENDING' : searchMode,
                sort_order: sortOrder,
                limit: 36,
                force_refresh: false,
                max_per_creator: maxPerCreator
            });
        }
    }, [platform, country, category, searchMode, sortOrder, maxPerCreator]);

    const handleSearchSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        batchHarvestMutation.reset();
        setPatrolHarvestedItems(null);
        if (searchMode === 'ORIGINAL_FINDER') {
            if (!referenceUrl.trim()) {
                toast.error('레퍼런스 영상 URL을 입력해주세요.');
                return;
            }
            originalFinderMutation.mutate({
                reference_url: referenceUrl.trim(),
                description: referenceDesc
            });
        } else {
            searchMutation.mutate({
                platform,
                country,
                category,
                query: searchQuery.trim(),
                search_type: searchMode === 'CATEGORY' ? 'TRENDING' : searchMode,
                sort_order: sortOrder,
                limit: 36,
                force_refresh: false,
                max_per_creator: maxPerCreator
            });
        }
    };

    // Filter Raw Video List with Precision Controls
    const rawList: SnsTrendVideoItem[] = useMemo(() => {
        if (searchMode === 'ORIGINAL_FINDER') {
            return originalFinderResult?.candidates || [];
        }
        if (patrolHarvestedItems && patrolHarvestedItems.length > 0) {
            return patrolHarvestedItems;
        }
        if (batchHarvestMutation.data?.items && batchHarvestMutation.data.items.length > 0) {
            return batchHarvestMutation.data.items;
        }
        return searchMutation.data?.items || [];
    }, [searchMode, originalFinderResult, patrolHarvestedItems, batchHarvestMutation.data, searchMutation.data]);

    const videoList = useMemo(() => {
        const creatorCounts: Record<string, number> = {};
        return rawList.filter((v) => {
            // Strict short-form duration guard (reject > 90s)
            if (v.duration_sec && v.duration_sec > 90) return false;

            // View count filter
            if (minViews > 0 && v.view_count < minViews) return false;

            // Duration filter
            if (durationFilter === 'under15' && v.duration_sec >= 15) return false;
            if (durationFilter === '15to60' && (v.duration_sec < 15 || v.duration_sec > 60)) return false;
            if (durationFilter === 'over60' && v.duration_sec <= 60) return false;

            // Outlier filter
            if (minOutlier > 0 && (v.outlier_ratio || 1.0) < minOutlier) return false;

            // Date filter (Strict: reject if dateFilter is set and upload_date is missing or out of window)
            if (dateFilter !== 'all') {
                if (!v.upload_date) return false;
                const nowTs = Date.now();
                const m = v.upload_date.match(/^(\d{4})(\d{2})(\d{2})/);
                if (!m) return false;
                const upTs = new Date(`${m[1]}-${m[2]}-${m[3]}`).getTime();
                const diffHours = (nowTs - upTs) / (1000 * 3600);
                if (dateFilter === '24h' && diffHours > 24) return false;
                if (dateFilter === '7d' && diffHours > 24 * 7) return false;
                if (dateFilter === '30d' && diffHours > 24 * 30) return false;
            }

            // Channel diversity filter (immediate client-side enforcement for batch / patrol / instant toggle)
            if (maxPerCreator > 0 && searchMode !== 'ORIGINAL_FINDER') {
                const handle = (v.creator_handle || v.creator_name || '').trim().toLowerCase().replace(/^@/, '');
                if (handle && handle !== 'unknown') {
                    const count = creatorCounts[handle] || 0;
                    if (count >= maxPerCreator) return false;
                    creatorCounts[handle] = count + 1;
                }
            }

            return true;
        });
    }, [rawList, minViews, durationFilter, minOutlier, dateFilter, maxPerCreator, searchMode]);

    // Live Quant Metrix Dynamic Calculations
    const liveMetrics = useMemo(() => {
        const totalHarvested = telemetry?.total_harvested_count || videoList.length;
        const avgOutlier = telemetry?.avg_outlier_ratio
            ? Math.min(10.0, Number(telemetry.avg_outlier_ratio)).toFixed(1)
            : videoList.length > 0
                ? Math.min(10.0, videoList.reduce((acc, v) => acc + Math.min(20.0, v.outlier_ratio || 1.0), 0) / videoList.length).toFixed(1)
                : "1.0";
        const megaHitRatio = telemetry?.mega_hit_ratio
            ? Number(telemetry.mega_hit_ratio).toFixed(1)
            : videoList.length > 0
                ? ((videoList.filter(v => v.view_count >= 1000000).length / videoList.length) * 100).toFixed(1)
                : "0.0";
        const hourlyVelocity = telemetry?.hourly_velocity
            ? telemetry.hourly_velocity
            : videoList.length > 0
                ? Math.round(videoList.reduce((acc, v) => acc + (v.velocity_score || 0), 0) / videoList.length)
                : 0;
        return {
            totalHarvested,
            avgOutlier,
            megaHitRatio,
            hourlyVelocity
        };
    }, [telemetry, videoList]);

    // 1-Click Studio Handoff Handlers
    const handleHandoffToScriptLab = (video: SnsTrendVideoItem) => {
        sessionStorage.setItem('vlstudio_script_lab_filter', video.title || video.video_url);
        setPreviewVideo(null);
        toast.success('대본 분석실로 영상 정보가 전달되었습니다.');
        navigate(`/script-lab?source_url=${encodeURIComponent(video.video_url)}&q=${encodeURIComponent(video.title || '')}`);
    };

    const handleHandoffToShortsBatch = (video: SnsTrendVideoItem) => {
        const batchPayload = [{
            id: `sns-${Date.now()}`,
            title: video.title,
            sourceType: 'news',
            archetype: 'gunlimbo',
            scriptLinesCount: 6,
            metadata: {
                sourceUrl: video.video_url,
                platform: video.platform,
                creator: video.creator_handle,
                thumbnail: video.thumbnail_url,
                views: video.view_count,
                outlier: video.outlier_ratio,
            }
        }];
        sessionStorage.setItem('vlstudio_batch_handoff', JSON.stringify(batchPayload));
        setPreviewVideo(null);
        toast.success('일괄 생성 허브로 프로젝트가 전달되었습니다.');
        navigate('/shorts-batch');
    };

    const handleHandoffToProEditor = (video: SnsTrendVideoItem) => {
        const proHandoffPayload = {
            title: video.title,
            aspectRatio: '9:16',
            durationMs: (video.duration_sec || 30) * 1000,
            subtitles: [
                { start: 0, end: 3, text: video.title },
                { start: 3, end: video.duration_sec || 30, text: `@${video.creator_handle} 바이럴 레퍼런스` }
            ]
        };
        sessionStorage.setItem('vlstudio_pro_editor_handoff', JSON.stringify(proHandoffPayload));
        setPreviewVideo(null);
        toast.success('전문 편집기로 레퍼런스 영상이 전달되었습니다.');
        navigate('/pro-editor');
    };

    // Live Rolling Ticker Item
    const [tickerIndex, setTickerIndex] = useState(0);
    const tickerItems = telemetry?.ticker_feed || [];
    useEffect(() => {
        if (tickerItems.length <= 1) return;
        const timer = setInterval(() => {
            setTickerIndex((prev) => (prev + 1) % tickerItems.length);
        }, 2600);
        return () => clearInterval(timer);
    }, [tickerItems.length]);
    const currentTicker = tickerItems[tickerIndex] || tickerItems[0];

    const handleToggleSelect = (vid: string) => {
        const next = new Set(selectedVideoIds);
        if (next.has(vid)) next.delete(vid);
        else next.add(vid);
        setSelectedVideoIds(next);
    };

    const handleSelectAll = () => {
        if (selectedVideoIds.size === videoList.length) {
            setSelectedVideoIds(new Set());
        } else {
            setSelectedVideoIds(new Set(videoList.map(v => v.id)));
        }
    };

    const handleDownloadSelected = () => {
        const selectedUrls = videoList
            .filter(v => selectedVideoIds.has(v.id))
            .map(v => v.video_url);

        if (selectedUrls.length === 0) {
            toast.error('다운로드할 영상을 선택해주세요.');
            return;
        }

        downloadMutation.mutate(selectedUrls);
    };

    const handleDownloadSingle = (video: SnsTrendVideoItem) => {
        downloadMutation.mutate([video.video_url]);
    };

    const formatCount = (num: number) => {
        if (!num) return '0';
        if (num >= 100000000) return `${(num / 100000000).toFixed(1)}억`;
        if (num >= 10000) return `${(num / 10000).toFixed(1)}만`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
        return num.toLocaleString();
    };

    const formatDuration = (sec: number) => {
        if (!sec) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Top Bar Header & Platform Switcher */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/80 pb-5">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="outline" className="px-2.5 py-0.5 text-xs font-bold border-primary/40 text-primary bg-primary/10">
                            Scout Agent Fleet
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
                            TikTok & Instagram 다중 소스 퀀트 관제 레이더
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
                        <Smartphone className="w-7 h-7 text-primary" />
                        SNS 바이럴 퀀트 레이더
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        TikTok 및 Instagram Reels 최신 바이럴 영상 고속 하베스팅, 원작자 추적, 07_Downloads 및 보관함(/gallery) 즉시 입고
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Platform Switcher */}
                    <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-2xl border border-border">
                        <button
                            type="button"
                            onClick={() => setPlatform('ALL')}
                            className={cn(
                                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-8 cursor-pointer",
                                platform === 'ALL' 
                                    ? "bg-foreground text-background shadow-xs font-black" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <span className="text-sm">🌐</span> 통합 전체
                        </button>
                        <button
                            type="button"
                            onClick={() => setPlatform('TIKTOK')}
                            className={cn(
                                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-8 cursor-pointer",
                                platform === 'TIKTOK' 
                                    ? "bg-primary text-primary-foreground shadow-xs" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <span className="text-sm">🎵</span> TikTok
                        </button>
                        <button
                            type="button"
                            onClick={() => setPlatform('INSTAGRAM')}
                            className={cn(
                                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-8 cursor-pointer",
                                platform === 'INSTAGRAM' 
                                    ? "bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-sm" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <span className="text-sm">📸</span> Instagram Reels
                        </button>
                    </div>

                    {/* Studio Fast Links */}
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/gallery')}
                            className="min-h-8 text-xs font-bold gap-1 border-border/80"
                        >
                            <Film className="w-3.5 h-3.5 text-blue-500" /> 보관함
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/script-lab')}
                            className="min-h-8 text-xs font-bold gap-1 border-border/80"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-purple-500" /> 대본실
                        </Button>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 1. Control Radar HUD: 실시간 자율 관제 순찰 바 & 4대 퀀트 메트릭 & 롤링 티커 */}
            {/* ========================================================================= */}
            <Card className="border border-border/80 bg-card shadow-xs overflow-hidden">
                <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* Top Radar Bar: Status & Patrol Controls */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-border/60">
                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Status Beacon Badge */}
                            <div className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-xs",
                                telemetry?.is_running 
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                    : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                            )}>
                                <span className={cn(
                                    "w-2.5 h-2.5 rounded-full animate-ping",
                                    telemetry?.is_running ? "bg-emerald-500" : "bg-amber-500"
                                )} />
                                <span>{telemetry?.is_running ? "자율 관제 순찰 가동 중" : "자율 관제 순찰 대기 중"}</span>
                            </div>

                            {/* Live Harvesting Speed Badge */}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold shadow-xs">
                                <Activity className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                                <span>수집 속도: <strong className="font-mono">{telemetry?.harvest_rate_per_min !== undefined ? telemetry.harvest_rate_per_min : "3.0"}</strong>편/분</span>
                            </div>

                            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                                현재 순찰 타겟: <strong className="text-foreground font-mono">{telemetry?.current_target || `[${country}] ${category.toUpperCase()}`}</strong>
                            </span>
                            <span className="text-xs text-muted-foreground font-medium hidden md:inline">
                                · 최근 순찰: <span className="font-mono">{telemetry?.last_patrol_time || "방금"}</span>
                            </span>
                        </div>

                        {/* Radar Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Auto-download Toggle */}
                            <button
                                type="button"
                                onClick={() => toggleAutoDownloadMutation.mutate(!telemetry?.auto_download)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all min-h-8 cursor-pointer",
                                    telemetry?.auto_download 
                                        ? "bg-indigo-600 text-white border-indigo-600" 
                                        : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                                )}
                                title="바이럴 승수 5.0x 이상 메가히트 발생 시 07_Downloads로 즉시 자동 입고"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>5x+ 메가히트 자동 입고: {telemetry?.auto_download ? "ON" : "OFF"}</span>
                            </button>

                            {/* Trigger Immediate Patrol */}
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={triggerPatrolNowMutation.isPending}
                                onClick={() => triggerPatrolNowMutation.mutate()}
                                className="min-h-8 text-xs font-bold gap-1 border-primary/40 text-primary hover:bg-primary/10"
                            >
                                {triggerPatrolNowMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                즉시 순찰 발진
                            </Button>

                            {/* Start / Stop Toggle */}
                            <Button
                                type="button"
                                size="sm"
                                disabled={togglePatrolMutation.isPending}
                                onClick={() => togglePatrolMutation.mutate()}
                                className={cn(
                                    "min-h-8 text-xs font-bold gap-1 text-white shadow-xs",
                                    telemetry?.is_running ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                                )}
                            >
                                {telemetry?.is_running ? (
                                    <>
                                        <Pause className="w-3.5 h-3.5" /> 순찰 일시정지
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-3.5 h-3.5 fill-current" /> 순찰 가동
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Live Rolling Discovery Ticker (실시간 옥석 포착 피드) */}
                    {currentTicker && (
                        <div className="flex items-center gap-3 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-amber-500/10 border border-primary/20 p-2.5 rounded-2xl">
                            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                                <Flame className="w-4 h-4 fill-amber-300 text-amber-300 animate-bounce" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 text-[11px]">
                                    <span className="font-bold text-primary flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 fill-current" /> 실시간 바이럴 탐지
                                    </span>
                                    <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px] border border-amber-500/30">
                                        +{currentTicker.outlier}x 바이럴 폭발 🔥
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-mono">{currentTicker.time}</span>
                                    {currentTicker.auto_downloaded && (
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded font-bold">
                                            자동 입고 완료
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs font-bold text-foreground truncate mt-0.5">
                                    @{currentTicker.creator}: {currentTicker.title}
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setPreviewVideo({
                                        id: currentTicker.url,
                                        platform: currentTicker.platform as any,
                                        video_url: currentTicker.url,
                                        title: currentTicker.title,
                                        creator_handle: currentTicker.creator,
                                        creator_name: currentTicker.creator,
                                        thumbnail_url: '',
                                        duration_sec: 30,
                                        view_count: currentTicker.views,
                                        like_count: Math.round(currentTicker.views / 25),
                                        comment_count: Math.round(currentTicker.views / 400),
                                        viral_score: currentTicker.views,
                                        outlier_ratio: currentTicker.outlier
                                    });
                                }}
                                className="h-7 text-[11px] font-bold shrink-0 min-h-7 border-border/80"
                            >
                                <Play className="w-3 h-3 mr-1 fill-current" /> 분석 열기
                            </Button>
                        </div>
                    )}

                    {/* 5-Box Quant Metrix HUD */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
                        <div className="p-3 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between">
                            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                                <Smartphone className="w-3.5 h-3.5 text-blue-500" /> 수집 숏폼 비디오
                            </span>
                            <div className="mt-1 flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black font-mono text-foreground">
                                    {videoList.length.toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground font-semibold">편</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-0.5 truncate" title={`현재 화면: ${videoList.length}편 (DB 누적: ${liveMetrics.totalHarvested.toLocaleString()}편)`}>
                                현재 화면 (DB 누적: {liveMetrics.totalHarvested.toLocaleString()}편)
                            </span>
                        </div>

                        <div className="p-3 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between">
                            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5 text-amber-500" /> 평균 바이럴 승수
                            </span>
                            <div className="mt-1 flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                                    {liveMetrics.avgOutlier}x
                                </span>
                                <span className="text-xs text-amber-500 font-bold">폭발</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-0.5">배치 중간값 대비 초과율</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between">
                            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 100만+ 메가히트율
                            </span>
                            <div className="mt-1 flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                                    {liveMetrics.megaHitRatio}%
                                </span>
                                <span className="text-xs text-emerald-500 font-bold">도달</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-0.5">슈퍼 바이럴 숏폼 비중</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between">
                            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                                <Activity className="w-3.5 h-3.5 text-purple-500" /> 시간당 조회수 유입
                            </span>
                            <div className="mt-1 flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
                                    {formatCount(Number(liveMetrics.hourlyVelocity))}
                                </span>
                                <span className="text-xs text-muted-foreground font-semibold">회/hr</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-0.5">편당 평균 조회수 증가 속도</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
                            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                                <Zap className="w-3.5 h-3.5 text-indigo-500" /> 분당 수집 속도
                            </span>
                            <div className="mt-1 flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                                    {telemetry?.harvest_rate_per_min !== undefined ? telemetry.harvest_rate_per_min : "3.0"}
                                </span>
                                <span className="text-xs text-muted-foreground font-semibold">편/분</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-0.5 truncate" title="지속 자율 백그라운드 엔진 수집율">
                                지속 순찰 (시간당 {(telemetry?.scan_rate_per_hour || 180).toLocaleString()}회)
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ========================================================================= */}
            {/* 2. Country Presets & 8 Sovereign Category Tabs & Search Bar               */}
            {/* ========================================================================= */}
            <Card className="border border-border/80 bg-card shadow-xs">
                <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* Country Selector Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-border/60">
                        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 mr-1">
                            <Globe className="w-3.5 h-3.5" /> 타겟 국가:
                        </span>
                        {COUNTRY_OPTIONS.map((c) => (
                            <button
                                key={c.code}
                                type="button"
                                onClick={() => setCountry(c.code)}
                                className={cn(
                                    "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-8 cursor-pointer",
                                    country === c.code 
                                        ? "bg-primary text-primary-foreground shadow-xs" 
                                        : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                            >
                                <span>{c.flag}</span>
                                <span>{c.name}</span>
                            </button>
                        ))}

                        <div className="ml-auto">
                            <Button
                                type="button"
                                variant={searchMode === 'ORIGINAL_FINDER' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSearchMode(searchMode === 'ORIGINAL_FINDER' ? 'CATEGORY' : 'ORIGINAL_FINDER')}
                                className={cn(
                                    "gap-1.5 min-h-8 text-xs font-bold cursor-pointer",
                                    searchMode === 'ORIGINAL_FINDER' 
                                        ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                                        : "text-indigo-600 dark:text-indigo-400 border-indigo-500/40"
                                )}
                            >
                                <Sparkles className="w-3.5 h-3.5" /> 🎯 원작자 정보로 원본 찾기 (픽셀링 RE)
                            </Button>
                        </div>
                    </div>

                    {/* 8 Category Tabs */}
                    {searchMode !== 'ORIGINAL_FINDER' && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {CATEGORY_TABS.map((tab) => {
                                const IconComponent = tab.icon;
                                const isActive = category === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => {
                                            setCategory(tab.id);
                                            setSearchMode('CATEGORY');
                                        }}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-8 cursor-pointer",
                                            isActive 
                                                ? "bg-primary text-primary-foreground shadow-xs" 
                                                : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                                        )}
                                    >
                                        <IconComponent className={cn("w-3.5 h-3.5", isActive ? "text-amber-300" : "text-muted-foreground")} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Search Bar Form */}
                    {searchMode !== 'ORIGINAL_FINDER' ? (
                        <form onSubmit={handleSearchSubmit} className="space-y-3 pt-1">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={`[${country}] ${category.toUpperCase()} 트렌드 검색어 또는 크리에이터(@handle), URL 직접 입력`}
                                        className="pl-9 text-xs sm:text-sm min-h-8 bg-background"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value as any)}
                                        className="bg-background border border-border rounded-lg text-xs px-3 py-2 text-foreground focus:outline-none focus:border-primary min-h-8"
                                    >
                                        <option value="popular">조회수/바이럴순</option>
                                        <option value="latest">최신 등록순</option>
                                    </select>
                                    <Button type="submit" disabled={searchMutation.isPending} className="gap-1.5 min-h-8 text-xs font-bold px-4">
                                        {searchMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                                        탐색
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={searchMutation.isPending}
                                        onClick={() => {
                                            batchHarvestMutation.reset();
                                            setPatrolHarvestedItems(null);
                                            toast.info(`[${country}] ${category.toUpperCase()} 실시간 외부 최신 수집을 가동합니다...`);
                                            searchMutation.mutate({
                                                platform,
                                                country,
                                                category,
                                                query: searchQuery.trim(),
                                                search_type: searchMode === 'CATEGORY' ? 'TRENDING' : searchMode,
                                                sort_order: sortOrder,
                                                limit: 36,
                                                force_refresh: true,
                                                max_per_creator: maxPerCreator
                                            });
                                        }}
                                        className="gap-1.5 min-h-8 text-xs font-bold px-3 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer shadow-xs"
                                        title="DB 캐시가 아닌 외부 SNS에서 지금 이 순간의 최신 영상을 실시간으로 수집합니다"
                                    >
                                        {searchMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />}
                                        <span className="hidden sm:inline">⚡ 실시간 최신 수집</span>
                                        <span className="sm:hidden">⚡ 실시간</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Popular Hashtags / Presets Chips */}
                            {popularPresets && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                                    <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                                        <Hash className="w-3 h-3 text-primary" /> 추천 키워드:
                                    </span>
                                    {((platform === 'TIKTOK' ? popularPresets?.tiktok : popularPresets?.instagram) || []).slice(0, 8).map((preset, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                setSearchQuery(preset.query);
                                                setSearchMode(preset.type === 'HASHTAG' ? 'HASHTAG' : 'CATEGORY');
                                                batchHarvestMutation.reset();
                                                setPatrolHarvestedItems(null);
                                                searchMutation.mutate({
                                                    platform,
                                                    country,
                                                    category,
                                                    query: preset.query,
                                                    search_type: preset.type === 'HASHTAG' ? 'HASHTAG' : 'CREATOR',
                                                    sort_order: sortOrder,
                                                    limit: 36,
                                                    force_refresh: false,
                                                    max_per_creator: maxPerCreator
                                                });
                                            }}
                                            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-primary/10 hover:border-primary/30 border border-border/60 transition-all cursor-pointer"
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </form>
                    ) : (
                        /* Original Finder Mode (Pixeling RE) */
                        <form onSubmit={handleSearchSubmit} className="space-y-3 pt-1">
                            <div className="p-3.5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-500/20 space-y-2.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                    <Sparkles className="w-4 h-4" />
                                    <span>픽셀링 역공학 원본 탐색 알고리즘</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    쇼츠/릴스 레퍼런스 영상의 설명란과 제목에서 원작자(@핸들)를 정규식으로 추출한 후, 원작자의 영상 중 레퍼런스와 <strong>길이(Duration 0.85~1.9배)</strong> 및 <strong>업로드 선후 관계</strong>가 일치하는 원조 영상을 점수화하여 찾아냅니다.
                                </p>
                                <div className="grid grid-cols-1 gap-2 pt-1">
                                    <Input
                                        value={referenceUrl}
                                        onChange={(e) => setReferenceUrl(e.target.value)}
                                        placeholder="레퍼런스 영상 URL (YouTube Shorts, TikTok, Instagram Reel)"
                                        className="text-xs sm:text-sm min-h-8 bg-background"
                                        required
                                    />
                                    <Input
                                        value={referenceDesc}
                                        onChange={(e) => setReferenceDesc(e.target.value)}
                                        placeholder="설명란 본문 복사 (선택사항 - @원작자 멘션이나 링크 포함 시 정확도 100% 극대화)"
                                        className="text-xs sm:text-sm min-h-8 bg-background"
                                    />
                                </div>
                                <div className="flex justify-end pt-1">
                                    <Button
                                        type="submit"
                                        disabled={originalFinderMutation.isPending}
                                        className="gap-1.5 min-h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-5 cursor-pointer"
                                    >
                                        {originalFinderMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                        원작자 정보로 원본 찾기
                                    </Button>
                                </div>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>

            {/* ========================================================================= */}
            {/* 3. Precision Filter Bar & Mass Batch Harvesting & View Mode Controls      */}
            {/* ========================================================================= */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Precision Filters */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-muted-foreground flex items-center gap-1">
                        <SlidersHorizontal className="w-3.5 h-3.5" /> 정밀 필터:
                    </span>

                    {/* View Count Filter */}
                    <select
                        value={minViews}
                        onChange={(e) => setMinViews(Number(e.target.value))}
                        className="bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 text-foreground focus:outline-none min-h-8 font-medium"
                    >
                        <option value={0}>조회수: 전체</option>
                        <option value={100000}>10만+ 회 이상</option>
                        <option value={500000}>50만+ 회 이상</option>
                        <option value={1000000}>100만+ 메가히트</option>
                        <option value={10000000}>1,000만+ 슈퍼바이럴</option>
                    </select>

                    {/* Duration Filter */}
                    <select
                        value={durationFilter}
                        onChange={(e) => setDurationFilter(e.target.value as any)}
                        className="bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 text-foreground focus:outline-none min-h-8 font-medium"
                    >
                        <option value="all">영상 길이: 전체</option>
                        <option value="under15">15초 미만 (초단기 훅)</option>
                        <option value="15to60">15초~60초 (정석 숏폼)</option>
                        <option value="over60">60초 이상 (심층 롱숏)</option>
                    </select>

                    {/* Outlier Ratio Filter */}
                    <select
                        value={minOutlier}
                        onChange={(e) => setMinOutlier(Number(e.target.value))}
                        className="bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 text-foreground focus:outline-none min-h-8 font-medium"
                    >
                        <option value={0}>바이럴 승수: 전체</option>
                        <option value={2}>2x 이상 유망주</option>
                        <option value={5}>5x 이상 급상승 🔥</option>
                        <option value={10}>10x 이상 알고리즘 폭발</option>
                    </select>

                    {/* Upload Date Filter */}
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as any)}
                        className="bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 text-foreground focus:outline-none min-h-8 font-medium"
                    >
                        <option value="all">업로드: 전체 기간</option>
                        <option value="24h">최근 24시간</option>
                        <option value="7d">최근 7일</option>
                        <option value="30d">최근 30일</option>
                    </select>

                    {/* Channel Diversity Cap Selector */}
                    <select
                        value={maxPerCreator}
                        onChange={(e) => setMaxPerCreator(Number(e.target.value))}
                        className="bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 text-foreground focus:outline-none min-h-8 font-medium"
                        title="특정 대형 채널 독점 방지: 동일 크리에이터 영상의 최대 노출 편수 (강제 규정: 채널당 1편)"
                    >
                        <option value={1}>채널당 1편만 (강제 규정 / 100% 다양성)</option>
                        <option value={2}>채널당 2편 (제한적 허용)</option>
                        <option value={0}>채널 다양성: 전체 (비권장)</option>
                    </select>
                </div>

                {/* Mass Batch Harvesting & View Mode Switcher */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Mass Harvest Batch Controls */}
                    <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl border border-border">
                        <select
                            value={harvestLimit}
                            onChange={(e) => setHarvestLimit(Number(e.target.value))}
                            className="bg-transparent text-xs font-bold px-2 py-1 text-foreground focus:outline-none"
                        >
                            <option value={100}>100편</option>
                            <option value={200}>200편</option>
                            <option value={500}>500편</option>
                        </select>
                        <Button
                            type="button"
                            size="sm"
                            disabled={isHarvesting || batchHarvestMutation.isPending}
                            onClick={() => {
                                batchHarvestMutation.mutate({
                                    platform,
                                    country,
                                    limit: harvestLimit
                                });
                            }}
                            className="h-7 text-[11px] font-bold gap-1 bg-primary text-primary-foreground shadow-xs cursor-pointer px-3"
                        >
                            {isHarvesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                            대량 하베스팅
                        </Button>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center border border-border rounded-xl p-0.5 bg-muted/40">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-1.5 rounded-lg transition-colors cursor-pointer",
                                viewMode === 'grid' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                            )}
                            title="9:16 비주얼 카드 그리드"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "p-1.5 rounded-lg transition-colors cursor-pointer",
                                viewMode === 'table' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                            )}
                            title="정밀 데이터 테이블 뷰"
                        >
                            <Table className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mass Harvest Progress Bar (Animated) */}
            {isHarvesting && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 space-y-1.5 animate-pulse">
                    <div className="flex items-center justify-between text-xs font-bold text-primary">
                        <span className="flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            [{country}] {harvestLimit}편 숏폼 바이럴 영상 대량 하베스팅 중...
                        </span>
                        <span>{harvestProgress}%</span>
                    </div>
                    <div className="w-full bg-primary/20 h-2 rounded-full overflow-hidden">
                        <div 
                            className="bg-primary h-full transition-all duration-300 rounded-full" 
                            style={{ width: `${harvestProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Active Batch Harvest / Patrol Items Banner */}
            {(patrolHarvestedItems || batchHarvestMutation.data?.items) && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/10 border border-primary/30 text-xs shadow-xs">
                    <div className="flex items-center gap-2 text-primary font-bold">
                        <Sparkles className="w-4 h-4" />
                        <span>
                            {patrolHarvestedItems ? `즉시 관제 순찰 결과 (${patrolHarvestedItems.length}편)` : `대량 하베스팅 결과 (${batchHarvestMutation.data?.items?.length || 0}편)`} 표시 중
                        </span>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            batchHarvestMutation.reset();
                            setPatrolHarvestedItems(null);
                            searchMutation.mutate({
                                platform,
                                country,
                                category,
                                query: searchQuery.trim(),
                                search_type: searchMode === 'CATEGORY' ? 'TRENDING' : searchMode,
                                sort_order: sortOrder,
                                limit: 36
                            });
                        }}
                        className="h-7 text-xs font-bold border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer"
                    >
                        <RefreshCw className="w-3 h-3 mr-1" /> 기본 피드로 복귀
                    </Button>
                </div>
            )}

            {/* Selection & Batch Actions Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleSelectAll}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors min-h-8 cursor-pointer"
                    >
                        {videoList.length > 0 && selectedVideoIds.size === videoList.length ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                            <Square className="w-4 h-4" />
                        )}
                        <span>전체 선택 ({selectedVideoIds.size}/{videoList.length})</span>
                    </button>
                    {searchMode === 'ORIGINAL_FINDER' && (
                        <Badge variant="outline" className="text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10">
                            길이 매칭 & 업로드일자 스코어링 정렬
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        size="sm"
                        disabled={selectedVideoIds.size === 0 || downloadMutation.isPending}
                        onClick={handleDownloadSelected}
                        className="gap-1.5 min-h-8 text-xs font-bold bg-primary text-primary-foreground shadow-xs cursor-pointer"
                    >
                        {downloadMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderDown className="w-3.5 h-3.5" />}
                        선택 {selectedVideoIds.size}개 07_Downloads 및 보관함 입고
                    </Button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 4. Video Display: Mode A (9:16 Visual Grid) vs Mode B (Data Table)        */}
            {/* ========================================================================= */}
            {searchMutation.isPending || originalFinderMutation.isPending ? (
                <div className="flex flex-col items-center justify-center p-20 text-muted-foreground space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm font-bold">TikTok / Instagram Reels 바이럴 영상 탐색 중...</p>
                </div>
            ) : videoList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-muted-foreground border border-dashed border-border rounded-2xl space-y-2">
                    <Smartphone className="w-8 h-8 text-muted-foreground/60" />
                    <p className="text-sm font-bold">조건에 부합하는 수집 영상이 없습니다.</p>
                    <p className="text-xs text-muted-foreground">정밀 필터 조건을 완화하거나 상단 즉시 순찰 발진을 클릭해 보세요.</p>
                </div>
            ) : viewMode === 'grid' ? (
                /* Mode A: 9:16 Poster Card Grid */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
                    {videoList.map((video) => {
                        const isSelected = selectedVideoIds.has(video.id);
                        return (
                            <div
                                key={video.id}
                                className={cn(
                                    "group relative rounded-2xl overflow-hidden border transition-all flex flex-col bg-card shadow-xs",
                                    isSelected 
                                        ? "border-primary ring-2 ring-primary/30" 
                                        : "border-border/80 hover:border-primary/40 hover:shadow-md"
                                )}
                            >
                                {/* Thumbnail Container (9:16 Aspect Ratio) */}
                                <div className="relative aspect-[9/16] bg-black/40 overflow-hidden">
                                    {video.thumbnail_url ? (
                                        <img 
                                            src={video.thumbnail_url} 
                                            alt={video.title} 
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            loading="lazy"
                                            onError={(e) => {
                                                const target = e.currentTarget;
                                                target.onerror = null;
                                                target.src = FALLBACK_POSTER;
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-muted">
                                            <Film className="w-8 h-8 text-muted-foreground/40" />
                                        </div>
                                    )}

                                    {/* Selection Checkbox (Top Left) */}
                                    <div 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleSelect(video.id);
                                        }}
                                        className="absolute top-2 left-2 z-10 cursor-pointer bg-black/60 backdrop-blur-xs p-1 rounded-lg hover:bg-black/80 transition-colors"
                                    >
                                        {isSelected ? (
                                            <CheckSquare className="w-4 h-4 text-primary" />
                                        ) : (
                                            <Square className="w-4 h-4 text-white/80" />
                                        )}
                                    </div>

                                    {/* Platform Badge (Top Right) */}
                                    <div className="absolute top-2 right-2 z-10">
                                        <Badge className={cn(
                                            "text-[10px] px-1.5 py-0.5 font-bold shadow-xs",
                                            video.platform === 'TIKTOK' 
                                                ? "bg-primary text-primary-foreground" 
                                                : "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                                        )}>
                                            {video.platform === 'TIKTOK' ? 'TikTok' : 'Reels'}
                                        </Badge>
                                    </div>

                                    {/* Outlier Ratio Badge (Bottom Left) */}
                                    {video.outlier_ratio && (
                                        <div className="absolute bottom-2 left-2 z-10 bg-amber-500 text-amber-950 px-1.5 py-0.5 rounded text-[10px] font-black shadow-xs">
                                            {Math.min(20.0, Number(video.outlier_ratio || 1.0)).toFixed(1)}x 🔥
                                        </div>
                                    )}

                                    {/* Duration Badge (Bottom Right) */}
                                    <div className="absolute bottom-2 right-2 z-10 bg-black/75 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                                        {formatDuration(video.duration_sec)}
                                    </div>

                                    {/* Play Overlay Button */}
                                    <div 
                                        onClick={() => setPreviewVideo(video)}
                                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 cursor-pointer"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-background/90 text-foreground flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
                                            <Play className="w-4 h-4 fill-current ml-0.5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Video Info Body */}
                                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                                    <div>
                                        <p className="text-xs font-semibold line-clamp-2 leading-snug group-hover:text-primary transition-colors" title={video.title}>
                                            {video.title}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground truncate mt-1 flex items-center gap-1 font-mono">
                                            <span>@{video.creator_handle || 'creator'}</span>
                                        </p>
                                        {video.reason && (
                                            <p className="text-[10px] text-amber-600 dark:text-amber-400 truncate mt-0.5 font-bold">
                                                {video.reason}
                                            </p>
                                        )}
                                    </div>

                                    {/* Metrics & Actions */}
                                    <div className="pt-2 border-t border-border/60 space-y-2">
                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                                            <span className="flex items-center gap-1" title="조회수">
                                                <Eye className="w-3 h-3 text-blue-500" /> {formatCount(video.view_count)}
                                            </span>
                                            <span className="flex items-center gap-1" title="좋아요수">
                                                <ThumbsUp className="w-3 h-3 text-pink-500" /> {formatCount(video.like_count)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 pt-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDownloadSingle(video)}
                                                disabled={downloadMutation.isPending}
                                                className="w-full min-h-8 text-[11px] font-bold gap-1 py-1 px-2 border-border/80 hover:bg-primary/10 hover:text-primary hover:border-primary/40 cursor-pointer"
                                            >
                                                <Download className="w-3 h-3" /> 보관함 입고
                                            </Button>
                                            <a
                                                href={video.video_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                                                title="원문 열기"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Mode B: Data Table View */
                <Card className="border border-border/80 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold">
                                <tr>
                                    <th className="p-3 w-10 text-center">선택</th>
                                    <th className="p-3 w-16">썸네일</th>
                                    <th className="p-3">제목 및 크리에이터</th>
                                    <th className="p-3 w-24">플랫폼</th>
                                    <th className="p-3 w-24 text-right">조회수</th>
                                    <th className="p-3 w-20 text-right">좋아요</th>
                                    <th className="p-3 w-24 text-center">바이럴 승수</th>
                                    <th className="p-3 w-20 text-center">길이</th>
                                    <th className="p-3 w-32 text-center">작업</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {videoList.map((video) => {
                                    const isSelected = selectedVideoIds.has(video.id);
                                    return (
                                        <tr 
                                            key={video.id} 
                                            className={cn(
                                                "hover:bg-muted/40 transition-colors",
                                                isSelected && "bg-primary/5"
                                            )}
                                        >
                                            <td className="p-3 text-center">
                                                <input 
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleSelect(video.id)}
                                                    className="rounded border-border text-primary cursor-pointer"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <div 
                                                    onClick={() => setPreviewVideo(video)}
                                                    className="w-12 h-16 rounded-lg bg-black overflow-hidden relative cursor-pointer group"
                                                >
                                                    {video.thumbnail_url ? (
                                                        <img 
                                                            src={video.thumbnail_url} 
                                                            alt="" 
                                                            referrerPolicy="no-referrer"
                                                            className="w-full h-full object-cover" 
                                                            loading="lazy"
                                                            onError={(e) => {
                                                                const target = e.currentTarget;
                                                                target.onerror = null;
                                                                target.src = FALLBACK_POSTER;
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-muted">
                                                            <Film className="w-4 h-4 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <Play className="w-3.5 h-3.5 fill-white text-white" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <p className="font-bold text-foreground line-clamp-1 hover:text-primary cursor-pointer" onClick={() => setPreviewVideo(video)}>
                                                    {video.title}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                                    @{video.creator_handle}
                                                </p>
                                                {video.reason && (
                                                    <span className="inline-block mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                                                        {video.reason}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <Badge variant="outline" className={cn(
                                                    "text-[10px]",
                                                    video.platform === 'TIKTOK' 
                                                        ? "border-primary/40 text-foreground" 
                                                        : "border-pink-500 text-pink-600 dark:text-pink-400"
                                                )}>
                                                    {video.platform}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-right font-mono font-bold">
                                                {formatCount(video.view_count)}
                                            </td>
                                            <td className="p-3 text-right font-mono text-muted-foreground">
                                                {formatCount(video.like_count)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="font-black font-mono text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                                                    {Math.min(20.0, Number(video.outlier_ratio || 1.0)).toFixed(1)}x
                                                </span>
                                            </td>
                                            <td className="p-3 text-center font-mono text-muted-foreground">
                                                {formatDuration(video.duration_sec)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDownloadSingle(video)}
                                                        disabled={downloadMutation.isPending}
                                                        className="h-7 text-[11px] font-bold px-2 border-border/80 hover:bg-primary hover:text-primary-foreground cursor-pointer"
                                                    >
                                                        <Download className="w-3 h-3 mr-1" /> 입고
                                                    </Button>
                                                    <a
                                                        href={video.video_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1.5 rounded-lg border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                                        title="원문 열기"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* ========================================================================= */}
            {/* 5. Video Detail & 1-Click Studio Handoff Modal                            */}
            {/* ========================================================================= */}
            <Dialog open={!!previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)}>
                <DialogContent className="max-w-lg p-6 bg-card border border-border">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold line-clamp-1">
                            {previewVideo?.title}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            @{previewVideo?.creator_handle} · {previewVideo?.platform} · {previewVideo?.reason}
                        </DialogDescription>
                    </DialogHeader>
                    {previewVideo && (
                        <div className="space-y-4 pt-2">
                            {/* Preview Thumbnail Box */}
                            <div className="aspect-[9/16] bg-black rounded-2xl overflow-hidden relative max-h-[380px] mx-auto border border-border/80">
                                {previewVideo.thumbnail_url ? (
                                    <img 
                                        src={previewVideo.thumbnail_url} 
                                        alt={previewVideo.title} 
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        onError={(e) => {
                                            const target = e.currentTarget;
                                            target.onerror = null;
                                            target.src = FALLBACK_POSTER;
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Film className="w-12 h-12 text-muted-foreground/40" />
                                    </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                    <a
                                        href={previewVideo.video_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-background/90 text-foreground font-bold text-xs shadow-lg hover:scale-105 transition-transform cursor-pointer"
                                    >
                                        <Play className="w-4 h-4 fill-current" /> 원본 영상 열기 <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>

                            {/* Quant Metrics Grid */}
                            <div className="grid grid-cols-4 gap-2 text-center py-2.5 bg-muted/40 rounded-xl border border-border/60">
                                <div>
                                    <span className="block text-[10px] text-muted-foreground">조회수</span>
                                    <span className="font-bold text-xs font-mono">{formatCount(previewVideo.view_count)}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-muted-foreground">좋아요</span>
                                    <span className="font-bold text-xs font-mono">{formatCount(previewVideo.like_count)}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-muted-foreground">바이럴 승수</span>
                                    <span className="font-black text-xs font-mono text-amber-500">{previewVideo.outlier_ratio || "1.0"}x</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-muted-foreground">영상 길이</span>
                                    <span className="font-bold text-xs font-mono">{formatDuration(previewVideo.duration_sec)}</span>
                                </div>
                            </div>

                            {/* 4-Way 1-Click Studio Handoff Actions */}
                            <div className="space-y-2 pt-1">
                                <Button
                                    type="button"
                                    className="w-full gap-2 min-h-9 text-xs font-bold bg-primary text-primary-foreground cursor-pointer shadow-xs"
                                    onClick={() => {
                                        handleDownloadSingle(previewVideo);
                                        setPreviewVideo(null);
                                    }}
                                >
                                    <Download className="w-4 h-4" /> 07_Downloads 및 영상 보관함(/gallery) 즉시 입고
                                </Button>

                                <div className="grid grid-cols-3 gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="min-h-8 text-xs font-bold border-border/80 hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
                                        onClick={() => handleHandoffToScriptLab(previewVideo)}
                                    >
                                        대본 분석실
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="min-h-8 text-xs font-bold border-border/80 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                                        onClick={() => handleHandoffToShortsBatch(previewVideo)}
                                    >
                                        일괄 생성 허브
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="min-h-8 text-xs font-bold border-border/80 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                                        onClick={() => handleHandoffToProEditor(previewVideo)}
                                    >
                                        전문 편집기
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
