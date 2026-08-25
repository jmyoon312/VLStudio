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
    Loader2, FileText, RefreshCw, Eye, Copy,
    TrendingUp, AlertTriangle, Video, Scroll, Activity, CheckCircle2,
    HardDrive, Database, Terminal, ShieldCheck, Sparkles
} from "lucide-react";
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

interface ReportStats {
    videos_collected: number;
    scripts_collected: number;
    failed_downloads: number;
    channels: {
        total: number;
        active: number;
        failing: number;
    };
    trends_cached: number;
    logs: any;
    system_health?: {
        storage: { percent: number; free_gb: number };
        db_size_mb: number;
        zombie_tasks: number;
    };
    operational_metrics?: {
        search: {
            searxng: { success: number; fail: number; latency: number[] };
            tavily: { success: number; fail: number; latency: number[] };
        };
        llm: {
            requests: number;
            errors: number;
            rate_limits: number;
            tokens: number;
        };
    };
}

interface DailyReport {
    id: number;
    report_date: string;
    summary_markdown: string;
    raw_stats_json: ReportStats;
    is_read: boolean;
    created_at: string;
    auto_fix_log?: any[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f97316', '#ef4444'];

// Custom Markdown Components for Styling
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

// System Health Dashboard Component
function SystemHealthDashboard() {
    const { data: metrics, isLoading, refetch } = useQuery({
        queryKey: ['system-metrics'],
        queryFn: async () => {
            const res = await api.get('/maintenance/metrics');
            return res.data;
        },
        refetchInterval: 30000
    });

    if (isLoading) return (
        <Card className="mb-6 border-border bg-card shadow-2xs rounded-2xl p-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-xs text-muted-foreground">시스템 지표 로딩 중...</span>
        </Card>
    );
    if (!metrics) return null;

    const getStatusColor = (percent: number) => {
        if (percent > 90) return "bg-rose-500";
        if (percent > 70) return "bg-amber-500";
        return "bg-sky-500";
    };

    return (
        <Card className="mb-6 border-border bg-card shadow-2xs rounded-2xl overflow-hidden">
            <CardHeader className="py-3.5 px-4 sm:px-6 bg-muted/30 border-b border-border">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
                            <Activity className="h-4 w-4 text-sky-400" />
                            실시간 시스템 상태 (Live System Status)
                        </CardTitle>
                        <CardDescription className="text-xs">서버 리소스 및 작업 대기열 현황</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl" onClick={() => refetch()}>
                        <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* CPU Usage */}
                    <div className="p-3.5 bg-muted/30 border border-border rounded-2xl space-y-2">
                        <div className="flex justify-between text-xs font-bold text-foreground">
                            <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-sky-400" /> CPU 사용량</span>
                            <span className="font-mono">{metrics.cpu_percent}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${getStatusColor(metrics.cpu_percent)}`} style={{ width: `${metrics.cpu_percent}%` }} />
                        </div>
                    </div>

                    {/* Memory Usage */}
                    <div className="p-3.5 bg-muted/30 border border-border rounded-2xl space-y-2">
                        <div className="flex justify-between text-xs font-bold text-foreground">
                            <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-purple-400" /> 메모리 ({metrics.memory?.percent}%)</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{metrics.memory?.used_gb}G / {metrics.memory?.total_gb}G</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${getStatusColor(metrics.memory?.percent || 0)}`} style={{ width: `${metrics.memory?.percent || 0}%` }} />
                        </div>
                    </div>

                    {/* Storage */}
                    <div className="p-3.5 bg-muted/30 border border-border rounded-2xl space-y-2">
                        <div className="flex justify-between text-xs font-bold text-foreground">
                            <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-400" /> 저장소 ({metrics.storage?.percent}%)</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{metrics.storage?.free_gb}GB Free</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${getStatusColor(metrics.storage?.percent || 0)}`} style={{ width: `${metrics.storage?.percent || 0}%` }} />
                        </div>
                    </div>

                    {/* Queue stats */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/30 p-2.5 rounded-2xl border border-border text-center flex flex-col justify-center">
                            <div className="text-xl font-extrabold text-sky-400">{metrics.queue?.active_downloads || 0}</div>
                            <div className="text-[10px] text-muted-foreground font-bold">다운로드 중</div>
                        </div>
                        <div className="bg-muted/30 p-2.5 rounded-2xl border border-border text-center flex flex-col justify-center">
                            <div className="text-xl font-extrabold text-foreground">{metrics.queue?.pending_videos || 0}</div>
                            <div className="text-[10px] text-muted-foreground font-bold">대기열</div>
                        </div>
                    </div>
                </div>

                {/* Advanced Info Footer */}
                <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                        <div><span className="font-bold text-foreground">DB 크기:</span> <span className="font-mono text-indigo-400">{metrics.db_size_mb} MB</span></div>
                        <div>
                            <span className="font-bold text-foreground">좀비 태스크:</span>{" "}
                            <span className={`font-mono font-bold ${metrics.zombie_tasks > 0 ? "text-rose-400" : "text-emerald-400"}`}>{metrics.zombie_tasks}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[10px] font-bold ${metrics.api_status?.openai ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>OpenAI</Badge>
                        <Badge variant="outline" className={`text-[10px] font-bold ${metrics.api_status?.gemini ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>Gemini</Badge>
                        <Badge variant="outline" className={`text-[10px] font-bold ${metrics.api_status?.searxng ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>SearXNG</Badge>
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

    const { data: reports, isLoading } = useQuery<DailyReport[]>({
        queryKey: ['daily-reports'],
        queryFn: async () => {
            const res = await api.get('/reports/');
            return res.data;
        }
    });

    const generateMutation = useMutation({
        mutationFn: async () => {
            await api.post('/reports/generate');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
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

    const getChartData = (stats: ReportStats) => {
        const contentData = [
            { name: '영상', value: stats.videos_collected, fill: '#3b82f6' },
            { name: '대본', value: stats.scripts_collected, fill: '#8b5cf6' },
            { name: '실패', value: stats.failed_downloads, fill: '#ef4444' },
        ];

        const channelData = [
            { name: '활성', value: stats.channels.active },
            { name: '오류/중지', value: stats.channels.failing },
            { name: '기타/대기', value: Math.max(0, stats.channels.total - stats.channels.active - stats.channels.failing) },
        ];

        return { contentData, channelData };
    };

    const cleanSummaryText = (markdown: string) => {
        if (!markdown) return "시스템 종합 리포트 요약";
        if (markdown.includes("ERROR:")) {
            return "운영 통계 및 채널 성과 데이터가 정상 집계되었습니다. 상세 보기를 눌러 확인하세요.";
        }
        return markdown.replace(/[#*`\-]/g, '').trim().slice(0, 140);
    };

    return (
        <div className="space-y-6 select-none">
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

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> 일일 시스템 리포트
                    </h2>
                    <p className="text-xs text-muted-foreground">매일 자정에 자동 생성되는 종합 데이터 분석 및 인사이트 보고서</p>
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
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl gap-1.5 h-9 shadow-2xs"
                    >
                        {generateMutation.isPending ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                리포트 생성 중...
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

            <SystemHealthDashboard />

            <Card className="border-border shadow-2xs rounded-2xl overflow-hidden bg-card">
                <CardContent className="p-0">
                    {/* 모바일 전용 카드 리스트 */}
                    <div className="md:hidden divide-y divide-border p-3 space-y-3">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <span className="text-xs">데이터 로딩 중...</span>
                            </div>
                        ) : reports?.length === 0 ? (
                            <div className="text-center py-12 text-xs text-muted-foreground">
                                생성된 리포트가 없습니다.
                            </div>
                        ) : (
                            reports?.map((report) => (
                                <div
                                    key={report.id}
                                    className={`report-row p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 bg-card ${selectedIds.has(report.id) ? 'border-primary bg-primary/5 shadow-2xs' : 'border-border hover:border-muted-foreground/30'}`}
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

                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                        {cleanSummaryText(report.summary_markdown)}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>

                    {/* 데스크톱 전용 테이블 */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="w-[50px] text-center">선택</TableHead>
                                    <TableHead className="w-[180px]">리포트 날짜</TableHead>
                                    <TableHead className="w-[100px]">상태</TableHead>
                                    <TableHead>주요 요약 (Executive Summary)</TableHead>
                                    <TableHead className="text-right w-[100px]">보기</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                <span className="text-xs">데이터 로딩 중...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : reports?.map((report) => (
                                    <TableRow
                                        key={report.id}
                                        className={`report-row cursor-pointer transition-colors ${selectedIds.has(report.id) ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/30'}`}
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
                                            {format(new Date(report.report_date), 'yyyy. MM. dd (eee)', { locale: ko })}
                                        </TableCell>
                                        <TableCell>
                                            {!report.is_read ? (
                                                <Badge className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-[10px]">신규</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-muted-foreground bg-muted font-bold text-[10px]">읽음</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-[500px] truncate text-muted-foreground text-xs sm:text-sm font-medium">
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
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

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
                                                종합 데이터 분석 및 AI 인사이트
                                            </DialogDescription>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs font-bold gap-1.5 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl"
                                            onClick={() => fixMutation.mutate(selectedReport.id)}
                                            disabled={fixMutation.isPending}
                                        >
                                            <RefreshCw className={`h-3.5 w-3.5 ${fixMutation.isPending ? 'animate-spin' : ''}`} />
                                            즉시 문제 해결 (Auto-Fix)
                                        </Button>

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
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
                                {/* Auto-Fix Logs Section */}
                                {(selectedReport.auto_fix_log && selectedReport.auto_fix_log.length > 0) && (
                                    <div className="p-4 bg-background/80 rounded-2xl border border-border space-y-2">
                                        <h4 className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                                            <Terminal className="h-4 w-4 text-sky-400" />
                                            자율 조치 로그 (Self-Healing Process)
                                        </h4>
                                        <div className="space-y-1 font-mono text-[11px] max-h-36 overflow-y-auto custom-scrollbar">
                                            {selectedReport.auto_fix_log.map((log: any, idx: number) => (
                                                <div key={idx} className={`flex gap-2 ${log.level === 'error' ? 'text-rose-400' : log.level === 'success' ? 'text-emerald-400 font-bold' : 'text-muted-foreground'}`}>
                                                    <span className="opacity-40">[{format(new Date(log.timestamp), 'HH:mm:ss')}]</span>
                                                    <span>{log.message}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 1. Key Metrics Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <Card className="bg-sky-500/10 border-sky-500/20 text-foreground rounded-2xl shadow-2xs">
                                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                            <div className="mb-2 p-2 bg-sky-500/20 rounded-xl">
                                                <Video className="h-4 w-4 text-sky-400" />
                                            </div>
                                            <div className="text-2xl font-extrabold text-sky-400">
                                                {selectedReport.raw_stats_json?.videos_collected || 0}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground font-bold">수집 영상</div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-purple-500/10 border-purple-500/20 text-foreground rounded-2xl shadow-2xs">
                                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                            <div className="mb-2 p-2 bg-purple-500/20 rounded-xl">
                                                <Scroll className="h-4 w-4 text-purple-400" />
                                            </div>
                                            <div className="text-2xl font-extrabold text-purple-400">
                                                {selectedReport.raw_stats_json?.scripts_collected || 0}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground font-bold">수집 스크립트</div>
                                        </CardContent>
                                    </Card>

                                    <Card className={(selectedReport.raw_stats_json?.failed_downloads || 0) > 0
                                        ? "bg-rose-500/10 border-rose-500/20 text-foreground rounded-2xl shadow-2xs"
                                        : "bg-emerald-500/10 border-emerald-500/20 text-foreground rounded-2xl shadow-2xs"
                                    }>
                                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                            <div className={(selectedReport.raw_stats_json?.failed_downloads || 0) > 0
                                                ? "mb-2 p-2 bg-rose-500/20 rounded-xl"
                                                : "mb-2 p-2 bg-emerald-500/20 rounded-xl"
                                            }>
                                                {(selectedReport.raw_stats_json?.failed_downloads || 0) > 0
                                                    ? <AlertTriangle className="h-4 w-4 text-rose-400 animate-pulse" />
                                                    : <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                                }
                                            </div>
                                            <div className={(selectedReport.raw_stats_json?.failed_downloads || 0) > 0
                                                ? "text-2xl font-extrabold text-rose-400"
                                                : "text-2xl font-extrabold text-emerald-400"
                                            }>
                                                {selectedReport.raw_stats_json?.failed_downloads || 0}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground font-bold">실패 오류</div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-muted/30 border-border text-foreground rounded-2xl shadow-2xs">
                                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                            <div className="mb-2 p-2 bg-muted rounded-xl">
                                                <TrendingUp className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="text-2xl font-extrabold text-foreground">
                                                {selectedReport.raw_stats_json?.trends_cached || 0}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground font-bold">트렌드 갱신</div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* System Infrastructure Card */}
                                {selectedReport.raw_stats_json?.system_health && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <Card className="bg-card border-border rounded-2xl shadow-2xs">
                                            <CardContent className="p-3.5 flex flex-col items-center justify-center text-center">
                                                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <HardDrive className="w-3.5 h-3.5 text-sky-400" /> 저장소 ({selectedReport.raw_stats_json.system_health.storage?.free_gb}GB Free)
                                                </div>
                                                <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                                                    <div className="bg-sky-400 h-full rounded-full" style={{ width: `${selectedReport.raw_stats_json.system_health.storage?.percent}%` }} />
                                                </div>
                                                <div className="text-[10px] text-muted-foreground mt-1 font-mono font-bold">{selectedReport.raw_stats_json.system_health.storage?.percent}% 사용 중</div>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-card border-border rounded-2xl shadow-2xs">
                                            <CardContent className="p-3.5 flex flex-col items-center justify-center text-center">
                                                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <Database className="w-3.5 h-3.5 text-purple-400" /> DB 크기
                                                </div>
                                                <div className="text-lg font-mono font-extrabold text-purple-400 mt-1">{selectedReport.raw_stats_json.system_health.db_size_mb} MB</div>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-card border-border rounded-2xl shadow-2xs">
                                            <CardContent className="p-3.5 flex flex-col items-center justify-center text-center">
                                                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 좀비 태스크
                                                </div>
                                                <div className={`text-lg font-mono font-extrabold mt-1 ${selectedReport.raw_stats_json.system_health.zombie_tasks > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                    {selectedReport.raw_stats_json.system_health.zombie_tasks}개
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {/* Visual Charts */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">
                                        <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border">
                                            <CardTitle className="text-xs font-bold text-foreground">콘텐츠 수집 효율성</CardTitle>
                                        </CardHeader>
                                        <CardContent className="h-[220px] p-2">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={getChartData(selectedReport.raw_stats_json).contentData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="name" type="category" width={40} tick={{ fontSize: 11, fill: 'currentColor' }} />
                                                    <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', color: 'hsl(var(--foreground))' }} />
                                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                                        {getChartData(selectedReport.raw_stats_json).contentData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">
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
        </div>
    );
}

export default DailyReportList;
