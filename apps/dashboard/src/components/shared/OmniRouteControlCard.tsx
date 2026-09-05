import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
    Server, RefreshCcw, Play, RotateCcw, ExternalLink, Download, 
    CheckCircle2, XCircle, AlertTriangle, Terminal, Loader2, Zap
} from 'lucide-react';
import { cn } from "@/lib/utils";

interface OmniRouteStatus {
    running: boolean;
    installed: boolean;
    version: string;
    port: number;
    endpointUrl: string;
    dashboardUrl: string;
}

interface UpdateInfo {
    installed: boolean;
    currentVersion: string | null;
    latestVersion: string | null;
    hasUpdate: boolean;
}

export const OmniRouteControlCard = () => {
    const [status, setStatus] = useState<OmniRouteStatus>({
        running: false,
        installed: false,
        version: '',
        port: 20128,
        endpointUrl: 'http://localhost:20128/v1',
        dashboardUrl: 'http://localhost:20128/dashboard'
    });
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [installLogs, setInstallLogs] = useState<string[]>([]);
    const [showLogBox, setShowLogBox] = useState(false);

    // 1. Fetch live status from Electron main process
    const fetchStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const electronAPI = (window as any).electronAPI;
            if (electronAPI?.omnirouteGetStatus) {
                const res = await electronAPI.omnirouteGetStatus();
                setStatus(res);
            } else {
                // Fallback: Web fetch check
                try {
                    const check = await fetch('http://localhost:20128/', { method: 'HEAD' });
                    setStatus(prev => ({ 
                        ...prev, 
                        running: check.status < 500, 
                        installed: true,
                        version: prev.version || '3.8.50'
                    }));
                } catch {
                    setStatus(prev => ({ ...prev, running: false }));
                }
            }
        } catch (err: any) {
            console.warn('[OmniRoute] Status check error:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 2. Check for latest patch/update
    const handleCheckUpdate = async () => {
        setIsLoading(true);
        try {
            const electronAPI = (window as any).electronAPI;
            if (electronAPI?.omnirouteCheckUpdate) {
                const info = await electronAPI.omnirouteCheckUpdate();
                setUpdateInfo(info);
                if (info.hasUpdate) {
                    toast.info(`OmniRoute 신규 버전(v${info.latestVersion})이 출시되었습니다.`, {
                        description: '원클릭 업데이트 버튼을 눌러 최신 패치를 적용하세요.'
                    });
                } else {
                    toast.success('OmniRoute가 최신 버전입니다.', {
                        description: `현재 버전: v${info.currentVersion || status.version}`
                    });
                }
            }
        } catch (err: any) {
            toast.error('업데이트 확인 실패: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // 3. Start or Restart daemon
    const handleToggleServer = async (action: 'start' | 'restart' | 'stop') => {
        setIsLoading(true);
        try {
            const electronAPI = (window as any).electronAPI;
            if (action === 'start' && electronAPI?.omnirouteStart) {
                toast.loading('OmniRoute 게이트웨이 기동 중...');
                await electronAPI.omnirouteStart();
                toast.dismiss();
                toast.success('OmniRoute 게이트웨이가 시작되었습니다.');
            } else if (action === 'restart' && electronAPI?.omnirouteRestart) {
                toast.loading('OmniRoute 게이트웨이 재시작 중...');
                await electronAPI.omnirouteRestart();
                toast.dismiss();
                toast.success('OmniRoute 게이트웨이가 재시작되었습니다.');
            } else if (action === 'stop' && electronAPI?.omnirouteStop) {
                await electronAPI.omnirouteStop();
                toast.info('OmniRoute 게이트웨이가 정지되었습니다.');
            }
            await fetchStatus();
        } catch (err: any) {
            toast.error(`작업 실패: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // 4. One-stop Install or Update via npm
    const handleInstallOrUpdate = async () => {
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI?.omnirouteInstall) {
            toast.error('Electron 데스크톱 환경에서만 원스탑 자동 설치가 지원됩니다.');
            return;
        }

        setIsInstalling(true);
        setShowLogBox(true);
        setInstallLogs(['[ViraLoop] OmniRoute 원스탑 자동 설치 프로세스를 시작합니다...\n']);

        try {
            const res = await electronAPI.omnirouteInstall();
            if (res.success) {
                toast.success('OmniRoute 설치 및 엔진 가동이 완료되었습니다!');
                await fetchStatus();
            } else {
                toast.error('설치 중 오류가 발생했습니다: ' + (res.error || '알 수 없음'));
            }
        } catch (err: any) {
            toast.error('설치 실행 실패: ' + err.message);
        } finally {
            setIsInstalling(false);
        }
    };

    // 5. Subscribe to install logs
    useEffect(() => {
        fetchStatus();

        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.onOmniRouteInstallLog) {
            const cleanup = electronAPI.onOmniRouteInstallLog((log: string) => {
                setInstallLogs(prev => [...prev.slice(-80), log]);
            });
            return cleanup;
        }
    }, [fetchStatus]);

    return (
        <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden mb-6">
            <CardHeader className="bg-muted/30 border-b border-border py-3.5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Server className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-bold text-foreground">
                                OmniRoute 로컬 게이트웨이 엔진 센터
                            </CardTitle>
                            {status.running ? (
                                <Badge variant="default" className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold gap-1 px-2 py-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    정상 가동 중 (포트 {status.port})
                                </Badge>
                            ) : status.installed ? (
                                <Badge variant="secondary" className="bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-bold gap-1 px-2 py-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    엔진 정지됨
                                </Badge>
                            ) : (
                                <Badge variant="destructive" className="bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[10px] font-bold gap-1 px-2 py-0.5">
                                    <XCircle className="w-3 h-3" />
                                    엔진 미설치
                                </Badge>
                            )}
                        </div>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5">
                            엔진 버전: <span className="font-mono font-bold text-foreground">v{status.version ? status.version.replace(/^v/i, '') : '3.8.50'}</span> · 350+ AI 모델 단일 라우터 통합 및 자동 폴백
                        </CardDescription>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 border-border bg-card text-foreground rounded-xl font-bold text-xs"
                        onClick={handleCheckUpdate}
                        disabled={isLoading || isInstalling}
                    >
                        <RefreshCcw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                        패치 확인
                    </Button>

                    {status.running ? (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 border-border bg-card text-foreground rounded-xl font-bold text-xs hover:bg-muted"
                            onClick={() => handleToggleServer('restart')}
                            disabled={isLoading || isInstalling}
                        >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                            재시작
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="default"
                            className="h-8 gap-1.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleToggleServer('start')}
                            disabled={isLoading || isInstalling}
                        >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            엔진 시작
                        </Button>
                    )}

                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 border-border bg-card text-foreground rounded-xl font-bold text-xs hover:text-primary"
                        onClick={() => {
                            const electronAPI = (window as any).electronAPI;
                            if (electronAPI?.omnirouteOpenDashboard) {
                                electronAPI.omnirouteOpenDashboard();
                            } else {
                                window.open(status.dashboardUrl, '_blank');
                            }
                        }}
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        대시보드 열기
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
                {/* Notice & Smart Feature Banner */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-muted/30 border border-border flex items-start gap-2.5">
                        <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-foreground">0원 무료 AI 가상 콤보</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                <code className="text-primary font-mono font-bold">auto</code> 모델을 선택하면 키 결제 없이도 90+ 무료 AI 풀로 자동 전환됩니다.
                            </p>
                        </div>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/30 border border-border flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-foreground">앱 구동 시 자동 백그라운드 기동</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                ViraLoop 데스크톱 앱이 실행되면 포트 20128의 OmniRoute 엔진이 무인 자동으로 시작됩니다.
                            </p>
                        </div>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/30 border border-border flex items-start gap-2.5">
                        <Download className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-foreground">원스탑 자동 설치 & 패치 관리</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                터미널 작업 없이 버튼 클릭 한 번으로 최신 패치를 내려받고 안전하게 갱신합니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Update Alert if update is available */}
                {updateInfo?.hasUpdate && (
                    <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-500 py-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <div className="flex items-center justify-between w-full">
                            <AlertDescription className="text-xs font-bold">
                                OmniRoute 최신 패치(v{updateInfo.latestVersion})가 발견되었습니다! (현재: v{updateInfo.currentVersion})
                            </AlertDescription>
                            <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3"
                                onClick={handleInstallOrUpdate}
                                disabled={isInstalling}
                            >
                                {isInstalling ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                                지금 패치 적용
                            </Button>
                        </div>
                    </Alert>
                )}

                {/* Not Installed Alert */}
                {!status.installed && (
                    <Alert className="bg-rose-500/10 border-rose-500/30 text-rose-500 py-2.5">
                        <XCircle className="h-4 w-4 text-rose-500" />
                        <div className="flex items-center justify-between w-full">
                            <AlertDescription className="text-xs font-bold">
                                OmniRoute가 시스템에 설치되어 있지 않습니다. 원스탑 버튼으로 즉시 설치할 수 있습니다.
                            </AlertDescription>
                            <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-3"
                                onClick={handleInstallOrUpdate}
                                disabled={isInstalling}
                            >
                                {isInstalling ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                                원스탑 자동 설치
                            </Button>
                        </div>
                    </Alert>
                )}

                {/* Real-time Install / Update Log Terminal */}
                {showLogBox && (
                    <div className="rounded-xl border border-border bg-black/90 p-3 text-emerald-400 font-mono text-[11px] space-y-2 mt-2">
                        <div className="flex items-center justify-between pb-1 border-b border-white/10 text-white/70">
                            <span className="flex items-center gap-1.5 font-bold">
                                <Terminal className="w-3.5 h-3.5 text-emerald-400" /> OmniRoute 인스톨러 실시간 로그
                            </span>
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-5 text-[10px] text-white/60 hover:text-white px-1.5"
                                onClick={() => setShowLogBox(false)}
                            >
                                닫기
                            </Button>
                        </div>
                        <div className="max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
                            {installLogs.join('')}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default OmniRouteControlCard;
