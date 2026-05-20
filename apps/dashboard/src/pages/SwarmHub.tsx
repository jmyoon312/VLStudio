import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api, { SWARM_BASE_URL } from '../lib/api';
import { 
    Zap, 
    ShieldCheck, 
    Users,     
    Target as TargetIcon,
    Trash2,
    X,
    Check,
    Plus,
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Search,
    Video,
    Upload,
    Smartphone,
    Activity,
    ShieldAlert,
    Radio,
    Dna,
    Lightbulb, 
    GitMerge, 
    ChevronDown, 
    ChevronUp, 
    Maximize2, 
    Minimize2,
    Lock, 
    Layout, 
    Rocket, 
    BrainCircuit,
    Terminal, 
    ArrowRight, 
    Info, 
    ExternalLink, 
    RefreshCw, 
    Cpu, 
    Sparkles,
    Database, 
    Globe, 
    Network, 
    Fingerprint,
    Target,
    Layers,
    Sword,
    Compass,
    TrendingUp,
    ChevronRight,
    History,
    Settings,
    User,
} from 'lucide-react';
import { BlueOceanPanel } from "@/components/swarm/BlueOceanPanel";
import { ConquestManual } from "@/components/swarm/ConquestManual";
import { StyleSignatureHUD } from "@/components/swarm/StyleSignatureHUD";
import { SovereignGovernanceMonitor } from "@/components/swarm/SovereignGovernanceMonitor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { io, Socket } from 'socket.io-client';
import { cn } from "@/lib/utils";
import { useToast } from '@/components/ui/use-toast';
import { useSwarmStore } from "../hooks/useSwarmStore";
import { SwarmTopologyCanvas } from "@/features/swarm/components/SwarmTopologyCanvas";
import { GlobalFleetCanvas } from "@/features/swarm/components/GlobalFleetCanvas";
import { AgentDNAInspector } from "@/features/swarm/components/AgentDNAInspector";
import { AgentNodeData } from "@/features/swarm/components/AgentTopologyNode";
import { SwarmControlPanel } from "../features/swarm/SwarmControlPanel";
import { MCPSkillExplorer } from "@/features/swarm/components/MCPSkillExplorer";
import { SovereignMissionConsole } from '@/features/swarm/components/SovereignMissionConsole';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Custom Swarm UI Styles
const radarStyle = `
@keyframes radar-pulse {
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(2.2); opacity: 0; }
}
.animate-radar-pulse {
  animation: radar-pulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
.heartbeat-wave {
  animation: heartbeat-slide 1.5s linear infinite;
}
@keyframes heartbeat-slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.glass-morphism {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.glow-indigo {
  box-shadow: 0 0 30px rgba(79, 70, 229, 0.25);
}
.glow-emerald {
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
}
.scan-line {
  background: linear-gradient(to bottom, transparent, rgba(79, 70, 229, 0.1) 50%, transparent);
  animation: scan 4s linear infinite;
}
@keyframes scan {
  from { transform: translateY(-100%); }
  to { transform: translateY(1000%); }
}
.text-gradient-indigo {
  background: linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-marquee {
  display: flex;
  width: max-content;
  animation: marquee 40s linear infinite;
}
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin-slow {
  animation: spin-slow 12s linear infinite;
}
`;


// --- Interfaces & Types ---
interface StyleStats {
    pacing: number;
    hook: number;
    tone: string;
    semanticFlux: number;
}

interface SwarmChannel {
    id: number;
    title: string;
    isAutonomous: boolean;
    style_signature?: Partial<StyleStats>;
}

interface SwarmGroup {
    captainId: string;
    captainEmail: string;
    riskLevel: number;
    channels: SwarmChannel[];
}

interface SwarmGlobalStats {
    totalMutations: number;
    activeChannels: number;
    pendingApprovals: number;
    selfHealingCount: number;
}

interface SwarmStatus {
    groups: SwarmGroup[];
    globalStats: SwarmGlobalStats;
}

interface ScoutCandidate {
    id: number;
    channel_name: string;
    channel_url: string;
    ai_reasoning: string;
    category_id: number;
    total_sovereign_score: number;
    subscriber_growth_7d: number;
    is_rising_star: boolean;
    is_ai_estimated: boolean;
    channel_url_attr?: string;
}
interface Category {
    id: number;
    name: string;
    level: number;
    parent_id?: number;
    ai_generated: boolean;
    created_at?: string;
}

interface Interest {
    id: number;
    name: string;
}

interface StrategicBrief {
    id: number;
    title: string;
    niche: string;
    summary: string;
    content_markdown: string;
    strategic_recommendations: string[];
    updated_at: string;
}

type MissionItem = ScoutCandidate | StrategicBrief;

interface SwarmHubProps {
    defaultStage?: 'scan' | 'strategy' | 'synthesis' | 'evolution' | 'skills' | 'conquest';
}

const SwarmHub: React.FC<SwarmHubProps> = ({ defaultStage = 'synthesis' }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedMission, setSelectedMission] = useState<MissionItem | null>(null);
    const [selectedAgentNode, setSelectedAgentNode] = useState<{id: string, data: AgentNodeData} | null>(null);
    
    // View Modes for Phase 8 Architecture (Macro vs Micro)
    const [canvasViewMode, setCanvasViewMode] = useState<'macro' | 'micro'>('macro');
    const [activeMacroChannelId, setActiveMacroChannelId] = useState<string | null>(null);
    const [activeRootView, setActiveRootView] = useState<'hub' | 'skills'>('hub');

    // Mission Launcher State
    const [launchDialogOpen, setLaunchDialogOpen] = useState(false);
    const [launchConfig, setLaunchConfig] = useState({
        channelId: '',
        format: 'shorts',
        qualityMode: 'auto'
    });
    
    const [searchParams, setSearchParams] = useSearchParams();
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [activeStage, setActiveStage] = useState<'scan' | 'strategy' | 'synthesis' | 'evolution' | 'skills' | 'conquest'>(defaultStage);

    // [NEW] Sync activeStage with URL Query Params or defaultStage
    useEffect(() => {
        const view = searchParams.get('view');
        if (view && ['scan', 'strategy', 'synthesis', 'evolution', 'skills', 'conquest'].includes(view)) {
            setActiveStage(view as any);
        } else {
            setActiveStage(defaultStage);
        }
    }, [searchParams, defaultStage]);

    const handleStageChange = (stage: string) => {
        setSearchParams({ view: stage });
        setActiveStage(stage as any);
    };

    const [commandInput, setCommandInput] = useState("");
    const [focalChannelId, setFocalChannelId] = useState<number | null>(null); // [NEW] Master Focal Channel Context
    const [consoleSessionId, setConsoleSessionId] = useState<string | null>(null); // [NEW] Phase 5 Sovereign Console
    const [isDragging, setIsDragging] = useState(false); // [NEW] Drag-to-select state
    const { 
        agentLogs, 
        isThinking, 
        isConnected, 
        currentStage,
        addLog, 
        setIsConnected, 
        setIsThinking, 
        setActiveSkill,
        setCurrentStage 
    } = useSwarmStore();

    const pipelineSteps = [
        { id: 1, label: '시장분석', icon: Search },
        { id: 2, label: '대본작성', icon: Sparkles },
        { id: 3, label: '나레이션', icon: Radio },
        { id: 4, label: '자막생성', icon: Layout },
        { id: 5, label: '시각자원', icon: Video },
        { id: 6, label: '배경음악', icon: Zap },
        { id: 7, label: '영상조립', icon: Layers },
        { id: 8, label: '쉴드적용', icon: ShieldCheck },
        { id: 9, label: 'SEO/메타', icon: Target },
        { id: 10, label: '글로벌배포', icon: Rocket },
    ];
    const [selectedKnowledgeNote, setSelectedKnowledgeNote] = useState<string | null>(null);
    const [styleStats, setStyleStats] = useState<StyleStats>({ pacing: 0.85, tone: 'aggressive', hook: 0.92, semanticFlux: 0.78 }); // Dynamic telemetry mock
    
    // [NEW] Expert Intervention State
    const [expertEdits, setExpertEdits] = useState({ script: '', instructions: '', update_master_identity: false });
    // Detailed Metrics State
    const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);

    // --- WebSocket for Swarm Background Tasks ---
    useEffect(() => {
        let ws: WebSocket | null = null;
        let retryTimeout: ReturnType<typeof setTimeout>;
        let isMounted = true;

        const connectWebSocket = () => {
            if (!isMounted) return;
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(`${protocol}//${window.location.host}/api/swarm/ws`);
            
            ws.onopen = () => {
                setIsConnected(true);
                console.log("[SwarmHub] Swarm WebSocket connected");
            };

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload.message) {
                        addLog({ 
                            type: payload.type === 'task_complete' ? 'system' : 'agent', 
                            text: payload.message, 
                            time: new Date() 
                        });
                        if (payload.type === 'task_progress' || payload.type === 'task_complete') {
                            setIsThinking(false);
                        }
                    }
                    if (payload.type === 'skill_execution') {
                        setActiveSkill(payload.agent, payload.status === 'end' ? null : payload.skill);
                        if (payload.status === 'start') {
                            setIsThinking(true);
                            if (payload.stage > 0) setCurrentStage(payload.stage);
                        } else {
                            setIsThinking(false);
                        }
                    }
                    if (payload.type === 'action_required') {
                        setSelectedMission({
                            ...payload,
                            id: 'hitl-' + Date.now(),
                            status: 'PENDING_APPROVAL'
                        });
                        setLaunchDialogOpen(true);
                    }
                } catch (err) {
                    addLog({ type: 'agent', text: event.data, time: new Date() });
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                if (isMounted) {
                    retryTimeout = setTimeout(connectWebSocket, 5000);
                }
            };
            
            ws.onerror = (err) => {
                if (ws) ws.close();
            };
            
            setSocket(ws as any);
        };

        connectWebSocket();

        return () => {
            isMounted = false;
            clearTimeout(retryTimeout);
            if (ws) {
                ws.onclose = null;
                ws.onerror = null;
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                } else if (ws.readyState === WebSocket.CONNECTING) {
                    ws.onopen = () => { ws.close(); };
                }
            }
        };
    }, [setIsConnected, setIsThinking, addLog, setActiveSkill]);


    const handleSendCommand = () => {
        if (!commandInput.trim() || !socket) return;
        setIsThinking(true);
        
        const socketInstance = socket as unknown as WebSocket;
        if (socketInstance.readyState === WebSocket.OPEN) {
            socketInstance.send(JSON.stringify({ 
                text: commandInput, 
                channel_id: launchConfig.channelId ? parseInt(launchConfig.channelId) : null 
            }));
        } else {
            addLog({ type: 'system', text: "시스템 연결이 원활하지 않습니다. 연결 상태를 확인 중입니다.", time: new Date() });
            setIsThinking(false);
        }
        
        addLog({ type: 'user', text: commandInput, time: new Date() });
        setCommandInput("");
    };
    // --- [NEW] Hierarchical Scout State ---
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);
    
    const { data: categories } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: () => api.get('/scout/categories').then(res => Array.isArray(res.data) ? res.data : [])
    });

    const toggleCandidateSelection = (id: number, isShift: boolean) => {
        if (isShift && selectedCandidateIds.length > 0) {
            const lastId = selectedCandidateIds[selectedCandidateIds.length - 1];
            const currentIndex = scoutCandidates?.findIndex((c: any) => c.id === id) ?? -1;
            const lastIndex = scoutCandidates?.findIndex((c: any) => c.id === lastId) ?? -1;
            
            if (currentIndex !== -1 && lastIndex !== -1) {
                const start = Math.min(currentIndex, lastIndex);
                const end = Math.max(currentIndex, lastIndex);
                const rangeIds = scoutCandidates.slice(start, end + 1).map((c: any) => c.id);
                setSelectedCandidateIds(Array.from(new Set([...selectedCandidateIds, ...rangeIds])));
            }
        } else {
            setSelectedCandidateIds(prev => 
                prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
            );
        }
    };

    const batchApproveMutation = useMutation({
        mutationFn: (approve: boolean) => api.post('/scout/batch-approve', {
            candidate_ids: selectedCandidateIds,
            approve
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scoutCandidates'] });
            setSelectedCandidateIds([]);
            toast({
                title: "일괄 처리 완료",
                description: `${selectedCandidateIds.length}개의 후보가 성공적으로 처리되었습니다.`,
            });
        }
    });

    const batchDeleteMutation = useMutation({
        mutationFn: () => api.post('/scout/batch-delete', selectedCandidateIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scoutCandidates'] });
            setSelectedCandidateIds([]);
            toast({
                title: "일괄 삭제 완료",
                description: "선택된 후보들이 영구 삭제되었습니다.",
            });
        }
    });

    const deleteCandidateMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/scout/candidates/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scoutCandidates'] });
            toast({
                title: "후보 삭제",
                description: "후보가 목록에서 제거되었습니다.",
            });
        }
    });

    const approveCandidateMutation = useMutation({
        mutationFn: async ({ id, approve }: { id: number, approve: boolean }) => 
            (await api.post('/scout/approve', { candidate_id: id, approve })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scoutCandidates'] });
            queryClient.invalidateQueries({ queryKey: ['swarmStatus'] });
        }
    });

    const startScoutMutation = useMutation({
        mutationFn: async (params: { category_id?: number | null, niche?: string | null, autonomous?: boolean }) => 
            (await api.post('/scout/mission', params)).data,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['scoutCandidates'] });
            queryClient.invalidateQueries({ queryKey: ['missions'] });
            toast({
                title: "스카우트 미션 기동",
                description: `[${data.niche || 'Hierarchical'}] 테마에 대한 심층 분석이 시작되었습니다.`,
            });
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "미션 기동 실패",
                description: error.response?.data?.detail || "서버 통신 중 오류가 발생했습니다.",
            });
        }
    });

    // 1. 스웜 상태 조회 (Enhanced with Active Sessions)
    const { data: swarmStatus, isLoading: isSwarmLoading } = useQuery<SwarmStatus>({
        queryKey: ['swarmStatus'],
        queryFn: () => api.get('/swarm/status').then(res => res.data),
        refetchInterval: 5000
    });

    // [NEW] Synchronize Style Signature HUD with Focal Channel DNA
    useEffect(() => {
        if (!swarmStatus?.groups || !focalChannelId) return;
        
        let foundChannel = null;
        for (const group of swarmStatus.groups) {
            const channel = group.channels?.find((c: any) => c.id === focalChannelId);
            if (channel) {
                foundChannel = channel;
                break;
            }
        }

        if (foundChannel?.style_signature) {
            const dna = foundChannel.style_signature;
            setStyleStats({
                pacing: dna.pacing || 0.85,
                tone: dna.tone || 'aggressive',
                hook: dna.hook || 0.92,
                semanticFlux: dna.semanticFlux || 0.78
            });
        }
    }, [swarmStatus, focalChannelId]);

    const { data: scoutCandidates } = useQuery<ScoutCandidate[]>({
        queryKey: ['scoutCandidates'],
        queryFn: async () => { const d = (await api.get('/scout/candidates')).data; return Array.isArray(d) ? d : []; },
        enabled: activeStage === 'scan'
    });

    const { data: swarmWisdom } = useQuery({
        queryKey: ['swarmWisdom'],
        queryFn: async () => (await api.get('/swarm/wisdom')).data,
        enabled: activeStage === 'evolution'
    });

    const { data: knowledgeNotes } = useQuery({
        queryKey: ['knowledgeNotes'],
        queryFn: async () => (await api.get('/swarm/knowledge/notes')).data,
        enabled: activeStage === 'strategy'
    });

    const { data: noteContent, isLoading: isNoteLoading } = useQuery({
        queryKey: ['knowledgeNoteContent', selectedKnowledgeNote],
        queryFn: async () => (await api.get(`/swarm/knowledge/notes/${selectedKnowledgeNote}`)).data,
        enabled: !!selectedKnowledgeNote && activeStage === 'strategy'
    });

    const { data: profiles } = useQuery({
        queryKey: ['profiles'],
        queryFn: async () => { const d = (await api.get('/profiles')).data; return Array.isArray(d) ? d : []; }
    });

    const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [interestInput, setInterestInput] = useState("");
    const [isSynthesisOpen, setIsSynthesisOpen] = useState(false);
    const [conquestTarget, setConquestTarget] = useState<any | null>(null);

    const { data: synthesisData, isLoading: isSynthesizing, refetch: refetchSynthesis } = useQuery({
        queryKey: ['synthesis'],
        queryFn: async () => (await api.get('/scout/synthesis')).data,
        enabled: isSynthesisOpen
    });

    const conquestMutation = useMutation({
        mutationFn: async (id: number) => (await api.get(`/scout/candidates/${id}/conquest`)).data,
        onSuccess: (data) => setConquestTarget(data)
    });

    const { data: interests, refetch: refetchInterests } = useQuery<Interest[]>({
        queryKey: ['interests'],
        queryFn: async () => { const d = (await api.get('/scout/interests')).data; return Array.isArray(d) ? d : []; }
    });

    const { data: strategicBriefs, isLoading: isBriefsLoading } = useQuery<StrategicBrief[]>({
        queryKey: ['strategicBriefs'],
        queryFn: async () => {
            const data = (await api.get('/scout/strategic-briefs')).data;
            return Array.isArray(data) ? data : [];
        },
        refetchInterval: 10000
    });

    const createBriefMutation = useMutation({
        mutationFn: async (categoryId: number) => (await api.post('/scout/strategic-brief', null, { params: { category_id: categoryId } })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['strategicBriefs'] });
            toast({ title: "전략 분석 기동", description: "심층 지능 보고서 생성이 시작되었습니다." });
        }
    });

    const addInterestMutation = useMutation({
        mutationFn: (name: string) => api.post('/scout/interests', { name }),
        onSuccess: () => {
            refetchInterests();
            setInterestInput("");
            toast({ title: "관심 분야 추가", description: `'${name}' 분야가 마스터 리스트에 추가되었습니다.` });
        }
    });

    const deleteInterestMutation = useMutation({
        mutationFn: (name: string) => api.delete(`/scout/interests/${name}`),
        onSuccess: () => {
            refetchInterests();
            toast({ title: "관심 분야 삭제", description: "리스트에서 제거되었습니다." });
        }
    });

    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

    // [NEW] Auto-select first active profile
    useEffect(() => {
        if (profiles?.length > 0 && !selectedProfileId) {
            const firstActive = profiles.find((p: any) => p.status === 'ACTIVE');
            if (firstActive) setSelectedProfileId(firstActive.id);
        }
    }, [profiles, selectedProfileId]);

    // [NEW] Auto-select first channel when data is loaded
    useEffect(() => {
        if (swarmStatus?.groups?.length > 0 && !launchConfig.channelId) {
            const firstChannel = swarmStatus.groups[0].channels?.[0];
            if (firstChannel) {
                setLaunchConfig(prev => ({ ...prev, channelId: firstChannel.id.toString() }));
            }
        }
    }, [swarmStatus, launchConfig.channelId]);

    // 2. 미션 목록 조회
    const { data: missions } = useQuery<MissionItem[]>({
        queryKey: ['missions'],
        queryFn: async () => { const d = (await api.get('/work-queue/items')).data; return Array.isArray(d) ? d : []; },
        refetchInterval: 5000
    });

    // 3. 미션 실행 모드 전환
    const setChannelModeMutation = useMutation({
        mutationFn: ({ channelId, mode }: { channelId: number, mode: string }) => 
            api.post('/swarm/mode', { channel_id: channelId, mode }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['swarmStatus'] })
    });

    // 4. 리얼타임 팩토리 런 (Factory Run)
    const triggerFactoryRunMutation = useMutation({
        mutationFn: (config: typeof launchConfig) => 
            api.post(`/swarm/missions/factory-run?channel_id=${config.channelId}&format=${config.format}&quality_mode=${config.qualityMode}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['swarmStatus'] });
            queryClient.invalidateQueries({ queryKey: ['missions'] });
            setLaunchDialogOpen(false);
            toast({
                title: "생산 공정 가동",
                description: "자율 생산 파이프라인이 성공적으로 기동되었습니다.",
            });
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "공정 가동 실패",
                description: error.response?.data?.detail || "엔진 초기화 중 오류가 발생했습니다.",
            });
        }
    });

    // 5. 미션 승인 뮤테이션 (Aligned with work-queue API)
    const approveMissionMutation = useMutation({
        mutationFn: async ({ missionId, ...payload }: { missionId: number, [key: string]: any }) => 
            (await api.post(`/work-queue/items/${missionId}/approve`, payload)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['missions'] });
            setSelectedMission(null);
        }
    });

    // 6. 채널 성장 단계 업데이트 뮤테이션 (FIX)
    const updatePhaseMutation = useMutation({
        mutationFn: ({ channelId, phase }: { channelId: number, phase: string }) => 
            api.post('/swarm/phase', { channel_id: channelId, phase }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['swarmStatus'] })
    });

    const getStatusBadge = (status: string, approval: string, isAutonomous: boolean) => {
        if (approval === 'PENDING') return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 px-2 py-0.5 font-black text-[9px] uppercase">🔍 검토 필요</Badge>;
        if (isAutonomous) return <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 px-2 py-0.5 shadow-sm shadow-indigo-100 animate-pulse font-black text-[9px] uppercase">🤖 스마트 자동화</Badge>;
        if (status === 'COMPLETED') return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 px-2 py-0.5 font-black text-[9px] uppercase">✅ 제작 완료</Badge>;
        return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 px-2 py-0.5 font-black text-[9px] uppercase">⏳ 대기 중</Badge>;
    };

    // --- Settings UI State ---
    const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
    
    // Fetch Settings
    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => (await api.get('/settings')).data
    });

    // Update Settings Mutation
    const updateSettingsMutation = useMutation({
        mutationFn: (newSettings: any) => api.put('/settings', newSettings),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            setSettingsDialogOpen(false);
        }
    });

    const [localSettings, setLocalSettings] = useState<any>(null);

    useEffect(() => {
        if (settings) {
            setLocalSettings(settings);
        }
    }, [settings]);

    const handleSaveSettings = () => {
        if (localSettings) {
            updateSettingsMutation.mutate(localSettings);
        }
    };
    const getRiskColors = (level: number) => {
        switch (level) {
            case 1: return { main: 'bg-amber-500', pulse: 'bg-amber-400', ring: 'border-amber-200', text: 'text-amber-500' };
            case 2: return { main: 'bg-rose-500', pulse: 'bg-rose-400', ring: 'border-rose-200', text: 'text-rose-500' };
            default: return { main: 'bg-emerald-500', pulse: 'bg-emerald-400', ring: 'border-emerald-200', text: 'text-emerald-500' };
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
            <style>{radarStyle}</style>

            {/* 📡 Sovereign Intelligence Ticker (Premium Light Mode Strategy) */}
            <div className="w-full bg-white/80 backdrop-blur-xl py-2 px-8 flex items-center gap-6 border-b border-indigo-100 z-[60] overflow-hidden whitespace-nowrap shadow-sm relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 opacity-50" />
                <div className="flex items-center gap-3 shrink-0 relative z-10 border-r border-slate-100 pr-6">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-[0_0_12px_rgba(79,70,229,0.4)] animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600 italic">Sovereign Intel_</span>
                </div>
                <div className="flex-1 overflow-hidden relative z-10">
                    <div className="flex animate-marquee gap-16 text-[10px] font-black uppercase tracking-[0.3em] italic text-slate-600">
                        {Array.isArray(strategicBriefs) && strategicBriefs.length > 0 ? (
                            strategicBriefs.map(brief => (
                                <span key={brief.id}>• {brief.title}: {brief.summary}</span>
                            ))
                        ) : (
                            <>
                                <span>• [Sovereign Strategist] 지능 분석 대기 중...</span>
                                <span>• 실시간 전략 수립 엔진 V4.0 최적화 완료</span>
                                <span>• 64개 클러스터 노드 동기화 상태: 정상</span>
                            </>
                        )}
                        {/* Loop for seamless scroll */}
                        {Array.isArray(strategicBriefs) && strategicBriefs.map(brief => (
                            <span key={`dup-${brief.id}`}>• {brief.title}: {brief.summary}</span>
                        ))}
                    </div>
                </div>
                <div className="shrink-0 flex items-center gap-4 border-l border-slate-100 pl-6 relative z-10">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-4 rounded-full bg-indigo-600 text-white hover:bg-slate-900 text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                        onClick={() => handleStageChange('strategy')}
                    >
                        <Activity className="w-3 h-3" /> 심층 전략 보고서 (DEEP ANALYZE)
                    </Button>
                </div>
            </div>
            
            {/* 🔗 Row 1: Global Sovereign HUD (Macro Layer) */}
            <div className="w-full bg-white px-8 py-4 flex items-center justify-between shadow-sm z-50 border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 pr-6 border-r border-slate-100">
                        <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                        <h2 className="font-black text-slate-900 tracking-tight text-xl">
                            스웜 통합 관제소 <span className="text-slate-400 font-medium text-sm ml-1">C2</span>
                        </h2>
                    </div>
                    
                    {/* [NEW] Pluggable Brain Sovereign Monitor */}
                    <div className="flex flex-col pr-6 border-r border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <BrainCircuit className="w-3.5 h-3.5 text-indigo-500" />
                            액티브 지능 연동망 (Sovereign Brains)
                        </span>
                        <div className="flex items-center gap-2">
                            <Badge 
                                variant="outline" 
                                className="cursor-pointer hover:bg-purple-50 hover:text-purple-800 transition-all bg-slate-50 text-purple-600 border-purple-100/80 text-[10px] py-1 px-2.5 font-bold font-mono rounded-lg"
                                onClick={() => setSettingsDialogOpen(true)}
                                title="OpenClaude 마스터 기획 지능 설정 변경"
                            >
                                🧠 OpenClaude (마스터 기획): {settings?.openclaude_model ? `${settings.openclaude_provider}/${settings.openclaude_model.split('/').pop()}` : 'google/gemini-2.0-flash'}
                            </Badge>
                            <Badge 
                                variant="outline" 
                                className="cursor-pointer hover:bg-emerald-50 hover:text-emerald-800 transition-all bg-slate-50 text-emerald-600 border-emerald-100/80 text-[10px] py-1 px-2.5 font-bold font-mono rounded-lg"
                                onClick={() => setSettingsDialogOpen(true)}
                                title="OpenHands 코드/터미널 실행 지능 설정 변경"
                            >
                                💻 OpenHands (스텔스 운영): {settings?.openclaude_model ? `${settings.openclaude_provider === 'google' ? 'anthropic' : settings.openclaude_provider}/${settings.openclaude_model.split('/').pop()}` : 'anthropic/claude-3-5-sonnet'}
                            </Badge>
                            <Badge 
                                variant="outline" 
                                className="cursor-pointer hover:bg-indigo-50 hover:text-indigo-800 transition-all bg-slate-50 text-indigo-600 border-indigo-100/80 text-[10px] py-1 px-2.5 font-bold font-mono rounded-lg"
                                onClick={() => setSettingsDialogOpen(true)}
                                title="Hermes 추론/워크플로우 지능 설정 변경"
                            >
                                🤖 Hermes (추론/생산): {settings?.hermes_agent_model ? `${settings.hermes_agent_provider}/${settings.hermes_agent_model.split('/').pop()}` : 'groq/llama-3.3-70b'}
                            </Badge>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">시스템 건전성</span>
                            <span className="text-sm font-black text-emerald-600">정상 v{swarmStatus?.globalStats?.totalMutations || 1402}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">활성 함대</span>
                            <span className="text-sm font-black text-indigo-600 tabular-nums">{swarmStatus?.globalStats?.activeChannels || 0} 채널</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">전문가 승인 대기</span>
                            <span className="text-sm font-black text-amber-500 tabular-nums">{swarmStatus?.globalStats?.pendingApprovals || 0} 대기중</span>
                        </div>
                        <div className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setMetricsDialogOpen(true)}>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">보안 상태</span>
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 text-[9px] font-black uppercase h-5">
                                <ShieldCheck className="w-3 h-3 mr-1" /> SECURED
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 mr-4">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">관제 유닛_</span>
                         <Select 
                            value={focalChannelId?.toString() || 'all'}
                            onValueChange={(v) => {
                                if (v === 'all') {
                                    setFocalChannelId(null);
                                } else {
                                    setFocalChannelId(parseInt(v));
                                    setLaunchConfig(prev => ({ ...prev, channelId: v }));
                                }
                            }}
                        >
                            <SelectTrigger className="w-[180px] h-9 rounded-xl border-slate-200 bg-slate-50 text-slate-900 font-black text-[10px] uppercase tracking-widest focus:ring-indigo-500">
                                <SelectValue placeholder="모든 채널 모니터링" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl bg-white border-slate-200 text-slate-900">
                                <SelectItem value="all" className="font-bold text-[10px] uppercase py-2">전체 유닛 모니터링</SelectItem>
                                {swarmStatus?.groups?.flatMap((g: any) => g.channels).map((c: any) => (
                                    <SelectItem key={c.id} value={c.id.toString()} className="font-bold text-[10px] uppercase py-2">
                                        [{c.id}] {c.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Badge variant={isConnected ? "outline" : "destructive"} className="gap-1.5 px-3 py-1 bg-slate-50 border-slate-200 text-slate-600 font-black uppercase text-[10px]">
                        <div className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-emerald-500" : "bg-red-500")} />
                        {isConnected ? "네트워크 온라인" : "연결 끊김"}
                    </Badge>
                </div>
            </div>

            {/* 🔗 Row 2: AI Hub Control (Horizontal Bar) */}
            <SwarmControlPanel />

            {/* 🔗 Row 3: Unified Sovereign Navigator */}
            <div className="w-full bg-card border-b border-border px-8 py-2 z-40 shrink-0 overflow-x-auto scrollbar-none">
                <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4">
                    <div className="flex bg-muted p-1 rounded-2xl border border-border shadow-sm flex-nowrap overflow-x-auto scrollbar-none shrink-0">
                        {[
                            { id: 'scan', label: '트렌드 감지', sub: 'HORIZON SCAN', icon: Search },
                            { id: 'strategy', label: '전략 수립', sub: 'STRATEGIC FORMULATION', icon: Lightbulb },
                            { id: 'conquest', label: '점령 시뮬레이션', sub: 'SOVEREIGN CONQUEST', icon: Sword },
                            { id: 'synthesis', label: '지능 생산', sub: 'INTELLIGENT SYNTHESIS', icon: GitMerge },
                            { id: 'evolution', label: '자가 진화', sub: 'SELF EVOLUTION', icon: Zap },
                            { id: 'skills', label: '스킬 센터', sub: 'SKILL CENTER', icon: Database },
                        ].map((nav) => (
                            <button
                                key={nav.id}
                                onClick={() => handleStageChange(nav.id)}
                                className={cn(
                                    "flex items-center gap-2 md:gap-4 px-3 md:px-6 py-2.5 rounded-xl transition-all duration-300 relative group shrink-0 whitespace-nowrap",
                                    activeStage === nav.id
                                        ? "bg-primary text-primary-foreground shadow-md scale-105 z-10 font-bold" 
                                        : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <nav.icon className={cn("w-5 h-5 shrink-0", activeStage === nav.id ? "text-primary-foreground" : "text-muted-foreground/60")} />
                                <div className="flex flex-col items-start leading-none gap-1">
                                    <span className="text-[10px] font-black uppercase tracking-tighter">{nav.label}</span>
                                    <span className="text-[8px] font-bold opacity-50 uppercase tracking-[0.1em] hide-on-slim">{nav.sub}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                         <Button 
                            variant="ghost" 
                            size="sm"
                            className="rounded-xl h-11 border-border text-muted-foreground font-black text-[10px] uppercase tracking-widest gap-2 hover:bg-muted hover:text-primary transition-all whitespace-nowrap"
                            onClick={() => {
                                console.log("Opening Settings Dialog...");
                                setSettingsDialogOpen(true);
                            }}
                        >
                            <Settings className="w-4 h-4" /> 하이브 설정
                        </Button>
                        <Button 
                            className="bg-primary hover:bg-accent text-primary-foreground font-black rounded-xl h-11 text-[10px] uppercase tracking-widest px-8 shadow-md transition-all flex items-center gap-3 whitespace-nowrap"
                            onClick={() => setLaunchDialogOpen(true)}
                        >
                            <Rocket className="w-4 h-4 animate-bounce" /> 미션 즉시 투입
                        </Button>
                    </div>
                </div>
            </div>

            {/* --- Main Interactive Zone --- */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 dashboard-scroll-area">
                <div className="p-8 pb-48 space-y-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                    
                    {/* --- Sub-HUD: Focal Unit Monitoring --- */}
                    {activeStage !== 'skills' && focalChannelId && (
                        <div className="w-full bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[3rem] p-8 flex items-center justify-between shadow-2xl shadow-slate-200/50">
                            <div className="flex items-baseline gap-6">
                                <div className="bg-indigo-600 text-white px-6 py-3 rounded-[1.5rem] font-black italic text-2xl shadow-2xl shadow-indigo-100">
                                    유닛_{focalChannelId}
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase italic">지능형 생산 파이프라인</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Sovereign Intelligent unit monitoring active</p>
                                </div>
                            </div>
                                
                                <div className="flex items-center gap-2 flex-1 justify-center max-w-3xl px-12">
                                    {pipelineSteps.map((step, index) => {
                                        const channelMission = missions?.find((m: any) => m.source_metadata?.channel_id === focalChannelId);
                                        const channelStage = channelMission?.upload_progress ? Math.floor(channelMission.upload_progress / 10) + 1 : 1;
                                        
                                        return (
                                            <React.Fragment key={step.id}>
                                                <div className={cn(
                                                    "flex flex-col items-center gap-2 px-4 py-2 rounded-2xl transition-all duration-500 min-w-[85px]",
                                                    step.id === channelStage ? "bg-indigo-600 text-white shadow-2xl scale-110 z-10" : 
                                                    step.id < channelStage ? "text-emerald-600 bg-emerald-50/50" : "text-slate-300 grayscale opacity-40"
                                                )}>
                                                    <step.icon className={cn("w-4 h-4", step.id === channelStage ? "animate-pulse" : "")} />
                                                    <span className="text-[9px] font-black uppercase tracking-tighter whitespace-nowrap">{step.label}</span>
                                                </div>
                                                {index < pipelineSteps.length - 1 && (
                                                    <div className={cn("w-6 h-[2px] rounded-full", step.id < channelStage ? "bg-emerald-200" : "bg-slate-100")} />
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>

                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="rounded-2xl h-14 px-8 border-indigo-100 text-indigo-600 font-black text-[10px] uppercase tracking-widest gap-3 bg-white shadow-xl hover:bg-slate-900 hover:text-white transition-all"
                                    onClick={() => setConsoleSessionId(missions?.find((m: any) => m.source_metadata?.channel_id === focalChannelId)?.id)}
                                >
                                    <Terminal className="w-5 h-5" /> 유닛 콘솔
                                </Button>
                            </div>
                        )}

                        {/* --- Dashboard Content Stage --- */}
                        <div className="w-full min-h-[600px]">
                            {activeStage === 'skills' && <MCPSkillExplorer />}
                            
                            {activeStage === 'scan' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                    {/* --- [NEW] Hierarchical Category Navigation --- */}
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                            {categories?.filter((cat: any) => cat.level === 0).map((cat: any) => {
                                                const isNew = cat.created_at && (new Date().getTime() - new Date(cat.created_at).getTime() < 86400000);
                                                return (
                                                    <Button 
                                                        key={cat.id}
                                                        variant={selectedCategoryId === cat.id ? "default" : "outline"}
                                                        className={cn(
                                                            "rounded-full px-6 h-10 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all relative overflow-visible",
                                                            cat.ai_generated 
                                                                ? isNew 
                                                                    ? "border-purple-500 bg-purple-50 text-purple-700 shadow-md ring-1 ring-purple-200" 
                                                                    : "border-purple-200 text-purple-600 hover:bg-purple-50"
                                                                : ""
                                                        )}
                                                        onClick={() => setSelectedCategoryId(cat.id)}
                                                    >
                                                        {cat.name}
                                                        {cat.ai_generated && <Sparkles className={cn("w-3 h-3 ml-2", isNew ? "animate-bounce text-purple-500" : "animate-pulse")} />}
                                                        {isNew && (
                                                            <span className="absolute -top-1 -right-1 flex h-4 w-8 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white italic shadow-lg ring-2 ring-white">
                                                                NEW
                                                            </span>
                                                        )}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                        
                                        {/* Hierarchical Category Tree (대/중/소) */}
                                        <div className="flex flex-col gap-2 bg-slate-900/5 p-6 rounded-[2.5rem] border border-slate-200/50">
                                            <div className="flex items-center gap-3 mb-2 px-2">
                                                <Layers className="w-4 h-4 text-indigo-600" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Classification Matrix</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {categories?.filter((cat: any) => cat.level === 0).map((cat: any) => (
                                                    <div key={cat.id} className="flex flex-col gap-2">
                                                        <Button 
                                                            variant={selectedCategoryId === cat.id ? "default" : "outline"}
                                                            size="sm"
                                                            className="rounded-xl px-4 h-9 text-[9px] font-black uppercase"
                                                            onClick={() => setSelectedCategoryId(cat.id)}
                                                        >
                                                            {cat.name}
                                                        </Button>
                                                        {/* Level 1 & 2 Nesting (Compact) */}
                                                        {selectedCategoryId === cat.id && (
                                                            <div className="flex flex-wrap gap-1 mt-1 ml-2 border-l-2 border-indigo-100 pl-2">
                                                                {categories?.filter((sub: any) => sub.parent_id === cat.id).map((sub: any) => (
                                                                    <Button 
                                                                        key={sub.id}
                                                                        variant="ghost"
                                                                        className="h-6 px-2 text-[8px] font-bold uppercase rounded-md hover:bg-indigo-50"
                                                                        onClick={(e) => { e.stopPropagation(); setSelectedCategoryId(sub.id); }}
                                                                    >
                                                                        + {sub.name}
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* --- [NEW] Hierarchical Navigation & Strategic Bar --- */}
                                    <div className="space-y-4 mb-8 sticky top-4 z-40">
                                        <div className="flex flex-wrap items-center gap-3 bg-white/90 backdrop-blur-2xl p-4 rounded-3xl shadow-2xl border border-slate-100/50">
                                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-200">
                                                <Target className="w-4 h-4 text-indigo-400" />
                                                <span className="text-[10px] font-black uppercase italic tracking-wider">Master Focus</span>
                                            </div>
                                            {interests?.map((interest: any) => (
                                                <div key={interest.id} className="flex items-center gap-1 group">
                                                    <Button 
                                                        variant={selectedInterest === interest.name ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setSelectedInterest(selectedInterest === interest.name ? null : interest.name)}
                                                        className={cn(
                                                            "h-10 px-5 rounded-2xl text-[10px] font-black uppercase transition-all duration-300",
                                                            selectedInterest === interest.name ? "bg-indigo-600 shadow-xl shadow-indigo-100 scale-105" : "hover:border-indigo-400 hover:text-indigo-600"
                                                        )}
                                                    >
                                                        {interest.name}
                                                    </Button>
                                                </div>
                                            ))}
                                            <div className="flex items-center gap-2 ml-auto">
                                                <Button 
                                                    onClick={() => setIsSynthesisOpen(!isSynthesisOpen)}
                                                    className={cn(
                                                        "h-12 px-8 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 transition-all shadow-2xl",
                                                        isSynthesisOpen 
                                                            ? "bg-rose-500 text-white shadow-rose-200" 
                                                            : "bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-amber-200 animate-pulse hover:scale-105"
                                                    )}
                                                >
                                                    <Compass className={cn("w-5 h-5", !isSynthesisOpen && "animate-spin-slow")} /> 
                                                    {isSynthesisOpen ? "탐사 구역 복귀" : "신규 블루오션 탐사 (OPEN)"}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Blue Ocean Discovery Panel (Refactored) */}
                                        {isSynthesisOpen && (
                                            <BlueOceanPanel 
                                                data={synthesisData} 
                                                isLoading={isSynthesizing} 
                                                onRefetch={refetchSynthesis} 
                                            />
                                        )}

                                        <div className="flex items-center justify-between bg-white/95 backdrop-blur-xl p-5 rounded-[2.5rem] shadow-2xl border border-indigo-50/50">
                                            <div className="flex items-center gap-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                                                        <Search className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <input 
                                                            type="text" 
                                                            placeholder="SEARCH ACROSS HORIZON..."
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                            className="bg-transparent border-0 font-black italic uppercase text-sm tracking-tighter w-80 focus:ring-0 placeholder:text-slate-300 p-0"
                                                        />
                                                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Global Intelligence Search v6.0</span>
                                                    </div>
                                                </div>
                                                
                                                {selectedCandidateIds.length > 0 && (
                                                    <div className="flex items-center gap-2 animate-in slide-in-from-left-8 duration-500">
                                                        <div className="h-10 w-[1px] bg-slate-100 mx-2" />
                                                        <Badge className="bg-slate-900 text-white px-4 py-1.5 rounded-xl text-[10px] font-black italic shadow-lg">{selectedCandidateIds.length} SELECTED</Badge>
                                                        <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                                            <Button size="sm" className="h-9 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-[9px] font-black uppercase px-5" onClick={() => batchApproveMutation.mutate(true)}>일괄 승인</Button>
                                                            <Button size="sm" className="h-9 bg-rose-500 hover:bg-rose-600 rounded-xl text-[9px] font-black uppercase px-5" onClick={() => batchApproveMutation.mutate(false)}>일괄 반려</Button>
                                                            <Button size="sm" variant="destructive" className="h-9 rounded-xl text-[9px] font-black uppercase px-5" onClick={() => batchDeleteMutation.mutate()}>일괄 삭제</Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex gap-3">
                                                <Button 
                                                    variant="ghost" 
                                                    className="h-12 px-6 text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                                                    onClick={() => setSelectedCandidateIds(scoutCandidates.map((c: any) => c.id))}
                                                >
                                                    전체 선택
                                                </Button>
                                                <Button 
                                                    className="rounded-[1.5rem] h-12 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest px-10 shadow-2xl shadow-indigo-200 flex items-center gap-3 group relative overflow-hidden"
                                                    onClick={() => startScoutMutation.mutate({ category_id: selectedCategoryId })}
                                                    disabled={startScoutMutation.isPending}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <Rocket className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform relative z-10" /> 
                                                    <span className="relative z-10">{startScoutMutation.isPending ? 'DEEP SCANNING...' : 'SOVEREIGN DEEP SCAN'}</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* --- [NEW] Grouped Layout with Dividers --- */}
                                    <div className="space-y-12">
                                        {/* Hierarchical Breadcrumb Navigation */}
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            <span className="text-indigo-600 italic font-black">ACTIVE MATRIX VIEW</span>
                                            {selectedCategoryId && (
                                                <>
                                                    <ChevronRight className="w-3 h-3" />
                                                    <span className="text-indigo-600 italic">
                                                        {categories?.find(cat => cat.id === selectedCategoryId)?.name}
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        <div 
                                            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" 
                                            onMouseDown={() => setIsDragging(true)}
                                            onMouseUp={() => setIsDragging(false)}
                                            onMouseLeave={() => setIsDragging(false)}
                                            style={{ maxWidth: '2800px' }}
                                        >
                                            {scoutCandidates?.length > 0 ? (
                                                Object.entries(
                                                    scoutCandidates
                                                    .filter((c: any) => !selectedCategoryId || c.category_id === selectedCategoryId)
                                                    .filter((c: any) => {
                                                        const matchesSearch = !searchQuery || 
                                                            c.channel_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                            c.ai_reasoning.toLowerCase().includes(searchQuery.toLowerCase());
                                                        const matchesInterest = !selectedInterest || 
                                                            c.ai_reasoning.toLowerCase().includes(selectedInterest.toLowerCase()) ||
                                                            c.channel_name.toLowerCase().includes(selectedInterest.toLowerCase());
                                                        return matchesSearch && matchesInterest;
                                                    })
                                                    .reduce((acc: any, c: any) => {
                                                        const catName = categories?.find(cat => cat.id === c.category_id)?.name || "UNCATEGORIZED";
                                                        if (!acc[catName]) acc[catName] = [];
                                                        acc[catName].push(c);
                                                        return acc;
                                                    }, {})
                                                ).map(([catName, candidates]: [string, any]) => (
                                                    <React.Fragment key={catName}>
                                                        <div className="col-span-full flex items-center gap-4 mt-8 mb-4">
                                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                                                            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] italic flex items-center gap-2">
                                                                <Layers className="w-4 h-4 text-indigo-400" /> {catName}
                                                            </h2>
                                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                                                        </div>
                                                        {candidates.map((c: any) => (
                                                            <Card 
                                                                key={c.id} 
                                                                onClick={(e) => toggleCandidateSelection(c.id, e.shiftKey)}
                                                                onMouseEnter={() => isDragging && !selectedCandidateIds.includes(c.id) && toggleCandidateSelection(c.id, false)}
                                                                className={cn(
                                                                    "border-0 shadow-sm bg-white rounded-3xl overflow-hidden flex flex-col group cursor-pointer transition-all duration-300 relative select-none border-2 p-4",
                                                                    selectedCandidateIds.includes(c.id) ? "border-indigo-500 ring-4 ring-indigo-50 scale-[0.98] bg-indigo-50/10" : "border-transparent hover:border-indigo-100 hover:shadow-xl hover:-translate-y-1"
                                                                )}
                                                            >
                                                                {/* Selection Badge */}
                                                                {selectedCandidateIds.includes(c.id) && (
                                                                    <div className="absolute top-2 left-2 z-20">
                                                                        <div className="w-5 h-5 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg">
                                                                            <Check className="w-3 h-3 text-white" />
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Sovereign Score HUD */}
                                                                <div className="absolute top-2 right-2 z-10">
                                                                    <div className="px-2 py-1 bg-slate-900 text-white rounded-xl shadow-2xl flex items-center gap-1 border border-white/10">
                                                                        <span className="text-[10px] font-black italic">{Math.round(c.total_sovereign_score || 0)}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-col h-full gap-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 transition-all">
                                                                            <User className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                                                                        </div>
                                                                        <h3 className="text-[11px] font-black text-slate-900 truncate italic uppercase leading-tight">{c.channel_name}</h3>
                                                                    </div>
                                                                    
                                                                    <p className="text-[9px] text-slate-500 font-bold leading-tight line-clamp-2 italic opacity-80 h-6">
                                                                        "{c.ai_reasoning}"
                                                                    </p>

                                                                    <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] font-black text-emerald-500 italic">+{Math.round((c.subscriber_growth_7d || 0) * 100)}%</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <Button 
                                                                                size="icon" 
                                                                                variant="ghost" 
                                                                                className="w-7 h-7 rounded-lg text-indigo-500 hover:bg-indigo-50" 
                                                                                onClick={(e) => { e.stopPropagation(); conquestMutation.mutate(c.id); }}
                                                                            >
                                                                                <Sword className="w-3.5 h-3.5" />
                                                                            </Button>
                                                                            <a href={c.channel_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="w-7 h-7 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-900 hover:text-white transition-all">
                                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                                            </a>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </Card>
                                                        ))}
                                                    </React.Fragment>
                                                ))
                                            ) : (
                                                <div className="col-span-full py-48 flex flex-col items-center justify-center space-y-8 glass-morphism rounded-[4rem] border-dashed border-4 border-slate-200/50">
                                                    <div className="p-10 bg-slate-100 rounded-full animate-radar-pulse">
                                                        <Search className="w-20 h-20 text-indigo-200" />
                                                    </div>
                                                    <div className="text-center space-y-2">
                                                        <p className="text-slate-400 font-black uppercase text-sm tracking-[0.4em] italic">데이터 대기 중 (Awaiting Reconnaissance)...</p>
                                                        <p className="text-slate-300 text-[11px] font-bold uppercase tracking-widest">하단의 'SOVEREIGN DEEP SCAN' 버튼을 눌러 정찰을 시작하세요</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Global Strategic Overlays (Refactored) */}
                                        <ConquestManual 
                                            target={conquestTarget} 
                                            onClose={() => setConquestTarget(null)}
                                            onInitiateMission={(id) => {
                                                console.log("Initiating mission for candidate:", id);
                                                setLaunchConfig(prev => ({ ...prev, candidateId: id }));
                                                setLaunchDialogOpen(true);
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeStage === 'strategy' && (
                                <div className="space-y-8 animate-in fade-in duration-700">
                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in zoom-in-95 duration-500">
                                        <Card className="lg:col-span-1 border-0 shadow-3xl bg-card rounded-[3rem] overflow-hidden flex flex-col h-[500px] lg:h-[calc(100vh-280px)] lg:min-h-[600px] border border-border">
                                            <div className="p-8 border-b border-border bg-muted/20 flex flex-col gap-4">
                                                <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-3">
                                                    <BrainCircuit className="w-5 h-5 text-primary" /> 마인드 금고 (Brain Vault)
                                                </h3>
                                                <Button 
                                                    size="sm" 
                                                    className="w-full bg-primary hover:bg-accent text-primary-foreground font-black text-[9px] uppercase tracking-widest rounded-xl"
                                                    onClick={() => selectedCategoryId && createBriefMutation.mutate(selectedCategoryId)}
                                                    disabled={!selectedCategoryId || createBriefMutation.isPending}
                                                >
                                                    {createBriefMutation.isPending ? "전략 생성 중..." : "신규 전략 보고서 생성"}
                                                </Button>
                                            </div>
                                            <ScrollArea className="flex-1 p-4">
                                                <div className="space-y-3">
                                                    {strategicBriefs?.map((brief: StrategicBrief) => (
                                                        <button 
                                                            key={brief.id}
                                                            onClick={() => setSelectedMission(brief)}
                                                            className={cn(
                                                                "w-full text-left p-6 rounded-[2rem] transition-all flex flex-col gap-3 group border border-transparent",
                                                                selectedMission?.id === brief.id ? "bg-primary text-primary-foreground shadow-2xl scale-[1.02]" : "hover:bg-muted/40 hover:border-border"
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between w-full">
                                                                <Badge className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-md", 
                                                                    selectedMission?.id === brief.id ? "bg-white/20 text-white border-white/30" : "bg-primary/10 text-primary border-primary/20")}>
                                                                    {brief.niche}
                                                                </Badge>
                                                                <span className="text-[8px] opacity-60 font-bold">{new Date(brief.updated_at).toLocaleDateString()}</span>
                                                            </div>
                                                            <span className="text-xs font-black italic uppercase leading-tight">{brief.title}</span>
                                                            <p className={cn("text-[9px] font-medium line-clamp-2 leading-relaxed opacity-70", 
                                                                selectedMission?.id === brief.id ? "text-white" : "text-muted-foreground")}>
                                                                {brief.summary}
                                                            </p>
                                                        </button>
                                                    ))}
                                                    {(!strategicBriefs || strategicBriefs.length === 0) && (
                                                        <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                                                            <Search className="w-12 h-12" />
                                                            <p className="text-[10px] font-black uppercase tracking-widest leading-loose">저장된 전략 보고서가<br/>없습니다.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        </Card>

                                        <Card className="lg:col-span-3 border-0 shadow-3xl bg-card rounded-[4rem] overflow-hidden flex flex-col h-[500px] lg:h-[calc(100vh-280px)] lg:min-h-[600px] border border-border shadow-sm">
                                            {selectedMission && 'content_markdown' in selectedMission ? (
                                                <div className="flex flex-col h-full">
                                                    <div className="p-10 border-b border-slate-50 bg-white flex items-center justify-between">
                                                        <div className="flex items-center gap-6">
                                                            <div className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                                                            <div className="flex flex-col">
                                                                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1">
                                                                    {selectedMission.title}
                                                                </h3>
                                                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] italic">SOVEREIGN STRATEGIC DOC_v4.2</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <Button variant="outline" className="rounded-xl h-12 px-6 border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">전략 수정</Button>
                                                            <Button className="rounded-xl h-12 px-8 bg-indigo-600 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all">전략 승인 및 실행</Button>
                                                        </div>
                                                    </div>
                                                    <ScrollArea className="flex-1 p-16 bg-slate-50/20">
                                                        <div className="max-w-4xl mx-auto space-y-12">
                                                            {/* Summary Card */}
                                                            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-indigo-100/10 space-y-6">
                                                                <div className="flex items-center gap-3">
                                                                    <Sparkles className="w-5 h-5 text-amber-500" />
                                                                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">요약 (Executive Summary)</h4>
                                                                </div>
                                                                <p className="text-sm font-bold text-slate-600 leading-loose italic">
                                                                    {selectedMission.summary}
                                                                </p>
                                                            </div>

                                                            {/* Content Rendering */}
                                                            <div className="prose prose-slate max-w-none">
                                                                <div className="whitespace-pre-wrap font-medium text-slate-700 leading-relaxed text-[15px] bg-white p-12 rounded-[3rem] border border-slate-100 shadow-2xl">
                                                                    {selectedMission.content_markdown}
                                                                </div>
                                                            </div>

                                                            {/* Strategic Recommendations */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                                                                {selectedMission.strategic_recommendations?.map((rec: string, i: number) => (
                                                                    <div key={i} className="bg-indigo-50/50 border border-indigo-100 p-8 rounded-[2rem] flex gap-4 transition-all hover:bg-white hover:shadow-xl group">
                                                                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-lg group-hover:scale-110 transition-transform">{i+1}</div>
                                                                        <p className="text-[11px] font-black text-slate-700 uppercase italic leading-relaxed">{rec}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </ScrollArea>
                                                </div>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center opacity-30 gap-8">
                                                    <div className="relative">
                                                        <BrainCircuit className="w-32 h-32 text-indigo-200" />
                                                        <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-[60px] animate-pulse" />
                                                    </div>
                                                    <div className="text-center space-y-3">
                                                        <p className="font-black uppercase text-lg tracking-[0.5em] italic">Intelligence Matrix Idle</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">좌측 리스트에서 전략 보고서를 선택하거나 신규 생성을 시작하세요</p>
                                                    </div>
                                                </div>
                                            )}
                                        </Card>
                                    </div>
                                </div>
                            )}

                        {activeStage === 'synthesis' && (
                                <div className="space-y-16">
                                    <div className="flex flex-col gap-16 relative">
                                        {/* Top: 에이전트 협업 프로세스 (Topology) */}
                                        <div className="h-[800px] rounded-[3.5rem] overflow-hidden border border-slate-100 shadow-inner bg-slate-50 relative group">
                                            <SwarmTopologyCanvas onNodeClick={(id, data) => setSelectedAgentNode({ id, data })} />
                                            
                                            {/* Integrated Agent DNA Inspector */}
                                            {selectedAgentNode && (
                                                <AgentDNAInspector 
                                                    nodeId={selectedAgentNode.id} 
                                                    nodeData={selectedAgentNode.data} 
                                                    onClose={() => setSelectedAgentNode(null)} 
                                                    settings={settings}
                                                />
                                            )}
                                        </div>

                                        {/* Bottom: 전체 채널 운영 현황 (Global Fleet) */}
                                        <div className="h-[800px] rounded-[3.5rem] overflow-hidden border border-slate-100 shadow-inner bg-slate-50 relative">
                                            <GlobalFleetCanvas 
                                                groups={swarmStatus?.groups || []}
                                                onChannelSelect={(id) => setFocalChannelId(id)} 
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                                        <div className="flex items-center justify-between px-4">
                                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-4 uppercase italic">
                                                격리 보호 그룹 (Isolation Cells) <ShieldCheck className="w-9 h-9 text-indigo-600" />
                                            </h2>
                                            <Button variant="ghost" className="text-xs font-black text-indigo-600 hover:bg-slate-100 uppercase tracking-widest">실시간 보안 감사 진행</Button>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 gap-12">
                                            {swarmStatus?.groups?.map((group: any) => (
                                                <Card key={group.captainId} className="border-0 bg-white/40 backdrop-blur-xl rounded-[4rem] p-10 border border-white shadow-2xl">
                                                    <div className="space-y-8">
                                                        <div className="flex items-center justify-between bg-white px-10 py-8 rounded-[3rem] border border-slate-100 shadow-2xl">
                                                            <div className="flex items-center gap-8">
                                                                <div className="relative">
                                                                    <div className={cn("w-20 h-20 rounded-[2.5rem] flex items-center justify-center font-black text-white text-3xl z-20 relative shadow-2xl", 
                                                                        group.riskLevel === 0 ? "bg-emerald-500" : "bg-rose-500")}>
                                                                        {group.captainEmail[0].toUpperCase()}
                                                                    </div>
                                                                    <div className={cn("absolute inset-0 w-20 h-20 rounded-[2.5rem] animate-radar-pulse z-10 opacity-40", 
                                                                        group.riskLevel === 0 ? "bg-emerald-400" : "bg-rose-400")} />
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <div className="flex items-center gap-4">
                                                                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">{group.captainEmail.split('@')[0]}</h3>
                                                                        <Badge className={cn("text-[10px] font-black uppercase px-4 py-1 rounded-full",
                                                                            group.riskLevel === 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100")}>
                                                                            {group.riskLevel === 0 ? "CLUSTER SECURE" : "INTERVENTION REQ"}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mission Overwatch Cluster Monitoring Active</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-12">
                                                                <div className="text-right">
                                                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-loose">ACTIVE UNITS</span>
                                                                    <div className="text-4xl font-black text-slate-900 italic tracking-tighter">{group.channels.length} UNITS</div>
                                                                </div>
                                                                <Button className="w-16 h-16 rounded-[1.5rem] bg-slate-50 border border-slate-100 hover:bg-slate-900 hover:text-white transition-all shadow-xl group">
                                                                    <Maximize2 className="w-6 h-6 text-slate-400 group-hover:text-white" />
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
                                                            {group.channels.map((channel: any) => (
                                                                <Card 
                                                                    key={channel.id} 
                                                                    onClick={() => setFocalChannelId(channel.id)}
                                                                    className={cn(
                                                                        "border-0 shadow-2xl rounded-[2.5rem] p-8 hover:-translate-y-2 transition-all duration-500 cursor-pointer border-t-4",
                                                                        focalChannelId === channel.id ? "bg-slate-900 text-white border-indigo-400" : "bg-white border-white hover:border-indigo-100"
                                                                    )}
                                                                >
                                                                    <div className="flex flex-col gap-6">
                                                                        <div className="flex flex-col">
                                                                            <span className={cn("text-[10px] font-black uppercase tracking-widest", focalChannelId === channel.id ? "text-indigo-400" : "text-slate-400")}>Unit_{channel.id}</span>
                                                                            <h4 className="text-lg font-black italic tracking-tight uppercase line-clamp-1">{channel.title}</h4>
                                                                        </div>
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex flex-col">
                                                                                <span className={cn("text-[9px] font-black uppercase opacity-60", focalChannelId === channel.id ? "text-white" : "text-slate-500")}>Auto-Logic</span>
                                                                                <span className="text-sm font-black italic">INTELLIGENT</span>
                                                                            </div>
                                                                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl", 
                                                                                channel.isAutonomous ? "bg-indigo-600 text-white shadow-indigo-200" : "bg-slate-100 text-slate-300")}>
                                                                                <Zap className={cn("w-6 h-6", channel.isAutonomous && "fill-current animate-pulse")} />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </Card>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeStage === 'conquest' && (
                                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-1000">
                                    <div className="bg-card rounded-[3rem] md:rounded-[4rem] p-6 md:p-12 lg:p-16 border border-border shadow-sm relative overflow-hidden h-auto lg:h-[calc(100vh-280px)] lg:min-h-[700px] flex flex-col items-center justify-between gap-8">
                                        {/* Grid Background */}
                                        <div className="absolute inset-0 opacity-40 pointer-events-none" 
                                             style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
                                        />
                                        
                                        <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                                            <div className="flex flex-col gap-2">
                                                <Badge className="w-fit bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase px-4 py-1.5 rounded-full">
                                                    Tactical Overwatch v4.2
                                                </Badge>
                                                <h2 className="text-2xl md:text-4xl font-black text-foreground italic tracking-tighter uppercase leading-none">Sovereign <span className="text-primary">Conquest Radar</span></h2>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-4 md:gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                                <div className="text-left">
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Target Niche</span>
                                                    <span className="text-lg md:text-xl font-black text-foreground italic uppercase tracking-tight">{selectedInterest || "GLOBAL HORIZON"}</span>
                                                </div>
                                                <div className="h-10 w-[1px] bg-border hidden sm:block" />
                                                <Button className="h-11 md:h-14 px-6 md:px-10 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-[10px] md:text-[11px] uppercase tracking-widest rounded-2xl shadow-lg transition-all whitespace-nowrap">
                                                    신규 구역 정찰 시작 (RE-SCAN)
                                                </Button>
                                            </div>
                                        </div>

                                        {/* REAL-TIME RADAR COMPONENT (LIGHT MODE) */}
                                        <div className="relative w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] md:w-[480px] md:h-[480px] flex items-center justify-center shrink-0">
                                            {/* Radar Rings */}
                                            <div className="absolute inset-0 border border-primary/20 rounded-full" />
                                            <div className="absolute inset-[15%] border border-primary/30 rounded-full" />
                                            <div className="absolute inset-[30%] border border-indigo-200/50 rounded-full" />
                                            <div className="absolute inset-[45%] border border-indigo-200/50 rounded-full" />
                                            
                                            {/* Sweep Effect */}
                                            <div className="absolute inset-0 rounded-full animate-spin-slow origin-center" 
                                                 style={{ background: 'conic-gradient(from 0deg, hsl(var(--primary)/0.05) 0%, transparent 40%)', animationDuration: '6s' }} 
                                            />

                                            {/* Tactical Points */}
                                            {scoutCandidates?.slice(0, 12).map((c, idx) => (
                                                <div 
                                                    key={c.id}
                                                    className="absolute w-4 h-4 rounded-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.3)] flex items-center justify-center group cursor-pointer animate-pulse"
                                                    style={{ 
                                                        top: `${30 + Math.random() * 40}%`, 
                                                        left: `${30 + Math.random() * 40}%`,
                                                        animationDelay: `${idx * 0.2}s`
                                                    }}
                                                >
                                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-card border border-border text-foreground px-3 py-1.5 rounded-xl text-[9px] font-black shadow-2xl opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 pointer-events-none whitespace-nowrap z-50">
                                                        {c.channel_name} <br/> <span className="text-primary">SCORE: {Math.round(c.total_sovereign_score)}</span>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Center Point */}
                                            <div className="w-4 h-4 bg-primary rounded-full shadow-[0_0_20px_rgba(var(--primary),0.5)] z-20 relative" />
                                        </div>

                                        {/* Bottom Stats Grid (Light Mode) */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 w-full pt-6 md:pt-10 border-t border-border relative z-10 bg-card/50 backdrop-blur-md">
                                            {[
                                                { label: "침투 성공 확률", value: "89.4%", color: "text-emerald-500" },
                                                { label: "시장 저항 계수", value: "LOW", color: "text-amber-500" },
                                                { label: "예상 파급력", value: "HIGH", color: "text-primary" },
                                                { label: "전략적 우위", value: "DOMINANT", color: "text-foreground" }
                                            ].map((stat) => (
                                                <div key={stat.label} className="flex flex-col gap-1 md:gap-2">
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                                                    <span className={cn("text-xl md:text-3xl font-black italic tracking-tighter", stat.color)}>{stat.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeStage === 'evolution' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                    <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                                        <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center">
                                            <div className="flex-1 space-y-4">
                                                <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1 rounded-full">지능 환류 임베딩 시스템 활성</Badge>
                                                <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter leading-none">THE SOVEREIGN<br/>EVOLUTION MATRIX</h2>
                                                <p className="text-slate-400 text-[11px] font-bold leading-relaxed max-w-xl opacity-80 italic">
                                                    자율 진화 모듈이 성과 지표를 분석하여 성공 패턴을 군집 지식 네트워크(LanceDB)에 실시간 동기화합니다.
                                                </p>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl text-center min-w-[160px] shadow-sm">
                                                    <div className="text-[9px] text-indigo-600 font-black uppercase tracking-widest mb-2">누적 알고리즘 변이</div>
                                                    <div className="text-4xl font-black text-slate-900 italic tracking-tighter tabular-nums">{swarmStatus?.globalStats?.totalMutations || 1402}</div>
                                                </div>
                                                <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl text-center min-w-[160px] shadow-sm">
                                                    <div className="text-[9px] text-rose-500 font-black uppercase tracking-widest mb-2">자가 복구 데이터</div>
                                                    <div className="text-4xl font-black text-slate-900 italic tracking-tighter tabular-nums">{swarmStatus?.globalStats?.selfHealingCount || 82}</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Action Bar */}
                                        <div className="mt-8 border-t border-slate-100 pt-8 flex items-center justify-between relative z-10">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Intelligence Feedback Loop Synchronized with 14 active units</p>
                                            <div className="flex gap-4">
                                                <Button variant="ghost" className="text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl h-12 text-[10px] font-black uppercase tracking-widest px-8">분석 레포트 생성</Button>
                                                <Button className="bg-indigo-600 hover:bg-slate-900 text-white rounded-xl h-12 text-[10px] font-black uppercase tracking-widest px-10 shadow-xl flex items-center gap-2 transition-all">
                                                    <RefreshCw className="w-4 h-4" /> 지능 환류 즉시 동기화
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {swarmWisdom?.map((w: any) => (
                                            <Card key={w.id} className="border-0 shadow-3xl bg-white rounded-[3rem] overflow-hidden group hover:ring-4 hover:ring-indigo-500/10 transition-all p-10 border border-slate-50">
                                                <div className="space-y-8">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-5">
                                                            <div className={cn("p-4 rounded-2xl shadow-xl", w.experience_type === 'SUCCESS_PATTERN' ? "bg-emerald-50 text-emerald-600 shadow-emerald-100" : "bg-rose-50 text-rose-600 shadow-rose-100")}>
                                                                {w.experience_type === 'SUCCESS_PATTERN' ? <Zap className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{w.category} • {w.niche}</div>
                                                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">{w.title}</h3>
                                                            </div>
                                                        </div>
                                                        <div className="text-3xl font-black text-indigo-600 italic">#{w.importance_score}</div>
                                                    </div>
                                                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100/50 relative">
                                                        <p className="text-sm font-bold text-slate-600 leading-relaxed italic opacity-90">"{w.content}"</p>
                                                    </div>
                                                    <div className="flex items-center justify-between opacity-50 px-2">
                                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Source_Session: {w.source_session_id}</span>
                                                        <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200">{new Date(w.created_at).toLocaleDateString()}</Badge>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>


                        {/* --- Focal Telemetry Zone (Style/Gov) --- */}
                        {focalChannelId && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-12 duration-1000 mt-12">
                                <div className="lg:col-span-4">
                                    <StyleSignatureHUD 
                                        pacing={styleStats.pacing} 
                                        hook={styleStats.hook} 
                                        tone={styleStats.tone} 
                                        semanticFlux={styleStats.semanticFlux} 
                                    />
                                </div>
                                <div className="lg:col-span-8">
                                    <SovereignGovernanceMonitor 
                                        cost={124.50} 
                                        revenue={1240.20} 
                                        pending={swarmStatus?.globalStats?.pendingApprovals || 0} 
                                    />
                                </div>
                            </div>
                        )}

                        {/* --- Embedded Mission Terminal (Consolidated) --- */}
                        <div id="integrated-terminal" className="mt-12 animate-in slide-in-from-bottom-8 duration-1000">
                            <Card className="border-0 shadow-2xl bg-white rounded-[3rem] overflow-hidden flex flex-col border border-slate-100">
                                <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
                                            <Terminal className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-slate-900 uppercase italic">소버린 통합 관제 터미널</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sovereign Mission Command & Live Telemetry</p>
                                        </div>
                                    </div>

                                    {/* --- [NEW] Autonomous Scout Quick Access --- */}
                                    <div className="flex items-center gap-6 px-8 border-l-2 border-slate-100 mx-8">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Discovery Engine</span>
                                            <span className="text-[10px] font-black text-emerald-600 italic uppercase">Autonomous Active</span>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="rounded-xl h-9 px-4 border-emerald-100 text-emerald-600 font-black text-[9px] uppercase tracking-widest hover:bg-emerald-50 transition-all gap-2"
                                            onClick={() => {
                                                const niche = prompt("정찰할 니치를 입력하세요 (예: AI News):");
                                                if (niche) startScoutMutation.mutate({ niche, autonomous: true });
                                            }}
                                        >
                                            <Compass className="w-3.5 h-3.5" /> 자율 정찰 기동
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-4 ml-auto">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                                            <span className="text-[10px] font-black text-slate-500 uppercase">{isConnected ? "ONLINE" : "OFFLINE"}</span>
                                        </div>
                                        <Badge variant="outline" className="text-[9px] font-black uppercase text-indigo-500 border-indigo-100">PROTOCOL v6.5</Badge>
                                    </div>
                                </div>
                                <div className="h-[500px] flex flex-col bg-white">
                                    <ScrollArea className="flex-1 p-8 font-mono text-[11px]">
                                        <div className="space-y-4">
                                            {agentLogs.length === 0 ? (
                                                <div className="text-slate-300 italic py-20 text-center uppercase tracking-[0.3em]">No active pulse detected... 하이브의 응답을 기다리는 중</div>
                                            ) : (
                                                agentLogs.map((log, i) => (
                                                    <div key={i} className={cn(
                                                        "flex gap-4 animate-in fade-in slide-in-from-left-2 duration-300 p-3 rounded-xl",
                                                        log.type === 'user' ? "bg-indigo-50 text-indigo-700" : "bg-slate-50 text-slate-600"
                                                    )}>
                                                        <span className="opacity-30 shrink-0 font-bold">[{new Date(log.time).toLocaleTimeString()}]</span>
                                                        <p className="leading-relaxed whitespace-pre-wrap font-bold">{log.text}</p>
                                                    </div>
                                                ))
                                            )}
                                            {isThinking && (
                                                <div className="flex gap-3 text-indigo-600 animate-pulse bg-indigo-50/50 p-3 rounded-xl">
                                                    <span className="opacity-30">[{new Date().toLocaleTimeString()}]</span>
                                                    <span className="font-black italic">매트릭스 분석 및 처리 중...</span>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                    <div className="p-8 bg-slate-50 border-t border-slate-100">
                                        <div className="flex gap-4">
                                            <Input 
                                                value={commandInput}
                                                onChange={(e) => setCommandInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
                                                placeholder="명령을 입력하세요 (예: 최신 트렌드 기반의 숏폼 미션 기동...)"
                                                className="h-16 rounded-2xl border-slate-200 bg-white focus-visible:ring-indigo-500 font-bold text-slate-900 px-8 text-sm shadow-sm"
                                            />
                                            <Button 
                                                onClick={handleSendCommand}
                                                disabled={!isConnected || isThinking}
                                                className="h-16 px-10 rounded-2xl bg-indigo-600 hover:bg-slate-900 text-white shadow-xl transition-all font-black text-sm uppercase tracking-widest flex items-center gap-3"
                                            >
                                                {isThinking ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                                                {isThinking ? 'Processing...' : 'Execute'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                </div>
            </div>

            {/* --- Global Infrastructure Overlay --- */}
            <div className="fixed bottom-0 left-0 right-0 z-[60]">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="infrastructure" className="border-0">
                        <AccordionTrigger className="h-10 bg-white border-t border-slate-200 px-10 hover:no-underline hover:bg-slate-50 transition-all group [&[data-state=open]>svg]:rotate-180">
                            <div className="flex items-center justify-between w-full pr-16">
                                <div className="flex items-center gap-10">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">시스템 무결성 정상</span>
                                    </div>
                                    <div className="w-[1px] h-3 bg-slate-200" />
                                    <div className="flex items-center gap-3">
                                        <Lock className="w-4 h-4 text-indigo-600" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">12개 격리 보호 그룹 활성</span>
                                    </div>
                                </div>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">인프라 펄스: 114개 노드 모니터링 중</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="bg-white text-slate-900 border-t border-slate-200 p-12 shadow-2xl">
                            <div className="grid grid-cols-12 gap-12 max-w-[1800px] mx-auto">
                                <div className="col-span-8 space-y-8">
                                     <div className="flex items-center justify-between">
                                         <h5 className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-600">Distributed Node Matrix (IP_CLUSTER_7)</h5>
                                         <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-100 text-slate-400 px-4 py-1">Telemetry Live Synchronization</Badge>
                                     </div>
                                     <div className="grid grid-cols-10 gap-3">
                                        {[110, 114, 118, 122, 126, 130, 134, 138, 142, 146].map(id => (
                                            <div key={id} className="flex flex-col items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-500 transition-all group cursor-pointer shadow-sm">
                                                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse group-hover:scale-150 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]" />
                                                <span className="text-[10px] font-black text-slate-400 tracking-tighter italic">IP-{id}</span>
                                            </div>
                                        ))}
                                     </div>
                                </div>
                                <div className="col-span-4 flex flex-col justify-between p-10 bg-slate-50 rounded-[3rem] border border-slate-100">
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 font-sans">Global Intelligence Confidence</p>
                                        <p className="text-6xl font-black italic text-slate-900 tracking-tighter tabular-nums leading-none">99.98%</p>
                                        <Progress value={99.98} className="h-1.5 bg-indigo-100" />
                                    </div>
                                    <Button variant="outline" className="w-full h-16 rounded-2xl border-slate-200 bg-white text-slate-900 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-xl">Download Security Audit Report (.pdf)</Button>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            {/* --- Global Dialogs & Modals --- */}
            
            <Dialog open={launchDialogOpen} onOpenChange={setLaunchDialogOpen}>
                <DialogContent className="sm:max-w-[550px] border-0 shadow-3xl p-0 overflow-hidden bg-white rounded-[3rem]">
                    <div className="bg-indigo-600 p-10 text-white relative">
                         <div className="absolute top-0 right-0 p-12 opacity-10">
                            <Rocket className="w-32 h-32" />
                         </div>
                         <DialogHeader className="relative z-10">
                            <DialogTitle className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4">
                                <Sparkles className="w-8 h-8 text-white" /> MISSION START
                            </DialogTitle>
                            <DialogDescription className="text-white/60 font-bold text-xs uppercase tracking-widest mt-2">
                                함대 통합 지능형 콘텐츠 생산 워크플로우 기동
                            </DialogDescription>
                         </DialogHeader>
                    </div>
                    <div className="p-10 space-y-10">
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Target Unit Selected</Label>
                                <Select value={launchConfig.channelId} onValueChange={(v) => setLaunchConfig({...launchConfig, channelId: v})}>
                                    <SelectTrigger className="h-16 rounded-[1.5rem] border-slate-100 focus:ring-4 focus:ring-indigo-100 font-black bg-slate-50 transition-all">
                                        <SelectValue placeholder="생산 대상 채널 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100 shadow-3xl">
                                        {swarmStatus?.groups?.flatMap((g: any) => g.channels).map((c: any) => (
                                            <SelectItem key={c.id} value={c.id.toString()} className="font-black py-4 uppercase text-[11px]">{c.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Aspect Ratio</Label>
                                    <Select defaultValue="shorts" onValueChange={(v) => setLaunchConfig({...launchConfig, format: v})}>
                                        <SelectTrigger className="h-16 rounded-[1.5rem] border-slate-100 font-black bg-slate-50 transition-all"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-2xl"><SelectItem value="shorts" className="font-black">Shorts (9:16)</SelectItem><SelectItem value="longform" className="font-black">Long (16:9)</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">AI Engine Mode</Label>
                                    <Select defaultValue="auto" onValueChange={(v) => setLaunchConfig({...launchConfig, qualityMode: v})}>
                                        <SelectTrigger className="h-16 rounded-[1.5rem] border-slate-100 font-black bg-slate-50 transition-all"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-2xl"><SelectItem value="auto" className="font-black">High Octane</SelectItem><SelectItem value="quality" className="font-black">Higgsfield Prime</SelectItem></SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="p-10 pt-0 flex gap-4">
                        <Button variant="ghost" className="font-black text-slate-400 hover:text-slate-900 flex-1 h-16 rounded-2xl" onClick={() => setLaunchDialogOpen(false)}>ABORT MISSION</Button>
                        <Button 
                            className="bg-indigo-600 hover:bg-slate-900 text-white font-black px-12 h-16 rounded-2xl transition-all flex-[2] shadow-3xl shadow-indigo-100"
                            onClick={() => triggerFactoryRunMutation.mutate(launchConfig)}
                            disabled={triggerFactoryRunMutation.isPending || !launchConfig.channelId}
                        >
                            {triggerFactoryRunMutation.isPending ? 'ORCHESTRATING...' : 'EXECUTE MISSION'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={metricsDialogOpen} onOpenChange={setMetricsDialogOpen}>
                <DialogContent className="sm:max-w-[700px] border-0 shadow-3xl p-0 overflow-hidden bg-white rounded-[3rem]">
                    <div className="p-12 text-slate-900 relative">
                         <div className="absolute top-0 right-0 p-12 opacity-5"><Activity className="w-56 h-56 text-indigo-600" /></div>
                         <DialogHeader className="relative z-10 mb-10 border-b border-slate-100 pb-8">
                            <DialogTitle className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4"><ShieldCheck className="w-8 h-8 text-emerald-500" /> 코어 텔레메트리</DialogTitle>
                            <DialogDescription className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">고급 자율 시스템 통합 지표 및 코어 상태 감시 (Live)</DialogDescription>
                         </DialogHeader>
                         <div className="grid grid-cols-2 gap-6 relative z-10">
                             {[
                                 { label: "신뢰 점수", desc: "Integrity", value: "98.5%", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                                 { label: "자율성 상태", desc: "AI Engine", value: "SOVEREIGN v6", icon: BrainCircuit, color: "text-indigo-400", bg: "bg-indigo-500/10" },
                                 { label: "활성 함대", desc: "Nodes", value: ((swarmStatus?.groups?.length || 0) * 4) + " Target Units", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
                                 { label: "인지 흐름", desc: "+15.2% Exp", value: "94.8% ACC", icon: Rocket, color: "text-rose-400", bg: "bg-rose-500/10" },
                             ].map((m, i) => (
                                 <div key={i} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-6 hover:bg-slate-100 transition-all group">
                                     <div className={cn("p-5 rounded-2xl", m.bg)}><m.icon className={cn("w-7 h-7", m.color)} /></div>
                                     <div>
                                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{m.label}</h4>
                                         <p className="text-2xl font-black italic tabular-nums text-slate-900">{m.value}</p>
                                     </div>
                                 </div>
                             ))}
                         </div>
                         <div className="mt-12 flex justify-end"><Button className="bg-indigo-600 hover:bg-slate-900 text-white font-black px-12 h-14 rounded-2xl transition-all shadow-xl" onClick={() => setMetricsDialogOpen(false)}>감시 종료</Button></div>
                    </div>
                </DialogContent>
            </Dialog>


            <Dialog open={!!consoleSessionId} onOpenChange={() => setConsoleSessionId(null)}>
                <DialogContent className="sm:max-w-[800px] p-0 border-0 bg-transparent shadow-none overflow-visible">
                    {consoleSessionId && (
                        <SovereignMissionConsole 
                            sessionId={consoleSessionId!} 
                            onClose={() => setConsoleSessionId(null)} 
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* --- Hive Configuration Dialog --- */}
            <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] border-0 shadow-3xl p-0 overflow-hidden bg-white rounded-[3rem]">
                    <div className="bg-indigo-600 p-10 text-white flex items-center justify-between">
                         <div className="space-y-1">
                            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter">HIVE CONFIG</DialogTitle>
                            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">시스템 코어 및 에이전트 매개변수 설정</p>
                         </div>
                         <Settings className="w-10 h-10 text-white opacity-50" />
                    </div>
                    <div className="p-10 space-y-8">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">AI 추론 엔진 우선순위</Label>
                            <Select defaultValue="higgsfield">
                                <SelectTrigger className="h-14 rounded-2xl border-slate-100 font-bold bg-slate-50">
                                    <SelectValue placeholder="엔진 선택" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    <SelectItem value="higgsfield" className="font-bold">Higgsfield Prime (Ultra High)</SelectItem>
                                    <SelectItem value="gpt4" className="font-bold">GPT-4o Sovereign</SelectItem>
                                    <SelectItem value="claude" className="font-bold">Claude 3.5 Sonnet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">자율 생산 기동성 (Concurrency)</Label>
                            <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-black italic uppercase">Parallel Processing</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">동시 가동 가능한 최대 에이전트 수</p>
                                </div>
                                <Input type="number" defaultValue={8} className="w-24 h-12 rounded-xl text-center font-black text-indigo-600 border-slate-200" />
                            </div>
                        </div>
                    </div>
                    <div className="p-10 pt-0 flex gap-4">
                        <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-black text-slate-400" onClick={() => setSettingsDialogOpen(false)}>취소</Button>
                        <Button className="flex-[2] h-14 rounded-2xl bg-indigo-600 hover:bg-slate-900 text-white font-black shadow-xl shadow-indigo-100" onClick={handleSaveSettings}>설정 저장 및 동기화</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};


export default SwarmHub;

