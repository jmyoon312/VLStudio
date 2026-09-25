import React, { useRef, useState } from 'react';
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
    Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

export interface EmbeddedVideoProps {
    filename: string;
    videoUrl: string;
    fileSizeMb?: number;
    duration?: string;
    timeElapsedText?: string;
    description?: string;
    filePath?: string;
    audioPath?: string;
    cues?: any[];
    style?: any;
    onOpenInRightPanel?: (videoUrl: string, filename: string, filePath?: string) => void;
}

export const EmbeddedVideoPlayer: React.FC<EmbeddedVideoProps> = ({
    filename,
    videoUrl,
    fileSizeMb = 9.8,
    duration = '0:21',
    timeElapsedText = '6분 38초 동안 작업했어요',
    description = '요청하신 프리셋 기준에 맞추어 완결되는 영상 클립을 생성했습니다. 다른 수정사항이 있으면 말씀해 주세요.',
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

    // Close menu on click outside
    React.useEffect(() => {
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

    const toggleMute = () => {
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

    const handleFullscreen = () => {
        if (!videoRef.current) return;
        if (videoRef.current.requestFullscreen) {
            videoRef.current.requestFullscreen();
        }
    };

    const handleDownload = async () => {
        try {
            toast.info(`${filename} 다운로드를 준비 중입니다...`);
            const res = await fetch(videoUrl);
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
        } catch (e) {
            const a = document.createElement('a');
            a.href = videoUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success(`${filename} 다운로드를 시작했습니다.`);
        }
    };

    const handleCopyPath = () => {
        const textToCopy = filePath || videoUrl;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('영상 파일 경로가 클립보드에 복사되었습니다.');
    };

    const handleOpenFileLocation = async () => {
        const targetPath = filePath || (videoUrl.startsWith('/files/') ? videoUrl.replace('/files/', '') : videoUrl);
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
        } catch (e) {
            toast.error('폴더 열기 요청 실패');
        }
        setMenuOpen(false);
    };

    const handleSendToEditor = () => {
        window.location.hash = '#/classic';
        toast.success('4대 폼팩터 전문 편집기로 이동합니다.');
        setMenuOpen(false);
    };

    // 🎬 CapCut PC로 완성된 프로젝트(영상+오디오+자막+상하단바) 1:1 내보내기 & 자동 실행
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
        } catch (e) {
            toast.error('CapCut 내보내기 통신 오류가 발생했습니다.');
        } finally {
            setExportingCapcut(false);
            setMenuOpen(false);
        }
    };

    return (
        <div className="w-full max-w-md my-3 flex flex-col gap-2 font-sans select-none">
            {/* Top Attachment Header Bar */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1 py-1 relative">
                <div className="flex items-center gap-1.5 truncate">
                    <FileVideo className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-medium text-foreground truncate">{filename}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">· {fileSizeMb}MB</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={handleExportToCapcut}
                        disabled={exportingCapcut}
                        className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                        title="완성된 영상을 동일한 스타일의 CapCut 드래프트로 열기"
                    >
                        <Film className="w-3 h-3" />
                        <span>{exportingCapcut ? '생성 중...' : 'CapCut 열기'}</span>
                    </button>
                    {onOpenInRightPanel && (
                        <button
                            type="button"
                            onClick={() => onOpenInRightPanel(videoUrl, filename, filePath)}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                        >
                            <ExternalLink className="w-3 h-3" />
                            패널
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                    >
                        <Download className="w-3 h-3" />
                        다운로드
                    </button>
                    
                    {/* More Action Dropdown */}
                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors cursor-pointer hover:bg-muted"
                            title="추가 메뉴"
                        >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {menuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-52 rounded-xl bg-card border border-border shadow-xl py-1.5 z-50 text-xs text-foreground divide-y divide-border/40 animate-in fade-in-50 zoom-in-95 duration-100">
                                <div className="py-1">
                                    <button
                                        type="button"
                                        onClick={handleExportToCapcut}
                                        disabled={exportingCapcut}
                                        className="w-full px-3 py-1.5 text-left hover:bg-muted/80 flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold cursor-pointer transition-colors"
                                    >
                                        <Film className="w-3.5 h-3.5 text-amber-500" />
                                        <span>🎬 CapCut 프로젝트로 내보내기</span>
                                    </button>
                                </div>
                                <div className="py-1">
                                    <button
                                        type="button"
                                        onClick={handleOpenFileLocation}
                                        className="w-full px-3 py-1.5 text-left hover:bg-muted/80 flex items-center gap-2 text-foreground cursor-pointer transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5 text-primary" />
                                        <span>탐색기에서 파일 위치 열기</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleCopyPath();
                                            setMenuOpen(false);
                                        }}
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
                                        onClick={() => {
                                            handleDownload();
                                            setMenuOpen(false);
                                        }}
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

            {/* 9:16 Video Player Container */}
            <div className="relative aspect-[9/16] w-full max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-black border border-neutral-800 shadow-2xl group">
                <video
                    ref={videoRef}
                    src={videoUrl}
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={togglePlay}
                />

                {/* Big Center Play Button when paused */}
                {!isPlaying && (
                    <div 
                        onClick={togglePlay}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-2xs cursor-pointer transition-opacity"
                    >
                        <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center backdrop-blur-md transition-transform transform hover:scale-110">
                            <Play className="w-6 h-6 text-white fill-white ml-1" />
                        </div>
                    </div>
                )}

                {/* Bottom Video Controls Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer">
                        <div 
                            className="h-full bg-primary transition-all duration-100" 
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>

                    <div className="flex items-center justify-between text-white text-xs">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={togglePlay}
                                className="text-white hover:text-primary transition-colors"
                            >
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                            </button>
                            <span className="text-[11px] tabular-nums font-mono opacity-90">
                                {currentTime} / {duration}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={toggleMute}
                                className="text-white hover:text-primary transition-colors"
                            >
                                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                            <button
                                type="button"
                                onClick={handleFullscreen}
                                className="text-white hover:text-primary transition-colors"
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Description note */}
            {description && (
                <p className="text-xs text-foreground/90 leading-relaxed px-1 mt-1">
                    {description}
                </p>
            )}

            {/* Feedback & Timing Footer Bar */}
            <div className="flex items-center justify-between pt-1 px-1 text-xs text-muted-foreground">
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
                            toast.info('피드백을 접수했습니다. 아래 피드백 튜닝 칩으로 스타일을 미세 조정해보세요.');
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
