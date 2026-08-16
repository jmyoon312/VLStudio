import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api, { Channel } from '../lib/api';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getMediaUrl } from "@/lib/utils";
import {
    TrendingUp, TrendingDown, Minus, Search, Filter,
    Play, Clock, Eye, Upload, Users, Zap, Flame,
    Loader2, ChevronUp, ChevronDown, Rocket, Heart
} from 'lucide-react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

interface DiscoveryChannel {
    id: number;
    name: string;
    url: string;
    thumbnail_path: string | null;
    subscriber_count: number;
    platform_id: string | null;
    created_at: string | null;
    updated_at: string | null;
    category_id: number | null;
    category_name: string | null;
    views_24h: number;
    views_change: number;
    velocity_pct: number;
    upload_frequency: number;
    shorts_pct: number;
    content_format: string;
    avg_viral: number;
    avg_velocity: number;
    video_count_24h: number;
    rank: number;
    trend: 'up' | 'down' | 'steady';
}

interface DiscoveryResponse {
    channels: DiscoveryChannel[];
    total: number;
    page: number;
    limit: number;
}

interface Category {
    id: number;
    name: string;
    name_en: string | null;
    level: number;
    channel_count: number;
}

const formatCount = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + '만';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
};

const formatViews = (num: number) => {
    if (num >= 100000000) return (num / 100000000).toFixed(1) + '억';
    if (num >= 10000) return (num / 10000).toFixed(0) + '만';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
};

const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'up') return <ChevronUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <ChevronDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
};

const Discovery = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [timeRange, setTimeRange] = useState('24h');
    const [contentFormat, setContentFormat] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [excludeLarge, setExcludeLarge] = useState(true);
    const [showRookies, setShowRookies] = useState(false);
    const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
    const [category, setCategory] = React.useState('all');
    const [sortBy, setSortBy] = useState('views');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');

    const { data: watchlistData } = useQuery({
        queryKey: ['watchlist-ids'],
        queryFn: async () => {
            const res = await api.get('/discovery/watchlist');
            return new Set(res.data.channels.map((c: any) => c.channel_id));
        },
        refetchInterval: 300000,
    });

    const toggleWatchlist = useMutation({
        mutationFn: async ({ id, isAdding }: { id: number, isAdding: boolean }) => {
            if (isAdding) {
                await api.post(`/discovery/watchlist/${id}`);
            } else {
                await api.delete(`/discovery/watchlist/${id}`);
            }
        },
        onMutate: async ({ id, isAdding }) => {
            await queryClient.cancelQueries({ queryKey: ['watchlist-ids'] });
            const previousWatchlist = queryClient.getQueryData<Set<number>>(['watchlist-ids']);
            if (previousWatchlist) {
                const newSet = new Set(previousWatchlist);
                if (isAdding) newSet.add(id);
                else newSet.delete(id);
                queryClient.setQueryData(['watchlist-ids'], newSet);
            }
            return { previousWatchlist };
        },
        onError: (err, variables, context) => {
            if (context?.previousWatchlist) {
                queryClient.setQueryData(['watchlist-ids'], context.previousWatchlist);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['watchlist-ids'] });
        }
    });

    const { data, isLoading } = useQuery<any>({
        queryKey: ['discovery', timeRange, contentFormat, selectedCategory, excludeLarge, sortBy, search, showRookies, showWatchlistOnly],
        queryFn: async () => {
            const endpoint = showRookies ? '/discovery/rookies' : '/discovery/channels';
            const params: any = {
                time_range: timeRange,
                format: contentFormat,
                sort_by: sortBy,
                limit: 100,
            };
            if (!showRookies) {
                params.exclude_large = excludeLarge;
                if (search) params.search = search;
            }
            if (showWatchlistOnly) {
                params.watchlist_only = true;
            }
            if (selectedCategory) params.category = selectedCategory;
            return (await api.get(endpoint, { params })).data;
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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput);
    };

    return (
        <div className="space-y-6 p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">디스커버리</h1>
                    <p className="text-muted-foreground mt-2">
                        채널 랭킹, 신인 채널, 관심 목록을 한 곳에서 관리하세요
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
                        variant={excludeLarge && !showRookies ? "default" : "outline"}
                        size="sm"
                        onClick={() => setExcludeLarge(!excludeLarge)}
                        className="h-8 text-xs"
                        disabled={showRookies}
                    >
                        대형채널 제외
                    </Button>
                    <div className="w-px h-6 bg-border" />
                    <Button
                        variant={showRookies ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowRookies(!showRookies)}
                        className={cn(
                            "h-8 text-xs",
                            showRookies ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-purple-600 border-purple-200 hover:bg-purple-50"
                        )}
                    >
                        <Rocket className="w-3 h-3 mr-1" />
                        신인 채널 필터
                    </Button>
                    <Button
                        variant={showWatchlistOnly ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
                        className={cn(
                            "h-8 text-xs ml-1",
                            showWatchlistOnly ? "bg-red-500 hover:bg-red-600 text-white border-red-500" : "text-red-500 border-red-200 hover:bg-red-50"
                        )}
                    >
                        <Heart className={cn("w-3 h-3 mr-1", showWatchlistOnly && "fill-white")} />
                        관심 목록 필터
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
                            <TabsTrigger value="velocity" className="text-xs px-2">성장/급상승</TabsTrigger>
                            <TabsTrigger value="subscribers" className="text-xs px-2">구독자</TabsTrigger>
                            <TabsTrigger value="uploads" className="text-xs px-2">업로드</TabsTrigger>
                            {showRookies && <TabsTrigger value="sustain" className="text-xs px-2">지속성</TabsTrigger>}
                        </TabsList>
                    </Tabs>
                </div>
                {/* Category filters */}
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

            {/* Channel List */}
            {data && (
                <div className="space-y-3">
                    {data.channels.map((ch: any) => {
                        const isWatchlisted = watchlistData?.has(ch.id);
                        const isRookie = !!ch.growth_trend;

                        return (
                        <Card
                            key={ch.id}
                            className={cn(
                                "hover:shadow-lg transition-shadow cursor-pointer relative",
                                isRookie && "border-l-4"
                            )}
                            style={isRookie ? {
                                borderLeftColor: ch.growth_trend === 'rocket' ? '#a855f7' :
                                    ch.growth_trend === 'fast' ? '#f97316' :
                                    ch.growth_trend === 'steady' ? '#22c55e' : '#9ca3af'
                            } : undefined}
                            onClick={() => navigate(`/discovery/${ch.id}`)}
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-8 w-8 z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWatchlist.mutate({ id: ch.id, isAdding: !isWatchlisted });
                                }}
                            >
                                <Heart className={cn("w-5 h-5 transition-colors", isWatchlisted ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-red-500")} />
                            </Button>
                            <CardContent className="p-4 pr-12">
                                <div className="flex items-start gap-4">
                                    {/* Rank */}
                                    <div className="flex-shrink-0 w-10 text-center">
                                        <span className={cn(
                                            "text-2xl font-bold",
                                            ch.rank <= 3 ? "text-primary" : "text-muted-foreground"
                                        )}>
                                            {ch.rank}
                                        </span>
                                        <TrendIcon trend={ch.trend} />
                                    </div>

                                    {/* Channel Thumbnail */}
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-muted overflow-hidden">
                                        {ch.thumbnail_path ? (
                                            <img
                                                src={getMediaUrl(ch.thumbnail_path, settings?.root_download_path)}
                                                alt={ch.name}
                                                className="w-full h-full object-cover"
                                                onError={e => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                                                {ch.name[0]}
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-base truncate">{ch.name}</h3>
                                            {ch.category_name && (
                                                <Badge variant="secondary" className="text-[10px] h-5 whitespace-nowrap">
                                                    {ch.category_name}
                                                </Badge>
                                            )}
                                            {!isRookie && (
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[10px] h-5",
                                                        ch.content_format === 'shorts' && 'border-purple-300 text-purple-600',
                                                        ch.content_format === 'long' && 'border-blue-300 text-blue-600',
                                                        ch.content_format === 'mixed' && 'border-green-300 text-green-600',
                                                    )}
                                                >
                                                    {ch.content_format === 'shorts' ? '숏폼' : ch.content_format === 'long' ? '롱폼' : '혼합'}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {formatCount(ch.subscriber_count)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Eye className="w-3 h-3" />
                                                {formatViews(isRookie ? ch.total_views : ch.views_24h)}
                                            </span>
                                            {isRookie ? (
                                                <span className="flex items-center gap-1 font-bold text-purple-500">
                                                    <Rocket className="w-3 h-3" />
                                                    {formatCount(Math.round(ch.growth_velocity))}/일
                                                </span>
                                            ) : (
                                                <span className={cn(
                                                    "flex items-center gap-1 font-medium",
                                                    ch.velocity_pct > 50 ? "text-red-500" : ch.velocity_pct > 10 ? "text-orange-500" : "text-muted-foreground"
                                                )}>
                                                    {ch.velocity_pct > 0 ? '+' : ''}{ch.velocity_pct}%
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Upload className="w-3 h-3" />
                                                주 {isRookie ? ch.uploads_per_week : ch.upload_frequency}회
                                            </span>
                                            {ch.avg_viral > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Flame className="w-3 h-3 text-orange-400" />
                                                    바이럴 {ch.avg_viral}%
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Side Stats */}
                                    <div className="flex-shrink-0 text-right hidden md:block">
                                        {isRookie ? (
                                            <>
                                                <div className="text-lg font-bold text-emerald-500">{ch.sustain_score}</div>
                                                <div className="text-[10px] text-muted-foreground font-medium">지속성</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-lg font-bold">{formatViews(ch.views_24h)}</div>
                                                <div className={cn(
                                                    "text-xs font-medium",
                                                    ch.views_change > 0 ? "text-green-500" : ch.views_change < 0 ? "text-red-500" : "text-muted-foreground"
                                                )}>
                                                    {ch.views_change > 0 ? '+' : ''}{formatViews(ch.views_change)}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )})}
                </div>
            )}
        </div>
    );
};


import { cn } from "@/lib/utils";
export default Discovery;
