import { ChannelLaunchpadModal } from '@/components/channel/ChannelLaunchpadModal';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Cpu, Activity, Play, CheckCircle2, AlertCircle, RefreshCcw, 
    Sparkles, ArrowRight, ShieldCheck, Zap, Layers, Users, 
    GitBranch, Server, HardDrive, Radio, Clock, Send, Eye,
    Check, Film, Music, Scissors, Package, ExternalLink, Terminal,
    Tv, BookOpen, Database, Flame, ListOrdered, Shield, Lock, AlertTriangle, PlayCircle, Loader2, DollarSign
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface WorkerState {
    id: string;
    role: string;
    name: string;
    avatarEmoji: string;
    status: 'idle' | 'working' | 'review' | 'error';
    task: string;
    model: string;
    loadPct: number;
    processedToday: number;
    avgLatencyMs: number;
    recentLog: string;
}


interface ShadowJobItem {
    job_id: string;
    channel_id: number;
    channel_name: string;
    topic: string;
    status: string;
    progress_pct: number;
    created_at: string;
    completed_at?: string;
    outputs?: Record<string, string>;
    error?: string;
}

interface ChannelItem {
    id: number;
    name?: string;
    title?: string;
    handle?: string;
}

const INITIAL_WORKERS: WorkerState[] = [
    { 
        id: 'w1', 
        role: '트렌드 스카우터', 
        name: 'Scout-Alpha', 
        avatarEmoji: '📡',
        status: 'working', 
        task: '글로벌 틱톡/릴스 떡상 DNA 실시간 스캐닝 중', 
        model: 'OmniRoute viraloop1', 
        loadPct: 68, 
        processedToday: 142, 
        avgLatencyMs: 420,
        recentLog: '유튜브 쇼츠 급상승 랭킹 #1~#20 떡상 패턴 매핑 완료'
    },
    { 
        id: 'w2', 
        role: '대본 기획자', 
        name: 'Writer-Pro', 
        avatarEmoji: '✍️',
        status: 'working', 
        task: '상황별 3대 분기 매트릭스 & 0.8초 쨉쨉이 코멘터리 연출 각색', 
        model: 'OmniRoute viraloop1', 
        loadPct: 84, 
        processedToday: 89, 
        avgLatencyMs: 850,
        recentLog: '첫 3초 충격 질문형 후킹 카피 3종 및 쨉쨉이 단어 배치 완료'
    },
    { 
        id: 'w3', 
        role: '바이럴 비평가', 
        name: 'Critic-85', 
        avatarEmoji: '🧐',
        status: 'idle', 
        task: '대본 품질 85점 게이트키퍼 검수 대기', 
        model: 'OmniRoute viraloop1', 
        loadPct: 15, 
        processedToday: 89, 
        avgLatencyMs: 310,
        recentLog: '직전 검수 점수 92.4점 (통과 및 락 해제)'
    },
    { 
        id: 'w4', 
        role: '사운드 디렉터', 
        name: 'Voice-Sync', 
        avatarEmoji: '🎙️',
        status: 'working', 
        task: 'ElevenLabs / Typecast / Supertonic 성우 합성 및 쨉쨉이 효과음 싱크', 
        model: 'ElevenLabs / Typecast / Supertonic', 
        loadPct: 72, 
        processedToday: 64, 
        avgLatencyMs: 680,
        recentLog: '나레이션 MP3 스트리밍(1.08x, +18%) 버퍼 및 BGM -18dB 덕킹 완료'
    },
    { 
        id: 'w5', 
        role: '비주얼 디렉터', 
        name: 'Flow-Artist', 
        avatarEmoji: '🎨',
        status: 'idle', 
        task: 'Google Flow AI 시네마틱 렌더 파이프라인 대기', 
        model: 'Google Flow AI v2.0', 
        loadPct: 10, 
        processedToday: 38, 
        avgLatencyMs: 3200,
        recentLog: 'Flow 세션 토큰 유효성 검증 완료 (Ready)'
    },
    { 
        id: 'w6', 
        role: '스마트 컷터', 
        name: 'Smart-Cutter', 
        avatarEmoji: '✂️',
        status: 'idle', 
        task: '무음 구간(-35dB) 초정밀 절삭 및 씬 분할 대기', 
        model: 'FFmpeg Native Core', 
        loadPct: 5, 
        processedToday: 51, 
        avgLatencyMs: 190,
        recentLog: '무음 절삭 필터 28초 컷팅 완료 (0.05초 단위 정밀도)'
    },
    { 
        id: 'w7', 
        role: '캡컷 조립기', 
        name: 'CapCut-Assembler', 
        avatarEmoji: '📦',
        status: 'idle', 
        task: 'CapCut 프로젝트 No-ZIP 멀티트랙 조립 대기', 
        model: 'CapCut Native Bridge', 
        loadPct: 20, 
        processedToday: 47, 
        avgLatencyMs: 140,
        recentLog: 'draft_content.json 로컬 타임라인 패키징 완료'
    },
    { 
        id: 'w8', 
        role: '배포 관리자', 
        name: 'Queue-Deployer', 
        avatarEmoji: '🚀',
        status: 'idle', 
        task: 'WorkQueue 백그라운드 렌더 및 예약 발행 감시', 
        model: 'WorkQueue Engine v2', 
        loadPct: 30, 
        processedToday: 45, 
        avgLatencyMs: 80,
        recentLog: '대기열 0건 잔여 (모든 예약 작업 정상 송출 완료)'
    }
];

export const StudioWarRoom: React.FC = () => {
    const navigate = useNavigate();
    const [workers, setWorkers] = useState<WorkerState[]>(INITIAL_WORKERS);
    const [selectedWorker, setSelectedWorker] = useState<WorkerState | null>(null);
    const [isRunningPreset, setIsRunningPreset] = useState(false);
    const [launchModalPreset, setLaunchModalPreset] = useState<any | null>(null);
    const [isLaunchpadOpen, setIsLaunchpadOpen] = useState(false);
    const [launchTopic, setLaunchTopic] = useState('');
    const [shadowJobs, setShadowJobs] = useState<ShadowJobItem[]>([]);

    const queryClient = useQueryClient();

    // [Tier 1 & Tier 2 Real-time Queries]
    const { data: directors = [], refetch: refetchDirectors } = useQuery({
        queryKey: ['channel_directors_status'],
        queryFn: async () => {
            const res = await api.get('/brand-channels/directors/status');
            return res.data || [];
        },
        refetchInterval: 4000
    });

    const { data: arbiterStatus = {}, refetch: refetchArbiter } = useQuery({
        queryKey: ['global_arbiter_status'],
        queryFn: async () => {
            const res = await api.get('/brand-channels/directors/arbiter-status');
            return res.data || {};
        },
        refetchInterval: 4000
    });

    const toggleKillSwitchMutation = useMutation({
        mutationFn: async (active: boolean) => {
            const res = await api.post(`/brand-channels/directors/kill-switch?active=${active}`);
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.kill_switch_active ? "🚨 글로벌 비상 정지(Kill-Switch)가 발동되었습니다." : "🟢 비상 정지가 해제되고 정상 가동 상태로 복귀했습니다.");
            refetchArbiter();
            refetchDirectors();
        }
    });

    const [triggeringChannelId, setTriggeringChannelId] = useState<number | null>(null);
    const triggerDirectorCycleMutation = useMutation({
        mutationFn: async ({ channelId, modality }: { channelId: number; modality: string }) => {
            setTriggeringChannelId(channelId);
            const res = await api.post(`/brand-channels/${channelId}/director/cycle?modality=${modality}`);
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(`[${data.channel || '채널'}] 자율 생산 사이클이 가동되었습니다!`);
            refetchDirectors();
            setTriggeringChannelId(null);
        },
        onError: (err: any) => {
            toast.error(`가동 실패: ${err.message || '오류 발생'}`);
            setTriggeringChannelId(null);
        }
    });


    const loadShadowJobs = async () => {
        try {
            const res = await api.get('/agent/batch-produce/jobs');
            if (res.data && Array.isArray(res.data)) {
                setShadowJobs(res.data.slice(0, 8));
            }
        } catch (e) {
            // silent
        }
    };

    useEffect(() => {
        loadShadowJobs();
        const interval = setInterval(loadShadowJobs, 4000);
        return () => clearInterval(interval);
    }, []);


    // Channel Integration
    const [channels, setChannels] = useState<ChannelItem[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState<number>(1);
    const [channelSkillsCount, setChannelSkillsCount] = useState<number>(8);
    const [recalledWisdom, setRecalledWisdom] = useState<any[]>([]);

    // Load Channels & Skills
    useEffect(() => {
        const loadChannelsData = async () => {
            try {
                const res = await api.get('/channels/');
                if (res.data && Array.isArray(res.data)) {
                    setChannels(res.data);
                    if (res.data.length > 0) setSelectedChannelId(res.data[0].id);
                }
            } catch (err) {
                console.warn("워룸 채널 목록 조회 실패:", err);
            }
        };
        loadChannelsData();
    }, []);

    // Load Channel Wisdom Ticker
    useEffect(() => {
        if (!selectedChannelId) return;
        const loadWisdom = async () => {
            try {
                const res = await api.get(`/agent/memory/channel/${selectedChannelId}/search?q=쨉쨉이`);
                if (res.data && Array.isArray(res.data)) {
                    setRecalledWisdom(res.data);
                }
            } catch (err) {
                console.warn("FTS wisdom recall error:", err);
            }

            try {
                const skRes = await api.get(`/agent/skills/channel/${selectedChannelId}`);
                if (skRes.data && Array.isArray(skRes.data)) {
                    setChannelSkillsCount(skRes.data.length);
                }
            } catch (skErr) {
                console.warn("Channel skills count error:", skErr);
            }
        };
        loadWisdom();
    }, [selectedChannelId]);

    // Load workers from agent roster backend
    useEffect(() => {
        const loadRoster = async () => {
            try {
                const res = await api.get('/system/agent-roster');
                if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                    setWorkers(res.data.map((r: any, i: number) => ({
                        id: r.id || `w${i+1}`,
                        role: r.role,
                        name: r.name,
                        avatarEmoji: r.avatarEmoji || '🤖',
                        status: i === 0 ? 'working' : 'idle',
                        task: r.desc || '대기 중',
                        model: r.model || 'OmniRoute viraloop1',
                        loadPct: 15,
                        processedToday: r.stats?.totalJobs || 0,
                        avgLatencyMs: r.stats?.avgLatencyMs || 300,
                        recentLog: r.systemPrompt ? r.systemPrompt.slice(0, 60) + '...' : '정상 대기 중'
                    })));
                }
            } catch (err) {
                console.warn("Could not load roster in War Room:", err);
            }
        };
        loadRoster();
    }, []);

    // 1. Real-time System Telemetry Metrics
    const { data: metricsData } = useQuery({
        queryKey: ['system_maintenance_metrics_warroom'],
        queryFn: async () => {
            const res = await api.get('/maintenance/metrics');
            return res.data;
        },
        refetchInterval: 3000
    });

    // 2. Real-time Dashboard Stats
    const { data: dashboardStats } = useQuery({
        queryKey: ['dashboard_stats_warroom'],
        queryFn: async () => {
            const res = await api.get('/dashboard/stats');
            return res.data;
        },
        refetchInterval: 5000
    });

    // 3. Real-time FSD Mission Status
    const { data: fsdStatus } = useQuery({
        queryKey: ['fsd_mission_status_warroom'],
        queryFn: async () => {
            const res = await api.get('/fsd-mission/status');
            return res.data;
        },
        refetchInterval: 3000
    });

    // 4. Real-time Work Queue Stats
    const { data: queueStats } = useQuery({
        queryKey: ['work_queue_stats_warroom'],
        queryFn: async () => {
            const res = await api.get('/work-queue/stats');
            return res.data;
        },
        refetchInterval: 5000
    });

    // Telemetry ticker state
    const [logTicker, setLogTicker] = useState<Array<{ time: string; worker: string; msg: string; type: string }>>([
        { time: '10:52:10', worker: 'Scout-Alpha', msg: '급상승 쇼츠 바이럴 DNA 4종 캡처 성공', type: 'scout' },
        { time: '10:52:14', worker: 'Writer-Pro', msg: '9-Wave 바이럴 각색 및 0.8초 쨉쨉이 단어 배치 완료', type: 'script' },
        { time: '10:52:18', worker: 'Critic-85', msg: '대본 퀄리티 89점 통과 (완청률 최적화 승인)', type: 'critic' },
        { time: '10:52:22', worker: 'Voice-Sync', msg: 'ElevenLabs/Typecast 고품질 보이스 렌더 완료 (28.4초)', type: 'audio' },
        { time: '10:52:27', worker: 'CapCut-Assembler', msg: 'CapCut No-ZIP 프로젝트 조립 성공 (타임라인 즉시 오픈 가능)', type: 'capcut' }
    ]);

    // Computed real telemetry values
    const isFsdActive = Boolean(fsdStatus?.active);
    const hostCpu = typeof metricsData?.cpu_percent === 'number' ? metricsData.cpu_percent : 0;
    const hostRam = typeof metricsData?.memory?.percent === 'number' ? metricsData.memory.percent : 0;
    const todayVideos = dashboardStats?.downloaded_today ?? 0;
    const totalVideos = dashboardStats?.total_videos ?? 0;
    const queuedTasks = queueStats?.queued ?? 0;

    const activeWorkersCount = isFsdActive
        ? Math.min(8, Math.max(3, fsdStatus?.active_workers?.length || 4))
        : queuedTasks > 0
        ? Math.min(8, 2 + queuedTasks)
        : 1;

    // Dynamically update worker telemetry
    useEffect(() => {
        if (!metricsData) return;
        setWorkers(prev => prev.map((w, i) => {
            const baseLoad = hostCpu > 0 ? hostCpu : (hostRam * 0.5);
            const loadOffset = ((i * 7 + 3) % 15) - 7;
            const computedLoad = Math.min(98, Math.max(8, Math.round(baseLoad + loadOffset)));
            const isWorking = isFsdActive ? i < activeWorkersCount : (queuedTasks > 0 ? i < activeWorkersCount : i === 0);
            return {
                ...w,
                loadPct: computedLoad,
                status: isWorking ? 'working' : 'idle'
            };
        }));
    }, [metricsData, isFsdActive, activeWorkersCount, queuedTasks, hostCpu, hostRam]);

    const handleLaunchPipeline = async () => {
        if (!launchModalPreset) return;
        setIsRunningPreset(true);
        const preset = launchModalPreset;
        const rawInput = launchTopic.trim();
        const topics = rawInput 
            ? rawInput.split('\n').map(t => t.trim()).filter(Boolean)
            : ['최근 떡상 바이럴 쇼츠 기획'];

        const targetChannel = channels.find(c => c.id === selectedChannelId);
        const channelName = targetChannel?.title || targetChannel?.name || `채널 ${selectedChannelId}호기`;

        toast.info(`[CH #${selectedChannelId}] '${preset.name}' Shadow Worker ${topics.length}개 과업 출격을 시작합니다.`);

        const nowStr = new Date().toLocaleTimeString();
        setLogTicker(prev => [
            { time: nowStr, worker: '루피 총감독', msg: `[CH #${selectedChannelId}] Shadow Worker 가상 분신 풀 가동 (${topics.length}개 주제 병렬 격리 투입)`, type: 'director' },
            ...prev.slice(0, 15)
        ]);

        try {
            // 1. Dispatch to Shadow Worker Pool Batch API (Zero Context Bleed)
            await api.post('/agent/batch-produce', {
                channel_id: selectedChannelId,
                channel_name: channelName,
                topics: topics
            });

            // 2. Also trigger legacy pipeline endpoint if single
            if (topics.length === 1) {
                try {
                    await api.post(`/pipelines/${preset.id}/run`, { 
                        topic: topics[0], 
                        channel_id: selectedChannelId 
                    });
                } catch (e) {}
            }

            toast.success(`[CH #${selectedChannelId}] Shadow Worker 분신 ${topics.length}개 스레드가 즉시 스폰되어 격리 제작에 착수했습니다!`);
            setLaunchModalPreset(null);
            setLaunchTopic('');
            loadShadowJobs();
        } catch (e: any) {
            toast.error(`가동 실패: ${e.message}`);
        } finally {
            setIsRunningPreset(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-300">
            {/* 1. Global Studio Telemetry HUD Bar */}
            <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border/80 text-foreground shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 shrink-0">
                        <Cpu className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                                [Tier 1] 루피 총사령탑 & [Tier 2] 채널 디렉터 워룸 (Sovereign War Room)
                            </h1>
                            <Badge variant="outline" className="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-500 border-indigo-500/30">
                                3-Tier Sovereign Topology
                            </Badge>
                            {isFsdActive ? (
                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold gap-1 px-2 py-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    자율 주행 가동 중 ({fsdStatus?.progress || 0}%)
                                </Badge>
                            ) : (
                                <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px] font-bold gap-1 px-2 py-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    무인 프로덕션 상시 대기 (대기큐: {queuedTasks}건)
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            루피 총사령탑(Tier 1)이 전역 GPU 세마포어와 API 예산을 중재하고, 채널 디렉터(Tier 2)들이 7단계 상태 머신으로 100% 무인 자율 양산합니다.
                        </p>
                    </div>
                </div>

                {/* Right Channel Switcher */}
                <div className="flex items-center gap-2 bg-muted/40 border border-border px-3.5 py-2 rounded-2xl shrink-0">
                    <Tv className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-[11px] font-bold text-muted-foreground shrink-0">생산 대상 채널:</span>
                    <select
                        value={selectedChannelId}
                        onChange={(e) => setSelectedChannelId(Number(e.target.value))}
                        className="bg-transparent text-xs font-black text-foreground focus:outline-none cursor-pointer"
                    >
                        {channels.map((ch) => (
                            <option key={ch.id} value={ch.id} className="bg-card text-foreground">
                                [CH #{ch.id}] {ch.name || ch.title || `채널 ${ch.id}`}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 1.5 Hermes FTS5 Live Recall Ticker Bar */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/20 via-indigo-950/20 to-blue-950/20 border border-purple-500/30 flex items-center justify-between gap-3 text-xs overflow-hidden">
                <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        Hermes FTS5 회상
                    </Badge>
                    <span className="text-[11px] font-bold text-muted-foreground">
                        [CH #{selectedChannelId} 떡상 공식]:
                    </span>
                </div>

                <div className="flex-1 truncate font-mono text-[11px] text-foreground flex items-center gap-3">
                    {recalledWisdom.length > 0 ? (
                        <>
                            <span className="text-amber-400 font-bold truncate">
                                ⚡ "{recalledWisdom[0].winning_hook || recalledWisdom[0].topic}"
                            </span>
                            <span className="text-muted-foreground shrink-0">•</span>
                            <span className="text-indigo-400 truncate">
                                쨉쨉이: {recalledWisdom[0].jjap_pattern || '0.8초 템포 싱크'}
                            </span>
                            {recalledWisdom[0].score && (
                                <Badge variant="outline" className="text-[9px] font-mono text-emerald-400 border-emerald-500/30 shrink-0">
                                    ★ {recalledWisdom[0].score}점
                                </Badge>
                            )}
                        </>
                    ) : (
                        <span className="text-muted-foreground italic">
                            등록된 떡상 공식이 회상 대기 중입니다.
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[9px] font-mono text-blue-400 border-blue-500/30">
                        스킬팩 {channelSkillsCount}종 바인딩
                    </Badge>
                </div>
            </div>

            
            {/* [Tier 1] 루피 AI 총사령탑 전역 자원 HUD & 인터락 거버넌스 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-blue-500" />
                            GPU 렌더링 세마포어
                        </span>
                        <div className="text-sm sm:text-base font-black text-foreground">
                            {arbiterStatus.gpu_in_use || 0} / {arbiterStatus.gpu_limit || 2} <span className="text-xs text-muted-foreground font-normal">슬롯 사용 중</span>
                        </div>
                    </div>
                    <Badge variant="outline" className={cn(
                        "text-[10px] font-mono font-bold",
                        (arbiterStatus.gpu_in_use || 0) >= (arbiterStatus.gpu_limit || 2) ? "bg-amber-500/10 text-amber-500 border-amber-500/30" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                    )}>
                        {(arbiterStatus.gpu_in_use || 0) >= (arbiterStatus.gpu_limit || 2) ? "슬롯 포화" : "여유"}
                    </Badge>
                </div>

                <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-indigo-500" />
                            보안 격리 & 지터링
                        </span>
                        <div className="text-sm sm:text-base font-black text-foreground">
                            {arbiterStatus.active_network_nodes || 0} <span className="text-xs text-muted-foreground font-normal">개 노드 감시</span>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-500 border-indigo-500/30">
                        5~8초 지터링
                    </Badge>
                </div>

                <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                            일일 API 예산 거버넌스
                        </span>
                        <div className="text-sm sm:text-base font-black text-foreground">
                            ${arbiterStatus.daily_budget_used || 0.0} / <span className="text-xs text-muted-foreground font-normal">${arbiterStatus.daily_budget_limit || 50.0}</span>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                        한도 보호 중
                    </Badge>
                </div>

                <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1.5">
                            <AlertTriangle className={cn("w-3.5 h-3.5", arbiterStatus.kill_switch_active ? "text-rose-500" : "text-slate-400")} />
                            글로벌 비상 정지 (Kill-Switch)
                        </span>
                        <div className="text-sm font-black text-foreground">
                            {arbiterStatus.kill_switch_active ? (
                                <span className="text-rose-500 font-bold">비상 동결 발동 중</span>
                            ) : (
                                <span className="text-emerald-500 font-bold">정상 가동 중</span>
                            )}
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant={arbiterStatus.kill_switch_active ? "default" : "destructive"}
                        onClick={() => toggleKillSwitchMutation.mutate(!arbiterStatus.kill_switch_active)}
                        className="text-[10px] font-bold h-7 px-2.5 rounded-xl shadow-xs"
                    >
                        {arbiterStatus.kill_switch_active ? "동결 해제" : "비상 정지"}
                    </Button>
                </div>
            </div>

            {/* [Tier 2] 채널별 중간 관리자 (Channel Directors) 상태 머신 보드 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <h2 className="text-sm font-black text-foreground">
                            Tier 2 채널 디렉터 (Channel Directors) 실시간 상태 머신 보드
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground hidden sm:inline-flex">
                            총 {directors.length}개 주권 채널 자율 순환
                        </Badge>
                        <Button
                            size="sm"
                            onClick={() => setIsLaunchpadOpen(true)}
                            className="h-8 text-xs font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-xs gap-1.5 px-3"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            + 새 채널 디렉터 임명 (레퍼런스 복제)
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {directors.map((d: any) => {
                        const isWorking = d.director_state !== "IDLE" && d.director_state !== "ERROR";
                        return (
                            <div 
                                key={d.id} 
                                className={cn(
                                    "p-3.5 rounded-2xl border bg-card transition-all shadow-2xs space-y-2.5",
                                    isWorking ? "border-indigo-500/50 shadow-indigo-500/5 ring-1 ring-indigo-500/20" : "border-border"
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-mono">
                                                {d.security_badge}
                                            </span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">
                                                {d.assigned_combo_model}
                                            </span>
                                        </div>
                                        <h3 className="text-xs font-black text-foreground truncate mt-1">
                                            {d.title}
                                        </h3>
                                    </div>
                                    
                                    <Badge className={cn(
                                        "text-[9px] font-bold px-2 py-0.5 shrink-0",
                                        d.director_state === "IDLE" && "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20",
                                        d.director_state === "SCOUTING" && "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 animate-pulse",
                                        d.director_state === "SCRIPTING" && "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 animate-pulse",
                                        d.director_state === "EVALUATING" && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse",
                                        d.director_state === "PRODUCING" && "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 animate-pulse",
                                        d.director_state === "PACKAGING" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse",
                                        d.director_state === "DISPATCHING" && "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse"
                                    )}>
                                        {d.director_state}
                                    </Badge>
                                </div>

                                <div className="p-2 rounded-xl bg-muted/30 border border-border/50 text-[10px] space-y-1">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <span>오늘 발행 / 목표:</span>
                                        <span className="font-bold text-foreground font-mono">{d.published_today_count} / {d.daily_target_count} 편</span>
                                    </div>
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <span>디렉터 생존 펄스:</span>
                                        <span className="font-mono text-emerald-500 font-bold">{d.director_heartbeat}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 pt-0.5">
                                    <Button
                                        size="sm"
                                        disabled={triggeringChannelId === d.id || isWorking}
                                        onClick={() => triggerDirectorCycleMutation.mutate({ channelId: d.id, modality: 'keyword_only' })}
                                        className="flex-1 text-[11px] font-bold h-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-2xs gap-1"
                                    >
                                        {triggeringChannelId === d.id ? (
                                            <>
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                가동 중...
                                            </>
                                        ) : (
                                            <>
                                                <PlayCircle className="w-3.5 h-3.5" />
                                                자율 생산 1회
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        type="button"
                                        variant="outline"
                                        onClick={() => navigate('/agent-roster')}
                                        className="h-7 px-2 text-[10px] font-bold border-border/80 text-muted-foreground hover:text-foreground rounded-xl"
                                        title="채널 콤보 모델 및 떡상 DNA 핫스왑 피보팅"
                                    >
                                        피보팅
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 2. 8-Worker Live Desk Matrix (Virtual Production Floor) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-sm font-black text-foreground">8인의 전문 AI 워커 실시간 근무 현황</h2>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => window.dispatchEvent(new CustomEvent('OPEN_LOOPIE'))}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 h-7 hover:bg-blue-500/10 rounded-xl"
                    >
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        루피 지휘 콘솔 열기
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {workers.map(w => (
                        <div
                            key={w.id}
                            onClick={() => setSelectedWorker(w)}
                            className={cn(
                                "p-3.5 rounded-2xl border bg-card hover:bg-muted/30 transition-all cursor-pointer shadow-2xs group relative flex flex-col justify-between gap-2.5",
                                w.status === 'working' ? "border-blue-500/40 shadow-blue-500/5 ring-1 ring-blue-500/20" : "border-border/80"
                            )}
                        >
                            {/* Worker Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl p-1.5 rounded-xl bg-muted/60">{w.avatarEmoji}</span>
                                    <div>
                                        <h3 className="text-xs font-black text-foreground group-hover:text-blue-600 transition-colors">
                                            {w.name}
                                        </h3>
                                        <p className="text-[10px] text-muted-foreground font-semibold">{w.role}</p>
                                    </div>
                                </div>

                                {w.status === 'working' ? (
                                    <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[9px] font-bold gap-1 px-2 py-0.5 animate-pulse">
                                        작업 중
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground bg-muted/30">
                                        대기 완료
                                    </Badge>
                                )}
                            </div>

                            {/* Current Assigned Task */}
                            <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 space-y-1">
                                <span className="text-[9px] text-muted-foreground font-bold block">진행 중인 미션</span>
                                <p className="text-[11px] font-medium text-foreground leading-relaxed line-clamp-2">
                                    {w.task}
                                </p>
                            </div>

                            {/* Telemetry Bar & Model */}
                            <div className="space-y-1 pt-1">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-muted-foreground font-mono truncate max-w-[140px]">{w.model}</span>
                                    <span className="font-bold text-foreground font-mono">{w.loadPct}% 로드</span>
                                </div>
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            w.loadPct > 80 ? "bg-amber-500" : "bg-blue-500"
                                        )} 
                                        style={{ width: `${w.loadPct}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. 6 Standard Production Pipelines Launcher */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <h2 className="text-sm font-black text-foreground">
                            6대 표준 영상 제작 파이프라인 출격 센터 [CH #{selectedChannelId}]
                        </h2>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">원클릭 무인 조립 지원</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {[
                        { id: 'full_generative_ai', name: '5. AI 완전 창작 생성형 (추천)', tag: '야담/판타지/지식', badge: '무인 완결', estTime: '2분 10초', desc: 'Google Flow AI 비주얼 렌더 + 9-Wave 바이럴 대본 + ElevenLabs/Typecast 전문 음성 + CapCut No-ZIP 조립' },
                        { id: 'one_take_hook', name: '1. 원테이크 퀵후킹형', tag: '숏폼 초고속', badge: '고속 양산', estTime: '35초', desc: '해외 바이럴 영상 수집 + 9:16 상하단 블러 캔버스 + 3초 킬러 후킹 0.8초 쨉쨉이 자막 일괄 제작' },
                        { id: 'music_beat_sync', name: '2. 음악 비트싱크형', tag: '감성/패션/여행', badge: '비트 싱크', estTime: '45초', desc: 'FFmpeg -35dB 무음 초정밀 절삭 + 트렌드 BGM 비트 매핑 + 0.8초 고속 쨉쨉이 화면 전환' },
                        { id: 'script_commentary', name: '3. 대본 해설/리캡형', tag: '경제/시사/인문', badge: '스토리텔링', estTime: '1분 15초', desc: 'Whisper 음성 추출 ➔ AI 팩트 각색 ➔ 전문 AI 성우 보이스 ➔ 02_쨉쨉이.srt 자막 싱크 조립' },
                        { id: 'movie_drama_highlight', name: '4. 영화/드라마 컷팅형', tag: '리뷰/하이라이트', badge: '명장면 추출', estTime: '1분 40초', desc: 'SceneCutter 씬 분할로 30~60초 명장면 자동 감지 + 결말포함 리뷰 대본 결합' },
                        { id: 'hybrid_longform', name: '6. 하이브리드 멀티소스 롱폼', tag: '5~15분 롱폼', badge: '장편 제작', estTime: '4분 30초', desc: '수집 컷팅 영상과 Flow AI 클립, 스톡 비디오를 다중 트랙으로 교차 조립' }
                    ].map(pipe => (
                        <div 
                            key={pipe.id}
                            className="p-4 rounded-2xl border border-border/80 bg-card hover:border-blue-500/40 transition-all flex flex-col justify-between gap-3 shadow-2xs"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 font-mono">
                                        {pipe.badge}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                        {pipe.estTime}
                                    </span>
                                </div>
                                <h3 className="text-xs font-black text-foreground">{pipe.name}</h3>
                                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                                    {pipe.desc}
                                </p>
                            </div>

                            <Button 
                                size="sm" 
                                onClick={() => {
                                    setLaunchModalPreset(pipe);
                                    setLaunchTopic('');
                                }}
                                className="w-full text-xs font-bold h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xs gap-1.5"
                            >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                [CH #{selectedChannelId}] 파이프라인 출격
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. Real-Time Event Log Ticker & Artifacts Rail */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left (2 cols): Live Production Log Console */}
                <div className="lg:col-span-2 p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-blue-600" />
                            <h3 className="text-xs font-black text-foreground">워룸 실시간 프로덕션 이벤트 티커</h3>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-500 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            LIVE STREAMING
                        </span>
                    </div>

                    <div className="space-y-1.5 font-mono text-xs max-h-52 overflow-y-auto custom-scrollbar p-2.5 rounded-xl bg-muted/20 border border-border/60">
                        {logTicker.map((log, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] py-0.5">
                                <span className="text-slate-400 shrink-0 font-bold">[{log.time}]</span>
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 font-bold bg-blue-500/10 text-blue-600 border-blue-500/20">
                                    {log.worker}
                                </Badge>
                                <span className="text-foreground/90 truncate">{log.msg}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right (1 col): Recent Artifacts Rail */}
                <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-indigo-600" />
                            <h3 className="text-xs font-black text-foreground">최근 완성 아티팩트</h3>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-bold">CapCut 연동</span>
                    </div>

                    <div className="space-y-2">
                        {dashboardStats?.recent_videos && dashboardStats.recent_videos.length > 0 ? (
                            dashboardStats.recent_videos.slice(0, 3).map((art: any, idx: number) => (
                                <div key={idx} className="p-2.5 rounded-xl bg-muted/20 border border-border/60 flex items-center justify-between">
                                    <div className="min-w-0 pr-2">
                                        <div className="text-[11px] font-bold text-foreground truncate">
                                            {art.title || art.video_id || `영상 #${idx + 1}`}
                                        </div>
                                        <div className="text-[9px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                            <span className="text-emerald-500 font-bold">보관 완료</span>
                                            <span>•</span>
                                            <span className="text-blue-500 font-mono">CapCut No-ZIP</span>
                                        </div>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => {
                                            if (art.url) {
                                                window.open(art.url, '_blank');
                                            } else {
                                                toast.success("CapCut 프로젝트 에셋이 로컬 05_Exports에 보관 중입니다.");
                                            }
                                        }}
                                        className="h-7 text-[10px] font-bold border-border rounded-lg shrink-0"
                                    >
                                        열기
                                    </Button>
                                </div>
                            ))
                        ) : (
                            [
                                { title: '기생충 결말포함 충격 반전 60초', time: '10분 전', tag: 'CapCut No-ZIP', status: '조립 완료' },
                                { title: '128 BPM 테크노 비트싱크 익스트림', time: '35분 전', tag: '비트 매핑', status: '조립 완료' },
                                { title: '조선시대 괴담 호랑이 전설 쇼츠', time: '1시간 전', tag: 'Flow AI 렌더', status: '조립 완료' }
                            ].map((art, idx) => (
                                <div key={idx} className="p-2.5 rounded-xl bg-muted/20 border border-border/60 flex items-center justify-between">
                                    <div className="min-w-0 pr-2">
                                        <div className="text-[11px] font-bold text-foreground truncate">{art.title}</div>
                                        <div className="text-[9px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                            <span>{art.time}</span>
                                            <span>•</span>
                                            <span className="text-blue-500 font-mono">{art.tag}</span>
                                        </div>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => toast.success("CapCut 로컬 프로젝트 경로가 열렸습니다.")}
                                        className="h-7 text-[10px] font-bold border-border rounded-lg shrink-0"
                                    >
                                        열기
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Launch Pipeline Modal */}
            {launchModalPreset && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div>
                                <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                                    <span>{launchModalPreset.name} 일괄 출격</span>
                                    <Badge variant="outline" className="text-[10px] font-mono text-blue-500">
                                        CH #{selectedChannelId}
                                    </Badge>
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    주제를 여러 개 입력하여 한 번에 일괄 대량 생산할 수 있습니다.
                                </p>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setLaunchModalPreset(null)}
                                className="h-7 w-7 p-0 rounded-full"
                            >
                                ✕
                            </Button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="space-y-1">
                                <label className="font-bold text-muted-foreground flex items-center justify-between">
                                    <span>영상 기획 주제 (줄바꿈 시 다중 일괄 생산)</span>
                                    <span className="text-[10px] text-indigo-400 font-mono">대량 생산 지원</span>
                                </label>
                                <textarea
                                    value={launchTopic}
                                    onChange={(e) => setLaunchTopic(e.target.value)}
                                    placeholder="예:
직장인 월급 역전 스토리
조선시대 미제사건의 비밀
100세 인생 건강 비결"
                                    rows={4}
                                    className="w-full p-2.5 bg-muted/40 border border-border text-xs rounded-xl focus:outline-none resize-none leading-relaxed"
                                />
                            </div>

                            {/* Active Tools Badges */}
                            <div className="p-3 rounded-xl bg-muted/30 border border-border/80 space-y-1.5">
                                <span className="text-[10px] font-bold text-muted-foreground block">
                                    실제 가동 도구 파이프라인:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    <Badge variant="outline" className="text-[9px] font-mono bg-amber-500/10 text-amber-500 border-amber-500/30">
                                        ⚡ 02_쨉쨉이.srt
                                    </Badge>
                                    <Badge variant="outline" className="text-[9px] font-mono bg-rose-500/10 text-rose-500 border-rose-500/30">
                                        🎙️ ElevenLabs/Typecast
                                    </Badge>
                                    <Badge variant="outline" className="text-[9px] font-mono bg-cyan-500/10 text-cyan-500 border-cyan-500/30">
                                        🎨 Google Flow AI
                                    </Badge>
                                    <Badge variant="outline" className="text-[9px] font-mono bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                                        ✂️ FFmpeg -35dB 절삭
                                    </Badge>
                                    <Badge variant="outline" className="text-[9px] font-mono bg-indigo-500/10 text-indigo-500 border-indigo-500/30">
                                        📦 CapCut No-ZIP
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setLaunchModalPreset(null)}
                                className="text-xs font-bold rounded-xl h-9"
                            >
                                취소
                            </Button>
                            <Button 
                                size="sm" 
                                disabled={isRunningPreset}
                                onClick={handleLaunchPipeline}
                                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 shadow-xs"
                            >
                                {isRunningPreset ? '일괄 출격 준비 중...' : '원클릭 즉시 가동'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Selected Worker Details Inspector Modal */}
            {selectedWorker && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl p-2 rounded-2xl bg-muted/60">{selectedWorker.avatarEmoji}</span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-black text-foreground">{selectedWorker.name}</h3>
                                        <Badge variant="outline" className="text-[10px] font-bold text-blue-600 bg-blue-500/10 border-blue-500/30">
                                            {selectedWorker.role}
                                        </Badge>
                                    </div>
                                    <span className="text-[11px] font-mono text-muted-foreground">{selectedWorker.model}</span>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setSelectedWorker(null)}
                                className="h-7 w-7 p-0 rounded-full"
                            >
                                ✕
                            </Button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">진행 중인 미션 & 상태</div>
                                <p className="text-xs font-medium text-foreground leading-relaxed">
                                    {selectedWorker.task}
                                </p>
                                <div className="pt-2 flex items-center justify-between text-[11px] border-t border-border/60">
                                    <span className="text-muted-foreground">현재 시스템 로드:</span>
                                    <span className="font-mono font-bold text-blue-500">{selectedWorker.loadPct}%</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="p-3 rounded-xl bg-muted/30 border border-border/70 space-y-0.5">
                                    <span className="text-[10px] text-muted-foreground font-medium">오늘 처리 건수</span>
                                    <div className="text-base font-black font-mono text-foreground">
                                        {selectedWorker.processedToday} <span className="text-xs font-normal text-muted-foreground">건</span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/30 border border-border/70 space-y-0.5">
                                    <span className="text-[10px] text-muted-foreground font-medium">평균 응답 지연</span>
                                    <div className="text-base font-black font-mono text-emerald-500">
                                        {selectedWorker.avgLatencyMs} <span className="text-xs font-normal text-muted-foreground">ms</span>
                                    </div>
                                </div>
                            </div>

                            {selectedWorker.recentLog && (
                                <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                                    <span className="text-[10px] font-bold text-muted-foreground">워커 행동 지침 스니펫:</span>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                                        {selectedWorker.recentLog}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setSelectedWorker(null)}
                                className="text-xs font-bold rounded-xl h-9"
                            >
                                닫기
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={() => {
                                    setSelectedWorker(null);
                                    window.location.href = '#/agent-roster';
                                }}
                                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 shadow-xs"
                            >
                                인력소에서 모델/프롬프트 튜닝
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {/* Channel Launchpad Modal */}
            <ChannelLaunchpadModal
                isOpen={isLaunchpadOpen}
                onClose={() => setIsLaunchpadOpen(false)}
                onSuccess={() => {
                    refetchDirectors();
                }}
            />
        </div>
    );
};

export default StudioWarRoom;
