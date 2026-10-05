import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    ChevronUp,
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
    Rocket,
    Mic,
    MicOff,
    Save,
    GraduationCap,
    LayoutDashboard,
    Compass,
    Palette,
    Clapperboard,
    ListVideo,
    Share2,
    HelpCircle,
    Archive,
    Search,
    MessageSquare,
    CheckCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { SourceCandidateCard, SourceCandidate } from '@/components/director/SourceCandidateCard';
import { SidecarBrowserView } from '@/components/director/SidecarBrowserView';
import { DirectorRightPanel, ActiveVideoView, DockTab } from '@/components/director/DirectorRightPanel';
import { directorSessionService } from '@/services/directorSessionService';

// 🌟 Pixeling 1.0.155 Fully Implemented Subview Components
import { PixelingDownloadsView } from '@/components/pixeling/PixelingDownloadsView';
import { PixelingLearningView } from '@/components/pixeling/PixelingLearningView';
import { PixelingDashboardView } from '@/components/pixeling/PixelingDashboardView';
import { PixelingContentsView } from '@/components/pixeling/PixelingContentsView';
import { PixelingCloudView } from '@/components/pixeling/PixelingCloudView';
import { PixelingPresetsView } from '@/components/pixeling/PixelingPresetsView';
import { PixelingBasicEditorView } from '@/components/pixeling/PixelingBasicEditorView';
import { PixelingMakeEditorView } from '@/components/pixeling/PixelingMakeEditorView';
import { PixelingListupView } from '@/components/pixeling/PixelingListupView';
import { PixelingSourcesView } from '@/components/pixeling/PixelingSourcesView';
import { PixelingOutputsView } from '@/components/pixeling/PixelingOutputsView';
import { PixelingSchedulesView } from '@/components/pixeling/PixelingSchedulesView';

// ---------------------------------------------------------------------------
// 🎨 Pixeling 1.0.155 Reverse Engineered Types & Interfaces
// ---------------------------------------------------------------------------
export type AIProvider = 'openai' | 'gemini' | 'claude' | 'deepseek';

export interface ToolActionItem {
    id: string;
    kind: 'reasoning' | 'webSearch' | 'tool' | 'fileChange' | 'command';
    verb: string;
    obj?: string | null;
    detail?: string;
    elapsedSeconds?: number;
    failed?: boolean;
    status: 'running' | 'completed' | 'failed';
    summary?: string;
}

export interface PixelingChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    reasoning?: string;
    toolsUsed?: ToolActionItem[];
    candidates?: SourceCandidate[];
    video_url?: string;
    audio_url?: string;
    capcut_draft_path?: string;
    actionChips?: string[];
    isStreaming?: boolean;
}

export interface ChatSession {
    id: string;
    title: string;
    dateStr: string;
    messages: PixelingChatMessage[];
    provider: AIProvider;
    model: string;
}

// ---------------------------------------------------------------------------
// 🌟 Pixeling 1.0.155 Menu Items (zF Array) - 100% ViraLoop Engine Connected
// ---------------------------------------------------------------------------
const STUDIO_MENUS = [
    { id: 'downloads', title: '다운로드 자료', icon: Folder, path: '/resource-guide', summary: '가이드와 양식을 찾아 내려받습니다.' },
    { id: 'learning', title: '픽셀러닝', icon: GraduationCap, path: '/guide-center', summary: '내 강의를 보고, 강의에 대해 질문하세요.' },
    { id: 'dashboard', title: '현황', icon: LayoutDashboard, path: '/channel-analytics', summary: '대화·결과물·사용 한도를 한 판에서 봅니다.' },
    { id: 'contents', title: '디스커버리', icon: Compass, path: '/sourcing-center', summary: '요즘 뜨는 쇼츠·채널·뉴스·SNS 트렌드를 한곳에서 찾아봅니다.' },
    { id: 'cloud', title: '클라우드', icon: Cloud, path: '/gallery', summary: '내 파일과 접근이 허용된 회사 파일을 관리합니다.' },
    { id: 'presets', title: '프리셋', icon: SlidersHorizontal, path: '/shorts-template-studio', summary: '채널 규격과 제작 방식을 프리셋으로 저장해 다시 씁니다.' },
    { id: 'editor', title: '기본 에디터', icon: Palette, path: '/basic-editor-studio', summary: '영상 없이 프리셋 껍데기(형식·스타일·글꼴)를 만들어 프리셋으로 저장하고 불러옵니다.', readyBadge: '가동' },
    { id: 'make', title: '메이크 에디터', icon: Clapperboard, path: '/pro-editor', summary: '고치던 편집본을 잇거나, 결과물 · 내 PC 의 영상과 그림을 열어 고칩니다.', readyBadge: '가동' },
    { id: 'listup', title: '리스트업', icon: ListVideo, path: '/channels', summary: '채널과 프로필의 공개 영상을 조건별로 찾아봅니다.' },
    { id: 'sources', title: '오퍼레이션', icon: Cpu, path: '/war-room', summary: '채널 운영과 수익·비용을 관리합니다.' },
    { id: 'outputs', title: '결과물', icon: Film, path: '/gallery', summary: '완성된 영상과 파일을 확인하고 내보냅니다.' },
    { id: 'schedules', title: '예약', icon: Calendar, path: '/work-queue', summary: '정해 둔 시간에 영상이나 카드뉴스 제작을 시작합니다.' },
];

const PIXELING_STORAGE_KEY = 'pixeling_director_sessions_v3';

// Helper: dynamic time-aware greeting
function getPixelingGreeting(name: string = 'GoGlobal') {
    const hour = new Date().getHours();
    const periodStr = hour < 5 ? '늦은 밤이네요' : hour < 12 ? '기분 좋은 아침이에요' : hour < 18 ? '활기찬 오후예요' : '편안한 저녁이에요';
    return `${name}님, ${periodStr}`;
}

export default function PixelingDirectorPage() {
    const navigate = useNavigate();

    // Active AI Provider state (OpenAI / Gemini / Claude / DeepSeek)
    const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai');
    const [selectedModel, setSelectedModel] = useState<string>('GPT-6.1 Sol · 복합');
    const [activePermissions, setActivePermissions] = useState<string>('모두 지원');

    // Chat sessions & active conversation
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string>('session-default');
    const [messages, setMessages] = useState<PixelingChatMessage[]>([]);
    const [inputText, setInputText] = useState<string>('');
    const [isStreaming, setIsStreaming] = useState<boolean>(false);

    // Active Subview / Studio Menu (home | downloads | learning | dashboard | contents | cloud | presets | editor | make | listup | sources | outputs | schedules)
    const [currentView, setCurrentView] = useState<string>('home');

    // Mascot animation state
    const [mascotFace, setMascotFace] = useState<'smile' | 'wince' | 'angry' | 'cry'>('smile');
    const [isMascotPoked, setIsMascotPoked] = useState<boolean>(false);

    // Right Split Panel (Live Browser / Video / Output)
    const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(false);
    const [activeRightTab, setActiveRightTab] = useState<DockTab>('browser');
    const [liveNavUrl, setLiveNavUrl] = useState<string>('');
    const [browserTitle, setBrowserTitle] = useState<string>('실시간 브라우저');
    const [activeVideo, setActiveVideo] = useState<ActiveVideoView | null>(null);

    // Accordion expand/collapse tracking
    const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});

    // References
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // 🌟 Load persisted sessions on mount (localStorage + viral_loop.db fallback)
    useEffect(() => {
        let loaded = false;
        try {
            const saved = localStorage.getItem(PIXELING_STORAGE_KEY);
            if (saved) {
                const parsed: ChatSession[] = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setSessions(parsed);
                    const mostRecent = parsed[0];
                    setActiveSessionId(mostRecent.id);
                    setMessages(mostRecent.messages || []);
                    if (mostRecent.provider) setSelectedProvider(mostRecent.provider);
                    if (mostRecent.model) setSelectedModel(mostRecent.model);
                    loaded = true;
                }
            }
        } catch (e) {
            console.warn('[Pixeling] Failed to parse local sessions', e);
        }

        if (!loaded) {
            // Backend SQLite fallback
            directorSessionService.getThreads().then(threads => {
                if (threads && threads.length > 0) {
                    const mapped: ChatSession[] = threads.map(t => ({
                        id: t.id,
                        title: t.title || '새 대화',
                        dateStr: t.updated_at ? new Date(t.updated_at).toLocaleDateString() : '방금',
                        provider: (t.provider as any) || 'openai',
                        model: t.model || 'GPT-6.1 Sol · 복합',
                        messages: []
                    }));
                    setSessions(mapped);
                    setActiveSessionId(mapped[0].id);
                } else {
                    const initId = `session-${Date.now()}`;
                    const defaultSession: ChatSession = {
                        id: initId,
                        title: '새 채팅',
                        dateStr: '방금',
                        provider: 'openai',
                        model: 'GPT-6.1 Sol · 복합',
                        messages: []
                    };
                    setSessions([defaultSession]);
                    setActiveSessionId(initId);
                }
            }).catch(() => {
                const initId = `session-${Date.now()}`;
                const defaultSession: ChatSession = {
                    id: initId,
                    title: '새 채팅',
                    dateStr: '방금',
                    provider: 'openai',
                    model: 'GPT-6.1 Sol · 복합',
                    messages: []
                };
                setSessions([defaultSession]);
                setActiveSessionId(initId);
            });
        }
    }, []);

    // 🌟 Persist sessions helper
    const persistSessions = (updated: ChatSession[]) => {
        setSessions(updated);
        try {
            localStorage.setItem(PIXELING_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
            console.warn('[Pixeling] Failed to persist sessions', e);
        }
    };

    // Mascot Poke Interaction
    const handleMascotPoke = () => {
        setIsMascotPoked(true);
        const faces: ('wince' | 'angry' | 'cry')[] = ['wince', 'angry', 'cry'];
        const nextFace = faces[Math.floor(Math.random() * faces.length)];
        setMascotFace(nextFace);

        setTimeout(() => {
            setMascotFace('smile');
            setIsMascotPoked(false);
        }, 1200);
    };

    // Auto-scroll to bottom of conversation
    useEffect(() => {
        if (messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isStreaming]);

    // Handle Provider change (OpenAI / Gemini / Claude / DeepSeek)
    const handleSelectProvider = (prov: AIProvider) => {
        setSelectedProvider(prov);
        if (prov === 'openai') setSelectedModel('GPT-6.1 Sol · 복합');
        else if (prov === 'gemini') setSelectedModel('Gemini 3.8 Flash · 고속');
        else if (prov === 'claude') setSelectedModel('Claude 3.7 Sonnet · 심층');
        else if (prov === 'deepseek') setSelectedModel('DeepSeek-V3 · 추론 (R1)');
        toast.success(`두뇌 모델이 [${prov.toUpperCase()}] 엔진으로 전환되었습니다.`);
    };

    // Toggle Accordion for a message
    const toggleAccordion = (msgId: string) => {
        setExpandedAccordions(prev => ({
            ...prev,
            [msgId]: !prev[msgId]
        }));
    };

    // Switch active session
    const handleSelectSession = (session: ChatSession) => {
        setActiveSessionId(session.id);
        setMessages(session.messages || []);
        if (session.provider) setSelectedProvider(session.provider);
        if (session.model) setSelectedModel(session.model);
        setCurrentView('home');
        toast.info(`'${session.title}' 대화 세션을 불러왔습니다.`);
    };

    // Delete session
    const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        const updated = sessions.filter(s => s.id !== sessionId);
        persistSessions(updated);
        if (activeSessionId === sessionId) {
            if (updated.length > 0) {
                setActiveSessionId(updated[0].id);
                setMessages(updated[0].messages || []);
            } else {
                handleStartNewChat();
            }
        }
        toast.success('대화 세션이 삭제되었습니다.');
    };

    // Start New Chat
    const handleStartNewChat = () => {
        setCurrentView('home');
        const newSessionId = `session-${Date.now()}`;
        setActiveSessionId(newSessionId);
        setMessages([]);
        setInputText('');
        setIsRightPanelOpen(false);
        setLiveNavUrl('');
        setActiveVideo(null);

        const newSession: ChatSession = {
            id: newSessionId,
            title: '새 채팅',
            dateStr: '방금',
            provider: selectedProvider,
            model: selectedModel,
            messages: []
        };
        const updated = [newSession, ...sessions.filter(s => s.id !== newSessionId)];
        persistSessions(updated);
        toast.info('새 대화 세션이 시작되었습니다.');
    };

    // Submit Prompt & Run Autonomous ReAct Streaming
    const handleSubmitPrompt = async (promptToSend?: string) => {
        const text = (promptToSend || inputText).trim();
        if (!text || isStreaming) return;

        setInputText('');
        setIsStreaming(true);

        const userMsgId = `user-${Date.now()}`;
        const assistantMsgId = `asst-${Date.now()}`;

        const newUserMsg: PixelingChatMessage = {
            id: userMsgId,
            role: 'user',
            content: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const initialAssistantMsg: PixelingChatMessage = {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            reasoning: '',
            toolsUsed: [],
            candidates: [],
            actionChips: [],
            isStreaming: true
        };

        const updatedMessages = [...messages, newUserMsg, initialAssistantMsg];
        setMessages(updatedMessages);
        setExpandedAccordions(prev => ({ ...prev, [assistantMsgId]: true }));

        // Update session list title if new session
        setSessions(prev => {
            const exists = prev.find(s => s.id === activeSessionId);
            if (!exists) {
                const newTitle = text.slice(0, 14) + (text.length > 14 ? '...' : '');
                return [{
                    id: activeSessionId,
                    title: newTitle,
                    dateStr: '방금 전',
                    messages: updatedMessages,
                    provider: selectedProvider,
                    model: selectedModel
                }, ...prev];
            }
            return prev.map(s => s.id === activeSessionId ? { ...s, messages: updatedMessages } : s);
        });

        const startTime = Date.now();

        try {
            const response = await fetch('/api/hermes/director/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({
                    prompt: text,
                    provider: selectedProvider === 'openai' ? 'OpenAI Codex (Astra)' : selectedProvider === 'gemini' ? 'Google Gemini' : selectedProvider === 'claude' ? 'Claude' : 'DeepSeek',
                    model: selectedModel,
                    history: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
                })
            });

            if (!response.ok || !response.body) {
                throw new Error(`HTTP ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

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
                        
                        // Tool start event
                        if (evt.type === 'tool_start') {
                            const newToolAction: ToolActionItem = {
                                id: `tool-${Date.now()}-${Math.random()}`,
                                kind: evt.tool_name === 'web_search_and_trends' ? 'webSearch' : 'tool',
                                verb: evt.tool_name === 'web_search_and_trends' ? '웹 검색하는 중' : 
                                      evt.tool_name === 'browser_navigate' ? '페이지 여는 중' :
                                      evt.tool_name === 'youtube_trending_charts' ? '유튜브 공식 차트 분석 중' :
                                      evt.tool_name === 'scout_candidate_videos' ? '실제 쇼츠 영상 발굴 중' : '도구 작업 중',
                                obj: evt.detail || evt.title,
                                detail: evt.detail,
                                status: 'running'
                            };

                            setMessages(curr => curr.map(m => {
                                if (m.id === assistantMsgId) {
                                    return {
                                        ...m,
                                        toolsUsed: [...(m.toolsUsed || []), newToolAction]
                                    };
                                }
                                return m;
                            }));
                        }

                        // Tool done event
                        else if (evt.type === 'tool_done') {
                            setMessages(curr => curr.map(m => {
                                if (m.id === assistantMsgId) {
                                    const tools = [...(m.toolsUsed || [])];
                                    if (tools.length > 0) {
                                        const last = tools[tools.length - 1];
                                        last.status = 'completed';
                                        last.verb = last.verb.replace('중', '함').replace('분석 중', '분석함').replace('발굴 중', '발굴함');
                                        last.elapsedSeconds = evt.elapsed_seconds || 1;
                                        last.summary = evt.summary;
                                    }
                                    return { ...m, toolsUsed: tools };
                                }
                                return m;
                            }));
                        }

                        // Browser Navigation event -> Open Sidecar Browser
                        else if (evt.type === 'browser_navigate') {
                            if (evt.url) {
                                setLiveNavUrl(evt.url);
                                setBrowserTitle(evt.title || '실시간 브라우저');
                                setIsRightPanelOpen(true);
                                setActiveRightTab('browser');
                            }
                        }

                        // Candidate videos scouted
                        else if (evt.type === 'source_candidates' && evt.candidates) {
                            setMessages(curr => curr.map(m => {
                                if (m.id === assistantMsgId) {
                                    return { ...m, candidates: evt.candidates };
                                }
                                return m;
                            }));
                        }

                        // Stream content chunk
                        else if (evt.type === 'content_chunk' && evt.delta) {
                            setMessages(curr => curr.map(m => {
                                if (m.id === assistantMsgId) {
                                    return { ...m, content: (m.content || '') + evt.delta };
                                }
                                return m;
                            }));
                        }

                        // Rendered video deliverable
                        else if (evt.type === 'media_deliverable' || evt.type === 'video_ready') {
                            const vUrl = evt.video_url || evt.url;
                            setMessages(curr => curr.map(m => {
                                if (m.id === assistantMsgId) {
                                    return {
                                        ...m,
                                        video_url: vUrl,
                                        capcut_draft_path: evt.capcut_draft_path || m.capcut_draft_path,
                                        actionChips: evt.action_chips || m.actionChips
                                    };
                                }
                                return m;
                            }));
                            if (vUrl) {
                                setActiveVideo({
                                    url: vUrl,
                                    title: evt.title || '완성된 쇼츠 영상',
                                    provider: 'REMOTION'
                                });
                                setIsRightPanelOpen(true);
                                setActiveRightTab('video');
                            }
                            toast.success('🎬 쇼츠 영상 제작이 완료되었습니다!');
                        }

                        // Synthesized audio deliverable
                        else if (evt.type === 'audio_deliverable') {
                            const aUrl = evt.audio_url || evt.url;
                            setMessages(curr => curr.map(m => {
                                if (m.id === assistantMsgId) {
                                    return {
                                        ...m,
                                        audio_url: aUrl
                                    };
                                }
                                return m;
                            }));
                            toast.success(`🎙️ AI 음성 합성이 완료되었습니다. (${evt.voice_id || 'Charon'})`);
                        }

                        // CapCut draft ready event
                        else if (evt.type === 'capcut_draft_ready') {
                            const dPath = evt.draft_path || evt.project_dir;
                            setMessages(curr => curr.map(m => {
                                if (m.id === assistantMsgId) {
                                    return {
                                        ...m,
                                        capcut_draft_path: dPath,
                                        actionChips: evt.action_chips || m.actionChips
                                    };
                                }
                                return m;
                            }));
                            toast.success('🚀 CapCut 데스크톱 프로젝트가 성공적으로 생성되었습니다!');
                        }

                        // Final response & action chips
                        else if (evt.type === 'chat_response') {
                            setMessages(curr => curr.map(m => {
                                if (m.id === assistantMsgId) {
                                    return {
                                        ...m,
                                        content: evt.content || m.content,
                                        actionChips: evt.action_chips || m.actionChips,
                                        isStreaming: false
                                    };
                                }
                                return m;
                            }));
                        }
                    } catch {
                        // ignore malformed chunks
                    }
                }
            }
        } catch (err: any) {
            toast.error(`응답 수신 실패: ${err.message}`);
        } finally {
            setIsStreaming(false);
            setMessages(curr => {
                const finalMsgs = curr.map(m => m.id === assistantMsgId ? { ...m, isStreaming: false } : m);
                setSessions(prev => {
                    const updated = prev.map(s => s.id === activeSessionId ? { ...s, messages: finalMsgs } : s);
                    try {
                        localStorage.setItem(PIXELING_STORAGE_KEY, JSON.stringify(updated));
                    } catch (e) {
                        console.warn('[Pixeling] Failed to save session:', e);
                    }
                    return updated;
                });
                return finalMsgs;
            });
        }
    };

    // OS & CapCut Physical Control Bridges
    const handleLaunchCapCut = async (draftPath?: string) => {
        try {
            toast.info('CapCut 데스크톱 프로젝트를 실행합니다...');
            const res = await fetch('/api/videos/launch-capcut', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ draft_path: draftPath })
            });
            if (!res.ok) {
                await fetch('/api/system/launch-capcut', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ project_name: draftPath })
                });
            }
            toast.success('CapCut 데스크톱이 성공적으로 실행되었습니다.');
        } catch (e: any) {
            toast.error(`CapCut 실행 실패: ${e.message}`);
        }
    };

    const handleOpenExports = async () => {
        try {
            await fetch('/api/system/open-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_name: '05_Exports' })
            });
            toast.success('05_Exports 결과물 폴더를 열었습니다.');
        } catch (e: any) {
            toast.error(`폴더 열기 실패: ${e.message}`);
        }
    };

    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    const SAMPLE_PROMPTS = [
        { title: '아이돌 트렌드 쇼츠', text: '이번달 기준 유튜브에서 조회수, 트래픽 제일 많이 나올만한 아이돌 그룹 10 추천해줘' },
        { title: '인터뷰 60초 숏폼 3편', text: '어제 올린 인터뷰 영상으로 60초 숏폼 3편 만들어 줘' },
        { title: '바이럴 쇼츠 발굴 & 캡컷', text: '지금 가장 핫한 바이럴 쇼츠 영상 발굴해서 캡컷 프로젝트로 즉시 조립해줘' },
        { title: '감성 AI 보이스 합성', text: '시청자의 시선을 3초 만에 사로잡는 강력한 훅 나레이션을 감성 AI 음성으로 합성해줘' }
    ];

    // Mascot Asset Source
    const getMascotSrc = () => {
        if (mascotFace === 'wince') return '/pixeling/mascot_wince-B1zc2BWN.webp';
        if (mascotFace === 'angry') return '/pixeling/mascot_angry-DCzxssFk.webp';
        if (mascotFace === 'cry') return '/pixeling/mascot_cry-bwzOrY4Y.webp';
        return '/pixeling/mascot.webp';
    };

    const hasMessages = messages.length > 0;

    return (
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans select-none">
            {/* ========================================================================= */}
            {/* 1. PIXELING 1.0.155 EXACT LEFT SIDEBAR                                     */}
            {/* ========================================================================= */}
            <aside className="w-64 shrink-0 border-r border-border/70 bg-card/60 flex flex-col h-full z-20">
                {/* Header Logo & Toggle */}
                <div className="p-3.5 flex items-center justify-between border-b border-border/40">
                    <div 
                        onClick={() => setCurrentView('home')}
                        className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity"
                        title="홈 대화창으로 이동"
                    >
                        <img 
                            src="/pixeling/mascot_small-C0nxuUuL.webp" 
                            alt="Pixeling" 
                            className="w-6 h-6 object-contain" 
                        />
                        <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-[15px] tracking-tight text-foreground">Pixeling</span>
                            <span className="text-[10px] font-medium text-muted-foreground/80 px-1 py-0.2 bg-muted rounded">desktop</span>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={() => navigate('/director')}
                        title="루피 디렉터로 전환" 
                        className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/80 transition-colors"
                    >
                        <PanelRight className="w-4 h-4" />
                    </button>
                </div>

                {/* + 새 채팅 (Ctrl N) Button */}
                <div className="p-3">
                    <button
                        type="button"
                        onClick={handleStartNewChat}
                        className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl py-2 px-3 text-xs font-semibold flex items-center justify-between shadow-xs transition-all cursor-pointer"
                    >
                        <span className="flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            새 채팅
                        </span>
                        <span className="text-[10px] bg-blue-700/60 px-1.5 py-0.5 rounded text-blue-100 font-mono">
                            Ctrl N
                        </span>
                    </button>
                </div>

                {/* Scrollable Middle Menus */}
                <div className="flex-1 overflow-y-auto px-2 space-y-4 text-xs scrollbar-thin">
                    {/* Section: 스튜디오 */}
                    <div>
                        <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground/80 tracking-tight">
                            스튜디오
                        </div>
                        <div className="space-y-0.5">
                            {STUDIO_MENUS.map(m => {
                                const IconComponent = m.icon;
                                const isActive = currentView === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setCurrentView(m.id)}
                                        title={m.summary}
                                        className={cn(
                                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer group",
                                            isActive 
                                                ? "bg-muted text-foreground font-semibold shadow-xs" 
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                                        )}
                                    >
                                        <span className="flex items-center gap-2">
                                            <IconComponent className={cn(
                                                "w-3.5 h-3.5 shrink-0 transition-colors",
                                                isActive ? "text-blue-600" : "text-muted-foreground group-hover:text-foreground"
                                            )} />
                                            <span className="truncate">{m.title}</span>
                                        </span>
                                        {m.readyBadge ? (
                                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                                                {m.readyBadge}
                                            </span>
                                        ) : m.preparing ? (
                                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                                                준비 중
                                            </span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section: 프로젝트 */}
                    <div>
                        <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold text-muted-foreground/80 tracking-tight">
                            <span>프로젝트</span>
                            <div className="flex items-center gap-1">
                                <Plus className="w-3 h-3 cursor-pointer hover:text-foreground" />
                                <Folder className="w-3 h-3 cursor-pointer hover:text-foreground" />
                            </div>
                        </div>
                        <div className="p-2.5 rounded-xl border border-dashed border-border/70 bg-muted/20 text-center">
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                아직 로컬 에셋이 없어요.<br />폴더를 대화로 넣어 보면 찾기 쉬워요.
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate('/pipeline-builder')}
                                className="mt-2 w-full py-1 px-2 border border-border/80 rounded-lg text-[11px] font-medium bg-background hover:bg-muted text-foreground transition-all cursor-pointer"
                            >
                                새 프로젝트
                            </button>
                        </div>
                    </div>

                    {/* Section: AI 모델 (2x2 Grid) */}
                    <div>
                        <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground/80 tracking-tight">
                            AI 모델
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {[
                                { id: 'openai', label: 'OpenAI' },
                                { id: 'gemini', label: 'Gemini' },
                                { id: 'claude', label: 'Claude' },
                                { id: 'deepseek', label: 'DeepSeek' }
                            ].map(item => {
                                const isSelected = selectedProvider === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleSelectProvider(item.id as AIProvider)}
                                        className={cn(
                                            "py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer",
                                            isSelected 
                                                ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-xs" 
                                                : "border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section: 최근 세션 */}
                    <div>
                        <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground/80 tracking-tight flex items-center justify-between">
                            <span>최근 대화 ({sessions.length})</span>
                        </div>
                        <div className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin">
                            {sessions.map(s => {
                                const isActive = s.id === activeSessionId;
                                return (
                                    <div
                                        key={s.id}
                                        onClick={() => handleSelectSession(s)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer group",
                                            isActive 
                                                ? "bg-muted text-foreground font-medium shadow-2xs" 
                                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                                            <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                                            <div className="truncate flex-1">
                                                <div className="truncate text-xs">{s.title}</div>
                                                <div className="text-[10px] text-muted-foreground/70">{s.dateStr}</div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteSession(e, s.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded transition-opacity cursor-pointer"
                                            title="세션 삭제"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Sidebar Bottom Footer */}
                <div className="p-2 border-t border-border/50 space-y-1">
                    <button type="button" className="w-full flex items-center gap-2 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors cursor-pointer">
                        <Archive className="w-3.5 h-3.5" />
                        <span>보관된 채팅</span>
                    </button>
                    <button type="button" className="w-full flex items-center gap-2 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors cursor-pointer">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>고객지원</span>
                    </button>
                    <button type="button" onClick={() => navigate('/settings')} className="w-full flex items-center gap-2 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors cursor-pointer">
                        <Settings className="w-3.5 h-3.5" />
                        <span>설정</span>
                    </button>

                    {/* Profile Card */}
                    <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-muted/40">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            G
                        </div>
                        <div className="truncate flex-1">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-foreground">GoGlobal</span>
                                <span className="text-[9px] px-1 py-0.2 rounded bg-muted-foreground/20 text-foreground font-medium">정액제</span>
                                <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold">PRO</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">go-global@naver.com</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ========================================================================= */}
            {/* 2. MAIN WORKSPACE AREA                                                     */}
            {/* ========================================================================= */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
                {/* Top Nav Header */}
                {currentView === 'home' ? (
                    <header className="h-12 border-b border-border/50 px-6 flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-xs z-10">
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold text-foreground">
                                {hasMessages ? (sessions.find(s => s.id === activeSessionId)?.title || '새 채팅') : '새 채팅'}
                            </h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
                                title="새로고침"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const content = messages.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n\n');
                                    const blob = new Blob([content], { type: 'text/markdown' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `pixeling-chat-${Date.now()}.md`;
                                    a.click();
                                    toast.success('대화 기록이 마크다운 파일로 다운로드되었습니다.');
                                }}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
                                title="대화 다운로드"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const content = messages.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n\n');
                                    navigator.clipboard.writeText(content);
                                    toast.success('대화 내용이 클립보드에 복사되었습니다.');
                                }}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
                                title="대화 복사"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                                className={cn(
                                    "p-1.5 rounded-md transition-colors cursor-pointer",
                                    isRightPanelOpen ? "text-blue-600 bg-blue-50 dark:bg-blue-950/40" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                                title="스플릿 패널 토글"
                            >
                                <PanelRight className="w-4 h-4" />
                            </button>
                        </div>
                    </header>
                ) : (
                    <header className="h-12 border-b border-border/50 px-6 flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-xs z-10">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setCurrentView('home')}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium transition-colors cursor-pointer"
                                title="대화창으로 돌아가기"
                            >
                                <span>홈</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            <h1 className="text-sm font-bold text-foreground">
                                {STUDIO_MENUS.find(m => m.id === currentView)?.title}
                            </h1>
                            <span className="text-xs text-muted-foreground hidden md:inline-block">
                                — {STUDIO_MENUS.find(m => m.id === currentView)?.summary}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const menu = STUDIO_MENUS.find(m => m.id === currentView);
                                    if (menu?.path) navigate(menu.path);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                                title="독립 작업실 전체 화면으로 열기"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>독립 화면으로 열기</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentView('home')}
                                className="px-3 py-1 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                            >
                                <span>대화창으로 돌아가기</span>
                            </button>
                        </div>
                    </header>
                )}

                {/* Content Container (Split with Right Panel if open) */}
                {currentView === 'home' ? (
                    <div className="flex-1 flex overflow-hidden">
                        {/* Left/Center Chat View */}
                        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                        {/* 2.A: HOME VIEW (Empty State) */}
                        {!hasMessages ? (
                            <div className="flex-1 overflow-y-auto px-6 flex flex-col items-center justify-center pb-12">
                                <div className="w-full max-w-2xl flex flex-col items-center gap-7 py-6">
                                    {/* Mascot Interactive Poke Area */}
                                    <div className="text-center flex flex-col items-center">
                                        <button
                                            type="button"
                                            onClick={handleMascotPoke}
                                            aria-label="픽시 콕 찌르기"
                                            data-mascot-face={mascotFace}
                                            className={cn(
                                                "relative block w-[104px] h-[104px] cursor-pointer select-none rounded-full outline-none transition-transform duration-300",
                                                isMascotPoked ? "scale-90" : "hover:scale-105 active:scale-95"
                                            )}
                                            style={{
                                                filter: 'drop-shadow(0 18px 24px rgba(37,99,235,0.35))'
                                            }}
                                        >
                                            <img
                                                src={getMascotSrc()}
                                                alt="Pixeling Mascot"
                                                className="w-full h-full object-contain pointer-events-none transition-all duration-200"
                                            />
                                        </button>
                                        <p className="mt-4 text-xs font-semibold text-muted-foreground">
                                            {getPixelingGreeting('GoGlobal')}
                                        </p>
                                        <h2 className="mt-1.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                                            무엇을 <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 bg-clip-text text-transparent">만들까요?</span>
                                        </h2>
                                        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                                            만들고 싶은 영상이나 그리고 싶은 상상을 자유롭게 말씀해 주세요.
                                        </p>
                                    </div>

                                    {/* Central Home Input Card */}
                                    <div className="w-full bg-card border border-border/80 rounded-3xl p-4 shadow-sm relative transition-all focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500">
                                        {/* Top Action Chip */}
                                        <div className="pb-2 relative">
                                            <button
                                                type="button"
                                                onClick={() => setIsLoadModalOpen(!isLoadModalOpen)}
                                                className="text-[11px] font-medium text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-2.5 py-1 rounded-full transition-colors cursor-pointer inline-flex items-center gap-1"
                                            >
                                                <span>이전 작업 불러오기</span>
                                                <ChevronDown className="w-3 h-3 opacity-60" />
                                            </button>

                                            {/* Quick Actions Dropdown */}
                                            {isLoadModalOpen && (
                                                <div className="absolute top-8 left-0 w-84 bg-popover border border-border/80 rounded-2xl p-2 shadow-lg z-30 space-y-1 animate-in fade-in-50 zoom-in-95">
                                                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground/80 tracking-tight">
                                                        추천 원클릭 작업 발주
                                                    </div>
                                                    {SAMPLE_PROMPTS.map((p, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => {
                                                                setInputText(p.text);
                                                                setIsLoadModalOpen(false);
                                                            }}
                                                            className="w-full text-left p-2 rounded-xl hover:bg-muted/70 transition-colors group cursor-pointer"
                                                        >
                                                            <div className="text-xs font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                                                {p.title}
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                                                {p.text}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Auto-growing Textarea */}
                                        <textarea
                                            ref={textareaRef}
                                            value={inputText}
                                            onChange={e => setInputText(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSubmitPrompt();
                                                }
                                            }}
                                            placeholder="예: 어제 올린 인터뷰 영상으로 60초 숏폼 3편 만들어 줘"
                                            rows={3}
                                            className="w-full resize-none bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/60 leading-relaxed"
                                        />

                                        {/* Bottom Toolbar inside card */}
                                        <div className="pt-2 flex items-center justify-between border-t border-border/40 mt-1">
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    title="미디어 첨부"
                                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors cursor-pointer"
                                                >
                                                    <Paperclip className="w-4 h-4" />
                                                </button>
                                                
                                                {/* Model Selector Pill */}
                                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 text-xs font-semibold text-foreground">
                                                    <span>{selectedModel}</span>
                                                    <ChevronDown className="w-3 h-3 opacity-60" />
                                                </div>

                                                {/* Capabilities Pill */}
                                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 text-xs font-semibold text-foreground">
                                                    <span>{activePermissions}</span>
                                                    <ChevronDown className="w-3 h-3 opacity-60" />
                                                </div>
                                            </div>

                                            {/* Blue Circular Submit Button */}
                                            <button
                                                type="button"
                                                onClick={() => handleSubmitPrompt()}
                                                disabled={!inputText.trim() || isStreaming}
                                                className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm",
                                                    inputText.trim() && !isStreaming
                                                        ? "bg-blue-600 hover:bg-blue-700 text-white active:scale-95"
                                                        : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                                )}
                                            >
                                                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* 2.B: ACTIVE CONVERSATION FEED */
                            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-thin">
                                {messages.map(msg => {
                                    const isUser = msg.role === 'user';
                                    const isExpanded = expandedAccordions[msg.id] ?? true;

                                    if (isUser) {
                                        return (
                                            <div key={msg.id} className="flex justify-end">
                                                <div className="max-w-2xl bg-muted/80 text-foreground px-4 py-3 rounded-2xl text-sm leading-relaxed border border-border/40 shadow-xs">
                                                    {msg.content}
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={msg.id} className="flex items-start gap-3 max-w-4xl">
                                            {/* Pixeling Mascot Mini Avatar */}
                                            <div className="w-8 h-8 shrink-0 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center overflow-hidden shadow-xs mt-0.5">
                                                <img src="/pixeling/mascot_small-C0nxuUuL.webp" alt="Pixeling" className="w-6 h-6 object-contain" />
                                            </div>

                                            <div className="flex-1 space-y-3 min-w-0">
                                                {/* PIXELING 1.0.155 REACT ACCORDION ("작업 과정") */}
                                                {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                                                    <div className="border border-border/80 rounded-xl bg-card overflow-hidden shadow-xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleAccordion(msg.id)}
                                                            className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-2 text-foreground">
                                                                {msg.isStreaming ? (
                                                                    <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                                                                ) : (
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                )}
                                                                <span>
                                                                    작업 과정 도구 {msg.toolsUsed.length}번 사용
                                                                </span>
                                                                <span className="text-muted-foreground font-normal">
                                                                    · {msg.isStreaming ? '작업 중…' : '완료됨'}
                                                                </span>
                                                            </div>
                                                            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")} />
                                                        </button>

                                                        {isExpanded && (
                                                            <div className="p-3 border-t border-border/50 space-y-2 text-xs bg-background/50">
                                                                {msg.toolsUsed.map(t => (
                                                                    <div key={t.id} className="flex items-start gap-2.5 text-muted-foreground">
                                                                        {t.status === 'running' ? (
                                                                            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin mt-0.5 shrink-0" />
                                                                        ) : (
                                                                            <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0 stroke-[2.5]" />
                                                                        )}
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="font-semibold text-foreground">{t.verb}</span>
                                                                                {t.elapsedSeconds && (
                                                                                    <span className="text-[10px] text-muted-foreground font-mono">({t.elapsedSeconds}초)</span>
                                                                                )}
                                                                            </div>
                                                                            {t.obj && (
                                                                                <div className="text-[11px] text-muted-foreground/80 truncate mt-0.5">
                                                                                    {t.obj}
                                                                                </div>
                                                                            )}
                                                                            {t.summary && (
                                                                                <div className="text-[11px] text-muted-foreground mt-0.5 bg-muted/40 p-1.5 rounded">
                                                                                    {t.summary}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Markdown Body Content */}
                                                {msg.content && (
                                                    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                table: ({ node, ...props }) => (
                                                                    <div className="my-4 overflow-x-auto rounded-xl border border-border/80 shadow-xs">
                                                                        <table className="w-full text-xs text-left border-collapse" {...props} />
                                                                    </div>
                                                                ),
                                                                th: ({ node, ...props }) => (
                                                                    <th className="bg-muted/80 text-foreground font-bold px-3 py-2 border-b border-border/80 text-[11px]" {...props} />
                                                                ),
                                                                td: ({ node, ...props }) => (
                                                                    <td className="px-3 py-2.5 border-b border-border/40 text-xs" {...props} />
                                                                ),
                                                                a: ({ node, href, children, ...props }) => (
                                                                    <a 
                                                                        href={href} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        onClick={(e) => {
                                                                            if (href && (href.includes('youtube.com') || href.includes('youtu.be'))) {
                                                                                e.preventDefault();
                                                                                setLiveNavUrl(href);
                                                                                setBrowserTitle('유튜브 영상 확인');
                                                                                setIsRightPanelOpen(true);
                                                                                setActiveRightTab('browser');
                                                                            }
                                                                        }}
                                                                        className="text-blue-600 dark:text-blue-400 hover:underline font-semibold inline-flex items-center gap-0.5 cursor-pointer"
                                                                        {...props}
                                                                    >
                                                                        {children}
                                                                        <ExternalLink className="w-2.5 h-2.5 inline" />
                                                                    </a>
                                                                )
                                                            }}
                                                        >
                                                            {msg.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                )}

                                                {/* Source Video Candidates Cards */}
                                                {msg.candidates && msg.candidates.length > 0 && (
                                                    <div className="mt-4 pt-3 border-t border-border/60">
                                                        <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                                                            <Film className="w-3.5 h-3.5 text-blue-600" />
                                                            실시간 발굴된 쇼츠 원천 영상 클립 ({msg.candidates.length}편)
                                                        </h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {msg.candidates.map((cand, idx) => (
                                                                <SourceCandidateCard
                                                                    key={cand.id || idx}
                                                                    candidate={cand}
                                                                    onSelect={() => {
                                                                        handleSubmitPrompt(`위 발굴된 영상 '${cand.title}'을 원천 소스로 4대 폼팩터 쇼츠를 즉시 기획하고 제작해줘.`);
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Rendered Video Deliverable */}
                                                {msg.video_url && (
                                                    <div className="mt-4 p-4 border border-border/80 rounded-2xl bg-card space-y-3 shadow-xs">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                                                <FileVideo className="w-4 h-4 text-blue-600" />
                                                                <span>완성된 4대 폼팩터 쇼츠 영상</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleLaunchCapCut(msg.capcut_draft_path)}
                                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
                                                                >
                                                                    <Rocket className="w-3.5 h-3.5" />
                                                                    CapCut으로 열기
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleOpenExports}
                                                                    className="px-2.5 py-1 rounded-lg text-xs font-medium border border-border/80 bg-background hover:bg-muted text-foreground flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <Folder className="w-3.5 h-3.5" />
                                                                    폴더 열기
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="relative rounded-xl overflow-hidden bg-black max-w-sm mx-auto aspect-[9/16] shadow-sm">
                                                            <video
                                                                src={msg.video_url}
                                                                controls
                                                                playsInline
                                                                className="w-full h-full object-contain"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Synthesized Audio Deliverable */}
                                                {msg.audio_url && (
                                                    <div className="mt-3 p-3 border border-border/80 rounded-xl bg-card space-y-2 shadow-xs">
                                                        <div className="flex items-center justify-between text-xs font-bold text-foreground">
                                                            <div className="flex items-center gap-2">
                                                                <Volume2 className="w-4 h-4 text-emerald-600" />
                                                                <span>합성된 AI 감성 보이스</span>
                                                            </div>
                                                        </div>
                                                        <audio
                                                            src={msg.audio_url}
                                                            controls
                                                            className="w-full h-8"
                                                        />
                                                    </div>
                                                )}

                                                {/* CapCut Draft Ready Card */}
                                                {msg.capcut_draft_path && !msg.video_url && (
                                                    <div className="mt-3 p-3.5 border border-border/80 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 flex items-center justify-between shadow-xs">
                                                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                                            <Rocket className="w-4 h-4 text-blue-600" />
                                                            <span>CapCut PC 프로젝트 준비 완료</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleLaunchCapCut(msg.capcut_draft_path)}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
                                                        >
                                                            <Play className="w-3 h-3 fill-current" />
                                                            CapCut 데스크톱 실행
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Action Chips */}
                                                {msg.actionChips && msg.actionChips.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 pt-2">
                                                        {msg.actionChips.map((chip, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={() => handleSubmitPrompt(chip)}
                                                                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-border/80 bg-background hover:bg-muted text-foreground transition-all active:scale-95 shadow-2xs cursor-pointer"
                                                            >
                                                                {chip}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        )}

                        {/* 2.C: FLOATING BOTTOM INPUT BAR (Active Chat Mode) */}
                        {hasMessages && (
                            <div className="p-4 border-t border-border/50 bg-background/95 backdrop-blur-xs">
                                <div className="max-w-4xl mx-auto bg-card border border-border/80 rounded-2xl p-3 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500">
                                    <textarea
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSubmitPrompt();
                                            }
                                        }}
                                        placeholder="이어서 요청하거나 궁금한 것을 물어보세요..."
                                        rows={2}
                                        className="w-full resize-none bg-transparent outline-none text-xs text-foreground placeholder:text-muted-foreground/60 leading-relaxed"
                                    />
                                    <div className="pt-2 flex items-center justify-between border-t border-border/30 mt-1">
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                title="미디어 첨부"
                                                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors cursor-pointer"
                                            >
                                                <Paperclip className="w-3.5 h-3.5" />
                                            </button>
                                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 text-[11px] font-semibold text-foreground">
                                                <span>{selectedModel}</span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleSubmitPrompt()}
                                            disabled={!inputText.trim() || isStreaming}
                                            className={cn(
                                                "w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm",
                                                inputText.trim() && !isStreaming
                                                    ? "bg-blue-600 hover:bg-blue-700 text-white active:scale-95"
                                                    : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                            )}
                                        >
                                            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ========================================================================= */}
                    {/* 3. RIGHT SPLIT PANEL (Live Sidecar Browser / Output Inspect)              */}
                    {/* ========================================================================= */}
                    {isRightPanelOpen && (
                        <div className="w-[45%] shrink-0 border-l border-border/70 bg-card flex flex-col h-full z-10 animate-in slide-in-from-right-4 duration-200">
                            {/* Panel Tab Header */}
                            <div className="h-10 px-4 border-b border-border/60 flex items-center justify-between bg-muted/30">
                                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                                    <span>{browserTitle}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsRightPanelOpen(false)}
                                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Browser Webview Frame */}
                            <div className="flex-1 bg-background relative overflow-hidden flex flex-col">
                                {liveNavUrl ? (
                                    <iframe
                                        src={liveNavUrl}
                                        title="Live Browser Navigation"
                                        className="w-full flex-1 border-0"
                                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                                    />
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                        <Compass className="w-10 h-10 mb-3 opacity-30 animate-pulse" />
                                        <p className="text-xs font-semibold">실시간 브라우저 대기 중</p>
                                        <p className="text-[11px] text-muted-foreground/80 mt-1">
                                            AI 디렉터가 웹 검색이나 유튜브 차트를 탐색하면 실시간으로 화면이 동기화됩니다.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                ) : currentView === 'downloads' ? (
                    <PixelingDownloadsView 
                        onAskInChat={(prompt) => {
                            setCurrentView('home');
                            setInputText(prompt);
                            setTimeout(() => handleSubmitPrompt(prompt), 100);
                        }} 
                    />
                ) : currentView === 'learning' ? (
                    <PixelingLearningView 
                        onAskInChat={(prompt) => {
                            setCurrentView('home');
                            setInputText(prompt);
                            setTimeout(() => handleSubmitPrompt(prompt), 100);
                        }} 
                    />
                ) : currentView === 'dashboard' ? (
                    <PixelingDashboardView onNavigateView={(v) => setCurrentView(v)} />
                ) : currentView === 'contents' ? (
                    <PixelingContentsView 
                        onMakeShortsFromTrend={(prompt) => {
                            setCurrentView('home');
                            setInputText(prompt);
                            setTimeout(() => handleSubmitPrompt(prompt), 100);
                        }} 
                    />
                ) : currentView === 'cloud' ? (
                    <PixelingCloudView onOpenPresetManagement={() => setCurrentView('presets')} />
                ) : currentView === 'presets' ? (
                    <PixelingPresetsView onOpenInBasicEditor={() => setCurrentView('editor')} />
                ) : currentView === 'editor' ? (
                    <PixelingBasicEditorView onOpenFullStudio={() => navigate('/basic-editor-studio')} />
                ) : currentView === 'make' ? (
                    <PixelingMakeEditorView 
                        onOpenFullProEditor={() => navigate('/pro-editor')} 
                        onLaunchCapCut={() => handleLaunchCapCut()} 
                    />
                ) : currentView === 'listup' ? (
                    <PixelingListupView 
                        onBatchProduceShorts={(titles) => {
                            setCurrentView('home');
                            const prompt = `다음 선택된 영상들을 바탕으로 4대 폼팩터 쇼츠를 일괄 제작해 줘:\n${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
                            setInputText(prompt);
                            setTimeout(() => handleSubmitPrompt(prompt), 100);
                        }} 
                    />
                ) : currentView === 'sources' ? (
                    <PixelingSourcesView onOpenWarRoom={() => navigate('/war-room')} />
                ) : currentView === 'outputs' ? (
                    <PixelingOutputsView onLaunchCapCut={(draftPath) => handleLaunchCapCut(draftPath)} />
                ) : currentView === 'schedules' ? (
                    <PixelingSchedulesView />
                ) : null}
            </main>
        </div>
    );
}
