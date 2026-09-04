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

import api, { Video, Channel, Category, updateVideoReviewStatus, batchUpdateVideoReviewStatus } from '../lib/api';

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

import { LayoutGrid, Search, TrendingUp, PlaySquare, FileText, Copy, Languages, ChevronUp, ChevronDown, MonitorPlay, Film, Smartphone, Trash2, Flame, Zap, Sparkles, Play, ExternalLink, Video as VideoIcon, Check, Radio, Scissors, Loader2, Layers, ChevronRight, CheckSquare, SlidersHorizontal, Clock, Wand2, ListOrdered, X } from "lucide-react";



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




// -- Helper: 3초 바이럴 훅 추출 (대본의 첫 1~2문장 강조) --
const extractHookSentence = (text: string): { hook: string; remainder: string } => {
    const cleaned = cleanSrtToText(text);
    if (!cleaned) return { hook: '', remainder: '' };
    
    // 문장 부호(., ?, !) 기준으로 첫 문장 분리
    const match = cleaned.match(/^([^.!?\n]+[.!?]?)/);
    if (match && match[1] && match[1].length < 80) {
        const hook = match[1].trim();
        const remainder = cleaned.slice(match[0].length).trim();
        return { hook, remainder };
    }
    if (cleaned.length > 50) {
        return {
            hook: cleaned.slice(0, 48) + '...',
            remainder: cleaned.slice(48)
        };
    }
    return { hook: cleaned, remainder: '' };
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

    // [Smart Blended Viral Grade]: Velocity(시간당 유입) + Viral Score 복합 평가
    let grade: 'S' | 'A' | 'B' | 'C' = 'C';
    if (score >= 100 || vel >= 1000) grade = 'S';
    else if (score >= 30 || vel >= 300) grade = 'A';
    else if (score >= 10 || vel >= 100) grade = 'B';

    if (grade === 'S') {
        badges.push(
            <Badge key="viral-s" className="bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 text-white gap-1 text-[10.5px] h-6 px-2 animate-pulse shadow-sm border-0 ring-1 ring-white/20 whitespace-nowrap">
                <Flame className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" />
                <span className="font-extrabold">S급 떡상</span>
            </Badge>
        );
    } else if (grade === 'A') {
        badges.push(
            <Badge key="viral-a" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-white gap-1 text-[10.5px] h-6 px-2 shadow-xs border-amber-400/40 whitespace-nowrap">
                <Zap className="w-3.5 h-3.5 fill-amber-200 text-amber-200" />
                <span className="font-extrabold">A급 급상승</span>
            </Badge>
        );
    } else if (grade === 'B') {
        badges.push(
            <Badge key="viral-b" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white gap-1 text-[10.5px] h-6 px-2 border-emerald-400/40 shadow-xs whitespace-nowrap">
                <TrendingUp className="w-3 h-3" />
                <span className="font-bold">B급 우수</span>
            </Badge>
        );
    } else {
        badges.push(
            <Badge key="viral-c" variant="outline" className="text-muted-foreground gap-1 text-[10px] h-6 px-2 bg-muted/30 border-border/60 whitespace-nowrap">
                <span className="font-medium">C급</span> {score.toFixed(1)}%
            </Badge>
        );
    }

    if (vel > 0) {
        badges.push(
            <Badge key="velocity" variant="secondary" className="text-[10px] h-5 px-1.5 font-mono text-muted-foreground bg-muted/50 border-0 whitespace-nowrap">
                {formatVelocity(vel)}
            </Badge>
        );
    }

    return <div className="flex flex-col gap-1 items-start">{badges}</div>;
};




// -- Main Component --


export const REVIEW_STATUSES = [
    { id: 'ALL', label: '전체', icon: '📋', color: 'bg-muted text-muted-foreground' },
    { id: 'COLLECTED', label: '신규수집', icon: '📥', color: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
    { id: 'REVIEWED', label: '검수완료', icon: '🧐', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
    { id: 'SHORTS_ADAPTED', label: '숏폼각색', icon: '⚡', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
    { id: 'LONGFORM_CREATED', label: '롱폼창작', icon: '🎬', color: 'bg-purple-500/15 text-purple-500 border-purple-500/30' },
    { id: 'ARCHIVED', label: '보관', icon: '📦', color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
] as const;

const ScriptLab = () => {

    const navigate = useNavigate();

    const queryClient = useQueryClient();

    const [sorting, setSorting] = useState<SortingState>([{ id: 'grade', desc: true }]);

    const [globalFilter, setGlobalFilter] = useState('');

    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [selectedPresetId, setSelectedPresetId] = useState<string>('ALL');
    const [scriptLengthFilter, setScriptLengthFilter] = useState<'ALL' | 'ultra_short' | 'short' | 'long'>('ALL');
    const [timeRange, setTimeRange] = useState<'ALL' | '1d' | '3d' | '7d'>('ALL');
    const [sortOption, setSortOption] = useState<'viral' | 'latest' | 'views'>('viral');
    const [debouncedFilter, setDebouncedFilter] = useState('');
    const [reviewStatusFilter, setReviewStatusFilter] = useState<string>('ALL');
    const [viewMode, setViewMode] = useState<'grid' | 'grouped'>('grid');
    const [groupBy, setGroupBy] = useState<'preset' | 'category' | 'status'>('preset');
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

    // 수집 프리셋 목록 쿼리
    const { data: presets = [] } = useQuery<any[]>({
        queryKey: ['collection-presets'],
        queryFn: async () => {
            try {
                return (await api.get('/presets/')).data;
            } catch (e) {
                return [];
            }
        },
    });

// 상단 정렬 옵션과 react-table 내부 sorting 동기화
    useEffect(() => {
        if (sortOption === 'viral') {
            setSorting([{ id: 'grade', desc: true }]);
        } else if (sortOption === 'latest') {
            setSorting([{ id: 'upload_date', desc: true }]);
        } else if (sortOption === 'views') {
            setSorting([{ id: 'velocity_score', desc: true }]);
        }
    }, [sortOption]);

        // 200ms 디바운스 실시간 검색
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedFilter(globalFilter), 200);
        return () => clearTimeout(timer);
    }, [globalFilter]);

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




    // 라이프사이클 상태 단일/일괄 변경 핸들러
    const handleUpdateReviewStatus = async (videoId: number, newStatus: string) => {
        try {
            await updateVideoReviewStatus(videoId, newStatus);
            queryClient.invalidateQueries({ queryKey: ['videos'] });
            toast.success(`상태가 변경되었습니다: ${newStatus}`);
        } catch (err) {
            toast.error('상태 변경 실패');
        }
    };

    const handleBatchReviewStatus = async (targetIds: number[], newStatus: string) => {
        if (!targetIds.length) return;
        try {
            await batchUpdateVideoReviewStatus(targetIds, newStatus);
            queryClient.invalidateQueries({ queryKey: ['videos'] });
            setSelectedIds(new Set());
            toast.success(`${targetIds.length}개 항목의 상태가 변경되었습니다.`);
        } catch (err) {
            toast.error('일괄 상태 변경 실패');
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




    const reviewStatusStats = useMemo(() => {
        const stats: Record<string, number> = { ALL: videos.length };
        videos.forEach(v => {
            const st = v.review_status || 'COLLECTED';
            stats[st] = (stats[st] || 0) + 1;
        });
        return stats;
    }, [videos]);

    // 2단계 계층형 카테고리 정보 조회 헬퍼
    const getVideoCategoryInfo = (v: Video): { name: string; fullName: string; parentName?: string } => {
        const ch = channelMap[v.channel_id];
        if (ch?.category_id && categoryMap[ch.category_id]) {
            const cat = categoryMap[ch.category_id];
            const parent = cat.parent_id && categoryMap[cat.parent_id] ? categoryMap[cat.parent_id] : null;
            const fullName = parent ? `${parent.name} > ${cat.name}` : cat.name;
            return {
                name: cat.name,
                fullName,
                parentName: parent?.name
            };
        }
        return { name: ch?.folder_name || '미분류', fullName: ch?.folder_name || '미분류' };
    };

    // 상위 대분류 중심 카테고리 통계 (하위 중분류 포함 상속 카운트)
    const categoryStats = useMemo(() => {
        const stats: Record<string, number> = {};
        videos.forEach(v => {
            const info = getVideoCategoryInfo(v);
            const mainCat = info.parentName || info.name;
            stats[mainCat] = (stats[mainCat] || 0) + 1;
            if (info.parentName && info.name !== mainCat) {
                stats[info.name] = (stats[info.name] || 0) + 1;
            }
        });
        return stats;
    }, [videos, channelMap, categoryMap]);



    // Filter & Sort Videos

    const filteredVideos = useMemo(() => {
        return videos.filter(v => {
            // 0. 라이프사이클 상태 필터
            if (reviewStatusFilter !== 'ALL') {
                const vStatus = v.review_status || 'COLLECTED';
                if (vStatus !== reviewStatusFilter) return false;
            }

            // 1. 수집 프리셋 필터
            if (selectedPresetId !== 'ALL' && (v as any).preset_id !== selectedPresetId) return false;

            // 2. 카테고리 상속 필터 (상위 대분류 선택 시 하위 중분류 소속 대본도 자동 포함)
            if (selectedCategory !== 'ALL') {
                const catInfo = getVideoCategoryInfo(v);
                const isMatch = catInfo.name === selectedCategory ||
                                catInfo.parentName === selectedCategory ||
                                catInfo.fullName === selectedCategory;
                if (!isMatch) return false;
            }

            // 3. 대본 길이 필터 (초단축 <15s / 숏폼 15~60s / 롱폼 >60s)
            const duration = v.duration ?? ((v.metadata_json as any)?.duration ?? 0);
            if (scriptLengthFilter === 'ultra_short') {
                if (duration > 15 && duration !== 0) return false;
            } else if (scriptLengthFilter === 'short') {
                if (duration > 60 || (duration > 0 && duration <= 15)) return false;
            } else if (scriptLengthFilter === 'long') {
                if (duration <= 60 && duration !== 0) return false;
            }

            // 4. 수집 기간 필터
            if (timeRange !== 'ALL') {
                const videoDate = new Date(v.upload_date || v.downloaded_at);
                const now = new Date();
                const diffDays = (now.getTime() - videoDate.getTime()) / (1000 * 3600 * 24);
                if (timeRange === '1d' && diffDays > 1) return false;
                if (timeRange === '3d' && diffDays > 3) return false;
                if (timeRange === '7d' && diffDays > 7) return false;
            }

            // 5. 풀텍스트 실시간 검색 (제목 + 채널명 + 대본 전문 v.content / extracted_text)
            if (debouncedFilter.trim()) {
                const q = debouncedFilter.toLowerCase().trim();
                const title = (v.title || '').toLowerCase();
                const chName = (channelMap[v.channel_id]?.name || '').toLowerCase();
                const scriptText = (v.content || (v as any).extracted_text || '').toLowerCase();
                if (!title.includes(q) && !chName.includes(q) && !scriptText.includes(q)) return false;
            }

            return true;
        }).sort((a, b) => {
            if (sortOption === 'viral') {
                const scoreA = (a.viral_score || 0) + (a.velocity_score || 0) * 0.1;
                const scoreB = (b.viral_score || 0) + (b.velocity_score || 0) * 0.1;
                return scoreB - scoreA;
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
    }, [videos, reviewStatusFilter, selectedPresetId, selectedCategory, scriptLengthFilter, timeRange, sortOption, debouncedFilter, channelMap, categoryMap]);




    // 스마트 그룹핑 데이터 연산
    const groupedVideos = useMemo(() => {
        const groups: Record<string, { key: string; title: string; videos: Video[]; sCount: number; aCount: number }> = {};
        
        filteredVideos.forEach((video) => {
            let key = 'default';
            let title = '기본 그룹';

            if (groupBy === 'preset') {
                key = (video as any).preset_id ? String((video as any).preset_id) : 'unassigned';
                const preset = presets?.find((p: any) => String(p.id) === key);
                title = preset ? ("🏷️ 프리셋: " + preset.name) : "📂 미지정 프리셋 수집 대본";
            } else if (groupBy === 'category') {
                const catInfo = getVideoCategoryInfo(video);
                key = catInfo.fullName;
                title = "📁 폴더: " + catInfo.fullName;
            } else if (groupBy === 'status') {
                const st = video.review_status || 'COLLECTED';
                key = st;
                const match = REVIEW_STATUSES.find(s => s.id === st);
                title = (match ? match.icon + " " + match.label : st) + " 단계";
            }

            if (!groups[key]) {
                groups[key] = { key, title, videos: [], sCount: 0, aCount: 0 };
            }
            groups[key].videos.push(video);
            const viral = video.viral_score || 0;
            if (viral >= 80) groups[key].sCount++;
            else if (viral >= 60) groups[key].aCount++;
        });

        return Object.values(groups).sort((a, b) => b.videos.length - a.videos.length);
    }, [filteredVideos, groupBy, presets, channelMap, categoryMap]);

    // 단일 통합 표준 대본 테이블 렌더러 (평면 테이블 & 스마트 그룹핑 100% 디자인/정렬/컬럼 일치)
    const renderScriptTable = (videoList: Video[], showHeaderSelect = false) => {
        const isAllSelected = videoList.length > 0 && videoList.every(v => selectedIds.has(v.id));

        return (
            <div className="overflow-x-auto w-full">
                <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs z-10 border-b border-border/50 text-muted-foreground text-[11px] shadow-2xs">
                        <tr>
                            <th className="p-2.5 w-10 text-center">
                                {showHeaderSelect ? (
                                    <Checkbox
                                        checked={isAllSelected}
                                        onCheckedChange={() => {
                                            const next = new Set(selectedIds);
                                            if (isAllSelected) {
                                                videoList.forEach(v => next.delete(v.id));
                                            } else {
                                                videoList.forEach(v => next.add(v.id));
                                            }
                                            setSelectedIds(next);
                                        }}
                                        title={isAllSelected ? "전체 선택 해제" : "전체 선택"}
                                    />
                                ) : (
                                    <span className="font-semibold">선택</span>
                                )}
                            </th>
                            <th className="p-2.5 w-24 text-center font-semibold">성과등급</th>
                            <th className="p-2.5 w-28 text-center font-semibold">검수 상태</th>
                            <th className="p-2.5 text-left min-w-[240px] font-semibold">제목 및 대본 내용</th>
                            <th className="p-2.5 w-24 text-right pr-3 font-semibold">조회수 / 속도</th>
                            <th className="p-2.5 w-16 text-center font-semibold">대본길이</th>
                            <th className="p-2.5 w-28 text-center font-semibold">출처 (채널/폴더)</th>
                            <th className="p-2.5 w-20 text-center font-semibold">업로드</th>
                            <th className="p-2.5 w-44 text-right pr-4 font-semibold">제작 연계</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {videoList.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="p-8 text-center text-muted-foreground text-xs">
                                    조건에 일치하는 대본이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            videoList.map((v) => {
                                const isSelected = selectedIds.has(v.id);
                                const raw = v.content || (v as any).extracted_text || '';
                                const cleanText = cleanSrtToText(raw);
                                const thumbUrl = getVideoThumbnailUrl(v);
                                const currentStatus = v.review_status || 'COLLECTED';
                                const views = v.view_count ?? (v as any).metadata_json?.view_count ?? 0;
                                const vel = v.velocity_score ?? 0;
                                const isHighVel = vel >= 1000;
                                const ch = channelMap[v.channel_id];
                                const catInfo = getVideoCategoryInfo(v);
                                const catName = catInfo.fullName;
                                const uploadDateStr = v.upload_date
                                    ? new Date(v.upload_date).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })
                                    : '-';

                                return (
                                    <tr
                                        key={v.id}
                                        onClick={() => setSubtitleVideo(v)}
                                        className={cn(
                                            "hover:bg-muted/40 cursor-pointer transition-colors h-14",
                                            isSelected && "bg-primary/5"
                                        )}
                                    >
                                        {/* 1. 선택 */}
                                        <td className="p-2.5 text-center" onClick={e => e.stopPropagation()}>
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleSelection(v.id)}
                                            />
                                        </td>

                                        {/* 2. 성과등급 */}
                                        <td className="p-2.5 text-center" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-center">
                                                {getViralBadge(v.viral_score, v.velocity_score)}
                                            </div>
                                        </td>

                                        {/* 3. 검수 상태 */}
                                        <td className="p-2.5 text-center" onClick={e => e.stopPropagation()}>
                                            <select
                                                value={currentStatus}
                                                onChange={(e) => handleUpdateReviewStatus(v.id, e.target.value)}
                                                className={cn(
                                                    "text-[10.5px] font-bold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs",
                                                    (currentStatus === 'REVIEWED' && "bg-emerald-500/15 text-emerald-500 border-emerald-500/30") ||
                                                    (currentStatus === 'SHORTS_ADAPTED' && "bg-amber-500/15 text-amber-500 border-amber-500/30") ||
                                                    (currentStatus === 'LONGFORM_CREATED' && "bg-purple-500/15 text-purple-500 border-purple-500/30") ||
                                                    (currentStatus === 'ARCHIVED' && "bg-zinc-500/15 text-zinc-400 border-zinc-500/30") ||
                                                    "bg-blue-500/15 text-blue-500 border-blue-500/30"
                                                )}
                                            >
                                                <option value="COLLECTED">📥 신규수집</option>
                                                <option value="REVIEWED">🧐 검수완료</option>
                                                <option value="SHORTS_ADAPTED">⚡ 숏폼각색</option>
                                                <option value="LONGFORM_CREATED">🎬 롱폼창작</option>
                                                <option value="ARCHIVED">📦 보관</option>
                                            </select>
                                        </td>

                                        {/* 4. 제목 및 대본 내용 요약 */}
                                        <td className="p-2.5">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                {thumbUrl ? (
                                                    <img src={thumbUrl} alt="" className="w-11 h-7.5 object-cover rounded shrink-0 border border-border/40 shadow-2xs" />
                                                ) : (
                                                    <div className="w-11 h-7.5 rounded bg-muted flex items-center justify-center shrink-0 border border-border/40">
                                                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold text-foreground truncate max-w-sm sm:max-w-md text-xs hover:text-primary transition-colors">
                                                        {v.title}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                                        {cleanText ? cleanText.slice(0, 100) : '(대본 본문 없음)'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* 5. 조회수 및 유입속도 */}
                                        <td className="p-2.5 text-right pr-3" onClick={e => e.stopPropagation()}>
                                            <div className="flex flex-col items-end gap-0.5">
                                                <span className="font-mono font-extrabold text-foreground text-xs">
                                                    {formatCount(views)}
                                                </span>
                                                {vel > 0 ? (
                                                    <button
                                                        className={cn(
                                                            "flex items-center gap-0.5 font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded transition-all",
                                                            isHighVel
                                                                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20"
                                                                : "bg-muted text-muted-foreground hover:text-foreground"
                                                        )}
                                                        onClick={() => setStatsVideo(v)}
                                                        title="클릭하여 바이럴 유입 추이 차트 보기"
                                                    >
                                                        <TrendingUp className="w-3 h-3" />
                                                        {formatVelocity(vel)}
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground/60 font-mono">-</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* 6. 대본길이 */}
                                        <td className="p-2.5 text-center text-muted-foreground text-[11px] font-mono">
                                            {v.duration ? `${Math.floor(v.duration / 60)}:${String(v.duration % 60).padStart(2, '0')}` : '-'}
                                        </td>

                                        {/* 7. 출처 (채널명 / 폴더) */}
                                        <td className="p-2.5 text-center">
                                            <div className="flex flex-col items-center gap-0.5 max-w-[120px] mx-auto">
                                                <span className="font-semibold text-foreground truncate max-w-full text-xs" title={ch?.name || '-'}>
                                                    {ch?.name || '-'}
                                                </span>
                                                <Badge variant="outline" className="text-[9.5px] px-1.5 py-0 h-4 font-normal text-muted-foreground bg-muted/30 truncate max-w-full">
                                                    {catName}
                                                </Badge>
                                            </div>
                                        </td>

                                        {/* 8. 업로드 날짜 */}
                                        <td className="p-2.5 text-center text-muted-foreground text-[11px] font-mono whitespace-nowrap">
                                            {uploadDateStr}
                                        </td>

                                        {/* 9. 제작 연계 버튼 툴바 */}
                                        <td className="p-2.5 text-right pr-4" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1.5">
                                                {/* 숏폼 각색 */}
                                                <Button
                                                    size="sm"
                                                    className="h-6.5 px-2 text-[10px] gap-1 !bg-amber-500 hover:!bg-amber-600 !text-white font-bold rounded-lg shadow-2xs transition-transform active:scale-95"
                                                    onClick={() => {
                                                        navigate('/script-writer', {
                                                            state: {
                                                                initialScript: cleanText || v.title,
                                                                sourceVideoId: v.id,
                                                                sourceTitle: v.title,
                                                                track: 'shorts'
                                                            }
                                                        });
                                                    }}
                                                    title="⚡ 숏폼 3단 훅 각색"
                                                >
                                                    <Zap className="w-2.5 h-2.5 fill-current" />
                                                    <span>숏폼</span>
                                                </Button>

                                                {/* 롱폼 창작 */}
                                                <Button
                                                    size="sm"
                                                    className="h-6.5 px-2 text-[10px] gap-1 !bg-indigo-600 hover:!bg-indigo-700 !text-white font-bold rounded-lg shadow-2xs transition-transform active:scale-95"
                                                    onClick={() => {
                                                        navigate('/creative-studio', {
                                                            state: {
                                                                script: cleanText || v.title,
                                                                title: v.title,
                                                                sourceVideoId: v.id,
                                                                creationMode: 'longform'
                                                            }
                                                        });
                                                    }}
                                                    title="🎬 씬 분할 롱폼 AI 창작"
                                                >
                                                    <Sparkles className="w-2.5 h-2.5" />
                                                    <span>롱폼</span>
                                                </Button>

                                                {/* 대본 전문 모달 */}
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-6.5 w-6.5 text-muted-foreground hover:text-foreground border-border/70"
                                                    onClick={() => setSubtitleVideo(v)}
                                                    title="대본 전문 열람"
                                                >
                                                    <FileText className="w-3 h-3" />
                                                </Button>

                                                {/* 영상 원본 재생 */}
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-6.5 w-6.5 text-muted-foreground hover:text-red-500 border-border/70"
                                                    onClick={() => setPlayerVideo(v)}
                                                    title="영상 원본 재생"
                                                >
                                                    <Play className="w-3 h-3 fill-current ml-0.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        );
    };



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

            size: 32,

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

                        {getViralBadge(score, vel)}

                    </div>

                );

            },

            size: 80,

        }),

        // 2-2. 라이프사이클 관리 상태 (원클릭 전환 셀렉터)
        columnHelper.accessor('review_status', {
            id: 'review_status',
            header: '검수/제작 상태',
            size: 95,
            cell: info => {
                const v = info.row.original;
                const currentStatus = v.review_status || 'COLLECTED';

                return (
                    <div className="flex items-center justify-center py-1" onClick={e => e.stopPropagation()}>
                        <select
                            value={currentStatus}
                            onChange={(e) => handleUpdateReviewStatus(v.id, e.target.value)}
                            className={cn(
                                "text-[10.5px] font-bold px-1.5 py-0.5 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary transition-all",
                                (currentStatus === 'REVIEWED' && "bg-emerald-500/15 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/25") ||
                                (currentStatus === 'SHORTS_ADAPTED' && "bg-amber-500/15 text-amber-500 border-amber-500/30 hover:bg-amber-500/25") ||
                                (currentStatus === 'LONGFORM_CREATED' && "bg-purple-500/15 text-purple-500 border-purple-500/30 hover:bg-purple-500/25") ||
                                (currentStatus === 'ARCHIVED' && "bg-zinc-500/15 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/25") ||
                                "bg-blue-500/15 text-blue-500 border-blue-500/30 hover:bg-blue-500/25"
                            )}
                        >
                            <option value="COLLECTED">📥 신규수집</option>
                            <option value="REVIEWED">🧐 검수완료</option>
                            <option value="SHORTS_ADAPTED">⚡ 숏폼각색</option>
                            <option value="LONGFORM_CREATED">🎬 롱폼창작</option>
                            <option value="ARCHIVED">📦 보관</option>
                        </select>
                    </div>
                );
            }
        }),

        // 3. Title & Script Hook Summary (16:9 Video Thumbnail & 3-sec Viral Hook Emphasis)
        columnHelper.accessor('title', {
            header: '제목 및 3초 바이럴 훅 (Hook)',
            cell: info => {
                const v = info.row.original;
                const rawContent = v.content || (v as any).extracted_text || "";
                const { hook, remainder } = extractHookSentence(rawContent);
                const thumbUrl = getVideoThumbnailUrl(v);
                const ytUrl = getYoutubeWatchUrl(v);
                const presetName = (v as any).preset_id ? (presets?.find((p: any) => p.id === (v as any).preset_id)?.name || null) : null;
                const durationSec = v.duration || (v.metadata_json as any)?.duration || 0;
                const durationStr = durationSec > 0 
                    ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}` 
                    : null;

                return (
                    <div className="flex items-start gap-3 w-full max-w-2xl py-1">
                        {/* 16:9 표준 비디오 썸네일 & 재생 인디케이터 */}
                        <div 
                            className="relative w-20 h-12 sm:w-24 sm:h-14 rounded-lg overflow-hidden bg-slate-900 border border-border/80 shrink-0 cursor-pointer group/thumb shadow-sm mt-0.5"
                            onClick={(e) => {
                                e.stopPropagation();
                                setPlayerVideo(v);
                            }}
                            title="영상 및 대본 통합 플레이어 열기"
                        >
                            {thumbUrl ? (
                                <img 
                                    src={thumbUrl} 
                                    alt={v.title} 
                                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-200" 
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                                    <VideoIcon className="w-5 h-5 opacity-50" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 group-hover/thumb:bg-black/20 flex items-center justify-center transition-colors">
                                <div className="w-6 h-6 rounded-full bg-white/30 backdrop-blur-xs flex items-center justify-center group-hover/thumb:scale-110 transition-transform">
                                    <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                                </div>
                            </div>
                            {/* 재생 시간 뱃지 오버레이 */}
                            {durationStr && (
                                <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-black/80 text-white backdrop-blur-xs border border-white/10">
                                    {durationStr}
                                </span>
                            )}
                        </div>

                        {/* 제목 및 3초 훅 하이라이트 박스 */}
                        <div className="flex flex-col flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {presetName && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                                        🏷️ {presetName}
                                    </span>
                                )}
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

                            {/* 3초 바이럴 훅 & 대본 미리보기 (가독성 높은 콤팩트 라인) */}
                            <div 
                                className="px-2 py-1 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 transition-all cursor-pointer text-xs group/hook flex items-center gap-1.5 min-w-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPlayerVideo(v);
                                }}
                                title="클릭하여 영상 재생 및 대본 전문 열람"
                            >
                                {hook ? (
                                    <>
                                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 shrink-0 flex items-center gap-0.5">
                                            🔥 훅:
                                        </span>
                                        <span className="text-[11px] text-muted-foreground truncate font-medium flex-1">
                                            "{hook}" {remainder ? `— ${remainder}` : ''}
                                        </span>
                                        <span className="text-[9.5px] font-medium text-muted-foreground group-hover/hook:text-primary transition-colors shrink-0 ml-1">
                                            전문보기 →
                                        </span>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-between w-full text-[10.5px] text-muted-foreground">
                                        <span className="flex items-center gap-1 text-slate-400">
                                            <FileText className="w-3 h-3 opacity-50" />
                                            <span>대본 미추출</span>
                                        </span>
                                        <span className="text-[9.5px] text-primary/80 font-medium">자막 생성 →</span>
                                    </div>
                                )}
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

            size: 90,

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

            size: 105,

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

            size: 70,

        }),

        // 7. Actions: 듀얼 트랙 창작 연계 (가로 1열 콤팩트 인라인 툴바)
        {
            id: 'actions',
            header: '창작 연계',
            size: 165,
            cell: ({ row }: any) => {
                const v = row.original;
                return (
                    <div className="flex items-center gap-1.5 justify-end py-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {/* Track A: 숏폼 50초 각색 */}
                        <Button
                            size="sm"
                            className="h-7 px-2.5 text-[10.5px] gap-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold shadow-xs transition-transform active:scale-95"
                            onClick={() => {
                                const cleanText = cleanSrtToText(v.content || (v as any).extracted_text || v.title);
                                navigate('/script-writer', { 
                                    state: { 
                                        initialScript: cleanText, 
                                        sourceVideoId: v.id, 
                                        sourceTitle: v.title,
                                        track: 'shorts' 
                                    } 
                                });
                            }}
                            title="⚡ 50초 3단 훅 압축 각색 & 숏폼 양산"
                        >
                            <Zap className="w-3 h-3 fill-current" />
                            <span>숏폼</span>
                        </Button>

                        {/* Track B: 롱폼 AI 창작 */}
                        <Button
                            size="sm"
                            className="h-7 px-2.5 text-[10.5px] gap-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold shadow-xs transition-transform active:scale-95"
                            onClick={() => {
                                const cleanText = cleanSrtToText(v.content || (v as any).extracted_text || v.title);
                                navigate('/creative-studio', { 
                                    state: { 
                                        script: cleanText, 
                                        title: v.title, 
                                        sourceVideoId: v.id, 
                                        creationMode: 'longform' 
                                    } 
                                });
                            }}
                            title="🎬 씬 분할 롱폼 AI 창작"
                        >
                            <Sparkles className="w-3 h-3" />
                            <span>롱폼</span>
                        </Button>

                        {/* 대본 전문 뷰어 열기 */}
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-indigo-400 hover:bg-muted/80 border-border/70"
                            onClick={() => setSubtitleVideo(v)}
                            title="대본 전문 뷰어 열기"
                        >
                            <FileText className="w-3.5 h-3.5" />
                        </Button>

                        {/* 영상 플레이어 열기 */}
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-muted/80 border-border/70"
                            onClick={() => setPlayerVideo(v)}
                            title="영상 및 대본 통합 플레이어 열기"
                        >
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </Button>
                    </div>
                );
            },
            size: 260,
            enableSorting: false,
        }


    ], [channelMap, categoryMap, presets]);









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



            {/* 2. 🏷️ 다차원 스마트 필터 바 (프리셋 + 대본길이 + 기간 + 정렬 + 풀텍스트 검색) */}
            <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-card border border-border/80 shadow-2xs">

                {/* 상단 0단: 라이프사이클 관리 상태 탭 바 & 뷰 모드 토글 (평면 vs 스마트그룹핑) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/40 select-none">
                    {/* 라이프사이클 5대 상태 탭 */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        <span className="text-[10.5px] font-bold text-muted-foreground px-1 shrink-0">🔄 상태:</span>
                        {REVIEW_STATUSES.map((st) => {
                            const isSelected = reviewStatusFilter === st.id;
                            const count = reviewStatusStats[st.id] ?? 0;
                            return (
                                <button
                                    key={st.id}
                                    onClick={() => setReviewStatusFilter(st.id)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 active:scale-95",
                                        isSelected
                                            ? "bg-primary text-white shadow-xs"
                                            : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
                                    )}
                                >
                                    <span>{st.icon} {st.label}</span>
                                    <span className={cn(
                                        "px-1.5 py-0.2 rounded-full text-[10px]",
                                        isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                                    )}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* 뷰 모드 토글 (평면 테이블 vs 스마트 그룹핑) */}
                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                        <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/50">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                                    viewMode === 'grid'
                                        ? "bg-background text-foreground shadow-2xs border border-border/60"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span>평면 테이블</span>
                            </button>
                            <button
                                onClick={() => setViewMode('grouped')}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                                    viewMode === 'grouped'
                                        ? "bg-background text-foreground shadow-2xs border border-border/60"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                <span>스마트 그룹핑</span>
                            </button>
                        </div>

                        {/* 그룹핑 기준 셀렉터 */}
                        {viewMode === 'grouped' && (
                            <div className="flex items-center gap-1 bg-muted/60 px-2 py-1 rounded-xl border border-border/50 animate-in fade-in">
                                <span className="text-[10.5px] font-bold text-muted-foreground">기준:</span>
                                <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value as any)}
                                    className="bg-background text-foreground text-xs font-semibold px-2 py-0.5 rounded-lg border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                                >
                                    <option value="preset">🏷️ 프리셋별</option>
                                    <option value="category">📁 폴더별</option>
                                    <option value="status">🔄 라이프사이클 상태별</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* 상단 1단: 수집 프리셋 셀렉터 & 카테고리(폴더) 탭 */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 select-none">
                        {/* 수집 프리셋 셀렉터 */}
                        {presets && presets.length > 0 && (
                            <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-xl border border-border/60 shrink-0">
                                <span className="text-[10.5px] font-bold text-muted-foreground flex items-center gap-1">
                                    🏷️ 프리셋:
                                </span>
                                <select
                                    value={selectedPresetId}
                                    onChange={(e) => setSelectedPresetId(e.target.value)}
                                    className="bg-background text-foreground text-xs font-semibold px-2 py-0.5 rounded-lg border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                                >
                                    <option value="ALL">전체 프리셋 ({videos.length})</option>
                                    {presets.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="h-4 w-px bg-border/60 mx-1 shrink-0" />

                        {/* 카테고리(폴더) 탭 */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10.5px] font-bold text-muted-foreground px-1 shrink-0">📁 폴더:</span>
                            <button
                                onClick={() => setSelectedCategory('ALL')}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 active:scale-95",
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
                                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 active:scale-95",
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
                    </div>
                </div>

                {/* 하단 2단: 대본 길이 필터 + 기간 + 정렬 + 대본 전문 실시간 검색창 */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* 대본 길이 필터 */}
                        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/50">
                            <span className="text-[10px] font-bold text-muted-foreground px-1.5">⏱️ 대본길이:</span>
                            {[
                                { id: 'ALL', label: '전체' },
                                { id: 'ultra_short', label: '⚡ 초단축 (<15초)' },
                                { id: 'short', label: '📱 표준 숏폼 (15~60초)' },
                                { id: 'long', label: '📺 롱폼 (>60초)' },
                            ].map((len) => (
                                <button
                                    key={len.id}
                                    onClick={() => setScriptLengthFilter(len.id as any)}
                                    className={cn(
                                        "px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all",
                                        scriptLengthFilter === len.id
                                            ? "bg-background text-foreground shadow-2xs border border-border/60"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {len.label}
                                </button>
                            ))}
                        </div>

                        {/* 수집 기간 필터 */}
                        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/50">
                            <span className="text-[10px] font-bold text-muted-foreground px-1.5">📅 기간:</span>
                            {(['ALL', '1d', '3d', '7d'] as const).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setTimeRange(r)}
                                    className={cn(
                                        "px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all",
                                        timeRange === r
                                            ? "bg-background text-foreground shadow-2xs border border-border/60"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {r === 'ALL' ? '전체' : r === '1d' ? '최근 1일' : r === '3d' ? '최근 3일' : '최근 7일'}
                                </button>
                            ))}
                        </div>

                        {/* 정렬 셀렉터 */}
                        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/50">
                            <span className="text-[10px] font-bold text-muted-foreground px-1.5">⚡ 정렬:</span>
                            {(['viral', 'latest', 'views'] as const).map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setSortOption(opt)}
                                    className={cn(
                                        "px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all",
                                        sortOption === opt
                                            ? "bg-background text-foreground shadow-2xs border border-border/60"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {opt === 'viral' ? '바이럴순' : opt === 'latest' ? '최신순' : '조회수순'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 풀텍스트 실시간 검색창 (넓은 폭 + 원클릭 클리어 지원) */}
                    <div className="relative flex-1 min-w-[200px] sm:min-w-[240px] md:max-w-sm ml-auto">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            placeholder="제목, 채널명, 대본 발화 본문 실시간 검색..."
                            className="pl-8 pr-7 bg-background border-border/80 shadow-2xs text-xs h-8.5 w-full rounded-xl focus:ring-1 focus:ring-primary"
                            value={globalFilter}
                            onChange={e => setGlobalFilter(e.target.value)}
                        />
                        {globalFilter && (
                            <button
                                onClick={() => setGlobalFilter('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted"
                                title="검색어 초기화"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Data Container: Desktop Table (md+) / Mobile Cards (<md) */}

            <div className="flex-1 rounded-2xl border border-border bg-card shadow-2xs overflow-hidden flex flex-col select-none relative min-h-[360px]">

                

                {/* 1. Desktop Table View (>= 768px) */}

                
                {viewMode === 'grid' ? (
                    <div className="hidden md:block overflow-y-auto flex-1 w-full relative max-h-[calc(100vh-280px)]">
                        {renderScriptTable(filteredVideos, true)}
                    </div>
                ) : (
                    /* 스마트 그룹핑 아코디언 뷰 */
                    <div className="hidden md:block p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-280px)] select-none">
                        {groupedVideos.map((group) => {
                            const isOpen = openGroups[group.key] ?? true;
                            const groupIds = group.videos.map(v => v.id);
                            const selectedCountInGroup = groupIds.filter(id => selectedIds.has(id)).length;
                            const isAllInGroupSelected = groupIds.length > 0 && selectedCountInGroup === groupIds.length;

                            return (
                                <div key={group.key} className="rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xs overflow-hidden shadow-2xs">
                                    {/* 그룹 헤더 바 */}
                                    <div className="flex flex-wrap items-center justify-between p-3 bg-muted/40 hover:bg-muted/60 transition-colors border-b border-border/40 gap-3">
                                        <div
                                            className="flex items-center gap-2 cursor-pointer flex-1"
                                            onClick={() => setOpenGroups(prev => ({ ...prev, [group.key]: !isOpen }))}
                                        >
                                            <button className="p-1 rounded-lg hover:bg-background/80 text-muted-foreground">
                                                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                                                    {group.title}
                                                </h3>
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                                                    {group.videos.length}개 대본
                                                </span>
                                                {group.sCount > 0 && (
                                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-500/90 text-white shadow-xs">
                                                        🔥 S급 {group.sCount}
                                                    </span>
                                                )}
                                                {group.aCount > 0 && (
                                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/90 text-white">
                                                        ⭐ A급 {group.aCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 그룹 단위 액션 버튼 */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const next = new Set(selectedIds);
                                                    if (isAllInGroupSelected) {
                                                        groupIds.forEach(id => next.delete(id));
                                                    } else {
                                                        groupIds.forEach(id => next.add(id));
                                                    }
                                                    setSelectedIds(next);
                                                }}
                                                className="h-7 text-xs font-semibold gap-1.5 bg-background border-border/60 hover:bg-muted"
                                            >
                                                <CheckSquare className="w-3.5 h-3.5 text-primary" />
                                                <span>{isAllInGroupSelected ? '그룹 선택 해제' : `그룹 전체 선택 (${groupIds.length})`}</span>
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleBatchReviewStatus(groupIds, 'REVIEWED');
                                                }}
                                                className="h-7 text-xs font-semibold gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                                title="이 그룹의 모든 대본을 검수완료로 변경"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>일괄 검수완료</span>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* 그룹 아코디언 바디: 동일한 표준 단일 테이블로 렌더링 */}
                                    {isOpen && renderScriptTable(group.videos, false)}
                                </div>
                            );
                        })}
                    </div>
                )}




                {/* 2. Mobile Responsive Card List View (< 768px) */}

                <div className="md:hidden flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)]">

                    {filteredVideos.map(v => {

                        const isSelected = selectedIds.has(v.id);

                        const thumbUrl = getVideoThumbnailUrl(v);

                        const ytUrl = getYoutubeWatchUrl(v);



                        return (

                            <div 

                                key={v.id}

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

                                        {(v.velocity_score || 0) > 0 && (

                                            <span className="font-bold text-indigo-400">+{formatVelocity(v.velocity_score ?? 0)}</span>

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

                                                "{cleanSrtToText(v.content || (v as any).extracted_text || '') || '대본을 불러오려면 탭하세요.'}"

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

                ) : filteredVideos.length === 0 ? (

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

                        {selectedIds.size} of {filteredVideos.length} row(s) selected.

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



                                {/* 📜 실제 수집 대본 전문 스크롤 뷰어 & 복사 콘솔 */}
                                {(() => {
                                    const fullScript = cleanSrtToText(playerVideo.content || playerVideo.extracted_text || (playerVideo.metadata_json as any)?.description || '');
                                    const charCount = fullScript.length;
                                    const estSeconds = Math.max(5, Math.round(charCount / 6));
                                    const estMinSec = estSeconds >= 60 
                                        ? `${Math.floor(estSeconds / 60)}분 ${estSeconds % 60}초` 
                                        : `${estSeconds}초`;

                                    return (
                                        <div className="rounded-xl bg-muted/40 border border-border p-3 space-y-2 flex flex-col">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                                    <span className="text-xs font-bold text-foreground">수집 발화 대본 전문</span>
                                                    {charCount > 0 && (
                                                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                                                            {charCount.toLocaleString()}자 · 약 {estMinSec}
                                                        </span>
                                                    )}
                                                </div>
                                                {charCount > 0 && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 px-2 text-[10.5px] font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 flex items-center gap-1"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(fullScript);
                                                            toast.success('대본 전문이 클립보드에 복사되었습니다');
                                                        }}
                                                    >
                                                        <Copy className="w-3 h-3" /> 복사
                                                    </Button>
                                                )}
                                            </div>

                                            {/* 대본 스크롤 영역 */}
                                            <div className="max-h-[190px] overflow-y-auto rounded-lg bg-background/60 p-2.5 border border-border/50 text-[11px] leading-relaxed text-foreground select-text font-sans space-y-1.5">
                                                {fullScript ? (
                                                    <p className="whitespace-pre-wrap">{fullScript}</p>
                                                ) : (
                                                    <div className="py-4 text-center text-muted-foreground space-y-1">
                                                        <p>수집된 텍스트 자막이 없습니다.</p>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs font-bold"
                                                            onClick={() => setSubtitleVideo(playerVideo)}
                                                        >
                                                            자막 뷰어 열기
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* 하단 바이럴루프 원클릭 제작 액션 버튼 바 */}
                            <div className="space-y-2 pt-2 border-t border-border">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button 
                                        onClick={() => {
                                            const raw = playerVideo.content || playerVideo.extracted_text || "";
                                            const cleanText = cleanSrtToText(raw);
                                            navigate('/script-writer', { 
                                                state: { 
                                                    initialScript: cleanText || playerVideo.title,
                                                    sourceVideoId: playerVideo.id,
                                                    sourceTitle: playerVideo.title
                                                } 
                                            });
                                        }}
                                        className="!bg-amber-500 bg-gradient-to-r from-amber-500 to-amber-600 hover:!bg-amber-600 !text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 rounded-xl shadow-md"
                                    >
                                        <Zap className="w-3.5 h-3.5 fill-current" /> ⚡ 숏폼 50초 각색
                                    </Button>
                                    <Button 
                                        onClick={() => {
                                            const raw = playerVideo.content || playerVideo.extracted_text || "";
                                            const cleanText = cleanSrtToText(raw);
                                            navigate('/creative-studio', { 
                                                state: { 
                                                    script: cleanText || playerVideo.title,
                                                    title: playerVideo.title,
                                                    creationMode: 'longform'
                                                } 
                                            });
                                        }}
                                        className="!bg-indigo-600 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:!bg-indigo-700 !text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 rounded-xl shadow-md"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" /> 🎬 롱폼 AI 창작
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



        
            {/* 🎯 하단 플로팅 액션 바: 선택 대본 듀얼 트랙 일괄 양산 및 창작 */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white backdrop-blur-md border border-slate-700/80 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 max-w-[95vw] overflow-x-auto select-none">
                    <div className="flex items-center gap-2 border-r border-slate-700 pr-3 shrink-0">
                        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                            {selectedIds.size}
                        </span>
                        <span className="text-xs font-bold text-slate-200">개 대본 선택됨</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* 검수완료 일괄 전환 */}
                        <Button
                            onClick={() => handleBatchReviewStatus(Array.from(selectedIds), 'REVIEWED')}
                            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md h-auto"
                        >
                            <Check className="w-3.5 h-3.5" />
                            🧐 선택 검수완료 ({selectedIds.size})
                        </Button>

                        {/* Track A: 숏폼 일괄 양산 */}
                        <Button
                            onClick={() => {
                                const selectedVideos = videos.filter(v => selectedIds.has(v.id));
                                navigate('/script-writer', {
                                    state: {
                                        batchVideos: selectedVideos,
                                        track: 'shorts'
                                    }
                                });
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md h-auto"
                        >
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                            ⚡ 선택 대본 일괄 쇼츠 양산 ({selectedIds.size})
                        </Button>

                        {/* Track B: 롱폼 AI 창작 */}
                        <Button
                            onClick={() => {
                                const selectedVideos = videos.filter(v => selectedIds.has(v.id));
                                navigate('/creative-studio', {
                                    state: {
                                        batchVideos: selectedVideos,
                                        track: 'longform'
                                    }
                                });
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all border border-emerald-500/50 flex items-center gap-1.5 shadow-md h-auto"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                            🎬 선택 대본 롱폼 AI 창작 ({selectedIds.size})
                        </Button>

                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 h-auto"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            삭제
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

</div>

    );

};



export default ScriptLab;



