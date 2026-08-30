import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, LayoutGrid, MonitorPlay, X, LayoutPanelLeft, LayoutPanelTop, CheckCircle2, Layers, Eye, EyeOff, RotateCw, Home, Maximize2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

const SPLIT_MODES = [
    { value: 'split-left', label: 'Flow 좌측', icon: <LayoutPanelLeft className="w-4 h-4" /> },
    { value: 'split-right', label: 'Flow 우측', icon: <LayoutPanelLeft className="w-4 h-4 rotate-180" /> },
    { value: 'split-top', label: 'Flow 상단', icon: <LayoutPanelTop className="w-4 h-4" /> },
    { value: 'split-bottom', label: 'Flow 하단', icon: <LayoutPanelTop className="w-4 h-4 rotate-180" /> },
];

interface Profile {
    id: string;
    name: string;
    email?: string;
}

export default function MultiWindowController({
    activeViews,
    activeProfileId,
    syncViewsAndProfiles,
    tabs = [],
    onSelectTab
}: {
    activeViews: string[];
    activeProfileId: string;
    syncViewsAndProfiles: () => void;
    tabs?: any[];
    onSelectTab?: (tab: any) => void;
}) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    
    // Layout State
    const [mode, setMode] = useState(() => {
        try { return JSON.parse(localStorage.getItem('layoutSettings') || '{}').mode || 'split-left'; } catch { return 'split-left'; }
    });
    const [ratio, setRatio] = useState(() => {
        try { return Math.round((JSON.parse(localStorage.getItem('layoutSettings') || '{}').ratio || 0.45) * 100); } catch { return 45; }
    });
    const lastSplitModeRef = useRef(mode !== 'hidden' && mode !== 'none' ? mode : 'split-left');

    // Create Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");

    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load Profiles
    const loadProfilesList = async () => {
        try {
            const apiObj = (window as any).electronAPI;
            if (apiObj && typeof apiObj.loadProfiles === 'function') {
                const config = await apiObj.loadProfiles();
                if (config && Array.isArray(config.profiles)) {
                    setProfiles(config.profiles);
                }
            }
        } catch (e) {
            console.error("Failed to load profiles:", e);
        }
    };

    useEffect(() => {
        if (open) {
            loadProfilesList();
            syncViewsAndProfiles();
        }
    }, [open]);

    // Handle Split Mode Change
    const handleModeChange = (newMode: string) => {
        if (newMode !== 'hidden' && newMode !== 'none') {
            lastSplitModeRef.current = newMode;
        }
        setMode(newMode);
        const r = ratio / 100;
        localStorage.setItem('layoutSettings', JSON.stringify({ mode: newMode, ratio: r }));
        const apiObj = (window as any).electronAPI;
        if (apiObj && typeof apiObj.setLayout === 'function') {
            apiObj.setLayout({ mode: newMode, ratio: r });
        }
    };

    // Toggle Hide/Show Flow Window
    const handleToggleFlowHide = () => {
        if (mode === 'hidden' || mode === 'none') {
            const target = lastSplitModeRef.current || 'split-left';
            handleModeChange(target);
            toast({ title: "Flow 창 표시", description: `Flow 화면을 다시 표시합니다. (${target})` });
        } else {
            lastSplitModeRef.current = mode;
            handleModeChange('hidden');
            toast({ title: "Flow 창 감춤", description: "스튜디오 전체화면 모드로 전환되었습니다." });
        }
    };

    // Flow Reload / Recovery
    const handleReloadFlow = async () => {
        try {
            const apiObj = (window as any).electronAPI;
            if (apiObj && typeof apiObj.reloadFlowView === 'function') {
                toast({ title: "Flow 창 새로고침", description: "Google Flow 창을 다시 불러옵니다..." });
                await apiObj.reloadFlowView({ profileId: activeProfileId });
            } else {
                toast({ title: "새로고침", description: "화면을 다시 불러옵니다." });
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "새로고침 오류", description: e.message });
        }
    };

    // Flow Home Navigate
    const handleNavigateFlowHome = async () => {
        try {
            const apiObj = (window as any).electronAPI;
            if (apiObj && typeof apiObj.navigateFlowHome === 'function') {
                toast({ title: "Flow 홈 이동", description: "Google Flow 메인 페이지로 이동합니다..." });
                await apiObj.navigateFlowHome({ profileId: activeProfileId });
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "이동 오류", description: e.message });
        }
    };

    // Handle Ratio Slider
    const handleRatioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = parseInt(e.target.value);
        setRatio(v);
        const r = v / 100;
        localStorage.setItem('layoutSettings', JSON.stringify({ mode, ratio: r }));
        const apiObj = (window as any).electronAPI;
        if (apiObj && typeof apiObj.updateSplit === 'function') {
            apiObj.updateSplit({ ratio: r });
        }
    };

    const handleSwitchWindow = async (profId: string) => {
        const apiObj = (window as any).electronAPI;
        if (apiObj) {
            await apiObj.createFlowView?.({ profileId: profId });
            await apiObj.switchProfile?.({ profileId: profId });
            await apiObj.focusFlowView?.({ profileId: profId });
            await syncViewsAndProfiles();
        }
    };

    const handleCreate = async () => {
        if (!newName.trim()) {
            toast({ variant: "destructive", title: "입력 오류", description: "프로필 이름을 입력해주세요." });
            return;
        }
        try {
            const result = await (window as any).electronAPI?.createProfile?.({ name: newName, email: newEmail });
            if (result && result.success) {
                toast({ title: "생성 완료", description: "새로운 Flow 계정이 추가되었습니다." });
                setNewName(""); setNewEmail("");
                setIsCreateOpen(false);
                await loadProfilesList();
                syncViewsAndProfiles();
            } else {
                toast({ variant: "destructive", title: "생성 실패", description: result?.error });
            }
        } catch (err: any) {
            toast({ variant: "destructive", title: "생성 에러", description: err.message });
        }
    };

    return (
        <div ref={ref} className="relative inline-flex items-center">
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg bg-card hover:bg-accent text-sm font-semibold transition-all shadow-sm"
            >
                <LayoutGrid className="w-4 h-4 text-primary" />
                <span>다중창 통합 관리</span>
                {tabs.length > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {tabs.length}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute top-[calc(100%+8px)] right-0 w-[340px] bg-card border border-border rounded-2xl shadow-2xl z-[99999] p-3.5 flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-150">
                    
                    {/* 1. Open Tabs & Flow Worker Status */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-primary" />
                                <span>열린 탭 & Flow 창 모니터 ({tabs.length}개)</span>
                            </span>
                        </div>
                        
                        {/* Dynamic Tab / Worker List */}
                        <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto custom-scrollbar pr-0.5">
                            {tabs.map((t, idx) => {
                                const workerId = t.flowWorkerId || (idx === 0 ? 'default' : `profile${idx + 1}`);
                                const isFocused = workerId === activeProfileId;
                                const isFlowOpen = activeViews.includes(workerId);
                                
                                return (
                                    <div
                                        key={t.id || idx}
                                        onClick={() => {
                                            if (onSelectTab) onSelectTab(t);
                                            handleSwitchWindow(workerId);
                                        }}
                                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                                            isFocused 
                                            ? 'bg-primary/10 border-primary text-primary shadow-2xs font-bold' 
                                            : 'bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <MonitorPlay className={`w-4 h-4 shrink-0 ${isFocused ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs truncate font-medium">{t.name}</span>
                                                <span className="text-[10px] text-muted-foreground truncate">
                                                    {idx + 1}번 창 ({workerId === 'default' ? '기본 세션' : workerId})
                                                </span>
                                            </div>
                                        </div>

                                        {isFocused ? (
                                            <span className="text-[10px] bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                                현재 화면
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground/80 px-2 py-0.5 rounded bg-muted/60 shrink-0">
                                                백그라운드
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Google Flow Account & Profiles Management */}
                    <div className="space-y-2 pt-2.5 border-t border-border">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground tracking-tight">구글 계정 프로필 관리</span>
                            <button
                                onClick={() => setIsCreateOpen(true)}
                                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> 새 계정 추가
                            </button>
                        </div>

                        <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto custom-scrollbar pr-0.5">
                            {profiles.map(p => {
                                const isCurrent = p.id === activeProfileId;
                                return (
                                    <div
                                        key={p.id}
                                        className="flex items-center justify-between p-1.5 rounded-lg bg-muted/20 border border-transparent hover:border-border group"
                                    >
                                        <div 
                                            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                                            onClick={() => handleSwitchWindow(p.id)}
                                        >
                                            <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-xs truncate ${isCurrent ? 'font-bold text-primary' : 'text-foreground'}`}>
                                                    {p.name}
                                                </span>
                                                {p.email && <span className="text-[9px] text-muted-foreground truncate">{p.email}</span>}
                                            </div>
                                        </div>

                                        {p.id !== 'default' && (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (!confirm(`'${p.name}' 계정 프로필을 삭제하시겠습니까?`)) return;
                                                    const apiObj = (window as any).electronAPI;
                                                    await apiObj?.deleteProfile?.({ profileId: p.id });
                                                    await loadProfilesList();
                                                    await syncViewsAndProfiles();
                                                    toast({ title: "계정 삭제 완료", description: "프로필이 삭제되었습니다." });
                                                }}
                                                className="p-1 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="계정 삭제"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. Layout & Visibility Controls */}
                    <div className="space-y-2.5 pt-2.5 border-t border-border">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground tracking-tight">화면 분할 및 Flow 창 제어</span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                            {SPLIT_MODES.map(m => (
                                <button
                                    key={m.value}
                                    onClick={() => handleModeChange(m.value)}
                                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                                        mode === m.value 
                                        ? 'bg-primary text-primary-foreground border-primary shadow-2xs' 
                                        : 'bg-card border-border hover:bg-muted text-foreground'
                                    }`}
                                >
                                    {m.icon}
                                    <span>{m.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Full Hide / Restore Toggle Button */}
                        <button
                            onClick={handleToggleFlowHide}
                            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                                mode === 'hidden' || mode === 'none'
                                ? 'bg-amber-500 text-white border-amber-500 shadow-sm hover:bg-amber-600'
                                : 'bg-muted/40 border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {mode === 'hidden' || mode === 'none' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            <span>{mode === 'hidden' || mode === 'none' ? 'Flow 창 다시 표시 (분할 복원)' : 'Flow 창 숨기기 (스튜디오 넓게 쓰기)'}</span>
                        </button>

                        {/* Ratio Slider (only when visible) */}
                        {mode !== 'hidden' && mode !== 'none' && (
                            <div className="flex flex-col gap-1 pt-1">
                                <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                                    <span>Flow 브라우저 너비</span>
                                    <span className="text-primary">{ratio}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="20" 
                                    max="80" 
                                    value={ratio} 
                                    onChange={handleRatioChange}
                                    className="w-full accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        )}

                        {/* 4. Flow Troubleshooting & Recovery Bar */}
                        <div className="pt-2 border-t border-border flex items-center gap-1.5">
                            <button
                                onClick={handleReloadFlow}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-400/30 text-[11px] font-bold transition-all"
                                title="Flow 창이 하얗거나 멈췄을 때 즉시 새로고침"
                            >
                                <RotateCw className="w-3 h-3" />
                                <span>Flow 창 새로고침 / 먹통 복구</span>
                            </button>
                            <button
                                onClick={handleNavigateFlowHome}
                                className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-[11px] font-medium transition-all"
                                title="Google Flow 홈 화면으로 이동"
                            >
                                <Home className="w-3 h-3" />
                                <span>홈</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Account Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>새 Flow 계정 추가</DialogTitle>
                        <DialogDescription>
                            독립된 환경(파티션)을 갖는 새 브라우저 계정을 생성합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <span className="text-sm font-medium">프로필 이름 (식별용)</span>
                            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="예: 서브채널 1" />
                        </div>
                        <div className="space-y-2">
                            <span className="text-sm font-medium">계정 이메일 (선택)</span>
                            <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="예: sub@gmail.com" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>취소</Button>
                        <Button onClick={handleCreate}>추가하기</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
