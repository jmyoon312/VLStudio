import React, { useState, useRef, useEffect } from 'react';
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
    currentProvider: string;
    currentModel: string;
    currentEffort: ReasoningEffort;
    onModelChange: (model: string) => void;
    onEffortChange: (effort: ReasoningEffort) => void;
    onProviderChange: (provider: string) => void;
    providerAccountLabel?: string;
}

const PROVIDER_MODELS: Record<string, { label: string; hasAccount: boolean; models: { id: string; name: string; desc: string }[] }> = {
    codex: {
        label: 'OpenAI Codex',
        hasAccount: true,
        models: [
            { id: 'Codex Astra 6.0', name: 'Codex Astra 6.0 (기본 · 플래그십)', desc: '자율 디렉팅, 3초 훅 설계 및 최상위 심층 추론 (Codex CLI 직결)' },
            { id: 'GPT-5.6 Sol High', name: 'GPT-5.6 Sol High (고속·초정밀)', desc: '초고속 멀티모달 분석 및 타임코드 대본' },
            { id: 'GPT-5.6 Sol Medium', name: 'GPT-5.6 Sol Medium (밸런스)', desc: '경량 밸런스형 실시간 아이디어 발굴' },
            { id: 'GPT-5.6 Terra Max', name: 'GPT-5.6 Terra Max (심층 기획)', desc: '장편 시나리오 구조화 및 캐릭터 톤앤매너' },
        ]
    },
    chatgpt_web: {
        label: 'ChatGPT Web',
        hasAccount: true,
        models: [
            { id: 'Codex Astra 6.0 (Web)', name: 'Codex Astra 6.0 (Web 세션)', desc: 'ChatGPT Web 세션 기반 Astra 추론 (토큰 한도 확보)' },
            { id: 'GPT-5.6 Sol (Web)', name: 'GPT-5.6 Sol (Web 세션)', desc: 'ChatGPT Web 쿼터 활용 · 5시간/주간 슬라이딩 윈도우' },
            { id: 'GPT-5.6 Pro (Web)', name: 'GPT-5.6 Pro (Web 세션)', desc: 'ChatGPT Pro Web 고용량 토큰 연동' },
            { id: 'ChatGPT-4o (Web)', name: 'ChatGPT-4o (Web 세션)', desc: 'ChatGPT Web 4o 엔진 기반 다목적 생성' },
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
        hasAccount: false,
        models: [
            { id: 'Claude 3.7 Sonnet', name: 'Claude 3.7 Sonnet (Hybrid)', desc: '미등록 (계정/API 키 등록 필요)' },
            { id: 'Claude 3.5 Sonnet', name: 'Claude 3.5 Sonnet', desc: '미등록 (계정/API 키 등록 필요)' },
            { id: 'Claude 3.5 Haiku', name: 'Claude 3.5 Haiku', desc: '미등록 (계정/API 키 등록 필요)' },
        ]
    },
    grok: {
        label: 'xAI Grok',
        hasAccount: false,
        models: [
            { id: 'Grok 3 Reasoning', name: 'Grok 3 Reasoning Beta', desc: '미등록 (계정/API 키 등록 필요)' },
            { id: 'Grok 3 Mini', name: 'Grok 3 Mini', desc: '미등록 (계정/API 키 등록 필요)' },
            { id: 'Grok 2', name: 'Grok 2 Vision', desc: '미등록 (계정/API 키 등록 필요)' },
        ]
    }
};

const EFFORT_STEPS: { key: ReasoningEffort; label: string; desc: string }[] = [
    { key: 'light', label: 'Light', desc: '빠른 응답' },
    { key: 'medium', label: '보통', desc: '표준 추론' },
    { key: 'deep', label: '깊음', desc: '심층 비전' },
    { key: 'ultra', label: '초정밀', desc: '프레임 단위' },
];

export const ModelSelectorPopover: React.FC<ModelSelectorPopoverProps> = ({
    currentProvider,
    currentModel,
    currentEffort,
    onModelChange,
    onEffortChange,
    onProviderChange,
    providerAccountLabel
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showModelList, setShowModelList] = useState(false);
    const [dynamicRegistry, setDynamicRegistry] = useState<typeof PROVIDER_MODELS>(PROVIDER_MODELS);
    const popoverRef = useRef<HTMLDivElement>(null);

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

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setShowModelList(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const activeEffortIndex = EFFORT_STEPS.findIndex(s => s.key === currentEffort);
    const effortLabel = EFFORT_STEPS[activeEffortIndex >= 0 ? activeEffortIndex : 1].label;
    const effectiveProvider = currentProvider || 'codex';
    const providerConfig = dynamicRegistry[effectiveProvider] || dynamicRegistry['codex'] || PROVIDER_MODELS['codex'];

    return (
        <div className="relative inline-block" ref={popoverRef}>
            {/* Popover Trigger Button: matches Image 3 */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`h-8 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
                    isOpen 
                        ? 'bg-muted border-primary/60 text-foreground ring-2 ring-primary/20' 
                        : 'bg-card border-border/80 text-foreground hover:border-primary/40 hover:bg-muted/50'
                }`}
                title="AI 모델 및 추론 강도 조절"
            >
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="font-bold truncate max-w-[130px] sm:max-w-[160px]">{currentModel}</span>
                <span className="text-[11px] text-muted-foreground font-normal">· {effortLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Popover Card (matching Image 3: media_1790191049174.png) */}
            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-[340px] sm:w-[360px] rounded-2xl bg-card border border-border/90 shadow-2xl p-4 z-50 text-foreground animate-in fade-in zoom-in-95 duration-150 space-y-4">
                    
                    {/* Header Row: Model Switcher */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                {providerConfig.label} 지능 모델
                            </span>
                            {providerAccountLabel && (
                                <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full font-mono truncate max-w-[150px]">
                                    {providerAccountLabel}
                                </span>
                            )}
                        </div>

                        {/* Clickable Header Bar: ⚡ {ModelName} > */}
                        <button
                            type="button"
                            onClick={() => setShowModelList(!showModelList)}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border/70 hover:border-primary/50 bg-muted/20 hover:bg-muted/50 transition-all text-left group"
                        >
                            <div className="flex items-center gap-2 truncate">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                    <Zap className="w-4 h-4 fill-amber-500" />
                                </div>
                                <div className="truncate">
                                    <div className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                        {currentModel}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                        클릭하여 다른 모델 선택
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform ${showModelList ? 'rotate-90' : ''}`} />
                        </button>
                    </div>

                    {/* Expandable Model Selection List */}
                    {showModelList && (
                        <div className="p-1 rounded-xl border border-border/60 bg-muted/30 max-h-48 overflow-y-auto space-y-1">
                            {providerConfig.models.map((m) => {
                                const isSelected = m.id === currentModel;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => {
                                            onModelChange(m.id);
                                            setShowModelList(false);
                                        }}
                                        className={`w-full p-2 rounded-lg text-left text-xs transition-colors flex items-center justify-between ${
                                            isSelected 
                                                ? 'bg-primary text-primary-foreground font-bold shadow-xs' 
                                                : 'hover:bg-muted text-foreground'
                                        }`}
                                    >
                                        <div className="truncate">
                                            <div className="font-semibold truncate">{m.name}</div>
                                            <div className={`text-[10px] truncate ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                                {m.desc}
                                            </div>
                                        </div>
                                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-2" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

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

                    {/* Footer Provider Quick Switch Pills */}
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-semibold">사용 가능한 AI:</span>
                        <div className="flex items-center gap-1">
                            {[
                                { key: 'codex', label: 'Codex' },
                                { key: 'chatgpt_web', label: 'ChatGPT Web' },
                                { key: 'gemini', label: 'Gemini (공식)' },
                                { key: 'omniroute', label: 'OmniRoute' },
                                { key: 'claude', label: 'Claude (미등록)' },
                                { key: 'grok', label: 'Grok (미등록)' },
                            ].map((p) => {
                                const pCfg = dynamicRegistry[p.key] || PROVIDER_MODELS[p.key];
                                const hasAcc = pCfg?.hasAccount ?? true;
                                const isCurrent = currentProvider === p.key;
                                return (
                                    <button
                                        key={p.key}
                                        type="button"
                                        disabled={!hasAcc}
                                        onClick={() => {
                                            if (!hasAcc) return;
                                            onProviderChange(p.key);
                                            const defaultM = pCfg?.models?.[0]?.id || (p.key === 'chatgpt_web' ? 'Codex Astra 6.0 (Web)' : 'Codex Astra 6.0');
                                            onModelChange(defaultM);
                                        }}
                                        title={hasAcc ? `${p.label} 선택` : '현재 등록된 계정 또는 API 키가 없습니다. 설정에서 키를 등록해 주세요.'}
                                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                                            !hasAcc
                                                ? 'opacity-40 cursor-not-allowed bg-muted/20 text-muted-foreground line-through'
                                                : isCurrent
                                                ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                                                : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer'
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
