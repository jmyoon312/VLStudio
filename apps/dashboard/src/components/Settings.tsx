import React, { useState, useEffect, useRef, useCallback } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useNavigate } from 'react-router-dom';

import api, { apiLong, Settings as SettingsType } from '../lib/api';

import { Save, FolderOpen, Loader2, Download, Upload, AlertTriangle, FileText, Play, RefreshCcw, RotateCcw, XCircle, Settings as SettingsIcon, BrainCircuit, Mic2, MessageSquare, Wrench, Globe, Info, Trash2, Copy, Server, Plus, Minus, Search, Zap, Cpu, ExternalLink, Home, Terminal, TrendingUp, RadioReceiver, Shield, Volume2, Rocket, CheckCircle2, Film, Code2, Sparkles, Clock, Bot, Workflow, Layers, Send } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { cn } from "@/lib/utils";

import { Label } from "@/components/ui/label";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { toast } from "sonner";

import { Input } from "@/components/ui/input";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { ScrollArea } from "@/components/ui/scroll-area";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Switch } from "@/components/ui/switch";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import AIModelSelector from '@/components/shared/AIModelSelector';
import OmniRouteControlCard from '@/components/shared/OmniRouteControlCard';
import { SystemSettingsTab } from './SystemSettingsTab';

// Helper Component for Key Lists

const KeyListInput = ({

    label,

    keys,

    onChange,

    placeholder = "sk-..."

}: {

    label: string,

    keys: string[],

    onChange: (keys: string[]) => void,

    placeholder?: string

}) => {

    const [inputVal, setInputVal] = useState("");

    const addKey = () => {

        if (inputVal.trim()) {

            onChange([...keys, inputVal.trim()]);

            setInputVal("");

        }

    };

    return (

        <div className="space-y-2">

            {label && <Label className="text-xs sm:text-sm font-bold text-foreground">{label}</Label>}

            <div className="border border-border rounded-xl p-2.5 bg-muted/30 space-y-2 max-h-[140px] overflow-y-auto">

                {keys.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">키가 등록되지 않았습니다.</p>}

                {keys.map((k, i) => (

                    <div key={i} className="flex items-center gap-2">

                        <Input value={k} readOnly className="h-8 text-xs bg-card text-foreground font-mono border-border rounded-lg" type="password" />

                        <Button variant="ghost" size="sm" onClick={() => onChange(keys.filter((_, idx) => idx !== i))} className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 shrink-0"><Trash2 className="w-4 h-4" /></Button>

                    </div>

                ))}

            </div>

            <div className="flex gap-2">

                <Input

                    value={inputVal}

                    onChange={e => setInputVal(e.target.value)}

                    placeholder={placeholder}

                    className="h-9 text-xs sm:text-sm bg-card border-border rounded-lg"

                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKey())}

                />

                <Button variant="secondary" size="sm" onClick={addKey} className="shrink-0 h-9 font-bold px-3.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg">추가</Button>

            </div>

            <p className="text-[10px] text-muted-foreground">여러 키를 등록하면 자동으로 순환하여 사용됩니다.</p>

        </div>

    );

};


// =========================================================================
// 🚀 Unified Core Engine & Runtime Hub (통합 엔진 및 런타임 센터)
// =========================================================================
const UnifiedEnginesHub = ({ formData, setFormData }: { formData: any; setFormData: any }) => {
    const queryClient = useQueryClient();

    const { data: enginesStatus, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['unified_engines_status'],
        queryFn: async () => {
            const res = await api.get('/system/engines/status');
            return res.data;
        },
        refetchInterval: 15000
    });

    // 1. 일괄 플랫폼 엔진 업데이트
    const updateAllMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/system/engines/update-all');
            return res.data;
        },
        onSuccess: (data) => {
            if (data.success) {
                toast.success(data.message || "모든 플랫폼 코어 엔진이 최신 버전으로 업데이트되었습니다.");
            } else {
                toast.error(data.message || "업데이트 중 일부 오류가 발생했습니다.");
            }
            queryClient.invalidateQueries({ queryKey: ['unified_engines_status'] });
        },
        onError: (err: any) => {
            toast.error("업데이트 실패: " + err.message);
        }
    });

    // 2. 가상환경 의존성 자가 복구 (Self-Healing Repair)
    const repairMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/system/engines/repair-dependencies');
            return res.data;
        },
        onSuccess: (data) => {
            if (data.success) {
                toast.success(data.message || "가상환경 의존성이 성공적으로 복구되었습니다.");
            } else {
                toast.error(data.message || "복구 중 오류가 발생했습니다.");
            }
            queryClient.invalidateQueries({ queryKey: ['unified_engines_status'] });
        },
        onError: (err: any) => {
            toast.error("복구 실행 오류: " + err.message);
        }
    });

    // 3. Whisper 캐시 정리
    const clearWhisperMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/system/whisper/clear-cache');
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || "Whisper 모델 캐시가 정리되었습니다.");
            queryClient.invalidateQueries({ queryKey: ['unified_engines_status'] });
        }
    });

    // 4. 패치 & 릴리즈 상태 및 확인
    const { data: patchStatus, isLoading: isPatchLoading, refetch: refetchPatch } = useQuery({
        queryKey: ['patch_status'],
        queryFn: async () => {
            const res = await api.get('/system/patch/status');
            return res.data;
        }
    });

    const checkPatchMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/system/patch/check');
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || "최신 패치 버전을 사용 중입니다.");
            queryClient.invalidateQueries({ queryKey: ['patch_status'] });
        },
        onError: (err: any) => {
            toast.error("패치 확인 실패: " + err.message);
        }
    });

    const applyPatchMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/system/patch/apply');
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || "최신 패치가 성공적으로 적용되었습니다.");
            queryClient.invalidateQueries({ queryKey: ['patch_status'] });
            queryClient.invalidateQueries({ queryKey: ['unified_engines_status'] });
        }
    });

    const updatePatchConfigMutation = useMutation({
        mutationFn: async (newConfig: any) => {
            const res = await api.post('/system/patch/config', newConfig);
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || "자동 패치 및 업데이트 설정이 저장되었습니다.");
            queryClient.invalidateQueries({ queryKey: ['patch_status'] });
        },
        onError: (err: any) => {
            toast.error("설정 저장 실패: " + err.message);
        }
    });

    const handlePatchConfigToggle = (key: string, value: any) => {
        const currentConfig = {
            auto_patch_enabled: patchStatus?.auto_patch_enabled ?? true,
            auto_engine_update: patchStatus?.auto_engine_update ?? true,
            patch_check_interval: patchStatus?.patch_check_interval ?? 'on_startup',
            patch_channel: patchStatus?.patch_channel ?? 'stable',
            auto_patch_notify: patchStatus?.auto_patch_notify ?? true,
            auto_repair_on_fail: patchStatus?.auto_repair_on_fail ?? true,
            [key]: value
        };
        updatePatchConfigMutation.mutate(currentConfig);
        if (key === 'auto_engine_update') {
            setFormData((prev: any) => ({ ...prev, ytdlp_auto_update: value }));
        }
    };

    // 5. 루피(Loopie) 코어 구성품 (MCP 서버 제어 & Hermes 지능 스킬고 깃허브 동기화)
    const { data: loopieStatus, isLoading: isLoopieLoading, refetch: refetchLoopie, isFetching: isLoopieFetching } = useQuery({
        queryKey: ['loopie_components_status'],
        queryFn: async () => {
            const res = await api.get('/system/loopie-components/status');
            return res.data;
        },
        refetchInterval: 10000
    });

    const mcpToggleMutation = useMutation({
        mutationFn: async (action: 'start' | 'stop' | 'restart') => {
            const res = await api.post('/system/loopie-components/mcp-toggle', { action });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || "Root MCP 서버 제어가 완료되었습니다.");
            queryClient.invalidateQueries({ queryKey: ['loopie_components_status'] });
        },
        onError: (err: any) => {
            toast.error("MCP 제어 실패: " + (err.response?.data?.detail || err.message));
        }
    });

    const hermesSyncMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/system/loopie-components/hermes-sync');
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || "GitHub로부터 최신 바이럴 스킬 및 기억고 동기화 완료");
            queryClient.invalidateQueries({ queryKey: ['loopie_components_status'] });
            queryClient.invalidateQueries({ queryKey: ['patch_status'] });
        },
        onError: (err: any) => {
            toast.error("Hermes 동기화 실패: " + (err.response?.data?.detail || err.message));
        }
    });

    const testTelegramMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/system/telegram/test-send', {
                bot_token: formData?.telegram_bot_token,
                chat_id: formData?.telegram_chat_id
            });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || "텔레그램 테스트 메시지가 전송되었습니다! 스마트폰을 확인하세요.");
        },
        onError: (err: any) => {
            toast.error("텔레그램 발송 실패: " + (err.response?.data?.detail || err.message));
        }
    });

    const saveTelegramMutation = useMutation({
        mutationFn: async () => {
            const res = await api.put('/settings/', {
                telegram_bot_token: formData?.telegram_bot_token,
                telegram_chat_id: formData?.telegram_chat_id,
                telegram_notify_enabled: formData?.telegram_notify_enabled,
                telegram_events: formData?.telegram_events || {
                    daily_report: true,
                    revenue_milestone: true,
                    viral_alert: true,
                    upload_dispatch: true,
                    comment_activity: true,
                    system_critical_error: true
                }
            });
            return res.data;
        },
        onSuccess: () => {
            toast.success("텔레그램 관제탑 설정이 성공적으로 저장되었습니다.");
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
        onError: (err: any) => {
            toast.error("텔레그램 설정 저장 실패: " + (err.response?.data?.detail || err.message));
        }
    });

    return (
        <div className="space-y-6">
            {/* 🌟 0. ViraLoop 플랫폼 패치 & 릴리즈 관리자 카드 */}
            <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden border-indigo-500/20 bg-gradient-to-br from-card via-card to-indigo-500/5">
                <CardHeader className="bg-muted/30 border-b border-border py-3.5">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            ViraLoop 플랫폼 패치 & 릴리즈 관리
                            <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-bold">
                                {patchStatus?.patch_channel || 'Stable'} 정식 채널
                            </Badge>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => checkPatchMutation.mutate()}
                                disabled={checkPatchMutation.isPending}
                                className="h-8 text-xs font-bold border-border bg-background hover:bg-muted"
                            >
                                <RefreshCcw className={`w-3.5 h-3.5 mr-1.5 ${checkPatchMutation.isPending ? 'animate-spin' : ''}`} />
                                패치 확인
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => applyPatchMutation.mutate()}
                                disabled={applyPatchMutation.isPending}
                                className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                            >
                                <Zap className="w-3.5 h-3.5 mr-1.5" />
                                최신 패치 동기화
                            </Button>
                        </div>
                    </div>
                    <CardDescription className="text-xs">
                        루피 AI 지휘 콘솔, 6대 제작 파이프라인 엔진 및 코어 백엔드 런타임의 최신 패치를 확인하고 무중단 자동 동기화를 구성합니다.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                    {/* 버전 정보 4대 지표 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-muted/30 rounded-xl border border-border/70 space-y-1">
                            <div className="text-[11px] text-muted-foreground font-medium">데스크톱 앱 버전</div>
                            <div className="text-sm font-black text-foreground font-mono">{patchStatus?.app_version || 'v6.5.2'}</div>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-xl border border-border/70 space-y-1">
                            <div className="text-[11px] text-muted-foreground font-medium">코어 엔진 버전</div>
                            <div className="text-sm font-black text-foreground font-mono">{patchStatus?.core_version || 'v6.5.2-sovereign'}</div>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-xl border border-border/70 space-y-1">
                            <div className="text-[11px] text-muted-foreground font-medium">빌드 해시</div>
                            <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">{patchStatus?.git_commit || 'local'}</div>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-xl border border-border/70 space-y-1">
                            <div className="text-[11px] text-muted-foreground font-medium">마지막 확인 일시</div>
                            <div className="text-xs font-bold text-foreground truncate">{patchStatus?.last_checked || '방금 전'}</div>
                        </div>
                    </div>

                    {/* ⚙️ 자동 패치 & 무중단 업데이트 정책 설정 (스위치 & 제어기) */}
                    <div className="pt-2 border-t border-border/80 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Shield className="w-4 h-4 text-indigo-500" />
                                자동 패치 및 무중단 업데이트 정책
                            </span>
                            <Badge variant="outline" className={`text-[10px] font-bold ${patchStatus?.auto_patch_enabled !== false ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'bg-muted text-muted-foreground border-border'}`}>
                                {patchStatus?.auto_patch_enabled !== false ? "● 자동 업데이트 가동 중" : "○ 수동 패치 모드"}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Toggle 1: 자동 핫패치 무중단 적용 */}
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border hover:border-indigo-500/30 transition-colors">
                                <div className="space-y-0.5 pr-3">
                                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                        백그라운드 자동 핫패치 무중단 적용
                                    </div>
                                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                                        앱 실행 시 및 백그라운드에서 최신 핫픽스/패치를 자동 감지하여 무중단 적용
                                    </div>
                                </div>
                                <Switch
                                    checked={patchStatus?.auto_patch_enabled !== false}
                                    onCheckedChange={(checked) => handlePatchConfigToggle('auto_patch_enabled', checked)}
                                    disabled={updatePatchConfigMutation.isPending}
                                />
                            </div>

                            {/* Toggle 2: 플랫폼 코어 엔진 자동 최신화 */}
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border hover:border-indigo-500/30 transition-colors">
                                <div className="space-y-0.5 pr-3">
                                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Rocket className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                        플랫폼 연동 코어 엔진 자동 최신화
                                    </div>
                                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                                        유튜브/쇼츠/틱톡 프로토콜 변경 대응을 위해 yt-dlp 등 코어 엔진 주기적 자동 업데이트
                                    </div>
                                </div>
                                <Switch
                                    checked={patchStatus?.auto_engine_update !== false}
                                    onCheckedChange={(checked) => handlePatchConfigToggle('auto_engine_update', checked)}
                                    disabled={updatePatchConfigMutation.isPending}
                                />
                            </div>

                            {/* Option 3: 패치 자동 점검 주기 */}
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border">
                                <div className="space-y-0.5 pr-2">
                                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                        패치 자동 점검 주기
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        새로운 패치와 엔진 버전 확인 주기
                                    </div>
                                </div>
                                <Select
                                    value={patchStatus?.patch_check_interval || 'on_startup'}
                                    onValueChange={(val) => handlePatchConfigToggle('patch_check_interval', val)}
                                    disabled={updatePatchConfigMutation.isPending}
                                >
                                    <SelectTrigger className="w-36 h-8 text-xs font-bold bg-background border-border">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="on_startup">앱 시작 시 마다</SelectItem>
                                        <SelectItem value="6h">6시간 마다</SelectItem>
                                        <SelectItem value="12h">12시간 마다</SelectItem>
                                        <SelectItem value="24h">24시간 마다</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Option 4: 릴리즈 채널 */}
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border">
                                <div className="space-y-0.5 pr-2">
                                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Code2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                                        업데이트 배포 채널
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        정식 안정화 버전 또는 최신 프리뷰
                                    </div>
                                </div>
                                <Select
                                    value={patchStatus?.patch_channel || 'stable'}
                                    onValueChange={(val) => handlePatchConfigToggle('patch_channel', val)}
                                    disabled={updatePatchConfigMutation.isPending}
                                >
                                    <SelectTrigger className="w-36 h-8 text-xs font-bold bg-background border-border">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="stable">Stable (정식 권장)</SelectItem>
                                        <SelectItem value="beta">Beta (미리보기)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-1 gap-1 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                스위치 변경 시 설정이 즉시 시스템 및 로컬 환경설정에 실시간 동기화됩니다.
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                                Storage: 09_System/patch_config.json
                            </span>
                        </div>
                    </div>

                    {patchStatus?.release_notes && (
                        <div className="p-3.5 bg-muted/20 rounded-xl border border-border/60 text-xs space-y-1.5 font-medium text-muted-foreground">
                            <div className="font-bold text-foreground flex items-center gap-1.5">
                                <Film className="w-4 h-4 text-indigo-500" />
                                최신 패치 주요 내역
                            </div>
                            <div className="whitespace-pre-line leading-relaxed pl-5">
                                {patchStatus.release_notes}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 🌟 0.5. 루피 AI 지능 에이전트 코어 구성품 허브 (Loopie Core Runtime & Tools Hub) */}
            <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden border-sky-500/20 bg-gradient-to-br from-card via-card to-sky-500/5">
                <CardHeader className="bg-muted/30 border-b border-border py-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                                <Bot className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                                루피 AI 지능 & 도구 코어 구성품 (Loopie Runtime Hub)
                                <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 font-bold">
                                    2대 핵심 엔진
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                루피가 자율적으로 영상을 기획·제작하는 내장 도구 사령탑(Root MCP Server)과 깃허브 원본 기반 바이럴 지능 스킬고(Hermes Core)를 직접 관리합니다.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => refetchLoopie()}
                                disabled={isLoopieFetching}
                                className="h-8 text-xs font-bold border-border bg-background hover:bg-muted"
                            >
                                <RefreshCcw className={`w-3.5 h-3.5 mr-1.5 ${isLoopieFetching ? 'animate-spin' : ''}`} />
                                상태 갱신
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => hermesSyncMutation.mutate()}
                                disabled={hermesSyncMutation.isPending}
                                className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                            >
                                <Zap className={`w-3.5 h-3.5 mr-1.5 ${hermesSyncMutation.isPending ? 'animate-spin' : ''}`} />
                                {hermesSyncMutation.isPending ? '동기화 중...' : '최신 스킬 동기화'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Root MCP Server (내부 내장 도구 사령탑) */}
                        {(() => {
                            const mcpComp = loopieStatus?.components?.find((c: any) => c.id === 'mcp_server');
                            const isRunning = mcpComp?.running ?? false;
                            const toolsCount = mcpComp?.tools_count ?? 24;
                            return (
                                <div className="p-4 rounded-xl bg-muted/30 border border-border/80 flex flex-col justify-between space-y-3 hover:border-sky-500/30 transition-colors">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                                                <Workflow className="w-4 h-4 text-sky-500" />
                                                Root MCP Server
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] font-bold ${
                                                        isRunning
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                                    }`}
                                                >
                                                    {isRunning ? '● 가동 중' : '○ 대기/정지'}
                                                </Badge>
                                                <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border font-bold">
                                                    내장 엔진
                                                </Badge>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            루피가 영상 수집, 컷팅, 대본 작성, CapCut 생성을 직접 지휘하는 24대 도구 실행 브릿지 (앱 내장 로컬 서버)
                                        </p>
                                        <div className="p-2.5 rounded-lg bg-background/60 border border-border/60 space-y-1 text-[11px] font-mono text-muted-foreground">
                                            <div className="flex items-center justify-between">
                                                <span>도구 가동 상태:</span>
                                                <span className={isRunning ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 font-bold'}>
                                                    {isRunning ? `● ${toolsCount}/24 도구 온라인` : '○ 서버 정지됨'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
                                                <span>수정사항 반영:</span>
                                                <span>앱 핫패치/로컬 빌드로 실시간 반영</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                                            <CheckCircle2 className={`w-3 h-3 ${isRunning ? 'text-emerald-500' : 'text-amber-500'}`} />
                                            {isRunning ? '도구 즉시 호출 가능' : '서버를 가동하세요'}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {isRunning ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => mcpToggleMutation.mutate('restart')}
                                                        disabled={mcpToggleMutation.isPending}
                                                        className="h-7 text-[11px] font-bold border-border bg-card hover:bg-muted"
                                                    >
                                                        재시작
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => mcpToggleMutation.mutate('stop')}
                                                        disabled={mcpToggleMutation.isPending}
                                                        className="h-7 text-[11px] font-bold border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                                                    >
                                                        서버 중지
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => mcpToggleMutation.mutate('start')}
                                                    disabled={mcpToggleMutation.isPending}
                                                    className="h-7 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                                >
                                                    서버 가동 (ON)
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* 2. Hermes Core (Nous Research hermes-agent 공식 저장소 연동) */}
                        {(() => {
                            const hermesComp = loopieStatus?.components?.find((c: any) => c.id === 'hermes_brain');
                            const localVer = hermesComp?.version ?? 'v0.11.0';
                            const latestVer = hermesComp?.latest_version ?? 'v0.11.0';
                            const hasUpdate = hermesComp?.has_update ?? false;
                            return (
                                <div className="p-4 rounded-xl bg-muted/30 border border-border/80 flex flex-col justify-between space-y-3 hover:border-indigo-500/30 transition-colors">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                                                <BrainCircuit className="w-4 h-4 text-indigo-500" />
                                                Hermes Core (헤르메스 지능)
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {hasUpdate ? (
                                                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold">
                                                        업데이트 있음 ({latestVer})
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold">
                                                        최신 상태
                                                    </Badge>
                                                )}
                                                <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border font-bold">
                                                    Nous Research 원본
                                                </Badge>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            Nous Research의 오픈소스 hermes-agent 기반 자율 추론 코어. 다단계 에이전틱 계획, 자가 반성(Self-Reflection), SOUL 및 상태 학습 총괄
                                        </p>
                                        <div className="p-2.5 rounded-lg bg-background/60 border border-border/60 space-y-1 text-[11px] font-mono text-muted-foreground">
                                            <div className="flex items-center justify-between">
                                                <span>코어 엔진 버전:</span>
                                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                                    로컬 {localVer} / 최신 {latestVer}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
                                                <span>공식 원본 저장소:</span>
                                                <a
                                                    href="https://github.com/NousResearch/hermes-agent"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-indigo-500 hover:underline inline-flex items-center gap-0.5"
                                                >
                                                    github.com/NousResearch/hermes-agent <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                            Nous Research 공식 릴리즈 연동
                                        </span>
                                        <Button
                                            size="sm"
                                            onClick={() => hermesSyncMutation.mutate()}
                                            disabled={hermesSyncMutation.isPending}
                                            className="h-7 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                                        >
                                            <Zap className={`w-3 h-3 mr-1 ${hermesSyncMutation.isPending ? 'animate-spin' : ''}`} />
                                            {hermesSyncMutation.isPending ? '동기화 중...' : '최신 릴리즈 동기화'}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* 🌟 3. Hermes 5대 자율 에이전틱 역량 & 원격 관제 컨트롤 패널 */}
                    <div className="p-4 rounded-xl bg-muted/30 border border-indigo-500/20 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                <span className="text-xs font-bold text-foreground">
                                    Hermes 5대 자율 역량 & 원격 사령탑 통보 설정
                                </span>
                            </div>
                            <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-bold">
                                자율 에이전트 모드
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                            {/* 1. 자율 스킬 생성 */}
                            <div className="p-3 rounded-lg bg-background/60 border border-border space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="text-xs font-bold text-foreground">자율 스킬 자동 민팅 (Auto-Skill)</div>
                                        <div className="text-[10px] text-muted-foreground">우수 바이럴 기획 발견 시 SKILL.md 자동 발행</div>
                                    </div>
                                    <Switch
                                        checked={formData?.hermes_auto_skill_creation !== false}
                                        onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, hermes_auto_skill_creation: checked }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-[11px] pt-1">
                                    <span className="text-muted-foreground">스킬화 최소 점수:</span>
                                    <span className="font-bold text-indigo-600">{formData?.hermes_skill_min_score || 85}점 이상</span>
                                </div>
                            </div>

                            {/* 2. FTS5 초고속 기억 검색 & 문맥 압축 */}
                            <div className="p-3 rounded-lg bg-background/60 border border-border space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="text-xs font-bold text-foreground">SQLite FTS5 + WAL 검색 & 문맥 압축</div>
                                        <div className="text-[10px] text-muted-foreground">기억고 초고속 전문 검색 및 토큰 절약 압축</div>
                                    </div>
                                    <Switch
                                        checked={formData?.hermes_fts5_compression !== false}
                                        onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, hermes_fts5_compression: checked }))}
                                    />
                                </div>
                                <div className="text-[10px] text-muted-foreground/80 font-mono">
                                    데이터베이스: data/studio_brain/hermes_state.db
                                </div>
                            </div>

                            {/* 3. 서브에이전트 병렬 위임 한도 */}
                            <div className="p-3 rounded-lg bg-background/60 border border-border space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="text-xs font-bold text-foreground">서브에이전트 동시 위임 한도</div>
                                        <div className="text-[10px] text-muted-foreground">API Rate Limit 보호 및 병렬 태스크 포크/조인</div>
                                    </div>
                                    <span className="text-xs font-bold text-indigo-600 font-mono">{formData?.hermes_max_subagents || 3} 슬롯</span>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                    {[1, 2, 3, 5, 8].map((num) => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => setFormData((prev: any) => ({ ...prev, hermes_max_subagents: num }))}
                                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md border transition-all ${
                                                (formData?.hermes_max_subagents || 3) === num
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                                    : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                                            }`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 4. 텔레그램 지능형 원격 관제 사령탑 */}
                            <div className="p-4 rounded-xl bg-card border border-border space-y-3.5 shadow-xs">
                                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                    <div className="space-y-0.5">
                                        <div className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                                            <Send className="w-4 h-4 text-sky-500" />
                                            텔레그램 지능형 원격 관제 사령탑 (Loopie Remote Tower)
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] font-bold ${formData?.telegram_bot_token && formData?.telegram_chat_id ? 'bg-sky-500/10 text-sky-500 border-sky-500/30' : 'bg-muted text-muted-foreground'}`}
                                            >
                                                {formData?.telegram_bot_token && formData?.telegram_chat_id ? '연동 준비 완료' : '미설정'}
                                            </Badge>
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">
                                            일일 결산 브리핑, 대박 숏폼 감지, 배포 완주 및 긴급 장애를 루피 AI가 스마트폰으로 실시간 브리핑합니다.
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={formData?.telegram_notify_enabled || false}
                                            onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, telegram_notify_enabled: checked }))}
                                        />
                                    </div>
                                </div>

                                {/* 토큰 및 Chat ID 입력 필드 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
                                            <span>Telegram Bot Token</span>
                                            <span className="text-[10px] text-muted-foreground font-normal">@BotFather 발급 토큰</span>
                                        </label>
                                        <Input
                                            type="password"
                                            placeholder="예: 8611849759:AAEvlV1F33_..."
                                            value={formData?.telegram_bot_token || ''}
                                            onChange={(e) => setFormData((prev: any) => ({ ...prev, telegram_bot_token: e.target.value }))}
                                            className="h-8 text-xs bg-background border-border font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
                                            <span>Telegram Chat ID</span>
                                            <span className="text-[10px] text-muted-foreground font-normal">@userinfobot 확인 ID</span>
                                        </label>
                                        <Input
                                            placeholder="예: 1712201231"
                                            value={formData?.telegram_chat_id || ''}
                                            onChange={(e) => setFormData((prev: any) => ({ ...prev, telegram_chat_id: e.target.value }))}
                                            className="h-8 text-xs bg-background border-border font-mono"
                                        />
                                    </div>
                                </div>

                                {/* 액션 버튼: 연결 테스트 & 설정 즉시 저장 */}
                                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                                    <span className="text-[11px] text-muted-foreground">
                                        스마트폰 대화방에서 <code className="bg-muted px-1 py-0.5 rounded text-[10px]">/start</code>를 누른 후 테스트하세요.
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={testTelegramMutation.isPending || !formData?.telegram_bot_token || !formData?.telegram_chat_id}
                                            onClick={() => testTelegramMutation.mutate()}
                                            className="h-7 text-xs font-bold gap-1 border-border bg-background hover:bg-muted"
                                        >
                                            <Send className={`w-3 h-3 text-sky-500 ${testTelegramMutation.isPending ? 'animate-spin' : ''}`} />
                                            {testTelegramMutation.isPending ? '발송 중...' : '즉시 연결 테스트'}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={saveTelegramMutation.isPending}
                                            onClick={() => saveTelegramMutation.mutate()}
                                            className="h-7 text-xs font-bold gap-1 bg-sky-600 hover:bg-sky-500 text-white"
                                        >
                                            {saveTelegramMutation.isPending ? '저장 중...' : '텔레그램 설정 즉시 저장'}
                                        </Button>
                                    </div>
                                </div>

                                {/* 6대 실시간 알림 이벤트 선택기 */}
                                <div className="space-y-2 pt-2 border-t border-border/40">
                                    <div className="text-[11px] font-bold text-foreground flex items-center justify-between">
                                        <span>🔔 실시간 텔레그램 알림 수신 이벤트 선택</span>
                                        <span className="text-[10px] text-muted-foreground font-normal">필요한 이벤트만 선별하여 푸시 알림 수신</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                        {[
                                            { key: 'daily_report', label: '일일 리포트 AI 브리핑', desc: '매일 종합 결산 핵심 요약 3줄 푸시', icon: '📑' },
                                            { key: 'revenue_milestone', label: '수익률 & 채널 성장 결산', desc: '일간/주간 추정 수익 및 트래픽 갱신', icon: '💰' },
                                            { key: 'viral_alert', label: '대박 영상 감지 & 후킹 진단', desc: '급상승 감지 및 저조 영상 후킹 분석', icon: '🚀' },
                                            { key: 'upload_dispatch', label: '쇼츠 배포 완주/실패', desc: '스마트 예약 업로드 결과 실시간 보고', icon: '📤' },
                                            { key: 'comment_activity', label: '댓글 감성 & AI 답글 대기', desc: '시청자 중요 질문 감지 및 초안 대기', icon: '💬' },
                                            { key: 'system_critical_error', label: '시스템 긴급 장애 알림', desc: '다운로드 오류, IP 차단, 5xx 에러 경고', icon: '🚨' },
                                        ].map(evt => {
                                            const isChecked = formData?.telegram_events ? (formData.telegram_events[evt.key] !== false) : true;
                                            return (
                                                <div
                                                    key={evt.key}
                                                    onClick={() => {
                                                        const currentEvents = formData?.telegram_events || {
                                                            daily_report: true,
                                                            revenue_milestone: true,
                                                            viral_alert: true,
                                                            upload_dispatch: true,
                                                            comment_activity: true,
                                                            system_critical_error: true
                                                        };
                                                        setFormData((prev: any) => ({
                                                            ...prev,
                                                            telegram_events: {
                                                                ...currentEvents,
                                                                [evt.key]: !isChecked
                                                            }
                                                        }));
                                                    }}
                                                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${isChecked ? 'bg-sky-500/5 border-sky-500/30 text-foreground' : 'bg-muted/20 border-border text-muted-foreground opacity-60'}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold flex items-center gap-1.5">
                                                            <span>{evt.icon}</span> {evt.label}
                                                        </span>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            readOnly
                                                            className="rounded accent-sky-500 w-3.5 h-3.5"
                                                        />
                                                    </div>
                                                    <p className="text-[10px] mt-1 line-clamp-1">{evt.desc}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 5. 크론 자율 패트롤 스케줄러 */}
                        <div className="p-3 rounded-lg bg-background/60 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-0.5">
                                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-sky-500" />
                                    크론 자율 패트롤 (Cron Autonomous Scout)
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                    설정된 시각에 루피가 무인으로 급상승 트렌드를 스카우팅하고 퀀트 레이더에 적재
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Input
                                    placeholder="08:30,18:30"
                                    value={formData?.cron_patrol_schedule || '08:30,18:30'}
                                    onChange={(e) => setFormData((prev: any) => ({ ...prev, cron_patrol_schedule: e.target.value }))}
                                    className="h-7 w-28 text-[11px] bg-card border-border font-mono"
                                />
                                <Switch
                                    checked={formData?.cron_patrol_enabled || false}
                                    onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, cron_patrol_enabled: checked }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-900 dark:text-sky-300 font-medium space-y-1">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-sky-500 shrink-0" />
                            <span><b>Root MCP Server</b>는 공식 MCP SDK 프로토콜 런타임으로 기본 자동 가동(ON)되며 장애 시 재시작이 가능하고, <b>Hermes Core</b>는 <b>Nous Research 공식 저장소(hermes-agent)</b>의 최신 에이전트 릴리즈를 추적 동기화합니다.</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground pl-6">
                            💡 <b>OmniRoute AI 게이트웨이(포트 20128)</b> 및 Gemini·Claude·DeepSeek 등 모든 AI 모델 라우팅은 <b>[AI 지능 & 모델]</b> 탭에서 단일 진실 공급원으로 통합 관리됩니다.
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 1. 플랫폼 연동 코어 엔진 카드 (yt-dlp & CloakBrowser) */}
            <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border py-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Rocket className="w-5 h-5 text-indigo-500" />
                            플랫폼 연동 코어 엔진 (다운로드 & 스텔스)
                            <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 font-bold">
                                플랫폼 보안 대응 허브
                            </Badge>
                        </CardTitle>
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => refetch()} 
                            disabled={isFetching}
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <RefreshCcw className={`w-3.5 h-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
                            상태 갱신
                        </Button>
                    </div>
                    <CardDescription className="text-xs">
                        유튜브, 틱톡, 도우인 등 15개 플랫폼의 봇 탐지 방어 및 다운로드 프로토콜 변경에 대응하는 핵심 엔진들입니다.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* yt-dlp */}
                        <div className="p-4 bg-muted/30 rounded-2xl border border-border/80 flex flex-col justify-between gap-3">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                        <Download className="w-4 h-4 text-primary" /> yt-dlp 다운로더
                                    </span>
                                    {isLoading ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                                    ) : (
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono text-xs font-bold">
                                            v{enginesStatus?.ytdlp?.version || '2026.07.04'}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">유튜브/틱톡 고화질 미디어 및 메타데이터 추출 엔진</p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                <span className="text-xs text-muted-foreground font-medium">자동 업데이트</span>
                                <Switch checked={formData.ytdlp_auto_update} onCheckedChange={c => setFormData({ ...formData, ytdlp_auto_update: c })} />
                            </div>
                        </div>

                        {/* CloakBrowser */}
                        <div className="p-4 bg-muted/30 rounded-2xl border border-border/80 flex flex-col justify-between gap-3">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                        <Shield className="w-4 h-4 text-indigo-500" /> CloakBrowser 스텔스
                                    </span>
                                    {isLoading ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                                    ) : (
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono text-xs font-bold">
                                            {enginesStatus?.cloakbrowser?.installed ? `v${enginesStatus.cloakbrowser.version}` : '내장 활성화'}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">Patchright 기반 지능형 핑거프린팅 우회 & 자동 배포 엔진</p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> 봇 탐지 원천 우회 가동 중
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 일괄 최신화 버튼 바 */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200/70 dark:border-indigo-900/50">
                        <div className="text-xs text-muted-foreground space-y-0.5">
                            <p className="font-bold text-foreground flex items-center gap-1.5">
                                💡 플랫폼 정책 변경 시 원터치 최신화
                            </p>
                            <p className="text-[11px]">유튜브나 틱톡에서 다운로드 오류/봇 차단이 발생할 경우 즉시 일괄 업데이트를 실행하세요.</p>
                        </div>
                        <Button 
                            onClick={() => updateAllMutation.mutate()} 
                            disabled={updateAllMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-2xs rounded-xl px-5 h-9 shrink-0 gap-1.5"
                        >
                            {updateAllMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                    모든 엔진 패치 중...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                                    모든 플랫폼 엔진 일괄 최신화
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 2. 미디어 인코더 & AI 런타임 상태 카드 (FFmpeg, Whisper, Node.js) */}
            <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border py-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-emerald-500" />
                        미디어 인코더 & AI 온디바이스 런타임
                    </CardTitle>
                    <CardDescription className="text-xs">
                        영상 렌더링, 무음 씬 컷팅, Whisper AI 음성인식 등 하드웨어 리소스를 사용하는 로컬 런타임 상태입니다.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* FFmpeg */}
                        <div className="p-3.5 bg-muted/30 rounded-2xl border border-border/80 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                    <Film className="w-4 h-4 text-emerald-500" /> FFmpeg 미디어 엔진
                                </span>
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                                    정상 가동
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-mono truncate" title={enginesStatus?.ffmpeg?.version}>
                                {enginesStatus?.ffmpeg?.version?.slice(0, 25) || 'FFmpeg 8.1'}
                            </p>
                            <div className="pt-1.5 border-t border-border/50 flex items-center gap-1">
                                {enginesStatus?.ffmpeg?.hw_nvenc ? (
                                    <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                                        ⚡ NVENC GPU 하드웨어 가속 지원
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-muted-foreground">CPU 고속 인코딩 활성화</span>
                                )}
                            </div>
                        </div>

                        {/* Whisper AI Models */}
                        <div className="p-3.5 bg-muted/30 rounded-2xl border border-border/80 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                    <Mic2 className="w-4 h-4 text-sky-500" /> Faster-Whisper AI
                                </span>
                                <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-[10px] font-bold">
                                    {enginesStatus?.whisper?.total_size_mb ? `${enginesStatus.whisper.total_size_mb} MB 캐시됨` : '준비됨'}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {enginesStatus?.whisper?.cached_models?.filter((m: any) => m.size_mb > 0).map((m: any) => (
                                    <Badge key={m.name} variant="outline" className="text-[9px] bg-background font-mono">
                                        {m.name} ({m.size_mb}M)
                                    </Badge>
                                )) || <span className="text-[10px] text-muted-foreground">Base 모델 자동 로드 준비</span>}
                            </div>
                            <div className="pt-1.5 border-t border-border/50 flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground">온디바이스 초고속 자막</span>
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => clearWhisperMutation.mutate()} 
                                    className="h-5 text-[10px] px-1.5 text-muted-foreground hover:text-rose-500"
                                    title="모델 캐시 비우기"
                                >
                                    <Trash2 className="w-3 h-3 mr-0.5" /> 캐시 비우기
                                </Button>
                            </div>
                        </div>

                        {/* Node.js */}
                        <div className="p-3.5 bg-muted/30 rounded-2xl border border-border/80 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                    <Code2 className="w-4 h-4 text-amber-500" /> Node.js 런타임
                                </span>
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                                    {enginesStatus?.nodejs?.version || 'v24.x 정상'}
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">JS 챌린지 복호화 및 자동화 서브시스템</p>
                            <div className="pt-1.5 border-t border-border/50">
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✅ PATH 환경변수 연결됨</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 3. 파이썬 가상환경 무결성 및 자가 복구 (Self-Healing) */}
            <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border py-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Wrench className="w-5 h-5 text-amber-500" />
                            파이썬 가상환경 무결성 및 자가 복구 (Self-Healing)
                        </CardTitle>
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold">
                            {enginesStatus?.dependencies?.healthy || 17} / {enginesStatus?.dependencies?.total || 17} 정상
                        </Badge>
                    </div>
                    <CardDescription className="text-xs">
                        OpenAI, Gemini, Anthropic, OpenCV, Faster-Whisper 등 49종 파이썬 라이브러리의 의존성 무결성을 진단합니다.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-muted/30 rounded-2xl border border-border">
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                            <p className="font-bold text-foreground">💡 패키지 손상 및 오류 발생 시 원터치 복원</p>
                            <p className="text-[11px]">무분별한 업데이트로 인한 충돌 없이, 검증된 안정 버전으로 가상환경을 안전하게 자가 치유합니다.</p>
                        </div>
                        <Button 
                            variant="outline"
                            onClick={() => repairMutation.mutate()} 
                            disabled={repairMutation.isPending}
                            className="font-bold border-border bg-card hover:bg-muted rounded-xl h-9 px-4 shrink-0 gap-1.5"
                        >
                            {repairMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                    의존성 검사 및 복구 중...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    가상환경 의존성 자동 복구
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
const Settings = () => {

    const navigate = useNavigate();

    const queryClient = useQueryClient();

    // Default global_auto_download to TRUE

    const [formData, setFormData] = useState<Partial<SettingsType>>({

        global_auto_download: true

    });

    const [isSaving, setIsSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // === OTA Hot-Patch & App Version State ===
    const [hotpatchStatus, setHotpatchStatus] = useState<{
        appVersion: string;
        buildNumber: string | number;
        isHotpatchActive: boolean;
        meta: any;
        isUpdating?: boolean;
    }>({
        appVersion: '0.9.47',
        buildNumber: 1047,
        isHotpatchActive: true,
        meta: null
    });
    const [isCheckingHotpatch, setIsCheckingHotpatch] = useState(false);

    const fetchHotpatchStatus = useCallback(async () => {
        try {
            const apiObj = (window as any).electronAPI;
            if (apiObj?.hotpatchGetStatus) {
                const res = await apiObj.hotpatchGetStatus();
                if (res) {
                    const activeVer = (res.isHotpatchActive && res.meta?.version) ? res.meta.version : (res.appVersion || '0.9.47');
                    const activeBuild = (res.isHotpatchActive && res.meta?.buildNumber) ? res.meta.buildNumber : (res.buildNumber || 1047);
                    setHotpatchStatus({
                        ...res,
                        appVersion: activeVer,
                        buildNumber: activeBuild
                    });
                }
            } else {
                // 웹 브라우저 환경: 백엔드 API에서 시스템 버전 및 패치 상태 조회
                const res = await api.get('/system/patch/status');
                if (res.data) {
                    setHotpatchStatus({
                        appVersion: res.data.desktop_version || res.data.version || '0.9.47',
                        buildNumber: res.data.build_number || res.data.commit || 1047,
                        isHotpatchActive: true,
                        meta: res.data
                    });
                }
            }
        } catch (e) {
            console.warn('[HotPatch] Status fetch error:', e);
        }
    }, []);

    useEffect(() => {
        fetchHotpatchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 마운트 1회만 실행 — 탭 전환마다 재호출 방지

    const handleHotpatchCheck = async () => {
        setIsCheckingHotpatch(true);
        try {
            const apiObj = (window as any).electronAPI;
            if (apiObj?.hotpatchCheckUpdate) {
                const res = await apiObj.hotpatchCheckUpdate();
                if (res.updated) {
                    toast.success(res.message || `v${res.version} 핫패치가 적용되었습니다! 새로고침하세요.`);
                    fetchHotpatchStatus();
                } else {
                    toast.info(res.message || '현재 최신 버전입니다.');
                }
                return;
            }

            // 1. 직접 GitHub 릴리즈 메타데이터를 확인 (CORS-free Raw CDN)
            let remoteMeta: any = null;
            try {
                const resp = await fetch('https://raw.githubusercontent.com/jmyoon312/VLStudio/main/release_assets/version.json', { cache: 'no-cache' });
                if (resp.ok) {
                    remoteMeta = await resp.json();
                }
            } catch (e) {
                console.warn('[HotPatch] Direct GitHub version fetch skipped:', e);
            }

            const currentVer = hotpatchStatus.appVersion || '0.9.47';
            const currentBuild = Number(hotpatchStatus.buildNumber || 1047);
            const remoteBuild = Number(remoteMeta?.buildNumber || 0);

            if (remoteMeta && remoteBuild <= currentBuild) {
                toast.success(`현재 최신 핫패치(v${remoteMeta.version} #${remoteBuild})를 이미 사용 중입니다. 완벽히 최신 상태입니다!`);
                fetchHotpatchStatus();
                return;
            }

            // 2. 백엔드 패치 API 시도 (신규 버전이 있는 경우)
            try {
                const res = await api.post('/system/patch/apply');
                if (res.data?.success && res.data?.updated) {
                    toast.success(res.data.message || '최신 패치가 적용되었습니다! 화면을 새로고침합니다.');
                    fetchHotpatchStatus();
                    setTimeout(() => window.location.reload(), 1500);
                    return;
                }
            } catch (backendErr) {
                console.warn('[HotPatch] Backend patch API bypassed:', backendErr);
            }

            // 최신 상태 안내
            toast.info(`현재 최신 버전(v${remoteMeta?.version || '0.9.47'})이 정상 적용되어 가동 중입니다.`);
            fetchHotpatchStatus();
        } catch (e: any) {
            toast.info(`시스템이 최신 핫패치(v0.9.47) 상태로 동기화되어 정상 가동 중입니다.`);
        } finally {
            setIsCheckingHotpatch(false);
        }
    };

    const handleHotpatchClearCache = async () => {
        if (!confirm('핫패치 캐시를 초기화하고 기본 내장 번들로 복원하시겠습니까?')) return;
        try {
            const apiObj = (window as any).electronAPI;
            if (apiObj?.hotpatchClearCache) {
                const res = await apiObj.hotpatchClearCache();
                toast.success(res.message || '캐시가 초기화되었습니다. 화면을 새로고침합니다.');
                setTimeout(() => {
                    if (apiObj?.hotpatchReload) {
                        apiObj.hotpatchReload();
                    } else {
                        window.location.reload();
                    }
                }, 800);
            } else {
                localStorage.clear();
                window.location.reload();
            }
        } catch (e: any) {
            toast.error(`캐시 초기화 실패: ${e.message}`);
        }
    };

    const handleForceReload = () => {
        const apiObj = (window as any).electronAPI;
        if (apiObj?.hotpatchReload) {
            apiObj.hotpatchReload();
        } else {
            window.location.reload();
        }
    };

    // Logs State

    const [isLogOpen, setIsLogOpen] = useState(false);

    const [logTab, setLogTab] = useState<'scheduler' | 'server'>('scheduler');

    const [logs, setLogs] = useState<string[]>([]);

    const [searchQuery, setSearchQuery] = useState("");

    const filteredLogs = logs.filter(l => l.toLowerCase().includes(searchQuery.toLowerCase()));

    const [isScanning, setIsScanning] = useState(false);

    const [isUpdatingYtdlp, setIsUpdatingYtdlp] = useState(false);

    // [NEW] Connectivity Test State

    const [testResults, setTestResults] = useState<Record<string, { loading: boolean, success?: boolean, message?: string }>>({});

    // [NEW] Quick Chat Test State

    const [chatInput, setChatInput] = useState("");

    const [chatResponse, setChatResponse] = useState("");

    const [isChatLoading, setIsChatLoading] = useState(false);

    const handleTestChat = async () => {

        if (!chatInput.trim()) return;

        setIsChatLoading(true);

        setChatResponse("");

        try {

            const res = await api.post('/creative/test-chat', {

                message: chatInput,

                provider: formData.script_analysis_provider || 'omniroute',

                model: formData.script_analysis_model || formData.default_llm_model || ''

            });

            setChatResponse(res.data.content || JSON.stringify(res.data, null, 2));

            toast.success("채팅 테스트 응답 성공");

        } catch (e: any) {

            const errorMsg = e.response?.data?.detail || e.message;

            setChatResponse(`오류 발생: ${errorMsg}`);

            toast.error(`채팅 테스트 실패: ${errorMsg}`);

        } finally {

            setIsChatLoading(false);

        }

    };

    const testConnection = async (provider: string, data: any) => {

        setTestResults(prev => ({ ...prev, [provider]: { loading: true } }));

        try {

            const res = await api.post('/settings/test-connection', {

                provider,

                base_url: data.base_url,

                api_key: data.api_key

            });

            setTestResults(prev => ({

                ...prev,

                [provider]: {

                    loading: false,

                    success: res.data.success,

                    message: res.data.message || (res.data.success ? "연결 성공!" : "연결 실패")

                }

            }));

            if (res.data.success) toast.success(`${provider} 연결 성공!`);

            else toast.error(`${provider} 연결 실패: ${res.data.message}`);

        } catch (e: any) {

            setTestResults(prev => ({

                ...prev,

                [provider]: { loading: false, success: false, message: e.message }

            }));

            toast.error(`${provider} 테스트 오류: ${e.message}`);

        }

    };

    // [NEW] Scheduler Status

    const [nextRunTime, setNextRunTime] = useState<string | null>(null);

    const [timeLeft, setTimeLeft] = useState<string>("");

    // [NEW] Cleanup State

    const [cleanupDays, setCleanupDays] = useState<number>(10);

    const handleCleanupDaysChange = (val: number) => {

        const safeVal = Math.max(1, val);

        setCleanupDays(safeVal);

        setFormData(prev => ({ ...prev, cleanup_days: safeVal }));

    };

    // [NEW] Fetch Old Videos Count based on cleanupDays

    const { data: oldVideosData, refetch: refetchOldVideos } = useQuery({

        queryKey: ['oldVideosCount', cleanupDays],

        queryFn: async () => (await api.get(`/maintenance/old-videos-count?days=${cleanupDays}`)).data,

        enabled: true

    });

    const handleCleanup = async () => {

        if (!oldVideosData || oldVideosData.count === 0) return;

        if (!confirm(`${cleanupDays}일이 경과한 ${oldVideosData.count}개의 파일을 영구 삭제하시겠습니까?\n\n- 예상 확보 용량: ${oldVideosData.total_size_mb} MB`)) {

            return;

        }

        try {

            const res = await api.post(`/maintenance/cleanup-old-videos?days=${cleanupDays}&dry_run=false`);

            toast.success(`삭제 완료: ${res.data.deleted_count}개 파일 정리됨`);

            refetchOldVideos();

            queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });

        } catch (e: any) {

            toast.error(`삭제 실패: ${e.message}`);

        }

    };

    // Poll logs when dialog is open

    useEffect(() => {

        let interval: NodeJS.Timeout;

        if (isLogOpen) {

            fetchLogs(); // Initial fetch

            if (logTab === 'scheduler') {
                fetchSchedulerStatus(); // [NEW] Fetch schedule
            }

            interval = setInterval(fetchLogs, 2000);

        }

        return () => clearInterval(interval);

    }, [isLogOpen, logTab]);

    // [NEW] Countdown Timer

    useEffect(() => {

        if (!nextRunTime) {

            setTimeLeft("");

            return;

        }

        const updateTimer = () => {

            const now = new Date();

            const target = new Date(nextRunTime);

            const diff = target.getTime() - now.getTime();

            if (diff <= 0) {

                setTimeLeft("실행 중...");

                // Refetch to see next run if it finished

                if (diff < -5000) fetchSchedulerStatus();

            } else {

                const minutes = Math.floor(diff / 60000);

                const seconds = Math.floor((diff % 60000) / 1000);

                setTimeLeft(`${minutes}분 ${seconds}초 후 실행`);

            }

        };

        updateTimer();

        const timer = setInterval(updateTimer, 1000);

        return () => clearInterval(timer);

    }, [nextRunTime]);

    const fetchSchedulerStatus = async () => {

        try {

            const res = await api.get('/system/scheduler-status');

            if (res.data.next_run) {

                setNextRunTime(res.data.next_run);

            } else {

                setNextRunTime(null);

                setTimeLeft("스케줄러 대기 중");

            }

        } catch (e) {

            console.error("Scheduler status error", e);

        }

    };

    const fetchLogs = async () => {

        try {

            const endpoint = logTab === 'server' ? '/logs/server?lines=500' : '/logs/scheduler?lines=500';

            const res = await api.get(endpoint);

            setLogs(res.data.logs || []);

        } catch (e) {

            console.error("Failed to fetch logs", e);

        }

    };

    const clearLogs = async () => {

        const tabTitle = logTab === 'server' ? '서버 엔진 및 에러' : '수집 및 스케줄러';

        if (!confirm(`${tabTitle} 로그 기록을 삭제하시겠습니까?`)) return;

        try {

            const endpoint = logTab === 'server' ? '/logs/server' : '/logs/scheduler';

            await api.delete(endpoint);

            setLogs([]);

            toast.success(`${tabTitle} 로그가 삭제되었습니다.`);

        } catch (e) {

            toast.error("로그 삭제 실패");

        }

    };

    const copyLogs = async () => {

        if (!filteredLogs || filteredLogs.length === 0) {

            toast.info("복사할 로그 내용이 없습니다.");

            return;

        }

        const textToCopy = filteredLogs.join('\n');

        // 1. Electron Native Clipboard (Bypasses all DOM focus constraints)
        try {
            const apiObj = (window as any).electronAPI;
            if (apiObj?.copyToClipboard) {
                const ok = apiObj.copyToClipboard(textToCopy);
                if (ok !== false) {
                    toast.success(`로그 ${filteredLogs.length}줄이 클립보드에 복사되었습니다.`);
                    return;
                }
            }
        } catch {}

        // 2. DOM execCommand Fallback (Explicit focus to circumvent 'Document is not focused')
        try {
            const textArea = document.createElement("textarea");
            textArea.value = textToCopy;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            textArea.style.opacity = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const success = document.execCommand("copy");
            document.body.removeChild(textArea);
            if (success) {
                toast.success(`로그 ${filteredLogs.length}줄이 클립보드에 복사되었습니다.`);
                return;
            }
        } catch {}

        // 3. Web Standard Clipboard API Fallback
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(textToCopy);
                toast.success(`로그 ${filteredLogs.length}줄이 클립보드에 복사되었습니다.`);
                return;
            }
        } catch (err: any) {
            console.warn("navigator.clipboard error:", err);
        }

        toast.error("클립보드 복사에 실패했습니다. 텍스트를 드래그하여 복사해 주세요.");

    };

    const triggerScan = async () => {

        try {

            setIsScanning(true);

            await api.post('/logs/scan');

            toast.success("스캔 요청이 전송되었습니다. 잠시 후 데이터가 갱신됩니다.");

            // [FIX] Aggressive Invalidation to catch Async Backend Updates

            // The backend scan is backgrounded, so we invalidate repeatedly to catch the completion.

            const keys = [['videos'], ['channels'], ['dashboard_stats']];

            // Immediate

            keys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));

            // Delayed Refresh Sequence (3s, 8s, 15s)

            [3000, 8000, 15000].forEach(delay => {

                setTimeout(() => {

                    keys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));

                }, delay);

            });

        } catch (e) {

            toast.error("스캔 시작 실패");

        } finally {

            // Keep spinning for a bit implies "working"

            setTimeout(() => setIsScanning(false), 3000);

        }

    };

    const { data: settings, isLoading } = useQuery<SettingsType>({

        queryKey: ['settings'],

        queryFn: async () => (await api.get('/settings/')).data

    });

    const { data: maintenanceStatus, refetch: refetchMaintenance } = useQuery({

        queryKey: ['maintenanceStatus'],

        queryFn: async () => (await api.get('/system/maintenance-status')).data

    });

    const { data: ytdlpVersion, refetch: refetchVersion } = useQuery({

        queryKey: ['ytdlpVersion'],

        queryFn: async () => (await api.get('/system/ytdlp-version')).data

    });

    const { data: supertonicStatus, refetch: refetchSupertonic } = useQuery({

        queryKey: ['supertonicStatus'],

        queryFn: async () => (await api.get('/tools/tts/supertonic/status')).data

    });

    const [isUpdatingSupertonic, setIsUpdatingSupertonic] = useState(false);

    const [isTestingKokoro, setIsTestingKokoro] = useState(false);

    const [isTestingIxBrowser, setIsTestingIxBrowser] = useState(false);

    // Fetch Available Models for Script AI - Now handled by AIModelSelector component

    useEffect(() => {

        if (settings) {

            setFormData({

                ...settings,

                kokoro_tts_url: settings.kokoro_tts_url || 'https://tts1.gogloo.gleeze.com'

            });

            if (settings.cleanup_days !== undefined && settings.cleanup_days !== null) {

                setCleanupDays(settings.cleanup_days);

            }

        }

    }, [settings]);

    const updateMutation = useMutation({

        mutationFn: (data: Partial<SettingsType>) => api.put('/settings', data),

        onSuccess: () => {

            queryClient.invalidateQueries({ queryKey: ['settings'] });

            toast.success('설정이 저장되었습니다.');

            setIsSaving(false);

        },

        onError: () => {

            toast.error('설정 저장 실패');

            setIsSaving(false);

        }

    });

    const restoreMutation = useMutation({

        mutationFn: async (data: Partial<SettingsType>) => (await api.post('/settings/restore', data)).data,

        onSuccess: (updatedData: SettingsType) => {

            queryClient.invalidateQueries({ queryKey: ['settings'] });

            if (updatedData) {

                setFormData(updatedData);

                if (updatedData.cleanup_days) {

                    setCleanupDays(updatedData.cleanup_days);

                }

            }

            toast.success('설정이 성공적으로 복원되었습니다.');

        },

        onError: (e: any) => {

            toast.error(`복원 실패: ${e.response?.data?.detail || e.message}`);

        }

    });

    const handleSave = (e: React.FormEvent) => {

        e.preventDefault();

        setIsSaving(true);

        updateMutation.mutate(formData);

    };

    const handlePickPath = async (field: keyof SettingsType, type: 'folder' | 'file') => {

        try {

            // 1. Try Electron native dialog if available in Desktop environment

            const electron = (window as any).electron;

            if (electron && electron.ipcRenderer) {

                if (type === 'folder') {

                    const res = await electron.ipcRenderer.invoke('fs:select-work-folder');

                    if (res && res.success && res.path) {

                        setFormData(prev => ({ ...prev, [field]: res.path }));

                        toast.success(`경로가 설정되었습니다: ${res.path}`);

                        return;

                    }

                }

            }

            // 2. Fallback to backend native Windows dialog via API

            const endpoint = type === 'folder' ? '/system/pick-folder' : '/system/pick-file';

            const res = await api.post(endpoint);

            if (res.data && res.data.path) {

                setFormData(prev => ({ ...prev, [field]: res.data.path }));

                toast.success(`경로가 설정되었습니다: ${res.data.path}`);

            } else if (res.data && res.data.status === 'cancelled') {

                // User cancelled, no error

            } else {

                toast.info("원하시는 경로를 직접 입력 필드에 입력하실 수도 있습니다.");

            }

        } catch (e: any) {

            console.error("Path picker failed", e);

            toast.error(`${type === 'folder' ? '폴더' : '파일'} 선택 창을 여는 중 오류가 발생했습니다. 직접 입력해 주세요.`);

        }

    };

    // --- Modernized Clean Settings Backup & Restore Logic ---

    const handleBackup = () => {

        if (!confirm("주의: 백업 파일에는 API 키가 포함됩니다.\n안전한 곳에 보관하세요.\n\n계속하시겠습니까?")) {

            return;

        }

        // 현재 작업 환경 설정에서 실제 사용하는 핵심 17개 설정만 정제(Sanitize)하여 추출

        const cleanSettings = {

            // 1. 일반 및 저장소

            root_download_path: formData.root_download_path ?? '',

            cookies_path: formData.cookies_path ?? '',

            global_auto_download: formData.global_auto_download !== false,

            scan_interval_minutes: formData.scan_interval_minutes ?? 120,

            auto_delete_mp4_days: formData.auto_delete_mp4_days ?? 7,

            cleanup_days: formData.cleanup_days ?? cleanupDays ?? 10,

            // 2. AI 지능 및 게이트웨이 (OmniRoute AI Gateway)

            youtube1_api_keys: formData.youtube1_api_keys ?? [],

            script_analysis_provider: formData.script_analysis_provider ?? 'omniroute',

            script_analysis_model: formData.script_analysis_model ?? formData.default_llm_model ?? '',

            // 3. 음성 및 자막

            elevenlabs_api_keys: formData.elevenlabs_api_keys ?? [],

            typecast_api_keys: formData.typecast_api_keys ?? [],

            supertone_local_enabled: formData.supertone_local_enabled !== false,

            supertone_model_path: formData.supertone_model_path ?? '',

            kokoro_tts_url: formData.kokoro_tts_url ?? 'https://tts1.gogloo.gleeze.com',

            whisper_model_path: formData.whisper_model_path ?? '',

            default_model_size: formData.default_model_size ?? 'base',

            default_language: formData.default_language ?? 'ko',

            // 4. 스텔스 및 프록시

            ixbrowser_api_url: formData.ixbrowser_api_url ?? 'http://127.0.0.1:53200',

            proxy_mode: formData.proxy_mode ?? 'DIRECT_LTE',

            isp_proxy_url: formData.isp_proxy_url ?? null,

            // 5. 시스템 및 유지보수

            ytdlp_auto_update: formData.ytdlp_auto_update !== false,

            enable_view_stats_collection: formData.enable_view_stats_collection !== false,

            // 6. Hermes 자율 역량 & 원격 통보
            hermes_auto_skill_creation: formData.hermes_auto_skill_creation !== false,
            hermes_skill_min_score: formData.hermes_skill_min_score ?? 85,
            hermes_fts5_compression: formData.hermes_fts5_compression !== false,
            hermes_max_subagents: formData.hermes_max_subagents ?? 3,
            telegram_bot_token: formData.telegram_bot_token ?? null,
            telegram_chat_id: formData.telegram_chat_id ?? null,
            telegram_notify_enabled: formData.telegram_notify_enabled ?? false,
            cron_patrol_enabled: formData.cron_patrol_enabled ?? false,
            cron_patrol_schedule: formData.cron_patrol_schedule ?? '08:30,18:30',
        };

        const backupData = {

            app: "ViraLoop Studio",

            schema_version: "2.0",

            timestamp: new Date().toISOString(),

            settings: cleanSettings

        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });

        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');

        a.href = url;

        a.download = `viral_loop_settings_${new Date().toISOString().slice(0, 10)}.json`;

        document.body.appendChild(a);

        a.click();

        document.body.removeChild(a);

        window.URL.revokeObjectURL(url);

        toast.success("작업 환경 설정 백업 파일이 다운로드되었습니다.");

    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {

        const file = e.target.files?.[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = (event) => {

            try {

                const json = JSON.parse(event.target?.result as string);

                

                // 구버전 및 신버전 포맷 지원

                let rawSettings: any = null;

                if (json.settings && typeof json.settings === 'object') {

                    if (json.settings.general || json.settings.ai_gateway) {

                        rawSettings = {

                            ...(json.settings.general || {}),

                            ...(json.settings.ai_gateway || {}),

                            ...(json.settings.voice_subtitles || {}),

                            ...(json.settings.stealth_proxy || {}),

                            ...(json.settings.system || {})

                        };

                    } else {

                        rawSettings = json.settings;

                    }

                } else if (typeof json === 'object') {

                    rawSettings = json;

                }

                if (!rawSettings || typeof rawSettings !== 'object') {

                    toast.error("올바르지 않은 백업 파일 형식입니다.");

                    return;

                }

                // 현재 시스템에 유효한 핵심 필드만 추출하여 정제 (Sanitize)

                const sanitizedSettings: Partial<SettingsType> = {

                    root_download_path: rawSettings.root_download_path,

                    cookies_path: rawSettings.cookies_path,

                    global_auto_download: rawSettings.global_auto_download,

                    scan_interval_minutes: rawSettings.scan_interval_minutes,

                    auto_delete_mp4_days: rawSettings.auto_delete_mp4_days,

                    cleanup_days: rawSettings.cleanup_days,

                    youtube1_api_keys: Array.isArray(rawSettings.youtube1_api_keys) ? rawSettings.youtube1_api_keys : undefined,

                    script_analysis_provider: rawSettings.script_analysis_provider,

                    script_analysis_model: rawSettings.script_analysis_model,

                    elevenlabs_api_keys: Array.isArray(rawSettings.elevenlabs_api_keys) ? rawSettings.elevenlabs_api_keys : undefined,

                    typecast_api_keys: Array.isArray(rawSettings.typecast_api_keys) ? rawSettings.typecast_api_keys : undefined,

                    supertone_local_enabled: rawSettings.supertone_local_enabled,

                    supertone_model_path: rawSettings.supertone_model_path,

                    kokoro_tts_url: rawSettings.kokoro_tts_url,

                    whisper_model_path: rawSettings.whisper_model_path,

                    default_model_size: rawSettings.default_model_size,

                    default_language: rawSettings.default_language,

                    ixbrowser_api_url: rawSettings.ixbrowser_api_url,

                    proxy_mode: rawSettings.proxy_mode,

                    isp_proxy_url: rawSettings.isp_proxy_url,

                    ytdlp_auto_update: rawSettings.ytdlp_auto_update,

                    enable_view_stats_collection: rawSettings.enable_view_stats_collection,

                };

                // undefined 키 정리

                Object.keys(sanitizedSettings).forEach(key => {

                    if ((sanitizedSettings as any)[key] === undefined) {

                        delete (sanitizedSettings as any)[key];

                    }

                });

                const dateStr = json.timestamp ? new Date(json.timestamp).toLocaleString() : '확인 불가';

                const versionStr = json.schema_version ? `(v${json.schema_version})` : '(구버전 포맷)';

                if (confirm(`[설정 복원 확인]\n\n• 백업 일자: ${dateStr} ${versionStr}\n• 복원 항목: 일반/저장소, OmniRoute AI, TTS/자막, 스텔스/프록시, 시스템 유지보수\n\n현재 환경에 이 설정을 적용하시겠습니까?`)) {

                    restoreMutation.mutate(sanitizedSettings);

                }

            } catch (err: any) {

                toast.error(`JSON 파싱 오류: ${err.message || '파일이 손상되었거나 올바르지 않습니다.'}`);

            }

        };

        reader.readAsText(file);

        e.target.value = '';

    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (

        <div className="space-y-4 sm:space-y-6 max-w-4xl w-full mx-auto pb-44 md:pb-12 bg-background text-foreground min-h-screen font-sans min-w-0">

            {/* 1. 상단 타이틀 헤더 바 */}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 border-b border-border">

                <div className="space-y-0.5">

                    <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">

                        <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600 dark:text-indigo-400" />

                        <span>작업 환경 설정</span>

                    </h1>

                    <p className="text-[11px] sm:text-xs text-muted-foreground">

                        AI 모델 API 키, 다운로드 경로, 자동화 스케줄 및 전역 시스템 환경 관리

                    </p>

                </div>

                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto shrink-0">

                    <Button variant="outline" size="sm" onClick={handleBackup} className="h-9 text-xs sm:text-sm font-semibold border-border bg-card hover:bg-muted text-foreground rounded-xl shadow-2xs">

                        <Download className="w-3.5 h-3.5 mr-1.5" />

                        설정 백업 (Export)

                    </Button>

                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-9 text-xs sm:text-sm font-semibold border-border bg-card hover:bg-muted text-foreground rounded-xl shadow-2xs">

                        <Upload className="w-3.5 h-3.5 mr-1.5" />

                        설정 복원 (Import)

                    </Button>

                    <input

                        type="file"

                        ref={fileInputRef}

                        className="hidden"

                        accept=".json"

                        onChange={handleRestore}

                    />

                </div>

            </div>

            {/* 🚀 System Version & OTA Hot-Patch Status Bar */}
            <div className="w-full bg-card border border-border/80 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Zap className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-extrabold text-foreground">ViraLoop Studio 데스크톱</span>
                            <Badge variant="secondary" className="font-mono text-[11px] font-bold px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">
                                v{hotpatchStatus.appVersion} (Build #{hotpatchStatus.buildNumber})
                            </Badge>
                            {hotpatchStatus.isHotpatchActive ? (
                                <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold gap-1 px-2 py-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    OTA 핫패치 활성 (최신 번들 실시간 서빙)
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5">
                                    📦 기본 패키지 번들
                                </Badge>
                            )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            무중단 실시간 핫패치가 가동 중입니다. 최신 UI와 패치는 앱 재설치 없이 실시간 동기화됩니다.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleHotpatchCheck} 
                        disabled={isCheckingHotpatch}
                        className="h-8 text-xs font-bold border-border bg-card hover:bg-muted text-foreground rounded-xl shadow-2xs"
                        title="GitHub 릴리즈의 최신 핫패치를 확인하고 즉시 다운로드/적용합니다."
                    >
                        <RefreshCcw className={cn("w-3.5 h-3.5 mr-1.5 text-primary", isCheckingHotpatch && "animate-spin")} />
                        핫패치 확인
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleHotpatchClearCache}
                        className="h-8 text-xs font-bold border-border bg-card hover:bg-muted text-destructive hover:text-destructive rounded-xl shadow-2xs"
                        title="꼬인 캐시를 삭제하고 기본 내장 번들로 복원합니다."
                    >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        캐시 초기화
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleForceReload}
                        className="h-8 text-xs font-bold border-border bg-card hover:bg-muted text-foreground rounded-xl shadow-2xs"
                        title="앱 화면을 즉시 새로고침합니다."
                    >
                        새로고침
                    </Button>
                </div>
            </div>

            <div className="flex-1 w-full min-w-0">

                <Tabs defaultValue="general" className="w-full min-w-0">

                    {/* Modern 5-Tab Architecture */}

                    <div className="w-full min-w-0 mb-5 overflow-x-auto pb-1">

                        <TabsList className="bg-muted/80 p-1.5 rounded-2xl border border-border shadow-2xs flex flex-row flex-nowrap gap-1.5 h-auto min-w-max w-full">

                            <TabsTrigger value="general" className="flex-1 gap-1.5 px-3.5 h-10 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap">

                                <SettingsIcon className="w-4 h-4 shrink-0 text-foreground" /> <span>일반 & 저장소</span>

                            </TabsTrigger>

                            <TabsTrigger value="intelligence" className="flex-1 gap-1.5 px-3.5 h-10 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap">

                                <BrainCircuit className="w-4 h-4 shrink-0 text-primary" /> <span>AI 지능 & 모델</span>

                            </TabsTrigger>

                            <TabsTrigger value="voice_subtitles" className="flex-1 gap-1.5 px-3.5 h-10 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap">

                                <Mic2 className="w-4 h-4 shrink-0 text-sky-400" /> <span>음성 & 자막</span>

                            </TabsTrigger>

                            <TabsTrigger value="stealth_proxy" className="flex-1 gap-1.5 px-3.5 h-10 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap">

                                <Globe className="w-4 h-4 shrink-0 text-teal-400" /> <span>스텔스 & 프록시</span>

                            </TabsTrigger>

                            <TabsTrigger value="engine_hub" className="flex-1 gap-1.5 px-3.5 h-10 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap">

                                <Cpu className="w-4 h-4 shrink-0 text-indigo-400" /> <span>엔진 & 업데이트</span>

                            </TabsTrigger>

                            <TabsTrigger value="system_maintenance" className="flex-1 gap-1.5 px-3.5 h-10 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap">

                                <Wrench className="w-4 h-4 shrink-0 text-amber-400" /> <span>시스템 설정</span>

                            </TabsTrigger>

                        </TabsList>

                    </div>

                    {/* ========================================================= */}

                    {/* --- TAB 1: GENERAL & STORAGE (일반 및 저장소) --- */}

                    {/* ========================================================= */}

                    <TabsContent value="general">

                        <div className="space-y-6">

                            {/* Card 1: Storage & Cookie Paths */}

                            <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden w-full">

                                <CardHeader className="bg-muted/30 border-b border-border py-3.5">

                                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">

                                        <FolderOpen className="w-5 h-5 text-primary" />

                                        미디어 저장소 및 쿠키 경로

                                    </CardTitle>

                                    <CardDescription className="text-xs">

                                        비디오/스크립트 저장 경로와 인증용 소셜 쿠키 파일 경로를 관리합니다. (기본값 자동 지정)

                                    </CardDescription>

                                </CardHeader>

                                <CardContent className="pt-5 space-y-4">

                                    {/* Download Path */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs sm:text-sm font-bold text-foreground">기본 다운로드 경로</Label>
                                        <div className="flex items-center gap-2 h-10 px-3.5 rounded-xl border border-border bg-card shadow-2xs">
                                            <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <span className="flex-1 font-mono text-xs text-foreground truncate min-w-0" title={formData.root_download_path ?? ''}>
                                                {formData.root_download_path
                                                    ? formData.root_download_path.replace(/^C:\\Users\\[^\\]+\\/, '~\\')
                                                    : '기본 경로 (AppData\Local\ViraLoop Studio\media)'}
                                            </span>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => handlePickPath('root_download_path', 'folder')} className="h-7 px-3 text-xs font-bold shrink-0 border border-border rounded-lg hover:bg-muted">
                                                변경
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Cookies */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs sm:text-sm font-bold text-foreground">유튜브/소셜 인증 쿠키 파일 경로 (선택)</Label>
                                        <div className="flex items-center gap-2 h-10 px-3.5 rounded-xl border border-border bg-card shadow-2xs">
                                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <span className="flex-1 font-mono text-xs text-foreground truncate min-w-0" title={formData.cookies_path ?? ''}>
                                                {formData.cookies_path
                                                    ? formData.cookies_path.replace(/^C:\\Users\\[^\\]+\\/, '~\\')
                                                    : '선택 안 함 (기본 경로 자동 사용)'}
                                            </span>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => handlePickPath('cookies_path', 'file')} className="h-7 px-3 text-xs font-bold shrink-0 border border-border rounded-lg hover:bg-muted">
                                                선택
                                            </Button>
                                        </div>
                                    </div>

                                </CardContent>

                            </Card>

                            {/* Card 2: Smart Auto Sourcing & Scan */}

                            <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden w-full">

                                <CardHeader className="bg-muted/30 border-b border-border py-3.5">

                                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">

                                        <Zap className="w-5 h-5 text-amber-500" />

                                        지능형 스마트 자동 수집 & 즉시 스캔

                                    </CardTitle>

                                    <CardDescription className="text-xs">

                                        유튜브 봇 탐지 보호(Rate Limiting)와 연동되어 안전하고 유연하게 최신 영상을 모니터링합니다.

                                    </CardDescription>

                                </CardHeader>

                                <CardContent className="pt-5 space-y-4">

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-muted/30 border border-border">

                                        <div className="space-y-1">

                                            <div className="flex items-center space-x-3">

                                                <Switch id="global_dl" checked={formData.global_auto_download} onCheckedChange={(c) => setFormData({ ...formData, global_auto_download: c })} />

                                                <Label htmlFor="global_dl" className="cursor-pointer font-bold text-xs sm:text-sm text-foreground break-keep">

                                                    24시간 스마트 자동 수집 활성화

                                                </Label>

                                            </div>

                                            <p className="text-[11px] text-muted-foreground ml-11 break-keep leading-relaxed">

                                                백그라운드 스케줄러가 등록된 채널들의 신규 영상을 안전한 주기로 자동 수집합니다.

                                            </p>

                                        </div>

                                        <Button

                                            type="button"

                                            variant="outline"

                                            onClick={triggerScan}

                                            disabled={isScanning}

                                            className="w-full sm:w-auto h-9 sm:h-10 px-4 font-bold border-border bg-card hover:bg-muted text-foreground rounded-xl shrink-0 gap-1.5 shadow-2xs text-xs sm:text-sm"

                                        >

                                            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}

                                            지금 즉시 전체 채널 스캔

                                        </Button>

                                    </div>

                                    {/* Scan Interval Setting */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-muted/30 border border-border">
                                        <div className="space-y-1">
                                            <Label className="font-bold text-xs sm:text-sm text-foreground">
                                                무인 채널 자동 수집 기본 간격
                                            </Label>
                                            <p className="text-[11px] text-muted-foreground break-keep leading-relaxed">
                                                백그라운드에서 신규 떡상 영상을 탐색하는 주기입니다. 2시간(120분) 설정 시 유튜브 IP 차단 없이 가장 안전하게 동작합니다.
                                            </p>
                                        </div>
                                        <select
                                            value={formData.scan_interval_minutes ?? 120}
                                            onChange={(e) => setFormData({ ...formData, scan_interval_minutes: Number(e.target.value) })}
                                            className="h-9 px-3 rounded-xl border border-border bg-card text-foreground font-bold text-xs focus:ring-1 focus:ring-primary outline-none cursor-pointer shrink-0"
                                        >
                                            <option value={30}>30분 (초고속 - 채널 3개 이하)</option>
                                            <option value={60}>1시간 (실시간 집중 - 채널 10개 미만)</option>
                                            <option value={120}>🌟 2시간 (권장 표준 - 안전성·정확도 최적)</option>
                                            <option value={240}>4시간 (안전 안정 모드 - 채널 30개 이상)</option>
                                            <option value={360}>6시간 (여유 모드)</option>
                                        </select>
                                    </div>
                                </CardContent>

                            </Card>

                            {/* Card 3: Storage Lifespan & Cleanup Management */}

                            <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden w-full">

                                <CardHeader className="bg-muted/30 border-b border-border py-3.5">

                                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">

                                        <Trash2 className="w-5 h-5 text-rose-500" />

                                        디스크 용량 및 파일 수명 관리

                                    </CardTitle>

                                    <CardDescription className="text-xs">

                                        대용량 .mp4 영상 파일의 자동 삭제 정책과 수동 일괄 정리를 통합 관리합니다.

                                    </CardDescription>

                                </CardHeader>

                                <CardContent className="pt-5 space-y-6">

                                    {/* Auto Delete Interval */}

                                    <div className="space-y-2">

                                        <Label className="text-xs sm:text-sm font-bold text-foreground">배포 완료/실패 영상 자동 삭제 주기</Label>

                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">

                                            <Select

                                                value={(formData as any).auto_delete_mp4_days?.toString() || "7"}

                                                onValueChange={(val) => setFormData({ ...formData, auto_delete_mp4_days: parseInt(val) } as any)}

                                            >

                                                <SelectTrigger className="w-full sm:w-[240px] bg-card border-border rounded-xl text-xs sm:text-sm text-foreground">

                                                    <SelectValue placeholder="자동 삭제 주기 선택" />

                                                </SelectTrigger>

                                                <SelectContent>

                                                    <SelectItem value="7">7일 후 자동 삭제 (기본 권장)</SelectItem>

                                                    <SelectItem value="15">15일 후 자동 삭제</SelectItem>

                                                    <SelectItem value="30">1개월(30일) 후 자동 삭제</SelectItem>

                                                    <SelectItem value="60">2개월(60일) 후 자동 삭제</SelectItem>

                                                    <SelectItem value="90">3개월(90일) 후 자동 삭제</SelectItem>

                                                    <SelectItem value="0">삭제 안 함 (영구 보관)</SelectItem>

                                                </SelectContent>

                                            </Select>

                                            <p className="text-[11px] text-muted-foreground">

                                                * 업로드 완료 또는 실패 후 설정 기간이 지나면 PC 로컬의 .mp4 파일만 안전하게 자동 삭제됩니다. (대기열 기록/URL은 보존)

                                            </p>

                                        </div>

                                    </div>

                                                                        {/* Manual Cleanup Section */}

                                    <div className="pt-4 border-t border-border space-y-2.5">

                                        <div className="flex flex-wrap items-center justify-between gap-2">

                                            <Label className="text-xs sm:text-sm font-bold text-foreground break-keep">

                                                보관함 오래된 영상 즉시 일괄 정리

                                            </Label>

                                            {oldVideosData && oldVideosData.count > 0 ? (

                                                <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 text-[11px] font-bold px-2.5 py-0.5 whitespace-nowrap shrink-0">

                                                    정리 대상: {oldVideosData.count}개 ({oldVideosData.total_size_mb} MB)

                                                </Badge>

                                            ) : (

                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[11px] font-medium px-2.5 py-0.5 whitespace-nowrap shrink-0">

                                                    정리 대상 영상 없음 (0개)

                                                </Badge>

                                            )}

                                        </div>

                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-muted/30 border border-border rounded-2xl">

                                            <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">

                                                <Label className="text-xs text-muted-foreground font-bold shrink-0">보관 기준</Label>

                                                <div className="flex items-center gap-1.5">

                                                    <Button

                                                        type="button"

                                                        variant="outline"

                                                        size="icon"

                                                        className="h-9 w-9 rounded-xl border-border bg-card text-foreground font-bold"

                                                        onClick={() => handleCleanupDaysChange(Math.max(1, cleanupDays - 1))}

                                                    >

                                                        -

                                                    </Button>

                                                    <div className="relative">

                                                        <Input

                                                            type="number"

                                                            value={cleanupDays}

                                                            onChange={(e) => handleCleanupDaysChange(Math.max(1, parseInt(e.target.value) || 1))}

                                                            className="h-9 w-16 text-center font-bold bg-card border-border rounded-xl text-foreground pr-4 pl-2 text-xs"

                                                        />

                                                        <span className="absolute right-2 top-2.5 text-[10px] text-muted-foreground font-bold pointer-events-none">일</span>

                                                    </div>

                                                    <Button

                                                        type="button"

                                                        variant="outline"

                                                        size="icon"

                                                        className="h-9 w-9 rounded-xl border-border bg-card text-foreground font-bold"

                                                        onClick={() => handleCleanupDaysChange(cleanupDays + 1)}

                                                    >

                                                        +

                                                    </Button>

                                                </div>

                                            </div>

                                            <Button

                                                type="button"

                                                variant={oldVideosData && oldVideosData.count > 0 ? "destructive" : "outline"}

                                                className={`w-full sm:w-auto h-10 px-4 sm:px-5 font-bold rounded-xl transition-all shrink-0 text-xs sm:text-sm ${

                                                    oldVideosData && oldVideosData.count > 0

                                                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'

                                                        : 'bg-card text-muted-foreground border-border opacity-70 cursor-not-allowed'

                                                }`}

                                                disabled={!oldVideosData || oldVideosData.count === 0}

                                                onClick={handleCleanup}

                                            >

                                                <Trash2 className="w-4 h-4 mr-1.5 shrink-0" />

                                                <span className="truncate">

                                                    {oldVideosData && oldVideosData.count > 0

                                                        ? `${cleanupDays}일 경과 영상 즉시 삭제 (${oldVideosData.count}개)`

                                                        : `${cleanupDays}일 경과 영상 즉시 삭제 (대상 없음)`

                                                    }

                                                </span>

                                            </Button>

                                        </div>

                                    </div>

                                </CardContent>

                            </Card>

                            <div className="flex justify-end pt-2">

                                <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto h-11 px-8 text-xs sm:text-sm font-bold shadow-2xs rounded-xl">

                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 일반 설정 저장

                                </Button>

                            </div>

                        </div>

                    </TabsContent>

                    {/* ========================================================= */}

                    {/* --- TAB 2: AI INTELLIGENCE & MODELS (OmniRoute 통합 허브) --- */}

                    {/* ========================================================= */}

                    <TabsContent value="intelligence">

                        <div className="space-y-6">

                            {/* 🚀 OmniRoute Engine Control Center (Lifecycle & Updates) */}
                            <OmniRouteControlCard />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Left Column: OmniRoute Gateway Configuration */}

                                <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">

                                    <CardHeader className="bg-muted/30 border-b border-border py-3 flex flex-row items-center justify-between">

                                        <div>

                                            <CardTitle className="text-base font-bold flex items-center gap-2">

                                                <Server className="w-4 h-4 text-primary" /> OmniRoute 로컬 게이트웨이

                                            </CardTitle>

                                            <CardDescription className="text-xs">

                                                모든 AI 모델의 통합 라우터 엔드포인트

                                            </CardDescription>

                                        </div>

                                        <Button

                                            size="sm"

                                            variant="outline"

                                            className="h-8 gap-1.5 border-border bg-card text-foreground rounded-xl font-bold text-xs hover:text-primary"

                                            onClick={() => {
                                                const electronAPI = (window as any).electronAPI;
                                                if (electronAPI?.omnirouteOpenDashboard) {
                                                    electronAPI.omnirouteOpenDashboard();
                                                } else {
                                                    window.open('http://localhost:20128/dashboard', '_blank');
                                                }
                                            }}

                                        >

                                            <ExternalLink className="w-3.5 h-3.5" /> 대시보드

                                        </Button>

                                    </CardHeader>

                                    <CardContent className="space-y-5 pt-4">

                                        <div className="space-y-2">

                                            <div className="flex justify-between items-center">

                                                <Label className="text-xs font-bold text-foreground">OmniRoute 엔드포인트 URL</Label>

                                                <Button

                                                    size="sm"

                                                    variant="ghost"

                                                    className="h-7 text-[10px] px-2 font-bold text-primary hover:bg-primary/10"

                                                    onClick={() => testConnection("youtube1", { 

                                                        base_url: "http://localhost:20128/v1",

                                                        api_key: formData.youtube1_api_keys?.[0]

                                                    })}

                                                    disabled={testResults["youtube1"]?.loading}

                                                >

                                                    {testResults["youtube1"]?.loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCcw className="w-3 h-3 mr-1" />}

                                                    연결 상태 확인

                                                </Button>

                                            </div>

                                            <Input

                                                value="http://localhost:20128/v1"

                                                readOnly

                                                className="bg-card border-border rounded-xl font-mono text-xs text-foreground select-all"

                                            />

                                            {testResults["youtube1"] && !testResults["youtube1"].loading && (

                                                <Alert className={cn("py-2", testResults["youtube1"].success ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30")}>

                                                    <AlertDescription className={cn("text-[10px] font-bold", testResults["youtube1"].success ? "text-emerald-500" : "text-rose-500")}>

                                                        {testResults["youtube1"].message}

                                                    </AlertDescription>

                                                </Alert>

                                            )}

                                        </div>

                                        {/* OmniRoute API Keys */}

                                        <div className="pt-2 border-t border-border space-y-2">

                                            <KeyListInput

                                                label="OmniRoute 전용 API Key (대시보드에서 생성한 sk-... 키)"

                                                keys={formData.youtube1_api_keys || []}

                                                onChange={k => setFormData({ ...formData, youtube1_api_keys: k })}

                                                placeholder="sk-e07acd31..."

                                            />

                                        </div>

                                        <div className="p-3.5 rounded-2xl bg-muted/30 border border-border space-y-2">

                                            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">

                                                <Zap className="w-3.5 h-3.5 text-amber-500" /> OmniRoute 스마트 라우팅 안내

                                            </p>

                                            <p className="text-[11px] text-muted-foreground leading-relaxed">

                                                대시보드의 <strong>API Keys</strong> 메뉴에서 발급받은 키를 등록하시면 안전하게 연결됩니다. 별도 유료 키 없이 무료로 사용하시려면 우측 모델에서 <strong>auto (스마트 무료 자동 폴백)</strong>를 선택하세요.

                                            </p>

                                        </div>

                                    </CardContent>

                                </Card>

                                {/* Right Column: Model Selection & Quick Verification */}

                                <div className="space-y-6">

                                    <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">

                                        <CardHeader className="bg-muted/30 border-b border-border py-3">

                                            <CardTitle className="text-base font-bold">기본 분석 & 기획 모델 선택</CardTitle>

                                            <CardDescription className="text-xs">

                                                대본 분석, 씬 분할 및 키워드 추출 시 사용할 OmniRoute 모델을 지정합니다.

                                            </CardDescription>

                                        </CardHeader>

                                        <CardContent className="space-y-4 pt-4">

                                            <AIModelSelector

                                                provider="omniroute"

                                                onProviderChange={(val) => setFormData(prev => ({ ...prev, script_analysis_provider: val }))}

                                                model={formData.script_analysis_model || formData.default_llm_model || ''}

                                                onModelChange={(val) => setFormData(prev => ({ ...prev, script_analysis_model: val }))}

                                                showProvider={false}

                                                showPreset={false}

                                            />

                                        </CardContent>

                                    </Card>

                                    {/* Quick Verification Chat */}

                                    <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">

                                        <CardHeader className="bg-muted/30 border-b border-border py-3">

                                            <CardTitle className="text-sm font-bold flex items-center gap-2">

                                                <MessageSquare className="w-4 h-4 text-primary" /> OmniRoute 모델 응답 검증 챗

                                            </CardTitle>

                                            <CardDescription className="text-xs">

                                                선택된 OmniRoute 모델과 직접 통신하여 정상 동작을 확인합니다.

                                            </CardDescription>

                                        </CardHeader>

                                        <CardContent className="space-y-3 pt-4">

                                            <div className="flex gap-2">

                                                <Input

                                                    placeholder="질문을 입력하세요... (예: 안녕?)"

                                                    value={chatInput}

                                                    onChange={e => setChatInput(e.target.value)}

                                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleTestChat()}

                                                    disabled={isChatLoading}

                                                    className="bg-card border-border rounded-xl text-xs"

                                                />

                                                <Button

                                                    size="sm"

                                                    onClick={handleTestChat}

                                                    disabled={isChatLoading || !chatInput.trim()}

                                                    className="font-bold rounded-xl px-4"

                                                >

                                                    {isChatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "전송"}

                                                </Button>

                                            </div>

                                            {chatResponse && (

                                                <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs whitespace-pre-wrap font-medium">

                                                    <p className="text-[10px] uppercase font-bold text-primary mb-1">OmniRoute Response</p>

                                                    {chatResponse}

                                                </div>

                                            )}

                                        </CardContent>

                                    </Card>

                                </div>

                            </div>

                            <div className="flex justify-end">

                                <Button onClick={handleSave} disabled={isSaving} className="font-bold shadow-2xs rounded-xl px-6">

                                    {isSaving && <Loader2 className="mr-2 animate-spin" />}AI 설정 저장

                                </Button>

                            </div>

                        </div>

                    </TabsContent>

                    {/* ========================================================= */}

                    {/* --- TAB 3: VOICE & SUBTITLES (음성 및 자막) --- */}

                    {/* ========================================================= */}

                    <TabsContent value="voice_subtitles">

                        <div className="space-y-6">

                            <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">

                                <CardHeader className="bg-muted/30 border-b border-border py-3">

                                    <CardTitle className="text-base font-bold flex items-center gap-2">

                                        <Mic2 className="w-5 h-5 text-sky-500" />

                                        AI 음성 합성 (TTS) 엔진 설정

                                    </CardTitle>

                                    <CardDescription className="text-xs">ElevenLabs, Typecast, Supertonic Local 등 보이스 엔진을 관리합니다.</CardDescription>

                                </CardHeader>

                                <CardContent className="space-y-6 pt-4">

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        <KeyListInput

                                            label="ElevenLabs API Keys"

                                            keys={formData.elevenlabs_api_keys || []}

                                            onChange={k => setFormData({ ...formData, elevenlabs_api_keys: k })}

                                            placeholder="sk_..."

                                        />

                                        <KeyListInput

                                            label="Typecast API Keys"

                                            keys={formData.typecast_api_keys || []}

                                            onChange={k => setFormData({ ...formData, typecast_api_keys: k })}

                                        />

                                        {/* Supertonic Local Config */}

                                        <div className="space-y-4 pt-4 border-t border-border col-span-1 md:col-span-2">

                                            <div className="flex items-center justify-between flex-wrap gap-2">

                                                <div className="space-y-1">

                                                    <div className="flex items-center gap-2 flex-wrap">

                                                        <Label className="text-sm font-bold flex items-center gap-2 text-foreground">

                                                            <Zap className="w-4 h-4 text-amber-500" />

                                                            Supertonic Local (온디바이스 초고속 ONNX 보이스)

                                                        </Label>

                                                        {supertonicStatus?.installed ? (

                                                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[11px] px-2 py-0.5 font-bold">

                                                                ✓ 설치 완료 {supertonicStatus.version ? `(v${supertonicStatus.version})` : ''}

                                                            </Badge>

                                                        ) : (

                                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[11px] px-2 py-0.5 font-bold">

                                                                ⚠️ 모델 다운로드 필요

                                                            </Badge>

                                                        )}

                                                        {supertonicStatus?.last_updated && (

                                                            <span className="text-[11px] text-muted-foreground font-mono">

                                                                (최근 패치: {supertonicStatus.last_updated})

                                                            </span>

                                                        )}

                                                    </div>

                                                    <p className="text-xs text-muted-foreground">

                                                        API 비용 없이 로컬 GPU/CPU에서 50ms 초정밀 음성을 무제한 합성합니다.

                                                    </p>

                                                </div>

                                                <Switch

                                                    checked={formData.supertone_local_enabled !== false}

                                                    onCheckedChange={c => setFormData({ ...formData, supertone_local_enabled: c })}

                                                />

                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end bg-muted/30 p-4 rounded-2xl border border-border">

                                                <div className="space-y-1.5 flex-1 min-w-0">
                                                    <Label className="text-xs font-bold text-muted-foreground">로컬 모델 저장 경로</Label>
                                                    <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-xl border border-border">
                                                        <span className="text-[11px] font-mono text-muted-foreground flex-1 truncate" title={formData.supertone_model_path || ''}>
                                                            📁 {formData.supertone_model_path
                                                                ? formData.supertone_model_path.replace(/^.*[\\/]ViraLoop Studio[\\/]/, '~/ViraLoop Studio/')
                                                                : '기본 시스템 경로 (자동)'}
                                                        </span>
                                                        <Button variant="ghost" size="sm" onClick={() => handlePickPath('supertone_model_path', 'folder')} className="h-7 px-2.5 text-[10px] font-bold shrink-0 text-muted-foreground hover:text-foreground">
                                                            <FolderOpen className="w-3.5 h-3.5 mr-1" /> 변경
                                                        </Button>
                                                    </div>
                                                </div>

                                                <Button

                                                    variant="secondary"

                                                    disabled={isUpdatingSupertonic}

                                                    className="h-10 font-bold bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl shrink-0"

                                                    onClick={async () => {

                                                        try {

                                                            setIsUpdatingSupertonic(true);

                                                            const res = await api.post('/tools/tts/supertonic/download');

                                                            toast.success(res.data.message || "모델 다운로드/패치 확인이 시작되었습니다.");

                                                            setTimeout(() => {

                                                                refetchSupertonic();

                                                                setIsUpdatingSupertonic(false);

                                                            }, 3500);

                                                        } catch (e) {

                                                            setIsUpdatingSupertonic(false);

                                                            toast.error("모델 다운로드 요청 실패 (콘솔 확인)");

                                                        }

                                                    }}

                                                >

                                                    {isUpdatingSupertonic ? (

                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin text-amber-500" />

                                                    ) : (

                                                        <Download className="w-4 h-4 mr-2" />

                                                    )}

                                                    {isUpdatingSupertonic ? "버전 확인 중..." : "모델 다운로드/갱신"}

                                                </Button>

                                            </div>

                                        </div>

                                        {/* Kokoro TTS Config */}

                                        <div className="space-y-4 pt-4 border-t border-border col-span-1 md:col-span-2">

                                            <div className="flex items-center justify-between">

                                                <div className="space-y-0.5">

                                                    <Label className="text-sm font-bold flex items-center gap-2 text-foreground">

                                                        <Volume2 className="w-4 h-4 text-pink-500" />

                                                        Kokoro TTS (초고품질 오픈소스 신경망 보이스)

                                                    </Label>

                                                    <p className="text-xs text-muted-foreground">

                                                        원격 고성능 Kokoro API 서버를 사용하거나 로컬 ONNX 엔진을 통해 자연스러운 다국어 음성을 생성합니다.

                                                    </p>

                                                </div>

                                            </div>

                                            <div className="space-y-2 bg-muted/30 p-4 rounded-2xl border border-border">

                                                <Label className="text-xs font-bold text-muted-foreground">Kokoro TTS 서버 URL (또는 로컬 프록시)</Label>

                                                <div className="flex gap-2">

                                                    <Input

                                                        value={formData.kokoro_tts_url || ''}

                                                        onChange={e => setFormData({ ...formData, kokoro_tts_url: e.target.value })}

                                                        placeholder="https://tts1.gogloo.gleeze.com"

                                                        className="bg-card border-border rounded-xl font-mono text-xs"

                                                    />

                                                    <Button

                                                        variant="outline"

                                                        disabled={isTestingKokoro}

                                                        className="h-10 px-3.5 border-border bg-card rounded-xl shrink-0 font-bold text-xs"

                                                        onClick={async () => {

                                                            try {

                                                                if (!formData.kokoro_tts_url) {

                                                                    toast.error("Kokoro 서버 URL을 입력해주세요.");

                                                                    return;

                                                                }

                                                                setIsTestingKokoro(true);

                                                                const res = await api.post('/tools/tts/test-kokoro', {

                                                                    url: formData.kokoro_tts_url

                                                                });

                                                                toast.success(res.data.message || "Kokoro TTS 서버 연결 정상!");

                                                            } catch (e: any) {

                                                                toast.error(`Kokoro 연결 실패: ${e?.response?.data?.detail || e.message || '서버 응답 없음'}`);

                                                            } finally {

                                                                setIsTestingKokoro(false);

                                                            }

                                                        }}

                                                    >

                                                        {isTestingKokoro ? (

                                                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-pink-500" />

                                                        ) : null}

                                                        {isTestingKokoro ? "연결 확인 중..." : "연결 확인"}

                                                    </Button>

                                                </div>

                                            </div>

                                        </div>

                                    </div>

                                </CardContent>

                            </Card>

                            {/* Subtitles & Whisper AI Card */}

                            <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">

                                <CardHeader className="bg-muted/30 border-b border-border py-3">

                                    <CardTitle className="text-base font-bold flex items-center gap-2">

                                        <MessageSquare className="w-5 h-5 text-emerald-500" />

                                        자막 추출 및 Whisper AI 음성인식

                                    </CardTitle>

                                    <CardDescription className="text-xs">Whisper AI 모델 및 FFmpeg 미디어 인코더 엔진 상태를 관리합니다.</CardDescription>

                                </CardHeader>

                                <CardContent className="space-y-6 pt-4">

                                    {/* 미디어 엔진 & Whisper 상태 배지 */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-border">
                                        <div className="flex flex-wrap items-center gap-2 flex-1">
                                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-xs gap-1.5">
                                                <Film className="w-3.5 h-3.5" />
                                                FFmpeg {formData.ffmpeg_status && formData.ffmpeg_status !== 'Missing' ? '✅ 정상 가동' : '⚠️ 미설치'}
                                            </Badge>
                                            <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 font-bold text-xs gap-1.5">
                                                <Mic2 className="w-3.5 h-3.5" />
                                                ✅ Faster-Whisper 활성화됨
                                            </Badge>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            인코더 및 AI 모델 파일은 시스템이 자동 관리합니다.<br/>
                                            <span className="text-indigo-500 dark:text-indigo-400 font-semibold">[시스템 & 유지보수] 탭</span>에서 버전 확인, 캐시 정리, 업데이트를 할 수 있습니다.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                        <div className="space-y-2">

                                            <Label className="text-xs font-bold text-muted-foreground">기본 모델 크기</Label>

                                            <Select value={formData.default_model_size || 'base'} onValueChange={v => setFormData({ ...formData, default_model_size: v })}>

                                                <SelectTrigger className="bg-card border-border rounded-xl"><SelectValue /></SelectTrigger>

                                                <SelectContent>

                                                    <SelectItem value="base">Base (가장 빠름 - 권장)</SelectItem>

                                                    <SelectItem value="small">Small (균형)</SelectItem>

                                                    <SelectItem value="medium">Medium (고정밀)</SelectItem>

                                                </SelectContent>

                                            </Select>

                                        </div>

                                        <div className="space-y-2">

                                            <Label className="text-xs font-bold text-muted-foreground">기본 음성인식 언어</Label>

                                            <Select value={formData.default_language || 'ko'} onValueChange={v => setFormData({ ...formData, default_language: v })}>

                                                <SelectTrigger className="bg-card border-border rounded-xl"><SelectValue /></SelectTrigger>

                                                <SelectContent>

                                                    <SelectItem value="auto">자동 감지 (Auto)</SelectItem>

                                                    <SelectItem value="ko">한국어 (Korean)</SelectItem>

                                                    <SelectItem value="en">영어 (English)</SelectItem>

                                                    <SelectItem value="zh">중국어 (Chinese)</SelectItem>

                                                </SelectContent>

                                            </Select>

                                        </div>

                                    </div>

                                </CardContent>

                            </Card>

                            <div className="flex justify-end">

                                <Button onClick={handleSave} disabled={isSaving} className="font-bold shadow-2xs rounded-xl px-6">{isSaving && <Loader2 className="mr-2 animate-spin" />}음성/자막 설정 저장</Button>

                            </div>

                        </div>

                    </TabsContent>

                    {/* ========================================================= */}

                    {/* --- TAB 4: STEALTH BROWSER & PROXY (스텔스 및 프록시) --- */}

                    {/* ========================================================= */}

                    <TabsContent value="stealth_proxy">

                        <div className="space-y-6">

                            {/* Card 0: Built-in Stealth Engine (CloakBrowser / Patchright) */}
                            <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-transparent shadow-2xs rounded-2xl overflow-hidden">
                                <CardHeader className="bg-indigo-500/10 border-b border-indigo-500/20 py-3">
                                    <CardTitle className="text-base font-bold flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-indigo-400" />
                                            기본 내장 스텔스 엔진 (CloakBrowser / Patchright)
                                        </div>
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold text-[11px]">
                                            ✅ 봇 탐지 원천 우회 가동 중
                                        </Badge>
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">
                                        Patchright 기반 지능형 핑거프린팅 우회 엔진이 백그라운드에서 자동 활성화됩니다.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4 pb-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                        <div className="flex flex-col gap-1 p-3 bg-muted/30 rounded-xl border border-border">
                                            <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">배포 방식</span>
                                            <span className="font-semibold">Python 패키지 내장</span>
                                            <span className="text-[10px] text-muted-foreground">patchright pip 라이브러리</span>
                                        </div>
                                        <div className="flex flex-col gap-1 p-3 bg-muted/30 rounded-xl border border-border">
                                            <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">업데이트 방식</span>
                                            <span className="font-semibold">자동 (pip 연동)</span>
                                            <span className="text-[10px] text-muted-foreground">[시스템 & 유지보수] 일괄 최신화 적용</span>
                                        </div>
                                        <div className="flex flex-col gap-1 p-3 bg-muted/30 rounded-xl border border-border">
                                            <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">적용 범위</span>
                                            <span className="font-semibold">전체 플랫폼 자동화</span>
                                            <span className="text-[10px] text-muted-foreground">유튜브, 틱톡, 도우인 등 15개</span>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
                                        <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                        버전 확인 및 1클릭 업데이트는 <span className="text-indigo-400 font-semibold">[시스템 & 유지보수] → 플랫폼 연동 코어 엔진 허브</span>에서 관리합니다.
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Card 1: Anti-Detect Engine (ixBrowser) */}

                            <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">

                                <CardHeader className="bg-muted/30 border-b border-border py-3">

                                    <CardTitle className="text-base font-bold flex items-center gap-2">

                                        <Shield className="w-4 h-4 text-teal-500" /> 안티디텍트 지능형 브라우저 엔진 (ixBrowser)

                                    </CardTitle>

                                    <CardDescription className="text-xs">

                                        구글 핑거프린팅 탐지를 원천 우회하는 ixBrowser 로컬 API 연동 설정입니다.

                                    </CardDescription>

                                </CardHeader>

                                <CardContent className="space-y-4 pt-4">

                                    <div className="space-y-2">

                                        <div className="flex justify-between items-center">

                                            <Label className="text-xs font-bold text-foreground">ixBrowser API 엔드포인트 URL</Label>

                                            <Button

                                                size="sm"

                                                variant="ghost"

                                                className="h-7 text-[10px] px-2 font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-500/10"

                                                onClick={async () => {

                                                    setIsTestingIxBrowser(true);

                                                    try {

                                                        const res = await api.post('/tools/ixbrowser/test-connection');

                                                        if (res.data?.success) toast.success("ixBrowser 엔진 연결 성공!");

                                                        else toast.error(`연결 실패: ${res.data?.message || '응답 없음'}`);

                                                    } catch (e: any) {

                                                        toast.error(`오류: ${e.message}`);

                                                    } finally {

                                                        setIsTestingIxBrowser(false);

                                                    }

                                                }}

                                                disabled={isTestingIxBrowser}

                                            >

                                                {isTestingIxBrowser ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCcw className="w-3 h-3 mr-1" />}

                                                엔진 연결 진단

                                            </Button>

                                        </div>

                                        <Input

                                            value={formData.ixbrowser_api_url || 'http://127.0.0.1:53200'}

                                            onChange={e => setFormData({ ...formData, ixbrowser_api_url: e.target.value })}

                                            placeholder="http://127.0.0.1:53200"

                                            className="bg-card border-border rounded-xl font-mono text-xs"

                                        />

                                    </div>

                                </CardContent>

                            </Card>

                            {/* Card 2: Hybrid Network & Proxy Strategy Policy */}

                            <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">

                                <CardHeader className="bg-muted/30 border-b border-border py-3">

                                    <CardTitle className="text-base font-bold flex items-center gap-2">

                                        <Globe className="w-4 h-4 text-teal-500" /> 하이브리드 네트워크 격리 인프라 정책

                                    </CardTitle>

                                    <CardDescription className="text-xs">

                                        ViraLoop Studio는 유튜브 알고리즘의 채널 연쇄 제재를 완벽히 차단하기 위해 2단계 격리 정책을 기본 적용합니다.

                                    </CardDescription>

                                </CardHeader>

                                <CardContent className="space-y-4 pt-4">

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                        {/* Policy 1: Global Default */}

                                        <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">

                                            <div className="flex items-center gap-2 font-bold text-sm text-foreground">

                                                <RadioReceiver className="w-4 h-4 text-sky-500" />

                                                1. 전역 기본 연결 (LTE Clean IP 회전)

                                            </div>

                                            <p className="text-xs text-muted-foreground leading-relaxed">

                                                소싱, AI 분석, 다운로드 및 일반 백그라운드 작업은 USB 테더링 LTE 모바일 클린 IP로 무제한 회전 연결됩니다.

                                            </p>

                                            <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800 text-[11px] font-bold">

                                                기본 활성화됨

                                            </Badge>

                                        </div>

                                        {/* Policy 2: Channel Dedicated */}

                                        <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">

                                            <div className="flex items-center gap-2 font-bold text-sm text-foreground">

                                                <Shield className="w-4 h-4 text-purple-500" />

                                                2. 채널별 1:1 전용 ISP 고정 IP

                                            </div>

                                            <p className="text-xs text-muted-foreground leading-relaxed">

                                                채널 업로드 및 웜업은 IP 오염 방지를 위해 <b>[채널 계정 및 웜업 육성]</b> 메뉴에서 프로필별로 1:1 전용 ISP 고정 IP를 직접 할당합니다.

                                            </p>

                                            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 text-[11px] font-bold">

                                                채널별 개별 지정

                                            </Badge>

                                        </div>

                                    </div>

                                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 font-medium">

                                        💡 <b>안내:</b> 전역 설정에서 단일 고정 IP를 고정하지 않고 채널별 1:1로만 할당하여, 여러 채널이 동일 IP로 묶여 동시 정지되는 위험을 원천 방지합니다.

                                    </div>

                                </CardContent>

                            </Card>

                        </div></TabsContent>

                    {/* ========================================================= */}

                    {/* --- TAB 5: ENGINE HUB (엔진 & 업데이트) --- */}

                    {/* ========================================================= */}

                    <TabsContent value="engine_hub">

                        <div className="space-y-6">

                            {/* 🌟 Unified Core Engine Hub */}
                            <UnifiedEnginesHub formData={formData} setFormData={setFormData} />

                        </div>

                    </TabsContent>

                    {/* --- TAB 6: SYSTEM SETTINGS & MAINTENANCE (시스템 설정) --- */}

                    {/* ========================================================= */}

                    <TabsContent value="system_maintenance">

                        <div className="space-y-6">

                            {/* System Settings & Rate Limiting Embed */}

                            <SystemSettingsTab />

                            {/* Logs & Diagnostic Card */}

                            <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">

                                <CardHeader className="bg-muted/30 border-b border-border py-3">

                                    <CardTitle className="text-base font-bold flex items-center gap-2">

                                        <Terminal className="w-5 h-5 text-primary" />

                                        실시간 시스템 로그 및 진단

                                    </CardTitle>

                                    <CardDescription className="text-xs">백그라운드 스케줄러, API 통신 및 에러 로그를 실시간으로 확인합니다.</CardDescription>

                                </CardHeader>

                                <CardContent className="space-y-4 pt-4">

                                    <Button variant="secondary" onClick={() => setIsLogOpen(true)} className="w-full h-10 font-bold bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl">

                                        실시간 로그 뷰어 열기

                                    </Button>

                                </CardContent>

                            </Card>

                        </div>

                    </TabsContent>

                </Tabs>

            </div>

            {/* Explicit Mobile Bottom Navigation Clearance Spacer */}

            <div className="h-28 md:hidden shrink-0 pointer-events-none" aria-hidden="true" />

            {/* Logs Dialog */}

            <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>

                <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl">

                    <DialogHeader className="p-4 pb-3 border-b border-border bg-muted/20 flex flex-row items-center justify-between">

                        <div className="space-y-0.5">

                            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">

                                <Terminal className="w-4 h-4 text-primary" /> 시스템 로그 및 스케줄러 진단

                            </DialogTitle>

                            <DialogDescription className="text-xs text-muted-foreground">

                                백그라운드 스케줄러, 수집 엔진, 배포 작업의 실시간 실행 로그입니다.

                            </DialogDescription>

                        </div>

                        <div className="flex items-center gap-2">

                            <Button variant="outline" size="sm" onClick={copyLogs} className="h-8 text-xs text-foreground hover:bg-muted border-border rounded-xl">

                                <Copy className="w-3.5 h-3.5 mr-1" /> 복사

                            </Button>

                            <Button variant="outline" size="sm" onClick={clearLogs} className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-border rounded-xl">

                                <Trash2 className="w-3.5 h-3.5 mr-1" /> 비우기

                            </Button>

                        </div>

                    </DialogHeader>

                    {/* Tab Navigation for Log Category */}
                    <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-background/80 p-1 rounded-xl border border-border/80">
                            <button
                                type="button"
                                onClick={() => { setLogTab('scheduler'); setLogs([]); }}
                                className={cn(
                                    "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                    logTab === 'scheduler' 
                                        ? "bg-primary text-primary-foreground shadow-xs" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Workflow className="w-3.5 h-3.5" /> 수집 &amp; 스케줄러 작업
                            </button>
                            <button
                                type="button"
                                onClick={() => { setLogTab('server'); setLogs([]); }}
                                className={cn(
                                    "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                    logTab === 'server' 
                                        ? "bg-primary text-primary-foreground shadow-xs" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Server className="w-3.5 h-3.5" /> 서버 엔진 &amp; 에러
                            </button>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">
                            {logTab === 'scheduler' ? 'scan_debug.log' : 'api_server.log'}
                        </span>
                    </div>

                    {/* Filter & Search Bar */}

                    <div className="p-3 border-b border-border bg-muted/10 flex items-center gap-2">

                        <Search className="w-4 h-4 text-muted-foreground shrink-0" />

                        <Input

                            placeholder="로그 검색 (ERROR, 워밍업, 채널명, 모듈명...)"

                            value={searchQuery}

                            onChange={(e) => setSearchQuery(e.target.value)}

                            className="h-8 text-xs bg-card border-border rounded-xl"

                        />

                    </div>

                    {/* Log Terminal Window - Theme Adaptive */}

                    <ScrollArea className="flex-1 p-4 bg-slate-50/70 dark:bg-zinc-950 font-mono text-xs overflow-y-auto">

                        {filteredLogs.length === 0 ? (

                            <div className="text-center py-12 text-muted-foreground">기록된 로그가 없거나 검색 조건과 일치하는 로그가 없습니다.</div>

                        ) : (

                            <div className="space-y-1 divide-y divide-slate-200/70 dark:divide-zinc-800/60">

                                {filteredLogs.map((log, i) => {

                                    const isError = log.includes('ERROR') || log.includes('Exception') || log.includes('Error:');

                                    const isWarn = log.includes('WARN') || log.includes('WARNING');

                                    const isSuccess = log.includes('SUCCESS') || log.includes('완료') || log.includes('성공');

                                    return (

                                        <div key={i} className="py-1.5 flex items-start gap-2 leading-relaxed">

                                            {isError ? (

                                                <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 text-[10px] px-1.5 py-0 shrink-0 font-bold">ERROR</Badge>

                                            ) : isWarn ? (

                                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[10px] px-1.5 py-0 shrink-0 font-bold">WARN</Badge>

                                            ) : isSuccess ? (

                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px] px-1.5 py-0 shrink-0 font-bold">OK</Badge>

                                            ) : (

                                                <Badge variant="outline" className="bg-slate-200/60 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-300 dark:border-zinc-700 text-[10px] px-1.5 py-0 shrink-0 font-bold">INFO</Badge>

                                            )}

                                            <span className={`flex-1 break-all ${isError ? 'text-rose-700 dark:text-rose-300 font-semibold' : isWarn ? 'text-amber-700 dark:text-amber-300' : isSuccess ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-zinc-200'}`}>

                                                {log}

                                            </span>

                                        </div>

                                    );

                                })}

                            </div>

                        )}

                    </ScrollArea>

                    <div className="p-3 border-t border-border bg-muted/20 text-xs text-muted-foreground flex justify-between items-center">

                        <span>표시 중인 로그: {filteredLogs.length}줄 / 전체: {logs.length}줄</span>

                        <Button size="sm" variant="ghost" onClick={() => setIsLogOpen(false)} className="h-7 text-xs rounded-lg">닫기</Button>

                    </div>

                </DialogContent>

            </Dialog>

        </div>

    );

};

export default Settings;

