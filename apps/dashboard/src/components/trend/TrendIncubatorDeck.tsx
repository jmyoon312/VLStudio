import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { RadarCandidate, Category } from '../../lib/api';
import { 
    Radio, Zap, Sparkles, Check, X, ExternalLink, RefreshCw, 
    TrendingUp, Award, AlertCircle, ShieldAlert, ChevronRight,
    Loader2, Play, Eye, Flame, Filter
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export const TrendIncubatorDeck: React.FC = () => {
    const queryClient = useQueryClient();
    const [selectedType, setSelectedType] = useState<'all' | 'shorts' | 'long'>('all');
    const [isScanning, setIsScanning] = useState(false);

    // Fetch Candidates in Incubator (Pending)
    const { data: candidates = [], isLoading } = useQuery({
        queryKey: ['radar-candidates', selectedType],
        queryFn: async () => {
            const params: any = { status: 'pending' };
            if (selectedType !== 'all') params.video_type = selectedType;
            const res = await api.get<RadarCandidate[]>('/trend-radar/candidates', { params });
            return res.data || [];
        }
    });

    // Fetch Radar Stats
    const { data: stats } = useQuery({
        queryKey: ['radar-stats'],
        queryFn: async () => (await api.get('/trend-radar/stats')).data
    });

    // Fetch Categories
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => (await api.get<Category[]>('/categories/')).data || []
    });

    // Scan Mutation
    const scanMutation = useMutation({
        mutationFn: async (type: string) => {
            setIsScanning(true);
            const res = await api.post('/trend-radar/scan', {
                video_type: type === 'all' ? 'shorts' : type,
                limit: 8
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['radar-candidates'] });
            queryClient.invalidateQueries({ queryKey: ['radar-stats'] });
            setIsScanning(false);
        },
        onError: (err: any) => {
            setIsScanning(false);
            alert('레이더 스캔 실패: ' + (err.response?.data?.detail || err.message));
        }
    });

    // 1-Click Approve Mutation
    const approveMutation = useMutation({
        mutationFn: async (id: number) => {
            return (await api.post(`/trend-radar/candidates/${id}/approve`)).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['radar-candidates'] });
            queryClient.invalidateQueries({ queryKey: ['radar-stats'] });
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            queryClient.invalidateQueries({ queryKey: ['videos'] });
        }
    });

    // 1-Click Reject Mutation
    const rejectMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: number, reason?: string }) => {
            return (await api.post(`/trend-radar/candidates/${id}/reject`, { feedback_reason: reason })).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['radar-candidates'] });
            queryClient.invalidateQueries({ queryKey: ['radar-stats'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });

    const getScoreBadge = (score: number) => {
        if (score >= 90) return { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', text: '탁월 🎯' };
        if (score >= 80) return { bg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40', text: '우수 ✨' };
        return { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40', text: '적합 🧭' };
    };

    return (
        <div className="bg-card/70 backdrop-blur-md border border-border/80 rounded-2xl p-5 space-y-4 shadow-sm select-none">
            {/* 1. Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-xs">
                        <Radio className="w-5 h-5 animate-pulse text-amber-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-1.5">
                                <span>트렌드 레이더 인큐베이터</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                    FSD 인큐베이팅 대기열
                                </span>
                            </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            카테고리 DNA에 부합하는 급상승 후보 영상을 AI가 채점하여 대기열에 비치합니다.
                        </p>
                    </div>
                </div>

                {/* Controls & Stats */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Format Filter Tabs */}
                    <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border text-xs">
                        <button
                            onClick={() => setSelectedType('all')}
                            className={cn(
                                "px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer",
                                selectedType === 'all' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            전체
                        </button>
                        <button
                            onClick={() => setSelectedType('shorts')}
                            className={cn(
                                "px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer",
                                selectedType === 'shorts' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            ⚡ 쇼츠
                        </button>
                        <button
                            onClick={() => setSelectedType('long')}
                            className={cn(
                                "px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer",
                                selectedType === 'long' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            🎬 롱폼
                        </button>
                    </div>

                    {/* Scan Button */}
                    <Button
                        size="sm"
                        onClick={() => scanMutation.mutate(selectedType)}
                        disabled={isScanning || scanMutation.isPending}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                        {isScanning ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>스캐닝 중...</span>
                            </>
                        ) : (
                            <>
                                <Zap className="w-3.5 h-3.5 fill-current text-amber-300" />
                                <span>⚡ 레이더 즉시 스캔</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* 2. Stats Pill Summary */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-muted/30 border border-border flex items-center justify-between">
                        <span className="text-muted-foreground">발굴 대기</span>
                        <span className="font-mono font-bold text-amber-500">{stats.pending_incubator}건</span>
                    </div>
                    <div className="p-2 rounded-xl bg-muted/30 border border-border flex items-center justify-between">
                        <span className="text-muted-foreground">자율 수집(FSD)</span>
                        <span className="font-mono font-bold text-emerald-500">{stats.auto_collected}건</span>
                    </div>
                    <div className="p-2 rounded-xl bg-muted/30 border border-border flex items-center justify-between">
                        <span className="text-muted-foreground">승인 완료</span>
                        <span className="font-mono font-bold text-indigo-400">{stats.approved}건</span>
                    </div>
                    <div className="p-2 rounded-xl bg-muted/30 border border-border flex items-center justify-between">
                        <span className="text-muted-foreground">누적 탐색</span>
                        <span className="font-mono font-bold text-foreground">{stats.total_discovered}건</span>
                    </div>
                </div>
            )}

            {/* 3. Candidates Deck Grid */}
            {isLoading ? (
                <div className="h-44 flex items-center justify-center text-muted-foreground text-xs gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>트렌드 인큐베이터 후보를 불러오는 중...</span>
                </div>
            ) : candidates.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-border/80 bg-muted/10 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground">
                        <Radio className="w-5 h-5 opacity-60" />
                    </div>
                    <p className="text-xs font-bold text-foreground">현재 대기 중인 인큐베이팅 후보가 없습니다.</p>
                    <p className="text-[11px] text-muted-foreground">
                        상단의 <strong>[⚡ 레이더 즉시 스캔]</strong> 버튼을 눌러 카테고리 DNA에 최적화된 트렌드 영상을 발굴해 보세요.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {candidates.map((item) => {
                        const badge = getScoreBadge(item.match_score);
                        const cat = categories.find(c => c.id === item.category_id);

                        return (
                            <div 
                                key={item.id}
                                className="group relative bg-card border border-border hover:border-primary/50 rounded-xl p-3 flex flex-col justify-between space-y-3 transition-all shadow-2xs hover:shadow-md"
                            >
                                {/* Top: Video Thumbnail & Score */}
                                <div className="space-y-2">
                                    <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950/80 border border-border">
                                        <img 
                                            src={item.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'} 
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        {/* Format Badge */}
                                        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-black/70 text-white backdrop-blur-xs">
                                            {item.video_type === 'shorts' ? '⚡ SHORTS' : '🎬 LONG'}
                                        </span>

                                        {/* AI Match Score Badge */}
                                        <span className={cn(
                                            "absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-xs flex items-center gap-1",
                                            badge.bg
                                        )}>
                                            <span>{Math.round(item.match_score)}점</span>
                                            <span>{badge.text}</span>
                                        </span>

                                        {/* Play Overlay */}
                                        <a 
                                            href={item.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                                        >
                                            <ExternalLink className="w-5 h-5 drop-shadow-md" />
                                        </a>
                                    </div>

                                    {/* Video Title & Channel */}
                                    <div>
                                        <a 
                                            href={item.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs font-bold text-foreground line-clamp-2 hover:text-primary transition-colors"
                                            title={item.title}
                                        >
                                            {item.title}
                                        </a>
                                        <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
                                            <span className="font-medium truncate max-w-[140px]">{item.channel_title}</span>
                                            {cat && (
                                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-primary/10 text-primary border border-primary/20">
                                                    {cat.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-3 gap-1 py-1.5 px-2 bg-muted/40 rounded-lg text-[10px] font-mono border border-border/50">
                                        <div>
                                            <span className="text-muted-foreground block text-[9px]">조회수</span>
                                            <span className="font-bold text-foreground">{(item.view_count / 10000).toFixed(1)}만</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[9px]">시간당 유입</span>
                                            <span className="font-bold text-amber-500">+{Math.round(item.velocity_score)}/h</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[9px]">바이럴 배수</span>
                                            <span className="font-bold text-emerald-500 font-extrabold">{item.outlier_ratio}x 🔥</span>
                                        </div>
                                    </div>

                                    {/* AI Reasoning Briefing */}
                                    {item.match_reason && (
                                        <div className="p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-[11px] text-indigo-600 dark:text-indigo-300 leading-snug flex items-start gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                                            <span className="line-clamp-2">{item.match_reason}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions: 1-Click Approve vs Reject */}
                                <div className="flex items-center gap-1.5 pt-2 border-t border-border/60">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => rejectMutation.mutate({ id: item.id, reason: '사용자 기각' })}
                                        disabled={rejectMutation.isPending || approveMutation.isPending}
                                        className="h-8 flex-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5 mr-1" /> 제외
                                    </Button>

                                    <Button
                                        size="sm"
                                        onClick={() => approveMutation.mutate(item.id)}
                                        disabled={approveMutation.isPending || rejectMutation.isPending}
                                        className="h-8 flex-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer flex items-center justify-center gap-1"
                                    >
                                        <Check className="w-3.5 h-3.5" /> 1클릭 승인 & 수집
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
