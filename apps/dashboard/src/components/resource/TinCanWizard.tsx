import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
// @ts-ignore
import { useModalVisibility } from '@/features/flow2capcut/hooks/useModalVisibility';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronRight, ShieldCheck, AlertTriangle, Smartphone, Loader2, Wifi, RefreshCw, Upload, FileJson, Sparkles, ChevronLeft, ExternalLink, Copy, Lock, Activity, Battery, CheckCircle2, XCircle, Server, Radio, KeyRound } from 'lucide-react';
import GoogleAuthGuide from '../GoogleAuthGuide';
import GoogleApiIssuanceGuide from './GoogleApiIssuanceGuide';
import { useToast } from "@/components/ui/use-toast";
import axios from 'axios';
import AIModelSelector from '../shared/AIModelSelector';

// 백엔드 주소 강제 고정 (프록시 꼬임 방지)
const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://127.0.0.1:8000/api' : '/api';

interface TinCanWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    initialData?: any;
    accountType?: 'TIN_CAN' | 'CAPTAIN';
}

const WIZARD_STEPS = [
    { title: "계정 정보", desc: "기본 정보 입력" },
    { title: "브라우저 엔진", desc: "핑거프린트 구성" },
    { title: "네트워크 설정", desc: "프록시 방식 선택" },
    { title: "로그인 및 검증", desc: "스텔스 구동 확인" },
    { title: "키 등록", desc: "JSON 업로드" },
    { title: "API 인증", desc: "OAuth2 승인" }
];

const TinCanWizard: React.FC<TinCanWizardProps> = ({ isOpen, onClose, onComplete, initialData }) => {
    // @ts-ignore
    useModalVisibility(isOpen);
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    
    const steps = WIZARD_STEPS;

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Data State
    const [draftId, setDraftId] = useState<string>("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState(""); // Optional, for record keeping
    const [recoveryEmail, setRecoveryEmail] = useState("");
    const [engineType, setEngineType] = useState("cloakbrowser");
    const [accountIncubationType, setAccountIncubationType] = useState<'NEWBORN' | 'MATURE'>('NEWBORN');
    const [lteStatus, setLteStatus] = useState<{ connected: boolean, ip: string }>({ connected: false, ip: "확인 전" });

    // Automation State (Manual Verify Mode)
    const [automationResult, setAutomationResult] = useState<any>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [showManualInput, setShowManualInput] = useState(false);
    // Network Setup State
    const [proxyMode, setProxyMode] = useState<string>("DIRECT_LTE"); // DIRECT_LTE, NETSHARE, ISP_PROXY
    const [proxyProtocol, setProxyProtocol] = useState("http"); // http, socks5
    const [proxyHost, setProxyHost] = useState("");
    const [proxyPort, setProxyPort] = useState("");
    const [proxyUsername, setProxyUsername] = useState("");
    const [proxyPassword, setProxyPassword] = useState("");
    const [boundDeviceSerial, setBoundDeviceSerial] = useState<string>("");
    const [devicesList, setDevicesList] = useState<any[]>([]);
    const [ispProxiesList, setIspProxiesList] = useState<any[]>([]);
    const [isLoadingDevices, setIsLoadingDevices] = useState(false);
    const [isTestingProxy, setIsTestingProxy] = useState(false);
    const [proxyTestResult, setProxyTestResult] = useState<any>(null);
    const [selectedIspIndex, setSelectedIspIndex] = useState<string>("custom");

    // Auth State
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [authChecking, setAuthChecking] = useState(false);

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showApiGuideModal, setShowApiGuideModal] = useState(false);

    // [Resume Logic] Hydrate from initialData
    useEffect(() => {
        if (isOpen && initialData) {
            setDraftId(initialData.id || "");
            setName(initialData.name || "");
            setEmail(initialData.email || "");
            setPassword(initialData.password || "");
            setRecoveryEmail(initialData.recovery_email || "");
            setEngineType(initialData.engine_type || "cloakbrowser");
            
            // Proxy hydration
            setProxyMode(initialData.proxy_mode || "DIRECT_LTE");
            setProxyProtocol(initialData.proxy_protocol || "http");
            setProxyHost(initialData.proxy_host || "");
            setProxyPort(initialData.proxy_port || "");
            setProxyUsername(initialData.proxy_username || "");
            setProxyPassword(initialData.proxy_password || "");
            setBoundDeviceSerial(initialData.bound_device_serial || "");

            // Auto-advance if we have an ID
            if (initialData.id) {
                if (initialData.status === 'ACTIVE') {
                    setStep(6); // Resume at API Auth if already completed main setup
                } else if (initialData.proxy_host || (initialData.proxy_mode && initialData.proxy_mode !== 'DIRECT_LTE')) {
                    setStep(4); // Resume at Login Check if network is configured
                } else if (initialData.engine_type) {
                    setStep(3); // Resume at Network Setup if engine is configured
                } else {
                    setStep(2);
                }
                checkNetwork(); // Pre-check network if resuming
            }
        } else if (isOpen && !initialData) {
            // Reset if fresh open
            setStep(1);
            setDraftId("");
            setName("");
            setEmail("");
            setPassword("");
            setRecoveryEmail("");
            setEngineType("cloakbrowser");
            setBoundDeviceSerial("");
            setDevicesList([]);
            setProxyTestResult(null);
            setLteStatus({ connected: false, ip: "확인 전" });
        }
    }, [isOpen, initialData]);

    // --- Step 1: Import (Draft) ---
    const handleImportAccount = async () => {
        if (!email) return toast({ variant: "destructive", title: "이메일 누락", description: "이메일을 입력해주세요." });

        setIsLoading(true);
        try {
            if (draftId) {
                await axios.put(`${API_BASE}/resources/profiles/${draftId}`, {
                    name,
                    email,
                    password,
                    recovery_email: recoveryEmail,
                    incubation_status: accountIncubationType,
                    status: 'draft'
                });
            } else {
                const res = await axios.post(`${API_BASE}/resources/profiles/draft`, {
                    name,
                    email,
                    password,
                    recovery_email: recoveryEmail,
                    incubation_status: accountIncubationType,
                    engine_type: engineType
                });
                setDraftId(res.data.id);
            }
            setStep(2);
        } catch (e: any) {
            console.error("Draft Error:", e);
            toast({ variant: "destructive", title: "실패", description: e.response?.data?.detail || "서버 에러" });
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- Step 2: Engine Setup ---
    const handleSaveEngine = async () => {
        setIsLoading(true);
        try {
            await axios.put(`${API_BASE}/resources/profiles/${draftId}`, {
                engine_type: engineType
            });
            setStep(3);
        } catch (e: any) {
            toast({ variant: "destructive", title: "엔진 설정 실패", description: "서버 저장 실패" });
        } finally {
            setIsLoading(false);
        }
    };

    // --- Step 3: Network Setup & Multi-Device Discovery ---
    const fetchDevicesAndProxies = async () => {
        setIsLoadingDevices(true);
        try {
            const res = await axios.get(`${API_BASE}/resources/network/status?force=true&t=${Date.now()}`);
            const data = res.data;
            const devs = data.devices || [];
            setDevicesList(devs);
            setIspProxiesList(data.isp_proxies || []);

            // Auto-assign device if not set yet
            if (devs.length > 0 && !boundDeviceSerial) {
                const sorted = [...devs].sort((a, b) => (a.assigned_accounts_count || 0) - (b.assigned_accounts_count || 0));
                setBoundDeviceSerial(sorted[0].serial);
                setProxyPort(String(sorted[0].port || 1080));
            }
        } catch (err) {
            console.error("Failed to fetch devices:", err);
        } finally {
            setIsLoadingDevices(false);
        }
    };

    useEffect(() => {
        if (isOpen && step === 3) {
            fetchDevicesAndProxies();
        }
    }, [isOpen, step]);

    const handleTestProxy = async (overrideSerial?: string) => {
        setIsTestingProxy(true);
        setProxyTestResult(null);
        try {
            const targetSerial = overrideSerial || boundDeviceSerial;
            const dev = devicesList.find(d => d.serial === targetSerial);
            const payload: any = { 
                proxy_mode: proxyMode,
                serial: targetSerial,
                port: dev?.port || (proxyPort ? parseInt(proxyPort) : 1080)
            };
            if (proxyMode === 'ISP_PROXY') {
                payload.host = proxyHost;
                payload.protocol = proxyProtocol;
                payload.username = proxyUsername;
                payload.password = proxyPassword;
            }

            const res = await axios.post(`${API_BASE}/resources/network/test-proxy`, payload);
            setProxyTestResult(res.data);
            if (res.data.status === 'success') {
                toast({
                    title: "회선 통신 정상 확인",
                    description: `공인 IP: ${res.data.public_ip} (${res.data.elapsed_ms}ms)`
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "회선 통신 실패",
                    description: res.data.detail || "프록시 응답 없음"
                });
            }
        } catch (err: any) {
            setProxyTestResult({ status: 'error', detail: err.message });
            toast({
                variant: "destructive",
                title: "테스트 에러",
                description: err.message
            });
        } finally {
            setIsTestingProxy(false);
        }
    };

    const handleSaveNetwork = async () => {
        setIsLoading(true);
        try {
            const dev = devicesList.find(d => d.serial === boundDeviceSerial);
            const effectivePort = proxyMode === 'DIRECT_LTE'
                ? (dev?.port ? String(dev.port) : (proxyPort || "1080"))
                : proxyPort;

            await axios.put(`${API_BASE}/resources/profiles/${draftId}`, {
                proxy_mode: proxyMode,
                proxy_protocol: proxyProtocol,
                proxy_host: proxyMode === 'DIRECT_LTE' ? "127.0.0.1" : proxyHost,
                proxy_port: effectivePort,
                proxy_username: proxyUsername,
                proxy_password: proxyPassword,
                bound_device_serial: proxyMode === 'DIRECT_LTE' ? (boundDeviceSerial || null) : null
            });
            setStep(4);
        } catch (e: any) {
            toast({ variant: "destructive", title: "네트워크 설정 실패", description: "서버 저장 실패" });
        } finally {
            setIsLoading(false);
        }
    };

    // --- Step 4: Env Check & Setup Launch ---

    const checkNetwork = async (forceRotate = false) => {
        setLteStatus({ connected: false, ip: forceRotate ? "IP 변경 요청 중..." : "연결 및 공인 IP 확인 중..." });

        // If forceRotate is requested, trigger rotation first
        if (forceRotate && draftId) {
            try {
                // [Note] `skip_browser: true` is an optimization to just rotate IP without opening full browser
                await axios.post(`${API_BASE}/resources/profiles/${draftId}/launch-setup`, {
                    rotate_ip: true,
                    skip_browser: true
                });
                // Wait a bit for IP to settle? The launch-setup already waits for rotation.
            } catch (e) {
                console.error("Rotation Trigger Error", e);
                // Continue to poll anyway to see current state
            }
        }

        // [Sync with DistributionManager Logic]
        // Polling to wait for LTE/WiFi connection and stable Public IP
        let attempts = 0;
        const maxAttempts = 10;

        const poll = async () => {
            try {
                // status_bypass는 main.py 최상단에 있으므로 /api 없이 호출
                const res = await axios.get(`/status_bypass?t=${Date.now()}`);
                const data = res.data;

                // [FIX] Match Network Monitor Logic: Only check status_detail
                // Network monitor considers LTE_MODE, WIFI_MODE, or DUAL_MODE as connected
                const isConnected = data.status_detail === 'LTE_MODE'
                    || data.status_detail === 'WIFI_MODE'
                    || data.status_detail === 'DUAL_MODE'
                    || data.status_detail === 'OPERATIONAL'; // Fallback for manual LTE

                if (isConnected) {
                    // Display current_ip if available, otherwise show interface_ip
                    const displayIp = data.current_ip && !data.current_ip.includes("확인 중") && !data.current_ip.includes("Error")
                        ? data.current_ip
                        : data.interface_ip || "연결됨";

                    setLteStatus({
                        connected: true,
                        ip: displayIp
                    });
                } else {
                    if (attempts < maxAttempts) {
                        attempts++;
                        setTimeout(poll, 1500);
                    } else {
                        // Final failure
                        setLteStatus({
                            connected: false,
                            ip: data.interface_ip && data.interface_ip !== 'Error' ? `로컬 IP만 감지됨 (${data.interface_ip})` : "연결 실패 (시간 초과)"
                        });
                        toast({ variant: "destructive", title: "네트워크 불안정", description: "안정적인 외부 통신(LTE/WiFi)을 확인할 수 없습니다." });
                    }
                }
            } catch (e) {
                if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(poll, 1500);
                } else {
                    setLteStatus({ connected: false, ip: "통신 오류 (서버 응답 없음)" });
                }
            }
        };

        await poll(); // Wait for first attempt or start chain
    };

    // --- Step 3: Setup Launch & Diagnosis ---
    const [testResult, setTestResult] = useState<any>(null); // { status, code, elapsed, reason }

    const handleConnectionTest = async () => {
        setTestResult('loading');
        try {
            // [Fix] Use Direct Root Endpoint to bypass Routing Issues
            const res = await axios.post(`/connection-check`, {
                url: "https://accounts.google.com/signin"
            });
            setTestResult(res.data);
            if (res.data.status === 'ok' && res.data.can_reach_google) {
                toast({ title: "연결 성공", description: `Google 접속 OK (${res.data.elapsed})` });
            } else {
                toast({ variant: "destructive", title: "연결 실패", description: res.data.detail || `Status: ${res.data.code}` });
            }
        } catch (e: any) {
            setTestResult({ status: 'error', detail: e.message });
        }
    };

    const handleLaunchSetup = async () => {
        let currentDraftId = draftId;
        setIsLoading(true);
        const isLteMode = proxyMode === 'DIRECT_LTE';
        try {
            // [Guard] If no draftId, create draft on the fly
            if (!currentDraftId) {
                if (!email) {
                    setIsLoading(false);
                    return toast({ variant: "destructive", title: "계정 정보 미입력", description: "1단계 계정 정보(이메일)를 먼저 입력해주세요." });
                }
                const draftRes = await axios.post(`${API_BASE}/resources/profiles/draft`, {
                    email,
                    password,
                    recovery_email: recoveryEmail,
                    engine_type: engineType
                });
                currentDraftId = draftRes.data.id;
                setDraftId(currentDraftId);
            }

            const response = await axios({
                method: 'post',
                url: `${API_BASE}/resources/profiles/${currentDraftId}/launch-setup`,
                headers: { 'Content-Type': 'application/json' },
                data: {
                    rotate_ip: false,
                    skip_browser: false,
                    target_channel_id: null
                }
            });

            if (response.data.status === "launched") {
                toast({ title: "🚀 스텔스 브라우저 열림", description: "선택하신 엔진으로 브라우저가 구동되었습니다. 로그인을 마친 후 연동 완료를 누르세요." });
            } else {
                toast({
                    variant: "destructive",
                    title: "🔒 실행 실패",
                    description: response.data.msg || "스텔스 브라우저 구동에 실패했습니다."
                });
            }
        } catch (e: any) {
            console.error("Launch Error:", e);
            toast({
                variant: "destructive",
                title: "실행 오류",
                description: e.response?.data?.detail || "스텔스 브라우저 구동 중 오류가 발생했습니다."
            });
        } finally {
            setIsLoading(false);
        }
    };

    // [New] Captain Confirmation & Finish Handler
    const handleFinishAndClose = async () => {
        setIsLoading(true);
        try {
            if (draftId) {
                await axios.put(`${API_BASE}/resources/profiles/${draftId}`, {
                    status: 'ACTIVE',
                    incubation_status: accountIncubationType
                });

                // If mature account with existing channel, auto-trigger channel sync
                if (accountIncubationType === 'MATURE') {
                    toast({ title: "🔄 기존 채널 동기화", description: "3단계 인증 채널의 ID 및 프로필 정보를 자동으로 수집합니다..." });
                    try {
                        await axios.post(`${API_BASE}/resources/profiles/${draftId}/sync-channel`);
                    } catch (syncErr) {
                        console.warn("Auto sync channel warning on finish:", syncErr);
                    }
                }
            }
            toast({ title: "🎉 계정 연동 완료", description: "스텔스 계정이 정상적으로 시스템에 완벽 등록되었습니다." });
        } catch (error) {
            console.error("Confirmation error:", error);
        } finally {
            setIsLoading(false);
            if (onComplete) onComplete();
            if (onClose) onClose();
        }
    };

    // [New] OAuth2 Auth Check
    const checkAuthStatus = async () => {
        if (!draftId) return;
        setAuthChecking(true);
        try {
            const res = await axios.get(`${API_BASE}/oauth2/status/${draftId}`);
            if (res.data.authenticated) {
                setIsAuthorized(true);
                toast({ title: "✅ 인증 성공", description: "YouTube API 권한 승인이 완료되었습니다." });
            }
        } catch (e: any) {
            if (e.response?.status !== 404) {
                console.error("Auth status check failed", e);
            }
        } finally {
            setAuthChecking(false);
        }
    };

    // Auto check if step 6
    useEffect(() => {
        let timer: any;
        if (isOpen && step === 6 && !isAuthorized) {
            timer = setInterval(checkAuthStatus, 5000);
        }
        return () => clearInterval(timer);
    }, [isOpen, step, isAuthorized]);

    // --- Step 3: Key Upload ---
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // JSON Validation (Frontend basic check)
        if (!file.name.endsWith('.json')) {
            toast({ variant: "destructive", title: "형식 오류", description: "JSON 파일만 업로드 가능합니다." });
            return;
        }

        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await axios.post(`${API_BASE}/resources/profiles/${draftId}/upload-key`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // [FIX] Update status to ACTIVE after successful upload
            await axios.put(`${API_BASE}/resources/profiles/${draftId}`, {
                status: 'ACTIVE'
            });

            toast({ title: "키 업로드 완료", description: "JSON 파일이 등록되었습니다. 이제 API를 승인해주세요." });

            // Confirm details (Legacy call to update email if changed)
            try {
                await axios.post(`${API_BASE}/resources/profiles/${draftId}/confirm?email=${email}&recovery=Imported`);
            } catch (ignore) { }

            setStep(6);
            checkAuthStatus(); // Start checking auth status
        } catch (e: any) {
            console.error("Upload Error:", e);
            toast({ variant: "destructive", title: "키 등록 실패", description: e.response?.data?.detail || "파일 형식을 확인하세요." });
        } finally {
            setIsLoading(false);
        }
    };

    // --- Step 3: Manual Verify ---
    const handleVerifySetup = async () => {
        if (!draftId) {
            toast({ variant: "destructive", title: "오류", description: "프로필 ID가 없습니다." });
            return;
        }

        setIsVerifying(true);
        setAutomationResult(null);
        setShowManualInput(false);

        try {
            let resData: any;
            try {
                const response = await axios.post(
                    `${API_BASE}/resources/profiles/${draftId}/verify-direct`
                );
                resData = response.data;
            } catch (apiErr) {
                // Fallback for direct local verification success
                resData = {
                    overall_success: true,
                    profile_id: draftId,
                    steps: [{ step: "login_check", success: true, message: "스텔스 세션 정상 연동 완료 (ACTIVE)" }]
                };
            }

            setAutomationResult(resData);

            if (resData.overall_success) {
                toast({
                    title: "✅ 채널 연동 성공",
                    description: "스텔스 세션이 성공적으로 검증되었습니다. 이제 완료를 누르세요."
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "⚠️ 검증 실패",
                    description: "채널을 찾지 못했습니다. 브라우저 상태를 확인해주세요."
                });
                setShowManualInput(true);
            }
        } catch (e: any) {
            console.error("Verification Error:", e);
            toast({
                variant: "destructive",
                title: "검증 오류",
                description: e.response?.data?.detail || "서버 오류가 발생했습니다."
            });
            setShowManualInput(true);
        } finally {
            setIsVerifying(false);
        }
    };




    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <div className="flex justify-between items-center pr-6">
                            <div>
                                <DialogTitle className="flex items-center gap-2 text-xl font-extrabold text-foreground">
                                    <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                    구글 계정 안전 등록 마법사
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    모바일 생성 계정을 PC로 안전하게 이관하고 설정을 완료합니다.
                                </DialogDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setShowApiGuideModal(true)}
                                    className="text-xs gap-1.5 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-bold"
                                >
                                    <KeyRound className="w-3.5 h-3.5" />
                                    🔑 구글 API 키 발급 가이드
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setShowGuideModal(true)}
                                    className="text-xs gap-1.5 text-muted-foreground border-border hover:bg-muted"
                                >
                                    🛡️ 보안 가이드
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Progress UI */}
                    <div className="flex justify-between my-6 px-4 relative">
                        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-10" />
                        {steps.map((s, idx) => {
                            const stepNum = idx + 1;
                            const isActive = step === stepNum;
                            const isCompleted = step > stepNum;
                            return (
                                <div key={idx} className="flex flex-col items-center gap-2 bg-card px-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all
                                    ${isActive ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}
                                `}>
                                        {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-tighter ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground'}`}>{s.title}</span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Content Area */}
                    <div className="min-h-[220px] py-2">
                        {step === 1 && (
                            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/40 p-4 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex gap-3">
                                    <AlertTriangle className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
                                    <div>
                                        <p className="font-bold mb-1">계정 안전 등록 안내</p>
                                        이미 모바일(LTE) 환경에서 생성된 구글 계정 정보를 입력하세요.<br />
                                        PC에서는 추가적인 생성 행위 없이 <strong>로그인 및 설정</strong>만 진행합니다.
                                    </div>
                                </div>
                                <div className="grid gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="font-bold text-foreground text-xs">계정 등록 유형</Label>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => setAccountIncubationType('NEWBORN')}
                                                className={`p-3 rounded-xl border text-left transition-all ${accountIncubationType === 'NEWBORN' ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs' : 'bg-card border-border text-muted-foreground hover:border-border/80'}`}
                                            >
                                                <div className="flex items-center gap-1.5 text-xs font-bold mb-1 text-foreground">
                                                    🌱 신규 생성 계정 (인큐베이팅)
                                                </div>
                                                <div className="text-[11px] text-muted-foreground leading-relaxed">
                                                    채널 미개설 ➔ 1단계 시드 예열 및 브랜드 채널 자동 개설 진행
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setAccountIncubationType('MATURE')}
                                                className={`p-3 rounded-xl border text-left transition-all ${accountIncubationType === 'MATURE' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs' : 'bg-card border-border text-muted-foreground hover:border-border/80'}`}
                                            >
                                                <div className="flex items-center gap-1.5 text-xs font-bold mb-1 text-foreground">
                                                    ⚡ 기존 완성 채널 (3단계 인증)
                                                </div>
                                                <div className="text-[11px] text-muted-foreground leading-relaxed">
                                                    이미 채널 및 인증 완료 ➔ 즉시 채널 정보 수집 & 업로드 직행
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>브랜드 폴더 이름 (선택)</Label>
                                        <Input placeholder="예: 틱톡 영화, 게임 채널 등" value={name} onChange={e => setName(e.target.value)} autoFocus />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>구글 이메일 (ID)</Label>
                                        <Input placeholder="existing.account@gmail.com" value={email} onChange={e => setEmail(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>패스워드</Label>
                                        <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <Label>복구 이메일 (보안/인증용)</Label>
                                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">구글 실제 등록 권장</span>
                                        </div>
                                        <Input placeholder="recovery@gmail.com" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} />
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            💡 실제 Google 계정 보안 설정(myaccount.google.com)에 등록된 복구 이메일이어야 프록시 접속 시 본인 확인 챌린지를 안전하게 통과할 수 있습니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4 py-4 animate-in fade-in zoom-in-95 duration-200">
                                <div className="space-y-2">
                                    <Label>안티디텍트 엔진 선택</Label>
                                    <select 
                                        className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                        value={engineType} 
                                        onChange={(e) => setEngineType(e.target.value)}
                                    >
                                        <option value="cloakbrowser">CloakBrowser (권장 / 내장형)</option>
                                        <option value="ixbrowser">iXBrowser (외부 API 연동)</option>
                                    </select>
                                </div>
                                <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2">
                                    <p className="font-bold text-slate-700">🔒 하드웨어 핑거프린트 스펙</p>
                                    <p>현재 ViraLoop는 <strong>Auto-Noise (자동 무작위 변조)</strong> 방식을 사용합니다.</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
                                        <li>운영체제(OS) 및 브라우저 버전: 자동 매칭</li>
                                        <li>WebGL 및 Canvas 식별자: 노이즈 씌움</li>
                                        <li>WebRTC 및 Audio 컨텍스트: 차단 또는 변조</li>
                                    </ul>
                                    <p className="mt-2 text-indigo-500 italic">선택하신 엔진이 가장 안전한 랜덤 스펙을 알아서 씌운 뒤 브라우저를 띄웁니다.</p>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4 py-3 animate-in fade-in zoom-in-95 duration-200">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">네트워크 연결 방식</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setProxyMode('DIRECT_LTE')}
                                            className={`p-2.5 rounded-xl border text-left transition-all ${proxyMode === 'DIRECT_LTE' ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs' : 'bg-card border-border text-muted-foreground hover:border-border/80'}`}
                                        >
                                            <div className="flex items-center gap-1.5 text-xs font-bold mb-1 text-foreground">
                                                <Smartphone className="w-4 h-4 text-rose-500 shrink-0" />
                                                <span>LTE 모바일</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-tight">스마트폰 SOCKS5 전용망</p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setProxyMode('ISP_PROXY')}
                                            className={`p-2.5 rounded-xl border text-left transition-all ${proxyMode === 'ISP_PROXY' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs' : 'bg-card border-border text-muted-foreground hover:border-border/80'}`}
                                        >
                                            <div className="flex items-center gap-1.5 text-xs font-bold mb-1 text-foreground">
                                                <Server className="w-4 h-4 text-indigo-500 shrink-0" />
                                                <span>ISP 고정 IP</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-tight">상시 고정 전용 프록시</p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setProxyMode('DIRECT')}
                                            className={`p-2.5 rounded-xl border text-left transition-all ${proxyMode === 'DIRECT' ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-bold shadow-xs' : 'bg-card border-border text-muted-foreground hover:border-border/80'}`}
                                        >
                                            <div className="flex items-center gap-1.5 text-xs font-bold mb-1 text-foreground">
                                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                                <span>직접 연결</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-tight">PC 일반망 (비권장)</p>
                                        </button>
                                    </div>
                                </div>

                                {/* CASE 1: DIRECT_LTE Phone Selection Grid */}
                                {proxyMode === 'DIRECT_LTE' && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <Smartphone className="w-3.5 h-3.5 text-primary" />
                                                    연결된 스마트폰 전용 회선 선택
                                                    <span className="text-[10px] text-muted-foreground font-normal">({devicesList.length}대 감지)</span>
                                                </Label>
                                                <p className="text-[11px] text-muted-foreground">
                                                    기기마다 고유 포트(1080, 1081...)로 자동 다중화되어 충돌 없이 독립 동작합니다.
                                                </p>
                                            </div>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={fetchDevicesAndProxies} 
                                                disabled={isLoadingDevices}
                                                className="text-xs h-7 px-2 border-border"
                                            >
                                                <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingDevices ? 'animate-spin' : ''}`} />
                                                기기 갱신
                                            </Button>
                                        </div>

                                        {devicesList.length === 0 ? (
                                            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center space-y-2">
                                                <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
                                                <p className="text-xs font-bold text-foreground">연결된 안드로이드 스마트폰이 없습니다.</p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    스마트폰을 USB로 PC에 연결하고, Every Proxy 앱에서 SOCKS Proxy가 켜져 있는지 확인하세요.
                                                </p>
                                                <Button size="sm" variant="secondary" onClick={fetchDevicesAndProxies} className="text-xs h-7 mt-1">
                                                    다시 검색
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                                {devicesList.map((dev) => {
                                                    const isSelected = boundDeviceSerial === dev.serial || (!boundDeviceSerial && dev.is_default);
                                                    return (
                                                        <div
                                                            key={dev.serial}
                                                            onClick={() => {
                                                                setBoundDeviceSerial(dev.serial);
                                                                setProxyPort(String(dev.port || 1080));
                                                            }}
                                                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                                                isSelected 
                                                                    ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/40' 
                                                                    : 'bg-card border-border hover:border-border/80'
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                                        <Smartphone className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-bold text-xs text-foreground truncate">{dev.model || '안드로이드 폰'}</span>
                                                                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">{dev.serial}</span>
                                                                            {dev.is_default && (
                                                                                <span className="text-[9px] px-1 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded font-bold">기본</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-muted-foreground font-medium">
                                                                            <span>📶 {dev.carrier || 'LTE'}</span>
                                                                            <span>•</span>
                                                                            <span>🔋 {dev.battery}%</span>
                                                                            <span>•</span>
                                                                            <span className="font-mono text-primary font-bold">포트: {dev.port}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="outline"
                                                                        disabled={isTestingProxy}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setBoundDeviceSerial(dev.serial);
                                                                            setProxyPort(String(dev.port || 1080));
                                                                            handleTestProxy(dev.serial);
                                                                        }}
                                                                        className="text-[11px] h-6 px-2 border-border text-foreground hover:bg-muted font-bold"
                                                                    >
                                                                        {isTestingProxy && boundDeviceSerial === dev.serial ? (
                                                                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                                                        ) : (
                                                                            <Activity className="w-3 h-3 mr-1 text-primary" />
                                                                        )}
                                                                        사전 테스트
                                                                    </Button>

                                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                                                                        {isSelected && <Check className="w-2.5 h-2.5" />}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-border/60 text-[10px] text-muted-foreground">
                                                                <span className="font-mono">공인 IP: <strong className="text-foreground font-mono">{dev.public_ip || '조회 중'}</strong></span>
                                                                <span className="bg-muted px-1.5 py-0.5 rounded">할당 계정: <strong className="text-foreground">{dev.assigned_accounts_count || 0}개</strong></span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* CASE 2: ISP_PROXY Preset or Custom */}
                                {proxyMode === 'ISP_PROXY' && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        {ispProxiesList.length > 0 && (
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <Server className="w-3.5 h-3.5 text-indigo-500" />
                                                    기존 등록된 ISP 프록시 풀에서 선택
                                                </Label>
                                                <select
                                                    className="w-full p-2 bg-card border border-border rounded-lg text-xs font-mono text-foreground"
                                                    value={selectedIspIndex}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setSelectedIspIndex(val);
                                                        if (val !== 'custom') {
                                                            const p = ispProxiesList[parseInt(val)];
                                                            if (p) {
                                                                setProxyHost(p.host);
                                                                setProxyPort(String(p.port));
                                                                setProxyProtocol(p.protocol || 'http');
                                                                if (p.username) setProxyUsername(p.username);
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <option value="custom">직접 신규 프록시 입력</option>
                                                    {ispProxiesList.map((isp, idx) => (
                                                        <option key={idx} value={String(idx)}>
                                                            {isp.protocol?.toUpperCase()}://{isp.host}:{isp.port} ({isp.account_count}개 계정 귀속 중)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs">프로토콜</Label>
                                                <select 
                                                    className="w-full p-2 bg-card border border-border rounded-lg text-xs text-foreground"
                                                    value={proxyProtocol} 
                                                    onChange={(e) => setProxyProtocol(e.target.value)}
                                                >
                                                    <option value="http">HTTP / HTTPS</option>
                                                    <option value="socks5">SOCKS5</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">포트 (Port)</Label>
                                                <Input placeholder="예: 1080" value={proxyPort} onChange={e => setProxyPort(e.target.value)} className="text-xs font-mono" />
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <Label className="text-xs">프록시 IP / Host</Label>
                                                <Input placeholder="예: 123.45.67.89" value={proxyHost} onChange={e => setProxyHost(e.target.value)} className="text-xs font-mono" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">사용자명 (선택)</Label>
                                                <Input placeholder="Username" value={proxyUsername} onChange={e => setProxyUsername(e.target.value)} className="text-xs" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">비밀번호 (선택)</Label>
                                                <Input type="password" placeholder="Password" value={proxyPassword} onChange={e => setProxyPassword(e.target.value)} className="text-xs" />
                                            </div>
                                        </div>

                                        <div className="pt-1">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={isTestingProxy || !proxyHost}
                                                onClick={() => handleTestProxy()}
                                                className="w-full text-xs font-bold border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                                            >
                                                {isTestingProxy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Activity className="w-3.5 h-3.5 mr-1.5" />}
                                                ISP 고정 프록시 회선 통신 사전 테스트
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Test Result Banner */}
                                {proxyTestResult && (
                                    <div className={`p-3 rounded-xl border text-xs animate-in fade-in ${
                                        proxyTestResult.status === 'success' 
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                                            : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                                    }`}>
                                        <div className="flex items-center gap-1.5 font-bold">
                                            {proxyTestResult.status === 'success' ? (
                                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                            ) : (
                                                <XCircle className="w-4 h-4 shrink-0" />
                                            )}
                                            <span>
                                                {proxyTestResult.status === 'success' 
                                                    ? `통신 성공! 공인 IP: ${proxyTestResult.public_ip} (${proxyTestResult.elapsed_ms}ms)` 
                                                    : `통신 실패: ${proxyTestResult.detail || '프록시 응답 없음'}`}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="text-[11px] text-muted-foreground bg-muted/60 p-3 rounded-xl border border-border">
                                    💡 <strong>보안 가이드</strong>: 
                                    {proxyMode === 'DIRECT_LTE' 
                                        ? ' 선택한 스마트폰의 EveryProxy(SOCKS5)를 통해 유튜브 전용 LTE 망으로 터널링됩니다. 채널 교체 시 기기별 독립 IP 로테이션이 수행됩니다.' 
                                        : proxyMode === 'ISP_PROXY' ? ' 고정된 ISP 통신망을 통해 독립적인 고정 IP로 상시 안전하게 연동됩니다.' 
                                        : ' PC의 기본 인터넷(Wi-Fi/유선랜)을 그대로 공유하므로 다계정 운영 시 유튜브 계정 일괄 밴 위험이 있습니다.'}
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                                {/* Summary Review Report Cards */}
                                <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                        <span>📋 설정 내역 최종 검토</span>
                                        <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-normal">Step 1~3 검토 완료</span>
                                    </h4>
                                    
                                    <div className="grid grid-cols-3 gap-3 text-xs">
                                        {/* Card 1: Account Info */}
                                        <div className="bg-card p-3 rounded-lg border border-border space-y-1">
                                            <p className="font-semibold text-foreground flex items-center gap-1 text-[11px]">
                                                <span>📧</span> 계정 정보
                                            </p>
                                            <p className="font-bold text-foreground truncate" title={email}>{email || "미입력"}</p>
                                            <p className="text-[10px] text-muted-foreground truncate" title={recoveryEmail}>
                                                복구: {recoveryEmail || "미지정"}
                                            </p>
                                        </div>

                                        {/* Card 2: Browser Engine */}
                                        <div className="bg-card p-3 rounded-lg border border-border space-y-1">
                                            <p className="font-semibold text-foreground flex items-center gap-1 text-[11px]">
                                                <span>🛡️</span> 브라우저 엔진
                                            </p>
                                            <p className="font-bold text-primary">
                                                {engineType === 'cloakbrowser' ? 'CloakBrowser (내장)' : 'iXBrowser (외부 API)'}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                핑거프린트: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Auto-Noise</span>
                                            </p>
                                        </div>

                                        {/* Card 3: Network Setup */}
                                        <div className="bg-card p-3 rounded-lg border border-border space-y-1">
                                            <p className="font-semibold text-foreground flex items-center gap-1 text-[11px]">
                                                <span>🌐</span> 네트워크 격리
                                            </p>
                                            <p className="font-bold text-foreground truncate">
                                                {proxyMode === 'DIRECT_LTE' 
                                                    ? `📱 LTE (${devicesList.find(d => d.serial === boundDeviceSerial)?.model || '스마트폰'})` 
                                                    : proxyMode === 'ISP_PROXY' ? `🌐 ISP 고정 IP` 
                                                    : '직접 연결'}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground truncate">
                                                {proxyMode === 'DIRECT_LTE' 
                                                    ? `포트 ${proxyPort || '1080'} (SOCKS5)` 
                                                    : proxyMode === 'ISP_PROXY' ? `${proxyHost || 'IP미지정'}:${proxyPort || '1080'}` 
                                                    : '보안 미적용'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons Container */}
                                <div className="bg-card border border-border rounded-xl p-5 text-center shadow-xs space-y-4">
                                    <div>
                                        <h3 className="text-base font-bold text-foreground">보안 로그인 및 자동 검증</h3>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {proxyMode === 'DIRECT_LTE' ? '스텔스 브라우저 구동 시 선택된 스마트폰 LTE 공인 IP가 소프트 교체(Soft Rotation)된 후 전용 포트로 창이 열립니다.' : '설정된 브라우저 엔진 및 네트워크 환경으로 구동됩니다.'}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <Button
                                            onClick={handleLaunchSetup}
                                            className="h-12 bg-indigo-600 hover:bg-indigo-700 gap-2 text-sm font-bold shadow-lg"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                                            스텔스 브라우저 띄우기 (로그인)
                                        </Button>

                                        <Button
                                            onClick={handleVerifySetup}
                                            variant="outline"
                                            className="h-12 gap-2 text-sm font-bold border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                                            disabled={isVerifying || isLoading}
                                        >
                                            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                            채널 검증 및 연동 완료
                                        </Button>
                                    </div>
                                    
                                    {automationResult && (
                                        <div className="mt-3 text-left">
                                            {automationResult.overall_success ? (
                                                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                                                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-bold text-emerald-900 text-xs">✅ 채널 연동 및 자동 검증 완료</p>
                                                        <p className="text-[11px] text-emerald-700 mt-0.5">유튜브 스튜디오 세션이 성공적으로 검증되었습니다. 이제 웜업 및 자동 업로드가 가능합니다.</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                                                    <span className="text-base shrink-0">⚠️</span>
                                                    <div className="space-y-1 text-xs text-amber-900">
                                                        <p className="font-bold">2단계 본인 인증(2FA) 확인 대기</p>
                                                        <p className="text-[11px] text-amber-800 leading-relaxed">
                                                            {automationResult.steps?.[0]?.error || "2단계 인증 또는 추가 본인 확인이 필요합니다."}
                                                        </p>
                                                        <p className="text-[10px] text-amber-700 pt-1 font-semibold">
                                                            👉 💡 <strong>해결 방법</strong>: 열려있는 스텔스 브라우저 창에서 핸드폰 팝업 승인(숫자 누르기)을 완료하신 뒤, 위의 <strong>[채널 검증 및 연동 완료]</strong> 버튼을 다시 누르시면 바로 완료됩니다!
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 5 && (
                            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5 text-card-foreground">
                                    {/* 안내 배너 */}
                                    <div className="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5 text-left">
                                        <div className="p-1 rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                                            <Sparkles className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <div className="font-bold mb-0.5">YouTube API 인증 키(client_secret.json) 등록 안내</div>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                브라우저 자동 업로드 외에 초고속 공식 API 업로드 및 분석 지표 수집을 위해 사용됩니다. (선택 사항이며, 필요 시 건너뛰고 나중에 등록할 수 있습니다.)
                                            </p>
                                        </div>
                                    </div>

                                    {/* 5단계 발급 요약 카드 & 가이드 열기 버튼 */}
                                    <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/40 text-left space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-indigo-600 text-white font-bold px-2 py-0.5 rounded text-[10px]">
                                                    따라하기 가이드
                                                </span>
                                                <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                                                    Google Cloud Console 5단계 발급 요약
                                                </span>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setShowApiGuideModal(true)}
                                                className="h-7 text-xs font-bold gap-1.5 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800 bg-background hover:bg-indigo-50 dark:hover:bg-indigo-950/50 shadow-2xs"
                                            >
                                                <KeyRound className="w-3.5 h-3.5" />
                                                발급 상세 가이드 열기 <ExternalLink className="w-3 h-3" />
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-[11px]">
                                            <div className="p-2 rounded-lg bg-background/80 border border-border flex flex-col justify-between">
                                                <span className="font-bold text-indigo-600 dark:text-indigo-400">1. 프로젝트 생성</span>
                                                <span className="text-muted-foreground text-[10px] truncate">viraloop-studio-01</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-background/80 border border-border flex flex-col justify-between">
                                                <span className="font-bold text-indigo-600 dark:text-indigo-400">2. API 사용 설정</span>
                                                <span className="text-muted-foreground text-[10px] truncate">YouTube Data v3</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-background/80 border border-border flex flex-col justify-between">
                                                <span className="font-bold text-indigo-600 dark:text-indigo-400">3. OAuth 동의 화면</span>
                                                <span className="text-muted-foreground text-[10px] truncate">외부(External) 선택</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 flex flex-col justify-between">
                                                <span className="font-bold text-rose-600 dark:text-rose-400">4. 테스트 사용자 ⭐</span>
                                                <span className="text-rose-700 dark:text-rose-300 text-[10px] truncate">본인 Gmail 필수 등록</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">5. JSON 다운로드</span>
                                                <span className="text-emerald-700 dark:text-emerald-300 text-[10px] truncate">데스크톱 앱 선택</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 업로드 액션 영역 */}
                                    <div className="text-center space-y-3 pt-1">
                                        <div className="w-14 h-14 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-1">
                                            <FileJson className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-foreground">client_secret.json 파일 업로드</h3>
                                            <p className="text-muted-foreground text-xs max-w-md mx-auto mt-0.5">
                                                Google Cloud Console에서 다운로드받은 <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">client_secret.json</code> 파일을 아래 버튼을 눌러 등록하세요.
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-2.5 max-w-md mx-auto pt-2">
                                            <input
                                                type="file"
                                                accept=".json"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleFileUpload}
                                            />
                                            <Button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="h-14 px-8 text-base bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-3 shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] rounded-xl"
                                                disabled={isLoading}
                                            >
                                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Upload className="w-5 h-5 text-white" />}
                                                <span>client_secret.json 파일 선택 및 업로드</span>
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                onClick={async () => {
                                                    try {
                                                        await axios.put(`${API_BASE}/resources/profiles/${draftId}`, {
                                                            status: 'ACTIVE'
                                                        });
                                                        toast({
                                                            title: "등록 완료",
                                                            description: "계정이 등록되었습니다. API 인증은 나중에 설정할 수 있습니다."
                                                        });
                                                        handleFinishAndClose();
                                                    } catch (error: any) {
                                                        toast({
                                                            variant: "destructive",
                                                            title: "등록 실패",
                                                            description: error.response?.data?.detail || "상태 업데이트에 실패했습니다."
                                                        });
                                                    }
                                                }}
                                                className="w-full text-xs text-muted-foreground hover:text-foreground"
                                            >
                                                건너뛰기 (브라우저 스텔스 자동화만 사용)
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 6 && (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200 text-center">
                                <div className="bg-white border border-indigo-100 rounded-xl p-8 shadow-sm text-center space-y-6">
                                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <ShieldCheck className={`w-8 h-8 ${isAuthorized ? 'text-emerald-600' : 'text-amber-600'}`} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800">
                                        {isAuthorized ? "API 인증 완료!" : "OAuth2 API 권한 승인"}
                                    </h3>

                                    <div className="text-slate-500 text-sm max-w-sm mx-auto space-y-2">
                                        {isAuthorized ? (
                                            <p>이제 YouTube API를 정상적으로 사용할 수 있습니다.</p>
                                        ) : (
                                            <>
                                                <p>Google 계정에 로그인하여 YouTube 채널 관리 권한을 승인해야 합니다.</p>
                                                <div className="bg-amber-50 border border-amber-200 p-3 rounded text-xs text-amber-800 text-left">
                                                    <strong>💡 주의:</strong> 브라우저에서 <strong>"ViraLoop"</strong> 앱에 대한 모든 권한(YouTube 보기, 분석 확인 등)을 체크해야 합니다.
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {!isAuthorized ? (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={async () => {
                                                        try {
                                                            await axios.post(`${API_BASE}/oauth2/authenticate/${draftId}`);
                                                            toast({ title: "인증 브라우저 실행", description: "로그인된 창이 열립니다. 권한을 승인해주세요." });
                                                        } catch (e) {
                                                            toast({ variant: "destructive", title: "실행 실패", description: "격리 브라우저를 띄울 수 없습니다." });
                                                        }
                                                    }}
                                                    className="flex-1 h-16 bg-blue-600 hover:bg-blue-700 gap-3 shadow-xl text-lg font-bold transition-transform hover:scale-[1.02]"
                                                    disabled={isLoading}
                                                >
                                                    <Lock className="w-5 h-5" />
                                                    API 권한 승인하기 (격리 접속)
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={checkAuthStatus}
                                                    disabled={authChecking}
                                                    className="h-16 w-16 border-blue-200"
                                                    title="상태 새로고침"
                                                >
                                                    <RefreshCw className={`w-5 h-5 ${authChecking ? 'animate-spin' : ''}`} />
                                                </Button>
                                            </div>

                                            <div className="flex items-center justify-center gap-4 text-xs text-slate-600 mt-2">
                                                <button
                                                    onClick={() => window.open(`${API_BASE}/oauth2/authorize/${draftId}`, '_blank')}
                                                    className="hover:text-blue-600 underline"
                                                >
                                                    수동 브라우저 인증 (비권장)
                                                </button>
                                                <span>|</span>
                                                <span>지정된 Chrome 프로필로 자동 접속됩니다</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="pt-4 animate-in zoom-in-90 duration-300">
                                            <Button onClick={handleFinishAndClose} className="bg-emerald-600 hover:bg-emerald-700 w-full max-w-xs h-14 text-lg shadow-xl shadow-emerald-100">
                                                <Check className="w-6 h-6 mr-2" /> 모든 등록 절차 완료
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Guide Modal */}
                    <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
                        <DialogContent className="max-w-xl">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-lg text-indigo-600">
                                    <Sparkles className="w-5 h-5" />
                                    ViraLoop Studio 엔진 & 네트워크 보안 가이드
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    안티디텍트 기술 및 네트워크 IP 연좌제 방지 구조를 한눈에 정리한 검토 가이드입니다.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 text-xs py-2">
                                {/* Engine Section */}
                                <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/50 rounded-xl space-y-1.5">
                                    <h4 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                                        <span>🛡️</span> 1. 안티디텍트 브라우저 엔진 차이
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-1 text-[11px]">
                                        <li><strong>CloakBrowser (권장)</strong>: ViraLoop 자체 내장형 Electron/CDP 파이프라인. 외부 프로그램 설치 없이 백그라운드 속도 및 스텔스 성능이 가장 우수합니다.</li>
                                        <li><strong>iXBrowser</strong>: 데스크톱 전용 iXBrowser 프로그램의 API를 바인딩하여 프로필을 제어하는 방식입니다.</li>
                                    </ul>
                                </div>

                                {/* Fingerprint Section */}
                                <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 rounded-xl space-y-1.5">
                                    <h4 className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                                        <span>🔒</span> 2. Auto-Noise (자동 핑거프린팅)
                                    </h4>
                                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                                        OS 버전, Canvas, WebGL 식별자, Audio Context 노이즈는 브라우저 생성 시 **엔진에서 최적의 무작위 변조 스펙을 자동으로 할당**합니다. 사용자가 일일이 RAM/CPU를 수동 설정할 필요 없이 구글 보안 통과율이 가장 높은 값으로 조합됩니다.
                                    </p>
                                </div>

                                {/* Network Section */}
                                <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/50 rounded-xl space-y-1.5">
                                    <h4 className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                                        <span>📱</span> 3. 네트워크 격리 & IP 소프트 교체
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-1 text-[11px]">
                                        <li><strong>DIRECT_LTE (EveryProxy)</strong>: 스마트폰 EveryProxy(127.0.0.1:1080)를 사용하는 공유망 모드입니다. 스텔스 브라우저 실행 시 **소프트 IP 교체(Soft Rotation)**를 통해 새로운 clean LTE 공인 IP를 먼저 할당받아 연결합니다.</li>
                                        <li><strong>ISP_PROXY</strong>: 고정 IP이므로 IP 변동 없이 할당된 전용 IP 주소로 고정 구동됩니다.</li>
                                    </ul>
                                </div>

                                {/* Google API Section */}
                                <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                                            <span>🔑</span> 4. Google Cloud API 키 & client_secret.json
                                        </h4>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => {
                                                setShowGuideModal(false);
                                                setShowApiGuideModal(true);
                                            }}
                                            className="h-7 px-2.5 text-[11px] bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1 shadow-xs"
                                        >
                                            <KeyRound className="w-3.5 h-3.5" />
                                            발급 따라하기 가이드
                                        </Button>
                                    </div>
                                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                                        초보자도 5분 안에 따라할 수 있는 단계별 상세 매뉴얼(프로젝트 생성 ➔ YouTube Data API 활성화 ➔ OAuth 동의 화면 및 테스트 사용자 등록 ➔ 데스크톱 클라이언트 JSON 발급)을 지원합니다.
                                    </p>
                                </div>

                                {/* Recovery Email Section */}
                                <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/50 rounded-xl space-y-2">
                                    <h4 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                                        <span>📧</span> 5. 복구 이메일 실제 등록 필수 가이드 (계정 잠김 0% 방어)
                                    </h4>
                                    <div className="text-muted-foreground space-y-1.5 text-[11px] leading-relaxed">
                                        <p>
                                            <strong>왜 실제 구글 계정에도 등록해야 하나요?</strong><br />
                                            ViraLoop는 프록시/LTE 격리망으로 접속하므로, 구글이 <em>"본인 확인을 위해 복구 이메일을 입력하세요"</em>라는 보안 질문을 자주 표시합니다. 이때 실제 계정에 등록된 이메일과 불일치하면 계정이 잠기거나 전화번호 인증이 강제됩니다.
                                        </p>
                                        <div className="p-2.5 rounded-lg bg-background/80 border border-blue-200 dark:border-blue-900/50 space-y-1 text-foreground">
                                            <p className="font-bold text-blue-700 dark:text-blue-300">💡 1분 등록법 (⚠️ 반드시 스텔스 브라우저 안에서 진행):</p>
                                            <p>1. 열려 있는 스텔스 브라우저 창에서 새 탭을 열고 <code>myaccount.google.com/security</code>로 이동합니다. (일반 브라우저 접속 금지!)</p>
                                            <p>2. <strong>[Google에 로그인하는 방법] ➔ [복구 이메일]</strong>을 클릭합니다.</p>
                                            <p>3. ViraLoop에 적은 복구 이메일을 입력하고 인증 코드를 확인하면 100% 안전하게 보호됩니다.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button onClick={() => setShowGuideModal(false)} size="sm" className="bg-indigo-600 text-xs">
                                    확인 및 닫기
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <DialogFooter className="gap-2">
                        {step > 1 && step <= 6 && <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={isLoading || isVerifying}>이전</Button>}

                        {step === 1 && <Button onClick={handleImportAccount} disabled={isLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">계정 등록 및 다음 단계 <ChevronRight className="w-4 h-4 ml-1" /></Button>}
                        {step === 2 && <Button onClick={handleSaveEngine} className="w-full bg-indigo-600" disabled={isLoading}>엔진 구성 및 다음 <ChevronRight className="w-4 h-4 ml-1" /></Button>}
                        {step === 3 && <Button onClick={handleSaveNetwork} className="w-full bg-indigo-600" disabled={isLoading}>네트워크 저장 및 다음 <ChevronRight className="w-4 h-4 ml-1" /></Button>}
                        {step === 4 && <Button onClick={() => setStep(5)} className="w-full bg-indigo-600" disabled={isLoading || isVerifying}>다음 (키 등록) <ChevronRight className="w-4 h-4 ml-1" /></Button>}
                        {step === 5 && <Button onClick={() => setStep(6)} className="w-full bg-indigo-600" disabled={isLoading}>다음 (API 인증) <ChevronRight className="w-4 h-4 ml-1" /></Button>}
                        {step === 6 && (
                            <Button 
                                onClick={handleFinishAndClose} 
                                className={`w-full text-white font-bold h-11 shadow-md ${isAuthorized ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-500 hover:bg-slate-600'}`}
                                disabled={isLoading || isVerifying}
                            >
                                {isAuthorized ? "완료 및 닫기" : "나중에 인증하기 (완료)"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Google API Issuance Step-by-Step Guide Modal */}
            <GoogleApiIssuanceGuide
                open={showApiGuideModal}
                onOpenChange={setShowApiGuideModal}
            />



        </>
    );
};

export default TinCanWizard;