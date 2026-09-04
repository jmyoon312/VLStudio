import React from 'react';
import { 
    Play, ExternalLink, Flame, Zap, Award, Sparkles, Check, X, 
    Rocket, Eye, ThumbsUp, MessageSquare, Clock, Users, Gem, Film, 
    Share2, ShieldCheck, HelpCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { RadarCandidate, Category } from '../../lib/api';

interface TrendRadarDetailModalProps {
    candidate: RadarCandidate | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category?: Category | null;
    onApprove: (id: number) => void;
    onReject: (id: number, reason?: string) => void;
    isApproving?: boolean;
    isRejecting?: boolean;
    onStartFSDMission?: (candidate: RadarCandidate) => void;
}

export const TrendRadarDetailModal: React.FC<TrendRadarDetailModalProps> = ({
    candidate,
    open,
    onOpenChange,
    category,
    onApprove,
    onReject,
    isApproving,
    isRejecting,
    onStartFSDMission
}) => {
    if (!candidate) return null;

    // Extract YouTube ID
    const extractYoutubeId = (url?: string, videoId?: string) => {
        if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) return videoId;
        if (!url) return null;
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
        return match ? match[1] : null;
    };

    const ytId = extractYoutubeId(candidate.url, candidate.video_id);
    const isShorts = candidate.video_type === 'shorts';

    // Outlier / Hidden Gem detection
    const isHiddenGem = candidate.outlier_ratio >= 6.0 && (candidate.view_count >= 200000);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl p-0 overflow-hidden bg-card border border-border text-foreground flex flex-col md:flex-row h-[92vh] md:h-[84vh] max-h-[840px] rounded-3xl shadow-2xl">
                <DialogHeader className="sr-only">
                    <DialogTitle>{candidate.title}</DialogTitle>
                    <DialogDescription>{candidate.match_reason || '트렌드 레이더 심층 분석 및 인라인 플레이어'}</DialogDescription>
                </DialogHeader>

                {/* 좌측: 비디오 플레이어 & 핵심 비주얼 영역 (수집 영상 보관함 규격) */}
                <div className="relative w-full md:w-[48%] h-[42%] md:h-full bg-black flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-border shrink-0">
                    {ytId ? (
                        <iframe
                            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0&rel=0`}
                            title={candidate.title}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    ) : (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img
                                src={candidate.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80"}
                                alt={candidate.title}
                                className="w-full h-full object-cover opacity-70 filter blur-xs scale-105"
                            />
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-6 text-center">
                                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
                                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                                </div>
                                <p className="text-sm font-bold text-white">유튜브 원본 스트리밍</p>
                                <span className="text-xs text-white/70 mt-1">클릭 시 원본 재생 가능</span>
                            </div>
                        </div>
                    )}

                    {/* 상단 오버레이 뱃지들 */}
                    <div className="absolute top-3.5 left-3.5 flex flex-wrap items-center gap-1.5 z-20 pointer-events-none">
                        <span className={cn(
                            "px-2.5 py-0.5 rounded-lg text-[10.5px] font-black uppercase tracking-wider backdrop-blur-md shadow-md",
                            isShorts ? "bg-rose-500/90 text-white" : "bg-blue-600/90 text-white"
                        )}>
                            {isShorts ? '⚡ SHORTS' : '🎬 LONG'}
                        </span>

                        <span className="px-2.5 py-0.5 rounded-lg text-[10.5px] font-mono font-black bg-black/80 text-amber-400 backdrop-blur-md border border-amber-500/40 shadow-sm flex items-center gap-1">
                            <Flame className="w-3 h-3 fill-amber-400" />
                            {candidate.outlier_ratio}x 폭발
                        </span>

                        {isHiddenGem && (
                            <span className="px-2.5 py-0.5 rounded-lg text-[10.5px] font-black bg-purple-600/90 text-white backdrop-blur-md shadow-md flex items-center gap-1 animate-pulse">
                                <Gem className="w-3 h-3 fill-current text-cyan-300" />
                                💎 숨은 옥석 채널
                            </span>
                        )}
                    </div>

                    {/* 우측 상단 유튜브 링크 바로가기 */}
                    {candidate.url && (
                        <a
                            href={candidate.url}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1 bg-red-600/90 hover:bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md backdrop-blur-xs transition-all active:scale-95"
                            title="유튜브에서 원본 새 창 열기"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>YouTube</span>
                        </a>
                    )}

                    {/* 좌측 하단 영상 길이 & 호응도 뱃지 */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 z-20 pointer-events-none">
                        {candidate.duration_text && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/70 text-white backdrop-blur-xs flex items-center gap-1 border border-white/10">
                                <Clock className="w-3 h-3 text-white/70" />
                                {candidate.duration_text}
                            </span>
                        )}
                        {candidate.sentiment_rate && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/70 text-emerald-300 backdrop-blur-xs flex items-center gap-1 border border-emerald-500/30">
                                <ThumbsUp className="w-3 h-3 text-emerald-400" />
                                {candidate.sentiment_rate}% 호응
                            </span>
                        )}
                    </div>
                </div>

                {/* 우측: 전문 분석 패널 & FSD 1클릭 제작 디렉션 */}
                <div className="w-full md:w-[52%] h-[58%] md:h-full p-5 sm:p-6 overflow-y-auto flex flex-col justify-between space-y-5 bg-card text-card-foreground custom-scrollbar">
                    <div className="space-y-4">
                        {/* 1. 채널 & 영상 타이틀 헤더 */}
                        <div className="space-y-1.5 border-b border-border/70 pb-3.5">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-foreground hover:underline cursor-pointer">
                                        {candidate.channel_title}
                                    </span>
                                    {candidate.channel_subscribers && (
                                        <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                                            구독자 {candidate.channel_subscribers}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[11px] font-mono">
                                    {candidate.published_at ? new Date(candidate.published_at).toLocaleDateString('ko-KR') : '최근'}
                                </span>
                            </div>

                            <h3 className="text-sm sm:text-base font-black text-foreground leading-snug tracking-tight">
                                {candidate.title}
                            </h3>
                        </div>

                        {/* 2. 메트릭 4분할 데이터 터미널 */}
                        <div className="grid grid-cols-4 gap-2">
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 text-center">
                                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                                    <Eye className="w-3 h-3" /> 조회수
                                </p>
                                <p className="text-xs sm:text-sm font-black font-mono text-foreground mt-0.5">
                                    {candidate.view_count.toLocaleString()}회
                                </p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center justify-center gap-0.5">
                                    <Flame className="w-3 h-3" /> 폭발력
                                </p>
                                <p className="text-xs sm:text-sm font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                                    {candidate.outlier_ratio}x 배속
                                </p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 text-center">
                                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                                    <Zap className="w-3 h-3" /> 시간당 증가
                                </p>
                                <p className="text-xs sm:text-sm font-black font-mono text-foreground mt-0.5">
                                    +{Math.round(candidate.velocity_score).toLocaleString()}/h
                                </p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-center">
                                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-0.5">
                                    <Award className="w-3 h-3" /> DNA 적합
                                </p>
                                <p className="text-xs sm:text-sm font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                                    {Math.round(candidate.match_score)}점
                                </p>
                            </div>
                        </div>

                        {/* 3. Category DNA 채점 & 평가 근거 */}
                        <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                                    Category DNA 정합도 분석
                                </span>
                                <span className="text-[11px] font-mono font-bold text-muted-foreground">
                                    카테고리: {category?.name || '종합 트렌드'}
                                </span>
                            </div>
                            
                            {/* Visual Match Bar */}
                            <div className="w-full bg-muted/80 rounded-full h-2 overflow-hidden">
                                <div 
                                    className="bg-gradient-to-r from-indigo-500 to-blue-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, candidate.match_score)}%` }}
                                />
                            </div>

                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {candidate.match_reason || '우리 카테고리의 타겟 페르소나 및 톤앤매너와 높은 부합도를 보입니다.'}
                            </p>
                        </div>

                        {/* 4. 초반 3초 훅 해체 & 바이럴 트리거 */}
                        <div className="space-y-2.5">
                            {candidate.hook_analysis && (
                                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/25 space-y-1">
                                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400">
                                        <Zap className="w-3.5 h-3.5 fill-current" />
                                        <span>초반 3초 훅(Hook) 해체:</span>
                                    </div>
                                    <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                                        {candidate.hook_analysis}
                                    </p>
                                </div>
                            )}

                            {candidate.viral_triggers && (
                                <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/25 space-y-1">
                                    <div className="flex items-center gap-1.5 text-xs font-black text-rose-600 dark:text-rose-400">
                                        <Flame className="w-3.5 h-3.5 fill-current" />
                                        <span>알고리즘 추천 폭발 심리 기제:</span>
                                    </div>
                                    <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                                        {candidate.viral_triggers}
                                    </p>
                                </div>
                            )}

                            {candidate.adaptation_angle && (
                                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/25 space-y-1">
                                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                                        <Film className="w-3.5 h-3.5" />
                                        <span>바이럴루프 AI 각색 & 씬 디렉팅 가이드:</span>
                                    </div>
                                    <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                                        {candidate.adaptation_angle}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 하단 액션 버튼 바 */}
                    <div className="pt-4 border-t border-border/80 space-y-2.5 shrink-0">
                        {/* 1. 최상위 FSD 자율제작 트리거 */}
                        <Button
                            size="default"
                            onClick={() => onStartFSDMission?.(candidate)}
                            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black text-xs sm:text-sm py-2.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                        >
                            <Rocket className="w-4 h-4 text-amber-300 animate-bounce" />
                            <span>🚀 이 분석 기반으로 AI 자율 제작(FSD) 시작</span>
                        </Button>

                        {/* 2. 승인 / 기각 버튼 */}
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onReject(candidate.id, '사용자 제외 요청')}
                                disabled={isRejecting}
                                className="h-9 text-xs font-bold text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-border rounded-xl cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5 mr-1 text-rose-500" />
                                {candidate.status === 'rejected' ? '이미 기각됨' : '기각 및 네거티브 학습'}
                            </Button>

                            <Button
                                size="sm"
                                onClick={() => onApprove(candidate.id)}
                                disabled={isApproving || candidate.status === 'approved'}
                                className="h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs rounded-xl cursor-pointer"
                            >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                {candidate.status === 'approved' ? '✓ 채널 승인 완료' : '1클릭 채널 승인 & 입고'}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
