import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { ScriptStyle, ScriptGenerationRequest, ScriptGenerationResponse, ScriptRefinementRequest, TrendItem, TrendKeyword, SafetyReviewRequest, SafetyReviewResponse } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Sparkles, Wand2, ShieldAlert, Copy, Check, Trash2, Edit, Plus, Mic, Globe, Search, TrendingUp, ChevronDown, ChevronRight, FileText, ExternalLink, Zap, Activity, BarChart3, Undo, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatTextWithLineBreaks } from "@/lib/utils";
import AIModelSelector from '@/components/shared/AIModelSelector';


const ScriptWriter = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedStyleId, setSelectedStyleId] = useState<string>("");
    const [glossary, setGlossary] = useState<string>("");
    const [niche, setNiche] = useState<string>("");
    const [useWebSearch, setUseWebSearch] = useState<boolean>(true);
    const [scriptProvider, setScriptProvider] = useState<string>("groq");
    const [scriptModel, setScriptModel] = useState<string>("groq/llama-3.3-70b-versatile");
    const [inputText, setInputText] = useState<string>(() => {
        return localStorage.getItem('viral_loop_script_writer_input') || "";
    });
    const [resultText, setResultText] = useState<string>(() => {
        return localStorage.getItem('viral_loop_script_writer_result') || "";
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);

    const [editingStyle, setEditingStyle] = useState<ScriptStyle | null>(null);
    const [styleFormName, setStyleFormName] = useState("");
    const [styleFormInstruction, setStyleFormInstruction] = useState("");
    const [styleFormSample, setStyleFormSample] = useState("");

    const [lastResponse, setLastResponse] = useState<ScriptGenerationResponse | null>(null);
    const [showResearch, setShowResearch] = useState(false);

    // [NEW] Undo History & Safety Review State
    const [undoHistory, setUndoHistory] = useState<string[]>([]);
    const [isSafetyReviewModalOpen, setIsSafetyReviewModalOpen] = useState(false);
    const [safetyReviewData, setSafetyReviewData] = useState<SafetyReviewResponse | null>(null);
    const [safetyEditText, setSafetyEditText] = useState("");

    const pushHistory = (text: string) => {
        setUndoHistory(prev => [...prev, text]);
    };

    const handleUndo = () => {
        if (undoHistory.length > 0) {
            const prevText = undoHistory[undoHistory.length - 1];
            setResultText(prevText);
            setUndoHistory(prev => prev.slice(0, -1));
        }
    };

    // Auto-save texts to localStorage for session durability
    useEffect(() => {
        localStorage.setItem('viral_loop_script_writer_input', inputText);
    }, [inputText]);

    useEffect(() => {
        localStorage.setItem('viral_loop_script_writer_result', resultText);
    }, [resultText]);

    useEffect(() => {
        if (location.state?.initialScript) {
            setInputText(location.state.initialScript);
            toast.success("자막을 불러왔습니다.");
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Fetch Styles
    const { data: styles, isLoading: isLoadingStyles } = useQuery<ScriptStyle[]>({
        queryKey: ['scriptStyles'],
        queryFn: async () => (await api.get('/script/styles')).data
    });

    // Fetch Trends (only when niche is provided)
    const { data: trends } = useQuery<TrendItem[]>({
        queryKey: ['trends', niche],
        queryFn: async () => (await api.get('/trends', { params: { category: niche, limit: 5 } })).data,
        enabled: !!niche,
        staleTime: 1000 * 60 * 2
    });
    const [showTrends, setShowTrends] = useState(false);

    // Mutations
    const generateMutation = useMutation({
        mutationFn: async (data: ScriptGenerationRequest) => {
            console.log(" Sending generation request...", data);
            const response = await api.post('/script/generate', data, { timeout: 180000 });
            console.log(" Response received:", response.status, response.data);
            return response.data;
        },
        onSuccess: (data: ScriptGenerationResponse) => {
            setResultText(data.script);
            setLastResponse(data);
            if (data.research_used || data.trend_used) {
                setShowResearch(true);
            }
            if (data.warning) {
                toast.warning("모델 자동 전환됨", {
                    description: data.warning,
                    duration: 5000
                });
            } else {
                let msg = `대본 생성 완료! (${data.model_used})`;
                if (data.research_used) msg += " 웹검색 ON";
                if (data.trend_used) msg += ` 트렌드+${data.trend_count}`;
                toast.success(msg);
            }
        },
        onError: (error: any) => {
            console.error(" Generation failed:", error);
            let errorMessage = "대본 생성 실패";
            if (error.code === 'ECONNABORTED') {
                errorMessage = "요청 시간이 초과되었습니다. (Timeout)";
            } else if (error.response?.data?.detail) {
                errorMessage = `오류: ${error.response.data.detail}`;
            } else if (error.message) {
                errorMessage = `오류: ${error.message}`;
            }
            toast.error(errorMessage, { duration: 5000 });
        }
    });

    const refineMutation = useMutation({
        mutationFn: async (data: ScriptRefinementRequest) => {
            console.log(" Sending refinement request...", data);
            const response = await api.post('/script/refine', data, { timeout: 180000 });
            console.log(" Response received:", response.status, response.data);
            return response.data;
        },
        onSuccess: (data: any) => {
            pushHistory(resultText);
            setResultText(data.script);
            if (data.warning) {
                toast.warning("모델 자동 전환됨", {
                    description: data.warning,
                    duration: 5000
                });
            } else {
                toast.success(`대본 수정 완료! (${data.model_used})`);
            }
        },
        onError: (error: any) => {
            console.error(" Refinement failed:", error);
            let errorMessage = "대본 수정 실패";
            if (error.code === 'ECONNABORTED') {
                errorMessage = "요청 시간이 초과되었습니다. (Timeout)";
            } else if (error.response?.data?.detail) {
                errorMessage = `오류: ${error.response.data.detail}`;
            } else if (error.message) {
                errorMessage = `오류: ${error.message}`;
            }
            toast.error(errorMessage, { duration: 5000 });
        }
    });

    const safetyReviewMutation = useMutation({
        mutationFn: async (data: any) => {
            console.log(" Sending safety review request...", data);
            const response = await api.post('/script/safety-review', data, { timeout: 180000 });
            console.log(" Safety review received:", response.status, response.data);
            return response.data;
        },
        onSuccess: (data: any) => {
            if (data.changes && data.changes.length > 0) {
                setSafetyReviewData(data);
                setSafetyEditText(data.revised_script);
                setIsSafetyReviewModalOpen(true);
            } else {
                toast.success("현재 텍스트에서 정책 위반 요소가 발견되지 않았습니다.");
            }
        },
        onError: (error: any) => {
            console.error(" Safety review failed:", error);
            let errorMessage = "안전 검토 실패";
            if (error.code === 'ECONNABORTED') {
                errorMessage = "요청 시간이 초과되었습니다. (Timeout)";
            } else if (error.response?.data?.detail) {
                errorMessage = `오류: ${error.response.data.detail}`;
            } else if (error.message) {
                errorMessage = `오류: ${error.message}`;
            }
            toast.error(errorMessage, { duration: 5000 });
        }
    });

    const createStyleMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/script/styles', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scriptStyles'] });
            setIsStyleModalOpen(false);
            resetStyleForm();
            toast.success("스타일이 저장되었습니다.");
        }
    });

    const updateStyleMutation = useMutation({
        mutationFn: async (data: any) => (await api.put(`/script/styles/${editingStyle?.id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scriptStyles'] });
            setIsStyleModalOpen(false);
            resetStyleForm();
            toast.success("스타일이 수정되었습니다.");
        }
    });

    const deleteStyleMutation = useMutation({
        mutationFn: async (id: number) => (await api.delete(`/script/styles/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scriptStyles'] });
            toast.success("스타일이 삭제되었습니다.");
            if (selectedStyleId === String(editingStyle?.id)) {
                setSelectedStyleId("");
            }
        }
    });

    // Handlers
    const handleGenerate = () => {
        if (!inputText.trim()) {
            toast.error("원본 텍스트를 입력해주세요.");
            return;
        }

        setIsGenerating(true);
        generateMutation.mutate({
            input_text: inputText,
            style_id: selectedStyleId && selectedStyleId !== "none" ? parseInt(selectedStyleId) : 0,
            glossary: glossary,
            niche: niche || undefined,
            provider: scriptProvider,
            model: scriptModel,
            use_web_search: useWebSearch
        }, {
            onSettled: () => setIsGenerating(false)
        });
    };

    const handleRefine = (instruction: string) => {
        if (!resultText.trim()) return;

        setIsGenerating(true);
        refineMutation.mutate({
            current_text: resultText,
            instruction: instruction,
            style_id: selectedStyleId && selectedStyleId !== "none" ? parseInt(selectedStyleId) : 0,
            provider: scriptProvider,
            model: scriptModel
        }, {
            onSettled: () => setIsGenerating(false)
        });
    };

    const handleSaveStyle = () => {
        const data = {
            name: styleFormName,
            system_instruction: styleFormInstruction,
            sample_text: styleFormSample
        };

        if (editingStyle) {
            updateStyleMutation.mutate(data);
        } else {
            createStyleMutation.mutate(data);
        }
    };

    const handleEditStyle = (style: ScriptStyle) => {
        setEditingStyle(style);
        setStyleFormName(style.name);
        setStyleFormInstruction(style.system_instruction);
        setStyleFormSample(style.sample_text || "");
        setIsStyleModalOpen(true);
    };

    const resetStyleForm = () => {
        setEditingStyle(null);
        setStyleFormName("");
        setStyleFormInstruction("");
        setStyleFormSample("");
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setInputText(text);
            toast.success("클립보드에서 붙여넣었습니다.");
        } catch (err) {
            toast.error("클립보드 접근 권한이 필요합니다.");
        }
    };

    const handleCopyResult = async () => {
        try {
            await navigator.clipboard.writeText(resultText);
            toast.success("결과가 복사되었습니다.");
        } catch (err) {
            toast.error("복사 실패");
        }
    };

    const [showMobileConfig, setShowMobileConfig] = useState(false);

    return (
        <div className="flex-1 flex flex-col gap-3 sm:gap-4 min-h-0 pb-12 sm:pb-4">

            {/* Zone 1: Control Bar */}
            <Card className="flex-shrink-0 border-border bg-card">
                {/* Mobile Collapsible Header */}
                <div 
                    className="md:hidden flex items-center justify-between p-3 border-b border-border cursor-pointer bg-muted/20 select-none"
                    onClick={() => setShowMobileConfig(!showMobileConfig)}
                >
                    <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-foreground">AI 모델 및 스타일 설정</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-border text-muted-foreground">
                            {scriptProvider}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
                        <span>{showMobileConfig ? "접기" : "설정 펼치기"}</span>
                        {showMobileConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                </div>

                <CardContent className={cn("p-3 sm:p-4", !showMobileConfig && "hidden md:block")}>
                    <AIModelSelector
                        provider={scriptProvider}
                        onProviderChange={(p) => setScriptProvider(p)}
                        model={scriptModel}
                        onModelChange={(m) => setScriptModel(m)}
                        presetId={selectedStyleId}
                        onPresetChange={setSelectedStyleId}
                        showPreset={true}
                        onCreatePreset={() => { resetStyleForm(); setIsStyleModalOpen(true); }}
                        onEditPreset={(style) => handleEditStyle(style)}
                    />

                    <div className="mt-3 sm:mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs sm:text-sm font-semibold text-foreground">주제 분야 (Niche) - 선택사항</Label>
                            <Input
                                placeholder="예: Tech, Gaming, Health, Food"
                                value={niche}
                                onChange={(e) => setNiche(e.target.value)}
                                className="h-9 sm:h-10 text-xs sm:text-sm bg-background border-border"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs sm:text-sm font-semibold text-foreground">용어집 (Glossary) - 선택사항</Label>
                            <Input
                                placeholder="예: AI=인공지능, LLM=대규모언어모델"
                                value={glossary}
                                onChange={(e) => setGlossary(e.target.value)}
                                className="h-9 sm:h-10 text-xs sm:text-sm bg-background border-border"
                            />
                        </div>

                        <div className="space-y-1.5 flex items-end pb-0.5">
                            <div className="flex items-center justify-between sm:justify-start gap-3 w-full">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="web-search"
                                        checked={useWebSearch}
                                        onCheckedChange={setUseWebSearch}
                                    />
                                    <Label htmlFor="web-search" className="cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground">
                                        <Globe className="w-3.5 h-3.5 text-primary" />
                                        웹 검색 활용
                                    </Label>
                                </div>
                                <Badge variant={useWebSearch ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                                    {useWebSearch ? "ON" : "OFF"}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Trend Insights Panel (collapsible, visible when niche is set) */}
            {niche && trends && trends.length > 0 && (
                <Card className="flex-shrink-0 border-amber-500/30 bg-card">
                    <button
                        onClick={() => setShowTrends(!showTrends)}
                        className="w-full flex items-center justify-between px-3 sm:px-4 py-2 text-left hover:bg-muted/40 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-amber-500" />
                            <span className="text-xs sm:text-sm font-semibold text-foreground">트렌드 인사이트</span>
                            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400">
                                {trends.length}개 카테고리
                            </Badge>
                        </div>
                        {showTrends ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </button>

                    {showTrends && (
                        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-border space-y-3">
                            {trends.map((trend) => (
                                <div key={trend.id}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-semibold text-foreground">{trend.keyword}</span>
                                        <span className="text-[10px] text-muted-foreground">{trend.keyword_count}개 키워드</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {trend.top_keywords.map((kw, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/60 cursor-pointer transition-colors group"
                                                onClick={() => {
                                                    setNiche(trend.category);
                                                    setInputText(prev => prev ? `${prev}\n\n# ${kw.ko} (${kw.en})` : `# ${kw.ko} (${kw.en})`);
                                                    toast.success(`"${kw.ko}" 키워드 반영됨`);
                                                }}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-medium text-foreground truncate">{kw.ko}</span>
                                                        {kw.en && <span className="text-[10px] text-muted-foreground truncate">({kw.en})</span>}
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[9px] px-1 py-0 ml-auto flex-shrink-0 ${
                                                                kw.velocity === 'Explosive' ? 'border-destructive/40 text-destructive bg-destructive/10' :
                                                                kw.velocity === 'Rising' ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10' :
                                                                'border-border text-muted-foreground'
                                                            }`}
                                                        >
                                                            <Zap className="w-2.5 h-2.5 mr-0.5" />
                                                            {kw.velocity}
                                                        </Badge>
                                                    </div>
                                                    <Progress value={kw.score} className="h-1 mt-1" />
                                                </div>
                                                <span className="text-[10px] font-bold text-muted-foreground w-8 text-right">{kw.score}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Research Context Panel (collapsible) */}
            {lastResponse && (lastResponse.research_used || lastResponse.trend_used) && (
                <Card className="flex-shrink-0 border-emerald-500/30 bg-card">
                    <button
                        onClick={() => setShowResearch(!showResearch)}
                        className="w-full flex items-center justify-between px-3 sm:px-4 py-2 text-left hover:bg-muted/40 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Search className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs sm:text-sm font-semibold text-foreground">리서치 컨텍스트</span>
                            <div className="flex gap-1.5">
                                {lastResponse.research_used && (
                                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        웹검색 {lastResponse.research_sources?.length || 0}건
                                    </Badge>
                                )}
                                {lastResponse.trend_used && (
                                    <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                        트렌드 {lastResponse.trend_count}건
                                    </Badge>
                                )}
                            </div>
                        </div>
                        {showResearch ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </button>

                    {showResearch && (
                        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-border">
                            {lastResponse.research_used && lastResponse.research_sources && lastResponse.research_sources.length > 0 && (
                                <div className="mb-3">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Globe className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-xs font-semibold text-foreground">웹 검색 결과</span>
                                    </div>
                                    <ul className="space-y-1">
                                        {lastResponse.research_sources.map((src, i) => (
                                            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                                <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                <span>{src}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {lastResponse.trend_used && lastResponse.trend_count > 0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                                        <span className="text-xs font-semibold text-foreground">트렌드 데이터</span>
                                        <span className="text-[10px] text-muted-foreground">({lastResponse.trend_count}개 키워드 분석)</span>
                                    </div>
                                </div>
                            )}

                            {lastResponse.research_summary && (
                                <div className="mt-2 p-2.5 bg-muted/40 rounded-lg text-xs text-muted-foreground italic leading-relaxed border border-border">
                                    {lastResponse.research_summary}
                                </div>
                            )}
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Zone 2: Workspace */}
            <div className="flex-1 flex flex-col md:flex-row gap-3 sm:gap-4">
                {/* Left Pane: Source */}
                <Card className="flex-1 flex flex-col border-border bg-card">
                    <CardHeader className="py-2.5 sm:py-3 px-3 sm:px-4 border-b border-border bg-muted/30">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-xs sm:text-sm font-bold text-foreground">원본 자막/스크립트 (Source)</CardTitle>
                            <Button variant="ghost" size="sm" onClick={handlePaste} className="h-7 sm:h-8 text-xs text-muted-foreground hover:text-foreground">
                                <Copy className="w-3 h-3 mr-1" />
                                붙여넣기
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 flex flex-col">
                        <Textarea
                            className="w-full min-h-[140px] sm:min-h-[220px] md:min-h-[280px] resize-none border-0 focus-visible:ring-0 p-3 sm:p-4 rounded-none bg-background text-foreground text-xs sm:text-sm placeholder:text-muted-foreground"
                            placeholder="번역 및 변환할 원본 텍스트를 여기에 입력하거나 붙여넣으세요..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                        />
                    </CardContent>
                </Card>

                {/* Center Action */}
                <div className="flex flex-row md:flex-col justify-center items-center gap-2 py-1">
                    <Button
                        size="lg"
                        className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-md py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-bold text-xs sm:text-sm"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-1.5 md:mr-0" />
                        ) : (
                            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 md:mr-0" />
                        )}
                        <span className="md:hidden font-bold">AI 대본 변환 및 생성</span>
                    </Button>
                </div>

                {/* Right Pane: Result */}
                <Card className="flex-1 flex flex-col border-border bg-card shadow-2xs">
                    <CardHeader className="py-2.5 sm:py-3 px-3 sm:px-4 border-b border-border bg-muted/30">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-xs sm:text-sm font-bold text-foreground">생성된 대본 (Result)</CardTitle>
                            <div className="flex gap-1.5 sm:gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => navigate('/multi-tts', { state: { importedScript: formatTextWithLineBreaks(resultText) } })}
                                    disabled={!resultText}
                                    className="h-7 sm:h-8 text-xs bg-primary/10 text-primary hover:bg-primary/20"
                                >
                                    <Mic className="w-3 h-3 mr-1" />
                                    TTS 생성
                                </Button>
                                <Button variant="ghost" size="sm" onClick={handleCopyResult} className="h-7 sm:h-8 text-xs text-muted-foreground hover:text-foreground">
                                    <Copy className="w-3 h-3 mr-1" />
                                    복사하기
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                        <Textarea
                            className="w-full min-h-[140px] sm:min-h-[220px] md:min-h-[280px] resize-none border-0 focus-visible:ring-0 p-3 sm:p-4 rounded-none bg-background text-foreground text-xs sm:text-sm font-medium leading-relaxed placeholder:text-muted-foreground"
                            placeholder="AI가 생성한 대본이 여기에 표시됩니다..."
                            value={resultText}
                            onChange={(e) => setResultText(e.target.value)}
                        />

                        {/* Result Refinement Toolbar (Wrap-friendly on mobile) */}
                        <div className="p-2 sm:p-2.5 border-t border-border bg-muted/20 flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 select-none">
                            <Button variant="outline" size="sm" className="h-7 sm:h-8 text-xs border-border bg-card text-foreground flex-1 sm:flex-initial" onClick={() => handleRefine("기존 대본의 맥락, 말투, 톤앤매너를 100% 완벽하게 유지하면서, 전체 분량을 20~30% 정도 줄여서 더 빠르고 간결하게 만들어줘. 불필요한 번역투, 한자어, 중국어투가 절대 들어가지 않도록 극도로 주의해. 오직 자연스러운 한국어로만 작성해.")} disabled={isGenerating || !resultText}>
                                <Wand2 className="w-3 h-3 mr-1" /> 더 짧게
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 sm:h-8 text-xs border-border bg-card text-foreground flex-1 sm:flex-initial" onClick={() => handleRefine("기존 대본의 핵심 주제와 흐름을 유지하면서, 훨씬 더 유머러스하고 텐션이 높은 숏폼 스타일로 다듬어줘. 억지스러운 번역투나 중국어투는 절대 배제하고, 한국 네티즌들이 쓰는 자연스러운 밈과 말투를 활용해.")} disabled={isGenerating || !resultText}>
                                <Sparkles className="w-3 h-3 mr-1" /> 더 재미있게
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 sm:h-8 text-xs border-border bg-card text-foreground flex-1 sm:flex-initial" onClick={() => {
                                setSafetyEditText(resultText);
                                safetyReviewMutation.mutate({
                                    current_text: resultText,
                                    provider: scriptProvider,
                                    model: scriptModel
                                });
                            }} disabled={safetyReviewMutation.isPending || !resultText}>
                                <ShieldAlert className="w-3 h-3 mr-1" /> 안전 표현 수정
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleUndo} disabled={undoHistory.length === 0 || isGenerating} className="h-7 sm:h-8 text-xs text-muted-foreground hover:text-foreground ml-auto sm:ml-0">
                                <Undo className="w-3 h-3 mr-1" /> 되돌리기
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Zone 3: Style Management Modal */}
            <Dialog open={isStyleModalOpen} onOpenChange={setIsStyleModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingStyle ? '스타일 수정' : '새 스타일 추가'}</DialogTitle>
                        <DialogDescription>
                            AI가 대본을 생성할 때 따를 규칙과 예시를 정의합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">스타일 이름</Label>
                            <Input
                                value={styleFormName}
                                onChange={(e) => setStyleFormName(e.target.value)}
                                placeholder="예: 쇼츠용, 뉴스용"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">프롬프트 (지시사항)</Label>
                            <Textarea
                                value={styleFormInstruction}
                                onChange={(e) => setStyleFormInstruction(e.target.value)}
                                placeholder="이 스타일이 적용될 때 AI에게 전달할 지시사항을 입력하세요."
                                className="h-32 resize-none text-sm leading-relaxed"
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex justify-between sm:justify-between">
                        {editingStyle ? (
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (confirm("정말 삭제하시겠습니까?")) {
                                        if (editingStyle) deleteStyleMutation.mutate(editingStyle.id);
                                        setIsStyleModalOpen(false);
                                    }
                                }}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                삭제
                            </Button>
                        ) : <div></div>}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsStyleModalOpen(false)}>취소</Button>
                            <Button onClick={handleSaveStyle}>저장</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Safety Review Modal */}
            <Dialog open={isSafetyReviewModalOpen} onOpenChange={setIsSafetyReviewModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>안전 표현 검토</DialogTitle>
                        <DialogDescription>
                            AI가 제안한 변경 사항을 확인하고 추가로 수정할 수 있습니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-y-auto py-4 min-h-[400px]">
                        {/* Left Side: Changes List */}
                        <div className="w-full md:w-1/3 flex flex-col gap-2 overflow-y-auto pr-2 border-r">
                            <h4 className="text-sm font-semibold sticky top-0 bg-background py-1">제안된 변경 내역</h4>
                            {safetyReviewData?.changes && safetyReviewData.changes.length > 0 ? (
                                safetyReviewData.changes.map((change, i) => (
                                    <div key={i} className="p-3 bg-muted/30 rounded-md border text-sm">
                                        <div className="flex items-center gap-2 mb-2 font-medium">
                                            <span className="line-through text-destructive">{change.original}</span>
                                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-green-600 dark:text-green-400">{change.replacement}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-start gap-1">
                                            <span className="font-semibold shrink-0">이유:</span>
                                            <span>{change.reason}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-muted-foreground p-4 text-center">제안된 변경 사항이 없습니다. (현재 대본이 안전함)</div>
                            )}
                        </div>
                        {/* Right Side: Editable Text */}
                        <div className="w-full md:w-2/3 flex flex-col gap-2">
                            <h4 className="text-sm font-semibold">수정된 대본 확인 및 추가 편집</h4>
                            <Textarea
                                className="flex-1 resize-none h-full"
                                value={safetyEditText}
                                onChange={(e) => setSafetyEditText(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSafetyReviewModalOpen(false)}>취소</Button>
                        <Button onClick={() => {
                            setUndoHistory(prev => [...prev, resultText]);
                            setResultText(safetyEditText);
                            setIsSafetyReviewModalOpen(false);
                        }}>수정 사항 적용</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div >
    );
};

export default ScriptWriter;
