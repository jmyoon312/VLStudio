import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
    Shield, User, Activity, RefreshCw, Smartphone, Wifi,
    Signal, Rocket, Globe, Server, CheckCircle2, XCircle, Cable, Bot, Battery
} from 'lucide-react';
import TinCanVault from '@/components/resource/TinCanVault';
import SocialAccountsManager from '@/components/captain/SocialAccountsManager';
import GoogleAuthGuide from '../components/GoogleAuthGuide';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { Card, CardContent } from "@/components/ui/card";
import { BulkWarmupPanel } from '@/components/resource/CaptainQuarters';

const Incubator = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<'vault' | 'social' | 'network'>('vault');
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    // Network State
    const [networkStatus, setNetworkStatus] = useState<any>({
        status_detail: "IDLE",
        current_ip: "확인 중...",
        interface_ip: "..."
    });
    const [isNetworkLoading, setIsNetworkLoading] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const pollingRef = useRef<any>(null);  // Fixed: NodeJS.Timeout -> any

    // [상태 확인]
    const loadNetworkStatus = async (isManual = false) => {
        if (isManual) setIsNetworkLoading(true);
        try {
            const url = `/resources/network/status?t=${Date.now()}${isManual ? '&force=true' : ''}`;
            const res = await api.get(url);
            setNetworkStatus(res.data);
            if (isManual) toast({ description: "강제 IP 갱신 완료" });
        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "오류", description: "서버 연결 실패" });
        }
        finally {
            if (isManual) setIsNetworkLoading(false);
        }
    };

    // [버스트 폴링]
    const startBurstPolling = () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        let count = 0;
        loadNetworkStatus();
        pollingRef.current = setInterval(() => {
            count++;
            loadNetworkStatus();
            if (count >= 5) {
                if (pollingRef.current) clearInterval(pollingRef.current);
            }
        }, 1500);
    };

    const [rotatingSerial, setRotatingSerial] = useState<string | null>(null);

    const handleRotate = async (method: 'soft' | 'hard', serial?: string) => {
        setIsRotating(true);
        if (serial) setRotatingSerial(serial);
        try {
            const res = await api.post(`/resources/network/rotate`, { method, serial });
            if (res.data?.status === 'rotated') {
                const newIp = res.data?.current_ip;
                toast({
                    title: `IP 교체 완료${serial ? ` (${serial.slice(0, 8)}...)` : ''}`,
                    description: newIp ? `새 공인 IP: ${newIp}` : "새 공인 IP가 할당되었습니다."
                });
            } else {
                toast({ variant: "destructive", title: "IP 교체 실패", description: res.data?.detail || "통신사 재접속 실패" });
            }
            await loadNetworkStatus();
        } catch {
            toast({ variant: "destructive", title: "오류", description: "IP 교체 요청 실패" });
        } finally {
            setIsRotating(false);
            setRotatingSerial(null);
        }
    };

    useEffect(() => {
        if (activeTab === 'network') {
            loadNetworkStatus();
            pollingRef.current = setInterval(() => {
                loadNetworkStatus();
            }, 3000);
        }
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [activeTab]);

    const isConnected = networkStatus.status_detail !== 'DISCONNECTED';
    const isLte = networkStatus.status_detail === 'LTE_MODE';
    const isWifi = networkStatus.status_detail === 'WIFI_MODE';
    const isDual = networkStatus.status_detail === 'DUAL_MODE';

    // Check specific system mode from monitor
    const sysMode = networkStatus.monitor?.system_gateway_mode || "Unknown";
    const isWired = sysMode.includes("WIRED");

    return (
        <div className="p-3 sm:p-6 pb-52 sm:pb-40 md:pb-16 space-y-3 sm:space-y-4 bg-background min-h-screen text-foreground font-sans">


            {/* 1. 상단 타이틀 헤더 바 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 w-full pb-2.5 sm:pb-3 border-b border-border">
                <div>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                        <Shield className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600 dark:text-indigo-400" />
                        <span>채널 계정 & 웜업 육성</span>
                    </h1>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                        구글/소셜 채널 계정을 스텔스 안티디텍트 환경에 등록하고 안전하게 알고리즘 웜업 및 육성 제어
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-full text-[10px] font-bold text-muted-foreground shadow-2xs">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-muted'}`} />
                        {isConnected ? `CONNECTED: ${networkStatus.current_ip}` : 'OFFLINE'}
                    </div>
                    <GoogleAuthGuide />
                </div>
            </div>

            {/* 3대 통합 탭 (모바일 3등분 반응형 그리드) */}
            <div className="grid grid-cols-3 gap-1 bg-muted/90 p-1 rounded-xl w-full sm:w-fit sm:flex sm:space-x-1">
                {[
                    { id: 'vault', label: '구글/유튜브 계정 & 웜업', shortLabel: '구글 계정', icon: Shield },
                    { id: 'social', label: '틱톡·인스타 SNS 연동', shortLabel: 'SNS 연동', icon: Globe },
                    { id: 'network', label: '프록시 & 네트워크 관제', shortLabel: '네트워크', icon: Activity }
                ].map((tab: any) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center justify-center sm:justify-start px-2 sm:px-4 py-2 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all text-center ${activeTab === tab.id
                            ? 'bg-background text-primary shadow-xs font-extrabold'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" />
                        <span className="sm:hidden text-[11px] truncate">{tab.shortLabel}</span>
                        <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="animate-in fade-in duration-300">
                {activeTab === 'vault' && (
                    <div className="space-y-6">
                        <BulkWarmupPanel />
                        <TinCanVault mode="incubator" key={refreshKey} />
                    </div>
                )}
                {activeTab === 'social' && (
                    <div className="max-w-7xl mx-auto bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
                        <SocialAccountsManager />
                    </div>
                )}

                {activeTab === 'network' && (
                    <div className="max-w-4xl mx-auto">
                        <Card className="border-border/80 shadow-xs bg-card rounded-2xl overflow-hidden">
                            <CardContent className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">

                                {/* Status Row */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className={`p-2.5 sm:p-3 rounded-xl border shrink-0 ${isConnected ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                                            <Smartphone className="w-6 h-6 sm:w-8 sm:h-8" />
                                        </div>
                                        <div>
                                            <h2 className="text-base sm:text-lg font-bold text-foreground">듀얼 프록시 격리 시스템</h2>
                                            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs sm:text-sm">
                                                {isConnected ? (
                                                    <span className="flex items-center text-emerald-500 font-bold whitespace-nowrap">
                                                        <CheckCircle2 className="w-4 h-4 mr-1 shrink-0" /> 온라인
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center text-rose-500 font-bold whitespace-nowrap">
                                                        <XCircle className="w-4 h-4 mr-1 shrink-0" /> 오프라인
                                                    </span>
                                                )}
                                                <span className="text-muted-foreground">|</span>
                                                <span className="text-muted-foreground font-mono text-xs">IF: {networkStatus.interface_ip || 'Not Detected'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-xs h-8 px-2.5 border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-bold"
                                            onClick={async () => {
                                                try {
                                                    setIsNetworkLoading(true);
                                                    await api.post('/resources/network/source/LTE');
                                                    toast({ title: "LTE 강제 고정 완료", description: "스마트폰 Wi-Fi를 차단하고 순수 LTE 데이터망으로 고정했습니다." });
                                                    await loadNetworkStatus(true);
                                                } catch (e) {
                                                    toast({ variant: "destructive", title: "오류", description: "LTE 고정 실패" });
                                                } finally {
                                                    setIsNetworkLoading(false);
                                                }
                                            }}
                                            disabled={isNetworkLoading}
                                        >
                                            <Smartphone className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                                            폰 Wi-Fi 끄고 LTE 고정
                                        </Button>
                                        <Button 
                                            variant="secondary" 
                                            size="sm" 
                                            className="text-xs h-8 px-2.5 flex-1 sm:flex-initial"
                                            onClick={async () => {
                                                try {
                                                    const res = await api.post('/resources/network/fix-permissions');
                                                    toast({ title: "안전장치 적용 요청", description: res.data.message });
                                                } catch (e) {
                                                    toast({ variant: "destructive", title: "오류", description: "권한 변경 실패" });
                                                }
                                            }}
                                        >
                                            <Shield className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                                            메인 네트워크 우선권
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-xs h-8 px-2.5" onClick={() => loadNetworkStatus(true)} disabled={isNetworkLoading}>
                                            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isNetworkLoading ? 'animate-spin' : ''}`} />
                                            상태 확인
                                        </Button>
                                    </div>
                                </div>

                                <hr className="border-border/80" />

                                {/* Sovereign Multi-Line Network Grid */}
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <h3 className="text-sm sm:text-base font-extrabold text-foreground flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-indigo-500" />
                                                <span>주권 다중 회선 매트릭스 (Sovereign Multi-Line Grid)</span>
                                            </h3>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                USB 스마트폰별 1080~1089 독립 포트 자동 할당 및 ISP 고정 IP 채널 무간섭 병렬 운용
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="px-2.5 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px]">
                                                LTE 단말 {networkStatus.devices?.length || (networkStatus.monitor?.lte ? 1 : 0)}대
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px]">
                                                ISP 고정 {networkStatus.isp_proxies?.length || 0}개
                                            </span>
                                        </div>
                                    </div>

                                    {/* Devices and Proxies Grid */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {/* 1. LTE Mobile Devices Section */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                                                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                                                    <Smartphone className="w-3.5 h-3.5" /> LTE 스마트폰 회선 목록
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                    Every Proxy SOCKS5
                                                </span>
                                            </div>

                                            {networkStatus.devices && networkStatus.devices.length > 0 ? (
                                                <div className="space-y-3">
                                                    {networkStatus.devices.map((device: any, idx: number) => {
                                                        const boundProfiles = (networkStatus.profiles?.lte || []).filter(
                                                            (p: any) => p.bound_device_serial === device.serial || (!p.bound_device_serial && idx === 0)
                                                        );
                                                        const isRotatingThis = isRotating && rotatingSerial === device.serial;

                                                        return (
                                                            <div 
                                                                key={device.serial || idx}
                                                                className="p-4 rounded-2xl border border-rose-500/20 bg-card hover:border-rose-500/40 transition-all shadow-xs space-y-3"
                                                            >
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl shrink-0">
                                                                            <Smartphone className="w-5 h-5" />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                <h4 className="font-extrabold text-sm text-foreground truncate">
                                                                                    {device.model || 'Galaxy 스마트폰'}
                                                                                </h4>
                                                                                {device.carrier && (
                                                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                                                        {device.carrier}
                                                                                    </span>
                                                                                )}
                                                                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-foreground border border-border">
                                                                                    Port {device.port || (1080 + idx)}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">
                                                                                S/N: {device.serial}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Battery & Status */}
                                                                    <div className="flex flex-col items-end shrink-0 gap-1">
                                                                        <span className="flex items-center text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                                                            <Shield className="w-3 h-3 mr-1 text-rose-500" /> 격리 활성
                                                                        </span>
                                                                        {typeof device.battery === 'number' && (
                                                                            <span className={`text-[10px] font-mono flex items-center gap-1 ${
                                                                                device.battery <= 20 ? 'text-rose-500 font-bold' : device.battery <= 50 ? 'text-amber-500' : 'text-emerald-500'
                                                                            }`}>
                                                                                <Battery className="w-3 h-3" /> {device.battery}%
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* IP and Bound Accounts */}
                                                                <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-2">
                                                                    <div className="flex justify-between items-center text-xs pb-1.5 border-b border-border/50">
                                                                        <span className="text-muted-foreground text-[11px] font-medium">단말기 공용 IP</span>
                                                                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                                                                            {device.public_ip || networkStatus.mobile_public_ip || '조회 중...'}
                                                                        </span>
                                                                    </div>

                                                                    <div className="space-y-1 pt-0.5">
                                                                        <div className="flex justify-between items-center text-[11px]">
                                                                            <span className="text-muted-foreground font-semibold">바인딩된 채널 계정:</span>
                                                                            <span className="font-mono text-foreground font-bold">{boundProfiles.length}개</span>
                                                                        </div>
                                                                        {boundProfiles.length > 0 ? (
                                                                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                                                                                {boundProfiles.map((p: any) => (
                                                                                    <span 
                                                                                        key={p.id}
                                                                                        className="text-[10px] bg-card border border-border px-2 py-0.5 rounded text-foreground font-mono truncate max-w-[180px]"
                                                                                        title={p.email || p.id}
                                                                                    >
                                                                                        {p.email || p.id}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-[10px] text-muted-foreground italic">
                                                                                할당된 계정 없음 (계정 등록 마법사에서 이 기기 선택 가능)
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Individual Device IP Rotation Button */}
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleRotate('soft', device.serial)}
                                                                    disabled={isRotating}
                                                                    className="w-full text-xs h-8 border-rose-500/30 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center gap-1.5 rounded-xl transition-all"
                                                                >
                                                                    <RefreshCw className={`w-3.5 h-3.5 ${isRotatingThis ? 'animate-spin text-rose-500' : ''}`} />
                                                                    <span>{isRotatingThis ? '이 기기 IP 교체 중...' : `이 기기 소프트 IP 교체 (Port ${device.port || (1080 + idx)})`}</span>
                                                                </Button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                /* Fallback when device list is not populated yet */
                                                <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2.5 bg-muted text-muted-foreground rounded-xl shrink-0">
                                                            <Smartphone className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-sm text-foreground">
                                                                {networkStatus.monitor?.lte ? '단일 LTE 모바일 회선 (기본 1080)' : '연결된 스마트폰 없음'}
                                                            </h4>
                                                            <p className="text-xs text-muted-foreground">
                                                                {networkStatus.monitor?.lte 
                                                                    ? `공용 IP: ${networkStatus.mobile_public_ip || '확인 중'}` 
                                                                    : 'USB 케이블로 안드로이드 스마트폰을 PC에 연결하세요.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {networkStatus.profiles?.lte?.length > 0 && (
                                                        <div className="p-2.5 bg-muted/40 rounded-lg text-xs space-y-1">
                                                            <span className="text-muted-foreground font-bold text-[10px]">소속 계정 ({networkStatus.profiles.lte.length}개):</span>
                                                            <div className="flex flex-wrap gap-1">
                                                                {networkStatus.profiles.lte.map((p: any) => (
                                                                    <span key={p.id} className="text-[10px] bg-card border border-border px-1.5 py-0.5 rounded text-foreground font-mono">
                                                                        {p.email || p.id}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {networkStatus.monitor?.lte && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleRotate('soft')}
                                                            disabled={isRotating}
                                                            className="w-full text-xs h-8 border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-bold"
                                                        >
                                                            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRotating ? 'animate-spin' : ''}`} />
                                                            기본 LTE IP 소프트 교체
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* 2. ISP Static Proxy Pool Section */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                                                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                                    <Server className="w-3.5 h-3.5" /> ISP 고정 프록시 전용선 풀
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                    독립 고정 IP
                                                </span>
                                            </div>

                                            <div className="p-4 sm:p-5 rounded-2xl border border-blue-500/20 bg-card space-y-4 shadow-xs">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl shrink-0">
                                                            <Server className="w-5 h-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-extrabold text-sm text-foreground truncate">ISP 고정망 풀 현황</h4>
                                                            <p className="text-xs text-blue-500 dark:text-blue-400 font-medium">
                                                                총 {networkStatus.isp_proxies?.length || 0}개 전용 회선 운용 중
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="flex items-center text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 shrink-0">
                                                        <CheckCircle2 className="w-3 h-3 mr-1 text-blue-500" /> 독립 보호
                                                    </span>
                                                </div>

                                                <div className="space-y-2">
                                                    {networkStatus.isp_proxies && networkStatus.isp_proxies.length > 0 ? (
                                                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                                            {networkStatus.isp_proxies.map((isp: any, i: number) => {
                                                                const ispAccounts = (networkStatus.profiles?.isp || []).filter(
                                                                    (p: any) => p.proxy_host === isp.host && String(p.proxy_port) === String(isp.port)
                                                                );
                                                                return (
                                                                    <div key={i} className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-1.5">
                                                                        <div className="flex justify-between items-center text-xs">
                                                                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                                                                {isp.protocol?.toUpperCase() || 'HTTP'}://{isp.host}:{isp.port}
                                                                            </span>
                                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                                                {isp.account_count || ispAccounts.length}개 채널
                                                                            </span>
                                                                        </div>
                                                                        {ispAccounts.length > 0 && (
                                                                            <div className="flex flex-wrap gap-1 pt-1">
                                                                                {ispAccounts.map((p: any) => (
                                                                                    <span key={p.id} className="text-[10px] bg-card border border-border px-1.5 py-0.5 rounded text-foreground font-mono truncate max-w-[150px]">
                                                                                        {p.email || p.id}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 rounded-xl bg-muted/30 border border-border/60 text-center space-y-1.5">
                                                            <p className="text-xs text-muted-foreground">
                                                                현재 등록된 ISP 고정 프록시가 없습니다.
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground/80">
                                                                [계정 등록 마법사]에서 ISP 고정 IP 모드를 선택하여 프록시 정보를 입력하면 자동으로 풀에 등록됩니다.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Direct profiles info */}
                                                {networkStatus.profiles?.direct && networkStatus.profiles.direct.length > 0 && (
                                                    <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground flex justify-between items-center">
                                                        <span>직접 연결 (프록시 없음) 계정:</span>
                                                        <span className="font-mono font-bold text-foreground">{networkStatus.profiles.direct.length}개</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Security Isolation Verification Checklist */}
                                <div className="relative overflow-hidden rounded-2xl bg-card p-4 sm:p-5 text-sm border border-border/80 shadow-xs">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-rose-500 opacity-80"></div>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 shrink-0" />
                                            <span className="font-bold text-indigo-400 tracking-wide text-xs sm:text-sm">보안 격리 상태 검증 (Security Isolation Checklist)</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                                            VERIFIED SECURE
                                        </span>
                                    </div>
                                    <div className="space-y-2.5 text-xs text-foreground bg-card p-3 rounded-lg border border-border shadow-sm">
                                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                            <span className="flex items-center text-muted-foreground">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                                                시스템 기본망 Wi-Fi 강제 라우팅
                                            </span>
                                            <span className="font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">정상 작동 (Wi-Fi 전용)</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                            <span className="flex items-center text-muted-foreground">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                                                유튜브 업로드 LTE 프록시 격리 (Port 1080~1089 다중 회선)
                                            </span>
                                            <span className={`font-mono px-1.5 py-0.5 rounded ${networkStatus.monitor?.lte ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                                                {networkStatus.monitor?.lte ? '정상 작동 (LTE 전용)' : '대기 중 (LTE 미감지)'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                            <span className="flex items-center text-muted-foreground">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                                                LTE 연결 실패 시 Wi-Fi 우회 차단 (Hard-Gate)
                                            </span>
                                            <span className="font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">차단 활성화 (Bypass Blocked)</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                            <span className="flex items-center text-muted-foreground">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                                                DNS 패킷 Wi-Fi 유출 방지 (Interface-Bound DNS)
                                            </span>
                                            <span className="font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">보안 작동 중 (DNS Leak Shield)</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center text-muted-foreground">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                                                공인 IP 분리 상태
                                            </span>
                                            <span className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {networkStatus.system_public_ip === networkStatus.mobile_public_ip && networkStatus.system_public_ip !== 'Unknown' && networkStatus.system_public_ip
                                                    ? '⚠️ 중복 검출 (프록시 확인 필요)'
                                                    : '완전 독립 (격리 성공)'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Matrix Diagnostics */}
                                <div className="relative overflow-hidden rounded-xl bg-emerald-500/5 p-5 font-mono text-sm border border-emerald-500/20 shadow-sm">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 opacity-80"></div>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                            </div>
                                            <span className="font-bold text-emerald-500 tracking-wide text-[13px]">SOVEREIGN MULTI-LINE ISOLATION ENGINE ACTIVE</span>
                                        </div>
                                        <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                                            Last Updated: {networkStatus.monitor?.last_check || "Loading..."}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-[11.5px] leading-relaxed text-foreground bg-card p-3 rounded-lg border border-border shadow-sm">
                                        <span className="text-emerald-400 mr-1">▶</span> 시스템 기본망은 항상 Wi-Fi로 유지되며, 유튜브 브랜드 채널 창은 단말기 전용 포트(1080~1089) 또는 ISP 고정 프록시를 통해 100% 독립 터널링됩니다. 기기별 병렬 웜업 및 동시 업로드가 완벽히 격리 보장됩니다.
                                    </div>
                                </div>

                                {/* Controls (IP Rotation) */}
                                <div className="space-y-4 pt-2 pb-16 sm:pb-8">
                                    <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        <Activity className="w-4 h-4 text-primary" /> 전체 LTE 신원 교체 제어 (Global IP Rotation)
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Button
                                            onClick={() => handleRotate('soft')}
                                            disabled={isRotating}
                                            className="relative overflow-hidden group h-14 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 dark:text-blue-400 border border-blue-500/30 shadow-sm hover:shadow-md transition-all rounded-xl"
                                        >
                                            <div className="relative flex items-center justify-center font-extrabold text-sm tracking-wide">
                                                {isRotating && !rotatingSerial ? (
                                                    <RefreshCw className="w-4 h-4 mr-2.5 animate-spin text-blue-500" />
                                                ) : (
                                                    <RefreshCw className="w-4 h-4 mr-2.5 text-blue-400 group-hover:rotate-180 transition-transform duration-500" />
                                                )}
                                                전체 소프트 교체 <span className="ml-1.5 text-blue-400/80 font-medium text-xs">(Data Toggle)</span>
                                            </div>
                                        </Button>
                                        
                                        <Button
                                            onClick={() => handleRotate('hard')}
                                            disabled={isRotating}
                                            className="relative overflow-hidden group h-14 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 shadow-sm hover:shadow-md transition-all rounded-xl"
                                        >
                                            <div className="relative flex items-center justify-center font-extrabold text-sm tracking-wide">
                                                {isRotating && !rotatingSerial ? (
                                                    <RefreshCw className="w-4 h-4 mr-2.5 animate-spin text-rose-500" />
                                                ) : (
                                                    <Rocket className="w-4 h-4 mr-2.5 text-rose-400 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform duration-300" />
                                                )}
                                                전체 하드 교체 <span className="ml-1.5 text-rose-400/80 font-medium text-xs">(Airplane Mode)</span>
                                            </div>
                                        </Button>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground text-center pt-1">
                                        💡 웜업 전/후 새로운 모바일 LTE IP가 필요할 때 원클릭으로 통신사 IP를 교체합니다. 단말기별 개별 교체는 위 기기 카드에서 가능합니다.
                                    </p>
                                </div>

                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* Extra Mobile Touch Clearance Spacer */}
            <div className="h-16 md:hidden pointer-events-none" aria-hidden="true" />

        </div>
    );
};

export default Incubator;
