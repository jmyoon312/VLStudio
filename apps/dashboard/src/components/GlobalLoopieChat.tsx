import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Send, Volume2, VolumeX, Mic, Loader2, Gauge, MessageSquare, 
    Play, Check, AlertTriangle, Sparkles, Maximize2, Minimize2, 
    Sidebar, Trash2, Zap, ChevronRight
} from 'lucide-react';
import { cn, fetchWithRetry } from '../lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';

export const LoopieIcon = ({ className, isTalking, isSmall }: { className?: string, isTalking?: boolean, isSmall?: boolean }) => (
    <div className={cn("relative flex items-center justify-center shrink-0 overflow-visible", className)}>
        <style>
            {`
                @keyframes loopie-blink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    95% { transform: scaleY(0.1); }
                }
                @keyframes loopie-wobble {
                    0%, 100% { transform: scale(1) rotate(0deg); border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
                    50% { transform: scale(1.1) rotate(5deg); border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
                }
                @keyframes loopie-float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes loopie-talk {
                    0%, 100% { transform: scaleY(1); }
                    50% { transform: scaleY(1.8) translateY(1px); }
                }
                .animate-loopie-blink { animation: loopie-blink 4s infinite; }
                .animate-loopie-wobble { animation: loopie-wobble 8s ease-in-out infinite; }
                .animate-loopie-float { animation: loopie-float 4s ease-in-out infinite; }
                .animate-loopie-talk { animation: loopie-talk 0.2s ease-in-out infinite; }
            `}
        </style>
        
        <div className="absolute inset-0 flex items-center justify-center isolate animate-loopie-float">
            <div className={cn(
                "absolute animate-loopie-wobble mix-blend-screen blur-[15px] bg-gradient-to-tr from-blue-400 via-cyan-300 to-indigo-400 transition-all duration-500",
                isSmall ? "inset-[-30%] opacity-30" : "inset-[-60%]",
                !isSmall && isTalking ? "opacity-100 scale-150 blur-[20px]" : "opacity-40"
            )} style={{ animationDuration: '10s' }} />
            
            <div className={cn(
                "absolute inset-0 animate-loopie-wobble bg-blue-600 shadow-inner-[0_0_20px_rgba(255,255,255,0.4)]",
                isSmall ? "shadow-[0_4px_12px_rgba(37,99,235,0.3)]" : "shadow-[0_10px_35px_rgba(37,99,235,0.5)]"
            )} style={{ animationDuration: '6s', animationDelay: '-2s' }} />
            
            <div className="absolute top-[10%] left-[15%] w-[40%] h-[20%] bg-white/40 blur-[3px] rounded-full rotate-[-25deg] pointer-events-none" />
        </div>
        
        <div className={cn(
            "relative z-30 flex flex-col items-center animate-loopie-float",
            isSmall ? "gap-[2px] translate-y-[2px]" : "gap-[5px] translate-y-[8px]"
        )}>
            <div className={cn("flex", isSmall ? "gap-2" : "gap-4")}>
                <div className={cn("relative bg-blue-950 rounded-full animate-loopie-blink", isSmall ? "w-[3px] h-[5px]" : "w-[7.5px] h-[12.5px]")}>
                    <div className="absolute top-[15%] right-[10%] w-[40%] h-[30%] bg-white rounded-full opacity-95" />
                </div>
                <div className={cn("relative bg-blue-950 rounded-full animate-loopie-blink", isSmall ? "w-[3px] h-[5px]" : "w-[7.5px] h-[12.5px]")}>
                    <div className="absolute top-[15%] right-[10%] w-[40%] h-[30%] bg-white rounded-full opacity-95" />
                </div>
            </div>
            <div className={cn("transition-transform", !isSmall && isTalking && "animate-loopie-talk")}>
                <svg width={isSmall ? "10" : "26"} height={isSmall ? "4" : "12"} viewBox={isSmall ? "0 0 10 4" : "0 0 26 12"} fill="none" className="opacity-90">
                    <path 
                        d={isSmall ? "M2 1C2 1 3.5 3 5 3C6.5 3 8 1 8 1" : (isTalking ? "M4 6C4 6 9 10 13 10C17 10 22 6 22 6" : "M4 4C4 4 9 8 13 8C17 8 22 4 22 4")} 
                        stroke="#082f49" 
                        strokeWidth={isSmall ? "1.5" : "3"} 
                        strokeLinecap="round" 
                    />
                </svg>
            </div>
        </div>
    </div>
);

export type LoopieDisplayMode = 'drawer' | 'floating';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    text: string;
    actions?: Array<{ type: string; params?: any }>;
    timestamp: number;
}

const STORAGE_KEY = 'viraloop_loopie_messages_v2';

const GlobalLoopieChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [displayMode, setDisplayMode] = useState<LoopieDisplayMode>('drawer');
    const [isDrawerWide, setIsDrawerWide] = useState(false);
    const [activeTab, setActiveTab] = useState<'chat' | 'fsd'>('chat');

    // FSD States
    const [fsdLevel, setFsdLevel] = useState<number>(3);
    const [missionGoal, setMissionGoal] = useState<string>('');
    const [isStartingMission, setIsStartingMission] = useState<boolean>(false);
    const [missionStatus, setMissionStatus] = useState<any>(null);

    // Chat States
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch {}
        return [{
            id: 'init-msg',
            role: 'assistant',
            text: "반갑습니다, 대표님! 바이럴루프 총괄 AI 디렉터 '루피(Loopie)'입니다.\n원하시는 영상 주제나 대량 제작 명령을 내려주시면 즉시 출격하겠습니다!",
            timestamp: Date.now()
        }];
    });

    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [isTalking, setIsTalking] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const [isListening, setIsListening] = useState(false);

    // Floating Window Draggable Position
    const [floatingPos, setFloatingPos] = useState({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const initialDragPos = useRef({ x: 0, y: 0 });

    // Model info from Settings
    const [agentModel, setAgentModel] = useState('viraloop1');
    const [agentProvider, setAgentProvider] = useState('omniroute');

    const location = useLocation();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Save messages to LocalStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
        } catch {}
    }, [messages]);

    // Fetch DB Settings for model name Single Source of Truth
    const fetchSettings = useCallback(async () => {
        try {
            const res = await fetchWithRetry('/api/settings');
            if (res.ok) {
                const s = await res.json();
                const m = s?.script_analysis_model || s?.default_llm_model || 'viraloop1';
                setAgentModel(m);
                const p = (m.includes('viraloop') || m.includes('youtube')) ? 'omniroute' : (m.includes('/') ? m.split('/')[0] : 'omniroute');
                setAgentProvider(p);
            }
        } catch {
            setAgentModel('viraloop1');
            setAgentProvider('omniroute');
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // Check backend connection
    useEffect(() => {
        const checkConnection = async () => {
            try {
                const res = await fetchWithRetry('/api/settings');
                setIsConnected(res.ok);
            } catch {
                setIsConnected(false);
            }
        };
        checkConnection();
        const timer = setInterval(checkConnection, 30000);
        return () => clearInterval(timer);
    }, []);

    // FSD Status Polling
    const fetchMissionStatus = useCallback(async () => {
        try {
            const res = await fetchWithRetry('/api/fsd-mission/status');
            if (res.ok) {
                const data = await res.json();
                setMissionStatus(data);
            }
        } catch {}
    }, []);

    useEffect(() => {
        fetchMissionStatus();
        const timer = setInterval(fetchMissionStatus, 3000);
        return () => clearInterval(timer);
    }, [fetchMissionStatus]);

    // Event listener for external OPEN_LOOPIE
    useEffect(() => {
        const handleOpenLoopie = (e: any) => {
            setIsOpen(true);
            if (e.detail?.message) {
                const newMsg: ChatMessage = {
                    id: String(Date.now()),
                    role: 'user',
                    text: e.detail.message,
                    timestamp: Date.now()
                };
                setMessages(prev => [...prev, newMsg]);
            }
        };
        window.addEventListener('OPEN_LOOPIE', handleOpenLoopie);
        return () => window.removeEventListener('OPEN_LOOPIE', handleOpenLoopie);
    }, []);

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    // Text to Speech
    const voiceEnabledRef = useRef(isVoiceEnabled);
    useEffect(() => { voiceEnabledRef.current = isVoiceEnabled; }, [isVoiceEnabled]);

    const speak = useCallback((text: string) => {
        if (!voiceEnabledRef.current || !window.speechSynthesis) return;
        
        let ttsText = text
            .replace(/ViraLoop/gi, '바이럴루프')
            .replace(/Loopie/gi, '루피')
            .replace(/OmniRoute/gi, '옴니라우트')
            .replace(/CapCut/gi, '캡컷')
            .replace(/[*_~`#]/g, '');

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(ttsText.slice(0, 150));
        const voices = window.speechSynthesis.getVoices();
        const koVoice = voices.find(v => v.lang.startsWith('ko'));
        if (koVoice) utterance.voice = koVoice;
        utterance.pitch = 1.1;
        utterance.rate = 1.0;
        utterance.onstart = () => setIsTalking(true);
        utterance.onend = () => setIsTalking(false);
        utterance.onerror = () => setIsTalking(false);
        window.speechSynthesis.speak(utterance);
    }, []);

    const toggleVoice = () => {
        const next = !isVoiceEnabled;
        setIsVoiceEnabled(next);
        if (next) speak("루피 음성 안내가 활성화되었습니다!");
    };

    // Voice Input (Speech Recognition)
    const startListening = () => {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRec) return;
        const rec = new SpeechRec();
        rec.lang = 'ko-KR';
        rec.onstart = () => setIsListening(true);
        rec.onend = () => setIsListening(false);
        rec.onresult = (e: any) => {
            if (e.results?.[0]?.[0]?.transcript) {
                setInput(e.results[0][0].transcript);
            }
        };
        rec.start();
    };

    // Floating Window Drag Handlers
    const handleDragStart = (e: React.MouseEvent) => {
        if (displayMode !== 'floating') return;
        isDraggingRef.current = true;
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        initialDragPos.current = { ...floatingPos };

        const handleDragMove = (moveEvent: MouseEvent) => {
            if (!isDraggingRef.current) return;
            const dx = moveEvent.clientX - dragStartPos.current.x;
            const dy = moveEvent.clientY - dragStartPos.current.y;
            setFloatingPos({
                x: initialDragPos.current.x + dx,
                y: initialDragPos.current.y + dy
            });
        };

        const handleDragEnd = () => {
            isDraggingRef.current = false;
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
        };

        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
    };

    // Clear Chat
    const handleClearChat = () => {
        const initial: ChatMessage[] = [{
            id: 'init-msg',
            role: 'assistant',
            text: "대화 기록이 정리되었습니다. 새로운 미션을 지시해 주세요!",
            timestamp: Date.now()
        }];
        setMessages(initial);
        localStorage.removeItem(STORAGE_KEY);
    };

    // Send Message Handler
    const handleSendMessage = async (customText?: string) => {
        const textToSend = (customText || input).trim();
        if (!textToSend || isThinking) return;

        const userMsg: ChatMessage = {
            id: String(Date.now()),
            role: 'user',
            text: textToSend,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setIsThinking(true);

        try {
            const res = await fetchWithRetry('/api/agent/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: textToSend,
                    context: { currentPath: location.pathname },
                    provider: agentProvider,
                    model: agentModel
                })
            });

            const rawText = await res.text();
            let replyText = '명령을 접수하여 처리했습니다.';
            let actions: any[] = [];

            if (rawText) {
                try {
                    const data = JSON.parse(rawText);
                    replyText = data.message || replyText;
                    actions = data.actions || [];
                } catch {
                    replyText = rawText.slice(0, 500);
                }
            }

            // Execute client-side actions if provided
            if (actions && Array.isArray(actions)) {
                for (const act of actions) {
                    if (act.type === 'navigate' && act.params?.path) {
                        navigate(act.params.path);
                    }
                }
            }

            const botMsg: ChatMessage = {
                id: String(Date.now() + 1),
                role: 'assistant',
                text: replyText,
                actions: actions.length > 0 ? actions : undefined,
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, botMsg]);
            speak(replyText);
        } catch (err: any) {
            setMessages(prev => [...prev, {
                id: String(Date.now() + 1),
                role: 'assistant',
                text: `서버 연결에 실패했습니다 (${err.message || 'Error'}). 백엔드 서버 상태를 확인해 주세요.`,
                timestamp: Date.now()
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    // Start Mission (FSD)
    const handleStartMission = async (customGoal?: string) => {
        const goalToRun = customGoal || missionGoal;
        if (!goalToRun.trim() || isStartingMission) return;
        setIsStartingMission(true);
        try {
            const res = await fetchWithRetry('/api/fsd-mission/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goal: goalToRun.trim(),
                    fsd_level: fsdLevel
                })
            });
            if (res.ok) {
                const data = await res.json();
                setMissionStatus(data);
                setMissionGoal('');
            }
        } catch {} finally {
            setIsStartingMission(false);
        }
    };

    const handleApproveMission = async () => {
        try {
            const res = await fetchWithRetry('/api/fsd-mission/approve', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setMissionStatus(data);
            }
        } catch {}
    };

    const handleStopMission = async () => {
        try {
            const res = await fetchWithRetry('/api/fsd-mission/stop', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setMissionStatus(data);
            }
        } catch {}
    };

    return (
        <div className="relative">
            {/* Header / Global Floating Trigger Avatar */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="relative group focus:outline-none transition-all hover:scale-105 active:scale-95 flex items-center justify-center p-1 rounded-full hover:bg-blue-500/10 cursor-pointer"
                    title="AI 루피 총감독 콘솔 열기"
                >
                    <LoopieIcon className="w-8 h-8" isSmall />
                    <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
                        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isConnected ? "bg-emerald-400" : "bg-amber-400")} />
                        <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", isConnected ? "bg-emerald-500" : "bg-amber-500")} />
                    </span>
                </button>
            )}

            {/* Main Loopie Console Portal */}
            {isOpen && createPortal(
                <div
                    style={displayMode === 'floating' ? {
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: `translate(calc(-50% + ${floatingPos.x}px), calc(-50% + ${floatingPos.y}px))`,
                        width: '740px',
                        height: '680px',
                        zIndex: 99999
                    } : {
                        position: 'fixed',
                        top: 0,
                        right: 0,
                        width: isDrawerWide ? '640px' : '480px',
                        height: '100vh',
                        zIndex: 99999
                    }}
                    className={cn(
                        "flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl text-slate-800 dark:text-slate-100 shadow-2xl transition-all duration-200 border-border",
                        displayMode === 'floating' ? "rounded-3xl border border-slate-200 dark:border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.3)] overflow-hidden" : "border-l border-slate-200 dark:border-slate-800"
                    )}
                >
                    {/* Top Control Bar */}
                    <div 
                        onMouseDown={handleDragStart}
                        className={cn(
                            "px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/40 flex items-center justify-between select-none shrink-0",
                            displayMode === 'floating' && "cursor-move"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <LoopieIcon className="w-8 h-8" isSmall isTalking={isTalking} />
                                <span className={cn("absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full", isConnected ? "bg-emerald-500 shadow-[0_0_6px_#10b981]" : "bg-amber-500")} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">AI 루피 총감독</h3>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold font-mono">
                                        {agentModel.replace(/^.*\//, '')}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                    {isConnected ? '지능 코어 (OmniRoute) 정상 가동' : '백엔드 연결 대기'}
                                </p>
                            </div>
                        </div>

                        {/* Control Actions (Drawer/Floating, Wide, Voice, Clear, Close) */}
                        <div className="flex items-center gap-1">
                            {displayMode === 'drawer' ? (
                                <button
                                    onClick={() => setIsDrawerWide(!isDrawerWide)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                    title={isDrawerWide ? "표준 너비로 축소" : "와이드 모드로 확장"}
                                >
                                    <Sidebar className="w-4 h-4" />
                                </button>
                            ) : null}

                            <button
                                onClick={() => setDisplayMode(displayMode === 'drawer' ? 'floating' : 'drawer')}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                title={displayMode === 'drawer' ? "독립 플로팅 창으로 전환" : "사이드 도킹 드로어로 전환"}
                            >
                                {displayMode === 'drawer' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                            </button>

                            <button
                                onClick={toggleVoice}
                                className={cn(
                                    "p-1.5 rounded-lg transition-all cursor-pointer",
                                    isVoiceEnabled ? "bg-blue-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
                                )}
                                title={isVoiceEnabled ? "음성 안내 끄기" : "음성 안내 켜기"}
                            >
                                {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                            </button>

                            <button
                                onClick={handleClearChat}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                                title="대화 내용 비우기"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer ml-1"
                                title="닫기"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Mode Navigation Tabs */}
                    <div className="px-5 pt-2 pb-2 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-200/60 dark:border-slate-800/60 flex gap-2">
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={cn(
                                "flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                                activeTab === 'chat' 
                                    ? "bg-blue-600 text-white shadow-sm" 
                                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                            )}
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>대화형 지휘 콘솔</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('fsd')}
                            className={cn(
                                "flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                                activeTab === 'fsd' 
                                    ? "bg-blue-600 text-white shadow-sm" 
                                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                            )}
                        >
                            <Gauge className="w-3.5 h-3.5" />
                            <span>자율 주행 미션 관제탑</span>
                        </button>
                    </div>

                    {/* TAB CONTENT */}
                    {activeTab === 'chat' ? (
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            {/* Message Stream */}
                            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
                                {messages.map((msg) => (
                                    <div 
                                        key={msg.id} 
                                        className={cn(
                                            "flex flex-col max-w-[88%]",
                                            msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-xs break-words",
                                            msg.role === 'user'
                                                ? "bg-blue-600 text-white rounded-tr-none"
                                                : "bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-tl-none font-medium"
                                        )}>
                                            <div className="whitespace-pre-wrap">{msg.text}</div>

                                            {/* Action Cards inside Assistant Messages */}
                                            {msg.actions && msg.actions.length > 0 && (
                                                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-2">
                                                    {msg.actions.map((act, i) => (
                                                        <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                                                            <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 truncate">
                                                                <Zap className="w-3.5 h-3.5 shrink-0" />
                                                                <span className="truncate">액션: {act.type}</span>
                                                            </div>
                                                            {act.type === 'navigate' && act.params?.path && (
                                                                <button
                                                                    onClick={() => navigate(act.params.path)}
                                                                    className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                                                                >
                                                                    <span>이동</span>
                                                                    <ChevronRight className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}

                                {isThinking && (
                                    <div className="mr-auto items-start">
                                        <div className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 flex items-center gap-2 text-xs">
                                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                            <span>루피가 전략을 수립하고 있습니다...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick Prompt Chips */}
                            <div className="px-5 py-1.5 border-t border-slate-100 dark:border-slate-800/80 flex gap-1.5 overflow-x-auto custom-scrollbar shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
                                {[
                                    "공포/야담 쇼츠 1편 기획해줘",
                                    "최근 바이럴 영상 스카우트해줘",
                                    "대본 작성 화면으로 이동해줘",
                                    "쇼츠 자동 배포 현황 알려줘"
                                ].map((chip, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSendMessage(chip)}
                                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 shrink-0 cursor-pointer shadow-2xs transition-all"
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>

                            {/* Bottom Input Form */}
                            <div className="p-3.5 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shrink-0">
                                <div className="relative flex items-center">
                                    <textarea
                                        ref={textareaRef}
                                        value={input}
                                        onChange={(e) => {
                                            setInput(e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        rows={1}
                                        disabled={isThinking}
                                        placeholder={isListening ? "음성 명령 청취 중..." : isThinking ? "생각하는 중..." : "루피에게 명령 하달 (Enter 전송, Shift+Enter 줄바꿈)..."}
                                        className="w-full pl-3.5 pr-20 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none min-h-[44px] max-h-[120px] custom-scrollbar disabled:opacity-60"
                                    />
                                    <div className="absolute right-2.5 flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={startListening}
                                            className={cn(
                                                "p-1.5 rounded-lg transition-all cursor-pointer",
                                                isListening ? "text-red-500 bg-red-100 dark:bg-red-950/60 animate-pulse" : "text-slate-400 hover:text-blue-600"
                                            )}
                                            title="음성 인식"
                                        >
                                            <Mic className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSendMessage()}
                                            disabled={!input.trim() || isThinking}
                                            className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-all cursor-pointer shadow-xs"
                                            title="명령 전송"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* FSD Mission Tab */
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                            {/* Level Switcher */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 space-y-2.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                        <span>자율 주행 레벨:</span>
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold">
                                        FSD {fsdLevel}단계
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {[
                                        { level: 2, label: 'L2 코파일럿', desc: '단계별 수동 컨펌' },
                                        { level: 3, label: 'L3 조건부자율', desc: '대본만 컨펌 후 조립' },
                                        { level: 4, label: 'L4 완전자율', desc: '100% 무인 자동배포' }
                                    ].map(l => (
                                        <button
                                            key={l.level}
                                            onClick={() => setFsdLevel(l.level)}
                                            className={cn(
                                                "py-2 px-1.5 rounded-xl text-xs font-bold border flex flex-col items-center transition-all cursor-pointer",
                                                fsdLevel === l.level
                                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                                            )}
                                        >
                                            <span>{l.label}</span>
                                            <span className={cn("text-[9px]", fsdLevel === l.level ? "text-blue-100" : "text-slate-400")}>{l.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Active Mission Status */}
                            {missionStatus?.active ? (
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
                                            <span className="text-xs font-black text-blue-950 dark:text-blue-200">미션 자율 수행 중</span>
                                        </div>
                                        <button
                                            onClick={handleStopMission}
                                            className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                                        >
                                            긴급 정지
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="truncate max-w-[260px]">🎯 {missionStatus.goal}</span>
                                            <span className="font-mono text-blue-600">{missionStatus.progress || 0}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                                                style={{ width: `${missionStatus.progress || 0}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Approval Gate */}
                                    {missionStatus.waiting_for_approval && (
                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-2 text-xs">
                                            <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                                <span>운전자 승인 대기 (대본 완성)</span>
                                            </div>
                                            <button
                                                onClick={handleApproveMission}
                                                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-lg text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <Check className="w-4 h-4" />
                                                <span>대본 승인 및 무인 캡컷 조립 시작</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-slate-500">원클릭 추천 미션 프리셋</div>
                                    <div className="space-y-1.5">
                                        {[
                                            "원테이크 퀵후킹 해외 영상 3편 대량 가공",
                                            "조선 야담 미스터리 쇼츠 1편 완전 창작 기획",
                                            "경제 팩트 브리핑 쇼츠 Whisper 대본 추출 및 조립"
                                        ].map((tpl, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleStartMission(tpl)}
                                                className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-blue-500/5 hover:border-blue-400 text-xs font-semibold flex items-center justify-between group cursor-pointer transition-all shadow-2xs"
                                            >
                                                <span className="truncate">{tpl}</span>
                                                <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 ml-1" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Manual Mission Starter */}
                            <div className="pt-2 space-y-2">
                                <div className="text-xs font-bold text-slate-500">신규 커스텀 미션 발주</div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={missionGoal}
                                        onChange={(e) => setMissionGoal(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleStartMission(); }}
                                        placeholder="목표 입력 (예: 경제 쇼츠 3편 일괄 제작)..."
                                        className="flex-1 h-9 px-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        onClick={() => handleStartMission()}
                                        disabled={isStartingMission || !missionGoal.trim()}
                                        className="px-4 h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-1 cursor-pointer shrink-0"
                                    >
                                        {isStartingMission ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                                        <span>출격</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default GlobalLoopieChat;
