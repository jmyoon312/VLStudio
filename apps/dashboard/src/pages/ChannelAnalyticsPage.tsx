import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    DollarSign,
    TrendingUp,
    Users,
    Eye,
    ArrowUpRight,
    Sparkles,
    Flame,
    AlertTriangle,
    RefreshCw,
    Play,
    CheckCircle2,
    BarChart3,
    Lock,
    Zap,
    Globe,
    ShieldCheck
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import api from '@/lib/api';

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export default function ChannelAnalyticsPage() {
    const [timeRange, setTimeRange] = useState<TimeRange>('monthly');
    const [selectedChannel, setSelectedChannel] = useState<string>('all');
    const queryClient = useQueryClient();

    // 1. 채널 성과 및 종합 지표 실시간 조회
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['channel_analytics_bi', selectedChannel, timeRange],
        queryFn: async () => {
            const res = await api.get(`/analytics/channels?channel_id=${encodeURIComponent(selectedChannel)}&time_range=${encodeURIComponent(timeRange)}`);
            return res.data;
        }
    });

    // 2. 후킹 AI 재진단 뮤테이션
    const diagnoseMutation = useMutation({
        mutationFn: async (video: { video_id: string; title: string; views: number }) => {
            const res = await api.post('/analytics/diagnose-hook', {
                video_id: video.video_id,
                title: video.title,
                retention_rate_3s: 42.0,
                retention_rate_5s: 29.0,
                views: video.views
            });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success("🧠 루피 AI가 영상 후킹을 정밀 재진단했습니다!");
            queryClient.invalidateQueries({ queryKey: ['channel_analytics_bi'] });
        },
        onError: (err: any) => {
            toast.error(`진단 실패: ${err.message || '알 수 없는 오류'}`);
        }
    });

    const summary = data?.summary || {
        views: 0,
        watch_time_hours: 0,
        estimated_revenue: 0,
        rpm: 42.0,
        production_cost: 0,
        net_profit: 0,
        roi_percentage: 0,
        subscribers: 0,
        sub_increase: 0,
        ctr: 6.8
    };

    const channels = data?.channels || [];
    const trendChart = data?.trend_chart || [];
    const viralVideos = data?.viral_videos || [];
    const underperformingVideos = data?.underperforming_videos || [];
    const activeSecurity = data?.active_security;

    const labels: Record<TimeRange, string> = {
        daily: '일간',
        weekly: '주간',
        monthly: '월간',
        quarterly: '분기',
        yearly: '연간'
    };

    return (
        <div className="space-y-6 pb-20 md:pb-8">
            {/* 상단 헤더 및 필터 컨트롤 바 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-emerald-500" />
                        <span>다채널 수익률 & 종합 BI 센터</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        일일, 주간, 월간, 분기, 연간 단위의 채널별/통합 추정 수익(RPM)과 콘텐츠 제작 원가 대비 순이익(ROI) 분석
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    {/* 채널 선택 드롭다운 */}
                    <select
                        value={selectedChannel}
                        onChange={(e) => setSelectedChannel(e.target.value)}
                        className="h-8 text-xs font-semibold rounded-lg bg-card border border-border text-foreground px-2.5 shadow-2xs focus:outline-hidden"
                    >
                        <option value="all">전체 채널 통합 보기 ({channels.length ? `${channels.length}개 채널` : '통합'})</option>
                        {channels.map((c: any) => (
                            <option key={c.id} value={c.id}>
                                {c.title || `채널 #${c.id}`} {c.security?.is_static ? '[고정 ISP]' : '[LTE]'}
                            </option>
                        ))}
                    </select>

                    {/* 채널 보안 네트워크 상태 뱃지 */}
                    {activeSecurity && (
                        <div
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                                activeSecurity.badge_type === 'isp_proxy'
                                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25'
                                    : activeSecurity.badge_type === 'lte_proxy'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                    : 'bg-muted/60 text-muted-foreground border-border'
                            }`}
                            title={activeSecurity.description}
                        >
                            {activeSecurity.badge_type === 'isp_proxy' && <Lock className="w-3.5 h-3.5" />}
                            {activeSecurity.badge_type === 'lte_proxy' && <Zap className="w-3.5 h-3.5" />}
                            {activeSecurity.badge_type === 'direct' && <Globe className="w-3.5 h-3.5" />}
                            {activeSecurity.badge_type === 'all' && <ShieldCheck className="w-3.5 h-3.5" />}
                            <span>{activeSecurity.label}</span>
                        </div>
                    )}


                    {/* 기간 탭 버튼 */}
                    <div className="flex items-center gap-1 p-1 bg-muted/40 border border-border rounded-xl">
                        {(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as TimeRange[]).map((r) => (
                            <button
                                key={r}
                                onClick={() => setTimeRange(r)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                    timeRange === r
                                        ? 'bg-background text-foreground shadow-2xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {labels[r]}
                            </button>
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="h-8 px-2.5 text-xs font-semibold rounded-lg border-border"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                        새로고침
                    </Button>
                </div>
            </div>

            {/* 4대 핵심 KPI 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <Card className="border-border bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-2xs rounded-2xl">
                    <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4 text-emerald-500" /> 총 추정 수익 (Est. Revenue)
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                                RPM ₩{summary.rpm}
                            </Badge>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                            ₩{Number(summary.estimated_revenue).toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground ml-1">원</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between pt-1 border-t border-border/60">
                            <span>전 기간 대비 추세</span>
                            <strong className="text-emerald-500 font-bold flex items-center gap-0.5">
                                <ArrowUpRight className="w-3.5 h-3.5" /> +24.8%
                            </strong>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-gradient-to-br from-indigo-500/10 via-card to-card shadow-2xs rounded-2xl">
                    <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-indigo-500" /> 순이익 & 콘텐츠 ROI
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono text-indigo-500 border-indigo-500/30 bg-indigo-500/10">
                                마진 86%
                            </Badge>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                            ₩{Number(summary.net_profit).toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground ml-1">원</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between pt-1 border-t border-border/60">
                            <span>제작원가(₩{Number(summary.production_cost).toLocaleString()}원) 대비</span>
                            <strong className="text-indigo-500 font-bold">+{summary.roi_percentage}% ROI</strong>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-gradient-to-br from-sky-500/10 via-card to-card shadow-2xs rounded-2xl">
                    <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                <Eye className="w-4 h-4 text-sky-500" /> 누적 유입 조회수
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono text-sky-500 border-sky-500/30 bg-sky-500/10">
                                CTR {summary.ctr}%
                            </Badge>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                            {Number(summary.views).toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground ml-1">회</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between pt-1 border-t border-border/60">
                            <span>총 시청 시간</span>
                            <strong className="text-sky-500 font-bold">{Number(summary.watch_time_hours).toLocaleString()} 시간</strong>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-gradient-to-br from-amber-500/10 via-card to-card shadow-2xs rounded-2xl">
                    <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-amber-500" /> 순증 구독자 성장세
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono text-amber-500 border-amber-500/30 bg-amber-500/10">
                                Growth
                            </Badge>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                            +{Number(summary.sub_increase).toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground ml-1">명</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between pt-1 border-t border-border/60">
                            <span>총 보유 구독자</span>
                            <strong className="text-amber-500 font-bold">{Number(summary.subscribers).toLocaleString()} 명</strong>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 시계열 추이 차트 (조회수 및 순이익 트렌드) */}
            <Card className="border-border bg-card rounded-2xl shadow-2xs">
                <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        기간별 조회수 & 순이익 시계열 추이
                    </CardTitle>
                    <span className="text-[11px] text-muted-foreground font-mono">단위: Views / USD</span>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendChart}>
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--background)',
                                        borderColor: 'var(--border)',
                                        borderRadius: '12px',
                                        fontSize: '12px'
                                    }}
                                />
                                <Area type="monotone" dataKey="views" name="조회수" stroke="#38bdf8" fillOpacity={1} fill="url(#colorViews)" />
                                <Area type="monotone" dataKey="net_profit" name="순이익 (₩)" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* 저조 영상 후킹 진단 & 대박 영상 성공 요인 2열 배치 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. 대박 영상 성공 DNA 분석 카드 */}
                <Card className="border-border bg-card rounded-2xl shadow-2xs">
                    <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                            <Flame className="w-4 h-4 text-orange-500" />
                            🔥 알고리즘 대박 영상 (장점 극대화 DNA)
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/30">
                            Viral Hit
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        {viralVideos.map((v: any) => (
                            <div key={v.id} className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1">{v.title}</h4>
                                    <Badge className="bg-emerald-500 text-white text-[10px] font-bold">
                                        3초 유지 {v.retention_rate_3s}%
                                    </Badge>
                                </div>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                                    <span>조회수: <strong className="text-foreground">{Number(v.views).toLocaleString()}회</strong></span>
                                    <span>후킹 점수: <strong className="text-emerald-500">{v.hook_score}점</strong></span>
                                </div>
                                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400 leading-relaxed">
                                    <strong>💡 루피의 바이럴 성공 분석:</strong><br />
                                    {v.strength_feedback}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* 2. 저조 영상 후킹 원인 진단 카드 */}
                <Card className="border-border bg-card rounded-2xl shadow-2xs">
                    <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            ⚠️ 후킹 저조 영상 진단 (약점 보완 가이드)
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                            Needs Tuning
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        {underperformingVideos.map((v: any) => (
                            <div key={v.id} className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1">{v.title}</h4>
                                    <Badge variant="destructive" className="text-[10px] font-bold">
                                        3초 유지 {v.retention_rate_3s}% (이탈)
                                    </Badge>
                                </div>
                                <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span>조회수: <strong className="text-foreground">{Number(v.views).toLocaleString()}회</strong></span>
                                        <span>후킹 점수: <strong className="text-rose-500">{v.hook_score}점</strong></span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => diagnoseMutation.mutate({ video_id: v.id, title: v.title, views: v.views })}
                                        disabled={diagnoseMutation.isPending}
                                        className="h-6 text-[10px] px-2 rounded-md border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                    >
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        루피 AI 재진단
                                    </Button>
                                </div>
                                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-600 dark:text-rose-400 leading-relaxed">
                                    <strong>🔍 초반 이탈 원인 및 대본 수정 가이드:</strong><br />
                                    {v.weakness_feedback}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
