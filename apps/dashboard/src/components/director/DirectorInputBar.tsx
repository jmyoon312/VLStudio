import React, { useRef, useState } from 'react';
import { 
    Send, Square, Sliders, Paperclip, X, Plus, Link as LinkIcon, 
    Mic, MicOff, Sparkles, Shield, Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SovereignPreset } from '@/components/presets/PresetLibraryModal';
import { ModelSelectorPopover, ReasoningEffort } from './ModelSelectorPopover';
import { AgentMentionDropdown, AgentRosterItem } from './AgentMentionDropdown';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface AttachedMedia {
    id: string;
    name: string;
    path: string;
    isUrl?: boolean;
    isImage?: boolean;
    previewUrl?: string;
    dataUrl?: string;
    serverPath?: string;
}

export interface QuickPromptItem {
    title: string;
    subtitle: string;
    badge: string;
    badgeColor: string;
    iconBg: string;
    emoji: string;
    text: string;
}

export const DEFAULT_QUICK_PROMPTS: QuickPromptItem[] = [
    {
        title: "2026 최신 숏폼 트렌드 분석",
        subtitle: "실시간 급상승 키워드 & 포맷 표 정리",
        badge: "트렌드 분석",
        badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        iconBg: "from-amber-500/20 to-orange-500/20 text-orange-500 border-amber-500/30",
        emoji: "🔥",
        text: "현재 2026년 9월 기준 유튜브 쇼츠 및 틱톡에서 가장 폭발적인 최신 숏폼 트렌드 키워드와 인기 포맷을 마크다운 표로 깔끔하게 정리해줘"
    },
    {
        title: "실시간 급상승 바이럴 아이템 발굴",
        subtitle: "시청 지속시간 65% 이상 3초 훅 기획",
        badge: "아이템 발굴",
        badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        iconBg: "from-emerald-500/20 to-teal-500/20 text-emerald-500 border-emerald-500/30",
        emoji: "⚡",
        text: "시청 지속시간(Watch Time) 65% 이상 달성 가능한 실시간 급상승 숏폼 기획 아이템 3개와 3초 훅을 추천해줘"
    },
    {
        title: "유튜브 링크로 프리셋 & 대본 추출",
        subtitle: "영상 다운로드 및 3단 훅 시그니처 대본",
        badge: "스타일 복제",
        badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
        iconBg: "from-purple-500/20 to-indigo-500/20 text-purple-500 border-purple-500/30",
        emoji: "🎬",
        text: "https://www.youtube.com/watch?v=oqe7G6gcWBo 다운받아서 프리셋으로 만들고 3단 훅 대본 작성해줘"
    },
    {
        title: "시청자 이탈 없는 30초 반전 쇼츠",
        subtitle: "리텐션 극대화 반전 플롯 및 컷 전환 연출",
        badge: "반전 연출",
        badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
        iconBg: "from-blue-500/20 to-cyan-500/20 text-blue-500 border-blue-500/30",
        emoji: "🚀",
        text: "시청자의 고정관념을 깨고 리텐션을 극대화하는 30초 반전 숏폼 대본과 컷 전환 연출안 짜줘"
    },
];

export interface DirectorInputBarProps {
    prompt: string;
    onChangePrompt: (val: string) => void;
    onSendMessage: (customText?: string) => void;
    isStreaming?: boolean;
    onCancelStream?: () => void;
    attachedFiles: AttachedMedia[];
    onRemoveAttachedFile: (id: string) => void;
    onAttachFiles?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    activePreset?: SovereignPreset | null;
    onOpenPresetModal?: () => void;
    onClearPreset?: () => void;
    onOpenCustomizeModal?: () => void;
    onOpenCloudMediaModal?: () => void;
    onOpenAgentSoul?: (agentId?: string) => void;
    securityScope?: string;
    onChangeSecurityScope?: (scope: string) => void;
    isLiveVoiceActive?: boolean;
    onToggleLiveVoice?: () => void;
    selectedProvider?: 'codex' | 'chatgpt_web' | 'gemini' | 'claude' | 'deepseek' | 'grok' | 'omniroute';
    onSelectProvider?: (p: any) => void;
    selectedModel?: string;
    onSelectModel?: (m: string) => void;
    reasoningEffort?: ReasoningEffort;
    onSelectReasoningEffort?: (r: ReasoningEffort) => void;
    quickPrompts?: QuickPromptItem[];
    hasMessages: boolean;
    placeholder?: string;
    textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
    autoFocus?: boolean;
}

export const DirectorInputBar: React.FC<DirectorInputBarProps> = ({
    prompt,
    onChangePrompt,
    onSendMessage,
    isStreaming,
    onCancelStream,
    attachedFiles,
    onRemoveAttachedFile,
    onAttachFiles,
    activePreset,
    onOpenPresetModal,
    textareaRef,
    autoFocus,
    onClearPreset,
    onOpenCustomizeModal,
    onOpenCloudMediaModal,
    onOpenAgentSoul,
    securityScope = '모두 허용',
    onChangeSecurityScope,
    isLiveVoiceActive,
    onToggleLiveVoice,
    selectedProvider,
    onSelectProvider,
    selectedModel,
    onSelectModel,
    reasoningEffort = 'medium',
    onSelectReasoningEffort,
    quickPrompts = DEFAULT_QUICK_PROMPTS,
    hasMessages,
    placeholder
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);
    const [previewImageModalUrl, setPreviewImageModalUrl] = useState<string | null>(null);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        onChangePrompt(val);
        const cursor = e.target.selectionStart || 0;
        const textBeforeCursor = val.slice(0, cursor);
        const match = textBeforeCursor.match(/@([a-zA-Z0-9가-힣]*)$/);
        if (match) {
            setShowMentionDropdown(true);
            setMentionQuery(match[1]);
            setMentionStartIndex(cursor - match[0].length);
        } else {
            setShowMentionDropdown(false);
        }
    };

    const handleSelectAgent = (agent: AgentRosterItem) => {
        if (mentionStartIndex >= 0) {
            const before = prompt.slice(0, mentionStartIndex);
            const after = prompt.slice(mentionStartIndex + mentionQuery.length + 1);
            const nextText = `${before}${agent.tag} ${after}`;
            onChangePrompt(nextText);
        } else {
            onChangePrompt(`${agent.tag} ${prompt}`);
        }
        setShowMentionDropdown(false);
        setMentionStartIndex(-1);
        textareaRef?.current?.focus();
        toast.success(`[${agent.tag}] ${agent.name} 하수인이 호출되었습니다.`);
    };

    return (
        <div className="p-2 sm:p-4 pb-2 sm:pb-3 bg-gradient-to-t from-background via-background to-transparent shrink-0">
            <div className="max-w-4xl mx-auto rounded-xl sm:rounded-2xl border border-border/80 bg-card shadow-xl p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                {/* Top Chips Row: Preset Chip & Attached Files */}
                {(activePreset || attachedFiles.length > 0) && (
                    <div className="flex flex-wrap items-center gap-1.5 px-1">
                        {/* Active Preset Chip */}
                        {activePreset && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[11px] sm:text-xs font-semibold">
                                <Sliders className="w-3 h-3 text-blue-500" />
                                <span>프리셋: {activePreset.name}</span>
                                {onClearPreset && (
                                    <button
                                        type="button"
                                        onClick={onClearPreset}
                                        className="hover:text-foreground ml-0.5 cursor-pointer"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Attached Files Preview - Compact Image Thumbnails without long filenames */}
                        {attachedFiles.map((f) => {
                            const isImg = f.isImage || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(f.name) || !!f.previewUrl;
                            const imgSrc = f.previewUrl || (f.path?.startsWith('blob:') || f.path?.startsWith('data:') || f.path?.startsWith('http') ? f.path : `/files/${f.path}`);
                            
                            if (isImg) {
                                return (
                                    <div
                                        key={f.id}
                                        className="relative group inline-block shrink-0"
                                        title={f.name}
                                    >
                                        <div
                                            onClick={() => setPreviewImageModalUrl(imgSrc)}
                                            className="w-9 h-9 rounded-md overflow-hidden border border-border/80 bg-muted/80 flex items-center justify-center shadow-xs hover:border-primary/60 transition-colors cursor-zoom-in"
                                            title="클릭하여 원본 크기로 보기"
                                        >
                                            <img
                                                src={imgSrc}
                                                alt={f.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                                }}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onRemoveAttachedFile(f.id)}
                                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-foreground/85 hover:bg-rose-600 text-background hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                                            title="첨부 해제"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={f.id}
                                    className="relative inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/90 text-foreground border border-border/80 text-xs font-medium shadow-xs group hover:border-primary/50 transition-colors"
                                    title={f.name}
                                >
                                    <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span className="text-[11px] text-muted-foreground uppercase font-semibold">{f.name.split('.').pop() || 'FILE'}</span>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveAttachedFile(f.id)}
                                        className="text-muted-foreground hover:text-rose-500 ml-0.5 p-0.5 rounded-sm hover:bg-background cursor-pointer transition-colors"
                                        title="첨부 해제"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Textarea Input with CJK IME guard and @mention popup */}
                <div className="relative">
                    {showMentionDropdown && (
                        <AgentMentionDropdown
                            query={mentionQuery}
                            onSelectAgent={handleSelectAgent}
                            onClose={() => setShowMentionDropdown(false)}
                        />
                    )}
                    <Textarea
                        ref={textareaRef}
                        autoFocus={autoFocus ?? true}
                        value={prompt}
                        onChange={handleTextChange}
                        onKeyDown={(e) => {
                            if (showMentionDropdown && e.key === 'Escape') {
                                e.preventDefault();
                                setShowMentionDropdown(false);
                                return;
                            }
                            if (e.nativeEvent.isComposing) return;
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                onSendMessage();
                            }
                        }}
                        placeholder={placeholder || (isLiveVoiceActive ? "🎙️ 루피와 실시간 음성 대화 중... (화면이나 캔버스를 보며 편하게 말씀하세요)" : hasMessages ? "이어서 요청하거나 궁금한 것을 물어보세요 (@멘션으로 하수인 직접 호출, Shift+Enter 줄바꿈)" : "만들고 싶은 영상이나 맡기고 싶은 작업, 비즈니스 전략을 설명해 주세요... (@ 입력 시 8대 하수인 호출)")}
                        className="min-h-[48px] sm:min-h-[64px] max-h-40 resize-none border-0 shadow-none focus-visible:ring-0 p-1.5 sm:p-2 pr-7 sm:pr-8 text-xs sm:text-sm leading-relaxed bg-transparent"
                    />
                    {prompt && (
                        <button
                            type="button"
                            onClick={() => onChangePrompt('')}
                            className="absolute top-1.5 right-1.5 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 transition-colors cursor-pointer"
                            title="입력 내용 지우기"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Bottom Toolbar Row - Optimized for Mobile & Desktop */}
                <div className="flex items-center justify-between pt-1 sm:pt-1.5 border-t border-border/40 text-xs gap-1 sm:gap-2">
                    {/* Left Tools: Scrollable or Compact on mobile */}
                    <div className="flex items-center gap-1 sm:gap-1.5 py-0.5 min-w-0 overflow-x-auto no-scrollbar">
                        {/* Attach File from PC */}
                        {onAttachFiles && (
                            <>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="video/*,audio/*,image/*"
                                    onChange={onAttachFiles}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted cursor-pointer shrink-0"
                                    title="내 PC에서 미디어 파일 첨부 (+)"
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </>
                        )}

                        {/* Cloud Media / YouTube URL Source Hub Button */}
                        {onOpenCloudMediaModal && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={onOpenCloudMediaModal}
                                className="h-8 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted gap-1 border border-border/60 shadow-2xs cursor-pointer shrink-0"
                                title="유튜브 URL 및 미디어 소싱 허브 열기"
                            >
                                <LinkIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="hidden sm:inline">소스 추가</span>
                            </Button>
                        )}

                        {/* Bot Mode SOUL.md Inspector Modal Button */}
                        {onOpenAgentSoul && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onOpenAgentSoul()}
                                className="h-8 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted gap-1 border border-border/60 shadow-2xs cursor-pointer shrink-0"
                                title="8대 전문 하수인 SOUL.md 페르소나 및 독립 메모리 관리"
                            >
                                <Bot className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                <span className="hidden sm:inline">SOUL</span>
                            </Button>
                        )}

                        {/* AI Engine & Model Selector Popover */}
                        {selectedProvider && onSelectProvider && selectedModel && onSelectModel && (
                            <ModelSelectorPopover
                                selectedProvider={selectedProvider}
                                onSelectProvider={onSelectProvider}
                                selectedModel={selectedModel}
                                onSelectModel={onSelectModel}
                                reasoningEffort={reasoningEffort}
                                onSelectReasoningEffort={onSelectReasoningEffort}
                                placement="top"
                            />
                        )}

                        {/* Security Scope Selector (Desktop / Tablet only to save mobile space) */}
                        {onChangeSecurityScope && (
                            <div className="hidden md:block relative shrink-0">
                                <select
                                    value={securityScope}
                                    onChange={(e) => onChangeSecurityScope(e.target.value)}
                                    className="h-8 px-2 text-xs bg-muted/40 hover:bg-muted text-foreground font-medium rounded-xl border border-border/70 focus:outline-hidden cursor-pointer"
                                >
                                    <option value="모두 허용">🛡️ 자동 승인</option>
                                    <option value="작업 폴더 허용">🛡️ 작업 폴더만</option>
                                    <option value="읽기 전용">🛡️ 확인 후 실행</option>
                                </select>
                            </div>
                        )}

                        {/* Preset Selector */}
                        {activePreset ? (
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={onOpenCustomizeModal}
                                    className="h-8 px-2 sm:px-2.5 rounded-xl text-xs gap-1 sm:gap-1.5 font-semibold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all flex items-center shadow-2xs cursor-pointer shrink-0"
                                    title="클릭하여 프리셋 스타일 상세 설정 열기"
                                >
                                    <Sliders className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span className="truncate max-w-[80px] sm:max-w-[100px]">{activePreset.name}</span>
                                </button>
                                {onClearPreset && (
                                    <button
                                        type="button"
                                        onClick={onClearPreset}
                                        className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted cursor-pointer shrink-0"
                                        title="프리셋 선택 해제"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ) : onOpenPresetModal && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onOpenPresetModal}
                                className="h-8 px-2 sm:px-2.5 rounded-xl text-xs gap-1 sm:gap-1.5 font-medium border-border/80 hover:bg-muted text-foreground cursor-pointer shadow-2xs shrink-0"
                                title="프리셋 보관함에서 원하는 스타일 선택"
                            >
                                <Sliders className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="hidden xs:inline sm:inline">프리셋</span>
                            </Button>
                        )}
                    </div>

                    {/* Right Controls: Live Voice Toggle & Send/Stop Button */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto pl-1">

                        {onToggleLiveVoice && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={onToggleLiveVoice}
                                className={cn(
                                    "h-8 px-2 sm:px-2.5 rounded-xl text-xs font-bold gap-1 cursor-pointer transition-all shrink-0",
                                    isLiveVoiceActive
                                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 animate-pulse"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                                title={isLiveVoiceActive ? "Gemini 3.8 Live 음성 통화 끄기" : "Gemini 3.8 Live 실시간 마이크 켜기"}
                            >
                                {isLiveVoiceActive ? <Mic className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <MicOff className="w-3.5 h-3.5 shrink-0" />}
                                <span className="hidden md:inline">실시간 음성</span>
                            </Button>
                        )}

                        {isStreaming ? (
                            <Button
                                type="button"
                                size="sm"
                                onClick={onCancelStream}
                                className="h-8 px-2.5 sm:px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1 cursor-pointer shadow-xs shrink-0"
                                title="생성 중단"
                            >
                                <Square className="w-3.5 h-3.5 fill-current shrink-0" />
                                <span className="hidden xs:inline">중단</span>
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                disabled={!prompt.trim() && attachedFiles.length === 0}
                                onClick={() => onSendMessage()}
                                className="h-8 px-2.5 sm:px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1 cursor-pointer shadow-xs disabled:opacity-40 shrink-0"
                                title="메시지 전송 (Enter)"
                            >
                                <Send className="w-3.5 h-3.5 shrink-0" />
                                <span>전송</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Attached Image Zoom Lightbox Modal */}
            {previewImageModalUrl && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
                    onClick={() => setPreviewImageModalUrl(null)}
                >
                    <div
                        className="relative max-w-4xl max-h-[90vh] bg-card/95 rounded-2xl border border-border shadow-2xl p-2 flex flex-col items-center justify-center overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setPreviewImageModalUrl(null)}
                            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer z-20 shadow-md"
                            title="닫기"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <img
                            src={previewImageModalUrl}
                            alt="첨부 이미지 원본 미리보기"
                            className="max-h-[82vh] w-auto max-w-full rounded-xl object-contain shadow-inner"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
