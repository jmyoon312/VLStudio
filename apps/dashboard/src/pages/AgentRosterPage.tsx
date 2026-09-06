import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, Cpu, ShieldCheck, Sparkles, Save, Check, 
    Sliders, Terminal, MessageSquare, Play, RefreshCcw, 
    Zap, Layers, Radio, Globe, FileText, Send, Lock, Loader2,
    ChevronDown, ChevronUp, AlertCircle, Copy, ArrowUpRight,
    Tv, BookOpen, Scissors, Music, Package, Flame, Eye, Film
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface WorkerProfile {
    id: string;
    layer: 'Layer 1: 전략 인텔리전스' | 'Layer 2: 크리에이티브 대본' | 'Layer 3: 멀티모달 생성' | 'Layer 4: 바이너리 패키징';
    role: string;
    name: string;
    avatarEmoji: string;
    desc: string;
    model: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    systemPrompt: string;
    boundSkills: string[];
    tools: {
        webSearch?: boolean;
        fileRead?: boolean;
        flowAi?: boolean;
        ffmpeg?: boolean;
        capcut?: boolean;
        ttsEngine?: boolean;
        jjapEngine?: boolean;
    };
    stats: {
        successRate: number;
        avgLatencyMs: number;
        totalJobs: number;
    };
    // Special config for Writer-Pro
    writerMatrix?: {
        activeMode: 'video_present' | 'script_present' | 'keyword_only';
        toneStyle: 'b_grade_meme' | 'documentary' | 'casual_talk';
        targetNiche: 'teens_20s' | 'working_3040' | 'senior_wealth';
        cleanShield: boolean;
    };
}

interface ChannelItem {
    id: number;
    name?: string;
    title?: string;
    handle?: string;
}

const INITIAL_ROSTER: WorkerProfile[] = [
    {
        id: 'scout',
        layer: 'Layer 1: 전략 인텔리전스',
        role: '트렌드 스카우터',
        name: 'Scout-Alpha',
        avatarEmoji: '📡',
        desc: 'YouTube Shorts, TikTok, Reels 알고리즘을 분석하여 급상승 바이럴 DNA와 떡상 키워드를 발굴합니다.',
        model: 'OmniRoute viraloop1',
        temperature: 0.6,
        topP: 0.9,
        maxTokens: 2048,
        systemPrompt: '당신은 바이럴루프 전담 트렌드 스카우터입니다. 전 세계 숏폼 랭킹에서 급상승 중인 영상의 후킹 공식, 오디오 템포, 텍스트 배치 패턴을 날카롭게 감지하여 팩트 기반 메타데이터로 보고하세요.',
        boundSkills: ['01_hook_master_7patterns'],
        tools: { webSearch: true, fileRead: true, flowAi: false, ffmpeg: false, capcut: false, ttsEngine: false, jjapEngine: false },
        stats: { successRate: 98.5, avgLatencyMs: 420, totalJobs: 342 }
    },
    {
        id: 'writer',
        layer: 'Layer 2: 크리에이티브 대본',
        role: '대본 기획자',
        name: 'Writer-Pro',
        avatarEmoji: '✍️',
        desc: '상황 인지형 분기 매트릭스(원본영상/대본보유/소재창작)에 따라 0.8초 쨉쨉이 코멘터리 및 9-Wave 스토리텔링을 각색합니다.',
        model: 'OmniRoute viraloop1',
        temperature: 0.8,
        topP: 0.95,
        maxTokens: 4096,
        systemPrompt: '당신은 상위 0.1% 조회수를 기록하는 숏폼 전문 카피라이터입니다. 첫 문장은 반드시 시청자의 스크롤을 멈추는 파격적인 질문이나 충격 사실로 시작하며, 매 5초마다 정보 반전과 0.8초 쨉쨉이 단어를 배치하세요.',
        boundSkills: ['02_script_adaptive_matrix', '03_b_grade_meme_pacing', '08_clean_algorithm_shield'],
        tools: { webSearch: false, fileRead: true, flowAi: false, ffmpeg: false, capcut: false, ttsEngine: false, jjapEngine: true },
        stats: { successRate: 97.2, avgLatencyMs: 820, totalJobs: 284 },
        writerMatrix: {
            activeMode: 'video_present',
            toneStyle: 'b_grade_meme',
            targetNiche: 'working_3040',
            cleanShield: true
        }
    },
    {
        id: 'critic',
        layer: 'Layer 1: 전략 인텔리전스',
        role: '바이럴 비평가',
        name: 'Critic-85',
        avatarEmoji: '🧐',
        desc: '대본의 후킹 강도, 완청률 가능성, 정보 밀도를 채점하여 85점 미달 시 통과를 불허하는 엄격한 게이트키퍼입니다.',
        model: 'OmniRoute viraloop1',
        temperature: 0.2,
        topP: 0.85,
        maxTokens: 2048,
        systemPrompt: '당신은 냉철한 바이럴 영상 퀄리티 심사관입니다. 모호한 표현, 지루한 도입부, 클리셰를 엄격히 지적하고 0~100점 점수를 매기며 85점 미만인 경우 즉시 수정 보완 사항을 출력하세요.',
        boundSkills: ['01_hook_master_7patterns', '08_clean_algorithm_shield'],
        tools: { webSearch: false, fileRead: true, flowAi: false, ffmpeg: false, capcut: false, ttsEngine: false, jjapEngine: false },
        stats: { successRate: 99.1, avgLatencyMs: 310, totalJobs: 284 }
    },
    {
        id: 'voice',
        layer: 'Layer 3: 멀티모달 생성',
        role: '사운드 디렉터',
        name: 'Voice-Sync',
        avatarEmoji: '🎙️',
        desc: 'ElevenLabs, Typecast, Supertonic 로컬 고품질 성우 음성과 0.8초 쨉쨉이 효과음 싱크, BGM 비트를 정밀 매핑합니다.',
        model: 'ElevenLabs / Typecast / Supertonic',
        temperature: 0.5,
        topP: 0.9,
        maxTokens: 1024,
        systemPrompt: '당신은 오디오 사운드 엔지니어입니다. ElevenLabs, Typecast, Supertonic 로컬 음성 엔진을 상황에 맞게 전환하며, 발화 속도(rate: +18%), 음조, 무음 컷 및 BGM 덕킹(-18dB)과 쨉쨉이 효과음 싱크를 정밀 연산하세요.',
        boundSkills: ['04_voice_acting_mastery', '03_b_grade_meme_pacing'],
        tools: { webSearch: false, fileRead: true, flowAi: false, ffmpeg: true, capcut: false, ttsEngine: true, jjapEngine: true },
        stats: { successRate: 99.4, avgLatencyMs: 650, totalJobs: 219 }
    },
    {
        id: 'visual',
        layer: 'Layer 3: 멀티모달 생성',
        role: '비주얼 아트 디렉터',
        name: 'Flow-Artist',
        avatarEmoji: '🎨',
        desc: 'Google Flow AI 비디오 및 이미지 프롬프트를 시네마틱 렌즈 화각과 시드 락 기법으로 인젝션하여 고화질 에셋을 제작합니다.',
        model: 'Google Flow AI v2.0',
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 2048,
        systemPrompt: '당신은 헐리우드급 영상 비주얼 디렉터입니다. 각 씬의 조명, 렌즈 화각(35mm/85mm), 카메라 무빙(Push-in, Pan), 질감(Cinematic 8K, Unreal 5 style)을 정밀한 Flow AI 프롬프트로 변환하세요.',
        boundSkills: ['05_flow_cinematic_prompting'],
        tools: { webSearch: false, fileRead: true, flowAi: true, ffmpeg: false, capcut: false, ttsEngine: false, jjapEngine: false },
        stats: { successRate: 95.8, avgLatencyMs: 3100, totalJobs: 168 }
    },
    {
        id: 'cutter',
        layer: 'Layer 4: 바이너리 패키징',
        role: '스마트 컷터',
        name: 'Smart-Cutter',
        avatarEmoji: '✂️',
        desc: 'FFmpeg Core를 활용해 무음 구간(-35dB)과 지루한 프레임을 0.05초 단위로 절삭하고 9:16 감성 블러 레이아웃을 생성합니다.',
        model: 'FFmpeg Native Core',
        temperature: 0.1,
        topP: 0.7,
        maxTokens: 1024,
        systemPrompt: '당신은 고속 영상 컷편집기입니다. 무음 구간 초정밀 절삭, 블랙 바 감성 블러 처리, 프레임 레이트 30fps 고정을 손실 없이 무인 실행하세요.',
        boundSkills: ['06_smart_cut_dynamics'],
        tools: { webSearch: false, fileRead: true, flowAi: false, ffmpeg: true, capcut: false, ttsEngine: false, jjapEngine: false },
        stats: { successRate: 99.8, avgLatencyMs: 180, totalJobs: 245 }
    },
    {
        id: 'assembler',
        layer: 'Layer 4: 바이너리 패키징',
        role: '캡컷 조립기',
        name: 'CapCut-Assembler',
        avatarEmoji: '📦',
        desc: '비디오 클립, 나레이션 오디오, BGM, 02_쨉쨉이.srt 자막을 캡컷 로컬 프로젝트(draft_content.json)로 No-ZIP 직결 조립합니다.',
        model: 'CapCut Native Bridge',
        temperature: 0.1,
        topP: 0.5,
        maxTokens: 1024,
        systemPrompt: '당신은 캡컷 프로젝트 구조체 완벽 조립 엔진입니다. 마이크로초 단위 타임코드 계산과 트랙 레이어 충돌 없는 draft_content.json 무결성 패키징을 수행하세요.',
        boundSkills: ['07_capcut_typography_bounce'],
        tools: { webSearch: false, fileRead: true, flowAi: false, ffmpeg: false, capcut: true, ttsEngine: false, jjapEngine: true },
        stats: { successRate: 99.9, avgLatencyMs: 130, totalJobs: 245 }
    },
    {
        id: 'deployer',
        layer: 'Layer 4: 바이너리 패키징',
        role: '배포 관리자',
        name: 'Queue-Deployer',
        avatarEmoji: '🚀',
        desc: '완성된 프로젝트를 WorkQueue 백그라운드 렌더러에 적재하고 플랫폼 노란딱지 방지 규격을 검증하여 무인 송출합니다.',
        model: 'WorkQueue Engine v2',
        temperature: 0.2,
        topP: 0.7,
        maxTokens: 1024,
        systemPrompt: '당신은 멀티채널 자동 송출 오케스트레이터입니다. 각 플랫폼별 업로드 규격 검증 및 예약 시간대 최적화 큐 적재를 담당합니다.',
        boundSkills: ['08_clean_algorithm_shield'],
        tools: { webSearch: false, fileRead: true, flowAi: false, ffmpeg: false, capcut: false, ttsEngine: false, jjapEngine: false },
        stats: { successRate: 99.6, avgLatencyMs: 85, totalJobs: 240 }
    }
];

export const AgentRosterPage: React.FC = () => {
    const navigate = useNavigate();
    const [roster, setRoster] = useState<WorkerProfile[]>(INITIAL_ROSTER);
    const [channels, setChannels] = useState<ChannelItem[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState<number>(1);
    const [availableModels, setAvailableModels] = useState<any[]>([]);
    const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);
    const [testingWorker, setTestingWorker] = useState<WorkerProfile | null>(null);
    const [testInput, setTestInput] = useState('');
    const [testResponse, setTestResponse] = useState<string | null>(null);
    const [isTestRunning, setIsTestRunning] = useState(false);
    const [testLatency, setTestLatency] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Filter by layer
    const [selectedLayer, setSelectedLayer] = useState<string>('all');

    useEffect(() => {
        const loadInitialData = async () => {
            // Load Channels
            try {
                const chRes = await api.get('/channels/');
                if (chRes.data && Array.isArray(chRes.data)) {
                    setChannels(chRes.data);
                    if (chRes.data.length > 0) setSelectedChannelId(chRes.data[0].id);
                }
            } catch (err) {
                console.warn("채널 목록 조회 실패:", err);
            }

            // Load Roster
            try {
                const rosterRes = await api.get('/system/agent-roster');
                if (rosterRes.data && Array.isArray(rosterRes.data)) {
                    // Merge with our enriched INITIAL_ROSTER to preserve layer and writerMatrix
                    const merged = INITIAL_ROSTER.map(def => {
                        const found = rosterRes.data.find((r: any) => r.id === def.id);
                        if (!found) return def;
                        return {
                            ...def,
                            ...found,
                            layer: def.layer,
                            boundSkills: def.boundSkills,
                            tools: { ...def.tools, ...(found.tools || {}) },
                            writerMatrix: def.writerMatrix
                        };
                    });
                    setRoster(merged);
                }
            } catch (err) {
                console.warn("로스터 로드 실패, 기본 로스터 사용:", err);
            }

            // Load Available Models
            try {
                const modelsRes = await api.get('/system/available-ai-models');
                if (modelsRes.data?.models) {
                    setAvailableModels(modelsRes.data.models);
                }
            } catch (err) {
                console.warn("모델 목록 로드 실패:", err);
            }
        };
        loadInitialData();
    }, []);

    const handleSaveRoster = async () => {
        setIsSaving(true);
        try {
            await api.post('/system/agent-roster/save', { roster });
            toast.success("8인 전문 워커 에이전트 인력소 설정이 백엔드에 안전하게 저장되었습니다.");
        } catch (err: any) {
            localStorage.setItem('vlstudio_agent_roster', JSON.stringify(roster));
            toast.success("에이전트 인력소 설정이 로컬 스토리지에 동기화 저장되었습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRunTest = async () => {
        if (!testingWorker || !testInput.trim()) return;
        setIsTestRunning(true);
        setTestResponse(null);
        setTestLatency(null);

        try {
            const res = await api.post('/system/agent-roster/test', {
                worker_id: testingWorker.id,
                prompt: testInput,
                custom_system_prompt: testingWorker.systemPrompt,
                model: testingWorker.model,
                temperature: testingWorker.temperature
            });

            if (res.data?.success) {
                setTestLatency(res.data.latency_ms);
                setTestResponse(res.data.response || '워커가 작업을 성공적으로 완료했습니다.');
                toast.success(`${testingWorker.name} 테스트 완료 (${res.data.latency_ms}ms)`);
            } else {
                setTestLatency(res.data?.latency_ms || 0);
                setTestResponse(`[실행 오류]\n${res.data?.error || '알 수 없는 오류가 발생했습니다.'}`);
                toast.error("워커 테스트 중 오류가 발생했습니다.");
            }
        } catch (err: any) {
            setTestResponse(`[네트워크 / 서버 통신 오류]\n${err.response?.data?.detail || err.message}`);
            toast.error("워커 통신 실패");
        } finally {
            setIsTestRunning(false);
        }
    };

    // Filtered roster by layer
    const filteredRoster = useMemo(() => {
        if (selectedLayer === 'all') return roster;
        return roster.filter(w => w.layer === selectedLayer);
    }, [roster, selectedLayer]);

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-300">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shrink-0 shadow-lg shadow-blue-500/20">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                                에이전트 인력소 & 4대 생산 레이어 (Agent Roster)
                            </h1>
                            <Badge variant="outline" className="text-[10px] font-bold bg-blue-500/10 text-blue-600 border-blue-500/20 font-mono">
                                8인 전문 워커 완비
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 border-emerald-500/20">
                                OmniRoute viraloop1 SSOT
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            전략 ➔ 대본(상황분기) ➔ 멀티모달 ➔ 컴파일 4대 레이어별 워커에게 채널 전용 스킬팩과 원자적 실행 도구를 바인딩합니다.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Target Channel Selector */}
                    <div className="flex items-center gap-2 bg-muted/40 border border-border px-3 py-1.5 rounded-2xl">
                        <Tv className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="text-[11px] font-bold text-muted-foreground shrink-0">스킬 바인딩 채널:</span>
                        <select
                            value={selectedChannelId}
                            onChange={(e) => setSelectedChannelId(Number(e.target.value))}
                            className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                        >
                            {channels.map((ch) => (
                                <option key={ch.id} value={ch.id} className="bg-card text-foreground">
                                    [CH #{ch.id}] {ch.name || ch.title || `채널 ${ch.id}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Button 
                        disabled={isSaving}
                        onClick={handleSaveRoster} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5 shrink-0"
                    >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        전체 인력소 설정 저장
                    </Button>
                </div>
            </div>

            {/* Layer Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                    { id: 'all', label: '전체 8인 워커 보기' },
                    { id: 'Layer 1: 전략 인텔리전스', label: 'Layer 1: 전략 인텔리전스' },
                    { id: 'Layer 2: 크리에이티브 대본', label: 'Layer 2: 크리에이티브 대본' },
                    { id: 'Layer 3: 멀티모달 생성', label: 'Layer 3: 멀티모달 생성' },
                    { id: 'Layer 4: 바이너리 패키징', label: 'Layer 4: 바이너리 패키징' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSelectedLayer(tab.id)}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                            selectedLayer === tab.id
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/60"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Worker Detail Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredRoster.map((worker) => {
                    const isPromptExpanded = expandedPromptId === worker.id;
                    const isWriter = worker.id === 'writer';

                    return (
                        <Card key={worker.id} className="border-border bg-card shadow-xs rounded-3xl overflow-hidden hover:border-blue-500/40 transition-all flex flex-col justify-between">
                            <div>
                                <CardHeader className="p-4 bg-muted/30 border-b border-border/80">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl p-2 rounded-2xl bg-card border border-border shadow-2xs">
                                                {worker.avatarEmoji}
                                            </span>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <CardTitle className="text-sm font-black text-foreground">
                                                        {worker.name}
                                                    </CardTitle>
                                                    <Badge variant="secondary" className="text-[10px] font-bold">
                                                        {worker.role}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-[9px] font-mono text-blue-500 bg-blue-500/10 border-blue-500/20">
                                                        {worker.layer.split(':')[0]}
                                                    </Badge>
                                                </div>
                                                <CardDescription className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                                    {worker.desc}
                                                </CardDescription>
                                            </div>
                                        </div>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setTestingWorker(worker);
                                                setTestInput('');
                                                setTestResponse(null);
                                                setTestLatency(null);
                                            }}
                                            className="h-8 text-xs font-bold border-border bg-card hover:bg-muted text-blue-600 dark:text-blue-400 rounded-xl gap-1 shrink-0"
                                        >
                                            <Play className="w-3 h-3 fill-current" />
                                            단독 테스트
                                        </Button>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-4 space-y-4 text-xs">
                                    {/* Bound Channel Skills Badges */}
                                    <div className="p-2.5 rounded-2xl bg-muted/20 border border-border/70 space-y-1.5">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                                            <span className="flex items-center gap-1 text-indigo-400 font-mono">
                                                <BookOpen className="w-3 h-3" />
                                                [CH #{selectedChannelId}] 연동 스킬 플레이북
                                            </span>
                                            <span className="font-mono text-[9px]">자동 주입</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {worker.boundSkills.map((sk, skIdx) => (
                                                <Badge 
                                                    key={skIdx} 
                                                    variant="outline" 
                                                    className="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                                                >
                                                    #{sk}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {/* SPECIAL: Situation-Aware Script Branch Matrix for Writer-Pro */}
                                    {isWriter && (
                                        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 border border-indigo-500/30 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="text-[11px] font-black text-indigo-400 flex items-center gap-1.5">
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                    대본 작가 상황 인지형 3대 분기 매트릭스
                                                </div>
                                                <Badge variant="outline" className="text-[9px] font-bold text-amber-400 border-amber-400/30 bg-amber-400/10">
                                                    실시간 대응
                                                </Badge>
                                            </div>

                                            {/* Mode Selector */}
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {[
                                                    { id: 'video_present', label: '1. 원본 영상 보유', desc: '0.8초 쨉쨉이 코멘터리 연출' },
                                                    { id: 'script_present', label: '2. 대본 텍스트 보유', desc: '숏폼 호흡 최적화 경량화/윤문' },
                                                    { id: 'keyword_only', label: '3. 소재/키워드만', desc: '9-Wave 감정 파도 전면 창작' }
                                                ].map(m => (
                                                    <button
                                                        key={m.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setRoster(prev => prev.map(w => {
                                                                if (w.id !== 'writer') return w;
                                                                return {
                                                                    ...w,
                                                                    writerMatrix: {
                                                                        ...w.writerMatrix!,
                                                                        activeMode: m.id as any
                                                                    }
                                                                };
                                                            }));
                                                        }}
                                                        className={cn(
                                                            "p-2 rounded-xl border text-left transition-all cursor-pointer",
                                                            worker.writerMatrix?.activeMode === m.id
                                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                                                : "bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        <div className="text-[10px] font-bold truncate">{m.label}</div>
                                                        <div className="text-[9px] opacity-80 mt-0.5 line-clamp-1">{m.desc}</div>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Tone & Niche & Shield Guardrails */}
                                            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/50 text-[10px]">
                                                <div>
                                                    <span className="text-muted-foreground font-bold block mb-1">스타일 & 톤</span>
                                                    <select
                                                        value={worker.writerMatrix?.toneStyle}
                                                        onChange={(e) => {
                                                            const val = e.target.value as any;
                                                            setRoster(prev => prev.map(w => w.id === 'writer' ? { ...w, writerMatrix: { ...w.writerMatrix!, toneStyle: val } } : w));
                                                        }}
                                                        className="w-full h-7 px-1.5 rounded-lg bg-card border border-border text-[10px] font-bold text-foreground focus:outline-none"
                                                    >
                                                        <option value="b_grade_meme">B급 감성 & 밈</option>
                                                        <option value="documentary">진지한 다큐/지식</option>
                                                        <option value="casual_talk">친근한 구어체</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <span className="text-muted-foreground font-bold block mb-1">타겟 대상 어휘</span>
                                                    <select
                                                        value={worker.writerMatrix?.targetNiche}
                                                        onChange={(e) => {
                                                            const val = e.target.value as any;
                                                            setRoster(prev => prev.map(w => w.id === 'writer' ? { ...w, writerMatrix: { ...w.writerMatrix!, targetNiche: val } } : w));
                                                        }}
                                                        className="w-full h-7 px-1.5 rounded-lg bg-card border border-border text-[10px] font-bold text-foreground focus:outline-none"
                                                    >
                                                        <option value="working_3040">3040 직장인/재테크</option>
                                                        <option value="teens_20s">1020 트렌드/쇼츠</option>
                                                        <option value="senior_wealth">5060 건강/인생역전</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <span className="text-muted-foreground font-bold block mb-1">노란딱지 가드레일</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const curr = worker.writerMatrix?.cleanShield;
                                                            setRoster(prev => prev.map(w => w.id === 'writer' ? { ...w, writerMatrix: { ...w.writerMatrix!, cleanShield: !curr } } : w));
                                                        }}
                                                        className={cn(
                                                            "w-full h-7 px-2 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all",
                                                            worker.writerMatrix?.cleanShield
                                                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                                                : "bg-muted/40 text-muted-foreground border-border"
                                                        )}
                                                    >
                                                        <ShieldCheck className="w-3 h-3" />
                                                        <span>{worker.writerMatrix?.cleanShield ? '클린 쉴드 ON' : '쉴드 OFF'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Model Selection & Temp */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-muted-foreground">
                                                <span>인공지능 모델 (SSOT)</span>
                                                <span className="text-[9px] text-blue-500">단일 진실</span>
                                            </div>
                                            {availableModels.length > 0 ? (
                                                <select
                                                    value={worker.model}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setRoster(prev => prev.map(w => w.id === worker.id ? { ...w, model: val } : w));
                                                    }}
                                                    className="w-full h-8 px-2 text-xs font-mono font-bold bg-muted/40 border border-border rounded-xl text-foreground focus:outline-none"
                                                >
                                                    {availableModels.map((m: any) => (
                                                        <option key={m.id} value={m.id} className="bg-card text-foreground">
                                                            [{m.category}] {m.name}
                                                        </option>
                                                    ))}
                                                    {!availableModels.some((m: any) => m.id === worker.model) && (
                                                        <option value={worker.model} className="bg-card text-foreground">
                                                            {worker.model}
                                                        </option>
                                                    )}
                                                </select>
                                            ) : (
                                                <Input
                                                    value={worker.model}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setRoster(prev => prev.map(w => w.id === worker.id ? { ...w, model: val } : w));
                                                    }}
                                                    className="h-8 text-xs font-mono font-bold bg-muted/40 rounded-xl"
                                                />
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-muted-foreground">
                                                <span>창의성 온도 (Temp)</span>
                                                <span className="text-blue-600 font-bold font-mono">{worker.temperature}</span>
                                            </div>
                                            <div className="pt-2">
                                                <Slider
                                                    value={[worker.temperature * 100]}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    onValueChange={(val) => {
                                                        const temp = Math.round(val[0]) / 100;
                                                        setRoster(prev => prev.map(w => w.id === worker.id ? { ...w, temperature: temp } : w));
                                                    }}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Real Tool Execution Badges */}
                                    <div className="space-y-1.5 pt-1">
                                        <span className="text-[10px] font-mono font-bold text-muted-foreground block">
                                            실제 연동 실행 도구 (Real Tools Privileges)
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                { key: 'jjapEngine', label: '02_쨉쨉이.srt', icon: Zap, color: 'text-amber-500' },
                                                { key: 'ttsEngine', label: 'ElevenLabs/Typecast/Supertonic', icon: Music, color: 'text-rose-500' },
                                                { key: 'flowAi', label: 'Google Flow AI', icon: Sparkles, color: 'text-cyan-500' },
                                                { key: 'ffmpeg', label: 'FFmpeg -35dB 절삭', icon: Scissors, color: 'text-emerald-500' },
                                                { key: 'capcut', label: 'CapCut No-ZIP', icon: Package, color: 'text-indigo-500' },
                                                { key: 'fileRead', label: '파일 I/O', icon: FileText, color: 'text-blue-500' }
                                            ].map(t => {
                                                const active = (worker.tools as any)[t.key];
                                                const Icon = t.icon;
                                                return (
                                                    <button
                                                        key={t.key}
                                                        type="button"
                                                        onClick={() => {
                                                            setRoster(prev => prev.map(w => {
                                                                if (w.id !== worker.id) return w;
                                                                return {
                                                                    ...w,
                                                                    tools: {
                                                                        ...w.tools,
                                                                        [t.key]: !active
                                                                    }
                                                                };
                                                            }));
                                                        }}
                                                        className={cn(
                                                            "text-[10px] font-bold px-2 py-1 rounded-xl border flex items-center gap-1 transition-all cursor-pointer",
                                                            active 
                                                                ? "bg-blue-500/10 border-blue-500/40 text-foreground" 
                                                                : "bg-muted/20 border-border text-muted-foreground opacity-50"
                                                        )}
                                                    >
                                                        <Icon className={cn("w-3 h-3", active ? t.color : "text-muted-foreground")} />
                                                        <span>{t.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Expandable System Persona */}
                                    <div className="pt-2 border-t border-border/60">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedPromptId(isPromptExpanded ? null : worker.id)}
                                            className="w-full flex items-center justify-between text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1"
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <Terminal className="w-3.5 h-3.5 text-blue-500" />
                                                워커 단위 업무 SOP & 시스템 페르소나
                                            </span>
                                            {isPromptExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                        </button>

                                        {isPromptExpanded && (
                                            <div className="pt-2 space-y-2">
                                                <textarea
                                                    value={worker.systemPrompt}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setRoster(prev => prev.map(w => w.id === worker.id ? { ...w, systemPrompt: val } : w));
                                                    }}
                                                    rows={4}
                                                    className="w-full p-2.5 bg-muted/40 border border-border/80 rounded-xl text-[11px] font-mono leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div className="pt-2 border-t border-border/40 grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                                        <div className="p-1.5 rounded-xl bg-muted/30 border border-border/60">
                                            <span className="text-muted-foreground block text-[9px]">성공률</span>
                                            <span className="font-bold text-emerald-500">{worker.stats.successRate}%</span>
                                        </div>
                                        <div className="p-1.5 rounded-xl bg-muted/30 border border-border/60">
                                            <span className="text-muted-foreground block text-[9px]">평균 응답</span>
                                            <span className="font-bold text-foreground">{worker.stats.avgLatencyMs}ms</span>
                                        </div>
                                        <div className="p-1.5 rounded-xl bg-muted/30 border border-border/60">
                                            <span className="text-muted-foreground block text-[9px]">누적 처리</span>
                                            <span className="font-bold text-foreground">{worker.stats.totalJobs}건</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Test Playground Modal */}
            {testingWorker && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-card border border-border rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2.5">
                                <span className="text-2xl p-1.5 rounded-xl bg-muted">{testingWorker.avatarEmoji}</span>
                                <div>
                                    <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                                        <span>{testingWorker.name} 단독 샌드박스 테스트</span>
                                        <Badge variant="outline" className="text-[10px] font-mono font-bold">
                                            {testingWorker.model}
                                        </Badge>
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        [CH #{selectedChannelId}] 스킬팩과 도구가 바인딩된 상태에서 워커의 추론을 검증합니다.
                                    </p>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setTestingWorker(null)}
                                className="h-7 w-7 p-0 rounded-full"
                            >
                                ✕
                            </Button>
                        </div>

                        {/* Test Input */}
                        <div className="space-y-1.5 text-xs">
                            <label className="font-bold text-muted-foreground">테스트 입력 프롬프트</label>
                            <textarea
                                value={testInput}
                                onChange={(e) => setTestInput(e.target.value)}
                                placeholder={`예: ${testingWorker.name}님, 최근 떡상할 수 있는 숏폼 3초 후킹 아이디어 3개를 기획해 주세요...`}
                                rows={3}
                                className="w-full p-3 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-muted-foreground font-mono">
                                Temp: {testingWorker.temperature} / Top-P: {testingWorker.topP}
                            </span>
                            <Button
                                size="sm"
                                disabled={isTestRunning || !testInput.trim()}
                                onClick={handleRunTest}
                                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-8 shadow-xs gap-1.5"
                            >
                                {isTestRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                워커 실행 및 검증
                            </Button>
                        </div>

                        {/* Response View */}
                        {testResponse && (
                            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-2 text-xs">
                                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                                    <span className="flex items-center gap-1 text-blue-600">
                                        <Sparkles className="w-3 h-3" />
                                        워커 응답 결과
                                    </span>
                                    {testLatency && (
                                        <span className="font-mono text-emerald-500">소요 시간: {testLatency}ms</span>
                                    )}
                                </div>
                                <div className="font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap max-h-56 overflow-y-auto custom-scrollbar p-2 bg-background/50 rounded-xl border border-border/50">
                                    {testResponse}
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText(testResponse);
                                            toast.success("워커 응답 결과가 클립보드에 복사되었습니다.");
                                        }}
                                        className="h-7 text-[11px] font-bold gap-1 px-2.5"
                                    >
                                        <Copy className="w-3 h-3" />
                                        답변 복사
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                            setTestingWorker(null);
                                            navigate('/pipeline-builder');
                                        }}
                                        className="h-7 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1 px-2.5"
                                    >
                                        파이프라인 빌더로 이동
                                        <ArrowUpRight className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentRosterPage;
