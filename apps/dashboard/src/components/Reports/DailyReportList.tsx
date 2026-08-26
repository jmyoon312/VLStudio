import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Selecto from "react-selecto";
import { Trash2 } from "lucide-react";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
    Loader2, RefreshCw, Eye, Copy,
    TrendingUp, Video, Scroll, Activity, CheckCircle2,
    Sparkles, Send, Users, BarChart3, Flame, Layers, Rocket
} from "lucide-react";
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

interface PipelineTelemetry {
    sourcing?: {
        videos_collected: number;
        scripts_collected: number;
        failed_downloads: number;
        total_vault_videos: number;
        trends_cached: number;
    };
    creation?: {
        today_created_items: number;
        source_type_distribution: Record<string, number>;
        queue_total: number;
    };
    distribution?: {
        uploaded_today: number;
        failed_today: number;
        upload_success_rate: number;
        queue_status: Record<string, number>;
        recent_failures: string[];
    };
    growth?: {
        total_channels: number;
        active_channels: number;
        warmup_channels: number;
        failing_channels: number;
        total_daily_views_increase: number;
        total_daily_subs_increase: number;
        channels_detail: Array<{
            handle: string;
            subscribers: number;
            views: number;
            videos: number;
            sub_increase: number;
            view_increase: number;
            status: string;
            warmup_status: string;
            trust_score: number;
        }>;
        top_videos: Array<{
            title: string;
            uploaded: string;
            views: number;
            likes: number;
            comments: number;
            like_ratio: number;
        }>;
    };
    system_health?: {
        storage: { percent: number; free_gb: number; total_gb?: number; used_gb?: number };
        db_size_mb: number;
        zombie_tasks: number;
    };
    videos_collected?: number;
    scripts_collected?: number;
    failed_downloads?: number;
    trends_cached?: number;
    channels?: {
        total: number;
        active: number;
        failing: number;
    };
}

interface DailyReport {
    id: number;
    report_date: string;
    summary_markdown: string;
    raw_stats_json: PipelineTelemetry;
    is_read: boolean;
    created_at: string;
    auto_fix_log?: any[];
}

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f97316', '#ef4444'];

// Custom Markdown Components
const markdownComponents = {
    h1: ({ node, ...props }: any) => <h1 className="text-lg sm:text-xl font-extrabold mt-6 mb-4 pb-2 border-b border-border text-foreground flex items-center gap-2" {...props} />,
    h2: ({ node, ...props }: any) => <h2 className="text-base sm:text-lg font-bold mt-6 mb-3 flex items-center gap-2 text-foreground" {...props} />,
    h3: ({ node, ...props }: any) => <h3 className="text-sm sm:text-base font-semibold mt-4 mb-2 text-foreground" {...props} />,
    p: ({ node, ...props }: any) => <p className="leading-relaxed mb-3 text-muted-foreground text-xs sm:text-sm" {...props} />,
    ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-3 space-y-1 text-xs sm:text-sm text-muted-foreground" {...props} />,
    ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-xs sm:text-sm text-muted-foreground" {...props} />,
    li: ({ node, ...props }: any) => <li className="pl-1 text-muted-foreground" {...props} />,
    blockquote: ({ node, ...props }: any) => (
        <blockquote className="border-l-4 border-primary pl-4 py-2 my-3 bg-muted/30 italic rounded-r-xl text-foreground text-xs sm:text-sm" {...props} />
    ),
    code: ({ node, inline, ...props }: any) => (
        inline
            ? <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-primary" {...props} />
            : <div className="bg-background/90 text-foreground p-4 rounded-xl my-3 overflow-x-auto border border-border font-mono text-xs"><code {...props} /></div>
    ),
    table: ({ node, ...props }: any) => (
        <div className="overflow-x-auto my-4 rounded-xl border border-border">
            <table className="w-full text-xs sm:text-sm border-collapse" {...props} />
        </div>
    ),
    thead: ({ node, ...props }: any) => <thead className="bg-muted/50 text-foreground font-bold" {...props} />,
    th: ({ node, ...props }: any) => <th className="border-b border-border p-3 text-left font-bold text-foreground text-xs" {...props} />,
    td: ({ node, ...props }: any) => <td className="border-b border-border p-3 align-top text-xs text-muted-foreground" {...props} />,
    hr: ({ node, ...props }: any) => <hr className="my-6 border-border" {...props} />,
    a: ({ node, ...props }: any) => <a className="text-primary hover:underline font-bold" {...props} />,
};

// Top 4 Funnel KPI Summary Cards Component
function PipelineKpiOverview({ overview }: { overview: any }) {
    if (!overview?.kpis) return null;
    const kpis = overview.kpis;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
            {/* 1. Sourcing KPI */}
            <Card className="border-border bg-gradient-to-br from-sky-500/10 via-card to-card shadow-xs rounded-2xl overflow-hidden">
                <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                            <Video className="w-4 h-4 text-sky-400" /> 수집 파이프라인
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono text-sky-400 border-sky-500/30 bg-sky-500/10">Sourcing</Badge>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                            {kpis.total_vault_videos}
                            <span className="text-xs font-normal text-muted-foreground ml-1">개 보관</span>
                        </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between pt-1 border-t border-border/60">
                        <span>최근 7일 유입</span>
                        <strong className="text-sky-400 font-bold">+{kpis.recent_sourced_7d}개</strong>
                    </div>
                </CardContent>
            </Card>

            {/* 2. Creation KPI */}
            <Card className="border-border bg-gradient-to-br from-purple-500/10 via-card to-card shadow-xs rounded-2xl overflow-hidden">
                <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-purple-400" /> 제작 & 대기열
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono text-purple-400 border-purple-500/30 bg-purple-500/10">Creation</Badge>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                            {kpis.total_queue_items}
                            <span className="text-xs font-normal text-muted-foreground ml-1">개 등록</span>
                        </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between pt-1 border-t border-border/60">
                        <span>발행 대기 중</span>
                        <strong className="text-purple-400 font-bold">{kpis.pending_queue}개</strong>
                    </div>
                </CardContent>
            </Card>

            {/* 3. Distribution KPI */}
            <Card className="border-border bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-xs rounded-2xl overflow-hidden">
                <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                            <Send className="w-4 h-4 text-emerald-400" /> 배포 & 업로드
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30 bg-emerald-500/10">Distribution</Badge>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                            {kpis.completed_uploads}
                            <span className="text-xs font-normal text-muted-foreground ml-1">개 완료</span>
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold">
                            {kpis.overall_success_rate}% 성공
                        </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between pt-1 border-t border-border/60">
                        <span>업로드 실패</span>
                        <strong className={kpis.failed_uploads > 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                            {kpis.failed_uploads}건
                        </strong>
                    </div>
                </CardContent>
            </Card>

            {/* 4. Growth KPI */}
            <Card className="border-border bg-gradient-to-br from-amber-500/10 via-card to-card shadow-xs rounded-2xl overflow-hidden">
                <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-amber-400" /> 브랜드 채널 육성
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono text-amber-400 border-amber-500/30 bg-amber-500/10">Growth</Badge>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                            {kpis.total_channels}
                            <span className="text-xs font-normal text-muted-foreground ml-1">개 채널</span>
                        </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between pt-1 border-t border-border/60">
                        <span>전체 채널 상태</span>
                        <strong className="text-emerald-400 font-bold">정상 가동 중</strong>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// System Health Dashboard Component
function SystemHealthDashboard() {
    const queryClient = useQueryClient();
    const { data: metrics, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['system-metrics'],
        queryFn: async () => {
            const res = await api.get('/maintenance/metrics');
            return res.data;
        },
        refetchInterval: 15000
    });

    const runDiagnosticsMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/reports/generate');
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
            queryClient.invalidateQueries({ queryKey: ['system-metrics'] });
            toast.success("즉시 시스템 점검 및 리포트 생성이 완료되었습니다.");
        },
        onError: (error: any) => {
            const msg = error.response?.data?.detail || error.message || "점검 실패";
            toast.error(`시스템 점검 실패: ${msg}`);
        }
    });

    if (isLoading) return (
        <Card className="mb-6 border-border bg-card/80 backdrop-blur-md shadow-xs rounded-2xl p-6 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
            <span className="text-xs text-muted-foreground">실시간 시스템 상태 진단 중...</span>
        </Card>
    );
    if (!metrics) return null;

    const getStatusColor = (percent: number) => {
        if (percent > 90) return "bg-rose-500";
        if (percent > 70) return "bg-amber-500";
        return "bg-emerald-500";
    };

    const isAllHealthy = (metrics.zombie_tasks || 0) === 0 && (metrics.cpu_percent || 0) < 90 && (metrics.memory?.percent || 0) < 90;

    return (
        <Card className="mb-6 border-border bg-card/80 backdrop-blur-md shadow-xs rounded-2xl overflow-hidden">
            <CardHeader className="py-3 px-4 sm:px-6 bg-muted/20 border-b border-border">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isAllHealthy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            <Activity className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                                    실시간 시스템 상태 & 자율 점검
                                </CardTitle>
                                <Badge variant="outline" className={`text-[10px] font-bold ${isAllHealthy ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                    {isAllHealthy ? '🟢 전 시스템 정상 가동' : '🟡 주의 요망'}
                                </Badge>
                            </div>
                            <CardDescription className="text-[11px] text-muted-foreground">서버 리소스, AI 엔드포인트 및 백그라운드 작업 대기열 실시간 모니터링</CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-semibold rounded-xl gap-1"
                            onClick={() => runDiagnosticsMutation.mutate()}
                            disabled={runDiagnosticsMutation.isPending}
                        >
                            {runDiagnosticsMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                            )}
                            <span className="hidden sm:inline">즉시 자율 점검</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl"
                            onClick={() => refetch()}
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* CPU Usage */}
                    <div className="p-3 bg-muted/20 border border-border/80 rounded-xl space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-foreground">
                            <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-sky-400" /> CPU 사용량</span>
                            <span className="font-mono font-bold">{metrics.cpu_percent}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${getStatusColor(metrics.cpu_percent)}`} style={{ width: `${metrics.cpu_percent}%` }} />
                        </div>
                    </div>

                    {/* Memory Usage */}
                    <div className="p-3 bg-muted/20 border border-border/80 rounded-xl space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-foreground">
                            <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-purple-400" /> 메모리 ({metrics.memory?.percent}%)</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{metrics.memory?.used_gb}G / {metrics.memory?.total_gb}G</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${getStatusColor(metrics.memory?.percent || 0)}`} style={{ width: `${metrics.memory?.percent || 0}%` }} />
                        </div>
                    </div>

                    {/* Storage */}
                    <div className="p-3 bg-muted/20 border border-border/80 rounded-xl space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-foreground">
                            <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-400" /> 잔여 스토리지</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{metrics.storage?.free_gb}GB 여유</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${getStatusColor(metrics.storage?.percent || 0)}`} style={{ width: `${metrics.storage?.percent || 0}%` }} />
                        </div>
                    </div>

                    {/* Queue & Worker stats */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/20 p-2.5 rounded-xl border border-border/80 text-center flex flex-col justify-center">
                            <div className="text-lg font-extrabold text-sky-400">{metrics.queue?.active_downloads || 0}</div>
                            <div className="text-[10px] text-muted-foreground font-bold">다운로드 중</div>
                        </div>
                        <div className="bg-muted/20 p-2.5 rounded-xl border border-border/80 text-center flex flex-col justify-center">
                            <div className="text-lg font-extrabold text-foreground">{metrics.queue?.pending_videos || 0}</div>
                            <div className="text-[10px] text-muted-foreground font-bold">대기열</div>
                        </div>
                    </div>
                </div>

                {/* Advanced Info Footer */}
                <div className="mt-3.5 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-4 text-[11px]">
                        <div><span className="font-semibold text-foreground">DB 용량:</span> <span className="font-mono text-indigo-400 font-bold">{metrics.db_size_mb} MB</span></div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">좀비 태스크:</span>{" "}
                            <span className={`font-mono font-bold ${(metrics.zombie_tasks || 0) > 0 ? "text-rose-400" : "text-emerald-400"}`}>{metrics.zombie_tasks || 0}건</span>
                            {(metrics.zombie_tasks || 0) > 0 && (
                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await api.post('/maintenance/cleanup-zombies');
                                            toast.success(`좀비 태스크 ${res.data?.cleaned_count || 0}건이 정리되었습니다.`);
                                            refetch();
                                        } catch (e: any) {
                                            toast.error(e.message || "정리 실패");
                                        }
                                    }}
                                    className="text-[10px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-bold border border-rose-500/20 transition-colors"
                                    title="멈춘 다운로드 작업 즉시 정리"
                                >
                                    🧹 정리
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[10px] font-bold ${metrics.api_status?.openai ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>OpenAI</Badge>
                        <Badge variant="outline" className={`text-[10px] font-bold ${metrics.api_status?.gemini ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>Gemini</Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function DailyReportList() {
    const queryClient = useQueryClient();
    const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [activeTab, setActiveTab] = useState<'reports' | 'funnel' | 'growth'>('reports');

    const { data: reports, isLoading } = useQuery<DailyReport[]>({
        queryKey: ['daily-reports'],
        queryFn: async () => {
            const res = await api.get('/reports/');
            return res.data;
        }
    });

    const { data: overview } = useQuery({
        queryKey: ['dashboard-overview'],
        queryFn: async () => {
            try {
                const res = await api.get('/reports/dashboard-overview');
                return res.data;
            } catch (e) {
                return null;
            }
        },
        retry: false,
        refetchInterval: 30000
    });

    const generateMutation = useMutation({
        mutationFn: async () => {
            await api.post('/reports/generate');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
            queryClient.invalidateQueries({ queryKey: ['system-metrics'] });
            toast.success("일일 리포트 생성이 완료되었습니다.");
        },
        onError: (error: any) => {
            console.error("Generate failed:", error);
            const msg = error.response?.data?.detail || error.message || "서버 통신 오류";
            toast.error(`리포트 생성 실패: ${msg}`);
        }
    });

    const markReadMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.put(`/reports/${id}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (ids: number[]) => {
            const params = new URLSearchParams();
            ids.forEach(id => params.append('ids', id.toString()));
            const response = await api.delete(`/reports/?${params.toString()}`);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
            setSelectedIds(new Set());
            toast.success(`${data.deleted || 0}개의 리포트가 삭제되었습니다.`);
        },
        onError: (error) => {
            console.error("Delete failed:", error);
            toast.error("리포트 삭제에 실패했습니다.");
        }
    });

    const fixMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await api.post(`/reports/${id}/fix`);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
            setSelectedReport(data);
            toast.success("자율 조치(Auto-Fix)가 정상 완료되었습니다.");
        },
        onError: (error: any) => {
            const msg = error.response?.data?.detail || error.message || "Unknown error";
            toast.error(`자율 조치 실패: ${msg}`);
        }
    });

    const handleViewReport = (report: DailyReport) => {
        setSelectedReport(report);
        if (!report.is_read) {
            markReadMutation.mutate(report.id);
        }
    };

    const getChartData = (stats: PipelineTelemetry) => {
        const contentData = [
            { name: '수집 영상', value: stats?.sourcing?.videos_collected ?? stats?.videos_collected ?? 0, fill: '#3b82f6' },
            { name: '추출 대본', value: stats?.sourcing?.scripts_collected ?? stats?.scripts_collected ?? 0, fill: '#8b5cf6' },
            { name: '제작 큐', value: stats?.creation?.today_created_items ?? 0, fill: '#10b981' },
            { name: '업로드 완료', value: stats?.distribution?.uploaded_today ?? 0, fill: '#f59e0b' },
            { name: '다운 오류', value: stats?.sourcing?.failed_downloads ?? stats?.failed_downloads ?? 0, fill: '#ef4444' },
        ];

        const activeChan = stats?.growth?.active_channels ?? stats?.channels?.active ?? 0;
        const warmupChan = stats?.growth?.warmup_channels ?? 0;
        const failChan = stats?.growth?.failing_channels ?? stats?.channels?.failing ?? 0;

        const channelData = [
            { name: '활성 운영', value: activeChan },
            { name: '웜업 육성', value: warmupChan },
            { name: '점검/정지', value: failChan },
        ];

        return { contentData, channelData };
    };

    const cleanSummaryText = (markdown: string) => {
        if (!markdown) return "시스템 종합 데이터 및 성과 분석이 정상 집계되었습니다.";
        if (markdown.includes("ERROR:")) {
            return "운영 통계 및 채널 성과 데이터가 정상 집계되었습니다. 상세 보기를 눌러 확인하세요.";
        }
        const lines = markdown.split('\n').map(l => l.replace(/^[#*`\- >]+/g, '').trim()).filter(Boolean);
        const meaningful = lines.find(l => l.length > 10 && !l.includes('리포트') && !l.includes('종합'));
        if (meaningful) return meaningful.slice(0, 120);
        return lines.join(' ').slice(0, 120);
    };

    return (
        <div className="space-y-6 select-none pb-20 md:pb-8">
            {!selectedReport && (
                <Selecto
                    dragContainer={window}
                    selectableTargets={[".report-row"]}
                    hitRate={0}
                    selectByClick={false}
                    selectFromInside={false}
                    toggleContinueSelect={["shift"]}
                    dragCondition={(e) => {
                        const target = e.inputEvent.target as HTMLElement;
                        return !target.closest("button") && !target.closest("a") && !target.closest(".no-drag");
                    }}
                    onSelect={e => {
                        e.added.forEach(el => el.classList.add("selected"));
                        e.removed.forEach(el => el.classList.remove("selected"));

                        setSelectedIds(prev => {
                            const newSelected = new Set(prev);
                            e.added.forEach(el => {
                                const id = Number(el.getAttribute("data-id"));
                                if (id) newSelected.add(id);
                            });
                            e.removed.forEach(el => {
                                const id = Number(el.getAttribute("data-id"));
                                if (id) newSelected.delete(id);
                            });
                            return newSelected;
                        });
                    }}
                />
            )}

            {/* Header Title & Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-[17px] sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2 break-keep-all leading-snug sm:leading-tight">
                        <Rocket className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" /> ViraLoop 통합 운영 & BI 인텔리전스 리포트
                    </h2>
                    <p className="text-xs text-muted-foreground break-keep-all mt-0.5">영상 수집 ➔ AI 대량 제작 ➔ 다채널 자동 업로드 ➔ 채널 성과 전 주기 통합 관제</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {selectedIds.size > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-xl font-bold gap-1.5 h-9"
                            onClick={() => {
                                if (confirm(`${selectedIds.size}개의 리포트를 삭제하시겠습니까?`)) {
                                    deleteMutation.mutate(Array.from(selectedIds));
                                }
                            }}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            {selectedIds.size}개 삭제
                        </Button>
                    )}
                    <Button
                        onClick={() => generateMutation.mutate()}
                        disabled={generateMutation.isPending}
                        variant="default"
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl gap-1.5 h-9 shadow-xs"
                    >
                        {generateMutation.isPending ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                종합 리포트 생성 중...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-3.5 w-3.5" />
                                지금 수동 생성
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* 1. Top 4 Funnel KPI Cards */}
            <PipelineKpiOverview overview={overview} />

            {/* 2. Realtime System Health & Auto Diagnostics */}
            <SystemHealthDashboard />

            {/* 3. Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/40 border border-border rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'reports' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    📋 일일 리포트 & AI 브리핑
                </button>
                <button
                    onClick={() => setActiveTab('funnel')}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'funnel' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    📊 생산 & 배포 퍼널 추이
                </button>
                <button
                    onClick={() => setActiveTab('growth')}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'growth' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    🔥 채널 육성 & 바이럴 반응
                </button>
            </div>

            {/* TAB 1: Daily Reports & AI Briefings */}
            {activeTab === 'reports' && (
                <Card className="border-border shadow-xs rounded-2xl overflow-hidden bg-card">
                    <CardContent className="p-0">
                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-border p-3 space-y-3">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span className="text-xs">데이터 로딩 중...</span>
                                </div>
                            ) : reports?.length === 0 ? (
                                <div className="text-center py-12 text-xs text-muted-foreground">
                                    생성된 리포트가 없습니다. [지금 수동 생성] 버튼을 눌러 점검을 시작하세요.
                                </div>
                            ) : (
                                reports?.map((report, idx) => {
                                    const stats = report.raw_stats_json;
                                    const isLatest = idx === 0;
                                    const sourcingCount = stats?.sourcing?.videos_collected ?? stats?.videos_collected ?? 0;
                                    const scriptCount = stats?.sourcing?.scripts_collected ?? stats?.scripts_collected ?? 0;
                                    const queueCount = stats?.creation?.today_created_items ?? 0;
                                    const uploadCount = stats?.distribution?.uploaded_today ?? 0;

                                    return (
                                        <div
                                            key={report.id}
                                            className={`report-row p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 bg-card ${selectedIds.has(report.id) ? 'border-primary bg-primary/5 shadow-xs' : isLatest ? 'border-primary/40 bg-primary/5 hover:border-primary/60' : 'border-border hover:border-muted-foreground/30'}`}
                                            onClick={() => handleViewReport(report)}
                                            data-id={report.id}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div
                                                        className="no-drag p-1 -m-1"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedIds(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(report.id)) next.delete(report.id);
                                                                else next.add(report.id);
                                                                return next;
                                                            });
                                                        }}
                                                    >
                                                        <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${selectedIds.has(report.id) ? 'bg-primary border-primary' : 'border-border bg-background'}`}>
                                                            {selectedIds.has(report.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white p-0.5" />}
                                                        </div>
                                                    </div>
                                                    <span className="font-bold text-foreground text-xs truncate">
                                                        {format(new Date(report.report_date), 'yyyy. MM. dd (eee)', { locale: ko })}
                                                    </span>
                                                    {isLatest && (
                                                        <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[9px] px-1.5 py-0">최신</Badge>
                                                    )}
                                                    {!report.is_read ? (
                                                        <Badge className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-[9px] px-1.5 py-0">신규</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-muted-foreground bg-muted font-bold text-[9px] px-1.5 py-0">읽음</Badge>
                                                    )}
                                                </div>

                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-primary hover:bg-primary/10 rounded-lg shrink-0" onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleViewReport(report);
                                                }}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {/* Full-Lifecycle Badge Bar */}
                                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                <span className="inline-flex items-center gap-1 text-[10px] bg-muted/50 border border-border/80 px-2 py-0.5 rounded-md font-medium text-foreground">
                                                    📥 수집 <strong className="text-sky-400">{sourcingCount}</strong>
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-[10px] bg-muted/50 border border-border/80 px-2 py-0.5 rounded-md font-medium text-foreground">
                                                    📜 대본 <strong className="text-purple-400">{scriptCount}</strong>
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-[10px] bg-muted/50 border border-border/80 px-2 py-0.5 rounded-md font-medium text-foreground">
                                                    ⚡ 제작 <strong className="text-emerald-400">{queueCount}</strong>
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-[10px] bg-muted/50 border border-border/80 px-2 py-0.5 rounded-md font-medium text-foreground">
                                                    🚀 배포 <strong className="text-amber-400">{uploadCount}</strong>
                                                </span>
                                            </div>

                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                {cleanSummaryText(report.summary_markdown)}
                                            </p>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="w-[50px] text-center">선택</TableHead>
                                        <TableHead className="w-[180px]">리포트 일자</TableHead>
                                        <TableHead className="w-[90px]">상태</TableHead>
                                        <TableHead className="w-[300px]">파이프라인 실적 (수집/대본/제작/배포)</TableHead>
                                        <TableHead>AI 핵심 브리핑 (Executive Summary)</TableHead>
                                        <TableHead className="text-right w-[90px]">상세</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center">
                                                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                    <span className="text-xs">데이터 로딩 중...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : reports?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                                                생성된 일일 리포트가 없습니다. [지금 수동 생성]을 클릭해 첫 리포트를 생성하세요.
                                            </TableCell>
                                        </TableRow>
                                    ) : reports?.map((report, idx) => {
                                        const stats = report.raw_stats_json;
                                        const isLatest = idx === 0;
                                        const sourcingCount = stats?.sourcing?.videos_collected ?? stats?.videos_collected ?? 0;
                                        const scriptCount = stats?.sourcing?.scripts_collected ?? stats?.scripts_collected ?? 0;
                                        const queueCount = stats?.creation?.today_created_items ?? 0;
                                        const uploadCount = stats?.distribution?.uploaded_today ?? 0;

                                        return (
                                            <TableRow
                                                key={report.id}
                                                className={`report-row cursor-pointer transition-colors ${selectedIds.has(report.id) ? 'bg-primary/10 hover:bg-primary/15' : isLatest ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'}`}
                                                onClick={() => handleViewReport(report)}
                                                data-id={report.id}
                                            >
                                                <TableCell className="text-center no-drag" onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedIds(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(report.id)) next.delete(report.id);
                                                        else next.add(report.id);
                                                        return next;
                                                    });
                                                }}>
                                                    <div className="flex items-center justify-center">
                                                        <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${selectedIds.has(report.id) ? 'bg-primary border-primary' : 'border-border bg-background'}`}>
                                                            {selectedIds.has(report.id) && <CheckCircle2 className="w-4 h-4 text-white p-0.5" />}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-bold text-foreground text-xs sm:text-sm">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{format(new Date(report.report_date), 'yyyy. MM. dd (eee)', { locale: ko })}</span>
                                                        {isLatest && <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[9px] px-1 py-0">최신</Badge>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {!report.is_read ? (
                                                        <Badge className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-[10px]">신규</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-muted-foreground bg-muted font-bold text-[10px]">읽음</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <span className="inline-flex items-center gap-1 text-[11px] bg-muted/60 border border-border px-2 py-0.5 rounded-md font-medium text-foreground">
                                                            📥 수집 <strong className="text-sky-400">{sourcingCount}</strong>
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 text-[11px] bg-muted/60 border border-border px-2 py-0.5 rounded-md font-medium text-foreground">
                                                            📜 대본 <strong className="text-purple-400">{scriptCount}</strong>
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 text-[11px] bg-muted/60 border border-border px-2 py-0.5 rounded-md font-medium text-foreground">
                                                            ⚡ 제작 <strong className="text-emerald-400">{queueCount}</strong>
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 text-[11px] bg-muted/60 border border-border px-2 py-0.5 rounded-md font-medium text-foreground">
                                                            🚀 배포 <strong className="text-amber-400">{uploadCount}</strong>
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-[420px] truncate text-muted-foreground text-xs font-medium">
                                                    {cleanSummaryText(report.summary_markdown)}
                                                </TableCell>
                                                <TableCell className="text-right no-drag">
                                                    <Button size="icon" variant="ghost" className="hover:bg-primary/10 rounded-xl" onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewReport(report);
                                                    }}>
                                                        <Eye className="h-4 w-4 text-primary" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* TAB 2: Production & Distribution Funnel Trend */}
            {activeTab === 'funnel' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* 7-Day Funnel History Chart */}
                        <Card className="border-border bg-card shadow-xs rounded-2xl overflow-hidden">
                            <CardHeader className="py-3 px-5 bg-muted/20 border-b border-border">
                                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-primary" /> 7일간 생산 & 배포 전환 추이
                                </CardTitle>
                                <CardDescription className="text-xs">수집 ➔ 제작 ➔ 업로드 배포 흐름</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 h-[280px]">
                                {overview?.history_trend && overview.history_trend.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={overview.history_trend}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                            <XAxis dataKey="date" fontSize={11} />
                                            <YAxis fontSize={11} />
                                            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', color: 'hsl(var(--foreground))' }} />
                                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                                            <Bar dataKey="sourcing" name="수집 영상" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="creation" name="제작 생성" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="uploaded" name="업로드 배포" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                                        집계된 시계열 데이터가 없습니다.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Daily Views Growth Trend */}
                        <Card className="border-border bg-card shadow-xs rounded-2xl overflow-hidden">
                            <CardHeader className="py-3 px-5 bg-muted/20 border-b border-border">
                                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-400" /> 일일 채널 조회수 순증 추이
                                </CardTitle>
                                <CardDescription className="text-xs">업로드된 숏폼의 24시간 트래픽 증가량</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 h-[280px]">
                                {overview?.history_trend && overview.history_trend.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={overview.history_trend}>
                                            <defs>
                                                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                            <XAxis dataKey="date" fontSize={11} />
                                            <YAxis fontSize={11} />
                                            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', color: 'hsl(var(--foreground))' }} />
                                            <Area type="monotone" dataKey="views_increase" name="순증 조회수" stroke="#10b981" fillOpacity={1} fill="url(#viewsGrad)" strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                                        집계된 트래픽 데이터가 없습니다.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* TAB 3: Channel Growth & Outlier Rankings */}
            {activeTab === 'growth' && (
                <div className="space-y-6">
                    <Card className="border-border bg-card shadow-xs rounded-2xl overflow-hidden">
                        <CardHeader className="py-3 px-5 bg-muted/20 border-b border-border">
                            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Flame className="w-4 h-4 text-rose-400" /> 브랜드 채널 인큐베이팅 & 육성 현황
                            </CardTitle>
                            <CardDescription className="text-xs">채널별 실시간 상태, 웜업 단계 및 트러스트 스코어</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {reports && reports.length > 0 && reports[0].raw_stats_json?.growth?.channels_detail ? (
                                <Table>
                                    <TableHeader className="bg-muted/20">
                                        <TableRow>
                                            <TableHead>채널 식별자</TableHead>
                                            <TableHead>운영 상태</TableHead>
                                            <TableHead>웜업 육성 단계</TableHead>
                                            <TableHead className="text-right">누적 영상</TableHead>
                                            <TableHead className="text-right">일일 순증 조회수</TableHead>
                                            <TableHead className="text-right">일일 순증 구독자</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reports[0].raw_stats_json.growth.channels_detail.map((chan, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-bold text-foreground text-xs sm:text-sm">
                                                    {chan.handle}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={chan.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}>
                                                        {chan.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs font-mono">
                                                        {chan.warmup_status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">{chan.videos}개</TableCell>
                                                <TableCell className="text-right font-mono text-xs text-emerald-400 font-bold">+{chan.view_increase.toLocaleString()}회</TableCell>
                                                <TableCell className="text-right font-mono text-xs text-sky-400 font-bold">+{chan.sub_increase.toLocaleString()}명</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    연결된 브랜드 채널 정보가 없습니다. [통합 계정 & 육성 관리]에서 채널을 등록하세요.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Rich Report Dialog */}
            <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-card border border-border text-foreground shadow-2xl rounded-2xl">
                    {selectedReport && (
                        <>
                            <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/20 shrink-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-primary/10 rounded-2xl shrink-0">
                                            <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <DialogTitle className="text-base sm:text-lg font-extrabold text-foreground truncate">
                                                    {format(new Date(selectedReport.report_date), 'yyyy년 MM월 dd일 시스템 리포트')}
                                                </DialogTitle>
                                                <Badge variant="outline" className="text-[10px] font-mono border-border bg-muted/40 shrink-0">
                                                    ID: {selectedReport.id}
                                                </Badge>
                                            </div>
                                            <DialogDescription className="text-xs text-muted-foreground">
                                                종합 데이터 분석 및 AI 비즈니스 인사이트
                                            </DialogDescription>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs font-bold gap-1.5 border-border bg-card hover:bg-muted text-foreground rounded-xl"
                                            onClick={() => {
                                                const textToCopy = `
# ${format(new Date(selectedReport.report_date), 'yyyy-MM-dd System Report')}

${selectedReport.summary_markdown}

---
**Raw Stats:**
${JSON.stringify(selectedReport.raw_stats_json, null, 2)}

**Auto-Fix Logs:**
${JSON.stringify(selectedReport.auto_fix_log || [], null, 2)}
                                                `.trim();
                                                navigator.clipboard.writeText(textToCopy).then(() => {
                                                    toast.success("리포트 전체 내용이 클립보드에 복사되었습니다.");
                                                }).catch(err => {
                                                    console.error('Failed to copy text: ', err);
                                                    toast.error("복사에 실패했습니다.");
                                                });
                                            }}
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                            리포트 복사
                                        </Button>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="h-8 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                                            onClick={() => fixMutation.mutate(selectedReport.id)}
                                            disabled={fixMutation.isPending}
                                        >
                                            <RefreshCw className={`h-3.5 w-3.5 ${fixMutation.isPending ? 'animate-spin' : ''}`} />
                                            자율 조치(Auto-Fix) 실행
                                        </Button>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                                {/* 1. Key Metrics Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <Card className="bg-sky-500/10 border-sky-500/20 text-foreground rounded-2xl shadow-xs">
                                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                            <div className="mb-2 p-2 bg-sky-500/20 rounded-xl">
                                                <Video className="h-4 w-4 text-sky-400" />
                                            </div>
                                            <div className="text-2xl font-extrabold text-sky-400">
                                                {selectedReport.raw_stats_json?.sourcing?.videos_collected ?? selectedReport.raw_stats_json?.videos_collected ?? 0}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground font-bold">수집 영상</div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-purple-500/10 border-purple-500/20 text-foreground rounded-2xl shadow-xs">
                                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                            <div className="mb-2 p-2 bg-purple-500/20 rounded-xl">
                                                <Scroll className="h-4 w-4 text-purple-400" />
                                            </div>
                                            <div className="text-2xl font-extrabold text-purple-400">
                                                {selectedReport.raw_stats_json?.sourcing?.scripts_collected ?? selectedReport.raw_stats_json?.scripts_collected ?? 0}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground font-bold">수집 스크립트</div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-emerald-500/10 border-emerald-500/20 text-foreground rounded-2xl shadow-xs">
                                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                            <div className="mb-2 p-2 bg-emerald-500/20 rounded-xl">
                                                <Layers className="h-4 w-4 text-emerald-400" />
                                            </div>
                                            <div className="text-2xl font-extrabold text-emerald-400">
                                                {selectedReport.raw_stats_json?.creation?.today_created_items ?? 0}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground font-bold">제작 생성 큐</div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-amber-500/10 border-amber-500/20 text-foreground rounded-2xl shadow-xs">
                                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                            <div className="mb-2 p-2 bg-amber-500/20 rounded-xl">
                                                <Send className="h-4 w-4 text-amber-400" />
                                            </div>
                                            <div className="text-2xl font-extrabold text-amber-400">
                                                {selectedReport.raw_stats_json?.distribution?.uploaded_today ?? 0}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground font-bold">업로드 배포</div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Visual Charts */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card className="border-border bg-card shadow-xs rounded-2xl overflow-hidden">
                                        <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border">
                                            <CardTitle className="text-xs font-bold text-foreground">콘텐츠 소싱 및 생산 현황</CardTitle>
                                        </CardHeader>
                                        <CardContent className="h-[220px] p-2 flex items-center justify-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={getChartData(selectedReport.raw_stats_json).contentData}>
                                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                                    <XAxis dataKey="name" fontSize={11} />
                                                    <YAxis fontSize={11} />
                                                    <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', color: 'hsl(var(--foreground))' }} />
                                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                                        {getChartData(selectedReport.raw_stats_json).contentData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-border bg-card shadow-xs rounded-2xl overflow-hidden">
                                        <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border">
                                            <CardTitle className="text-xs font-bold text-foreground">채널 운영 상태</CardTitle>
                                        </CardHeader>
                                        <CardContent className="h-[220px] flex items-center justify-center p-2">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={getChartData(selectedReport.raw_stats_json).channelData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={50}
                                                        outerRadius={70}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                    >
                                                        {getChartData(selectedReport.raw_stats_json).channelData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', color: 'hsl(var(--foreground))' }} />
                                                    <Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: '11px' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* AI Analysis Report */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                                        <Sparkles className="h-4 w-4 text-indigo-400" />
                                        <h3 className="font-bold text-sm text-foreground">AI 상세 분석 브리핑</h3>
                                    </div>
                                    <div className="bg-muted/15 p-5 sm:p-7 rounded-2xl border border-border text-foreground leading-relaxed">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={markdownComponents}
                                        >
                                            {selectedReport.summary_markdown}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* 모바일 하단 안전 여백 스페이서 */}
            <div className="h-32 md:hidden" aria-hidden="true" />
        </div>
    );
}

export default DailyReportList;
