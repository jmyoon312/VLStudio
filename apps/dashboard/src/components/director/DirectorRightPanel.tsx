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
}

type DockTab = 'menu' | 'preview' | 'files' | 'browser' | 'local_pc' | 'terminal' | 'backlot';

export const DirectorRightPanel: React.FC<DirectorRightPanelProps> = ({
    open,
    onClose,
    activeVideo,
    onClearActiveVideo,
    onSelectVideo,
    onAttachFile,
}) => {
    const [activeDockTab, setActiveDockTab] = useState<DockTab>('menu');
    const [isMaximized, setIsMaximized] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [copied, setCopied] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Dynamic data states
    const [workspaceCategories, setWorkspaceCategories] = useState<any[]>([]);
    const [exportsList, setExportsList] = useState<any[]>([]);
    const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
    const [browserUrl, setBrowserUrl] = useState('http://localhost:20128');
    const [searchFilter, setSearchFilter] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-switch to preview when a video is explicitly opened
    useEffect(() => {
        if (activeVideo) {
            setActiveDockTab('preview');
        }
    }, [activeVideo]);

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
        if (activeDockTab === 'terminal') fetchLiveLogs();
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

                {/* 5 Header Action Icons: +, ⤢, -, ❐, ✕ */}
                <div className="flex items-center gap-1">
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

            {/* Quick Dock Navigation Pill Bar */}
            <div className="px-3 py-1.5 border-b border-border/40 bg-muted/10 flex items-center gap-1 overflow-x-auto text-xs scrollbar-none">
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
                    onClick={() => setActiveDockTab('browser')}
                    className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-medium transition-colors shrink-0 ${
                        activeDockTab === 'browser' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Globe className="w-3 h-3" />
                    브라우저
                </button>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                    <Folder className="w-3 h-3" />
                    PC 열기
                </button>
                <button
                    type="button"
                    onClick={() => setActiveDockTab('terminal')}
                    className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-medium transition-colors shrink-0 ${
                        activeDockTab === 'terminal' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Terminal className="w-3 h-3" />
                    터미널
                </button>
                <button
                    type="button"
                    onClick={() => setActiveDockTab('backlot')}
                    className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-medium transition-colors shrink-0 ${
                        activeDockTab === 'backlot' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Film className="w-3 h-3" />
                    결과물 보관함
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

                {/* 3. Browser Tab */}
                {activeDockTab === 'browser' && (
                    <div className="flex-1 flex flex-col space-y-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={browserUrl}
                                onChange={(e) => setBrowserUrl(e.target.value)}
                                className="flex-1 h-8 px-3 rounded-lg border border-border bg-background text-xs text-foreground font-mono focus:outline-hidden"
                                placeholder="https:// 또는 로컬 URL 입력"
                            />
                            <button
                                type="button"
                                onClick={() => window.open(browserUrl, '_blank')}
                                className="h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1"
                                title="새 창으로 열기"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                열기
                            </button>
                        </div>

                        {/* Quick Port Shortcuts */}
                        <div className="flex items-center gap-1.5 text-[11px]">
                            <button
                                type="button"
                                onClick={() => setBrowserUrl('http://localhost:20128')}
                                className="px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground hover:text-foreground text-[10px]"
                            >
                                OmniRoute (20128)
                            </button>
                            <button
                                type="button"
                                onClick={() => setBrowserUrl('https://www.youtube.com/shorts')}
                                className="px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground hover:text-foreground text-[10px]"
                            >
                                YouTube Shorts
                            </button>
                        </div>

                        {/* Embedded Web View */}
                        <div className="flex-1 rounded-xl border border-border/80 overflow-hidden bg-background">
                            <iframe 
                                src={browserUrl}
                                className="w-full h-full border-none"
                                title="Embedded Browser Frame"
                            />
                        </div>
                    </div>
                )}

                {/* 4. Terminal Tab: Live execution logs */}
                {activeDockTab === 'terminal' && (
                    <div className="flex-1 flex flex-col space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                                <Terminal className="w-3.5 h-3.5 text-sky-500" />
                                시스템 실행 터미널
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

                        <div className="flex-1 bg-neutral-950 text-neutral-200 font-mono text-[11px] p-3 rounded-xl border border-neutral-800 overflow-y-auto space-y-1 select-text">
                            {terminalLogs.map((log, idx) => (
                                <div key={idx} className="leading-relaxed whitespace-pre-wrap break-all">
                                    {log}
                                </div>
                            ))}
                        </div>
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
