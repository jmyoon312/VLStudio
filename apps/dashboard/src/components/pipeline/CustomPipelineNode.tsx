import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
    Globe, FolderOpen, Radio, PenTool, Zap, Mic, Film, 
    ShieldAlert, CheckCircle2, Volume2, Music, Sparkles, 
    Sliders, Scissors, Maximize, Layers, Package, Send, 
    Loader2, Check, AlertCircle, X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const ICON_MAP: Record<string, React.FC<any>> = {
    Globe, FolderOpen, Radio, PenTool, Zap, Mic, Film, 
    ShieldAlert, CheckCircle2, Volume2, Music, Sparkles, 
    Sliders, Scissors, Maximize, Layers, Package, Send
};

export const CustomPipelineNode: React.FC<NodeProps> = memo(({ id, data, selected }) => {
    const IconComp = ICON_MAP[data.iconName] || Layers;
    const status = data.status || 'idle'; // 'idle' | 'running' | 'done' | 'error'

    return (
        <div 
            className={cn(
                "relative group w-72 rounded-2xl border bg-card/95 backdrop-blur-md shadow-lg transition-all duration-200 select-none",
                selected 
                    ? "ring-2 ring-blue-500 border-blue-500 shadow-blue-500/20 shadow-xl scale-[1.02]" 
                    : "border-border/80 hover:border-border hover:shadow-md",
                status === 'running' && "ring-2 ring-amber-400 border-amber-400 animate-pulse shadow-amber-500/20",
                status === 'done' && "border-emerald-500/80 ring-1 ring-emerald-500/30",
                status === 'error' && "border-rose-500 ring-2 ring-rose-500/40"
            )}
        >
            {/* Target Input Handle (Left) */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3.5 h-3.5 -left-2 bg-blue-500 border-2 border-white dark:border-slate-900 transition-transform hover:scale-125 cursor-crosshair"
            />

            {/* Header with Category Badge & Status */}
            <div className="px-3.5 py-2.5 bg-muted/40 border-b border-border/60 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg border", data.categoryColor)}>
                        <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-black text-foreground tracking-tight">
                        {data.categoryLabel || '레고 블록'}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    {status === 'running' && (
                        <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/30 font-bold gap-1 px-1.5 py-0.5">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            실행 중
                        </Badge>
                    )}
                    {status === 'done' && (
                        <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-bold gap-0.5 px-1.5 py-0.5">
                            <Check className="w-2.5 h-2.5" />
                            완료
                        </Badge>
                    )}
                    {status === 'error' && (
                        <Badge variant="outline" className="text-[9px] bg-rose-500/10 text-rose-500 border-rose-500/30 font-bold gap-0.5 px-1.5 py-0.5">
                            <AlertCircle className="w-2.5 h-2.5" />
                            에러
                        </Badge>
                    )}
                    {status === 'idle' && (
                        <span className="text-[10px] font-mono text-muted-foreground/60 font-bold">
                            #{id.slice(-4)}
                        </span>
                    )}

                    {data.onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                data.onDelete(id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-rose-500 rounded transition-opacity cursor-pointer ml-1"
                            title="노드 삭제"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Node Body */}
            <div className="p-3.5 space-y-2">
                <div>
                    <h4 className="text-xs font-black text-foreground">
                        {data.customLabel || data.title}
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {data.desc}
                    </p>
                </div>

                {/* Key Parameter Preview Pills */}
                {data.defaultParams && Object.keys(data.defaultParams).length > 0 && (
                    <div className="pt-2 border-t border-border/40 flex flex-wrap gap-1">
                        {Object.entries(data.defaultParams).slice(0, 3).map(([k, v]) => (
                            <span 
                                key={k}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-mono truncate max-w-[120px]"
                            >
                                <strong className="text-foreground/80">{k}:</strong> {String(v)}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Source Output Handle (Right) */}
            <Handle
                type="source"
                position={Position.Right}
                className="w-3.5 h-3.5 -right-2 bg-indigo-500 border-2 border-white dark:border-slate-900 transition-transform hover:scale-125 cursor-crosshair"
            />
        </div>
    );
});

CustomPipelineNode.displayName = 'CustomPipelineNode';
export default CustomPipelineNode;
