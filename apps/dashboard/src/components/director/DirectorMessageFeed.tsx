import React, { useRef, useEffect } from 'react';
import { 
    Check, Copy, FileText, CheckCircle2, Loader2, Sparkles, Film, 
    BookmarkPlus, ExternalLink, Volume2, PlayCircle, Eye, ArrowRight,
    Rocket, ChevronDown, Wrench, Folder, Globe, Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { EmbeddedVideoPlayer } from './EmbeddedVideoPlayer';
import { SourceCandidateCard, SourceCandidate } from './SourceCandidateCard';
import { SovereignPreset } from '@/components/presets/PresetLibraryModal';
import { QuickPromptItem, DEFAULT_QUICK_PROMPTS } from './DirectorInputBar';
import { cn } from '@/lib/utils';

export interface StepProgress {
    step_id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    detail?: string;
}

export interface VideoTask {
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
        duration_sec?: number;
        elapsed_seconds?: number;
        file_size_mb?: number;
        audio_path?: string;
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

export interface DirectorChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content?: string;
    text?: string;
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
        duration_sec?: number;
        elapsed_seconds?: number;
        file_size_mb?: number;
        audio_path?: string;
    };
    created_preset?: SovereignPreset;
    benchmark_id?: number;
    staged_preset_name?: string;
    action_chips?: string[];
    image_url?: string;
    audio_url?: string;
    audio_engine?: string;
    audio_voice_id?: string;
    source_candidates?: SourceCandidate[];
    timestamp: number;
}

const CodeBlockCard: React.FC<{ language?: string; value: string }> = ({ language, value }) => {
    const [copied, setCopied] = React.useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('텍스트가 클립보드에 복사되었습니다.');
    };

    return (
        <div className="my-2.5 rounded-xl border border-border bg-muted/20 dark:bg-card/90 overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-muted/60 dark:bg-muted/30 border-b border-border/60 text-[11px] font-mono text-muted-foreground select-none">
                <span className="flex items-center gap-1.5 font-semibold text-foreground/85">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    {language || 'code'}
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
            <div className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-foreground select-text whitespace-pre-wrap">
                {value}
            </div>
        </div>
    );
};

export const directorMarkdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || '');
        const codeText = String(children).replace(/\n$/, '');
        if (!inline && (match || codeText.includes('\n') || codeText.length > 60)) {
            return <CodeBlockCard language={match ? match[1] : 'code'} value={codeText} />;
        }
        return (
            <code className="px-1.5 py-0.5 rounded-md bg-muted/80 text-primary font-mono text-xs border border-border/50" {...props}>
                {children}
            </code>
        );
    },
    blockquote({ children }: any) {
        return (
            <div className="my-2.5 border-l-4 border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 px-3.5 py-2 rounded-r-xl text-xs leading-relaxed text-foreground/90">
                {children}
            </div>
        );
    },
    table({ children }: any) {
        return (
            <div className="my-3 overflow-x-auto rounded-xl border border-border/80 bg-card/60 shadow-2xs">
                <table className="w-full text-[13px] border-collapse">
                    {children}
                </table>
            </div>
        );
    },
    thead({ children }: any) {
        return (
            <thead className="bg-muted/50 text-foreground font-semibold border-b border-border/70 text-xs">
                {children}
            </thead>
        );
    },
    tbody({ children }: any) {
        return (
            <tbody className="divide-y divide-border/50 bg-transparent">
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
            <th className="px-4 py-2.5 text-left font-semibold text-foreground/90 border-r border-border/30 last:border-r-0 whitespace-nowrap">
                {children}
            </th>
        );
    },
    td({ children }: any) {
        return (
            <td className="px-4 py-2.5 text-foreground/85 border-r border-border/30 last:border-r-0 leading-relaxed text-[12.5px]">
                {children}
            </td>
        );
    },
    strong({ children }: any) {
        const text = String(children).trim();
        // Category tags in brackets: e.g. [심리·호기심], [비교·검증], [공감·도파민], [충격·반전]
        if (/^\[[^\]]+\]$/.test(text)) {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-primary/10 text-primary border border-primary/25 mr-1 select-text shadow-2xs">
                    {children}
                </span>
            );
        }
        // Timecodes: e.g. 00.00~03.30, 0.6~1.5초, 01.22초
        if (/(\d{1,2}[\.:]\d{2}|\d+\.?\d*초)/.test(text)) {
            return (
                <strong className="font-bold text-foreground bg-muted/60 dark:bg-muted/40 px-1 py-0.5 rounded text-[12.5px] font-mono border border-border/40">
                    {children}
                </strong>
            );
        }
        return <strong className="font-bold text-foreground">{children}</strong>;
    },
    p({ children }: any) {
        return (
            <div className="my-1.5 leading-[1.75] text-foreground/90">
                {children}
            </div>
        );
    },
    ul({ children }: any) {
        return (
            <ul className="list-disc list-inside space-y-1.5 my-2 pl-1 text-foreground/90">
                {children}
            </ul>
        );
    },
    ol({ children }: any) {
        return (
            <ol className="list-decimal list-inside space-y-1.5 my-2 pl-1 text-foreground/90">
                {children}
            </ol>
        );
    },
    li({ children }: any) {
        return (
            <li className="leading-[1.75] text-foreground/90">
                {children}
            </li>
        );
    }
};

export interface DirectorMessageFeedProps {
    messages: DirectorChatMessage[];
    isStreaming?: boolean;
    onSendMessage: (customText?: string) => void;
    onOpenInRightPanel?: (video: { filename: string; videoUrl: string; fileSizeMb?: number; filePath?: string }) => void;
    activePreset?: SovereignPreset | null;
    avatarElement?: (isAssistant: boolean) => React.ReactNode;
    quickPrompts?: QuickPromptItem[];
    emptyStateTitle?: string;
    emptyStateSubtitle?: string;
    onEditMessage?: (text: string) => void;
}

export const DirectorMessageFeed: React.FC<DirectorMessageFeedProps> = ({
    messages,
    isStreaming,
    onSendMessage,
    onOpenInRightPanel,
    activePreset,
    avatarElement,
    quickPrompts = DEFAULT_QUICK_PROMPTS,
    emptyStateTitle = "ViraLoop AI 총괄 디렉터",
    emptyStateSubtitle = "영상 제작, 숏폼 알고리즘 트렌드, CapCut 조립, 비즈니스 전략까지 무엇이든 함께합니다.",
    onEditMessage
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevMsgCountRef = useRef(messages.length);
    const [expandedStepMsgIds, setExpandedStepMsgIds] = React.useState<Record<string, boolean>>({});
    const [showScrollBottom, setShowScrollBottom] = React.useState(false);

    const toggleStepExpand = (msgId: string) => {
        setExpandedStepMsgIds(prev => ({ ...prev, [msgId]: !prev[msgId] }));
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const isUp = el.scrollHeight - el.scrollTop - el.clientHeight > 200;
        setShowScrollBottom(isUp);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

    useEffect(() => {
        // Zero-lag instant scroll jump on bulk load / thread switch
        const countDiff = Math.abs(messages.length - prevMsgCountRef.current);
        const isBulkOrSwitch = countDiff > 1 || prevMsgCountRef.current === 0;
        prevMsgCountRef.current = messages.length;

        if (isBulkOrSwitch) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        } else {
            messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
        }
    }, [messages, isStreaming]);

    const osBasename = (p: string) => p.split(/[\\/]/).pop() || p;

    return (
        <div onScroll={handleScroll} className="relative flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
            {/* Empty State: Quick Prompt Cards */}
            {messages.length === 0 && (
                <div className="max-w-3xl mx-auto py-8 space-y-6 animate-in fade-in duration-300">
                    <div className="text-center space-y-2">
                        {avatarElement ? (
                            <div className="flex justify-center mb-3">
                                {avatarElement(true)}
                            </div>
                        ) : (
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-2 shadow-xs">
                                <Sparkles className="w-6 h-6" />
                            </div>
                        )}
                        <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                            {emptyStateTitle}
                        </h2>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                            {emptyStateSubtitle}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {quickPrompts.map((qp, idx) => (
                            <button
                                key={idx}
                                onClick={() => onSendMessage(qp.text)}
                                className="p-3.5 rounded-2xl bg-card hover:bg-accent border border-border hover:border-primary/40 text-left transition-all shadow-xs group cursor-pointer space-y-1.5"
                            >
                                <div className="flex items-center justify-between">
                                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", qp.badgeColor)}>
                                        {qp.badge}
                                    </span>
                                    <span className="text-base">{qp.emoji}</span>
                                </div>
                                <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                                    {qp.title}
                                </h3>
                                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                                    {qp.subtitle}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Message Stream */}
            {messages.map((msg, idx) => {
                const messageText = msg.content || msg.text || '';
                const isUser = msg.role === 'user';
                const isLatestMessage = idx === messages.length - 1;

                if (isUser) {
                    return (
                        <div key={msg.id} className="flex flex-col items-end w-full max-w-3xl mx-auto my-1.5 group animate-in fade-in duration-150">
                            <div className="max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm leading-relaxed whitespace-pre-wrap shadow-xs select-text">
                                {messageText}
                            </div>
                            {/* Hover Action Bar for User Message */}
                            <div className="flex items-center gap-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pr-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(messageText);
                                        toast.success('질문이 클립보드에 복사되었습니다.');
                                    }}
                                    className="px-2 py-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                                    title="질문 복사"
                                >
                                    <Copy className="w-3 h-3" />
                                    <span className="text-[10px]">복사</span>
                                </button>
                                {onEditMessage && (
                                    <button
                                        type="button"
                                        onClick={() => onEditMessage(messageText)}
                                        className="px-2 py-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                                        title="질문 수정하기 (입력창으로 되돌리기)"
                                    >
                                        <Wrench className="w-3 h-3" />
                                        <span className="text-[10px]">수정</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                }

                return (
                    <div
                        key={msg.id}
                        className="w-full max-w-3xl mx-auto my-3 group animate-in fade-in duration-200"
                    >
                        {/* Assistant Body (Zero avatar icon next to message bubble - clean text flow matching Pixeling) */}
                        <div className="w-full min-w-0 space-y-3 select-text">
                                {/* 1:1 Pixeling Accordion Header: 작업 과정 명령 N번 실행 · 도구 M번 사용 (Zero Box, Zero Border) */}
                                {(() => {
                                    const toolItems = (msg.items?.filter(it => it.type === 'tool')) || [];
                                    const meaningfulSteps = (msg.steps || []).filter(st => st.step_id !== 'session_dispatch');
                                    const hasWorkProcess = (meaningfulSteps.length > 0) || (toolItems.length > 0);
                                    if (!hasWorkProcess) return null;

                                    const isExpanded = expandedStepMsgIds[msg.id] ?? false;
                                    const toolCount = toolItems.length || meaningfulSteps.length;
                                    const commandCount = Math.max(1, Math.floor(toolCount / 2)) || 1;

                                    return (
                                        <div className="space-y-1.5 select-none mb-1">
                                            <button
                                                type="button"
                                                onClick={() => toggleStepExpand(msg.id)}
                                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-normal transition-colors cursor-pointer py-1"
                                            >
                                                <span className="font-semibold text-foreground/90">작업 과정</span>
                                                <span className="text-muted-foreground/80 font-normal">명령 {commandCount}번 실행 · 도구 {toolCount}번 사용</span>
                                                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                            </button>

                                            {/* 1:1 Pixeling Expanded Steps (Zero card border, zero background box, direct plain text list) */}
                                            {isExpanded && (
                                                <div className="space-y-1.5 py-1 px-0.5 text-xs animate-in fade-in-50 duration-150">
                                                    {(msg.steps || []).map((st, sIdx) => {
                                                        const isTool = st.step_id?.startsWith('tool_') || st.title?.includes('도구') || st.title?.includes('작업');
                                                        const isAuto = st.step_id?.startsWith('auto_') || st.title?.includes('자동');
                                                        const isGrounding = st.step_id === 'realtime_grounding' || st.title?.includes('검색');
                                                        const isImage = st.title?.includes('그림') || st.title?.includes('이미지') || st.title?.endsWith('.jpg') || st.title?.endsWith('.png');

                                                        return (
                                                            <div 
                                                                key={sIdx} 
                                                                className="flex items-center gap-2 text-xs py-0.5 text-foreground/80 hover:text-foreground transition-colors"
                                                            >
                                                                <span className="text-xs shrink-0 select-none">
                                                                    {isImage ? '🖼️' : isTool ? '🔑' : isAuto ? '🔄' : isGrounding ? '🌐' : '⚡'}
                                                                </span>
                                                                <span className="font-medium truncate max-w-[380px]">
                                                                    {st.title}
                                                                </span>
                                                                {st.status === 'in_progress' ? (
                                                                    <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
                                                                ) : (
                                                                    <span className="text-[11px] text-muted-foreground shrink-0">
                                                                        {st.step_id === 'realtime_grounding' ? '실시간 검색' : '완료'}
                                                                    </span>
                                                                )}
                                                                {st.detail && (
                                                                    <span className="text-[11px] text-muted-foreground/70 truncate max-w-[280px]">
                                                                        {st.detail}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Text Content with Open Editorial Typography */}
                                {messageText && (
                                    <div className="prose prose-sm dark:prose-invert max-w-none break-words text-foreground/90 text-[13.5px] leading-[1.7]">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={directorMarkdownComponents}>
                                            {messageText}
                                        </ReactMarkdown>
                                    </div>
                                )}

                                {/* Loading / Typing Indicator for Assistant when awaiting text */}
                                {(!messageText || messageText.trim() === '') && isStreaming && isLatestMessage && (
                                    <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground animate-pulse">
                                        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                                        <span className="font-medium text-foreground/80">지능 응답을 작성하고 있습니다...</span>
                                    </div>
                                )}

                                {/* Multi-Video Parallel Tasks Progress (Clean, borderless list) */}
                                {msg.tasks && msg.tasks.length > 0 && (
                                    <div className="space-y-2 pt-1 text-xs">
                                        {msg.tasks.map((task, tIdx) => (
                                            <div key={tIdx} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs font-semibold text-foreground/90">
                                                    <span>작업 {task.item_index + 1} / {task.total_items} {task.media_filename ? `(${task.media_filename})` : ''}</span>
                                                </div>
                                                <div className="space-y-1 pl-2">
                                                    {task.steps.map((st, sIdx) => (
                                                        <div key={sIdx} className="flex items-center gap-2 text-xs">
                                                            {st.status === 'completed' ? (
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                            ) : st.status === 'in_progress' ? (
                                                                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                                                            ) : (
                                                                <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
                                                            )}
                                                            <span className={cn("font-medium", st.status === 'completed' ? "text-foreground" : "text-muted-foreground")}>
                                                                {st.title}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Deliverable Video Player */}
                                {msg.deliverable && msg.deliverable.video_path && (
                                    <div className="space-y-2 pt-2">
                                        <EmbeddedVideoPlayer
                                            filename={osBasename(msg.deliverable.video_path)}
                                            videoUrl={msg.deliverable.video_path.startsWith('http') ? msg.deliverable.video_path : `/files/${msg.deliverable.video_path.replace(/\\/g, '/')}`}
                                            fileSizeMb={msg.deliverable.file_size_mb || 10.3}
                                            duration={msg.deliverable.duration_sec ? `${Math.floor(msg.deliverable.duration_sec / 60)}:${Math.floor(msg.deliverable.duration_sec % 60).toString().padStart(2, '0')}` : "0:21"}
                                            timeElapsedText={msg.deliverable.elapsed_seconds ? `${Math.floor(msg.deliverable.elapsed_seconds / 60)}분 ${Math.round(msg.deliverable.elapsed_seconds % 60)}초 동안 작업했어요` : "완료되었습니다"}
                                            description={msg.deliverable.title ? `[${msg.deliverable.title}] 장면을 완성했습니다.` : "완결된 쇼츠 영상"}
                                            filePath={msg.deliverable.video_path}
                                            audioPath={msg.deliverable.audio_path}
                                            cues={msg.deliverable.cues}
                                            style={msg.deliverable.style}
                                            onOpenInRightPanel={onOpenInRightPanel}
                                        />

                                        {/* Video Deliverable Action Revision Chips */}
                                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => handleEnqueueDeliverable(msg.deliverable?.video_path, msg.deliverable?.title)}
                                                className="px-2.5 py-1 rounded-lg text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 transition-all font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                                                title="유튜브 자동 배포 관리 대기열로 즉시 전송"
                                            >
                                                <Rocket className="w-3.5 h-3.5 text-emerald-500" />
                                                <span>🚀 유튜브 자동 배포 등록</span>
                                            </button>
                                            <span className="text-[11px] font-semibold text-muted-foreground mr-1">피드백 튜닝:</span>
                                            <button
                                                type="button"
                                                onClick={() => onSendMessage("자막 크기 15% 더 키워줘")}
                                                className="px-2.5 py-1 rounded-lg text-xs bg-muted/70 hover:bg-muted text-foreground border border-border/70 hover:border-primary/50 transition-all font-medium cursor-pointer shadow-2xs"
                                            >
                                                자막 더 크게
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onSendMessage("자막 색깔 노란색으로 강조해줘")}
                                                className="px-2.5 py-1 rounded-lg text-xs bg-muted/70 hover:bg-muted text-foreground border border-border/70 hover:border-primary/50 transition-all font-medium cursor-pointer shadow-2xs"
                                            >
                                                🟡 노란 자막
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onSendMessage("이 영상 스타일로 프리셋 저장해줘")}
                                                className="px-2.5 py-1 rounded-lg text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/40 transition-all font-bold flex items-center gap-1 cursor-pointer ml-auto shadow-2xs"
                                            >
                                                <BookmarkPlus className="w-3.5 h-3.5" />
                                                <span>💾 프리셋 저장</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                    {/* Sourced Video Candidates Cards */}
                                    {msg.source_candidates && msg.source_candidates.length > 0 && (
                                        <div className="space-y-3 my-3">
                                            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground px-1">
                                                <Film className="w-4 h-4 text-primary" />
                                                <span>발굴된 원천 소스 영상 ({msg.source_candidates.length}편)</span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3">
                                                {msg.source_candidates.map((cand, cIdx) => (
                                                    <SourceCandidateCard
                                                        key={cIdx}
                                                        candidate={cand}
                                                        presetId={activePreset?.id}
                                                        presetName={activePreset?.name}
                                                        onProduceNow={(selectedCand) => {
                                                            onSendMessage(`발굴된 영상 "${selectedCand.title}" 소스로 지금 숏폼 영상 제작해줘`);
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Dynamic Contextual Action Chips (1:1 Pixeling Fast Interaction Standard) */}
                                    {msg.action_chips && msg.action_chips.length > 0 && !isStreaming && (
                                        <div className="flex flex-wrap items-center gap-1.5 pt-2 pb-1">
                                            {msg.action_chips.map((chip, cIdx) => (
                                                <button
                                                    key={cIdx}
                                                    type="button"
                                                    onClick={() => onSendMessage(chip)}
                                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 hover:border-primary/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                                                >
                                                    <span>{chip}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                    </div>
                );
            })}

            {/* Thinking / Streaming Indicator */}
            {isStreaming && (() => {
                const lastMsg = messages[messages.length - 1];
                const activeStep = lastMsg?.steps?.find(s => s.status === 'in_progress') ||
                                   lastMsg?.tasks?.[0]?.steps?.find(s => s.status === 'in_progress');
                const titleText = activeStep?.title || "AI 디렉터가 실시간으로 답변을 작성하고 있습니다...";
                return (
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground bg-card border border-border px-4 py-2.5 rounded-2xl w-fit shadow-xs animate-in fade-in max-w-3xl mx-auto">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="font-semibold text-foreground">
                            {titleText}
                        </span>
                    </div>
                );
            })()}

            {/* 1:1 Pixeling Floating Jump-to-Latest Button */}
            {showScrollBottom && (
                <button
                    type="button"
                    onClick={scrollToBottom}
                    className="fixed bottom-24 right-1/2 translate-x-1/2 z-30 p-2.5 rounded-full bg-card/95 hover:bg-card text-foreground border border-border/80 shadow-md hover:shadow-lg transition-all cursor-pointer animate-in fade-in zoom-in-90 flex items-center justify-center group"
                    title="최신 메시지로 이동"
                >
                    <ChevronDown className="w-4 h-4 text-primary group-hover:translate-y-0.5 transition-transform" />
                </button>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
};
