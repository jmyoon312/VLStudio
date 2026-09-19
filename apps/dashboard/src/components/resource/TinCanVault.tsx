import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Clock, ShieldCheck, Mail, Pencil, Trash2, AlertCircle, Settings, RefreshCw, FileJson, Lock, Sparkles, Loader2, Eye, EyeOff, Flame, RotateCcw } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import TinCanWizard from './TinCanWizard';
// @ts-ignore
import { useModalVisibility } from '@/features/flow2capcut/hooks/useModalVisibility';

import { WarmupButton } from './CaptainQuarters';
import { CultivationWizard } from './CultivationWizard';
import WarmupLogViewer from './WarmupLogViewer';

// API Base
const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://127.0.0.1:8000/api' : '/api';

interface TinCanVaultProps {
    mode?: 'vault' | 'incubator';
}

const ProfileApiStatus = ({ profileId }: { profileId: string }) => {
    const { data, isLoading } = useQuery({
        queryKey: ['oauth-status', profileId],
        queryFn: async () => (await axios.get(`${API_BASE}/oauth2/status/${profileId}`)).data,
        staleTime: 60000,
    });

    if (isLoading) return <span className="text-[9.5px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-bold animate-pulse border border-border shrink-0" title="API 상태 확인 중">API ⏳</span>;
    if (data?.authenticated) return <span className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold shrink-0" title="API 인증 완료">API 🟢</span>;
    return <span className="text-[9.5px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-bold shrink-0" title="API 미인증">API 🟡</span>;
};

const sanitizeChannelTitle = (title?: string) => {
    if (!title) return "브랜드 채널 미수집";
    // 뚊, 똠, 뚮옖, 釉뚮옖, ??, [??], (??) 등 인코딩 깨짐 및 비정상 접두사 완벽 복원 및 제거
    let cleaned = title
        .replace(/^(?:釉뚮옖|뚮옖|뚊|똠|뜀|땸|뚬|\?+)+[^\w가-힣\s]*/gi, '브랜드 ')
        .replace(/^[^\w가-힣\s\(\)]+/g, '')
        .replace(/\?+/g, '')
        .trim();

    if (cleaned.startsWith('브랜 ') || (cleaned.startsWith('브랜') && !cleaned.startsWith('브랜드'))) {
        cleaned = cleaned.replace(/^브랜(?:\s*)/, '브랜드 ');
    }

    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
        cleaned = cleaned.slice(1, -1).trim();
    }
    if (!cleaned) return "브랜드 채널 (연결됨)";
    return cleaned;
};



const TinCanVault = ({ mode = 'vault' }: TinCanVaultProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // UI States
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    const [draftData, setDraftData] = useState<any>(null); // For Resuming Draft
    const [editProfile, setEditProfile] = useState<any>(null); // For Edit Dialog
    const [deleteId, setDeleteId] = useState<string | null>(null); // For Delete Alert
    const [quarantineTarget, setQuarantineTarget] = useState<any>(null); // For Quarantine Dialog
    const [quarantineReason, setQuarantineReason] = useState("");
    const [quickNetworkProfile, setQuickNetworkProfile] = useState<any>(null); // For Quick Network Dialog
    const [syncingId, setSyncingId] = useState<string | null>(null);

    // [New] Seed Warmup & Brand Channel Creation States
    const [seedWarmingId, setSeedWarmingId] = useState<string | null>(null);
    const [createBrandTarget, setCreateBrandTarget] = useState<any>(null);
    const [newBrandName, setNewBrandName] = useState("");
    const [isCreatingBrand, setIsCreatingBrand] = useState(false);

    // Browser Visibility Toggle for Seed Warmup & Automation (Saved in localStorage)
    const [showBrowserWindow, setShowBrowserWindow] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('seed_warmup_visible');
            return saved !== null ? saved === 'true' : true;
        }
        return true;
    });

    const handleToggleBrowserWindow = (checked: boolean) => {
        setShowBrowserWindow(checked);
        if (typeof window !== 'undefined') {
            localStorage.setItem('seed_warmup_visible', String(checked));
        }
    };

    const editFileInputRef = useRef<HTMLInputElement>(null);
    const [editUploading, setEditUploading] = useState(false);
    
    // For Cultivation Wizard
    const [wizardOpen, setWizardOpen] = useState(false);
    const [selectedChannelForWizard, setSelectedChannelForWizard] = useState<any>(null);

    // For Warmup Log Viewer
    const [logViewerOpen, setLogViewerOpen] = useState(false);
    const [selectedChannelForLogs, setSelectedChannelForLogs] = useState<string>('');

    // @ts-ignore
    useModalVisibility(!!editProfile);
    // @ts-ignore
    useModalVisibility(!!quarantineTarget);
    // @ts-ignore
    useModalVisibility(!!deleteId);
    // @ts-ignore
    useModalVisibility(!!createBrandTarget);
    // @ts-ignore
    useModalVisibility(wizardOpen);

    // Fetch Profiles
    const { data: profiles, isLoading } = useQuery({
        queryKey: ['profiles'],
        queryFn: async () => (await axios.get(`${API_BASE}/resources/profiles?type=TIN_CAN`)).data
    });

    // Fetch Channels (always enabled for real-time brand channel rendering)
    const { data: channels } = useQuery({
        queryKey: ['youtube-channels'],
        queryFn: async () => (await axios.get(`${API_BASE}/youtube/all`)).data
    });

    const activeOps = profiles?.filter((p: any) => p.status !== 'QUARANTINED' && p.usage_type !== 'DEEP_RESEARCH') || [];
    const quarantinedOps = profiles?.filter((p: any) => p.status === 'QUARANTINED' && p.usage_type !== 'DEEP_RESEARCH') || [];

    // Multi-Selection State
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    const isAllSelected = activeOps.length > 0 && selectedIds.length === activeOps.length;

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(activeOps.map((p: any) => p.id));
        }
    };

    const handleToggleSelectProfile = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleClearSelection = () => {
        setSelectedIds([]);
    };

    const selectedProfiles = activeOps.filter((p: any) => selectedIds.includes(p.id));
    const selectedWithChannel = selectedProfiles.filter((p: any) => {
        return channels?.some((c: any) => c.owner_profile_id === p.id || c.channel_id === p.channel_id);
    });
    const selectedNeedSeed = selectedProfiles.filter((p: any) => {
        const hasChannel = channels?.some((c: any) => c.owner_profile_id === p.id || c.channel_id === p.channel_id);
        return !hasChannel && p.incubation_status !== 'WARMED';
    });

    const handleBulkSeedWarmup = async () => {
        if (selectedIds.length === 0) return;
        setBulkActionLoading(true);
        toast({
            title: `🌱 선택 계정 시드 예열 시작 (${selectedIds.length}개)`,
            description: showBrowserWindow
                ? "스텔스 창이 순차적으로 열리며 계정별 3편씩 시청합니다."
                : "백그라운드에서 순차적으로 안전하게 시드 예열이 진행됩니다."
        });
        try {
            const res = await axios.post(`${API_BASE}/resources/profiles/bulk-seed-warmup`, {
                profile_ids: selectedIds,
                video_count: 3,
                visible: showBrowserWindow
            });
            if (res.data?.success) {
                toast({
                    title: "✅ 일괄 시드 예열 접수 완료",
                    description: res.data.message || `${res.data.started}개 계정이 백그라운드 큐에 등록되었습니다.`
                });
                queryClient.invalidateQueries({ queryKey: ['profiles'] });
            } else {
                throw new Error(res.data?.message || "일괄 시드 예열 요청 실패");
            }
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "시드 예열 요청 실패",
                description: err.response?.data?.detail || err.message || "오류가 발생했습니다."
            });
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkChannelWarmup = async () => {
        const targetChannelIds = selectedWithChannel.map((p: any) => {
            const ch = channels?.find((c: any) => c.owner_profile_id === p.id || c.channel_id === p.channel_id);
            return ch?.channel_id;
        }).filter(Boolean);

        if (targetChannelIds.length === 0) {
            toast({
                variant: "destructive",
                title: "채널 없음",
                description: "선택된 계정 중 연동된 유튜브 채널이 없습니다."
            });
            return;
        }

        setBulkActionLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/youtube/warmup/bulk/start`, {
                channel_ids: targetChannelIds
            });
            toast({
                title: "🔥 선택 채널 웜업 시작",
                description: `${res.data.started}개 채널의 육성이 백그라운드에서 시작되었습니다.`
            });
            queryClient.invalidateQueries({ queryKey: ['bulk-warmup-status'] });
            queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "채널 웜업 실패",
                description: err.response?.data?.detail || err.message || "오류가 발생했습니다."
            });
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkSyncChannels = async () => {
        if (selectedIds.length === 0) return;
        setBulkActionLoading(true);
        toast({
            title: "🔄 선택 계정 채널 연동 시작",
            description: `${selectedIds.length}개 계정의 브랜드 채널 정보를 순차 조회합니다.`
        });
        let successCount = 0;
        for (const pid of selectedIds) {
            try {
                await axios.post(`${API_BASE}/resources/profiles/${pid}/sync-channel`);
                successCount++;
            } catch {
                // continue
            }
        }
        toast({
            title: "✅ 채널 연동 완료",
            description: `${successCount}/${selectedIds.length}개 계정의 채널 정보가 업데이트되었습니다.`
        });
        queryClient.invalidateQueries({ queryKey: ['profiles'] });
        queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
        setBulkActionLoading(false);
    };

    // Mutations
    const updateMutation = useMutation({
        mutationFn: async (data: any) => await axios.put(`${API_BASE}/resources/profiles/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            setEditProfile(null);
            toast({ title: "수정 완료", description: "계정 정보가 업데이트되었습니다." });
        },
        onError: (e: any) => {
            const msg = e.response?.status === 409 ? "이미 존재하는 이메일입니다." : "업데이트 실패";
            toast({ variant: "destructive", title: "수정 실패", description: msg });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => await axios.delete(`${API_BASE}/resources/profiles/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            setDeleteId(null);
            toast({ title: "삭제 완료", description: "프로필과 폴더가 영구 삭제되었습니다." });
        },
        onError: () => toast({ variant: "destructive", title: "삭제 실패", description: "서버 오류 발생" })
    });

    const quarantineMutation = useMutation({
        mutationFn: async () => await axios.post(`${API_BASE}/resources/profiles/${quarantineTarget.id}/quarantine`, { reason: quarantineReason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            setQuarantineTarget(null);
            setQuarantineReason("");
            toast({ title: "격리 조치 완료", description: "계정이 90일간 격리됩니다." });
        },
        onError: () => toast({ variant: "destructive", title: "격리 실패", description: "서버 통신 오류" })
    });

    const releaseMutation = useMutation({
        mutationFn: async (id: string) => await axios.post(`${API_BASE}/resources/profiles/${id}/release`, {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            toast({ title: "격리 해제 완료", description: "정상 운영 상태로 복귀했습니다." });
        }
    });

    // Handlers
    const handleEditSave = () => {
        if (!editProfile) return;
        updateMutation.mutate(editProfile);
    };

    const handleDeleteConfirm = () => {
        if (deleteId) deleteMutation.mutate(deleteId);
    };

    const handleQuarantineConfirm = () => {
        if (quarantineTarget && quarantineReason) quarantineMutation.mutate();
    };

    const handleResumeDraft = (p: any) => {
        setDraftData(p);
        setIsWizardOpen(true);
    };

    const getDDay = (startDate: string) => {
        if (!startDate) return "D-??";
        const start = new Date(startDate).getTime();
        const end = start + (90 * 24 * 60 * 60 * 1000); // +90 days
        const now = new Date().getTime();
        const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        return diff > 0 ? `D-${diff}` : "Expire";
    };

    const handleSecureConnect = async (p: any) => {
        toast({ title: "🛡️ 보안 터널링 초기화", description: "IP 세탁 후 스튜디오에 접속합니다. (약 10-20초 소요)" });
        try {
            const res = await axios.post(`${API_BASE}/resources/profiles/${p.id}/launch-setup`, {
                rotate_ip: false
            });

            if (res.data.status === 'launched') {
                toast({ title: "🚀 보안 접속 성공", description: "유튜브 스튜디오가 실행되었습니다." });
            } else {
                throw new Error(res.data.msg || "Launch failed");
            }
        } catch (e: any) {
            console.error(e);
            toast({ variant: "destructive", title: "접속 실패", description: e.response?.data?.detail || "백엔드 연결을 확인해주세요." });
        }
    };

    const handleSyncChannel = async (profileId: string) => {
        setSyncingId(profileId);
        try {
            const res = await axios.post(`${API_BASE}/resources/profiles/${profileId}/sync-channel`);
            toast({
                title: "🔄 브랜드 채널 수집 완료",
                description: `채널 정보가 성공적으로 동기화되었습니다. (${res.data.brand_name || res.data.channel_id})`
            });
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
        } catch (e: any) {
            console.error("Sync error:", e);
            toast({ variant: "destructive", title: "동기화 실패", description: "채널 정보를 가져오지 못했습니다." });
        } finally {
            setSyncingId(null);
        }
    };

    const handleStartSeedWarmup = async (profileId: string) => {
        setSeedWarmingId(profileId);
        toast({
            title: `🌱 1단계 시드 예열 시작 (${showBrowserWindow ? '화면 표시' : '백그라운드'})`,
            description: showBrowserWindow
                ? "스텔스 브라우저 창이 열리며 타겟 영상 3편을 시청하여 계정 신뢰도를 구축합니다."
                : "백그라운드(헤드리스)에서 조용히 타겟 영상 3편을 시청하여 계정 신뢰도를 구축합니다."
        });
        try {
            const res = await axios.post(`${API_BASE}/resources/profiles/${profileId}/seed-warmup`, {
                video_count: 3,
                visible: showBrowserWindow
            });
            if (res.data?.success) {
                queryClient.invalidateQueries({ queryKey: ['profiles'] });
                
                // Poll progress until completion or timeout (max 4 minutes)
                const startTime = Date.now();
                const pollInterval = setInterval(async () => {
                    try {
                        const progressRes = await axios.get(`${API_BASE}/resources/profiles/${profileId}/seed-warmup-progress`);
                        const status = progressRes.data?.incubation_status;
                        const progMsg = progressRes.data?.progress?.message;
                        
                        if (status === 'WARMED') {
                            clearInterval(pollInterval);
                            setSeedWarmingId(null);
                            queryClient.invalidateQueries({ queryKey: ['profiles'] });
                            toast({
                                title: "🎉 시드 예열 완료",
                                description: "영상 3편 시청 완료! 이제 2단계 브랜드 채널을 안전하게 개설할 수 있습니다."
                            });
                        } else if (status === 'NEWBORN' && (Date.now() - startTime > 12000)) {
                            clearInterval(pollInterval);
                            setSeedWarmingId(null);
                            queryClient.invalidateQueries({ queryKey: ['profiles'] });
                            toast({
                                variant: "destructive",
                                title: "시드 예열 미완료",
                                description: progMsg || "동영상 감지 또는 로그인 확인을 확인해 주세요."
                            });
                        } else if (Date.now() - startTime > 240000) {
                            clearInterval(pollInterval);
                            setSeedWarmingId(null);
                            queryClient.invalidateQueries({ queryKey: ['profiles'] });
                        }
                    } catch {
                        // ignore transient polling errors
                    }
                }, 4000);
            } else {
                throw new Error(res.data?.error || "시드 예열에 실패했습니다.");
            }
        } catch (e: any) {
            console.error("Seed Warmup Error:", e);
            setSeedWarmingId(null);
            toast({
                variant: "destructive",
                title: "시드 예열 실패",
                description: e.response?.data?.detail || e.message || "시드 예열 중 오류가 발생했습니다."
            });
        }
    };

    const handleResetProfileStatus = async (profileId: string) => {
        try {
            const res = await axios.post(`${API_BASE}/resources/profiles/${profileId}/reset-status`);
            toast({
                title: "🔄 상태 초기화 완료",
                description: res.data?.message || "프로필 상태가 정상 초기화되었습니다."
            });
            if (seedWarmingId === profileId) {
                setSeedWarmingId(null);
            }
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
        } catch (e: any) {
            toast({
                variant: "destructive",
                title: "상태 초기화 실패",
                description: e.response?.data?.detail || e.message || "오류가 발생했습니다."
            });
        }
    };

    const handleCreateBrandChannel = async () => {
        if (!createBrandTarget) return;
        setIsCreatingBrand(true);
        toast({
            title: "✨ 브랜드 채널 자동 개설 시작",
            description: "인간형 내비게이션을 통해 브랜드 채널을 자동 생성 중입니다. (약 30~60초 소요)"
        });
        try {
            const res = await axios.post(`${API_BASE}/resources/profiles/${createBrandTarget.id}/create-brand-channel`, {
                brand_name: newBrandName.trim()
            });
            if (res.data?.success) {
                toast({
                    title: "🎉 브랜드 채널 개설 성공",
                    description: `'${res.data.brand_name}' 채널이 성공적으로 개설되고 연동되었습니다!`
                });
                setCreateBrandTarget(null);
                setNewBrandName("");
                queryClient.invalidateQueries({ queryKey: ['profiles'] });
                queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
            } else {
                throw new Error(res.data?.error || "채널 개설에 실패했습니다.");
            }
        } catch (e: any) {
            console.error("Brand Channel Create Error:", e);
            toast({
                variant: "destructive",
                title: "채널 개설 실패",
                description: e.response?.data?.detail || e.message || "채널 생성 중 오류가 발생했습니다."
            });
        } finally {
            setIsCreatingBrand(false);
        }
    };

    const handleEditFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, profileId: string) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setEditUploading(true);
        try {
            await axios.post(`${API_BASE}/resources/profiles/${profileId}/upload-key`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast({ title: "업로드 성공", description: "API 키 파일이 성공적으로 저장되었습니다." });
        } catch (e: any) {
            console.error("Upload Error:", e);
            toast({ variant: "destructive", title: "업로드 실패", description: e.response?.data?.detail || "파일 저장에 실패했습니다." });
        } finally {
            setEditUploading(false);
            if (editFileInputRef.current) editFileInputRef.current.value = "";
        }
    };

    const handleEditAuth = async (profileId: string) => {
        try {
            await axios.post(`${API_BASE}/oauth2/authenticate/${profileId}`);
            toast({ title: "인증 브라우저 실행", description: "로그인된 창이 열립니다. 권한을 승인해주세요." });
        } catch (e) {
            toast({ variant: "destructive", title: "실행 실패", description: "격리 브라우저를 띄울 수 없습니다." });
        }
    };

    const renderRow = (p: any, isQuarantined: boolean) => {
        const channel = channels?.find((c: any) => c.owner_profile_id === p.id || c.channel_id === p.channel_id);
        const isSelected = selectedIds.includes(p.id);
        
        return (
        <TableRow key={p.id} className={`transition-colors ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-muted/40'}`}>
            {!isQuarantined && (
                <TableCell className="w-[44px] pl-4 pr-0 align-middle">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelectProfile(p.id)}
                        aria-label={`Select profile ${p.email || p.id}`}
                    />
                </TableCell>
            )}
            <TableCell className="align-middle">
                <Badge variant="outline" className={
                    p.status?.toLowerCase() === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold px-2 py-0.5' :
                        p.status?.toLowerCase() === 'draft' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 px-2 py-0.5' :
                            p.status?.toUpperCase() === 'QUARANTINED' ? 'bg-destructive/10 text-destructive border-destructive/20 px-2 py-0.5' :
                                'bg-muted text-muted-foreground px-2 py-0.5'
                }>
                    {p.status ? p.status.toUpperCase() : 'UNKNOWN'}
                </Badge>
            </TableCell>

            <TableCell className="align-middle">
                <div className="flex flex-col gap-1.5 py-1">
                    <div className="flex items-center gap-2 font-bold text-foreground text-xs whitespace-nowrap">
                        <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
                        {p.email ? <span className="font-mono text-foreground">{p.email}</span> : (
                            <span className="text-muted-foreground italic flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> 미설정 ({p.id.slice(0, 6)})
                            </span>
                        )}
                        {channel?.warmup_status === 'RUNNING' && (
                            <Badge variant="outline" className="border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10 text-[10px] h-5 animate-pulse shrink-0">
                                🔥 WARMUP
                            </Badge>
                        )}
                        <ProfileApiStatus profileId={p.id} />
                    </div>
                    
                    {/* 브랜드 채널 정보 및 수집/개설 상태 */}
                    {channel ? (
                        <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                            <span className="font-semibold text-foreground bg-muted/60 px-2.5 py-0.5 rounded flex items-center gap-1.5 border border-border">
                                <span className="text-sm">📺</span>
                                <span className="font-medium text-foreground">{sanitizeChannelTitle(channel?.title || channel?.channel_name)}</span>
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 border-border shrink-0 shadow-2xs"
                                title="유튜브 스튜디오 접속 후 브랜드 채널명 자동 수집"
                                onClick={() => handleSyncChannel(p.id)}
                                disabled={syncingId === p.id}
                            >
                                <RefreshCw className={`w-3 h-3 mr-1 ${syncingId === p.id ? 'animate-spin text-primary' : ''}`} />
                                {syncingId === p.id ? '수집 중...' : '채널 수집'}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                            {p.incubation_status === 'WARMING' || seedWarmingId === p.id ? (
                                <span className="text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                                    <Loader2 className="w-3 h-3 animate-spin" /> 🌱 1단계 시드 예열 시청 중...
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleResetProfileStatus(p.id);
                                        }}
                                        className="text-[10px] underline ml-1 text-blue-500 hover:text-destructive cursor-pointer"
                                        title="고착된 예열 상태 즉시 초기화"
                                    >
                                        초기화
                                    </button>
                                </span>
                            ) : p.incubation_status === 'WARMED' ? (
                                <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1">
                                    ✨ 예열 완료 ({p.seed_history_count || 3}편 시청됨) • 개설 대기
                                </span>
                            ) : (
                                <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1">
                                    🌱 1단계: 계정 시드 예열 필요
                                </span>
                            )}
                        </div>
                    )}
                    {isQuarantined && <span className="text-xs text-destructive mt-0.5">사유: {p.quarantine_reason}</span>}
                </div>
            </TableCell>
            
            {/* 엔진 & 네트워크 IP 종류 시각화 및 설정 변경 */}
            <TableCell className="align-middle">
                <div className="flex flex-col gap-1.5 py-1 text-xs">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="text-[11px] text-muted-foreground font-medium">엔진:</span>
                        <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-semibold text-[11px] border border-indigo-500/20">
                            {p.engine_type === 'ixbrowser' ? '🌐 iXBrowser' : '🛡️ CloakBrowser'}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${p.proxy_mode === 'ISP_PROXY' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'}`}>
                            {p.proxy_mode === 'ISP_PROXY' ? '🌐 ISP 고정 IP' : '📱 LTE 모바일'}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground border-border shrink-0 font-semibold"
                            title="엔진 및 프록시 IP 설정 변경"
                            onClick={() => setQuickNetworkProfile({ ...p })}
                        >
                            <Settings className="w-3 h-3 mr-0.5 text-muted-foreground" /> 설정
                        </Button>
                    </div>
                    {p.proxy_mode === 'ISP_PROXY' && p.proxy_host && (
                        <span className="text-[10px] text-muted-foreground font-mono" title={`${p.proxy_username ? p.proxy_username + '@' : ''}${p.proxy_host}:${p.proxy_port}`}>
                            {p.proxy_username ? `${p.proxy_username}@` : ''}{p.proxy_host}:{p.proxy_port}
                        </span>
                    )}
                </div>
            </TableCell>
            
            {/* 운영 제어 (Operation Controls) */}
            <TableCell className="align-middle">
                <div className="flex items-center gap-2 py-1 whitespace-nowrap">
                    {p.status?.toLowerCase() === 'active' && (
                        <Button
                            variant="default"
                            size="sm"
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs border-emerald-600 shrink-0"
                            onClick={() => handleSecureConnect(p)}
                            title="유튜브 스튜디오 관리자 대시보드(studio.youtube.com) 직접 보안 접속"
                        >
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> 🛡️ 스텔스 보안 접속
                        </Button>
                    )}
                    
                    {!isQuarantined && p.status?.toLowerCase() === 'active' && (
                        <div className="flex items-center gap-1.5 border-l border-border pl-2 shrink-0">
                            {channel ? (
                                <>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-8 text-xs text-primary border-border hover:bg-muted font-semibold"
                                        onClick={() => {
                                            setSelectedChannelForWizard(channel); 
                                            setWizardOpen(true);
                                        }}
                                    >
                                        전략 설정
                                    </Button>
                                    <WarmupButton 
                                        channel={channel} 
                                        profileId={p.id} 
                                        onNeedSync={() => handleSyncChannel(p.id)}
                                        showBrowserWindow={showBrowserWindow}
                                        onOpenLogs={(channelId) => {
                                            setSelectedChannelForLogs(channelId);
                                            setLogViewerOpen(true);
                                        }}
                                        onOpenWizard={() => {
                                            setSelectedChannelForWizard(channel);
                                            setWizardOpen(true);
                                        }}
                                    />
                                </>
                            ) : p.incubation_status === 'WARMING' || seedWarmingId === p.id ? (
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled
                                        className="h-8 text-xs text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 bg-blue-500/10 font-bold shrink-0"
                                    >
                                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> 예열 진행 중...
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleResetProfileStatus(p.id)}
                                        title="고착된 예열 상태 초기화"
                                        className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 font-medium"
                                    >
                                        초기화
                                    </Button>
                                </div>
                            ) : p.incubation_status === 'WARMED' ? (
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        size="sm"
                                        variant="default"
                                        className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs border-indigo-600 shrink-0"
                                        onClick={() => {
                                            setCreateBrandTarget(p);
                                            const suggested = p.email ? p.email.split('@')[0] : `채널_${p.id.slice(0, 4)}`;
                                            setNewBrandName(suggested);
                                        }}
                                        title="인간형 내비게이션으로 안전하게 브랜드 채널을 자동 개설합니다."
                                    >
                                        <Sparkles className="w-3.5 h-3.5 mr-1" /> ✨ 브랜드 채널 자동 개설
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs text-muted-foreground hover:text-foreground border-border hover:bg-muted font-medium shrink-0"
                                        onClick={() => handleSyncChannel(p.id)}
                                        disabled={syncingId === p.id}
                                        title="이미 개설된 유튜브 채널이나 3단계 인증을 마친 기존 채널을 즉시 연동합니다."
                                    >
                                        <RefreshCw className={`w-3 h-3 mr-1 ${syncingId === p.id ? 'animate-spin text-primary' : ''}`} />
                                        {syncingId === p.id ? '수집 중...' : '기존 채널 연동'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        size="sm"
                                        variant="default"
                                        className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs border-amber-600 shrink-0"
                                        onClick={() => handleStartSeedWarmup(p.id)}
                                        disabled={seedWarmingId === p.id || syncingId === p.id}
                                    >
                                        {seedWarmingId === p.id ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> 예열 진행 중...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-3.5 h-3.5 mr-1" /> 📱 1단계 시드 예열 {showBrowserWindow ? '(화면 표시)' : '(백그라운드)'}
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs text-primary border-border hover:bg-muted font-semibold shrink-0"
                                        onClick={() => handleSyncChannel(p.id)}
                                        disabled={syncingId === p.id || seedWarmingId === p.id}
                                        title="이미 채널 개설 및 3단계 고급 인증을 마친 계정은 시드 예열 없이 즉시 채널을 수집하여 연동합니다."
                                    >
                                        <RefreshCw className={`w-3 h-3 mr-1 ${syncingId === p.id ? 'animate-spin text-primary' : ''}`} />
                                        {syncingId === p.id ? '수집 중...' : '🔍 기존 채널 연동 (3단계)'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </TableCell>
            
            {/* 최근 활동 (Recent Activity) */}
            <TableCell className="text-right text-xs text-slate-500 align-middle whitespace-nowrap">
                <div className="flex flex-col items-end gap-1">
                    {isQuarantined ? (
                        <Badge variant="destructive" className="font-mono text-[10px]">{getDDay(p.quarantine_start_date)}</Badge>
                    ) : (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${p.folder_path && p.status?.toLowerCase() === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                            {p.status?.toLowerCase() === 'active' ? "READY" : "PENDING"}
                        </span>
                    )}
                    <div className="flex items-center text-[10px]">
                        <Clock className="w-3 h-3 mr-1" />
                        {isQuarantined
                            ? (p.quarantine_start_date ? new Date(p.quarantine_start_date).toLocaleDateString() : '-')
                            : (p.last_used_at ? new Date(p.last_used_at).toLocaleDateString() : '활동 없음')}
                    </div>
                </div>
            </TableCell>
            
            {/* 관리 (Management) */}
            <TableCell className="align-middle">
                <div className="flex gap-1 justify-end">
                    {!isQuarantined ? (
                        <>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                                onClick={() => handleResetProfileStatus(p.id)} title="상태 및 예열 작업 강제 초기화"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                onClick={() => (p.status?.toLowerCase() === 'draft' || p.status?.toLowerCase() === 'pending') ? handleResumeDraft(p) : setEditProfile(p)}
                            >
                                <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-500"
                                onClick={() => setQuarantineTarget(p)} title="격리 조치"
                            >
                                <AlertCircle className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600"
                                onClick={() => setDeleteId(p.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </>
                    ) : (
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => releaseMutation.mutate(p.id)}>
                            격리 해제
                        </Button>
                    )}
                </div>
            </TableCell>
        </TableRow>
        );
    };

    return (
        <div className="space-y-8">
            {/* Active Ops Section */}
            <Card className="shadow-2xs border-border bg-card">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-foreground">
                            <ShieldCheck className="w-5 h-5 text-indigo-500" />
                            구글/유튜브 채널 계정 목록
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5">
                            스텔스 브라우저로 핑거프린트가 완벽히 격리된 안전 프로필 생성 및 관리
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center self-end sm:self-auto">
                        {/* Browser Window Visibility Switch */}
                        <div className="flex items-center gap-2 px-3 py-1 rounded-xl border border-border bg-card shadow-2xs text-xs">
                            <Switch
                                id="vault-browser-visible-toggle"
                                checked={showBrowserWindow}
                                onCheckedChange={handleToggleBrowserWindow}
                                className="scale-75"
                            />
                            <Label
                                htmlFor="vault-browser-visible-toggle"
                                className="text-xs cursor-pointer select-none font-medium flex items-center gap-1.5 text-foreground"
                            >
                                {showBrowserWindow ? <Eye className="w-3.5 h-3.5 text-blue-500 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                                <span>창 표시: <strong className={showBrowserWindow ? "text-blue-600 dark:text-blue-400 font-bold" : "text-muted-foreground font-normal"}>{showBrowserWindow ? "켜짐 (화면 표시)" : "꺼짐 (백그라운드)"}</strong></span>
                            </Label>
                        </div>

                        <Button onClick={() => { setDraftData(null); setIsWizardOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-8 text-xs shadow-2xs">
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> 새 계정 등록
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Multi-Select Floating / Sticky Action Bar */}
                    {selectedIds.length > 0 && (
                        <div className="mx-3 sm:mx-4 my-3 p-3 sm:p-3.5 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-bold px-2.5 py-1 text-xs">
                                    선택: {selectedIds.length}개 계정
                                </Badge>
                                {selectedNeedSeed.length > 0 && (
                                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                        (시드 예열 대상 {selectedNeedSeed.length}개)
                                    </span>
                                )}
                                {selectedWithChannel.length > 0 && (
                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                        (채널 연동됨 {selectedWithChannel.length}개)
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                                <Button
                                    size="sm"
                                    onClick={handleBulkSeedWarmup}
                                    disabled={bulkActionLoading}
                                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-8 text-xs shadow-2xs"
                                >
                                    {bulkActionLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                                    🌱 선택 시드 예열 ({selectedIds.length}개)
                                </Button>

                                {selectedWithChannel.length > 0 && (
                                    <Button
                                        size="sm"
                                        onClick={handleBulkChannelWarmup}
                                        disabled={bulkActionLoading}
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-8 text-xs shadow-2xs"
                                    >
                                        <Flame className="w-3.5 h-3.5 mr-1.5" />
                                        🔥 선택 채널 웜업 ({selectedWithChannel.length}개)
                                    </Button>
                                )}

                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleBulkSyncChannels}
                                    disabled={bulkActionLoading}
                                    className="border-border text-foreground hover:bg-muted font-medium h-8 text-xs shadow-2xs"
                                >
                                    <RefreshCw className="w-3 h-3 mr-1.5" />
                                    채널 일괄 연동
                                </Button>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleClearSelection}
                                    disabled={bulkActionLoading}
                                    className="text-muted-foreground hover:text-foreground h-8 text-xs px-2"
                                >
                                    선택 해제
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 모바일 전용 계정 카드 리스트 (md:hidden) */}
                    <div className="md:hidden p-3 space-y-3">
                        {isLoading ? (
                            <div className="text-center py-8 text-xs text-muted-foreground">로딩 중...</div>
                        ) : activeOps.length === 0 ? (
                            <div className="text-center py-8 text-xs text-muted-foreground">운영 중인 계정이 없습니다.</div>
                        ) : (
                            activeOps.map((p: any) => {
                                const channel = channels?.find((c: any) => c.owner_profile_id === p.id || c.channel_id === p.channel_id);
                                const emailText = p.email || `미설정 (${p.id.slice(0, 6)})`;
                                const cleanTitle = sanitizeChannelTitle(channel?.title || channel?.channel_name);
                                const isSelected = selectedIds.includes(p.id);

                                return (
                                    <div key={p.id} className={`space-y-3 rounded-2xl p-4 border shadow-xs transition-colors ${isSelected ? 'bg-primary/5 dark:bg-primary/10 border-primary/30' : 'bg-card border-border'}`}>
                                        {/* 1. 상단: 상태 배지 + 이메일 + 관리 아이콘 */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => handleToggleSelectProfile(p.id)}
                                                    aria-label={`Select profile ${p.email || p.id}`}
                                                    className="shrink-0"
                                                />
                                                <Badge variant="outline" className={
                                                    p.status?.toLowerCase() === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold px-2 py-0.5 text-[10px]' :
                                                        p.status?.toLowerCase() === 'draft' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 px-2 py-0.5 text-[10px]' :
                                                            'bg-muted text-muted-foreground px-2 py-0.5 text-[10px]'
                                                }>
                                                    {p.status ? p.status.toUpperCase() : 'UNKNOWN'}
                                                </Badge>
                                                <span className="font-bold text-xs sm:text-sm text-foreground truncate" title={emailText}>
                                                    {emailText}
                                                </span>
                                            </div>

                                            {/* 우측 관리 아이콘 */}
                                            <div className="flex items-center gap-0.5 shrink-0">
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                                                    onClick={() => handleResetProfileStatus(p.id)}
                                                    title="상태 및 예열 초기화"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                    onClick={() => (p.status?.toLowerCase() === 'draft' || p.status?.toLowerCase() === 'pending') ? handleResumeDraft(p) : setEditProfile(p)}
                                                    title="계정 정보 수정"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setQuarantineTarget(p)} title="격리 조치"
                                                >
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setDeleteId(p.id)}
                                                    title="계정 삭제"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* 2. 중단: 브랜드 채널 및 환경 정보 인셋 카드 */}
                                        <div className="bg-muted/40 rounded-xl p-3 border border-border/70 space-y-2.5">
                                            {/* 채널명 & 수집 버튼 or 예열 상태 */}
                                            {channel ? (
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="text-sm">📺</span>
                                                        <span className="font-semibold text-xs text-foreground truncate">{cleanTitle}</span>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-6 px-2.5 text-[11px] font-semibold text-primary hover:bg-primary/10 border-border shrink-0 shadow-2xs"
                                                        onClick={() => handleSyncChannel(p.id)}
                                                        disabled={syncingId === p.id}
                                                    >
                                                        <RefreshCw className={`w-3 h-3 mr-1 ${syncingId === p.id ? 'animate-spin text-primary' : ''}`} />
                                                        {syncingId === p.id ? '수집 중' : '수집'}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    {p.incubation_status === 'WARMING' || seedWarmingId === p.id ? (
                                                        <span className="text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                                                            <Loader2 className="w-3 h-3 animate-spin" /> 🌱 1단계 시드 예열 시청 중...
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleResetProfileStatus(p.id);
                                                                }}
                                                                className="text-[10px] underline ml-1 text-blue-500 hover:text-destructive cursor-pointer"
                                                                title="고착된 예열 상태 즉시 초기화"
                                                            >
                                                                초기화
                                                            </button>
                                                        </span>
                                                    ) : p.incubation_status === 'WARMED' ? (
                                                        <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1">
                                                            ✨ 예열 완료 ({p.seed_history_count || 3}편) • 개설 대기
                                                        </span>
                                                    ) : (
                                                        <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1">
                                                            🌱 1단계: 계정 시드 예열 필요
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* 엔진 / 프록시 / API 인증 뱃지 & 설정 버튼 */}
                                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <ProfileApiStatus profileId={p.id} />
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-border bg-muted text-foreground">
                                                        {p.engine_type === 'ixbrowser' ? '🌐 iXBrowser' : '🛡️ Cloak'}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${p.proxy_mode === 'ISP_PROXY' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800'}`}>
                                                        {p.proxy_mode === 'ISP_PROXY' ? '🌐 ISP 고정' : '📱 LTE 모바일'}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground font-medium shrink-0"
                                                    onClick={() => setQuickNetworkProfile({ ...p })}
                                                >
                                                    <Settings className="w-3 h-3 mr-1" /> 설정
                                                </Button>
                                            </div>
                                        </div>

                                        {/* 3. 하단 운영 제어: 스텔스 접속 & 웜업 육성 제어 */}
                                        {p.status?.toLowerCase() === 'active' && (
                                            <div className="space-y-2.5 pt-1 border-t border-border/60">
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="w-full h-8.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center justify-center gap-1.5 rounded-xl"
                                                    onClick={() => handleSecureConnect(p)}
                                                >
                                                    <ShieldCheck className="w-4 h-4" /> 🛡️ 스텔스 보안 접속
                                                </Button>

                                                {/* 웜업 및 채널 개설 제어 영역 */}
                                                {channel ? (
                                                    <div className="bg-muted/30 rounded-xl p-2.5 border border-border/50 space-y-2">
                                                        <WarmupButton 
                                                            channel={channel} 
                                                            profileId={p.id} 
                                                            onNeedSync={() => handleSyncChannel(p.id)}
                                                            showBrowserWindow={showBrowserWindow}
                                                            onOpenLogs={(channelId) => {
                                                                setSelectedChannelForLogs(channelId);
                                                                setLogViewerOpen(true);
                                                            }}
                                                            onOpenWizard={() => {
                                                                setSelectedChannelForWizard(channel);
                                                                setWizardOpen(true);
                                                            }}
                                                            layout="stacked"
                                                        />
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="w-full h-7 text-xs text-primary border-border hover:bg-muted font-semibold rounded-lg"
                                                            onClick={async () => {
                                                                setSelectedChannelForWizard(channel); 
                                                                setWizardOpen(true);
                                                            }}
                                                        >
                                                            ⚙️ 웜업 전략 설정 마법사
                                                        </Button>
                                                    </div>
                                                ) : p.incubation_status === 'WARMING' || seedWarmingId === p.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled
                                                            className="flex-1 h-8.5 text-xs text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 bg-blue-500/10 font-bold rounded-xl"
                                                        >
                                                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> 🌱 시드 예열 진행 중...
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleResetProfileStatus(p.id)}
                                                            className="h-8.5 px-3 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl font-medium shrink-0"
                                                            title="고착된 예열 상태 초기화"
                                                        >
                                                            초기화
                                                        </Button>
                                                    </div>
                                                ) : p.incubation_status === 'WARMED' ? (
                                                    <div className="space-y-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            className="w-full h-8.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs flex items-center justify-center gap-1.5 rounded-xl"
                                                            onClick={() => {
                                                                setCreateBrandTarget(p);
                                                                const suggested = p.email ? p.email.split('@')[0] : `채널_${p.id.slice(0, 4)}`;
                                                                setNewBrandName(suggested);
                                                            }}
                                                        >
                                                            <Sparkles className="w-4 h-4" /> ✨ 브랜드 채널 자동 개설
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-full h-7 text-xs text-muted-foreground hover:text-foreground border-border rounded-lg"
                                                            onClick={() => handleSyncChannel(p.id)}
                                                            disabled={syncingId === p.id}
                                                        >
                                                            <RefreshCw className={`w-3 h-3 mr-1.5 ${syncingId === p.id ? 'animate-spin text-primary' : ''}`} />
                                                            기존 채널 보유 시 즉시 연동
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            className="w-full h-8.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs flex items-center justify-center gap-1.5 rounded-xl"
                                                            onClick={() => handleStartSeedWarmup(p.id)}
                                                            disabled={seedWarmingId === p.id || syncingId === p.id}
                                                        >
                                                            {seedWarmingId === p.id ? (
                                                                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> 예열 진행 중...</>
                                                            ) : (
                                                                <><Sparkles className="w-4 h-4 mr-1.5" /> 📱 1단계 시드 예열 {showBrowserWindow ? '(화면)' : '(백그라운드)'}</>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-full h-7.5 text-xs text-primary border-border hover:bg-muted font-semibold rounded-lg flex items-center justify-center gap-1.5"
                                                            onClick={() => handleSyncChannel(p.id)}
                                                            disabled={syncingId === p.id || seedWarmingId === p.id}
                                                        >
                                                            <RefreshCw className={`w-3 h-3 ${syncingId === p.id ? 'animate-spin text-primary' : ''}`} />
                                                            {syncingId === p.id ? '채널 정보 수집 중...' : '🔍 기존 채널 연동 (3단계 인증 계정)'}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>



                    {/* 데스크톱 전용 테이블 (hidden md:block) */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table className="w-full min-w-[900px]">
                            <TableHeader>
                                <TableRow className="bg-muted/40 border-b border-border">
                                    <TableHead className="w-[44px] pl-4 pr-0">
                                        <Checkbox
                                            checked={isAllSelected}
                                            onCheckedChange={handleToggleSelectAll}
                                            aria-label="전체 계정 선택"
                                        />
                                    </TableHead>
                                    <TableHead className="w-[90px] font-bold text-xs text-foreground">상태</TableHead>
                                    <TableHead className="min-w-[260px] font-bold text-xs text-foreground">계정 & 브랜드 채널</TableHead>
                                    <TableHead className="min-w-[200px] font-bold text-xs text-foreground">엔진 & 프록시 IP</TableHead>
                                    <TableHead className="min-w-[320px] font-bold text-xs text-foreground">운영 제어 (보안접속 & 웜업)</TableHead>
                                    <TableHead className="w-[100px] text-right font-bold text-xs text-foreground">최근 활동</TableHead>
                                    <TableHead className="w-[100px] text-right font-bold text-xs text-foreground">관리</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">로딩 중...</TableCell></TableRow>
                                ) : activeOps.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">운영 중인 계정이 없습니다.</TableCell></TableRow>
                                ) : (
                                    activeOps.map((p: any) => renderRow(p, false))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Quarantine Zone */}
            {quarantinedOps.length > 0 && (
                <Card className="border-red-200 bg-red-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700">
                            <AlertCircle className="w-6 h-6" />
                            격리 구역 (Quarantine Zone)
                        </CardTitle>
                        <CardDescription className="text-red-600/70">
                            운영 정책 위반으로 인해 90일간 격리된 계정입니다. 해당 계정은 모든 활동이 차단됩니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">상태</TableHead>
                                    <TableHead>계정 / 위반 사유</TableHead>
                                    <TableHead>네트워크</TableHead>
                                    <TableHead>해제 D-Day</TableHead>
                                    <TableHead className="text-right">격리일</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quarantinedOps.map((p: any) => renderRow(p, true))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Dialogs */}
            <TinCanWizard
                isOpen={isWizardOpen}
                onClose={() => {
                    setIsWizardOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['profiles'] });
                }}
                onComplete={() => queryClient.invalidateQueries({ queryKey: ['profiles'] })}
                initialData={draftData}
            />

            <Dialog open={!!editProfile} onOpenChange={(o) => !o && setEditProfile(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>프로필 수정</DialogTitle>
                        <DialogDescription>
                            계정의 기본 정보와 상태를 수정합니다.
                        </DialogDescription>
                    </DialogHeader>
                    {editProfile && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">System ID</Label>
                                    <Input value={editProfile.id} disabled className="bg-slate-50 font-mono text-[10px] h-8" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">Folder Path</Label>
                                    <Input value={editProfile.folder_path || '-'} disabled className="bg-slate-50 font-mono text-[10px] h-8 text-ellipsis" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>계정 이메일</Label>
                                <Input
                                    value={editProfile.email || ''}
                                    onChange={e => setEditProfile({ ...editProfile, email: e.target.value })}
                                    placeholder="example@gmail.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>비밀번호</Label>
                                    <Input
                                        type="password"
                                        value={editProfile.password || ''}
                                        onChange={e => setEditProfile({ ...editProfile, password: e.target.value })}
                                        placeholder="설정된 비밀번호 없음"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>복구 이메일</Label>
                                    <Input
                                        value={editProfile.recovery_email || ''}
                                        onChange={e => setEditProfile({ ...editProfile, recovery_email: e.target.value })}
                                        placeholder="recovery@email.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>상태 (Status)</Label>
                                    <Select
                                        value={editProfile.status || 'DRAFT'}
                                        onValueChange={(val) => setEditProfile({ ...editProfile, status: val })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DRAFT">DRAFT (작성 중)</SelectItem>
                                            <SelectItem value="ACTIVE">ACTIVE (정상)</SelectItem>
                                            <SelectItem value="COOLING">COOLING (휴식)</SelectItem>
                                            <SelectItem value="SUSPENDED">SUSPENDED (정지)</SelectItem>
                                            <SelectItem value="QUARANTINED">QUARANTINED (격리)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-100 mt-2">
                                <Label className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                    YouTube API 인증 설정
                                </Label>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="file"
                                                accept=".json"
                                                ref={editFileInputRef}
                                                className="hidden"
                                                onChange={(e) => handleEditFileUpload(e, editProfile.id)}
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => editFileInputRef.current?.click()}
                                                disabled={editUploading}
                                                className="bg-white"
                                            >
                                                {editUploading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileJson className="w-4 h-4 mr-2 text-indigo-600" />}
                                                키 업로드
                                            </Button>
                                            
                                            <Button
                                                size="sm"
                                                onClick={() => handleEditAuth(editProfile.id)}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                <Lock className="w-4 h-4 mr-2" />
                                                API 권한 승인 (격리 접속)
                                            </Button>
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            ※ JSON 키를 업로드한 후, 권한 승인 버튼을 눌러 스텔스 브라우저에서 인증을 완료하세요.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditProfile(null)}>취소</Button>
                        <Button onClick={handleEditSave}>저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Quick Network & Engine Switch Dialog */}
            <Dialog open={!!quickNetworkProfile} onOpenChange={(o) => !o && setQuickNetworkProfile(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-600">
                            <Settings className="w-5 h-5" />
                            엔진 & 네트워크 IP 설정 변경
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            스텔스 브라우저 엔진 및 Proxy IP 종류(LTE 모바일 ↔ ISP 고정 IP)를 빠르게 변경합니다.
                        </DialogDescription>
                    </DialogHeader>
                    {quickNetworkProfile && (
                        <div className="space-y-4 py-2 text-xs">
                            <div className="space-y-1.5">
                                <Label className="font-bold text-slate-700">안티디텍트 브라우저 엔진</Label>
                                <Select
                                    value={quickNetworkProfile.engine_type || 'cloakbrowser'}
                                    onValueChange={(val) => setQuickNetworkProfile({ ...quickNetworkProfile, engine_type: val })}
                                >
                                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cloakbrowser">🛡️ CloakBrowser (내장 파이프라인 - 권장)</SelectItem>
                                        <SelectItem value="ixbrowser">🌐 iXBrowser (외부 프로그램 API)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="font-bold text-slate-700">네트워크 IP 종류 (Proxy Mode)</Label>
                                <Select
                                    value={quickNetworkProfile.proxy_mode || 'DIRECT_LTE'}
                                    onValueChange={(val) => setQuickNetworkProfile({ ...quickNetworkProfile, proxy_mode: val })}
                                >
                                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DIRECT_LTE">📱 LTE 모바일 (EveryProxy 127.0.0.1:1080)</SelectItem>
                                        <SelectItem value="ISP_PROXY">🌐 ISP 고정 IP (안정적인 전용 IP)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {quickNetworkProfile.proxy_mode === 'ISP_PROXY' && (
                                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
                                    <p className="font-bold text-purple-900 text-xs flex items-center gap-1">
                                        <span>🌐</span> ISP 고정 IP 및 SOCKS5 인증 정보 설정
                                    </p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-[11px] text-slate-600 font-semibold">IP 주소 (Host)</Label>
                                            <Input
                                                value={quickNetworkProfile.proxy_host || ''}
                                                onChange={e => setQuickNetworkProfile({ ...quickNetworkProfile, proxy_host: e.target.value })}
                                                placeholder="192.168.1.100"
                                                className="h-8 text-xs font-mono bg-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[11px] text-slate-600 font-semibold">포트 (Port)</Label>
                                            <Input
                                                value={quickNetworkProfile.proxy_port || ''}
                                                onChange={e => setQuickNetworkProfile({ ...quickNetworkProfile, proxy_port: e.target.value })}
                                                placeholder="1080"
                                                className="h-8 text-xs font-mono bg-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[11px] text-slate-600 font-semibold">프록시 아이디 (User)</Label>
                                            <Input
                                                value={quickNetworkProfile.proxy_username || ''}
                                                onChange={e => setQuickNetworkProfile({ ...quickNetworkProfile, proxy_username: e.target.value })}
                                                placeholder="proxy_user"
                                                className="h-8 text-xs font-mono bg-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[11px] text-slate-600 font-semibold">비밀번호 (Password)</Label>
                                            <Input
                                                type="password"
                                                value={quickNetworkProfile.proxy_password || ''}
                                                onChange={e => setQuickNetworkProfile({ ...quickNetworkProfile, proxy_password: e.target.value })}
                                                placeholder="••••••••"
                                                className="h-8 text-xs font-mono bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setQuickNetworkProfile(null)}>취소</Button>
                        <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                            onClick={() => {
                                if (quickNetworkProfile) {
                                    updateMutation.mutate(quickNetworkProfile);
                                    setQuickNetworkProfile(null);
                                }
                            }}
                        >
                            저장 및 즉시 적용
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!quarantineTarget} onOpenChange={(o) => !o && setQuarantineTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600">🚨 계정 격리 조치</DialogTitle>
                        <DialogDescription>
                            해당 계정을 90일간 격리합니다. 이 기간 동안 업로드 및 운영 작업이 차단됩니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2 py-4">
                        <Label>위반/격리 사유</Label>
                        <Input placeholder="예: 저작권 경고 1회 (2025-01-01)" value={quarantineReason} onChange={e => setQuarantineReason(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setQuarantineTarget(null)}>취소</Button>
                        <Button variant="destructive" onClick={handleQuarantineConfirm}>격리 실행</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600">정말 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>DB 레코드와 물리 폴더가 영구 삭제됩니다.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteId(null)}>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">삭제</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Brand Channel Creation Dialog */}
            <Dialog open={!!createBrandTarget} onOpenChange={(o) => !o && !isCreatingBrand && setCreateBrandTarget(null)}>
                <DialogContent className="max-w-md bg-card border-border text-foreground">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
                            <Sparkles className="w-5 h-5 text-indigo-500" />
                            유튜브 브랜드 채널 자동 개설
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            인간형 내비게이션을 통해 유튜브에서 브랜드 채널을 안전하게 자동 생성하고 계정에 연동합니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-xs">
                        <div className="p-3 bg-muted/60 rounded-xl border border-border space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-muted-foreground">대상 구글 계정:</span>
                                <span className="font-mono font-bold text-foreground">{createBrandTarget?.email || createBrandTarget?.id}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-muted-foreground">시드 예열 상태:</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✅ 완료 (시청 기록 {createBrandTarget?.seed_history_count || 3}편 확보)</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-foreground text-xs">새 브랜드 채널 이름</Label>
                            <Input
                                value={newBrandName}
                                onChange={(e) => setNewBrandName(e.target.value)}
                                placeholder="예: 쇼츠 비타민C, 역사 미스터리 보관소 등"
                                className="h-9 text-xs bg-background border-border text-foreground"
                                disabled={isCreatingBrand}
                                autoFocus
                            />
                            <p className="text-[11px] text-muted-foreground">
                                ※ 한글/영문/숫자 모두 사용 가능하며, 유튜브 채널 생성 규격을 준수합니다.
                            </p>
                        </div>

                        {isCreatingBrand && (
                            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-3">
                                <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
                                <div className="text-[11px] space-y-0.5">
                                    <p className="font-bold text-foreground">인간형 브라우저로 채널 개설 중...</p>
                                    <p className="text-muted-foreground">홈 피드 체류 ➔ 프로필 메뉴 진입 ➔ 브랜드 채널 생성 ➔ ID 연동 진행 중 (약 30~60초 소요)</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCreateBrandTarget(null)}
                            disabled={isCreatingBrand}
                        >
                            취소
                        </Button>
                        <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                            onClick={handleCreateBrandChannel}
                            disabled={isCreatingBrand || !newBrandName.trim()}
                        >
                            {isCreatingBrand ? (
                                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> 생성 중...</>
                            ) : (
                                <><Sparkles className="w-4 h-4 mr-1.5" /> 개설 시작</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CultivationWizard
                channel={selectedChannelForWizard}
                open={wizardOpen}
                onOpenChange={setWizardOpen}
                isOpen={wizardOpen}
                onClose={() => setWizardOpen(false)}
            />

            <WarmupLogViewer
                open={logViewerOpen}
                onOpenChange={setLogViewerOpen}
                channelId={selectedChannelForLogs}
            />
        </div>
    );
};

export default TinCanVault;
