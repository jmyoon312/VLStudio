import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, PlaySquare, Activity, Lock, Loader2, RefreshCw, ChevronRight, UserPlus, Pencil, Trash2, Flame, CheckCircle2, AlertTriangle, PauseCircle, Clock, Users, Sparkles, Settings, RotateCcw, Globe, Smartphone, Wrench } from 'lucide-react';

import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TinCanWizard from './TinCanWizard';
import IncubationGuide from './IncubationGuide';
import WarmupLogViewer from './WarmupLogViewer';
import { CultivationWizard } from './CultivationWizard';
import { parseWarmupError } from '@/lib/warmupErrorParser';

const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://127.0.0.1:8000/api' : '/api';

interface BulkWarmupPanelProps {
    selectedChannelIds?: string[];
    onClearSelection?: () => void;
    onOpenLogs?: (channelId: string) => void;
}

// --- Bulk Warmup Control Panel ---
export const BulkWarmupPanel: React.FC<BulkWarmupPanelProps> = ({
    selectedChannelIds = [],
    onClearSelection,
    onOpenLogs
}) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [guideOpen, setGuideOpen] = React.useState(false);
    const [errorDiagnosisOpen, setErrorDiagnosisOpen] = React.useState(false);
    const [selectedChannelForLogs, setSelectedChannelForLogs] = React.useState<string>('');
    const [logViewerOpen, setLogViewerOpen] = React.useState(false);

    // Fetch bulk status every 5 seconds
    const { data: status, isLoading } = useQuery({
        queryKey: ['bulk-warmup-status'],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/youtube/warmup/bulk/status`);
            return res.data;
        },
        refetchInterval: 5000
    });

    // Dual-Fallback: Fetch failed channels directly from /youtube/all when diagnosis modal opens
    const { data: fallbackFailedChannels } = useQuery({
        queryKey: ['failed-channels-diagnosis-fallback'],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/youtube/all`);
            const list = Array.isArray(res.data) ? res.data : (res.data?.channels || []);
            return list.filter((c: any) => c.warmup_status === 'FAILED' || c.status === 'FAILED');
        },
        enabled: errorDiagnosisOpen
    });

    // Dedicated Browser Launch Mutation
    const launchBrowserMutation = useMutation({
        mutationFn: async (channelId: string) => (await axios.post(`${API_BASE}/youtube/channels/${channelId}/launch`)).data,
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

    // Mobile IP Rotate Mutation (Airplane mode toggle)
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

    // Rotate IP and then retry all failed channels
    const rotateIpAndRetryBulkMutation = useMutation({
        mutationFn: async () => {
            try {
                await axios.post(`${API_BASE}/network/rotate-ip`);
            } catch (e) {
                console.warn("IP rotation notice:", e);
            }
            return (await axios.post(`${API_BASE}/youtube/warmup/bulk/start`, null, { params: { filter: 'failed' } })).data;
        },
        onSuccess: (res) => {
            toast({
                title: "📱 IP 재할당 및 웜업 재시작",
                description: `신규 IP 할당 후 ${res.started || 0}개 채널의 웜업이 재개되었습니다.`
            });
            queryClient.invalidateQueries({ queryKey: ['bulk-warmup-status'] });
            queryClient.invalidateQueries({ queryKey: ['captain-channels'] });
            queryClient.invalidateQueries({ queryKey: ['failed-channels-diagnosis-fallback'] });
            setErrorDiagnosisOpen(false);
        },
        onError: (err: any) => {
            toast({
                title: "복구 실패",
                description: err.response?.data?.detail || err.message,
                variant: "destructive"
            });
        }
    });

    // Single channel retry mutation
    const retryMutation = useMutation({
        mutationFn: async (channelId: string) => {
            const isVisible = typeof window !== 'undefined' ? localStorage.getItem('seed_warmup_visible') === 'true' : false;
            return (await axios.post(`${API_BASE}/youtube/channels/${channelId}/warmup`, null, {
                params: { visible: isVisible }
            })).data;
        },
        onSuccess: (res) => {
            if (res.success) {
                toast({ title: "웜업 재시도 완료", description: "웜업이 성공적으로 완료되었습니다." });
            } else {
                toast({ title: "웜업 재시도 실패", description: res.message || "오류가 발생했습니다.", variant: "destructive" });
            }
            queryClient.invalidateQueries({ queryKey: ['bulk-warmup-status'] });
            queryClient.invalidateQueries({ queryKey: ['captain-channels'] });
            queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
        },
        onError: (err: any) => {
            toast({ title: "재시도 오류", description: err.response?.data?.detail || err.message, variant: "destructive" });
        }
    });

    // Bulk start mutation (supports both filter string and payload object with channel_ids)
    const startMutation = useMutation({
        mutationFn: async (params: { filter?: string; channel_ids?: string[] } | string) => {
            if (typeof params === 'string') {
                return (await axios.post(`${API_BASE}/youtube/warmup/bulk/start`, null, { params: { filter: params } })).data;
            } else {
                return (await axios.post(`${API_BASE}/youtube/warmup/bulk/start`, { channel_ids: params.channel_ids }, { params: { filter: params.filter || 'all' } })).data;
            }
        },
        onSuccess: (res, vars) => {
            const filterLabel = typeof vars === 'string' ? vars : (vars.channel_ids ? `선택 ${vars.channel_ids.length}개` : vars.filter);
            toast({
                title: "일괄 웜업 시작",
                description: `${res.started}개 채널의 웜업이 시작되었습니다 (${filterLabel})`,
            });
            queryClient.invalidateQueries({ queryKey: ['bulk-warmup-status'] });
            queryClient.invalidateQueries({ queryKey: ['captain-channels'] });
            queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
            if (onClearSelection) onClearSelection();
        },
        onError: (err: any) => {
            toast({
                title: "일괄 시작 실패",
                description: err.response?.data?.detail || "오류가 발생했습니다",
                variant: "destructive",
            });
        }
    });

    // Bulk pause mutation
    const pauseMutation = useMutation({
        mutationFn: async () => await axios.post(`${API_BASE}/youtube/warmup/bulk/pause`),
        onSuccess: (res) => {
            toast({
                title: "일괄 일시정지",
                description: `${res.data.paused}개 채널이 일시정지되었습니다`,
            });
            queryClient.invalidateQueries({ queryKey: ['bulk-warmup-status'] });
        }
    });

    // Bulk reset mutation
    const resetMutation = useMutation({
        mutationFn: async () => await axios.post(`${API_BASE}/youtube/warmup/bulk/reset`),
        onSuccess: (res) => {
            toast({
                title: "일괄 초기화",
                description: `${res.data.reset}개 채널이 초기화되었습니다`,
            });
            queryClient.invalidateQueries({ queryKey: ['bulk-warmup-status'] });
        }
    });

    // Auto schedule mutation
    const autoScheduleMutation = useMutation({
        mutationFn: async () => await axios.post(`${API_BASE}/youtube/warmup/bulk/auto-schedule`),
        onSuccess: (res) => {
            toast({
                title: "오토 스케줄러 실행 완료",
                description: `처리 대상: ${res.data.processed}개 / 실행: ${res.data.success}개 / 실패: ${res.data.failed}개`,
            });
            queryClient.invalidateQueries({ queryKey: ['bulk-warmup-status'] });
            queryClient.invalidateQueries({ queryKey: ['captain-channels'] });
        },
        onError: (err: any) => {
            toast({
                title: "스케줄러 오류",
                description: err.response?.data?.detail || "오류가 발생했습니다",
                variant: "destructive",
            });
        }
    });

    if (isLoading) {
        return (
            <Card className="mb-6">
                <CardContent className="p-6">
                    <div className="flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="mb-6 rounded-xl shadow-sm border border-border bg-card">
                <CardHeader className="py-4 px-6 border-b border-border bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-foreground">
                            <Flame className="w-5 h-5 text-orange-500" />
                            <h3 className="font-semibold text-base">일괄 웜업 육성 제어</h3>
                        </div>
                        <Button
                            onClick={() => setGuideOpen(true)}
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-primary h-8"
                        >
                            📚 인큐베이팅 가이드
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    {/* Status Summary Cards (Clean Minimal Card Style aligned with WorkQueue) */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mb-6">
                        <div className="bg-card rounded-xl p-3 sm:p-3.5 border border-border shadow-2xs flex items-center justify-between transition-colors hover:border-border/80">
                            <div>
                                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">전체 채널</p>
                                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground mt-0.5">{status?.total || 0}</h3>
                            </div>
                            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                                <Users className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="bg-card rounded-xl p-3 sm:p-3.5 border border-border shadow-2xs flex items-center justify-between transition-colors hover:border-orange-400/50">
                            <div>
                                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">진행 중</p>
                                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-orange-600 dark:text-orange-400 mt-0.5">{status?.running || 0}</h3>
                            </div>
                            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                                <Flame className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="bg-card rounded-xl p-3 sm:p-3.5 border border-border shadow-2xs flex items-center justify-between transition-colors hover:border-emerald-400/50">
                            <div>
                                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">육성 완료 (Stage 3)</p>
                                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 mt-0.5">{status?.completed || 0}</h3>
                            </div>
                            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        </div>

                        <div 
                            onClick={() => {
                                if ((status?.failed || 0) > 0) {
                                    setErrorDiagnosisOpen(true);
                                }
                            }}
                            className={`bg-card rounded-xl p-3 sm:p-3.5 border shadow-2xs flex items-center justify-between transition-all ${(status?.failed || 0) > 0 ? 'border-rose-500/50 bg-rose-500/5 hover:border-rose-500 cursor-pointer hover:shadow-sm' : 'border-border hover:border-rose-400/50'}`}
                            title={(status?.failed || 0) > 0 ? "클릭하여 오류 채널 목록 및 실패 원인을 확인합니다." : "오류 채널 없음"}
                        >
                            <div>
                                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                                    <span>오류 발생</span>
                                    {(status?.failed || 0) > 0 && <span className="text-[9px] text-rose-500 font-bold underline">(원인 확인)</span>}
                                </p>
                                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400 mt-0.5">{status?.failed || 0}</h3>
                            </div>
                            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="bg-card rounded-xl p-3 sm:p-3.5 border border-border shadow-2xs flex items-center justify-between transition-colors hover:border-amber-400/50">
                            <div>
                                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">일시정지</p>
                                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400 mt-0.5">{status?.paused || 0}</h3>
                            </div>
                            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                                <PauseCircle className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="bg-card rounded-xl p-3 sm:p-3.5 border border-border shadow-2xs flex items-center justify-between transition-colors hover:border-slate-400/50">
                            <div>
                                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">육성 대기 (신규)</p>
                                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-600 dark:text-slate-400 mt-0.5">{status?.pending || 0}</h3>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>
                    </div>


                    {/* Bulk Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-border">
                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 flex-1">
                            {selectedChannelIds && selectedChannelIds.length > 0 && (
                                <Button
                                    onClick={() => startMutation.mutate({ channel_ids: selectedChannelIds })}
                                    disabled={startMutation.isPending}
                                    className="bg-amber-600 hover:bg-amber-700 text-white shadow-2xs h-8 text-xs font-bold animate-in fade-in col-span-2 sm:col-span-1"
                                >
                                    <Sparkles className="w-3.5 h-3.5 mr-1.5" /> 🎯 선택 채널 시작 ({selectedChannelIds.length}개)
                                </Button>
                            )}
                            <Button
                                onClick={() => startMutation.mutate("all")}
                                disabled={startMutation.isPending}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs h-8 text-xs font-bold"
                            >
                                <Flame className="w-3.5 h-3.5 mr-1.5" /> 전체 시작
                            </Button>
                            <Button
                                onClick={() => autoScheduleMutation.mutate()}
                                disabled={autoScheduleMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs h-8 text-xs font-bold"
                            >
                                {autoScheduleMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : "▶ 스케줄러 자동"}
                            </Button>
                            <Button
                                onClick={() => startMutation.mutate("pending")}
                                disabled={startMutation.isPending}
                                variant="outline"
                                className="bg-background border-border text-foreground h-8 text-xs col-span-2 sm:col-span-1"
                            >
                                대기중 시작
                            </Button>
                        </div>
                        
                        <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 justify-end">
                            <Button
                                onClick={() => startMutation.mutate("failed")}
                                disabled={startMutation.isPending}
                                variant="outline"
                                className="text-rose-500 border-rose-300 dark:border-rose-800 hover:bg-rose-500/10 h-8 text-xs"
                            >
                                오류 재시작
                            </Button>
                            <Button
                                onClick={() => pauseMutation.mutate()}
                                disabled={pauseMutation.isPending}
                                variant="outline"
                                className="bg-background border-border text-foreground h-8 text-xs"
                            >
                                일시정지
                            </Button>
                            <Button
                                onClick={() => resetMutation.mutate()}
                                disabled={resetMutation.isPending}
                                variant="outline"
                                className="text-rose-500 border-rose-300 dark:border-rose-800 hover:bg-rose-500/10 h-8 text-xs"
                            >
                                초기화
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Error Channels Diagnosis Modal */}
            <Dialog open={errorDiagnosisOpen} onOpenChange={setErrorDiagnosisOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl">
                    {(() => {
                        const activeFailedChannels = (status?.failed_channels && status.failed_channels.length > 0)
                            ? status.failed_channels
                            : (fallbackFailedChannels || []);
                        const totalFailedCount = Math.max(status?.failed || 0, activeFailedChannels.length);

                        return (
                            <>
                                <DialogHeader className="p-4 pb-3 border-b border-border bg-rose-500/10">
                                    <DialogTitle className="text-base font-bold flex items-center justify-between gap-2 text-rose-600 dark:text-rose-400">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="w-5 h-5 shrink-0" />
                                            <span>⚠️ 웜업 실패 채널 긴급 진단 및 조치 ({totalFailedCount}개)</span>
                                        </div>
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                        웜업 루틴 중 인증 세션 만료 또는 프록시 네트워크 통신 오류가 발생한 채널의 원인을 진단하고 즉시 조치합니다.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
                                    {activeFailedChannels && activeFailedChannels.length > 0 ? (
                                        activeFailedChannels.map((ch: any) => {
                                            const diag = parseWarmupError(ch.warmup_last_error);
                                            return (
                                                <div key={ch.channel_id} className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 space-y-3 shadow-2xs">
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Badge variant="outline" className={`${diag.badgeClass} font-bold text-[11px] px-2 py-0.5`}>
                                                                {diag.badge}
                                                            </Badge>
                                                            <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px]">
                                                                Day {ch.warmup_stage || 1}
                                                            </Badge>
                                                            <span className="text-sm font-extrabold text-foreground truncate">{ch.title || ch.channel_id}</span>
                                                            <span className="text-[10px] text-muted-foreground font-mono">({ch.channel_id})</span>
                                                        </div>

                                                        {/* 채널별 즉각 조치 툴바 */}
                                                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={launchBrowserMutation.isPending}
                                                                onClick={() => launchBrowserMutation.mutate(ch.channel_id)}
                                                                className="h-7 text-xs border-border bg-background hover:bg-muted font-semibold rounded-lg"
                                                                title="전용 브라우저를 열어 구글 로그인 및 세션 상태를 직접 확인합니다"
                                                            >
                                                                {launchBrowserMutation.isPending ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                                                ) : (
                                                                    <Globe className="w-3 h-3 mr-1 text-blue-500" />
                                                                )}
                                                                브라우저 열기
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={rotateIpMutation.isPending}
                                                                onClick={() => rotateIpMutation.mutate()}
                                                                className="h-7 text-xs border-border bg-background hover:bg-muted font-semibold rounded-lg"
                                                                title="모바일 테더링 비행기 모드를 토글하여 새 IP를 할당받습니다"
                                                            >
                                                                {rotateIpMutation.isPending ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                                                ) : (
                                                                    <Smartphone className="w-3 h-3 mr-1 text-emerald-500" />
                                                                )}
                                                                IP 재할당
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    if (onOpenLogs) {
                                                                        onOpenLogs(ch.channel_id);
                                                                    } else {
                                                                        setSelectedChannelForLogs(ch.channel_id);
                                                                        setLogViewerOpen(true);
                                                                    }
                                                                }}
                                                                className="h-7 text-xs border-border bg-background hover:bg-muted font-semibold rounded-lg"
                                                            >
                                                                <Clock className="w-3 h-3 mr-1" /> 로그 보기
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                disabled={retryMutation.isPending}
                                                                onClick={() => retryMutation.mutate(ch.channel_id)}
                                                                className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-2xs"
                                                            >
                                                                {retryMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                                                                재시도
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* 지능형 한글 원인 진단 및 조치 가이드 박스 */}
                                                    <div className="bg-card/90 rounded-xl p-3 border border-border text-xs space-y-2">
                                                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                                                            <span>💡</span>
                                                            <span>{diag.title}</span>
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                            {diag.description}
                                                        </p>
                                                        <div className="text-[11px] bg-muted/60 rounded-lg p-2 text-foreground font-medium flex items-start gap-1.5 border border-border/50">
                                                            <Wrench className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                                            <span><strong className="text-primary">권장 조치:</strong> {diag.solution}</span>
                                                        </div>
                                                        <div className="text-[10px] font-mono text-muted-foreground bg-background/60 p-2 rounded-md border border-border/40 break-all">
                                                            🔍 시스템 원본 로그: {ch.warmup_last_error || "알 수 없는 오류"}
                                                            {ch.warmup_last_run && ` (발생 시각: ${new Date(ch.warmup_last_run).toLocaleString('ko-KR')})`}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-10 text-muted-foreground text-xs">
                                            현재 실패 상태인 채널이 없습니다.
                                        </div>
                                    )}
                                </div>

                                <DialogFooter className="p-3 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={rotateIpAndRetryBulkMutation.isPending || totalFailedCount === 0}
                                            onClick={() => rotateIpAndRetryBulkMutation.mutate()}
                                            className="h-8 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30 rounded-xl flex-1 sm:flex-none"
                                            title="모바일 비행기 모드를 껐다 켜서 IP를 새로 할당받은 뒤 실패 채널 웜업을 재시작합니다"
                                        >
                                            {rotateIpAndRetryBulkMutation.isPending ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                            ) : (
                                                <Smartphone className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                                            )}
                                            📱 IP 재할당 후 일괄 재시도 ({totalFailedCount}개)
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={startMutation.isPending || totalFailedCount === 0}
                                            onClick={() => {
                                                startMutation.mutate("failed");
                                                setErrorDiagnosisOpen(false);
                                            }}
                                            className="h-8 text-xs font-bold text-rose-600 hover:bg-rose-500/10 border-rose-500/30 rounded-xl flex-1 sm:flex-none"
                                        >
                                            <Flame className="w-3.5 h-3.5 mr-1" /> 전체 일괄 재시도 ({totalFailedCount}개)
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setErrorDiagnosisOpen(false)}
                                            className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                                        >
                                            닫기
                                        </Button>
                                    </div>
                                </DialogFooter>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            <WarmupLogViewer
                open={logViewerOpen}
                onOpenChange={setLogViewerOpen}
                channelId={selectedChannelForLogs}
            />

            <IncubationGuide open={guideOpen} onOpenChange={setGuideOpen} />
        </>
    );
};


const CaptainQuarters = ({ onOpenLogs }: { onOpenLogs?: (channelId: string) => void }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [draftData, setDraftData] = useState<any>(null); // For Resuming Draft

    // Management State
    const [editProfile, setEditProfile] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [logViewerOpen, setLogViewerOpen] = useState(false);
    const [selectedChannelForLogs, setSelectedChannelForLogs] = useState<string>('');
    const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);

    const handleToggleSelectChannel = (channelId: string) => {
        setSelectedChannelIds(prev =>
            prev.includes(channelId) ? prev.filter(id => id !== channelId) : [...prev, channelId]
        );
    };

    const handleClearChannelSelection = () => {
        setSelectedChannelIds([]);
    };

    // Fetch Real Profiles (CAPTAIN type)
    const { data: profiles, isLoading, refetch } = useQuery({
        queryKey: ['profiles', 'captain'],
        queryFn: async () => (await axios.get(`${API_BASE}/resources/profiles?type=CAPTAIN`)).data
    });

    const displayProfiles = Array.isArray(profiles) ? profiles : [];

    // Mutations
    const updateMutation = useMutation({
        mutationFn: async (data: any) => await axios.put(`${API_BASE}/resources/profiles/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            setEditProfile(null);
            toast({ title: "수정 완료", description: "계정 정보가 업데이트되었습니다." });
        },
        onError: (e: any) => {
            toast({ variant: "destructive", title: "수정 실패", description: e.response?.data?.detail || "오류가 발생했습니다." });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => await axios.delete(`${API_BASE}/resources/profiles/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            setDeleteId(null);
            toast({ title: "삭제 완료", description: "계정이 영구적으로 삭제되었습니다." });
        },
        onError: (e: any) => {
            toast({ variant: "destructive", title: "삭제 실패", description: e.response?.data?.detail || "삭제 중 오류가 발생했습니다." });
        }
    });

    const handleEditSave = () => {
        if (!editProfile) return;
        updateMutation.mutate(editProfile);
    };

    const handleDeleteConfirm = () => {
        if (!deleteId) return;
        deleteMutation.mutate(deleteId);
    };

    const handleSecureLaunch = async (profile: any) => {
        if (profile.status === 'QUARANTINED') {
            toast({
                variant: "destructive",
                title: "⛔ 접속 차단됨",
                description: `이 계정은 격리 상태입니다. (사유: ${profile.quarantine_reason})`
            });
            return;
        }

        setLoadingMap(prev => ({ ...prev, [profile.id]: true }));
        toast({ title: "🛡️ 보안 터널링 가동", description: `${profile.id} 프로필을 준비합니다...` });

        try {
            const res = await axios.post(`${API_BASE}/resources/profiles/${profile.id}/launch-setup`, { rotate_ip: true });
            if (res.data.status === 'launched') {
                toast({ title: "🚀 접속 성공", description: "브라우저가 실행되었습니다." });
            } else {
                throw new Error("Launch failed");
            }
        } catch (e) {
            toast({ variant: "destructive", title: "실행 실패", description: "백엔드 연결을 확인해주세요." });
        } finally {
            setLoadingMap(prev => ({ ...prev, [profile.id]: false }));
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Bulk Warmup Control Panel */}
            <BulkWarmupPanel
                selectedChannelIds={selectedChannelIds}
                onClearSelection={handleClearChannelSelection}
            />

            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Channel & Account List ({displayProfiles.length})</span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-3 py-1">System Ready</Badge>
                    <Button onClick={() => { setDraftData(null); setIsWizardOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-sm">
                        <UserPlus className="w-4 h-4" /> 관리자 계정 등록
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-10 text-muted-foreground">프로필 목록을 불러오는 중...</div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {displayProfiles.map((p: any) => {
                        const isQuarantined = p.status === 'QUARANTINED';
                        return (
                            <Card key={p.id} className={`transition-all shadow-sm ${isQuarantined ? 'border-red-500 bg-red-500/5' : 'hover:border-primary/50'}`}>
                                <CardContent className="p-6 flex items-center justify-between">

                                    {/* Info */}
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                                            ${isQuarantined ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                                                p.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                            {isQuarantined ? <Lock className="w-5 h-5" /> : (p.email?.[0]?.toUpperCase() || 'U')}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                                {p.email || `Unknown (${p.id})`}
                                                {isQuarantined && <Badge variant="destructive" className="text-[10px] h-5">⛔ UPLOAD BLOCKED</Badge>}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                {p.client_secret_json ?
                                                    <Badge variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">JSON ✅</Badge> :
                                                    <Badge variant="outline" className="text-[10px] border-red-500/20 text-red-600 dark:text-red-400 bg-red-500/10">JSON ❌</Badge>
                                                }
                                                {p.refresh_token ?
                                                    <Badge variant="outline" className="text-[10px] border-blue-500/20 text-blue-600 dark:text-blue-400 bg-blue-500/10">API Connected</Badge> :
                                                    <Badge variant="outline" className="text-[10px] border-amber-500/20 text-amber-600 dark:text-amber-400 bg-amber-500/10">API Pending</Badge>
                                                }
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3">
                                        <Button
                                            onClick={() => handleSecureLaunch(p)}
                                            disabled={loadingMap[p.id]}
                                            className={`min-w-[140px] ${isQuarantined
                                                ? 'bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/20 cursor-not-allowed'
                                                : loadingMap[p.id] ? 'bg-muted text-muted-foreground' : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'}`}
                                        >
                                            {isQuarantined ? (
                                                <><Lock className="w-4 h-4 mr-2" /> 접속 차단</>
                                            ) : loadingMap[p.id] ? (
                                                <>준비 중...</>
                                            ) : (
                                                <><PlaySquare className="w-4 h-4 mr-2" /> 보안 접속</>
                                            )}
                                        </Button>

                                        {/* API Authorization Button */}
                                        {p.client_secret_json && !isQuarantined && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm" className={`gap-2 ${!p.refresh_token ? 'border-amber-500 text-amber-600 animate-pulse' : 'text-blue-600'}`}>
                                                        <Activity className="w-4 h-4" />
                                                        {p.refresh_token ? "API 연결됨" : "API 연결 필요"}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56">
                                                    <DropdownMenuItem onClick={() => window.open(`${API_BASE}/oauth2/authorize/${p.id}`, '_blank')}>
                                                        <Activity className="w-4 h-4 mr-2" />
                                                        일반 브라우저로 인증
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={async () => {
                                                        try {
                                                            await axios.post(`${API_BASE}/oauth2/authenticate/${p.id}`);
                                                            toast({ title: "격리 브라우저 실행", description: "지정된 Chrome 프로필에서 인증을 진행하세요." });
                                                        } catch (e) {
                                                            toast({ variant: "destructive", title: "실행 실패", description: "인증 브라우저를 띄울 수 없습니다." });
                                                        }
                                                    }}>
                                                        <Lock className="w-4 h-4 mr-2" />
                                                        격리 브라우저로 인증 (권장)
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}

                                        {/* Management Buttons */}
                                        <div className="flex items-center gap-1 border-l pl-3 ml-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => (p.status?.toLowerCase() === 'draft' || p.status?.toLowerCase() === 'pending')
                                                    ? (() => { setDraftData(p); setIsWizardOpen(true); })()
                                                    : setEditProfile(p)
                                                }
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                title={p.status?.toLowerCase() === 'draft' ? "등록 계속하기" : "프로필 수정"}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                </CardContent>

                                {/* [New] Delegated Channel List (Expandable or Always Visible?) */}
                                {/* Let's make it visible if ACTIVE */}
                                {p.status?.toLowerCase() === 'active' && !isQuarantined && (
                                    <div className="px-6 pb-6 border-t pt-4 bg-muted/20">
                                        <CaptainChannelList
                                            profileId={p.id}
                                            parentScan={loadingMap[p.id]}
                                            onOpenLogs={onOpenLogs}
                                            selectedChannelIds={selectedChannelIds}
                                            onToggleSelectChannel={handleToggleSelectChannel}
                                        />
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            <TinCanWizard
                isOpen={isWizardOpen}
                onClose={() => {
                    setIsWizardOpen(false);
                    setDraftData(null);
                }}
                onComplete={() => {
                    setIsWizardOpen(false);
                    setDraftData(null);
                    refetch();
                }}
                accountType="CAPTAIN"
                initialData={draftData}
            />

            {/* Edit Dialog */}
            <Dialog open={!!editProfile} onOpenChange={(open) => !open && setEditProfile(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>관리자 프로필 수정</DialogTitle>
                        <DialogDescription>계정 정보를 수정하거나 상태를 변경합니다.</DialogDescription>
                    </DialogHeader>
                    {editProfile && (
                        <div className="grid gap-4 py-4">
                            {/* System Info (ReadOnly) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">System ID</Label>
                                    <Input value={editProfile.id} disabled className="bg-slate-50 font-mono text-[10px] h-8" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">Folder Path</Label>
                                    <Input value={editProfile.folder_path || '-'} disabled className="bg-slate-50 font-mono text-[10px] h-8 text-ellipsis" />
                                </div>
                            </div>

                            {/* Credentials */}
                            <div className="space-y-2">
                                <Label>계정 이메일</Label>
                                <Input
                                    value={editProfile.email || ''}
                                    onChange={e => setEditProfile({ ...editProfile, email: e.target.value })}
                                    placeholder="example@gmail.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>비밀번호</Label>
                                    <Input
                                        type="password"
                                        value={editProfile.password || ''}
                                        onChange={e => setEditProfile({ ...editProfile, password: e.target.value })}
                                        placeholder="설정된 비밀번호 없음"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>복구 이메일</Label>
                                    <Input
                                        value={editProfile.recovery_email || ''}
                                        onChange={e => setEditProfile({ ...editProfile, recovery_email: e.target.value })}
                                        placeholder="Imported"
                                    />
                                </div>
                            </div>

                            {/* Status & Config */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>상태 (Status)</Label>
                                    <Select
                                        value={editProfile.status}
                                        onValueChange={val => setEditProfile({ ...editProfile, status: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active (정상)</SelectItem>
                                            <SelectItem value="draft">Draft (임시저장)</SelectItem>
                                            <SelectItem value="pending">Pending (인증대기)</SelectItem>
                                            <SelectItem value="QUARANTINED">Quarantined (격리)</SelectItem>
                                            <SelectItem value="error">Error (오류)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>프록시 모드</Label>
                                    <Select
                                        value={editProfile.proxy_mode || 'DIRECT'}
                                        onValueChange={val => setEditProfile({ ...editProfile, proxy_mode: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DIRECT">DIRECT (직접 연결)</SelectItem>
                                            <SelectItem value="ADB_LTE">ADB LTE (테더링)</SelectItem>
                                            <SelectItem value="CUSTOM_PROXY">CUSTOM (수동 프록시)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditProfile(null)}>취소</Button>
                        <Button onClick={handleEditSave} disabled={updateMutation.isPending}>저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>계정 영구 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                            정말로 이 계정을 삭제하시겠습니까? 로컬 프로필 폴더와 인증 정보가 영구적으로 삭제되며 복구할 수 없습니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white">
                            삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// --- Sub Component: Channel List ---
const CaptainChannelList = ({
    profileId,
    parentScan,
    onOpenLogs,
    selectedChannelIds = [],
    onToggleSelectChannel
}: {
    profileId: string;
    parentScan?: boolean;
    onOpenLogs?: (channelId: string) => void;
    selectedChannelIds?: string[];
    onToggleSelectChannel?: (channelId: string) => void;
}) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [scanning, setScanning] = useState(false);
    
    // For Cultivation Wizard
    const [wizardOpen, setWizardOpen] = useState(false);
    const [selectedChannelForWizard, setSelectedChannelForWizard] = useState<any>(null);

    // Fetch Channels from unified API (minimal info)
    const { data: channels, isLoading, refetch } = useQuery({
        queryKey: ['captain-channels', profileId],
        queryFn: async () => (await axios.get(`${API_BASE}/resources/captain/${profileId}/channels?view=list`)).data,
        enabled: !!profileId,
        staleTime: 1000 * 5,  // 5 seconds cache to load fresh data immediately
    });

    const displayChannels = Array.isArray(channels) ? channels : [];

    // Get active channel
    const { data: activeChannelData } = useQuery({
        queryKey: ['active-channel'],
        queryFn: async () => (await axios.get(`${API_BASE}/youtube/channels/active`)).data,
        refetchInterval: 5000, // Poll every 5 seconds
    });

    const activeChannelId = activeChannelData?.channel_id;

    // Scan mutation
    const scanMutation = useMutation({
        mutationFn: async () => await axios.post(`${API_BASE}/resources/captain/${profileId}/scan-channels`),
        onSuccess: (res) => {
            toast({
                title: "✅ 스캔 완료",
                description: `${res.data.registered} 신규, ${res.data.updated} 업데이트`
            });
            refetch();
        },
        onError: (e: any) => {
            toast({
                variant: "destructive",
                title: "스캔 실패",
                description: e.response?.data?.detail || "오류가 발생했습니다."
            });
        }
    });

    // Launch mutation
    const launchMutation = useMutation({
        mutationFn: async (channelId: string) =>
            await axios.post(`${API_BASE}/youtube/channels/${channelId}/launch`, null, { params: { rotate_ip: true } }),
        onSuccess: (res) => {
            toast({
                title: "🚀 격리 접속 성공",
                description: `IP: ${res.data.ip}`
            });
            queryClient.invalidateQueries({ queryKey: ['active-channel'] });
            queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
        },
        onError: (e: any) => {
            toast({
                variant: "destructive",
                title: "접속 실패",
                description: e.response?.data?.detail || "오류가 발생했습니다."
            });
        }
    });

    const handleScan = () => {
        scanMutation.mutate();
    };

    const handleLaunchChannel = (channelId: string) => {
        if (activeChannelId && activeChannelId !== channelId) {
            // Warn user about closing existing session
            if (!confirm("기존 세션을 종료하고 새 IP로 접속하시겠습니까?")) {
                return;
            }
        }
        launchMutation.mutate(channelId);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4" /> 위임된 브랜드 채널 ({displayChannels.length})
                </h4>
                <div className="flex items-center gap-2">
                    {/* Channel Sync */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleScan}
                        disabled={scanMutation.isPending || parentScan}
                        className="h-7 text-xs"
                    >
                        {scanMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                        {scanMutation.isPending ? "스캔 중..." : "채널 동기화"}
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-xs text-muted-foreground py-2">채널 목록 로딩 중...</div>
            ) : displayChannels.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                    {displayChannels.map((ch: any) => {
                        const isActive = activeChannelId === ch.channel_id;
                        const isQuarantined = ch.status === 'QUARANTINED';
                        const isSelected = selectedChannelIds?.includes(ch.channel_id);

                        return (
                            <Card
                                key={ch.channel_id}
                                className={`
                                    transition-all
                                    ${isSelected ? 'ring-2 ring-primary/60 bg-primary/5 dark:bg-primary/10 border-primary/40' : ''}
                                    ${isActive && !isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}
                                    ${isQuarantined ? 'border-red-500 bg-red-500/5' : 'hover:border-primary/50'}
                                `}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        {/* Channel Info */}
                                        <div className="flex items-center gap-3 flex-1">
                                            {/* Selection Checkbox */}
                                            {onToggleSelectChannel && !isQuarantined && (
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => onToggleSelectChannel(ch.channel_id)}
                                                    aria-label={`Select channel ${ch.channel_name}`}
                                                    className="shrink-0 self-center"
                                                />
                                            )}
                                            {/* Thumbnail */}
                                            {ch.thumbnail_url ? (
                                                <img
                                                    src={ch.thumbnail_url}
                                                    alt={ch.channel_name}
                                                    className="w-12 h-12 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
                                                    {ch.channel_name?.[0] || 'C'}
                                                </div>
                                            )}

                                            {/* Details */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h5 className="font-bold text-foreground">{ch.channel_name}</h5>
                                                    {isActive && (
                                                        <Badge className="bg-primary text-primary-foreground text-[10px] h-5">
                                                            🟢 ACTIVE
                                                        </Badge>
                                                    )}
                                                    {isQuarantined && (
                                                        <Badge variant="destructive" className="text-[10px] h-5">
                                                            ⛔ QUARANTINED
                                                        </Badge>
                                                    )}
                                                    {ch.warmup_status === 'RUNNING' && (
                                                        <Badge variant="outline" className="border-orange-500/20 text-orange-600 dark:text-orange-400 bg-orange-500/10 text-[10px] h-5 animate-pulse">
                                                            🔥 WARMUP ACTIVE
                                                        </Badge>
                                                    )}
                                                    {ch.cultivation_strategy && (
                                                        <Badge variant="outline" className="border-blue-500/20 text-blue-600 dark:text-blue-400 bg-blue-500/10 text-[10px] h-5 cursor-pointer hover:bg-blue-500/20"
                                                               onClick={() => { setSelectedChannelForWizard(ch); setWizardOpen(true); }}>
                                                            🌱 {ch.cultivation_strategy === 'INITIAL' ? '초기육성' : ch.cultivation_strategy === 'NICHE_PIVOT' ? '니치최적화' : ch.cultivation_strategy === 'TRAFFIC_HIJACK' ? '트래픽유도' : '데스밸리복구'} 
                                                            (Day {ch.cultivation_day}) {ch.cultivation_active ? '🤖' : ''}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    {ch.owner_email && (
                                                        <Badge variant="outline" className="text-[10px] h-5 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                                            👤 {ch.owner_email}
                                                        </Badge>
                                                    )}
                                                    {ch.channel_handle && (
                                                        <span className="text-xs text-muted-foreground">{ch.channel_handle}</span>
                                                    )}
                                                    {ch.last_used_ip && (
                                                        <Badge variant="outline" className="text-[10px] h-5">
                                                            IP: {ch.last_used_ip}
                                                        </Badge>
                                                    )}
                                                    {/* Warmup Stage Indicator */}
                                                    {ch.warmup_stage > 0 && (
                                                        <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                                                            Day {ch.warmup_stage}
                                                            {ch.warmup_status === 'COMPLETED' && ' ✅'}
                                                            {ch.warmup_status === 'FAILED' && ' ❌'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <div className="flex items-center gap-2">
                                            {/* [NEW] Cultivation Wizard Button */}
                                            {!isQuarantined && (
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    onClick={() => { setSelectedChannelForWizard(ch); setWizardOpen(true); }}
                                                >
                                                    전략 설정
                                                </Button>
                                            )}
                                            
                                            {/* [NEW] Warmup Button */}
                                            {!isQuarantined && (
                                                <WarmupButton 
                                                    channel={ch} 
                                                    profileId={profileId} 
                                                    onOpenLogs={onOpenLogs} 
                                                    onOpenWizard={(channel) => { setSelectedChannelForWizard(channel); setWizardOpen(true); }}
                                                />
                                            )}

                                            <Button
                                                onClick={() => handleLaunchChannel(ch.channel_id)}
                                                disabled={isQuarantined || launchMutation.isPending}
                                                className={`
                                                    min-w-[120px]
                                                    ${isActive ? 'bg-muted text-muted-foreground' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}
                                                    ${isQuarantined ? 'bg-red-500/15 text-red-600 dark:text-red-400 cursor-not-allowed' : ''}
                                                `}
                                                size="sm"
                                            >
                                                {isQuarantined ? (
                                                    <>
                                                        <Lock className="w-4 h-4 mr-2" /> 접속 차단
                                                    </>
                                                ) : launchMutation.isPending ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 접속 중...
                                                    </>
                                                ) : isActive ? (
                                                    <>현재 접속 중</>
                                                ) : (
                                                    <>
                                                        <PlaySquare className="w-4 h-4 mr-2" /> 격리 접속
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground text-xs">
                    등록된 채널이 없습니다. 위 '채널 동기화'를 눌러주세요.
                </div>
            )}
            
            <CultivationWizard 
                open={wizardOpen} 
                onOpenChange={setWizardOpen} 
                channel={selectedChannelForWizard} 
            />
        </div>
    );
};

// --- Sub Component: Warmup Button with Dropdown ---
export const WarmupButton = ({ 
    channel, 
    profileId, 
    onOpenLogs, 
    onNeedSync, 
    onOpenWizard,
    showBrowserWindow,
    compact = false,
    layout = 'inline'
}: { 
    channel?: any, 
    profileId: string, 
    onOpenLogs?: (channelId: string) => void, 
    onNeedSync?: () => void, 
    onOpenWizard?: (channel: any) => void,
    showBrowserWindow?: boolean,
    compact?: boolean,
    layout?: 'inline' | 'stacked'
}) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const warmupMutation = useMutation({
        mutationFn: async (selectedStage: number) => {
            if (!channel || !channel.channel_id) throw new Error("Channel not found");
            const isVisible = showBrowserWindow !== undefined
                ? showBrowserWindow
                : (typeof window !== 'undefined' ? localStorage.getItem('seed_warmup_visible') === 'true' : true);

            return await axios.post(`${API_BASE}/youtube/channels/${channel.channel_id}/warmup`, null, {
                params: {
                    stage: selectedStage,
                    visible: isVisible
                }
            });
        },
        onMutate: async (selectedStage) => {
            // 진행중임을 즉시 UI에 반영
            await queryClient.cancelQueries({ queryKey: ['captain-channels', profileId] });
            const previousData = queryClient.getQueryData(['captain-channels', profileId]);
            
            queryClient.setQueryData(['captain-channels', profileId], (oldData: any) => {
                if (!oldData) return oldData;
                
                const updateArray = (arr: any[]) => arr.map(ch =>
                    ch.channel_id === channel?.channel_id
                        ? { ...ch, warmup_status: 'RUNNING', warmup_stage: selectedStage }
                        : ch
                );
                
                if (Array.isArray(oldData)) {
                    return updateArray(oldData);
                } else if (oldData.channels && Array.isArray(oldData.channels)) {
                    return { ...oldData, channels: updateArray(oldData.channels) };
                }
                return oldData;
            });
            
            toast({
                title: "웜업 루틴 시작",
                description: `Day ${selectedStage} 웜업이 시작되었습니다. 잠시 기다려주세요.`,
            });
            
            return { previousData };
        },
        onSuccess: (res, selectedStage, variables, context: any) => {
            if (res.data && res.data.success === false) {
                if (context?.previousData) {
                    queryClient.setQueryData(['captain-channels', profileId], context.previousData);
                }
                toast({
                    title: "웜업 오류",
                    description: res.data.message || "웜업 루틴 실행 중 오류가 발생했습니다.",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "웜업 완료",
                    description: `Day ${selectedStage} 웜업이 성공적으로 종료되었습니다.`,
                });
            }
            queryClient.invalidateQueries({ queryKey: ['captain-channels', profileId] });
        },
        onError: (err: any, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['captain-channels', profileId], context.previousData);
            }
            toast({
                title: "웜업 오류",
                description: err.response?.data?.detail || "웜업 루틴 실행 중 오류가 발생했습니다.",
                variant: "destructive",
            });
            queryClient.invalidateQueries({ queryKey: ['captain-channels', profileId] });
        }
    });

    // Individual reset mutation
    const resetMutation = useMutation({
        mutationFn: async () => {
            if (!channel) throw new Error("Channel not found");
            await axios.post(`${API_BASE}/youtube/channels/${channel.channel_id}/warmup/reset`);
        },
        onSuccess: () => {
            queryClient.setQueryData(['captain-channels', profileId], (oldData: any) => {
                if (!oldData) return oldData;
                
                const updateArray = (arr: any[]) => arr.map(ch =>
                    ch.channel_id === channel?.channel_id
                        ? { ...ch, warmup_status: 'IDLE', warmup_stage: 0, warmup_last_run: null }
                        : ch
                );
                
                if (Array.isArray(oldData)) {
                    return updateArray(oldData);
                } else if (oldData.channels && Array.isArray(oldData.channels)) {
                    return { ...oldData, channels: updateArray(oldData.channels) };
                }
                return oldData;
            });
            queryClient.invalidateQueries({ queryKey: ['captain-channels', profileId] });
            toast({
                title: "웜업 상태 초기화",
                description: "계정의 웜업 단계와 로그가 초기화되었습니다.",
            });
        },
        onError: (err: any) => {
            toast({
                title: "초기화 실패",
                description: err.response?.data?.detail || "초기화 중 오류가 발생했습니다.",
                variant: "destructive",
            });
        }
    });

    if (!channel) {
        return (
            <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold border-border text-muted-foreground hover:text-foreground shrink-0"
                onClick={onNeedSync}
            >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                채널 연동 필요
            </Button>
        );
    }

    const warmupStatus = channel.warmup_status || "IDLE";
    const warmupStage = channel.warmup_stage || 0;
    const isMature = warmupStage >= 3;

    const startWarmup = (stage: number) => {
        warmupMutation.mutate(stage);
    };

    const renderBadge = () => {
        if (warmupStatus === "RUNNING") {
            return (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 animate-pulse whitespace-nowrap text-[11px] px-2 py-0.5 font-bold">
                    <Flame className="w-3 h-3 mr-1 fill-current" />
                    진화중 (Stage {warmupStage})
                </Badge>
            );
        }
        if (warmupStatus === "FAILED") {
            return (
                <Badge 
                    variant="outline" 
                    className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 cursor-pointer hover:bg-rose-500/20 whitespace-nowrap text-[11px] px-2 py-0.5 font-bold flex items-center gap-1 shadow-2xs transition-all"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenLogs && channel?.channel_id) {
                            onOpenLogs(channel.channel_id);
                        }
                    }}
                    title={channel.warmup_last_error ? `오류 원인: ${channel.warmup_last_error} (클릭하여 로그 확인)` : "웜업 실패 (클릭하여 로그 확인)"}
                >
                    <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                    <span>⚠️ 웜업 실패 (원인 확인)</span>
                </Badge>
            );
        }
        if (warmupStage > 0 && warmupStage < 3) {
            return (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 whitespace-nowrap text-[11px] px-2 py-0.5 font-bold">
                    🔄 Stage {warmupStage} 완료
                </Badge>
            );
        }
        if (isMature) {
            return (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 whitespace-nowrap text-[11px] px-2 py-0.5 font-bold">
                    ✅ 활성 채널 (Stage 3)
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="bg-muted text-muted-foreground border-border whitespace-nowrap text-[11px] px-2 py-0.5 font-medium">
                ⏳ 웜업 대기중
            </Badge>
        );
    };

    const renderDropdownContent = () => (
        <DropdownMenuContent align="end" className="w-72 p-1.5">
            {channel.warmup_last_error && (
                <div className="p-2 mb-1.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs">
                    <div className="font-bold flex items-center gap-1.5 mb-1 text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>최근 웜업 오류 원인</span>
                    </div>
                    <p className="text-[10px] break-all leading-relaxed font-mono text-foreground/90 bg-background/60 p-1.5 rounded-lg border border-border/50 max-h-24 overflow-y-auto">
                        {channel.warmup_last_error}
                    </p>
                </div>
            )}
            {isMature ? (
                <DropdownMenuItem
                    onClick={() => startWarmup(3)}
                    disabled={warmupStatus === "RUNNING"}
                    className="font-bold text-orange-600 dark:text-orange-400 focus:text-orange-700 dark:focus:text-orange-300 flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-orange-500/10"
                >
                    <Flame className="w-4 h-4 fill-current text-orange-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col text-left">
                        <span className="text-xs font-extrabold">🔥 상시 유지 웜업 실행 (권장)</span>
                        <span className="text-[10.5px] font-normal text-muted-foreground leading-tight mt-0.5">3분간 니치 영상 완청 및 알고리즘 세션 활성화</span>
                    </div>
                </DropdownMenuItem>
            ) : (
                <DropdownMenuItem
                    onClick={() => startWarmup(warmupStage + 1)}
                    disabled={warmupStatus === "RUNNING"}
                    className="font-bold text-indigo-600 dark:text-indigo-400 focus:text-indigo-700 dark:focus:text-indigo-300 flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-indigo-500/10"
                >
                    <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col text-left">
                        <span className="text-xs font-extrabold">▶️ Stage {warmupStage + 1} 육성 시작</span>
                        <span className="text-[10.5px] font-normal text-muted-foreground leading-tight mt-0.5">7일 알고리즘 신뢰도 단계별 자동 빌드업</span>
                    </div>
                </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="my-1" />

            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground">
                단계별 수동 실행
            </div>
            <DropdownMenuItem onClick={() => startWarmup(1)} disabled={warmupStatus === "RUNNING"} className="cursor-pointer text-xs py-1.5">
                🔍 Day 1~2: 순수 관찰자 (Stage 1)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => startWarmup(2)} disabled={warmupStatus === "RUNNING"} className="cursor-pointer text-xs py-1.5">
                🎯 Day 3~5: 관심사 좁히기 (Stage 2)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => startWarmup(3)} disabled={warmupStatus === "RUNNING"} className="cursor-pointer text-xs py-1.5">
                🤝 Day 6~7: 커뮤니티 상호작용 (Stage 3)
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            {onOpenWizard && (
                <DropdownMenuItem onClick={() => onOpenWizard(channel)} className="cursor-pointer text-xs py-1.5">
                    <Settings className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    <span>⚙️ 웜업 전략 설정 마법사</span>
                </DropdownMenuItem>
            )}

            {onOpenLogs && (
                <DropdownMenuItem onClick={() => onOpenLogs(channel.channel_id)} className="cursor-pointer text-xs py-1.5">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    <span>📊 웜업 실행 로그 보기</span>
                </DropdownMenuItem>
            )}

            <DropdownMenuItem
                onClick={() => resetMutation.mutate()}
                disabled={warmupStatus === "RUNNING"}
                className="text-destructive font-semibold cursor-pointer text-xs py-1.5"
            >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                <span>🔄 웜업 상태 초기화</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
    );

    if (layout === 'stacked') {
        return (
            <div className="space-y-2 w-full">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-medium text-muted-foreground shrink-0">육성:</span>
                        {renderBadge()}
                    </div>
                </div>

                <div className="w-full">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-8 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 font-bold text-xs flex items-center justify-center gap-1.5 rounded-lg shadow-2xs"
                                disabled={warmupMutation.isPending || warmupStatus === "RUNNING"}
                            >
                                <Flame className="w-3.5 h-3.5 fill-current text-orange-500" />
                                <span>{warmupStatus === "RUNNING" ? "웜업 진행 중..." : isMature ? "🔥 상시 유지 웜업" : "🌱 웜업 육성 시작"}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        {renderDropdownContent()}
                    </DropdownMenu>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            {/* Enhanced Status Badge */}
            {renderBadge()}

            {/* Dropdown Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 font-bold text-xs flex items-center gap-1.5 shadow-2xs shrink-0"
                        disabled={warmupMutation.isPending || warmupStatus === "RUNNING"}
                    >
                        <Flame className="w-3.5 h-3.5 fill-current text-orange-500" />
                        <span>{warmupStatus === "RUNNING" ? "웜업 중..." : isMature ? "🔥 상시 웜업" : "🌱 웜업 육성"}</span>
                    </Button>
                </DropdownMenuTrigger>
                {renderDropdownContent()}
            </DropdownMenu>
        </div>
    );
};

// Main Component with Log Viewer
const CaptainQuartersWithLogs = () => {
    const [logViewerOpen, setLogViewerOpen] = useState(false);
    const [selectedChannelForLogs, setSelectedChannelForLogs] = useState<string>('');

    return (
        <>
            <CaptainQuarters
                onOpenLogs={(channelId: string) => {
                    setSelectedChannelForLogs(channelId);
                    setLogViewerOpen(true);
                }}
            />
            <WarmupLogViewer
                open={logViewerOpen}
                onOpenChange={setLogViewerOpen}
                channelId={selectedChannelForLogs}
            />
        </>
    );
};

export default CaptainQuartersWithLogs;
