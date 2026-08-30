import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, LayoutGrid, MonitorPlay, X, LayoutPanelLeft, LayoutPanelTop, CheckCircle2, Layers } from 'lucide-react';
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
        setMode(newMode);
        const r = ratio / 100;
        localStorage.setItem('layoutSettings', JSON.stringify({ mode: newMode, ratio: r }));
        const apiObj = (window as any).electronAPI;
        if (apiObj && typeof apiObj.setLayout === 'function') {
            apiObj.setLayout({ mode: newMode, ratio: r });
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

                    {/* 2. Layout Controls */}
                    <div className="space-y-2.5 pt-2.5 border-t border-border">
                        <span className="text-xs font-bold text-muted-foreground tracking-tight">화면 분할 배치</span>
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

                        {/* Ratio Slider */}
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
