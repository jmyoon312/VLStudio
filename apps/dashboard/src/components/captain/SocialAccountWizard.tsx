import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    ShieldCheck, Smartphone, Globe, Wifi,
    CheckCircle2, Loader2, ChevronRight, ChevronLeft,
    RefreshCw, Server, Zap, Lock, Activity, AlertTriangle, Check
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

interface SocialAccountWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    defaultPlatform?: 'TIKTOK' | 'INSTAGRAM' | 'DOUYIN';
    initialData?: any;
}

// 3단계만: 계정 정보 → 네트워크 → 브라우저 실행
const WIZARD_STEPS = [
    { title: "계정 정보", desc: "플랫폼 및 아이디" },
    { title: "네트워크 설정", desc: "프록시 / 직접 연결" },
    { title: "브라우저 접속", desc: "로그인 및 세션 생성" }
];

// TikTok SVG
const TikTokIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.28 8.28 0 004.83 1.54V6.79a4.85 4.85 0 01-1.06-.1z"/>
    </svg>
);

// Instagram SVG
const InstagramIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
);

// 더우인(抖音) 브랜드 SVG 아이콘 — ByteDance 공식 로고
const DouyinIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.321 5.562a5.122 5.122 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.971-1.166-1.959-1.281-2.653h.004C16.368 1.2 16.392 1 16.392 1H12.53v14.783c0 .196 0 .39-.008.582-.009.22-.014.437-.014.651a3.47 3.47 0 0 1-3.468 3.282 3.47 3.47 0 0 1-3.469-3.469 3.47 3.47 0 0 1 3.469-3.469c.34 0 .667.05.977.14V9.607a7.348 7.348 0 0 0-.977-.066 7.323 7.323 0 0 0-7.323 7.323A7.323 7.323 0 0 0 9.04 24a7.323 7.323 0 0 0 7.323-7.323V9.197a10.069 10.069 0 0 0 5.886 1.889V7.233c-.001 0-1.643-.07-3.928-1.671z"/>
    </svg>
);

export const SocialAccountWizard: React.FC<SocialAccountWizardProps> = ({
    isOpen,
    onClose,
    onComplete,
    defaultPlatform = 'TIKTOK',
    initialData
}) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Profile Data
    const [draftId, setDraftId] = useState<string>("");
    const [platform, setPlatform] = useState<'TIKTOK' | 'INSTAGRAM' | 'DOUYIN'>(defaultPlatform);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    // Network State — 기본값 DIRECT (USB 폰 없어도 바로 실행 가능)
    const [proxyMode, setProxyMode] = useState<string>("DIRECT");
    const [proxyProtocol, setProxyProtocol] = useState<string>("socks5");
    const [proxyHost, setProxyHost] = useState("");
    const [proxyPort, setProxyPort] = useState("1080");
    const [proxyUsername, setProxyUsername] = useState("");
    const [proxyPassword, setProxyPassword] = useState("");
    const [boundDeviceSerial, setBoundDeviceSerial] = useState<string>("");

    // Phone devices — TinCanWizard 검증 방식 그대로 이식
    const [devicesList, setDevicesList] = useState<any[]>([]);
    const [ispProxiesList, setIspProxiesList] = useState<any[]>([]);
    const [isLoadingDevices, setIsLoadingDevices] = useState(false);
    const [isTestingProxy, setIsTestingProxy] = useState(false);
    const [proxyTestResult, setProxyTestResult] = useState<any>(null);

    // Live IP test
    const [testingIp, setTestingIp] = useState(false);
    const [testedIp, setTestedIp] = useState<string | null>(null);

    // Browser launch state
    const [isLaunching, setIsLaunching] = useState(false);
    const [isBrowserLaunched, setIsBrowserLaunched] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setDraftId(initialData.id || "");
                setPlatform((initialData.platform || defaultPlatform).toUpperCase() as 'TIKTOK' | 'INSTAGRAM' | 'DOUYIN');
                setName(initialData.name || "");
                setEmail(initialData.email || "");
                setProxyMode(initialData.proxy_mode || "DIRECT");
                setProxyHost(initialData.proxy_host || "");
                setProxyPort(initialData.proxy_port || "1080");
                setProxyProtocol(initialData.proxy_protocol || "socks5");
                setProxyUsername(initialData.proxy_username || "");
                setBoundDeviceSerial(initialData.bound_device_serial || "");
                setStep(1);
            } else {
                setDraftId("");
                setPlatform(defaultPlatform);
                setName("");
                setEmail("");
                setProxyMode("DIRECT");
                setProxyHost("");
                setProxyPort("1080");
                setProxyUsername("");
                setProxyPassword("");
                setBoundDeviceSerial("");
                setDevicesList([]);
                setProxyTestResult(null);
                setTestedIp(null);
                setIsBrowserLaunched(false);
                setStep(1);
            }
        }
    }, [isOpen, initialData, defaultPlatform]);

    // --- TinCanWizard에서 검증된 기기 감지 로직 그대로 이식 ---
    // 엔드포인트: /api/resources/network/status?force=true (배열 직접반환 아닌 wrapper 객체 반환)
    const fetchDevicesAndProxies = async () => {
        setIsLoadingDevices(true);
        try {
            const res = await axios.get(`/api/resources/network/status?force=true&t=${Date.now()}`);
            const data = res.data;
            const devs = data.devices || [];
            setDevicesList(devs);
            setIspProxiesList(data.isp_proxies || []);

            // 기기가 있고 아직 선택 안 됐으면 assigned_accounts_count 가장 적은 기기 자동 선택
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

    // Step 2 (네트워크 설정) 진입 시 자동으로 기기 탐색 — TinCanWizard step===3과 동일한 패턴
    useEffect(() => {
        if (isOpen && step === 2) {
            fetchDevicesAndProxies();
        }
    }, [isOpen, step]);

    // 프록시 회선 통신 테스트
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
            const res = await axios.post(`/api/resources/network/test-proxy`, payload);
            setProxyTestResult(res.data);
            if (res.data.status === 'success') {
                toast.success(`회선 통신 정상 확인 — 공인 IP: ${res.data.public_ip} (${res.data.elapsed_ms}ms)`);
            } else {
                toast.error(res.data.detail || "프록시 응답 없음");
            }
        } catch (err: any) {
            setProxyTestResult({ status: 'error', detail: err.message });
            toast.error(err.message);
        } finally {
            setIsTestingProxy(false);
        }
    };


    const handleTestNetworkIp = async () => {
        try {
            setTestingIp(true);
            const res = await axios.get(`/api/resources/network/status?t=${Date.now()}`);
            const ip = res.data?.public_ip || res.data?.current_ip || "연결 확인됨";
            setTestedIp(ip);
            toast.success(`현재 공인 IP: ${ip}`);
        } catch (e: any) {
            toast.error("IP 확인 실패. 네트워크 연결을 확인해주세요.");
        } finally {
            setTestingIp(false);
        }
    };

    // Step 1 → 2: Draft 생성
    const handleNextFromStep1 = async () => {
        if (!email.trim()) {
            toast.error("계정 아이디 또는 핸들을 입력해주세요.");
            return;
        }

        const accountName = name.trim() || `${platform === 'TIKTOK' ? '틱톡' : platform === 'DOUYIN' ? '더우인' : '인스타'} - ${email.trim()}`;
        setLoading(true);
        try {
            if (!draftId) {
                const res = await axios.post('/api/social-profiles/draft', {
                    platform,
                    name: accountName,
                    email: email.trim()
                });
                setDraftId(res.data.id);
            } else {
                await axios.put(`/api/social-profiles/${draftId}`, {
                    name: accountName,
                    email: email.trim(),
                    platform
                });
            }
            setName(accountName);
            setStep(2);
        } catch (e: any) {
            toast.error(e.response?.data?.detail || "초안 저장 실패");
        } finally {
            setLoading(false);
        }
    };

    // Step 2 → 3: 네트워크 설정 저장
    const handleNextFromStep2 = async () => {
        if (!draftId) return;
        setLoading(true);
        try {
            await axios.put(`/api/social-profiles/${draftId}`, {
                proxy_mode: proxyMode,
                proxy_protocol: proxyProtocol,
                proxy_host: proxyHost || null,
                proxy_port: proxyPort || null,
                proxy_username: proxyUsername || null,
                proxy_password: proxyPassword || null,
                bound_device_serial: boundDeviceSerial || null,
                status: "ACTIVE"
            });
            setStep(3);
        } catch (e: any) {
            toast.error(e.response?.data?.detail || "네트워크 설정 저장 실패");
        } finally {
            setLoading(false);
        }
    };

    // Step 3: 브라우저 실행
    const handleLaunchBrowser = async () => {
        if (!draftId) return;
        setIsLaunching(true);
        try {
            const res = await axios.post(`/api/social-profiles/${draftId}/launch`);
            if (res.data?.status === 'launched') {
                setIsBrowserLaunched(true);
                toast.success("🚀 스텔스 브라우저가 화면에 열렸습니다! 로그인 후 [등록 완료]를 눌러주세요.");
            } else if (res.data?.status === 'queued') {
                toast.warning(`⚠️ [LTE 플랫폼 충돌 회피] ${res.data.message}`, { duration: 8000 });
            } else {
                throw new Error(res.data?.detail || "브라우저 실행 실패");
            }
        } catch (e: any) {
            toast.error(e.response?.data?.detail || e.message || "브라우저 구동 실패");
        } finally {
            setIsLaunching(false);
        }
    };

    const handleComplete = () => {
        const platformLabel = platform === 'TIKTOK' ? 'TikTok' : platform === 'DOUYIN' ? 'Douyin(抖音)' : 'Instagram';
        toast.success(`🎉 ${platformLabel} 계정이 등록되었습니다!`);
        onComplete();
        onClose();
    };

    const platformConfig = {
        TIKTOK: {
            name: 'TikTok',
            sub: '크리에이터 센터',
            badgeClass: 'bg-teal-500/8 text-teal-700 dark:text-teal-300 border-teal-500/20',
            gradient: 'bg-[radial-gradient(ellipse_80%_60%_at_10%_0%,rgba(20,184,166,0.12),transparent)]',
            iconBg: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/25',
            icon: <TikTokIcon className="w-4 h-4" />,
            stepActiveBg: 'bg-teal-600 text-white',
            btnPrimary: 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/20',
            summaryBanner: 'bg-teal-500/8 text-teal-700 dark:text-teal-300',
        },
        INSTAGRAM: {
            name: 'Instagram',
            sub: '릴스 & 비즈니스',
            badgeClass: 'bg-pink-500/8 text-pink-700 dark:text-pink-300 border-pink-500/20',
            gradient: 'bg-[radial-gradient(ellipse_80%_60%_at_10%_0%,rgba(236,72,153,0.10),transparent)]',
            iconBg: 'bg-gradient-to-br from-pink-500/15 to-purple-500/15 text-pink-600 dark:text-pink-400 border-pink-500/25',
            icon: <InstagramIcon className="w-4 h-4" />,
            stepActiveBg: 'bg-pink-600 text-white',
            btnPrimary: 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 shadow-pink-500/20',
            summaryBanner: 'bg-gradient-to-r from-pink-500/8 to-purple-500/8 text-pink-700 dark:text-pink-300',
        },
        DOUYIN: {
            name: 'Douyin(抖音)',
            sub: '중국 바이트댄스 쇼츠',
            badgeClass: 'bg-red-500/8 text-red-700 dark:text-red-300 border-red-500/20',
            gradient: 'bg-[radial-gradient(ellipse_80%_60%_at_10%_0%,rgba(239,68,68,0.12),transparent)]',
            iconBg: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25',
            icon: <DouyinIcon className="w-4 h-4" />,
            stepActiveBg: 'bg-red-600 text-white',
            btnPrimary: 'bg-red-600 hover:bg-red-700 shadow-red-500/20',
            summaryBanner: 'bg-red-500/8 text-red-700 dark:text-red-300',
        }
    };
    const currentPlatform = platformConfig[platform] ?? platformConfig.TIKTOK;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-xl bg-card border-border/80 text-foreground p-0 overflow-hidden shadow-xl">

                {/* ── 헤더 ── */}
                <div className="relative overflow-hidden px-6 pt-5 pb-4 border-b border-border/60">
                    {/* 배경 그라디언트 */}
                    <div className={`absolute inset-0 opacity-40 ${currentPlatform.gradient}`} />

                    <DialogHeader className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <DialogTitle className="text-sm font-bold flex items-center gap-2.5">
                                {/* 플랫폼 아이콘 */}
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${currentPlatform.iconBg}`}>
                                    {currentPlatform.icon}
                                </div>
                                <span>소셜 계정 등록</span>
                                <Badge variant="outline" className={`text-[10px] font-bold border ${currentPlatform.badgeClass}`}>
                                    {currentPlatform.name}
                                </Badge>
                            </DialogTitle>
                            <span className="text-[11px] font-semibold text-muted-foreground">
                                {step} / {WIZARD_STEPS.length}
                            </span>
                        </div>

                        <DialogDescription className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <Lock className="w-3 h-3" />
                            YouTube와 완전 격리된 스텔스 독립 세션으로 안전하게 운영합니다
                        </DialogDescription>
                    </DialogHeader>

                    {/* 스텝 인디케이터 */}
                    <div className="relative flex items-center gap-1.5 mt-4">
                        {WIZARD_STEPS.map((s, idx) => {
                            const sNum = idx + 1;
                            const isActive = step === sNum;
                            const isDone = step > sNum;
                            return (
                                <React.Fragment key={s.title}>
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                                        isActive
                                            ? 'bg-background border border-border shadow-2xs text-foreground'
                                            : isDone
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-muted-foreground/50'
                                    }`}>
                                        {isDone ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        ) : (
                                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                                isActive
                                                    ? currentPlatform.stepActiveBg
                                                    : 'bg-muted text-muted-foreground'
                                            }`}>{sNum}</span>
                                        )}
                                        <span className="truncate">{s.title}</span>
                                    </div>
                                    {idx < WIZARD_STEPS.length - 1 && (
                                        <div className={`flex-1 h-px ${step > sNum ? 'bg-emerald-500/40' : 'bg-border/60'}`} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* ── 바디 ── */}
                <div className="px-6 py-5 min-h-[280px]">

                    {/* ━━ STEP 1: 계정 정보 ━━ */}
                    {step === 1 && (
                        <div className="space-y-5">
                            {/* 플랫폼 선택 (3열 그리드: TikTok / Instagram / Douyin) */}
                            <div>
                                <Label className="text-xs font-bold mb-2 block">소셜 미디어 플랫폼</Label>
                                <div className="grid grid-cols-3 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setPlatform('TIKTOK')}
                                        className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                                            platform === 'TIKTOK'
                                                ? 'border-teal-500 bg-teal-500/10 shadow-xs'
                                                : 'border-border/70 hover:bg-muted/40 hover:border-border'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mb-2 ${
                                            platform === 'TIKTOK'
                                                ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/30'
                                                : 'bg-muted text-muted-foreground border-border/60'
                                        }`}>
                                            <TikTokIcon className="w-4 h-4" />
                                        </div>
                                        <div className="font-bold text-xs text-foreground">TikTok</div>
                                        <div className="text-[9px] text-muted-foreground mt-0.5">글로벌 틱톡</div>
                                        {platform === 'TIKTOK' && (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 mt-1.5 shrink-0" />
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPlatform('INSTAGRAM')}
                                        className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                                            platform === 'INSTAGRAM'
                                                ? 'border-pink-500 bg-pink-500/10 shadow-xs'
                                                : 'border-border/70 hover:bg-muted/40 hover:border-border'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mb-2 ${
                                            platform === 'INSTAGRAM'
                                                ? 'bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-pink-600 dark:text-pink-400 border-pink-500/30'
                                                : 'bg-muted text-muted-foreground border-border/60'
                                        }`}>
                                            <InstagramIcon className="w-4 h-4" />
                                        </div>
                                        <div className="font-bold text-xs text-foreground">Instagram</div>
                                        <div className="text-[9px] text-muted-foreground mt-0.5">인스타 릴스</div>
                                        {platform === 'INSTAGRAM' && (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-pink-500 mt-1.5 shrink-0" />
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPlatform('DOUYIN')}
                                        className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                                            platform === 'DOUYIN'
                                                ? 'border-red-500 bg-red-500/10 shadow-xs'
                                                : 'border-border/70 hover:bg-muted/40 hover:border-border'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mb-2 ${
                                            platform === 'DOUYIN'
                                                ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
                                                : 'bg-muted text-muted-foreground border-border/60'
                                        }`}>
                                            <DouyinIcon className="w-4 h-4" />
                                        </div>
                                        <div className="font-bold text-xs text-foreground">Douyin (抖音)</div>
                                        <div className="text-[9px] text-muted-foreground mt-0.5">중국 쇼츠</div>
                                        {platform === 'DOUYIN' && (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-red-500 mt-1.5 shrink-0" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* 아이디 + 별칭 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold flex items-center gap-1">
                                        계정 아이디 / 핸들
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="@username"
                                        className="h-9 text-xs"
                                        onKeyDown={e => e.key === 'Enter' && handleNextFromStep1()}
                                    />
                                    <p className="text-[10px] text-muted-foreground">로그인에 사용하는 아이디</p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold">표시용 별칭 (선택)</Label>
                                    <Input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="예: 메인 브랜드 계정"
                                        className="h-9 text-xs"
                                    />
                                    <p className="text-[10px] text-muted-foreground">대시보드 카드에 표시될 이름</p>
                                </div>
                            </div>

                            {/* 격리 안내 */}
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/60 text-[11px] text-muted-foreground">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                <span>이 계정은 <strong className="text-foreground">YouTube 채널과 완전히 분리된</strong> 독립 브라우저 프로필로 생성됩니다. 로그인 정보를 여기에 저장하지 않아도 됩니다 — 브라우저에서 직접 로그인하면 세션이 영구 보존됩니다.</span>
                            </div>
                        </div>
                    )}

                    {/* ━━ STEP 2: 네트워크 설정 ━━ */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <Label className="text-xs font-bold mb-2 block">네트워크 연결 방식</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {/* 직접 연결 */}
                                    <button
                                        type="button"
                                        onClick={() => setProxyMode('DIRECT')}
                                        className={`p-3 rounded-xl border text-left transition-all ${
                                            proxyMode === 'DIRECT'
                                                ? 'border-emerald-500 bg-emerald-500/10 shadow-2xs'
                                                : 'border-border/70 hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="font-bold text-xs text-foreground flex items-center gap-1 mb-1">
                                            <Wifi className={`w-3.5 h-3.5 ${proxyMode === 'DIRECT' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                                            직접 연결
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">로컬 인터넷<br/>(기본값, 즉시 실행)</p>
                                    </button>

                                    {/* LTE 모바일 */}
                                    <button
                                        type="button"
                                        onClick={() => setProxyMode('DIRECT_LTE')}
                                        className={`p-3 rounded-xl border text-left transition-all ${
                                            proxyMode === 'DIRECT_LTE'
                                                ? 'border-blue-500 bg-blue-500/10 shadow-2xs'
                                                : 'border-border/70 hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="font-bold text-xs text-foreground flex items-center gap-1 mb-1">
                                            <Smartphone className={`w-3.5 h-3.5 ${proxyMode === 'DIRECT_LTE' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                                            LTE 모바일
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">USB EveryProxy<br/>스마트폰 연결</p>
                                    </button>

                                    {/* ISP 프록시 */}
                                    <button
                                        type="button"
                                        onClick={() => setProxyMode('ISP_PROXY')}
                                        className={`p-3 rounded-xl border text-left transition-all ${
                                            proxyMode === 'ISP_PROXY'
                                                ? 'border-purple-500 bg-purple-500/10 shadow-2xs'
                                                : 'border-border/70 hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="font-bold text-xs text-foreground flex items-center gap-1 mb-1">
                                            <Server className={`w-3.5 h-3.5 ${proxyMode === 'ISP_PROXY' ? 'text-purple-500' : 'text-muted-foreground'}`} />
                                            고정 ISP
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">SOCKS5 / HTTP<br/>프록시 서버</p>
                                    </button>
                                </div>
                            </div>

                            {/* LTE 기기 선택 — TinCanWizard 카드형 UI */}
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
                                                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{dev.serial}</span>
                                                                        {dev.is_default && (
                                                                            <span className="text-[9px] px-1 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded font-bold">기본</span>
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

                            {/* ISP 프록시 설정 */}
                            {proxyMode === 'ISP_PROXY' && (
                                <div className="bg-muted/30 p-3.5 rounded-xl border border-border/70 space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[11px]">프로토콜</Label>
                                            <Select value={proxyProtocol} onValueChange={setProxyProtocol}>
                                                <SelectTrigger className="h-8 text-xs bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="socks5" className="text-xs">SOCKS5</SelectItem>
                                                    <SelectItem value="http" className="text-xs">HTTP</SelectItem>
                                                    <SelectItem value="https" className="text-xs">HTTPS</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[11px]">포트</Label>
                                            <Input
                                                value={proxyPort}
                                                onChange={e => setProxyPort(e.target.value)}
                                                placeholder="1080"
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px]">호스트 (IP 또는 도메인)</Label>
                                        <Input
                                            value={proxyHost}
                                            onChange={e => setProxyHost(e.target.value)}
                                            placeholder="123.45.67.89"
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[11px]">인증 ID (선택)</Label>
                                            <Input
                                                value={proxyUsername}
                                                onChange={e => setProxyUsername(e.target.value)}
                                                placeholder="username"
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[11px]">인증 비번 (선택)</Label>
                                            <Input
                                                type="password"
                                                value={proxyPassword}
                                                onChange={e => setProxyPassword(e.target.value)}
                                                placeholder="password"
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* IP 테스트 */}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleTestNetworkIp}
                                    disabled={testingIp}
                                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/70 bg-muted/30 hover:bg-muted/60 text-xs text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
                                >
                                    {testingIp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5 text-blue-500" />}
                                    현재 IP 확인
                                </button>
                                {testedIp && (
                                    <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                        ✓ {testedIp}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ━━ STEP 3: 브라우저 실행 & 로그인 ━━ */}
                    {step === 3 && (
                        <div className="space-y-5">
                            {/* 요약 정보 */}
                            <div className="rounded-xl border border-border/70 overflow-hidden">
                                <div className={`px-4 py-2.5 text-xs font-bold border-b border-border/60 flex items-center gap-2 ${currentPlatform.summaryBanner}`}>
                                    {currentPlatform.icon}
                                    등록 요약 정보
                                </div>
                                <div className="divide-y divide-border/50">
                                    {[
                                        { label: '플랫폼', value: `${currentPlatform.name} (${currentPlatform.sub})` },
                                        { label: '계정 아이디', value: email },
                                        { label: '표시 이름', value: name || '(자동 생성)' },
                                        { label: '네트워크', value: proxyMode === 'DIRECT' ? '💻 직접 연결' : proxyMode === 'DIRECT_LTE' ? `📱 LTE (${boundDeviceSerial || '기본 포트'})` : `🌐 ${proxyHost}:${proxyPort}` },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="flex items-center justify-between px-4 py-2 text-xs">
                                            <span className="text-muted-foreground">{label}</span>
                                            <span className="font-semibold text-foreground font-mono truncate max-w-[200px]">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 실행 버튼 */}
                            <div className="text-center space-y-3">
                                <button
                                    type="button"
                                    onClick={handleLaunchBrowser}
                                    disabled={isLaunching || isBrowserLaunched}
                                    className={`w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${currentPlatform.btnPrimary}`}
                                >
                                    {isLaunching ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            브라우저 기동 중...
                                        </>
                                    ) : isBrowserLaunched ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            브라우저가 열렸습니다
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4" />
                                            🛡️ 스텔스 브라우저 실행
                                        </>
                                    )}
                                </button>

                                {!isBrowserLaunched && (
                                    <p className="text-[11px] text-muted-foreground">
                                        버튼을 누르면 별도의 보안 브라우저 창이 열립니다.<br/>
                                        <strong className="text-foreground">로그인 완료 후 아래 [등록 완료]</strong>를 눌러주세요.
                                    </p>
                                )}

                                {isBrowserLaunched && (
                                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 text-left">
                                        ✅ 스텔스 브라우저가 화면에 열렸습니다.<br/>
                                        브라우저 창에서 <strong>{currentPlatform.name} 로그인</strong>을 완료한 뒤,
                                        아래 <strong>[등록 완료]</strong> 버튼을 눌러 세션을 저장하세요.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── 푸터 ── */}
                <div className="px-6 py-3.5 bg-muted/20 border-t border-border/60 flex items-center justify-between">
                    <button
                        type="button"
                        disabled={step === 1 || loading}
                        onClick={() => setStep(s => s - 1)}
                        className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        이전
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-8 px-3 rounded-lg border border-border/70 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
                        >
                            취소
                        </button>

                        {step === 1 && (
                            <button
                                type="button"
                                onClick={handleNextFromStep1}
                                disabled={loading || !email.trim()}
                                className={`h-8 px-4 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${currentPlatform.btnPrimary}`}
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                다음 <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        )}

                        {step === 2 && (
                            <button
                                type="button"
                                onClick={handleNextFromStep2}
                                disabled={loading || (proxyMode === 'ISP_PROXY' && !proxyHost.trim())}
                                className={`h-8 px-4 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${currentPlatform.btnPrimary}`}
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                다음 <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                type="button"
                                onClick={handleComplete}
                                className="h-8 px-4 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 transition-all"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                등록 완료
                            </button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

