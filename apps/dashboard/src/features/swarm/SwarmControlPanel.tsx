import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, ShieldCheck, Settings2, Activity, Info, ChevronRight, RefreshCw } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import api from '../../lib/api';
import { cn } from "@/lib/utils";
import { useQueryClient } from '@tanstack/react-query';

type SwarmMode = 'AUTONOMOUS' | 'CONFIRMATION' | 'EXPERT' | 'ADAPTIVE';

export const SwarmControlPanel = () => {
    const queryClient = useQueryClient();
    const [mode, setMode] = useState<SwarmMode>('CONFIRMATION');
    const [stats, setStats] = useState({ activeChannels: 0, pendingApprovals: 0, productionRate: 0 });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await api.get('/swarm/status');
                setMode(res.data.mode);
                setStats(res.data.stats);
            } catch (err) {
                console.error("Failed to fetch swarm status");
            }
        };
        fetchStatus();
    }, []);

    const handleChangeMode = async (newMode: SwarmMode) => {
        setIsLoading(true);
        try {
            await api.post('/swarm/mode', { mode: newMode });
            setMode(newMode);
            queryClient.invalidateQueries({ queryKey: ['swarmStatus'] });
        } catch (err) {
            console.error("Failed to update mode");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full bg-white/60 backdrop-blur-3xl border-b border-white/40 px-8 py-2 shadow-sm relative overflow-hidden group">
            <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-8 h-12">
                {/* [LEFT] Brand & Label */}
                <div className="flex items-center gap-4 shrink-0 pr-6 border-r border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-900 rounded-xl shadow-lg ring-4 ring-indigo-500/5">
                            <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-xs font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                                AI Hub Control
                            </h2>
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                통합 군집 제어 대시보드
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline" className="bg-indigo-50/50 text-indigo-600 border-indigo-100 px-2 py-0 h-5 font-black text-[7px] tracking-widest uppercase rounded-lg">
                        E2.1 LATEST
                    </Badge>
                </div>

                {/* [CENTER] Unified Mode Selector (Horizontal Group) */}
                <div className="flex-1 flex items-center justify-center gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner border border-slate-200/50">
                        {[
                            { id: 'AUTONOMOUS', label: '스마트 자동', icon: Zap },
                            { id: 'CONFIRMATION', label: '단계별 승인', icon: ShieldCheck },
                            { id: 'EXPERT', label: '전문가 디렉팅', icon: Settings2 },
                            { id: 'ADAPTIVE', label: '적용형 최적화', icon: RefreshCw }
                        ].map((m) => (
                            <button
                                key={m.id}
                                onClick={() => handleChangeMode(m.id as SwarmMode)}
                                disabled={isLoading}
                                className={cn(
                                    "flex items-center gap-2.5 px-6 py-1.5 rounded-xl transition-all duration-300",
                                    mode === m.id 
                                        ? "bg-slate-900 text-white shadow-xl scale-[1.02] z-10" 
                                        : "text-slate-400 hover:text-slate-600 hover:bg-white"
                                )}
                            >
                                <m.icon className={cn("w-3.5 h-3.5", mode === m.id ? "text-indigo-400" : "text-slate-300")} />
                                <span className="text-[10px] font-black uppercase tracking-tight">{m.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* [RIGHT] Live Telemetry Snippets */}
                <div className="flex items-center gap-8 shrink-0 pl-6 border-l border-slate-100">
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">활성 채널</span>
                        <span className="text-sm font-black text-slate-900 tabular-nums mt-1">{stats?.activeChannels ?? 0}<span className="text-[9px] text-slate-300 ml-0.5">/30</span></span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">승인 대기</span>
                        <span className="text-sm font-black text-amber-500 tabular-nums mt-1">{stats?.pendingApprovals ?? 0}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">생산 효율</span>
                        <div className="flex items-center gap-2 mt-1">
                             <span className="text-sm font-black text-emerald-500 tabular-nums">{stats?.productionRate ?? 0}%</span>
                             <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${stats?.productionRate ?? 0}%` }} />
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SwarmControlPanel;
