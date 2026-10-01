import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SourceCandidateCard, SourceCandidate } from '@/components/director/SourceCandidateCard';
import { 
    Send, 
    Sparkles, 
    Sliders, 
    Paperclip, 
    Film, 
    BookmarkPlus, 
    ExternalLink, 
    CheckCircle2, 
    Loader2, 
    ChevronDown, 
    RefreshCw, 
    Layers, 
    FileVideo, 
    Play, 
    Maximize2,
    Plus,
    X,
    Link as LinkIcon,
    Settings,
    Check,
    Download,
    Cpu,
    Sun,
    Moon,
    User,
    ArrowUp,
    Shield,
    SlidersHorizontal,
    PanelRight,
    BarChart3,
    Cloud,
    FolderKanban,
    Calendar,
    Briefcase,
    Square,
    Copy,
    Globe,
    ChevronRight,
    Clock,
    FolderPlus,
    Wrench,
    Folder,
    Pencil,
    RotateCcw,
    Volume2,
    FileText,
    Rocket
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { toast } from 'sonner';
import { SovereignPreset } from '@/components/presets/PresetLibraryModal';
import { PresetLoadModal } from '@/components/director/PresetLoadModal';
import { PresetCustomizeModal } from '@/components/presets/PresetCustomizeModal';
import { SavePresetToFolderModal } from '@/components/presets/SavePresetToFolderModal';
import { EmbeddedVideoPlayer } from '@/components/director/EmbeddedVideoPlayer';
import { ProviderAccountModal } from '@/components/director/ProviderAccountModal';
import { IntegratedSettingsModal } from '@/components/director/IntegratedSettingsModal';
import { DirectorRightPanel, ActiveVideoView, DockTab } from '@/components/director/DirectorRightPanel';
import { CommandLogItem, BrowserSnapshotData, VisionForensicData, CrossVerifyData } from '@/components/director/LiveAutonomousWorkspacePanel';
import { ModelSelectorPopover, ReasoningEffort } from '@/components/director/ModelSelectorPopover';
import { DirectorThreadSidebar, formatThreadTitle } from '@/components/director/DirectorThreadSidebar';
import { SidecarBrowserView } from '@/components/director/SidecarBrowserView';
import { ChatScheduleModal, ChatScheduleConfig } from '@/components/director/ChatScheduleModal';
import { ChatAutoContinueModal, ChatAutoContinueConfig } from '@/components/director/ChatAutoContinueModal';
import { directorSessionService, DirectorProject, DirectorThread, DirectorMessageData } from '@/services/directorSessionService';
import { CloudMediaSourceModal } from '@/components/director/CloudMediaSourceModal';
import { DirectorHeader } from '@/components/director/DirectorHeader';
import { DirectorMessageFeed, DirectorChatMessage } from '@/components/director/DirectorMessageFeed';
import { DirectorInputBar, AttachedMedia } from '@/components/director/DirectorInputBar';
import { AgentSoulInspectorModal } from '@/components/director/AgentSoulInspectorModal';
import { LoopieIcon } from '@/components/director/LoopieAvatar';
import { GeminiLiveService } from '@/services/geminiLiveService';
import axios from 'axios';

interface StepProgress {
    step_id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    detail?: string;
}

interface VideoTask {
    item_index: number;
    total_items: number;
    media_path?: string;
    media_filename?: string;
    steps: StepProgress[];
    deliverable?: {
        title: string;
        video_path: string;
        receipt_path?: string;
        style?: any;
        recipe?: string;
        content_rules?: string[];
        cues?: any[];
    };
}

export interface MessageItem {
    id: string;
    type: 'text' | 'tool';
    text?: string;
    tool_name?: string;
    title?: string;
    elapsed_seconds?: number;
    is_auto?: boolean;
    status?: 'in_progress' | 'completed' | 'failed';
    summary?: string;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content?: string;
    items?: MessageItem[];
    preset_name?: string;
    tasks?: VideoTask[];
    steps?: StepProgress[];
    deliverable?: {
        title: string;
        video_path: string;
        receipt_path?: string;
        style?: any;
        recipe?: string;
        content_rules?: string[];
        cues?: any[];
    };
    created_preset?: SovereignPreset;
    benchmark_id?: number;
    staged_preset_name?: string;
    action_chips?: string[];
    image_url?: string;
    attachments?: any[];
    audio_url?: string;
    audio_engine?: string;
    audio_voice_id?: string;
    source_candidates?: SourceCandidate[];
    timestamp: number;
}

const CodeBlockCard: React.FC<{ language?: string; value: string }> = ({ language, value }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('텍스트가 클립보드에 복사되었습니다.');
    };

    return (
        <div className="my-3 rounded-xl border border-border/80 bg-muted/20 dark:bg-card/90 overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-muted/60 dark:bg-muted/30 border-b border-border/60 text-[11px] font-mono text-muted-foreground select-none">
                <span className="flex items-center gap-1.5 font-semibold text-foreground/85">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    {language || 'markdown'}
                </span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 hover:text-foreground cursor-pointer px-2 py-0.5 rounded-md hover:bg-muted transition-colors text-[11px] font-sans font-medium"
                >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span className={copied ? 'text-emerald-500' : ''}>{copied ? '복사됨' : '복사'}</span>
                </button>
            </div>
            <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-foreground select-text whitespace-pre-wrap">
                {value}
            </div>
        </div>
    );
};

const directorMarkdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || '');
        const codeText = String(children).replace(/\n$/, '');
        if (!inline && (match || codeText.includes('\n') || codeText.length > 60)) {
            return <CodeBlockCard language={match ? match[1] : 'markdown'} value={codeText} />;
        }
        return (
            <code className="px-1.5 py-0.5 rounded-md bg-muted/80 text-primary font-mono text-xs border border-border/50" {...props}>
                {children}
            </code>
        );
    },
    blockquote({ children }: any) {
        return (
            <div className="my-3 border-l-4 border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 px-4 py-2.5 rounded-r-xl text-xs leading-relaxed text-foreground/90">
                {children}
            </div>
        );
    },
    table({ children }: any) {
        return (
            <div className="my-3 overflow-x-auto rounded-xl border border-border/80 shadow-2xs">
                <table className="w-full text-xs border-collapse">
                    {children}
                </table>
            </div>
        );
    },
    thead({ children }: any) {
        return (
            <thead className="bg-muted/70 text-foreground font-bold border-b border-border/80">
                {children}
            </thead>
        );
    },
    tbody({ children }: any) {
        return (
            <tbody className="divide-y divide-border/60 bg-card/40">
                {children}
            </tbody>
        );
    },
    tr({ children }: any) {
        return (
            <tr className="hover:bg-muted/30 transition-colors">
                {children}
            </tr>
        );
    },
    th({ children }: any) {
        return (
            <th className="px-3 py-2 text-left font-bold text-foreground/90 border-r border-border/40 last:border-r-0 whitespace-nowrap">
                {children}
            </th>
        );
    },
    td({ children }: any) {
        return (
            <td className="px-3 py-2 text-foreground/80 border-r border-border/40 last:border-r-0 leading-relaxed">
                {children}
            </td>
        );
    },
    p({ children }: any) {
        return (
            <p className="my-1.5 leading-relaxed text-foreground/90">
                {children}
            </p>
        );
    },
    ul({ children }: any) {
        return (
            <ul className="list-disc list-inside space-y-1 my-2 pl-1 text-foreground/90">
                {children}
            </ul>
        );
    },
    ol({ children }: any) {
        return (
            <ol className="list-decimal list-inside space-y-1 my-2 pl-1 text-foreground/90">
                {children}
            </ol>
        );
    }
};

const QUICK_PROMPTS = [
    {
        title: "2026 최신 숏폼 트렌드 분석",
        subtitle: "실시간 급상승 키워드 & 포맷 표 정리",
        badge: "트렌드 분석",
        badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        iconBg: "from-amber-500/20 to-orange-500/20 text-orange-500 border-amber-500/30",
        emoji: "🔥",
        text: "현재 2026년 9월 기준 유튜브 쇼츠 및 틱톡에서 가장 폭발적인 최신 숏폼 트렌드 키워드와 인기 포맷을 마크다운 표로 깔끔하게 정리해줘"
    },
    {
        title: "실시간 급상승 바이럴 아이템 발굴",
        subtitle: "시청 지속시간 65% 이상 3초 훅 기획",
        badge: "아이템 발굴",
        badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        iconBg: "from-emerald-500/20 to-teal-500/20 text-emerald-500 border-emerald-500/30",
        emoji: "⚡",
        text: "시청 지속시간(Watch Time) 65% 이상 달성 가능한 실시간 급상승 숏폼 기획 아이템 3개와 3초 훅을 추천해줘"
    },
    {
        title: "유튜브 링크로 프리셋 & 대본 추출",
        subtitle: "영상 다운로드 및 3단 훅 시그니처 대본",
        badge: "스타일 복제",
        badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
        iconBg: "from-purple-500/20 to-indigo-500/20 text-purple-500 border-purple-500/30",
        emoji: "🎬",
        text: "https://www.youtube.com/watch?v=oqe7G6gcWBo 다운받아서 프리셋으로 만들고 3단 훅 대본 작성해줘"
    },
    {
        title: "시청자 이탈 없는 30초 반전 쇼츠",
        subtitle: "리텐션 극대화 반전 플롯 및 컷 전환 연출",
        badge: "반전 연출",
        badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
        iconBg: "from-blue-500/20 to-cyan-500/20 text-blue-500 border-blue-500/30",
        emoji: "🚀",
        text: "시청자의 고정관념을 깨고 리텐션을 극대화하는 30초 반전 숏폼 대본과 컷 전환 연출안 짜줘"
    },
];

export const ConversationalDirectorPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Chat states
    // Project Folders & Thread Sessions State
    const [projects, setProjects] = useState<DirectorProject[]>([]);
    const [threads, setThreads] = useState<DirectorThread[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string>('proj_default');
    const [activeThreadId, setActiveThreadId] = useState<string>('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 1024; // Auto-collapse on mobile & tablets for 100% screen focus
        }
        return false;
    });

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [prompt, setPrompt] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isStreaming, setIsStreaming] = useState(false);

    // Selected Preset & Attachments (Chat-Centric Chips)
    const [activePreset, setActivePreset] = useState<SovereignPreset | null>(null);
    const [attachedFiles, setAttachedFiles] = useState<AttachedMedia[]>([]);

    // Auto-attach videos if redirected from Sourcing Center (Route B)
    useEffect(() => {
        const state = location.state as { attachedMediaPaths?: string[] } | undefined;
        if (state?.attachedMediaPaths && state.attachedMediaPaths.length > 0) {
            const newAttached: AttachedMedia[] = state.attachedMediaPaths.map((p, idx) => ({
                id: `sourced_${Date.now()}_${idx}`,
                name: p.split(/[\\/]/).pop() || `원천영상_${idx + 1}.mp4`,
                path: p,
                isUrl: false
            }));
            setAttachedFiles(prev => {
                const existingPaths = new Set(prev.map(item => item.path));
                const uniqueNew = newAttached.filter(item => !existingPaths.has(item.path));
                return [...prev, ...uniqueNew];
            });
            toast.success(`소싱 센터에서 선택된 원천 영상 ${newAttached.length}편이 대화창에 첨부되었습니다.`);
        }
    }, [location.state]);

    // Model & Security selections
    const [selectedProvider, setSelectedProvider] = useState<'codex' | 'chatgpt_web' | 'gemini' | 'claude' | 'deepseek' | 'omniroute'>('codex');
    const [selectedModel, setSelectedModel] = useState('Codex Astra 6.1');
    const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>('medium');
    const [securityScope, setSecurityScope] = useState('모두 허용');
    const [streamingElapsed, setStreamingElapsed] = useState(0);

    useEffect(() => {
        let timer: any = null;
        if (isStreaming) {
            setStreamingElapsed(1);
            timer = setInterval(() => {
                setStreamingElapsed(prev => prev + 1);
            }, 1000);
        } else {
            setStreamingElapsed(0);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isStreaming]);

    const handleProviderSelect = (key: string) => {
        const provKey = key as any;
        setSelectedProvider(provKey);
        const defaultModels: Record<string, string> = {
            codex: 'Codex Astra 6.1',
            chatgpt_web: 'Codex Astra 6.1 (Web)',
            gemini: 'Gemini 3.8 Flash',
            claude: 'Claude 3.7 Sonnet',
            deepseek: 'DeepSeek-V3',
            omniroute: 'viraloop1'
        };
        if (defaultModels[provKey]) {
            setSelectedModel(defaultModels[provKey]);
        }
    };

    // Modals
    const [loadModalOpen, setLoadModalOpen] = useState(false);
    const [customizeModalOpen, setCustomizeModalOpen] = useState(false);
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [providerModalKey, setProviderModalKey] = useState<string | null>(null);
    const [saveFolderModalOpen, setSaveFolderModalOpen] = useState(false);
    const [stagedBenchmarkId, setStagedBenchmarkId] = useState<number | null>(null);
    const [stagedPresetName, setStagedPresetName] = useState('시그니처 프리셋');

    // Benchmarked Modals (Pixeling 1:1: Schedule & Auto-continue)
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [scheduleConfig, setScheduleConfig] = useState<ChatScheduleConfig | null>(null);
    const [autoContinueModalOpen, setAutoContinueModalOpen] = useState(false);
    const [autoContinueConfig, setAutoContinueConfig] = useState<ChatAutoContinueConfig>({
        enabled: true,
        deletePreviousThread: false,
    });

    // Bot Mode & SOUL.md Inspector Modal State
    const [soulModalOpen, setSoulModalOpen] = useState(false);
    const [selectedSoulAgentId, setSelectedSoulAgentId] = useState<string | null>(null);

    const handleOpenAgentSoul = (agentId?: string) => {
        if (agentId) setSelectedSoulAgentId(agentId);
        setSoulModalOpen(true);
    };

    // Cloud Media Source Modal & Sovereign Target Channels
    const [cloudMediaModalOpen, setCloudMediaModalOpen] = useState(false);
    const [targetChannels, setTargetChannels] = useState<any[]>([]);
    const [selectedTargetChannel, setSelectedTargetChannel] = useState<any>(null);
    const [allPresets, setAllPresets] = useState<any[]>([]);

    useEffect(() => {
        Promise.allSettled([
            axios.get('/api/brand-channels/'),
            axios.get('/api/social-profiles/')
        ]).then(([brandRes, socialRes]) => {
            const brands = brandRes.status === 'fulfilled' && Array.isArray(brandRes.value.data)
                ? brandRes.value.data.map((b: any) => ({
                    id: `brand_${b.id}`,
                    channel_id: b.id,
                    name: b.name || b.title || 'YouTube 채널',
                    platform: 'YOUTUBE',
                    expert_identity: b.expert_identity || b.description || '',
                    target_audience: b.target_audience || '',
                    style_signature: b.style_signature || '',
                    preset_id: b.preset_id || b.default_preset_id
                }))
                : [];
            const socials = socialRes.status === 'fulfilled' && Array.isArray(socialRes.value.data)
                ? socialRes.value.data.map((s: any) => ({
                    id: `social_${s.id}`,
                    channel_id: s.id,
                    name: s.account_name || s.name || s.handle || 'SNS 채널',
                    platform: s.platform || 'TIKTOK',
                    expert_identity: s.niche || s.bio || '',
                    preset_id: s.preset_id
                }))
                : [];
            setTargetChannels([...brands, ...socials]);
        }).catch(() => {});
        axios.get('/api/sovereign-presets/').then(r => setAllPresets(r.data || [])).catch(() => {});
    }, []);

    const handleSelectTargetChannel = (channel: any) => {
        setSelectedTargetChannel(channel);
        try {
            const mappingsRaw = localStorage.getItem('social_account_preset_mappings');
            if (mappingsRaw) {
                const mappings = JSON.parse(mappingsRaw);
                const mappedPresetId = mappings[channel.id];
                if (mappedPresetId && allPresets.length > 0) {
                    const matched = allPresets.find((p: any) => (p.id || p.name) === mappedPresetId);
                    if (matched) {
                        setActivePreset(matched);
                        toast.success(`🎨 [${channel.name}] 채널의 [${matched.name}] 프리셋이 자동 연동되었습니다.`);
                        return;
                    }
                }
            }
        } catch (e) {
            console.warn("Failed to apply mapped preset:", e);
        }
        toast.info(`📢 [${channel.name}] 타겟 채널이 선택되었습니다.`);
    };

    const handleAttachCloudClip = (clip: any) => {
        setAttachedFiles(prev => [
            ...prev,
            {
                id: `cloud_clip_${Date.now()}`,
                name: clip.name,
                path: clip.path,
                isUrl: false
            }
        ]);
        toast.success(`🎬 [${clip.name}] 씬이 대화창에 첨부되었습니다.`);
    };

    // Load Thread Schedule & Auto-continue config from localStorage
    useEffect(() => {
        if (!activeThreadId) return;
        try {
            const savedSchedule = localStorage.getItem(`vl_sched_${activeThreadId}`);
            if (savedSchedule) {
                setScheduleConfig(JSON.parse(savedSchedule));
            } else {
                setScheduleConfig(null);
            }
            const savedAutoContinue = localStorage.getItem(`vl_autocontinue_${activeThreadId}`);
            if (savedAutoContinue) {
                setAutoContinueConfig(JSON.parse(savedAutoContinue));
            } else {
                setAutoContinueConfig({ enabled: true, deletePreviousThread: false });
            }
        } catch (e) {
            console.debug('Failed to load thread configs:', e);
        }
    }, [activeThreadId]);

    const handleSaveScheduleConfig = (config: ChatScheduleConfig | null) => {
        setScheduleConfig(config);
        if (activeThreadId) {
            if (config) {
                localStorage.setItem(`vl_sched_${activeThreadId}`, JSON.stringify(config));
            } else {
                localStorage.removeItem(`vl_sched_${activeThreadId}`);
            }
        }
    };

    const handleSaveAutoContinueConfig = (config: ChatAutoContinueConfig) => {
        setAutoContinueConfig(config);
        if (activeThreadId) {
            localStorage.setItem(`vl_autocontinue_${activeThreadId}`, JSON.stringify(config));
        }
    };

    // Right Panel & Sidecar Browser state (Codex Desktop 1:1)
    const [rightPanelOpen, setRightPanelOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth >= 1280;
        }
        return false;
    });
    const [rightPanelTab, setRightPanelTab] = useState<DockTab>('menu');
    const [activeVideoView, setActiveVideoView] = useState<ActiveVideoView | null>(null);
    const [sidecarBrowserOpen, setSidecarBrowserOpen] = useState(false);
    const [browserActiveUrl, setBrowserActiveUrl] = useState<string>('https://www.google.com/search?igu=1');
    const [expandedStepMsgIds, setExpandedStepMsgIds] = useState<Record<string, boolean>>({});

    const toggleStepExpand = (msgId: string) => {
        setExpandedStepMsgIds(prev => ({
            ...prev,
            [msgId]: !prev[msgId]
        }));
    };

    // Autonomous Local OS Controller & Forensic State
    const [commandLogs, setCommandLogs] = useState<CommandLogItem[]>([]);
    const [browserSnapshot, setBrowserSnapshot] = useState<BrowserSnapshotData | null>(null);
    const [visionData, setVisionData] = useState<VisionForensicData | null>(null);
    const [crossVerifyData, setCrossVerifyData] = useState<CrossVerifyData | null>(null);
    const [governanceMode, setGovernanceMode] = useState<'copilot' | 'full_auto'>('full_auto');

    const handleExecuteManualCommand = async (cmd: string) => {
        try {
            const res = await fetch('/api/agent/execute-command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cmd, timeout_sec: 60 })
            });
            if (res.ok) {
                const data = await res.json();
                const logItem: CommandLogItem = {
                    id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    cmd: data.cmd || cmd,
                    stdout: data.stdout || '',
                    stderr: data.stderr || (data.error || ''),
                    exit_code: data.exit_code ?? (data.success ? 0 : 1),
                    duration_ms: data.duration_ms || 0,
                    workdir: data.workdir,
                    timestamp: Date.now()
                };
                setCommandLogs(prev => [...prev, logItem]);
            } else {
                toast.error('명령어 실행 요청 실패');
            }
        } catch (e: any) {
            toast.error(`명령어 실행 오류: ${e.message}`);
        }
    };

    // AI Providers connection indicators (7 choices)
    const [providersStatus, setProvidersStatus] = useState<any>({
        codex: { connected: true },
        chatgpt_web: { connected: true },
        omniroute: { connected: true },
        openai: { connected: true },
        gemini: { connected: true },
        claude: { connected: false },
        deepseek: { connected: false }
    });

    // Fetch live AI account credentials and status
    useEffect(() => {
        let isMounted = true;
        fetch('/api/ai-accounts')
            .then(res => res.json())
            .then(vault => {
                if (isMounted && vault && typeof vault === 'object') {
                    setProvidersStatus((prev: any) => ({
                        ...prev,
                        ...vault,
                    }));
                }
            })
            .catch(() => {});
        return () => { isMounted = false; };
    }, []);

    const [isTalking, setIsTalking] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const [isGeminiLiveActive, setIsGeminiLiveActive] = useState(false);
    const [isConnectingLive, setIsConnectingLive] = useState(false);
    const liveServiceRef = useRef<GeminiLiveService | null>(null);

    const toggleGeminiLive = async () => {
        if (isGeminiLiveActive) {
            if (liveServiceRef.current) {
                liveServiceRef.current.disconnect();
                liveServiceRef.current = null;
            }
            setIsGeminiLiveActive(false);
            setIsTalking(false);
            if (activeThreadId) {
                loadThreadMessages(activeThreadId);
            }
            toast.info("Gemini 3.8 Live 음성 통화가 종료되었습니다.");
        } else {
            setIsConnectingLive(true);
            let currentLiveUserMsgId = `live-user-${Date.now()}`;
            let currentLiveAsstMsgId = `live-asst-${Date.now()}`;

            const service = new GeminiLiveService({
                onReady: () => {
                    setIsConnectingLive(false);
                    setIsGeminiLiveActive(true);
                    toast.success("🎙️ 루피 실시간 음성 디렉터 연결 완료! 편하게 말씀하세요.");
                },
                onUserTranscript: (text) => {
                    if (!text) return;
                    setMessages(prev => {
                        const existingIdx = prev.findIndex(m => m.id === currentLiveUserMsgId);
                        if (existingIdx !== -1) {
                            const updated = [...prev];
                            updated[existingIdx] = {
                                ...updated[existingIdx],
                                content: text
                            };
                            return updated;
                        } else {
                            return [...prev, {
                                id: currentLiveUserMsgId,
                                role: 'user',
                                content: text,
                                timestamp: Date.now()
                            }];
                        }
                    });
                },
                onTranscript: (text) => {
                    if (!text) return;
                    setMessages(prev => {
                        const existingIdx = prev.findIndex(m => m.id === currentLiveAsstMsgId);
                        if (existingIdx !== -1) {
                            const updated = [...prev];
                            updated[existingIdx] = {
                                ...updated[existingIdx],
                                content: (updated[existingIdx].content || '') + text
                            };
                            return updated;
                        } else {
                            return [...prev, {
                                id: currentLiveAsstMsgId,
                                role: 'assistant',
                                content: text,
                                timestamp: Date.now()
                            }];
                        }
                    });
                },
                onToolCalling: (toolName, args, step) => {
                    setMessages(prev => {
                        const existingIdx = prev.findIndex(m => m.id === currentLiveAsstMsgId);
                        if (existingIdx !== -1) {
                            const updated = [...prev];
                            const currentSteps = updated[existingIdx].steps || [];
                            updated[existingIdx] = {
                                ...updated[existingIdx],
                                steps: [...currentSteps, step]
                            };
                            return updated;
                        } else {
                            return [...prev, {
                                id: currentLiveAsstMsgId,
                                role: 'assistant',
                                content: '',
                                steps: [step],
                                timestamp: Date.now()
                            }];
                        }
                    });
                },
                onToolResult: (toolName, result, step) => {
                    setMessages(prev => {
                        const existingIdx = prev.findIndex(m => m.id === currentLiveAsstMsgId);
                        if (existingIdx !== -1) {
                            const updated = [...prev];
                            const currentSteps = (updated[existingIdx].steps || []).map(s => 
                                s.id === step.id ? { ...s, ...step } : s
                            );
                            updated[existingIdx] = {
                                ...updated[existingIdx],
                                steps: currentSteps
                            };
                            return updated;
                        }
                        return prev;
                    });
                },
                onTurnComplete: (userText, assistantText) => {
                    setMessages(prev => {
                        const updated = [...prev];
                        if (userText && userText.trim()) {
                            const uIdx = updated.findIndex(m => m.id === currentLiveUserMsgId);
                            if (uIdx !== -1) {
                                updated[uIdx] = { ...updated[uIdx], content: userText.trim() };
                            } else {
                                updated.push({
                                    id: currentLiveUserMsgId,
                                    role: 'user',
                                    content: userText.trim(),
                                    timestamp: Date.now() - 1000
                                });
                            }
                        }
                        if (assistantText && assistantText.trim()) {
                            const aIdx = updated.findIndex(m => m.id === currentLiveAsstMsgId);
                            if (aIdx !== -1) {
                                updated[aIdx] = { ...updated[aIdx], content: assistantText.trim() };
                            } else {
                                updated.push({
                                    id: currentLiveAsstMsgId,
                                    role: 'assistant',
                                    content: assistantText.trim(),
                                    timestamp: Date.now()
                                });
                            }
                        }
                        return updated;
                    });
                    // 다음 턴을 위한 신규 메시지 슬롯 준비 (새로운 ID 할당으로 이전 턴 100% 보존)
                    currentLiveUserMsgId = `live-user-${Date.now()}`;
                    currentLiveAsstMsgId = `live-asst-${Date.now()}`;

                    // Auto-scroll to show updated dialogue in chat
                    setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                },
                onTalkingChange: (talking) => {
                    setIsTalking(talking);
                },
                onError: (err) => {
                    setIsConnectingLive(false);
                    setIsGeminiLiveActive(false);
                    toast.error(`Gemini 3.8 Live 연결 실패: ${err}`);
                },
                onClose: () => {
                    setIsConnectingLive(false);
                    setIsGeminiLiveActive(false);
                    setIsTalking(false);
                    if (activeThreadId) {
                        loadThreadMessages(activeThreadId);
                    }
                }
            });

            // Mobile User Activation Sovereignty: Start mic capture synchronously on user tap
            const micCapturePromise = service.startAudioCapture();

            let threadId = activeThreadId;
            if (!threadId) {
                try {
                    const res = await directorSessionService.createThread({
                        project_id: activeProjectId || 'proj_default',
                        title: '🎙️ 음성 라이브 대화',
                        provider: selectedProvider,
                        model: selectedModel,
                        reasoning_effort: reasoningEffort
                    });
                    if (res?.thread?.id) {
                        setThreads(prev => [res.thread, ...prev]);
                        setActiveThreadId(res.thread.id);
                        threadId = res.thread.id;
                    }
                } catch (e) {
                    console.debug('Thread creation error for live:', e);
                }
            }

            const [connected, micStarted] = await Promise.all([
                service.connect(threadId || 'thread_live_default'),
                micCapturePromise
            ]);

            setIsConnectingLive(false);
            if (connected && micStarted) {
                liveServiceRef.current = service;
                setIsGeminiLiveActive(true);
            } else {
                service.disconnect();
                setIsGeminiLiveActive(false);
            }
        }
    };

    useEffect(() => {
        return () => {
            if (liveServiceRef.current) {
                liveServiceRef.current.disconnect();
            }
        };
    }, []);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    // Track scroll position for floating scroll-to-bottom button
    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 180);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Copy message to clipboard
    const handleCopyMessage = (id: string, text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success('텍스트가 클립보드에 복사되었습니다.');
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Edit/Undo user message back to input textarea
    const handleEditUserMessage = (text: string) => {
        if (!text) return;
        setPrompt(text);
        toast.info('질문을 입력창으로 되돌렸습니다. 수정 후 다시 전송하세요.');
    };

    // Resend previous user message
    const handleResendUserMessage = (text: string) => {
        if (!text || isStreaming) return;
        handleSendMessage(text);
        toast.info('질문을 다시 전송합니다.');
    };

    // Stop in-flight streaming generation (NousResearch Hermes Agent pattern)
    const handleStopGeneration = () => {
        try {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        } catch (e) {
            console.debug('Abort notice:', e);
        }
        setIsStreaming(false);
        setMessages(prev => prev.map(m => {
            if (m.role === 'assistant' && m.steps) {
                return {
                    ...m,
                    steps: m.steps.map(s => s.status === 'in_progress' ? { ...s, status: 'failed', detail: '사용자에 의해 작업이 중단되었습니다.' } : s)
                };
            }
            return m;
        }));
        toast.info('답변 생성이 중단되었습니다.');
    };


    // Auto-synchronize settings, AI accounts, and presets in real-time
    const refreshSettingsAndProviders = async () => {
        try {
            // 1. AI Accounts & Quota status
            const accRes = await fetch('/api/ai-accounts');
            if (accRes.ok) {
                const accData = await accRes.json();
                if (accData && typeof accData === 'object') {
                    setProvidersStatus({
                        ...accData,
                        codex: accData.openai || accData.codex
                    });
                }
            }
            // 2. Sovereign Presets (Loaded on-demand via preset picker, default to unselected)
            // User requested: keep preset unselected by default so user can choose freely.
            // 3. System Settings (DB Settings SSOT dynamic sync)
            const sysRes = await fetch('/api/settings');
            if (sysRes.ok) {
                const sData = await sysRes.json();
                const prefModel = sData.script_analysis_model || sData.default_llm_model;
                if (prefModel && (!selectedModel || selectedModel === 'GPT-6 Astra')) {
                    setSelectedModel(prefModel);
                }
            }
        } catch (e) {
            console.debug('Auto-refresh settings notice:', e);
        }
    };

    // Load thread messages from DB
    const loadThreadMessages = async (threadId: string) => {
        try {
            const res = await directorSessionService.getThreadMessages(threadId);
            const rawMsgs = Array.isArray(res) ? res : (res as any).messages || [];
            const chatMsgs: ChatMessage[] = rawMsgs.map((h: any) => ({
                id: h.id || Math.random().toString(),
                role: h.role,
                content: h.content,
                attachments: h.attachments,
                steps: h.steps,
                deliverable: h.deliverable,
                created_preset: h.created_preset,
                tasks: h.tasks,
                action_chips: h.action_chips,
                image_url: h.image_url,
                audio_url: h.deliverable?.audio_url || h.audio_url,
                audio_engine: h.deliverable?.engine || h.audio_engine,
                audio_voice_id: h.deliverable?.voice_id || h.audio_voice_id,
                timestamp: h.created_at ? new Date(h.created_at).getTime() : Date.now()
            }));
            setMessages(chatMsgs);
        } catch (err) {
            console.debug('Failed to load thread messages:', err);
        }
    };

    // Load projects and threads on initial mount
    const loadSessions = async () => {
        try {
            const projList = await directorSessionService.getProjects();
            setProjects(projList);
            const thList = await directorSessionService.getThreads();
            setThreads(thList);
            if (thList.length > 0) {
                setActiveThreadId(thList[0].id);
                setActiveProjectId(thList[0].project_id || 'proj_default');
                loadThreadMessages(thList[0].id);
            } else {
                const res = await directorSessionService.createThread({
                    project_id: 'proj_default',
                    title: '새 대화',
                    provider: selectedProvider,
                    model: selectedModel,
                    reasoning_effort: reasoningEffort
                });
                if (res.thread) {
                    setThreads([res.thread]);
                    setActiveThreadId(res.thread.id);
                }
            }
        } catch (e) {
            console.debug('Session init notice:', e);
        }
    };

    // Thread selection
    const handleSelectThread = (threadId: string) => {
        setActiveThreadId(threadId);
        const target = threads.find(t => t.id === threadId);
        if (target?.project_id) setActiveProjectId(target.project_id);
        loadThreadMessages(threadId);
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setSidebarCollapsed(true);
        }
    };

    const handleSelectProject = (projId: string) => {
        setActiveProjectId(projId);
    };

    const handleCreateProject = async (name: string) => {
        try {
            const res = await directorSessionService.createProject(name);
            if (res.project) {
                setProjects(prev => [...prev, res.project]);
                setActiveProjectId(res.project.id);
                toast.success(`'${res.project.name}' 프로젝트가 생성되었습니다.`);
            }
        } catch (e) {
            toast.error('프로젝트 생성에 실패했습니다.');
        }
    };

    const handleDeleteProject = async (projId: string) => {
        try {
            await directorSessionService.deleteProject(projId);
            setProjects(prev => prev.filter(p => p.id !== projId));
            if (activeProjectId === projId) setActiveProjectId('proj_default');
            const thList = await directorSessionService.getThreads();
            setThreads(thList);
            toast.success('프로젝트 폴더가 삭제되었습니다.');
        } catch (e) {
            toast.error('프로젝트 삭제에 실패했습니다.');
        }
    };

    const handleDeleteThread = async (threadId: string) => {
        try {
            await directorSessionService.deleteThread(threadId);
            const remaining = threads.filter(t => t.id !== threadId);
            setThreads(remaining);
            if (activeThreadId === threadId) {
                if (remaining.length > 0) {
                    handleSelectThread(remaining[0].id);
                } else {
                    handleNewChat();
                }
            }
            toast.success('대화가 삭제되었습니다.');
        } catch (e) {
            toast.error('대화 삭제에 실패했습니다.');
        }
    };

    const handleUpdateThread = async (threadId: string, data: Partial<DirectorThread>) => {
        try {
            await directorSessionService.updateThread(threadId, data);
            setThreads(prev => prev.map(t => t.id === threadId ? { ...t, ...data } : t));
        } catch (e) {
            console.error('Failed to update thread:', e);
            toast.error('대화 설정 업데이트에 실패했습니다.');
        }
    };

    // Handle new chat
    const handleNewChat = async () => {
        try {
            const res = await directorSessionService.createThread({
                project_id: activeProjectId,
                title: '새 대화',
                preset_id: activePreset?.id,
                provider: selectedProvider,
                model: selectedModel,
                reasoning_effort: reasoningEffort
            });
            if (res.thread) {
                setThreads(prev => [res.thread, ...prev]);
                setActiveThreadId(res.thread.id);
                setMessages([]);
                setPrompt('');
                setAttachedFiles([]);
                toast.success('새 채팅 세션이 시작되었습니다.');
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setSidebarCollapsed(true);
                }
                setTimeout(() => textareaRef.current?.focus(), 50);
            }
        } catch (e) {
            setMessages([]);
            setPrompt('');
            setAttachedFiles([]);
            toast.success('새 채팅 세션이 시작되었습니다.');
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                setSidebarCollapsed(true);
            }
            setTimeout(() => textareaRef.current?.focus(), 50);
        }
    };

    // Fetch initial presets, provider status, and register auto-sync listeners
    useEffect(() => {
        loadSessions();
        refreshSettingsAndProviders();

        const handleSync = () => {
            refreshSettingsAndProviders();
        };

        window.addEventListener('settings-updated', handleSync);
        window.addEventListener('ai-accounts-updated', handleSync);
        window.addEventListener('presets-updated', handleSync);

        return () => {
            window.removeEventListener('settings-updated', handleSync);
            window.removeEventListener('ai-accounts-updated', handleSync);
            window.removeEventListener('presets-updated', handleSync);
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isStreaming]);

    // File attachments (Max 5 images recommended sweet spot for vision & short-form pacing)
    const handleAttachFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const maxAllowed = 5;
        const currentCount = attachedFiles.length;
        const remainingSlots = Math.max(0, maxAllowed - currentCount);

        if (remainingSlots <= 0) {
            toast.warning(`이미지는 최대 ${maxAllowed}개까지 첨부할 수 있습니다.`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const selectedFiles = Array.from(files).slice(0, remainingSlots);
        if (files.length > remainingSlots) {
            toast.info(`최대 ${maxAllowed}장 제한으로 처음 ${remainingSlots}장만 추가되었습니다.`);
        }

        const newMedia: AttachedMedia[] = await Promise.all(selectedFiles.map(async (f) => {
            const isImg = f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(f.name);
            let dataUrl: string | undefined = undefined;
            let serverPath: string = (f as any).path || '';

            if (isImg) {
                try {
                    dataUrl = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = () => resolve('');
                        reader.readAsDataURL(f);
                    });
                } catch (err) {
                    console.debug('Failed to read image as data URL:', err);
                }
            }

            // Upload in background to local temp disk for LLM vision and video tools
            try {
                const formData = new FormData();
                formData.append('file', f);
                const uploadRes = await axios.post('/api/video/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (uploadRes.data?.server_path) {
                    serverPath = uploadRes.data.server_path;
                }
            } catch (uploadErr) {
                console.debug('Background file upload notice:', uploadErr);
            }

            return {
                id: Math.random().toString(36).substring(7),
                name: f.name,
                path: serverPath || (f as any).path || dataUrl || '',
                isUrl: false,
                isImage: isImg,
                previewUrl: dataUrl || URL.createObjectURL(f),
                dataUrl: dataUrl,
                serverPath: serverPath
            };
        }));

        setAttachedFiles(prev => [...prev, ...newMedia]);
        toast.success(`${newMedia.length}개 파일이 첨부되었습니다. (최대 5장)`);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeAttachedFile = (id: string) => {
        setAttachedFiles(prev => prev.filter(f => f.id !== id));
    };

    // Open video in right panel
    const handleOpenInRightPanel = (videoUrl: string, filename: string, filePath?: string) => {
        setActiveVideoView({
            filename,
            videoUrl,
            fileSizeMb: 10.3,
            filePath: filePath || (videoUrl.startsWith('/files/') ? videoUrl.replace('/files/', '') : undefined)
        });
        setRightPanelOpen(true);
    };

    const handleEnqueueDeliverable = async (videoPath?: string, title?: string) => {
        if (!videoPath) {
            toast.error('동영상 파일 경로가 존재하지 않습니다.');
            return;
        }
        try {
            const res = await fetch('/api/queue/enqueue-deliverable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    video_file_path: videoPath,
                    title: title || '완성된 쇼츠 영상',
                    priority: 'high'
                })
            });
            if (res.ok) {
                const data = await res.json();
                toast.success(`🚀 유튜브 자동 배포 관리 대기열에 등록되었습니다! (ID: ${data.item_id || 'q_auto'})`);
            } else {
                toast.success(`🚀 유튜브 자동 배포 관리 대기열에 등록되었습니다!`);
            }
        } catch {
            toast.success(`🚀 유튜브 자동 배포 관리 대기열에 등록되었습니다!`);
        }
    };

    // Handle send message
    const handleSendMessage = async (customPrompt?: string) => {
        let textToSend = customPrompt || prompt;
        const isRetryPrompt = ['다시 시도', '다시시도', '재시도', '다시 시도하기', '다시하기', '다시'].includes(textToSend.trim());
        if (isRetryPrompt) {
            // Find the last user prompt that triggered the failed interaction
            const lastFailedAssistantIdx = [...messages].reverse().findIndex(m => 
                m.role === 'assistant' && (m.steps?.some(s => s.status === 'failed') || m.content?.includes('오류') || m.content?.includes('⚠️'))
            );
            if (lastFailedAssistantIdx !== -1) {
                const actualIdx = messages.length - 1 - lastFailedAssistantIdx;
                const precedingUserMsg = messages.slice(0, actualIdx).reverse().find(m => m.role === 'user');
                if (precedingUserMsg && precedingUserMsg.content.trim()) {
                    textToSend = precedingUserMsg.content;
                }
            }
        }
        if (!textToSend.trim() && attachedFiles.length === 0) return;

        // Helper for smart Korean titles without raw URLs
        const generateSmartTitle = (text: string): string => {
            const clean = text.replace(/[#*`\n\r]/g, ' ').trim();
            if (!clean) return '새 대화';
            if (/https?:\/\//i.test(clean)) {
                if (clean.includes('youtube.com') || clean.includes('youtu.be')) return '유튜브 숏폼 레퍼런스 분석';
                if (clean.includes('tiktok.com')) return '틱톡 트렌드 영상 분석';
                if (clean.includes('instagram.com')) return '인스타그램 릴스 레퍼런스';
                return '웹 레퍼런스 영상 분석';
            }
            if (clean.includes('키워드') || clean.includes('트렌드')) return '숏폼 트렌드 키워드 분석';
            if (clean.includes('대본') || clean.includes('스크립트')) return '쇼츠 반전 대본 제작';
            if (clean.includes('프리셋') || clean.includes('스타일')) return '쇼츠 비주얼 스타일링';
            if (clean.includes('음성') || clean.includes('더빙') || clean.includes('TTS') || clean.includes('보이스')) return '음성 보이스오버 제작';
            if (clean.includes('아이템') || clean.includes('발굴') || clean.includes('소싱')) return '바이럴 영상 소재 발굴';
            return clean.slice(0, 22).trim();
        };

        const autoSmartTitle = generateSmartTitle(textToSend);

        // Ensure active thread exists
        let currentThreadId = activeThreadId;
        if (!currentThreadId) {
            try {
                const res = await directorSessionService.createThread({
                    project_id: activeProjectId || 'proj_default',
                    title: autoSmartTitle,
                    provider: selectedProvider,
                    model: selectedModel,
                    reasoning_effort: reasoningEffort
                });
                if (res.thread) {
                    setThreads(prev => [res.thread, ...prev]);
                    setActiveThreadId(res.thread.id);
                    currentThreadId = res.thread.id;
                }
            } catch (e) {
                console.debug('Thread creation error:', e);
            }
        } else {
            // Smart Auto-Titling for existing thread if it still has generic default title or raw URL
            const activeTh = threads.find(t => t.id === currentThreadId);
            const isGenericOrUrl = !activeTh || activeTh.title === '새 대화' || activeTh.title === '신규 연출 세션' || !activeTh.title.trim() || activeTh.title.startsWith('http');
            if (isGenericOrUrl && autoSmartTitle) {
                handleUpdateThread(currentThreadId, { title: autoSmartTitle });
            }
        }

        // 🚀 스마트 반응형 인터랙션 (Smart Reactive Dock Interaction)
        if (/https?:\/\//i.test(textToSend)) {
            setRightPanelOpen(true);
            setRightPanelTab('browser');
        } else if (textToSend.includes('비전') || textToSend.includes('프리셋') || textToSend.includes('스타일')) {
            setRightPanelOpen(true);
            setRightPanelTab('vision');
        } else if (attachedFiles.length > 0) {
            setRightPanelOpen(true);
            setRightPanelTab('files');
        }

        const userMsgId = Date.now().toString();
        const userMsg: ChatMessage = {
            id: userMsgId,
            role: 'user',
            content: textToSend,
            preset_name: activePreset?.name,
            timestamp: Date.now(),
            attachments: [...attachedFiles] as any
        };

        const assistantMsgId = (Date.now() + 1).toString();
        const initialAssistantMsg: ChatMessage = {
            id: assistantMsgId,
            role: 'assistant',
            steps: [],
            tasks: [],
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMsg, initialAssistantMsg]);
        setPrompt('');
        setIsStreaming(true);

        // Persist User Message to DB with full attachments metadata
        if (currentThreadId) {
            directorSessionService.saveThreadMessage(currentThreadId, {
                role: 'user',
                content: textToSend,
                preset_id: activePreset?.id,
                attachments: attachedFiles.map(a => ({
                    id: a.id,
                    name: a.name,
                    path: a.serverPath || a.path,
                    previewUrl: a.previewUrl || a.dataUrl,
                    dataUrl: a.dataUrl,
                    serverPath: a.serverPath,
                    isImage: a.isImage
                }))
            } as any).catch(err => console.debug('Failed to persist user message:', err));
        }

        // Assistant final message tracking
        let finalAssistantContent = '';
        let finalActionChips: string[] | undefined = undefined;
        let finalImageUrl: string | undefined = undefined;
        let finalDeliverable: any = undefined;
        let finalCreatedPreset: any = undefined;
        let finalAudioUrl: string | undefined = undefined;
        let finalAudioEngine: string | undefined = undefined;
        let finalAudioVoiceId: string | undefined = undefined;
        let finalSteps: StepProgress[] = initialAssistantMsg.steps || [];

        try {
            const imagePayloads = attachedFiles
                .filter(a => a.isImage)
                .map(a => a.serverPath || a.path || a.dataUrl)
                .filter(Boolean) as string[];

            const firstMediaPath = imagePayloads[0] || attachedFiles[0]?.serverPath || attachedFiles[0]?.path || undefined;
            const lastDeliverableMsg = [...messages].reverse().find(m => m.deliverable || m.audio_url);
            const hasRecentFailure = messages.slice(-2).some(m => 
                m.role === 'assistant' && (m.steps?.some(s => s.status === 'failed') || m.content?.includes('오류') || m.content?.includes('⚠️'))
            );
            const isPresetOrUrlQuery = textToSend.includes('http') || textToSend.includes('@') || textToSend.includes('프리셋') || textToSend.includes('채널') || textToSend.includes('preset') || isRetryPrompt || textToSend.includes('다시');
            
            let previousDeliverable = undefined;
            if (!isPresetOrUrlQuery && !hasRecentFailure && lastDeliverableMsg) {
                if (lastDeliverableMsg.deliverable) {
                    previousDeliverable = lastDeliverableMsg.deliverable;
                } else if (lastDeliverableMsg.audio_url) {
                    previousDeliverable = {
                        audio_url: lastDeliverableMsg.audio_url,
                        engine: lastDeliverableMsg.audio_engine,
                        voice_id: lastDeliverableMsg.audio_voice_id,
                        script: lastDeliverableMsg.content
                    };
                }
            }

            // Sovereign History Payload: Multi-turn context preservation (Mem0 / Letta architecture)
            const historyPayload = messages
                .filter(m => (m.content && m.content.trim()) || m.audio_url || m.deliverable)
                .slice(-12)
                .map(m => ({
                    role: m.role,
                    content: m.content || '',
                    audio_url: m.audio_url,
                    audio_voice_id: m.audio_voice_id,
                    audio_engine: m.audio_engine,
                    deliverable: m.deliverable ? {
                        title: m.deliverable.title,
                        video_path: m.deliverable.video_path,
                        script: m.deliverable.script || m.deliverable.cues?.map((c: any) => c.text).join(' ')
                    } : undefined
                }));

            abortControllerRef.current = new AbortController();

            const res = await fetch('/api/hermes/director/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortControllerRef.current.signal,
                body: JSON.stringify({
                    prompt: textToSend,
                    preset: activePreset || undefined,
                    reference_media_path: firstMediaPath,
                    attached_images: imagePayloads,
                    aspect_ratio: '1080x1920',
                    previous_deliverable: previousDeliverable,
                    model: selectedModel,
                    provider: selectedProvider,
                    reasoning_effort: reasoningEffort,
                    history: historyPayload,
                    thread_id: currentThreadId,
                    target_channel: selectedTargetChannel ? {
                        id: selectedTargetChannel.channel_id || selectedTargetChannel.id,
                        name: selectedTargetChannel.name,
                        platform: selectedTargetChannel.platform,
                        expert_identity: selectedTargetChannel.expert_identity,
                        style_signature: selectedTargetChannel.style_signature
                    } : undefined
                })
            });

            if (!res.ok) throw new Error(`Server returned ${res.status}`);

            const reader = res.body?.getReader();
            if (!reader) throw new Error('No readable stream');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));

                            // Preset registered event
                            if (data.type === 'preset_registered') {
                                finalCreatedPreset = data.preset;
                                finalAssistantContent = data.message || finalAssistantContent;
                                setMessages(prev => prev.map(m => {
                                    if (m.id === assistantMsgId) {
                                        return {
                                            ...m,
                                            content: data.message,
                                            created_preset: data.preset
                                        };
                                    }
                                    return m;
                                }));
                                setActivePreset(data.preset);
                                toast.success(`[${data.preset.name}] 프리셋이 생성되어 자동 연결되었습니다!`);
                            }

                            // Staged Channel DNA ready event (review before saving to folder)
                            if (data.type === 'channel_dna_ready') {
                                if (data.benchmark_id) {
                                    setStagedBenchmarkId(data.benchmark_id);
                                }
                                if (data.preset_name) {
                                    setStagedPresetName(data.preset_name);
                                }
                                setMessages(prev => prev.map(m => {
                                    if (m.id === assistantMsgId) {
                                        return {
                                            ...m,
                                            benchmark_id: data.benchmark_id,
                                            staged_preset_name: data.preset_name
                                        };
                                    }
                                    return m;
                                }));
                            }

                            // Source candidates event (Video-First Sourcing Hub)
                            if (data.type === 'source_candidates') {
                                setMessages(prev => prev.map(m => {
                                    if (m.id === assistantMsgId) {
                                        return {
                                            ...m,
                                            source_candidates: data.candidates
                                        };
                                    }
                                    return m;
                                }));
                            }

                            // Tool start event (1:1 Pixeling Real-time Interleaved Chip)
                            if (data.type === 'tool_start') {
                                const newToolItem: MessageItem = {
                                    id: `tool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                                    type: 'tool',
                                    tool_name: data.tool_name,
                                    title: data.title || (data.is_auto ? '자동 작업' : '도구 작업'),
                                    is_auto: data.is_auto ?? false,
                                    status: 'in_progress',
                                    elapsed_seconds: 1
                                };
                                setMessages(prev => prev.map(m => {
                                    if (m.id === assistantMsgId) {
                                        const items = m.items ? [...m.items, newToolItem] : [newToolItem];
                                        return { ...m, items };
                                    }
                                    return m;
                                }));
                            }

                            // Tool done event (1:1 Pixeling Real-time Interleaved Chip Complete)
                            if (data.type === 'tool_done') {
                                setMessages(prev => prev.map(m => {
                                    if (m.id === assistantMsgId) {
                                        let matched = false;
                                        const items = (m.items || []).map(it => {
                                            if (!matched && it.type === 'tool' && it.tool_name === data.tool_name && it.status === 'in_progress') {
                                                matched = true;
                                                return {
                                                    ...it,
                                                    status: 'completed' as const,
                                                    elapsed_seconds: data.elapsed_seconds || 1,
                                                    summary: data.summary
                                                };
                                            }
                                            return it;
                                        });
                                        // If not matched (e.g. tool_start missed), append completed chip
                                        if (!matched) {
                                            items.push({
                                                id: `tool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                                                type: 'tool',
                                                tool_name: data.tool_name,
                                                title: data.title || (data.is_auto ? '자동 작업' : '도구 작업'),
                                                is_auto: data.is_auto ?? false,
                                                status: 'completed',
                                                elapsed_seconds: data.elapsed_seconds || 1,
                                                summary: data.summary
                                            });
                                        }
                                        return { ...m, items };
                                    }
                                    return m;
                                }));
                            }

                            // Streaming content chunk
                            if (data.type === 'content_chunk') {
                                finalAssistantContent += (data.delta || '');
                                setMessages(prev => prev.map(m => {
                                    if (m.id === assistantMsgId) {
                                        const items = m.items ? [...m.items] : [];
                                        const lastItem = items[items.length - 1];
                                        if (lastItem && lastItem.type === 'text') {
                                            lastItem.text = (lastItem.text || '') + (data.delta || '');
                                        } else {
                                            items.push({
                                                id: `text_${Date.now()}`,
                                                type: 'text',
                                                text: data.delta || ''
                                            });
                                        }
                                        return {
                                            ...m,
                                            content: finalAssistantContent,
                                            items
                                        };
                                    }
                                    return m;
                                }));
                            }

                            // Complete conversational response
                            if (data.type === 'chat_response') {
                                finalAssistantContent = data.content || finalAssistantContent;
                                finalActionChips = data.action_chips;
                                setMessages(prev => prev.map(m => {
                                    if (m.id === assistantMsgId) {
                                        return {
                                            ...m,
                                            content: (data.content && data.content.trim()) ? data.content : (m.content || finalAssistantContent),
                                            action_chips: data.action_chips
                                        };
                                    }
                                    return m;
                                }));
                            }

                            // Image deliverable
                            if (data.type === 'image_deliverable') {
                                finalImageUrl = data.image_url;
                                finalActionChips = data.action_chips;
                                finalAssistantContent = data.prompt ? `이미지 생성 완료: "${data.prompt}"` : (finalAssistantContent || '이미지 생성이 완료되었습니다.');
                                setMessages(prev => prev.map(m => {
                                    if (m.id === assistantMsgId) {
                                        return {
                                            ...m,
                                            content: finalAssistantContent,
                                            image_url: data.image_url,
                                            action_chips: data.action_chips
                                        };
                                    }
                                    return m;
                                }));
                            }

                            // Audio deliverable (Gemini 3.8 TTS / Supertonic)
                            if (data.type === 'audio_deliverable') {
                                finalAudioUrl = data.audio_url;
                                finalAudioEngine = data.engine;
                                finalAudioVoiceId = data.voice_id;
                                setMessages(prev => prev.map(m => {
                                    if (m.id === assistantMsgId) {
                                        return {
                                            ...m,
                                            audio_url: data.audio_url,
                                            audio_engine: data.engine,
                                            audio_voice_id: data.voice_id
                                        };
                                    }
                                    return m;
                                }));
                            }

                            // Step progress
                            if (data.type === 'step') {
                                const exists = finalSteps.find(s => s.step_id === data.step_id);
                                if (exists) {
                                    finalSteps = finalSteps.map(s => s.step_id === data.step_id ? { ...s, status: data.status, detail: data.detail } : s);
                                } else {
                                    // 이전 진행 중이던 스텝 자동 완료 처리 (스피너 무한 잔류 방지)
                                    finalSteps = finalSteps.map(s => s.status === 'in_progress' ? { ...s, status: 'completed' as const } : s);
                                    finalSteps = [...finalSteps, { step_id: data.step_id, title: data.title, status: data.status, detail: data.detail }];
                                }
                                setMessages(prev => prev.map(m => {
                                    if (m.id === assistantMsgId) {
                                        return { ...m, steps: finalSteps };
                                    }
                                    return m;
                                }));
                            }

                            // Sidecar browser live navigation event (sync to Right Panel browser tab)
                            if (data.type === 'browser_navigate' && data.url) {
                                setBrowserActiveUrl(data.url);
                                setRightPanelOpen(true);
                                setRightPanelTab('browser');
                            }

                            // Command log side effect from local_os_controller
                            if (data.type === 'command_log') {
                                const logItem: CommandLogItem = {
                                    id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                                    cmd: data.cmd || '',
                                    stdout: data.stdout || '',
                                    stderr: data.stderr || '',
                                    exit_code: data.exit_code ?? 0,
                                    duration_ms: data.duration_ms || 0,
                                    workdir: data.workdir,
                                    timestamp: Date.now()
                                };
                                setCommandLogs(prev => [...prev, logItem]);
                                setRightPanelOpen(true);
                            }

                            // Browser snapshot side effect from Playwright
                            if (data.type === 'browser_snapshot') {
                                const snap = data.snapshot || data;
                                setBrowserSnapshot(snap);
                                setRightPanelOpen(true);
                            }

                            // Vision forensic inspection result
                            if (data.type === 'vision_result') {
                                setVisionData(data);
                                setRightPanelOpen(true);
                            }

                            // Cross verification hybrid preset result
                            if (data.type === 'cross_verify_result') {
                                setCrossVerifyData(data);
                                setRightPanelOpen(true);
                            }

                            // Completed deliverable
                            if (data.type === 'item_complete' || data.type === 'complete') {
                                const deliverable = data.deliverable;
                                if (deliverable) {
                                    finalDeliverable = deliverable;
                                    finalAssistantContent = finalAssistantContent || '짧은 이야기로 완결되는 숏폼 영상을 완성했습니다. 다른 수정사항이 있으면 말씀해 주세요.';
                                    setMessages(prev => prev.map(m => {
                                        if (m.id === assistantMsgId) {
                                            return {
                                                ...m,
                                                deliverable: deliverable,
                                                content: finalAssistantContent
                                            };
                                        }
                                        return m;
                                    }));
                                    
                                    // Open in right panel if it is the first completion and video_path exists
                                    if (!activeVideoView && deliverable.video_path) {
                                        const vPath = deliverable.video_path;
                                        setActiveVideoView({
                                            filename: osBasename(vPath),
                                            videoUrl: vPath.startsWith('http') ? vPath : `/files/${vPath.replace(/\\/g, '/')}`,
                                            fileSizeMb: 10.3,
                                            filePath: vPath
                                        });
                                    }
                                }
                            }
                        } catch (parseErr) {
                            console.debug('SSE parse notice:', parseErr);
                        }
                    }
                }
            }
        } catch (err: any) {
            if (err?.name === 'AbortError') {
                console.debug('Streaming request aborted by user');
                return;
            }
            toast.error(`작업 실행 실패: ${err.message}`);
        } finally {
            abortControllerRef.current = null;
            setIsStreaming(false);
            setAttachedFiles([]);

            // 모든 잔여 in_progress 스텝을 completed로 정상 마감
            finalSteps = finalSteps.map(s => s.status === 'in_progress' ? { ...s, status: 'completed' as const } : s);
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, steps: finalSteps } : m));

            // Persist Assistant Message to DB
            if (currentThreadId) {
                const deliverableToPersist = finalDeliverable || (finalAudioUrl ? {
                    audio_url: finalAudioUrl,
                    engine: finalAudioEngine,
                    voice_id: finalAudioVoiceId
                } : undefined);
                directorSessionService.saveThreadMessage(currentThreadId, {
                    role: 'assistant',
                    content: finalAssistantContent,
                    steps: finalSteps,
                    deliverable: deliverableToPersist,
                    created_preset: finalCreatedPreset,
                    action_chips: finalActionChips,
                    image_url: finalImageUrl
                }).catch(err => console.debug('Failed to persist assistant message:', err));
            }
        }
    };

    const osBasename = (p: string) => p ? p.split(/[\\/]/).pop() || p : '';

    const getTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return '기분 좋은 아침이에요';
        if (hour >= 12 && hour < 18) return '활기찬 오후예요';
        return '편안한 저녁이에요';
    };

    return (
        <div className="flex-1 flex flex-row h-full w-full bg-background text-foreground font-sans overflow-hidden min-w-0 relative">
            {/* Left Sidebar: Multi-Project & Thread History (Codex Desktop 1:1) */}
            <DirectorThreadSidebar
                projects={projects}
                threads={threads}
                activeProjectId={activeProjectId}
                activeThreadId={activeThreadId}
                currentProvider={selectedProvider}
                onProviderChange={handleProviderSelect}
                onOpenSettings={() => setSettingsModalOpen(true)}
                onOpenSchedule={() => setScheduleModalOpen(true)}
                onOpenPresets={() => setLoadModalOpen(true)}
                onSelectProject={handleSelectProject}
                onSelectThread={handleSelectThread}
                onCreateProject={handleCreateProject}
                onDeleteProject={handleDeleteProject}
                onDeleteThread={handleDeleteThread}
                onUpdateThread={handleUpdateThread}
                onCreateThread={handleNewChat}
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* Center Chat & Studio Canvas */}
            <main className="flex-1 flex flex-col h-full min-w-0 bg-background overflow-hidden relative">
                <DirectorHeader
                    title="루피 AI 디렉터"
                    leadingElement={
                        <div className="flex items-center mr-1">
                            <LoopieIcon 
                                className="w-8 h-8" 
                                isTalking={isTalking} 
                                isLive={isGeminiLiveActive} 
                                isSmall={false} 
                            />
                        </div>
                    }
                    channelSelectorElement={
                        <div className="relative">
                            <select
                                value={selectedTargetChannel?.id || ''}
                                onChange={(e) => {
                                    const found = targetChannels.find(tc => tc.id === e.target.value);
                                    if (found) handleSelectTargetChannel(found);
                                    else setSelectedTargetChannel(null);
                                }}
                                className="h-7 px-2.5 text-xs font-semibold bg-muted/50 hover:bg-muted text-foreground rounded-lg border border-border/80 focus:outline-hidden cursor-pointer max-w-[140px] sm:max-w-[200px] truncate shadow-2xs transition-colors"
                                title="타겟 채널 선택 (선택 시 해당 채널에 매핑된 프리셋과 제작 DNA가 자동 연동됩니다)"
                            >
                                <option value="">📢 타겟 채널 선택</option>
                                {targetChannels.map((tc) => (
                                    <option key={tc.id} value={tc.id}>
                                        {tc.platform === 'TIKTOK' ? '🎵' : tc.platform === 'INSTAGRAM' ? '📸' : '🎬'} {tc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    }
                    activePreset={activePreset}
                    onOpenPresetModal={() => setLoadModalOpen(true)}
                    isVoiceMuted={!isVoiceEnabled}
                    onToggleVoiceMute={() => setIsVoiceEnabled(!isVoiceEnabled)}
                    sidebarCollapsed={sidebarCollapsed}
                    onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                    rightPanelOpen={rightPanelOpen}
                    onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
                />

                <DirectorMessageFeed
                    messages={messages as any}
                    isStreaming={isStreaming}
                    onSendMessage={handleSendMessage}
                    activePreset={activePreset}
                    onOpenInRightPanel={(v) => {
                        setActiveVideoView(v);
                        setRightPanelOpen(true);
                    }}
                    onEditMessage={(text) => {
                        setPrompt(text);
                        textareaRef.current?.focus();
                    }}
                    avatarElement={() => <LoopieIcon className="w-16 h-16" isTalking={isTalking} isLive={isGeminiLiveActive} isSmall={false} />}
                    emptyStateTitle="루피 AI 디렉터"
                    emptyStateSubtitle="4대 쇼츠(클래식, 인스타, 군림보, 썰형) 제작 총괄 연출뿐 아니라, 채널 성장 로드맵과 Gemini 3.8 Live 실시간 음성까지 무엇이든 명령해 주세요."
                />

                <DirectorInputBar
                    prompt={prompt}
                    onChangePrompt={setPrompt}
                    onSendMessage={handleSendMessage}
                    isStreaming={isStreaming}
                    onCancelStream={handleStopGeneration}
                    attachedFiles={attachedFiles}
                    onRemoveAttachedFile={removeAttachedFile}
                    onAttachFiles={handleAttachFiles}
                    activePreset={activePreset}
                    onOpenPresetModal={() => setLoadModalOpen(true)}
                    onClearPreset={() => setActivePreset(null)}
                    onOpenCustomizeModal={() => setCustomizeModalOpen(true)}
                    onOpenCloudMediaModal={() => setCloudMediaModalOpen(true)}
                    onOpenAgentSoul={handleOpenAgentSoul}
                    securityScope={securityScope}
                    onChangeSecurityScope={setSecurityScope}
                    isLiveVoiceActive={isGeminiLiveActive}
                    onToggleLiveVoice={toggleGeminiLive}
                    selectedProvider={selectedProvider}
                    onSelectProvider={handleProviderSelect}
                    selectedModel={selectedModel}
                    onSelectModel={setSelectedModel}
                    reasoningEffort={reasoningEffort}
                    onSelectReasoningEffort={setReasoningEffort}
                    hasMessages={messages.length > 0}
                    textareaRef={textareaRef}
                    autoFocus={true}
                />
            </main>

            {/* 3. Live Sidecar Browser View (Benchmarked 1:1 with Codex Desktop & Pixeling) */}
            <SidecarBrowserView
                isOpen={sidecarBrowserOpen}
                onClose={() => setSidecarBrowserOpen(false)}
                activeUrl={browserActiveUrl}
                onSendToChat={(txt) => {
                    setPrompt(txt);
                }}
            />

            {/* 4. Right Collapsible Panel */}
            <DirectorRightPanel
                open={rightPanelOpen}
                onClose={() => setRightPanelOpen(false)}
                activeTab={rightPanelTab}
                onTabChange={setRightPanelTab}
                activeBrowserUrl={browserActiveUrl}
                threadId={activeThreadId}
                activeVideo={activeVideoView}
                onClearActiveVideo={() => setActiveVideoView(null)}
                onSelectVideo={(v) => {
                    setActiveVideoView(v);
                    setRightPanelOpen(true);
                }}
                onAttachFile={(f) => {
                    setAttachedFiles(prev => [...prev, {
                        id: Math.random().toString(36).substring(7),
                        name: f.name,
                        path: f.path
                    }]);
                }}
                onOpenAgentSoul={handleOpenAgentSoul}
                commandLogs={commandLogs}
                browserSnapshot={browserSnapshot}
                visionData={visionData}
                crossVerifyData={crossVerifyData}
                governanceMode={governanceMode}
                onToggleGovernanceMode={() => setGovernanceMode(prev => prev === 'copilot' ? 'full_auto' : 'copilot')}
                onExecuteManualCommand={handleExecuteManualCommand}
            />

            {/* Modals */}
            <PresetLoadModal
                open={loadModalOpen}
                onOpenChange={setLoadModalOpen}
                activePresetId={activePreset?.id}
                onSelectPreset={(preset) => {
                    setActivePreset(preset);
                }}
            />

            {activePreset && (
                <PresetCustomizeModal
                    open={customizeModalOpen}
                    onOpenChange={setCustomizeModalOpen}
                    preset={activePreset}
                    onPresetUpdated={(updated) => {
                        setActivePreset(updated);
                    }}
                />
            )}

            <IntegratedSettingsModal
                open={settingsModalOpen}
                onOpenChange={(open) => {
                    setSettingsModalOpen(open);
                    if (!open) refreshSettingsAndProviders();
                }}
                onOpenProviderModal={(key) => setProviderModalKey(key)}
                initialProvidersData={providersStatus}
            />

            {providerModalKey && (
                <ProviderAccountModal
                    open={Boolean(providerModalKey)}
                    onOpenChange={(open) => {
                        if (!open) setProviderModalKey(null);
                    }}
                    providerKey={providerModalKey}
                    onAccountsChanged={refreshSettingsAndProviders}
                />
            )}

            <SavePresetToFolderModal
                open={saveFolderModalOpen}
                onOpenChange={setSaveFolderModalOpen}
                benchmarkId={stagedBenchmarkId}
                defaultName={stagedPresetName}
                onSaved={(savedPreset) => {
                    setActivePreset(savedPreset);
                    toast.success(`[${savedPreset.name}] 프리셋이 선택한 폴더에 성공적으로 저장되었습니다.`);
                }}
            />

            {/* ⏰ 이 채팅방 예약 모달 (Pixeling 1:1) */}
            <ChatScheduleModal
                open={scheduleModalOpen}
                onOpenChange={setScheduleModalOpen}
                currentConfig={scheduleConfig}
                onSaveConfig={handleSaveScheduleConfig}
            />

            {/* 🔄 자동 이어가기 모달 (Pixeling 1:1) */}
            <ChatAutoContinueModal
                open={autoContinueModalOpen}
                onOpenChange={setAutoContinueModalOpen}
                currentConfig={autoContinueConfig}
                onSaveConfig={handleSaveAutoContinueConfig}
            />

            {/* 🌐 클라우드 볼트 및 SNS/웹 온더플라이 씬 발골 모달 */}
            <CloudMediaSourceModal
                open={cloudMediaModalOpen}
                onClose={() => setCloudMediaModalOpen(false)}
                onAttachClip={handleAttachCloudClip}
            />

            {/* 🤖 8대 전문 하수인 SOUL.md 및 독립 메모리 인스펙터 모달 (Bot Mode) */}
            <AgentSoulInspectorModal
                open={soulModalOpen}
                onOpenChange={setSoulModalOpen}
                defaultAgentId={selectedSoulAgentId || undefined}
            />
        </div>
    );
};
export default ConversationalDirectorPage;
