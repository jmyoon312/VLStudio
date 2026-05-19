import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { 
    Sparkles, 
    Rocket, 
    Activity, 
    Terminal, 
    X, 
    Minimize2, 
    Maximize2,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface FloatingCommanderProps {
    commandInput: string;
    setCommandInput: (val: string) => void;
    handleSendCommand: () => void;
    isConnected: boolean;
    isThinking: boolean;
    agentLogs: any[];
    launchConfig: any;
    onClose?: () => void;
}

export const FloatingCommander: React.FC<FloatingCommanderProps> = ({
    commandInput,
    setCommandInput,
    handleSendCommand,
    isConnected,
    isThinking,
    agentLogs,
    launchConfig,
}) => {
    const [isMinimized, setIsMinimized] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [position, setPosition] = useState({ x: window.innerWidth - 450, y: window.innerHeight - 550 });
    const [size, setSize] = useState({ width: 400, height: 500 });
    const [hasBeenMoved, setHasBeenMoved] = useState(false);

    React.useEffect(() => {
        const handleResize = () => {
            if (!hasBeenMoved) {
                setPosition({ x: window.innerWidth - (size.width + 50), y: window.innerHeight - (size.height + 50) });
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [size, hasBeenMoved]);

    if (isMinimized) {
        return (
            <div className="fixed bottom-6 right-6 z-[100]">
                <Button 
                    onClick={() => setIsMinimized(false)}
                    className="w-14 h-14 rounded-2xl bg-slate-900 shadow-2xl hover:bg-indigo-600 text-white transition-all group"
                >
                    <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    {isThinking && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full animate-pulse border-2 border-white" />
                    )}
                </Button>
            </div>
        );
    }

    return (
        <Rnd
            position={position}
            size={size}
            onDragStop={(e, d) => {
                setPosition({ x: d.x, y: d.y });
                setHasBeenMoved(true);
            }}
            onResizeStop={(e, direction, ref, delta, pos) => {
                setSize({
                    width: parseInt(ref.style.width),
                    height: parseInt(ref.style.height),
                });
                setPosition(pos);
            }}
            minWidth={300}
            minHeight={isCollapsed ? 64 : 200}
            bounds="window"
            dragHandleClassName="handle"
            className="z-[100]"
            enableResizing={!isCollapsed}
            disableDragging={false}
        >
            <Card className="w-full h-full border-0 shadow-3xl bg-slate-900 text-white rounded-[2rem] overflow-hidden flex flex-col border border-white/10 backdrop-blur-xl">
                {/* Header / Drag Handle */}
                <div className="handle p-4 bg-white/5 border-b border-white/10 flex items-center justify-between cursor-move shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg">
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">MISSION TERMINAL_</span>
                            <span className="text-xs font-black italic uppercase tracking-tighter">소버린 커맨더</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                            onClick={() => setIsMinimized(true)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <Minimize2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {!isCollapsed && (
                    <>
                        {/* Status Bar */}
                        <div className="px-5 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-500")} />
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                                    {isConnected ? "스웜 네트워크 연결됨" : "노드 탐색 중..."}
                                </span>
                            </div>
                            <Badge variant="outline" className="text-[8px] font-black uppercase text-indigo-400 border-indigo-500/20 px-2 py-0">
                                {launchConfig.channelId ? `CH #${launchConfig.channelId}` : "GLOBAL HUB"}
                            </Badge>
                        </div>

                        {/* Trace Area */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <div className="p-4 py-2 flex items-center gap-2 text-slate-500">
                                <Terminal className="w-3 h-3" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Live Telemetry_실시간 관제</span>
                            </div>
                            <ScrollArea className="flex-1 px-5 font-mono text-[10px]">
                                <div className="space-y-3 pb-4">
                                    {agentLogs.length === 0 ? (
                                        <div className="text-slate-600 italic">No active pulse detected...</div>
                                    ) : (
                                        agentLogs.map((log, i) => (
                                            <div key={i} className={cn(
                                                "flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300",
                                                log.type === 'user' ? "text-indigo-400" : "text-slate-400"
                                            )}>
                                                <span className="opacity-20 shrink-0">[{new Date(log.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                                                <p className="leading-relaxed whitespace-pre-wrap">{log.text}</p>
                                            </div>
                                        ))
                                    )}
                                    {isThinking && (
                                        <div className="flex gap-2 text-indigo-400 animate-pulse">
                                            <span className="opacity-20">[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                                            <span>명령 매트릭스 분석 및 처리 중...</span>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Command Input Area */}
                        <div className="p-5 pt-0 border-t border-white/5 bg-white/[0.01]">
                            <div className="flex gap-2 mt-4">
                                <Input 
                                    value={commandInput}
                                    onChange={(e) => setCommandInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
                                    placeholder="명령을 입력하세요 (ex: 뉴스 트렌드 기반 영상 제작...)"
                                    className="h-11 rounded-xl border-white/10 bg-white/5 focus-visible:ring-indigo-500 font-bold text-slate-200 px-4 text-xs shadow-inner"
                                />
                                <Button 
                                    onClick={handleSendCommand}
                                    disabled={!isConnected || isThinking}
                                    className="h-11 w-11 rounded-xl bg-white text-slate-900 hover:bg-indigo-600 hover:text-white shadow-xl transition-all shrink-0"
                                >
                                    {isThinking ? <Activity className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </Card>
        </Rnd>
    );
};
