import React, { useEffect, useRef, useState } from 'react';

interface AudioWaveformProps {
    src: string;
    color?: string;
    height?: string | number;
    className?: string;
    barWidth?: number;
    barGap?: number;
}

// Global cache for decoded peaks to avoid re-fetching/decoding
const peaksCache = new Map<string, number[]>();

const AudioWaveform: React.FC<AudioWaveformProps> = ({
    src,
    color = '#10b981', // emerald-500
    height = '100%',
    className,
    barWidth = 2,
    barGap = 1
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<boolean>(false);

    useEffect(() => {
        if (!src) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let isMounted = true;

        const draw = (peaks: number[]) => {
            if (!canvas) return;

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Set styles
            ctx.fillStyle = color;

            const totalBars = Math.floor(canvas.width / (barWidth + barGap));
            const step = Math.ceil(peaks.length / totalBars);

            for (let i = 0; i < totalBars; i++) {
                // Calculate peak for this segment
                let max = 0;
                const start = i * step;
                const end = start + step;

                for (let j = start; j < end && j < peaks.length; j++) {
                    const val = Math.abs(peaks[j]);
                    if (val > max) max = val;
                }

                // Draw bar
                // Normalize height (max is usually 1.0, but can be less)
                // We want some minimum height for silence
                const barHeight = Math.max(max * canvas.height, 2);
                const x = i * (barWidth + barGap);
                const y = (canvas.height - barHeight) / 2; // Center vertically

                // Rounded rect simulation (simple rect for now)
                ctx.fillRect(x, y, barWidth, barHeight);
            }
        };

        const loadAudio = async () => {
            try {

                // Check cache first
                if (peaksCache.has(src)) {
                    draw(peaksCache.get(src)!);
                    return;
                }

                let fetchSrc = src;
                // Check if src is a local path (Windows or Unix) and not a URL
                // Exclude static paths that are mounted on the backend
                const isStaticPath = src.startsWith('/temp/') || src.startsWith('/media/') || src.startsWith('/downloads/');
                if (src.startsWith('http') || src.startsWith('blob:')) {
                    fetchSrc = src;
                } else {
                    // [FIX] Backend streams files via /io/stream, not /files/stream
                    fetchSrc = `/api/io/stream?path=${encodeURIComponent(src)}`;
                }

                const response = await fetch(fetchSrc);
                if (!response.ok) {
                    throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
                }

                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('text/html')) {
                    throw new Error(`Invalid content type: ${contentType}. Likely a 404 falling back to index.html`);
                }
                if (contentType && !contentType.includes('audio') && !contentType.includes('video') && !contentType.includes('octet-stream')) {
                    // Sometimes servers return octet-stream for audio
                    console.warn(`Warning: AudioWaveform received content-type ${contentType}`);
                }

                const arrayBuffer = await response.arrayBuffer();
                if (arrayBuffer.byteLength === 0) {
                    throw new Error("Audio buffer is empty");
                }

                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

                try {
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    const channelData = audioBuffer.getChannelData(0); // Mono is enough
                    const peaks: number[] = [];

                    // Downsample for cache
                    const sampleRate = audioBuffer.sampleRate;
                    const samplesPerPixel = Math.floor(sampleRate / 100); // 100 peaks/sec

                    for (let i = 0; i < channelData.length; i += samplesPerPixel) {
                        let max = 0;
                        for (let j = 0; j < samplesPerPixel && i + j < channelData.length; j++) {
                            const val = Math.abs(channelData[i + j]);
                            if (val > max) max = val;
                        }
                        peaks.push(max);
                    }

                    if (isMounted) {
                        peaksCache.set(src, peaks);
                        draw(peaks);
                    }
                } catch (decodeErr) {
                    console.error("AudioContext decode error:", decodeErr);
                    throw new Error("Unable to decode audio data");
                }

            } catch (err) {
                console.error("Error loading waveform:", err);
                if (isMounted) setError(true);
            }
        };

        // Resize observer to redraw on resize
        const resizeObserver = new ResizeObserver(() => {
            if (canvas && peaksCache.has(src)) {
                // Update canvas internal size to match display size
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
                draw(peaksCache.get(src)!);
            }
        });
        resizeObserver.observe(canvas);

        // Initial load
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0) {
            canvas.width = rect.width;
            canvas.height = rect.height;
            loadAudio();
        } else {
            // If hidden or not laid out yet, wait a bit?
            // ResizeObserver should catch it.
            loadAudio();
        }

        return () => {
            isMounted = false;
            resizeObserver.disconnect();
        };
    }, [src, color, barWidth, barGap]);

    if (error) return <div className="w-full h-full bg-red-50/50 flex items-center justify-center text-[10px] text-red-400">Error</div>;

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height }}
        />
    );
};

export default AudioWaveform;
