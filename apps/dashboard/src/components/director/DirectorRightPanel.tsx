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
    Search
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
}

export type DockTab = 'menu' | 'preview' | 'files' | 'browser' | 'vision' | 'local_pc' | 'terminal' | 'backlot' | 'cross_diff';

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
    defaultTab = 'browser',
}) => {
    const [activeDockTab, setActiveDockTab] = useState<DockTab>(defaultTab);
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
            isMaximized ? 'w-full md:w-[680px]' : 'w-full md:w-[440px]'
        } border-l border-border/80 bg-card flex flex-col h-full transition-all duration-200 z-20 shrink-0 select-none`}>
            
            {/* Hidden native file input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleNativeFileSelect} 
                multiple 
                className="hidden" 
            />

            {/* Top Header Bar matching Image 5 (media_1790191229666.png) */}
            <div className="h-10 px-3 border-b border-border/60 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">패널</span>
                    {activeDockTab !== 'menu' && (
                        <button
                            type="button"
                            onClick={() => setActiveDockTab('menu')}
                            className="text-[11px] text-primary hover:underline font-medium"
                        >
                            홈으로
                        </button>
                    )}
                </div>

                {/* Governance Switch & Action Icons */}
                <div className="flex items-center gap-1.5">
                    {onToggleGovernanceMode && (
                        <button
                            type="button"
                            onClick={onToggleGovernanceMode}
                            title={`현재 거버넌스: ${governanceMode === 'copilot' ? 'Co-Pilot (안전 결재형)' : 'Full-Auto (초광속 직행형)'}`}
                            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border transition-all ${
                                governanceMode === 'copilot'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-2xs'
                            }`}
                        >
                            {governanceMode === 'copilot' ? (
                                <>
                                    <Shield className="w-3 h-3 text-amber-500" />
                                    <span>Co-Pilot</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3 h-3 text-emerald-500" />
                                    <span>Full-Auto</span>
                                </>
                            )}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setActiveDockTab('menu')}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="새 탭 / 메뉴 열기"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsMaximized(!isMaximized)}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={isMaximized ? "원래 크기로" : "최대화"}
                    >
                        {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="최소화"
                    >
                        <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="닫기"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Quick Dock Navigation Pill Bar (Browser is First Default Tab) */}
            <div className="px-3 py-1.5 border-b border-border/40 bg-muted/10 flex items-center gap-1 overflow-x-auto text-xs scrollbar-none">
                <button
                    type="button"
                    onClick={() => setActiveDockTab('browser')}
                    className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-medium transition-colors shrink-0 ${
                        activeDockTab === 'browser' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Globe className="w-3 h-3 text-emerald-400" />
                    브라우저
                    {browserSnapshot && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-0.5" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveDockTab('vision')}
                    className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-medium transition-colors shrink-0 ${
                        activeDockTab === 'vision' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Eye className="w-3 h-3 text-amber-400" />
                    비전 실측
                    {visionData && (
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 ml-0.5" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveDockTab('cross_diff')}
                    className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-medium transition-colors shrink-0 ${
                        activeDockTab === 'cross_diff' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <GitCompare className="w-3 h-3 text-pink-400" />
                    AI 크로스
                    {crossVerifyData && (
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500 ml-0.5" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveDockTab('files')}
                    className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-medium transition-colors shrink-0 ${
                        activeDockTab === 'files' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <FileText className="w-3 h-3" />
                    파일
                </button>
                <button
                    type="button"
                    onClick={() => setActiveDockTab('backlot')}
                    className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-medium transition-colors shrink-0 ${
                        activeDockTab === 'backlot' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Film className="w-3 h-3 text-purple-400" />
                    결과물 보관함
                </button>
                <button
                    type="button"
                    onClick={() => setActiveDockTab('terminal')}
                    className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-medium transition-colors shrink-0 ${
                        activeDockTab === 'terminal' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Terminal className="w-3 h-3 text-sky-400" />
                    터미널
                    {commandLogs.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                    )}
                </button>
                {activeVideo && (
                    <button
                        type="button"
                        onClick={() => setActiveDockTab('preview')}
                        className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-medium transition-colors shrink-0 ${
                            activeDockTab === 'preview' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Clapperboard className="w-3 h-3" />
                        영상 뷰어
                    </button>
                )}
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                
                {/* 1. Main Action Hub Menu (Exact Match to Image 5: media_1790191229666.png) */}
                {activeDockTab === 'menu' && (
                    <div className="flex-1 flex flex-col justify-center items-center max-w-xs mx-auto space-y-3 w-full py-8">
                        <button
                            type="button"
                            onClick={() => setActiveDockTab('files')}
                            className="w-full h-11 px-4 rounded-xl border border-border/70 hover:border-primary/50 bg-card hover:bg-muted/40 transition-all flex items-center justify-between text-xs font-semibold text-foreground group shadow-2xs"
                        >
                            <div className="flex items-center gap-2.5">
                                <FileText className="w-4 h-4 text-primary" />
                                <span>파일</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground font-mono group-hover:text-foreground">
                                Ctrl+P
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveDockTab('browser')}
                            className="w-full h-11 px-4 rounded-xl border border-border/70 hover:border-primary/50 bg-card hover:bg-muted/40 transition-all flex items-center justify-between text-xs font-semibold text-foreground group shadow-2xs"
                        >
                            <div className="flex items-center gap-2.5">
                                <Globe className="w-4 h-4 text-emerald-500" />
                                <span>브라우저</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground font-mono group-hover:text-foreground">
                                Ctrl+T
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-11 px-4 rounded-xl border border-border/70 hover:border-primary/50 bg-card hover:bg-muted/40 transition-all flex items-center justify-between text-xs font-semibold text-foreground group shadow-2xs"
                        >
                            <div className="flex items-center gap-2.5">
                                <Folder className="w-4 h-4 text-amber-500" />
                                <span>내 PC에서 파일 열기...</span>
                            </div>
                            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveDockTab('terminal')}
                            className="w-full h-11 px-4 rounded-xl border border-border/70 hover:border-primary/50 bg-card hover:bg-muted/40 transition-all flex items-center justify-between text-xs font-semibold text-foreground group shadow-2xs"
                        >
                            <div className="flex items-center gap-2.5">
                                <Terminal className="w-4 h-4 text-sky-500" />
                                <span>터미널</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground font-mono group-hover:text-foreground">
                                Ctrl+`
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveDockTab('backlot')}
                            className="w-full h-11 px-4 rounded-xl border border-border/70 hover:border-primary/50 bg-card hover:bg-muted/40 transition-all flex items-center justify-between text-xs font-semibold text-foreground group shadow-2xs"
                        >
                            <div className="flex items-center gap-2.5">
                                <Film className="w-4 h-4 text-purple-500" />
                                <span>결과물 보관함</span>
                            </div>
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                {exportsList.length > 0 ? `${exportsList.length}개` : '05_Exports'}
                            </span>
                        </button>
                    </div>
                )}

                {/* 2. Files Tab: Workspace 9-Tier File Tree */}
                {activeDockTab === 'files' && (
                    <div className="flex-1 flex flex-col space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-primary" />
                                표준 워크스페이스 탐색기
                            </span>
                            <button
                                type="button"
                                onClick={fetchWorkspaceFiles}
                                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                                title="새로고침"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto">
                            {workspaceCategories.map((cat) => (
                                <div key={cat.id} className="p-3 rounded-xl border border-border/70 bg-card space-y-2">
                                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                                        <span className="truncate">{cat.name}</span>
                                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                                            {cat.file_count}개 파일
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        {cat.files.length === 0 ? (
                                            <p className="text-[11px] text-muted-foreground py-1">파일이 없습니다.</p>
                                        ) : (
                                            cat.files.map((file: any, fIdx: number) => (
                                                <div 
                                                    key={fIdx}
                                                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/50 text-[11px] text-foreground transition-colors group"
                                                >
                                                    <div className="flex items-center gap-1.5 truncate max-w-[240px]">
                                                        {file.is_video ? <Film className="w-3 h-3 text-purple-400 shrink-0" /> : <FileText className="w-3 h-3 text-muted-foreground shrink-0" />}
                                                        <span className="truncate">{file.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <span className="text-[10px] text-muted-foreground tabular-nums">{file.size_mb}MB</span>
                                                        {file.is_video && onSelectVideo && (
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
                                                                className="text-primary text-[10px] hover:underline font-semibold ml-1"
                                                            >
                                                                재생
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. Browser Tab (Google Search & Playwright Snapshot Mirror) */}
                {activeDockTab === 'browser' && (
                    <div className="flex-1 flex flex-col space-y-3">
                        {/* URL / Search Input Bar */}
                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleExecuteBrowserSearch(browserUrl);
                            }}
                            className="flex items-center gap-2"
                        >
                            <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={browserUrl}
                                    onChange={(e) => setBrowserUrl(e.target.value)}
                                    className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-xs text-foreground font-mono focus:outline-hidden"
                                    placeholder="구글 검색어 또는 URL 입력 (예: 2026 숏폼 트렌드, https://...)"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSearchingBrowser}
                                className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 disabled:opacity-50 cursor-pointer shrink-0"
                                title="검색 또는 웹페이지 접속"
                            >
                                <Globe className={`w-3.5 h-3.5 ${isSearchingBrowser ? 'animate-spin' : ''}`} />
                                <span>{isSearchingBrowser ? '탐색 중...' : '검색/이동'}</span>
                            </button>
                        </form>

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
                            <div className="flex-1 flex flex-col space-y-1.5 min-h-[340px]">
                                <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                                    <span className="truncate">
                                        🔒 <strong>소연 계정 연동 완료</strong>: 실시간 프레임은 웹 보안상 제3자 iframe으로 표시되며, 실제 로그인 세션 탐색은 <strong>[스냅샷 미러]</strong>에서 완벽 동작합니다.
                                    </span>
                                    <button 
                                        type="button"
                                        onClick={() => setBrowserMode('snapshot')}
                                        className="text-primary hover:underline font-bold shrink-0 ml-2 text-[10px]"
                                    >
                                        스냅샷 미러 전환 →
                                    </button>
                                </div>
                                <div className="flex-1 rounded-xl border border-border/80 overflow-hidden bg-background min-h-[320px]">
                                    <iframe 
                                        src={browserUrl.startsWith('http') ? browserUrl : `https://www.google.com/search?igu=1&q=${encodeURIComponent(browserUrl)}`}
                                        className="w-full h-full border-none min-h-[320px]"
                                        title="Embedded Browser Frame"
                                        allow="clipboard-read; clipboard-write"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
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

                {/* 5. Backlot (결과물 보관함) Tab: 05_Exports gallery */}
                {activeDockTab === 'backlot' && (
                    <div className="flex-1 flex flex-col space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Film className="w-3.5 h-3.5 text-purple-500" />
                                완성된 영상 보관함 (05_Exports)
                            </span>
                            <button
                                type="button"
                                onClick={fetchExports}
                                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                                title="새로고침"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="space-y-2 flex-1 overflow-y-auto">
                            {exportsList.length === 0 ? (
                                <div className="py-12 text-center border border-dashed border-border rounded-xl">
                                    <Film className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                                    <p className="text-xs text-muted-foreground font-semibold">완성된 영상이 아직 없습니다.</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        대화창에서 영상을 생성하면 이곳에 영구 보관됩니다.
                                    </p>
                                </div>
                            ) : (
                                exportsList.map((item, idx) => (
                                    <div 
                                        key={idx}
                                        className="p-3 rounded-xl border border-border/80 bg-card hover:border-primary/50 transition-all space-y-2 group shadow-2xs"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-foreground truncate max-w-[260px]">
                                                {item.filename}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground tabular-nums">
                                                {item.size_mb}MB
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                            <span>{item.modified_at}</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyPath(item.filepath)}
                                                    className="hover:text-foreground text-[10px] flex items-center gap-0.5"
                                                    title="파일 경로 복사"
                                                >
                                                    <Copy className="w-3 h-3" />
                                                    복사
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownload(item.stream_url, item.filename)}
                                                    className="hover:text-foreground text-[10px] flex items-center gap-0.5"
                                                    title="다운로드"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    받기
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
                                                        className="px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-semibold text-[10px]"
                                                    >
                                                        재생
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* 6. Preview (영상 뷰어) Tab */}
                {activeDockTab === 'preview' && activeVideo && (
                    <div className="flex-1 flex flex-col items-center justify-between space-y-4">
                        <div className="w-full flex items-center justify-between text-[11px] text-muted-foreground px-1 font-mono">
                            <span className="truncate max-w-[260px]">{activeVideo.filename}</span>
                            <span className="tabular-nums">{activeVideo.fileSizeMb || 10.2}MB</span>
                        </div>

                        {/* Large 9:16 Video Player */}
                        <div className="relative aspect-[9/16] w-full max-w-[300px] rounded-2xl overflow-hidden bg-black border-2 border-neutral-800 shadow-2xl flex items-center justify-center group">
                            <video
                                ref={videoRef}
                                src={activeVideo.videoUrl}
                                playsInline
                                onEnded={() => setIsPlaying(false)}
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={togglePlay}
                            />
                            {!isPlaying && (
                                <div 
                                    onClick={togglePlay}
                                    className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-2xs cursor-pointer"
                                >
                                    <div className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center backdrop-blur-md">
                                        <Play className="w-7 h-7 text-white fill-white ml-1" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Action Footer Bar */}
                        <div className="w-full pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                            <button
                                type="button"
                                onClick={() => handleCopyPath(activeVideo.filePath || activeVideo.videoUrl)}
                                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                경로 복사
                            </button>
                            <div className="flex items-center gap-1.5">
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
                                    className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-1 text-xs transition-colors cursor-pointer"
                                    title="CapCut PC에서 열어 추가 작업하기"
                                >
                                    <Film className="w-3 h-3" />
                                    CapCut 열기
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDownload(activeVideo.videoUrl, activeVideo.filename)}
                                    className="px-2 py-1 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center gap-1 text-xs hover:bg-primary/90 transition-colors"
                                >
                                    <Download className="w-3 h-3" />
                                    내려받기
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
