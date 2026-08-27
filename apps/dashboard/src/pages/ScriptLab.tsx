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
    Dialog, DialogContent, DialogHeader, DialogTitle
} from "../components/ui/dialog";
import { ScrollArea } from "../components/ui/scroll-area";
import StatsGraph from '../components/StatsGraph';
import {
    Search, TrendingUp, PlaySquare, FileText, Copy, Languages,
    ChevronUp, ChevronDown, MonitorPlay, Film, Smartphone, Trash2,
    Flame, Zap, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

// -- Helper Functions --
const cleanSrtToText = (srt: string): string => {
    if (!srt) return '';
    // If text does not look like SRT (no timestamps), return directly
    if (!srt.includes('-->')) return srt.trim();
    
    // Remove SRT index numbers and timestamps
    return srt
        .replace(/\r\n/g, '\n')
        .split('\n')
        .filter(line => {
            const trimmed = line.trim();
            if (!trimmed) return false;
            if (/^\d+$/.test(trimmed)) return false; // sequence number
            if (/^\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}/.test(trimmed)) return false; // timestamp
            return true;
        })
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
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
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [statsVideo, setStatsVideo] = useState<Video | null>(null);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const tableContainerRef = useRef<HTMLDivElement>(null);


    // 1. Fetch Data
    const { data: videos = [], isLoading } = useQuery({
        queryKey: ['videos', 'script', 'strict_mode_v1'], // [FIX] Rotated key to bust stale cache
        queryFn: async () => {
            // [FIX] Must explicitly request 'script' mode, otherwise backend defaults to 'video' and returns 0 scripts.
            const res = await api.get<Video[]>('/videos/', {
                params: {
                    mode: 'script',
                    limit: 1000,
                    sort_by: 'upload_date', // [FIX] Ensure backend sends latest first
                    sort_order: 'desc',
                    _t: new Date().getTime() // [FIX] Cache buster
                }
            });
            return res.data.filter((v: Video) => v.is_script_only); // [FINAL SAFEGUARD] Client-side filter
        }
    });

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

    // Fetch History for Selected Video (Detail Script Modal)
    const { data: selectedVideoHistory } = useQuery({
        queryKey: ['history', selectedVideo?.id],
        queryFn: async () => (await api.get(`/videos/${selectedVideo?.id}/history`)).data,
        enabled: !!selectedVideo
    });

    // Fetch Script Content for Dialog
    const { data: subtitleContent, isLoading: isScriptLoading } = useQuery({
        queryKey: ['subtitle', selectedVideo?.id],
        queryFn: async () => {
            if (!selectedVideo) return null;
            try {
                const res = await api.get(`/videos/${selectedVideo.id}/subtitles`);
                return res.data;
            } catch (e) {
                // Return phantom if 404
                return { content: "" };
            }
        },
        enabled: !!selectedVideo
    });

    const selectedChartData = useMemo(() => {
        if (!selectedVideoHistory || selectedVideoHistory.length === 0) {
            if (!selectedVideo) return [];
            return [
                {
                    timestamp: selectedVideo.upload_date || new Date().toISOString(),
                    view_count: selectedVideo.view_count || 0,
                    velocity: selectedVideo.velocity_score || 0
                }
            ];
        }
        return selectedVideoHistory.map((h: any) => ({
            timestamp: h.recorded_at,
            view_count: h.view_count,
            velocity: h.velocity_score
        }));
    }, [selectedVideoHistory, selectedVideo]);


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
                    <div className="flex items-center justify-center">
                        {getViralBadge(score, undefined)}
                    </div>
                );
            },
            size: 110,
        }),
        // 3. Title & Script Hook Summary (Core Value of Script Lab)
        columnHelper.accessor('title', {
            header: '제목 및 대본 바이럴 훅 (Hook)',
            cell: info => {
                const rawContent = info.row.original.content || "";
                const cleanPreview = cleanSrtToText(rawContent);
                return (
                    <div className="flex flex-col w-full max-w-lg py-1">
                        <span
                            className="font-bold text-foreground text-sm cursor-pointer hover:underline hover:text-primary transition-colors line-clamp-1"
                            title={info.getValue()}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVideo(info.row.original);
                            }}
                        >
                            {info.getValue()}
                        </span>
                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-1">
                            <FileText className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5 opacity-80" />
                            <p className="line-clamp-2 text-[12px] text-muted-foreground/90 leading-relaxed font-sans select-text">
                                {cleanPreview ? `"${cleanPreview}"` : "(대본을 불러오려면 클릭하세요)"}
                            </p>
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
        // 7. Actions (대본 전문 열람 / AI 재창작)
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
                            className="h-7 px-2.5 text-[11px] gap-1 hover:bg-primary/10 hover:text-primary border-border/80 font-medium"
                            onClick={() => setSelectedVideo(v)}
                        >
                            <FileText className="w-3 h-3" />
                            대본열람
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
                            <Sparkles className="w-3 h-3" />
                            AI 각색
                        </Button>
                    </div>
                );
            },
            size: 160,
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
            isDragMoved.current = true;
            setIsDragging(true);
        }
    }

    // Graph Data Calculation
    const chartData = useMemo(() => {
        if (!videoHistory || videoHistory.length === 0 || !statsVideo) return [];
        const sorted = [...videoHistory].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const uploadDate = new Date(statsVideo.upload_date).getTime();

        return sorted.map((item, i) => {
            let velocity = 0;
            const itemTime = new Date(item.timestamp).getTime();
            const hoursSinceUpload = Math.max(0.1, (itemTime - uploadDate) / (1000 * 60 * 60));
            const lifetimeVelocity = item.view_count / hoursSinceUpload;

            if (i === 0) {
                velocity = lifetimeVelocity;
            } else {
                const prev = sorted[i - 1];
                const prevTime = new Date(prev.timestamp).getTime();
                const timeDiff = itemTime - prevTime;
                const hours = timeDiff / (1000 * 60 * 60);

                let instantVelocity = 0;
                if (hours > 0) {
                    const viewDiff = item.view_count - prev.view_count;
                    instantVelocity = viewDiff / hours;
                }

                if (instantVelocity > 0) {
                    velocity = instantVelocity;
                } else {
                    velocity = lifetimeVelocity;
                }
            }

            return {
                ...item,
                velocity: Math.max(0, Math.floor(velocity))
            };
        });
    }, [videoHistory, statsVideo]);

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
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 p-2 rounded-2xl bg-card border border-border/80 shadow-2xs">
                {/* 좌측: 카테고리 탭 */}
                <div className="flex items-center gap-1 overflow-x-auto dashboard-scroll-area select-none pb-1 lg:pb-0">
                    <button
                        onClick={() => setSelectedCategory('ALL')}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
                            selectedCategory === 'ALL'
                                ? "bg-primary text-white shadow-2xs"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent"
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
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
                                    isCatSelected
                                        ? "bg-primary text-white shadow-2xs"
                                        : "hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent"
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

                {/* 우측: 기간 + 정렬 + 검색창 */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* 기간 필터 */}
                    <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-xl border border-border/50 text-[11px] font-medium text-muted-foreground">
                        <span className="px-1.5 text-[10px] text-muted-foreground/70 hidden sm:inline">📅 기간:</span>
                        {(['ALL', '1d', '3d', '7d'] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setTimeRange(r)}
                                className={cn(
                                    "px-2 py-1 rounded-lg transition-all text-xs font-semibold",
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
                                    "px-2 py-1 rounded-lg transition-all text-xs font-semibold",
                                    sortOption === opt
                                        ? "bg-card text-foreground shadow-2xs font-bold"
                                        : "hover:text-foreground"
                                )}
                            >
                                {opt === 'viral' ? '바이럴순' : opt === 'latest' ? '최신순' : '조회수순'}
                            </button>
                        ))}
                    </div>

                    {/* 실시간 검색창 */}
                    <div className="relative flex-1 sm:w-48">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            placeholder="제목, 채널 검색..."
                            className="pl-9 bg-card shadow-2xs text-xs h-9 w-full"
                            value={globalFilter}
                            onChange={e => setGlobalFilter(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Data Table Container */}
            <div className="flex-1 rounded-xl border border-border bg-card shadow-2xs overflow-hidden flex flex-col select-none relative min-h-[360px]">
                <div
                    className="overflow-x-auto flex-1 w-full relative"
                    onMouseDown={handleMouseDown}
                    onMouseMove={onTableMouseMove}
                >
                    <Table className="w-full min-w-[760px]">
                        {/* Headers: Always visible to show column structure */}
                        <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur-xs z-10 shadow-2xs">
                            {table.getHeaderGroups().map(headerGroup => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map(header => {
                                        // Determine alignment based on column ID
                                        let alignClass = 'justify-start';
                                        if (header.column.id === 'viral_score' || header.column.id === 'select') alignClass = 'justify-center'; // Grade & Checkbox
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
                                        // [FIX] Only open dialog if NOT dragged
                                        if (!isDragMoved.current) {
                                            setSelectedVideo(row.original);
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

                    {/* Centered Empty State Overlay (Viewport relative) */}
                    {table.getRowModel().rows?.length === 0 && (
                        <div className="absolute inset-x-0 bottom-0 top-12 flex flex-col items-center justify-center p-6 text-center text-muted-foreground gap-2 bg-card/60 backdrop-blur-2xs">
                            <Sparkles className="w-9 h-9 opacity-30 text-primary mb-0.5" />
                            <p className="text-sm font-semibold text-foreground">분석된 대본 데이터가 없습니다</p>
                            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                                더우인 수집기 또는 미디어 고속 다운로드에서 영상을 추출하여 대본 분석을 시작해보세요.
                            </p>
                        </div>
                    )}
                </div>

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

            {/* Script Reader & Viral Analytics Modal */}
            <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
                <DialogContent className="max-w-5xl h-[88vh] flex flex-col p-0 gap-0 overflow-hidden bg-background text-foreground border border-border shadow-2xl rounded-2xl">
                    {selectedVideo && (
                        <>
                            {/* Header with Title, Grade Badge, and Action Buttons */}
                            <div className="flex items-center justify-between p-4 px-6 border-b border-border bg-card">
                                <div className="flex flex-col overflow-hidden mr-4 gap-1">
                                    <DialogTitle className="text-lg font-black tracking-tight text-foreground truncate max-w-2xl">
                                        {selectedVideo.title}
                                    </DialogTitle>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                        <Badge variant="secondary" className="font-semibold text-[11px] px-2 py-0.5 bg-muted text-foreground">
                                            {channelMap[selectedVideo.channel_id]?.name || 'Unknown Channel'}
                                        </Badge>
                                        <span>•</span>
                                        <span className="font-mono text-xs">{new Date(selectedVideo.upload_date).toLocaleDateString('ko-KR')}</span>
                                        <span>•</span>
                                        {getViralBadge(selectedVideo.viral_score, selectedVideo.velocity_score)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 text-xs h-8.5 px-3 border-border font-medium hover:bg-muted"
                                        onClick={() => {
                                            if (subtitleContent?.content && subtitleContent.content !== "No subtitles found.") {
                                                const textToCopy = cleanSrtToText(subtitleContent.content);
                                                navigator.clipboard.writeText(textToCopy);
                                                alert("정제된 대본이 클립보드에 복사되었습니다.");
                                            }
                                        }}
                                        disabled={!subtitleContent?.content || subtitleContent.content === "No subtitles found."}
                                    >
                                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                        대본 복사
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8.5 px-3.5 font-bold shadow-md"
                                        onClick={() => {
                                            if (subtitleContent?.content && subtitleContent.content !== "No subtitles found.") {
                                                const cleanText = cleanSrtToText(subtitleContent.content);
                                                navigate('/script-writer', { state: { initialScript: cleanText } });
                                            }
                                        }}
                                        disabled={!subtitleContent?.content || subtitleContent.content === "No subtitles found."}
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                        AI 대본 각색
                                    </Button>
                                </div>
                            </div>

                            {/* Modal Body: Left 55% Script Viewer, Right 45% Viral Trend & Stats */}
                            <div className="flex-1 flex overflow-hidden divide-x divide-border">
                                {/* Left Panel: Clean Script Content */}
                                <div className="flex-1 p-6 overflow-hidden flex flex-col bg-background">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                            <FileText className="w-4 h-4 text-primary" />
                                            수집된 대본 전문 (Clean Script)
                                        </h4>
                                        <span className="text-[11px] text-muted-foreground font-mono">
                                            {selectedVideo.duration ? `${selectedVideo.duration}초 분량` : ''}
                                        </span>
                                    </div>
                                    <ScrollArea className="flex-1 h-full pr-4">
                                        {isScriptLoading ? (
                                            <div className="flex flex-col items-center justify-center h-60 text-muted-foreground gap-3">
                                                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                                                <p className="text-sm font-medium">대본을 불러오는 중...</p>
                                            </div>
                                        ) : subtitleContent && subtitleContent.content && subtitleContent.content !== "No subtitles found." ? (
                                            <div className="space-y-4">
                                                <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs">
                                                    <p className="text-[14.5px] font-sans leading-relaxed text-foreground select-text whitespace-pre-wrap font-normal">
                                                        {cleanSrtToText(subtitleContent.content)}
                                                    </p>
                                                </div>

                                                {/* Raw Subtitle Toggle */}
                                                <details className="text-xs text-muted-foreground p-1">
                                                    <summary className="cursor-pointer font-semibold hover:text-foreground py-1 select-none">
                                                        타임스탬프 원본 (SRT) 보기
                                                    </summary>
                                                    <pre className="mt-2 p-3 bg-muted/40 rounded-xl font-mono text-[11px] leading-snug max-h-56 overflow-y-auto whitespace-pre-wrap border border-border/60">
                                                        {subtitleContent.content}
                                                    </pre>
                                                </details>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-60 text-muted-foreground gap-3">
                                                <FileText className="w-10 h-10 opacity-30" />
                                                <p className="text-sm font-medium">대본 파일이 존재하지 않습니다.</p>
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>

                                {/* Right Panel: Viral Analytics & Time-Series Graph */}
                                <div className="w-[420px] p-5 space-y-4 overflow-y-auto shrink-0 bg-muted/20 flex flex-col">
                                    <div>
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                                            AI 바이럴 성과 지표
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-card border border-border rounded-xl p-3 space-y-0.5 shadow-2xs">
                                                <span className="text-[10px] text-muted-foreground font-medium">총 누적 조회수</span>
                                                <p className="text-base font-extrabold text-foreground font-mono">
                                                    {formatCount(selectedVideo.view_count || selectedVideo.metadata_json?.view_count)}
                                                </p>
                                            </div>
                                            <div className="bg-card border border-border rounded-xl p-3 space-y-0.5 shadow-2xs">
                                                <span className="text-[10px] text-muted-foreground font-medium">바이럴 지수</span>
                                                <p className="text-base font-extrabold text-red-500 font-mono">
                                                    {Math.round(selectedVideo.viral_score || 0)}%
                                                </p>
                                            </div>
                                            <div className="bg-card border border-border rounded-xl p-3 space-y-0.5 shadow-2xs">
                                                <span className="text-[10px] text-muted-foreground font-medium">시간당 유입 속도</span>
                                                <p className="text-base font-extrabold text-indigo-500 font-mono">
                                                    {formatVelocity(selectedVideo.velocity_score || 0)}
                                                </p>
                                            </div>
                                            <div className="bg-card border border-border rounded-xl p-3 space-y-0.5 shadow-2xs">
                                                <span className="text-[10px] text-muted-foreground font-medium">채널 카테고리</span>
                                                <p className="text-xs font-bold text-foreground truncate mt-1">
                                                    {categoryMap[channelMap[selectedVideo.channel_id]?.category_id || 0]?.name || channelMap[selectedVideo.channel_id]?.folder_name || '미분류'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Viral Trend Time-Series Graph */}
                                    <div className="flex-1 flex flex-col min-h-[220px]">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                바이럴 추이 분석 그래프
                                            </h4>
                                            <span className="text-[10px] text-muted-foreground">조회수(보라) / 유입속도(노랑)</span>
                                        </div>
                                        <div className="flex-1 w-full bg-card border border-border/80 rounded-xl p-2.5">
                                            <ResponsiveContainer width="100%" height={190}>
                                                <RechartsLineChart data={selectedChartData}>
                                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                                                    <XAxis
                                                        dataKey="timestamp"
                                                        tickFormatter={(time) => new Date(time).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                                                        className="text-muted-foreground fill-muted-foreground"
                                                        fontSize={10}
                                                    />
                                                    <YAxis yAxisId="left" stroke="#818cf8" fontSize={10} tickFormatter={(val) => formatCount(val)} />
                                                    <YAxis yAxisId="right" orientation="right" stroke="#fbbf24" fontSize={10} tickFormatter={(val) => formatCount(val) + '/h'} />
                                                    <Tooltip
                                                        contentStyle={{
                                                            borderRadius: '12px',
                                                            border: '1px solid var(--border)',
                                                            backgroundColor: 'var(--card)',
                                                            color: 'var(--foreground)',
                                                            fontSize: '11px'
                                                        }}
                                                        labelFormatter={(label) => new Date(label).toLocaleString()}
                                                    />
                                                    <Line yAxisId="left" type="monotone" dataKey="view_count" name="누적 조회수" stroke="#818cf8" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                                                    <Line yAxisId="right" type="monotone" dataKey="velocity" name="시간당 유입 속도" stroke="#fbbf24" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="3 3" />
                                                </RechartsLineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Bottom Details */}
                                    <div className="pt-2 border-t border-border text-[11px] text-muted-foreground space-y-1">
                                        <div className="flex justify-between">
                                            <span>대본 파일 상태:</span>
                                            <span className="font-mono text-foreground">{selectedVideo.file_path ? '수집 완료' : '없음'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>

            </Dialog>


            {/* Graph Popover (Dialog) matches Gallery.tsx exactly */}
            <Dialog open={!!statsVideo} onOpenChange={(open) => !open && setStatsVideo(null)}>
                <DialogContent className="max-w-2xl bg-card border border-border backdrop-blur-xl text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">바이럴 변화 추이</DialogTitle>
                    </DialogHeader>
                    {statsVideo && videoHistory && videoHistory.length > 0 ? (
                        <div className="h-[350px] mt-4 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsLineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis
                                        dataKey="timestamp"
                                        tickFormatter={(time) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        stroke="var(--muted-foreground)"
                                        fontSize={12}
                                    />
                                    <YAxis yAxisId="left" stroke="var(--primary)" fontSize={12} tickFormatter={(val) => formatCount(val)} />
                                    <YAxis yAxisId="right" orientation="right" stroke="var(--accent)" fontSize={12} tickFormatter={(val) => formatCount(val) + '/h'} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--popover)', color: 'var(--popover-foreground)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        labelFormatter={(label) => new Date(label).toLocaleString()}
                                    />
                                    <Line yAxisId="left" type="monotone" dataKey="view_count" name="누적 조회수" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    <Line yAxisId="right" type="monotone" dataKey="velocity" name="시간당 조회수 (Vel)" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                                </RechartsLineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-64 text-muted-foreground">
                            <TrendingUp className="w-8 h-8 mr-2 opacity-50" />
                            데이터가 충분하지 않습니다.
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default ScriptLab;
