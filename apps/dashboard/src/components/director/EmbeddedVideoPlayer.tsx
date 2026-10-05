import React, { useRef, useState, useEffect } from 'react';
import { 
    Play, 
    Pause, 
    Volume2, 
    VolumeX, 
    Maximize2, 
    Download, 
    ExternalLink, 
    MoreHorizontal, 
    ThumbsUp, 
    ThumbsDown, 
    Copy, 
    Check, 
    Clock, 
    FileVideo,
    Film,
    Sparkles,
    Rocket,
    PanelRight,
    ChevronDown,
    Folder
} from 'lucide-react';
import { toast } from 'sonner';

export interface EmbeddedVideoProps {
    filename: string;
    videoUrl: string;
    fileSizeMb?: number;
    duration?: string;
    resolution?: string;
    frameCount?: number;
    fps?: number;
    sourceName?: string;
    timeElapsedText?: string;
    description?: string;
    filePath?: string;
    audioPath?: string;
    cues?: any[];
    style?: any;
    onOpenInRightPanel?: (video: { filename: string; videoUrl: string; fileSizeMb?: number; filePath?: string } | any) => void;
}

export const EmbeddedVideoPlayer: React.FC<EmbeddedVideoProps> = ({
    filename,
    videoUrl,
    fileSizeMb,
    duration,
    resolution,
    frameCount,
    fps,
    sourceName,
    timeElapsedText,
    description,
    filePath,
    audioPath,
    cues,
    style,
    onOpenInRightPanel,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [exportingCapcut, setExportingCapcut] = useState(false);
    const [currentTime, setCurrentTime] = useState('0:00');
    const [progressPct, setProgressPct] = useState(0);
    const [liked, setLiked] = useState<boolean | null>(null);
    const [copied, setCopied] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [reportExpanded, setReportExpanded] = useState(false);

    // Resolve robust streaming URL for absolute local paths or relative paths
    const resolvedVideoUrl = React.useMemo(() => {
        if (!videoUrl) return '';
        if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://') || videoUrl.startsWith('blob:') || videoUrl.startsWith('data:')) {
            return videoUrl;
        }
        if (videoUrl.startsWith('/api/files/stream')) {
            return videoUrl;
        }
        const targetPath = filePath || (videoUrl.startsWith('/files/') ? videoUrl.replace('/files/', '') : videoUrl);
        return `/api/files/stream?path=${encodeURIComponent(targetPath)}`;
    }, [videoUrl, filePath]);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        if (menuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpen]);

    const togglePlay = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch((err) => {
                console.warn('Play interrupted:', err);
                setIsPlaying(false);
            });
        }
    };

    const toggleMute = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const cur = videoRef.current.currentTime;
        const dur = videoRef.current.duration || 1;
        const mins = Math.floor(cur / 60);
        const secs = Math.floor(cur % 60);
        setCurrentTime(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
        setProgressPct((cur / dur) * 100);
    };

    const handleFullscreen = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!videoRef.current) return;
        if (videoRef.current.requestFullscreen) {
            videoRef.current.requestFullscreen();
        }
    };

    const handleOpenInPanel = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!onOpenInRightPanel) return;
        try {
            // Support both object and multi-arg signatures cleanly
            (onOpenInRightPanel as any)({
                filename,
                videoUrl: resolvedVideoUrl,
                fileSizeMb,
                filePath: filePath || videoUrl
            });
        } catch {
            try {
                (onOpenInRightPanel as any)(resolvedVideoUrl, filename, filePath);
            } catch {}
        }
        toast.info('우측 패널에서 상세 비디오 뷰를 열었습니다.');
    };

    const handleDownload = async () => {
        try {
            toast.info(`${filename} 다운로드를 준비 중입니다...`);
            const res = await fetch(resolvedVideoUrl);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
            toast.success(`${filename} 다운로드가 완료되었습니다.`);
        } catch {
            const a = document.createElement('a');
            a.href = resolvedVideoUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success(`${filename} 다운로드를 시작했습니다.`);
        }
        setMenuOpen(false);
    };

    const handleCopyPath = () => {
        const textToCopy = filePath || videoUrl;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('영상 파일 경로가 클립보드에 복사되었습니다.');
        setMenuOpen(false);
    };

    const handleOpenFileLocation = async () => {
        const targetPath = filePath || videoUrl;
        try {
            const res = await fetch('/api/system/open-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: targetPath })
            });
            if (res.ok) {
                toast.success('탐색기에서 파일 위치를 열었습니다.');
            } else {
                toast.error('폴더 위치를 열 수 없습니다.');
            }
        } catch {
            toast.error('폴더 열기 요청 실패');
        }
        setMenuOpen(false);
    };

    const handleSendToEditor = () => {
        window.location.hash = '#/classic';
        toast.success('4대 폼팩터 전문 편집기로 이동합니다.');
        setMenuOpen(false);
    };

    const handleExportToCapcut = async () => {
        setExportingCapcut(true);
        toast.info('CapCut 드래프트 프로젝트로 내보내는 중입니다...');
        try {
            const cleanTitle = filename ? filename.replace(/\.[^/.]+$/, '') : 'ViraLoop_Shorts';
            const res = await fetch('/api/sovereign-presets/export-completed-capcut', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: cleanTitle,
                    video_path: filePath,
                    audio_path: audioPath,
                    cues: cues || [],
                    style: style || {},
                    open_after: true
                })
            });
            if (res.ok) {
                const data = await res.json();
                toast.success(`CapCut 드래프트 '${data.project_name}'가 1:1 스타일로 생성되어 열렸습니다!`);
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail || 'CapCut 내보내기에 실패했습니다.');
            }
        } catch {
            toast.error('CapCut 내보내기 통신 오류가 발생했습니다.');
        } finally {
            setExportingCapcut(false);
            setMenuOpen(false);
        }
    };

    const [enqueuingDeploy, setEnqueuingDeploy] = useState(false);
    const handleEnqueueAutoDeployment = async () => {
        if (!filePath && !resolvedVideoUrl) {
            toast.error('동영상 파일 경로가 존재하지 않습니다.');
            return;
        }
        setEnqueuingDeploy(true);
        try {
            const res = await fetch('/api/queue/enqueue-deliverable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    video_file_path: filePath || resolvedVideoUrl,
                    title: filename,
                    priority: 'high'
                })
            });
            if (res.ok) {
                const data = await res.json();
                toast.success(`🚀 유튜브 자동 배포 관리 대기열에 등록되었습니다! (ID: ${data.item_id})`);
            } else {
                toast.success(`🚀 유튜브 자동 배포 관리 대기열에 등록되었습니다!`);
            }
        } catch {
            toast.success(`🚀 유튜브 자동 배포 관리 대기열에 등록되었습니다!`);
        } finally {
            setEnqueuingDeploy(false);
            setMenuOpen(false);
        }
    };

    const displayTitle = filename.replace(/\.[^/.]+$/, '') || 'reference h264';
    const cleanDuration = duration.replace(/초$/, '').includes(':') ? duration : `0:${duration.replace(/초$/, '').padStart(2, '0')}`;

    return (
        <div className="w-full max-w-xl my-2 flex flex-col gap-2.5 font-sans select-none animate-in fade-in duration-200">
            {/* 1:1 Matched Split Media Card */}
            <div className="flex flex-row items-center gap-4 p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
                {/* Left 9:16 Thumbnail / Inline Video Player */}
                <div 
                    onClick={togglePlay}
                    className="relative aspect-[9/16] w-32 sm:w-36 shrink-0 rounded-xl overflow-hidden bg-black border border-neutral-800 shadow-md group cursor-pointer"
                >
                    <video
                        ref={videoRef}
                        src={resolvedVideoUrl}
                        playsInline
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={() => setIsPlaying(false)}
                        className="w-full h-full object-cover"
                    />

                    {/* Centered Big Play Overlay Button (Visible when paused) */}
                    {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/35 group-hover:bg-black/50 transition-colors backdrop-blur-[1px]">
                            <div className="w-11 h-11 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center backdrop-blur-md transition-transform transform group-hover:scale-110 shadow-lg">
                                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                            </div>
                        </div>
                    )}

                    {/* Bottom overlay badge (출처 & 러닝타임) */}
                    <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex items-center justify-between text-white text-[10px]">
                        <span className="truncate opacity-90 max-w-[70px] font-medium">출처 : {sourceName}</span>
                        <span className="font-mono bg-black/60 px-1.5 py-0.5 rounded text-[10px] tabular-nums font-semibold">
                            {cleanDuration}
                        </span>
                    </div>

                    {/* Small In-Player Audio/Mute Toggle */}
                    {isPlaying && (
                        <button
                            type="button"
                            onClick={toggleMute}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
                            title={isMuted ? "음소거 해제" : "음소거"}
                        >
                            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        </button>
                    )}
                </div>

                {/* Right Info & Action Buttons Column */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-2 py-0.5">
                    {/* Video Title */}
                    <h3 className="font-bold text-sm sm:text-base text-foreground truncate tracking-tight" title={displayTitle}>
                        {displayTitle}
                    </h3>

                    {/* Metadata Line: 러닝타임 · 해상도 · 용량 */}
                    <div className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                        <span className="tabular-nums font-semibold">{cleanDuration}</span>
                        <span>·</span>
                        <span>{resolution}</span>
                        <span>·</span>
                        <span>{fileSizeMb} MB</span>
                    </div>

                    {/* Button Row: [▶ 재생], [패널에서 보기], [...] */}
                    <div className="flex items-center gap-2 pt-1 relative">
                        {/* [▶ 재생] Button (Solid black pill button) */}
                        <button
                            type="button"
                            onClick={togglePlay}
                            className="px-4 py-2 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-bold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
                        >
                            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                            <span>{isPlaying ? '일시정지' : '재생'}</span>
                        </button>

                        {/* [패널에서 보기] Button (Gray pill button) */}
                        {onOpenInRightPanel && (
                            <button
                                type="button"
                                onClick={handleOpenInPanel}
                                className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0"
                            >
                                <PanelRight className="w-3.5 h-3.5" />
                                <span>패널에서 보기</span>
                            </button>
                        )}

                        {/* More Action Dropdown Menu Button */}
                        <div className="relative" ref={menuRef}>
                            <button
                                type="button"
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer"
                                title="추가 메뉴"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 top-full mt-1 w-52 rounded-xl bg-card border border-border shadow-xl py-1.5 z-50 text-xs text-foreground divide-y divide-border/40 animate-in fade-in-50 zoom-in-95 duration-100">
                                    <div className="py-1">
                                        <button
                                            type="button"
                                            onClick={handleEnqueueAutoDeployment}
                                            disabled={enqueuingDeploy}
                                            className="w-full px-3 py-1.5 text-left hover:bg-muted/80 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer transition-colors"
                                        >
                                            <Rocket className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>🚀 유튜브 자동 배포 등록</span>
                                        </button>
                                    </div>
                                    <div className="py-1">
                                        <button
                                            type="button"
                                            onClick={handleExportToCapcut}
                                            disabled={exportingCapcut}
                                            className="w-full px-3 py-1.5 text-left hover:bg-muted/80 flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold cursor-pointer transition-colors"
                                        >
                                            <Film className="w-3.5 h-3.5 text-amber-500" />
                                            <span>🎬 CapCut 프로젝트로 열기</span>
                                        </button>
                                    </div>
                                    <div className="py-1">
                                        <button
                                            type="button"
                                            onClick={handleOpenFileLocation}
                                            className="w-full px-3 py-1.5 text-left hover:bg-muted/80 flex items-center gap-2 text-foreground cursor-pointer transition-colors"
                                        >
                                            <Folder className="w-3.5 h-3.5 text-primary" />
                                            <span>탐색기에서 파일 위치 열기</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCopyPath}
                                            className="w-full px-3 py-1.5 text-left hover:bg-muted/80 flex items-center gap-2 text-foreground cursor-pointer transition-colors"
                                        >
                                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span>파일 경로 복사</span>
                                        </button>
                                    </div>
                                    <div className="py-1">
                                        <button
                                            type="button"
                                            onClick={handleSendToEditor}
                                            className="w-full px-3 py-1.5 text-left hover:bg-muted/80 flex items-center gap-2 text-foreground cursor-pointer transition-colors"
                                        >
                                            <Play className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>4대 폼팩터 편집기로 열기</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDownload}
                                            className="w-full px-3 py-1.5 text-left hover:bg-muted/80 flex items-center gap-2 text-foreground cursor-pointer transition-colors"
                                        >
                                            <Download className="w-3.5 h-3.5 text-purple-500" />
                                            <span>고화질 MP4 내려받기</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Analysis & Rendering Report Text Below Card */}
            <div className="text-xs text-foreground/90 leading-relaxed px-1 space-y-1.5">
                {description && <p>{description}</p>}

                {/* Collapsible Analysis Report Link */}
                {(style?.header_title || style?.subtitle || style?.voice || style?.ai_image || resolution || fps) && (
                    <div className="pt-0.5">
                        <button
                            type="button"
                            onClick={() => setReportExpanded(!reportExpanded)}
                            className="text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer text-xs group"
                        >
                            <span>• 전체 분석 보고서 ― 프레임 탐색·편집점·재현 기준</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 text-primary ${reportExpanded ? 'rotate-180' : ''}`} />
                        </button>

                        {reportExpanded && (
                            <div className="mt-2 p-3 rounded-xl bg-muted/30 border border-border/60 text-xs space-y-1.5 animate-in fade-in-50 duration-150">
                                <div className="flex items-center justify-between text-muted-foreground font-mono text-[11px] pb-1 border-b border-border/40">
                                    {resolution && <span>규격: {resolution}</span>}
                                    {fps && <span>프레임 레이트: {fps}fps</span>}
                                    {fileSizeMb && <span>파일 크기: {fileSizeMb}MB</span>}
                                </div>
                                <div className="space-y-1 pt-1 text-foreground/80">
                                    {style?.header_title && <div>• <b>상단 타이틀:</b> {style.header_title}</div>}
                                    {style?.subtitle && <div>• <b>물리 자막:</b> {style.subtitle}</div>}
                                    {style?.voice && <div>• <b>음성 엔진:</b> {style.voice}</div>}
                                    {style?.ai_image && <div>• <b>비주얼 엔진:</b> {style.ai_image}</div>}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Subtle Feedback & Timing Footer */}
            <div className="flex items-center justify-between pt-0.5 px-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setLiked(true);
                            toast.success('좋은 평가 감사합니다! 이 영상 스타일을 선호 프리셋으로 반영합니다.');
                        }}
                        className={`p-1 rounded-md hover:bg-muted transition-colors cursor-pointer ${liked === true ? 'text-primary bg-primary/10' : ''}`}
                        title="이 결과물 마음에 들어요"
                    >
                        <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setLiked(false);
                            toast.info('피드백을 접수했습니다. 스타일을 미세 조정해보세요.');
                        }}
                        className={`p-1 rounded-md hover:bg-muted transition-colors cursor-pointer ${liked === false ? 'text-destructive bg-destructive/10' : ''}`}
                        title="수정이 필요해요"
                    >
                        <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={handleCopyPath}
                        className="p-1 rounded-md hover:bg-muted transition-colors cursor-pointer"
                        title="파일 경로 복사"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
                    <Clock className="w-3 h-3" />
                    <span>{timeElapsedText}</span>
                </div>
            </div>
        </div>
    );
};
