import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
    Cpu, RefreshCcw, ExternalLink, Download, 
    CheckCircle2, XCircle, Loader2, Zap,
    Sparkles, ShieldCheck, Check, RotateCw
} from 'lucide-react';
import { api } from '@/lib/api';

interface DshStatus {
    status: string;
    running: boolean;
    url: string;
    token: string;
    port: number;
    version: string;
}

export const DeepSeekHarnessControlCard: React.FC = () => {
    const [status, setStatus] = useState<DshStatus>({
        status: 'checking',
        running: false,
        url: 'http://127.0.0.1:3080',
        token: '',
        port: 3080,
        version: '0.1.5-rc.2'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isRestarting, setIsRestarting] = useState(false);

    const fetchStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/system/dsh/status');
            if (res.data) {
                setStatus(res.data);
            }
        } catch (err: any) {
            console.warn('[DSH] Status check error:', err.message);
            setStatus(prev => ({ ...prev, running: false, status: 'offline' }));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 8000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const handleOpenDsh = () => {
        const targetUrl = status.url || ('http://127.0.0.1:3080/?token=' + status.token);
        window.open(targetUrl, '_blank');
    };

    const handleUpdate = async () => {
        setIsUpdating(true);
        toast.loading('DeepSeek Harness 최신 버전 점검 및 자동 업데이트 진행 중...', { id: 'dsh-update' });
        try {
            const res = await api.post('/system/dsh/update');
            toast.dismiss('dsh-update');
            if (res.data?.success) {
                toast.success('DeepSeek Harness 최신 버전 업데이트 완료!', {
                    description: res.data.message
                });
                await fetchStatus();
            } else {
                toast.error('업데이트 실패: ' + (res.data?.message || '알 수 없는 오류'));
            }
        } catch (err: any) {
            toast.dismiss('dsh-update');
            toast.error('업데이트 실행 오류: ' + err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRestart = async () => {
        setIsRestarting(true);
        toast.loading('DeepSeek Harness 데몬 재기동 중...', { id: 'dsh-restart' });
        try {
            const res = await api.post('/system/dsh/restart');
            toast.dismiss('dsh-restart');
            if (res.data?.success) {
                toast.success('DeepSeek Harness 데몬이 재시작되었습니다.');
                setTimeout(fetchStatus, 2500);
            } else {
                toast.error('재시작 실패: ' + (res.data?.message || '알 수 없음'));
            }
        } catch (err: any) {
            toast.dismiss('dsh-restart');
            toast.error('재기동 요청 중 오류: ' + err.message);
        } finally {
            setIsRestarting(false);
        }
    };

    return (
        <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden mb-6">
            <CardHeader className="bg-muted/30 border-b border-border py-3.5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                        <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-bold text-foreground">
                                DeepSeek Harness 무인 제어 허브 (Web & Agent)
                            </CardTitle>
                            {status.running ? (
                                <Badge variant="default" className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold gap-1 px-2 py-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    정상 가동 중 (포트 {status.port})
                                </Badge>
                            ) : (
                                <Badge variant="destructive" className="bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[10px] font-bold gap-1 px-2 py-0.5">
                                    <XCircle className="w-3 h-3" />
                                    엔진 정지됨
                                </Badge>
                            )}
                        </div>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5">
                            엔진 버전: <span className="font-mono font-bold text-foreground">v{status.version}</span> · 30일 무인 인증 토큰 가동 · viraloop1 모델 프록시 직결
                        </CardDescription>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 border-border rounded-xl text-xs hover:bg-muted font-medium"
                        onClick={fetchStatus}
                        disabled={isLoading}
                    >
                        <RefreshCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        새로고침
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 border-border rounded-xl text-xs hover:bg-muted font-medium"
                        onClick={handleRestart}
                        disabled={isRestarting}
                    >
                        {isRestarting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <RotateCw className="w-3.5 h-3.5" />
                        )}
                        엔진 재시작
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-xs hover:bg-indigo-500/20"
                        onClick={handleUpdate}
                        disabled={isUpdating}
                    >
                        {isUpdating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Download className="w-3.5 h-3.5" />
                        )}
                        최신 버전 점검 & 자동 업데이트
                    </Button>

                    <Button
                        size="sm"
                        className="h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs"
                        onClick={handleOpenDsh}
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        하네스 웹 열기 (토큰 자동인증)
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-border bg-background/50 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground font-medium">연동 모델 (OmniRoute)</span>
                            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">viraloop1</Badge>
                        </div>
                        <p className="text-xs text-foreground font-semibold">
                            http://localhost:20128/v1
                        </p>
                    </div>

                    <div className="p-3 rounded-xl border border-border bg-background/50 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground font-medium">인증 보안 상태</span>
                            <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-500">30-Day Cookie</Badge>
                        </div>
                        <p className="text-xs text-foreground font-semibold truncate font-mono">
                            {status.token ? ('토큰 활성 (' + status.token.substring(0, 10) + '...)') : '인증 대기 중'}
                        </p>
                    </div>

                    <div className="p-3 rounded-xl border border-border bg-background/50 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground font-medium">앱 구동 시 자동 기동</span>
                            <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-500">Auto-Start ON</Badge>
                        </div>
                        <p className="text-xs text-foreground font-semibold">
                            ViraLoop 앱 시작 시 무인 백그라운드 자동 실행
                        </p>
                    </div>
                </div>

                <Alert className="border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 p-3 rounded-xl">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <AlertDescription className="text-xs leading-relaxed">
                        DeepSeek Harness는 로컬 브라우저 보안 정책으로 인해 최초 접속 시 <b>인증 토큰 URL</b>로 진입해야 합니다. 
                        상단의 <b>[하네스 웹 열기]</b> 버튼을 누르면 서명된 토큰 쿠키가 자동으로 브라우저에 등록되어 30일간 끊김 없이 자유롭게 대화 및 에이전트 작업을 수행할 수 있습니다.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
};

export default DeepSeekHarnessControlCard;
