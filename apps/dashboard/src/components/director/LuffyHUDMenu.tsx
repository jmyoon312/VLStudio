import React, { useState, useEffect } from 'react';
import { 
    Bot, Cpu, Activity, Shield, Sparkles, ChevronDown, ChevronUp, 
    RefreshCw, Layers, CheckCircle2, Play, Radio
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

export interface HermesBotStatus {
    id: string;
    name: string;
    role: string;
    emoji: string;
    status: 'idle' | 'busy' | 'error';
    currentTask?: string;
    learningsCount?: number;
}

export interface LuffyHUDMenuProps {
    className?: string;
    activeChannelId?: number | null;
    activeChannelName?: string;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

export const LuffyHUDMenu: React.FC<LuffyHUDMenuProps> = ({
    className,
    activeChannelName = '전역 채널',
    isExpanded: controlledExpanded,
    onToggleExpand
}) => {
    const [internalExpanded, setInternalExpanded] = useState(false);
    const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
    const toggleExpand = onToggleExpand || (() => setInternalExpanded(prev => !prev));

    const [gpuActiveSlots, setGpuActiveSlots] = useState<number>(0);
    const [gpuMaxSlots, setGpuMaxSlots] = useState<number>(2);
    const [activeQueueCount, setActiveQueueCount] = useState<number>(0);
    const [isBotScreenActive, setIsBotScreenActive] = useState<boolean>(false);

    const [bots, setBots] = useState<HermesBotStatus[]>([
        { id: 'scout', name: 'Scout', role: '트렌드 정찰', emoji: '📡', status: 'idle', currentTask: '대기 중', learningsCount: 14 },
        { id: 'writer', name: 'Writer', role: '대본 작가', emoji: '✍️', status: 'idle', currentTask: '대기 중', learningsCount: 28 },
        { id: 'critic', name: 'Critic-85', role: '품질 검수', emoji: '🧐', status: 'idle', currentTask: '대기 중', learningsCount: 35 },
        { id: 'voice', name: 'Voice', role: '보이스 더빙', emoji: '🎙️', status: 'idle', currentTask: '대기 중', learningsCount: 19 },
        { id: 'visual', name: 'Visual', role: '영상 생성', emoji: '🎨', status: 'idle', currentTask: '대기 중', learningsCount: 42 },
        { id: 'cutter', name: 'Cutter', role: '컷 편집', emoji: '✂️', status: 'idle', currentTask: '대기 중', learningsCount: 12 },
        { id: 'assembler', name: 'Assembler', role: '타임라인 패키징', emoji: '📦', status: 'idle', currentTask: '대기 중', learningsCount: 25 },
        { id: 'deployer', name: 'Deployer', role: '채널 발행', emoji: '🚀', status: 'idle', currentTask: '대기 중', learningsCount: 16 },
    ]);

    const fetchStatus = async () => {
        try {
            const rosterRes = await api.get('/harness/bot-crew/roster');
            const botList = rosterRes.data?.bots || rosterRes.data?.roster;
            if (Array.isArray(botList) && botList.length > 0) {
                setBots(botList.map((b: any) => ({
                    id: b.id || b.name,
                    name: b.name,
                    role: b.role,
                    emoji: b.avatar_emoji || b.avatar || '🤖',
                    status: b.status || 'idle',
                    currentTask: b.current_task || '대기 중',
                    learningsCount: b.canonical_memory?.episodic_learnings?.length || 0
                })));
            }
        } catch {
            // Keep defaults
        }

        try {
            const arbiterRes = await api.get('/brand-channels/directors/arbiter-status');
            if (arbiterRes.data) {
                setGpuActiveSlots(arbiterRes.data.gpu_active_tasks || 0);
                setGpuMaxSlots(arbiterRes.data.gpu_max_semaphore || 2);
                setActiveQueueCount(arbiterRes.data.total_queued_tasks || 0);
            }
        } catch {
            // Ignore
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleToggleBotScreen = async () => {
        const nextState = !isBotScreenActive;
        setIsBotScreenActive(nextState);
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.toggleBotScreen) {
            try {
                await electronAPI.toggleBotScreen({ active: nextState });
                toast.success(nextState ? "🖥️ 에이전트 봇 스크린 활성화됨" : "봇 스크린 비활성화됨");
            } catch {
                toast.info(`봇 스크린: ${nextState ? '활성' : '비활성'}`);
            }
        } else {
            toast.info(`봇 스크린: ${nextState ? '활성' : '비활성'}`);
        }
    };

    return (
        <div className={cn("select-none transition-all duration-200", className)}>
            {/* 1. Sleek HUD Compact Bar */}
            <div className="h-9 px-3 bg-muted/30 border-b border-border/60 flex items-center justify-between text-xs gap-2">
                {/* Left: Hermes Core Badge & Status */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleExpand}
                        className="flex items-center gap-1.5 font-bold text-foreground hover:text-primary transition-colors cursor-pointer group"
                        title={isExpanded ? "HUD 메뉴 접기" : "HUD 상세 메뉴 펼치기"}
                    >
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <Bot className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-extrabold text-[11px] tracking-tight">Hermes HUD</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground group-hover:text-primary" /> : <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-primary" />}
                    </button>

                    <Badge variant="outline" className="text-[10px] h-5 font-semibold bg-muted/60 border-border text-muted-foreground">
                        {activeChannelName}
                    </Badge>
                </div>

                {/* Center: 8 Bot Crew LED Strip */}
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-card/60 border border-border/50">
                    {bots.map((bot) => (
                        <div
                            key={bot.id}
                            className="flex items-center gap-1 group cursor-pointer"
                            title={`${bot.name} (${bot.role}): ${bot.currentTask}`}
                        >
                            <span className="text-[11px]">{bot.emoji}</span>
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full transition-all",
                                bot.status === 'busy' ? "bg-amber-500 animate-pulse ring-1 ring-amber-500/40" :
                                bot.status === 'error' ? "bg-rose-500" :
                                "bg-emerald-500/80"
                            )} />
                        </div>
                    ))}
                </div>

                {/* Right: GPU Semaphores & Bot Screen Toggle */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/40">
                        <Cpu className="w-3 h-3 text-primary shrink-0" />
                        <span>GPU {gpuActiveSlots}/{gpuMaxSlots}</span>
                    </div>

                    <button
                        type="button"
                        onClick={handleToggleBotScreen}
                        className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer border",
                            isBotScreenActive 
                                ? "bg-primary text-primary-foreground border-primary" 
                                : "bg-card text-muted-foreground border-border/80 hover:text-foreground"
                        )}
                        title="Electron 봇 스크린 (Computer-Use) 토글"
                    >
                        🖥️ 봇 스크린
                    </button>
                </div>
            </div>

            {/* 2. Expanded HUD Drawer Menu */}
            {isExpanded && (
                <div className="px-4 py-3 bg-card border-b border-border/80 shadow-xs animate-in slide-in-from-top-2 duration-150 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* A. Arbiter State */}
                        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                            <div className="flex items-center justify-between font-bold text-foreground text-[11px]">
                                <span className="flex items-center gap-1">
                                    <Cpu className="w-3.5 h-3.5 text-primary" />
                                    Global Arbiter 자원 중재
                                </span>
                                <span className="text-emerald-500">정상 가동</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                                • GPU 슬롯: <span className="font-semibold text-foreground">{gpuActiveSlots} / {gpuMaxSlots} (세마포어)</span><br/>
                                • 대기 중 큐: <span className="font-semibold text-foreground">{activeQueueCount}건</span>
                            </div>
                        </div>

                        {/* B. Active Channel DNA */}
                        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                            <div className="flex items-center justify-between font-bold text-foreground text-[11px]">
                                <span className="flex items-center gap-1">
                                    <Shield className="w-3.5 h-3.5 text-violet-500" />
                                    채널 주권 격리
                                </span>
                                <span className="text-violet-500 font-semibold">{activeChannelName}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                                • 직교 샌드박스 DNA 주입 완료<br/>
                                • 어휘 사전 & 금기어 필터 연동
                            </div>
                        </div>

                        {/* C. Quick Actions */}
                        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 flex flex-col justify-between">
                            <div className="font-bold text-foreground text-[11px] flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                빠른 관제 작업
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[10px] px-2"
                                    onClick={fetchStatus}
                                >
                                    <RefreshCw className="w-2.5 h-2.5 mr-1" />
                                    새로고침
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LuffyHUDMenu;
