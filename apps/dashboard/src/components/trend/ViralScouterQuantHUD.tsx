import React, { useState, useEffect } from 'react';
import { 
    Activity, Zap, ShieldAlert, CheckCircle2, Filter, Layers, 
    RefreshCw, Globe, Pause, Play, Trash2, Radio, Sliders
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { cn } from '../../lib/utils';
import api from '../../lib/api';
import { ScoutQuantDeepDiveModal, DeepDiveModalType } from './ScoutQuantDeepDiveModal';

interface QuantTelemetry {
    is_running: boolean;
    current_category: string;
    last_scout_time: string | null;
    engine_speed_vps: number;
    target_goal_vps: number;
    goal_achievement_pct: number;
    category_focus_ratio?: number;
    funnel_counts: {
        scan: number;
        lang_pass: number;
        dedup_pass: number;
        gem: number;
        filtered_lang: number;
        filtered_dedup: number;
        total_filtered: number;
    };
    funnel_rates: {
        scan: number;
        lang: number;
        dedup: number;
        gem: number;
    };
    history_speed: number[];
    donut_breakdown: {
        target_dedup_pct: number;
        blacklist_lang_pct: number;
        low_outlier_pct: number;
        dna_mismatch_pct: number;
    };
    geo_distribution: {
        us_en: number;
        kr_ko: number;
        jp_ja: number;
        blocked_in_sea: number;
        blocked_total: number;
    };
    ticker_feed: Array<{
        time: string;
        type: 'gem' | 'lang_block' | 'dedup' | 'low_outlier';
        tag: string;
        text: string;
        val: string;
    }>;
}

const DONUT_COLORS = ['#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6'];

export const ViralScouterQuantHUD: React.FC = () => {
    const [telemetry, setTelemetry] = useState<QuantTelemetry | null>(null);
    const [isWorkerToggling, setIsWorkerToggling] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [deepDiveTab, setDeepDiveTab] = useState<DeepDiveModalType | null>(null);

    const fetchTelemetry = async () => {
        try {
            const res = await api.get('/trend-radar/quant-metrics');
            if (res.data) {
                setTelemetry(res.data);
            }
        } catch (err) {
            console.warn('[QuantHUD] Telemetry fetch error:', err);
        }
    };

    useEffect(() => {
        fetchTelemetry();
        const interval = setInterval(fetchTelemetry, 1500);
        return () => clearInterval(interval);
    }, []);

    const handleToggleWorker = async () => {
        if (!telemetry || isWorkerToggling) return;
        setIsWorkerToggling(true);
        try {
            if (telemetry.is_running) {
                await api.post('/trend-radar/worker/stop');
            } else {
                await api.post('/trend-radar/worker/start');
            }
            await fetchTelemetry();
        } catch (e: any) {
            alert('워커 제어 실패: ' + (e.response?.data?.detail || e.message));
        } finally {
            setIsWorkerToggling(false);
        }
    };

    const handleResetData = async () => {
        if (!confirm('정말로 모든 수집 영상과 통계 데이터를 0으로 초기화하시겠습니까?\n(카테고리 설정은 유지됩니다)')) return;
        setIsResetting(true);
        try {
            const res = await api.post('/trend-radar/reset-data');
            alert(`[초기화 완료] 수집된 ${res.data.deleted_count || 0}건의 영상이 삭제되고 제로 상태로 리셋되었습니다.`);
            await fetchTelemetry();
            window.location.reload();
        } catch (e: any) {
            alert('초기화 실패: ' + (e.response?.data?.detail || e.message));
        } finally {
            setIsResetting(false);
        }
    };

    if (!telemetry) {
        return (
            <div className="w-full h-28 bg-card border border-border/80 rounded-2xl animate-pulse flex items-center justify-center text-xs text-muted-foreground font-mono shadow-xs">
                <Radio className="w-4 h-4 mr-2 animate-spin text-primary" />
                바이럴 발굴 실시간 관제 텔레메트리 연결 중...
            </div>
        );
    }

    // Chart data for speed history
    const sparkData = (telemetry.history_speed || []).map((val, idx) => ({
        idx,
        speed: val
    }));

    // Donut chart data
    const donutData = [
        { name: '타겟 중복', value: telemetry.donut_breakdown.target_dedup_pct || 1 },
        { name: '비선호 언어', value: telemetry.donut_breakdown.blacklist_lang_pct || 1 },
        { name: '배수 미달', value: telemetry.donut_breakdown.low_outlier_pct || 1 },
        { name: '카테고리 불일치', value: telemetry.donut_breakdown.dna_mismatch_pct || 1 },
    ];

    // Rescaled Speedometer Needle Calculation (0 to 35 v/s realistic scout velocity -> -90deg to +90deg)
    const TARGET_VPS = 30;
    const speedRatio = Math.min(1.0, (telemetry.engine_speed_vps || 0) / TARGET_VPS);
    const needleDeg = -90 + (speedRatio * 180);

    return (
        <div className="w-full bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 text-foreground transition-colors">
            {/* Header Status Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-2.5 w-2.5 relative">
                        <span className={cn(
                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                            telemetry.is_running ? "bg-emerald-500" : "bg-amber-500"
                        )}></span>
                        <span className={cn(
                            "relative inline-flex rounded-full h-2.5 w-2.5",
                            telemetry.is_running ? "bg-emerald-500" : "bg-amber-500"
                        )}></span>
                    </span>
                    <h2 className="text-xs sm:text-sm font-bold tracking-tight flex items-center gap-2 text-foreground">
                        <span>바이럴 발굴 실시간 관제 레이더</span>
                        <span className="text-[11px] font-normal text-muted-foreground hidden sm:inline">(Viral Scout Radar)</span>
                    </h2>
                    <span className={cn(
                        "text-[10.5px] font-mono px-2.5 py-0.5 rounded-full border font-semibold flex items-center gap-1",
                        telemetry.is_running 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" 
                            : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                    )}>
                        {telemetry.is_running ? `● 실시간 탐색 중: ${telemetry.current_category}` : '⏸ 일시정지됨'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Real Worker Toggle */}
                    <button
                        type="button"
                        onClick={handleToggleWorker}
                        disabled={isWorkerToggling}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-all shadow-xs",
                            telemetry.is_running
                                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20"
                        )}
                    >
                        {telemetry.is_running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>{telemetry.is_running ? '수집 일시정지' : '실제 수집 가동'}</span>
                    </button>

                    {/* Reset Data Button */}
                    <button
                        type="button"
                        onClick={handleResetData}
                        disabled={isResetting}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 flex items-center gap-1 cursor-pointer transition-colors"
                        title="수집된 영상 및 통계를 전부 0으로 리셋합니다"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">데이터 0 초기화</span>
                    </button>

                    <span className="text-[11px] font-mono text-muted-foreground hidden md:inline ml-1">
                        누적 스캔: <b className="text-foreground font-semibold">{telemetry.funnel_counts.scan.toLocaleString()}</b>편
                    </span>
                </div>
            </div>

            {/* High-Density 6-Column Responsive Grid with Click-to-DeepDive */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 items-stretch">
                {/* 1. 반원 네온 스피도미터 게이지 (30 v/s 실속도 보정) */}
                <div 
                    onClick={() => setDeepDiveTab('speed')}
                    title="클릭 시 탐색 속도 심층 분석 리포트 열기"
                    className="bg-muted/40 hover:bg-muted/70 border border-border/70 hover:border-primary/60 rounded-xl p-3 flex flex-col justify-between items-center text-center relative overflow-hidden cursor-pointer transition-all hover:shadow-xs group"
                >
                    <div className="w-full flex items-center justify-between text-[10.5px] font-mono font-semibold text-muted-foreground group-hover:text-primary transition-colors uppercase">
                        <span>초당 분석 속도</span>
                        <span className="text-primary font-bold">{telemetry.engine_speed_vps} v/s</span>
                    </div>

                    {/* Clean Half-Circle Speedometer Arc */}
                    <div className="relative w-32 h-16 mt-2 flex items-end justify-center">
                        <svg className="w-32 h-16 overflow-visible" viewBox="0 0 100 50">
                            {/* Background Arc */}
                            <path 
                                d="M 10 50 A 40 40 0 0 1 90 50" 
                                fill="none" 
                                stroke="currentColor" 
                                className="text-muted/60" 
                                strokeWidth="8" 
                                strokeLinecap="round" 
                            />
                            {/* Progress Arc */}
                            <path 
                                d="M 10 50 A 40 40 0 0 1 90 50" 
                                fill="none" 
                                stroke="url(#creatorSpeedoGradient)" 
                                strokeWidth="8" 
                                strokeDasharray="125.6" 
                                strokeDashoffset={125.6 * (1 - speedRatio)} 
                                strokeLinecap="round" 
                                className="transition-all duration-300"
                            />
                            <defs>
                                <linearGradient id="creatorSpeedoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="60%" stopColor="#06b6d4" />
                                    <stop offset="100%" stopColor="#10b981" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Needle */}
                        <div 
                            className="absolute w-1 h-12 bg-rose-500 origin-bottom rounded-full transition-transform duration-300 shadow-xs"
                            style={{ transform: `rotate(${needleDeg}deg)`, bottom: '0px' }}
                        />
                        <div className="absolute w-2.5 h-2.5 bg-background rounded-full border-2 border-rose-500 bottom-[-1px]" />
                    </div>

                    <div className="mt-2 w-full pt-1.5 border-t border-border/60 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-muted-foreground">목표 {TARGET_VPS} v/s</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {Math.round((telemetry.engine_speed_vps / TARGET_VPS) * 100)}% 달성
                        </span>
                    </div>
                </div>

                {/* 2. 4단계 필터링 파이프라인 */}
                <div 
                    onClick={() => setDeepDiveTab('funnel')}
                    title="클릭 시 4단계 필터링 파이프라인 심층 리포트 열기"
                    className="bg-muted/40 hover:bg-muted/70 border border-border/70 hover:border-primary/60 rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-xs group"
                >
                    <div className="text-[10.5px] font-mono font-semibold text-muted-foreground group-hover:text-primary transition-colors flex items-center justify-between uppercase">
                        <span>4단계 필터링</span>
                        <Filter className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="space-y-1.5 my-1 font-mono text-[10px]">
                        <div>
                            <div className="flex justify-between text-muted-foreground mb-0.5">
                                <span>1. 스캔</span>
                                <span className="font-semibold text-foreground">{telemetry.funnel_counts.scan}편</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div className="bg-blue-500 h-full rounded-full" style={{ width: '100%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-muted-foreground mb-0.5">
                                <span>2. 언어 통과</span>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{telemetry.funnel_counts.lang_pass}편</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, telemetry.funnel_rates.lang)}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-muted-foreground mb-0.5">
                                <span>3. 중복 제외</span>
                                <span className="font-semibold text-amber-600 dark:text-amber-400">{telemetry.funnel_counts.dedup_pass}편</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, telemetry.funnel_rates.dedup)}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-muted-foreground mb-0.5">
                                <span className="font-bold text-rose-600 dark:text-rose-400">4. 옥석 발굴</span>
                                <span className="font-bold text-rose-600 dark:text-rose-400">{telemetry.funnel_counts.gem}편</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, telemetry.funnel_rates.gem * 3)}%` }}></div>
                            </div>
                        </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono flex justify-between pt-1 border-t border-border/60">
                        <span>수렴율</span>
                        <span className="text-foreground font-bold">{telemetry.funnel_rates.gem}%</span>
                    </div>
                </div>

                {/* 3. 실시간 처리량 추이 (Sparkline Chart) */}
                <div 
                    onClick={() => setDeepDiveTab('throughput')}
                    title="클릭 시 실시간 처리량 추이 타임라인 열기"
                    className="bg-muted/40 hover:bg-muted/70 border border-border/70 hover:border-primary/60 rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-xs group"
                >
                    <div className="text-[10.5px] font-mono font-semibold text-muted-foreground group-hover:text-primary transition-colors flex items-center justify-between uppercase">
                        <span>실시간 처리량 추이</span>
                        <Activity className="w-3 h-3 text-primary animate-pulse" />
                    </div>
                    <div className="h-16 w-full my-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparkData}>
                                <defs>
                                    <linearGradient id="speedAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Area 
                                    type="monotone" 
                                    dataKey="speed" 
                                    stroke="#3b82f6" 
                                    strokeWidth={2} 
                                    fillOpacity={1} 
                                    fill="url(#speedAreaGrad)" 
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1 border-t border-border/60">
                        <span>최근 30초 추세</span>
                        <span className="text-primary font-semibold">{telemetry.engine_speed_vps} v/s</span>
                    </div>
                </div>

                {/* 4. 제외 사유 도넛 분석 */}
                <div 
                    onClick={() => setDeepDiveTab('rejection')}
                    title="클릭 시 제외 사유 분석 및 실시간 탈락 로그 열기"
                    className="bg-muted/40 hover:bg-muted/70 border border-border/70 hover:border-primary/60 rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-xs group"
                >
                    <div className="text-[10.5px] font-mono font-semibold text-muted-foreground group-hover:text-primary transition-colors flex items-center justify-between uppercase">
                        <span>제외 사유 분석</span>
                        <Layers className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="h-16 w-full flex items-center justify-center my-1 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    innerRadius={20}
                                    outerRadius={30}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {donutData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'hsl(var(--popover))', 
                                        borderColor: 'hsl(var(--border))', 
                                        borderRadius: '8px', 
                                        fontSize: '10px',
                                        color: 'hsl(var(--popover-foreground))'
                                    }} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-[9.5px] font-mono font-bold text-muted-foreground">
                                {telemetry.funnel_counts.total_filtered}
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[9px] font-mono pt-1 border-t border-border/60">
                        <span className="text-blue-600 dark:text-blue-400 truncate">● 중복 {telemetry.donut_breakdown.target_dedup_pct}%</span>
                        <span className="text-rose-600 dark:text-rose-400 truncate">● 언어 {telemetry.donut_breakdown.blacklist_lang_pct}%</span>
                        <span className="text-amber-600 dark:text-amber-400 truncate">● 배수 {telemetry.donut_breakdown.low_outlier_pct}%</span>
                        <span className="text-purple-600 dark:text-purple-400 truncate">● 불일치 {telemetry.donut_breakdown.dna_mismatch_pct}%</span>
                    </div>
                </div>

                {/* 5. 타깃 언어권 분포 */}
                <div 
                    onClick={() => setDeepDiveTab('geo')}
                    title="클릭 시 글로벌 언어권 분포 및 필터링 현황 열기"
                    className="bg-muted/40 hover:bg-muted/70 border border-border/70 hover:border-primary/60 rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-xs group"
                >
                    <div className="text-[10.5px] font-mono font-semibold text-muted-foreground group-hover:text-primary transition-colors flex items-center justify-between uppercase">
                        <span>타깃 언어권 분포</span>
                        <Globe className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="space-y-1 my-1 text-[10px] font-mono">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-1">🇺🇸 영어권</span>
                            <span className="text-foreground font-semibold">{telemetry.geo_distribution.us_en}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-1">🇰🇷 한국어</span>
                            <span className="text-foreground font-semibold">{telemetry.geo_distribution.kr_ko}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-1">🇯🇵 일본어</span>
                            <span className="text-foreground font-semibold">{telemetry.geo_distribution.jp_ja}%</span>
                        </div>
                        <div className="flex justify-between items-center pt-0.5 border-t border-border/40 text-destructive">
                            <span className="flex items-center gap-1">🚫 제외 언어</span>
                            <span className="font-semibold">{telemetry.geo_distribution.blocked_total}%</span>
                        </div>
                    </div>
                    <div className="text-[9px] text-muted-foreground font-mono truncate pt-1 border-t border-border/60">
                        필터링: hi, vi, ar, ru 차단
                    </div>
                </div>

                {/* 6. 실시간 발굴 로그 */}
                <div 
                    onClick={() => setDeepDiveTab('logs')}
                    title="클릭 시 실시간 발굴 콘솔 로그 열기"
                    className="bg-muted/40 hover:bg-muted/70 border border-border/70 hover:border-primary/60 rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-xs group"
                >
                    <div className="text-[10.5px] font-mono font-semibold text-muted-foreground group-hover:text-primary transition-colors flex items-center justify-between uppercase">
                        <span>실시간 발굴 로그</span>
                        <Zap className="w-3 h-3 text-amber-500" />
                    </div>
                    <div className="space-y-1.5 my-1 overflow-hidden h-20">
                        {(telemetry.ticker_feed || []).slice(0, 3).map((tick, i) => (
                            <div key={i} className="flex items-center justify-between text-[10px] font-mono truncate">
                                <span className="text-muted-foreground/70 shrink-0 mr-1.5">{tick.time}</span>
                                <span className={cn(
                                    "px-1 py-0.2 rounded-[4px] text-[8.5px] font-bold shrink-0 mr-1.5",
                                    tick.type === 'gem' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" :
                                    tick.type === 'lang_block' ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" :
                                    tick.type === 'dedup' ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" :
                                    "bg-muted text-muted-foreground"
                                )}>
                                    {tick.tag}
                                </span>
                                <span className="truncate text-foreground text-[9.5px] flex-1 mr-1" title={tick.text}>
                                    {tick.text}
                                </span>
                                <span className="font-bold shrink-0 text-[9.5px] text-primary">
                                    {tick.val}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="text-[9.5px] font-mono text-muted-foreground flex items-center justify-between pt-1 border-t border-border/60">
                        <span>상태</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                            정상 스트리밍
                        </span>
                    </div>
                </div>
            </div>

            {/* Deep Dive Modal */}
            <ScoutQuantDeepDiveModal
                isOpen={!!deepDiveTab}
                onClose={() => setDeepDiveTab(null)}
                initialTab={deepDiveTab || 'speed'}
                telemetry={telemetry}
            />
        </div>
    );
};
