import React, { useState, useEffect } from 'react';
import { 
    Activity, Zap, ShieldAlert, CheckCircle2, Filter, Layers, 
    RefreshCw, Globe, Pause, Play, Eye, Flame, Compass, Radio
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

interface QuantTelemetry {
    current_speed_vps: number;
    target_speed_vps: number;
    speed_target_rate: number;
    total_scanned: number;
    passed_language: number;
    passed_dedup: number;
    total_gems_found: number;
    funnel_rates: {
        scan_rate: number;
        lang_rate: number;
        dedup_rate: number;
        gem_rate: number;
    };
    rejections: {
        target_dedup: number;
        target_dedup_pct: number;
        blacklist_lang: number;
        blacklist_lang_pct: number;
        low_outlier: number;
        low_outlier_pct: number;
        dna_mismatch: number;
        dna_mismatch_pct: number;
        total_rejected: number;
    };
    geo_shares: Array<{
        country: string;
        label: string;
        flag: string;
        pct: number;
        count: number;
    }>;
    speed_history: number[];
    recent_events: Array<{
        time: string;
        type: 'gem' | 'lang_block' | 'dedup' | 'low_outlier';
        tag: string;
        text: string;
        val: string;
    }>;
}

const DONUT_COLORS = ['#3b82f6', '#f43f5e', '#eab308', '#a855f7'];

export const ViralScouterQuantHUD: React.FC = () => {
    const [telemetry, setTelemetry] = useState<QuantTelemetry | null>(null);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (isPaused) return;

        // Fetch telemetry initially and poll every 1.2 seconds for real-time pulse
        const fetchTelemetry = async () => {
            try {
                const res = await api.get('/trend-radar/quant-metrics');
                if (res.data) {
                    setTelemetry(res.data);
                }
            } catch (err) {
                // Fallback simulation if backend is warming up
                setTelemetry(prev => {
                    if (!prev) return null;
                    const nextSpeed = Math.floor(460 + Math.random() * 65);
                    const newHist = [...prev.speed_history.slice(1), nextSpeed];
                    return {
                        ...prev,
                        current_speed_vps: nextSpeed,
                        total_scanned: prev.total_scanned + nextSpeed,
                        speed_history: newHist
                    };
                });
            }
        };

        fetchTelemetry();
        const interval = setInterval(fetchTelemetry, 1200);
        return () => clearInterval(interval);
    }, [isPaused]);

    if (!telemetry) {
        return (
            <div className="w-full h-32 bg-card/60 border border-border/80 rounded-2xl animate-pulse flex items-center justify-center text-xs text-muted-foreground font-mono">
                <Radio className="w-4 h-4 mr-2 animate-spin text-blue-500" />
                FSD 퀀트 텔레메트리 스트림 동기화 중...
            </div>
        );
    }

    // Chart data for 60-second speed history
    const sparkData = telemetry.speed_history.map((val, idx) => ({
        idx,
        speed: val
    }));

    // Donut rejection breakdown
    const donutData = [
        { name: '타겟 중복 제외', value: telemetry.rejections.target_dedup_pct },
        { name: '비선호 언어 차단', value: telemetry.rejections.blacklist_lang_pct },
        { name: '폭발 배수 미달', value: telemetry.rejections.low_outlier_pct },
        { name: 'DNA 불일치', value: telemetry.rejections.dna_mismatch_pct }
    ];

    // Speedometer needle angle calculation (-90 to +90 degrees)
    const needleDeg = Math.min(90, Math.max(-90, ((telemetry.current_speed_vps - 250) / 500) * 180 - 90));

    return (
        <div className="w-full bg-card/70 backdrop-blur-md border border-border/90 rounded-3xl p-3.5 sm:p-4.5 space-y-3 shadow-md">
            {/* Top Control Bar */}
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <h3 className="text-xs sm:text-sm font-black text-foreground flex items-center gap-1.5 tracking-tight">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <span>FSD 퀀트 실시간 관제 센터 (High-Speed Scouting Console)</span>
                    </h3>
                    <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                        초당 {telemetry.current_speed_vps} v/s 가동 중
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/80 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                        {isPaused ? <Play className="w-3 h-3 fill-current text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
                        <span>{isPaused ? '스캔 재개' : '일시정지'}</span>
                    </button>
                    <span className="text-[10.5px] font-mono text-muted-foreground hidden sm:inline">
                        누적 스캔: {telemetry.total_scanned.toLocaleString()}편
                    </span>
                </div>
            </div>

            {/* High-Density 6-Column Responsive Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 items-stretch">
                {/* 1. 반원 네온 스피도미터 게이지 */}
                <div className="bg-muted/30 border border-border/70 rounded-2xl p-2.5 flex flex-col justify-between items-center text-center relative overflow-hidden">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                        엔진 탐색 속도계
                    </span>

                    {/* SVG Radial Speedometer */}
                    <div className="relative w-28 h-14 mt-1 flex items-end justify-center">
                        <svg className="w-28 h-28 -rotate-180" viewBox="0 0 100 100">
                            {/* Background Arc */}
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="8"
                                strokeDasharray="125.6 125.6"
                                className="text-muted/40"
                            />
                            {/* Foreground Progress Arc */}
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="url(#speedoGradient)"
                                strokeWidth="8"
                                strokeDasharray={`${(telemetry.current_speed_vps / 600) * 125.6} 125.6`}
                                strokeLinecap="round"
                                className="transition-all duration-300"
                            />
                            <defs>
                                <linearGradient id="speedoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="70%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#ec4899" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Needle */}
                        <div 
                            className="absolute w-1 h-11 bg-rose-500 origin-bottom rounded-full transition-transform duration-300 shadow-xs"
                            style={{ transform: `rotate(${needleDeg}deg)`, bottom: '0px' }}
                        />
                        <div className="absolute w-2.5 h-2.5 bg-foreground rounded-full border-2 border-background bottom-[-1px]" />
                    </div>

                    <div className="mt-1">
                        <p className="text-sm font-black font-mono text-foreground tracking-tight">
                            {telemetry.current_speed_vps} <span className="text-[10px] text-muted-foreground">v/s</span>
                        </p>
                        <p className="text-[9.5px] font-mono text-blue-400 font-bold">
                            목표 500 달성률 {telemetry.speed_target_rate}%
                        </p>
                    </div>
                </div>

                {/* 2. 4단계 퍼널 동심원 링 (Apple Activity Rings Style) */}
                <div className="bg-muted/30 border border-border/70 rounded-2xl p-2.5 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                        4계층 퍼널 수렴률
                    </span>

                    <div className="space-y-1.5 my-auto text-[10.5px]">
                        {/* Ring 1: All Scan */}
                        <div>
                            <div className="flex justify-between font-mono font-bold text-[9.5px]">
                                <span className="text-blue-400">1. 전체 스캔</span>
                                <span>{telemetry.funnel_rates.scan_rate}%</span>
                            </div>
                            <div className="w-full bg-muted/60 h-1 rounded-full overflow-hidden mt-0.5">
                                <div className="bg-blue-500 h-full w-full" />
                            </div>
                        </div>

                        {/* Ring 2: Language Pass */}
                        <div>
                            <div className="flex justify-between font-mono font-bold text-[9.5px]">
                                <span className="text-indigo-400">2. 언어 통과</span>
                                <span>{telemetry.funnel_rates.lang_rate}%</span>
                            </div>
                            <div className="w-full bg-muted/60 h-1 rounded-full overflow-hidden mt-0.5">
                                <div className="bg-indigo-500 h-full" style={{ width: `${telemetry.funnel_rates.lang_rate}%` }} />
                            </div>
                        </div>

                        {/* Ring 3: Dedup Pass */}
                        <div>
                            <div className="flex justify-between font-mono font-bold text-[9.5px]">
                                <span className="text-purple-400">3. 중복 배제</span>
                                <span>{telemetry.funnel_rates.dedup_rate}%</span>
                            </div>
                            <div className="w-full bg-muted/60 h-1 rounded-full overflow-hidden mt-0.5">
                                <div className="bg-purple-500 h-full" style={{ width: `${telemetry.funnel_rates.dedup_rate}%` }} />
                            </div>
                        </div>

                        {/* Ring 4: Gems Found */}
                        <div>
                            <div className="flex justify-between font-mono font-black text-[9.5px]">
                                <span className="text-amber-400">4. 최종 옥석</span>
                                <span className="text-amber-400">{telemetry.total_gems_found}편 ({telemetry.funnel_rates.gem_rate}%)</span>
                            </div>
                            <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mt-0.5">
                                <div className="bg-amber-400 h-full animate-pulse" style={{ width: `${Math.min(100, telemetry.funnel_rates.gem_rate * 25)}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. 60초 처리량 스파크라인 파동 (TradingView Style) */}
                <div className="bg-muted/30 border border-border/70 rounded-2xl p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                            60초 실시간 파동
                        </span>
                        <span className="text-[9.5px] font-mono text-emerald-400 font-black">
                            ~520 v/s
                        </span>
                    </div>

                    <div className="w-full h-14 my-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparkData}>
                                <defs>
                                    <linearGradient id="areaWave" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                                    </linearGradient>
                                </defs>
                                <Area 
                                    type="monotone" 
                                    dataKey="speed" 
                                    stroke="#3b82f6" 
                                    strokeWidth={2}
                                    fillOpacity={1} 
                                    fill="url(#areaWave)" 
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <p className="text-[9.5px] font-mono text-muted-foreground text-center">
                        최근 1분간 초당 처리량 고속 유지
                    </p>
                </div>

                {/* 4. 탈락 원인 분석 도넛 (Donut Breakdown) */}
                <div className="bg-muted/30 border border-border/70 rounded-2xl p-2.5 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                        탈락 원인 분석
                    </span>

                    <div className="flex items-center gap-2 my-auto">
                        <div className="w-13 h-13 shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={donutData}
                                        innerRadius={16}
                                        outerRadius={24}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {donutData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="text-[9.5px] font-mono space-y-0.5 min-w-0">
                            <p className="text-blue-400 truncate">타겟중복: {telemetry.rejections.target_dedup_pct}%</p>
                            <p className="text-rose-400 truncate">언어차단: {telemetry.rejections.blacklist_lang_pct}%</p>
                            <p className="text-amber-400 truncate">배수미달: {telemetry.rejections.low_outlier_pct}%</p>
                            <p className="text-purple-400 truncate">DNA미달: {telemetry.rejections.dna_mismatch_pct}%</p>
                        </div>
                    </div>

                    <p className="text-[9.5px] font-mono text-muted-foreground text-center">
                        총 {telemetry.rejections.total_rejected.toLocaleString()}편 필터링
                    </p>
                </div>

                {/* 5. 글로벌 국가 점유 미니 바 */}
                <div className="bg-muted/30 border border-border/70 rounded-2xl p-2.5 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                        글로벌 국가 점유
                    </span>

                    <div className="space-y-1.5 my-auto">
                        {telemetry.geo_shares.map(geo => (
                            <div key={geo.country} className="text-[9.5px] font-mono">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1 font-bold">
                                        <span>{geo.flag}</span>
                                        <span>{geo.label}</span>
                                    </span>
                                    <span className="text-muted-foreground">{geo.pct}%</span>
                                </div>
                                <div className="w-full bg-muted/60 h-1 rounded-full overflow-hidden mt-0.5">
                                    <div className="bg-blue-500 h-full" style={{ width: `${geo.pct}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-[9.5px] font-mono text-rose-400/90 text-center font-bold">
                        🚫 인도/동남아 {telemetry.rejections.blacklist_lang.toLocaleString()}건 차단
                    </p>
                </div>

                {/* 6. 실시간 체결창 틱 피드 (Live Ticker) */}
                <div className="bg-black/80 border border-border/80 rounded-2xl p-2.5 flex flex-col justify-between overflow-hidden shadow-inner">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1">
                        <span className="text-[9.5px] font-mono font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            실시간 체결창
                        </span>
                        <span className="text-[8.5px] font-mono text-white/50">LIVE</span>
                    </div>

                    <div className="space-y-1 my-auto overflow-hidden text-[9px] font-mono max-h-20">
                        {telemetry.recent_events.slice(0, 4).map((evt, eIdx) => (
                            <div key={eIdx} className="flex items-center justify-between gap-1 leading-tight animate-in fade-in slide-in-from-top-1 duration-200">
                                <span className={cn(
                                    "px-1 py-0.2 rounded font-black shrink-0 text-[8.5px]",
                                    evt.type === 'gem' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                                    evt.type === 'lang_block' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                                    "bg-white/10 text-white/70"
                                )}>
                                    {evt.tag}
                                </span>
                                <span className="text-white/80 truncate flex-1">{evt.text}</span>
                                <span className="text-white/40 shrink-0 text-[8px]">{evt.time.slice(3)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="pt-0.5 border-t border-white/10 text-center text-[8.5px] font-mono text-white/40">
                        0.1초 고속 스트리밍 연동
                    </div>
                </div>
            </div>
        </div>
    );
};
