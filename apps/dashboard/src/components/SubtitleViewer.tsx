import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Copy, Check, Languages, AlertCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface SubtitleViewerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    videoId: number | null;
    title: string;
    description?: string | null;
    extractedText?: string | null;
}

// -- Helper Function to Clean SRT format into readable text --
const cleanSrtToText = (srt: string): string => {
    if (!srt) return '';
    if (!srt.includes('-->')) return srt.trim();

    return srt
        .split(/\r?\n\r?\n/)
        .map(block => {
            const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            if (lines.length === 0) return '';
            const textLines = lines.filter(line => {
                if (/^\d+$/.test(line)) return false;
                if (line.includes('-->')) return false;
                return true;
            });
            return textLines.join(' ');
        })
        .filter(Boolean)
        .join('\n\n')
        .replace(/&gt;&gt;/g, '')
        .replace(/>>/g, '')
        .trim();
};

const SubtitleViewer = ({ open, onOpenChange, videoId, title, description, extractedText }: SubtitleViewerProps) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isCopied, setIsCopied] = useState(false);
    const [generateMessage, setGenerateMessage] = useState<string | null>(null);

    const { data: subtitleContent, isLoading, isError, refetch } = useQuery({
        queryKey: ['subtitles', videoId],
        queryFn: async () => {
            if (!videoId) return null;
            try {
                const res = await api.get(`/videos/${videoId}/subtitles`);
                return res.data;
            } catch (_) {
                if (extractedText) return { content: extractedText };
                if (description) return { content: description };
                return { content: "No subtitles found." };
            }
        },
        enabled: !!videoId && open,
        initialData: extractedText ? { content: extractedText } : undefined
    });

    const rawContent = subtitleContent?.content || extractedText || '';
    const cleanText = cleanSrtToText(rawContent);

    const hasSubtitle = !!rawContent &&
        rawContent !== "No subtitles found." &&
        rawContent !== "Directory not found." &&
        rawContent.trim().length > 0;

    const generateMutation = useMutation({
        mutationFn: async () => {
            return (await api.post(`/videos/${videoId}/generate-subtitles`)).data;
        },
        onSuccess: (data) => {
            setGenerateMessage('⚙️ AI 음성인식으로 자막 생성 중... 약 20초 후 완료됩니다.');
            setTimeout(async () => {
                await refetch();
                queryClient.invalidateQueries({ queryKey: ['subtitles', videoId] });
                setGenerateMessage(null);
            }, 25000);
        },
        onError: (err: any) => {
            setGenerateMessage(`❌ 오류: ${err?.response?.data?.detail || '자막 생성에 실패했습니다.'}`);
            setTimeout(() => setGenerateMessage(null), 5000);
        }
    });

    const handleCopySubtitle = async () => {
        const textToCopy = cleanText || rawContent;
        if (!textToCopy) return;

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(textToCopy);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = textToCopy;
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
                document.body.removeChild(textArea);
            }
        } catch (err) {
            console.error('Failed to copy:', err);
            alert("클립보드 복사 중 오류가 발생했습니다.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg bg-card text-foreground border border-border shadow-2xl rounded-2xl p-5 sm:p-6">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-border">
                    <div className="space-y-1 mr-4 overflow-hidden">
                        <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            대본 열람
                        </DialogTitle>
                        <DialogDescription className="line-clamp-1 text-xs text-muted-foreground">
                            {title}
                        </DialogDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs font-medium border-border hover:bg-muted"
                            onClick={handleCopySubtitle}
                            disabled={!hasSubtitle}
                            title="정제된 대본 복사"
                        >
                            {isCopied ? (
                                <>
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                    <span className="text-emerald-500 font-bold">복사됨</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>복사</span>
                                </>
                            )}
                        </Button>

                        <Button
                            size="sm"
                            className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm"
                            onClick={() => {
                                if (cleanText || rawContent) {
                                    navigate('/script-writer', { state: { initialScript: cleanText || rawContent } });
                                }
                            }}
                            disabled={!hasSubtitle}
                            title="AI 대본 각색 및 번역"
                        >
                            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                            <span>AI 각색</span>
                        </Button>
                    </div>
                </DialogHeader>

                {generateMessage && (
                    <div className="text-xs text-center text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-2.5 font-medium animate-pulse">
                        {generateMessage}
                    </div>
                )}

                <ScrollArea className="h-[55vh] w-full rounded-xl border border-border/80 p-4 bg-muted/20">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                            <Loader2 className="w-7 h-7 animate-spin text-primary" />
                            <p className="text-xs font-medium">대본을 불러오는 중...</p>
                        </div>
                    ) : hasSubtitle ? (
                        <div className="space-y-4">
                            <div className="p-3 rounded-lg bg-card/60 border border-border/60">
                                <p className="text-[14px] font-sans leading-relaxed text-foreground select-text whitespace-pre-wrap">
                                    {cleanText || rawContent}
                                </p>
                            </div>

                            {rawContent.includes('-->') && (
                                <details className="text-xs text-muted-foreground pt-1">
                                    <summary className="cursor-pointer font-semibold hover:text-foreground py-1 select-none">
                                        타임스탬프 원본 (SRT) 보기
                                    </summary>
                                    <pre className="mt-2 p-3 bg-muted/50 rounded-lg font-mono text-[11px] leading-snug max-h-48 overflow-y-auto whitespace-pre-wrap border border-border/60">
                                        {rawContent}
                                    </pre>
                                </details>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-center p-4 space-y-3">
                            <AlertCircle className="w-9 h-9 text-muted-foreground/40" />
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-foreground">수집된 자막이 없습니다.</p>
                                <p className="text-xs text-muted-foreground">
                                    영상에 등록된 자막이 없습니다. Whisper AI로 음성을 추출하여 새 자막을 생성하시겠습니까?
                                </p>
                            </div>
                            <Button
                                size="sm"
                                className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs"
                                onClick={() => generateMutation.mutate()}
                                disabled={generateMutation.isPending}
                            >
                                {generateMutation.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Sparkles className="h-3.5 w-3.5" />
                                )}
                                <span>AI 음성인식으로 자막 생성</span>
                            </Button>
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export default SubtitleViewer;
