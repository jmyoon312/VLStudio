import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    ReactFlowProvider,
    useReactFlow,
    Connection,
    Edge,
    MarkerType,
    Node,
    OnEdgesDelete,
    useOnSelectionChange,
    XYPosition,
    SelectionMode,
    addEdge,
    NodeMouseHandler,
    ControlButton,
    Position
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { useParams, useNavigate } from 'react-router-dom';
import useNodeStore from '../hooks/useNodeStore';

import {
    Layout, Activity, AlertTriangle, ArrowLeft,
    MousePointer2, Save, Radio, Power, Trash, ExternalLink, Edit,
    Plus, Copy, ClipboardPaste, Network, Workflow, Database, Bot, Share2, Link, Eye, UserCircle2, Wand2, MoreVertical,
    Clock, CheckCircle2, Cloud, Film, Type, Music, Scissors, LayoutTemplate, Sparkles, MessageSquare,
    Globe, Clapperboard, Image, Newspaper, AlignJustify,
    PanelLeftClose, PanelLeftOpen, Hourglass, Pencil, Check, X, Upload
} from 'lucide-react';
import api from '../lib/api';
import { Input } from "@/components/ui/input";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import WorkflowGuideButton from '../components/WorkflowGuideButton';

import WorkerNode from '../components/nodes/WorkerNode';
import AIAgentNode from '../components/nodes/AIAgentNode';
import WebhookNode from '../components/nodes/WebhookNode';
import ManualTriggerNode from '../components/nodes/ManualTriggerNode';
import ReferenceMonitorNode from '../components/nodes/ReferenceMonitorNode';
import SchedulerNode from '../components/nodes/SchedulerNode';
import LocalizerNode from '../components/nodes/LocalizerNode';
import SyncVideoNode from '../components/nodes/SyncVideoNode';
import StudioSubtitleNode from '../components/nodes/StudioSubtitleNode';
import DistributionNode from '../components/nodes/DistributionNode';
import UploadToQueueNode from '../components/nodes/UploadToQueueNode';
import AssetLoaderNode from '../components/nodes/AssetLoaderNode';
import WebScraperNode from '../components/nodes/WebScraperNode';
import StockAssetNode from '../components/nodes/StockAssetNode';
import TTSNode from '../components/nodes/TTSNode';
import VideoGenNode from '../components/nodes/VideoGenNode';
import SmartCutNode from '../components/nodes/SmartCutNode';
import CropTemplateNode from '../components/nodes/CropTemplateNode';
import ScriptRemixNode from '../components/nodes/ScriptRemixNode';
import TextAnimNode from '../components/nodes/TextAnimNode';
import AudioMixNode from '../components/nodes/AudioMixNode';
import ManualTaskNode from '../components/nodes/ManualTaskNode';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Dynamic Node Width Calculation
const getNodeWidth = (type?: string) => {
    switch (type) {
        case 'manualTaskNode': return 400; // Wide inputs
        case 'cropTemplateNode': return 400; // Wide previews
        case 'smartCutNode': return 350;
        default: return 320; // Standard size
    }
};

const nodeHeight = 200;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        const width = getNodeWidth(node.type);
        dagreGraph.setNode(node.id, { width, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const newNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const width = getNodeWidth(node.type);
        const newNode = {
            ...node,
            targetPosition: isHorizontal ? Position.Left : Position.Top,
            sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
            position: {
                x: nodeWithPosition.x - width / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };

        return newNode;
    });

    return { nodes: newNodes, edges };
};
import AnimatedEdge from '../components/edges/AnimatedEdge';
import NodeInspector from '../components/nodes/NodeInspector';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

// Node Types Registry
const nodeTypes = {
    workerNode: WorkerNode,
    aiAgentNode: AIAgentNode,
    webhookNode: WebhookNode,
    manualTriggerNode: ManualTriggerNode,
    referenceMonitorNode: ReferenceMonitorNode,
    schedulerNode: SchedulerNode,
    studioSubtitleNode: StudioSubtitleNode,
    distributionNode: DistributionNode,
    metadataGenNode: AIAgentNode,
    localizerNode: LocalizerNode,
    syncVideoNode: SyncVideoNode,
    uploadToQueueNode: UploadToQueueNode,
    assetLoaderNode: AssetLoaderNode,
    webScraperNode: WebScraperNode,
    stockAssetNode: StockAssetNode,
    ttsNode: TTSNode,
    videoGenNode: VideoGenNode,
    smartCutNode: SmartCutNode,
    cropTemplateNode: CropTemplateNode,
    scriptRemixNode: ScriptRemixNode,
    textAnimNode: TextAnimNode,
    audioMixNode: AudioMixNode,
    manualTaskNode: ManualTaskNode,
};

const edgeTypes = {
    animatedEdge: AnimatedEdge,
};

const BrandChannelNodeEditor = () => {
    const { workflowId } = useParams(); // Get Workflow ID
    const navigate = useNavigate();
    const {
        nodes, edges, mode, setMode,
        onNodesChange, onEdgesChange,
        updateNodeData, setNodes, setEdges, addNode, onConnect,
        undo, redo, snapshot
    } = useNodeStore();
    const { toast } = useToast();
    const reactFlowInstance = useReactFlow();

    const [isDemoMode, setIsDemoMode] = useState(false);
    const [inspectorNodeId, setInspectorNodeId] = useState<string | null>(null);
    const [clipboard, setClipboard] = useState<{ nodes: Node[], edges: Edge[] } | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const ref = useRef<HTMLDivElement>(null);

    // Title State
    const [workflowTitle, setWorkflowTitle] = useState("");
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState("");

    // Persistence State
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Context Menu State
    const [menu, setMenu] = useState<{ id: string; top: number; left: number; right: number; bottom: number; } | null>(null);

    // --- Persistence Logic ---
    const saveWorkflow = useCallback(async () => {
        if (!workflowId || isDemoMode) return;
        setIsSaving(true);
        try {
            const graphData = reactFlowInstance.toObject();
            await api.put(`/workflows/${workflowId}`, { graph_data: graphData });
            setLastSaved(new Date());
            // toast({title: "저장됨", description: "워크플로우가 저장되었습니다." }); // Optional: limit noise
        } catch (error) {
            console.error("Failed to save workflow", error);
            toast({ variant: "destructive", title: "저장 실패", description: "서버에 저장하지 못했습니다." });
        } finally {
            setIsSaving(false);
        }
    }, [workflowId, isDemoMode, reactFlowInstance, toast]);

    const handleSaveTitle = async () => {
        if (!workflowId || !tempTitle.trim()) return;
        try {
            await api.put(`/workflows/${workflowId}`, { title: tempTitle });
            setWorkflowTitle(tempTitle);
            setIsEditingTitle(false);
            toast({ title: "Updated", description: "Workflow renamed." });
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "Rename failed." });
        }
    };

    // Auto-Save Loop
    useEffect(() => {
        if (!workflowId || isDemoMode) return;

        const autoSave = setInterval(() => {
            saveWorkflow();
        }, 30000); // 30 seconds

        return () => clearInterval(autoSave);
    }, [saveWorkflow, workflowId, isDemoMode]);


    // Load Logic
    useEffect(() => {
        const loadGraph = async () => {
            if (!workflowId) {
                // If no ID, maybe demo mode or default
                setIsDemoMode(true);
                return;
            }
            try {
                const response = await api.get(`/workflows/${workflowId}`);
                const data = response.data;
                const graph = data.graph_data;
                setWorkflowTitle(data.title || `Workflow #${workflowId}`);

                if (graph && graph.nodes) {
                    setNodes(graph.nodes || []);
                    setEdges(graph.edges || []);
                    // Restore viewport if possible: reactFlowInstance.setViewport(graph.viewport);
                }

                // --- Sync Mode with Status ---
                if (data.is_active) {
                    setMode('op');
                } else {
                    setMode('edit');
                }

                setLastSaved(new Date(data.updated_at));
            } catch (error: any) {
                console.error("Load failed", error);

                if (error.response && error.response.status === 404) {
                    toast({ variant: "destructive", title: "워크플로우 없음", description: "요청하신 워크플로우를 찾을 수 없습니다. 목록으로 이동합니다." });
                    navigate('/workflows');
                    return;
                }

                setIsDemoMode(true);
                toast({ variant: "default", title: "데모 모드", description: "새 워크플로우 또는 오프라인 모드입니다." });
            }
        };
        loadGraph();
    }, [workflowId, setNodes, setEdges, toast]);


    // --- Technical Safeguard: Connection Logic ---
    const isValidConnection = (connection: Connection) => {
        // ... (Same logic as before, omitting for brevity if unchanged, but keeping it safe)
        // Allowing loose connections for now based on user "Features over strictness"
        return true;
    };



    const pasteNodes = useCallback(() => {
        if (!clipboard) return;

        // 1. Generate ID Mapping
        const idMap = new Map<string, string>();
        const newNodes = clipboard.nodes.map(node => {
            const newId = uuidv4();
            idMap.set(node.id, newId);
            return {
                ...node,
                id: newId,
                position: { x: node.position.x + 50, y: node.position.y + 50 },
                data: { ...node.data, label: `${node.data.label} (Copy)` },
                selected: true
            };
        });

        // 2. Re-create Edges with new IDs
        const newEdges = clipboard.edges.map(edge => {
            const newSource = idMap.get(edge.source);
            const newTarget = idMap.get(edge.target);
            if (newSource && newTarget) {
                return { ...edge, id: `e-${newSource}-${newTarget}`, source: newSource, target: newTarget, selected: true };
            }
            return null;
        }).filter(Boolean) as Edge[];

        // 3. Deselect old, select new
        nodes.forEach(n => n.selected = false);
        edges.forEach(e => e.selected = false);

        setNodes([...nodes, ...newNodes]);
        setEdges([...edges, ...newEdges]);
        toast({ title: "붙여넣기 완료", description: `${newNodes.length}개 노드 생성` });
    }, [clipboard, nodes, edges, setNodes, setEdges, toast]);

    const onLayout = useCallback(
        (direction: string) => {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                nodes,
                edges,
                direction
            );

            setNodes([...layoutedNodes]);
            setEdges([...layoutedEdges]);
            setTimeout(() => reactFlowInstance.fitView({ duration: 500 }), 100);
        },
        [nodes, edges, setNodes, setEdges, reactFlowInstance]
    );

    // --- Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;

            // Global: Space to toggle mode
            if (e.code === 'Space' && !e.ctrlKey) {
                setMode(mode === 'op' ? 'edit' : 'op');
                // e.preventDefault(); // Might conflict with scrolling, use care
            }

            if (mode !== 'edit') return;

            // Save: Ctrl+S
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.code === 'KeyS')) {
                e.preventDefault();
                saveWorkflow();
                toast({ title: "수동 저장됨", description: "현재 상태가 저장되었습니다." });
            }

            // Select All: Ctrl+A
            if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.code === 'KeyA')) {
                e.preventDefault();
                setNodes(nodes.map(n => ({ ...n, selected: true })));
                setEdges(edges.map(e => ({ ...e, selected: true })));
            }

            // Copy: Ctrl+C
            if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.code === 'KeyC')) {
                const selected = nodes.filter(n => n.selected);
                if (selected.length > 0) {
                    const selectedIds = new Set(selected.map(n => n.id));
                    const connectedEdges = edges.filter(edge => selectedIds.has(edge.source) && selectedIds.has(edge.target));
                    setClipboard({ nodes: selected, edges: connectedEdges });
                    toast({ title: "복사됨", description: `${selected.length}개 노드` });
                    e.preventDefault();
                }
            }

            // Undo: Ctrl+Z
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.code === 'KeyZ') && !e.shiftKey) {
                e.preventDefault();
                undo();
                toast({ title: "실행 취소", duration: 1000 });
            }

            // Redo: Ctrl+Y or Ctrl+Shift+Z
            if ((e.ctrlKey || e.metaKey) && ((e.key === 'y' || e.code === 'KeyY') || (e.shiftKey && (e.key === 'z' || e.code === 'KeyZ')))) {
                e.preventDefault();
                redo();
                toast({ title: "다시 실행", duration: 1000 });
            }

            // Paste: Ctrl+V
            if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.code === 'KeyV')) {
                if (clipboard) {
                    snapshot(); // Snapshot before paste
                    pasteNodes();
                    e.preventDefault();
                }
            }

            // Delete: Delete
            if (e.key === 'Delete') {
                const selected = nodes.filter(n => n.selected);
                if (selected.length > 0) {
                    snapshot(); // Snapshot before delete
                    const selectedIds = new Set(selected.map(n => n.id));
                    setNodes(nodes.filter(n => !selectedIds.has(n.id)));
                    setEdges(edges.filter(e => !selectedIds.has(e.source) && !selectedIds.has(e.target)));
                    // toast({title: "삭제됨", description: `${selected.length}개 노드` });
                }
            }

            // Delete Edges: Backspace or Delete
            if (e.key === 'Backspace' || e.key === 'Delete') {
                const selectedEdges = edges.filter(e => e.selected);
                const selectedNodes = nodes.filter(n => n.selected);

                if (selectedEdges.length > 0 || selectedNodes.length > 0) {
                    snapshot(); // Snapshot before delete

                    if (selectedEdges.length > 0) {
                        setEdges(edges.filter(e => !e.selected));
                    }
                    if (selectedNodes.length > 0) {
                        const selectedIds = new Set(selectedNodes.map(n => n.id));
                        setNodes(nodes.filter(n => !selectedIds.has(n.id)));
                        setEdges(edges.filter(e => !selectedIds.has(e.source) && !selectedIds.has(e.target)));
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [clipboard, mode, edges, nodes, reactFlowInstance, pasteNodes, saveWorkflow, setMode, setNodes, setEdges, toast, undo, redo, snapshot]);


    // --- Context Menu Handling ---
    const onNodeContextMenu: NodeMouseHandler = useCallback(
        (event, node) => {
            event.preventDefault();
            // The menu is inside the relative container (canvas area).
            // We need coordinates relative to that container.
            // Using ref.current (wrapper) might include header if menu is inside wrapper but not header.
            // Actually, the menu is inside the canvas container (flex-1 relative), which is a child of ref.current.
            // Let's rely on event.clientY correction assuming the menu is absolutely positioned relative to the VIEWPORT if we don't fix the container.
            // But wait, the previous code used event.clientY directly which was the problem.

            // Fix: Calculate offset relative to the container.
            // Since we don't have a direct ref to the inner container easily available without adding one, 
            // and the menu is inside the 'relative' container which is the 2nd child of 'ref'.
            // Let's try to get the bounding rect of the target's offsetParent or simply use the fact that 
            // the menu is in a 'relative' container.

            // We will use the existing ref (wrapper) but we need to subtract its top/left AND the header height if it's inside the canvas part.
            // Easier way: The menu uses 'top/left' styles.
            // If the parent is 'relative', top/left are relative to the parent's top-left.

            // Let's get the bounding rect of the element that contains the menu.
            // Currently ref points to the outer div. The menu is in the second child div.
            // We can approximate or just add a proper ref.
            // Let's assume standard behavior: Event clientX/Y are global.
            // We want Local X/Y = Client X/Y - Container Client X/Y.

            const pane = ref.current?.getBoundingClientRect();
            // The 'ref' is the outer wrapper. The menu is inside the canvas div (which is below the header).
            // The header is approx 64px (h-16 equivalent) but let's be precise.
            // Actually, since the menu is inside the `relative` container, we should subtract that container's rect.
            // But we don't have that ref.
            // However, the `ref` is the main container. `pane.top` is the top of the main container.
            // `event.clientY` is global.
            // If we assume the menu is relative to the VIEWPORT, we would use fixed positioning. But it is absolute.

            // Proposal: Change the menu to 'fixed' positioning in the style, then we can use clientX/Y directly! (easiest fix)
            // OR Fix the math.

            // Let's try fixing the math by subtracting the offset.
            // Since I can't easily change the ref structure in one go reliably without seeing the return statement perfectly, 
            // I will use 'fixed' position for the menu which solves the "relative to what" ambiguity.
            // Wait, looking at lines 530: `className="absolute ..."`
            // I will change `absolute` to `fixed` in the render block later? No, that requires another edit.

            // Better: use the `ref` (wrapper) and realize the menu is likely rendered relative to the WRAPPER (if it was the relative parent).
            // BUT the canvas div (child) has `relative`. The menu is inside THAT.
            // So the menu is relative to the Canvas Div.
            // The Canvas Div is `ref.current.children[1]` (roughly).

            // Let's try to get the canvas bounds dynamically via the event target? No, event target is the node.
            // Safest bet: Use `reactFlowInstance.project`? No, that's for flow coords.

            // I will updated logic to subtract a hardcoded header offset (approx 53px based on py-3 border-b)? 
            // Or better, just grab the wrapper rect and adding the header offset.

            // Alternative: Simply use `event.nativeEvent.offsetX / Y`? No, that's relative to the node.

            // Correct approach: Just change `absolute` to `fixed` in the menu rendering code (lines 529+).
            // Then `top: event.clientY` is correct (viewport relative).
            // This is the most robust fix for "context menu too far".

            if (!pane) return;
            setMenu({
                id: node.id,
                // We will use FIXED positioning for the menu in the next step, so we store clientX/Y.
                top: event.clientY,
                left: event.clientX,
                right: 0,
                bottom: 0,
            });
        },
        [setMenu]
    );
    const onPaneClick = useCallback(() => setMenu(null), [setMenu]);
    const handleMenuAction = (action: 'edit' | 'duplicate' | 'delete') => {
        if (!menu) return;
        const node = nodes.find((n) => n.id === menu.id);
        if (!node) return;
        if (action === 'edit') { setInspectorNodeId(node.id); }
        else if (action === 'duplicate') {
            const newId = uuidv4();
            const newNode = { ...node, id: newId, position: { x: node.position.x + 20, y: node.position.y + 20 }, selected: true };
            setNodes([...nodes.map(n => ({ ...n, selected: false })), newNode]);
        }
        else if (action === 'delete') {
            setNodes(nodes.filter((n) => n.id !== node.id));
            setEdges(edges.filter((e) => e.source !== node.id && e.target !== node.id));
        }
        setMenu(null);
    };

    // --- Toolbar Actions (Add Node) ---
    const createNode = (type: string, label: string, extraData: any = {}) => {
        const id = uuidv4();
        // Determine internal type for data if needed (simple mapping)
        let innerType: 'worker' | 'channel' | undefined;
        if (type === 'workerNode') innerType = 'worker';
        if (type === 'channelNode') innerType = 'channel';

        const newNode: Node = {
            id,
            type,
            position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
            data: { label, type: innerType, ...extraData },
            draggable: true,
            selectable: true,
        };
        addNode(newNode);
    };

    // --- Styles ---
    const bgClass = mode === 'op' ? 'bg-muted' : 'bg-background';
    const gridColor = mode === 'op' ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.08)';

    return (
        <div className="w-full h-[calc(100vh-64px)] flex flex-col animate-in fade-in duration-300" ref={ref}>
            {/* Header */}
            <div className={`px-6 py-3 border-b flex items-center justify-between transition-colors duration-500 bg-card text-foreground border-border`}>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/workflows')} className="mr-2">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>

                    {isEditingTitle ? (
                        <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                            <Input
                                value={tempTitle}
                                onChange={e => setTempTitle(e.target.value)}
                                className="h-8 w-[220px] text-sm font-bold bg-muted border-primary focus-visible:ring-primary"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-emerald-500/10 text-emerald-500" onClick={handleSaveTitle}>
                                <Check className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-destructive/10 text-destructive" onClick={() => setIsEditingTitle(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group cursor-pointer py-1.5 px-3 rounded-lg hover:bg-muted/50 transition-all border border-transparent hover:border-border"
                            onClick={() => { setTempTitle(workflowTitle); setIsEditingTitle(true); }}>
                            <Network className="w-4 h-4 text-primary" />
                            <span className="text-sm font-bold text-foreground max-w-[220px] truncate tracking-tight" title={workflowTitle}>
                                {workflowTitle}
                            </span>
                            <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}

                    <Badge variant={mode === 'op' ? 'default' : 'secondary'} className={`ml-3 ${mode === 'op' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-muted text-muted-foreground border-border border'}`}>
                        {mode === 'op' ? '운영 모드 (OP)' : '설계 모드 (DESIGN)'}
                    </Badge>

                    {/* Persistence Indicator */}
                    <div className="flex items-center gap-2 ml-4 text-xs text-muted-foreground">
                        {isSaving ? (
                            <><Cloud className="w-3 h-3 animate-pulse" /> 저장 중...</>
                        ) : lastSaved ? (
                            <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> 저장됨 ({lastSaved.toLocaleTimeString()})</>
                        ) : null}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <WorkflowGuideButton />
                    <Button size="sm" variant={mode === 'op' ? 'secondary' : 'default'} onClick={saveWorkflow} className="gap-2">
                        <Save className="w-4 h-4" /> 시나리오 저장 (Ctrl+S)
                    </Button>
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Switch checked={mode === 'edit'} onCheckedChange={(c) => setMode(c ? 'edit' : 'op')} className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-emerald-500" />
                    </div>
                </div>
            </div>

            {/* Canvas */}
            <div className={`flex-1 relative ${bgClass}`}>
                {/* TOOLBAR */}
                {mode === 'edit' && (
                    <div className={cn(
                        "absolute top-4 left-4 z-10 flex flex-col transition-all duration-300 bg-card/95 backdrop-blur shadow-xl rounded-xl border border-border overflow-hidden",
                        isSidebarOpen ? "w-44 max-h-[calc(100vh-100px)]" : "w-10 h-10"
                    )}>
                        {/* Toggle Header */}
                        <div className={cn("flex items-center p-2", isSidebarOpen ? "justify-between border-b border-border" : "justify-center")}>
                            {isSidebarOpen && <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">노드 목록</span>}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setSidebarOpen(!isSidebarOpen)}
                                title={isSidebarOpen ? "목록 숨기기" : "목록 보이기"}
                            >
                                {isSidebarOpen ? <PanelLeftClose className="w-4 h-4 text-muted-foreground" /> : <PanelLeftOpen className="w-4 h-4 text-muted-foreground" />}
                            </Button>
                        </div>

                        {/* Node List (Scrollable) */}
                        <div className={cn(
                            "flex flex-col gap-1 p-2 overflow-y-auto scrollbar-hide",
                            isSidebarOpen ? "opacity-100 visible" : "opacity-0 invisible h-0 p-0"
                        )}>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1 mt-1">입력 (Input)</span>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('schedulerNode', '스케줄러')}>
                                <Clock className="w-3 h-3 text-emerald-500" /> 스케줄러 (Cron)
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('manualTriggerNode', '수동 입력')}>
                                <Link className="w-3 h-3 text-cyan-500" /> 수동 입력
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('referenceMonitorNode', '레퍼런스 감시')}>
                                <Eye className="w-3 h-3 text-emerald-500" /> 레퍼런스 감시
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('assetLoaderNode', '자산 로더 (Asset)')}>
                                <Database className="w-3 h-3 text-blue-500" /> 자산 로더 (Asset)
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('webScraperNode', '웹 스크래퍼')}>
                                <Globe className="w-3 h-3 text-cyan-500" /> 웹 스크래퍼
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('stockAssetNode', '스톡 자산')}>
                                <Image className="w-3 h-3 text-teal-500" /> 스톡 자산
                            </Button>

                            <div className="h-px bg-border my-1" />
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">처리 (Process)</span>

                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('aiAgentNode', 'AI 에이전트')}>
                                <Bot className="w-3 h-3 text-pink-500" /> AI 에이전트
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('ttsNode', '음성 생성')}>
                                <Music className="w-3 h-3 text-violet-500" /> 음성 생성
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('videoGenNode', '영상 생성')}>
                                <Film className="w-3 h-3 text-pink-500" /> 영상 생성
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('studioSubtitleNode', '스튜디오 자막')}>
                                <Type className="w-3 h-3 text-amber-500" /> 스튜디오 자막
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('smartCutNode', '스마트 컷')}>
                                <Scissors className="w-3 h-3 text-pink-500" /> 스마트 컷
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('cropTemplateNode', '크롭 템플릿')}>
                                <LayoutTemplate className="w-3 h-3 text-orange-500" /> 크롭 템플릿
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('scriptRemixNode', '스크립트 리믹스')}>
                                <Sparkles className="w-3 h-3 text-indigo-500" /> 스크립트 리믹스
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('textAnimNode', '텍스트 애니메이션')}>
                                <Sparkles className="w-3 h-3 text-violet-500" /> 텍스트 애니메이션
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('manualTaskNode', '수동 작업')}>
                                <AlertTriangle className="w-3 h-3 text-orange-600" /> 수동 작업
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('audioMixNode', '오디오 믹스')}>
                                <Music className="w-3 h-3 text-purple-500" /> 오디오 믹스
                            </Button>

                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('localizerNode', '다국어 번역')}>
                                <Globe className="w-3 h-3 text-teal-500" /> 다국어 번역
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('syncVideoNode', '영상 동기화')}>
                                <Clapperboard className="w-3 h-3 text-orange-500" /> 영상 동기화
                            </Button>


                            <div className="h-px bg-border my-1" />
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">배포 (Dist)</span>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('distributionNode', '배포 매니저')}>
                                <Share2 className="w-3 h-3 text-green-600" /> 배포 매니저
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('uploadToQueueNode', '대기열 업로드')}>
                                <Upload className="w-3 h-3 text-purple-600" /> 대기열 업로드
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('workerNode', '워커')}>
                                <Activity className="w-3 h-3 text-blue-500" /> 워커
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start gap-2 text-[11px] h-7 px-2" onClick={() => createNode('webhookNode', '웹훅')}>
                                <Link className="w-3 h-3 text-indigo-500" /> 웹훅
                            </Button>
                        </div>
                    </div>
                )}


                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    defaultEdgeOptions={{ type: 'animatedEdge', animated: true, style: { strokeWidth: 2, stroke: 'var(--border)' } }}
                    minZoom={0.1}
                    fitView

                    onNodeDragStart={() => { if (snapshot) snapshot(); }} // Snapshot before moving node
                    onNodeDoubleClick={(_, node) => { setInspectorNodeId(node.id) }} // Allow inspect in both modes
                    onNodeContextMenu={onNodeContextMenu}
                    onPaneClick={onPaneClick}

                    selectionMode={mode === 'edit' ? SelectionMode.Partial : undefined}
                    nodesDraggable={mode === 'edit'}
                    nodesConnectable={mode === 'edit'}

                    // Interaction: Left Drag to Select in Edit Mode
                    panOnDrag={mode === 'op' ? true : [1, 2]} // Pan on Left(0) in Op, Middle(1)/Right(2) in Edit
                    selectionOnDrag={mode === 'edit'} // Enable selection box on left click only in Edit
                    panOnScroll={true}

                    deleteKeyCode={['Backspace', 'Delete']}
                    className={bgClass}
                >
                    <Background color={gridColor} gap={20} size={1} />
                    <Controls
                        className="bg-card border-border text-foreground shadow-sm flex flex-row gap-1"
                        position="bottom-center" // ReactFlow 11 support position? Or we leverage layout
                        style={{ display: 'flex', flexDirection: 'row' }}
                    >
                        <ControlButton onClick={() => onLayout('LR')} title="자동 정렬 (Auto Layout)">
                            <AlignJustify strokeWidth={2} />
                        </ControlButton>
                        <ControlButton onClick={() => {
                            if (window.confirm("정말 모든 노드를 삭제하시겠습니까?")) {
                                snapshot();
                                setNodes([]);
                                setEdges([]);
                                toast({ title: "초기화됨", description: "전체 삭제 완료" });
                            }
                        }} title="전체 삭제 (Clear All)">
                            <Trash strokeWidth={2} className="text-red-500" />
                        </ControlButton>
                    </Controls>
                    {mode === 'edit' && <MiniMap className="bg-card/50" />}
                </ReactFlow>

                {menu && (
                    <div style={{ top: menu.top, left: menu.left }} className="fixed z-50 min-w-[160px] bg-card rounded-md border border-border shadow-xl p-1 animate-in zoom-in-95 duration-100">
                        <div className="text-[10px] font-bold text-muted-foreground px-2 py-1 uppercase tracking-wider bg-muted rounded-t mb-1">동작</div>
                        <Button variant="ghost" className="w-full justify-start h-8 text-sm font-normal" onClick={() => handleMenuAction('edit')}>
                            <Edit className="w-4 h-4 mr-2 text-blue-500" /> 편집 (Edit)
                        </Button>
                        <Button variant="ghost" className="w-full justify-start h-8 text-sm font-normal" onClick={() => handleMenuAction('duplicate')}>
                            <Copy className="w-4 h-4 mr-2 text-green-500" /> 복제 (Duplicate)
                        </Button>
                        <div className="h-px bg-border my-1" />
                        <Button variant="ghost" className="w-full justify-start h-8 text-sm font-normal text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleMenuAction('delete')}>
                            <Trash className="w-4 h-4 mr-2" /> 삭제 (Delete)
                        </Button>
                    </div>
                )}
            </div>

            <NodeInspector nodeId={inspectorNodeId} open={!!inspectorNodeId} onClose={() => setInspectorNodeId(null)} />
        </div>
    );
};

export default () => (
    <ReactFlowProvider>
        <BrandChannelNodeEditor />
    </ReactFlowProvider>
);
