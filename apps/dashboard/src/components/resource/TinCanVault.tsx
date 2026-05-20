import React, { useState, useEffect } from 'react';
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
import { Plus, Clock, ShieldCheck, Mail, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TinCanWizard from './TinCanWizard';
// @ts-ignore
import { useModalVisibility } from '@/features/flow2capcut/hooks/useModalVisibility';

// API Base
const API_BASE = "/api";

const TinCanVault = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // UI States
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [activeViews, setActiveViews] = useState<string[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<string>('default');

    const syncViewsAndProfiles = async () => {
        try {
            const api = (window as any).electronAPI;
            if (api) {
                const viewsRes = await api.getActiveViews();
                if (viewsRes?.success) {
                    setActiveViews(viewsRes.activeIds);
                }
                const config = await api.loadProfiles();
                if (config?.activeProfileId) {
                    setActiveProfileId(config.activeProfileId);
                }
            }
        } catch (e) {
            console.warn("Failed to sync views in TinCanVault:", e);
        }
    };

    useEffect(() => {
        syncViewsAndProfiles();
        const interval = setInterval(syncViewsAndProfiles, 3000);
        return () => clearInterval(interval);
    }, []);
    const [draftData, setDraftData] = useState<any>(null); // For Resuming Draft
    const [editProfile, setEditProfile] = useState<any>(null); // For Edit Dialog
    const [deleteId, setDeleteId] = useState<string | null>(null); // For Delete Alert
    const [quarantineTarget, setQuarantineTarget] = useState<any>(null); // For Quarantine Dialog
    const [quarantineReason, setQuarantineReason] = useState("");

    // @ts-ignore
    useModalVisibility(!!editProfile);
    // @ts-ignore
    useModalVisibility(!!quarantineTarget);
    // @ts-ignore
    useModalVisibility(!!deleteId);

    // Fetch Profiles
    const { data: profiles, isLoading } = useQuery({
        queryKey: ['profiles'],
        queryFn: async () => (await axios.get(`${API_BASE}/resources/profiles?type=TIN_CAN`)).data
    });

    const activeOps = profiles?.filter((p: any) => p.status !== 'QUARANTINED' && p.usage_type !== 'DEEP_RESEARCH') || [];
    const quarantinedOps = profiles?.filter((p: any) => p.status === 'QUARANTINED' && p.usage_type !== 'DEEP_RESEARCH') || [];

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
            // Call launch-setup with rotate_ip=true to force IP rotation before launch.
            // This endpoint now supports 'rotate_ip' in body.
            const res = await axios.post(`${API_BASE}/resources/profiles/${p.id}/launch-setup`, {
                rotate_ip: true
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

    // Table Row Component
    const ProfileRow = ({ p, isQuarantined }: { p: any, isQuarantined?: boolean }) => (
        <TableRow key={p.id}>
            <TableCell>
                <Badge variant="outline" className={
                    p.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' :
                        p.status === 'draft' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            p.status === 'QUARANTINED' ? 'bg-red-100 text-red-700 border-red-200' :
                                'bg-slate-100 text-slate-700'
                }>
                    {p.status ? p.status.toUpperCase() : 'UNKNOWN'}
                </Badge>
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 font-medium">
                        <Mail className="w-4 h-4 text-slate-600" />
                        {p.email ? <span>{p.email}</span> : (
                            <span className="text-slate-600 italic flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> 미설정 ({p.id.slice(0, 6)})
                            </span>
                        )}
                    </div>
                    {isQuarantined && <span className="text-xs text-red-500 mt-1">사유: {p.quarantine_reason}</span>}
                </div>
            </TableCell>
            <TableCell>
                {isQuarantined ? (
                    <Badge variant="destructive" className="font-mono">{getDDay(p.quarantine_start_date)}</Badge>
                ) : (
                    <span className={`text-xs font-mono px-2 py-1 rounded inline-flex items-center gap-1 ${p.folder_path && p.status?.toLowerCase() === 'active' ? "bg-slate-100 text-slate-600" : "bg-red-50 text-red-400"}`}>
                        {p.status?.toLowerCase() === 'active' ? <ShieldCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {p.status?.toLowerCase() === 'active' ? "READY" : "PENDING"}
                    </span>
                )}
            </TableCell>
            <TableCell className="text-right text-xs text-slate-500">
                <div className="flex items-center justify-end gap-2">
                    {/* [Electron Dynamic Grid Control Buttons] */}
                    {p.status?.toLowerCase() === 'active' && (window as any).electronAPI && (
                        <>
                            {activeViews.includes(p.id) ? (
                                <div className="flex gap-1.5 items-center">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={`h-7 text-xs border-blue-200 text-blue-700 font-bold transition-all ${activeProfileId === p.id ? 'bg-blue-100 shadow-inner' : 'bg-blue-50/50 hover:bg-blue-100'}`}
                                        onClick={async () => {
                                            await (window as any).electronAPI?.switchProfile?.({ profileId: p.id });
                                            syncViewsAndProfiles();
                                        }}
                                    >
                                        🎯 {activeProfileId === p.id ? '포커스됨' : '선택/포커스'}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="h-7 text-xs font-semibold px-2 hover:bg-red-600 transition-all"
                                        onClick={async () => {
                                            if (activeViews.length <= 1) {
                                                alert("기본 창(최소 1개)은 항상 화면에 활성화 상태로 유지되어야 합니다.");
                                                return;
                                            }
                                            const confirm = window.confirm(`정말 "${p.email || p.id}" 다중창을 종료하시겠습니까?`);
                                            if (confirm) {
                                                await (window as any).electronAPI?.destroyFlowView?.({ profileId: p.id });
                                                syncViewsAndProfiles();
                                            }
                                        }}
                                    >
                                        ✕ 닫기
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white h-7 text-xs font-bold shadow-sm transition-all"
                                    onClick={async () => {
                                        if (activeViews.length >= 4) {
                                            alert("다중창은 최대 4개까지만 동시 구동할 수 있습니다. 기존 활성 창을 먼저 닫아주세요.");
                                            return;
                                        }
                                        await (window as any).electronAPI?.createFlowView?.({ profileId: p.id });
                                        await (window as any).electronAPI?.switchProfile?.({ profileId: p.id });
                                        syncViewsAndProfiles();
                                        toast({ title: "🚀 다중창 기동 완료", description: `${p.email || p.id} 뷰가 스플릿 창으로 기동되었습니다.` });
                                    }}
                                >
                                    💻 다중창 기동
                                </Button>
                            )}
                        </>
                    )}
                    {/* Fallback to normal Secure Connect if not in Electron (e.g. normal browser testing) */}
                    {p.status?.toLowerCase() === 'active' && !(window as any).electronAPI && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-300 text-slate-700 hover:bg-slate-50 h-7 text-xs shadow-sm transition-all"
                            onClick={() => handleSecureConnect(p)}
                        >
                            <ShieldCheck className="w-3 h-3 mr-1 text-slate-500" /> 보안 접속
                        </Button>
                    )}
                    <Clock className="w-3 h-3 ml-2" />
                    {isQuarantined
                        ? (p.quarantine_start_date ? new Date(p.quarantine_start_date).toLocaleDateString() : '-')
                        : (p.last_used_at ? new Date(p.last_used_at).toLocaleDateString() : 'Never')}
                </div>
            </TableCell>
            <TableCell>
                <div className="flex gap-1 justify-end">
                    {!isQuarantined && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-red-500"
                            onClick={() => setQuarantineTarget(p)} title="격리 조치"
                        >
                            <AlertCircle className="w-4 h-4" />
                        </Button>
                    )}
                    {isQuarantined ? (
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => releaseMutation.mutate(p.id)}>
                            해제
                        </Button>
                    ) : (
                        <>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-blue-600"
                                onClick={() => (p.status?.toLowerCase() === 'draft' || p.status?.toLowerCase() === 'pending') ? handleResumeDraft(p) : setEditProfile(p)}
                            >
                                <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-red-600"
                                onClick={() => setDeleteId(p.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );

    return (
        <div className="space-y-8">
            {/* Active Ops Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6 text-indigo-600" />
                            구글 계정 관리 (Google Accounts)
                            {activeViews.length > 0 && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-0.5 ml-2 font-bold animate-pulse">
                                    💻 구동 중: {activeViews.length}/4
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            안전하게 격리된 브라우저 프로필을 생성하고 관리합니다. (Import & Setup)
                        </CardDescription>
                    </div>
                    <div className="flex gap-2 items-center">
                        {activeViews.length > 0 && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold"
                                onClick={async () => {
                                    const confirm = window.confirm("정말 구동 중인 모든 다중창을 종료하시겠습니까?");
                                    if (confirm) {
                                        for (const viewId of activeViews) {
                                            if (viewId !== 'default') {
                                                await (window as any).electronAPI?.destroyFlowView?.({ profileId: viewId });
                                            }
                                        }
                                        syncViewsAndProfiles();
                                    }
                                }}
                            >
                                ✕ 모든 창 닫기
                            </Button>
                        )}
                        <Button onClick={() => { setDraftData(null); setIsWizardOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="w-4 h-4 mr-2" /> 새 계정 가져오기
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">상태</TableHead>
                                <TableHead>계정 이메일</TableHead>
                                <TableHead>자격 증명</TableHead>
                                <TableHead className="text-right">최근 활동</TableHead>
                                <TableHead className="w-[120px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8">로딩 중...</TableCell></TableRow>
                            ) : activeOps.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">운영 중인 계정이 없습니다.</TableCell></TableRow>
                            ) : (
                                activeOps.map((p: any) => <ProfileRow p={p} key={p.id} />)
                            )}
                        </TableBody>
                    </Table>
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
                                    <TableHead>해제 D-Day</TableHead>
                                    <TableHead className="text-right">격리일</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quarantinedOps.map((p: any) => <ProfileRow p={p} key={p.id} isQuarantined={true} />)}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Dialogs */}
            <TinCanWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
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
                                        placeholder="recovery@email.com"
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
                                        value={editProfile.profile_type || 'TIN_CAN'}
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

                            {/* Extra */}
                            <div className="space-y-2">
                                <Label>연동 채널 ID (선택)</Label>
                                <Input
                                    value={editProfile.channel_id || ''}
                                    onChange={e => setEditProfile({ ...editProfile, channel_id: e.target.value })}
                                    placeholder="UC..."
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditProfile(null)}>취소</Button>
                        <Button onClick={handleEditSave}>저장</Button>
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
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600">삭제 확인</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default TinCanVault;
