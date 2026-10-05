import React from 'react';
import { 
    Cpu, 
    Share2, 
    DollarSign, 
    TrendingUp, 
    ShieldCheck, 
    ExternalLink, 
    RefreshCw, 
    ArrowUpRight,
    Users
} from 'lucide-react';
import { toast } from 'sonner';

interface ChannelStatusItem {
    id: string;
    channelName: string;
    category: string;
    subscriberCount: string;
    subDelta: string;
    estimatedRevenue: string;
    stealthIp: string;
    status: 'healthy' | 'warning';
}

const CHANNELS_DATA: ChannelStatusItem[] = [
    {
        id: 'ch-1',
        channelName: '글로벌 이슈 나침반',
        category: '지식 & 시사',
        subscriberCount: '48,200명',
        subDelta: '+1,240명',
        estimatedRevenue: '₩1,840,000 / 월',
        stealthIp: 'LTE 다중회선 (IP #14)',
        status: 'healthy'
    },
    {
        id: 'ch-2',
        channelName: '초단기 사이다 썰방',
        category: '엔터 & 썰',
        subscriberCount: '124,000명',
        subDelta: '+3,890명',
        estimatedRevenue: '₩4,520,000 / 월',
        stealthIp: 'LTE 다중회선 (IP #08)',
        status: 'healthy'
    },
    {
        id: 'ch-3',
        channelName: '인스타 감성 힐링 릴스',
        category: '라이프 & 힐링',
        subscriberCount: '21,500명',
        subDelta: '+620명',
        estimatedRevenue: '₩780,000 / 월',
        stealthIp: 'LTE 다중회선 (IP #22)',
        status: 'healthy'
    }
];

interface PixelingSourcesViewProps {
    onOpenWarRoom?: () => void;
}

export function PixelingSourcesView({ onOpenWarRoom }: PixelingSourcesViewProps) {
    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-6">
            <div className="max-w-5xl mx-auto w-full space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div>
                        <div className="flex items-center gap-2">
                            <Cpu className="w-5 h-5 text-blue-600" />
                            <h2 className="text-base font-bold text-foreground">채널 운영 & 오퍼레이션</h2>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            채널 운영 지표, 예상 수익 및 다중 회선 스텔스 육성 안전망을 모니터링합니다.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {onOpenWarRoom && (
                            <button
                                type="button"
                                onClick={onOpenWarRoom}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>워룸(War-Room) 전체 모니터링</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Financial & Operational Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2 shadow-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold">이번 달 예상 총수익</span>
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="text-2xl font-black text-foreground">₩7,140,000</div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>전월 대비 +18.4% 상승</span>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2 shadow-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold">총 구독자 합계</span>
                            <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-2xl font-black text-foreground">193,700명</div>
                        <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                            3개 채널 정상 성장 중
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2 shadow-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold">스텔스 방화벽 상태</span>
                            <ShieldCheck className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="text-2xl font-black text-foreground">100% 안전</div>
                        <div className="text-[11px] text-muted-foreground">
                            04_Profiles 세션 격리 보호
                        </div>
                    </div>
                </div>

                {/* Managed Channels Table */}
                <div className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-xs">
                    <div className="p-4 border-b border-border/60 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-foreground">
                            운영 채널 목록
                        </h3>
                        <button
                            type="button"
                            onClick={() => toast.success('채널 통계를 최신화했습니다.')}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <RefreshCw className="w-3 h-3" />
                            <span>새로고침</span>
                        </button>
                    </div>

                    <div className="divide-y divide-border/40">
                        {CHANNELS_DATA.map(ch => (
                            <div key={ch.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-foreground">{ch.channelName}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                                            {ch.category}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground font-mono">
                                        {ch.stealthIp}
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 text-xs">
                                    <div className="text-right">
                                        <div className="font-bold text-foreground">{ch.subscriberCount}</div>
                                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{ch.subDelta}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-foreground">{ch.estimatedRevenue}</div>
                                        <div className="text-[10px] text-muted-foreground">애드센스 추정</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
