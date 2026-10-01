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
    const sizeClasses = hasExplicitSize ? "" : (isSmall ? "w-6 h-6" : "w-10 h-10");
    const uniqueId = React.useId().replace(/:/g, '');

    return (
        <div className={cn("relative flex items-center justify-center shrink-0 overflow-visible select-none", sizeClasses, className)}>
            <style>
            {`
                @keyframes loopie-wobble {
                    0%, 100% { transform: scale(1) rotate(0deg); border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
                    50% { transform: scale(1.07) rotate(4deg); border-radius: 35% 65% 65% 35% / 50% 60% 40% 50%; }
                }
                @keyframes loopie-float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-3px); }
                }
                @keyframes loopie-blink {
                    0%, 92%, 100% { transform: scaleY(1); }
                    96% { transform: scaleY(0.08); }
                }
                @keyframes loopie-lip-sync {
                    0%, 100% { transform: scaleY(0.4) scaleX(0.9); }
                    25% { transform: scaleY(1.3) scaleX(1.1); }
                    50% { transform: scaleY(0.65) scaleX(0.95); }
                    75% { transform: scaleY(1.2) scaleX(1.05); }
                }
                @keyframes loopie-talk-bounce {
                    0%, 100% { transform: translateY(0px) scale(1); }
                    50% { transform: translateY(-2px) scale(1.04); }
                }
                @keyframes loopie-live-aura {
                    0%, 100% { transform: scale(1); opacity: 0.2; }
                    50% { transform: scale(1.15); opacity: 0.4; }
                }
                .animate-loopie-wobble { animation: loopie-wobble 7s ease-in-out infinite; }
                .animate-loopie-float { animation: loopie-float 3.2s ease-in-out infinite; }
                .animate-loopie-blink { 
                    transform-origin: 25px 13px;
                    animation: loopie-blink 3.8s infinite; 
                }
                .animate-loopie-lip-sync { 
                    transform-origin: 25px 21px;
                    animation: loopie-lip-sync 0.26s ease-in-out infinite; 
                }
                .animate-loopie-talk-bounce { animation: loopie-talk-bounce 0.35s ease-in-out infinite; }
                .animate-loopie-live-aura { animation: loopie-live-aura 2.2s ease-in-out infinite; }
            `}
            </style>

            {/* 1. Gemini Live Glowing Outer Pulse Ring (은은하고 고급스러운 라이브 광채) */}
            {isLive && (
                <div className="absolute inset-[-15%] rounded-full bg-gradient-to-r from-emerald-500/50 via-teal-400/50 to-cyan-400/50 blur-sm animate-loopie-live-aura pointer-events-none" />
            )}

            {/* 2. Living Fluid Organic Body & Ambient Glow (사용자가 좋아하신 활동성 넘치는 외형 움직임) */}
            <div className={cn(
                "absolute inset-0 flex items-center justify-center isolate",
                isTalking ? "animate-loopie-talk-bounce" : "animate-loopie-float"
            )}>
                {/* Outer Ambient Glow Aura (눈부시지 않도록 밝기 안정화) */}
                <div 
                    className={cn(
                        "absolute animate-loopie-wobble mix-blend-screen blur-[10px] bg-gradient-to-tr transition-all duration-500 pointer-events-none",
                        isLive ? "from-emerald-400/40 via-cyan-300/40 to-blue-400/40" : "from-blue-400/30 via-cyan-300/30 to-indigo-400/30",
                        isSmall ? "inset-[-10%] opacity-25" : "inset-[-18%]",
                        isTalking ? "opacity-45 scale-110 blur-[12px]" : "opacity-25"
                    )} 
                    style={{ animationDuration: '9s' }} 
                />

                {/* Morphing Liquid Wobble Character Body */}
                <div 
                    className={cn(
                        "absolute inset-0 animate-loopie-wobble transition-colors duration-500",
                        isLive ? "bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400" : "bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400",
                        isSmall 
                            ? "shadow-[0_2px_10px_rgba(37,99,235,0.35)]" 
                            : "shadow-[0_6px_25px_rgba(37,99,235,0.45)]"
                    )} 
                    style={{ animationDuration: '6s', animationDelay: '-1.5s' }} 
                />

                {/* 3D Specular Highlight on Wobble Body */}
                <div className="absolute top-[10%] left-[16%] w-[38%] h-[22%] bg-white/45 blur-[2px] rounded-full rotate-[-22deg] pointer-events-none" />
            </div>

            {/* 3. Perfectly Proportioned Adorable Face (황금비율로 약간 더 또렷하고 귀여워진 이목구비) */}
            <div className={cn(
                "absolute top-[18%] left-[13%] w-[74%] h-[66%] z-30 pointer-events-none flex items-center justify-center",
                isTalking ? "animate-loopie-talk-bounce" : "animate-loopie-float"
            )}>
                <svg viewBox="0 0 50 35" className="w-full h-full overflow-visible drop-shadow-xs">
                    <defs>
                        {/* Eye Gradient */}
                        <radialGradient id={`eyeGrad-${uniqueId}`} cx="35%" cy="30%" r="65%">
                            <stop offset="0%" stopColor="#1e293b" />
                            <stop offset="100%" stopColor="#090d16" />
                        </radialGradient>
                        {/* Soft Blush Gradient */}
                        <radialGradient id={`blushGrad-${uniqueId}`} cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.75" />
                            <stop offset="100%" stopColor="#fda4af" stopOpacity="0" />
                        </radialGradient>
                    </defs>

                    {/* Rosy Cheeks (사랑스러운 복숭아빛 볼터치) */}
                    <ellipse cx="8.5" cy="20" rx="4.4" ry="2.6" fill={`url(#blushGrad-${uniqueId})`} opacity={isTalking ? "0.95" : "0.8"} />
                    <ellipse cx="41.5" cy="20" rx="4.4" ry="2.6" fill={`url(#blushGrad-${uniqueId})`} opacity={isTalking ? "0.95" : "0.8"} />

                    {/* Eyes: Golden-Ratio Centered (약 20% 확대되어 더 또렷하고 사랑스러운 눈망울) */}
                    {isTalking ? (
                        // Happy Eyes (^ ^) when talking
                        <g stroke="#090d16" strokeWidth="2.6" strokeLinecap="round" fill="none">
                            <path d="M 12.5 14 Q 17 8.5 21.5 14" />
                            <path d="M 28.5 14 Q 33 8.5 37.5 14" />
                        </g>
                    ) : (
                        // Adorable Normal Eyes with Double Sparkling Catchlights & Blinking
                        <g className="animate-loopie-blink">
                            {/* Left Eye */}
                            <ellipse cx="17" cy="13" rx="4.0" ry="5.2" fill={`url(#eyeGrad-${uniqueId})`} />
                            {/* Left Catchlights (Big & Small) */}
                            <circle cx="15.5" cy="11" r="1.55" fill="#ffffff" />
                            <circle cx="18.2" cy="14.8" r="0.75" fill="#ffffff" opacity="0.9" />

                            {/* Right Eye */}
                            <ellipse cx="33" cy="13" rx="4.0" ry="5.2" fill={`url(#eyeGrad-${uniqueId})`} />
                            {/* Right Catchlights (Big & Small) */}
                            <circle cx="31.5" cy="11" r="1.55" fill="#ffffff" />
                            <circle cx="34.2" cy="14.8" r="0.75" fill="#ffffff" opacity="0.9" />
                        </g>
                    )}

                    {/* Cute Tiny Nose Dot (앙증맞은 코) */}
                    <circle cx="25" cy="17.5" r="0.7" fill="#090d16" opacity="0.3" />

                    {/* Mouth (입) */}
                    {isTalking ? (
                        // Expressive Open Mouth with Lip-Sync & Tongue
                        <g className="animate-loopie-lip-sync">
                            <path 
                                d="M 20.5 19 Q 25 27.5 29.5 19 Z" 
                                fill="#0b0f19" 
                                stroke="#1e293b" 
                                strokeWidth="0.7" 
                            />
                            <ellipse cx="25" cy="24.2" rx="2.8" ry="1.8" fill="#fb7185" />
                        </g>
                    ) : (
                        // Sweet Gentle Smile Curve
                        <path 
                            d="M 20.5 21.2 Q 25 25.8 29.5 21.2" 
                            stroke="#090d16" 
                            strokeWidth="2.2" 
                            strokeLinecap="round" 
                            fill="none" 
                        />
                    )}
                </svg>
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
