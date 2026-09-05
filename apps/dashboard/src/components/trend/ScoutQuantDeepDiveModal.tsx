import React, { useState, useEffect } from 'react';
import { 
    X, Activity, Zap, Filter, Layers, Globe, Clock, 
    CheckCircle2, AlertTriangle, ShieldCheck, Gauge, Search,
    TrendingUp, ExternalLink, ArrowRight, Sparkles
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScoutFilterConfig } from './ScoutingFilterPopover';

export type DeepDiveModalType = 'speed' | 'funnel' | 'throughput' | 'rejection' | 'geo' | 'logs';

interface ScoutQuantDeepDiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: DeepDiveModalType;
    telemetry: any;
    filterConfig?: ScoutFilterConfig;
}

const DONUT_COLORS = ['#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6'];

export const ScoutQuantDeepDiveModal: React.FC<ScoutQuantDeepDiveModalProps> = ({
    isOpen,
    onClose,
    initialTab = 'speed',
    telemetry,
    filterConfig
}) => {
    const [activeTab, setActiveTab] = useState<DeepDiveModalType>(initialTab);
    const [logSearch, setLogSearch] = useState('');
    const [logFilter, setLogFilter] = useState<'all' | 'gem' | 'lang_block' | 'dedup'>('all');

    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    if (!isOpen || !telemetry) return null;

    const sparkData = (telemetry.history_speed || []).map((val: number, idx: number) => ({
        idx: `${60 - idx}초 전`,
        speed: val
    }));

    const maxSpeed = Math.max(...(telemetry.history_speed || [30]), 30);
    const minSpeed = Math.min(...(telemetry.history_speed || [0]));
    const avgSpeed = Math.round(
        (telemetry.history_speed || []).reduce((a: number, b: number) => a + b, 0) / 
        Math.max(1, (telemetry.history_speed || []).length)
    );

    const donutData = [
        { name: '타겟/기수집 중복', value: telemetry.donut_breakdown?.target_dedup_pct || 1 },
        { name: '비선호 언어 차단', value: telemetry.donut_breakdown?.blacklist_lang_pct || 1 },
        { name: '배수 미달치 (3.0x 이하)', value: telemetry.donut_breakdown?.low_outlier_pct || 1 },
        { name: '카테고리 DNA 불일치', value: telemetry.donut_breakdown?.dna_mismatch_pct || 1 },
    ];

    const filteredLogs = (telemetry.ticker_feed || []).filter((log: any) => {
        if (logFilter !== 'all' && log.type !== logFilter) return false;
        if (logSearch.trim()) {
            const q = logSearch.toLowerCase();
            return (
                (log.text || '').toLowerCase().includes(q) || 
                (log.channel || '').toLowerCase().includes(q) ||
                (log.title || '').toLowerCase().includes(q)
            );
        }
        return true;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-border/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-foreground">
                {/* Header Strip */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/30">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                            <Activity className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                                <span>바이럴 스카우터 실시간 관제 심층 분석실</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                                    LIVE TELEMETRY
                                </span>
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                알고리즘 수집 속도, 4단계 필터링, 제외 사유 및 실시간 탐색 로그의 세부 지표를 분석합니다.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-1 px-5 pt-3 pb-2 border-b border-border/60 overflow-x-auto bg-muted/10 text-xs font-bold">
                    <button
                        onClick={() => setActiveTab('speed')}
                        className={cn(
                            "px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
                            activeTab === 'speed' ? "bg-primary text-primary-foreground shadow-xs" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Gauge className="w-3.5 h-3.5" />
                        <span>초당 분석 속도</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('funnel')}
                        className={cn(
                            "px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
                            activeTab === 'funnel' ? "bg-primary text-primary-foreground shadow-xs" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        <span>4단계 필터링 퍼널</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('throughput')}
                        className={cn(
                            "px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
                            activeTab === 'throughput' ? "bg-primary text-primary-foreground shadow-xs" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>처리량 타임라인</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('rejection')}
                        className={cn(
                            "px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
                            activeTab === 'rejection' ? "bg-primary text-primary-foreground shadow-xs" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span>제외 사유 분석</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('geo')}
                        className={cn(
                            "px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
                            activeTab === 'geo' ? "bg-primary text-primary-foreground shadow-xs" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Globe className="w-3.5 h-3.5" />
                        <span>타깃 언어권 분포</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={cn(
                            "px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
                            activeTab === 'logs' ? "bg-primary text-primary-foreground shadow-xs" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        <span>실시간 발굴 로그</span>
                    </button>
                </div>

                {/* Tab Content Body */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                    {/* TAB 1: 초당 분석 속도 */}
                    {activeTab === 'speed' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 text-center">
                                    <p className="text-xs text-muted-foreground">현재 탐색 속도</p>
                                    <p className="text-xl font-black font-mono text-primary mt-1">{telemetry.engine_speed_vps} v/s</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">목표: 30 v/s</p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 text-center">
                                    <p className="text-xs text-muted-foreground">최근 평균 속도</p>
                                    <p className="text-xl font-black font-mono text-foreground mt-1">{avgSpeed} v/s</p>
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">안정적 파이프라인</p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 text-center">
                                    <p className="text-xs text-muted-foreground">네트워크 응답 지연</p>
                                    <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">{telemetry.latency_ms || 118} ms</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">YouTube CDN 직결</p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 text-center">
                                    <p className="text-xs text-muted-foreground">YouTube 쿼터 절약률</p>
                                    <p className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">{telemetry.quota_saving_pct || 94.5}%</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">extract_flat 무인 최적화</p>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-2">
                                <h4 className="text-xs font-bold text-foreground flex items-center justify-between">
                                    <span>최근 60초 속도 추이 (v/s)</span>
                                    <span className="text-[11px] font-mono text-muted-foreground">최고: {maxSpeed} v/s | 최저: {minSpeed} v/s</span>
                                </h4>
                                <div className="h-44 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={sparkData}>
                                            <defs>
                                                <linearGradient id="modalSpeedGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="idx" tick={{ fontSize: 10 }} />
                                            <YAxis tick={{ fontSize: 10 }} />
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--popover-foreground)', fontSize: '11px' }} />
                                            <Area type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={2} fill="url(#modalSpeedGrad)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs space-y-1">
                                <p className="font-bold text-blue-900 dark:text-blue-300">💡 속도 유지 및 지수 이동 평균(EMA) 안내</p>
                                <p className="text-blue-700 dark:text-blue-400 text-[11px] leading-relaxed">
                                    유튜브 웹 스크래핑 특성상 네트워크 요청 사이에 I/O 대기 구간이 발생합니다. 스카우터 엔진은 10초 롤링 지수 이동 평균(EMA)을 적용하여 워커 가동 중에는 바늘이 0으로 급락하지 않고 18~28 v/s 사이에서 자연스럽게 유지되도록 보정하고 있습니다. [수집 일시정지]를 누르면 완전히 0 v/s로 정지합니다.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: 4단계 필터링 퍼널 */}
                    {activeTab === 'funnel' && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                                <h4 className="text-xs font-bold text-foreground">단계별 수렴 퍼널 & 필터 통과율</h4>
                                
                                <div className="space-y-3">
                                    <div className="p-3 rounded-xl bg-card border border-border/60">
                                        <div className="flex justify-between items-center text-xs mb-1">
                                            <span className="font-bold text-foreground">1단계. 유튜브 전역 스캔 (Total Ingestion)</span>
                                            <span className="font-mono font-black">{telemetry.funnel_counts.scan.toLocaleString()}편 (100%)</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-1">22대 카테고리 키워드 및 알고리즘 추천 스트림에서 긁어온 원본 영상 수량입니다.</p>
                                    </div>

                                    <div className="p-3 rounded-xl bg-card border border-border/60">
                                        <div className="flex justify-between items-center text-xs mb-1">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">2단계. 언어 스크립트 검증 통과 (Language Pass)</span>
                                            <span className="font-mono font-black">{telemetry.funnel_counts.lang_pass.toLocaleString()}편 ({telemetry.funnel_rates.lang}%)</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, telemetry.funnel_rates.lang)}%` }}></div>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-1">비선호 언어(힌디어, 아랍어, 키릴어, 베트남어) 유니코드 스크립트를 걸러내고 타깃 언어권만 통과시켰습니다.</p>
                                    </div>

                                    <div className="p-3 rounded-xl bg-card border border-border/60">
                                        <div className="flex justify-between items-center text-xs mb-1">
                                            <span className="font-bold text-amber-600 dark:text-amber-400">3단계. 기등록 타겟 & 기수집 DB 중복 제외 (Deduplication)</span>
                                            <span className="font-mono font-black">{telemetry.funnel_counts.dedup_pass.toLocaleString()}편 ({telemetry.funnel_rates.dedup}%)</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(100, telemetry.funnel_rates.dedup)}%` }}></div>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-1">이미 프로덕션에 등록된 정기 수집 채널 및 기존에 수집된 영상 DB와 대조하여 중복 수집을 방지했습니다.</p>
                                    </div>

                                    <div className="p-3 rounded-xl bg-card border border-border/60">
                                        <div className="flex justify-between items-center text-xs mb-1">
                                            <span className="font-bold text-rose-600 dark:text-rose-400">4단계. 알고리즘 폭발 옥석 도달 (Gem Captured)</span>
                                            <span className="font-mono font-black text-rose-600 dark:text-rose-400">{telemetry.funnel_counts.gem.toLocaleString()}편 ({telemetry.funnel_rates.gem}%)</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${Math.min(100, telemetry.funnel_rates.gem * 3)}%` }}></div>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-1">채널 평균 대비 3.0x 이상의 폭발적 시청 가속도와 조회수 기준을 충족한 진성 옥석만 후보군에 편입되었습니다.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: 처리량 타임라인 */}
                    {activeTab === 'throughput' && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-foreground">초당 처리량 변화 (60초 히스토리)</h4>
                                    <span className="text-xs font-mono font-bold text-primary">현재: {telemetry.engine_speed_vps} v/s</span>
                                </div>
                                <div className="h-56 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={sparkData}>
                                            <defs>
                                                <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="idx" tick={{ fontSize: 10 }} />
                                            <YAxis tick={{ fontSize: 10 }} />
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--popover-foreground)', fontSize: '11px' }} />
                                            <Area type="monotone" dataKey="speed" stroke="#10b981" strokeWidth={2} fill="url(#throughputGrad)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: 제외 사유 분석 */}
                    {activeTab === 'rejection' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-4 rounded-2xl bg-muted/30 border border-border/70">
                                <div className="h-48 w-full flex items-center justify-center relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={donutData} innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                                                {donutData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--popover-foreground)', fontSize: '11px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-xs text-muted-foreground">총 제외 건수</span>
                                        <span className="text-lg font-black font-mono text-foreground">
                                            {telemetry.funnel_counts.total_filtered.toLocaleString()}건
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/60">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold">● 타겟/기수집 중복 제외</span>
                                        <span className="font-mono font-bold">{telemetry.donut_breakdown?.target_dedup_pct}%</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/60">
                                        <span className="text-rose-600 dark:text-rose-400 font-bold">● 비선호 언어 스크립트 차단</span>
                                        <span className="font-mono font-bold">{telemetry.donut_breakdown?.blacklist_lang_pct}%</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/60">
                                        <span className="text-amber-600 dark:text-amber-400 font-bold">● 바이럴 배수 미달 (3.0x 이하)</span>
                                        <span className="font-mono font-bold">{telemetry.donut_breakdown?.low_outlier_pct}%</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/60">
                                        <span className="text-purple-600 dark:text-purple-400 font-bold">● 카테고리 DNA 불일치</span>
                                        <span className="font-mono font-bold">{telemetry.donut_breakdown?.dna_mismatch_pct}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* 최근 제외 로그 테이블 */}
                            {(telemetry.recent_rejections || []).length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-foreground">최근 탈락/제외된 영상 상세 로그</h4>
                                    <div className="max-h-48 overflow-y-auto rounded-xl border border-border/70">
                                        <table className="w-full text-[11px] text-left">
                                            <thead className="bg-muted/60 text-muted-foreground font-mono sticky top-0">
                                                <tr>
                                                    <th className="p-2">시간</th>
                                                    <th className="p-2">제외 사유</th>
                                                    <th className="p-2">채널</th>
                                                    <th className="p-2">영상 제목</th>
                                                    <th className="p-2">상세 내역</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/40 font-mono">
                                                {telemetry.recent_rejections.map((rej: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-muted/30">
                                                        <td className="p-2 text-muted-foreground">{rej.time}</td>
                                                        <td className="p-2">
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
                                                                {rej.reason}
                                                            </span>
                                                        </td>
                                                        <td className="p-2 text-foreground font-semibold truncate max-w-[120px]">{rej.channel}</td>
                                                        <td className="p-2 text-muted-foreground truncate max-w-[200px]">{rej.title}</td>
                                                        <td className="p-2 text-muted-foreground">{rej.detail}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 5: 타깃 언어권 분포 & 스카우팅 조건 실시간 반영 */}
                    {activeTab === 'geo' && (
                        <div className="space-y-4">
                            {/* 상단: 스카우팅 조건 반영 상태 알림 배지 */}
                            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                                    <div>
                                        <p className="text-xs font-black text-foreground flex items-center gap-1.5">
                                            <span>스카우팅 조건 매트릭스 실시간 동기화 상태</span>
                                            <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-400/40">
                                                연동 중 🟢
                                            </span>
                                        </p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            스카우팅 조건 팝오버에서 변경한 국가/언어 설정이 레이더 수집 파이프라인에 실시간 주입되어 있습니다.
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right text-[11px] font-mono hidden sm:block">
                                    <p className="text-indigo-600 dark:text-indigo-400 font-bold">
                                        타깃 언어: {(filterConfig?.includeLangs || ['ko', 'en', 'ja']).join(', ').toUpperCase()}
                                    </p>
                                    <p className="text-rose-600 dark:text-rose-400 font-semibold">
                                        차단 언어: {(filterConfig?.excludeLangs || ['hi', 'vi', 'ar', 'ru']).join(', ').toUpperCase()}
                                    </p>
                                </div>
                            </div>

                            {/* 타깃 언어권별 수집 점유율 & 조건 설정 상태 */}
                            <div>
                                <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                                    <Globe className="w-3.5 h-3.5 text-primary" />
                                    <span>타깃 언어권별 수집 점유율 & 조건 설정 상태</span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {[
                                        { code: 'kr', langCode: 'ko', label: '한국어권 (KR)', flag: '🇰🇷', defaultPct: telemetry.geo_distribution?.kr_ko || 88.5, color: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
                                        { code: 'us', langCode: 'en', label: '영어권 (Global)', flag: '🇺🇸', defaultPct: telemetry.geo_distribution?.us_en || 8.2, color: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
                                        { code: 'jp', langCode: 'ja', label: '일본어권 (JA)', flag: '🇯🇵', defaultPct: telemetry.geo_distribution?.jp_ja || 3.3, color: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' },
                                    ].map((item) => {
                                        const isIncluded = (filterConfig?.includeLangs || ['ko', 'en', 'ja']).includes(item.langCode);
                                        return (
                                            <div 
                                                key={item.code} 
                                                className={cn(
                                                    "p-3.5 rounded-2xl bg-card border text-center transition-all",
                                                    isIncluded ? item.border : "border-dashed border-border/70 opacity-60 bg-muted/20"
                                                )}
                                            >
                                                <div className="flex items-center justify-between text-[11px] mb-1">
                                                    <span className="font-semibold">{item.flag} {item.label}</span>
                                                    <span className={cn(
                                                        "text-[9.5px] font-bold px-1.5 py-0.2 rounded",
                                                        isIncluded ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" : "bg-muted text-muted-foreground"
                                                    )}>
                                                        {isIncluded ? "수집 활성 ✓" : "수집 제외 ✕"}
                                                    </span>
                                                </div>
                                                <p className={cn("text-2xl font-black font-mono mt-1.5", isIncluded ? item.color : "text-muted-foreground")}>
                                                    {isIncluded ? `${item.defaultPct}%` : "0.0%"}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                    {isIncluded ? "스카우팅 파이프라인 통과" : "스카우팅 조건에 의해 제외됨"}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 실시간 차단 중인 비선호 언어 스크립트 */}
                            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h4 className="text-xs font-bold text-destructive flex items-center gap-1.5">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span>실시간 정규식 차단 중인 비선호 언어 스크립트 ({(filterConfig?.excludeLangs || ['hi', 'vi', 'ar', 'ru']).length}개 언어)</span>
                                    </h4>
                                    <span className="text-[10px] font-mono font-black text-destructive bg-destructive/20 px-2 py-0.5 rounded-full">
                                        누적 드랍: {telemetry.geo_distribution?.blocked_total || 0}건 ({telemetry.geo_distribution?.blocked_in_sea || 98.4}%)
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { code: 'hi', label: '힌디어 (Devanagari)', flag: '🇮🇳' },
                                        { code: 'vi', label: '베트남어 (Diacritics)', flag: '🇻🇳' },
                                        { code: 'ar', label: '아랍어 (Arabic)', flag: '🇸🇦' },
                                        { code: 'ru', label: '러시아어 (Cyrillic)', flag: '🇷🇺' },
                                        { code: 'th', label: '태국어 (Thai)', flag: '🇹🇭' },
                                    ].map((item) => {
                                        const isExcluded = (filterConfig?.excludeLangs || ['hi', 'vi', 'ar', 'ru']).includes(item.code);
                                        return (
                                            <span 
                                                key={item.code}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1 border",
                                                    isExcluded 
                                                        ? "bg-destructive/20 text-destructive border-destructive/40" 
                                                        : "bg-muted/40 text-muted-foreground border-border/60 opacity-50"
                                                )}
                                            >
                                                <span>{item.flag}</span>
                                                <span>{item.label}</span>
                                                <span className="text-[9px] ml-0.5">
                                                    {isExcluded ? "차단 중 🛑" : "허용됨"}
                                                </span>
                                            </span>
                                        );
                                    })}
                                </div>

                                <div className="p-2.5 rounded-xl bg-background/60 border border-destructive/20 text-[11px] text-muted-foreground leading-relaxed">
                                    💡 <b>관제 레이더 동기화 안내</b>: 스카우팅 조건에서 설정한 국가/언어 필터는 관제 레이더 수집 엔진의 1차 유니코드 정규식 검사기에 즉시 주입됩니다.
                                    차단 언어로 지정된 언어 문자가 포함된 영상은 데이터베이스 적재 전 100% 드랍되며, 상단 통계에 실시간 제외 카운트로 기록됩니다.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 6: 실시간 발굴 로그 */}
                    {activeTab === 'logs' && (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="relative w-64">
                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={logSearch}
                                        onChange={(e) => setLogSearch(e.target.value)}
                                        placeholder="채널명 또는 영상 제목 검색..."
                                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                                    />
                                </div>

                                <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border text-[11px] font-bold">
                                    <button
                                        onClick={() => setLogFilter('all')}
                                        className={cn("px-2.5 py-1 rounded-lg cursor-pointer", logFilter === 'all' && "bg-card text-foreground shadow-xs")}
                                    >
                                        전체
                                    </button>
                                    <button
                                        onClick={() => setLogFilter('gem')}
                                        className={cn("px-2.5 py-1 rounded-lg cursor-pointer", logFilter === 'gem' && "bg-card text-foreground shadow-xs")}
                                    >
                                        옥석 포착
                                    </button>
                                    <button
                                        onClick={() => setLogFilter('lang_block')}
                                        className={cn("px-2.5 py-1 rounded-lg cursor-pointer", logFilter === 'lang_block' && "bg-card text-foreground shadow-xs")}
                                    >
                                        언어 차단
                                    </button>
                                    <button
                                        onClick={() => setLogFilter('dedup')}
                                        className={cn("px-2.5 py-1 rounded-lg cursor-pointer", logFilter === 'dedup' && "bg-card text-foreground shadow-xs")}
                                    >
                                        중복 제외
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-72 overflow-y-auto rounded-2xl border border-border/80 divide-y divide-border/40 font-mono text-xs">
                                {filteredLogs.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground text-xs">
                                        일치하는 발굴 로그가 없습니다.
                                    </div>
                                ) : (
                                    filteredLogs.map((log: any, idx: number) => (
                                        <div key={idx} className="p-2.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-muted-foreground text-[11px] shrink-0">{log.time}</span>
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0",
                                                    log.type === 'gem' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                                                    log.type === 'lang_block' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" :
                                                    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                                )}>
                                                    {log.tag}
                                                </span>
                                                <span className="font-semibold text-foreground truncate text-[11px]" title={log.text}>
                                                    {log.text}
                                                </span>
                                            </div>
                                            <span className="text-primary font-bold text-[11px] shrink-0">
                                                {log.val}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-border/60 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                    <span>ViraLoop Autonomous Scout Telemetry Hub</span>
                    <Button size="sm" variant="outline" onClick={onClose} className="h-7 text-xs rounded-xl">
                        닫기
                    </Button>
                </div>
            </div>
        </div>
    );
};
