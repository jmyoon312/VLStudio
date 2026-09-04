import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api, { Category } from '../../lib/api';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { 
    Dna, Sparkles, AlertCircle, ShieldAlert, Sliders, Check, 
    X, Plus, Loader2, Target, Palette, Zap
} from 'lucide-react';

interface CategoryDNAModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: Category | null;
    parentCategory?: Category | null;
}

export const CategoryDNAModal: React.FC<CategoryDNAModalProps> = ({
    open,
    onOpenChange,
    category,
    parentCategory,
}) => {
    const queryClient = useQueryClient();

    // Form States
    const [personaTarget, setPersonaTarget] = useState('');
    const [contentTone, setContentTone] = useState('');
    const [negativeKeywords, setNegativeKeywords] = useState<string[]>([]);
    const [newKeywordInput, setNewKeywordInput] = useState('');
    
    // Benchmark & FSD Rules
    const [minViews, setMinViews] = useState(100000);
    const [minOutlier, setMinOutlier] = useState(3.0);
    const [matchSensitivity, setMatchSensitivity] = useState(80);

    // Sync from category prop
    useEffect(() => {
        if (category && open) {
            setPersonaTarget(category.persona_target || (parentCategory?.persona_target ? `[상속] ${parentCategory.persona_target}` : ''));
            setContentTone(category.content_tone || (parentCategory?.content_tone ? `[상속] ${parentCategory.content_tone}` : ''));
            setNegativeKeywords(category.negative_keywords || parentCategory?.negative_keywords || ['어그로', '낚시성', '단타', '코인', '찌라시']);
            
            const rules = category.benchmark_rules || parentCategory?.benchmark_rules || {};
            setMinViews(rules.min_views ?? 100000);
            setMinOutlier(rules.min_outlier ?? 3.0);
            setMatchSensitivity(rules.match_sensitivity ?? 80);
        }
    }, [category, parentCategory, open]);

    // Add negative keyword chip
    const handleAddKeyword = () => {
        const trimmed = newKeywordInput.trim().replace(/^[#,]+/, '');
        if (trimmed && !negativeKeywords.includes(trimmed)) {
            setNegativeKeywords([...negativeKeywords, trimmed]);
            setNewKeywordInput('');
        }
    };

    const handleRemoveKeyword = (keywordToRemove: string) => {
        setNegativeKeywords(negativeKeywords.filter(k => k !== keywordToRemove));
    };

    // AI Suggestion Mutation (9router LLMClient)
    const suggestMutation = useMutation({
        mutationFn: async (categoryId: number) => {
            const res = await api.post(`/categories/${categoryId}/suggest-dna`);
            return res.data;
        },
        onSuccess: (data) => {
            if (data.persona_target) setPersonaTarget(data.persona_target);
            if (data.content_tone) setContentTone(data.content_tone);
            if (Array.isArray(data.negative_keywords)) setNegativeKeywords(data.negative_keywords);
            if (data.benchmark_rules) {
                if (data.benchmark_rules.min_views) setMinViews(data.benchmark_rules.min_views);
                if (data.benchmark_rules.min_outlier) setMinOutlier(data.benchmark_rules.min_outlier);
                if (data.benchmark_rules.match_sensitivity) setMatchSensitivity(data.benchmark_rules.match_sensitivity);
            }
        },
        onError: (err: any) => {
            alert(`AI 페르소나 추천 오류: ${err?.response?.data?.detail || err.message}`);
        }
    });

    // Save Mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!category) return;
            const payload = {
                persona_target: personaTarget,
                content_tone: contentTone,
                negative_keywords: negativeKeywords,
                benchmark_rules: {
                    min_views: minViews,
                    min_outlier: minOutlier,
                    match_sensitivity: matchSensitivity,
                }
            };
            return api.put(`/categories/${category.id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            onOpenChange(false);
        },
        onError: (err: any) => {
            alert(`카테고리 DNA 저장 실패: ${err?.response?.data?.detail || err.message}`);
        }
    });

    if (!category) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border text-foreground p-6 shadow-2xl">
                <DialogHeader className="border-b border-border/80 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div 
                                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                                style={{ backgroundColor: `${category.color || '#3B82F6'}20`, color: category.color || '#3B82F6' }}
                            >
                                <Dna className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                                    <span>{category.name}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                        Level {category.level === 0 ? '0 (대분류)' : '1 (하위폴더)'}
                                    </span>
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    {parentCategory ? `상위 폴더 [${parentCategory.name}]의 기준을 상속받거나 독자적인 성질을 정의합니다.` : 'AI 자율주행(FSD) 탐색 및 영상 평가를 위한 카테고리 고유 헌장(DNA)을 설정합니다.'}
                                </DialogDescription>
                            </div>
                        </div>

                        {/* AI Auto Suggest Button */}
                        <Button
                            size="sm"
                            variant="outline"
                            className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 border-indigo-200 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
                            onClick={() => suggestMutation.mutate(category.id)}
                            disabled={suggestMutation.isPending}
                        >
                            {suggestMutation.isPending ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                                    <span>AI 기획 중...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>✨ AI 페르소나 자동 기획</span>
                                </>
                            )}
                        </Button>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Section 1: Target Persona */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                🎯 타겟 시청자 및 채널 페르소나
                            </Label>
                            <span className="text-[11px] text-muted-foreground">누가 이 콘텐츠를 소비하는가?</span>
                        </div>
                        <Textarea
                            placeholder="예: 3040 실전 부동산 경매 및 소액 재테크에 관심 있는 직장인 투자자"
                            value={personaTarget}
                            onChange={(e) => setPersonaTarget(e.target.value)}
                            className="bg-background border-input text-foreground text-xs resize-none h-20 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Section 2: Content Tone & Manner */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Palette className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                🎨 콘텐츠 결 & 연출 톤앤매너 (Tone & Manner)
                            </Label>
                            <span className="text-[11px] text-muted-foreground">영상의 분위기와 전달 방식</span>
                        </div>
                        <Textarea
                            placeholder="예: 자극적 찌라시 배제, 공공 데이터 기반 실거래가 팩트 분석, 차분하고 신뢰성 있는 브리핑 톤"
                            value={contentTone}
                            onChange={(e) => setContentTone(e.target.value)}
                            className="bg-background border-input text-foreground text-xs resize-none h-20 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Section 3: Negative Keywords */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                🚫 제외할 네거티브 키워드 (Negative Filter)
                            </Label>
                            <span className="text-[11px] text-muted-foreground">해당 단어가 포함되면 자동 폐기</span>
                        </div>

                        {/* Keyword Chips */}
                        <div className="flex flex-wrap gap-1.5 p-2.5 bg-muted/40 border border-border rounded-lg min-h-[46px] items-center">
                            {negativeKeywords.length === 0 ? (
                                <span className="text-xs text-muted-foreground">등록된 제외 키워드가 없습니다.</span>
                            ) : (
                                negativeKeywords.map((kw, idx) => (
                                    <span 
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 hover:bg-rose-100 transition-colors"
                                    >
                                        #{kw}
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveKeyword(kw)}
                                            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 ml-0.5"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))
                            )}
                        </div>

                        {/* Input & Add Button */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="제외할 키워드 입력 후 엔터 (예: 코인, 리딩방, 단타)"
                                value={newKeywordInput}
                                onChange={(e) => setNewKeywordInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddKeyword();
                                    }
                                }}
                                className="bg-background border-input text-xs text-foreground h-9"
                            />
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleAddKeyword}
                                className="bg-muted hover:bg-muted/80 text-xs text-foreground shrink-0 h-9 px-3"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" /> 추가
                            </Button>
                        </div>
                    </div>

                    {/* Section 4: FSD Autonomous Sensitivity & Benchmarks */}
                    <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
                        <div className="flex items-center gap-2 border-b border-border/80 pb-2.5">
                            <Sliders className="w-4 h-4 text-amber-500" />
                            <h4 className="text-xs font-bold text-foreground">🤖 FSD 자율주행 탐색 임계치 (Thresholds)</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                            {/* Sensitivity Slider */}
                            <div className="space-y-2 col-span-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-foreground font-medium">🎯 AI 결(Tone) 일치도 민감도</span>
                                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{matchSensitivity}% 이상</span>
                                </div>
                                <Slider
                                    value={[matchSensitivity]}
                                    min={60}
                                    max={95}
                                    step={5}
                                    onValueChange={(val) => setMatchSensitivity(val[0])}
                                    className="py-1"
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span>넓은 탐색 (60%)</span>
                                    <span>표준 (80%)</span>
                                    <span>엄격한 일치 (95%)</span>
                                </div>
                            </div>

                            {/* Min Views */}
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">최소 조회수 기준 (Min Views)</Label>
                                <Input
                                    type="number"
                                    value={minViews}
                                    onChange={(e) => setMinViews(Number(e.target.value))}
                                    className="bg-background border-input text-xs h-9 text-foreground"
                                />
                            </div>

                            {/* Min Outlier */}
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">최소 바이럴 폭발 배수 (Outlier Ratio)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        step="0.5"
                                        value={minOutlier}
                                        onChange={(e) => setMinOutlier(Number(e.target.value))}
                                        className="bg-background border-input text-xs h-9 text-foreground"
                                    />
                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0 font-mono">배 이상</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t border-border/80 pt-4 flex items-center justify-between sm:justify-between">
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        설정된 DNA는 시스템 AI 엔진과 실시간 연동되어 탐색/평가 기준으로 작동합니다.
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >
                            취소
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 flex items-center gap-1.5 shadow-sm"
                        >
                            {saveMutation.isPending ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>저장 중...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>카테고리 DNA 저장</span>
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
