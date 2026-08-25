import React, { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp, Users, DollarSign, RefreshCw, Play, SlidersHorizontal, ChevronRight, Clock } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { SidebarFilter, FilterState } from '@/components/SidebarFilter';
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

function Sparkline({ color = '#6366f1' }: { color?: string }) {
    const points = Array.from({ length: 7 }, (_, i) => Math.random() * 40 + 30);
    const max = Math.max(...points);
    const min = Math.min(...points);
    const normalize = (v: number) => 40 - ((v - min) / (max - min + 1)) * 38;
    const pathD = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * (80 / 6)} ${normalize(v)}`).join(' ');
    return (
        <svg width="80" height="40" viewBox="0 0 80 40" className="opacity-70">
            <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

const ChannelExplorer = () => {
    const [keyword, setKeyword] = useState('');
    const [channels, setChannels] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
    const [showSidebar, setShowSidebar] = useState(true);
    const [filters, setFilters] = useState<FilterState>({
        videoType: 'all', sort: 'trending', country: '', viewCountRange: 'all',
        channelSizeRange: 'all', durationRange: 'all', period: '7days',
    });

    const handleSearch = async (kw?: string) => {
        const q = kw || keyword;
        if (!q.trim()) { toast.error('키워드를 입력해주세요'); return; }
        setIsLoading(true);
        try {
            const resp = await api.post('/keywords/channels/discovery', {
                keyword: q,
                period: filters.period,
                min_subs: filters.channelSizeRange === 'large' ? 100000 : filters.channelSizeRange === 'medium' ? 10000 : 1000,
            });
            setChannels(resp.data || []);
            if (resp.data?.length === 0) toast.info('해당 키워드의 채널을 찾지 못했습니다.');
            else toast.success(`🎯 ${resp.data?.length}개 채널 발굴 완료!`);
        } catch (err) {
            toast.error('채널 탐색 실패');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-full min-h-screen bg-background text-foreground">
            <SidebarFilter filters={filters} onChange={setFilters} isOpen={showSidebar} />

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowSidebar(s => !s)}
                            className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                            <SlidersHorizontal className="w-4 h-4" />
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
                                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-violet-500" />
                                채널 디스커버리
                            </h1>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">트렌딩 채널을 발굴하고 최신 숏폼을 한 눈에 확인하세요.</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={keyword}
                                onChange={e => setKeyword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="키워드 입력 (예: 운동, 요리, 게임...)"
                                className="w-full pl-12 pr-4 py-2.5 sm:py-3 bg-card border border-border rounded-xl sm:rounded-2xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500 transition-colors"
                            />
                        </div>
                        <button
                            onClick={() => handleSearch()}
                            disabled={isLoading}
                            className="px-6 sm:px-8 py-2.5 sm:py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs sm:text-sm shadow-md"
                        >
                            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                            {isLoading ? '탐색 중...' : '채널 탐색'}
                        </button>
                    </div>

                    {/* Empty State */}
                    {!isLoading && channels.length === 0 && (
                        <div className="py-20 sm:py-24 flex flex-col items-center justify-center text-muted-foreground">
                            <Users className="w-16 h-16 sm:w-20 sm:h-20 mb-4 opacity-20" />
                            <p className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-foreground">채널을 탐색해보세요</p>
                            <p className="text-xs sm:text-sm text-center px-4">키워드를 입력하면 트렌딩 채널과 최신 숏폼을 바로 확인할 수 있습니다.</p>
                        </div>
                    )}

                    {/* Loading */}
                    {isLoading && (
                        <div className="py-20 sm:py-24 flex flex-col items-center gap-4 text-muted-foreground">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
                            <p className="font-bold text-xs sm:text-sm animate-pulse text-foreground">트렌딩 채널 탐색 중...</p>
                        </div>
                    )}

                    {/* Channel List */}
                    {!isLoading && channels.length > 0 && (
                        <div className="space-y-4">
                            {channels.map((ch, idx) => (
                                <div key={ch.channel_id || idx}
                                    className="bg-card border border-border rounded-2xl p-3 sm:p-4 hover:border-violet-500/40 transition-all shadow-2xs">
                                    <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
                                        {/* Left: Channel Meta Box */}
                                        <div className="w-full md:w-56 flex-shrink-0 bg-muted/40 border border-border rounded-xl p-3.5 sm:p-4 flex flex-col gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-violet-600/20 flex items-center justify-center text-lg sm:text-xl font-black text-violet-600 dark:text-violet-400 overflow-hidden flex-shrink-0">
                                                    {ch.channel_name?.[0] || '?'}
                                                </div>
                                                <div className="min-w-0">
                                                    <a href={ch.channel_url} target="_blank" rel="noopener noreferrer"
                                                        className="font-bold text-xs sm:text-sm text-foreground truncate block hover:text-violet-500 transition-colors">
                                                        {ch.channel_name}
                                                    </a>
                                                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">{ch.category}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 sm:space-y-2 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Users className="w-3.5 h-3.5" />
                                                        <span>구독자</span>
                                                    </div>
                                                    <span className="font-bold text-foreground">{formatSubs(ch.subscribers)}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                                        <TrendingUp className="w-3.5 h-3.5" />
                                                        <span>7일 상승</span>
                                                    </div>
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{ch.growth_7d}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                                        <DollarSign className="w-3.5 h-3.5" />
                                                        <span>일일 예상</span>
                                                    </div>
                                                    <span className="font-bold text-amber-600 dark:text-amber-400">${ch.estimated_daily_revenue?.toFixed(0)}</span>
                                                </div>
                                            </div>

                                            {/* Sparkline */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-muted-foreground">추이</span>
                                                <Sparkline color="#8b5cf6" />
                                            </div>

                                            <a href={ch.channel_url} target="_blank" rel="noopener noreferrer"
                                                className="w-full py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-600 dark:text-violet-400 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5">
                                                채널 보기 <ChevronRight className="w-3.5 h-3.5" />
                                            </a>
                                        </div>

                                        {/* Right: Horizontal Shorts Scroll */}
                                        <div className="flex-1 overflow-hidden min-w-0">
                                            {ch.recent_videos?.length > 0 ? (
                                                <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 dashboard-scroll-area">
                                                    {ch.recent_videos.map((v: any) => (
                                                        <div key={v.id}
                                                            className="flex-shrink-0 w-24 sm:w-28 rounded-xl overflow-hidden bg-card border border-border hover:border-violet-500/40 transition-all group"
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
                                                                    <div className="absolute top-1.5 left-1.5 px-1 py-0.5 bg-blue-500/80 rounded text-[8px] font-bold text-white pointer-events-none z-10">
                                                                        {getRelativeTime(v.upload_date)}
                                                                    </div>
                                                                )}
                                                                {v.views > 0 && (
                                                                    <div className="absolute bottom-1.5 left-1.5 right-1.5 px-1.5 py-0.5 bg-black/70 rounded text-[9px] font-bold text-white text-center pointer-events-none z-10">
                                                                        {(v.views / 1000).toFixed(0)}K views
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="p-1.5">
                                                                <p className="text-[9px] text-foreground line-clamp-2 leading-snug">{v.title}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="h-full py-8 flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
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
            </div>
        </div>
    );
};

export default ChannelExplorer;
