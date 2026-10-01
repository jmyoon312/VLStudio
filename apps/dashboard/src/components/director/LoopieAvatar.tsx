import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface LoopieIconProps {
    className?: string;
    isTalking?: boolean;
    isSmall?: boolean;
    isLive?: boolean;
    /** '3d' uses the transparent 3D render without any background box; 'vector' uses the procedural 3D SVG */
    variant?: '3d' | 'vector';
}

export const LoopieIcon: React.FC<LoopieIconProps> = ({ 
    className, 
    isTalking, 
    isSmall, 
    isLive,
    variant = '3d'
}) => {
    const hasExplicitSize = className && (/\b[wh]-\d+|\b[wh]-\[/.test(className));
    const sizeClasses = hasExplicitSize ? "" : (isSmall ? "w-8 h-8" : "w-12 h-12");
    const uniqueId = React.useId().replace(/:/g, '');
    const [imgError, setImgError] = useState(false);

    const use3DImage = variant === '3d' && !imgError;

    return (
        <div className={cn("relative inline-flex items-center justify-center shrink-0 overflow-visible select-none group cursor-pointer", sizeClasses, className)}>
            <style>
            {`
                /* 🌊 1. Dynamic Organic Jelly Breathing & Floating Motion for Loopie Body (박스 없이 루피 본체만 유기적으로 움직임) */
                @keyframes loopie-body-float {
                    0%, 100% { 
                        transform: translateY(0px) scale(1, 1) rotate(0deg); 
                        filter: drop-shadow(0 6px 12px rgba(37, 99, 235, 0.28)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.12));
                    }
                    25% { 
                        transform: translateY(-4px) scale(1.03, 0.97) rotate(1.8deg); 
                        filter: drop-shadow(0 10px 18px rgba(37, 99, 235, 0.38)) drop-shadow(0 4px 6px rgba(0, 0, 0, 0.15));
                    }
                    50% { 
                        transform: translateY(-6px) scale(0.97, 1.03) rotate(-1.5deg); 
                        filter: drop-shadow(0 12px 22px rgba(37, 99, 235, 0.42)) drop-shadow(0 5px 8px rgba(0, 0, 0, 0.18));
                    }
                    75% { 
                        transform: translateY(-2px) scale(1.02, 0.98) rotate(0.8deg); 
                        filter: drop-shadow(0 8px 14px rgba(37, 99, 235, 0.32)) drop-shadow(0 3px 5px rgba(0, 0, 0, 0.14));
                    }
                }
                @keyframes loopie-talk-bounce {
                    0%, 100% { 
                        transform: translateY(0px) scale(1, 1); 
                        filter: drop-shadow(0 6px 12px rgba(56, 189, 248, 0.35));
                    }
                    30% { 
                        transform: translateY(-5px) scale(1.07, 0.93) rotate(2deg); 
                        filter: drop-shadow(0 12px 20px rgba(56, 189, 248, 0.55));
                    }
                    70% { 
                        transform: translateY(1.5px) scale(0.95, 1.05) rotate(-1.5deg); 
                        filter: drop-shadow(0 4px 8px rgba(56, 189, 248, 0.4));
                    }
                }
                @keyframes loopie-live-aura {
                    0%, 100% { transform: scale(0.95); opacity: 0.4; filter: blur(6px); }
                    50% { transform: scale(1.18); opacity: 0.75; filter: blur(10px); }
                }
                @keyframes loopie-blink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    95% { transform: scaleY(0.08); }
                }
                @keyframes loopie-lip-sync {
                    0%, 100% { transform: scaleY(0.4) scaleX(0.9); }
                    25% { transform: scaleY(1.4) scaleX(1.1); }
                    50% { transform: scaleY(0.65) scaleX(0.95); }
                    75% { transform: scaleY(1.3) scaleX(1.05); }
                }
                @keyframes loopie-star-gleam {
                    0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.95; }
                    50% { transform: scale(1.2) rotate(14deg); opacity: 1; filter: drop-shadow(0 0 5px rgba(250, 204, 21, 0.9)); }
                }
                .animate-loopie-body { 
                    animation: loopie-body-float 3.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite; 
                }
                .animate-loopie-talk-bounce { 
                    animation: loopie-talk-bounce 0.32s ease-in-out infinite; 
                }
                .animate-loopie-live-aura { 
                    animation: loopie-live-aura 2.2s ease-in-out infinite; 
                }
                .animate-loopie-blink { 
                    transform-origin: 50% 50%;
                    animation: loopie-blink 3.8s infinite; 
                }
                .animate-loopie-lip-sync { 
                    transform-origin: 50% 50%;
                    animation: loopie-lip-sync 0.24s ease-in-out infinite; 
                }
                .animate-loopie-star-gleam { 
                    animation: loopie-star-gleam 2.6s ease-in-out infinite; 
                }
            `}
            </style>

            {/* 1. Gemini Live & Antigravity Aura (박스 없이 루피 외곽 뒤에서만 은은하게 퍼지는 광채) */}
            {isLive && (
                <div className="absolute inset-[-10%] rounded-full bg-gradient-to-r from-emerald-400/40 via-cyan-400/50 to-blue-500/40 blur-lg animate-loopie-live-aura pointer-events-none -z-10" />
            )}

            {/* 2. Character Body (박스/배경 완전 제거! 루피 본체 실루엣만 둥둥 떠서 유기적으로 호흡하고 움직임) */}
            <div className={cn(
                "relative w-full h-full flex items-center justify-center isolate transition-transform duration-300 group-hover:scale-110 active:scale-95",
                isTalking ? "animate-loopie-talk-bounce" : "animate-loopie-body"
            )}>
                {use3DImage ? (
                    /* 🌟 100% Transparent PNG 3D Mascot (No Background Box, No Cards, No Frame) */
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img 
                            src="/assets/loopie_avatar.png?v=3" 
                            alt="Loopie Chief Producer" 
                            className="w-full h-full object-contain pointer-events-none select-none transition-transform duration-300 filter drop-shadow-[0_4px_12px_rgba(56,189,248,0.35)]"
                            onError={() => setImgError(true)}
                        />

                        {/* Live Mode Tiny Pulsing Dot */}
                        {isLive && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 border border-white dark:border-slate-900 shadow-xs" />
                            </span>
                        )}
                    </div>
                ) : (
                    /* 🎨 Scalable 3D Vector Mascot (No Background, Pure Silhouette) */
                    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                        <defs>
                            <radialGradient id={`glossJelly-${uniqueId}`} cx="38%" cy="32%" r="68%">
                                <stop offset="0%" stopColor="#93c5fd" />
                                <stop offset="25%" stopColor="#60a5fa" />
                                <stop offset="55%" stopColor="#3b82f6" />
                                <stop offset="85%" stopColor="#1d4ed8" />
                                <stop offset="100%" stopColor="#1e3a8a" />
                            </radialGradient>

                            <linearGradient id={`glassHighlight-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                                <stop offset="40%" stopColor="#ffffff" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                            </linearGradient>

                            <radialGradient id={`beretGloss-${uniqueId}`} cx="35%" cy="28%" r="72%">
                                <stop offset="0%" stopColor="#64748b" />
                                <stop offset="30%" stopColor="#334155" />
                                <stop offset="70%" stopColor="#0f172a" />
                                <stop offset="100%" stopColor="#020617" />
                            </radialGradient>

                            <linearGradient id={`goldStar-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#fef08a" />
                                <stop offset="35%" stopColor="#facc15" />
                                <stop offset="75%" stopColor="#eab308" />
                                <stop offset="100%" stopColor="#ca8a04" />
                            </linearGradient>

                            <radialGradient id={`glossEye-${uniqueId}`} cx="32%" cy="28%" r="70%">
                                <stop offset="0%" stopColor="#475569" />
                                <stop offset="35%" stopColor="#0f172a" />
                                <stop offset="100%" stopColor="#020617" />
                            </radialGradient>

                            <radialGradient id={`blushGrad-${uniqueId}`} cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#f87171" stopOpacity="0.75" />
                                <stop offset="60%" stopColor="#fb7185" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#fda4af" stopOpacity="0" />
                            </radialGradient>
                        </defs>

                        {/* --- Undulating Lobed Liquid Body --- */}
                        <g>
                            <path 
                                d="M 50,18 
                                   C 63,17 73,22 80,30 
                                   C 88,38 90,49 87,60 
                                   C 85,71 78,79 69,84 
                                   C 61,89 51,89 42,86 
                                   C 33,83 25,78 20,70 
                                   C 14,62 13,51 16,40 
                                   C 18,31 25,22 34,18 
                                   C 40,16 45,17 50,18 Z" 
                                fill={`url(#glossJelly-${uniqueId})`}
                            />

                            <path 
                                d="M 20,70 C 25,78 33,83 42,86 C 51,89 61,89 69,84 C 78,79 85,71 87,60 C 85,68 76,77 67,81 C 59,85 49,85 40,82 C 31,79 24,74 20,70 Z" 
                                fill="#0f172a" 
                                opacity="0.45" 
                            />

                            <path 
                                d="M 32,24 C 42,19 56,20 64,25 C 55,22 41,23 30,28 C 29,26 30,24 32,24 Z" 
                                fill={`url(#glassHighlight-${uniqueId})`} 
                            />
                            <ellipse cx="26" cy="38" rx="6" ry="12" fill="#ffffff" opacity="0.38" transform="rotate(-30 26 38)" filter="blur(1.5px)" />
                            <ellipse cx="25" cy="36" rx="2.5" ry="6" fill="#ffffff" opacity="0.8" transform="rotate(-30 25 36)" />
                        </g>

                        {/* --- Rosy Cheeks --- */}
                        <ellipse cx="36" cy="56" rx="7" ry="5" fill={`url(#blushGrad-${uniqueId})`} />
                        <ellipse cx="68" cy="56" rx="7" ry="5" fill={`url(#blushGrad-${uniqueId})`} />

                        {/* --- Glossy Bead Eyes --- */}
                        <g className="animate-loopie-blink">
                            <circle cx="43" cy="48" r="5" fill={`url(#glossEye-${uniqueId})`} />
                            <circle cx="41.2" cy="46" r="1.8" fill="#ffffff" />
                            <circle cx="44.5" cy="49.8" r="0.9" fill="#ffffff" opacity="0.9" />

                            <circle cx="61" cy="48" r="5" fill={`url(#glossEye-${uniqueId})`} />
                            <circle cx="59.2" cy="46" r="1.8" fill="#ffffff" />
                            <circle cx="62.5" cy="49.8" r="0.9" fill="#ffffff" opacity="0.9" />
                        </g>

                        {/* --- Mouth --- */}
                        {isTalking ? (
                            <g className="animate-loopie-lip-sync">
                                <path 
                                    d="M 48,54 Q 52,63 56,54 Z" 
                                    fill="#0f172a" 
                                    stroke="#1e293b" 
                                    strokeWidth="0.8" 
                                />
                                <ellipse cx="52" cy="59" rx="2.5" ry="1.7" fill="#fb7185" />
                            </g>
                        ) : (
                            <path 
                                d="M 48.5,54.5 Q 52,58.5 55.5,54.5" 
                                stroke="#0f172a" 
                                strokeWidth="2.4" 
                                strokeLinecap="round" 
                                fill="none" 
                            />
                        )}

                        {/* --- Artist Beret with Golden Star Pin --- */}
                        <g className="origin-[38px_24px]">
                            <ellipse cx="38" cy="28" rx="24" ry="11.5" fill="#090d16" opacity="0.45" filter="blur(2.5px)" />
                            <rect x="36.5" y="8" width="3.5" height="7" rx="1.75" fill="#0f172a" />
                            <ellipse 
                                cx="38" 
                                cy="22" 
                                rx="25" 
                                ry="13" 
                                fill={`url(#beretGloss-${uniqueId})`} 
                                stroke="#020617" 
                                strokeWidth="0.7" 
                            />
                            <path 
                                d="M 18,21 C 24,13 52,13 62,20 C 51,15 27,16 18,21 Z" 
                                fill="#ffffff" 
                                opacity="0.32" 
                                filter="blur(1px)" 
                            />

                            {/* Golden Star Pin */}
                            <g className="animate-loopie-star-gleam origin-[49px_19px]">
                                <circle cx="49" cy="19" r="5" fill="#facc15" opacity="0.35" filter="blur(2px)" />
                                <polygon 
                                    points="49,14 50.5,17.6 54.3,18 51.4,20.6 52.2,24.3 49,22.4 45.8,24.3 46.6,20.6 43.7,18 47.5,17.6" 
                                    fill={`url(#goldStar-${uniqueId})`} 
                                    stroke="#b45309" 
                                    strokeWidth="0.5" 
                                />
                                <circle cx="48.5" cy="17" r="0.85" fill="#ffffff" />
                            </g>
                        </g>
                    </svg>
                )}
            </div>
        </div>
    );
};

/**
 * Compact Nav Icon for Sidebar (No Box, Pure Mascot Silhouette)
 */
export interface LoopieNavIconProps {
    className?: string;
}

export const LoopieNavIcon: React.FC<LoopieNavIconProps> = ({ className }) => (
    <div className={cn("relative w-5 h-5 flex items-center justify-center shrink-0 group select-none overflow-visible", className)}>
        <img 
            src="/assets/loopie_avatar.png?v=3" 
            alt="Loopie" 
            className="w-full h-full object-contain filter drop-shadow-xs transition-transform duration-200 group-hover:scale-125"
            onError={(e) => {
                e.currentTarget.style.display = 'none';
            }}
        />
        {/* Fallback stylized badge if image fails */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 rounded-full flex items-center justify-center -z-10 hidden">
            <span className="text-[10px] font-black text-white">L</span>
        </div>
    </div>
);
