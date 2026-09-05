import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    X, Sparkles, TrendingUp, Users, DollarSign, Award, Eye, 
    Calendar, ArrowUpRight, CheckCircle2, Loader2, RefreshCw,
    Film, Zap, Play, ChevronRight, BarChart3, HelpCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { 
    ChannelGrowthAnalysis, getChannelGrowthAnalysis, 
    generateChannelAiInsight, convertChannelToTarget 
} from '../../lib/api';

interface ChannelAnatomyModalProps {
    channelId: number | null;
    channelName?: string;
    isOpen: boolean;
    onClose: () => void;
    onConverted?: (channelName: string) => void;
    onSelectVideo?: (videoId: string, title: string) => void;
}

export const ChannelAnatomyModal: React.FC<ChannelAnatomyModalProps> = ({
    channelId,
    channelName,
    isOpen,
    onClose,
    onConverted,
    onSelectVideo
}) => {
    const queryClient = useQueryClient();
    const [timeSpan, setTimeSpan] = useState<'7d' | '30d' | '90d'>('30d');
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // 1. Fetch channel growth analysis data
    const { data: analysis, isLoading, refetch } = useQuery<ChannelGrowthAnalysis>({
        queryKey: ['channel-growth-analysis', channelId, channelName, timeSpan],
        queryFn: () => getChannelGrowthAnalysis(channelId!, timeSpan, channelName),
        enabled: isOpen && (channelId !== null || !!channelName),
    });

    // 2. OmniRoute LLM AI Insight Regeneration Mutation
    const insightMutation = useMutation({
        mutationFn: async () => {
            if (!channelId) return [];
            return await generateChannelAiInsight(channelId);
        },
        onSuccess: (newInsights) => {
            queryClient.setQueryData(['channel-growth-analysis', channelId, timeSpan], (prev: any) => {
                if (!prev) return prev;
                return { ...prev, ai_insights: newInsights };
            });
        },
        onError: (err: any) => {
            alert('AI 채널 인사이트 생성 오류: ' + (err.response?.data?.detail || err.message));
        }
    });

    // 3. Human Gate: Convert to Target Channel
    const convertMutation = useMutation({
        mutationFn: async () => {
            if (!channelId) return;
            return await convertChannelToTarget(channelId);
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['channels-with-reels'] });
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            if (onConverted && analysis) {
                onConverted(analysis.name);
            }
            onClose();
            alert(data?.message || '정식 타겟 채널로 승인되었습니다! 주기적 자동 수집이 가동됩니다.');
        },
        onError: (err: any) => {
            alert('타겟 채널 전환 실패: ' + (err.response?.data?.detail || err.message));
        }
    });

    // Chart data mapping based on active timeSpan
    const activePoints = useMemo(() => {
        if (!analysis) return [];
        if (timeSpan === '7d') return analysis.chart_data_7d || [];
        if (timeSpan === '90d') return analysis.chart_data_90d || [];
        return analysis.chart_data_30d || [];
    }, [analysis, timeSpan]);

    // Active hovered point for tooltips
    const currentPoint = useMemo(() => {
        if (!activePoints.length) return null;
        if (hoveredIndex !== null && activePoints[hoveredIndex]) {
            return activePoints[hoveredIndex];
        }
        return activePoints[Math.floor(activePoints.length * 0.7)]; // default highlight
    }, [activePoints, hoveredIndex]);

    if (!isOpen) return null;

    // SVG Chart dimensions
    const lineW = 420;
    const lineH = 180;
    const padL = 40;
    const padR = 40;
    const padT = 20;
    const padB = 30;

    const barW = 420;
    const barH = 180;

    // Calculate scales for Dual-Axis Line Chart
    const maxViews = Math.max(...activePoints.map(p => p.total_views), 4000000);
    const minViews = Math.min(...activePoints.map(p => p.total_views), 0);
    const maxSubs = Math.max(...activePoints.map(p => p.subscribers), 80000);
    const minSubs = Math.min(...activePoints.map(p => p.subscribers), 0);

    const maxDaily = Math.max(...activePoints.map(p => p.daily_views), 22000);

    const getX = (idx: number) => padL + (idx / Math.max(1, activePoints.length - 1)) * (lineW - padL - padR);
    const getYViews = (v: number) => padT + (1 - (v - minViews) / Math.max(1, maxViews - minViews)) * (lineH - padT - padB);
    const getYSubs = (s: number) => padT + (1 - (s - minSubs) / Math.max(1, maxSubs - minSubs)) * (lineH - padT - padB);

    // Line paths
    const viewsPath = activePoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getYViews(p.total_views)}`).join(' ');
    const subsPath = activePoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getYSubs(p.subscribers)}`).join(' ');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-card border border-border/90 rounded-3xl shadow-2xl overflow-hidden text-foreground">
                
                {/* 1. 모달 상단 헤더 (픽셀링 스타일 헤더) */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted border border-border overflow-hidden shrink-0 shadow-xs">
                            <img 
                                src={analysis?.thumbnail_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
                                alt={analysis?.name || channelName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";
                                }}
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black tracking-tight text-foreground">
                                    {analysis?.name || channelName || '채널 분석'}
                                </h2>
                                <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shadow-xs">
                                    {analysis?.grade || 'C'}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">
                                {analysis?.handle || '@channel'} · <span className="font-semibold">{analysis?.country || 'KR'}</span>
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 2. 스크롤 본문 */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
                    {isLoading ? (
                        <div className="py-32 flex flex-col items-center justify-center space-y-3">
                            <Loader2 className="w-9 h-9 animate-spin text-blue-600" />
                            <p className="text-xs text-muted-foreground font-mono">
                                채널 성장 타임라인 및 알고리즘 모멘텀을 정밀 분석 중입니다...
                            </p>
                        </div>
                    ) : analysis ? (
                        <>
                            {/* [A] 상단 4대 팩트 카드 (구독자 / 월 추정수익 / 등급 / 총조회수) */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
                                        <Users className="w-3.5 h-3.5" />
                                        <span>구독자</span>
                                    </div>
                                    <p className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                                        {analysis.subscribers}
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
                                        <DollarSign className="w-3.5 h-3.5" />
                                        <span>월 추정 수익</span>
                                    </div>
                                    <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                                        {analysis.monthly_revenue}
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
                                        <Award className="w-3.5 h-3.5" />
                                        <span>등급</span>
                                    </div>
                                    <div className="mt-1">
                                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-blue-600 text-white font-black text-sm">
                                            {analysis.grade}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>총조회수</span>
                                    </div>
                                    <p className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
                                        {analysis.total_views}
                                    </p>
                                </div>
                            </div>

                            {/* [B] 기간 선택 탭 & 메타 안내 */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
                                        {(['7d', '30d', '90d'] as const).map(span => (
                                            <button
                                                key={span}
                                                onClick={() => setTimeSpan(span)}
                                                className={cn(
                                                    "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                                    timeSpan === span 
                                                        ? "bg-blue-600 text-white shadow-xs" 
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                {span === '7d' ? '7일' : span === '30d' ? '30일' : '90일'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono">
                                    {analysis.collection_period}
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground -mt-3">
                                {analysis.actual_data_days}
                            </p>

                            {/* [C] 기간 성장 4대 지표 카드 */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-3 rounded-2xl bg-muted/20 border border-border/70">
                                    <p className="text-[10px] text-muted-foreground font-bold">기간 조회 증가</p>
                                    <p className="text-base font-black font-mono text-foreground mt-0.5">
                                        {analysis.period_views_gain}
                                    </p>
                                    <p className="text-[9.5px] text-muted-foreground mt-0.5">최근 {timeSpan.replace('d', '')}일 누적 증가</p>
                                </div>

                                <div className="p-3 rounded-2xl bg-muted/20 border border-border/70">
                                    <p className="text-[10px] text-muted-foreground font-bold">구독자 변화</p>
                                    <p className="text-base font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                                        {analysis.subscribers_gain}
                                    </p>
                                    <p className="text-[9.5px] text-muted-foreground mt-0.5">일간 증감 +45명</p>
                                </div>

                                <div className="p-3 rounded-2xl bg-muted/20 border border-border/70">
                                    <p className="text-[10px] text-muted-foreground font-bold">평균 일간 조회</p>
                                    <p className="text-base font-black font-mono text-foreground mt-0.5">
                                        {analysis.avg_daily_views}
                                    </p>
                                    <p className="text-[9.5px] text-muted-foreground mt-0.5">최고 2.0만</p>
                                </div>

                                <div className="p-3 rounded-2xl bg-muted/20 border border-border/70">
                                    <p className="text-[10px] text-muted-foreground font-bold">현재 속도</p>
                                    <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                        <ArrowUpRight className="w-4 h-4" />
                                        {analysis.current_velocity}
                                    </p>
                                    <p className="text-[9.5px] text-emerald-500 font-bold mt-0.5">
                                        {analysis.acceleration_status} · {analysis.acceleration_rate}
                                    </p>
                                </div>
                            </div>

                            {/* [D] 픽셀링식 듀얼 차트 (좌: 누적 성장선 / 우: 일간 속도 막대) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* 1. 좌측: 누적 성장선 (Dual Axis Line Chart) */}
                                <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-xs font-black text-foreground">누적 성장선</h4>
                                        {currentPoint && (
                                            <div className="text-[10px] font-mono bg-muted/60 px-2 py-0.5 rounded-md text-foreground">
                                                <span className="text-muted-foreground mr-1">{currentPoint.date}</span>
                                                <span className="text-rose-500 font-bold mr-2">총조회: {(currentPoint.total_views / 10000).toFixed(1)}만</span>
                                                <span className="text-blue-500 font-bold">구독: {(currentPoint.subscribers / 10000).toFixed(1)}만</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* SVG 라인 차트 */}
                                    <div className="w-full overflow-hidden">
                                        <svg viewBox={`0 0 ${lineW} ${lineH}`} className="w-full h-44 select-none">
                                            {/* 가로 그리드선 */}
                                            {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
                                                const y = padT + ratio * (lineH - padT - padB);
                                                return (
                                                    <line 
                                                        key={i} 
                                                        x1={padL} y1={y} x2={lineW - padR} y2={y} 
                                                        stroke="currentColor" strokeOpacity={0.08} strokeDasharray="3 3" 
                                                    />
                                                );
                                            })}

                                            {/* 좌측 Y축 라벨 (총조회수) */}
                                            <text x={padL - 4} y={padT + 4} fill="currentColor" opacity={0.5} fontSize="9" textAnchor="end">400.0만</text>
                                            <text x={padL - 4} y={padT + (lineH - padT - padB) / 2} fill="currentColor" opacity={0.5} fontSize="9" textAnchor="end">200.0만</text>
                                            <text x={padL - 4} y={lineH - padB} fill="currentColor" opacity={0.5} fontSize="9" textAnchor="end">0</text>

                                            {/* 우측 Y축 라벨 (구독자) */}
                                            <text x={lineW - padR + 4} y={padT + 4} fill="currentColor" opacity={0.5} fontSize="9" textAnchor="start">8.0만</text>
                                            <text x={lineW - padR + 4} y={padT + (lineH - padT - padB) / 2} fill="currentColor" opacity={0.5} fontSize="9" textAnchor="start">4.0만</text>
                                            <text x={lineW - padR + 4} y={lineH - padB} fill="currentColor" opacity={0.5} fontSize="9" textAnchor="start">0</text>

                                            {/* 총조회수 라인 (빨간선) */}
                                            <path d={viewsPath} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                                            {/* 구독자 라인 (파란선) */}
                                            <path d={subsPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />

                                            {/* 하버 인디케이터 점 */}
                                            {activePoints.map((p, idx) => {
                                                if (idx % Math.ceil(activePoints.length / 5) === 0 || idx === activePoints.length - 1) {
                                                    const x = getX(idx);
                                                    const yV = getYViews(p.total_views);
                                                    const yS = getYSubs(p.subscribers);
                                                    return (
                                                        <g key={idx}>
                                                            <circle cx={x} cy={yV} r="3" fill="#ef4444" />
                                                            <circle cx={x} cy={yS} r="3" fill="#3b82f6" />
                                                            <text x={x} y={lineH - 12} fill="currentColor" opacity={0.6} fontSize="8.5" textAnchor="middle">
                                                                {p.date}
                                                            </text>
                                                        </g>
                                                    );
                                                }
                                                return null;
                                            })}

                                            {/* 마우스 인터랙션 오버레이 */}
                                            {activePoints.map((p, idx) => (
                                                <rect
                                                    key={idx}
                                                    x={getX(idx) - 8}
                                                    y={padT}
                                                    width={16}
                                                    height={lineH - padT - padB}
                                                    fill="transparent"
                                                    className="cursor-pointer"
                                                    onMouseEnter={() => setHoveredIndex(idx)}
                                                />
                                            ))}
                                        </svg>
                                    </div>

                                    {/* 하단 범례 */}
                                    <div className="flex items-center justify-center gap-5 text-[10.5px] text-muted-foreground mt-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                                            <span>총조회수</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                            <span>구독자</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. 우측: 일간 속도 (Daily Velocity Bar Chart) */}
                                <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-xs font-black text-foreground">일간 속도</h4>
                                        {currentPoint && (
                                            <div className="text-[10px] font-mono bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-md font-bold">
                                                {currentPoint.date}: {currentPoint.daily_views.toLocaleString()}회/일
                                            </div>
                                        )}
                                    </div>

                                    {/* SVG 바 차트 */}
                                    <div className="w-full overflow-hidden">
                                        <svg viewBox={`0 0 ${barW} ${barH}`} className="w-full h-44 select-none">
                                            {/* 가로 그리드선 */}
                                            {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
                                                const y = padT + ratio * (barH - padT - padB);
                                                return (
                                                    <line 
                                                        key={i} 
                                                        x1={padL} y1={y} x2={barW - 10} y2={y} 
                                                        stroke="currentColor" strokeOpacity={0.08} strokeDasharray="3 3" 
                                                    />
                                                );
                                            })}

                                            {/* Y축 라벨 */}
                                            <text x={padL - 4} y={padT + 4} fill="currentColor" opacity={0.5} fontSize="9" textAnchor="end">2.2만</text>
                                            <text x={padL - 4} y={padT + (barH - padT - padB) * 0.25} fill="currentColor" opacity={0.5} fontSize="9" textAnchor="end">1.6만</text>
                                            <text x={padL - 4} y={padT + (barH - padT - padB) * 0.5} fill="currentColor" opacity={0.5} fontSize="9" textAnchor="end">1.1만</text>
                                            <text x={padL - 4} y={padT + (barH - padT - padB) * 0.75} fill="currentColor" opacity={0.5} fontSize="9" textAnchor="end">5,500</text>
                                            <text x={padL - 4} y={barH - padB} fill="currentColor" opacity={0.5} fontSize="9" textAnchor="end">0</text>

                                            {/* 일간 속도 막대 그래프 (초록색 막대) */}
                                            {activePoints.map((p, idx) => {
                                                const x = padL + (idx / activePoints.length) * (barW - padL - 10) + 2;
                                                const bWidth = Math.max(3, (barW - padL - 10) / activePoints.length - 3);
                                                const bHeight = Math.max(4, (p.daily_views / maxDaily) * (barH - padT - padB));
                                                const y = (barH - padB) - bHeight;
                                                const isHovered = hoveredIndex === idx;

                                                return (
                                                    <g key={idx}>
                                                        <rect
                                                            x={x}
                                                            y={y}
                                                            width={bWidth}
                                                            height={bHeight}
                                                            rx={2}
                                                            className="transition-all cursor-pointer"
                                                            fill={isHovered ? "#10b981" : "#059669"}
                                                            opacity={isHovered ? 1 : 0.85}
                                                            onMouseEnter={() => setHoveredIndex(idx)}
                                                        />
                                                        {idx % Math.ceil(activePoints.length / 7) === 0 && (
                                                            <text x={x + bWidth / 2} y={barH - 12} fill="currentColor" opacity={0.6} fontSize="8.5" textAnchor="middle">
                                                                {p.date}
                                                            </text>
                                                        )}
                                                    </g>
                                                );
                                            })}
                                        </svg>
                                    </div>

                                    <div className="flex items-center justify-center text-[10px] text-muted-foreground mt-2 font-mono">
                                        <span>일간 조회수 변동 및 떡상 스파이크 발생 지점</span>
                                    </div>
                                </div>
                            </div>

                            {/* [E] 🧠 바이럴루프 특화 실전 AI 채널 해체 인사이트 */}
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-blue-500/5 to-purple-500/5 border border-indigo-500/30 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                            <Sparkles className="w-3.5 h-3.5" />
                                        </div>
                                        <h3 className="text-xs font-black text-indigo-400">
                                            바이럴루프 4대 채널 해체 분석 (AI Insight)
                                        </h3>
                                    </div>

                                    <button
                                        onClick={() => insightMutation.mutate()}
                                        disabled={insightMutation.isPending}
                                        className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                    >
                                        {insightMutation.isPending ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-3 h-3" />
                                        )}
                                        {insightMutation.isPending ? 'OmniRoute 분석 중...' : '다시 생성'}
                                    </button>
                                </div>

                                <div className="space-y-2.5">
                                    {analysis.ai_insights.map((ins, i) => (
                                        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card/60 border border-border/50">
                                            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 dark:text-blue-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                                {i + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <h5 className="text-[11.5px] font-bold text-foreground">
                                                    {ins.title}
                                                </h5>
                                                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                                                    {ins.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* [F] 최근 대표 영상 스트립 */}
                            <div className="space-y-2 pt-1">
                                <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                                    <Film className="w-3.5 h-3.5 text-blue-500" />
                                    <span>최근 대표 영상 (성장 견인 썸네일)</span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {analysis.recent_videos.map((vid, vIdx) => (
                                        <div
                                            key={vIdx}
                                            onClick={() => {
                                                if (onSelectVideo) onSelectVideo(vid.video_id, vid.title);
                                            }}
                                            className="group relative rounded-2xl overflow-hidden border border-border/80 bg-muted/20 hover:border-indigo-500/50 transition-all cursor-pointer"
                                        >
                                            <div className="aspect-video w-full overflow-hidden bg-black/40">
                                                <img 
                                                    src={vid.thumbnail_url} 
                                                    alt={vid.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => {
                                                        e.currentTarget.src = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=80";
                                                    }}
                                                />
                                            </div>
                                            <div className="p-2.5">
                                                <h5 className="text-xs font-bold text-foreground truncate group-hover:text-indigo-400 transition-colors">
                                                    {vid.title}
                                                </h5>
                                                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono mt-0.5">
                                                    <span>조회수 {vid.view_count.toLocaleString()}회</span>
                                                    {vid.outlier_ratio && (
                                                        <span className="text-amber-500 font-bold">{vid.outlier_ratio}x 🔥</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between text-[9px] font-mono pt-1 mt-1 border-t border-border/40">
                                                    <span className="text-amber-500/90 font-bold flex items-center gap-0.5" title="실제 영상 등록/업로드 일자">
                                                        📅 등록 {vid.published_at || '최근'}
                                                    </span>
                                                    <span className="text-muted-foreground flex items-center gap-0.5" title="시스템 수집 일자">
                                                        📥 수집 {vid.created_at || '수집'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="py-24 text-center text-xs text-muted-foreground">
                            채널 분석 데이터를 불러올 수 없습니다.
                        </div>
                    )}
                </div>

                {/* 3. 모달 하단 액션 푸터 */}
                <div className="flex items-center justify-between px-6 py-3.5 border-t border-border/80 bg-muted/20">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                        className="h-8 px-4 text-xs font-bold rounded-xl cursor-pointer"
                    >
                        닫기
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => convertMutation.mutate()}
                        disabled={convertMutation.isPending}
                        className="h-8 px-4 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer"
                    >
                        {convertMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        ✓ 타겟 채널 승인 & 정기수집 전환
                    </Button>
                </div>
            </div>
        </div>
    );
};
