import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Copy, Check, AlertCircle, Activity, Globe, Smartphone, RotateCcw, Wrench, ExternalLink, HelpCircle } from 'lucide-react';
import { parseWarmupError } from '@/lib/warmupErrorParser';

const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://127.0.0.1:8000/api' : '/api';

interface WarmupLogViewerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    channelId: string;
}

const WarmupLogViewer: React.FC<WarmupLogViewerProps> = ({ open, onOpenChange, channelId }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [copiedLogId, setCopiedLogId] = useState<number | null>(null);

    const handleCopy = (text: string, logId: number) => {
        navigator.clipboard.writeText(text);
        setCopiedLogId(logId);
        setTimeout(() => setCopiedLogId(null), 2000);
    };

    // 1. 단일 채널 브라우저 열기 (직접 육안 점검 및 로그인 조치)
    const launchBrowserMutation = useMutation({
        mutationFn: async () => (await axios.post(`${API_BASE}/youtube/channels/${channelId}/launch`)).data,
        onSuccess: () => {
            toast({
                title: "전용 브라우저 실행",
                description: "채널 전용 브라우저 세션이 열렸습니다. 로그인 및 보안 인증 상태를 직접 확인하세요."
            });
        },
        onError: (err: any) => {
            toast({
                title: "브라우저 실행 실패",
                description: err.response?.data?.detail || err.message,
                variant: "destructive"
            });
        }
    });

    // 2. 모바일 테더링 IP 재할당 (비행기 모드 토글)
    const rotateIpMutation = useMutation({
        mutationFn: async () => (await axios.post(`${API_BASE}/network/rotate-ip`)).data,
        onSuccess: () => {
            toast({
                title: "📱 모바일 IP 재할당 완료",
                description: "테더링 비행기 모드 토글로 신규 모바일 IP가 정상 할당되었습니다."
            });
        },
        onError: (err: any) => {
            toast({
                title: "IP 재할당 실패",
                description: err.response?.data?.detail || err.message,
                variant: "destructive"
            });
        }
    });

    // 3. 웜업 루틴 즉시 재시도
    const retryWarmupMutation = useMutation({
        mutationFn: async () => {
            const isVisible = typeof window !== 'undefined' ? localStorage.getItem('seed_warmup_visible') === 'true' : false;
            return (await axios.post(`${API_BASE}/youtube/channels/${channelId}/warmup`, null, {
                params: { visible: isVisible }
            })).data;
        },
        onSuccess: (res) => {
            if (res.success) {
                toast({ title: "웜업 재시도 완료", description: "웜업 루틴이 정상 완료되었습니다." });
            } else {
                toast({ title: "웜업 실패", description: res.message || "오류가 발생했습니다.", variant: "destructive" });
            }
            queryClient.invalidateQueries({ queryKey: ['warmup-logs', channelId] });
            queryClient.invalidateQueries({ queryKey: ['warmup-analytics', channelId] });
            queryClient.invalidateQueries({ queryKey: ['bulk-warmup-status'] });
            queryClient.invalidateQueries({ queryKey: ['captain-channels'] });
        },
        onError: (err: any) => {
            toast({
                title: "재시도 오류",
                description: err.response?.data?.detail || err.message,
                variant: "destructive"
            });
        }
    });

    // 로그 조회
    const { data: logs, isLoading: logsLoading } = useQuery({
        queryKey: ['warmup-logs', channelId],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/youtube/channels/${channelId}/warmup/logs?limit=50`);
            return res.data;
        },
        enabled: open && !!channelId
    });

    // 분석 데이터
    const { data: analytics, isLoading: analyticsLoading } = useQuery({
        queryKey: ['warmup-analytics', channelId],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/youtube/channels/${channelId}/warmup/analytics`);
            return res.data;
        },
        enabled: open && !!channelId
    });

    if (!channelId) return null;

    const hasErrors = logs?.logs?.some((l: any) => l.status !== 'success');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-background text-foreground border-border shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="p-4 pb-3 border-b border-border bg-muted/20">
                    <DialogTitle className="text-lg font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            <span>웜업 로그 & 진단 리포트</span>
                            <span className="text-xs font-mono text-muted-foreground font-normal">({channelId})</span>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* 성공률 요약 */}
                    {analyticsLoading ? (
                        <div className="flex items-center justify-center p-6">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : analytics && analytics.total_actions > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div className="bg-blue-500/10 dark:bg-blue-500/20 p-3 rounded-xl border border-blue-500/30">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analytics.total_actions}</div>
                                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">총 액션</div>
                            </div>
                            <div className="bg-emerald-500/10 dark:bg-emerald-500/20 p-3 rounded-xl border border-emerald-500/30">
                                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{analytics.success_count}</div>
                                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">성공</div>
                            </div>
                            <div className="bg-rose-500/10 dark:bg-rose-500/20 p-3 rounded-xl border border-rose-500/30">
                                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{analytics.failed_count}</div>
                                <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">실패</div>
                            </div>
                            <div className="bg-purple-500/10 dark:bg-purple-500/20 p-3 rounded-xl border border-purple-500/30">
                                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{analytics.success_rate}%</div>
                                <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">성공률</div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground p-3 bg-muted/30 rounded-xl border border-border/50 text-xs">
                            아직 수집된 웜업 로그 데이터가 없습니다.
                        </div>
                    )}

                    {/* 액션별 상세 현황 */}
                    {analytics && analytics.action_stats && Object.keys(analytics.action_stats).length > 0 && (
                        <div>
                            <h3 className="text-xs font-semibold mb-2 text-foreground">액션별 상세 현황</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {Object.entries(analytics.action_stats).map(([action, stats]: [string, any]) => (
                                    <div key={action} className="bg-muted/40 p-2.5 rounded-xl border border-border/70 flex items-center justify-between">
                                        <div className="min-w-0 pr-2">
                                            <div className="text-xs font-semibold truncate text-foreground">{action}</div>
                                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                                {stats.success}/{stats.total} 완료
                                            </div>
                                        </div>
                                        <Badge variant={stats.success_rate >= 80 ? "default" : "destructive"} className="text-xs shrink-0">
                                            {stats.success_rate}%
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 로그 목록 */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold text-foreground">최근 실행 타임라인 ({logs?.total || 0}건)</h3>
                        </div>
                        <ScrollArea className="h-[360px] border border-border/80 rounded-xl p-2 bg-background/50">
                            {logsLoading ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : logs && logs.logs && logs.logs.length > 0 ? (
                                <div className="space-y-3 p-1">
                                    {logs.logs.map((log: any) => {
                                        const diag = log.error_message ? parseWarmupError(log.error_message) : null;
                                        return (
                                            <div key={log.id} className="border border-border/80 rounded-xl p-3.5 text-sm bg-card hover:bg-muted/30 transition-colors shadow-2xs">
                                                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs px-2 py-0.5 font-bold">
                                                            {log.status === 'success' ? '✅ 정상 완료' : '❌ 오류 실패'}
                                                        </Badge>
                                                        <span className="font-bold text-foreground text-xs sm:text-sm">{log.action}</span>
                                                        <Badge variant="outline" className="text-xs border-border/80">Day {log.stage}</Badge>
                                                    </div>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {new Date(log.created_at).toLocaleString('ko-KR', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            second: '2-digit'
                                                        })}
                                                    </span>
                                                </div>

                                                {/* 상세 정보 */}
                                                {log.details && Object.keys(log.details).length > 0 && (
                                                    <div className="text-xs text-muted-foreground bg-muted/60 p-2.5 rounded-lg mt-2 font-mono border border-border/40 space-y-1">
                                                        {log.details.url && (
                                                            <div className="truncate">🎯 대상 URL: {log.details.url}</div>
                                                        )}
                                                        {log.details.planned_duration && (
                                                            <div>⏱️ 시청 시간: {log.details.actual_duration || 0}s / {log.details.planned_duration}s</div>
                                                        )}
                                                        {log.details.ads_skipped !== undefined && (
                                                            <div>광고 스킵: {log.details.ads_skipped}회</div>
                                                        )}
                                                        {log.details.early_exit && (
                                                            <div className="text-amber-600 dark:text-amber-400 font-medium">⚠️ 중도 종료 감지</div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* 지능형 오류 진단 카드 및 즉각 조치 가이드 */}
                                                {diag && (
                                                    <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 p-3.5 space-y-2.5">
                                                        {/* 헤더: 배지 & 직관적 설명 */}
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="space-y-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <Badge variant="outline" className={`${diag.badgeClass} font-bold text-[11px]`}>
                                                                        {diag.badge}
                                                                    </Badge>
                                                                    <span className="text-xs font-bold text-foreground">{diag.title}</span>
                                                                </div>
                                                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                                    {diag.description}
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleCopy(log.error_message, log.id)}
                                                                className="p-1 rounded-md hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0 transition-colors"
                                                                title="에러 로그 복사"
                                                            >
                                                                {copiedLogId === log.id ? (
                                                                    <Check className="w-4 h-4 text-emerald-500" />
                                                                ) : (
                                                                    <Copy className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        </div>

                                                        {/* 조치 가이드 */}
                                                        <div className="text-[11px] bg-card/80 border border-border/80 rounded-lg p-2.5 flex items-start gap-2">
                                                            <Wrench className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                            <div className="text-foreground leading-relaxed font-medium">
                                                                <span className="font-bold text-primary mr-1">조치 가이드:</span>
                                                                {diag.solution}
                                                            </div>
                                                        </div>

                                                        {/* 원본 시스템 에러 (모노스페이스) */}
                                                        <div className="text-[10px] font-mono text-muted-foreground bg-background/80 p-2 rounded-md border border-border/60 break-all">
                                                            🔍 시스템 원본 로그: {log.error_message}
                                                        </div>

                                                        {/* 맞춤 원클릭 조치 액션 버튼 그룹 */}
                                                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={launchBrowserMutation.isPending}
                                                                onClick={() => launchBrowserMutation.mutate()}
                                                                className="h-7 text-xs bg-background border-border hover:bg-muted font-bold rounded-lg"
                                                            >
                                                                {launchBrowserMutation.isPending ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                                                                ) : (
                                                                    <Globe className="w-3 h-3 mr-1.5 text-blue-500" />
                                                                )}
                                                                🌐 브라우저 열어 점검
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={rotateIpMutation.isPending}
                                                                onClick={() => rotateIpMutation.mutate()}
                                                                className="h-7 text-xs bg-background border-border hover:bg-muted font-bold rounded-lg"
                                                            >
                                                                {rotateIpMutation.isPending ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                                                                ) : (
                                                                    <Smartphone className="w-3 h-3 mr-1.5 text-emerald-500" />
                                                                )}
                                                                📱 IP 재할당
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                disabled={retryWarmupMutation.isPending}
                                                                onClick={() => retryWarmupMutation.mutate()}
                                                                className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-2xs"
                                                            >
                                                                {retryWarmupMutation.isPending ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                                                                ) : (
                                                                    <RotateCcw className="w-3 h-3 mr-1.5" />
                                                                )}
                                                                🔄 즉시 재시도
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground p-8 text-sm">
                                    등록된 웜업 로그가 없습니다.
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>

                {/* 다이얼로그 하단 상시 조치 툴바 */}
                <DialogFooter className="p-3 border-t border-border bg-muted/20 flex flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={launchBrowserMutation.isPending}
                            onClick={() => launchBrowserMutation.mutate()}
                            className="h-8 text-xs font-bold border-border bg-background hover:bg-muted rounded-xl"
                        >
                            <Globe className="w-3.5 h-3.5 mr-1 text-blue-500" />
                            브라우저 열기
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={rotateIpMutation.isPending}
                            onClick={() => rotateIpMutation.mutate()}
                            className="h-8 text-xs font-bold border-border bg-background hover:bg-muted rounded-xl"
                        >
                            <Smartphone className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                            IP 재할당
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            disabled={retryWarmupMutation.isPending}
                            onClick={() => retryWarmupMutation.mutate()}
                            className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-2xs"
                        >
                            {retryWarmupMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            ) : (
                                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            )}
                            루틴 재시도
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                        >
                            닫기
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default WarmupLogViewer;
