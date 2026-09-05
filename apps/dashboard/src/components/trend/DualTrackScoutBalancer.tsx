import React, { useState, useEffect } from 'react';
import { Sliders, Target, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

export const DualTrackScoutBalancer: React.FC = () => {
    const [ratio, setRatio] = useState<number>(60);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const fetchRatio = async () => {
            try {
                const res = await api.get('/trend-radar/quant-metrics');
                if (res.data?.category_focus_ratio !== undefined && !isUpdating) {
                    setRatio(Math.round(res.data.category_focus_ratio * 100));
                }
            } catch (err) {
                // silent background polling
            }
        };
        fetchRatio();
        const timer = setInterval(fetchRatio, 2500);
        return () => clearInterval(timer);
    }, [isUpdating]);

    const handleSetRatio = async (newVal: number) => {
        const clamped = Math.max(0, Math.min(100, Math.round(newVal)));
        setRatio(clamped);
        setIsUpdating(true);
        try {
            await api.post('/trend-radar/worker/ratio', { ratio: clamped / 100 });
        } catch (e) {
            console.error('[DualTrackBalancer] Failed to set ratio:', e);
        } finally {
            setTimeout(() => setIsUpdating(false), 500);
        }
    };

    return (
        <div className="bg-card/40 border border-border/70 rounded-2xl p-3 sm:px-4 sm:py-2.5 flex flex-col justify-between space-y-2 h-full shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Sliders className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span>듀얼 트랙 자율 수집 밸런서</span>
                    </h3>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => handleSetRatio(0)}
                        className={cn(
                            "px-2 py-0.5 rounded-md text-[10.5px] font-semibold border transition-all cursor-pointer",
                            ratio === 0 
                                ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 font-bold" 
                                : "bg-background hover:bg-muted text-muted-foreground border-border"
                        )}
                        title="기존 카테고리 심화 없이 광역 신규 키워드 및 트렌드만 100% 탐색"
                    >
                        신규 (0:100)
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSetRatio(60)}
                        className={cn(
                            "px-2 py-0.5 rounded-md text-[10.5px] font-semibold border transition-all cursor-pointer",
                            ratio === 60 
                                ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-bold" 
                                : "bg-background hover:bg-muted text-muted-foreground border-border"
                        )}
                        title="추천 스파이더링 60% : 광역 발굴 40% 표준 황금비율"
                    >
                        균형 (60:40)
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSetRatio(100)}
                        className={cn(
                            "px-2 py-0.5 rounded-md text-[10.5px] font-semibold border transition-all cursor-pointer",
                            ratio === 100 
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold" 
                                : "bg-background hover:bg-muted text-muted-foreground border-border"
                        )}
                        title="등록된 타겟 채널과 카테고리 DNA 기반 추천 그래프만 100% 집중 탐색"
                    >
                        집중 (100:0)
                    </button>
                </div>
            </div>

            {/* Compact Slider & Status Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        <span>심화 {ratio}%</span>
                    </span>

                    {/* Compact Slider (w-28 sm:w-36) */}
                    <div className="relative w-28 sm:w-36 flex items-center">
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={ratio}
                            onChange={(e) => handleSetRatio(Number(e.target.value))}
                            className="w-full h-1.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-sky-500 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>

                    <span className="text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400 shrink-0 flex items-center gap-1">
                        <span>광역 {100 - ratio}%</span>
                        <Globe className="w-3 h-3" />
                    </span>
                </div>

                <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                    <span className="text-indigo-500 font-bold">⚡ 수집 모드:</span>
                    <span>{ratio === 100 ? '타겟 채널 100% 심화' : ratio === 0 ? '광역 신규 100% 발굴' : `심화 ${ratio}% : 광역 ${100 - ratio}% 분기`}</span>
                </div>
            </div>
        </div>
    );
};