import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    Search, Globe, Sparkles, FileText, ExternalLink, Loader2,
    TrendingUp, ChevronDown, ChevronRight, Copy, Check, BookOpen,
    Zap, Activity, BarChart3, Lightbulb, Newspaper, RefreshCw,
    Play, Target, Layers, Clock, AlertCircle, Trash2, Send,
    SlidersHorizontal, Library, Gauge, Eye,
} from 'lucide-react';
import BriefDetail from '@/components/research/BriefDetail';
import SourceManager from '@/components/research/SourceManager';
import {
    ProductionResearchBrief, gateBadge, readinessColor,
} from '@/lib/researchBrain';

// ── Types ──

interface Niche {
    id: number;
    name: string;
    description: string;
    category: string | null;
    avg_viral_score: number;
    keyword_count: number;
    topic_count: number;
    status: string;
    discovered_at: string;
    updated_at: string;
}

interface Topic {
    id: number;
    niche_id: number;
    niche_name: string | null;
    title: string;
    research_question: string;
    priority: number;
    status: string;
    created_at: string;
    scheduled_at: string | null;
    completed_at: string | null;
}

interface Report {
    id: number;
    topic_id: number;
    topic_title: string | null;
    niche_name: string | null;
    summary: string;
    key_findings: string;
    sources_json: { title: string; url: string; snippet: string }[];
    model_used: string;
    created_at: string;
    production_readiness?: number;
    gate_status?: string;
    research_depth?: number;
    has_brief?: boolean;
}

interface Source {
    title: string;
    url: string;
    snippet: string;
}

interface ManualResearchResponse {
    topic: string;
    summary: string;
    sources: Source[];
    key_findings: string;
    model_used: string;
}

// ── Helpers ──

const formatDate = (d: string) => {
    try {
        return new Date(d).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
};

const priorityColor = (p: number) => {
    if (p >= 80) return 'text-red-600';
    if (p >= 50) return 'text-amber-600';
    return 'text-slate-500';
};

const statusBadge = (s: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "outline" | "destructive" | "info" }> = {
        pending: { label: '대기', variant: 'outline' },
        in_progress: { label: '진행 중', variant: 'warning' },
        completed: { label: '완료', variant: 'success' },
        dismissed: { label: '보류', variant: 'secondary' },
    };
    return map[s] || { label: s, variant: 'secondary' };
};

// ── Component ──

const ResearchIntelligence = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('feed');

    // ── Manual Research Tab State ──
    const [topic, setTopic] = useState('');
    const [niche, setNiche] = useState('');
    const [manualResult, setManualResult] = useState<ManualResearchResponse | null>(null);
    const [showSources, setShowSources] = useState(false);
    const [copied, setCopied] = useState(false);

    // ── Research Brain state ──
    const [openBrief, setOpenBrief] = useState<ProductionResearchBrief | null>(null);
    const [briefLoadingId, setBriefLoadingId] = useState<number | null>(null);
    const [assetPreset, setAssetPreset] = useState<string>('');

    const openBriefForReport = async (reportId: number) => {
        setBriefLoadingId(reportId);
        try {
            const res = await api.get(`/research/briefs/${reportId}`);
            setOpenBrief(res.data.brief as ProductionResearchBrief);
        } catch (e: any) {
            toast.error('브리프를 불러오지 못했습니다');
        } finally {
            setBriefLoadingId(null);
        }
    };

    const handleSearchAsset = (query: string) => {
        setAssetPreset(query);
        setOpenBrief(null);
        setActiveTab('sources');
        toast.info(`소스 매니저에서 "${query}" 검색`);
    };

    // ── Queries ──

    const { data: niches = [], isLoading: nichesLoading } = useQuery<Niche[]>({
        queryKey: ['research-niches'],
        queryFn: async () => (await api.get('/research/niches', { params: { status: 'active' } })).data,
        refetchInterval: 60000,
    });

    const { data: topics = [], isLoading: topicsLoading } = useQuery<Topic[]>({
        queryKey: ['research-topics'],
        queryFn: async () => (await api.get('/research/topics', { params: { limit: 100 } })).data,
        refetchInterval: 30000,
    });

    const { data: reports = [], isLoading: reportsLoading } = useQuery<Report[]>({
        queryKey: ['research-reports'],
        queryFn: async () => (await api.get('/research/reports', { params: { limit: 50 } })).data,
        refetchInterval: 30000,
    });

    // ── Mutations ──

    const manualResearchMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/research/brief', { topic, niche: niche || undefined }, { timeout: 180000 });
            return res.data;
        },
        onSuccess: (data: ManualResearchResponse) => {
            setManualResult(data);
            setShowSources(true);
            toast.success(`리서치 완료! (${data.model_used})`);
        },
        onError: (err: any) => {
            toast.error("리서치 실패: " + (err.response?.data?.detail || err.message));
        }
    });

    // Re-fetch a few times over the next ~minute while a background job runs.
    const refetchSoon = (keys: string[]) => {
        [4000, 15000, 35000, 60000].forEach((ms) =>
            setTimeout(() => keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] })), ms));
    };

    const triggerTopicGen = useMutation({
        mutationFn: async () => (await api.post('/research/topics/generate')).data,
        onSuccess: (data: any) => {
            toast.success(data?.message || '주제 생성을 시작합니다');
            refetchSoon(['research-niches', 'research-topics']);
        },
        onError: (err: any) => toast.error('주제 생성 실패: ' + (err.response?.data?.detail || err.message)),
    });

    const triggerResearch = useMutation<any, any, number | void>({
        // NOTE: the backend reads `topic_id` as a QUERY param, so it must go in params.
        mutationFn: async (topicId?: number | void) =>
            (await api.post('/research/trigger', null, {
                params: topicId ? { topic_id: topicId } : {},
            })).data,
        onSuccess: (data: any) => {
            toast.success(data?.message || '리서치 실행을 시작합니다');
            refetchSoon(['research-niches', 'research-topics', 'research-reports']);
        },
        onError: (err: any) => toast.error('리서치 실행 실패: ' + (err.response?.data?.detail || err.message)),
    });

    const dismissTopic = useMutation({
        mutationFn: async (id: number) => (await api.delete(`/research/topics/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['research-topics'] });
            toast.success('주제 보류됨');
        },
    });

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('복사 완료');
        }).catch(() => toast.error('복사 실패'));
    };

    const handleSendToScript = (text: string) => {
        localStorage.setItem('viral_loop_script_writer_input', text);
        window.open('/#/script-writer', '_blank');
        toast.success('스크립트 작성기로 전송됨');
    };

    // ── Tab: Research Feed ──
    const renderFeed = () => (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Newspaper className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-slate-700">최신 리서치 리포트</span>
                    <Badge variant="outline" className="text-[10px]">{reports.length}건</Badge>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => triggerResearch.mutate()}>
                    <Zap className="w-3 h-3 mr-1" />
                    즉시 실행
                </Button>
            </div>
            {reportsLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
            ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <BookOpen className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm">아직 완료된 리서치가 없습니다</p>
                    <p className="text-[10px] mt-1">자동 리서치가 실행될 때까지 기다려주세요</p>
                </div>
            ) : (
                <ScrollArea className="h-[calc(100vh-280px)] pr-2">
                    <div className="space-y-3">
                        {reports.map((r) => (
                            <Card key={r.id} className="border-blue-100 hover:border-blue-200">
                                <CardHeader className="py-2.5 px-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                {r.has_brief ? (
                                                    <Badge variant={gateBadge((r.gate_status || '') as any).variant as any} className="text-[9px]">
                                                        {gateBadge((r.gate_status || '') as any).label}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="success" className="text-[9px]">완료</Badge>
                                                )}
                                                {r.has_brief && typeof r.production_readiness === 'number' && (
                                                    <span className={cn('text-[10px] font-bold tabular-nums flex items-center gap-0.5', readinessColor(r.production_readiness))}>
                                                        <Gauge className="w-3 h-3" />{r.production_readiness.toFixed(1)}
                                                    </span>
                                                )}
                                                {r.niche_name && (
                                                    <Badge variant="secondary" className="text-[9px]">{r.niche_name}</Badge>
                                                )}
                                                <span className="text-[10px] text-slate-400">{formatDate(r.created_at)}</span>
                                            </div>
                                            <CardTitle className="text-sm mt-1 line-clamp-1">{r.topic_title}</CardTitle>
                                        </div>
                                        <div className="flex gap-1 flex-shrink-0 ml-2">
                                            {r.has_brief && (
                                                <Button variant="outline" size="sm" className="h-7 text-xs px-2 text-indigo-600 border-indigo-200" onClick={() => openBriefForReport(r.id)} title="제작 브리프 보기" disabled={briefLoadingId === r.id}>
                                                    {briefLoadingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Sparkles className="w-3 h-3 mr-1" />브리프</>}
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleCopy(`## Research: ${r.topic_title}\n\n### Key Findings\n${r.key_findings}\n\n### Summary\n${r.summary}`)} title="복사">
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600" onClick={() => handleSendToScript(`Research Topic: ${r.topic_title}\n\nKey Findings:\n${r.key_findings}\n\n${r.summary}`)} title="스크립트로 전송">
                                                <Send className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-4 pb-3 pt-0">
                                    {r.key_findings && (
                                        <div className="text-xs text-slate-600 leading-relaxed mb-2 whitespace-pre-wrap line-clamp-3">
                                            {r.key_findings}
                                        </div>
                                    )}
                                    <p className="text-xs text-slate-500 line-clamp-2">{r.summary}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-[9px] text-slate-400">{r.model_used}</span>
                                        {r.sources_json.length > 0 && (
                                            <span className="text-[9px] text-blue-500">{r.sources_json.length}개 출처</span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
    );

    // ── Tab: Discovered Topics ──
    const renderTopics = () => (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-slate-700">탐지된 연구 주제</span>
                    <Badge variant="outline" className="text-[10px]">{topics.filter(t => t.status === 'pending').length}개 대기</Badge>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => triggerTopicGen.mutate()}>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        주제 생성
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => triggerResearch.mutate()}>
                        <Zap className="w-3 h-3 mr-1" />
                        즉시 리서치
                    </Button>
                </div>
            </div>
            {topicsLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
            ) : topics.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Target className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm">아직 연구 주제가 생성되지 않았습니다</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => triggerTopicGen.mutate()}>
                        주제 생성 시작
                    </Button>
                </div>
            ) : (
                <ScrollArea className="h-[calc(100vh-280px)] pr-2">
                    <div className="space-y-2">
                        {topics.map((t) => {
                            const sb = statusBadge(t.status);
                            return (
                                <Card key={t.id} className={cn(
                                    "border-l-4",
                                    t.status === 'pending' ? 'border-l-amber-400' :
                                    t.status === 'in_progress' ? 'border-l-blue-400' :
                                    t.status === 'completed' ? 'border-l-emerald-400' :
                                    'border-l-slate-300'
                                )}>
                                    <CardContent className="p-3 flex items-start justify-between">
                                        <div className="flex-1 min-w-0 mr-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant={sb.variant as any} className="text-[9px]">{sb.label}</Badge>
                                                {t.niche_name && (
                                                    <span className="text-[10px] text-slate-400">{t.niche_name}</span>
                                                )}
                                                <span className={cn("text-[10px] font-mono font-bold", priorityColor(t.priority))}>
                                                    P{t.priority}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-800">{t.title}</p>
                                            {t.research_question && t.research_question !== t.title && (
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.research_question}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-[10px] text-slate-400">
                                                    <Clock className="w-3 h-3 inline mr-0.5" />
                                                    {formatDate(t.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                        {t.status === 'pending' && (
                                            <div className="flex gap-1 flex-shrink-0">
                                                <Button variant="default" size="sm" className="h-7 text-xs" onClick={() => triggerResearch.mutate(t.id)}>
                                                    <Play className="w-3 h-3 mr-1" /> 리서치
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400" onClick={() => dismissTopic.mutate(t.id)}>
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        )}
                                        {t.status === 'completed' && (
                                            <Badge variant="success" className="text-[9px] flex-shrink-0">완료</Badge>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </ScrollArea>
            )}
        </div>
    );

    // ── Tab: Niche Clusters ──
    const renderNiches = () => (
        <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-slate-700">니치 클러스터</span>
                <Badge variant="outline" className="text-[10px]">{niches.length}개</Badge>
            </div>
            {nichesLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
            ) : niches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Layers className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm">아직 니치가 탐지되지 않았습니다</p>
                    <p className="text-[10px] mt-1">트렌드 데이터 수집 후 자동으로 니치가 생성됩니다</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {niches.map((n) => {
                        const nicheTopics = topics.filter(t => t.niche_id === n.id);
                        const pendingNiche = nicheTopics.filter(t => t.status === 'pending');
                        return (
                            <Card key={n.id} className="border-indigo-100 hover:shadow-md transition-shadow">
                                <CardHeader className="py-2.5 px-4 border-b bg-indigo-50/30">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-indigo-500" />
                                            <CardTitle className="text-sm font-semibold">{n.name}</CardTitle>
                                            {n.category && (
                                                <Badge variant="secondary" className="text-[9px]">{n.category}</Badge>
                                            )}
                                        </div>
                                        <Badge variant={n.status === 'active' ? 'success' : 'secondary'} className="text-[9px]">
                                            {n.status === 'active' ? '활성' : '비활성'}
                                        </Badge>
                                    </div>
                                    {n.description && (
                                        <CardDescription className="text-xs mt-1">{n.description}</CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="p-3 space-y-2">
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <BarChart3 className="w-3 h-3" />
                                            점수: {n.avg_viral_score.toFixed(0)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Activity className="w-3 h-3" />
                                            키워드: {n.keyword_count}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Target className="w-3 h-3" />
                                            주제: {n.topic_count}
                                        </span>
                                    </div>
                                    {pendingNiche.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {pendingNiche.slice(0, 3).map((pt) => (
                                                <Badge key={pt.id} variant="outline" className="text-[9px] max-w-[180px] truncate">
                                                    {pt.title}
                                                </Badge>
                                            ))}
                                            {pendingNiche.length > 3 && (
                                                <span className="text-[9px] text-slate-400">+{pendingNiche.length - 3}개</span>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex justify-end">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => {
                                                const firstPending = pendingNiche[0];
                                                if (firstPending) triggerResearch.mutate(firstPending.id);
                                            }}
                                            disabled={pendingNiche.length === 0}
                                        >
                                            <Play className="w-3 h-3 mr-1" /> 리서치
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );

    // ── Tab: Manual Research (legacy ResearchBrief) ──
    const renderManual = () => (
        <div className="space-y-4">
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-2">
                            <Label>리서치 주제</Label>
                            <Input
                                placeholder="예: AI가 일자리를 대체하는 방법, 2026 K-Pop 트렌드..."
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && topic.trim()) manualResearchMutation.mutate(); }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>분야 (Niche) - 선택</Label>
                            <Input
                                placeholder="Tech, Gaming, Health..."
                                value={niche}
                                onChange={(e) => setNiche(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button
                            onClick={() => manualResearchMutation.mutate()}
                            disabled={manualResearchMutation.isPending || !topic.trim()}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                        >
                            {manualResearchMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Search className="w-4 h-4 mr-2" />
                            )}
                            리서치 브리프 생성
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {manualResearchMutation.isPending && (
                <Card>
                    <CardContent className="p-8 flex flex-col items-center justify-center gap-3 text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                        <span className="text-sm">웹 검색 및 AI 분석 중...</span>
                        <span className="text-[10px] text-slate-400">최대 3분 소요될 수 있습니다</span>
                    </CardContent>
                </Card>
            )}

            {manualResult && !manualResearchMutation.isPending && (
                <>
                    {manualResult.key_findings && (
                        <Card className="border-emerald-200">
                            <CardHeader className="py-3 px-4 border-b bg-emerald-50/50">
                                <div className="flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-emerald-600" />
                                    <CardTitle className="text-sm text-emerald-800">핵심 발견 (Key Findings)</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                                    {manualResult.key_findings}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader className="py-3 px-4 border-b bg-blue-50/50">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Newspaper className="w-4 h-4 text-blue-600" />
                                    <CardTitle className="text-sm text-blue-800">요약 리포트</CardTitle>
                                    <Badge variant="outline" className="text-[9px] border-blue-200">{manualResult.model_used}</Badge>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="h-7 text-xs"
                                        onClick={() => handleSendToScript(`Research Topic: ${manualResult.topic}\n\nKey Findings:\n${manualResult.key_findings}\n\n${manualResult.summary}`)}
                                    >
                                        <FileText className="w-3 h-3 mr-1" /> 스크립트로
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-7 text-xs"
                                        onClick={() => handleCopy(`## Research Brief: ${manualResult.topic}\n\n### Key Findings\n${manualResult.key_findings}\n\n### Summary\n${manualResult.summary}`)}
                                    >
                                        {copied ? <><Check className="w-3 h-3 mr-1" /> 복사됨</> : <><Copy className="w-3 h-3 mr-1" /> 복사</>}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <ScrollArea className="h-[40vh]">
                            <CardContent className="p-4">
                                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                                    {manualResult.summary}
                                </div>
                            </CardContent>
                        </ScrollArea>
                    </Card>

                    {manualResult.sources.length > 0 && (
                        <Card>
                            <button
                                onClick={() => setShowSources(!showSources)}
                                className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm font-medium text-slate-700">출처 ({manualResult.sources.length})</span>
                                </div>
                                {showSources ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            {showSources && (
                                <CardContent className="px-4 pb-4 pt-2 border-t space-y-2">
                                    {manualResult.sources.map((src, i) => (
                                        <div key={i} className="p-2 rounded bg-slate-50 border border-slate-200">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-xs font-medium text-slate-700">{src.title}</span>
                                                {src.url && (
                                                    <a href={src.url} target="_blank" rel="noopener noreferrer"
                                                        className="text-blue-500 hover:text-blue-700 flex-shrink-0">
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                            {src.snippet && (
                                                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{src.snippet}...</p>
                                            )}
                                        </div>
                                    ))}
                                </CardContent>
                            )}
                        </Card>
                    )}
                </>
            )}
        </div>
    );

    // ── Tab: Settings ──
    const renderSettings = () => (
        <div className="space-y-4 max-w-2xl">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-slate-600" />
                        <CardTitle className="text-sm">자동화 설정</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                        AI 리서치 인텔리전스 시스템은 백그라운드 스케줄러를 통해 자동으로 동작합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <div>
                            <p className="text-sm font-medium text-slate-700">니치 발견 주기</p>
                            <p className="text-xs text-slate-500">트렌드 키워드를 니치 클러스터로 그룹화</p>
                        </div>
                        <Badge variant="secondary">60분</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <div>
                            <p className="text-sm font-medium text-slate-700">연구 주제 생성 주기</p>
                            <p className="text-xs text-slate-500">니치별 리서치 질문 자동 생성</p>
                        </div>
                        <Badge variant="secondary">30분</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <div>
                            <p className="text-sm font-medium text-slate-700">리서치 실행 주기</p>
                            <p className="text-xs text-slate-500">웹 검색 + AI 요약으로 브리프 생성</p>
                        </div>
                        <Badge variant="secondary">60분</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <p className="text-sm font-medium text-slate-700">최대 대기 주제 수</p>
                            <p className="text-xs text-slate-500">니치당 생성할 최대 대기 주제</p>
                        </div>
                        <Badge variant="secondary">3개</Badge>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-600" />
                        <CardTitle className="text-sm">시스템 상태</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">활성 니치</span>
                        <span className="text-sm font-semibold">{niches.filter(n => n.status === 'active').length}개</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">대기 주제</span>
                        <span className="text-sm font-semibold">{topics.filter(t => t.status === 'pending').length}개</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">완료된 리서치</span>
                        <span className="text-sm font-semibold">{reports.length}건</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col gap-3 p-4 min-h-0">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-500" />
                    <h1 className="text-lg font-bold text-slate-800">AI 리서치 인텔리전스</h1>
                    <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-700">
                        자동 수집 + AI 분석
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        실시간
                    </Badge>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="flex-shrink-0">
                    <TabsTrigger value="feed" className="text-xs flex items-center gap-1">
                        <Newspaper className="w-3.5 h-3.5" /> 연구 피드
                    </TabsTrigger>
                    <TabsTrigger value="topics" className="text-xs flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" /> 탐지된 주제
                    </TabsTrigger>
                    <TabsTrigger value="niches" className="text-xs flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" /> 니치 클러스터
                    </TabsTrigger>
                    <TabsTrigger value="sources" className="text-xs flex items-center gap-1">
                        <Library className="w-3.5 h-3.5" /> 소스 매니저
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="text-xs flex items-center gap-1">
                        <Search className="w-3.5 h-3.5" /> 수동 리서치
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="text-xs flex items-center gap-1">
                        <SlidersHorizontal className="w-3.5 h-3.5" /> 설정
                    </TabsTrigger>
                </TabsList>

                <div className="flex-1 min-h-0 mt-3">
                    <TabsContent value="feed" className="h-full m-0">{renderFeed()}</TabsContent>
                    <TabsContent value="topics" className="h-full m-0">{renderTopics()}</TabsContent>
                    <TabsContent value="niches" className="h-full m-0">{renderNiches()}</TabsContent>
                    <TabsContent value="sources" className="h-full m-0 overflow-y-auto"><SourceManager presetQuery={assetPreset} /></TabsContent>
                    <TabsContent value="manual" className="h-full m-0 overflow-y-auto">{renderManual()}</TabsContent>
                    <TabsContent value="settings" className="h-full m-0 overflow-y-auto">{renderSettings()}</TabsContent>
                </div>
            </Tabs>

            <Dialog open={!!openBrief} onOpenChange={(o) => !o && setOpenBrief(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Sparkles className="w-4 h-4 text-indigo-500" /> 제작 리서치 브리프
                        </DialogTitle>
                    </DialogHeader>
                    {openBrief && (
                        <BriefDetail
                            brief={openBrief}
                            onCopy={handleCopy}
                            onSendToScript={(text) => { handleSendToScript(text); }}
                            onSearchAsset={handleSearchAsset}
                            onOpenEditor={(b) => {
                                setOpenBrief(null);
                                navigate('/agent-cut-editor', { state: { brief: b } });
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ResearchIntelligence;
