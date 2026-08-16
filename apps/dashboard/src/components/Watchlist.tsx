import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMediaUrl, cn } from "@/lib/utils";
import {
    Eye, Users, Flame, Loader2, Trash2,
    Star, Clock, Heart
} from 'lucide-react';

interface WatchlistChannel {
    id: number;
    channel_id: number;
    channel_name: string;
    channel_url: string;
    thumbnail_path: string | null;
    subscriber_count: number;
    category_name: string | null;
    views_24h: number;
    videos_24h: number;
    avg_viral: number;
    notes: string | null;
    added_at: string;
}

const formatCount = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + '만';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
};

const Watchlist = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [sortBy, setSortBy] = React.useState('recent');

    const { data, isLoading } = useQuery({
        queryKey: ['watchlist', sortBy],
        queryFn: async () => (await api.get('/discovery/watchlist', { params: { sort_by: sortBy } })).data,
        refetchInterval: 300000,
    });

    const removeMutation = useMutation({
        mutationFn: (channelId: number) => api.delete(`/discovery/watchlist/${channelId}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
    });

    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => (await api.get('/settings/')).data,
    });

    return (
        <div className="space-y-6 p-4 md:p-8">
            {/* Header removed as it is now in Discovery.tsx */}

            {isLoading && (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            )}

            {data && data.channels.length === 0 && (
                <Card className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Heart className="w-12 h-12 opacity-30" />
                        <h3 className="text-lg font-bold">관심 채널이 없습니다</h3>
                        <p className="text-sm">디스커버리 채널 랭킹에서 관심 있는 채널을 추가해보세요.</p>
                    </div>
                </Card>
            )}

            {data && data.channels.length > 0 && (
                <>
                    {/* Sort */}
                    <div className="flex items-center gap-3">
                        <Tabs value={sortBy} onValueChange={setSortBy}>
                            <TabsList className="h-8">
                                <TabsTrigger value="recent" className="text-xs px-2">최근 추가</TabsTrigger>
                                <TabsTrigger value="views" className="text-xs px-2">조회수</TabsTrigger>
                                <TabsTrigger value="velocity" className="text-xs px-2">활성도</TabsTrigger>
                                <TabsTrigger value="subscribers" className="text-xs px-2">구독자</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.channels.map((ch: WatchlistChannel) => (
                            <Card
                                key={ch.id}
                                className="hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                                onClick={() => navigate(`/discovery/${ch.channel_id}`)}
                            >
                                {/* Top gradient accent */}
                                <div className="h-1.5 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400" />

                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3 mb-3">
                                        {/* Thumbnail */}
                                        <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex-shrink-0">
                                            {ch.thumbnail_path ? (
                                                <img
                                                    src={getMediaUrl(ch.thumbnail_path, settings?.root_download_path)}
                                                    alt={ch.channel_name}
                                                    className="w-full h-full object-cover"
                                                    onError={e => { e.currentTarget.style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                                                    {ch.channel_name?.[0]}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-base truncate">{ch.channel_name}</h3>
                                                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                                            </div>
                                            {ch.category_name && (
                                                <Badge variant="secondary" className="text-[9px] h-4 mt-0.5">
                                                    {ch.category_name}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Metrics */}
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-muted/50 rounded-lg p-2">
                                            <div className="text-xs font-bold">{formatCount(ch.subscriber_count)}</div>
                                            <div className="text-[8px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                                                <Users className="w-2.5 h-2.5" /> 구독자
                                            </div>
                                        </div>
                                        <div className="bg-muted/50 rounded-lg p-2">
                                            <div className="text-xs font-bold">{formatCount(ch.views_24h)}</div>
                                            <div className="text-[8px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                                                <Eye className="w-2.5 h-2.5" /> 24h 조회수
                                            </div>
                                        </div>
                                        <div className="bg-muted/50 rounded-lg p-2">
                                            <div className="text-xs font-bold">{ch.videos_24h}</div>
                                            <div className="text-[8px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                                                <Clock className="w-2.5 h-2.5" /> 24h 영상
                                            </div>
                                        </div>
                                    </div>

                                    {/* Viral + remove */}
                                    <div className="flex items-center justify-between mt-3">
                                        {ch.avg_viral > 0 && (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-orange-500">
                                                <Flame className="w-3 h-3" />
                                                바이럴 {ch.avg_viral}%
                                            </div>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeMutation.mutate(ch.channel_id);
                                            }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default Watchlist;
