import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Music2, Camera, ShieldCheck, Globe, Plus,
    Trash2, Settings, RefreshCw, Loader2,
    Zap, Lock, Smartphone, ChevronRight, ChevronDown,
    Users, Activity, Wifi
} from 'lucide-react';
import { toast } from 'sonner';
import { SocialAccountWizard } from './SocialAccountWizard';

interface SocialProfile {
    id: string;
    name: string;
    email: string;
    platform: 'TIKTOK' | 'INSTAGRAM' | 'DOUYIN';
    status: string;
    folder_path: string;
    engine_type: string;
    proxy_mode: string;
    proxy_protocol: string;
    proxy_host?: string;
    proxy_port?: string;
    proxy_username?: string;
    bound_device_serial?: string;
    created_at?: string;
    last_used_at?: string;
}

interface SocialAccountsManagerProps {
    profileId?: string;
    compact?: boolean;
}

// TikTok 브랜드 SVG 아이콘
const TikTokIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.28 8.28 0 004.83 1.54V6.79a4.85 4.85 0 01-1.06-.1z"/>
    </svg>
);

// Instagram 브랜드 SVG 아이콘
const InstagramIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
);

// 더우인(抖音) 브랜드 SVG 아이콘 — ByteDance 공식 로고 (음표 형태)
const DouyinIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.321 5.562a5.122 5.122 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.971-1.166-1.959-1.281-2.653h.004C16.368 1.2 16.392 1 16.392 1H12.53v14.783c0 .196 0 .39-.008.582-.009.22-.014.437-.014.651a3.47 3.47 0 0 1-3.468 3.282 3.47 3.47 0 0 1-3.469-3.469 3.47 3.47 0 0 1 3.469-3.469c.34 0 .667.05.977.14V9.607a7.348 7.348 0 0 0-.977-.066 7.323 7.323 0 0 0-7.323 7.323A7.323 7.323 0 0 0 9.04 24a7.323 7.323 0 0 0 7.323-7.323V9.197a10.069 10.069 0 0 0 5.886 1.889V7.233c-.001 0-1.643-.07-3.928-1.671z"/>
    </svg>
);

const SocialAccountsManager: React.FC<SocialAccountsManagerProps> = ({ compact = false }) => {
    const [profiles, setProfiles] = useState<SocialProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ALL' | 'TIKTOK' | 'INSTAGRAM' | 'DOUYIN'>('ALL');

    // Wizard State
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardPlatform, setWizardPlatform] = useState<'TIKTOK' | 'INSTAGRAM' | 'DOUYIN'>('TIKTOK');
    const [editProfileData, setEditProfileData] = useState<any>(null);

    // Quick Settings Dialog State
    const [editProfile, setEditProfile] = useState<SocialProfile | null>(null);
    const [editName, setEditName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editProxyMode, setEditProxyMode] = useState("DIRECT");
    const [editBoundSerial, setEditBoundSerial] = useState("");
    const [editProxyHost, setEditProxyHost] = useState("");
    const [editProxyPort, setEditProxyPort] = useState("1080");
    const [savingEdit, setSavingEdit] = useState(false);
    const [devices, setDevices] = useState<any[]>([]);

    // Launching state per profile
    const [launchingId, setLaunchingId] = useState<string | null>(null);

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/social-profiles/');
            setProfiles(res.data || []);
        } catch (error) {
            console.error("Failed to fetch social profiles:", error);
            toast.error("소셜 계정 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const fetchDevices = async () => {
        try {
            const res = await axios.get('/api/resources/network/devices');
            setDevices(res.data?.devices || []);
        } catch (e) {
            console.warn("Failed to fetch devices:", e);
        }
    };

    useEffect(() => {
        fetchProfiles();
        fetchDevices();
    }, []);

    const handleOpenWizard = (platform: 'TIKTOK' | 'INSTAGRAM' | 'DOUYIN', initial?: any) => {
        setWizardPlatform(platform);
        setEditProfileData(initial || null);
        setIsWizardOpen(true);
    };

    const handleLaunchBrowser = async (profile: SocialProfile) => {
        setLaunchingId(profile.id);
        toast.info(`🛡️ ${profile.name} 스텔스 보안 브라우저 기동 중...`);
        try {
            const res = await axios.post(`/api/social-profiles/${profile.id}/launch`);
            if (res.data?.status === 'launched') {
                toast.success(`🚀 ${profile.name} 브라우저가 화면에 열렸습니다!`);
                fetchProfiles();
            } else if (res.data?.status === 'queued') {
                // ByteDance 동시 LTE 충돌 → 에러가 아닌 순차 처리 안내
                toast.warning(
                    `⚠️ 순차 처리 대기\n${res.data?.conflict_profile_name}(${res.data?.conflict_platform})이 LTE 사용 중입니다. 잠시 후 재시도해 주세요.`,
                    { duration: 8000 }
                );
            } else {
                throw new Error(res.data?.message || "런칭 실패");
            }
        } catch (e: any) {
            console.error(e);
            toast.error(e.response?.data?.detail || e.message || "브라우저 실행 중 오류가 발생했습니다.");
        } finally {
            setLaunchingId(null);
        }
    };

    const handleDeleteProfile = async (profile: SocialProfile) => {
        if (!confirm(`정말 '${profile.name}' 계정을 삭제하시겠습니까?\n프로필과 전용 브라우저 세션 데이터가 영구히 삭제됩니다.`)) return;

        try {
            await axios.delete(`/api/social-profiles/${profile.id}?delete_folder=true`);
            toast.success("계정이 안전하게 삭제되었습니다.");
            fetchProfiles();
        } catch (e: any) {
            console.error(e);
            toast.error(e.response?.data?.detail || "삭제 실패");
        }
    };

    const handleOpenQuickSettings = (p: SocialProfile) => {
        setEditProfile(p);
        setEditName(p.name);
        setEditEmail(p.email);
        setEditProxyMode(p.proxy_mode || "DIRECT");
        setEditBoundSerial(p.bound_device_serial || "");
        setEditProxyHost(p.proxy_host || "");
        setEditProxyPort(p.proxy_port || "1080");
    };

    const handleSaveQuickSettings = async () => {
        if (!editProfile) return;
        setSavingEdit(true);
        try {
            await axios.put(`/api/social-profiles/${editProfile.id}`, {
                name: editName.trim(),
                email: editEmail.trim(),
                proxy_mode: editProxyMode,
                bound_device_serial: editBoundSerial || null,
                proxy_host: editProxyHost || null,
                proxy_port: editProxyPort || null
            });
            toast.success("계정 및 프록시 설정이 수정되었습니다.");
            setEditProfile(null);
            fetchProfiles();
        } catch (e: any) {
            console.error(e);
            toast.error(e.response?.data?.detail || "수정 실패");
        } finally {
            setSavingEdit(false);
        }
    };

    const filteredProfiles = profiles.filter(p => {
        if (activeTab === 'ALL') return true;
        return p.platform === activeTab;
    });

    const tiktokCount = profiles.filter(p => p.platform === 'TIKTOK').length;
    const instaCount = profiles.filter(p => p.platform === 'INSTAGRAM').length;
    const douyinCount = profiles.filter(p => p.platform === 'DOUYIN').length;

    const getProxyLabel = (p: SocialProfile) => {
        if (p.proxy_mode === 'DIRECT_LTE') return { icon: '📱', label: 'LTE 모바일', color: 'text-blue-500 dark:text-blue-400' };
        if (p.proxy_mode === 'ISP_PROXY') return { icon: '🌐', label: `ISP: ${p.proxy_host || '설정 필요'}`, color: 'text-violet-500 dark:text-violet-400' };
        return { icon: '💻', label: '직접 연결', color: 'text-emerald-500 dark:text-emerald-400' };
    };

    return (
        <div className="space-y-3">

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                COMPACT HEADER  (TinCanVault 스타일)
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="flex items-center justify-between gap-2">
                {/* 좌측: 아이콘 + 제목 + 통계 배지 */}
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500/20 to-pink-500/20 border border-border/60 flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4 text-foreground" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-[13px] font-bold text-foreground leading-tight tracking-tight truncate">
                            소셜 미디어 계정 관리
                        </h2>
                        <p className="text-[10px] text-muted-foreground truncate">
                            YouTube와 완전 격리된 1등급 스텔스 브라우저 운영
                        </p>
                    </div>
                    {/* 인라인 통계 배지 */}
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 border border-border/60 text-[10px] font-semibold text-foreground">
                            <Users className="w-2.5 h-2.5 text-muted-foreground" />
                            {profiles.length}계정
                        </span>
                        {tiktokCount > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/8 border border-teal-500/20 text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                                <TikTokIcon className="w-2.5 h-2.5" />
                                {tiktokCount}
                            </span>
                        )}
                        {instaCount > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-500/8 border border-pink-500/20 text-[10px] font-semibold text-pink-700 dark:text-pink-300">
                                <InstagramIcon className="w-2.5 h-2.5" />
                                {instaCount}
                            </span>
                        )}
                        {douyinCount > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/8 border border-red-500/20 text-[10px] font-semibold text-red-700 dark:text-red-300">
                                <DouyinIcon className="w-2.5 h-2.5" />
                                {douyinCount}
                            </span>
                        )}
                    </div>
                </div>

                {/* 우측: 새로고침 + 계정 추가 드롭다운 */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl"
                        onClick={fetchProfiles}
                        disabled={loading}
                        title="새로고침"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="sm"
                                className="h-8 px-3 text-[11px] font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                계정 추가
                                <ChevronDown className="w-3 h-3 opacity-70" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                            <DropdownMenuItem
                                onClick={() => handleOpenWizard('TIKTOK')}
                                className="flex items-center gap-2 text-xs cursor-pointer py-2"
                            >
                                <TikTokIcon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                <span className="font-semibold">TikTok 계정 등록</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleOpenWizard('INSTAGRAM')}
                                className="flex items-center gap-2 text-xs cursor-pointer py-2"
                            >
                                <InstagramIcon className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
                                <span className="font-semibold">Instagram 계정 등록</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleOpenWizard('DOUYIN')}
                                className="flex items-center gap-2 text-xs cursor-pointer py-2"
                            >
                                <DouyinIcon className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                <span className="font-semibold">더우인(抖音) 계정 등록</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                TAB BAR
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="flex items-center gap-1 border-b border-border/60 pb-0">
                {/* 전체 탭 */}
                <button
                    onClick={() => setActiveTab('ALL')}
                    className={`flex items-center gap-1.5 h-8 px-3 text-xs font-semibold border-b-2 -mb-px transition-all duration-150 ${
                        activeTab === 'ALL'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    }`}
                >
                    <Activity className="w-3 h-3" />
                    전체 <span className="opacity-70">({profiles.length})</span>
                </button>

                {/* TikTok 탭 */}
                <button
                    onClick={() => setActiveTab('TIKTOK')}
                    className={`flex items-center gap-1.5 h-8 px-3 text-xs font-semibold border-b-2 -mb-px transition-all duration-150 ${
                        activeTab === 'TIKTOK'
                            ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                            : 'border-transparent text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-500/40'
                    }`}
                >
                    <TikTokIcon className="w-3 h-3" />
                    TikTok <span className="opacity-70">({tiktokCount})</span>
                </button>

                {/* Instagram 탭 */}
                <button
                    onClick={() => setActiveTab('INSTAGRAM')}
                    className={`flex items-center gap-1.5 h-8 px-3 text-xs font-semibold border-b-2 -mb-px transition-all duration-150 ${
                        activeTab === 'INSTAGRAM'
                            ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                            : 'border-transparent text-muted-foreground hover:text-pink-600 dark:hover:text-pink-400 hover:border-pink-500/40'
                    }`}
                >
                    <InstagramIcon className="w-3 h-3" />
                    Instagram <span className="opacity-70">({instaCount})</span>
                </button>

                {/* 더우인 탭 */}
                <button
                    onClick={() => setActiveTab('DOUYIN')}
                    className={`flex items-center gap-1.5 h-8 px-3 text-xs font-semibold border-b-2 -mb-px transition-all duration-150 ${
                        activeTab === 'DOUYIN'
                            ? 'border-red-500 text-red-600 dark:text-red-400'
                            : 'border-transparent text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/40'
                    }`}
                >
                    <DouyinIcon className="w-3 h-3" />
                    더우인 <span className="opacity-70">({douyinCount})</span>
                </button>
            </div>

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                CONTENT AREA
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {loading ? (
                /* 로딩 */
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">계정 목록 불러오는 중...</span>
                </div>

            ) : filteredProfiles.length === 0 ? (
                /* 빈 상태 */
                <div className="py-10 flex flex-col items-center gap-4 text-center">
                    {profiles.length === 0 ? (
                        <>
                            <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-dashed border-border flex items-center justify-center">
                                <Lock className="w-5 h-5 text-muted-foreground/60" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground mb-1">소셜 계정이 없습니다</p>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    TikTok / Instagram / 더우인 계정을 등록하면<br />
                                    전용 스텔스 브라우저로 안전하게 운영됩니다.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap justify-center">
                                <button
                                    onClick={() => handleOpenWizard('TIKTOK')}
                                    className="h-8 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                                >
                                    <TikTokIcon className="w-3.5 h-3.5" />
                                    TikTok 등록
                                </button>
                                <button
                                    onClick={() => handleOpenWizard('INSTAGRAM')}
                                    className="h-8 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                                >
                                    <InstagramIcon className="w-3.5 h-3.5" />
                                    Instagram 등록
                                </button>
                                <button
                                    onClick={() => handleOpenWizard('DOUYIN')}
                                    className="h-8 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                                >
                                    <DouyinIcon className="w-3.5 h-3.5" />
                                    더우인 등록
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-10 h-10 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center">
                                <Globe className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {activeTab === 'TIKTOK' ? 'TikTok' : activeTab === 'INSTAGRAM' ? 'Instagram' : '더우인'} 계정이 없습니다
                            </p>
                            <button
                                onClick={() => handleOpenWizard(activeTab as 'TIKTOK' | 'INSTAGRAM' | 'DOUYIN')}
                                className={`h-8 px-4 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 ${
                                    activeTab === 'TIKTOK'
                                        ? 'bg-teal-600 hover:bg-teal-700'
                                        : activeTab === 'INSTAGRAM'
                                            ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700'
                                            : 'bg-red-600 hover:bg-red-700'
                                } transition-all`}
                            >
                                <Plus className="w-3.5 h-3.5" />
                                {activeTab === 'TIKTOK' ? 'TikTok' : activeTab === 'INSTAGRAM' ? 'Instagram' : '더우인'} 등록
                            </button>
                        </>
                    )}
                </div>

            ) : (
                /* ── 계정 목록 (컴팩트 1열 리스트) ── */
                <div className="space-y-1.5">
                    {filteredProfiles.map((p) => {
                        const isLaunchingThis = launchingId === p.id;
                        const proxy = getProxyLabel(p);
                        const isActive = p.status === 'ACTIVE';

                        // 플랫폼별 스타일 맵 (TikTok/Instagram/Douyin 3항 분기)
                        const platformStyles = {
                            TIKTOK: {
                                card: 'border-teal-500/20 hover:border-teal-500/40 bg-card',
                                iconBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
                                icon: <TikTokIcon className="w-4 h-4" />,
                                divider: 'border-t border-teal-500/8',
                                btn: 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/15',
                            },
                            INSTAGRAM: {
                                card: 'border-pink-500/20 hover:border-pink-500/40 bg-card',
                                iconBg: 'bg-gradient-to-br from-pink-500/10 to-purple-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
                                icon: <InstagramIcon className="w-4 h-4" />,
                                divider: 'border-t border-pink-500/8',
                                btn: 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 shadow-pink-500/15',
                            },
                            DOUYIN: {
                                card: 'border-red-500/20 hover:border-red-500/40 bg-card',
                                iconBg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
                                icon: <DouyinIcon className="w-4 h-4" />,
                                divider: 'border-t border-red-500/8',
                                btn: 'bg-red-600 hover:bg-red-700 shadow-red-500/15',
                            },
                        };
                        const ps = platformStyles[p.platform as keyof typeof platformStyles] ?? platformStyles.TIKTOK;

                        return (
                            <div
                                key={p.id}
                                className={`group relative flex flex-col rounded-xl border transition-all duration-200 overflow-hidden ${ps.card}`}
                            >
                                {/* 상단 행: 아이콘 + 이름 + 상태 + 액션 버튼들 */}
                                <div className="flex items-center gap-2.5 px-3 py-2.5">
                                    {/* 플랫폼 아이콘 */}
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${ps.iconBg}`}>
                                        {ps.icon}
                                    </div>

                                    {/* 이름 + 아이디 */}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[12px] font-bold text-foreground truncate leading-tight">
                                            {p.name}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                                            {p.email || '@아이디 미지정'}
                                        </div>
                                    </div>

                                    {/* 상태 배지 */}
                                    <div className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${
                                        isActive
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        {isActive ? '운영 중' : '초안'}
                                    </div>

                                    {/* 설정 버튼 */}
                                    <button
                                        onClick={() => handleOpenQuickSettings(p)}
                                        title="프록시 설정"
                                        className="h-7 w-7 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/70 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all shrink-0"
                                    >
                                        <Settings className="w-3.5 h-3.5" />
                                    </button>

                                    {/* 삭제 버튼 */}
                                    <button
                                        onClick={() => handleDeleteProfile(p)}
                                        title="계정 삭제"
                                        className="h-7 w-7 rounded-lg border border-border/50 bg-muted/30 hover:bg-destructive/10 hover:border-destructive/30 text-muted-foreground hover:text-destructive flex items-center justify-center transition-all shrink-0"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* 하단 행: 엔진/프록시 정보 + 보안접속 버튼 */}
                                <div className={`flex items-center gap-2 px-3 pb-2.5 ${ps.divider} pt-2`}>
                                    {/* 엔진 + 프록시 정보 */}
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                            CloakBrowser
                                        </span>
                                        <span className="text-[10px] text-muted-foreground/40">·</span>
                                        <span className={`flex items-center gap-0.5 text-[10px] font-semibold truncate ${proxy.color}`}>
                                            {proxy.icon} {proxy.label}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground/40 font-mono truncate hidden sm:block">
                                            ID: {p.id.slice(0, 8)}…
                                        </span>
                                    </div>

                                    {/* 스텔스 보안 접속 버튼 */}
                                    <button
                                        onClick={() => handleLaunchBrowser(p)}
                                        disabled={isLaunchingThis}
                                        className={`shrink-0 h-7 px-3 rounded-lg text-[11px] font-bold text-white flex items-center gap-1 transition-all duration-200 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed ${ps.btn}`}
                                    >
                                        {isLaunchingThis ? (
                                            <>
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                기동 중...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-3 h-3" />
                                                스텔스 보안 접속
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                QUICK SETTINGS DIALOG
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <Dialog open={!!editProfile} onOpenChange={(open) => !open && setEditProfile(null)}>
                <DialogContent className="max-w-md bg-card border-border/80 text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold flex items-center gap-1.5">
                            <Settings className="w-4 h-4 text-primary" />
                            소셜 계정 설정 수정
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {editProfile?.name} — {editProfile?.platform}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-xs">
                        <div className="space-y-1">
                            <Label className="text-xs">계정 별칭</Label>
                            <Input
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="h-8 text-xs"
                                placeholder="예: 메인 TikTok 계정"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">아이디 / 핸들</Label>
                            <Input
                                value={editEmail}
                                onChange={e => setEditEmail(e.target.value)}
                                className="h-8 text-xs"
                                placeholder="@username"
                            />
                        </div>

                        <div className="space-y-1 pt-1 border-t border-border/50">
                            <Label className="text-xs font-bold">네트워크 프록시 모드</Label>
                            <Select value={editProxyMode} onValueChange={setEditProxyMode}>
                                <SelectTrigger className="h-8 text-xs bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DIRECT_LTE" className="text-xs">📱 LTE 모바일 폰 (USB EveryProxy)</SelectItem>
                                    <SelectItem value="ISP_PROXY" className="text-xs">🌐 고정 ISP 프록시</SelectItem>
                                    <SelectItem value="DIRECT" className="text-xs">💻 직접 연결 (Direct)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {editProxyMode === 'DIRECT_LTE' && (
                            <div className="space-y-1 bg-muted/30 p-2.5 rounded-lg border border-border/60">
                                <Label className="text-[11px]">바인딩 스마트폰 (USB 기기)</Label>
                                {devices.length > 0 ? (
                                    <Select value={editBoundSerial} onValueChange={setEditBoundSerial}>
                                        <SelectTrigger className="h-8 text-xs bg-background">
                                            <SelectValue placeholder="기기 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {devices.map((d: any) => (
                                                <SelectItem key={d.serial} value={d.serial} className="text-xs">
                                                    📱 {d.model || 'Phone'} ({d.serial}) • 포트 {d.port || 1080}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="text-[10px] text-muted-foreground">감지된 기기 없음 (기본 EveryProxy 1080 포트)</p>
                                )}
                            </div>
                        )}

                        {editProxyMode === 'ISP_PROXY' && (
                            <div className="grid grid-cols-3 gap-2 bg-muted/30 p-2.5 rounded-lg border border-border/60">
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-[11px]">호스트 (IP)</Label>
                                    <Input
                                        value={editProxyHost}
                                        onChange={e => setEditProxyHost(e.target.value)}
                                        className="h-8 text-xs"
                                        placeholder="127.0.0.1"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px]">포트</Label>
                                    <Input
                                        value={editProxyPort}
                                        onChange={e => setEditProxyPort(e.target.value)}
                                        className="h-8 text-xs"
                                        placeholder="1080"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-2 border-t border-border/60">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setEditProfile(null)}
                        >
                            취소
                        </Button>
                        <Button
                            size="sm"
                            className="h-8 text-xs font-bold bg-primary text-primary-foreground"
                            onClick={handleSaveQuickSettings}
                            disabled={savingEdit}
                        >
                            {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                            저장 완료
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Social Account Wizard */}
            <SocialAccountWizard
                isOpen={isWizardOpen}
                onClose={() => {
                    setIsWizardOpen(false);
                    setEditProfileData(null);
                }}
                onComplete={() => {
                    fetchProfiles();
                }}
                defaultPlatform={wizardPlatform}
                initialData={editProfileData}
            />
        </div>
    );
};

export default SocialAccountsManager;
