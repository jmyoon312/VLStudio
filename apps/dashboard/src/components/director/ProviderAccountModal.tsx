import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
    Plus, 
    Key, 
    MoreHorizontal, 
    Check, 
    Trash2, 
    RefreshCw, 
    ExternalLink, 
    Clock, 
    Zap, 
    Layers,
    Cpu,
    Calendar,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export interface ProviderQuotaInfo {
    id: string;
    email: string;
    plan: string;
    is_active: boolean;
    quotas?: {
        window_5h: { used_pct: number; reset_in: string };
        window_weekly: { used_pct: number; reset_in: string };
    };
}

export interface ProviderData {
    name: string;
    type: string;
    connected: boolean;
    has_api_key?: boolean;
    active_plan?: string;
    description?: string;
    port?: number;
    models_count?: number;
    accounts: ProviderQuotaInfo[];
}

interface ProviderAccountModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    providerKey: string; // 'omniroute' | 'openai' | 'gemini' | 'claude' | 'grok'
    onAccountsChanged?: () => void;
}

export const ProviderAccountModal: React.FC<ProviderAccountModalProps> = ({
    open,
    onOpenChange,
    providerKey,
    onAccountsChanged,
}) => {
    const [providerData, setProviderData] = useState<ProviderData | null>(null);
    const [loading, setLoading] = useState(false);
    const [showAddAccount, setShowAddAccount] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newPlan, setNewPlan] = useState('Plus');
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);
    const [apiKey, setApiKey] = useState('');

    const isChatGptEcosystem = ['openai', 'codex', 'chatgpt_web'].includes(providerKey);
    const [activeProviderKey, setActiveProviderKey] = useState<string>(providerKey);

    useEffect(() => {
        setActiveProviderKey(providerKey);
    }, [providerKey]);

    const fetchProviderInfo = async (targetKey = activeProviderKey) => {
        setLoading(true);
        try {
            const res = await fetch('/api/ai-accounts');
            if (res.ok) {
                const allProviders = await res.json();
                if (allProviders[targetKey]) {
                    setProviderData(allProviders[targetKey]);
                }
            }
        } catch (e) {
            console.error('Failed to fetch provider account:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && activeProviderKey) {
            fetchProviderInfo(activeProviderKey);
            setShowAddAccount(false);
            setShowApiKeyInput(false);
        }
    }, [open, activeProviderKey]);

    const handleSwitchAccount = async (accountId: string) => {
        try {
            const res = await fetch(`/api/ai-accounts/${activeProviderKey}/switch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_id: accountId }),
            });
            if (res.ok) {
                toast.success('활성 계정이 성공적으로 변경되었습니다.');
                fetchProviderInfo(activeProviderKey);
                onAccountsChanged?.();
            }
        } catch (e) {
            toast.error('계정 전환에 실패했습니다.');
        }
    };

    const handleAddAccount = async () => {
        if (!newEmail.trim()) {
            toast.error('이메일을 입력해 주세요.');
            return;
        }
        try {
            const res = await fetch(`/api/ai-accounts/${activeProviderKey}/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail.trim(), plan: newPlan }),
            });
            if (res.ok) {
                toast.success(`새 ${providerData?.name || ''} 계정이 연결되었습니다.`);
                setNewEmail('');
                setShowAddAccount(false);
                fetchProviderInfo(activeProviderKey);
                onAccountsChanged?.();
            }
        } catch (e) {
            toast.error('계정 추가에 실패했습니다.');
        }
    };

    const handleSaveApiKey = async () => {
        if (!apiKey.trim()) {
            toast.error('API 키를 입력해 주세요.');
            return;
        }
        try {
            const res = await fetch(`/api/ai-accounts/${activeProviderKey}/api-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: apiKey.trim() }),
            });
            if (res.ok) {
                toast.success(`${providerData?.name || ''} API 키가 저장되었습니다.`);
                setApiKey('');
                setShowApiKeyInput(false);
                fetchProviderInfo(activeProviderKey);
                onAccountsChanged?.();
            }
        } catch (e) {
            toast.error('API 키 저장 실패');
        }
    };

    const handleWebLogin = async () => {
        if (activeProviderKey === 'chatgpt_web') {
            window.open('https://chatgpt.com', '_blank');
            return;
        }
        try {
            const res = await fetch(`/api/ai-accounts/${activeProviderKey}/web-login`, {
                method: 'POST',
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || '인증 프로세스가 시작되었습니다.');
                setTimeout(() => {
                    fetchProviderInfo(activeProviderKey);
                    onAccountsChanged?.();
                }, 2500);
            } else {
                toast.error(data.detail || '웹 로그인 실행 실패');
            }
        } catch (e) {
            toast.error('웹 로그인 호출 중 오류가 발생했습니다.');
        }
    };

    const handleRefreshSessions = async () => {
        try {
            const res = await fetch('/api/ai-accounts/refresh-sessions', {
                method: 'POST',
            });
            if (res.ok) {
                toast.success('로컬 AI 세션 동기화 완료');
                fetchProviderInfo(activeProviderKey);
                onAccountsChanged?.();
            }
        } catch (e) {
            toast.error('세션 동기화 실패');
        }
    };

    const handleDeleteAccount = async (accountId: string) => {
        try {
            const res = await fetch(`/api/ai-accounts/${activeProviderKey}/${accountId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                toast.success('계정 연결이 해제되었습니다.');
                fetchProviderInfo(activeProviderKey);
                onAccountsChanged?.();
            }
        } catch (e) {
            toast.error('계정 삭제 실패');
        }
    };

    if (!providerData) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[88vh] flex flex-col p-6 bg-card border-border/80 shadow-2xl rounded-2xl text-foreground">
                <DialogHeader className="space-y-1 shrink-0 pb-2 border-b border-border/60">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                {activeProviderKey === 'omniroute' ? <Cpu className="w-4 h-4" /> : providerData.name[0]}
                            </div>
                            <DialogTitle className="text-lg font-bold text-foreground">
                                {providerData.name} 계정 및 토큰 한도
                            </DialogTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefreshSessions}
                            className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                            title="로컬 AI 세션 동기화"
                        >
                            <RefreshCw className="w-3 h-3" />
                            새로고침
                        </Button>
                    </div>

                    {/* Segmented 2-Way Selector for OpenAI Ecosystem (Codex CLI vs ChatGPT Web) */}
                    {isChatGptEcosystem && (
                        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl mt-2 border border-border/60">
                            {[
                                { key: 'codex', label: '⚡ Codex CLI (Astra)', desc: 'ChatGPT Plus 웹 세션' },
                                { key: 'chatgpt_web', label: '🌐 ChatGPT Web (웹 쿼터)', desc: '공식 플랜 한도 공유' },
                            ].map((sub) => (
                                <button
                                    key={sub.key}
                                    type="button"
                                    onClick={() => {
                                        setActiveProviderKey(sub.key);
                                        fetchProviderInfo(sub.key);
                                    }}
                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                                        activeProviderKey === sub.key
                                            ? 'bg-background text-foreground shadow-xs ring-1 ring-border'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                                    }`}
                                >
                                    {sub.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                        {activeProviderKey === 'omniroute'
                            ? '로컬 포트 20128 스마트 콤보 라우터입니다. 외부 API 요금 없이 무제한으로 비전 및 고품질 생성을 지원합니다.'
                            : activeProviderKey === 'chatgpt_web'
                            ? 'OpenAI 공식 ChatGPT Web (chatgpt.com) 세션 연동입니다. 일반 웹 대화는 Codex 쿼터에 포함되지 않는 독립적인 Plus 롤링 정책(3시간당 메시지 한도)을 따릅니다.'
                            : activeProviderKey === 'codex'
                            ? '공식 OpenAI Codex CLI OAuth 세션 연동입니다. Codex Astra 6.0의 Thinking Engine(심층 추론 엔진)을 직접 구동하며 5시간/주간 슬라이딩 윈도우 쿼터를 적용받습니다.'
                            : activeProviderKey === 'gemini'
                            ? 'Google Gemini 및 Antigravity 계정을 연결하여 사용할 수 있습니다. Gemini Advanced 및 Antigravity 2.0 구독 계정을 등록하여 스마트하게 전환할 수 있습니다.'
                            : activeProviderKey === 'claude'
                            ? 'Anthropic Claude 계정을 연결하여 사용할 수 있습니다. Claude Code 및 Claude Pro/Team 계정을 등록하여 스마트하게 전환할 수 있습니다.'
                            : activeProviderKey === 'grok'
                            ? 'xAI Grok 계정을 연결하여 사용할 수 있습니다. Grok 3 및 SuperGrok 계정을 등록하여 스마트하게 전환할 수 있습니다.'
                            : 'OpenAI ChatGPT 계정을 연결하여 사용할 수 있습니다. ChatGPT Plus/Pro 계정을 등록하여 스마트하게 전환할 수 있습니다.'}
                    </DialogDescription>
                </DialogHeader>

                {/* Primary Web Login Action Bar */}
                <div className="mt-3 flex items-center gap-2">
                    <Button
                        size="sm"
                        onClick={handleWebLogin}
                        className="flex-1 h-8.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {activeProviderKey === 'chatgpt_web'
                            ? '공식 ChatGPT Web 열기 (chatgpt.com)'
                            : activeProviderKey === 'codex'
                            ? 'ChatGPT Codex 브라우저 로그인 연결'
                            : activeProviderKey === 'gemini'
                            ? 'Google Gemini 웹 인증 시작'
                            : activeProviderKey === 'claude'
                            ? 'Claude 웹/CLI 인증 시작'
                            : activeProviderKey === 'grok'
                            ? 'xAI Grok 웹/CLI 인증 시작'
                            : 'OmniRoute 대시보드 열기'}
                    </Button>
                </div>

                {/* Account Cards List with Safe Scroll Area */}
                <div className="space-y-3 mt-3 flex-1 overflow-y-auto max-h-[50vh] pr-1.5 scrollbar-thin">
                    {providerData.accounts.length === 0 ? (
                        <div className="py-8 text-center border border-dashed border-border rounded-xl">
                            <p className="text-xs text-muted-foreground">연결된 계정이 없습니다.</p>
                            <p className="text-[11px] text-muted-foreground/70 mt-0.5">상단 [웹 로그인 연결] 버튼을 누르거나 직접 등록해 주세요.</p>
                        </div>
                    ) : (
                        providerData.accounts.map((acc) => {
                            const isPaid = acc.plan.toLowerCase().includes('plus') || 
                                           acc.plan.toLowerCase().includes('pro') || 
                                           acc.plan.toLowerCase().includes('antigravity') || 
                                           acc.plan.toLowerCase().includes('advanced') ||
                                           acc.plan.toLowerCase().includes('team') ||
                                           acc.plan.toLowerCase().includes('google');

                            const w5hUsed = acc.quotas?.window_5h.used_pct ?? 19;
                            const w5hRemain = (acc.quotas?.window_5h as any)?.remain_pct ?? Math.max(0, 100 - w5hUsed);
                            const wWkUsed = acc.quotas?.window_weekly.used_pct ?? 89;
                            const wWkRemain = (acc.quotas?.window_weekly as any)?.remain_pct ?? Math.max(0, 100 - wWkUsed);

                            return (
                                <div
                                    key={acc.id}
                                    className={`p-4 rounded-xl border transition-all ${
                                        acc.is_active
                                            ? 'bg-primary/5 border-primary ring-2 ring-primary/30 shadow-xs'
                                            : 'bg-card border-border/70 hover:border-border/90'
                                    }`}
                                >
                                    {/* Card Top: Email & Switch/Delete Buttons */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-xs font-bold text-foreground truncate" title={acc.email}>
                                                {acc.email}
                                            </span>
                                            {acc.is_active && (
                                                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-2 py-0.5 font-bold flex items-center gap-1 shadow-2xs shrink-0">
                                                    <Check className="w-3 h-3 stroke-[3]" /> 현재 활성 계정
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {!acc.is_active && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleSwitchAccount(acc.id)}
                                                    className="h-7 px-2.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary hover:bg-primary/5 cursor-pointer"
                                                >
                                                    이 계정으로 전환
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Subline: Plan Badge & Shared Quota Note */}
                                    <div className="mt-1.5 flex items-center justify-between gap-2">
                                        <Badge 
                                            variant="secondary" 
                                            className={`text-[10px] px-2 py-0.5 font-bold flex items-center gap-1 ${
                                                isPaid 
                                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
                                                    : 'bg-muted text-muted-foreground border border-border'
                                            }`}
                                        >
                                            {isPaid ? `💎 유료 플랜 (${acc.plan})` : `🆓 무료 플랜 (${acc.plan || 'Free'})`}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground">
                                            {activeProviderKey === 'chatgpt_web' 
                                                ? 'ChatGPT Plus 대화 롤링 한도 (별도 정책)' 
                                                : 'Codex 에이전트 전용 한도 (5시간/주간)'}
                                        </span>
                                    </div>

                                    {/* ChatGPT Official Screen 1:1 Matched Quota Display */}
                                    {acc.quotas && (
                                        <div className="mt-3.5 space-y-3 pt-3 border-t border-border/40 text-[11px]">
                                            {/* 5-hour window */}
                                            <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-border/60">
                                                <div className="flex justify-between items-center text-xs">
                                                    <div>
                                                        <span className="font-bold text-foreground block">
                                                            5시간 한도
                                                        </span>
                                                        <span className="text-[10.5px] text-muted-foreground">
                                                            {acc.quotas.window_5h.reset_in}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm font-bold text-foreground">
                                                        {w5hRemain}% 남음
                                                    </span>
                                                </div>
                                                <div className="w-full bg-muted-foreground/20 rounded-full h-2 overflow-hidden mt-1">
                                                    <div 
                                                        className="h-full bg-primary transition-all rounded-full"
                                                        style={{ width: `${Math.min(w5hRemain, 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Weekly window */}
                                            <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-border/60">
                                                <div className="flex justify-between items-center text-xs">
                                                    <div>
                                                        <span className="font-bold text-foreground block">
                                                            주간 한도
                                                        </span>
                                                        <span className="text-[10.5px] text-muted-foreground">
                                                            {acc.quotas.window_weekly.reset_in}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm font-bold text-foreground">
                                                        {wWkRemain}% 남음
                                                    </span>
                                                </div>
                                                <div className="w-full bg-muted-foreground/20 rounded-full h-2 overflow-hidden mt-1">
                                                    <div 
                                                        className={`h-full transition-all rounded-full ${
                                                            wWkRemain < 20 ? 'bg-amber-500' : 'bg-primary'
                                                        }`}
                                                        style={{ width: `${Math.min(wWkRemain, 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Rate Limit Reset Status note matching Image 2 */}
                                            <div className="p-2.5 rounded-lg bg-background/60 border border-border/50 flex items-center justify-between text-[11px]">
                                                <span className="text-muted-foreground">전체 재설정 (주간 + 5시간)</span>
                                                <Badge variant="outline" className="text-[10px] font-semibold">
                                                    재설정 사용 가능: {(acc.quotas as any)?.reset_credits_count ?? 1}회
                                                </Badge>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Account Add Form Inline */}
                {showAddAccount && (
                    <div className="mt-3 p-3 rounded-xl border border-primary/30 bg-muted/20 space-y-2">
                        <span className="text-xs font-semibold text-foreground">새 계정 추가</span>
                        <Input
                            placeholder="구글/OpenAI 이메일 주소"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="h-8 text-xs bg-background"
                        />
                        <div className="flex items-center gap-2">
                            <select
                                value={newPlan}
                                onChange={(e) => setNewPlan(e.target.value)}
                                className="h-8 px-2 text-xs bg-background text-foreground border border-border rounded-md flex-1 focus:outline-hidden"
                            >
                                <option value="Plus">Plus 플랜</option>
                                <option value="Pro">Pro 플랜</option>
                                <option value="Antigravity">Antigravity 2.0</option>
                                <option value="Free">Free 플랜</option>
                            </select>
                            <Button size="sm" onClick={handleAddAccount} className="h-8 text-xs px-3">
                                등록
                            </Button>
                        </div>
                    </div>
                )}

                {/* API Key Form Inline */}
                {showApiKeyInput && (
                    <div className="mt-3 p-3 rounded-xl border border-primary/30 bg-muted/20 space-y-2">
                        <span className="text-xs font-semibold text-foreground">{providerData.name} API 키 등록</span>
                        <div className="flex items-center gap-2">
                            <Input
                                type="password"
                                placeholder="sk-... 또는 API 키 입력"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="h-8 text-xs bg-background flex-1"
                            />
                            <Button size="sm" onClick={handleSaveApiKey} className="h-8 text-xs px-3">
                                저장
                            </Button>
                        </div>
                    </div>
                )}

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    {activeProviderKey !== 'omniroute' && activeProviderKey !== 'chatgpt_web' && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setShowAddAccount(!showAddAccount);
                                setShowApiKeyInput(false);
                            }}
                            className="text-xs h-8 gap-1.5 border-border"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            계정 추가
                        </Button>
                    )}


                    {activeProviderKey !== 'omniroute' && activeProviderKey !== 'chatgpt_web' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setShowApiKeyInput(!showApiKeyInput);
                                setShowAddAccount(false);
                            }}
                            className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                        >
                            <Key className="w-3.5 h-3.5" />
                            {providerData.has_api_key ? 'API 키 변경' : `${providerData.name} API 키 사용`}
                        </Button>
                    )}

                    <Button
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="ml-auto text-xs h-8 px-4 font-semibold"
                    >
                        완료
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
