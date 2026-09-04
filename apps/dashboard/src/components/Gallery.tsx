import React, { useState, useMemo, useRef, useEffect } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useNavigate } from 'react-router-dom';

import api, { Video, Settings, Channel, Category, updateVideoReviewStatus, batchUpdateVideoReviewStatus } from '../lib/api';

import SubtitleViewer from './SubtitleViewer';

import { Card, CardContent } from "@/components/ui/card";



import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Checkbox } from "@/components/ui/checkbox";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { ScrollArea } from "@/components/ui/scroll-area";

import { cn, getMediaUrl } from "@/lib/utils";

import { Loader2, Trash2, Play, FileText, Flame, Zap, TrendingUp, RefreshCw, Filter, Settings2, FolderOpen, Calendar, Copy, Check, Languages, CheckSquare, Square, AlertCircle, LineChart, Download, ExternalLink, PlaySquare, ChevronRight, CheckCircle2, X, Sparkles, Radio, Scissors, Search, ArrowUpDown, Layers, ChevronDown, Grid, SlidersHorizontal } from "lucide-react";

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



const cleanTranscript = (text: string): string => {

    if (!text) return '';

    return text

        .replace(/^WEBVTT[^\n]*\n/gm, '')

        .replace(/\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{3}[^\n]*/g, '')

        .replace(/^\s*\d+\s*$/gm, '')

        .replace(/<[^>]+>/g, '')

        .replace(/\[(?:music|applause|laughter|sound|음악|박수|웃음|기타)[^\]]*\]/gi, '')

        .replace(/\((?:music|applause|laughter|sound|음악|박수|웃음)[^)]*\)/gi, '')

        .replace(/^\s*>>\s*/gm, '')

        .replace(/&gt;&gt;/g, '')

        .replace(/>>/g, '')

        .split(/\r?\n/)

        .map(l => l.trim())

        .filter(Boolean)

        .join(' ')

        .replace(/[ \t]+/g, ' ')

        .trim();

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



const getYoutubeWatchUrl = (video?: Video | null): string => {

    if (!video) return '';

    if (video.url && video.url.startsWith('http')) return video.url;

    if (video.video_id) return `https://www.youtube.com/watch?v=${video.video_id}`;

    const meta = video.metadata_json as any;

    if (meta?.webpage_url) return meta.webpage_url;

    if (meta?.url) return meta.url;

    return '';

};



interface ProcessedVideo extends Video {
    computedCategory: string;
    fullCategoryName: string;
    parentCategoryName?: string;
    viewCountNum: number;
    viralScoreNum: number;
    viralGrade: 'S' | 'A' | 'B' | 'C';
}


export const REVIEW_STATUSES = [
    { id: 'ALL', label: '전체', icon: '📋', color: 'bg-muted text-muted-foreground' },
    { id: 'COLLECTED', label: '신규수집', icon: '📥', color: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
    { id: 'REVIEWED', label: '검수완료', icon: '🧐', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
    { id: 'SHORTS_ADAPTED', label: '숏폼각색', icon: '⚡', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
    { id: 'LONGFORM_CREATED', label: '롱폼창작', icon: '🎬', color: 'bg-purple-500/15 text-purple-500 border-purple-500/30' },
    { id: 'ARCHIVED', label: '보관', icon: '📦', color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
] as const;

const Gallery = () => {



    const navigate = useNavigate();

    const queryClient = useQueryClient();



    // 필터 & 정렬 & 선택 상태 (모든 상태 변수 최우선 초기화)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [selectedPresetId, setSelectedPresetId] = useState<string>('ALL');
    const [videoTypeFilter, setVideoTypeFilter] = useState<'ALL' | 'shorts' | 'longform'>('ALL');
    const [gradeFilter, setGradeFilter] = useState<'ALL' | 'S' | 'A' | 'B' | 'C'>('ALL');
    const [viewMode, setViewMode] = useState<'grid' | 'grouped'>('grid');
    const [reviewStatusFilter, setReviewStatusFilter] = useState<string>('ALL');
    const [groupBy, setGroupBy] = useState<'preset' | 'category' | 'grade' | 'status'>('preset');
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const [visibleCount, setVisibleCount] = useState<number>(36);
    const [selectedDateFilter, setSelectedDateFilter] = useState<'ALL' | '1d' | '3d' | '7d' | '30d'>('ALL');
    const [sortBy, setSortBy] = useState<'viral' | 'latest' | 'views'>('viral');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [hoveredVideoId, setHoveredVideoId] = useState<number | null>(null);

    const observerTargetRef = useRef<HTMLDivElement | null>(null);

    // 수집 프리셋 목록 쿼리
    const { data: presets } = useQuery<any[]>({
        queryKey: ['collection-presets'],
        queryFn: async () => {
            try {
                return (await api.get('/presets/')).data;
            } catch (e) {
                return [];
            }
        },
    });

    // 200ms 디바운스 검색어 (searchQuery 선언 이후 실행)
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 200);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // 무한 스크롤 옵저버 (36개씩 청크 렌더링)
    useEffect(() => {
        if (!observerTargetRef.current) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setVisibleCount(prev => prev + 36);
            }
        }, { threshold: 0.1 });
        observer.observe(observerTargetRef.current);
        return () => observer.disconnect();
    }, [viewMode]);



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

    // URL Query Params 체크 (?video_id=...) -> 해당 영상 자동 플레이어 모달 오픈

    useEffect(() => {

        const params = new URLSearchParams(window.location.search);

        const targetVideoId = params.get('video_id');

        if (targetVideoId && videos && videos.length > 0) {

            const target = videos.find(v => v.id === parseInt(targetVideoId, 10));

            if (target) {

                setSelectedVideo(target);

            }

        }

    }, [videos]);



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

            return (await api.get(`/videos/${statsVideo.id}/history`)).data;

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



    // 2단계 계층형 카테고리 계산 (대분류 > 중분류)
    const getVideoCategoryInfo = (v: Video): { name: string; fullName: string; parentName?: string } => {
        if (v.category && v.category.trim()) {
            return { name: v.category, fullName: v.category };
        }
        if (v.channel_id && channelMap[v.channel_id]) {
            const ch = channelMap[v.channel_id];
            if (ch.category_id && categoryMap[ch.category_id]) {
                const cat = categoryMap[ch.category_id];
                const parent = cat.parent_id && categoryMap[cat.parent_id] ? categoryMap[cat.parent_id] : null;
                const fullName = parent ? `${parent.name} > ${cat.name}` : cat.name;
                return {
                    name: cat.name,
                    fullName,
                    parentName: parent?.name
                };
            }
        }
        return { name: '미분류', fullName: '미분류' };
    };

    // 가공된 영상 목록
    const processedVideos = useMemo<ProcessedVideo[]>(() => {
        if (!videos) return [];
        return videos.map(v => {
            const rawScore = Number(v.viral_score) || 0;
            const score = Math.round(rawScore);
            let viralGrade: 'S' | 'A' | 'B' | 'C' = 'C';
            if (score >= 300) viralGrade = 'S';
            else if (score >= 100) viralGrade = 'A';
            else if (score >= 30) viralGrade = 'B';

            const catInfo = getVideoCategoryInfo(v);

            return {
                ...v,
                computedCategory: catInfo.name,
                fullCategoryName: catInfo.fullName,
                parentCategoryName: catInfo.parentName,
                viewCountNum: v.view_count || (v.metadata_json?.view_count ? Number(v.metadata_json.view_count) : 0),
                viralScoreNum: rawScore,
                viralGrade,
            };
        });
    }, [videos, channelMap, categoryMap]);



    // 카테고리별 통계


    const reviewStatusStats = useMemo(() => {
        const stats: Record<string, number> = { ALL: processedVideos.length };
        processedVideos.forEach(v => {
            const st = v.review_status || 'COLLECTED';
            stats[st] = (stats[st] || 0) + 1;
        });
        return stats;
    }, [processedVideos]);

    // 상위 대분류 중심 카테고리 통계 (하위 중분류 포함 상속 카운트)
    const categoryStats = useMemo(() => {
        const counts: Record<string, number> = {};
        processedVideos.forEach(v => {
            const mainCat = v.parentCategoryName || v.computedCategory;
            counts[mainCat] = (counts[mainCat] || 0) + 1;
            // 하위 카테고리도 별도 표기 지원
            if (v.parentCategoryName && v.computedCategory !== mainCat) {
                counts[v.computedCategory] = (counts[v.computedCategory] || 0) + 1;
            }
        });
        return counts;
    }, [processedVideos]);



    // 필터링 & 정렬 적용된 영상 목록

    const filteredVideos = useMemo(() => {
        let result = processedVideos.filter((v) => {
            // 0. 라이프사이클 상태 필터
            if (reviewStatusFilter !== 'ALL') {
                const vStatus = v.review_status || 'COLLECTED';
                if (vStatus !== reviewStatusFilter) return false;
            }
            // 1. 프리셋 필터
            if (selectedPresetId !== 'ALL' && v.preset_id !== selectedPresetId) return false;
            // 2. 카테고리(폴더) 상속 필터 (상위 대분류 선택 시 하위 중분류 채널 영상도 자동 포함)
            if (selectedCategory !== 'ALL') {
                const isMatch = v.computedCategory === selectedCategory || 
                                v.parentCategoryName === selectedCategory ||
                                v.fullCategoryName === selectedCategory;
                if (!isMatch) return false;
            }
            // 3. 비디오 포맷 필터 (숏폼 vs 롱폼)
            if (videoTypeFilter === 'shorts') {
                const isShorts = v.video_type === 'shorts' || !v.duration || v.duration <= 60;
                if (!isShorts) return false;
            } else if (videoTypeFilter === 'longform') {
                const isLong = v.video_type === 'longform' || (v.duration && v.duration > 60);
                if (!isLong) return false;
            }
            // 4. 바이럴 등급 필터
            if (gradeFilter !== 'ALL' && v.viralGrade !== gradeFilter) return false;

            // 5. 날짜 필터
            if (selectedDateFilter !== 'ALL') {
                const now = new Date().getTime();
                const videoDate = v.upload_date ? new Date(v.upload_date).getTime() : 0;
                if (videoDate > 0) {
                    const diffDays = (now - videoDate) / (1000 * 60 * 60 * 24);
                    if (selectedDateFilter === '1d' && diffDays > 1) return false;
                    if (selectedDateFilter === '3d' && diffDays > 3) return false;
                    if (selectedDateFilter === '7d' && diffDays > 7) return false;
                }
            }

            // 6. 디바운스 검색 필터
            if (debouncedSearch.trim()) {
                const query = debouncedSearch.toLowerCase().trim();
                const matchTitle = v.title?.toLowerCase().includes(query);
                const matchChannel = (v.channel_id && channelMap[v.channel_id]?.name?.toLowerCase().includes(query)) ||
                                     ((v.metadata_json as any)?.uploader?.toLowerCase().includes(query));
                const matchDesc = (v.metadata_json as any)?.description?.toLowerCase().includes(query);
                if (!matchTitle && !matchChannel && !matchDesc) return false;
            }
            return true;
        });

        // 7. 정렬 로직
        if (sortBy === 'viral') {
            result.sort((a, b) => b.viralScoreNum - a.viralScoreNum);
        } else if (sortBy === 'views') {
            result.sort((a, b) => b.viewCountNum - a.viewCountNum);
        } else if (sortBy === 'latest') {
            result.sort((a, b) => {
                const dateA = a.upload_date ? new Date(a.upload_date).getTime() : 0;
                const dateB = b.upload_date ? new Date(b.upload_date).getTime() : 0;
                return dateB - dateA;
            });
        }
        return result;
    }, [processedVideos, reviewStatusFilter, selectedPresetId, selectedCategory, videoTypeFilter, gradeFilter, selectedDateFilter, debouncedSearch, sortBy, channelMap]);

    // 스마트 그룹핑 데이터 연산
    const groupedVideos = useMemo(() => {
        const groups: Record<string, { key: string; title: string; videos: ProcessedVideo[]; sCount: number; aCount: number }> = {};
        
        filteredVideos.forEach((video) => {
            let key = 'default';
            let title = '기본 그룹';

            if (groupBy === 'preset') {
                key = video.preset_id || 'unassigned';
                const preset = presets?.find(p => p.id === video.preset_id);
                title = preset ? ("🏷️ 프리셋: " + preset.name) : "📂 미지정 프리셋 수집물";
            } else if (groupBy === 'category') {
                key = video.category || '기타';
                title = "📁 폴더: " + key;
            } else if (groupBy === 'grade') {
                key = video.viralGrade || 'C';
                const gradeLabels: Record<string, string> = {
                    'S': '🔥 S급 초떡상 영상',
                    'A': '⭐ A급 우수 트렌드',
                    'B': '💡 B급 잠재력 영상',
                    'C': '📄 C급 일반 영상',
                };
                title = gradeLabels[key] || (key + "급");
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
            if (video.viralGrade === 'S') groups[key].sCount++;
            if (video.viralGrade === 'A') groups[key].aCount++;
        });

        return Object.values(groups).sort((a, b) => b.videos.length - a.videos.length);
    }, [filteredVideos, groupBy, presets]);



    // 뮤테이션


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
            toast.success(`${targetIds.length}개 영상의 상태가 변경되었습니다.`);
        } catch (err) {
            toast.error('일괄 상태 변경 실패');
        }
    };

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

            const res = await api.post('/videos/open-folder', { file_path: filePath });

            const openedPath = res.data?.opened_path || filePath;

            if (navigator.clipboard) {

                navigator.clipboard.writeText(openedPath).catch(() => {});

            }

            toast.success(`📁 로컬 탐색기에서 폴더를 열었습니다.`);

        } catch (_) {

            if (navigator.clipboard) {

                navigator.clipboard.writeText(filePath).catch(() => {});

                toast.info(`📁 폴더 경로가 복사되었습니다: ${filePath}`);

            } else {

                toast.error('폴더 열기 실패');

            }

        }

    };





    // 차트 데이터 계산 (히스토리가 0~1개여도 기본 추이 곡선 자동 생성)

    const chartData = useMemo(() => {

        if (!statsVideo) return [];

        const currentViews = statsVideo.view_count || (statsVideo.metadata_json?.view_count ? Number(statsVideo.metadata_json.view_count) : 0);

        const viralScore = statsVideo.viral_score || 0;

        const uploadDate = new Date(statsVideo.upload_date || statsVideo.created_at || Date.now() - 86400000 * 3);

        const createdDate = new Date(statsVideo.created_at || Date.now());



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

                    velocity: Math.max(0, Math.floor(velocity))

                };

            });

        }



        // 히스토리가 0~1개일 때: 업로드 시점부터 현재까지의 지수 성장/바이럴 추이 시뮬레이션 포인트 생성

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



    
    // 비디오 카드 렌더링 헬퍼 (그리드 모드 및 스마트 그룹핑 모드 공용)
    const renderVideoCard = (video: ProcessedVideo) => {
        const isSelected = selectedIds.has(video.id);
        const thumbUrl = getVideoThumbnailUrl(video, settings?.root_download_path);
        const videoUrl = getMediaUrl(video.file_path, settings?.root_download_path);
        const channelName = (video.channel_id && channelMap[video.channel_id]?.name) || (video.metadata_json as any)?.uploader || "트렌딩 크리에이터";
        const channelThumb = video.channel_id && channelMap[video.channel_id] ? getMediaUrl(channelMap[video.channel_id].thumbnail_path, settings?.root_download_path) : null;
        const uploadDateStr = video.upload_date ? new Date(video.upload_date).toLocaleDateString() : '최근';
        const presetName = video.preset_id ? (presets?.find(p => p.id === video.preset_id)?.name || '기타 프리셋') : null;

        return (
            <div
                key={video.id}
                ref={el => { videoRefs.current[video.id] = el; }}
                onClick={(e) => toggleSelection(e, video.id)}
                onDoubleClick={(e) => { e.stopPropagation(); setSelectedVideo(video); }}
                onMouseEnter={() => setHoveredVideoId(video.id)}
                onMouseLeave={() => setHoveredVideoId(null)}
                className={cn(
                    "video-card-item h-[270px] sm:h-[295px] rounded-2xl bg-slate-900 border overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between p-2.5 relative group select-none",
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
                                }
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500 gap-1">
                            <Play className="w-8 h-8 opacity-30" />
                            <span className="text-[10px]">미리보기 없음</span>
                        </div>
                    )}
                    {/* 마우스 호버 시 비디오 자동 재생 프리뷰 */}
                    {hoveredVideoId === video.id && videoUrl && (
                        <video
                            src={videoUrl}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover z-5 transition-opacity duration-300 pointer-events-none"
                        />
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/40 to-black/70 z-10 pointer-events-none" />
                </div>

                {/* 상단 오버레이: 체크박스 + 프리셋/등급 뱃지 */}
                <div className="relative z-20 flex items-start justify-between w-full gap-1">
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleSelection(e, video.id);
                        }}
                        className={cn(
                            "w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-150 cursor-pointer backdrop-blur-md shrink-0",
                            isSelected
                                ? "bg-primary border-primary text-white shadow-sm scale-105"
                                : "border-white/50 bg-black/40 text-transparent hover:border-white hover:bg-black/60 group-hover:border-white/80"
                        )}
                    >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>

                    <div className="flex flex-col items-end gap-1 max-w-[70%]">
                        {video.viralGrade === 'S' && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9.5px] font-black bg-rose-500/90 text-white shadow-xs flex items-center gap-0.5 border border-rose-400/40 animate-pulse">
                                🔥 S급 떡상
                            </span>
                        )}
                        {video.viralGrade === 'A' && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9.5px] font-bold bg-amber-500/90 text-white shadow-xs flex items-center gap-0.5 border border-amber-400/40">
                                ⭐ A급 우수
                            </span>
                        )}
                        {video.viralGrade === 'B' && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-sky-500/80 text-white shadow-xs border border-sky-400/30">
                                B급
                            </span>
                        )}
                        {presetName && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-violet-600/80 text-white truncate max-w-full backdrop-blur-md border border-violet-400/30" title={presetName}>
                                🏷️ {presetName}
                            </span>
                        )}
                        {video.review_status && video.review_status !== 'COLLECTED' && (
                            <span 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const nextMap: Record<string, string> = {
                                        'REVIEWED': 'SHORTS_ADAPTED',
                                        'SHORTS_ADAPTED': 'LONGFORM_CREATED',
                                        'LONGFORM_CREATED': 'ARCHIVED',
                                        'ARCHIVED': 'COLLECTED',
                                    };
                                    handleUpdateReviewStatus(video.id, nextMap[video.review_status] || 'REVIEWED');
                                }}
                                className={cn(
                                    "px-1.5 py-0.5 rounded-md text-[9px] font-bold shadow-xs cursor-pointer hover:opacity-80 transition-opacity border",
                                    video.review_status === 'REVIEWED' && "bg-emerald-500/90 text-white border-emerald-400/40",
                                    video.review_status === 'SHORTS_ADAPTED' && "bg-amber-500/90 text-white border-amber-400/40",
                                    video.review_status === 'LONGFORM_CREATED' && "bg-purple-500/90 text-white border-purple-400/40",
                                    video.review_status === 'ARCHIVED' && "bg-zinc-600/90 text-zinc-200 border-zinc-500/40",
                                )}
                                title="클릭하여 다음 단계로 상태 전환"
                            >
                                {video.review_status === 'REVIEWED' && "🧐 검수완료"}
                                {video.review_status === 'SHORTS_ADAPTED' && "⚡ 숏폼각색"}
                                {video.review_status === 'LONGFORM_CREATED' && "🎬 롱폼창작"}
                                {video.review_status === 'ARCHIVED' && "📦 보관"}
                            </span>
                        )}
                    </div>
                </div>

                {/* 중앙 호버 액션 툴바 (3x2 컴팩트 그리드 6대 퀵 액션 복원) */}
                <div className="relative z-20 flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-xl bg-black/65 backdrop-blur-md border border-white/20 shadow-2xl items-center justify-items-center">
                        {/* 1. 상세 재생 */}
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="rounded-full h-8 w-8 bg-white/20 hover:bg-white/40 text-white border-0 shadow-md ring-1 ring-white/30" 
                            onClick={(e) => { e.stopPropagation(); setSelectedVideo(video); }} 
                            title="상세 재생"
                        >
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </Button>

                        {/* 2. 딸깍 자막 생성 */}
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="rounded-full h-8 w-8 bg-amber-500/85 hover:bg-amber-500 text-white border-0 shadow-md ring-1 ring-amber-300/40" 
                            onClick={(e) => { e.stopPropagation(); handleSingleDdalkkak(video, 'subtitle'); }} 
                            title="⚡ 딸깍 자막 생성"
                        >
                            <Zap className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
                        </Button>

                        {/* 3. 자막 뷰어 */}
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="rounded-full h-8 w-8 bg-indigo-600/85 hover:bg-indigo-600 text-white border-0 shadow-md ring-1 ring-indigo-400/40" 
                            onClick={(e) => { e.stopPropagation(); setSubtitleVideo(video); }} 
                            title="자막 뷰어"
                        >
                            <FileText className="w-3.5 h-3.5" />
                        </Button>

                        {/* 4. 바이럴 통계 */}
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="rounded-full h-8 w-8 bg-sky-600/85 hover:bg-sky-600 text-white border-0 shadow-md ring-1 ring-sky-400/30" 
                            onClick={(e) => { e.stopPropagation(); setStatsVideo(video); }} 
                            title="바이럴 추이 통계"
                        >
                            <LineChart className="w-3.5 h-3.5" />
                        </Button>

                        {/* 5. 유튜브 원본 */}
                        {getYoutubeWatchUrl(video) ? (
                            <a 
                                href={getYoutubeWatchUrl(video)}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="rounded-full h-8 w-8 bg-red-600/85 hover:bg-red-600 text-white border-0 shadow-md ring-1 ring-red-400/40 flex items-center justify-center transition-transform hover:scale-105"
                                title="유튜브 원본 새 탭으로 열기"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        ) : (
                            <div className="h-8 w-8" />
                        )}

                        {/* 6. 로컬 폴더 열기 */}
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="rounded-full h-8 w-8 bg-white/20 hover:bg-white/40 text-white border-0 shadow-md ring-1 ring-white/30" 
                            onClick={(e) => { e.stopPropagation(); openFolder(video.file_path); }} 
                            title="로컬 폴더 열기"
                        >
                            <FolderOpen className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>

                {/* 하단 메타데이터 레이어 */}
                <div className="relative z-20 flex flex-col gap-1 text-left">
                    <div className="flex items-center justify-between gap-1">
                        <h4
                            className="text-[11.5px] font-bold text-white line-clamp-2 leading-tight drop-shadow-sm flex-1"
                            title={video.title}
                        >
                            {video.title}
                        </h4>
                        {video.url && (
                            <a
                                href={video.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-white/60 hover:text-white shrink-0 p-0.5 rounded hover:bg-white/10"
                                title="유튜브 원본 열기"
                            >
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-white/80 font-medium pt-0.5">
                        <div className="flex items-center gap-1 min-w-0 max-w-[65%]">
                            <span className="truncate">{channelName}</span>
                            {video.fullCategoryName && video.fullCategoryName !== '미분류' && (
                                <span className="text-[9px] px-1 py-0 rounded bg-white/20 text-white/90 truncate shrink-0" title={video.fullCategoryName}>
                                    {video.fullCategoryName}
                                </span>
                            )}
                        </div>
                        <span className="text-amber-300 font-bold shrink-0">{formatCount(video.viewCountNum)} 조회</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-white/60 pt-0.5 border-t border-white/10">
                        <span>{uploadDateStr}</span>
                        <span className="text-emerald-400 font-bold">⚡ AI 제작 가능</span>
                    </div>
                </div>
            </div>
        );
    };

    // 그룹 일괄 숏폼 제작 핸들러
    const handleBatchDdalkkakForGroup = (groupVideos: ProcessedVideo[]) => {
        const ids = new Set(groupVideos.map(v => v.id));
        setSelectedIds(ids);
        handleLaunchBatchDdalkkak('subtitle');
    };

    // 그룹 내 전체 선택/해제 토글
    const toggleGroupSelection = (groupVideos: ProcessedVideo[]) => {
        const groupIds = groupVideos.map(v => v.id);
        const allSelected = groupIds.every(id => selectedIds.has(id));
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allSelected) {
                groupIds.forEach(id => next.delete(id));
            } else {
                groupIds.forEach(id => next.add(id));
            }
            return next;
        });
    };

    return (

        <div 

            className="space-y-4 sm:space-y-5 p-3 sm:p-6 pb-40 md:pb-16 bg-background text-foreground min-h-screen relative select-none"

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

                            수집 영상 보관함

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



            {/* 2. 🎛️ 다차원 고도화 필터 툴바 & 스마트 그룹핑 컨트롤 */}
            <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-card border border-border/80 shadow-2xs">
                {/* 상단 0단: 라이프사이클 5대 상태 탭 바 */}
                <div className="flex items-center gap-1.5 overflow-x-auto dashboard-scroll-area py-0.5 pb-2 border-b border-border/40 select-none">
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

                {/* 1단: 좌측(수집 프리셋 필터 & 카테고리) + 우측(스마트 그룹핑 뷰 모드 스위치) */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                    {/* 좌측: 수집 프리셋 드롭다운 & 카테고리 탭 */}
                    <div className="flex items-center gap-2 overflow-x-auto dashboard-scroll-area select-none pb-1 lg:pb-0">
                        {/* 수집 프리셋 셀렉터 */}
                        {presets && presets.length > 0 && (
                            <div className="flex items-center gap-1 bg-muted/60 px-2 py-1 rounded-xl border border-border/60 shrink-0">
                                <span className="text-[10.5px] font-bold text-muted-foreground">🏷️ 수집 프리셋:</span>
                                <select
                                    value={selectedPresetId}
                                    onChange={(e) => setSelectedPresetId(e.target.value)}
                                    className="bg-background text-foreground text-xs font-semibold px-2 py-0.5 rounded-lg border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="ALL">전체 프리셋 ({processedVideos.length})</option>
                                    {presets.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* 카테고리(폴더) 필터 탭 */}
                        <div className="flex items-center gap-1 shrink-0">
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
                    </div>

                    {/* 우측: 뷰 모드 (일반 그리드 vs 스마트 그룹핑) 및 그룹핑 기준 */}
                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                        <div className="flex items-center bg-muted/70 p-0.5 rounded-xl border border-border/60">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                    viewMode === 'grid'
                                        ? "bg-background text-foreground shadow-2xs border border-border/60"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Grid className="w-3.5 h-3.5" />
                                <span>플랫 그리드</span>
                            </button>
                            <button
                                onClick={() => setViewMode('grouped')}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                    viewMode === 'grouped'
                                        ? "bg-primary text-white shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                <span>스마트 그룹핑</span>
                            </button>
                        </div>

                        {/* 스마트 그룹핑 모드일 때 그룹핑 기준 선택 */}
                        {viewMode === 'grouped' && (
                            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/60">
                                <span className="text-[10px] font-bold text-muted-foreground px-1.5">기준:</span>
                                {[
                                    { id: 'preset', label: '수집 프리셋별' },
                                    { id: 'category', label: '폴더별' },
                                    { id: 'grade', label: '등급별' },
                                    { id: 'status', label: '상태별' },
                                ].map((g) => (
                                    <button
                                        key={g.id}
                                        onClick={() => setGroupBy(g.id as any)}
                                        className={cn(
                                            "px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all",
                                            groupBy === g.id
                                                ? "bg-background text-foreground shadow-2xs border border-border/60"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {g.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2단: 상세 다차원 필터 (등급 + 숏폼/롱폼 + 수집기간 + 정렬 + 검색) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* 영상 포맷 필터 */}
                        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/50">
                            <span className="text-[10px] font-bold text-muted-foreground px-1.5">🎬 포맷:</span>
                            {[
                                { id: 'ALL', label: '전체' },
                                { id: 'shorts', label: '⚡ 숏폼' },
                                { id: 'longform', label: '📺 롱폼' },
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setVideoTypeFilter(f.id as any)}
                                    className={cn(
                                        "px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all",
                                        videoTypeFilter === f.id
                                            ? "bg-background text-foreground shadow-2xs border border-border/60"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* 바이럴 등급 필터 */}
                        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/50">
                            <span className="text-[10px] font-bold text-muted-foreground px-1.5">👑 등급:</span>
                            {[
                                { id: 'ALL', label: '전체' },
                                { id: 'S', label: '🔥 S급' },
                                { id: 'A', label: '⭐ A급' },
                                { id: 'B', label: 'B급' },
                                { id: 'C', label: 'C급' },
                            ].map((g) => (
                                <button
                                    key={g.id}
                                    onClick={() => setGradeFilter(g.id as any)}
                                    className={cn(
                                        "px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all",
                                        gradeFilter === g.id
                                            ? "bg-background text-foreground shadow-2xs border border-border/60"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {g.label}
                                </button>
                            ))}
                        </div>

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
                                        "px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all",
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
                                        "px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all",
                                        sortBy === s.id
                                            ? "bg-background text-foreground shadow-2xs border border-border/60"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 검색창 */}
                    <div className="relative ml-auto">
                        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="제목/채널 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-36 sm:w-48 pl-8 pr-2.5 py-1 text-xs rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>
            </div>

            {/* 3. 🎬 비디오 컨텐츠 뷰 (플랫 그리드 vs 스마트 그룹핑 아코디언) */}
            {filteredVideos.length > 0 ? (
                viewMode === 'grid' ? (
                    /* 플랫 그리드 모드: 청크 가상 렌더링으로 수천 개 로딩 시에도 즉시 렌더 */
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 select-none">
                            {filteredVideos.slice(0, visibleCount).map((video) => renderVideoCard(video))}
                        </div>
                        {/* 무한 스크롤 옵저버 타깃 */}
                        {visibleCount < filteredVideos.length && (
                            <div ref={observerTargetRef} className="w-full py-6 text-center text-xs text-muted-foreground animate-pulse">
                                수집 영상 추가 로딩 중... ({visibleCount} / {filteredVideos.length})
                            </div>
                        )}
                    </div>
                ) : (
                    /* 스마트 그룹핑 아코디언 뷰: 프리셋별 / 폴더별 / 등급별 클러스터 */
                    <div className="space-y-4 select-none">
                        {groupedVideos.map((group) => {
                            const isOpen = openGroups[group.key] ?? true;
                            const groupIds = group.videos.map(v => v.id);
                            const selectedCountInGroup = groupIds.filter(id => selectedIds.has(id)).length;
                            const isAllInGroupSelected = groupIds.length > 0 && selectedCountInGroup === groupIds.length;

                            return (
                                <div key={group.key} className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs overflow-hidden shadow-2xs">
                                    {/* 그룹 헤더 바 */}
                                    <div className="flex flex-wrap items-center justify-between p-3.5 bg-muted/40 hover:bg-muted/60 transition-colors border-b border-border/40 gap-3">
                                        <div
                                            className="flex items-center gap-2.5 cursor-pointer flex-1"
                                            onClick={() => setOpenGroups(prev => ({ ...prev, [group.key]: !isOpen }))}
                                        >
                                            <button className="p-1 rounded-lg hover:bg-background/80 text-muted-foreground">
                                                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                                    {group.title}
                                                </h3>
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                                                    {group.videos.length}개 영상
                                                </span>
                                                {group.sCount > 0 && (
                                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-500/90 text-white shadow-xs animate-pulse">
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
                                                    toggleGroupSelection(group.videos);
                                                }}
                                                className="h-7 px-2.5 text-xs rounded-xl font-bold flex items-center gap-1.5 border-border/80"
                                            >
                                                <CheckSquare className="w-3.5 h-3.5 text-primary" />
                                                <span>{isAllInGroupSelected ? "그룹 선택 해제" : `그룹 전체 선택 (${selectedCountInGroup}/${group.videos.length})`}</span>
                                            </Button>

                                            <Button
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleBatchDdalkkakForGroup(group.videos);
                                                }}
                                                className="h-7 px-3 text-xs rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
                                            >
                                                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                                                <span>⚡ 이 그룹 일괄 쇼츠 제작</span>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* 그룹 내 비디오 그리드 */}
                                    {isOpen && (
                                        <div className="p-3.5 bg-background/40">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                                                {group.videos.map(video => renderVideoCard(video))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
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



                            {/* 우측 상단 유튜브 원본 바로가기 링크 버튼 */}

                            {getYoutubeWatchUrl(selectedVideo) && (

                                <a

                                    href={getYoutubeWatchUrl(selectedVideo)}

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
                                        <span>채널: <strong className="text-foreground">{(selectedVideo.channel_id && channelMap[selectedVideo.channel_id]?.name) || (selectedVideo.metadata_json as any)?.uploader || '트렌딩 크리에이터'}</strong></span>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={selectedVideo.review_status || 'COLLECTED'}
                                                onChange={(e) => {
                                                    const nextStatus = e.target.value;
                                                    handleUpdateReviewStatus(selectedVideo.id, nextStatus);
                                                    setSelectedVideo(prev => prev ? { ...prev, review_status: nextStatus } : null);
                                                }}
                                                className={cn(
                                                    "text-[10.5px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary",
                                                    (selectedVideo.review_status === 'REVIEWED' && "bg-emerald-500/15 text-emerald-500 border-emerald-500/30") ||
                                                    (selectedVideo.review_status === 'SHORTS_ADAPTED' && "bg-amber-500/15 text-amber-500 border-amber-500/30") ||
                                                    (selectedVideo.review_status === 'LONGFORM_CREATED' && "bg-purple-500/15 text-purple-500 border-purple-500/30") ||
                                                    (selectedVideo.review_status === 'ARCHIVED' && "bg-zinc-500/15 text-zinc-400 border-zinc-500/30") ||
                                                    "bg-blue-500/15 text-blue-500 border-blue-500/30"
                                                )}
                                            >
                                                <option value="COLLECTED">📥 신규수집</option>
                                                <option value="REVIEWED">🧐 검수완료</option>
                                                <option value="SHORTS_ADAPTED">⚡ 숏폼각색</option>
                                                <option value="LONGFORM_CREATED">🎬 롱폼창작</option>
                                                <option value="ARCHIVED">📦 보관</option>
                                            </select>
                                            <span>{selectedVideo.upload_date ? new Date(selectedVideo.upload_date).toLocaleDateString() : '최근'}</span>
                                        </div>
                                    </div>

                                    <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-foreground leading-snug">

                                        {selectedVideo.title}

                                    </h3>

                                </div>



                                {/* 메트릭 4분할 그리드 */}

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">

                                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">

                                        <p className="text-[10px] text-muted-foreground">조회수</p>

                                        <p className="text-xs font-extrabold text-foreground mt-0.5">{formatCount(selectedVideo.view_count || (selectedVideo.metadata_json as any)?.view_count)}</p>

                                    </div>

                                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">

                                        <p className="text-[10px] text-muted-foreground">바이럴 스코어</p>

                                        <p className="text-xs font-extrabold text-amber-500 mt-0.5">{Math.round(selectedVideo.viral_score || 0)}%</p>

                                    </div>

                                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">

                                        <p className="text-[10px] text-muted-foreground">영상 길이</p>

                                        <p className="text-xs font-extrabold text-foreground mt-0.5">{selectedVideo.duration ? `${selectedVideo.duration}초` : '30초'}</p>

                                    </div>

                                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">

                                        <p className="text-[10px] text-muted-foreground">수집 상태</p>

                                        <p className="text-xs font-extrabold text-emerald-500 mt-0.5">보관완료</p>

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

                                            onClick={() => setSubtitleVideo(selectedVideo)}

                                            className="text-[10px] font-bold text-primary hover:underline"

                                        >

                                            대본 전문보기 →

                                        </button>

                                    </div>

                                    <p className="leading-relaxed line-clamp-3 text-[11px] text-muted-foreground select-text font-sans">

                                        {cleanTranscript(selectedVideo.content || selectedVideo.extracted_text || (selectedVideo.metadata_json as any)?.description || '') || '추출된 대본 또는 영상 설명이 없습니다.'}

                                    </p>

                                </div>



                                {/* 수집 기록 및 성과 분석 */}

                                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs space-y-1">

                                    <div className="flex items-center justify-between text-[11px] font-bold text-primary">

                                        <span>📊 AI 바이럴 점수 분석</span>

                                        <span className="text-emerald-500">상위 {Math.max(1, (100 - Math.min(100, (selectedVideo.viral_score || 50) / 10))).toFixed(1)}%</span>

                                    </div>

                                    <p className="text-[10px] text-muted-foreground leading-normal">

                                        수집된 영상 자산입니다. 딸깍 자동 생성을 통해 자막 합성 및 더빙 버전으로 재가공하여 새로운 숏폼으로 제작할 수 있습니다.

                                    </p>

                                </div>





                            </div>



                            {/* 하단 바이럴루프 원클릭 제작 액션 버튼 바 */}

                            <div className="space-y-2 pt-2 border-t border-border">

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

                                        className="bg-muted hover:bg-muted/80 border-border text-foreground text-xs py-2 flex items-center justify-center gap-1.5 rounded-xl"

                                    >

                                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> 대본 추출 & AI 재창작

                                    </Button>

                                    <Button 

                                        variant="outline" 

                                        onClick={() => handleGoToSceneCutter(selectedVideo)}

                                        className="bg-muted hover:bg-muted/80 border-border text-foreground text-xs py-2 flex items-center justify-center gap-1.5 rounded-xl"

                                    >

                                        <Scissors className="w-3.5 h-3.5 text-amber-500" /> ✂️ 씬 커터로 컷팅

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

                description={(subtitleVideo as any)?.description || (subtitleVideo?.metadata_json as any)?.description}

                extractedText={subtitleVideo?.extracted_text}

            />



            {/* 7. 바이럴 추이 그래프 모달 */}

            <Dialog open={!!statsVideo} onOpenChange={(open) => !open && setStatsVideo(null)}>

                <DialogContent className="max-w-2xl bg-card border border-border text-foreground p-5 sm:p-6">

                    <DialogHeader>

                        <div className="flex items-center justify-between gap-2">

                            <DialogTitle className="text-base sm:text-lg font-extrabold text-foreground flex items-center gap-2">

                                <TrendingUp className="w-5 h-5 text-indigo-500" /> AI 바이럴 성과 및 추이 분석

                            </DialogTitle>

                            {statsVideo && getViralBadge(statsVideo.viral_score, statsVideo.velocity_score)}

                        </div>

                        <DialogDescription className="text-xs text-muted-foreground truncate">{statsVideo?.title}</DialogDescription>

                    </DialogHeader>



                    {/* 4대 핵심 바이럴 KPI 지표 카드 */}

                    {statsVideo && (

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">

                            <div className="bg-muted/40 border border-border/80 rounded-xl p-2.5 space-y-0.5">

                                <span className="text-[10px] text-muted-foreground font-medium">총 누적 조회수</span>

                                <p className="text-sm sm:text-base font-extrabold text-foreground">{formatCount(statsVideo.view_count || statsVideo.metadata_json?.view_count)}</p>

                            </div>

                            <div className="bg-muted/40 border border-border/80 rounded-xl p-2.5 space-y-0.5">

                                <span className="text-[10px] text-muted-foreground font-medium">바이럴 지수</span>

                                <p className="text-sm sm:text-base font-extrabold text-amber-500">{Math.round(statsVideo.viral_score || 0)}%</p>

                            </div>

                            <div className="bg-muted/40 border border-border/80 rounded-xl p-2.5 space-y-0.5">

                                <span className="text-[10px] text-muted-foreground font-medium">시간당 유입 속도</span>

                                <p className="text-sm sm:text-base font-extrabold text-indigo-400">

                                    {formatCount(Math.round((statsVideo.view_count || 1000) / Math.max(1, ((Date.now() - new Date(statsVideo.upload_date || Date.now() - 86400000).getTime()) / 3600000))))}/h

                                </p>

                            </div>

                            <div className="bg-muted/40 border border-border/80 rounded-xl p-2.5 space-y-0.5">

                                <span className="text-[10px] text-muted-foreground font-medium">채널 카테고리</span>

                                <p className="text-sm sm:text-base font-extrabold text-foreground truncate">{statsVideo.category || '한국영화'}</p>

                            </div>

                        </div>

                    )}



                    <div className="h-[240px] sm:h-[280px] w-full mt-3 bg-muted/20 border border-border/60 rounded-xl p-2 sm:p-3">

                        <ResponsiveContainer width="100%" height="100%">

                            <RechartsLineChart data={chartData}>

                                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />

                                <XAxis

                                    dataKey="timestamp"

                                    tickFormatter={(time) => new Date(time).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}

                                    className="text-muted-foreground fill-muted-foreground"

                                    fontSize={10}

                                />

                                <YAxis yAxisId="left" stroke="#818cf8" fontSize={10} tickFormatter={(val) => formatCount(val)} />

                                <YAxis yAxisId="right" orientation="right" stroke="#fbbf24" fontSize={10} tickFormatter={(val) => formatCount(val) + '/h'} />

                                <Tooltip

                                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)', fontSize: '11px' }}

                                    labelFormatter={(label) => new Date(label).toLocaleString()}

                                />

                                <Line yAxisId="left" type="monotone" dataKey="view_count" name="누적 조회수" stroke="#818cf8" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />

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



            {/* Mobile Bottom Navigation Clearance Spacer */}

            <div className="h-28 md:hidden shrink-0 pointer-events-none" aria-hidden="true" />



        </div>

    );

};



export default Gallery;

