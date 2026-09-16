import React, { useState, useMemo } from 'react';
import {
    Maximize2,
    Film,
    Play,
    ExternalLink,
    Copy,
    Zap,
    Image as ImageIcon,
    ChevronDown,
    ChevronUp,
    Check,
    Globe,
    Share2,
    Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const getProxyImageUrl = (url?: string | null): string => {
    if (!url) return '';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.startsWith('/api') || url.startsWith('data:') || url.startsWith('blob:')) return url;
        return '';
    }
    return `/api/viral/proxy-image?url=${encodeURIComponent(url)}`;
};

export const extractYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i);
    return match ? match[1] : null;
};

export const isDirectPlayableVideo = (url: string): boolean => {
    if (!url) return false;
    const lower = url.toLowerCase();
    if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('.m3u8')) return true;
    if (lower.includes('mediak') && lower.includes('fmkorea.com')) return true;
    if (lower.includes('storage') && lower.includes('.mp4')) return true;
    return false;
};

export const getVideoDomainLabel = (url: string): string => {
    try {
        const u = new URL(url);
        const host = u.hostname.toLowerCase();
        if (host.includes('youtube.com') || host.includes('youtu.be')) return 'YouTube';
        if (host.includes('fmkorea.com')) return 'FMKorea 비디오';
        if (host.includes('facebook.com') || host.includes('fb.watch')) return 'Facebook';
        if (host.includes('tiktok.com')) return 'TikTok';
        if (host.includes('vimeo.com')) return 'Vimeo';
        if (host.includes('twitter.com') || host.includes('x.com')) return 'X (Twitter)';
        if (host.includes('instagram.com')) return 'Instagram';
        return host.replace(/^www\./, '');
    } catch {
        return '동영상';
    }
};

export const sanitizeTextChunk = (text: string): string => {
    if (!text) return '';
    const cleaned = text
        .replace(/Video Player/g, '')
        .replace(/Video 태그를 지원하지 않는 브라우저입니다\.?[\r\n]*/g, '')
        .replace(/https?:\/\/(?:www\.)?fmkorea\.com\/(?:best\/)?\d+/g, '')
        .replace(/\b(?:1\.00x|2\.00x|1\.75x|1\.50x|1\.25x|0\.75x|0\.50x|0\.25x)\b/g, '')
        .replace(/\b00:00\s*\/\s*00:\d{2}\b/g, '');

    const lines = cleaned.split('\n').filter(line => {
        const tr = line.trim();
        if (!tr) return true;
        if (tr === '복사') return false;
        if (/^\d{2}:\d{2}$/.test(tr)) return false;
        if (/^\/?\s*\d{2}:\d{2}$/.test(tr)) return false;
        if (/^\d+\.\d+x$/.test(tr)) return false;
        return true;
    });

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

interface InlineToken {
    type: 'text' | 'image' | 'video';
    text?: string;
    url?: string;
    alt?: string;
}

interface InlineArticleRendererProps {
    contentText?: string | null;
    images?: string[];
    onOpenImage?: (url: string) => void;
    onOpenExternal?: (url?: string, e?: React.MouseEvent) => void;
    className?: string;
}

export const InlineArticleRenderer: React.FC<InlineArticleRendererProps> = ({
    contentText,
    images = [],
    onOpenImage,
    onOpenExternal,
    className
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    // Media token parsing from content text
    const { tokens, imageCount, videoCount } = useMemo(() => {
        if (!contentText) {
            return { tokens: [], imageCount: 0, videoCount: 0 };
        }

        const MEDIA_REGEX = /(!\[([\s\S]*?)\]\((https?:\/\/[^\s\)]+)\)|\[동영상:\s*(https?:\/\/[^\s\]]+)\])/g;
        const result: InlineToken[] = [];
        let lastIndex = 0;
        let imgCnt = 0;
        let vidCnt = 0;

        let match: RegExpExecArray | null;
        while ((match = MEDIA_REGEX.exec(contentText)) !== null) {
            const matchStart = match.index;
            const matchEnd = match.index + match[0].length;

            // Preceding text chunk
            if (matchStart > lastIndex) {
                const textChunk = contentText.slice(lastIndex, matchStart);
                const sanitized = sanitizeTextChunk(textChunk);
                if (sanitized.length > 0) {
                    result.push({ type: 'text', text: sanitized });
                }
            }

            // Media token
            if (match[2] !== undefined && match[3] !== undefined) {
                // Image: ![alt](url)
                result.push({
                    type: 'image',
                    alt: match[2] || '본문 이미지',
                    url: match[3]
                });
                imgCnt++;
            } else if (match[4] !== undefined) {
                // Video: [동영상: url]
                result.push({
                    type: 'video',
                    url: match[4]
                });
                vidCnt++;
            }

            lastIndex = matchEnd;
        }

        // Remaining text chunk
        if (lastIndex < contentText.length) {
            const textChunk = contentText.slice(lastIndex);
            const sanitized = sanitizeTextChunk(textChunk);
            if (sanitized.length > 0) {
                result.push({ type: 'text', text: sanitized });
            }
        }

        return { tokens: result, imageCount: imgCnt, videoCount: vidCnt };
    }, [contentText]);

    const handleCopy = (textToCopy: string, index?: number) => {
        navigator.clipboard.writeText(textToCopy);
        if (index !== undefined) {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 1500);
        }
        toast.success('클립보드에 복사되었습니다.');
    };

    if (!contentText || contentText.trim().length === 0) {
        return (
            <div className="p-8 text-center rounded-2xl bg-muted/20 border border-dashed border-border/80 text-muted-foreground">
                <p className="text-sm font-medium">수집된 본문 내용이 없습니다.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">상단의 [원문 심층 재수집] 버튼을 눌러 본문 전체를 다시 크롤링할 수 있습니다.</p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-3", className)}>
            {/* Reading Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-card border border-border/80 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-semibold text-foreground">
                        본문 전문 <span className="text-primary font-mono font-bold">{(contentText.length).toLocaleString()}</span>자
                    </span>
                    <span className="text-border">|</span>
                    {imageCount > 0 && (
                        <Badge variant="outline" className="h-5 px-1.5 gap-1 text-[11px] font-normal border-primary/30 text-primary bg-primary/5">
                            <ImageIcon className="w-3 h-3" /> 인라인 사진 {imageCount}장
                        </Badge>
                    )}
                    {videoCount > 0 && (
                        <Badge variant="outline" className="h-5 px-1.5 gap-1 text-[11px] font-normal border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">
                            <Film className="w-3 h-3" /> 동영상 {videoCount}개 (네이티브 재생 지원)
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(contentText)}
                        className="h-7 text-[11px] gap-1 px-2.5 text-muted-foreground hover:text-foreground"
                    >
                        <Copy className="w-3 h-3" /> 전체 복사
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-7 text-[11px] gap-1 px-2.5 border-border"
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp className="w-3 h-3" /> 접기 (기본 높이)
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-3 h-3" /> 전체 펼치기
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Content Body Container */}
            <div
                className={cn(
                    "p-4 sm:p-5 rounded-2xl bg-card border border-border/80 transition-all duration-300 overflow-y-auto space-y-4",
                    isExpanded ? "max-h-none" : "max-h-[580px]"
                )}
            >
                {tokens.map((token, idx) => {
                    // 1. Text Token
                    if (token.type === 'text') {
                        const paragraphs = (token.text || '').split(/\n{2,}/);
                        return (
                            <div key={idx} className="space-y-3">
                                {paragraphs.map((p, pIdx) => {
                                    const trimmed = p.trim();
                                    if (!trimmed) return null;

                                    // Listicle item headline: #1 ..., 1. ..., ### ...
                                    const isListicleHeader = /^(?:#\d+|###\s+|\d+\.\s+)/.test(trimmed);
                                    if (isListicleHeader) {
                                        return (
                                            <div
                                                key={pIdx}
                                                className="pt-3 pb-1 border-b border-border/60 flex items-center gap-2"
                                            >
                                                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-mono font-bold">
                                                    {trimmed.match(/^(?:#\d+|\d+\.)/)?.[0] || '★'}
                                                </Badge>
                                                <h4 className="font-bold text-foreground text-sm leading-snug">
                                                    {trimmed.replace(/^(?:#\d+|###|\d+\.)\s*/, '')}
                                                </h4>
                                            </div>
                                        );
                                    }

                                    return (
                                        <p
                                            key={pIdx}
                                            className="text-foreground/90 font-sans leading-relaxed text-[13.5px] whitespace-pre-wrap select-text break-words"
                                        >
                                            {trimmed}
                                        </p>
                                    );
                                })}
                            </div>
                        );
                    }

                    // 2. Image Token
                    if (token.type === 'image' && token.url) {
                        const proxyUrl = getProxyImageUrl(token.url);
                        return (
                            <div
                                key={idx}
                                className="my-4 rounded-xl border border-border/80 overflow-hidden bg-muted/20 shadow-xs group transition-all"
                            >
                                <div
                                    onClick={() => onOpenImage && onOpenImage(token.url!)}
                                    className="relative max-h-[500px] overflow-hidden flex items-center justify-center bg-black/5 dark:bg-black/40 cursor-pointer"
                                >
                                    <img
                                        src={proxyUrl}
                                        alt={token.alt || '본문 이미지'}
                                        loading="lazy"
                                        className="max-h-[500px] w-auto max-w-full object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.01]"
                                        onError={(e) => {
                                            const target = e.currentTarget;
                                            if (!target.dataset.triedDirect) {
                                                target.dataset.triedDirect = 'true';
                                                target.src = token.url!;
                                            }
                                        }}
                                    />
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                        <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-xs text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-md">
                                            <Maximize2 className="w-3.5 h-3.5" /> 원본 크게보기
                                        </div>
                                    </div>
                                </div>

                                {/* Caption & Image Actions */}
                                <div className="px-3.5 py-2 bg-card border-t border-border/60 flex items-center justify-between gap-2 text-xs">
                                    <span className="text-muted-foreground truncate text-[11.5px] flex items-center gap-1.5">
                                        <ImageIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <span className="truncate">{token.alt && token.alt !== '이미지' ? token.alt : '본문 포함 사진'}</span>
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 text-[10.5px] gap-1 px-2 text-muted-foreground hover:text-foreground"
                                            onClick={() => handleCopy(token.url!, idx)}
                                        >
                                            {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                            <span>{copiedIndex === idx ? '복사됨' : 'URL'}</span>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 text-[10.5px] gap-1 px-2 text-muted-foreground hover:text-foreground"
                                            onClick={(e) => onOpenExternal && onOpenExternal(token.url, e)}
                                        >
                                            <ExternalLink className="w-3 h-3" /> 새 탭
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // 3. Video Token
                    if (token.type === 'video' && token.url) {
                        const ytId = extractYouTubeId(token.url);
                        const isDirectVideo = isDirectPlayableVideo(token.url);
                        const domainLabel = getVideoDomainLabel(token.url);

                        if (ytId) {
                            // A. YouTube Responsive Embed
                            return (
                                <div
                                    key={idx}
                                    className="my-5 rounded-2xl overflow-hidden border border-border/90 bg-card shadow-md"
                                >
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-muted/60 border-b border-border/80">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-md bg-red-600 text-white flex items-center justify-center shrink-0">
                                                <Play className="w-3.5 h-3.5 fill-current" />
                                            </div>
                                            <span className="font-bold text-foreground text-xs">
                                                유튜브 영상 플레이어
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-6 text-[11px] gap-1 px-2.5 bg-primary/10 hover:bg-primary/20 text-primary font-medium"
                                                onClick={() => {
                                                    handleCopy(token.url!);
                                                    toast.success('유튜브 영상 URL이 복사되었습니다. 쇼츠 제작에 활용해보세요!');
                                                }}
                                            >
                                                <Zap className="w-3 h-3 text-amber-500" /> 쇼츠 제작에 활용
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground border-border"
                                                onClick={(e) => onOpenExternal && onOpenExternal(token.url, e)}
                                            >
                                                <ExternalLink className="w-3 h-3" /> 원본 열기
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="relative aspect-video w-full bg-black">
                                        <iframe
                                            src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                                            title="YouTube video player"
                                            className="w-full h-full border-0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                            loading="lazy"
                                        />
                                    </div>
                                </div>
                            );
                        }

                        if (isDirectVideo) {
                            // B. Direct HTML5 Native Video Player (MP4, WebM, FMKorea mediak, etc.)
                            return (
                                <div
                                    key={idx}
                                    className="my-5 rounded-2xl overflow-hidden border border-border/90 bg-card shadow-md"
                                >
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-muted/60 border-b border-border/80">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                                                <Film className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="font-bold text-foreground text-xs">
                                                본문 미디어 비디오
                                            </span>
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary font-mono">
                                                {domainLabel}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-6 text-[11px] gap-1 px-2.5 bg-primary/10 hover:bg-primary/20 text-primary font-medium"
                                                onClick={() => {
                                                    handleCopy(token.url!);
                                                    toast.success('동영상 파일 URL이 복사되었습니다. 쇼츠 제작에 활용해보세요!');
                                                }}
                                            >
                                                <Zap className="w-3 h-3 text-amber-500" /> 쇼츠 제작에 활용
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground border-border"
                                                onClick={(e) => onOpenExternal && onOpenExternal(token.url, e)}
                                            >
                                                <ExternalLink className="w-3 h-3" /> 원본 열기
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
                                                onClick={() => handleCopy(token.url!, idx)}
                                            >
                                                {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                <span>{copiedIndex === idx ? '복사됨' : 'URL'}</span>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* HTML5 Native Video Element */}
                                    <div className="relative aspect-video w-full bg-black flex items-center justify-center">
                                        <video
                                            controls
                                            playsInline
                                            preload="metadata"
                                            src={token.url}
                                            className="w-full h-full max-h-[520px] object-contain"
                                        >
                                            <source src={token.url} type="video/mp4" />
                                            동영상을 재생할 수 없습니다. 상단의 [원본 열기]를 이용해주세요.
                                        </video>
                                    </div>
                                </div>
                            );
                        }

                        // C. Non-Direct Web Video Media Card (TikTok, Facebook, Vimeo, Twitter, etc.)
                        return (
                            <div
                                key={idx}
                                className="my-4 p-3.5 rounded-xl border border-border/80 bg-accent/20 hover:bg-accent/30 transition-colors flex items-center justify-between gap-3"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                        <Film className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                                            <span>본문 포함 비디오</span>
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary">
                                                {domainLabel}
                                            </Badge>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5 max-w-[360px]">
                                            {token.url}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                        size="sm"
                                        variant="default"
                                        className="h-7 text-xs gap-1 shadow-xs"
                                        onClick={(e) => onOpenExternal && onOpenExternal(token.url, e)}
                                    >
                                        <ExternalLink className="w-3 h-3" /> 영상 보기
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs gap-1"
                                        onClick={() => handleCopy(token.url!, idx)}
                                    >
                                        {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                        <span>{copiedIndex === idx ? '복사됨' : '복사'}</span>
                                    </Button>
                                </div>
                            </div>
                        );
                    }

                    return null;
                })}
            </div>
        </div>
    );
};
