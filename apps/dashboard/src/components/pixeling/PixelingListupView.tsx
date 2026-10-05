import React, { useState } from 'react';
import { 
    ListVideo, 
    Search, 
    Filter, 
    Sparkles, 
    Eye, 
    Clock, 
    CheckSquare, 
    Square, 
    ArrowUpRight,
    Video
} from 'lucide-react';
import { toast } from 'sonner';

interface ListedVideoItem {
    id: string;
    title: string;
    channelName: string;
    views: string;
    duration: string;
    publishedDate: string;
    thumbnail: string;
    selected: boolean;
}

const SAMPLE_LISTUP_VIDEOS: ListedVideoItem[] = [
    {
        id: 'lv-1',
        title: '대기업 면접관이 직접 밝힌 1초 탈락 지원자들의 치명적 공통점',
        channelName: '취업의 신',
        views: '142만회',
        duration: '08:45',
        publishedDate: '3일 전',
        thumbnail: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&auto=format&fit=crop&q=80',
        selected: false
    },
    {
        id: 'lv-2',
        title: '의사들이 절대 안 먹는다는 의외의 가공식품 3가지',
        channelName: '건강 라이프 3분',
        views: '98만회',
        duration: '05:12',
        publishedDate: '1주일 전',
        thumbnail: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80',
        selected: false
    },
    {
        id: 'lv-3',
        title: '2026년 하반기 부동산 폭락설? 실제 통계로 검증해 봤습니다',
        channelName: '경제 지식 나침반',
        views: '210만회',
        duration: '14:20',
        publishedDate: '4일 전',
        thumbnail: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop&q=80',
        selected: false
    }
];

interface PixelingListupViewProps {
    onBatchProduceShorts?: (videoTitles: string[]) => void;
}

export function PixelingListupView({ onBatchProduceShorts }: PixelingListupViewProps) {
    const [channelInput, setChannelInput] = useState<string>('@ViralMasterKorea');
    const [videos, setVideos] = useState<ListedVideoItem[]>(SAMPLE_LISTUP_VIDEOS);
    const [minViews, setMinViews] = useState<string>('50만');

    const toggleSelect = (id: string) => {
        setVideos(prev => prev.map(v => v.id === id ? { ...v, selected: !v.selected } : v));
    };

    const selectedCount = videos.filter(v => v.selected).length;

    const handleBatchProduce = () => {
        const selectedTitles = videos.filter(v => v.selected).map(v => v.title);
        if (selectedTitles.length === 0) {
            toast.error('쇼츠로 제작할 영상을 하나 이상 선택해 주세요.');
            return;
        }
        if (onBatchProduceShorts) {
            onBatchProduceShorts(selectedTitles);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-6">
            <div className="max-w-5xl mx-auto w-full space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div>
                        <div className="flex items-center gap-2">
                            <ListVideo className="w-5 h-5 text-blue-600" />
                            <h2 className="text-base font-bold text-foreground">채널 영상 조건별 리스트업</h2>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            채널과 프로필의 공개 영상을 조회수·게시일 등 조건별로 수집하고 쇼츠로 일괄 발주합니다.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleBatchProduce}
                            disabled={selectedCount === 0}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                                selectedCount > 0
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>선택 {selectedCount}개 영상 쇼츠 자동 발주</span>
                        </button>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3 shadow-xs">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <Video className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-red-600" />
                            <input
                                type="text"
                                value={channelInput}
                                onChange={e => setChannelInput(e.target.value)}
                                placeholder="유튜브 채널 URL 또는 @핸들 입력..."
                                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border/70 bg-background text-foreground focus:ring-1 focus:ring-blue-600 outline-hidden"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => toast.success(`[${channelInput}] 채널의 공개 영상을 조회했습니다.`)}
                            className="px-4 py-2 rounded-lg bg-foreground text-background text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                        >
                            영상 리스트업
                        </button>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center gap-1.5">
                            <Filter className="w-3.5 h-3.5" />
                            <span>최소 조회수 필터:</span>
                            <select
                                value={minViews}
                                onChange={e => setMinViews(e.target.value)}
                                className="bg-background border border-border/60 rounded px-2 py-0.5 text-foreground outline-hidden"
                            >
                                <option value="10만">10만회 이상</option>
                                <option value="50만">50만회 이상</option>
                                <option value="100만">100만회 이상</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Videos List */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground px-1">
                        <span>검색된 영상 ({videos.length}개)</span>
                        <button
                            type="button"
                            onClick={() => setVideos(prev => prev.map(v => ({ ...v, selected: !prev.every(x => x.selected) })))}
                            className="text-xs text-blue-600 hover:underline cursor-pointer"
                        >
                            전체 선택 / 해제
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                        {videos.map(v => (
                            <div
                                key={v.id}
                                onClick={() => toggleSelect(v.id)}
                                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                                    v.selected
                                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                                        : 'border-border/80 bg-card hover:bg-muted/40'
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <button
                                        type="button"
                                        className="text-muted-foreground hover:text-foreground shrink-0"
                                    >
                                        {v.selected ? (
                                            <CheckSquare className="w-4 h-4 text-blue-600" />
                                        ) : (
                                            <Square className="w-4 h-4" />
                                        )}
                                    </button>

                                    <div className="w-20 h-14 rounded-lg bg-black overflow-hidden shrink-0 relative">
                                        <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                                        <span className="absolute bottom-1 right-1 text-[8px] font-mono px-1 rounded bg-black/80 text-white">
                                            {v.duration}
                                        </span>
                                    </div>

                                    <div className="truncate space-y-0.5">
                                        <div className="text-xs font-bold text-foreground truncate">
                                            {v.title}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                            <span>{v.channelName}</span>
                                            <span>·</span>
                                            <span>조회수 {v.views}</span>
                                            <span>·</span>
                                            <span>{v.publishedDate}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-2">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold hidden sm:inline-block">
                                        쇼츠 3편 추출 가능
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
