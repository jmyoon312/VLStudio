import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
    Plus, 
    Key, 
    Check, 
    Trash2, 
    RefreshCw, 
    ExternalLink, 
    Clock, 
    Zap, 
    Layers,
    Cpu,
    Calendar,
    AlertCircle,
    Search,
    FileText,
    CheckCircle2,
    ShieldCheck,
    Globe,
    Sparkles,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export interface ProviderQuotaInfo {
    id: string;
    email: string;
    plan: string;
    is_active: boolean;
    has_snapshot?: boolean;
    has_keyring?: boolean;
    engine?: string;
    auth_type?: string;
    quota_policy?: string;
    rotation_priority?: number;
    quotas?: {
        window_5h: { used_pct: number; reset_in: string };
        window_weekly: { used_pct: number; reset_in: string };
    };
}

export interface ApiKeyItem {
    id: string;
    key: string;
    masked: string;
    status: 'healthy' | 'cooldown' | 'invalid' | string;
    validation_message?: string;
    cooldown_until?: number;
    failure_count?: number;
    created_at?: number;
    last_tested_at?: number;
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
    providerKey: string; // 'omniroute' | 'openai' | 'gemini' | 'claude' | 'deepseek' | 'codex' | 'chatgpt_web'
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
    const [showBulkAddAccounts, setShowBulkAddAccounts] = useState(false);
    const [bulkEmailsText, setBulkEmailsText] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPlan, setNewPlan] = useState('유료 플랜 (Antigravity)');
    const [addAccountMode, setAddAccountMode] = useState<'browser' | 'json'>('browser');
    const [sessionJsonText, setSessionJsonText] = useState('');
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);
    const [showBulkApiKeys, setShowBulkApiKeys] = useState(false);
    const [bulkKeysText, setBulkKeysText] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Gemini 3-Tier Mode: 'tier1_antigravity' | 'tier2_aistudio' | 'tier3_web'
    const [geminiTier, setGeminiTier] = useState<'tier1_antigravity' | 'tier3_web'>('tier1_antigravity');
    const [apiKeysList, setApiKeysList] = useState<ApiKeyItem[]>([]);

    // Gemini Tier 3 Web Session States
    const [geminiWebSession, setGeminiWebSession] = useState<{
        connected: boolean;
        email?: string;
        secure_1psid_masked?: string;
        cookie_count?: number;
        updated_at?: string;
    } | null>(null);
    const [capturingWebSession, setCapturingWebSession] = useState(false);
    const [manualCookieInput, setManualCookieInput] = useState('');
    const [showManualCookieForm, setShowManualCookieForm] = useState(false);
    const [savingManualCookie, setSavingManualCookie] = useState(false);

    // OpenAI Codex & ChatGPT Web Independent Authentication States
    const [capturingCodexAuth, setCapturingCodexAuth] = useState(false);
    const [capturingChatGptWebSession, setCapturingChatGptWebSession] = useState(false);
    const [showManualCodexAuthForm, setShowManualCodexAuthForm] = useState(false);
    const [manualCodexAuthText, setManualCodexAuthText] = useState('');
    const [savingManualCodexAuth, setSavingManualCodexAuth] = useState(false);
    const [showManualChatGptCookieForm, setShowManualChatGptCookieForm] = useState(false);
    const [manualChatGptSessionToken, setManualChatGptSessionToken] = useState('');
    const [savingManualChatGptCookie, setSavingManualChatGptCookie] = useState(false);

    const [linkingDeepSeekEmail, setLinkingDeepSeekEmail] = useState<string | null>(null);

    // Flow (Media Batch Generation) Electron Profiles
    const [flowProfiles, setFlowProfiles] = useState<any[]>([]);

    const fetchFlowProfiles = async () => {
        try {
            if ((window as any).electronAPI?.loadProfiles) {
                const config = await (window as any).electronAPI.loadProfiles();
                if (config && config.profiles) {
                    setFlowProfiles(config.profiles);
                }
            }
        } catch (e) {
            console.warn('Failed to load Flow profiles:', e);
        }
    };

    const isChatGptEcosystem = ['openai', 'codex', 'chatgpt_web'].includes(providerKey);
    const [activeProviderKey, setActiveProviderKey] = useState<string>(providerKey);

    useEffect(() => {
        setActiveProviderKey(providerKey);
        if (providerKey === 'deepseek') {
            setProviderData({
                name: 'DeepSeek',
                type: 'cloud_provider',
                connected: false,
                active_plan: 'DeepSeek Web',
                description: 'DeepSeek Web 계정 (V3 및 R1 추론)',
                accounts: []
            });
        }
    }, [providerKey]);

    const fetchProviderInfo = async (targetKey = activeProviderKey) => {
        setLoading(true);
        try {
            const res = await fetch('/api/ai-accounts');
            if (res.ok) {
                const allProviders = await res.json();
                if (allProviders[targetKey]) {
                    setProviderData(allProviders[targetKey]);
                } else if (targetKey === 'deepseek') {
                    setProviderData(prev => prev || {
                        name: 'DeepSeek',
                        type: 'cloud_provider',
                        connected: false,
                        active_plan: 'DeepSeek Web',
                        description: 'DeepSeek Web 계정 (V3 및 R1 추론)',
                        accounts: []
                    });
                }
            }
        } catch (e) {
            console.error('Failed to fetch provider account:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchApiKeysList = async () => {
        try {
            const res = await fetch('/api/ai-accounts/gemini/keys');
            if (res.ok) {
                const data = await res.json();
                setApiKeysList(data.keys || []);
            }
        } catch (e) {
            console.error('Failed to fetch API keys:', e);
        }
    };

    const fetchGeminiWebSession = async () => {
        try {
            if ((window as any).electronAPI?.getGeminiWebStatus) {
                const status = await (window as any).electronAPI.getGeminiWebStatus();
                if (status && status.connected) {
                    setGeminiWebSession({
                        connected: true,
                        email: status.email,
                        secure_1psid_masked: status.secure1psidMasked,
                        cookie_count: status.cookieCount,
                        updated_at: status.updatedAt,
                    });
                    return;
                }
            }
            const res = await fetch('/api/ai-accounts/gemini/web-session');
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'success' && data.connected) {
                    setGeminiWebSession(data);
                } else {
                    setGeminiWebSession(null);
                }
            }
        } catch (e) {
            console.error('Failed to fetch gemini web session:', e);
        }
    };

    useEffect(() => {
        if (open && activeProviderKey) {
            fetchProviderInfo(activeProviderKey);
            fetchFlowProfiles();
            if (activeProviderKey === 'gemini') {
                fetchApiKeysList();
                fetchGeminiWebSession();
            }
            setShowAddAccount(false);
            setShowBulkAddAccounts(false);
            setShowApiKeyInput(false);
            setShowBulkApiKeys(false);
            setSearchQuery('');
        }
    }, [open, activeProviderKey, geminiTier]);

    const handleStartGeminiWebLogin = async (emailHint?: string) => {
        setCapturingWebSession(true);
        try {
            const electronAPI = (window as any).electronAPI;
            // 1. Electron 환경: 미디어 일괄 생성과 동일한 Electron 독립 세션/프로필 네이티브 연동
            if (electronAPI?.openGeminiWebLogin) {
                const targetHint = emailHint || newEmail.trim() || undefined;
                const result = await electronAPI.openGeminiWebLogin(targetHint);
                if (result?.success) {
                    toast.success(result.message || 'Google Gemini 웹 세션이 성공적으로 연동되었습니다!');
                    setShowAddAccount(false);
                    await fetchGeminiWebSession();
                    fetchProviderInfo(activeProviderKey);
                    onAccountsChanged?.();
                    return;
                } else if (result?.message && !result.message.includes('창이 닫혔습니다')) {
                    toast.error(result.message);
                }
            } else {
                // 2. 웹 브라우저 환경: 백엔드 CloakBrowser 스텔스 엔진 호출
                const res = await fetch('/api/ai-accounts/gemini/launch-stealth-browser', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: 'https://gemini.google.com',
                        email: emailHint || newEmail.trim() || undefined
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    toast.success('🛡️ 스텔스 보안 브라우저가 실행되었습니다. Google 계정으로 로그인해 주세요. (작업표시줄 확인)');
                    setShowAddAccount(false);
                    let attempts = 0;
                    const pollInterval = setInterval(async () => {
                        attempts++;
                        await fetchGeminiWebSession();
                        fetchProviderInfo(activeProviderKey);
                        if (attempts > 30) clearInterval(pollInterval);
                    }, 3000);
                } else {
                    toast.error(data.detail || '스텔스 브라우저 실행 실패');
                }
            }
        } catch (e: any) {
            toast.error('로그인 실행 오류: ' + (e.message || ''));
        } finally {
            setCapturingWebSession(false);
        }
    };


    const [issuingKeyForEmail, setIssuingKeyForEmail] = useState<string | null>(null);
    const [linkingAntigravityEmail, setLinkingAntigravityEmail] = useState<string | null>(null);
    const [batchLinkingAntigravity, setBatchLinkingAntigravity] = useState(false);
    const [batchLinkingProgress, setBatchLinkingProgress] = useState<{ current: number; total: number; email: string } | null>(null);

    const handleStartAntigravityOAuth = async (emailHint?: string) => {
        setLinkingAntigravityEmail(emailHint || 'all');
        try {
            const electronAPI = (window as any).electronAPI;
            if (electronAPI?.openAntigravityOAuth) {
                toast.info(`'${emailHint || 'Google 계정'}' Antigravity OAuth 창을 실행합니다...`);
                const result = await electronAPI.openAntigravityOAuth(emailHint || undefined);
                if (result?.success) {
                    toast.success(result.message || `'${emailHint}' Antigravity 독립 세션 연동 성공!`);
                    await fetchProviderInfo(activeProviderKey);
                    onAccountsChanged?.();
                    return;
                } else if (result?.message && !result.message.includes('창이 완료되기 전에 닫혔습니다')) {
                    toast.error(result.message);
                }
            } else {
                const res = await fetch('/api/ai-accounts/gemini/antigravity-auth-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailHint || undefined })
                });
                const data = await res.json();
                if (data?.url) {
                    window.open(data.url, '_blank');
                    toast.success('브라우저에서 Antigravity 인증 페이지가 열렸습니다.');
                }
            }
        } catch (e: any) {
            toast.error('Antigravity OAuth 실행 오류: ' + (e.message || ''));
        } finally {
            setLinkingAntigravityEmail(null);
        }
    };

    const handleBatchLinkAntigravity = async () => {
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI?.openAntigravityOAuth) {
            toast.error('Electron 데스크톱 환경에서만 일괄 연동을 실행할 수 있습니다.');
            return;
        }
        const accountsToLink = providerData?.accounts || [];
        if (accountsToLink.length === 0) {
            toast.error('등록된 계정이 없습니다.');
            return;
        }
        setBatchLinkingAntigravity(true);
        let successCount = 0;
        try {
            for (let i = 0; i < accountsToLink.length; i++) {
                const acc = accountsToLink[i];
                setBatchLinkingProgress({ current: i + 1, total: accountsToLink.length, email: acc.email });
                toast.info(`[${i + 1}/${accountsToLink.length}] '${acc.email}' Antigravity 독립 세션 연동 중...`);
                const res = await electronAPI.openAntigravityOAuth(acc.email);
                if (res?.success) {
                    successCount++;
                    toast.success(`'${acc.email}' Antigravity 독립 세션 연동 완료!`);
                } else {
                    toast.warning(`'${acc.email}' 연동 건너뜀: ${res?.message || '창 닫힘'}`);
                }
                await fetchProviderInfo(activeProviderKey);
            }
            toast.success(`🎉 전체 Antigravity 연동 완료: 총 ${successCount}개 계정 연동 성공!`);
        } catch (e: any) {
            toast.error(`일괄 연동 오류: ${e.message}`);
        } finally {
            setBatchLinkingAntigravity(false);
            setBatchLinkingProgress(null);
            await fetchProviderInfo(activeProviderKey);
            onAccountsChanged?.();
        }
    };

    const handleOpenAiStudioWindow = async (emailHint?: string) => {
        setIssuingKeyForEmail(emailHint || 'all');
        try {
            const electronAPI = (window as any).electronAPI;
            // 1. Electron 환경: 미디어 일괄 생성과 동일한 Electron 네이티브 세션 창 실행
            if (electronAPI?.openAiStudioKeyWindow) {
                const result = await electronAPI.openAiStudioKeyWindow(emailHint || undefined);
                if (result?.success) {
                    toast.success(result.message || 'Google AI Studio API 키가 성공적으로 연동되었습니다!');
                    await fetchApiKeysList();
                    fetchProviderInfo(activeProviderKey);
                    onAccountsChanged?.();
                    return;
                } else if (result?.message && !result.message.includes('창이 닫혔습니다')) {
                    toast.error(result.message);
                }
            } else {
                // 2. 웹 브라우저 환경: 백엔드 CloakBrowser 스텔스 엔진 호출
                const res = await fetch('/api/ai-accounts/gemini/launch-stealth-browser', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: 'https://aistudio.google.com/app/apikey',
                        email: emailHint || undefined
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    toast.success('🛡️ Google AI Studio 스텔스 브라우저가 실행되었습니다. [Create API Key] 생성 시 자동 연동됩니다. (작업표시줄 확인)');
                    let attempts = 0;
                    const pollInterval = setInterval(async () => {
                        attempts++;
                        await fetchApiKeysList();
                        fetchProviderInfo(activeProviderKey);
                        if (attempts > 30) clearInterval(pollInterval);
                    }, 3000);
                } else {
                    toast.error(data.detail || 'AI Studio 브라우저 실행 실패');
                }
            }
        } catch (e: any) {
            toast.error('AI Studio 발급 창 실행 오류: ' + (e.message || ''));
        } finally {
            setIssuingKeyForEmail(null);
        }
    };

    const handleSaveManualCookie = async () => {
        if (!manualCookieInput.trim()) {
            toast.error('__Secure-1PSID 쿠키 값을 입력해 주세요.');
            return;
        }
        setSavingManualCookie(true);
        try {
            const res = await fetch('/api/ai-accounts/gemini/web-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    secure_1psid: manualCookieInput.trim(),
                    email: newEmail.trim() || 'gemini_user@gmail.com'
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Google Gemini 웹 쿠키 세션이 등록되었습니다.');
                setManualCookieInput('');
                setShowManualCookieForm(false);
                await fetchGeminiWebSession();
                fetchProviderInfo(activeProviderKey);
                onAccountsChanged?.();
            } else {
                toast.error(data.detail || '쿠키 등록 실패');
            }
        } catch (e) {
            toast.error('쿠키 등록 중 오류가 발생했습니다.');
        } finally {
            setSavingManualCookie(false);
        }
    };

    const handleDeleteGeminiWebSession = async () => {
        try {
            if ((window as any).electronAPI?.clearGeminiWebSession) {
                await (window as any).electronAPI.clearGeminiWebSession();
            }
            await fetch('/api/ai-accounts/gemini/web-session', { method: 'DELETE' });
            toast.success('Google Gemini 웹 세션이 초기화되었습니다.');
            setGeminiWebSession(null);
            fetchProviderInfo(activeProviderKey);
            onAccountsChanged?.();
        } catch (e) {
            toast.error('세션 초기화 실패');
        }
    };

    const handleStartCodexLogin = async (emailHint?: string) => {
        setCapturingCodexAuth(true);
        try {
            const electronAPI = (window as any).electronAPI;
            if (electronAPI?.openCodexLogin) {
                toast.info('OpenAI Codex CLI OAuth 브라우저 로그인 창을 실행합니다...');
                const result = await electronAPI.openCodexLogin(emailHint || newEmail.trim() || undefined);
                if (result?.success) {
                    toast.success(result.message || 'OpenAI Codex OAuth 세션이 성공적으로 연동되었습니다!');
                    setShowAddAccount(false);
                    await fetchProviderInfo(activeProviderKey);
                    onAccountsChanged?.();
                    return;
                } else if (result?.message && !result.message.includes('창이 완료되기 전에 닫혔습니다') && !result.message.includes('초과')) {
                    toast.error(result.message);
                } else if (result?.message) {
                    toast.warning(result.message);
                }
            } else {
                const res = await fetch('/api/ai-accounts/codex/web-login', {
                    method: 'POST'
                });
                const data = await res.json();
                if (res.ok) {
                    toast.success(data.message || 'OpenAI Codex 브라우저 로그인 창이 열렸습니다. (작업표시줄 확인)');
                    setShowAddAccount(false);
                    let attempts = 0;
                    const pollInterval = setInterval(async () => {
                        attempts++;
                        await fetchProviderInfo(activeProviderKey);
                        if (attempts > 30) clearInterval(pollInterval);
                    }, 3000);
                } else {
                    toast.error(data.detail || 'Codex 로그인 실행 실패');
                }
            }
        } catch (e: any) {
            toast.error('Codex 로그인 실행 오류: ' + (e.message || ''));
        } finally {
            setCapturingCodexAuth(false);
        }
    };

    const handleStartChatGptWebLogin = async (emailHint?: string) => {
        setCapturingChatGptWebSession(true);
        try {
            const electronAPI = (window as any).electronAPI;
            if (electronAPI?.openChatGPTWebLogin) {
                toast.info('ChatGPT Web 전용 세션 브라우저 창을 실행합니다...');
                const result = await electronAPI.openChatGPTWebLogin(emailHint || newEmail.trim() || undefined);
                if (result?.success) {
                    toast.success(result.message || 'ChatGPT Web 세션 쿠키가 성공적으로 연동되었습니다!');
                    setShowAddAccount(false);
                    await fetchProviderInfo(activeProviderKey);
                    onAccountsChanged?.();
                    return;
                } else if (result?.message && !result.message.includes('창이 완료 전에 닫혔습니다')) {
                    toast.error(result.message);
                } else if (result?.message) {
                    toast.warning(result.message);
                }
            } else {
                const res = await fetch('/api/ai-accounts/chatgpt-web/launch-stealth-browser', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: 'https://chatgpt.com',
                        email: emailHint || newEmail.trim() || undefined
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    toast.success('🛡️ 스텔스 보안 브라우저가 실행되었습니다. ChatGPT 계정으로 로그인해 주세요. (작업표시줄 확인)');
                    setShowAddAccount(false);
                    let attempts = 0;
                    const pollInterval = setInterval(async () => {
                        attempts++;
                        await fetchProviderInfo(activeProviderKey);
                        if (attempts > 30) clearInterval(pollInterval);
                    }, 3000);
                } else {
                    toast.error(data.detail || 'ChatGPT 브라우저 실행 실패');
                }
            }
        } catch (e: any) {
            toast.error('ChatGPT Web 로그인 실행 오류: ' + (e.message || ''));
        } finally {
            setCapturingChatGptWebSession(false);
        }
    };

    const handleImportCodexAuth = async () => {
        if (!newEmail.trim()) {
            toast.error('계정 이메일을 입력해 주세요.');
            return;
        }
        if (!manualCodexAuthText.trim()) {
            toast.error('auth.json 내용을 입력해 주세요.');
            return;
        }
        setSavingManualCodexAuth(true);
        try {
            const res = await fetch('/api/ai-accounts/codex/import-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newEmail.trim(),
                    auth_json: manualCodexAuthText.trim(),
                    plan: newPlan
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Codex OAuth 인증 정보가 등록되었습니다.');
                setManualCodexAuthText('');
                setShowManualCodexAuthForm(false);
                await fetchProviderInfo(activeProviderKey);
                onAccountsChanged?.();
            } else {
                toast.error(data.detail || 'Codex auth.json 등록 실패');
            }
        } catch (e) {
            toast.error('인증 정보 등록 중 오류가 발생했습니다.');
        } finally {
            setSavingManualCodexAuth(false);
        }
    };

    const handleSaveManualChatGptCookie = async () => {
        if (!newEmail.trim()) {
            toast.error('계정 이메일을 입력해 주세요.');
            return;
        }
        if (!manualChatGptSessionToken.trim()) {
            toast.error('세션 토큰(__Secure-next-auth.session-token)을 입력해 주세요.');
            return;
        }
        setSavingManualChatGptCookie(true);
        try {
            const res = await fetch('/api/ai-accounts/chatgpt-web/web-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newEmail.trim(),
                    session_token: manualChatGptSessionToken.trim(),
                    plan: newPlan
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'ChatGPT Web 세션 쿠키가 등록되었습니다.');
                setManualChatGptSessionToken('');
                setShowManualChatGptCookieForm(false);
                await fetchProviderInfo(activeProviderKey);
                onAccountsChanged?.();
            } else {
                toast.error(data.detail || '세션 쿠키 등록 실패');
            }
        } catch (e) {
            toast.error('세션 쿠키 등록 중 오류가 발생했습니다.');
        } finally {
            setSavingManualChatGptCookie(false);
        }
    };


    const [validatingKeys, setValidatingKeys] = useState(false);
    const [savingSnapshot, setSavingSnapshot] = useState(false);
    const [syncingKeyring, setSyncingKeyring] = useState(false);

    const handleSyncKeyring = async () => {
        setSyncingKeyring(true);
        try {
            const res = await fetch('/api/ai-accounts/gemini/sync-keyring', {
                method: 'POST',
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.result?.message || 'Windows Keyring(Antigravity) 세션이 성공적으로 동기화되었습니다.');
                fetchProviderInfo(activeProviderKey);
                onAccountsChanged?.();
            } else {
                toast.error(data.detail || 'Keyring 세션 동기화 실패');
            }
        } catch (e) {
            toast.error('Keyring 세션 동기화 중 오류가 발생했습니다.');
        } finally {
            setSyncingKeyring(false);
        }
    };

    const handleSwitchAccount = async (accountId: string) => {
        try {
            const res = await fetch(`/api/ai-accounts/${activeProviderKey}/switch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_id: accountId }),
            });
            const data = await res.json();
            if (res.ok) {
                const swapMsg = data.swapped_info?.message;
                toast.success(swapMsg || '활성 계정이 성공적으로 변경되었습니다.');
                fetchProviderInfo(activeProviderKey);
                onAccountsChanged?.();
            } else {
                toast.error(data.detail || '계정 전환에 실패했습니다.');
            }
        } catch (e) {
            toast.error('계정 전환에 실패했습니다.');
        }
    };

    const handleSaveSnapshot = async (email: string) => {
        setSavingSnapshot(true);
        try {
            const res = await fetch('/api/ai-accounts/gemini/snapshot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.result?.message || '세션 스냅샷이 안전하게 저장되었습니다.');
                fetchProviderInfo(activeProviderKey);
                onAccountsChanged?.();
            } else {
                toast.error(data.detail || '스냅샷 저장 실패');
            }
        } catch (e) {
            toast.error('세션 스냅샷 저장 중 오류가 발생했습니다.');
        } finally {
            setSavingSnapshot(false);
        }
    };

    const handleValidateAllKeys = async () => {
        setValidatingKeys(true);
        try {
            const res = await fetch('/api/ai-accounts/gemini/validate-keys', {
                method: 'POST',
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`검증 완료: 총 ${data.total_keys}개 중 ${data.healthy_keys}개 정상 가용`);
                setApiKeysList(data.keys || []);
            } else {
                toast.error(data.detail || '키 검증 실패');
            }
        } catch (e) {
            toast.error('API 키 실시간 검증 중 오류가 발생했습니다.');
        } finally {
            setValidatingKeys(false);
        }
    };

    const handleValidateSingleKey = async (keyStr: string) => {
        try {
            const res = await fetch('/api/ai-accounts/gemini/validate-single-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: keyStr }),
            });
            const data = await res.json();
            if (res.ok && data.validation) {
                if (data.validation.valid) {
                    toast.success(`[정상] ${data.validation.message}`);
                } else {
                    toast.error(`[오류] ${data.validation.message}`);
                }
                fetchApiKeysList();
            }
        } catch (e) {
            toast.error('키 검증 중 오류가 발생했습니다.');
        }
    };


    const handleImportSession = async () => {
        if (!newEmail.trim()) {
            toast.error('계정 이메일을 입력해 주세요.');
            return;
        }
        if (!sessionJsonText.trim()) {
            toast.error('oauth_creds.json 내용을 입력해 주세요.');
            return;
        }
        try {
            const parsedCreds = JSON.parse(sessionJsonText.trim());
            const res = await fetch('/api/ai-accounts/gemini/import-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail.trim(), creds: parsedCreds }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.result?.message || '세션 스냅샷이 성공적으로 가져와졌습니다.');
                setSessionJsonText('');
                setShowAddAccount(false);
                fetchProviderInfo(activeProviderKey);
                onAccountsChanged?.();
            } else {
                toast.error(data.detail || '세션 가져오기 실패');
            }
        } catch (e: any) {
            toast.error('유효하지 않은 JSON 형식이거나 처리 오류: ' + (e.message || ''));
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

    const handleBulkAddAccounts = async () => {
        if (!bulkEmailsText.trim()) {
            toast.error('이메일 목록을 입력해 주세요.');
            return;
        }
        try {
            const res = await fetch('/api/ai-accounts/gemini/bulk-accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emails: bulkEmailsText.trim(), plan: newPlan }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`${data.count || 0}개의 Google 계정이 일괄 등록되었습니다.`);
                setBulkEmailsText('');
                setShowBulkAddAccounts(false);
                fetchProviderInfo(activeProviderKey);
                onAccountsChanged?.();
            } else {
                toast.error(data.detail || '일괄 등록 실패');
            }
        } catch (e) {
            toast.error('계정 일괄 등록 중 오류가 발생했습니다.');
        }
    };

    const handleBulkAddApiKeys = async () => {
        if (!bulkKeysText.trim()) {
            toast.error('API 키를 입력해 주세요.');
            return;
        }
        try {
            const res = await fetch('/api/ai-accounts/gemini/bulk-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keys: bulkKeysText.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`총 ${data.total_keys || 0}개의 Gemini API 키 풀이 등록되었습니다.`);
                setBulkKeysText('');
                setShowBulkApiKeys(false);
                fetchApiKeysList();
                fetchProviderInfo(activeProviderKey);
                onAccountsChanged?.();
            } else {
                toast.error(data.detail || 'API 키 등록 실패');
            }
        } catch (e) {
            toast.error('API 키 일괄 등록 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteApiKey = async (keyId: string) => {
        try {
            const res = await fetch(`/api/ai-accounts/gemini/keys/${keyId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                toast.success('API 키가 제거되었습니다.');
                fetchApiKeysList();
                fetchProviderInfo(activeProviderKey);
                onAccountsChanged?.();
            }
        } catch (e) {
            toast.error('API 키 삭제 실패');
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
                if (activeProviderKey === 'gemini') {
                    fetchApiKeysList();
                }
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
        if (activeProviderKey === 'gemini') {
            window.open('https://gemini.google.com', '_blank');
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

    const handleClaudeLogin = async (emailHint?: string, options?: { resetCookies?: boolean }) => {
        const electronAPI = (window as any).electronAPI;
        const targetEmail = (emailHint || newEmail).trim();
        if (electronAPI?.openClaudeWebLogin) {
            toast.info(options?.resetCookies ? '🔄 이전 세션 쿠키를 초기화하고 Claude 로그인 창을 엽니다...' : '🌐 Anthropic Claude Web (claude.ai) 브라우저 로그인 창을 실행합니다...');
            const res = await electronAPI.openClaudeWebLogin(targetEmail || undefined, options);
            if (res?.success) {
                toast.success(res.message || 'Claude Web 계정이 성공적으로 연동되었습니다!');
                setNewEmail('');
                await fetchProviderInfo('claude');
                onAccountsChanged?.();
            } else if (res?.message && !res.message.includes('창이 닫혔습니다')) {
                toast.error(res.message);
            }
        } else {
            window.open('https://claude.ai/login', '_blank');
            toast.info('브라우저에서 claude.ai에 로그인해 주세요.');
        }
    };

    const deepSeekPollTimerRef = useRef<any>(null);

    const handleManualSyncDeepSeek = async (emailHint?: string) => {
        const targetEmail = (emailHint || newEmail).trim();
        if (!targetEmail) {
            toast.error('연동할 계정 이메일을 입력하거나 프로필을 선택해 주세요.');
            return;
        }
        try {
            toast.info(`DeepSeek (${targetEmail}) 브라우저 세션 동기화 중...`);
            const res = await fetch('/api/ai-accounts/deepseek/sync-browser-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || `DeepSeek Web (${targetEmail}) 계정이 성공적으로 연동되었습니다!`);
                await fetchProviderInfo('deepseek');
                onAccountsChanged?.();
            } else {
                toast.error(data.detail || '아직 브라우저에서 로그인이 완료되지 않았습니다.');
            }
        } catch (e: any) {
            toast.error('세션 동기화 오류: ' + (e.message || ''));
        }
    };

    const handleDeepSeekLogin = async (emailHint?: string) => {
        const targetEmail = (emailHint || newEmail).trim();
        setLinkingDeepSeekEmail(targetEmail || 'direct');
        if (deepSeekPollTimerRef.current) {
            clearInterval(deepSeekPollTimerRef.current);
            deepSeekPollTimerRef.current = null;
        }

        try {
            // Launch genuine system Google Chrome directly (Zero Geetest treadmill loops)
            const res = await fetch('/api/ai-accounts/deepseek/launch-browser-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail || undefined })
            });
            const data = await res.json();

            if (res.ok && data.success !== false) {
                toast.info('🌐 순정 구글 크롬 브라우저가 실행되었습니다. 딥시크 화면에서 로그인해 주세요 (로그인 시 자동 연동됩니다)');

                // Auto-poll for login completion in Chrome
                let attempts = 0;
                deepSeekPollTimerRef.current = setInterval(async () => {
                    attempts++;
                    if (attempts > 72) { // 3 minutes timeout
                        clearInterval(deepSeekPollTimerRef.current);
                        deepSeekPollTimerRef.current = null;
                        setLinkingDeepSeekEmail(null);
                        return;
                    }
                    try {
                        const syncRes = await fetch('/api/ai-accounts/deepseek/sync-browser-session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: targetEmail || 'deepseek_user@gmail.com' })
                        });
                        if (syncRes.ok) {
                            clearInterval(deepSeekPollTimerRef.current);
                            deepSeekPollTimerRef.current = null;
                            const syncData = await syncRes.json();
                            toast.success(syncData.message || `🎉 DeepSeek Web (${targetEmail}) 계정이 성공적으로 연동되었습니다!`);
                            setLinkingDeepSeekEmail(null);
                            setNewEmail('');
                            await fetchProviderInfo('deepseek');
                            onAccountsChanged?.();
                        }
                    } catch (_) {}
                }, 2500);
            } else {
                toast.error(data.error || data.detail || '브라우저 창 실행 실패');
                setLinkingDeepSeekEmail(null);
            }
        } catch (e: any) {
            toast.error('DeepSeek 로그인 창 실행 오류: ' + (e.message || ''));
            setLinkingDeepSeekEmail(null);
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
                if (activeProviderKey === 'gemini') {
                    fetchApiKeysList();
                }
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

    // Filter accounts by search query
    const filteredAccounts = providerData.accounts.filter(acc => 
        !searchQuery.trim() || acc.email.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 bg-card border-border/80 shadow-2xl rounded-2xl text-foreground">
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
                            className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="로컬 AI 세션 동기화"
                        >
                            <RefreshCw className="w-3 h-3" />
                            새로고침
                        </Button>
                    </div>

                    {/* Segmented 2-Way Selector for OpenAI Ecosystem */}
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
                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

                    {/* 2-Tier Multi-Quota Selector for Google Gemini */}
                    {activeProviderKey === 'gemini' && (
                        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl mt-2 border border-border/60">
                            {[
                                { key: 'tier1_antigravity', label: '⚡ 1순위: Google Antigravity 2.0 (초고속 스트리밍)', desc: '네이티브 세션 100% 무인' },
                                { key: 'tier3_web', label: '🌐 2순위: 세션 관리 & 고급 도구', desc: '쿠키 및 Keyring 관리' },
                            ].map((tier) => (
                                <button
                                    key={tier.key}
                                    type="button"
                                    onClick={() => setGeminiTier(tier.key as any)}
                                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer ${
                                        geminiTier === tier.key
                                            ? 'bg-background text-foreground shadow-xs ring-1 ring-border'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                                    }`}
                                >
                                    {tier.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                        {activeProviderKey === 'gemini'
                            ? geminiTier === 'tier1_antigravity'
                                ? 'Google 공식 웹 브라우저 인증을 통해 Antigravity 2.0 고속 모델과 웹 쿠키 세션을 계정별 독립 프로필로 동시에 연동합니다. 429 한도 도달 시 등록된 계정으로 자동 로테이션됩니다.'
                                : 'Windows Keyring 동기화, __Secure-1PSID 쿠키 직접 입력, 세션 스냅샷 관리 등 파워유저용 고급 설정 도구입니다.'
                            : activeProviderKey === 'omniroute'
                            ? '로컬 포트 20128 스마트 콤보 라우터입니다. 외부 API 요금 없이 무제한으로 비전 및 고품질 생성을 지원합니다.'
                            : activeProviderKey === 'chatgpt_web'
                            ? 'OpenAI 공식 ChatGPT Web (chatgpt.com) 세션 연동입니다. 일반 웹 대화는 Codex 쿼터에 포함되지 않는 독립적인 Plus 롤링 정책을 따릅니다.'
                            : activeProviderKey === 'codex'
                            ? '공식 OpenAI Codex CLI OAuth 세션 연동입니다. Codex Astra 6.1 심층 추론 엔진을 직접 구동하며 5시간/주간 슬라이딩 윈도우 쿼터를 적용받습니다.'
                            : `${providerData.name} 계정을 연결하여 사용할 수 있습니다.`}
                    </DialogDescription>
                </DialogHeader>

                {/* ========================================================================= */}
                {/* 🌟 GEMINI TIER 1: Unified Google Web Login & Multi-Account Pool          */}
                {/* ========================================================================= */}
                {activeProviderKey === 'gemini' && geminiTier === 'tier1_antigravity' && (
                    <div className="flex flex-col flex-1 min-h-0 mt-2 space-y-2.5">
                        {/* 1. Google Gemini Web Session Primary Card (등록된 계정이 없을 때만 초기 안내로 노출, 등록 후에는 계정 목록 카드에 일원화) */}
                        {providerData.accounts.length === 0 && (
                            geminiWebSession?.connected ? (
                                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                                                🌐
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-xs font-bold text-foreground">
                                                        {geminiWebSession.email || 'Google Gemini 웹 세션'}
                                                    </h4>
                                                    <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 font-bold shadow-2xs">
                                                        <Check className="w-3 h-3 stroke-[3]" /> 웹 세션 연동 완료
                                                    </Badge>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                    독립 프로필(04_Profiles)에 웹 세션 쿠키가 보관되어 Antigravity와 동시 연동됩니다.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleStartGeminiWebLogin()}
                                                disabled={capturingWebSession}
                                                className="h-7.5 px-3 text-xs font-semibold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                                            >
                                                <RefreshCw className={`w-3 h-3 ${capturingWebSession ? 'animate-spin' : ''}`} />
                                                세션 재연동
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={handleDeleteGeminiWebSession}
                                                className="h-7.5 w-7.5 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                                                title="세션 쿠키 해제"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-[11px]">
                                        <div className="p-2 rounded-lg bg-background/80 border border-emerald-500/20 space-y-0.5">
                                            <span className="text-muted-foreground text-[10px]">보관된 핵심 쿠키</span>
                                            <div className="font-mono text-[11px] font-bold text-foreground truncate" title={geminiWebSession.secure_1psid_masked}>
                                                __Secure-1PSID: {geminiWebSession.secure_1psid_masked || '연동됨'}
                                            </div>
                                        </div>
                                        <div className="p-2 rounded-lg bg-background/80 border border-emerald-500/20 space-y-0.5">
                                            <span className="text-muted-foreground text-[10px]">쿠키 보관 상태</span>
                                            <div className="font-semibold text-foreground text-[11px] flex items-center justify-between">
                                                <span>총 {geminiWebSession.cookie_count || 1}개 쿠키</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {geminiWebSession.updated_at ? new Date(geminiWebSession.updated_at).toLocaleDateString() : '최신'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 text-center space-y-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary mx-auto flex items-center justify-center font-bold text-base">
                                        🌐
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-foreground">Google Gemini 공식 웹 로그인 (통합 연동)</h4>
                                        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed mt-1">
                                            아래 버튼을 누르면 전용 로그인 창이 실행됩니다. <strong>gemini.google.com</strong>에 로그인하는 즉시 
                                            세션 쿠키와 계정 정보가 자동 감지되어 <strong>Antigravity 2.0 및 웹 대화에 동시 연동</strong>됩니다.
                                        </p>
                                    </div>

                                    <div className="pt-1 max-w-md mx-auto space-y-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleStartGeminiWebLogin()}
                                            disabled={capturingWebSession}
                                            className="w-full h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-2 shadow-xs cursor-pointer"
                                        >
                                            <Zap className={`w-4 h-4 ${capturingWebSession ? 'animate-spin' : ''}`} />
                                            {capturingWebSession ? 'Google 웹 로그인 및 쿠키 자동 감지 대기 중...' : 'Google 웹 로그인 및 세션 자동 연동'}
                                        </Button>

                                        <div className="flex items-center justify-center pt-0.5">
                                            <button
                                                type="button"
                                                onClick={() => setShowManualCookieForm(!showManualCookieForm)}
                                                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
                                            >
                                                {showManualCookieForm ? '▲ 쿠키 직접 입력 닫기' : '▼ 개발자 도구의 __Secure-1PSID 쿠키 직접 입력하기'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}

                        {/* 3. Manual Cookie Input Drawer (if toggled) */}
                        {showManualCookieForm && (
                            <div className="p-3 rounded-xl border border-primary/40 bg-muted/20 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Key className="w-3.5 h-3.5 text-primary" />
                                        __Secure-1PSID 쿠키 수동 등록
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">Chrome 개발자 도구(F12) → Application → Cookies</span>
                                </div>
                                <Input
                                    placeholder="g.a000... 형태의 __Secure-1PSID 값을 붙여넣으세요"
                                    value={manualCookieInput}
                                    onChange={(e) => setManualCookieInput(e.target.value)}
                                    className="h-8 text-xs font-mono bg-background"
                                />
                                <div className="flex items-center justify-between pt-1">
                                    <Input
                                        placeholder="계정 이메일 (선택 사항)"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        className="h-7 text-xs w-48 bg-background"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={handleSaveManualCookie}
                                        disabled={savingManualCookie}
                                        className="h-7 text-xs px-3 font-semibold cursor-pointer"
                                    >
                                        {savingManualCookie ? '저장 중...' : '쿠키 등록 및 저장'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Auto-Rotation & Multi-Quota Sovereign Banner */}
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-between text-xs font-medium">
                            <div className="flex items-center gap-2 min-w-0">
                                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                                <div className="min-w-0">
                                    <span className="truncate block"><strong>Google Antigravity 2.0 (Gemini 3.8 Flash):</strong> 429 한도 도달 시 등록 계정 간 무중단 자동 로테이션</span>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                        💡 등록된 10개 계정은 초기 대기 상태로 한도가 100% 완비되어 있으며, API 요청 실행 시 실시간 차감 및 자동 스왑됩니다.
                                    </p>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 border-emerald-500/30 font-bold shrink-0">
                                총 {providerData.accounts.length}개 등록 (전 계정 가용)
                            </Badge>
                        </div>



                        {/* Search & Action Bar */}
                        <div className="flex items-center gap-1.5">
                            <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="계정 이메일 검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-8 pl-8 text-xs bg-background"
                                />
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleBatchLinkAntigravity}
                                disabled={batchLinkingAntigravity}
                                className="h-8 text-xs gap-1 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 shrink-0 cursor-pointer font-bold"
                                title="등록된 모든 계정의 Antigravity 독립 OAuth 세션을 순차적으로 자동 연동합니다"
                            >
                                <Zap className={`w-3.5 h-3.5 ${batchLinkingAntigravity ? 'animate-spin' : ''}`} />
                                {batchLinkingAntigravity ? `순차 연동 중 (${batchLinkingProgress?.current}/${batchLinkingProgress?.total})...` : '⚡ 전체 Antigravity 연동'}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleSyncKeyring}
                                disabled={syncingKeyring}
                                className="h-8 text-xs gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 shrink-0 cursor-pointer"
                                title="Windows Keyring 및 Antigravity 세션 즉시 동기화"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${syncingKeyring ? 'animate-spin' : ''}`} />
                                Keyring 동기화
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setShowBulkAddAccounts(!showBulkAddAccounts);
                                    setShowAddAccount(false);
                                }}
                                className="h-8 text-xs gap-1 border-border shrink-0 cursor-pointer"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                일괄 등록
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => {
                                    setShowAddAccount(!showAddAccount);
                                    setShowBulkAddAccounts(false);
                                }}
                                className="h-8 text-xs gap-1 shrink-0 cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                계정 추가
                            </Button>
                        </div>

                        {/* Bulk Accounts Input Drawer */}
                        {showBulkAddAccounts && (
                            <div className="p-3 rounded-xl border border-primary/40 bg-muted/30 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground">Google 계정 대량 일괄 등록</span>
                                    <span className="text-[10px] text-muted-foreground">이메일을 한 줄에 하나씩 입력하세요</span>
                                </div>
                                <textarea
                                    rows={4}
                                    placeholder={"jmyoon312@gmail.com\nkellybk1000@gmail.com\nviral.creator01@gmail.com"}
                                    value={bulkEmailsText}
                                    onChange={(e) => setBulkEmailsText(e.target.value)}
                                    className="w-full text-xs font-mono p-2 rounded-lg bg-background text-foreground border border-border focus:outline-hidden resize-none"
                                />
                                <div className="flex items-center justify-between">
                                    <select
                                        value={newPlan}
                                        onChange={(e) => setNewPlan(e.target.value)}
                                        className="h-7 px-2 text-xs bg-background text-foreground border border-border rounded-md"
                                    >
                                        <option value="유료 플랜 (Antigravity)">유료 플랜 (Antigravity)</option>
                                        <option value="Antigravity 2.0 Pro">Antigravity 2.0 Pro</option>
                                        <option value="무료 플랜">무료 플랜</option>
                                    </select>
                                    <Button size="sm" onClick={handleBulkAddAccounts} className="h-7 text-xs px-3 cursor-pointer">
                                        일괄 등록 실행
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Genuine Session Connection Drawer */}
                        {showAddAccount && (
                            <div className="p-3.5 rounded-xl border border-primary/40 bg-muted/20 space-y-3">
                                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                    <span className="text-xs font-bold text-foreground">새 Google 계정 및 OAuth 세션 등록</span>
                                    <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border border-border">
                                        <button
                                            type="button"
                                            onClick={() => setAddAccountMode('browser')}
                                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                                                addAccountMode === 'browser'
                                                    ? 'bg-primary text-primary-foreground shadow-2xs'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            🌐 브라우저 인증
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAddAccountMode('json')}
                                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                                                addAccountMode === 'json'
                                                    ? 'bg-primary text-primary-foreground shadow-2xs'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            📄 토큰 JSON 가져오기
                                        </button>
                                    </div>
                                </div>

                                {addAccountMode === 'browser' ? (
                                    <div className="space-y-2.5">
                                        {/* 1. Primary & Recommended: Clean New Account Browser Login */}
                                        <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/30 text-xs space-y-2.5 shadow-2xs">
                                            <div className="flex items-center justify-between">
                                                <p className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                                                    <Globe className="w-4 h-4 text-primary" />
                                                    새 Google 계정 브라우저 로그인 (권장)
                                                </p>
                                                <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.2 font-bold">
                                                    독립 프로필 자동 생성
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                추가하실 새 구글 계정의 이메일을 입력하고 아래 버튼을 누르면 <strong>전용 독립 브라우저 창</strong>이 실행됩니다. 로그인 시 해당 계정 전용의 독립 프로필 및 웹 세션 쿠키가 한 번에 자동 연동됩니다.
                                            </p>
                                            <div className="space-y-1.5">
                                                <Input
                                                    placeholder="추가할 새 구글 이메일 (예: user2@gmail.com, 비워두면 로그인 창에서 직접 입력)"
                                                    value={newEmail}
                                                    onChange={(e) => setNewEmail(e.target.value)}
                                                    className="h-8.5 text-xs bg-background"
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleStartGeminiWebLogin(newEmail.trim() || undefined)}
                                                    disabled={capturingWebSession}
                                                    className="w-full h-9 text-xs font-semibold gap-2 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                                                >
                                                    <Globe className={`w-3.5 h-3.5 ${capturingWebSession ? 'animate-spin' : ''}`} />
                                                    {capturingWebSession ? 'Google 웹 로그인 및 세션 캡처 중...' : '🌐 새 구글 계정 브라우저 로그인 실행'}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* 2. Secondary Helper: Import Local PC Antigravity CLI Session */}
                                        <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs flex items-center justify-between gap-2">
                                            <div className="space-y-0.5 min-w-0">
                                                <p className="font-semibold text-foreground text-[11px] flex items-center gap-1">
                                                    <RefreshCw className="w-3 h-3 text-muted-foreground" />
                                                    보조 도구: 현재 PC의 Antigravity CLI 세션 가져오기
                                                </p>
                                                <p className="text-[10px] text-muted-foreground truncate">
                                                    Windows Keyring에 이미 등록된 기존 Antigravity 세션을 불러옵니다.
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={async () => {
                                                    await handleSyncKeyring();
                                                    setShowAddAccount(false);
                                                }}
                                                disabled={syncingKeyring}
                                                className="h-7 px-2.5 text-[11px] font-medium border-border hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                                            >
                                                <RefreshCw className={`w-3 h-3 ${syncingKeyring ? 'animate-spin' : ''}`} />
                                                세션 가져오기
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Input
                                            placeholder="계정 이메일 주소"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            className="h-8 text-xs bg-background"
                                        />
                                        <textarea
                                            rows={3}
                                            placeholder={'{"access_token": "ya29...", "refresh_token": "1//...", ...}'}
                                            value={sessionJsonText}
                                            onChange={(e) => setSessionJsonText(e.target.value)}
                                            className="w-full text-xs font-mono p-2 rounded-lg bg-background text-foreground border border-border focus:outline-hidden resize-none"
                                        />
                                        <div className="flex justify-end">
                                            <Button size="sm" onClick={handleImportSession} className="h-7 text-xs px-3 cursor-pointer">
                                                세션 JSON 저장
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}




                        {/* Scrollable Accounts List */}
                        <div className="space-y-2 flex-1 overflow-y-auto max-h-[46vh] pr-1 scrollbar-thin">
                            {filteredAccounts.length === 0 ? (
                                <div className="py-8 text-center border border-dashed border-border rounded-xl">
                                    <p className="text-xs text-muted-foreground">일치하는 계정이 없습니다.</p>
                                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">상단 [+ 계정 추가] 또는 [일괄 등록]으로 계정을 추가해 주세요.</p>
                                </div>
                            ) : (
                                filteredAccounts.map((acc) => {
                                    const w5hRemain = (acc.quotas?.window_5h as any)?.remain_pct ?? Math.max(0, 100 - (acc.quotas?.window_5h?.used_pct ?? 20));
                                    const wWkRemain = (acc.quotas?.window_weekly as any)?.remain_pct ?? Math.max(0, 100 - (acc.quotas?.window_weekly?.used_pct ?? 20));

                                    return (
                                        <div
                                            key={acc.id}
                                            className={`p-3 rounded-xl border transition-all ${
                                                acc.is_active
                                                    ? 'bg-primary/5 border-primary ring-2 ring-primary/30 shadow-xs'
                                                    : 'bg-card border-border/70 hover:border-border/90'
                                            }`}
                                        >
                                            <div className="space-y-1.5 mb-2.5">
                                                {/* Tier 1: Email and Main Status / Switch Button */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-xs font-bold text-foreground" title={acc.email}>
                                                            {acc.email}
                                                        </span>
                                                        <Badge variant="outline" className="text-[9px] text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10 font-bold shrink-0">
                                                            🎬 Flow 연동
                                                        </Badge>
                                                        {acc.is_active ? (
                                                            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-2 py-0.5 font-bold flex items-center gap-1 shadow-2xs shrink-0">
                                                                <Check className="w-3 h-3 stroke-[3]" /> 현재 활성 계정
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border shrink-0">
                                                                대기 풀
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {!acc.is_active && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleSwitchAccount(acc.id)}
                                                                className="h-6 px-2 text-[10px] font-semibold text-foreground hover:border-primary hover:text-primary hover:bg-primary/5 cursor-pointer"
                                                            >
                                                                이 계정으로 전환
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteAccount(acc.id)}
                                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                                                            title="계정 삭제"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Tier 2: Sub-badges & Capabilities */}
                                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                                    {((acc as any).has_cookies || acc.email === geminiWebSession?.email) ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] text-primary border-primary/30 bg-primary/10 font-bold"
                                                            title={`보관된 웹 쿠키: ${geminiWebSession?.cookie_count || 19}개 (${geminiWebSession?.secure_1psid_masked || '__Secure-1PSID'})`}
                                                        >
                                                            🌐 웹 쿠키 ({geminiWebSession?.cookie_count || 19}개)
                                                        </Badge>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleStartGeminiWebLogin(acc.email)}
                                                            disabled={capturingWebSession}
                                                            className="h-5.5 px-1.5 text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer gap-0.5"
                                                            title="이 계정으로 Google 웹 로그인 및 쿠키 연동"
                                                        >
                                                            <Globe className="w-3 h-3 text-primary" />
                                                            웹 쿠키 연동
                                                        </Button>
                                                    )}

                                                    {acc.has_keyring ? (
                                                        <div className="flex items-center gap-1">
                                                            <Badge variant="outline" className="text-[10px] text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10 font-bold" title="독립 Antigravity OAuth 세션 완비">
                                                                ⚡ Antigravity 연동됨
                                                            </Badge>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleStartAntigravityOAuth(acc.email)}
                                                                disabled={linkingAntigravityEmail === acc.email || batchLinkingAntigravity}
                                                                className="h-5.5 px-1 text-[9.5px] text-muted-foreground hover:text-indigo-600 cursor-pointer"
                                                                title="Antigravity OAuth 세션 재인증"
                                                            >
                                                                재연동
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleStartAntigravityOAuth(acc.email)}
                                                            disabled={linkingAntigravityEmail === acc.email || batchLinkingAntigravity}
                                                            className="h-5.5 px-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer gap-0.5 font-bold"
                                                            title="이 계정의 전용 브라우저 세션으로 Antigravity OAuth 인가 및 독립 토큰 연동"
                                                        >
                                                            <Zap className="w-3 h-3 text-indigo-500" />
                                                            {linkingAntigravityEmail === acc.email ? '연동 중...' : '⚡ Antigravity 연동'}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 2대 독립 주권 엔진별 쿼터 및 연동 상태 (Antigravity 2.0 / Gemini 공식 웹 세션) */}
                                            {activeProviderKey === 'gemini' ? (
                                                <div className="mt-2.5 pt-2.5 border-t border-border/50 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                                                            <Layers className="w-3.5 h-3.5 text-primary" />
                                                            2대 독립 주권 엔진별 잔여 한도 & 가용 상태
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            한도 소진 시 다중 계정 무중단 자동 전환
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {/* 1. Antigravity 2.0 (OAuth Keyring & 세션) */}
                                                        <div className="p-2 rounded-lg bg-muted/30 border border-border/60 space-y-1.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10.5px] font-bold text-foreground flex items-center gap-1">
                                                                    ⚡ Antigravity 2.0
                                                                </span>
                                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 font-bold">
                                                                    Gemini 3.8 Flash
                                                                </Badge>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between items-center text-[10px]">
                                                                    <span className="text-muted-foreground">5시간 롤링 한도</span>
                                                                    <span className={`font-bold ${w5hRemain <= 20 ? 'text-destructive' : 'text-emerald-500'}`}>
                                                                        {w5hRemain}%
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-muted-foreground/20 rounded-full h-1 overflow-hidden">
                                                                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${w5hRemain}%` }} />
                                                                </div>
                                                                <div className="flex justify-between items-center text-[9px] text-muted-foreground pt-0.5">
                                                                    <span>주간: <strong className="text-foreground">{wWkRemain}%</strong></span>
                                                                    <span className="truncate">{acc.quotas?.window_5h?.reset_in || '정상 가용'}</span>
                                                                </div>
                                                                {!acc.has_keyring && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => handleStartAntigravityOAuth(acc.email)}
                                                                        disabled={linkingAntigravityEmail === acc.email || batchLinkingAntigravity}
                                                                        className="w-full h-5 text-[9.5px] p-0 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 cursor-pointer font-medium"
                                                                    >
                                                                        {linkingAntigravityEmail === acc.email ? 'OAuth 인증 중...' : '+ 원클릭 OAuth 연동'}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* 2. Gemini 공식 웹 세션 (Browser Web Cookies) */}
                                                        <div className="p-2 rounded-lg bg-muted/30 border border-border/60 space-y-1.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10.5px] font-bold text-foreground flex items-center gap-1">
                                                                    🌐 Gemini 공식 웹
                                                                </span>
                                                                {(acc as any).has_cookies || acc.email === geminiWebSession?.email ? (
                                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold">
                                                                        세션 활성
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground">
                                                                        미연동
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="space-y-1 text-[10px]">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-muted-foreground">웹 대화 한도</span>
                                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                                        무제한 웹 세션
                                                                    </span>
                                                                </div>
                                                                <p className="text-[9.5px] text-muted-foreground truncate">
                                                                    {(acc as any).has_cookies || acc.email === geminiWebSession?.email
                                                                        ? `보안 쿠키 ${(acc as any).cookie_count || geminiWebSession?.cookie_count || 19}개 완비`
                                                                        : '브라우저 로그인으로 쿠키 연동 필요'}
                                                                </p>
                                                                {!((acc as any).has_cookies || acc.email === geminiWebSession?.email) && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => handleStartGeminiWebLogin(acc.email)}
                                                                        className="w-full h-5 text-[9.5px] p-0 text-primary hover:text-primary/80 cursor-pointer font-medium"
                                                                    >
                                                                        + 브라우저 로그인 연동
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Engine and Failover Info Bar */}
                                                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                                                        <div className="p-1.5 rounded-lg bg-muted/20 border border-border/40 flex items-center justify-between">
                                                            <span className="text-muted-foreground">적용 AI 엔진</span>
                                                            <span className="font-bold text-foreground flex items-center gap-1">
                                                                <Zap className="w-3 h-3 text-emerald-500" />
                                                                Gemini 3.8 Flash (Antigravity 2.0)
                                                            </span>
                                                        </div>
                                                        <div className="p-1.5 rounded-lg bg-muted/20 border border-border/40 flex items-center justify-between">
                                                            <span className="text-muted-foreground">자동 로테이션 우선순위</span>
                                                            <span className="font-bold text-foreground flex items-center gap-1">
                                                                <ShieldCheck className="w-3 h-3 text-primary" />
                                                                #{acc.rotation_priority || 1} 우선순위 (소진 시 자동 스왑)
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : acc.quotas ? (
                                                <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10.5px]">
                                                    <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-muted-foreground">5시간 한도</span>
                                                            <span className="font-bold text-foreground">{w5hRemain}%</span>
                                                        </div>
                                                        <div className="w-full bg-muted-foreground/20 rounded-full h-1.5 overflow-hidden mt-1">
                                                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${w5hRemain}%` }} />
                                                        </div>
                                                        <span className="text-[9.5px] text-muted-foreground/80 mt-0.5 block truncate">
                                                            {acc.quotas.window_5h.reset_in}
                                                        </span>
                                                    </div>

                                                    <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-muted-foreground">주간 한도</span>
                                                            <span className="font-bold text-foreground">{wWkRemain}%</span>
                                                        </div>
                                                        <div className="w-full bg-muted-foreground/20 rounded-full h-1.5 overflow-hidden mt-1">
                                                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${wWkRemain}%` }} />
                                                        </div>
                                                        <span className="text-[9.5px] text-muted-foreground/80 mt-0.5 block truncate">
                                                            {acc.quotas.window_weekly.reset_in}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* ⚙️ GEMINI TIER 3: Antigravity CLI & Advanced Tools                       */}
                {/* ========================================================================= */}
                {activeProviderKey === 'gemini' && geminiTier === 'tier3_web' && (
                    <div className="flex flex-col flex-1 min-h-0 mt-3 space-y-3.5 py-1">
                        {/* 1. Windows Keyring Quick Sync Card */}
                        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs font-bold text-foreground">Windows Keyring(Antigravity) 즉시 동기화</span>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handleSyncKeyring}
                                    disabled={syncingKeyring}
                                    className="h-7 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                >
                                    <RefreshCw className={`w-3 h-3 ${syncingKeyring ? 'animate-spin' : ''}`} />
                                    {syncingKeyring ? '동기화 중...' : 'Keyring 즉시 동기화'}
                                </Button>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                PC의 Windows Credential Manager(Keyring)에 보관된 공식 Antigravity CLI 토큰을 읽어와 계정 풀 스냅샷으로 백업합니다.
                            </p>
                        </div>

                        {/* 2. Manual oauth_creds.json Import */}
                        <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-primary" />
                                    Antigravity oauth_creds.json 수동 가져오기
                                </span>
                                <span className="text-[10px] text-muted-foreground">~/.gemini/oauth_creds.json</span>
                            </div>
                            <Input
                                placeholder="계정 이메일 주소"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="h-8 text-xs bg-background"
                            />
                            <textarea
                                rows={3}
                                placeholder={'{"access_token": "ya29...", "refresh_token": "1//...", ...}'}
                                value={sessionJsonText}
                                onChange={(e) => setSessionJsonText(e.target.value)}
                                className="w-full text-xs font-mono p-2 rounded-lg bg-background text-foreground border border-border focus:outline-hidden resize-none"
                            />
                            <div className="flex justify-end">
                                <Button size="sm" onClick={handleImportSession} className="h-7 text-xs px-3 cursor-pointer">
                                    세션 JSON 저장
                                </Button>
                            </div>
                        </div>

                        {/* 3. Manual Cookie Input */}
                        <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Key className="w-3.5 h-3.5 text-primary" />
                                    __Secure-1PSID 쿠키 수동 등록
                                </span>
                                <span className="text-[10px] text-muted-foreground">Chrome 개발자 도구(F12) → Application → Cookies</span>
                            </div>
                            <Input
                                placeholder="g.a000... 형태의 __Secure-1PSID 값을 붙여넣으세요"
                                value={manualCookieInput}
                                onChange={(e) => setManualCookieInput(e.target.value)}
                                className="h-8 text-xs font-mono bg-background"
                            />
                            <div className="flex justify-end">
                                <Button
                                    size="sm"
                                    onClick={handleSaveManualCookie}
                                    disabled={savingManualCookie}
                                    className="h-7 text-xs px-3 font-semibold cursor-pointer"
                                >
                                    {savingManualCookie ? '저장 중...' : '쿠키 수동 저장'}
                                </Button>
                            </div>
                        </div>

                        {/* 4. Comparison Guide */}
                        <div className="p-3 rounded-xl border border-border/60 bg-card text-xs text-muted-foreground space-y-2">
                            <p className="font-semibold text-foreground">💡 2대 독립 주권 로그인 및 엔진 안내:</p>
                            <div className="space-y-1 text-[11px] leading-relaxed">
                                <p>• <strong className="text-foreground">⚡ 1순위: Google Antigravity 2.0 (초고속 스트리밍):</strong> Google Antigravity IDE 2.0 세션 기반 0.1~0.3초대 초저지연 네이티브 스트리밍, 대화형 디렉터, 10대 도구 실행을 100% 무인 자동 로테이션으로 처리합니다.</p>
                                <p>• <strong className="text-foreground">🌐 2순위: Gemini 공식 웹 세션 (비용 0원 멀티모달):</strong> Imagen 3 비주얼 생성, 음성 TTS, 실시간 최신 트렌드 웹 그라운딩을 API 비용 0원의 주권 웹 세션으로 전담 운영합니다.</p>
                            </div>
                        </div>
                    </div>
                )}


                {/* ========================================================================= */}
                {/* ⚡ OPENAI ECOSYSTEM: Codex CLI (Astra) & ChatGPT Web Dedicated View     */}
                {/* ========================================================================= */}
                {isChatGptEcosystem && (
                    <div className="flex flex-col flex-1 min-h-0 mt-2 space-y-2.5">
                        {/* Auto-Rotation & Multi-Quota Sovereign Banner */}
                        <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
                            activeProviderKey === 'codex'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        }`}>
                            <div className="flex items-center gap-2 min-w-0">
                                <ShieldCheck className="w-4 h-4 shrink-0 text-primary" />
                                <div className="min-w-0">
                                    <span className="truncate block">
                                        <strong>{activeProviderKey === 'codex' ? 'OpenAI Codex CLI (Astra 6.0 OAuth 직결):' : 'ChatGPT Web (chatgpt.com 웹 대화 쿼터):'}</strong>{' '}
                                        {activeProviderKey === 'codex'
                                            ? '5시간/주간 슬라이딩 윈도우 쿼터 적용, 429 한도 도달 시 등록 계정 간 자동 로테이션'
                                            : '독립적인 Plus/Free 웹 세션 롤링 쿼터 적용, 종량제 API 요금 0원'}
                                    </span>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                        💡 등록된 모든 계정은 독립 프로필(04_Profiles/openai_sessions)에 보관되며, 쿼터 소진 시 무중단 자동 절체(Failover)됩니다.
                                    </p>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-bold shrink-0">
                                총 {providerData.accounts.length}개 등록
                            </Badge>
                        </div>

                        {/* 1. Primary Action Card: Interactive Web Session Login (Replacing old email text input) */}
                        {activeProviderKey === 'codex' ? (
                            <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                                            ⚡
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-bold text-foreground">
                                                    OpenAI Codex 브라우저 로그인 (Astra OAuth)
                                                </h4>
                                                <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.2 font-bold">
                                                    공식 OAuth 직결
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                브라우저에서 OpenAI 계정으로 로그인하면 auth.json이 계정별 독립 프로필에 자동 연동됩니다.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            placeholder="추가할 OpenAI 계정 이메일 (선택 사항, 비워두면 브라우저 로그인 계정 자동 감지)"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            className="h-8.5 text-xs bg-background flex-1"
                                        />
                                        <Button
                                            size="sm"
                                            onClick={() => handleStartCodexLogin(newEmail.trim() || undefined)}
                                            disabled={capturingCodexAuth}
                                            className="h-8.5 px-4 text-xs font-semibold gap-2 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shrink-0"
                                        >
                                            <ExternalLink className={`w-3.5 h-3.5 ${capturingCodexAuth ? 'animate-spin' : ''}`} />
                                            {capturingCodexAuth ? '브라우저 OAuth 로그인 대기 중...' : '⚡ 브라우저 로그인으로 Codex 계정 추가'}
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-center pt-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setShowManualCodexAuthForm(!showManualCodexAuthForm)}
                                            className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
                                        >
                                            {showManualCodexAuthForm ? '▲ auth.json 직접 입력 닫기' : '▼ PC의 auth.json 파일 내용 직접 붙여넣기'}
                                        </button>
                                    </div>
                                </div>

                                {showManualCodexAuthForm && (
                                    <div className="p-3 rounded-xl border border-primary/40 bg-background space-y-2 mt-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <FileText className="w-3.5 h-3.5 text-primary" />
                                                auth.json 수동 등록
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">~/.codex/auth.json 또는 Pixeling auth.json</span>
                                        </div>
                                        <textarea
                                            rows={3}
                                            placeholder={'{"tokens": {"access_token": "eyJ...", "refresh_token": "...", "account_id": "..."}}'}
                                            value={manualCodexAuthText}
                                            onChange={(e) => setManualCodexAuthText(e.target.value)}
                                            className="w-full text-xs font-mono p-2 rounded-lg bg-background text-foreground border border-border focus:outline-hidden resize-none"
                                        />
                                        <div className="flex items-center justify-between">
                                            <select
                                                value={newPlan}
                                                onChange={(e) => setNewPlan(e.target.value)}
                                                className="h-7 px-2 text-xs bg-background text-foreground border border-border rounded-md"
                                            >
                                                <option value="Plus">Plus 플랜</option>
                                                <option value="Pro">Pro 플랜</option>
                                                <option value="Free">Free 플랜</option>
                                            </select>
                                            <Button
                                                size="sm"
                                                onClick={handleImportCodexAuth}
                                                disabled={savingManualCodexAuth}
                                                className="h-7 text-xs px-3 font-semibold cursor-pointer"
                                            >
                                                {savingManualCodexAuth ? '저장 중...' : 'auth.json 저장'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                                            🌐
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-bold text-foreground">
                                                    ChatGPT Web 세션 브라우저 로그인 (웹 쿼터 연동)
                                                </h4>
                                                <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 font-bold">
                                                    웹 세션 독립 롤링
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                전용 스텔스 창에서 chatgpt.com에 로그인하면 세션 쿠키가 독립 프로필에 안전하게 저장됩니다.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            placeholder="추가할 ChatGPT 계정 이메일 (선택 사항, 비워두면 로그인 시 자동 감지)"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            className="h-8.5 text-xs bg-background flex-1"
                                        />
                                        <Button
                                            size="sm"
                                            onClick={() => handleStartChatGptWebLogin(newEmail.trim() || undefined)}
                                            disabled={capturingChatGptWebSession}
                                            className="h-8.5 px-4 text-xs font-semibold gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0"
                                        >
                                            <Globe className={`w-3.5 h-3.5 ${capturingChatGptWebSession ? 'animate-spin' : ''}`} />
                                            {capturingChatGptWebSession ? 'ChatGPT Web 로그인 및 쿠키 캡처 중...' : '🌐 브라우저 로그인으로 Web 세션 추가'}
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-center pt-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setShowManualChatGptCookieForm(!showManualChatGptCookieForm)}
                                            className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
                                        >
                                            {showManualChatGptCookieForm ? '▲ 쿠키 직접 입력 닫기' : '▼ __Secure-next-auth.session-token 쿠키 직접 입력하기'}
                                        </button>
                                    </div>
                                </div>

                                {showManualChatGptCookieForm && (
                                    <div className="p-3 rounded-xl border border-emerald-500/40 bg-background space-y-2 mt-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <Key className="w-3.5 h-3.5 text-emerald-500" />
                                                __Secure-next-auth.session-token 쿠키 수동 등록
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">F12 개발자 도구 → Application → Cookies</span>
                                        </div>
                                        <Input
                                            placeholder="__Secure-next-auth.session-token 또는 JWT 쿠키 값을 붙여넣으세요"
                                            value={manualChatGptSessionToken}
                                            onChange={(e) => setManualChatGptSessionToken(e.target.value)}
                                            className="h-8 text-xs font-mono bg-background"
                                        />
                                        <div className="flex items-center justify-between">
                                            <select
                                                value={newPlan}
                                                onChange={(e) => setNewPlan(e.target.value)}
                                                className="h-7 px-2 text-xs bg-background text-foreground border border-border rounded-md"
                                            >
                                                <option value="Plus">Plus 플랜</option>
                                                <option value="Pro">Pro 플랜</option>
                                                <option value="Free">Free 플랜</option>
                                            </select>
                                            <Button
                                                size="sm"
                                                onClick={handleSaveManualChatGptCookie}
                                                disabled={savingManualChatGptCookie}
                                                className="h-7 text-xs px-3 font-semibold cursor-pointer"
                                            >
                                                {savingManualChatGptCookie ? '저장 중...' : '세션 쿠키 저장'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Search Bar */}
                        <div className="flex items-center gap-1.5 pt-1">
                            <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="계정 이메일 검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-8 pl-8 text-xs bg-background"
                                />
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fetchProviderInfo(activeProviderKey)}
                                className="h-8 text-xs gap-1 cursor-pointer shrink-0"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                세션 새로고침
                            </Button>
                        </div>

                        {/* Account List */}
                        <div className="space-y-3 mt-2 flex-1 overflow-y-auto max-h-[46vh] pr-1.5 scrollbar-thin">
                            {filteredAccounts.length === 0 ? (
                                <div className="py-8 text-center border border-dashed border-border rounded-xl">
                                    <p className="text-xs text-muted-foreground">연결된 계정이 없습니다.</p>
                                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">상단 [브라우저 로그인] 버튼을 눌러 계정을 추가해 주세요.</p>
                                </div>
                            ) : (
                                filteredAccounts.map((acc) => {
                                    const isPaid = acc.plan.toLowerCase().includes('plus') || 
                                                   acc.plan.toLowerCase().includes('pro') || 
                                                   acc.plan.toLowerCase().includes('team');

                                    const w5hUsed = acc.quotas?.window_5h.used_pct ?? 0;
                                    const w5hRemain = (acc.quotas?.window_5h as any)?.remain_pct ?? Math.max(0, 100 - w5hUsed);
                                    const wWkUsed = acc.quotas?.window_weekly.used_pct ?? 0;
                                    const wWkRemain = (acc.quotas?.window_weekly as any)?.remain_pct ?? Math.max(0, 100 - wWkUsed);

                                    return (
                                        <div
                                            key={acc.id}
                                            className={`p-3.5 rounded-xl border transition-all ${
                                                acc.is_active
                                                    ? 'bg-primary/5 border-primary ring-2 ring-primary/30 shadow-xs'
                                                    : 'bg-card border-border/70 hover:border-border/90'
                                            }`}
                                        >
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
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteAccount(acc.id)}
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                                                        title="계정 삭제"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="mt-1.5 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5">
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
                                                    {activeProviderKey === 'codex' ? (
                                                        <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] px-1.5 py-0 font-bold">
                                                            ⚡ Codex OAuth 연동됨
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] px-1.5 py-0 font-bold">
                                                            🌐 Web 세션 연동됨
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {activeProviderKey === 'chatgpt_web' 
                                                        ? 'ChatGPT Plus 대화 롤링 한도 (별도 정책)' 
                                                        : 'Codex 에이전트 전용 한도 (5시간/주간)'}
                                                </span>
                                            </div>

                                            {acc.quotas && (
                                                <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10.5px]">
                                                    <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-muted-foreground">5시간 한도</span>
                                                            <span className="font-bold text-foreground">{w5hRemain}% 남음</span>
                                                        </div>
                                                        <div className="w-full bg-muted-foreground/20 rounded-full h-1.5 overflow-hidden mt-1">
                                                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(w5hRemain, 100)}%` }} />
                                                        </div>
                                                        <span className="text-[9.5px] text-muted-foreground/80 mt-0.5 block truncate">
                                                            {acc.quotas.window_5h.reset_in}
                                                        </span>
                                                    </div>

                                                    <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-muted-foreground">주간 한도</span>
                                                            <span className="font-bold text-foreground">{wWkRemain}% 남음</span>
                                                        </div>
                                                        <div className="w-full bg-muted-foreground/20 rounded-full h-1.5 overflow-hidden mt-1">
                                                            <div className={`h-full transition-all rounded-full ${wWkRemain < 20 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.min(wWkRemain, 100)}%` }} />
                                                        </div>
                                                        <span className="text-[9.5px] text-muted-foreground/80 mt-0.5 block truncate">
                                                            {acc.quotas.window_weekly.reset_in}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}


                {/* ========================================================================= */}
                {/* 🎬 Other Providers (Claude, DeepSeek, OmniRoute) Standard View           */}
                {/* ========================================================================= */}
                {activeProviderKey !== 'gemini' && !isChatGptEcosystem && (
                    <>
                        {activeProviderKey === 'claude' ? (
                            <div className="mt-3 p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-foreground">🌐 Claude Web (claude.ai) 브라우저 로그인</span>
                                        <Badge variant="outline" className="text-[10px] text-primary border-primary/30 font-mono">
                                            웹 세션 독립 롤링
                                        </Badge>
                                    </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    Anthropic 공식 Claude Web (claude.ai) 전용 로그인 창이 열립니다. 터미널 조작 없이 브라우저에서 로그인하면 세션 쿠키가 안전하게 저장되며, 5시간 한도 도달 시 무중단 자동 절체(Failover)됩니다.
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="연동할 Claude 계정 이메일 입력 (선택)"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        className="h-8.5 text-xs bg-background flex-1"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => handleClaudeLogin(newEmail)}
                                        className="h-8.5 px-3.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                                    >
                                        <Globe className="w-3.5 h-3.5" />
                                        브라우저 로그인으로 Web 세션 추가
                                    </Button>
                                </div>

                                {/* ⚡ 등록된 구글 계정(Flow 프로필) 세션으로 즉시 연동 */}
                                {flowProfiles && flowProfiles.length > 0 && (
                                    <div className="pt-2 border-t border-border/60">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                                                <span>⚡ 등록된 구글 프로필 세션으로 연동</span>
                                                <Badge variant="outline" className="text-[9px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                                    구글 세션 공유
                                                </Badge>
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">{flowProfiles.length}개 프로필 감지됨</span>
                                        </div>
                                        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                                            {flowProfiles.map((p) => {
                                                const pEmail = p.email || p.name || '';
                                                const isAlreadyAdded = providerData.accounts.some(acc => acc.email.toLowerCase() === pEmail.toLowerCase());
                                                return (
                                                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50 text-xs">
                                                        <div className="flex flex-col min-w-0 flex-1 mr-2">
                                                            <span className="font-semibold text-foreground truncate text-[11px]">{p.name || pEmail}</span>
                                                            <span className="text-[10px] text-muted-foreground truncate">{pEmail}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <Button
                                                                size="sm"
                                                                variant={isAlreadyAdded ? "secondary" : "default"}
                                                                onClick={() => handleClaudeLogin(pEmail || p.id)}
                                                                className={`h-7 px-2.5 text-[11px] font-medium shrink-0 cursor-pointer ${
                                                                    isAlreadyAdded ? 'opacity-80' : 'bg-primary text-primary-foreground'
                                                                }`}
                                                            >
                                                                {isAlreadyAdded ? '세션 재연동' : '⚡ 연동'}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                title="쿠키 오류 시 초기화 후 깨끗하게 재수집합니다"
                                                                onClick={() => handleClaudeLogin(pEmail || p.id, { resetCookies: true })}
                                                                className="h-7 px-2 text-[10.5px] border-border text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                                                            >
                                                                <RefreshCw className="w-3 h-3 mr-1" />
                                                                쿠키 재수집
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed flex items-start gap-2">
                                    <span className="text-base shrink-0">💡</span>
                                    <div>
                                        <span className="font-semibold">구글 보안 차단("안전하지 않은 브라우저") 우회 안내:</span>
                                        <p className="mt-0.5 text-muted-foreground text-[10.5px]">
                                            구글 간편 로그인에서 '안전하지 않은 브라우저' 경고가 발생하는 경우, 로그인 화면에서 <strong>[이메일로 계속하기 (Continue with email)]</strong>에 구글 이메일을 입력하시면 구글 차단 없이 6자리 확인 코드로 100% 확실하게 로그인됩니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : activeProviderKey === 'deepseek' ? (
                            <div className="mt-3 p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-foreground">🌐 DeepSeek Web (chat.deepseek.com) 브라우저 로그인</span>
                                        <Badge variant="outline" className="text-[10px] text-primary border-primary/30 font-mono">
                                            웹 세션 독립 풀링
                                        </Badge>
                                    </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    DeepSeek 공식 Web (chat.deepseek.com) 전용 독립 로그인 창이 열립니다. 터미널 조작 없이 브라우저에서 로그인하면 세션 토큰이 안전하게 저장되며, DeepSeek-V3(대본) 및 DeepSeek-R1(추론)을 $0원에 무제한 이용하실 수 있습니다.
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="연동할 DeepSeek 계정 이메일 입력 (선택)"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        className="h-8.5 text-xs bg-background flex-1"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => handleDeepSeekLogin(newEmail)}
                                        disabled={linkingDeepSeekEmail !== null}
                                        className="h-8.5 px-3.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                                    >
                                        <Globe className="w-3.5 h-3.5" />
                                        {linkingDeepSeekEmail ? '로그인 대기 중...' : '브라우저 로그인으로 Web 세션 추가'}
                                    </Button>
                                </div>

                                {/* ⚡ 등록된 구글 프로필 세션으로 연동 */}
                                {flowProfiles && flowProfiles.length > 0 && (
                                    <div className="pt-2 border-t border-border/60">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                                                <span>⚡ 등록된 구글 프로필 세션으로 연동</span>
                                                <Badge variant="outline" className="text-[9px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                                    구글 세션 공유
                                                </Badge>
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">{flowProfiles.length}개 프로필 감지됨</span>
                                        </div>
                                        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                                            {flowProfiles.map((p) => {
                                                const pEmail = p.email || p.name || '';
                                                const isAlreadyAdded = providerData?.accounts?.some(acc => acc.email.toLowerCase() === pEmail.toLowerCase());
                                                const isCurrentLinking = linkingDeepSeekEmail === (pEmail || p.id);
                                                return (
                                                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50 text-xs">
                                                        <div className="flex flex-col min-w-0 flex-1 mr-2">
                                                            <span className="font-semibold text-foreground truncate text-[11px]">{p.name || pEmail}</span>
                                                            <span className="text-[10px] text-muted-foreground truncate">{pEmail}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <Button
                                                                size="sm"
                                                                variant={isAlreadyAdded ? "secondary" : "default"}
                                                                onClick={() => handleDeepSeekLogin(pEmail || p.id)}
                                                                disabled={isCurrentLinking}
                                                                className={`h-7 px-2.5 text-[11px] font-medium shrink-0 cursor-pointer ${
                                                                    isAlreadyAdded ? 'opacity-80' : 'bg-primary text-primary-foreground'
                                                                }`}
                                                            >
                                                                {isCurrentLinking ? '연동 중...' : isAlreadyAdded ? '세션 재연동' : '⚡ 연동'}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                title="크롬 브라우저에서 로그인 완료 후 클릭하면 세션을 즉시 가져옵니다"
                                                                onClick={() => handleManualSyncDeepSeek(pEmail || p.id)}
                                                                disabled={isCurrentLinking}
                                                                className="h-7 px-2 text-[10.5px] border-border text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                                                            >
                                                                <RefreshCw className="w-3 h-3 mr-1" />
                                                                세션 수집
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed flex items-start gap-2">
                                    <span className="text-base shrink-0">💡</span>
                                    <div>
                                        <span className="font-semibold">보안 차단("안전하지 않은 브라우저" / 캡차 반복) 우회 안내:</span>
                                        <p className="mt-0.5 text-muted-foreground text-[10.5px]">
                                            구글 간편 로그인에서 보안 차단 또는 질문이 반복되는 경우, 로그인 화면에서 <strong>[이메일 / 비밀번호]</strong> 또는 <strong>[이메일로 계속하기]</strong>에 이메일을 입력하시면 차단 없이 100% 확실하게 로그인됩니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3 flex items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={handleWebLogin}
                                    className="flex-1 h-8.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    OmniRoute 대시보드 열기
                                </Button>
                            </div>
                        )}

                        <div className="space-y-3 mt-3 flex-1 overflow-y-auto max-h-[50vh] pr-1.5 scrollbar-thin">
                            {providerData.accounts.length === 0 ? (
                                <div className="py-8 text-center border border-dashed border-border rounded-xl">
                                    <p className="text-xs text-muted-foreground font-semibold">연결된 계정이 없습니다.</p>
                                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                                        {activeProviderKey === 'claude'
                                            ? '위의 [브라우저 로그인으로 추가] 버튼을 눌러 계정을 연동하거나, 하단 [API 키 변경]으로 Anthropic API 키를 등록해 주세요.'
                                            : activeProviderKey === 'deepseek'
                                            ? '위의 [브라우저 로그인으로 Web 세션 추가] 버튼을 눌러 chat.deepseek.com 계정을 연동해 주세요.'
                                            : '상단 [웹 로그인 연결] 버튼을 누르거나 직접 등록해 주세요.'}
                                    </p>
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
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteAccount(acc.id)}
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                                        title="계정 삭제"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>

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
                                            </div>

                                            {acc.quotas && (
                                                <div className="mt-3.5 space-y-3 pt-3 border-t border-border/40 text-[11px]">
                                                    <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-border/60">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <div>
                                                                <span className="font-bold text-foreground block">5시간 한도</span>
                                                                <span className="text-[10.5px] text-muted-foreground">{acc.quotas.window_5h.reset_in}</span>
                                                            </div>
                                                            <span className="text-sm font-bold text-foreground">{w5hRemain}% 남음</span>
                                                        </div>
                                                        <div className="w-full bg-muted-foreground/20 rounded-full h-2 overflow-hidden mt-1">
                                                            <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${Math.min(w5hRemain, 100)}%` }} />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-border/60">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <div>
                                                                <span className="font-bold text-foreground block">주간 한도</span>
                                                                <span className="text-[10.5px] text-muted-foreground">{acc.quotas.window_weekly.reset_in}</span>
                                                            </div>
                                                            <span className="text-sm font-bold text-foreground">{wWkRemain}% 남음</span>
                                                        </div>
                                                        <div className="w-full bg-muted-foreground/20 rounded-full h-2 overflow-hidden mt-1">
                                                            <div className={`h-full transition-all rounded-full ${wWkRemain < 20 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.min(wWkRemain, 100)}%` }} />
                                                        </div>
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
                                    placeholder="계정 이메일 주소"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="h-8 text-xs bg-background"
                                />
                                <div className="flex items-center gap-2">
                                    <select
                                        value={newPlan}
                                        onChange={(e) => setNewPlan(e.target.value)}
                                        className="h-8 px-2 text-xs bg-background text-foreground border border-border rounded-md flex-1"
                                    >
                                        <option value="Plus">Plus 플랜</option>
                                        <option value="Pro">Pro 플랜</option>
                                        <option value="Free">Free 플랜</option>
                                    </select>
                                    <Button size="sm" onClick={handleAddAccount} className="h-8 text-xs px-3 cursor-pointer">
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
                                    <Button size="sm" onClick={handleSaveApiKey} className="h-8 text-xs px-3 cursor-pointer">
                                        저장
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Bottom Actions */}
                <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between gap-2 shrink-0">
                    {!isChatGptEcosystem && activeProviderKey !== 'omniroute' && activeProviderKey !== 'gemini' && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setShowAddAccount(!showAddAccount);
                                    setShowApiKeyInput(false);
                                }}
                                className="text-xs h-8 gap-1.5 border-border cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                계정 추가
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowApiKeyInput(!showApiKeyInput);
                                    setShowAddAccount(false);
                                }}
                                className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <Key className="w-3.5 h-3.5" />
                                {providerData.has_api_key ? 'API 키 변경' : `${providerData.name} API 키 사용`}
                            </Button>
                        </div>
                    )}
                    {isChatGptEcosystem && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                                className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <Key className="w-3.5 h-3.5" />
                                {providerData.has_api_key ? 'OpenAI 종량제 API 키 변경' : 'OpenAI 종량제 API 키 추가'}
                            </Button>
                        </div>
                    )}

                    <Button
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="ml-auto text-xs h-8 px-5 font-semibold cursor-pointer"
                    >
                        완료
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
