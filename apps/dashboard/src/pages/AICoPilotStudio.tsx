import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api, { SWARM_BASE_URL } from '@/lib/api';
// import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'; // REMOVED to fix dependency issues
import { Player } from '@remotion/player';
import { io, Socket } from 'socket.io-client';
import { Send, Bot, User, Sparkles, Loader2, Maximize2, Minimize2, Video, Database, RefreshCw, Music, ImageIcon, Copy } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UniversalVideo } from '../remotion/compositions/UniversalVideo';
import { DynamicShortsTemplate } from '../remotion/compositions/DynamicShortsTemplate';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

// --- Types ---
interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

const AICoPilotStudio: React.FC = () => {
    // --- State ---
    const [socket, setSocket] = useState<Socket | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    const [isThinking, setIsThinking] = useState(false);

    // Player State
    const [currentComposition, setCurrentComposition] = useState<'UniversalVideo' | 'DynamicShorts'>('UniversalVideo');
    const [playerProps, setPlayerProps] = useState<any>({
        // Default Universal Props
        title: "ViraLoop AI Draft",
        clips: [{ type: 'text', text: "Waiting for AI...", durationInFrames: 300 }],
        audio: { src: "", volume: 1 },
        subtitles: []
    });

    // Asset Library Fetching
    const { data: assetData, refetch: refetchAssets } = useQuery({
        queryKey: ['agentAssets'],
        queryFn: async () => (await api.get('/bridge/assets')).data,
        refetchInterval: 15000, // Refresh every 15s
    });

    const scrollRef = useRef<HTMLDivElement>(null);

    // --- WebSocket Init ---
    useEffect(() => {
        // Fallback to polling if websocket fails, or just standard connection
        const newSocket = io(SWARM_BASE_URL, {
            transports: ['websocket', 'polling'], // Try both
            reconnectionAttempts: 5,
        });

        newSocket.on('connect', () => {
            console.log("✅ Connected to ClawDBot");
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log("❌ Disconnected from ClawDBot");
            setIsConnected(false);
        });

        newSocket.on('response', (data: { text: string }) => {
            setIsThinking(false);
            addMessage('assistant', data.text);
        });

        // [NEW] Handle Props Update from Agent
        newSocket.on('update_props', (newProps: any) => {
            console.log("🎬 Received Props Update:", newProps);
            setPlayerProps(newProps);

            // Simple Inference Strategy for Composition Switching
            if (newProps.mainVideo && (newProps.topBar || newProps.scaleMode)) {
                setCurrentComposition('DynamicShorts');
            } else if (newProps.clips) {
                setCurrentComposition('UniversalVideo');
            }

            // Auto-refresh assets list when props update (likely something was generated)
            refetchAssets();
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // --- Message Handling ---
    const addMessage = (role: ChatMessage['role'], content: string) => {
        setMessages(prev => [...prev, {
            id: uuidv4(),
            role,
            content,
            timestamp: Date.now()
        }]);
    };

    const handleSend = () => {
        if (!input.trim() || !socket) return;

        addMessage('user', input);
        setIsThinking(true);
        socket.emit('message', input);
        setInput('');
    };

    // Auto-scroll chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isThinking]);


    // --- Render ---
    return (
        <div className="h-[calc(100vh-64px)] w-full bg-[#1a1a1a] text-white overflow-hidden flex flex-row">

            {/* --- Left Panel: Assets (15%) --- */}
            <div className="w-[20%] h-full bg-[#2a2a2a] border-r border-[#3a3a3a] flex flex-col hidden md:flex">
                <div className="p-3 border-b border-[#3a3a3a] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-purple-400" />
                        <span className="font-semibold text-sm">프로젝트 자산</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => refetchAssets()}>
                        <RefreshCw className="w-3 h-3" />
                    </Button>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {assetData?.assets?.length > 0 ? (
                            assetData.assets.map((asset: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="p-2 rounded hover:bg-[#3a3a3a] cursor-pointer group transition-colors border border-transparent hover:border-[#4a4a4a]"
                                    onClick={() => {
                                        navigator.clipboard.writeText(asset.path);
                                        toast.success("경로가 클립보드에 복사되었습니다.");
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        {asset.type === 'video' ? <Video className="w-3 h-3 text-blue-400" /> :
                                            asset.type === 'audio' ? <Music className="w-3 h-3 text-green-400" /> :
                                                <ImageIcon className="w-3 h-3 text-orange-400" />}
                                        <span className="text-[11px] font-medium truncate text-gray-300 group-hover:text-white">
                                            {asset.name}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex justify-between items-center px-5">
                                        <span className="text-[9px] text-gray-500">{(asset.size / 1024 / 1024).toFixed(1)}MB</span>
                                        <Copy className="w-2 h-2 text-gray-600 opacity-0 group-hover:opacity-100" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center">
                                <span className="text-[10px] text-gray-600">생성된 자산이 없습니다.</span>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* --- Center Panel: Preview (60%) --- */}
            <div className="flex-1 h-full bg-[#0f0f0f] relative flex flex-col min-w-[300px]">
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5 relative group">
                        <Player
                            component={currentComposition === 'UniversalVideo' ? UniversalVideo : DynamicShortsTemplate}
                            inputProps={playerProps}
                            durationInFrames={300}
                            fps={30}
                            compositionWidth={currentComposition === 'UniversalVideo' ? 1920 : 1080}
                            compositionHeight={currentComposition === 'UniversalVideo' ? 1080 : 1920}
                            style={{
                                width: '100%',
                                height: '100%',
                            }}
                            controls
                        />
                    </div>
                </div>
            </div>

            {/* --- Right Panel: Commander (25%) --- */}
            <div className="w-[350px] h-full bg-[#1e1e1e] border-l border-[#3a3a3a] flex flex-col shrink-0">

                {/* Chat Header */}
                <div className="h-12 border-b border-[#333] flex items-center px-4 justify-between bg-[#252525]">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'}`} />
                    </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-hidden relative">
                    <div className="absolute inset-0 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
                                    }`}>
                                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>
                                <div className={`p-3 rounded-xl text-sm max-w-[85%] ${msg.role === 'user'
                                    ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30'
                                    : 'bg-[#2a2a2a] text-gray-200 border border-[#333]'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {isThinking && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center shrink-0">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="bg-[#2a2a2a] p-3 rounded-xl border border-[#333] flex items-center gap-2">
                                    <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                                    <span className="text-xs text-gray-400">Thinking...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-[#252525] border-t border-[#333]">
                    <div className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Director mode instructions..."
                            className="bg-[#1a1a1a] border-[#333] focus-visible:ring-purple-500"
                        />
                        <Button onClick={handleSend} disabled={!isConnected || isThinking} className="bg-purple-600 hover:bg-purple-700">
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Manual Props Section (Bottom 30% - Collapsible ideally, but fixed for now) */}
                <div className="h-[200px] border-t border-[#333] bg-[#151515] flex flex-col">
                    <div className="h-8 bg-[#252525] flex items-center px-4 border-b border-[#333]">
                        <span className="text-xs font-bold text-gray-400">Manual Props (JSON)</span>
                    </div>
                    <div className="flex-1 p-2">
                        <textarea
                            className="w-full h-full bg-[#111] text-xs text-green-400 p-2 font-mono border border-[#333] resize-none focus:outline-none"
                            placeholder="{ json: props }"
                            defaultValue='{ "note": "Props are managed by AI" }'
                        />
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AICoPilotStudio;
