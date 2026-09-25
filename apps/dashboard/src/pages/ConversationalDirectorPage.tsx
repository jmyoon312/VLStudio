import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
    Volume2
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
import { DirectorRightPanel, ActiveVideoView } from '@/components/director/DirectorRightPanel';
import { CommandLogItem, BrowserSnapshotData, VisionForensicData, CrossVerifyData } from '@/components/director/LiveAutonomousWorkspacePanel';
import { ModelSelectorPopover, ReasoningEffort } from '@/components/director/ModelSelectorPopover';
import { DirectorThreadSidebar } from '@/components/director/DirectorThreadSidebar';
import { SidecarBrowserView } from '@/components/director/SidecarBrowserView';
import { directorSessionService, DirectorProject, DirectorThread, DirectorMessageData } from '@/services/directorSessionService';

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
    audio_url?: string;
    audio_engine?: string;
    audio_voice_id?: string;
    timestamp: number;
}

interface AttachedMedia {
    id: string;
    name: string;
    path: string;
    isUrl?: boolean;
}

const QUICK_PROMPTS = [
    { label: "🔥 2026 최신 숏폼 트렌드 키워드 분석", text: "현재 2026년 9월 기준 유튜브 쇼츠 및 틱톡에서 가장 폭발적인 최신 숏폼 트렌드 키워드와 인기 포맷을 마크다운 표로 깔끔하게 정리해줘" },
    { label: "📈 실시간 급상승 바이럴 아이템 발굴", text: "시청 지속시간(Watch Time) 65% 이상 달성 가능한 실시간 급상승 숏폼 기획 아이템 3개와 3초 훅을 추천해줘" },
    { label: "🎬 유튜브 영상 링크로 프리셋 & 대본 추출", text: "https://www.youtube.com/watch?v=oqe7G6gcWBo 다운받아서 프리셋으로 만들고 3단 훅 대본 작성해줘" },
    { label: "📝 시청자 이탈 없는 30초 반전 쇼츠 기획", text: "시청자의 고정관념을 깨고 리텐션을 극대화하는 30초 반전 숏폼 대본과 컷 전환 연출안 짜줘" },
];

export const ConversationalDirectorPage: React.FC = () => {
    const navigate = useNavigate();

    // Chat states
    // Project Folders & Thread Sessions State
    const [projects, setProjects] = useState<DirectorProject[]>([]);
    const [threads, setThreads] = useState<DirectorThread[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string>('proj_default');
    const [activeThreadId, setActiveThreadId] = useState<string>('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [prompt, setPrompt] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);

    // Selected Preset & Attachments (Chat-Centric Chips)
    const [activePreset, setActivePreset] = useState<SovereignPreset | null>(null);
    const [attachedFiles, setAttachedFiles] = useState<AttachedMedia[]>([]);

    // Model & Security selections
    const [selectedProvider, setSelectedProvider] = useState<'codex' | 'chatgpt_web' | 'gemini' | 'claude' | 'grok' | 'omniroute'>('codex');
    const [selectedModel, setSelectedModel] = useState('Codex Astra 6.0');
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
            codex: 'Codex Astra 6.0',
            chatgpt_web: 'Codex Astra 6.0 (Web)',
            gemini: 'Gemini 3.8 Flash',
            claude: 'Claude 3.7 Sonnet',
            grok: 'Grok 3 Reasoning',
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

    // Right Panel & Sidecar Browser state (Codex Desktop 1:1)
    const [rightPanelOpen, setRightPanelOpen] = useState(false);
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
        grok: { connected: false }
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
            }
        } catch (e) {
            setMessages([]);
            setPrompt('');
            setAttachedFiles([]);
            toast.success('새 채팅 세션이 시작되었습니다.');
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

    // File attachments
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newMedia: AttachedMedia[] = Array.from(files).map((f) => ({
            id: Math.random().toString(36).substring(7),
            name: f.name,
            path: (f as any).path || URL.createObjectURL(f),
        }));

        setAttachedFiles(prev => [...prev, ...newMedia]);
        toast.success(`${files.length}개 파일이 첨부되었습니다.`);
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

        // Ensure active thread exists
        let currentThreadId = activeThreadId;
        if (!currentThreadId) {
            try {
                const res = await directorSessionService.createThread({
                    project_id: activeProjectId || 'proj_default',
                    title: textToSend.slice(0, 24) || '새 대화',
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
        }

        const userMsgId = Date.now().toString();
        const userMsg: ChatMessage = {
            id: userMsgId,
            role: 'user',
            content: textToSend,
            preset_name: activePreset?.name,
            timestamp: Date.now(),
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

        // Persist User Message to DB
        if (currentThreadId) {
            directorSessionService.saveThreadMessage(currentThreadId, {
                role: 'user',
                content: textToSend,
                preset_id: activePreset?.id
            }).catch(err => console.debug('Failed to persist user message:', err));
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
            const firstMediaPath = attachedFiles[0]?.path || undefined;
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
                    aspect_ratio: '1080x1920',
                    previous_deliverable: previousDeliverable,
                    model: selectedModel,
                    provider: selectedProvider,
                    reasoning_effort: reasoningEffort,
                    history: historyPayload
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
                                            content: data.content,
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

                            // Sidecar browser live navigation event (Codex/Pixeling 1:1)
                            if (data.type === 'browser_navigate' && data.url) {
                                setBrowserActiveUrl(data.url);
                                setSidecarBrowserOpen(true);
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
        if (hour >= 5 && hour < 12) return '대표님, 활기찬 아침이에요';
        if (hour >= 12 && hour < 18) return '대표님, 알찬 오후예요';
        return '대표님, 편안한 저녁이에요';
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
                onSelectProject={handleSelectProject}
                onSelectThread={handleSelectThread}
                onCreateProject={handleCreateProject}
                onDeleteProject={handleDeleteProject}
                onDeleteThread={handleDeleteThread}
                onCreateThread={handleNewChat}
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* Center Chat & Studio Canvas */}
            <main className="flex-1 flex flex-col h-full min-w-0 bg-background overflow-hidden relative">
                {/* Modern Director Toolbar Header (Codex Desktop 1:1 Clean Header) */}
                <header className="h-12 border-b border-border/60 px-4 flex items-center justify-between shrink-0 bg-card/50 backdrop-blur-md z-10">
                    {/* Left: Active Thread Title & Preset Status */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-semibold text-xs sm:text-sm text-foreground truncate max-w-[200px] sm:max-w-[320px]">
                            {threads.find(t => t.id === activeThreadId)?.title || '신규 연출 세션'}
                        </span>

                        {activePreset ? (
                            <div 
                                onClick={() => setCustomizeModalOpen(true)}
                                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-xs cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                                title="클릭하여 쇼츠 스타일 편집 열기"
                            >
                                <SlidersHorizontal className="w-3 h-3 text-primary shrink-0" />
                                <span className="font-medium text-foreground truncate max-w-[120px]">{activePreset.name}</span>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLoadModalOpen(true)}
                                className="h-7 text-xs border-dashed gap-1 text-muted-foreground shrink-0 px-2"
                            >
                                <SlidersHorizontal className="w-3 h-3" />
                                <span>프리셋 선택</span>
                            </Button>
                        )}
                    </div>

                    {/* Right: Sidecar Browser Toggle, Video Panel Toggle & Quick Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Live Sidecar Browser Toggle Button */}
                        <Button
                            variant={sidecarBrowserOpen ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSidecarBrowserOpen(!sidecarBrowserOpen)}
                            className={`h-7 px-2.5 text-xs font-medium gap-1.5 rounded-lg shadow-2xs transition-all ${
                                sidecarBrowserOpen ? 'bg-primary text-primary-foreground font-semibold' : 'text-foreground hover:bg-muted'
                            }`}
                            title="우측 실시간 내장 브라우저 뷰 열기/닫기"
                        >
                            <Globe className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">실시간 브라우저</span>
                        </Button>

                        {/* Video Right Panel Toggle */}
                        {activeVideoView && (
                            <Button
                                variant={rightPanelOpen ? "default" : "outline"}
                                size="sm"
                                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                                className="h-7 px-2.5 text-xs font-medium gap-1.5 rounded-lg shadow-2xs"
                            >
                                <PanelRight className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">영상</span>
                            </Button>
                        )}

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleNewChat}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                            title="새 대화 시작"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSettingsModalOpen(true)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            title="설정"
                        >
                            <Settings className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </header>

                {/* Chat Feed */}
                <div 
                    ref={chatContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-4 py-6 relative"
                >
                    <div className="max-w-4xl mx-auto w-full space-y-6">
                    {messages.length === 0 ? (
                        /* Initial Blank State (Benchmarked from media_1790185842766 & media_1790184066110) */
                        <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-12 select-none">
                            {/* Star Mascot */}
                            <div className="w-16 h-16 rounded-3xl bg-blue-500 shadow-xl shadow-blue-500/20 flex items-center justify-center mb-4 transform hover:scale-105 transition-transform animate-pulse">
                                <Sparkles className="w-8 h-8 text-white fill-white" />
                            </div>

                            <span className="text-sm text-muted-foreground font-medium mb-1.5">
                                {getTimeGreeting()}
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight mb-3">
                                무엇을 만들까요?
                            </h2>
                            <p className="text-sm text-muted-foreground max-w-lg mb-8 leading-relaxed">
                                만들고 싶은 영상이나 맡기고 싶은 작업을 말로 설명해 주세요. 프리셋을 선택하고 영상을 넣으면 즉시 쇼츠가 완성됩니다.
                            </p>

                            {/* Quick Prompt Chips */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                                {QUICK_PROMPTS.map((qp, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSendMessage(qp.text)}
                                        className="p-3.5 rounded-xl border border-border/70 hover:border-primary/50 bg-card hover:bg-muted/40 transition-all text-sm font-semibold text-foreground group shadow-2xs"
                                    >
                                        <span className="block text-primary text-xs font-mono mb-0.5">추천 워크플로우</span>
                                        <span className="group-hover:text-primary transition-colors">{qp.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Active Chat Feed (Benchmarked 1:1 with Pixeling 1.0.112) */
                        messages.map((msg) => (
                            <div key={msg.id} className="space-y-3">
                                {msg.role === 'user' ? (
                                    <div className="flex justify-end group/user relative">
                                        <div className="flex flex-col items-end">
                                            {/* Hover Actions Toolbar for User Question */}
                                            <div className="opacity-0 group-hover/user:opacity-100 transition-opacity duration-150 flex items-center gap-1 mb-1 px-1 select-none">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyMessage(msg.id, msg.content || '')}
                                                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/80 hover:bg-muted text-foreground/80 hover:text-foreground border border-border/60 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                                                    title="질문 복사"
                                                >
                                                    {copiedId === msg.id ? (
                                                        <>
                                                            <Check className="w-3 h-3 text-emerald-500" />
                                                            <span className="text-emerald-500">복사됨</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-3 h-3" />
                                                            <span>복사</span>
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditUserMessage(msg.content || '')}
                                                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/80 hover:bg-muted text-foreground/80 hover:text-foreground border border-border/60 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                                                    title="질문을 입력창으로 되돌려 수정"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                    <span>수정/되돌리기</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleResendUserMessage(msg.content || '')}
                                                    disabled={isStreaming}
                                                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/80 hover:bg-muted text-foreground/80 hover:text-foreground border border-border/60 transition-all flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                    title="이 질문을 다시 실행"
                                                >
                                                    <RotateCcw className="w-3 h-3" />
                                                    <span>다시 전송</span>
                                                </button>
                                            </div>

                                            {/* User Bubble */}
                                            <div className="max-w-2xl px-5 py-3.5 rounded-3xl bg-[#2563eb] text-white text-sm leading-relaxed font-normal shadow-xs">
                                                {msg.preset_name && (
                                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-medium mb-1.5 backdrop-blur-xs max-w-full">
                                                        <Sliders className="w-3 h-3 shrink-0" />
                                                        <span className="truncate">프리셋: {msg.preset_name}</span>
                                                    </div>
                                                )}
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-start w-full">
                                        <div className="max-w-3xl w-full py-2 space-y-3.5 pl-1">
                                            {/* Created Preset Notice */}
                                            {msg.created_preset && (
                                                <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-2xs">
                                                    <div className="flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4 text-emerald-500" />
                                                        <span className="font-bold text-xs">신규 프리셋 생성 완료: [{msg.created_preset.name}]</span>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            setCustomizeModalOpen(true);
                                                        }}
                                                        className="h-6 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    >
                                                        프리셋 검토/수정
                                                    </Button>
                                                </div>
                                            )}

                                            {/* 1:1 Pixeling Accordion Header: 작업 과정 명령 N번 실행 · 도구 M번 사용 ∨ */}
                                            {((msg.steps && msg.steps.length > 0) || (msg.items && msg.items.some(it => it.type === 'tool'))) && (() => {
                                                const isExpanded = expandedStepMsgIds[msg.id] ?? false;
                                                const toolCount = (msg.items?.filter(it => it.type === 'tool').length) || (msg.steps?.length) || 0;
                                                const commandCount = Math.max(1, Math.floor(toolCount / 2)) || 1;

                                                return (
                                                    <div className="space-y-2 select-none">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleStepExpand(msg.id)}
                                                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer group"
                                                        >
                                                            <span className="font-semibold text-foreground/90">작업 과정</span>
                                                            <span className="text-muted-foreground/80 font-normal">명령 {commandCount}번 실행 · 도구 {toolCount}번 사용</span>
                                                            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                        </button>

                                                        {/* Expanded Detailed Steps Dropdown */}
                                                        {isExpanded && (
                                                            <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border/40 animate-in fade-in-50 duration-200">
                                                                {(msg.steps || []).map((st, sIdx) => {
                                                                    const isGrounding = st.step_id === 'realtime_grounding';
                                                                    return (
                                                                        <div 
                                                                            key={sIdx} 
                                                                            className={`flex items-start gap-2 text-xs p-1.5 rounded-lg transition-colors ${
                                                                                isGrounding ? 'bg-blue-500/10 border border-blue-500/25 text-blue-950 dark:text-blue-200' : ''
                                                                            }`}
                                                                        >
                                                                            {st.status === 'completed' ? (
                                                                                isGrounding ? (
                                                                                    <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                                                                ) : (
                                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                                                                )
                                                                            ) : st.status === 'in_progress' ? (
                                                                                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0 mt-0.5" />
                                                                            ) : (
                                                                                <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0 mt-0.5" />
                                                                            )}
                                                                            <div className="flex-1">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="font-semibold text-foreground">{st.title}</span>
                                                                                    {isGrounding && (
                                                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-300 font-mono font-bold">실시간 검색</span>
                                                                                    )}
                                                                                </div>
                                                                                {st.detail && (
                                                                                    <p className="text-[11px] text-muted-foreground whitespace-pre-line mt-0.5">
                                                                                        {st.detail}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* Deliverable: Embedded Video Player (Benchmarked from media_1790185737012) */}
                                            {msg.deliverable && msg.deliverable.video_path && (
                                                <div className="space-y-2">
                                                    <EmbeddedVideoPlayer
                                                        filename={osBasename(msg.deliverable.video_path)}
                                                        videoUrl={msg.deliverable.video_path.startsWith('http') ? msg.deliverable.video_path : `/files/${msg.deliverable.video_path.replace(/\\/g, '/')}`}
                                                        fileSizeMb={msg.deliverable.file_size_mb || 10.3}
                                                        duration={msg.deliverable.duration_sec ? `${Math.floor(msg.deliverable.duration_sec / 60)}:${Math.floor(msg.deliverable.duration_sec % 60).toString().padStart(2, '0')}` : "0:21"}
                                                        timeElapsedText={msg.deliverable.elapsed_seconds ? `${Math.floor(msg.deliverable.elapsed_seconds / 60)}분 ${Math.round(msg.deliverable.elapsed_seconds % 60)}초 동안 작업했어요` : "완료되었습니다"}
                                                        description={msg.deliverable.title ? `[${msg.deliverable.title}] 장면을 완성했습니다. 다른 수정사항이 있으면 말씀해 주세요.` : "요청하신 스타일에 맞춰 완결되는 영상을 제작했습니다."}
                                                        filePath={msg.deliverable.video_path}
                                                        audioPath={msg.deliverable.audio_path}
                                                        cues={msg.deliverable.cues}
                                                        style={msg.deliverable.style}
                                                        onOpenInRightPanel={handleOpenInRightPanel}
                                                    />

                                                    {/* Video Deliverable Action Chips (Revision & Preset Save) */}
                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                        <span className="text-[11px] font-semibold text-muted-foreground mr-1">피드백 튜닝:</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendMessage("자막 크기 15% 더 키워줘")}
                                                            className="px-2.5 py-1 rounded-lg text-xs bg-muted/70 hover:bg-muted text-foreground border border-border/70 hover:border-primary/50 transition-all font-medium flex items-center gap-1 cursor-pointer shadow-2xs"
                                                        >
                                                            <span>자막 더 크게</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendMessage("자막 색깔 노란색으로 강조해줘")}
                                                            className="px-2.5 py-1 rounded-lg text-xs bg-muted/70 hover:bg-muted text-foreground border border-border/70 hover:border-primary/50 transition-all font-medium flex items-center gap-1 cursor-pointer shadow-2xs"
                                                        >
                                                            <span>🟡 노란 자막</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendMessage("상단 제목 노란색 박스로 강조해줘")}
                                                            className="px-2.5 py-1 rounded-lg text-xs bg-muted/70 hover:bg-muted text-foreground border border-border/70 hover:border-primary/50 transition-all font-medium flex items-center gap-1 cursor-pointer shadow-2xs"
                                                        >
                                                            <span>🏷️ 타이틀 박스 강조</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendMessage("화면 115% 줌인해줘")}
                                                            className="px-2.5 py-1 rounded-lg text-xs bg-muted/70 hover:bg-muted text-foreground border border-border/70 hover:border-primary/50 transition-all font-medium flex items-center gap-1 cursor-pointer shadow-2xs"
                                                        >
                                                            <span>🔍 115% 줌인</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendMessage("영상 재생 배속 1.2배속으로 빠르게 해줘")}
                                                            className="px-2.5 py-1 rounded-lg text-xs bg-muted/70 hover:bg-muted text-foreground border border-border/70 hover:border-primary/50 transition-all font-medium flex items-center gap-1 cursor-pointer shadow-2xs"
                                                        >
                                                            <span>⚡ 1.2배속</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendMessage("이 영상 스타일로 프리셋 저장해줘")}
                                                            className="px-2.5 py-1 rounded-lg text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/40 transition-all font-bold flex items-center gap-1 cursor-pointer ml-auto shadow-2xs"
                                                        >
                                                            <BookmarkPlus className="w-3.5 h-3.5" />
                                                            <span>💾 이 스타일 프리셋 저장</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Generated Image Deliverable */}
                                            {msg.image_url && (
                                                <div className="relative group max-w-sm rounded-xl overflow-hidden border border-border shadow-md my-2">
                                                    <img 
                                                        src={msg.image_url} 
                                                        alt="AI Generated" 
                                                        className="w-full h-auto object-cover max-h-96 rounded-xl hover:scale-[1.01] transition-transform duration-200" 
                                                    />
                                                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <a 
                                                            href={msg.image_url} 
                                                            target="_blank" 
                                                            rel="noreferrer" 
                                                            className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-xs text-xs flex items-center gap-1 shadow-sm"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                            원본 보기
                                                        </a>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Generated Audio Deliverable (Gemini 3.8 / Supertonic) */}
                                            {msg.audio_url && (
                                                <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs max-w-md space-y-2 my-2 select-none">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                                                <Volume2 className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                                    <span>생성된 음성 파일</span>
                                                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-primary/15 text-primary">
                                                                        {msg.audio_engine === 'gemini' ? 'Gemini 3.8 Flash TTS' : (msg.audio_engine || 'Supertonic')}
                                                                    </span>
                                                                </div>
                                                                <div className="text-[11px] text-muted-foreground">
                                                                    보이스: {msg.audio_voice_id || 'Puck'} · 고음질 음향
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <audio 
                                                        controls 
                                                        src={msg.audio_url} 
                                                        className="w-full h-8 rounded-lg outline-hidden" 
                                                        preload="auto"
                                                    />
                                                </div>
                                            )}

                                            {/* 1:1 Pixeling ReAct Interleaved Message Items (Text & Tool Chips) */}
                                            {msg.items && msg.items.length > 0 ? (
                                                <div className="space-y-2 select-text">
                                                    {msg.items.map((it, itIdx) => {
                                                        if (it.type === 'tool') {
                                                            return (
                                                                <div 
                                                                    key={it.id || itIdx} 
                                                                    className="flex items-center gap-1.5 text-xs text-muted-foreground/80 font-normal select-none py-0.5"
                                                                >
                                                                    {it.is_auto ? (
                                                                        <Folder className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                                                                    ) : (
                                                                        <Wrench className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                                                                    )}
                                                                    <span>{it.title || (it.is_auto ? '자동 작업' : '도구 작업')}</span>
                                                                    <span className="text-muted-foreground/60">{it.elapsed_seconds || 1}초</span>
                                                                </div>
                                                            );
                                                        }
                                                        if (it.type === 'text' && it.text) {
                                                            return (
                                                                <div key={it.id || itIdx} className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed font-sans break-words">
                                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                        {it.text}
                                                                    </ReactMarkdown>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                </div>
                                            ) : (
                                                /* Fallback for restored thread messages without items array */
                                                <>
                                                    {/* Fallback Tool Chips */}
                                                    {msg.steps && msg.steps.length > 0 && !expandedStepMsgIds[msg.id] && (
                                                        <div className="space-y-1 py-0.5 select-none">
                                                            {msg.steps.map((st, sIdx) => {
                                                                const isAuto = st.step_id?.includes('auto') || st.step_id?.includes('grounding');
                                                                return (
                                                                    <div key={sIdx} className="flex items-center gap-1.5 text-xs text-muted-foreground/80 font-normal">
                                                                        {isAuto ? (
                                                                            <Folder className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                                                                        ) : (
                                                                            <Wrench className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                                                                        )}
                                                                        <span>{isAuto ? '자동 작업' : '도구 작업'}</span>
                                                                        <span className="text-muted-foreground/60">1초</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Fallback Assistant Text Content */}
                                                    {msg.content && (
                                                        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed font-sans break-words select-text">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {msg.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* Copy Assistant Message Button */}
                                            {(msg.content || (msg.items && msg.items.some(it => it.text))) && (
                                                <div className="flex justify-end pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyMessage(msg.id, msg.content || msg.items?.filter(it => it.text).map(it => it.text).join('\n\n') || '')}
                                                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-muted/80 cursor-pointer transition-colors"
                                                        title="답변 복사"
                                                    >
                                                        {copiedId === msg.id ? (
                                                            <>
                                                                <Check className="w-3 h-3 text-emerald-500" />
                                                                <span className="text-emerald-500 font-medium">복사됨</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-3 h-3" />
                                                                <span>복사</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}

                                            {/* 1:1 Pixeling Live In-Progress Timer & Stop Button */}
                                            {isStreaming && msg.id === messages[messages.length - 1]?.id && (
                                                <div className="pt-2 flex items-center gap-2">
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-medium shadow-2xs animate-in fade-in">
                                                        <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                                                        <span>작업 중 {streamingElapsed}초</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleStopGeneration}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 transition-all cursor-pointer shadow-2xs animate-in fade-in"
                                                        title="실행 중인 작업 즉시 중단"
                                                    >
                                                        <Square className="w-3 h-3 fill-current" />
                                                        <span>작업 중단</span>
                                                    </button>
                                                </div>
                                            )}

                                            {/* 12편 정밀 분석 완료 알림 및 폴더 저장 바로가기 카드 */}
                                            {msg.benchmark_id && (
                                                <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                                            <CheckCircle2 className="w-5 h-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-xs flex items-center gap-1.5">
                                                                <span>12편 전편 정밀 실측 분석 100% 완료</span>
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold">완결</span>
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground truncate">원하시는 프리셋 보관함 폴더를 선택하여 저장하거나 바로 대본·영상을 제작하세요.</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                setStagedBenchmarkId(msg.benchmark_id!);
                                                                if (msg.staged_preset_name) setStagedPresetName(msg.staged_preset_name);
                                                                setSaveFolderModalOpen(true);
                                                            }}
                                                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs gap-1"
                                                        >
                                                            <FolderPlus className="w-3.5 h-3.5" />
                                                            <span>폴더에 프리셋 저장</span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Interactive Action Chips */}
                                            {msg.action_chips && msg.action_chips.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40 mt-2">
                                                    {msg.action_chips.map((chip, cIdx) => (
                                                        <button
                                                            key={cIdx}
                                                            type="button"
                                                            onClick={() => {
                                                                if (chip.includes('인스펙터') || chip.includes('프리셋 검토') || chip.includes('프리셋 수정') || chip.includes('스타일 편집') || chip.includes('스타일 상세')) {
                                                                    setCustomizeModalOpen(true);
                                                                } else if (chip.includes('저장') && (chip.includes('프리셋') || chip.includes('폴더'))) {
                                                                    setSaveFolderModalOpen(true);
                                                                } else {
                                                                    handleSendMessage(chip);
                                                                }
                                                            }}
                                                            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xs flex items-center gap-1.5 cursor-pointer"
                                                        >
                                                            <span>{chip}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Floating Scroll to Bottom Button */}
                    {showScrollBottom && (
                        <button
                            type="button"
                            onClick={scrollToBottom}
                            className="sticky bottom-4 float-right mr-4 z-20 p-2.5 rounded-full bg-card/95 hover:bg-card text-foreground border border-border/80 shadow-lg backdrop-blur-xs transition-all hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer animate-in fade-in"
                            title="최신 메시지로 스크롤"
                        >
                            <ChevronDown className="w-4 h-4 text-primary" />
                        </button>
                    )}
                </div>

                {/* 3. Center Bottom Floating Composer (Benchmarked from media_1790186105706 & media_1790184066110) */}
                <div className="p-4 px-4 md:px-8 bg-gradient-to-t from-background via-background to-transparent shrink-0">
                    <div className="max-w-4xl mx-auto rounded-2xl border border-border/80 bg-card shadow-xl p-3 space-y-2">
                        {/* Top Chips Row: Preset Chip & Attached Files */}
                        <div className="flex flex-wrap items-center gap-1.5 px-1">
                            {/* Active Preset Chip */}
                            {activePreset && (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-semibold">
                                    <Sliders className="w-3 h-3 text-blue-500" />
                                    <span>프리셋: {activePreset.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => setActivePreset(null)}
                                        className="hover:text-foreground ml-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            {/* Attached Files Chips */}
                            {attachedFiles.map((f) => (
                                <div
                                    key={f.id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-foreground border border-border text-xs font-medium"
                                >
                                    <Paperclip className="w-3 h-3 text-muted-foreground" />
                                    <span className="truncate max-w-[140px]">{f.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeAttachedFile(f.id)}
                                        className="text-muted-foreground hover:text-foreground ml-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Textarea Input with Clear button and CJK IME guard */}
                        <div className="relative">
                            <Textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.nativeEvent.isComposing) return;
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder={messages.length > 0 ? "이어서 요청하거나 궁금한 것을 물어보세요" : "만들고 싶은 영상이나 맡기고 싶은 작업을 말로 설명해 주세요."}
                                className="min-h-[72px] max-h-48 resize-none border-0 shadow-none focus-visible:ring-0 p-2 pr-8 text-sm sm:text-base leading-relaxed bg-transparent"
                            />
                            {prompt && (
                                <button
                                    type="button"
                                    onClick={() => setPrompt('')}
                                    className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 transition-colors cursor-pointer"
                                    title="입력 내용 지우기"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Bottom Toolbar Row */}
                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                            <div className="flex items-center gap-2">
                                {/* Attach File */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="video/*,audio/*,image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
                                    title="파일 또는 미디어 첨부 (+)"
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>

                                {/* Authorization Scope: '나 대신 승인' (Codex Desktop 1:1) */}
                                <div className="relative">
                                    <select
                                        value={securityScope}
                                        onChange={(e) => setSecurityScope(e.target.value)}
                                        className="h-8 px-2.5 text-xs bg-muted/40 hover:bg-muted text-foreground font-medium rounded-xl border border-border/70 focus:outline-hidden cursor-pointer"
                                    >
                                        <option value="모두 허용">🛡️ 나 대신 승인</option>
                                        <option value="작업 폴더 허용">🛡️ 작업 폴더만 승인</option>
                                        <option value="읽기 전용">🛡️ 확인 후 실행</option>
                                    </select>
                                </div>

                                {/* Preset Selector & Inspector directly in Composer Toolbar */}
                                {activePreset ? (
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setCustomizeModalOpen(true)}
                                            className="h-8 px-2.5 rounded-xl text-xs gap-1.5 font-semibold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all flex items-center shadow-2xs cursor-pointer"
                                            title="클릭하여 프리셋 스타일 상세 설정 열기"
                                        >
                                            <Sliders className="w-3.5 h-3.5 text-primary shrink-0" />
                                            <span className="truncate max-w-[120px]">{activePreset.name}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActivePreset(null)}
                                            className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted cursor-pointer"
                                            title="프리셋 선택 해제"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setLoadModalOpen(true)}
                                        className="h-8 px-2.5 rounded-xl text-xs gap-1.5 font-medium border-border/80 hover:bg-muted text-foreground cursor-pointer shadow-2xs"
                                        title="프리셋 보관함에서 원하는 스타일 선택"
                                    >
                                        <Sliders className="w-3.5 h-3.5 text-primary" />
                                        <span>프리셋 선택</span>
                                    </Button>
                                )}

                                {/* Model Selector Popover (Codex Desktop 1:1) */}
                                <ModelSelectorPopover
                                    currentProvider={selectedProvider}
                                    currentModel={selectedModel}
                                    currentEffort={reasoningEffort}
                                    onModelChange={(m) => setSelectedModel(m)}
                                    onEffortChange={(eff) => setReasoningEffort(eff)}
                                    onProviderChange={(prov) => handleProviderSelect(prov)}
                                    providerAccountLabel={
                                        (providersStatus[selectedProvider] || providersStatus['openai'] || providersStatus['codex'])?.accounts?.find((a: any) => a.is_active)?.email ||
                                        (providersStatus[selectedProvider] || providersStatus['openai'] || providersStatus['codex'])?.active_plan
                                    }
                                />
                            </div>

                            {/* Round Send / Stop Button with keyboard shortcut hint */}
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground/60 hidden sm:inline select-none font-mono">
                                    ↵ 전송 · ⇧↵ 줄바꿈
                                </span>
                                {isStreaming ? (
                                    <Button
                                        type="button"
                                        onClick={handleStopGeneration}
                                        className="h-8 px-3 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md shrink-0 flex items-center gap-1.5 text-xs font-semibold cursor-pointer animate-pulse"
                                        title="생성 중지"
                                    >
                                        <Square className="w-3.5 h-3.5 fill-current" />
                                        <span>중지</span>
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={() => handleSendMessage()}
                                        disabled={!prompt.trim() && attachedFiles.length === 0}
                                        className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground p-0 shadow-md shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="메시지 전송 (Enter)"
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
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
        </div>
    );
};
export default ConversationalDirectorPage;
