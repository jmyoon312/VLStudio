import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { 
    Key, Film, Tv, Bot, Mic2, Send, Globe, ExternalLink, CheckCircle2, 
    AlertTriangle, Loader2, RefreshCw, Trash2, HelpCircle, ChevronDown, 
    ChevronUp, Sparkles, Shield, Play, MonitorPlay, Check, Info, Lock, BookOpen,
    Save
} from 'lucide-react';
import { toast } from 'sonner';

interface ApiIntegrationsTabProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    onSave?: () => void;
    isSaving?: boolean;
}

// Helper component for multi-key lists with test capability
const MultiKeyInput = ({
    label,
    keys,
    onChange,
    placeholder = "sk-...",
    onTestKey,
    testingKey,
    provider
}: {
    label?: string;
    keys: string[];
    onChange: (keys: string[]) => void;
    placeholder?: string;
    onTestKey?: (key: string, provider: string) => void;
    testingKey?: string | null;
    provider?: string;
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
            <div className="border border-border rounded-xl p-2.5 bg-muted/30 space-y-2 max-h-[150px] overflow-y-auto">
                {keys.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">등록된 키가 없습니다.</p>
                )}
                {keys.map((k, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <Input 
                            value={k} 
                            readOnly 
                            className="h-8 text-xs bg-card text-foreground font-mono border-border rounded-lg" 
                            type="password" 
                        />
                        {onTestKey && provider && (
                            <Button 
                                type="button"
                                variant="outline" 
                                size="sm" 
                                onClick={() => onTestKey(k, provider)}
                                disabled={Boolean(testingKey && testingKey === k)}
                                className="h-8 text-[11px] px-2 font-medium shrink-0 border-border text-foreground hover:bg-muted"
                            >
                                {testingKey && testingKey === k ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '검증'}
                            </Button>
                        )}
                        <Button 
                            type="button"
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onChange(keys.filter((_, idx) => idx !== i))} 
                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 shrink-0 p-0"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <Input
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    placeholder={placeholder}
                    className="h-9 text-xs sm:text-sm bg-card border-border rounded-lg text-foreground"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKey())}
                />
                <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm" 
                    onClick={addKey} 
                    className="shrink-0 h-9 font-bold px-3.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg"
                >
                    추가
                </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">여러 키를 등록하면 자동으로 순환(Round-Robin) 분산 호출됩니다.</p>
        </div>
    );
};

// Guide Modal Button Component (팝업 모달 다이얼로그 형태로 가이드 제공)
export const ApiGuideModalButton = ({
    title,
    provider,
    portalUrl,
    quotaInfo,
    steps,
    tip,
    variant = "header_button"
}: {
    title: string;
    provider: string;
    portalUrl: string;
    quotaInfo: string;
    steps: string[];
    tip?: string;
    variant?: "header_button" | "full_button";
}) => {
    const [open, setOpen] = useState(false);

    const openPortal = (e: React.MouseEvent) => {
        e.stopPropagation();
        if ((window as any).electronAPI?.openExternal) {
            (window as any).electronAPI.openExternal(portalUrl);
        } else {
            window.open(portalUrl, '_blank');
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {variant === "header_button" ? (
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/10 rounded-lg px-2.5 shrink-0"
                    >
                        <BookOpen className="w-3.5 h-3.5 text-primary" />
                        <span>발급 가이드</span>
                    </Button>
                ) : (
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="w-full h-8 text-xs font-bold gap-2 text-primary hover:bg-primary/10 rounded-xl justify-between px-3 border-primary/20 bg-primary/5"
                    >
                        <div className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>{title} 발급 가이드 확인하기</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                            {quotaInfo}
                        </Badge>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md sm:max-w-lg p-5 rounded-2xl bg-card border-border shadow-xl">
                <DialogHeader className="space-y-1.5 pb-2 border-b border-border">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">{title} 발급 가이드</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">공식 개발자 포털에서 키를 발급받는 단계별 안내입니다.</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                    {/* 무료 혜택 & 쿼터 안내 */}
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                        <span className="font-semibold text-primary">무료 제공 혜택 & 쿼터:</span>
                        <Badge className="bg-primary/20 text-primary font-mono border-0 text-[11px]">{quotaInfo}</Badge>
                    </div>

                    {/* 단계별 절차 */}
                    <div className="space-y-2">
                        <span className="font-bold text-foreground text-xs block">발급 절차 (3단계)</span>
                        <div className="space-y-2">
                            {steps.map((step, idx) => (
                                <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border">
                                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                                        {idx + 1}
                                    </span>
                                    <span className="text-foreground leading-relaxed flex-1">{step}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 실전 팁 */}
                    {tip && (
                        <div className="p-3 rounded-xl bg-muted/30 border border-border text-[11px] text-muted-foreground flex items-start gap-2">
                            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span className="leading-relaxed text-foreground/90">{tip}</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
                    <Button 
                        type="button" 
                        variant="default" 
                        onClick={openPortal} 
                        className="flex-1 font-bold text-xs gap-1.5 h-9 rounded-xl"
                    >
                        <span>공식 발급 포털 바로가기</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setOpen(false)} 
                        className="h-9 text-xs rounded-xl font-medium border-border"
                    >
                        닫기
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// Guide Card with Accordion & Button Combo
const ApiGuideAccordion = ({
    title,
    provider,
    portalUrl,
    quotaInfo,
    steps,
    tip
}: {
    title: string;
    provider: string;
    portalUrl: string;
    quotaInfo: string;
    steps: string[];
    tip?: string;
}) => {
    return (
        <ApiGuideModalButton
            title={title}
            provider={provider}
            portalUrl={portalUrl}
            quotaInfo={quotaInfo}
            steps={steps}
            tip={tip}
            variant="full_button"
        />
    );
};

export function ApiIntegrationsTab({ formData, setFormData, onSave, isSaving }: ApiIntegrationsTabProps) {
    const queryClient = useQueryClient();
    const [testingKey, setTestingKey] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<{ [key: string]: { success: boolean; detail: string } }>({});
    const [activeSection, setActiveSection] = useState<'sourcing' | 'ott' | 'ai' | 'tts' | 'telegram' | 'web'>('sourcing');

    // 1. OTT Status Query
    const { data: ottData, refetch: refetchOtt, isLoading: isOttLoading } = useQuery({
        queryKey: ['ott_session_status'],
        queryFn: async () => {
            // First try electron API if available
            if ((window as any).electronAPI?.getOttStatus) {
                const res = await (window as any).electronAPI.getOttStatus();
                if (res && res.platforms) {
                    return res.platforms;
                }
            }
            // Fallback to backend API
            const res = await api.get('/settings/ott/status');
            return res.data?.platforms || {};
        },
        refetchInterval: 15000
    });

    // 2. Test API Key Mutation
    const testKeyMutation = useMutation({
        mutationFn: async ({ provider, apiKey, extraParams }: { provider: string; apiKey: string; extraParams?: any }) => {
            const res = await api.post('/settings/test-key', {
                provider,
                api_key: apiKey,
                extra_params: extraParams
            });
            return res.data;
        },
        onSuccess: (data, variables) => {
            const cacheKey = `${variables.provider}_${variables.apiKey}`;
            setTestResults(prev => ({
                ...prev,
                [cacheKey]: { success: data.success, detail: data.detail }
            }));
            if (data.success) {
                toast.success(`[${variables.provider.toUpperCase()}] 연결 검증 성공`, {
                    description: data.detail
                });
            } else {
                toast.error(`[${variables.provider.toUpperCase()}] 연결 실패`, {
                    description: data.detail
                });
            }
        },
        onError: (err: any) => {
            toast.error("연결 테스트 중 오류 발생", { description: err.message });
        },
        onSettled: () => {
            setTestingKey(null);
        }
    });

    const handleTestKey = (apiKey: string, provider: string, extraParams?: any) => {
        if (!apiKey || !apiKey.trim()) {
            toast.warning("API 키를 먼저 입력해주세요.");
            return;
        }
        setTestingKey(apiKey);
        testKeyMutation.mutate({ provider, apiKey: apiKey.trim(), extraParams });
    };

    // 3. OTT Login Window Open
    const [openingOtt, setOpeningOtt] = useState<string | null>(null);

    const handleOpenOttLogin = async (platformId: string) => {
        setOpeningOtt(platformId);
        try {
            if ((window as any).electronAPI?.openOttLogin) {
                toast.info(`브라우저 창이 열립니다. 로그인 후 창을 닫으면 쿠키가 자동 저장됩니다.`);
                const res = await (window as any).electronAPI.openOttLogin({ platform: platformId });
                if (res && res.success) {
                    toast.success(res.message || "세션 쿠키가 성공적으로 동기화되었습니다.");
                    // Also sync to backend
                    try {
                        const statusRes = await (window as any).electronAPI.getOttStatus();
                        const pData = statusRes?.platforms?.[platformId];
                        if (pData?.cookieFile) {
                            await api.get('/settings/ott/status');
                        }
                    } catch {}
                    refetchOtt();
                } else {
                    toast.warning(res?.message || "로그인이 완료되지 않았거나 쿠키를 가져오지 못했습니다.");
                    refetchOtt();
                }
            } else {
                // Browser mode fallback
                const targetUrl = ottData?.[platformId]?.login_url || `https://${platformId}.com`;
                window.open(targetUrl, '_blank');
                toast.info("데스크톱 Electron 앱에서 실행 시 세션 쿠키가 자동 추출·암호화 저장됩니다.");
            }
        } catch (e: any) {
            toast.error("OTT 브라우저 실행 실패", { description: e.message });
        } finally {
            setOpeningOtt(null);
        }
    };

    // 4. OTT Clear Session
    const handleClearOtt = async (platformId: string) => {
        try {
            if ((window as any).electronAPI?.clearOttSession) {
                await (window as any).electronAPI.clearOttSession({ platform: platformId });
            }
            await api.delete(`/settings/ott/${platformId}`);
            toast.success("세션 및 쿠키가 삭제되었습니다.");
            refetchOtt();
        } catch (e: any) {
            toast.error("세션 삭제 실패", { description: e.message });
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Navigation & Description Header */}
            <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card/60 shadow-xs backdrop-blur-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Key className="w-5 h-5 text-primary" />
                            <h2 className="text-base sm:text-lg font-bold text-foreground">외부 API 및 OTT 세션 통합 센터</h2>
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">SSOT 표준</Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            영화·드라마 큐레이션, 실시간 트렌드 레이더, 직접 AI 모델, OTT 로그인 쿠키, 텔레그램 볼트까지 모든 외부 연동 자격 증명을 일괄 등록하고 실시간으로 상태를 점검합니다.
                        </p>
                    </div>

                    {/* Top Right Save Button */}
                    {onSave && (
                        <Button
                            type="button"
                            onClick={onSave}
                            disabled={isSaving}
                            className="h-10 px-6 text-xs sm:text-sm font-bold gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shrink-0 cursor-pointer transition-all hover:scale-102 active:scale-98"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>설정 저장</span>
                        </Button>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                    {/* Quick Category Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Button 
                            type="button"
                            size="sm" 
                            variant={activeSection === 'sourcing' ? 'default' : 'outline'}
                            onClick={() => setActiveSection('sourcing')}
                            className="h-8 text-xs font-bold gap-1 rounded-xl"
                        >
                            <Film className="w-3.5 h-3.5" />
                            <span>소싱 API</span>
                        </Button>
                        <Button 
                            type="button"
                            size="sm" 
                            variant={activeSection === 'ott' ? 'default' : 'outline'}
                            onClick={() => setActiveSection('ott')}
                            className="h-8 text-xs font-bold gap-1 rounded-xl"
                        >
                            <Tv className="w-3.5 h-3.5" />
                            <span>OTT 쿠키</span>
                        </Button>
                        <Button 
                            type="button"
                            size="sm" 
                            variant={activeSection === 'ai' ? 'default' : 'outline'}
                            onClick={() => setActiveSection('ai')}
                            className="h-8 text-xs font-bold gap-1 rounded-xl"
                        >
                            <Bot className="w-3.5 h-3.5" />
                            <span>AI 모델</span>
                        </Button>
                        <Button 
                            type="button"
                            size="sm" 
                            variant={activeSection === 'tts' ? 'default' : 'outline'}
                            onClick={() => setActiveSection('tts')}
                            className="h-8 text-xs font-bold gap-1 rounded-xl"
                        >
                            <Mic2 className="w-3.5 h-3.5" />
                            <span>보이스/TTS</span>
                        </Button>
                        <Button 
                            type="button"
                            size="sm" 
                            variant={activeSection === 'telegram' ? 'default' : 'outline'}
                            onClick={() => setActiveSection('telegram')}
                            className="h-8 text-xs font-bold gap-1 rounded-xl"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>텔레그램 볼트</span>
                        </Button>
                        <Button 
                            type="button"
                            size="sm" 
                            variant={activeSection === 'web' ? 'default' : 'outline'}
                            onClick={() => setActiveSection('web')}
                            className="h-8 text-xs font-bold gap-1 rounded-xl"
                        >
                            <Globe className="w-3.5 h-3.5" />
                            <span>웹 & 스톡</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 🎬 1. 영화·드라마 & 소싱 API (TMDB, KOBIS, YouTube) */}
            {/* ========================================================================= */}
            {(activeSection === 'sourcing' || activeSection === 'all' as any) && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Film className="w-4 h-4 text-rose-500" />
                            <h3 className="text-sm font-bold text-foreground">영화·드라마 큐레이션 & 소싱 API</h3>
                        </div>
                        <span className="text-xs text-muted-foreground">소싱 센터의 명작 발굴소 및 트렌드 레이더에 직결</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* TMDB API Card */}
                        <Card className="border-border bg-card shadow-xs rounded-2xl flex flex-col justify-between">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold text-xs">
                                            TMDB
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-foreground">TMDB (The Movie Database)</CardTitle>
                                            <CardDescription className="text-xs text-muted-foreground">명작 줄거리, 감정/명대사 메타데이터, 포스터, 평점</CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] text-sky-600 dark:text-sky-400 border-sky-500/30 hidden sm:inline-flex">무료 무제한</Badge>
                                        <ApiGuideModalButton
                                            title="TMDB API 키"
                                            provider="tmdb"
                                            portalUrl="https://www.themoviedb.org/signup"
                                            quotaInfo="완전 무료 (초당 40회 호출 가능)"
                                            steps={[
                                                "themoviedb.org 회원가입 후 이메일 인증을 완료합니다.",
                                                "우측 상단 프로필 클릭 → [설정(Settings)] → 좌측 [API] 메뉴 선택.",
                                                "[API 키 요청] 클릭 → 'Developer(개발자)' 선택 후 이용 목적에 'ViraLoop Studio 영상 리서치' 입력 후 승인 시 즉시 발급됩니다."
                                            ]}
                                            tip="발급된 [API Key (v3 auth)] 32자리 문자열을 복사하여 위 입력창에 넣으시면 됩니다."
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pb-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground">TMDB API Key (v3 auth)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="password"
                                            value={formData.tmdb_api_key || ''}
                                            onChange={e => setFormData({ ...formData, tmdb_api_key: e.target.value })}
                                            placeholder="예: 3a2b1c4d5e..."
                                            className="h-9 text-xs sm:text-sm bg-card border-border font-mono text-foreground"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTestKey(formData.tmdb_api_key, 'tmdb')}
                                            disabled={Boolean(testingKey && formData.tmdb_api_key && testingKey === formData.tmdb_api_key)}
                                            className="shrink-0 h-9 text-xs font-bold px-3 border-border hover:bg-muted text-foreground"
                                        >
                                            {testingKey && formData.tmdb_api_key && testingKey === formData.tmdb_api_key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '연결 검증'}
                                        </Button>
                                    </div>
                                </div>

                                <ApiGuideAccordion
                                    title="TMDB API 키"
                                    provider="tmdb"
                                    portalUrl="https://www.themoviedb.org/signup"
                                    quotaInfo="완전 무료 (초당 40회 호출 가능)"
                                    steps={[
                                        "themoviedb.org 회원가입 후 이메일 인증을 완료합니다.",
                                        "우측 상단 프로필 클릭 → [설정(Settings)] → 좌측 [API] 메뉴 선택.",
                                        "[API 키 요청] 클릭 → 'Developer(개발자)' 선택 후 이용 목적에 'ViraLoop Studio 영상 리서치' 입력 후 승인 시 즉시 발급됩니다."
                                    ]}
                                    tip="발급된 [API Key (v3 auth)] 32자리 문자열을 복사하여 위 입력창에 넣으시면 됩니다."
                                />
                            </CardContent>
                        </Card>

                        {/* KOBIS API Card */}
                        <Card className="border-border bg-card shadow-xs rounded-2xl flex flex-col justify-between">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                                            KOBIS
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-foreground">KOBIS (영화진흥위원회)</CardTitle>
                                            <CardDescription className="text-xs text-muted-foreground">한국 박스오피스 순위, 역대 관객수 흥행 순위</CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hidden sm:inline-flex">일 3,000건 무료</Badge>
                                        <ApiGuideModalButton
                                            title="KOBIS 오픈API 키"
                                            provider="kobis"
                                            portalUrl="https://www.kobis.or.kr/kobisopenapi/homepg/main/main.do"
                                            quotaInfo="일일 3,000회 무료 호출 가능"
                                            steps={[
                                                "kobis.or.kr 오픈API 포털 회원가입을 진행합니다.",
                                                "로그인 후 상단 메뉴의 [키 발급신청]을 클릭합니다.",
                                                "신청 정보를 간단히 입력(개인 개발/비상업용)하면 대기 없이 실시간으로 즉시 키가 발급됩니다."
                                            ]}
                                            tip="국내 극장가 박스오피스 실시간 1위~10위 및 천만 관객 영화 랭킹 자동 소싱에 활용됩니다."
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pb-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground">KOBIS 오픈API 키</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="password"
                                            value={formData.kobis_api_key || ''}
                                            onChange={e => setFormData({ ...formData, kobis_api_key: e.target.value })}
                                            placeholder="예: f5e4d3c2b1a0..."
                                            className="h-9 text-xs sm:text-sm bg-card border-border font-mono text-foreground"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTestKey(formData.kobis_api_key, 'kobis')}
                                            disabled={Boolean(testingKey && formData.kobis_api_key && testingKey === formData.kobis_api_key)}
                                            className="shrink-0 h-9 text-xs font-bold px-3 border-border hover:bg-muted text-foreground"
                                        >
                                            {testingKey && formData.kobis_api_key && testingKey === formData.kobis_api_key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '연결 검증'}
                                        </Button>
                                    </div>
                                </div>

                                <ApiGuideAccordion
                                    title="KOBIS 오픈API 키"
                                    provider="kobis"
                                    portalUrl="https://www.kobis.or.kr/kobisopenapi/homepg/main/main.do"
                                    quotaInfo="일일 3,000회 무료 호출 가능"
                                    steps={[
                                        "kobis.or.kr 오픈API 포털 회원가입을 진행합니다.",
                                        "로그인 후 상단 메뉴의 [키 발급신청]을 클릭합니다.",
                                        "신청 정보를 간단히 입력(개인 개발/비상업용)하면 대기 없이 실시간으로 즉시 키가 발급됩니다."
                                    ]}
                                    tip="국내 극장가 박스오피스 실시간 1위~10위 및 천만 관객 영화 랭킹 자동 소싱에 활용됩니다."
                                />
                            </CardContent>
                        </Card>

                        {/* YouTube Data API v3 Card */}
                        <Card className="border-border bg-card shadow-xs rounded-2xl flex flex-col justify-between lg:col-span-2">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-xs">
                                            YT
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-foreground">YouTube Data API v3 공식 키</CardTitle>
                                            <CardDescription className="text-xs text-muted-foreground">채널 통계, 조회수/댓글 메타데이터, 트렌드 쇼츠 공식 수집</CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] text-rose-600 dark:text-rose-400 border-rose-500/30 hidden sm:inline-flex">일 10,000 유닛 무료</Badge>
                                        <ApiGuideModalButton
                                            title="YouTube Data API v3 키"
                                            provider="youtube"
                                            portalUrl="https://console.cloud.google.com/apis/credentials"
                                            quotaInfo="일일 10,000 유닛 무료 (키 다중 등록 시 N배 확장)"
                                            steps={[
                                                "Google Cloud Console에 구글 계정으로 로그인합니다.",
                                                "새 프로젝트 생성 후 [API 및 서비스] → [라이브러리]에서 'YouTube Data API v3' 검색 후 [사용] 클릭.",
                                                "[사용자 인증 정보] → [사용자 인증 정보 만들기] → [API 키]를 클릭하여 생성된 키를 등록합니다."
                                            ]}
                                            tip="여러 개의 구글 계정으로 키를 생성해 등록하면 순환 분산되어 쿼터 제한 없이 대량 수집할 수 있습니다."
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pb-3">
                                <MultiKeyInput
                                    label="YouTube Data API v3 키 목록 (다중 순환)"
                                    keys={formData.youtube_data_api_keys || []}
                                    onChange={keys => setFormData({ ...formData, youtube_data_api_keys: keys })}
                                    placeholder="AIzaSy..."
                                    onTestKey={(k) => handleTestKey(k, 'youtube')}
                                    testingKey={testingKey}
                                    provider="youtube"
                                />

                                <ApiGuideAccordion
                                    title="YouTube Data API v3 키"
                                    provider="youtube"
                                    portalUrl="https://console.cloud.google.com/apis/credentials"
                                    quotaInfo="일일 10,000 유닛 무료 (키 다중 등록 시 N배 확장)"
                                    steps={[
                                        "Google Cloud Console에 구글 계정으로 로그인합니다.",
                                        "새 프로젝트 생성 후 [API 및 서비스] → [라이브러리]에서 'YouTube Data API v3' 검색 후 [사용] 클릭.",
                                        "[사용자 인증 정보] → [사용자 인증 정보 만들기] → [API 키]를 클릭하여 생성된 키를 등록합니다."
                                    ]}
                                    tip="여러 개의 구글 계정으로 키를 생성해 등록하면 순환 분산되어 쿼터 제한 없이 대량 수집할 수 있습니다."
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 📺 2. OTT 플랫폼 로그인 & 세션 쿠키 보관소 (6대 플랫폼) */}
            {/* ========================================================================= */}
            {(activeSection === 'ott' || activeSection === 'all' as any) && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Tv className="w-4 h-4 text-purple-500" />
                            <h3 className="text-sm font-bold text-foreground">OTT 플랫폼 로그인 & 세션 쿠키 보관소</h3>
                        </div>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => refetchOtt()} 
                            disabled={isOttLoading}
                            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isOttLoading ? 'animate-spin' : ''}`} />
                            <span>상태 새로고침</span>
                        </Button>
                    </div>

                    <Alert className="border-border bg-card/50 text-foreground">
                        <Lock className="w-4 h-4 text-primary" />
                        <AlertTitle className="text-xs font-bold">OTT 로그인 및 세션 쿠키 저장 메커니즘</AlertTitle>
                        <AlertDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
                            넷플릭스, 디즈니+, 티빙 등 OTT에서 원하는 명장면이나 대사를 소싱할 때, 브라우저에서 1회 로그인해 두시면 세션 쿠키가 격리된 프로필(<code className="text-foreground font-mono">04_Profiles/ott/</code>)에 암호화 보존됩니다. 소싱 센터에서 영화/드라마 씬 추출 및 다운로드 시 이 세션이 자동 활용됩니다.
                        </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { id: 'netflix', name: 'Netflix', color: 'text-red-500', bg: 'bg-red-500/10', desc: '넷플릭스 오리지널, 글로벌 영화/시리즈' },
                            { id: 'disney', name: 'Disney+', color: 'text-blue-500', bg: 'bg-blue-500/10', desc: '디즈니, 마블, 스타워즈, 픽사' },
                            { id: 'tving', name: 'TVING', color: 'text-rose-500', bg: 'bg-rose-500/10', desc: 'tvN, JTBC, 티빙 오리지널 예능/드라마' },
                            { id: 'wavve', name: 'Wavve', color: 'text-sky-500', bg: 'bg-sky-500/10', desc: '지상파 3사(KBS/SBS/MBC) 레전드 예능' },
                            { id: 'watcha', name: 'Watcha', color: 'text-pink-500', bg: 'bg-pink-500/10', desc: '왓챠 익스클루시브, 독립·예술 영화' },
                            { id: 'coupangplay', name: 'Coupang Play', color: 'text-cyan-500', bg: 'bg-cyan-500/10', desc: 'SNL 코리아, 오리지널 시리즈, 스포츠' },
                        ].map((plat) => {
                            const pStatus = ottData?.[plat.id];
                            const isActive = pStatus?.status === 'ACTIVE' || pStatus?.exists;

                            return (
                                <Card key={plat.id} className="border-border bg-card shadow-xs rounded-2xl flex flex-col justify-between">
                                    <CardHeader className="pb-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-xl ${plat.bg} ${plat.color} flex items-center justify-center font-black text-xs`}>
                                                    {plat.id.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <CardTitle className="text-sm font-bold text-foreground">{plat.name}</CardTitle>
                                                    <CardDescription className="text-[11px] text-muted-foreground truncate max-w-[150px]">{plat.desc}</CardDescription>
                                                </div>
                                            </div>
                                            {isActive ? (
                                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                                                    <Check className="w-3 h-3" /> 세션 활성
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                                    미로그인
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-2.5 pb-3">
                                        <div className="p-2.5 rounded-xl bg-muted/30 border border-border text-[11px] space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">저장된 쿠키:</span>
                                                <span className="font-semibold text-foreground">{pStatus?.cookieCount || 0} 개</span>
                                            </div>
                                            {pStatus?.updated_at && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">최종 갱신:</span>
                                                    <span className="font-mono text-muted-foreground">{pStatus.updated_at}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant={isActive ? "outline" : "default"}
                                                size="sm"
                                                onClick={() => handleOpenOttLogin(plat.id)}
                                                disabled={openingOtt === plat.id}
                                                className="flex-1 h-8 text-xs font-bold gap-1 rounded-xl"
                                            >
                                                {openingOtt === plat.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <MonitorPlay className="w-3.5 h-3.5" />
                                                )}
                                                <span>{isActive ? '세션 갱신' : '브라우저 로그인'}</span>
                                            </Button>

                                            {isActive && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleClearOtt(plat.id)}
                                                    className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl shrink-0"
                                                    title="로그아웃 및 쿠키 삭제"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 🤖 3. AI 대규모 언어 모델 (LLM) 직접 연결 키 (Zero OmniRoute Forcing Law) */}
            {/* ========================================================================= */}
            {(activeSection === 'ai' || activeSection === 'all' as any) && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-primary" />
                            <h3 className="text-sm font-bold text-foreground">AI 대규모 언어 모델 (LLM) 직접 연결 키</h3>
                        </div>
                        <span className="text-xs text-muted-foreground">단일 진실 공급원(SSOT)에 따른 공식 API 직결</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Google Gemini Card */}
                        <Card className="border-border bg-card shadow-xs rounded-2xl flex flex-col justify-between">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs">
                                            GEM
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-foreground">Google AI Studio (Gemini 3.8 Live)</CardTitle>
                                            <CardDescription className="text-xs text-muted-foreground">Gemini 3.8 Live 실시간 음성/화면 인식 & 2.5 Flash 멀티모달</CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] text-blue-600 dark:text-blue-400 border-blue-500/30 hidden sm:inline-flex">무료 티어 지원</Badge>
                                        <ApiGuideModalButton
                                            title="Google AI Studio (Gemini 3.8 Live) API 키"
                                            provider="gemini"
                                            portalUrl="https://aistudio.google.com/app/apikey"
                                            quotaInfo="무료 티어 분당 15회(RPM) 제공, 하루 1,500회 무료"
                                            steps={[
                                                "Google AI Studio (aistudio.google.com)에 로그인합니다.",
                                                "[Get API key] 클릭 후 [Create API key]를 누릅니다.",
                                                "발급된 키(AIzaSy...)를 복사하여 아래 목록에 등록합니다."
                                            ]}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pb-3">
                                <MultiKeyInput
                                    label="Google AI Studio / Gemini API 키 목록 (다중 순환)"
                                    keys={formData.gemini_api_keys || []}
                                    onChange={keys => setFormData({ ...formData, gemini_api_keys: keys })}
                                    placeholder="AIzaSy..."
                                    onTestKey={(k) => handleTestKey(k, 'gemini')}
                                    testingKey={testingKey}
                                    provider="gemini"
                                />
                                <ApiGuideAccordion
                                    title="Google Gemini API 키"
                                    provider="gemini"
                                    portalUrl="https://aistudio.google.com/app/apikey"
                                    quotaInfo="무료 티어 분당 15회(RPM) 제공, 유료 Pay-as-you-go"
                                    steps={[
                                        "Google AI Studio (aistudio.google.com)에 로그인합니다.",
                                        "[Get API key] 클릭 후 [Create API key]를 누릅니다.",
                                        "발급된 키를 복사하여 위 목록에 등록합니다."
                                    ]}
                                />
                            </CardContent>
                        </Card>

                        {/* OpenAI Direct Card */}
                        <Card className="border-border bg-card shadow-xs rounded-2xl flex flex-col justify-between">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                                            OAI
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-foreground">OpenAI (ChatGPT API)</CardTitle>
                                            <CardDescription className="text-xs text-muted-foreground">GPT-4o, o3-mini 공식 종량제 직결</CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hidden sm:inline-flex">공식 직결</Badge>
                                        <ApiGuideModalButton
                                            title="OpenAI API 키"
                                            provider="openai"
                                            portalUrl="https://platform.openai.com/api-keys"
                                            quotaInfo="종량제 (사전 크레딧 충전 필요)"
                                            steps={[
                                                "OpenAI Platform (platform.openai.com)에 로그인합니다.",
                                                "[API keys] 메뉴에서 [Create new secret key]를 클릭합니다.",
                                                "발급된 키(sk-...)를 즉시 복사하여 등록합니다."
                                            ]}
                                            tip="Codex CLI 웹 세션(Astra)을 쓰시는 경우 별도 API 키 없이도 자동 연동됩니다."
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pb-3">
                                <MultiKeyInput
                                    label="OpenAI API 키 목록 (다중 순환)"
                                    keys={formData.openai_api_keys || []}
                                    onChange={keys => setFormData({ ...formData, openai_api_keys: keys })}
                                    placeholder="sk-proj-..."
                                    onTestKey={(k) => handleTestKey(k, 'openai')}
                                    testingKey={testingKey}
                                    provider="openai"
                                />
                                <ApiGuideAccordion
                                    title="OpenAI API 키"
                                    provider="openai"
                                    portalUrl="https://platform.openai.com/api-keys"
                                    quotaInfo="종량제 (사전 크레딧 충전 필요)"
                                    steps={[
                                        "OpenAI Platform (platform.openai.com)에 로그인합니다.",
                                        "[API keys] 메뉴에서 [Create new secret key]를 클릭합니다.",
                                        "발급된 키(sk-...)를 즉시 복사하여 등록합니다."
                                    ]}
                                    tip="Codex CLI 웹 세션(Astra)을 쓰시는 경우 별도 API 키 없이도 자동 연동됩니다."
                                />
                            </CardContent>
                        </Card>

                        {/* Anthropic Claude Card */}
                        <Card className="border-border bg-card shadow-xs rounded-2xl flex flex-col justify-between">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs">
                                            ANT
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-foreground">Anthropic Claude API</CardTitle>
                                            <CardDescription className="text-xs text-muted-foreground">Claude 3.5 Sonnet, 3.7 Thinking 최고급 스토리텔링</CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 hidden sm:inline-flex">고급 서사</Badge>
                                        <ApiGuideModalButton
                                            title="Claude API 키"
                                            provider="claude"
                                            portalUrl="https://console.anthropic.com/settings/keys"
                                            quotaInfo="종량제 Pay-as-you-go"
                                            steps={[
                                                "Anthropic Console에 로그인합니다.",
                                                "[API Keys] 메뉴에서 [Create Key] 클릭 후 복사하여 입력합니다."
                                            ]}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pb-3">
                                <MultiKeyInput
                                    label="Claude API 키 목록"
                                    keys={formData.claude_api_keys || []}
                                    onChange={keys => setFormData({ ...formData, claude_api_keys: keys })}
                                    placeholder="sk-ant-..."
                                    onTestKey={(k) => handleTestKey(k, 'claude')}
                                    testingKey={testingKey}
                                    provider="claude"
                                />
                                <ApiGuideAccordion
                                    title="Claude API 키"
                                    provider="claude"
                                    portalUrl="https://console.anthropic.com/settings/keys"
                                    quotaInfo="종량제 Pay-as-you-go"
                                    steps={[
                                        "Anthropic Console에 로그인합니다.",
                                        "[API Keys] 메뉴에서 [Create Key] 클릭 후 복사하여 입력합니다."
                                    ]}
                                />
                            </CardContent>
                        </Card>

                        {/* xAI Grok Card */}
                        <Card className="border-border bg-card shadow-xs rounded-2xl flex flex-col justify-between">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs">
                                            XAI
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-foreground">xAI Grok API</CardTitle>
                                            <CardDescription className="text-xs text-muted-foreground">Grok 2, Grok 3 실시간 X 트렌드 및 위트 분석</CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hidden sm:inline-flex">트렌드 특화</Badge>
                                        <ApiGuideModalButton
                                            title="Grok API 키"
                                            provider="grok"
                                            portalUrl="https://console.x.ai"
                                            quotaInfo="종량제 (매월 $25 무료 크레딧 프로모션)"
                                            steps={[
                                                "console.x.ai 포털에 가입합니다.",
                                                "[API Keys]에서 [Create API Key]를 생성 후 등록합니다."
                                            ]}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pb-3">
                                <MultiKeyInput
                                    label="Grok API 키 목록"
                                    keys={formData.grok_api_keys || []}
                                    onChange={keys => setFormData({ ...formData, grok_api_keys: keys })}
                                    placeholder="xai-..."
                                    onTestKey={(k) => handleTestKey(k, 'grok')}
                                    testingKey={testingKey}
                                    provider="grok"
                                />
                                <ApiGuideAccordion
                                    title="Grok API 키"
                                    provider="grok"
                                    portalUrl="https://console.x.ai"
                                    quotaInfo="종량제 (매월 $25 무료 크레딧 프로모션)"
                                    steps={[
                                        "console.x.ai 포털에 가입합니다.",
                                        "[API Keys]에서 [Create API Key]를 생성 후 등록합니다."
                                    ]}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 🎙️ 4. AI 보이스 & 오디오 (TTS) API */}
            {/* ========================================================================= */}
            {(activeSection === 'tts' || activeSection === 'all' as any) && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Mic2 className="w-4 h-4 text-sky-400" />
                            <h3 className="text-sm font-bold text-foreground">AI 보이스 & 오디오 (TTS) API</h3>
                        </div>
                        <span className="text-xs text-muted-foreground">쇼츠 나레이션 및 더빙 엔진</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* ElevenLabs Card */}
                        <Card className="border-border bg-card shadow-xs rounded-2xl flex flex-col justify-between">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold text-xs">
                                            11L
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-foreground">ElevenLabs</CardTitle>
                                            <CardDescription className="text-xs text-muted-foreground">보이스 클로닝, 감정 풍부한 프리미엄 TTS</CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] text-sky-600 dark:text-sky-400 border-sky-500/30 hidden sm:inline-flex">월 10,000자 무료</Badge>
                                        <ApiGuideModalButton
                                            title="ElevenLabs API 키"
                                            provider="elevenlabs"
                                            portalUrl="https://elevenlabs.io"
                                            quotaInfo="무료 플랜 매월 10,000자 제공"
                                            steps={[
                                                "elevenlabs.io 회원가입 후 로그인합니다.",
                                                "우측 상단 프로필 아이콘 클릭 → [Profile + API key] 메뉴 선택.",
                                                "API Key 복사 후 등록합니다."
                                            ]}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pb-3">
                                <MultiKeyInput
                                    label="ElevenLabs API 키 목록 (다중 순환)"
                                    keys={formData.elevenlabs_api_keys || []}
                                    onChange={keys => setFormData({ ...formData, elevenlabs_api_keys: keys })}
                                    placeholder="xi-..."
                                    onTestKey={(k) => handleTestKey(k, 'elevenlabs')}
                                    testingKey={testingKey}
                                    provider="elevenlabs"
                                />
                                <ApiGuideAccordion
                                    title="ElevenLabs API 키"
                                    provider="elevenlabs"
                                    portalUrl="https://elevenlabs.io"
                                    quotaInfo="무료 플랜 매월 10,000자 제공"
                                    steps={[
                                        "elevenlabs.io 회원가입 후 로그인합니다.",
                                        "우측 상단 프로필 아이콘 클릭 → [Profile + API key] 메뉴 선택.",
                                        "API Key 복사 후 등록합니다."
                                    ]}
                                />
                            </CardContent>
                        </Card>

                        {/* Typecast Card */}
                        <Card className="border-border bg-card shadow-xs rounded-2xl flex flex-col justify-between">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-xs">
                                            TC
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-foreground">Typecast (타입캐스트)</CardTitle>
                                            <CardDescription className="text-xs text-muted-foreground">한국어 최고 인기 성우진, 애니/썰형 최적화</CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] text-purple-600 dark:text-purple-400 border-purple-500/30 hidden sm:inline-flex">한국어 1위</Badge>
                                        <ApiGuideModalButton
                                            title="Typecast 개발자 API 키"
                                            provider="typecast"
                                            portalUrl="https://typecast.ai"
                                            quotaInfo="타입캐스트 개발자 플랜 구독"
                                            steps={[
                                                "typecast.ai 개발자 센터에 로그인합니다.",
                                                "[API 발급] 메뉴에서 발급받은 시크릿 키를 등록합니다."
                                            ]}
                                            tip="로컬 슈퍼토닉(Supertonic) 엔진을 활성화하면 비용 0원으로 무제한 로컬 음성을 생성할 수 있습니다."
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pb-3">
                                <MultiKeyInput
                                    label="Typecast API 키 목록"
                                    keys={formData.typecast_api_keys || []}
                                    onChange={keys => setFormData({ ...formData, typecast_api_keys: keys })}
                                    placeholder="tc-..."
                                />
                                <ApiGuideAccordion
                                    title="Typecast 개발자 API 키"
                                    provider="typecast"
                                    portalUrl="https://typecast.ai"
                                    quotaInfo="타입캐스트 개발자 플랜 구독"
                                    steps={[
                                        "typecast.ai 개발자 센터에 로그인합니다.",
                                        "[API 발급] 메뉴에서 발급받은 시크릿 키를 등록합니다."
                                    ]}
                                    tip="로컬 슈퍼토닉(Supertonic) 엔진을 활성화하면 비용 0원으로 무제한 로컬 음성을 생성할 수 있습니다."
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 📱 5. 텔레그램 볼트 (무제한 영상 보관 전용 채널) */}
            {/* ========================================================================= */}
            {(activeSection === 'telegram' || activeSection === 'all' as any) && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Send className="w-4 h-4 text-sky-400" />
                            <h3 className="text-sm font-bold text-foreground">텔레그램 무제한 영상 볼트 (저장소 전용 채널)</h3>
                        </div>
                        <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs">무제한 무료 저장 (파일당 최대 2GB)</Badge>
                    </div>

                    <Card className="border-border bg-card shadow-xs rounded-2xl">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-sm font-bold text-foreground">영상 볼트 전용 채널 연동</CardTitle>
                                        <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-500 border-sky-500/30 font-bold">
                                            1:1 개인 비서와 분리 보관
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-xs text-muted-foreground mt-1">
                                        제작된 숏폼 및 원본 영상을 텔레그램 비공개 채널에 무제한 무료(파일당 2GB)로 보관합니다. [엔진 & 시스템] 탭의 루피 1:1 스마트폰 개인 비서 대화방과 분리되어 개인 대화방이 대용량 영상 파일로 어지럽혀지지 않습니다.
                                    </CardDescription>
                                </div>
                                <ApiGuideModalButton
                                    title="영상 볼트 전용 채널 개설"
                                    provider="telegram_vault"
                                    portalUrl="https://t.me/BotFather"
                                    quotaInfo="100% 무료 무제한 (파일당 2GB)"
                                    steps={[
                                        "텔레그램 앱에서 좌측 상단 메뉴 또는 연필 아이콘을 눌러 [새 채널(New Channel)]을 생성합니다 (공개 여부는 '비공개 채널' 권장).",
                                        "방금 만든 채널의 설정 → [관리자(Administrators)] → [관리자 추가(Add Admin)]로 이동하여 내 봇(@BotFather에서 만든 봇)을 검색해 관리자로 추가합니다 (메시지 전송 권한 필수).",
                                        "채널에 테스트 메시지를 1개 작성한 뒤, 텔레그램 검색창에서 '@username_to_id_bot' 또는 '@JsonDumpBot'에 해당 메시지를 전달(Forward)하여 채널 ID를 확인합니다. (웹 텔레그램 주소창 끝 숫자에 -100을 붙여도 됩니다).",
                                        "확인된 채널 ID(예: -1002345678901)를 아래 [영상 보관용 전용 채널 ID] 칸에 입력하고 연결 테스트 버튼을 누릅니다."
                                    ]}
                                    tip="전용 봇 토큰을 비워두시면 [엔진 & 시스템] 탭의 루피 관제탑 봇 토큰을 자동으로 공유하여 간편하게 연결됩니다."
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold text-foreground">볼트 전용 봇 토큰 (선택 사항)</Label>
                                        <span className="text-[10px] text-muted-foreground">미입력 시 루피 봇 자동 공유</span>
                                    </div>
                                    <Input
                                        type="password"
                                        value={formData.telegram_vault_bot_token || ''}
                                        onChange={e => setFormData({ ...formData, telegram_vault_bot_token: e.target.value })}
                                        placeholder={formData.telegram_bot_token ? "루피 관제탑 봇 토큰 자동 공유 중 (선택 시 별도 입력)" : "예: 7123456789:AAFn..."}
                                        className="h-9 text-xs sm:text-sm bg-card border-border font-mono text-foreground"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        {formData.telegram_bot_token 
                                            ? "✓ [엔진 & 시스템] 탭에 등록된 루피 봇 토큰을 자동으로 재사용합니다." 
                                            : "비워두시면 [엔진 & 시스템] 탭의 루피 봇 토큰을 함께 공유합니다."}
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold text-foreground">영상 보관용 전용 채널 ID (필수)</Label>
                                        <span className="text-[10px] text-sky-500 font-bold">-100으로 시작하는 채널 ID</span>
                                    </div>
                                    <Input
                                        type="text"
                                        value={formData.telegram_vault_chat_id || ''}
                                        onChange={e => setFormData({ ...formData, telegram_vault_chat_id: e.target.value })}
                                        placeholder="예: -1001234567890 (비공개 채널 ID)"
                                        className="h-9 text-xs sm:text-sm bg-card border-border font-mono text-foreground"
                                    />
                                    <p className="text-[10px] text-muted-foreground">영상이 안전하게 보관될 텔레그램 비공개 채널의 고유 ID</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const tokenToTest = (formData.telegram_vault_bot_token && formData.telegram_vault_bot_token.trim()) || (formData.telegram_bot_token && formData.telegram_bot_token.trim());
                                        if (!tokenToTest) {
                                            toast.warning("봇 토큰을 입력하거나 [엔진 & 시스템] 탭에서 루피 봇 토큰을 먼저 등록해주세요.");
                                            return;
                                        }
                                        if (!formData.telegram_vault_chat_id || !formData.telegram_vault_chat_id.trim()) {
                                            toast.warning("영상 볼트 채널 ID(예: -100...)를 입력해주세요.");
                                            return;
                                        }
                                        handleTestKey(tokenToTest, 'telegram_vault', { chat_id: formData.telegram_vault_chat_id.trim() });
                                    }}
                                    disabled={Boolean(testingKey && (formData.telegram_vault_bot_token || formData.telegram_bot_token) && testingKey === ((formData.telegram_vault_bot_token || formData.telegram_bot_token)))}
                                    className="h-9 text-xs font-bold gap-1.5 border-border hover:bg-muted text-foreground"
                                >
                                    {testingKey && (formData.telegram_vault_bot_token || formData.telegram_bot_token) && testingKey === ((formData.telegram_vault_bot_token || formData.telegram_bot_token)) ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Send className="w-3.5 h-3.5 text-sky-400" />
                                    )}
                                    <span>볼트 채널 연결 테스트 및 환영 메시지 발송</span>
                                </Button>
                            </div>

                            <ApiGuideAccordion
                                title="영상 볼트 전용 채널 개설"
                                provider="telegram_vault"
                                portalUrl="https://t.me/BotFather"
                                quotaInfo="100% 무료 무제한 (파일당 최대 2GB 무제한 업로드)"
                                steps={[
                                    "텔레그램 앱에서 좌측 상단 메뉴 또는 연필 아이콘을 눌러 [새 채널(New Channel)]을 생성합니다 (공개 여부는 '비공개 채널' 권장).",
                                    "방금 만든 채널의 설정 → [관리자(Administrators)] → [관리자 추가(Add Admin)]로 이동하여 내 봇(@BotFather에서 만든 봇)을 검색해 관리자로 추가합니다 (메시지 전송 권한 필수).",
                                    "채널에 테스트 메시지를 1개 작성한 뒤, 텔레그램 검색창에서 '@username_to_id_bot' 또는 '@JsonDumpBot'에 해당 메시지를 전달(Forward)하여 채널 ID를 확인합니다. (웹 텔레그램 주소창 끝 숫자에 -100을 붙여도 됩니다).",
                                    "확인된 채널 ID(예: -1002345678901)를 [영상 보관용 전용 채널 ID] 칸에 입력하고 연결 테스트 버튼을 누르면 채널로 즉시 테스트 메시지가 도착합니다."
                                ]}
                                tip="1:1 개인 비서 봇과 영상 보관 채널이 완전히 분리되어, 대표님의 개인 대화방이 수 기가바이트의 영상 파일로 도배되지 않고 쾌적하게 유지됩니다!"
                            />
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 🌐 6. 웹 검색 & 미디어 스톡 API */}
            {/* ========================================================================= */}
            {(activeSection === 'web' || activeSection === 'all' as any) && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-teal-400" />
                            <h3 className="text-sm font-bold text-foreground">실시간 웹 검색 & 무료 스톡 미디어 API</h3>
                        </div>
                        <span className="text-xs text-muted-foreground">이슈/뉴스 실시간 팩트체크 및 무제한 B-Roll 영상 수집</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Tavily */}
                        <Card className="border-border bg-card shadow-xs rounded-2xl flex flex-col justify-between">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-sm font-bold text-foreground">Tavily AI Search</CardTitle>
                                        <CardDescription className="text-xs text-muted-foreground">AI 에이전트 특화 정밀 웹 서치</CardDescription>
                                    </div>
                                    <ApiGuideModalButton
                                        title="Tavily API 키"
                                        provider="tavily"
                                        portalUrl="https://tavily.com"
                                        quotaInfo="매월 1,000건 무료"
                                        steps={["tavily.com 회원가입 후 대시보드에서 키 생성 후 등록."]}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pb-3">
                                <MultiKeyInput
                                    label="Tavily API 키 목록"
                                    keys={formData.tavily_api_keys || []}
                                    onChange={keys => setFormData({ ...formData, tavily_api_keys: keys })}
                                    placeholder="tvly-..."
                                    onTestKey={(k) => handleTestKey(k, 'tavily')}
                                    testingKey={testingKey}
                                    provider="tavily"
                                />
                                <ApiGuideAccordion
                                    title="Tavily API 키"
                                    provider="tavily"
                                    portalUrl="https://tavily.com"
                                    quotaInfo="매월 1,000건 무료"
                                    steps={["tavily.com 회원가입 후 대시보드에서 키 생성 후 등록."]}
                                />
                            </CardContent>
                        </Card>

                        {/* Pexels */}
                        <Card className="border-border bg-card shadow-xs rounded-2xl flex flex-col justify-between">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-sm font-bold text-foreground">Pexels Free Video</CardTitle>
                                        <CardDescription className="text-xs text-muted-foreground">상업용 무료 4K 스톡 비디오</CardDescription>
                                    </div>
                                    <ApiGuideModalButton
                                        title="Pexels API 키"
                                        provider="pexels"
                                        portalUrl="https://www.pexels.com/api/"
                                        quotaInfo="시간당 200건 무료 (상업용 가능)"
                                        steps={["pexels.com/api 접속 후 무료 키 신청."]}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pb-3">
                                <MultiKeyInput
                                    label="Pexels API 키 목록"
                                    keys={formData.pexels_api_keys || []}
                                    onChange={keys => setFormData({ ...formData, pexels_api_keys: keys })}
                                    placeholder="563492..."
                                />
                                <ApiGuideAccordion
                                    title="Pexels API 키"
                                    provider="pexels"
                                    portalUrl="https://www.pexels.com/api/"
                                    quotaInfo="시간당 200건 무료 (상업용 가능)"
                                    steps={["pexels.com/api 접속 후 무료 키 신청."]}
                                />
                            </CardContent>
                        </Card>

                        {/* Pixabay */}
                        <Card className="border-border bg-card shadow-xs rounded-2xl flex flex-col justify-between">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-sm font-bold text-foreground">Pixabay Free Media</CardTitle>
                                        <CardDescription className="text-xs text-muted-foreground">무료 음향 효과, 비디오, 일러스트</CardDescription>
                                    </div>
                                    <ApiGuideModalButton
                                        title="Pixabay API 키"
                                        provider="pixabay"
                                        portalUrl="https://pixabay.com/api/docs/"
                                        quotaInfo="분당 100건 무료"
                                        steps={["pixabay.com/api/docs 접속 후 회원가입 후 키 확인."]}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pb-3">
                                <MultiKeyInput
                                    label="Pixabay API 키 목록"
                                    keys={formData.pixabay_api_keys || []}
                                    onChange={keys => setFormData({ ...formData, pixabay_api_keys: keys })}
                                    placeholder="4321..."
                                />
                                <ApiGuideAccordion
                                    title="Pixabay API 키"
                                    provider="pixabay"
                                    portalUrl="https://pixabay.com/api/docs/"
                                    quotaInfo="분당 100건 무료"
                                    steps={["pixabay.com/api/docs 접속 후 회원가입 후 키 확인."]}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Bottom Global Save Banner */}
            {onSave && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/80 shadow-md mt-6">
                    <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Save className="w-4 h-4 text-primary" />
                            <span>외부 API & OTT 연동 설정 저장</span>
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            TMDB, KOBIS, AI 모델, 텔레그램, OTT 세션 등 모든 외부 연동 자격 증명을 viral_loop.db에 영구 저장합니다.
                        </p>
                    </div>
                    <Button
                        type="button"
                        onClick={onSave}
                        disabled={isSaving}
                        className="h-11 px-8 text-xs sm:text-sm font-bold gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer transition-all hover:scale-102 active:scale-98 shrink-0"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>설정 저장</span>
                    </Button>
                </div>
            )}
        </div>
    );
}
