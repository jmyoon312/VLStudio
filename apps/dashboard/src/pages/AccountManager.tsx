import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
    Shield, User, Activity, RefreshCw, Smartphone, Wifi,
    Signal, Rocket, Globe, Server, CheckCircle2, XCircle, Cable
} from 'lucide-react';
import TinCanVault from '@/components/resource/TinCanVault';
import CaptainQuarters from '@/components/resource/CaptainQuarters';
import SocialAccountsManager from '@/components/captain/SocialAccountsManager';
import NotebookLMManager from '@/components/captain/NotebookLMManager';
import GoogleAuthGuide from '../components/GoogleAuthGuide';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { Card, CardContent } from "@/components/ui/card";

const AccountManager = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<'vault' | 'captains' | 'network' | 'social' | 'notebooklm'>('vault');
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
            const res = await api.get(`/resources/network/status?t=${Date.now()}`);
            setNetworkStatus(res.data);
            if (isManual) toast({ description: "상태 확인 완료 (정책 적용됨)" });
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

    const handleSourceSwitch = async (source: 'lte' | 'wifi') => {
        setIsNetworkLoading(true);
        try {
            await api.post(`/resources/network/source/${source}`);
            toast({ title: source === 'lte' ? "LTE 모드 전환" : "Wi-Fi 모드 전환", description: "핸드폰 설정을 변경합니다..." });
            startBurstPolling();
        } finally {
            setIsNetworkLoading(false);
        }
    };

    const handleRotate = async (method: 'soft' | 'hard') => {
        setIsRotating(true);
        try {
            await api.post(`/resources/network/rotate`, { method });
            toast({
                title: "IP 교체 명령 전달됨",
                description: "네트워크 재설정 중... (새 IP 감지 시 자동 갱신)"
            });

            // Wait for 1s then check logic once (Single check as requested)
            setTimeout(() => {
                setIsRotating(false);
                loadNetworkStatus(); // Check once
            }, 1000);

        } catch {
            setIsRotating(false);
            toast({ variant: "destructive", title: "오류", description: "IP 교체 요청 실패" });
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
        <div className="p-4 md:p-6 space-y-4 bg-slate-50 min-h-screen text-slate-900 font-sans">


            {/* Compact Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-3 border-b border-slate-200">
                <div />

                <div className="flex items-center gap-3 mt-3 md:mt-0">
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                        {isConnected ? `CONNECTED: ${networkStatus.current_ip}` : 'OFFLINE'}
                    </div>
                    <GoogleAuthGuide />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-lg w-fit">
                {[
                    { id: 'vault', label: '보관소', icon: Shield },
                    { id: 'captains', label: '소유주', icon: User },
                    { id: 'social', label: '신원 (ID)', icon: Globe },
                    { id: 'notebooklm', label: '지능 (Brain)', icon: Rocket },
                    { id: 'network', label: '네트워크', icon: Activity }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab.id
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4 mr-2" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="animate-in fade-in duration-300">
                {activeTab === 'vault' && <TinCanVault key={refreshKey} />}
                {activeTab === 'captains' && <CaptainQuarters />}
                {activeTab === 'social' && (
                    <div className="max-w-7xl mx-auto bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                        <SocialAccountsManager />
                    </div>
                )}
                {activeTab === 'notebooklm' && (
                    <div className="max-w-7xl mx-auto bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                        <NotebookLMManager />
                    </div>
                )}

                {activeTab === 'network' && (
                    <div className="max-w-4xl mx-auto">
                        <Card className="border-slate-200 shadow-sm bg-white">
                            <CardContent className="p-8 space-y-8">

                                {/* Status Row */}
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl border ${isConnected ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                            <Smartphone className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-800">테더링 게이트웨이</h2>
                                            <div className="flex items-center gap-2 mt-1 text-sm">
                                                {isConnected ? (
                                                    <span className="flex items-center text-emerald-600 font-medium">
                                                        <CheckCircle2 className="w-4 h-4 mr-1" /> 온라인
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center text-rose-500 font-medium">
                                                        <XCircle className="w-4 h-4 mr-1" /> 오프라인
                                                    </span>
                                                )}
                                                <span className="text-slate-300">|</span>
                                                <span className="text-slate-400 font-mono">IF: {networkStatus.interface_ip}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => loadNetworkStatus(true)} disabled={isNetworkLoading}>
                                        <RefreshCw className={`w-4 h-4 mr-2 ${isNetworkLoading ? 'animate-spin' : ''}`} />
                                        상태 확인
                                    </Button>
                                </div>

                                <hr className="border-slate-100" />

                                {/* Info Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">현재 모드</label>
                                        <div className={`flex items-center gap-3 p-4 rounded-lg border ${isLte
                                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-700'
                                            : isDual
                                                ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700'
                                                : isWifi
                                                    ? 'bg-blue-50/50 border-blue-200 text-blue-700'
                                                    : 'bg-slate-50 border-slate-200 text-slate-500'
                                            }`}>
                                            {isLte ? <Signal className="w-6 h-6" /> : isDual ? <Shield className="w-6 h-6" /> : <Wifi className="w-6 h-6" />}
                                            <span className="text-lg font-bold">
                                                {isLte ? "LTE 테더링" : isDual ? (isWired ? "Wired LAN + Safe Tunnel" : "Wi-Fi + Safe Tunnel") : isWifi ? (isWired ? "Wired LAN" : "Wi-Fi 브리지") : "대기 중..."}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">공인 IP 주소</label>
                                        <div className="flex items-center p-4 bg-slate-50 rounded-lg border border-slate-100">
                                            <Globe className="w-5 h-5 text-slate-400 mr-3" />
                                            <span className="text-2xl font-mono font-bold text-slate-800 tracking-tight">
                                                {networkStatus.current_ip}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Matrix Diagnostics */}
                                <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm border border-slate-700 shadow-inner">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-2 text-emerald-400">
                                            <Activity className="w-4 h-4" />
                                            <span className="font-bold">Live Network Matrix</span>
                                        </div>
                                        <span className="text-xs text-slate-500">Last Updated: {networkStatus.monitor?.last_check || "Loading..."}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* System Network Card (Wired or Wi-Fi) */}
                                        <div className="p-3 bg-slate-800 rounded border border-slate-700">
                                            <div className="text-xs text-slate-500 mb-1">
                                                {networkStatus.monitor?.wired?.index ? "System Network (Wired LAN)" : "System Network (Wi-Fi)"}
                                            </div>
                                            <div className="font-bold text-white text-lg">
                                                {networkStatus.monitor?.wired?.index
                                                    ? networkStatus.monitor?.wired?.metric
                                                    : (networkStatus.monitor?.wifi?.metric ?? "N/A")}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1 truncate">
                                                {networkStatus.monitor?.wired?.index
                                                    ? networkStatus.monitor?.wired?.name
                                                    : (networkStatus.monitor?.wifi?.name || "Not Detected")}
                                            </div>
                                        </div>

                                        {/* Identity Network Card (LTE) */}
                                        <div className="p-3 bg-slate-800 rounded border border-slate-700">
                                            <div className="text-xs text-slate-500 mb-1">LTE Metric (Isolated)</div>
                                            <div className="font-bold text-white text-lg">
                                                {networkStatus.monitor?.lte?.metric ?? "N/A"}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1 truncate">
                                                {networkStatus.monitor?.lte?.name || "Not Detected"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Admin Fix Button */}
                                    <div className="mt-4 flex justify-end">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600"
                                            onClick={async () => {
                                                try {
                                                    const res = await api.post('/resources/network/fix-permissions');
                                                    const data = res.data;
                                                    if (data.status === 'success') {
                                                        toast({ title: "권한 상승 요청됨", description: "작업 표시줄의 UAC 창에서 '예'를 클릭하세요." });
                                                    } else {
                                                        toast({ title: "오류 발생", description: data.message, variant: "destructive" });
                                                    }
                                                } catch (e) {
                                                    toast({ title: "통신 오류", description: "백엔드에 연결할 수 없습니다.", variant: "destructive" });
                                                }
                                            }}
                                        >
                                            <Shield className="w-4 h-4 mr-2 text-yellow-500" />
                                            라우팅 강제 적용 (관리자)
                                        </Button>
                                    </div>

                                    <div className="mt-4 p-3 bg-slate-800/50 rounded border border-indigo-500/30 flex justify-between items-center">
                                        <span className="text-slate-400">System Gateway Strategy:</span>
                                        <span className={`font-bold ${networkStatus.monitor?.system_gateway_mode?.includes("WIFI")
                                            ? "text-emerald-400"
                                            : "text-amber-400"
                                            }`}>
                                            {networkStatus.monitor?.system_gateway_mode || "Evaluating..."}
                                        </span>
                                    </div>

                                    <div className="mt-2 text-xs text-slate-500 text-center">
                                        * System traffic follows the Lower Metric. Browsers are bound to LTE Interface directly.
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="space-y-6 pt-2">
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-slate-700">모드 전환 (수동)</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => handleSourceSwitch('lte')}
                                                disabled={isLte || isNetworkLoading}
                                                className={`flex justify-center items-center py-3 rounded-md border text-sm font-medium transition-all ${isLte
                                                    ? 'bg-slate-100 text-slate-400 border-transparent cursor-default'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-600'
                                                    }`}
                                            >
                                                <Signal className="w-4 h-4 mr-2" /> LTE로 전환
                                            </button>
                                            <button
                                                onClick={() => handleSourceSwitch('wifi')}
                                                disabled={isWifi || isNetworkLoading}
                                                className={`flex justify-center items-center py-3 rounded-md border text-sm font-medium transition-all ${isWifi
                                                    ? 'bg-slate-100 text-slate-400 border-transparent cursor-default'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600'
                                                    }`}
                                            >
                                                {isWired ? <Cable className="w-4 h-4 mr-2" /> : <Wifi className="w-4 h-4 mr-2" />}
                                                {isWired ? "Wired LAN으로 전환" : "Wi-Fi로 전환"}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-slate-700">IP 신원 교체</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Button
                                                onClick={() => handleRotate('soft')}
                                                disabled={isRotating || isNetworkLoading}
                                                className="bg-slate-800 hover:bg-slate-900 text-white h-11"
                                            >
                                                {isRotating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                                소프트 교체 (Data Toggle)
                                            </Button>
                                            <Button
                                                onClick={() => handleRotate('hard')}
                                                disabled={isRotating || isNetworkLoading}
                                                variant="outline"
                                                className="border-slate-300 text-slate-700 hover:bg-slate-50 h-11"
                                            >
                                                {isRotating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                                                하드 교체 (Airplane Mode)
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

        </div>
    );
};

export default AccountManager;
