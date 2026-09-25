import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    User, 
    Bot, 
    HardDrive, 
    Settings, 
    Cpu, 
    ChevronRight, 
    CheckCircle2, 
    AlertCircle, 
    ExternalLink, 
    Zap,
    Key
} from 'lucide-react';
import { ProviderAccountModal } from './ProviderAccountModal';

interface IntegratedSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOpenProviderModal?: (providerKey: string) => void;
    initialProvidersData?: any;
}

export const IntegratedSettingsModal: React.FC<IntegratedSettingsModalProps> = ({
    open,
    onOpenChange,
    onOpenProviderModal,
    initialProvidersData,
}) => {
    const [activeTab, setActiveTab] = useState<'accounts' | 'general' | 'storage'>('accounts');
    const [providersData, setProvidersData] = useState<any>(initialProvidersData || {});
    const [loading, setLoading] = useState(false);

    // Selected provider modal
    const [selectedProviderKey, setSelectedProviderKey] = useState<string | null>(null);
    const [providerModalOpen, setProviderModalOpen] = useState(false);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/ai-accounts');
            if (res.ok) {
                const data = await res.json();
                if (data && typeof data === 'object') {
                    setProvidersData(data);
                }
            }
        } catch (e) {
            console.error('Failed to load accounts in integrated settings:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            if (initialProvidersData && Object.keys(initialProvidersData).length > 0) {
                setProvidersData(initialProvidersData);
            }
            fetchAccounts();
        }
    }, [open, initialProvidersData]);

    const handleManageProvider = (key: string) => {
        // Direct reliable modal opening without unmounting collision
        setSelectedProviderKey(key);
        setProviderModalOpen(true);
        if (onOpenProviderModal) {
            onOpenProviderModal(key);
        }
    };

    const providerList = [
        { key: 'codex', icon: '⚡', title: 'OpenAI Codex (CLI 웹 세션)', desc: 'ChatGPT Plus/Pro 세션 기반 Codex Astra 6.0 및 Sol 엔진 직접 실행' },
        { key: 'chatgpt_web', icon: '🌐', title: 'ChatGPT Web (웹 세션 쿼터)', desc: '포트 20128 chatgpt-web 연동 (슬라이딩 윈도우 쿼터로 Astra/Sol 토큰 확보)' },
        { key: 'openai', icon: '🟢', title: 'OpenAI (공식 종량제 API)', desc: 'OpenAI 공식 sk-... API 키 직접 연동 (GPT-4o, o3-mini 등 종량제 과금)' },
        { key: 'gemini', icon: '🔷', title: 'Gemini (Google & Antigravity)', desc: 'Google Gemini 및 Antigravity 2.0 구독 연동' },
        { key: 'omniroute', icon: '🛰️', title: 'OmniRoute (로컬 지능 게이트웨이)', desc: '포트 20128 스마트 콤보 라우터 (비용 0원, 무제한)' },
        { key: 'claude', icon: '🟠', title: 'Claude (Claude Code & Anthropic)', desc: 'Anthropic Claude Code 계정 및 Claude 3.7 API 키' },
        { key: 'grok', icon: '⚪', title: 'Grok (xAI Grok 3)', desc: 'xAI Grok 3 계정 및 Grok API 키' },
    ];

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden bg-card border-border/80 shadow-2xl rounded-2xl flex flex-col md:flex-row max-h-[85vh]">
                    {/* Left Settings Sidebar */}
                    <div className="w-full md:w-56 p-4 border-b md:border-b-0 md:border-r border-border/60 bg-muted/20 flex flex-col justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 block mb-2">
                                설정 메뉴
                            </span>
                            <button
                                type="button"
                                onClick={() => setActiveTab('accounts')}
                                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                                    activeTab === 'accounts'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                            >
                                <Bot className="w-4 h-4" />
                                계정 관리 (5대 지능)
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('general')}
                                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                                    activeTab === 'general'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                            >
                                <Settings className="w-4 h-4" />
                                일반 설정
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('storage')}
                                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                                    activeTab === 'storage'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                            >
                                <HardDrive className="w-4 h-4" />
                                스토리지 & 런타임
                            </button>
                        </div>

                        <div className="pt-4 border-t border-border/50 text-[10px] text-muted-foreground">
                            <span>ViraLoop Studio v6.5.1</span>
                        </div>
                    </div>

                    {/* Right Content View */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        {activeTab === 'accounts' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">계정 관리</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        ViraLoop 앱 계정 및 5대 지능 제공자(AI Models)의 연결 상태와 쿼터를 관리합니다.
                                    </p>
                                </div>

                                {/* ViraLoop Account Box */}
                                <div className="p-4 rounded-xl border border-border/80 bg-muted/30 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-foreground">ViraLoop Studio Pro</span>
                                                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
                                                    주권 활성
                                                </Badge>
                                            </div>
                                            <span className="text-[11px] text-muted-foreground">
                                                로컬 단일 DB (viral_loop.db) 자율 가동 중
                                            </span>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs font-medium text-muted-foreground">
                                        연결됨
                                    </Badge>
                                </div>

                                {/* 5 AI Models Grid Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <Cpu className="w-3.5 h-3.5 text-primary" />
                                            AI 모델 계정 (5가지 선택지)
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                            개별 또는 통합 관리 가능
                                        </span>
                                    </div>

                                    <div className="space-y-2.5">
                                        {providerList.map((item) => {
                                            const pInfo = providersData[item.key] || {};
                                            const isConnected = pInfo.connected;
                                            const accountsCount = pInfo.accounts?.length || 0;
                                            const activePlan = pInfo.active_plan || (isConnected ? '활성' : '미연결');

                                            return (
                                                <div
                                                    key={item.key}
                                                    className="p-3.5 rounded-xl border border-border/70 hover:border-border bg-card transition-all flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-3 truncate">
                                                        <span className="text-lg shrink-0">{item.icon}</span>
                                                        <div className="truncate">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-xs font-bold text-foreground truncate">
                                                                    {item.title}
                                                                </h4>
                                                                <Badge 
                                                                    variant="secondary" 
                                                                    className={`text-[10px] px-1.5 py-0 ${
                                                                        isConnected 
                                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                                                            : 'bg-muted text-muted-foreground'
                                                                    }`}
                                                                >
                                                                    {isConnected ? (item.key === 'omniroute' ? '로컬 연결됨' : activePlan) : '미연결'}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                                {item.desc}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0 ml-3">
                                                        {item.key !== 'omniroute' && (
                                                            <span className="text-[11px] text-muted-foreground">
                                                                계정 {accountsCount}개
                                                            </span>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant={isConnected ? "outline" : "default"}
                                                            onClick={() => handleManageProvider(item.key)}
                                                            className="h-7 text-xs px-3 font-semibold border-border/80"
                                                        >
                                                            {isConnected ? '관리' : '연결'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'general' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-foreground">일반 설정</h3>
                                <p className="text-xs text-muted-foreground">
                                    ViraLoop Studio 데스크톱 애플리케이션의 동작 환경 설정입니다.
                                </p>
                                <div className="p-4 rounded-xl border border-border bg-muted/20 text-xs text-muted-foreground space-y-2">
                                    <p>• 자동 업데이트 활성화: 켜짐</p>
                                    <p>• 영구 저장소 단일 진실 공급원: %LOCALAPPDATA%\ViraLoop Studio</p>
                                    <p>• Zero Hardcoding Policy: DB Settings 실시간 동기화</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'storage' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-foreground">스토리지 & 런타임</h3>
                                <p className="text-xs text-muted-foreground">
                                    9대 미디어 계층(01~09) 및 단일 데이터베이스(viral_loop.db) 상태입니다.
                                </p>
                                <div className="p-4 rounded-xl border border-border bg-muted/20 text-xs text-muted-foreground space-y-2">
                                    <p>• 단일 SQLite DB: viral_loop.db (정상)</p>
                                    <p>• 프리셋 에셋 보관소: 03_Assets/presets/ (14개 로드 완료)</p>
                                    <p>• 비디오 렌더링 임시 디렉토리: 02_Operations/Temp/</p>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Provider Modal when opened internally */}
            {selectedProviderKey && (
                <ProviderAccountModal
                    open={providerModalOpen}
                    onOpenChange={setProviderModalOpen}
                    providerKey={selectedProviderKey}
                    onAccountsChanged={fetchAccounts}
                />
            )}
        </>
    );
};
