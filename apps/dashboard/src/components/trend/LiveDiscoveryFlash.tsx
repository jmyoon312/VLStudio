import React, { useState, useEffect } from 'react';
import { Sparkles, Flame, Play, Eye, TrendingUp, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { RadarCandidate } from '../../lib/api';

interface LiveDiscoveryFlashProps {
    candidates: RadarCandidate[];
    onSelectCandidate: (candidate: RadarCandidate) => void;
}

export const LiveDiscoveryFlash: React.FC<LiveDiscoveryFlashProps> = ({
    candidates,
    onSelectCandidate
}) => {
    // Top viral candidates with outlier >= 3.0
    const topGems = candidates.filter(c => c.outlier_ratio >= 3.0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (topGems.length <= 1 || isPaused) return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % topGems.length);
        }, 2200); // 2.2-second smooth rolling ticker
        return () => clearInterval(interval);
    }, [topGems.length, isPaused]);

    if (topGems.length === 0) {
        return null;
    }

    const current = topGems[currentIndex] || topGems[0];

    return (
        <div 
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="flex items-center gap-3 bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-purple-600/15 border border-indigo-500/30 p-2 sm:p-2.5 rounded-2xl max-w-xl transition-all shadow-sm group"
        >
            {/* Left Pulsing Badge */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20 relative">
                <Flame className="w-5 h-5 fill-amber-300 text-amber-300 animate-bounce" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-background rounded-full animate-ping" />
            </div>

            {/* Middle Rolling Information (Animated Slide Transition) */}
            <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center gap-2 text-[10.5px]">
                    <span className="font-bold text-indigo-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 fill-current" />
                        LIVE 옥석 검증 포착
                    </span>
                    <span className="font-mono font-black text-amber-400 bg-black/60 px-1.5 py-0.2 rounded text-[10px] border border-amber-500/30">
                        {current.outlier_ratio}x 폭발 🔥
                    </span>
                    <span className="text-[9.5px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                        <ShieldCheck className="w-3 h-3" />
                        DNA 검증 완료
                    </span>
                </div>

                <div className="relative h-5 overflow-hidden mt-0.5">
                    <h4 
                        key={current.id}
                        className="text-xs font-bold truncate text-foreground animate-in slide-in-from-bottom-2 duration-300"
                    >
                        {current.title}
                    </h4>
                </div>

                <p className="text-[10px] text-muted-foreground truncate">
                    {current.channel_title} · 조회수 {current.view_count.toLocaleString()}회 · {current.video_type === 'shorts' ? '⚡쇼츠' : '🎬롱폼'}
                </p>
            </div>

            {/* Right Action Button */}
            <Button
                size="sm"
                onClick={() => onSelectCandidate(current)}
                className="h-8 px-3 text-[11px] font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs shrink-0 cursor-pointer"
            >
                <Play className="w-3 h-3 fill-white mr-1" />
                즉시 분석
            </Button>
        </div>
    );
};
