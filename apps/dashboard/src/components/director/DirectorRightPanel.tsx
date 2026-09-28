import React, { useState, useEffect, useRef } from 'react';
import { 
    X, 
    Maximize2, 
    Minimize2, 
    FileText, 
    Globe, 
    Folder, 
    Terminal, 
    Image, 
    Clapperboard, 
    Copy, 
    ExternalLink, 
    Download, 
    Play, 
    Pause, 
    Volume2, 
    VolumeX,
    Check,
    Plus,
    Minus,
    RefreshCw,
    FolderPlus,
    Film,
    ArrowUpRight,
    Search,
    ArrowLeft,
    ArrowRight,
    Home,
    RotateCw,
    MoreHorizontal,
    Cpu,
    HardDrive,
    Database,
    Activity,
    LayoutGrid,
    List,
    Music,
    Filter,
    Calendar
} from 'lucide-react';
import { toast } from 'sonner';

import {
    CommandLogItem,
    BrowserSnapshotData,
    VisionForensicData,
    CrossVerifyData
} from './LiveAutonomousWorkspacePanel';
import { Sparkles, Shield, GitCompare, Eye } from 'lucide-react';

export interface ActiveVideoView {
    filename: string;
    videoUrl: string;
    fileSizeMb?: number;
    filePath?: string;
}

interface DirectorRightPanelProps {
    open: boolean;
    onClose: () => void;
    activeVideo: ActiveVideoView | null;
    onClearActiveVideo?: () => void;
    onSelectVideo?: (video: ActiveVideoView) => void;
    onAttachFile?: (file: { name: string; path: string }) => void;
    commandLogs?: CommandLogItem[];
    browserSnapshot?: BrowserSnapshotData | null;
    visionData?: VisionForensicData | null;
    crossVerifyData?: CrossVerifyData | null;
    governanceMode?: 'copilot' | 'full_auto';
    onToggleGovernanceMode?: () => void;
    onExecuteManualCommand?: (cmd: string) => Promise<void>;
    defaultTab?: DockTab;
    activeTab?: DockTab;
    onTabChange?: (tab: DockTab) => void;
}

export type DockTab = 'menu' | 'preview' | 'files' | 'browser' | 'vision' | 'local_pc' | 'terminal' | 'backlot' | 'cross_diff';

export const TAB_DEFINITIONS: Record<DockTab, {
    label: string;
    shortLabel: string;
    icon: React.ComponentType<any>;
    color: string;
    description: string;
}> = {
    menu: { label: '홈', shortLabel: '홈', icon: Home, color: 'text-primary', description: '실시간 AI 작업 관찰 데스크 & 퀵 액션' },
    browser: { label: '브라우저', shortLabel: '브라우저', icon: Globe, color: 'text-cyan-500', description: 'AI 실시간 웹 탐색 & 9:16 모바일 뷰' },
    vision: { label: '비전 실측', shortLabel: '비전 실측', icon: Eye, color: 'text-amber-500', description: 'OmniRoute 키프레임 & 시각 요소 실측' },
    files: { label: '작업 파일', shortLabel: '작업 파일', icon: FileText, color: 'text-blue-500', description: '02_Operations 작업 디렉토리 탐색기' },
    backlot: { label: '완성 영상', shortLabel: '완성 영상', icon: Film, color: 'text-purple-500', description: '05_Exports 최종 완성본 영상 보관함' },
    preview: { label: '영상 재생', shortLabel: '영상 재생', icon: Play, color: 'text-rose-500', description: '9:16 화면 꽉 찬 쇼츠 플레이어' },
    // Retained for backward-compatibility if programmatically triggered
    terminal: { label: '인터랙션', shortLabel: '인터랙션', icon: Terminal, color: 'text-emerald-500', description: '로컬 OS 커맨드 & 인터랙티브 콘솔' },
    cross_diff: { label: 'AI 크로스', shortLabel: '크로스', icon: Sparkles, color: 'text-purple-500', description: '아스트라 지능 + 제미나이 물리 교차 검증' },
    local_pc: { label: '로컬 PC', shortLabel: '로컬PC', icon: Cpu, color: 'text-emerald-500', description: 'GPU/CPU 런타임 & 포트 통신 상태' },
};

export const DirectorRightPanel: React.FC<DirectorRightPanelProps> = ({
    open,
    onClose,
    activeVideo,
    onClearActiveVideo,
    onSelectVideo,
    onAttachFile,
    commandLogs = [],
    browserSnapshot,
    visionData,
    crossVerifyData,
    governanceMode = 'full_auto',
    onToggleGovernanceMode,
    onExecuteManualCommand,
    defaultTab = 'menu',
    activeTab,
    onTabChange,
}) => {
    const [internalDockTab, setInternalDockTab] = useState<DockTab>(defaultTab);
    const activeDockTab = activeTab !== undefined ? activeTab : internalDockTab;
    const setActiveDockTab = (tab: DockTab) => {
        setInternalDockTab(tab);
        onTabChange?.(tab);
    };

    // Auto-sync with external tab trigger
    useEffect(() => {
        if (activeTab && activeTab !== activeDockTab) {
            setActiveDockTab(activeTab);
        }
    }, [activeTab]);

    const [manualCmd, setManualCmd] = useState('');
    const [isExecutingCmd, setIsExecutingCmd] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [copied, setCopied] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const terminalBottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Dynamic data states
    const [workspaceCategories, setWorkspaceCategories] = useState<any[]>([]);
    const [exportsList, setExportsList] = useState<any[]>([]);
    const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
    const [browserUrl, setBrowserUrl] = useState('https://www.google.com/search?igu=1');
    const [browserMode, setBrowserMode] = useState<'snapshot' | 'live'>('snapshot');
    const [localBrowserSnapshot, setLocalBrowserSnapshot] = useState<BrowserSnapshotData | null>(browserSnapshot || null);
    const [isSearchingBrowser, setIsSearchingBrowser] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [isMenuDropdownOpen, setIsMenuDropdownOpen] = useState(false);

    // Backlot (05_Exports) Visual Gallery & Filter States
    const [backlotViewMode, setBacklotViewMode] = useState<'grid' | 'list'>('grid');
    const [backlotSearch, setBacklotSearch] = useState('');
    const [backlotSort, setBacklotSort] = useState<'newest' | 'oldest' | 'size'>('newest');

    // Files (02_Operations) Visual Filter & Category States
    const [filesTypeFilter, setFilesTypeFilter] = useState<'all' | 'video' | 'image' | 'audio' | 'data'>('all');
    const [filesSearch, setFilesSearch] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
        '01_Inbox': true,
        '02_Operations': true,
        '05_Exports': false
    });
    const toggleFolderExpand = (folderId: string) => {
        setExpandedFolders(prev => ({
            ...prev,
            [folderId]: !(prev[folderId] ?? true)
        }));
    };

    useEffect(() => {
        if (browserSnapshot) {
            setLocalBrowserSnapshot(browserSnapshot);
            setBrowserMode('snapshot');
        }
    }, [browserSnapshot]);

    const handleExecuteBrowserSearch = async (queryOrUrl: string) => {
        if (!queryOrUrl.trim() || isSearchingBrowser) return;
        setIsSearchingBrowser(true);
        toast.info('구글 실시간 검색 및 화면 캡처 중...');
        try {
            const isUrl = queryOrUrl.startsWith('http://') || queryOrUrl.startsWith('https://');
            const payload = isUrl ? { url: queryOrUrl } : { query: queryOrUrl };
            const res = await fetch('/api/agent/browser-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                setLocalBrowserSnapshot(data);
                setBrowserMode('snapshot');
                if (data.url) setBrowserUrl(data.url);
                toast.success('검색 결과 및 화면 캡처가 완료되었습니다.');
            } else {
                toast.error('검색 요청 실패');
            }
        } catch (e: any) {
            toast.error(`검색 통신 오류: ${e.message}`);
        } finally {
            setIsSearchingBrowser(false);
        }
    };

    const handleOpenGoogleLogin = async () => {
        toast.info('구글 영구 세션 로그인 창을 여는 중...');
        try {
            const res = await fetch('/api/agent/browser-login-window', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: 'https://accounts.google.com' })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('구글 로그인 창이 열렸습니다. 로그인 완료 후 창을 닫으시면 세션이 영구 보존됩니다.');
            } else {
                toast.error(`로그인 창 실행 실패: ${data.error}`);
            }
        } catch (e: any) {
            toast.error(`통신 오류: ${e.message}`);
        }
    };

    // Browser Navigation History & Controls
    const [browserHistory, setBrowserHistory] = useState<string[]>(['https://www.google.com/search?igu=1']);
    const [historyIndex, setHistoryIndex] = useState<number>(0);
    const [iframeKey, setIframeKey] = useState<number>(0);

    const navigateToUrl = (newUrl: string, recordHistory = true) => {
        if (!newUrl.trim()) return;
        const formatted = (newUrl.startsWith('http://') || newUrl.startsWith('https://')) 
            ? newUrl.trim() 
            : (browserMode === 'live' ? `https://www.google.com/search?igu=1&q=${encodeURIComponent(newUrl.trim())}` : newUrl.trim());
        setBrowserUrl(formatted);
        if (recordHistory) {
            setBrowserHistory(prev => {
                const nextHistory = prev.slice(0, historyIndex + 1);
                return [...nextHistory, formatted];
            });
            setHistoryIndex(prev => prev + 1);
        }
        if (browserMode === 'snapshot') {
            handleExecuteBrowserSearch(formatted);
        } else {
            setIframeKey(k => k + 1);
        }
    };

    const handleGoBack = () => {
        if (historyIndex > 0) {
            const prevIndex = historyIndex - 1;
            setHistoryIndex(prevIndex);
            const prevUrl = browserHistory[prevIndex];
            setBrowserUrl(prevUrl);
            if (browserMode === 'snapshot') {
                handleExecuteBrowserSearch(prevUrl);
            } else {
                setIframeKey(k => k + 1);
            }
        } else {
            handleGoHome();
        }
    };

    const handleGoForward = () => {
        if (historyIndex < browserHistory.length - 1) {
            const nextIndex = historyIndex + 1;
            setHistoryIndex(nextIndex);
            const nextUrl = browserHistory[nextIndex];
            setBrowserUrl(nextUrl);
            if (browserMode === 'snapshot') {
                handleExecuteBrowserSearch(nextUrl);
            } else {
                setIframeKey(k => k + 1);
            }
        }
    };

    const handleGoHome = () => {
        const homeUrl = 'https://www.google.com/search?igu=1';
        setBrowserUrl(homeUrl);
        setLocalBrowserSnapshot(null);
        setBrowserHistory(prev => [...prev, homeUrl]);
        setHistoryIndex(prev => prev + 1);
        setIframeKey(k => k + 1);
        toast.info('구글 홈으로 이동했습니다.');
    };

    const handleRefreshBrowser = () => {
        setIframeKey(k => k + 1);
        if (browserMode === 'snapshot' && browserUrl) {
            handleExecuteBrowserSearch(browserUrl);
        } else {
            toast.success('화면을 새로고침했습니다.');
        }
    };

    // Auto-switch to preview when a video is explicitly opened
    useEffect(() => {
        if (activeVideo) {
            setActiveDockTab('preview');
        }
    }, [activeVideo]);

    // Auto-switch to vision or cross_diff when autonomous data arrives
    useEffect(() => {
        if (visionData) {
            setActiveDockTab('vision');
        }
    }, [visionData]);

    useEffect(() => {
        if (crossVerifyData) {
            setActiveDockTab('cross_diff');
        }
    }, [crossVerifyData]);

    // Auto-scroll terminal
    useEffect(() => {
        if (activeDockTab === 'terminal') {
            terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [commandLogs, terminalLogs, activeDockTab]);

    const handleCommandSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCmd.trim() || isExecutingCmd) return;
        const cmdToSend = manualCmd.trim();
        setManualCmd('');
        setIsExecutingCmd(true);
        try {
            if (onExecuteManualCommand) {
                await onExecuteManualCommand(cmdToSend);
            }
        } finally {
            setIsExecutingCmd(false);
        }
    };

    // Fetch exports
    const fetchExports = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sovereign-presets/exports-list');
            if (res.ok) {
                const data = await res.json();
                setExportsList(data.exports || []);
            }
        } catch (e) {
            console.error('Failed to load exports:', e);
        } finally {
            setLoading(false);
        }
    };

    // Fetch workspace files
    const fetchWorkspaceFiles = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sovereign-presets/workspace-files');
            if (res.ok) {
                const data = await res.json();
                setWorkspaceCategories(data.categories || []);
            }
        } catch (e) {
            console.error('Failed to load workspace files:', e);
        } finally {
            setLoading(false);
        }
    };

    // Fetch live logs
    const fetchLiveLogs = async () => {
        try {
            const res = await fetch('/api/sovereign-presets/live-logs');
            if (res.ok) {
                const data = await res.json();
                setTerminalLogs(data.logs || []);
            }
        } catch (e) {
            console.error('Failed to load logs:', e);
        }
    };

    useEffect(() => {
        if (!open) return;
        if (activeDockTab === 'backlot') fetchExports();
        if (activeDockTab === 'files') fetchWorkspaceFiles();
    }, [open, activeDockTab]);

    if (!open) return null;

    const handleCopyPath = (path: string) => {
        navigator.clipboard.writeText(path);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('경로가 클립보드에 복사되었습니다.');
    };

    const handleDownload = (videoUrl: string, filename: string) => {
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(`${filename} 다운로드를 시작했습니다.`);
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play();
            setIsPlaying(true);
        }
    };

    const handleNativeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        Array.from(files).forEach((f) => {
            const filePath = (f as any).path || URL.createObjectURL(f);
            onAttachFile?.({ name: f.name, path: filePath });
        });
        toast.success(`${files.length}개 파일이 작업 대화창에 첨부되었습니다.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <aside className={`${
            isMaximized ? 'w-full md:w-[760px]' : 'w-full md:w-[480px] lg:w-[500px] xl:w-[540px]'
        } border-l border-border/80 bg-card flex flex-col h-full transition-all duration-200 z-20 shrink-0 select-none`}>
            
            {/* Hidden native file input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleNativeFileSelect} 
                multiple 
                className="hidden" 
            />

            {/* Unified Sovereign Workspace Deck (자동화 영상제작 5대 핵심 탭 - 단 1줄 40px) */}
            <div className="h-10 px-2 border-b border-border/80 flex items-center justify-between bg-muted/20 gap-1.5 shrink-0 select-none">
                {/* 5 Core Production Tabs (Auto-Proportional, Zero Truncation, 100% Readable) */}
                <div className="flex items-center gap-1 flex-1 min-w-0 py-0.5">
                    {([
                        'menu', 
                        'browser', 
                        'vision', 
                        'files', 
                        'backlot',
                        ...(activeVideo ? ['preview' as DockTab] : [])
                    ] as DockTab[]).map((tabKey) => {
                        const def = TAB_DEFINITIONS[tabKey];
                        if (!def) return null;
                        const Icon = def.icon;
                        const isActive = activeDockTab === tabKey;
                        const isLive = tabKey === 'browser' && (isSearchingBrowser || Boolean(localBrowserSnapshot || browserSnapshot));
                        const badgeCount = tabKey === 'backlot' && exportsList.length > 0 ? exportsList.length : undefined;

                        return (
                            <button
                                key={tabKey}
                                type="button"
                                onClick={() => setActiveDockTab(tabKey)}
                                title={`${def.label}: ${def.description}`}
                                className={`flex-1 min-w-0 h-7.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs select-none ${
                                    isActive
                                        ? 'bg-card border border-border/90 text-foreground font-bold shadow-xs ring-1 ring-primary/20'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                            >
                                <Icon className={`w-3.5 h-3.5 ${def.color} shrink-0`} />
                                <span className="truncate">{def.shortLabel}</span>
                                {isLive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                )}
                                {badgeCount !== undefined && (
                                    <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.2 rounded-full font-bold shrink-0">
                                        {badgeCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Right Action Icons: Compact Auto Chip, Maximize, Close */}
                <div className="flex items-center gap-1 shrink-0">
                    {onToggleGovernanceMode && (
                        <button
                            type="button"
                            onClick={onToggleGovernanceMode}
                            title={`현재 거버넌스: ${governanceMode === 'copilot' ? 'Co-Pilot (확인 후 실행)' : 'Full-Auto (자율 실행)'}`}
                            className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                        >
                            <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>{governanceMode === 'copilot' ? 'CoPilot' : 'Auto'}</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsMaximized(!isMaximized)}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        title={isMaximized ? "원래 크기로" : "최대화"}
                    >
                        {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        title="닫기"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Panel Body (Full Screen Zero Padding for Preview, Standard Padded for Other Tabs) */}
            <div className={`flex-1 overflow-y-auto flex flex-col ${
                activeDockTab === 'preview' ? 'p-0 overflow-hidden bg-neutral-950' : 'p-3.5 space-y-3.5'
            }`}>
                
                {/* 1. Main Action Hub Menu (Real-Time Observability Dashboard) */}
                {activeDockTab === 'menu' && (
                    <div className="space-y-3.5 max-w-md mx-auto w-full">
                        
                        {/* A. Real-Time AI System & Session Monitor Card */}
                        <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-foreground">AI 작업 관찰 데스크</h4>
                                        <p className="text-[10.5px] text-muted-foreground">실시간 브라우저 · 비전 · 터미널 관찰</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>실시간 가동 중</span>
                                </div>
                            </div>

                            {/* 3-Pillar Status Metric Chips */}
                            <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-border/50 text-[11px]">
                                <div className="p-2 rounded-xl bg-muted/30 border border-border/60 text-center space-y-0.5">
                                    <span className="text-[10px] text-muted-foreground block">작업 경로</span>
                                    <span className="font-bold text-foreground font-mono text-[10.5px] truncate block" title="02_Operations">02_Operations</span>
                                </div>
                                <div className="p-2 rounded-xl bg-muted/30 border border-border/60 text-center space-y-0.5">
                                    <span className="text-[10px] text-muted-foreground block">완성 결과물</span>
                                    <span className="font-bold text-primary font-mono text-[10.5px] block">
                                        {exportsList.length > 0 ? `${exportsList.length}개 보관` : '0개'}
                                    </span>
                                </div>
                                <div className="p-2 rounded-xl bg-muted/30 border border-border/60 text-center space-y-0.5">
                                    <span className="text-[10px] text-muted-foreground block">거버넌스</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[10.5px] block">
                                        {governanceMode === 'copilot' ? 'Co-Pilot' : 'Full-Auto'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* B. Live AI Autonomous Action Pulse Alert Banner */}
                        {(isSearchingBrowser || localBrowserSnapshot || browserSnapshot) && (
                            <div 
                                onClick={() => setActiveDockTab('browser')}
                                className="p-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/15 transition-all flex items-center justify-between cursor-pointer group shadow-2xs"
                            >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shrink-0" />
                                    <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300 truncate">
                                        {isSearchingBrowser ? '🔍 AI가 웹을 실시간 탐색 중입니다...' : '🌐 수집된 웹 레퍼런스 화면 대기 중'}
                                    </span>
                                </div>
                                <span className="text-[10.5px] font-bold text-cyan-600 dark:text-cyan-400 group-hover:underline shrink-0">
                                    화면 보기 →
                                </span>
                            </div>
                        )}

                        {/* C. Recent Export Quick Preview Card */}
                        {exportsList.length > 0 && (
                            <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Film className="w-3.5 h-3.5 text-primary" />
                                        최신 완성본 퀵 프리뷰
                                    </span>
                                    <button 
                                        type="button" 
                                        onClick={() => setActiveDockTab('backlot')}
                                        className="text-[10.5px] text-primary hover:underline font-semibold cursor-pointer"
                                    >
                                        전체 보기 ({exportsList.length}) →
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/60 hover:bg-muted/70 transition-colors">
                                    <div className="flex items-center gap-2 truncate max-w-[240px]">
                                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                            <Play className="w-3 h-3 fill-primary" />
                                        </div>
                                        <span className="text-xs font-medium text-foreground truncate">
                                            {exportsList[0]?.name || exportsList[0]?.filename || '최신 완성 영상'}
                                        </span>
                                    </div>
                                    {onSelectVideo && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const f = exportsList[0];
                                                onSelectVideo({
                                                    filename: f.name || f.filename,
                                                    videoUrl: f.url || f.stream_url,
                                                    filePath: f.path || f.absolute_path
                                                });
                                                setActiveDockTab('preview');
                                            }}
                                            className="px-2 py-0.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-2xs hover:bg-primary/90 transition-all cursor-pointer"
                                        >
                                            재생
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* D. 4 Core Action Cards with 3D Hover & Semantics */}
                        <div className="space-y-2 pt-0.5">
                            <span className="text-[11px] font-bold text-muted-foreground px-0.5 block">
                                바로가기 & 빠른 작업
                            </span>
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveDockTab('browser')}
                                    className="w-full h-11 px-3.5 rounded-xl border border-border/80 hover:border-cyan-500/50 bg-card hover:bg-muted/50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs flex items-center justify-between text-xs font-semibold text-foreground group cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500 shrink-0">
                                            <Globe className="w-4 h-4" />
                                        </div>
                                        <span>구글 & 유튜브 실시간 웹 탐색</span>
                                    </div>
                                    <span className="text-[10.5px] text-muted-foreground font-mono group-hover:text-cyan-500">열기 →</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleOpenGoogleLogin}
                                    className="w-full h-11 px-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400 group cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
                                            <Shield className="w-4 h-4" />
                                        </div>
                                        <span>구글 로그인 세션 브라우저</span>
                                    </div>
                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">영구 보존</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-11 px-3.5 rounded-xl border border-dashed border-border/90 hover:border-primary/60 bg-card hover:bg-muted/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs flex items-center justify-between text-xs font-medium text-foreground group cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                            <FolderPlus className="w-4 h-4" />
                                        </div>
                                        <span>내 PC에서 미디어/파일 직접 첨부</span>
                                    </div>
                                    <span className="text-[10.5px] text-muted-foreground font-semibold">+ 첨부</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveDockTab('backlot')}
                                    className="w-full h-11 px-3.5 rounded-xl border border-border/80 hover:border-primary/50 bg-card hover:bg-muted/50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs flex items-center justify-between text-xs font-semibold text-foreground group cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                            <Film className="w-4 h-4" />
                                        </div>
                                        <span>완성된 영상 결과물 보관함</span>
                                    </div>
                                    <span className="text-[10.5px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                        {exportsList.length > 0 ? `${exportsList.length}개 보관` : '05_Exports'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Footnote */}
                        <p className="text-[10.5px] text-muted-foreground/70 text-center leading-relaxed pt-1">
                            대화 중 AI가 구글 검색, 영상 수집, 비전 분석을 수행하면 화면이 실시간으로 관찰창에 공유됩니다.
                        </p>
                    </div>
                )}

                {/* 2. Files Tab: Smart Categorized & Visual Asset Explorer */}
                {activeDockTab === 'files' && (
                    <div className="flex-1 flex flex-col space-y-2.5">
                        {/* Header & Search */}
                        <div className="flex items-center justify-between gap-2 shrink-0">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-primary" />
                                <span>작업 자원 탐색기</span>
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={fetchWorkspaceFiles}
                                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                    title="새로고침"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* Search & Type Filter Chips */}
                        <div className="space-y-1.5 shrink-0">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={filesSearch}
                                    onChange={(e) => setFilesSearch(e.target.value)}
                                    placeholder="작업 파일 검색..."
                                    className="w-full h-7 pl-8 pr-3 text-xs rounded-lg bg-muted/40 border border-border/80 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            {/* Media Type Filter Bar */}
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                                {[
                                    { key: 'all', label: '전체' },
                                    { key: 'video', label: '🎬 영상' },
                                    { key: 'image', label: '🖼️ 스케치' },
                                    { key: 'audio', label: '🎵 음성' },
                                    { key: 'data', label: '📄 데이터' },
                                ].map((typeChip) => (
                                    <button
                                        key={typeChip.key}
                                        type="button"
                                        onClick={() => setFilesTypeFilter(typeChip.key as any)}
                                        className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold transition-all shrink-0 cursor-pointer ${
                                            filesTypeFilter === typeChip.key
                                                ? 'bg-primary text-primary-foreground shadow-2xs'
                                                : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                                        }`}
                                    >
                                        {typeChip.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Folders & Categorized Visual Cards */}
                        <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
                            {workspaceCategories.map((cat) => {
                                const isExpanded = expandedFolders[cat.id] ?? true;
                                
                                // Filter files by search and type
                                const filteredFiles = (cat.files || []).filter((f: any) => {
                                    if (filesSearch.trim() && !f.name.toLowerCase().includes(filesSearch.toLowerCase())) {
                                        return false;
                                    }
                                    if (filesTypeFilter === 'video') return f.is_video || f.name.endsWith('.mp4');
                                    if (filesTypeFilter === 'image') return f.name.endsWith('.png') || f.name.endsWith('.jpg') || f.name.endsWith('.webp');
                                    if (filesTypeFilter === 'audio') return f.name.endsWith('.wav') || f.name.endsWith('.mp3');
                                    if (filesTypeFilter === 'data') return f.name.endsWith('.json') || f.name.endsWith('.txt');
                                    return true;
                                });

                                const images = filteredFiles.filter((f: any) => f.name.endsWith('.png') || f.name.endsWith('.jpg') || f.name.endsWith('.webp'));
                                const nonImages = filteredFiles.filter((f: any) => !(f.name.endsWith('.png') || f.name.endsWith('.jpg') || f.name.endsWith('.webp')));

                                return (
                                    <div key={cat.id} className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs transition-all">
                                        {/* Folder Accordion Header */}
                                        <div 
                                            onClick={() => toggleFolderExpand(cat.id)}
                                            className="px-3 py-2 bg-muted/30 hover:bg-muted/50 flex items-center justify-between cursor-pointer select-none transition-colors border-b border-border/50"
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
                                                <span className="font-bold text-xs text-foreground truncate">{cat.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[10px] font-semibold text-muted-foreground bg-card border border-border px-1.5 py-0.2 rounded-md">
                                                    {filteredFiles.length}개
                                                </span>
                                                <span className="text-muted-foreground text-xs">{isExpanded ? '▾' : '▸'}</span>
                                            </div>
                                        </div>

                                        {/* Folder Content Body */}
                                        {isExpanded && (
                                            <div className="p-2 space-y-2">
                                                {filteredFiles.length === 0 ? (
                                                    <p className="text-[11px] text-muted-foreground text-center py-3">
                                                        일치하는 파일이 없습니다.
                                                    </p>
                                                ) : (
                                                    <>
                                                        {/* Visual Image Grid (If Images exist) */}
                                                        {images.length > 0 && (
                                                            <div className="space-y-1">
                                                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 px-1">
                                                                    <Image className="w-3 h-3 text-cyan-500" />
                                                                    <span>이미지 & 스케치 썸네일 ({images.length})</span>
                                                                </div>
                                                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                                                                    {images.map((img: any, iIdx: number) => (
                                                                        <div 
                                                                            key={iIdx}
                                                                            onClick={() => onAttachFile?.({ name: img.name, path: img.absolute_path || img.stream_url })}
                                                                            className="aspect-square rounded-lg border border-border overflow-hidden bg-neutral-900 relative group cursor-pointer hover:border-primary transition-all hover:scale-105 shadow-2xs"
                                                                            title={`${img.name} (${img.size_mb}MB) - 클릭 시 대화창에 첨부`}
                                                                        >
                                                                            <img 
                                                                                src={img.stream_url || img.absolute_path} 
                                                                                alt={img.name}
                                                                                className="w-full h-full object-cover"
                                                                                loading="lazy"
                                                                            />
                                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1 text-[9px] text-white">
                                                                                <span className="truncate">{img.name}</span>
                                                                                <span className="text-primary font-bold">+ 첨부</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Media & Data Files List */}
                                                        {nonImages.length > 0 && (
                                                            <div className="space-y-1 pt-1">
                                                                {images.length > 0 && (
                                                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 px-1">
                                                                        <Film className="w-3 h-3 text-purple-500" />
                                                                        <span>미디어 및 데이터 ({nonImages.length})</span>
                                                                    </div>
                                                                )}
                                                                {nonImages.map((file: any, fIdx: number) => {
                                                                    const isVid = file.is_video || file.name.endsWith('.mp4');
                                                                    const isAud = file.name.endsWith('.wav') || file.name.endsWith('.mp3');
                                                                    return (
                                                                        <div 
                                                                            key={fIdx}
                                                                            className="flex items-center justify-between p-2 rounded-lg bg-muted/20 hover:bg-muted/50 border border-border/50 text-[11px] text-foreground transition-all group shadow-2xs"
                                                                        >
                                                                            <div className="flex items-center gap-2 truncate max-w-[240px]">
                                                                                {isVid ? (
                                                                                    <Film className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                                                                ) : isAud ? (
                                                                                    <Music className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                                                ) : (
                                                                                    <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                                                )}
                                                                                <span className="truncate font-medium">{file.name}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                                <span className="text-[10px] text-muted-foreground font-mono tabular-nums">{file.size_mb}MB</span>
                                                                                {isVid && onSelectVideo && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            onSelectVideo({
                                                                                                filename: file.name,
                                                                                                videoUrl: file.stream_url,
                                                                                                fileSizeMb: file.size_mb,
                                                                                                filePath: file.absolute_path
                                                                                            });
                                                                                            setActiveDockTab('preview');
                                                                                        }}
                                                                                        className="px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold shadow-2xs hover:bg-primary/90 transition-colors cursor-pointer"
                                                                                    >
                                                                                        시사회
                                                                                    </button>
                                                                                )}
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => onAttachFile?.({ name: file.name, path: file.absolute_path || file.stream_url })}
                                                                                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                                                                                    title="대화창에 첨부"
                                                                                >
                                                                                    <Plus className="w-3 h-3" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 3. Browser Tab (Google Search & Playwright Snapshot Mirror) */}
                {activeDockTab === 'browser' && (
                    <div className="flex-1 flex flex-col space-y-3">
                        {/* URL / Search Input Bar with Browser Navigation Controls */}
                        <div className="flex items-center gap-1.5">
                            {/* Browser Navigation buttons (Back, Forward, Home, Refresh) */}
                            <div className="flex items-center bg-muted/50 border border-border/80 rounded-lg p-0.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={handleGoBack}
                                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors cursor-pointer"
                                    title="뒤로 가기"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleGoForward}
                                    disabled={historyIndex >= browserHistory.length - 1}
                                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors disabled:opacity-30 cursor-pointer"
                                    title="앞으로 가기"
                                >
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleGoHome}
                                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors cursor-pointer"
                                    title="홈으로 (구글 첫 화면)"
                                >
                                    <Home className="w-3.5 h-3.5 text-primary" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRefreshBrowser}
                                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors cursor-pointer"
                                    title="새로고침"
                                >
                                    <RotateCw className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <form 
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    navigateToUrl(browserUrl);
                                }}
                                className="flex items-center gap-1.5 flex-1 min-w-0"
                            >
                                <div className="relative flex-1 min-w-0">
                                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={browserUrl}
                                        onChange={(e) => setBrowserUrl(e.target.value)}
                                        className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-xs text-foreground font-mono focus:outline-hidden truncate"
                                        placeholder="구글 검색어 또는 URL 입력..."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSearchingBrowser}
                                    className="h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 disabled:opacity-50 cursor-pointer shrink-0"
                                    title="검색 또는 웹페이지 접속"
                                >
                                    <Globe className={`w-3.5 h-3.5 ${isSearchingBrowser ? 'animate-spin' : ''}`} />
                                    <span>이동</span>
                                </button>
                            </form>
                        </div>

                        {/* Mode Toggle & Quick Direct Shortcuts */}
                        <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setBrowserMode('snapshot')}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                                        browserMode === 'snapshot' ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    스냅샷 미러 {(localBrowserSnapshot || browserSnapshot) && '●'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBrowserMode('live');
                                        if (!browserUrl.startsWith('http')) {
                                            setBrowserUrl('https://www.google.com/search?igu=1');
                                        }
                                    }}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                                        browserMode === 'live' ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    실시간 프레임
                                </button>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBrowserUrl('https://www.google.com/search?igu=1');
                                        setBrowserMode('live');
                                    }}
                                    className="px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground hover:text-foreground text-[10px]"
                                    title="구글 실시간 검색 프레임"
                                >
                                    구글 검색
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBrowserUrl('https://www.youtube.com/shorts');
                                        setBrowserMode('live');
                                    }}
                                    className="px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground hover:text-foreground text-[10px]"
                                    title="유튜브 쇼츠 탐색"
                                >
                                    Shorts
                                </button>
                                <button
                                    type="button"
                                    onClick={handleOpenGoogleLogin}
                                    className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                    title="구글 로그인 브라우저 창 열기 (로그인 후 세션이 04_Profiles에 영구 보존됩니다)"
                                >
                                    <Shield className="w-3 h-3" />
                                    <span>구글 로그인 세션</span>
                                </button>
                            </div>
                        </div>

                        {/* Snapshot Mirror View */}
                        {browserMode === 'snapshot' && (
                            <div className="flex-1 overflow-y-auto space-y-3">
                                {/* Live AI Search & Observability Status Bar */}
                                <div className="p-2.5 rounded-xl border border-primary/30 bg-primary/5 space-y-1.5 shadow-2xs">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span>AI 모델 실시간 웹 탐색 & 관찰 데스크</span>
                                        </div>
                                        <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-semibold">
                                            {isSearchingBrowser ? '실시간 탐색 중...' : '관찰 대기 / 완료'}
                                        </span>
                                    </div>
                                    {/* 4-Step Pipeline Flow */}
                                    <div className="grid grid-cols-4 gap-1 text-[10px] text-center pt-1 font-medium">
                                        <div className={`p-1 rounded-md ${isSearchingBrowser ? 'bg-primary/20 text-primary font-bold' : 'bg-muted/60 text-foreground'}`}>
                                            1. 🔍 검색 질의
                                        </div>
                                        <div className={`p-1 rounded-md ${(localBrowserSnapshot || browserSnapshot) ? 'bg-primary/20 text-primary font-bold' : 'bg-muted/40 text-muted-foreground'}`}>
                                            2. 🌐 스크랩 캡처
                                        </div>
                                        <div className={`p-1 rounded-md ${visionData ? 'bg-amber-500/20 text-amber-500 font-bold' : 'bg-muted/40 text-muted-foreground'}`}>
                                            3. 📸 비전 실측
                                        </div>
                                        <div className="p-1 rounded-md bg-muted/40 text-muted-foreground">
                                            4. 🎬 대본/프리셋
                                        </div>
                                    </div>
                                </div>

                                {(localBrowserSnapshot || browserSnapshot) ? (
                                    <>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg border border-border text-xs">
                                            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                            <span className="font-mono text-muted-foreground truncate flex-1 text-[11px]">
                                                {(localBrowserSnapshot || browserSnapshot)?.url}
                                            </span>
                                            <a
                                                href={(localBrowserSnapshot || browserSnapshot)?.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-primary hover:underline flex items-center gap-0.5 text-[11px]"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>

                                        {(localBrowserSnapshot || browserSnapshot)?.screenshot_data_url && (
                                            <div className="border border-border rounded-xl overflow-hidden shadow-2xs bg-black">
                                                <div className="px-2.5 py-1 bg-zinc-900 text-zinc-400 text-[10px] flex items-center justify-between border-b border-zinc-800">
                                                    <span>Playwright Headless Window (1280x800)</span>
                                                    <span className="truncate max-w-[200px]">{(localBrowserSnapshot || browserSnapshot)?.title}</span>
                                                </div>
                                                <img
                                                    src={(localBrowserSnapshot || browserSnapshot)?.screenshot_data_url}
                                                    alt="Browser Live Screen"
                                                    className="w-full h-auto object-contain max-h-72"
                                                />
                                            </div>
                                        )}

                                        {(localBrowserSnapshot || browserSnapshot)?.search_results && ((localBrowserSnapshot || browserSnapshot)?.search_results?.length || 0) > 0 && (
                                            <div className="space-y-1.5">
                                                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                    🔍 수집된 실시간 검색 결과 ({(localBrowserSnapshot || browserSnapshot)?.search_results?.length}건)
                                                </span>
                                                <div className="space-y-1.5">
                                                    {(localBrowserSnapshot || browserSnapshot)?.search_results?.map((res, i) => (
                                                        <div key={i} className="p-2.5 rounded-lg bg-card border border-border/80 text-xs space-y-0.5">
                                                            <a href={res.url} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline truncate block">
                                                                {res.title}
                                                            </a>
                                                            <p className="text-muted-foreground text-[11px] line-clamp-2 leading-relaxed">
                                                                {res.snippet}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    /* Active Google Search Hub (Clean Initial State) */
                                    <div className="py-6 px-3 border border-border rounded-2xl bg-card/60 space-y-4">
                                        <div className="text-center space-y-1">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary mb-2">
                                                <Globe className="w-5 h-5" />
                                            </div>
                                            <h4 className="text-xs font-bold text-foreground">구글 실시간 검색 & 브라우징</h4>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                키워드를 검색하면 AI가 Playwright로 구글을 탐색하고 화면을 캡처합니다.
                                            </p>
                                        </div>

                                        <div className="space-y-1.5 pt-2 border-t border-border/60">
                                            <span className="text-[11px] font-semibold text-muted-foreground block">
                                                추천 검색 키워드
                                            </span>
                                            <div className="grid grid-cols-1 gap-1.5">
                                                {[
                                                    "🔥 2026 최신 숏폼 트렌드 키워드",
                                                    "📈 유튜브 쇼츠 급상승 떡상 소재",
                                                    "🎬 틱톡 바이럴 사연 썰 랭킹",
                                                    "💡 시청 지속시간 70% 훅 공식"
                                                ].map((chip, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => {
                                                            setBrowserUrl(chip.replace(/^[^\s]+\s/, ''));
                                                            handleExecuteBrowserSearch(chip.replace(/^[^\s]+\s/, ''));
                                                        }}
                                                        disabled={isSearchingBrowser}
                                                        className="w-full text-left px-3 py-2 rounded-xl border border-border/80 hover:border-primary/50 hover:bg-muted/50 text-xs text-foreground transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
                                                    >
                                                        <span>{chip}</span>
                                                        <Search className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Google Session Preservation Info Card */}
                                        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-xs space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-[11px]">
                                                    <Shield className="w-3.5 h-3.5" />
                                                    구글/유튜브 영구 세션 보존 (`04_Profiles`)
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={handleOpenGoogleLogin}
                                                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                                >
                                                    로그인 창 열기 →
                                                </button>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                구글/유튜브에 1회 로그인해 두시면 쿠키 및 인증이 영구 보존되어, 검색 봇 차단(reCAPTCHA)을 우회하고 최신 떡상 영상과 채널 알고리즘 데이터를 실시간 수집할 수 있습니다.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Live iframe View (Clean Google Universal Frame) */}
                        {browserMode === 'live' && (
                            <div className="flex-1 rounded-xl border border-border/80 overflow-hidden bg-background min-h-[360px]">
                                <iframe 
                                    key={iframeKey}
                                    src={browserUrl.startsWith('http') ? browserUrl : `https://www.google.com/search?igu=1&q=${encodeURIComponent(browserUrl)}`}
                                    className="w-full h-full border-none min-h-[360px]"
                                    title="Embedded Browser Frame"
                                    allow="clipboard-read; clipboard-write"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* 4. Terminal Tab: Live interactive console & logs */}
                {activeDockTab === 'terminal' && (
                    <div className="flex-1 flex flex-col space-y-2 h-full">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                                <Terminal className="w-3.5 h-3.5 text-sky-500" />
                                PowerShell Core (UTF-8) • Host Sandbox
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={fetchLiveLogs}
                                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                                    title="새로고침"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTerminalLogs([])}
                                    className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded-md border border-border"
                                >
                                    콘솔 비우기
                                </button>
                            </div>
                        </div>

                        {/* Terminal Body */}
                        <div className="flex-1 bg-neutral-950 text-neutral-200 font-mono text-[11px] p-3 rounded-xl border border-neutral-800 overflow-y-auto space-y-2 select-text min-h-[240px]">
                            {commandLogs.length > 0 ? (
                                commandLogs.map((log) => (
                                    <div key={log.id} className="space-y-1">
                                        <div className="flex items-center justify-between text-zinc-400 bg-zinc-900/60 px-2 py-1 rounded">
                                            <span className="flex items-center gap-1.5 text-emerald-400">
                                                <span className="text-zinc-500">$</span>
                                                <span className="font-semibold break-all">{log.cmd}</span>
                                            </span>
                                            <span className="flex items-center gap-2 text-[10px] shrink-0 ml-2">
                                                <span className={log.exit_code === 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                    exit {log.exit_code}
                                                </span>
                                                <span className="text-zinc-500">{log.duration_ms}ms</span>
                                            </span>
                                        </div>
                                        {log.stdout && (
                                            <pre className="text-zinc-300 pl-3 border-l-2 border-zinc-800 whitespace-pre-wrap break-all leading-relaxed max-h-48 overflow-y-auto">
                                                {log.stdout}
                                            </pre>
                                        )}
                                        {log.stderr && (
                                            <pre className="text-rose-400 pl-3 border-l-2 border-rose-900/50 whitespace-pre-wrap break-all leading-relaxed max-h-32 overflow-y-auto">
                                                {log.stderr}
                                            </pre>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-zinc-500 py-12 text-center">
                                    <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-400" />
                                    <p className="font-semibold text-zinc-300">PowerShell Core 샌드박스 대기 중</p>
                                    <p className="text-[11px] mt-1 text-zinc-500">
                                        AI 에이전트(아스트라, 제미나이, 옴니루트)가 영상 제작 명령을 내리면<br />
                                        yt-dlp 다운로드, ffmpeg 변환, 미디어 조립 과정이 실시간으로 출력됩니다.
                                    </p>
                                    <p className="text-[10px] mt-2 text-zinc-600">하단 입력창을 통해 대표님께서 직접 명령어를 테스트하실 수도 있습니다.</p>
                                </div>
                            )}
                            <div ref={terminalBottomRef} />
                        </div>

                        {/* Interactive Human Takeover Terminal Input */}
                        <form onSubmit={handleCommandSubmit} className="p-2 bg-neutral-900 rounded-xl border border-neutral-800 flex items-center gap-2">
                            <span className="text-emerald-400 font-bold pl-1 text-xs">&gt;</span>
                            <input
                                type="text"
                                value={manualCmd}
                                onChange={(e) => setManualCmd(e.target.value)}
                                placeholder="명령어 직접 실행 (예: yt-dlp --version, ffmpeg -version, dir)"
                                disabled={isExecutingCmd}
                                className="flex-1 bg-transparent border-0 text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden text-xs font-mono"
                            />
                            <button
                                type="submit"
                                disabled={!manualCmd.trim() || isExecutingCmd}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-xs disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <Play className="w-3 h-3 fill-white" />
                                <span>실행</span>
                            </button>
                        </form>
                    </div>
                )}

                {/* 5. Vision Forensic Canvas Tab */}
                {activeDockTab === 'vision' && (
                    <div className="flex-1 flex flex-col space-y-3 overflow-y-auto">
                        <div className="flex items-center justify-between text-xs font-bold text-foreground">
                            <span className="flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-amber-500" />
                                AI 비전 포렌식 캔버스
                            </span>
                        </div>

                        {visionData ? (
                            <div className="space-y-3">
                                {/* Vertical 9:16 Video Frame with SVG Neon Overlay */}
                                <div className="relative border border-border rounded-xl overflow-hidden bg-black flex items-center justify-center p-2">
                                    {visionData.frame_data_url ? (
                                        <div className="relative inline-block w-full max-w-[240px]">
                                            <img
                                                src={visionData.frame_data_url}
                                                alt="Forensic Frame"
                                                className="w-full h-auto block rounded-lg"
                                            />
                                            {/* SVG Neon Bounding Boxes */}
                                            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                                {visionData.bounding_boxes?.map((b, i) => {
                                                    const [x1, y1, x2, y2] = b.box;
                                                    return (
                                                        <g key={i}>
                                                            <rect
                                                                x={`${x1 * 100}%`}
                                                                y={`${y1 * 100}%`}
                                                                width={`${(x2 - x1) * 100}%`}
                                                                height={`${(y2 - y1) * 100}%`}
                                                                fill="none"
                                                                stroke={b.color}
                                                                strokeWidth="2"
                                                                strokeDasharray="4 2"
                                                            />
                                                            <text
                                                                x={`${x1 * 100}%`}
                                                                y={`${Math.max(5, y1 * 100 - 2)}%`}
                                                                fill={b.color}
                                                                fontSize="10"
                                                                fontWeight="bold"
                                                            >
                                                                {b.label}
                                                            </text>
                                                        </g>
                                                    );
                                                })}
                                            </svg>
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center text-xs text-muted-foreground">
                                            프레임 이미지를 로드할 수 없습니다.
                                        </div>
                                    )}
                                </div>

                                {/* Visual Metrics Cards */}
                                {visionData.visual_metrics && (
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="p-2.5 bg-card border border-border rounded-xl">
                                            <span className="text-muted-foreground block text-[10px]">평균 컷 전환 주기</span>
                                            <span className="font-bold text-foreground text-sm">{visionData.visual_metrics.avg_cut_sec || 2.8}초</span>
                                        </div>
                                        <div className="p-2.5 bg-card border border-border rounded-xl">
                                            <span className="text-muted-foreground block text-[10px]">0초 훅 오프닝 줌</span>
                                            <span className="font-bold text-foreground text-sm">
                                                +{Math.round(((visionData.visual_metrics.opening_hook_zoom || 1.15) - 1.0) * 100)}%
                                            </span>
                                        </div>
                                        <div className="p-2.5 bg-card border border-border rounded-xl">
                                            <span className="text-muted-foreground block text-[10px]">상단 볼드 타이틀</span>
                                            <span className="font-bold text-foreground text-sm">상단 {visionData.visual_metrics.title_top_pct || 12}% 위치</span>
                                        </div>
                                        <div className="p-2.5 bg-card border border-border rounded-xl">
                                            <span className="text-muted-foreground block text-[10px]">자막 Safe Zone</span>
                                            <span className="font-bold text-foreground text-sm">하단 {visionData.visual_metrics.caption_bottom_pct || 70}% 위치</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                                <Eye className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p className="text-xs font-semibold">비전 실측 캔버스 대기 중</p>
                                <p className="text-[11px] mt-0.5">레퍼런스 영상이나 이미지를 분석하면 네온 바운딩 박스와 측정값이 렌더링됩니다.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* 6. Multi-AI Cross Checking Diff Tab */}
                {activeDockTab === 'cross_diff' && (
                    <div className="flex-1 flex flex-col space-y-3 overflow-y-auto">
                        <div className="flex items-center justify-between text-xs font-bold text-foreground">
                            <span className="flex items-center gap-1.5">
                                <GitCompare className="w-3.5 h-3.5 text-pink-500" />
                                AI 크로스 체킹 (Astra ⊕ Gemini)
                            </span>
                        </div>

                        {crossVerifyData ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {/* Left: Astra Narrative DNA */}
                                    <div className="p-3 bg-card border border-primary/40 rounded-xl space-y-2">
                                        <div className="font-bold text-primary flex items-center gap-1">
                                            <span>🧠 아스트라 지능 추론</span>
                                        </div>
                                        <div className="text-muted-foreground text-[11px] leading-relaxed">
                                            {crossVerifyData.astra_analysis?.recipe || '스토리텔링 기승전결 훅 및 대본 반전 구조 정밀 분석'}
                                        </div>
                                    </div>

                                    {/* Right: Gemini Physical Metrics */}
                                    <div className="p-3 bg-card border border-emerald-500/40 rounded-xl space-y-2">
                                        <div className="font-bold text-emerald-500 flex items-center gap-1">
                                            <span>📐 제미나이 물리 실측</span>
                                        </div>
                                        <div className="text-muted-foreground text-[11px] leading-relaxed">
                                            {crossVerifyData.gemini_analysis?.caption?.safe_zone || '평균 컷 2.8초, 자막 70% Safe Zone, 76px 볼드 타이틀'}
                                        </div>
                                    </div>
                                </div>

                                {/* Hybrid Preset Result */}
                                {crossVerifyData.hybrid_preset && (
                                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-xs space-y-1.5">
                                        <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                                            <Check className="w-4 h-4 text-emerald-500" />
                                            <span>하이브리드 소버린 프리셋 합성 완료</span>
                                        </div>
                                        <div className="text-foreground font-semibold">
                                            {crossVerifyData.hybrid_preset.name}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                                <GitCompare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p className="text-xs font-semibold">AI 크로스 체킹 결과 대기 중</p>
                                <p className="text-[11px] mt-0.5">아스트라의 서사 분석과 제미나이의 물리 실측을 교차 합성한 결과가 표시됩니다.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* 5. Backlot (결과물 보관함) Tab: 05_Exports visual gallery */}
                {activeDockTab === 'backlot' && (
                    <div className="flex-1 flex flex-col min-h-0 space-y-2.5">
                        {/* Backlot Controls Toolbar */}
                        <div className="shrink-0 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <Film className="w-4 h-4 text-purple-500 shrink-0" />
                                    <span className="text-xs font-bold text-foreground truncate">
                                        완성 영상 보관함
                                    </span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold shrink-0">
                                        {exportsList.length}개
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {/* View Mode Toggle */}
                                    <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border border-border/60">
                                        <button
                                            type="button"
                                            onClick={() => setBacklotViewMode('grid')}
                                            className={`p-1 rounded-md transition-all ${
                                                backlotViewMode === 'grid'
                                                    ? 'bg-background text-foreground shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                            title="9:16 갤러리 뷰"
                                        >
                                            <LayoutGrid className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBacklotViewMode('list')}
                                            className={`p-1 rounded-md transition-all ${
                                                backlotViewMode === 'list'
                                                    ? 'bg-background text-foreground shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                            title="리스트 뷰"
                                        >
                                            <List className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={fetchExports}
                                        className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-accent transition-colors"
                                        title="새로고침"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Search and Sort Sub-bar */}
                            <div className="flex items-center gap-1.5">
                                <div className="relative flex-1">
                                    <Search className="w-3 h-3 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={backlotSearch}
                                        onChange={(e) => setBacklotSearch(e.target.value)}
                                        placeholder="영상 검색..."
                                        className="w-full pl-7 pr-2 py-1 text-[11px] rounded-lg bg-muted/50 border border-border/80 focus:border-primary focus:bg-background outline-none transition-all placeholder:text-muted-foreground/60"
                                    />
                                    {backlotSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setBacklotSearch('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-[10px]"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                <select
                                    value={backlotSort}
                                    onChange={(e) => setBacklotSort(e.target.value as any)}
                                    aria-label="영상 정렬 방식"
                                    className="px-2 py-1 text-[11px] rounded-lg bg-muted/50 border border-border/80 text-foreground outline-none cursor-pointer hover:bg-muted font-medium transition-colors"
                                >
                                    <option value="newest">최신순</option>
                                    <option value="oldest">오래된순</option>
                                    <option value="size">용량순</option>
                                </select>
                            </div>
                        </div>

                        {/* Backlot Main Content Area */}
                        {(() => {
                            const filteredList = exportsList
                                .filter(item => {
                                    if (!backlotSearch.trim()) return true;
                                    return (item.filename || '').toLowerCase().includes(backlotSearch.toLowerCase());
                                })
                                .sort((a, b) => {
                                    if (backlotSort === 'size') {
                                        return (b.size_mb || 0) - (a.size_mb || 0);
                                    }
                                    if (backlotSort === 'oldest') {
                                        return (a.modified_at || '').localeCompare(b.modified_at || '');
                                    }
                                    return (b.modified_at || '').localeCompare(a.modified_at || '');
                                });

                            if (filteredList.length === 0) {
                                return (
                                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-border rounded-xl">
                                        <Film className="w-9 h-9 text-muted-foreground/30 mb-2.5" />
                                        <p className="text-xs font-semibold text-foreground">
                                            {backlotSearch ? '검색된 영상이 없습니다.' : '완성된 영상이 아직 없습니다.'}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground mt-1 max-w-[240px]">
                                            {backlotSearch
                                                ? '다른 검색어로 검색해 보세요.'
                                                : '대화창에서 영상을 생성하면 05_Exports 보관함에 영구 보관됩니다.'}
                                        </p>
                                    </div>
                                );
                            }

                            if (backlotViewMode === 'grid') {
                                return (
                                    <div className="flex-1 overflow-y-auto pr-1">
                                        <div className="grid grid-cols-2 gap-2.5 pb-2">
                                            {filteredList.map((item, idx) => (
                                                <div
                                                    key={item.filepath || idx}
                                                    className="group/card relative aspect-[9/16] rounded-xl overflow-hidden bg-neutral-900 border border-border/80 hover:border-primary/80 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between"
                                                >
                                                    {/* Background Video Frame Preview */}
                                                    <video
                                                        src={item.stream_url}
                                                        preload="metadata"
                                                        muted
                                                        playsInline
                                                        className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-85 group-hover/card:opacity-100 group-hover/card:scale-105 transition-all duration-300"
                                                    />

                                                    {/* Top Gradient & Info Badges */}
                                                    <div className="relative z-10 p-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between">
                                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white/90 font-medium">
                                                            {item.size_mb ? `${item.size_mb}MB` : 'MP4'}
                                                        </span>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopyPath(item.filepath);
                                                                }}
                                                                className="p-1 rounded-md bg-black/60 backdrop-blur-xs text-white/90 hover:text-white hover:bg-black/90 transition-all"
                                                                title="파일 경로 복사"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDownload(item.stream_url, item.filename);
                                                                }}
                                                                className="p-1 rounded-md bg-black/60 backdrop-blur-xs text-white/90 hover:text-white hover:bg-black/90 transition-all"
                                                                title="다운로드"
                                                            >
                                                                <Download className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Center Play Button Overlay */}
                                                    <div className="relative z-10 flex-1 flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (onSelectVideo) {
                                                                    onSelectVideo({
                                                                        filename: item.filename,
                                                                        videoUrl: item.stream_url,
                                                                        fileSizeMb: item.size_mb,
                                                                        filePath: item.filepath
                                                                    });
                                                                    setActiveDockTab('preview');
                                                                }
                                                            }}
                                                            className="w-11 h-11 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg transform scale-90 group-hover/card:scale-105 group-hover/card:bg-primary transition-all duration-200"
                                                            title="시네마틱 9:16 전체 재생"
                                                        >
                                                            <Play className="w-5 h-5 ml-0.5 fill-current" />
                                                        </button>
                                                    </div>

                                                    {/* Bottom Gradient & Filename */}
                                                    <div className="relative z-10 p-2.5 bg-gradient-to-t from-black/95 via-black/75 to-transparent space-y-1.5">
                                                        <p className="text-[11px] font-bold text-white line-clamp-2 leading-tight drop-shadow-xs">
                                                            {item.filename}
                                                        </p>
                                                        <div className="flex items-center justify-between text-[10px] text-white/70">
                                                            <span className="truncate">{item.modified_at || '방금 전'}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (onSelectVideo) {
                                                                        onSelectVideo({
                                                                            filename: item.filename,
                                                                            videoUrl: item.stream_url,
                                                                            fileSizeMb: item.size_mb,
                                                                            filePath: item.filepath
                                                                        });
                                                                        setActiveDockTab('preview');
                                                                    }
                                                                }}
                                                                className="text-primary hover:underline font-semibold"
                                                            >
                                                                시사회
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }

                            // List Mode
                            return (
                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-2">
                                    {filteredList.map((item, idx) => (
                                        <div
                                            key={item.filepath || idx}
                                            className="p-2 rounded-xl border border-border/80 bg-card hover:border-primary/50 transition-all flex items-center gap-3 group shadow-2xs"
                                        >
                                            {/* Mini 9:16 Thumbnail */}
                                            <div
                                                onClick={() => {
                                                    if (onSelectVideo) {
                                                        onSelectVideo({
                                                            filename: item.filename,
                                                            videoUrl: item.stream_url,
                                                            fileSizeMb: item.size_mb,
                                                            filePath: item.filepath
                                                        });
                                                        setActiveDockTab('preview');
                                                    }
                                                }}
                                                className="relative w-12 aspect-[9/16] rounded-lg overflow-hidden bg-neutral-900 shrink-0 cursor-pointer group/thumb border border-border/40"
                                                title="시사회 재생"
                                            >
                                                <video
                                                    src={item.stream_url}
                                                    preload="metadata"
                                                    muted
                                                    playsInline
                                                    className="w-full h-full object-cover pointer-events-none"
                                                />
                                                <div className="absolute inset-0 bg-black/40 group-hover/thumb:bg-black/20 flex items-center justify-center transition-colors">
                                                    <Play className="w-3.5 h-3.5 text-white fill-white" />
                                                </div>
                                            </div>

                                            {/* File Info */}
                                            <div className="flex-1 min-w-0">
                                                <p
                                                    onClick={() => {
                                                        if (onSelectVideo) {
                                                            onSelectVideo({
                                                                filename: item.filename,
                                                                videoUrl: item.stream_url,
                                                                fileSizeMb: item.size_mb,
                                                                filePath: item.filepath
                                                            });
                                                            setActiveDockTab('preview');
                                                        }
                                                    }}
                                                    className="text-xs font-bold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                                                    title={item.filename}
                                                >
                                                    {item.filename}
                                                </p>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                                                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded-md text-foreground/80 font-medium">
                                                        {item.size_mb ? `${item.size_mb}MB` : 'MP4'}
                                                    </span>
                                                    <span>{item.modified_at || '최근'}</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyPath(item.filepath)}
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                                    title="파일 경로 복사"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownload(item.stream_url, item.filename)}
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                                    title="다운로드"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                </button>
                                                {onSelectVideo && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onSelectVideo({
                                                                filename: item.filename,
                                                                videoUrl: item.stream_url,
                                                                fileSizeMb: item.size_mb,
                                                                filePath: item.filepath
                                                            });
                                                            setActiveDockTab('preview');
                                                        }}
                                                        className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-semibold text-[11px] shadow-xs hover:bg-primary/90 transition-colors"
                                                    >
                                                        시사회
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* 6. Preview (화면 꽉 찬 9:16 시네마틱 쇼츠 플레이어) Tab */}
                {activeDockTab === 'preview' && activeVideo && (
                    <div className="flex-1 flex flex-col h-full min-h-0 bg-neutral-950 text-white rounded-none overflow-hidden relative select-none">
                        {/* Top Video Header Bar (Floating Glass Overlay) */}
                        <div className="px-3.5 py-2.5 bg-gradient-to-b from-black/90 via-black/60 to-transparent flex items-center justify-between z-20 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                                <span className="text-xs font-bold text-white truncate max-w-[220px] sm:max-w-[320px]">
                                    {activeVideo.filename}
                                </span>
                                <span className="text-[10.5px] text-neutral-400 font-mono tabular-nums shrink-0">
                                    ({activeVideo.fileSizeMb || 10.2}MB)
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    onClearActiveVideo?.();
                                    setActiveDockTab('backlot');
                                }}
                                className="p-1 rounded-lg hover:bg-white/20 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                                title="영상 닫기 (완성 목록으로)"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Full-Height 9:16 Video Canvas (Screen Fill, No Waste) */}
                        <div 
                            className="flex-1 min-h-0 w-full flex items-center justify-center relative overflow-hidden bg-black cursor-pointer group"
                            onClick={togglePlay}
                        >
                            <video
                                ref={videoRef}
                                src={activeVideo.videoUrl}
                                playsInline
                                autoPlay
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onEnded={() => setIsPlaying(false)}
                                className="h-full w-auto max-w-full aspect-[9/16] object-contain shadow-2xl"
                            />

                            {/* Center Play/Pause Pulsing Overlay */}
                            {!isPlaying && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-2xs transition-opacity">
                                    <div className="w-16 h-16 rounded-full bg-white/25 hover:bg-white/35 flex items-center justify-center backdrop-blur-md shadow-2xl transform transition-transform group-hover:scale-105">
                                        <Play className="w-8 h-8 text-white fill-white ml-1" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Floating Action Bar */}
                        <div className="p-3 bg-gradient-to-t from-black via-black/95 to-transparent flex items-center justify-between gap-2 z-20 shrink-0 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => handleCopyPath(activeVideo.filePath || activeVideo.videoUrl)}
                                className="text-neutral-400 hover:text-white flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>경로 복사</span>
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        toast.info('CapCut 드래프트 프로젝트 생성 중...');
                                        try {
                                            const res = await fetch('/api/sovereign-presets/export-completed-capcut', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    title: activeVideo.filename.replace(/\.[^/.]+$/, ''),
                                                    video_path: activeVideo.filePath,
                                                    open_after: true
                                                })
                                            });
                                            if (res.ok) {
                                                const data = await res.json();
                                                toast.success(`CapCut 드래프트 '${data.project_name}'가 열렸습니다!`);
                                            } else {
                                                toast.error('CapCut 내보내기 실패');
                                            }
                                        } catch (e) {
                                            toast.error('CapCut 내보내기 통신 오류');
                                        }
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold flex items-center gap-1.5 text-xs transition-colors cursor-pointer shadow-xs"
                                    title="CapCut PC에서 열어 추가 작업하기"
                                >
                                    <Film className="w-3.5 h-3.5" />
                                    <span>CapCut 열기</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDownload(activeVideo.videoUrl, activeVideo.filename)}
                                    className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-1.5 text-xs hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>내려받기</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};
export default DirectorRightPanel;
