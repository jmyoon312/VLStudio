import React from 'react';
import { Node } from 'reactflow';
import { 
    Sliders, X, Trash2, Settings, Sparkles, Check, 
    Layers, ArrowRight, CornerDownRight, Play 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface NodeInspectorProps {
    selectedNode: Node | null;
    onUpdateNodeData: (nodeId: string, updatedData: any) => void;
    onDeleteNode: (nodeId: string) => void;
    onClose: () => void;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
    selectedNode,
    onUpdateNodeData,
    onDeleteNode,
    onClose
}) => {
    if (!selectedNode) return null;

    const data = selectedNode.data || {};
    const params = data.defaultParams || {};

    const handleParamChange = (key: string, value: any) => {
        const newParams = { ...params, [key]: value };
        onUpdateNodeData(selectedNode.id, {
            ...data,
            defaultParams: newParams
        });
    };

    const handleLabelChange = (newLabel: string) => {
        onUpdateNodeData(selectedNode.id, {
            ...data,
            customLabel: newLabel
        });
    };

    return (
        <div className="w-84 h-full border-l border-border bg-card/90 backdrop-blur-md flex flex-col shrink-0 select-none overflow-hidden shadow-xl z-20">
            {/* Header */}
            <div className="p-3.5 border-b border-border flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-foreground">노드 파라미터 인스펙터</h3>
                        <p className="text-[10px] text-muted-foreground font-mono">ID: #{selectedNode.id}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Inspector Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
                {/* Category & Title */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">노드 명칭</span>
                        <Badge variant="outline" className="text-[10px] font-bold">
                            {data.categoryLabel || 'Lego Block'}
                        </Badge>
                    </div>
                    <Input
                        value={data.customLabel || data.title || ''}
                        onChange={(e) => handleLabelChange(e.target.value)}
                        className="h-8 text-xs font-bold bg-muted/40 rounded-xl"
                    />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {data.desc}
                    </p>
                </div>

                {/* Sockets Mapping (Inputs / Outputs) */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border/70 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                        <span>연결 인터페이스 (Sockets)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                            <span className="text-muted-foreground block mb-1 font-semibold">입력 (Inputs):</span>
                            {data.inputs && data.inputs.length > 0 ? (
                                data.inputs.map((inp: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-[9px] font-mono mr-1 mb-1 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                        {inp}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-muted-foreground/60 italic">없음 (Root 시작점)</span>
                            )}
                        </div>
                        <div>
                            <span className="text-muted-foreground block mb-1 font-semibold">출력 (Outputs):</span>
                            {data.outputs && data.outputs.length > 0 ? (
                                data.outputs.map((out: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-[9px] font-mono mr-1 mb-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                        {out}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-muted-foreground/60 italic">종단 노드</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Dynamic Parameter Fields */}
                <div className="space-y-3 pt-2 border-t border-border">
                    <div className="text-[11px] font-black text-foreground flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5 text-blue-600" />
                        세부 런타임 제원
                    </div>

                    {params && Object.keys(params).length > 0 ? (
                        Object.entries(params).map(([key, val]) => (
                            <div key={key} className="space-y-1 bg-muted/20 p-2.5 rounded-xl border border-border/60">
                                <label className="text-[10px] font-mono font-bold text-muted-foreground block">
                                    {key}
                                </label>
                                {typeof val === 'boolean' ? (
                                    <div className="flex items-center gap-2 pt-1">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(val)}
                                            onChange={(e) => handleParamChange(key, e.target.checked)}
                                            className="w-4 h-4 rounded text-blue-600"
                                        />
                                        <span className="text-[11px] text-foreground font-semibold">
                                            {val ? '활성화 (Enabled)' : '비활성 (Disabled)'}
                                        </span>
                                    </div>
                                ) : (
                                    <Input
                                        value={String(val)}
                                        onChange={(e) => handleParamChange(key, e.target.value)}
                                        className="h-7 text-xs font-mono bg-card border-border/80 rounded-lg"
                                    />
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-[11px] text-muted-foreground/70 italic p-3 text-center border border-dashed rounded-xl">
                            기본 설정으로 자동 실행되는 노드입니다.
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Node Footer */}
            <div className="p-3 border-t border-border bg-muted/20">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteNode(selectedNode.id)}
                    className="w-full text-xs font-bold text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 rounded-xl h-8"
                >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    이 노드 캔버스에서 제거
                </Button>
            </div>
        </div>
    );
};

export default NodeInspector;
