import React from 'react';
import { AbsoluteFill, Video, Audio, Sequence, Img } from 'remotion';
import { z } from 'zod';
import { SubtitleOverlay } from '../components/SubtitleOverlay';

// Zod Schema for Validation
export const DynamicShortsSchema = z.object({
    topBar: z.object({
        height: z.number(),
        backgroundColor: z.string(),
        text: z.string().optional(),
        lines: z.array(z.object({
            text: z.string(),
            color: z.string().optional(),
            fontSize: z.number().optional(),
            fontWeight: z.string().optional()
        })).optional(),
        textStyle: z.record(z.any()).optional()
    }).optional(),

    hookBar: z.object({
        enabled: z.boolean(),
        text: z.string(),
        bgColor: z.string().optional(),
        textColor: z.string().optional(),
        yPct: z.number().optional(),
        heightPct: z.number().optional(),
        fontSize: z.number().optional()
    }).optional(),

    bottomBar: z.object({
        height: z.number(),
        backgroundColor: z.string()
    }).optional(),

    mainVideo: z.object({
        src: z.string(),
        scaleMode: z.enum(['fit', 'fill', '1:1']),
        volume: z.number().optional()
    }),

    audio: z.object({
        src: z.string(),
        volume: z.number().optional()
    }).optional(),

    // Subtitles array
    subtitles: z.array(z.object({
        text: z.string(),
        startFrame: z.number(),
        durationFrames: z.number(),
        position: z.any().optional(),
        style: z.any().optional(),
        animationType: z.any().optional()
    })).optional()
});

export const DynamicShortsTemplate: React.FC<z.infer<typeof DynamicShortsSchema>> = ({
    topBar,
    hookBar,
    bottomBar,
    mainVideo,
    audio,
    subtitles = []
}) => {

    const videoContainerStyle: React.CSSProperties = {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative'
    };

    let videoStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    };

    if (mainVideo.scaleMode === 'fit') {
        videoStyle.objectFit = 'contain';
    }

    // Parse 2-line headline (뇌전구 / 클래식 표준: 1행 흰색 #FFFFFF, 2행 형광 옐로우 #FFE500)
    const headerLines = React.useMemo(() => {
        if (topBar?.lines && topBar.lines.length > 0) {
            return topBar.lines;
        }
        if (topBar?.text) {
            const parts = topBar.text.split('\n').map(s => s.trim()).filter(Boolean);
            if (parts.length >= 2) {
                return [
                    { text: parts[0], color: '#FFFFFF', fontSize: 44, fontWeight: '800' },
                    { text: parts[1], color: '#FFE500', fontSize: 56, fontWeight: '900' }
                ];
            } else if (parts.length === 1) {
                return [
                    { text: parts[0], color: '#FFE500', fontSize: 50, fontWeight: '900' }
                ];
            }
        }
        return [];
    }, [topBar]);

    return (
        <AbsoluteFill style={{ backgroundColor: '#000000', flexDirection: 'column' }}>

            {/* Top Bar (2단 헤드라인 바) */}
            {topBar && (
                <div style={{
                    height: topBar.height || 260,
                    backgroundColor: topBar.backgroundColor || '#000000',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px 28px',
                    gap: 6,
                    zIndex: 2,
                    textAlign: 'center',
                    fontFamily: 'Pretendard, "Noto Sans KR", sans-serif'
                }}>
                    {headerLines.length > 0 ? (
                        headerLines.map((line, idx) => (
                            <div
                                key={idx}
                                style={{
                                    margin: 0,
                                    color: line.color || (idx === 0 ? '#FFFFFF' : '#FFE500'),
                                    fontSize: line.fontSize || (idx === 0 ? 44 : 56),
                                    fontWeight: (line.fontWeight as any) || (idx === 0 ? '800' : '900'),
                                    lineHeight: 1.18,
                                    letterSpacing: '-0.8px',
                                    textShadow: '0 4px 14px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8)',
                                    wordBreak: 'keep-all',
                                    maxWidth: '92%'
                                }}
                            >
                                {line.text}
                            </div>
                        ))
                    ) : topBar.text ? (
                        <h1 style={{ 
                            margin: 0, 
                            color: '#FFE500', 
                            fontSize: 48, 
                            fontWeight: '900',
                            ...topBar.textStyle 
                        }}>
                            {topBar.text}
                        </h1>
                    ) : null}
                </div>
            )}

            {/* Hook Bar (뇌전구 가로 100% 흰색 띠 후킹 바) */}
            {hookBar?.enabled && hookBar.text && (
                <div style={{
                    width: '100%',
                    backgroundColor: hookBar.bgColor || '#FFFFFF',
                    color: hookBar.textColor || '#000000',
                    padding: '12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    fontSize: hookBar.fontSize || 32,
                    fontWeight: '900',
                    fontFamily: 'Pretendard, "Noto Sans KR", sans-serif',
                    letterSpacing: '-0.5px',
                    boxShadow: '0 6px 18px rgba(0,0,0,0.7)',
                    zIndex: 4
                }}>
                    {hookBar.text}
                </div>
            )}

            {/* Main Video/Image Area */}
            <div style={videoContainerStyle}>
                {(() => {
                    const src = mainVideo?.src;
                    const isMp4Video = src && (
                        src.includes('.mp4') || 
                        src.includes('.webm') || 
                        src.includes('/api/stream')
                    );
                    const isImg = src && !isMp4Video && (
                        src.startsWith('http') || 
                        src.startsWith('/') || 
                        src.startsWith('data:')
                    );

                    const content = isMp4Video ? (
                        <Video 
                            src={src} 
                            style={videoStyle} 
                            volume={mainVideo?.volume ?? 0} 
                        />
                    ) : isImg ? (
                        <Img 
                            src={src} 
                            style={videoStyle} 
                        />
                    ) : (
                        <div style={{
                            width: '100%',
                            height: '100%',
                            background: 'radial-gradient(circle at center, #1e1b4b 0%, #0f172a 60%, #020617 100%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255,255,255,0.5)',
                            gap: 16
                        }}>
                            <div style={{ fontSize: 64 }}>🎬</div>
                            <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: 2 }}>VIRALOOP CLASSIC</div>
                        </div>
                    );

                    return mainVideo?.scaleMode === '1:1' ? (
                        <div style={{ width: '100%', aspectRatio: '1/1', position: 'relative' }}>
                            {content}
                        </div>
                    ) : content;
                })()}
            </div>

            {/* Bottom Bar */}
            {bottomBar && (
                <div style={{
                    height: bottomBar.height,
                    backgroundColor: bottomBar.backgroundColor,
                    zIndex: 2
                }} />
            )}

            {/* Subtitles Overlay Layer (Using Sequence for Logic) */}
            {subtitles && subtitles.map((sub, idx) => (
                <Sequence key={idx} from={sub.startFrame} durationInFrames={sub.durationFrames}>
                    <SubtitleOverlay
                        text={sub.text}
                        position={sub.position}
                        style={sub.style}
                        animationType={sub.animationType}
                    />
                </Sequence>
            ))}

            {/* Audio Track (TTS Narration / BGM) */}
            {audio && audio.src && (
                <Audio src={audio.src} volume={audio.volume ?? 1} />
            )}

        </AbsoluteFill>
    );
};
