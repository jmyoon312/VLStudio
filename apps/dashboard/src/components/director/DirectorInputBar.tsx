import React, { useRef } from 'react';
import { 
    Send, Square, Sliders, Paperclip, X, Plus, Link as LinkIcon, 
    Mic, MicOff, Sparkles, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SovereignPreset } from '@/components/presets/PresetLibraryModal';
import { cn } from '@/lib/utils';

export interface AttachedMedia {
    id: string;
    name: string;
    path: string;
    isUrl?: boolean;
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
    securityScope?: string;
    onChangeSecurityScope?: (scope: string) => void;
    isLiveVoiceActive?: boolean;
    onToggleLiveVoice?: () => void;
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
    securityScope = '모두 허용',
    onChangeSecurityScope,
    isLiveVoiceActive,
    onToggleLiveVoice,
    quickPrompts = DEFAULT_QUICK_PROMPTS,
    hasMessages,
    placeholder
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="p-3 sm:p-4 bg-gradient-to-t from-background via-background to-transparent shrink-0">
            <div className="max-w-4xl mx-auto rounded-2xl border border-border/80 bg-card shadow-xl p-3 space-y-2">
                {/* Top Chips Row: Preset Chip & Attached Files */}
                {(activePreset || attachedFiles.length > 0) && (
                    <div className="flex flex-wrap items-center gap-1.5 px-1">
                        {/* Active Preset Chip */}
                        {activePreset && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-semibold">
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

                        {/* Attached Files Chips */}
                        {attachedFiles.map((f) => (
                            <div
                                key={f.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-foreground border border-border text-xs font-medium"
                            >
                                <Paperclip className="w-3 h-3 text-muted-foreground" />
                                <span className="truncate max-w-[140px]">{f.name}</span>
                                <button
                                    type="button"
                                    onClick={() => onRemoveAttachedFile(f.id)}
                                    className="text-muted-foreground hover:text-foreground ml-0.5 cursor-pointer"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Textarea Input with CJK IME guard */}
                <div className="relative">
                    <Textarea
                        ref={textareaRef}
                        autoFocus={autoFocus ?? true}
                        value={prompt}
                        onChange={(e) => onChangePrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.nativeEvent.isComposing) return;
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                onSendMessage();
                            }
                        }}
                        placeholder={placeholder || (hasMessages ? "이어서 요청하거나 궁금한 것을 물어보세요 (Shift+Enter 줄바꿈)" : "만들고 싶은 영상이나 맡기고 싶은 작업, 비즈니스 전략을 설명해 주세요...")}
                        className="min-h-[64px] sm:min-h-[72px] max-h-44 resize-none border-0 shadow-none focus-visible:ring-0 p-2 pr-8 text-xs sm:text-sm leading-relaxed bg-transparent"
                    />
                    {prompt && (
                        <button
                            type="button"
                            onClick={() => onChangePrompt('')}
                            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 transition-colors cursor-pointer"
                            title="입력 내용 지우기"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Bottom Toolbar Row */}
                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs gap-2">
                    <div className="flex items-center gap-1.5 py-0.5 min-w-0 pr-1 overflow-x-auto no-scrollbar relative">
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
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted cursor-pointer shrink-0"
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

                        {/* Security Scope Selector */}
                        {onChangeSecurityScope && (
                            <div className="relative shrink-0">
                                <select
                                    value={securityScope}
                                    onChange={(e) => onChangeSecurityScope(e.target.value)}
                                    className="h-8 px-2.5 text-xs bg-muted/40 hover:bg-muted text-foreground font-medium rounded-xl border border-border/70 focus:outline-hidden cursor-pointer"
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
                                    className="h-8 px-2.5 rounded-xl text-xs gap-1.5 font-semibold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all flex items-center shadow-2xs cursor-pointer shrink-0"
                                    title="클릭하여 프리셋 스타일 상세 설정 열기"
                                >
                                    <Sliders className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span className="truncate max-w-[120px]">{activePreset.name}</span>
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
                                className="h-8 px-2.5 rounded-xl text-xs gap-1.5 font-medium border-border/80 hover:bg-muted text-foreground cursor-pointer shadow-2xs shrink-0"
                                title="프리셋 보관함에서 원하는 스타일 선택"
                            >
                                <Sliders className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span>프리셋</span>
                            </Button>
                        )}
                    </div>

                    {/* Right Controls: Live Voice Toggle & Send/Stop Button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {onToggleLiveVoice && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={onToggleLiveVoice}
                                className={cn(
                                    "h-8 px-2.5 rounded-xl text-xs font-bold gap-1 cursor-pointer transition-all",
                                    isLiveVoiceActive
                                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 animate-pulse"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                                title={isLiveVoiceActive ? "Gemini 3.8 Live 음성 통화 끄기" : "Gemini 3.8 Live 실시간 마이크 켜기"}
                            >
                                {isLiveVoiceActive ? <Mic className="w-3.5 h-3.5 text-emerald-500" /> : <MicOff className="w-3.5 h-3.5" />}
                                <span className="hidden md:inline">실시간 음성</span>
                            </Button>
                        )}

                        {isStreaming ? (
                            <Button
                                type="button"
                                size="sm"
                                onClick={onCancelStream}
                                className="h-8 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1 cursor-pointer shadow-xs"
                                title="생성 중단"
                            >
                                <Square className="w-3.5 h-3.5 fill-current" />
                                <span>중단</span>
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                disabled={!prompt.trim() && attachedFiles.length === 0}
                                onClick={() => onSendMessage()}
                                className="h-8 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1 cursor-pointer shadow-xs disabled:opacity-40"
                                title="메시지 전송 (Enter)"
                            >
                                <Send className="w-3.5 h-3.5" />
                                <span>전송</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
