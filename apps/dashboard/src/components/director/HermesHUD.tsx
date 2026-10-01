import React, { useState, useEffect } from 'react';
import { 
    Cpu, Activity, Radio, Shield, Sparkles, Eye, EyeOff, 
    Bot, RefreshCw, Layers, Zap, Play, CheckCircle2, AlertCircle,
    ChevronDown, ChevronUp, Search, Film, Scissors, Maximize2
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

export interface HermesHUDProps {
    className?: string;
    activeChannelId?: number | null;
    activeChannelName?: string;
    onSelectChannel?: (channelId: number) => void;
    onOpenAssetVault?: () => void;
    onTriggerSelfPlay?: () => void;
}

export const HermesHUD: React.FC<HermesHUDProps> = ({
    className,
    activeChannelId,
    activeChannelName = '전역 총사령관',
    onSelectChannel,
    onOpenAssetVault,
    onTriggerSelfPlay
}) => {
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [isBotScreenActive, setIsBotScreenActive] = useState<boolean>(false);
    const [gpuActiveSlots, setGpuActiveSlots] = useState<number>(0);
    const [gpuMaxSlots, setGpuMaxSlots] = useState<number>(2);
    const [activeQueueCount, setActiveQueueCount] = useState<number>(0);
    const [bots, setBots] = useState<HermesBotStatus[]>([
        { id: 'scout', name: 'Scout-Alpha', role: '트렌드 정찰', emoji: '📡', status: 'idle', currentTask: '대기 중', learningsCount: 14 },
        { id: 'writer', name: 'Writer-Pro', role: '대본 작가', emoji: '✍️', status: 'idle', currentTask: '대기 중', learningsCount: 28 },
        { id: 'critic', name: 'Critic-85', role: '품질 검수', emoji: '🧐', status: 'idle', currentTask: '대기 중', learningsCount: 35 },
        { id: 'voice', name: 'Voice-Sync', role: '보이스 더빙', emoji: '🎙️', status: 'idle', currentTask: '대기 중', learningsCount: 19 },
        { id: 'visual', name: 'Flow-Artist', role: '영상 생성', emoji: '🎨', status: 'idle', currentTask: '대기 중', learningsCount: 42 },
        { id: 'cutter', name: 'Smart-Cutter', role: '컷 편집', emoji: '✂️', status: 'idle', currentTask: '대기 중', learningsCount: 12 },
        { id: 'assembler', name: 'CapCut-Assembler', role: '타임라인 패키징', emoji: '📦', status: 'idle', currentTask: '대기 중', learningsCount: 25 },
        { id: 'deployer', name: 'Queue-Deployer', role: '채널 발행', emoji: '🚀', status: 'idle', currentTask: '대기 중', learningsCount: 16 },
    ]);

    // Fetch live bot roster and arbiter status
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
            // Keep default bots on backend startup or network retry
        }

        try {
            const arbiterRes = await api.get('/brand-channels/directors/arbiter-status');
            if (arbiterRes.data) {
                setGpuActiveSlots(arbiterRes.data.gpu_active_tasks || 0);
                setGpuMaxSlots(arbiterRes.data.gpu_max_semaphore || 2);
                setActiveQueueCount(arbiterRes.data.total_queued_tasks || 0);
            }
        } catch {
            // Ignore fallback
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    // Toggle Electron WebContentsView transparent Bot Screen
    const handleToggleBotScreen = async () => {
        const nextState = !isBotScreenActive;
        setIsBotScreenActive(nextState);

        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.toggleBotScreen) {
            try {
                await electronAPI.toggleBotScreen({ active: nextState });
                toast.success(nextState ? "🖥️ 에이전트 봇 스크린(Computer-Use)이 활성화되었습니다." : "에이전트 봇 스크린이 비활성화되었습니다.");
            } catch {
                toast.info(`봇 스크린 상태: ${nextState ? '활성' : '비활성'}`);
            }
        } else {
            toast.info(`봇 스크린 모드: ${nextState ? '켜짐' : '꺼짐'} (Electron 런타임 연결 대기)`);
        }
    };

    return (
        <div className={cn(
            "border border-border/80 bg-card/90 backdrop-blur-md rounded-2xl shadow-sm transition-all duration-200 select-none overflow-hidden",
            className
        )}>
            {/* Top Bar: Always Visible Compact Header */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 gap-2 text-xs">
                {/* Left: Hermes Core Badge & Active Channel */}
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <Bot className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate font-extrabold text-[12px] tracking-tight">Hermes v21.5 HUD</span>
                    </div>

                    <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-semibold bg-muted/50 border-border text-muted-foreground truncate max-w-[140px]">
                        {activeChannelName}
                    </Badge>
                </div>

                {/* Center: 8 Bot Crew LED Strip */}
                <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-muted/40 border border-border/60">
                    {bots.map((bot) => (
                        <div
                            key={bot.id}
                            className="flex items-center gap-1 group relative cursor-pointer"
                            title={`${bot.name} (${bot.role}): ${bot.currentTask} | 학습 자산 ${bot.learningsCount}건`}
                        >
                            <span className="text-[12px]">{bot.emoji}</span>
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full transition-all",
                                bot.status === 'busy' ? "bg-amber-500 animate-pulse ring-2 ring-amber-500/30" :
                                bot.status === 'error' ? "bg-rose-500" :
                                "bg-emerald-500/80"
                            )} />
                        </div>
                    ))}
                </div>

                {/* Right: GPU Semaphore & Bot Screen Toggle & Expand Button */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {/* GPU Arbiter Semaphore */}
                    <div 
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-muted/50 border border-border/60 text-[11px] font-semibold text-muted-foreground"
                        title={`GlobalArbiter GPU 세마포어: 동시 렌더링 ${gpuActiveSlots}/${gpuMaxSlots}슬롯 사용 중, 대기열 ${activeQueueCount}건`}
                    >
                        <Cpu className="w-3 h-3 text-cyan-500" />
                        <span className="hidden sm:inline">GPU</span>
                        <span className={cn(
                            "font-mono font-bold",
                            gpuActiveSlots >= gpuMaxSlots ? "text-amber-500" : "text-emerald-500"
                        )}>
                            {gpuActiveSlots}/{gpuMaxSlots}
                        </span>
                    </div>

                    {/* Bot Screen Computer-Use Toggle */}
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleToggleBotScreen}
                        className={cn(
                            "h-7 px-2 text-[11px] rounded-lg font-bold gap-1 transition-all cursor-pointer",
                            isBotScreenActive 
                                ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/40 animate-pulse"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                        title="에이전트 봇 스크린(Computer-Use 투명 레이어) 토글"
                    >
                        {isBotScreenActive ? <Eye className="w-3.5 h-3.5 text-purple-500" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span className="hidden lg:inline">봇 스크린</span>
                    </Button>

                    {/* Quick Trigger: Self-Play MCTS */}
                    {onTriggerSelfPlay && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={onTriggerSelfPlay}
                            className="h-7 px-2 text-[11px] rounded-lg font-semibold gap-1 text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
                            title="사전 모의 자기 대국(MCTS 150-분기) 즉시 실행"
                        >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span className="hidden xl:inline">모의 검증</span>
                        </Button>
                    )}

                    {/* Expand/Collapse details */}
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                        title={isExpanded ? "HUD 상세 접기" : "HUD 상세 펼치기"}
                    >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>
                </div>
            </div>

            {/* Expanded Detail Panel */}
            {isExpanded && (
                <div className="border-t border-border/60 p-3 bg-muted/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {bots.map((bot) => (
                        <div 
                            key={bot.id}
                            className="p-2.5 rounded-xl bg-card border border-border/70 flex flex-col gap-1.5 shadow-2xs hover:border-primary/40 transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                                    <span className="text-sm">{bot.emoji}</span>
                                    <span>{bot.name}</span>
                                </div>
                                <Badge 
                                    variant="outline"
                                    className={cn(
                                        "text-[10px] px-1.5 py-0 h-4 border-none font-semibold",
                                        bot.status === 'busy' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                                        bot.status === 'error' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                                        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    )}
                                >
                                    {bot.status === 'busy' ? '연산 중' : bot.status === 'error' ? '오류' : '대기'}
                                </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                                <span>역할: {bot.role}</span>
                                <span className="font-mono text-[10px] text-primary">학습 {bot.learningsCount}회</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-1 italic bg-muted/40 px-2 py-0.5 rounded-md">
                                {bot.currentTask}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HermesHUD;
