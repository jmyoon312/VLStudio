import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Send, Volume2, VolumeX, Mic, MicOff, Loader2, MessageSquare, 
    Sparkles, Maximize2, Minimize2, PanelRightClose, PanelRightOpen,
    Trash2, Copy, Check, CheckCircle2, Circle, Clock, Terminal, ExternalLink, RefreshCw, 
    Sliders, Paperclip, Monitor, Users, Shield, Cpu, PlayCircle, Film, Play,
    ArrowRight, ChevronRight, FileText, Smartphone, LayoutGrid, CheckCheck,
    Layers, Settings, Eye, Zap, Flame, BarChart3, Database, Radio
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, fetchWithRetry } from '../lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import { GeminiLiveService } from '../services/geminiLiveService';
import { PresetCustomizeModal } from './presets/PresetCustomizeModal';
import { PresetLibraryModal, SovereignPreset } from './presets/PresetLibraryModal';
import { DirectorHeader } from './director/DirectorHeader';
import { DirectorMessageFeed, DirectorChatMessage } from './director/DirectorMessageFeed';
import { DirectorInputBar, AttachedMedia } from './director/DirectorInputBar';
import { DirectorRightPanel, ActiveVideoView } from './director/DirectorRightPanel';
import { DirectorThreadSidebar } from './director/DirectorThreadSidebar';
import { ChatScheduleModal } from './director/ChatScheduleModal';
import { ChatAutoContinueModal } from './director/ChatAutoContinueModal';
import { IntegratedSettingsModal } from './director/IntegratedSettingsModal';
import { CloudMediaSourceModal } from './director/CloudMediaSourceModal';
import { directorSessionService, DirectorProject, DirectorThread, DirectorMessageData } from '@/services/directorSessionService';
import { ReasoningEffort } from './director/ModelSelectorPopover';

import { LoopieIcon } from './director/LoopieAvatar';
export { LoopieIcon };

export type LoopieDisplayMode = 'dock' | 'floating' | 'fullscreen';

const STORAGE_KEY = 'viraloop_loopie_messages_v5';

export const GlobalLoopieChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [displayMode, setDisplayMode] = useState<LoopieDisplayMode>('floating');
    
    // Project & Thread Session Management (Shared with Conversational Director)
    const [projects, setProjects] = useState<DirectorProject[]>([]);
    const [threads, setThreads] = useState<DirectorThread[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string>('proj_loopie');
    const [activeThreadId, setActiveThreadId] = useState<string>('thread_loopie_main');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [rightPanelOpen, setRightPanelOpen] = useState(false);

    // Active Video & Workspace for Right Panel
    const [activeVideo, setActiveVideo] = useState<ActiveVideoView | null>(null);
    const [commandLogs, setCommandLogs] = useState<any[]>([]);

    // Messages
    const [messages, setMessages] = useState<DirectorChatMessage[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch {}
        return [
            {
                id: 'init-1',
                role: 'assistant',
                text: "반갑습니다 대표님! ViraLoop Studio의 만능 AI 총괄 디렉터 **'루피(Loopie)'**입니다.\n\n4대 쇼츠(클래식, 인스타, 군림보, 썰형) 제작 총괄 연출뿐 아니라, 비즈니스 전략, 채널 성장 로드맵, 창의적 스토리텔링, 그리고 **Google Gemini 3.8 Live** 실시간 초저지연 양방향 음성 코칭까지 모든 준비가 완료되어 있습니다. 무엇을 도와드릴까요?",
                timestamp: Date.now()
            }
        ];
    });

    const [prompt, setPrompt] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [isTalking, setIsTalking] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false); // Disabled robotic speech synthesis by default

    // Gemini 3.8 Live State
    const [isGeminiLiveActive, setIsGeminiLiveActive] = useState(false);
    const [isConnectingLive, setIsConnectingLive] = useState(false);
    const liveServiceRef = useRef<GeminiLiveService | null>(null);

    // Active Preset & Modals
    const [activePreset, setActivePreset] = useState<SovereignPreset | null>({
        id: 'preset_classic_standard',
        name: '🌟 스탠다드 레터박스형',
        badge: '골든 표준',
        archetype: 'classic',
        description: '상단 블랙 바 18.3% + 2줄 훅 타이틀 + 하단 출처 바 6.0%의 검증된 대표 포맷.',
        title_text: '충격 실화! 3초 만에 몰입되는 반전 쇼츠',
        subtitle_color: '#FFDE00',
        bar_height_pct: 18.3
    });
    const [showPresetLibrary, setShowPresetLibrary] = useState(false);
    const [showPresetCustomize, setShowPresetCustomize] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showAutoContinueModal, setShowAutoContinueModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showCloudMediaModal, setShowCloudMediaModal] = useState(false);

    // Attached Media Files
    const [attachedFiles, setAttachedFiles] = useState<AttachedMedia[]>([]);

    // Model & Security selections - Default is Codex Astra 6.0
    const [selectedProvider, setSelectedProvider] = useState<'codex' | 'chatgpt_web' | 'gemini' | 'claude' | 'grok' | 'omniroute'>('codex');
    const [selectedModel, setSelectedModel] = useState('Codex Astra 6.0');
    const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>('medium');
    const [securityScope, setSecurityScope] = useState('모두 허용');

    const handleProviderSelect = (provider: any) => {
        setSelectedProvider(provider);
        if (provider === 'gemini') {
            setSelectedModel('Gemini 3.8 Flash');
        } else if (provider === 'codex') {
            setSelectedModel('Codex Astra 6.0');
        } else if (provider === 'chatgpt_web') {
            setSelectedModel('Codex Astra 6.0 (Web)');
        } else if (provider === 'omniroute') {
            setSelectedModel('viraloop1');
        } else if (provider === 'claude') {
            setSelectedModel('Claude 3.7 Sonnet');
        } else if (provider === 'grok') {
            setSelectedModel('Grok 3 Reasoning');
        }
    };

    const navigate = useNavigate();
    const location = useLocation();

    // Persist messages
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        } catch {}
    }, [messages]);

    // Load initial DB settings for default model
    useEffect(() => {
        fetchWithRetry('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data) {
                    const rawModel = data.script_analysis_model || data.default_llm_model;
                    if (rawModel) {
                        if (rawModel.includes('codex') || rawModel.includes('gpt-5') || rawModel.includes('astra')) {
                            setSelectedProvider('codex');
                            setSelectedModel(rawModel.split('/').pop() || 'Codex Astra 6.0');
                        } else if (rawModel.includes('gemini')) {
                            setSelectedProvider('gemini');
                            setSelectedModel('Gemini 3.8 Flash');
                        } else if (rawModel.includes('claude')) {
                            setSelectedProvider('claude');
                            setSelectedModel(rawModel.split('/').pop() || 'Claude 3.7 Sonnet');
                        } else if (rawModel.includes('omniroute')) {
                            setSelectedProvider('omniroute');
                            setSelectedModel(rawModel.split('/').pop() || 'viraloop1');
                        }
                    }
                }
            })
            .catch(() => {});
    }, []);

    // Load Project & Thread list
    const refreshThreads = useCallback(async () => {
        try {
            const [projList, threadList] = await Promise.all([
                directorSessionService.getProjects().catch(() => []),
                directorSessionService.getThreads().catch(() => [])
            ]);
            if (projList && projList.length > 0) setProjects(projList);
            if (threadList && threadList.length > 0) setThreads(threadList);
        } catch {}
    }, []);

    useEffect(() => {
        if (isOpen) refreshThreads();
    }, [isOpen, refreshThreads]);

    // Toggle Google Gemini 3.8 Live Bi-directional Audio Session
    const toggleGeminiLive = async () => {
        if (isGeminiLiveActive) {
            // Disconnect
            if (liveServiceRef.current) {
                liveServiceRef.current.disconnect();
                liveServiceRef.current = null;
            }
            setIsGeminiLiveActive(false);
            setIsTalking(false);
            toast.info("Gemini 3.8 Live 음성 통화가 종료되었습니다.");
        } else {
            // Connect to Gemini 3.8 Live
            setIsConnectingLive(true);
            const service = new GeminiLiveService({
                onConnected: () => {
                    setIsConnectingLive(false);
                    setIsGeminiLiveActive(true);
                    toast.success("🎙️ Gemini 3.8 Live 네이티브 음성 연결 완료! 사람과 대화하듯 편하게 말씀하세요.");
                },
                onTranscript: (text) => {
                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'assistant' && last.id.startsWith('live-')) {
                            return [...prev.slice(0, -1), { ...last, content: (last.content || last.text || '') + text, text: (last.text || '') + text }];
                        }
                        return [...prev, {
                            id: `live-${Date.now()}`,
                            role: 'assistant',
                            content: text,
                            text: text,
                            timestamp: Date.now()
                        }];
                    });
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
                }
            });

            const connected = await service.connect();
            setIsConnectingLive(false);
            if (connected) {
                const micStarted = await service.startAudioCapture();
                if (micStarted) {
                    liveServiceRef.current = service;
                    setIsGeminiLiveActive(true);
                } else {
                    service.disconnect();
                    setIsGeminiLiveActive(false);
                }
            } else {
                setIsGeminiLiveActive(false);
            }
        }
    };

    // Attach local files
    const handleAttachFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files).map((f, idx) => ({
            id: `file_${Date.now()}_${idx}`,
            name: f.name,
            path: (f as any).path || f.name,
            isUrl: false
        }));
        setAttachedFiles(prev => [...prev, ...newFiles]);
        toast.success(`${newFiles.length}개의 미디어 파일이 첨부되었습니다.`);
    };

    const removeAttachedFile = (id: string) => {
        setAttachedFiles(prev => prev.filter(f => f.id !== id));
    };

    // Message Sending Handler (Direct & Streaming via /api/hermes/director/stream)
    const handleSend = async (customText?: string) => {
        const textToSend = (customText || prompt).trim();
        if (!textToSend && attachedFiles.length === 0) return;

        // If Gemini 3.8 Live is connected, forward text to live session for voice synthesis
        if (isGeminiLiveActive && liveServiceRef.current) {
            try {
                liveServiceRef.current.sendText(textToSend);
            } catch {}
        }

        const userMsg: DirectorChatMessage = {
            id: String(Date.now()),
            role: 'user',
            content: textToSend + (attachedFiles.length > 0 ? `\n[첨부 미디어: ${attachedFiles.map(f => f.name).join(', ')}]` : ''),
            text: textToSend,
            timestamp: Date.now()
        };

        const assistantMsgId = String(Date.now() + 1);
        const initialAssistantMsg: DirectorChatMessage = {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            items: [],
            steps: [],
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg, initialAssistantMsg]);
        setPrompt('');
        const prevAttached = [...attachedFiles];
        setAttachedFiles([]);
        setIsStreaming(true);

        try {
            const historyPayload = messages.slice(-8).map(m => ({
                role: m.role,
                content: m.content || m.text || ''
            }));

            const res = await fetch('/api/hermes/director/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: textToSend,
                    preset: activePreset || undefined,
                    reference_media_path: prevAttached[0]?.path,
                    media_paths: prevAttached.map(f => f.path),
                    aspect_ratio: '1080x1920',
                    model: selectedModel,
                    provider: selectedProvider,
                    reasoning_effort: reasoningEffort,
                    history: historyPayload
                })
            });

            if (!res.ok) throw new Error(`서버 오류 (${res.status})`);

            const reader = res.body?.getReader();
            if (!reader) throw new Error('스트림을 읽을 수 없습니다.');

            const decoder = new TextDecoder();
            let buffer = '';
            let accumulatedContent = '';

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

                            if (data.type === 'content_chunk') {
                                accumulatedContent = data.content || (accumulatedContent + (data.delta || ''));
                                setMessages(prev => prev.map(m => {
                                    if (m.id === assistantMsgId) {
                                        return { ...m, content: accumulatedContent };
                                    }
                                    return m;
                                }));
                            } else if (data.type === 'step') {
                                setMessages(prev => prev.map(m => {
                                    if (m.id === assistantMsgId) {
                                        const steps = m.steps || [];
                                        const idx = steps.findIndex(s => s.step_id === data.step_id);
                                        const newStep = {
                                            step_id: data.step_id,
                                            title: data.title,
                                            status: data.status,
                                            detail: data.detail
                                        };
                                        const updatedSteps = idx >= 0
                                            ? steps.map((s, i) => i === idx ? newStep : s)
                                            : [...steps, newStep];
                                        return { ...m, steps: updatedSteps };
                                    }
                                    return m;
                                }));
                            } else if (data.type === 'tool_start') {
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
                            } else if (data.type === 'tool_done') {
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
                                        if (!matched) {
                                            items.push({
                                                id: `tool_done_${Date.now()}`,
                                                type: 'tool',
                                                tool_name: data.tool_name,
                                                title: data.title || '작업 완료',
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
                            } else if (data.type === 'chat_response') {
                                if (data.content) accumulatedContent = data.content;
                                setMessages(prev => prev.map(m => {
                                    if (m.id === assistantMsgId) {
                                        return {
                                            ...m,
                                            content: data.content || m.content || accumulatedContent,
                                            action_chips: data.action_chips
                                        };
                                    }
                                    return m;
                                }));
                            } else if (data.type === 'deliverable' || data.type === 'item_complete' || data.type === 'complete') {
                                if (data.deliverable) {
                                    setMessages(prev => prev.map(m => {
                                        if (m.id === assistantMsgId) {
                                            return { ...m, deliverable: data.deliverable };
                                        }
                                        return m;
                                    }));
                                }
                            } else if (data.type === 'audio_deliverable') {
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
                            } else if (data.type === 'source_candidates') {
                                setMessages(prev => prev.map(m => {
                                    if (m.id === assistantMsgId) {
                                        return { ...m, source_candidates: data.candidates };
                                    }
                                    return m;
                                }));
                            }
                        } catch {}
                    }
                }
            }

            // Ensure non-empty assistant content
            setMessages(prev => prev.map(m => {
                if (m.id === assistantMsgId && !m.content) {
                    return {
                        ...m,
                        content: accumulatedContent || '요청하신 작업을 완료했습니다. 추가 지시사항이 있으시면 언제든 말씀해 주세요.'
                    };
                }
                return m;
            }));
        } catch (err: any) {
            toast.error(`디렉터 요청 처리 실패: ${err.message || err}`);
            setMessages(prev => prev.map(m => {
                if (m.id === assistantMsgId && !m.content) {
                    return {
                        ...m,
                        content: `⚠️ 디렉터 응답 처리 중 오류가 발생했습니다: ${err.message || err}\n\n다시 시도해 주시거나 다른 AI 모델(Google Gemini 등)을 선택해 주세요.`
                    };
                }
                return m;
            }));
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <>
            {/* Header Trigger Button (Persistent in Navigation Bar) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs select-none",
                    isOpen
                        ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/30"
                        : "bg-card hover:bg-accent border-border text-foreground hover:scale-102"
                )}
                title={isOpen ? "루피 대화창 닫기" : "만능 루피 AI 총괄 디렉터 열기"}
            >
                <LoopieIcon 
                    className="w-5 h-5" 
                    isSmall 
                    isLive={isGeminiLiveActive} 
                    isTalking={isTalking} 
                />
                <span className="hidden sm:inline font-bold">루피 AI 디렉터</span>
                <span className={cn(
                    "w-2 h-2 rounded-full",
                    isGeminiLiveActive ? "bg-emerald-400 animate-pulse" : "bg-emerald-500"
                )} />
            </button>

            {/* Loopie Universal Cockpit Modal Portal */}
            {isOpen && createPortal(
                <div className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-auto">
                    {/* Semi-transparent Dimmed Backdrop Overlay */}
                    <div 
                        className="fixed inset-0 bg-black/45 backdrop-blur-[2px] z-[9998] transition-opacity animate-in fade-in duration-200"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Cockpit Window Container */}
                    <div 
                        className={cn(
                            "z-[9999] rounded-3xl border border-border/80 shadow-2xl bg-background flex flex-col overflow-hidden animate-in duration-200",
                            displayMode === 'dock' && "fixed top-3 bottom-3 right-3 h-[calc(100vh-24px)] w-[660px] max-w-[calc(100vw-24px)] slide-in-from-right",
                            displayMode === 'floating' && "fixed top-5 bottom-5 right-5 w-[820px] max-w-[calc(100vw-32px)] h-[calc(100vh-40px)] max-h-[940px] zoom-in-95",
                            displayMode === 'fullscreen' && "fixed inset-3 md:inset-5 zoom-in-95"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 1. Universal Shared Header */}
                        <DirectorHeader
                            title="루피 AI 디렉터"
                            activePreset={activePreset}
                            onOpenPresetModal={() => setShowPresetLibrary(true)}
                            selectedProvider={selectedProvider}
                            onSelectProvider={handleProviderSelect}
                            selectedModel={selectedModel}
                            onSelectModel={setSelectedModel}
                            reasoningEffort={reasoningEffort}
                            onSelectReasoningEffort={setReasoningEffort}
                            isVoiceMuted={!isVoiceEnabled}
                            onToggleVoiceMute={() => setIsVoiceEnabled(!isVoiceEnabled)}
                            sidebarCollapsed={sidebarCollapsed}
                            onToggleSidebar={displayMode === 'fullscreen' ? () => setSidebarCollapsed(!sidebarCollapsed) : undefined}
                            rightPanelOpen={rightPanelOpen}
                            onToggleRightPanel={displayMode === 'fullscreen' ? () => setRightPanelOpen(!rightPanelOpen) : undefined}
                            displayMode={displayMode}
                            onChangeDisplayMode={setDisplayMode}
                            onClose={() => setIsOpen(false)}
                            leadingElement={
                                <LoopieIcon 
                                    className="w-7 h-7 mr-1" 
                                    isSmall 
                                    isLive={isGeminiLiveActive} 
                                    isTalking={isTalking} 
                                />
                            }
                        />

                        {/* 2. Main Body Area */}
                        <div className="flex-1 flex min-h-0 overflow-hidden relative">
                            {/* Left Collapsible Project/Thread Sidebar (Fullscreen only) */}
                            {displayMode === 'fullscreen' && !sidebarCollapsed && (
                                <div className="w-64 border-r border-border/80 bg-card/40 transition-all shrink-0 z-20">
                                    <DirectorThreadSidebar
                                        projects={projects}
                                        threads={threads}
                                        activeProjectId={activeProjectId}
                                        activeThreadId={activeThreadId}
                                        currentProvider={selectedProvider}
                                        onProviderChange={handleProviderSelect}
                                        onSelectProject={setActiveProjectId}
                                        onSelectThread={setActiveThreadId}
                                        onCreateThread={() => {
                                            const newThread: DirectorThread = {
                                                id: `thread_${Date.now()}`,
                                                title: '새로운 디렉팅 세션',
                                                message_count: 0
                                            };
                                            setThreads(prev => [newThread, ...prev]);
                                            setActiveThreadId(newThread.id);
                                            setMessages([]);
                                        }}
                                        onCreateProject={(name) => {
                                            const newProj: DirectorProject = {
                                                id: `proj_${Date.now()}`,
                                                name: name,
                                                color: 'emerald',
                                                icon: 'folder',
                                                thread_count: 0
                                            };
                                            setProjects(prev => [...prev, newProj]);
                                        }}
                                        onDeleteThread={(tId) => setThreads(prev => prev.filter(t => t.id !== tId))}
                                        onDeleteProject={(pId) => setProjects(prev => prev.filter(p => p.id !== pId))}
                                        isCollapsed={sidebarCollapsed}
                                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                                    />
                                </div>
                            )}

                            {/* Center Main: Message Feed + Input Bar */}
                            <div className="flex-1 flex flex-col min-w-0 bg-background relative">
                                <DirectorMessageFeed
                                    messages={messages}
                                    isStreaming={isStreaming}
                                    onSendMessage={handleSend}
                                    activePreset={activePreset}
                                    onOpenInRightPanel={(v) => {
                                        setActiveVideo(v);
                                        setRightPanelOpen(true);
                                    }}
                                    avatarElement={() => (
                                        <LoopieIcon 
                                            className="w-16 h-16" 
                                            isSmall={false} 
                                            isLive={isGeminiLiveActive} 
                                            isTalking={isTalking} 
                                        />
                                    )}
                                    emptyStateTitle="루피 AI 디렉터"
                                    emptyStateSubtitle="4대 쇼츠 제작, CapCut 조립, 채널 성장 전략, 비즈니스 아이디어부터 인생 상담까지 대표님의 전속 파트너로서 함께합니다."
                                />

                                <DirectorInputBar
                                    prompt={prompt}
                                    onChangePrompt={setPrompt}
                                    onSendMessage={handleSend}
                                    isStreaming={isStreaming}
                                    onCancelStream={() => setIsStreaming(false)}
                                    attachedFiles={attachedFiles}
                                    onRemoveAttachedFile={removeAttachedFile}
                                    onAttachFiles={handleAttachFiles}
                                    activePreset={activePreset}
                                    onOpenPresetModal={() => setShowPresetLibrary(true)}
                                    onClearPreset={() => setActivePreset(null)}
                                    onOpenCustomizeModal={() => setShowPresetCustomize(true)}
                                    onOpenCloudMediaModal={() => setShowCloudMediaModal(true)}
                                    securityScope={securityScope}
                                    onChangeSecurityScope={setSecurityScope}
                                    isLiveVoiceActive={isGeminiLiveActive}
                                    onToggleLiveVoice={toggleGeminiLive}
                                    hasMessages={messages.length > 0}
                                    placeholder="루피에게 영상 제작 지시, 유튜브 URL, 비즈니스 전략, 대화 내용을 입력하세요..."
                                />
                            </div>

                            {/* Right Workspace Panel (Fullscreen only) */}
                            {displayMode === 'fullscreen' && rightPanelOpen && (
                                <div className="w-[440px] lg:w-[500px] border-l border-border/80 bg-muted/20 flex flex-col shrink-0">
                                    <DirectorRightPanel
                                        open={rightPanelOpen}
                                        onClose={() => setRightPanelOpen(false)}
                                        activeVideo={activeVideo}
                                        onClearActiveVideo={() => setActiveVideo(null)}
                                        commandLogs={commandLogs}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Modals & Sub-dialogs */}
                        <PresetLibraryModal
                            isOpen={showPresetLibrary}
                            onClose={() => setShowPresetLibrary(false)}
                            onSelectPreset={(p) => {
                                setActivePreset(p);
                                setShowPresetLibrary(false);
                                toast.success(`'${p.name}' 프리셋이 루피 제작 스타일에 적용되었습니다.`);
                            }}
                        />

                        {activePreset && (
                            <PresetCustomizeModal
                                isOpen={showPresetCustomize}
                                onClose={() => setShowPresetCustomize(false)}
                                preset={activePreset}
                                onSave={(updated) => {
                                    setActivePreset(updated);
                                    setShowPresetCustomize(false);
                                    toast.success("프리셋 스타일이 업데이트되었습니다.");
                                }}
                            />
                        )}

                        <ChatScheduleModal
                            isOpen={showScheduleModal}
                            onClose={() => setShowScheduleModal(false)}
                            onSaveSchedule={(cfg) => {
                                setShowScheduleModal(false);
                                toast.success("루피 자동화 스케줄이 성공적으로 등록되었습니다.");
                            }}
                        />

                        <ChatAutoContinueModal
                            isOpen={showAutoContinueModal}
                            onClose={() => setShowAutoContinueModal(false)}
                            onStartLoop={(cfg) => {
                                setShowAutoContinueModal(false);
                                toast.success("자율 연속 제작 루프가 시작되었습니다.");
                            }}
                        />

                        <IntegratedSettingsModal
                            isOpen={showSettingsModal}
                            onClose={() => setShowSettingsModal(false)}
                            onSaved={() => toast.success("환경설정이 저장되었습니다.")}
                        />

                        <CloudMediaSourceModal
                            isOpen={showCloudMediaModal}
                            onClose={() => setShowCloudMediaModal(false)}
                            onSelectMedia={(sources) => {
                                const newAttached = sources.map((s, idx) => ({
                                    id: `source_${Date.now()}_${idx}`,
                                    name: s.title || s.url,
                                    path: s.url,
                                    isUrl: true
                                }));
                                setAttachedFiles(prev => [...prev, ...newAttached]);
                                setShowCloudMediaModal(false);
                                toast.success(`${sources.length}개의 원천 소스가 첨부되었습니다.`);
                            }}
                        />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default GlobalLoopieChat;
