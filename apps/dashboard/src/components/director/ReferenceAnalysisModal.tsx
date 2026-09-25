import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Sparkles,
    Upload,
    Loader2,
    CheckCircle2,
    Sliders,
    Eye,
    Zap,
    Film
} from 'lucide-react';
import { toast } from 'sonner';

const YoutubeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
);

interface ReferenceAnalysisModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPresetCreated: (preset: any) => void;
}

export const ReferenceAnalysisModal: React.FC<ReferenceAnalysisModalProps> = ({
    open,
    onOpenChange,
    onPresetCreated,
}) => {
    const [videoUrl, setVideoUrl] = useState('');
    const [presetCustomName, setPresetCustomName] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    const handleRunAnalysis = async () => {
        if (!videoUrl.trim()) {
            toast.error('YouTube 또는 영상 URL을 입력해 주세요.');
            return;
        }

        setIsAnalyzing(true);
        setAnalysisResult(null);

        try {
            const res = await fetch('/api/sovereign-presets/analyze-reference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: videoUrl.trim(),
                    preset_name: presetCustomName.trim() || undefined,
                    category: 'harvested_vision'
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || '분석 요청에 실패했습니다.');
            }

            const data = await res.json();
            if (data.success && data.preset) {
                setAnalysisResult(data.preset);
                toast.success('OmniRoute 비전 인터리빙 분석 완료! 새 프리셋이 등록되었습니다.');
            } else {
                throw new Error('분석 결과가 올바르지 않습니다.');
            }
        } catch (err: any) {
            toast.error(`비전 분석 오류: ${err.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleApplyAndClose = () => {
        if (analysisResult) {
            onPresetCreated(analysisResult);
            onOpenChange(false);
            setAnalysisResult(null);
            setVideoUrl('');
            setPresetCustomName('');
            toast.success(`'${analysisResult.name}' 프리셋이 활성화되었습니다.`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg bg-card text-foreground border-border/80 p-5 space-y-4">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                        <Sparkles className="w-4 h-4 text-primary" />
                        OmniRoute 레퍼런스 비전 발골기
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        FFmpeg 1fps 키프레임과 Whisper 대본을 교차 분석하여 영상의 타이틀 위치, 폰트 컬러, 자막 외곽선, 컷 주기를 정밀 추출합니다.
                    </DialogDescription>
                </DialogHeader>

                {!analysisResult ? (
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">레퍼런스 영상 URL (YouTube 쇼츠 / 웹 링크)</label>
                            <div className="relative">
                                <YoutubeIcon className="w-4 h-4 text-red-500 absolute left-2.5 top-2.5" />
                                <Input
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/shorts/..."
                                    className="h-9 pl-9 text-xs bg-background border-border/80"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">새 프리셋 이름 (선택사항)</label>
                            <Input
                                value={presetCustomName}
                                onChange={(e) => setPresetCustomName(e.target.value)}
                                placeholder="예: 미스터리 야담 발골 프리셋"
                                className="h-9 text-xs bg-background border-border/80"
                            />
                        </div>

                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5 text-foreground font-semibold">
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                <span>하이브리드 비전 인터리빙 파이프라인</span>
                            </div>
                            <p className="text-[11px] leading-relaxed">
                                로컬 OmniRoute (포트 20128) 비전 모델이 화면 상단 바 높이(%), 제목 폰트 색상/외곽선(px), 본문 자막 Y축(%) 및 컷 전환 주기를 발골하여 재사용 가능한 .preset.json을 자동 발급합니다.
                            </p>
                        </div>
                    </div>
                ) : (
                    /* Analysis Result Display */
                    <div className="space-y-3 animate-in fade-in duration-300">
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-xs font-bold">비전 발골 및 프리셋 생성 완료</span>
                            </div>
                            <Badge variant="outline" className="text-[10px] border-emerald-500/30">
                                {analysisResult.id}
                            </Badge>
                        </div>

                        <div className="p-3 rounded-xl bg-background border border-border/80 space-y-2 text-xs">
                            <span className="font-bold text-foreground text-sm block">
                                {analysisResult.name}
                            </span>
                            <p className="text-[11px] text-muted-foreground">{analysisResult.recipe}</p>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-[11px]">
                                <div className="space-y-1">
                                    <span className="text-muted-foreground block">상단 타이틀:</span>
                                    <span className="font-mono text-foreground font-semibold">
                                        Y {analysisResult.style?.title?.margin_v_pct}% ({analysisResult.style?.title?.size_px}px)
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-muted-foreground block">본문 자막 위치:</span>
                                    <span className="font-mono text-foreground font-semibold">
                                        Y {100 - (analysisResult.style?.caption?.margin_v_pct || 18)}% ({analysisResult.style?.caption?.size_px}px)
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-muted-foreground block">자막 색상 / 외곽선:</span>
                                    <div className="flex items-center gap-1.5 font-mono">
                                        <span
                                            className="w-3 h-3 rounded-full border border-border"
                                            style={{ backgroundColor: analysisResult.style?.caption?.color }}
                                        />
                                        <span>{analysisResult.style?.caption?.color} ({analysisResult.style?.caption?.outline_px}px)</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-muted-foreground block">컷 전환 주기:</span>
                                    <span className="font-mono text-foreground font-semibold">
                                        {analysisResult.extracted_metrics?.cut_interval_s || 2.5}초
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="pt-2 flex items-center justify-between gap-2 border-t border-border/60">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="h-8 text-xs"
                    >
                        닫기
                    </Button>

                    {!analysisResult ? (
                        <Button
                            type="button"
                            size="sm"
                            disabled={!videoUrl.trim() || isAnalyzing}
                            onClick={handleRunAnalysis}
                            className="h-8 text-xs bg-primary text-primary-foreground font-semibold gap-1.5"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>OmniRoute 비전 분석 중...</span>
                                </>
                            ) : (
                                <>
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>비전 인터리빙 분석 시작</span>
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleApplyAndClose}
                            className="h-8 text-xs bg-primary text-primary-foreground font-semibold gap-1.5"
                        >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>현재 작업실에 적용하기</span>
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
