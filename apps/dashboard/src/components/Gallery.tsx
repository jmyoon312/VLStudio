import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api, { Video, Settings, Channel, Category } from '../lib/api';
import SubtitleViewer from './SubtitleViewer';
import { AutoHDSettingsDialog } from './AutoHDSettingsDialog';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, getMediaUrl } from "@/lib/utils";
import {
    Loader2, Trash2, Play, FileText,
    Flame, Zap, TrendingUp, RefreshCw, Filter, Settings2,
    FolderOpen, Calendar, Copy, Check, Languages, CheckSquare, Square, AlertCircle, LineChart, Download,
    ExternalLink, PlaySquare, ChevronRight, CheckCircle2, X, Sparkles, Radio, Scissors, Search, ArrowUpDown
} from 'lucide-react';
import { toast } from 'sonner';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatCount = (val?: number | string) => {
    if (!val) return '0';
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    if (isNaN(num)) return '0';
    if (num >= 100000000) return `${(num / 100000000).toFixed(1)}억`;
    if (num >= 10000) return `${(num / 10000).toFixed(1)}만`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toLocaleString();
};

const getViralBadge = (viralScore?: number, velocityScore?: number) => {
    const rawScore = Number(viralScore) || 0;
    const score = Math.round(rawScore); // 소수점 아래 반올림하여 깔끔한 정수 표시

    if (score >= 300) {
        return (
            <Badge className="bg-gradient-to-r from-red-500 to-rose-600 text-white font-extrabold text-[10px] px-1.5 py-0.5 shadow-sm border-0 flex items-center gap-1 shrink-0">
                <Flame className="w-3 h-3 fill-yellow-300 text-yellow-300" /> S등급 {score}%
            </Badge>
        );
    }
    if (score >= 100) {
        return (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-[10px] px-1.5 py-0.5 shadow-sm border-0 flex items-center gap-1 shrink-0">
                <Zap className="w-3 h-3 fill-white" /> A등급 {score}%
            </Badge>
        );
    }
    if (score >= 30) {
        return (
            <Badge className="bg-emerald-600 text-white font-bold text-[10px] px-1.5 py-0.5 shadow-sm border-0 flex items-center gap-1 shrink-0">
                <span>🌱</span> B등급 {score}%
            </Badge>
        );
    }
    return (
        <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-800/80 text-slate-300 border border-slate-700 shrink-0">
            <span>☁️</span> C등급 {score}%
        </Badge>
    );
};

const getVideoThumbnailUrl = (video: Video, rootDownloadPath?: string): string => {
    if (video.thumbnail_path) {
        const url = getMediaUrl(video.thumbnail_path, rootDownloadPath);
        if (url) return url;
    }
    const meta = video.metadata_json as any;
    if (meta?.thumbnail) {
        const url = getMediaUrl(meta.thumbnail, rootDownloadPath);
        if (url) return url;
    }
    if (meta?.thumbnail_url) {
        return meta.thumbnail_url;
    }
    if (video.video_id) {
        return `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;
    }
    if (video.url) {
        const match = video.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
        if (match && match[1]) {
            return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
        }
    }
    return '';
};

const Gallery = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // 필터 & 정렬 & 선택 상태
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [selectedDateFilter, setSelectedDateFilter] = useState<'ALL' | '1d' | '3d' | '7d' | '30d'>('ALL');
    const [sortBy, setSortBy] = useState<'viral' | 'latest' | 'views'>('viral');
    const [searchQuery, setSearchQuery] = useState('');

    // 모달 상태
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [subtitleVideo, setSubtitleVideo] = useState<Video | null>(null);
    const [statsVideo, setStatsVideo] = useState<Video | null>(null);

    // 데이터 조회
    const { data: videos, isLoading: isVideosLoading, isError, error } = useQuery<Video[]>({
        queryKey: ['videos'],
        queryFn: async () => {
            const res = await api.get<Video[]>('/videos/', { params: { mode: 'video' } });
            return res.data.filter(v => !v.is_script_only);
        }
    });

    const { data: settings } = useQuery<Settings>({
        queryKey: ['settings'],
        queryFn: async () => (await api.get('/settings/')).data
    });

    const { data: channels } = useQuery<Channel[]>({
        queryKey: ['channels'],
        queryFn: async () => (await api.get('/channels/')).data
    });

    const { data: categories } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => (await api.get('/categories/')).data
    });

    const { data: videoHistory } = useQuery({
        queryKey: ['videoHistory', statsVideo?.id],
        queryFn: async () => {
            if (!statsVideo) return [];
            return (await api.get(`/videos/${statsVideo.id}/stats`)).data;
        },
        enabled: !!statsVideo
    });

    // 맵 빌드
    const channelMap = useMemo(() => {
        if (!channels) return {};
        return channels.reduce((acc, ch) => {
            acc[ch.id] = ch;
            return acc;
        }, {} as Record<number, Channel>);
    }, [channels]);

    const categoryMap = useMemo(() => {
        if (!categories) return {};
        return categories.reduce((acc, cat) => {
            acc[cat.id] = cat;
            return acc;
        }, {} as Record<number, Category>);
    }, [categories]);

    // 날짜 필터 매칭 헬퍼
    const matchDateFilter = (dateStr?: string, filter: string = 'ALL') => {
        if (filter === 'ALL' || !dateStr) return true;
        const itemDate = new Date(dateStr).getTime();
        if (isNaN(itemDate)) return true;
        const diffHours = (Date.now() - itemDate) / (1000 * 60 * 60);
        if (filter === '1d') return diffHours <= 24;
        if (filter === '3d') return diffHours <= 24 * 3;
        if (filter === '7d') return diffHours <= 24 * 7;
        if (filter === '30d') return diffHours <= 24 * 30;
        return true;
    };

    // 카테고리명 계산
    const getVideoCategory = (v: Video): string => {
        if (v.category && v.category.trim()) return v.category;
        if (v.channel_id && channelMap[v.channel_id]) {
            const ch = channelMap[v.channel_id];
            if (ch.category_id && categoryMap[ch.category_id]) {
                return categoryMap[ch.category_id].name;
            }
        }
        return '미분류';
    };

    // 가공된 영상 목록
    const processedVideos = useMemo(() => {
        if (!videos) return [];
        return videos.map(v => ({
            ...v,
            computedCategory: getVideoCategory(v),
            viewCountNum: v.view_count || (v.metadata_json?.view_count ? Number(v.metadata_json.view_count) : 0),
            viralScoreNum: v.viral_score || 0,
        }));
    }, [videos, channelMap, categoryMap]);

    // 카테고리별 통계
    const categoryStats = useMemo(() => {
        const counts: Record<string, number> = {};
        processedVideos.forEach(v => {
            const cat = v.computedCategory;
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    }, [processedVideos]);

    // 필터링 & 정렬 적용된 영상 목록
    const filteredVideos = useMemo(() => {
        return processedVideos
            .filter(v => {
                const matchCat = selectedCategory === 'ALL' || v.computedCategory === selectedCategory;
                const matchDate = matchDateFilter(v.upload_date || v.created_at, selectedDateFilter);
                const matchQuery = !searchQuery.trim() || 
                    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (v.metadata_json?.uploader && v.metadata_json.uploader.toLowerCase().includes(searchQuery.toLowerCase()));
                return matchCat && matchDate && matchQuery;
            })
            .sort((a, b) => {
                if (sortBy === 'viral') return b.viralScoreNum - a.viralScoreNum;
                if (sortBy === 'views') return b.viewCountNum - a.viewCountNum;
                if (sortBy === 'latest') return new Date(b.upload_date || b.created_at).getTime() - new Date(a.upload_date || a.created_at).getTime();
                return 0;
            });
    }, [processedVideos, selectedCategory, selectedDateFilter, searchQuery, sortBy]);

    // 뮤테이션
    const deleteMutation = useMutation({
        mutationFn: (ids: number[]) => api.post('/videos/delete', { video_ids: ids }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['videos'] });
            setSelectedIds(new Set());
            toast.success('선택한 영상이 영구 삭제되었습니다.');
        },
        onError: () => {
            toast.error('영상 삭제 중 오류가 발생했습니다.');
        }
    });

    const hdDownloadMutation = useMutation({
        mutationFn: (videoId: number) => api.post('/videos/manual-hd-download', { video_id: videoId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['videos'] });
            toast.success('HD 다운로드가 완료되었습니다.');
        },
        onError: (error: any) => {
            toast.error(`HD 다운로드 실패: ${error.response?.data?.detail || error.message}`);
        }
    });

    // 드래그 영역 선택 상태 & ref
    const [isDragging, setIsDragging] = useState(false);
    const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
    const videoRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
    const dragStartSelectedIds = useRef<Set<number>>(new Set());

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !selectionBox) return;
            const newSelectionBox = { ...selectionBox, endX: e.pageX, endY: e.pageY };
            setSelectionBox(newSelectionBox);

            const boxRect = {
                left: Math.min(newSelectionBox.startX, newSelectionBox.endX),
                top: Math.min(newSelectionBox.startY, newSelectionBox.endY),
                right: Math.max(newSelectionBox.startX, newSelectionBox.endX),
                bottom: Math.max(newSelectionBox.startY, newSelectionBox.endY)
            };

            const newSelected = new Set(e.ctrlKey || e.shiftKey ? dragStartSelectedIds.current : []);

            Object.entries(videoRefs.current).forEach(([idStr, el]) => {
                if (!el) return;
                const rect = el.getBoundingClientRect();
                const scrollX = window.scrollX;
                const scrollY = window.scrollY;
                const elLeft = rect.left + scrollX;
                const elTop = rect.top + scrollY;
                const elRight = elLeft + rect.width;
                const elBottom = elTop + rect.height;

                const isIntersecting = !(
                    boxRect.left > elRight ||
                    boxRect.right < elLeft ||
                    boxRect.top > elBottom ||
                    boxRect.bottom < elTop
                );
                if (isIntersecting) newSelected.add(Number(idStr));
            });
            setSelectedIds(newSelected);
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                setSelectionBox(null);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, selectionBox]);

    const handleMouseDown = (e: React.MouseEvent) => {
        // 버튼, 입력창, 링크, 체크박스 등에서는 드래그 박스 시작하지 않음
        if ((e.target as HTMLElement).closest('button') || 
            (e.target as HTMLElement).closest('input') || 
            (e.target as HTMLElement).closest('a') ||
            (e.target as HTMLElement).closest('.action-btn')) {
            return;
        }

        if (!e.ctrlKey && !e.shiftKey) {
            if (!(e.target as HTMLElement).closest('.video-card-item')) {
                setSelectedIds(new Set());
                dragStartSelectedIds.current = new Set();
            } else {
                dragStartSelectedIds.current = new Set(selectedIds);
            }
        } else {
            dragStartSelectedIds.current = new Set(selectedIds);
        }
        setIsDragging(true);
        setSelectionBox({ startX: e.pageX, startY: e.pageY, endX: e.pageX, endY: e.pageY });
    };

    // 선택 토글
    const toggleSelection = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredVideos.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredVideos.map(v => v.id)));
        }
    };

    // 일괄 액션 핸들러 (딸깍 자동 생성 연동)
    const handleLaunchBatchDdalkkak = (tab: 'subtitle' | 'ttsdub' = 'subtitle') => {
        const selectedList = filteredVideos.filter(v => selectedIds.has(v.id));
        const titles = selectedList.map(v => v.title).join(',');
        const videoUrls = selectedList.map(v => getMediaUrl(v.file_path, settings?.root_download_path) || v.url || v.file_path).join(',');

        toast.success(`선택한 ${selectedIds.size}개 영상으로 딸깍 ${tab === 'subtitle' ? '자막 생성' : '대본+더빙'} 일괄 작업을 시작합니다!`);
        navigate(`/ddalkkak?tab=${tab}&batch=true&titles=${encodeURIComponent(titles)}&videoUrls=${encodeURIComponent(videoUrls)}`);
    };

    const handleSingleDdalkkak = (video: Video, tab: 'subtitle' | 'ttsdub' = 'subtitle') => {
        const title = video.title || '';
        const videoUrl = getMediaUrl(video.file_path, settings?.root_download_path) || video.url || video.file_path || '';
        setSelectedVideo(null);
        toast.info(`딸깍 ${tab === 'subtitle' ? '자막 자동 생성' : '대본 + 더빙'} 스튜디오로 이동합니다`);
        navigate(`/ddalkkak?tab=${tab}&batch=true&titles=${encodeURIComponent(title)}&videoUrls=${encodeURIComponent(videoUrl)}`);
    };

    const handleGoToScriptLab = (video: Video) => {
        setSelectedVideo(null);
        toast.info("대본 추출 및 AI 재창작 스튜디오로 이동합니다", {
            description: `영상: "${video.title}"`
        });
        navigate(`/script-lab?videoId=${video.id}&title=${encodeURIComponent(video.title)}`);
    };

    const handleGoToSceneCutter = (video: Video) => {
        setSelectedVideo(null);
        toast.info("씬 커터로 이동합니다", {
            description: `영상: "${video.title}"`
        });
        navigate(`/scene-cutter-pro?videoId=${video.id}`);
    };

    const handleDeleteSelected = () => {
        if (confirm(`선택한 ${selectedIds.size}개의 영상을 영구 삭제하시겠습니까? (파일도 함께 삭제됩니다)`)) {
            deleteMutation.mutate(Array.from(selectedIds));
        }
    };

    const openFolder = async (filePath?: string) => {
        if (!filePath) return;
        try {
            await api.post('/videos/open-folder', { file_path: filePath });
        } catch (_) {
            toast.error('폴더 열기 실패');
        }
    };

    // 차트 데이터 계산
    const chartData = useMemo(() => {
        if (!videoHistory || videoHistory.length === 0 || !statsVideo) return [];
        const sorted = [...videoHistory].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const uploadDate = new Date(statsVideo.upload_date).getTime();

        return sorted.map((item, i) => {
            const itemTime = new Date(item.timestamp).getTime();
            const hoursSinceUpload = Math.max(0.1, (itemTime - uploadDate) / (1000 * 60 * 60));
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
                velocity: Math.max(0, Math.floor(velocity))
            };
        });
    }, [videoHistory, statsVideo]);

    if (isVideosLoading || !settings) {
        return (
            <div className="flex flex-col items-center justify-center h-80 gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs font-bold">수집 미디어 보관함을 불러오는 중...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-80 text-destructive gap-2">
                <AlertCircle className="w-8 h-8" />
                <p className="font-bold">영상 목록을 불러오는데 실패했습니다.</p>
                <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
            </div>
        );
    }

    return (
        <div 
            className="space-y-4 sm:space-y-5 p-3 sm:p-6 pb-28 md:pb-16 bg-background text-foreground min-h-screen relative select-none"
            onMouseDown={handleMouseDown}
        >
            {/* 드래그 다중 선택 박스 오버레이 (Marquee Selection) */}
            {isDragging && selectionBox && (
                <div
                    className="fixed pointer-events-none border-2 border-primary bg-primary/20 z-50 rounded-lg shadow-sm"
                    style={{
                        left: Math.min(selectionBox.startX, selectionBox.endX) - window.scrollX,
                        top: Math.min(selectionBox.startY, selectionBox.endY) - window.scrollY,
                        width: Math.abs(selectionBox.endX - selectionBox.startX),
                        height: Math.abs(selectionBox.endY - selectionBox.startY),
                    }}
                />
            )}
            
            {/* 1. 상단 스마트 헤더 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                            <FolderOpen className="w-4 h-4" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                            수집 미디어 갤러리
                        </h1>
                        <Badge variant="secondary" className="font-mono text-xs font-bold">
                            총 {processedVideos.length}개
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        더우인/유튜브에서 수집된 원본 레퍼런스 자산을 바이럴 지수별로 관리하고 <strong>원클릭 딸깍 일괄 제작</strong>으로 연결합니다. (바탕 드래그 또는 카드 클릭으로 다중 선택)
                    </p>
                </div>

                {/* 우측 빠른 제어 액션 버튼들 */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
                    <AutoHDSettingsDialog
                        trigger={
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-primary border-primary/20 hover:bg-primary/10">
                                <Settings2 className="w-3.5 h-3.5" />
                                Auto HD 설정
                            </Button>
                        }
                    />

                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={toggleSelectAll} 
                        className="h-8 gap-1.5 text-xs font-bold"
                    >
                        {selectedIds.size === filteredVideos.length && filteredVideos.length > 0 
                            ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> 
                            : <Square className="w-3.5 h-3.5" />
                        }
                        {selectedIds.size === filteredVideos.length && filteredVideos.length > 0 ? '전체 해제' : '전체 선택'}
                    </Button>
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
                            {processedVideos.length}
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

                {/* 우측: 날짜 필터 & 정렬 & 검색 */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    
                    {/* 수집 기간 필터 */}
                    <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/50">
                        <span className="text-[10px] font-bold text-muted-foreground px-1.5">📅 기간:</span>
                        {[
                            { id: 'ALL', label: '전체' },
                            { id: '1d', label: '최근 1일' },
                            { id: '3d', label: '최근 3일' },
                            { id: '7d', label: '최근 7일' },
                        ].map((d) => (
                            <button
                                key={d.id}
                                onClick={() => setSelectedDateFilter(d.id as any)}
                                className={cn(
                                    "px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all",
                                    selectedDateFilter === d.id
                                        ? "bg-background text-foreground shadow-2xs border border-border/60"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>

                    {/* 정렬 셀렉터 */}
                    <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/50">
                        <span className="text-[10px] font-bold text-muted-foreground px-1.5">⚡ 정렬:</span>
                        {[
                            { id: 'viral', label: '바이럴순' },
                            { id: 'latest', label: '최신순' },
                            { id: 'views', label: '조회수순' },
                        ].map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setSortBy(s.id as any)}
                                className={cn(
                                    "px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all",
                                    sortBy === s.id
                                        ? "bg-background text-foreground shadow-2xs border border-border/60"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    {/* 검색창 */}
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="제목/채널 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-32 sm:w-40 pl-8 pr-2.5 py-1 text-xs rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>

                </div>

            </div>

            {/* 3. 🎬 비디오 카드 반응형 그리드 (Pixeling 9:16 스타일) */}
            {filteredVideos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 select-none">
                    {filteredVideos.map((video) => {
                        const isSelected = selectedIds.has(video.id);
                        const thumbUrl = getVideoThumbnailUrl(video, settings?.root_download_path);
                        const videoUrl = getMediaUrl(video.file_path, settings?.root_download_path);
                        const channelName = (video.channel_id && channelMap[video.channel_id]?.name) || (video.metadata_json as any)?.uploader || "트렌딩 크리에이터";
                        const channelThumb = video.channel_id && channelMap[video.channel_id] ? getMediaUrl(channelMap[video.channel_id].thumbnail_path, settings?.root_download_path) : null;
                        const uploadDateStr = video.upload_date ? new Date(video.upload_date).toLocaleDateString() : '최근';

                        return (
                            <div
                                key={video.id}
                                ref={el => { videoRefs.current[video.id] = el; }}
                                onClick={(e) => toggleSelection(e, video.id)}
                                onDoubleClick={(e) => { e.stopPropagation(); setSelectedVideo(video); }}
                                className={cn(
                                    "video-card-item h-[260px] sm:h-[285px] rounded-2xl bg-slate-900 border overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between p-2.5 relative group select-none",
                                    isSelected
                                        ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                                        : "border-border/80 hover:border-primary/50"
                                )}
                            >
                                {/* 배경 미디어 레이어 (썸네일 이미지 + 비디오 프리뷰 + 그라데이션) */}
                                <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
                                    {thumbUrl ? (
                                        <img
                                            src={thumbUrl}
                                            alt={video.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            onError={(e) => {
                                                const img = e.currentTarget;
                                                if (img.src.includes('maxresdefault.jpg')) {
                                                    img.src = img.src.replace('maxresdefault.jpg', 'hqdefault.jpg');
                                                } else if (img.src.includes('hqdefault.jpg')) {
                                                    img.src = img.src.replace('hqdefault.jpg', 'mqdefault.jpg');
                                                } else if (channelThumb && img.src !== channelThumb) {
                                                    img.src = channelThumb;
                                                } else if (video.video_id && !img.src.includes(video.video_id)) {
                                                    img.src = `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;
                                                } else {
                                                    img.style.display = 'none';
                                                }
                                            }}
                                        />
                                    ) : videoUrl ? (
                                        <video
                                            src={videoUrl + "#t=0.1"}
                                            className="w-full h-full object-cover"
                                            muted
                                            preload="metadata"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500 gap-1">
                                            <Play className="w-8 h-8 opacity-40" />
                                            <span className="text-[10px] font-bold">미디어 준비됨</span>
                                        </div>
                                    )}

                                    {/* 텍스트 가독성을 위한 상/하단 그라데이션 오버레이 */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/75 pointer-events-none" />
                                </div>

                                {/* 상단: 바이럴 등급 배지 & 원형 다중 선택 체크박스 */}
                                <div className="flex items-center justify-between w-full z-10 gap-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                        {getViralBadge(video.viral_score, video.velocity_score)}
                                        <span className="bg-black/60 backdrop-blur-xs text-white/90 text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10 truncate">
                                            {video.computedCategory}
                                        </span>
                                    </div>

                                    {/* 원형 체크박스 토글 */}
                                    <button
                                        onClick={(e) => toggleSelection(e, video.id)}
                                        className={cn(
                                            "w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-150 shadow-sm shrink-0",
                                            isSelected
                                                ? "bg-primary border-primary text-white scale-105"
                                                : "bg-black/40 border-white/60 hover:bg-black/70 hover:border-white text-transparent group-hover:text-white/60"
                                        )}
                                        title={isSelected ? "선택 해제" : "다중 작업에 추가"}
                                    >
                                        <CheckCircle2 className={cn("w-4 h-4", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
                                    </button>
                                </div>

                                {/* 중앙 호버 액션 툴바 */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-20 backdrop-blur-[2px] p-2">
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            size="icon" 
                                            variant="secondary" 
                                            className="rounded-full h-9 w-9 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm border-0 shadow-md ring-1 ring-white/30" 
                                            onClick={(e) => { e.stopPropagation(); setSelectedVideo(video); }} 
                                            title="상세 재생"
                                        >
                                            <Play className="w-4 h-4 fill-current ml-0.5" />
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="secondary" 
                                            className="rounded-full h-9 w-9 bg-indigo-600/80 hover:bg-indigo-600 text-white backdrop-blur-sm border-0 shadow-md ring-1 ring-indigo-400/40" 
                                            onClick={(e) => { e.stopPropagation(); handleSingleDdalkkak(video, 'subtitle'); }} 
                                            title="⚡ 딸깍 자막 생성"
                                        >
                                            <Zap className="w-4 h-4 text-amber-300" />
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="secondary" 
                                            className="rounded-full h-9 w-9 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm border-0 shadow-md ring-1 ring-white/30" 
                                            onClick={(e) => { e.stopPropagation(); setSubtitleVideo(video); }} 
                                            title="자막 뷰어"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="secondary" 
                                            className="rounded-full h-9 w-9 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm border-0 shadow-md ring-1 ring-white/30" 
                                            onClick={(e) => { e.stopPropagation(); setStatsVideo(video); }} 
                                            title="바이럴 추이 통계"
                                        >
                                            <LineChart className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            size="icon" 
                                            variant="secondary" 
                                            className="rounded-full h-8 w-8 bg-amber-500/30 hover:bg-amber-500/50 text-white backdrop-blur-sm border-0 shadow-md ring-1 ring-amber-400/30" 
                                            onClick={(e) => { e.stopPropagation(); hdDownloadMutation.mutate(video.id); }} 
                                            title="HD 재다운로드"
                                            disabled={hdDownloadMutation.isPending}
                                        >
                                            {hdDownloadMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="secondary" 
                                            className="rounded-full h-8 w-8 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm border-0 shadow-md ring-1 ring-white/30" 
                                            onClick={(e) => { e.stopPropagation(); openFolder(video.file_path); }} 
                                            title="로컬 폴더 열기"
                                        >
                                            <FolderOpen className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* 하단 메타데이터: 타이틀 & 채널 & 조회수 & 날짜 */}
                                <div className="space-y-1 z-10">
                                    <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug drop-shadow-xs" title={video.title}>
                                        {video.title}
                                    </h4>
                                    <div className="flex items-center justify-between text-[10px] text-white/80 font-medium pt-0.5">
                                        <span className="truncate max-w-[85px]">{channelName}</span>
                                        <span className="text-amber-300 font-bold">{formatCount(video.viewCountNum)} 조회</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[9px] text-white/60 pt-0.5 border-t border-white/10">
                                        <span>{uploadDateStr}</span>
                                        <span className="text-emerald-400 font-bold">⚡ 딸깍 준비됨</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="w-full py-16 text-center text-xs text-muted-foreground bg-card border border-border/80 rounded-2xl space-y-2">
                    <FolderOpen className="w-8 h-8 mx-auto text-muted-foreground/40" />
                    <p>선택하신 조건에 해당하는 수집 영상이 없습니다.</p>
                </div>
            )}

            {/* 4. 🎯 하단 플로팅 액션 바 (Pixeling Style Floating Action Bar) */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white backdrop-blur-md border border-slate-700/80 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 max-w-[95vw] overflow-x-auto">
                    <div className="flex items-center gap-2 border-r border-slate-700 pr-3 shrink-0">
                        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                            {selectedIds.size}
                        </span>
                        <span className="text-xs font-bold text-slate-200">개 선택됨</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button 
                            onClick={() => handleLaunchBatchDdalkkak('subtitle')}
                            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md h-auto"
                        >
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                            ⚡ 자막 일괄 생성 (딸깍)
                        </Button>
                        <Button 
                            onClick={() => handleLaunchBatchDdalkkak('ttsdub')}
                            className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all border border-slate-600 flex items-center gap-1.5 h-auto"
                        >
                            <Radio className="w-3.5 h-3.5 text-purple-400" />
                            🎙️ 대본 + 더빙 일괄 작업
                        </Button>
                        <Button 
                            variant="destructive"
                            onClick={handleDeleteSelected}
                            className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 h-auto"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            삭제 ({selectedIds.size})
                        </Button>
                    </div>

                    <button 
                        onClick={() => setSelectedIds(new Set())}
                        className="text-slate-400 hover:text-white p-1 rounded-lg ml-1 shrink-0"
                        title="선택 취소"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* 5. 📱 대형 9:16 쇼츠 상세 & 플레이어 팝업 모달 (Pixeling Original Modal Style) */}
            {selectedVideo && (
                <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
                    <DialogContent className="max-w-4xl w-[95vw] h-[85vh] max-h-[780px] p-0 bg-slate-950 border border-slate-800 text-white overflow-hidden rounded-2xl flex flex-col md:flex-row">
                        <DialogHeader className="sr-only">
                            <DialogTitle>{selectedVideo.title || '쇼츠 상세 정보'}</DialogTitle>
                            <DialogDescription>{selectedVideo.extracted_text || '선택한 숏폼 영상의 세부 정보 및 딸깍 제작 옵션'}</DialogDescription>
                        </DialogHeader>

                        {/* 좌측: 9:16 비디오 플레이어 영역 */}
                        <div className="w-full md:w-[48%] h-[45%] md:h-full bg-black relative flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-slate-800">
                            {(() => {
                                const localVideoUrl = getMediaUrl(selectedVideo.file_path, settings?.root_download_path);
                                const isYouTube = selectedVideo.url?.includes('youtube.com') || selectedVideo.url?.includes('youtu.be');
                                
                                if (localVideoUrl && !localVideoUrl.startsWith('http') && localVideoUrl.includes('/api/files/stream')) {
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
                                } else if (isYouTube && selectedVideo.url) {
                                    const ytId = new URL(selectedVideo.url).searchParams.get('v') || selectedVideo.url.split('/').pop();
                                    return (
                                        <iframe
                                            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0`}
                                            className="w-full h-full border-0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
                                            src={getVideoThumbnailUrl(selectedVideo, settings?.root_download_path)} 
                                            alt={selectedVideo.title} 
                                            className="w-full h-full object-cover opacity-60 filter blur-xs scale-105" 
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-6 text-center">
                                            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center mb-3 shadow-lg">
                                                <Play className="w-7 h-7 text-white fill-white ml-1" />
                                            </div>
                                            <p className="text-xs font-bold text-white/90">로컬 원본 비디오 스트리밍 준비됨</p>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* 상단 퀵 뱃지 */}
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20">
                                {getViralBadge(selectedVideo.viral_score, selectedVideo.velocity_score)}
                                <span className="bg-black/60 backdrop-blur-xs text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                                    {getVideoCategory(selectedVideo)}
                                </span>
                            </div>
                        </div>

                        {/* 우측: 상세 메타데이터 & 바이럴루프 원클릭 제작 액션 패널 */}
                        <div className="w-full md:w-[52%] h-[55%] md:h-full p-5 sm:p-6 overflow-y-auto flex flex-col justify-between space-y-4 bg-slate-900/90 text-slate-100">
                            <div className="space-y-4">
                                
                                {/* 타이틀 및 채널 */}
                                <div>
                                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                        <span>채널: <strong className="text-slate-200">{(selectedVideo.channel_id && channelMap[selectedVideo.channel_id]?.name) || (selectedVideo.metadata_json as any)?.uploader || '트렌딩 크리에이터'}</strong></span>
                                        <span>{selectedVideo.upload_date ? new Date(selectedVideo.upload_date).toLocaleDateString() : '최근'}</span>
                                    </div>
                                    <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                                        {selectedVideo.title}
                                    </h3>
                                </div>

                                {/* 메트릭 4분할 그리드 */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
                                        <p className="text-[10px] text-slate-400">조회수</p>
                                        <p className="text-xs font-extrabold text-white mt-0.5">{formatCount(selectedVideo.view_count || (selectedVideo.metadata_json as any)?.view_count)}</p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
                                        <p className="text-[10px] text-slate-400">바이럴 스코어</p>
                                        <p className="text-xs font-extrabold text-amber-400 mt-0.5">{selectedVideo.viral_score || 0}%</p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
                                        <p className="text-[10px] text-slate-400">영상 길이</p>
                                        <p className="text-xs font-extrabold text-white mt-0.5">{selectedVideo.duration ? `${selectedVideo.duration}초` : '30초'}</p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
                                        <p className="text-[10px] text-slate-400">수집 상태</p>
                                        <p className="text-xs font-extrabold text-emerald-400 mt-0.5">보관완료</p>
                                    </div>
                                </div>

                                {/* 설명 & 해시태그 박스 */}
                                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 text-xs text-slate-300 space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">영상 설명 및 추출 대본</p>
                                    <p className="leading-relaxed line-clamp-3 text-[11px] text-slate-200">
                                        {selectedVideo.extracted_text || (selectedVideo.metadata_json as any)?.description || '추출된 대본 또는 영상 설명이 없습니다.'}
                                    </p>
                                </div>

                                {/* 수집 기록 및 성과 분석 */}
                                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-900/50 text-xs space-y-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-indigo-300">
                                        <span>📊 AI 바이럴 점수 분석</span>
                                        <span className="text-emerald-400">상위 {Math.max(1, (100 - (selectedVideo.viral_score || 50) / 10)).toFixed(1)}%</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-normal">
                                        수집된 영상 자산입니다. 딸깍 자동 생성을 통해 자막 합성 및 더빙 버전으로 재가공하여 새로운 숏폼으로 제작할 수 있습니다.
                                    </p>
                                </div>

                            </div>

                            {/* 하단 바이럴루프 원클릭 제작 액션 버튼 바 */}
                            <div className="space-y-2 pt-2 border-t border-slate-800">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button 
                                        onClick={() => handleSingleDdalkkak(selectedVideo, 'subtitle')}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 rounded-xl shadow-md"
                                    >
                                        <Zap className="w-3.5 h-3.5 text-amber-300" /> ⚡ 딸깍 자막 자동 생성
                                    </Button>
                                    <Button 
                                        onClick={() => handleSingleDdalkkak(selectedVideo, 'ttsdub')}
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 rounded-xl shadow-md"
                                    >
                                        <Radio className="w-3.5 h-3.5 text-purple-200" /> 🎙️ 딸깍 대본+더빙
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => handleGoToScriptLab(selectedVideo)}
                                        className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 text-xs py-2 flex items-center justify-center gap-1.5 rounded-xl"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> 대본 추출 & AI 재창작
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => handleGoToSceneCutter(selectedVideo)}
                                        className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 text-xs py-2 flex items-center justify-center gap-1.5 rounded-xl"
                                    >
                                        <Scissors className="w-3.5 h-3.5 text-amber-400" /> ✂️ 씬 커터로 컷팅
                                    </Button>
                                </div>
                            </div>

                        </div>

                    </DialogContent>
                </Dialog>
            )}

            {/* 6. Subtitle Viewer Modal */}
            <SubtitleViewer
                open={!!subtitleVideo}
                onOpenChange={(open) => !open && setSubtitleVideo(null)}
                videoId={subtitleVideo?.id || null}
                title={subtitleVideo?.title || ''}
                description={(subtitleVideo as any)?.description}
            />

            {/* 7. 바이럴 추이 그래프 모달 */}
            <Dialog open={!!statsVideo} onOpenChange={(open) => !open && setStatsVideo(null)}>
                <DialogContent className="max-w-2xl bg-slate-900 border border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-indigo-400" /> 바이럴 변화 추이 분석
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-400">{statsVideo?.title}</DialogDescription>
                    </DialogHeader>
                    <div className="h-[300px] w-full mt-4">
                        {videoHistory && videoHistory.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsLineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis
                                        dataKey="timestamp"
                                        tickFormatter={(time) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        stroke="#94a3b8"
                                        fontSize={11}
                                    />
                                    <YAxis yAxisId="left" stroke="#818cf8" fontSize={11} tickFormatter={(val) => formatCount(val)} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#fbbf24" fontSize={11} tickFormatter={(val) => formatCount(val) + '/h'} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff' }}
                                        labelFormatter={(label) => new Date(label).toLocaleString()}
                                    />
                                    <Line yAxisId="left" type="monotone" dataKey="view_count" name="누적 조회수" stroke="#818cf8" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    <Line yAxisId="right" type="monotone" dataKey="velocity" name="시간당 조회수 (Vel)" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                                </RechartsLineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                                <TrendingUp className="w-8 h-8 mr-2 opacity-50 text-indigo-400" />
                                수집된 시간대별 통계 데이터가 충분하지 않습니다.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default Gallery;
