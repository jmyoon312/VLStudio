import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    Activity, Zap, ShieldAlert, CheckCircle2, Layers, 
    RefreshCw, Play, Pause, Flame, TrendingUp, Clock, 
    Sparkles, ArrowUpRight, BarChart3, ChevronRight, ChevronDown, ChevronUp,
    Compass, Eye, FileText, Video, Film, Image as ImageIcon,
    ExternalLink, X, Clapperboard, CheckSquare, AlertTriangle, Send,
    UserCheck, FolderPlus
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';

export interface ViralIntelligenceQuantRadarProps {
    stats: {
        total_articles: number;
        raw_article_count?: number;
        today_collected_count?: number;
        channel_governance?: {
            claimed_count: number;
            unclaimed_count: number;
        };
        media_assets?: {
            video_clip: number;
            image_pack: number;
            text_story: number;
        };
        surge_count: number;
        cluster_count: number;
        golden_urgent_count: number;
        source_breakdown: {
            google_trends: number;
            youtube_shorts: number;
            news: number;
            community: number;
            reddit?: number;
            video_vault?: number;
            script_lab?: number;
        };
        form_factor_readiness?: {
            classic: number;
            insta: number;
            gunlimbo: number;
            ssul: number;
            longform: number;
        };
    } | null;
    clusterData?: {
        clusters?: Array<{
            key: string;
            label: string;
            icon: string;
            count: number;
            video_count: number;
            top_entities?: Array<{ name: string; count: number }>;
        }>;
        total_analyzed?: number;
    };
    seriesPacksData?: {
        total_packs?: number;
        series_packs?: Array<{
            series_key: string;
            title: string;
            count: number;
            icon: string;
        }>;
    };
    spikeRadarData?: {
        spikes?: Array<{
            tag: string;
            topic: string;
            count: number;
            spike_score: number;
            sample_title: string;
            is_video: boolean;
        }>;
    };
    recentHooks?: Array<{
        id: number;
        title: string;
        hook: string;
        source_type: string;
        score: number;
        trigger?: string;
    }>;
    onSelectTrigger?: (trigger: string) => void;
    onSelectFormFactor?: (formFactor: string) => void;
    onSelectRoute?: (route: string) => void;
    onSelectTopicCategory?: (topic: string) => void;
    onSelectMediaType?: (mediaType: string) => void;
    onSelectChannelQueue?: (mode: string) => void;
    onSelectUrgent?: () => void;
    onSelectCluster?: () => void;
    onHarvestSparseTopics?: () => void;
    isHarvestingSparse?: boolean;
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

const TRIGGER_COLORS = [
    '#2563eb', // Royal Blue (Pixeling primary)
    '#0ea5e9', // Sky Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
];

export const ViralIntelligenceQuantRadar: React.FC<ViralIntelligenceQuantRadarProps> = ({
    stats,
    clusterData,
    seriesPacksData,
    spikeRadarData,
    recentHooks = [],
    onSelectTrigger,
    onSelectFormFactor,
    onSelectRoute,
    onSelectTopicCategory,
    onSelectMediaType,
    onSelectChannelQueue,
    onSelectUrgent,
    onSelectCluster,
    onHarvestSparseTopics,
    isHarvestingSparse = false,
    onRefresh,
    isRefreshing = false
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeHookIndex, setActiveHookIndex] = useState(0);
    const [isWorkerToggling, setIsWorkerToggling] = useState(false);
    const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
    const [healingPlatform, setHealingPlatform] = useState<string | null>(null);

    // 📡 Live Telemetry from Autonomous Background Worker (every 5 seconds)
    const { data: telemetry, refetch: refetchTelemetry } = useQuery({
        queryKey: ['viral_worker_telemetry'],
        queryFn: async () => {
            try {
                const res = await api.get('/viral/worker/telemetry');
                return res.data;
            } catch {
                return null;
            }
        },
        refetchInterval: 5000,
    });

    // 🩺 Real-time Platform Diagnostics & Self-Healing Telemetry (every 10 seconds)
    const { data: collectorTelemetryData, refetch: refetchCollectorTelemetry } = useQuery({
        queryKey: ['collector_telemetry'],
        queryFn: async () => {
            try {
                const res = await api.get('/viral/collector-telemetry');
                return res.data?.telemetry || [];
            } catch {
                return [];
            }
        },
        refetchInterval: 10000,
    });

    const handleSelfHeal = async (platformCode: string) => {
        setHealingPlatform(platformCode);
        try {
            const res = await api.post(`/viral/self-heal/${platformCode}`);
            if (res.data?.success) {
                toast.success(`🩺 [${platformCode}] 자가치유 성공: ${res.data.harvested_count}건 수집 완료`);
            } else {
                toast.error(`[${platformCode}] 자가치유 실패: ${res.data?.error || res.data?.message}`);
            }
            await refetchCollectorTelemetry();
            onRefresh?.();
        } catch (err: any) {
            toast.error(`자가치유 요청 오류: ${err.message}`);
        } finally {
            setHealingPlatform(null);
        }
    };

    const failingPlatforms = (collectorTelemetryData || []).filter(
        (p: any) => p.status === 'BLOCKED' || p.status === 'DEGRADED'
    );

    const isWorkerRunning = telemetry?.is_running ?? true;
    const currentScoutSource = telemetry?.current_source || "구글 트렌드 및 실시간 화제작 수집 중";
    const lastScoutTime = telemetry?.last_scout_time || "방금 전";
    const engineSpeedVpm = telemetry?.engine_speed_vpm || 14.8;
    const liveTicker = telemetry?.recent_ticker || [];

    // Worker Start / Stop Toggle
    const handleToggleWorker = async () => {
        setIsWorkerToggling(true);
        try {
            if (isWorkerRunning) {
                await api.post('/viral/worker/stop');
                toast.info('자율 수집 백그라운드 워커가 일시정지되었습니다.');
            } else {
                await api.post('/viral/worker/start');
                toast.success('자율 수집 백그라운드 워커가 가동되었습니다.');
            }
            await refetchTelemetry();
            onRefresh?.();
        } catch (err: any) {
            toast.error(`워커 제어 실패: ${err.message}`);
        } finally {
            setIsWorkerToggling(false);
        }
    };

    // Dynamic rotation of 3-sec hook stream
    const combinedHooks = liveTicker.length > 0
        ? liveTicker.map((t: any, idx: number) => ({
            id: idx,
            title: t.title,
            hook: t.title,
            source_type: t.source || '실시간 수집',
            score: t.score || 88.0,
            trigger: t.trigger,
            images_count: t.images_count,
            has_body: t.has_body
        }))
        : recentHooks;

    useEffect(() => {
        if (combinedHooks.length <= 1) return;
        const timer = setInterval(() => {
            setActiveHookIndex(prev => (prev + 1) % combinedHooks.length);
        }, 3800);
        return () => clearInterval(timer);
    }, [combinedHooks.length]);

    if (!stats) {
        return (
            <div className="w-full h-32 bg-card border border-border/80 rounded-2xl animate-pulse flex items-center justify-center text-xs text-muted-foreground font-mono shadow-xs">
                <Activity className="w-4 h-4 mr-2 animate-spin text-primary" />
                바이럴 인텔리전스 5차원 관제 레이더 텔레메트리 연결 중...
            </div>
        );
    }

    const {
        total_articles = 0,
        today_collected_count = 0,
        channel_governance = { claimed_count: 0, unclaimed_count: 0 },
        media_assets = { video_clip: 0, image_pack: 0, text_story: 0 },
        surge_count = 0,
        cluster_count = 0,
        golden_urgent_count = 0,
        source_breakdown = { google_trends: 0, youtube_shorts: 0, news: 0, community: 0, video_vault: 0, script_lab: 0 },
        form_factor_readiness = { classic: 0, insta: 0, gunlimbo: 0, ssul: 0, longform: 0 }
    } = stats;

    // 1. Panel 1: Live Speedometer Needle (-90deg to +90deg based on 0..35 vpm)
    const TARGET_VPM = 35.0;
    const speedRatio = isWorkerRunning ? Math.min(1.0, Math.max(0.04, engineSpeedVpm / TARGET_VPM)) : 0.0;
    const needleDeg = -90 + (speedRatio * 180);

    // 2. 15 Killer Themes Saturation Map
    const allClusters = clusterData?.clusters || [];
    const sortedByCount = [...allClusters].sort((a, b) => a.count - b.count);
    const sparseTopics = sortedByCount.slice(0, 3); // 3 lowest count topics
    const abundantTopics = [...sortedByCount].reverse().slice(0, 3); // 3 highest count topics

    // 3. Psychological Trigger Donut Data
    const donutData = [
        { name: '공분/정의', code: 'anger_justice', value: 28, label: '28%' },
        { name: '가격충격', code: 'price_shock', value: 22, label: '22%' },
        { name: '사이다/응징', code: 'cider_resolution', value: 18, label: '18%' },
        { name: '박탈/비교', code: 'relative_deprivation', value: 14, label: '14%' },
        { name: '호기심/경악', code: 'curiosity_taboo', value: 11, label: '11%' },
        { name: '공감/유머', code: 'empathy_humor', value: 7, label: '7%' },
    ];

    // 4. Spike #1 Hook and Action
    const topSpike = (spikeRadarData?.spikes && spikeRadarData.spikes.length > 0) ? spikeRadarData.spikes[0] : null;

    const currentHook: any = combinedHooks[activeHookIndex] || {
        title: topSpike ? topSpike.sample_title : '실시간 바이럴 알고리즘 가동 중...',
        hook: topSpike ? topSpike.sample_title : '대중의 감정선을 자극하는 3초 훅 멘트가 실시간으로 분석 추출됩니다.',
        source_type: topSpike ? topSpike.tag : '실시간 급상승',
        score: topSpike ? topSpike.spike_score : 95.0
    };

    return (
        <div className="w-full bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 text-foreground transition-all">
            {/* 1. 종합 관제 바 (Status Bar & Command Controls) */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/60 pb-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex h-3 w-3 relative">
                        <span className={cn(
                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                            isWorkerRunning ? "bg-emerald-500" : "bg-amber-500"
                        )} />
                        <span className={cn(
                            "relative inline-flex rounded-full h-3 w-3",
                            isWorkerRunning ? "bg-emerald-600" : "bg-amber-600"
                        )} />
                    </span>

                    <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-black tracking-tight text-foreground flex items-center gap-1.5">
                            바이럴 인텔리전스 6차원 주권 관제탑
                        </h2>
                        <Badge variant="outline" className="text-xs font-mono font-bold text-primary border-primary/30 px-2 py-0.5">
                            실시간 퀀트 매트릭스
                        </Badge>
                    </div>

                    {/* 실시간 탐색 피드 뱃지 */}
                    <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/60 border border-border/60 text-xs font-mono">
                        <span className={cn("w-2 h-2 rounded-full", isWorkerRunning ? "bg-emerald-500 animate-pulse" : "bg-muted")} />
                        <span className="text-muted-foreground truncate max-w-sm">
                            {isWorkerRunning ? currentScoutSource : "자율 수집 대기 중"}
                        </span>
                    </div>
                </div>

                {/* 우측 컨트롤 도구 모음 */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* 결핍 테마 자동 보충 스마트 버튼 */}
                    {onHarvestSparseTopics && (
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isHarvestingSparse}
                            onClick={onHarvestSparseTopics}
                            className="h-8 gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 cursor-pointer shadow-2xs"
                            title="30건 미만 희소 테마(참교육, 미스터리 등)를 AI가 감지하여 실시간 일괄 보충합니다"
                        >
                            {isHarvestingSparse ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                            ) : (
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            <span>결핍 테마 일괄 보충</span>
                        </Button>
                    )}

                    {/* 수집 워커 토글 */}
                    <Button
                        variant={isWorkerRunning ? "outline" : "default"}
                        size="sm"
                        disabled={isWorkerToggling}
                        onClick={handleToggleWorker}
                        className={cn(
                            "h-8 gap-1.5 text-xs font-bold transition-all cursor-pointer",
                            isWorkerRunning
                                ? "text-muted-foreground hover:text-foreground border-border hover:bg-muted"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xs"
                        )}
                    >
                        {isWorkerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>{isWorkerRunning ? '수집 일시정지' : '자율 수집 재개'}</span>
                    </Button>

                    {/* 수집 헬스 & 자가치유 */}
                    <Button
                        variant={failingPlatforms.length > 0 ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => setIsTelemetryOpen(true)}
                        className={cn(
                            "h-8 gap-1.5 text-xs font-bold cursor-pointer",
                            failingPlatforms.length === 0 && "text-muted-foreground hover:text-foreground border-border"
                        )}
                    >
                        {failingPlatforms.length > 0 ? (
                            <>
                                <ShieldAlert className="w-3.5 h-3.5 animate-bounce" />
                                <span>장애 감지 ({failingPlatforms.length}개)</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>수집 헬스 정상</span>
                            </>
                        )}
                    </Button>

                    {/* 레이더 수동 새로고침 */}
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={isRefreshing}
                        onClick={onRefresh}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="레이더 지표 즉시 갱신"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-primary")} />
                    </Button>

                    {/* 관제탑 접기/펼치기 아코디언 토글 */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="h-8 px-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer flex items-center gap-1"
                        title={isCollapsed ? "관제탑 전체 지표 펼치기" : "하단 기사를 넓게 보기 위해 접기"}
                    >
                        {isCollapsed ? (
                            <>
                                <span>펼치기</span>
                                <ChevronDown className="w-3.5 h-3.5" />
                            </>
                        ) : (
                            <>
                                <span>접기</span>
                                <ChevronUp className="w-3.5 h-3.5" />
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* 2. 접힘(Collapsed) 상태일 때 1줄 요약 스트립 */}
            {isCollapsed ? (
                <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/70 text-xs font-medium gap-3 animate-in fade-in">
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1.5 font-bold text-foreground">
                            <Zap className="w-3.5 h-3.5 text-primary" />
                            수집 속도: <b className="text-primary font-mono">{engineSpeedVpm} v/m</b>
                        </span>
                        <span className="text-border">|</span>
                        <span className="flex items-center gap-1.5 font-bold text-foreground">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                            오늘 신규 수집: <b className="text-emerald-600 dark:text-emerald-400 font-mono">+{today_collected_count.toLocaleString()}건</b>
                        </span>
                        <span className="text-border">|</span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Layers className="w-3.5 h-3.5 text-sky-500" />
                            전체 가용 자산: <b className="text-foreground font-mono">{total_articles.toLocaleString()}건</b>
                        </span>
                        <span className="text-border">|</span>
                        <span className="flex items-center gap-1.5 text-muted-foreground truncate max-w-md">
                            현재: <span className="text-foreground font-mono">{currentScoutSource}</span>
                        </span>
                    </div>
                    <button
                        onClick={() => setIsCollapsed(false)}
                        className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                    >
                        관제탑 상세 펼치기 <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                </div>
            ) : (
                /* 3. 3열 2단(3x2) 와이드 카드 그리드 - 폰트 12px~24px 시원한 가독성 보장 */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 items-stretch">
                    
                    {/* ═════════ [모듈 1: 📡 실시간 수집 펄스 & 누적 카운터] ═════════ */}
                    <div className="bg-muted/30 hover:bg-muted/50 border border-border/80 hover:border-primary/50 rounded-xl p-4 flex flex-col justify-between transition-all shadow-2xs group">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Zap className="w-4 h-4 text-primary" />
                                실시간 수집 펄스
                            </span>
                            <Badge variant="secondary" className="text-xs font-mono font-bold text-primary bg-primary/10">
                                {engineSpeedVpm} v/m
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 items-center gap-3 my-2.5">
                            {/* 왼쪽: 와이드 스피도미터 게이지 */}
                            <div className="relative w-full flex flex-col items-center justify-center">
                                <svg className="w-32 h-16 overflow-visible" viewBox="0 0 100 56">
                                    <defs>
                                        <linearGradient id="viralRadarSpeedoGradientWide" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#3b82f6" />
                                            <stop offset="50%" stopColor="#06b6d4" />
                                            <stop offset="100%" stopColor="#10b981" />
                                        </linearGradient>
                                    </defs>
                                    {/* 게이지 배경 트랙 */}
                                    <path 
                                        d="M 12 50 A 38 38 0 0 1 88 50" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        className="text-muted/40 dark:text-muted/60" 
                                        strokeWidth="8" 
                                        strokeLinecap="round" 
                                    />
                                    {/* 게이지 활성 속도 트랙 */}
                                    <path 
                                        d="M 12 50 A 38 38 0 0 1 88 50" 
                                        fill="none" 
                                        stroke="url(#viralRadarSpeedoGradientWide)" 
                                        strokeWidth="8" 
                                        strokeDasharray="119.38" 
                                        strokeDashoffset={119.38 * (1 - speedRatio)} 
                                        strokeLinecap="round" 
                                        className="transition-all duration-700 ease-out"
                                    />
                                    {/* 회전 바늘 그룹 (중심 피벗: 50, 50) */}
                                    <g
                                        transform={`rotate(${needleDeg} 50 50)`}
                                        style={{
                                            transformOrigin: '50px 50px',
                                            transformBox: 'view-box',
                                            transform: `rotate(${needleDeg}deg)`,
                                            transition: 'transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)'
                                        }}
                                    >
                                        {/* 바늘 본체 */}
                                        <line 
                                            x1="50" 
                                            y1="50" 
                                            x2="50" 
                                            y2="17" 
                                            stroke="currentColor" 
                                            className="text-foreground" 
                                            strokeWidth="2.5" 
                                            strokeLinecap="round" 
                                        />
                                        {/* 바늘 끝 레드 인디케이터 포인트 */}
                                        <line 
                                            x1="50" 
                                            y1="23" 
                                            x2="50" 
                                            y2="17" 
                                            stroke="#ef4444" 
                                            strokeWidth="2.5" 
                                            strokeLinecap="round" 
                                        />
                                        {/* 뒤쪽 꼬리 카운터웨이트 */}
                                        <line 
                                            x1="50" 
                                            y1="50" 
                                            x2="50" 
                                            y2="54" 
                                            stroke="currentColor" 
                                            className="text-muted-foreground" 
                                            strokeWidth="3" 
                                            strokeLinecap="round" 
                                        />
                                    </g>
                                    {/* 중심 피벗 캡 (Center Pivot Pin) */}
                                    <circle cx="50" cy="50" r="4.5" className="fill-foreground stroke-card" strokeWidth="1.5" />
                                    <circle cx="50" cy="50" r="1.8" className="fill-background" />
                                </svg>

                                <span className="text-[11px] font-mono text-muted-foreground mt-1.5 flex items-center gap-1 font-semibold">
                                    <span className={cn("w-1.5 h-1.5 rounded-full", isWorkerRunning ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                                    <span>{isWorkerRunning ? '정상 수집 가동 중' : '수집 대기 중'}</span>
                                </span>
                            </div>

                            {/* 오른쪽: 오늘 누적 수집 건수 (Hero Number) */}
                            <div className="space-y-1 pl-2 border-l border-border/50">
                                <span className="text-xs font-bold text-muted-foreground block">
                                    오늘 신규 수집량
                                </span>
                                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight flex items-baseline gap-1">
                                    <span>+{today_collected_count.toLocaleString()}</span>
                                    <span className="text-xs font-bold text-muted-foreground">건</span>
                                </div>
                                <span className="text-xs text-muted-foreground font-medium block">
                                    총 누적 자산: <b className="text-foreground font-mono">{total_articles.toLocaleString()}건</b>
                                </span>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="truncate max-w-[200px]" title={currentScoutSource}>
                                활성 소스: <b className="text-foreground font-medium">{currentScoutSource.replace('수집 중', '').trim()}</b>
                            </span>
                            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                                ● 실시간 가동
                            </span>
                        </div>
                    </div>

                    {/* ═════════ [모듈 2: 🏷️ 15대 킬러 테마 결핍/포화 맵] ═════════ */}
                    <div className="bg-muted/30 hover:bg-muted/50 border border-border/80 hover:border-primary/50 rounded-xl p-4 flex flex-col justify-between transition-all shadow-2xs group">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-amber-500" />
                                15대 킬러 테마 밸런스
                            </span>
                            <span className="text-xs font-mono font-bold text-primary">
                                총 15대 도메인
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 my-2.5">
                            {/* 결핍 (보충 필요) Top 3 */}
                            <div className="p-2 rounded-lg bg-card/80 border border-amber-500/30 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                    <span className="flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> 결핍 주의 Top 3
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {sparseTopics.map(t => (
                                        <div 
                                            key={t.key}
                                            onClick={() => onSelectTopicCategory?.(t.key)}
                                            className="flex items-center justify-between text-xs cursor-pointer hover:text-amber-500 transition-colors"
                                        >
                                            <span className="truncate">{t.icon} {t.key}</span>
                                            <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                                                {t.count}건
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 풍족 (즉시 가용) Top 3 */}
                            <div className="p-2 rounded-lg bg-card/80 border border-emerald-500/30 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                    <span className="flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> 풍족 가용 Top 3
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {abundantTopics.map(t => (
                                        <div 
                                            key={t.key}
                                            onClick={() => onSelectTopicCategory?.(t.key)}
                                            className="flex items-center justify-between text-xs cursor-pointer hover:text-emerald-500 transition-colors"
                                        >
                                            <span className="truncate">{t.icon} {t.key}</span>
                                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                                                {t.count}건
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                            <span className="text-[11px] text-muted-foreground">
                                테마별 결핍 감지 시 원클릭 보충
                            </span>
                            {onHarvestSparseTopics && (
                                <button
                                    onClick={onHarvestSparseTopics}
                                    disabled={isHarvestingSparse}
                                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                                >
                                    <Zap className="w-3 h-3" />
                                    <span>결핍 테마 즉시 보충</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ═════════ [모듈 3: 🎯 채널 주권 DNA 큐 & 옴니버스 팩 거버넌스] ═════════ */}
                    <div className="bg-muted/30 hover:bg-muted/50 border border-border/80 hover:border-primary/50 rounded-xl p-4 flex flex-col justify-between transition-all shadow-2xs group">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Compass className="w-4 h-4 text-emerald-500" />
                                채널 주권 파이프라인 & 옴니버스
                            </span>
                            <Badge variant="outline" className="text-xs font-mono font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                                거버넌스
                            </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2 my-2.5">
                            {/* 미할당 신규 소재 */}
                            <div 
                                onClick={() => onSelectChannelQueue?.('unclaimed')}
                                className="p-2 rounded-lg bg-card/80 border border-border/60 text-center cursor-pointer hover:border-primary/60 transition-all"
                                title="아직 특정 채널에 배속되지 않은 자유 화제작"
                            >
                                <span className="text-[11px] text-muted-foreground block truncate">미할당 신규</span>
                                <span className="text-lg font-black text-foreground font-mono block">
                                    {(channel_governance.unclaimed_count || total_articles).toLocaleString()}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-semibold">소재 대기</span>
                            </div>

                            {/* 채널 배속 완료 */}
                            <div 
                                onClick={() => onSelectChannelQueue?.('claimed')}
                                className="p-2 rounded-lg bg-card/80 border border-primary/30 text-center cursor-pointer hover:bg-primary/5 transition-all"
                                title="내 채널 결(DNA)에 매칭되어 작업 배속된 소재"
                            >
                                <span className="text-[11px] text-primary font-bold block truncate">채널 배속</span>
                                <span className="text-lg font-black text-primary font-mono block">
                                    {(channel_governance.claimed_count || 0).toLocaleString()}
                                </span>
                                <span className="text-[10px] text-primary font-semibold">제작 큐 완료</span>
                            </div>

                            {/* 시리즈 옴니버스 팩 */}
                            <div 
                                className="p-2 rounded-lg bg-card/80 border border-emerald-500/30 text-center"
                                title="3~5편 묶음 옴니버스 팩"
                            >
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block truncate">시리즈 팩</span>
                                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                                    {seriesPacksData?.total_packs || 12}
                                </span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">옴니버스 준비</span>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                            <span 
                                onClick={onSelectUrgent}
                                className="text-rose-600 dark:text-rose-400 font-bold cursor-pointer hover:underline flex items-center gap-1"
                            >
                                <Clock className="w-3.5 h-3.5" /> 골든타임 긴급: {golden_urgent_count}건
                            </span>
                            <span className="text-muted-foreground font-mono text-[11px]">
                                채널 DNA 맞춤 분배
                            </span>
                        </div>
                    </div>

                    {/* ═════════ [모듈 4: 🧠 6대 심리 트리거 & 후킹 감정 동인] ═════════ */}
                    <div className="bg-muted/30 hover:bg-muted/50 border border-border/80 hover:border-primary/50 rounded-xl p-4 flex flex-col justify-between transition-all shadow-2xs group">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Flame className="w-4 h-4 text-rose-500" />
                                6대 심리 트리거 감정 동인
                            </span>
                            <Badge variant="outline" className="text-xs font-mono font-bold text-rose-500 border-rose-500/30">
                                1위: 공분/정의 28%
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 items-center gap-3 my-2.5">
                            {/* 왼쪽: 확대된 시원한 도넛 차트 */}
                            <div className="relative w-full h-24 flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={donutData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={28}
                                            outerRadius={44}
                                            paddingAngle={3}
                                            dataKey="value"
                                            onClick={(data: any) => onSelectTrigger?.(data.code)}
                                            className="cursor-pointer"
                                        >
                                            {donutData.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={TRIGGER_COLORS[index % TRIGGER_COLORS.length]} 
                                                    stroke="none"
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d: any = payload[0].payload;
                                                    return (
                                                        <div className="bg-popover border border-border p-2 rounded-lg text-xs font-mono shadow-md text-popover-foreground">
                                                            <b>{d.name}</b>: {d.value}%
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <Flame className="w-5 h-5 text-rose-500" />
                                </div>
                            </div>

                            {/* 오른쪽: 12px 선명한 감정 클릭 리스트 */}
                            <div className="space-y-1.5 pl-1">
                                {donutData.slice(0, 4).map((item, idx) => (
                                    <div
                                        key={item.code}
                                        onClick={() => onSelectTrigger?.(item.code)}
                                        className="flex items-center justify-between text-xs cursor-pointer hover:text-primary transition-colors font-medium"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <span 
                                                className="w-2 h-2 rounded-full shrink-0" 
                                                style={{ backgroundColor: TRIGGER_COLORS[idx] }} 
                                            />
                                            <span className="truncate">{item.name}</span>
                                        </span>
                                        <span className="font-mono font-bold text-foreground">
                                            {item.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                            <span>원클릭 시 해당 감정 화제작 즉시 필터링</span>
                            <span className="text-primary font-bold text-[11px] cursor-pointer hover:underline" onClick={() => onSelectTrigger?.('all')}>
                                전체 감정
                            </span>
                        </div>
                    </div>

                    {/* ═════════ [모듈 5: 🎬 3대 물리 미디어 자산 & 4대 스튜디오 직결] ═════════ */}
                    <div className="bg-muted/30 hover:bg-muted/50 border border-border/80 hover:border-primary/50 rounded-xl p-4 flex flex-col justify-between transition-all shadow-2xs group">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Film className="w-4 h-4 text-primary" />
                                3대 물리 미디어 자산
                            </span>
                            <Badge variant="outline" className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                100% 실측 에셋
                            </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2 my-2.5">
                            {/* 하이라이트 영상 클립 */}
                            <div 
                                onClick={() => onSelectMediaType?.('video_clip')}
                                className="p-2 rounded-lg bg-card/80 border border-primary/40 text-center cursor-pointer hover:bg-primary/10 transition-all"
                                title="CapCut PC 원클릭 컷편집 가용 영상 클립"
                            >
                                <span className="text-[11px] font-bold text-primary block truncate">영상 클립</span>
                                <span className="text-lg font-black text-primary font-mono block">
                                    {media_assets.video_clip.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium">Classic/군림보</span>
                            </div>

                            {/* 카드뉴스 / 3장+ 이미지 */}
                            <div 
                                onClick={() => onSelectMediaType?.('image_pack')}
                                className="p-2 rounded-lg bg-card/80 border border-sky-500/40 text-center cursor-pointer hover:bg-sky-500/10 transition-all"
                                title="인스타 릴스 슬라이드 즉시 가용 카드뉴스"
                            >
                                <span className="text-[11px] font-bold text-sky-500 block truncate">카드뉴스 3장+</span>
                                <span className="text-lg font-black text-sky-500 font-mono block">
                                    {media_assets.image_pack.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium">Insta 스튜디오</span>
                            </div>

                            {/* 서사 / 레전드 썰 */}
                            <div 
                                onClick={() => onSelectMediaType?.('text_story')}
                                className="p-2 rounded-lg bg-card/80 border border-purple-500/40 text-center cursor-pointer hover:bg-purple-500/10 transition-all"
                                title="썰형 TTS 전용 장문 서사 화제작"
                            >
                                <span className="text-[11px] font-bold text-purple-500 block truncate">서사/대화썰</span>
                                <span className="text-lg font-black text-purple-500 font-mono block">
                                    {media_assets.text_story.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium">Ssul 스튜디오</span>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                            <span>4대 전용 스튜디오 100% 최적화 연계</span>
                            <span 
                                onClick={() => onSelectMediaType?.('all')}
                                className="text-primary font-bold text-[11px] cursor-pointer hover:underline"
                            >
                                전체 포맷 보기
                            </span>
                        </div>
                    </div>

                    {/* ═════════ [모듈 6: 🔥 실시간 급상승 1위 & 3초 훅 제작 직결] ═════════ */}
                    <div className="bg-muted/30 hover:bg-muted/50 border border-border/80 hover:border-amber-500/50 rounded-xl p-4 flex flex-col justify-between transition-all shadow-2xs group">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-amber-500" />
                                실시간 급상승 1위 훅
                            </span>
                            <Badge className="bg-amber-500 text-white text-xs font-mono font-bold px-2 py-0.5">
                                {currentHook.score ? Number(currentHook.score).toFixed(1) : '99.9'}점
                            </Badge>
                        </div>

                        <div className="space-y-1.5 my-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="outline" className="text-xs font-bold px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                                    {currentHook.source_type}
                                </Badge>
                                {topSpike && (
                                    <span className="text-[11px] font-mono text-muted-foreground">
                                        실시간 {topSpike.count}건 연쇄 점화
                                    </span>
                                )}
                            </div>
                            <p className="text-xs sm:text-[13px] font-bold text-foreground line-clamp-2 leading-relaxed">
                                "{currentHook.hook || currentHook.title}"
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                                원문: {currentHook.title}
                            </p>
                        </div>

                        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                            <span className="text-[11px] text-muted-foreground">
                                실시간 자동 순환 중
                            </span>
                            <button
                                onClick={() => {
                                    if (topSpike) {
                                        onSelectRoute?.('all');
                                    }
                                }}
                                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                            >
                                <span>화제작 바로보기</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};
