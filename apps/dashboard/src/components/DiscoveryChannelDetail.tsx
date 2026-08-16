import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMediaUrl, cn } from "@/lib/utils";
import {
    ArrowLeft, Play, Eye, Clock, Upload, Users,
    Flame, TrendingUp, ExternalLink, Loader2
} from 'lucide-react';

const formatCount = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + '만';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
};

const DiscoveryChannelDetail = () => {
    const { channelId } = useParams();
    const navigate = useNavigate();

    const { data, isLoading } = useQuery({
        queryKey: ['discovery-channel', channelId],
        queryFn: async () => (await api.get(`/discovery/channels/${channelId}`)).data,
        enabled: !!channelId,
    });

    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => (await api.get('/settings/')).data,
    });

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    if (!data) {
        return <div className="p-8 text-center text-muted-foreground">채널을 찾을 수 없습니다.</div>;
    }

    const { channel, top_videos, latest_videos } = data;

    return (
        <div className="space-y-6 p-4 md:p-8">
            {/* Back button */}
            <Button variant="ghost" onClick={() => navigate('/discovery')} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> 디스커버리로 돌아가기
            </Button>

            {/* Channel Header */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-muted overflow-hidden flex-shrink-0">
                            {channel.thumbnail_path ? (
                                <img
                                    src={getMediaUrl(channel.thumbnail_path, settings?.root_download_path)}
                                    alt={channel.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                                    {channel.name?.[0]}
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h1 className="text-2xl font-bold">{channel.name}</h1>
                                {channel.category_name && (
                                    <Badge>{channel.category_name}</Badge>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    구독자 {formatCount(channel.subscriber_count)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Upload className="w-4 h-4" />
                                    주 {channel.uploads_per_week}회 업로드
                                </span>
                                <span className="flex items-center gap-1">
                                    <Flame className="w-4 h-4 text-orange-400" />
                                    숏폼 {channel.shorts_pct}%
                                </span>
                            </div>
                        </div>
                        {channel.url && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(channel.url, '_blank')}
                                className="gap-2"
                            >
                                <ExternalLink className="w-4 h-4" /> YouTube
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Top Videos */}
            <div>
                <h2 className="text-xl font-bold mb-4">인기 영상</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {top_videos.map((v: any) => (
                        <Card key={v.id} className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer">
                            <div className="relative aspect-video bg-muted overflow-hidden">
                                <img
                                    src={getMediaUrl(v.thumbnail_path, settings?.root_download_path)}
                                    alt={v.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    onError={e => { e.currentTarget.src = `https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`; }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="rounded-full"
                                        onClick={() => v.embed_url ? window.open(`https://youtube.com/watch?v=${v.video_id}`, '_blank') : null}
                                    >
                                        <Play className="w-5 h-5 fill-current" />
                                    </Button>
                                </div>
                                {v.is_short && (
                                    <Badge className="absolute top-2 right-2 bg-purple-600 text-[10px]">#Shorts</Badge>
                                )}
                            </div>
                            <CardContent className="p-3">
                                <h3 className="text-sm font-semibold line-clamp-2 min-h-[2.5rem]">{v.title}</h3>
                                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Eye className="w-3 h-3" /> {formatCount(v.view_count || 0)}
                                    </span>
                                    {v.viral_score > 0 && (
                                        <span className="text-orange-500 font-medium">
                                            바이럴 {v.viral_score.toFixed(0)}%
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Latest Videos */}
            <div>
                <h2 className="text-xl font-bold mb-4">최신 영상</h2>
                <div className="space-y-2">
                    {latest_videos.map((v: any) => (
                        <Card key={v.id} className="hover:shadow transition-shadow">
                            <CardContent className="p-3 flex items-center gap-3">
                                <div className="w-24 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                                    <img
                                        src={getMediaUrl(v.thumbnail_path, settings?.root_download_path)}
                                        alt={v.title}
                                        className="w-full h-full object-cover"
                                        onError={e => { e.currentTarget.src = `https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`; }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold truncate">{v.title}</h3>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-3 h-3" /> {formatCount(v.view_count || 0)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {v.upload_date ? new Date(v.upload_date).toLocaleDateString() : '-'}
                                        </span>
                                        {v.viral_score > 0 && (
                                            <span className="text-orange-500">
                                                <Flame className="w-3 h-3 inline" /> {v.viral_score.toFixed(0)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => window.open(`https://youtube.com/watch?v=${v.video_id}`, '_blank')}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DiscoveryChannelDetail;
