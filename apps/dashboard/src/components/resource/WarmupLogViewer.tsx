import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Check, AlertCircle, Activity } from 'lucide-react';

const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://127.0.0.1:8000/api' : '/api';

interface WarmupLogViewerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    channelId: string;
}

const WarmupLogViewer: React.FC<WarmupLogViewerProps> = ({ open, onOpenChange, channelId }) => {
    const [copiedLogId, setCopiedLogId] = useState<number | null>(null);

    const handleCopy = (text: string, logId: number) => {
        navigator.clipboard.writeText(text);
        setCopiedLogId(logId);
        setTimeout(() => setCopiedLogId(null), 2000);
    };

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] bg-background text-foreground border-border shadow-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        <span>웜업 로그 & 분석 리포트</span>
                    </DialogTitle>
                </DialogHeader>

                {/* 성공률 요약 */}
                {analyticsLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : analytics && analytics.total_actions > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="bg-blue-500/10 dark:bg-blue-500/20 p-3 rounded-lg border border-blue-500/30">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analytics.total_actions}</div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">총 액션</div>
                        </div>
                        <div className="bg-emerald-500/10 dark:bg-emerald-500/20 p-3 rounded-lg border border-emerald-500/30">
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{analytics.success_count}</div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">성공</div>
                        </div>
                        <div className="bg-rose-500/10 dark:bg-rose-500/20 p-3 rounded-lg border border-rose-500/30">
                            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{analytics.failed_count}</div>
                            <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">실패</div>
                        </div>
                        <div className="bg-purple-500/10 dark:bg-purple-500/20 p-3 rounded-lg border border-purple-500/30">
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{analytics.success_rate}%</div>
                            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">성공률</div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground p-4 bg-muted/30 rounded-lg border border-border/50 text-sm">
                        아직 수집된 웜업 로그 데이터가 없습니다.
                    </div>
                )}

                {/* 액션별 성공률 */}
                {analytics && analytics.action_stats && Object.keys(analytics.action_stats).length > 0 && (
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold mb-2 text-foreground">액션별 상세 현황</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Object.entries(analytics.action_stats).map(([action, stats]: [string, any]) => (
                                <div key={action} className="bg-muted/40 p-2.5 rounded-lg border border-border/70 flex items-center justify-between">
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
                        <h3 className="text-sm font-semibold text-foreground">최근 실행 타임라인 ({logs?.total || 0}건)</h3>
                    </div>
                    <ScrollArea className="h-[380px] border border-border/80 rounded-lg p-2 bg-background/50">
                        {logsLoading ? (
                            <div className="flex items-center justify-center p-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : logs && logs.logs && logs.logs.length > 0 ? (
                            <div className="space-y-2 p-1">
                                {logs.logs.map((log: any) => (
                                    <div key={log.id} className="border border-border/80 rounded-lg p-3 text-sm bg-card hover:bg-muted/40 transition-colors shadow-xs dark:shadow-none">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs px-1.5 py-0.5">
                                                    {log.status === 'success' ? '정상 완료' : '오류 실패'}
                                                </Badge>
                                                <span className="font-semibold text-foreground">{log.action}</span>
                                                <Badge variant="outline" className="text-xs border-border/80">Day {log.stage}</Badge>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
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
                                            <div className="text-xs text-muted-foreground bg-muted/60 p-2.5 rounded-md mt-2 font-mono border border-border/40 space-y-1">
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

                                        {/* 에러 메시지 & 원클릭 복사 */}
                                        {log.error_message && (
                                            <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 p-2.5 rounded-md mt-2 flex items-start justify-between gap-2">
                                                <div className="flex items-start gap-1.5 min-w-0">
                                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                    <span className="font-mono break-all leading-relaxed">{log.error_message}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleCopy(log.error_message, log.id)}
                                                    className="p-1 rounded hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0 transition-colors"
                                                    title="에러 메시지 복사"
                                                >
                                                    {copiedLogId === log.id ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground p-8 text-sm">
                                등록된 웜업 로그가 없습니다.
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default WarmupLogViewer;
