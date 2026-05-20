import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
// @ts-ignore
import { useModalVisibility } from '@/features/flow2capcut/hooks/useModalVisibility';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronRight, ShieldCheck, AlertTriangle, Smartphone, Loader2, Wifi, RefreshCw, Upload, FileJson, Sparkles, ChevronLeft, ExternalLink, Copy, Lock, Activity } from 'lucide-react';
import GoogleAuthGuide from '../GoogleAuthGuide';
import { useToast } from "@/components/ui/use-toast";
import axios from 'axios';
import AIModelSelector from '../shared/AIModelSelector';

// 백엔드 주소 강제 고정 (프록시 꼬임 방지)
const API_BASE = "/api";

interface TinCanWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    initialData?: any;
    accountType?: 'TIN_CAN' | 'CAPTAIN';
}

const TIN_CAN_STEPS = [
    { title: "계정 가져오기", desc: "모바일 계정 입력" },
    { title: "환경 점검", desc: "LTE 연결 확인" },
    { title: "설정 및 위임", desc: "브랜드 채널 & API" },
    { title: "키 등록", desc: "JSON 업로드" },
    { title: "API 인증", desc: "OAuth2 권한 승인" }
];

const CAPTAIN_STEPS = [
    { title: "계정 가져오기", desc: "관리자 이메일" },
    { title: "보안 점검", desc: "IP 세탁 및 접속" },
    { title: "프로필 생성", desc: "브라우저 로그인" },
    { title: "키 등록", desc: "JSON 업로드" },
    { title: "API 인증", desc: "OAuth2 권한 승인" }
];

const TinCanWizard: React.FC<TinCanWizardProps> = ({ isOpen, onClose, onComplete, initialData, accountType = 'TIN_CAN' }) => {
    // @ts-ignore
    useModalVisibility(isOpen);
    const { toast } = useToast();
    const [step, setStep] = useState(1);

    // Dynamic access to steps
    const steps = accountType === 'CAPTAIN' ? CAPTAIN_STEPS : TIN_CAN_STEPS;

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Data State
    const [draftId, setDraftId] = useState<string>("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState(""); // Optional, for record keeping
    const [lteStatus, setLteStatus] = useState<{ connected: boolean, ip: string }>({ connected: false, ip: "확인 전" });

    // Automation State (Manual Verify Mode)
    const [automationResult, setAutomationResult] = useState<any>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [showManualInput, setShowManualInput] = useState(false);
    // Unused but kept for type safety if needed (or removed):
    const [brandName, setBrandName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");

    // [NEW] Captain Session Reuse State
    const [captains, setCaptains] = useState<any[]>([]);
    const [selectedCaptain, setSelectedCaptain] = useState("");

    const [setupProgress, setSetupProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState("");
    const [loginRequired, setLoginRequired] = useState(false);

    // Auth State
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [authChecking, setAuthChecking] = useState(false);

    // AI Suggestion State
    const [showAISuggestion, setShowAISuggestion] = useState(false);
    const [aiKeywords, setAiKeywords] = useState("");
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [allGeneratedNames, setAllGeneratedNames] = useState<string[]>([]); // Track all names
    const [allowKorean, setAllowKorean] = useState(true); // Default: Korean
    const [allowEnglish, setAllowEnglish] = useState(false); // Default: NOT English
    const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    // Debug Log State
    const [debugLog, setDebugLog] = useState<string>("");

    // UI State
    const [isLoading, setIsLoading] = useState(false);

    // [Resume Logic] Hydrate from initialData
    useEffect(() => {
        if (isOpen && initialData) {
            setDraftId(initialData.id || "");
            setEmail(initialData.email || "");
            setPassword(initialData.password || "");

            // Auto-advance if we have an ID
            if (initialData.id) {
                setStep(2);
                checkNetwork(); // Pre-check network if resuming
            }
        } else if (isOpen && !initialData) {
            // Reset if fresh open
            setStep(1);
            setDraftId("");
            setEmail("");
            setPassword("");
            setLteStatus({ connected: false, ip: "확인 전" });
        }
    }, [isOpen, initialData]);

    // --- Step 1: Import (Draft) ---
    const handleImportAccount = async () => {
        if (!email) return toast({ variant: "destructive", title: "이메일 누락", description: "이메일을 입력해주세요." });

        setIsLoading(true);
        try {
            if (draftId) {
                // [Update Mode] If ID exists (Resume or Retry)
                await axios.put(`${API_BASE}/resources/profiles/${draftId}`, {
                    email,
                    password,
                    status: 'draft'
                });
                toast({ title: "정보 업데이트", description: "입력한 정보로 갱신되었습니다." });
            } else {
                // [Create Mode]
                // Pass email in body to fail fast if duplicate (prevents ghost draft creation)
                const res = await axios.post(`${API_BASE}/resources/profiles/draft?type=${accountType}`, {
                    email,
                    password
                });
                setDraftId(res.data.id);
            }

            setStep(2);
            await checkNetwork();
        } catch (e: any) {
            console.error("Draft Error:", e);
            if (e.response?.status === 409) {
                toast({ variant: "destructive", title: "중복된 이메일", description: "이미 등록된 이메일 주소입니다. 다른 이메일을 사용하거나 기존 프로필을 확인하세요." });
            } else {
                toast({ variant: "destructive", title: "계정 가져오기 실패", description: e.response?.data?.detail || "서버 연결을 확인하세요." });
            }
        } finally {
            setIsLoading(false);
        }
    };

    // --- Step 2: Env Check ---

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
        setIsLoading(true);
        try {
            // [API 변경] launch-creation -> launch-setup
            const response = await axios({
                method: 'post',
                url: `${API_BASE}/resources/profiles/${draftId}/launch-setup`,
                headers: { 'Content-Type': 'application/json' },
                data: {
                    rotate_ip: false,
                    skip_browser: false,
                    target_channel_id: null
                }
            });

            if (response.data.status === "launched") {
                // setStep(4); <-- REMOVED: Do not auto advance
                toast({ title: "설정 브라우저 열림", description: "로그인 및 키 발급을 진행하세요." });
            } else {
                toast({
                    variant: "destructive",
                    title: "🔒 보안 경고",
                    description: "LTE 연결 불안정! IP가 노출될 위험이 있어 실행을 중단했습니다."
                });
            }
        } catch (e: any) {
            console.error("Launch Error:", e);
            toast({
                variant: "destructive",
                title: "실행 중단",
                description: "LTE 연결 불안정! IP가 노출될 위험이 있어 실행을 중단했습니다."
            });
        } finally {
            setIsLoading(false);
        }
    };

    // [New] Captain Confirmation Handler
    const handleConfirmCaptain = async () => {
        if (!draftId) return;
        setIsLoading(true);
        try {
            // Already ACTIVE from previous steps, but ensure status is correct
            await axios.put(`${API_BASE}/resources/profiles/${draftId}`, {
                status: 'ACTIVE'
            });

            toast({ title: "등록 완료", description: "계정이 시스템에 완벽하게 등록되었습니다." });
            onComplete();
            onClose();
        } catch (error) {
            console.error("Confirmation failed:", error);
            toast({ variant: "destructive", title: "오류", description: "최종 등록 처리 중 오류가 발생했습니다." });
        } finally {
            setIsLoading(false);
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
        } catch (e) {
            console.error("Auth status check failed", e);
        } finally {
            setAuthChecking(false);
        }
    };

    // Auto check if step 5
    useEffect(() => {
        let timer: any;
        if (step === 5 && !isAuthorized) {
            timer = setInterval(checkAuthStatus, 5000);
        }
        return () => clearInterval(timer);
    }, [step, isAuthorized]);

    // [NEW] Captain Session Reuse Handlers
    const loadCaptains = async () => {
        try {
            const response = await axios.get(`${API_BASE}/resources/profiles?type=CAPTAIN&status=ACTIVE`);
            setCaptains(response.data || []);
        } catch (error) {
            console.error("Failed to load captains:", error);
            toast({ variant: "destructive", title: "오류", description: "관리자 계정 목록을 불러올 수 없습니다." });
        }
    };

    const handleSetupFromCaptain = async () => {
        if (!selectedCaptain) {
            toast({ variant: "destructive", title: "선택 필요", description: "관리자 계정을 선택하세요." });
            return;
        }

        setIsLoading(true);
        setSetupProgress(0);
        setProgressMessage("프로필 복사 중...");

        try {
            setSetupProgress(30);
            const response = await axios.post(
                `${API_BASE}/youtube/resources/profiles/${draftId}/setup-from-captain`,
                { captain_id: selectedCaptain, launch_browser: true }
            );

            setSetupProgress(100);
            setProgressMessage("완료!");

            if (response.data.login_required) {
                setLoginRequired(true);
                toast({ title: "로그인 필요", description: response.data.message });
            } else {
                toast({ title: "성공", description: "Captain 세션이 복사되었습니다." });
            }
        } catch (error: any) {
            console.error("Setup from captain failed:", error);
            toast({ variant: "destructive", title: "오류", description: error.response?.data?.detail || "프로필 복사에 실패했습니다." });
        } finally {
            setIsLoading(false);
        }
    };



    // Load captains when step 3 is reached
    useEffect(() => {
        if (step === 3 && accountType === 'TIN_CAN') {
            loadCaptains();
        }
    }, [step, accountType]);

    // --- Step 4: Key Upload ---
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

            setStep(5);
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
            // Call execute with verify_only=true (handled implicitly by backend config)
            const response = await axios.post(
                `${API_BASE}/resources/profiles/${draftId}/automation/execute`,
                null,
                {
                    params: {
                        auto_create_channel: false,
                        auto_delegate_admin: false,
                        skip_login: true,
                        verify_only: true
                    }
                }
            );

            setAutomationResult(response.data);

            if (response.data.overall_success) {
                toast({
                    title: "✅ 검증 성공",
                    description: "채널 정보를 확인했습니다. 다음 단계로 진행하세요."
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

    // --- AI Brand Name Suggestion ---
    const handleGenerateBrandNames = async () => {
        if (!aiKeywords.trim()) {
            toast({ variant: "destructive", title: "키워드 필요", description: "카테고리나 키워드를 입력하세요." });
            return;
        }

        if (!allowKorean && !allowEnglish) {
            toast({ variant: "destructive", title: "언어 선택 필요", description: "한글 또는 영어 중 최소 하나를 선택하세요." });
            return;
        }

        setIsGenerating(true);
        setDebugLog(""); // Clear previous logs

        const requestPayload = {
            keywords: aiKeywords,
            previous_suggestions: allGeneratedNames,
            allow_korean: allowKorean,
            allow_english: allowEnglish
        };

        // Log request
        let logText = `=== REQUEST ===\n`;
        logText += `URL: ${API_BASE}/resources/profiles/suggest-brand-names\n`;
        logText += `Payload: ${JSON.stringify(requestPayload, null, 2)}\n\n`;
        setDebugLog(logText);

        try {
            const response = await axios.post(
                `${API_BASE}/resources/profiles/suggest-brand-names`,
                requestPayload,
                { timeout: 120000 }
            );

            // Log response
            logText += `=== RESPONSE ===\n`;
            logText += `Status: ${response.status}\n`;
            logText += `Data: ${JSON.stringify(response.data, null, 2)}\n`;
            if (response.data.model_used) {
                logText += `\n⚠️ Model Used: ${response.data.model_used}\n`;
            }
            setDebugLog(logText);

            const newSuggestions = response.data.suggestions;
            setAiSuggestions(newSuggestions);
            setCurrentSuggestionIndex(0);

            // Track all generated names to avoid duplicates
            setAllGeneratedNames(prev => [...prev, ...newSuggestions]);

            toast({ title: "✨ AI 추천 완료", description: `${newSuggestions.length}개의 새로운 채널명을 생성했습니다.` });
        } catch (e: any) {
            console.error("AI Suggestion Error:", e);
            logText += `=== ERROR ===\n`;
            logText += `Message: ${e.message}\n`;
            logText += `Response: ${JSON.stringify(e.response?.data, null, 2)}\n`;
            setDebugLog(logText);
            toast({ variant: "destructive", title: "추천 실패", description: "AI 추천에 실패했습니다. 다시 시도해주세요." });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSelectSuggestion = (name: string) => {
        setBrandName(name);
        setShowAISuggestion(false);
        toast({ title: "✅ 선택 완료", description: `"${name}"이(가) 입력되었습니다.` });
    };

    const handleNextSuggestion = () => {
        setCurrentSuggestionIndex((prev) => (prev + 1) % aiSuggestions.length);
    };

    const handlePrevSuggestion = () => {
        setCurrentSuggestionIndex((prev) => (prev - 1 + aiSuggestions.length) % aiSuggestions.length);
    };


    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <ShieldCheck className="w-6 h-6 text-indigo-600" />
                            Import & Setup Wizard
                        </DialogTitle>
                        <DialogDescription>
                            모바일 생성 계정을 PC로 안전하게 이관하고 설정을 완료합니다.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Progress UI */}
                    <div className="flex justify-between my-6 px-4 relative">
                        <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-100 -z-10" />
                        {steps.map((s, idx) => {
                            const stepNum = idx + 1;
                            const isActive = step === stepNum;
                            const isCompleted = step > stepNum;
                            return (
                                <div key={idx} className="flex flex-col items-center gap-2 bg-white px-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all
                                    ${isActive ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : isCompleted ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}
                                `}>
                                        {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-tighter ${isActive ? 'text-indigo-600' : 'text-slate-600'}`}>{s.title}</span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Content Area */}
                    <div className="min-h-[220px] py-2">
                        {step === 1 && (
                            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-xs text-blue-800 flex gap-3">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    <div>
                                        <p className="font-bold mb-1">Import Mode</p>
                                        이미 모바일(LTE) 환경에서 생성된 구글 계정 정보를 입력하세요.<br />
                                        PC에서는 추가적인 생성 행위 없이 <strong>로그인 및 설정</strong>만 진행합니다.
                                    </div>
                                </div>
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <Label>구글 이메일 (ID)</Label>
                                        <Input placeholder="existing.account@gmail.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>패스워드 (선택 / 로컬 저장용)</Label>
                                        <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6 text-center py-4 animate-in fade-in zoom-in-95 duration-200">
                                <div className={`mx-auto p-6 rounded-2xl border-2 w-full max-w-sm flex flex-col items-center gap-3 ${lteStatus.connected ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                                    {lteStatus.connected ? <Smartphone className="w-12 h-12 text-emerald-600" /> : <Wifi className="w-12 h-12 text-slate-700" />}
                                    <div className="text-2xl font-mono font-black text-slate-800">{lteStatus.ip}</div>
                                    <p className={`text-sm font-medium ${lteStatus.connected ? 'text-emerald-700' : 'text-slate-500'}`}>
                                        {lteStatus.connected ? (lteStatus.ip.includes("223.") || lteStatus.ip.includes("211.") ? "LTE 통신이 준비되었습니다." : "네트워크 통신이 준비되었습니다.") : "LTE 어댑터가 감지되지 않았습니다."}
                                    </p>
                                </div>
                                <Button variant="outline" onClick={() => checkNetwork(true)} className="gap-2">
                                    <RefreshCw className="w-4 h-4" /> 환경 재검사 (IP 변경)
                                </Button>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4 py-2 animate-in fade-in zoom-in-95 duration-200">
                                {accountType === 'CAPTAIN' ? (
                                    // [CAPTAIN FLOW] Browser Launch & Login
                                    <div className="bg-white border border-indigo-100 rounded-xl p-8 shadow-sm space-y-6">
                                        <div className="text-center space-y-2">
                                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-2">
                                                <ExternalLink className="w-8 h-8 text-indigo-600" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-800">브라우저 실행 및 로그인</h3>
                                            <p className="text-slate-500 text-sm max-w-md mx-auto">
                                                Chrome 브라우저가 실행됩니다. <br />
                                                Google 계정으로 로그인하여 프로필을 생성하세요.
                                            </p>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                                            <p className="font-semibold mb-2">📌 안내사항</p>
                                            <ul className="list-disc list-inside space-y-1 text-xs">
                                                <li>브라우저에서 Google 계정으로 로그인하세요</li>
                                                <li>YouTube Studio에 접속하여 프로필을 확인하세요</li>
                                                <li>로그인 완료 후 "다음" 버튼을 클릭하세요</li>
                                            </ul>
                                        </div>

                                        <div className="flex justify-center">
                                            <Button
                                                onClick={async () => {
                                                    setIsLoading(true);
                                                    try {
                                                        await axios.post(`${API_BASE}/resources/profiles/${draftId}/launch-setup`, {
                                                            rotate_ip: false,
                                                            skip_browser: false
                                                        });
                                                        toast({
                                                            title: "브라우저 실행",
                                                            description: "Chrome이 실행되었습니다. 로그인을 진행하세요.",
                                                        });
                                                    } catch (error: any) {
                                                        toast({
                                                            variant: "destructive",
                                                            title: "실행 실패",
                                                            description: error.response?.data?.detail || "브라우저를 실행할 수 없습니다.",
                                                        });
                                                    } finally {
                                                        setIsLoading(false);
                                                    }
                                                }}
                                                className="h-14 px-8 text-lg bg-indigo-600 hover:bg-indigo-700 gap-3"
                                                disabled={isLoading}
                                            >
                                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ExternalLink className="w-5 h-5" />}
                                                Chrome 브라우저 실행
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    // [TIN_CAN FLOW] Captain Session Reuse + Manual Login & Verification
                                    <>
                                        {/* [NEW] 0. Captain Selection & Session Reuse */}
                                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5 shadow-sm space-y-4">
                                            <div className="flex items-center gap-2 border-b border-indigo-200 pb-2">
                                                <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0">0</span>
                                                <h4 className="font-bold text-indigo-900">관리자 세션 재사용 (권장)</h4>
                                            </div>

                                            <div className="text-xs text-indigo-700 bg-indigo-100 p-3 rounded">
                                                💡 <strong>Captain 계정의 로그인 세션을 복사</strong>하여 추가 로그인 없이 빠르게 설정할 수 있습니다.
                                                <br />
                                                <span className="text-[10px] text-indigo-600 mt-1 block">
                                                    ※ 프로필 폴더만 복사되며, 브라우저는 실행되지 않습니다.
                                                </span>
                                            </div>

                                            {/* Captain Selection */}
                                            <div className="space-y-2">
                                                <Label className="text-sm font-semibold">관리자 계정 선택</Label>
                                                <select
                                                    value={selectedCaptain}
                                                    onChange={(e) => setSelectedCaptain(e.target.value)}
                                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                                >
                                                    <option value="">-- Captain 선택 --</option>
                                                    {captains.map((c) => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.email} ({c.id})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Setup Button */}
                                            <Button
                                                onClick={async () => {
                                                    if (!selectedCaptain) return;
                                                    setIsLoading(true);
                                                    setProgressMessage("프로필 복사 중...");
                                                    setSetupProgress(30);

                                                    try {
                                                        const res = await axios.post(
                                                            `${API_BASE}/resources/profiles/${draftId}/copy-from-captain`,
                                                            { captain_id: selectedCaptain }
                                                        );

                                                        setSetupProgress(100);
                                                        setProgressMessage("복사 완료!");

                                                        toast({
                                                            title: "✅ 세션 복사 완료",
                                                            description: res.data.message || "Captain 로그인 정보가 적용되었습니다.",
                                                        });

                                                        // 복사 성공 후 자동으로 다음 섹션으로 스크롤
                                                        setTimeout(() => {
                                                            setSetupProgress(0);
                                                            setProgressMessage("");
                                                        }, 1500);

                                                    } catch (error: any) {
                                                        toast({
                                                            variant: "destructive",
                                                            title: "복사 실패",
                                                            description: error.response?.data?.detail || "프로필 복사에 실패했습니다.",
                                                        });
                                                        setSetupProgress(0);
                                                    } finally {
                                                        setIsLoading(false);
                                                    }
                                                }}
                                                disabled={!selectedCaptain || isLoading}
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 h-11"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="animate-spin w-4 h-4 mr-2" />
                                                        {progressMessage}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-4 h-4 mr-2" />
                                                        Captain 세션 복사 (로그인 정보 자동 적용)
                                                    </>
                                                )}
                                            </Button>

                                            {/* Progress */}
                                            {setupProgress > 0 && (
                                                <div className="space-y-1">
                                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                                        <div
                                                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${setupProgress}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-center text-slate-600">{progressMessage}</p>
                                                </div>
                                            )}

                                            {/* Login Required Alert */}
                                            {loginRequired && (
                                                <div className="bg-amber-50 border border-amber-200 p-3 rounded text-xs text-amber-800">
                                                    <div className="font-bold mb-1">⚠️ 로그인 필요</div>
                                                    세션이 만료되었습니다. 브라우저에서 로그인 후 계속 진행하세요.
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-center text-xs text-slate-600 py-2">
                                            또는 기존 방식으로 진행 ↓
                                        </div>

                                        {/* 1. Manual Login Section */}
                                        <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-bold text-blue-900 flex items-center gap-2 text-lg">
                                                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                                                    로그인 (수동)
                                                </h3>
                                                <GoogleAuthGuide />
                                            </div>
                                            <div className="text-sm text-slate-600">
                                                먼저 브라우저를 열고 구글 로그인을 완료하세요.<br />
                                                <span className="text-xs text-slate-500">* 로그인이 되어 있어야 채널 생성 등 다음 작업이 가능합니다.</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={handleLaunchSetup} disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 h-10">
                                                    {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                                                    설정 브라우저 열기
                                                </Button>
                                                <Button variant="outline" onClick={handleConnectionTest} disabled={testResult === 'loading'}>
                                                    <RefreshCw className={`w-4 h-4 ${testResult === 'loading' ? 'animate-spin' : ''}`} />
                                                </Button>
                                            </div>
                                            {testResult && testResult !== 'loading' && (
                                                <div className={`text-xs p-2 rounded border mt-2 ${testResult.status === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                    {testResult.status === 'ok' ? `✅ 접속 성공 (${testResult.elapsed})` : `❌ 접속 실패: ${testResult.detail}`}
                                                </div>
                                            )}
                                        </div>

                                        {/* 2. Setup Guide & Verification (Manual) */}
                                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 opacity-100">
                                            <div className="flex items-center gap-2 border-b pb-2">
                                                <span className="bg-slate-50 text-slate-800 border border-slate-200 w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0">2</span>
                                                <h4 className="font-bold text-slate-900">채널 및 권한 (수동 설정)</h4>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 bg-slate-50 p-3 rounded">
                                                <div className='border-r border-slate-200 pr-2'>
                                                    <div className="font-bold text-slate-800 mb-1">❶ 브랜드 채널 생성</div>
                                                    '채널 만들기'를 통해 브랜드 채널을 생성하세요.
                                                    <br />
                                                    (개인 채널이 아닌 브랜드 채널 권장)
                                                </div>
                                                <div className='pl-2'>
                                                    <div className="font-bold text-slate-800 mb-1">❷ 관리자 권한 위임</div>
                                                    설정 {'>'} 권한 {'>'} 권한 관리에서<br />
                                                    관리자 이메일을 초대하세요.
                                                </div>
                                            </div>

                                            <Button
                                                onClick={async () => {
                                                    setIsLoading(true);
                                                    try {
                                                        const response = await axios.post(
                                                            `${API_BASE}/resources/profiles/${draftId}/automation/execute`,
                                                            {
                                                                auto_create_channel: false,
                                                                auto_delegate_admin: false,
                                                                skip_login: true // Prevent auto-login on verification
                                                            }
                                                        );

                                                        if (response.data.overall_success) {
                                                            const detectStep = response.data.steps.find((s: any) => s.step === 'detect_channel');
                                                            if (detectStep?.success) {
                                                                toast({ title: "채널 확인 완료", description: `✓ ${detectStep.channel_name || '채널 감지됨'}` });
                                                            } else {
                                                                toast({ variant: "destructive", title: "채널 확인 실패", description: detectStep?.error || "채널을 감지할 수 없습니다." });
                                                            }
                                                        } else {
                                                            const loginStep = response.data.steps.find((s: any) => s.step === 'login_check');
                                                            if (loginStep?.requires_manual) {
                                                                toast({ variant: "destructive", title: "로그인 필요", description: "먼저 '설정 브라우저 열기'로 로그인해주세요." });
                                                            } else {
                                                                toast({ variant: "destructive", title: "오류", description: response.data.error || "자동화 실패" });
                                                            }
                                                        }
                                                    } catch (error: any) {
                                                        console.error("Automation failed:", error);
                                                        toast({ variant: "destructive", title: "채널 확인 실패", description: error.response?.data?.detail || "수동 확인 필요" });
                                                    } finally {
                                                        setIsLoading(false);
                                                    }
                                                }}
                                                disabled={isLoading}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 h-11"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="animate-spin w-4 h-4 mr-2" />
                                                        확인 중...
                                                    </>
                                                ) : (
                                                    <>
                                                        <ShieldCheck className="w-4 h-4 mr-2" />
                                                        설정 확인 및 채널 감지
                                                    </>
                                                )}
                                            </Button>

                                            {/* Result Display */}
                                            {automationResult && (
                                                <div className={`p-3 rounded border text-xs space-y-1 ${automationResult.overall_success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                    <div className="font-bold mb-1 flex items-center gap-2">
                                                        {automationResult.overall_success ? <Check className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                                                        {automationResult.overall_success ? '채널 확인 완료!' : '채널 확인 실패'}
                                                    </div>
                                                    <div className='text-slate-600'>
                                                        {automationResult.steps?.map((step: any, idx: number) => (
                                                            <div key={idx}>
                                                                {step.success ? (
                                                                    <span className='text-green-700'>✓ {step.message || "성공"}</span>
                                                                ) : (
                                                                    <span className='text-red-700'>✗ {step.error} (수동 확인 필요)</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {showManualInput && (
                                                <div className="mt-2 animate-in slide-in-from-top-2">
                                                    <p className="text-xs text-red-600 mb-1 font-bold">⚠️ 자동 감지 실패: 브라우저에서 올바른 채널(브랜드 계정)로 전환되었는지 확인 후 다시 시도하세요.</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200 text-center">
                                {accountType === 'CAPTAIN' ? (
                                    // [CAPTAIN FLOW] OAuth2 Key Upload (Optional)
                                    <div className="bg-white border border-indigo-100 rounded-xl p-8 shadow-sm space-y-6">
                                        {/* Optional Notice */}
                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800">
                                            <div className="font-bold mb-1">ℹ️ 선택 사항</div>
                                            <p className="text-xs">
                                                브라우저 자동화만 사용하는 경우 건너뛰기 가능합니다.<br />
                                                API 기반 권한 검증이 필요한 경우에만 업로드하세요.
                                            </p>
                                        </div>

                                        <div className="text-center space-y-2">
                                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-2">
                                                <FileJson className="w-8 h-8 text-indigo-600" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-800">YouTube API 인증 키 등록</h3>
                                            <p className="text-slate-500 text-sm max-w-md mx-auto">
                                                Google Cloud Console에서 발급받은 <code className="bg-slate-100 px-1 rounded">client_secret.json</code> 파일을 업로드하세요.
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <div className="flex justify-center gap-3">
                                                <input
                                                    type="file"
                                                    accept=".json"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    onChange={handleFileUpload}
                                                />
                                                <Button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="h-16 px-8 text-lg bg-white hover:bg-slate-50 gap-3 shadow-xl transition-transform hover:scale-105"
                                                    disabled={isLoading}
                                                >
                                                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                                                    client_secret.json 업로드
                                                </Button>
                                            </div>

                                            {/* Skip Button */}
                                            <Button
                                                variant="outline"
                                                onClick={async () => {
                                                    try {
                                                        // Update status to ACTIVE
                                                        await axios.put(`${API_BASE}/resources/profiles/${draftId}`, {
                                                            status: 'ACTIVE'
                                                        });

                                                        toast({
                                                            title: "등록 완료",
                                                            description: "Captain 계정이 등록되었습니다. API 인증은 나중에 설정할 수 있습니다."
                                                        });
                                                        onComplete();
                                                        onClose();
                                                    } catch (error: any) {
                                                        toast({
                                                            variant: "destructive",
                                                            title: "등록 실패",
                                                            description: error.response?.data?.detail || "상태 업데이트에 실패했습니다."
                                                        });
                                                    }
                                                }}
                                                className="w-full"
                                            >
                                                건너뛰기 (브라우저 자동화만 사용)
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    // [TIN_CAN FLOW] OAuth2 Key Upload
                                    <>
                                        <div className="bg-amber-50 border border-amber-200 p-5 rounded-lg text-amber-800 text-sm">
                                            <h4 className="font-black flex justify-center items-center gap-2 mb-2 text-lg">
                                                <FileJson className="w-6 h-6" /> JSON 키 등록
                                            </h4>
                                            <p>
                                                다운로드 받은 <code>client_secret.json</code> 파일을 업로드하세요.<br />
                                                파일이 검증되면 계정이 <strong>활성(Active)</strong> 상태가 됩니다.
                                            </p>
                                        </div>

                                        <div className="flex justify-center">
                                            <input
                                                type="file"
                                                accept=".json"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleFileUpload}
                                            />
                                            <Button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="h-16 px-8 text-lg bg-white hover:bg-slate-50 gap-3 shadow-xl transition-transform hover:scale-105"
                                                disabled={isLoading}
                                            >
                                                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                                                client_secret.json 업로드
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {step === 5 && (
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
                                            <p>이제 YouTube Analytics 및 데이터 API를 정상적으로 사용할 수 있습니다.</p>
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
                                            <Button onClick={handleConfirmCaptain} className="bg-emerald-600 hover:bg-emerald-700 w-full max-w-xs h-14 text-lg shadow-xl shadow-emerald-100">
                                                <Check className="w-6 h-6 mr-2" /> 모든 등록 절차 완료
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        {step > 1 && step <= 5 && <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={isLoading}>이전</Button>}

                        {step === 1 && <Button onClick={handleImportAccount} disabled={isLoading} className="w-full">계정 가져오기 <ChevronRight className="w-4 h-4 ml-1" /></Button>}
                        {step === 2 && accountType === 'TIN_CAN' && <Button onClick={() => setStep(3)} disabled={!lteStatus.connected} className="w-full bg-indigo-600">환경 확인 완료 <ChevronRight className="w-4 h-4 ml-1" /></Button>}
                        {step === 2 && accountType === 'CAPTAIN' && <Button onClick={() => setStep(3)} className="w-full bg-indigo-600">보안 점검 완료 <ChevronRight className="w-4 h-4 ml-1" /></Button>}
                        {step === 3 && accountType === 'TIN_CAN' && <Button onClick={() => setStep(4)} variant="outline" className="w-full">다음 (설정 완료) <ChevronRight className="w-4 h-4 ml-1" /></Button>}
                        {step === 3 && accountType === 'CAPTAIN' && <Button onClick={() => setStep(4)} variant="outline" className="w-full">다음 (로그인 완료) <ChevronRight className="w-4 h-4 ml-1" /></Button>}
                        {/* Captain Step 4: OAuth2 key upload triggers automatic completion */}
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            {/* AI Brand Name Suggestion Dialog */}
            <Dialog open={showAISuggestion} onOpenChange={setShowAISuggestion}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-600" />
                            AI 브랜드명 추천
                        </DialogTitle>
                        <DialogDescription>
                            전문 브랜딩 전략을 적용한 AI가 8가지 다양한 스타일의 채널명을 제안합니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Keyword Input */}
                        <div className="space-y-2">
                            <Label>채널 주제 / 카테고리</Label>
                            <Input
                                placeholder="예: 게임 리뷰, 요리 레시피, 여행 브이로그"
                                value={aiKeywords}
                                onChange={(e) => setAiKeywords(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerateBrandNames()}
                            />
                            <p className="text-xs text-slate-500">채널의 주제나 콘텐츠 유형을 구체적으로 입력하세요</p>
                        </div>

                        {/* Language Preference - Single Toggle */}
                        <div className="space-y-2">
                            <Label>언어 선택</Label>
                            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAllowKorean(true);
                                        setAllowEnglish(false);
                                    }}
                                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${allowKorean && !allowEnglish
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    🇰🇷 한글
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAllowKorean(false);
                                        setAllowEnglish(true);
                                    }}
                                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${allowEnglish && !allowKorean
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    🇺🇸 English
                                </button>
                            </div>
                            <p className="text-xs text-slate-500">한글 선택 시 한국어 이름만 생성됩니다</p>
                        </div>

                        {/* Generate Button */}
                        <Button
                            onClick={handleGenerateBrandNames}
                            disabled={isGenerating || !aiKeywords.trim()}
                            className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    생성 중...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    추천 받기
                                </>
                            )}
                        </Button>

                        {/* Debug Log Panel */}
                        {debugLog && (
                            <div className="mt-4 space-y-2">
                                <Label className="text-xs font-bold text-amber-600">🔍 Debug Log</Label>
                                <textarea
                                    readOnly
                                    value={debugLog}
                                    className="w-full h-40 text-xs font-mono bg-white text-green-400 p-3 rounded-lg border border-slate-200 resize-none"
                                />
                            </div>
                        )}

                        {/* Suggestions Carousel */}
                        {aiSuggestions.length > 0 && (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">
                                        {currentSuggestionIndex + 1} / {aiSuggestions.length}
                                    </span>
                                    <div className="flex gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handlePrevSuggestion}
                                            className="h-7 w-7 p-0"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleNextSuggestion}
                                            className="h-7 w-7 p-0"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="text-center py-6">
                                    <div className="text-2xl font-bold text-indigo-600 mb-2">
                                        {aiSuggestions[currentSuggestionIndex]}
                                    </div>
                                    <Button
                                        onClick={() => handleSelectSuggestion(aiSuggestions[currentSuggestionIndex])}
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        이 이름 선택
                                    </Button>
                                </div>

                                <div className="flex justify-center gap-1">
                                    {aiSuggestions.map((_, idx) => (
                                        <div
                                            key={idx}
                                            className={`h-1.5 w-1.5 rounded-full transition-all ${idx === currentSuggestionIndex
                                                ? 'bg-indigo-600 w-4'
                                                : 'bg-slate-300'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default TinCanWizard;