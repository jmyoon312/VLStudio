import React, { useState, useEffect } from 'react';
import { Tag, Users, TrendingUp, DollarSign, RefreshCw, ChevronRight, Clock } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { BypassVideoFrame } from '@/components/BypassVideoFrame';

function formatSubs(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

function getRelativeTime(uploadDate: string): string {
    if (!uploadDate || uploadDate.length < 8) return '';
    try {
        const y = parseInt(uploadDate.substring(0, 4));
        const m = parseInt(uploadDate.substring(4, 6)) - 1;
        const d = parseInt(uploadDate.substring(6, 8));
        const date = new Date(y, m, d);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 1) return '오늘';
        if (diffDays < 7) return `${diffDays}일 전`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
        return `${Math.floor(diffDays / 365)}년 전`;
    } catch { return ''; }
}

const TrendingCategories = () => {
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('최신등록');
    const [channels, setChannels] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);

    useEffect(() => {
        api.get('/keywords/channels/curated-categories')
            .then(r => {
                setCategories(r.data || []);
                if (r.data?.length > 0) {
                    setSelectedCategory(r.data[0]);
                    fetchCategory(r.data[0]);
                }
            })
            .catch(() => {
                const fallback = ['최신등록', '운동/헬스', '게임', '요리/먹방', '뷰티/패션', '일상/브이로그', '교육/지식', '음악', '코미디/엔터', '여행'];
                setCategories(fallback);
                fetchCategory(fallback[0]);
            });
    }, []);

    const fetchCategory = async (cat: string) => {
        setIsLoading(true);
        try {
            const resp = await api.post('/keywords/channels/curated', {
                curated_category: cat,
                category: cat,
                period: '7days',
            });
            setChannels(resp.data || []);
        } catch {
            setChannels([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCategoryClick = (cat: string) => {
        setSelectedCategory(cat);
        fetchCategory(cat);
    };

    return (
        <div className="w-full px-6 py-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black flex items-center gap-3">
                    <Tag className="w-8 h-8 text-pink-400" />
                    트렌딩 카테고리
                </h1>
                <p className="text-muted-foreground mt-1">AI가 큐레이션한 카테고리별 주목 채널을 빠르게 탐색하세요.</p>
            </div>

            {/* Category Chips */}
            <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => handleCategoryClick(cat)}
                        className={`px-4 py-2 rounded-full border text-sm font-bold transition-all ${
                            selectedCategory === cat
                                ? 'bg-pink-600/20 border-pink-500 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.2)]'
                                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="py-20 flex flex-col items-center gap-4 text-muted-foreground">
                    <div className="w-12 h-12 rounded-full border-4 border-pink-500/20 border-t-pink-500 animate-spin" />
                    <p className="font-bold animate-pulse">[{selectedCategory}] 채널 불러오는 중...</p>
                </div>
            )}

            {/* Channel List */}
            {!isLoading && (
                <div className="space-y-4">
                    {channels.length === 0 && (
                        <div className="py-20 text-center text-muted-foreground">
                            <p>해당 카테고리의 채널을 찾지 못했습니다.</p>
                        </div>
                    )}
                    {channels.map((ch, idx) => (
                        <div key={ch.channel_id || idx}
                            className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-pink-500/30 transition-all">
                            <div className="flex gap-4">
                                {/* Channel Meta */}
                                <div className="w-52 flex-shrink-0 bg-white/5 rounded-xl p-4 flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-full bg-pink-600/30 flex items-center justify-center text-lg font-black text-pink-300 flex-shrink-0">
                                            {ch.channel_name?.[0] || '?'}
                                        </div>
                                        <div className="min-w-0">
                                            <a href={ch.channel_url} target="_blank" rel="noopener noreferrer"
                                                className="font-bold text-sm text-white truncate block hover:text-pink-400 transition-colors">
                                                {ch.channel_name}
                                            </a>
                                            <span className="text-[10px] text-white/50">{ch.category}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-white/60"><Users className="w-3 h-3" /><span>구독자</span></div>
                                            <span className="font-bold text-white">{formatSubs(ch.subscribers)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-green-400/70"><TrendingUp className="w-3 h-3" /><span>7일 상승</span></div>
                                            <span className="font-bold text-green-400">{ch.growth_7d}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-yellow-400/70"><DollarSign className="w-3 h-3" /><span>일일 예상</span></div>
                                            <span className="font-bold text-yellow-400">${ch.estimated_daily_revenue?.toFixed(0)}</span>
                                        </div>
                                    </div>

                                    <a href={ch.channel_url} target="_blank" rel="noopener noreferrer"
                                        className="w-full py-1.5 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 text-pink-300 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5">
                                        채널 보기 <ChevronRight className="w-3 h-3" />
                                    </a>
                                </div>

                                {/* Horizontal Videos */}
                                <div className="flex-1 overflow-hidden">
                                    {ch.recent_videos?.length > 0 ? (
                                        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                                            {ch.recent_videos.map((v: any) => (
                                                <div key={v.id}
                                                    className="flex-shrink-0 w-24 rounded-xl overflow-hidden bg-black/30 border border-white/5 hover:border-pink-500/30 transition-all"
                                                    onMouseEnter={() => setHoveredVideoId(v.id)}
                                                    onMouseLeave={() => setHoveredVideoId(null)}
                                                >
                                                    <div className="relative aspect-[9/16]">
                                                        <BypassVideoFrame
                                                            videoId={v.id}
                                                            title={v.title}
                                                            thumbnail={v.thumbnail}
                                                            isActive={hoveredVideoId === v.id}
                                                        />
                                                        {getRelativeTime(v.upload_date) && (
                                                            <div className="absolute top-1 left-1 px-1 py-0.5 bg-blue-500/70 rounded text-[7px] font-bold text-white pointer-events-none z-10">
                                                                {getRelativeTime(v.upload_date)}
                                                            </div>
                                                        )}
                                                        {v.views > 0 && (
                                                            <div className="absolute bottom-1 left-1 right-1 px-1 py-0.5 bg-black/70 rounded text-[8px] font-bold text-white text-center pointer-events-none z-10">
                                                                {(v.views / 1000).toFixed(0)}K
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-1">
                                                        <p className="text-[8px] text-white/60 line-clamp-2 leading-snug">{v.title}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-white/30 text-sm">
                                            최근 쇼츠 없음
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TrendingCategories;
