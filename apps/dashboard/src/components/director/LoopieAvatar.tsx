import React from 'react';
import { cn } from '@/lib/utils';

export interface LoopieIconProps {
    className?: string;
    isTalking?: boolean;
    isSmall?: boolean;
    isLive?: boolean;
}

export const LoopieIcon: React.FC<LoopieIconProps> = ({ 
    className, 
    isTalking, 
    isSmall, 
    isLive 
}) => {
    const hasExplicitSize = className && (/\b[wh]-\d+|\b[wh]-\[/.test(className));
    const sizeClasses = hasExplicitSize ? "" : (isSmall ? "w-6 h-6" : "w-14 h-14");

    return (
        <div className={cn("relative flex items-center justify-center shrink-0 overflow-visible select-none", sizeClasses, className)}>
            <style>
            {`
                @keyframes loopie-blink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    95% { transform: scaleY(0.1); }
                }
                @keyframes loopie-wobble {
                    0%, 100% { transform: scale(1) rotate(0deg); border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
                    50% { transform: scale(1.1) rotate(5deg); border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
                }
                @keyframes loopie-float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes loopie-talk {
                    0%, 100% { transform: scaleY(1); }
                    50% { transform: scaleY(1.8) translateY(1px); }
                }
                @keyframes loopie-live-pulse {
                    0%, 100% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.35); opacity: 0.8; }
                }
                .animate-loopie-blink { animation: loopie-blink 4s infinite; }
                .animate-loopie-wobble { animation: loopie-wobble 8s ease-in-out infinite; }
                .animate-loopie-float { animation: loopie-float 4s ease-in-out infinite; }
                .animate-loopie-talk { animation: loopie-talk 0.2s ease-in-out infinite; }
                .animate-loopie-live-pulse { animation: loopie-live-pulse 2s ease-in-out infinite; }
            `}
        </style>
        
        {/* Gemini 3.8 Live Glowing Outer Aura Ring */}
        {isLive && (
            <div className="absolute inset-[-45%] rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500 blur-lg animate-loopie-live-pulse pointer-events-none" />
        )}

        <div className="absolute inset-0 flex items-center justify-center isolate animate-loopie-float">
            <div className={cn(
                "absolute animate-loopie-wobble mix-blend-screen blur-[15px] bg-gradient-to-tr transition-all duration-500",
                isLive ? "from-emerald-400 via-cyan-300 to-blue-400" : "from-blue-400 via-cyan-300 to-indigo-400",
                isSmall ? "inset-[-30%] opacity-30" : "inset-[-60%]",
                !isSmall && isTalking ? "opacity-100 scale-150 blur-[20px]" : "opacity-40"
            )} style={{ animationDuration: '10s' }} />
            
            <div className={cn(
                "absolute inset-0 animate-loopie-wobble shadow-inner-[0_0_20px_rgba(255,255,255,0.4)]",
                isLive ? "bg-gradient-to-tr from-emerald-600 to-cyan-600" : "bg-gradient-to-tr from-blue-600 to-indigo-600",
                isSmall ? "shadow-[0_4px_12px_rgba(37,99,235,0.3)]" : "shadow-[0_10px_35px_rgba(37,99,235,0.5)]"
            )} style={{ animationDuration: '6s', animationDelay: '-2s' }} />
            
            <div className="absolute top-[10%] left-[15%] w-[40%] h-[20%] bg-white/40 blur-[3px] rounded-full rotate-[-25deg] pointer-events-none" />
        </div>
        
        <div className={cn(
            "relative z-30 flex flex-col items-center animate-loopie-float",
            isSmall ? "gap-[2px] translate-y-[2px]" : "gap-[5px] translate-y-[8px]"
        )}>
            <div className={cn("flex", isSmall ? "gap-2" : "gap-4")}>
                <div className={cn("relative bg-blue-950 rounded-full animate-loopie-blink", isSmall ? "w-[3px] h-[5px]" : "w-[7.5px] h-[12.5px]")}>
                    <div className="absolute top-[15%] right-[10%] w-[40%] h-[30%] bg-white rounded-full opacity-95" />
                </div>
                <div className={cn("relative bg-blue-950 rounded-full animate-loopie-blink", isSmall ? "w-[3px] h-[5px]" : "w-[7.5px] h-[12.5px]")}>
                    <div className="absolute top-[15%] right-[10%] w-[40%] h-[30%] bg-white rounded-full opacity-95" />
                </div>
            </div>
            <div className={cn("transition-transform", !isSmall && isTalking && "animate-loopie-talk")}>
                <svg width={isSmall ? "10" : "26"} height={isSmall ? "4" : "12"} viewBox={isSmall ? "0 0 10 4" : "0 0 26 12"} fill="none" className="opacity-90">
                    <path 
                        d={isSmall ? "M2 1C2 1 3.5 3 5 3C6.5 3 8 1 8 1" : (isTalking ? "M4 6C4 6 9 10 13 10C17 10 22 6 22 6" : "M4 4C4 4 9 8 13 8C17 8 22 4 22 4")} 
                        stroke="#082f49" 
                        strokeWidth={isSmall ? "1.5" : "3"} 
                        strokeLinecap="round" 
                    />
                </svg>
            </div>
        </div>
    </div>
    );
};

/**
 * Compact Nav Icon for Sidebar
 */
export interface LoopieNavIconProps {
    className?: string;
}

export const LoopieNavIcon: React.FC<LoopieNavIconProps> = ({ className }) => (
    <div className={cn("relative w-4 h-4 flex items-center justify-center shrink-0", className)}>
        <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-xs">
            <span className="text-[9px] font-black text-white">L</span>
        </div>
    </div>
);
