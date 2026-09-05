import React, { useState, useEffect } from 'react';
import { 
    Activity, Zap, ShieldAlert, CheckCircle2, Filter, Layers, 
    RefreshCw, Globe, Pause, Play, Trash2, Radio
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

interface QuantTelemetry {
    is_running: boolean;
    current_category: string;
    last_scout_time: string | null;
    engine_speed_vps: number;
    target_goal_vps: number;
    goal_achievement_pct: number;
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

const DONUT_COLORS = ['#38bdf8', '#f43f5e', '#fbbf24', '#a855f7'];

export const ViralScouterQuantHUD: React.FC = () => {
    const [telemetry, setTelemetry] = useState<QuantTelemetry | null>(null);
    const [isWorkerToggling, setIsWorkerToggling] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

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
            <div className="w-full h-32 bg-slate-950 border border-slate-800 rounded-3xl animate-pulse flex items-center justify-center text-xs text-slate-400 font-mono">
                <Radio className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
                FSD 퀀트 실시간 텔레메트리 스트림 동기화 중...
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
        { name: 'DNA 불일치', value: telemetry.donut_breakdown.dna_mismatch_pct || 1 },
    ];

    // Speedometer Needle Calculation (0 to 500 v/s -> -90deg to +90deg)
    const speedRatio = Math.min(1.0, telemetry.engine_speed_vps / 500);
    const needleDeg = -90 + (speedRatio * 180);

    return (
        <div className="w-full bg-slate-950 border border-slate-800/90 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3.5 text-slate-100">
            {/* Header Status Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-2.5 w-2.5 relative">
                        <span className={cn(
                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                            telemetry.is_running ? "bg-emerald-400" : "bg-amber-400"
                        )}></span>
                        <span className={cn(
                            "relative inline-flex rounded-full h-2.5 w-2.5",
                            telemetry.is_running ? "bg-emerald-500" : "bg-amber-500"
                        )}></span>
                    </span>
                    <h2 className="text-xs sm:text-sm font-black tracking-tight flex items-center gap-2">
                        <span>FSD 퀀트 실시간 관제 센터 (High-Density Quant Terminal)</span>
                    </h2>
                    <span className={cn(
                        "text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold flex items-center gap-1",
                        telemetry.is_running 
                            ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/40" 
                            : "bg-amber-950/60 text-amber-400 border-amber-500/40"
                    )}>
                        {telemetry.is_running ? `● 스캔 가동 중: ${telemetry.current_category}` : '⏸ 일시정지됨'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Real Worker Toggle */}
                    <button
                        type="button"
                        onClick={handleToggleWorker}
                        disabled={isWorkerToggling}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-all",
                            telemetry.is_running
                                ? "bg-slate-900 hover:bg-slate-800 border-slate-700 text-amber-400"
                                : "bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-600/20"
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
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60 flex items-center gap-1 cursor-pointer transition-colors"
                        title="수집된 영상 및 통계를 전부 0으로 리셋합니다"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">데이터 0 초기화</span>
                    </button>

                    <span className="text-[11px] font-mono text-slate-400 hidden md:inline ml-1">
                        누적 스캔: <b className="text-white">{telemetry.funnel_counts.scan.toLocaleString()}</b>편
                    </span>
                </div>
            </div>

            {/* High-Density 6-Column Responsive Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 items-stretch">
                {/* 1. 반원 네온 스피도미터 게이지 (버그 수정: 텍스트 분리 및 완벽 여백) */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 flex flex-col justify-between items-center text-center relative overflow-hidden">
                    <div className="w-full flex items-center justify-between text-[10.5px] font-mono font-bold text-slate-400 uppercase">
                        <span>엔진 탐색 속도</span>
                        <span className="text-cyan-400 font-black">{telemetry.engine_speed_vps} v/s</span>
                    </div>

                    {/* Clean Half-Circle Speedometer Arc */}
                    <div className="relative w-32 h-16 mt-2 flex items-end justify-center">
                        <svg className="w-32 h-16 overflow-visible" viewBox="0 0 100 50">
                            {/* Background Arc */}
                            <path 
                                d="M 10 50 A 40 40 0 0 1 90 50" 
                                fill="none" 
                                stroke="#1e293b" 
                                strokeWidth="8" 
                                strokeLinecap="round" 
                            />
                            {/* Progress Arc */}
                            <path 
                                d="M 10 50 A 40 40 0 0 1 90 50" 
                                fill="none" 
                                stroke="url(#cyanSpeedoGradient)" 
                                strokeWidth="8" 
                                strokeDasharray="125.6" 
                                strokeDashoffset={125.6 * (1 - speedRatio)} 
                                strokeLinecap="round" 
                                className="transition-all duration-300"
                            />
                            <defs>
                                <linearGradient id="cyanSpeedoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#06b6d4" />
                                    <stop offset="60%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#10b981" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Needle */}
                        <div 
                            className="absolute w-1 h-12 bg-rose-500 origin-bottom rounded-full transition-transform duration-300 shadow-md"
                            style={{ transform: `rotate(${needleDeg}deg)`, bottom: '0px' }}
                        />
                        <div className="absolute w-2.5 h-2.5 bg-white rounded-full border-2 border-slate-950 bottom-[-1px]" />
                    </div>

                    <div className="mt-2 w-full pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">목표 500</span>
                        <span className="text-emerald-400 font-bold">{telemetry.goal_achievement_pct}% 달성</span>
                    </div>
                </div>

                {/* 2. 4단계 수렴 퍼널 멀티 바 */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 flex flex-col justify-between space-y-1.5">
                    <span className="text-[10.5px] font-mono font-bold text-slate-400 uppercase">
                        4계층 퍼널 수렴군
                    </span>
                    <div className="space-y-1.5 text-[10.5px] font-mono">
                        <div>
                            <div className="flex justify-between text-slate-300">
                                <span>1. 전체 스캔</span>
                                <span className="font-bold text-white">{telemetry.funnel_counts.scan.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-0.5">
                                <div className="bg-slate-400 h-full w-full" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-cyan-300">
                                <span>2. 언어 통과</span>
                                <span className="font-bold">{telemetry.funnel_rates.lang}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-0.5">
                                <div className="bg-cyan-400 h-full" style={{ width: `${telemetry.funnel_rates.lang}%` }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-indigo-300">
                                <span>3. 중복 배제</span>
                                <span className="font-bold">{telemetry.funnel_rates.dedup}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-0.5">
                                <div className="bg-indigo-400 h-full" style={{ width: `${telemetry.funnel_rates.dedup}%` }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-emerald-300 font-bold">
                                <span>4. 최종 옥석</span>
                                <span className="text-emerald-400 font-black">{telemetry.funnel_counts.gem}편 ({telemetry.funnel_rates.gem}%)</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-0.5">
                                <div className="bg-emerald-400 h-full" style={{ width: `${Math.min(100, telemetry.funnel_rates.gem * 10)}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. 60초 시계열 처리량 스파크라인 파동 */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400 font-bold">
                        <span>60초 실시간 파동</span>
                        <span className="text-cyan-400">{telemetry.engine_speed_vps} v/s</span>
                    </div>
                    <div className="h-16 w-full -mx-1 my-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparkData}>
                                <defs>
                                    <linearGradient id="realSparkGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6}/>
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                                    </linearGradient>
                                </defs>
                                <Area 
                                    type="monotone" 
                                    dataKey="speed" 
                                    stroke="#06b6d4" 
                                    strokeWidth={1.5} 
                                    fillOpacity={1} 
                                    fill="url(#realSparkGrad)" 
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-[9.5px] font-mono text-slate-500 text-center truncate">
                        실시간 초당 실제 파싱 처리량
                    </p>
                </div>

                {/* 4. 탈락 원인 분석 도넛 차트 */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 flex flex-col justify-between">
                    <span className="text-[10.5px] font-mono font-bold text-slate-400 uppercase">
                        탈락 원인 분석
                    </span>
                    <div className="flex items-center justify-between gap-1 mt-1">
                        <div className="w-14 h-14 relative shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={donutData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={16}
                                        outerRadius={26}
                                        paddingAngle={2}
                                        dataKey="value"
                                        isAnimationActive={false}
                                    >
                                        {donutData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-0.5 text-[9.5px] font-mono flex-1 min-w-0">
                            <p className="truncate text-sky-400">타겟중복: {telemetry.donut_breakdown.target_dedup_pct}%</p>
                            <p className="truncate text-rose-400">언어차단: {telemetry.donut_breakdown.blacklist_lang_pct}%</p>
                            <p className="truncate text-amber-400">배수미달: {telemetry.donut_breakdown.low_outlier_pct}%</p>
                            <p className="truncate text-purple-400">DNA미달: {telemetry.donut_breakdown.dna_mismatch_pct}%</p>
                        </div>
                    </div>
                    <p className="text-[9.5px] font-mono text-slate-500 text-right mt-1">
                        총 {telemetry.funnel_counts.total_filtered.toLocaleString()}건 필터링
                    </p>
                </div>

                {/* 5. 글로벌 국가 점유 바 */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 flex flex-col justify-between space-y-1">
                    <span className="text-[10.5px] font-mono font-bold text-slate-400 uppercase">
                        글로벌 국가 점유
                    </span>
                    <div className="space-y-1.5 text-[10.5px] font-mono">
                        <div>
                            <div className="flex justify-between text-slate-300">
                                <span>🇺🇸 미국/글로벌</span>
                                <span className="font-bold">{telemetry.geo_distribution.us_en}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-0.5">
                                <div className="bg-blue-400 h-full" style={{ width: `${telemetry.geo_distribution.us_en}%` }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-slate-300">
                                <span>🇰🇷 한국</span>
                                <span className="font-bold text-emerald-400">{telemetry.geo_distribution.kr_ko}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-0.5">
                                <div className="bg-emerald-400 h-full" style={{ width: `${telemetry.geo_distribution.kr_ko}%` }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-slate-300">
                                <span>🇯🇵 일본</span>
                                <span className="font-bold">{telemetry.geo_distribution.jp_ja}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-0.5">
                                <div className="bg-purple-400 h-full" style={{ width: `${telemetry.geo_distribution.jp_ja}%` }} />
                            </div>
                        </div>
                    </div>
                    <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between text-[9.5px] font-mono text-rose-400">
                        <span>🚫 비선호 차단</span>
                        <span>{telemetry.geo_distribution.blocked_total.toLocaleString()}건</span>
                    </div>
                </div>

                {/* 6. 실시간 체결 틱 피드 (증권사 스타일) */}
                <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-2.5 flex flex-col justify-between overflow-hidden">
                    <div className="flex items-center justify-between text-[10.5px] font-mono font-bold text-slate-400 border-b border-slate-800/80 pb-1">
                        <span>실시간 체결 틱</span>
                        <span className="flex items-center gap-1 text-[9px] text-emerald-400 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            LIVE
                        </span>
                    </div>
                    <div className="space-y-1 mt-1 overflow-hidden max-h-[82px]">
                        {telemetry.ticker_feed && telemetry.ticker_feed.length > 0 ? (
                            telemetry.ticker_feed.slice(0, 4).map((evt, eIdx) => (
                                <div key={eIdx} className="flex items-center justify-between text-[9.5px] font-mono leading-tight">
                                    <div className="flex items-center gap-1 min-w-0 flex-1 pr-1">
                                        <span className={cn(
                                            "px-1 rounded text-[8px] font-black shrink-0",
                                            evt.type === 'gem' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" :
                                            evt.type === 'lang_block' ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" :
                                            "bg-slate-800 text-slate-400"
                                        )}>
                                            {evt.tag}
                                        </span>
                                        <span className="truncate text-slate-300">{evt.text}</span>
                                    </div>
                                    <span className={cn(
                                        "font-bold shrink-0 text-[9px]",
                                        evt.type === 'gem' ? "text-emerald-400" :
                                        evt.type === 'lang_block' ? "text-rose-400" :
                                        "text-slate-400"
                                    )}>
                                        {evt.val}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-[10px] font-mono text-slate-500 text-center py-4">
                                실시간 파싱 이벤트 대기 중...
                            </p>
                        )}
                    </div>
                    <p className="text-[9px] font-mono text-slate-500 text-center pt-1 border-t border-slate-800/60">
                        백그라운드 자율 크롤링 피드
                    </p>
                </div>
            </div>
        </div>
    );
};
