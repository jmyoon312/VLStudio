import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface LoopieIconProps {
    className?: string;
    isTalking?: boolean;
    isSmall?: boolean;
    isLive?: boolean;
    /** '3d' uses the high-res ultra-glossy 3D render with live dynamic animations; 'vector' uses the procedural 3D SVG */
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
        <div className={cn("relative flex items-center justify-center shrink-0 overflow-visible select-none group cursor-pointer", sizeClasses, className)}>
            <style>
            {`
                /* 🌊 1. Dynamic Organic Jelly Breathing & Floating Motion */
                @keyframes loopie-jelly-squish {
                    0%, 100% { transform: translateY(0px) scale(1, 1) rotate(0deg); }
                    25% { transform: translateY(-3.5px) scale(1.04, 0.96) rotate(1.6deg); }
                    50% { transform: translateY(-5px) scale(0.97, 1.03) rotate(-1.2deg); }
                    75% { transform: translateY(-2px) scale(1.02, 0.98) rotate(0.8deg); }
                }
                @keyframes loopie-talk-bounce {
                    0%, 100% { transform: translateY(0px) scale(1, 1); }
                    30% { transform: translateY(-4px) scale(1.06, 0.94); }
                    70% { transform: translateY(1px) scale(0.96, 1.04); }
                }
                /* ✨ 2. Ultra-Glossy Sweeping Sheen (빛 반사 광택 효과) */
                @keyframes loopie-gloss-shimmer {
                    0% { transform: translateX(-150%) skewX(-20deg); opacity: 0; }
                    20% { opacity: 0.85; }
                    45% { transform: translateX(170%) skewX(-20deg); opacity: 0; }
                    100% { transform: translateX(170%) skewX(-20deg); opacity: 0; }
                }
                /* 💫 3. Glossy Glass Rim Light Pulse */
                @keyframes loopie-gloss-pulse {
                    0%, 100% { 
                        filter: drop-shadow(0 4px 10px rgba(56, 189, 248, 0.35)) drop-shadow(0 0 8px rgba(125, 211, 252, 0.3)); 
                    }
                    50% { 
                        filter: drop-shadow(0 6px 16px rgba(56, 189, 248, 0.6)) drop-shadow(0 0 14px rgba(186, 230, 253, 0.5)); 
                    }
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
                @keyframes loopie-live-aura {
                    0%, 100% { transform: scale(1); opacity: 0.35; filter: blur(5px); }
                    50% { transform: scale(1.22); opacity: 0.75; filter: blur(8px); }
                }
                @keyframes loopie-star-gleam {
                    0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.95; }
                    50% { transform: scale(1.2) rotate(14deg); opacity: 1; filter: drop-shadow(0 0 5px rgba(250, 204, 21, 0.9)); }
                }
                .animate-loopie-jelly { 
                    animation: loopie-jelly-squish 3.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite; 
                }
                .animate-loopie-talk-bounce { 
                    animation: loopie-talk-bounce 0.32s ease-in-out infinite; 
                }
                .animate-loopie-gloss-shimmer {
                    animation: loopie-gloss-shimmer 4.2s ease-in-out infinite;
                }
                .animate-loopie-gloss-pulse {
                    animation: loopie-gloss-pulse 2.8s ease-in-out infinite;
                }
                .animate-loopie-blink { 
                    transform-origin: 50% 50%;
                    animation: loopie-blink 3.8s infinite; 
                }
                .animate-loopie-lip-sync { 
                    transform-origin: 50% 50%;
                    animation: loopie-lip-sync 0.24s ease-in-out infinite; 
                }
                .animate-loopie-live-aura { animation: loopie-live-aura 2.2s ease-in-out infinite; }
                .animate-loopie-star-gleam { animation: loopie-star-gleam 2.6s ease-in-out infinite; }
            `}
            </style>

            {/* 1. Gemini Live Glowing Ring (Live 모드 시 신비로운 에메랄드/청록 오라) */}
            {isLive && (
                <div className="absolute inset-[-16%] rounded-full bg-gradient-to-r from-emerald-400/50 via-cyan-400/60 to-blue-500/50 blur-md animate-loopie-live-aura pointer-events-none" />
            )}

            {/* 2. Soft Dynamic Drop Shadow on Floor */}
            <div className="absolute bottom-[-10%] w-[72%] h-[20%] rounded-full bg-slate-900/20 dark:bg-black/45 blur-[4px] pointer-events-none transition-all duration-300 group-hover:scale-90 group-hover:opacity-75" />

            {/* 3. Character Body Container with Fluid Jelly Movement */}
            <div className={cn(
                "relative w-full h-full flex items-center justify-center isolate transition-transform duration-300 group-hover:scale-108 active:scale-95",
                isTalking ? "animate-loopie-talk-bounce" : "animate-loopie-jelly"
            )}>
                {use3DImage ? (
                    /* 🌟 3D Ultra-Glossy Wet Liquid Jelly Render */
                    <div className="relative w-full h-full flex items-center justify-center animate-loopie-gloss-pulse">
                        {/* Rounded Container with Overflow Hidden for Gloss Sweep */}
                        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg ring-1 ring-white/30 dark:ring-white/10 backdrop-blur-xs">
                            <img 
                                src="/assets/loopie_avatar.jpg" 
                                alt="Loopie Chief Producer" 
                                className="w-full h-full object-cover transition-transform duration-300"
                                onError={() => setImgError(true)}
                            />

                            {/* ✨ Glossy Light Sweep Streak (빛이 외부를 스쳐 지나가는 하이글로시 광택) */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                <div className="absolute -top-6 -bottom-6 w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-loopie-gloss-shimmer blur-[1px]" />
                            </div>

                            {/* Glass Specular Glint in Top Corner */}
                            <div className="absolute top-1 left-2 w-1/3 h-1/4 bg-white/25 rounded-full blur-[2px] pointer-events-none rotate-[-15deg]" />
                        </div>

                        {/* Interactive talking overlay */}
                        {isTalking && (
                            <div className="absolute inset-0 rounded-2xl ring-2 ring-cyan-400/80 bg-cyan-400/10 animate-pulse pointer-events-none" />
                        )}

                        {/* Live Aura Dot Badge */}
                        {isLive && (
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 border-2 border-white dark:border-slate-900 shadow-xs" />
                            </span>
                        )}
                    </div>
                ) : (
                    /* 🎨 High-Fidelity 3D Vector Clay/Jelly Mascot (Undulating Silhouette + Gloss Highlights + Beret) */
                    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-lg animate-loopie-gloss-pulse">
                        <defs>
                            {/* Glossy Electric Blue Jelly Radial Gradient */}
                            <radialGradient id={`glossJelly-${uniqueId}`} cx="38%" cy="32%" r="68%">
                                <stop offset="0%" stopColor="#93c5fd" />
                                <stop offset="25%" stopColor="#60a5fa" />
                                <stop offset="55%" stopColor="#3b82f6" />
                                <stop offset="85%" stopColor="#1d4ed8" />
                                <stop offset="100%" stopColor="#1e3a8a" />
                            </radialGradient>

                            {/* Liquid Glass Highlight Gradient */}
                            <linearGradient id={`glassHighlight-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                                <stop offset="40%" stopColor="#ffffff" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                            </linearGradient>

                            {/* Glossy Black Beret Gradient */}
                            <radialGradient id={`beretGloss-${uniqueId}`} cx="35%" cy="28%" r="72%">
                                <stop offset="0%" stopColor="#64748b" />
                                <stop offset="30%" stopColor="#334155" />
                                <stop offset="70%" stopColor="#0f172a" />
                                <stop offset="100%" stopColor="#020617" />
                            </radialGradient>

                            {/* Shiny Gold Star */}
                            <linearGradient id={`goldStar-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#fef08a" />
                                <stop offset="35%" stopColor="#facc15" />
                                <stop offset="75%" stopColor="#eab308" />
                                <stop offset="100%" stopColor="#ca8a04" />
                            </linearGradient>

                            {/* Glossy Bead Eyes */}
                            <radialGradient id={`glossEye-${uniqueId}`} cx="32%" cy="28%" r="70%">
                                <stop offset="0%" stopColor="#475569" />
                                <stop offset="35%" stopColor="#0f172a" />
                                <stop offset="100%" stopColor="#020617" />
                            </radialGradient>

                            {/* Soft Peachy Airbrush Blush */}
                            <radialGradient id={`blushGrad-${uniqueId}`} cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#f87171" stopOpacity="0.75" />
                                <stop offset="60%" stopColor="#fb7185" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#fda4af" stopOpacity="0" />
                            </radialGradient>
                        </defs>

                        {/* --- 1. Undulating Lobed Liquid Body (글로시 젤리 실루엣) --- */}
                        <g>
                            {/* Base Glossy Body */}
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

                            {/* Ambient Occlusion Bottom Depth */}
                            <path 
                                d="M 20,70 C 25,78 33,83 42,86 C 51,89 61,89 69,84 C 78,79 85,71 87,60 C 85,68 76,77 67,81 C 59,85 49,85 40,82 C 31,79 24,74 20,70 Z" 
                                fill="#0f172a" 
                                opacity="0.45" 
                            />

                            {/* 🌟 Ultra-Glossy Curved Specular Highlights (젖은 듯 매끄러운 표면 반사광) */}
                            {/* Main Top Specular Glare */}
                            <path 
                                d="M 32,24 C 42,19 56,20 64,25 C 55,22 41,23 30,28 C 29,26 30,24 32,24 Z" 
                                fill="url(#glassHighlight-${uniqueId})" 
                            />
                            {/* Upper Left Gloss Puddle */}
                            <ellipse cx="26" cy="38" rx="6" ry="12" fill="#ffffff" opacity="0.38" transform="rotate(-30 26 38)" filter="blur(1.5px)" />
                            <ellipse cx="25" cy="36" rx="2.5" ry="6" fill="#ffffff" opacity="0.8" transform="rotate(-30 25 36)" />

                            {/* Right Gloss Edge Reflection */}
                            <path 
                                d="M 82,42 C 84,49 84,56 81,63 C 82,57 82,50 80,44 Z" 
                                fill="#ffffff" 
                                opacity="0.45" 
                                filter="blur(0.8px)" 
                            />
                        </g>

                        {/* --- 2. Soft Rosy Cheeks --- */}
                        <ellipse cx="36" cy="56" rx="7" ry="5" fill={`url(#blushGrad-${uniqueId})`} />
                        <ellipse cx="68" cy="56" rx="7" ry="5" fill={`url(#blushGrad-${uniqueId})`} />

                        {/* --- 3. Glossy Glass Bead Eyes (반짝이는 구슬 눈) --- */}
                        <g className="animate-loopie-blink">
                            {/* Left Bead Eye */}
                            <circle cx="43" cy="48" r="5" fill={`url(#glossEye-${uniqueId})`} />
                            {/* Catchlights */}
                            <circle cx="41.2" cy="46" r="1.8" fill="#ffffff" />
                            <circle cx="44.5" cy="49.8" r="0.9" fill="#ffffff" opacity="0.9" />

                            {/* Right Bead Eye */}
                            <circle cx="61" cy="48" r="5" fill={`url(#glossEye-${uniqueId})`} />
                            {/* Catchlights */}
                            <circle cx="59.2" cy="46" r="1.8" fill="#ffffff" />
                            <circle cx="62.5" cy="49.8" r="0.9" fill="#ffffff" opacity="0.9" />
                        </g>

                        {/* --- 4. Cute Animated Mouth --- */}
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

                        {/* --- 5. Chic Artist Beret with Glossy Gleam & Golden Star Pin --- */}
                        <g className="origin-[38px_24px]">
                            {/* Beret Drop Shadow on Head */}
                            <ellipse cx="38" cy="28" rx="24" ry="11.5" fill="#090d16" opacity="0.45" filter="blur(2.5px)" />

                            {/* Beret Tab / Stem */}
                            <rect x="36.5" y="8" width="3.5" height="7" rx="1.75" fill="#0f172a" />

                            {/* Beret Main Dome */}
                            <ellipse 
                                cx="38" 
                                cy="22" 
                                rx="25" 
                                ry="13" 
                                fill={`url(#beretGloss-${uniqueId})`} 
                                stroke="#020617" 
                                strokeWidth="0.7" 
                            />

                            {/* Beret Silk Specular Highlight */}
                            <path 
                                d="M 18,21 C 24,13 52,13 62,20 C 51,15 27,16 18,21 Z" 
                                fill="#ffffff" 
                                opacity="0.32" 
                                filter="blur(1px)" 
                            />

                            {/* Golden Star Enamel Pin with Twinkle */}
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
 * Compact Nav Icon for Sidebar with 3D Glossy Beret Look
 */
export interface LoopieNavIconProps {
    className?: string;
}

export const LoopieNavIcon: React.FC<LoopieNavIconProps> = ({ className }) => (
    <div className={cn("relative w-5 h-5 flex items-center justify-center shrink-0 group select-none", className)}>
        <div className="relative w-5 h-5 rounded-full overflow-hidden shadow-xs ring-1 ring-cyan-400/50 bg-slate-900">
            <img 
                src="/assets/loopie_avatar.jpg" 
                alt="Loopie" 
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-115"
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                }}
            />
            {/* Fallback stylized badge */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center -z-10">
                <span className="text-[10px] font-black text-white">L</span>
            </div>
        </div>
    </div>
);
