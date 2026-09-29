import React from 'react';
import { 
    PanelLeftClose, PanelLeftOpen, PanelRight, Sliders, Calendar, RotateCcw, 
    Settings, Sparkles, Volume2, VolumeX, Mic, MicOff, Maximize2, Minimize2, 
    PanelRightClose, PanelRightOpen, X, Play, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModelSelectorPopover, ReasoningEffort } from './ModelSelectorPopover';
import { SovereignPreset } from '@/components/presets/PresetLibraryModal';
import { cn } from '@/lib/utils';

export interface DirectorHeaderProps {
    title?: string;
    activePreset?: SovereignPreset | null;
    onOpenPresetModal?: () => void;
    selectedProvider: 'codex' | 'chatgpt_web' | 'gemini' | 'claude' | 'grok' | 'omniroute';
    onSelectProvider: (p: any) => void;
    selectedModel: string;
    onSelectModel: (m: string) => void;
    reasoningEffort?: ReasoningEffort;
    onSelectReasoningEffort?: (r: ReasoningEffort) => void;
    onOpenSchedule?: () => void;
    onOpenAutoContinue?: () => void;
    onOpenSettings?: () => void;
    isStreaming?: boolean;
    onCancelStream?: () => void;
    sidebarCollapsed?: boolean;
    onToggleSidebar?: () => void;
    rightPanelOpen?: boolean;
    onToggleRightPanel?: () => void;
    
    // Live Voice & Loopie Enhancements
    isLiveVoiceActive?: boolean;
    onToggleLiveVoice?: () => void;
    isVoiceMuted?: boolean;
    onToggleVoiceMute?: () => void;
    
    // Window Display Mode Controls (for Floating / Dock / Fullscreen)
    displayMode?: 'dock' | 'floating' | 'fullscreen';
    onChangeDisplayMode?: (mode: 'dock' | 'floating' | 'fullscreen') => void;
    onClose?: () => void;
    
    // Custom Avatar / Badge slot (e.g. Loopie icon)
    leadingElement?: React.ReactNode;
    channelSelectorElement?: React.ReactNode;
    onNewChat?: () => void;
}

export const DirectorHeader: React.FC<DirectorHeaderProps> = ({
    title = '루피 AI 디렉터',
    activePreset,
    onOpenPresetModal,
    selectedProvider,
    onSelectProvider,
    selectedModel,
    onSelectModel,
    reasoningEffort = 'medium',
    onSelectReasoningEffort,
    onOpenSchedule,
    onOpenAutoContinue,
    onOpenSettings,
    sidebarCollapsed,
    onToggleSidebar,
    rightPanelOpen,
    onToggleRightPanel,
    isLiveVoiceActive,
    onToggleLiveVoice,
    isVoiceMuted,
    onToggleVoiceMute,
    displayMode,
    onChangeDisplayMode,
    onClose,
    leadingElement,
    channelSelectorElement,
    onNewChat
}) => {
    return (
        <header className="h-14 border-b border-border/80 bg-card/80 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between shrink-0 select-none z-30">
            {/* Left Section: Sidebar Toggle & Title & Model Selector */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {onToggleSidebar && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onToggleSidebar}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                        title={sidebarCollapsed ? "세션 목록 펼치기" : "세션 목록 접기"}
                    >
                        {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                    </Button>
                )}

                {leadingElement && (
                    <div className="shrink-0 flex items-center">
                        {leadingElement}
                    </div>
                )}

                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs sm:text-sm text-foreground truncate max-w-[140px] sm:max-w-[220px]">
                            {title}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right Section: Preset, Voice, Schedule, Window Controls */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* Optional Target Channel Selector */}
                {channelSelectorElement}

                {/* Active Preset Chip */}
                {activePreset && onOpenPresetModal && (
                    <button
                        type="button"
                        onClick={onOpenPresetModal}
                        className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all cursor-pointer shadow-2xs"
                        title="스타일 프리셋 변경"
                    >
                        <Sliders className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[100px]">{activePreset.name}</span>
                    </button>
                )}

                {/* Text Speech Synthesis Mute / Unmute Toggle */}
                {onToggleVoiceMute && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onToggleVoiceMute}
                        className={cn(
                            "h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-xl",
                            !isVoiceMuted && "text-primary"
                        )}
                        title={isVoiceMuted ? "답변 음성 읽기 켜기" : "답변 음성 읽기 끄기"}
                    >
                        {isVoiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                )}

                {/* Right Panel Toggle Button */}
                {onToggleRightPanel && (
                    <Button
                        type="button"
                        variant={rightPanelOpen ? "secondary" : "ghost"}
                        size="icon"
                        onClick={onToggleRightPanel}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-xl"
                        title={rightPanelOpen ? "작업 패널 접기" : "작업 패널 열기"}
                    >
                        <PanelRight className="w-4 h-4" />
                    </Button>
                )}

                {/* Display Mode Switchers (for Global Modal) */}
                {onChangeDisplayMode && displayMode && (
                    <div className="flex items-center gap-0.5 border-l border-border/80 pl-1.5 ml-1">
                        <Button
                            type="button"
                            variant={displayMode === 'dock' ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => onChangeDisplayMode('dock')}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                            title="사이드 독 모드"
                        >
                            <PanelRightOpen className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            type="button"
                            variant={displayMode === 'floating' ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => onChangeDisplayMode('floating')}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                            title="플로팅 창 모드"
                        >
                            <Minimize2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            type="button"
                            variant={displayMode === 'fullscreen' ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => onChangeDisplayMode('fullscreen')}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                            title="전체화면 콕핏 모드"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                )}

                {/* Close Button (for Global Modal) */}
                {onClose && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-rose-500/10 hover:text-rose-500 rounded-xl cursor-pointer ml-1"
                        title="닫기"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </header>
    );
};
