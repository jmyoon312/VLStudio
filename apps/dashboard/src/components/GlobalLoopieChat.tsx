import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Volume2, VolumeX, Mic, Loader2, Gauge, MessageSquare, Play, Check, AlertTriangle, ShieldCheck, Zap, Layers, Sparkles } from 'lucide-react';
import { cn, fetchWithRetry } from '../lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';

const LoopieIcon = ({ className, isTalking, isSmall }: { className?: string, isTalking?: boolean, isSmall?: boolean }) => (
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
                    50% { transform: translateY(-10px); }
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

const GlobalLoopieChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    // FSD Mission Control States
    const [activeTab, setActiveTab] = useState<'chat' | 'fsd'>('fsd');
    const [fsdLevel, setFsdLevel] = useState<number>(3);
    const [missionGoal, setMissionGoal] = useState<string>('');
    const [isStartingMission, setIsStartingMission] = useState<boolean>(false);
    const [missionStatus, setMissionStatus] = useState<any>(null);

    // Poll FSD Mission Status
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
        } catch (e) {
            console.error('[FSD Mission] Start error:', e);
        } finally {
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
        } catch (e) {
            console.error('[FSD Mission] Approve error:', e);
        }
    };

    const handleStopMission = async () => {
        try {
            const res = await fetchWithRetry('/api/fsd-mission/stop', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setMissionStatus(data);
            }
        } catch (e) {
            console.error('[FSD Mission] Stop error:', e);
        }
    };

    const [messages, setMessages] = useState<{ role: 'user' | 'assistant' | 'system', text: string }[]>([
        { role: 'assistant', text: "반갑습니다, 지휘관님! 바이럴루프 관제 AI 루피가 대기 중입니다. 지시를 내려주십시오." }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [isTalking, setIsTalking] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const [isListening, setIsListening] = useState(false);
    
    // --- Drag and Drop State ---
    const positionRef = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const chatWindowRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        e.preventDefault();
        const newX = e.clientX - dragStartPos.current.x;
        const newY = e.clientY - dragStartPos.current.y;
        positionRef.current = { x: newX, y: newY };
        
        if (chatWindowRef.current) {
            chatWindowRef.current.style.transform = `translate(calc(-50% + ${newX}px), calc(-50% + ${newY}px))`;
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        isDraggingRef.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        
        isDraggingRef.current = true;
        dragStartPos.current = {
            x: e.clientX - positionRef.current.x,
            y: e.clientY - positionRef.current.y
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    useEffect(() => {
        const handleOpenLoopie = (e: any) => {
            setIsOpen(true);
            if (e.detail && e.detail.message) {
                setMessages(prev => [...prev, { role: 'user', text: e.detail.message }]);
                // Process the message immediately if needed, or just append it
            }
        };
        window.addEventListener('OPEN_LOOPIE', handleOpenLoopie);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('OPEN_LOOPIE', handleOpenLoopie);
        };
    }, [handleMouseMove, handleMouseUp]);
    
    const voiceEnabledRef = useRef(isVoiceEnabled);
    useEffect(() => { voiceEnabledRef.current = isVoiceEnabled; }, [isVoiceEnabled]);

    // Read the configured Hermes model from settings
    const [agentProvider, setAgentProvider] = React.useState('cerebras');
    const [agentModel, setAgentModel] = React.useState('cerebras/llama3.1-8b');
    useEffect(() => {
        // FastAPI router uses @router.get("/") mounted at /api/settings
        // A trailing slash is required, otherwise it may 307 redirect or fail in fetch
        fetchWithRetry('/api/settings')
            .then(async r => {
                if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
                const contentType = r.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    return r.json();
                } else {
                    const text = await r.text();
                    throw new Error(`Expected JSON but got: ${text.substring(0, 20)}...`);
                }
            })
            .then(s => {
                const p = s?.hermes_agent_provider || 'cerebras';
                const m = s?.hermes_agent_model || 'llama3.1-8b';
                setAgentProvider(p);
                setAgentModel(m.startsWith(p + '/') ? m : `${p}/${m}`);
            })
            .catch(err => {
                console.warn('[Loopie] Failed to load Hermes model settings:', err);
                setAgentProvider('cerebras');
                setAgentModel('cerebras/llama3.1-8b');
            }); 
    }, []);

    const location = useLocation();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);



    // [RE-ENHANCED] Advanced Voice Selector - More robust priority
    const getBestVoice = useCallback(() => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) return null;
        
        const koVoices = voices.filter(v => v.lang.includes('ko'));
        // Try Natural/Neural first, then Google, then High Quality, then local
        const premiumVoice = koVoices.find(v => 
            v.name.toLowerCase().includes('natural') || 
            v.name.toLowerCase().includes('neural') ||
            v.name.toLowerCase().includes('google')
        );
        
        return premiumVoice || koVoices[0] || voices[0];
    }, []);

    const speak = useCallback((text: string) => {
        if (!voiceEnabledRef.current) return;
        
        // --- Pre-process text to convert English to Korean phonetics for TTS ---
        let ttsText = text
            // Replace common IT/System terminology
            .replace(/ViraLoop/gi, '바이럴루프')
            .replace(/Loopie/gi, '루피')
            .replace(/Hermes/gi, '헤르메스')
            .replace(/DB/gi, '디비')
            .replace(/System/gi, '시스템')
            .replace(/JSON/gi, '제이슨')
            .replace(/API/gi, '에이피아이')
            .replace(/Dashboard/gi, '대시보드')
            .replace(/UI/gi, '유아이')
            .replace(/LLM/gi, '엘엘엠')
            .replace(/AI/gi, '에이아이')
            .replace(/Done/gi, '완료')
            .replace(/Error/gi, '에러')
            // Remove formatting artifacts that TTS might try to read
            .replace(/[*_~`#]/g, '');

        // Stop current speech cleanly with a tiny delay to avoid audio glitch
        window.speechSynthesis.cancel();

        // Split into natural sentence chunks to avoid TTS stuttering on long texts
        const sentences = ttsText.match(/[^.!?。！？\n]+[.!?。！？\n]*/g) || [ttsText];
        
        let utteranceIndex = 0;
        const speakNext = () => {
            if (utteranceIndex >= sentences.length) {
                setIsTalking(false);
                return;
            }
            const chunk = sentences[utteranceIndex].trim();
            if (!chunk) { utteranceIndex++; speakNext(); return; }
            
            const utterance = new SpeechSynthesisUtterance(chunk);
            const voices = window.speechSynthesis.getVoices();
            const koVoices = voices.filter(v => v.lang.startsWith('ko'));
            // Prefer Google Korean which tends to sound most natural
            const best = koVoices.find(v => v.name.includes('Google')) 
                || koVoices.find(v => v.name.toLowerCase().includes('natural'))
                || koVoices[0] 
                || voices[0];

            if (best) {
                utterance.voice = best;
                utterance.lang = best.lang;
            } else {
                utterance.lang = 'ko-KR';
            }

            // Slightly elevated pitch for a cheerful, playful feel
            utterance.pitch = 1.15;
            utterance.rate = 0.95;
            utterance.volume = 1.0;

            if (utteranceIndex === 0) utterance.onstart = () => setIsTalking(true);
            utterance.onend = () => { utteranceIndex++; speakNext(); };
            utterance.onerror = () => { setIsTalking(false); };

            window.speechSynthesis.speak(utterance);
        };

        // Small delay after cancel() to let audio engine reset cleanly
        setTimeout(speakNext, 50);
    }, []);

    // --- WebSocket for Swarm Background Tasks ---
    useEffect(() => {
        let ws: WebSocket | null = null;
        let retryTimeout: ReturnType<typeof setTimeout>;
        let isMounted = true;
        let lastMessage = ''; // Prevent duplicate voice/text spam

        const connectWebSocket = () => {
            if (!isMounted) return;
            const isFileProtocol = window.location.protocol === 'file:';
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsHost = isFileProtocol ? '127.0.0.1:8000' : window.location.host;
            ws = new WebSocket(`${wsProtocol}//${wsHost}/api/swarm/ws`);
            
            ws.onopen = () => {
                console.log("[Loopie] Swarm WebSocket connected");
            };

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    // Expected payload: { type: 'task_progress' | 'task_complete', message: string, action?: any }
                    if (payload.message && payload.message !== lastMessage) {
                        lastMessage = payload.message;
                        setMessages((prev: any[]) => {
                            // Avoid appending the exact same message twice
                            if (prev.length > 0 && prev[prev.length - 1].text === payload.message) {
                                return prev;
                            }
                            return [...prev, { role: 'assistant', text: payload.message }];
                        });
                        speak(payload.message);
                    }
                    if (payload.type === 'task_complete' && payload.action && payload.action.type === 'navigate') {
                        navigate(payload.action.params.path);
                    }
                } catch (err) {
                    console.error("[Loopie] Swarm WS Parse Error:", err);
                }
            };

            ws.onclose = () => {
                if (isMounted) {
                    console.log("[Loopie] Swarm WebSocket disconnected, retrying in 5s...");
                    retryTimeout = setTimeout(connectWebSocket, 5000);
                }
            };
            
            ws.onerror = (err) => {
                console.error("[Loopie] Swarm WebSocket error", err);
                if (ws) ws.close();
            };
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
    }, [navigate, speak]);

    // Ensure voices are always ready
    useEffect(() => {
        const handleVoicesChanged = () => {
            console.log("Voices updated:", window.speechSynthesis.getVoices().length);
        };
        window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
        return () => { window.speechSynthesis.onvoiceschanged = null; };
    }, []);

    const toggleVoice = () => {
        const nextState = !isVoiceEnabled;
        setIsVoiceEnabled(nextState);
        if (nextState) {
            if (window.speechSynthesis.getVoices().length === 0) {
                window.speechSynthesis.onvoiceschanged = () => {
                    speak("지휘관님, 이제 루피의 목소리를 들으실 수 있습니다. 명령만 내려주세요!");
                };
            } else {
                setTimeout(() => speak("지휘관님, 이제 루피의 목소리를 들으실 수 있습니다. 명령만 내려주세요!"), 200);
            }
        }
    };

    const startListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event: any) => { setInput(event.results[0][0].transcript); };
        recognition.start();
    };

    // [SOVEREIGN FIX] Use HTTP health-check instead of broken socket.io connection
    useEffect(() => {
        const checkConnection = async () => {
            try {
                const res = await fetchWithRetry('/api/hermes/status');
                setIsConnected(res.ok);
            } catch {
                setIsConnected(false);
            }
        };
        checkConnection();
        const interval = setInterval(checkConnection, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!input.trim() || isThinking) return;
        const msg = input.trim();
        setMessages((prev: any[]) => [...prev, { role: 'user', text: msg }]);
        setInput('');
        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
        setIsThinking(true);
        try {
            const res = await fetchWithRetry('/api/agent/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: msg,
                    context: { currentPath: location.pathname },
                    provider: agentProvider,
                    model: agentModel
                })
            });
            // Guard against non-JSON responses (e.g. 502, empty body)
            const text = await res.text();
            let replyText = '명령을 처리했습니다.';
            if (text) {
                try {
                    const data = JSON.parse(text);
                    replyText = data.message || replyText;
                    
                    // --- Action Executor ---
                    if (data.actions && Array.isArray(data.actions)) {
                        for (const action of data.actions) {
                            if (action.type === 'navigate') {
                                navigate(action.params.path);
                            } else if (action.type === 'delegate_to_openclaw') {
                                // Send background task dispatch to backend
                                fetchWithRetry('/api/swarm/dispatch', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(action.params)
                                }).catch(err => console.error("[Loopie] Dispatch failed:", err));
                            }
                        }
                    }
                } catch {
                    replyText = text.slice(0, 300);
                }
            }
            setMessages((prev: any[]) => [...prev, { role: 'assistant', text: replyText }]);
            speak(replyText);
        } catch (err) {
            setMessages((prev: any[]) => [...prev, { role: 'assistant', text: 'API 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.' }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="relative">
            {!isOpen && (
                <button onClick={(e) => { e.stopPropagation(); setIsOpen(true); }} className="relative group focus:outline-none transition-all hover:scale-110 active:scale-95 flex items-center justify-center p-0.5 rounded-full hover:bg-blue-50/50">
                    <LoopieIcon className="w-7 h-7" isSmall />
                </button>
            )}
            {isOpen && createPortal(
                <div
                    ref={chatWindowRef}
                    style={{ 
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: `translate(calc(-50% + ${positionRef.current.x}px), calc(-50% + ${positionRef.current.y}px))`,
                        width: '440px',
                        maxHeight: '88vh',
                        overflow: 'visible',
                        zIndex: 10000,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-[28px] shadow-[0_30px_70px_rgba(0,0,0,0.25)] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                >
                    {/* Compact Loopie Avatar Header */}
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-400/25 blur-2xl rounded-full scale-125 animate-pulse" />
                            <LoopieIcon className="w-14 h-14" isTalking={isTalking} />
                        </div>
                    </div>

                    {/* Drag Handle Top Bar */}
                    <div className="pt-7 pb-2 px-6 flex flex-col items-center relative z-10 border-b border-slate-100 dark:border-slate-800/80">
                        <div 
                            className="drag-handle w-full flex flex-col items-center cursor-move py-1 select-none"
                            onMouseDown={handleMouseDown}
                        >
                            <h3 className="text-slate-900 dark:text-white text-base font-black tracking-tight mb-0.5">AI 루피</h3>
                            <div className="flex items-center gap-1.5">
                                <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-red-400")} />
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                                    {isConnected ? '지능 코어 연결됨' : '연결 중...'}
                                </span>
                            </div>
                        </div>

                        {/* Top Action Buttons (Mute / Close) */}
                        <div className="absolute right-4 top-4 flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
                            <button 
                                onClick={toggleVoice} 
                                className={cn("p-2 rounded-xl transition-all cursor-pointer", isVoiceEnabled ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800")}
                                title={isVoiceEnabled ? "음성 안내 끄기" : "음성 안내 켜기"}
                            >
                                {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                            </button>
                            <button 
                                onClick={() => setIsOpen(false)} 
                                className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                title="닫기"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        {/* Tab Switcher: FSD Mission Control vs Chat */}
                        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-full mt-2 border border-slate-200/80 dark:border-slate-700/60" onMouseDown={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                onClick={() => setActiveTab('fsd')}
                                className={cn(
                                    "flex-1 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none",
                                    activeTab === 'fsd' 
                                        ? "bg-blue-600 text-white shadow-sm" 
                                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                <Gauge className="w-3.5 h-3.5" />
                                <span>🛸 FSD 미션 관제탑</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('chat')}
                                className={cn(
                                    "flex-1 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none",
                                    activeTab === 'chat' 
                                        ? "bg-blue-600 text-white shadow-sm" 
                                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>대화 챗</span>
                            </button>
                        </div>
                    </div>

                    {/* Tab 1: FSD Mission Control View */}
                    {activeTab === 'fsd' ? (
                        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3.5 custom-scrollbar select-none text-slate-800 dark:text-slate-200" onMouseDown={(e) => e.stopPropagation()}>
                            {/* FSD Level Selector & Active Engine */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-3 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                        <span>지능 엔진:</span>
                                        <span className="font-mono text-blue-600 dark:text-blue-400 font-extrabold">
                                            {agentModel ? agentModel.replace(/^.*\//, '') : '스튜디오 AI'}
                                        </span>
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold">
                                        FSD {fsdLevel}단계
                                    </span>
                                </div>

                                {/* Level Switch Chips */}
                                <div className="grid grid-cols-3 gap-1 pt-1">
                                    {[
                                        { level: 2, label: 'L2 코파일럿', desc: '단계별 확인' },
                                        { level: 3, label: 'L3 조건부자율', desc: '대본만 컨펌' },
                                        { level: 4, label: 'L4 완전자율', desc: '100% 무인' }
                                    ].map(l => (
                                        <button
                                            key={l.level}
                                            type="button"
                                            onClick={() => setFsdLevel(l.level)}
                                            className={cn(
                                                "py-1.5 px-1 rounded-xl text-[11px] font-bold border flex flex-col items-center transition-all cursor-pointer",
                                                fsdLevel === l.level
                                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                            )}
                                        >
                                            <span>{l.label}</span>
                                            <span className={cn("text-[9px]", fsdLevel === l.level ? "text-blue-100" : "text-slate-400")}>{l.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Current Mission Progress Card */}
                            {missionStatus?.active ? (
                                <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 space-y-3 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                                            <span className="text-xs font-black text-blue-950 dark:text-blue-200">자율 주행 미션 진행 중</span>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={handleStopMission}
                                            className="text-[11px] text-red-600 dark:text-red-400 hover:underline font-bold cursor-pointer"
                                        >
                                            긴급 중단
                                        </button>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[240px]">🎯 {missionStatus.goal}</span>
                                            <span className="font-mono text-blue-700 dark:text-blue-400">{missionStatus.progress}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-blue-100 dark:bg-blue-950 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500" 
                                                style={{ width: `${missionStatus.progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* 4-Stage Stepper */}
                                    <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-bold">
                                        <div className={cn("p-1 rounded-lg", missionStatus.progress >= 25 ? "bg-blue-600 text-white font-extrabold" : "bg-white dark:bg-slate-800 text-slate-400")}>1.스카우트</div>
                                        <div className={cn("p-1 rounded-lg", missionStatus.progress >= 50 ? "bg-blue-600 text-white font-extrabold" : "bg-white dark:bg-slate-800 text-slate-400")}>2.대본각색</div>
                                        <div className={cn("p-1 rounded-lg", missionStatus.progress >= 75 ? "bg-blue-600 text-white font-extrabold" : "bg-white dark:bg-slate-800 text-slate-400")}>3.Flow렌더</div>
                                        <div className={cn("p-1 rounded-lg", missionStatus.progress >= 100 ? "bg-blue-600 text-white font-extrabold" : "bg-white dark:bg-slate-800 text-slate-400")}>4.캡컷조립</div>
                                    </div>

                                    {/* Human-in-the-Loop Intervention Alert */}
                                    {missionStatus.waiting_for_approval && (
                                        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl p-3 space-y-2 text-xs">
                                            <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                                <span>운전자 승인 대기 (대본 완성)</span>
                                            </div>
                                            <p className="text-[11px] text-amber-800 dark:text-amber-300 line-clamp-3 bg-white dark:bg-slate-900 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                                                {missionStatus.approval_payload?.script || '대본 초안이 준비되었습니다.'}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handleApproveMission}
                                                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-lg text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                            >
                                                <Check className="w-4 h-4" />
                                                <span>✓ 대본 승인 및 무인 렌더링/캡컷 조립 시작</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Quick Mission Starter Templates */
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 px-1">원클릭 자율 제작 프리셋</div>
                                    <div className="space-y-1.5">
                                        {[
                                            "이번 주 부동산 경매 바이럴 쇼츠 1편 자율 제작",
                                            "1분 경제/재테크 팩트 브리핑 쇼츠 기획 및 제작",
                                            "알고리즘 급상승 떡상 영상 분석 후 각색 영상 제작"
                                        ].map((tpl, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => handleStartMission(tpl)}
                                                className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 hover:border-blue-300 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
                                            >
                                                <span className="truncate">{tpl}</span>
                                                <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 ml-1" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Real-time Telemetry Logs Box */}
                            <div className="bg-slate-900 text-slate-200 rounded-2xl p-3 font-mono text-[11px] space-y-1 max-h-[110px] overflow-y-auto custom-scrollbar border border-slate-800">
                                <div className="text-slate-400 text-[10px] font-bold border-b border-slate-800 pb-1 mb-1 flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-amber-400" />
                                    <span>FSD 실시간 주행 텔레메트리</span>
                                </div>
                                {(missionStatus?.logs || ["대기 중: 새로운 영상 제작 미션을 지시해 주세요."]).map((log: string, idx: number) => (
                                    <div key={idx} className="leading-relaxed opacity-90">{log}</div>
                                ))}
                            </div>

                            {/* Mission Input Form */}
                            <div className="space-y-2 pt-1">
                                <div className="flex gap-1.5">
                                    <input
                                        type="text"
                                        value={missionGoal}
                                        onChange={(e) => setMissionGoal(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleStartMission(); }}
                                        placeholder="자율 제작 목표 입력 (예: 재테크 쇼츠 1편)..."
                                        className="flex-1 h-9 px-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleStartMission()}
                                        disabled={isStartingMission || !missionGoal.trim()}
                                        className="px-3.5 h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-1 cursor-pointer transition-all"
                                    >
                                        {isStartingMission ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                                        <span>가동</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Tab 2: Chat View */
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
                            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 custom-scrollbar">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={cn("flex flex-col max-w-[90%]", msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}>
                                        <div className={cn(
                                            "px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-xs transition-all",
                                            msg.role === 'user' 
                                                ? "bg-blue-600 text-white rounded-tr-none" 
                                                : "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none font-medium"
                                        )}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {isThinking && (
                                    <div className="mr-auto items-start">
                                        <div className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 flex items-center gap-2 text-xs">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                            <span>루피가 생각하고 있습니다...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Chat Bottom Input */}
                            <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="relative flex items-center">
                                    <textarea
                                        ref={textareaRef}
                                        value={input}
                                        onChange={(e) => {
                                            setInput(e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        rows={1}
                                        disabled={isThinking}
                                        placeholder={isListening ? "명령 청취 중..." : isThinking ? "루피가 생각하고 있습니다..." : "루피에게 명령 하달..."}
                                        className="w-full pl-3 pr-16 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none min-h-[42px] max-h-[100px] custom-scrollbar disabled:opacity-60"
                                    />
                                    <div className="absolute right-2 flex items-center gap-1">
                                        <button 
                                            type="button"
                                            onClick={startListening} 
                                            className={cn(
                                                "p-1.5 rounded-lg transition-all cursor-pointer", 
                                                isListening ? "text-red-500 bg-red-50 dark:bg-red-950" : "text-slate-400 hover:text-blue-600"
                                            )}
                                            title="음성 인식"
                                        >
                                            <Mic className={cn("w-4 h-4", isListening && "animate-pulse")} />
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
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default GlobalLoopieChat;
