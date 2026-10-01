import React, { useState, useEffect, useRef } from 'react';
import { 
    Send, Bot, Sparkles, AlertCircle, RefreshCw, CheckCircle2, 
    Flame, ShieldCheck, Users, Radio, MessageSquare, Terminal, 
    ArrowDown, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { API_BASE_URL } from '@/lib/api';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface BotChatMessage {
    id: string;
    bot_id: string;
    bot_name: string;
    bot_role: string;
    avatar_emoji: string;
    message: string;
    message_type: 'dialogue' | 'task_update' | 'debate' | 'qc_alert' | 'directive';
    timestamp: string;
}

export interface BotCrewGroupChatProps {
    className?: string;
    channelId?: number | null;
    channelName?: string;
    onTriggerSelfPlay?: () => void;
}

const DEFAULT_MESSAGES: BotChatMessage[] = [
    {
        id: 'msg-1',
        bot_id: 'scout',
        bot_name: 'Scout-Alpha',
        bot_role: '트렌드 정찰',
        avatar_emoji: '📡',
        message: '현재 2026년 9월 숏폼 트렌드 분석 완료. "0초 훅 반전 스토리" 키워드가 전주 대비 340% 급상승 중입니다.',
        message_type: 'task_update',
        timestamp: new Date(Date.now() - 1000 * 120).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    {
        id: 'msg-2',
        bot_id: 'writer',
        bot_name: 'Writer-Pro',
        bot_role: '대본 작가',
        avatar_emoji: '✍️',
        message: 'Scout 제안을 반영하여 [The Creative Disruptor] 관점으로 3초 이탈 방지 후킹 카피 3종과 3단 전개 대본 초안을 작성했습니다.',
        message_type: 'dialogue',
        timestamp: new Date(Date.now() - 1000 * 90).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    {
        id: 'msg-3',
        bot_id: 'critic',
        bot_name: 'Critic-85',
        bot_role: '품질 검수',
        avatar_emoji: '🧐',
        message: 'Writer 초안 적대적 검수 결과: Hook Score 92점, Hold Score 86점으로 게이트키퍼(85점)를 통과했습니다. 미디어 생성 승인합니다.',
        message_type: 'qc_alert',
        timestamp: new Date(Date.now() - 1000 * 60).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    {
        id: 'msg-4',
        bot_id: 'voice',
        bot_name: 'Voice-Sync',
        bot_role: '보이스 더빙',
        avatar_emoji: '🎙️',
        message: '나레이션 180 WPM 속도로 감정 실어 더빙 완료. BGM -18dB 사이드체인 덕킹 적용 준비되었습니다.',
        message_type: 'task_update',
        timestamp: new Date(Date.now() - 1000 * 30).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
];

export const BotCrewGroupChat: React.FC<BotCrewGroupChatProps> = ({
    className,
    channelId,
    channelName = '전역 채널',
    onTriggerSelfPlay
}) => {
    const [messages, setMessages] = useState<BotChatMessage[]>(DEFAULT_MESSAGES);
    const [inputPrompt, setInputPrompt] = useState<string>('');
    const [isSending, setIsSending] = useState<boolean>(false);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const scrollEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll on new message
    const scrollToBottom = () => {
        scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // SSE Connection to Bot Crew Stream
    useEffect(() => {
        const streamUrl = `${API_BASE_URL}/harness/bot-crew/stream`;
        let eventSource: EventSource | null = null;

        try {
            eventSource = new EventSource(streamUrl);

            eventSource.onopen = () => {
                setIsConnected(true);
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data && data.bot_id) {
                        const newMsg: BotChatMessage = {
                            id: data.id || `msg-${Date.now()}-${Math.random()}`,
                            bot_id: data.bot_id,
                            bot_name: data.bot_name || 'Bot',
                            bot_role: data.bot_role || 'Agent',
                            avatar_emoji: data.avatar_emoji || '🤖',
                            message: data.message || '',
                            message_type: data.message_type || 'dialogue',
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        };
                        setMessages((prev) => [...prev, newMsg]);
                    }
                } catch {
                    // Ignore parse error
                }
            };

            eventSource.onerror = () => {
                setIsConnected(false);
            };
        } catch {
            setIsConnected(false);
        }

        return () => {
            if (eventSource) {
                eventSource.close();
            }
        };
    }, []);

    // Broadcast directive from Representative ("대표님 손맛 지시")
    const handleSendDirective = async () => {
        if (!inputPrompt.trim() || isSending) return;

        const directiveText = inputPrompt.trim();
        setInputPrompt('');
        setIsSending(true);

        // Optimistically add user's directive message
        const userMsg: BotChatMessage = {
            id: `dir-${Date.now()}`,
            bot_id: 'director',
            bot_name: '대표님',
            bot_role: '총괄 디렉터',
            avatar_emoji: '👑',
            message: directiveText,
            message_type: 'directive',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, userMsg]);

        try {
            const res = await api.post('/harness/bot-crew/chat', {
                bot_id: 'director',
                message: directiveText,
                message_type: 'directive',
                channel_id: channelId
            });

            if (res.data?.reply) {
                const replyMsg: BotChatMessage = {
                    id: `reply-${Date.now()}`,
                    bot_id: res.data.bot_id || 'writer',
                    bot_name: res.data.bot_name || 'Writer-Pro',
                    bot_role: res.data.bot_role || '대본 작가',
                    avatar_emoji: res.data.avatar_emoji || '✍️',
                    message: res.data.reply,
                    message_type: 'dialogue',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                setMessages((prev) => [...prev, replyMsg]);
            }
            toast.success("대표님 지시가 8대 전문 하수인에게 전파되었습니다.");
        } catch (err: any) {
            toast.error("지시 전송 중 일시적 지연이 발생했습니다.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className={cn(
            "flex flex-col h-full border border-border/80 bg-card rounded-2xl shadow-sm overflow-hidden select-none",
            className
        )}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-muted/30">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <h3 className="font-extrabold text-sm text-foreground">
                        8대 전문 하수인 실시간 단체 작전실
                    </h3>
                    <Badge 
                        variant="outline"
                        className={cn(
                            "text-[10px] font-bold px-1.5 py-0",
                            isConnected 
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-muted text-muted-foreground"
                        )}
                    >
                        {isConnected ? "실시간 연동 중" : "로컬 버스 대기"}
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    {onTriggerSelfPlay && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={onTriggerSelfPlay}
                            className="h-7 text-xs font-semibold gap-1 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>사전 모의 검증 실행</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {messages.map((msg) => {
                    const isDirector = msg.bot_id === 'director';

                    return (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex gap-2.5 max-w-[85%] sm:max-w-[75%]",
                                isDirector ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}
                        >
                            {/* Avatar */}
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 border shadow-2xs",
                                isDirector 
                                    ? "bg-amber-500/20 border-amber-500/40 text-amber-500" 
                                    : "bg-muted border-border/80"
                            )}>
                                {msg.avatar_emoji}
                            </div>

                            {/* Bubble Content */}
                            <div className="flex flex-col gap-1 min-w-0">
                                <div className={cn(
                                    "flex items-center gap-1.5 text-[11px] text-muted-foreground",
                                    isDirector && "justify-end"
                                )}>
                                    <span className="font-bold text-foreground">{msg.bot_name}</span>
                                    <span>({msg.bot_role})</span>
                                    <span className="text-[10px]">{msg.timestamp}</span>
                                </div>

                                <div className={cn(
                                    "p-3 rounded-2xl text-xs leading-relaxed border shadow-2xs break-words",
                                    isDirector
                                        ? "bg-primary text-primary-foreground border-primary rounded-tr-xs"
                                        : msg.message_type === 'qc_alert'
                                        ? "bg-amber-500/10 text-foreground border-amber-500/30 rounded-tl-xs"
                                        : "bg-muted/60 text-foreground border-border/80 rounded-tl-xs"
                                )}>
                                    {msg.message}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollEndRef} />
            </div>

            {/* Bottom Directive Input */}
            <div className="p-3 border-t border-border/80 bg-muted/20 flex items-center gap-2">
                <Textarea
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendDirective();
                        }
                    }}
                    placeholder="대표님 손맛 지시: '첫 3초 후킹을 더 자극적으로 바꾸고 15초에 반전 줌인 넣어줘' (Enter 전송)"
                    className="min-h-[40px] max-h-[80px] text-xs py-2 px-3 rounded-xl resize-none border-border/80 bg-background text-foreground"
                    rows={1}
                />
                <Button
                    type="button"
                    size="sm"
                    disabled={!inputPrompt.trim() || isSending}
                    onClick={handleSendDirective}
                    className="h-9 px-3 rounded-xl bg-primary text-primary-foreground font-bold gap-1 cursor-pointer shrink-0 disabled:opacity-40"
                >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">지시 전송</span>
                </Button>
            </div>
        </div>
    );
};

export default BotCrewGroupChat;
