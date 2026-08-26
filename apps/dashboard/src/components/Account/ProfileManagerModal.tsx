import React, { useState } from 'react';
// @ts-ignore
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { User, KeyRound, Plus, Trash2, Shield, Sparkles, Check, RefreshCw, LogOut } from 'lucide-react';

interface ProfileManagerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProfileManagerModal({ open, onOpenChange }: ProfileManagerModalProps) {
    const { profiles, activeProfile, loginWithProfile, changePin, addProfile, deleteProfile, logout } = useAuth();
    const [tab, setTab] = useState<'switch' | 'pin' | 'create'>('switch');

    // PIN Change State
    const [oldPin, setOldPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinLoading, setPinLoading] = useState(false);

    // New Profile State
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState<'creator' | 'agent' | 'admin'>('creator');
    const [newAvatar, setNewAvatar] = useState('👤');
    const [newProfilePin, setNewProfilePin] = useState('1234');
    const [newDesc, setNewDesc] = useState('');
    const [createLoading, setCreateLoading] = useState(false);

    const handleSwitchProfile = async (profileId: string) => {
        try {
            await loginWithProfile(profileId, '', true);
            toast.success("프로필이 성공적으로 전환되었습니다.");
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.message || "프로필 전환 실패");
        }
    };

    const handleChangePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPin !== confirmPin) {
            toast.error("새 PIN 번호가 일치하지 않습니다.");
            return;
        }
        if (newPin.length < 4) {
            toast.error("PIN 번호는 최소 4자리 이상이어야 합니다.");
            return;
        }

        setPinLoading(true);
        try {
            changePin(activeProfile.id, oldPin, newPin);
            toast.success("PIN 번호가 성공적으로 변경되었습니다.");
            setOldPin('');
            setNewPin('');
            setConfirmPin('');
            setTab('switch');
        } catch (err: any) {
            toast.error(err.message || "PIN 변경 실패");
        } finally {
            setPinLoading(false);
        }
    };

    const handleCreateProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) {
            toast.error("프로필 이름을 입력하세요.");
            return;
        }

        setCreateLoading(true);
        try {
            const created = addProfile({
                name: newName,
                role: newRole,
                avatar: newAvatar,
                pin: newProfilePin,
                description: newDesc
            });
            toast.success(`'${created.name}' 프로필이 추가되었습니다.`);
            setNewName('');
            setNewDesc('');
            setTab('switch');
        } catch (err: any) {
            toast.error(err.message || "프로필 생성 실패");
        } finally {
            setCreateLoading(false);
        }
    };

    const AVATARS = ['👑', '🎬', '🤖', '⚡', '🌟', '🚀', '💡', '🎨', '🔥', '🎯'];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-card border border-border shadow-2xl rounded-3xl p-6 text-foreground">
                <DialogHeader className="mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 text-primary rounded-xl">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-extrabold text-foreground">
                                ViraLoop 계정 & 프로필 관리
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                접속 계정 전환, PIN 보안 번호 설정 및 팀원 프로필 관리
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Sub Navigation Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-muted/40 border border-border rounded-xl mb-4">
                    <button
                        onClick={() => setTab('switch')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            tab === 'switch' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        프로필 전환
                    </button>
                    <button
                        onClick={() => setTab('pin')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            tab === 'pin' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        PIN 변경
                    </button>
                    <button
                        onClick={() => setTab('create')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            tab === 'create' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        + 계정 추가
                    </button>
                </div>

                {/* TAB 1: Profile Switch */}
                {tab === 'switch' && (
                    <div className="space-y-3">
                        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                            {profiles.map((p: any) => {
                                const isActive = p.id === activeProfile?.id;
                                return (
                                    <div
                                        key={p.id}
                                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                            isActive 
                                                ? 'border-primary bg-primary/10' 
                                                : 'border-border/80 bg-muted/20 hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-2xl shrink-0">{p.avatar}</span>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                                                    {isActive && (
                                                        <Badge className="bg-primary text-primary-foreground text-[9px] px-1 py-0 font-bold">현재</Badge>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground truncate">{p.description || p.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {!isActive ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs font-bold rounded-xl"
                                                    onClick={() => handleSwitchProfile(p.id)}
                                                >
                                                    전환
                                                </Button>
                                            ) : (
                                                <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                                                    <Check className="w-3.5 h-3.5" /> 사용 중
                                                </span>
                                            )}
                                            {profiles.length > 1 && !isActive && p.id !== 'master' && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-muted-foreground hover:text-rose-500 rounded-lg"
                                                    onClick={() => {
                                                        if (confirm(`'${p.name}' 프로필을 삭제하시겠습니까?`)) {
                                                            deleteProfile(p.id);
                                                            toast.success("프로필이 삭제되었습니다.");
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="pt-3 border-t border-border flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl gap-1.5"
                                onClick={() => {
                                    logout();
                                    onOpenChange(false);
                                }}
                            >
                                <LogOut className="w-3.5 h-3.5" /> 로그아웃
                            </Button>
                            <Button
                                size="sm"
                                className="text-xs font-bold rounded-xl"
                                onClick={() => onOpenChange(false)}
                            >
                                닫기
                            </Button>
                        </div>
                    </div>
                )}

                {/* TAB 2: Change PIN */}
                {tab === 'pin' && (
                    <form onSubmit={handleChangePinSubmit} className="space-y-3.5">
                        <div className="p-3 bg-muted/30 border border-border/80 rounded-2xl flex items-center gap-2.5">
                            <span className="text-2xl">{activeProfile?.avatar}</span>
                            <div>
                                <p className="text-xs font-bold text-foreground">{activeProfile?.name}</p>
                                <p className="text-[10px] text-muted-foreground">현재 프로필의 보안 PIN 번호 변경</p>
                            </div>
                        </div>

                        {activeProfile?.requirePin && activeProfile?.pin && (
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-muted-foreground">기존 PIN 번호</label>
                                <Input
                                    type="password"
                                    maxLength={6}
                                    placeholder="기존 PIN (기본: 1234)"
                                    value={oldPin}
                                    onChange={e => setOldPin(e.target.value)}
                                    className="h-10 rounded-xl font-mono text-sm tracking-widest text-center"
                                />
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-muted-foreground">새 PIN 번호 (4~6자리)</label>
                            <Input
                                type="password"
                                maxLength={6}
                                placeholder="새 PIN 번호 입력"
                                value={newPin}
                                onChange={e => setNewPin(e.target.value)}
                                className="h-10 rounded-xl font-mono text-sm tracking-widest text-center"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-muted-foreground">새 PIN 번호 확인</label>
                            <Input
                                type="password"
                                maxLength={6}
                                placeholder="새 PIN 번호 다시 입력"
                                value={confirmPin}
                                onChange={e => setConfirmPin(e.target.value)}
                                className="h-10 rounded-xl font-mono text-sm tracking-widest text-center"
                            />
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="rounded-xl text-xs font-bold"
                                onClick={() => setTab('switch')}
                            >
                                취소
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={pinLoading}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold gap-1.5"
                            >
                                <KeyRound className="w-3.5 h-3.5" /> PIN 저장
                            </Button>
                        </div>
                    </form>
                )}

                {/* TAB 3: Create Profile */}
                {tab === 'create' && (
                    <form onSubmit={handleCreateProfileSubmit} className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-muted-foreground">아바타 아이콘</label>
                            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                                {AVATARS.map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setNewAvatar(emoji)}
                                        className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all ${
                                            newAvatar === emoji 
                                                ? 'border-primary bg-primary/20 scale-110 shadow-xs' 
                                                : 'border-border/60 bg-muted/40 hover:bg-muted'
                                        }`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-muted-foreground">프로필 이름</label>
                            <Input
                                placeholder="예: 숏폼 2팀, 외주 에디터"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="h-9 rounded-xl text-xs font-bold"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-muted-foreground">접속 PIN 번호 (4자리, 공백 시 무패스워드)</label>
                            <Input
                                type="password"
                                maxLength={6}
                                placeholder="예: 1234 (공백 시 원클릭 바로 입장)"
                                value={newProfilePin}
                                onChange={e => setNewProfilePin(e.target.value)}
                                className="h-9 rounded-xl font-mono text-xs text-center tracking-widest"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-muted-foreground">역할 설명 (선택)</label>
                            <Input
                                placeholder="예: 릴스/쇼츠 소재 추출 및 대본 작성"
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                                className="h-9 rounded-xl text-xs"
                            />
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="rounded-xl text-xs font-bold"
                                onClick={() => setTab('switch')}
                            >
                                취소
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={createLoading}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" /> 프로필 추가
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

