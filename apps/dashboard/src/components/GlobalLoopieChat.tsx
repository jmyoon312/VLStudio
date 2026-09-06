import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Send, Volume2, VolumeX, Mic, Loader2, Gauge, MessageSquare, 
    Play, Check, AlertTriangle, Sparkles, Maximize2, Minimize2, 
    Sidebar, Trash2, Zap, ChevronRight, Copy, CheckCheck,
    Film, Music, Layers, CheckCircle2, Circle, Clock, Terminal, ExternalLink, RefreshCw, RotateCcw, Link2, Flame
} from 'lucide-react';
import { toast } from 'sonner';
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

interface ProductionPipelineDef {
    id: string;
    name: string;
    badge: string;
    icon: any;
    color: string;
    activeBorder: string;
    desc: string;
    steps: string[];
    defaultDuration: string;
    placeholder: string;
    sourcePlaceholder?: string;
    needSource?: boolean;
    sampleTopics: string[];
}

const PRODUCTION_PIPELINES: ProductionPipelineDef[] = [
    {
        id: 'full_generative_ai',
        name: 'AI 완전 창작 생성형',
        badge: 'Flow AI',
        icon: Sparkles,
        color: 'from-purple-500/10 to-indigo-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/80',
        activeBorder: 'border-purple-500 bg-purple-500/5 ring-2 ring-purple-500/20',
        desc: '주제 입력만으로 9-Wave 대본, Google Flow AI 비주얼 렌더, 캡컷 조립까지 무인 완결',
        steps: ['주제 분석', '비평 검수', 'MultiTTS', 'Flow 렌더', '캡컷 조립', 'WorkQueue'],
        defaultDuration: '60s',
        placeholder: '창작할 영상 주제 입력 (예: 조선 궁중 미스터리 괴담, AI가 지배한 2035년 미래)...',
        sampleTopics: [
            '조선시대 금지된 미스터리 의식',
            '양자역학의 충격적인 다중우주 비밀',
            '인류 멸종 후 1000년 뒤 지구의 모습'
        ]
    },
    {
        id: 'one_take_hook',
        name: '원테이크 퀵후킹형',
        badge: '고속 양산',
        icon: Zap,
        color: 'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/80',
        activeBorder: 'border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20',
        desc: '해외 바이럴 원본을 9:16 상하단 블러 캔버스 및 3초 킬러 후킹 자막으로 고속 양산',
        steps: ['소스 수집', '9:16 블러', '3초 후킹 자막', '캡컷 조립', 'WorkQueue'],
        defaultDuration: '30s',
        placeholder: '원테이크 영상 목표 또는 후킹 핵심 입력...',
        sourcePlaceholder: '해외 틱톡/릴스/유튜브 쇼츠 URL 또는 원본 영상 경로...',
        needSource: true,
        sampleTopics: [
            '해외 4천만뷰 달성한 고양이 미스터리 클립',
            '전 세계를 경악시킨 기적의 구조 현장',
            '1초 뒤 일어날 일을 상상도 못했던 순간'
        ]
    },
    {
        id: 'script_commentary',
        name: '대본 해설 & 리캡형',
        badge: '스토리텔링',
        icon: MessageSquare,
        color: 'from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/80',
        activeBorder: 'border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20',
        desc: '원작 음성 Whisper 전사, 9-Wave AI 각색, MultiTTS 성우와 타임코드 자동 싱크',
        steps: ['영상 수집', 'Whisper 전사', '바이럴 각색', 'MultiTTS', '자막 싱크', '캡컷 조립'],
        defaultDuration: '60s',
        placeholder: '해설/리캡할 사건 또는 인물 팩트 요약...',
        sourcePlaceholder: '참조할 원본 영상 URL 또는 음성 파일 경로 (선택)...',
        sampleTopics: [
            '타이타닉 침몰에 숨겨진 3가지 미스터리',
            '세계 최고 부자가 매일 아침 지키는 1가지 습관',
            '5분 만에 이해하는 양자 컴퓨터의 모든 것'
        ]
    },
    {
        id: 'movie_drama_highlight',
        name: '영화/드라마 롱폼 컷팅형',
        badge: '씬 컷터',
        icon: Film,
        color: 'from-rose-500/10 to-pink-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/80',
        activeBorder: 'border-rose-500 bg-rose-500/5 ring-2 ring-rose-500/20',
        desc: '스마트 씬 분할로 롱폼에서 30~60초 명장면을 자동 감지하고 결말포함 리뷰 대본 결합',
        steps: ['롱폼 수집', '스마트 씬분할', '리뷰 대본', 'MultiTTS', '캡컷 조립', 'WorkQueue'],
        defaultDuration: '60s',
        placeholder: '리뷰할 작품명 및 핵심 줄거리 (예: 기생충 결말포함 리뷰)...',
        sourcePlaceholder: '롱폼 비디오 파일 경로 또는 유튜브 원본 URL...',
        needSource: true,
        sampleTopics: [
            '넷플릭스 1위 스릴러 영화 충격 반전 결말',
            '역대급 명작 SF 영화의 숨겨진 복선 총정리',
            '괴물에게 쫓기는 극한 생존 씬 하이라이트'
        ]
    },
    {
        id: 'music_beat_sync',
        name: '음악 비트싱크형',
        badge: '비트 싱크',
        icon: Music,
        color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80',
        activeBorder: 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20',
        desc: '무음 구간 초정밀 절삭 및 트렌드 BGM 비트에 맞춘 역동적 화면 전환 감성 쇼츠',
        steps: ['소스 수집', '무음 절삭', 'BGM 비트매핑', '캡컷 조립', 'WorkQueue'],
        defaultDuration: '30s',
        placeholder: '비트싱크 쇼츠 컨셉 (예: 128 BPM 테크노 익스트림 스포츠)...',
        sourcePlaceholder: '가공할 원본 클립 URL 또는 영상 파일 경로...',
        sampleTopics: [
            '128 BPM 테크노 비트에 맞춘 익스트림 스포츠',
            '여행 명소 0.5초 고속 컷팅 비트싱크',
            '도시 야경 네온사인 감성 비트 릴스'
        ]
    },
    {
        id: 'hybrid_longform',
        name: '하이브리드 멀티소스 롱폼',
        badge: '5~15분 롱폼',
        icon: Layers,
        color: 'from-violet-500/10 to-purple-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/80',
        activeBorder: 'border-violet-500 bg-violet-500/5 ring-2 ring-violet-500/20',
        desc: '수집 컷팅 영상과 Flow AI 클립을 다중 트랙으로 교차 조립하는 고밀도 장편 해설',
        steps: ['챕터 기획', '멀티에셋 취합', '장편 TTS', '멀티트랙 조립', 'WorkQueue'],
        defaultDuration: '3m',
        placeholder: '심층 탐구할 롱폼 기획 주제 (예: 로마 제국 멸망의 진짜 원인)...',
        sampleTopics: [
            '로마 제국 멸망의 진짜 원인 심층 분석',
            '테슬라 FSD와 자율주행의 거대한 패러다임 변화',
            '심해 10,000m 마리아나 해구 탐사 미스터리'
        ]
    }
];

const WORKERS = [
    { id: 'scout', name: '스카우터', role: '소싱', emoji: '📡' },
    { id: 'writer', name: '작가', role: '대본', emoji: '✍️' },
    { id: 'critic', name: '비평가', role: '검수', emoji: '🧐' },
    { id: 'voice', name: '성우', role: '보이스', emoji: '🎙️' },
    { id: 'flow', name: 'Flow', role: '비주얼', emoji: '🎨' },
    { id: 'cutter', name: '컷터', role: '분할', emoji: '✂️' },
    { id: 'assembler', name: '조립기', role: '캡컷', emoji: '📦' },
    { id: 'deployer', name: '배포관', role: '큐', emoji: '🚀' }
];

// Speech recognition helper: eliminates repeated consecutive words and phrases (crucial for mobile Android/iOS STT)
function cleanDuplicateSpeech(text: string): string {
    if (!text) return '';
    // 1. Remove consecutive identical single words: e.g. "안녕 안녕 안녕" -> "안녕"
    const words = text.split(/\s+/).filter(Boolean);
    const dedupedWords: string[] = [];
    for (let i = 0; i < words.length; i++) {
        const curr = words[i];
        const prev = dedupedWords[dedupedWords.length - 1];
        if (!prev || curr.toLowerCase() !== prev.toLowerCase()) {
            dedupedWords.push(curr);
        }
    }
    let cleaned = dedupedWords.join(' ');
    // 2. Remove consecutive identical 2-word phrases: "대본 작성 대본 작성" -> "대본 작성"
    cleaned = cleaned.replace(/(\b\S+\s+\S+)\s+\1\b/gi, '$1');
    // 3. Remove consecutive identical 3-word phrases: "오늘 날씨 어때 오늘 날씨 어때" -> "오늘 날씨 어때"
    cleaned = cleaned.replace(/(\b\S+\s+\S+\s+\S+)\s+\1\b/gi, '$1');
    return cleaned;
}

const GlobalLoopieChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [displayMode, setDisplayMode] = useState<LoopieDisplayMode>('drawer');
    const [isDrawerWide, setIsDrawerWide] = useState(false);
    const [activeTab, setActiveTab] = useState<'chat' | 'fsd'>('chat');

    // FSD States
    const [fsdLevel, setFsdLevel] = useState<number>(3);
    const [selectedPipeline, setSelectedPipeline] = useState<string>('full_generative_ai');
    const [missionGoal, setMissionGoal] = useState<string>('');
    const [sourceUrl, setSourceUrl] = useState<string>('');
    const [missionDuration, setMissionDuration] = useState<string>('60s');
    const [isStartingMission, setIsStartingMission] = useState<boolean>(false);
    const [isOpeningCapCut, setIsOpeningCapCut] = useState<boolean>(false);
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

    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const location = useLocation();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-focus textarea when opening Loopie or switching to chat tab
    useEffect(() => {
        if (isOpen && activeTab === 'chat') {
            const timer = setTimeout(() => {
                textareaRef.current?.focus();
            }, 120);
            return () => clearTimeout(timer);
        }
    }, [isOpen, activeTab]);

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

    // High-Performance Neural Voice & Audio Engine
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const voiceEnabledRef = useRef(isVoiceEnabled);
    useEffect(() => { voiceEnabledRef.current = isVoiceEnabled; }, [isVoiceEnabled]);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const speak = useCallback(async (text: string) => {
        if (!voiceEnabledRef.current || !text) return;

        // Stop any currently playing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        // Clean text for speech
        let ttsText = text
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`.*?`/g, '')
            .replace(/https?:\/\/\S+/g, '')
            .replace(/[*_~#>-]/g, '')
            .replace(/ViraLoop/gi, '바이럴루프')
            .replace(/Loopie/gi, '루피')
            .replace(/OmniRoute/gi, '옴니라우트')
            .replace(/CapCut/gi, '캡컷')
            .trim();

        if (!ttsText) return;

        // For concise interactive conversation, pick first 2-3 sentences
        const sentences = ttsText.split(/(?<=[.?!])\s+/).filter(Boolean);
        if (sentences.length > 3) {
            ttsText = sentences.slice(0, 3).join(' ');
        }

        // 1. Primary: High-Performance Edge Neural Voice (선희 아나운서 음성) via Backend
        try {
            setIsTalking(true);
            const res = await fetchWithRetry('/api/agent/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: ttsText,
                    voice: 'ko-KR-SunHiNeural',
                    rate: '+18%',
                    pitch: '+4Hz'
                })
            });

            if (res.ok) {
                const blob = await res.blob();
                const audioUrl = URL.createObjectURL(blob);
                if (!audioRef.current) {
                    audioRef.current = new Audio();
                }
                audioRef.current.src = audioUrl;
                audioRef.current.playbackRate = 1.08;
                audioRef.current.onplay = () => setIsTalking(true);
                audioRef.current.onended = () => {
                    setIsTalking(false);
                    URL.revokeObjectURL(audioUrl);
                };
                audioRef.current.onerror = () => {
                    setIsTalking(false);
                    URL.revokeObjectURL(audioUrl);
                };
                await audioRef.current.play();
                return;
            }
        } catch (err) {
            console.warn("[Loopie Voice] High-perf Neural Voice fallback to mobile/native:", err);
        }

        // 2. Secondary Fallback: Mobile Google Voice / Native SpeechSynthesis
        if (window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(ttsText);
            const voices = window.speechSynthesis.getVoices();
            // Detect Google Korean voice (Android Google Speech Services)
            const googleVoice = voices.find(v => v.lang.startsWith('ko') && (v.name.includes('Google') || v.name.includes('google')));
            const koVoice = googleVoice || voices.find(v => v.lang.startsWith('ko'));
            if (koVoice) utterance.voice = koVoice;
            utterance.pitch = 1.18; // 생기 있고 명료한 피치
            utterance.rate = 1.25;  // 자연스럽고 빠른 템포
            utterance.onstart = () => setIsTalking(true);
            utterance.onend = () => setIsTalking(false);
            utterance.onerror = () => setIsTalking(false);
            window.speechSynthesis.speak(utterance);
        } else {
            setIsTalking(false);
        }
    }, []);

    const toggleVoice = () => {
        const next = !isVoiceEnabled;
        setIsVoiceEnabled(next);
        if (next) {
            speak("반갑습니다, 대표님! 루피 고성능 음성 안내가 활성화되었습니다.");
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            setIsTalking(false);
        }
    };

    // Live Real-Time Speech-to-Text (STT) Engine (Mobile & Desktop Anti-Duplication)
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef<boolean>(false);
    const baseInputRef = useRef<string>('');
    const accumulatedFinalRef = useRef<string>('');

    const startListening = () => {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRec) {
            toast.error("이 브라우저/기기 환경에서는 음성 인식이 지원되지 않습니다.");
            return;
        }

        // Toggle off if already listening
        if (isListening && recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {}
            setIsListening(false);
            isListeningRef.current = false;
            return;
        }

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        try {
            const rec = new SpeechRec();
            rec.lang = 'ko-KR';
            // On mobile Android/iOS, continuous=true causes Chromium/WebKit bug that duplicates previous phrases
            rec.continuous = !isMobile;
            rec.interimResults = true;
            rec.maxAlternatives = 1;

            baseInputRef.current = input.trim();
            accumulatedFinalRef.current = '';

            rec.onstart = () => {
                setIsListening(true);
                isListeningRef.current = true;
                toast.info("🎙️ 마이크가 켜졌습니다. 한국어로 편하게 말씀하세요!", { duration: 2500 });
            };

            rec.onresult = (e: any) => {
                let currentFinal = '';
                let currentInterim = '';

                // Only inspect results from e.resultIndex onwards to prevent historical re-accumulation
                for (let i = e.resultIndex; i < e.results.length; ++i) {
                    const res = e.results[i];
                    const transcript = res[0]?.transcript || '';
                    if (res.isFinal) {
                        currentFinal += ' ' + transcript;
                    } else {
                        currentInterim += ' ' + transcript;
                    }
                }

                if (currentFinal.trim()) {
                    const cleanedChunk = cleanDuplicateSpeech(currentFinal.trim());
                    if (cleanedChunk) {
                        accumulatedFinalRef.current = cleanDuplicateSpeech(
                            (accumulatedFinalRef.current ? accumulatedFinalRef.current + ' ' : '') + cleanedChunk
                        );
                    }
                }

                const cleanInterim = cleanDuplicateSpeech(currentInterim.trim());
                const base = baseInputRef.current ? baseInputRef.current + ' ' : '';
                const combined = base + (accumulatedFinalRef.current ? accumulatedFinalRef.current + ' ' : '') + cleanInterim;
                
                const finalDeduped = cleanDuplicateSpeech(combined.trim());
                setInput(finalDeduped);

                // Dynamically adjust textarea height
                if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
                }
            };

            rec.onerror = (e: any) => {
                console.warn("[SpeechRecognition Error]", e.error);
                if (e.error === 'not-allowed') {
                    setIsListening(false);
                    isListeningRef.current = false;
                    toast.error("마이크 권한이 차단되어 있습니다. 브라우저/OS 설정에서 마이크를 허용해 주세요.");
                } else if (e.error !== 'no-speech') {
                    setIsListening(false);
                    isListeningRef.current = false;
                    toast.error(`음성 인식 오류: ${e.error}`);
                }
            };

            rec.onend = () => {
                // If mobile and user hasn't explicitly stopped, restart cleanly
                if (isListeningRef.current && isMobile) {
                    try {
                        rec.start();
                        return;
                    } catch (err) {
                        // ignore restart error
                    }
                }
                setIsListening(false);
                isListeningRef.current = false;
            };

            recognitionRef.current = rec;
            rec.start();
        } catch (err: any) {
            console.error("SpeechRec start error:", err);
            setIsListening(false);
            isListeningRef.current = false;
            toast.error("마이크 기동 중 오류가 발생했습니다.");
        }
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

        setCommandHistory(prev => [textToSend, ...prev.filter(h => h !== textToSend)].slice(0, 30));
        setHistoryIndex(-1);
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
                    } else if (act.type === 'start_production_pipeline') {
                        navigate('/studio-war-room');
                    } else if (act.type === 'assemble_capcut') {
                        navigate('/flow2capcut');
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
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 30);
        }
    };

    const handleCopyText = (id: string, text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success("루피의 답변이 클립보드에 복사되었습니다.");
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Start Mission (FSD)
    const handleStartMission = async (customGoal?: string, customPipeline?: string) => {
        const goalToRun = customGoal || missionGoal;
        const pipeToRun = customPipeline || selectedPipeline;
        if (!goalToRun.trim() || isStartingMission) return;
        setIsStartingMission(true);
        try {
            const res = await fetchWithRetry('/api/fsd-mission/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goal: goalToRun.trim(),
                    pipeline_id: pipeToRun,
                    duration: missionDuration,
                    source_url: sourceUrl.trim() || undefined,
                    fsd_level: fsdLevel
                })
            });
            if (res.ok) {
                const data = await res.json();
                setMissionStatus(data);
                setMissionGoal('');
                toast.success(`'${data.pipeline_name || pipeToRun}' 자율주행 미션이 출격했습니다!`);
            } else {
                const err = await res.json();
                toast.error(`미션 시작 실패: ${err.detail || '오류가 발생했습니다.'}`);
            }
        } catch (e: any) {
            toast.error(`서버 통신 실패: ${e.message || '오류'}`);
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
                toast.success('대본 및 연출 승인 완료! 후반부 무인 자동 렌더링이 가동됩니다.');
            }
        } catch (e: any) {
            toast.error(`승인 처리 실패: ${e.message}`);
        }
    };

    const handleStopMission = async () => {
        try {
            const res = await fetchWithRetry('/api/fsd-mission/stop', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setMissionStatus(data);
                toast.warning('자율 주행 미션이 비상 정지되었습니다.');
            }
        } catch (e: any) {
            toast.error(`정지 처리 실패: ${e.message}`);
        }
    };

    const handleOpenCapCut = async () => {
        setIsOpeningCapCut(true);
        try {
            const res = await fetchWithRetry('/api/capcut/open', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    toast.success('CapCut 데스크톱 앱을 실행했습니다.');
                } else {
                    toast.warning(`CapCut 실행: ${data.message || 'CapCut 설치 경로를 확인해 주세요.'}`);
                }
            }
        } catch {
            toast.error('CapCut 실행 중 오류가 발생했습니다.');
        } finally {
            setIsOpeningCapCut(false);
        }
    };

    const handleResetMission = () => {
        setMissionStatus(null);
        setMissionGoal('');
        setSourceUrl('');
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
                        width: 'min(740px, calc(100vw - 16px))',
                        height: 'min(680px, calc(100vh - 16px))',
                        maxWidth: '100vw',
                        maxHeight: '100vh',
                        zIndex: 99999
                    } : {
                        position: 'fixed',
                        top: 0,
                        right: 0,
                        width: isDrawerWide ? 'min(640px, 100vw)' : 'min(480px, 100vw)',
                        maxWidth: '100vw',
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
                            "px-3.5 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/40 flex items-center justify-between select-none shrink-0",
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
                    <div className="px-3.5 sm:px-5 pt-2 pb-2 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-200/60 dark:border-slate-800/60 flex gap-2">
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
                            <div className="flex-1 overflow-y-auto px-3.5 sm:px-5 py-3.5 space-y-3.5 custom-scrollbar">
                                {messages.map((msg) => (
                                    <div 
                                        key={msg.id} 
                                        className={cn(
                                            "flex flex-col max-w-[92%] sm:max-w-[88%]",
                                            msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-3 sm:p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-xs break-words",
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
                                        <div className="flex items-center gap-2 mt-1 px-1">
                                            <span className="text-[10px] text-slate-400">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {msg.role === 'assistant' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyText(msg.id, msg.text)}
                                                    className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-0.5 rounded cursor-pointer"
                                                    title="답변 내용 복사"
                                                >
                                                    {copiedId === msg.id ? (
                                                        <CheckCheck className="w-3 h-3 text-emerald-500" />
                                                    ) : (
                                                        <Copy className="w-3 h-3" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
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
                            <div className="px-3.5 sm:px-5 py-1.5 border-t border-slate-100 dark:border-slate-800/80 flex gap-1.5 overflow-x-auto custom-scrollbar shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
                                {[
                                    "공포/야담 쇼츠 1편 기획해줘",
                                    "최근 바이럴 영상 스카우트해줘",
                                    "워룸 파이프라인 가동해줘",
                                    "대본 작성 화면으로 이동해줘",
                                    "스튜디오 브레인 기억고 열어줘",
                                    "쇼츠 자동 배포 현황 알려줘"
                                ].map((chip, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            handleSendMessage(chip);
                                            setTimeout(() => textareaRef.current?.focus(), 50);
                                        }}
                                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 shrink-0 cursor-pointer shadow-2xs transition-all"
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>

                            {/* Bottom Input Form */}
                            <div className="p-3 sm:p-3.5 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shrink-0">
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
                                            if (e.nativeEvent.isComposing || (e as any).keyCode === 229) return;
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            } else if (e.key === 'ArrowUp' && (input === '' || e.currentTarget.selectionStart === 0)) {
                                                if (commandHistory.length > 0) {
                                                    e.preventDefault();
                                                    const nextIdx = Math.min(historyIndex + 1, commandHistory.length - 1);
                                                    setHistoryIndex(nextIdx);
                                                    setInput(commandHistory[nextIdx]);
                                                }
                                            } else if (e.key === 'ArrowDown' && historyIndex >= 0) {
                                                e.preventDefault();
                                                const prevIdx = historyIndex - 1;
                                                setHistoryIndex(prevIdx);
                                                setInput(prevIdx >= 0 ? commandHistory[prevIdx] : '');
                                            }
                                        }}
                                        rows={1}
                                        readOnly={isThinking}
                                        placeholder={isListening ? "음성 명령 청취 중..." : isThinking ? "루피가 명령을 처리 중입니다..." : "루피에게 명령 하달 (Enter 전송, ↑ 이전명령, Shift+Enter 줄바꿈)..."}
                                        className={cn(
                                            "w-full pl-3.5 pr-20 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none min-h-[44px] max-h-[120px] custom-scrollbar transition-all",
                                            isThinking && "opacity-70 bg-slate-200/50 dark:bg-slate-800/50 cursor-wait"
                                        )}
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
                        /* FSD Mission Tab - Zero-Base Redesigned Cockpit */
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/30">
                            {/* Cockpit Header & Autonomy Level Switcher */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-2xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                            <Gauge className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                                <span>FSD 자율 주행 미션 관제탑</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                                                    OmniRoute {agentModel}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                6대 프로덕션 파이프라인 & 8인 전문 AI 워커 실시간 무인 주행
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold border border-blue-200 dark:border-blue-900">
                                        FSD {fsdLevel}단계
                                    </span>
                                </div>

                                {/* Autonomy Level Buttons */}
                                <div className="grid grid-cols-3 gap-1.5">
                                    {[
                                        { level: 2, label: 'L2 코파일럿', desc: '각 단계별 수동 컨펌' },
                                        { level: 3, label: 'L3 조건부자율 (추천)', desc: '대본 1회 승인 후 캡컷 무인조립' },
                                        { level: 4, label: 'L4 완전자율', desc: '개입 없이 100% 무인 자동배포' }
                                    ].map(l => (
                                        <button
                                            key={l.level}
                                            onClick={() => setFsdLevel(l.level)}
                                            className={cn(
                                                "py-2 px-1.5 rounded-xl text-xs font-bold border flex flex-col items-center text-center transition-all cursor-pointer",
                                                fsdLevel === l.level
                                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            )}
                                        >
                                            <span className="truncate">{l.label}</span>
                                            <span className={cn("text-[9px] mt-0.5 line-clamp-1", fsdLevel === l.level ? "text-blue-100" : "text-slate-400")}>{l.desc}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* 8-Worker Live Telemetry HUD */}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                                        <span>8인 전문 워커 라이브 텔레메트리</span>
                                        <span className="text-[9px] text-blue-500 font-medium">동적 연동 중</span>
                                    </div>
                                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                                        {WORKERS.map(w => {
                                            const isCurrentWorker = missionStatus?.active && missionStatus?.active_worker === w.id;
                                            return (
                                                <div
                                                    key={w.id}
                                                    className={cn(
                                                        "p-1.5 rounded-xl border text-center flex flex-col items-center justify-center transition-all",
                                                        isCurrentWorker
                                                            ? "bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/30 animate-pulse"
                                                            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                                                    )}
                                                >
                                                    <span className="text-xs">{w.emoji}</span>
                                                    <span className="text-[10px] font-black truncate mt-0.5">{w.name}</span>
                                                    <span className="text-[8px] text-slate-400 truncate">{w.role}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* ACTIVE MISSION MONITOR OR PIPELINE LAUNCH PAD */}
                            {missionStatus?.active || missionStatus?.waiting_for_approval || missionStatus?.capcut_project_name ? (
                                /* Active Mission Cockpit HUD */
                                <div className="space-y-3">
                                    <div className="bg-white dark:bg-slate-900 border border-blue-500/40 rounded-2xl p-4 space-y-3 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="relative flex h-3 w-3">
                                                    <span className={cn(
                                                        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                                        missionStatus.stage === 'COMPLETED' ? "bg-emerald-400" : missionStatus.waiting_for_approval ? "bg-amber-400" : "bg-blue-400"
                                                    )} />
                                                    <span className={cn(
                                                        "relative inline-flex rounded-full h-3 w-3",
                                                        missionStatus.stage === 'COMPLETED' ? "bg-emerald-500" : missionStatus.waiting_for_approval ? "bg-amber-500" : "bg-blue-600"
                                                    )} />
                                                </div>
                                                <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                                                    {missionStatus.stage === 'COMPLETED' ? "미션 조립 완결" : missionStatus.waiting_for_approval ? "운전자 승인 대기 중" : "자율 주행 실행 중"}
                                                </span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900">
                                                    {missionStatus.pipeline_name || "파이프라인"}
                                                </span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                                                    {missionStatus.duration || '60s'}
                                                </span>
                                            </div>
                                            {missionStatus.active && (
                                                <button
                                                    onClick={handleStopMission}
                                                    className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                                >
                                                    비상 정지
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="truncate max-w-[280px] text-slate-800 dark:text-slate-200">
                                                    🎯 {missionStatus.goal}
                                                </span>
                                                <span className="font-mono text-blue-600 dark:text-blue-400">
                                                    {missionStatus.progress || 0}%
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-500",
                                                        missionStatus.stage === 'COMPLETED' ? "bg-emerald-500" : missionStatus.waiting_for_approval ? "bg-amber-500" : "bg-blue-600"
                                                    )}
                                                    style={{ width: `${missionStatus.progress || 0}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Dynamic Pipeline Node Steps */}
                                        {missionStatus.nodes && missionStatus.nodes.length > 0 && (
                                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                                <div className="text-[10px] font-bold text-slate-400 mb-1.5">진행 중인 노드 단계</div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {missionStatus.nodes.map((node: any, idx: number) => {
                                                        const isDone = node.status === 'done';
                                                        const isRunning = node.status === 'running';
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className={cn(
                                                                    "px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all",
                                                                    isDone
                                                                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
                                                                        : isRunning
                                                                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 ring-2 ring-blue-500/20"
                                                                        : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-800"
                                                                )}
                                                            >
                                                                {isDone ? (
                                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                                                ) : isRunning ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin text-blue-600 shrink-0" />
                                                                ) : (
                                                                    <Circle className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                                                                )}
                                                                <span className="truncate">{node.title || node.id}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* HITL Human-in-the-Loop Approval Gate */}
                                    {missionStatus.waiting_for_approval && missionStatus.approval_payload && (
                                        <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                                                <div>
                                                    <div className="text-xs font-black text-amber-900 dark:text-amber-200">
                                                        운전자 승인 대기 (대본 및 연출 계획 완성)
                                                    </div>
                                                    <div className="text-[10px] text-amber-700/80 dark:text-amber-300/70">
                                                        3초 킬러 후킹과 씬별 연출을 확인하신 후 승인해 주세요.
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 3-Second Killer Hook Highlight */}
                                            {missionStatus.approval_payload.hook && (
                                                <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl space-y-1">
                                                    <div className="text-[10px] font-black text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                                        <Flame className="w-3 h-3 text-amber-600" />
                                                        <span>3초 킬러 후킹 대사 (후킹 점수 94점)</span>
                                                    </div>
                                                    <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
                                                        "{missionStatus.approval_payload.hook}"
                                                    </div>
                                                </div>
                                            )}

                                            {/* Scene by Scene Breakdown */}
                                            {missionStatus.approval_payload.scenes && (
                                                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                                    <div className="text-[10px] font-bold text-slate-500">씬별 연출 & 나레이션 대본</div>
                                                    {missionStatus.approval_payload.scenes.map((sc: any, i: number) => (
                                                        <div key={i} className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                                                            <div className="flex items-center justify-between text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                                                <span>씬 {sc.scene_num || i + 1} ({sc.duration_sec || 5}초)</span>
                                                                <span className="text-[9px] text-slate-400">Flow AI 비주얼</span>
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono line-clamp-1">
                                                                🎨 {sc.visual_prompt}
                                                            </div>
                                                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                                🎙️ "{sc.narration}"
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Voice & Sound Strategy */}
                                            <div className="flex flex-wrap gap-2 text-[10px]">
                                                {missionStatus.approval_payload.tts_voice && (
                                                    <span className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-medium">
                                                        🎙️ 성우: <b>{missionStatus.approval_payload.tts_voice}</b>
                                                    </span>
                                                )}
                                                {missionStatus.approval_payload.bgm_style && (
                                                    <span className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-medium">
                                                        🎵 음원: <b>{missionStatus.approval_payload.bgm_style}</b>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    onClick={handleApproveMission}
                                                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    <span>대본 승인 및 무인 캡컷 조립 시작</span>
                                                </button>
                                                <button
                                                    onClick={handleStopMission}
                                                    className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                                                >
                                                    취소
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Completed CapCut Ready Banner */}
                                    {missionStatus.capcut_project_name && (
                                        <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl p-4 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-xl bg-emerald-500 text-white">
                                                    <Check className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                                                        🎉 CapCut 3-Tier 프로젝트 조립 완결!
                                                    </div>
                                                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono truncate max-w-[280px]">
                                                        {missionStatus.capcut_project_name}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={handleOpenCapCut}
                                                    disabled={isOpeningCapCut}
                                                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                                >
                                                    {isOpeningCapCut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                                    <span>CapCut 실행하기</span>
                                                </button>
                                                <button
                                                    onClick={() => navigate('/work-queue')}
                                                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-slate-200 dark:border-slate-700"
                                                >
                                                    <span>WorkQueue 열기</span>
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <button
                                                onClick={handleResetMission}
                                                className="w-full py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                                <span>새로운 자율 주행 미션 발주하기</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Real-Time Live Logs Terminal */}
                                    {missionStatus.logs && missionStatus.logs.length > 0 && (
                                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-slate-800/80 pb-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Terminal className="w-3 h-3 text-blue-400" />
                                                    <span>LIVE MISSION TELEMETRY LOG</span>
                                                </div>
                                                <span className="text-emerald-400">CONNECT 200 OK</span>
                                            </div>
                                            <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar font-mono text-[11px] text-slate-300">
                                                {missionStatus.logs.map((log: string, i: number) => (
                                                    <div key={i} className="leading-relaxed">
                                                        <span className="text-slate-600 select-none mr-1.5">[{i + 1}]</span>
                                                        <span className={cn(
                                                            log.includes('❌') ? "text-rose-400" : log.includes('✅') ? "text-emerald-400" : log.includes('🚀') ? "text-blue-400 font-bold" : "text-slate-300"
                                                        )}>
                                                            {log}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* 6 Real Pipeline Mission Configurator */
                                <div className="space-y-4">
                                    {/* 1. Pipeline Selector Grid */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                <span>1. 프로덕션 파이프라인 선택 (6대 검증 규격)</span>
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                원클릭 레고블록 구조
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {PRODUCTION_PIPELINES.map((pipe) => {
                                                const IconComp = pipe.icon;
                                                const isSelected = selectedPipeline === pipe.id;
                                                return (
                                                    <button
                                                        key={pipe.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedPipeline(pipe.id);
                                                            setMissionDuration(pipe.defaultDuration);
                                                        }}
                                                        className={cn(
                                                            "p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer shadow-2xs group relative overflow-hidden",
                                                            isSelected
                                                                ? pipe.activeBorder
                                                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                                                        )}
                                                    >
                                                        <div className="flex items-start justify-between gap-1 mb-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className={cn("p-1.5 rounded-lg border", pipe.color)}>
                                                                    <IconComp className="w-3.5 h-3.5" />
                                                                </div>
                                                                <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                                                                    {pipe.name}
                                                                </span>
                                                            </div>
                                                            <span className={cn(
                                                                "text-[9px] px-1.5 py-0.5 rounded-md font-bold",
                                                                isSelected ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                            )}>
                                                                {pipe.badge}
                                                            </span>
                                                        </div>

                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2 my-1">
                                                            {pipe.desc}
                                                        </p>

                                                        {/* Step flow pills */}
                                                        <div className="flex flex-wrap items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                                                            {pipe.steps.slice(0, 4).map((st, i) => (
                                                                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-medium">
                                                                    {st}
                                                                </span>
                                                            ))}
                                                            {pipe.steps.length > 4 && (
                                                                <span className="text-[9px] text-slate-400 font-bold">+{pipe.steps.length - 4}</span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 2. Concrete Mission Parameters */}
                                    {(() => {
                                        const currentPipe = PRODUCTION_PIPELINES.find(p => p.id === selectedPipeline) || PRODUCTION_PIPELINES[0];
                                        return (
                                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-2xs">
                                                <div className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                                    <span className="flex items-center gap-1.5">
                                                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                                        <span>2. 구체적 제작 타겟 설정: [{currentPipe.name}]</span>
                                                    </span>
                                                    <span className="text-[10px] text-blue-600 font-bold">
                                                        목표 길이: {missionDuration}
                                                    </span>
                                                </div>

                                                {/* Topic / Goal Input */}
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                                        기획 주제 또는 핵심 키워드 <span className="text-rose-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={missionGoal}
                                                        onChange={(e) => setMissionGoal(e.target.value)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleStartMission(); }}
                                                        placeholder={currentPipe.placeholder}
                                                        className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                                                    />
                                                </div>

                                                {/* Reference URL / Source Input */}
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                                        <Link2 className="w-3 h-3 text-slate-400" />
                                                        <span>참조 영상 URL 또는 로컬 미디어 경로 {currentPipe.needSource ? <span className="text-amber-500 font-bold">(권장)</span> : <span className="text-slate-400 font-normal">(선택)</span>}</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={sourceUrl}
                                                        onChange={(e) => setSourceUrl(e.target.value)}
                                                        placeholder={currentPipe.sourcePlaceholder || "https://... 또는 원본 파일 경로 입력"}
                                                        className="w-full h-9 px-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                                                    />
                                                </div>

                                                {/* Duration Selector */}
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-slate-400" />
                                                        <span>목표 재생 시간 및 템포</span>
                                                    </label>
                                                    <div className="grid grid-cols-4 gap-1.5">
                                                        {[
                                                            { value: '30s', label: '30초', sub: '초압축 숏폼' },
                                                            { value: '60s', label: '60초', sub: '표준 쇼츠' },
                                                            { value: '3m', label: '3분', sub: '미드폼 해설' },
                                                            { value: '10m', label: '10분', sub: '하이브리드 롱폼' }
                                                        ].map(dur => (
                                                            <button
                                                                key={dur.value}
                                                                type="button"
                                                                onClick={() => setMissionDuration(dur.value)}
                                                                className={cn(
                                                                    "py-1.5 px-1 rounded-xl text-xs font-bold border flex flex-col items-center cursor-pointer transition-all",
                                                                    missionDuration === dur.value
                                                                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                                                        : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                                                                )}
                                                            >
                                                                <span>{dur.label}</span>
                                                                <span className={cn("text-[8px]", missionDuration === dur.value ? "text-blue-100" : "text-slate-400")}>{dur.sub}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Quick Inspiration Chips */}
                                                <div className="space-y-1.5 pt-1">
                                                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                        <Flame className="w-3 h-3 text-amber-500" />
                                                        <span>이 파이프라인 추천 바이럴 주제 (클릭 시 자동 입력)</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {currentPipe.sampleTopics.map((sample, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={() => setMissionGoal(sample)}
                                                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer text-left truncate max-w-full"
                                                            >
                                                                💡 {sample}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Concrete Launch CTA */}
                                                <div className="pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStartMission()}
                                                        disabled={isStartingMission || !missionGoal.trim()}
                                                        className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-40 text-white font-black rounded-xl text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                                                    >
                                                        {isStartingMission ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                <span>미션 사령탑 출격 준비 중...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Play className="w-4 h-4 fill-current" />
                                                                <span>🚀 [{currentPipe.name} / {missionDuration} / FSD {fsdLevel}단계] 자율 주행 출격</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default GlobalLoopieChat;
