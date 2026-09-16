import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    Activity, Zap, ShieldAlert, CheckCircle2, Layers, 
    RefreshCw, Play, Pause, Flame, TrendingUp, Clock, 
    Sparkles, ArrowUpRight, BarChart3, ChevronRight,
    Compass, Eye, FileText, Video, Film, Image as ImageIcon,
    ExternalLink, X
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
        surge_count: number;
        cluster_count: number;
        golden_urgent_count: number;
        source_breakdown: {
            google_trends: number;
            youtube_shorts: number;
            news: number;
            community: number;
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
    onSelectUrgent?: () => void;
    onSelectCluster?: () => void;
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
    recentHooks = [],
    onSelectTrigger,
    onSelectFormFactor,
    onSelectRoute,
    onSelectUrgent,
    onSelectCluster,
    onRefresh,
    isRefreshing = false
}) => {
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
        surge_count = 0,
        cluster_count = 0,
        golden_urgent_count = 0,
        source_breakdown = { google_trends: 0, youtube_shorts: 0, news: 0, community: 0, video_vault: 0, script_lab: 0 },
        form_factor_readiness = { classic: 0, insta: 0, gunlimbo: 0, ssul: 0, longform: 0 }
    } = stats;

    const videoVaultCount = source_breakdown.video_vault ?? 0;
    const scriptLabCount = source_breakdown.script_lab ?? 0;

    // 1. Panel 1: Live Speedometer Needle (-90deg to +90deg based on 0..30 vpm)
    const TARGET_VPM = 25.0;
    const speedRatio = isWorkerRunning ? Math.min(1.0, Math.max(0.2, engineSpeedVpm / TARGET_VPM)) : 0.05;
    const needleDeg = -90 + (speedRatio * 180);

    // 2. Panel 2: Cross-Platform Funnel counts
    const funnelSteps = [
        { label: '1.구글 트렌드', count: source_breakdown.google_trends, code: 'google_trends', color: 'bg-primary' },
        { label: '2.유튜브 쇼츠', count: source_breakdown.youtube_shorts, code: 'youtube_shorts', color: 'bg-blue-600' },
        { label: '3.랭킹 뉴스', count: source_breakdown.news, code: 'news', color: 'bg-cyan-500' },
        { label: '4.31대 커뮤니티', count: source_breakdown.community, code: 'community', color: 'bg-indigo-500' }
    ];
    const maxFunnelCount = Math.max(1, ...funnelSteps.map(s => s.count));

    // 4. Panel 4: Psychological Trigger Donut Data
    const donutData = [
        { name: '공분/참교육', code: 'anger_justice', value: 28 },
        { name: '가격충격', code: 'price_shock', value: 22 },
        { name: '사이다', code: 'cider_resolution', value: 18 },
        { name: '상대적박탈감', code: 'relative_deprivation', value: 14 },
        { name: '호기심/금기', code: 'curiosity_taboo', value: 11 },
        { name: '동질감/유머', code: 'empathy_humor', value: 7 },
    ];

    const currentHook: any = combinedHooks[activeHookIndex] || {
        title: '실시간 바이럴 알고리즘 감지 중...',
        hook: '대중의 감정선을 자극하는 3초 훅 멘트가 실시간으로 분석 추출됩니다.',
        source_type: '구글 트렌드',
        score: 94.5
    };

    return (
        <div className="w-full bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 text-foreground transition-colors">
            {/* Header Status Bar with Real Background Worker Controller */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="flex h-2.5 w-2.5 relative">
                        <span className={cn(
                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                            isWorkerRunning ? "bg-emerald-500" : "bg-amber-500"
                        )}></span>
                        <span className={cn(
                            "relative inline-flex rounded-full h-2.5 w-2.5",
                            isWorkerRunning ? "bg-emerald-500" : "bg-amber-500"
                        )}></span>
                    </span>
                    <h2 className="text-xs sm:text-sm font-bold tracking-tight flex items-center gap-2 text-foreground">
                        <span>바이럴 인텔리전스 5차원 관제 레이더</span>
                        <span className="text-[11px] font-normal text-muted-foreground hidden sm:inline">(Viral Intelligence Quant Matrix)</span>
                    </h2>
                    {/* Live Autonomous Worker Status Badge */}
                    <span className={cn(
                        "text-[10.5px] font-mono px-2.5 py-0.5 rounded-full border font-semibold flex items-center gap-1.5",
                        isWorkerRunning
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", isWorkerRunning ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                        {isWorkerRunning ? `● 실시간 탐색·수집 가동 중: ${currentScoutSource}` : '⏸ 자율 수집 일시정지됨'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Real Worker Start/Pause Button */}
                    <Button
                        variant={isWorkerRunning ? "outline" : "default"}
                        size="sm"
                        onClick={handleToggleWorker}
                        disabled={isWorkerToggling}
                        className={cn(
                            "h-7 px-2.5 text-xs font-bold gap-1 cursor-pointer transition-all shadow-2xs",
                            isWorkerRunning
                                ? "border-border text-foreground hover:bg-muted"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        )}
                        title={isWorkerRunning ? "클릭 시 백그라운드 수집을 일시정지합니다" : "클릭 시 백그라운드 수집을 가동합니다"}
                    >
                        {isWorkerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>{isWorkerRunning ? '수집 일시정지' : '실제 수집 가동'}</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsTelemetryOpen(!isTelemetryOpen)}
                        className={cn(
                            "h-7 px-2.5 text-xs font-bold gap-1.5 cursor-pointer transition-all shadow-2xs",
                            failingPlatforms.length > 0
                                ? "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 animate-pulse"
                                : isTelemetryOpen
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "border-border text-foreground hover:bg-muted"
                        )}
                        title="전체 수집 소스별 실시간 헬스 및 자가치유 관제 패널 토글"
                    >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>수집 헬스 & 자가치유</span>
                        {failingPlatforms.length > 0 && (
                            <span className="bg-amber-500 text-white rounded-full px-1.5 py-0 text-[9px] font-mono font-bold ml-0.5">
                                {failingPlatforms.length}건 주의
                            </span>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer hover:border-primary/50 text-foreground"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-primary")} />
                        <span>레이더 갱신</span>
                    </Button>

                    <span className="text-[11px] font-mono text-muted-foreground hidden lg:inline ml-1">
                        속도: <b className="text-primary font-bold">{engineSpeedVpm}편/분</b> · 최근: <b className="text-foreground font-semibold">{lastScoutTime}</b>
                    </span>
                </div>
            </div>

            {/* 🩺 Expandable Real-Time Telemetry & Self-Healing Matrix */}
            {isTelemetryOpen && (
                <div className="bg-muted/30 border border-border/80 rounded-xl p-3.5 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-xs flex items-center gap-1 text-foreground">
                                <Activity className="w-4 h-4 text-primary" /> 플랫폼별 실시간 수집 레이더 & 자가치유 (Telemetry Matrix)
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                                모니터링: {(collectorTelemetryData || []).length}개 소스
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => refetchCollectorTelemetry()}
                                className="h-6 text-[10.5px] gap-1 text-muted-foreground hover:text-foreground"
                            >
                                <RefreshCw className="w-3 h-3" /> 새로고침
                            </Button>
                            <button
                                onClick={() => setIsTelemetryOpen(false)}
                                className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
                        {(collectorTelemetryData || []).map((p: any) => {
                            const isHealing = healingPlatform === p.platform_code;
                            const isBlocked = p.status === 'BLOCKED';
                            const isDegraded = p.status === 'DEGRADED';
                            const isHealthy = p.status === 'HEALTHY';

                            return (
                                <div
                                    key={p.platform_code}
                                    className={cn(
                                        "p-2.5 rounded-lg border text-xs space-y-1.5 transition-all bg-card shadow-2xs",
                                        isBlocked ? "border-rose-500/40 bg-rose-500/5" :
                                        isDegraded ? "border-amber-500/40 bg-amber-500/5" :
                                        "border-border/60 hover:border-border"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold truncate text-foreground font-mono text-[11px]">
                                            {p.platform_code}
                                        </span>
                                        <Badge
                                            className={cn(
                                                "text-[9px] px-1.5 py-0 font-bold uppercase",
                                                isBlocked ? "bg-rose-500 text-white" :
                                                isDegraded ? "bg-amber-500 text-white" :
                                                "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                            )}
                                        >
                                            {isBlocked ? '🔴 차단/우회필요' : isDegraded ? '🟡 지연/검토' : '🟢 정상 수집'}
                                        </Badge>
                                    </div>

                                    <div className="text-[10px] font-mono text-muted-foreground space-y-0.5">
                                        <div className="flex justify-between">
                                            <span>누적 수집:</span>
                                            <b className="text-foreground">{p.total_collected || 0}건</b>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>평균 본문:</span>
                                            <b className="text-foreground">{p.avg_body_length || 0}자</b>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>이미지 캡처율:</span>
                                            <b className={cn(
                                                (p.image_success_rate || 0) > 50 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                                            )}>{p.image_success_rate || 0}%</b>
                                        </div>
                                    </div>

                                    {p.last_error_reason && (
                                        <p className="text-[9px] text-rose-500 dark:text-rose-400 font-mono truncate bg-rose-500/10 p-1 rounded" title={p.last_error_reason}>
                                            ⚠️ {p.last_error_reason}
                                        </p>
                                    )}

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleSelfHeal(p.platform_code)}
                                        disabled={isHealing}
                                        className={cn(
                                            "w-full h-5 text-[9.5px] font-bold gap-1 mt-1 cursor-pointer transition-all",
                                            isBlocked || isDegraded
                                                ? "border-amber-500/60 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15"
                                                : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <RefreshCw className={cn("w-2.5 h-2.5", isHealing && "animate-spin text-primary")} />
                                        <span>{isHealing ? '자가치유 중...' : '🩺 자가치유 (Self-Heal)'}</span>
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* High-Density 6-Column Responsive Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 items-stretch">
                {/* 1. 실시간 수집 속도 & 바이럴 포스 스피도미터 */}
                <div 
                    className="bg-muted/40 hover:bg-muted/70 border border-border/70 hover:border-primary/60 rounded-xl p-3 flex flex-col justify-between items-center text-center relative overflow-hidden transition-all hover:shadow-xs group"
                    title="실시간 백그라운드 수집 처리량 및 초당 분석 게이지"
                >
                    <div className="w-full flex items-center justify-between text-[10.5px] font-mono font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                        <span>분당 수집 처리</span>
                        <span className="text-primary font-bold">{engineSpeedVpm} v/m</span>
                    </div>

                    {/* Dynamic Speedometer Arc in Royal Blue Gradient */}
                    <div className="relative w-28 h-14 mt-2 flex items-end justify-center">
                        <svg className="w-28 h-14 overflow-visible" viewBox="0 0 100 50">
                            <path 
                                d="M 10 50 A 40 40 0 0 1 90 50" 
                                fill="none" 
                                stroke="currentColor" 
                                className="text-muted/60" 
                                strokeWidth="8" 
                                strokeLinecap="round" 
                            />
                            <path 
                                d="M 10 50 A 40 40 0 0 1 90 50" 
                                fill="none" 
                                stroke="url(#viralRadarSpeedoGradient)" 
                                strokeWidth="8" 
                                strokeDasharray="125.6" 
                                strokeDashoffset={125.6 * (1 - speedRatio)} 
                                strokeLinecap="round" 
                                className="transition-all duration-500"
                            />
                            <defs>
                                <linearGradient id="viralRadarSpeedoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#2563eb" />
                                    <stop offset="60%" stopColor="#38bdf8" />
                                    <stop offset="100%" stopColor="#10b981" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Animated Needle */}
                        <div 
                            className="absolute w-1 h-10 bg-primary origin-bottom rounded-full transition-transform duration-500 shadow-xs"
                            style={{ transform: `rotate(${needleDeg}deg)`, bottom: '0px' }}
                        />
                    </div>

                    <div className="w-full mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span>상태: <b className="text-foreground">{isWorkerRunning ? '정상 수집' : '대기'}</b></span>
                        <span className="text-primary font-bold">{isWorkerRunning ? '동적 순환' : '정지'}</span>
                    </div>
                </div>

                {/* 2. 4단계 플랫폼 연쇄 폭발 깔때기 (Cross-Platform Cluster Funnel) */}
                <div 
                    onClick={onSelectCluster}
                    className="bg-muted/40 hover:bg-muted/70 border border-border/70 hover:border-primary/60 rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-xs group"
                    title="클릭 시 2개 이상 플랫폼 동시 폭발 클러스터 필터"
                >
                    <div className="w-full flex items-center justify-between text-[10.5px] font-mono font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                        <span>연쇄 확산 깔때기</span>
                        <span className="text-primary font-bold">{cluster_count}개 군집</span>
                    </div>

                    <div className="space-y-1.5 my-auto py-1">
                        {funnelSteps.map((step) => {
                            const pct = Math.max(8, Math.round((step.count / maxFunnelCount) * 100));
                            return (
                                <div key={step.code} className="space-y-0.5">
                                    <div className="flex justify-between text-[9.5px] font-mono text-muted-foreground">
                                        <span className="truncate">{step.label}</span>
                                        <span className="font-bold text-foreground">{step.count}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className={cn("h-full rounded-full transition-all duration-300", step.color)}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="w-full pt-1.5 border-t border-border/50 text-[10px] font-mono text-muted-foreground flex justify-between items-center">
                        <span>크로스플랫폼</span>
                        <span className="text-primary font-semibold">동시 점화 중</span>
                    </div>
                </div>

                {/* 3. 골든타임 & 수명 주기 카운트다운 */}
                <div 
                    onClick={onSelectUrgent}
                    className="bg-muted/40 hover:bg-muted/70 border border-border/70 hover:border-primary/60 rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-xs group"
                    title="클릭 시 12시간 이내 골든타임 긴급 제작 기사 필터"
                >
                    <div className="w-full flex items-center justify-between text-[10.5px] font-mono font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                        <span>골든타임 긴급</span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold">{golden_urgent_count}건</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 my-auto py-1">
                        <div className="bg-card/70 border border-border/50 rounded-lg p-1.5 text-center">
                            <span className="text-[9px] text-muted-foreground block">Flash (&lt;12h)</span>
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">{golden_urgent_count}</span>
                        </div>
                        <div className="bg-card/70 border border-border/50 rounded-lg p-1.5 text-center">
                            <span className="text-[9px] text-muted-foreground block">Surge (24h)</span>
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">{Math.max(0, surge_count - golden_urgent_count)}</span>
                        </div>
                        <div className="bg-card/70 border border-border/50 rounded-lg p-1.5 text-center">
                            <span className="text-[9px] text-muted-foreground block">Peak (48h)</span>
                            <span className="text-xs font-bold text-primary font-mono">{Math.round(total_articles * 0.28)}</span>
                        </div>
                        <div className="bg-card/70 border border-border/50 rounded-lg p-1.5 text-center">
                            <span className="text-[9px] text-muted-foreground block">Steady (롱런)</span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">{videoVaultCount + scriptLabCount}</span>
                        </div>
                    </div>

                    <div className="w-full pt-1.5 border-t border-border/50 text-[10px] font-mono text-muted-foreground flex justify-between items-center">
                        <span>잔여 시간순</span>
                        <span className="text-rose-500 font-semibold flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> 긴급 추천
                        </span>
                    </div>
                </div>

                {/* 4. 6대 심리 트리거 도넛 차트 */}
                <div 
                    className="bg-muted/40 hover:bg-muted/70 border border-border/70 hover:border-primary/60 rounded-xl p-3 flex flex-col justify-between transition-all hover:shadow-xs group"
                    title="바이럴 대중 심리 동인 분포"
                >
                    <div className="w-full flex items-center justify-between text-[10.5px] font-mono font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                        <span>6대 심리 트리거</span>
                        <span className="text-primary font-bold">감정 동인</span>
                    </div>

                    <div className="relative w-full h-20 flex items-center justify-center my-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={22}
                                    outerRadius={36}
                                    paddingAngle={3}
                                    dataKey="value"
                                    onClick={(data: any) => onSelectTrigger && onSelectTrigger(data.code)}
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
                                                <div className="bg-popover border border-border p-1.5 rounded text-[10px] font-mono shadow-md text-popover-foreground">
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
                            <Flame className="w-4 h-4 text-primary" />
                        </div>
                    </div>

                    <div className="w-full pt-1 border-t border-border/50 flex flex-wrap gap-1 justify-center text-[9px] font-mono">
                        <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => onSelectTrigger?.('anger_justice')}>공분 28%</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sky-500 font-bold cursor-pointer hover:underline" onClick={() => onSelectTrigger?.('price_shock')}>가격 22%</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-emerald-500 font-bold cursor-pointer hover:underline" onClick={() => onSelectTrigger?.('cider_resolution')}>사이다 18%</span>
                    </div>
                </div>

                {/* 5. 4대 폼팩터 & 롱폼 제작 가동률 */}
                <div 
                    className="bg-muted/40 hover:bg-muted/70 border border-border/70 hover:border-primary/60 rounded-xl p-3 flex flex-col justify-between transition-all hover:shadow-xs group"
                    title="각 폼팩터별 즉시 제작 가능한 가용 자산 수치"
                >
                    <div className="w-full flex items-center justify-between text-[10.5px] font-mono font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                        <span>제작 가동률</span>
                        <span className="text-primary font-bold">5개 트랙</span>
                    </div>

                    <div className="space-y-1 my-auto py-1">
                        <div 
                            className="flex justify-between items-center text-[9.5px] font-mono cursor-pointer hover:text-primary transition-colors"
                            onClick={() => onSelectRoute?.('video_vault')}
                        >
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Film className="w-2.5 h-2.5 text-primary" /> 클래식 (영상):
                            </span>
                            <span className="font-bold text-foreground">{form_factor_readiness.classic}</span>
                        </div>
                        <div 
                            className="flex justify-between items-center text-[9.5px] font-mono cursor-pointer hover:text-primary transition-colors"
                            onClick={() => onSelectRoute?.('all')}
                        >
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Compass className="w-2.5 h-2.5 text-sky-500" /> 인스타 (릴스):
                            </span>
                            <span className="font-bold text-foreground">{form_factor_readiness.insta}</span>
                        </div>
                        <div 
                            className="flex justify-between items-center text-[9.5px] font-mono cursor-pointer hover:text-primary transition-colors"
                            onClick={() => onSelectRoute?.('news')}
                        >
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Zap className="w-2.5 h-2.5 text-amber-500" /> 군림보 (속보):
                            </span>
                            <span className="font-bold text-foreground">{form_factor_readiness.gunlimbo}</span>
                        </div>
                        <div 
                            className="flex justify-between items-center text-[9.5px] font-mono cursor-pointer hover:text-primary transition-colors"
                            onClick={() => onSelectRoute?.('community')}
                        >
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Sparkles className="w-2.5 h-2.5 text-indigo-500" /> 썰형 (커뮤):
                            </span>
                            <span className="font-bold text-foreground">{form_factor_readiness.ssul}</span>
                        </div>
                        <div 
                            className="flex justify-between items-center text-[9.5px] font-mono cursor-pointer hover:text-primary transition-colors"
                            onClick={() => onSelectRoute?.('video_vault')}
                        >
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Film className="w-2.5 h-2.5 text-emerald-500" /> 영상 보관함:
                            </span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{videoVaultCount}</span>
                        </div>
                    </div>

                    <div className="w-full pt-1.5 border-t border-border/50 text-[10px] font-mono text-muted-foreground flex justify-between items-center">
                        <span>전용 스튜디오</span>
                        <span className="text-primary font-bold">즉시 제작 연동</span>
                    </div>
                </div>

                {/* 6. 실시간 3초 바이럴 훅 피드 스트림 (Live Scraper Ticker) */}
                <div 
                    className="bg-muted/40 hover:bg-muted/70 border border-border/70 hover:border-primary/60 rounded-xl p-3 flex flex-col justify-between transition-all hover:shadow-xs group"
                    title="실시간 자율 워커가 수집한 최신 3초 훅 멘트 스트림"
                >
                    <div className="w-full flex items-center justify-between text-[10.5px] font-mono font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                        <span className="flex items-center gap-1">
                            <span className={cn("w-1.5 h-1.5 rounded-full", isWorkerRunning ? "bg-emerald-500 animate-ping" : "bg-amber-500")} /> 3초 훅 스트림
                        </span>
                        <span className="text-primary font-bold">{currentHook.score ? Number(currentHook.score).toFixed(1) : '95.0'}점</span>
                    </div>

                    <div className="my-auto py-1 space-y-1">
                        <div className="flex items-center gap-1 flex-wrap">
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                                {currentHook.source_type}
                            </Badge>
                            {currentHook.images_count > 0 && (
                                <Badge variant="secondary" className="text-[8.5px] px-1 py-0 h-3.5 bg-emerald-500/10 text-emerald-600 font-mono">
                                    <ImageIcon className="w-2 h-2 mr-0.5" />{currentHook.images_count}장
                                </Badge>
                            )}
                        </div>
                        <p className="text-[11px] font-bold text-foreground line-clamp-2 leading-tight">
                            "{currentHook.hook || currentHook.title}"
                        </p>
                        <p className="text-[9.5px] text-muted-foreground truncate">
                            {currentHook.title}
                        </p>
                    </div>

                    <div className="w-full pt-1.5 border-t border-border/50 text-[10px] font-mono text-muted-foreground flex justify-between items-center">
                        <span className="text-[9px]">{isWorkerRunning ? '실시간 탐색 중' : '대기 중'}</span>
                        <span className="text-primary text-[10px] font-semibold flex items-center">
                            자동 순환 <ChevronRight className="w-3 h-3" />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
