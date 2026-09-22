import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
    BrainCircuit, ShieldCheck, Zap, RefreshCcw,
    Settings, Info, History, Database,
    Cpu, Globe, Award, Loader2, Sparkles,
    ArrowUpCircle, ExternalLink, Home,
    Activity, Network, Wrench
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AIModelSelector from '@/components/shared/AIModelSelector';

const LoopieTab = () => {
    const queryClient = useQueryClient();
    const [isUpdating, setIsUpdating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // 1. Data Fetching
    const { data: loopieStatus, isLoading: isStatusLoading } = useQuery({
        queryKey: ['loopieStatus'],
        queryFn: async () => (await api.get('/hermes/status')).data,
        refetchInterval: 10000
    });

    const { data: settings, isLoading: isSettingsLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => (await api.get('/settings/')).data
    });



    // 2. Local Form State
    const [formData, setFormData] = useState<any>(null);
    const [isHealingFts, setIsHealingFts] = useState(false);

    // Initialize form data when settings are loaded
    React.useEffect(() => {
        if (settings && !formData) {
            setFormData({
                agent_provider: settings.hermes_agent_provider || 'omniroute',
                agent_model: settings.hermes_agent_model || settings.default_llm_model || 'viraloop1',
                hermes_wisdom_depth: settings.hermes_wisdom_depth || 3,
                reflection_verbosity: settings.hermes_reflection_verbosity || 'balanced',
                auto_reflection: settings.hermes_auto_reflection ?? true,
                auto_update_enabled: settings.hermes_auto_update_enabled ?? true,
                hermes_cron_continuity_enabled: settings.hermes_cron_continuity_enabled ?? true,
                hermes_monitor_mode_enabled: settings.hermes_monitor_mode_enabled ?? true,
                hermes_subagent_steering_enabled: settings.hermes_subagent_steering_enabled ?? true,
                hermes_structured_schema_enforced: settings.hermes_structured_schema_enforced ?? true,
                hermes_instruction_protection_enabled: settings.hermes_instruction_protection_enabled ?? true,
                hermes_har_api_mode: settings.hermes_har_api_mode || 'auto',
                hermes_fts_wal_pool_size: settings.hermes_fts_wal_pool_size || 5,
            });
        }
    }, [settings, formData]);

    // 3. Mutations
    const updateSettingsMutation = useMutation({
        mutationFn: (data: any) => api.put('/hermes/settings', data),
        onSuccess: () => {
            toast.success("Loopie 인텔리전스 설정이 영구 저장되었습니다.");
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            queryClient.invalidateQueries({ queryKey: ['loopieStatus'] });
            setIsSaving(false);
        },
        onError: (e: any) => {
            toast.error(`설정 저장 실패: ${e.message}`);
            setIsSaving(false);
        }
    });

    const selfHealFtsMutation = useMutation({
        mutationFn: () => api.post('/hermes/self-heal-fts'),
        onMutate: () => setIsHealingFts(true),
        onSuccess: (res) => {
            if (res.data?.status === 'success') {
                toast.success(res.data.message || "FTS5 색인 자가 치유 완료");
            } else {
                toast.error(res.data?.message || "FTS5 자가 치유 실패");
            }
        },
        onError: (e: any) => toast.error(`FTS5 자가 치유 오류: ${e.message}`),
        onSettled: () => setIsHealingFts(false)
    });

    const autoUpdateMutation = useMutation({
        mutationFn: () => api.post('/hermes/update'),
        onMutate: () => setIsUpdating(true),
        onSuccess: (res) => {
            if (res.data.status === 'success') {
                toast.success(`Loopie 업데이트 완료: ${res.data.version_info}`);
            } else {
                toast.error(`업데이트 실패: ${res.data.message}`);
            }
        },
        onError: (e: any) => toast.error(`서버 통신 오류: ${e.message}`),
        onSettled: () => setIsUpdating(false)
    });



    if (isStatusLoading || isSettingsLoading || !formData) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    const handleFieldChange = (field: string, val: any) => {
        setFormData((prev: any) => ({
            ...prev,
            [field]: val
        }));
    };

    const handleSave = () => {
        setIsSaving(true);
        updateSettingsMutation.mutate(formData);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                        <BrainCircuit className="w-5 h-5 text-indigo-400" /> Loopie Intelligence Center
                    </h2>
                    <p className="text-xs text-muted-foreground">Sovereign Intelligence의 행동 논리와 전략적 성찰을 관리합니다.</p>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 h-9 font-bold border-border bg-card hover:bg-muted text-foreground rounded-xl flex-1 sm:flex-none"
                            onClick={() => autoUpdateMutation.mutate()}
                            disabled={isUpdating}
                        >
                            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                            시스템 업데이트
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 h-9 shadow-2xs rounded-xl flex-1 sm:flex-none"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
                            설정 저장
                        </Button>
                    </div>
                    {loopieStatus?.version && (
                        <div className="text-[10px] text-muted-foreground mr-1">
                            현재 버전: <span className="font-mono font-bold text-indigo-400">
                                {typeof loopieStatus.version === 'object' 
                                    ? `local: ${loopieStatus.version.local} | latest: ${loopieStatus.version.latest}` 
                                    : loopieStatus.version}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left: Identity Card */}
                <Card className="md:col-span-4 bg-muted/20 border-border rounded-2xl shadow-2xs overflow-hidden">
                    <CardHeader className="pb-3 bg-muted/30 border-b border-border">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-2">
                            <Sparkles className="w-5 h-5 text-indigo-400" />
                        </div>
                        <CardTitle className="text-base font-bold text-foreground">Core Identity</CardTitle>
                        <CardDescription className="text-xs">지능 엔진 식별 정보</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground uppercase font-bold">Designation</Label>
                            <div className="text-sm font-bold text-foreground">{loopieStatus?.identity || 'Strategic Coordinator'}</div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground uppercase font-bold">Current reasoning Model</Label>
                            <div>
                                <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-mono font-bold">{loopieStatus?.model || 'Auto'}</Badge>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground uppercase font-bold">Integrity Status</Label>
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                                <ShieldCheck className="w-4 h-4" /> SECURE / OPTIMIZED (v0.21.3)
                            </div>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-border">
                            <Label className="text-[10px] text-muted-foreground uppercase font-bold">FTS5 Memory Concurrency</Label>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground font-mono">WAL mode=ro ({formData.hermes_fts_wal_pool_size || 5} pool)</span>
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                    자가치유 보장
                                </Badge>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => selfHealFtsMutation.mutate()}
                                disabled={isHealingFts}
                                className="w-full h-8 text-xs font-bold border-border bg-card hover:bg-muted text-foreground rounded-xl flex items-center justify-center gap-1.5 mt-2"
                            >
                                {isHealingFts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5 text-primary" />}
                                FTS5 검색 색인 자가 치유
                            </Button>
                        </div>
                    </CardContent>
                    <CardFooter className="pt-0 border-t border-border mt-2 text-[10px] text-muted-foreground p-4">
                        <Info className="w-3.5 h-3.5 mr-1 shrink-0 text-primary" /> Loopie는 Collective Wisdom 및 FTS5 색인을 활용하여 자율 의사 결정을 수행합니다.
                    </CardFooter>
                </Card>

                {/* Right: Detailed Settings */}
                <div className="md:col-span-8 space-y-6">
                    <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">
                        <CardHeader className="pb-3 bg-muted/30 border-b border-border">
                            <CardTitle className="text-sm font-bold text-foreground">Cognitive Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-4">
                            {/* Model Selection */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-foreground">전략 추론 모델 (Reasoning Model)</Label>
                                    <AIModelSelector
                                        provider={formData.agent_provider}
                                        onProviderChange={(p) => handleFieldChange('agent_provider', p)}
                                        model={formData.agent_model}
                                        onModelChange={(m) => handleFieldChange('agent_model', m)}
                                        showPreset={false}
                                        compact={true}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-foreground">성찰 깊이 (Reflection Verbosity)</Label>
                                    <Select
                                        value={formData.reflection_verbosity}
                                        onValueChange={(v) => handleFieldChange('reflection_verbosity', v)}
                                    >
                                        <SelectTrigger className="h-10 bg-card border-border rounded-xl text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low (Summary Only)</SelectItem>
                                            <SelectItem value="balanced">Balanced (Strategic Analysis)</SelectItem>
                                            <SelectItem value="high">High (Granular Tech Breakdown)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>



                            {/* Wisdom Depth Slider */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs font-bold flex items-center gap-2 text-foreground">
                                        <Database className="w-3.5 h-3.5 text-indigo-400" /> Wisdom Context Depth
                                    </Label>
                                    <span className="text-xs font-mono font-bold text-indigo-400">{formData.hermes_wisdom_depth} Successful Missions</span>
                                </div>
                                <Slider
                                    value={[formData.hermes_wisdom_depth]}
                                    max={10}
                                    step={1}
                                    onValueChange={(val) => {
                                        handleFieldChange('hermes_wisdom_depth', val[0]);
                                    }}
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    추론 시 과거의 어떤 성공 경험을 얼마큼 참조할지 결정합니다. 수치가 높을수록 정확하지만 연산량이 많아집니다.
                                </p>
                            </div>

                            {/* Automation Switches */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <div className="flex items-center justify-between p-3.5 border border-border rounded-2xl bg-muted/30">
                                    <div className="space-y-0.5">
                                        <Label className="text-xs font-bold text-foreground">자율 성찰 (Auto-Reflection)</Label>
                                        <p className="text-[10px] text-muted-foreground">미션 종료 시 자동 학습 수행</p>
                                    </div>
                                    <Switch
                                        checked={formData.auto_reflection}
                                        onCheckedChange={(c) => handleFieldChange('auto_reflection', c)}
                                    />
                                </div>
                                <div className="flex items-center justify-between p-3.5 border border-border rounded-2xl bg-muted/30">
                                    <div className="space-y-0.5">
                                        <Label className="text-xs font-bold text-foreground">지능 자동 갱신 (Auto-Update)</Label>
                                        <p className="text-[10px] text-muted-foreground">최신 tactical definitions 동기화</p>
                                    </div>
                                    <Switch
                                        checked={formData.auto_update_enabled}
                                        onCheckedChange={(c) => handleFieldChange('auto_update_enabled', c)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Hermes v0.21.3 Sovereign Governance Matrix */}
                    <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">
                        <CardHeader className="pb-3 bg-muted/30 border-b border-border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                        Hermes v0.21.3 Sovereign Governance Matrix
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                        크론 연속성 기억, 모니터 무변경 절감, 서브에이전트 런타임 조타 및 SQLite FTS5 동시성 안전망
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-mono font-bold">
                                    v0.21.3 Core
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-4">
                            {/* 5대 거버넌스 스위치 그리드 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {/* 1. 크론 작업 연속성 기억 */}
                                <div className="flex items-start justify-between p-3.5 border border-border rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors">
                                    <div className="space-y-1 pr-3">
                                        <div className="flex items-center gap-1.5">
                                            <Activity className="w-3.5 h-3.5 text-indigo-500" />
                                            <Label className="text-xs font-bold text-foreground">크론 연속성 기억 (Cron Continuity)</Label>
                                        </div>
                                        <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                                            정기 스카우트/수집 시 이전 세션의 추론 맥락과 중복 감지 이력을 유지하여 단절 없는 판단을 지속합니다.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.hermes_cron_continuity_enabled}
                                        onCheckedChange={(c) => handleFieldChange('hermes_cron_continuity_enabled', c)}
                                    />
                                </div>

                                {/* 2. 모니터 모드 토큰 절감 */}
                                <div className="flex items-start justify-between p-3.5 border border-border rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors">
                                    <div className="space-y-1 pr-3">
                                        <div className="flex items-center gap-1.5">
                                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                                            <Label className="text-xs font-bold text-foreground">모니터 무변경 절감 (Monitor Mode)</Label>
                                        </div>
                                        <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                                            트렌드 레이더 감시 시 신규 변경 사항이 없을 경우 LLM 호출을 건너뛰어 불필요한 토큰 비용 $0을 달성합니다.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.hermes_monitor_mode_enabled}
                                        onCheckedChange={(c) => handleFieldChange('hermes_monitor_mode_enabled', c)}
                                    />
                                </div>

                                {/* 3. 서브에이전트 런타임 조타 */}
                                <div className="flex items-start justify-between p-3.5 border border-border rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors">
                                    <div className="space-y-1 pr-3">
                                        <div className="flex items-center gap-1.5">
                                            <Cpu className="w-3.5 h-3.5 text-blue-500" />
                                            <Label className="text-xs font-bold text-foreground">실시간 서브에이전트 조타 (Steering)</Label>
                                        </div>
                                        <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                                            대본 분석, 타임코드 분할 등 하위 작업 실행 도중 실시간 코스 교정 및 부분 산출물 유실을 방지합니다.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.hermes_subagent_steering_enabled}
                                        onCheckedChange={(c) => handleFieldChange('hermes_subagent_steering_enabled', c)}
                                    />
                                </div>

                                {/* 4. 엄격한 JSON-Schema 강제 */}
                                <div className="flex items-start justify-between p-3.5 border border-border rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors">
                                    <div className="space-y-1 pr-3">
                                        <div className="flex items-center gap-1.5">
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                            <Label className="text-xs font-bold text-foreground">엄격한 JSON-Schema 강제 (Validation)</Label>
                                        </div>
                                        <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                                            대본/타임코드/NLE 구조화 출력 시 Pydantic 스키마 무결성을 사전에 검증하여 파싱 오류를 원천 차단합니다.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.hermes_structured_schema_enforced}
                                        onCheckedChange={(c) => handleFieldChange('hermes_structured_schema_enforced', c)}
                                    />
                                </div>

                                {/* 5. 프롬프트 지침 보호 (2컬럼 Span) */}
                                <div className="sm:col-span-2 flex items-start justify-between p-3.5 border border-border rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors">
                                    <div className="space-y-1 pr-3">
                                        <div className="flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                                            <Label className="text-xs font-bold text-foreground">지침 보호 가드레일 (Instruction Defense)</Label>
                                        </div>
                                        <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                                            외부 웹 아티클이나 사용자 썰/유튜브 댓글 분석 시 악의적인 프롬프트 주입(Prompt Injection) 및 모델 탈옥 시도를 격리 방어합니다.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.hermes_instruction_protection_enabled}
                                        onCheckedChange={(c) => handleFieldChange('hermes_instruction_protection_enabled', c)}
                                    />
                                </div>
                            </div>

                            {/* 네트워크 & 스토리지 코어 설정 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Network className="w-3.5 h-3.5 text-primary" /> HAR 역공학 통신 모드
                                    </Label>
                                    <Select
                                        value={formData.hermes_har_api_mode}
                                        onValueChange={(v) => handleFieldChange('hermes_har_api_mode', v)}
                                    >
                                        <SelectTrigger className="h-10 bg-card border-border rounded-xl text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="auto">auto (지능형 하이브리드 자동 감지)</SelectItem>
                                            <SelectItem value="native_first">native_first (네이티브 세션 직접 호출 우선)</SelectItem>
                                            <SelectItem value="browser_fallback">browser_fallback (스텔스 브라우저 보조 모드)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground">
                                        외부 네트워크 API 통신 시 네이티브 역공학과 브라우저 세션의 우선순위를 결정합니다.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <Database className="w-3.5 h-3.5 text-indigo-400" /> SQLite FTS5 WAL 커넥션 풀
                                        </Label>
                                        <span className="text-xs font-mono font-bold text-indigo-400">{formData.hermes_fts_wal_pool_size || 5} Connections</span>
                                    </div>
                                    <Slider
                                        value={[formData.hermes_fts_wal_pool_size || 5]}
                                        min={2}
                                        max={20}
                                        step={1}
                                        onValueChange={(val) => handleFieldChange('hermes_fts_wal_pool_size', val[0])}
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        FTS5 읽기 전용 연결 풀을 확보하여 멀티프로세스 동시 질의 시 데이터베이스 락 충돌률을 0%로 유지합니다.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>



                    <Alert className="bg-amber-500/10 border-amber-500/20 text-foreground">
                        <History className="h-4 w-4 text-amber-500" />
                        <CardTitle className="text-xs font-bold text-foreground">Learning Cycle Insight</CardTitle>
                        <AlertDescription className="text-[10px] text-muted-foreground leading-relaxed">
                            현재 시스템은 총 {loopieStatus?.wisdom_depth || formData.hermes_wisdom_depth}개의 의미론적 맥락을 유지하고 있습니다. '이미지 생성 오류' 영역에서 최근 72시간 내 가장 활발한 자가 교정이 일어났습니다.
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        </div>
    );
};
export default LoopieTab;
