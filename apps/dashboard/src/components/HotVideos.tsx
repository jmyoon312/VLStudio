import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getMediaUrl, cn } from "@/lib/utils";
import {
    Eye, Clock, Flame, Zap, TrendingUp,
    Loader2, Play, Hash, Heart, ExternalLink, User
} from 'lucide-react';

interface HotVideo {
    id: number;
    title: string;
    video_id: string;
    url: string;
    thumbnail_path: string | null;
    view_count: number;
    duration: number;
    upload_date: string;
    viral_score: number;
    velocity_score: number;
    is_short: boolean;
    views_per_hour: number;
    acceleration_ratio: number;
    composite_viral: number;
    embed_url: string | null;
    description: string | null;
    tags: string[];
    channel_id: number;
    channel_title: string | null;
    subscriber_count: number | null;
    accel_badge: string | null;
    youtube_url: string;
    channel_url: string | null;
}

interface Category {
    id: number;
    name: string;
    name_en: string | null;
    level: number;
    channel_count: number;
}

const formatViews = (num: number) => {
    if (num >= 100000000) return (num / 100000000).toFixed(1) + '억';
    if (num >= 10000) return (num / 10000).toFixed(0) + '만';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
};

const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return '방금 전';
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
};

const AccelBadge = ({ badge }: { badge: string | null }) => {
    if (!badge) return null;
    const colors: Record<string, string> = {
        '폭발적 증가': 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
        '급가속': 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800',
        '가속 중': 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800',
    };
    return (
        <Badge className={`${colors[badge] || ''} text-[10px] font-bold border`} variant="outline">
            <Zap className="w-3 h-3 mr-1" />
            {badge}
        </Badge>
    );
};

const HotVideos = () => {
    const [timeRange, setTimeRange] = useState('24h');
    const [contentFormat, setContentFormat] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [excludeLarge, setExcludeLarge] = useState(true);
    const [category, setCategory] = React.useState('all');
    const [sortBy, setSortBy] = useState('views');
    const [hoveredVideo, setHoveredVideo] = useState<number | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['hot-videos', timeRange, contentFormat, selectedCategory, excludeLarge, sortBy],
        queryFn: async () => {
            const params: any = {
                time_range: timeRange,
                format: contentFormat,
                exclude_large: excludeLarge,
                sort_by: sortBy,
                limit: 100,
                min_views: 100,
            };
            if (selectedCategory) params.category = selectedCategory;
            return (await api.get('/discovery/hot-videos', { params })).data;
        },
        refetchInterval: 300000,
    });

    const { data: categoriesData } = useQuery<{ categories: Category[] }>({
        queryKey: ['discovery-categories'],
        queryFn: async () => (await api.get('/discovery/categories')).data,
    });

    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => (await api.get('/settings/')).data,
    });

    return (
        <div className="space-y-6 p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">인기 영상</h1>
                    <p className="text-muted-foreground mt-2">
                        실시간 급상승 영상 &middot; {data?.total || 0}개 영상 모니터링 중
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Tabs value={timeRange} onValueChange={setTimeRange}>
                        <TabsList>
                            <TabsTrigger value="24h">24시간</TabsTrigger>
                            <TabsTrigger value="7d">7일</TabsTrigger>
                            <TabsTrigger value="30d">30일</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="w-px h-6 bg-border" />
                    <Tabs value={contentFormat} onValueChange={setContentFormat}>
                        <TabsList>
                            <TabsTrigger value="all">전체</TabsTrigger>
                            <TabsTrigger value="shorts">숏폼</TabsTrigger>
                            <TabsTrigger value="long">롱폼</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="w-px h-6 bg-border" />
                    <Button
                        variant={excludeLarge ? "default" : "outline"}
                        size="sm"
                        onClick={() => setExcludeLarge(!excludeLarge)}
                        className="h-8 text-xs"
                    >
                        대형채널 제외
                    </Button>
                    <div className="w-px h-6 bg-border" />
                    
                    <div className="w-px h-6 bg-border" />
                    <Tabs value={category} onValueChange={setCategory}>
                        <TabsList>
                            <TabsTrigger value="all">전체</TabsTrigger>
                            <TabsTrigger value="IT 리뷰">IT 리뷰</TabsTrigger>
                            <TabsTrigger value="코미디">코미디</TabsTrigger>
                            <TabsTrigger value="브이로그">브이로그</TabsTrigger>
                            <TabsTrigger value="게임">게임</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="w-px h-6 bg-border" />
                    <Tabs value={sortBy} onValueChange={setSortBy}>
                        <TabsList className="h-8">
                            <TabsTrigger value="views" className="text-xs px-2">조회수</TabsTrigger>
                            <TabsTrigger value="velocity" className="text-xs px-2">속도</TabsTrigger>
                            <TabsTrigger value="viral" className="text-xs px-2">바이럴</TabsTrigger>
                            <TabsTrigger value="acceleration" className="text-xs px-2">급가속</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                {categoriesData?.categories && (
                    <ScrollArea className="mt-3">
                        <div className="flex gap-2 pb-2">
                            <Badge
                                variant={!selectedCategory ? "default" : "outline"}
                                className="cursor-pointer whitespace-nowrap"
                                onClick={() => setSelectedCategory(null)}
                            >
                                전체
                            </Badge>
                            {categoriesData.categories.map(cat => (
                                <Badge
                                    key={cat.id}
                                    variant={selectedCategory === cat.name ? "default" : "outline"}
                                    className="cursor-pointer whitespace-nowrap"
                                    onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                                >
                                    {cat.name} ({cat.channel_count})
                                </Badge>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </Card>

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            )}

            {/* Video Grid */}
            {data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {data.videos.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
                            <Eye className="w-12 h-12 mb-4 opacity-30" />
                            <p className="text-lg font-semibold">표시할 인기 영상이 없습니다</p>
                            <p className="text-sm mt-1">채널 스캔 후 24시간 이내에 업로드된 영상이 있어야 표시됩니다</p>
                            <p className="text-xs mt-3 text-slate-400">필터: 조회수 100 이상, 시간범위 {timeRange === '24h' ? '24시간' : timeRange === '7d' ? '7일' : '30일'}</p>
                        </div>
                    )}
                    {data.videos.map((v: HotVideo) => (
                        <Card
                            key={v.id}
                            className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-border/50 hover:border-primary/30"
                            onMouseEnter={() => setHoveredVideo(v.id)}
                            onMouseLeave={() => setHoveredVideo(null)}
                        >
                            {/* Thumbnail (clickable → YouTube) */}
                            <a
                                href={v.youtube_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block relative aspect-video bg-muted overflow-hidden"
                            >
                                {v.thumbnail_path ? (
                                    <img
                                        src={getMediaUrl(v.thumbnail_path, settings?.root_download_path)}
                                        alt={v.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        onError={e => {
                                            e.currentTarget.src = `https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`;
                                        }}
                                    />
                                ) : (
                                    <img
                                        src={`https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`}
                                        alt={v.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                )}

                                {/* Duration badge */}
                                {v.duration > 0 && (
                                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                        {formatDuration(v.duration)}
                                    </div>
                                )}

                                {/* Hover overlay */}
                                <div className={cn(
                                    "absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-300",
                                    hoveredVideo === v.id ? "opacity-100" : "opacity-0"
                                )}>
                                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                                        <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                                    </div>
                                </div>

                                {/* Shorts badge */}
                                {v.is_short && (
                                    <Badge className="absolute top-2 left-2 bg-purple-600/90 text-[9px] font-bold border-0">
                                        #Shorts
                                    </Badge>
                                )}

                                {/* Acceleration badge */}
                                {v.accel_badge && (
                                    <div className="absolute top-2 right-2">
                                        <AccelBadge badge={v.accel_badge} />
                                    </div>
                                )}
                            </a>

                            {/* Info */}
                            <CardContent className="p-3 space-y-2">
                                {/* Channel (clickable → YouTube) */}
                                {v.channel_title && (
                                    <a
                                        href={v.channel_url || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline group"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <User className="w-3 h-3" />
                                        <span className="truncate">{v.channel_title}</span>
                                        <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                )}

                                {/* Title (clickable → YouTube) */}
                                <a
                                    href={v.youtube_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-sm font-bold leading-tight line-clamp-2 min-h-[2.5rem] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    {v.title}
                                </a>

                                {/* Tags */}
                                {v.tags && v.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {v.tags.slice(0, 3).map((tag, i) => (
                                            <Badge key={i} variant="outline" className="text-[8px] py-0 h-4 font-normal text-muted-foreground">
                                                #{tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {/* Metrics */}
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-1 font-semibold">
                                            <Eye className="w-3 h-3" /> {formatViews(v.view_count)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {timeAgo(v.upload_date)}
                                        </span>
                                    </div>
                                </div>

                                {/* Viral / Velocity score bar */}
                                <div className="flex items-center gap-2">
                                    {v.composite_viral > 0 && (
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-orange-500">
                                            <Flame className="w-3 h-3" />
                                            {v.composite_viral}%
                                        </div>
                                    )}
                                    {v.views_per_hour > 100 && (
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500">
                                            <TrendingUp className="w-3 h-3" />
                                            {formatViews(Math.round(v.views_per_hour))}/h
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HotVideos;
