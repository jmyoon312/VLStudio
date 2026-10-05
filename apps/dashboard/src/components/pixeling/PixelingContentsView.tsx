import React, { useState } from 'react';
import { 
    Compass, 
    TrendingUp, 
    Search, 
    Play, 
    Sparkles, 
    Flame, 
    Eye, 
    ThumbsUp, 
    Calendar,
    ArrowUpRight,
    ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface TrendingVideoItem {
    id: string;
    title: string;
    channelTitle: string;
    viewsStr: string;
    publishedAt: string;
    thumbnail: string;
    category: string;
    reason: string;
}

const TRENDING_VIDEOS: TrendingVideoItem[] = [
    {
        id: 'trend-1',
        title: '지금 난리 난 신인 아이돌 0초 칼군무 챌린지 원본',
        channelTitle: 'K-POP 핫이슈',
        viewsStr: '248만회',
        publishedAt: '12시간 전',
        thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
        category: '음악 & 챌린지',
        reason: '쇼츠 피드 체류시간 94% 돌파, 해외 틱톡 역수출 중'
    },
    {
        id: 'trend-2',
        title: '요즘 2030이 탕후루 다음으로 미쳐있는 신종 길거리 간식',
        channelTitle: '골목 미식 탐정',
        viewsStr: '115만회',
        publishedAt: '1일 전',
        thumbnail: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
        category: '푸드 & 라이프',
        reason: '댓글 반응 8,000개 돌파, 호불호 논쟁 바이럴'
    },
    {
        id: 'trend-3',
        title: '출근 10분 만에 퇴사 결심한 신입사원의 소름 돋는 카톡',
        channelTitle: '직장생활 썰 백과',
        viewsStr: '320만회',
        publishedAt: '2일 전',
        thumbnail: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&auto=format&fit=crop&q=80',
        category: '썰 & 커뮤니티',
        reason: '썰형 4대 폼팩터 최적 포맷, 릴스/쇼츠 동시 폭발'
    },
    {
        id: 'trend-4',
        title: 'AI로 만든 영상이 헐리우드를 충격에 빠뜨린 이유 60초 요약',
        channelTitle: '테크 & 미래지식',
        viewsStr: '89만회',
        publishedAt: '18시간 전',
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        category: '지식 & 테크',
        reason: '정보 밀도 고효율 쇼츠, 공유율 32% 기록'
    }
];

interface PixelingContentsViewProps {
    onMakeShortsFromTrend?: (topic: string) => void;
}

export function PixelingContentsView({ onMakeShortsFromTrend }: PixelingContentsViewProps) {
    const [selectedTab, setSelectedTab] = useState<string>('all');
    const [searchKeyword, setSearchKeyword] = useState<string>('');

    const trendingKeywords = [
        '#아이돌챌린지',
        '#신종길거리간식',
        '#직장인사이다썰',
        '#AI영상혁명',
        '#국내외환율충격',
        '#초단기재테크'
    ];

    const filtered = TRENDING_VIDEOS.filter(v => {
        const matchesTab = selectedTab === 'all' || v.category.includes(selectedTab);
        const matchesQuery = !searchKeyword.trim() || 
            v.title.toLowerCase().includes(searchKeyword.toLowerCase()) || 
            v.channelTitle.toLowerCase().includes(searchKeyword.toLowerCase());
        return matchesTab && matchesQuery;
    });

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-6">
            <div className="max-w-5xl mx-auto w-full space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div>
                        <div className="flex items-center gap-2">
                            <Compass className="w-5 h-5 text-blue-600" />
                            <h2 className="text-base font-bold text-foreground">트렌드 디스커버리</h2>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            요즘 뜨는 쇼츠·채널·뉴스·SNS 트렌드를 실시간으로 탐색하고 즉시 쇼츠로 발주합니다.
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                            실시간 급상승 피드 동기화 중
                        </span>
                    </div>
                </div>

                {/* Trending Keyword Chips */}
                <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                        실시간 급상승 키워드 태그:
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                        {trendingKeywords.map((kw, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => {
                                    setSearchKeyword(kw.replace('#', ''));
                                    if (onMakeShortsFromTrend) {
                                        toast.info(`[${kw}] 트렌드를 검색어에 반영했습니다.`);
                                    }
                                }}
                                className="px-3 py-1 rounded-full text-xs font-medium bg-muted/60 hover:bg-muted text-foreground border border-border/60 transition-colors cursor-pointer flex items-center gap-1"
                            >
                                <TrendingUp className="w-3 h-3 text-blue-600" />
                                <span>{kw}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filter and Search */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                        {[
                            { id: 'all', label: '전체 트렌드' },
                            { id: '음악', label: '음악 & 챌린지' },
                            { id: '푸드', label: '푸드 & 라이프' },
                            { id: '썰', label: '썰 & 커뮤니티' },
                            { id: '지식', label: '지식 & 테크' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setSelectedTab(tab.id)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                                    selectedTab === tab.id
                                        ? 'bg-foreground text-background font-semibold'
                                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchKeyword}
                            onChange={e => setSearchKeyword(e.target.value)}
                            placeholder="트렌드 또는 채널명 검색..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border/70 bg-card focus:outline-hidden focus:ring-1 focus:ring-blue-600 text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                </div>

                {/* Trending Videos Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map(v => (
                        <div
                            key={v.id}
                            className="p-4 rounded-2xl border border-border/80 bg-card hover:border-blue-600/40 transition-all flex flex-col justify-between gap-3 shadow-xs group"
                        >
                            <div className="flex gap-3.5">
                                {/* Thumbnail */}
                                <div className="w-28 h-36 rounded-xl overflow-hidden bg-black shrink-0 relative border border-border/60">
                                    <img
                                        src={v.thumbnail}
                                        alt={v.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                        <Play className="w-6 h-6 text-white/90 drop-shadow-md" />
                                    </div>
                                    <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1 py-0.2 rounded bg-black/70 text-white">
                                        9:16
                                    </span>
                                </div>

                                {/* Information */}
                                <div className="flex-1 flex flex-col justify-between py-0.5">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                {v.category}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {v.publishedAt}
                                            </span>
                                        </div>
                                        <h3 className="text-xs font-bold text-foreground leading-snug line-clamp-2">
                                            {v.title}
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground">
                                            {v.channelTitle} · 조회수 {v.viewsStr}
                                        </p>
                                    </div>

                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 dark:bg-emerald-500/15 p-1.5 rounded-lg">
                                        💡 {v.reason}
                                    </div>
                                </div>
                            </div>

                            {/* Action Bar */}
                            <div className="pt-2 border-t border-border/40 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onMakeShortsFromTrend) {
                                            onMakeShortsFromTrend(`[${v.title}] 유튜브 급상승 트렌드를 레퍼런스로 삼아, 4대 폼팩터 중 가장 반응이 좋은 형식으로 60초 쇼츠 대본과 영상을 만들어 줘.`);
                                        }
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>🎬 이 트렌드로 쇼츠 즉시 제작 발주</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
