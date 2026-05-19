import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Layout, Calendar, MoreVertical, Trash, Edit, PlayCircle, Copy, Film, MessageSquare, Newspaper, TrendingUp, Headphones, Music, HelpCircle, BookOpen, SplitSquareVertical, User, ShoppingBag, Plane, Video, Gamepad2, Mic2, ExternalLink } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import api from '../lib/api';
import WorkflowGuideButton from '../components/WorkflowGuideButton';
import { AIWorkflowGeneratorModal } from "../components/n8n/AIWorkflowGeneratorModal";
import { SwarmControlPanel } from '../features/swarm/SwarmControlPanel';

interface Workflow {
    id: number;
    title: string;
    description: string;
    is_active: boolean;
    updated_at: string;
}

interface Template {
    id: number;
    category: string;
    title: string;
    description: string;
    icon: string;
}

const WorkflowDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [newWorkflowOpen, setNewWorkflowOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");

    // Template System State
    const [templates, setTemplates] = useState<Template[]>([]);
    const [activeTab, setActiveTab] = useState<'template' | 'blank' | 'n8n'>('template');
    const [selectedCategory, setSelectedCategory] = useState("전체");
    const [processingId, setProcessingId] = useState<number | null>(null);

    // [NEW] n8n State
    interface N8nWorkflow {
        id: string;
        title: string;
        description: string;
        is_active: boolean;
        updated_at: string;
        original_id: string;
    }
    const [n8nWorkflows, setN8nWorkflows] = useState<N8nWorkflow[]>([]);

    // --- Real API Integration ---
    const fetchWorkflows = async () => {
        setLoading(true);
        try {
            const res = await api.get('/workflows/');
            setWorkflows(Array.isArray(res.data) ? res.data : []);

            // [NEW] Integration: Fetch n8n workflows if available
            try {
                const n8nRes = await api.get('/n8n/workflows/');
                if (n8nRes.data && n8nRes.data.data) {
                    // Transform n8n workflows to display alongside internal ones, or store separately?
                    // For organic integration, let's treat them as "External" type workflows.
                    const remoteFlows = n8nRes.data.data.map((nw: any) => ({
                        id: 'n8n_' + nw.id,
                        title: nw.name,
                        description: "n8n Automation Flow",
                        is_active: nw.active,
                        updated_at: nw.updatedAt,
                        type: 'n8n', // Marker
                        original_id: nw.id
                    }));
                    // Merge? Or keep separate state? 
                    // Merging into 'workflows' might break ID typing (number vs string).
                    // Let's create specific state for n8n items if we want a separate tab,
                    // OR convince the UI to handle string IDs.
                    // The interface Workflow has id: number.
                    // We should update the interface or just map to negative numbers? 
                    // Mapping to negative is risky. 
                    // Let's utilize a new state `n8nWorkflows` and render them in a section.
                    setN8nWorkflows(remoteFlows);
                }
            } catch (ignore) {
                console.log("n8n not connected or error");
            }

        } catch (err) {
            console.error(err);
            toast({ variant: "destructive", title: "로딩 실패", description: "워크플로우 목록을 불러오지 못했습니다." });
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/templates/');
            setTemplates(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch templates", err);
        }
    };

    useEffect(() => {
        fetchWorkflows();
        fetchTemplates();
    }, []);

    const handleDuplicate = async (id: number) => {
        try {
            const res = await api.post(`/workflows/${id}/duplicate/`);
            const newWorkflow = res.data;
            setWorkflows([newWorkflow, ...workflows]);
            toast({ title: "복제됨", description: "워크플로우가 복제되었습니다." });
        } catch (err) {
            console.error(err);
            toast({ variant: "destructive", title: "복제 실패", description: "워크플로우를 복제하지 못했습니다." });
        }
    };

    const handleUseTemplate = async (templateId: number) => {
        if (processingId) return; // Prevent double click
        setProcessingId(templateId);
        try {
            const res = await api.post(`/templates/${templateId}/create-workflow/`);
            const newWorkflow = res.data;
            setWorkflows([newWorkflow, ...workflows]);
            setNewWorkflowOpen(false);
            toast({ title: "템플릿 적용됨", description: "템플릿 기반 워크플로우가 생성되었습니다." });
            navigate(`/workflows/${newWorkflow.id}`);
        } catch (err) {
            console.error(err);
            toast({ variant: "destructive", title: "생성 실패", description: "템플릿을 불러오지 못했습니다." });
        } finally {
            setProcessingId(null);
        }
    };

    const handleCreateWorkflow = async () => {
        if (!newTitle) return;

        try {
            const res = await api.post('/workflows/', {
                title: newTitle,
                description: newDesc,
                is_active: true
            });
            const newWorkflow = res.data;
            setWorkflows([newWorkflow, ...workflows]);
            setNewWorkflowOpen(false);
            setNewTitle("");
            setNewDesc("");
            toast({ title: "워크플로우 생성됨", description: "새로운 시나리오가 추가되었습니다." });
            navigate(`/workflows/${newWorkflow.id}`); // Auto-navigate
        } catch (err) {
            console.error(err);
            toast({ variant: "destructive", title: "생성 실패", description: "워크플로우를 생성하지 못했습니다." });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("정말 이 시나리오를 삭제하시겠습니까?")) return;
        try {
            await api.delete(`/workflows/${id}/`);
            setWorkflows(workflows.filter(w => w.id !== id));
            toast({ title: "삭제됨", description: "워크플로우가 삭제되었습니다." });
        } catch (err) {
            console.error(err);
            toast({ variant: "destructive", title: "삭제 실패", description: "삭제 중 오류가 발생했습니다." });
        }
    };

    const handleRunN8n = async (originalId: string) => {
        try {
            await api.post(`/n8n/workflows/${originalId}/execute/`);
            toast({ title: "실행됨", description: "n8n 워크플로우가 활성화되었습니다." });
        } catch (err) {
            console.error(err);
            toast({ variant: "destructive", title: "실행 실패", description: "워크플로우 실행 중 오류가 발생했습니다." });
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getIcon = (iconName: string) => {
        const icons: any = { Film, MessageSquare, Newspaper, TrendingUp, Headphones, Music, HelpCircle, BookOpen, SplitSquareVertical, User, ShoppingBag, Plane, Video, Gamepad2, Mic2 };
        const Icon = icons[iconName] || Layout;
        return <Icon className="w-5 h-5" />;
    };

    const categories = ["전체", "리뷰", "스토리", "뉴스", "유틸", "예능", "힐링"];
    const filteredTemplates = selectedCategory === "전체" ? templates : templates.filter(t => t.category === selectedCategory);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div />

                <div className="flex items-center gap-3">
                    <WorkflowGuideButton />

                    {/* [NEW] AI Generator & N8n Link */}
                    <div className="flex items-center gap-2 border-l pl-3 ml-2 border-slate-200">
                        <AIWorkflowGeneratorModal />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500 hover:text-slate-900"
                            onClick={() => window.open('http://localhost:5678', '_blank')}
                        >
                            <ExternalLink className="w-4 h-4 mr-1" /> n8n 열기
                        </Button>
                    </div>

                    <Dialog open={newWorkflowOpen} onOpenChange={setNewWorkflowOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4" /> 새 시나리오 만들기
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[1000px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                            <div className="p-6 border-b bg-slate-50">
                                <DialogHeader>
                                    <DialogTitle>새 워크플로우 생성</DialogTitle>
                                    <DialogDescription>
                                        검증된 바이럴 템플릿을 선택하거나 빈 캔버스에서 시작하세요.
                                    </DialogDescription>
                                </DialogHeader>
                            </div>

                            <div className="flex border-b bg-white px-6">
                                <button
                                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'template' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setActiveTab('template')}
                                >
                                    템플릿 사용 (추천)
                                </button>
                                <button
                                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'blank' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setActiveTab('blank')}
                                >
                                    빈 워크플로우 (Blank)
                                </button>
                                <button
                                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'n8n' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setActiveTab('n8n')}
                                >
                                    n8n 자동화 (External)
                                </button>
                            </div>

                            <div className="flex-1 overflow-hidden bg-slate-50/50">
                                {activeTab === 'template' ? (
                                    <div className="h-full flex flex-col p-6 overflow-hidden">
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {categories.map(cat => (
                                                <Badge
                                                    key={cat}
                                                    variant={selectedCategory === cat ? "default" : "outline"}
                                                    className={`cursor-pointer px-3 py-1 text-xs ${selectedCategory === cat ? 'bg-slate-800' : 'bg-white hover:bg-slate-100'}`}
                                                    onClick={() => setSelectedCategory(cat)}
                                                >
                                                    {cat}
                                                </Badge>
                                            ))}
                                        </div>

                                        <div className="flex-1 overflow-y-auto pr-2">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                                                {filteredTemplates.map(t => (
                                                    <Card
                                                        key={t.id}
                                                        className={`cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all hover:shadow-md group flex flex-col h-full border-slate-200 relative ${processingId === t.id ? 'ring-2 ring-blue-500 bg-blue-50/10' : ''}`}
                                                        onClick={() => handleUseTemplate(t.id)}
                                                    >
                                                        <CardHeader className="pb-3 space-y-3">
                                                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                                {getIcon(t.icon)}
                                                            </div>
                                                            <div>
                                                                <CardTitle className="text-base">{t.title}</CardTitle>
                                                                <div className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-wide">{t.category}</div>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="pb-3 flex-1">
                                                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                                {t.description}
                                                            </p>
                                                        </CardContent>
                                                        <CardFooter className="pt-0">
                                                            <Button
                                                                className="w-full gap-2 h-8 text-xs relative z-10"
                                                                variant={processingId === t.id ? "default" : "secondary"}
                                                                disabled={!!processingId}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleUseTemplate(t.id);
                                                                }}
                                                            >
                                                                {processingId === t.id ? (
                                                                    <span className="animate-spin text-lg">⟳</span>
                                                                ) : (
                                                                    <Copy className="w-3 h-3" />
                                                                )}
                                                                {processingId === t.id ? "생성 중..." : "템플릿 사용"}
                                                            </Button>
                                                        </CardFooter>
                                                    </Card>
                                                ))}
                                                {filteredTemplates.length === 0 && (
                                                    <div className="col-span-full py-20 text-center text-slate-400">
                                                        해당 카테고리에 템플릿이 없습니다.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : activeTab === 'blank' ? (
                                    <div className="p-6 max-w-md mx-auto mt-10">
                                        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                                            <div className="space-y-2">
                                                <Label>워크플로우 이름</Label>
                                                <Input
                                                    placeholder="예: 새로운 프로젝트"
                                                    value={newTitle}
                                                    onChange={(e) => setNewTitle(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>설명 (선택)</Label>
                                                <Input
                                                    placeholder="간단한 설명..."
                                                    value={newDesc}
                                                    onChange={(e) => setNewDesc(e.target.value)}
                                                />
                                            </div>
                                            <Button className="w-full mt-4" onClick={handleCreateWorkflow} disabled={!newTitle}>
                                                <Plus className="w-4 h-4 mr-2" /> 빈 워크플로우 생성
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col p-6 overflow-hidden">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                                            {n8nWorkflows.length === 0 && (
                                                <div className="col-span-full py-20 text-center text-slate-400">
                                                    연결된 n8n 워크플로우가 없습니다.
                                                </div>
                                            )}
                                            {n8nWorkflows.map(nw => (
                                                <Card key={nw.id} className="cursor-pointer hover:ring-2 hover:ring-green-500 transition-all hover:shadow-md group flex flex-col h-full border-green-100 bg-green-50/30">
                                                    <CardHeader className="pb-3 space-y-3">
                                                        <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                                                            <ExternalLink className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <CardTitle className="text-base">{nw.title}</CardTitle>
                                                            <div className="text-xs text-green-600 font-medium mt-1 uppercase tracking-wide">N8N AUTOMATION</div>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="pb-3 flex-1">
                                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                            {nw.description}
                                                        </p>
                                                    </CardContent>
                                                    <CardFooter className="pt-0">
                                                        <Button
                                                            className="w-full gap-2 h-8 text-xs bg-green-600 hover:bg-green-700"
                                                            onClick={() => handleRunN8n(nw.original_id)}
                                                        >
                                                            <PlayCircle className="w-3 h-3" /> 실행 (Activate)
                                                        </Button>
                                                    </CardFooter>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workflows.length === 0 && !loading && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl text-slate-400">
                        <Layout className="w-12 h-12 mb-4 opacity-20" />
                        <p>생성된 워크플로우가 없습니다.</p>
                        <Button variant="link" onClick={() => setNewWorkflowOpen(true)}>+ 첫 시나리오 만들기</Button>
                    </div>
                )}

                {workflows.map((workflow) => (
                    <Card key={workflow.id} className="group hover:shadow-lg transition-all duration-300 border-slate-200 cursor-pointer" onClick={() => navigate(`/workflows/${workflow.id}`)}>
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge
                                            variant={workflow.is_active ? "default" : "secondary"}
                                            className={`${workflow.is_active ? "bg-green-600 hover:bg-green-700" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}
                                        >
                                            {workflow.is_active ? "운영 모드" : "설계 모드"}
                                        </Badge>
                                        {workflow.is_active && (
                                            <span className="flex h-2 w-2 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>
                                        )}
                                    </div>
                                    <CardTitle className="leading-tight group-hover:text-blue-600 transition-colors">
                                        {workflow.title}
                                    </CardTitle>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/workflows/${workflow.id}`); }}>
                                            <Edit className="w-4 h-4 mr-2" /> 편집
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(workflow.id); }}>
                                            <Copy className="w-4 h-4 mr-2" /> 복제
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete(workflow.id); }}>
                                            <Trash className="w-4 h-4 mr-2" /> 삭제
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <CardDescription className="line-clamp-2 h-10">
                                {workflow.description || "설명 없음"}
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="pt-3 border-t bg-slate-50/50 text-xs text-slate-500 flex justify-between items-center">
                            <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(workflow.updated_at)}
                            </div>
                            <Button variant="ghost" size="sm" className="h-6 text-xs hover:bg-blue-100 hover:text-blue-700">
                                열기 <PlayCircle className="w-3 h-3 ml-1" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default WorkflowDashboard;
