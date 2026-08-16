import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Globe, RefreshCw, Flame, Loader2, Play, Trash2,
    Users, Eye, TrendingUp, Filter, CheckSquare, Square,
    BarChart3, ExternalLink, Download, Scissors,
    Shield, ChevronDown, X, Search, LayoutGrid, List,
    AlertCircle, Zap, Clock, Activity, Radio, Sparkles,
    ChevronRight, MoreVertical, Copy, BookOpen, Brain, Pause, PauseCircle, Plus
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from 'react-router-dom';

// ──────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────
interface OutlierVideo {
    id: string;
    title: string;
    upload_date?: string;
    thumbnail: string;
    channelName: string;
    channelUrl?: string;
    videoUrl?: string;
    language?: string;
    subscribers?: number;
    subscriber_count?: number;
    views: number;
    likes?: number;
    comments?: number;
    ratio: number;
    ev_ratio?: number;
    category: string;
    duration?: number;
    is_short?: boolean;
    tier?: string;
    velocity_score?: number;
    view_count?: number;
    video_id?: string;
    status?: string;
    metadata_json?: any;
    viral_score?: number;
}

interface ScannerState {
    is_running: boolean;
    is_paused?: boolean;
    is_llm_refreshing?: boolean;
    scout_progress: number;
    scout_total: number;
    track_progress: number;
    track_total: number;
    new_outliers: number;
    total_added: number;
    total_reviewed: number;
    shorts_added: number;
    long_added: number;
    current_target?: string;
    last_run?: string;
    current_categories?: string[];
    current_keywords?: string[];
    current_hashtags?: string[];
    status?: string;
}

interface CustomCategory {
    id?: string;
    name: string;
    is_shorts: boolean;
    priority_weight: number;
    created_at?: string;
}

// ──────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────

const getYouTubeUrl = (v: OutlierVideo) => v.videoUrl || (v.is_short ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`);

const SORT_OPTIONS = [
    { value: 'ratio', label: 'VSR 비율순' },
    { value: 'views', label: '조회수순' },
    { value: 'subscribers', label: '구독자순' },
    { value: 'recent', label: '최근 수집순' },
];

const VIEW_FILTERS = [
    { value: 'all', label: '전체' },
    { value: '1k', label: '1K+' },
    { value: '10k', label: '1만+' },
    { value: '100k', label: '10만+' },
    { value: '1m', label: '100만+' },
];

const SUB_FILTERS = [
    { value: 'all', label: '전체' },
    { value: 'micro', label: '~1만' },
    { value: 'small', label: '1~10만' },
    { value: 'mid', label: '10~100만' },
    { value: 'large', label: '100만+' },
];

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────
const formatCount = (n?: number) => {
    if (!n || n === 0) return '0';
    if (n >= 100_000_000) return (n / 100_000_000).toFixed(1) + '억';
    if (n >= 10_000) return (n / 10_000).toFixed(1) + '만';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toLocaleString();
};

const formatDuration = (secs?: number) => {
    if (!secs || secs <= 0) return null;
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m < 60) return `${m}:${String(s).padStart(2, '0')}`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}:${String(rm).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const getTierStyle = (tier?: string) => {
    switch (tier) {
        case 'golden': return { bg: 'bg-yellow-400', text: 'text-black', label: '🏆 황금', ring: 'ring-yellow-400/40' };
        case 'rising': return { bg: 'bg-orange-500', text: 'text-white', label: '🔥 급상승', ring: 'ring-orange-500/40' };
        case 'normal': return { bg: 'bg-blue-500', text: 'text-white', label: '📊 주목', ring: 'ring-blue-500/30' };
        default: return { bg: 'bg-muted', text: 'text-muted-foreground', label: '• 관찰중', ring: '' };
    }
};

const getVsrColor = (ratio: number) => {
    if (ratio >= 50) return 'text-yellow-500 font-black';
    if (ratio >= 20) return 'text-orange-500 font-bold';
    if (ratio >= 5) return 'text-blue-400 font-bold';
    return 'text-muted-foreground';
};

const timeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    let parsedDate;
    if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
        parsedDate = new Date(`${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}T00:00:00Z`);
    } else {
        parsedDate = new Date(dateStr);
    }
    const diff = Date.now() - parsedDate.getTime();
    if (isNaN(diff)) return '알 수 없음';
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return '방금 전';
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
};

// ──────────────────────────────────────────────────
// Live Scanner Widget (always visible)
// ──────────────────────────────────────────────────
function LiveScannerWidget({ state, isScanning, onForceScan, onRefreshTrends, onTogglePause }: {
    state: ScannerState | null;
    isScanning: boolean;
    onForceScan: () => void;
    onRefreshTrends: () => void;
    onTogglePause: () => void;
}) {
    const isActive = isScanning || (state?.is_running ?? false);

    return (
        <div className={`rounded-xl border p-3 shrink-0 transition-all duration-500 ${isActive
            ? 'bg-primary/5 border-primary/30 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]'
            : 'bg-card border-border'
            }`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    <span className="text-xs font-black text-foreground uppercase tracking-wider">
                        {isActive ? (state?.is_paused ? '⏸ 일시정지됨' : '🔴 LIVE 수집 중') : '⏸ 대기 중'}
                    </span>
                    {state?.current_target && isActive && (
                        <span className="text-xs text-primary font-bold animate-pulse">→ {state.current_target}</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {/* Stats chips */}
                    <div className="hidden md:flex items-center gap-2 text-[10px] font-bold">
                        <span className="px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                            검토 {formatCount(state?.total_reviewed || 0)}건
                        </span>
                        <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded-full">
                            🔥 아웃라이어 {state?.new_outliers || 0}건
                        </span>
                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-500 rounded-full">
                            🩳 숏폼 {state?.shorts_added || 0}건
                        </span>
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full">
                            🎬 롱폼 {state?.long_added || 0}건
                        </span>
                    </div>
                    <button
                        onClick={onRefreshTrends}
                        disabled={state?.is_llm_refreshing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {state?.is_llm_refreshing ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                갱신 중...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3 h-3" />
                                AI 갱신
                            </>
                        )}
                    </button>
                    {isActive && (
                        <button
                            onClick={onTogglePause}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${state?.is_paused ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}
                        >
                            {state?.is_paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                            {state?.is_paused ? '계속' : '정지'}
                        </button>
                    )}
                    <button
                        onClick={onForceScan}
                        disabled={isActive && !state?.is_paused}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-all"
                    >
                        {isActive && !state?.is_paused ? <Loader2 className="w-3 h-3 animate-spin" /> : <Radio className="w-3 h-3" />}
                        {isActive && !state?.is_paused ? '수집 중...' : '즉시 실행'}
                    </button>
                </div>
            </div>

            {/* Progress bars */}
            {isActive && state && (
                <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-border">
                    <div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>1단계: 카테고리 스카우팅</span>
                            <span className="font-bold">{state.scout_progress || 0}/{state.scout_total || 5}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-700 rounded-full"
                                style={{ width: `${((state.scout_progress || 0) / Math.max(1, state.scout_total || 5)) * 100}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>2단계: 추적 대상 재평가</span>
                            <span className="font-bold">{state.track_progress || 0}/{state.track_total || 0}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 transition-all duration-700 rounded-full"
                                style={{ width: `${((state.track_progress || 0) / Math.max(1, state.track_total || 100)) * 100}%` }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Live Collection Data */}
            {isActive && (
                <div className="mt-3 pt-3 border-t border-border/50 text-[10px]">
                    {state?.current_target && (
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-black text-muted-foreground shrink-0">수집 중:</span>
                            <span className="px-2 py-0.5 bg-primary/20 text-primary rounded font-black text-xs animate-pulse">{state.current_target}</span>
                        </div>
                    )}
                    {state?.current_keywords && state.current_keywords.filter(k => k !== '숏폼 필터 적용').length > 0 && (
                        <div className="flex gap-2 items-start mb-1.5">
                            <span className="font-bold whitespace-nowrap text-muted-foreground">키워드:</span>
                            <div className="flex flex-wrap gap-1">
                                {state.current_keywords.filter(k => k !== '숏폼 필터 적용').map(k => <span key={k} className="px-1.5 py-0.5 bg-orange-500/10 text-orange-500 rounded font-semibold">{k}</span>)}
                            </div>
                        </div>
                    )}
                    {state?.current_hashtags && state.current_hashtags.length > 0 && (
                        <div className="flex gap-2 items-start">
                            <span className="font-bold whitespace-nowrap text-muted-foreground">해시태그:</span>
                            <div className="flex flex-wrap gap-1">
                                {state.current_hashtags.map(h => <span key={h} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded font-semibold">{h}</span>)}
                            </div>
                        </div>
                    )}
                    {(!state?.current_keywords || state.current_keywords.length === 0) && (!state?.current_hashtags || state.current_hashtags.length === 0) && (
                        <p className="text-muted-foreground">키워드 풀 로드 중...</p>
                    )}
                </div>
            )}

            {/* Last run info */}
            {!isActive && state?.last_run && (
                <p className="text-[10px] text-muted-foreground mt-1">
                    마지막 수집: {new Date(state.last_run).toLocaleString('ko-KR')}
                </p>
            )}
        </div>
    );
}



// ──────────────────────────────────────────────────
// Action Menu
// ──────────────────────────────────────────────────
function ActionMenu({ video, onClose, onMapCategory }: { video: OutlierVideo; onClose: () => void; onMapCategory?: () => void }) {
    const videoUrl = getYouTubeUrl(video);
    const navigate = useNavigate();

    const handleAddToQueue = async () => {
        try {
            await api.post('/work-queue/items', {
                title: video.title,
                video_file_path: videoUrl,
                source_type: 'DISCOVERY',
                approval_required: false,
                description: `[아웃라이어] 채널: ${video.channelName} | 카테고리: ${video.category} | VSR: ${(video.ratio || 0).toFixed(1)}x | 구독자: ${formatCount(video.subscribers)}`,
            });
            toast.success(`작업 큐에 추가됨`);
        } catch (e) {
            toast.error("작업 큐 추가 실패");
        }
        onClose();
    };

    const handleOpenYouTube = () => {
        window.open(videoUrl, '_blank');
        onClose();
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(videoUrl);
        toast.success("URL 복사됨");
        onClose();
    };

    const handleOpenChannel = () => {
        if (video.channelUrl) window.open(video.channelUrl, '_blank');
        else window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(video.channelName)}`, '_blank');
        onClose();
    };

    const handleScriptLab = () => {
        navigate(`/script-lab?url=${encodeURIComponent(videoUrl)}&auto=true`);
        toast.success("대본 생성 및 편집 페이지로 이동합니다.");
        onClose();
    };
    
    const handleChannelExplore = () => {
        navigate(`/channel-explorer?channelName=${encodeURIComponent(video.channelName)}`);
        onClose();
    };

    return (
        <div className="absolute right-0 top-full mt-1 z-[100] w-52 bg-popover border border-border rounded-xl shadow-2xl p-1 animate-in fade-in slide-in-from-top-1">
            <button onClick={handleOpenYouTube} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold hover:bg-muted rounded-lg transition-colors text-left">
                <ExternalLink className="w-3.5 h-3.5 text-red-500" /> YouTube에서 보기
            </button>
            <button onClick={() => { onMapCategory?.(); onClose(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold hover:bg-muted rounded-lg transition-colors text-left">
                <Shield className="w-3.5 h-3.5 text-green-500" /> 소카테고리에 채널 매핑
            </button>
            <div className="h-px bg-border my-1" />
            <button onClick={handleScriptLab} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold hover:bg-muted rounded-lg transition-colors text-left">
                <Scissors className="w-3.5 h-3.5 text-purple-500" /> 대본 추출 및 편집
            </button>
            <button onClick={handleAddToQueue} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold hover:bg-muted rounded-lg transition-colors text-left">
                <Download className="w-3.5 h-3.5 text-primary" /> 카테고리 없는 영상 다운
            </button>
            <button onClick={handleChannelExplore} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold hover:bg-muted rounded-lg transition-colors text-left">
                <Users className="w-3.5 h-3.5 text-blue-400" /> 참조 채널 분석
            </button>
            <div className="h-px bg-border my-1" />
            <button onClick={handleCopyUrl} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold hover:bg-muted rounded-lg transition-colors text-left text-muted-foreground">
                <Copy className="w-3.5 h-3.5" /> URL 복사
            </button>
        </div>
    );
}

// ──────────────────────────────────────────────────
// Video Card
// ──────────────────────────────────────────────────
function VideoCard({ video, isSelectMode, isSelected, onToggleSelect, onMapCategory }: {
    video: OutlierVideo;
    isSelectMode: boolean;
    isSelected: boolean;
    onToggleSelect: () => void;
    onMapCategory?: (v: OutlierVideo) => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const views = video.views || video.view_count || 0;
    const tier = getTierStyle(video.tier);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        if (menuOpen) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen]);

    return (
        <div
            className={`bg-card border rounded-2xl shadow-sm hover:shadow-lg transition-all group flex flex-col relative
                ${isSelected ? 'border-primary ring-2 ring-primary/30' : `border-border hover:border-border/80 ${tier.ring ? 'hover:ring-1 hover:' + tier.ring : ''}`}
                ${isSelectMode ? 'cursor-pointer' : ''}`}
            onClick={() => isSelectMode && onToggleSelect()}
        >
            {/* Thumbnail / Player container */}
            <div className="relative aspect-video bg-black overflow-hidden rounded-t-2xl shrink-0">
                {!isPlaying ? (
                    <>
                        <img
                            src={video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                            alt={video.title}
                            className={`w-full h-full transition-transform duration-500 group-hover:scale-105 ${video.is_short ? 'object-contain bg-zinc-900' : 'object-cover'}`}
                            onError={e => { (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`; }}
                        />
                        {/* Format pill */}
                        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black z-10 shadow-sm
                            ${video.is_short ? 'bg-purple-600 text-white' : 'bg-zinc-900/80 text-white'}`}>
                            {video.is_short ? '🩳 SHORTS' : '🎬 LONG'}
                        </div>
                        {/* Tier badge */}
                        {video.tier && video.tier !== 'background' && (
                            <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black z-10 shadow-sm ${tier.bg} ${tier.text}`}>
                                {tier.label}
                            </div>
                        )}
                        {/* Select checkbox */}
                        {isSelectMode && (
                            <div className={`absolute bottom-2 right-2 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                                ${isSelected ? 'bg-primary border-primary' : 'bg-black/50 border-white/60'}`}>
                                {isSelected && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                            </div>
                        )}
                        {/* Hover: click to play inline */}
                        {!isSelectMode && (
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); setIsPlaying(true); }}
                            >
                                <button className="p-3 bg-red-600/90 hover:bg-red-600 backdrop-blur-sm rounded-full text-white transition-all hover:scale-110 shadow-xl">
                                    <Play className="w-5 h-5 fill-current" />
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <iframe 
                        src={`https://www.youtube.com/embed/${video.id}?autoplay=1&mute=0`} 
                        className="w-full h-full" 
                        allow="autoplay; encrypted-media" 
                        allowFullScreen 
                        title={video.title} 
                    />
                )}
            </div>

            {/* Card Body */}
            <div className="p-3 flex flex-col gap-2 flex-1">
                <h3 className="font-bold text-xs text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {video.title}
                </h3>

                {/* Info row */}
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 shrink-0" />
                        <span className="truncate">{video.channelName || '알 수 없음'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] flex-wrap">
                        <span className="px-1.5 py-0.5 bg-muted rounded-md text-foreground font-medium">{video.category || '알 수 없음'}</span>
                        {video.upload_date && (
                            <span className="flex items-center gap-0.5 font-medium text-foreground">
                                <Clock className="w-3 h-3 shrink-0" />
                                {timeAgo(video.upload_date)}
                            </span>
                        )}
                        {formatDuration(video.duration) && (
                            <span className="flex items-center gap-0.5 font-mono">
                                ⏱ {formatDuration(video.duration)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-5 gap-0.5 mt-auto pt-2 border-t border-border px-0.5">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-0.5 text-foreground">
                            <span className="text-[10px] font-bold">{formatCount(views)}</span>
                        </div>
                        <span className="text-[8px] text-muted-foreground">조회수</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-0.5 text-foreground">
                            <span className="text-[10px] font-bold">{formatCount(Number(video.subscribers || (video as any).subscriberCount || video.subscriber_count || 0))}</span>
                        </div>
                        <span className="text-[8px] text-muted-foreground">구독자</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className={`flex items-center gap-0.5 ${getVsrColor(video.ratio || 0)}`}>
                            <span className="text-[10px] font-bold">{(video.ratio || 0).toFixed(1)}x</span>
                        </div>
                        <span className="text-[8px] text-muted-foreground">VSR</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-0.5 text-orange-500">
                            <span className="text-[10px] font-bold">{video.viral_score ? video.viral_score.toFixed(1) : '0.0'}%</span>
                        </div>
                        <span className="text-[8px] text-muted-foreground">바이럴</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-0.5 text-purple-500">
                            <span className="text-[10px] font-bold">{video.velocity_score ? formatCount(video.velocity_score) : '0'}</span>
                        </div>
                        <span className="text-[8px] text-muted-foreground">뷰/h</span>
                    </div>
                </div>

                {/* Action buttons */}
                {!isSelectMode && (
                    <div className="flex gap-1 mt-1">
                        <button
                            onClick={e => { e.stopPropagation(); window.open(video.videoUrl || `https://www.youtube.com/watch?v=${video.id}`, '_blank'); }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold rounded-lg bg-muted hover:bg-red-500/10 hover:text-red-500 border border-border hover:border-red-500/30 transition-all"
                        >
                            <ExternalLink className="w-3 h-3" /> YouTube
                        </button>
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                                className="px-2 py-1.5 text-[11px] font-bold rounded-lg bg-muted hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/30 transition-all flex items-center gap-1"
                            >
                                <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            {menuOpen && (
                                <ActionMenu video={video} onClose={() => setMenuOpen(false)} onMapCategory={() => onMapCategory?.(video)} />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────
// Video Row (List Mode)
// ──────────────────────────────────────────────────
function VideoRow({ video, isSelectMode, isSelected, onToggleSelect, onMapCategory }: {
    video: OutlierVideo;
    isSelectMode: boolean;
    isSelected: boolean;
    onToggleSelect: () => void;
    onMapCategory?: (v: OutlierVideo) => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const views = video.views || video.view_count || 0;
    const tier = getTierStyle(video.tier);

    return (
        <div
            className={`bg-card border rounded-xl p-3 flex items-center gap-3 hover:shadow-sm transition-all group ${isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border'} ${isSelectMode ? 'cursor-pointer' : ''}`}
            onClick={() => isSelectMode && onToggleSelect()}
        >
            {isSelectMode && (
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                    {isSelected && <CheckSquare className="w-3 h-3 text-white" />}
                </div>
            )}

            <div className="relative w-28 aspect-video rounded-lg overflow-hidden shrink-0 bg-muted">
                <img src={video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt={video.title} className="w-full h-full object-cover" />
                <div className={`absolute bottom-1 left-1 px-1 py-0.5 rounded text-[8px] font-black ${video.is_short ? 'bg-purple-600 text-white' : 'bg-zinc-900/80 text-white'}`}>
                    {video.is_short ? 'SHORTS' : 'LONG'}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">{video.title}</h3>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{video.channelName || '알 수 없음'}</span>
                    <span>•</span>
                    <span className="text-foreground font-medium">{video.category}</span>
                    {video.tier && video.tier !== 'background' && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${tier.bg} ${tier.text}`}>{tier.label}</span>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-5 shrink-0">
                <div className="text-center min-w-[50px]">
                    <div className="text-sm font-bold text-foreground">{formatCount(views)}</div>
                    <div className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5">
                        <Eye className="w-2.5 h-2.5" /> 조회수
                    </div>
                </div>
                <div className="text-center min-w-[50px]">
                    <div className="text-sm font-bold text-foreground">{formatCount(video.subscribers)}</div>
                    <div className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5">
                        <Users className="w-2.5 h-2.5" /> 구독자
                    </div>
                </div>
                <div className="text-center min-w-[45px]">
                    <div className={`text-sm ${getVsrColor(video.ratio || 0)}`}>{(video.ratio || 0).toFixed(1)}x</div>
                    <div className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5">
                        <BarChart3 className="w-2.5 h-2.5" /> VSR
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-4 border-l pl-4 ml-2">
                    <div className="text-center min-w-[40px]">
                        <div className="text-sm font-bold text-orange-500">{video.viral_score ? video.viral_score.toFixed(1) : '0.0'}%</div>
                        <div className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5">
                            <Flame className="w-2.5 h-2.5 text-orange-400" /> 바이럴
                        </div>
                    </div>
                    <div className="text-center min-w-[40px]">
                        <div className="text-sm font-bold text-purple-500">{video.velocity_score ? formatCount(video.velocity_score) : '0'}</div>
                        <div className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5">
                            <Zap className="w-2.5 h-2.5 text-purple-400" /> 뷰/h
                        </div>
                    </div>
                    {video.upload_date && (
                        <div className="text-center min-w-[50px]">
                            <div className="text-sm font-medium text-foreground">{timeAgo(video.upload_date)}</div>
                            <div className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" /> 업로드
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            {!isSelectMode && (
                <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={e => { e.stopPropagation(); window.open(getYouTubeUrl(video), '_blank'); }}
                        className="p-2 rounded-lg border border-border hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all" title="YouTube 보기">
                        <ExternalLink className="w-4 h-4" />
                    </button>
                    <div className="relative" ref={menuRef}>
                        <button onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                            className="p-2 rounded-lg border border-border hover:bg-muted transition-all">
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuOpen && <ActionMenu video={video} onClose={() => setMenuOpen(false)} onMapCategory={() => onMapCategory?.(video)} />}
                    </div>
                </div>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────
function KeywordExplorer() {
    const [videos, setVideos] = useState<OutlierVideo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [scannerState, setScannerState] = useState<ScannerState | null>(null);

    const [selectedCategory, setSelectedCategory] = useState("전체");
    const [topCategories, setTopCategories] = useState<string[]>([
        "전체", "IT 리뷰", "코미디", "브이로그", "일상", "여행",
        "게임", "마인크래프트", "뉴스", "요리", "홈트", "엔터테인먼트",
        "음악", "스포츠", "교육", "쇼츠"
    ]);
    
    // Custom Categories Management
    const [customCategories, setCustomCategories] = useState<CustomCategory[]>([
        { id: "cat_politics", name: "정치", is_shorts: false, priority_weight: 2 },
        { id: "cat_economy", name: "경제", is_shorts: false, priority_weight: 2 },
        { id: "cat_history", name: "역사", is_shorts: false, priority_weight: 2 },
        { id: "cat_knowledge", name: "지식", is_shorts: false, priority_weight: 2 },
        { id: "cat_info", name: "정보", is_shorts: false, priority_weight: 2 },
        { id: "cat_yadam", name: "야담", is_shorts: false, priority_weight: 2 },
        { id: "cat_war", name: "전쟁", is_shorts: false, priority_weight: 2 },
        { id: "cat_anime", name: "일본 애니", is_shorts: false, priority_weight: 2 },
        { id: "cat_drama", name: "드라마", is_shorts: false, priority_weight: 2 },
        { id: "cat_movie", name: "영화", is_shorts: false, priority_weight: 2 },
        { id: "cat_food", name: "음식", is_shorts: false, priority_weight: 2 },
        { id: "cat_senior", name: "시니어 정보", is_shorts: false, priority_weight: 2 }
    ]);
    const [nicheCategories, setNicheCategories] = useState<any[]>([]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatIsShorts, setNewCatIsShorts] = useState(false);
    const [contentFormat, setContentFormat] = useState<'all' | 'shorts' | 'long'>('all');
    const [sortBy, setSortBy] = useState('ratio');
    const [viewFilter, setViewFilter] = useState('all');
    const [subFilter, setSubFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Mapping Modal States
    const [mappingModalOpen, setMappingModalOpen] = useState(false);
    const [mappingTargets, setMappingTargets] = useState<OutlierVideo[]>([]);
    const [selectedMapCategoryId, setSelectedMapCategoryId] = useState<number | null>(null);
    const [isMapping, setIsMapping] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const resp = await api.get('/keywords/curation');
            setVideos(resp.data || []);
        } catch (e) {
            console.error(e);
            toast.error("데이터 로드 실패");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const prevRunningRef = useRef(false);
    const prevLlmRefreshingRef = useRef(false);

    // Poll scanner state every 3s always (not just when scanning)
    useEffect(() => {
        loadData();
        // Load custom categories from DB
        api.get('/keywords/categories').then(r => {
            if (r.data && Array.isArray(r.data) && r.data.length > 0) {
                setCustomCategories(r.data);
            }
        }).catch(() => {});
        
        // Load niche categories from CategoryTree DB
        api.get('/categories/tree').then(r => {
            if (Array.isArray(r.data)) {
                const flatNiches: any[] = [];
                const level0: string[] = ["전체"];
                const extractNiches = (nodes: any[]) => {
                    for (const node of nodes) {
                        if (node.level === 0 && !level0.includes(node.name)) {
                            level0.push(node.name);
                        }
                        if (node.level === 2) {
                            flatNiches.push(node);
                        }
                        if (node.children) {
                            extractNiches(node.children);
                        }
                    }
                };
                extractNiches(r.data);
                if (!level0.includes("쇼츠")) level0.push("쇼츠");
                if (level0.length > 2) {
                    setTopCategories(level0);
                }
                setNicheCategories(flatNiches);
            }
        }).catch(() => {});
        const pollState = async () => {
            try {
                const r = await api.get('/keywords/radar/progress');
                setScannerState(r.data);
                
                const isCurrentlyRunning = r.data?.is_running;
                if (isCurrentlyRunning) {
                    setIsScanning(true);
                    prevRunningRef.current = true;
                } else if (prevRunningRef.current) {
                    // Transitioned from running to stopped
                    setIsScanning(false);
                    prevRunningRef.current = false;
                    toast.success(`스카웃 완료! (아웃라이어 ${r.data?.new_outliers || 0}건)`);
                    loadData();
                }

                const isCurrentlyLlmRefreshing = r.data?.is_llm_refreshing;
                if (isCurrentlyLlmRefreshing) {
                    prevLlmRefreshingRef.current = true;
                } else if (prevLlmRefreshingRef.current) {
                    prevLlmRefreshingRef.current = false;
                    toast.success("AI 트렌드 갱신 완료!");
                }
            } catch (e) { /* silent */ }
        };
        pollState();
        const interval = setInterval(pollState, 3000);
        return () => clearInterval(interval);
    }, [loadData]);

    const handleForceScan = async () => {
        try {
            toast.info("스카웃 엔진 가동 중...");
            await api.post('/keywords/radar/scan-now', {
                target_shorts_ratio: 0.7,
                custom_categories: customCategories.map(c => c.name)
            });
            setIsScanning(true);
            setScannerState(prev => ({ ...(prev || {} as ScannerState), is_running: true, scout_progress: 0, scout_total: 5, track_progress: 0, track_total: 0, new_outliers: 0, total_added: 0, total_reviewed: 0, shorts_added: 0, long_added: 0 }));
        } catch (e) {
            toast.error("스캔 시작 실패");
        }
    };

    const handleRefreshTrends = async () => {
        try {
            toast.info("AI 트렌드 분석 시작... (1~2분 소요)");
            await api.post('/keywords/radar/refresh-trends');
        } catch (e) {
            toast.error("AI 트렌드 갱신 요청 실패");
        }
    };

    const handleTogglePause = async () => {
        try {
            const isPausing = !scannerState?.is_paused;
            await api.post('/keywords/radar/toggle-pause', { pause: isPausing });
            setScannerState(prev => prev ? { ...prev, is_paused: isPausing } : null);
            toast.success(isPausing ? "수집을 일시정지했습니다." : "수집을 재개합니다.");
        } catch (e) {
            toast.error("일시정지 상태 변경 실패");
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`선택한 ${selectedIds.size}개를 목록에서 삭제하시겠습니까?`)) return;
        try {
            setIsDeleting(true);
            // POST is more reliable than DELETE+body (axios can strip body on DELETE)
            await api.post('/keywords/curation/delete', { video_ids: Array.from(selectedIds) });
            toast.success(`${selectedIds.size}개 삭제됨`);
            setSelectedIds(new Set());
            setIsSelectMode(false);
            loadData();
        } catch (e) {
            toast.error("삭제 실패");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBulkCopyUrl = () => {
        if (selectedIds.size === 0) return;
        const urls = videos.filter(v => selectedIds.has(v.id)).map(v => v.videoUrl || `https://www.youtube.com/watch?v=${v.id}`);
        navigator.clipboard.writeText(urls.join('\n'));
        toast.success(`${urls.length}개의 URL이 복사되었습니다.`);
    };
    const filteredVideos = React.useMemo(() => {
        let result = [...videos];

        if (selectedCategory !== "전체") {
            result = result.filter(v => {
                const cat = v.category || '';
                if (selectedCategory === "쇼츠") return v.is_short === true;
                return cat === selectedCategory || cat.includes(selectedCategory);
            });
        }
        if (contentFormat === 'shorts') result = result.filter(v => v.is_short === true);
        if (contentFormat === 'long') result = result.filter(v => !v.is_short);

        // Filter out videos with < 1000 subscribers (including 0)
        result = result.filter(v => {
            const subs = Number(v.subscribers || (v as any).subscriberCount || v.subscriber_count || 0);
            return subs >= 1000;
        });

        if (viewFilter !== 'all') {
            const minMap: Record<string, number> = { '1k': 1000, '10k': 10000, '100k': 100000, '1m': 1000000 };
            result = result.filter(v => (v.views || v.view_count || 0) >= (minMap[viewFilter] || 0));
        }
        if (subFilter !== 'all') {
            result = result.filter(v => {
                const s = v.subscribers || 0;
                if (subFilter === 'micro') return s < 10000;
                if (subFilter === 'small') return s >= 10000 && s < 100000;
                if (subFilter === 'mid') return s >= 100000 && s < 1000000;
                if (subFilter === 'large') return s >= 1000000;
                return true;
            });
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(v => v.title.toLowerCase().includes(q) || (v.channelName || '').toLowerCase().includes(q));
        }

        result.sort((a, b) => {
            if (sortBy === 'ratio') return (b.ratio || 0) - (a.ratio || 0);
            if (sortBy === 'views') return (b.views || b.view_count || 0) - (a.views || a.view_count || 0);
            if (sortBy === 'subscribers') return (b.subscribers || 0) - (a.subscribers || 0);
            return 0;
        });

        return result;
    }, [videos, selectedCategory, contentFormat, viewFilter, subFilter, searchQuery, sortBy]);

    const shortsCount = videos.filter(v => v.is_short).length;
    const longCount = videos.filter(v => !v.is_short).length;
    const goldenCount = videos.filter(v => v.tier === 'golden').length;

    return (
        <div className="h-full flex flex-col bg-background overflow-hidden p-5 gap-4">

            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
                        <Globe className="w-6 h-6 text-primary" />
                        잠재성 폭발(Outlier) 추적 레이더
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">총 <strong className="text-foreground">{videos.length}</strong>개 수집</span>
                        <span className="text-xs text-purple-400">🩳 숏폼 {shortsCount}개</span>
                        <span className="text-xs text-blue-400">🎬 롱폼 {longCount}개</span>
                        <span className="text-xs text-yellow-400">🏆 황금 {goldenCount}개</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                        className="p-2 rounded-lg border border-border hover:bg-muted transition-colors" title={viewMode === 'grid' ? '리스트 뷰' : '그리드 뷰'}>
                        {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Live Scanner Widget - always visible */}
            <LiveScannerWidget state={scannerState} isScanning={isScanning} onForceScan={handleForceScan} onRefreshTrends={handleRefreshTrends} onTogglePause={handleTogglePause} />

            {/* Filter Bar */}
            <div className="bg-card border border-border rounded-xl p-3 flex flex-col gap-3 shrink-0 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder="제목, 채널명 검색..."
                            className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <Tabs value={contentFormat} onValueChange={v => setContentFormat(v as any)}>
                        <TabsList className="h-9">
                            <TabsTrigger value="all" className="text-xs px-3">전체</TabsTrigger>
                            <TabsTrigger value="shorts" className="text-xs px-3">🩳 숏폼</TabsTrigger>
                            <TabsTrigger value="long" className="text-xs px-3">🎬 롱폼</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                        className="h-9 bg-muted/50 border border-border rounded-lg px-3 text-xs font-bold focus:outline-none cursor-pointer">
                        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${showFilters ? 'bg-primary/10 border-primary text-primary' : 'border-border hover:bg-muted'}`}>
                        <Filter className="w-3.5 h-3.5" /> 상세 필터 <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                    <div className="ml-auto flex items-center gap-2">
                        <button onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds(new Set()); }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${isSelectMode ? 'bg-primary/10 border-primary text-primary' : 'border-border hover:bg-muted'}`}>
                            <CheckSquare className="w-3.5 h-3.5" /> 선택
                        </button>
                        <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-lg font-bold">
                            {filteredVideos.length}개 표시
                        </span>
                    </div>
                </div>

                {showFilters && (
                    <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-muted-foreground font-bold shrink-0">조회수:</span>
                            {VIEW_FILTERS.map(f => (
                                <button key={f.value} onClick={() => setViewFilter(f.value)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all border ${viewFilter === f.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-muted-foreground font-bold shrink-0">채널규모:</span>
                            {SUB_FILTERS.map(f => (
                                <button key={f.value} onClick={() => setSubFilter(f.value)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all border ${subFilter === f.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    {/* Row 1: YouTube 공식 카테고리 */}
                    <div className="overflow-x-auto pb-1">
                        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                            <TabsList className="h-auto p-1 flex-wrap justify-start gap-1 bg-transparent">
                                {topCategories.map(cat => (
                                    <TabsTrigger key={cat} value={cat}
                                        className="px-3 py-1.5 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                                        {cat === '쇼츠' ? '🩳 ' : ''}{cat}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>
                    {/* Row 2: 내 관심 카테고리 (별도 줄) */}
                    {customCategories.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-muted-foreground font-bold shrink-0">⭐ 관심</span>
                            {customCategories.map(cat => (
                                <button
                                    key={`custom-${cat.name}`}
                                    onClick={() => setSelectedCategory(cat.name)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                        selectedCategory === cat.name
                                            ? 'bg-green-600 text-white border-green-600'
                                            : 'border-green-600/40 text-green-600 bg-green-500/5 hover:bg-green-600/10'
                                    }`}>
                                    {cat.is_shorts ? '🩳 ' : '🎬 '}{cat.name}
                                </button>
                            ))}
                            <button onClick={() => setShowCategoryModal(true)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-muted/50 border border-border rounded-lg text-[10px] font-bold hover:bg-primary/10 hover:text-primary transition-all">
                                <Plus className="w-3 h-3" /> 관리
                            </button>
                        </div>
                    )}
                    {customCategories.length === 0 && (
                        <button onClick={() => setShowCategoryModal(true)}
                            className="self-start flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 border border-border rounded-lg text-xs font-bold hover:bg-primary/10 hover:text-primary transition-all">
                            <Plus className="w-3.5 h-3.5" /> 관심 카테고리 관리
                        </button>
                    )}
                    {/* Row 3: 내 소분류/니치 카테고리 (CategoryTree) */}
                    {nicheCategories.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap border-t border-slate-100 pt-2 mt-1">
                            <span className="text-[10px] text-muted-foreground font-bold shrink-0">📁 니치</span>
                            {nicheCategories.map(cat => (
                                <button
                                    key={`niche-${cat.id}`}
                                    onClick={() => setSelectedCategory(cat.name)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                        selectedCategory === cat.name
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'border-blue-600/40 text-blue-600 bg-blue-500/5 hover:bg-blue-600/10'
                                    }`}>
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bulk Action Bar */}
            {isSelectMode && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 flex items-center gap-3 shrink-0 animate-in slide-in-from-top-1">
                    <button onClick={() => {
                        if (selectedIds.size === filteredVideos.length) setSelectedIds(new Set());
                        else setSelectedIds(new Set(filteredVideos.map(v => v.id)));
                    }} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                        {selectedIds.size === filteredVideos.length
                            ? <><CheckSquare className="w-4 h-4" /> 전체 해제</>
                            : <><Square className="w-4 h-4" /> 전체 선택</>}
                    </button>
                    <span className="text-xs text-muted-foreground">{selectedIds.size}개 선택됨</span>
                    <div className="ml-auto flex items-center gap-2">
                        <button onClick={() => { setMappingTargets(filteredVideos.filter(v => selectedIds.has(v.id))); setMappingModalOpen(true); }} disabled={selectedIds.size === 0}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50 transition-all">
                            <Shield className="w-3.5 h-3.5" /> 매핑
                        </button>
                        <button onClick={handleBulkCopyUrl} disabled={selectedIds.size === 0}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border rounded-lg text-xs font-bold hover:bg-primary/10 hover:text-primary transition-all">
                            <Copy className="w-3.5 h-3.5" /> URL 복사
                        </button>
                        <button onClick={handleBulkDelete} disabled={selectedIds.size === 0 || isDeleting}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg text-xs font-bold hover:bg-destructive/90 disabled:opacity-50 transition-all">
                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            일괄 삭제
                        </button>
                        <button onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }}
                            className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Video Grid */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-muted-foreground font-medium">아웃라이어 시그널을 불러오는 중...</p>
                    </div>
                ) : filteredVideos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full border border-dashed border-border rounded-xl space-y-4">
                        <AlertCircle className="w-12 h-12 text-muted-foreground opacity-40" />
                        <p className="text-lg font-bold text-foreground">발견된 아웃라이어가 없습니다</p>
                        <p className="text-sm text-muted-foreground">라이브 스캐너의 '즉시 실행' 버튼으로 수집을 시작하세요.</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-10">
                        {filteredVideos.map(video => (
                            <VideoCard key={video.id} video={video} isSelectMode={isSelectMode} isSelected={selectedIds.has(video.id)} onToggleSelect={() => toggleSelect(video.id)} onMapCategory={(v) => { setMappingTargets([v]); setMappingModalOpen(true); }} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 pb-10">
                        {filteredVideos.map(video => (
                            <VideoRow key={video.id} video={video} isSelectMode={isSelectMode} isSelected={selectedIds.has(video.id)} onToggleSelect={() => toggleSelect(video.id)} onMapCategory={(v) => { setMappingTargets([v]); setMappingModalOpen(true); }} />
                        ))}
                    </div>
                )}
            </div>

            {/* Category Management Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border flex flex-col max-h-[80vh] overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                            <div>
                                <h2 className="text-lg font-black text-foreground">관심 카테고리 관리</h2>
                                <p className="text-xs text-muted-foreground mt-1">수집 시 우선적으로 탐색할 관심 카테고리를 등록하세요.</p>
                            </div>
                            <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto">
                            <div className="space-y-4">
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-xs font-bold text-muted-foreground">카테고리명</label>
                                        <input
                                            type="text"
                                            value={newCatName}
                                            onChange={e => setNewCatName(e.target.value)}
                                            placeholder="예: 부동산, 캠핑, AI"
                                            className="w-full bg-background border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (!newCatName.trim()) return;
                                            setCustomCategories([...customCategories, {
                                                name: newCatName.trim(),
                                                is_shorts: newCatIsShorts,
                                                priority_weight: 10,
                                                created_at: new Date().toISOString()
                                            }]);
                                            setNewCatName('');
                                        }}
                                        className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 h-[38px]"
                                    >
                                        <Plus className="w-4 h-4" /> 추가
                                    </button>
                                </div>
                                
                                <div className="space-y-2 mt-6">
                                    <h3 className="text-sm font-bold text-foreground">등록된 관심 카테고리 ({customCategories.length})</h3>
                                    {customCategories.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                                            <p className="text-sm">등록된 카테고리가 없습니다.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {customCategories.map((cat, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-background border p-3 rounded-xl hover:border-primary/30 transition-all group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-bold">{cat.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setCustomCategories(customCategories.filter((_, i) => i !== idx))}
                                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Category Mapping Modal */}
            {mappingModalOpen && (
                 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                     <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border flex flex-col max-h-[80vh] overflow-hidden">
                         <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                             <div>
                                 <h2 className="text-lg font-black text-foreground">소카테고리에 채널 매핑</h2>
                                 <p className="text-xs text-muted-foreground mt-1">선택한 채널들을 카테고리 매니저에 등록합니다.</p>
                             </div>
                             <button onClick={() => setMappingModalOpen(false)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                                 <X className="w-5 h-5 text-muted-foreground" />
                             </button>
                         </div>
                         <div className="p-4 flex-1 overflow-y-auto space-y-4">
                             <div className="space-y-1.5">
                                 <label className="text-xs font-bold text-muted-foreground">매핑 대상 ({mappingTargets.length}개)</label>
                                 <div className="max-h-32 overflow-y-auto border rounded-xl p-2 bg-muted/30 text-xs text-muted-foreground space-y-1">
                                     {mappingTargets.map(v => (
                                         <div key={v.id} className="truncate">• {v.channelName}</div>
                                     ))}
                                 </div>
                             </div>
                             <div className="space-y-1.5">
                                 <label className="text-xs font-bold text-muted-foreground">목표 소카테고리 (Level 2)</label>
                                 <select 
                                     className="w-full bg-background border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                     value={selectedMapCategoryId || ''}
                                     onChange={e => setSelectedMapCategoryId(Number(e.target.value))}
                                 >
                                     <option value="">-- 카테고리 선택 --</option>
                                     {nicheCategories.map(cat => (
                                         <option key={cat.id} value={cat.id}>{cat.name}</option>
                                     ))}
                                 </select>
                             </div>
                         </div>
                         <div className="p-4 border-t bg-muted/30 flex justify-end gap-2">
                             <button onClick={() => setMappingModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors">취소</button>
                             <button 
                                 disabled={!selectedMapCategoryId || isMapping}
                                 onClick={async () => {
                                     try {
                                         setIsMapping(true);
                                         await api.post('/categories/channels/map', {
                                             category_id: selectedMapCategoryId,
                                             channels: mappingTargets.map(v => ({
                                                 youtube_channel_id: null,
                                                 channel_name: v.channelName,
                                                 channel_url: v.channelUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(v.channelName)}`,
                                                 subscriber_count: v.subscribers || v.subscriber_count || 0
                                             }))
                                         });
                                         toast.success('카테고리 매핑이 완료되었습니다.');
                                         setMappingModalOpen(false);
                                     } catch (err) {
                                         toast.error('매핑 중 오류가 발생했습니다.');
                                     } finally {
                                         setIsMapping(false);
                                     }
                                 }}
                                 className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                             >
                                 {isMapping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                 매핑하기
                             </button>
                         </div>
                     </div>
                 </div>
             )}
        </div>
    );
}

export default KeywordExplorer;
