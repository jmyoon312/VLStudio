import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    ReactFlowProvider,
    ReactFlowInstance,
    Panel,
    BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

import { 
    GitBranch, Play, Save, Download, Upload, 
    RefreshCcw, LayoutGrid, Plus, Trash2, Layers, 
    Sparkles, CheckCircle2, ChevronDown, Check, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';

import { CustomPipelineNode } from '@/components/pipeline/CustomPipelineNode';
import { NodePalette } from '@/components/pipeline/NodePalette';
import { NodeInspector } from '@/components/pipeline/NodeInspector';
import { 
    LEGO_NODE_TEMPLATES, 
    STANDARD_PIPELINES, 
    PipelinePreset, 
    LegoNodeTemplate 
} from '@/components/pipeline/pipelineData';

const nodeTypes = {
    custom: CustomPipelineNode
};

// Dagre Layout Engine
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, ranksep: 80, nodesep: 40 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 300, height: 160 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - 150,
                y: nodeWithPosition.y - 80
            }
        };
    });

    return { nodes: layoutedNodes, edges };
};

export const PipelineBuilderPage: React.FC = () => {
    const defaultPreset = STANDARD_PIPELINES[0]; // Full Generative AI
    const [selectedPresetId, setSelectedPresetId] = useState<string>(defaultPreset.id);
    const [pipelineName, setPipelineName] = useState<string>(defaultPreset.name);
    const [pipelineDesc, setPipelineDesc] = useState<string>(defaultPreset.description);

    const [nodes, setNodes, onNodesChange] = useNodesState(defaultPreset.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(defaultPreset.edges);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [allPipelines, setAllPipelines] = useState<PipelinePreset[]>(STANDARD_PIPELINES);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch saved pipelines from backend on mount
    const fetchPipelines = useCallback(async () => {
        try {
            const res = await api.get('/pipelines/');
            if (res.data && Array.isArray(res.data)) {
                // Merge standard presets with custom pipelines
                const customPipelines = res.data.filter((p: any) => !STANDARD_PIPELINES.some(sp => sp.id === p.id));
                if (customPipelines.length > 0) {
                    const formattedCustom: PipelinePreset[] = customPipelines.map((cp: any) => ({
                        id: cp.id,
                        name: cp.name,
                        category: cp.category || 'custom',
                        description: cp.description || '',
                        nodes: cp.nodes || [],
                        edges: cp.edges || []
                    }));
                    setAllPipelines([...STANDARD_PIPELINES, ...formattedCustom]);
                }
            }
        } catch (err) {
            console.warn("Failed to fetch pipelines from backend:", err);
        }
    }, []);

    useEffect(() => {
        fetchPipelines();
    }, [fetchPipelines]);

    // Connect Nodes with Port Schema Type Linter
    const onConnect = useCallback((params: Connection) => {
        const sourceNode = nodes.find(n => n.id === params.source);
        const targetNode = nodes.find(n => n.id === params.target);
        
        let isTypeWarning = false;
        if (sourceNode?.data && targetNode?.data) {
            const sourceOutputs: string[] = sourceNode.data.outputs || [];
            const targetInputs: string[] = targetNode.data.inputs || [];
            
            // Check if there is type intersection
            if (sourceOutputs.length > 0 && targetInputs.length > 0) {
                const hasMatch = sourceOutputs.some(out => targetInputs.includes(out));
                if (!hasMatch) {
                    isTypeWarning = true;
                    toast.warning(
                        `[포트 타입 주의] '${sourceNode.data.customLabel || sourceNode.data.title}'의 출력(${sourceOutputs.join(', ')})과 ` +
                        `'${targetNode.data.customLabel || targetNode.data.title}'의 입력(${targetInputs.join(', ')}) 타입이 일치하지 않을 수 있습니다.`
                    );
                }
            }
        }

        setEdges((eds) => addEdge({
            ...params,
            animated: true,
            style: isTypeWarning 
                ? { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '4 4' } 
                : { stroke: '#6366f1', strokeWidth: 2 }
        }, eds));

        if (!isTypeWarning) {
            toast.info("노드 연결선이 생성되었습니다.");
        }
    }, [nodes, setEdges]);

    // Handle Node Click -> Open Inspector
    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
    }, []);

    // Handle Pane Click -> Close Inspector
    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    // Auto-Layout
    const onLayout = useCallback(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
        toast.success("노드 그래프가 깔끔하게 자동 정렬되었습니다.");
    }, [nodes, edges, setNodes, setEdges]);

    // Switch Preset
    const handleSelectPreset = (presetId: string) => {
        const preset = allPipelines.find(p => p.id === presetId) || STANDARD_PIPELINES.find(p => p.id === presetId);
        if (!preset) return;
        setSelectedPresetId(preset.id);
        setPipelineName(preset.name);
        setPipelineDesc(preset.description);

        const { nodes: lNodes, edges: lEdges } = getLayoutedElements(preset.nodes, preset.edges);
        setNodes(lNodes);
        setEdges(lEdges);
        setSelectedNode(null);
        toast.success(`'${preset.name}' 파이프라인이 로드되었습니다.`);
    };

    // Create New Blank Pipeline
    const handleCreateNewPipeline = () => {
        const newId = `custom_pipeline_${Date.now()}`;
        const newName = "신규 커스텀 파이프라인";
        const newDesc = "사용자 정의 비주얼 노드 워크플로우";
        setSelectedPresetId(newId);
        setPipelineName(newName);
        setPipelineDesc(newDesc);
        setNodes([]);
        setEdges([]);
        setSelectedNode(null);
        toast.success("빈 캔버스가 준비되었습니다. 좌측 레고 블록 카탈로그에서 노드를 추가하세요.");
    };

    // Delete Pipeline
    const handleDeletePipeline = async (pId: string) => {
        if (STANDARD_PIPELINES.some(sp => sp.id === pId)) {
            toast.error("시스템 표준 파이프라인 템플릿은 삭제할 수 없습니다.");
            return;
        }
        try {
            await api.delete(`/pipelines/${pId}`);
            setAllPipelines(prev => prev.filter(p => p.id !== pId));
            handleSelectPreset(STANDARD_PIPELINES[0].id);
            toast.success("커스텀 파이프라인이 삭제되었습니다.");
        } catch (err: any) {
            toast.error("삭제 실패: " + err.message);
        }
    };

    // Add node from Palette
    const handleAddNode = (template: LegoNodeTemplate) => {
        const id = `node_${Date.now()}`;
        const newNode: Node = {
            id,
            type: 'custom',
            position: {
                x: 200 + Math.random() * 100,
                y: 150 + Math.random() * 100
            },
            data: {
                ...template,
                customLabel: template.title,
                status: 'idle',
                onDelete: handleDeleteNode
            }
        };
        setNodes((nds) => nds.concat(newNode));
        setSelectedNode(newNode);
        toast.success(`'${template.title}' 노드가 캔버스에 추가되었습니다.`);
    };

    // Drag and Drop from Palette
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow/type');
            if (!type || !reactFlowInstance) return;

            const template = LEGO_NODE_TEMPLATES.find(t => t.type === type);
            if (!template) return;

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY
            });

            const newNode: Node = {
                id: `node_${Date.now()}`,
                type: 'custom',
                position,
                data: {
                    ...template,
                    customLabel: template.title,
                    status: 'idle',
                    onDelete: handleDeleteNode
                }
            };

            setNodes((nds) => nds.concat(newNode));
            setSelectedNode(newNode);
            toast.success(`'${template.title}' 노드가 드롭되었습니다.`);
        },
        [reactFlowInstance, setNodes]
    );

    // Delete Node
    const handleDeleteNode = useCallback((nodeId: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
        if (selectedNode?.id === nodeId) setSelectedNode(null);
        toast.info("노드가 캔버스에서 제거되었습니다.");
    }, [selectedNode, setNodes, setEdges]);

    // Update Node Data from Inspector
    const handleUpdateNodeData = useCallback((nodeId: string, updatedData: any) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            ...updatedData
                        }
                    };
                }
                return node;
            })
        );
        setSelectedNode((prev) => (prev?.id === nodeId ? { ...prev, data: updatedData } : prev));
    }, [setNodes]);

    // Run Simulation (Dry-Run Step-by-Step Glowing Animation)
    const handleRunSimulation = async () => {
        if (isRunning || nodes.length === 0) return;
        setIsRunning(true);
        toast.info(`'${pipelineName}' 파이프라인 무인 테스트 가동을 시작합니다...`);

        // Reset all nodes to idle
        setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: 'idle' } })));

        // Sequentially execute nodes
        for (let i = 0; i < nodes.length; i++) {
            const currentNode = nodes[i];
            // Set current node to running
            setNodes((nds) =>
                nds.map((n) =>
                    n.id === currentNode.id ? { ...n, data: { ...n.data, status: 'running' } } : n
                )
            );
            await new Promise((r) => setTimeout(r, 1200));

            // Set current node to completed
            setNodes((nds) =>
                nds.map((n) =>
                    n.id === currentNode.id ? { ...n, data: { ...n.data, status: 'done' } } : n
                )
            );
        }

        setIsRunning(false);
        toast.success(`'${pipelineName}' 파이프라인의 모든 노드가 성공적으로 완주되었습니다! CapCut 프로젝트가 생성 준비되었습니다.`);

        // Call backend runner API
        try {
            await api.post(`/pipelines/${selectedPresetId}/run`, {
                name: pipelineName,
                nodes_count: nodes.length
            });
        } catch {}
    };

    // Save Pipeline to Backend
    const handleSavePipeline = async () => {
        setIsSaving(true);
        try {
            const payload = {
                id: selectedPresetId,
                name: pipelineName,
                description: pipelineDesc,
                nodes: nodes.map(n => ({
                    id: n.id,
                    type: n.data.type,
                    title: n.data.customLabel || n.data.title,
                    position: n.position,
                    params: n.data.defaultParams
                })),
                edges: edges.map(e => ({
                    id: e.id,
                    source: e.source,
                    target: e.target
                }))
            };
            await api.post('/pipelines/', payload);
            toast.success("파이프라인이 성공적으로 저장되었습니다.");
        } catch (e: any) {
            toast.error("저장 실패: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Export Pipeline JSON
    const handleExportJson = () => {
        const exportData = {
            version: '2.0',
            id: selectedPresetId,
            name: pipelineName,
            description: pipelineDesc,
            nodes,
            edges,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pipeline_${selectedPresetId}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("파이프라인 구성이 JSON 파일로 내보내졌습니다.");
    };

    // Import Pipeline JSON
    const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
                    setNodes(data.nodes);
                    setEdges(data.edges);
                    if (data.name) setPipelineName(data.name);
                    if (data.description) setPipelineDesc(data.description);
                    toast.success("JSON 파이프라인 그래프를 성공적으로 불러왔습니다.");
                } else {
                    toast.error("유효하지 않은 파이프라인 JSON 파일입니다.");
                }
            } catch (err: any) {
                toast.error("JSON 파싱 오류: " + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <ReactFlowProvider>
            <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-background select-none">
                {/* Top Control Bar */}
                <div className="h-14 px-4 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between shrink-0 gap-3 z-30 shadow-2xs">
                    {/* Left: Title & Preset Selector */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                                <GitBranch className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-sm font-black text-foreground tracking-tight truncate">
                                        파이프라인 빌더 & 랩
                                    </h1>
                                    <Badge variant="secondary" className="text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                        GUI 캔버스 v2.0
                                    </Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate hidden sm:block">
                                    Dify / ComfyUI 스타일 비주얼 노드 그래프 엔진
                                </p>
                            </div>
                        </div>

                        {/* Preset Selector Dropdown & New Button */}
                        <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-border">
                            <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">파이프라인:</span>
                            <select
                                value={selectedPresetId}
                                onChange={(e) => handleSelectPreset(e.target.value)}
                                className="h-8 text-xs font-bold bg-muted/40 border border-border/80 rounded-xl px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[220px] truncate"
                            >
                                <optgroup label="시스템 표준 파이프라인">
                                    {STANDARD_PIPELINES.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </optgroup>
                                {allPipelines.filter(p => !STANDARD_PIPELINES.some(sp => sp.id === p.id)).length > 0 && (
                                    <optgroup label="사용자 커스텀 파이프라인">
                                        {allPipelines.filter(p => !STANDARD_PIPELINES.some(sp => sp.id === p.id)).map(p => (
                                            <option key={p.id} value={p.id}>⭐ {p.name}</option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCreateNewPipeline}
                                className="h-8 px-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-xl"
                                title="새로운 빈 파이프라인 캔버스 생성"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                새 파이프라인
                            </Button>

                            {!STANDARD_PIPELINES.some(sp => sp.id === selectedPresetId) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeletePipeline(selectedPresetId)}
                                    className="h-8 px-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-xl"
                                    title="현재 커스텀 파이프라인 삭제"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Right: Actions (Run, Layout, Save, Export, Import) */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onLayout}
                            className="h-8 text-xs font-bold border-border rounded-xl hidden sm:flex"
                            title="노드 그래프를 깔끔하게 자동 정렬합니다."
                        >
                            <LayoutGrid className="w-3.5 h-3.5 mr-1 text-primary" />
                            자동 정렬
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportJson}
                            className="h-8 text-xs font-bold border-border rounded-xl hidden lg:flex"
                            title="파이프라인 JSON 내보내기"
                        >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            JSON
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-8 text-xs font-bold border-border rounded-xl hidden lg:flex"
                            title="파이프라인 JSON 불러오기"
                        >
                            <Upload className="w-3.5 h-3.5 mr-1" />
                            불러오기
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImportJson}
                            accept=".json"
                            className="hidden"
                        />

                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isSaving}
                            onClick={handleSavePipeline}
                            className="h-8 text-xs font-bold border-border rounded-xl"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                            저장
                        </Button>

                        <Button
                            size="sm"
                            disabled={isRunning}
                            onClick={handleRunSimulation}
                            className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs gap-1.5"
                        >
                            {isRunning ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    실행 중...
                                </>
                            ) : (
                                <>
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    파이프라인 테스트 가동
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Workspace: Left Palette + Center Canvas + Right Inspector */}
                <div className="flex-1 flex w-full overflow-hidden relative">
                    {/* Left: Node Palette */}
                    <NodePalette onAddNode={handleAddNode} />

                    {/* Center: ReactFlow Canvas */}
                    <div className="flex-1 h-full w-full relative bg-slate-50 dark:bg-slate-950/80">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeClick={onNodeClick}
                            onPaneClick={onPaneClick}
                            onInit={setReactFlowInstance}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            nodeTypes={nodeTypes}
                            fitView
                            snapToGrid
                            snapGrid={[16, 16]}
                            defaultEdgeOptions={{ animated: true, style: { strokeWidth: 2 } }}
                        >
                            <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#64748b" className="opacity-20" />
                            <Controls className="bg-card border-border shadow-md rounded-xl fill-foreground" />
                            <MiniMap 
                                nodeStrokeWidth={3} 
                                className="bg-card/80 border-border rounded-xl shadow-md overflow-hidden hidden sm:block"
                                nodeColor="#3b82f6"
                            />

                            {/* Canvas Status Panel */}
                            <Panel position="top-left" className="m-3 p-2.5 rounded-xl bg-card/80 backdrop-blur-md border border-border shadow-xs flex items-center gap-2">
                                <span className="text-[11px] font-black text-foreground">
                                    {pipelineName}
                                </span>
                                <Badge variant="outline" className="text-[10px] font-bold">
                                    노드 {nodes.length}개 / 연결 {edges.length}개
                                </Badge>
                            </Panel>
                        </ReactFlow>
                    </div>

                    {/* Right: Node Properties Inspector Drawer */}
                    {selectedNode && (
                        <NodeInspector
                            selectedNode={selectedNode}
                            onUpdateNodeData={handleUpdateNodeData}
                            onDeleteNode={handleDeleteNode}
                            onClose={() => setSelectedNode(null)}
                        />
                    )}
                </div>
            </div>
        </ReactFlowProvider>
    );
};

export default PipelineBuilderPage;
