import React, { useState, useEffect, useRef } from 'react';
import {
    Terminal,
    Globe,
    Eye,
    Folder,
    GitCompare,
    Play,
    Square,
    ExternalLink,
    Search,
    Maximize2,
    RefreshCw,
    Download,
    CheckCircle2,
    AlertCircle,
    Layers,
    Sparkles,
    Shield
} from 'lucide-react';

export interface CommandLogItem {
    id: string;
    cmd: string;
    stdout: string;
    stderr: string;
    exit_code: number;
    duration_ms: number;
    workdir?: string;
    timestamp: number;
}

export interface BrowserSnapshotData {
    title: string;
    url: string;
    search_results?: Array<{ title: string; url: string; snippet: string }>;
    extracted_text?: string;
    screenshot_data_url?: string;
}

export interface VisionForensicData {
    media_path?: string;
    frame_data_url?: string;
    aspect_ratio?: string;
    bounding_boxes?: Array<{
        label: string;
        box: [number, number, number, number]; // [x1, y1, x2, y2]
        color: string;
        spec?: string;
    }>;
    visual_metrics?: {
        title_top_pct?: number;
        title_height_pct?: number;
        caption_bottom_pct?: number;
        caption_height_pct?: number;
        avg_cut_sec?: number;
        opening_hook_zoom?: number;
    };
}

export interface FileItem {
    name: string;
    is_dir: boolean;
    size_bytes: number;
    modified: number;
}

export interface CrossVerifyData {
    channel_url: string;
    astra_analysis?: any;
    gemini_analysis?: any;
    hybrid_preset?: any;
}

interface LiveAutonomousWorkspacePanelProps {
    commandLogs: CommandLogItem[];
    browserSnapshot?: BrowserSnapshotData | null;
    visionData?: VisionForensicData | null;
    crossVerifyData?: CrossVerifyData | null;
    governanceMode: 'copilot' | 'full_auto';
    onToggleGovernanceMode: () => void;
    onExecuteManualCommand: (cmd: string) => Promise<void>;
    onOpenFolder: (folder: string) => void;
    activeTab?: 'terminal' | 'browser_vision' | 'files' | 'cross_diff';
    onTabChange?: (tab: 'terminal' | 'browser_vision' | 'files' | 'cross_diff') => void;
}

export const LiveAutonomousWorkspacePanel: React.FC<LiveAutonomousWorkspacePanelProps> = ({
    commandLogs,
    browserSnapshot,
    visionData,
    crossVerifyData,
    governanceMode,
    onToggleGovernanceMode,
    onExecuteManualCommand,
    onOpenFolder,
    activeTab: externalTab,
    onTabChange
}) => {
    const [currentTab, setCurrentTab] = useState<'terminal' | 'browser_vision' | 'files' | 'cross_diff'>('terminal');
    const [browserVisionSubTab, setBrowserVisionSubTab] = useState<'browser' | 'vision'>('browser');
    const [manualCmd, setManualCmd] = useState('');
    const [isExecutingCmd, setIsExecutingCmd] = useState(false);
    const [fileList, setFileList] = useState<FileItem[]>([]);
    const [activeFileFolder, setActiveFileFolder] = useState<'downloads' | 'exports'>('downloads');
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);

    const terminalBottomRef = useRef<HTMLDivElement>(null);

    const tab = externalTab || currentTab;
    const setTab = (t: 'terminal' | 'browser_vision' | 'files' | 'cross_diff') => {
        setCurrentTab(t);
        if (onTabChange) onTabChange(t);
    };

    // Auto-scroll terminal
    useEffect(() => {
        if (tab === 'terminal') {
            terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [commandLogs, tab]);

    // Fetch file list when files tab is active
    const loadFiles = async (folder: 'downloads' | 'exports') => {
        setIsLoadingFiles(true);
        try {
            const res = await fetch(`/api/agent/files-list?folder=${folder}`);
            if (res.ok) {
                const data = await res.json();
                setFileList(data.items || []);
            }
        } catch (e) {
            console.error('Failed to load files:', e);
        } finally {
            setIsLoadingFiles(false);
        }
    };

    useEffect(() => {
        if (tab === 'files') {
            loadFiles(activeFileFolder);
        }
    }, [tab, activeFileFolder]);

    // Handle manual terminal command submission
    const handleCommandSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCmd.trim() || isExecutingCmd) return;
        const cmdToSend = manualCmd.trim();
        setManualCmd('');
        setIsExecutingCmd(true);
        try {
            await onExecuteManualCommand(cmdToSend);
        } finally {
            setIsExecutingCmd(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-card border-l border-border select-text">
            {/* Top Workspace Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setTab('terminal')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                            tab === 'terminal'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                    >
                        <Terminal className="size-3.5" />
                        <span>터미널</span>
                        {commandLogs.length > 0 && (
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                        )}
                    </button>

                    <button
                        onClick={() => setTab('browser_vision')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                            tab === 'browser_vision'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                    >
                        <Globe className="size-3.5" />
                        <span>브라우저 & 비전</span>
                        {(browserSnapshot || visionData) && (
                            <span className="size-1.5 rounded-full bg-blue-500 ml-0.5" />
                        )}
                    </button>

                    <button
                        onClick={() => setTab('files')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                            tab === 'files'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                    >
                        <Folder className="size-3.5" />
                        <span>파일 탐색기</span>
                    </button>

                    <button
                        onClick={() => setTab('cross_diff')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                            tab === 'cross_diff'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                    >
                        <GitCompare className="size-3.5" />
                        <span>AI 크로스 체킹</span>
                    </button>
                </div>

                {/* Dual Governance Switch */}
                <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button
                        onClick={onToggleGovernanceMode}
                        title={`현재 모드: ${governanceMode === 'copilot' ? 'Co-Pilot (안전 결재형)' : 'Full-Auto (초광속 직행형)'}`}
                        className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full border transition-all ${
                            governanceMode === 'copilot'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-xs'
                        }`}
                    >
                        {governanceMode === 'copilot' ? (
                            <>
                                <Shield className="size-3 text-amber-500" />
                                <span>Co-Pilot</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="size-3 text-emerald-500" />
                                <span>Full-Auto</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {/* 1. Terminal Console */}
                {tab === 'terminal' && (
                    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 font-mono text-xs overflow-hidden">
                        {/* Terminal Top Info */}
                        <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[11px] text-zinc-400">
                            <span className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                PowerShell Core (UTF-8) • Host Sandbox
                            </span>
                            <span className="text-zinc-500">
                                {commandLogs.length}개 명령어 실행됨
                            </span>
                        </div>

                        {/* Terminal Body */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 select-text">
                            {commandLogs.length === 0 ? (
                                <div className="text-zinc-500 py-6 text-center">
                                    <Terminal className="size-8 mx-auto mb-2 opacity-40" />
                                    <p>AI 에이전트의 쉘 명령어(yt-dlp, ffmpeg 등)가 실시간으로 여기에 출력됩니다.</p>
                                    <p className="text-[10px] mt-1 text-zinc-600">하단 입력창을 통해 대표님께서 직접 명령어를 내리실 수도 있습니다.</p>
                                </div>
                            ) : (
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
                                            <pre className="text-zinc-300 pl-3 border-l-2 border-zinc-800 whitespace-pre-wrap break-all leading-relaxed max-h-60 overflow-y-auto">
                                                {log.stdout}
                                            </pre>
                                        )}
                                        {log.stderr && (
                                            <pre className="text-rose-400 pl-3 border-l-2 border-rose-900/50 whitespace-pre-wrap break-all leading-relaxed max-h-40 overflow-y-auto">
                                                {log.stderr}
                                            </pre>
                                        )}
                                    </div>
                                ))
                            )}
                            <div ref={terminalBottomRef} />
                        </div>

                        {/* Terminal Interactive Takeover Input */}
                        <form onSubmit={handleCommandSubmit} className="p-2 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2">
                            <span className="text-emerald-400 font-bold pl-1">&gt;</span>
                            <input
                                type="text"
                                value={manualCmd}
                                onChange={(e) => setManualCmd(e.target.value)}
                                placeholder="명령어 직접 실행 (예: yt-dlp --version, dir, ffmpeg -version)"
                                disabled={isExecutingCmd}
                                className="flex-1 bg-transparent border-0 text-zinc-100 placeholder:text-zinc-600 focus:outline-none text-xs"
                            />
                            <button
                                type="submit"
                                disabled={!manualCmd.trim() || isExecutingCmd}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-xs disabled:opacity-40 transition-colors flex items-center gap-1"
                            >
                                <Play className="size-3" />
                                <span>실행</span>
                            </button>
                        </form>
                    </div>
                )}

                {/* 2. Browser & Vision Inspector */}
                {tab === 'browser_vision' && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
                        {/* Sub Tab Switch */}
                        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-muted/20">
                            <button
                                onClick={() => setBrowserVisionSubTab('browser')}
                                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                                    browserVisionSubTab === 'browser'
                                        ? 'bg-accent text-accent-foreground font-semibold'
                                        : 'text-muted-foreground hover:text-foreground'
                                Could you please check'}`}
                            >
                                🌐 웹 브라우저 화면
                            </button>
                            <button
                                onClick={() => setBrowserVisionSubTab('vision')}
                                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                                    browserVisionSubTab === 'vision'
                                        ? 'bg-accent text-accent-foreground font-semibold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                👁️ 비전 실측 캔버스
                            </button>
                        </div>

                        {/* Sub Tab 1: Browser Screencast */}
                        {browserVisionSubTab === 'browser' && (
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {browserSnapshot ? (
                                    <>
                                        {/* Browser Address Bar */}
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg border border-border text-xs">
                                            <Search className="size-3.5 text-muted-foreground shrink-0" />
                                            <span className="font-mono text-muted-foreground truncate flex-1">
                                                {browserSnapshot.url}
                                            </span>
                                            <a
                                                href={browserSnapshot.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-primary hover:underline flex items-center gap-0.5"
                                            >
                                                <ExternalLink className="size-3" />
                                            </a>
                                        </div>

                                        {/* Browser Screenshot Mirror */}
                                        {browserSnapshot.screenshot_data_url && (
                                            <div className="border border-border rounded-lg overflow-hidden shadow-xs bg-black">
                                                <div className="px-2 py-1 bg-zinc-900 text-zinc-400 text-[10px] flex items-center justify-between border-b border-zinc-800">
                                                    <span>Playwright Headless Window (1280x800)</span>
                                                    <span>{browserSnapshot.title}</span>
                                                </div>
                                                <img
                                                    src={browserSnapshot.screenshot_data_url}
                                                    alt="Browser Live Screen"
                                                    className="w-full h-auto object-contain max-h-72"
                                                />
                                            </div>
                                        )}

                                        {/* Extracted Search Snippets */}
                                        {browserSnapshot.search_results && browserSnapshot.search_results.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                    <span>🔍 수집된 실시간 검색 결과 ({browserSnapshot.search_results.length}건)</span>
                                                </h4>
                                                <div className="space-y-1.5">
                                                    {browserSnapshot.search_results.map((res, i) => (
                                                        <div key={i} className="p-2 rounded bg-card border border-border/80 text-xs">
                                                            <div className="font-semibold text-primary truncate">{res.title}</div>
                                                            <div className="text-muted-foreground text-[11px] line-clamp-2 mt-0.5">
                                                                {res.snippet}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Globe className="size-8 mx-auto mb-2 opacity-40" />
                                        <p className="text-xs">AI가 웹 검색이나 브라우징을 수행하면 여기에 실제 화면이 실시간으로 렌더링됩니다.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Sub Tab 2: Vision Forensic Canvas */}
                        {browserVisionSubTab === 'vision' && (
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {visionData ? (
                                    <>
                                        {/* Vision Frame with Bounding Box Overlay */}
                                        <div className="relative border border-border rounded-lg overflow-hidden bg-black flex items-center justify-center">
                                            {visionData.frame_data_url ? (
                                                <div className="relative inline-block w-full max-w-[240px]">
                                                    <img
                                                        src={visionData.frame_data_url}
                                                        alt="Forensic Frame"
                                                        className="w-full h-auto block"
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
                                                                        y={`${Math.max(4, y1 * 100 - 2)}%`}
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
                                                <div className="p-2 bg-card border border-border rounded">
                                                    <span className="text-muted-foreground block text-[10px]">평균 컷 전환 주기</span>
                                                    <span className="font-bold text-foreground">{visionData.visual_metrics.avg_cut_sec || 2.8}초</span>
                                                </div>
                                                <div className="p-2 bg-card border border-border rounded">
                                                    <span className="text-muted-foreground block text-[10px]">0초 훅 오프닝 줌</span>
                                                    <span className="font-bold text-foreground">
                                                        +{Math.round(((visionData.visual_metrics.opening_hook_zoom || 1.15) - 1.0) * 100)}%
                                                    </span>
                                                </div>
                                                <div className="p-2 bg-card border border-border rounded">
                                                    <span className="text-muted-foreground block text-[10px]">상단 볼드 타이틀</span>
                                                    <span className="font-bold text-foreground">화면 상단 {visionData.visual_metrics.title_top_pct || 12}% 위치</span>
                                                </div>
                                                <div className="p-2 bg-card border border-border rounded">
                                                    <span className="text-muted-foreground block text-[10px]">자막 Safe Zone</span>
                                                    <span className="font-bold text-foreground">화면 하단 {visionData.visual_metrics.caption_bottom_pct || 70}% 위치</span>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Eye className="size-8 mx-auto mb-2 opacity-40" />
                                        <p className="text-xs">동영상이나 레퍼런스 분석 시 AI 비전 엔진의 바운딩 박스 실측 화면이 표시됩니다.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Files & Assets Explorer */}
                {tab === 'files' && (
                    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
                        {/* Folder Toggle Header */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setActiveFileFolder('downloads')}
                                    className={`px-2 py-1 text-xs rounded transition-colors ${
                                        activeFileFolder === 'downloads'
                                            ? 'bg-primary text-primary-foreground font-semibold'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    📥 07_Downloads (수집 영상)
                                </button>
                                <button
                                    onClick={() => setActiveFileFolder('exports')}
                                    className={`px-2 py-1 text-xs rounded transition-colors ${
                                        activeFileFolder === 'exports'
                                            ? 'bg-primary text-primary-foreground font-semibold'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    🎬 05_Exports (완성본)
                                </button>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => loadFiles(activeFileFolder)}
                                    className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                                    title="새로고침"
                                >
                                    <RefreshCw className={`size-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                    onClick={() => onOpenFolder(activeFileFolder)}
                                    className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                                    title="윈도우 탐색기에서 열기"
                                >
                                    <ExternalLink className="size-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* File List */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                            {fileList.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Folder className="size-8 mx-auto mb-2 opacity-40" />
                                    <p className="text-xs">폴더가 비어 있거나 아직 생성된 파일이 없습니다.</p>
                                </div>
                            ) : (
                                fileList.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-2 rounded bg-card border border-border/70 hover:border-primary/50 text-xs transition-colors"
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="text-base">{item.is_dir ? '📁' : '🎬'}</span>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium text-foreground truncate">{item.name}</div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {(item.size_bytes / (1024 * 1024)).toFixed(1)} MB
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* 4. Multi-AI Cross Checking Diff */}
                {tab === 'cross_diff' && (
                    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto p-3 space-y-3">
                        {crossVerifyData ? (
                            <>
                                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                    <GitCompare className="size-4 text-primary" />
                                    <span>아스트라 ⊕ 제미나이 채널 DNA 크로스 체킹</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {/* Left: Astra Narrative DNA */}
                                    <div className="p-3 bg-card border border-primary/30 rounded-lg space-y-2">
                                        <div className="font-bold text-primary flex items-center gap-1">
                                            <span>🧠 아스트라 지능 추론</span>
                                        </div>
                                        <div className="text-muted-foreground text-[11px] leading-relaxed">
                                            {crossVerifyData.astra_analysis?.recipe || '스토리텔링 기승전결 훅 및 대본 반전 구조 분석'}
                                        </div>
                                    </div>

                                    {/* Right: Gemini Physical Metrics */}
                                    <div className="p-3 bg-card border border-emerald-500/30 rounded-lg space-y-2">
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
                                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-lg text-xs space-y-1.5">
                                        <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 className="size-4" />
                                            <span>하이브리드 소버린 프리셋 합성 완료</span>
                                        </div>
                                        <div className="text-foreground font-medium">
                                            {crossVerifyData.hybrid_preset.name}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <GitCompare className="size-8 mx-auto mb-2 opacity-40" />
                                <p className="text-xs">동일 채널 분석 시 아스트라의 정성 지능과 제미나이의 물리 실측을 교차 비교한 결과가 여기에 표시됩니다.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
