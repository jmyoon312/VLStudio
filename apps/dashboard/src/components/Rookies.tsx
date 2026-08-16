import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getMediaUrl, cn } from "@/lib/utils";
import {
    TrendingUp, Users, Eye, Upload, Flame,
    Loader2, Rocket, Zap, ChevronUp, ChevronDown, Minus, Sparkles
} from 'lucide-react';

interface RookieChannel {
    id: number;
    name: string;
    url: string;
    thumbnail_path: string | null;
    subscriber_count: number;
    platform_id: string | null;
    category_id: number | null;
    category_name: string | null;
    first_seen_at: string;
    channel_age_days: number;
    total_videos: number;
    total_views: number;
    growth_velocity: number;
    recent_views: number;
    recent_videos: number;
    shorts_pct: number;
    uploads_per_week: number;
    sustain_score: number;
    avg_viral: number;
    avg_velocity: number;
    rank: number;
    growth_trend: 'rocket' | 'fast' | 'steady' | 'slow';
}

const formatCount = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + '만';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
};

const GrowthIcon = ({ trend }: { trend: string }) => {
    switch (trend) {
        case 'rocket': return <Rocket className="w-4 h-4 text-purple-500" />;
        case 'fast': return <Zap className="w-4 h-4 text-orange-500" />;
        case 'steady': return <TrendingUp className="w-4 h-4 text-green-500" />;
        default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
};

const Rookies = () => {
    const navigate = useNavigate();
    const [timeRange, setTimeRange] = useState('7d');
    const [contentFormat, setContentFormat] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [category, setCategory] = React.useState('all');
    const [sortBy, setSortBy] = useState('velocity');

    const { data, isLoading } = useQuery({
        queryKey: ['rookies', timeRange, contentFormat, selectedCategory, sortBy],
        queryFn: async () => {
            const params: any = {
                time_range: timeRange,
                format: contentFormat,
                sort_by: sortBy,
                limit: 100,
                max_subscribers: 50000,
            };
            if (selectedCategory) params.category = selectedCategory;
            return (await api.get('/discovery/rookies', { params })).data;
        },
        refetchInterval: 300000,
    });

    const { data: categoriesData } = useQuery<{ categories: { id: number; name: string; name_en: string | null; level: number; channel_count: number }[] }>({
        queryKey: ['discovery-categories'],
        queryFn: async () => (await api.get('/discovery/categories')).data,
    });
    const categories = categoriesData?.categories;

    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => (await api.get('/settings/')).data,
    });

    return (
        <div className="space-y-6 p-4 md:p-8">
            {/* Header removed as it is now in Discovery.tsx */}

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
                            <TabsTrigger value="velocity" className="text-xs px-2">성장속도</TabsTrigger>
                            <TabsTrigger value="views" className="text-xs px-2">조회수</TabsTrigger>
                            <TabsTrigger value="subscribers" className="text-xs px-2">구독자</TabsTrigger>
                            <TabsTrigger value="sustain" className="text-xs px-2">지속성</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                {categories && (
                    <ScrollArea className="mt-3">
                        <div className="flex gap-2 pb-2">
                            <Badge
                                variant={!selectedCategory ? "default" : "outline"}
                                className="cursor-pointer whitespace-nowrap"
                                onClick={() => setSelectedCategory(null)}
                            >
                                전체
                            </Badge>
                            {categories.map(cat => (
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
                    {data.channels.map((ch: RookieChannel) => (
                        <Card
                            key={ch.id}
                            className="hover:shadow-lg transition-all cursor-pointer border-l-4"
                            style={{
                                borderLeftColor: ch.growth_trend === 'rocket' ? '#a855f7' :
                                    ch.growth_trend === 'fast' ? '#f97316' :
                                    ch.growth_trend === 'steady' ? '#22c55e' : '#9ca3af'
                            }}
                            onClick={() => navigate(`/discovery/${ch.id}`)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    {/* Rank */}
                                    <div className="flex-shrink-0 w-10 text-center">
                                        <span className={cn(
                                            "text-2xl font-bold",
                                            ch.rank <= 3 ? "text-primary" : "text-muted-foreground"
                                        )}>
                                            {ch.rank}
                                        </span>
                                        <div className="flex justify-center mt-1">
                                            <GrowthIcon trend={ch.growth_trend} />
                                        </div>
                                    </div>

                                    {/* Thumbnail */}
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
                                            {ch.channel_age_days <= 30 && (
                                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-[9px] h-5 border-0">
                                                    <Sparkles className="w-3 h-3 mr-0.5" />
                                                    NEW
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
                                                {formatCount(ch.total_views)}
                                            </span>
                                            <span className="flex items-center gap-1 font-bold text-purple-500">
                                                <Rocket className="w-3 h-3" />
                                                {formatCount(Math.round(ch.growth_velocity))}/일
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Upload className="w-3 h-3" />
                                                주 {ch.uploads_per_week}회
                                            </span>
                                            {ch.avg_viral > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Flame className="w-3 h-3 text-orange-400" />
                                                    바이럴 {ch.avg_viral}%
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sustain Score */}
                                    <div className="flex-shrink-0 text-right hidden md:block">
                                        <div className="text-lg font-bold text-emerald-500">{ch.sustain_score}</div>
                                        <div className="text-[10px] text-muted-foreground font-medium">지속성</div>
                                        <div className="text-[10px] text-muted-foreground">
                                            {ch.channel_age_days}일
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Rookies;
