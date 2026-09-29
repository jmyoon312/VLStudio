import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
    Zap, 
    ChevronDown, 
    ChevronRight, 
    Check, 
    Sliders, 
    Cpu, 
    Sparkles, 
    ShieldCheck 
} from 'lucide-react';

export type ReasoningEffort = 'light' | 'medium' | 'deep' | 'ultra';

export interface ProviderModelConfig {
    provider: string; // 'openai' | 'gemini' | 'claude' | 'grok' | 'omniroute'
    model: string;
    effort: ReasoningEffort;
}

interface ModelSelectorPopoverProps {
    // Legacy / direct prop names
    currentProvider?: string;
    currentModel?: string;
    currentEffort?: ReasoningEffort;
    onModelChange?: (model: string) => void;
    onEffortChange?: (effort: ReasoningEffort) => void;
    onProviderChange?: (provider: string) => void;

    // DirectorHeader prop names
    selectedProvider?: string;
    selectedModel?: string;
    reasoningEffort?: ReasoningEffort;
    onSelectProvider?: (provider: string) => void;
    onSelectModel?: (model: string) => void;
    onSelectReasoningEffort?: (effort: ReasoningEffort) => void;

    providerAccountLabel?: string;
    placement?: 'top' | 'bottom';
}

const PROVIDER_MODELS: Record<string, { label: string; hasAccount: boolean; models: { id: string; name: string; desc: string }[] }> = {
    codex: {
        label: 'OpenAI Codex',
        hasAccount: true,
        models: [
            { id: 'Codex Astra 6.0', name: 'Codex Astra 6.0 (Codex 아스트라)', desc: 'OpenAI Codex CLI 직결 아스트라 6.0 심층 추론 (코덱스 쿼터)' },
            { id: 'GPT-5.6 Sol High', name: 'GPT-5.6 Sol High (Codex 솔)', desc: '초고속 멀티모달 분석 및 타임코드 대본 구조화 (코덱스 쿼터)' },
            { id: 'GPT-5.6 Sol Medium', name: 'GPT-5.6 Sol Medium (밸런스)', desc: '경량 밸런스형 실시간 아이디어 발굴' },
            { id: 'GPT-5.6 Terra Max', name: 'GPT-5.6 Terra Max (심층 기획)', desc: '장편 시나리오 구조화 및 캐릭터 톤앤매너' },
        ]
    },
    chatgpt_web: {
        label: 'ChatGPT Web',
        hasAccount: true,
        models: [
            { id: 'Codex Astra 6.0 (Web)', name: 'Codex Astra 6.0 (Web 아스트라)', desc: 'ChatGPT Web 세션 직결 아스트라 6.0 심층 추론 (웹 쿼터)' },
            { id: 'GPT-5.6 Sol (Web)', name: 'GPT-5.6 Sol (Web 솔)', desc: 'ChatGPT Web 세션 직결 Sol 고속 추론 (웹 쿼터)' },
            { id: 'GPT-5.6 Pro (Web)', name: 'GPT-5.6 Pro (Web 프로)', desc: 'ChatGPT Pro Web 세션 연동 고용량 추론' },
            { id: 'ChatGPT-4o (Web)', name: 'ChatGPT-4o (Web 4o)', desc: 'ChatGPT Web 4o 일반 대화 쿼터 기반 생성' },
        ]
    },
    gemini: {
        label: 'Google Gemini',
        hasAccount: true,
        models: [
            { id: 'Gemini 3.8 Flash', name: 'Gemini 3.8 Flash (보통/Medium · 현역)', desc: '초고속 멀티모달 및 실시간 구글 검색' },
            { id: 'Gemini 3.1 Pro', name: 'Gemini 3.1 Pro (초정밀/Thinking)', desc: '200만 토큰 심층 추론 및 비전 분석' },
            { id: 'Google Antigravity 2.0', name: 'Google Antigravity 2.0 (Agent)', desc: '자율 디렉터 브레인 및 채널 DNA 역공학' },
        ]
    },
    omniroute: {
        label: 'OmniRoute Gateway',
        hasAccount: true,
        models: [
            { id: 'viraloop1', name: 'viraloop1 (스마트 콤보)', desc: '비용 0원 최적 로컬 지능 라우터' },
            { id: 'auto', name: 'auto (자율 라우터)', desc: '작업 유형별 최고 성능 모델 자동 배분' },
            { id: 'imagen3', name: 'Imagen 3 (고화질 이미지)', desc: 'Google 최신 쇼츠/블로그 고화질 생성' },
            { id: 'local-fast', name: 'local-fast (초고속)', desc: '로컬 Whisper 및 즉시 프리셋 발골' },
        ]
    },
    claude: {
        label: 'Anthropic Claude',
        hasAccount: true,
        models: [
            { id: 'Sonnet 5.5 Medium', name: 'Sonnet 5.5 Medium (기본 · 무료/표준)', desc: 'Anthropic Claude 기본 무료/표준 지능 모델' },
            { id: 'Claude 3.7 Sonnet', name: 'Claude 3.7 Sonnet (최신 · 하이브리드)', desc: '사고(Thinking) 및 코딩·대본 연출 특화' },
            { id: 'Claude 3.5 Haiku', name: 'Claude 3.5 Haiku (초경량)', desc: '즉각적인 프롬프트 응답 및 고속 요약' },
            { id: 'Claude 3.5 Sonnet', name: 'Claude 3.5 Sonnet (고성능)', desc: '균형잡힌 지능 및 고속 추론' },
        ]
    },
    deepseek: {
        label: 'DeepSeek',
        hasAccount: true,
        models: [
            { id: 'DeepSeek-V3', name: '⚡ DeepSeek-V3 (초고속 대본·기본 무료)', desc: 'chat.deepseek.com 실시간 한국어 서사 및 유튜브 쇼츠 대본 최적화 (비용 0원)' },
            { id: 'DeepSeek-R1', name: '🧠 DeepSeek-R1 (심층 추론·사고 전문가)', desc: '복잡한 기획 및 고난도 분석을 위한 DeepSeek R1 심층 추론 (비용 0원)' },
            { id: 'DeepSeek-Chat', name: '💬 DeepSeek-Chat (자율 대화)', desc: '일반 대화 및 아이디어 브레인스토밍 (비용 0원)' },
        ]
    }
};

const EFFORT_STEPS: { key: ReasoningEffort; label: string; desc: string }[] = [
    { key: 'light', label: 'Light', desc: '빠른 응답' },
    { key: 'medium', label: '보통', desc: '표준 추론' },
    { key: 'deep', label: '깊음', desc: '심층 비전' },
    { key: 'ultra', label: '초정밀', desc: '프레임 단위' },
];

export const ModelSelectorPopover: React.FC<ModelSelectorPopoverProps> = (props) => {
    const parentProvider = props.currentProvider || props.selectedProvider || 'codex';
    const currentModel = props.currentModel || props.selectedModel || 'Codex Astra 6.0';
    const currentEffort = props.currentEffort || props.reasoningEffort || 'medium';
    const onModelChange = props.onModelChange || props.onSelectModel || (() => {});
    const onEffortChange = props.onEffortChange || props.onSelectReasoningEffort || (() => {});
    const onProviderChange = props.onProviderChange || props.onSelectProvider || (() => {});
    const { providerAccountLabel, placement = 'bottom' } = props;

    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>(parentProvider);
    const [dynamicRegistry, setDynamicRegistry] = useState<typeof PROVIDER_MODELS>(PROVIDER_MODELS);
    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [popoverCoords, setPopoverCoords] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const cardWidth = Math.min(380, window.innerWidth - 24);
        
        let left = rect.left;
        if (left + cardWidth > window.innerWidth - 12) {
            left = window.innerWidth - cardWidth - 12;
        }
        if (left < 12) left = 12;

        if (placement === 'top') {
            setPopoverCoords({
                bottom: window.innerHeight - rect.top + 8,
                left,
                width: cardWidth
            });
        } else {
            setPopoverCoords({
                top: rect.bottom + 8,
                left,
                width: cardWidth
            });
        }
    }, [placement]);

    // Keep activeTab synced with parentProvider changes
    useEffect(() => {
        setActiveTab(parentProvider);
    }, [parentProvider]);

    // Fetch dynamic model registry from backend (zero-hardcoding, live updates)
    useEffect(() => {
        let isMounted = true;
        fetch('/api/ai-accounts/models')
            .then(res => res.json())
            .then(data => {
                if (isMounted && data && typeof data === 'object') {
                    setDynamicRegistry(prev => ({
                        ...prev,
                        ...data
                    }));
                }
            })
            .catch(() => {});
        return () => { isMounted = false; };
    }, []);

    const toggleOpen = () => {
        if (!isOpen) {
            updatePosition();
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    // Close when clicking outside & handle reposition on scroll/resize
    useEffect(() => {
        if (!isOpen) return;
        updatePosition();

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                popoverRef.current && !popoverRef.current.contains(target) &&
                triggerRef.current && !triggerRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        const handleScrollOrResize = () => {
            updatePosition();
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', handleScrollOrResize);
        window.addEventListener('scroll', handleScrollOrResize, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, true);
        };
    }, [isOpen, updatePosition]);

    const activeEffortIndex = EFFORT_STEPS.findIndex(s => s.key === currentEffort);
    const effortLabel = EFFORT_STEPS[activeEffortIndex >= 0 ? activeEffortIndex : 1].label;
    const effectiveProvider = activeTab || parentProvider || 'codex';
    const providerConfig = dynamicRegistry[effectiveProvider] || dynamicRegistry['codex'] || PROVIDER_MODELS['codex'];
    const currentModelObj = providerConfig?.models?.find(m => m.id === currentModel || m.name === currentModel);
    const rawModelName = currentModelObj?.name || currentModel || 'Codex Astra 6.0';
    // 버튼 칩에는 괄호 부가설명을 제외한 핵심 모델명만 깔끔하게 노출 (예: 'Codex Astra 6.0 (기본 · 플래그십)' -> 'Codex Astra 6.0')
    const displayModelName = rawModelName.replace(/\s*\(.*?\)/g, '').trim() || rawModelName;

    return (
        <div className="relative inline-block">
            {/* Popover Trigger Button: matches Image 3 */}
            <button
                ref={triggerRef}
                type="button"
                onClick={toggleOpen}
                className={`h-8 px-2.5 sm:px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs shrink-0 cursor-pointer ${
                    isOpen 
                        ? 'bg-muted border-primary/60 text-foreground ring-2 ring-primary/20' 
                        : 'bg-card border-border/80 text-foreground hover:border-primary/40 hover:bg-muted/50'
                }`}
                title="AI 모델 및 추론 강도 조절"
            >
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                <span className="font-bold truncate max-w-[110px] sm:max-w-[140px] whitespace-nowrap">{displayModelName}</span>
                <span className="text-[11px] text-muted-foreground font-normal whitespace-nowrap shrink-0">· {effortLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Popover Card Portal (Rendered directly in body to avoid any overflow clipping) */}
            {isOpen && popoverCoords && createPortal(
                <div 
                    ref={popoverRef}
                    style={{
                        position: 'fixed',
                        ...(popoverCoords.top !== undefined ? { top: `${popoverCoords.top}px` } : {}),
                        ...(popoverCoords.bottom !== undefined ? { bottom: `${popoverCoords.bottom}px` } : {}),
                        left: `${popoverCoords.left}px`,
                        width: `${popoverCoords.width}px`,
                        zIndex: 99999
                    }}
                    className="rounded-2xl bg-card border border-border/90 shadow-2xl p-3.5 text-foreground animate-in fade-in zoom-in-95 duration-150 space-y-3"
                    onClick={(e) => e.stopPropagation()}
                >
                    
                    {/* 1. Provider Tabs Row */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 border-b border-border/60">
                        {[
                            { key: 'codex', label: 'Codex' },
                            { key: 'chatgpt_web', label: 'Web' },
                            { key: 'gemini', label: 'Gemini' },
                            { key: 'omniroute', label: 'OmniRoute' },
                            { key: 'claude', label: 'Claude' },
                            { key: 'deepseek', label: 'DeepSeek' },
                        ].map((p) => {
                            const pCfg = dynamicRegistry[p.key] || PROVIDER_MODELS[p.key];
                            const isCurrent = effectiveProvider === p.key;
                            return (
                                <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(p.key);
                                        onProviderChange(p.key);
                                        const defaultM = pCfg?.models?.[0]?.id || (p.key === 'chatgpt_web' ? 'Codex Astra 6.0 (Web)' : 'Codex Astra 6.0');
                                        onModelChange(defaultM);
                                    }}
                                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                        isCurrent
                                            ? 'bg-primary text-primary-foreground shadow-xs'
                                            : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* 2. Direct Instant Model List (No double-clicking required) */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground px-1">
                            <span>{providerConfig.label} 사용 가능한 모델</span>
                            {providerAccountLabel && (
                                <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full font-mono truncate max-w-[140px]">
                                    {providerAccountLabel}
                                </span>
                            )}
                        </div>

                        <div className="p-1 rounded-xl border border-border/60 bg-muted/20 max-h-52 overflow-y-auto space-y-1">
                            {providerConfig.models.map((m) => {
                                const isSelected = m.id === currentModel;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => {
                                            onProviderChange(effectiveProvider);
                                            onModelChange(m.id);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full p-2 rounded-lg text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                            isSelected 
                                                ? 'bg-primary text-primary-foreground font-bold shadow-xs' 
                                                : 'hover:bg-muted text-foreground'
                                        }`}
                                    >
                                        <div className="truncate pr-2">
                                            <div className="font-semibold truncate">{m.name}</div>
                                            <div className={`text-[10.5px] truncate ${isSelected ? 'text-primary-foreground/85' : 'text-muted-foreground'}`}>
                                                {m.desc}
                                            </div>
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 shrink-0 text-primary-foreground" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Reasoning Effort Slider Section (Exact Match to Image 3) */}
                    <div className="space-y-2 pt-2 border-t border-border/60">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                                <Sliders className="w-3.5 h-3.5 text-primary" />
                                추론 강도 (Reasoning Effort)
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                                {effortLabel}
                            </span>
                        </div>

                        {/* Interactive Slider Track with Tick Dots */}
                        <div className="pt-2 pb-1 px-1">
                            <div className="relative flex items-center">
                                {/* Background Line */}
                                <div className="absolute left-0 right-0 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary transition-all duration-200 rounded-full"
                                        style={{ width: `${(activeEffortIndex / (EFFORT_STEPS.length - 1)) * 100}%` }}
                                    />
                                </div>

                                {/* Clickable Tick Dots */}
                                <div className="relative w-full flex justify-between items-center z-10">
                                    {EFFORT_STEPS.map((step, idx) => {
                                        const isReached = idx <= activeEffortIndex;
                                        const isCurrent = idx === activeEffortIndex;
                                        return (
                                            <button
                                                key={step.key}
                                                type="button"
                                                onClick={() => onEffortChange(step.key)}
                                                className="group flex flex-col items-center focus:outline-hidden"
                                                title={`${step.label}: ${step.desc}`}
                                            >
                                                <div 
                                                    className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                                                        isCurrent
                                                            ? 'bg-background border-primary scale-125 shadow-md ring-2 ring-primary/30'
                                                            : isReached
                                                            ? 'bg-primary border-primary'
                                                            : 'bg-card border-muted-foreground/40 hover:border-foreground'
                                                    }`}
                                                >
                                                    {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Tick Labels */}
                            <div className="flex justify-between items-center mt-2.5 px-0.5 text-[11px] font-medium text-muted-foreground">
                                {EFFORT_STEPS.map((step, idx) => {
                                    const isCurrent = idx === activeEffortIndex;
                                    return (
                                        <button
                                            key={step.key}
                                            type="button"
                                            onClick={() => onEffortChange(step.key)}
                                            className={`transition-colors hover:text-foreground text-center ${
                                                isCurrent ? 'font-bold text-foreground scale-105' : ''
                                            }`}
                                        >
                                            {step.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer Guide Hint */}
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            <span>선택한 AI가 즉시 작업실에 연동됩니다.</span>
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground/70">100% 직접 호출</span>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
