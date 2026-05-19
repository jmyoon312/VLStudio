import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, Node, Edge, Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { Target, Activity, ShieldCheck, Zap, Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Custom node for a "Channel Cluster"
interface ChannelClusterNodeData {
    channelId: string;
    channelName: string;
    niche: string;
    status: 'ACTIVE' | 'IDLE' | 'ANALYZING' | 'ERROR';
    health: number;
    onClick: () => void;
}

const ChannelClusterNode = ({ data }: { data: ChannelClusterNodeData }) => {
    const isError = data.status === 'ERROR';
    const isActive = data.status === 'ACTIVE';

    return (
        <div 
            onClick={data.onClick}
            className={`w-48 p-4 rounded-3xl border-2 transition-all duration-500 cursor-pointer shadow-2xl hover:scale-110
                ${isError ? 'bg-rose-50 border-rose-200 ring-8 ring-rose-50' : 
                  isActive ? 'bg-white border-indigo-600 ring-8 ring-indigo-50' : 
                  'bg-white border-slate-100 ring-8 ring-slate-50'}
            `}
        >
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <div className="flex justify-between items-start mb-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner
                    ${isError ? 'bg-rose-100 text-rose-600' : 
                      isActive ? 'bg-indigo-50 text-indigo-600' : 
                      'bg-slate-50 text-slate-400'}
                `}>
                    {isError ? <ShieldCheck className="w-5 h-5" /> : 
                     isActive ? <Zap className="w-5 h-5 fill-current" /> : 
                     <Target className="w-5 h-5" />}
                </div>
                <Badge className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border shadow-sm
                    ${isError ? 'bg-rose-500 text-white border-rose-400' : 
                      isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      'bg-white text-slate-400 border-slate-100'}
                `}>
                    {data.status}
                </Badge>
            </div>
            <h3 className="text-slate-900 text-[13px] font-black italic uppercase tracking-tighter truncate leading-none mb-1">{data.channelName}</h3>
            <p className="text-slate-400 text-[9px] uppercase tracking-[0.2em] font-black mb-4 opacity-60">Unit_{data.channelId}</p>
            
            <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                        className={`h-full transition-all duration-1000 ${isError ? 'bg-rose-500' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} 
                        style={{ width: `${data.health}%` }} 
                    />
                </div>
                <span className={`text-[10px] font-black italic ${isError ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {data.health}%
                </span>
            </div>
        </div>
    );
};

const EngineNode = ({ data }: { data: any }) => {
    return (
        <div className="relative group">
            {/* Outer Glow */}
            <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all duration-700" />
            
            <div className="relative w-48 p-5 rounded-[2rem] bg-indigo-600/95 backdrop-blur-xl border border-indigo-400 shadow-[0_10px_30px_rgba(79,70,229,0.3)] flex flex-col items-center justify-center text-center overflow-hidden">
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 p-1.5 opacity-10">
                    <Activity className="w-12 h-12 text-white" />
                </div>
                
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-3 border border-white/20">
                    <Cpu className="w-5 h-5 text-white animate-pulse" />
                </div>
                
                <h2 className="text-white text-sm font-black italic uppercase tracking-tighter leading-none mb-1">
                    {data.label}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-white/10 text-white border-white/20 text-[6px] font-black uppercase px-2 py-0.5">CORE ENGINE v7.0</Badge>
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(52,211,153,1)]" />
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} className="opacity-0" />
            <Handle type="target" position={Position.Top} className="opacity-0" />
        </div>
    );
};

const nodeTypes = {
    channelCluster: ChannelClusterNode,
    engine: EngineNode
};

interface GlobalFleetCanvasProps {
    groups: any[];
    onChannelSelect: (channelId: number) => void;
}

export const GlobalFleetCanvas: React.FC<GlobalFleetCanvasProps> = ({ groups, onChannelSelect }) => {
    const { nodes, edges } = useMemo(() => {
        const generatedNodes: Node<any>[] = [];
        const generatedEdges: Edge[] = [];
        
        // Central Overseer Node (Upgraded Engine Node)
        generatedNodes.push({
            id: 'global_overseer_hub',
            type: 'engine',
            position: { x: 800, y: 500 },
            data: { label: '스웜 통합 제어 엔진' }
        });

        // Flatten all channels from groups
        const allChannels = groups?.flatMap(g => g.channels.map((c: any) => ({ ...c, captainEmail: g.captainEmail }))) || [];
        const totalChannels = allChannels.length || 1;

        allChannels.forEach((channel, index) => {
            const angle = (index / totalChannels) * Math.PI * 2;
            const radius = 600 + (Math.sin(index) * 100); // variance
            const x = 800 + Math.cos(angle) * radius;
            const y = 500 + Math.sin(angle) * radius;

            const status: ChannelClusterNodeData['status'] = 
                channel.autonomyStatus === 'SOVEREIGN' ? 'ACTIVE' : 
                channel.autonomyStatus === 'SEMI_AUTO' ? 'ANALYZING' : 'IDLE';
            
            const health = channel.trustScore || 100;
            const channelIdStr = `ch_${channel.id}`;

            generatedNodes.push({
                id: channelIdStr,
                type: 'channelCluster',
                position: { x, y },
                data: {
                    channelId: channel.id.toString(),
                    channelName: channel.title,
                    niche: channel.captainEmail.split('@')[0], 
                    status,
                    health: Math.floor(health),
                    onClick: () => onChannelSelect(channel.id)
                }
            });

            // Connect to overseer
            generatedEdges.push({
                id: `e_hub_${channel.id}`,
                source: 'global_overseer_hub',
                target: channelIdStr,
                animated: status === 'ACTIVE' || status === 'ANALYZING',
                style: { 
                    stroke: health < 50 ? '#f43f5e' : status === 'ACTIVE' ? '#6366f1' : '#e2e8f0', 
                    strokeWidth: status === 'ACTIVE' ? 4 : 2,
                    opacity: 0.8
                }
            });
        });

        return { nodes: generatedNodes, edges: generatedEdges };
    }, [groups, onChannelSelect]);

    return (
        <div className="w-full h-[700px] bg-slate-50/50 rounded-[3.5rem] overflow-hidden border border-slate-100 shadow-inner relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.5, maxZoom: 1.0 }}
                maxZoom={1.0}
                minZoom={0.2}
                className="bg-transparent"
            >
                <Background color="#cbd5e1" gap={40} size={1} className="opacity-20" />
                <Controls className="bg-white border-slate-100 shadow-2xl rounded-2xl overflow-hidden p-2" />
            </ReactFlow>

            {/* Macro HUD Overlay */}
            <div className="absolute top-12 left-12 pointer-events-none">
                <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
                    <h2 className="text-white font-black uppercase tracking-[0.2em] text-sm italic flex items-center gap-4">
                        <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(99,102,241,1)]" />
                        전체 채널 운영 현황
                    </h2>
                    <p className="text-slate-400 text-[10px] font-black tracking-widest mt-3 uppercase opacity-60">Global Fleet Sync • {groups?.length || 0} Clusters • Dynamic Autonomy</p>
                </div>
            </div>
            
            <div className="absolute bottom-10 left-10 pointer-events-none">
                <div className="bg-white shadow-3xl border border-slate-100 p-4 rounded-[2rem] flex gap-8 px-8">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-[10px] text-slate-900 font-black uppercase tracking-[0.2em]">Sovereign Sync</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-slate-900 font-black uppercase tracking-[0.2em]">Secure Integrity</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
