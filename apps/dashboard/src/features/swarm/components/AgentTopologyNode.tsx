import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
    BrainCircuit, 
    Search, 
    PenTool, 
    Video, 
    Settings, 
    ShieldCheck, 
    Activity,
    UploadCloud,
    Zap,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useSwarmStore } from '@/hooks/useSwarmStore';

// ─── Agent Node Data Interface ───────────────────────────────────────────────
export interface AgentNodeData {
    label: string;
    role: 'COORDINATOR' | 'RESEARCHER' | 'WRITER' | 'MEDIA' | 'EDITOR' | 'PUBLISHER' | 'ANALYST';
    status: 'IDLE' | 'THINKING' | 'PRODUCING' | 'FAILED' | 'FINALIZING';
    skills: string[];
    isThinking?: boolean;
    onClick?: () => void;
}

// ─── Role Helpers ─────────────────────────────────────────────────────────────
const getRoleIcon = (role: AgentNodeData['role']) => {
    switch (role) {
        case 'COORDINATOR': return <BrainCircuit className="w-5 h-5 text-indigo-600" />;
        case 'RESEARCHER':  return <Search      className="w-5 h-5 text-emerald-600" />;
        case 'WRITER':      return <PenTool     className="w-5 h-5 text-amber-600" />;
        case 'MEDIA':       return <Video       className="w-5 h-5 text-rose-600" />;
        case 'EDITOR':      return <Settings    className="w-5 h-5 text-blue-600" />;
        case 'PUBLISHER':   return <UploadCloud className="w-5 h-5 text-fuchsia-600" />;
        case 'ANALYST':     return <Activity    className="w-5 h-5 text-cyan-600" />;
        default:            return <ShieldCheck className="w-5 h-5 text-slate-600" />;
    }
};

const getThemeColors = (role: AgentNodeData['role']) => {
    switch (role) {
        case 'COORDINATOR': return 'bg-indigo-50  border-indigo-100  text-indigo-900 shadow-indigo-100/50';
        case 'RESEARCHER':  return 'bg-emerald-50 border-emerald-100 text-emerald-900 shadow-emerald-100/50';
        case 'WRITER':      return 'bg-amber-50   border-amber-100   text-amber-900 shadow-amber-100/50';
        case 'MEDIA':       return 'bg-rose-50    border-rose-100    text-rose-900 shadow-rose-100/50';
        case 'EDITOR':      return 'bg-blue-50    border-blue-100    text-blue-900 shadow-blue-100/50';
        case 'PUBLISHER':   return 'bg-fuchsia-50 border-fuchsia-100 text-fuchsia-900 shadow-fuchsia-100/50';
        case 'ANALYST':     return 'bg-cyan-50    border-cyan-100    text-cyan-900 shadow-cyan-100/50';
        default:            return 'bg-slate-50   border-slate-100   text-slate-900 shadow-slate-100/50';
    }
};

// ─── Node Component ───────────────────────────────────────────────────────────
const AgentTopologyNode: React.FC<NodeProps<AgentNodeData>> = ({ data, isConnectable }) => {
    const activeSkill = useSwarmStore(state => state.activeSkillPerAgent[data.role] ?? '');
    const isExecuting  = !!activeSkill;
    const isThinking   = data.status === 'THINKING' || data.status === 'PRODUCING' || isExecuting;
    const isFailed     = data.status === 'FAILED';
    const themeClass   = getThemeColors(data.role);

    return (
        <div 
            className={cn(
                "relative group w-72 rounded-[2.5rem] border-2 shadow-2xl transition-all duration-500 cursor-pointer hover:scale-105",
                themeClass,
                isThinking ? "ring-8 ring-white shadow-indigo-100" : "",
                isExecuting ? "ring-8 ring-amber-50 border-amber-500/50 shadow-amber-100" : "",
                isFailed    ? "border-rose-500 ring-8 ring-rose-50" : ""
            )}
            onClick={data.onClick}
        >
            {/* Target Handle */}
            <Handle type="target" position={Position.Top}
                className="w-5 h-5 bg-white border-2 border-slate-200 rounded-full -top-2.5 z-20 shadow-lg"
                isConnectable={isConnectable}
            />

            <div className="p-6 flex flex-col h-full rounded-[2.5rem] overflow-hidden relative">
                {/* Background Accent */}
                <div className={cn("absolute top-0 right-0 w-24 h-24 blur-3xl opacity-20 -mr-8 -mt-8 rounded-full", themeClass.split(' ')[0])} />

                {/* ── Header Row ── */}
                <div className="relative z-10 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm border bg-white/80",
                            isExecuting ? "border-amber-200" : "border-white/50"
                        )}>
                            {isExecuting
                                ? <Zap className="w-6 h-6 text-amber-600 animate-pulse" />
                                : getRoleIcon(data.role)
                            }
                        </div>
                        <div>
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                                {data.role}
                            </div>
                            <h3 className="text-[13px] font-black text-slate-900 tracking-tighter italic uppercase truncate w-32">
                                {data.label}
                            </h3>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <Badge className={cn(
                        "text-[8px] font-black uppercase px-3 py-1 rounded-full shadow-sm transition-all border shrink-0",
                        isThinking ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100",
                        isFailed   ? "bg-rose-50 text-rose-600 border-rose-100" : ""
                    )}>
                        {isThinking ? (
                            <span className="flex items-center gap-1.5">
                                <Activity className="w-3 h-3 animate-spin" /> LIVE
                            </span>
                        ) : data.status}
                    </Badge>
                </div>

                {/* ── Skill Execution Banner ── */}
                <div className="relative z-10 mt-6 space-y-3">
                    {isExecuting ? (
                        <div className="bg-white/80 border border-amber-100 rounded-2xl p-4 shadow-inner">
                            <div className="flex items-center gap-3">
                                <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                                <div>
                                    <div className="text-[7px] font-black text-amber-600 uppercase tracking-widest opacity-70">Executing Skill</div>
                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate block w-40">
                                        {activeSkill}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {data.skills.slice(0, 3).map((skill, idx) => (
                                <span key={idx} className="bg-white/60 px-2.5 py-1 rounded-lg text-[8px] font-black text-slate-500 border border-white/50 uppercase tracking-tighter">
                                    {skill}
                                </span>
                            ))}
                            {data.skills.length > 3 && (
                                <span className="bg-white px-2.5 py-1 rounded-lg text-[8px] font-black text-slate-300 border border-slate-100 uppercase">
                                    +{data.skills.length - 3}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Source Handle */}
            <Handle type="source" position={Position.Bottom}
                className="w-5 h-5 bg-white border-2 border-slate-200 rounded-full -bottom-2.5 z-20 shadow-lg"
                isConnectable={isConnectable}
            />
        </div>
    );
};

export default AgentTopologyNode;
