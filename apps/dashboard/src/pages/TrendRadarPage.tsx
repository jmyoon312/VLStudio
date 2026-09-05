import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api, { 
    RadarCandidate, Category, ChannelWithReels, Channel,
    getChannelsWithReels, discoverLookalikeChannels, convertChannelToTarget 
} from '../lib/api';
import { 
    Radio, Zap, Sparkles, Check, X, ExternalLink, RefreshCw, 
    TrendingUp, Award, AlertCircle, ShieldAlert, ChevronRight,
    Loader2, Play, Eye, Flame, Filter, Folder, Compass, CheckCircle2,
    SlidersHorizontal, Layers, Clock, Users, Gem, ThumbsUp, Rocket, Target,
    LayoutGrid, Table, Search, CheckSquare, Square, ArrowUpDown, FilterX,
    Tv, ChevronDown, ChevronUp, Globe, DollarSign, Bookmark, Film,
    Share2, PlusCircle, ArrowRight, UserCheck, Bot, LineChart, Settings2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn, formatRelativeOrDate, formatShortDate } from '../lib/utils';
import { CategoryDNAModal } from '../components/shared/CategoryDNAModal';
import { TrendRadarDetailModal } from '../components/trend/TrendRadarDetailModal';
import { ChannelLaunchpadModal } from '../components/trend/ChannelLaunchpadModal';
import { ChannelAnatomyModal } from '../components/trend/ChannelAnatomyModal';
import { LiveDiscoveryFlash } from '../components/trend/LiveDiscoveryFlash';
import { ViralScouterQuantHUD } from '../components/trend/ViralScouterQuantHUD';
import { ScoutingFilterPopover, ScoutFilterConfig } from '../components/trend/ScoutingFilterPopover';
import { DualTrackScoutBalancer } from '../components/trend/DualTrackScoutBalancer';

const COUNTRY_PRESETS = [
    { code: 'ALL', name: '전체 국가', flag: '🌐' },
    { code: 'KR', name: '한국', flag: '🇰🇷' },
    { code: 'US', name: '미국', flag: '🇺🇸' },
    { code: 'JP', name: '일본', flag: '🇯🇵' },
    { code: 'TW', name: '대만', flag: '🇹🇼' },
    { code: 'VN', name: '베트남', flag: '🇻🇳' },
];

interface ChannelReelRowProps {
    ch: any;
    type: 'pending' | 'target' | 'candidate';
    aspectFormat: 'shorts' | 'long' | 'all';
    onOpenAnatomy: (ch: any) => void;
    onSelectReel: (reel: any, ch: any) => void;
    onApprovePending?: (ch: any) => void;
    onApproveCandidate?: (channelId: number) => void;
    onSpider?: (channelId: number) => void;
    isSpidering?: boolean;
    isOnboarding?: boolean;
    isConverting?: boolean;
}

const ChannelReelRow: React.FC<ChannelReelRowProps> = ({
    ch,
    type,
    aspectFormat,
    onOpenAnatomy,
    onSelectReel,
    onApprovePending,
    onApproveCandidate,
    onSpider,
    isSpidering,
    isOnboarding,
    isConverting
}) => {
    const borderClass = type === 'pending' 
        ? "border-indigo-500/30 hover:border-indigo-500/60" 
        : type === 'target' 
            ? "border-emerald-500/30 hover:border-emerald-500/60" 
            : "border-border/80 hover:border-amber-500/50";
    
    const cardBgClass = type === 'pending'
        ? "bg-indigo-50/20 dark:bg-indigo-950/20 border-indigo-500/20"
        : type === 'target'
            ? "bg-emerald-50/20 dark:bg-emerald-950/20 border-emerald-500/20"
            : "bg-amber-50/20 dark:bg-amber-950/20 border-amber-500/20";

    const badgeColor = type === 'pending'
        ? "text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/40 border-indigo-400/40"
        : type === 'target'
            ? "text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/40 border-emerald-400/40"
            : "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800";

    const statusText = type === 'pending' ? "등록 예정 📋" : type === 'target' ? "정기 수집 🟢" : "신규 옥석 ✨";

    return (
        <div className={cn(
            "p-3.5 sm:p-4 rounded-3xl bg-card border shadow-xs flex flex-col lg:flex-row items-stretch gap-3.5 transition-all",
            borderClass
        )}>
            {/* 좌측: 채널 정보 & AI 카테고리/상태 (우측 영상 릴 높이에 맞춰 1:1 완벽 정렬) */}
            <div className={cn(
                "w-full lg:w-96 shrink-0 flex flex-col justify-between p-3.5 rounded-2xl border gap-2.5 h-full min-h-[270px]",
                cardBgClass
            )}>
                {/* 1단: 아바타 + 이름 + 핸들 + 등급/상태 뱃지 */}
                <div className="flex items-center justify-between gap-2">
                    <div 
                        onClick={() => onOpenAnatomy(ch)}
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
                        title="클릭하여 채널 성장 분석 열기"
                    >
                        <div className="w-10 h-10 rounded-full bg-muted border border-border overflow-hidden shrink-0 group-hover:ring-2 group-hover:ring-primary transition-all">
                            <img 
                                src={ch.thumbnail_path || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
                                alt={ch.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";
                                }}
                            />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1">
                                <h3 className="text-sm font-black text-foreground truncate group-hover:text-primary transition-colors">
                                    {ch.name}
                                </h3>
                                <LineChart className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>
                            <p className="text-[11px] font-mono text-muted-foreground truncate">{ch.handle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-black",
                            ch.grade === 'S' ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-400/40" :
                            "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-400/40"
                        )}>
                            등급: {ch.grade}
                        </span>
                        <span className={cn("text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border", badgeColor)}>
                            {statusText}
                        </span>
                    </div>
                </div>

                {/* 2단: 4분할 콤팩트 실데이터 리본 */}
                <div className="grid grid-cols-4 gap-1 p-2 rounded-xl bg-card/80 border border-border/60 text-center shadow-xs">
                    <div>
                        <p className="text-[9.5px] text-muted-foreground">구독자</p>
                        <p className="text-xs font-black font-mono text-foreground mt-0.5">{ch.metrics?.subscribers}</p>
                    </div>
                    <div>
                        <p className="text-[9.5px] text-muted-foreground">일일조회</p>
                        <p className="text-xs font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">{ch.metrics?.daily_views}</p>
                    </div>
                    <div>
                        <p className="text-[9.5px] text-muted-foreground">하루수익</p>
                        <p className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">{ch.metrics?.daily_revenue}</p>
                    </div>
                    <div>
                        <p className="text-[9.5px] text-muted-foreground">영상수</p>
                        <p className="text-xs font-black font-mono text-foreground mt-0.5">{ch.metrics?.video_count}편</p>
                    </div>
                </div>

                {/* 3단: 카테고리/상태 박스 (좌) + 작고 압축적인 액션 버튼들 (우) */}
                <div className="flex items-center gap-2">
                    {type === 'pending' ? (
                        <>
                            <div className={cn(
                                "flex-1 min-w-0 p-2.5 rounded-xl border flex flex-col justify-center",
                                ch.recommendation?.is_new_cluster
                                    ? "bg-amber-50/50 dark:bg-amber-950/30 border-amber-400/40 text-amber-900 dark:text-amber-200"
                                    : "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-400/40 text-emerald-900 dark:text-emerald-200"
                            )}>
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                    <span className="flex items-center gap-1 truncate">
                                        {ch.recommendation?.is_new_cluster ? (
                                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        ) : (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        )}
                                        <span className="truncate">📂 [{ch.recommendation?.recommended_category_name}]</span>
                                    </span>
                                    <span className="font-mono text-[9.5px] bg-background/80 px-1 rounded border shrink-0">
                                        {ch.recommendation?.match_score}%
                                    </span>
                                </div>
                                <p className="text-[10px] opacity-80 line-clamp-1 mt-1 leading-snug">
                                    {ch.recommendation?.reason || "알고리즘 급상승 채널"}
                                </p>
                            </div>

                            <div className="shrink-0 flex flex-col gap-1.5 w-24 sm:w-28">
                                <Button
                                    size="sm"
                                    disabled={isOnboarding}
                                    onClick={() => onApprovePending && onApprovePending(ch)}
                                    className={cn(
                                        "h-7 text-[10.5px] font-black text-white rounded-xl shadow-xs cursor-pointer px-1.5 w-full",
                                        ch.recommendation?.is_new_cluster
                                            ? "bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700"
                                            : "bg-emerald-600 hover:bg-emerald-700"
                                    )}
                                >
                                    <CheckCircle2 className="w-3 h-3 mr-0.5 shrink-0" />
                                    {ch.recommendation?.is_new_cluster ? "신규 승인" : "즉시 승인"}
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onOpenAnatomy(ch)}
                                    className="h-6 text-[10px] font-bold border-border/80 hover:bg-muted text-foreground rounded-xl cursor-pointer flex items-center justify-center gap-0.5 px-1.5 w-full"
                                >
                                    <LineChart className="w-3 h-3 text-indigo-500 shrink-0" />
                                    성장 분석
                                </Button>
                            </div>
                        </>
                    ) : type === 'target' ? (
                        <>
                            <div className="flex-1 min-w-0 p-2.5 rounded-xl border border-emerald-400/30 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 flex flex-col justify-center">
                                <div className="flex items-center gap-1 text-[11px] font-bold truncate">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span className="truncate">정기 자동 수집 채널</span>
                                </div>
                                <p className="text-[10px] opacity-80 line-clamp-1 mt-1 leading-snug">
                                    최신 영상 주기적 자동 다운로드 & AI 해체
                                </p>
                            </div>

                            <div className="shrink-0 flex flex-col gap-1.5 w-24 sm:w-28">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onOpenAnatomy(ch)}
                                    className="h-7 text-[10.5px] font-bold border-border/80 hover:bg-muted text-foreground rounded-xl cursor-pointer flex items-center justify-center gap-0.5 px-1.5 w-full"
                                >
                                    <LineChart className="w-3 h-3 text-emerald-500 shrink-0" />
                                    성장 분석
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onSpider && onSpider(ch.channel_id)}
                                    disabled={isSpidering}
                                    className="h-6 text-[9.5px] font-bold border-border text-foreground hover:bg-muted rounded-xl cursor-pointer flex items-center justify-center gap-0.5 px-1 w-full"
                                >
                                    {isSpidering ? (
                                        <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" />
                                    ) : (
                                        <Bot className="w-2.5 h-2.5 text-primary shrink-0" />
                                    )}
                                    유사 발굴
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex-1 min-w-0 p-2.5 rounded-xl border border-amber-400/30 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 flex flex-col justify-center">
                                <div className="flex items-center gap-1 text-[11px] font-bold truncate">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span className="truncate">급상승 벤치마크 채널</span>
                                </div>
                                <p className="text-[10px] opacity-80 line-clamp-1 mt-1 leading-snug">
                                    승인 시 정기 수집 타겟으로 편입
                                </p>
                            </div>

                            <div className="shrink-0 flex flex-col gap-1.5 w-24 sm:w-28">
                                <Button
                                    size="sm"
                                    onClick={() => onApproveCandidate && onApproveCandidate(ch.channel_id)}
                                    disabled={isConverting}
                                    className="h-7 text-[10.5px] font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer px-1.5 w-full"
                                >
                                    <CheckCircle2 className="w-3 h-3 mr-0.5 shrink-0" />
                                    타겟 승인
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onOpenAnatomy(ch)}
                                    className="h-6 text-[10px] font-bold border-border/80 hover:bg-muted text-foreground rounded-xl cursor-pointer flex items-center justify-center gap-0.5 px-1.5 w-full"
                                >
                                    <LineChart className="w-3 h-3 text-blue-500 shrink-0" />
                                    성장 분석
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 우측: 영상 릴 그리드 (쇼츠: 6개 꽉차게 9:16 전면 이미지 / 롱폼: 3개 꽉차게 전면 이미지) */}
            <div className={cn(
                "flex-1 min-w-0 grid gap-2.5 items-stretch w-full",
                aspectFormat === 'long' 
                    ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" 
                    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-6"
            )}>
                {((ch.reels || []).slice(0, aspectFormat === 'long' ? 3 : 6)).map((reel: any, rIdx: number) => (
                    <div 
                        key={rIdx}
                        onClick={() => onSelectReel(reel, ch)}
                        className={cn(
                            "group relative rounded-2xl overflow-hidden bg-black border border-border/80 hover:border-primary transition-all cursor-pointer shadow-xs flex flex-col justify-between p-2.5",
                            aspectFormat === 'long' 
                                ? "h-full min-h-[260px] w-full" 
                                : "aspect-[9/16] w-full"
                        )}
                    >
                        {/* 배경 전면 썸네일 이미지 (이전 버전 복원) */}
                        <img 
                            src={reel.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80"} 
                            alt={reel.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85"
                            onError={(e) => {
                                e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80";
                            }}
                        />
                        {/* 다크 그라디언트 오버레이 */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/60 pointer-events-none" />

                        {/* 상단 뱃지 */}
                        <div className="relative z-10 flex items-center justify-between">
                            <span className="w-5 h-5 rounded-full bg-black/80 text-white font-mono text-[10px] font-black flex items-center justify-center border border-white/20">
                                {rIdx + 1}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-black bg-rose-600 text-white shadow-xs">
                                🔥 {reel.outlier_ratio}x
                            </span>
                        </div>

                        {/* 하단 텍스트 및 메트릭 (전면 이미지 위에 텍스트 부양) */}
                        <div className="relative z-10 space-y-1">
                            <h4 className="text-[11px] font-bold text-white line-clamp-2 leading-tight group-hover:text-amber-300 transition-colors">
                                {reel.title}
                            </h4>
                            <div className="flex items-center justify-between text-[10px] font-mono text-white/80 pt-0.5 border-t border-white/10">
                                <span>{reel.view_count >= 10000 ? `${(reel.view_count / 10000).toFixed(1)}만회` : `${reel.view_count}회`}</span>
                                <span>{reel.duration_text || (aspectFormat === 'long' ? '11:20' : '0:45')}</span>
                            </div>
                            <div className="flex items-center justify-between text-[9px] font-mono pt-0.5 border-t border-white/10">
                                <span className="text-amber-300 font-bold flex items-center gap-0.5 truncate" title={`영상 업로드 일자: ${reel.published_at || '최근'}`}>
                                    📅 {formatRelativeOrDate(reel.published_at)}
                                </span>
                                <span className="text-sky-300/80 flex items-center gap-0.5 shrink-0" title={`시스템 수집 일자: ${reel.created_at || '최근'}`}>
                                    📥 {formatShortDate(reel.created_at)}
                                </span>
                            </div>
                            {aspectFormat === 'long' && reel.hook_analysis && (
                                <div className="p-1 rounded bg-black/60 backdrop-blur-xs border border-white/10 text-[9.5px] text-white/90 truncate mt-1">
                                    💡 {reel.hook_analysis}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TrendRadarPage: React.FC = () => {
    const queryClient = useQueryClient();
    
    // ── 4단계 파이프라인 퍼널 상태 (Pipeline Stepper) ─────────────
    // Step 1: 'signals' (바이럴 시그널 발굴)
    // Step 2: 'reels' (벤치마크 채널 릴 해체)
    // Step 3: 'incubator' (카테고리 클러스터 & DNA)
    // Step 4: 'launchpad' (신설 채널 론치패드)
    const [pipelineStep, setPipelineStep] = useState<'signals' | 'reels' | 'incubator' | 'launchpad'>('reels');

    // ── 포맷 토글: 쇼츠 (9:16) vs 롱폼 (16:9) ──────────────────────
    const [aspectFormat, setAspectFormat] = useState<'shorts' | 'long' | 'all'>('shorts');

    // ── 필터 및 뷰 모드 ──────────────────────────────────────────
    const [viewMode, setViewMode] = useState<'reel' | 'grid' | 'table'>('reel');
    const [selectedTag, setSelectedTag] = useState<string>('pending');
    const [isTagBarExpanded, setIsTagBarExpanded] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isScanning, setIsScanning] = useState(false);
    const [spideringChannelId, setSpideringChannelId] = useState<number | null>(null);

    // ── 정밀 제약 조건 매트릭스 상태 (Persistence 지원) ───────────
    const [filterConfig, setFilterConfig] = useState<ScoutFilterConfig>(() => {
        try {
            const saved = localStorage.getItem('vlstudio_scout_filter_matrix');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    includeLangs: parsed.includeLangs || ['ko', 'en', 'ja'],
                    excludeLangs: parsed.excludeLangs || ['hi', 'vi', 'ar', 'ru'],
                    uploadDateRange: parsed.uploadDateRange || parsed.dateRange || '30d',
                    collectedDateRange: parsed.collectedDateRange || 'all',
                    dateRange: parsed.uploadDateRange || parsed.dateRange || '30d',
                    minOutlier: parsed.minOutlier || 3.0,
                    minViews: parsed.minViews || 50000,
                    durationRange: parsed.durationRange || 'all'
                };
            }
        } catch {}
        return {
            includeLangs: ['ko', 'en', 'ja'],
            excludeLangs: ['hi', 'vi', 'ar', 'ru'],
            uploadDateRange: '30d',
            collectedDateRange: 'all',
            dateRange: '30d',
            minOutlier: 3.0,
            minViews: 50000,
            durationRange: 'all'
        };
    });

    // ── 모달 상태 ───────────────────────────────────────────────
    const [selectedCandidateForDetail, setSelectedCandidateForDetail] = useState<RadarCandidate | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    
    const [selectedChannelForAnatomy, setSelectedChannelForAnatomy] = useState<{ id: number; name: string } | null>(null);
    const [isAnatomyModalOpen, setIsAnatomyModalOpen] = useState(false);

    const [isLaunchpadModalOpen, setIsLaunchpadModalOpen] = useState(false);
    const [launchpadCategory, setLaunchpadCategory] = useState<Category | null>(null);

    const [isDNAModalOpen, setIsDNAModalOpen] = useState(false);
    const [dnaCategory, setDnaCategory] = useState<Category | null>(null);

    const [showUnassignedSeeds, setShowUnassignedSeeds] = useState(false);

    // 1. 카테고리 목록 (DB 실제 카테고리)
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => (await api.get<Category[]>('/categories/')).data || []
    });

    // 1-B. 채널 보관함 전체 타겟 채널 목록 (Single Source of Truth)
    const { data: channels = [] } = useQuery({
        queryKey: ['channels'],
        queryFn: async () => (await api.get<Channel[]>('/channels/')).data || []
    });

    // 2. 바이럴 후보군 (Step 1용 - 고속 캐싱 & 백그라운드 동기화)
    const { data: rawCandidates = [], isLoading: isLoadingCandidates, isFetching: isFetchingCandidates } = useQuery({
        queryKey: ['radar-candidates', aspectFormat, filterConfig],
        queryFn: async () => {
            const params: any = { 
                video_type: aspectFormat,
                exclude_langs: filterConfig.excludeLangs.join(','),
                include_langs: filterConfig.includeLangs.join(','),
                min_outlier: filterConfig.minOutlier,
                min_views: filterConfig.minViews,
                upload_date_range: filterConfig.uploadDateRange !== 'all' ? filterConfig.uploadDateRange : undefined,
                collected_date_range: filterConfig.collectedDateRange !== 'all' ? filterConfig.collectedDateRange : undefined
            };
            const res = await api.get<RadarCandidate[]>('/trend-radar/candidates', { params });
            return res.data || [];
        },
        placeholderData: keepPreviousData,
        staleTime: 15000,
        refetchInterval: 25000
    });

    // 3. 채널 릴 데이터 (Step 2용 - 고속 캐싱 & Zero-Network I/O 동기화)
    const { data: channelsWithReels = [], isLoading: isLoadingReels, isFetching: isFetchingReels } = useQuery({
        queryKey: ['channels-with-reels', aspectFormat, filterConfig.uploadDateRange, filterConfig.collectedDateRange],
        queryFn: () => getChannelsWithReels(undefined, aspectFormat, 30, filterConfig.uploadDateRange, filterConfig.collectedDateRange),
        placeholderData: keepPreviousData,
        staleTime: 15000,
        refetchInterval: 25000
    });

    // 4. 통계 데이터
    const { data: stats } = useQuery({
        queryKey: ['radar-stats'],
        queryFn: async () => (await api.get('/trend-radar/stats')).data,
        staleTime: 30000
    });

    // ── 스카우터 자율 스캔 가동 ────────────────────────────────────
    const scanMutation = useMutation({
        mutationFn: async () => {
            setIsScanning(true);
            return (await api.post('/trend-radar/scan', {
                video_type: aspectFormat,
                limit: 10
            })).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['radar-candidates'] });
            queryClient.invalidateQueries({ queryKey: ['channels-with-reels'] });
            queryClient.invalidateQueries({ queryKey: ['radar-stats'] });
            setIsScanning(false);
        },
        onError: (err: any) => {
            setIsScanning(false);
            alert('스카우터 탐색 오류: ' + (err.response?.data?.detail || err.message));
        }
    });

    // 3-B. 등록 예정 후보 채널 (AI 카테고리 분류 추천 대기열 - Zero-Network I/O)
    const { data: pendingChannels = [], isLoading: isLoadingPending, isFetching: isFetchingPending } = useQuery({
        queryKey: ['pending-channels', aspectFormat, filterConfig.uploadDateRange, filterConfig.collectedDateRange],
        queryFn: async () => {
            const res = await api.get('/trend-radar/pending-channels', { 
                params: { 
                    video_type: aspectFormat,
                    upload_date_range: filterConfig.uploadDateRange !== 'all' ? filterConfig.uploadDateRange : undefined,
                    collected_date_range: filterConfig.collectedDateRange !== 'all' ? filterConfig.collectedDateRange : undefined
                } 
            });
            return res.data || [];
        },
        placeholderData: keepPreviousData,
        staleTime: 15000,
        refetchInterval: 25000
    });

    const isBackgroundRefreshing = isFetchingCandidates || isFetchingReels || isFetchingPending;

    // ── 수집 영상 보관함 규격: 가상 청크 렌더링 (Visible Count & Scroll Observer) ──
    const [visibleChannelsCount, setVisibleChannelsCount] = useState<number>(8);
    const observerTargetRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setVisibleChannelsCount(8);
    }, [selectedTag, aspectFormat, viewMode, pipelineStep]);

    useEffect(() => {
        if (!observerTargetRef.current) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setVisibleChannelsCount(prev => prev + 8);
            }
        }, { threshold: 0.1 });
        observer.observe(observerTargetRef.current);
        return () => observer.disconnect();
    }, [selectedTag, aspectFormat, viewMode, pipelineStep, pendingChannels.length, channelsWithReels.length]);

    // ── AI 카테고리 승격 / 신규 카테고리 1클릭 온보딩 ───────────────
    const onboardMutation = useMutation({
        mutationFn: async (payload: { channel_name: string; category_id?: number; new_category_name?: string; persona_target?: string; content_tone?: string }) => {
            const res = await api.post('/trend-radar/onboard-pending-channel', payload);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['pending-channels'] });
            queryClient.invalidateQueries({ queryKey: ['channels-with-reels'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            alert(data.message || '타겟 채널로 승격 등록되었습니다!');
        },
        onError: (err: any) => {
            alert('등록 실패: ' + (err.response?.data?.detail || err.message));
        }
    });

    // ── 인간 검토 게이트: 타겟 채널 승인 & 정기 수집 전환 ──────────────
    const convertTargetMutation = useMutation({
        mutationFn: async (channelId: number) => {
            return await convertChannelToTarget(channelId);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['channels-with-reels'] });
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            queryClient.invalidateQueries({ queryKey: ['radar-candidates'] });
            alert(data.message || '정식 타겟 채널로 승인되었습니다! 주기적 자동 수집이 가동됩니다.');
        },
        onError: (err: any) => {
            alert('타겟 채널 전환 실패: ' + (err.response?.data?.detail || err.message));
        }
    });

    // ── AI 유사 채널 10개 자동 확장 탐색 (Spidering) ────────────────
    const spiderMutation = useMutation({
        mutationFn: async (channelId: number) => {
            setSpideringChannelId(channelId);
            return await discoverLookalikeChannels(channelId);
        },
        onSuccess: (data) => {
            setSpideringChannelId(null);
            queryClient.invalidateQueries({ queryKey: ['channels-with-reels'] });
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            alert(`[AI 유사 채널 확장 완료]\n'${data.seed_channel}' 기준 유사 옥석 채널 ${data.discovered_count}개를 발굴하여 카테고리에 편입했습니다!`);
        },
        onError: (err: any) => {
            setSpideringChannelId(null);
            alert('유사 채널 확장 오류: ' + (err.response?.data?.detail || err.message));
        }
    });

    const [deepSpideringVideoId, setDeepSpideringVideoId] = useState<string | null>(null);

    // ── 롱폼 전용 AI 유사 롱폼 10편 + 채널 3개 심층 스파이더링 ───────
    const deepSpiderMutation = useMutation({
        mutationFn: async (videoId: string) => {
            setDeepSpideringVideoId(videoId);
            return (await api.post('/trend-radar/spider-deep', { video_id: videoId, count: 10 })).data;
        },
        onSuccess: (data) => {
            setDeepSpideringVideoId(null);
            queryClient.invalidateQueries({ queryKey: ['radar-candidates'] });
            queryClient.invalidateQueries({ queryKey: ['channels-with-reels'] });
            alert(`[롱폼 클러스터 스파이더링 완료]\n'${data.keyword}' 기준 유사 롱폼 ${data.discovered_videos_count}편 및 신규 니치 채널 ${data.discovered_channels_count}개를 발굴했습니다!`);
        },
        onError: (err: any) => {
            setDeepSpideringVideoId(null);
            alert('롱폼 스파이더링 실패: ' + (err.response?.data?.detail || err.message));
        }
    });

    // ── 카테고리 대표 채널 기반 유튜브 추천망 스파이더링 ───────────
    const spiderCategoryMutation = useMutation({
        mutationFn: async (categoryId: number) => {
            const res = await api.post(`/categories/${categoryId}/spider-from-channels?limit=15`);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['radar-candidates'] });
            queryClient.invalidateQueries({ queryKey: ['channels-with-reels'] });
            alert(data.message || '유튜브 추천망 스파이더링이 완료되었습니다!');
        },
        onError: (err: any) => {
            alert(`추천망 발굴 실패: ${err?.response?.data?.detail || err.message}`);
        }
    });

    // ── 카테고리 시드 3대 계층 구조화 (Single Source of Truth) ──
    const { specialViews, activeCatTags, unassignedCatTags } = useMemo(() => {
        const totalTargetChans = channels.length;
        const gemVideos = (rawCandidates || []).filter(c => c && c.outlier_ratio >= 4.0);
        const gemCount = gemVideos.length;
        const gemChannelsCount = new Set(gemVideos.map(v => v.channel_title)).size;

        const special = [
            { id: 'all', label: '전체 (All)', count: `${totalTargetChans}채널`, isSpecial: true, tooltip: '전체 등록 타겟 채널 및 추천 영상' },
            { id: 'gems', label: '💎 고배수 옥석', count: `${gemCount}편`, isSpecial: true, tooltip: `4배 이상 터진 초고성과 영상 ${gemCount}편 (${gemChannelsCount}개 채널 보유)` },
            { id: 'pending', label: '📋 등록 대기 큐', count: `${pendingChannels.length}채널`, isSpecial: true, tooltip: 'AI 스카우터가 발굴한 미등록 후보 채널' },
        ];

        const active: any[] = [];
        const unassigned: any[] = [];

        (categories || []).forEach(cat => {
            const tCount = cat.target_channels_count || 0;
            const tag = {
                id: String(cat.id),
                label: cat.name,
                count: tCount > 0 ? `🟢 ${tCount}채널` : `0채널`,
                targetCount: tCount,
                hasTarget: tCount > 0,
                isSpecial: false,
                rawCat: cat
            };
            if (tCount > 0) {
                active.push(tag);
            } else {
                unassigned.push(tag);
            }
        });

        return { specialViews: special, activeCatTags: active, unassignedCatTags: unassigned };
    }, [categories, channels, pendingChannels, rawCandidates]);

    // ── Step 2 채널 릴: 2-Tier 분할 (🟢 기등록 타겟 채널 vs ✨ 신규 발굴 옥석) ──
    const { targetChannels, candidateChannels } = useMemo(() => {
        let list = channelsWithReels || [];
        if (selectedTag === 'gems') {
            // 고배수 옥석 선택 시: rawCandidates(72~73편)의 모든 옥석 영상들을 채널별로 완벽 그룹핑
            const gems = (rawCandidates || []).filter(c => c && c.outlier_ratio >= 4.0);
            const map = new Map<string, any>();
            gems.forEach(g => {
                const ch = g.channel_title || '미지정 채널';
                if (!map.has(ch)) {
                    map.set(ch, {
                        channel_id: Math.abs(ch.split('').reduce((acc, c) => (acc << 5) - acc + c.charCodeAt(0), 0)) % 1000000,
                        name: ch,
                        handle: `@${ch.replace(/\s+/g, '').toLowerCase()}`,
                        thumbnail_path: g.thumbnail_url,
                        auto_download: false,
                        grade: g.outlier_ratio >= 7.0 ? 'S' : 'A',
                        metrics: {
                            subscribers: (g.channel_subscribers && g.channel_subscribers !== '0') ? g.channel_subscribers : '스카우트 발굴',
                            daily_views: `+${(g.view_count || 100000).toLocaleString()}`,
                            daily_revenue: '분석 중',
                            total_views: `${(g.view_count || 100000).toLocaleString()}회`,
                            video_count: 0,
                            trend_status: `${g.outlier_ratio}x 옥석 보유 🔥`
                        },
                        reels: []
                    });
                }
                const chObj = map.get(ch);
                chObj.metrics.video_count += 1;
                chObj.reels.push({
                    id: g.id,
                    video_id: g.video_id,
                    title: g.title,
                    thumbnail_url: g.thumbnail_url,
                    view_count: g.view_count,
                    duration: 60,
                    duration_text: g.duration_text || (aspectFormat === 'long' ? '11:20' : '0:45'),
                    outlier_ratio: g.outlier_ratio,
                    published_at: g.published_at,
                    created_at: g.created_at,
                    hook_analysis: g.hook_analysis || '초반 2.5초 핵심 패턴 인터럽트'
                });
            });
            list = Array.from(map.values());
        } else if (selectedTag && selectedTag !== 'all' && selectedTag !== 'pending') {
            const targetCat = (categories || []).find(cat => String(cat.id) === selectedTag || cat.name === selectedTag);
            if (targetCat) {
                const subIds = (categories || []).filter(c => c.parent_id === targetCat.id).map(c => String(c.id));
                const matchIds = new Set([String(targetCat.id), ...subIds]);

                list = list.filter(ch => 
                    (ch.category_id && matchIds.has(String(ch.category_id))) || 
                    ch.name.toLowerCase().includes(targetCat.name.toLowerCase())
                );
            }
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(ch => ch.name.toLowerCase().includes(q) || ch.handle.toLowerCase().includes(q));
        }
        return {
            targetChannels: list.filter(ch => ch.auto_download === true),
            candidateChannels: list.filter(ch => ch.auto_download !== true)
        };
    }, [channelsWithReels, selectedTag, categories, searchQuery]);

    // 필터링된 영상 목록 (포맷, 검색어, 카테고리 태그 반영)
    const filteredCandidates = useMemo(() => {
        if (!Array.isArray(rawCandidates)) return [];
        return rawCandidates.filter(c => {
            if (!c) return false;
            if (aspectFormat === 'shorts' && c.video_type !== 'shorts') return false;
            if (aspectFormat === 'long' && c.video_type !== 'long') return false;
            
            // 카테고리 태그 필터
            if (selectedTag === 'pending') {
                if (c.status === 'approved') return false;
            } else if (selectedTag && selectedTag !== 'all' && selectedTag !== 'gems') {
                const targetCat = (categories || []).find(cat => String(cat.id) === selectedTag || cat.name === selectedTag);
                if (targetCat) {
                    const catName = targetCat.name.toLowerCase();
                    const matchTitle = (c.title || '').toLowerCase().includes(catName);
                    const matchHook = (c.hook_analysis || '').toLowerCase().includes(catName);
                    if (!matchTitle && !matchHook) return false;
                }
            } else if (selectedTag === 'gems') {
                if (c.outlier_ratio < 4.0) return false;
            }

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = (c.title || '').toLowerCase().includes(q);
                const matchChannel = (c.channel_title || '').toLowerCase().includes(q);
                if (!matchTitle && !matchChannel) return false;
            }
            return true;
        });
    }, [rawCandidates, aspectFormat, searchQuery, selectedTag, categories]);

    // 스타 옥석 영상 (상단 루피 픽)
    const starCandidate = useMemo(() => {
        if (!Array.isArray(rawCandidates) || rawCandidates.length === 0) return null;
        return [...rawCandidates].sort((a, b) => b.outlier_ratio - a.outlier_ratio)[0];
    }, [rawCandidates]);

    const activeCatObj = useMemo(() => {
        if (selectedTag && selectedTag !== 'all' && selectedTag !== 'pending' && selectedTag !== 'gems') {
            return (categories || []).find(cat => String(cat.id) === selectedTag || cat.name === selectedTag) || categories[0] || null;
        }
        return categories[0] || null;
    }, [categories, selectedTag]);

    return (
        <div className="w-full min-h-screen bg-background text-foreground flex flex-col p-4 sm:p-6 space-y-4 pb-32">
            {/* 1. 최상단 헤더 & LIVE 옥석 포착 플래시 롤링 위젯 */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-card/60 backdrop-blur-md border border-border/80 p-4 sm:p-5 rounded-3xl shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                            <Compass className="w-5 h-5 animate-pulse" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                            <span>바이럴 스카우터</span>
                        </h1>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        초고속 알고리즘 스캔 ─▶ 벤치마크 릴 해체 ─▶ 롱폼 자율 스파이더링 ─▶ 정기수집 승인 ─▶ 신설 론치패드
                    </p>
                </div>

                {/* 2초 주기 매끄러운 슬라이드 LIVE 옥석 포착 플래시 위젯 */}
                <LiveDiscoveryFlash 
                    candidates={rawCandidates}
                    onSelectCandidate={(c) => {
                        setSelectedCandidateForDetail(c);
                        setIsDetailModalOpen(true);
                    }}
                />
            </div>

            {/* 2. 🔥 FSD 퀀트 실시간 관제 센터 (High-Density Quant Ribbon) */}
            <ViralScouterQuantHUD filterConfig={filterConfig} />

            {/* 3. ⚙️ [듀얼 트랙 자율 수집 밸런서 50% : 50% 정밀 스카우트 제약 조건 매트릭스] */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
                {/* 좌측 50%: 듀얼 트랙 자율 수집 밸런서 */}
                <DualTrackScoutBalancer />

                {/* 우측 50%: 정밀 스카우트 제약 조건 매트릭스 */}
                <div className="bg-card/40 border border-border/70 rounded-2xl p-3 sm:px-4 sm:py-2.5 flex flex-col justify-between space-y-2 h-full shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <ScoutingFilterPopover 
                                config={filterConfig}
                                onChange={(newCfg) => setFilterConfig(newCfg)}
                                aspectFormat={aspectFormat}
                            />
                        </div>
                        <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                            ● 실시간 필터 가동 중
                        </span>
                    </div>

                    <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5 pt-0.5">
                        <span className="text-amber-700 dark:text-amber-400 font-bold">⚡ 자동 차단:</span>
                        <span className="text-foreground/80 dark:text-muted-foreground font-medium">인도(데바나가리)·아랍어·키릴·베트남어 유니코드 즉시 제외</span>
                    </div>
                </div>
            </div>

            {/* 2. 🔥 4단계 비즈니스 파이프라인 스테퍼 바 (4-Step Pipeline Stepper Funnel) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-muted/30 border border-border/80 p-2 rounded-2xl">
                {/* Step 1: 시그널 레이더 */}
                <button
                    onClick={() => { setPipelineStep('signals'); setViewMode('grid'); }}
                    className={cn(
                        "p-3 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer",
                        pipelineStep === 'signals' 
                            ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-500/30" 
                            : "hover:bg-muted/50 text-muted-foreground"
                    )}
                >
                    <div>
                        <span className="text-[10px] font-mono font-bold block opacity-80">STEP 1</span>
                        <h4 className="text-xs font-black">📡 바이럴 시그널 레이더</h4>
                    </div>
                    <span className={cn(
                        "text-[10.5px] font-mono px-2 py-0.5 rounded-full font-bold",
                        pipelineStep === 'signals' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    )}>
                        {(stats?.total_discovered || (rawCandidates || []).length).toLocaleString()}건
                    </span>
                </button>

                {/* Step 2: 벤치마크 옥석 인큐베이터 */}
                <button
                    onClick={() => { setPipelineStep('reels'); setViewMode('reel'); }}
                    className={cn(
                        "p-3 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer",
                        pipelineStep === 'reels' 
                            ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-500/30" 
                            : "hover:bg-muted/50 text-muted-foreground"
                    )}
                >
                    <div>
                        <span className="text-[10px] font-mono font-bold block opacity-80">STEP 2</span>
                        <h4 className="text-xs font-black">🏢 벤치마크 옥석 인큐베이터</h4>
                    </div>
                    <span className={cn(
                        "text-[10.5px] font-mono px-2 py-0.5 rounded-full font-bold",
                        pipelineStep === 'reels' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    )}>
                        {(stats?.pending_channels_count || (channelsWithReels || []).length)}채널
                    </span>
                </button>

                {/* Step 3: 엄선 카테고리 보관함 */}
                <button
                    onClick={() => setPipelineStep('incubator')}
                    className={cn(
                        "p-3 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer",
                        pipelineStep === 'incubator' 
                            ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-500/30" 
                            : "hover:bg-muted/50 text-muted-foreground"
                    )}
                >
                    <div>
                        <span className="text-[10px] font-mono font-bold block opacity-80">STEP 3</span>
                        <h4 className="text-xs font-black">📂 엄선 카테고리 보관함</h4>
                    </div>
                    <span className={cn(
                        "text-[10.5px] font-mono px-2 py-0.5 rounded-full font-bold",
                        pipelineStep === 'incubator' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    )}>
                        {(categories || []).length}분야
                    </span>
                </button>

                {/* Step 4: 내 채널 기획 론치패드 */}
                <button
                    onClick={() => { setPipelineStep('launchpad'); setLaunchpadCategory(activeCatObj); }}
                    className={cn(
                        "p-3 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer",
                        pipelineStep === 'launchpad'
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md ring-2 ring-indigo-500/30"
                            : "bg-gradient-to-r from-indigo-600/10 to-purple-600/10 hover:from-indigo-600/20 hover:to-purple-600/20 border border-indigo-500/30 text-indigo-400"
                    )}
                >
                    <div>
                        <span className={cn("text-[10px] font-mono font-bold block", pipelineStep === 'launchpad' ? "text-white/80" : "text-indigo-300")}>STEP 4</span>
                        <h4 className="text-xs font-black flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            내 채널 기획 론치패드
                        </h4>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            {/* 3. 엄선 전문가 엄선 마이크로 카테고리 시드 태그 바 */}
            <div className="bg-card/40 border border-border/80 p-3 sm:p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-black text-muted-foreground">
                        <Folder className="w-3.5 h-3.5 text-blue-500" />
                        <span>엄선 카테고리 시드 (Vetted Categories)</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* 검색창 */}
                        <div className="relative w-44 sm:w-60">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="채널/키워드/3초 훅 검색..."
                                className="w-full pl-8 pr-3 py-1 text-xs bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        {/* 선택된 카테고리 추천망 스파이더링 버튼 */}
                        {activeCatObj && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => spiderCategoryMutation.mutate(activeCatObj.id)}
                                disabled={spiderCategoryMutation.isPending}
                                className="h-7 text-[11px] font-black bg-purple-600/10 hover:bg-purple-600/20 border-purple-500/30 text-purple-600 dark:text-purple-300 shadow-xs rounded-xl cursor-pointer"
                                title={`'${activeCatObj.name}' 카테고리의 대표 채널들을 기반으로 유튜브 추천망을 스파이더링합니다.`}
                            >
                                {spiderCategoryMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin text-purple-400" />
                                        추천망 탐색 중...
                                    </>
                                ) : (
                                    <>
                                        <Target className="w-3 h-3 mr-1 text-purple-400" />
                                        🎯 @대표채널 추천망 발굴
                                    </>
                                )}
                            </Button>
                        )}

                        {/* 신설 채널 개설 모달 트리거 */}
                        <Button
                            size="sm"
                            onClick={() => { setLaunchpadCategory(activeCatObj); setIsLaunchpadModalOpen(true); }}
                            className="h-7 text-[11px] font-black bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xs rounded-xl cursor-pointer"
                        >
                            <Sparkles className="w-3 h-3 mr-1" />
                            신설 채널 론칭 패키지
                        </Button>

                        <button 
                            onClick={() => setIsTagBarExpanded(!isTagBarExpanded)}
                            className="p-1 rounded-lg hover:bg-muted text-muted-foreground text-xs flex items-center gap-0.5 cursor-pointer"
                        >
                            {isTagBarExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* 칩 리스트: 3대 계층 구조화 (특수 뷰 / 🟢 활성 카테고리 / ⚪ 미배정 시드) */}
                <div className={cn(
                    "flex flex-wrap items-center gap-2 transition-all",
                    !isTagBarExpanded && "max-h-[84px] overflow-hidden"
                )}>
                    {/* 그룹 1: 퀵 뷰 & 큐 (전체, 고배수 옥석, 등록 대기) */}
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 border border-border/60 shrink-0">
                        {specialViews.map(tag => {
                            const isSelected = selectedTag === tag.id;
                            return (
                                <button
                                    key={tag.id}
                                    onClick={() => {
                                        setSelectedTag(tag.id);
                                        if (tag.id === 'gems') {
                                            setPipelineStep('reels');
                                            setViewMode('grid');
                                        } else if (tag.id === 'pending') {
                                            setPipelineStep('reels');
                                            setViewMode('reel');
                                        }
                                    }}
                                    title={tag.tooltip}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                                        isSelected 
                                            ? tag.id === 'gems' ? "bg-amber-500 text-black shadow-xs ring-2 ring-amber-400/40"
                                              : tag.id === 'pending' ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/40"
                                              : "bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/30" 
                                            : tag.id === 'gems'
                                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30"
                                                : tag.id === 'pending'
                                                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30"
                                                    : "bg-background hover:bg-muted text-foreground border border-border/70"
                                    )}
                                >
                                    <span>{tag.label}</span>
                                    <span className={cn(
                                        "text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold",
                                        isSelected ? "bg-black/20 text-white" : "bg-muted text-muted-foreground"
                                    )}>
                                        {tag.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="h-5 w-px bg-border/80 shrink-0 hidden sm:block" />

                    {/* 그룹 2: 🟢 활성 타겟 카테고리 (등록 채널 보유) */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {activeCatTags.map(tag => {
                            const isSelected = selectedTag === tag.id;
                            return (
                                <button
                                    key={tag.id}
                                    onClick={() => {
                                        setSelectedTag(tag.id);
                                        api.post('/trend-radar/worker/focus', { category_name: tag.label }).catch(() => {});
                                    }}
                                    className={cn(
                                        "px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                                        isSelected 
                                            ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30" 
                                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30"
                                    )}
                                >
                                    <span>{tag.label}</span>
                                    <span className={cn(
                                        "text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold",
                                        isSelected ? "bg-white/20 text-white" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                    )}>
                                        {tag.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* 그룹 3: ⚪ 시드 미배정 카테고리 (0채널 - 접기/펼치기 토글) */}
                    {unassignedCatTags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                onClick={() => setShowUnassignedSeeds(!showUnassignedSeeds)}
                                className={cn(
                                    "px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0 border",
                                    showUnassignedSeeds 
                                        ? "bg-muted text-foreground border-border" 
                                        : "bg-muted/30 hover:bg-muted text-muted-foreground border-dashed border-border/70"
                                )}
                            >
                                <span>{showUnassignedSeeds ? "미배정 시드 접기" : `+ 시드 발굴 대기 (${unassignedCatTags.length})`}</span>
                                {showUnassignedSeeds ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {showUnassignedSeeds && unassignedCatTags.map(tag => {
                                const isSelected = selectedTag === tag.id;
                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => {
                                            setSelectedTag(tag.id);
                                            api.post('/trend-radar/worker/focus', { category_name: tag.label }).catch(() => {});
                                        }}
                                        className={cn(
                                            "px-2.5 py-1 rounded-xl text-xs font-normal transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                                            isSelected 
                                                ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30" 
                                                : "bg-muted/20 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
                                        )}
                                    >
                                        <span>{tag.label}</span>
                                        <span className="text-[10px] font-mono px-1 py-0.2 rounded-full bg-muted/60 text-muted-foreground/80">
                                            0채널
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* 4. 컨트롤 바: 쇼츠(9:16) / 롱폼(16:9) 듀얼 토글 및 뷰 모드 */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-card/40 border border-border/70 p-3 rounded-2xl">
                {/* 좌측: 포맷 듀얼 토글 스위치 (PixelLab Shorts vs Longform) */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
                        <button
                            onClick={() => setAspectFormat('shorts')}
                            className={cn(
                                "px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer",
                                aspectFormat === 'shorts' 
                                    ? "bg-rose-600 text-white shadow-xs" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            title="쇼츠 9:16 세로 썸네일 스트립 (초반 훅 중심)"
                        >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>⚡ 쇼츠 (9:16)</span>
                        </button>

                        <button
                            onClick={() => setAspectFormat('long')}
                            className={cn(
                                "px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer",
                                aspectFormat === 'long' 
                                    ? "bg-blue-600 text-white shadow-xs" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            title="롱폼 16:9 와이드 썸네일 스트립 (심리학/지식다큐 중심)"
                        >
                            <Film className="w-3.5 h-3.5" />
                            <span>🎬 롱폼 (16:9)</span>
                        </button>
                        <button
                            onClick={() => setAspectFormat('all')}
                            className={cn(
                                "px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer",
                                aspectFormat === 'all' 
                                    ? "bg-purple-600 text-white shadow-xs" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            title="쇼츠와 롱폼 채널 및 영상을 모두 조회하는 하이브리드 모드"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>✨ 하이브리드 (전체)</span>
                        </button>
                    </div>

                    {/* 뷰 모드 토글 (채널 릴 / 그리드 / 테이블) */}
                    <div className="flex items-center bg-muted/40 p-0.5 rounded-xl border border-border text-xs font-bold">
                        <button
                            onClick={() => { setViewMode('reel'); setPipelineStep('reels'); }}
                            className={cn("px-2.5 py-1 rounded-lg cursor-pointer", viewMode === 'reel' && "bg-card text-foreground shadow-xs")}
                        >
                            채널 릴
                        </button>
                        <button
                            onClick={() => { setViewMode('grid'); setPipelineStep('signals'); }}
                            className={cn("px-2.5 py-1 rounded-lg cursor-pointer", viewMode === 'grid' && "bg-card text-foreground shadow-xs")}
                        >
                            영상 그리드
                        </button>
                        <button
                            onClick={() => { setViewMode('table'); setPipelineStep('signals'); }}
                            className={cn("px-2.5 py-1 rounded-lg cursor-pointer", viewMode === 'table' && "bg-card text-foreground shadow-xs")}
                        >
                            터미널 표
                        </button>
                    </div>
                </div>

                {/* 우측: 스카우터 즉시 가동 */}
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        onClick={() => scanMutation.mutate()}
                        disabled={isScanning}
                        className="h-8 px-3 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer"
                    >
                        {isScanning ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        ) : (
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        스카우터 가동
                    </Button>
                </div>
            </div>

            {/* 5. 메인 뷰 렌더링 (Step 1, Step 2, Step 3, Step 4) */}
            {(isLoadingCandidates || isLoadingReels) && channelsWithReels.length === 0 && rawCandidates.length === 0 ? (
                <div className="py-28 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-xs text-muted-foreground font-mono">
                        알고리즘 옥석 채널 및 {aspectFormat === 'long' ? '롱폼 (16:9)' : aspectFormat === 'all' ? '하이브리드 (전체)' : '쇼츠 (9:16)'} 스트림 데이터를 동기화 중입니다...
                    </p>
                </div>
            ) : pipelineStep === 'incubator' ? (
                /* ── [STEP 3 전용 메인 뷰] 📂 엄선 카테고리 보관함 & DNA 거버넌스 ── */
                <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border">
                        <div>
                            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                                <Folder className="w-4 h-4 text-blue-500" />
                                엄선 카테고리 보관함 ({(categories || []).length}개 분야)
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                승인된 타겟 벤치마크 채널 풀(카테고리당 권장 정원 30~50개)과 카테고리 DNA 헌장을 통합 관리합니다.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(categories || []).map(cat => {
                            const catChannels = (channels || []).filter((ch: any) => ch.category_id === cat.id);
                            const count = catChannels.length;
                            return (
                                <div 
                                    key={cat.id} 
                                    className="p-4 rounded-2xl bg-card border border-border/80 hover:border-indigo-500/50 shadow-xs flex flex-col justify-between space-y-3 transition-all"
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-black text-foreground flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                {cat.name}
                                            </h4>
                                            <span className={cn(
                                                "text-[10px] font-mono px-2 py-0.5 rounded-full font-bold",
                                                count >= 30 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                                                count > 0 ? "bg-blue-500/10 text-blue-400 border border-blue-500/30" :
                                                "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                            )}>
                                                정원 {count} / 50채널 {count >= 30 ? '🎯 최적' : count === 0 ? '⚠️ 수집필요' : '🌱 확장중'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {cat.persona_target || '해당 분야 핵심 관심 구독자'}
                                        </p>
                                        <div className="text-[11px] font-medium text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg">
                                            톤앤매너: {cat.content_tone || '신뢰성 있고 몰입도 높은 연출'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-border/40">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => { setDnaCategory(cat); setIsDNAModalOpen(true); }}
                                            className="h-7 text-[11px] font-bold rounded-xl cursor-pointer"
                                            title="카테고리 DNA 헌장 수정 및 채널 기반 자동 합성"
                                        >
                                            <Settings2 className="w-3 h-3 mr-1" />
                                            DNA 헌장
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => {
                                                setSelectedTag(cat.name);
                                                setPipelineStep('reels');
                                                setViewMode('reel');
                                            }}
                                            className="h-7 text-[11px] font-bold rounded-xl cursor-pointer"
                                            title="이 카테고리의 벤치마크 채널 릴 조회"
                                        >
                                            <Film className="w-3 h-3 mr-1" />
                                            채널 풀
                                        </Button>

                                        <Button
                                            size="sm"
                                            onClick={() => { setLaunchpadCategory(cat); setIsLaunchpadModalOpen(true); }}
                                            className="h-7 text-[11px] font-black bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                                            title="이 카테고리 기반 내 신설 채널 기획 패키지 개설"
                                        >
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            내 채널 기획
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : pipelineStep === 'launchpad' ? (
                /* ── [STEP 4 전용 메인 뷰] 🚀 내 채널 기획 론치패드 (Brand Genesis) ── */
                <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-900/10 via-card to-purple-900/10 border border-indigo-500/30 text-center space-y-4 animate-in fade-in duration-200">
                    <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-7 h-7" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                        <h2 className="text-lg font-black text-foreground">
                            내 채널 기획 론치패드 (Brand Genesis)
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            엄선된 벤치마크 채널들과 카테고리 DNA를 벤치마킹하여, 내가 운영할 신규 유튜브 브랜드 채널(채널명 3선, 아바타/배너 콘셉트, 바이오, 킥오프 3편 기획안)을 완성하고 1클릭으로 제작 워크스페이스를 개설합니다.
                        </p>
                    </div>
                    <div>
                        <Button
                            onClick={() => { setLaunchpadCategory(activeCatObj); setIsLaunchpadModalOpen(true); }}
                            className="h-9 px-5 text-xs font-black bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 text-white rounded-2xl shadow-md cursor-pointer"
                        >
                            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                            {activeCatObj?.name || '카테고리'} 론치패드 팩 열기
                        </Button>
                    </div>
                </div>
            ) : viewMode === 'reel' ? (
                /* ── [STEP 2] 2-Tier 수평 채널 릴 스트립 뷰 (🟢 기등록 타겟 채널 vs ✨ 신규 발굴 옥석) ── */
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* [SECTION GEMS BANNER IN REEL VIEW] */}
                    {selectedTag === 'gems' && (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-black text-lg">
                                    💎
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                                        <span>고배수 옥석 채널별 묶어보기</span>
                                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500 text-black">
                                            {candidateChannels.length}개 채널 보유
                                        </span>
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        4배수 이상 옥석 영상을 보유한 채널들을 모아 릴 스트립으로 확인합니다.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center bg-card p-1 rounded-xl border border-border/80 text-xs font-bold">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn("px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer", viewMode === 'grid' ? "bg-amber-500 text-black shadow-xs" : "text-muted-foreground hover:text-foreground")}
                                >
                                    🎬 옥석 영상 그리드로 보기 ({filteredCandidates.length}편)
                                </button>
                                <button
                                    onClick={() => setViewMode('reel')}
                                    className={cn("px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer", viewMode === 'reel' ? "bg-amber-500 text-black shadow-xs" : "text-muted-foreground hover:text-foreground")}
                                >
                                    📺 채널별 묶어보기 ({candidateChannels.length}채널)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* [SECTION PENDING] 📋 등록 예정 인큐베이션 대기 채널 (selectedTag === 'pending') */}
                    {selectedTag === 'pending' ? (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                    <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                                        <span>📋 등록 예정 옥석 채널</span>
                                        <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-300 dark:border-indigo-800 px-2 py-0.5 rounded-full">
                                            {pendingChannels.length}개 채널
                                        </span>
                                    </h3>
                                </div>
                                <p className="text-[11px] text-muted-foreground hidden sm:inline">
                                    실시간 스카우팅으로 엄선된 후보 채널입니다. AI 카테고리 추천을 확인하고 원클릭으로 정기 수집 타겟 채널로 승인하세요.
                                </p>
                            </div>

                            {pendingChannels.length === 0 ? (
                                <div className="p-8 rounded-2xl bg-muted/20 border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                                    현재 등록 대기 중인 채널이 없습니다. 상단 '실제 수집 가동'을 켜두시면 고배수 영상이 포착되는 즉시 여기에 채널이 큐잉됩니다.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingChannels.slice(0, visibleChannelsCount).map((ch: any) => (
                                        <ChannelReelRow
                                            key={ch.channel_id}
                                            ch={ch}
                                            type="pending"
                                            aspectFormat={aspectFormat}
                                            onOpenAnatomy={(c) => {
                                                setSelectedChannelForAnatomy({ id: c.channel_id, name: c.name });
                                                setIsAnatomyModalOpen(true);
                                            }}
                                            onSelectReel={(reel, c) => {
                                                setSelectedCandidateForDetail({
                                                    id: reel.id,
                                                    video_id: reel.video_id,
                                                    url: `https://www.youtube.com/${aspectFormat === 'shorts' ? 'shorts/' : 'watch?v='}${reel.video_id}`,
                                                    title: reel.title,
                                                    channel_title: c.name,
                                                    thumbnail_url: reel.thumbnail_url,
                                                    video_type: aspectFormat,
                                                    view_count: reel.view_count,
                                                    like_count: 5000,
                                                    comment_count: 240,
                                                    velocity_score: 1200,
                                                    outlier_ratio: reel.outlier_ratio,
                                                    engagement_rate: 0.05,
                                                    published_at: reel.published_at,
                                                    match_score: 92,
                                                    match_reason: '채널 대표 급상승 영상',
                                                    status: 'pending',
                                                    hook_analysis: reel.hook_analysis || '초반 핵심 의문 제시',
                                                    viral_triggers: '시청 지속률 극대화 컷 편집',
                                                    adaptation_angle: '바이럴루프 각색 추천',
                                                    created_at: new Date().toISOString()
                                                } as any);
                                                setIsDetailModalOpen(true);
                                            }}
                                            onApprovePending={(c) => {
                                                if (c.recommendation?.is_new_cluster) {
                                                    onboardMutation.mutate({
                                                        channel_name: c.name,
                                                        new_category_name: c.recommendation?.recommended_category_name,
                                                        persona_target: c.recommendation?.suggested_persona,
                                                        content_tone: c.recommendation?.suggested_tone
                                                    });
                                                } else {
                                                    onboardMutation.mutate({
                                                        channel_name: c.name,
                                                        category_id: c.recommendation?.recommended_category_id
                                                    });
                                                }
                                            }}
                                            isOnboarding={onboardMutation.isPending}
                                        />
                                    ))}
                                    {visibleChannelsCount < pendingChannels.length && (
                                        <div ref={observerTargetRef} className="w-full py-4 text-center text-xs text-muted-foreground animate-pulse">
                                            후보 채널 추가 로딩 중... ({Math.min(visibleChannelsCount, pendingChannels.length)} / {pendingChannels.length})
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* [SECTION A] 🟢 기등록 정기 수집 타겟 채널 */}
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                                    <span>🟢 기등록 정기 수집 타겟 채널</span>
                                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                        {targetChannels.length}개 채널
                                    </span>
                                </h3>
                            </div>
                            <p className="text-[11px] text-muted-foreground hidden sm:inline">
                                자동 수집 파이프라인에 등록되어 주기적으로 최신 영상이 자동 다운로드/분석되는 핵심 타겟 채널입니다.
                            </p>
                        </div>

                        {targetChannels.length === 0 ? (
                            <div className="p-6 rounded-2xl bg-muted/20 border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                                현재 선택된 카테고리에 등록된 정기 수집 타겟 채널이 없습니다. 아래 발굴 옥석 채널에서 <b>[✓ 타겟 채널 승인]</b>을 클릭하면 즉시 편입됩니다.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {targetChannels.slice(0, visibleChannelsCount).map(ch => (
                                    <ChannelReelRow
                                        key={ch.channel_id}
                                        ch={ch}
                                        type="target"
                                        aspectFormat={aspectFormat}
                                        onOpenAnatomy={(c) => {
                                            setSelectedChannelForAnatomy({ id: c.channel_id, name: c.name });
                                            setIsAnatomyModalOpen(true);
                                        }}
                                        onSelectReel={(reel, c) => {
                                            const matched = (rawCandidates || []).find(cand => cand.video_id === reel.video_id);
                                            if (matched) {
                                                setSelectedCandidateForDetail(matched);
                                            } else {
                                                setSelectedCandidateForDetail({
                                                    id: reel.id,
                                                    video_id: reel.video_id,
                                                    url: `https://www.youtube.com/${aspectFormat === 'shorts' ? 'shorts/' : 'watch?v='}${reel.video_id}`,
                                                    title: reel.title,
                                                    channel_title: c.name,
                                                    thumbnail_url: reel.thumbnail_url,
                                                    video_type: aspectFormat,
                                                    view_count: reel.view_count,
                                                    like_count: 5000,
                                                    comment_count: 240,
                                                    velocity_score: 1200,
                                                    outlier_ratio: reel.outlier_ratio,
                                                    engagement_rate: 0.05,
                                                    published_at: reel.published_at,
                                                    match_score: 92,
                                                    match_reason: '채널 대표 급상승 영상',
                                                    status: 'approved',
                                                    hook_analysis: reel.hook_analysis || '초반 핵심 의문 제시',
                                                    viral_triggers: '시청 지속률 극대화 컷 편집',
                                                    adaptation_angle: '바이럴루프 각색 추천',
                                                    created_at: new Date().toISOString()
                                                } as any);
                                            }
                                            setIsDetailModalOpen(true);
                                        }}
                                        onSpider={(channelId) => spiderMutation.mutate(channelId)}
                                        isSpidering={spideringChannelId === ch.channel_id}
                                    />
                                ))}
                                {visibleChannelsCount < targetChannels.length && (
                                    <div ref={observerTargetRef} className="w-full py-4 text-center text-xs text-muted-foreground animate-pulse">
                                        타겟 채널 추가 로딩 중... ({Math.min(visibleChannelsCount, targetChannels.length)} / {targetChannels.length})
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* [SECTION B] ✨ 신규 발굴 벤치마크 옥석 채널 */}
                    <div className="space-y-3 pt-5 border-t border-border/70">
                        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                                    <span>✨ 신규 발굴 벤치마크 옥석</span>
                                    <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-full">
                                        {candidateChannels.length}개 채널
                                    </span>
                                </h3>
                            </div>
                            <p className="text-[11px] text-muted-foreground hidden sm:inline">
                                스카우터가 실시간 발굴한 고성과 벤치마크 채널입니다. 검토 후 타겟 채널로 승인하거나 유사 채널을 확장하세요.
                            </p>
                        </div>

                        {candidateChannels.length === 0 ? (
                            <div className="p-6 rounded-2xl bg-muted/20 border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                                현재 선택된 카테고리에 발굴된 신규 옥석 채널이 없습니다. 상단 '스카우터 가동'을 눌러 탐색을 진행하세요.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {candidateChannels.slice(0, visibleChannelsCount).map(ch => (
                                    <ChannelReelRow
                                        key={ch.channel_id}
                                        ch={ch}
                                        type="candidate"
                                        aspectFormat={aspectFormat}
                                        onOpenAnatomy={(c) => {
                                            setSelectedChannelForAnatomy({ id: c.channel_id, name: c.name });
                                            setIsAnatomyModalOpen(true);
                                        }}
                                        onSelectReel={(reel, c) => {
                                            const matched = (rawCandidates || []).find(cand => cand.video_id === reel.video_id);
                                            if (matched) {
                                                setSelectedCandidateForDetail(matched);
                                            } else {
                                                setSelectedCandidateForDetail({
                                                    id: reel.id,
                                                    video_id: reel.video_id,
                                                    url: `https://www.youtube.com/${aspectFormat === 'shorts' ? 'shorts/' : 'watch?v='}${reel.video_id}`,
                                                    title: reel.title,
                                                    channel_title: c.name,
                                                    thumbnail_url: reel.thumbnail_url,
                                                    video_type: aspectFormat,
                                                    view_count: reel.view_count,
                                                    like_count: 5000,
                                                    comment_count: 240,
                                                    velocity_score: 1200,
                                                    outlier_ratio: reel.outlier_ratio,
                                                    engagement_rate: 0.05,
                                                    published_at: reel.published_at,
                                                    match_score: 92,
                                                    match_reason: '채널 대표 급상승 영상',
                                                    status: 'pending',
                                                    hook_analysis: reel.hook_analysis || '초반 핵심 의문 제시',
                                                    viral_triggers: '시청 지속률 극대화 컷 편집',
                                                    adaptation_angle: '바이럴루프 각색 추천',
                                                    created_at: new Date().toISOString()
                                                } as any);
                                            }
                                            setIsDetailModalOpen(true);
                                        }}
                                        onApproveCandidate={(channelId) => convertTargetMutation.mutate(channelId)}
                                        isConverting={convertTargetMutation.isPending}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                        </>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                /* ── [STEP 1] 6열 고밀도 영상 그리드 ── */
                <div className="space-y-4 animate-in fade-in duration-200">
                    {selectedTag === 'gems' && (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-black text-lg">
                                    💎
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                                        <span>4배수 이상 고배수 옥석 영상 풀</span>
                                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500 text-black">
                                            총 {filteredCandidates.length}편 발굴
                                        </span>
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        평균 대비 4.0배 이상의 폭발적 조회수를 기록한 바이럴 옥석 영상들입니다. 각 카드를 클릭해 훅 및 4대 해체 리포트를 확인하세요.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center bg-card p-1 rounded-xl border border-border/80 text-xs font-bold">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn("px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer", viewMode === 'grid' ? "bg-amber-500 text-black shadow-xs" : "text-muted-foreground hover:text-foreground")}
                                >
                                    🎬 옥석 영상 그리드 ({filteredCandidates.length}편)
                                </button>
                                <button
                                    onClick={() => setViewMode('reel')}
                                    className={cn("px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer", viewMode === 'reel' ? "bg-amber-500 text-black shadow-xs" : "text-muted-foreground hover:text-foreground")}
                                >
                                    📺 채널별 묶어보기
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {filteredCandidates.map(candidate => (
                        <div
                            key={candidate.id}
                            onClick={() => {
                                setSelectedCandidateForDetail(candidate);
                                setIsDetailModalOpen(true);
                            }}
                            className={cn(
                                "group relative rounded-2xl overflow-hidden bg-black border border-border/80 hover:border-indigo-500 transition-all cursor-pointer shadow-md flex flex-col justify-between p-2.5",
                                aspectFormat === 'long' ? "aspect-video" : "aspect-[9/16]"
                            )}
                        >
                            <img 
                                src={candidate.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80"}
                                alt={candidate.title}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform opacity-80"
                                onError={(e) => {
                                    e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80";
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60" />

                            {/* 상단 뱃지 */}
                            <div className="relative z-10 flex items-center justify-between">
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-mono font-black",
                                    candidate.outlier_ratio >= 7 ? "bg-red-600 text-white" : "bg-amber-500 text-black"
                                )}>
                                    {candidate.outlier_ratio}x 🔥
                                </span>
                                <span className="text-[10px] font-mono font-bold text-white/90 bg-black/60 px-1.5 py-0.5 rounded">
                                    {candidate.velocity_score}v
                                </span>
                            </div>

                            {/* 하단 텍스트 및 메트릭 (등록일/수집일 듀얼 렌더) */}
                            <div className="relative z-10 space-y-1">
                                <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight">
                                    {candidate.title}
                                </h4>
                                <p className="text-[10px] text-white/70 truncate">{candidate.channel_title}</p>
                                <div className="flex items-center justify-between text-[10px] font-mono text-white/60 pt-1 border-t border-white/10">
                                    <span>{candidate.view_count.toLocaleString()}회</span>
                                    <span>{(candidate.engagement_rate * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center justify-between text-[9px] font-mono pt-0.5 border-t border-white/10">
                                    <span className="text-amber-300 font-bold flex items-center gap-0.5 truncate" title={`영상 실제 등록/업로드 일자: ${candidate.published_at || '최근'}`}>
                                        📅 {formatRelativeOrDate(candidate.published_at)}
                                    </span>
                                    <span className="text-sky-300/80 flex items-center gap-0.5 shrink-0" title={`시스템 수집 일자: ${candidate.created_at || '최근'}`}>
                                        📥 {formatShortDate(candidate.created_at)}
                                    </span>
                                </div>
                            </div>

                            {/* 롱폼 전용: 유사 롱폼 10편 AI 자동 확장 버튼 */}
                            {aspectFormat === 'long' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeepSpideringVideoId(candidate.video_id);
                                        spiderDeepMutation.mutate(candidate.video_id);
                                    }}
                                    disabled={deepSpideringVideoId === candidate.video_id}
                                    className="relative z-10 mt-1.5 w-full py-1 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-all"
                                    title="이 롱폼 영상의 핵심 주제를 역추적하여 유사 롱폼 10편과 니치 채널을 집중 발굴합니다"
                                >
                                    {deepSpideringVideoId === candidate.video_id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Search className="w-3 h-3" />
                                    )}
                                    <span>유사 롱폼 10편 탐색</span>
                                </button>
                            )}
                        </div>
                    ))}
                    </div>
                </div>
            ) : (
                /* ── [STEP 1 테이블 모드] ── */
                <div className="rounded-2xl border border-border overflow-x-auto bg-card">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-black border-b border-border uppercase text-[10.5px]">
                            <tr>
                                <th className="p-3">영상 제목 & 채널</th>
                                <th className="p-3 text-center">유형</th>
                                <th className="p-3 text-right">조회수</th>
                                <th className="p-3 text-right">폭발력</th>
                                <th className="p-3 text-center">📅 등록(업로드)</th>
                                <th className="p-3 text-center">📥 수집일</th>
                                <th className="p-3 text-right">시간당 증가</th>
                                <th className="p-3 text-center">초반 3초 훅</th>
                                <th className="p-3 text-center">액션</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredCandidates.map(candidate => (
                                <tr 
                                    key={candidate.id}
                                    onClick={() => {
                                        setSelectedCandidateForDetail(candidate);
                                        setIsDetailModalOpen(true);
                                    }}
                                    className="hover:bg-muted/30 cursor-pointer"
                                >
                                    <td className="p-3 font-bold text-foreground">
                                        <p className="line-clamp-1">{candidate.title}</p>
                                        <span className="text-[10.5px] text-muted-foreground font-normal">{candidate.channel_title}</span>
                                    </td>
                                    <td className="p-3 text-center font-mono">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-bold",
                                            candidate.video_type === 'shorts' ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-500"
                                        )}>
                                            {candidate.video_type}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold">
                                        {candidate.view_count.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-right font-mono font-black text-amber-500">
                                        {candidate.outlier_ratio}x
                                    </td>
                                    <td className="p-3 text-center font-mono font-bold text-amber-500 dark:text-amber-400 text-[11px]" title={`실제 등록/업로드 일자: ${candidate.published_at || '최근'}`}>
                                        {formatRelativeOrDate(candidate.published_at)}
                                    </td>
                                    <td className="p-3 text-center font-mono text-muted-foreground text-[11px]" title={`시스템 수집 일자: ${candidate.created_at || '최근'}`}>
                                        {formatShortDate(candidate.created_at)}
                                    </td>
                                    <td className="p-3 text-right font-mono text-muted-foreground">
                                        +{Math.round(candidate.velocity_score).toLocaleString()}/h
                                    </td>
                                    <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                                        {candidate.hook_analysis || '초반 핵심 의문 제시'}
                                    </td>
                                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-1.5">
                                            {candidate.video_type === 'long' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => deepSpiderMutation.mutate(candidate.video_id)}
                                                    disabled={deepSpideringVideoId === candidate.video_id}
                                                    className="h-7 text-[10.5px] font-bold border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 rounded-lg cursor-pointer"
                                                    title="유사 롱폼 10편 집중 탐색"
                                                >
                                                    {deepSpideringVideoId === candidate.video_id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                                    ) : (
                                                        <Search className="w-3 h-3 mr-1" />
                                                    )}
                                                    유사롱폼
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setPipelineStep('reels');
                                                    setViewMode('reel');
                                                }}
                                                className="h-7 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                                            >
                                                채널릴 보기
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 6. 모달 컴포넌트들 */}
            {/* 영상 상세 분석 모달 */}
            <TrendRadarDetailModal
                candidate={selectedCandidateForDetail}
                open={isDetailModalOpen}
                onOpenChange={setIsDetailModalOpen}
                category={activeCatObj}
                onApprove={(id) => {
                    queryClient.invalidateQueries({ queryKey: ['channels-with-reels'] });
                    queryClient.invalidateQueries({ queryKey: ['radar-candidates'] });
                    alert('타겟 채널로 정식 승인되었습니다.');
                }}
                onReject={(id, reason) => {
                    queryClient.invalidateQueries({ queryKey: ['radar-candidates'] });
                }}
            />

            {/* 엄선식 채널 성장 분석 모달 (듀얼 차트 + AI 4대 해체 분석) */}
            <ChannelAnatomyModal
                channelId={selectedChannelForAnatomy?.id || null}
                channelName={selectedChannelForAnatomy?.name}
                isOpen={isAnatomyModalOpen}
                onClose={() => setIsAnatomyModalOpen(false)}
                onConverted={(name) => {
                    queryClient.invalidateQueries({ queryKey: ['channels-with-reels'] });
                    queryClient.invalidateQueries({ queryKey: ['channels'] });
                }}
                onSelectVideo={(vId, title) => {
                    const matched = (rawCandidates || []).find(c => c.video_id === vId);
                    if (matched) {
                        setSelectedCandidateForDetail(matched);
                        setIsDetailModalOpen(true);
                    }
                }}
            />

            {/* 신설 채널 론치패드 모달 */}
            <ChannelLaunchpadModal
                category={launchpadCategory}
                open={isLaunchpadModalOpen}
                onOpenChange={setIsLaunchpadModalOpen}
                onBrandCreated={(id, title) => {
                    alert(`신설 브랜드 채널 '${title}'이 성공적으로 개설되었습니다!`);
                    queryClient.invalidateQueries({ queryKey: ['brand-channels'] });
                }}
            />

            {/* 카테고리 DNA 헌장 모달 */}
            {dnaCategory && (
                <CategoryDNAModal
                    category={dnaCategory}
                    open={isDNAModalOpen}
                    onOpenChange={setIsDNAModalOpen}
                />
            )}
        </div>
    );
};

export default TrendRadarPage;
