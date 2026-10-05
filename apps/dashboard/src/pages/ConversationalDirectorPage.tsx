import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { DirectorThreadSidebar } from '@/components/director/DirectorThreadSidebar';
import { DirectorHeader } from '@/components/director/DirectorHeader';
import { DirectorMessageFeed, DirectorChatMessage } from '@/components/director/DirectorMessageFeed';
import { DirectorInputBar, AttachedMedia } from '@/components/director/DirectorInputBar';
import { DirectorRightPanel, ActiveVideoView, DockTab } from '@/components/director/DirectorRightPanel';
import { IntegratedSettingsModal } from '@/components/director/IntegratedSettingsModal';
import { PresetLoadModal } from '@/components/director/PresetLoadModal';
import { SovereignPreset } from '@/components/presets/PresetLibraryModal';
import { ReasoningEffort } from '@/components/director/ModelSelectorPopover';
import { LoopieIcon } from '@/components/director/LoopieAvatar';
import { directorSessionService, DirectorProject, DirectorThread } from '@/services/directorSessionService';
import api from '@/lib/api';

const DEFAULT_PROJECT_ID = 'default';
const STORAGE_PREFIX = 'vl_luffy_chat_';
const ACTIVE_THREAD_KEY = 'vl_director_active_thread_id';
const THREADS_CACHE_KEY = 'vl_director_threads_cache';

export const ConversationalDirectorPage: React.FC = () => {
    // --- 1. Project & Thread Management State ---
    const [projects, setProjects] = useState<DirectorProject[]>([
        { id: DEFAULT_PROJECT_ID, name: '기본 프로젝트', color: 'emerald', icon: 'folder', thread_count: 1 }
    ]);
    const [activeProjectId, setActiveProjectId] = useState<string>(DEFAULT_PROJECT_ID);
    const [threads, setThreads] = useState<DirectorThread[]>([]);
    const [activeThreadId, setActiveThreadId] = useState<string>('');

    // --- 2. Chat & Streaming State (Zero-Base Clean Model Connection) ---
    const [messages, setMessages] = useState<DirectorChatMessage[]>([]);
    const [prompt, setPrompt] = useState<string>('');
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [selectedProvider, setSelectedProvider] = useState<'codex' | 'chatgpt_web' | 'gemini' | 'claude' | 'deepseek' | 'omniroute'>('codex');
    const [selectedModel, setSelectedModel] = useState<string>('GPT-6.1');
    const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>('medium');
    const [attachedFiles, setAttachedFiles] = useState<AttachedMedia[]>([]);

    // --- 3. UI Layout & Menus State ---
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
    const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(true);
    const [rightPanelTab, setRightPanelTab] = useState<DockTab>('browser'); // strictly browser, files, backlot
    const [activeBrowserUrl, setActiveBrowserUrl] = useState<string>('https://www.google.com/search?igu=1');
    const [activeVideoView, setActiveVideoView] = useState<ActiveVideoView | null>(null);

    // --- 4. Channels & Presets State ---
    const [targetChannels, setTargetChannels] = useState<any[]>([]);
    const [selectedTargetChannel, setSelectedTargetChannel] = useState<any | null>(null);
    const [activePreset, setActivePreset] = useState<SovereignPreset | null>(null);

    // --- 5. Modal Windows ---
    const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
    const [presetModalOpen, setPresetModalOpen] = useState<boolean>(false);

    // --- Refs ---
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // -------------------------------------------------------------------------
    // Initial Data Fetching & Instant Local Storage Restoration
    // -------------------------------------------------------------------------
    useEffect(() => {
        // Load target channels
        api.get('/brand-channels/').then(res => {
            const list = res.data?.channels || res.data || [];
            if (Array.isArray(list)) {
                setTargetChannels(list);
                if (list.length > 0 && !selectedTargetChannel) {
                    setSelectedTargetChannel(list[0]);
                }
            }
        }).catch(() => {});

        // 1. Instant local restoration to prevent conversation flash/loss
        const cachedThreadsRaw = localStorage.getItem(THREADS_CACHE_KEY);
        const lastActiveThreadId = localStorage.getItem(ACTIVE_THREAD_KEY);
        let initialThreadList: DirectorThread[] = [];

        if (cachedThreadsRaw) {
            try {
                const parsed = JSON.parse(cachedThreadsRaw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    initialThreadList = parsed;
                    setThreads(parsed);
                }
            } catch {}
        }

        const initialTargetId = lastActiveThreadId && initialThreadList.some(t => t.id === lastActiveThreadId)
            ? lastActiveThreadId
            : (initialThreadList.length > 0 ? initialThreadList[0].id : null);

        if (initialTargetId) {
            setActiveThreadId(initialTargetId);
        }

        // 2. Fetch projects & sync remote threads
        directorSessionService.getProjects().then(projs => {
            if (projs && projs.length > 0) {
                setProjects(projs);
                setActiveProjectId(projs[0].id);
            }
        }).catch(() => {});

        directorSessionService.getThreads().then(remoteThrs => {
            if (remoteThrs && remoteThrs.length > 0) {
                setThreads(prev => {
                    const remoteIds = new Set(remoteThrs.map(t => t.id));
                    const unsyncedLocals = prev.filter(t => !remoteIds.has(t.id));
                    const merged = [...unsyncedLocals, ...remoteThrs];
                    localStorage.setItem(THREADS_CACHE_KEY, JSON.stringify(merged));
                    return merged;
                });

                setActiveThreadId(curr => {
                    const preferred = curr || lastActiveThreadId;
                    if (preferred && remoteThrs.some(t => t.id === preferred)) {
                        localStorage.setItem(ACTIVE_THREAD_KEY, preferred);
                        return preferred;
                    }
                    const chosen = curr || remoteThrs[0].id;
                    localStorage.setItem(ACTIVE_THREAD_KEY, chosen);
                    return chosen;
                });
            } else if (initialThreadList.length === 0) {
                // Initialize default thread and persist
                const thrId = `th_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
                const defaultThr: DirectorThread = {
                    id: thrId,
                    title: '새 대화',
                    message_count: 0,
                    provider: selectedProvider,
                    model: selectedModel,
                    created_at: new Date().toISOString()
                };
                setThreads([defaultThr]);
                setActiveThreadId(defaultThr.id);
                localStorage.setItem(THREADS_CACHE_KEY, JSON.stringify([defaultThr]));
                localStorage.setItem(ACTIVE_THREAD_KEY, defaultThr.id);
                directorSessionService.createThread({
                    id: defaultThr.id,
                    title: defaultThr.title,
                    provider: selectedProvider,
                    model: selectedModel
                }).catch(() => {});
            }
        }).catch(() => {
            if (initialThreadList.length === 0) {
                const thrId = `th_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
                const defaultThr: DirectorThread = {
                    id: thrId,
                    title: '새 대화',
                    message_count: 0,
                    provider: selectedProvider,
                    model: selectedModel,
                    created_at: new Date().toISOString()
                };
                setThreads([defaultThr]);
                setActiveThreadId(defaultThr.id);
                localStorage.setItem(THREADS_CACHE_KEY, JSON.stringify([defaultThr]));
                localStorage.setItem(ACTIVE_THREAD_KEY, defaultThr.id);
                directorSessionService.createThread({
                    id: defaultThr.id,
                    title: defaultThr.title,
                    provider: selectedProvider,
                    model: selectedModel
                }).catch(() => {});
            }
        });
    }, []);

    // -------------------------------------------------------------------------
    // Thread Selection & Message Persistence Restoration
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!activeThreadId) return;

        localStorage.setItem(ACTIVE_THREAD_KEY, activeThreadId);

        // 1. Instant restore messages from localStorage
        let localRestored = false;
        const saved = localStorage.getItem(`${STORAGE_PREFIX}${activeThreadId}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setMessages(parsed);
                    localRestored = true;
                }
            } catch {}
        }

        // 2. Fetch from backend DB
        directorSessionService.getThreadMessages(activeThreadId).then(rawRes => {
            const remoteMsgs = Array.isArray(rawRes) ? rawRes : ((rawRes as any)?.messages || []);
            if (Array.isArray(remoteMsgs) && remoteMsgs.length > 0) {
                const formatted: DirectorChatMessage[] = remoteMsgs.map((m: any, idx: number) => ({
                    id: m.id || `msg-${idx}-${Date.now()}`,
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp || (m.created_at ? new Date(m.created_at).getTime() : Date.now()),
                    steps: m.steps,
                    total_steps: m.steps?.length,
                    deliverable: m.deliverable,
                    action_chips: m.action_chips
                }));
                setMessages(formatted);
                try {
                    localStorage.setItem(`${STORAGE_PREFIX}${activeThreadId}`, JSON.stringify(formatted));
                } catch {}
            } else if (!localRestored) {
                setMessages([]);
            }
        }).catch(() => {
            if (!localRestored) {
                setMessages([]);
            }
        });
    }, [activeThreadId]);

    // Save messages to dual persistence (localStorage + backend SQLite DB)
    const saveCurrentMessages = useCallback((msgs: DirectorChatMessage[]) => {
        if (!activeThreadId) return;
        try {
            localStorage.setItem(`${STORAGE_PREFIX}${activeThreadId}`, JSON.stringify(msgs));
        } catch {}

        // Persist newest message to backend DB asynchronously
        if (msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            directorSessionService.saveThreadMessage(activeThreadId, {
                id: lastMsg.id,
                role: lastMsg.role,
                content: lastMsg.content || '',
                steps: lastMsg.steps,
                deliverable: lastMsg.deliverable,
                action_chips: lastMsg.action_chips
            }).catch(err => console.warn('Failed to save message:', err));
        }
    }, [activeThreadId]);

    // -------------------------------------------------------------------------
    // Provider & Model Selection
    // -------------------------------------------------------------------------
    const handleSelectProvider = (prov: any) => {
        setSelectedProvider(prov);
        if (prov === 'gemini') setSelectedModel('Gemini 3.8 Flash');
        else if (prov === 'claude') setSelectedModel('Claude 3.7 Sonnet');
        else if (prov === 'deepseek') setSelectedModel('DeepSeek-V3');
        else if (prov === 'codex' || prov === 'openai') setSelectedModel('GPT-6.1');
        else if (prov === 'chatgpt_web') setSelectedModel('GPT-6.1 (Web)');
        else if (prov === 'omniroute') setSelectedModel('viraloop1');
        toast.info(`헤르메스 두뇌 모델 연동: ${prov}`);
    };

    const handleSelectModel = (m: string) => {
        setSelectedModel(m);
        toast.info(`모델 변경: ${m}`);
    };

    // -------------------------------------------------------------------------
    // Thread & Project Actions
    // -------------------------------------------------------------------------
    const handleNewChat = () => {
        const newThrId = `th_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        const newThr: DirectorThread = {
            id: newThrId,
            title: '새 대화',
            message_count: 0,
            provider: selectedProvider,
            model: selectedModel,
            created_at: new Date().toISOString()
        };
        setThreads(prev => {
            const updated = [newThr, ...prev];
            localStorage.setItem(THREADS_CACHE_KEY, JSON.stringify(updated));
            return updated;
        });
        setActiveThreadId(newThr.id);
        localStorage.setItem(ACTIVE_THREAD_KEY, newThr.id);
        setMessages([]);
        setPrompt('');
        directorSessionService.createThread({
            id: newThr.id,
            title: newThr.title,
            provider: selectedProvider,
            model: selectedModel
        }).catch(err => console.warn('Failed to create thread:', err));
        textareaRef.current?.focus();
    };

    const handleSelectThread = (threadId: string) => {
        setActiveThreadId(threadId);
        const thr = threads.find(t => t.id === threadId);
        if (thr) {
            if (thr.provider) setSelectedProvider(thr.provider as any);
            if (thr.model) setSelectedModel(thr.model);
        }
    };

    const handleDeleteThread = (threadId: string) => {
        setThreads(prev => {
            const updated = prev.filter(t => t.id !== threadId);
            localStorage.setItem(THREADS_CACHE_KEY, JSON.stringify(updated));
            return updated;
        });
        localStorage.removeItem(`${STORAGE_PREFIX}${threadId}`);
        directorSessionService.deleteThread(threadId).catch(() => {});
        if (activeThreadId === threadId) {
            const remaining = threads.filter(t => t.id !== threadId);
            if (remaining.length > 0) {
                setActiveThreadId(remaining[0].id);
                localStorage.setItem(ACTIVE_THREAD_KEY, remaining[0].id);
            } else {
                handleNewChat();
            }
        }
    };

    // -------------------------------------------------------------------------
    // Pure Baseline Model Streaming (Zero-Base Pure Connection)
    // -------------------------------------------------------------------------
    const handleSendMessage = async (customPrompt?: string) => {
        const textToSend = (customPrompt !== undefined ? customPrompt : prompt).trim();
        if (!textToSend || isStreaming) return;

        const userMsgId = `user-${Date.now()}`;
        const assistantMsgId = `asst-${Date.now()}`;

        const userMsg: DirectorChatMessage = {
            id: userMsgId,
            role: 'user',
            content: textToSend,
            timestamp: Date.now()
        };

        const assistantMsg: DirectorChatMessage = {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            timestamp: Date.now()
        };

        const nextMessages = [...messages, userMsg, assistantMsg];
        setMessages(nextMessages);
        setPrompt('');
        setIsStreaming(true);

        // Immediate LocalStorage persist so refresh retains user prompt
        try {
            localStorage.setItem(`${STORAGE_PREFIX}${activeThreadId}`, JSON.stringify(nextMessages));
        } catch {}

        // Save User Message to backend DB
        directorSessionService.saveThreadMessage(activeThreadId, {
            id: userMsg.id,
            role: 'user',
            content: userMsg.content,
            created_at: new Date(userMsg.timestamp).toISOString()
        }).catch(err => console.warn('Failed to save user message:', err));

        // Update thread title if first message
        if (messages.length === 0) {
            const newTitle = textToSend.slice(0, 24) + (textToSend.length > 24 ? '...' : '');
            setThreads(prev => {
                const updated = prev.map(t => t.id === activeThreadId ? { ...t, title: newTitle } : t);
                localStorage.setItem(THREADS_CACHE_KEY, JSON.stringify(updated));
                return updated;
            });
            directorSessionService.updateThread(activeThreadId, { title: newTitle }).catch(() => {});
        }

        // Map provider name to backend sovereign routing standard
        let backendProvider: string = selectedProvider;
        if (selectedProvider === 'codex' || (selectedProvider as any) === 'openai') backendProvider = 'codex';
        else if (selectedProvider === 'chatgpt_web') backendProvider = 'chatgpt_web';
        else if (selectedProvider === 'gemini') backendProvider = 'gemini';
        else if (selectedProvider === 'deepseek') backendProvider = 'deepseek';
        else if (selectedProvider === 'claude') backendProvider = 'claude';
        else if (selectedProvider === 'omniroute') backendProvider = 'omniroute';

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const response = await fetch('/api/hermes/director/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({
                    prompt: textToSend,
                    provider: backendProvider,
                    model: selectedModel,
                    history: messages.slice(-10).map(m => ({
                        role: m.role,
                        content: m.content || m.text || ''
                    }))
                }),
                signal: abortController.signal
            });

            if (!response.ok || !response.body) {
                throw new Error(`HTTP error ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            let accumulatedContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim() || !line.startsWith('data: ')) continue;
                    try {
                        const evt = JSON.parse(line.slice(6));

                        // 1. Text chunk streaming
                        if (evt.type === 'content_chunk') {
                            const delta = evt.delta || '';
                            accumulatedContent += delta;
                            setMessages(curr => curr.map(m => {
                                if (m.id === assistantMsgId) {
                                    return { ...m, content: accumulatedContent };
                                }
                                return m;
                            }));
                        }
                        // 2. Deliverable (Video Ready) event
                        else if ((evt.type === 'deliverable' || evt.type === 'item_complete') && evt.deliverable) {
                            setMessages(curr => curr.map(m => {
                                if (m.id === assistantMsgId) {
                                    return { ...m, deliverable: evt.deliverable };
                                }
                                return m;
                            }));
                        }
                        // 3. Step/Tool progress event (Pixeling standard)
                        else if (evt.type === 'tool_step' && evt.step) {
                            setMessages(curr => curr.map(m => {
                                if (m.id === assistantMsgId) {
                                    const prevSteps = m.steps || [];
                                    const existingIdx = prevSteps.findIndex(s => s.step_id === evt.step.id);
                                    let newSteps = [...prevSteps];
                                    const stepObj = {
                                        step_id: evt.step.id,
                                        title: evt.step.label || evt.step.tool_name || '도구 작업',
                                        label: evt.step.label || '도구 작업',
                                        target: evt.step.target || '',
                                        status: evt.step.status || 'in_progress',
                                        elapsed_seconds: evt.step.elapsed_seconds || 0
                                    };
                                    if (existingIdx >= 0) {
                                        newSteps[existingIdx] = stepObj;
                                    } else {
                                        newSteps.push(stepObj);
                                    }
                                    return {
                                        ...m,
                                        steps: newSteps,
                                        total_steps: evt.total_steps || newSteps.length,
                                        total_elapsed_seconds: evt.total_elapsed_seconds || m.total_elapsed_seconds
                                    };
                                }
                                return m;
                            }));
                        }
                        // 3-1. Tool step completion
                        else if (evt.type === 'tool_step_complete') {
                            setMessages(curr => curr.map(m => {
                                if (m.id === assistantMsgId) {
                                    const prevSteps = m.steps || [];
                                    const updatedSteps = prevSteps.map(s => {
                                        if (s.step_id === evt.step_id || (s.title.includes(evt.tool_name) && s.status === 'in_progress')) {
                                            return {
                                                ...s,
                                                status: 'completed' as const,
                                                elapsed_seconds: evt.elapsed_seconds || s.elapsed_seconds || 1,
                                                summary: evt.summary
                                            };
                                        }
                                        return s;
                                    });
                                    return {
                                        ...m,
                                        steps: updatedSteps,
                                        total_steps: evt.total_steps || updatedSteps.length,
                                        total_elapsed_seconds: evt.total_elapsed_seconds || m.total_elapsed_seconds
                                    };
                                }
                                return m;
                            }));
                        }
                        // 3-2. Real-time browser navigation sync
                        else if (evt.type === 'browser_navigate' && evt.url) {
                            setActiveBrowserUrl(evt.url);
                            setRightPanelTab('browser');
                            setRightPanelOpen(true);
                            toast.info(`🔍 브라우저 실시간 탐색: ${evt.query || evt.url}`);
                        }
                        // 3-3. Legacy step event fallback
                        else if (evt.type === 'step') {
                            setMessages(curr => curr.map(m => {
                                if (m.id === assistantMsgId) {
                                    const prevSteps = m.steps || [];
                                    const existingIdx = prevSteps.findIndex(s => s.step_id === evt.step_id);
                                    let newSteps = [...prevSteps];
                                    if (existingIdx >= 0) {
                                        newSteps[existingIdx] = {
                                            ...newSteps[existingIdx],
                                            step_id: evt.step_id,
                                            title: evt.title || newSteps[existingIdx].title,
                                            status: evt.status || 'in_progress',
                                            detail: evt.detail
                                        };
                                    } else {
                                        newSteps.push({
                                            step_id: evt.step_id,
                                            title: evt.title || '도구 실행',
                                            status: evt.status || 'in_progress',
                                            detail: evt.detail
                                        });
                                    }
                                    return { ...m, steps: newSteps };
                                }
                                return m;
                            }));
                        }
                        // 4. Visual candidate cards
                        else if (evt.type === 'source_candidates') {
                            setMessages(curr => curr.map(m => {
                                if (m.id === assistantMsgId) {
                                    return { ...m, source_candidates: evt.candidates || [] };
                                }
                                return m;
                            }));
                        }
                        // 5. Final response completion
                        else if (evt.type === 'chat_response') {
                            if (evt.content) {
                                accumulatedContent = evt.content;
                            }
                            const finalDeliverable = evt.deliverable;
                            setMessages(curr => {
                                const updated = curr.map(m => {
                                    if (m.id === assistantMsgId) {
                                        return {
                                            ...m,
                                            content: accumulatedContent,
                                            deliverable: finalDeliverable || m.deliverable,
                                            action_chips: evt.action_chips,
                                            steps: evt.steps && evt.steps.length > 0 ? evt.steps.map((s: any) => ({
                                                step_id: s.id || s.step_id,
                                                title: s.label || s.tool_name || '도구 작업',
                                                label: s.label || '도구 작업',
                                                target: s.target || '',
                                                status: s.status || 'completed',
                                                elapsed_seconds: s.elapsed_seconds || 1,
                                                summary: s.summary
                                            })) : m.steps,
                                            total_steps: evt.total_steps || m.total_steps,
                                            total_elapsed_seconds: evt.total_elapsed_seconds || m.total_elapsed_seconds
                                        };
                                    }
                                    return m;
                                });
                                saveCurrentMessages(updated);
                                return updated;
                            });
                        }
                    } catch {}
                }
            }

            // Stream completed cleanly
            setMessages(curr => {
                const updated = curr.map(m => {
                    if (m.id === assistantMsgId && !m.content) {
                        return { ...m, content: accumulatedContent || '응답이 완료되었습니다.' };
                    }
                    return m;
                });
                saveCurrentMessages(updated);
                return updated;
            });

        } catch (err: any) {
            if (err.name === 'AbortError') {
                toast.info('응답 생성이 중단되었습니다.');
            } else {
                toast.error(`통신 오류: ${err.message || '모델 응답 실패'}`);
                setMessages(curr => curr.map(m => {
                    if (m.id === assistantMsgId && !m.content) {
                        return { ...m, content: `⚠️ 오류가 발생했습니다: ${err.message}` };
                    }
                    return m;
                }));
            }
        } finally {
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    };

    const handleStopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsStreaming(false);
    };

    return (
        <div className="flex-1 flex flex-row h-full w-full bg-background text-foreground font-sans overflow-hidden min-w-0 relative">
            {/* 1. Left Sidebar (Multi-Project & Thread History) */}
            <DirectorThreadSidebar
                projects={projects}
                threads={threads}
                activeProjectId={activeProjectId}
                activeThreadId={activeThreadId}
                currentProvider={selectedProvider}
                onProviderChange={(p) => handleSelectProvider(p)}
                onOpenSettings={() => setSettingsModalOpen(true)}
                onOpenSchedule={() => {}}
                onOpenPresets={() => setPresetModalOpen(true)}
                onSelectProject={(pId) => setActiveProjectId(pId)}
                onSelectThread={handleSelectThread}
                onCreateProject={(name) => {
                    setProjects(prev => [...prev, { id: `proj-${Date.now()}`, name, color: 'emerald', icon: 'folder', thread_count: 0 }]);
                }}
                onDeleteProject={(pId) => {
                    setProjects(prev => prev.filter(p => p.id !== pId));
                }}
                onDeleteThread={handleDeleteThread}
                onCreateThread={handleNewChat}
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* 2. Center Workspace (Header + Separated HUD Menu + Messages + Input) */}
            <main className="flex-1 flex flex-col h-full min-w-0 bg-background overflow-hidden relative">
                {/* Top Header */}
                <DirectorHeader
                    title="루피 AI 디렉터"
                    leadingElement={
                        <div className="flex items-center mr-1">
                            <LoopieIcon className="w-8 h-8 cursor-pointer hover:scale-110 active:scale-95 transition-transform" />
                        </div>
                    }
                    channelSelectorElement={
                        <div className="relative">
                            <select
                                value={selectedTargetChannel?.id || ''}
                                onChange={(e) => {
                                    const found = targetChannels.find(tc => tc.id === e.target.value);
                                    setSelectedTargetChannel(found || null);
                                }}
                                className="h-7 px-2.5 text-xs font-semibold bg-muted/50 hover:bg-muted text-foreground rounded-lg border border-border/80 focus:outline-hidden cursor-pointer max-w-[140px] sm:max-w-[200px] truncate shadow-2xs transition-colors"
                                title="타겟 채널 선택"
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
                    selectedProvider={selectedProvider as any}
                    onSelectProvider={handleSelectProvider}
                    selectedModel={selectedModel}
                    onSelectModel={handleSelectModel}
                    reasoningEffort={reasoningEffort}
                    onSelectReasoningEffort={setReasoningEffort}
                    activePreset={activePreset}
                    onOpenPresetModal={() => setPresetModalOpen(true)}
                    sidebarCollapsed={sidebarCollapsed}
                    onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                    rightPanelOpen={rightPanelOpen}
                    onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
                />


                {/* Message Feed (Clean Markdown & Table Rendering) */}
                <DirectorMessageFeed
                    messages={messages}
                    isStreaming={isStreaming}
                    onSendMessage={handleSendMessage}
                    activePreset={activePreset}
                    onOpenInRightPanel={(v) => {
                        setActiveVideoView(v);
                        setRightPanelTab('backlot');
                        setRightPanelOpen(true);
                    }}
                    onEditMessage={(text) => {
                        setPrompt(text);
                        textareaRef.current?.focus();
                    }}
                    emptyStateTitle="루피 AI 디렉터"
                    emptyStateSubtitle="자율 주권 AI 모델과 실시간으로 대화하고, 필요한 기획과 영상을 직관적으로 제작하세요."
                />

                {/* Input Bar (Clean Send / Stop / Attachment Controls) */}
                <DirectorInputBar
                    prompt={prompt}
                    onChangePrompt={setPrompt}
                    onSendMessage={handleSendMessage}
                    isStreaming={isStreaming}
                    onCancelStream={handleStopGeneration}
                    attachedFiles={attachedFiles}
                    onRemoveAttachedFile={(id) => setAttachedFiles(prev => prev.filter(f => f.id !== id))}
                    activePreset={activePreset}
                    onOpenPresetModal={() => setPresetModalOpen(true)}
                    onClearPreset={() => setActivePreset(null)}
                    selectedProvider={selectedProvider as any}
                    onSelectProvider={handleSelectProvider}
                    selectedModel={selectedModel}
                    onSelectModel={handleSelectModel}
                    reasoningEffort={reasoningEffort}
                    onSelectReasoningEffort={setReasoningEffort}
                    hasMessages={messages.length > 0}
                    textareaRef={textareaRef}
                    autoFocus={true}
                />
            </main>

            {/* 3. Right Panel (Strictly 3 Core Tabs: 브라우저, 탐색기, 영상 보관함) */}
            <DirectorRightPanel
                open={rightPanelOpen}
                onClose={() => setRightPanelOpen(false)}
                activeTab={rightPanelTab}
                onTabChange={setRightPanelTab}
                activeBrowserUrl={activeBrowserUrl}
                activeVideo={activeVideoView}
                onClearActiveVideo={() => setActiveVideoView(null)}
                onSelectVideo={(v) => {
                    setActiveVideoView(v);
                    setRightPanelTab('preview');
                }}
            />

            {/* Settings & Preset Modals */}
            <IntegratedSettingsModal
                open={settingsModalOpen}
                isOpen={settingsModalOpen}
                onOpenChange={setSettingsModalOpen}
                onClose={() => setSettingsModalOpen(false)}
            />

            <PresetLoadModal
                open={presetModalOpen}
                isOpen={presetModalOpen}
                onOpenChange={setPresetModalOpen}
                onClose={() => setPresetModalOpen(false)}
                activePresetId={activePreset?.id}
                onSelectPreset={(p) => {
                    setActivePreset(p);
                    setPresetModalOpen(false);
                    toast.success(`프리셋 적용: ${p.name}`);
                }}
            />
        </div>
    );
};

export default ConversationalDirectorPage;
