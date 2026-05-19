import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, Youtube, Activity, Lock, Loader2, RefreshCw, ChevronRight, UserPlus, Pencil, Trash2, Flame } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TinCanWizard from './TinCanWizard';
import IncubationGuide from './IncubationGuide';
import WarmupLogViewer from './WarmupLogViewer';

const API_BASE = "/api";

// --- Bulk Warmup Control Panel ---
const BulkWarmupPanel = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [guideOpen, setGuideOpen] = React.useState(false);

    // Fetch bulk status every 5 seconds
    const { data: status, isLoading } = useQuery({
        queryKey: ['bulk-warmup-status'],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/youtube/warmup/bulk/status`);
            return res.data;
        },
        refetchInterval: 5000
    });

    // Bulk start mutation
    const startMutation = useMutation({
        mutationFn: async (filter: string) =>
            await axios.post(`${API_BASE}/youtube/warmup/bulk/start`, null, { params: { filter } }),
        onSuccess: (res, filter) => {
            toast({
                title: "일괄 웜업 시작",
                description: `${res.data.started}개 채널의 웜업이 시작되었습니다 (필터: ${filter})`,
            });
            queryClient.invalidateQueries({ queryKey: ['bulk-warmup-status'] });
        },
        onError: (err: any) => {
            toast({
                title: "일괄 시작 실패",
                description: err.response?.data?.detail || "오류가 발생했습니다",
                variant: "destructive",
            });
        }
    });

    // Bulk pause mutation
    const pauseMutation = useMutation({
        mutationFn: async () => await axios.post(`${API_BASE}/youtube/warmup/bulk/pause`),
        onSuccess: (res) => {
            toast({
                title: "일괄 일시정지",
                description: `${res.data.paused}개 채널이 일시정지되었습니다`,
            });
            queryClient.invalidateQueries({ queryKey: ['bulk-warmup-status'] });
        }
    });

    // Bulk reset mutation
    const resetMutation = useMutation({
        mutationFn: async () => await axios.post(`${API_BASE}/youtube/warmup/bulk/reset`),
        onSuccess: (res) => {
            toast({
                title: "일괄 초기화",
                description: `${res.data.reset}개 채널이 초기화되었습니다`,
            });
            queryClient.invalidateQueries({ queryKey: ['bulk-warmup-status'] });
        }
    });

    if (isLoading) {
        return (
            <Card className="mb-6">
                <CardContent className="p-6">
                    <div className="flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="mb-6 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
                <CardHeader className="py-3 px-4 border-b">
                    <div className="flex items-center gap-2 text-orange-700">
                        <Flame className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Bulk Warmup Control</span>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Status Summary Cards */}
                    <div className="grid grid-cols-7 gap-3 mb-6">
                        <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                            <div className="text-2xl font-bold text-gray-700">{status?.total || 0}</div>
                            <div className="text-xs text-gray-500 mt-1">전체</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3 border border-orange-200 text-center">
                            <div className="text-2xl font-bold text-orange-600">{status?.running || 0}</div>
                            <div className="text-xs text-orange-600 mt-1">진행중</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
                            <div className="text-2xl font-bold text-green-600">{status?.completed || 0}</div>
                            <div className="text-xs text-green-600 mt-1">완료</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-center">
                            <div className="text-2xl font-bold text-red-600">{status?.failed || 0}</div>
                            <div className="text-xs text-red-600 mt-1">실패</div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200 text-center">
                            <div className="text-2xl font-bold text-yellow-600">{status?.paused || 0}</div>
                            <div className="text-xs text-yellow-600 mt-1">일시정지</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
                            <div className="text-2xl font-bold text-blue-600">{status?.pending || 0}</div>
                            <div className="text-xs text-blue-600 mt-1">대기</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 text-center">
                            <div className="text-2xl font-bold text-purple-600">{status?.in_progress || 0}</div>
                            <div className="text-xs text-purple-600 mt-1">진행중 (1-6일)</div>
                        </div>
                    </div>

                    {/* Bulk Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            onClick={() => startMutation.mutate("all")}
                            disabled={startMutation.isPending}
                            className="bg-pixie-blue hover:bg-blue-600 shadow-sm"
                        >
                            <Flame className="w-4 h-4 mr-2" />
                            전체 시작
                        </Button>
                        <Button
                            onClick={() => startMutation.mutate("pending")}
                            disabled={startMutation.isPending}
                            variant="outline"
                            className="border-blue-200 text-pixie-blue hover:bg-blue-50"
                        >
                            대기중만 시작
                        </Button>
                        <Button
                            onClick={() => startMutation.mutate("failed")}
                            disabled={startMutation.isPending}
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                            실패만 재시작
                        </Button>
                        <Button
                            onClick={() => pauseMutation.mutate()}
                            disabled={pauseMutation.isPending}
                            variant="outline"
                            className="border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                            전체 일시정지
                        </Button>
                        <Button
                            onClick={() => resetMutation.mutate()}
                            disabled={resetMutation.isPending}
                            variant="destructive"
                            className="bg-red-500 hover:bg-red-600"
                        >
                            전체 초기화
                        </Button>
                        <Button
                            onClick={() => setGuideOpen(true)}
                            variant="outline"
                            className="border-pixie-blue/30 text-pixie-blue hover:bg-blue-50 ml-auto"
                        >
                            📚 인큐베이팅 가이드
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <IncubationGuide open={guideOpen} onOpenChange={setGuideOpen} />
        </>
    );
};


const CaptainQuarters = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [draftData, setDraftData] = useState<any>(null); // For Resuming Draft

    // Management State
    const [editProfile, setEditProfile] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [logViewerOpen, setLogViewerOpen] = useState(false);
    const [selectedChannelForLogs, setSelectedChannelForLogs] = useState<string>('');

    // Fetch Real Profiles (CAPTAIN type)
    const { data: profiles, isLoading, refetch } = useQuery({
        queryKey: ['profiles', 'captain'],
        queryFn: async () => (await axios.get(`${API_BASE}/resources/profiles?type=CAPTAIN`)).data
    });

    const displayProfiles = Array.isArray(profiles) ? profiles : [];

    // Mutations
    const updateMutation = useMutation({
        mutationFn: async (data: any) => await axios.put(`${API_BASE}/resources/profiles/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            setEditProfile(null);
            toast({ title: "수정 완료", description: "계정 정보가 업데이트되었습니다." });
        },
        onError: (e: any) => {
            toast({ variant: "destructive", title: "수정 실패", description: e.response?.data?.detail || "오류가 발생했습니다." });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => await axios.delete(`${API_BASE}/resources/profiles/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            setDeleteId(null);
            toast({ title: "삭제 완료", description: "계정이 영구적으로 삭제되었습니다." });
        },
        onError: (e: any) => {
            toast({ variant: "destructive", title: "삭제 실패", description: e.response?.data?.detail || "삭제 중 오류가 발생했습니다." });
        }
    });

    const handleEditSave = () => {
        if (!editProfile) return;
        updateMutation.mutate(editProfile);
    };

    const handleDeleteConfirm = () => {
        if (!deleteId) return;
        deleteMutation.mutate(deleteId);
    };

    const handleSecureLaunch = async (profile: any) => {
        if (profile.status === 'QUARANTINED') {
            toast({
                variant: "destructive",
                title: "⛔ 접속 차단됨",
                description: `이 계정은 격리 상태입니다. (사유: ${profile.quarantine_reason})`
            });
            return;
        }

        setLoadingMap(prev => ({ ...prev, [profile.id]: true }));
        toast({ title: "🛡️ 보안 터널링 가동", description: `${profile.id} 프로필을 준비합니다...` });

        try {
            const res = await axios.post(`${API_BASE}/resources/profiles/${profile.id}/launch-setup`, { rotate_ip: true });
            if (res.data.status === 'launched') {
                toast({ title: "🚀 접속 성공", description: "브라우저가 실행되었습니다." });
            } else {
                throw new Error("Launch failed");
            }
        } catch (e) {
            toast({ variant: "destructive", title: "실행 실패", description: "백엔드 연결을 확인해주세요." });
        } finally {
            setLoadingMap(prev => ({ ...prev, [profile.id]: false }));
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Bulk Warmup Control Panel */}
            <BulkWarmupPanel />

            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-slate-500">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Channel & Account List ({displayProfiles.length})</span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-3 py-1">System Ready</Badge>
                    <Button onClick={() => { setDraftData(null); setIsWizardOpen(true); }} className="bg-pixie-blue hover:bg-blue-600 text-white gap-2 shadow-sm">
                        <UserPlus className="w-4 h-4" /> 관리자 계정 등록
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-10 text-slate-500">프로필 목록을 불러오는 중...</div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {displayProfiles.map((p: any) => {
                        const isQuarantined = p.status === 'QUARANTINED';
                        return (
                            <Card key={p.id} className={`transition-all shadow-sm ${isQuarantined ? 'border-red-500 bg-red-50/10' : 'hover:border-indigo-300'}`}>
                                <CardContent className="p-6 flex items-center justify-between">

                                    {/* Info */}
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                                            ${isQuarantined ? 'bg-red-100 text-red-700' :
                                                p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {isQuarantined ? <Lock className="w-5 h-5" /> : (p.email?.[0]?.toUpperCase() || 'U')}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                                {p.email || `Unknown (${p.id})`}
                                                {isQuarantined && <Badge variant="destructive" className="text-[10px] h-5">⛔ UPLOAD BLOCKED</Badge>}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <span>{p.profile_type}</span>
                                                <span className="text-slate-300">|</span>
                                                {p.client_secret_json ?
                                                    <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-600 bg-emerald-50">JSON ✅</Badge> :
                                                    <Badge variant="outline" className="text-[10px] border-red-200 text-red-600 bg-red-50">JSON ❌</Badge>
                                                }
                                                {p.refresh_token ?
                                                    <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600 bg-blue-50">API Connected</Badge> :
                                                    <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600 bg-amber-50">API Pending</Badge>
                                                }
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3">
                                        <Button
                                            onClick={() => handleSecureLaunch(p)}
                                            disabled={loadingMap[p.id]}
                                            className={`min-w-[140px] ${isQuarantined
                                                ? 'bg-red-100 text-red-600 hover:bg-red-200 cursor-not-allowed'
                                                : loadingMap[p.id] ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 hover:bg-black text-white'}`}
                                        >
                                            {isQuarantined ? (
                                                <><Lock className="w-4 h-4 mr-2" /> 접속 차단</>
                                            ) : loadingMap[p.id] ? (
                                                <>준비 중...</>
                                            ) : (
                                                <><Youtube className="w-4 h-4 mr-2" /> 보안 접속</>
                                            )}
                                        </Button>

                                        {/* API Authorization Button */}
                                        {p.client_secret_json && !isQuarantined && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm" className={`gap-2 ${!p.refresh_token ? 'border-amber-500 text-amber-600 animate-pulse' : 'text-blue-600'}`}>
                                                        <Activity className="w-4 h-4" />
                                                        {p.refresh_token ? "API 연결됨" : "API 연결 필요"}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56">
                                                    <DropdownMenuItem onClick={() => window.open(`${API_BASE}/oauth2/authorize/${p.id}`, '_blank')}>
                                                        <Activity className="w-4 h-4 mr-2" />
                                                        일반 브라우저로 인증
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={async () => {
                                                        try {
                                                            await axios.post(`${API_BASE}/oauth2/authenticate/${p.id}`);
                                                            toast({ title: "격리 브라우저 실행", description: "지정된 Chrome 프로필에서 인증을 진행하세요." });
                                                        } catch (e) {
                                                            toast({ variant: "destructive", title: "실행 실패", description: "인증 브라우저를 띄울 수 없습니다." });
                                                        }
                                                    }}>
                                                        <Lock className="w-4 h-4 mr-2" />
                                                        격리 브라우저로 인증 (권장)
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}

                                        {/* Management Buttons */}
                                        <div className="flex items-center gap-1 border-l pl-3 ml-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => (p.status?.toLowerCase() === 'draft' || p.status?.toLowerCase() === 'pending')
                                                    ? (() => { setDraftData(p); setIsWizardOpen(true); })()
                                                    : setEditProfile(p)
                                                }
                                                className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                                title={p.status?.toLowerCase() === 'draft' ? "등록 계속하기" : "프로필 수정"}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)} className="h-8 w-8 text-slate-400 hover:text-red-600">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                </CardContent>

                                {/* [New] Delegated Channel List (Expandable or Always Visible?) */}
                                {/* Let's make it visible if ACTIVE */}
                                {p.status?.toLowerCase() === 'active' && !isQuarantined && (
                                    <div className="px-6 pb-6 border-t pt-4 bg-slate-50/50">
                                        <CaptainChannelList profileId={p.id} parentScan={loadingMap[p.id]} />
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            <TinCanWizard
                isOpen={isWizardOpen}
                onClose={() => {
                    setIsWizardOpen(false);
                    setDraftData(null);
                }}
                onComplete={() => {
                    setIsWizardOpen(false);
                    setDraftData(null);
                    refetch();
                }}
                accountType="CAPTAIN"
                initialData={draftData}
            />

            {/* Edit Dialog */}
            <Dialog open={!!editProfile} onOpenChange={(o) => !o && setEditProfile(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>관리자 프로필 수정</DialogTitle>
                        <DialogDescription>계정 정보를 수정하거나 상태를 변경합니다.</DialogDescription>
                    </DialogHeader>
                    {editProfile && (
                        <div className="grid gap-4 py-4">
                            {/* System Info (ReadOnly) */}
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

                            {/* Credentials */}
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
                                        placeholder="Imported"
                                    />
                                </div>
                            </div>

                            {/* Status & Config */}
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
                                <div className="space-y-2">
                                    <Label>계정 유형</Label>
                                    <Select
                                        value={editProfile.profile_type || 'CAPTAIN'}
                                        onValueChange={(val) => setEditProfile({ ...editProfile, profile_type: val })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="TIN_CAN">TIN_CAN (일반)</SelectItem>
                                            <SelectItem value="CAPTAIN">CAPTAIN (관리자)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditProfile(null)}>취소</Button>
                        <Button onClick={handleEditSave}>변경 사항 저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Alert */}
            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            이 작업은 되돌릴 수 없습니다. 관리자 계정과 연결된 모든 데이터가 영구적으로 삭제됩니다.<br />
                            (실제 구글 계정이나 채널은 삭제되지 않습니다)
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">삭제 확인</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// --- Sub Component: Channel List ---
const CaptainChannelList = ({ profileId, parentScan }: { profileId: string, parentScan?: boolean }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [scanning, setScanning] = useState(false);

    // Fetch Channels from unified API (minimal info)
    const { data: channels, isLoading, refetch } = useQuery({
        queryKey: ['captain-channels', profileId],
        queryFn: async () => (await axios.get(`${API_BASE}/captain/${profileId}/channels?view=list`)).data,
        enabled: !!profileId,
        staleTime: 24 * 60 * 60 * 1000,  // 24 hours cache
    });

    const displayChannels = Array.isArray(channels) ? channels : [];

    // Get active channel
    const { data: activeChannelData } = useQuery({
        queryKey: ['active-channel'],
        queryFn: async () => (await axios.get(`${API_BASE}/youtube/channels/active`)).data,
        refetchInterval: 5000, // Poll every 5 seconds
    });

    const activeChannelId = activeChannelData?.channel_id;

    // Scan mutation
    const scanMutation = useMutation({
        mutationFn: async () => await axios.post(`${API_BASE}/youtube/captain/${profileId}/scan-channels`),
        onSuccess: (res) => {
            toast({
                title: "✅ 스캔 완료",
                description: `${res.data.registered} 신규, ${res.data.updated} 업데이트`
            });
            refetch();
        },
        onError: (e: any) => {
            toast({
                variant: "destructive",
                title: "스캔 실패",
                description: e.response?.data?.detail || "오류가 발생했습니다."
            });
        }
    });

    // Launch mutation
    const launchMutation = useMutation({
        mutationFn: async (channelId: string) =>
            await axios.post(`${API_BASE}/youtube/channels/${channelId}/launch`, null, { params: { rotate_ip: true } }),
        onSuccess: (res) => {
            toast({
                title: "🚀 격리 접속 성공",
                description: `IP: ${res.data.ip}`
            });
            queryClient.invalidateQueries({ queryKey: ['active-channel'] });
            queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
        },
        onError: (e: any) => {
            toast({
                variant: "destructive",
                title: "접속 실패",
                description: e.response?.data?.detail || "오류가 발생했습니다."
            });
        }
    });

    const handleScan = () => {
        scanMutation.mutate();
    };

    const handleLaunchChannel = (channelId: string) => {
        if (activeChannelId && activeChannelId !== channelId) {
            // Warn user about closing existing session
            if (!confirm("기존 세션을 종료하고 새 IP로 접속하시겠습니까?")) {
                return;
            }
        }
        launchMutation.mutate(channelId);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-600 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> 위임된 브랜드 채널 ({displayChannels.length})
                </h4>
                <div className="flex items-center gap-2">
                    {/* Channel Sync */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleScan}
                        disabled={scanMutation.isPending || parentScan}
                        className="h-7 text-xs"
                    >
                        {scanMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                        {scanMutation.isPending ? "스캔 중..." : "채널 동기화"}
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-xs text-slate-400 py-2">채널 목록 로딩 중...</div>
            ) : displayChannels.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                    {displayChannels.map((ch: any) => {
                        const isActive = activeChannelId === ch.channel_id;
                        const isQuarantined = ch.status === 'QUARANTINED';

                        return (
                            <Card
                                key={ch.channel_id}
                                className={`
                                    transition-all
                                    ${isActive ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''}
                                    ${isQuarantined ? 'border-red-500 bg-red-50/10' : 'hover:border-indigo-300'}
                                `}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        {/* Channel Info */}
                                        <div className="flex items-center gap-3 flex-1">
                                            {/* Thumbnail */}
                                            {ch.thumbnail_url ? (
                                                <img
                                                    src={ch.thumbnail_url}
                                                    alt={ch.channel_name}
                                                    className="w-12 h-12 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg font-bold">
                                                    {ch.channel_name?.[0] || 'C'}
                                                </div>
                                            )}

                                            {/* Details */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h5 className="font-bold text-slate-900">{ch.channel_name}</h5>
                                                    {isActive && (
                                                        <Badge className="bg-blue-500 text-white text-[10px] h-5">
                                                            🟢 ACTIVE
                                                        </Badge>
                                                    )}
                                                    {isQuarantined && (
                                                        <Badge variant="destructive" className="text-[10px] h-5">
                                                            ⛔ QUARANTINED
                                                        </Badge>
                                                    )}
                                                    {ch.warmup_status === 'RUNNING' && (
                                                        <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-50 text-[10px] h-5 animate-pulse">
                                                            🔥 WARMUP ACTIVE
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    {ch.channel_handle && (
                                                        <span className="text-xs text-slate-500">{ch.channel_handle}</span>
                                                    )}
                                                    {ch.last_used_ip && (
                                                        <Badge variant="outline" className="text-[10px] h-5">
                                                            IP: {ch.last_used_ip}
                                                        </Badge>
                                                    )}
                                                    {/* Warmup Stage Indicator */}
                                                    {ch.warmup_stage > 0 && (
                                                        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                            Day {ch.warmup_stage}
                                                            {ch.warmup_status === 'COMPLETED' && ' ✅'}
                                                            {ch.warmup_status === 'FAILED' && ' ❌'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <div className="flex items-center gap-2">
                                            {/* [NEW] Warmup Button */}
                                            {!isQuarantined && (
                                                <WarmupButton channel={ch} profileId={profileId} />
                                            )}

                                            <Button
                                                onClick={() => handleLaunchChannel(ch.channel_id)}
                                                disabled={isQuarantined || launchMutation.isPending}
                                                className={`
                                                    min-w-[120px]
                                                    ${isActive ? 'bg-slate-400' : 'bg-pixie-blue hover:bg-blue-600'}
                                                    ${isQuarantined ? 'bg-red-100 text-red-600 cursor-not-allowed' : ''}
                                                `}
                                                size="sm"
                                            >
                                                {isQuarantined ? (
                                                    <>
                                                        <Lock className="w-4 h-4 mr-2" /> 접속 차단
                                                    </>
                                                ) : launchMutation.isPending ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 접속 중...
                                                    </>
                                                ) : isActive ? (
                                                    <>현재 접속 중</>
                                                ) : (
                                                    <>
                                                        <Youtube className="w-4 h-4 mr-2" /> 격리 접속
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-8 border border-dashed rounded-lg text-slate-400 text-xs">
                    등록된 채널이 없습니다. 위 '채널 동기화'를 눌러주세요.
                </div>
            )}
        </div>
    );
};

// --- Sub Component: Warmup Button with Dropdown ---
const WarmupButton = ({ channel, profileId, onOpenLogs }: { channel: any, profileId: string, onOpenLogs?: (channelId: string) => void }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const isRunning = channel.warmup_status === 'RUNNING';

    const warmupStatus = channel.warmup_status || "IDLE";
    const warmupStage = channel.warmup_stage || 0;

    const warmupMutation = useMutation({
        mutationFn: async (selectedStage: number) =>
            await axios.post(`${API_BASE}/youtube/channels/${channel.channel_id}/warmup`, null, {
                params: { stage: selectedStage }
            }),
        onSuccess: (res, selectedStage) => {
            toast({
                title: "웜업 루틴 시작",
                description: `Day ${selectedStage} 웜업이 백그라운드에서 시작되었습니다.`,
            });
            queryClient.invalidateQueries({ queryKey: ['captain-channels', profileId] });
        },
        onError: (err: any) => {
            toast({
                title: "웜업 오류",
                description: err.response?.data?.detail || "웜업 루틴 시작에 실패했습니다.",
                variant: "destructive",
            });
        }
    });

    const startWarmup = (stage: number) => {
        warmupMutation.mutate(stage);
    };

    // Individual reset mutation
    const resetMutation = useMutation({
        mutationFn: async () => {
            await axios.post(`${API_BASE}/youtube/channels/${channel.id}/warmup/reset`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['captain-channels'] });
            toast({
                title: "웜업 초기화",
                description: "채널 웜업이 초기화되었습니다",
            });
        },
        onError: (err: any) => {
            toast({
                title: "초기화 실패",
                description: err.response?.data?.detail || "오류가 발생했습니다",
                variant: "destructive",
            });
        }
    });

    return (
        <div className="flex items-center gap-2">
            {/* Enhanced Status Badge - Always show day info */}
            {warmupStatus === "RUNNING" ? (
                <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 animate-pulse">
                    <Flame className="w-3 h-3 mr-1 fill-current" />
                    웜업 진행중 (Day {warmupStage})
                </Badge>
            ) : warmupStage > 0 && warmupStage < 7 ? (
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                    🔄 Day {warmupStage} 완료 → 다음: Day {warmupStage + 1}
                </Badge>
            ) : warmupStage >= 7 ? (
                <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                    ✅ 웜업 완료 (7일)
                </Badge>
            ) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                    ⏳ 웜업 대기중
                </Badge>
            )}

            {/* Dropdown Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-orange-200 text-orange-600 hover:bg-orange-50"
                        disabled={warmupMutation.isPending || warmupStatus === "RUNNING"}
                    >
                        <Flame className="w-4 h-4 mr-2" />
                        {warmupStatus === "RUNNING" ? "웜업 중..." : "웜업 시작"}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onClick={() => startWarmup(warmupStage < 7 ? warmupStage + 1 : 7)}
                        disabled={warmupStage >= 7 || warmupStatus === "RUNNING"}
                    >
                        ▶️ 계속하기 (Day {warmupStage < 7 ? warmupStage + 1 : 7})
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => startWarmup(1)}>
                        🔍 Day 1: 탐색
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => startWarmup(2)}>
                        🎯 Day 2: 관심사 형성
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => startWarmup(3)}>
                        🤝 Day 3: 커뮤니티 참여
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => startWarmup(4)}>
                        🔬 Day 4: 심화 탐색
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => startWarmup(5)}>
                        ⚖️ Day 5: 안정화
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => startWarmup(6)}>
                        🌈 Day 6: 다양화
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => startWarmup(7)}>
                        🎓 Day 7: 성숙
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => onOpenLogs && onOpenLogs(channel.channel_id)}
                    >
                        📊 로그 보기
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => resetMutation.mutate()}
                        disabled={warmupStage === 0}
                        className="text-red-600"
                    >
                        🔄 초기화
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

// Main Component with Log Viewer
const CaptainQuartersWithLogs = () => {
    const [logViewerOpen, setLogViewerOpen] = useState(false);
    const [selectedChannelForLogs, setSelectedChannelForLogs] = useState<string>('');

    return (
        <>
            <CaptainQuarters
                onOpenLogs={(channelId: string) => {
                    setSelectedChannelForLogs(channelId);
                    setLogViewerOpen(true);
                }}
            />
            <WarmupLogViewer
                open={logViewerOpen}
                onOpenChange={setLogViewerOpen}
                channelId={selectedChannelForLogs}
            />
        </>
    );
};

export default CaptainQuartersWithLogs;
