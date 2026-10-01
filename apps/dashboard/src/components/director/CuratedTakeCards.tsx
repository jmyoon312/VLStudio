import React from 'react';
import { 
    Sparkles, Check, Play, Film, Flame, Trophy, TrendingUp, 
    Clock, DollarSign, Layers, ArrowRight, ShieldCheck, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface CreativeTake {
    take_id: string;
    title: string;
    philosophy: string;
    mcts_score: number;
    predicted_retention: number;
    predicted_viral_rate: number;
    estimated_cost_usd: number;
    harness_schema?: any;
}

export interface CuratedTakeCardsProps {
    takes: CreativeTake[];
    selectedTakeId?: string;
    onSelectTake: (take: CreativeTake) => void;
    onPreviewDeltaRender?: (take: CreativeTake) => void;
    onSteerTake?: (take: CreativeTake) => void;
    className?: string;
}

export const CuratedTakeCards: React.FC<CuratedTakeCardsProps> = ({
    takes,
    selectedTakeId,
    onSelectTake,
    onPreviewDeltaRender,
    onSteerTake,
    className
}) => {
    if (!takes || takes.length === 0) return null;

    return (
        <div className={cn("flex flex-col gap-3 my-3 select-none", className)}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="font-extrabold text-sm text-foreground">
                        사전 모의 자기 대국(MCTS) 엄선 3대 테이크
                    </span>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                        150-분기 시뮬레이션 완료
                    </Badge>
                </div>
                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    최적의 연출 방향을 1-클릭으로 선택하세요
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {takes.map((take, idx) => {
                    const isSelected = selectedTakeId === take.take_id;
                    const isTakeA = idx === 0;

                    return (
                        <div
                            key={take.take_id}
                            className={cn(
                                "relative p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 shadow-xs bg-card",
                                isSelected 
                                    ? "border-primary ring-2 ring-primary/30 shadow-md" 
                                    : "border-border/80 hover:border-primary/50"
                            )}
                        >
                            {isTakeA && (
                                <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-xs">
                                    <Flame className="w-3 h-3 fill-current" />
                                    <span>AI 추천 1위</span>
                                </div>
                            )}

                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Badge 
                                        className={cn(
                                            "text-[10px] font-bold uppercase",
                                            idx === 0 ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30" :
                                            idx === 1 ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30" :
                                            "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30"
                                        )}
                                        variant="outline"
                                    >
                                        Take {String.fromCharCode(65 + idx)}
                                    </Badge>
                                    <h4 className="font-bold text-sm text-foreground line-clamp-1">
                                        {take.title}
                                    </h4>
                                </div>

                                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[32px]">
                                    {take.philosophy}
                                </p>

                                {/* Metric Badges */}
                                <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-muted/40 border border-border/50 text-center">
                                    <div>
                                        <div className="text-[10px] text-muted-foreground">MCTS 종합</div>
                                        <div className="text-xs font-mono font-extrabold text-foreground">
                                            {(take.mcts_score * 100).toFixed(0)}점
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-muted-foreground">예측 리텐션</div>
                                        <div className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                                            {(take.predicted_retention * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-muted-foreground">바이럴 지수</div>
                                        <div className="text-xs font-mono font-extrabold text-cyan-600 dark:text-cyan-400">
                                            {(take.predicted_viral_rate * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-1.5 pt-2 border-t border-border/60">
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => onSelectTake(take)}
                                    className={cn(
                                        "w-full h-8 text-xs font-bold gap-1 rounded-xl cursor-pointer transition-all",
                                        isSelected 
                                            ? "bg-primary text-primary-foreground shadow-xs" 
                                            : "bg-muted hover:bg-primary/20 text-foreground"
                                    )}
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{isSelected ? "선택됨" : "이 테이크로 확정"}</span>
                                </Button>

                                <div className="flex items-center gap-1.5">
                                    {onPreviewDeltaRender && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onPreviewDeltaRender(take)}
                                            className="flex-1 h-7 text-[11px] font-semibold rounded-lg gap-1 border-border/80 text-muted-foreground hover:text-foreground cursor-pointer"
                                            title="0.5초 고속 델타 렌더링 미리보기"
                                        >
                                            <Play className="w-3 h-3 text-emerald-500" />
                                            <span>고속 프리뷰</span>
                                        </Button>
                                    )}

                                    {onSteerTake && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onSteerTake(take)}
                                            className="h-7 px-2 text-[11px] font-semibold rounded-lg text-primary hover:bg-primary/10 cursor-pointer"
                                            title="이 테이크를 기반으로 추가 디렉팅 지시"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            <span>수정 지시</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CuratedTakeCards;
