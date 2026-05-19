import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
    Shield, User, Activity, RefreshCw, Smartphone, Wifi,
    Signal, Rocket, Globe, Server, CheckCircle2, XCircle
} from 'lucide-react';
import TinCanVault from '@/components/resource/TinCanVault';
import CaptainQuarters from '@/components/resource/CaptainQuarters';
import TinCanWizard from '@/components/resource/TinCanWizard';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from "@/components/ui/card";

const AccountManager = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<'vault' | 'captains' | 'network'>('vault');
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    // Network State
    const [networkStatus, setNetworkStatus] = useState<any>({
        status: "DISCONNECTED",
        adb_connected: false,
        mobile_data_enabled: false,
        tethering_ip: null,
        internet_accessible: false,
        public_ip: "Unknown"
    });
    const [isNetworkLoading, setIsNetworkLoading] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [verifying, setVerifying] = useState(false); // [NEW] Verification State
    const [refreshKey, setRefreshKey] = useState(0);

    const pollingRef = useRef<any>(null);

    // [New] Fetch Status (Passive)
    const loadNetworkStatus = async (isManual = false) => {
        if (isManual) setIsNetworkLoading(true);
        try {
            const res = await fetch(`/api/resources/network/status`);
            if (res.ok) {
                const data = await res.json();
                setNetworkStatus(data);
                if (isManual) toast({ description: "상태 확인 완료" });
            }
        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "오류", description: "서버 연결 실패" });
        }
        finally {
            if (isManual) setIsNetworkLoading(false);
        }
    };

    // [New] Active Verification
    const handleVerifyConnection = async () => {
        setVerifying(true);
        try {
            toast({ description: "연결 테스트 중... (순단 발생 가능)" });
            const res = await fetch(`/api/resources/network/verify`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                if (data.status === "VERIFIED") {
                    setNetworkStatus((prev: any) => ({ ...prev, public_ip: data.public_ip }));
                    toast({ description: `연결 확인 성공! Public IP: ${data.public_ip}` });
                } else {
                    toast({ variant: "destructive", title: "연결 실패", description: "인터넷 연결을 확인할 수 없습니다." });
                }
            }
        } catch (e) {
            toast({ variant: "destructive", title: "오류", description: "검증 요청 실패" });
        } finally {
            setVerifying(false);
            loadNetworkStatus(); // Refresh passive status
        }
    };

    const handleRotate = async (method: 'soft' | 'hard') => {
        setIsRotating(true);
        try {
            // Use legacy endpoint for now or update to /api/resources/network/rotate
            await fetch(`/api/resources/network/rotate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method })
            });

            toast({
                title: "IP 교체 명령 전달세",
                description: "네트워크 재설정 중..."
            });

            setTimeout(() => {
                setIsRotating(false);
                loadNetworkStatus();
            }, 3000); // Wait longer for soft toggle

        } catch {
            setIsRotating(false);
            toast({ variant: "destructive", title: "오류", description: "IP 교체 요청 실패" });
        }
    };

    useEffect(() => {
        if (activeTab === 'network') {
            loadNetworkStatus();
        }
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [activeTab]);

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen text-slate-900 font-sans">

            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                        <Server className="w-6 h-6 text-indigo-600" />
                        계정 관리 센터
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        안정형 연결 모드. 사용자가 요청할 때만 상태를 변경합니다.
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-lg w-fit">
                {[
                    { id: 'vault', label: '기밀 보관소 (Vault)', icon: Shield },
                    { id: 'captains', label: '소유주 관리 (Captain)', icon: User },
                    { id: 'network', label: '네트워크 관제 (Matrix)', icon: Activity }
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

                {activeTab === 'network' && (
                    <div className="max-w-4xl mx-auto space-y-6">

                        {/* Classic Network Dashboard (Unified) */}
                        <Card className="border-slate-200 shadow-md bg-white">
                            <CardContent className="p-8">
                                <div className="flex flex-col md:flex-row justify-between items-center gap-6">

                                    {/* Identity Section */}
                                    <div className="flex items-center gap-4">
                                        <div className={`p-4 rounded-full ${networkStatus.status === 'ACTIVE' || networkStatus.public_ip !== "Unknown" ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                            <Globe className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-800">Current Identity (LTE)</h2>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="font-mono text-2xl font-bold text-indigo-600">
                                                    {networkStatus.public_ip && networkStatus.public_ip !== "Unknown" ? networkStatus.public_ip : "Identifying..."}
                                                </span>
                                                {networkStatus.status === 'ACTIVE' && (
                                                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700">
                                                        LIVE
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500 mt-1">
                                                Status: {networkStatus.adb_connected ? "Connected (USB)" : "Disconnected"}
                                                {networkStatus.tethering_ip && ` | Adapter: ${networkStatus.tethering_ip}`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <Button
                                            onClick={() => handleRotate('soft')}
                                            disabled={isRotating || verifying}
                                            className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                        >
                                            {isRotating ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCw className="mr-2 h-5 w-5" />}
                                            IP Rotation (New Identity)
                                        </Button>

                                        <Button
                                            onClick={handleVerifyConnection}
                                            disabled={verifying || isRotating}
                                            variant="outline"
                                            className="h-12 w-12 p-0 border-slate-300 text-slate-600 hover:bg-slate-50"
                                            title="Check Connectivity"
                                        >
                                            {verifying ? <RefreshCw className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                                        </Button>
                                    </div>
                                </div>

                                {/* Legacy Information / Hints */}
                                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                                    <p className="text-slate-400 text-sm">
                                        * Wi-Fi remains the primary base connection. LTE is used exclusively for IP Rotation & Anonymity.
                                    </p>
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
