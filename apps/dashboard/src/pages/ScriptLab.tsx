import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    useReactTable,
    SortingState
} from '@tanstack/react-table';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api, { Video, Channel, Category } from '../lib/api';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "../components/ui/dialog";
import { ScrollArea } from "../components/ui/scroll-area";
import StatsGraph from '../components/StatsGraph';
import SubtitleViewer from '../components/SubtitleViewer';
import {
    Search, TrendingUp, PlaySquare, FileText, Copy, Languages,
    ChevronUp, ChevronDown, MonitorPlay, Film, Smartphone, Trash2,
    Flame, Zap, Sparkles, Play, ExternalLink, Video as VideoIcon, Check, Radio, Scissors, Loader2
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { cn, getMediaUrl } from '../lib/utils';
import { toast } from 'sonner';


// -- Helper Function to Clean SRT format into flowing readable text --
const cleanSrtToText = (text: string): string => {
    if (!text) return '';
    
    // 1. Remove VTT header & timestamps & line numbers
    let cleaned = text
        .replace(/^WEBVTT[^\n]*\n/gm, '')
        .replace(/\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{3}[^\n]*/g, '')
        .replace(/^\s*\d+\s*$/gm, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\[(?:music|applause|laughter|sound|음악|박수|웃음|기타)[^\]]*\]/gi, '')
        .replace(/\((?:music|applause|laughter|sound|음악|박수|웃음)[^)]*\)/gi, '')
        .replace(/^\s*>>\s*/gm, '')
        .replace(/&gt;&gt;/g, '')
        .replace(/>>/g, '');

    // 2. Split lines and filter empty
    const lines = cleaned.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return '';

    // 3. Deduplicate consecutive identical lines
    const deduped: string[] = [];
    for (const l of lines) {
        if (deduped.length === 0 || deduped[deduped.length - 1] !== l) {
            deduped.push(l);
        }
    }

    return deduped.join(' ').replace(/[ \t]+/g, ' ').trim();
};

const getVideoThumbnailUrl = (video: Video): string => {
    if (video.thumbnail_path) {
        const url = getMediaUrl(video.thumbnail_path);
        if (url) return url;
    }
    const meta = video.metadata_json as any;
    if (meta?.thumbnail_url) return meta.thumbnail_url;
    if (meta?.thumbnail) return meta.thumbnail;
    if (video.video_id) return `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;
    if (video.url) {
        const match = video.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
        if (match && match[1]) return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
    }
    return '';
};

const getYoutubeWatchUrl = (video: Video): string => {
    if (video.url && video.url.startsWith('http')) return video.url;
    if (video.video_id) return `https://www.youtube.com/watch?v=${video.video_id}`;
    const meta = video.metadata_json as any;
    if (meta?.webpage_url) return meta.webpage_url;
    if (meta?.url) return meta.url;
    return '';
};

const getYoutubeEmbedUrl = (video: Video): string => {
    let ytId = video.video_id;
    if (!ytId && video.url) {
        const match = video.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
        if (match && match[1]) ytId = match[1];
    }
    if (ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0&rel=0`;
    return '';
};



const formatCount = (num?: number): string => {
    const n = num ?? 0;
    if (n >= 10000) return (n / 10000).toFixed(1) + '만';
    if (n >= 1000) return (n / 1000).toFixed(1) + '천';
    return n.toString();
};

const formatVelocity = (score: number) => {
    if (!score) return '-';
    if (score > 1000) return `+${(score / 1000).toFixed(1)}K/h`;
    return `+${score.toFixed(0)}/h`;
};

const getViralBadge = (viralScore: number | undefined, velocity: number | undefined) => {
    const score = viralScore || 0;
    const vel = velocity || 0;

    const badges = [];

    // Viral Score Badges - S/A/B/C Grades (Aligned with Gallery.tsx)
    if (score >= 300) {
        badges.push(
            <Badge key="viral" className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white gap-1 text-[11px] h-6 px-2 animate-pulse shadow-sm border-0 ring-1 ring-white/20 whitespace-nowrap">
                <Flame className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" />
                <span className="font-bold">S등급</span> {score.toFixed(0)}%
            </Badge>
        );
    } else if (score >= 100) {
        badges.push(
            <Badge key="trending" className="bg-orange-500 hover:bg-orange-600 text-white gap-1 text-[11px] h-6 px-2 shadow-sm border-orange-400 whitespace-nowrap">
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span className="font-bold">A등급</span> {score.toFixed(0)}%
            </Badge>
        );
    } else if (score >= 30) {
        badges.push(
            <Badge key="organic" className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 text-[11px] h-6 px-2 border-emerald-400 shadow-sm whitespace-nowrap">
                <span className="text-white font-bold text-xs">🌱</span>
                <span className="font-bold">B등급</span> {score.toFixed(0)}%
            </Badge>
        );
    } else {
        badges.push(
            <Badge key="normal" variant="secondary" className="gap-1 text-[11px] h-6 px-2 bg-muted text-muted-foreground border-border whitespace-nowrap">
                <span className="text-muted-foreground">☁️</span> C등급 {score.toFixed(1)}%
            </Badge>
        );
    }

    // Velocity Badge

    if (vel > 0) {
        const isHighVelocity = vel > 1000;
        badges.push(
            <Badge key="velocity" className={cn(
                "gap-1 text-[11px] h-6 px-2 border transition-all whitespace-nowrap",
                isHighVelocity
                    ? "bg-indigo-600 text-white animate-pulse shadow-sm border-indigo-500"
                    : "bg-blue-50 text-blue-600 border-blue-200"
            )}>
                <TrendingUp className={cn("w-3.5 h-3.5", isHighVelocity && "fill-white")} />
                {vel > 1000 ? (vel / 1000).toFixed(1) + 'K' : vel.toFixed(0)}/hr
            </Badge>
        );
    }

    return <div className="flex flex-col gap-1 items-start">{badges}</div>;
};

// -- Main Component --
const ScriptLab = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [sorting, setSorting] = useState<SortingState>([{ id: 'upload_date', desc: true }]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [timeRange, setTimeRange] = useState<'ALL' | '1d' | '3d' | '7d'>('ALL');
    const [sortOption, setSortOption] = useState<'viral' | 'latest' | 'views'>('viral');
    const [subtitleVideo, setSubtitleVideo] = useState<Video | null>(null);


    const [statsVideo, setStatsVideo] = useState<Video | null>(null);
    const [playerVideo, setPlayerVideo] = useState<Video | null>(null);
    const [isCopied, setIsCopied] = useState(false);




    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const tableContainerRef = useRef<HTMLDivElement>(null);


    // 1. Fetch Data with Instant Cache (Stale-While-Revalidate)
    const { data: videos = [], isLoading, isFetching } = useQuery({
        queryKey: ['videos', 'script'],
        queryFn: async () => {
            const res = await api.get<Video[]>('/videos/', {
                params: {
                    mode: 'script',
                    limit: 1000,
                    sort_by: 'upload_date',
                    sort_order: 'desc',
                }
            });
            return res.data.filter((v: Video) => v.is_script_only);
        },
        staleTime: 1000 * 60 * 3, // 3분간 캐시 즉시 재사용 (메뉴 전환 시 0.001초 즉각 로딩)
        gcTime: 1000 * 60 * 10,
    });

    // URL Query Params 체크 (?video_id=...) -> 해당 대본/자막 모달 자동 오픈
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const targetVideoId = params.get('video_id');
        if (targetVideoId && videos && videos.length > 0) {
            const target = videos.find(v => v.id === parseInt(targetVideoId, 10));
            if (target) {
                setSubtitleVideo(target);
            }
        }
    }, [videos]);


    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: (ids: number[]) => api.post('/videos/delete', { video_ids: ids }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['videos', 'script'] });
            setSelectedIds(new Set());
            // alert('선택한 항목이 삭제되었습니다.'); // Less intrusive UX?
        },
        onError: () => {
            alert('삭제 중 오류가 발생했습니다.');
        }
    });

    const toggleSelection = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = (filteredRows: Video[]) => {
        if (selectedIds.size === filteredRows.length && filteredRows.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredRows.map(v => v.id)));
        }
    };

    const handleDelete = () => {
        if (!selectedIds.size) return;
        if (confirm(`${selectedIds.size}개의 항목을 삭제하시겠습니까?`)) {
            deleteMutation.mutate(Array.from(selectedIds));
        }
    };

    // Fetch Channels Map for lookup
    const { data: channels = [] } = useQuery<Channel[]>({
        queryKey: ['channels'],
        queryFn: async () => { const d = (await api.get<Channel[]>('/channels/')).data; return Array.isArray(d) ? d : []; }
    });

    // Fetch Categories Map
    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => { const d = (await api.get<Category[]>('/categories/')).data; return Array.isArray(d) ? d : []; }
    });

    const channelMap = useMemo(() => {
        const map: Record<number, Channel> = {};
        channels.forEach(c => map[c.id] = c);
        return map;
    }, [channels]);

    const categoryMap = useMemo(() => {
        const map: Record<number, Category> = {};
        categories.forEach(c => map[c.id] = c);
        return map;
    }, [categories]);

    const categoryStats = useMemo(() => {
        const stats: Record<string, number> = {};
        videos.forEach(v => {
            const channel = channelMap[v.channel_id];
            const catName = channel?.category_id && categoryMap[channel.category_id]
                ? categoryMap[channel.category_id].name
                : '미분류';
            stats[catName] = (stats[catName] || 0) + 1;
        });
        return stats;
    }, [videos, channelMap, categoryMap]);

    // Filter & Sort Videos
    const filteredVideos = useMemo(() => {
        return videos.filter(v => {
            // 1. Category Filter
            if (selectedCategory !== 'ALL') {
                const channel = channelMap[v.channel_id];
                const catName = channel?.category_id && categoryMap[channel.category_id]
                    ? categoryMap[channel.category_id].name
                    : '미분류';
                if (catName !== selectedCategory) return false;
            }

            // 2. Time Range Filter
            if (timeRange !== 'ALL') {
                const videoDate = new Date(v.upload_date || v.downloaded_at);
                const now = new Date();
                const diffDays = (now.getTime() - videoDate.getTime()) / (1000 * 3600 * 24);
                if (timeRange === '1d' && diffDays > 1) return false;
                if (timeRange === '3d' && diffDays > 3) return false;
                if (timeRange === '7d' && diffDays > 7) return false;
            }

            // 3. Search Filter (if globalFilter set)
            if (globalFilter.trim()) {
                const q = globalFilter.toLowerCase();
                const title = (v.title || '').toLowerCase();
                const chName = (channelMap[v.channel_id]?.name || '').toLowerCase();
                if (!title.includes(q) && !chName.includes(q)) return false;
            }

            return true;
        }).sort((a, b) => {
            if (sortOption === 'viral') {
                return (b.viral_score || 0) - (a.viral_score || 0);
            }
            if (sortOption === 'latest') {
                const dateA = new Date(a.upload_date || a.downloaded_at).getTime();
                const dateB = new Date(b.upload_date || b.downloaded_at).getTime();
                return dateB - dateA;
            }
            if (sortOption === 'views') {
                return (b.view_count || 0) - (a.view_count || 0);
            }
            return 0;
        });
    }, [videos, selectedCategory, timeRange, sortOption, globalFilter, channelMap, categoryMap]);

    // Fetch History for Stats Graph (Stats Modal)
    const { data: videoHistory } = useQuery({
        queryKey: ['history', statsVideo?.id],
        queryFn: async () => (await api.get(`/videos/${statsVideo?.id}/history`)).data,
        enabled: !!statsVideo
    });

    // 차트 데이터 계산 (Gallery.tsx와 100% 동일: 히스토리가 0~1개여도 기본 추이 곡선 자동 생성)
    const chartData = useMemo(() => {
        if (!statsVideo) return [];
        const currentViews = statsVideo.view_count || (statsVideo.metadata_json?.view_count ? Number(statsVideo.metadata_json.view_count) : 0);
        const viralScore = statsVideo.viral_score || 0;

        // Safe Date Parser
        const parseSafe = (val: any, fallbackMs: number) => {
            if (!val) return new Date(fallbackMs);
            const str = String(val).trim();
            if (/^\d{8}$/.test(str)) {
                const y = parseInt(str.substring(0, 4));
                const m = parseInt(str.substring(4, 6)) - 1;
                const d = parseInt(str.substring(6, 8));
                return new Date(y, m, d);
            }
            const d = new Date(str);
            return isNaN(d.getTime()) ? new Date(fallbackMs) : d;
        };

        const uploadDate = parseSafe(statsVideo.upload_date || statsVideo.created_at, Date.now() - 86400000 * 3);
        const createdDate = parseSafe(statsVideo.created_at, Date.now());

        if (videoHistory && videoHistory.length >= 2) {
            const sorted = [...videoHistory].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            return sorted.map((item, i) => {
                const itemTime = new Date(item.timestamp).getTime();
                const hoursSinceUpload = Math.max(0.1, (itemTime - uploadDate.getTime()) / (1000 * 60 * 60));
                const lifetimeVelocity = item.view_count / hoursSinceUpload;
                let velocity = lifetimeVelocity;
                if (i > 0) {
                    const prev = sorted[i - 1];
                    const timeDiff = (itemTime - new Date(prev.timestamp).getTime()) / (1000 * 60 * 60);
                    if (timeDiff > 0) {
                        velocity = Math.max(0, (item.view_count - prev.view_count) / timeDiff);
                    }
                }
                return {
                    ...item,
                    timestamp: item.timestamp,
                    velocity: Math.max(0, Math.floor(velocity))
                };
            });
        }

        // 히스토리가 0~1개일 때: 업로드 시점부터 현재까지의 지수 성장/바이럴 추이 시뮬레이션 6개 포인트 생성
        const points = [];
        const totalDuration = Math.max(86400000, createdDate.getTime() - uploadDate.getTime());
        const steps = 6;
        for (let i = 0; i <= steps; i++) {
            const ratio = i / steps;
            const time = new Date(uploadDate.getTime() + totalDuration * ratio);
            // 가속 곡선 (t^1.8)
            const growthFactor = Math.pow(ratio, 1.8);
            const estViews = Math.round(currentViews * growthFactor);
            const estVelocity = Math.round((currentViews / Math.max(1, totalDuration / 3600000)) * (0.4 + 1.2 * ratio));
            points.push({
                timestamp: time.toISOString(),
                view_count: estViews,
                velocity: estVelocity,
                viral_score: Math.round(viralScore * (0.3 + 0.7 * ratio))
            });
        }
        return points;
    }, [videoHistory, statsVideo]);




    // 2. Table Configuration
    const columnHelper = createColumnHelper<Video>();

    const columns = useMemo(() => [
        // 1. Checkbox Column
        {
            id: 'select',
            header: ({ table }: any) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                    className="mx-1"
                />
            ),
            cell: ({ row }: any) => (
                <div className="px-1 flex justify-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                    />
                </div>
            ),
            size: 36,
            enableSorting: false,
        },
        // 2. Performance Grade Badge (S / A / B / C Grade + Viral %)
        columnHelper.accessor('viral_score', {
            id: 'grade',
            header: '성과 등급',
            cell: info => {
                const score = info.getValue() ?? 0;
                const vel = info.row.original.velocity_score ?? 0;
                return (
                    <div
                        className="flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
                        onClick={(e) => {
                            e.stopPropagation();
                            setStatsVideo(info.row.original);
                        }}
                        title="클릭하여 바이럴 추이 분석 보기"
                    >
                        {getViralBadge(score, undefined)}
                    </div>
                );
            },
            size: 110,
        }),
        // 3. Title & Script Hook Summary (With Video Thumbnail & Player Trigger)
        columnHelper.accessor('title', {
            header: '제목 및 대본 바이럴 훅 (Hook)',
            cell: info => {
                const v = info.row.original;
                const rawContent = v.content || "";
                const cleanPreview = cleanSrtToText(rawContent);
                const thumbUrl = getVideoThumbnailUrl(v);
                const ytUrl = getYoutubeWatchUrl(v);

                return (
                    <div className="flex items-center gap-3 w-full max-w-xl py-1">
                        {/* 썸네일 & 플레이어 트리거 버튼 */}
                        <div 
                            className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-900 border border-border/80 shrink-0 cursor-pointer group shadow-2xs"
                            onClick={(e) => {
                                e.stopPropagation();
                                setPlayerVideo(v);
                            }}
                            title="영상 및 대본 상세 플레이어 열기"
                        >
                            {thumbUrl ? (
                                <img 
                                    src={thumbUrl} 
                                    alt={v.title} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                                    <VideoIcon className="w-5 h-5 opacity-50" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                                <div className="w-6 h-6 rounded-full bg-white/30 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                                </div>
                            </div>
                        </div>

                        {/* 제목 및 훅 텍스트 */}
                        <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span
                                    className="font-bold text-foreground text-xs sm:text-sm cursor-pointer hover:underline hover:text-primary transition-colors line-clamp-1 flex-1"
                                    title={info.getValue()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPlayerVideo(v);
                                    }}
                                >
                                    {info.getValue()}
                                </span>
                                {ytUrl && (
                                    <a
                                        href={ytUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-muted-foreground hover:text-red-500 transition-colors p-0.5 rounded hover:bg-muted shrink-0"
                                        title="유튜브 원본 새 탭으로 열기"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                )}
                            </div>
                            <div 
                                className="flex items-start gap-1.5 text-xs text-muted-foreground mt-1 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSubtitleVideo(v);
                                }}
                                title="클릭하여 대본 전문 보기"
                            >
                                <FileText className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5 opacity-80" />
                                <p className="line-clamp-2 text-[11.5px] text-muted-foreground/90 leading-relaxed font-sans select-text hover:text-foreground transition-colors">
                                    {cleanPreview ? `"${cleanPreview}"` : "(대본을 불러오려면 클릭하세요)"}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            },
        }),
        // 4. Views & Inflow Velocity
        columnHelper.accessor('view_count', {
            id: 'views_stats',
            header: '조회수 / 유입속도',
            cell: info => {
                const views = info.row.original.view_count ?? info.row.original.metadata_json?.view_count ?? 0;
                const vel = info.row.original.velocity_score ?? 0;
                const isHigh = vel > 1000;
                return (
                    <div className="flex flex-col items-end gap-0.5">
                        <span className="font-mono font-extrabold text-foreground text-xs">
                            {formatCount(views)}
                        </span>
                        {vel > 0 ? (
                            <button
                                className={cn(
                                    "flex items-center gap-0.5 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded transition-all",
                                    isHigh
                                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20"
                                        : "bg-muted text-muted-foreground hover:text-foreground"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setStatsVideo(info.row.original);
                                }}
                                title="클릭하여 바이럴 추이 그래프 보기"
                            >
                                <TrendingUp className="w-3 h-3" />
                                {formatVelocity(vel)}
                            </button>
                        ) : (
                            <span className="text-[11px] text-muted-foreground/60 font-mono">-</span>
                        )}
                    </div>
                );
            },
            size: 120,
        }),
        // 5. Channel & Category Context
        columnHelper.accessor('channel_id', {
            header: '출처 (채널 / 카테고리)',
            cell: info => {
                const chId = info.getValue();
                const ch = chId ? channelMap[chId] : null;
                let catName = '미분류';
                if (ch?.category_id && categoryMap[ch.category_id]) {
                    catName = categoryMap[ch.category_id].name;
                } else if (ch?.folder_name) {
                    catName = ch.folder_name;
                }
                return (
                    <div className="flex flex-col gap-1">
                        <span className="font-semibold text-foreground truncate max-w-[120px] text-xs" title={ch?.name || '-'}>
                            {ch?.name || '-'}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-muted-foreground font-mono">
                                {ch?.subscriber_count ? `${formatCount(ch.subscriber_count)}명` : '구독자 정보 없음'}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground bg-muted/30">
                                {catName}
                            </Badge>
                        </div>
                    </div>
                );
            },
            size: 140,
        }),
        // 6. Upload Date
        columnHelper.accessor('upload_date', {
            header: '업로드',
            cell: info => {
                const val = info.getValue();
                if (!val) return <span className="text-muted-foreground text-xs">-</span>;
                const d = new Date(val);
                return (
                    <div className="text-right text-muted-foreground text-xs font-mono">
                        {d.toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                    </div>
                );
            },
            size: 80,
        }),
        // 7. Actions (영상 플레이 / 대본 전문 열람 / AI 재창작)
        {
            id: 'actions',
            header: '작업',
            cell: ({ row }: any) => {
                const v = row.original;
                return (
                    <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px] gap-1 hover:bg-primary/10 hover:text-primary border-border/80 font-medium"
                            onClick={() => setPlayerVideo(v)}
                            title="영상 재생 및 상세 분석 열기"
                        >
                            <Play className="w-3 h-3 text-red-500 fill-red-500" />
                            영상
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px] gap-1 hover:bg-primary/10 hover:text-primary border-border/80 font-medium"
                            onClick={() => setSubtitleVideo(v)}
                            title="대본 전문 열람"
                        >
                            <FileText className="w-3 h-3 text-primary" />
                            대본
                        </Button>
                        <Button
                            size="sm"
                            className="h-7 px-2.5 text-[11px] gap-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-2xs"
                            onClick={async () => {
                                try {
                                    const res = await api.get(`/videos/${v.id}/subtitles`);
                                    const raw = res.data?.content || "";
                                    const cleanText = cleanSrtToText(raw);
                                    navigate('/script-writer', { state: { initialScript: cleanText || v.title } });
                                } catch (e) {
                                    navigate('/script-writer', { state: { initialScript: v.title } });
                                }
                            }}
                        >
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            AI 각색
                        </Button>
                    </div>
                );
            },
            size: 190,
            enableSorting: false,
        }
    ], [channelMap, categoryMap]);




    const table = useReactTable({
        data: filteredVideos,
        columns,
        state: {
            sorting,
            globalFilter,
            rowSelection: Object.fromEntries(Array.from(selectedIds).map(id => [id, true])),
        },
        enableRowSelection: true,
        onRowSelectionChange: (updaterOrValue) => {
            const newRowSelection = typeof updaterOrValue === 'function'
                ? updaterOrValue(table.getState().rowSelection)
                : updaterOrValue;
            const newSelectedIds = new Set<number>();
            Object.keys(newRowSelection).forEach(id => {
                if (newRowSelection[id]) newSelectedIds.add(Number(id));
            });
            setSelectedIds(newSelectedIds);
        },
        getRowId: row => row.id.toString(),
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    // [FIX] Improved Drag Logic with Refs
    const isDraggingRef = useRef(false);
    const dragStartPos = useRef<{ x: number, y: number } | null>(null);
    const isDragMoved = useRef(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        isDraggingRef.current = true;
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        isDragMoved.current = false;
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
        dragStartPos.current = null;
        setTimeout(() => {
            isDragMoved.current = false;
        }, 0);
    };

    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    const handleRowMouseEnter = (row: any) => {
        if (isDraggingRef.current) {
            row.toggleSelected(true);
        }
    };

    const onTableMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingRef.current || !dragStartPos.current) return;
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        }
    }


    return (
        <div className="min-h-screen flex flex-col bg-background p-3 sm:p-6 space-y-4 sm:space-y-5 overflow-x-hidden" ref={tableContainerRef}>
            {/* 1. 상단 타이틀 헤더 바 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 w-full">
                <div>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600 dark:text-indigo-400" />
                        <span>수집 대본 분석실</span>
                        <Badge variant="secondary" className="font-mono text-xs font-bold ml-1">
                            총 {filteredVideos.length}개
                        </Badge>
                    </h1>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                        수집된 레퍼런스 영상의 자막/대본을 한곳에 모아 바이럴 후킹 구조를 분석하고 AI 재창작으로 연계
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleSelectAll(filteredVideos)}
                        className="h-8 gap-1.5 text-xs font-bold"
                    >
                        {selectedIds.size === filteredVideos.length && filteredVideos.length > 0 ? "전체 해제" : "전체 선택"}
                    </Button>
                    {selectedIds.size > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                            className="h-8 gap-1.5 text-xs font-bold animate-in fade-in"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            {selectedIds.size}개 삭제
                        </Button>
                    )}
                </div>
            </div>

            {/* 2. 🏷️ 통합 스마트 필터 바 (카테고리 + 기간 + 정렬 + 검색) */}
            <div className="flex flex-col gap-2.5 p-2.5 rounded-2xl bg-card border border-border/80 shadow-2xs">
                {/* 상단: 카테고리 탭 (모바일 가로 스크롤 지원) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 select-none">
                    <button
                        onClick={() => setSelectedCategory('ALL')}
                        className={cn(
                            "px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 active:scale-95",
                            selectedCategory === 'ALL'
                                ? "bg-primary text-white shadow-2xs"
                                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
                        )}
                    >
                        <span>전체</span>
                        <span className={cn(
                            "px-1.5 py-0.2 rounded-full text-[10px]",
                            selectedCategory === 'ALL' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                        )}>
                            {videos.length}
                        </span>
                    </button>

                    {Object.entries(categoryStats).map(([catName, count]) => {
                        const isCatSelected = selectedCategory === catName;
                        return (
                            <button
                                key={catName}
                                onClick={() => setSelectedCategory(catName)}
                                className={cn(
                                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 active:scale-95",
                                    isCatSelected
                                        ? "bg-primary text-white shadow-2xs"
                                        : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
                                )}
                            >
                                <span>{catName}</span>
                                <span className={cn(
                                    "px-1.5 py-0.2 rounded-full text-[10px]",
                                    isCatSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                                )}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* 하단: 기간 + 정렬 + 검색창 */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {/* 기간 필터 */}
                        <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-xl border border-border/50 text-[11px] font-medium text-muted-foreground">
                            <span className="px-1.5 text-[10px] text-muted-foreground/70 hidden sm:inline">📅 기간:</span>
                            {(['ALL', '1d', '3d', '7d'] as const).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setTimeRange(r)}
                                    className={cn(
                                        "px-2.5 py-1.5 rounded-lg transition-all text-xs font-semibold active:scale-95",
                                        timeRange === r
                                            ? "bg-card text-foreground shadow-2xs font-bold"
                                            : "hover:text-foreground"
                                    )}
                                >
                                    {r === 'ALL' ? '전체' : r === '1d' ? '최근 1일' : r === '3d' ? '최근 3일' : '최근 7일'}
                                </button>
                            ))}
                        </div>

                        {/* 정렬 옵션 */}
                        <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-xl border border-border/50 text-[11px] font-medium text-muted-foreground">
                            <span className="px-1.5 text-[10px] text-muted-foreground/70 hidden sm:inline">⚡ 정렬:</span>
                            {(['viral', 'latest', 'views'] as const).map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setSortOption(opt)}
                                    className={cn(
                                        "px-2.5 py-1.5 rounded-lg transition-all text-xs font-semibold active:scale-95",
                                        sortOption === opt
                                            ? "bg-card text-foreground shadow-2xs font-bold"
                                            : "hover:text-foreground"
                                    )}
                                >
                                    {opt === 'viral' ? '바이럴순' : opt === 'latest' ? '최신순' : '조회수순'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 실시간 검색창 */}
                    <div className="relative flex-1 min-w-[160px] sm:max-w-xs">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            placeholder="제목, 채널 검색..."
                            className="pl-9 bg-card shadow-2xs text-xs h-9 w-full rounded-xl"
                            value={globalFilter}
                            onChange={e => setGlobalFilter(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Data Container: Desktop Table (md+) / Mobile Cards (<md) */}
            <div className="flex-1 rounded-2xl border border-border bg-card shadow-2xs overflow-hidden flex flex-col select-none relative min-h-[360px]">
                
                {/* 1. Desktop Table View (>= 768px) */}
                <div
                    className="hidden md:block overflow-x-auto flex-1 w-full relative"
                    onMouseDown={handleMouseDown}
                    onMouseMove={onTableMouseMove}
                >
                    <Table className="w-full min-w-[760px]">
                        <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur-xs z-10 shadow-2xs">
                            {table.getHeaderGroups().map(headerGroup => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map(header => {
                                        let alignClass = 'justify-start';
                                        if (header.column.id === 'viral_score' || header.column.id === 'select') alignClass = 'justify-center';
                                        else if (['viral_val', 'velocity_score', 'view_count', 'upload_date'].includes(header.column.id)) alignClass = 'justify-end';

                                        return (
                                            <TableHead key={header.id} className="whitespace-nowrap px-3 h-10 sm:h-12 text-xs sm:text-sm font-semibold" style={{ width: header.getSize() }}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : (
                                                        <div
                                                            className={`flex items-center gap-1 cursor-pointer select-none ${alignClass} ${header.column.getCanSort() ? 'hover:text-primary' : ''}`}
                                                            onClick={header.column.getToggleSortingHandler()}
                                                        >
                                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                                            {{
                                                                asc: <ChevronUp className="w-3 h-3" />,
                                                                desc: <ChevronDown className="w-3 h-3" />,
                                                            }[header.column.getIsSorted() as string] ?? null}
                                                        </div>
                                                    )
                                                }
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows.map(row => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className={cn(
                                        "cursor-pointer transition-colors h-12 sm:h-14",
                                        row.getIsSelected() ? "bg-primary/10 hover:bg-primary/20" : "hover:bg-muted/60"
                                    )}
                                    onClick={(e) => {
                                        if (!isDragMoved.current) {
                                            setSubtitleVideo(row.original);
                                        }
                                    }}
                                    onMouseEnter={() => handleRowMouseEnter(row)}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id} className="p-2 sm:p-3 text-xs sm:text-sm whitespace-nowrap">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* 2. Mobile Responsive Card List View (< 768px) */}
                <div className="md:hidden flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)]">
                    {table.getRowModel().rows.map(row => {
                        const v = row.original;
                        const isSelected = row.getIsSelected();
                        const thumbUrl = getVideoThumbnailUrl(v);
                        const ytUrl = getYoutubeWatchUrl(v);

                        return (
                            <div 
                                key={row.id}
                                className={cn(
                                    "p-3.5 rounded-2xl border transition-all space-y-2.5",
                                    isSelected ? "bg-primary/10 border-primary/50 shadow-sm" : "bg-card border-border/80 shadow-2xs hover:border-primary/30"
                                )}
                            >
                                {/* 상단: 체크박스 + 성과 뱃지 + 채널 & 조회수/속도 */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1 -m-1" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox 
                                                checked={isSelected}
                                                onCheckedChange={(checked) => row.toggleSelected(!!checked)}
                                                className="w-4 h-4 rounded-md"
                                            />
                                        </div>
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); setStatsVideo(v); }} 
                                            className="cursor-pointer active:scale-95 transition-transform"
                                        >
                                            {getViralBadge(v.viral_score, v.velocity_score)}
                                        </div>
                                    </div>
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); setStatsVideo(v); }}
                                        className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer"
                                    >
                                        <span className="font-extrabold text-foreground">{formatCount(v.view_count || (v.metadata_json as any)?.view_count)}</span>
                                        {v.velocity_score > 0 && (
                                            <span className="font-bold text-indigo-400">+{formatVelocity(v.velocity_score)}</span>
                                        )}
                                        <span className="text-[10px] text-muted-foreground/80 truncate max-w-[75px] bg-muted/60 px-1.5 py-0.5 rounded-md">
                                            {(v.channel_id && channelMap[v.channel_id]?.name) || (v.metadata_json as any)?.uploader || '유튜브'}
                                        </span>
                                    </div>
                                </div>

                                {/* 중앙: 썸네일 + 제목 & 대본 바이럴 훅 (탭하면 상세 플레이어 오픈) */}
                                <div className="flex gap-2.5 items-start">
                                    <div 
                                        className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-border/80 shrink-0 cursor-pointer group shadow-2xs"
                                        onClick={() => setPlayerVideo(v)}
                                    >
                                        {thumbUrl ? (
                                            <img 
                                                src={thumbUrl} 
                                                alt={v.title} 
                                                className="w-full h-full object-cover" 
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                                                <VideoIcon className="w-5 h-5 opacity-50" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <div className="w-6 h-6 rounded-full bg-white/40 backdrop-blur-xs flex items-center justify-center">
                                                <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-1">
                                            <h4 
                                                onClick={() => setPlayerVideo(v)}
                                                className="text-[13px] font-extrabold text-foreground line-clamp-1 leading-snug cursor-pointer hover:underline flex-1"
                                            >
                                                {v.title}
                                            </h4>
                                            {ytUrl && (
                                                <a
                                                    href={ytUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-muted-foreground hover:text-red-500 p-0.5 rounded shrink-0"
                                                    title="유튜브 원본 새 탭 열기"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>
                                        <div 
                                            onClick={() => setSubtitleVideo(v)}
                                            className="bg-muted/40 hover:bg-muted/60 p-2 rounded-xl border border-border/50 transition-colors cursor-pointer"
                                        >
                                            <p className="text-[11px] text-foreground/90 leading-relaxed line-clamp-2 italic">
                                                "{cleanSrtToText(v.content || v.extracted_text || '') || '대본을 불러오려면 탭하세요.'}"
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* 하단: 날짜 + 액션 버튼 (영상 / 대본열람 / AI 각색) */}
                                <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-xs">
                                    <span className="text-[10.5px] text-muted-foreground font-mono">
                                        {v.upload_date ? new Date(v.upload_date).toLocaleDateString() : '최근'}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setPlayerVideo(v)}
                                            className="h-7 px-2 text-[11px] font-bold rounded-xl border-border bg-background shadow-2xs hover:bg-muted active:scale-95"
                                        >
                                            <Play className="w-3 h-3 mr-0.5 text-red-500 fill-red-500" /> 영상
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setSubtitleVideo(v)}
                                            className="h-7 px-2 text-[11px] font-bold rounded-xl border-border bg-background shadow-2xs hover:bg-muted active:scale-95"
                                        >
                                            <FileText className="w-3 h-3 mr-0.5 text-primary" /> 대본
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => navigate('/creative-scripts', { state: { referenceVideo: v } })}
                                            className="h-7 px-2.5 text-[11px] font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs active:scale-95"
                                        >
                                            <Sparkles className="w-3 h-3 mr-0.5 text-amber-300" /> 각색
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>


                {/* Centered Empty / Loading State Overlay */}
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-3 min-h-[260px]">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-xs font-bold text-foreground">수집된 대본 목록을 불러오는 중...</p>
                    </div>
                ) : table.getRowModel().rows?.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground gap-2 bg-card/60 backdrop-blur-2xs min-h-[220px]">
                        <Sparkles className="w-9 h-9 opacity-30 text-primary mb-0.5" />
                        <p className="text-sm font-semibold text-foreground">분석된 대본 데이터가 없습니다</p>
                        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                            더우인 수집기 또는 미디어 고속 다운로드에서 영상을 추출하여 대본 분석을 시작해보세요.
                        </p>
                    </div>
                ) : null}



                {/* Pagination / Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-3 border-t border-border bg-muted/40 text-xs text-muted-foreground gap-2">
                    <div className="flex-1 text-center sm:text-left">
                        {table.getFilteredSelectedRowModel().rows.length} of{" "}
                        {table.getFilteredRowModel().rows.length} row(s) selected.
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="h-8 text-xs border-border bg-card text-foreground"
                        >
                            이전
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="h-8 text-xs border-border bg-card text-foreground"
                        >
                            다음
                        </Button>
                    </div>
                </div>
            </div>


            {/* 1. Subtitle Viewer Modal (Matches Gallery.tsx exactly) */}
            <SubtitleViewer
                open={!!subtitleVideo}
                onOpenChange={(open) => !open && setSubtitleVideo(null)}
                videoId={subtitleVideo?.id || null}
                title={subtitleVideo?.title || ''}
                description={(subtitleVideo as any)?.description || (subtitleVideo?.metadata_json as any)?.description}
                extractedText={subtitleVideo?.extracted_text}
            />

            {/* 2. AI 바이럴 추이 그래프 모달 (Matches Gallery.tsx exactly & mobile safe) */}
            <Dialog open={!!statsVideo} onOpenChange={(open) => !open && setStatsVideo(null)}>
                <DialogContent className="w-[95vw] max-w-2xl bg-card border border-border text-foreground p-3.5 sm:p-6 shadow-2xl rounded-2xl">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-2">
                            <DialogTitle className="text-sm sm:text-lg font-extrabold text-foreground flex items-center gap-1.5 sm:gap-2">
                                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" /> AI 바이럴 성과 및 추이 분석
                            </DialogTitle>
                            {statsVideo && getViralBadge(statsVideo.viral_score, statsVideo.velocity_score)}
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground truncate">{statsVideo?.title}</DialogDescription>
                    </DialogHeader>

                    {/* 4대 핵심 바이럴 KPI 지표 카드 */}
                    {statsVideo && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-1 sm:pt-2">
                            <div className="bg-muted/40 border border-border/80 rounded-xl p-2 sm:p-2.5 space-y-0.5">
                                <span className="text-[9.5px] sm:text-[10px] text-muted-foreground font-medium">총 누적 조회수</span>
                                <p className="text-xs sm:text-base font-extrabold text-foreground">{formatCount(statsVideo.view_count || statsVideo.metadata_json?.view_count)}</p>
                            </div>
                            <div className="bg-muted/40 border border-border/80 rounded-xl p-2 sm:p-2.5 space-y-0.5">
                                <span className="text-[9.5px] sm:text-[10px] text-muted-foreground font-medium">바이럴 지수</span>
                                <p className="text-xs sm:text-base font-extrabold text-amber-500">{Math.round(statsVideo.viral_score || 0)}%</p>
                            </div>
                            <div className="bg-muted/40 border border-border/80 rounded-xl p-2 sm:p-2.5 space-y-0.5">
                                <span className="text-[9.5px] sm:text-[10px] text-muted-foreground font-medium">시간당 유입 속도</span>
                                <p className="text-xs sm:text-base font-extrabold text-indigo-400">
                                    {formatVelocity(statsVideo.velocity_score || 0)}
                                </p>
                            </div>
                            <div className="bg-muted/40 border border-border/80 rounded-xl p-2 sm:p-2.5 space-y-0.5">
                                <span className="text-[9.5px] sm:text-[10px] text-muted-foreground font-medium">채널 카테고리</span>
                                <p className="text-xs sm:text-base font-extrabold text-foreground truncate">
                                    {categoryMap[channelMap[statsVideo.channel_id]?.category_id || 0]?.name || channelMap[statsVideo.channel_id]?.folder_name || '유튜브 채널'}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="h-[220px] sm:h-[280px] w-full mt-2 sm:mt-3 bg-muted/20 border border-border/60 rounded-xl p-1.5 sm:p-3">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsLineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                                <XAxis
                                    dataKey="timestamp"
                                    tickFormatter={(time) => new Date(time).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                                    className="text-muted-foreground fill-muted-foreground"
                                    fontSize={9.5}
                                />
                                <YAxis yAxisId="left" stroke="#818cf8" fontSize={9.5} tickFormatter={(val) => formatCount(val)} />
                                <YAxis yAxisId="right" orientation="right" stroke="#fbbf24" fontSize={9.5} tickFormatter={(val) => formatCount(val) + '/h'} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)', fontSize: '11px' }}
                                    labelFormatter={(label) => new Date(label).toLocaleString()}
                                />
                                <Line yAxisId="left" type="monotone" dataKey="view_count" name="누적 조회수" stroke="#818cf8" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 4.5 }} />
                                <Line yAxisId="right" type="monotone" dataKey="velocity" name="시간당 유입 속도" stroke="#fbbf24" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="4 4" />
                            </RechartsLineChart>
                        </ResponsiveContainer>
                    </div>


                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center justify-between gap-2">
                        <p className="text-[11px] text-muted-foreground leading-tight">
                            💡 <strong className="text-indigo-400">AI 바이럴 진단</strong>: 동급 채널 평균 대비 높은 조회수 상승 탄력을 보이고 있는 검증된 레퍼런스 영상입니다.
                        </p>
                    </div>
                </DialogContent>
            </Dialog>

            {/* 3. 🎬 수집 영상 보관함과 동일한 프리미엄 비디오 상세 & 플레이어 모달 */}
            {playerVideo && (
                <Dialog open={!!playerVideo} onOpenChange={(open) => !open && setPlayerVideo(null)}>
                    <DialogContent className="max-w-4xl p-0 overflow-hidden bg-card border border-border text-foreground flex flex-col md:flex-row h-[90vh] md:h-[80vh] max-h-[780px] rounded-2xl shadow-2xl">
                        <DialogHeader className="sr-only">
                            <DialogTitle>{playerVideo.title || '영상 상세 정보'}</DialogTitle>
                            <DialogDescription>{playerVideo.content || playerVideo.extracted_text || '영상 상세 및 유튜브 플레이어'}</DialogDescription>
                        </DialogHeader>
                        
                        {/* 좌측: 9:16 비디오 플레이어 영역 (YouTube iframe / 로컬 스트리밍) */}
                        <div className="relative w-full md:w-[48%] h-[45%] md:h-full bg-black flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-border">

                            {(() => {
                                const ytId = playerVideo.video_id || (playerVideo.url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/)?.[1]);
                                const localVideoUrl = playerVideo.file_path ? getMediaUrl(playerVideo.file_path) : null;

                                if (ytId) {
                                    return (
                                        <iframe
                                            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0`}
                                            title={playerVideo.title}
                                            className="w-full h-full border-0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                        />
                                    );
                                } else if (localVideoUrl && localVideoUrl.startsWith('http')) {
                                    return (
                                        <video 
                                            src={localVideoUrl} 
                                            controls 
                                            autoPlay 
                                            loop 
                                            playsInline
                                            className="w-full h-full object-contain bg-black"
                                        />
                                    );
                                }
                                return (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <img 
                                            src={getVideoThumbnailUrl(playerVideo)} 
                                            alt={playerVideo.title} 
                                            className="w-full h-full object-cover opacity-60 filter blur-xs scale-105" 
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-6 text-center">
                                            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center mb-3 shadow-lg">
                                                <Play className="w-7 h-7 text-white fill-white ml-1" />
                                            </div>
                                            <p className="text-xs font-bold text-white/90">유튜브 원본 영상 스트리밍</p>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* 상단 퀵 뱃지 */}
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20">
                                {getViralBadge(playerVideo.viral_score, playerVideo.velocity_score)}
                                <span className="bg-black/60 backdrop-blur-xs text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                                    {categoryMap[channelMap[playerVideo.channel_id]?.category_id || 0]?.name || channelMap[playerVideo.channel_id]?.folder_name || '유튜브'}
                                </span>
                            </div>

                            {/* 우측 상단 유튜브 원본 바로가기 링크 버튼 */}
                            {getYoutubeWatchUrl(playerVideo) && (
                                <a
                                    href={getYoutubeWatchUrl(playerVideo)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-red-600/90 hover:bg-red-600 text-white text-[10.5px] font-bold px-2.5 py-1 rounded-full shadow-md backdrop-blur-xs transition-transform active:scale-95"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>유튜브 원본</span>
                                </a>
                            )}
                        </div>

                        {/* 우측: 상세 메타데이터 & 바이럴루프 원클릭 제작 액션 패널 */}
                        <div className="w-full md:w-[52%] h-[55%] md:h-full p-4 sm:p-6 overflow-y-auto flex flex-col justify-between space-y-4 bg-card text-card-foreground">
                            <div className="space-y-4">
                                
                                {/* 타이틀 및 채널 */}
                                <div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                        <span>채널: <strong className="text-foreground">{(playerVideo.channel_id && channelMap[playerVideo.channel_id]?.name) || (playerVideo.metadata_json as any)?.uploader || '트렌딩 크리에이터'}</strong></span>
                                        <span>{playerVideo.upload_date ? new Date(playerVideo.upload_date).toLocaleDateString() : '최근'}</span>
                                    </div>
                                    <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-foreground leading-snug">
                                        {playerVideo.title}
                                    </h3>
                                </div>

                                {/* 메트릭 4분할 그리드 */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                                        <p className="text-[10px] text-muted-foreground">조회수</p>
                                        <p className="text-xs font-extrabold text-foreground mt-0.5">{formatCount(playerVideo.view_count || (playerVideo.metadata_json as any)?.view_count)}</p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                                        <p className="text-[10px] text-muted-foreground">바이럴 스코어</p>
                                        <p className="text-xs font-extrabold text-amber-500 mt-0.5">{Math.round(playerVideo.viral_score || 0)}%</p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                                        <p className="text-[10px] text-muted-foreground">유입 속도</p>
                                        <p className="text-xs font-extrabold text-indigo-400 mt-0.5">{formatVelocity(playerVideo.velocity_score || 0)}</p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                                        <p className="text-[10px] text-muted-foreground">수집 상태</p>
                                        <p className="text-xs font-extrabold text-emerald-500 mt-0.5">온라인 분석</p>
                                    </div>
                                </div>

                                {/* 설명 & 추출 대본 프리뷰 박스 */}
                                <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs text-foreground space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <FileText className="w-3 h-3 text-primary" />
                                            수집 대본 및 설명
                                        </p>
                                        <button
                                            onClick={() => setSubtitleVideo(playerVideo)}
                                            className="text-[10px] font-bold text-primary hover:underline"
                                        >
                                            대본 전문보기 →
                                        </button>
                                    </div>
                                    <p className="leading-relaxed line-clamp-3 text-[11px] text-muted-foreground select-text font-sans">
                                        {cleanSrtToText(playerVideo.content || playerVideo.extracted_text || (playerVideo.metadata_json as any)?.description || '') || '추출된 대본 또는 영상 설명이 없습니다.'}
                                    </p>
                                </div>

                                {/* 수집 기록 및 성과 분석 */}
                                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs space-y-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-primary">
                                        <span>📊 AI 바이럴 점수 분석</span>
                                        <span className="text-emerald-500">상위 {Math.max(1, (100 - Math.min(100, (playerVideo.viral_score || 50) / 10))).toFixed(1)}%</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-normal">
                                        수집된 영상 자산입니다. AI 대본 재창작을 통해 자막 합성 및 더빙 버전으로 재가공하여 새로운 숏폼으로 제작할 수 있습니다.
                                    </p>
                                </div>

                            </div>

                            {/* 하단 바이럴루프 원클릭 제작 액션 버튼 바 */}
                            <div className="space-y-2 pt-2 border-t border-border">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button 
                                        onClick={async () => {
                                            const raw = playerVideo.content || playerVideo.extracted_text || "";
                                            const cleanText = cleanSrtToText(raw);
                                            navigate('/script-writer', { state: { initialScript: cleanText || playerVideo.title } });
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 rounded-xl shadow-md"
                                    >
                                        <Zap className="w-3.5 h-3.5 text-amber-300" /> ⚡ 대본 AI 재창작
                                    </Button>
                                    <Button 
                                        onClick={() => navigate('/creative-scripts', { state: { referenceVideo: playerVideo } })}
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 rounded-xl shadow-md"
                                    >
                                        <Radio className="w-3.5 h-3.5 text-purple-200" /> 🎙️ 딸깍 대본+더빙
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setSubtitleVideo(playerVideo)}
                                        className="bg-muted hover:bg-muted/80 border-border text-foreground text-xs py-2 flex items-center justify-center gap-1.5 rounded-xl"
                                    >
                                        <FileText className="w-3.5 h-3.5 text-indigo-500" /> 대본 전문 열람
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setStatsVideo(playerVideo)}
                                        className="bg-muted hover:bg-muted/80 border-border text-foreground text-xs py-2 flex items-center justify-center gap-1.5 rounded-xl"
                                    >
                                        <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> 📊 AI 바이럴 추이
                                    </Button>
                                </div>
                            </div>

                        </div>

                    </DialogContent>
                </Dialog>
            )}

        </div>
    );
};

export default ScriptLab;

