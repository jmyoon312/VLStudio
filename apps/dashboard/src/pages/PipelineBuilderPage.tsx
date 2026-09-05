import React, { useState, useEffect } from 'react';
import { 
    GitBranch, Plus, Play, Trash2, ArrowRight, Layers, 
    Sparkles, Settings, FileJson, Check 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';

export const PipelineBuilderPage: React.FC = () => {
    const [pipelines, setPipelines] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPipeline, setSelectedPipeline] = useState<any | null>(null);

    const loadPipelines = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/pipelines/');
            setPipelines(res.data || []);
            if (res.data && res.data.length > 0 && !selectedPipeline) {
                setSelectedPipeline(res.data[0]);
            }
        } catch (err: any) {
            toast.error("파이프라인 목록 로드 실패: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPipelines();
    }, []);

    const handleRun = async (pipeId: string) => {
        try {
            const res = await api.post(`/pipelines/${pipeId}/run`, {});
            toast.success(res.data?.message || "파이프라인이 정상적으로 가동되었습니다.");
        } catch (err: any) {
            toast.error("실행 실패: " + err.message);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                        <GitBranch className="w-7 h-7 text-blue-600" />
                        파이프라인 빌더 & 랩 (Pipeline Builder)
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        원자 단위 작업 노드(Lego Blocks)를 조립하여 나만의 맞춤형 영상 제작 공정을 무제한으로 설계하고 실행합니다.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left: Pipeline List */}
                <div className="space-y-3">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        등록된 파이프라인 목록 ({pipelines.length})
                    </div>
                    <div className="space-y-2">
                        {pipelines.map((p) => (
                            <div
                                key={p.id}
                                onClick={() => setSelectedPipeline(p)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                                    selectedPipeline?.id === p.id 
                                        ? "bg-blue-500/10 border-blue-500/40 shadow-xs" 
                                        : "bg-card border-border hover:bg-muted/40"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black text-foreground">{p.name}</h4>
                                    <Badge variant="outline" className="text-[10px] font-bold">
                                        {p.nodes?.length || 0} 노드
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                    {p.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Pipeline Details & Visual Node Sequence */}
                <div className="md:col-span-2 space-y-4">
                    {selectedPipeline ? (
                        <Card className="border-border bg-card shadow-xs rounded-2xl overflow-hidden">
                            <CardHeader className="bg-muted/30 border-b border-border py-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                            {selectedPipeline.name}
                                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-mono">
                                                {selectedPipeline.id}
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-1">
                                            {selectedPipeline.description}
                                        </CardDescription>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleRun(selectedPipeline.id)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 shadow-xs"
                                    >
                                        <Play className="w-3.5 h-3.5 mr-1 fill-current" />
                                        이 절차로 실행
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="text-xs font-black text-foreground flex items-center gap-1.5">
                                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    순차 작업 흐름 (Processing Sequence)
                                </div>

                                <div className="space-y-3">
                                    {selectedPipeline.nodes?.map((node: any, idx: number) => (
                                        <div key={node.id || idx} className="relative flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 p-3.5 bg-muted/20 border border-border/80 rounded-xl flex items-center justify-between">
                                                <div>
                                                    <div className="text-xs font-bold text-foreground">{node.title}</div>
                                                    <div className="text-[10px] text-muted-foreground font-mono">노드 타입: {node.type}</div>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 font-bold">
                                                    연결 완료
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-2xl">
                            파이프라인을 선택해 주세요.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PipelineBuilderPage;
